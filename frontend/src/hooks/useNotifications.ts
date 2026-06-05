import { useNotificationStore } from "../store/notificationStore";

export function useNotifications() {
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllLocalRead = useNotificationStore((state) => state.markAllLocalRead);

  return { items, unreadCount, markAsRead, markAllLocalRead };
}
