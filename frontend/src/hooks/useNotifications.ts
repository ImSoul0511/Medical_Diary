import { useNotificationStore } from "../store/notificationStore";

export function useNotifications() {
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsReadLocal = useNotificationStore((state) => state.markAsReadLocal);
  const clearAllLocal = useNotificationStore((state) => state.clearAllLocal);

  return { items, unreadCount, markAsReadLocal, clearAllLocal };
}
