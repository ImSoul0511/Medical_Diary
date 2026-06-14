import type { AuditLog, AuditLogFilters, DoctorApproval, DoctorVerifyForm } from "../types/admin";
import type { AuditLogQuery, DoctorVerifyRequest } from "../api/admin/types";
import type { PaginationState } from "../types/api";
import { asNullableString, asRecord, asString, compactPayload } from "./common";

export type PaginatedDto<T> = {
  data?: T[];
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export function mapDoctorApprovalDto(dto: unknown): DoctorApproval {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    fullName: asString(source.full_name),
    email: asString(source.email),
    specialty: asString(source.specialty),
    hospital: asNullableString(source.hospital),
    licenseNumber: asString(source.license_number),
    certificateUrl: asNullableString(source.certificate_url),
    registeredAt: asString(source.registered_at),
    status: asString(source.status, "pending_verification"),
  };
}

export function mapDoctorVerifyFormToDto(form: DoctorVerifyForm): DoctorVerifyRequest {
  return {
    action: form.action,
    notes: form.note.trim() || null,
  };
}

export function mapAuditLogDto(dto: unknown): AuditLog {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    actorId: asString(source.actor_id),
    actorName: asString(source.actor_name),
    action: asString(source.action),
    tableName: asString(source.table_name),
    targetUserId: asNullableString(source.target_user_id),
    oldData: (source.old_data as Record<string, unknown> | null) ?? null,
    newData: (source.new_data as Record<string, unknown> | null) ?? null,
    createdAt: asString(source.created_at),
  };
}

export function mapAuditLogFiltersToParams(filters: AuditLogFilters): AuditLogQuery {
  return compactPayload({
    page: filters.page,
    limit: filters.limit,
    action: filters.action,
    user_id: filters.userId,
    date_from: filters.dateFrom,
  }) as AuditLogQuery;
}

export function mapPaginationDto(dto: unknown): PaginationState {
  const source = asRecord(dto);

  return {
    page: typeof source.page === "number" ? source.page : 1,
    limit: typeof source.limit === "number" ? source.limit : 20,
    total: typeof source.total === "number" ? source.total : 0,
  };
}
