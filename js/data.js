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
//  数据配置区 (保持你的原样即可，我稍微精简了展示)
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
