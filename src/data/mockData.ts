import { Database, Server, AlertTriangle, Activity } from "lucide-react";

export type DatabaseStatus = "online" | "warning" | "critical" | "offline";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type DatabaseEngine = "PostgreSQL" | "MySQL" | "Oracle" | "SQL Server" | "MongoDB" | "MariaDB";

export interface DatabaseInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  engine: DatabaseEngine;
  version: string;
  status: DatabaseStatus;
  cpu: number;
  memory: number;
  connections: number;
  maxConnections: number;
  diskUsage: number;
  iops: number;
  uptime: string;
  replicationLag?: number;
  tps: number;
  cacheHitRatio: number;
}

export interface Alert {
  id: string;
  databaseId: string;
  databaseName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
}

export interface SlowQuery {
  id: string;
  databaseId: string;
  databaseName: string;
  query: string;
  duration: number;
  executionPlan: string;
  timestamp: string;
  user: string;
  rows: number;
}

export interface ThresholdConfig {
  databaseId: string;
  databaseName: string;
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  connectionsWarning: number;
  connectionsCritical: number;
  diskWarning: number;
  diskCritical: number;
}

const engines: DatabaseEngine[] = ["PostgreSQL", "MySQL", "Oracle", "SQL Server", "MongoDB", "MariaDB"];
const statuses: DatabaseStatus[] = ["online", "online", "online", "warning", "online", "online", "critical", "online", "online", "online", "online", "online", "online", "warning", "online"];

export const mockDatabases: DatabaseInstance[] = Array.from({ length: 15 }, (_, i) => ({
  id: `db-${i + 1}`,
  name: [
    "prod-master", "prod-replica-01", "prod-replica-02", "staging-main",
    "analytics-dw", "logs-cluster", "auth-service", "payments-db",
    "inventory-db", "cms-content", "search-index", "cache-store",
    "reporting-db", "dev-sandbox", "dr-standby"
  ][i],
  host: `db${i + 1}.internal.corp`,
  port: [5432, 5432, 5432, 5432, 5432, 3306, 5432, 5432, 3306, 5432, 27017, 5432, 5432, 5432, 5432][i],
  engine: engines[i % engines.length],
  version: ["16.2", "16.2", "16.2", "16.1", "15.4", "8.0.36", "16.2", "16.2", "8.0.36", "16.1", "7.0", "16.2", "15.4", "16.2", "16.2"][i],
  status: statuses[i],
  cpu: Math.round(Math.random() * 80 + (statuses[i] === "critical" ? 20 : 0)),
  memory: Math.round(Math.random() * 70 + (statuses[i] === "warning" ? 20 : 10)),
  connections: Math.round(Math.random() * 200 + 10),
  maxConnections: 500,
  diskUsage: Math.round(Math.random() * 60 + 20),
  iops: Math.round(Math.random() * 5000 + 200),
  uptime: `${Math.floor(Math.random() * 365)}d ${Math.floor(Math.random() * 24)}h`,
  replicationLag: i > 0 && i < 3 ? Math.round(Math.random() * 500) : undefined,
  tps: Math.round(Math.random() * 2000 + 50),
  cacheHitRatio: Math.round((Math.random() * 10 + 90) * 100) / 100,
}));

const alertMessages = [
  { metric: "CPU", msg: "CPU usage above threshold" },
  { metric: "Memory", msg: "Memory usage critically high" },
  { metric: "Connections", msg: "Connection pool near limit" },
  { metric: "Disk", msg: "Disk space running low" },
  { metric: "Replication", msg: "Replication lag detected" },
  { metric: "Locks", msg: "Long-running lock detected" },
];

export const mockAlerts: Alert[] = Array.from({ length: 30 }, (_, i) => {
  const db = mockDatabases[i % mockDatabases.length];
  const am = alertMessages[i % alertMessages.length];
  const severity: AlertSeverity = i < 5 ? "critical" : i < 15 ? "warning" : "info";
  const status: AlertStatus = i < 8 ? "active" : i < 20 ? "acknowledged" : "resolved";
  const d = new Date();
  d.setHours(d.getHours() - i * 2);
  return {
    id: `alert-${i + 1}`,
    databaseId: db.id,
    databaseName: db.name,
    severity,
    status,
    message: am.msg,
    metric: am.metric,
    value: Math.round(Math.random() * 100),
    threshold: 80,
    createdAt: d.toISOString(),
    acknowledgedAt: status !== "active" ? new Date(d.getTime() + 300000).toISOString() : undefined,
    resolvedAt: status === "resolved" ? new Date(d.getTime() + 900000).toISOString() : undefined,
    acknowledgedBy: status !== "active" ? "admin" : undefined,
  };
});

const sampleQueries = [
  "SELECT u.*, p.* FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.last_login > NOW() - INTERVAL '30 days' ORDER BY u.created_at DESC LIMIT 1000",
  "UPDATE orders SET status = 'processed' WHERE created_at < NOW() - INTERVAL '7 days' AND status = 'pending'",
  "SELECT COUNT(*), DATE_TRUNC('hour', created_at) FROM events GROUP BY DATE_TRUNC('hour', created_at) ORDER BY 2 DESC",
  "DELETE FROM session_logs WHERE expired_at < NOW() - INTERVAL '90 days'",
  "SELECT p.name, SUM(oi.quantity * oi.price) as revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.name HAVING SUM(oi.quantity * oi.price) > 10000",
  "WITH RECURSIVE tree AS (SELECT * FROM categories WHERE parent_id IS NULL UNION ALL SELECT c.* FROM categories c JOIN tree t ON c.parent_id = t.id) SELECT * FROM tree",
];

export const mockSlowQueries: SlowQuery[] = Array.from({ length: 20 }, (_, i) => {
  const db = mockDatabases[i % mockDatabases.length];
  const d = new Date();
  d.setMinutes(d.getMinutes() - i * 15);
  return {
    id: `sq-${i + 1}`,
    databaseId: db.id,
    databaseName: db.name,
    query: sampleQueries[i % sampleQueries.length],
    duration: Math.round((Math.random() * 30 + 1) * 1000) / 1000,
    executionPlan: `Seq Scan on ${["users", "orders", "events", "session_logs", "products", "categories"][i % 6]} (cost=${Math.round(Math.random() * 10000)}.00..${Math.round(Math.random() * 50000)}.00 rows=${Math.round(Math.random() * 100000)} width=${Math.round(Math.random() * 500)})`,
    timestamp: d.toISOString(),
    user: ["app_user", "analytics", "admin", "replication"][i % 4],
    rows: Math.round(Math.random() * 500000),
  };
});

export const mockThresholds: ThresholdConfig[] = mockDatabases.map((db) => ({
  databaseId: db.id,
  databaseName: db.name,
  cpuWarning: 70,
  cpuCritical: 90,
  memoryWarning: 75,
  memoryCritical: 90,
  connectionsWarning: 80,
  connectionsCritical: 95,
  diskWarning: 80,
  diskCritical: 95,
}));

// Alert trend data for charts
export const generateAlertTrend = (days: number) => {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split("T")[0],
      critical: Math.floor(Math.random() * 5),
      warning: Math.floor(Math.random() * 12 + 2),
      info: Math.floor(Math.random() * 20 + 5),
    });
  }
  return data;
};
