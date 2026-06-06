import { create } from "zustand";
import { healthMetricsApi } from "../api/health_metrics/healthMetricsApi";
import {
  mapHealthMetricDto,
  mapHealthMetricFiltersToParams,
  mapHealthMetricFormToDto,
} from "../mappers/healthMetricsMapper";
import type {
  HealthMetric,
  HealthMetricChartPoint,
  HealthMetricFilters,
  HealthMetricForm,
} from "../types/healthMetrics";
import { getErrorMessage } from "./storeUtils";

type HealthMetricsStore = {
  items: HealthMetric[];
  latest: HealthMetric | null;
  filters: HealthMetricFilters;
  chartData: HealthMetricChartPoint[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  loadMine: (filters?: HealthMetricFilters) => Promise<HealthMetric[]>;
  loadPatientMetrics: (patientId: string, filters?: HealthMetricFilters) => Promise<HealthMetric[]>;
  createMetric: (form: HealthMetricForm) => Promise<HealthMetric>;
  setFilters: (filters: HealthMetricFilters) => void;
  clear: () => void;
};

function toChartData(items: HealthMetric[]): HealthMetricChartPoint[] {
  return items.map((metric) => ({
    label: metric.recordedAt,
    heartRate: metric.heartRate,
    stepCount: metric.stepCount,
    respiratoryRate: metric.respiratoryRate,
  }));
}

export const useHealthMetricsStore = create<HealthMetricsStore>((set) => ({
  items: [],
  latest: null,
  filters: {},
  chartData: [],
  isLoading: false,
  isCreating: false,
  error: null,
  loadMine: async (filters = {}) => {
    set({ isLoading: true, error: null, filters });
    try {
      const data = await healthMetricsApi.list(mapHealthMetricFiltersToParams(filters));
      const items = data.map(mapHealthMetricDto);
      set({
        items,
        latest: items[0] ?? null,
        chartData: toChartData(items),
        isLoading: false,
      });
      return items;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load health metrics.");
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  loadPatientMetrics: async (patientId, filters = {}) => {
    set({ isLoading: true, error: null, filters: { ...filters, patientId } });
    try {
      const data = await healthMetricsApi.list(
        mapHealthMetricFiltersToParams({ ...filters, patientId }),
      );
      const items = data.map(mapHealthMetricDto);
      set({
        items,
        latest: items[0] ?? null,
        chartData: toChartData(items),
        isLoading: false,
      });
      return items;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient health metrics.");
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  createMetric: async (form) => {
    set({ isCreating: true, error: null });
    try {
      const created = mapHealthMetricDto(
        await healthMetricsApi.create(mapHealthMetricFormToDto(form)),
      );
      set((state) => {
        const items = [created, ...state.items];
        return {
          items,
          latest: created,
          chartData: toChartData(items),
          isCreating: false,
        };
      });
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create health metric.");
      set({ isCreating: false, error: message });
      throw error;
    }
  },
  setFilters: (filters) => set({ filters }),
  clear: () =>
    set({
      items: [],
      latest: null,
      chartData: [],
      filters: {},
      error: null,
    }),
}));
