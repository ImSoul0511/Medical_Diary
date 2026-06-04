import { create } from "zustand";
import type { Notification } from "../types/notification";
import { apiWrapperMissing } from "./storeUtils";

type NotificationStore = {
  items: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markingReadId: string | null;
  error: string | null;
  loadNotifications: () => Promise<Notification[]>;
  markAsRead: (id: string) => Promise<void>;
  receiveNotification: (notification: Notification) => void;
  markAllLocalRead: () => void;
  clear: () => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  markingReadId: null,
  error: null,
  loadNotifications: async () => {
    const error = apiWrapperMissing("loadNotifications()");
    set({ isLoading: false, error: error.message });
    throw error;
  },
  markAsRead: async (id) => {
    const error = apiWrapperMissing(`markAsRead(${id})`);
    set({ markingReadId: null, error: error.message });
    throw error;
  },
  receiveNotification: (notification) =>
    set((state) => ({
      items: [notification, ...state.items],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
    })),
  markAllLocalRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
    })),
  clear: () =>
    set({
      items: [],
      unreadCount: 0,
      isLoading: false,
      markingReadId: null,
      error: null,
    }),
}));
