export function sanitizeErrorMessage(message: string, fallback: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("api này yêu cầu các quyền: doctor") || msg.includes("yêu cầu các quyền: doctor")) {
    return "Tài khoản của bạn không có quyền truy cập chức năng Bác sĩ.";
  }
  if (msg.includes("api này yêu cầu các quyền: admin") || msg.includes("yêu cầu các quyền: admin")) {
    return "Tài khoản của bạn không có quyền truy cập chức năng Quản trị viên.";
  }
  if (msg.includes("quyền bị từ chối") || msg.includes("permission denied") || msg.includes("forbidden") || msg.includes("403")) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (msg.includes("credentials") || msg.includes("unauthorized") || msg.includes("signature") || msg.includes("401")) {
    return "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.";
  }
  if (msg.includes("network error") || msg.includes("network") || msg.includes("timeout")) {
    return "Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.";
  }
  if (msg.includes("internal server error") || msg.includes("500") || msg.includes("status code 500")) {
    return "Hệ thống gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
  }
  if (msg.includes("not found") || msg.includes("404")) {
    return "Không tìm thấy dữ liệu yêu cầu.";
  }

  return message || fallback;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  let message = "";
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as Record<string, unknown>).message === "string") {
      message = (error as Record<string, unknown>).message as string;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }
  } else if (typeof error === "string") {
    message = error;
  }
  
  return sanitizeErrorMessage(message || fallback, fallback);
}
