import { create } from "zustand";
import { prescriptionApi } from "../api/prescriptionApi";
import { prescriptionsApi } from "../api/prescriptionsApi";
import {
  mapPrescriptionDraftToDto,
  mapPrescriptionDto,
  mapPrescriptionItemDraftToDto,
  mapPrescriptionLogDto,
  mapPrescriptionLogStatusToDto,
} from "../mappers/prescriptionMapper";
import type {
  Prescription,
  PrescriptionDraft,
  PrescriptionItemDraft,
  PrescriptionLog,
  PrescriptionLogStatus,
} from "../types/prescriptions";
import { apiWrapperMissing, getErrorMessage } from "./storeUtils";

type PrescriptionStore = {
  prescriptions: Prescription[];
  logsByPrescriptionId: Record<string, PrescriptionLog[]>;
  todayLogs: PrescriptionLog[];
  selectedPrescriptionId: string | null;
  builderDraft: PrescriptionDraft;
  itemDrafts: PrescriptionItemDraft[];
  isLoadingPrescriptions: boolean;
  isLoadingLogs: boolean;
  isCreatingPrescription: boolean;
  isAddingItem: boolean;
  updatingLogId: string | null;
  deletingPrescriptionId: string | null;
  error: string | null;
  loadPrescriptions: () => Promise<Prescription[]>;
  loadPrescriptionLogs: (prescriptionId: string) => Promise<PrescriptionLog[]>;
  updateLogStatus: (logId: string, status: PrescriptionLogStatus) => Promise<PrescriptionLog>;
  createPrescription: (draft: PrescriptionDraft) => Promise<Prescription>;
  addPrescriptionItem: (prescriptionId: string, draft: PrescriptionItemDraft) => Promise<void>;
  deletePrescription: (prescriptionId: string) => Promise<void>;
  setBuilderDraft: (draft: PrescriptionDraft) => void;
  addItemDraft: () => void;
  updateItemDraft: (index: number, patch: Partial<PrescriptionItemDraft>) => void;
  removeItemDraft: (index: number) => void;
  resetBuilder: () => void;
};

const emptyBuilderDraft: PrescriptionDraft = {
  patientId: "",
  notes: "",
};

const emptyItemDraft: PrescriptionItemDraft = {
  medicationName: "",
  dosage: "",
  durationDays: 0,
  scheduledTimes: [],
  startDate: "",
  customLogs: [],
};

export const usePrescriptionStore = create<PrescriptionStore>((set) => ({
  prescriptions: [],
  logsByPrescriptionId: {},
  todayLogs: [],
  selectedPrescriptionId: null,
  builderDraft: emptyBuilderDraft,
  itemDrafts: [],
  isLoadingPrescriptions: false,
  isLoadingLogs: false,
  isCreatingPrescription: false,
  isAddingItem: false,
  updatingLogId: null,
  deletingPrescriptionId: null,
  error: null,
  loadPrescriptions: async () => {
    set({ isLoadingPrescriptions: true, error: null });
    try {
      const prescriptions = (await prescriptionApi.list()).map(mapPrescriptionDto);
      set({ prescriptions, isLoadingPrescriptions: false });
      return prescriptions;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load prescriptions.");
      set({ isLoadingPrescriptions: false, error: message });
      throw error;
    }
  },
  loadPrescriptionLogs: async (prescriptionId) => {
    set({ isLoadingLogs: true, selectedPrescriptionId: prescriptionId, error: null });
    try {
      const logs = (await prescriptionApi.getLogs(prescriptionId)).map(mapPrescriptionLogDto);
      set((state) => ({
        logsByPrescriptionId: {
          ...state.logsByPrescriptionId,
          [prescriptionId]: logs,
        },
        todayLogs: logs,
        isLoadingLogs: false,
      }));
      return logs;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load prescription logs.");
      set({ isLoadingLogs: false, error: message });
      throw error;
    }
  },
  updateLogStatus: async (logId, status) => {
    mapPrescriptionLogStatusToDto(status);
    const error = apiWrapperMissing(`updateLogStatus(${logId})`);
    set({ updatingLogId: null, error: error.message });
    throw error;
  },
  createPrescription: async (draft) => {
    set({ isCreatingPrescription: true, error: null });
    try {
      const created = mapPrescriptionDto(
        await prescriptionsApi.create(mapPrescriptionDraftToDto(draft)),
      );
      set((state) => ({
        prescriptions: [created, ...state.prescriptions],
        isCreatingPrescription: false,
      }));
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create prescription.");
      set({ isCreatingPrescription: false, error: message });
      throw error;
    }
  },
  addPrescriptionItem: async (prescriptionId, draft) => {
    mapPrescriptionItemDraftToDto(draft);
    const error = apiWrapperMissing(`addPrescriptionItem(${prescriptionId})`);
    set({ isAddingItem: false, error: error.message });
    throw error;
  },
  deletePrescription: async (prescriptionId) => {
    const error = apiWrapperMissing(`deletePrescription(${prescriptionId})`);
    set({ deletingPrescriptionId: null, error: error.message });
    throw error;
  },
  setBuilderDraft: (draft) => set({ builderDraft: draft }),
  addItemDraft: () =>
    set((state) => ({
      itemDrafts: [...state.itemDrafts, { ...emptyItemDraft }],
    })),
  updateItemDraft: (index, patch) =>
    set((state) => ({
      itemDrafts: state.itemDrafts.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    })),
  removeItemDraft: (index) =>
    set((state) => ({
      itemDrafts: state.itemDrafts.filter((_, draftIndex) => draftIndex !== index),
    })),
  resetBuilder: () =>
    set({
      builderDraft: emptyBuilderDraft,
      itemDrafts: [],
      error: null,
    }),
}));
