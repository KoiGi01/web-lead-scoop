import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type PlanKey = "free" | "starter" | "growth" | "pro";

const PLAN_CREDITS: Record<PlanKey, number> = {
  free: 30,
  starter: 100,
  growth: 300,
  pro: 700,
};

const isPlanKey = (value: unknown): value is PlanKey =>
  value === "free" || value === "starter" || value === "growth" || value === "pro";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getCaller = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, isAdmin: false };

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, isAdmin: false };

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const isOperatorEmail = data.user.email?.toLowerCase() === "contact@globaleads22.com";
  return { user: data.user, isAdmin: Boolean(adminRow && isOperatorEmail) };
};

const getAllAuthUsers = async () => {
  const users: unknown[] = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < 1000) break;
    page += 1;
  }
  return users as Array<{
    id: string;
    email?: string;
    created_at?: string;
    last_sign_in_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }>;
};

const listUsers = async () => {
  const [
    authUsers,
    creditsResult,
    profilesResult,
    adminsResult,
    sessionsResult,
    paymentsResult,
    membershipsResult,
    organizationsResult,
  ] = await Promise.all([
    getAllAuthUsers(),
    supabase.from("user_credits").select("*"),
    supabase.from("user_profiles").select("*"),
    supabase.from("admin_users").select("*"),
    supabase.from("search_sessions").select("user_id, lead_count, created_at"),
    supabase.from("stripe_payments").select("user_id, gross_usd, net_usd, credits_granted, created_at"),
    supabase.from("organization_memberships").select("*").eq("status", "active"),
    supabase.from("organizations").select("*"),
  ]);

  if (creditsResult.error) throw creditsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (adminsResult.error) throw adminsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;
  if (organizationsResult.error) throw organizationsResult.error;

  const creditsByUser = new Map((creditsResult.data || []).map((row) => [row.user_id, row]));
  const profilesByUser = new Map((profilesResult.data || []).map((row) => [row.id, row]));
  const adminsByUser = new Map((adminsResult.data || []).map((row) => [row.user_id, row]));
  const orgsById = new Map((organizationsResult.data || []).map((row) => [row.id, row]));
  const membershipsByUser = new Map((membershipsResult.data || []).map((row) => [row.user_id, row]));

  const sessionsByUser = new Map<string, { searches: number; leads: number; lastActivity: string | null }>();
  (sessionsResult.data || []).forEach((session) => {
    if (!session.user_id) return;
    const current = sessionsByUser.get(session.user_id) || { searches: 0, leads: 0, lastActivity: null };
    current.searches += 1;
    current.leads += Number(session.lead_count || 0);
    if (!current.lastActivity || String(session.created_at) > current.lastActivity) current.lastActivity = String(session.created_at);
    sessionsByUser.set(session.user_id, current);
  });

  const paymentsByUser = new Map<string, { gross: number; net: number; credits: number; count: number; lastPayment: string | null }>();
  (paymentsResult.data || []).forEach((payment) => {
    if (!payment.user_id) return;
    const current = paymentsByUser.get(payment.user_id) || { gross: 0, net: 0, credits: 0, count: 0, lastPayment: null };
    current.gross += Number(payment.gross_usd || 0);
    current.net += Number(payment.net_usd || 0);
    current.credits += Number(payment.credits_granted || 0);
    current.count += 1;
    if (!current.lastPayment || String(payment.created_at) > current.lastPayment) current.lastPayment = String(payment.created_at);
    paymentsByUser.set(payment.user_id, current);
  });

  const rows = authUsers.map((authUser) => {
    const credits = creditsByUser.get(authUser.id);
    const profile = profilesByUser.get(authUser.id);
    const admin = adminsByUser.get(authUser.id);
    const membership = membershipsByUser.get(authUser.id);
    const org = membership ? orgsById.get(membership.organization_id) : null;
    const usage = sessionsByUser.get(authUser.id) || { searches: 0, leads: 0, lastActivity: null };
    const payments = paymentsByUser.get(authUser.id) || { gross: 0, net: 0, credits: 0, count: 0, lastPayment: null };

    return {
      id: authUser.id,
      email: authUser.email || "",
      full_name: profile?.full_name || null,
      role_title: profile?.role_title || null,
      company_name: profile?.company_name || null,
      company_website: profile?.company_website || null,
      phone: profile?.phone || null,
      date_joined: authUser.created_at || profile?.created_at || null,
      last_sign_in_at: authUser.last_sign_in_at || null,
      last_activity_at: usage.lastActivity,
      credits_left: credits?.balance ?? 0,
      plan: credits?.plan || "free",
      role: admin?.role || "user",
      subscription_status: credits?.subscription_status || "none",
      stripe_customer_id: credits?.stripe_customer_id || null,
      stripe_subscription_id: credits?.stripe_subscription_id || null,
      included_monthly_credits: credits?.included_monthly_credits || PLAN_CREDITS.free,
      leads_generated: usage.leads,
      searches_run: usage.searches,
      organization_id: org?.id || null,
      organization_name: org?.name || null,
      organization_role: membership?.role || null,
      payment_count: payments.count,
      gross_revenue_usd: payments.gross,
      net_revenue_usd: payments.net,
      credits_purchased: payments.credits,
      last_payment_at: payments.lastPayment,
    };
  });

  rows.sort((a, b) => String(b.date_joined || "").localeCompare(String(a.date_joined || "")));
  return { users: rows, organizations: organizationsResult.data || [] };
};

const updateUser = async (callerId: string, body: Record<string, unknown>) => {
  const targetUserId = String(body.targetUserId || "");
  if (!targetUserId) return json({ error: "Missing target user" }, 400);

  const before = await supabase.from("user_credits").select("*").eq("user_id", targetUserId).maybeSingle();
  const profileBefore = await supabase.from("user_profiles").select("*").eq("id", targetUserId).maybeSingle();

  const creditDelta = Number(body.creditDelta || 0);
  const plan = body.plan;
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  const roleTitle = typeof body.roleTitle === "string" ? body.roleTitle.trim() : undefined;
  const companyWebsite = typeof body.companyWebsite === "string" ? body.companyWebsite.trim() : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const role = typeof body.role === "string" ? body.role.trim() : undefined;
  const hasOrganizationUpdate = Object.prototype.hasOwnProperty.call(body, "organizationId");
  const organizationId = typeof body.organizationId === "string" && body.organizationId ? body.organizationId : null;
  const organizationRole = typeof body.organizationRole === "string" && body.organizationRole ? body.organizationRole : "member";

  if (plan !== undefined && !isPlanKey(plan)) return json({ error: "Invalid plan" }, 400);

  const { data: currentCredits } = await supabase
    .from("user_credits")
    .select("balance, stripe_customer_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const nextBalance = Math.max(0, Number(currentCredits?.balance || 0) + creditDelta);
  const creditPatch: Record<string, unknown> = {
    user_id: targetUserId,
    balance: nextBalance,
    updated_at: new Date().toISOString(),
  };

  if (plan) {
    creditPatch.plan = plan;
    creditPatch.included_monthly_credits = PLAN_CREDITS[plan];
    creditPatch.plan_source = "manual";
  }
  if (hasOrganizationUpdate) creditPatch.organization_id = organizationId;
  if (currentCredits?.stripe_customer_id) creditPatch.stripe_customer_id = currentCredits.stripe_customer_id;

  const { error: upsertError } = await supabase
    .from("user_credits")
    .upsert(creditPatch, { onConflict: "user_id" });
  if (upsertError) throw upsertError;

  if (creditDelta !== 0) {
    await supabase.from("credit_transactions").insert({
      user_id: targetUserId,
      type: "admin_adjustment",
      amount: creditDelta,
      balance_after: nextBalance,
      usage_type: "admin",
      description: "Manual admin credit adjustment",
      metadata: { admin_user_id: callerId },
    });
  }

  if (
    companyName !== undefined ||
    fullName !== undefined ||
    roleTitle !== undefined ||
    companyWebsite !== undefined ||
    phone !== undefined
  ) {
    await supabase
      .from("user_profiles")
      .upsert({
        id: targetUserId,
        company_name: companyName !== undefined ? (companyName || null) : profileBefore.data?.company_name || null,
        full_name: fullName !== undefined ? (fullName || null) : profileBefore.data?.full_name || null,
        role_title: roleTitle !== undefined ? (roleTitle || null) : profileBefore.data?.role_title || null,
        company_website: companyWebsite !== undefined ? (companyWebsite || null) : profileBefore.data?.company_website || null,
        phone: phone !== undefined ? (phone || null) : profileBefore.data?.phone || null,
        service_type: profileBefore.data?.service_type || "Lead research",
        client_type: profileBefore.data?.client_type || "any",
        pricing_tier: profileBefore.data?.pricing_tier || "mid_tier",
        sells_online: profileBefore.data?.sells_online ?? true,
      }, { onConflict: "id" });
  }

  if (role) {
    if (role === "user") {
      await supabase.from("admin_users").delete().eq("user_id", targetUserId);
    } else {
      await supabase.from("admin_users").upsert({ user_id: targetUserId, role }, { onConflict: "user_id" });
    }
  }

  if (hasOrganizationUpdate && organizationId) {
    await supabase.from("organization_memberships").upsert({
      organization_id: organizationId,
      user_id: targetUserId,
      role: organizationRole,
      status: "active",
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,user_id" });
  }

  const after = await supabase.from("user_credits").select("*").eq("user_id", targetUserId).maybeSingle();
  const profileAfter = await supabase.from("user_profiles").select("*").eq("id", targetUserId).maybeSingle();
  await supabase.from("admin_audit_log").insert({
    admin_user_id: callerId,
    target_user_id: targetUserId,
    action: "admin_update_user",
    before_data: { credits: before.data, profile: profileBefore.data },
    after_data: { credits: after.data, profile: profileAfter.data },
    metadata: { creditDelta, plan, role, organizationId, organizationRole },
  });

  return json({ success: true });
};

const createOrganization = async (callerId: string, isAdmin: boolean, body: Record<string, unknown>) => {
  const ownerUserId = isAdmin && body.ownerUserId ? String(body.ownerUserId) : callerId;
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Organization name is required" }, 400);

  if (!isAdmin) {
    const { data: credits } = await supabase.from("user_credits").select("plan").eq("user_id", callerId).maybeSingle();
    if (credits?.plan !== "pro") return json({ error: "Pro plan required" }, 403);
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name,
      owner_user_id: ownerUserId,
      plan: "pro",
      seat_limit: Number(body.seatLimit || 3),
      subscription_status: isAdmin ? "manual" : "active",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("organization_memberships").insert({
    organization_id: org.id,
    user_id: ownerUserId,
    role: "owner",
    status: "active",
  });

  await supabase.from("user_credits").update({ organization_id: org.id, updated_at: new Date().toISOString() }).eq("user_id", ownerUserId);
  await supabase.from("admin_audit_log").insert({
    admin_user_id: callerId,
    target_user_id: ownerUserId,
    action: "create_organization",
    after_data: org,
    metadata: { created_by_admin: isAdmin },
  });

  return json({ success: true, organization: org });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { user, isAdmin } = await getCaller(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = body.action;

    if (action === "create_organization") {
      return await createOrganization(user.id, isAdmin, body);
    }

    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    if (action === "list_users") return json(await listUsers());
    if (action === "update_user") return await updateUser(user.id, body);

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-users error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
