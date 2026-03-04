import { useState } from "react";
import { mockThresholds, ThresholdConfig } from "@/data/mockData";
import { SlidersHorizontal, Save, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ThresholdsPage = () => {
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>(mockThresholds);
  const [search, setSearch] = useState("");

  const filtered = thresholds.filter((t) =>
    t.databaseName.toLowerCase().includes(search.toLowerCase())
  );

  const updateThreshold = (dbId: string, field: keyof ThresholdConfig, value: number) => {
    setThresholds((prev) =>
      prev.map((t) => (t.databaseId === dbId ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = () => {
    toast.success("Thresholds salvos com sucesso!", {
      description: "As configurações serão aplicadas na próxima verificação.",
    });
  };

  const handleReset = (dbId: string) => {
    const defaults = mockThresholds.find((t) => t.databaseId === dbId);
    if (defaults) {
      setThresholds((prev) =>
        prev.map((t) => (t.databaseId === dbId ? { ...defaults } : t))
      );
      toast.info("Thresholds resetados para valores padrão.");
    }
  };

  const fields: { key: keyof ThresholdConfig; label: string; icon: string }[] = [
    { key: "cpuWarning", label: "CPU Warn", icon: "🔸" },
    { key: "cpuCritical", label: "CPU Crit", icon: "🔴" },
    { key: "memoryWarning", label: "Mem Warn", icon: "🔸" },
    { key: "memoryCritical", label: "Mem Crit", icon: "🔴" },
    { key: "connectionsWarning", label: "Conn Warn", icon: "🔸" },
    { key: "connectionsCritical", label: "Conn Crit", icon: "🔴" },
    { key: "diskWarning", label: "Disk Warn", icon: "🔸" },
    { key: "diskCritical", label: "Disk Crit", icon: "🔴" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Thresholds</h1>
          <p className="text-muted-foreground text-sm">Configuração de limites para disparo de alertas por banco</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 glow-primary text-sm font-semibold transition-colors"
        >
          <Save className="w-4 h-4" /> Salvar Todos
        </button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar banco de dados..."
        className="bg-secondary border-border max-w-sm"
      />

      <div className="space-y-3">
        {filtered.map((t, i) => (
          <div key={t.databaseId} className="glass rounded-lg p-5 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="font-semibold font-mono text-sm">{t.databaseName}</h3>
              </div>
              <button
                onClick={() => handleReset(t.databaseId)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {f.icon} {f.label}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={t[f.key] as number}
                      onChange={(e) => updateThreshold(t.databaseId, f.key, parseInt(e.target.value) || 0)}
                      className="bg-secondary border-border text-xs h-8 pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThresholdsPage;
