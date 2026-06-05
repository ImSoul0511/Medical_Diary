export interface NotificationResponse {
  id: string;
  type: "access_request" | "prescription_new" | "prescription_reminder" | "emergency_token_expired" | string;
  title: string;
  message: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}
