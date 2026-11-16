// ==========================================
//  页面加载与路由逻辑
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 异步加载所有 HTML 片段
    await Promise.all([
        loadHTML('html/notice.html'),
        loadHTML('html/guide.html'),
        loadHTML('html/tools.html'),
        loadHTML('html/game.html')
        
    ]);
    
    // 2. 初始化渲染内容
    renderTools();
    renderGuides();
    
    // 3. 绑定全局事件
    bindEvents();
    initTheme();
    
    // 4. 初始化游戏模块（此时 DOM 已全部渲染完毕）
    if (typeof initMinesweeper === 'function') initMinesweeper();
    if (typeof initSnake === 'function') initSnake();
    if (typeof initTetris === 'function') initTetris();
});

// 动态加载 HTML 片段
async function loadHTML(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        document.getElementById('page-container').insertAdjacentHTML('beforeend', html);
    } catch (error) {
        console.error(`加载 ${url} 失败:`, error);
    }
}

// ==========================================
//  渲染逻辑区
// ==========================================
function renderTools() {
    const container = document.getElementById('tool-container');
    if (!container) return;
    let htmlStr = '';
    toolsData.forEach(tool => {
        let linksHtml = '';
        tool.links.forEach(link => {
            linksHtml += `<a href="${link.url}" class="link">${link.text}</a>`;
        });
        htmlStr += `
            <div class="tool-item">
                <span class="icon">${tool.icon}</span>
                <div class="info">
                    <div class="name">${tool.name}</div>
                    <div class="desc">${tool.desc}</div>
                </div>
                ${linksHtml}
            </div>
        `;
    });
    container.innerHTML = htmlStr;
}

function renderGuides() {
    const container = document.getElementById('guide-container');
    if (!container) return;
    let htmlStr = '';
    guidesData.forEach(module => {
        let cardsHtml = '';
        module.cards.forEach(card => {
            let stepsHtml = '';
            card.steps.forEach(step => {
                stepsHtml += `<img class="step-img" src="${step.img}" alt="教程图"><div class="step-caption">${step.caption}</div>`;
            });
            cardsHtml += `
                <div class="guide-card">
                    <div class="guide-title"><span>${card.title}</span><span class="arrow">▾</span></div>
                    <div class="guide-content">${stepsHtml}</div>
                </div>
            `;
        });
        const backupClass = module.isBackup ? 'module-backup' : '';
        htmlStr += `
            <div class="guide-module ${backupClass}">
                <div class="module-title">
                    <span>${module.title}</span>
                    <div>
                        <span class="toggle-all-btn" style="font-size:14px; color:var(--primary-color); margin-right:15px; cursor:pointer; background:var(--primary-bg); padding:2px 8px; border-radius:4px;">全部展开</span>
                        <span class="arrow">▾</span>
                    </div>
                </div>
                <div class="module-content">${cardsHtml}</div>
            </div>
        `;
    });
    container.innerHTML = htmlStr;
}

// 同步折叠按钮文字状态
function updateToggleBtnText(moduleElement) {
    if (!moduleElement) return;
    const btn = moduleElement.querySelector('.toggle-all-btn');
    if (!btn) return;
    const cards = moduleElement.querySelectorAll('.guide-card');
    if (cards.length === 0) return;
    const openCards = moduleElement.querySelectorAll('.guide-card.open').length;
    btn.textContent = (openCards === cards.length) ? '全部折叠' : '全部展开';
}

// ==========================================
//  交互逻辑区
// ==========================================
function bindEvents() {
    // 1. 底部导航切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(this.dataset.target);
            if (target) target.classList.add('active');
        });
    });

    // 2. 游戏 Tab 切换（事件委托，防止 DOM 未加载）
    document.body.addEventListener('click', function(e) {
        const tab = e.target.closest('.game-tab');
        if (tab) {
            // 切换按钮高亮
            document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // ⭐ 切换前，如果离开了俄罗斯方块，强制暂停
            if (typeof tRunning !== 'undefined' && tRunning && !tPaused) {
                // 模拟按 P 键触发暂停
                document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'p' }));
            }

            // 切换面板显示
            document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(tab.dataset.game + '-container');
            if (target) target.classList.add('active');
        }
    });

    // 3. 指南折叠面板（事件委托）
    document.body.addEventListener('click', function(e) {
        // 全部展开/折叠
        if (e.target.classList.contains('toggle-all-btn')) {
            e.stopPropagation(); 
            const btn = e.target;
            const module = btn.closest('.guide-module');
            const cards = module.querySelectorAll('.guide-card');
            const isExpanding = btn.textContent === '全部展开';
            
            module.classList.toggle('open', isExpanding);
            cards.forEach(card => card.classList.toggle('open', isExpanding));
            updateToggleBtnText(module);
            return;
        }

        // 大模块标题点击
        const moduleTitle = e.target.closest('.module-title');
        if (moduleTitle) {
            const module = moduleTitle.closest('.guide-module');
            module.classList.toggle('open');
            updateToggleBtnText(module);
        }

        // 小条目标题点击
        const guideTitle = e.target.closest('.guide-title');
        if (guideTitle) {
            const card = guideTitle.closest('.guide-card');
            card.classList.toggle('open');
            const module = card.closest('.guide-module');
            updateToggleBtnText(module);
        }
    });

    // 4. 复制功能（事件委托）
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            const textToCopy = e.target.getAttribute('data-copy'); 
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('复制成功');
                }).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showToast('复制成功');
                });
            }
        }
    });

    // 5. 搜索过滤
    const searchInput = document.getElementById('tool-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const keyword = e.target.value.toLowerCase().trim();
            const toolItems = document.querySelectorAll('.tool-item');
            let hasResult = false; 

            toolItems.forEach(item => {
                const name = item.querySelector('.name').textContent.toLowerCase();
                const desc = item.querySelector('.desc').textContent.toLowerCase();
                if (name.includes(keyword) || desc.includes(keyword)) {
                    item.style.display = 'flex';
                    hasResult = true;
                } else {
                    item.style.display = 'none';
                }
            });

            const container = document.getElementById('tool-container');
            let emptyTip = document.getElementById('empty-tip');
            if (!hasResult) {
                if (!emptyTip) {
                    emptyTip = document.createElement('div');
                    emptyTip.id = 'empty-tip';
                    emptyTip.style.cssText = 'text-align:center; color:var(--text-muted); padding:40px 0; font-size:15px; grid-column: 1 / -1;';
                    emptyTip.innerHTML = '没有找到相关工具，请尝试其他关键词';
                    container.appendChild(emptyTip);
                }
            } else if (emptyTip) {
                emptyTip.remove();
            }
        });
    }

    // 6. 回到顶部
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });

    // 7. 快捷键：/ 聚焦搜索
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            const search = document.getElementById('tool-search');
            if (search) search.focus();
        }
    });
}

// ==========================================
//  主题与全局提示
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

function initTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.classList.add('light-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        themeToggleBtn.textContent = '🌙';
    }
}

if (themeToggleBtn) {
themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-theme');
    if (body.classList.contains('light-theme')) {
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '☀️';
    } else {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '🌙';
    }
    // ⭐ 通知画布重绘
    if (typeof snakeDraw === 'function') snakeDraw();
});
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show'); 
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}