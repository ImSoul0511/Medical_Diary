import { create } from "zustand";
import { healthMetricsApi } from "../api/health_metrics/healthMetricsApi";
import {
  mapHealthMetricDto,
  mapHealthMetricFiltersToParams,
  mapHealthMetricFormToDto,
  mapManualHealthMetricFiltersToParams,
  mapManualHealthRecordDto,
  mapManualRecordFormToDto,
} from "../mappers/healthMetricsMapper";
import type {
  HealthMetric,
  HealthMetricChartPoint,
  HealthMetricFilters,
  HealthMetricForm,
  ManualHealthRecord,
  ManualHealthRecordFilters,
  ManualHealthRecordForm,
} from "../types/healthMetrics";
import { getErrorMessage } from "./storeUtils";

type HealthMetricsStore = {
  items: HealthMetric[];
  manualItems: ManualHealthRecord[];
  latest: HealthMetric | null;
  filters: HealthMetricFilters;
  manualFilters: ManualHealthRecordFilters;
  chartData: HealthMetricChartPoint[];
  isLoading: boolean;
  isLoadingManual: boolean;
  isCreating: boolean;
  isCreatingManual: boolean;
  error: string | null;
  loadMine: (filters?: HealthMetricFilters) => Promise<HealthMetric[]>;
  loadPatientMetrics: (patientId: string, filters?: HealthMetricFilters) => Promise<HealthMetric[]>;
  createMetric: (form: HealthMetricForm) => Promise<HealthMetric>;
  loadMineManual: (filters?: ManualHealthRecordFilters) => Promise<ManualHealthRecord[]>;
  loadPatientManual: (patientId: string, filters?: ManualHealthRecordFilters) => Promise<ManualHealthRecord[]>;
  // Aliases matching main branch naming
  loadManualMetrics: (filters?: ManualHealthRecordFilters) => Promise<ManualHealthRecord[]>;
  loadPatientManualMetrics: (patientId: string, filters?: ManualHealthRecordFilters) => Promise<ManualHealthRecord[]>;
  createManualMetric: (form: ManualHealthRecordForm) => Promise<ManualHealthRecord>;
  deleteManualMetric: (id: string) => Promise<void>;
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

export const useHealthMetricsStore = create<HealthMetricsStore>((set, get) => ({
  items: [],
  manualItems: [],
  latest: null,
  filters: {},
  manualFilters: {},
  chartData: [],
  isLoading: false,
  isLoadingManual: false,
  isCreating: false,
  isCreatingManual: false,
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
  loadMineManual: async (filters = {}) => {
    set({ isLoadingManual: true, error: null, manualFilters: filters });
    try {
      const manualItems = (
        await healthMetricsApi.listManual(mapManualHealthMetricFiltersToParams(filters))
      ).map(mapManualHealthRecordDto);
      set({ manualItems, isLoadingManual: false });
      return manualItems;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load manual health records.");
      set({ isLoadingManual: false, error: message });
      throw error;
    }
  },
  loadPatientManual: async (patientId, filters = {}) => {
    const nextFilters = { ...filters, patientId };
    set({ isLoadingManual: true, error: null, manualFilters: nextFilters });
    try {
      const manualItems = (
        await healthMetricsApi.listManual(mapManualHealthMetricFiltersToParams(nextFilters))
      ).map(mapManualHealthRecordDto);
      set({ manualItems, isLoadingManual: false });
      return manualItems;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient manual health records.");
      set({ isLoadingManual: false, error: message });
      throw error;
    }
  },
  // Aliases for compatibility
  loadManualMetrics: async (filters = {}) => get().loadMineManual(filters),
  loadPatientManualMetrics: async (patientId, filters = {}) => get().loadPatientManual(patientId, filters),
  createManualMetric: async (form) => {
    set({ isCreatingManual: true, error: null });
    try {
      const created = mapManualHealthRecordDto(
        await healthMetricsApi.createManual(mapManualRecordFormToDto(form)),
      );
      set((state) => ({
        manualItems: [created, ...state.manualItems],
        isCreatingManual: false,
      }));
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create manual health record.");
      set({ isCreatingManual: false, error: message });
      throw error;
    }
  },
  deleteManualMetric: async (id) => {
    set({ isLoadingManual: true, error: null });
    try {
      await healthMetricsApi.deleteManual(id);
      set((state) => ({
        manualItems: state.manualItems.filter((item) => item.id !== id),
        isLoadingManual: false,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete manual health record.");
      set({ isLoadingManual: false, error: message });
      throw error;
    }
  },
  setFilters: (filters) => set({ filters }),
  clear: () =>
    set({
      items: [],
      manualItems: [],
      latest: null,
      chartData: [],
      filters: {},
      manualFilters: {},
      error: null,
    }),
}));
