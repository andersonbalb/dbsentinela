import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ZabbixApiRequest {
  action: "test" | "sync";
  instance_id: string;
  // Only used for "test_new" — credentials for instances not yet saved
  url?: string;
  api_user?: string;
  api_token?: string;
}

// --- Anti-SSRF helpers ---

function isPrivateOrReservedHost(hostname: string): boolean {
  if (/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|::1)$/i.test(hostname)) {
    return true;
  }
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
  }
  return false;
}

function validateZabbixUrl(rawUrl: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "URL inválida" };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Apenas HTTPS é permitido para conexões Zabbix" };
  }
  if (isPrivateOrReservedHost(parsed.hostname)) {
    return { valid: false, error: "URLs apontando para redes internas/privadas não são permitidas" };
  }
  return { valid: true };
}

// --- Zabbix API helpers ---

async function zabbixApiCall(
  url: string,
  method: string,
  params: Record<string, unknown>,
  authToken?: string
): Promise<unknown> {
  const apiUrl = url.endsWith("/api_jsonrpc.php") ? url : `${url}/api_jsonrpc.php`;
  const body: Record<string, unknown> = { jsonrpc: "2.0", method, params, id: 1 };
  if (authToken) body.auth = authToken;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.data || data.error.message || JSON.stringify(data.error));
  }
  return data.result;
}

async function authenticate(url: string, user: string, password: string): Promise<string> {
  return (await zabbixApiCall(url, "user.login", { user, password })) as string;
}

async function getZabbixAuth(url: string, user: string, token: string): Promise<string> {
  try {
    await zabbixApiCall(url, "host.get", { limit: 1, output: ["hostid"] }, token);
    return token;
  } catch {
    return await authenticate(url, user, token);
  }
}

async function testConnection(url: string, user: string, token: string) {
  try {
    const version = await zabbixApiCall(url, "apiinfo.version", {});
    const authToken = await getZabbixAuth(url, user, token);
    const hosts = await zabbixApiCall(url, "host.get", { countOutput: true }, authToken);
    return { success: true, version: version as string, hostsCount: parseInt(hosts as string, 10) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function syncMetrics(url: string, user: string, token: string) {
  try {
    const authToken = await getZabbixAuth(url, user, token);

    const hosts = (await zabbixApiCall(url, "host.get", {
      output: ["hostid", "host", "name", "status"],
      selectInterfaces: ["ip"],
      filter: { status: 0 },
      limit: 100,
    }, authToken)) as Array<{ hostid: string; host: string; name: string; status: string }>;

    const hostIds = hosts.map((h) => h.hostid);
    const items = (await zabbixApiCall(url, "item.get", {
      hostids: hostIds,
      output: ["hostid", "key_", "lastvalue", "name"],
      search: { key_: "system.cpu.util,vm.memory.utilization,vfs.fs.size" },
      searchByAny: true,
      sortfield: "key_",
      limit: hostIds.length * 10,
    }, authToken)) as Array<{ hostid: string; key_: string; lastvalue: string; name: string }>;

    const metrics = hosts.map((host) => {
      const hostItems = items.filter((i) => i.hostid === host.hostid);
      const cpu = parseFloat(hostItems.find((i) => i.key_.includes("cpu.util") || i.key_.includes("system.cpu"))?.lastvalue || "0");
      const memory = parseFloat(hostItems.find((i) => i.key_.includes("memory.utilization") || i.key_.includes("vm.memory"))?.lastvalue || "0");
      const disk = parseFloat(hostItems.find((i) => i.key_.includes("vfs.fs.size") || i.key_.includes("disk"))?.lastvalue || "0");

      let status: "online" | "warning" | "critical" | "offline" = "online";
      if (cpu > 90 || memory > 95 || disk > 95) status = "critical";
      else if (cpu > 75 || memory > 85 || disk > 85) status = "warning";

      return {
        host_id: host.hostid,
        hostname: host.name || host.host,
        cpu: Math.round(cpu * 100) / 100,
        memory: Math.round(memory * 100) / 100,
        disk: Math.round(disk * 100) / 100,
        status,
        last_check: new Date().toISOString(),
      };
    });

    return { success: true, hostsFound: hosts.length, metricsCollected: items.length, metrics, timestamp: new Date().toISOString() };
  } catch (error) {
    return { success: false, hostsFound: 0, metricsCollected: 0, metrics: [], error: error instanceof Error ? error.message : "Unknown error", timestamp: new Date().toISOString() };
  }
}

// --- Fetch instance credentials server-side using service role ---

async function fetchInstanceCredentials(
  instanceId: string,
  userId: string
): Promise<{ url: string; api_user: string; api_token: string } | null> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await adminClient
    .from("zabbix_instances")
    .select("url, api_user, api_token, user_id")
    .eq("id", instanceId)
    .single();

  if (error || !data) return null;
  // Verify ownership
  if (data.user_id !== userId) return null;

  return { url: data.url, api_user: data.api_user, api_token: data.api_token };
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const body: ZabbixApiRequest = await req.json();
    const { action, instance_id } = body;

    // Resolve credentials: from DB (instance_id) or inline (for testing unsaved instances)
    let url: string;
    let apiUser: string;
    let apiToken: string;

    if (instance_id) {
      const creds = await fetchInstanceCredentials(instance_id, userId);
      if (!creds) {
        return new Response(
          JSON.stringify({ error: "Instância não encontrada ou sem permissão" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = creds.url;
      apiUser = creds.api_user;
      apiToken = creds.api_token;
    } else if (body.url && body.api_user && body.api_token) {
      // Allow inline credentials ONLY for testing new instances before saving
      if (action !== "test") {
        return new Response(
          JSON.stringify({ error: "instance_id é obrigatório para esta ação" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = body.url;
      apiUser = body.api_user;
      apiToken = body.api_token;
    } else {
      return new Response(
        JSON.stringify({ error: "instance_id ou credenciais são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-SSRF
    const urlCheck = validateZabbixUrl(url);
    if (!urlCheck.valid) {
      return new Response(
        JSON.stringify({ error: urlCheck.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;
    switch (action) {
      case "test":
        result = await testConnection(url, apiUser, apiToken);
        break;
      case "sync":
        result = await syncMetrics(url, apiUser, apiToken);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Zabbix proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
