import logging
import smtplib
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("medical_diary")


def send_email_sync(email: str, subject: str, body: str, is_html: bool = False) -> None:
    """
    Gửi email đồng bộ qua SMTP.
    Hàm này được thiết kế để chạy trong BackgroundTasks của FastAPI (tự động chạy trong thread pool riêng).
    """
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM

    if not smtp_user or not smtp_password:
        logger.info(f"[MOCK EMAIL] Gửi đến {email}: {subject} | Body: {body.replace(chr(10), ' | ')}")
        return

    try:
        msg = MIMEText(body, "html" if is_html else "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = email

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, [email], msg.as_string())
        logger.info(f"Successfully sent email to {email} with subject: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
