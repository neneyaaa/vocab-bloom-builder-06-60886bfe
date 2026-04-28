import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrap, setBootstrap] = useState("");
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check admin role
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleRow) {
        if (showBootstrap && bootstrap) {
          // Try to claim admin
          const { data: claim, error: claimErr } = await supabase.functions.invoke("admin-api", {
            body: { action: "claim_admin", password: bootstrap },
          });
          if (claimErr || (claim as any)?.error) {
            toast.error((claim as any)?.error ?? "管理员口令错误");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          toast.success("已成为管理员");
          navigate("/admin", { replace: true });
          return;
        }
        toast.error("该账号不是管理员");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur border-slate-700">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">管理员登录</h1>
          <p className="text-sm text-slate-400 mt-1">仅授权人员可访问</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-slate-200">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-200">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {showBootstrap && (
            <div>
              <Label htmlFor="bootstrap" className="text-slate-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> 管理员口令
              </Label>
              <Input
                id="bootstrap"
                type="password"
                value={bootstrap}
                onChange={(e) => setBootstrap(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="首次声明管理员身份用"
              />
              <p className="text-xs text-slate-500 mt-1">
                默认口令：<code className="text-amber-400">letmein-admin-2026</code>，可在后端密钥中修改 <code>ADMIN_BOOTSTRAP_PASSWORD</code>
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "进入后台"}
          </Button>

          <button
            type="button"
            onClick={() => setShowBootstrap((s) => !s)}
            className="w-full text-xs text-slate-400 hover:text-amber-400 underline"
          >
            {showBootstrap ? "隐藏口令" : "首次设置：用口令将本账号声明为管理员"}
          </button>

          <Link to="/" className="block text-center text-xs text-slate-500 hover:text-slate-300">
            返回主页
          </Link>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
