import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, Trophy, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ words: 0, matches: 0, profiles: 0 });

  useEffect(() => {
    (async () => {
      const [w, m, p] = await Promise.all([
        supabase.from("words").select("id", { count: "exact", head: true }),
        supabase.from("match_results").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setStats({ words: w.count ?? 0, matches: m.count ?? 0, profiles: p.count ?? 0 });
    })();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-2">仪表盘</h1>
      <p className="text-slate-400 mb-8">系统概览</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <BookOpen className="w-8 h-8 text-amber-400" />
            <span className="text-3xl font-bold">{stats.words}</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">词汇总数</p>
        </Card>
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-sky-400" />
            <span className="text-3xl font-bold">{stats.profiles}</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">注册用户</p>
        </Card>
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <Trophy className="w-8 h-8 text-emerald-400" />
            <span className="text-3xl font-bold">{stats.matches}</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">PK 对战记录</p>
        </Card>
      </div>

      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-amber-400 mt-1" />
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-100">数据存储说明</p>
            <p><strong className="text-amber-300">用户信息</strong>：账号（邮箱/密码）存于 Lovable Cloud 认证系统；昵称与头像存于 <code>profiles</code> 表；头像图片存于 Storage 的 <code>avatars</code> 桶。</p>
            <p><strong className="text-amber-300">词汇库</strong>：所有词条存于 <code>words</code> 表（字段：word, meaning, options, difficulty, category, enabled）。前端通过缓存读取。</p>
            <p><strong className="text-amber-300">对战数据</strong>：每场 PK 结果存于 <code>match_results</code>，排行榜按周/月聚合。</p>
            <p><strong className="text-amber-300">权限</strong>：角色存于 <code>user_roles</code>，封禁名单存于 <code>user_bans</code>。所有表都启用了行级安全（RLS）。</p>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
