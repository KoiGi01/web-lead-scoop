import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface CreatePreviewRequest {
  token: string;
  title: string;
  description?: string;
  search_config?: Record<string, unknown>;
  leads?: unknown[];
  lead_count?: number;
  created_at?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as CreatePreviewRequest;
    const leads = asArray(body.leads).slice(0, 100);
    const title = String(body.title || "").trim().slice(0, 160);
    const token = String(body.token || "").trim();

    if (!/^[a-z0-9]{16,40}$/i.test(token) || !title || leads.length === 0) {
      return json({ error: "Invalid preview payload" }, 400);
    }

    const payload = {
      token,
      created_by: null,
      title,
      description: String(body.description || "").slice(0, 500),
      search_config: body.search_config || {},
      leads,
      lead_count: Math.min(Number(body.lead_count) || leads.length, leads.length),
      is_public: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { error } = await supabase.from("lead_list_previews").insert(payload);
    if (error) {
      console.error("create-lead-list-preview insert error:", error);
      return json({ error: "Could not create preview" }, 500);
    }

    return json({ token });
  } catch (error) {
    console.error("create-lead-list-preview error:", error);
    return json({ error: "Internal server error" }, 500);
  }
};

Deno.serve(handler);
