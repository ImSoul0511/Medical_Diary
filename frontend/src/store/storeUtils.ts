export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function apiWrapperMissing(action: string): Error {
  return new Error(`${action} is waiting for its API wrapper to be completed.`);
}
