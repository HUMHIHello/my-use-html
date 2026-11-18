// ==========================================
//  俄罗斯方块（电竞标准版：7-bag随机 + 完整踢墙 + WASD）
// ==========================================

let tCanvas, tCtx, nextCanvas, nextCtx;
let tScoreEl, tLinesEl, tLevelEl;

const T_COLS = 10;
const T_ROWS = 20;
const BLOCK_SIZE = 30;

let board = [];
let currentPiece = null;
let nextPiece = null;

let tScore = 0;
let tLines = 0;
let tLevel = 1;
let tDropInterval = 800; 
let tDropCounter = 0;
let tLastTime = 0;
let tGameLoopId = null;

let tRunning = false;
let tPaused = false;
let tGameOver = false;

// ⭐ 7-bag 随机算法（防止连续出同一种方块）
let pieceBag = [];
function getNextPieceType() {
    if (pieceBag.length === 0) {
        // 把 1~7 放进去，然后打乱
        pieceBag = [1, 2, 3, 4, 5, 6, 7];
        for (let i = pieceBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
        }
    }
    return pieceBag.pop();
}

const COLORS = [
    null,
    '#00F0F0', // I - 青色
    '#0000F0', // J - 深蓝
    '#F0A000', // L - 橙色
    '#F0F000', // O - 黄色
    '#00F000', // S - 绿色
    '#A000F0', // T - 紫色
    '#F00000'  // Z - 红色
];

const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

function initTetris() {
    tCanvas = document.getElementById('tetris-canvas');
    if (!tCanvas) return;
    tCtx = tCanvas.getContext('2d');
    nextCanvas = document.getElementById('tetris-next-canvas');
    nextCtx = nextCanvas.getContext('2d');
    
    tScoreEl = document.getElementById('tetris-score');
    tLinesEl = document.getElementById('tetris-lines');
    tLevelEl = document.getElementById('tetris-level');

    document.getElementById('tetris-restart-btn').addEventListener('click', tetrisStart);

    document.addEventListener('keydown', (e) => {
        const page = document.getElementById('page-game');
        const container = document.getElementById('tetris-container');
        if (!page || !page.classList.contains('active')) return;
        if (!container || !container.classList.contains('active')) return;

        if (!tRunning || tPaused || tGameOver) {
            if (e.key === ' ') {
                tetrisStart();
                e.preventDefault();
            }
            if (e.key.toLowerCase() === 'p' && tRunning && !tGameOver) {
                tPaused = !tPaused;
                if (!tPaused) {
                    tLastTime = performance.now();
                    tGameLoopId = requestAnimationFrame(tetrisUpdate);
                } else {
                    cancelAnimationFrame(tGameLoopId);
                    drawPauseOverlay('游戏暂停', '按 P 继续');
                }
            }
            return;
        }

        const key = e.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') { movePiece(-1); e.preventDefault(); }
        else if (key === 'arrowright' || key === 'd') { movePiece(1); e.preventDefault(); }
        else if (key === 'arrowdown' || key === 's') { dropPiece(); e.preventDefault(); }
        else if (key === 'arrowup' || key === 'w') { rotatePiece(); e.preventDefault(); }
        else if (key === ' ') { hardDrop(); e.preventDefault(); }
        else if (key === 'p') {
            tPaused = true;
            cancelAnimationFrame(tGameLoopId);
            drawPauseOverlay('游戏暂停', '按 P 继续');
            e.preventDefault();
        }
    });

    resetTetrisBoard();
}

function resetTetrisBoard() {
    tRunning = false;
    tPaused = false;
    tGameOver = false;
    if (tGameLoopId) cancelAnimationFrame(tGameLoopId);
    
    tScore = 0;
    tLines = 0;
    tLevel = 1;
    tDropInterval = 800;
    if(tScoreEl) tScoreEl.textContent = '0';
    if(tLinesEl) tLinesEl.textContent = '0';
    if(tLevelEl) tLevelEl.textContent = '1';

    board = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0));
    currentPiece = null;
    nextPiece = null;
    pieceBag = []; // 重置随机池
    drawNextPiece();

    drawTetrisBackground();
    drawPauseOverlay('准备就绪', '按 [空格键] 开始');
}

function tetrisStart() {
    resetTetrisBoard();
    tRunning = true;
    tGameOver = false;
    tPaused = false;
    
    spawnNewPiece();
    tLastTime = performance.now();
    tGameLoopId = requestAnimationFrame(tetrisUpdate);
}

// ==========================================
//  核心逻辑
// ==========================================

function createPiece(matrixId) {
    const matrix = SHAPES[matrixId];
    return {
        matrix: matrix,
        x: Math.floor((T_COLS - matrix[0].length) / 2),
        y: 0,
        color: COLORS[matrixId]
    };
}

function spawnNewPiece() {
    if (!nextPiece) {
        nextPiece = createPiece(getNextPieceType());
    }
    currentPiece = nextPiece;
    nextPiece = createPiece(getNextPieceType());
    drawNextPiece();

    if (collide(board, currentPiece)) {
        tGameOver = true;
        tRunning = false;
        cancelAnimationFrame(tGameLoopId);
        drawPauseOverlay('游戏结束', '按 [空格键] 重开', '#EF4444');
    }
}

function collide(board, piece) {
    const m = piece.matrix;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                let boardX = piece.x + x;
                let boardY = piece.y + y;
                if (boardX < 0 || boardX >= T_COLS || boardY >= T_ROWS || (boardY >= 0 && board[boardY][boardX] !== 0)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function movePiece(dir) {
    currentPiece.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.x -= dir;
    } else {
        drawTetrisBoard();
    }
}

// ⭐ 升级版：带完整踢墙检测的旋转
function rotatePiece() {
    const matrix = currentPiece.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;
    const newMatrix = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            newMatrix[x][rows - 1 - y] = matrix[y][x];
        }
    }
    
    const oldMatrix = currentPiece.matrix;
    currentPiece.matrix = newMatrix;
    
    // ⭐ 尝试踢墙的偏移量（依次尝试向右1格、向左1格、向右2格、向左2格、向上1格）
    const kicks = [0, 1, -1, 2, -2, { x: 0, y: -1 }];
    let success = false;
    const oldX = currentPiece.x;
    const oldY = currentPiece.y;

    for (let kick of kicks) {
        const offsetX = typeof kick === 'object' ? kick.x : kick;
        const offsetY = typeof kick === 'object' ? kick.y : 0;

        currentPiece.x = oldX + offsetX;
        currentPiece.y = oldY + offsetY;

        if (!collide(board, currentPiece)) {
            success = true;
            break;
        }
    }

    if (!success) {
        // 所有位置都卡住了，撤销旋转
        currentPiece.matrix = oldMatrix;
        currentPiece.x = oldX;
        currentPiece.y = oldY;
    } else {
        drawTetrisBoard();
    }
}

function dropPiece() {
    currentPiece.y++;
    if (collide(board, currentPiece)) {
        currentPiece.y--;
        lockPiece();
    } else {
        tDropCounter = 0;
        drawTetrisBoard();
    }
}

function hardDrop() {
    while (!collide(board, currentPiece)) {
        currentPiece.y++;
    }
    currentPiece.y--;
    lockPiece();
}

function lockPiece() {
    const m = currentPiece.matrix;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                let boardY = currentPiece.y + y;
                if (boardY < 0) continue; 
                board[boardY][currentPiece.x + x] = m[y][x];
            }
        }
    }
    clearLines();
    spawnNewPiece();
    drawTetrisBoard();
}

function clearLines() {
    let linesCleared = 0;
    for (let y = T_ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(T_COLS).fill(0));
            linesCleared++;
            y++; 
        }
    }

    if (linesCleared > 0) {
        tLines += linesCleared;
        const scores = { 1: 100, 2: 300, 3: 500, 4: 800 };
        tScore += (scores[linesCleared] || 0) * tLevel;
        
        tLevel = Math.floor(tLines / 10) + 1;
        if (tLevel > 10) tLevel = 10;
        
        tDropInterval = Math.max(100, 800 - (tLevel - 1) * 70);

        if(tScoreEl) tScoreEl.textContent = tScore;
        if(tLinesEl) tLinesEl.textContent = tLines;
        if(tLevelEl) tLevelEl.textContent = tLevel;
    }
}

// ==========================================
//  渲染逻辑
// ==========================================

function tetrisUpdate(time = 0) {
    if (!tRunning || tPaused || tGameOver) return;
    
    const deltaTime = time - tLastTime;
    tLastTime = time;

    if (tDropCounter > tDropInterval) {
        dropPiece();
        tDropCounter = 0;
    } else {
        tDropCounter += deltaTime;
    }

    drawTetrisBoard();
    tGameLoopId = requestAnimationFrame(tetrisUpdate);
}

function drawTetrisBackground() {
    if (!tCtx) return;
    const computedStyle = getComputedStyle(document.body);
    const bgColor = computedStyle.getPropertyValue('--bg-color').trim() || '#0B0E14';
    const isLight = document.body.classList.contains('light-theme');
    
    tCtx.fillStyle = bgColor;
    tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
    
    tCtx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    tCtx.lineWidth = 1;
    
    for (let x = 0; x <= T_COLS; x++) {
        tCtx.beginPath();
        tCtx.moveTo(x * BLOCK_SIZE, 0);
        tCtx.lineTo(x * BLOCK_SIZE, tCanvas.height);
        tCtx.stroke();
    }
    for (let y = 0; y <= T_ROWS; y++) {
        tCtx.beginPath();
        tCtx.moveTo(0, y * BLOCK_SIZE);
        tCtx.lineTo(tCanvas.width, y * BLOCK_SIZE);
        tCtx.stroke();
    }
}

function drawBlock(ctx, x, y, color, size, isGhost = false) {
    if (isGhost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
        ctx.fillStyle = color + '22'; 
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    } else {
        ctx.fillStyle = color;
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        ctx.fillRect(x * size + 1, y * size + 1, 4, size - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
        ctx.fillRect(x * size + size - 5, y * size + 1, 4, size - 2);
    }
}

function drawTetrisBoard() {
    if (!tCtx) return;
    
    drawTetrisBackground();

    for (let y = 0; y < T_ROWS; y++) {
        for (let x = 0; x < T_COLS; x++) {
            if (board[y][x] !== 0) {
                drawBlock(tCtx, x, y, COLORS[board[y][x]], BLOCK_SIZE);
            }
        }
    }

    if (tGameOver || !currentPiece) return;

    const ghostPiece = { x: currentPiece.x, y: currentPiece.y, matrix: currentPiece.matrix, color: currentPiece.color };
    while (!collide(board, ghostPiece)) {
        ghostPiece.y++;
    }
    ghostPiece.y--;
    
    if (ghostPiece.y !== currentPiece.y) {
        const m = ghostPiece.matrix;
        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (m[y][x] !== 0) {
                    drawBlock(tCtx, ghostPiece.x + x, ghostPiece.y + y, currentPiece.color, BLOCK_SIZE, true);
                }
            }
        }
    }

    const m = currentPiece.matrix;
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 && currentPiece.y + y >= 0) {
                drawBlock(tCtx, currentPiece.x + x, currentPiece.y + y, currentPiece.color, BLOCK_SIZE);
            }
        }
    }
}

function drawNextPiece() {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    const m = nextPiece.matrix;
    const size = 25; 
    const offsetX = (nextCanvas.width - m[0].length * size) / 2;
    const offsetY = (nextCanvas.height - m.length * size) / 2;

    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, size - 2);
                nextCtx.fillStyle = 'rgba(255,255,255,0.3)';
                nextCtx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 2, 3);
            }
        }
    }
}

function drawPauseOverlay(title, subtitle, color = '#4B9EFF') {
    tCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
    
    tCtx.fillStyle = color;
    tCtx.font = 'bold 28px sans-serif';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText(title, tCanvas.width / 2, tCanvas.height / 2 - 20);
    
    tCtx.fillStyle = '#fff';
    tCtx.font = '16px sans-serif';
    tCtx.fillText(subtitle, tCanvas.width / 2, tCanvas.height / 2 + 20);
}