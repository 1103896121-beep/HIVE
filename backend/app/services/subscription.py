import os
import requests
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, ProcessedTransaction
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
        
        # 1. 基础映射
        PRODUCT_DURATION = {
            "com.hive.sub.monthly": 30,
            "com.hive.sub.quarterly": 90,
            "com.hive.sub.annual": 365,
            "com.hive.lifetime": 30000  # Standardized to 30000 as per requirement
        }

        # 2. 生产环境验证请求
        validation_url = "https://buy.itunes.apple.com/verifyReceipt"
        payload = {"receipt-data": receipt_data}
        if APPLE_SHARED_SECRET:
             payload["password"] = APPLE_SHARED_SECRET
        
        try:
            response = requests.post(validation_url, json=payload, timeout=15)
            data = response.json()
            if data.get("status") == 21007:
                 validation_url = "https://sandbox.itunes.apple.com/verifyReceipt"
                 response = requests.post(validation_url, json=payload, timeout=15)
                 data = response.json()
            
            if data.get("status") != 0:
                 print(f"[APPLE-IAP] Final Verification FAILED: {data.get('status')}", file=sys.stderr)
                 raise ValueError(f"Invalid receipt. Apple status: {data.get('status')}")
        except Exception as e:
            print(f"[APPLE-IAP] Request failed: {str(e)}", file=sys.stderr)
            raise ValueError(f"Failed to connect to Apple: {str(e)}")

        # 3. 获取用户并计算最远到期点 (幂等且累加逻辑)
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
             raise ValueError("User not found")
        
        trial_end = user.trial_start_at + timedelta(days=7)
        
        receipt = data.get("receipt", {})
        in_app_purchases = receipt.get("in_app", [])
        
        # 排序：按购买时间从旧到新处理，确保累加顺序正确
        in_app_purchases.sort(key=lambda x: float(x.get("purchase_date_ms", 0)))
        
        new_transactions_count = 0
        for p in in_app_purchases:
            t_id = str(p.get("transaction_id"))
            p_id = p.get("product_id")
            
            if p_id not in PRODUCT_DURATION: continue
            
            # 幂等性检查：如果此交易已处理过，则跳过
            if await UserRepository.is_transaction_processed(db, t_id):
                continue

            # 确定累加基准：max(当前时间, 试用期结束, 当前已有的订阅结束时间)
            current_base = max(datetime.utcnow(), trial_end, user.subscription_end_at or datetime.min)
            
            # 累加天数
            days = PRODUCT_DURATION[p_id]
            user.subscription_end_at = current_base + timedelta(days=days)
            
            # 记录交易
            p_date_ms = float(p.get("purchase_date_ms", 0))
            new_tx = ProcessedTransaction(
                user_id=user.id,
                transaction_id=t_id,
                original_transaction_id=p.get("original_transaction_id", t_id),
                product_id=p_id,
                purchase_date=datetime.utcfromtimestamp(p_date_ms / 1000.0)
            )
            await UserRepository.record_transaction(db, new_tx)
            new_transactions_count += 1

        # 4. 更新数据库
        await UserRepository.commit(db)
        
        print(f"[APPLE-IAP] User {user_id} processed {new_transactions_count} new transactions. Final expiry: {user.subscription_end_at}", file=sys.stderr)
        return {
            "status": "success", 
            "expires_at": user.subscription_end_at,
            "new_transactions_count": new_transactions_count
        }

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
            "lifetime": 30000
        }
        
        if plan not in PLAN_DURATION:
            raise ValueError("Invalid plan type")
            
        days = PLAN_DURATION[plan]
        trial_end = user.trial_start_at + timedelta(days=7)
        # 同样采用顺延逻辑，确保模拟环境测试结果与线上一致
        current_base = max(datetime.utcnow(), trial_end, user.subscription_end_at or datetime.min)
        user.subscription_end_at = current_base + timedelta(days=days)
        
        await UserRepository.commit(db)
        return {"status": "success", "expires_at": user.subscription_end_at}
