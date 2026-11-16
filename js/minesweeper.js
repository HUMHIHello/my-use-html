// ==========================================
//  扫雷游戏逻辑
// ==========================================

const MS_LEVELS = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
};

let msLevel = 'easy';
let msCurrentConfig = {};
let msBoard = [];
let msMinesPlaced = false;
let msGameOver = false;
let msCellsRevealed = 0;
let msFlagsPlaced = 0;
let msTimerInterval = null;
let msTimeElapsed = 0;
let msAutoFlagEnabled = false;

// DOM 节点引用（在 initMinesweeper 中赋值）
let msBoardEl, msFaceBtn, msMineCounterEl, msTimerEl;

// 初始化控制函数
function initMinesweeper() {
    // 获取 DOM
    msBoardEl = document.getElementById('minesweeper-board');
    msFaceBtn = document.getElementById('ms-face-btn');
    msMineCounterEl = document.getElementById('ms-mine-counter');
    msTimerEl = document.getElementById('ms-timer');

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
    msBoardEl.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
    
    if (cols > 20) msBoardEl.style.overflowX = 'auto';
    else msBoardEl.style.overflowX = 'hidden';

    msBoard = [];
    msMinesPlaced = false;
    msGameOver = false;
    msCellsRevealed = 0;
    msFlagsPlaced = 0;
    msTimeElapsed = 0;
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
            
            el.addEventListener('click', () => msLeftClick(r, c));
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                msRightClick(r, c);
            });

            let touchTimer;
            el.addEventListener('touchstart', () => {
                touchTimer = setTimeout(() => {
                    msRightClick(r, c);
                    el.addEventListener('touchend', (ev) => ev.preventDefault(), { once: true });
                }, 500);
            });
            el.addEventListener('touchend', () => clearTimeout(touchTimer));
            el.addEventListener('touchmove', () => clearTimeout(touchTimer));

            msBoardEl.appendChild(el);
        }
        msBoard.push(row);
    }
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
    const cell = msBoard[r][c];
    
    if (cell.isRevealed && cell.neighborMines > 0) {
        msChordReveal(r, c);
        return;
    }

    if (cell.isFlagged || cell.isRevealed) return;
    if (!msMinesPlaced) msPlaceMines(r, c);

    if (cell.isMine) {
        msGameOver = true;
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

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (msBoard[nr][nc].isFlagged) flagsAround++;
                else if (!msBoard[nr][nc].isRevealed) neighbors.push({ r: nr, c: nc });
            }
        }
    }

    if (flagsAround === cell.neighborMines) {
        for (const n of neighbors) {
            const nCell = msBoard[n.r][n.c];
            if (nCell.isMine) {
                msGameOver = true;
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
    const totalSafe = msCurrentConfig.rows * msCurrentConfig.cols - msCurrentConfig.mines;
    if (msCellsRevealed === totalSafe) {
        msGameOver = true;
        clearInterval(msTimerInterval);
        msFaceBtn.textContent = '😎';
        msAutoFlagRemaining();
    }
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