/**
 * AI Alert Analyzer - Local intelligence engine for alert diagnosis and suggestions.
 * Analyzes alert patterns and provides actionable recommendations.
 */

import { Alert, AlertSeverity } from "@/data/mockData";

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  commands?: string[];
  risk: "low" | "medium" | "high";
  confidence: number; // 0-100
  category: "performance" | "capacity" | "availability" | "security" | "maintenance";
}

export interface AIAnalysisResult {
  alertId: string;
  rootCause: string;
  impact: string;
  suggestions: AISuggestion[];
  relatedAlerts: string[];
  analyzedAt: string;
}

// Knowledge base of common DBA solutions
const solutionKB: Record<string, { causes: string[]; impacts: string[]; suggestions: AISuggestion[] }> = {
  CPU: {
    causes: [
      "Queries com full table scan consumindo CPU excessivamente",
      "Processos de backup ou manutenção concorrendo com workload produtivo",
      "Excesso de conexões executando queries simultaneamente",
      "Planos de execução desatualizados após grandes atualizações de dados",
    ],
    impacts: [
      "Degradação geral de performance das queries",
      "Aumento no tempo de resposta da aplicação",
      "Possível timeout de conexões",
    ],
    suggestions: [
      {
        id: "cpu-1", title: "Identificar queries com alto consumo de CPU",
        description: "Execute uma análise das queries ativas para encontrar as que mais consomem recursos.",
        commands: [
          "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;",
          "SELECT query, calls, total_exec_time/calls as avg_time, rows FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
        ],
        risk: "low", confidence: 92, category: "performance"
      },
      {
        id: "cpu-2", title: "Atualizar estatísticas do otimizador",
        description: "Estatísticas desatualizadas podem causar planos de execução ineficientes.",
        commands: ["ANALYZE VERBOSE;", "SELECT schemaname, relname, last_analyze FROM pg_stat_user_tables WHERE last_analyze < NOW() - INTERVAL '7 days';"],
        risk: "low", confidence: 85, category: "maintenance"
      },
      {
        id: "cpu-3", title: "Verificar e criar índices faltantes",
        description: "Tabelas sem índices adequados forçam full table scans.",
        commands: ["SELECT relname, seq_scan, idx_scan, n_live_tup FROM pg_stat_user_tables WHERE seq_scan > idx_scan AND n_live_tup > 10000 ORDER BY seq_scan - idx_scan DESC;"],
        risk: "medium", confidence: 78, category: "performance"
      },
    ]
  },
  Memory: {
    causes: [
      "shared_buffers ou work_mem configurados inadequadamente",
      "Memory leak em conexões long-running",
      "Cache bloat por tabelas raramente acessadas ocupando buffers",
      "Excesso de conexões consumindo memória por sessão",
    ],
    impacts: [
      "Aumento de operações de I/O por falta de cache",
      "Possível OOM killer encerrando processos do banco",
      "Swapping degradando performance severamente",
    ],
    suggestions: [
      {
        id: "mem-1", title: "Verificar configuração de memória",
        description: "Analise os parâmetros de memória do PostgreSQL e ajuste conforme a RAM disponível.",
        commands: [
          "SHOW shared_buffers; SHOW work_mem; SHOW effective_cache_size;",
          "SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'effective_cache_size', 'maintenance_work_mem');"
        ],
        risk: "low", confidence: 88, category: "performance"
      },
      {
        id: "mem-2", title: "Identificar conexões ociosas consumindo memória",
        description: "Conexões idle podem reter memória. Considere usar um connection pooler.",
        commands: [
          "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;",
          "SELECT pid, usename, state, query_start FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '30 minutes';"
        ],
        risk: "low", confidence: 82, category: "capacity"
      },
      {
        id: "mem-3", title: "Avaliar cache hit ratio",
        description: "Cache hit ratio abaixo de 99% indica que mais memória é necessária.",
        commands: ["SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio FROM pg_statio_user_tables;"],
        risk: "low", confidence: 90, category: "performance"
      },
    ]
  },
  Connections: {
    causes: [
      "Aplicação sem connection pooling abrindo conexões excessivas",
      "Conexões travadas por locks ou queries longas",
      "Configuração de max_connections muito baixa para o workload",
      "Aplicação não liberando conexões corretamente",
    ],
    impacts: [
      "Novas conexões serão recusadas ao atingir o limite",
      "Erro 'too many clients already' para usuários",
      "Degradação geral de performance do banco",
    ],
    suggestions: [
      {
        id: "conn-1", title: "Analisar conexões ativas e ociosas",
        description: "Identifique conexões que podem ser liberadas ou terminadas.",
        commands: [
          "SELECT state, usename, application_name, count(*) FROM pg_stat_activity GROUP BY state, usename, application_name ORDER BY count DESC;",
          "SELECT count(*) AS total, (SELECT setting::int FROM pg_settings WHERE name='max_connections') AS max_conn FROM pg_stat_activity;"
        ],
        risk: "low", confidence: 95, category: "capacity"
      },
      {
        id: "conn-2", title: "Implementar PgBouncer como connection pooler",
        description: "PgBouncer reduz drasticamente o número de conexões diretas ao banco.",
        commands: ["-- Instalar e configurar PgBouncer:", "-- pool_mode = transaction", "-- max_client_conn = 1000", "-- default_pool_size = 25"],
        risk: "medium", confidence: 88, category: "capacity"
      },
      {
        id: "conn-3", title: "Terminar conexões idle em transação",
        description: "Conexões 'idle in transaction' bloqueiam recursos. Configure timeout.",
        commands: [
          "SET idle_in_transaction_session_timeout = '5min';",
          "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < NOW() - INTERVAL '10 minutes';"
        ],
        risk: "high", confidence: 75, category: "availability"
      },
    ]
  },
  Disk: {
    causes: [
      "Crescimento acelerado de tabelas e índices sem política de retenção",
      "WAL files acumulando por falta de archiving ou replicação parada",
      "VACUUM não executando corretamente, causando table bloat",
      "Logs excessivos consumindo espaço em disco",
    ],
    impacts: [
      "Banco pode parar completamente se disco ficar 100% cheio",
      "Impossibilidade de realizar WAL e crash recovery",
      "Operações de escrita serão recusadas",
    ],
    suggestions: [
      {
        id: "disk-1", title: "Identificar tabelas com maior consumo de disco",
        description: "Encontre as tabelas que mais ocupam espaço e avalie política de retenção.",
        commands: [
          "SELECT schemaname, relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 15;"
        ],
        risk: "low", confidence: 92, category: "capacity"
      },
      {
        id: "disk-2", title: "Executar VACUUM FULL em tabelas com bloat",
        description: "Table bloat ocupa espaço desnecessário. VACUUM FULL recupera o espaço.",
        commands: [
          "SELECT schemaname, relname, n_dead_tup, last_vacuum, last_autovacuum FROM pg_stat_user_tables WHERE n_dead_tup > 10000 ORDER BY n_dead_tup DESC;",
          "-- CUIDADO: VACUUM FULL bloqueia a tabela!", "VACUUM FULL VERBOSE nome_da_tabela;"
        ],
        risk: "high", confidence: 85, category: "maintenance"
      },
      {
        id: "disk-3", title: "Verificar e limpar WAL files antigos",
        description: "WAL files acumulados podem consumir grande quantidade de disco.",
        commands: [
          "SELECT pg_size_pretty(sum(size)) FROM pg_ls_waldir();",
          "SHOW wal_keep_size; SHOW archive_mode;"
        ],
        risk: "medium", confidence: 80, category: "maintenance"
      },
    ]
  },
  Replication: {
    causes: [
      "Rede instável entre master e réplica",
      "Réplica com hardware insuficiente para acompanhar o volume de escrita",
      "Queries pesadas na réplica bloqueando o apply de WAL",
      "Configuração de max_wal_senders ou wal_keep_size inadequada",
    ],
    impacts: [
      "Dados desatualizados nas réplicas de leitura",
      "Risco de perda de dados em caso de failover",
      "Inconsistência em leituras distribuídas",
    ],
    suggestions: [
      {
        id: "rep-1", title: "Verificar estado da replicação",
        description: "Analise o status atual e o lag de replicação.",
        commands: [
          "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes FROM pg_stat_replication;",
          "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
        ],
        risk: "low", confidence: 95, category: "availability"
      },
      {
        id: "rep-2", title: "Cancelar queries pesadas na réplica",
        description: "Queries longas na réplica podem atrasar o replay de WAL.",
        commands: [
          "SET hot_standby_feedback = on;",
          "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND backend_type = 'client backend' AND query_start < NOW() - INTERVAL '5 minutes';"
        ],
        risk: "medium", confidence: 78, category: "availability"
      },
    ]
  },
  Locks: {
    causes: [
      "Transações longas mantendo locks exclusivos",
      "Deadlocks entre transações concorrentes",
      "DDL operations (ALTER TABLE) bloqueando reads/writes",
      "Falta de índices causando lock escalation",
    ],
    impacts: [
      "Queries ficam em fila aguardando liberação de locks",
      "Timeout de aplicações esperando por recursos bloqueados",
      "Possível cascata de falhas em microserviços dependentes",
    ],
    suggestions: [
      {
        id: "lock-1", title: "Identificar locks ativos e bloqueadores",
        description: "Encontre qual sessão está bloqueando outras.",
        commands: [
          "SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user, blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.relation = blocked_locks.relation AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;"
        ],
        risk: "low", confidence: 93, category: "availability"
      },
      {
        id: "lock-2", title: "Configurar lock_timeout e statement_timeout",
        description: "Previna que sessões mantenham locks indefinidamente.",
        commands: ["SET lock_timeout = '10s';", "SET statement_timeout = '60s';", "ALTER DATABASE mydb SET lock_timeout = '10s';"],
        risk: "low", confidence: 85, category: "availability"
      },
    ]
  },
};

export function analyzeAlert(alert: Alert): AIAnalysisResult {
  const metric = alert.metric;
  const kb = solutionKB[metric] || solutionKB["CPU"]; // fallback

  const causeIndex = Math.floor(Math.random() * kb.causes.length);
  const impactIndex = Math.floor(Math.random() * kb.impacts.length);

  // Adjust confidence based on severity
  const severityMultiplier = alert.severity === "critical" ? 1.0 : alert.severity === "warning" ? 0.95 : 0.85;

  const suggestions = kb.suggestions.map((s) => ({
    ...s,
    id: `${s.id}-${alert.id}`,
    confidence: Math.round(s.confidence * severityMultiplier),
  }));

  return {
    alertId: alert.id,
    rootCause: kb.causes[causeIndex],
    impact: kb.impacts[impactIndex],
    suggestions,
    relatedAlerts: [],
    analyzedAt: new Date().toISOString(),
  };
}

export function getAnalysisStatusText(confidence: number): string {
  if (confidence >= 90) return "Alta confiança";
  if (confidence >= 75) return "Confiança moderada";
  return "Baixa confiança";
}

export function getRiskColor(risk: AISuggestion["risk"]): string {
  return risk === "high" ? "text-destructive" : risk === "medium" ? "text-warning" : "text-success";
}

export function getRiskBg(risk: AISuggestion["risk"]): string {
  return risk === "high" ? "bg-destructive/10" : risk === "medium" ? "bg-warning/10" : "bg-success/10";
}
