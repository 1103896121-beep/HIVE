import os
import requests
from sqlalchemy.ext.asyncio import AsyncSession
from app.repository.user_repository import UserRepository
from uuid import UUID
from datetime import datetime, timedelta
from typing import Dict, Any

class SubscriptionService:
    @staticmethod
    async def verify_apple_receipt(db: AsyncSession, user_id: UUID, receipt_data: str) -> Dict[str, Any]:
        """
        校验 Apple 支付凭据并更新用户订阅。
        实现上自动处理了沙箱(Sandbox)与生产环境的自动切换 (Status 21007/21008)，
        确保护审人员在沙箱环境下也能正常测试付费流程。
        """
        # 生产环境下应从环境变量中读取
        APPLE_SHARED_SECRET = os.getenv("APPLE_SHARED_SECRET")
        if APPLE_SHARED_SECRET:
            APPLE_SHARED_SECRET = APPLE_SHARED_SECRET.strip()
        
        # 使用 sys.stderr 确保在 Docker logs 中可见
        import sys
        
        # 根据 Apple 产品 ID 匹配订阅时长
        PRODUCT_DURATION = {
            "com.hive.sub.monthly": 30,
            "com.hive.sub.quarterly": 90,
            "com.hive.sub.annual": 365,
            "com.hive.lifetime": 36500
        }

        # 生产环境应先请求 Apple 生产验证服务器
        validation_url = "https://buy.itunes.apple.com/verifyReceipt"
        payload = {
            "receipt-data": receipt_data,
        }
        if APPLE_SHARED_SECRET:
             payload["password"] = APPLE_SHARED_SECRET
             print(f"[APPLE-IAP] Payload password set (Length: {len(APPLE_SHARED_SECRET)}, First4: {APPLE_SHARED_SECRET[:4]})", file=sys.stderr)
        else:
             print("[APPLE-IAP] APPLE_SHARED_SECRET is MISSING in environment", file=sys.stderr)

        print(f"[APPLE-IAP] Sending request to {validation_url}", file=sys.stderr)
        
        try:
            response = requests.post(validation_url, json=payload, timeout=15)
            data = response.json()
            print(f"[APPLE-IAP] HTTP Status: {response.status_code}, Apple Status: {data.get('status')}", file=sys.stderr)
            print(f"[APPLE-IAP] Apple RAW response: {data}", file=sys.stderr)
        except Exception as e:
            print(f"[APPLE-IAP] Request failed: {str(e)}", file=sys.stderr)
            raise ValueError(f"Failed to connect to Apple: {str(e)}")

        if data.get("status") == 21007:
            # 沙箱收据发送到了生产环境，降级到沙箱
             validation_url = "https://sandbox.itunes.apple.com/verifyReceipt"
             print(f"[APPLE-IAP] Falling back to Sandbox: {validation_url}", file=sys.stderr)
             response = requests.post(validation_url, json=payload, timeout=15)
             data = response.json()
             print(f"[APPLE-IAP] Apple Sandbox RAW response: {data}", file=sys.stderr)

        if data.get("status") != 0:
            print(f"[APPLE-IAP] Final Verification FAILED with status: {data.get('status')}", file=sys.stderr)
            raise ValueError(f"Invalid receipt. Apple status: {data.get('status')}")

        # 收据包含一个应用内购数组。
        # 查找最新的一笔交易。
        receipt = data.get("receipt", {})
        in_app_purchases = receipt.get("in_app", [])
        
        if not in_app_purchases:
            raise ValueError("No purchases found in receipt")

        latest_purchase = sorted(in_app_purchases, key=lambda p: float(p.get("purchase_date_ms", 0)), reverse=True)[0]
        product_id = latest_purchase.get("product_id")

        if product_id not in PRODUCT_DURATION:
             raise ValueError(f"Unknown product ID: {product_id}")

        days_to_add = PRODUCT_DURATION[product_id]

        # 使用 Repository 更新数据库
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
             raise ValueError("User not found")

        current_expiry = user.subscription_end_at if user.subscription_end_at and user.subscription_end_at > datetime.utcnow() else datetime.utcnow()
        user.subscription_end_at = current_expiry + timedelta(days=days_to_add)
        
        await UserRepository.commit(db)
        return {"status": "success", "expires_at": user.subscription_end_at}

    @staticmethod
    async def subscribe(db: AsyncSession, user_id: UUID, plan: str) -> Dict[str, Any]:
        """
        手动更新订阅（通常用于测试或通过管理员渠道）。
        通过映射预定义时长，简化了有效期计算逻辑。
        """
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
            raise ValueError("User not found")
            
        PLAN_DURATION = {
            "monthly": 30,
            "quarterly": 90,
            "yearly": 365,
            "lifetime": 36500
        }
        
        if plan not in PLAN_DURATION:
            raise ValueError("Invalid plan type")
            
        days = PLAN_DURATION[plan]
        current_expiry = user.subscription_end_at if user.subscription_end_at and user.subscription_end_at > datetime.utcnow() else datetime.utcnow()
        user.subscription_end_at = current_expiry + timedelta(days=days)
        
        await UserRepository.commit(db)
        return {"status": "success", "expires_at": user.subscription_end_at}
