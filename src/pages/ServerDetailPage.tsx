import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockServers } from "@/data/mockServersData";
import { generateHistoricalData, TimePeriod, periodHours } from "@/data/historicalData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import { ArrowLeft, Cpu, MemoryStick, HardDrive, Network, ArrowDown, ArrowUp, Monitor } from "lucide-react";
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

const ServerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lastUpdated, isRefreshing, countdown, refreshKey } = useAutoRefresh(30);
  const [period, setPeriod] = useState<TimePeriod>("24h");

  const server = mockServers.find((s) => s.id === id);

  const cpuData = useMemo(() => generateHistoricalData(periodHours[period], server?.cpuUsage ?? 40, 8), [period, refreshKey]);
  const memData = useMemo(() => generateHistoricalData(periodHours[period], server ? (server.memoryUsed / server.memoryTotal) * 100 : 50, 5), [period, refreshKey]);
  const diskData = useMemo(() => generateHistoricalData(periodHours[period], server ? (server.diskUsed / server.diskTotal) * 100 : 40, 2, 20, 95), [period, refreshKey]);
  const netInData = useMemo(() => generateHistoricalData(periodHours[period], server?.networkIn ?? 100, 40, 0, 1000), [period, refreshKey]);
  const netOutData = useMemo(() => generateHistoricalData(periodHours[period], server?.networkOut ?? 60, 30, 0, 800), [period, refreshKey]);

  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Servidor não encontrado</p>
        <button onClick={() => navigate("/servers")} className="text-primary text-sm">Voltar</button>
      </div>
    );
  }

  const statusDot = server.status === "online" ? "status-dot-online" : server.status === "warning" ? "status-dot-warning" : server.status === "critical" ? "status-dot-critical" : "status-dot-offline";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/servers")} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className={statusDot} />
            <div>
              <h1 className="text-2xl font-bold font-mono neon-text">{server.hostname}</h1>
              <p className="text-muted-foreground text-sm">{server.ip} • {server.os} • {server.cpuCores} cores • {server.memoryTotal}GB RAM</p>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "CPU", value: `${server.cpuUsage}%`, icon: Cpu, color: "text-primary" },
          { label: "Memória", value: `${Math.round((server.memoryUsed / server.memoryTotal) * 100)}%`, icon: MemoryStick, color: "text-info" },
          { label: "Disco", value: `${Math.round((server.diskUsed / server.diskTotal) * 100)}%`, icon: HardDrive, color: "text-warning" },
          { label: "Net In", value: `${server.networkIn} Mbps`, icon: ArrowDown, color: "text-success" },
          { label: "Net Out", value: `${server.networkOut} Mbps`, icon: ArrowUp, color: "text-info" },
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
          <MetricChart title="Network In" data={netInData} color="hsl(145, 65%, 45%)" unit=" Mbps" icon={ArrowDown} />
          <MetricChart title="Network Out" data={netOutData} color="hsl(210, 80%, 55%)" unit=" Mbps" icon={ArrowUp} />
        </div>
      </div>

      {/* Server Info */}
      <div className="glass rounded-lg p-5">
        <h3 className="font-semibold font-mono text-sm mb-3">Informações do Servidor</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><span className="text-muted-foreground block">CPU Model</span><span className="font-mono">{server.cpuModel}</span></div>
          <div><span className="text-muted-foreground block">Load Average</span><span className="font-mono">{server.loadAvg.join(", ")}</span></div>
          <div><span className="text-muted-foreground block">Uptime</span><span className="font-mono">{server.uptime}</span></div>
          <div><span className="text-muted-foreground block">Bancos hospedados</span><span className="font-mono">{server.databases.join(", ")}</span></div>
        </div>
      </div>
    </div>
  );
};

export default ServerDetailPage;
