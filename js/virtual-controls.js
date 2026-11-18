// ==========================================
//  虚拟按键控制器
//  电脑 / 手机通用：开关、缩放、拖动位置、按游戏切换十字键布局
// ==========================================

(function () {
    'use strict';

    const STORAGE_KEY = 'vcSettings';
    const LEGACY_OPEN_KEY = 'vcOpen';

    const SIZE_MIN = 0.75;
    const SIZE_MAX = 1.5;
    const SIZE_STEP = 0.1;

    const REPEAT_DELAY = 320;   // 按住方向键多久后开始连发
    const REPEAT_INTERVAL = 90; // 连发间隔

    let els = null;
    let initialized = false;

    let isOpen = false;
    let scale = 1;
    let position = null;        // { left, top }
    let currentGame = '';
    let dragState = null;
    let labelTimer = null;

    const pressStates = new WeakMap();

    // ==========================================
    //  初始化
    // ==========================================
    function initVirtualControls() {
        if (initialized) return;

        const container = document.getElementById('vc-container');
        const toggle = document.getElementById('vc-toggle');
        if (!container || !toggle) return;

        initialized = true;

        els = {
            container,
            panel: document.getElementById('vc-panel'),
            toggle,
            dragHandle: document.getElementById('vc-drag-handle'),
            sizeDown: document.getElementById('vc-size-down'),
            sizeUp: document.getElementById('vc-size-up'),
            sizeLabel: document.getElementById('vc-size-label'),
            resetBtn: document.getElementById('vc-reset'),
            closeBtn: document.getElementById('vc-close'),
            flagToggle: document.getElementById('vc-flag-toggle'),
            flagText: document.getElementById('vc-flag-text'),
            snakeAction: document.getElementById('vc-snake-action'),
            tetrisAction: document.getElementById('vc-tetris-action'),
            tetrisPause: document.getElementById('vc-tetris-pause'),
            groups: {
                minesweeper: document.getElementById('vc-minesweeper'),
                snake: document.getElementById('vc-snake'),
                tetris: document.getElementById('vc-tetris')
            }
        };

        loadSettings();
        applyScale();
        bindToggle();
        bindToolbar();
        bindKeyButtons();
        bindDrag();
        bindNavigation();
        updateGameView();

        labelTimer = setInterval(() => {
            if (!isOpen) return;
            refreshLabels();
            keepInViewport();
        }, 250);

        window.addEventListener('resize', handleWindowResize);
        window.addEventListener('orientationchange', handleWindowResize);
        window.addEventListener('load', keepInViewport);
        window.addEventListener('blur', releaseAllKeys);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) releaseAllKeys();
        });
    }

    // ==========================================
    //  设置持久化
    // ==========================================
    function loadSettings() {
        let saved = {};

        try {
            saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (_) {
            saved = {};
        }

        let legacyOpen = null;
        try {
            legacyOpen = localStorage.getItem(LEGACY_OPEN_KEY);
        } catch (_) {
            legacyOpen = null;
        }

        if (typeof saved.open === 'boolean') {
            isOpen = saved.open;
        } else if (legacyOpen !== null) {
            isOpen = legacyOpen === 'true';
        } else {
            // 首次使用：触屏设备默认打开，电脑默认关闭
            isOpen = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        }

        const savedScale = Number(saved.scale);
        scale = Number.isFinite(savedScale) && savedScale > 0 ? savedScale : 1;
        scale = clamp(scale, SIZE_MIN, SIZE_MAX);

        if (saved.position &&
            Number.isFinite(saved.position.left) &&
            Number.isFinite(saved.position.top)) {
            position = { left: saved.position.left, top: saved.position.top };
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                open: isOpen,
                scale: scale,
                position: position
            }));
            localStorage.setItem(LEGACY_OPEN_KEY, String(isOpen));
        } catch (_) {
            // localStorage 不可用时忽略，不影响游戏
        }
    }

    // ==========================================
    //  显示 / 隐藏与按游戏切换布局
    // ==========================================
    function updateGameView() {
        if (!els) return;

        const page = document.getElementById('page-game');
        const onGamePage = !!(page && page.classList.contains('active'));

        if (!onGamePage) {
            releaseAllKeys();
            els.container.classList.remove('vc-open');
            els.toggle.classList.add('vc-hidden');
            return;
        }

        const activeTab = document.querySelector('.game-tab.active');
        const game = activeTab ? activeTab.dataset.game : 'minesweeper';

        if (game !== currentGame) {
            releaseAllKeys();
            currentGame = game;
        }

        Object.keys(els.groups).forEach(name => {
            const group = els.groups[name];
            if (group) group.classList.toggle('vc-active', name === currentGame);
        });

        els.container.classList.toggle('vc-open', isOpen);
        els.toggle.classList.toggle('vc-hidden', isOpen);
        els.toggle.setAttribute('aria-pressed', String(isOpen));

        if (isOpen) {
            if (!position) position = getDefaultPosition();
            applyPosition(position);
        }

        refreshLabels(true);
    }

    function bindNavigation() {
        document.body.addEventListener('click', (e) => {
            if (!(e.target instanceof Element)) return;
            if (e.target.closest('.nav-item') || e.target.closest('.game-tab')) {
                // 等页面 / Tab 的 active 类切换完成后再刷新
                window.setTimeout(updateGameView, 0);
            }
        });
    }

    function setOpen(open) {
        if (!els) return;
        isOpen = !!open;

        if (!isOpen) releaseAllKeys();

        els.container.classList.toggle('vc-open', isOpen);
        els.toggle.classList.toggle('vc-hidden', isOpen);
        els.toggle.setAttribute('aria-pressed', String(isOpen));

        if (isOpen) {
            if (!position) position = getDefaultPosition();
            applyPosition(position);
            refreshLabels(true);
        }

        saveSettings();
    }

    // ==========================================
    //  位置与大小
    // ==========================================
    function getDefaultPosition() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = els.panel.offsetWidth;
        const height = els.panel.offsetHeight;

        return {
            // 宽屏默认放右下角，尽量不挡住居中的游戏画面；窄屏居中
            left: vw >= 900 ? Math.max(8, vw - width - 24) : Math.max(8, (vw - width) / 2),
            top: Math.max(8, vh - height - 100)
        };
    }

    function applyPosition(pos) {
        if (!pos) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = els.panel.offsetWidth;
        const height = els.panel.offsetHeight;

        const left = clamp(pos.left, 8, Math.max(8, vw - width - 8));
        const top = clamp(pos.top, 8, Math.max(8, vh - height - 8));

        els.container.style.left = left + 'px';
        els.container.style.top = top + 'px';
        els.container.style.right = 'auto';
        els.container.style.bottom = 'auto';

        position = { left, top };
    }

    function handleWindowResize() {
        if (!isOpen) return;
        applyPosition(position || getDefaultPosition());
    }

    // 字体加载、浏览器工具栏变化等可能让面板尺寸晚一点才稳定，定期兜底夹取
    function keepInViewport() {
        if (!isOpen || !els) return;

        const rect = els.container.getBoundingClientRect();
        const width = els.panel.offsetWidth;
        const height = els.panel.offsetHeight;

        const left = clamp(rect.left, 8, Math.max(8, window.innerWidth - width - 8));
        const top = clamp(rect.top, 8, Math.max(8, window.innerHeight - height - 8));

        if (Math.abs(left - rect.left) > 0.5 || Math.abs(top - rect.top) > 0.5) {
            els.container.style.left = left + 'px';
            els.container.style.top = top + 'px';
            els.container.style.right = 'auto';
            els.container.style.bottom = 'auto';
            position = { left, top };
        }
    }

    function applyScale() {
        if (!els) return;

        scale = clamp(Math.round(scale * 100) / 100, SIZE_MIN, SIZE_MAX);
        els.panel.style.setProperty('--vc-scale', String(scale));
        els.sizeLabel.textContent = Math.round(scale * 100) + '%';

        if (isOpen) {
            applyPosition(position || getDefaultPosition());
        }
    }

    function changeScale(delta) {
        const next = clamp(Math.round((scale + delta) * 100) / 100, SIZE_MIN, SIZE_MAX);
        if (next === scale) return;
        scale = next;
        applyScale();
        saveSettings();
    }

    function bindToolbar() {
        els.sizeDown.addEventListener('click', () => changeScale(-SIZE_STEP));
        els.sizeUp.addEventListener('click', () => changeScale(SIZE_STEP));

        els.closeBtn.addEventListener('click', () => setOpen(false));

        els.resetBtn.addEventListener('click', () => {
            scale = 1;
            position = null;
            applyScale();

            if (isOpen) {
                position = getDefaultPosition();
                applyPosition(position);
            }

            saveSettings();
            showToast('虚拟按键已恢复默认位置和大小');
        });

        els.flagToggle.addEventListener('click', () => {
            if (typeof msSetFlagMode !== 'function' || typeof msGetFlagMode !== 'function') {
                showToast('扫雷模块尚未就绪');
                return;
            }
            msSetFlagMode(!msGetFlagMode());
            refreshLabels(true);
        });

        // 防止长按虚拟按键时弹出系统菜单
        els.panel.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    function bindToggle() {
        els.toggle.addEventListener('click', () => setOpen(!isOpen));
    }

    // ==========================================
    //  拖动
    // ==========================================
    function bindDrag() {
        const handle = els.dragHandle;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();

            const rect = els.container.getBoundingClientRect();
            dragState = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                left: rect.left,
                top: rect.top
            };

            els.container.classList.add('vc-dragging');

            try {
                handle.setPointerCapture(e.pointerId);
            } catch (_) {
                // 忽略不支持指针捕获的旧浏览器
            }
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            e.preventDefault();

            const width = els.panel.offsetWidth;
            const height = els.panel.offsetHeight;
            const left = clamp(
                dragState.left + (e.clientX - dragState.startX),
                4,
                Math.max(4, window.innerWidth - width - 4)
            );
            const top = clamp(
                dragState.top + (e.clientY - dragState.startY),
                4,
                Math.max(4, window.innerHeight - height - 4)
            );

            els.container.style.left = left + 'px';
            els.container.style.top = top + 'px';
            els.container.style.right = 'auto';
            els.container.style.bottom = 'auto';

            position = { left, top };
        });

        const endDrag = () => {
            if (!dragState) return;
            dragState = null;
            els.container.classList.remove('vc-dragging');
            saveSettings();
        };

        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
        handle.addEventListener('lostpointercapture', endDrag);
    }

    // ==========================================
    //  虚拟按键按下 / 长按连发
    // ==========================================
    function bindKeyButtons() {
        els.panel.querySelectorAll('.vc-key').forEach(btn => {
            const code = btn.getAttribute('data-code');
            const repeat = btn.getAttribute('data-repeat') === 'true';

            const state = {
                active: false,
                pointerId: null,
                repeatDelay: null,
                repeatTimer: null
            };
            pressStates.set(btn, state);

            const press = (e) => {
                if (state.active) return;
                if (e.button !== undefined && e.button !== 0) return;

                e.preventDefault();

                if (e.pointerId !== undefined) {
                    state.pointerId = e.pointerId;
                    try {
                        btn.setPointerCapture(e.pointerId);
                    } catch (_) {
                        // 忽略
                    }
                }

                state.active = true;
                btn.classList.add('vc-pressed');
                dispatchKey('keydown', code);
                refreshLabels(true);

                if (repeat) {
                    state.repeatDelay = setTimeout(() => {
                        state.repeatTimer = setInterval(() => dispatchKey('keydown', code), REPEAT_INTERVAL);
                    }, REPEAT_DELAY);
                }
            };

            const release = (e) => {
                if (!state.active) return;
                if (e && e.pointerId !== undefined &&
                    state.pointerId !== null && e.pointerId !== state.pointerId) {
                    return;
                }

                state.active = false;
                state.pointerId = null;

                clearTimeout(state.repeatDelay);
                clearInterval(state.repeatTimer);
                state.repeatDelay = null;
                state.repeatTimer = null;

                btn.classList.remove('vc-pressed');
                dispatchKey('keyup', code);
                refreshLabels(true);
            };

            btn.addEventListener('pointerdown', press);
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointercancel', release);
            btn.addEventListener('lostpointercapture', release);
            btn.addEventListener('contextmenu', (e) => e.preventDefault());
        });
    }

    function releaseAllKeys() {
        if (!els) return;

        els.panel.querySelectorAll('.vc-key').forEach(btn => {
            const state = pressStates.get(btn);
            if (!state || !state.active) return;

            state.active = false;
            state.pointerId = null;
            clearTimeout(state.repeatDelay);
            clearInterval(state.repeatTimer);
            state.repeatDelay = null;
            state.repeatTimer = null;

            btn.classList.remove('vc-pressed');
            dispatchKey('keyup', btn.getAttribute('data-code'));
        });
    }

    function dispatchKey(type, code) {
        const keyMap = {
            Space: ' ',
            KeyP: 'p',
            ArrowUp: 'ArrowUp',
            ArrowDown: 'ArrowDown',
            ArrowLeft: 'ArrowLeft',
            ArrowRight: 'ArrowRight'
        };

        document.dispatchEvent(new KeyboardEvent(type, {
            key: keyMap[code] || code,
            code: code,
            bubbles: true,
            cancelable: true
        }));
    }

    // ==========================================
    //  按钮文字状态
    // ==========================================
    function refreshLabels(force) {
        if (!els) return;
        if (!force && !isOpen) return;

        if (currentGame === 'snake') {
            const running = typeof snakeRunning !== 'undefined' && snakeRunning;
            const revive = typeof isWaitingRevive !== 'undefined' && isWaitingRevive;
            const dead = typeof snakeLives !== 'undefined' && snakeLives <= 0;

            let text = '开始';
            if (revive) text = '复活';
            else if (dead) text = '重开';
            else if (running) text = '加速';

            setButtonText(els.snakeAction, text);
        } else if (currentGame === 'tetris') {
            const running = typeof tRunning !== 'undefined' && tRunning;
            const paused = typeof tPaused !== 'undefined' && tPaused;
            const over = typeof tGameOver !== 'undefined' && tGameOver;

            let text = '开始';
            if (over || paused) text = '重开';
            else if (running) text = '瞬降';

            setButtonText(els.tetrisAction, text);
            setButtonText(els.tetrisPause, paused ? '继续' : '暂停');
        } else if (currentGame === 'minesweeper') {
            const on = typeof msGetFlagMode === 'function' && msGetFlagMode();
            const next = String(on);

            if (els.flagToggle.getAttribute('aria-pressed') !== next) {
                els.flagToggle.setAttribute('aria-pressed', next);
                els.flagText.textContent = on ? '标雷中' : '标雷模式';
            }
        }
    }

    function setButtonText(el, text) {
        if (el && el.textContent !== text) el.textContent = text;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // 暴露到全局，由 script.js 在游戏初始化后调用
    window.initVirtualControls = initVirtualControls;

    // 供调试 / 其他模块使用
    window.virtualControls = {
        open: () => setOpen(true),
        close: () => setOpen(false),
        toggle: () => setOpen(!isOpen),
        isOpen: () => isOpen
    };
})();
