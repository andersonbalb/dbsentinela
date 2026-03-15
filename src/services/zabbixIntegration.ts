/**
 * Zabbix Integration Service - Real Zabbix API via Edge Function proxy
 * Credentials are now fetched server-side — only instance_id is sent for existing instances.
 */

import { supabase } from "@/integrations/supabase/client";

// Types
export interface ZabbixConnectionConfig {
  url: string;
  apiUser: string;
  apiToken: string;
  version?: string;
}

export interface ZabbixValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface ZabbixSyncResult {
  success: boolean;
  hostsFound: number;
  metricsCollected: number;
  timestamp: string;
  error?: string;
  metrics?: ZabbixHostMetric[];
}

export interface ZabbixHostMetric {
  host_id: string;
  hostname: string;
  cpu: number;
  memory: number;
  disk: number;
  status: "online" | "warning" | "critical" | "offline";
  last_check: string;
}

// Validation
export function validateZabbixConfig(config: ZabbixConnectionConfig): ZabbixValidationResult {
  const errors: Record<string, string> = {};

  if (!config.url || config.url.trim() === "") {
    errors.url = "URL é obrigatória";
  } else if (!/^https:\/\/.+/.test(config.url)) {
    errors.url = "URL deve usar HTTPS (https://...)";
  } else if (config.url.endsWith("/")) {
    errors.url = "URL não deve terminar com /";
  }

  if (!config.apiUser || config.apiUser.trim() === "") {
    errors.apiUser = "Usuário da API é obrigatório";
  } else if (config.apiUser.length < 3) {
    errors.apiUser = "Usuário deve ter pelo menos 3 caracteres";
  }

  if (!config.apiToken || config.apiToken.trim() === "") {
    errors.apiToken = "Token da API é obrigatório";
  } else if (config.apiToken.length < 8) {
    errors.apiToken = "Token deve ter pelo menos 8 caracteres";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Test connection for an UNSAVED instance (inline credentials sent once for testing).
 * For saved instances, use testZabbixConnectionById.
 */
export async function testZabbixConnection(
  config: ZabbixConnectionConfig
): Promise<{ success: boolean; version?: string; hostsCount?: number; error?: string }> {
  const validation = validateZabbixConfig(config);
  if (!validation.valid) {
    return { success: false, error: "Configuração inválida" };
  }

  const { data, error } = await supabase.functions.invoke("zabbix-proxy", {
    body: {
      action: "test",
      url: config.url,
      api_user: config.apiUser,
      api_token: config.apiToken,
    },
  });

  if (error) {
    return { success: false, error: "Erro ao testar conexão" };
  }
  return data;
}

/**
 * Test connection for a SAVED instance (credentials fetched server-side).
 */
export async function testZabbixConnectionById(
  instanceId: string
): Promise<{ success: boolean; version?: string; hostsCount?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("zabbix-proxy", {
    body: {
      action: "test",
      instance_id: instanceId,
    },
  });

  if (error) {
    return { success: false, error: "Erro ao testar conexão" };
  }
  return data;
}

/**
 * Sync metrics for a SAVED instance (credentials fetched server-side).
 */
export async function syncZabbixMetricsById(
  instanceId: string
): Promise<ZabbixSyncResult> {
  const { data, error } = await supabase.functions.invoke("zabbix-proxy", {
    body: {
      action: "sync",
      instance_id: instanceId,
    },
  });

  if (error) {
    return {
      success: false,
      hostsFound: 0,
      metricsCollected: 0,
      timestamp: new Date().toISOString(),
      error: "Erro ao sincronizar métricas",
    };
  }
  return data;
}
