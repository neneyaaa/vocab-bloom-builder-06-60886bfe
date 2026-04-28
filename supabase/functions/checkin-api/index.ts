// Edge function: 打卡返虚拟币 API
// Actions: enroll | checkin | get_state | get_history | cancel
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // 兜底建钱包
    await admin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

    if (action === "get_state") {
      const { data: wallet } = await admin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
      const { data: plan } = await admin
        .from("checkin_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let todayChecked = false;
      if (plan) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: rec } = await admin
          .from("checkin_records")
          .select("id")
          .eq("plan_id", plan.id)
          .eq("checkin_date", today)
          .maybeSingle();
        todayChecked = !!rec;
      }

      return json({ wallet: wallet ?? { user_id: userId, coins: 0 }, plan, todayChecked });
    }

    if (action === "enroll") {
      // 检查是否已有 active 计划
      const { data: existing } = await admin
        .from("checkin_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (existing) return json({ error: "你已有进行中的打卡计划" }, 400);

      const { data: wallet } = await admin.from("wallets").select("coins").eq("user_id", userId).maybeSingle();
      const balance = wallet?.coins ?? 0;
      const cost = 99;
      if (balance < cost) {
        return json({ error: `余额不足，需要 ${cost} 币，当前 ${balance} 币` }, 400);
      }

      // 扣款
      const { error: upErr } = await admin
        .from("wallets")
        .update({ coins: balance - cost, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (upErr) throw upErr;

      // 建计划
      const { data: plan, error: planErr } = await admin
        .from("checkin_plans")
        .insert({ user_id: userId, enroll_cost: cost })
        .select()
        .single();
      if (planErr) throw planErr;

      await admin.from("coin_transactions").insert({
        user_id: userId,
        amount: -cost,
        reason: "enroll_charge",
        ref_id: plan.id,
      });

      return json({ ok: true, plan });
    }

    if (action === "checkin") {
      const testRunId = body.test_run_id as string | undefined;
      if (!testRunId) return json({ error: "缺少 test_run_id" }, 400);

      const { data: plan } = await admin
        .from("checkin_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!plan) return json({ error: "尚未报名打卡计划" }, 400);

      const { data: run } = await admin
        .from("test_runs")
        .select("id, accuracy, user_id, created_at")
        .eq("id", testRunId)
        .maybeSingle();
      if (!run || run.user_id !== userId) return json({ error: "测评记录不存在" }, 400);

      if (run.accuracy < plan.required_accuracy) {
        return json({ error: `正确率 ${run.accuracy}% 低于门槛 ${plan.required_accuracy}%，今日不计打卡` }, 400);
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data: existed } = await admin
        .from("checkin_records")
        .select("id")
        .eq("plan_id", plan.id)
        .eq("checkin_date", today)
        .maybeSingle();
      if (existed) return json({ error: "今日已打卡" }, 400);

      // 写打卡记录
      const reward = plan.daily_reward;
      const { error: recErr } = await admin.from("checkin_records").insert({
        plan_id: plan.id,
        user_id: userId,
        checkin_date: today,
        test_run_id: testRunId,
        accuracy: run.accuracy,
        reward_coins: reward,
      });
      if (recErr) throw recErr;

      const newDays = plan.days_completed + 1;
      const isCompleted = newDays >= plan.required_days;

      // 更新计划
      await admin
        .from("checkin_plans")
        .update({
          days_completed: newDays,
          last_checkin_date: today,
          status: isCompleted ? "completed" : "active",
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", plan.id);

      // 当日奖励
      const { data: w } = await admin.from("wallets").select("coins").eq("user_id", userId).maybeSingle();
      let newBalance = (w?.coins ?? 0) + reward;
      await admin.from("coin_transactions").insert({
        user_id: userId,
        amount: reward,
        reason: "checkin_reward",
        ref_id: plan.id,
      });

      // 完成奖励
      if (isCompleted) {
        newBalance += plan.reward_total;
        await admin.from("coin_transactions").insert({
          user_id: userId,
          amount: plan.reward_total,
          reason: "completion_bonus",
          ref_id: plan.id,
        });
      }

      await admin
        .from("wallets")
        .update({ coins: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return json({
        ok: true,
        days_completed: newDays,
        required_days: plan.required_days,
        completed: isCompleted,
        reward_today: reward,
        completion_bonus: isCompleted ? plan.reward_total : 0,
        new_balance: newBalance,
      });
    }

    if (action === "get_history") {
      const { data: plans } = await admin
        .from("checkin_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const { data: records } = await admin
        .from("checkin_records")
        .select("*")
        .eq("user_id", userId)
        .order("checkin_date", { ascending: false })
        .limit(120);
      const { data: txs } = await admin
        .from("coin_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ plans, records, transactions: txs });
    }

    if (action === "cancel") {
      const { data: plan } = await admin
        .from("checkin_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!plan) return json({ error: "无进行中计划" }, 400);
      await admin.from("checkin_plans").update({ status: "cancelled" }).eq("id", plan.id);
      return json({ ok: true });
    }

    // Admin: 充值（用于测试或运营）
    if (action === "admin_grant_coins") {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const target = body.target_user_id as string;
      const amount = Number(body.amount ?? 0);
      if (!target || !amount) return json({ error: "缺少参数" }, 400);
      await admin.from("wallets").upsert({ user_id: target }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: w } = await admin.from("wallets").select("coins").eq("user_id", target).maybeSingle();
      await admin.from("wallets").update({ coins: (w?.coins ?? 0) + amount, updated_at: new Date().toISOString() }).eq("user_id", target);
      await admin.from("coin_transactions").insert({ user_id: target, amount, reason: "admin_grant" });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("checkin-api error", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
