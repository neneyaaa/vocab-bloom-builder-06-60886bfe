import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Mail, Phone, MessageSquare, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Inquiry {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  message: string;
  budget_range: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  next_followup_at: string | null;
  deal_value: number | null;
  created_at: string;
  updated_at: string;
}

interface Followup {
  id: string;
  inquiry_id: string;
  author_id: string;
  channel: string;
  content: string;
  created_at: string;
  author?: { username: string; avatar_url: string | null };
}

interface Staff { id: string; username: string; avatar_url: string | null; roles: string[] }

const STATUS_OPTIONS = [
  { v: "new", label: "新建" },
  { v: "contacted", label: "已联系" },
  { v: "negotiating", label: "洽谈中" },
  { v: "won", label: "成交" },
  { v: "lost", label: "丢单" },
  { v: "archived", label: "归档" },
];
const PRIORITY_OPTIONS = [
  { v: "high", label: "高" },
  { v: "medium", label: "中" },
  { v: "low", label: "低" },
];
const CHANNEL_OPTIONS = [
  { v: "note", label: "📝 备注" },
  { v: "phone", label: "📞 电话" },
  { v: "email", label: "✉️ 邮件" },
  { v: "wechat", label: "💬 微信" },
  { v: "meeting", label: "🤝 会议" },
];

const InquiryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newChannel, setNewChannel] = useState("note");

  const load = async () => {
    if (!id) return;
    const [{ data: inq, error }, { data: fups }, { data: staffRes }] = await Promise.all([
      supabase.from("partner_inquiries").select("*").eq("id", id).maybeSingle(),
      supabase.from("inquiry_followups").select("*").eq("inquiry_id", id).order("created_at", { ascending: false }),
      supabase.functions.invoke("admin-api", { body: { action: "list_business_staff" } }),
    ]);
    if (error || !inq) {
      toast.error("加载失败或工单不存在");
      navigate("/business/inquiries");
      return;
    }
    setInquiry(inq as any);
    // Load author profiles for followups
    const authorIds = Array.from(new Set((fups ?? []).map((f: any) => f.author_id)));
    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", authorIds);
      authorMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    setFollowups((fups ?? []).map((f: any) => ({ ...f, author: authorMap.get(f.author_id) })));
    if (!(staffRes as any)?.error) {
      setStaff((staffRes as any)?.staff ?? []);
    }
    setLoading(false);
  };

  // Mark as read whenever inquiry is loaded
  useEffect(() => {
    if (!user || !inquiry) return;
    supabase
      .from("inquiry_reads")
      .upsert({ user_id: user.id, inquiry_id: inquiry.id, read_at: new Date().toISOString() })
      .then(() => {});
  }, [user?.id, inquiry?.id, inquiry?.updated_at]);

  useEffect(() => { load(); }, [id]);

  const update = async (patch: Partial<Inquiry>) => {
    if (!inquiry) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("partner_inquiries")
      .update(patch)
      .eq("id", inquiry.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInquiry(data as any);
    toast.success("已更新");
  };

  const addFollowup = async () => {
    if (!inquiry || !user || !newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("inquiry_followups").insert({
      inquiry_id: inquiry.id,
      author_id: user.id,
      channel: newChannel,
      content: newNote.trim(),
    });
    // Bump updated_at on the inquiry so other staff see it as "new activity"
    await supabase.from("partner_inquiries")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", inquiry.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setNewNote("");
    setNewChannel("note");
    toast.success("跟进已记录");
    load();
  };

  const deleteFollowup = async (fid: string) => {
    if (!confirm("确定删除这条跟进记录？")) return;
    const { error } = await supabase.from("inquiry_followups").delete().eq("id", fid);
    if (error) { toast.error(error.message); return; }
    toast.success("已删除");
    load();
  };

  if (loading || !inquiry) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
        </div>
      </BusinessLayout>
    );
  }

  const assignedStaff = staff.find((s) => s.id === inquiry.assigned_to);

  return (
    <BusinessLayout>
      <Link to="/business/inquiries" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Customer info + history */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 bg-slate-900 border-slate-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-400" /> {inquiry.company_name}
                </h1>
                <div className="text-xs text-slate-500 mt-1">
                  提交于 {new Date(inquiry.created_at).toLocaleString()} · 类型 {inquiry.inquiry_type}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
              <div>
                <div className="text-xs text-slate-500">联系人</div>
                <div className="text-slate-200">{inquiry.contact_name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500"><Mail className="w-3 h-3 inline mr-1" />邮箱</div>
                <a href={`mailto:${inquiry.email}`} className="text-sky-300 hover:underline">{inquiry.email}</a>
              </div>
              {inquiry.phone && (
                <div>
                  <div className="text-xs text-slate-500"><Phone className="w-3 h-3 inline mr-1" />电话</div>
                  <a href={`tel:${inquiry.phone}`} className="text-sky-300 hover:underline">{inquiry.phone}</a>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500">预算范围</div>
                <div className="text-slate-200">{inquiry.budget_range ?? "—"}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-500 mb-1">客户留言</div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{inquiry.message}</p>
            </div>
          </Card>

          {/* Followup composer */}
          <Card className="p-5 bg-slate-900 border-slate-800">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" /> 添加跟进
            </h2>
            <div className="flex gap-2 mb-2">
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="记录这次沟通的要点：客户需求、报价、下一步..."
              className="bg-slate-800 border-slate-700 min-h-24"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={addFollowup}
                disabled={saving || !newNote.trim()}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Send className="w-4 h-4 mr-1" /> 提交跟进
              </Button>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5 bg-slate-900 border-slate-800">
            <h2 className="font-semibold mb-4">沟通记录 ({followups.length})</h2>
            {followups.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6">暂无沟通记录</div>
            ) : (
              <ol className="space-y-4">
                {followups.map((f) => {
                  const ch = CHANNEL_OPTIONS.find((c) => c.v === f.channel);
                  return (
                    <li key={f.id} className="border-l-2 border-slate-800 pl-4 relative group">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-sky-500/40 border-2 border-slate-900" />
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>
                          {ch?.label ?? f.channel} · {f.author?.username ?? "未知"} · {new Date(f.created_at).toLocaleString()}
                        </span>
                        {f.author_id === user?.id && (
                          <button
                            onClick={() => deleteFollowup(f.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{f.content}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 bg-slate-900 border-slate-800">
            <h2 className="font-semibold mb-3">工单信息</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-slate-500">状态</Label>
                <Select value={inquiry.status} onValueChange={(v) => update({ status: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">优先级</Label>
                <Select value={inquiry.priority} onValueChange={(v) => update({ priority: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">分配给</Label>
                <Select
                  value={inquiry.assigned_to ?? "_none"}
                  onValueChange={(v) => update({ assigned_to: v === "_none" ? null : v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 mt-1">
                    <SelectValue placeholder="未分配" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">未分配</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.username} {s.roles.includes("admin") ? "(管理员)" : "(商务)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedStaff && (
                  <p className="text-xs text-slate-500 mt-1">当前：{assignedStaff.username}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-500">下次跟进时间</Label>
                <Input
                  type="datetime-local"
                  className="bg-slate-800 border-slate-700 mt-1"
                  value={inquiry.next_followup_at ? new Date(inquiry.next_followup_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => update({ next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">预估金额 (¥)</Label>
                <Input
                  type="number"
                  className="bg-slate-800 border-slate-700 mt-1"
                  defaultValue={inquiry.deal_value ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== inquiry.deal_value) update({ deal_value: v as any });
                  }}
                />
              </div>
              {saving && <p className="text-xs text-slate-500 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> 保存中...</p>}
            </div>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default InquiryDetail;
