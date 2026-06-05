/**
 * Tệp: frontend/src/utils/cn.ts
 * Mục đích: Hàm tiện ích ghép className cho Tailwind bằng `clsx` và `twMerge`.
 * Sử dụng: `cn('p-2', condition && 'bg-red')` để kết hợp và loại trùng lớp Tailwind.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
