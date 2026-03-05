import { useState, useEffect, useCallback, useRef } from "react";
import { syncZabbixMetrics, ZabbixConnectionConfig, ZabbixSyncResult } from "@/services/zabbixIntegration";

interface UseZabbixSyncOptions {
  configs: ZabbixConnectionConfig[];
  intervalMinutes?: number;
  enabled?: boolean;
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  results: ZabbixSyncResult[];
  totalHosts: number;
  totalMetrics: number;
  errors: string[];
}

export const useZabbixSync = ({ configs, intervalMinutes = 5, enabled = true }: UseZabbixSyncOptions) => {
  const [status, setStatus] = useState<SyncStatus>({
    isRunning: false,
    lastSync: null,
    nextSync: null,
    results: [],
    totalHosts: 0,
    totalMetrics: 0,
    errors: [],
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async () => {
    if (configs.length === 0) return;
    setStatus((prev) => ({ ...prev, isRunning: true, errors: [] }));

    const results: ZabbixSyncResult[] = [];
    const errors: string[] = [];

    for (const config of configs) {
      try {
        const result = await syncZabbixMetrics(config);
        results.push(result);
        if (!result.success && result.error) {
          errors.push(`${config.url}: ${result.error}`);
        }
      } catch (e) {
        errors.push(`${config.url}: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
      }
    }

    const now = new Date();
    setStatus({
      isRunning: false,
      lastSync: now,
      nextSync: new Date(now.getTime() + intervalMinutes * 60 * 1000),
      results,
      totalHosts: results.reduce((a, r) => a + r.hostsFound, 0),
      totalMetrics: results.reduce((a, r) => a + r.metricsCollected, 0),
      errors,
    });
  }, [configs, intervalMinutes]);

  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    // Initial sync
    runSync();

    // Schedule recurring sync
    intervalRef.current = setInterval(runSync, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, configs.length, intervalMinutes, runSync]);

  return { ...status, runSync };
};
