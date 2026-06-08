"""
Async Orchestrator for the IoT Simulator.

Handles authentication, spawns concurrent device simulators, and
manages the push loop (real-time) and backfill (historical) modes.
"""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx

from mock_data.config import SimulatorSettings, UserCredential
from mock_data.models import VitalSignGenerator, create_random_profile

logger = logging.getLogger("iot_simulator")

# Graceful shutdown flag
_shutdown_event: Optional[asyncio.Event] = None


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

async def authenticate(
    client: httpx.AsyncClient,
    base_url: str,
    credential: UserCredential,
) -> Optional[str]:
    """
    Authenticate a simulated user via POST /auth/login.

    Returns the access_token on success, or None on failure.
    """
    url = f"{base_url}/auth/login"
    payload = {"email": credential.email, "password": credential.password}

    try:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            logger.info(
                "Authenticated: %s (token: %s...)",
                credential.email,
                token[:20] if token else "N/A",
            )
            return token
        else:
            logger.error(
                "Auth failed for %s: HTTP %d — %s",
                credential.email,
                resp.status_code,
                resp.text[:200],
            )
            return None
    except httpx.RequestError as exc:
        logger.error("Auth request error for %s: %s", credential.email, exc)
        return None


# ---------------------------------------------------------------------------
# Auto-Registration
# ---------------------------------------------------------------------------

# Registration profile data for generated users
_SIM_PROFILES = [
    {"full_name": "Sim Nguyen Van A",  "gender": "male",   "dob": "1990-03-15"},
    {"full_name": "Sim Tran Thi B",   "gender": "female", "dob": "1985-07-22"},
    {"full_name": "Sim Le Van C",     "gender": "male",   "dob": "1998-11-08"},
    {"full_name": "Sim Pham Thi D",   "gender": "female", "dob": "1992-01-30"},
    {"full_name": "Sim Hoang Van E",  "gender": "male",   "dob": "2000-06-14"},
]


async def register_user(
    client: httpx.AsyncClient,
    base_url: str,
    credential: UserCredential,
    index: int,
) -> bool:
    """
    Register a simulated user via POST /auth/register.

    Returns True if registration succeeded or user already exists (409).
    Returns False on unexpected failure.
    """
    url = f"{base_url}/auth/register"
    profile = _SIM_PROFILES[index % len(_SIM_PROFILES)]

    payload = {
        "email": credential.email,
        "password": credential.password,
        "phone_number": f"090000{index + 1:04d}",
        "full_name": f"{profile['full_name']} {index + 1}",
        "gender": profile["gender"],
        "date_of_birth": profile["dob"],
    }

    try:
        resp = await client.post(url, json=payload)

        if resp.status_code in (200, 201):
            logger.info("Registered: %s", credential.email)
            return True

        if resp.status_code == 400:
            body = resp.text.lower()
            # User already exists -- treat as success (smart caching edge case)
            if "already" in body or "exists" in body or "registered" in body:
                logger.info(
                    "Already registered: %s (skipping)", credential.email
                )
                return True

        logger.error(
            "Registration failed for %s: HTTP %d -- %s",
            credential.email,
            resp.status_code,
            resp.text[:300],
        )
        return False

    except httpx.RequestError as exc:
        logger.error("Registration request error for %s: %s", credential.email, exc)
        return False


async def ensure_users_registered(
    client: httpx.AsyncClient,
    settings: SimulatorSettings,
) -> None:
    """
    Register all credentials that need registration.

    Tolerates "already exists" responses gracefully.
    """
    logger.info(
        "Phase 0: Auto-registering %d user(s)...", settings.device_count
    )

    success_count = 0
    for i in range(settings.device_count):
        ok = await register_user(
            client,
            settings.api_base_url,
            settings.credentials[i],
            i,
        )
        if ok:
            success_count += 1

    logger.info(
        "Phase 0: Registration complete (%d/%d succeeded).",
        success_count,
        settings.device_count,
    )


# ---------------------------------------------------------------------------
# Device Simulator
# ---------------------------------------------------------------------------

class DeviceSimulator:
    """
    Simulates a single wearable device for one patient.

    Each instance has its own VitalSignGenerator and auth token.
    Pushes data to POST /health-metrics.
    """

    def __init__(
        self,
        device_id: int,
        client: httpx.AsyncClient,
        token: str,
        generator: VitalSignGenerator,
        semaphore: asyncio.Semaphore,
        settings: SimulatorSettings,
    ) -> None:
        self.device_id = device_id
        self.client = client
        self.token = token
        self.generator = generator
        self.semaphore = semaphore
        self.settings = settings
        self._push_url = f"{settings.api_base_url}/health-metrics"
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self._success_count = 0
        self._error_count = 0

    async def push_metric(self, payload: dict) -> bool:
        """
        POST a single metric reading with retry and exponential backoff.

        Returns True on success, False on permanent failure.
        """
        for attempt in range(1, self.settings.max_retries + 1):
            try:
                async with self.semaphore:
                    resp = await self.client.post(
                        self._push_url,
                        json=payload,
                        headers=self._headers,
                        timeout=self.settings.request_timeout_seconds,
                    )

                if resp.status_code == 201:
                    self._success_count += 1
                    return True

                if resp.status_code in (429, 500, 502, 503, 504):
                    # Retryable
                    wait = 2 ** attempt
                    logger.warning(
                        "[Device %d] HTTP %d on attempt %d/%d — retrying in %ds",
                        self.device_id,
                        resp.status_code,
                        attempt,
                        self.settings.max_retries,
                        wait,
                    )
                    await asyncio.sleep(wait)
                    continue

                # Non-retryable client error (400, 401, 403, 422)
                self._error_count += 1
                logger.error(
                    "[Device %d] HTTP %d (non-retryable): %s | Payload: %s",
                    self.device_id,
                    resp.status_code,
                    resp.text[:200],
                    payload,
                )
                return False

            except httpx.RequestError as exc:
                wait = 2 ** attempt
                logger.warning(
                    "[Device %d] Request error on attempt %d/%d: %s — retrying in %ds",
                    self.device_id,
                    attempt,
                    self.settings.max_retries,
                    exc,
                    wait,
                )
                await asyncio.sleep(wait)

        self._error_count += 1
        logger.error(
            "[Device %d] Exhausted %d retries for payload at %s",
            self.device_id,
            self.settings.max_retries,
            payload.get("recorded_at", "unknown"),
        )
        return False

    async def run_backfill(self, days: int) -> None:
        """
        Generate and push historical data for the past N days.

        Simulates readings at regular intervals from (now - N days) to now.
        """
        logger.info(
            "[Device %d] Starting backfill: %d days of historical data...",
            self.device_id,
            days,
        )

        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days)
        interval = timedelta(seconds=self.settings.backfill_interval_seconds)
        current = start

        total_readings = 0
        while current <= now:
            if _shutdown_event and _shutdown_event.is_set():
                logger.info("[Device %d] Backfill interrupted by shutdown.", self.device_id)
                break

            payload = self.generator.tick(current, dt=1.0)
            await self.push_metric(payload)
            total_readings += 1

            if total_readings % 100 == 0:
                logger.info(
                    "[Device %d] Backfill progress: %d readings pushed (at %s)",
                    self.device_id,
                    total_readings,
                    current.isoformat(),
                )

            current += interval

        logger.info(
            "[Device %d] Backfill complete: %d readings (success=%d, errors=%d)",
            self.device_id,
            total_readings,
            self._success_count,
            self._error_count,
        )

    async def run_realtime(self) -> None:
        """
        Push readings in real-time at the configured interval.

        Runs until shutdown signal is received.
        """
        logger.info(
            "[Device %d] Starting real-time mode (interval=%ds)...",
            self.device_id,
            int(self.settings.push_interval_seconds),
        )

        while True:
            if _shutdown_event and _shutdown_event.is_set():
                break

            now = datetime.now(timezone.utc)
            payload = self.generator.tick(now, dt=1.0)

            success = await self.push_metric(payload)
            if success:
                logger.debug(
                    "[Device %d] Pushed: HR=%s RR=%s Steps=%s",
                    self.device_id,
                    payload["heart_rate"],
                    payload["respiratory_rate"],
                    payload["step_count"],
                )

            # Wait for next interval (interruptible)
            try:
                if _shutdown_event:
                    await asyncio.wait_for(
                        _shutdown_event.wait(),
                        timeout=self.settings.push_interval_seconds,
                    )
                    break  # Shutdown was signaled
                else:
                    await asyncio.sleep(self.settings.push_interval_seconds)
            except asyncio.TimeoutError:
                # Normal — event didn't fire within the interval, loop continues
                pass

        logger.info(
            "[Device %d] Real-time stopped (success=%d, errors=%d)",
            self.device_id,
            self._success_count,
            self._error_count,
        )


# ---------------------------------------------------------------------------
# Main Orchestrator
# ---------------------------------------------------------------------------

def _setup_shutdown_handler(loop: asyncio.AbstractEventLoop) -> None:
    """Register SIGINT/SIGTERM handlers for graceful shutdown."""
    global _shutdown_event
    _shutdown_event = asyncio.Event()

    def _signal_handler() -> None:
        logger.info("Shutdown signal received — stopping all devices...")
        if _shutdown_event:
            _shutdown_event.set()

    # On Windows, signal handlers must be set differently
    if sys.platform == "win32":
        # Windows does not support add_signal_handler; use signal module
        def _win_handler(signum, frame):
            _signal_handler()
        signal.signal(signal.SIGINT, _win_handler)
        signal.signal(signal.SIGTERM, _win_handler)
    else:
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _signal_handler)


async def run(settings: SimulatorSettings) -> None:
    """
    Main entry point for the simulator.

    1. Create shared httpx client
    2. Authenticate all users
    3. Spawn DeviceSimulator per user
    4. Run backfill and/or real-time mode
    """
    settings.validate()

    # Setup shutdown handler
    loop = asyncio.get_running_loop()
    _setup_shutdown_handler(loop)

    logger.info("=" * 60)
    logger.info("IoT Hardware Data Simulator")
    logger.info("=" * 60)
    logger.info("Mode: %s", settings.mode)
    logger.info("Devices: %d", settings.device_count)
    logger.info("API URL: %s", settings.api_base_url)
    if settings.mode in ("backfill", "both"):
        logger.info("Backfill: %d days", settings.backfill_days)
    if settings.mode in ("realtime", "both"):
        logger.info("Push interval: %.0fs", settings.push_interval_seconds)
    logger.info("=" * 60)

    # Create async HTTP client with connection pooling
    limits = httpx.Limits(
        max_connections=settings.semaphore_limit + 10,
        max_keepalive_connections=settings.semaphore_limit,
    )
    semaphore = asyncio.Semaphore(settings.semaphore_limit)

    async with httpx.AsyncClient(limits=limits) as client:
        # -- Phase 0: Auto-Registration (if needed) --
        if settings.needs_registration:
            await ensure_users_registered(client, settings)

        # -- Phase 1: Authenticate --
        logger.info("Phase 1: Authenticating %d user(s)...", settings.device_count)

        tokens: List[Optional[str]] = []
        for i in range(settings.device_count):
            token = await authenticate(
                client, settings.api_base_url, settings.credentials[i]
            )
            tokens.append(token)

        # Filter out failed authentications
        active_devices: List[DeviceSimulator] = []
        for i, token in enumerate(tokens):
            if token is None:
                logger.warning(
                    "Skipping device %d — authentication failed.", i
                )
                continue

            profile = create_random_profile(i)
            generator = VitalSignGenerator(profile)

            device = DeviceSimulator(
                device_id=i,
                client=client,
                token=token,
                generator=generator,
                semaphore=semaphore,
                settings=settings,
            )
            active_devices.append(device)
            logger.info(
                "Device %d: profile=%s, HR_base=%.1f, RR_base=%.1f, steps_target=%d",
                i,
                profile.label,
                profile.hr_baseline,
                profile.rr_baseline,
                profile.daily_step_target,
            )

        if not active_devices:
            logger.error("No devices authenticated successfully. Exiting.")
            return

        logger.info("%d device(s) ready.", len(active_devices))

        # -- Phase 2: Backfill --
        if settings.mode in ("backfill", "both"):
            logger.info("Phase 2: Backfill (%d days)...", settings.backfill_days)
            backfill_tasks = [
                device.run_backfill(settings.backfill_days)
                for device in active_devices
            ]
            await asyncio.gather(*backfill_tasks)
            logger.info("Phase 2: Backfill complete.")

        # -- Phase 3: Real-time --
        if settings.mode in ("realtime", "both"):
            if _shutdown_event and _shutdown_event.is_set():
                logger.info("Shutdown was requested — skipping real-time mode.")
                return

            logger.info("Phase 3: Real-time streaming (Ctrl+C to stop)...")
            realtime_tasks = [
                device.run_realtime() for device in active_devices
            ]
            await asyncio.gather(*realtime_tasks)

    logger.info("Simulator finished.")
