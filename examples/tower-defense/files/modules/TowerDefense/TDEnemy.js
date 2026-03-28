/**
 * TDEnemy Module
 * Tower Defense enemy behavior - moves along path, has health
 * Namespace: TowerDefense
 * 
 * Features:
 * - Follows TDPath automatically
 * - Health system with visual health bar
 * - Configurable speed, armor, rewards
 * - Events for damage, death, reaching end
 */

class TDEnemy extends Module {
    constructor() {
        super();
        
        // Movement
        this.speed = 100; // Pixels per second
        this.pathName = ''; // Name of TDPath game object to follow (leave empty to find first)
        
        // Health
        this.maxHealth = 100;
        this.armor = 0; // Flat damage reduction
        this.armorPercent = 0; // Percentage damage reduction (0-100)
        
        // Rewards
        this.moneyReward = 10;
        this.scoreReward = 100;
        
        // Damage to base
        this.baseDamage = 1;
        
        // Visual
        this.showHealthBar = true;
        this.healthBarWidth = 40;
        this.healthBarHeight = 6;
        this.healthBarOffset = -30;
        this.healthBarBgColor = '#333333';
        this.healthBarColor = '#00ff00';
        this.healthBarLowColor = '#ff0000';
        this.lowHealthThreshold = 0.3;
        
        // Enemy appearance
        this.enemyColor = '#ff4444';
        this.enemyAccentColor = '#cc2222';
        this.enemySize = 20;
        this.enemyShape = 'triangle'; // 'triangle', 'circle', 'square', 'diamond', 'hexagon'
        this.drawEnemy = true; // Set false if using sprite
        
        // Internal state
        this._health = 100;
        this._pathProgress = 0; // Distance traveled along path
        this._path = null;
        this._gameManager = null;
        this._isDead = false;
        this._reachedEnd = false;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 50;
    
    static getIcon() {
        return '👾';
    }
    
    static getDescription() {
        return 'Enemy that follows a path - has health, speed, and rewards';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === MOVEMENT ===
            _header_movement: { type: 'header', label: '🏃 Movement' },
            speed: { 
                type: 'slider', 
                label: 'Speed', 
                default: 100, 
                min: 10, 
                max: 500,
                hint: 'Pixels per second along the path'
            },
            pathName: { 
                type: 'prefab', 
                label: 'Path Object', 
                default: '',
                hint: 'Name of TDPath object to follow (leave empty for auto)'
            },
            
            // === HEALTH & DEFENSE ===
            _header_health: { type: 'header', label: '❤️ Health & Defense' },
            maxHealth: { 
                type: 'number', 
                label: 'Max Health', 
                default: 100, 
                min: 1, 
                max: 10000,
                hint: 'Total hit points'
            },
            armor: { 
                type: 'number', 
                label: 'Armor (Flat)', 
                default: 0, 
                min: 0, 
                max: 100,
                hint: 'Flat damage reduction applied before % armor'
            },
            armorPercent: { 
                type: 'slider', 
                label: 'Armor (%)', 
                default: 0, 
                min: 0, 
                max: 90, 
                step: 5,
                hint: 'Percentage damage reduction (max 90%)'
            },
            
            // === REWARDS & PENALTIES ===
            _header_rewards: { type: 'header', label: '💰 Rewards & Penalties' },
            moneyReward: { 
                type: 'number', 
                label: 'Kill Reward', 
                default: 10, 
                min: 0, 
                max: 1000,
                hint: 'Money awarded when killed'
            },
            scoreReward: { 
                type: 'number', 
                label: 'Score Value', 
                default: 100, 
                min: 0, 
                max: 10000,
                hint: 'Points awarded when killed'
            },
            baseDamage: { 
                type: 'number', 
                label: 'Leak Damage', 
                default: 1, 
                min: 1, 
                max: 100,
                hint: 'Lives lost when reaching the end'
            },
            
            // === APPEARANCE ===
            _header_appearance: { type: 'header', label: '🎨 Appearance' },
            drawEnemy: { 
                type: 'boolean', 
                label: 'Draw Default Enemy', 
                default: true,
                hint: 'Disable if using custom sprite'
            },
            enemyColor: { 
                type: 'color', 
                label: 'Primary Color', 
                default: '#ff4444'
            },
            enemyAccentColor: {
                type: 'color',
                label: 'Accent Color',
                default: '#cc2222'
            },
            enemySize: { 
                type: 'slider', 
                label: 'Size', 
                default: 20, 
                min: 8, 
                max: 60,
                hint: 'Visual size of the enemy'
            },
            enemyShape: {
                type: 'select',
                label: 'Shape',
                default: 'triangle',
                options: ['triangle', 'circle', 'square', 'diamond', 'hexagon'],
                hint: 'Shape of the enemy'
            },
            
            // === HEALTH BAR ===
            _header_healthbar: { type: 'header', label: '🟩 Health Bar' },
            showHealthBar: { 
                type: 'boolean', 
                label: 'Show Health Bar', 
                default: true 
            },
            healthBarWidth: { 
                type: 'slider', 
                label: 'Bar Width', 
                default: 40, 
                min: 20, 
                max: 80 
            },
            healthBarOffset: { 
                type: 'number', 
                label: 'Y Offset', 
                default: -30, 
                min: -60, 
                max: 60,
                hint: 'Vertical offset from enemy center'
            },
            healthBarColor: { 
                type: 'color', 
                label: 'Health Color', 
                default: '#44ff44' 
            },
            healthBarLowColor: { 
                type: 'color', 
                label: 'Low Health Color', 
                default: '#ff4444' 
            },
            lowHealthThreshold: {
                type: 'slider',
                label: 'Low Health %',
                default: 0.3,
                min: 0.1,
                max: 0.5,
                step: 0.05,
                hint: 'Health % when bar turns red'
            }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._health = this.maxHealth;
        this._pathProgress = 0;
        this._isDead = false;
        this._reachedEnd = false;
        
        // Find game manager
        this._gameManager = TDGameManager.findManager();
        if (this._gameManager) {
            this._gameManager.registerEnemy(this);
        }
        
        // Find path
        this.findPath();
        
        // Position at start of path
        if (this._path) {
            const startPos = this._path.getStartPoint();
            this.x = startPos.x;
            this.y = startPos.y;
        }
        
        //console.log('👾 Enemy spawned with', this._health, 'HP');
    }
    
    findPath() {
        // Try to find by name first
        if (this.pathName) {
            const pathObj = this.findObject(this.pathName);
            if (pathObj) {
                this._path = pathObj.getModule ? pathObj.getModule('TDPath') : null;
            }
        }
        
        // Fall back to game manager's first path
        if (!this._path && this._gameManager) {
            this._path = this._gameManager.getFirstPath();
        }
        
        // Fall back to finding any TDPath
        if (!this._path) {
            if (typeof findByModule === 'function') {
                const pathObjs = findByModule('TDPath');
                if (pathObjs.length > 0) {
                    this._path = pathObjs[0].getModule('TDPath');
                }
            }
        }
        
        if (!this._path) {
            //console.warn('👾 Enemy could not find a TDPath!');
        }
    }
    
    loop(deltaTime) {
        if (this._isDead || this._reachedEnd) return;
        
        // Check if game is paused - but allow movement during 'playing' and 'waiting' (for testing)
        if (this._gameManager) {
            const state = this._gameManager.getState();
            if (state === 'paused' || state === 'gameover' || state === 'victory') return;
        }
        
        // Move along path
        if (this._path) {
            this._pathProgress += this.speed * deltaTime;
            
            // Check if reached end
            const pathLength = this._path.getPathLength();
            if (this._pathProgress >= pathLength) {
                this.reachedEnd();
                return;
            }
            
            // Update position - path returns world coordinates
            const pos = this._path.getPositionAtDistance(this._pathProgress);
            
            // Set position - if we have a parent, convert to local coords
            if (this.gameObject && this.gameObject.parent) {
                const parentWorld = this.gameObject.parent.getWorldPosition();
                this.x = pos.x - parentWorld.x;
                this.y = pos.y - parentWorld.y;
            } else {
                // No parent, x/y are world coords
                this.x = pos.x;
                this.y = pos.y;
            }
            
            // Update rotation to face movement direction (in radians, convert to degrees)
            const dir = this._path.getDirectionAtDistance(this._pathProgress);
            this.angle = dir * (180 / Math.PI);
        }
    }
    
    draw(ctx) {
        if (this._isDead) return;
        
        // Draw enemy body
        // Note: ctx is already translated to object position AND rotated by the engine
        // The engine applies this.angle rotation before calling draw(), so we don't need to rotate again
        if (this.drawEnemy) {
            ctx.save();
            
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 4, this.enemySize * 0.7, this.enemySize * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw shape based on enemyShape property
            this.drawEnemyShape(ctx);
            
            ctx.restore();
        }
        
        // Draw health bar
        if (this.showHealthBar && this._health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }
    }
    
    drawEnemyShape(ctx) {
        const size = this.enemySize;
        
        // Create gradient for main body
        const gradient = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        gradient.addColorStop(0, this.lightenColor(this.enemyColor, 40));
        gradient.addColorStop(0.5, this.enemyColor);
        gradient.addColorStop(1, this.enemyAccentColor || this.darkenColor(this.enemyColor, 30));
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = this.darkenColor(this.enemyColor, 40);
        ctx.lineWidth = 2;
        
        switch (this.enemyShape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Inner highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(-size * 0.2, -size * 0.2, size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'square':
                ctx.beginPath();
                ctx.roundRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4, size * 0.15);
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(size, 0);
                ctx.lineTo(0, size * 0.8);
                ctx.lineTo(-size, 0);
                ctx.lineTo(0, -size * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'hexagon':
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
                    const x = Math.cos(angle) * size * 0.9;
                    const y = Math.sin(angle) * size * 0.9;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'triangle':
            default:
                // Draw a sleek triangle pointing in movement direction
                ctx.beginPath();
                ctx.moveTo(size, 0);
                ctx.lineTo(-size * 0.6, -size * 0.6);
                ctx.lineTo(-size * 0.3, 0);
                ctx.lineTo(-size * 0.6, size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Engine glow effect
                const glowGradient = ctx.createRadialGradient(-size * 0.4, 0, 0, -size * 0.4, 0, size * 0.4);
                glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
                glowGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.ellipse(-size * 0.5, 0, size * 0.25, size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        // Eyes/detail for non-triangle shapes
        if (this.enemyShape !== 'triangle') {
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.arc(size * 0.2, -size * 0.15, size * 0.12, 0, Math.PI * 2);
            ctx.arc(size * 0.2, size * 0.15, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye shine
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(size * 0.25, -size * 0.18, size * 0.05, 0, Math.PI * 2);
            ctx.arc(size * 0.25, size * 0.12, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Color helper functions
    lightenColor(color, percent) {
        if (!color || color.startsWith('rgba') || color.startsWith('rgb')) return color || '#ffffff';
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }
    
    darkenColor(color, percent) {
        if (!color || color.startsWith('rgba') || color.startsWith('rgb')) return color || '#000000';
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }
    
    drawHealthBar(ctx) {
        // Draw at local position (0,0 is object center)
        const healthPercent = this._health / this.maxHealth;
        const barX = -this.healthBarWidth / 2;
        const barY = this.healthBarOffset;
        const barHeight = this.healthBarHeight || 6;
        
        ctx.save();
        // Reset rotation for health bar (we want it to always face up)
        ctx.rotate(-this.angle * Math.PI / 180);
        
        // Background with rounded corners
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(barX - 1, barY - 1, this.healthBarWidth + 2, barHeight + 2, 3);
        ctx.fill();
        
        // Health gradient
        const healthColor = healthPercent <= this.lowHealthThreshold ? this.healthBarLowColor : this.healthBarColor;
        const healthGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        healthGradient.addColorStop(0, this.lightenColor(healthColor, 30));
        healthGradient.addColorStop(0.5, healthColor);
        healthGradient.addColorStop(1, this.darkenColor(healthColor, 20));
        
        ctx.fillStyle = healthGradient;
        ctx.beginPath();
        ctx.roundRect(barX, barY, this.healthBarWidth * healthPercent, barHeight, 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, this.healthBarWidth * healthPercent, barHeight / 3);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, this.healthBarWidth, barHeight, 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // ==================== DAMAGE & HEALTH ====================
    
    takeDamage(amount, damageType = 'normal') {
        if (this._isDead) return;
        
        // Apply armor
        let finalDamage = amount;
        
        // Flat armor reduction
        finalDamage = Math.max(0, finalDamage - this.armor);
        
        // Percentage reduction
        if (this.armorPercent > 0) {
            finalDamage *= (1 - this.armorPercent / 100);
        }
        
        this._health -= finalDamage;
        
        // Broadcast damage event
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onEnemyDamaged', {
                enemy: this,
                damage: finalDamage,
                remainingHealth: this._health
            });
        }
        
        // Check for death
        if (this._health <= 0) {
            this.die();
        }
    }
    
    heal(amount) {
        this._health = Math.min(this.maxHealth, this._health + amount);
    }
    
    getHealth() { return this._health; }
    getMaxHealth() { return this.maxHealth; }
    getHealthPercent() { return this._health / this.maxHealth; }
    isDead() { return this._isDead; }
    
    // ==================== PATH PROGRESS ====================
    
    getPathProgress() { return this._pathProgress; }
    
    getPathProgressPercent() {
        if (!this._path) return 0;
        return this._pathProgress / this._path.getPathLength();
    }
    
    // ==================== DEATH & END ====================
    
    die() {
        //if (this._isDead) return;
        this._isDead = true;
        
        //console.log('💀 Enemy killed! Reward:', this.moneyReward);
        
        // Notify game manager
        if (this._gameManager) {
            this._gameManager.onEnemyKilled({
                reward: this.moneyReward,
                score: this.scoreReward,
                enemy: this
            });
            this._gameManager.unregisterEnemy(this);
        }
        
        // Broadcast death event
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onEnemyKilled', {
                enemy: this,
                reward: this.moneyReward,
                position: { x: this.x, y: this.y }
            });
        }
        
        // Destroy this game object
        instanceDestroy(this.gameObject);
    }
    
    reachedEnd() {
        if (this._reachedEnd || this._isDead) return;
        this._reachedEnd = true;
        
        //console.log('⚠️ Enemy reached the end! Damage:', this.baseDamage);
        
        // Notify game manager
        if (this._gameManager) {
            this._gameManager.onEnemyReachedEnd({
                damage: this.baseDamage,
                enemy: this
            });
            this._gameManager.unregisterEnemy(this);
        }
        
        // Broadcast event
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onEnemyReachedEnd', {
                enemy: this,
                damage: this.baseDamage
            });
        }
        
        // Destroy
        instanceDestroy(this);
    }
    
    // ==================== SERIALIZATION ====================
    
    /**
     * Property metadata for the inspector
     * @returns {Array} Property definitions
     */
    getPropertyMetadata() {
        return [
            { key: 'speed', label: 'Speed', type: 'number', min: 0 },
            { key: 'pathName', label: 'Path Name', type: 'text' },
            { key: 'maxHealth', label: 'Max Health', type: 'number', min: 0 },
            { key: 'armor', label: 'Armor', type: 'number', min: 0 },
            { key: 'armorPercent', label: 'Armor Percent', type: 'number', min: 0 },
            { key: 'moneyReward', label: 'Money Reward', type: 'number', min: 0 },
            { key: 'scoreReward', label: 'Score Reward', type: 'number', min: 0 },
            { key: 'baseDamage', label: 'Base Damage', type: 'number', min: 0 },
            { key: 'showHealthBar', label: 'Show Health Bar', type: 'boolean' },
            { key: 'healthBarWidth', label: 'Health Bar Width', type: 'number', min: 0 },
            { key: 'healthBarHeight', label: 'Health Bar Height', type: 'number', min: 0 },
            { key: 'healthBarOffset', label: 'Health Bar Offset', type: 'number' },
            { key: 'healthBarBgColor', label: 'Health Bar Bg Color', type: 'color' },
            { key: 'healthBarColor', label: 'Health Bar Color', type: 'color' },
            { key: 'healthBarLowColor', label: 'Health Bar Low Color', type: 'color' },
            { key: 'lowHealthThreshold', label: 'Low Health Threshold', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'enemyColor', label: 'Enemy Color', type: 'color' },
            { key: 'enemyAccentColor', label: 'Enemy Accent Color', type: 'color' },
            { key: 'enemySize', label: 'Enemy Size', type: 'number', min: 0 },
            { key: 'enemyShape', label: 'Enemy Shape', type: 'text' },
            { key: 'drawEnemy', label: 'Draw Enemy', type: 'boolean' }
        ];
    }

    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON();
        json.type = 'TDEnemy';
        json.speed = this.speed;
        json.pathName = this.pathName;
        json.maxHealth = this.maxHealth;
        json.armor = this.armor;
        json.armorPercent = this.armorPercent;
        json.moneyReward = this.moneyReward;
        json.scoreReward = this.scoreReward;
        json.baseDamage = this.baseDamage;
        json.showHealthBar = this.showHealthBar;
        json.healthBarWidth = this.healthBarWidth;
        json.healthBarHeight = this.healthBarHeight;
        json.healthBarOffset = this.healthBarOffset;
        json.healthBarBgColor = this.healthBarBgColor;
        json.healthBarColor = this.healthBarColor;
        json.healthBarLowColor = this.healthBarLowColor;
        json.lowHealthThreshold = this.lowHealthThreshold;
        json.enemyColor = this.enemyColor;
        json.enemyAccentColor = this.enemyAccentColor;
        json.enemySize = this.enemySize;
        json.enemyShape = this.enemyShape;
        json.drawEnemy = this.drawEnemy;
        return json;
    }

    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {TDEnemy} New instance
     */
    static fromJSON(json) {
        const module = new TDEnemy();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.speed = json.speed ?? 100;
        module.pathName = json.pathName ?? '';
        module.maxHealth = json.maxHealth ?? 100;
        module.armor = json.armor ?? 0;
        module.armorPercent = json.armorPercent ?? 0;
        module.moneyReward = json.moneyReward ?? 10;
        module.scoreReward = json.scoreReward ?? 100;
        module.baseDamage = json.baseDamage ?? 1;
        module.showHealthBar = json.showHealthBar ?? true;
        module.healthBarWidth = json.healthBarWidth ?? 40;
        module.healthBarHeight = json.healthBarHeight ?? 6;
        module.healthBarOffset = json.healthBarOffset ?? -30;
        module.healthBarBgColor = json.healthBarBgColor ?? '#333333';
        module.healthBarColor = json.healthBarColor ?? '#00ff00';
        module.healthBarLowColor = json.healthBarLowColor ?? '#ff0000';
        module.lowHealthThreshold = json.lowHealthThreshold ?? 0.3;
        module.enemyColor = json.enemyColor ?? '#ff4444';
        module.enemyAccentColor = json.enemyAccentColor ?? '#cc2222';
        module.enemySize = json.enemySize ?? 20;
        module.enemyShape = json.enemyShape ?? 'triangle';
        module.drawEnemy = json.drawEnemy ?? true;
        return module;
    }

    /**
     * Clone the module
     * @returns {TDEnemy} Cloned module
     */
    clone() {
        return TDEnemy.fromJSON(this.toJSON());
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDEnemy = TDEnemy;
}

if (typeof Module !== 'undefined') {
    Module.register('TDEnemy', TDEnemy);
}
