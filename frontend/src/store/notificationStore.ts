import { create } from "zustand";
import { notificationsApi } from "../api/notifications/notificationsApi";
import { mapNotificationDto } from "../mappers/notificationMapper";
import type { Notification } from "../types/notification";
import { getErrorMessage } from "./storeUtils";

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
    set({ isLoading: true, error: null });
    try {
      const items = (await notificationsApi.list()).map(mapNotificationDto);
      set({
        items,
        unreadCount: items.filter((item) => !item.isRead).length,
        isLoading: false,
      });
      return items;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load notifications.");
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  markAsRead: async (id) => {
    set({ markingReadId: id, error: null });
    try {
      await notificationsApi.markAsRead(id);
      set((state) => {
        const items = state.items.map((item) =>
          item.id === id ? { ...item, isRead: true } : item,
        );
        return {
          items,
          unreadCount: items.filter((item) => !item.isRead).length,
          markingReadId: null,
        };
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to mark notification as read.");
      set({ markingReadId: null, error: message });
      throw error;
    }
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
