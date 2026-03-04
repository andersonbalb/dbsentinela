import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockDatabases } from "@/data/mockData";
import { generateHistoricalData, TimePeriod, periodHours } from "@/data/historicalData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import { ArrowLeft, Cpu, MemoryStick, HardDrive, Activity, Users, Database, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartTooltipStyle = {
  backgroundColor: "hsl(220 18% 10%)",
  border: "1px solid hsl(220 15% 18%)",
  borderRadius: "8px",
  fontSize: 12,
};
const tickStyle = { fontSize: 10, fill: "hsl(215 10% 50%)" };
const gridStroke = "hsl(220 15% 18%)";

const MetricChart = ({ title, data, color, unit = "%", icon: Icon }: { title: string; data: { label: string; value: number }[]; color: string; unit?: string; icon: React.ElementType }) => {
  const current = data[data.length - 1]?.value ?? 0;
  const avg = Math.round((data.reduce((a, d) => a + d.value, 0) / data.length) * 100) / 100;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));

  return (
    <div className="glass rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold font-mono text-sm">{title}</h3>
        </div>
        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
          <span>Atual: <span className="text-foreground">{current}{unit}</span></span>
          <span>Média: <span className="text-foreground">{avg}{unit}</span></span>
          <span>Max: <span className="text-foreground">{max}{unit}</span></span>
          <span>Min: <span className="text-foreground">{min}{unit}</span></span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="label" tick={tickStyle} interval="preserveStartEnd" />
          <YAxis tick={tickStyle} domain={[0, "auto"]} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}${unit}`, title]} />
          <Area type="monotone" dataKey="value" stroke={color} fill={`${color}33`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const DatabaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lastUpdated, isRefreshing, countdown, refreshKey } = useAutoRefresh(30);
  const [period, setPeriod] = useState<TimePeriod>("24h");

  const db = mockDatabases.find((d) => d.id === id);

  const cpuData = useMemo(() => generateHistoricalData(periodHours[period], db?.cpu ?? 30, 10), [period, refreshKey]);
  const memData = useMemo(() => generateHistoricalData(periodHours[period], db?.memory ?? 50, 6), [period, refreshKey]);
  const diskData = useMemo(() => generateHistoricalData(periodHours[period], db?.diskUsage ?? 40, 2, 15, 95), [period, refreshKey]);
  const connData = useMemo(() => generateHistoricalData(periodHours[period], db?.connections ?? 50, 20, 0, db?.maxConnections ?? 500), [period, refreshKey]);
  const tpsData = useMemo(() => generateHistoricalData(periodHours[period], db?.tps ?? 500, 150, 0, 5000), [period, refreshKey]);
  const cacheData = useMemo(() => generateHistoricalData(periodHours[period], db?.cacheHitRatio ?? 95, 2, 80, 100), [period, refreshKey]);

  if (!db) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Banco de dados não encontrado</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm">Voltar</button>
      </div>
    );
  }

  const statusDot = db.status === "online" ? "status-dot-online" : db.status === "warning" ? "status-dot-warning" : db.status === "critical" ? "status-dot-critical" : "status-dot-offline";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className={statusDot} />
            <div>
              <h1 className="text-2xl font-bold font-mono neon-text">{db.name}</h1>
              <p className="text-muted-foreground text-sm">{db.engine} {db.version} • {db.host}:{db.port}</p>
            </div>
          </div>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["6h", "24h", "7d", "30d"] as TimePeriod[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs rounded-md font-mono transition-colors ${period === p ? "bg-primary/15 text-primary neon-border" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "CPU", value: `${db.cpu}%`, icon: Cpu, color: "text-primary" },
          { label: "Memória", value: `${db.memory}%`, icon: MemoryStick, color: "text-info" },
          { label: "Disco", value: `${db.diskUsage}%`, icon: HardDrive, color: "text-warning" },
          { label: "Conexões", value: `${db.connections}/${db.maxConnections}`, icon: Users, color: "text-primary" },
          { label: "TPS", value: db.tps.toString(), icon: Activity, color: "text-success" },
          { label: "Cache Hit", value: `${db.cacheHitRatio}%`, icon: TrendingUp, color: "text-info" },
        ].map((c) => (
          <div key={c.label} className="glass rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={`space-y-4 ${isRefreshing ? "opacity-60" : ""} transition-opacity`}>
        <MetricChart title="CPU Usage" data={cpuData} color="hsl(175, 80%, 50%)" icon={Cpu} />
        <MetricChart title="Memory Usage" data={memData} color="hsl(210, 80%, 55%)" icon={MemoryStick} />
        <MetricChart title="Disk Usage" data={diskData} color="hsl(38, 92%, 55%)" icon={HardDrive} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricChart title="Conexões Ativas" data={connData} color="hsl(175, 80%, 50%)" unit="" icon={Users} />
          <MetricChart title="Transações/s (TPS)" data={tpsData} color="hsl(145, 65%, 45%)" unit="" icon={Activity} />
        </div>
        <MetricChart title="Cache Hit Ratio" data={cacheData} color="hsl(210, 80%, 55%)" icon={TrendingUp} />
      </div>

      {/* DB Info */}
      <div className="glass rounded-lg p-5">
        <h3 className="font-semibold font-mono text-sm mb-3">Informações do Banco</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><span className="text-muted-foreground block">Engine</span><span className="font-mono">{db.engine} {db.version}</span></div>
          <div><span className="text-muted-foreground block">IOPS</span><span className="font-mono">{db.iops}</span></div>
          <div><span className="text-muted-foreground block">Uptime</span><span className="font-mono">{db.uptime}</span></div>
          {db.replicationLag !== undefined && <div><span className="text-muted-foreground block">Replication Lag</span><span className="font-mono text-warning">{db.replicationLag}ms</span></div>}
        </div>
      </div>
    </div>
  );
};

export default DatabaseDetailPage;
