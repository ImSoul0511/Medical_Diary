import { create } from "zustand";
import { userApi } from "../api/users/userApi";
import {
  mapAccessHistoryItemDto,
  mapDoctorPublicProfileDto,
  mapPrivateProfileFormToDto,
  mapPrivacySettingsToDto,
  mapUserProfileDto,
  mapUserProfileFormToDto,
} from "../mappers/userMapper";
import type {
  AccessHistoryItem,
  DoctorPublicProfile,
  PrivateProfileForm,
  PrivacySettings,
  UserProfile,
  UserProfileForm,
} from "../types/users";
import { getErrorMessage } from "./storeUtils";

type UserStore = {
  profile: UserProfile | null;
  profileForm: UserProfileForm | null;
  accessHistory: AccessHistoryItem[];
  doctorSearchResults: DoctorPublicProfile[];
  isLoadingProfile: boolean;
  isSavingProfile: boolean;
  isSavingPrivacy: boolean;
  isLoadingAccessHistory: boolean;
  isSearchingDoctors: boolean;
  isExporting: boolean;
  error: string | null;
  loadMe: () => Promise<UserProfile>;
  updateProfile: (form: UserProfileForm) => Promise<UserProfile>;
  updatePrivateProfile: (form: PrivateProfileForm) => Promise<UserProfile>;
  updatePrivacy: (payload: Partial<PrivacySettings>) => Promise<PrivacySettings>;
  loadAccessHistory: () => Promise<AccessHistoryItem[]>;
  searchDoctors: (filters: { name?: string; specialty?: string }) => Promise<DoctorPublicProfile[]>;
  exportData: (format: "json" | "pdf", scope?: string) => Promise<Blob>;
  setProfileForm: (form: UserProfileForm | null) => void;
  resetProfileForm: () => void;
  clear: () => void;
  clearError: () => void;
};

function profileToForm(profile: UserProfile): UserProfileForm {
  return {
    fullName: profile.fullName,
    gender: profile.gender ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    bloodType: profile.bloodType ?? "",
    allergies: profile.allergies ?? "",
    emergencyContact: profile.emergencyContact ?? "",
    phoneNumber: profile.phoneNumber ?? "",
    cccd: profile.cccd ?? "",
  };
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  profileForm: null,
  accessHistory: [],
  doctorSearchResults: [],
  isLoadingProfile: false,
  isSavingProfile: false,
  isSavingPrivacy: false,
  isLoadingAccessHistory: false,
  isSearchingDoctors: false,
  isExporting: false,
  error: null,
  loadMe: async () => {
    set({ isLoadingProfile: true, error: null });
    try {
      const profile = mapUserProfileDto(await userApi.getProfile());
      set({
        profile,
        profileForm: profileToForm(profile),
        isLoadingProfile: false,
      });
      return profile;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load profile.");
      set({ isLoadingProfile: false, error: message });
      throw error;
    }
  },
  updateProfile: async (form) => {
    set({ isSavingProfile: true, error: null });
    try {
      const profile = mapUserProfileDto(
        await userApi.updateProfile(mapUserProfileFormToDto(form)),
      );
      set({
        profile,
        profileForm: profileToForm(profile),
        isSavingProfile: false,
      });
      return profile;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update profile.");
      set({ isSavingProfile: false, error: message });
      throw error;
    }
  },
  updatePrivateProfile: async (form) => {
    set({ isSavingProfile: true, error: null });
    try {
      const profile = mapUserProfileDto(
        await userApi.updatePrivateProfile(mapPrivateProfileFormToDto(form)),
      );
      set({
        profile,
        profileForm: profileToForm(profile),
        isSavingProfile: false,
      });
      return profile;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update private profile.");
      set({ isSavingProfile: false, error: message });
      throw error;
    }
  },
  updatePrivacy: async (payload) => {
    const currentProfile = get().profile;
    const mergedPrivacy = {
      showBloodType: currentProfile?.privacySettings.showBloodType ?? false,
      showAllergies: currentProfile?.privacySettings.showAllergies ?? false,
      showEmergencyContact: currentProfile?.privacySettings.showEmergencyContact ?? false,
      ...payload,
    };

    set({ isSavingPrivacy: true, error: null });
    try {
      await userApi.updatePrivacySettings(mapPrivacySettingsToDto(payload));
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, privacySettings: mergedPrivacy }
          : state.profile,
        isSavingPrivacy: false,
      }));
      return mergedPrivacy;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update privacy settings.");
      set({ isSavingPrivacy: false, error: message });
      throw error;
    }
  },
  loadAccessHistory: async () => {
    set({ isLoadingAccessHistory: true, error: null });
    try {
      const accessHistory = (await userApi.getAccessHistory()).map(mapAccessHistoryItemDto);
      set({ accessHistory, isLoadingAccessHistory: false });
      return accessHistory;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load access history.");
      set({ isLoadingAccessHistory: false, error: message });
      throw error;
    }
  },
  searchDoctors: async (filters) => {
    set({ isSearchingDoctors: true, error: null });
    try {
      const doctorSearchResults = (await userApi.searchDoctors(filters)).map(
        mapDoctorPublicProfileDto,
      );
      set({ doctorSearchResults, isSearchingDoctors: false });
      return doctorSearchResults;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to search doctors.");
      set({ isSearchingDoctors: false, error: message });
      throw error;
    }
  },
  exportData: async (format, scope = "profile") => {
    set({ isExporting: true, error: null });
    try {
      const blob = await userApi.exportData(format, scope);
      set({ isExporting: false });
      return blob;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to export user data.");
      set({ isExporting: false, error: message });
      throw error;
    }
  },
  setProfileForm: (form) => set({ profileForm: form }),
  resetProfileForm: () => {
    const profile = get().profile;
    set({ profileForm: profile ? profileToForm(profile) : null });
  },
  clear: () =>
    set({
      profile: null,
      profileForm: null,
      accessHistory: [],
      doctorSearchResults: [],
      isLoadingProfile: false,
      isSavingProfile: false,
      isSavingPrivacy: false,
      isLoadingAccessHistory: false,
      isSearchingDoctors: false,
      isExporting: false,
      error: null,
    }),
  clearError: () => set({ error: null }),
}));

export { mapAccessHistoryItemDto, mapDoctorPublicProfileDto };
