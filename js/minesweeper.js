// ==========================================
//  扫雷游戏逻辑
// ==========================================

const MS_LEVELS = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
};

const MS_LEADERBOARD_KEY = 'msLeaderboard';
const MS_PLAYER_NAME_KEY = 'msPlayerName';
const MS_LEADERBOARD_MAX = 300;
const MS_LEADERBOARD_SHOW = 30;
const MS_LB_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'easy', label: '初级' },
    { key: 'medium', label: '中级' },
    { key: 'hard', label: '高级' },
    { key: 'fullscreen', label: '满屏' },
    { key: 'custom', label: '自定义' }
];

let msLevel = 'easy';
let msCurrentConfig = {};
let msBoard = [];
let msMinesPlaced = false;
let msGameOver = false;
let msGameResult = null;
let msCellsRevealed = 0;
let msFlagsPlaced = 0;
let msTimerInterval = null;
let msTimeElapsed = 0;
let msAutoFlagEnabled = false;
let msFlagMode = false;

// 成绩弹窗 / 排行榜状态
let msPendingScore = null;
let msScorePromptTimer = null;
let msLeaderboardFilter = 'easy';

// DOM 节点引用（在 initMinesweeper 中赋值）
let msBoardEl, msFaceBtn, msMineCounterEl, msTimerEl;
let msModalEl, msModalTitleEl, msScorePanelEl, msLeaderboardPanelEl;
let msScoreTimeEl, msScoreConfigEl, msScoreNameEl, msLbFiltersEl, msLbListEl;

// 初始化控制函数
function initMinesweeper() {
    // 获取 DOM
    msBoardEl = document.getElementById('minesweeper-board');
    msFaceBtn = document.getElementById('ms-face-btn');
    msMineCounterEl = document.getElementById('ms-mine-counter');
    msTimerEl = document.getElementById('ms-timer');

    // 成绩弹窗移到 body 下，避免被游戏页的页面动画影响 fixed 定位
    msModalEl = document.getElementById('ms-modal');
    msModalTitleEl = document.getElementById('ms-modal-title');
    msScorePanelEl = document.getElementById('ms-score-panel');
    msLeaderboardPanelEl = document.getElementById('ms-leaderboard-panel');
    msScoreTimeEl = document.getElementById('ms-score-time');
    msScoreConfigEl = document.getElementById('ms-score-config');
    msScoreNameEl = document.getElementById('ms-score-name');
    msLbFiltersEl = document.getElementById('ms-lb-filters');
    msLbListEl = document.getElementById('ms-lb-list');

    if (msModalEl && msModalEl.parentElement !== document.body) {
        document.body.appendChild(msModalEl);
    }

    // 导出 / 排行榜入口
    const exportBtn = document.getElementById('ms-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', msExportBoard);

    const leaderboardBtn = document.getElementById('ms-leaderboard-btn');
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => msOpenLeaderboard(msLevel));

    msBindModalEvents();

    // 绑定事件
    if (msFaceBtn) msFaceBtn.addEventListener('click', () => msInit(msLevel));

    document.querySelectorAll('.ms-diff-btn[data-level]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.ms-diff-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('ms-custom-panel').classList.remove('show');
            msInit(this.dataset.level);
        });
    });

    const autoFlagCheckbox = document.getElementById('ms-auto-flag');
    if (autoFlagCheckbox) {
        autoFlagCheckbox.addEventListener('change', function(e) {
            msAutoFlagEnabled = e.target.checked;
            if (msAutoFlagEnabled) msAutoFlagLogic();
        });
    }

    const customToggleBtn = document.getElementById('ms-btn-custom-toggle');
    if (customToggleBtn) {
        customToggleBtn.addEventListener('click', function() {
            document.querySelectorAll('.ms-diff-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('ms-custom-panel').classList.add('show');
        });
    }

    const inputRows = document.getElementById('ms-input-rows');
    const inputCols = document.getElementById('ms-input-cols');
    const inputMines = document.getElementById('ms-input-mines');

    function autoCalcMines() {
        let r = parseInt(inputRows.value) || 10;
        let c = parseInt(inputCols.value) || 10;
        let recommended = Math.floor(r * c * 0.20625);
        if (recommended > r * c - 9) recommended = r * c - 9; 
        inputMines.value = recommended;
    }

    if (inputRows) inputRows.addEventListener('input', autoCalcMines);
    if (inputCols) inputCols.addEventListener('input', autoCalcMines);

    const applyBtn = document.getElementById('ms-btn-apply-custom');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => msInit('custom'));
    }

    // 启动第一局
    msInit();
}

// 初始化核心函数
function msInit(level = msLevel) {
    if (!msBoardEl) return; // 防止 DOM 还没加载完就被调用
    msLevel = level;
    
    if (level === 'fullscreen') {
        const availableWidth = Math.min(window.innerWidth - 40, 1200); 
        const availableHeight = window.innerHeight - 360; 
        let cols = Math.max(Math.floor(availableWidth / 30), 9);
        let rows = Math.max(Math.floor(availableHeight / 30), 9);
        const mines = Math.floor(rows * cols * 0.20625);
        msCurrentConfig = { rows, cols, mines };
    } else if (level === 'custom') {
        let r = parseInt(document.getElementById('ms-input-rows').value) || 16;
        let c = parseInt(document.getElementById('ms-input-cols').value) || 30;
        let m = parseInt(document.getElementById('ms-input-mines').value) || 99;
        
        r = Math.max(5, Math.min(r, 50));
        c = Math.max(5, Math.min(c, 50));
        m = Math.max(1, Math.min(m, r * c - 9));

        document.getElementById('ms-input-rows').value = r;
        document.getElementById('ms-input-cols').value = c;
        document.getElementById('ms-input-mines').value = m;

        msCurrentConfig = { rows: r, cols: c, mines: m };
    } else {
        msCurrentConfig = { ...MS_LEVELS[level] };
    }

    const { rows, cols, mines } = msCurrentConfig;

    msBoardEl.innerHTML = '';
    msBoardEl.classList.toggle('ms-flag-mode', msFlagMode);
    msBoardEl.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
    
    if (cols > 20) msBoardEl.style.overflowX = 'auto';
    else msBoardEl.style.overflowX = 'hidden';

    msBoard = [];
    msMinesPlaced = false;
    msGameOver = false;
    msGameResult = null;
    msCellsRevealed = 0;
    msFlagsPlaced = 0;
    msTimeElapsed = 0;

    if (msScorePromptTimer) {
        clearTimeout(msScorePromptTimer);
        msScorePromptTimer = null;
    }
    msPendingScore = null;
    msCloseModal();

    clearInterval(msTimerInterval);
    msTimerEl.textContent = '000';
    msFaceBtn.textContent = '🙂';
    msUpdateMineCounter(mines);

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cell = { r, c, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 };
            row.push(cell);

            const el = document.createElement('div');
            el.className = 'ms-cell';
            el.dataset.r = r;
            el.dataset.c = c;

            msBindCellInput(el, r, c);

            msBoardEl.appendChild(el);
        }
        msBoard.push(row);
    }
}

// ==========================================
//  格子输入：鼠标左右键 + 触屏长按标雷
// ==========================================
function msBindCellInput(el, r, c) {
    let pressTimer = null;
    let pressStart = null;
    let lastPointerType = 'mouse';
    let longPressFired = false;
    let lastLongPressTime = 0;

    const cancelPress = () => {
        if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const finishPress = () => {
        cancelPress();
        pressStart = null;

        if (longPressFired) {
            longPressFired = false;
            // 记录触发时间，用来吞掉长按后浏览器补发的 click
            lastLongPressTime = Date.now();
        }
    };

    const triggerLongPress = () => {
        // 已经触发过，或刚结束一次长按（浏览器补发了 contextmenu）时不再重复标雷
        if (longPressFired || Date.now() - lastLongPressTime < 600) return;

        cancelPress();
        longPressFired = true;
        lastLongPressTime = Date.now();

        msRightClick(r, c);

        el.classList.add('ms-long-press');
        setTimeout(() => el.classList.remove('ms-long-press'), 200);

        if (navigator.vibrate) {
            try { navigator.vibrate(30); } catch (_) {}
        }
    };

    el.addEventListener('pointerdown', (e) => {
        lastPointerType = e.pointerType || 'mouse';

        // 只处理左键 / 触摸；右键交给 contextmenu
        if (e.button !== undefined && e.button !== 0) return;

        longPressFired = false;
        pressStart = { x: e.clientX, y: e.clientY };
        cancelPress();

        if (lastPointerType !== 'touch' && lastPointerType !== 'pen') return;

        pressTimer = setTimeout(triggerLongPress, 420);
    });

    el.addEventListener('pointermove', (e) => {
        if (!pressStart) return;
        // 手指明显移动视为滚动 / 滑动，取消长按
        if (Math.abs(e.clientX - pressStart.x) > 10 ||
            Math.abs(e.clientY - pressStart.y) > 10) {
            cancelPress();
            pressStart = null;
        }
    });

    el.addEventListener('pointerup', finishPress);

    el.addEventListener('pointercancel', () => {
        cancelPress();
        pressStart = null;
        longPressFired = false;
    });

    el.addEventListener('pointerleave', () => {
        if (lastPointerType === 'mouse') {
            cancelPress();
            pressStart = null;
        }
    });

    el.addEventListener('click', (e) => {
        // 关键修复：长按标雷后浏览器还会补发一次 click，不拦掉会立刻把雷挖开
        if (Date.now() - lastLongPressTime < 500) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        msLeftClick(r, c);
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        // 触屏长按由定时器处理；部分浏览器会提前弹出系统菜单，这里也补一次标雷并取消定时器
        if (lastPointerType === 'touch' || lastPointerType === 'pen') {
            triggerLongPress();
            return;
        }

        msRightClick(r, c);
    });
}

function msGetFlagMode() {
    return msFlagMode;
}

function msSetFlagMode(enabled) {
    msFlagMode = !!enabled;

    if (msBoardEl) {
        msBoardEl.classList.toggle('ms-flag-mode', msFlagMode);
    }

    return msFlagMode;
}

// ==========================================
//  核心逻辑
// ==========================================
function msUpdateMineCounter(mines) {
    const remain = mines - msFlagsPlaced;
    msMineCounterEl.textContent = String(Math.max(remain, 0)).padStart(3, '0');
}

function msPlaceMines(firstR, firstC) {
    const { rows, cols, mines } = msCurrentConfig;
    let placed = 0;
    while (placed < mines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (!msBoard[r][c].isMine && (Math.abs(r - firstR) > 1 || Math.abs(c - firstC) > 1)) {
            msBoard[r][c].isMine = true;
            placed++;
        }
    }
    msMinesPlaced = true;
    msCalcNeighbors();
    msStartTimer();
}

function msCalcNeighbors() {
    const { rows, cols } = msCurrentConfig;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (msBoard[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && msBoard[nr][nc].isMine) count++;
                }
            }
            msBoard[r][c].neighborMines = count;
        }
    }
}

function msLeftClick(r, c) {
    if (msGameOver) return;

    // 开启「标雷模式」后，单击格子即插旗 / 取消插旗
    if (msFlagMode) {
        msRightClick(r, c);
        return;
    }

    const cell = msBoard[r][c];
    
    if (cell.isRevealed && cell.neighborMines > 0) {
        msChordReveal(r, c);
        return;
    }

    if (cell.isFlagged || cell.isRevealed) return;
    if (!msMinesPlaced) msPlaceMines(r, c);

    if (cell.isMine) {
        msGameOver = true;
        msGameResult = 'lost';
        clearInterval(msTimerInterval);
        msFaceBtn.textContent = '😵';
        msRevealAllMines();
        msUpdateCellEl(r, c, '💣', 'ms-mine');
        return;
    }

    msRevealCell(r, c);
    msCheckWin();
}

function msChordReveal(r, c) {
    const { rows, cols } = msCurrentConfig;
    const cell = msBoard[r][c];
    let flagsAround = 0;
    const neighbors = [];
    const hiddenNeighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const nCell = msBoard[nr][nc];
                if (nCell.isFlagged) flagsAround++;
                if (!nCell.isRevealed) {
                    hiddenNeighbors.push({ r: nr, c: nc, flagged: nCell.isFlagged });
                    if (!nCell.isFlagged) neighbors.push({ r: nr, c: nc });
                }
            }
        }
    }

    // 3×3 内的雷还没标完：不挖开，改为闪动未打开的格子提醒玩家
    if (flagsAround !== cell.neighborMines) {
        msHintHiddenCells(hiddenNeighbors);
        return;
    }

    for (const n of neighbors) {
        const nCell = msBoard[n.r][n.c];
        if (nCell.isMine) {
            msGameOver = true;
            msGameResult = 'lost';
            clearInterval(msTimerInterval);
            msFaceBtn.textContent = '😵';
            msRevealAllMines();
            msUpdateCellEl(n.r, n.c, '💣', 'ms-mine');
            return;
        }
        msRevealCell(n.r, n.c);
    }
    msCheckWin();
}

function msHintHiddenCells(cells) {
    if (!cells.length) return;

    cells.forEach(({ r, c }) => {
        const el = msGetCellEl(r, c);
        if (!el) return;

        el.classList.remove('ms-chord-hint');
        // 强制重排，让连续点击时动画可以重新播放
        void el.offsetWidth;
        el.classList.add('ms-chord-hint');

        clearTimeout(el._msChordHintTimer);
        el._msChordHintTimer = setTimeout(() => {
            el.classList.remove('ms-chord-hint');
            el._msChordHintTimer = null;
        }, 760);
    });

    if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (_) {}
    }
}

function msRightClick(r, c) {
    if (msGameOver || msBoard[r][c].isRevealed) return;
    const cell = msBoard[r][c];
    const el = msGetCellEl(r, c);

    if (!cell.isFlagged) {
        if (msFlagsPlaced < msCurrentConfig.mines) {
            cell.isFlagged = true;
            el.classList.add('ms-flagged');
            el.textContent = '🚩';
            msFlagsPlaced++;
            msUpdateMineCounter(msCurrentConfig.mines);
        }
    } else {
        cell.isFlagged = false;
        el.classList.remove('ms-flagged');
        el.textContent = '';
        msFlagsPlaced--;
        msUpdateMineCounter(msCurrentConfig.mines);
    }
    if (msAutoFlagEnabled) msAutoFlagLogic();
}

function msAutoFlagLogic() {
    const { rows, cols } = msCurrentConfig;
    let changed = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = msBoard[r][c];
            if (cell.isRevealed && cell.neighborMines > 0) {
                let flags = 0;
                let hidden = [];

                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            if (msBoard[nr][nc].isFlagged) flags++;
                            else if (!msBoard[nr][nc].isRevealed) hidden.push({ r: nr, c: nc });
                        }
                    }
                }

                if (hidden.length > 0 && hidden.length === (cell.neighborMines - flags)) {
                    for (const h of hidden) {
                        const hCell = msBoard[h.r][h.c];
                        if (!hCell.isFlagged) {
                            hCell.isFlagged = true;
                            msFlagsPlaced++;
                            const el = msGetCellEl(h.r, h.c);
                            el.classList.add('ms-flagged');
                            el.textContent = '🚩';
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    if (changed) {
        msUpdateMineCounter(msCurrentConfig.mines);
        msCheckWin();
    }
}

function msRevealCell(r, c) {
    const { rows, cols } = msCurrentConfig;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = msBoard[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    msCellsRevealed++;
    const el = msGetCellEl(r, c);

    // 如果这个格子正处于提示动画中，挖开时立即停止提示
    el.classList.remove('ms-chord-hint');
    clearTimeout(el._msChordHintTimer);
    el._msChordHintTimer = null;

    el.classList.add('ms-revealed');

    if (cell.neighborMines > 0) {
        el.textContent = cell.neighborMines;
        el.dataset.count = cell.neighborMines;
    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                msRevealCell(r + dr, c + dc);
            }
        }
    }
}

function msCheckWin() {
    if (msGameOver) return;

    const totalSafe = msCurrentConfig.rows * msCurrentConfig.cols - msCurrentConfig.mines;
    if (msCellsRevealed !== totalSafe) return;

    msGameOver = true;
    msGameResult = 'won';
    clearInterval(msTimerInterval);
    msFaceBtn.textContent = '😎';
    msAutoFlagRemaining();

    // 记录本次成绩，稍等棋盘渲染完再询问是否上榜
    msPendingScore = {
        time: msTimeElapsed,
        difficulty: msLevel,
        rows: msCurrentConfig.rows,
        cols: msCurrentConfig.cols,
        mines: msCurrentConfig.mines
    };

    if (msScorePromptTimer) clearTimeout(msScorePromptTimer);
    msScorePromptTimer = setTimeout(msOpenScorePrompt, 350);
}

function msRevealAllMines() {
    const { rows, cols } = msCurrentConfig;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (msBoard[r][c].isMine && !msBoard[r][c].isFlagged) {
                msBoard[r][c].isRevealed = true;
                const el = msGetCellEl(r, c);
                el.classList.add('ms-revealed', 'ms-mine');
                el.textContent = '💣';
            }
        }
    }
}

function msAutoFlagRemaining() {
    const { rows, cols, mines } = msCurrentConfig;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (msBoard[r][c].isMine && !msBoard[r][c].isFlagged) {
                msBoard[r][c].isFlagged = true;
                msFlagsPlaced++;
                const el = msGetCellEl(r, c);
                el.textContent = '🚩';
                el.classList.add('ms-flagged');
            }
        }
    }
    msUpdateMineCounter(mines);
}

function msGetCellEl(r, c) {
    return msBoardEl.querySelector(`.ms-cell[data-r="${r}"][data-c="${c}"]`);
}

function msUpdateCellEl(r, c, text, extraClass) {
    const el = msGetCellEl(r, c);
    el.textContent = text;
    el.classList.add('ms-revealed', extraClass);
}

function msStartTimer() {
    clearInterval(msTimerInterval);
    msTimeElapsed = 0;
    msTimerEl.textContent = '000';
    msTimerInterval = setInterval(() => {
        msTimeElapsed++;
        if (msTimeElapsed > 999) msTimeElapsed = 999;
        msTimerEl.textContent = String(msTimeElapsed).padStart(3, '0');
    }, 1000);
}

// ==========================================
//  导出当前棋盘
// ==========================================
function msBuildExportSnapshot() {
    const { rows, cols, mines } = msCurrentConfig;
    const board = [];
    const visibleGrid = [];
    const solutionGrid = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        const visibleRow = [];
        const solutionRow = [];

        for (let c = 0; c < cols; c++) {
            const cell = msBoard[r][c];
            row.push({
                mine: cell.isMine,
                revealed: cell.isRevealed,
                flagged: cell.isFlagged,
                near: cell.neighborMines
            });

            if (cell.isFlagged) visibleRow.push('F');
            else if (cell.isRevealed) visibleRow.push(cell.isMine ? 'X' : String(cell.neighborMines));
            else visibleRow.push('#');

            solutionRow.push(cell.isMine ? '*' : '.');
        }

        board.push(row);
        visibleGrid.push(visibleRow.join(''));
        solutionGrid.push(solutionRow.join(''));
    }

    const totalSafe = rows * cols - mines;

    return {
        game: 'minesweeper',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        status: msGameResult || 'playing',
        level: msLevel,
        levelLabel: msGetLevelLabel(msLevel),
        config: { rows, cols, mines },
        progress: {
            timeSeconds: msTimeElapsed,
            flagsPlaced: msFlagsPlaced,
            cellsRevealed: msCellsRevealed,
            safeCellsTotal: totalSafe,
            remainingSafeCells: Math.max(0, totalSafe - msCellsRevealed),
            minesPlaced: msMinesPlaced
        },
        visibleGrid,
        solutionGrid,
        board,
        note: msMinesPlaced
            ? 'solutionGrid 与 board.mine 包含真实雷位，仅用于复盘和可解性分析。'
            : '当前棋盘尚未落雷（minesPlaced=false），导出的雷位为空。'
    };
}

function msExportBoard() {
    if (!msCurrentConfig || !msCurrentConfig.rows) {
        showToast('扫雷尚未初始化');
        return;
    }

    try {
        const snapshot = msBuildExportSnapshot();
        const stamp = msFormatDateStamp(new Date());
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `minesweeper-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(msMinesPlaced ? '棋盘已导出，可用于复盘分析' : '尚未落雷，已导出初始棋盘');
    } catch (_) {
        showToast('导出失败，请重试');
    }
}

// ==========================================
//  成绩弹窗与本地排行榜
// ==========================================
function msBindModalEvents() {
    if (!msModalEl) return;

    const closeBtn = document.getElementById('ms-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', msCloseModal);

    const skipBtn = document.getElementById('ms-score-skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            msPendingScore = null;
            msCloseModal();
        });
    }

    const saveBtn = document.getElementById('ms-score-save');
    if (saveBtn) saveBtn.addEventListener('click', msSaveScore);

    const lbCloseBtn = document.getElementById('ms-lb-close');
    if (lbCloseBtn) lbCloseBtn.addEventListener('click', msCloseModal);

    const backdrop = msModalEl.querySelector('.ms-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', msCloseModal);

    if (msScoreNameEl) {
        msScoreNameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                msSaveScore();
            }
        });
    }

    if (msLbFiltersEl) {
        msLbFiltersEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-ms-filter]');
            if (!btn) return;
            msLeaderboardFilter = btn.getAttribute('data-ms-filter');
            msRenderLeaderboard();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && msModalEl.classList.contains('show')) {
            msCloseModal();
        }
    });
}

function msCloseModal() {
    if (!msModalEl) return;

    msModalEl.classList.remove('show');
    msModalEl.setAttribute('aria-hidden', 'true');

    // 关闭成绩询问视为放弃本次记录
    if (msScorePanelEl && !msScorePanelEl.hidden) {
        msPendingScore = null;
    }
}

function msOpenScorePrompt() {
    if (!msPendingScore || !msModalEl || !msScorePanelEl) return;

    // 已经切到其它页面 / 其它游戏时不再弹出
    const page = document.getElementById('page-game');
    if (page && !page.classList.contains('active')) return;
    const mineContainer = document.getElementById('minesweeper-container');
    if (mineContainer && !mineContainer.classList.contains('active')) return;

    msModalTitleEl.textContent = '🎉 恭喜通关';
    msScoreTimeEl.textContent = msPendingScore.time;
    msScoreConfigEl.textContent = msGetScoreConfigLabel(msPendingScore);
    msScoreNameEl.value = '';

    try {
        msScoreNameEl.value = localStorage.getItem(MS_PLAYER_NAME_KEY) || '';
    } catch (_) {
        msScoreNameEl.value = '';
    }

    msScorePanelEl.hidden = false;
    msLeaderboardPanelEl.hidden = true;
    msModalEl.classList.add('show');
    msModalEl.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
        try {
            msScoreNameEl.focus();
            msScoreNameEl.select();
        } catch (_) {}
    }, 60);
}

function msSaveScore() {
    if (!msPendingScore || !msScoreNameEl) {
        msCloseModal();
        return;
    }

    const score = msPendingScore;
    let name = (msScoreNameEl.value || '').trim().slice(0, 16);
    if (!name) name = '匿名玩家';

    const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name,
        time: score.time,
        difficulty: score.difficulty,
        rows: score.rows,
        cols: score.cols,
        mines: score.mines,
        date: new Date().toISOString()
    };

    try {
        const list = msLoadLeaderboard();
        list.push(record);

        if (list.length > MS_LEADERBOARD_MAX) {
            list.splice(0, list.length - MS_LEADERBOARD_MAX);
        }

        localStorage.setItem(MS_LEADERBOARD_KEY, JSON.stringify(list));
        localStorage.setItem(MS_PLAYER_NAME_KEY, name);
    } catch (_) {
        showToast('无法保存成绩：浏览器未允许本地存储');
        return;
    }

    const rank = msGetRecordRank(record);
    msPendingScore = null;
    msCloseModal();

    showToast(rank > 0
        ? `成绩已记录！${msGetLevelLabel(record.difficulty)}第 ${rank} 名`
        : '成绩已记录');
}

function msOpenLeaderboard(filter) {
    if (!msModalEl) return;

    if (filter) msLeaderboardFilter = filter;
    if (!MS_LB_FILTERS.some(f => f.key === msLeaderboardFilter)) {
        msLeaderboardFilter = 'all';
    }

    msModalTitleEl.textContent = '🏆 扫雷排行榜';
    msScorePanelEl.hidden = true;
    msLeaderboardPanelEl.hidden = false;

    msRenderLeaderboard();

    msModalEl.classList.add('show');
    msModalEl.setAttribute('aria-hidden', 'false');
}

function msRenderLeaderboard() {
    if (!msLbFiltersEl || !msLbListEl) return;

    const all = msLoadLeaderboard();

    msLbFiltersEl.innerHTML = MS_LB_FILTERS.map(f => {
        const count = f.key === 'all'
            ? all.length
            : all.filter(r => r.difficulty === f.key).length;
        const active = f.key === msLeaderboardFilter ? ' active' : '';

        return `<button type="button" class="ms-lb-filter${active}" data-ms-filter="${f.key}">${f.label}<span class="ms-lb-count">${count}</span></button>`;
    }).join('');

    const records = msLeaderboardFilter === 'all'
        ? all.slice()
        : all.filter(r => r.difficulty === msLeaderboardFilter);

    records.sort(msCompareRecords);

    if (!records.length) {
        msLbListEl.innerHTML = '<div class="ms-lb-empty">还没有成绩记录，通关后就能上榜了。</div>';
        return;
    }

    const top = records.slice(0, MS_LEADERBOARD_SHOW);
    const rowsHtml = top.map((rec, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
        const rows = Number.isFinite(rec.rows) ? rec.rows : '?';
        const cols = Number.isFinite(rec.cols) ? rec.cols : '?';
        const mines = Number.isFinite(rec.mines) ? rec.mines : '?';
        const meta = `${msGetLevelLabel(rec.difficulty)} · ${rows}×${cols} · ${mines}雷 · ${msFormatDate(rec.date)}`;

        return `<div class="ms-lb-row">
            <span class="ms-lb-rank rank-${index + 1}">${medal}</span>
            <span class="ms-lb-name">${msEscapeHtml(rec.name)}</span>
            <span class="ms-lb-time">${msFormatTime(rec.time)}</span>
            <span class="ms-lb-meta">${msEscapeHtml(meta)}</span>
        </div>`;
    }).join('');

    const moreHtml = records.length > top.length
        ? `<div class="ms-lb-more">仅显示前 ${top.length} 条，共 ${records.length} 条</div>`
        : '';

    msLbListEl.innerHTML = rowsHtml + moreHtml;
}

function msLoadLeaderboard() {
    try {
        const raw = localStorage.getItem(MS_LEADERBOARD_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(r =>
            r && typeof r === 'object' &&
            typeof r.name === 'string' &&
            Number.isFinite(r.time) &&
            typeof r.difficulty === 'string'
        );
    } catch (_) {
        return [];
    }
}

function msGetRecordRank(record) {
    const same = msLoadLeaderboard()
        .filter(r => r.difficulty === record.difficulty)
        .sort(msCompareRecords);

    const index = same.findIndex(r => r.id === record.id);
    return index === -1 ? 0 : index + 1;
}

function msCompareRecords(a, b) {
    const byTime = (a.time || 0) - (b.time || 0);
    if (byTime !== 0) return byTime;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function msGetLevelLabel(level) {
    const labels = {
        easy: '初级',
        medium: '中级',
        hard: '高级',
        fullscreen: '满屏',
        custom: '自定义'
    };
    return labels[level] || '自定义';
}

function msGetScoreConfigLabel(score) {
    return `${msGetLevelLabel(score.difficulty)} ${score.rows}×${score.cols} / ${score.mines} 雷`;
}

function msFormatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    if (total < 60) return `${total}s`;
    return `${Math.floor(total / 60)}:${msPad2(total % 60)}`;
}

function msFormatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${msPad2(date.getMonth() + 1)}-${msPad2(date.getDate())}`;
}

function msFormatDateStamp(date) {
    return `${date.getFullYear()}${msPad2(date.getMonth() + 1)}${msPad2(date.getDate())}-` +
        `${msPad2(date.getHours())}${msPad2(date.getMinutes())}${msPad2(date.getSeconds())}`;
}

function msPad2(value) {
    return String(value).padStart(2, '0');
}

function msEscapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}
