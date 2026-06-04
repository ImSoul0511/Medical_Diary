import { create } from "zustand";
import { medicalRecordApi } from "../api/medicalRecordApi";
import { mapMedicalRecordDto, mapMedicalRecordFormToDto } from "../mappers/medicalRecordMapper";
import type { MedicalRecord, MedicalRecordForm } from "../types/medicalRecord";
import { apiWrapperMissing, getErrorMessage } from "./storeUtils";

type MedicalRecordStore = {
  myRecords: MedicalRecord[];
  patientRecords: MedicalRecord[];
  selectedPatientId: string | null;
  isLoadingMine: boolean;
  isLoadingPatient: boolean;
  isCreating: boolean;
  error: string | null;
  loadMine: () => Promise<MedicalRecord[]>;
  loadPatientRecords: (patientId: string) => Promise<MedicalRecord[]>;
  createRecord: (form: MedicalRecordForm) => Promise<MedicalRecord>;
  clearPatientRecords: () => void;
};

export const useMedicalRecordStore = create<MedicalRecordStore>((set) => ({
  myRecords: [],
  patientRecords: [],
  selectedPatientId: null,
  isLoadingMine: false,
  isLoadingPatient: false,
  isCreating: false,
  error: null,
  loadMine: async () => {
    const error = apiWrapperMissing("loadMine medical records (/medical-records/me)");
    set({ error: error.message });
    throw error;
  },
  loadPatientRecords: async (patientId) => {
    const error = apiWrapperMissing(`loadPatientRecords(${patientId})`);
    set({ selectedPatientId: patientId, error: error.message });
    throw error;
  },
  createRecord: async (form) => {
    set({ isCreating: true, error: null });
    try {
      const created = mapMedicalRecordDto(
        await medicalRecordApi.create(mapMedicalRecordFormToDto(form)),
      );
      set((state) => ({
        patientRecords:
          state.selectedPatientId === created.patientId
            ? [created, ...state.patientRecords]
            : state.patientRecords,
        isCreating: false,
      }));
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create medical record.");
      set({ isCreating: false, error: message });
      throw error;
    }
  },
  clearPatientRecords: () =>
    set({
      patientRecords: [],
      selectedPatientId: null,
      isLoadingPatient: false,
      error: null,
    }),
}));
