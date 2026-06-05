import type { DiaryEntry, DiaryFilters, DiaryForm, SymptomEntry } from "../types/diary";
import { asArray, asNumberOrNull, asRecord, asString, compactPayload } from "./common";

export function mapSymptomEntryDto(dto: unknown): SymptomEntry {
  const source = asRecord(dto);

  return {
    name: asString(source.name),
    severity: asNumberOrNull(source.severity) ?? 1,
  };
}

export function mapDiaryDto(dto: unknown): DiaryEntry {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    userId: asString(source.user_id),
    content: asString(source.content),
    symptoms: asArray<unknown>(source.symptoms).map(mapSymptomEntryDto),
    createdAt: asString(source.created_at),
    updatedAt: asString(source.updated_at),
  };
}

export function mapDiaryFormToDto(form: DiaryForm) {
  return compactPayload({
    content: form.content.trim() || null,
    symptoms: form.symptoms.length > 0 ? form.symptoms : null,
  });
}

export function mapDiaryFiltersToParams(filters?: DiaryFilters) {
  return compactPayload({
    patient_id: filters?.patientId,
  });
}
