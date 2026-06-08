"""
Simulator Configuration.

All settings are collected into a single dataclass. Values come from
CLI arguments (highest priority) or sensible defaults.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

logger = logging.getLogger("iot_simulator")


@dataclass
class UserCredential:
    """Login credentials for one simulated device/patient."""

    email: str
    password: str


@dataclass
class SimulatorSettings:
    """Runtime settings for the IoT simulator."""

    # -- Network --
    api_base_url: str = "http://localhost:8000"
    semaphore_limit: int = 20
    max_retries: int = 3
    request_timeout_seconds: float = 15.0

    # -- Simulation --
    device_count: int = 3
    push_interval_seconds: float = 30.0
    backfill_days: int = 7
    backfill_interval_seconds: float = 60.0  # simulated gap between readings in backfill

    # -- Mode --
    # "realtime", "backfill", or "both"
    mode: str = "both"

    # -- Credentials --
    credentials: List[UserCredential] = field(default_factory=list)
    credentials_file: str = "mock_data/credentials.json"
    needs_registration: bool = False

    # -- Logging --
    verbose: bool = False

    def validate(self) -> None:
        """Validate settings and log warnings for potential issues."""
        if not self.credentials:
            raise ValueError(
                "No user credentials available. "
                "Credentials should have been loaded or generated before validation."
            )
        if self.device_count > len(self.credentials):
            logger.warning(
                "device_count (%d) exceeds available credentials (%d). "
                "Clamping to %d devices.",
                self.device_count,
                len(self.credentials),
                len(self.credentials),
            )
            self.device_count = len(self.credentials)
        if self.push_interval_seconds < 5.0:
            logger.warning(
                "push_interval_seconds (%.1f) is very low — "
                "may trigger backend rate-limiting.",
                self.push_interval_seconds,
            )


def load_credentials(file_path: str) -> List[UserCredential]:
    """
    Load user credentials from a JSON file.

    Expected format:
    [
        {"email": "user1@example.com", "password": "password123"},
        {"email": "user2@example.com", "password": "password456"}
    ]
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Credentials file not found: {path}")

    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    if not isinstance(raw, list):
        raise ValueError("Credentials file must contain a JSON array.")

    credentials: List[UserCredential] = []
    for i, entry in enumerate(raw):
        if "email" not in entry or "password" not in entry:
            raise ValueError(
                f"Credential entry #{i} missing 'email' or 'password' field."
            )
        credentials.append(
            UserCredential(email=entry["email"], password=entry["password"])
        )

    logger.info("Loaded %d credential(s) from %s", len(credentials), path)
    return credentials


# ---------------------------------------------------------------------------
# Auto-registration helpers
# ---------------------------------------------------------------------------

DEFAULT_SIM_PASSWORD = "SimUser@2026"
DEFAULT_CREDENTIALS_FILE = "mock_data/credentials.json"


def generate_credentials(count: int) -> List[UserCredential]:
    """
    Generate N deterministic simulated user credentials.

    Email pattern: sim_user_{i}@test.com
    Password: DEFAULT_SIM_PASSWORD (shared for simplicity)
    """
    credentials = [
        UserCredential(
            email=f"sim_user_{i + 1}@test.com",
            password=DEFAULT_SIM_PASSWORD,
        )
        for i in range(count)
    ]
    logger.info("Generated %d credential(s) for auto-registration.", count)
    return credentials


def save_credentials(credentials: List[UserCredential], file_path: str) -> None:
    """Persist credentials to a JSON file for future reuse (smart caching)."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    data = [{"email": c.email, "password": c.password} for c in credentials]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    logger.info("Saved %d credential(s) to %s", len(credentials), path)


def load_or_generate_credentials(
    file_path: str,
    device_count: int,
) -> tuple[List[UserCredential], bool]:
    """
    Smart caching logic for credentials.

    1. If the credentials file exists AND has >= device_count entries,
       load them and skip registration.
    2. Otherwise, generate new credentials, save them to disk, and
       signal that registration is needed.

    Returns:
        (credentials, needs_registration)
    """
    path = Path(file_path)

    if path.exists():
        try:
            existing = load_credentials(file_path)
            if len(existing) >= device_count:
                logger.info(
                    "Cache hit: %d credential(s) in %s (need %d) "
                    "-- skipping registration.",
                    len(existing), path, device_count,
                )
                return existing[:device_count], False
            logger.info(
                "Cache insufficient: %d credential(s) in %s but need %d "
                "-- regenerating.",
                len(existing), path, device_count,
            )
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning(
                "Corrupted credentials file (%s) -- regenerating: %s",
                path, exc,
            )

    # Generate fresh credentials and persist them
    credentials = generate_credentials(device_count)
    save_credentials(credentials, file_path)
    return credentials, True
