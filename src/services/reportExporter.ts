/**
 * Report Exporter - Generates CSV and PDF exports for alerts, backups, and metrics.
 */

import { Alert } from "@/data/mockData";
import { BackupJob } from "@/data/mockBackupData";
import { ZabbixHostMetric } from "@/services/zabbixIntegration";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

// CSV exports
export function exportAlertsCSV(alerts: Alert[]) {
  const header = "ID,Banco,Severidade,Status,Métrica,Valor,Threshold,Mensagem,Criado Em,Reconhecido Em,Resolvido Em\n";
  const rows = alerts.map((a) =>
    [a.id, a.databaseName, a.severity, a.status, a.metric, a.value, a.threshold, `"${a.message}"`, formatDate(a.createdAt), a.acknowledgedAt ? formatDate(a.acknowledgedAt) : "", a.resolvedAt ? formatDate(a.resolvedAt) : ""].join(",")
  ).join("\n");
  downloadFile(header + rows, `alertas_${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
}

export function exportBackupsCSV(jobs: BackupJob[]) {
  const header = "ID,Banco,Tipo,Status,Início,Fim,Duração,Tamanho (MB),Comprimido (MB),Destino,PITR,Verificação\n";
  const rows = jobs.map((j) =>
    [j.id, j.databaseName, j.type, j.status, formatDate(j.startedAt), j.finishedAt ? formatDate(j.finishedAt) : "", j.duration || "", j.sizeMB, j.compressedSizeMB, j.destination, j.pitrEnabled ? "Sim" : "Não", j.verificationStatus || ""].join(",")
  ).join("\n");
  downloadFile(header + rows, `backups_${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
}

export function exportMetricsCSV(metrics: ZabbixHostMetric[]) {
  const header = "Host ID,Hostname,CPU (%),Memória (%),Disco (%),Status,Última Verificação\n";
  const rows = metrics.map((m) =>
    [m.host_id, m.hostname, m.cpu, m.memory, m.disk, m.status, formatDate(m.last_check)].join(",")
  ).join("\n");
  downloadFile(header + rows, `metricas_zabbix_${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
}

// PDF-style HTML export (opens print dialog)
function generatePDFHTML(title: string, tableHeaders: string[], rows: string[][]): string {
  const headerRow = tableHeaders.map((h) => `<th style="border:1px solid #333;padding:6px 10px;background:#1a2332;color:#2dd4bf;font-size:11px;text-align:left;">${h}</th>`).join("");
  const bodyRows = rows.map((row) =>
    `<tr>${row.map((cell) => `<td style="border:1px solid #2a3444;padding:5px 10px;font-size:10px;color:#cdd6e0;">${cell}</td>`).join("")}</tr>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>${title} - DB Sentinela</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: 'Inter', Arial, sans-serif; background: #0d1117; color: #cdd6e0; padding: 30px; margin: 0; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 2px solid #2dd4bf; padding-bottom: 16px; }
    .header h1 { color: #2dd4bf; font-size: 20px; margin: 0; }
    .header .subtitle { color: #8b949e; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .footer { margin-top: 24px; font-size: 10px; color: #8b949e; text-align: center; border-top: 1px solid #2a3444; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🛡️ DB Sentinela - ${title}</h1>
      <div class="subtitle">Gerado em: ${new Date().toLocaleString("pt-BR")} | Total de registros: ${rows.length}</div>
    </div>
  </div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">Relatório gerado automaticamente pelo DB Sentinela</div>
</body>
</html>`;
}

export function exportAlertsPDF(alerts: Alert[]) {
  const headers = ["Banco", "Severidade", "Status", "Métrica", "Valor", "Mensagem", "Data"];
  const rows = alerts.map((a) => [a.databaseName, a.severity.toUpperCase(), a.status, a.metric, `${a.value}%`, a.message, formatDate(a.createdAt)]);
  const w = window.open("", "_blank");
  if (w) { w.document.write(generatePDFHTML("Relatório de Alertas", headers, rows)); w.document.close(); w.print(); }
}

export function exportBackupsPDF(jobs: BackupJob[]) {
  const headers = ["Banco", "Tipo", "Status", "Início", "Duração", "Tamanho", "Destino", "PITR"];
  const rows = jobs.map((j) => [j.databaseName, j.type.toUpperCase(), j.status, formatDate(j.startedAt), j.duration || "-", `${j.sizeMB} MB`, j.destination, j.pitrEnabled ? "✅" : "❌"]);
  const w = window.open("", "_blank");
  if (w) { w.document.write(generatePDFHTML("Relatório de Backups", headers, rows)); w.document.close(); w.print(); }
}

export function exportMetricsPDF(metrics: ZabbixHostMetric[]) {
  const headers = ["Hostname", "CPU (%)", "Memória (%)", "Disco (%)", "Status", "Última Verificação"];
  const rows = metrics.map((m) => [m.hostname, `${m.cpu}%`, `${m.memory}%`, `${m.disk}%`, m.status.toUpperCase(), formatDate(m.lastCheck)]);
  const w = window.open("", "_blank");
  if (w) { w.document.write(generatePDFHTML("Relatório de Métricas Zabbix", headers, rows)); w.document.close(); w.print(); }
}
