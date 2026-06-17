import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("medical_diary")


def send_email_sync(email: str, subject: str, body: str, is_html: bool = False) -> None:
    """
    Gửi email thông qua Resend HTTP API thay vì SMTP để tránh bị chặn trên môi trường Cloud (Railway).
    Hàm này được chạy ngầm qua BackgroundTasks của FastAPI.
    """
    resend_api_key = settings.RESEND_API_KEY

    if not resend_api_key:
        logger.info(f"[MOCK EMAIL] Gửi đến {email}: {subject} | Body: {body.replace(chr(10), ' | ')}")
        return

    # Xác định địa chỉ gửi đi. Nếu dùng Resend Sandbox thì bắt buộc dùng onboarding@resend.dev
    resend_from = "onboarding@resend.dev"
    if settings.SMTP_FROM and settings.SMTP_FROM != "noreply@medicaldiary.com":
        resend_from = settings.SMTP_FROM

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "from": f"Medical Diary <{resend_from}>",
        "to": [email],
        "subject": subject,
        "html" if is_html else "text": body
    }

    try:
        # Gửi request HTTP POST đến Resend API
        with httpx.Client(timeout=10.0) as client:
            response = client.post("https://api.resend.com/emails", headers=headers, json=payload)
            response.raise_for_status()
            res_data = response.json()
            logger.info(f"Successfully sent email via Resend to {email}. Message ID: {res_data.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send email via Resend to {email}: {str(e)}")
