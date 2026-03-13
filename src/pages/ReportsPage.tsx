import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, AlertTriangle, Archive, Activity, Radio, Info, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { mockAlerts } from "@/data/mockData";
import { mockBackupJobs } from "@/data/mockBackupData";
import { ZabbixHostMetric } from "@/services/zabbixIntegration";
import {
  exportAlertsCSV, exportAlertsPDF,
  exportBackupsCSV, exportBackupsPDF,
  exportMetricsCSV, exportMetricsPDF,
} from "@/services/reportExporter";

type Period = "24h" | "7d" | "30d" | "all";

function filterByPeriod<T extends { createdAt?: string; startedAt?: string }>(items: T[], period: Period): T[] {
  if (period === "all") return items;
  const now = Date.now();
  const ms = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 }[period];
  return items.filter((item) => {
    const date = item.createdAt || item.startedAt;
    return date && now - new Date(date).getTime() <= ms;
  });
}

const severityColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
};

const statusColor: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  running: "bg-info/15 text-info border-info/30",
  scheduled: "bg-muted text-muted-foreground border-border",
  warning: "bg-warning/15 text-warning border-warning/30",
};

const ReportsPage = () => {
  const [period, setPeriod] = useState<Period>("7d");
  const [zabbixConnected] = useState(false);
  const [zabbixMetrics] = useState<ZabbixHostMetric[]>([]);

  const filteredAlerts = filterByPeriod(mockAlerts as any[], period);
  const filteredBackups = filterByPeriod(mockBackupJobs as any[], period);

  const alertStats = {
    total: filteredAlerts.length,
    critical: filteredAlerts.filter((a: any) => a.severity === "critical").length,
    warning: filteredAlerts.filter((a: any) => a.severity === "warning").length,
    resolved: filteredAlerts.filter((a: any) => a.status === "resolved").length,
  };

  const backupStats = {
    total: filteredBackups.length,
    success: filteredBackups.filter((b: any) => b.status === "success").length,
    failed: filteredBackups.filter((b: any) => b.status === "failed").length,
    totalSizeMB: filteredBackups.reduce((a: number, b: any) => a + (b.sizeMB || 0), 0),
  };

  // Generate alert trend data grouped by day
  const alertTrendData = useMemo(() => {
    const dayMap: Record<string, { date: string; critical: number; warning: number; info: number }> = {};
    const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 14;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), critical: 0, warning: 0, info: 0 };
    }
    filteredAlerts.forEach((a: any) => {
      const key = new Date(a.createdAt).toISOString().split("T")[0];
      if (dayMap[key]) dayMap[key][a.severity as "critical" | "warning" | "info"]++;
    });
    return Object.values(dayMap);
  }, [filteredAlerts, period]);

  // Generate backup volume data grouped by day
  const backupTrendData = useMemo(() => {
    const dayMap: Record<string, { date: string; volumeGB: number; success: number; failed: number }> = {};
    const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 14;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), volumeGB: 0, success: 0, failed: 0 };
    }
    filteredBackups.forEach((b: any) => {
      const key = new Date(b.startedAt).toISOString().split("T")[0];
      if (dayMap[key]) {
        dayMap[key].volumeGB = Math.round((dayMap[key].volumeGB + (b.sizeMB || 0) / 1024) * 100) / 100;
        if (b.status === "success") dayMap[key].success++;
        else if (b.status === "failed") dayMap[key].failed++;
      }
    });
    return Object.values(dayMap);
  }, [filteredBackups, period]);

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 15% 18%)", borderRadius: "8px", fontSize: "12px" },
    labelStyle: { color: "hsl(180 10% 90%)" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Exporte alertas, backups e métricas em PDF ou CSV</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="alerts" className="gap-2"><AlertTriangle className="w-4 h-4" />Alertas</TabsTrigger>
          <TabsTrigger value="backups" className="gap-2"><Archive className="w-4 h-4" />Backups</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2"><Activity className="w-4 h-4" />Métricas Zabbix</TabsTrigger>
        </TabsList>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono">{alertStats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Alertas</p>
            </CardContent></Card>
            <Card className="glass border-destructive/30"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono text-destructive">{alertStats.critical}</div>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </CardContent></Card>
            <Card className="glass border-warning/30"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono text-warning">{alertStats.warning}</div>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent></Card>
            <Card className="glass border-success/30"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono text-success">{alertStats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </CardContent></Card>
          </div>

          {/* Alert Trend Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Evolução de Alertas por Dia</CardTitle>
              <CardDescription>Distribuição por severidade no período</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={alertTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="critical" name="Crítico" stackId="1" stroke="hsl(0 72% 55%)" fill="hsl(0 72% 55% / 0.4)" />
                  <Area type="monotone" dataKey="warning" name="Warning" stackId="1" stroke="hsl(38 92% 55%)" fill="hsl(38 92% 55% / 0.4)" />
                  <Area type="monotone" dataKey="info" name="Info" stackId="1" stroke="hsl(210 80% 55%)" fill="hsl(210 80% 55% / 0.4)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Alertas ({filteredAlerts.length})</CardTitle>
                <CardDescription>Período: {period}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportAlertsCSV(filteredAlerts as any)}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />CSV
                </Button>
                <Button size="sm" onClick={() => exportAlertsPDF(filteredAlerts as any)}>
                  <FileText className="w-4 h-4 mr-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.slice(0, 15).map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono text-xs">{alert.databaseName}</TableCell>
                      <TableCell><Badge className={severityColor[alert.severity]}>{alert.severity}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{alert.status}</Badge></TableCell>
                      <TableCell>{alert.metric}</TableCell>
                      <TableCell className="font-mono">{alert.value}%</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{alert.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAlerts.length > 15 && (
                <p className="text-xs text-muted-foreground text-center mt-3">Mostrando 15 de {filteredAlerts.length} — exporte para ver todos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUPS TAB */}
        <TabsContent value="backups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono">{backupStats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Jobs</p>
            </CardContent></Card>
            <Card className="glass border-success/30"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono text-success">{backupStats.success}</div>
              <p className="text-xs text-muted-foreground">Sucesso</p>
            </CardContent></Card>
            <Card className="glass border-destructive/30"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono text-destructive">{backupStats.failed}</div>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </CardContent></Card>
            <Card className="glass"><CardContent className="pt-4">
              <div className="text-2xl font-bold font-mono">{(backupStats.totalSizeMB / 1024).toFixed(1)} GB</div>
              <p className="text-xs text-muted-foreground">Volume Total</p>
            </CardContent></Card>
          </div>

          {/* Backup Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Volume de Backup por Dia</CardTitle>
                <CardDescription>Tamanho total em GB</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={backupTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="volumeGB" name="Volume (GB)" fill="hsl(175 80% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Jobs de Backup por Dia</CardTitle>
                <CardDescription>Sucesso vs Falha</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={backupTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(215 10% 50%)", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip {...chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="success" name="Sucesso" fill="hsl(145 65% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Falha" fill="hsl(0 72% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Backups ({filteredBackups.length})</CardTitle>
                <CardDescription>Período: {period}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportBackupsCSV(filteredBackups as any)}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />CSV
                </Button>
                <Button size="sm" onClick={() => exportBackupsPDF(filteredBackups as any)}>
                  <FileText className="w-4 h-4 mr-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>PITR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBackups.slice(0, 15).map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.databaseName}</TableCell>
                      <TableCell><Badge variant="outline">{job.type.toUpperCase()}</Badge></TableCell>
                      <TableCell><Badge className={statusColor[job.status]}>{job.status}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(job.startedAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-xs">{job.duration || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{job.sizeMB} MB</TableCell>
                      <TableCell>{job.pitrEnabled ? <CheckCircle2 className="w-4 h-4 text-success" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredBackups.length > 15 && (
                <p className="text-xs text-muted-foreground text-center mt-3">Mostrando 15 de {filteredBackups.length} — exporte para ver todos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* METRICS TAB */}
        <TabsContent value="metrics" className="space-y-4">
          {!zabbixConnected ? (
            <Card className="glass border-primary/30">
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Radio className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Conecte o Zabbix para exportar métricas</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Para gerar relatórios de métricas de servidores (CPU, Memória, Disco), configure a integração com o Zabbix na página de configuração.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <Button onClick={() => window.location.href = "/zabbix"} className="gap-2">
                    <Radio className="w-4 h-4" />Configurar Zabbix
                  </Button>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-sm">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-info" />
                    <span>Após configurar, as métricas serão sincronizadas automaticamente a cada 5 minutos e estarão disponíveis para exportação aqui.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass"><CardContent className="pt-4">
                  <div className="text-2xl font-bold font-mono">{zabbixMetrics.length}</div>
                  <p className="text-xs text-muted-foreground">Hosts Monitorados</p>
                </CardContent></Card>
                <Card className="glass border-success/30"><CardContent className="pt-4">
                  <div className="text-2xl font-bold font-mono text-success">
                    {zabbixMetrics.filter((m) => m.status === "online").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Online</p>
                </CardContent></Card>
                <Card className="glass border-warning/30"><CardContent className="pt-4">
                  <div className="text-2xl font-bold font-mono text-warning">
                    {zabbixMetrics.filter((m) => m.status === "warning" || m.status === "critical").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Com Alertas</p>
                </CardContent></Card>
              </div>

              {/* CPU/Memory Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">CPU Média por Host (%)</CardTitle>
                    <CardDescription className="text-xs">Uso atual de CPU de cada host monitorado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={zabbixMetrics} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis type="category" dataKey="hostname" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={130} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => [`${value}%`, "CPU"]}
                        />
                        <Bar dataKey="cpu" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Memória Média por Host (%)</CardTitle>
                    <CardDescription className="text-xs">Uso atual de memória de cada host monitorado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={zabbixMetrics} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis type="category" dataKey="hostname" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={130} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => [`${value}%`, "Memória"]}
                        />
                        <Bar dataKey="memory" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Combined overview chart */}
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Visão Geral — CPU vs Memória vs Disco</CardTitle>
                  <CardDescription className="text-xs">Comparativo de recursos por host</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={zabbixMetrics} margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="hostname" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string) => [`${value}%`, name === "cpu" ? "CPU" : name === "memory" ? "Memória" : "Disco"]}
                      />
                      <Legend formatter={(v) => v === "cpu" ? "CPU" : v === "memory" ? "Memória" : "Disco"} />
                      <Bar dataKey="cpu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar dataKey="memory" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar dataKey="disk" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Métricas Zabbix ({zabbixMetrics.length})</CardTitle>
                    <CardDescription>Dados em tempo real</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportMetricsCSV(zabbixMetrics)}>
                      <FileSpreadsheet className="w-4 h-4 mr-1" />CSV
                    </Button>
                    <Button size="sm" onClick={() => exportMetricsPDF(zabbixMetrics)}>
                      <FileText className="w-4 h-4 mr-1" />PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>CPU</TableHead>
                        <TableHead>Memória</TableHead>
                        <TableHead>Disco</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Verificado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zabbixMetrics.map((m) => (
                        <TableRow key={m.host_id}>
                          <TableCell className="font-mono text-xs">{m.hostname}</TableCell>
                          <TableCell className="font-mono">{m.cpu}%</TableCell>
                          <TableCell className="font-mono">{m.memory}%</TableCell>
                          <TableCell className="font-mono">{m.disk}%</TableCell>
                          <TableCell><Badge className={m.status === "online" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>{m.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(m.last_check).toLocaleString("pt-BR")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
