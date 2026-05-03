// ============================================================
//  小浩智能助手 - 前端交互逻辑
// ============================================================

const API_BASE = '';

async function apiPost(endpoint, body) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    return res.json();
}

function setLoading(btnEl, loading) {
    if (loading) {
        btnEl.disabled = true;
        btnEl.dataset.orig = btnEl.innerHTML;
        btnEl.innerHTML = '⏳ 处理中...';
    } else {
        btnEl.disabled = false;
        btnEl.innerHTML = btnEl.dataset.orig || btnEl.innerHTML;
    }
}

// ========== Tab 切换 ==========
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ========== 模型切换 ==========
let allProviders = {};

function switchProvider() {
    const providerKey = document.getElementById('providerSelect').value;
    if (!providerKey || !allProviders[providerKey]) return;

    const provider = allProviders[providerKey];
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = '';

    Object.entries(provider.models).forEach(([mk, mv]) => {
        const opt = document.createElement('option');
        opt.value = mk;
        opt.textContent = `${mv.label} — ${mv.desc}`;
        if (mv.isSelected) opt.selected = true;
        modelSelect.appendChild(opt);
    });

    // 通知后端切换
    apiPost('/api/switch', { provider: providerKey }).then(r => {
        updateModelInfo();
    });
}

function switchModel() {
    const modelKey = document.getElementById('modelSelect').value;
    if (!modelKey) return;

    apiPost('/api/switch', { model: modelKey }).then(r => {
        updateModelInfo();
    });
}

function updateModelInfo() {
    const info = document.getElementById('currentModelInfo');
    const provSel = document.getElementById('providerSelect');
    const modelSel = document.getElementById('modelSelect');

    const provName = provSel.options[provSel.selectedIndex]?.text || '';
    const modelName = modelSel.options[modelSel.selectedIndex]?.text || '';
    const hasKey = allProviders[provSel.value]?.hasApiKey;

    info.innerHTML = `
        <div><strong>${provName}</strong></div>
        <div style="color:#6b7280">${modelName.split('—')[0] || ''}</div>
        <div style="margin-top:6px">
            ${hasKey
                ? '<span style="color:var(--success);font-size:12px">● API Key 已配置</span>'
                : '<span style="color:var(--warning);font-size:12px">● 需要配置 Key</span>'}
        </div>
    `;
}

// ========== 智能问答 ==========
function appendMessage(role, content) {
    const chatBox = document.getElementById('chatBox');
    const welcome = chatBox.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${role}`;
    msgDiv.innerHTML = `
        <div class="msg-avatar">${role === 'user' ? '🧑' : '🤖'}</div>
        <div class="msg-body">${escapeHTML(content).replace(/\n/g, '<br>')}</div>
    `;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;

    appendMessage('user', question);
    input.value = '';

    // 找到发送按钮（当前tab的）
    const btns = document.querySelectorAll('.send-btn');
    const btn = Array.from(btns).find(b => b.closest('#tab-chat'));

    if (btn) setLoading(btn, true);
    appendMessage('assistant', '思考中...');

    try {
        const data = await apiPost('/api/chat', { question });

        const chatBox = document.getElementById('chatBox');
        const thinkingMsg = chatBox.querySelector('.msg.assistant:last-child .msg-body');
        if (thinkingMsg && thinkingMsg.textContent.includes('思考中')) {
            thinkingMsg.innerHTML = escapeHTML(data.answer || '抱歉，暂时无法回答。').replace(/\n/g, '<br>');
        }
    } catch (e) {
        console.error(e);
        const chatBox = document.getElementById('chatBox');
        const last = chatBox.querySelector('.msg.assistant:last-child .msg-body');
        if (last && last.textContent.includes('思考中')) {
            last.innerHTML = '⚠️ 请求失败，请检查模型配置后重试';
        }
    }

    if (btn) setLoading(btn, false);
}

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
        });
    }
});

// ========== 文档总结 ==========
async function doSummarize() {
    const content = document.getElementById('summaryInput').value.trim();
    const type = document.getElementById('summaryType').value;
    if (!content) { alert('请输入文档内容'); return; }

    const btn = event.target; setLoading(btn, true);

    try {
        const data = await apiPost('/api/summarize', { content, type });
        const resultBox = document.getElementById('summaryResult');
        const rc = document.getElementById('summaryContent');
        resultBox.style.display = 'block';
        rc.innerHTML = `<div style="line-height:1.8">${escapeHTML(data.summary || '总结失败').replace(/\n/g, '<br>')}</div>`;
    } catch (e) {
        alert('总结失败：' + (e.message || '未知错误'));
    }
    setLoading(btn, false);
}

// ========== 知识图谱 ==========
async function doKGExtract() {
    const content = document.getElementById('kgInput').value.trim();
    if (!content) { alert('请输入文本内容'); return; }

    const btn = event.target; setLoading(btn, true);

    try {
        const data = await apiPost('/api/kg-extract', { content });
        const rb = document.getElementById('kgResult');
        const rc = document.getElementById('kgContent');
        rb.style.display = 'block';

        if (data.kg && data.kg.nodes) {
            const { nodes, edges } = data.kg;
            rc.textContent = [
                `📊 共提取 ${nodes.length} 个概念节点，${edges.length} 条关系\n`,
                '━━━━━━━━━━━━━━━\n【节点列表】',
                ...nodes.map(n => `  • ${n.label}（${n.type || '未分类'}）`),
                '\n【关系列表】',
                ...edges.map(e => {
                    const s = nodes.find(n => n.id === e.source)?.label || e.source;
                    const t = nodes.find(n => n.id === e.target)?.label || e.target;
                    return `  ${s} ──[${e.relation}]──→ ${t}`;
                })
            ].join('\n');
        } else {
            rc.textContent = '图谱生成失败，请重试或更换模型。';
        }
    } catch (e) {
        alert('知识图谱提取失败：' + (e.message || '未知错误'));
    }
    setLoading(btn, false);
}

// ========== 批量问答 ==========
async function doBatchQA() {
    const doc = document.getElementById('batchDoc').value.trim();
    const qText = document.getElementById('batchQuestions').value.trim();
    if (!qText) { alert('请输入至少一个问题'); return; }

    const questions = qText.split('\n').filter(q => q.trim());
    if (questions.length > 10) { alert('最多支持10个问题'); return; }

    const btn = event.target; setLoading(btn, true);

    try {
        const data = await apiPost('/api/batch-qa', { questions, document: doc });
        const rb = document.getElementById('batchResult');
        const rc = document.getElementById('batchContent');
        rb.style.display = 'block';

        if (data.results?.length) {
            rc.innerHTML = data.results.map((r, i) => `
                <div class="qa-item">
                    <div class="q">Q${i+1}: ${escapeHTML(r.question)}</div>
                    <div class="a">${escapeHTML(r.answer).replace(/\n/g, '<br>')}</div>
                </div>
            `).join('');
        } else {
            rc.innerHTML = '<p>批量问答失败，请检查模型配置。</p>';
        }
    } catch (e) {
        alert('批量问答失败：' + (e.message || '未知错误'));
    }
    setLoading(btn, false);
}

// ========== 启动加载 ==========
window.addEventListener('DOMContentLoaded', async () => {
    // 加载模型列表
    try {
        const data = await apiGet('/api/models');
        allProviders = data.providers || {};

        const provSel = document.getElementById('providerSelect');
        const modelSel = document.getElementById('modelSelect');
        provSel.innerHTML = '';
        modelSel.innerHTML = '';

        for (const [pk, pv] of Object.entries(allProviders)) {
            const opt = document.createElement('option');
            opt.value = pk;
            opt.textContent = pv.name + (pv.hasApiKey ? '' : ' (需配Key)');
            if (pv.isCurrent) opt.selected = true;
            provSel.appendChild(opt);

            if (pv.isCurrent) {
                for (const [mk, mv] of Object.entries(pv.models)) {
                    const mOpt = document.createElement('option');
                    mOpt.value = mk;
                    mOpt.textContent = `${mv.label} — ${mv.desc}`;
                    if (mv.isSelected) mOpt.selected = true;
                    modelSel.appendChild(mOpt);
                }
            }
        }

        updateModelInfo();

        // 更新状态栏
        const badge = document.getElementById('statusBadge');
        try {
            const health = await apiGet('/api/health');
            badge.innerHTML = `<span class="dot ${health.status==='ok'?'online':''}"></span> ${health.provider} / ${health.model} ${health.hasApiKey?'✓':'(需配Key)'}`;
        } catch(e2) {
            badge.innerHTML = '<span class="dot"></span> 服务未启动';
        }
    } catch (e) {
        console.error('Init error:', e);
        document.getElementById('statusBadge').innerHTML = '<span class="dot"></span> 加载失败';
    }
});
