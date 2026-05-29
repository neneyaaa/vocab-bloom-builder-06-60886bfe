# VocabBloom — 英语词汇测评与竞技平台

> 一个面向小学、初中、高中学生的英语词汇在线测评与实时竞技 Web 应用，支持 AI 辅助学习、社交互动、虚拟激励与后台管理。

---

## 项目简介

VocabBloom 是一款基于 **React + TypeScript + Tailwind CSS** 构建的现代化英语词汇学习平台，后端依托 **Lovable Cloud（PostgreSQL + Edge Functions）**。系统支持：

- 按学段（小学 / 初中 / 高中）分级的词汇测评
- 实时 1v1 在线 PK（含 AI 机器人陪练）
- 智能 AI 问答助手（接入 Gemini）
- 虚拟打卡激励体系（学习币机制）
- 社交聊天与朋友圈
- 管理员后台 + 商务合作 CRM

---

## 功能列表

| 模块 | 功能 |
|------|------|
| **用户系统** | 邮箱注册 / 登录、个人资料管理、头像上传 |
| **词汇测评** | 学段选择（小学/初中/高中）、智能抽题、答题回溯、错题回顾 |
| **实时 PK** | 在线匹配、AI 机器人陪练、表情喊话、对战结果分析 |
| **排行榜** | 周榜 / 月榜、个人战绩详情 |
| **AI 助手** | 用户学习助手（查历史、问功能）、管理员运维助手 |
| **虚拟经济** | 学习币钱包、99 元百日打卡计划（虚拟币返还）、每日签到 |
| **社交功能** | 好友聊天、朋友圈动态 |
| **智能推荐** | 基于用户水平的个性化词汇推荐 |
| **后台管理** | 词汇库 CRUD + AI 批量生成、用户管理、广告位配置 |
| **商务合作** | 招商页面、合作咨询 CRM、企业角色独立处理 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite 5 |
| UI 组件 | shadcn/ui + Radix UI + Tailwind CSS 3 |
| 状态管理 | React Context + TanStack Query |
| 后端服务 | Lovable Cloud（PostgreSQL + Edge Functions） |
| 实时通信 | Supabase Realtime |
| 文件存储 | Supabase Storage |
| AI 能力 | Google Gemini（Lovable AI Gateway） |
| 测试 | Vitest + Playwright |

---

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/vocabbloom.git
cd vocabbloom

# 2. 安装依赖
bun install

# 3. 启动开发服务器
bun dev
```

> 应用默认运行在 `http://localhost:5173`

---

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `words` | 词汇库（含学段、难度、词义、选项） |
| `profiles` | 用户资料（昵称、头像、学段） |
| `user_roles` | 角色权限（admin / business_dev） |
| `user_bans` | 封禁记录 |
| `test_runs` | 测评记录 |
| `test_run_answers` | 测评答题明细 |
| `pk_match_answers` | PK 对战答题明细 |
| `checkin_plans` | 打卡计划 |
| `checkin_records` | 打卡记录 |
| `wallets` | 学习币钱包 |
| `coin_transactions` | 虚拟币流水 |
| `partner_inquiries` | 商务合作咨询 |
| `inquiry_followups` | 咨询跟进记录 |
| `promo_banners` | 广告位配置 |

---

## 管理员入口

| 路径 | 用途 |
|------|------|
| `/admin/login` | 管理员登录（首次可用 letmein-admin-2026 提升权限） |
| `/admin` | 仪表盘概览 |
| `/admin/words` | 词汇库管理（CRUD + AI 生成 + JSON 导入/导出） |
| `/admin/users` | 用户管理（搜索、封禁、重置） |
| `/admin/banners` | 广告位管理 |

---

## Edge Functions

| 函数 | 用途 |
|------|------|
| `admin-api` | 管理员操作 API（词汇生成、用户操作） |
| `user-assistant` | 用户 AI 问答助手 |
| `admin-assistant` | 管理员运维 AI 助手 |
| `checkin-api` | 打卡签到逻辑（虚拟币计算） |

---

## 项目结构

```text
src/
├── components/        # UI 组件（shadcn + 自定义）
├── components/ui/     # shadcn/ui 基础组件
├── contexts/          # React Context（AuthContext）
├── data/              # 词汇数据工具
├── hooks/             # 自定义 Hooks
├── integrations/      # 第三方集成（Supabase）
├── lib/               # 工具函数（AI Bot、测试服务）
├── pages/             # 页面组件
│   ├── admin/         # 管理员后台
│   ├── business/      # 商务合作 CRM
│   └── ...            # 用户端页面
└── main.tsx           # 应用入口

supabase/
└── functions/         # Edge Functions 源码
```

---

## 部署说明

本项目通过 **Lovable** 平台构建和托管，数据库及后端服务由 Lovable Cloud 提供。

1. 在 Lovable 平台完成开发并保存
2. 右上角 **Publish** 一键发布
3. 如需同步到 Gitee：
   - 先 **Connect to GitHub** 自动同步到 GitHub
   - 再在 Gitee 通过 **"从 GitHub 导入"** 完成镜像

---

## 演示账号

| 角色 | 说明 |
|------|------|
| 普通用户 | 注册任意邮箱即可 |
| 管理员 | 注册后在 `/admin/login` 使用 Claim Admin 密码提升权限 |
| 商务人员 | 管理员在 `/admin/users` 页面授予 `business_dev` 角色 |

---

## 开发团队

- 开发平台：[Lovable](https://lovable.dev)
- AI 辅助：Google Gemini
- 项目类型：课程设计 / 毕业设计

---

## License

MIT
