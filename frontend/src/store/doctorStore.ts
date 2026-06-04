import { create } from "zustand";
import { mapRequestAccessFormToDto } from "../mappers/doctorMapper";
import type {
  PatientProfile,
  PatientSearchResult,
  RequestAccessForm,
  RequestAccessResult,
} from "../types/doctor";
import { apiWrapperMissing } from "./storeUtils";

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
  searchPatients: async () => {
    const error = apiWrapperMissing("searchPatients(phoneNumber)");
    set({ isSearching: false, error: error.message });
    throw error;
  },
  loadPatientDetail: async (patientId) => {
    const error = apiWrapperMissing(`loadPatientDetail(${patientId})`);
    set({ selectedPatientId: patientId, isLoadingPatient: false, error: error.message });
    throw error;
  },
  requestAccess: async (form) => {
    mapRequestAccessFormToDto(form);
    const error = apiWrapperMissing("requestAccess(form)");
    set({ isRequestingAccess: false, error: error.message });
    throw error;
  },
  setRequestAccessDraft: (draft) => set({ requestAccessDraft: draft }),
  clearSearch: () => set({ patientSearchResults: [], error: null }),
  clearSelectedPatient: () =>
    set({ selectedPatient: null, selectedPatientId: null, isLoadingPatient: false }),
  clearRequestResult: () => set({ requestAccessResult: null }),
}));
