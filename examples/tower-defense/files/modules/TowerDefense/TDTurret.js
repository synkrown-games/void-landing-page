/**
 * TDTurret Module
 * Tower Defense turret with targeting and shooting
 * Namespace: TowerDefense
 * 
 * Features:
 * - Multiple targeting modes (nearest, first, strongest, weakest)
 * - Configurable range, damage, fire rate
 * - Visual range indicator
 * - Rotation towards targets
 * - Different turret types (single, burst, beam)
 * - Upgrade cost system
 */

class TDTurret extends Module {
    constructor() {
        super();
        
        // Turret Stats
        this.damage = 25;
        this.range = 150;
        this.fireRate = 1; // Shots per second
        this.rotationSpeed = 180; // Degrees per second
        
        // Projectile Settings
        this.projectilePrefab = 'TDProjectile';
        this.projectileSpeed = 400;
        this.useProjectile = true; // If false, instant hit
        
        // Turret Type
        this.turretType = 'single'; // 'single', 'burst', 'beam', 'splash'
        this.burstCount = 3;
        this.burstDelay = 0.1;
        this.splashRadius = 50;
        this.beamDuration = 0.5;
        
        // Targeting
        this.targetingMode = 'nearest'; // 'nearest', 'first', 'last', 'strongest', 'weakest'
        this.predictTarget = true; // Lead shots to where enemy will be
        
        // Cost & Economy
        this.cost = 50;
        this.sellValue = 25; // Usually 50% of cost
        
        // Description
        this.description = 'A basic defensive turret';
        
        // Upgrade System
        this.maxUpgrades = 5;
        this.upgradeCost = 30;
        this.upgradeCostMultiplier = 1.5; // Each upgrade costs more
        this.upgradeStatMultiplier = 0.2; // 20% stat increase per upgrade
        this.upgradeSizeIncrease = 0.1; // 10% size increase per upgrade
        
        // Visual
        this.showRange = true;
        this.showRangeOnlyWhenSelected = true;
        this.rangeColor = 'rgba(0, 255, 0, 0.2)';
        this.rangeBorderColor = 'rgba(0, 255, 0, 0.8)';
        this.drawTurret = true;
        this.turretColor = '#4488ff';
        this.turretAccentColor = '#2266cc';
        this.turretSize = 24;
        this.barrelLength = 20;
        this.barrelWidth = 8;
        
        // Internal state
        this._target = null;
        this._currentAngle = 0;
        this._fireCooldown = 0;
        this._burstRemaining = 0;
        this._burstCooldown = 0;
        this._beamActive = false;
        this._beamTimer = 0;
        this._gameManager = null;
        this._isSelected = false;
        this._upgradeLevel = 0;
        
        // Base stats (for upgrade calculations)
        this._baseDamage = 25;
        this._baseRange = 150;
        this._baseFireRate = 1;
        this._baseTurretSize = 24;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 60;
    
    static getIcon() {
        return '🔫';
    }
    
    static getDescription() {
        return 'Defensive turret that targets and shoots enemies';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === COMBAT STATS ===
            _header_combat: { type: 'header', label: '⚔️ Combat Stats' },
            damage: { 
                type: 'number', 
                label: 'Damage', 
                default: 25, 
                min: 1, 
                max: 1000,
                hint: 'Base damage dealt per shot'
            },
            range: { 
                type: 'slider', 
                label: 'Range', 
                default: 150, 
                min: 50, 
                max: 500,
                hint: 'Detection and attack radius in pixels'
            },
            fireRate: { 
                type: 'number', 
                label: 'Fire Rate', 
                default: 1, 
                min: 0.1, 
                max: 20, 
                step: 0.1,
                hint: 'Shots per second'
            },
            rotationSpeed: { 
                type: 'slider', 
                label: 'Rotation Speed', 
                default: 180, 
                min: 30, 
                max: 720,
                hint: 'Degrees per second the turret can rotate'
            },
            
            // === PROJECTILE SETTINGS ===
            _header_projectile: { type: 'header', label: '💨 Projectile Settings' },
            useProjectile: { 
                type: 'boolean', 
                label: 'Use Projectile', 
                default: true,
                hint: 'If disabled, deals instant hit-scan damage'
            },
            projectilePrefab: { 
                type: 'prefab', 
                label: 'Projectile Prefab', 
                default: 'TDProjectile',
                hint: 'Prefab to spawn when firing'
            },
            projectileSpeed: { 
                type: 'number', 
                label: 'Projectile Speed', 
                default: 400, 
                min: 100, 
                max: 2000,
                hint: 'Pixels per second'
            },
            
            // === TURRET TYPE ===
            _header_type: { type: 'header', label: '🎯 Turret Type' },
            turretType: { 
                type: 'select', 
                label: 'Attack Type', 
                default: 'single',
                options: ['single', 'burst', 'beam', 'splash'],
                hint: 'Single: one shot, Burst: rapid fire, Beam: continuous, Splash: AoE'
            },
            burstCount: { 
                type: 'number', 
                label: 'Burst Count', 
                default: 3, 
                min: 2, 
                max: 10,
                hint: 'Number of shots per burst (burst type only)'
            },
            burstDelay: { 
                type: 'number', 
                label: 'Burst Delay', 
                default: 0.1, 
                min: 0.01, 
                max: 0.5, 
                step: 0.01,
                hint: 'Seconds between burst shots'
            },
            splashRadius: { 
                type: 'slider', 
                label: 'Splash Radius', 
                default: 50, 
                min: 10, 
                max: 200,
                hint: 'Area of effect radius for splash damage'
            },
            beamDuration: { 
                type: 'number', 
                label: 'Beam Duration', 
                default: 0.5, 
                min: 0.1, 
                max: 2, 
                step: 0.1,
                hint: 'How long the beam stays active'
            },
            
            // === TARGETING ===
            _header_targeting: { type: 'header', label: '🎯 Targeting' },
            targetingMode: { 
                type: 'select', 
                label: 'Target Priority', 
                default: 'nearest',
                options: ['nearest', 'first', 'last', 'strongest', 'weakest'],
                hint: 'How to choose which enemy to attack'
            },
            predictTarget: { 
                type: 'boolean', 
                label: 'Lead Shots', 
                default: true,
                hint: 'Predict enemy movement for more accurate shots'
            },
            
            // === INFO ===
            _header_info: { type: 'header', label: '📋 Info' },
            description: {
                type: 'text',
                label: 'Description',
                default: 'A basic defensive turret',
                hint: 'Turret description shown in info panel'
            },
            
            // === ECONOMY ===
            _header_economy: { type: 'header', label: '💰 Economy' },
            cost: { 
                type: 'number', 
                label: 'Build Cost', 
                default: 50, 
                min: 0, 
                max: 10000,
                hint: 'Money required to place this turret'
            },
            sellValue: { 
                type: 'number', 
                label: 'Sell Value', 
                default: 25, 
                min: 0, 
                max: 5000,
                hint: 'Money returned when selling (usually 50% of cost)'
            },
            
            // === UPGRADES ===
            _header_upgrades: { type: 'header', label: '⬆️ Upgrades' },
            maxUpgrades: {
                type: 'number',
                label: 'Max Upgrades',
                default: 5,
                min: 0,
                max: 20,
                hint: 'Maximum upgrade level'
            },
            upgradeCost: {
                type: 'number',
                label: 'Base Upgrade Cost',
                default: 30,
                min: 0,
                max: 1000,
                hint: 'Cost of first upgrade'
            },
            upgradeCostMultiplier: {
                type: 'number',
                label: 'Cost Multiplier',
                default: 1.5,
                min: 1,
                max: 3,
                step: 0.1,
                hint: 'Each upgrade costs this much more'
            },
            upgradeStatMultiplier: {
                type: 'number',
                label: 'Stat Increase %',
                default: 0.2,
                min: 0.05,
                max: 1,
                step: 0.05,
                hint: 'Percentage stat increase per upgrade (0.2 = 20%)'
            },
            upgradeSizeIncrease: {
                type: 'number',
                label: 'Size Increase %',
                default: 0.1,
                min: 0,
                max: 0.5,
                step: 0.05,
                hint: 'Visual size increase per upgrade'
            },
            
            // === APPEARANCE ===
            _header_appearance: { type: 'header', label: '🎨 Appearance' },
            drawTurret: { 
                type: 'boolean', 
                label: 'Draw Default Turret', 
                default: true,
                hint: 'Disable if using custom sprite'
            },
            turretColor: { 
                type: 'color', 
                label: 'Base Color', 
                default: '#4488ff',
                hint: 'Main color of the turret base'
            },
            turretAccentColor: { 
                type: 'color', 
                label: 'Accent Color', 
                default: '#2266cc',
                hint: 'Secondary color for details'
            },
            turretSize: { 
                type: 'slider', 
                label: 'Base Size', 
                default: 24, 
                min: 10, 
                max: 100,
                hint: 'Diameter of the turret base'
            },
            barrelLength: { 
                type: 'slider', 
                label: 'Barrel Length', 
                default: 20, 
                min: 5, 
                max: 50
            },
            barrelWidth: { 
                type: 'slider', 
                label: 'Barrel Width', 
                default: 8, 
                min: 2, 
                max: 20
            },
            
            // === RANGE INDICATOR ===
            _header_range: { type: 'header', label: '🔵 Range Indicator' },
            showRange: { 
                type: 'boolean', 
                label: 'Show Range Circle', 
                default: true
            },
            showRangeOnlyWhenSelected: { 
                type: 'boolean', 
                label: 'Only When Selected', 
                default: true,
                hint: 'Only show range when turret is selected in editor'
            },
            rangeColor: { 
                type: 'color', 
                label: 'Range Fill Color', 
                default: 'rgba(0,255,0,0.2)'
            },
            rangeBorderColor: { 
                type: 'color', 
                label: 'Range Border Color', 
                default: 'rgba(0,255,0,0.8)'
            }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._target = null;
        this._currentAngle = 0;
        this._fireCooldown = 0;
        this._burstRemaining = 0;
        this._burstCooldown = 0;
        this._beamActive = false;
        this._beamTimer = 0;
        
        // Store base stats for upgrade calculations
        this._baseDamage = this.damage;
        this._baseRange = this.range;
        this._baseFireRate = this.fireRate;
        this._baseTurretSize = this.turretSize;
        
        // Find game manager
        this._gameManager = TDGameManager.findManager();
        if (this._gameManager) {
            this._gameManager.registerTurret(this);
        }
        
        //console.log('🔫 Turret initialized - Range:', this.range, 'Damage:', this.damage);
    }
    
    loop(deltaTime) {
        // Check if game is paused - allow playing state
        if (this._gameManager) {
            const state = this._gameManager.getState();
            if (state === 'paused' || state === 'gameover' || state === 'victory') return;
        }
        
        // Update cooldowns
        if (this._fireCooldown > 0) {
            this._fireCooldown -= deltaTime;
        }
        
        if (this._burstCooldown > 0) {
            this._burstCooldown -= deltaTime;
        }
        
        // Find target
        this.updateTarget();
        
        // Rotate towards target
        if (this._target) {
            this.rotateTowardsTarget(deltaTime);
            
            // Fire if ready and aimed
            if (this.canFire() && this.isAimedAtTarget()) {
                this.fire();
            }
        }
        
        // Handle beam
        if (this._beamActive) {
            this._beamTimer -= deltaTime;
            if (this._beamTimer <= 0) {
                this._beamActive = false;
            } else if (this._target) {
                // Continuous beam damage
                this.dealBeamDamage(deltaTime);
            }
        }
        
        // Handle burst
        if (this._burstRemaining > 0 && this._burstCooldown <= 0 && this._target) {
            this.fireBurstShot();
        }
    }
    
    draw(ctx) {
        // Draw range indicator
        if (this.showRange && (!this.showRangeOnlyWhenSelected || this._isSelected)) {
            this.drawRangeIndicator(ctx);
        }
        
        // Draw turret
        if (this.drawTurret) {
            this.drawTurretVisual(ctx);
        }
        
        // Draw beam if active
        if (this._beamActive && this._target) {
            this.drawBeam(ctx);
        }
    }
    
    drawRangeIndicator(ctx) {
        ctx.save();
        
        // Gradient fill for range
        const rangeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.range);
        rangeGradient.addColorStop(0, 'rgba(0, 255, 100, 0.05)');
        rangeGradient.addColorStop(0.7, 'rgba(0, 255, 100, 0.1)');
        rangeGradient.addColorStop(1, 'rgba(0, 255, 100, 0.2)');
        
        ctx.fillStyle = this.rangeColor.includes('rgba') ? this.rangeColor : rangeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.range, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated dashed border
        ctx.strokeStyle = this.rangeBorderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -(Date.now() / 50) % 12; // Animated dash
        ctx.stroke();
        
        // Inner range ring at 50%
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, this.range * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawTurretVisual(ctx) {
        ctx.save();
        // Note: ctx is already translated to object position by engine
        
        const baseRadius = this.turretSize / 2;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 4, baseRadius * 0.9, baseRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Base platform (octagon shape for modern look)
        ctx.fillStyle = this.turretAccentColor || '#2266cc';
        ctx.beginPath();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 8;
            const x = Math.cos(angle) * (baseRadius + 4);
            const y = Math.sin(angle) * (baseRadius + 4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Main base circle with gradient
        const baseGradient = ctx.createRadialGradient(0, -baseRadius * 0.3, 0, 0, 0, baseRadius);
        baseGradient.addColorStop(0, this.lightenColor(this.turretColor, 40));
        baseGradient.addColorStop(0.5, this.turretColor);
        baseGradient.addColorStop(1, this.darkenColor(this.turretColor, 30));
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Base rim highlight
        ctx.strokeStyle = this.lightenColor(this.turretColor, 60);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius - 1, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
        
        // Inner ring detail
        ctx.strokeStyle = this.darkenColor(this.turretColor, 20);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Barrel assembly (rotates towards target)
        ctx.rotate(this._currentAngle);
        
        // Barrel shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(2, -this.barrelWidth / 2 + 2, this.barrelLength + 2, this.barrelWidth);
        
        // Main barrel with gradient
        const barrelGradient = ctx.createLinearGradient(0, -this.barrelWidth / 2, 0, this.barrelWidth / 2);
        barrelGradient.addColorStop(0, '#666666');
        barrelGradient.addColorStop(0.3, '#444444');
        barrelGradient.addColorStop(0.7, '#333333');
        barrelGradient.addColorStop(1, '#222222');
        
        ctx.fillStyle = barrelGradient;
        ctx.beginPath();
        ctx.roundRect(baseRadius * 0.3, -this.barrelWidth / 2, this.barrelLength, this.barrelWidth, 2);
        ctx.fill();
        
        // Barrel outline
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Barrel highlight line
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(baseRadius * 0.3 + 2, -this.barrelWidth / 2 + 2);
        ctx.lineTo(this.barrelLength + baseRadius * 0.3 - 4, -this.barrelWidth / 2 + 2);
        ctx.stroke();
        
        // Barrel tip / muzzle
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.roundRect(
            this.barrelLength + baseRadius * 0.3 - 6, 
            -this.barrelWidth / 2 - 3, 
            8, 
            this.barrelWidth + 6, 
            2
        );
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.stroke();
        
        // Muzzle hole
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(this.barrelLength + baseRadius * 0.3 + 1, 0, this.barrelWidth * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Center turret detail (dome/cap)
        ctx.rotate(-this._currentAngle); // Reset rotation for center piece
        
        const domeGradient = ctx.createRadialGradient(-2, -3, 0, 0, 0, baseRadius * 0.4);
        domeGradient.addColorStop(0, this.lightenColor(this.turretColor, 50));
        domeGradient.addColorStop(1, this.turretColor);
        
        ctx.fillStyle = domeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.darkenColor(this.turretColor, 20);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Helper functions for colors
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    drawBeam(ctx) {
        if (!this._target) return;
        
        const targetEnemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (!targetEnemy) return;
        
        ctx.save();
        
        // Reset transform to draw in world space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Apply viewport transform if available
        if (this.gameObject && this.gameObject._engine && this.gameObject._engine.viewport) {
            this.gameObject._engine.viewport.applyTransform(ctx);
        }
        
        // Get world positions
        const myPos = this.worldPosition;
        const targetPos = this._target.getWorldPosition ? this._target.getWorldPosition() : 
            (this._target.worldPosition || { x: this._target.position.x, y: this._target.position.y });
        
        // Calculate beam start position (at barrel tip)
        const startX = myPos.x + Math.cos(this._currentAngle) * (this.barrelLength + this.turretSize * 0.3);
        const startY = myPos.y + Math.sin(this._currentAngle) * (this.barrelLength + this.turretSize * 0.3);
        
        // Beam intensity based on timer
        const intensity = this._beamTimer / this.beamDuration;
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 50); // Rapid pulse effect
        
        // Outer glow (widest, most transparent)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 16 * intensity;
        ctx.globalAlpha = 0.15 * intensity * pulseIntensity;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
        
        // Middle glow
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 10 * intensity;
        ctx.globalAlpha = 0.3 * intensity * pulseIntensity;
        ctx.stroke();
        
        // Inner glow
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 6 * intensity;
        ctx.globalAlpha = 0.5 * intensity * pulseIntensity;
        ctx.stroke();
        
        // Core beam (brightest)
        ctx.strokeStyle = '#ffcccc';
        ctx.lineWidth = 3 * intensity;
        ctx.globalAlpha = 0.9 * intensity;
        ctx.stroke();
        
        // Center white-hot core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * intensity;
        ctx.globalAlpha = intensity;
        ctx.stroke();
        
        // Impact flash at target
        const flashRadius = 8 + 4 * Math.sin(Date.now() / 30);
        const flashGradient = ctx.createRadialGradient(
            targetPos.x, targetPos.y, 0,
            targetPos.x, targetPos.y, flashRadius * intensity
        );
        flashGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * intensity})`);
        flashGradient.addColorStop(0.3, `rgba(255, 100, 100, ${0.6 * intensity})`);
        flashGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = flashGradient;
        ctx.beginPath();
        ctx.arc(targetPos.x, targetPos.y, flashRadius * intensity, 0, Math.PI * 2);
        ctx.fill();
        
        // Muzzle flash at turret
        const muzzleGradient = ctx.createRadialGradient(
            startX, startY, 0,
            startX, startY, 6 * intensity
        );
        muzzleGradient.addColorStop(0, `rgba(255, 200, 150, ${0.9 * intensity})`);
        muzzleGradient.addColorStop(0.5, `rgba(255, 100, 50, ${0.5 * intensity})`);
        muzzleGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = muzzleGradient;
        ctx.beginPath();
        ctx.arc(startX, startY, 6 * intensity, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // ==================== TARGETING ====================
    
    updateTarget() {
        // Check if current target is still valid
        if (this._target) {
            const targetEnemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
            
            if (!targetEnemy || targetEnemy.isDead() || !this.isInRange(this._target)) {
                this._target = null;
            }
        }
        
        // Find new target if needed
        if (!this._target) {
            this._target = this.findTarget();
        }
    }
    
    findTarget() {
        if (!this._gameManager) return null;
        
        const enemies = this._gameManager.getEnemies();
        let bestTarget = null;
        let bestValue = null;
        
        for (const enemy of enemies) {
            if (!enemy.gameObject) continue;
            
            const enemyObj = enemy.gameObject;
            if (!this.isInRange(enemyObj)) continue;
            if (enemy.isDead()) continue;
            
            const value = this.getTargetValue(enemy);
            
            if (bestValue === null || this.isBetterTarget(value, bestValue)) {
                bestTarget = enemyObj;
                bestValue = value;
            }
        }
        
        return bestTarget;
    }
    
    getTargetValue(enemy) {
        switch (this.targetingMode) {
            case 'nearest':
                return -this.distanceToObject(enemy.gameObject); // Negative so closer is "better"
            case 'first':
                return enemy.getPathProgress(); // Higher progress = closer to end
            case 'last':
                return -enemy.getPathProgress();
            case 'strongest':
                return enemy.getHealth();
            case 'weakest':
                return -enemy.getHealth();
            default:
                return -this.distanceToObject(enemy.gameObject);
        }
    }
    
    isBetterTarget(newValue, oldValue) {
        // For all modes, higher value is better (we negate for nearest/last/weakest)
        return newValue > oldValue;
    }
    
    isInRange(target) {
        if (!target) return false;
        const dist = this.distanceToObject(target);
        return dist <= this.range;
    }
    
    distanceToObject(obj) {
        // Use world positions for accurate distance calculation
        const myPos = this.worldPosition;
        const objPos = obj.worldPosition || obj.getWorldPosition ? obj.getWorldPosition() : { x: obj.x, y: obj.y };
        const dx = objPos.x - myPos.x;
        const dy = objPos.y - myPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // ==================== ROTATION ====================
    
    rotateTowardsTarget(deltaTime) {
        if (!this._target) return;
        
        // Get world positions for accurate angle calculation
        const myPos = this.worldPosition;
        
        // Get predicted position if enabled
        let targetX, targetY;
        const targetPos = this._target.worldPosition || 
            (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
        targetX = targetPos.x;
        targetY = targetPos.y;
        
        if (this.predictTarget && this.useProjectile) {
            const predicted = this.predictTargetPosition();
            targetX = predicted.x;
            targetY = predicted.y;
        }
        
        // Calculate target angle in world space
        const dx = targetX - myPos.x;
        const dy = targetY - myPos.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Smooth rotation
        let angleDiff = targetAngle - this._currentAngle;
        
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const maxRotation = (this.rotationSpeed * Math.PI / 180) * deltaTime;
        
        if (Math.abs(angleDiff) < maxRotation) {
            this._currentAngle = targetAngle;
        } else {
            this._currentAngle += Math.sign(angleDiff) * maxRotation;
        }
    }
    
    predictTargetPosition() {
        const myPos = this.worldPosition;
        if (!this._target) return { x: myPos.x, y: myPos.y };
        
        const targetPos = this._target.worldPosition || 
            (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
        
        const enemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (!enemy) return { x: targetPos.x, y: targetPos.y };
        
        // Simple prediction based on travel time
        const dist = this.distanceToObject(this._target);
        const travelTime = dist / this.projectileSpeed;
        
        // Get enemy direction from path
        const path = enemy._path;
        if (!path) return { x: targetPos.x, y: targetPos.y };
        
        const futureProgress = enemy.getPathProgress() + enemy.speed * travelTime;
        const futurePos = path.getPositionAtDistance(futureProgress);
        
        return futurePos;
    }
    
    isAimedAtTarget() {
        if (!this._target) return false;
        
        const myPos = this.worldPosition;
        
        // Use predicted position if prediction is enabled (same as rotation target)
        let targetX, targetY;
        if (this.predictTarget && this.useProjectile) {
            const predicted = this.predictTargetPosition();
            targetX = predicted.x;
            targetY = predicted.y;
        } else {
            const targetPos = this._target.worldPosition || 
                (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
            targetX = targetPos.x;
            targetY = targetPos.y;
        }
        
        const dx = targetX - myPos.x;
        const dy = targetY - myPos.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Properly normalize angle difference
        let angleDiff = targetAngle - this._currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        return Math.abs(angleDiff) < 0.15; // About 8.5 degrees tolerance
    }
    
    // ==================== FIRING ====================
    
    canFire() {
        return this._fireCooldown <= 0 && this._burstRemaining === 0;
    }
    
    fire() {
        switch (this.turretType) {
            case 'single':
                this.fireSingle();
                break;
            case 'burst':
                this.startBurst();
                break;
            case 'beam':
                this.fireBeam();
                break;
            case 'splash':
                this.fireSplash();
                break;
        }
    }
    
    fireSingle() {
        this._fireCooldown = 1 / this.fireRate;
        
        if (this.useProjectile) {
            this.spawnProjectile();
        } else {
            this.instantHit();
        }
    }
    
    startBurst() {
        this._fireCooldown = 1 / this.fireRate;
        this._burstRemaining = this.burstCount;
        this._burstCooldown = 0;
        this.fireBurstShot();
    }
    
    fireBurstShot() {
        if (this._burstRemaining <= 0) return;
        
        this._burstRemaining--;
        this._burstCooldown = this.burstDelay;
        
        if (this.useProjectile) {
            this.spawnProjectile();
        } else {
            this.instantHit();
        }
    }
    
    fireBeam() {
        this._fireCooldown = 1 / this.fireRate;
        this._beamActive = true;
        this._beamTimer = this.beamDuration;
    }
    
    fireSplash() {
        this._fireCooldown = 1 / this.fireRate;
        
        if (this.useProjectile) {
            this.spawnProjectile(true);
        } else {
            this.instantSplashHit();
        }
    }
    
    spawnProjectile(isSplash = false) {
        if (!this._target) return;
        
        // Calculate spawn position at barrel tip in world space
        const myPos = this.worldPosition;
        const spawnX = myPos.x + Math.cos(this._currentAngle) * this.barrelLength;
        const spawnY = myPos.y + Math.sin(this._currentAngle) * this.barrelLength;
        
        // Create projectile
        let projectile = null;
        
        if (typeof instanceCreate === 'function') {
            projectile = instanceCreate(this.projectilePrefab, spawnX, spawnY);
        }
        
        // Configure projectile
        if (projectile) {
            const projModule = projectile.getModule ? projectile.getModule('TDProjectile') : null;
            if (projModule) {
                projModule.damage = this.damage;
                projModule.speed = this.projectileSpeed;
                projModule.isSplash = isSplash;
                projModule.splashRadius = this.splashRadius;
                projModule.setTarget(this._target);
            }
        }
    }
    
    instantHit() {
        if (!this._target) return;
        
        const enemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (enemy) {
            enemy.takeDamage(this.damage);
        }
    }
    
    instantSplashHit() {
        if (!this._target) return;
        
        // Hit main target
        const mainEnemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (mainEnemy) {
            mainEnemy.takeDamage(this.damage);
        }
        
        // Hit nearby enemies using world positions
        const targetPos = this._target.worldPosition || 
            (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
        
        if (this._gameManager) {
            const enemies = this._gameManager.getEnemies();
            for (const enemy of enemies) {
                if (enemy === mainEnemy) continue;
                if (!enemy.gameObject) continue;
                
                const enemyPos = enemy.gameObject.getWorldPosition ? 
                    enemy.gameObject.getWorldPosition() : { x: enemy.gameObject.x, y: enemy.gameObject.y };
                
                const dx = enemyPos.x - targetPos.x;
                const dy = enemyPos.y - targetPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= this.splashRadius) {
                    // Reduced damage based on distance
                    const falloff = 1 - (dist / this.splashRadius);
                    enemy.takeDamage(this.damage * falloff);
                }
            }
        }
    }
    
    dealBeamDamage(deltaTime) {
        if (!this._target) return;
        
        const enemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (enemy) {
            // Damage per second for beams
            enemy.takeDamage(this.damage * deltaTime);
        }
    }
    
    // ==================== SELECTION ====================
    
    setSelected(selected) {
        this._isSelected = selected;
    }
    
    // ==================== UPGRADES ====================
    
    getUpgradeLevel() {
        return this._upgradeLevel;
    }
    
    getMaxUpgrades() {
        return this.maxUpgrades;
    }
    
    isMaxLevel() {
        return this._upgradeLevel >= this.maxUpgrades;
    }
    
    getNextUpgradeCost() {
        if (this.isMaxLevel()) return 0;
        return Math.floor(this.upgradeCost * Math.pow(this.upgradeCostMultiplier, this._upgradeLevel));
    }
    
    canUpgrade() {
        if (this.isMaxLevel()) return false;
        if (!this._gameManager) return false;
        return this._gameManager.canAfford(this.getNextUpgradeCost());
    }
    
    upgrade() {
        if (!this.canUpgrade()) {
            //console.log('❌ Cannot upgrade turret!');
            return false;
        }
        
        const cost = this.getNextUpgradeCost();
        if (!this._gameManager.spendMoney(cost)) {
            return false;
        }
        
        this._upgradeLevel++;
        
        // Apply stat increases
        const multiplier = 1 + (this.upgradeStatMultiplier * this._upgradeLevel);
        this.damage = Math.floor(this._baseDamage * multiplier);
        this.range = Math.floor(this._baseRange * multiplier);
        this.fireRate = this._baseFireRate * multiplier;
        
        // Visual size increase
        const sizeMultiplier = 1 + (this.upgradeSizeIncrease * this._upgradeLevel);
        this.turretSize = Math.floor(this._baseTurretSize * sizeMultiplier);
        
        // Update sell value (include upgrade costs)
        this.sellValue = Math.floor((this.cost + cost) * 0.5);
        
        //console.log(`⬆️ Turret upgraded to level ${this._upgradeLevel}! DMG: ${this.damage}, RNG: ${this.range}, FR: ${this.fireRate.toFixed(1)}`);
        
        // Play upgrade particle effect
        this.playUpgradeEffect();
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onTurretUpgraded', { turret: this, level: this._upgradeLevel });
        }
        
        return true;
    }
    
    // ==================== PARTICLE EFFECTS ====================
    
    /**
     * Play upgrade smoke particle effect
     */
    playUpgradeEffect() {
        // Check if we already have a particle system
        let particles = this.gameObject.getModule ? this.gameObject.getModule('ParticleSystem') : null;
        
        // If no particle system exists, add one
        if (!particles && typeof ParticleSystem !== 'undefined') {
            particles = this.addModule(new ParticleSystem());
            
            // Configure for upgrade smoke effect
            particles.burst = true;
            particles.burstCount = 15;
            particles.autoPlay = false;
            particles.looping = false;
            particles.relativePositioning = false; // World-space particles
            
            // Smoke appearance
            particles.shape = 'circle';
            particles.startSize = 12;
            particles.endSize = 3;
            particles.startColor = this.turretColor; // Use turret color
            particles.endColor = '#888888';
            particles.fadeOut = true;
            particles.scaleOverLifetime = true;
            
            // Movement
            particles.startSpeed = 60;
            particles.emissionAngle = -90; // Upward
            particles.spread = 120; // Wide spread
            particles.gravity = -20; // Float upward slightly
            particles.particleLifetime = 0.8;
            particles.lifetimeVariation = 0.3;
            particles.speedVariation = 0.4;
            
            // Emitter area (around the turret)
            particles.emitterWidth = this.turretSize;
            particles.emitterHeight = this.turretSize * 0.5;
            
            // Max particles
            particles.maxParticles = 30;
        }
        
        if (particles) {
            // Update color to match turret (in case turret color changed)
            particles.startColor = this.turretColor;
            
            // Clear any existing particles and emit new burst
            particles.clear();
            particles.emit(15);
        }
    }
    
    // Get current stats for display
    getStats() {
        return {
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            level: this._upgradeLevel,
            maxLevel: this.maxUpgrades,
            nextUpgradeCost: this.getNextUpgradeCost(),
            sellValue: this.getSellValue()
        };
    }
    
    getSellValue() {
        // Calculate total invested and return 50%
        let totalInvested = this.cost;
        for (let i = 0; i < this._upgradeLevel; i++) {
            totalInvested += Math.floor(this.upgradeCost * Math.pow(this.upgradeCostMultiplier, i));
        }
        return Math.floor(totalInvested * 0.5);
    }
    
    // ==================== SELLING ====================
    
    /**
     * Play sell particle effect with gold dollar signs
     */
    playSellEffect() {
        // Check if we already have a particle system
        let particles = this.gameObject.getModule ? this.gameObject.getModule('ParticleSystem') : null;
        
        // If no particle system exists, add one
        if (!particles && typeof ParticleSystem !== 'undefined') {
            particles = this.addModule(new ParticleSystem());
        }
        
        if (particles) {
            // Configure for gold dollar sign effect
            particles.burst = true;
            particles.burstCount = 12;
            particles.autoPlay = false;
            particles.looping = false;
            particles.relativePositioning = false; // World-space particles
            
            // Gold dollar sign text particles
            particles.shape = 'text';
            particles.particleText = '$$$💰'; // Mix of dollar signs and money bag
            particles.fontSize = 18;
            particles.fontFamily = 'Arial';
            particles.fontWeight = 'bold';
            
            // Gold/yellow colors
            particles.startColor = '#ffd700'; // Gold
            particles.endColor = '#110f0aff'; // Darker gold/orange
            particles.fadeOut = true;
            particles.scaleOverLifetime = true;
            particles.startSize = 18;
            particles.endSize = 8;
            
            // Movement - float upward and spread out
            particles.startSpeed = 80;
            particles.emissionAngle = -90; // Upward
            particles.spread = 90; // Wide spread
            particles.gravity = -30; // Float upward
            particles.particleLifetime = 1.0;
            particles.lifetimeVariation = 0.3;
            particles.speedVariation = 0.5;
            
            // Emitter area
            particles.emitterWidth = this.turretSize * 1.5;
            particles.emitterHeight = this.turretSize * 0.5;
            
            // No rotation for text readability
            particles.rotateParticles = false;
            particles.randomRotation = false;
            
            // Max particles
            particles.maxParticles = 30;
            
            // Clear and emit
            particles.clear();
            particles.emit(12);
        }
    }
    
    sell() {
        const sellValue = this.getSellValue();
        
        // Play sell effect before destroying
        this.playSellEffect();
        
        if (this._gameManager) {
            this._gameManager.addMoney(sellValue);
        }
        
        //console.log('💰 Turret sold for', sellValue);
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onTurretSold', { turret: this, value: sellValue });
        }
        
        // Hide the turret visually but delay destruction so particles can render
        this.drawTurret = false;
        this.showRange = false;
        this.enabled = false; // Stop turret logic
        
        // Delay destruction to let particles finish
        setTimeout(() => {
            this.destroy();
        }, 1200); // Wait for particle lifetime + buffer
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDTurret';
        json.damage = this._baseDamage || this.damage;
        json.range = this._baseRange || this.range;
        json.fireRate = this._baseFireRate || this.fireRate;
        json.rotationSpeed = this.rotationSpeed;
        json.projectilePrefab = this.projectilePrefab;
        json.projectileSpeed = this.projectileSpeed;
        json.useProjectile = this.useProjectile;
        json.turretType = this.turretType;
        json.burstCount = this.burstCount;
        json.burstDelay = this.burstDelay;
        json.splashRadius = this.splashRadius;
        json.beamDuration = this.beamDuration;
        json.targetingMode = this.targetingMode;
        json.predictTarget = this.predictTarget;
        json.cost = this.cost;
        json.sellValue = this.sellValue;
        json.description = this.description;
        json.maxUpgrades = this.maxUpgrades;
        json.upgradeCost = this.upgradeCost;
        json.upgradeCostMultiplier = this.upgradeCostMultiplier;
        json.upgradeStatMultiplier = this.upgradeStatMultiplier;
        json.upgradeSizeIncrease = this.upgradeSizeIncrease;
        json._upgradeLevel = this._upgradeLevel;
        json.showRange = this.showRange;
        json.showRangeOnlyWhenSelected = this.showRangeOnlyWhenSelected;
        json.rangeColor = this.rangeColor;
        json.rangeBorderColor = this.rangeBorderColor;
        json.drawTurret = this.drawTurret;
        json.turretColor = this.turretColor;
        json.turretAccentColor = this.turretAccentColor;
        json.turretSize = this._baseTurretSize || this.turretSize;
        json.barrelLength = this.barrelLength;
        json.barrelWidth = this.barrelWidth;
        return json;
    }
    
    static fromJSON(json) {
        const module = new TDTurret();
        module.damage = json.damage ?? 25;
        module.range = json.range ?? 150;
        module.fireRate = json.fireRate ?? 1;
        module.rotationSpeed = json.rotationSpeed ?? 180;
        module.projectilePrefab = json.projectilePrefab ?? 'TDProjectile';
        module.projectileSpeed = json.projectileSpeed ?? 400;
        module.useProjectile = json.useProjectile ?? true;
        module.turretType = json.turretType ?? 'single';
        module.burstCount = json.burstCount ?? 3;
        module.burstDelay = json.burstDelay ?? 0.1;
        module.splashRadius = json.splashRadius ?? 50;
        module.beamDuration = json.beamDuration ?? 0.5;
        module.targetingMode = json.targetingMode ?? 'nearest';
        module.predictTarget = json.predictTarget ?? true;
        module.cost = json.cost ?? 50;
        module.sellValue = json.sellValue ?? 25;
        module.description = json.description ?? 'A basic defensive turret';
        module.maxUpgrades = json.maxUpgrades ?? 5;
        module.upgradeCost = json.upgradeCost ?? 30;
        module.upgradeCostMultiplier = json.upgradeCostMultiplier ?? 1.5;
        module.upgradeStatMultiplier = json.upgradeStatMultiplier ?? 0.2;
        module.upgradeSizeIncrease = json.upgradeSizeIncrease ?? 0.1;
        module._upgradeLevel = json._upgradeLevel ?? 0;
        module.showRange = json.showRange ?? true;
        module.showRangeOnlyWhenSelected = json.showRangeOnlyWhenSelected ?? true;
        module.rangeColor = json.rangeColor ?? 'rgba(0,255,0,0.2)';
        module.rangeBorderColor = json.rangeBorderColor ?? 'rgba(0,255,0,0.8)';
        module.drawTurret = json.drawTurret ?? true;
        module.turretColor = json.turretColor ?? '#4488ff';
        module.turretAccentColor = json.turretAccentColor ?? '#2266cc';
        module.turretSize = json.turretSize ?? 24;
        module.barrelLength = json.barrelLength ?? 20;
        module.barrelWidth = json.barrelWidth ?? 8;
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new TDTurret();
        cloned.damage = this.damage;
        cloned.range = this.range;
        cloned.fireRate = this.fireRate;
        cloned.rotationSpeed = this.rotationSpeed;
        cloned.projectilePrefab = this.projectilePrefab;
        cloned.projectileSpeed = this.projectileSpeed;
        cloned.useProjectile = this.useProjectile;
        cloned.turretType = this.turretType;
        cloned.burstCount = this.burstCount;
        cloned.burstDelay = this.burstDelay;
        cloned.splashRadius = this.splashRadius;
        cloned.beamDuration = this.beamDuration;
        cloned.targetingMode = this.targetingMode;
        cloned.predictTarget = this.predictTarget;
        cloned.cost = this.cost;
        cloned.sellValue = this.sellValue;
        cloned.description = this.description;
        cloned.maxUpgrades = this.maxUpgrades;
        cloned.upgradeCost = this.upgradeCost;
        cloned.upgradeCostMultiplier = this.upgradeCostMultiplier;
        cloned.upgradeStatMultiplier = this.upgradeStatMultiplier;
        cloned.upgradeSizeIncrease = this.upgradeSizeIncrease;
        cloned.showRange = this.showRange;
        cloned.showRangeOnlyWhenSelected = this.showRangeOnlyWhenSelected;
        cloned.rangeColor = this.rangeColor;
        cloned.rangeBorderColor = this.rangeBorderColor;
        cloned.drawTurret = this.drawTurret;
        cloned.turretColor = this.turretColor;
        cloned.turretAccentColor = this.turretAccentColor;
        cloned.turretSize = this.turretSize;
        cloned.barrelLength = this.barrelLength;
        cloned.barrelWidth = this.barrelWidth;
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDTurret = TDTurret;
}

if (typeof Module !== 'undefined') {
    Module.register('TDTurret', TDTurret);
}
