export interface NotificationResponse {
  id: string;
  type: 'access_request' | 'prescription_new' | 'prescription_reminder' | 'emergency_token_expired';
  title: string;
  message: string;
  reference_id?: string; 
  is_read: boolean;
  created_at: string;
}
