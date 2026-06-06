import { create } from "zustand";
import { prescriptionApi } from "../api/prescriptions/prescriptionsApi";
import {
  mapPrescriptionDraftToDto,
  mapPrescriptionDto,
  mapPrescriptionItemDto,
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
import { getErrorMessage } from "./storeUtils";

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
  clear: () => void;
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
    set({ updatingLogId: logId, error: null });
    try {
      const updatedLog = mapPrescriptionLogDto(
        await prescriptionApi.updateLogStatus(logId, mapPrescriptionLogStatusToDto(status)),
      );
      set((state) => ({
        logsByPrescriptionId: Object.fromEntries(
          Object.entries(state.logsByPrescriptionId).map(([prescriptionId, logs]) => [
            prescriptionId,
            logs.map((log) => (log.id === logId ? updatedLog : log)),
          ]),
        ),
        todayLogs: state.todayLogs.map((log) => (log.id === logId ? updatedLog : log)),
        updatingLogId: null,
      }));
      return updatedLog;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update prescription log.");
      set({ updatingLogId: null, error: message });
      throw error;
    }
  },
  createPrescription: async (draft) => {
    set({ isCreatingPrescription: true, error: null });
    try {
      const created = mapPrescriptionDto(
        await prescriptionApi.createPrescription(mapPrescriptionDraftToDto(draft)),
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
    set({ isAddingItem: true, error: null });
    try {
      const item = mapPrescriptionItemDto(
        await prescriptionApi.addPrescriptionItem(
          prescriptionId,
          mapPrescriptionItemDraftToDto(draft),
        ),
      );
      set((state) => ({
        prescriptions: state.prescriptions.map((prescription) =>
          prescription.id === prescriptionId
            ? { ...prescription, items: [...prescription.items, item] }
            : prescription,
        ),
        isAddingItem: false,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to add prescription item.");
      set({ isAddingItem: false, error: message });
      throw error;
    }
  },
  deletePrescription: async (prescriptionId) => {
    set({ deletingPrescriptionId: prescriptionId, error: null });
    try {
      await prescriptionApi.deletePrescription(prescriptionId);
      set((state) => {
        const { [prescriptionId]: _removedLogs, ...logsByPrescriptionId } =
          state.logsByPrescriptionId;
        return {
          prescriptions: state.prescriptions.filter(
            (prescription) => prescription.id !== prescriptionId,
          ),
          logsByPrescriptionId,
          selectedPrescriptionId:
            state.selectedPrescriptionId === prescriptionId ? null : state.selectedPrescriptionId,
          deletingPrescriptionId: null,
        };
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete prescription.");
      set({ deletingPrescriptionId: null, error: message });
      throw error;
    }
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
  clear: () =>
    set({
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
    }),
}));
