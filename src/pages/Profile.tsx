import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const usernameSchema = z.string().trim().min(2, "用户名至少 2 个字符").max(20, "用户名最多 20 个字符");

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");

  if (!loading && !user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片大小不能超过 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;

      await refreshProfile();
      toast.success("头像更新成功 ✨");
    } catch (err) {
      console.error(err);
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (parsed.data === profile?.username) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: parsed.data })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      if (error.code === "23505") toast.error("该用户名已被占用");
      else toast.error("保存失败");
      return;
    }
    await refreshProfile();
    toast.success("用户名已更新");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <span className="font-display font-bold">个人资料</span>
        <div className="w-12" />
      </nav>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-8 space-y-8">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <UserAvatar username={profile?.username} avatarUrl={profile?.avatar_url} size="xl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-background"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            {uploading ? "上传中..." : "更换头像"}
          </Button>
          <p className="text-xs text-muted-foreground">支持 JPG/PNG，最大 2MB</p>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">用户名</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="你的昵称"
            />
            <Button onClick={handleSaveUsername} disabled={saving || username === profile?.username}>
              <Save className="h-4 w-4 mr-1" />保存
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">将显示在 PK 房间和排行榜</p>
        </div>

        {/* Email (readonly) */}
        <div className="space-y-2">
          <Label>邮箱</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>

        <div className="pt-4">
          <Button variant="outline" className="w-full" onClick={() => navigate("/my-stats")}>
            查看我的战绩
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
