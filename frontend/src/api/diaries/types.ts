export interface DiaryEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  symptom_level?: number;
  mood?: string;
  created_at: string;
  updated_at?: string;
}

export interface DiaryCreateRequest {
  title?: string;
  content: string;
  symptom_level?: number;
  mood?: string;
}

export interface DiaryResponse {
  id: string;
  user_id: string;
  content?: string;
  symptoms?: number;
  created_at: string;
  updated_at?: string;
}