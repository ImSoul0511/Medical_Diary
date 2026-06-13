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


class MetricType(str, Enum):
    blood_pressure = "blood_pressure"
    blood_glucose = "blood_glucose"
    spo2 = "spo2"
    body_temperature = "body_temperature"
    weight = "weight"
    height = "height"


class BloodPressureMetrics(BaseModel):
    systolic: int = Field(..., ge=60, le=300)
    diastolic: int = Field(..., ge=30, le=200)
    pulse: Optional[int] = Field(None, ge=30, le=250)


class BloodGlucoseMetrics(BaseModel):
    value: float = Field(..., ge=20, le=600)
    meal_context: Literal["fasting", "after_meal", "random"]


class SpO2Metrics(BaseModel):
    value: int = Field(..., ge=50, le=100)


class BodyTemperatureMetrics(BaseModel):
    value: float = Field(..., ge=34.0, le=43.0)


class WeightMetrics(BaseModel):
    value: float = Field(..., ge=1.0, le=500.0)
    height: Optional[float] = Field(None, ge=30.0, le=300.0)


class HeightMetrics(BaseModel):
    value: float = Field(..., ge=30.0, le=300.0)


METRICS_SCHEMA_MAP: dict[MetricType, type[BaseModel]] = {
    MetricType.blood_pressure: BloodPressureMetrics,
    MetricType.blood_glucose: BloodGlucoseMetrics,
    MetricType.spo2: SpO2Metrics,
    MetricType.body_temperature: BodyTemperatureMetrics,
    MetricType.weight: WeightMetrics,
    MetricType.height: HeightMetrics,
}


class ManualHealthRecordCreateRequest(BaseModel):
    metric_type: MetricType
    metrics: dict[str, object] = Field(..., description="Payload shaped by metric_type")
    device_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)
    recorded_at: datetime

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "metric_type": "blood_pressure",
                    "metrics": {"systolic": 120, "diastolic": 80, "pulse": 72},
                    "device_name": "Omron HEM-7156",
                    "notes": "Measured after resting",
                    "recorded_at": "2026-06-05T08:00:00Z",
                },
                {
                    "metric_type": "blood_glucose",
                    "metrics": {"value": 95.0, "meal_context": "fasting"},
                    "recorded_at": "2026-06-05T06:30:00Z",
                },
            ]
        }
    }

    @model_validator(mode="after")
    def validate_metrics_by_type(self) -> "ManualHealthRecordCreateRequest":
        schema_cls = METRICS_SCHEMA_MAP[self.metric_type]
        self.metrics = schema_cls(**self.metrics).model_dump()
        return self


class ManualHealthRecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    metric_type: MetricType
    metrics: dict[str, object]
    device_name: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime
