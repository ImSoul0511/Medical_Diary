from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class HealthMetricCreateRequest(BaseModel):
    heart_rate: Optional[int] = Field(None, ge=30, le=250)
    step_count: Optional[int] = Field(None, ge=0)
    respiratory_rate: Optional[int] = Field(None, ge=5, le=60)
    recorded_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "heart_rate": 75,
                "step_count": 8500,
                "respiratory_rate": 16,
                "recorded_at": "2026-05-28T08:00:00Z"
            }
        }
    }


class HealthMetricResponse(BaseModel):
    id: UUID
    user_id: UUID
    heart_rate: Optional[int] = None
    step_count: Optional[int] = None
    respiratory_rate: Optional[int] = None
    recorded_at: datetime
    created_at: datetime


# ── Manual Health Records ────────────────────────────────────────────────────

class MetricType(str, Enum):
    """Loại chỉ số đo lường nhập tay."""
    blood_pressure = "blood_pressure"
    blood_glucose = "blood_glucose"
    spo2 = "spo2"
    body_temperature = "body_temperature"
    weight = "weight"


# ── Per-type Metrics Schemas (validate JSONB content) ────────────────────────

class BloodPressureMetrics(BaseModel):
    """Huyết áp (mmHg)."""
    systolic: int = Field(..., ge=60, le=300, description="Huyết áp tâm thu (mmHg)")
    diastolic: int = Field(..., ge=30, le=200, description="Huyết áp tâm trương (mmHg)")
    pulse: Optional[int] = Field(None, ge=30, le=250, description="Mạch (nhịp/phút)")


class BloodGlucoseMetrics(BaseModel):
    """Đường huyết (mg/dL)."""
    value: float = Field(..., ge=20, le=600, description="Đường huyết (mg/dL)")
    meal_context: Literal["fasting", "after_meal", "random"] = Field(
        ..., description="Bối cảnh đo: lúc đói / sau ăn / ngẫu nhiên"
    )


class SpO2Metrics(BaseModel):
    """Nồng độ oxy trong máu (%)."""
    value: int = Field(..., ge=50, le=100, description="SpO2 (%)")


class BodyTemperatureMetrics(BaseModel):
    """Nhiệt độ cơ thể (°C)."""
    value: float = Field(..., ge=34.0, le=43.0, description="Nhiệt độ (°C)")


class WeightMetrics(BaseModel):
    """Cân nặng (kg) và chiều cao tùy chọn (cm) để tính BMI."""
    value: float = Field(..., ge=1.0, le=500.0, description="Cân nặng (kg)")
    height: Optional[float] = Field(None, ge=30.0, le=300.0, description="Chiều cao (cm)")


# ── Mapping dùng để validate metrics theo metric_type ────────────────────────

METRICS_SCHEMA_MAP: dict[MetricType, type[BaseModel]] = {
    MetricType.blood_pressure: BloodPressureMetrics,
    MetricType.blood_glucose: BloodGlucoseMetrics,
    MetricType.spo2: SpO2Metrics,
    MetricType.body_temperature: BodyTemperatureMetrics,
    MetricType.weight: WeightMetrics,
}


# ── Request / Response ───────────────────────────────────────────────────────

class ManualHealthRecordCreateRequest(BaseModel):
    """Body cho POST /health-metrics/manual — Bệnh nhân tự ghi chỉ số đo lường."""
    metric_type: MetricType
    metrics: dict = Field(..., description="Dữ liệu đo lường, cấu trúc phụ thuộc metric_type")
    device_name: Optional[str] = Field(
        None, max_length=100,
        description="Tên thiết bị đo. VD: Máy đo huyết áp Omron HEM-7156",
    )
    notes: Optional[str] = Field(None, max_length=500, description="Ghi chú tùy chọn")
    recorded_at: datetime

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "metric_type": "blood_pressure",
                    "metrics": {"systolic": 120, "diastolic": 80, "pulse": 72},
                    "device_name": "Máy đo huyết áp Omron HEM-7156",
                    "notes": "Đo sau khi nghỉ ngơi 10 phút",
                    "recorded_at": "2026-06-05T08:00:00Z",
                },
                {
                    "metric_type": "blood_glucose",
                    "metrics": {"value": 95.0, "meal_context": "fasting"},
                    "device_name": "Máy đo đường huyết Accu-Chek",
                    "recorded_at": "2026-06-05T06:30:00Z",
                },
            ]
        }
    }

    @model_validator(mode="after")
    def validate_metrics_by_type(self):
        """Dispatch validation sang đúng sub-schema dựa trên metric_type."""
        schema_cls = METRICS_SCHEMA_MAP.get(self.metric_type)
        if schema_cls is None:
            raise ValueError(f"Loại chỉ số '{self.metric_type}' không hợp lệ.")
        # Validate & normalize — raise ValidationError nếu sai cấu trúc
        validated = schema_cls(**self.metrics)
        self.metrics = validated.model_dump()
        return self


class ManualHealthRecordResponse(BaseModel):
    """Response cho manual health record."""
    id: UUID
    user_id: UUID
    metric_type: MetricType
    metrics: dict
    device_name: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime
