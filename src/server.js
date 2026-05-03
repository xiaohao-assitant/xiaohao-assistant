const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
//  多模型配置中心 - 可自由切换底层模型
// ============================================================

const MODEL_PROVIDERS = {
  // 智谱AI - 注册即送2000万Token，GLM-4-Flash永久免费
  zhipu: {
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: process.env.ZHIPU_API_KEY || '',
    models: {
      'glm-4-flash': { label: 'GLM-4-Flash', desc: '免费，通用对话', maxTokens: 4096 },
      'glm-4-air': { label: 'GLM-4-Air', desc: '性价比高，适合长文', maxTokens: 8192 }
    }
  },

  // 硅基流动 - 聚合多模型，1000 RPM免费
  siliconflow: {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    models: {
      'deepseek-ai/DeepSeek-R1-0528': { label: 'DeepSeek-R1', desc: '推理能力强，免费', maxTokens: 8192 },
      'Qwen/Qwen3-8B': { label: '通义千问3-8B', desc: '轻量快速，中文好', maxTokens: 4096 },
      'THUDM/glm-4-9b-chat': { label: 'GLM-4-9B', desc: '智谱开源版', maxTokens: 4096 }
    }
  },

  // OpenRouter - 聚合平台，国内可直连
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    models: {
      'deepseek/deepseek-chat-v3-0324:free': { label: 'DeepSeek-V3', desc: '免费版，综合强', maxTokens: 8192 },
      'google/gemini-2.5-flash-preview:free': { label: 'Gemini-2.5-Flash', desc: '谷歌免费模型', maxTokens: 4096 }
    }
  },

  // 月之暗面 Kimi
  moonshot: {
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: process.env.MOONSHOT_API_KEY || '',
    models: {
      'moonshot-v1-8k': { label: 'Kimi-V1-8K', desc: '长文本理解', maxTokens: 8000 }
    }
  },

  // 通义千问（阿里云）
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: process.env.QWEN_API_KEY || '',
    models: {
      'qwen-turbo': { label: '通义千问-Turbo', desc: '速度快，性价比高', maxTokens: 6000 },
      'qwen-plus': { label: '通义千问-Plus', desc: '能力更强', maxTokens: 6000 }
    }
  }
};

// 当前使用的配置（默认智谱免费）
let currentProvider = 'zhipu';
let currentModel = 'glm-4-flash';

function getCurrentConfig() {
  return MODEL_PROVIDERS[currentProvider];
}

// ============================================================
//  统一 API 调用函数 - 兼容所有OpenAI格式接口
// ============================================================

async function callLLMAPI(messages, temperature = 0.7, options = {}) {
  const config = getCurrentConfig();
  const model = options.model || currentModel;

  if (!config.apiKey) {
    throw new Error(`请先设置 ${config.name} 的 API Key（环境变量：${getEnvVarName(currentProvider)}）`);
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: options.maxTokens || config.models[model]?.maxTokens || 4096,
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`API Error [${config.name}/${model}]: ${response.status} - ${errText}`);
    throw new Error(`API调用失败 (${response.status}): ${errText.substring(0, 200)}`);
  }

  return response.json();
}

function getEnvVarName(provider) {
  const map = {
    zhipu: 'ZHIPU_API_KEY',
    siliconflow: 'SILICONFLOW_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    moonshot: 'MOONSHOT_API_KEY',
    qwen: 'QWEN_API_KEY'
  };
  return map[provider] || `${provider.toUpperCase()}_API_KEY`;
}

// ============================================================
//  API 路由
// ============================================================

app.get('/api/health', (req, res) => {
  const config = getCurrentConfig();
  res.json({
    status: 'ok',
    service: '小浩智能助手',
    version: '1.0.0',
    provider: config.name,
    model: currentModel,
    hasApiKey: !!config.apiKey,
    timestamp: new Date().toISOString()
  });
});

// 获取可用模型列表
app.get('/api/models', (req, res) => {
  const result = {};
  for (const [key, val] of Object.entries(MODEL_PROVIDERS)) {
    result[key] = {
      name: val.name,
      hasApiKey: !!val.apiKey,
      isCurrent: key === currentProvider,
      models: Object.fromEntries(
        Object.entries(val.models).map(([mk, mv]) => [
          mk,
          { ...mv, isSelected: key === currentProvider && mk === currentModel }
        ])
      )
    };
  }
  res.json({ providers: result });
});

// 切换模型/提供商
app.post('/api/switch', (req, res) => {
  const { provider, model } = req.body;
  if (provider && MODEL_PROVIDERS[provider]) {
    currentProvider = provider;
  }
  if (model) {
    // 验证该模型属于当前provider
    const config = getModelProviders()[currentProvider];
    if (config && config.models[model]) {
      currentModel = model;
    } else {
      // 尝试查找模型属于哪个provider
      for (const [pk, pv] of Object.entries(MODEL_PROVIDERS)) {
        if (pv.models[model]) {
          currentProvider = pk;
          currentModel = model;
          break;
        }
      }
    }
  }
  const config = getCurrentConfig();
  res.json({ success: true, provider: currentProvider, model: currentModel, providerName: config.name });
});

// 智能问答
app.post('/api/chat', async (req, res) => {
  try {
    const { question, context, systemPrompt } = req.body;
    if (!question) return res.status(400).json({ error: '请提供问题内容' });

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    } else {
      messages.push({
        role: 'system',
        content: '你是一个专业的智能助手，擅长文献分析、知识问答和内容总结。请用专业、准确、结构化的方式回答用户问题。'
      });
    }
    messages.push({
      role: 'user',
      content: context ? `【参考背景】\n${context}\n\n【用户问题】\n${question}` : question
    });

    const data = await callLLMAPI(messages, 0.7);
    res.json({
      success: true,
      answer: data.choices?.[0]?.message?.content || '无法获取回答',
      usage: data.usage || null
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message || '服务异常' });
  }
});

// 文档总结
app.post('/api/summarize', async (req, res) => {
  try {
    const { content, type = 'general' } = req.body;
    if (!content) return res.status(400).json({ error: '请提供需要总结的内容' });

    const prompts = {
      general: '请对以下内容进行结构化总结，包括：核心观点、关键发现、重要结论。',
      paper: '请对这篇学术论文进行详细总结，包括：研究背景、方法创新点、实验结果、研究局限性、未来工作方向。',
      report: '请对这份报告进行总结，提取核心数据、主要结论和行动建议。'
    };

    const messages = [
      { role: 'system', content: '你是一个专业的文档分析专家，擅长提取和总结关键信息，输出清晰有逻辑的摘要。' },
      { role: 'user', content: `${prompts[type] || prompts.general}\n\n【文档内容】\n${content}` }
    ];

    const data = await callLLMAPI(messages, 0.5);
    res.json({
      success: true,
      summary: data.choices?.[0]?.message?.content || '总结生成失败',
      usage: data.usage || null
    });
  } catch (error) {
    console.error('Summarize API Error:', error);
    res.status(500).json({ error: '总结服务异常' });
  }
});

// 知识图谱提取
app.post('/api/kg-extract', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '请提供内容' });

    const messages = [
      { role: 'system', content: '你是一个知识图谱构建专家。请从给定文本中提取核心概念及其关系关系，严格输出JSON格式：{"nodes": [{"id":1,"label":"概念名","type":"类型"}], "edges": [{"source":1,"target":2,"relation":"关系描述"}]}' },
      { role: 'user', content: `请从以下文本中提取核心概念和它们之间的关系：\n${content.substring(0, 8000)}` }
    ];

    const data = await callLLMAPI(messages, 0.3);

    let result;
    try {
      const text = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { nodes: [], edges: [] };
    } catch (e) {
      result = { nodes: [], edges: [], parse_error: true };
    }

    res.json({ success: true, kg: result, usage: data.usage || null });
  } catch (error) {
    console.error('KG Extract API Error:', error);
    res.status(500).json({ error: '知识图谱生成失败' });
  }
});

// 批量问答
app.post('/api/batch-qa', async (req, res) => {
  try {
    const { questions, document } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: '请提供问题列表' });
    }

    const results = [];
    for (const q of questions.slice(0, 10)) {
      const messages = [
        { role: 'system', content: '你是研究助手，基于提供的文档内容准确回答问题。如果文档中没有相关信息，请明确说明。' },
        { role: 'user', content: `【参考文档】\n${document || ''}\n\n【问题】${q}` }
      ];
      const data = await callLLMAPI(messages, 0.5);
      results.push({
        question: q,
        answer: data.choices?.[0]?.message?.content || '无回答',
        usage: data.usage || null
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Batch QA Error:', error);
    res.status(500).json({ error: '批量问答失败' });
  }
});

app.listen(PORT, () => {
  const config = getCurrentConfig();
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     🤖 小浩智能助手 启动成功！       ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  📍 地址: http://localhost:${PORT}           ║`);
  console.log(`║  🧠 模型: ${config.name} / ${currentModel.padEnd(20)} ║`);
  console.log(`║  🔑 Key: ${config.apiKey ? '已配置 ✓' : '未配置 ✗'.padEnd(18)} ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
