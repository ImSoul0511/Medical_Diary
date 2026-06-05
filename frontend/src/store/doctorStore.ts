import { create } from "zustand";
import { doctorsApi } from "../api/doctors/doctorsApi";
import {
  mapPatientProfileDto,
  mapPatientSearchResultDto,
  mapRequestAccessFormToDto,
  mapRequestAccessResultDto,
} from "../mappers/doctorMapper";
import type {
  PatientProfile,
  PatientSearchResult,
  RequestAccessForm,
  RequestAccessResult,
} from "../types/doctor";
import { getErrorMessage } from "./storeUtils";

type DoctorStore = {
  patientSearchResults: PatientSearchResult[];
  selectedPatient: PatientProfile | null;
  selectedPatientId: string | null;
  requestAccessResult: RequestAccessResult | null;
  requestAccessDraft: RequestAccessForm | null;
  isSearching: boolean;
  isLoadingPatient: boolean;
  isRequestingAccess: boolean;
  error: string | null;
  searchPatients: (phoneNumber: string) => Promise<PatientSearchResult[]>;
  loadPatientDetail: (patientId: string) => Promise<PatientProfile>;
  requestAccess: (form: RequestAccessForm) => Promise<RequestAccessResult>;
  setRequestAccessDraft: (draft: RequestAccessForm | null) => void;
  clearSearch: () => void;
  clearSelectedPatient: () => void;
  clearRequestResult: () => void;
};

export const useDoctorStore = create<DoctorStore>((set) => ({
  patientSearchResults: [],
  selectedPatient: null,
  selectedPatientId: null,
  requestAccessResult: null,
  requestAccessDraft: null,
  isSearching: false,
  isLoadingPatient: false,
  isRequestingAccess: false,
  error: null,
  searchPatients: async (phoneNumber) => {
    set({ isSearching: true, error: null });
    try {
      const patientSearchResults = (await doctorsApi.searchPatients(phoneNumber)).map(
        mapPatientSearchResultDto,
      );
      set({ patientSearchResults, isSearching: false });
      return patientSearchResults;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to search patients.");
      set({ isSearching: false, error: message });
      throw error;
    }
  },
  loadPatientDetail: async (patientId) => {
    set({ selectedPatientId: patientId, isLoadingPatient: true, error: null });
    try {
      const selectedPatient = mapPatientProfileDto(await doctorsApi.getPatientDetail(patientId));
      set({ selectedPatient, isLoadingPatient: false });
      return selectedPatient;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient detail.");
      set({ isLoadingPatient: false, error: message });
      throw error;
    }
  },
  requestAccess: async (form) => {
    set({ isRequestingAccess: true, error: null });
    try {
      const requestAccessResult = mapRequestAccessResultDto(
        await doctorsApi.requestAccess(mapRequestAccessFormToDto(form)),
      );
      set({ requestAccessResult, isRequestingAccess: false });
      return requestAccessResult;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to request access.");
      set({ isRequestingAccess: false, error: message });
      throw error;
    }
  },
  setRequestAccessDraft: (draft) => set({ requestAccessDraft: draft }),
  clearSearch: () => set({ patientSearchResults: [], error: null }),
  clearSelectedPatient: () =>
    set({ selectedPatient: null, selectedPatientId: null, isLoadingPatient: false }),
  clearRequestResult: () => set({ requestAccessResult: null }),
}));
