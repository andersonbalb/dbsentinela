import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateZabbixConfig, testZabbixConnection, testZabbixConnectionById, ZabbixValidationResult } from "@/services/zabbixIntegration";
import { useZabbixSync } from "@/hooks/useZabbixSync";
import {
  Plus, Trash2, Edit2, X, Save, RefreshCw, Wifi, WifiOff, AlertCircle,
  ExternalLink, Shield, CheckCircle2, XCircle, Clock, Activity, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ZabbixInstanceDB {
  id: string;
  name: string;
  url: string;
  api_user: string;
  version: string | null;
  status: string;
  last_sync: string | null;
  hosts_monitored: number | null;
}

const emptyForm = { name: "", url: "", apiUser: "", apiToken: "", version: "" };

const statusIcons: Record<string, { icon: typeof Wifi; color: string; label: string }> = {
  connected: { icon: Wifi, color: "text-success", label: "Conectado" },
  disconnected: { icon: WifiOff, color: "text-muted-foreground", label: "Desconectado" },
  error: { icon: AlertCircle, color: "text-destructive", label: "Erro" },
};

const ZabbixConfigPage = () => {
  const [instances, setInstances] = useState<ZabbixInstanceDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showToken, setShowToken] = useState(false);
  const [validation, setValidation] = useState<ZabbixValidationResult>({ valid: true, errors: {} });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const syncStatus = useZabbixSync({ intervalMinutes: 5, enabled: true });

  // Load instances from DB
  const loadInstances = useCallback(async () => {
    const { data, error } = await supabase
      .from("zabbix_instances")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInstances(data as ZabbixInstanceDB[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Auto-validate on form changes
  useEffect(() => {
    if (!showForm) return;
    const timer = setTimeout(() => {
      const result = validateZabbixConfig({ url: form.url, apiUser: form.apiUser, apiToken: form.apiToken });
      setValidation(result);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.url, form.apiUser, form.apiToken, showForm]);

  const handleSave = async () => {
    const result = validateZabbixConfig({ url: form.url, apiUser: form.apiUser, apiToken: form.apiToken });
    setValidation(result);
    if (!result.valid) {
      toast.error("Corrija os erros de validação antes de salvar.");
      return;
    }

    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar autenticado.");
      setIsSaving(false);
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("zabbix_instances")
        .update({
          name: form.name,
          url: form.url,
          api_user: form.apiUser,
          api_token: form.apiToken,
          version: form.version || null,
        })
        .eq("id", editId);

      if (error) {
        toast.error(`Erro ao atualizar: ${error.message}`);
      } else {
        toast.success("Instância Zabbix atualizada!", { icon: <Shield className="w-4 h-4 text-success" /> });
      }
    } else {
      const { error } = await supabase
        .from("zabbix_instances")
        .insert({
          name: form.name,
          url: form.url,
          api_user: form.apiUser,
          api_token: form.apiToken,
          version: form.version || null,
          user_id: user.id,
        });

      if (error) {
        toast.error(`Erro ao cadastrar: ${error.message}`);
      } else {
        toast.success("Instância Zabbix cadastrada!", { icon: <Shield className="w-4 h-4 text-success" /> });
      }
    }

    setIsSaving(false);
    resetForm();
    loadInstances();
  };

  const handleTestConnection = async (z: ZabbixInstanceDB) => {
    setIsTesting(true);
    // Use instance_id — credentials are fetched server-side
    const result = await testZabbixConnectionById(z.id);
    if (result.success) {
      await supabase
        .from("zabbix_instances")
        .update({
          status: "connected",
          last_sync: new Date().toISOString(),
          version: result.version || z.version,
          hosts_monitored: result.hostsCount || z.hosts_monitored,
        })
        .eq("id", z.id);
      toast.success("Conexão estabelecida com sucesso!", { icon: <CheckCircle2 className="w-4 h-4 text-success" /> });
    } else {
      await supabase.from("zabbix_instances").update({ status: "error" }).eq("id", z.id);
      toast.error("Falha na conexão. Verifique as credenciais.", { icon: <XCircle className="w-4 h-4 text-destructive" /> });
    }
    loadInstances();
    setIsTesting(false);
  };

  const handleEdit = (z: ZabbixInstanceDB) => {
    setForm({ name: z.name, url: z.url, apiUser: z.api_user, apiToken: z.api_token, version: z.version || "" });
    setEditId(z.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("zabbix_instances").delete().eq("id", id);
    if (error) {
      toast.error(`Erro ao remover: ${error.message}`);
    } else {
      toast.info("Instância removida.");
      loadInstances();
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setShowToken(false);
    setValidation({ valid: true, errors: {} });
  };

  const FieldError = ({ field }: { field: string }) => {
    const error = validation.errors[field];
    if (!error) return null;
    return <p className="text-xs text-destructive mt-1 animate-slide-up flex items-center gap-1"><XCircle className="w-3 h-3" />{error}</p>;
  };

  const fieldOk = (field: string) => {
    const value = form[field as keyof typeof form];
    return value && typeof value === "string" && value.trim().length > 0 && !validation.errors[field];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Configuração Zabbix</h1>
          <p className="text-muted-foreground text-sm">Gerencie instâncias Zabbix • Integração real via API</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => syncStatus.runSync()} disabled={syncStatus.isRunning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-info/10 text-info hover:bg-info/20 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isRunning ? "animate-spin-slow" : ""}`} /> Sync Agora
          </button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Plus className="w-4 h-4 mr-2" /> Nova Instância
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="glass rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${syncStatus.isRunning ? "bg-info/10" : "bg-success/10"}`}>
            <Activity className={`w-4 h-4 ${syncStatus.isRunning ? "text-info animate-pulse" : "text-success"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold font-mono">Background Sync</p>
            <p className="text-xs text-muted-foreground">
              {syncStatus.isRunning ? "Sincronizando..." :
                syncStatus.lastSync ? `Último sync: ${syncStatus.lastSync.toLocaleTimeString("pt-BR")}` : "Aguardando primeira sincronização"}
              {syncStatus.nextSync && !syncStatus.isRunning && ` • Próximo: ${syncStatus.nextSync.toLocaleTimeString("pt-BR")}`}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-muted-foreground">Hosts: <span className="text-foreground">{syncStatus.totalHosts}</span></span>
          <span className="text-muted-foreground">Métricas: <span className="text-foreground">{syncStatus.totalMetrics}</span></span>
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Intervalo: 5min</span>
        </div>
        {syncStatus.errors.length > 0 && (
          <div className="w-full">
            {syncStatus.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive font-mono">{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-lg p-5 neon-border animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold font-mono text-sm">{editId ? "Editar" : "Nova"} Instância Zabbix</h2>
              <span title="Integração real via API"><Shield className="w-4 h-4 text-primary" /></span>
            </div>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zabbix Produção" className={`bg-secondary border-border ${fieldOk("name") ? "border-success/40" : ""}`} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL da API *</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://zabbix.empresa.com" className={`bg-secondary border-border ${fieldOk("url") ? "border-success/40" : validation.errors.url ? "border-destructive/60" : ""}`} />
              <FieldError field="url" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Versão</label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="6.4.8" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Usuário API *</label>
              <Input value={form.apiUser} onChange={(e) => setForm({ ...form, apiUser: e.target.value })} placeholder="api_monitor" className={`bg-secondary border-border ${fieldOk("apiUser") ? "border-success/40" : validation.errors.apiUser ? "border-destructive/60" : ""}`} />
              <FieldError field="apiUser" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
                Token API * <Shield className="w-3 h-3 text-primary" />
              </label>
              <Input
                type={showToken ? "text" : "password"}
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                placeholder="Token ou senha da API Zabbix"
                className={`bg-secondary border-border ${fieldOk("apiToken") ? "border-success/40" : validation.errors.apiToken ? "border-destructive/60" : ""}`}
              />
              <div className="flex items-center justify-between mt-1">
                <FieldError field="apiToken" />
                <button onClick={() => setShowToken(!showToken)} className="text-xs text-primary">
                  {showToken ? "Ocultar" : "Mostrar"} token
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs">
              {Object.keys(validation.errors).length === 0 && form.url ? (
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3.5 h-3.5" />Validação OK</span>
              ) : Object.keys(validation.errors).length > 0 ? (
                <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" />{Object.keys(validation.errors).length} erro(s)</span>
              ) : (
                <span className="text-muted-foreground">Preencha os campos obrigatórios</span>
              )}
            </div>
            <Button onClick={handleSave} disabled={isSaving || !validation.valid || !form.url} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Instance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {instances.map((z, i) => {
          const st = statusIcons[z.status] || statusIcons.disconnected;
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{z.url} <ExternalLink className="w-3 h-3" /></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${st.color}`}>{st.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                <div><span className="text-muted-foreground block">Versão</span><span className="font-mono">{z.version || "—"}</span></div>
                <div><span className="text-muted-foreground block">Hosts</span><span className="font-mono">{z.hosts_monitored || 0}</span></div>
                <div><span className="text-muted-foreground block">Último Sync</span><span className="font-mono">{z.last_sync ? new Date(z.last_sync).toLocaleTimeString("pt-BR") : "—"}</span></div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border/50">
                <button onClick={() => handleTestConnection(z)} disabled={isTesting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50">
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Testar
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
          <p className="text-muted-foreground text-xs mt-2">Clique em "Nova Instância" para conectar ao seu servidor Zabbix</p>
        </div>
      )}
    </div>
  );
};

export default ZabbixConfigPage;
