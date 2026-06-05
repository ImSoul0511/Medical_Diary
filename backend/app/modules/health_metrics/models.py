"""
SQLAlchemy Models — Module: Health Metrics

Bảng:
- health_metrics: Dữ liệu đo lường tự động từ app/smartwatch (Private View — Vitals)
- manual_health_records: Chỉ số sức khỏe nhập tay (BP, Glucose, SpO2, ...)
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class HealthMetric(Base):
    """Bảng health_metrics — Dữ liệu đo lường (nhịp tim, bước chân, nhịp thở)."""

    __tablename__ = "health_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    heart_rate = Column(
        Integer,
        CheckConstraint("heart_rate >= 30 AND heart_rate <= 250", name="ck_hm_heart_rate"),
        nullable=True,
    )
    step_count = Column(
        Integer,
        CheckConstraint("step_count >= 0", name="ck_hm_step_count"),
        nullable=True,
    )
    respiratory_rate = Column(
        Integer,
        CheckConstraint(
            "respiratory_rate >= 5 AND respiratory_rate <= 60",
            name="ck_hm_respiratory_rate",
        ),
        nullable=True,
    )
    recorded_at = Column(
        DateTime(timezone=True), nullable=False, comment="Thời điểm đo, có thể khác thời điểm gửi"
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")

    __table_args__ = (
        Index("ix_health_metrics_user_recorded", "user_id", "recorded_at"),
    )


class ManualHealthRecord(Base):
    """Bảng manual_health_records — Chỉ số sức khỏe nhập tay (BP, Glucose, SpO2, ...)."""

    __tablename__ = "manual_health_records"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    metric_type = Column(
        String(30),
        CheckConstraint(
            "metric_type IN ('blood_pressure', 'blood_glucose', 'spo2', 'body_temperature', 'weight')",
            name="ck_mhr_metric_type",
        ),
        nullable=False,
    )
    metrics = Column(
        JSONB, nullable=False,
        comment="Dữ liệu đo lường, cấu trúc tùy theo metric_type",
    )
    device_name = Column(
        String(100), nullable=True,
        comment="Tên thiết bị đo. VD: Máy đo huyết áp Omron HEM-7156",
    )
    notes = Column(Text, nullable=True, comment="Ghi chú tùy chọn của bệnh nhân")
    recorded_at = Column(
        DateTime(timezone=True), nullable=False,
        comment="Thời điểm đo thực tế",
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Soft Delete")

    __table_args__ = (
        Index("ix_manual_health_records_user_type", "user_id", "metric_type"),
        Index("ix_manual_health_records_user_recorded", "user_id", "recorded_at"),
    )
