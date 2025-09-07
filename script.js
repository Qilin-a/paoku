/*
 * 极速跑酷 Ultra - 增强版无限滚屏跑酷游戏
 * 特性：现代化UI、粒子效果、生命系统、滑铲机制、道具系统
 */

class ParkourGame {
    constructor() {
        this.initCanvas();
        this.initGameState();
        this.initPlayer();
        this.initWorld();
        this.initEntities();
        this.initAudio();
        this.initParticles();
        this.initDailyChallenge();
        this.initEnvironments();
        
        this.bindEvents();
        this.resize();
        this.showLoadingScreen();
        
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showMainMenu();
            this.startGameLoop();
        }, 1500);
    }
    
    initCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleCanvas = document.getElementById('particleCanvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        this.width = 0;
        this.height = 0;
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
    }
    
    initGameState() {
        this.STATES = {
            LOADING: 'loading',
            MENU: 'menu', 
            PLAYING: 'playing',
            PAUSED: 'paused',
            GAME_OVER: 'gameOver'
        };
        
        this.state = this.STATES.LOADING;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
    }
    
    initPlayer() {
        this.player = {
            x: 120, y: 0, width: 50, height: 70,
            velocityY: 0, onGround: false, isSliding: false,
            slideTimer: 0, jumpCount: 0, maxJumps: 2,
            lives: 3, maxLives: 3, invulnerable: false, invulnerableTimer: 0,
            shield: { active: false, timer: 0, duration: 8 },
            magnet: { active: false, timer: 0, duration: 10 },
            boost: { active: false, timer: 0, duration: 5 },
            animFrame: 0, animTimer: 0,
            // 手感增强
            jumpBufferTimer: 0, // 跳跃缓冲
            coyoteTimer: 0, // 土狼时间
            jumpKeyHeld: false, // 跳跃键是否按住
            jumpStartTime: 0 // 跳跃开始时间
        };
    }
    
    initWorld() {
        this.world = {
            gravity: 2500, groundHeight: 100, baseSpeed: 400,
            currentSpeed: 400, speedMultiplier: 1.0, maxSpeedMultiplier: 3.0,
            distance: 0
        };
        
        // 时间缩放系统
        this.timeScale = 1.0;
        this.slowMotionActive = false;
        this.slowMotionTimer = 0;
    }
    
    initEntities() {
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.effects = [];
        
        this.spawners = {
            obstacle: { timer: 0, interval: 1.5, minInterval: 0.8 },
            coin: { timer: 0, interval: 2.0 },
            powerup: { timer: 0, interval: 8.0 }
        };
        
        this.score = 0;
        this.coinsCollected = 0;
        this.scoreMultiplier = 1;
        this.multiplierTimer = 0;
        this.bestScore = parseInt(localStorage.getItem('parkour_best_score') || '0');
        this.bestDistance = parseInt(localStorage.getItem('parkour_best_distance') || '0');
        
        // Combo系统
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        
        // 商店和成就系统
        this.currency = parseInt(localStorage.getItem('parkour_currency') || '0');
        this.unlockedSkins = JSON.parse(localStorage.getItem('parkour_unlocked_skins') || '["default"]');
        this.currentSkin = localStorage.getItem('parkour_current_skin') || 'default';
        this.achievements = this.initAchievements();
    }
    
    initAudio() {
        this.audio = { context: null, enabled: true, volume: 0.3 };
        try {
            this.audio.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    initParticles() {
        this.particles = [];
        this.maxParticles = 100;
    }
    
    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuBtn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.showMainMenu());
        
        // 商店和成就按钮
        document.getElementById('shopBtn').addEventListener('click', () => this.showShopMenu());
        document.getElementById('achievementsBtn').addEventListener('click', () => this.showAchievementsMenu());
        document.getElementById('shopBackBtn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('achievementsBackBtn').addEventListener('click', () => this.showMainMenu());
        
        document.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        [this.canvas, this.particleCanvas].forEach(canvas => {
            canvas.width = this.width * this.dpr;
            canvas.height = this.height * this.dpr;
            canvas.style.width = this.width + 'px';
            canvas.style.height = this.height + 'px';
        });
        
        // 重置变换矩阵避免累乘缩放
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.particleCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
        this.particleCtx.scale(this.dpr, this.dpr);
        
        if (this.player) {
            this.player.y = this.height - this.world.groundHeight - this.player.height;
        }
    }
    
    handleKeyDown(e) {
        switch (e.code) {
            case 'Space':
            case 'ArrowUp':
            case 'KeyW':
                e.preventDefault();
                this.player.jumpKeyHeld = true;
                this.player.jumpBufferTimer = 0.1; // 100ms跳跃缓冲
                this.jump();
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                this.slide();
                break;
            case 'KeyP':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    handleClick(e) {
        if (this.state === this.STATES.MENU) {
            this.startGame();
        } else if (this.state === this.STATES.PLAYING) {
            this.jump();
        }
    }
    
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        
        if (this.state === this.STATES.MENU) {
            this.startGame();
        } else if (this.state === this.STATES.PLAYING) {
            // 记录触摸开始位置和时间
            if (!this.touchStart) {
                this.touchStart = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now()
                };
            }
            
            // 简单的上下区域判断
            if (touch.clientY < this.height / 2) {
                this.player.jumpKeyHeld = true;
                this.player.jumpBufferTimer = 0.1;
                this.jump();
            } else {
                this.slide();
            }
        }
    }
    
    handleKeyUp(e) {
        switch (e.code) {
            case 'Space':
            case 'ArrowUp':
            case 'KeyW':
                this.player.jumpKeyHeld = false;
                break;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.player.jumpKeyHeld = false;
        this.touchStart = null;
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.touchStart || this.state !== this.STATES.PLAYING) return;
        
        const touch = e.touches[0];
        const deltaY = touch.clientY - this.touchStart.y;
        const deltaTime = Date.now() - this.touchStart.time;
        
        // 检测快速上下滑动手势
        if (deltaTime < 300 && Math.abs(deltaY) > 50) {
            if (deltaY < -30) {
                // 向上滑动 - 跳跃
                this.player.jumpKeyHeld = true;
                this.player.jumpBufferTimer = 0.1;
                this.jump();
            } else if (deltaY > 30) {
                // 向下滑动 - 滑铲
                this.slide();
            }
            this.touchStart = null;
        }
    }
    
    jump() {
        if (this.state !== this.STATES.PLAYING) return;
        
        // 检查是否可以跳跃（地面、土狼时间或二段跳）
        const canJump = this.player.onGround || 
                       this.player.coyoteTimer > 0 || 
                       this.player.jumpCount < this.player.maxJumps;
        
        if (canJump) {
            this.player.velocityY = -Math.sqrt(2 * this.world.gravity * 350);
            this.player.onGround = false;
            this.player.jumpCount++;
            this.player.isSliding = false;
            this.player.jumpStartTime = this.gameTime;
            this.player.coyoteTimer = 0; // 使用土狼时间后清零
            this.playSound(800, 0.1);
            this.createJumpParticles();
        }
    }
    
    slide() {
        if (this.state !== this.STATES.PLAYING || !this.player.onGround) return;
        
        this.player.isSliding = true;
        this.player.slideTimer = 0.8;
        this.playSound(400, 0.2);
        this.createSlideParticles();
    }
    
    togglePause() {
        if (this.state === this.STATES.PLAYING) {
            this.pauseGame();
        } else if (this.state === this.STATES.PAUSED) {
            this.resumeGame();
        }
    }
    
    startGame() {
        this.resetGame();
        this.state = this.STATES.PLAYING;
        this.hideAllPanels();
        this.showGameUI();
        this.playSound(1000, 0.1);
    }
    
    pauseGame() {
        this.state = this.STATES.PAUSED;
        document.getElementById('pauseMenu').classList.add('active');
        this.updatePauseStats();
    }
    
    resumeGame() {
        this.state = this.STATES.PLAYING;
        document.getElementById('pauseMenu').classList.remove('active');
    }
    
    gameOver() {
        this.state = this.STATES.GAME_OVER;
        this.updateBestScores();
        this.showGameOverMenu();
        this.hideGameUI();
        this.playSound(200, 0.5);
        this.screenShake();
        this.createExplosionParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
    }
    
    resetGame() {
        this.player.x = 120;
        this.player.y = this.height - this.world.groundHeight - this.player.height;
        this.player.velocityY = 0;
        this.player.onGround = true;
        this.player.isSliding = false;
        this.player.jumpCount = 0;
        this.player.lives = 3;
        this.player.invulnerable = false;
        
        this.player.shield.active = false;
        this.player.magnet.active = false;
        this.player.boost.active = false;
        
        // 重置Combo
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        
        this.world.currentSpeed = this.world.baseSpeed;
        this.world.speedMultiplier = 1.0;
        this.world.distance = 0;
        
        this.obstacles.length = 0;
        this.coins.length = 0;
        this.powerups.length = 0;
        this.particles.length = 0;
        this.effects.length = 0;
        
        this.score = 0;
        this.coinsCollected = 0;
        this.scoreMultiplier = 1;
        this.multiplierTimer = 0;
        
        // 重置Combo
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        
        Object.values(this.spawners).forEach(s => s.timer = 0);
        this.gameTime = 0;
    }
    
    showMainMenu() {
        this.state = this.STATES.MENU;
        this.hideAllPanels();
        document.getElementById('mainMenu').classList.add('active');
        this.updateMenuStats();
    }
    
    showShopMenu() {
        this.hideAllPanels();
        document.getElementById('shopMenu').classList.add('active');
        this.initShopUI();
    }
    
    showAchievementsMenu() {
        this.hideAllPanels();
        document.getElementById('achievementsMenu').classList.add('active');
        this.initAchievementsUI();
    }
    
    showGameOverMenu() {
        document.getElementById('gameOverMenu').classList.add('active');
        this.updateGameOverStats();
    }
    
    hideAllPanels() {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('new-record').classList.remove('show');
    }
    
    showGameUI() {
        document.getElementById('hud').classList.add('active');
        document.getElementById('speedometer').classList.add('active');
        if (this.isMobile()) {
            document.getElementById('touchControls').classList.add('show');
        }
    }
    
    hideGameUI() {
        document.getElementById('hud').classList.remove('active');
        document.getElementById('speedometer').classList.remove('active');
        document.getElementById('touchControls').classList.remove('show');
    }
    
    hideLoadingScreen() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }
    
    showLoadingScreen() {
        document.getElementById('loadingScreen').classList.remove('hidden');
    }
    
    updateBestScores() {
        const currentScore = Math.floor(this.score);
        const currentDistance = Math.floor(this.world.distance / 100);
        
        if (currentScore > this.bestScore) {
            this.bestScore = currentScore;
            localStorage.setItem('parkour_best_score', this.bestScore.toString());
            document.getElementById('new-record').classList.add('show');
        }
        
        if (currentDistance > this.bestDistance) {
            this.bestDistance = currentDistance;
            localStorage.setItem('parkour_best_distance', this.bestDistance.toString());
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score).toLocaleString();
        document.getElementById('distance').textContent = Math.floor(this.world.distance / 100) + 'm';
        document.getElementById('multiplier').textContent = 'x' + this.scoreMultiplier;
        
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < this.player.lives) {
                heart.classList.remove('lost');
            } else {
                heart.classList.add('lost');
            }
        });
        
        document.getElementById('shield-indicator').classList.toggle('active', this.player.shield.active);
        document.getElementById('magnet-indicator').classList.toggle('active', this.player.magnet.active);
        document.getElementById('boost-indicator').classList.toggle('active', this.player.boost.active);
        
        // 更新Combo显示
        const comboDisplay = document.getElementById('comboDisplay');
        const comboCount = document.getElementById('comboCount');
        if (this.combo > 0) {
            comboDisplay.classList.add('show');
            comboCount.textContent = this.combo;
        } else {
            comboDisplay.classList.remove('show');
        }
        
        const speedPercent = Math.min(100, (this.world.speedMultiplier - 1) / 2 * 100);
        document.getElementById('speed-value').textContent = this.world.speedMultiplier.toFixed(1) + 'x';
        document.getElementById('speed-fill').style.width = speedPercent + '%';
    }
    
    updateMenuStats() {
        document.getElementById('menu-best').textContent = this.bestScore.toLocaleString();
        document.getElementById('menu-distance').textContent = this.bestDistance + 'm';
    }
    
    updatePauseStats() {
        document.getElementById('pause-score').textContent = Math.floor(this.score).toLocaleString();
        document.getElementById('pause-distance').textContent = Math.floor(this.world.distance / 100) + 'm';
    }
    
    updateGameOverStats() {
        document.getElementById('final-score').textContent = Math.floor(this.score).toLocaleString();
        document.getElementById('final-distance').textContent = Math.floor(this.world.distance / 100) + 'm';
        document.getElementById('final-coins').textContent = this.coinsCollected.toString();
        document.getElementById('final-best').textContent = this.bestScore.toLocaleString();
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30);
            this.lastTime = currentTime;
            
            if (this.state === this.STATES.PLAYING) {
                this.update();
            }
            
            this.render();
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update() {
        this.gameTime += this.deltaTime;
        this.updateWorld();
        this.updatePlayer();
        this.updateEntities();
        this.updateSpawners();
        this.updateParticles();
        this.updateEffects();
        this.checkCollisions();
        this.updateUI();
    }
    
    updateWorld() {
        this.world.speedMultiplier = Math.min(3.0, 1.0 + (this.world.distance / 50000));
        const boostMul = this.player.boost.active ? 1.5 : 1.0;
        this.world.currentSpeed = this.world.baseSpeed * this.world.speedMultiplier * boostMul;
        this.world.distance += this.world.currentSpeed * this.deltaTime;
    }
    
    updatePlayer() {
        ['shield', 'magnet', 'boost'].forEach(power => {
            if (this.player[power].active) {
                this.player[power].timer -= this.deltaTime;
                if (this.player[power].timer <= 0) {
                    this.player[power].active = false;
                }
            }
        });
        
        if (this.player.invulnerable) {
            this.player.invulnerableTimer -= this.deltaTime;
            if (this.player.invulnerableTimer <= 0) {
                this.player.invulnerable = false;
            }
        }
        
        if (this.player.isSliding) {
            this.player.slideTimer -= this.deltaTime;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
            }
        }
        
        if (this.multiplierTimer > 0) {
            this.multiplierTimer -= this.deltaTime;
            if (this.multiplierTimer <= 0) {
                this.scoreMultiplier = 1;
            }
        }
        
        // 更新跳跃缓冲和土狼时间
        if (this.player.jumpBufferTimer > 0) {
            this.player.jumpBufferTimer -= this.deltaTime;
            // 在缓冲时间内着陆时自动跳跃
            if (this.player.onGround && this.player.jumpBufferTimer > 0) {
                this.jump();
                this.player.jumpBufferTimer = 0;
            }
        }
        
        if (this.player.coyoteTimer > 0) {
            this.player.coyoteTimer -= this.deltaTime;
        }
        
        // 可变高度跳跃：松开跳跃键时减少上升速度
        if (!this.player.jumpKeyHeld && this.player.velocityY < 0) {
            this.player.velocityY *= 0.5; // 提早下落
        }
        
        // 重力和位置更新
        this.player.velocityY += this.world.gravity * this.deltaTime;
        this.player.y += this.player.velocityY * this.deltaTime;
        
        const groundY = this.height - this.world.groundHeight - this.player.height;
        const wasOnGround = this.player.onGround;
        
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
            this.player.jumpCount = 0;
        } else {
            this.player.onGround = false;
            // 刚离开地面时开始土狼时间
            if (wasOnGround && !this.player.onGround) {
                this.player.coyoteTimer = 0.1; // 100ms土狼时间
            }
        }
        
        this.score += this.world.currentSpeed * this.deltaTime * 0.02 * this.scoreMultiplier;
        
        // 更新Combo计时器
        if (this.comboTimer > 0) {
            this.comboTimer -= this.deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
        
        // 更新环境和特效
        this.updateEnvironment();
        this.updateSlowMotion();
        
        // 定期检查成就和每日挑战
        if (Math.floor(this.gameTime) % 2 === 0 && this.gameTime - Math.floor(this.gameTime) < this.deltaTime) {
            this.checkAchievements();
            this.updateDailyChallenge();
        }
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    updateEntities() {
        const speed = this.world.currentSpeed;
        
        this.obstacles.forEach(o => o.x -= speed * this.deltaTime);
        this.obstacles = this.obstacles.filter(o => o.x + o.width > -100);
        
        this.coins.forEach(c => {
            c.x -= speed * this.deltaTime;
            c.rotation += 5 * this.deltaTime;
            
            if (this.player.magnet.active) {
                const dx = (this.player.x + this.player.width/2) - c.x;
                const dy = (this.player.y + this.player.height/2) - c.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 200 && dist > 0) {
                    const force = 500 / dist;
                    c.x += (dx / dist) * force * this.deltaTime;
                    c.y += (dy / dist) * force * this.deltaTime;
                }
            }
        });
        this.coins = this.coins.filter(c => c.x + c.radius > -50);
        
        this.powerups.forEach(p => {
            p.x -= speed * this.deltaTime;
            p.rotation += 3 * this.deltaTime;
            p.bobOffset = Math.sin(this.gameTime * 4 + p.id) * 10;
        });
        this.powerups = this.powerups.filter(p => p.x + p.radius > -50);
    }
    
    updateSpawners() {
        const difficulty = Math.min(1, this.world.distance / 100000);
        
        this.spawners.obstacle.timer -= this.deltaTime;
        if (this.spawners.obstacle.timer <= 0) {
            this.spawnObstacle();
            this.spawners.obstacle.timer = (0.8 + (1.5 - 0.8) * (1 - difficulty)) + Math.random() * 0.5;
        }
        
        this.spawners.coin.timer -= this.deltaTime;
        if (this.spawners.coin.timer <= 0) {
            this.spawnCoins();
            this.spawners.coin.timer = 2.0 + Math.random();
        }
        
        this.spawners.powerup.timer -= this.deltaTime;
        if (this.spawners.powerup.timer <= 0) {
            if (Math.random() < 0.7) this.spawnPowerup();
            this.spawners.powerup.timer = 8.0 + Math.random() * 3;
        }
    }
    
    spawnObstacle() {
        const types = [
            { width: 40, height: 60, type: 'box' },
            { width: 60, height: 80, type: 'crate' },
            { width: 30, height: 120, type: 'spike' },
            { width: 80, height: 40, type: 'barrier' }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        const newObstacle = {
            x: this.width + 50,
            y: this.height - this.world.groundHeight - type.height,
            width: type.width,
            height: type.height,
            type: type.type
        };
        
        // 最小间距校验：确保玩家有足够时间反应
        const minDistance = this.world.currentSpeed * 0.8; // 0.8秒反应时间
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        
        if (!lastObstacle || (newObstacle.x - (lastObstacle.x + lastObstacle.width)) >= minDistance) {
            this.obstacles.push(newObstacle);
            
            // 只在安全间距下生成第二个障碍
            if (Math.random() < 0.2) { // 降低概率提高公平性
                const obstacle2 = { ...newObstacle };
                obstacle2.x += Math.max(150, minDistance * 0.6); // 确保第二个障碍也有合理间距
                this.obstacles.push(obstacle2);
            }
        }
    }
    
    spawnCoins() {
        const baseX = this.width + 100;
        const baseY = this.height - this.world.groundHeight - 150;
        const count = 3 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < count; i++) {
            this.coins.push({
                x: baseX + i * 40,
                y: baseY - Math.random() * 100,
                radius: 15,
                rotation: 0
            });
        }
    }
    
    spawnPowerup() {
        const types = ['shield', 'magnet', 'boost', 'multiplier'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerups.push({
            x: this.width + 100,
            y: this.height - this.world.groundHeight - 100 - Math.random() * 100,
            radius: 20,
            type: type,
            rotation: 0,
            bobOffset: 0,
            id: Date.now() + Math.random()
        });
    }
    
    checkCollisions() {
        const playerRect = this.getPlayerRect();
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            if (this.rectIntersect(playerRect, obstacle)) {
                if (this.player.shield.active) {
                    this.player.shield.active = false;
                    this.obstacles.splice(i, 1);
                    this.playSound(600, 0.1);
                    this.createShieldParticles();
                } else if (!this.player.invulnerable) {
                    this.takeDamage();
                    break;
                }
            }
        }
        
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (this.circleRectIntersect(coin, playerRect)) {
                this.coins.splice(i, 1);
                this.collectCoin(coin);
            }
        }
        
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            if (this.circleRectIntersect(powerup, playerRect)) {
                this.powerups.splice(i, 1);
                this.collectPowerup(powerup);
            }
        }
    }
    
    getPlayerRect() {
        const rect = {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height
        };
        
        if (this.player.isSliding) {
            rect.height *= 0.5;
            rect.y += rect.height;
        }
        
        // 边缘宽容：向内缩小10%提高公平性
        const tolerance = 0.1;
        rect.x += rect.width * tolerance;
        rect.y += rect.height * tolerance;
        rect.width *= (1 - tolerance * 2);
        rect.height *= (1 - tolerance * 2);
        
        return rect;
    }
    
    rectIntersect(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && 
               a.y < b.y + b.height && a.y + a.height > b.y;
    }
    
    circleRectIntersect(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
    }
    
    takeDamage() {
        this.player.lives--;
        this.player.invulnerable = true;
        this.player.invulnerableTimer = 2.0;
        
        this.playSound(300, 0.3);
        this.screenShake();
        this.createDamageParticles();
        
        if (this.player.lives <= 0) {
            this.gameOver();
        }
    }
    
    collectCoin(coin) {
        this.addCombo();
        const points = 50 * this.scoreMultiplier * this.comboMultiplier;
        this.score += points;
        this.coinsCollected++;
        this.currency += 5; // 每个金币奖励5货币
        this.playSound(1200, 0.05);
        this.createCoinParticles(coin.x, coin.y);
        this.showScorePopup(coin.x, coin.y, points);
        localStorage.setItem('parkour_currency', this.currency);
    }
    
    collectPowerup(powerup) {
        this.playSound(1000, 0.1);
        this.createPowerupParticles(powerup.x, powerup.y, powerup.type);
        
        switch (powerup.type) {
            case 'shield':
                this.player.shield.active = true;
                this.player.shield.timer = 8;
                break;
            case 'magnet':
                this.player.magnet.active = true;
                this.player.magnet.timer = 10;
                break;
            case 'boost':
                this.player.boost.active = true;
                this.player.boost.timer = 5;
                break;
            case 'multiplier':
                this.scoreMultiplier = Math.min(5, this.scoreMultiplier + 1);
                this.multiplierTimer = 15;
                break;
        }
    }
    
    showScorePopup(x, y, points) {
        this.effects.push({
            x: x, y: y, text: '+' + points,
            alpha: 1, scale: 1, timer: 1.5,
            velocityY: -100, type: 'score'
        });
    }
    
    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.timer -= this.deltaTime;
            effect.y += effect.velocityY * this.deltaTime;
            effect.alpha = effect.timer / 1.5;
            effect.scale = 1 + (1.5 - effect.timer) * 0.5;
            
            if (effect.timer <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.drawBackground();
        this.drawGround();
        this.drawEntities();
        this.drawPlayer();
        this.drawEffects();
        
        this.renderParticles();
    }
    
    drawBackground() {
        const env = this.environments[this.currentEnvironment];
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, env.colors.sky[0]);
        gradient.addColorStop(0.7, env.colors.sky[1]);
        gradient.addColorStop(1, env.colors.sky[2]);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawStars();
        this.drawMountains();
        this.drawEnvironmentParticles();
    }
    
    drawStars() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < 80; i++) {
            const seed = i * 137.5;
            const x = ((seed % 1) * this.width * 2 - this.world.distance * 0.1) % (this.width + 200) - 100;
            const y = ((seed * 1.3) % 1) * this.height * 0.6;
            const size = 1 + ((seed * 1.7) % 1) * 2;
            
            this.ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#8fb9ff';
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    drawEnvironmentParticles() {
        const env = this.environments[this.currentEnvironment];
        if (env.particles === 'snow') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 50; i++) {
                const x = (Math.sin(this.gameTime + i) * 100 + this.width / 2 + i * 20) % this.width;
                const y = (this.gameTime * 50 + i * 10) % this.height;
                this.ctx.fillRect(x, y, 2, 2);
            }
        } else if (env.particles === 'sand') {
            this.ctx.fillStyle = 'rgba(139, 111, 71, 0.6)';
            for (let i = 0; i < 30; i++) {
                const x = (Math.sin(this.gameTime * 0.5 + i) * 50 + this.width / 3 + i * 15) % this.width;
                const y = (this.gameTime * 30 + i * 8) % this.height;
                this.ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.drawBackground();
        this.drawGround();
        this.drawEntities();
        this.drawPlayer();
        this.drawEffects();
        
        this.renderParticles();
    }
    
    drawBackground() {
        const env = this.environments[this.currentEnvironment];
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, env.colors.sky[0]);
        gradient.addColorStop(0.7, env.colors.sky[1]);
        gradient.addColorStop(1, env.colors.sky[2]);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawStars();
        this.drawMountains();
        this.drawEnvironmentParticles();
    }
    
    drawStars() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < 80; i++) {
            const seed = i * 137.5;
            const x = ((seed % 1) * this.width * 2 - this.world.distance * 0.1) % (this.width + 200) - 100;
            const y = ((seed * 1.3) % 1) * this.height * 0.6;
            const size = 1 + ((seed * 1.7) % 1) * 2;
            
            this.ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#8fb9ff';
            this.ctx.fillRect(x, y, size, size);
        }
        
        this.ctx.restore();
    }
    
    drawMountains() {
        const env = this.environments[this.currentEnvironment];
        const layers = [
            { speed: 0.2, color: env.colors.mountains[0], height: 120 },
            { speed: 0.4, color: env.colors.mountains[1], height: 160 },
            { speed: 0.6, color: env.colors.mountains[2], height: 200 }
        ];
        
        layers.forEach(layer => {
            this.ctx.fillStyle = layer.color;
            const offset = (this.world.distance * layer.speed) % 400;
            
            for (let x = -200; x < this.width + 200; x += 200) {
                const height = layer.height + Math.sin((x + offset) * 0.01) * 20;
                this.ctx.fillRect(x - offset, this.height - this.world.groundHeight - height, 200, height);
            }
        });
    }
    
    drawGround() {
        const env = this.environments[this.currentEnvironment];
        const gradient = this.ctx.createLinearGradient(0, this.height - this.world.groundHeight, 0, this.height);
        gradient.addColorStop(0, env.colors.ground[0]);
        gradient.addColorStop(1, env.colors.ground[1]);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.height - this.world.groundHeight, this.width, this.world.groundHeight);
        
        this.ctx.fillStyle = env.colors.mountains[0];
        this.ctx.fillRect(0, this.height - 20, this.width, 20);
    }
    
    drawEntities() {
        this.obstacles.forEach(o => this.drawObstacle(o));
        this.coins.forEach(c => this.drawCoin(c));
        this.powerups.forEach(p => this.drawPowerup(p));
    }
    
    drawObstacle(obstacle) {
        const colors = {
            box: ['#ff6b35', '#d63031'],
            crate: ['#fdcb6e', '#e17055'],
            spike: ['#fd79a8', '#e84393'],
            barrier: ['#74b9ff', '#0984e3']
        };
        
        const [color1, color2] = colors[obstacle.type] || colors.box;
        const gradient = this.ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        if (obstacle.type === 'spike') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y);
            this.ctx.lineTo(obstacle.x + obstacle.width*0.8, obstacle.y + obstacle.height*0.3);
            this.ctx.lineTo(obstacle.x + obstacle.width*0.2, obstacle.y + obstacle.height*0.3);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    drawCoin(coin) {
        this.ctx.save();
        this.ctx.translate(coin.x, coin.y);
        this.ctx.rotate(coin.rotation);
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.7, '#ffb347');
        gradient.addColorStop(1, '#ff8c00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('¥', 0, 5);
        
        this.ctx.restore();
    }
    
    drawPowerup(powerup) {
        this.ctx.save();
        this.ctx.translate(powerup.x, powerup.y + powerup.bobOffset);
        this.ctx.rotate(powerup.rotation);
        
        const colors = {
            shield: '#74b9ff',
            magnet: '#fd79a8',
            boost: '#55efc4',
            multiplier: '#fdcb6e'
        };
        
        const symbols = {
            shield: '🛡️',
            magnet: '🧲',
            boost: '⚡',
            multiplier: '✖️'
        };
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.radius);
        gradient.addColorStop(0, colors[powerup.type]);
        gradient.addColorStop(1, colors[powerup.type] + '80');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbols[powerup.type], 0, 7);
        
        this.ctx.restore();
    }
    
    drawPlayer() {
        this.ctx.save();
        
        if (this.player.invulnerable) {
            this.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.gameTime * 20);
        }
        
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.isSliding ? this.player.height * 0.5 : this.player.height;
        const actualY = this.player.isSliding ? y + this.player.height * 0.5 : y;
        
        if (this.player.shield.active) {
            const shieldGradient = this.ctx.createRadialGradient(x + w/2, actualY + h/2, 0, x + w/2, actualY + h/2, w);
            shieldGradient.addColorStop(0, 'rgba(116, 185, 255, 0.3)');
            shieldGradient.addColorStop(1, 'rgba(116, 185, 255, 0.8)');
            this.ctx.fillStyle = shieldGradient;
            this.ctx.fillRect(x - 10, actualY - 10, w + 20, h + 20);
        }
    
    const gradient = this.ctx.createLinearGradient(x, actualY, x, actualY + h);
    gradient.addColorStop(0, '#ff6b35');
    gradient.addColorStop(0.5, '#fd79a8');
    gradient.addColorStop(1, '#e84393');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, actualY, w, h);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, actualY, w, h);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(x + w*0.2, actualY + h*0.2, w*0.2, h*0.2);
    this.ctx.fillRect(x + w*0.6, actualY + h*0.2, w*0.2, h*0.2);
    
    if (!this.player.isSliding) {
        this.ctx.fillRect(x + w*0.3, actualY + h*0.6, w*0.4, h*0.1);
    }
    
        this.ctx.restore();
    }
    
    drawEffects() {
        this.effects.forEach(effect => {
            if (effect.type === 'score') {
                this.ctx.save();
                this.ctx.globalAlpha = effect.alpha;
                this.ctx.translate(effect.x, effect.y);
                this.ctx.scale(effect.scale, effect.scale);
                
                this.ctx.fillStyle = '#ffd700';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.strokeText(effect.text, 0, 0);
                this.ctx.fillText(effect.text, 0, 0);
                
                this.ctx.restore();
            }
        });
    }
    
    drawObstacle(obstacle) {
        const colors = {
            box: ['#ff6b35', '#d63031'],
            crate: ['#fdcb6e', '#e17055'],
            spike: ['#fd79a8', '#e84393'],
            barrier: ['#74b9ff', '#0984e3']
        };
        
        const [color1, color2] = colors[obstacle.type] || colors.box;
        const gradient = this.ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        if (obstacle.type === 'spike') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y);
            this.ctx.lineTo(obstacle.x + obstacle.width*0.8, obstacle.y + obstacle.height*0.3);
            this.ctx.lineTo(obstacle.x + obstacle.width*0.2, obstacle.y + obstacle.height*0.3);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    drawCoin(coin) {
        this.ctx.save();
        this.ctx.translate(coin.x, coin.y);
        this.ctx.rotate(coin.rotation);
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.7, '#ffb347');
        gradient.addColorStop(1, '#ff8c00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('¥', 0, 5);
        
        this.ctx.restore();
    }
    
    drawPowerup(powerup) {
        this.ctx.save();
        this.ctx.translate(powerup.x, powerup.y + powerup.bobOffset);
        this.ctx.rotate(powerup.rotation);
        
        const colors = {
            shield: '#74b9ff',
            magnet: '#fd79a8',
            boost: '#55efc4',
            multiplier: '#fdcb6e'
        };
        
        const symbols = {
            shield: '🛡️',
            magnet: '🧲',
            boost: '⚡',
            multiplier: '✖️'
        };
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.radius);
        gradient.addColorStop(0, colors[powerup.type]);
        gradient.addColorStop(1, colors[powerup.type] + '80');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbols[powerup.type], 0, 7);
        
        this.ctx.restore();
    }
    
    drawPlayer() {
        this.ctx.save();
        
        if (this.player.invulnerable) {
            this.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.gameTime * 20);
        }
        
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.isSliding ? this.player.height * 0.5 : this.player.height;
        const actualY = this.player.isSliding ? y + this.player.height * 0.5 : y;
        
        if (this.player.shield.active) {
            const shieldGradient = this.ctx.createRadialGradient(x + w/2, actualY + h/2, 0, x + w/2, actualY + h/2, w);
            shieldGradient.addColorStop(0, 'rgba(116, 185, 255, 0.3)');
            shieldGradient.addColorStop(1, 'rgba(116, 185, 255, 0.8)');
            this.ctx.fillStyle = shieldGradient;
            this.ctx.fillRect(x - 10, actualY - 10, w + 20, h + 20);
        }
        
        const gradient = this.ctx.createLinearGradient(x, actualY, x, actualY + h);
        gradient.addColorStop(0, '#ff6b35');
        gradient.addColorStop(0.5, '#fd79a8');
        gradient.addColorStop(1, '#e84393');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, actualY, w, h);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, actualY, w, h);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + w*0.2, actualY + h*0.2, w*0.2, h*0.2);
        this.ctx.fillRect(x + w*0.6, actualY + h*0.2, w*0.2, h*0.2);
        
        if (!this.player.isSliding) {
            this.ctx.fillRect(x + w*0.3, actualY + h*0.6, w*0.4, h*0.1);
        }
        
        this.ctx.restore();
    }
    
    drawEffects() {
        this.effects.forEach(effect => {
            if (effect.type === 'score') {
                this.ctx.save();
                this.ctx.globalAlpha = effect.alpha;
                this.ctx.translate(effect.x, effect.y);
                this.ctx.scale(effect.scale, effect.scale);
                
                this.ctx.fillStyle = '#ffd700';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.strokeText(effect.text, 0, 0);
                this.ctx.fillText(effect.text, 0, 0);
                
                this.ctx.restore();
            }
        });
    }
    
    // 粒子效果系统
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= this.deltaTime;
            p.x += p.velocityX * this.deltaTime;
            p.y += p.velocityY * this.deltaTime;
            p.velocityY += p.gravity * this.deltaTime;
            p.alpha = p.life / p.maxLife;
            p.size *= 0.98;
            
            if (p.life <= 0 || p.size < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    renderParticles() {
        this.particleCtx.clearRect(0, 0, this.width, this.height);
        
        this.particles.forEach(p => {
            this.particleCtx.save();
            this.particleCtx.globalAlpha = p.alpha;
            this.particleCtx.fillStyle = p.color;
            this.particleCtx.beginPath();
            this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.particleCtx.fill();
            this.particleCtx.restore();
        });
    }
    
    createParticle(x, y, color, velocityX = 0, velocityY = 0, size = 3, life = 1) {
        if (this.particles.length >= this.maxParticles) return;
        
        this.particles.push({
            x, y, color, size,
            velocityX: velocityX + (Math.random() - 0.5) * 100,
            velocityY: velocityY + (Math.random() - 0.5) * 100,
            gravity: 500,
            life: life,
            maxLife: life,
            alpha: 1
        });
    }
    
    createJumpParticles() {
        const x = this.player.x + this.player.width / 2;
        const y = this.player.y + this.player.height;
        
        for (let i = 0; i < 8; i++) {
            this.createParticle(x, y, '#74b9ff', Math.random() * 200 - 100, -Math.random() * 200, 2 + Math.random() * 3, 0.8);
        }
    }
    
    createSlideParticles() {
        const x = this.player.x + this.player.width;
        const y = this.player.y + this.player.height;
        
        for (let i = 0; i < 6; i++) {
            this.createParticle(x, y, '#fd79a8', -Math.random() * 150, -Math.random() * 100, 2 + Math.random() * 2, 0.6);
        }
    }
    
    createCoinParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            this.createParticle(x, y, '#ffd700', Math.random() * 300 - 150, -Math.random() * 200, 2 + Math.random() * 3, 1.2);
        }
    }
    
    createPowerupParticles(x, y, type) {
        const colors = {
            shield: '#74b9ff',
            magnet: '#fd79a8',
            boost: '#55efc4',
            multiplier: '#fdcb6e'
        };
        
        for (let i = 0; i < 15; i++) {
            this.createParticle(x, y, colors[type], Math.random() * 400 - 200, -Math.random() * 300, 3 + Math.random() * 4, 1.5);
        }
    }
    
    createDamageParticles() {
        const x = this.player.x + this.player.width / 2;
        const y = this.player.y + this.player.height / 2;
        
        for (let i = 0; i < 20; i++) {
            this.createParticle(x, y, '#ff6b6b', Math.random() * 400 - 200, -Math.random() * 300, 3 + Math.random() * 4, 1.0);
        }
    }
    
    createShieldParticles() {
        const x = this.player.x + this.player.width / 2;
        const y = this.player.y + this.player.height / 2;
        
        for (let i = 0; i < 10; i++) {
            this.createParticle(x, y, '#74b9ff', Math.random() * 300 - 150, -Math.random() * 200, 4 + Math.random() * 3, 0.8);
        }
    }
    
    createExplosionParticles(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 200 + Math.random() * 200;
            this.createParticle(
                x, y, 
                ['#ff6b6b', '#ff8e53', '#ff6348'][Math.floor(Math.random() * 3)],
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                4 + Math.random() * 6,
                1.5
            );
        }
    }
    
    // 音效系统
    playSound(frequency, duration) {
        if (!this.audio.context || !this.audio.enabled) return;
        
        try {
            const oscillator = this.audio.context.createOscillator();
            const gainNode = this.audio.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audio.context.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audio.context.currentTime);
            gainNode.gain.setValueAtTime(this.audio.volume, this.audio.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + duration);
            
            oscillator.start(this.audio.context.currentTime);
            oscillator.stop(this.audio.context.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }
    
    // 屏幕震动效果
    screenShake() {
        const canvas = this.canvas;
        const originalTransform = canvas.style.transform;
        
        let shakeIntensity = 10;
        let shakeTime = 0.3;
        
        const shake = () => {
            if (shakeTime > 0) {
                const x = (Math.random() - 0.5) * shakeIntensity;
                const y = (Math.random() - 0.5) * shakeIntensity;
                canvas.style.transform = `translate(${x}px, ${y}px)`;
                
                shakeTime -= 0.016;
                shakeIntensity *= 0.9;
                requestAnimationFrame(shake);
            } else {
                canvas.style.transform = originalTransform;
            }
        };
        
        shake();
    }
    
    // 商店系统
    initShopUI() {
        const skinsGrid = document.getElementById('skinsGrid');
        const skins = [
            { id: 'default', name: '默认', price: 0, color: '#ff6b35' },
            { id: 'blue', name: '蓝色', price: 500, color: '#3b82f6' },
            { id: 'green', name: '绿色', price: 800, color: '#00ff88' },
            { id: 'purple', name: '紫色', price: 1200, color: '#8b5cf6' },
            { id: 'gold', name: '黄金', price: 2000, color: '#ffd700' }
        ];
        
        skinsGrid.innerHTML = '';
        skins.forEach(skin => {
            const skinElement = document.createElement('div');
            skinElement.className = 'skin-item';
            if (this.unlockedSkins.includes(skin.id)) {
                skinElement.classList.add('unlocked');
            }
            if (this.currentSkin === skin.id) {
                skinElement.classList.add('selected');
            }
            
            skinElement.innerHTML = `
                <div class="skin-preview" style="background: ${skin.color}"></div>
                <div class="skin-name">${skin.name}</div>
                <div class="skin-price">${skin.price === 0 ? '免费' : skin.price + '金币'}</div>
            `;
            
            skinElement.addEventListener('click', () => this.selectSkin(skin));
            skinsGrid.appendChild(skinElement);
        });
        
        document.getElementById('shop-currency').textContent = this.currency;
    }
    
    selectSkin(skin) {
        if (this.unlockedSkins.includes(skin.id)) {
            this.currentSkin = skin.id;
            localStorage.setItem('parkour_current_skin', skin.id);
            this.initShopUI();
        } else if (this.currency >= skin.price) {
            this.currency -= skin.price;
            this.unlockedSkins.push(skin.id);
            this.currentSkin = skin.id;
            localStorage.setItem('parkour_currency', this.currency);
            localStorage.setItem('parkour_unlocked_skins', JSON.stringify(this.unlockedSkins));
            localStorage.setItem('parkour_current_skin', skin.id);
            this.initShopUI();
        }
    }
    
    // 成就系统
    initAchievements() {
        const saved = localStorage.getItem('parkour_achievements');
        if (saved) {
            return JSON.parse(saved);
        }
        
        return [
            { id: 'first_run', name: '首次奔跑', desc: '完成第一次游戏', progress: 0, target: 1, reward: 100, unlocked: false },
            { id: 'coin_collector', name: '金币收集者', desc: '收集100枚金币', progress: 0, target: 100, reward: 200, unlocked: false },
            { id: 'distance_runner', name: '长跑健将', desc: '单次跑步1000米', progress: 0, target: 1000, reward: 300, unlocked: false },
            { id: 'score_master', name: '得分大师', desc: '单次得分10000分', progress: 0, target: 10000, reward: 500, unlocked: false },
            { id: 'survivor', name: '生存专家', desc: '单次游戏无伤害', progress: 0, target: 1, reward: 400, unlocked: false }
        ];
    }
    
    initAchievementsUI() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        achievementsGrid.innerHTML = '';
        
        this.achievements.forEach(achievement => {
            const achievementElement = document.createElement('div');
            achievementElement.className = 'achievement-item';
            if (achievement.unlocked) {
                achievementElement.classList.add('unlocked');
            }
            
            const progressPercent = Math.min(100, (achievement.progress / achievement.target) * 100);
            
            achievementElement.innerHTML = `
                <div class="achievement-icon">${achievement.unlocked ? '🏆' : '🔒'}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.desc}</div>
                    <div class="achievement-progress">${achievement.progress}/${achievement.target} (${progressPercent.toFixed(0)}%)</div>
                </div>
                <div class="achievement-reward">${achievement.reward}💰</div>
            `;
            
            achievementsGrid.appendChild(achievementElement);
        });
    }
    
    checkAchievements() {
        let newUnlocks = false;
        
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked) {
                switch (achievement.id) {
                    case 'first_run':
                        achievement.progress = 1;
                        break;
                    case 'coin_collector':
                        achievement.progress = this.coinsCollected;
                        break;
                    case 'distance_runner':
                        achievement.progress = Math.max(achievement.progress, Math.floor(this.world.distance / 100));
                        break;
                    case 'score_master':
                        achievement.progress = Math.max(achievement.progress, Math.floor(this.score));
                        break;
                }
                
                if (achievement.progress >= achievement.target) {
                    achievement.unlocked = true;
                    this.currency += achievement.reward;
                    newUnlocks = true;
                    this.showAchievementNotification(achievement);
                }
            }
        });
        
        if (newUnlocks) {
            localStorage.setItem('parkour_currency', this.currency);
            localStorage.setItem('parkour_achievements', JSON.stringify(this.achievements));
        }
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🏆</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">成就解锁！</div>
            <div style="font-size: 14px; margin-bottom: 10px;">${achievement.name}</div>
            <div style="font-size: 12px; color: #fdcb6e;">+${achievement.reward} 金币</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Combo系统
    addCombo() {
        this.combo++;
        this.comboTimer = 3.0; // 3秒内不收集就重置
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // 每5连击增加倍数
        this.comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.2;
        
        // 显示Combo特效
        if (this.combo % 5 === 0 && this.combo > 0) {
            this.showComboEffect();
        }
    }
    
    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
    }
    
    showComboEffect() {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.innerHTML = `
            <div style="font-size: 20px; color: #ff6b35; font-weight: bold;">
                ${this.combo} 连击！
            </div>
            <div style="font-size: 14px; margin-top: 5px;">
                得分倍数 x${this.comboMultiplier.toFixed(1)}
            </div>
        `;
        
        document.body.appendChild(notification);
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 1500);
    }
    
    // 每日挑战系统
    initDailyChallenge() {
        const today = new Date().toDateString();
        const savedChallenge = localStorage.getItem('parkour_daily_challenge');
        const savedDate = localStorage.getItem('parkour_daily_date');
        
        if (savedDate !== today || !savedChallenge) {
            // 生成新的每日挑战
            this.dailyChallenge = this.generateDailyChallenge();
            localStorage.setItem('parkour_daily_challenge', JSON.stringify(this.dailyChallenge));
            localStorage.setItem('parkour_daily_date', today);
        } else {
            this.dailyChallenge = JSON.parse(savedChallenge);
        }
        
        this.updateDailyChallengeUI();
    }
    
    generateDailyChallenge() {
        const challenges = [
            { type: 'distance', target: 500, desc: '跑步500米', reward: 100 },
            { type: 'coins', target: 50, desc: '收集50枚金币', reward: 150 },
            { type: 'combo', target: 10, desc: '达成10连击', reward: 200 },
            { type: 'score', target: 5000, desc: '得分5000分', reward: 250 },
            { type: 'survival', target: 300, desc: '生存300秒', reward: 300 }
        ];
        
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];
        return {
            ...challenge,
            progress: 0,
            completed: false
        };
    }
    
    updateDailyChallengeUI() {
        document.getElementById('daily-challenge-desc').textContent = this.dailyChallenge.desc;
        const progressPercent = Math.min(100, (this.dailyChallenge.progress / this.dailyChallenge.target) * 100);
        document.getElementById('daily-progress-fill').style.width = progressPercent + '%';
        document.getElementById('daily-progress-text').textContent = 
            `${this.dailyChallenge.progress}/${this.dailyChallenge.target}`;
    }
    
    updateDailyChallenge() {
        if (this.dailyChallenge.completed) return;
        
        switch (this.dailyChallenge.type) {
            case 'distance':
                this.dailyChallenge.progress = Math.max(this.dailyChallenge.progress, 
                    Math.floor(this.world.distance / 100));
                break;
            case 'coins':
                this.dailyChallenge.progress = this.coinsCollected;
                break;
            case 'combo':
                this.dailyChallenge.progress = Math.max(this.dailyChallenge.progress, this.combo);
                break;
            case 'score':
                this.dailyChallenge.progress = Math.max(this.dailyChallenge.progress, 
                    Math.floor(this.score));
                break;
            case 'survival':
                this.dailyChallenge.progress = Math.max(this.dailyChallenge.progress, 
                    Math.floor(this.gameTime));
                break;
        }
        
        if (this.dailyChallenge.progress >= this.dailyChallenge.target && !this.dailyChallenge.completed) {
            this.dailyChallenge.completed = true;
            this.currency += this.dailyChallenge.reward;
            localStorage.setItem('parkour_currency', this.currency);
            localStorage.setItem('parkour_daily_challenge', JSON.stringify(this.dailyChallenge));
            
            this.showDailyChallengeComplete();
        }
        
        this.updateDailyChallengeUI();
    }
    
    showDailyChallengeComplete() {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🎆</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">每日挑战完成！</div>
            <div style="font-size: 14px; margin-bottom: 10px;">${this.dailyChallenge.desc}</div>
            <div style="font-size: 12px; color: #fdcb6e;">+${this.dailyChallenge.reward} 金币</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // 环境系统
    initEnvironments() {
        this.environments = [
            {
                name: '城市夜景',
                colors: {
                    sky: ['#0f0f23', '#1a1a2e', '#16213e'],
                    mountains: ['#0e1622', '#1a2332', '#243042'],
                    ground: ['#2a3f5f', '#1a2332']
                },
                particles: 'none'
            },
            {
                name: '沙漠黄昏',
                colors: {
                    sky: ['#2d1810', '#4a2c1a', '#6b3e1f'],
                    mountains: ['#3d2818', '#5a3f2a', '#7a5540'],
                    ground: ['#8b6f47', '#6b5537']
                },
                particles: 'sand'
            },
            {
                name: '极地晨曦',
                colors: {
                    sky: ['#1a2332', '#2a3f5f', '#3a5f7f'],
                    mountains: ['#2a3f5f', '#3a5f7f', '#4a7f9f'],
                    ground: ['#ffffff', '#e0f0ff']
                },
                particles: 'snow'
            }
        ];
        
        this.currentEnvironment = 0;
        this.environmentTimer = 0;
        this.environmentDuration = 30; // 30秒切换一次
    }
    
    updateEnvironment() {
        this.environmentTimer += this.deltaTime;
        
        if (this.environmentTimer >= this.environmentDuration) {
            this.currentEnvironment = (this.currentEnvironment + 1) % this.environments.length;
            this.environmentTimer = 0;
            this.showEnvironmentChange();
        }
        
        // 更新环境指示器
        const indicator = document.getElementById('environmentIndicator');
        const envName = document.getElementById('currentEnvName');
        const timerFill = document.getElementById('envTimerFill');
        
        if (indicator && envName && timerFill) {
            indicator.classList.add('show');
            envName.textContent = this.environments[this.currentEnvironment].name;
            const progress = (this.environmentTimer / this.environmentDuration) * 100;
            timerFill.style.width = progress + '%';
        }
    }
    
    showEnvironmentChange() {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.innerHTML = `
            <div style="font-size: 18px; color: #00ff88; font-weight: bold;">
                环境变化
            </div>
            <div style="font-size: 14px; margin-top: 5px;">
                ${this.environments[this.currentEnvironment].name}
            </div>
        `;
        
        document.body.appendChild(notification);
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
    
    // 时间缓慢特效
    activateSlowMotion(duration = 0.5) {
        this.slowMotionActive = true;
        this.slowMotionTimer = duration;
        this.timeScale = 0.3;
    }
    
    updateSlowMotion() {
        if (this.slowMotionActive) {
            this.slowMotionTimer -= this.deltaTime;
            if (this.slowMotionTimer <= 0) {
                this.slowMotionActive = false;
                this.timeScale = 1.0;
            }
        }
    }
}

// Part 6: Game Initialization and Event Handlers
let game;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        canvas.width = containerRect.width;
        canvas.height = containerRect.height;
        
        if (game) {
            game.width = canvas.width;
            game.height = canvas.height;
            game.canvas = canvas;
            game.ctx = ctx;
        }
    };
    
    // Initial resize
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Create game instance
    game = new ParkourGame(canvas, ctx);
    
    // Keyboard event listeners
    document.addEventListener('keydown', (e) => {
        if (game) {
            game.handleKeyDown(e);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (game) {
            game.handleKeyUp(e);
        }
    });
    
    // Touch event listeners for mobile
    canvas.addEventListener('touchstart', (e) => {
        if (game) {
            game.handleTouch(e);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        if (game) {
            game.handleTouchEnd(e);
        }
    }, { passive: false });
    
    // Mouse event listeners (for desktop testing)
    canvas.addEventListener('mousedown', (e) => {
        if (game) {
            const rect = canvas.getBoundingClientRect();
            const touch = {
                clientY: e.clientY - rect.top
            };
            game.handleTouch({ touches: [touch], preventDefault: () => {} });
        }
    });
    
    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Handle visibility change (pause when tab is not visible)
    document.addEventListener('visibilitychange', () => {
        if (game && document.hidden && game.state === game.STATES.PLAYING) {
            game.togglePause();
        }
    });
    
    // Start the game
    game.init();
});

// Prevent scrolling on mobile
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);
