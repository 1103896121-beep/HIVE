import logging
from typing import Any, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

import aiosmtplib
from email.message import EmailMessage

async def send_reset_password_email(email_to: str, code: str) -> bool:
    """
    发送密码重置验证码。
    使用 aiosmtplib 通过配置的 SMTP 服务器发送真实邮件。
    """
    subject = f"[{settings.PROJECT_NAME}] Your Password Reset Code"
    content = f"Your password reset code is: {code}. It will expire in 10 minutes."
    
    # 构造邮件消息
    message = EmailMessage()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to
    message["Subject"] = subject
    message.set_content(content)

    # 模拟环境或配置不足时退回到日志打印
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP configuration is incomplete. Falling back to log print.")
        logger.info(f"EMAIL MOCK: To={email_to}, Message={content}. Reset Code: {code}")
        return True

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_TLS,
        )
        logger.info(f"Successfully sent reset email to {email_to}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email_to}: {e}")
        return False
