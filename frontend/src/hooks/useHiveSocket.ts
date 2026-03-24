import { useEffect, useRef, useState } from 'react';
import { presenceService } from '../api/index';
import { triggerHaptic } from '../utils/haptics';

export type SocketMessage = {
    type: 'USER_JOINED' | 'USER_LEFT' | 'NUDGE_RECEIVED' | 'STATUS_UPDATE' | 'PING';
    user_id?: string;
    sender_id?: string;
    status?: string;
};

export function useHiveSocket(userId: string, squadId?: string) {
    const [messages, setMessages] = useState<SocketMessage[]>([]);
    const onlineUsersRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!userId) return;

        let isMounted = true;

        const poll = async () => {
            try {
                const data = await presenceService.heartbeat(squadId);
                if (!isMounted) return;

                const newOnline = new Set<string>(data.online_users || []);
                const oldOnline = onlineUsersRef.current;
                const newMessages: SocketMessage[] = [];

                // 探测新上线或进入小组的用户
                newOnline.forEach((uid: string) => {
                    if (!oldOnline.has(uid) && uid !== userId) {
                        newMessages.push({ type: 'USER_JOINED', user_id: uid });
                    }
                });

                // 探测离线或退出小组的用户
                oldOnline.forEach((uid: string) => {
                    if (!newOnline.has(uid) && uid !== userId) {
                        newMessages.push({ type: 'USER_LEFT', user_id: uid });
                    }
                });

                // 探测别人给我的轻推 (Nudge)
                if (data.nudges && data.nudges.length > 0) {
                    data.nudges.forEach((n: { sender_id: string }) => {
                        newMessages.push({ type: 'NUDGE_RECEIVED', sender_id: n.sender_id });
                        triggerHaptic('notification');
                    });
                }

                if (newMessages.length > 0) {
                    setMessages((prev: SocketMessage[]) => [...prev, ...newMessages]);
                }

                onlineUsersRef.current = newOnline;
            } catch (err) {
                console.error("Heartbeat error", err);
            }
        };

        // 立即发一次，然后每 10 秒轮询一次心跳
        poll();
        const timer = setInterval(poll, 10000);

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [userId, squadId]);

    const sendNudge = async (receiverId: string) => {
        try {
            await presenceService.nudge(receiverId);
        } catch (err) {
            console.error("Failed to send nudge", err);
        }
    };

    return { messages, sendNudge };
}
