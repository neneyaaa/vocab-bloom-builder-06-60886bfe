import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Upload, ImagePlus } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  placement: string;
  sort_order: number;
  enabled: boolean;
}

const PLACEMENTS = [
  { value: "home_features", label: "首页 (Features 之后)" },
  { value: "home_hero", label: "首页 Hero 下方" },
  { value: "result", label: "测评结果页" },
];

const BannersAdmin = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [placement, setPlacement] = useState("home_features");
  const [sortOrder, setSortOrder] = useState(0);
  const [imageUrl, setImageUrl] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_banners")
      .select("*")
      .order("placement")
      .order("sort_order");
    if (error) toast.error(error.message);
    setBanners(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("promo-banners").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("promo-banners").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success("图片上传成功");
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!title || !imageUrl) {
      toast.error("请填写标题并上传图片");
      return;
    }
    const { error } = await supabase.from("promo_banners").insert({
      title,
      subtitle: subtitle || null,
      image_url: imageUrl,
      placement,
      sort_order: sortOrder,
      enabled: true,
    });
    if (error) return toast.error(error.message);
    toast.success("已添加");
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setSortOrder(0);
    load();
  };

  const toggleEnabled = async (b: Banner) => {
    const { error } = await supabase
      .from("promo_banners")
      .update({ enabled: !b.enabled })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除？")) return;
    const { error } = await supabase.from("promo_banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">广告位管理</h1>
          <p className="text-sm text-slate-400">管理首页/结果页的明星推荐位</p>
        </div>

        {/* Create form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ImagePlus className="w-4 h-4" /> 新增广告位
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">标题 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-800 border-slate-700"
                placeholder="如：周杰伦倾情推荐"
              />
            </div>
            <div>
              <Label className="text-slate-300">副标题</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="bg-slate-800 border-slate-700"
                placeholder="如：用词界，每天提升 50 词"
              />
            </div>
            <div>
              <Label className="text-slate-300">展示位置</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">排序 (越小越靠前)</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">图片</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm">
                  <Upload className="w-4 h-4" />
                  {uploading ? "上传中..." : "上传图片"}
                </span>
              </label>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                />
              )}
            </div>
          </div>

          <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            添加广告位
          </Button>
        </div>

        {/* List */}
        <div>
          <h2 className="font-semibold mb-3">现有广告位 ({banners.length})</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">加载中...</p>
          ) : banners.length === 0 ? (
            <p className="text-slate-500 text-sm">还没有广告位</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-3"
                >
                  <img
                    src={b.image_url}
                    alt={b.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.title}</div>
                    {b.subtitle && (
                      <div className="text-xs text-slate-400 truncate">{b.subtitle}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      {PLACEMENTS.find((p) => p.value === b.placement)?.label} · 排序 {b.sort_order}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={b.enabled} onCheckedChange={() => toggleEnabled(b)} />
                        <span className="text-xs text-slate-400">
                          {b.enabled ? "启用中" : "已下架"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => handleDelete(b.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default BannersAdmin;
