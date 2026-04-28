import { useState, FormEvent, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Users, Trophy, Target, Mail, Phone, Building2, Send,
  Loader2, CheckCircle2, ArrowLeft, Megaphone, Award, Zap, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const inquirySchema = z.object({
  company_name: z.string().trim().min(1, "请填写公司名称").max(100),
  contact_name: z.string().trim().min(1, "请填写联系人").max(50),
  email: z.string().trim().email("邮箱格式不正确").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  inquiry_type: z.string().min(1, "请选择合作类型"),
  message: z.string().trim().min(10, "请至少填写 10 字").max(1000),
  budget_range: z.string().optional(),
});

const Partners = () => {
  const [stats, setStats] = useState({ users: 0, words: 0, matches: 0 });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    inquiry_type: "",
    message: "",
    budget_range: "",
  });

  useEffect(() => {
    document.title = "招商合作 · 词海争锋 — 触达年轻英语学习者";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "词海争锋诚邀品牌合作：广告位招商、联名活动、内容赞助。覆盖活跃英语学习用户，多种合作模式可选。");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "词海争锋诚邀品牌合作：广告位招商、联名活动、内容赞助。";
      document.head.appendChild(m);
    }

    // 拉取真实统计数据增加可信度
    (async () => {
      const [{ count: users }, { count: words }, { count: matches }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("words").select("*", { count: "exact", head: true }).eq("enabled", true),
        supabase.from("match_results").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        users: users ?? 0,
        words: words ?? 0,
        matches: matches ?? 0,
      });
    })();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "请检查表单");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partner_inquiries").insert({
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      inquiry_type: parsed.data.inquiry_type,
      message: parsed.data.message,
      budget_range: parsed.data.budget_range || null,
    });
    setLoading(false);
    if (error) {
      toast.error("提交失败：" + error.message);
      return;
    }
    setSubmitted(true);
    toast.success("已收到您的咨询，我们将在 2 个工作日内联系您");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 sticky top-0 z-10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Link>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            BUSINESS · 商务合作
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs mb-6">
          <Sparkles className="w-3 h-3" /> 词海争锋 · 招商合作
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-amber-200 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent leading-tight">
          触达年轻一代<br />英语学习者
        </h1>
        <p className="mt-6 text-slate-400 max-w-2xl mx-auto leading-relaxed">
          词海争锋是一个游戏化英语单词学习平台，以实时 PK 为核心玩法。
          我们的用户专注、年轻、活跃 —— 这是品牌触达精准学习人群的绝佳渠道。
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-900 font-semibold">
            <a href="#inquiry"><Megaphone className="w-4 h-4 mr-1" /> 立即咨询合作</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-700">
            <a href="#packages">查看合作方案</a>
          </Button>
        </div>
      </section>

      {/* 实时数据 */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <StatCard icon={<Users className="w-5 h-5" />} label="注册用户" value={stats.users} suffix="+" />
          <StatCard icon={<Target className="w-5 h-5" />} label="精选词汇" value={stats.words} suffix="" />
          <StatCard icon={<Trophy className="w-5 h-5" />} label="累计 PK 场次" value={stats.matches} suffix="" />
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">数据实时更新 · 持续增长中</p>
      </section>

      {/* 用户画像 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">为什么选择词海争锋？</h2>
        <p className="text-slate-400 mb-8">高质量用户画像 · 精准学习场景</p>
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Award className="w-5 h-5 text-amber-300" />}
            title="高粘性活跃用户"
            desc="用户日均使用时长 15+ 分钟，PK 玩法促进高频回访"
          />
          <FeatureCard
            icon={<Users className="w-5 h-5 text-violet-300" />}
            title="精准目标人群"
            desc="以学生与职场新人为主，对教育、留学、考试、求职高度敏感"
          />
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-300" />}
            title="持续高速增长"
            desc="新用户来自社交分享与口碑推荐，自然增长曲线健康"
          />
        </div>
      </section>

      {/* 合作方案 */}
      <section id="packages" className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">合作方案</h2>
        <p className="text-slate-400 mb-8">灵活多样 · 按需选择</p>
        <div className="grid md:grid-cols-3 gap-4">
          <PackageCard
            tier="基础"
            color="from-slate-700 to-slate-800"
            highlight={false}
            items={[
              "首页轮播广告位（1 周）",
              "PK 大厅 Banner 展示",
              "曝光数据周报",
            ]}
            cta="适合中小品牌试水"
          />
          <PackageCard
            tier="进阶"
            color="from-violet-600 to-fuchsia-600"
            highlight={true}
            items={[
              "全站固定广告位（1 月）",
              "联名词汇包（带品牌标识）",
              "排行榜冠名权",
              "专属数据看板",
              "1 次定向推送活动",
            ]}
            cta="最受合作伙伴欢迎"
          />
          <PackageCard
            tier="独家赞助"
            color="from-amber-500 to-orange-500"
            highlight={false}
            items={[
              "季度独家品牌冠名",
              "定制专属 PK 赛事",
              "线上线下联动活动",
              "深度内容共创",
              "全平台流量倾斜",
            ]}
            cta="顶级品牌深度合作"
          />
        </div>
      </section>

      {/* 合作案例占位 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Card className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 border-violet-500/30 p-6 md:p-10 text-center">
          <Zap className="w-10 h-10 mx-auto text-amber-300 mb-3" />
          <h3 className="text-2xl font-bold mb-2">期待与你共创精彩</h3>
          <p className="text-slate-400 max-w-xl mx-auto">
            无论你是教育品牌、考试机构、留学服务商，还是希望触达年轻学习者的消费品牌，
            我们都将为你定制最合适的合作方案。
          </p>
        </Card>
      </section>

      {/* 咨询表单 */}
      <section id="inquiry" className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">在线咨询</h2>
        <p className="text-slate-400 mb-6">填写以下信息，我们会在 2 个工作日内与您联系</p>

        {submitted ? (
          <Card className="bg-emerald-500/10 border-emerald-500/30 p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-emerald-300">咨询已提交！</h3>
            <p className="text-slate-300 mt-2">
              感谢您的关注，我们的商务团队会尽快与您联系。
            </p>
            <Button asChild variant="outline" className="mt-6 border-slate-700">
              <Link to="/">返回首页</Link>
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800 p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">公司名称 *</Label>
                  <div className="relative mt-1">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      className="pl-9 bg-slate-800 border-slate-700"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">联系人 *</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="mt-1 bg-slate-800 border-slate-700"
                    maxLength={50}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">邮箱 *</Label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="pl-9 bg-slate-800 border-slate-700"
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">电话（可选）</Label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="pl-9 bg-slate-800 border-slate-700"
                      maxLength={30}
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">合作类型 *</Label>
                  <Select value={form.inquiry_type} onValueChange={(v) => setForm({ ...form, inquiry_type: v })}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ad">广告位投放</SelectItem>
                      <SelectItem value="sponsor">品牌赞助</SelectItem>
                      <SelectItem value="cobrand">联名合作</SelectItem>
                      <SelectItem value="content">内容共创</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">预算范围（可选）</Label>
                  <Select value={form.budget_range} onValueChange={(v) => setForm({ ...form, budget_range: v })}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lt_10k">1 万以下</SelectItem>
                      <SelectItem value="10k_50k">1–5 万</SelectItem>
                      <SelectItem value="50k_200k">5–20 万</SelectItem>
                      <SelectItem value="gt_200k">20 万以上</SelectItem>
                      <SelectItem value="discuss">面议</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm">详细需求 *</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-1 bg-slate-800 border-slate-700 min-h-[120px]"
                  placeholder="请描述您的合作需求、目标人群、期望效果等..."
                  maxLength={1000}
                  required
                />
                <div className="text-xs text-slate-500 mt-1 text-right">{form.message.length}/1000</div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-900 font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                提交咨询
              </Button>
              <p className="text-xs text-slate-500 text-center">
                我们承诺保护您的隐私信息，仅用于商务联系。
              </p>
            </form>
          </Card>
        )}
      </section>

      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-500">
          © 词海争锋 · 让英语学习更有趣
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({ icon, label, value, suffix }: any) => (
  <Card className="bg-slate-900/60 border-slate-800 p-4 md:p-6 text-center">
    <div className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-300 mb-2">
      {icon}
    </div>
    <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-amber-200 to-fuchsia-300 bg-clip-text text-transparent">
      {value.toLocaleString()}{suffix}
    </div>
    <div className="text-xs text-slate-400 mt-1">{label}</div>
  </Card>
);

const FeatureCard = ({ icon, title, desc }: any) => (
  <Card className="bg-slate-900 border-slate-800 p-5">
    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-slate-400">{desc}</p>
  </Card>
);

const PackageCard = ({ tier, color, items, cta, highlight }: any) => (
  <Card className={`relative p-5 border-2 ${highlight ? "border-violet-500/60 bg-violet-500/5" : "border-slate-800 bg-slate-900"}`}>
    {highlight && (
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white border-none">
        推荐
      </Badge>
    )}
    <div className={`inline-block px-3 py-1 rounded-full text-xs text-white bg-gradient-to-r ${color} mb-3`}>
      {tier}
    </div>
    <ul className="space-y-2 my-4">
      {items.map((it: string, i: number) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800">{cta}</p>
  </Card>
);

export default Partners;
