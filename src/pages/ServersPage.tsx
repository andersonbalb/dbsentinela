import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { mockServers, ServerInstance } from "@/data/mockServersData";
import { DatabaseStatus } from "@/data/mockData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import { Monitor, Cpu, MemoryStick, HardDrive, Network, ArrowDown, ArrowUp, Database } from "lucide-react";

const statusConfig: Record<DatabaseStatus, { label: string; dotClass: string; color: string }> = {
  online: { label: "Online", dotClass: "status-dot-online", color: "text-success" },
  warning: { label: "Warning", dotClass: "status-dot-warning", color: "text-warning" },
  critical: { label: "Critical", dotClass: "status-dot-critical", color: "text-destructive" },
  offline: { label: "Offline", dotClass: "status-dot-offline", color: "text-muted-foreground" },
};

const ProgressBar = ({ value, max, warn = 70, crit = 90 }: { value: number; max: number; warn?: number; crit?: number }) => {
  const pct = (value / max) * 100;
  const color = pct >= crit ? "bg-destructive" : pct >= warn ? "bg-warning" : "bg-primary";
  return (
    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
};

const ServersPage = () => {
  const navigate = useNavigate();
  const { lastUpdated, isRefreshing, countdown, refreshKey, triggerRefresh } = useAutoRefresh(30);
  const [filter, setFilter] = useState<DatabaseStatus | "all">("all");

  const servers = useMemo(() => {
    return mockServers.map((s) => ({
      ...s,
      cpuUsage: Math.min(100, Math.max(0, s.cpuUsage + Math.round((Math.random() - 0.5) * 8))),
      memoryUsed: Math.min(s.memoryTotal, Math.max(0, s.memoryUsed + Math.round((Math.random() - 0.5) * 4))),
      networkIn: Math.max(0, s.networkIn + Math.round((Math.random() - 0.5) * 50)),
      networkOut: Math.max(0, s.networkOut + Math.round((Math.random() - 0.5) * 30)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = filter === "all" ? servers : servers.filter((s) => s.status === filter);

  const summary = {
    total: servers.length,
    online: servers.filter((s) => s.status === "online").length,
    warning: servers.filter((s) => s.status === "warning").length,
    critical: servers.filter((s) => s.status === "critical").length,
    avgCpu: Math.round(servers.reduce((a, s) => a + s.cpuUsage, 0) / servers.length),
    totalMem: servers.reduce((a, s) => a + s.memoryTotal, 0),
    usedMem: servers.reduce((a, s) => a + s.memoryUsed, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Servidores</h1>
          <p className="text-muted-foreground text-sm">Monitoramento de {servers.length} servidores de banco de dados</p>
        </div>
        <div className="flex items-center gap-4">
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
          <button onClick={triggerRefresh} className="px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: summary.total, color: "text-primary", icon: Monitor },
          { label: "Online", value: summary.online, color: "text-success", icon: Monitor },
          { label: "Warning", value: summary.warning, color: "text-warning", icon: Monitor },
          { label: "Critical", value: summary.critical, color: "text-destructive", icon: Monitor },
          { label: "CPU Médio", value: `${summary.avgCpu}%`, color: "text-info", icon: Cpu },
        ].map((c) => (
          <div key={c.label} className="glass rounded-lg p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "online", "warning", "critical", "offline"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs rounded-md transition-colors font-mono ${filter === s ? "bg-primary/15 text-primary neon-border" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
            {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Server Cards */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${isRefreshing ? "opacity-60" : ""} transition-opacity`}>
        {filtered.map((srv, i) => {
          const cfg = statusConfig[srv.status];
          const memPct = Math.round((srv.memoryUsed / srv.memoryTotal) * 100);
          const diskPct = Math.round((srv.diskUsed / srv.diskTotal) * 100);
          return (
            <div key={srv.id} className="glass rounded-lg p-5 hover:neon-border transition-all animate-slide-up cursor-pointer" style={{ animationDelay: `${i * 30}ms` }} onClick={() => navigate(`/servers/${srv.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cfg.dotClass} />
                  <div>
                    <h3 className="font-semibold font-mono text-sm">{srv.hostname}</h3>
                    <p className="text-xs text-muted-foreground">{srv.ip} • {srv.os}</p>
                  </div>
                </div>
                <span className={`text-xs font-mono ${cfg.color}`}>{cfg.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* CPU */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">CPU</span>
                    <span className="text-xs font-mono ml-auto">{srv.cpuUsage}%</span>
                  </div>
                  <ProgressBar value={srv.cpuUsage} max={100} />
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{srv.cpuCores} cores • {srv.cpuModel.split(" ").slice(0, 3).join(" ")}</p>
                </div>

                {/* Memory */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MemoryStick className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Memória</span>
                    <span className="text-xs font-mono ml-auto">{memPct}%</span>
                  </div>
                  <ProgressBar value={srv.memoryUsed} max={srv.memoryTotal} />
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{srv.memoryUsed}GB / {srv.memoryTotal}GB</p>
                </div>

                {/* Disk */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <HardDrive className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Disco</span>
                    <span className="text-xs font-mono ml-auto">{diskPct}%</span>
                  </div>
                  <ProgressBar value={srv.diskUsed} max={srv.diskTotal} warn={75} crit={90} />
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{srv.diskUsed}GB / {srv.diskTotal}GB</p>
                </div>

                {/* Network */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Network className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Rede</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono flex items-center gap-1 text-success"><ArrowDown className="w-3 h-3" />{srv.networkIn} Mbps</span>
                    <span className="text-xs font-mono flex items-center gap-1 text-info"><ArrowUp className="w-3 h-3" />{srv.networkOut} Mbps</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <span className="font-mono">Load: {srv.loadAvg.join(", ")}</span>
                <span className="font-mono">Up: {srv.uptime}</span>
                <span className="flex items-center gap-1 font-mono"><Database className="w-3 h-3" />{srv.databases.length} DBs</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServersPage;
