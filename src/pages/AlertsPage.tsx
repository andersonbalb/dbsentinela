import { useState, useMemo } from "react";
import { mockAlerts, Alert, AlertSeverity, AlertStatus, generateAlertTrend } from "@/data/mockData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import { Bell, CheckCircle, Eye, AlertTriangle, Info, XCircle, Filter } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const severityConfig: Record<AlertSeverity, { icon: typeof Bell; color: string; bg: string }> = {
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  info: { icon: Info, color: "text-info", bg: "bg-info/10" },
};

const statusLabels: Record<AlertStatus, string> = {
  active: "Ativo",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
};

const AlertsPage = () => {
  const { lastUpdated, isRefreshing, countdown } = useAutoRefresh(30);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [trendPeriod, setTrendPeriod] = useState<7 | 30>(7);

  const trendData = useMemo(() => generateAlertTrend(trendPeriod), [trendPeriod]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterStatus]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "acknowledged" as AlertStatus, acknowledgedAt: new Date().toISOString(), acknowledgedBy: "admin" } : a
      )
    );
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "resolved" as AlertStatus, resolvedAt: new Date().toISOString() } : a
      )
    );
  };

  const summary = {
    active: alerts.filter((a) => a.status === "active").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Alertas</h1>
          <p className="text-muted-foreground text-sm">
            {summary.active} ativos • {summary.critical} críticos
          </p>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
      </div>

      {/* Trend Chart */}
      <div className="glass rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold font-mono text-sm">Tendência de Alertas</h2>
          <div className="flex gap-2">
            {([7, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTrendPeriod(p)}
                className={`px-3 py-1 text-xs rounded font-mono ${
                  trendPeriod === p ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 10% 50%)" }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 10% 50%)" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220 18% 10%)",
                border: "1px solid hsl(220 15% 18%)",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="critical" stackId="1" stroke="hsl(0 72% 55%)" fill="hsl(0 72% 55% / 0.3)" name="Crítico" />
            <Area type="monotone" dataKey="warning" stackId="1" stroke="hsl(38 92% 55%)" fill="hsl(38 92% 55% / 0.3)" name="Warning" />
            <Area type="monotone" dataKey="info" stackId="1" stroke="hsl(210 80% 55%)" fill="hsl(210 80% 55% / 0.3)" name="Info" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1.5">
          {(["all", "critical", "warning", "info"] as const).map((s) => (
            <button key={s} onClick={() => setFilterSeverity(s)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterSeverity === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex gap-1.5">
          {(["all", "active", "acknowledged", "resolved"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterStatus === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.map((alert) => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={`glass rounded-lg p-4 flex items-start gap-4 animate-slide-up ${alert.status === "resolved" ? "opacity-60" : ""}`}>
              <div className={`p-2 rounded-md ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono font-semibold ${cfg.color}`}>{alert.severity.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-mono text-muted-foreground">{alert.databaseName}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{alert.metric}</span>
                </div>
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Valor: {alert.value}% | Threshold: {alert.threshold}% | {new Date(alert.createdAt).toLocaleString("pt-BR")}
                </p>
                {alert.acknowledgedAt && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Reconhecido por {alert.acknowledgedBy} em {new Date(alert.acknowledgedAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {alert.status === "active" && (
                  <button onClick={() => handleAcknowledge(alert.id)} className="p-1.5 rounded bg-warning/10 text-warning hover:bg-warning/20 transition-colors" title="Reconhecer">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                {alert.status !== "resolved" && (
                  <button onClick={() => handleResolve(alert.id)} className="p-1.5 rounded bg-success/10 text-success hover:bg-success/20 transition-colors" title="Resolver">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPage;
