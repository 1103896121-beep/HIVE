import { useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../api/client';
import { triggerHaptic } from '../utils/haptics';

export type SocketMessage = {
    type: 'USER_JOINED' | 'USER_LEFT' | 'NUDGE_RECEIVED' | 'STATUS_UPDATE' | 'PING';
    user_id?: string;
    sender_id?: string;
    status?: string;
};

export function useHiveSocket(userId: string, squadId?: string) {
    const socketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<SocketMessage[]>([]);

    useEffect(() => {
        if (!userId) return;

        const url = `${WS_BASE_URL}/ws/${userId}${squadId ? `?squad_id=${squadId}` : ''}`;
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            const message: SocketMessage = JSON.parse(event.data);
            setMessages((prev: SocketMessage[]) => [...prev, message]);

            // 处理特定逻辑，例如收到轻推
            if (message.type === 'NUDGE_RECEIVED') {
                // 触发物理震动 (使用兼容层)
                triggerHaptic('notification');
            } else if (message.type === 'PING') {
                // 自动回复 PONG 以维持连接 (iOS 真实环境必需)
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'PONG' }));
                }
            }
        };

        ws.onclose = () => {
            // WebSocket 连接断开
        };

        return () => {
            ws.close();
        };
    }, [userId, squadId]);

    const sendNudge = (receiverId: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'NUDGE',
                receiver_id: receiverId
            }));
        }
    };

    return { messages, sendNudge };
}
