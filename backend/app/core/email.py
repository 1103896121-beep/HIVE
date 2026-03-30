import logging
from typing import Any, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_reset_password_email(email_to: str, code: str) -> bool:
    """
    发送密码重置验证码。
    优先使用 Resend API 发送，若未配置则回退到日志打印。
    """
    subject = f"[{settings.PROJECT_NAME}] Your Password Reset Code"
    content = f"Your password reset code is: {code}. It will expire in 10 minutes."
    
    # 1. 优先使用 Resend API
    if settings.RESEND_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"{settings.EMAILS_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
                        "to": [email_to],
                        "subject": subject,
                        "text": content,
                    },
                    timeout=10.0
                )
                if response.status_code in (200, 201):
                    logger.info(f"Successfully sent reset email via Resend to {email_to}")
                    return True
                else:
                    logger.error(f"Resend API failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Error calling Resend API: {e}")

    # 2. 模拟环境或配置不足时退回到日志打印
    logger.warning("Email service not fully configured or failed. Falling back to log print.")
    logger.info(f"EMAIL MOCK: To={email_to}, Message={content}. Reset Code: {code}")
    return True
