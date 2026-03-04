import { DatabaseStatus } from "./mockData";

export interface ServerInstance {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: DatabaseStatus;
  cpuCores: number;
  cpuUsage: number;
  cpuModel: string;
  memoryTotal: number; // GB
  memoryUsed: number; // GB
  diskTotal: number; // GB
  diskUsed: number; // GB
  networkIn: number; // Mbps
  networkOut: number; // Mbps
  uptime: string;
  loadAvg: [number, number, number];
  databases: string[];
  zabbixHostId?: string;
}

export interface ZabbixInstance {
  id: string;
  name: string;
  url: string;
  apiUser: string;
  apiToken: string;
  version: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  hostsMonitored: number;
}

export interface TelegramConfig {
  id: string;
  name: string;
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyCritical: boolean;
  notifyWarning: boolean;
  notifyInfo: boolean;
}

const serverNames = [
  "srv-db-prod-01", "srv-db-prod-02", "srv-db-prod-03", "srv-db-staging-01",
  "srv-db-analytics-01", "srv-db-logs-01", "srv-db-auth-01", "srv-db-pay-01",
  "srv-db-inv-01", "srv-db-cms-01"
];

const osOptions = ["Ubuntu 22.04 LTS", "RHEL 9.2", "CentOS 8", "Debian 12", "Rocky Linux 9"];

export const mockServers: ServerInstance[] = Array.from({ length: 10 }, (_, i) => {
  const st: DatabaseStatus = i === 4 ? "warning" : i === 7 ? "critical" : "online";
  return {
    id: `srv-${i + 1}`,
    hostname: serverNames[i],
    ip: `10.0.${Math.floor(i / 5) + 1}.${10 + i}`,
    os: osOptions[i % osOptions.length],
    status: st,
    cpuCores: [16, 32, 32, 8, 64, 16, 16, 32, 16, 8][i],
    cpuUsage: Math.round(Math.random() * 60 + (st === "critical" ? 30 : st === "warning" ? 20 : 5)),
    cpuModel: i % 2 === 0 ? "Intel Xeon E5-2680 v4" : "AMD EPYC 7763",
    memoryTotal: [64, 128, 128, 32, 256, 64, 64, 128, 64, 32][i],
    memoryUsed: Math.round(([64, 128, 128, 32, 256, 64, 64, 128, 64, 32][i]) * (0.4 + Math.random() * 0.45)),
    diskTotal: [500, 1000, 1000, 250, 2000, 500, 500, 1000, 500, 250][i],
    diskUsed: Math.round(([500, 1000, 1000, 250, 2000, 500, 500, 1000, 500, 250][i]) * (0.3 + Math.random() * 0.5)),
    networkIn: Math.round(Math.random() * 500 + 10),
    networkOut: Math.round(Math.random() * 300 + 5),
    uptime: `${Math.floor(Math.random() * 365)}d ${Math.floor(Math.random() * 24)}h`,
    loadAvg: [
      Math.round((Math.random() * 4 + 0.5) * 100) / 100,
      Math.round((Math.random() * 3 + 0.3) * 100) / 100,
      Math.round((Math.random() * 2 + 0.2) * 100) / 100,
    ] as [number, number, number],
    databases: [
      ["prod-master"], ["prod-replica-01", "prod-replica-02"], ["prod-replica-02"], ["staging-main"],
      ["analytics-dw"], ["logs-cluster"], ["auth-service"], ["payments-db"],
      ["inventory-db"], ["cms-content"]
    ][i],
    zabbixHostId: `zbx-host-${1000 + i}`,
  };
});

export const mockZabbixInstances: ZabbixInstance[] = [
  {
    id: "zbx-1",
    name: "Zabbix Produção",
    url: "https://zabbix-prod.empresa.com",
    apiUser: "api_monitor",
    apiToken: "••••••••••••••••",
    version: "6.4.8",
    status: "connected",
    lastSync: new Date(Date.now() - 120000).toISOString(),
    hostsMonitored: 10,
  },
  {
    id: "zbx-2",
    name: "Zabbix Staging",
    url: "https://zabbix-stg.empresa.com",
    apiUser: "api_monitor",
    apiToken: "••••••••••••••••",
    version: "6.4.5",
    status: "connected",
    lastSync: new Date(Date.now() - 300000).toISOString(),
    hostsMonitored: 3,
  },
];

export const mockTelegramConfigs: TelegramConfig[] = [
  {
    id: "tg-1",
    name: "Alertas DBA Team",
    botToken: "••••••••••:•••••••••••••••••••",
    chatId: "-1001234567890",
    enabled: true,
    notifyCritical: true,
    notifyWarning: true,
    notifyInfo: false,
  },
];
