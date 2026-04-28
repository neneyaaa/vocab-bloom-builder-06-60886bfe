import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Inquiry {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  status: string;
  priority: string;
  budget_range: string | null;
  deal_value: number | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  { v: "all", label: "全部" },
  { v: "new", label: "新建" },
  { v: "contacted", label: "已联系" },
  { v: "negotiating", label: "洽谈中" },
  { v: "won", label: "成交" },
  { v: "lost", label: "丢单" },
  { v: "archived", label: "归档" },
];

const statusBadge: Record<string, string> = {
  new: "bg-rose-500/20 text-rose-300",
  contacted: "bg-amber-500/20 text-amber-300",
  negotiating: "bg-sky-500/20 text-sky-300",
  won: "bg-emerald-500/20 text-emerald-300",
  lost: "bg-slate-500/20 text-slate-400",
  archived: "bg-slate-700/40 text-slate-500",
};
const statusLabel: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.v, s.label]));

const priorityBadge: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-slate-500/20 text-slate-400",
};

const InquiriesList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [reads, setReads] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: r }] = await Promise.all([
      supabase
        .from("partner_inquiries")
        .select("*")
        .order("created_at", { ascending: false }),
      user
        ? supabase.from("inquiry_reads").select("inquiry_id, read_at").eq("user_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setItems((data as any) ?? []);
    setReads(new Map((r ?? []).map((x: any) => [x.inquiry_id, x.read_at])));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !i.company_name.toLowerCase().includes(s) &&
          !i.contact_name.toLowerCase().includes(s) &&
          !i.email.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const isUnread = (i: Inquiry) => {
    const r = reads.get(i.id);
    return !r || new Date(r) < new Date(i.updated_at);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  return (
    <BusinessLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">商务工单</h1>
          <p className="text-slate-400 mt-1">共 {items.length} 条咨询 · 未读 {filtered.filter(isUnread).length}</p>
        </div>
      </div>

      <Card className="p-4 bg-slate-900 border-slate-800 mb-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索公司、联系人、邮箱..."
            className="pl-9 bg-slate-800 border-slate-700"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === s.v
                  ? "bg-sky-500/30 text-sky-200"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s.label} {counts[s.v] ? `(${counts[s.v]})` : ""}
            </button>
          ))}
        </div>
      </Card>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">无匹配工单</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 w-10"></th>
                  <th className="text-left px-4 py-2.5">公司 / 联系人</th>
                  <th className="text-left px-4 py-2.5">类型</th>
                  <th className="text-left px-4 py-2.5">状态</th>
                  <th className="text-left px-4 py-2.5">优先级</th>
                  <th className="text-left px-4 py-2.5">预算</th>
                  <th className="text-left px-4 py-2.5">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      {isUnread(i) && <span className="inline-block w-2 h-2 rounded-full bg-rose-500" title="未读" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to={`/business/inquiries/${i.id}`} className="block hover:text-sky-300">
                        <div className="font-medium">{i.company_name}</div>
                        <div className="text-xs text-slate-500">{i.contact_name} · {i.email}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs">{i.inquiry_type}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={statusBadge[i.status] ?? "bg-slate-700 text-slate-300"}>
                        {statusLabel[i.status] ?? i.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={priorityBadge[i.priority] ?? "bg-slate-700 text-slate-300"}>
                        {i.priority === "high" && <AlertCircle className="w-3 h-3 mr-1" />}
                        {i.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i.budget_range ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(i.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </BusinessLayout>
  );
};

export default InquiriesList;
