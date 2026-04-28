import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY_USER = "assistant.history.user";
const STORAGE_KEY_ADMIN = "assistant.history.admin";

const userSuggestions = [
  "我的近期战绩怎么样？",
  "我想真人 PK，去哪里？",
  "怎么修改我的头像？",
  "把我最近一场 PK 整理一下",
];
const adminSuggestions = [
  "如何封禁一个违规用户？",
  "怎么用 AI 批量生成单词？",
  "现在平台有多少用户？",
  "怎么导入词汇 JSON？",
];

const AIAssistant = () => {
  const { user, session } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const mode: "admin" | "user" = isAdminRoute && isAdmin ? "admin" : "user";
  const storageKey = mode === "admin" ? STORAGE_KEY_ADMIN : STORAGE_KEY_USER;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 隐藏在认证页 / 登录页
  const hidden =
    location.pathname === "/auth" ||
    location.pathname === "/admin/login" ||
    !user;

  // 加载历史
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
      else setMessages([]);
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  // 保存历史
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
      } catch {/* ignore quota */}
    }
  }, [messages, storageKey]);

  // 自动滚动
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (hidden) return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    if (!session) {
      toast.error("请先登录");
      return;
    }

    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    const upsert = (chunk: string) => {
      accumulated += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: accumulated } : m));
        }
        return [...prev, { role: "assistant", content: accumulated }];
      });
    };

    try {
      const fnName = mode === "admin" ? "admin-assistant" : "user-assistant";
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = "服务暂时不可用";
        try {
          errMsg = JSON.parse(errText).error ?? errMsg;
        } catch {/* */}
        if (resp.status === 429) errMsg = "请求过于频繁，请稍后再试";
        if (resp.status === 402) errMsg = "AI 额度不足，请联系管理员";
        toast.error(errMsg);
        // 回滚最后一条用户消息
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      if (!resp.body) {
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsert(delta);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsert(delta);
          } catch {/* */}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        toast.error("网络错误");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    toast.success("已清空");
  };

  const themeColor =
    mode === "admin"
      ? "from-amber-500 to-orange-600"
      : "from-violet-500 to-fuchsia-600";

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="打开 AI 助手"
          className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br ${themeColor} shadow-lg shadow-black/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group`}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-slate-900" />
          </span>
          <span className="absolute right-full mr-3 px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {mode === "admin" ? "管理员 AI 助手" : "AI 学习助手"}
          </span>
        </button>
      )}

      {/* 聊天面板 */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,400px)] h-[min(80vh,600px)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className={`bg-gradient-to-r ${themeColor} px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <div>
                <div className="font-semibold text-sm">
                  {mode === "admin" ? "管理员助手" : "AI 学习助手"}
                </div>
                <div className="text-[10px] opacity-80">
                  {mode === "admin" ? "由 Gemini 提供" : "由 Gemini 提供 · 了解你的战绩"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded hover:bg-white/20 text-white/90"
                  aria-label="清空历史"
                  title="清空历史"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-white/20 text-white/90"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-950/50">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="text-slate-300 text-sm mb-3">
                  👋 你好！我可以帮你：
                </div>
                <div className="space-y-2">
                  {(mode === "admin" ? adminSuggestions : userSuggestions).map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/50 transition"
                    >
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                    m.role === "user"
                      ? `bg-gradient-to-br ${themeColor} text-white`
                      : "bg-slate-800 text-slate-100 border border-slate-700/60"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-a:text-emerald-300 prose-a:no-underline hover:prose-a:underline">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            const isInternal = href?.startsWith("/");
                            if (isInternal) {
                              return (
                                <Link to={href!} onClick={() => setOpen(false)} className="text-emerald-300 underline">
                                  {children}
                                </Link>
                              );
                            }
                            return (
                              <a href={href} target="_blank" rel="noreferrer" className="text-emerald-300 underline">
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {m.content || "…"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  思考中...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-slate-700 bg-slate-900 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "admin" ? "问我管理操作..." : "问我学习/PK的问题..."}
              maxLength={500}
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-sm"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              size="icon"
              className={`bg-gradient-to-br ${themeColor} hover:opacity-90`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
