from supabase import create_client, Client

from app.core.config import settings

# Service-role client: bypasses RLS, dùng cho mọi thao tác server-side
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)
