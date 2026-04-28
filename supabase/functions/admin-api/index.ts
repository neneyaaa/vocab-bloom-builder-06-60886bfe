import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const BOOTSTRAP_PASSWORD = Deno.env.get("ADMIN_BOOTSTRAP_PASSWORD") ?? "letmein-admin-2026";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ===== Public-ish action: claim admin via bootstrap password =====
    if (action === "claim_admin") {
      const { password } = body;
      if (password !== BOOTSTRAP_PASSWORD) {
        return json({ error: "管理员口令错误" }, 403);
      }
      await admin.from("user_roles").insert({ user_id: callerId, role: "admin" }).select();
      return json({ ok: true });
    }

    // ===== Verify caller is admin for the rest =====
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "需要管理员权限" }, 403);

    if (action === "list_users") {
      const page = Number(body.page ?? 1);
      const perPage = Math.min(Number(body.perPage ?? 50), 200);
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: error.message }, 500);
      const ids = list.users.map((u) => u.id);
      const [{ data: profiles }, { data: bans }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, username, avatar_url").in("id", ids),
        admin.from("user_bans").select("user_id, reason, created_at").in("user_id", ids),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const bmap = new Map((bans ?? []).map((b: any) => [b.user_id, b]));
      const rmap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push(r.role);
        rmap.set(r.user_id, arr);
      });
      return json({
        users: list.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          profile: pmap.get(u.id) ?? null,
          banned: bmap.has(u.id),
          ban_reason: bmap.get(u.id)?.reason ?? null,
          roles: rmap.get(u.id) ?? [],
        })),
        total: list.total ?? list.users.length,
      });
    }

    if (action === "ban_user") {
      const { user_id, reason } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      await admin.from("user_bans").upsert({ user_id, reason: reason ?? null, banned_by: callerId });
      // Also revoke active sessions
      await admin.auth.admin.signOut(user_id).catch(() => {});
      return json({ ok: true });
    }

    if (action === "unban_user") {
      const { user_id } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      await admin.from("user_bans").delete().eq("user_id", user_id);
      return json({ ok: true });
    }

    if (action === "reset_profile") {
      const { user_id, username, avatar_url } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      const upd: any = {};
      if (typeof username === "string") upd.username = username;
      if (avatar_url !== undefined) upd.avatar_url = avatar_url;
      await admin.from("profiles").update(upd).eq("id", user_id);
      return json({ ok: true });
    }

    if (action === "grant_admin") {
      const { user_id } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      await admin.from("user_roles").upsert({ user_id, role: "admin" });
      return json({ ok: true });
    }

    if (action === "revoke_admin") {
      const { user_id } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      if (user_id === callerId) return json({ error: "不能撤销自己" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      return json({ ok: true });
    }

    if (action === "grant_business_dev") {
      const { user_id } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      await admin.from("user_roles").upsert({ user_id, role: "business_dev" });
      return json({ ok: true });
    }

    if (action === "revoke_business_dev") {
      const { user_id } = body;
      if (!user_id) return json({ error: "缺少 user_id" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "business_dev");
      return json({ ok: true });
    }

    if (action === "list_business_staff") {
      // List all users with admin or business_dev role (for inquiry assignment dropdown)
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "business_dev"]);
      const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      if (ids.length === 0) return json({ staff: [] });
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);
      const rmap = new Map<string, string[]>();
      (roleRows ?? []).forEach((r: any) => {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push(r.role);
        rmap.set(r.user_id, arr);
      });
      return json({
        staff: (profiles ?? []).map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          roles: rmap.get(p.id) ?? [],
        })),
      });
    }

    // ===== AI Generate words =====
    if (action === "ai_generate_words") {
      if (!LOVABLE_API_KEY) return json({ error: "AI 未配置" }, 500);
      const topic = String(body.topic ?? "").trim();
      const count = Math.min(Math.max(Number(body.count ?? 10), 1), 30);
      const difficulty = (body.difficulty ?? "medium") as string;
      if (!topic) return json({ error: "请输入主题" }, 400);

      const sys =
        "你是一位英语词汇出题专家。根据用户给定的主题，生成符合难度的英文单词及其4选1中文释义题。";
      const userPrompt = `主题: ${topic}\n难度: ${difficulty} (easy=高中,medium=四级,hard=六级/雅思)\n数量: ${count}\n要求:\n1) 单词必须是真实英文单词，与主题相关\n2) options 必须包含正确释义和3个干扰项，干扰项要合理\n3) meaning 必须出现在 options 中`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_words",
                description: "返回生成的词汇列表",
                parameters: {
                  type: "object",
                  properties: {
                    words: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          word: { type: "string" },
                          meaning: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 4,
                            maxItems: 4,
                          },
                        },
                        required: ["word", "meaning", "options"],
                      },
                    },
                  },
                  required: ["words"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "emit_words" } },
        }),
      });

      if (aiResp.status === 429) return json({ error: "AI 调用过于频繁，请稍后再试" }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI 额度不足，请到工作区添加额度" }, 402);
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI error:", aiResp.status, t);
        return json({ error: "AI 生成失败" }, 500);
      }

      const aiJson = await aiResp.json();
      const argsStr =
        aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(argsStr); } catch { /* */ }
      const words = (parsed.words ?? []).filter(
        (w: any) =>
          w?.word && w?.meaning && Array.isArray(w?.options) && w.options.length === 4
      );
      if (words.length === 0) return json({ error: "AI 未返回有效词汇" }, 500);

      // Insert into DB
      const rows = words.map((w: any) => ({
        word: String(w.word).trim(),
        meaning: String(w.meaning).trim(),
        options: w.options.map((o: any) => String(o).trim()),
        difficulty,
        category: topic,
        created_by: callerId,
        enabled: true,
      }));
      const { data: inserted, error: insErr } = await admin
        .from("words")
        .insert(rows)
        .select("id, word, meaning, difficulty");
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ ok: true, inserted: inserted?.length ?? 0, words: inserted });
    }

    return json({ error: "未知操作" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
