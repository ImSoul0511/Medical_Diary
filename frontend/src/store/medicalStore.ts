import { create } from "zustand";
import {
  mockDiaries,
  mockMetrics,
  mockPrescriptionLogs,
  mockPrescriptions,
  mockRecords,
} from "../constants/mockData";
import type {
  DiaryEntry,
  HealthMetric,
  PrescriptionLogStatus,
  SymptomEntry,
} from "../types/medical";

type MedicalStore = {
  healthMetrics: HealthMetric[];
  diaries: DiaryEntry[];
  medicalRecords: typeof mockRecords;
  prescriptions: typeof mockPrescriptions;
  prescriptionLogs: typeof mockPrescriptionLogs;
  isLoading?: boolean;
  error?: string | null;
  addMetricLocal: (metric: Omit<HealthMetric, "id">) => void;
  addDiaryLocal: (content: string, symptoms: SymptomEntry[]) => void;
  deleteDiaryLocal: (diaryId: string) => void;
  updatePrescriptionLogLocal: (logId: string, status: PrescriptionLogStatus) => void;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

export const useMedicalStore = create<MedicalStore>((set) => ({
  healthMetrics: mockMetrics,
  diaries: mockDiaries,
  medicalRecords: mockRecords,
  prescriptions: mockPrescriptions,
  prescriptionLogs: mockPrescriptionLogs,
  isLoading: false,
  error: null,
  addMetricLocal: (metric) =>
    set((state) => ({
      healthMetrics: [{ ...metric, id: makeId("metric") }, ...state.healthMetrics],
    })),
  addDiaryLocal: (content, symptoms) =>
    set((state) => ({ isLoading: true })),
    set((state) => ({
      diaries: [
        {
          id: makeId("diary"),
          content,
          symptoms,
          mood: "neutral",
          createdAt: new Date().toISOString(),
        },
        ...state.diaries,
      ],
      isLoading: false,
    })),
  deleteDiaryLocal: (diaryId) =>
    set((state) => ({ diaries: state.diaries.filter((entry) => entry.id !== diaryId) })),
  updatePrescriptionLogLocal: (logId, status) =>
    set((state) => ({
      prescriptionLogs: state.prescriptionLogs.map((log) =>
        log.id === logId ? { ...log, status } : log,
      ),
    })),
}));
