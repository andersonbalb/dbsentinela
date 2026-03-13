import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ZabbixApiRequest {
  action: "test" | "sync" | "get_hosts" | "get_metrics";
  instance_id?: string;
  url: string;
  api_user: string;
  api_token: string;
}

async function zabbixApiCall(
  url: string,
  method: string,
  params: Record<string, unknown>,
  authToken?: string
): Promise<unknown> {
  const apiUrl = url.endsWith("/api_jsonrpc.php")
    ? url
    : `${url}/api_jsonrpc.php`;

  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };

  if (authToken) {
    body.auth = authToken;
  }

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
    throw new Error(
      data.error.data || data.error.message || JSON.stringify(data.error)
    );
  }
  return data.result;
}

async function authenticate(
  url: string,
  user: string,
  password: string
): Promise<string> {
  const result = await zabbixApiCall(url, "user.login", {
    user,
    password,
  });
  return result as string;
}

async function testConnection(url: string, user: string, token: string) {
  try {
    // Try token-based auth first (Zabbix 5.4+)
    const version = await zabbixApiCall(url, "apiinfo.version", {});

    // Try to authenticate
    let authToken: string;
    try {
      // Try as API token (Zabbix 6.4+) - direct use
      await zabbixApiCall(url, "host.get", { limit: 1, output: ["hostid"] }, token);
      authToken = token;
    } catch {
      // Fallback: try user.login with token as password
      authToken = await authenticate(url, user, token);
    }

    // Get host count
    const hosts = await zabbixApiCall(
      url,
      "host.get",
      { countOutput: true },
      authToken
    );

    return {
      success: true,
      version: version as string,
      hostsCount: parseInt(hosts as string, 10),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function syncMetrics(url: string, user: string, token: string) {
  try {
    // Authenticate
    let authToken: string;
    try {
      await zabbixApiCall(url, "host.get", { limit: 1, output: ["hostid"] }, token);
      authToken = token;
    } catch {
      authToken = await authenticate(url, user, token);
    }

    // Get all monitored hosts
    const hosts = (await zabbixApiCall(
      url,
      "host.get",
      {
        output: ["hostid", "host", "name", "status"],
        selectInterfaces: ["ip"],
        filter: { status: 0 }, // only monitored
        limit: 100,
      },
      authToken
    )) as Array<{
      hostid: string;
      host: string;
      name: string;
      status: string;
    }>;

    // Get latest CPU, memory, disk items for each host
    const hostIds = hosts.map((h) => h.hostid);
    const items = (await zabbixApiCall(
      url,
      "item.get",
      {
        hostids: hostIds,
        output: ["hostid", "key_", "lastvalue", "name"],
        search: {
          key_: "system.cpu.util,vm.memory.utilization,vfs.fs.size",
        },
        searchByAny: true,
        sortfield: "key_",
        limit: hostIds.length * 10,
      },
      authToken
    )) as Array<{
      hostid: string;
      key_: string;
      lastvalue: string;
      name: string;
    }>;

    // Build metrics per host
    const metrics = hosts.map((host) => {
      const hostItems = items.filter((i) => i.hostid === host.hostid);
      const cpuItem = hostItems.find(
        (i) =>
          i.key_.includes("cpu.util") || i.key_.includes("system.cpu")
      );
      const memItem = hostItems.find(
        (i) =>
          i.key_.includes("memory.utilization") ||
          i.key_.includes("vm.memory")
      );
      const diskItem = hostItems.find(
        (i) => i.key_.includes("vfs.fs.size") || i.key_.includes("disk")
      );

      const cpu = cpuItem ? parseFloat(cpuItem.lastvalue) : 0;
      const memory = memItem ? parseFloat(memItem.lastvalue) : 0;
      const disk = diskItem ? parseFloat(diskItem.lastvalue) : 0;

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

    return {
      success: true,
      hostsFound: hosts.length,
      metricsCollected: items.length,
      metrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      hostsFound: 0,
      metricsCollected: 0,
      metrics: [],
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
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

    const body: ZabbixApiRequest = await req.json();
    const { action, url, api_user, api_token } = body;

    if (!url || !api_user || !api_token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: url, api_user, api_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;

    switch (action) {
      case "test":
        result = await testConnection(url, api_user, api_token);
        break;
      case "sync":
        result = await syncMetrics(url, api_user, api_token);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Zabbix proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});