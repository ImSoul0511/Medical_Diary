import { create } from "zustand";
import { mockNotifications } from "../constants/mockData";

type NotificationItem = (typeof mockNotifications)[number];

type NotificationStore = {
  items: NotificationItem[];
  unreadCount: number;
  markAsReadLocal: (id: string) => void;
  clearAllLocal: () => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: mockNotifications,
  unreadCount: mockNotifications.filter((item) => item.unread).length,
  markAsReadLocal: (id) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, unread: false } : item,
      );
      return { items, unreadCount: items.filter((item) => item.unread).length };
    }),
  clearAllLocal: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, unread: false })),
      unreadCount: 0,
    })),
}));
