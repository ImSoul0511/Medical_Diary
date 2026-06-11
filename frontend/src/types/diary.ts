export type SymptomEntry = {
  name: string;
  severity: number;
};

export type DiaryEntry = {
  id: string;
  userId: string;
  content: string;
  symptoms: SymptomEntry[];
  createdAt: string;
  updatedAt: string;
}

export type DiaryForm = {
    content: string;
    symptoms: SymptomEntry[];
    createdAt?: string;
}

export type DiaryFilters = {
    patientId?: string;
}