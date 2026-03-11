import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => void;
  children: ReactNode;
  isRefreshing?: boolean;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children, isRefreshing = false }: PullToRefreshProps) => {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefreshing, onRefresh]);

  if (!isMobile) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance > 0 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 48 : 0) : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-primary transition-transform ${isRefreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${progress * 360}deg)`, opacity: Math.max(progress, isRefreshing ? 1 : 0) }}
        />
        {pullDistance >= THRESHOLD && !isRefreshing && (
          <span className="text-xs text-primary ml-2 font-mono">Solte para atualizar</span>
        )}
        {isRefreshing && (
          <span className="text-xs text-primary ml-2 font-mono">Atualizando...</span>
        )}
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
