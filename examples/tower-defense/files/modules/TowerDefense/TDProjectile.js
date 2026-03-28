/**
 * TDProjectile Module
 * Tower Defense projectile behavior
 * Namespace: TowerDefense
 * 
 * Features:
 * - Homing towards target
 * - Splash damage support
 * - Visual customization
 * - Hit detection
 */

class TDProjectile extends Module {
    constructor() {
        super();
        
        // Movement
        this.speed = 400;
        this.homingStrength = 10; // How strongly it homes to target
        this.maxLifetime = 5; // Seconds before auto-destroy
        
        // Damage
        this.damage = 25;
        this.isSplash = false;
        this.splashRadius = 50;
        
        // Visual
        this.drawProjectile = true;
        this.projectileColor = '#ffcc00';
        this.projectileGlowColor = '#ff8800';
        this.projectileSize = 8;
        this.projectileShape = 'bullet'; // 'bullet', 'orb', 'arrow', 'missile', 'laser'
        this.showTrail = true;
        this.trailColor = 'rgba(255, 200, 100, 0.5)';
        this.trailLength = 12;
        
        // Internal
        this._target = null;
        this._targetPosition = null;
        this._velocityX = 0;
        this._velocityY = 0;
        this._lifetime = 0;
        this._trail = [];
        this._gameManager = null;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 40;
    
    static getIcon() {
        return '💥';
    }
    
    static getDescription() {
        return 'Projectile that homes towards enemies and deals damage';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === MOVEMENT ===
            _header_movement: { type: 'header', label: '💨 Movement' },
            speed: { 
                type: 'slider', 
                label: 'Speed', 
                default: 400, 
                min: 100, 
                max: 2000,
                hint: 'Pixels per second'
            },
            homingStrength: { 
                type: 'slider', 
                label: 'Homing Strength', 
                default: 10, 
                min: 0, 
                max: 50,
                hint: '0 = straight, higher = better tracking'
            },
            maxLifetime: { 
                type: 'number', 
                label: 'Max Lifetime', 
                default: 5, 
                min: 1, 
                max: 30,
                hint: 'Seconds before auto-destroy'
            },
            
            // === DAMAGE ===
            _header_damage: { type: 'header', label: '💥 Damage' },
            damage: { 
                type: 'number', 
                label: 'Damage', 
                default: 25, 
                min: 1, 
                max: 1000,
                hint: 'Damage dealt on hit'
            },
            isSplash: { 
                type: 'boolean', 
                label: 'Splash Damage', 
                default: false,
                hint: 'Deal area damage on impact'
            },
            splashRadius: { 
                type: 'slider', 
                label: 'Splash Radius', 
                default: 50, 
                min: 20, 
                max: 200,
                hint: 'Area of effect size'
            },
            
            // === APPEARANCE ===
            _header_appearance: { type: 'header', label: '🎨 Appearance' },
            drawProjectile: { 
                type: 'boolean', 
                label: 'Draw Projectile', 
                default: true,
                hint: 'Disable if using custom sprite'
            },
            projectileColor: { 
                type: 'color', 
                label: 'Primary Color', 
                default: '#ffcc00',
                hint: 'Main projectile color'
            },
            projectileGlowColor: {
                type: 'color',
                label: 'Glow Color',
                default: '#ff8800',
                hint: 'Outer glow effect color'
            },
            projectileSize: { 
                type: 'slider', 
                label: 'Size', 
                default: 8, 
                min: 3, 
                max: 30,
                hint: 'Visual size of projectile'
            },
            projectileShape: {
                type: 'select',
                label: 'Shape',
                default: 'bullet',
                options: ['bullet', 'orb', 'arrow', 'missile', 'laser'],
                hint: 'Visual style of the projectile'
            },
            
            // === TRAIL ===
            _header_trail: { type: 'header', label: '✨ Trail Effect' },
            showTrail: { 
                type: 'boolean', 
                label: 'Show Trail', 
                default: true 
            },
            trailColor: { 
                type: 'color', 
                label: 'Trail Color', 
                default: 'rgba(255, 200, 100, 0.5)' 
            },
            trailLength: { 
                type: 'slider', 
                label: 'Trail Length', 
                default: 12, 
                min: 3, 
                max: 30,
                hint: 'Number of trail segments'
            }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._lifetime = 0;
        this._trail = [];
        
        // Find game manager
        this._gameManager = TDGameManager.findManager();
        
        // Set initial velocity based on angle
        const angle = this.gameObject ? this.gameObject.angle : 0;
        this._velocityX = Math.cos(angle) * this.speed;
        this._velocityY = Math.sin(angle) * this.speed;
    }
    
    loop(deltaTime) {
        // Check if game is paused - allow during playing state
        if (this._gameManager) {
            const state = this._gameManager.getState();
            if (state === 'paused' || state === 'gameover' || state === 'victory') return;
        }
        
        this._lifetime += deltaTime;
        
        // Auto-destroy after lifetime
        if (this._lifetime >= this.maxLifetime) {
            this.destroy();
            return;
        }
        
        // Update trail (store world positions for proper drawing)
        if (this.showTrail) {
            const worldPos = this.worldPosition;
            this._trail.unshift({ x: worldPos.x, y: worldPos.y });
            if (this._trail.length > this.trailLength) {
                this._trail.pop();
            }
        }
        
        // Home towards target
        if (this._target) {
            const enemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
            
            if (!enemy || enemy.isDead()) {
                // Target is dead, destroy the projectile
                if (this.gameObject) {
                    instanceDestroy(this.gameObject);
                }
                return;
            } else {
                // Update target position using world coordinates
                const targetPos = this._target.worldPosition || 
                    (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
                this._targetPosition = { x: targetPos.x, y: targetPos.y };
            }
        }
        
        // Apply homing if we have a target position
        if (this._targetPosition && this.homingStrength > 0) {
            const myPos = this.worldPosition;
            const dx = this._targetPosition.x - myPos.x;
            const dy = this._targetPosition.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const targetAngle = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(this._velocityY, this._velocityX);
                
                let angleDiff = targetAngle - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                const newAngle = currentAngle + angleDiff * this.homingStrength * deltaTime;
                
                this._velocityX = Math.cos(newAngle) * this.speed;
                this._velocityY = Math.sin(newAngle) * this.speed;
            }
        }
        
        // Move
        this.x += this._velocityX * deltaTime;
        this.y += this._velocityY * deltaTime;
        
        // Update rotation to face direction
        if (this.gameObject) {
            this.gameObject.angle = Math.atan2(this._velocityY, this._velocityX);
        }
        
        // Check collision with target using world positions
        if (this._target) {
            const myPos = this.worldPosition;
            const targetPos = this._target.worldPosition || 
                (this._target.getWorldPosition ? this._target.getWorldPosition() : { x: this._target.x, y: this._target.y });
            const dist = Math.sqrt(
                Math.pow(targetPos.x - myPos.x, 2) + 
                Math.pow(targetPos.y - myPos.y, 2)
            );
            
            if (dist < 20) { // Hit radius
                this.onHit();
            }
        }
        
        // Check collision with any enemy if no target
        if (!this._target && this._gameManager) {
            const enemies = this._gameManager.getEnemies();
            const myPos = this.worldPosition;
            
            for (const enemy of enemies) {
                if (!enemy.gameObject || enemy.isDead()) continue;
                
                const enemyPos = enemy.gameObject.getWorldPosition ? 
                    enemy.gameObject.getWorldPosition() : { x: enemy.gameObject.x, y: enemy.gameObject.y };
                
                const dist = Math.sqrt(
                    Math.pow(enemyPos.x - myPos.x, 2) + 
                    Math.pow(enemyPos.y - myPos.y, 2)
                );
                
                if (dist < 20) {
                    this._target = enemy.gameObject;
                    this.onHit();
                    break;
                }
            }
        }
    }
    
    draw(ctx) {
        if (!this.drawProjectile) return;
        
        // Draw trail in world space (trail stores world positions)
        if (this.showTrail && this._trail && this._trail.length > 1) {
            // Switch to world-space drawing for trail
            this.drawUntethered(ctx);
            this.drawTrailEffect(ctx);
            // Return to object-space drawing
            this.drawTethered(ctx);
        }
        
        // Draw projectile body at local origin
        // Note: ctx is already translated and rotated by the engine to match object's world transform
        ctx.save();
        
        // Draw based on shape
        switch (this.projectileShape) {
            case 'orb':
                this.drawOrbProjectile(ctx);
                break;
            case 'arrow':
                this.drawArrowProjectile(ctx);
                break;
            case 'missile':
                this.drawMissileProjectile(ctx);
                break;
            case 'laser':
                this.drawLaserProjectile(ctx);
                break;
            case 'bullet':
            default:
                this.drawBulletProjectile(ctx);
        }
        
        ctx.restore();
    }
    
    drawTrailEffect(ctx) {
        ctx.save();
        
        // Draw gradient trail
        for (let i = 1; i < this._trail.length; i++) {
            const p1 = this._trail[i - 1];
            const p2 = this._trail[i];
            const alpha = 1 - (i / this._trail.length);
            const width = this.projectileSize * (1 - i / this._trail.length) * 0.8;
            
            ctx.strokeStyle = this.trailColor.includes('rgba') 
                ? this.trailColor.replace(/[\d.]+\)$/, `${alpha * 0.6})`)
                : `rgba(255, 200, 100, ${alpha * 0.5})`;
            ctx.lineWidth = Math.max(1, width);
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawBulletProjectile(ctx) {
        const size = this.projectileSize;
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
        glowGradient.addColorStop(0, this.projectileGlowColor || this.projectileColor);
        glowGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Main bullet body (elongated)
        const bulletGradient = ctx.createLinearGradient(0, -size, 0, size);
        bulletGradient.addColorStop(0, '#ffffff');
        bulletGradient.addColorStop(0.3, this.projectileColor);
        bulletGradient.addColorStop(1, this.darkenColor(this.projectileColor, 30));
        
        ctx.fillStyle = bulletGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.8, size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Core highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(size * 0.4, 0, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawOrbProjectile(ctx) {
        const size = this.projectileSize;
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2.5);
        glowGradient.addColorStop(0, this.projectileColor);
        glowGradient.addColorStop(0.4, this.projectileGlowColor || 'rgba(255, 200, 100, 0.5)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Main orb
        const orbGradient = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        orbGradient.addColorStop(0, '#ffffff');
        orbGradient.addColorStop(0.3, this.projectileColor);
        orbGradient.addColorStop(1, this.darkenColor(this.projectileColor, 40));
        
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner sparkle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-size * 0.25, -size * 0.25, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawArrowProjectile(ctx) {
        const size = this.projectileSize;
        
        ctx.fillStyle = this.projectileColor;
        ctx.strokeStyle = this.darkenColor(this.projectileColor, 30);
        ctx.lineWidth = 1;
        
        // Arrow shape
        ctx.beginPath();
        ctx.moveTo(size * 2, 0);
        ctx.lineTo(size * 0.5, -size * 0.5);
        ctx.lineTo(size * 0.5, -size * 0.2);
        ctx.lineTo(-size * 1.5, -size * 0.2);
        ctx.lineTo(-size * 1.5, size * 0.2);
        ctx.lineTo(size * 0.5, size * 0.2);
        ctx.lineTo(size * 0.5, size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Fletching
        ctx.fillStyle = '#cc4444';
        ctx.beginPath();
        ctx.moveTo(-size * 1.5, 0);
        ctx.lineTo(-size * 2, -size * 0.6);
        ctx.lineTo(-size * 1.2, 0);
        ctx.lineTo(-size * 2, size * 0.6);
        ctx.closePath();
        ctx.fill();
    }
    
    drawMissileProjectile(ctx) {
        const size = this.projectileSize;
        
        // Exhaust flame
        const flameGradient = ctx.createRadialGradient(-size * 1.5, 0, 0, -size * 1.5, 0, size * 1.5);
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.2, '#ffff00');
        flameGradient.addColorStop(0.5, '#ff6600');
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.ellipse(-size * 1.2, 0, size * 1.2 + Math.random() * size * 0.3, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Missile body
        const bodyGradient = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
        bodyGradient.addColorStop(0, '#888888');
        bodyGradient.addColorStop(0.5, '#666666');
        bodyGradient.addColorStop(1, '#444444');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.roundRect(-size * 0.8, -size * 0.4, size * 2, size * 0.8, size * 0.2);
        ctx.fill();
        
        // Nose cone
        ctx.fillStyle = this.projectileColor;
        ctx.beginPath();
        ctx.moveTo(size * 1.8, 0);
        ctx.lineTo(size * 1.2, -size * 0.4);
        ctx.lineTo(size * 1.2, size * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // Fins
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size * 0.4);
        ctx.lineTo(-size * 0.8, -size * 0.8);
        ctx.lineTo(-size * 0.2, -size * 0.4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, size * 0.4);
        ctx.lineTo(-size * 0.8, size * 0.8);
        ctx.lineTo(-size * 0.2, size * 0.4);
        ctx.fill();
    }
    
    drawLaserProjectile(ctx) {
        const size = this.projectileSize;
        
        // Outer glow
        ctx.strokeStyle = this.projectileGlowColor || 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = size * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-size * 2, 0);
        ctx.lineTo(size * 2, 0);
        ctx.stroke();
        
        // Core beam
        ctx.strokeStyle = this.projectileColor;
        ctx.lineWidth = size * 0.8;
        ctx.stroke();
        
        // Inner white core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.3;
        ctx.stroke();
    }
    
    // Color helper
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
    
    // ==================== TARGET MANAGEMENT ====================
    
    setTarget(target) {
        this._target = target;
        if (target) {
            // Use world positions for proper targeting
            const targetPos = target.worldPosition || 
                (target.getWorldPosition ? target.getWorldPosition() : { x: target.x, y: target.y });
            this._targetPosition = { x: targetPos.x, y: targetPos.y };
            
            // Set initial velocity towards target using world positions
            const myPos = this.worldPosition;
            const dx = targetPos.x - myPos.x;
            const dy = targetPos.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                this._velocityX = (dx / dist) * this.speed;
                this._velocityY = (dy / dist) * this.speed;
            }
        }
    }
    
    // ==================== HIT HANDLING ====================
    
    onHit() {
        if (this.isSplash) {
            this.dealSplashDamage();
        } else {
            this.dealDirectDamage();
        }
        
        // Destroy projectile
        this.destroy();
    }
    
    dealDirectDamage() {
        if (!this._target) return;
        
        const enemy = this._target.getModule ? this._target.getModule('TDEnemy') : null;
        if (enemy) {
            enemy.takeDamage(this.damage);
        }
    }
    
    dealSplashDamage() {
        if (!this._gameManager) return;
        
        const enemies = this._gameManager.getEnemies();
        const myPos = this.worldPosition;
        
        for (const enemy of enemies) {
            if (!enemy.gameObject || enemy.isDead()) continue;
            
            const enemyPos = enemy.gameObject.getWorldPosition ? 
                enemy.gameObject.getWorldPosition() : { x: enemy.gameObject.x, y: enemy.gameObject.y };
            
            const dx = enemyPos.x - myPos.x;
            const dy = enemyPos.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= this.splashRadius) {
                // Damage falls off with distance
                const falloff = 1 - (dist / this.splashRadius);
                const splashDamage = this.damage * Math.max(0.2, falloff); // Minimum 20% damage
                enemy.takeDamage(splashDamage);
            }
        }
        
        // Draw splash effect (visual feedback)
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onSplashExplosion', {
                x: myPos.x,
                y: myPos.y,
                radius: this.splashRadius
            });
        }
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDProjectile';
        json.speed = this.speed;
        json.homingStrength = this.homingStrength;
        json.maxLifetime = this.maxLifetime;
        json.damage = this.damage;
        json.isSplash = this.isSplash;
        json.splashRadius = this.splashRadius;
        json.drawProjectile = this.drawProjectile;
        json.projectileColor = this.projectileColor;
        json.projectileSize = this.projectileSize;
        json.showTrail = this.showTrail;
        json.trailColor = this.trailColor;
        json.trailLength = this.trailLength;
        return json;
    }
    
    static fromJSON(json) {
        const module = new TDProjectile();
        module.speed = json.speed ?? 400;
        module.homingStrength = json.homingStrength ?? 10;
        module.maxLifetime = json.maxLifetime ?? 5;
        module.damage = json.damage ?? 25;
        module.isSplash = json.isSplash ?? false;
        module.splashRadius = json.splashRadius ?? 50;
        module.drawProjectile = json.drawProjectile ?? true;
        module.projectileColor = json.projectileColor ?? '#ffff00';
        module.projectileSize = json.projectileSize ?? 6;
        module.showTrail = json.showTrail ?? true;
        module.trailColor = json.trailColor ?? 'rgba(255,255,0,0.5)';
        module.trailLength = json.trailLength ?? 10;
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new TDProjectile();
        cloned.speed = this.speed;
        cloned.homingStrength = this.homingStrength;
        cloned.maxLifetime = this.maxLifetime;
        cloned.damage = this.damage;
        cloned.isSplash = this.isSplash;
        cloned.splashRadius = this.splashRadius;
        cloned.drawProjectile = this.drawProjectile;
        cloned.projectileColor = this.projectileColor;
        cloned.projectileSize = this.projectileSize;
        cloned.showTrail = this.showTrail;
        cloned.trailColor = this.trailColor;
        cloned.trailLength = this.trailLength;
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDProjectile = TDProjectile;
}

if (typeof Module !== 'undefined') {
    Module.register('TDProjectile', TDProjectile);
}
