import { mockDatabases, DatabaseStatus } from "@/data/mockData";

export type BackupType = "full" | "incremental" | "differential" | "wal" | "logical";
export type BackupStatus = "success" | "running" | "failed" | "scheduled" | "warning";

export interface BackupJob {
  id: string;
  databaseId: string;
  databaseName: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: string;
  sizeMB: number;
  compressedSizeMB: number;
  destination: string;
  retentionDays: number;
  schedule: string;
  lastVerified?: string;
  verificationStatus?: "ok" | "failed" | "pending";
  error?: string;
  pitrEnabled: boolean;
}

export interface BackupPolicy {
  id: string;
  databaseId: string;
  databaseName: string;
  fullSchedule: string;
  incrementalSchedule: string;
  walArchiving: boolean;
  retentionDays: number;
  destination: string;
  compression: boolean;
  encryption: boolean;
  verifyAfterBackup: boolean;
  enabled: boolean;
}

const destinations = ["/backup/nfs/prod", "/backup/s3/prod", "/backup/local/staging", "/backup/nfs/analytics"];
const schedules = ["0 2 * * *", "0 3 * * 0", "*/30 * * * *", "0 4 * * 1,4", "0 1 * * *"];

export const mockBackupJobs: BackupJob[] = [];

// Generate backup history
const now = new Date();
for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
  for (let dbIdx = 0; dbIdx < Math.min(mockDatabases.length, 8); dbIdx++) {
    const db = mockDatabases[dbIdx];
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(2 + dbIdx % 3, Math.floor(Math.random() * 60));

    const isRecent = dayOffset === 0;
    const isFailed = Math.random() < 0.05;
    const isRunning = isRecent && dbIdx === 0;
    const type: BackupType = dayOffset % 7 === 0 ? "full" : "incremental";
    const sizeMB = type === "full" ? Math.round(Math.random() * 50000 + 5000) : Math.round(Math.random() * 5000 + 200);
    const durationMin = type === "full" ? Math.round(Math.random() * 120 + 15) : Math.round(Math.random() * 20 + 2);

    mockBackupJobs.push({
      id: `bkp-${dayOffset}-${dbIdx}`,
      databaseId: db.id,
      databaseName: db.name,
      type,
      status: isRunning ? "running" : isFailed ? "failed" : "success",
      startedAt: date.toISOString(),
      finishedAt: isRunning ? undefined : new Date(date.getTime() + durationMin * 60000).toISOString(),
      duration: isRunning ? undefined : `${durationMin}min`,
      sizeMB,
      compressedSizeMB: Math.round(sizeMB * (0.3 + Math.random() * 0.2)),
      destination: destinations[dbIdx % destinations.length],
      retentionDays: type === "full" ? 30 : 7,
      schedule: schedules[dbIdx % schedules.length],
      lastVerified: !isRunning && !isFailed ? new Date(date.getTime() + (durationMin + 10) * 60000).toISOString() : undefined,
      verificationStatus: isFailed ? "failed" : isRunning ? "pending" : "ok",
      error: isFailed ? "pg_dump: error: connection to server failed: timeout expired" : undefined,
      pitrEnabled: dbIdx < 4,
    });
  }
}

// Add WAL archiving entries
for (let i = 0; i < 5; i++) {
  const db = mockDatabases[i];
  const d = new Date(now);
  d.setMinutes(d.getMinutes() - i * 30);
  mockBackupJobs.push({
    id: `wal-${i}`,
    databaseId: db.id,
    databaseName: db.name,
    type: "wal",
    status: "success",
    startedAt: d.toISOString(),
    finishedAt: new Date(d.getTime() + 5000).toISOString(),
    duration: "5s",
    sizeMB: Math.round(Math.random() * 64 + 16),
    compressedSizeMB: Math.round(Math.random() * 20 + 5),
    destination: "/backup/wal-archive",
    retentionDays: 7,
    schedule: "continuous",
    pitrEnabled: true,
  });
}

// Sort by most recent
mockBackupJobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

export const mockBackupPolicies: BackupPolicy[] = mockDatabases.slice(0, 10).map((db, i) => ({
  id: `policy-${i}`,
  databaseId: db.id,
  databaseName: db.name,
  fullSchedule: "0 2 * * 0",
  incrementalSchedule: "0 2 * * 1-6",
  walArchiving: i < 5,
  retentionDays: i < 3 ? 30 : 14,
  destination: destinations[i % destinations.length],
  compression: true,
  encryption: i < 5,
  verifyAfterBackup: i < 7,
  enabled: i !== 9,
}));

// Summary stats
export function getBackupSummary(jobs: BackupJob[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayJobs = jobs.filter((j) => new Date(j.startedAt) >= today);
  const last24h = jobs.filter((j) => new Date(j.startedAt) >= new Date(Date.now() - 86400000));

  return {
    totalJobs: jobs.length,
    todayJobs: todayJobs.length,
    running: jobs.filter((j) => j.status === "running").length,
    failed24h: last24h.filter((j) => j.status === "failed").length,
    success24h: last24h.filter((j) => j.status === "success").length,
    totalSizeMB: last24h.reduce((a, j) => a + j.sizeMB, 0),
    compressedSizeMB: last24h.reduce((a, j) => a + j.compressedSizeMB, 0),
    pitrDatabases: new Set(jobs.filter((j) => j.pitrEnabled).map((j) => j.databaseId)).size,
    unverified: jobs.filter((j) => j.verificationStatus === "pending" || j.verificationStatus === "failed").length,
  };
}
