import { useState, useEffect, useCallback } from "react";

export const useAutoRefresh = (intervalSeconds = 30) => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      setCountdown(intervalSeconds);
      setRefreshKey((k) => k + 1);
    }, 800);
  }, [intervalSeconds]);

  useEffect(() => {
    // Initial load
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          triggerRefresh();
          return intervalSeconds;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [intervalSeconds, triggerRefresh]);

  return { lastUpdated, isRefreshing, countdown, refreshKey, triggerRefresh };
};
