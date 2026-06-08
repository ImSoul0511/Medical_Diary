# IoT Hardware Data Simulator

Standalone Python script that simulates multiple patients' wearable sensors
(smartwatch/Health Connect) and pushes clinically realistic vital signs to
the Medical Diary backend API.

## Prerequisites

- Backend running at `http://localhost:8000` (via `docker-compose up -d --build`)
- Python 3.10+
- `httpx` installed (`pip install httpx`)

## Quick Start (Zero Config)

The simulator auto-generates user accounts. No manual setup needed:

```bash
cd backend/
pip install httpx    # if not already installed

# Run with defaults: 3 devices, backfill 7 days + real-time
python -m mock_data
```

On the **first run**, the simulator will:
1. Generate credentials (`sim_user_1@test.com`, `sim_user_2@test.com`, ...)
2. Register them via `POST /auth/register`
3. Save credentials to `mock_data/credentials.json` (smart cache)
4. Log in and start pushing data

On **subsequent runs**, it loads cached credentials and skips registration.

## Advanced Setup (Manual Credentials)

If you prefer to use specific accounts, create a `credentials.json`:

```json
[
    {"email": "your_user@example.com", "password": "yourpassword"}
]
```

Then pass it explicitly:

```bash
python -m mock_data --credentials-file path/to/credentials.json
```

## Usage

Run from the `backend/` directory:

```bash
# Zero-config: auto-register 3 users, backfill 7 days + real-time
python -m mock_data

# 5 devices, backfill only
python -m mock_data --devices 5 --mode backfill

# Real-time only, custom interval
python -m mock_data --mode realtime --interval 15

# Full options
python -m mock_data \
    --devices 5 \
    --mode both \
    --backfill-days 7 \
    --backfill-interval 60 \
    --interval 30 \
    --api-url http://localhost:8000 \
    --verbose
```

## CLI Options

| Flag | Default | Description |
|------|---------|-------------|
| `--credentials-file` | `mock_data/credentials.json` | Path to credential cache (auto-created if missing) |
| `--devices` | `3` | Number of devices to simulate |
| `--mode` | `both` | `realtime`, `backfill`, or `both` |
| `--backfill-days` | `7` | Days of historical data to generate |
| `--backfill-interval` | `60` | Simulated gap (seconds) between backfill readings |
| `--interval` | `30` | Real-time push interval (seconds) |
| `--api-url` | `http://localhost:8000` | Backend API base URL |
| `--verbose` | off | Enable DEBUG logging |

## Data Model

Each reading is pushed to `POST /health-metrics` with this payload:

```json
{
    "heart_rate": 75,
    "step_count": 4200,
    "respiratory_rate": 16,
    "recorded_at": "2026-06-01T08:30:00+00:00"
}
```

### Realism

- **Heart Rate** and **Respiratory Rate** use the Ornstein-Uhlenbeck process
  (mean-reverting random walk) to prevent clinically impossible jumps.
- **Step Count** uses a Poisson accumulator modulated by time-of-day
  (zero during sleep, peaks during commute hours).
- Five patient profiles (healthy, elderly, athlete, hypertensive, anxious)
  ensure data diversity across devices.

## Stopping

Press `Ctrl+C` to gracefully stop. All in-flight requests will complete before exit.
