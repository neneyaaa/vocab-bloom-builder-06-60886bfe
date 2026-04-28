import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    // 验证管理员
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "需要管理员权限" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "消息格式错误" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 注入系统统计 ===
    const [
      { count: totalUsers },
      { count: totalWords },
      { count: enabledWords },
      { count: totalMatches },
      { count: bannedUsers },
      { count: pendingInquiries },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("words").select("*", { count: "exact", head: true }),
      admin.from("words").select("*", { count: "exact", head: true }).eq("enabled", true),
      admin.from("match_results").select("*", { count: "exact", head: true }),
      admin.from("user_bans").select("*", { count: "exact", head: true }),
      admin.from("partner_inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    ]);

    const systemPrompt = `你是"词海争锋"App 的管理员智能助手。你的服务对象是平台管理员。

== 你的能力 ==
1. 解答管理员"如何操作"的问题（封禁、删词、生成词汇等）。
2. 提供平台数据洞察（基于下面的实时统计）。
3. 推荐管理操作的入口链接（用 markdown 链接）。
4. 不直接执行任何修改操作 —— 始终引导管理员到对应页面亲自操作（更安全）。

== 管理后台页面 ==
- 仪表盘: [/admin](/admin)
- 词汇库管理: [/admin/words](/admin/words) — 增删改查、JSON 导入导出、AI 自动生成
- 用户管理: [/admin/users](/admin/users) — 查看、封禁/解封、重置头像昵称、授予管理员

== 常见操作指南 ==

### 封禁用户
1. 访问 [/admin/users](/admin/users)
2. 通过邮箱或昵称搜索目标用户
3. 点击"封禁"按钮，可填写封禁原因
4. 系统会自动将该用户登出且阻止再次登录
5. 在同一行点击"解封"可以恢复

### 添加词汇
- **手动**：[/admin/words](/admin/words) → 点击"新增" → 填写单词、释义、4个选项（必须包含正确释义）
- **批量**：点击"导入" → 上传 JSON 文件 → 系统会校验重复 / 无效行 → 二次确认后导入
- **AI 生成**：点击"AI 生成" → 输入主题（如"商务英语"） → 选数量和难度 → 自动入库

### 删除词汇
1. [/admin/words](/admin/words) 中找到该词条
2. 点击垃圾桶图标
3. 或先点击"停用"让用户不可见，保留数据

### 重置用户资料
1. [/admin/users](/admin/users) → 找到用户 → 点击"重置"
2. 可以清除头像或修改昵称

### 授予/撤销管理员权限
1. [/admin/users](/admin/users) → 找到目标用户
2. 点击"授予管理员"或"撤销管理员"

== 实时数据 ==
- 注册用户总数: ${totalUsers ?? 0}
- 被封禁用户: ${bannedUsers ?? 0}
- 词汇总数: ${totalWords ?? 0}（启用 ${enabledWords ?? 0}）
- 总对战场次: ${totalMatches ?? 0}
- 待处理招商咨询: ${pendingInquiries ?? 0}

回答风格：专业、简洁，用 markdown 列表/标题排版。引用功能时一定附上跳转链接。`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "请求过于频繁" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI 额度不足" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI 服务暂时不可用" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "服务器错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
