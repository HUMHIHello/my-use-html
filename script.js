// ========== 1. 底部Tab切换 ==========
const navItems = document.querySelectorAll('.nav-item');
const pages = {
    guide: document.getElementById('page-guide'),
    tools: document.getElementById('page-tools'),
    notice: document.getElementById('page-notice')
};

navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        const targetId = this.dataset.target;
        Object.values(pages).forEach(p => p.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
    });
});

// ========== 2. 模块折叠（点击模块标题） ==========
document.querySelectorAll('.guide-module').forEach(mod => {
    const title = mod.querySelector('.module-title');
    title.addEventListener('click', function() {
        mod.classList.toggle('open');
    });
});

// ========== 3. 条目折叠（点击条目标题） ==========
document.querySelectorAll('.guide-card').forEach(card => {
    const title = card.querySelector('.guide-title');
    title.addEventListener('click', function() {
        card.classList.toggle('open');
    });
});

// ========== 4. 工具点击反馈 ==========
document.querySelectorAll('.tool-item .link').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.getAttribute('href') === '#') {
            e.preventDefault();
            this.textContent = '待添加';
            this.style.background = '#FBBF24';
            this.style.color = '#0B0E14';
            setTimeout(() => {
                this.textContent = '下载';
                this.style.background = '';
                this.style.color = '';
            }, 1000);
        }
    });
});

console.log('🎮 HIHello\'s网站 已加载！');