export interface SymptomEntry {
  name: string;
  severity: number;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  content?: string | null;
  symptoms?: SymptomEntry[] | null;
  created_at: string;
  updated_at?: string;
}

export interface DiaryCreateRequest {
  content?: string | null;
  symptoms?: SymptomEntry[] | null;
}

export interface DiaryResponse {
  id: string;
  user_id: string;
  content?: string | null;
  symptoms?: SymptomEntry[] | null;
  created_at: string;
  updated_at?: string;
}
