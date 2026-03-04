import { useState } from "react";
import { mockZabbixInstances, ZabbixInstance } from "@/data/mockServersData";
import { Plus, Trash2, Edit2, X, Save, RefreshCw, Wifi, WifiOff, AlertCircle, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const emptyZabbix: Omit<ZabbixInstance, "id" | "status" | "lastSync" | "hostsMonitored"> = {
  name: "",
  url: "",
  apiUser: "",
  apiToken: "",
  version: "",
};

const statusIcons: Record<ZabbixInstance["status"], { icon: typeof Wifi; color: string; label: string }> = {
  connected: { icon: Wifi, color: "text-success", label: "Conectado" },
  disconnected: { icon: WifiOff, color: "text-muted-foreground", label: "Desconectado" },
  error: { icon: AlertCircle, color: "text-destructive", label: "Erro" },
};

const ZabbixConfigPage = () => {
  const [instances, setInstances] = useState<ZabbixInstance[]>(mockZabbixInstances);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyZabbix);
  const [showToken, setShowToken] = useState(false);

  const handleSave = () => {
    if (!form.name || !form.url || !form.apiUser) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (editId) {
      setInstances((prev) => prev.map((z) => z.id === editId ? { ...z, ...form } : z));
      toast.success("Instância Zabbix atualizada!");
    } else {
      const newZ: ZabbixInstance = {
        ...form,
        id: `zbx-${Date.now()}`,
        status: "disconnected",
        lastSync: new Date().toISOString(),
        hostsMonitored: 0,
      };
      setInstances((prev) => [...prev, newZ]);
      toast.success("Instância Zabbix cadastrada!");
    }
    resetForm();
  };

  const handleEdit = (z: ZabbixInstance) => {
    setForm({ name: z.name, url: z.url, apiUser: z.apiUser, apiToken: z.apiToken, version: z.version });
    setEditId(z.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setInstances((prev) => prev.filter((z) => z.id !== id));
    toast.info("Instância removida.");
  };

  const handleTestConnection = (id: string) => {
    setInstances((prev) => prev.map((z) => z.id === id ? { ...z, status: "connected", lastSync: new Date().toISOString() } : z));
    toast.success("Conexão testada com sucesso!");
  };

  const resetForm = () => {
    setForm(emptyZabbix);
    setEditId(null);
    setShowForm(false);
    setShowToken(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Configuração Zabbix</h1>
          <p className="text-muted-foreground text-sm">Gerencie as instâncias Zabbix que alimentam o monitoramento</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Plus className="w-4 h-4 mr-2" /> Nova Instância
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-lg p-5 neon-border animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold font-mono text-sm">{editId ? "Editar" : "Nova"} Instância Zabbix</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zabbix Produção" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL da API *</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://zabbix.empresa.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Versão</label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="6.4.8" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Usuário API *</label>
              <Input value={form.apiUser} onChange={(e) => setForm({ ...form, apiUser: e.target.value })} placeholder="api_monitor" className="bg-secondary border-border" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Token API</label>
              <Input
                type={showToken ? "text" : "password"}
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                placeholder="Token de acesso à API do Zabbix"
                className="bg-secondary border-border"
              />
              <button onClick={() => setShowToken(!showToken)} className="text-xs text-primary mt-1">
                {showToken ? "Ocultar" : "Mostrar"} token
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" /> {editId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Instance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {instances.map((z, i) => {
          const st = statusIcons[z.status];
          const Icon = st.icon;
          return (
            <div key={z.id} className="glass rounded-lg p-5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${z.status === "connected" ? "bg-success/10" : z.status === "error" ? "bg-destructive/10" : "bg-secondary"}`}>
                    <Icon className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold font-mono text-sm">{z.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {z.url} <ExternalLink className="w-3 h-3" />
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono ${st.color}`}>{st.label}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Versão</span>
                  <span className="font-mono">{z.version || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Hosts</span>
                  <span className="font-mono">{z.hostsMonitored}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Último Sync</span>
                  <span className="font-mono">{new Date(z.lastSync).toLocaleTimeString("pt-BR")}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border/50">
                <button onClick={() => handleTestConnection(z.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-success/10 text-success hover:bg-success/20 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Testar
                </button>
                <button onClick={() => handleEdit(z)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDelete(z.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {instances.length === 0 && (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma instância Zabbix configurada</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Clique em "Nova Instância" para começar</p>
        </div>
      )}
    </div>
  );
};

export default ZabbixConfigPage;
