export type NotificationType =
  | "access_request"
  | "prescription_new"
  | "prescription_reminder"
  | "emergency_token_expired"
  | string;

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
};

