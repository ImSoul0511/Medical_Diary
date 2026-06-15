import { create } from "zustand";
import { medicalRecordApi } from "../api/medical_records/medicalRecordApi";
import { mapMedicalRecordDto, mapMedicalRecordFormToDto, mapPatientDocumentDto } from "../mappers/medicalRecordMapper";
import type { MedicalRecord, MedicalRecordForm, PatientDocument } from "../types/medicalRecord";
import { getErrorMessage } from "./storeUtils";

type MedicalRecordStore = {
  myRecords: MedicalRecord[];
  patientRecords: MedicalRecord[];
  myDocuments: PatientDocument[];
  patientDocuments: PatientDocument[];
  selectedPatientId: string | null;
  isLoadingMine: boolean;
  isLoadingPatient: boolean;
  isLoadingDocuments: boolean;
  isUploadingDocument: boolean;
  isCreating: boolean;
  error: string | null;
  loadMine: () => Promise<MedicalRecord[]>;
  loadPatientRecords: (patientId: string) => Promise<MedicalRecord[]>;
  createRecord: (form: MedicalRecordForm) => Promise<MedicalRecord>;
  loadMyDocuments: () => Promise<PatientDocument[]>;
  loadPatientDocuments: (patientId: string) => Promise<PatientDocument[]>;
  uploadDocument: (file: File) => Promise<PatientDocument>;
  uploadAttachment: (patientId: string, file: File) => Promise<PatientDocument>;
  deleteDocument: (documentId: string) => Promise<void>;
  clearPatientRecords: () => void;
  clear: () => void;
};


export const useMedicalRecordStore = create<MedicalRecordStore>((set) => ({
  myRecords: [],
  patientRecords: [],
  myDocuments: [],
  patientDocuments: [],
  selectedPatientId: null,
  isLoadingMine: false,
  isLoadingPatient: false,
  isLoadingDocuments: false,
  isUploadingDocument: false,
  isCreating: false,
  error: null,
  loadMine: async () => {
    set({ isLoadingMine: true, error: null });
    try {
      const myRecords = (await medicalRecordApi.list()).map(mapMedicalRecordDto);
      set({ myRecords, isLoadingMine: false });
      return myRecords;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load medical records.");
      set({ isLoadingMine: false, error: message });
      throw error;
    }
  },
  loadPatientRecords: async (patientId) => {
    set({ selectedPatientId: patientId, isLoadingPatient: true, error: null });
    try {
      const patientRecords = (await medicalRecordApi.listPatientRecords(patientId)).map(
        mapMedicalRecordDto,
      );
      set({ patientRecords, isLoadingPatient: false });
      return patientRecords;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient medical records.");
      set({ isLoadingPatient: false, error: message });
      throw error;
    }
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
  loadMyDocuments: async () => {
    set({ isLoadingDocuments: true, error: null });
    try {
      const myDocuments = (await medicalRecordApi.listMyDocuments()).map(mapPatientDocumentDto);
      set({ myDocuments, isLoadingDocuments: false });
      return myDocuments;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load documents.");
      set({ isLoadingDocuments: false, error: message });
      throw error;
    }
  },
  loadPatientDocuments: async (patientId) => {
    set({ selectedPatientId: patientId, isLoadingDocuments: true, error: null });
    try {
      const patientDocuments = (await medicalRecordApi.listPatientDocuments(patientId)).map(
        mapPatientDocumentDto,
      );
      set({ patientDocuments, isLoadingDocuments: false });
      return patientDocuments;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient documents.");
      set({ isLoadingDocuments: false, error: message });
      throw error;
    }
  },
  uploadDocument: async (file) => {
    set({ isUploadingDocument: true, error: null });
    try {
      const created = mapPatientDocumentDto(await medicalRecordApi.uploadDocument(file));
      set((state) => ({
        myDocuments: [created, ...state.myDocuments],
        isUploadingDocument: false,
      }));
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to upload document.");
      set({ isUploadingDocument: false, error: message });
      throw error;
    }
  },
  uploadAttachment: async (patientId, file) => {
    set({ isUploadingDocument: true, error: null });
    try {
      const created = mapPatientDocumentDto(await medicalRecordApi.uploadAttachment(patientId, file));
      set({ isUploadingDocument: false });
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to upload attachment.");
      set({ isUploadingDocument: false, error: message });
      throw error;
    }
  },
  deleteDocument: async (documentId) => {
    set({ isLoadingDocuments: true, error: null });
    try {
      await medicalRecordApi.deleteDocument(documentId);
      set((state) => ({
        myDocuments: state.myDocuments.filter((doc) => doc.id !== documentId),
        isLoadingDocuments: false,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete document.");
      set({ isLoadingDocuments: false, error: message });
      throw error;
    }
  },
  clearPatientRecords: () =>
    set({
      patientRecords: [],
      patientDocuments: [],
      selectedPatientId: null,
      isLoadingPatient: false,
      isLoadingDocuments: false,
      error: null,
    }),
  clear: () =>
    set({
      myRecords: [],
      patientRecords: [],
      myDocuments: [],
      patientDocuments: [],
      selectedPatientId: null,
      isLoadingMine: false,
      isLoadingPatient: false,
      isLoadingDocuments: false,
      isUploadingDocument: false,
      isCreating: false,
      error: null,
    }),
}));
