# Manual API Integration Guide - Medical Diary Frontend

Ngay lap: 20/05/2026  
Pham vi: huong dan nguoi dung tu noi API thu cong sau khi UI ReactTS/Tailwind/Zustand da hoan thien  
Trang thai: tai lieu tham khao, khong phai code runtime

## 1. Muc tieu

Tai lieu nay mo ta cach ban co the tu noi frontend voi backend theo dung `ui_implementation.md`, nhung phan UI implementation hien tai van khong duoc tu dong noi API.

Nguyen tac:

- Backend routers/schemas la nguon uu tien cao nhat.
- Docs trong `.antigravity/backend/` chi la tham khao flow va endpoint du kien.
- Endpoint chua co trong backend phai duoc danh dau `planned` hoac `pending backend`.
- Neu backend code khac docs, frontend phai theo backend code.
- Moi viec lien quan Supabase SDK o frontend phai duoc confirm rieng truoc khi lam.

## 2. Viec can lam truoc khi noi API

1. Dam bao UI da build sach:

```powershell
npm run build
```

2. Tao endpoint inventory tu backend code hien tai:

```powershell
rg -n "@router\.(get|post|patch|put|delete)" backend\app\modules
rg -n "include_router|prefix=" backend\app
```

3. Doc router va schema cua tung module truoc khi noi:

```powershell
Get-Content backend\app\modules\auth\router.py
Get-Content backend\app\modules\auth\schemas.py
```

4. So sanh voi:

- `ui_implementation.md`
- `.antigravity/backend/API_FLOW.md`
- `.antigravity/backend/SYSTEM_DESIGN_SSOT.md`
- `.antigravity/backend/API.md`
- `.antigravity/backend/SCHEMAS.md`

5. Lap bang doi chieu rieng cho session dang lam:

```text
Module | Endpoint | Method | Backend status | Request schema | Response schema | UI owner | Note
```

## 3. File nen tao khi bat dau API phase

Chi tao cac file nay sau khi ban quyet dinh bat dau phase API:

```text
frontend/src/services/
|-- apiClient.ts
|-- auth.ts
|-- users.ts
|-- doctors.ts
|-- healthMetrics.ts
|-- diaries.ts
|-- consent.ts
|-- medicalRecords.ts
|-- prescriptions.ts
|-- emergency.ts
|-- admin.ts
`-- notifications.ts

frontend/src/constants/
`-- endpoints.ts
```

Khong tao cac file nay trong UI-only phase neu muc tieu van la mock/local state.

## 4. `endpoints.ts` manual pattern

Tach endpoint da implement va endpoint planned:

```ts
export const implementedEndpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    registerDoctor: "/auth/register-doctor",
    logout: "/auth/logout",
    sessions: "/auth/sessions",
    revokeAll: "/auth/revoke-all",
    revokeSelectedSession: "/auth/revoke-selected-session",
  },
  users: {
    me: "/users/me",
    privacy: "/users/privacy",
    export: "/users/me/export",
    accessHistory: "/users/me/access-history",
    searchDoctors: "/users/search-doctors",
  },
  consent: {
    accessRequests: "/consent/access-requests",
    history: "/consent/history",
    revokeDoctor: (doctorId: string) => `/consent/revoke/${doctorId}`,
    updateAccessRequest: (requestId: string) => `/consent/access-requests/${requestId}`,
  },
} as const;

export const plannedEndpoints = {
  emergency: {
    token: "/emergency/token",
    tokens: "/emergency/tokens",
    access: (token: string) => `/emergency/access/${token}`,
  },
} as const;
```

Quan trong:

- Khong copy endpoint tu docs neu backend router da co path khac.
- Neu router dung prefix trong `main.py`, tinh full path theo prefix that.
- Function endpoint phai encode param neu param lay tu user input.

## 5. `apiClient.ts` manual pattern

Dung mot wrapper duy nhat de chuan hoa request/response:

```ts
type ErrorResponse = {
  error_code: string;
  message: string;
  request_id: string;
};

type ApiClientOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: HeadersInit;
};

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ErrorResponse | null;
    throw error ?? {
      error_code: "UNKNOWN_ERROR",
      message: "Request failed",
      request_id: "",
    };
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

Sau khi tao wrapper, them xu ly:

- `401`: clear `authStore`, redirect login.
- `403`: hien "khong du quyen" hoac "chua duoc cap consent".
- `422`: map validation errors vao form fields.
- `StreamingResponse`: dung `response.blob()` rieng cho export file, khong dung JSON parser.
- `FormData`: khong set `Content-Type` bang tay.

## 6. Service layer manual order

Noi theo thu tu it rui ro truoc:

1. `auth.ts`: login, register, registerDoctor, logout.
2. `users.ts`: me, update profile, privacy.
3. `diaries.ts`: list/create/delete diary.
4. `healthMetrics.ts`: list/create metrics.
5. `consent.ts`: pending requests, approve/reject, history, revoke.
6. `prescriptions.ts`: list prescriptions, logs, update log status.
7. `medicalRecords.ts`: list records.
8. `doctors.ts`: search patients, request access.
9. `emergency.ts`: token management and public access.
10. `admin.ts`: pending doctors, approve/reject, audit logs.
11. `notifications.ts`: notifications only after backend behavior is clear.

## 7. Store conversion pattern

Khi doi tu local mock sang API:

1. Giu action local cho UI optimistic behavior neu can.
2. Tao async action rieng:

```ts
loadDiaries: async () => {
  set({ isLoading: true, error: null });
  try {
    const diaries = await diariesService.list();
    set({ diaries });
  } catch (error) {
    set({ error: normalizeApiError(error) });
  } finally {
    set({ isLoading: false });
  }
}
```

3. Khong de component goi `fetch` truc tiep.
4. Component chi goi store action hoac hook domain.
5. Moi store can co `isLoading`, `error`, va empty state ro rang.

## 8. Auth manual flow

Theo `API_FLOW.md`:

1. `POST /auth/register` cho patient.
2. Sau register patient, redirect ve login vi backend khong tra token.
3. `POST /auth/login`.
4. Luu token theo chien luoc MVP.
5. `GET /users/me`.
6. Redirect theo role:

```text
user -> /trang-chu
doctor -> /bac-si/tim-kiem
admin -> /quan-tri/phe-duyet-bac-si
```

Khuyen nghi:

- MVP co the dung memory + localStorage neu `ui_implementation.md` van chap nhan.
- Khi backend ho tro httpOnly cookie, chuyen sang cookie/session flow.
- Khong de token trong URL.

## 9. Module checklist

### Auth

- Check `backend/app/modules/auth/router.py`.
- Check `backend/app/modules/auth/schemas.py`.
- Register doctor dung `FormData`.
- Login response phai map dung `access_token`, `token_type`, `user.id`, `user.role`.

### Users

- `GET /users/me` load dashboard/profile/privacy.
- `PATCH /users/me` update profile.
- `PATCH /users/privacy` update QR public fields.
- Export file dung blob handler rieng.

### Consent

- `GET /consent/access-requests`.
- `PATCH /consent/access-requests/{request_id}`.
- `POST /consent/revoke/{doctor_id}`.
- `GET /consent/history`.
- Scope labels hien thi bang tieng Viet, constant names bang tieng Anh.

### Health Metrics

- Validate range theo backend schema.
- Query `start/end` dung ISO datetime.
- Charts khong assume missing fields luon co gia tri.

### Diaries

- Create/list/delete theo router/schema.
- Delete la soft-delete o backend, UI nen remove item khoi list sau success.

### Prescriptions

- Check actual router truoc khi code vi docs co the mo rong hon backend hien tai.
- Prescription logs update status phai dung enum backend chap nhan.

### Doctors

- Chi noi khi router/schema da implement ro.
- Neu endpoint van pending, UI giu mock/fallback va disable production submit.

### Emergency

- Public route khong yeu cau auth.
- Token/access behavior phai theo backend router thuc te.
- Khong tao Supabase direct query tu browser.

### Admin

- Check admin router/schema truoc khi tao service.
- Audit table phai handle pagination/filter neu backend co.
- Action approve/reject doctor phai match request schema.

## 10. Supabase SDK policy

Mac dinh frontend khong dung Supabase SDK. Frontend goi backend API qua `src/services/`.

Can confirm rieng truoc khi lam neu muon:

- Cai `@supabase/supabase-js`.
- Tao `src/services/supabaseClient.ts` hoac `src/lib/supabase.ts`.
- Dung `supabase.auth.*` truc tiep tren browser.
- Dung Supabase Realtime cho notifications.
- Upload certificate/attachments truc tiep len Supabase Storage.
- Goi Supabase RPC truc tiep tu frontend.
- Dua anon key hoac Supabase URL vao frontend env.

Ly do:

- Backend hien tai quan ly auth/session/security/RLS context.
- Direct browser SDK co the bypass service logic neu thiet ke chua ro.
- Storage upload va Realtime can policy, scope, rate limit, audit log ro rang.

Huong mac dinh nen dung:

- Certificate upload: gui multipart `register-doctor` ve backend.
- Attachments: gui qua backend endpoint neu co.
- Notifications: polling/backend endpoint truoc; Realtime chi sau khi confirm.
- Emergency QR: tao/access token qua backend.

## 11. Manual test checklist sau khi noi API

- Login sai password hien dung error.
- Login dung role redirect dung route.
- `GET /users/me` fail `401` clear session.
- Privacy save gui dung payload va update UI.
- Diary create/delete reflect UI sau success.
- Health metrics filter theo date khong crash khi rong data.
- Consent approve/reject gui dung action enum.
- Revoke doctor update active permissions.
- Register doctor FormData khong set JSON content type.
- Export file tai ve dung filename/content type.
- Public emergency route khong yeu cau login.
- Planned endpoints khong duoc goi trong production khi backend chua co.
- Moi error API hien `message` va neu co thi hien/log `request_id`.

## 12. Suggested commit split

Neu ban tu lam API phase, nen tach commit:

1. Add endpoint constants and API client.
2. Add auth services and auth store async actions.
3. Add user/profile/privacy services.
4. Add diary/metrics services.
5. Add consent/prescription/medical records services.
6. Add doctor/admin/emergency services only after backend router/schema are ready.
7. Add API tests and manual QA notes.

