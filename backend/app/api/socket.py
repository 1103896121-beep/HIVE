from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.websocket import manager
from uuid import UUID
import json

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: UUID, squad_id: UUID = None):
    await manager.connect(user_id, websocket, squad_id)
    try:
        # 广播用户进入消息
        if squad_id:
            await manager.broadcast_to_squad(
                {"type": "USER_JOINED", "user_id": str(user_id)},
                squad_id,
                exclude_user=user_id
            )
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理 Nudge (轻推)
            if message.get("type") == "NUDGE":
                receiver_id = UUID(message.get("receiver_id"))
                await manager.send_personal_message(
                    {"type": "NUDGE_RECEIVED", "sender_id": str(user_id)},
                    receiver_id
                )
            
            # 处理 PONG (心跳响应)
            elif message.get("type") == "PONG":
                pass # 仅用于维持 recv 循环，表明链路畅通
    
    except WebSocketDisconnect:
        manager.disconnect(user_id, squad_id)
        if squad_id:
            await manager.broadcast_to_squad(
                {"type": "USER_LEFT", "user_id": str(user_id)},
                squad_id
            )
