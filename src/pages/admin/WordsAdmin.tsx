import { useEffect, useState, FormEvent } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Sparkles, Search, Loader2, Download, Upload, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { clearWordsCache } from "@/data/wordBank";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Stage = "primary" | "junior" | "senior";
const STAGE_LABEL: Record<Stage, string> = { primary: "小学", junior: "初中", senior: "高中" };

type ImportRow = {
  word: string;
  meaning: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  stage: Stage | null;
  category: string | null;
  enabled: boolean;
};

interface ImportPreview {
  validNew: ImportRow[];
  duplicates: { row: ImportRow; existingId: string; existing: WordRow }[];
  invalid: { index: number; raw: any; reason: string }[];
  fileDuplicates: { word: string; count: number }[];
}

interface WordRow {
  id: string;
  word: string;
  meaning: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  stage: Stage | null;
  category: string | null;
  enabled: boolean;
  created_at: string;
}

const emptyForm = {
  word: "", meaning: "", options: ["", "", "", ""],
  difficulty: "medium" as "easy" | "medium" | "hard",
  stage: "" as "" | Stage,
  category: "",
  enabled: true,
};

const WordsAdmin = () => {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [editing, setEditing] = useState<WordRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiDiff, setAiDiff] = useState("medium");
  const [aiStage, setAiStage] = useState<"" | Stage>("");
  const [aiLoading, setAiLoading] = useState(false);

  // Import flow state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importDupStrategy, setImportDupStrategy] = useState<"skip" | "overwrite">("skip");
  const [importing, setImporting] = useState(false);
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("words")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    setWords((data ?? []) as WordRow[]);
    setLoading(false);
    clearWordsCache();
  };

  useEffect(() => { load(); }, []);

  const filtered = words.filter((w) => {
    if (filterDiff !== "all" && w.difficulty !== filterDiff) return false;
    if (filterStage !== "all") {
      if (filterStage === "none" ? w.stage != null : w.stage !== filterStage) return false;
    }
    if (search && !w.word.toLowerCase().includes(search.toLowerCase()) &&
        !w.meaning.includes(search)) return false;
    return true;
  });

  const stageCounts = {
    primary: words.filter((w) => w.stage === "primary").length,
    junior: words.filter((w) => w.stage === "junior").length,
    senior: words.filter((w) => w.stage === "senior").length,
    none: words.filter((w) => !w.stage).length,
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };
  const openEdit = (w: WordRow) => {
    setEditing(w);
    setForm({
      word: w.word, meaning: w.meaning, options: [...w.options],
      difficulty: w.difficulty, stage: (w.stage ?? "") as "" | Stage,
      category: w.category ?? "", enabled: w.enabled,
    });
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.options.includes(form.meaning)) {
      toast.error("选项中必须包含正确释义");
      return;
    }
    const payload = {
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      options: form.options.map((o) => o.trim()),
      difficulty: form.difficulty,
      stage: form.stage || null,
      category: form.category.trim() || null,
      enabled: form.enabled,
    };
    if (editing) {
      const { error } = await supabase.from("words").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("已更新");
    } else {
      const { error } = await supabase.from("words").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("已添加");
    }
    setFormOpen(false);
    load();
  };

  const remove = async (w: WordRow) => {
    if (!confirm(`确定删除 "${w.word}" ?`)) return;
    const { error } = await supabase.from("words").delete().eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    load();
  };

  const toggleEnabled = async (w: WordRow) => {
    const { error } = await supabase.from("words").update({ enabled: !w.enabled }).eq("id", w.id);
    if (error) return toast.error(error.message);
    load();
  };

  const aiGenerate = async () => {
    if (!aiTopic.trim()) return toast.error("请输入主题");
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: {
          action: "ai_generate_words",
          topic: aiTopic,
          count: aiCount,
          difficulty: aiDiff,
          stage: aiStage || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`AI 已生成 ${(data as any).inserted} 个词`);
      setAiOpen(false);
      setAiTopic("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "AI 生成失败");
    } finally {
      setAiLoading(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `words-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const validateRow = (raw: any): { ok: true; row: ImportRow } | { ok: false; reason: string } => {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "不是对象" };
    const word = typeof raw.word === "string" ? raw.word.trim() : "";
    const meaning = typeof raw.meaning === "string" ? raw.meaning.trim() : "";
    if (!word) return { ok: false, reason: "缺少 word" };
    if (!meaning) return { ok: false, reason: "缺少 meaning" };
    if (!Array.isArray(raw.options)) return { ok: false, reason: "options 不是数组" };
    const options = raw.options.map((o: any) => (typeof o === "string" ? o.trim() : ""));
    if (options.length !== 4) return { ok: false, reason: "options 必须为 4 项" };
    if (options.some((o: string) => !o)) return { ok: false, reason: "存在空选项" };
    if (new Set(options).size !== 4) return { ok: false, reason: "选项重复" };
    if (!options.includes(meaning)) return { ok: false, reason: "选项中不含正确释义" };
    const difficulty = ["easy", "medium", "hard"].includes(raw.difficulty) ? raw.difficulty : "medium";
    const stage = (["primary", "junior", "senior"].includes(raw.stage) ? raw.stage : null) as Stage | null;
    const category = raw.category == null ? null : String(raw.category).trim() || null;
    const enabled = raw.enabled !== false;
    return { ok: true, row: { word, meaning, options, difficulty, stage, category, enabled } };
  };

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      let arr: any;
      try {
        arr = JSON.parse(text);
      } catch {
        return toast.error("JSON 解析失败：文件不是有效的 JSON");
      }
      if (!Array.isArray(arr)) return toast.error("格式错误：根节点必须是数组");
      if (arr.length === 0) return toast.error("文件为空");

      const invalid: ImportPreview["invalid"] = [];
      const validRows: ImportRow[] = [];
      arr.forEach((raw, i) => {
        const r = validateRow(raw);
        if (r.ok) {
          validRows.push(r.row);
        } else {
          invalid.push({ index: i, raw, reason: (r as { ok: false; reason: string }).reason });
        }
      });

      // Detect duplicates within file (by lowercased word)
      const seen = new Map<string, number>();
      validRows.forEach((r) => {
        const k = r.word.toLowerCase();
        seen.set(k, (seen.get(k) ?? 0) + 1);
      });
      const fileDuplicates = [...seen.entries()]
        .filter(([, c]) => c > 1)
        .map(([word, count]) => ({ word, count }));

      // Keep only the LAST occurrence of each duplicated word in file
      const dedupedByWord = new Map<string, ImportRow>();
      validRows.forEach((r) => dedupedByWord.set(r.word.toLowerCase(), r));
      const dedupedRows = [...dedupedByWord.values()];

      // Detect duplicates against DB by word (case-insensitive)
      const wordsLower = dedupedRows.map((r) => r.word.toLowerCase());
      const { data: existing, error: exErr } = await supabase
        .from("words")
        .select("*")
        .in("word", dedupedRows.map((r) => r.word));
      if (exErr) throw exErr;
      const existingMap = new Map<string, WordRow>();
      (existing ?? []).forEach((w: any) => existingMap.set(w.word.toLowerCase(), w as WordRow));

      const duplicates: ImportPreview["duplicates"] = [];
      const validNew: ImportRow[] = [];
      dedupedRows.forEach((row) => {
        const ex = existingMap.get(row.word.toLowerCase());
        if (ex) duplicates.push({ row, existingId: ex.id, existing: ex });
        else validNew.push(row);
      });

      setImportDupStrategy("skip");
      setImportPreview({ validNew, duplicates, invalid, fileDuplicates });
    } catch (err: any) {
      toast.error(err.message ?? "导入失败");
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const { validNew, duplicates, invalid } = importPreview;

    if (invalid.length > 0) {
      toast.error("存在无效行，请先在文件中修复后重新导入（不会进行部分写入）");
      return;
    }

    const toUpdate = importDupStrategy === "overwrite" ? duplicates : [];
    const toInsert = validNew;

    if (toUpdate.length === 0 && toInsert.length === 0) {
      toast.message("没有需要写入的数据");
      setImportPreview(null);
      return;
    }

    setImporting(true);
    // Snapshot existing rows for rollback on failure
    const snapshots = toUpdate.map((d) => d.existing);
    const updatedIds: string[] = [];
    let insertedIds: string[] = [];

    try {
      // Apply updates first
      for (const d of toUpdate) {
        const { error } = await supabase
          .from("words")
          .update({
            word: d.row.word,
            meaning: d.row.meaning,
            options: d.row.options,
            difficulty: d.row.difficulty,
            stage: d.row.stage,
            category: d.row.category,
            enabled: d.row.enabled,
          })
          .eq("id", d.existingId);
        if (error) throw new Error(`更新 "${d.row.word}" 失败: ${error.message}`);
        updatedIds.push(d.existingId);
      }

      // Single atomic insert (Supabase: all-or-nothing per request)
      if (toInsert.length > 0) {
        const { data: ins, error: insErr } = await supabase
          .from("words")
          .insert(toInsert)
          .select("id");
        if (insErr) throw insErr;
        insertedIds = (ins ?? []).map((r: any) => r.id);
      }

      toast.success(
        `导入完成：新增 ${toInsert.length} · ${importDupStrategy === "overwrite" ? `覆盖 ${toUpdate.length}` : `跳过重复 ${duplicates.length}`}`
      );
      setImportPreview(null);
      load();
    } catch (err: any) {
      // Rollback: revert updated rows from snapshot, delete inserted rows
      try {
        for (const snap of snapshots.filter((s) => updatedIds.includes(s.id))) {
          await supabase
            .from("words")
            .update({
              word: snap.word,
              meaning: snap.meaning,
              options: snap.options,
              difficulty: snap.difficulty,
              stage: snap.stage,
              category: snap.category,
              enabled: snap.enabled,
            })
            .eq("id", snap.id);
        }
        if (insertedIds.length > 0) {
          await supabase.from("words").delete().in("id", insertedIds);
        }
      } catch (rbErr) {
        console.error("Rollback failed:", rbErr);
      }
      toast.error(`导入失败已回滚：${err.message ?? err}`);
    } finally {
      setImporting(false);
    }
  };

  const diffColor = (d: string) =>
    d === "easy" ? "bg-emerald-500/20 text-emerald-300" :
    d === "hard" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">词汇库管理</h1>
          <p className="text-slate-400 mt-1">
            共 {words.length} · 启用 {words.filter(w => w.enabled).length}
            <span className="ml-3 text-xs">
              小学 {stageCounts.primary} · 初中 {stageCounts.junior} · 高中 {stageCounts.senior} · 未分级 {stageCounts.none}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4 mr-1" /> 新增
          </Button>
          <Button onClick={() => setAiOpen(true)} variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
            <Sparkles className="w-4 h-4 mr-1" /> AI 生成
          </Button>
          <Button onClick={exportJSON} variant="outline" className="border-slate-700">
            <Download className="w-4 h-4 mr-1" /> 导出
          </Button>
          <label className="inline-flex">
            <input type="file" accept="application/json" onChange={importJSON} className="hidden" />
            <span className="inline-flex items-center px-4 py-2 text-sm border border-slate-700 rounded-md cursor-pointer hover:bg-slate-800">
              <Upload className="w-4 h-4 mr-1" /> 导入
            </span>
          </label>
        </div>
      </div>

      <Card className="p-4 bg-slate-900 border-slate-800 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词或释义..."
              className="pl-9 bg-slate-800 border-slate-700"
            />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学段</SelectItem>
              <SelectItem value="primary">小学</SelectItem>
              <SelectItem value="junior">初中</SelectItem>
              <SelectItem value="senior">高中</SelectItem>
              <SelectItem value="none">未分级</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiff} onValueChange={setFilterDiff}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部难度</SelectItem>
              <SelectItem value="easy">简单</SelectItem>
              <SelectItem value="medium">中等</SelectItem>
              <SelectItem value="hard">困难</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5">单词</th>
                  <th className="text-left px-4 py-2.5">释义</th>
                  <th className="text-left px-4 py-2.5">学段</th>
                  <th className="text-left px-4 py-2.5">难度</th>
                  <th className="text-left px-4 py-2.5">分类</th>
                  <th className="text-left px-4 py-2.5">状态</th>
                  <th className="text-right px-4 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono font-semibold">{w.word}</td>
                    <td className="px-4 py-2.5 text-slate-300">{w.meaning}</td>
                    <td className="px-4 py-2.5">
                      {w.stage ? (
                        <Badge className="bg-sky-500/20 text-sky-300">{STAGE_LABEL[w.stage]}</Badge>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={diffColor(w.difficulty)}>{w.difficulty}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{w.category ?? "-"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleEnabled(w)}
                        className={`text-xs px-2 py-0.5 rounded ${w.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}
                      >
                        {w.enabled ? "启用" : "停用"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => remove(w)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-8">暂无匹配记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit / New Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑词条" : "新增词条"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>单词</Label>
              <Input value={form.word} required onChange={(e) => setForm({ ...form, word: e.target.value })} className="bg-slate-800 border-slate-700" />
            </div>
            <div>
              <Label>正确释义（必须出现在下面 4 个选项中）</Label>
              <Input value={form.meaning} required onChange={(e) => setForm({ ...form, meaning: e.target.value })} className="bg-slate-800 border-slate-700" />
            </div>
            <div>
              <Label>4 个选项</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {form.options.map((opt, i) => (
                  <Input
                    key={i}
                    value={opt}
                    required
                    placeholder={`选项 ${i + 1}`}
                    onChange={(e) => {
                      const ops = [...form.options];
                      ops[i] = e.target.value;
                      setForm({ ...form, options: ops });
                    }}
                    className="bg-slate-800 border-slate-700"
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>学段</Label>
                <Select value={form.stage || "none"} onValueChange={(v) => setForm({ ...form, stage: (v === "none" ? "" : v) as "" | Stage })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未分级</SelectItem>
                    <SelectItem value="primary">小学</SelectItem>
                    <SelectItem value="junior">初中</SelectItem>
                    <SelectItem value="senior">高中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>难度</Label>
                <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">简单</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>分类</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-slate-800 border-slate-700" placeholder="可选" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              启用（用户可见）
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>取消</Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> AI 自动生成词汇</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>主题 / 场景</Label>
              <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="例如：商务英语、雅思学术、计算机科学..." className="bg-slate-800 border-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>数量 (1–30)</Label>
                <Input type="number" min={1} max={30} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="bg-slate-800 border-slate-700" />
              </div>
              <div>
                <Label>难度</Label>
                <Select value={aiDiff} onValueChange={setAiDiff}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">简单</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-slate-500">由 Lovable AI（Gemini）即时生成，并自动入库。</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>取消</Button>
            <Button onClick={aiGenerate} disabled={aiLoading} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "开始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={!!importPreview} onOpenChange={(o) => !o && !importing && setImportPreview(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入预览 · 请确认</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">新增</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{importPreview.validNew.length}</div>
                </Card>
                <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs">重复（库内已存在）</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{importPreview.duplicates.length}</div>
                </Card>
                <Card className="p-3 bg-rose-500/10 border-rose-500/30">
                  <div className="flex items-center gap-2 text-rose-300">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs">无效行</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{importPreview.invalid.length}</div>
                </Card>
              </div>

              {importPreview.fileDuplicates.length > 0 && (
                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  文件内出现重复单词，将自动保留最后一次出现：
                  {importPreview.fileDuplicates.map((d) => ` ${d.word}×${d.count}`).join("，")}
                </div>
              )}

              {importPreview.duplicates.length > 0 && (
                <div>
                  <Label className="text-sm">重复处理策略</Label>
                  <RadioGroup
                    value={importDupStrategy}
                    onValueChange={(v) => setImportDupStrategy(v as "skip" | "overwrite")}
                    className="mt-2 space-y-1"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="skip" id="dup-skip" />
                      <span>跳过重复（仅插入新单词）</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="overwrite" id="dup-over" />
                      <span>覆盖现有词条（按 word 匹配）</span>
                    </label>
                  </RadioGroup>
                </div>
              )}

              {importPreview.invalid.length > 0 && (
                <div>
                  <Label className="text-sm text-rose-300">无效行（必须先在文件中修复）</Label>
                  <ScrollArea className="h-32 mt-2 border border-rose-500/30 rounded p-2 bg-rose-500/5">
                    <ul className="text-xs space-y-1">
                      {importPreview.invalid.slice(0, 100).map((it) => (
                        <li key={it.index} className="text-rose-200">
                          #{it.index}: {it.reason}
                          {it.raw?.word ? ` — ${String(it.raw.word).slice(0, 40)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {importPreview.duplicates.length > 0 && (
                <div>
                  <Label className="text-sm">重复词汇预览</Label>
                  <ScrollArea className="h-32 mt-2 border border-slate-700 rounded p-2">
                    <ul className="text-xs space-y-1">
                      {importPreview.duplicates.slice(0, 100).map((d) => (
                        <li key={d.existingId} className="text-slate-300">
                          <span className="font-mono text-amber-300">{d.row.word}</span>
                          {" — 现有: "}{d.existing.meaning}
                          {d.existing.meaning !== d.row.meaning && (
                            <span className="text-slate-500"> → 新: {d.row.meaning}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {importPreview.invalid.length > 0 && (
                <p className="text-xs text-rose-300">
                  存在无效行，为避免数据不一致，本次导入已被阻止。请修复 JSON 后重试。
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportPreview(null)} disabled={importing}>
              取消
            </Button>
            <Button
              onClick={confirmImport}
              disabled={
                importing ||
                !importPreview ||
                importPreview.invalid.length > 0 ||
                (importPreview.validNew.length === 0 &&
                  (importDupStrategy === "skip" || importPreview.duplicates.length === 0))
              }
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default WordsAdmin;
