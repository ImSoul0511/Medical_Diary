import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../store/authStore";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

export type ApiError = {
  error_code: string;
  message: string;
  request_id?: string;
  status: number;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const getApiBaseUrl = (): string => {
  const url = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const API_BASE_URL = getApiBaseUrl();

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((entry) => {
    if (error || !token) {
      entry.reject(error);
      return;
    }

    entry.resolve(token);
  });
  failedQueue = [];
}

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as (Partial<ApiError> & { detail?: string }) | undefined;

  return {
    error_code: data?.error_code ?? `HTTP_${status || "NETWORK"}`,
    message: data?.message ?? data?.detail ?? error.message ?? "Request failed",
    request_id: data?.request_id,
    status,
  };
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  config.headers.set("Authorization", `Bearer ${token}`);
}

function removeContentTypeHeader(config: InternalAxiosRequestConfig) {
  config.headers.delete("Content-Type");
}

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().accessToken;

      if (token) {
        setAuthorizationHeader(config, token);
      }

      if (config.data instanceof FormData) {
        removeContentTypeHeader(config);
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(normalizeError(error)),
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;

      if (!originalRequest) {
        return Promise.reject(normalizeError(error));
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh
      ) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              setAuthorizationHeader(originalRequest, token);
              return instance(originalRequest);
            })
            .catch((queueError) => Promise.reject(queueError));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newAccessToken = await useAuthStore.getState().refreshSession();
          useAuthStore.getState().setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);
          setAuthorizationHeader(originalRequest, newAccessToken);
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          await useAuthStore.getState().logout();
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.assign("/login");
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(normalizeError(error));
    },
  );

  return instance;
};

export const apiClient = createAxiosInstance();