from fastapi import WebSocket
from typing import Dict, List, Set
from uuid import UUID
import json

class ConnectionManager:
    def __init__(self):
        # 存储在线用户的 WebSocket 连接: {user_id: WebSocket}
        self.active_connections: Dict[UUID, WebSocket] = {}
        # 存储小队的在线用户: {squad_id: {user_id1, user_id2}}
        self.squad_rooms: Dict[UUID, Set[UUID]] = {}

    async def connect(self, user_id: UUID, websocket: WebSocket, squad_id: UUID = None):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        if squad_id:
            if squad_id not in self.squad_rooms:
                self.squad_rooms[squad_id] = set()
            self.squad_rooms[squad_id].add(user_id)

    def disconnect(self, user_id: UUID, squad_id: UUID = None):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if squad_id and squad_id in self.squad_rooms:
            self.squad_rooms[squad_id].discard(user_id)

    async def send_personal_message(self, message: dict, user_id: UUID):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_squad(self, message: dict, squad_id: UUID, exclude_user: UUID = None):
        if squad_id in self.squad_rooms:
            dead_users = []
            for user_id in self.squad_rooms[squad_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_text(json.dumps(message))
                    except Exception:
                        dead_users.append(user_id)
            
            for d_user in dead_users:
                self.disconnect(d_user, squad_id)

    async def ping_all(self):
        """Send a ping to all active connections to keep them alive"""
        dead_users = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json({"type": "PING"})
            except Exception:
                dead_users.append(user_id)
        
        for d_user in dead_users:
            self.disconnect(d_user)

manager = ConnectionManager()
