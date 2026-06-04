export type RequestStatus = "idle" | "loading" | "success" | "error";

export type ApiRequestState = {
  status: RequestStatus;
  error: string | null;
  requestId?: string | null;
};

export type PaginationState = {
  page: number;
  limit: number;
  total: number;
};