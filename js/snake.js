// ==========================================
//  贪吃蛇（终极版：随机掉落 + 独立倒计时 + 完美弹窗时序 + 完美操作）
// ==========================================

let canvas, ctx, scoreEl, livesEl, sizeSelect, buffEl, specialTimerEl;

const GRID = 20; 
let COLS, ROWS;  

let snake = [];
let foods = [];  
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let snakeTimer = null;
let currentSpeed = 150; 
let isSpeeding = false; 
let directionQueue = []; // 按键方向缓冲队列

// 状态 buff 与 倒计时
let isSlowed = false; 
let slowEndTime = 0; 
let isInvincible = false; 
let invincibleEndTime = 0;

// 全局 UI 刷新定时器
let uiTickTimer = null; 
// 特殊道具生成计时
let nextSpecialSpawnTime = 0;

let snakeScore = 0;
let snakeLives = 3;
let snakeRunning = false;
let isWaitingRevive = false; 
let reviveAnimationTimer = null; 
let startAnimationTimer = null; 

// 普通食物配置
const NORMAL_FOODS = [
    { type: 'apple',   emoji: '🍎', score: 10,  grow: 1, color: '#EF4444', weight: 60 },
    { type: 'grape',   emoji: '🍇', score: 20,  grow: 2, color: '#A78BFA', weight: 20 },
    { type: 'potion',  emoji: '🧪', score: 5,   grow: 1, color: '#10B981', weight: 15 },
    { type: 'gold',    emoji: '🍏', score: 20,  grow: 1, color: '#FBBF24', weight: 5 }
];

// 特殊道具配置
const SPECIAL_FOODS = [
    { type: 'bomb',      emoji: '💣', score: -30, grow: -3, color: '#4B5563', weight: 40, duration: 5000 },
    { type: 'lightning', emoji: '⚡', score: 10,  grow: 1,  color: '#22D3EE', weight: 30, duration: 5000 },
    { type: 'ice',       emoji: '❄️', score: 10,  grow: 1,  color: '#60A5FA', weight: 30, duration: 5000 }
];

function initSnake() {
    canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    scoreEl = document.getElementById('snake-score');
    livesEl = document.getElementById('snake-lives');
    buffEl = document.getElementById('snake-buffs');
    specialTimerEl = document.getElementById('snake-special-timer');
    sizeSelect = document.getElementById('snake-map-size');

    sizeSelect.addEventListener('change', () => {
        if (snakeRunning || isWaitingRevive) {
            if(!confirm('游戏正在进行中，切换地图会重新开始。确定吗？')) {
                sizeSelect.value = sizeSelect.dataset.current; 
                return;
            }
        }
        snakeReset();
    });

    // 点击新游戏，只重置和显示弹窗，不启动计时器
    document.getElementById('snake-start-btn').addEventListener('click', snakeReset);

    document.addEventListener('keydown', (e) => {
        // 只响应游戏页 + 贪吃蛇面板处于激活状态时的按键，避免虚拟按键 / 键盘误操作其他游戏
        const page = document.getElementById('page-game');
        const container = document.getElementById('snake-container');
        if (!page || !page.classList.contains('active')) return;
        if (!container || !container.classList.contains('active')) return;

        if (e.code === 'Space') {
            e.preventDefault(); 
            
            if (snakeLives <= 0) {
                snakeReset();
                return;
            }
            if (isWaitingRevive) {
                reviveSnake();
                return;
            }
            if (!snakeRunning) {
                startGame(); 
                return;
            }
            if (snakeRunning && !isSpeeding && !isSlowed) {
                isSpeeding = true;
                clearInterval(snakeTimer);
                snakeTimer = setInterval(snakeStep, 60); 
            }
            return;
        }

        if (!snakeRunning || isWaitingRevive) return;
        
        const key = e.key.toLowerCase();
        
        let targetDir = null;
        if (key === 'arrowup' || key === 'w') targetDir = { x: 0, y: -1 };
        else if (key === 'arrowdown' || key === 's') targetDir = { x: 0, y: 1 };
        else if (key === 'arrowleft' || key === 'a') targetDir = { x: -1, y: 0 };
        else if (key === 'arrowright' || key === 'd') targetDir = { x: 1, y: 0 };

        if (targetDir) {
            // ⭐ 限制缓存队列最大长度为 2，解决狂按延迟问题
            if (directionQueue.length >= 2) {
                directionQueue = []; 
            }
            
            let lastDir = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : direction;
            
            // 新方向不能与上一个方向相反（防180度掉头）
            if (targetDir.x !== -lastDir.x || targetDir.y !== -lastDir.y) {
                // 新方向也不能和上一个方向相同（过滤无效按键）
                if (targetDir.x !== lastDir.x || targetDir.y !== lastDir.y) {
                    directionQueue.push(targetDir);
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && snakeRunning && !isWaitingRevive && !isSlowed) {
            isSpeeding = false;
            clearInterval(snakeTimer);
            snakeTimer = setInterval(snakeStep, currentSpeed); 
        }
    });

    snakeReset();
}

// 真正启动游戏
function startGame() {
    if (startAnimationTimer) clearTimeout(startAnimationTimer);
    
    snakeRunning = true;
    nextSpecialSpawnTime = Date.now() + (Math.random() * 6000 + 6000); 
    
    startUITick();
    snakeDraw();
    clearInterval(snakeTimer);
    snakeTimer = setInterval(snakeStep, currentSpeed);
}

function snakeReset() {
    const size = sizeSelect.value;
    if (size === 'small') { canvas.width = 300; canvas.height = 300; }
    if (size === 'medium') { canvas.width = 400; canvas.height = 400; }
    if (size === 'large') { canvas.width = 500; canvas.height = 500; }

    COLS = canvas.width / GRID;
    ROWS = canvas.height / GRID;
    sizeSelect.dataset.current = size; 

    snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }, 
             { x: Math.floor(COLS/2)-1, y: Math.floor(ROWS/2) }, 
             { x: Math.floor(COLS/2)-2, y: Math.floor(ROWS/2) }];
    
    direction = { x: 1, y: 0 };
    directionQueue = []; // 重置队列
    nextDirection = { x: 1, y: 0 };
    snakeScore = 0;
    snakeLives = 3;
    currentSpeed = 150;
    
    isSpeeding = false;
    clearBuffs(); 
    
    snakeRunning = false;
    isWaitingRevive = false; 

    if (scoreEl) scoreEl.textContent = '0';
    updateLivesUI();
    
    clearInterval(snakeTimer);
    if (startAnimationTimer) clearTimeout(startAnimationTimer);
    
    foods = [];
    
    let count = 0;
    while(count < 3) {
        spawnFood('normal');
        count = foods.filter(f => f.category === 'normal').length;
    }
    
    snakeDraw();
    showStartScreen();
}

function showStartScreen() {
    if (!ctx || snakeRunning || isWaitingRevive || snakeLives <= 0) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxW = 260;
    const boxH = 110;
    const boxX = (canvas.width - boxW) / 2;
    const boxY = (canvas.height - boxH) / 2;
    
    ctx.fillStyle = '#1F2937'; 
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    else ctx.rect(boxX, boxY, boxW, boxH); 
    ctx.fill();
    
    ctx.strokeStyle = '#4B9EFF'; 
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#4B9EFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('准备就绪', canvas.width / 2, boxY + 35);

    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillText('按 [空格键] 开始游戏', canvas.width / 2, boxY + 75);
    }

    if (!snakeRunning && !isWaitingRevive && snakeLives > 0) {
        startAnimationTimer = setTimeout(showStartScreen, 100);
    }
}

function updateLivesUI() {
    if (!livesEl) return;
    livesEl.textContent = snakeLives > 0 ? '❤️'.repeat(snakeLives) : '💀';
}

function clearBuffs() {
    isSlowed = false;
    isInvincible = false;
    slowEndTime = 0;
    invincibleEndTime = 0;
    
    if (uiTickTimer) clearInterval(uiTickTimer);
    if (buffEl) buffEl.textContent = '';
    if (specialTimerEl) specialTimerEl.textContent = '';
}

function spawnFood(category = 'normal') {
    let availableCells = [];
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isFood = foods.some(f => f.x === x && f.y === y);
            if (!isSnake && !isFood) availableCells.push({ x, y });
        }
    }

    if (availableCells.length === 0) return; 

    const cell = availableCells[Math.floor(Math.random() * availableCells.length)];
    
    const pool = category === 'normal' ? NORMAL_FOODS : SPECIAL_FOODS;
    const rand = Math.random() * 100;
    let selectedType = pool[0];
    let cumulativeWeight = 0;
    
    for (const ft of pool) {
        cumulativeWeight += ft.weight;
        if (rand <= cumulativeWeight) {
            selectedType = ft;
            break;
        }
    }

    foods.push({ 
        x: cell.x, 
        y: cell.y, 
        category: category,
        ...selectedType,
        spawnTime: Date.now() 
    });
}

function snakeDraw() {
    if (!ctx) return;

    const computedStyle = getComputedStyle(document.body);
    const bgColor = computedStyle.getPropertyValue('--bg-color').trim() || '#0B0E14';
    const isLight = document.body.classList.contains('light-theme');
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = gridColor;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * GRID, 0); ctx.lineTo(i * GRID, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * GRID); ctx.lineTo(canvas.width, i * GRID); ctx.stroke();
    }

    const now = Date.now();
    foods.forEach(f => {
        let alpha = 1.0;
        if (f.duration > 0) {
            const elapsed = now - f.spawnTime;
            const remain = f.duration - elapsed;
            if (remain < 2000) {
                alpha = (Math.floor(now / 200) % 2 === 0) ? 1.0 : 0.3; 
            }
        }

        ctx.globalAlpha = alpha; 
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x * GRID + GRID / 2, f.y * GRID + GRID / 2, GRID / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, f.x * GRID + GRID / 2, f.y * GRID + GRID / 2);
        ctx.globalAlpha = 1.0; 
    });

    let headColor = '#4B9EFF'; 
    if (isSpeeding) headColor = '#FBBF24'; 
    if (isSlowed) headColor = '#60A5FA';   
    if (isInvincible) headColor = '#22D3EE'; 

    snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? headColor : '#3B82F6';
        if (isInvincible) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#22D3EE';
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);
    });
    ctx.shadowBlur = 0; 
}

function snakeStep() {
    const now = Date.now();
    
    // 处理 buff 过期
    if (isSlowed && now > slowEndTime) {
        isSlowed = false;
        if (snakeRunning && !isWaitingRevive && !isSpeeding) {
            clearInterval(snakeTimer);
            snakeTimer = setInterval(snakeStep, currentSpeed);
        }
    }
    if (isInvincible && now > invincibleEndTime) {
        isInvincible = false;
        snakeDraw();
    }

    // 过滤过期食物
    foods = foods.filter(f => {
        if (f.duration > 0 && now - f.spawnTime > f.duration) return false;
        return true;
    });

    // 保底补充普通食物
    let normalCount = foods.filter(f => f.category === 'normal').length;
    while(normalCount < 3) {
        spawnFood('normal');
        normalCount = foods.filter(f => f.category === 'normal').length;
    }

    // 特殊道具生成逻辑：时间随机、数量随机(保底1个)
    if (now >= nextSpecialSpawnTime) {
        let spawnCount = Math.random() < 0.2 ? 2 : 1; 
        let currentSpecials = foods.filter(f => f.category === 'special').length;
        
        let availableSlots = 3 - currentSpecials;
        spawnCount = Math.min(spawnCount, availableSlots);

        for (let i = 0; i < spawnCount; i++) {
            spawnFood('special');
        }
        
        nextSpecialSpawnTime = Date.now() + (Math.random() * 6000 + 6000);
    }

    // 取出缓冲队列方向
    if (directionQueue.length > 0) {
        direction = directionQueue.shift();
    }
    
    let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // 先判断这一步会不会吃到食物（用来决定尾巴是否保留）
    let ateIndex = -1;
    foods.forEach((f, index) => {
        if (head.x === f.x && head.y === f.y) ateIndex = index;
    });

    // 碰撞检测
    if (isInvincible) {
        if (head.x < 0) head.x = COLS - 1;
        if (head.x >= COLS) head.x = 0;
        if (head.y < 0) head.y = ROWS - 1;
        if (head.y >= ROWS) head.y = 0;
    } else {
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return takeDamage();
        
        // 核心修复：如果没吃到食物，尾巴会在这一步缩回去，所以判断碰撞时不包含尾巴
        let bodyToCheck = (ateIndex !== -1) ? snake : snake.slice(0, -1);
        if (bodyToCheck.some(s => s.x === head.x && s.y === head.y)) return takeDamage();
    }

    // 移动蛇
    snake.unshift(head);

    // 处理吃食物逻辑
    if (ateIndex !== -1) {
        const eaten = foods[ateIndex];
        foods.splice(ateIndex, 1);
        
        snakeScore += eaten.score;
        if (snakeScore < 0) snakeScore = 0; 
        if (scoreEl) scoreEl.textContent = snakeScore;

        if (eaten.type === 'bomb') {
            snakeLives--;
            updateLivesUI();
            for(let i=0; i<Math.abs(eaten.grow); i++) {
                if (snake.length > 1) snake.pop();
            }
            if (snakeLives <= 0) {
                snakeRunning = false;
                clearInterval(snakeTimer);
                return snakeGameOver();
            }
        } else if (eaten.type === 'potion') {
            snakeLives = Math.min(snakeLives + 1, 5); 
            updateLivesUI();
        } else if (eaten.type === 'gold') {
            snakeLives = 3; 
            updateLivesUI();
        } else if (eaten.type === 'grape') {
            for(let i=1; i<eaten.grow; i++) snake.push({ ...snake[snake.length - 1] }); 
        } else if (eaten.type === 'ice') {
            isSlowed = true;
            slowEndTime = Date.now() + 3000;
            clearInterval(snakeTimer);
            snakeTimer = setInterval(snakeStep, 300); 
        } else if (eaten.type === 'lightning') {
            isInvincible = true;
            invincibleEndTime = Date.now() + 5000;
        }

        // 吃掉普通食物有 20% 概率提前触发/掉落一个特殊道具
        if (eaten.category === 'normal' && Math.random() < 0.20) {
            spawnFood('special');
        }
    } else {
        snake.pop(); 
    }

    snakeDraw();
}

// 全局 UI 刷新器
function startUITick() {
    if (uiTickTimer) clearInterval(uiTickTimer);
    
    uiTickTimer = setInterval(() => {
        const now = Date.now();
        
        let buffHtml = [];
        if (isInvincible && now < invincibleEndTime) {
            let s = ((invincibleEndTime - now) / 1000).toFixed(1);
            buffHtml.push(`<span style="color:#22D3EE">⚡无敌 ${s}s</span>`);
        }
        if (isSlowed && now < slowEndTime) {
            let s = ((slowEndTime - now) / 1000).toFixed(1);
            buffHtml.push(`<span style="color:#60A5FA">❄️减速 ${s}s</span>`);
        }
        if (buffEl) buffEl.innerHTML = buffHtml.join(' | ');

        if (specialTimerEl && snakeRunning && !isWaitingRevive) {
            let remain = Math.max(0, nextSpecialSpawnTime - now);
            if (remain <= 0) {
                specialTimerEl.innerHTML = `<span style="color:#FBBF24">🎁 道具生成中...</span>`;
            } else {
                specialTimerEl.innerHTML = `距道具出现: ${(remain / 1000).toFixed(1)}s`;
            }
        } else if (specialTimerEl) {
            specialTimerEl.textContent = '';
        }

    }, 100); 
}

function takeDamage() {
    snakeLives--;
    updateLivesUI();
    
    clearInterval(snakeTimer);
    snakeRunning = false;
    isSpeeding = false;
    clearBuffs(); 

    if (snakeLives <= 0) {
        snakeGameOver();
    } else {
        isWaitingRevive = true;
        showReviveScreen();
    }
}

function showReviveScreen() {
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxW = 240;
    const boxH = 100;
    const boxX = (canvas.width - boxW) / 2;
    const boxY = (canvas.height - boxH) / 2;
    
    ctx.fillStyle = '#1F2937'; 
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    else ctx.rect(boxX, boxY, boxW, boxH); 
    ctx.fill();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('失去了一条生命', canvas.width / 2, boxY + 30);

    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillText('按 [空格键] 复活', canvas.width / 2, boxY + 70);
    }

    if (isWaitingRevive) {
        reviveAnimationTimer = setTimeout(showReviveScreen, 100);
    }
}

function reviveSnake() {
    isWaitingRevive = false;
    if (reviveAnimationTimer) clearTimeout(reviveAnimationTimer); 
    
    let keepLength = Math.max(3, Math.floor(snake.length / 2));
    snake = snake.slice(0, keepLength);
    
    const startX = Math.floor(COLS/2);
    const startY = Math.floor(ROWS/2);
    for(let i=0; i<snake.length; i++) {
        snake[i] = { x: startX - i, y: startY };
    }
    
    direction = { x: 1, y: 0 };
    directionQueue = [];
    nextDirection = { x: 1, y: 0 };
    
    isInvincible = true;
    invincibleEndTime = Date.now() + 2000;
    nextSpecialSpawnTime = Date.now() + (Math.random() * 6000 + 6000);

    foods = foods.filter(f => f.category === 'normal');
    
    snakeRunning = true;
    startUITick();
    snakeDraw(); 
    clearInterval(snakeTimer);
    snakeTimer = setInterval(snakeStep, currentSpeed);
}

function snakeGameOver() {
    clearInterval(snakeTimer);
    snakeRunning = false;
    isWaitingRevive = false;
    if (reviveAnimationTimer) clearTimeout(reviveAnimationTimer);
    if (startAnimationTimer) clearTimeout(startAnimationTimer);
    clearBuffs();
    
    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.fillStyle = '#fff';
        ctx.font = '18px sans-serif';
        ctx.fillText(`最终得分：${snakeScore}`, canvas.width / 2, canvas.height / 2 + 10);
        
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#4B9EFF'; 
            ctx.fillText('按 [空格键] 重新开始', canvas.width / 2, canvas.height / 2 + 50);
        }
        
        if (snakeLives <= 0) {
            reviveAnimationTimer = setTimeout(drawGameOver, 100);
        }
    }
    drawGameOver();
}