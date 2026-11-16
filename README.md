# 🎮 HIHello's 工具与游戏站

## 项目简介
这是一个基于原生 HTML/CSS/JavaScript 开发的个人实用工具与在线游戏聚合网站。项目采用了现代化的模块化开发思想，实现了无刷新页面切换、亮暗主题切换，并内置了三款经典在线小游戏。

## 在线预览
[https://humhihello.github.io/my-use-html/](https://humhihello.github.io/my-use-html/)

## 技术栈
- **原生 HTML5 / CSS3 / JavaScript (ES6)**
- **数据驱动渲染**：数据与逻辑分离（`data.js`）
- **模块化开发**：HTML 片段异步加载（`fetch`），CSS 按功能拆分
- **状态管理**：利用 `localStorage` 实现主题记忆
- **游戏引擎**：基于 Canvas 实现贪吃蛇与俄罗斯方块，基于 DOM 网格实现扫雷

## 功能亮点
1. **指南/工具**：数据动态渲染、实时搜索过滤、代码高亮、一键复制。
2. **扫雷**：支持多难度切换、自定义尺寸、自动标雷、双击展开（Chord）、移动端长按插旗。
3. **贪吃蛇**：多地图切换、生命值系统、多种特殊食物（无敌/减速/炸弹等）、按空格加速。
4. **俄罗斯方块**：7-bag 随机算法、幽灵方块落点预测、完整的旋转踢墙（Wall Kick）机制、多倍速等级系统。

## 目录结构

```text
MY-USE-HTML
|   index.html
|   
+---assets
|   +---downloads
|   |       i4Remote_Lite_1.0.32.exe
|   |       Radmin_LAN_1.4.4642.1.exe
|   |       Steam.cfg
|   |       
|   +---images
|   |   +---i4_help
|   |   |       i4_help01.png
|   |   |       i4_help02.png
|   |   |       
|   |   +---radmin_help
|   |   |       radmin_help01.png
|   |   |       radmin_help02.png
|   |   |       radmin_help03.png
|   |   |       radmin_help04.png
|   |   |       
|   |   +---steam_cfg
|   |   |       steam_cfg01.png
|   |   |       steam_cfg02.png
|   |   |       steam_cfg03.png
|   |   |       
|   |   +---steam_cleandownload
|   |   |       steam_cleandownload01.png
|   |   |       steam_cleandownload02.png
|   |   |       
|   |   \---steam_version
|   |           steam_version.png
|   |           
|   \---videos
+---css
|       base.css
|       components.css
|       game.css
|       layout.css
|       minesweeper.css
|       responsive.css
|       snake.css
|       style.css
|       tetris.css
|       
+---html
|       game.html
|       guide.html
|       notice.html
|       tools.html
|       
\---js
        data.js
        minesweeper.js
        script.js
        snake.js
        tetris.js