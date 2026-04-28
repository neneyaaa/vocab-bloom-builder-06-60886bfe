import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { ShieldOff, ShieldCheck, Pencil, Search, Loader2, Crown, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  profile: { id: string; username: string; avatar_url: string | null } | null;
  banned: boolean;
  ban_reason: string | null;
  roles: string[];
}

const UsersAdmin = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "list_users", page: 1, perPage: 200 },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "加载失败");
    } else {
      setUsers((data as any).users ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.email ?? "").toLowerCase().includes(s) ||
           (u.profile?.username ?? "").toLowerCase().includes(s);
  });

  const callApi = async (body: any, successMsg: string) => {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", { body });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success(successMsg);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "操作失败");
    } finally {
      setActing(false);
    }
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    await callApi({ action: "ban_user", user_id: banTarget.id, reason: banReason }, "已封禁");
    setBanTarget(null); setBanReason("");
  };

  const unban = (u: AdminUser) => callApi({ action: "unban_user", user_id: u.id }, "已解封");

  const resetAvatar = (u: AdminUser) =>
    callApi({ action: "reset_profile", user_id: u.id, avatar_url: null }, "已重置头像");

  const saveName = async () => {
    if (!editTarget) return;
    await callApi({ action: "reset_profile", user_id: editTarget.id, username: editName }, "已更新昵称");
    setEditTarget(null);
  };

  const grantAdmin = (u: AdminUser) => callApi({ action: "grant_admin", user_id: u.id }, "已授予管理员");
  const revokeAdmin = (u: AdminUser) => callApi({ action: "revoke_admin", user_id: u.id }, "已撤销管理员");
  const grantBiz = (u: AdminUser) => callApi({ action: "grant_business_dev", user_id: u.id }, "已授予商务");
  const revokeBiz = (u: AdminUser) => callApi({ action: "revoke_business_dev", user_id: u.id }, "已撤销商务");

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-slate-400 mt-1">共 {users.length} 个用户 · 封禁 {users.filter((u) => u.banned).length}</p>
        </div>
      </div>

      <Card className="p-4 bg-slate-900 border-slate-800 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="按邮箱或昵称搜索..." className="pl-9 bg-slate-800 border-slate-700" />
        </div>
      </Card>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5">用户</th>
                  <th className="text-left px-4 py-2.5">邮箱</th>
                  <th className="text-left px-4 py-2.5">注册时间</th>
                  <th className="text-left px-4 py-2.5">最近登录</th>
                  <th className="text-left px-4 py-2.5">角色 / 状态</th>
                  <th className="text-right px-4 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isAdmin = u.roles.includes("admin");
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar username={u.profile?.username ?? "?"} avatarUrl={u.profile?.avatar_url} size="sm" />
                          <span>{u.profile?.username ?? "—"}</span>
                          {isMe && <span className="text-xs text-amber-400">(我)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 text-xs">{u.email}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {isAdmin && <Badge className="bg-amber-500/20 text-amber-300"><Crown className="w-3 h-3 mr-1" />管理员</Badge>}
                          {u.banned && <Badge className="bg-rose-500/20 text-rose-300">已封禁</Badge>}
                          {!isAdmin && !u.banned && <span className="text-xs text-slate-500">普通用户</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => { setEditTarget(u); setEditName(u.profile?.username ?? ""); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resetAvatar(u)} title="重置头像">🖼️</Button>
                        {isAdmin
                          ? !isMe && <Button size="sm" variant="ghost" className="text-amber-400" onClick={() => revokeAdmin(u)} title="撤销管理员">取消Admin</Button>
                          : <Button size="sm" variant="ghost" className="text-amber-400" onClick={() => grantAdmin(u)} title="授予管理员">设为Admin</Button>}
                        {u.banned ? (
                          <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => unban(u)}>
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                        ) : (
                          !isMe && <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => { setBanTarget(u); setBanReason(""); }}>
                            <ShieldOff className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-8">无匹配用户</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>封禁用户 — {banTarget?.profile?.username}</DialogTitle></DialogHeader>
          <Label>原因（可选）</Label>
          <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="违反规则、刷分..." />
          <p className="text-xs text-slate-500">封禁后该用户的会话会被强制下线，再次登录将被拒绝。</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanTarget(null)}>取消</Button>
            <Button disabled={acting} className="bg-rose-500 hover:bg-rose-600" onClick={confirmBan}>确认封禁</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>修改昵称</DialogTitle></DialogHeader>
          <Label>新昵称</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-slate-800 border-slate-700" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>取消</Button>
            <Button disabled={acting} className="bg-amber-500 hover:bg-amber-600 text-slate-900" onClick={saveName}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersAdmin;
