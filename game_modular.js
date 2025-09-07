/**
 * 极速跑酷 Ultra - 模块化版本主文件
 * 整合所有系统模块，提供完整的游戏体验
 */

import { GameEngine } from './modules/GameEngine.js';
import { PlayerSystem } from './modules/PlayerSystem.js';
import { EntitySystem } from './modules/EntitySystem.js';
import { RenderSystem } from './modules/RenderSystem.js';
import { WorldSystem } from './modules/WorldSystem.js';
import { UISystem } from './modules/UISystem.js';

class ParkourGameModular {
    constructor() {
        this.engine = null;
        this.systems = {};
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Modular Parkour Game...');
        
        // 创建游戏引擎
        this.engine = new GameEngine();
        
        // 创建所有系统
        this.systems = {
            world: new WorldSystem(),
            player: new PlayerSystem(),
            entity: new EntitySystem(),
            render: new RenderSystem(),
            ui: new UISystem(),
            collision: new CollisionSystem()
        };
        
        // 按依赖顺序注册系统
        this.registerSystems();
        
        // 设置游戏事件监听
        this.setupGameEvents();
        
        // 启动游戏引擎
        this.engine.start();
        
        // 显示主菜单
        this.engine.setState(this.engine.STATES.MENU);
        
        console.log('✅ Modular Parkour Game initialized successfully!');
    }
    
    registerSystems() {
        // 注册系统，数字表示更新优先级（越小越先执行）
        this.engine.registerSystem('world', this.systems.world, 1);
        this.engine.registerSystem('player', this.systems.player, 2);
        this.engine.registerSystem('entity', this.systems.entity, 3);
        this.engine.registerSystem('collision', this.systems.collision, 4);
        this.engine.registerSystem('ui', this.systems.ui, 5);
        this.engine.registerSystem('render', this.systems.render, 10); // 渲染最后执行
        
        console.log('📦 All systems registered');
    }
    
    setupGameEvents() {
        // 游戏开始
        this.engine.on('game:started', () => {
            console.log('🎮 Game Started');
        });
        
        // 游戏重置
        this.engine.on('game:restart', () => {
            this.restartGame();
        });
        
        // 玩家受伤
        this.engine.on('game:playerHit', () => {
            this.handleGameOver();
        });
        
        // 碰撞事件
        this.engine.on('collision:coin', (data) => {
            this.handleCoinCollected(data);
        });
        
        this.engine.on('collision:powerup', (data) => {
            this.handlePowerupCollected(data);
        });
        
        // 性能监控
        this.engine.on('performance:updated', (perf) => {
            if (window.updatePerformanceBadge) {
                window.updatePerformanceBadge();
            }
        });
    }
    
    restartGame() {
        console.log('🔄 Restarting game...');
        
        // 重置所有系统
        this.engine.emit('game:reset');
        
        // 重新开始
        this.engine.setState(this.engine.STATES.PLAYING);
        this.engine.emit('game:started');
    }
    
    handleGameOver() {
        console.log('💀 Game Over');
        
        // 保存最终分数和金币
        const uiSystem = this.systems.ui;
        const finalScore = uiSystem.getScore();
        const finalCoins = uiSystem.getCoins();
        
        // 更新本地存储
        const currentTotal = parseInt(localStorage.getItem('parkour_totalCoins')) || 0;
        localStorage.setItem('parkour_totalCoins', (currentTotal + finalCoins).toString());
        
        // 切换到游戏结束状态
        this.engine.setState(this.engine.STATES.GAME_OVER);
    }
    
    handleCoinCollected(data) {
        // 移除金币实体
        this.systems.entity.removeEntity(data.coin);
        
        // 通知UI系统更新分数
        this.engine.emit('collision:coin', { value: data.coin.value || 10 });
        
        // 播放音效
        this.engine.emit('audio:play', { sound: 'coin' });
    }
    
    handlePowerupCollected(data) {
        // 移除道具实体
        this.systems.entity.removeEntity(data.powerup);
        
        // 激活道具效果
        this.engine.emit('collision:powerup', { type: data.powerup.type });
        
        // 播放音效
        this.engine.emit('audio:play', { sound: 'powerup' });
    }
}

/**
 * 碰撞检测系统
 * 专门处理碰撞检测逻辑
 */
class CollisionSystem {
    constructor() {
        this.engine = null;
        this.playerSystem = null;
        this.entitySystem = null;
    }
    
    init(engine) {
        this.engine = engine;
        this.playerSystem = engine.getSystem('player');
        this.entitySystem = engine.getSystem('entity');
        
        console.log('💥 Collision System initialized');
    }
    
    update(deltaTime, gameTime) {
        if (!this.engine.isState(this.engine.STATES.PLAYING)) return;
        if (!this.playerSystem || !this.entitySystem) return;
        
        const player = this.playerSystem.getPlayer();
        if (!player || this.playerSystem.isInvulnerable()) return;
        
        const playerRect = this.playerSystem.getCollisionRect();
        const collisions = this.entitySystem.checkCollisions(playerRect);
        
        // 处理障碍物碰撞
        if (collisions.obstacles.length > 0) {
            this.engine.emit('collision:obstacle', { obstacle: collisions.obstacles[0] });
        }
        
        // 处理金币碰撞
        collisions.coins.forEach(coin => {
            this.engine.emit('collision:coin', { coin });
        });
        
        // 处理道具碰撞
        collisions.powerups.forEach(powerup => {
            this.engine.emit('collision:powerup', { powerup });
        });
    }
}

// 游戏初始化
let game;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 等待DOM完全加载
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
        
        // 检查必要的DOM元素
        const gameCanvas = document.getElementById('gameCanvas');
        const particleCanvas = document.getElementById('particleCanvas');
        
        if (!gameCanvas || !particleCanvas) {
            throw new Error('Required canvas elements not found');
        }
        
        // 创建游戏实例
        game = new ParkourGameModular();
        
        // 暴露到全局作用域供调试使用
        window.game = game;
        
        // 设置全局事件监听
        setupGlobalEvents();
        
        console.log('🎉 Modular Parkour Game loaded successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        
        // 显示错误信息
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: white; font-family: Arial;">
                <div style="text-align: center;">
                    <h1>🚫 游戏加载失败</h1>
                    <p>错误信息: ${error.message}</p>
                    <p>请刷新页面重试</p>
                </div>
            </div>
        `;
    }
});

function setupGlobalEvents() {
    // 防止页面滚动和缩放
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // 全屏支持
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F11') {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    });
    
    // 窗口失焦时暂停游戏
    window.addEventListener('blur', () => {
        if (game && game.engine && game.engine.isState(game.engine.STATES.PLAYING)) {
            game.engine.pause();
        }
    });
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game && game.engine && game.engine.isState(game.engine.STATES.PLAYING)) {
            game.engine.pause();
        }
    });
}

// 导出供外部使用
export { ParkourGameModular, CollisionSystem };
