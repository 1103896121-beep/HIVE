import redis.asyncio as redis
from app.core.config import settings
import time
from typing import List

class RedisClient:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        self.client = redis.Redis(connection_pool=self.pool)

    async def close(self):
        await self.client.aclose()

    async def update_presence(self, user_id: str, squad_id: str = None):
        """更新用户最后活跃时间 (心跳)"""
        now = int(time.time())
        # 更新全局活跃状态
        await self.client.zadd("presence:global", {user_id: now})
        # 如果提供了小队ID，同步更新小队范围内的活跃状态
        if squad_id:
            await self.client.zadd(f"presence:squad:{squad_id}", {user_id: now})
            
    async def get_squad_presence(self, squad_id: str, timeout_sec: int = 15) -> List[str]:
        """获取小队内有效在线用户列表（自动清除超时的僵尸用户）"""
        now = int(time.time())
        cutoff = now - timeout_sec
        key = f"presence:squad:{squad_id}"
        await self.client.zremrangebyscore(key, "-inf", cutoff)
        online_users = await self.client.zrange(key, 0, -1)
        return online_users

    async def get_global_presence(self, timeout_sec: int = 20) -> set:
        """获取平台上所有有效在线的用户的集合"""
        now = int(time.time())
        cutoff = now - timeout_sec
        key = "presence:global"
        await self.client.zremrangebyscore(key, "-inf", cutoff)
        online_users = await self.client.zrange(key, 0, -1)
        return set(online_users)

    async def get_global_presence_count(self, timeout_sec: int = 20) -> int:
        """获取平台上当前在线用户总数"""
        now = int(time.time())
        cutoff = now - timeout_sec
        key = "presence:global"
        await self.client.zremrangebyscore(key, "-inf", cutoff)
        return await self.client.zcard(key)

    async def send_nudge(self, sender_id: str, receiver_id: str):
        """发送轻推提醒 (放入目标用户的专属接收队列)"""
        key = f"nudge:{receiver_id}"
        await self.client.rpush(key, sender_id)
        # 默认 nudge 消息在队列里只存活 60 秒，若接收方掉线太久则忽略
        await self.client.expire(key, 60)
        
    async def pop_nudges(self, user_id: str) -> List[str]:
        """提取并清空当前用户收到的所有新型轻推"""
        key = f"nudge:{user_id}"
        # 一次性读出所有
        nudges = await self.client.lrange(key, 0, -1)
        if nudges:
            # 阅后即焚
            await self.client.delete(key)
        return nudges

redis_client = RedisClient()
