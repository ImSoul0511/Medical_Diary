"""
Alembic Environment Configuration — Medical Diary Backend

Import tất cả models để Alembic auto-detect schema changes.
DB URL được đọc từ app.core.config thay vì hardcode trong alembic.ini.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.core.database import Base

# ─── Import TẤT CẢ models để Alembic nhận diện ─────────────────────────────
# Mỗi khi thêm module mới có models.py, phải import ở đây.
from app.modules.users.models import Profile, Doctor  # noqa: F401
from app.modules.consent.models import ConsentRequest, ConsentPermission  # noqa: F401
from app.modules.health_metrics.models import HealthMetric  # noqa: F401
from app.modules.diaries.models import Diary  # noqa: F401
from app.modules.medical_records.models import MedicalRecord  # noqa: F401
from app.modules.prescriptions.models import Prescription, PrescriptionItem, PrescriptionLog  # noqa: F401
from app.modules.emergency.models import EmergencyToken, EmergencyAccessLog  # noqa: F401
from app.modules.admin.models import DataAccessLog  # noqa: F401
from app.modules.notifications.models import Notification  # noqa: F401

# ─── Alembic Config ──────────────────────────────────────────────────────────
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url từ settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Target metadata cho autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Chạy migration ở chế độ 'offline' — chỉ sinh SQL mà không kết nối DB.
    Dùng khi muốn review SQL trước khi chạy.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Helper: chạy migration với connection đã cho."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Chạy migration ở chế độ 'online' với async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Chạy migration ở chế độ 'online' — kết nối trực tiếp DB."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
