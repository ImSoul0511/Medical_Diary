"""
Clinically Realistic Vital Sign Generators.

Uses Ornstein-Uhlenbeck (mean-reverting random walk) for heart rate and
respiratory rate, and a Poisson-based accumulator for step count.

Each simulated device gets a PatientProfile that determines its baselines,
and a VitalSignGenerator that produces time-series data.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Patient profile archetypes
# ---------------------------------------------------------------------------

@dataclass
class PatientProfile:
    """Defines the physiological baseline for one simulated patient."""

    label: str

    # Heart rate (BPM)
    hr_baseline: float
    hr_sigma: float = 2.0       # beat-to-beat variability
    hr_theta: float = 0.3       # mean-reversion speed

    # Respiratory rate (breaths/min)
    rr_baseline: float = 16.0
    rr_sigma: float = 1.0
    rr_theta: float = 0.2

    # Step count
    daily_step_target: int = 8000


# Five archetypes — the simulator picks from these and adds per-device noise.
PROFILE_TEMPLATES: List[PatientProfile] = [
    PatientProfile(
        label="healthy_adult",
        hr_baseline=72.0, hr_sigma=2.0,
        rr_baseline=16.0, rr_sigma=1.0,
        daily_step_target=10000,
    ),
    PatientProfile(
        label="elderly",
        hr_baseline=78.0, hr_sigma=2.5,
        rr_baseline=19.0, rr_sigma=1.2,
        daily_step_target=4500,
    ),
    PatientProfile(
        label="athlete",
        hr_baseline=53.0, hr_sigma=1.5,
        rr_baseline=12.0, rr_sigma=0.8,
        daily_step_target=15000,
    ),
    PatientProfile(
        label="hypertensive",
        hr_baseline=88.0, hr_sigma=3.0,
        rr_baseline=21.0, rr_sigma=1.5,
        daily_step_target=5500,
    ),
    PatientProfile(
        label="anxious",
        hr_baseline=92.0, hr_sigma=3.5,
        rr_baseline=24.0, rr_sigma=2.0,
        daily_step_target=6500,
    ),
]


def create_random_profile(index: int) -> PatientProfile:
    """
    Pick a random archetype and add per-device noise so no two
    simulated patients are identical.
    """
    template = PROFILE_TEMPLATES[index % len(PROFILE_TEMPLATES)]

    # Add +-10% noise to baselines
    noise = lambda base, pct=0.10: base + random.uniform(-base * pct, base * pct)

    return PatientProfile(
        label=f"{template.label}_{index}",
        hr_baseline=noise(template.hr_baseline),
        hr_sigma=template.hr_sigma,
        hr_theta=template.hr_theta,
        rr_baseline=noise(template.rr_baseline),
        rr_sigma=template.rr_sigma,
        rr_theta=template.rr_theta,
        daily_step_target=int(noise(template.daily_step_target, 0.15)),
    )


# ---------------------------------------------------------------------------
# Step-count time-of-day activity curve
# ---------------------------------------------------------------------------

def _hourly_activity_weight(hour: int) -> float:
    """
    Returns a relative activity multiplier for a given hour (0-23).

    Shape: sleeping (0.0) at night, peaks during morning/evening commute.
    """
    # Sleep: 23:00 - 05:59
    if hour >= 23 or hour < 6:
        return 0.0
    # Early morning ramp-up
    if 6 <= hour < 7:
        return 0.3
    # Morning commute peak
    if 7 <= hour < 9:
        return 1.5
    # Midday moderate
    if 9 <= hour < 12:
        return 0.8
    # Lunch break
    if 12 <= hour < 14:
        return 1.0
    # Afternoon moderate
    if 14 <= hour < 17:
        return 0.7
    # Evening commute peak
    if 17 <= hour < 19:
        return 1.4
    # Evening wind-down
    if 19 <= hour < 21:
        return 0.6
    # Late evening
    return 0.2


# ---------------------------------------------------------------------------
# Vital Sign Generator (stateful, one instance per device)
# ---------------------------------------------------------------------------

class VitalSignGenerator:
    """
    Generates clinically realistic vital sign readings for a single patient.

    Heart Rate & Respiratory Rate use the Ornstein-Uhlenbeck process:
        X(t+dt) = X(t) + theta * (mu - X(t)) * dt + sigma * sqrt(dt) * N(0,1)

    Step Count uses a Poisson accumulator modulated by time-of-day.
    """

    def __init__(self, profile: PatientProfile) -> None:
        self.profile = profile

        # Initialize current state at baseline
        self._hr: float = profile.hr_baseline
        self._rr: float = profile.rr_baseline
        self._steps: int = 0
        self._last_step_day: Optional[int] = None

    def tick(self, timestamp: datetime, dt: float = 1.0) -> Dict:
        """
        Advance the simulation by one time step and return a payload
        matching HealthMetricCreateRequest.

        Args:
            timestamp: The recorded_at timestamp for this reading.
            dt: Time step size in normalized units (default 1.0).
                For real-time (30s interval), dt=1.0 works well.
                For backfill, dt should reflect the simulated gap.

        Returns:
            dict with keys: heart_rate, step_count, respiratory_rate, recorded_at
        """
        # -- Ornstein-Uhlenbeck for Heart Rate --
        self._hr = self._ou_step(
            current=self._hr,
            mu=self.profile.hr_baseline,
            theta=self.profile.hr_theta,
            sigma=self.profile.hr_sigma,
            dt=dt,
        )
        heart_rate = int(round(max(30, min(250, self._hr))))

        # -- Ornstein-Uhlenbeck for Respiratory Rate --
        self._rr = self._ou_step(
            current=self._rr,
            mu=self.profile.rr_baseline,
            theta=self.profile.rr_theta,
            sigma=self.profile.rr_sigma,
            dt=dt,
        )
        respiratory_rate = int(round(max(5, min(60, self._rr))))

        # -- Step count accumulation --
        current_day = timestamp.timetuple().tm_yday
        if self._last_step_day is not None and current_day != self._last_step_day:
            # New day -> reset step counter
            self._steps = 0
        self._last_step_day = current_day

        hour = timestamp.hour
        activity = _hourly_activity_weight(hour)

        if activity > 0:
            # Expected steps per reading = (daily_target / active_readings_per_day) * weight
            # Assume ~960 readings in a 16-hour active day (1 per minute)
            # Scale by activity weight
            lam = (self.profile.daily_step_target / 960.0) * activity
            steps_delta = self._poisson(lam)
            self._steps += steps_delta

        # -- Build payload matching HealthMetricCreateRequest --
        return {
            "heart_rate": heart_rate,
            "step_count": self._steps,
            "respiratory_rate": respiratory_rate,
            "recorded_at": timestamp.isoformat(),
        }

    @staticmethod
    def _ou_step(
        current: float,
        mu: float,
        theta: float,
        sigma: float,
        dt: float,
    ) -> float:
        """
        One step of the Ornstein-Uhlenbeck process.

        X(t+dt) = X(t) + theta * (mu - X(t)) * dt + sigma * sqrt(dt) * Z
        where Z ~ N(0, 1)
        """
        drift = theta * (mu - current) * dt
        diffusion = sigma * math.sqrt(dt) * random.gauss(0, 1)
        return current + drift + diffusion

    @staticmethod
    def _poisson(lam: float) -> int:
        """
        Sample from Poisson distribution.

        Uses the inverse-transform method for small lambda,
        falls back to normal approximation for large lambda.
        """
        if lam <= 0:
            return 0
        if lam > 30:
            # Normal approximation: Poisson(lam) ~ N(lam, lam)
            return max(0, int(round(random.gauss(lam, math.sqrt(lam)))))
        # Knuth's algorithm
        L = math.exp(-lam)
        k = 0
        p = 1.0
        while True:
            k += 1
            p *= random.random()
            if p < L:
                return k - 1
