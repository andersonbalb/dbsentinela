import { RefreshCw } from "lucide-react";

interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  countdown: number;
}

const RefreshIndicator = ({ lastUpdated, isRefreshing, countdown }: RefreshIndicatorProps) => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground">
    <div className="flex items-center gap-1.5">
      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin-slow text-primary" : ""}`} />
      {isRefreshing ? (
        <span className="text-primary">Atualizando...</span>
      ) : (
        <span>Próxima atualização em {countdown}s</span>
      )}
    </div>
    {lastUpdated && (
      <span className="text-muted-foreground/60">
        Última: {lastUpdated.toLocaleTimeString("pt-BR")}
      </span>
    )}
  </div>
);

export default RefreshIndicator;
