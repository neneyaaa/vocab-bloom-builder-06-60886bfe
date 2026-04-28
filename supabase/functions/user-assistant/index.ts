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
      return new Response(JSON.stringify({ error: "请先登录" }), {
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
    const userId = userData.user.id;

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "消息格式错误" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 注入用户上下文 ===
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [{ data: profile }, { data: matches }] = await Promise.all([
      admin.from("profiles").select("username, created_at").eq("id", userId).maybeSingle(),
      admin
        .from("match_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const total = matches?.length ?? 0;
    const wins = matches?.filter((m: any) => m.result === "win").length ?? 0;
    const losses = matches?.filter((m: any) => m.result === "lose").length ?? 0;
    const draws = matches?.filter((m: any) => m.result === "draw").length ?? 0;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0";

    // 最近一场
    const last = matches?.[0];
    const lastSummary = last
      ? `最近一场: ${last.result === "win" ? "胜" : last.result === "lose" ? "负" : "平"} (我 ${last.score} : ${last.opponent_score} 对手) — ${new Date(last.created_at).toLocaleString("zh-CN")}`
      : "暂无对战记录";

    const recentList = (matches ?? [])
      .slice(0, 10)
      .map(
        (m: any, i: number) =>
          `${i + 1}. ${new Date(m.created_at).toLocaleString("zh-CN")} | ${m.result === "win" ? "胜🏆" : m.result === "lose" ? "负" : "平"} | 比分 ${m.score}:${m.opponent_score}`
      )
      .join("\n");

    const systemPrompt = `你是"词海争锋"英语单词学习App的智能助手。你的任务：
1. 友好、简洁地回答用户问题（用中文）。
2. 引导用户使用App功能时，建议跳转链接（用 markdown 链接格式，路径而非完整URL）。
3. 当用户问到自己的战绩、PK情况时，基于下面的真实数据回答。
4. 不要编造数据。如果数据为空就如实说"暂无记录"。

== 应用功能页面（用 markdown 链接引导用户）==
- 首页: [/](/)
- 词汇测试: [/test](/test)
- PK 对战大厅: [/pk](/pk) ← 用户想真人PK就引导到这里
- 排行榜: [/leaderboard](/leaderboard)
- 我的战绩详情: [/my-stats](/my-stats)
- 个人资料(头像/昵称): [/profile](/profile)
- 历史记录: [/history](/history)
- 招商合作: [/partners](/partners)

== 当前用户信息 ==
- 昵称: ${profile?.username ?? "（未设置）"}
- 注册时间: ${profile?.created_at ? new Date(profile.created_at).toLocaleDateString("zh-CN") : "未知"}

== 战绩统计 ==
- 总场次: ${total}
- 胜: ${wins} | 负: ${losses} | 平: ${draws}
- 胜率: ${winRate}%
- ${lastSummary}

== 最近10场对战 ==
${recentList || "（暂无）"}

回答风格：简短、亲切、用 markdown 排版。不要重复列表所有数据，用户问什么答什么。`;

    // === Stream from Lovable AI ===
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
      return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI 额度不足，请联系管理员" }), {
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
    console.error("user-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "服务器错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
