import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Inbox, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface Inquiry {
  id: string;
  company_name: string;
  contact_name: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  deal_value: number | null;
}

const statusLabel: Record<string, string> = {
  new: "新建",
  contacted: "已联系",
  negotiating: "洽谈中",
  won: "成交",
  lost: "丢单",
  archived: "归档",
};

const BusinessDashboard = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_inquiries")
        .select("id, company_name, contact_name, status, priority, created_at, updated_at, deal_value")
        .order("created_at", { ascending: false });
      setInquiries((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const total = inquiries.length;
  const newCount = inquiries.filter((i) => i.status === "new").length;
  const inProgress = inquiries.filter((i) => ["contacted", "negotiating"].includes(i.status)).length;
  const won = inquiries.filter((i) => i.status === "won").length;
  const lost = inquiries.filter((i) => i.status === "lost").length;
  const dealSum = inquiries
    .filter((i) => i.status === "won")
    .reduce((s, i) => s + Number(i.deal_value ?? 0), 0);
  const conversion = total > 0 ? Math.round((won / total) * 100) : 0;
  const recent = inquiries.slice(0, 8);

  return (
    <BusinessLayout>
      <h1 className="text-3xl font-bold mb-2">商务概览</h1>
      <p className="text-slate-400 mb-6">查看商务咨询整体情况与最近动态</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Inbox className="w-5 h-5" />} label="待处理" value={newCount} hint={`共 ${total} 条`} color="text-rose-300 bg-rose-500/10" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="跟进中" value={inProgress} hint="联系/洽谈" color="text-amber-300 bg-amber-500/10" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="成交" value={won} hint={`总额 ¥${dealSum.toLocaleString()}`} color="text-emerald-300 bg-emerald-500/10" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="转化率" value={`${conversion}%`} hint={`丢单 ${lost}`} color="text-sky-300 bg-sky-500/10" />
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold">最近 8 条咨询</h2>
          <Link to="/business/inquiries" className="text-xs text-sky-400 hover:underline">查看全部 →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">加载中...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">还没有任何商务咨询</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {recent.map((i) => (
              <li key={i.id}>
                <Link to={`/business/inquiries/${i.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30">
                  <div>
                    <div className="font-medium">{i.company_name}</div>
                    <div className="text-xs text-slate-500">{i.contact_name} · {new Date(i.created_at).toLocaleString()}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">{statusLabel[i.status] ?? i.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </BusinessLayout>
  );
};

const StatCard = ({ icon, label, value, hint, color }: any) => (
  <Card className="p-4 bg-slate-900 border-slate-800">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    <div className="text-2xl font-bold mt-3">{value}</div>
    <div className="text-xs text-slate-400">{label}</div>
    <div className="text-xs text-slate-600 mt-1">{hint}</div>
  </Card>
);

export default BusinessDashboard;
