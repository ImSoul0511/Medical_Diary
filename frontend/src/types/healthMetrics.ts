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
