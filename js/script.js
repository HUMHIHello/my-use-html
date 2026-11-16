// #region 工具添加模板
/* ================= 📝 工具添加模板 ================= */
    // 复制下面这段大括号及里面的内容，粘到上一个工具的逗号后面，删掉前面的 // 就能用。
    // {
    //     icon: '🌐', // 图标
    //     name: '工具名称', // 名字
    //     desc: '工具简短描述', // 描述
    //     links: [
    //         { text: '访问官网', url: 'https://网址.com' },
    //         // 如果有本地文件，路径这样写：
    //         { text: '本网站下载', url: 'assets/downloads/你的文件.zip' } 
    //         { text: '官网下载', url: 'https://网址.com' } 
    //     ]
    // },
// #endregion
// #region 指南添加模板
    /* ================= 📝 指南添加模板 ================= */
    // 复制下面这段大括号及里面的内容，粘到上一个模块的逗号后面，删掉前面的 // 就能用。
    // {
    //     title: '🟩 模块名称', // 比如：🟩 浏览器相关
    //     // isBackup: true, // 这一行默认注释掉，如果你的模块需要黄边，就删掉前面的 //
    //     cards: [
    //         {
    //             title: '📝 教程标题', // 比如：📝 Chrome 清除缓存
    //             steps: [
    //                 // 步骤1
    //                 { img: 'images/文件夹名字/图片1.png', caption: '步骤1：这里是文字说明' },
    //                 // 步骤2
    //                 { img: 'images/文件夹名字/图片2.png', caption: '步骤2：这里是文字说明' }
    //             ]
    //         },
    //         // 如果这个模块下还有第二个教程，就把上面那个 card 复制一遍放在这里
    //     ]
    // },
// #endregion

// ==========================================
// 🌟 数据配置区 (保持你的原样即可，我稍微精简了展示)
// ==========================================
const toolsData = [
    {
        icon: '🖥️', name: '爱思远控 Lite', desc: '轻量远程控制',
        links: [
            { text: '官网下载', url: 'https://d-app6.i4.cn/i4tools/remote/win/i4Remote_Lite_1.0.32.exe' },
            { text: '本网站下载', url: 'assets/downloads/i4Remote_Lite_1.0.32.exe' }
        ]
    },
    {
        icon: '🎮', name: 'Steam 官方', desc: '游戏平台',
        links: [{ text: '访问官网', url: 'https://store.steampowered.com/about/' }]
    },
    {
        icon: '🔗', name: 'RadminLAN', desc: '虚拟局域网',
        links: [
            { text: '官网下载', url: 'https://www.radmin-lan.cn/' },
            { text: '本网站下载', url: 'assets/downloads/Radmin_LAN_1.4.4642.1.exe' }
        ]
    },
    {
        icon: '💬', name: 'KOOK', desc: '语音开黑',
        links: [{ text: '访问官网', url: 'https://www.kookapp.cn/' }]
    }
];

const guidesData = [
    {
        title: '🎮 备用指南 · 当前游戏教程', isBackup: true,
        cards: [
            { title: '🔄 暂无', steps: [{ img: 'assets/images/backup/step1.png', caption: '步骤1：这是一张占位图' }] }
        ]
    },
    {
        title: '🖥️ 电脑远控相关',
        cards: [
            {
                title: '📡 爱思远控使用方法',
                steps: [
                    { img: 'assets/images/i4_help/i4_help01.png', caption: '步骤1：下载安装爱思远控' },
                    { img: 'assets/images/i4_help/i4_help02.png', caption: '步骤2：将远控码和密码复制发给远控你的人' }
                ]
            }
        ]
    }
];

// ==========================================
// 🌟 渲染逻辑区
// ==========================================
function renderTools() {
    const container = document.getElementById('tool-container');
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
                <div class="module-title"><span>${module.title}</span><span class="arrow">▾</span></div>
                <div class="module-content">${cardsHtml}</div>
            </div>
        `;
    });
    container.innerHTML = htmlStr;
}

// ==========================================
// 🌟 交互逻辑区：初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderTools();
    renderGuides();
    bindEvents();
    initTheme(); // 初始化主题
});

function bindEvents() {
    // 1. 底部 Tab 切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(this.dataset.target).classList.add('active');
        });
    });

    // 2. 折叠面板（利用事件委托，更高级的写法）
    // 监听整个容器，点击任何地方判断点的是不是标题，不用写两个循环了！
    document.body.addEventListener('click', function(e) {
        // 如果点的是模块标题
        if (e.target.closest('.module-title')) {
            e.target.closest('.guide-module').classList.toggle('open');
        }
        // 如果点的是条目标题
        if (e.target.closest('.guide-title')) {
            e.target.closest('.guide-card').classList.toggle('open');
        }
    });

    // ==========================================
    // 🌟 炫技点：一键复制功能（事件委托）
    // ==========================================
    document.body.addEventListener('click', function(e) {
        // 如果点击的按钮包含 class="copy-btn"
        if (e.target.classList.contains('copy-btn')) {
            const textToCopy = e.target.getAttribute('data-copy'); // 获取要复制的文字
            if (textToCopy) {
                // 现代浏览器复制 API
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('复制成功！🎉');
                }).catch(err => {
                    // 降级方案（本地 localhost 有时候会拦截）
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showToast('复制成功！🎉');
                });
            }
        }
    });

    // ==========================================
    // 🌟 炫技点：实时搜索过滤功能
    // ==========================================
    const searchInput = document.getElementById('tool-search');
    searchInput.addEventListener('input', function(e) {
        const keyword = e.target.value.toLowerCase().trim(); // 转小写并去空格
        const toolItems = document.querySelectorAll('.tool-item');

        toolItems.forEach(item => {
            const name = item.querySelector('.name').textContent.toLowerCase();
            const desc = item.querySelector('.desc').textContent.toLowerCase();
            
            // 如果名字或描述包含搜索词
            if (name.includes(keyword) || desc.includes(keyword)) {
                item.style.display = 'flex'; // 显示
            } else {
                item.style.display = 'none'; // 隐藏
            }
        });
    });
}

// ==========================================
// 🌟 炫技点：主题切换功能
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

// 初始化主题（读取 localStorage）
function initTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.classList.add('light-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        themeToggleBtn.textContent = '🌙';
    }
}

// 点击按钮切换
themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-theme');
    
    if (body.classList.contains('light-theme')) {
        localStorage.setItem('theme', 'light'); // 记住用户的选择
        themeToggleBtn.textContent = '☀️';
    } else {
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '🌙';
    }
});

// ==========================================
// 🌟 炫技点：全局 Toast 提示框
// ==========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show'); // 显示出来

    // 2秒后自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}