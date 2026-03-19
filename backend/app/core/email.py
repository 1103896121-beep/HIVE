import logging
from typing import Any, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_reset_password_email(email_to: str, code: str) -> bool:
    """
    发送密码重置验证码。
    在生产环境下，此处应通过 aiosmtplib 或外部 API (如 SendGrid) 发送真实邮件。
    目前在控制台打印验证码以供预览。
    """
    subject = f"[{settings.PROJECT_NAME}] Your Password Reset Code"
    message = f"Your password reset code is: {code}. It will expire in 10 minutes."
    
    # TODO: 后续对接真实的 SMTP 服务器
    # if settings.SMTP_HOST and settings.SMTP_USER:
    #     await real_send_email_logic(email_to, subject, message)
    
    logger.info(f"EMAIL MOCK: To={email_to}, Subject={subject}, Message={message}")
    logger.info(f"\n--- [EMAIL SENT] ---\nTo: {email_to}\nCode: {code}\n---------------------\n")
    return True
