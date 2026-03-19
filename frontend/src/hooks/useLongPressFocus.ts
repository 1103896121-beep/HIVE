import { useState, useRef, useEffect, useCallback } from 'react';

interface UseLongPressProps {
  activeSessionId: string | null;
  handleEndFocus: (reset: boolean) => Promise<any>;
  toggleFocus: () => Promise<void>;
  setSparkAward: React.Dispatch<React.SetStateAction<number | null>>;
  setSparkFadeOut: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLongPressFocus({
  activeSessionId, handleEndFocus, toggleFocus, setSparkAward, setSparkFadeOut
}: UseLongPressProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null);
  const holdExecutedRef = useRef(false);
  const actionCooldownRef = useRef(0);

  const handleEndFocusWithAward = useCallback(async (reset: boolean) => {
    // 立即上锁并记录时间
    actionCooldownRef.current = Date.now();
    setHoldStartTime(null);
    setHoldProgress(0);
    holdExecutedRef.current = true;
    
    try {
      const result = await handleEndFocus(reset);
      if (result && result.durationMins > 0) {
        setSparkAward(result.durationMins);
        setSparkFadeOut(false);
        // 1.5s 后开始淡出
        setTimeout(() => setSparkFadeOut(true), 1500);
        // 2.5s 后彻底移除
        setTimeout(() => {
          setSparkAward(null);
          setSparkFadeOut(false);
        }, 2500);
      }
    } finally {
      // 稍微延长锁的持续时间，确保所有 Pointer 事件流结束
      setTimeout(() => {
        holdExecutedRef.current = false; 
      }, 100);
    }
  }, [handleEndFocus, setSparkAward, setSparkFadeOut]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    // 只有在专注活跃时，长按才生效（展示进度条并准备结算）
    if (holdStartTime && activeSessionId) {
      interval = setInterval(() => {
        const elapsed = Date.now() - holdStartTime;
        const progress = Math.min(100, (elapsed / 1500) * 100);
        setHoldProgress(progress);
        
        if (progress >= 100) {
          handleEndFocusWithAward(true);
        }
      }, 50);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [holdStartTime, activeSessionId, handleEndFocusWithAward]);

  const handlePointerDown = () => {
    // 冷却中，拒绝任何新按下动作
    if (Date.now() - actionCooldownRef.current < 500) return;
    
    holdExecutedRef.current = false;
    // 无论是否在专注，都记录按下时间，以便判断“点击”
    setHoldStartTime(Date.now());
  };

  const toggleFocusWithCooldown = useCallback(async () => {
    if (Date.now() - actionCooldownRef.current < 500) return;
    await toggleFocus();
  }, [toggleFocus]);

  const handlePointerUp = () => {
    const elapsed = holdStartTime ? Date.now() - holdStartTime : 0;
    
    // 拦截 1: 如果长按结算已经由 useEffect 触发并在处理中
    if (holdExecutedRef.current) {
        setHoldStartTime(null);
        setHoldProgress(0);
        return;
    }

    // 拦截 2: 严格防止结算后的 500ms 内产生的任何松手事件
    if (Date.now() - actionCooldownRef.current < 500) {
        setHoldStartTime(null);
        setHoldProgress(0);
        return;
    }

    setHoldStartTime(null);
    setHoldProgress(0);

    // 逻辑判定：
    // 如果按下时间极短（< 300ms），则视为“点击”，触发开始/暂停
    if (elapsed > 0 && elapsed < 300) {
        toggleFocusWithCooldown();
    }
  };

  return { holdProgress, handlePointerDown, handlePointerUp };
}
