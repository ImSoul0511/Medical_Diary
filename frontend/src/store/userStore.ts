import { create } from "zustand";
import {
  mockAccessHistory,
  mockDoctors,
  mockProfile,
} from "../constants/mockData";
import type { DoctorPublicProfile, PrivacySettings, UserProfile } from "../types/user";

type UserStore = {
  profile: UserProfile;
  accessHistory: typeof mockAccessHistory;
  doctorSearchResults: DoctorPublicProfile[];
  updateProfileLocal: (payload: Partial<UserProfile>) => void;
  updatePrivacyLocal: (payload: Partial<PrivacySettings>) => void;
  searchDoctorsLocal: (query: string) => void;
};

export const useUserStore = create<UserStore>((set, get) => ({
  profile: mockProfile,
  accessHistory: mockAccessHistory,
  doctorSearchResults: mockDoctors,
  updateProfileLocal: (payload) =>
    set((state) => ({ profile: { ...state.profile, ...payload } })),
  updatePrivacyLocal: (payload) =>
    set((state) => ({
      profile: {
        ...state.profile,
        privacySettings: { ...state.profile.privacySettings, ...payload },
      },
    })),
  searchDoctorsLocal: (query) => {
    const normalized = query.trim().toLowerCase();
    set({
      doctorSearchResults: normalized
        ? mockDoctors.filter(
            (doctor) =>
              doctor.fullName.toLowerCase().includes(normalized) ||
              doctor.specialty.toLowerCase().includes(normalized) ||
              doctor.hospital.toLowerCase().includes(normalized),
          )
        : mockDoctors,
    });
    return get().doctorSearchResults;
  },
}));
