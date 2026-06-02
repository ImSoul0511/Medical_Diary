# Supabase Realtime — Huong dan tich hop Thong bao Tuc thoi

## Tong quan

He thong su dung **2 kenh thong bao song song**:

1. **Supabase Realtime (Push):** Day thong bao tuc thoi toi user dang online qua WebSocket. Frontend ket noi TRUC TIEP toi Supabase Cloud, KHONG di qua backend.
2. **Email SMTP (Always-on):** Gui email thong bao bo sung bat ke user online hay offline. Backend xu ly qua `BackgroundTasks`.

## Cach hoat dong

```
Backend INSERT vao bang `notifications`
    |
    v
Supabase Cloud tu dong phat hien row moi
    |
    v
Frontend (dang subscribe qua WebSocket) nhan payload ngay lap tuc
```

- Backend chi can INSERT du lieu vao bang `notifications`. Khong can lam gi them.
- Supabase Realtime tu dong broadcast toi tat ca client dang subscribe.
- RLS policy dam bao user chi nhan thong bao cua chinh minh.

## Code mau tich hop (Frontend)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe de lang nghe thong bao moi
const channel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${currentUserId}`
  }, (payload) => {
    // payload.new chua du lieu notification vua INSERT
    // Hien thi toast/popup ngay lap tuc tren giao dien
    const notif = payload.new
    showToast(notif.title, notif.message)
  })
  .subscribe()

// Khi user roi trang hoac logout, huy subscribe
// channel.unsubscribe()
```

## Notification Types (tham chieu tu backend)

| Type | Khi nao duoc tao | Tao boi |
|---|---|---|
| `access_request` | Bac si gui yeu cau truy cap ho so | `doctors/service.py` → `request_access()` |
| `prescription_new` | Bac si ke don thuoc moi | (chua tao notification cho type nay) |
| `prescription_reminder` | Den gio uong thuoc | `prescriptions/service.py` → `send_scheduled_reminders()` va `notifications/service.py` → `list_notifications()` (on-demand) |
| `emergency_token_expired` | QR token het han | (chua tao notification cho type nay) |

## Endpoint bo sung (Polling fallback)

Khi user mo trang thong bao hoac khi can tai lai danh sach:
- `GET /notifications` — Lay toan bo danh sach thong bao
- `PATCH /notifications/{id}/read` — Danh dau da doc

## Dieu kien tien quyet

- File SQL `backend/supabase/policies/008_enable_realtime_notifications.sql` PHAI duoc chay tren Supabase Dashboard truoc khi tinh nang nay hoat dong.
- Frontend PHAI su dung Supabase JS Client voi `SUPABASE_ANON_KEY` (khong dung service_role key).
