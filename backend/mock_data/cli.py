"""
CLI Entrypoint for the IoT Hardware Data Simulator.

Usage:
    python -m mock_data --devices 3 --mode both
    python -m mock_data --credentials-file creds.json
    python mock_data/cli.py --help
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from mock_data.config import (
    DEFAULT_CREDENTIALS_FILE,
    SimulatorSettings,
    load_or_generate_credentials,
)
from mock_data.simulator import run


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="iot-simulator",
        description="IoT Hardware Data Simulator for Medical Diary Project",
    )

    parser.add_argument(
        "--credentials-file",
        default=DEFAULT_CREDENTIALS_FILE,
        help=(
            "Path to JSON file with user credentials. "
            "If the file does not exist, credentials will be auto-generated "
            "and saved here (default: %(default)s)."
        ),
    )
    parser.add_argument(
        "--devices",
        type=int,
        default=3,
        help="Number of devices to simulate (default: 3). Capped by credential count.",
    )
    parser.add_argument(
        "--mode",
        choices=["realtime", "backfill", "both"],
        default="both",
        help="Simulation mode (default: both — backfill then real-time).",
    )
    parser.add_argument(
        "--backfill-days",
        type=int,
        default=7,
        help="Number of days to backfill in backfill/both mode (default: 7).",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=30.0,
        help="Seconds between real-time readings per device (default: 30).",
    )
    parser.add_argument(
        "--backfill-interval",
        type=float,
        default=60.0,
        help="Simulated seconds between readings during backfill (default: 60).",
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:8000",
        help="Backend API base URL (default: http://localhost:8000).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG logging.",
    )

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    # Configure logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Load or generate credentials (smart caching)
    credentials, needs_registration = load_or_generate_credentials(
        args.credentials_file, args.devices
    )

    if needs_registration:
        logging.info(
            "New credentials generated -- will auto-register on first run."
        )
    else:
        logging.info(
            "Loaded %d cached credential(s) -- skipping registration.",
            len(credentials),
        )

    # Build settings
    settings = SimulatorSettings(
        api_base_url=args.api_url,
        device_count=args.devices,
        push_interval_seconds=args.interval,
        backfill_interval_seconds=args.backfill_interval,
        backfill_days=args.backfill_days,
        mode=args.mode,
        credentials=credentials,
        credentials_file=args.credentials_file,
        needs_registration=needs_registration,
        verbose=args.verbose,
    )

    # Run the async simulator
    try:
        asyncio.run(run(settings))
    except KeyboardInterrupt:
        logging.info("Interrupted by user.")


if __name__ == "__main__":
    main()
