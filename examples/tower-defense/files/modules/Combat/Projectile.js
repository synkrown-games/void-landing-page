/**
 * Projectile Module
 * Moves a game object forward at a given speed along its angle.
 * Supports lifetime, gravity, piercing, damage, and auto-destruction.
 * Can be added to any prefab used as a bullet / arrow / rocket.
 */

class Projectile extends Module {
    constructor() {
        super();

        // Movement
        this.speed = 600;               // Pixels per second
        this.angle = 0;                 // Degrees – set by the gun at fire time
        this.useObjectAngle = true;     // If true, reads gameObject.angle instead of this.angle
        this.inheritRotation = true;    // Keep rotating to match travel direction

        // Gravity
        this.gravity = 0;              // Pixels/sec² (0 = straight line)

        // Lifetime
        this.lifetime = 5;             // Seconds before auto-destroy (0 = infinite)
        this.destroyOffscreen = false;  // Destroy when off-screen
        this.offscreenMargin = 100;    // Extra pixels beyond viewport before destroying

        // Combat
        this.damage = 10;              // Damage dealt on hit
        this.piercing = false;         // If true, doesn't destroy on first hit
        this.maxPierceCount = 3;       // Max objects to pierce through
        this.hitTag = '';              // Only hit objects with this tag (empty = hit anything)
        this.hitRadius = 4;            // Simple circle collision radius (0 = use object size)

        // Visual trail
        this.drawTrail = false;
        this.trailLength = 6;          // Number of past positions to store
        this.trailColor = '#ffff88';
        this.trailWidth = 2;

        // Internal state
        this._velocityX = 0;
        this._velocityY = 0;
        this._aliveTime = 0;
        this._pierceCount = 0;
        this._hitObjects = [];
        this._trail = [];
        this._started = false;
    }

    // ==================== MODULE METADATA ====================
    static namespace = 'Combat,Movement';
    static is2D = true;
    static priority = 0;

    static getIcon() {
        return '🔹';
    }

    static getDescription() {
        return 'Moves an object as a projectile: straight-line or arc with optional gravity, lifetime, and hit detection.';
    }

    // ==================== EDITABLE PROPERTIES ====================

    getPropertyMetadata() {
        return [
            // Movement
            { type: 'groupStart', label: '🚀 Movement' },
            { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5000, hint: 'Pixels per second' },
            { key: 'useObjectAngle', label: 'Use Object Angle', type: 'boolean', hint: 'Read angle from gameObject.angle instead of this property' },
            { key: 'angle', label: 'Angle (°)', type: 'number', min: -360, max: 360, showIf: { useObjectAngle: false } },
            { key: 'inheritRotation', label: 'Rotate to Face Travel', type: 'boolean' },
            { key: 'gravity', label: 'Gravity', type: 'number', min: 0, max: 2000, hint: '0 for straight line' },
            { type: 'groupEnd' },

            // Lifetime
            { type: 'groupStart', label: '⏱️ Lifetime' },
            { key: 'lifetime', label: 'Lifetime (s)', type: 'number', min: 0, max: 60, hint: '0 = infinite' },
            { key: 'destroyOffscreen', label: 'Destroy Offscreen', type: 'boolean' },
            { key: 'offscreenMargin', label: 'Offscreen Margin', type: 'number', min: 0, max: 500, showIf: { destroyOffscreen: true } },
            { type: 'groupEnd' },

            // Combat
            { type: 'groupStart', label: '⚔️ Combat' },
            { key: 'damage', label: 'Damage', type: 'number', min: 0, max: 10000 },
            { key: 'hitTag', label: 'Hit Tag', type: 'text', hint: 'Only hit objects with this tag (empty = all)' },
            { key: 'hitRadius', label: 'Hit Radius', type: 'number', min: 0, max: 100 },
            { key: 'piercing', label: 'Piercing', type: 'boolean' },
            { key: 'maxPierceCount', label: 'Max Pierce', type: 'number', min: 1, max: 50, showIf: { piercing: true } },
            { type: 'groupEnd' },

            // Trail
            { type: 'groupStart', label: '✨ Trail' },
            { key: 'drawTrail', label: 'Draw Trail', type: 'boolean' },
            { key: 'trailLength', label: 'Trail Length', type: 'number', min: 2, max: 30, showIf: { drawTrail: true } },
            { key: 'trailColor', label: 'Trail Color', type: 'color', showIf: { drawTrail: true } },
            { key: 'trailWidth', label: 'Trail Width', type: 'number', min: 1, max: 10, showIf: { drawTrail: true } },
            { type: 'groupEnd' },
        ];
    }

    // ==================== LIFECYCLE ====================

    start() {
        this._aliveTime = 0;
        this._pierceCount = 0;
        this._hitObjects = [];
        this._trail = [];
        this._started = true;

        // Calculate initial velocity
        const deg = this.useObjectAngle ? (this.gameObject.angle || 0) : this.angle;
        const rad = deg * Math.PI / 180;
        this._velocityX = Math.cos(rad) * this.speed;
        this._velocityY = Math.sin(rad) * this.speed;
    }

    loop(deltaTime) {
        if (!this._started) {
            this.start();
        }

        const pos = this.gameObject.position;

        // Store trail position
        if (this.drawTrail) {
            this._trail.push({ x: pos.x, y: pos.y });
            if (this._trail.length > this.trailLength) {
                this._trail.shift();
            }
        }

        // Apply gravity
        if (this.gravity > 0) {
            this._velocityY += this.gravity * deltaTime;
        }

        // Move
        pos.x += this._velocityX * deltaTime;
        pos.y += this._velocityY * deltaTime;

        // Rotate to face travel direction
        if (this.inheritRotation && (this._velocityX !== 0 || this._velocityY !== 0)) {
            this.gameObject.angle = Math.atan2(this._velocityY, this._velocityX) * 180 / Math.PI;
        }

        // Lifetime check
        this._aliveTime += deltaTime;
        if (this.lifetime > 0 && this._aliveTime >= this.lifetime) {
            this._destroy();
            return;
        }

        // Offscreen check
        if (this.destroyOffscreen) {
            const engine = this.gameObject._engine;
            if (engine) {
                const cam = engine.camera || { x: 0, y: 0 };
                const vw = engine.viewportWidth || engine.width || 800;
                const vh = engine.viewportHeight || engine.height || 600;
                const m = this.offscreenMargin;
                if (pos.x < cam.x - m || pos.x > cam.x + vw + m ||
                    pos.y < cam.y - m || pos.y > cam.y + vh + m) {
                    this._destroy();
                    return;
                }
            }
        }

        // Hit detection
        if (this.hitRadius > 0) {
            this._checkHits();
        }
    }

    draw(ctx) {
        if (!this.drawTrail || this._trail.length < 2) return;

        ctx.save();
        this.drawUntethered(ctx);

        ctx.strokeStyle = this.trailColor;
        ctx.lineWidth = this.trailWidth;
        ctx.lineCap = 'round';

        for (let i = 1; i < this._trail.length; i++) {
            const alpha = i / this._trail.length;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.moveTo(this.x + this._trail[i - 1].x, this.y + this._trail[i - 1].y);
            ctx.lineTo(this.x + this._trail[i].x, this.y + this._trail[i].y);
            ctx.stroke();
        }

        this.drawTethered(ctx);
        ctx.restore();
    }

    // ==================== HIT DETECTION ====================

    _checkHits() {
        const engine = this.gameObject._engine;
        if (!engine || !engine.instances) return;

        const px = this.gameObject.position.x;
        const py = this.gameObject.position.y;
        const r = this.hitRadius;

        for (let i = 0; i < engine.instances.length; i++) {
            const other = engine.instances[i];
            if (other === this.gameObject) continue;
            if (this._hitObjects.indexOf(other) >= 0) continue;

            // Tag filter
            if (this.hitTag && other.tag !== this.hitTag) continue;

            // Simple circle-point check
            const ox = other.position.x;
            const oy = other.position.y;
            const dx = px - ox;
            const dy = py - oy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const otherRadius = (other.width || other.hitboxRadius || 16) * 0.5;

            if (dist < r + otherRadius) {
                this._onHit(other);
                if (!this.piercing || this._pierceCount >= this.maxPierceCount) {
                    this._destroy();
                    return;
                }
            }
        }
    }

    _onHit(target) {
        this._hitObjects.push(target);
        this._pierceCount++;

        // Try to deal damage via common patterns
        if (target.getModule) {
            const health = target.getModule('Health') || target.getModule('ProceduralCreature');
            if (health && typeof health.takeDamage === 'function') {
                health.takeDamage(this.damage);
            }
        }

        // Fire a custom event if the engine supports it
        if (this.gameObject._engine && typeof this.gameObject._engine.emit === 'function') {
            this.gameObject._engine.emit('projectileHit', {
                projectile: this.gameObject,
                target: target,
                damage: this.damage
            });
        }
    }

    _destroy() {
        const engine = this.gameObject._engine;
        if (engine) {
            if (typeof engine.instanceDestroy === 'function') {
                engine.instanceDestroy(this.gameObject);
            } else {
                const idx = engine.instances.indexOf(this.gameObject);
                if (idx >= 0) engine.instances.splice(idx, 1);
            }
        }
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON();
        json.type = 'Projectile';

        json.speed = this.speed;
        json.angle = this.angle;
        json.useObjectAngle = this.useObjectAngle;
        json.inheritRotation = this.inheritRotation;
        json.gravity = this.gravity;

        json.lifetime = this.lifetime;
        json.destroyOffscreen = this.destroyOffscreen;
        json.offscreenMargin = this.offscreenMargin;

        json.damage = this.damage;
        json.piercing = this.piercing;
        json.maxPierceCount = this.maxPierceCount;
        json.hitTag = this.hitTag;
        json.hitRadius = this.hitRadius;

        json.drawTrail = this.drawTrail;
        json.trailLength = this.trailLength;
        json.trailColor = this.trailColor;
        json.trailWidth = this.trailWidth;

        return json;
    }

    static fromJSON(json) {
        const module = new Projectile();
        module.enabled = json.enabled ?? true;

        module.speed = json.speed ?? 600;
        module.angle = json.angle ?? 0;
        module.useObjectAngle = json.useObjectAngle ?? true;
        module.inheritRotation = json.inheritRotation ?? true;
        module.gravity = json.gravity ?? 0;

        module.lifetime = json.lifetime ?? 5;
        module.destroyOffscreen = json.destroyOffscreen ?? true;
        module.offscreenMargin = json.offscreenMargin ?? 100;

        module.damage = json.damage ?? 10;
        module.piercing = json.piercing ?? false;
        module.maxPierceCount = json.maxPierceCount ?? 3;
        module.hitTag = json.hitTag ?? '';
        module.hitRadius = json.hitRadius ?? 4;

        module.drawTrail = json.drawTrail ?? false;
        module.trailLength = json.trailLength ?? 6;
        module.trailColor = json.trailColor ?? '#ffff88';
        module.trailWidth = json.trailWidth ?? 2;

        return module;
    }

    clone() {
        const cloned = new Projectile();
        cloned.enabled = this.enabled;

        cloned.speed = this.speed;
        cloned.angle = this.angle;
        cloned.useObjectAngle = this.useObjectAngle;
        cloned.inheritRotation = this.inheritRotation;
        cloned.gravity = this.gravity;

        cloned.lifetime = this.lifetime;
        cloned.destroyOffscreen = this.destroyOffscreen;
        cloned.offscreenMargin = this.offscreenMargin;

        cloned.damage = this.damage;
        cloned.piercing = this.piercing;
        cloned.maxPierceCount = this.maxPierceCount;
        cloned.hitTag = this.hitTag;
        cloned.hitRadius = this.hitRadius;

        cloned.drawTrail = this.drawTrail;
        cloned.trailLength = this.trailLength;
        cloned.trailColor = this.trailColor;
        cloned.trailWidth = this.trailWidth;

        return cloned;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.Projectile = Projectile;
}

if (typeof Module !== 'undefined' && Module.register) {
    Module.register('Projectile', Projectile);
}
