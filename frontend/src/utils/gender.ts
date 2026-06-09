import type { Gender } from "../types/users";

export function formatGender(gender: Gender | string | null | undefined) {
  if (gender === "male") return "Nam";
  if (gender === "female") return "Nữ";
  return "Chưa cập nhật";
}
