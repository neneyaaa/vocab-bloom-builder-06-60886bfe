import { ReactNode } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { Briefcase, Inbox, BarChart3, LogOut, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsBusinessStaff } from "@/hooks/useIsBusinessStaff";
import { Button } from "@/components/ui/button";
import { useUnreadInquiries } from "@/hooks/useUnreadInquiries";
import { Badge } from "@/components/ui/badge";

const BusinessLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { isStaff, loading } = useIsBusinessStaff();
  const { unreadCount } = useUnreadInquiries();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        加载中...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/business" replace />;
  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3 p-6">
        <Briefcase className="w-10 h-10 text-slate-600" />
        <p>你没有商务后台权限。</p>
        <p className="text-xs text-slate-500">请联系管理员授予「商务」角色。</p>
        <Button variant="ghost" onClick={() => navigate("/")}>返回首页</Button>
      </div>
    );
  }

  const linkBase =
    "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors";
  const linkActive = "bg-sky-500/20 text-sky-300";
  const linkIdle = "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-60 border-r border-slate-800 flex flex-col p-4 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="font-semibold">商务后台</div>
            <div className="text-xs text-slate-500">Business CRM</div>
          </div>
        </div>

        <NavLink to="/business" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <span className="flex items-center gap-3"><BarChart3 className="w-4 h-4" /> 概览</span>
        </NavLink>
        <NavLink to="/business/inquiries" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <span className="flex items-center gap-3"><Inbox className="w-4 h-4" /> 商务工单</span>
          {unreadCount > 0 && (
            <Badge className="bg-rose-500 text-white h-5 min-w-5 px-1.5 rounded-full text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </NavLink>

        <div className="mt-auto flex flex-col gap-1">
          <Button
            variant="ghost"
            className="justify-start text-slate-400 hover:text-slate-100"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4 mr-2" /> 返回前台
          </Button>
          <Button
            variant="ghost"
            className="justify-start text-slate-400 hover:text-rose-400"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
};

export default BusinessLayout;
