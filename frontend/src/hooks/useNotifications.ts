import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";

export function useNotifications() {
  const rawItems = useNotificationStore((state) => state.items);
  const markAsReadLocal = useNotificationStore((state) => state.markAsReadLocal);
  const clearAllLocal = useNotificationStore((state) => state.clearAllLocal);
  const selectedRole = useAuthStore((state) => state.selectedRole);

  const items = rawItems.filter((it) => it.audience === "all" || it.audience === selectedRole);
  const unreadCount = items.filter((item) => item.unread).length;

  return { items, unreadCount, markAsReadLocal, clearAllLocal };
}
