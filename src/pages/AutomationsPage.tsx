import { useState } from "react";
import {
  Workflow, Play, Pause, CheckCircle2, XCircle, Clock, Shield,
  Database, Lock, Search, Archive, Users, AlertTriangle, Settings2,
  ExternalLink, Plus, RefreshCw, Zap, History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface Automation {
  id: string;
  name: string;
  description: string;
  category: "backup" | "security" | "performance" | "audit";
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: "success" | "error" | "running" | "never";
  n8nWorkflowId: string | null;
}

interface ExecutionLog {
  id: string;
  automationId: string;
  automationName: string;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "error" | "running";
  details: string;
  duration: string;
}

const mockAutomations: Automation[] = [
  {
    id: "auto-1",
    name: "Verificação de Backups",
    description: "Verifica se os backups Full e Incremental foram executados com sucesso nas últimas 24h",
    category: "backup",
    schedule: "0 8 * * *",
    enabled: true,
    lastRun: "2024-01-15T08:00:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-2",
    name: "Auditoria de Permissões",
    description: "Verifica alterações de permissões de usuários e roles nos bancos de dados",
    category: "security",
    schedule: "0 */6 * * *",
    enabled: true,
    lastRun: "2024-01-15T12:00:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-3",
    name: "Detecção de Deadlocks",
    description: "Monitora e registra ocorrências de deadlock com detalhes das queries envolvidas",
    category: "performance",
    schedule: "*/5 * * * *",
    enabled: true,
    lastRun: "2024-01-15T14:55:00",
    lastStatus: "error",
    n8nWorkflowId: null,
  },
  {
    id: "auto-4",
    name: "Rastreabilidade de DDL",
    description: "Registra todas as alterações DDL (CREATE, ALTER, DROP) nos bancos monitorados",
    category: "audit",
    schedule: "*/10 * * * *",
    enabled: true,
    lastRun: "2024-01-15T14:50:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-5",
    name: "Validação de Integridade",
    description: "Executa DBCC CHECKDB ou pg_checksums para validar integridade dos dados",
    category: "backup",
    schedule: "0 3 * * 0",
    enabled: false,
    lastRun: "2024-01-14T03:00:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-6",
    name: "Revogação de Acessos Inativos",
    description: "Identifica e revoga permissões de usuários inativos há mais de 90 dias",
    category: "security",
    schedule: "0 2 * * 1",
    enabled: true,
    lastRun: "2024-01-15T02:00:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-7",
    name: "Análise de Queries Lentas",
    description: "Coleta e analisa queries com tempo de execução acima do threshold definido",
    category: "performance",
    schedule: "0 */1 * * *",
    enabled: true,
    lastRun: "2024-01-15T14:00:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
  {
    id: "auto-8",
    name: "Log de Acessos Privilegiados",
    description: "Registra todos os acessos com privilégios elevados (SUPERUSER, DBA, sa)",
    category: "audit",
    schedule: "*/15 * * * *",
    enabled: true,
    lastRun: "2024-01-15T14:45:00",
    lastStatus: "success",
    n8nWorkflowId: null,
  },
];

const mockExecutionLogs: ExecutionLog[] = [
  {
    id: "log-1",
    automationId: "auto-3",
    automationName: "Detecção de Deadlocks",
    startedAt: "2024-01-15T14:55:00",
    finishedAt: "2024-01-15T14:55:12",
    status: "error",
    details: "Deadlock detectado entre PID 4521 e PID 4533 no banco prod_erp. Notificação enviada.",
    duration: "12s",
  },
  {
    id: "log-2",
    automationId: "auto-1",
    automationName: "Verificação de Backups",
    startedAt: "2024-01-15T08:00:00",
    finishedAt: "2024-01-15T08:00:45",
    status: "success",
    details: "Todos os 12 backups Full e 36 Incremental verificados com sucesso.",
    duration: "45s",
  },
  {
    id: "log-3",
    automationId: "auto-2",
    automationName: "Auditoria de Permissões",
    startedAt: "2024-01-15T12:00:00",
    finishedAt: "2024-01-15T12:01:23",
    status: "success",
    details: "3 alterações de permissões detectadas: GRANT SELECT em prod_analytics para user_report.",
    duration: "1m 23s",
  },
  {
    id: "log-4",
    automationId: "auto-4",
    automationName: "Rastreabilidade de DDL",
    startedAt: "2024-01-15T14:50:00",
    finishedAt: "2024-01-15T14:50:08",
    status: "success",
    details: "2 comandos DDL registrados: ALTER TABLE orders ADD COLUMN tracking_id VARCHAR(50).",
    duration: "8s",
  },
  {
    id: "log-5",
    automationId: "auto-7",
    automationName: "Análise de Queries Lentas",
    startedAt: "2024-01-15T14:00:00",
    finishedAt: "2024-01-15T14:02:15",
    status: "success",
    details: "7 queries acima de 5s detectadas. Top: SELECT * FROM orders JOIN... (avg 23s).",
    duration: "2m 15s",
  },
  {
    id: "log-6",
    automationId: "auto-8",
    automationName: "Log de Acessos Privilegiados",
    startedAt: "2024-01-15T14:45:00",
    finishedAt: "2024-01-15T14:45:03",
    status: "success",
    details: "1 acesso SUPERUSER registrado: dba_carlos conectou em prod_main via pgAdmin.",
    duration: "3s",
  },
];

const categoryConfig = {
  backup: { label: "Backup", icon: Archive, color: "text-blue-400" },
  security: { label: "Segurança", icon: Shield, color: "text-amber-400" },
  performance: { label: "Performance", icon: Zap, color: "text-emerald-400" },
  audit: { label: "Auditoria", icon: Search, color: "text-purple-400" },
};

const statusConfig = {
  success: { label: "Sucesso", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  error: { label: "Erro", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
  running: { label: "Executando", icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-400/10" },
  never: { label: "Nunca executado", icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
};

const n8nTemplates = [
  {
    id: "tpl-1",
    name: "Backup Health Check",
    description: "Workflow que verifica saúde dos backups via API e envia alerta no Slack/Teams",
    category: "backup",
    complexity: "Intermediário",
  },
  {
    id: "tpl-2",
    name: "Permission Audit Report",
    description: "Gera relatório semanal de permissões e envia por e-mail ao DBA responsável",
    category: "security",
    complexity: "Avançado",
  },
  {
    id: "tpl-3",
    name: "Deadlock Alert Pipeline",
    description: "Captura deadlocks em tempo real, analisa com IA e cria ticket automático",
    category: "performance",
    complexity: "Avançado",
  },
  {
    id: "tpl-4",
    name: "DDL Change Tracker",
    description: "Registra alterações DDL em banco de auditoria e notifica via webhook",
    category: "audit",
    complexity: "Simples",
  },
  {
    id: "tpl-5",
    name: "Inactive User Cleanup",
    description: "Identifica usuários inativos, gera relatório e sugere revogações",
    category: "security",
    complexity: "Intermediário",
  },
  {
    id: "tpl-6",
    name: "Query Performance Digest",
    description: "Coleta métricas de queries e gera digest diário com recomendações de otimização",
    category: "performance",
    complexity: "Avançado",
  },
];

const AutomationsPage = () => {
  const [automations, setAutomations] = useState(mockAutomations);
  const [n8nConnected] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    const auto = automations.find((a) => a.id === id);
    toast({
      title: auto?.enabled ? "Automação desativada" : "Automação ativada",
      description: auto?.name,
    });
  };

  const runNow = (id: string) => {
    const auto = automations.find((a) => a.id === id);
    toast({
      title: "Execução iniciada",
      description: `${auto?.name} está sendo executada...`,
    });
  };

  const filteredAutomations =
    filterCategory === "all"
      ? automations
      : automations.filter((a) => a.category === filterCategory);

  const stats = {
    total: automations.length,
    active: automations.filter((a) => a.enabled).length,
    errors: automations.filter((a) => a.lastStatus === "error").length,
    success24h: mockExecutionLogs.filter((l) => l.status === "success").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text flex items-center gap-2">
            <Workflow className="w-6 h-6" />
            Automações DBA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workflows automatizados para rotinas de DBA com integração n8n
          </p>
        </div>
        <div className="flex items-center gap-2">
          {n8nConnected ? (
            <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> n8n Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400/30 text-amber-400">
              <AlertTriangle className="w-3 h-3 mr-1" /> n8n Não Conectado
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Automações</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-400/10">
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-400/10">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{stats.errors}</p>
              <p className="text-xs text-muted-foreground">Com Erro</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-400/10">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{stats.success24h}</p>
              <p className="text-xs text-muted-foreground">Sucesso (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="automations" className="data-[state=active]:bg-background">
            <Settings2 className="w-4 h-4 mr-1" /> Automações
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-background">
            <History className="w-4 h-4 mr-1" /> Logs de Execução
          </TabsTrigger>
          <TabsTrigger value="n8n" className="data-[state=active]:bg-background">
            <Workflow className="w-4 h-4 mr-1" /> Templates n8n
          </TabsTrigger>
        </TabsList>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={filterCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("all")}
            >
              Todas
            </Button>
            {Object.entries(categoryConfig).map(([key, cfg]) => (
              <Button
                key={key}
                variant={filterCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(key)}
              >
                <cfg.icon className="w-3.5 h-3.5 mr-1" />
                {cfg.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredAutomations.map((auto) => {
              const cat = categoryConfig[auto.category];
              const status = statusConfig[auto.lastStatus];
              return (
                <Card key={auto.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${status.bg} mt-0.5`}>
                          <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{auto.name}</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {cat.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{auto.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" /> {auto.schedule}
                            </span>
                            {auto.lastRun && (
                              <span className="flex items-center gap-1">
                                <status.icon className={`w-3 h-3 ${status.color}`} />
                                {new Date(auto.lastRun).toLocaleString("pt-BR")}
                              </span>
                            )}
                            {auto.n8nWorkflowId && (
                              <span className="flex items-center gap-1 text-primary">
                                <Workflow className="w-3 h-3" /> n8n #{auto.n8nWorkflowId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => runNow(auto.id)}
                          disabled={!auto.enabled}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Switch
                          checked={auto.enabled}
                          onCheckedChange={() => toggleAutomation(auto.id)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de Execuções</CardTitle>
              <CardDescription>Últimas execuções das automações</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Automação</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockExecutionLogs.map((log) => {
                    const status = statusConfig[log.status];
                    return (
                      <TableRow key={log.id} className="border-border/30">
                        <TableCell className="font-medium text-sm">{log.automationName}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(log.startedAt).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.duration}</TableCell>
                        <TableCell>
                          <Badge className={`${status.bg} ${status.color} border-0 text-[10px]`}>
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* n8n Templates Tab */}
        <TabsContent value="n8n" className="space-y-4">
          {!n8nConnected && (
            <Card className="bg-amber-400/5 border-amber-400/20">
              <CardContent className="p-6 text-center space-y-3">
                <Workflow className="w-10 h-10 text-amber-400 mx-auto" />
                <div>
                  <h3 className="font-semibold text-amber-400">Conectar n8n</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Conecte sua instância n8n para ativar workflows avançados de automação DBA.
                    Os templates abaixo estarão disponíveis após a conexão.
                  </p>
                </div>
                <Button className="bg-amber-400 text-amber-950 hover:bg-amber-500">
                  <ExternalLink className="w-4 h-4 mr-1" /> Configurar Conexão n8n
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {n8nTemplates.map((tpl) => {
              const cat = categoryConfig[tpl.category as keyof typeof categoryConfig];
              return (
                <Card key={tpl.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        <h3 className="font-semibold text-sm">{tpl.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {tpl.complexity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!n8nConnected}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {n8nConnected ? "Usar Template" : "Requer n8n conectado"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationsPage;
