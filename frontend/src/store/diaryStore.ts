import { create } from "zustand";
import { diaryApi } from "../api/diaries/diaryApi";
import { mapDiaryDto, mapDiaryFormToDto } from "../mappers/diaryMapper";
import type { DiaryEntry, DiaryFilters, DiaryForm } from "../types/diary";
import { getErrorMessage } from "./storeUtils";

type DiaryStore = {
  items: DiaryEntry[];
  filters: DiaryFilters;
  isLoading: boolean;
  isCreating: boolean;
  deletingId: string | null;
  error: string | null;
  loadMine: () => Promise<DiaryEntry[]>;
  loadPatientDiaries: (patientId: string) => Promise<DiaryEntry[]>;
  createDiary: (form: DiaryForm) => Promise<DiaryEntry>;
  deleteDiary: (diaryId: string) => Promise<void>;
  setFilters: (filters: DiaryFilters) => void;
  clear: () => void;
};

export const useDiaryStore = create<DiaryStore>((set) => ({
  items: [],
  filters: {},
  isLoading: false,
  isCreating: false,
  deletingId: null,
  error: null,
  loadMine: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = (await diaryApi.list()).map(mapDiaryDto);
      set({ items, isLoading: false });
      return items;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load diaries.");
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  loadPatientDiaries: async (patientId) => {
    set({ isLoading: true, error: null, filters: { patientId } });
    try {
      const items = (await diaryApi.list(patientId)).map(mapDiaryDto);
      set({ items, isLoading: false });
      return items;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load patient diaries.");
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  createDiary: async (form) => {
    set({ isCreating: true, error: null });
    try {
      const created = mapDiaryDto(
        await diaryApi.create(mapDiaryFormToDto(form)),
      );
      set((state) => ({
        items: [created, ...state.items],
        isCreating: false,
      }));
      return created;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create diary.");
      set({ isCreating: false, error: message });
      throw error;
    }
  },
  deleteDiary: async (diaryId) => {
    set({ deletingId: diaryId, error: null });
    try {
      await diaryApi.delete(diaryId);
      set((state) => ({
        items: state.items.filter((entry) => entry.id !== diaryId),
        deletingId: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete diary.");
      set({ deletingId: null, error: message });
      throw error;
    }
  },
  setFilters: (filters) => set({ filters }),
  clear: () =>
    set({
      items: [],
      filters: {},
      isLoading: false,
      isCreating: false,
      deletingId: null,
      error: null,
    }),
}));
