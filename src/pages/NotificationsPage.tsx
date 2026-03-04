import { useState } from "react";
import { mockTelegramConfigs, TelegramConfig } from "@/data/mockServersData";
import { Plus, Trash2, Edit2, X, Save, Volume2, VolumeX, Send, Bell, BellOff, TestTube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const NotificationsPage = () => {
  // Sound notifications
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("dbmon_sound") !== "false");
  const [soundCritical, setSoundCritical] = useState(true);
  const [soundWarning, setSoundWarning] = useState(true);

  // Telegram
  const [telegrams, setTelegrams] = useState<TelegramConfig[]>(mockTelegramConfigs);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TelegramConfig, "id">>({
    name: "",
    botToken: "",
    chatId: "",
    enabled: true,
    notifyCritical: true,
    notifyWarning: true,
    notifyInfo: false,
  });

  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem("dbmon_sound", String(value));
    if (value) {
      toast.success("Notificações sonoras ativadas");
    } else {
      toast.info("Notificações sonoras desativadas");
    }
  };

  const playTestSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
    toast.info("🔔 Teste de som executado!");
  };

  const handleSaveTelegram = () => {
    if (!form.name || !form.botToken || !form.chatId) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (editId) {
      setTelegrams((prev) => prev.map((t) => t.id === editId ? { ...t, ...form } : t));
      toast.success("Configuração Telegram atualizada!");
    } else {
      setTelegrams((prev) => [...prev, { ...form, id: `tg-${Date.now()}` }]);
      toast.success("Notificação Telegram cadastrada!");
    }
    resetForm();
  };

  const handleEditTelegram = (t: TelegramConfig) => {
    setForm({ name: t.name, botToken: t.botToken, chatId: t.chatId, enabled: t.enabled, notifyCritical: t.notifyCritical, notifyWarning: t.notifyWarning, notifyInfo: t.notifyInfo });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleDeleteTelegram = (id: string) => {
    setTelegrams((prev) => prev.filter((t) => t.id !== id));
    toast.info("Configuração removida.");
  };

  const handleToggleTelegram = (id: string) => {
    setTelegrams((prev) => prev.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const handleTestTelegram = (t: TelegramConfig) => {
    toast.success(`Mensagem de teste enviada para "${t.name}"`, { description: `Chat ID: ${t.chatId}` });
  };

  const resetForm = () => {
    setForm({ name: "", botToken: "", chatId: "", enabled: true, notifyCritical: true, notifyWarning: true, notifyInfo: false });
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-mono neon-text">Notificações</h1>
        <p className="text-muted-foreground text-sm">Configure alertas sonoros e integrações com Telegram</p>
      </div>

      {/* Sound Notifications */}
      <div className="glass rounded-lg p-5 neon-border">
        <div className="flex items-center gap-3 mb-4">
          {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
          <h2 className="font-semibold font-mono text-sm">Notificações Sonoras</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Ativar sons de alerta</p>
              <p className="text-xs text-muted-foreground">Emite um som quando um novo alerta é disparado</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>

          {soundEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas Críticos</span>
                <Switch checked={soundCritical} onCheckedChange={setSoundCritical} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas Warning</span>
                <Switch checked={soundWarning} onCheckedChange={setSoundWarning} />
              </div>
              <button onClick={playTestSound} className="flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Volume2 className="w-3.5 h-3.5" /> Testar Som
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-info" />
            <h2 className="font-semibold font-mono text-sm">Notificações Telegram</h2>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} variant="outline" size="sm" className="border-border text-sm">
            <Plus className="w-4 h-4 mr-1" /> Novo Bot
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="glass rounded-lg p-5 neon-border animate-slide-up mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold font-mono text-xs">{editId ? "Editar" : "Nova"} Configuração Telegram</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alertas DBA Team" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Chat ID *</label>
                <Input value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} placeholder="-1001234567890" className="bg-secondary border-border" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Bot Token *</label>
                <Input type="password" value={form.botToken} onChange={(e) => setForm({ ...form, botToken: e.target.value })} placeholder="123456:ABC-DEF..." className="bg-secondary border-border" />
                <p className="text-xs text-muted-foreground/60 mt-1">Obtenha o token via @BotFather no Telegram</p>
              </div>
            </div>
            <div className="flex items-center gap-6 mb-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch checked={form.notifyCritical} onCheckedChange={(v) => setForm({ ...form, notifyCritical: v })} />
                <span className="text-destructive text-xs">Crítico</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={form.notifyWarning} onCheckedChange={(v) => setForm({ ...form, notifyWarning: v })} />
                <span className="text-warning text-xs">Warning</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={form.notifyInfo} onCheckedChange={(v) => setForm({ ...form, notifyInfo: v })} />
                <span className="text-info text-xs">Info</span>
              </label>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveTelegram} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" /> {editId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        )}

        {/* Telegram List */}
        <div className="space-y-3">
          {telegrams.map((t, i) => (
            <div key={t.id} className="glass rounded-lg p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${t.enabled ? "bg-info/10" : "bg-secondary"}`}>
                    <Send className={`w-4 h-4 ${t.enabled ? "text-info" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold font-mono text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">Chat: {t.chatId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.enabled ? <Bell className="w-4 h-4 text-success" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                  <Switch checked={t.enabled} onCheckedChange={() => handleToggleTelegram(t.id)} />
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {t.notifyCritical && <span className="px-2 py-0.5 text-xs rounded bg-destructive/10 text-destructive font-mono">Crítico</span>}
                {t.notifyWarning && <span className="px-2 py-0.5 text-xs rounded bg-warning/10 text-warning font-mono">Warning</span>}
                {t.notifyInfo && <span className="px-2 py-0.5 text-xs rounded bg-info/10 text-info font-mono">Info</span>}
              </div>

              <div className="flex gap-2 pt-3 border-t border-border/50">
                <button onClick={() => handleTestTelegram(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-info/10 text-info hover:bg-info/20 transition-colors">
                  <TestTube className="w-3 h-3" /> Testar
                </button>
                <button onClick={() => handleEditTelegram(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDeleteTelegram(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {telegrams.length === 0 && (
          <div className="glass rounded-lg p-10 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma notificação Telegram configurada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
