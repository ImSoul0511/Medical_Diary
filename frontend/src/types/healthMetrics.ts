export type HealthMetric = {
    id: string;
    userId: string;
    heartRate: number | null;
    stepCount: number | null;
    respiratoryRate: number | null;
    recordedAt: string; 
    createdAt: string;
};

export type HealthMetricForm = { 
    heartRate: string;
    stepCount: string;
    respiratoryRate: string;
    recordedAt: string;
}

export type HealthMetricFilters = {
    patientId?: string;
    start?: string; 
    end?: string;
}

export type HealthMetricChartPoint = {
    label: string;
    heartRate: number | null;
    stepCount: number | null;
    respiratoryRate: number | null;
}

export type MetricType = "blood_pressure" | "blood_glucose" | "spo2" | "body_temperature" | "weight" | "height";

// Alias for compatibility
export type ManualMetricType = MetricType;

export type ManualHealthRecord = {
    id: string;
    userId: string;
    metricType: MetricType;
    metrics: Record<string, unknown>;
    deviceName: string | null;
    notes: string | null;
    recordedAt: string;
    createdAt: string;
}

export type ManualHealthRecordForm = {
    metricType: MetricType;
    systolic?: string;
    diastolic?: string;
    pulse?: string;
    value?: string;
    mealContext?: "fasting" | "after_meal" | "random";
    height?: string;
    deviceName?: string;
    notes?: string;
    recordedAt: string;
}

export type ManualHealthRecordFilters = HealthMetricFilters & {
    metricType?: MetricType | "";
}
