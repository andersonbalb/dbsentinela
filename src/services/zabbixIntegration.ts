/**
 * Zabbix Integration Service - Real Zabbix API via Edge Function proxy
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

// Real Zabbix API calls via edge function
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
    return { success: false, error: error.message };
  }

  return data;
}

export async function syncZabbixMetrics(
  config: ZabbixConnectionConfig
): Promise<ZabbixSyncResult> {
  const validation = validateZabbixConfig(config);
  if (!validation.valid) {
    return {
      success: false,
      hostsFound: 0,
      metricsCollected: 0,
      timestamp: new Date().toISOString(),
      error: "Config inválida",
    };
  }

  const { data, error } = await supabase.functions.invoke("zabbix-proxy", {
    body: {
      action: "sync",
      url: config.url,
      api_user: config.apiUser,
      api_token: config.apiToken,
    },
  });

  if (error) {
    return {
      success: false,
      hostsFound: 0,
      metricsCollected: 0,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }

  return data;
}

// Legacy encryption functions (kept for backwards compatibility)
export async function encryptToken(plaintext: string): Promise<string> {
  return plaintext; // Tokens are now stored server-side with RLS protection
}

export async function decryptToken(encrypted: string): Promise<string> {
  return encrypted;
}
