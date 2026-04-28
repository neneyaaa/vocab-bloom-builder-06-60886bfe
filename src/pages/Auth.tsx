import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { BookOpen, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const signUpSchema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(20, "用户名最多 20 个字符"),
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位").max(72, "密码过长"),
});

const signInSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      username: fd.get("username"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: parsed.data.username },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("该邮箱已注册，请直接登录");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("注册成功！欢迎加入词界 🎉");
    navigate("/", { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login")) {
        toast.error("邮箱或密码错误");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("登录成功，欢迎回来！");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold">词界</span>
            <span className="text-xs text-muted-foreground">WordScope</span>
          </div>
          <p className="text-sm text-muted-foreground">登录后即可参与排位 PK 与排行榜</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl shadow-xl p-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field icon={<Mail className="h-4 w-4" />} label="邮箱" name="email" type="email" placeholder="you@example.com" />
                <Field icon={<Lock className="h-4 w-4" />} label="密码" name="password" type="password" placeholder="••••••" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field icon={<UserIcon className="h-4 w-4" />} label="用户名" name="username" type="text" placeholder="昵称将显示在排行榜" />
                <Field icon={<Mail className="h-4 w-4" />} label="邮箱" name="email" type="email" placeholder="you@example.com" />
                <Field icon={<Lock className="h-4 w-4" />} label="密码" name="password" type="password" placeholder="至少 6 位" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "注册中..." : "创建账号"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center mt-6">
          <Button variant="link" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            返回首页继续单人测评
          </Button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ icon, label, name, type, placeholder }: { icon: React.ReactNode; label: string; name: string; type: string; placeholder: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={name} className="text-sm flex items-center gap-1.5 text-muted-foreground">
      {icon}{label}
    </Label>
    <Input id={name} name={name} type={type} placeholder={placeholder} required />
  </div>
);

export default Auth;
