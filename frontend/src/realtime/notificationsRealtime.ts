import type { RealtimeChannel } from "@supabase/supabase-js";
import { mapNotificationDto } from "../mappers/notificationMapper";
import type { Notification } from "../types/notification";
import { realtimeSupabase } from "./supabaseRealtime";

type NotificationHandler = (notification: Notification) => void;

export function subscribeToNotificationInserts(
  userId: string,
  accessToken: string | null,
  onNotification: NotificationHandler,
) {
  if (!realtimeSupabase || !accessToken) return () => undefined;
  const client = realtimeSupabase;

  client.realtime.setAuth(accessToken);

  const channel: RealtimeChannel = client
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(mapNotificationDto(payload.new));
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
