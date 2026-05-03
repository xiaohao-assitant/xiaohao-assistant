# 小浩智能助手 (XiaoHao Assistant)

> 一款支持多模型自由切换的通用 AI 智能助手平台

![version](https://img.shields.io/badge/v-1.0.0-indigo) ![node](https://img.shields.io/badge/Node.js-%E2%89%A518-green) ![license](https://img.shields.io/badge/license-MIT-blue)

---

## 📖 简介

**小浩智能助手** 是一个轻量级的 Web 端 AI 助手应用，支持接入多种国产大模型（智谱GLM、通义千问、DeepSeek、Kimi 等），提供智能问答、文档总结、知识图谱构建、批量问答四大核心功能。

项目设计理念：**不绑定单一模型，让用户自由选择最适合的 AI 引擎**。

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 💬 **智能问答** | 多轮对话，支持上下文理解，可用于问答、写作、代码解读等 |
| 📄 **文档总结** | 支持通用文章、学术论文、研究报告三种模式的结构化总结 |
| 🕸️ **知识图谱** | 从文本中提取概念和关系，输出结构化 JSON 数据 |
| 📚 **批量问答** | 基于同一份文档一次回答多个问题，适合备课和调研 |
| 🔄 **多模型切换** | 前端一键切换不同模型供应商，后端自动适配 |

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────┐
│           前端 (Browser)              │
│    HTML + CSS + Vanilla JS          │
│    - 模型选择器（下拉切换）           │
│    - 4个功能模块 Tab                 │
│    - 实时连接状态显示                 │
└──────────────────┬───────────────────┘
                   │ REST API
┌──────────────────▼───────────────────┐
│        后端 (Node.js + Express)       │
│   src/server.js                      │
│   ┌─────────────────────────────┐    │
│   │     模型路由层 (统一接口)     │    │
│   │  /api/chat                  │    │
│   │  /api/summarize             │    │
│   │  /api/kg-extract            │    │
│   │  /api/batch-qa              │    │
│   │  /api/models                │    │
│   │  /api/switch                │    │
│   └─────────────────────────────┘    │
│            ↓                          │
│   ┌─────────────────────────────┐    │
│   │    多模型适配层               │    │
│   │  智谱AI / 通义千问 / Kimi    │    │
│   │  硅基流动 / OpenRouter       │    │
│   └─────────────────────────────┘    │
└──────────────────┬───────────────────┘
                   │ OpenAI 兼容格式
┌──────────────────▼───────────────────┐
│         大模型 API 服务商              │
│  （可按需选择，全部兼容OpenAI格式）      │
└──────────────────────────────────────┘
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd xiaohao-assistant
npm install
```

### 2. 配置 API Key（至少选一个）

**方式 A — 智谱AI（推荐，免费额度大）：**
注册 https://open.bigmodel.cn → 控制台创建 API Key

**方式 B — 硅基流动（聚合多模型）：**
注册 https://siliconflow.cn → 获取 API Key

**方式 C — 其他模型同理**

### 3. 设置环境变量

```bash
# Windows PowerShell
$env:ZHIPU_API_KEY="你的智谱API Key"

# Linux / macOS
export ZHIPU_API_KEY="你的智谱API Key"
```

> 所有可用环境变量：
> - `ZHIPU_API_KEY` — 智谱 AI
> - `SILICONFLOW_API_KEY` — 硅基流动
> - `OPENROUTER_API_KEY` — OpenRouter
> - `MOONSHOT_API_KEY` — Kimi 月之暗面
> - `QWEN_API_KEY` — 阿里通义千问

### 4. 启动服务

```bash
npm start
```

打开浏览器访问 http://localhost:3000 即可使用。

---

## 🎯 使用场景

- **学生党**：论文文献快速阅读、课程笔记自动整理
- **研究员**：行业报告结构化分析、研究问题批量解答
- **教师**：基于教材内容批量生成问答题目
- **自媒体人**：长文自动提炼摘要、素材整理
- **程序员**：技术文档理解、概念关系梳理

---

## 📁 项目结构

```
xiaohao-assistant/
├── src/
│   └── server.js          # 后端服务 + 多模型适配
├── public/
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── app.js             # 前端交互逻辑
├── docs/
│   └── 申请材料.md        # 小米Token激励计划申请指南
├── package.json
└── README.md
```

---

## 🔧 扩展新模型

在 `src/server.js` 的 `MODEL_PROVIDERS` 对象中添加即可：

```javascript
your_provider: {
  name: '显示名称',
  baseUrl: 'https://xxx/api/v1/chat/completions',
  apiKey: process.env.YOUR_API_KEY || '',
  models: {
    'model-name': { label: '展示名', desc: '描述', maxTokens: 4096 }
  }
}
```

所有兼容 **OpenAI Chat Completions 格式** 的接口都能直接接入。

---

## ⚠️ 注意事项

1. 免费模型的调用频率有限制（RPM），高频使用建议升级付费版
2. API Key 请妥善保管，不要提交到公开仓库
3. 不同模型的能力各有侧重，可根据场景灵活切换
4. 本项目仅供学习和个人使用，请遵守各平台的用户协议

---

*小浩智能助手 · 让 AI 更好用一点*
