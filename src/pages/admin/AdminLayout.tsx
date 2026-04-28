import { ReactNode } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { Shield, BookOpen, Users, LogOut, Home, ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        加载中...
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const linkBase =
    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors";
  const linkActive = "bg-amber-500/20 text-amber-300";
  const linkIdle = "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-60 border-r border-slate-800 flex flex-col p-4 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="font-semibold">管理后台</div>
            <div className="text-xs text-slate-500">WordScope Admin</div>
          </div>
        </div>

        <NavLink to="/admin" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <Shield className="w-4 h-4" /> 概览
        </NavLink>
        <NavLink to="/admin/words" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <BookOpen className="w-4 h-4" /> 词汇库管理
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <Users className="w-4 h-4" /> 用户管理
        </NavLink>
        <NavLink to="/admin/banners" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <ImageIcon className="w-4 h-4" /> 广告位管理
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
            onClick={async () => { await signOut(); navigate("/admin/login"); }}
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

export default AdminLayout;
