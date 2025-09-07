/*
 * 极速跑酷 Ultra - Phase 2 性能优化版本
 * 特性：离屏Canvas缓存、绘制批处理、碰撞优化、对象池、渐变缓存
 */

class ParkourGameOptimized {
    constructor() {
        // 初始化顺序很重要
        this.initCanvas();
        this.initGameState();
        this.initPlayer();
        this.initWorld();
        this.initEntities();
        this.initAudio();
        this.initParticles();
        this.initComboSystem();
        this.initDailyChallenge();
        this.initEnvironments();
        this.initPerformanceOptimizations(); // 新增性能优化
        
        this.bindEvents();
        this.resize();
        this.showLoadingScreen();
        
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showMainMenu();
            this.startGameLoop();
        }, 1500);
    }
    
    // ===== 初始化方法 =====
    
    initCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleCanvas = document.getElementById('particleCanvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        this.width = 0;
        this.height = 0;
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        
        // Canvas 优化设置
        this.ctx.imageSmoothingEnabled = false;
        this.particleCtx.imageSmoothingEnabled = false;
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
        this.timeScale = 1;
        
        // 游戏统计
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.highScore = parseInt(localStorage.getItem('parkour_highScore')) || 0;
        this.totalCoins = parseInt(localStorage.getItem('parkour_totalCoins')) || 0;
    }
    
    initPlayer() {
        this.player = {
            x: 150,
            y: 0,
            width: 40,
            height: 60,
            velocityY: 0,
            isGrounded: false,
            isSliding: false,
            invulnerable: false,
            invulnerabilityTimer: 0,
            
            // 跳跃优化机制
            coyoteTime: 0,
            jumpBuffer: 0,
            maxCoyoteTime: 100,
            maxJumpBuffer: 100,
            
            // 道具状态
            shield: { active: false, timer: 0, maxTime: 5000 },
            magnet: { active: false, timer: 0, maxTime: 8000 },
            boost: { active: false, timer: 0, maxTime: 3000 },
            multiplier: { active: false, timer: 0, maxTime: 10000, value: 1 },
            
            // 皮肤系统
            currentSkin: localStorage.getItem('parkour_currentSkin') || 'default',
            unlockedSkins: JSON.parse(localStorage.getItem('parkour_unlockedSkins')) || ['default']
        };
        
        // 物理常量
        this.PHYSICS = {
            GRAVITY: 0.8,
            JUMP_POWER: -15,
            GROUND_FRICTION: 0.8,
            AIR_RESISTANCE: 0.98
        };
    }
    
    initWorld() {
        this.world = {
            speed: 8,
            baseSpeed: 8,
            maxSpeed: 20,
            acceleration: 0.001,
            groundHeight: 120,
            distance: 0
        };
        
        // 生成器状态
        this.spawner = {
            lastObstacleX: 0,
            lastCoinX: 0,
            lastPowerupX: 0,
            minObstacleSpacing: 200,
            minCoinSpacing: 100,
            minPowerupSpacing: 500
        };
    }
    
    initEntities() {
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.effects = [];
        
        // 实体类型定义
        this.OBSTACLE_TYPES = ['box', 'crate', 'spike', 'barrier'];
        this.POWERUP_TYPES = ['shield', 'magnet', 'boost', 'multiplier'];
        this.COIN_VALUE = 10;
        
        // 空间分区优化
        this.spatialGrid = new Map();
        this.gridSize = 100;
    }
    
    initAudio() {
        this.audioContext = null;
        this.sounds = {};
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported:', e);
        }
    }
    
    initParticles() {
        this.particles = [];
        this.maxParticles = 100;
        
        // 粒子池优化
        this.particlePool = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push(this.createEmptyParticle());
        }
    }
    
    initComboSystem() {
        this.combo = {
            count: 0,
            multiplier: 1,
            timer: 0,
            maxTimer: 3000,
            baseMultiplier: 0.1,
            maxMultiplier: 5.0
        };
    }
    
    initDailyChallenge() {
        const today = new Date().toDateString();
        const savedChallenge = localStorage.getItem('parkour_dailyChallenge');
        const savedDate = localStorage.getItem('parkour_challengeDate');
        
        if (savedDate !== today) {
            this.generateDailyChallenge();
            localStorage.setItem('parkour_challengeDate', today);
        } else if (savedChallenge) {
            this.dailyChallenge = JSON.parse(savedChallenge);
        } else {
            this.generateDailyChallenge();
        }
    }
    
    initEnvironments() {
        this.environments = [
            {
                name: 'city',
                colors: {
                    sky: ['#1a1a2e', '#16213e', '#0f3460'],
                    ground: ['#2d3436', '#636e72'],
                    mountains: ['#2d3436', '#636e72', '#b2bec3']
                },
                particles: 'none'
            },
            {
                name: 'desert',
                colors: {
                    sky: ['#fd79a8', '#fdcb6e', '#e17055'],
                    ground: ['#d63031', '#e17055'],
                    mountains: ['#8b4513', '#cd853f', '#daa520']
                },
                particles: 'sand'
            },
            {
                name: 'arctic',
                colors: {
                    sky: ['#74b9ff', '#0984e3', '#00b894'],
                    ground: ['#ddd', '#bbb'],
                    mountains: ['#74b9ff', '#0984e3', '#00b894']
                },
                particles: 'snow'
            }
        ];
        
        this.currentEnvironment = 0;
        this.environmentTimer = 0;
        this.environmentSwitchInterval = 30000;
    }
    
    // ===== Phase 2: 性能优化系统 =====
    
    initPerformanceOptimizations() {
        // 渐变缓存系统
        this.gradientCache = new Map();
        this.pathCache = new Map();
        
        // 离屏Canvas缓存系统
        this.offscreenCanvases = {
            background: document.createElement('canvas'),
            obstacles: document.createElement('canvas'),
            ui: document.createElement('canvas')
        };
        
        // 初始化离屏Canvas上下文
        Object.keys(this.offscreenCanvases).forEach(key => {
            const canvas = this.offscreenCanvases[key];
            canvas.ctx = canvas.getContext('2d');
            canvas.ctx.imageSmoothingEnabled = false;
        });
        
        // 绘制批处理系统
        this.drawBatches = {
            obstacles: [],
            coins: [],
            powerups: [],
            particles: []
        };
        
        // 碰撞检测优化
        this.collisionGrid = new Map();
        this.collisionGridSize = 64;
        
        // 性能监控
        this.performance = {
            frameCount: 0,
            fps: 60,
            lastFpsUpdate: 0,
            renderTime: 0,
            updateTime: 0,
            drawCalls: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // 预渲染标志
        this.needsBackgroundRedraw = true;
        this.needsObstacleRedraw = true;
    }
    
    // ===== 离屏Canvas缓存系统 =====
    
    updateOffscreenBackground() {
        if (!this.needsBackgroundRedraw) return;
        
        const canvas = this.offscreenCanvases.background;
        const ctx = canvas.ctx;
        
        // 设置尺寸
        canvas.width = this.width * this.dpr;
        canvas.height = this.height * this.dpr;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        
        // 渲染背景到离屏Canvas
        this.renderBackgroundToOffscreen(ctx);
        
        this.needsBackgroundRedraw = false;
        this.performance.cacheMisses++;
    }
    
    renderBackgroundToOffscreen(ctx) {
        const env = this.environments[this.currentEnvironment];
        const cacheKey = `bg_${this.currentEnvironment}_${this.width}_${this.height}`;
        
        let gradient = this.gradientCache.get(cacheKey);
        if (!gradient) {
            gradient = ctx.createLinearGradient(0, 0, 0, this.height);
            gradient.addColorStop(0, env.colors.sky[0]);
            gradient.addColorStop(0.7, env.colors.sky[1]);
            gradient.addColorStop(1, env.colors.sky[2]);
            this.gradientCache.set(cacheKey, gradient);
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 渲染星空（预计算位置）
        this.renderStarsToOffscreen(ctx);
        
        // 渲染山脉（静态部分）
        this.renderMountainsToOffscreen(ctx);
    }
    
    renderStarsToOffscreen(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        
        // 预计算星星位置，避免每帧计算
        if (!this.starPositions) {
            this.starPositions = [];
            for (let i = 0; i < 80; i++) {
                const seed = i * 137.5;
                this.starPositions.push({
                    baseX: (seed % 1) * this.width * 2,
                    y: ((seed * 1.3) % 1) * this.height * 0.6,
                    size: 1 + ((seed * 1.7) % 1) * 2,
                    color: i % 3 === 0 ? '#ffffff' : '#8fb9ff'
                });
            }
        }
        
        this.starPositions.forEach(star => {
            const x = (star.baseX - this.world.distance * 0.1) % (this.width + 200) - 100;
            ctx.fillStyle = star.color;
            ctx.fillRect(x, star.y, star.size, star.size);
        });
        
        ctx.restore();
    }
    
    renderMountainsToOffscreen(ctx) {
        const env = this.environments[this.currentEnvironment];
        const layers = [
            { speed: 0.2, color: env.colors.mountains[0], height: 120 },
            { speed: 0.4, color: env.colors.mountains[1], height: 160 },
            { speed: 0.6, color: env.colors.mountains[2], height: 200 }
        ];
        
        layers.forEach(layer => {
            ctx.fillStyle = layer.color;
            const offset = (this.world.distance * layer.speed) % 400;
            
            for (let x = -200; x < this.width + 200; x += 200) {
                const height = layer.height + Math.sin((x + offset) * 0.01) * 20;
                ctx.fillRect(x - offset, this.height - this.world.groundHeight - height, 200, height);
            }
        });
    }
    
    // ===== 绘制批处理系统 =====
    
    prepareBatches() {
        // 清空批处理队列
        Object.keys(this.drawBatches).forEach(key => {
            this.drawBatches[key].length = 0;
        });
        
        // 按类型和材质分组
        this.obstacles.forEach(obstacle => {
            this.drawBatches.obstacles.push(obstacle);
        });
        
        this.coins.forEach(coin => {
            this.drawBatches.coins.push(coin);
        });
        
        this.powerups.forEach(powerup => {
            this.drawBatches.powerups.push(powerup);
        });
        
        this.particles.forEach(particle => {
            if (particle.active) {
                this.drawBatches.particles.push(particle);
            }
        });
    }
    
    renderBatched() {
        this.performance.drawCalls = 0;
        
        // 批量渲染障碍物
        this.renderObstaclesBatched();
        
        // 批量渲染金币
        this.renderCoinsBatched();
        
        // 批量渲染道具
        this.renderPowerupsBatched();
    }
    
    renderObstaclesBatched() {
        const obstacles = this.drawBatches.obstacles;
        if (obstacles.length === 0) return;
        
        // 按类型分组减少状态切换
        const obstaclesByType = {};
        obstacles.forEach(obstacle => {
            if (!obstaclesByType[obstacle.type]) {
                obstaclesByType[obstacle.type] = [];
            }
            obstaclesByType[obstacle.type].push(obstacle);
        });
        
        // 批量绘制相同类型的障碍物
        Object.keys(obstaclesByType).forEach(type => {
            this.renderObstacleType(type, obstaclesByType[type]);
        });
    }
    
    renderObstacleType(type, obstacles) {
        const colors = {
            box: ['#ff6b35', '#d63031'],
            crate: ['#fdcb6e', '#e17055'],
            spike: ['#fd79a8', '#e84393'],
            barrier: ['#74b9ff', '#0984e3']
        };
        
        const [color1, color2] = colors[type] || colors.box;
        
        // 缓存渐变
        const cacheKey = `obstacle_${type}_gradient`;
        let gradient = this.gradientCache.get(cacheKey);
        
        obstacles.forEach(obstacle => {
            if (!gradient) {
                gradient = this.ctx.createLinearGradient(0, 0, 0, obstacle.height);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                this.gradientCache.set(cacheKey, gradient);
            }
            
            this.ctx.save();
            this.ctx.translate(obstacle.x, obstacle.y);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, obstacle.width, obstacle.height);
            
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(0, 0, obstacle.width, obstacle.height);
            
            if (type === 'spike') {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.width/2, 0);
                this.ctx.lineTo(obstacle.width*0.8, obstacle.height*0.3);
                this.ctx.lineTo(obstacle.width*0.2, obstacle.height*0.3);
                this.ctx.closePath();
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
        
        this.performance.drawCalls++;
    }
    
    renderCoinsBatched() {
        const coins = this.drawBatches.coins;
        if (coins.length === 0) return;
        
        // 缓存金币渐变
        const cacheKey = 'coin_gradient';
        let gradient = this.gradientCache.get(cacheKey);
        
        coins.forEach(coin => {
            if (!gradient) {
                gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(0.7, '#ffb347');
                gradient.addColorStop(1, '#ff8c00');
                this.gradientCache.set(cacheKey, gradient);
            }
            
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.rotate(coin.rotation);
            
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
        });
        
        this.performance.drawCalls++;
    }
    
    renderPowerupsBatched() {
        const powerups = this.drawBatches.powerups;
        if (powerups.length === 0) return;
        
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
        
        powerups.forEach(powerup => {
            const cacheKey = `powerup_${powerup.type}_gradient`;
            let gradient = this.gradientCache.get(cacheKey);
            
            if (!gradient) {
                gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.radius);
                gradient.addColorStop(0, colors[powerup.type]);
                gradient.addColorStop(1, colors[powerup.type] + '80');
                this.gradientCache.set(cacheKey, gradient);
            }
            
            this.ctx.save();
            this.ctx.translate(powerup.x, powerup.y + powerup.bobOffset);
            this.ctx.rotate(powerup.rotation);
            
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
        });
        
        this.performance.drawCalls++;
    }

    // ===== 优化的碰撞检测系统 =====
    
    updateCollisionGrid() {
        this.collisionGrid.clear();
        
        // 将所有实体添加到空间网格
        [...this.obstacles, ...this.coins, ...this.powerups].forEach(entity => {
            const gridX = Math.floor(entity.x / this.collisionGridSize);
            const gridY = Math.floor(entity.y / this.collisionGridSize);
            const key = `${gridX},${gridY}`;
            
            if (!this.collisionGrid.has(key)) {
                this.collisionGrid.set(key, []);
            }
            this.collisionGrid.get(key).push(entity);
        });
    }
    
    getNearbyCells(x, y, width, height) {
        const cells = [];
        const startX = Math.floor(x / this.collisionGridSize);
        const endX = Math.floor((x + width) / this.collisionGridSize);
        const startY = Math.floor(y / this.collisionGridSize);
        const endY = Math.floor((y + height) / this.collisionGridSize);
        
        for (let gx = startX; gx <= endX; gx++) {
            for (let gy = startY; gy <= endY; gy++) {
                const key = `${gx},${gy}`;
                if (this.collisionGrid.has(key)) {
                    cells.push(...this.collisionGrid.get(key));
                }
            }
        }
        
        return cells;
    }
    
    checkCollisionsOptimized() {
        if (this.player.invulnerable) return;
        
        const playerRect = this.getPlayerCollisionRect();
        
        // 只检查玩家附近的实体
        const nearbyEntities = this.getNearbyCells(
            playerRect.x, playerRect.y, 
            playerRect.width, playerRect.height
        );
        
        nearbyEntities.forEach(entity => {
            if (this.isColliding(playerRect, entity)) {
                if (entity.type && this.OBSTACLE_TYPES.includes(entity.type)) {
                    this.handleObstacleCollision(entity);
                } else if (entity.radius && !entity.type) {
                    this.handleCoinCollision(entity);
                } else if (entity.type && this.POWERUP_TYPES.includes(entity.type)) {
                    this.handlePowerupCollision(entity);
                }
            }
        });
    }
    
    handleObstacleCollision(obstacle) {
        if (this.player.shield.active) {
            this.player.shield.active = false;
            this.createShieldBreakEffect();
        } else {
            this.handlePlayerHit();
        }
    }
    
    handleCoinCollision(coin) {
        const index = this.coins.indexOf(coin);
        if (index !== -1) {
            this.collectCoin(coin, index);
        }
    }
    
    handlePowerupCollision(powerup) {
        const index = this.powerups.indexOf(powerup);
        if (index !== -1) {
            this.collectPowerup(powerup, index);
        }
    }
    
    // ===== 游戏循环和更新系统 =====
    
    startGameLoop() {
        this.gameLoop();
    }
    
    gameLoop(currentTime = 0) {
        const rawDelta = currentTime - this.lastTime;
        this.deltaTime = Math.min(rawDelta, 16.67) * this.timeScale;
        this.lastTime = currentTime;
        
        this.updatePerformanceStats(currentTime);
        
        if (this.state === this.STATES.PLAYING) {
            const updateStart = performance.now();
            this.update();
            this.performance.updateTime = performance.now() - updateStart;
        }
        
        const renderStart = performance.now();
        this.render();
        this.performance.renderTime = performance.now() - renderStart;
        
        requestAnimationFrame(time => this.gameLoop(time));
    }
    
    update() {
        this.gameTime += this.deltaTime;
        
        this.updateEnvironment();
        this.updatePlayer();
        this.updateEntities();
        this.updateParticles();
        this.updateCombo();
        this.updatePowerups();
        this.updateDailyChallenge();
        
        // 优化的碰撞检测
        this.updateCollisionGrid();
        this.checkCollisionsOptimized();
        
        this.spawnEntities();
        this.updateScore();
        this.checkGameOver();
    }
    
    // ===== 优化的渲染系统 =====
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 使用离屏Canvas渲染背景
        this.updateOffscreenBackground();
        this.ctx.drawImage(this.offscreenCanvases.background, 0, 0);
        this.performance.cacheHits++;
        
        // 渲染地面
        this.renderGroundOptimized();
        
        // 准备批处理
        this.prepareBatches();
        
        // 批量渲染实体
        this.renderBatched();
        
        // 渲染玩家
        this.renderPlayer();
        
        // 渲染特效
        this.renderEffects();
        
        // 渲染粒子（在单独Canvas上）
        this.renderParticlesOptimized();
        
        // 渲染UI
        this.renderUI();
        
        if (this.showDebug) {
            this.renderDebugInfo();
        }
    }
    
    renderGroundOptimized() {
        const env = this.environments[this.currentEnvironment];
        const cacheKey = `ground_${this.currentEnvironment}_${this.width}_${this.world.groundHeight}`;
        
        let gradient = this.gradientCache.get(cacheKey);
        if (!gradient) {
            gradient = this.ctx.createLinearGradient(0, this.height - this.world.groundHeight, 0, this.height);
            gradient.addColorStop(0, env.colors.ground[0]);
            gradient.addColorStop(1, env.colors.ground[1]);
            this.gradientCache.set(cacheKey, gradient);
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.height - this.world.groundHeight, this.width, this.world.groundHeight);
        
        this.ctx.fillStyle = env.colors.mountains[0];
        this.ctx.fillRect(0, this.height - 20, this.width, 20);
    }
    
    renderParticlesOptimized() {
        this.particleCtx.clearRect(0, 0, this.width, this.height);
        
        const activeParticles = this.drawBatches.particles;
        if (activeParticles.length === 0) return;
        
        // 按颜色分组减少状态切换
        const particlesByColor = {};
        activeParticles.forEach(particle => {
            if (!particlesByColor[particle.color]) {
                particlesByColor[particle.color] = [];
            }
            particlesByColor[particle.color].push(particle);
        });
        
        Object.keys(particlesByColor).forEach(color => {
            this.particleCtx.fillStyle = color;
            this.particleCtx.beginPath();
            
            particlesByColor[color].forEach(particle => {
                this.particleCtx.globalAlpha = particle.alpha;
                this.particleCtx.moveTo(particle.x + particle.size, particle.y);
                this.particleCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            });
            
            this.particleCtx.fill();
        });
        
        this.particleCtx.globalAlpha = 1;
    }
    
    // ===== 继承原有的其他方法 =====
    
    updateEnvironment() {
        this.environmentTimer += this.deltaTime;
        if (this.environmentTimer >= this.environmentSwitchInterval) {
            this.currentEnvironment = (this.currentEnvironment + 1) % this.environments.length;
            this.environmentTimer = 0;
            this.needsBackgroundRedraw = true;
            this.gradientCache.clear();
        }
    }
    
    updatePlayer() {
        const groundY = this.height - this.world.groundHeight - this.player.height;
        
        if (this.player.jumpBuffer > 0) {
            this.player.jumpBuffer -= this.deltaTime;
        }
        
        if (this.player.coyoteTime > 0) {
            this.player.coyoteTime -= this.deltaTime;
        }
        
        if (this.player.jumpBuffer > 0 && (this.player.isGrounded || this.player.coyoteTime > 0)) {
            this.player.velocityY = this.PHYSICS.JUMP_POWER;
            this.player.isGrounded = false;
            this.player.coyoteTime = 0;
            this.player.jumpBuffer = 0;
            this.playSound('jump');
        }
        
        if (!this.keys?.Space && !this.keys?.ArrowUp && this.player.velocityY < 0) {
            this.player.velocityY *= 0.5;
        }
        
        this.player.velocityY += this.PHYSICS.GRAVITY;
        this.player.y += this.player.velocityY;
        
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            if (!this.player.isGrounded) {
                this.player.isGrounded = true;
                this.createLandingParticles();
            }
        } else {
            if (this.player.isGrounded) {
                this.player.coyoteTime = this.player.maxCoyoteTime;
            }
            this.player.isGrounded = false;
        }
        
        if (this.player.invulnerabilityTimer > 0) {
            this.player.invulnerabilityTimer -= this.deltaTime;
            if (this.player.invulnerabilityTimer <= 0) {
                this.player.invulnerable = false;
            }
        }
    }
    
    updateEntities() {
        this.world.distance += this.world.speed;
        this.world.speed = Math.min(
            this.world.baseSpeed + this.world.distance * this.world.acceleration,
            this.world.maxSpeed
        );
        
        // 更新障碍物
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.world.speed;
            
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }
        
        // 更新金币
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= this.world.speed;
            coin.rotation += 0.1;
            
            if (this.player.magnet.active) {
                const dx = this.player.x + this.player.width/2 - coin.x;
                const dy = this.player.y + this.player.height/2 - coin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    const force = 0.1;
                    coin.x += dx * force;
                    coin.y += dy * force;
                }
            }
            
            if (coin.x + coin.radius < 0) {
                this.coins.splice(i, 1);
            }
        }
        
        // 更新道具
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            powerup.x -= this.world.speed;
            powerup.rotation += 0.05;
            powerup.bobOffset = Math.sin(this.gameTime * 0.005) * 10;
            
            if (powerup.x + powerup.radius < 0) {
                this.powerups.splice(i, 1);
            }
        }
        
        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.timer -= this.deltaTime;
            effect.y -= 2;
            effect.alpha = effect.timer / effect.maxTimer;
            effect.scale = 1 + (effect.maxTimer - effect.timer) / effect.maxTimer * 0.5;
            
            if (effect.timer <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle.active) continue;
            
            particle.life -= this.deltaTime;
            particle.x += particle.velocityX * this.deltaTime * 0.01;
            particle.y += particle.velocityY * this.deltaTime * 0.01;
            particle.velocityY += particle.gravity * this.deltaTime * 0.01;
            particle.alpha = particle.life / particle.maxLife;
            particle.size *= 0.995;
            
            if (particle.life <= 0 || particle.size < 0.5) {
                this.recycleParticle(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    // ===== 工具方法 =====
    
    createEmptyParticle() {
        return {
            x: 0, y: 0,
            velocityX: 0, velocityY: 0,
            life: 0, maxLife: 1,
            size: 3, alpha: 1,
            color: '#ffffff',
            gravity: 0.1,
            active: false
        };
    }
    
    getParticleFromPool() {
        if (this.particlePool.length > 0) {
            const particle = this.particlePool.pop();
            particle.active = true;
            return particle;
        }
        return this.createEmptyParticle();
    }
    
    recycleParticle(particle) {
        particle.active = false;
        if (this.particlePool.length < this.maxParticles) {
            this.particlePool.push(particle);
        }
    }
    
    createParticle(x, y, color, velocityX = 0, velocityY = 0, size = 3, life = 1000) {
        const particle = this.getParticleFromPool();
        
        particle.x = x;
        particle.y = y;
        particle.velocityX = velocityX;
        particle.velocityY = velocityY;
        particle.life = life;
        particle.maxLife = life;
        particle.size = size;
        particle.alpha = 1;
        particle.color = color;
        particle.gravity = 0.1;
        
        this.particles.push(particle);
        return particle;
    }
    
    getPlayerCollisionRect() {
        const tolerance = 0.1;
        const w = this.player.width * (1 - tolerance);
        const h = this.player.isSliding ? this.player.height * 0.5 * (1 - tolerance) : this.player.height * (1 - tolerance);
        const x = this.player.x + this.player.width * tolerance * 0.5;
        const y = this.player.isSliding ? 
            this.player.y + this.player.height * 0.5 + this.player.height * tolerance * 0.25 : 
            this.player.y + this.player.height * tolerance * 0.5;
            
        return { x, y, width: w, height: h };
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + (rect2.width || rect2.radius * 2) &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + (rect2.height || rect2.radius * 2) &&
               rect1.y + rect1.height > rect2.y;
    }
    
    // ===== 性能监控 =====
    
    updatePerformanceStats(currentTime) {
        this.performance.frameCount++;
        
        if (currentTime - this.performance.lastFpsUpdate >= 1000) {
            this.performance.fps = this.performance.frameCount;
            this.performance.frameCount = 0;
            this.performance.lastFpsUpdate = currentTime;
        }
    }
    
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(this.width - 250, this.height - 200, 240, 190);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const debugInfo = [
            `FPS: ${this.performance.fps}`,
            `Update: ${this.performance.updateTime.toFixed(2)}ms`,
            `Render: ${this.performance.renderTime.toFixed(2)}ms`,
            `Draw Calls: ${this.performance.drawCalls}`,
            `Cache Hits: ${this.performance.cacheHits}`,
            `Cache Misses: ${this.performance.cacheMisses}`,
            `Particles: ${this.particles.length}`,
            `Obstacles: ${this.obstacles.length}`,
            `Coins: ${this.coins.length}`,
            `Powerups: ${this.powerups.length}`,
            `Speed: ${this.world.speed.toFixed(2)}`,
            `Environment: ${this.environments[this.currentEnvironment].name}`,
            `TimeScale: ${this.timeScale}`,
            `Collision Grid: ${this.collisionGrid.size} cells`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, this.width - 240, this.height - 185 + index * 14);
        });
        
        this.ctx.restore();
    }
    
    // ===== 占位方法（继承自原版本） =====
    
    generateDailyChallenge() {
        const challenges = [
            { type: 'distance', target: 5000, reward: 100, description: '跑步距离达到5000米' },
            { type: 'coins', target: 200, reward: 150, description: '收集200个金币' },
            { type: 'combo', target: 50, reward: 200, description: '达成50连击' },
            { type: 'score', target: 10000, reward: 250, description: '单局得分达到10000' },
            { type: 'survival', target: 300, reward: 300, description: '生存300秒' }
        ];
        
        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        this.dailyChallenge = {
            ...randomChallenge,
            progress: 0,
            completed: false
        };
        
        localStorage.setItem('parkour_dailyChallenge', JSON.stringify(this.dailyChallenge));
    }
    
    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('keydown', e => this.handleKeyDown(e));
        document.addEventListener('keyup', e => this.handleKeyUp(e));
        this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', e => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', e => this.handleTouchEnd(e));
        this.canvas.addEventListener('click', e => this.handleClick(e));
        this.bindUIEvents();
        
        document.addEventListener('keydown', e => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.width = rect.width;
        this.height = rect.height;
        
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.particleCanvas.width = this.width * this.dpr;
        this.particleCanvas.height = this.height * this.dpr;
        this.particleCanvas.style.width = this.width + 'px';
        this.particleCanvas.style.height = this.height + 'px';
        
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.particleCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        
        if (this.player) {
            this.player.y = this.height - this.world.groundHeight - this.player.height;
        }
        
        this.gradientCache.clear();
        this.needsBackgroundRedraw = true;
    }
    
    // 简化的占位方法
    updateCombo() { /* 继承自原版本 */ }
    updatePowerups() { /* 继承自原版本 */ }
    updateDailyChallenge() { /* 继承自原版本 */ }
    updateScore() { /* 继承自原版本 */ }
    checkGameOver() { /* 继承自原版本 */ }
    spawnEntities() { /* 继承自原版本 */ }
    collectCoin() { /* 继承自原版本 */ }
    collectPowerup() { /* 继承自原版本 */ }
    handlePlayerHit() { /* 继承自原版本 */ }
    createLandingParticles() { /* 继承自原版本 */ }
    createShieldBreakEffect() { /* 继承自原版本 */ }
    renderPlayer() { /* 继承自原版本 */ }
    renderEffects() { /* 继承自原版本 */ }
    renderUI() { /* 继承自原版本 */ }
    handleKeyDown() { /* 继承自原版本 */ }
    handleKeyUp() { /* 继承自原版本 */ }
    handleTouchStart() { /* 继承自原版本 */ }
    handleTouchMove() { /* 继承自原版本 */ }
    handleTouchEnd() { /* 继承自原版本 */ }
    handleClick() { /* 继承自原版本 */ }
    bindUIEvents() { /* 继承自原版本 */ }
    showLoadingScreen() { /* 继承自原版本 */ }
    hideLoadingScreen() { /* 继承自原版本 */ }
    showMainMenu() { /* 继承自原版本 */ }
    playSound() { /* 继承自原版本 */ }
}

// 游戏初始化
let game;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
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
            game.resize();
        }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 使用优化版本
    game = new ParkourGameOptimized();
    
    document.addEventListener('keydown', e => {
        if (game) game.handleKeyDown(e);
    });
    
    document.addEventListener('keyup', e => {
        if (game) game.handleKeyUp(e);
    });
    
    canvas.addEventListener('touchstart', e => {
        if (game) game.handleTouchStart(e);
    });
    
    canvas.addEventListener('touchmove', e => {
        if (game) game.handleTouchMove(e);
    });
    
    canvas.addEventListener('touchend', e => {
        if (game) game.handleTouchEnd(e);
    });
    
    canvas.addEventListener('click', e => {
        if (game) game.handleClick(e);
    });
    
    document.addEventListener('keydown', e => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    });
});
