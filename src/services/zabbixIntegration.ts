/**
 * Zabbix Integration Skill - Reusable service for Zabbix API integration
 * Handles connection, sync, validation, and encryption of credentials.
 */

// AES-256 encryption using Web Crypto API
const ENCRYPTION_KEY_NAME = "dbsentinela_zbx_key";

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const exported = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encrypted: string): Promise<string> {
  try {
    const key = await getOrCreateKey();
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return encrypted; // Return as-is if decryption fails (legacy unencrypted)
  }
}

// Zabbix API Types
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
}

export interface ZabbixHostMetric {
  hostId: string;
  hostname: string;
  cpu: number;
  memory: number;
  disk: number;
  status: "online" | "warning" | "critical" | "offline";
  lastCheck: string;
}

// Validation
export function validateZabbixConfig(config: ZabbixConnectionConfig): ZabbixValidationResult {
  const errors: Record<string, string> = {};

  if (!config.url || config.url.trim() === "") {
    errors.url = "URL é obrigatória";
  } else if (!/^https?:\/\/.+/.test(config.url)) {
    errors.url = "URL deve começar com http:// ou https://";
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

// Simulated Zabbix API connection test
export async function testZabbixConnection(config: ZabbixConnectionConfig): Promise<{ success: boolean; version?: string; error?: string }> {
  // Simulate API call delay
  await new Promise((r) => setTimeout(r, 1500));
  const validation = validateZabbixConfig(config);
  if (!validation.valid) {
    return { success: false, error: "Configuração inválida" };
  }
  // Simulate 90% success rate
  if (Math.random() > 0.1) {
    return { success: true, version: config.version || "6.4.8" };
  }
  return { success: false, error: "Timeout ao conectar com o servidor Zabbix" };
}

// Simulated sync of metrics from Zabbix
export async function syncZabbixMetrics(config: ZabbixConnectionConfig): Promise<ZabbixSyncResult> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
  const validation = validateZabbixConfig(config);
  if (!validation.valid) {
    return { success: false, hostsFound: 0, metricsCollected: 0, timestamp: new Date().toISOString(), error: "Config inválida" };
  }
  const hostsFound = Math.floor(Math.random() * 15) + 3;
  return {
    success: true,
    hostsFound,
    metricsCollected: hostsFound * 6,
    timestamp: new Date().toISOString(),
  };
}

// Simulated host metrics retrieval
export function getSimulatedHostMetrics(hostCount: number): ZabbixHostMetric[] {
  return Array.from({ length: hostCount }, (_, i) => ({
    hostId: `zbx-host-${1000 + i}`,
    hostname: `srv-${i + 1}.internal`,
    cpu: Math.round(Math.random() * 80 + 5),
    memory: Math.round(Math.random() * 70 + 15),
    disk: Math.round(Math.random() * 60 + 20),
    status: (["online", "online", "online", "warning", "online"] as const)[i % 5],
    lastCheck: new Date().toISOString(),
  }));
}
