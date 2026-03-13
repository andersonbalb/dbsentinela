import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncZabbixMetrics, ZabbixSyncResult } from "@/services/zabbixIntegration";

export interface SyncStatus {
  isRunning: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  results: ZabbixSyncResult[];
  totalHosts: number;
  totalMetrics: number;
  errors: string[];
}

interface ZabbixInstanceRow {
  id: string;
  url: string;
  api_user: string;
  api_token: string;
  version: string | null;
  status: string;
}

interface UseZabbixSyncOptions {
  intervalMinutes?: number;
  enabled?: boolean;
}

export const useZabbixSync = ({ intervalMinutes = 5, enabled = true }: UseZabbixSyncOptions = {}) => {
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
    // Fetch connected instances from DB
    const { data: instances, error: fetchError } = await supabase
      .from("zabbix_instances")
      .select("id, url, api_user, api_token, version, status")
      .eq("status", "connected");

    if (fetchError || !instances || instances.length === 0) return;

    setStatus((prev) => ({ ...prev, isRunning: true, errors: [] }));

    const results: ZabbixSyncResult[] = [];
    const errors: string[] = [];

    for (const inst of instances as ZabbixInstanceRow[]) {
      try {
        const result = await syncZabbixMetrics({
          url: inst.url,
          apiUser: inst.api_user,
          apiToken: inst.api_token,
          version: inst.version || undefined,
        });
        results.push(result);

        if (result.success && result.metrics) {
          // Save metrics to DB
          for (const metric of result.metrics) {
            await supabase.from("zabbix_host_metrics").insert({
              instance_id: inst.id,
              host_id: metric.host_id,
              hostname: metric.hostname,
              cpu: metric.cpu,
              memory: metric.memory,
              disk: metric.disk,
              status: metric.status,
              last_check: metric.last_check,
            });
          }

          // Update instance
          await supabase
            .from("zabbix_instances")
            .update({
              last_sync: new Date().toISOString(),
              hosts_monitored: result.hostsFound,
            })
            .eq("id", inst.id);
        }

        if (!result.success && result.error) {
          errors.push(`${inst.url}: ${result.error}`);
        }
      } catch (e) {
        errors.push(`${inst.url}: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
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
  }, [intervalMinutes]);

  useEffect(() => {
    if (!enabled) return;

    runSync();

    intervalRef.current = setInterval(runSync, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, intervalMinutes, runSync]);

  return { ...status, runSync };
};
