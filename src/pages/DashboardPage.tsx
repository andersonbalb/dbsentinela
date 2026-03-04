import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { mockDatabases, DatabaseInstance, DatabaseStatus } from "@/data/mockData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import {
  Database, Server, Cpu, HardDrive, Activity,
  Wifi, WifiOff, AlertTriangle, TrendingUp, Users
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const statusConfig: Record<DatabaseStatus, { label: string; dotClass: string; color: string }> = {
  online: { label: "Online", dotClass: "status-dot-online", color: "text-success" },
  warning: { label: "Warning", dotClass: "status-dot-warning", color: "text-warning" },
  critical: { label: "Critical", dotClass: "status-dot-critical", color: "text-destructive" },
  offline: { label: "Offline", dotClass: "status-dot-offline", color: "text-muted-foreground" },
};

const MetricBar = ({ label, value, max, unit, warn, crit }: { label: string; value: number; max?: number; unit?: string; warn?: number; crit?: number }) => {
  const pct = max ? (value / max) * 100 : value;
  const color = crit && pct >= crit ? "bg-destructive" : warn && pct >= warn ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}{unit || "%"}{max ? `/${max}` : ""}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { lastUpdated, isRefreshing, countdown, refreshKey, triggerRefresh } = useAutoRefresh(30);
  const [filter, setFilter] = useState<DatabaseStatus | "all">("all");

  const databases = useMemo(() => {
    // Simulate slight data changes on refresh
    return mockDatabases.map((db) => ({
      ...db,
      cpu: Math.min(100, Math.max(0, db.cpu + Math.round((Math.random() - 0.5) * 10))),
      memory: Math.min(100, Math.max(0, db.memory + Math.round((Math.random() - 0.5) * 5))),
      connections: Math.max(0, db.connections + Math.round((Math.random() - 0.5) * 20)),
      tps: Math.max(0, db.tps + Math.round((Math.random() - 0.5) * 100)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = filter === "all" ? databases : databases.filter((d) => d.status === filter);

  const summary = useMemo(() => ({
    total: databases.length,
    online: databases.filter((d) => d.status === "online").length,
    warning: databases.filter((d) => d.status === "warning").length,
    critical: databases.filter((d) => d.status === "critical").length,
    offline: databases.filter((d) => d.status === "offline").length,
    avgCpu: Math.round(databases.reduce((a, d) => a + d.cpu, 0) / databases.length),
    totalConnections: databases.reduce((a, d) => a + d.connections, 0),
    totalTps: databases.reduce((a, d) => a + d.tps, 0),
  }), [databases]);

  const summaryCards = [
    { label: "Total de Bancos", value: summary.total, icon: Database, accent: "text-primary" },
    { label: "Online", value: summary.online, icon: Wifi, accent: "text-success" },
    { label: "Warning", value: summary.warning, icon: AlertTriangle, accent: "text-warning" },
    { label: "Critical", value: summary.critical, icon: AlertTriangle, accent: "text-destructive" },
    { label: "CPU Médio", value: `${summary.avgCpu}%`, icon: Cpu, accent: "text-info" },
    { label: "Total Conexões", value: summary.totalConnections, icon: Users, accent: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral de {databases.length} instâncias</p>
        </div>
        <div className="flex items-center gap-4">
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
          <button onClick={triggerRefresh} className="px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass rounded-lg p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.accent}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "online", "warning", "critical", "offline"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors font-mono ${
              filter === s
                ? "bg-primary/15 text-primary neon-border"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Database Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${isRefreshing ? "opacity-60" : ""} transition-opacity`}>
        {filtered.map((db, i) => (
          <DatabaseCard key={db.id} db={db} index={i} />
        ))}
      </div>
    </div>
  );
};

const DatabaseCard = ({ db, index }: { db: DatabaseInstance; index: number }) => {
  const cfg = statusConfig[db.status];
  const navigate = useNavigate();
  return (
    <div
      className="glass rounded-lg p-5 hover:neon-border transition-all animate-slide-up cursor-pointer"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => navigate(`/databases/${db.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cfg.dotClass} />
          <div>
            <h3 className="font-semibold font-mono text-sm">{db.name}</h3>
            <p className="text-xs text-muted-foreground">{db.engine} {db.version}</p>
          </div>
        </div>
        <span className={`text-xs font-mono ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <MetricBar label="CPU" value={db.cpu} warn={70} crit={90} />
        <MetricBar label="Memória" value={db.memory} warn={75} crit={90} />
        <MetricBar label="Conexões" value={db.connections} max={db.maxConnections} unit="" warn={80} crit={95} />
        <MetricBar label="Disco" value={db.diskUsage} warn={80} crit={95} />
      </div>

      {/* Footer stats */}
      <div className="flex justify-between mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <span className="font-mono flex items-center gap-1">
          <Activity className="w-3 h-3" /> {db.tps} TPS
        </span>
        <span className="font-mono flex items-center gap-1">
          <HardDrive className="w-3 h-3" /> {db.iops} IOPS
        </span>
        <span className="font-mono">Cache: {db.cacheHitRatio}%</span>
      </div>

      {db.replicationLag !== undefined && (
        <div className="mt-2 text-xs text-warning font-mono flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Rep. Lag: {db.replicationLag}ms
        </div>
      )}

      <p className="text-xs text-muted-foreground/50 mt-2 font-mono">{db.host}:{db.port} • Up: {db.uptime}</p>
    </div>
  );
};

export default DashboardPage;
