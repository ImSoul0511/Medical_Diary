import type { Notification } from "../types/notification";
import { asNullableString, asRecord, asString } from "./common";

export function mapNotificationDto(dto: unknown): Notification {
  const source = asRecord(dto);

  return {
    id: asString(source.id),
    type: asString(source.type),
    title: asString(source.title),
    message: asString(source.message),
    referenceId: asNullableString(source.reference_id),
    isRead: source.is_read === true,
    createdAt: asString(source.created_at),
  };
}
