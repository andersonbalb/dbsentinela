import { useState, useMemo } from "react";
import { mockSlowQueries, SlowQuery } from "@/data/mockData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import { Zap, Clock, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

const SlowQueriesPage = () => {
  const { lastUpdated, isRefreshing, countdown } = useAutoRefresh(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"duration" | "timestamp">("duration");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...mockSlowQueries].sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      if (sortField === "duration") return (a.duration - b.duration) * mul;
      return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * mul;
    });
  }, [sortField, sortDir]);

  const toggleSort = (field: "duration" | "timestamp") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const copyQuery = (id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  const durationColor = (d: number) => d > 10 ? "text-destructive" : d > 5 ? "text-warning" : "text-foreground";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Slow Queries</h1>
          <p className="text-muted-foreground text-sm">{mockSlowQueries.length} queries lentas detectadas</p>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
      </div>

      <div className={`glass rounded-lg overflow-hidden ${isRefreshing ? "opacity-60" : ""} transition-opacity`}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/50 text-xs font-mono text-muted-foreground">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Banco</div>
          <div className="col-span-4">Query</div>
          <button onClick={() => toggleSort("duration")} className="col-span-1 flex items-center gap-1 hover:text-primary transition-colors">
            Duração <SortIcon field="duration" />
          </button>
          <div className="col-span-1">Linhas</div>
          <button onClick={() => toggleSort("timestamp")} className="col-span-2 flex items-center gap-1 hover:text-primary transition-colors">
            Timestamp <SortIcon field="timestamp" />
          </button>
        </div>

        {/* Rows */}
        {sorted.map((sq, i) => (
          <div key={sq.id} className="animate-slide-up" style={{ animationDelay: `${i * 20}ms` }}>
            <div
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 hover:bg-secondary/30 cursor-pointer transition-colors items-center text-sm"
              onClick={() => setExpandedId(expandedId === sq.id ? null : sq.id)}
            >
              <div className="col-span-1 text-xs text-muted-foreground font-mono">{i + 1}</div>
              <div className="col-span-3">
                <span className="text-xs font-mono">{sq.databaseName}</span>
                <span className="text-xs text-muted-foreground/60 ml-1.5">{sq.user}</span>
              </div>
              <div className="col-span-4 truncate font-mono text-xs">{sq.query}</div>
              <div className={`col-span-1 font-mono text-xs font-semibold ${durationColor(sq.duration)}`}>
                {sq.duration.toFixed(1)}s
              </div>
              <div className="col-span-1 font-mono text-xs text-muted-foreground">{sq.rows.toLocaleString()}</div>
              <div className="col-span-2 text-xs text-muted-foreground font-mono">
                {new Date(sq.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>

            {expandedId === sq.id && (
              <div className="px-4 py-4 border-b border-border/30 bg-secondary/20 animate-slide-up space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">SQL Completo</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyQuery(sq.id, sq.query); }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      {copiedId === sq.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === sq.id ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-background/50 rounded p-3 overflow-x-auto whitespace-pre-wrap">{sq.query}</pre>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground mb-1 block">Plano de Execução</span>
                  <pre className="text-xs font-mono bg-background/50 rounded p-3 overflow-x-auto text-warning">{sq.executionPlan}</pre>
                </div>
                <div className="flex gap-6 text-xs text-muted-foreground font-mono">
                  <span>Duração: <span className={durationColor(sq.duration)}>{sq.duration.toFixed(3)}s</span></span>
                  <span>Linhas afetadas: {sq.rows.toLocaleString()}</span>
                  <span>Usuário: {sq.user}</span>
                  <span>{new Date(sq.timestamp).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlowQueriesPage;
