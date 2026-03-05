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

export interface AIDetailedAnalysis {
  alertId: string;
  summary: string;
  timeline: { time: string; event: string }[];
  diagnosticSteps: { step: number; title: string; description: string; query?: string; expected: string }[];
  correlatedMetrics: { metric: string; trend: string; relevance: string }[];
  preventionPlan: { action: string; priority: "immediate" | "short-term" | "long-term"; effort: string }[];
  estimatedResolution: string;
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

// Detailed AI analysis - deeper diagnostics
const detailedKB: Record<string, {
  diagnosticSteps: AIDetailedAnalysis["diagnosticSteps"];
  correlatedMetrics: AIDetailedAnalysis["correlatedMetrics"];
  preventionPlan: AIDetailedAnalysis["preventionPlan"];
  estimatedResolution: string;
}> = {
  CPU: {
    diagnosticSteps: [
      { step: 1, title: "Capturar snapshot de atividade", description: "Registre todas as queries ativas no momento do pico de CPU.", query: "SELECT pid, usename, application_name, state, wait_event_type, wait_event, query_start, now() - query_start AS duration, left(query, 200) AS query_preview FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;", expected: "Lista de queries ativas ordenadas por duração — identifique as com mais de 5s." },
      { step: 2, title: "Verificar pg_stat_statements", description: "Analise as queries com maior tempo total acumulado.", query: "SELECT left(query, 100) AS query, calls, total_exec_time::bigint AS total_ms, mean_exec_time::int AS avg_ms, rows FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;", expected: "Top 20 queries por consumo total — foque nas com avg_ms > 1000." },
      { step: 3, title: "Analisar planos de execução", description: "Execute EXPLAIN ANALYZE nas queries mais lentas identificadas.", query: "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <sua_query_lenta>;", expected: "Procure por Seq Scan em tabelas grandes, Nested Loop com muitas rows, Sort sem índice." },
      { step: 4, title: "Verificar autovacuum", description: "Autovacuum travado pode causar bloat e degradar performance.", query: "SELECT relname, n_dead_tup, last_autovacuum, autovacuum_count FROM pg_stat_user_tables WHERE n_dead_tup > 50000 ORDER BY n_dead_tup DESC;", expected: "Tabelas com muitas dead tuples e autovacuum antigo precisam de atenção." },
    ],
    correlatedMetrics: [
      { metric: "I/O Wait", trend: "Pode estar elevado se queries estão fazendo full scans", relevance: "Alto I/O wait correlacionado com CPU indica queries ineficientes" },
      { metric: "Conexões ativas", trend: "Aumento proporcional ao pico de CPU", relevance: "Mais conexões ativas = mais CPU consumida em paralelo" },
      { metric: "Cache Hit Ratio", trend: "Queda indica mais leituras de disco", relevance: "Cache miss gera I/O adicional que consome CPU" },
    ],
    preventionPlan: [
      { action: "Implementar monitoramento contínuo de pg_stat_statements", priority: "immediate", effort: "1h" },
      { action: "Criar índices para as top 5 queries mais lentas", priority: "short-term", effort: "2-4h" },
      { action: "Implementar connection pooling (PgBouncer)", priority: "short-term", effort: "4-8h" },
      { action: "Revisar arquitetura de queries com equipe de desenvolvimento", priority: "long-term", effort: "1-2 semanas" },
    ],
    estimatedResolution: "30min - 2h (dependendo da complexidade das queries envolvidas)",
  },
  Memory: {
    diagnosticSteps: [
      { step: 1, title: "Verificar uso de memória do PostgreSQL", description: "Analise a distribuição de memória entre shared buffers e processos.", query: "SELECT name, setting, unit, short_desc FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size', 'temp_buffers') ORDER BY name;", expected: "shared_buffers deve ser ~25% da RAM, work_mem cauteloso (4-64MB)." },
      { step: 2, title: "Identificar processos com alto consumo", description: "Verifique quais backends estão usando mais memória.", query: "SELECT pid, usename, state, wait_event, backend_type, pg_size_pretty(pg_backend_memory_contexts.total_bytes) FROM pg_stat_activity LEFT JOIN LATERAL (SELECT sum(total_bytes) as total_bytes FROM pg_backend_memory_contexts WHERE pg_backend_memory_contexts.pid = pg_stat_activity.pid) pg_backend_memory_contexts ON true ORDER BY pg_backend_memory_contexts.total_bytes DESC NULLS LAST LIMIT 10;", expected: "Backends com consumo desproporcional podem indicar memory leak." },
      { step: 3, title: "Verificar temp files", description: "Operações de sort/hash que excedem work_mem geram arquivos temporários.", query: "SELECT datname, temp_files, pg_size_pretty(temp_bytes) AS temp_size FROM pg_stat_database WHERE temp_files > 0 ORDER BY temp_bytes DESC;", expected: "Alto uso de temp files indica que work_mem está muito baixo." },
    ],
    correlatedMetrics: [
      { metric: "Swap Usage", trend: "Swap ativo degrada drasticamente a performance", relevance: "Qualquer uso de swap em servidor de banco é crítico" },
      { metric: "Cache Hit Ratio", trend: "Queda quando memória está sob pressão", relevance: "Diretamente impactado pela disponibilidade de shared buffers" },
    ],
    preventionPlan: [
      { action: "Configurar alertas de swap usage > 0", priority: "immediate", effort: "15min" },
      { action: "Ajustar shared_buffers e work_mem", priority: "short-term", effort: "1-2h (requer restart)" },
      { action: "Implementar connection pooler para reduzir memória por conexão", priority: "short-term", effort: "4h" },
      { action: "Planejar upgrade de RAM se necessário", priority: "long-term", effort: "Planejamento + janela" },
    ],
    estimatedResolution: "1-4h (ajuste de parâmetros pode exigir restart planejado)",
  },
  Connections: {
    diagnosticSteps: [
      { step: 1, title: "Snapshot de conexões por estado", description: "Entenda a distribuição de conexões.", query: "SELECT state, usename, application_name, count(*), (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_conn FROM pg_stat_activity GROUP BY state, usename, application_name ORDER BY count DESC;", expected: "Muitas conexões 'idle' indicam falta de pooling." },
      { step: 2, title: "Detectar conexões idle in transaction", description: "Estas conexões retêm locks e consomem recursos.", query: "SELECT pid, usename, state, query_start, now() - query_start AS duration, left(query, 150) FROM pg_stat_activity WHERE state = 'idle in transaction' ORDER BY duration DESC;", expected: "Conexões idle in transaction > 5min são problemáticas." },
    ],
    correlatedMetrics: [
      { metric: "Lock waits", trend: "Aumenta com excesso de conexões concorrentes", relevance: "Mais conexões = mais contenção por locks" },
      { metric: "CPU", trend: "Context switching aumenta com muitas conexões", relevance: "PostgreSQL usa 1 processo por conexão" },
    ],
    preventionPlan: [
      { action: "Terminar conexões idle > 30min", priority: "immediate", effort: "5min" },
      { action: "Configurar idle_in_transaction_session_timeout", priority: "immediate", effort: "15min" },
      { action: "Implementar PgBouncer em modo transaction", priority: "short-term", effort: "4-8h" },
      { action: "Revisar gestão de conexões nas aplicações", priority: "long-term", effort: "1-2 semanas" },
    ],
    estimatedResolution: "15min - 1h (terminando conexões ociosas e ajustando limites)",
  },
  Disk: {
    diagnosticSteps: [
      { step: 1, title: "Mapear uso de disco por tablespace", description: "Identifique onde está o maior consumo.", query: "SELECT spcname, pg_size_pretty(pg_tablespace_size(oid)) AS size FROM pg_tablespace ORDER BY pg_tablespace_size(oid) DESC;", expected: "Identifique tablespaces com crescimento anormal." },
      { step: 2, title: "Top tabelas por tamanho", description: "Liste as maiores tabelas e seus índices.", query: "SELECT schemaname || '.' || relname AS table_name, pg_size_pretty(pg_total_relation_size(relid)) AS total, pg_size_pretty(pg_relation_size(relid)) AS table_only, pg_size_pretty(pg_indexes_size(relid)) AS indexes FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 15;", expected: "Tabelas com índices muito maiores que os dados indicam index bloat." },
      { step: 3, title: "Verificar bloat", description: "Table e index bloat desperdiçam espaço.", query: "SELECT schemaname, relname, n_live_tup, n_dead_tup, ROUND(n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100, 1) AS dead_pct, last_vacuum, last_autovacuum FROM pg_stat_user_tables WHERE n_dead_tup > 10000 ORDER BY n_dead_tup DESC LIMIT 15;", expected: "dead_pct > 20% indica necessidade de VACUUM." },
    ],
    correlatedMetrics: [
      { metric: "WAL Generation", trend: "Alto volume de WAL pode encher disco rapidamente", relevance: "WAL é gerado proporcionalmente ao volume de escritas" },
      { metric: "I/O Throughput", trend: "Disco cheio pode causar falhas de I/O", relevance: "Monitorar throughput para detectar gargalos de disco" },
    ],
    preventionPlan: [
      { action: "Implementar política de retenção de dados", priority: "immediate", effort: "2-4h" },
      { action: "Agendar VACUUM FULL nas tabelas com maior bloat", priority: "short-term", effort: "Janela de manutenção" },
      { action: "Configurar pg_partman para particionamento automático", priority: "long-term", effort: "1-2 semanas" },
    ],
    estimatedResolution: "2-8h (dependendo do volume de dados a limpar)",
  },
  Replication: {
    diagnosticSteps: [
      { step: 1, title: "Verificar estado de replicação", description: "Analise o status e o lag de cada réplica.", query: "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag_pretty FROM pg_stat_replication;", expected: "replay_lag > 100MB indica problema na réplica." },
    ],
    correlatedMetrics: [
      { metric: "WAL Generation Rate", trend: "Alta geração de WAL aumenta lag", relevance: "Volume de escritas diretamente afeta a replicação" },
    ],
    preventionPlan: [
      { action: "Monitorar lag de replicação continuamente", priority: "immediate", effort: "30min" },
      { action: "Avaliar hardware da réplica", priority: "short-term", effort: "Análise" },
    ],
    estimatedResolution: "30min - 2h",
  },
  Locks: {
    diagnosticSteps: [
      { step: 1, title: "Identificar bloqueadores", description: "Encontre a cadeia de locks.", query: "SELECT blocked.pid AS blocked_pid, blocked.query AS blocked_query, blocking.pid AS blocking_pid, blocking.query AS blocking_query, blocked.wait_event FROM pg_stat_activity blocked JOIN pg_locks bl ON bl.pid = blocked.pid JOIN pg_locks bk ON bk.locktype = bl.locktype AND bk.relation = bl.relation AND bk.pid != bl.pid JOIN pg_stat_activity blocking ON blocking.pid = bk.pid WHERE NOT bl.granted;", expected: "Identifique a query bloqueadora e avalie se pode ser terminada." },
    ],
    correlatedMetrics: [
      { metric: "Conexões em espera", trend: "Aumenta proporcionalmente aos locks", relevance: "Lock contention causa filas de conexões" },
    ],
    preventionPlan: [
      { action: "Configurar lock_timeout = 10s", priority: "immediate", effort: "5min" },
      { action: "Revisar transações longas", priority: "short-term", effort: "2-4h" },
    ],
    estimatedResolution: "5-30min (terminando a sessão bloqueadora)",
  },
};

export function analyzeAlertDetailed(alert: Alert): AIDetailedAnalysis {
  const metric = alert.metric;
  const kb = detailedKB[metric] || detailedKB["CPU"];

  const now = new Date();
  const timeline = [
    { time: new Date(new Date(alert.createdAt).getTime() - 600000).toLocaleTimeString("pt-BR"), event: `Métrica ${metric} começou a subir gradualmente` },
    { time: new Date(new Date(alert.createdAt).getTime() - 300000).toLocaleTimeString("pt-BR"), event: `${metric} ultrapassou threshold de warning (${alert.threshold * 0.85}%)` },
    { time: new Date(alert.createdAt).toLocaleTimeString("pt-BR"), event: `Alerta disparado: ${metric} atingiu ${alert.value}% (threshold: ${alert.threshold}%)` },
    { time: now.toLocaleTimeString("pt-BR"), event: `Análise IA iniciada para diagnóstico detalhado` },
  ];

  return {
    alertId: alert.id,
    summary: `O alerta de ${metric} no banco ${alert.databaseName} indica que o valor atual (${alert.value}%) excedeu o threshold configurado (${alert.threshold}%). Baseado na análise de padrões e na base de conhecimento, foram identificadas ${kb.diagnosticSteps.length} etapas de diagnóstico e ${kb.preventionPlan.length} ações preventivas.`,
    timeline,
    diagnosticSteps: kb.diagnosticSteps,
    correlatedMetrics: kb.correlatedMetrics,
    preventionPlan: kb.preventionPlan,
    estimatedResolution: kb.estimatedResolution,
    analyzedAt: now.toISOString(),
  };
}
