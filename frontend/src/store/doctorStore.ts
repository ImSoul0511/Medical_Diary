import { create } from "zustand";
import { doctorsApi } from "../api/doctors/doctorsApi";
import {
  mapManagedPatientDto,
  mapPatientProfileDto,
  mapPatientSearchResultDto,
  mapRequestAccessFormToDto,
  mapRequestAccessResultDto,
} from "../mappers/doctorMapper";
import type {
  PatientProfile,
  PatientSearchResult,
  ManagedPatient,
  RequestAccessForm,
  RequestAccessResult,
} from "../types/doctor";
import { getErrorMessage } from "./storeUtils";

type DoctorStore = {
  patientSearchResults: PatientSearchResult[];
  managedPatients: ManagedPatient[];
  selectedPatient: PatientProfile | null;
  selectedPatientId: string | null;
  requestAccessResult: RequestAccessResult | null;
  requestAccessDraft: RequestAccessForm | null;
  searchQuery: string;
  searchValidationError: string;
  hasSearched: boolean;
  isSearching: boolean;
  isLoadingManagedPatients: boolean;
  isLoadingPatient: boolean;
  isRequestingAccess: boolean;
  error: string | null;
  searchPatients: (phoneNumber: string) => Promise<PatientSearchResult[]>;
  loadManagedPatients: () => Promise<ManagedPatient[]>;
  loadPatientDetail: (patientId: string) => Promise<PatientProfile>;
  requestAccess: (form: RequestAccessForm) => Promise<RequestAccessResult>;
  setSearchQuery: (query: string) => void;
  setSearchValidationError: (msg: string) => void;
  setRequestAccessDraft: (draft: RequestAccessForm | null) => void;
  clearSearch: () => void;
  clearSelectedPatient: () => void;
  clearRequestResult: () => void;
  clear: () => void;
};

export const useDoctorStore = create<DoctorStore>((set) => ({
  patientSearchResults: [],
  managedPatients: [],
  selectedPatient: null,
  selectedPatientId: null,
  requestAccessResult: null,
  requestAccessDraft: null,
  searchQuery: "",
  searchValidationError: "",
  hasSearched: false,
  isSearching: false,
  isLoadingManagedPatients: false,
  isLoadingPatient: false,
  isRequestingAccess: false,
  error: null,
  searchPatients: async (phoneNumber) => {
    set({ isSearching: true, error: null });
    try {
      const patientSearchResults = (await doctorsApi.searchPatients(phoneNumber)).map(
        mapPatientSearchResultDto,
      );
      set({ patientSearchResults, isSearching: false, hasSearched: true });
      return patientSearchResults;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to search patients.");
      set({ isSearching: false, error: message, hasSearched: true });
      throw error;
    }
  },
  loadManagedPatients: async () => {
    set({ isLoadingManagedPatients: true, error: null });
    try {
      const managedPatients = (await doctorsApi.listManagedPatients()).map(mapManagedPatientDto);
      set({ managedPatients, isLoadingManagedPatients: false });
      return managedPatients;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load managed patients.");
      set({ isLoadingManagedPatients: false, error: message });
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
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchValidationError: (msg) => set({ searchValidationError: msg }),
  setRequestAccessDraft: (draft) => set({ requestAccessDraft: draft }),
  clearSearch: () => set({ patientSearchResults: [], error: null, hasSearched: false }),
  clearSelectedPatient: () =>
    set({ selectedPatient: null, selectedPatientId: null, isLoadingPatient: false }),
  clearRequestResult: () => set({ requestAccessResult: null }),
  clear: () =>
    set({
      patientSearchResults: [],
      managedPatients: [],
      selectedPatient: null,
      selectedPatientId: null,
      requestAccessResult: null,
      requestAccessDraft: null,
      searchQuery: "",
      searchValidationError: "",
      hasSearched: false,
      isSearching: false,
      isLoadingManagedPatients: false,
      isLoadingPatient: false,
      isRequestingAccess: false,
      error: null,
    }),
}));
