"""
Smoke test for the vital sign generator.

Run: python mock_data/test_models.py
"""

from datetime import datetime, timedelta, timezone

from mock_data.models import VitalSignGenerator, create_random_profile


def test_generator_bounds() -> None:
    """Verify that 10,000 ticks never produce out-of-bounds values."""
    profile = create_random_profile(0)
    gen = VitalSignGenerator(profile)

    start = datetime(2026, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
    violations = []

    for i in range(10_000):
        ts = start + timedelta(minutes=i)
        payload = gen.tick(ts, dt=1.0)

        hr = payload["heart_rate"]
        rr = payload["respiratory_rate"]
        steps = payload["step_count"]

        if not (30 <= hr <= 250):
            violations.append(f"tick {i}: heart_rate={hr} out of [30, 250]")
        if not (5 <= rr <= 60):
            violations.append(f"tick {i}: respiratory_rate={rr} out of [5, 60]")
        if steps < 0:
            violations.append(f"tick {i}: step_count={steps} < 0")

    if violations:
        print(f"FAILED — {len(violations)} violation(s):")
        for v in violations[:10]:
            print(f"  {v}")
    else:
        print("PASSED — 10,000 ticks, all values within schema bounds.")


def test_step_reset_at_midnight() -> None:
    """Verify step count resets when the day changes."""
    profile = create_random_profile(2)  # athlete profile
    gen = VitalSignGenerator(profile)

    # Generate readings throughout day 1 (active hours)
    day1_start = datetime(2026, 6, 1, 8, 0, 0, tzinfo=timezone.utc)
    last_steps_day1 = 0
    for i in range(600):  # 10 hours of minutes
        ts = day1_start + timedelta(minutes=i)
        payload = gen.tick(ts, dt=1.0)
        last_steps_day1 = payload["step_count"]

    # Cross midnight into day 2
    day2_start = datetime(2026, 6, 2, 8, 0, 0, tzinfo=timezone.utc)
    payload = gen.tick(day2_start, dt=1.0)
    first_steps_day2 = payload["step_count"]

    if first_steps_day2 < last_steps_day1:
        print(
            f"PASSED — Step count reset at midnight: "
            f"day1_end={last_steps_day1}, day2_start={first_steps_day2}"
        )
    else:
        print(
            f"FAILED — Step count did NOT reset: "
            f"day1_end={last_steps_day1}, day2_start={first_steps_day2}"
        )


def test_payload_format() -> None:
    """Verify payload has exactly the keys HealthMetricCreateRequest expects."""
    profile = create_random_profile(1)
    gen = VitalSignGenerator(profile)
    ts = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)

    payload = gen.tick(ts)
    expected_keys = {"heart_rate", "step_count", "respiratory_rate", "recorded_at"}

    if set(payload.keys()) == expected_keys:
        print(f"PASSED — Payload keys match: {sorted(payload.keys())}")
    else:
        extra = set(payload.keys()) - expected_keys
        missing = expected_keys - set(payload.keys())
        print(f"FAILED — Extra keys: {extra}, Missing keys: {missing}")

    # Verify types
    assert isinstance(payload["heart_rate"], int), "heart_rate must be int"
    assert isinstance(payload["step_count"], int), "step_count must be int"
    assert isinstance(payload["respiratory_rate"], int), "respiratory_rate must be int"
    assert isinstance(payload["recorded_at"], str), "recorded_at must be str"
    print(f"PASSED — All value types correct.")
    print(f"  Sample payload: {payload}")


def test_profile_diversity() -> None:
    """Verify that different profiles produce different baselines."""
    profiles = [create_random_profile(i) for i in range(5)]

    print("Profile diversity check:")
    for p in profiles:
        print(
            f"  {p.label}: HR_base={p.hr_baseline:.1f}, "
            f"RR_base={p.rr_baseline:.1f}, steps={p.daily_step_target}"
        )

    labels = [p.label.split("_")[0] for p in profiles]
    unique_types = set(labels)
    if len(unique_types) >= 3:
        print(f"PASSED — {len(unique_types)} distinct profile types.")
    else:
        print(f"WARNING — Only {len(unique_types)} distinct types (expected >= 3).")


if __name__ == "__main__":
    print("=" * 60)
    print("IoT Simulator — Model Unit Tests")
    print("=" * 60)

    test_generator_bounds()
    print()
    test_step_reset_at_midnight()
    print()
    test_payload_format()
    print()
    test_profile_diversity()

    print()
    print("=" * 60)
    print("All tests complete.")
    print("=" * 60)
