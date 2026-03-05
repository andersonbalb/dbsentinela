import { useState, useMemo } from "react";
import { mockBackupJobs, mockBackupPolicies, getBackupSummary, BackupJob, BackupStatus, BackupType } from "@/data/mockBackupData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import {
  HardDrive, CheckCircle2, XCircle, Clock, Loader2, Shield, Archive,
  Filter, ChevronDown, ChevronUp, Download, RotateCcw, CalendarClock, AlertTriangle
} from "lucide-react";

const statusConfig: Record<BackupStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  success: { label: "Sucesso", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  running: { label: "Em execução", color: "text-info", bg: "bg-info/10", icon: Loader2 },
  failed: { label: "Falhou", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
  scheduled: { label: "Agendado", color: "text-muted-foreground", bg: "bg-secondary", icon: CalendarClock },
  warning: { label: "Warning", color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
};

const typeLabels: Record<BackupType, { label: string; color: string }> = {
  full: { label: "Full", color: "text-primary" },
  incremental: { label: "Incremental", color: "text-info" },
  differential: { label: "Differential", color: "text-warning" },
  wal: { label: "WAL", color: "text-success" },
  logical: { label: "Logical", color: "text-muted-foreground" },
};

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

const BackupsPage = () => {
  const { lastUpdated, isRefreshing, countdown } = useAutoRefresh(30);
  const [filterStatus, setFilterStatus] = useState<BackupStatus | "all">("all");
  const [filterType, setFilterType] = useState<BackupType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);

  const summary = useMemo(() => getBackupSummary(mockBackupJobs), []);

  const filtered = useMemo(() => {
    return mockBackupJobs.filter((j) => {
      if (filterStatus !== "all" && j.status !== filterStatus) return false;
      if (filterType !== "all" && j.type !== filterType) return false;
      return true;
    });
  }, [filterStatus, filterType]);

  const summaryCards = [
    { label: "Jobs Hoje", value: summary.todayJobs, icon: Archive, color: "text-primary" },
    { label: "Em Execução", value: summary.running, icon: Loader2, color: "text-info" },
    { label: "Sucesso 24h", value: summary.success24h, icon: CheckCircle2, color: "text-success" },
    { label: "Falhas 24h", value: summary.failed24h, icon: XCircle, color: "text-destructive" },
    { label: "Volume 24h", value: formatSize(summary.totalSizeMB), icon: HardDrive, color: "text-warning" },
    { label: "Comprimido", value: formatSize(summary.compressedSizeMB), icon: Download, color: "text-info" },
    { label: "PITR Ativo", value: `${summary.pitrDatabases} DBs`, icon: RotateCcw, color: "text-primary" },
    { label: "Não Verificados", value: summary.unverified, icon: Shield, color: summary.unverified > 0 ? "text-warning" : "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Backups</h1>
          <p className="text-muted-foreground text-sm">Monitoramento e rastreabilidade de backups</p>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="glass rounded-lg p-3 animate-slide-up">
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button onClick={() => setShowPolicies(false)} className={`px-4 py-2 text-sm rounded-md font-mono transition-colors ${!showPolicies ? "bg-primary/15 text-primary neon-border" : "bg-secondary text-muted-foreground"}`}>
          Histórico de Jobs
        </button>
        <button onClick={() => setShowPolicies(true)} className={`px-4 py-2 text-sm rounded-md font-mono transition-colors ${showPolicies ? "bg-primary/15 text-primary neon-border" : "bg-secondary text-muted-foreground"}`}>
          Políticas de Backup
        </button>
      </div>

      {!showPolicies ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1.5">
              {(["all", "success", "running", "failed"] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterStatus === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {s === "all" ? "Todos" : statusConfig[s].label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex gap-1.5">
              {(["all", "full", "incremental", "wal", "logical"] as const).map((t) => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterType === t ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {t === "all" ? "Todos" : typeLabels[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Job List */}
          <div className="glass rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/50 text-xs font-mono text-muted-foreground">
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Banco</div>
              <div className="col-span-1">Tipo</div>
              <div className="col-span-2">Início</div>
              <div className="col-span-1">Duração</div>
              <div className="col-span-1">Tamanho</div>
              <div className="col-span-1">Comprimido</div>
              <div className="col-span-1">Verificação</div>
              <div className="col-span-2">Destino</div>
            </div>

            {filtered.slice(0, 50).map((job, i) => {
              const sc = statusConfig[job.status];
              const tc = typeLabels[job.type];
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === job.id;
              return (
                <div key={job.id}>
                  <div
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-secondary/30 cursor-pointer transition-colors items-center text-xs animate-slide-up"
                    style={{ animationDelay: `${i * 10}ms` }}
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  >
                    <div className="col-span-1 flex items-center gap-1.5">
                      <StatusIcon className={`w-3.5 h-3.5 ${sc.color} ${job.status === "running" ? "animate-spin-slow" : ""}`} />
                    </div>
                    <div className="col-span-2 font-mono font-semibold">{job.databaseName}</div>
                    <div className={`col-span-1 font-mono ${tc.color}`}>{tc.label}</div>
                    <div className="col-span-2 font-mono text-muted-foreground">{new Date(job.startedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="col-span-1 font-mono">{job.duration || "..."}</div>
                    <div className="col-span-1 font-mono">{formatSize(job.sizeMB)}</div>
                    <div className="col-span-1 font-mono text-muted-foreground">{formatSize(job.compressedSizeMB)}</div>
                    <div className="col-span-1">
                      {job.verificationStatus === "ok" && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                      {job.verificationStatus === "failed" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                      {job.verificationStatus === "pending" && <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                      {!job.verificationStatus && <span className="text-muted-foreground">—</span>}
                    </div>
                    <div className="col-span-2 font-mono text-muted-foreground truncate">{job.destination}</div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 animate-slide-up text-xs space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><span className="text-muted-foreground block">ID</span><span className="font-mono">{job.id}</span></div>
                        <div><span className="text-muted-foreground block">Schedule (cron)</span><span className="font-mono">{job.schedule}</span></div>
                        <div><span className="text-muted-foreground block">Retenção</span><span className="font-mono">{job.retentionDays} dias</span></div>
                        <div><span className="text-muted-foreground block">PITR</span><span className={`font-mono ${job.pitrEnabled ? "text-success" : "text-muted-foreground"}`}>{job.pitrEnabled ? "Ativo" : "Inativo"}</span></div>
                        <div><span className="text-muted-foreground block">Início</span><span className="font-mono">{new Date(job.startedAt).toLocaleString("pt-BR")}</span></div>
                        <div><span className="text-muted-foreground block">Fim</span><span className="font-mono">{job.finishedAt ? new Date(job.finishedAt).toLocaleString("pt-BR") : "Em andamento"}</span></div>
                        <div><span className="text-muted-foreground block">Taxa compressão</span><span className="font-mono">{job.sizeMB > 0 ? Math.round((1 - job.compressedSizeMB / job.sizeMB) * 100) : 0}%</span></div>
                        {job.lastVerified && <div><span className="text-muted-foreground block">Verificado em</span><span className="font-mono">{new Date(job.lastVerified).toLocaleString("pt-BR")}</span></div>}
                      </div>
                      {job.error && (
                        <div className="bg-destructive/10 rounded p-2 mt-2">
                          <p className="font-mono text-destructive">{job.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Policies */
        <div className="space-y-3">
          {mockBackupPolicies.map((p, i) => (
            <div key={p.id} className={`glass rounded-lg p-4 animate-slide-up ${!p.enabled ? "opacity-50" : ""}`} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${p.enabled ? "bg-primary/10" : "bg-secondary"}`}>
                    <Archive className={`w-4 h-4 ${p.enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold font-mono text-sm">{p.databaseName}</h3>
                    <p className="text-xs text-muted-foreground">{p.destination}</p>
                  </div>
                </div>
                <span className={`text-xs font-mono ${p.enabled ? "text-success" : "text-muted-foreground"}`}>{p.enabled ? "Ativo" : "Inativo"}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                <div><span className="text-muted-foreground block">Full</span><span className="font-mono">{p.fullSchedule}</span></div>
                <div><span className="text-muted-foreground block">Incremental</span><span className="font-mono">{p.incrementalSchedule}</span></div>
                <div><span className="text-muted-foreground block">WAL Archive</span><span className={`font-mono ${p.walArchiving ? "text-success" : "text-muted-foreground"}`}>{p.walArchiving ? "Sim" : "Não"}</span></div>
                <div><span className="text-muted-foreground block">Retenção</span><span className="font-mono">{p.retentionDays}d</span></div>
                <div><span className="text-muted-foreground block">Compressão</span><span className={`font-mono ${p.compression ? "text-success" : ""}`}>{p.compression ? "Sim" : "Não"}</span></div>
                <div><span className="text-muted-foreground block">Criptografia</span><span className={`font-mono ${p.encryption ? "text-success" : "text-muted-foreground"}`}>{p.encryption ? "AES-256" : "Não"}</span></div>
                <div><span className="text-muted-foreground block">Verificação</span><span className={`font-mono ${p.verifyAfterBackup ? "text-success" : "text-muted-foreground"}`}>{p.verifyAfterBackup ? "Auto" : "Manual"}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackupsPage;
