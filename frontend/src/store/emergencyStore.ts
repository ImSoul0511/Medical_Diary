import { create } from "zustand";
import { emergencyApi } from "../api/emergency/emergencyApi";
import {
  mapEmergencyAccessLogDto,
  mapEmergencyProfileDto,
  mapEmergencyTokenCreateFormToDto,
  mapEmergencyTokenDto,
  mapEmergencyTokenUpdateFormToDto,
} from "../mappers/emergencyMapper";
import type {
  EmergencyAccessLog,
  EmergencyProfile,
  EmergencyToken,
  EmergencyTokenCreateForm,
  EmergencyTokenUpdateForm,
} from "../types/emergency";
import { getErrorMessage } from "./storeUtils";

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
  clear: () => void;
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
    set({ isCreating: true, error: null });
    try {
      const created = mapEmergencyTokenDto(
        await emergencyApi.createToken(mapEmergencyTokenCreateFormToDto(form)),
      );
      set({ createdToken: created.token, isCreating: false });
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create emergency token.");
      set({ isCreating: false, error: message });
      throw error;
    }
  },
  loadTokens: async () => {
    set({ isLoadingTokens: true, error: null });
    try {
      const tokens = (await emergencyApi.listTokens()).map(mapEmergencyTokenDto);
      set({ tokens, isLoadingTokens: false });
      return tokens;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load emergency tokens.");
      set({ isLoadingTokens: false, error: message });
      throw error;
    }
  },
  loadTokenHistory: async () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const accessHistory = (await emergencyApi.getAccessHistory()).map(mapEmergencyAccessLogDto);
      set({ accessHistory, isLoadingHistory: false });
      return accessHistory;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load emergency access history.");
      set({ isLoadingHistory: false, error: message });
      throw error;
    }
  },
  updateToken: async (tokenId, form) => {
    set({ updatingTokenId: tokenId, error: null });
    try {
      const updated = mapEmergencyTokenDto(
        await emergencyApi.updateToken(tokenId, mapEmergencyTokenUpdateFormToDto(form)),
      );
      set((state) => ({
        tokens: state.tokens.map((token) => (token.id === tokenId ? updated : token)),
        updatingTokenId: null,
      }));
      return updated;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update emergency token.");
      set({ updatingTokenId: null, error: message });
      throw error;
    }
  },
  revokeToken: async (tokenId) => {
    set({ revokingTokenId: tokenId, error: null });
    try {
      await emergencyApi.revokeToken(tokenId);
      set((state) => ({
        tokens: state.tokens.filter((token) => token.id !== tokenId),
        revokingTokenId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to revoke emergency token.");
      set({ revokingTokenId: null, error: message });
      throw error;
    }
  },
  loadPublicProfile: async (token) => {
    set({ isLoadingPublicProfile: true, error: null });
    try {
      const publicProfile = mapEmergencyProfileDto(await emergencyApi.accessByToken(token));
      set({ publicProfile, isLoadingPublicProfile: false });
      return publicProfile;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load emergency profile.");
      set({ isLoadingPublicProfile: false, error: message });
      throw error;
    }
  },
  clearPublicProfile: () => set({ publicProfile: null, isLoadingPublicProfile: false }),
  clearCreatedToken: () => set({ createdToken: null }),
  clear: () =>
    set({
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
    }),
}));
