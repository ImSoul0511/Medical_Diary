import { create } from "zustand";
import {
  mapEmergencyTokenCreateFormToDto,
  mapEmergencyTokenUpdateFormToDto,
} from "../mappers/emergencyMapper";
import type {
  EmergencyAccessLog,
  EmergencyProfile,
  EmergencyToken,
  EmergencyTokenCreateForm,
  EmergencyTokenUpdateForm,
} from "../types/emergency";
import { apiWrapperMissing } from "./storeUtils";

type EmergencyStore = {
  tokens: EmergencyToken[];
  accessHistory: EmergencyAccessLog[];
  publicProfile: EmergencyProfile | null;
  createdToken: string | null;
  isLoadingTokens: boolean;
  isLoadingHistory: boolean;
  isLoadingPublicProfile: boolean;
  isCreating: boolean;
  updatingTokenId: string | null;
  revokingTokenId: string | null;
  error: string | null;
  createToken: (form: EmergencyTokenCreateForm) => Promise<EmergencyToken>;
  loadTokens: () => Promise<EmergencyToken[]>;
  loadTokenHistory: () => Promise<EmergencyAccessLog[]>;
  updateToken: (tokenId: string, form: EmergencyTokenUpdateForm) => Promise<EmergencyToken>;
  revokeToken: (tokenId: string) => Promise<void>;
  loadPublicProfile: (token: string) => Promise<EmergencyProfile>;
  clearPublicProfile: () => void;
  clearCreatedToken: () => void;
};

export const useEmergencyStore = create<EmergencyStore>((set) => ({
  tokens: [],
  accessHistory: [],
  publicProfile: null,
  createdToken: null,
  isLoadingTokens: false,
  isLoadingHistory: false,
  isLoadingPublicProfile: false,
  isCreating: false,
  updatingTokenId: null,
  revokingTokenId: null,
  error: null,
  createToken: async (form) => {
    mapEmergencyTokenCreateFormToDto(form);
    const error = apiWrapperMissing("createToken(form)");
    set({ isCreating: false, error: error.message });
    throw error;
  },
  loadTokens: async () => {
    const error = apiWrapperMissing("loadTokens()");
    set({ isLoadingTokens: false, error: error.message });
    throw error;
  },
  loadTokenHistory: async () => {
    const error = apiWrapperMissing("loadTokenHistory()");
    set({ isLoadingHistory: false, error: error.message });
    throw error;
  },
  updateToken: async (tokenId, form) => {
    mapEmergencyTokenUpdateFormToDto(form);
    const error = apiWrapperMissing(`updateToken(${tokenId})`);
    set({ updatingTokenId: null, error: error.message });
    throw error;
  },
  revokeToken: async (tokenId) => {
    const error = apiWrapperMissing(`revokeToken(${tokenId})`);
    set({ revokingTokenId: null, error: error.message });
    throw error;
  },
  loadPublicProfile: async (token) => {
    const error = apiWrapperMissing(`loadPublicProfile(${token})`);
    set({ isLoadingPublicProfile: false, error: error.message });
    throw error;
  },
  clearPublicProfile: () => set({ publicProfile: null, isLoadingPublicProfile: false }),
  clearCreatedToken: () => set({ createdToken: null }),
}));
