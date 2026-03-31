import os
from uuid import UUID
import requests
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, ProcessedTransaction
from datetime import datetime, timedelta
from typing import Dict, Any
from app.repository.user_repository import UserRepository

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
            
        if not APPLE_SHARED_SECRET:
            # 明确抛出 500 错误，以防因为空密钥引发难以排查的 Apple 21004 报错
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="Apple shared secret (APPLE_SHARED_SECRET) is not configured on the server")
        
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
            print(f"[APPLE-IAP] Sending receipt to {validation_url} (length: {len(receipt_data)})", file=sys.stderr)
            response = requests.post(validation_url, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"[APPLE-IAP] Request failed: {str(e)}", file=sys.stderr)
            # 不要直接抛出 ValueError，使用 HTTPException 以便前端能接收到详细错误码
            from fastapi import HTTPException
            raise HTTPException(status_code=502, detail=f"Apple verification connection failed: {str(e)}")

        status = data.get("status")
        print(f"[APPLE-IAP] Apple response status: {status}", file=sys.stderr)
        
        if status != 0:
            # 如果是 21007，说明是 Sandbox 票据发到了 Production，需要重试 Sandbox URL
            if status == 21007:
                print("[APPLE-IAP] Status 21007: Retrying with Sandbox URL...", file=sys.stderr)
                try:
                    validation_url = "https://sandbox.itunes.apple.com/verifyReceipt"
                    response = requests.post(validation_url, json=payload, timeout=15)
                    data = response.json()
                    status = data.get("status")
                    print(f"[APPLE-IAP] Sandbox response status: {status}", file=sys.stderr)
                except Exception as e:
                    print(f"[APPLE-IAP] Sandbox request failed: {e}", file=sys.stderr)
                    from fastapi import HTTPException
                    raise HTTPException(status_code=502, detail="Apple sandbox verification failed")
            
            if status != 0:
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail=f"Apple Verification Failed: Status {status}")

        # 3. 获取用户并计算最远到期点 (幂等且累加逻辑)
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
             raise ValueError("User not found")
        
        # 确定试用期结束时间 (防御性校验 trial_start_at)
        t_start = user.trial_start_at or user.created_at or datetime.utcnow()
        trial_end = t_start + timedelta(days=7)
        
        print(f"[APPLE-IAP] User {user_id} | Trial Start: {t_start} | Trial End: {trial_end}", file=sys.stderr)
        
        receipt = data.get("receipt", {})
        # subscriptions should also check latest_receipt_info if available (requires shared secret)
        in_app_purchases = receipt.get("in_app", [])
        latest_info = data.get("latest_receipt_info", [])
        if isinstance(latest_info, list):
            in_app_purchases.extend(latest_info)
        
        # 排序并去重（通过 transaction_id）
        seen_tids = set()
        unique_purchases = []
        for p in in_app_purchases:
            tid = str(p.get("transaction_id"))
            if tid not in seen_tids:
                unique_purchases.append(p)
                seen_tids.add(tid)

        unique_purchases.sort(key=lambda x: float(x.get("purchase_date_ms", 0)))
        
        new_transactions_count = 0
        added_days_total = 0
        for p in unique_purchases:
            t_id = str(p.get("transaction_id"))
            p_id = p.get("product_id")
            
            if p_id not in PRODUCT_DURATION: 
                print(f"[APPLE-IAP] Unknown product_id: {p_id}", file=sys.stderr)
                continue
            
            # 幂等性检查：如果此交易已处理过，则跳过
            if await UserRepository.is_transaction_processed(db, t_id):
                continue

            # 确定累加基准：max(当前时间, 试用期结束, 当前已有的订阅结束时间)
            # NOTE: 关键修复点：确保 trial_end 始终参与 max 判定，保护 7 天试用不被覆盖
            now_utc = datetime.utcnow()
            current_expiry = user.subscription_end_at or datetime.min
            current_base = max(now_utc, trial_end, current_expiry)
            
            print(f"[APPLE-IAP] Calculation for TID {t_id}: now={now_utc}, trial_end={trial_end}, current_expiry={current_expiry} -> Base: {current_base}", file=sys.stderr)
            
            # 累加天数
            days = PRODUCT_DURATION[p_id]
            user.subscription_end_at = current_base + timedelta(days=days)
            added_days_total += days
            
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
            print(f"[APPLE-IAP] Processed TID {t_id} for {p_id} (+{days} days) -> New Expiry: {user.subscription_end_at}", file=sys.stderr)

        # 4. 更新前端显示的过期时间
        if new_transactions_count > 0:
            await UserRepository.commit(db)
        
        print(f"[APPLE-IAP] User {user_id} Final Summary: {new_transactions_count} new tx, +{added_days_total} days. Final Expiry: {user.subscription_end_at}", file=sys.stderr)
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
