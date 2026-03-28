/**
 * ProceduralCreatureBasicTarget Module
 * A lightweight target module for objects that can be attacked by ProceduralCreatureBrain
 * without needing the full ProceduralCreature module.
 * 
 * Use this for:
 * - Flags/bases in capture-the-flag style games
 * - Destructible objects that creatures should attack
 * - Stationary targets with health
 * - Any object that should participate in the family/enemy grouping system
 * - Resource gathering (trees, rocks, etc.) with drop tables
 * - Objects that scale with health (shrinking trees)
 * - Respawning resources with health regeneration
 */

class ProceduralCreatureBasicTarget extends Module {
    static namespace = "AI,Procedural";
    static allowMultiple = false;
    static color = "#6b3f2fff";

    static getIcon() {
        return '🎯';
    }

    static getDescription() {
        return 'Lightweight target for ProceduralCreatures: health, groupings, resource drops, scaling, regen';
    }

    constructor() {
        super();

        // ==================== HEALTH ====================
        this.maxHealth = 100;
        this.health = 100;
        this.isDead = false;
        this.destroyOnDeath = false; // Should the object be destroyed when health reaches 0?
        this.deathDelay = 0.5; // Seconds to wait before destroying (for death effects)

        // ==================== HEALTH REGENERATION ====================
        this.enableHealthRegen = false; // Enable health regeneration over time
        this.healthRegenRate = 5; // Health points per second
        this.healthRegenDelay = 5.0; // Seconds after taking damage before regen starts
        this.reviveWhenFullyHealed = true; // Revive if dead and health regens to full
        this._lastDamageTimeForRegen = 0; // Internal: tracks when last damaged for regen delay

        // ==================== SCALE BASED ON HEALTH ====================
        this.scaleWithHealth = false; // Scale object size based on health %
        this.minHealthScale = 0.3; // Minimum scale when health is 0
        this.maxHealthScale = 1.0; // Maximum scale when health is full
        this._originalScale = null; // Internal: stores original scale

        // ==================== SHRINK ON DEATH ====================
        this.shrinkOnDeath = false; // Shrink the object when it dies
        this.shrinkRate = 0.5; // Scale units per second to shrink
        this.shrinkMinScale = 0.1; // Minimum scale before destroying
        this.destroyAfterShrink = true; // Destroy object after shrinking to min
        this._isShrinking = false; // Internal: currently shrinking

        // ==================== RESOURCE DROPS ====================
        this.dropsOnDamage = []; // [{prefab: 'Wood', chance: 0.5, minCount: 1, maxCount: 2}]
        this.dropsOnDeath = []; // [{prefab: 'BigWood', chance: 1.0, minCount: 3, maxCount: 5}]
        this.dropSpreadRadius = 30; // How far drops spread from center
        this.dropOffsetY = 0; // Y offset for drop spawn position

        // ==================== FAMILY/ENEMY GROUPINGS ====================
        // Family tags define what group this target belongs to
        // Creatures with matching tags in their friendlyTags won't attack this
        this.familyTags = []; // e.g., ['team_red', 'ally']
        
        // Enemy tags define what groups are hostile to this target
        // Creatures with matching tags in their hostileTags or the target's tags will attack
        this.enemyTags = []; // e.g., ['team_blue', 'enemy']

        // ==================== VISUAL FEEDBACK ====================
        this.showHealthCircle = true;
        this.healthCircleRadius = 20;
        this.healthCircleLineWidth = 3;
        this.healthCircleOffsetY = 0;
        this.healthCircleFullColor = '#44ff44'; // Green when full
        this.healthCircleLowColor = '#ff4444'; // Red when low
        this.healthCircleAlpha = 0.7;

        // Flash effect when damaged
        this.flashOnDamage = true;
        this.flashDuration = 0.15;
        this._flashTimer = 0;
        this._isFlashing = false;

        // ==================== EVENTS ====================
        this.onDamageEvent = ''; // Event to emit when damaged (receives {damage, source})
        this.onDeathEvent = ''; // Event to emit when killed (receives {killer})

        // ==================== INTERNAL STATE ====================
        this._lastDamageTime = 0;
        this._lastDamageSource = null;
        this._deathTimer = 0;
        this._originalAlpha = null;
    }

    getPropertyMetadata() {
        return [
            // Health
            { type: 'groupStart', label: '❤️ Health' },
                { key: 'maxHealth', label: 'Max Health', type: 'number', min: 1, max: 10000, hint: 'Maximum health points' },
                { key: 'health', label: 'Current Health', type: 'number', min: 0, max: 10000, hint: 'Current health (set at start)' },
                { key: 'destroyOnDeath', label: 'Destroy On Death', type: 'boolean', hint: 'Destroy the object when health reaches 0' },
                { key: 'deathDelay', label: 'Death Delay', type: 'number', min: 0, max: 10, step: 0.1, showIf: (m) => m.destroyOnDeath && !m.shrinkOnDeath, hint: 'Seconds before destruction' },
            { type: 'groupEnd' },

            // Health Regeneration
            { type: 'groupStart', label: '🌱 Health Regeneration' },
                { type: 'hint', hint: 'Allow the target to regenerate health over time (e.g., for respawning resources like trees)' },
                { key: 'enableHealthRegen', label: 'Enable Regen', type: 'boolean' },
                { key: 'healthRegenRate', label: 'Regen Rate', type: 'number', min: 0.1, max: 100, step: 0.1, showIf: { enableHealthRegen: true }, hint: 'Health points per second' },
                { key: 'healthRegenDelay', label: 'Regen Delay', type: 'number', min: 0, max: 60, step: 0.5, showIf: { enableHealthRegen: true }, hint: 'Seconds after damage before regen starts' },
                { key: 'reviveWhenFullyHealed', label: 'Revive When Full', type: 'boolean', showIf: { enableHealthRegen: true }, hint: 'Revive if dead and health regens to max' },
            { type: 'groupEnd' },

            // Scale With Health
            { type: 'groupStart', label: '📈 Scale With Health' },
                { type: 'hint', hint: 'Scale the object size based on health % (e.g., tree shrinks as harvested)' },
                { key: 'scaleWithHealth', label: 'Scale With Health', type: 'boolean' },
                { key: 'minHealthScale', label: 'Min Scale', type: 'slider', min: 0.1, max: 1, step: 0.05, showIf: { scaleWithHealth: true }, hint: 'Scale at 0% health' },
                { key: 'maxHealthScale', label: 'Max Scale', type: 'slider', min: 0.5, max: 2, step: 0.05, showIf: { scaleWithHealth: true }, hint: 'Scale at 100% health' },
            { type: 'groupEnd' },

            // Shrink On Death
            { type: 'groupStart', label: '📉 Shrink On Death' },
                { type: 'hint', hint: 'Animate shrinking when the target dies' },
                { key: 'shrinkOnDeath', label: 'Shrink On Death', type: 'boolean' },
                { key: 'shrinkRate', label: 'Shrink Rate', type: 'number', min: 0.1, max: 5, step: 0.1, showIf: { shrinkOnDeath: true }, hint: 'Scale units per second' },
                { key: 'shrinkMinScale', label: 'Min Scale', type: 'slider', min: 0, max: 0.5, step: 0.05, showIf: { shrinkOnDeath: true }, hint: 'Minimum scale before destroying' },
                { key: 'destroyAfterShrink', label: 'Destroy After Shrink', type: 'boolean', showIf: { shrinkOnDeath: true } },
            { type: 'groupEnd' },

            // Resource Drops
            { type: 'groupStart', label: '📦 Resource Drops' },
                { type: 'hint', hint: 'Spawn prefabs when damaged or killed (for resource gathering)' },
                { key: 'dropsOnDamage', label: 'Drops On Damage', type: 'array', elementType: 'prefab', defaultValue: { prefab: '', chance: 0.5, minCount: 1, maxCount: 1 }, hint: 'Prefabs to spawn when damaged' },
                { key: 'dropsOnDeath', label: 'Drops On Death', type: 'array', elementType: 'prefab', defaultValue: { prefab: '', chance: 1.0, minCount: 1, maxCount: 3 }, hint: 'Prefabs to spawn when killed' },
                { key: 'dropSpreadRadius', label: 'Drop Spread', type: 'number', min: 0, max: 100, hint: 'How far drops spread from center' },
                { key: 'dropOffsetY', label: 'Drop Y Offset', type: 'number', min: -100, max: 100, hint: 'Vertical offset for drop position' },
            { type: 'groupEnd' },

            // Family/Enemy Groupings
            { type: 'groupStart', label: '👥 Family & Enemy Groups' },
                { type: 'hint', hint: 'Define which groups this target belongs to and which groups are hostile' },
                { key: 'familyTags', label: 'Family Tags', type: 'array', elementType: 'text', defaultValue: '', hint: 'Groups this target belongs to (friendly creatures share these)' },
                { key: 'enemyTags', label: 'Enemy Tags', type: 'array', elementType: 'text', defaultValue: '', hint: 'Groups that are hostile to this target' },
            { type: 'groupEnd' },

            // Visual Feedback
            { type: 'groupStart', label: '🎨 Visual Feedback' },
                { key: 'showHealthCircle', label: 'Show Health Circle', type: 'boolean' },
                { key: 'healthCircleRadius', label: 'Circle Radius', type: 'number', min: 5, max: 100, showIf: { showHealthCircle: true } },
                { key: 'healthCircleLineWidth', label: 'Circle Line Width', type: 'number', min: 1, max: 10, showIf: { showHealthCircle: true } },
                { key: 'healthCircleOffsetY', label: 'Circle Y Offset', type: 'number', min: -100, max: 100, showIf: { showHealthCircle: true } },
                { key: 'healthCircleFullColor', label: 'Full Health Color', type: 'color', showIf: { showHealthCircle: true } },
                { key: 'healthCircleLowColor', label: 'Low Health Color', type: 'color', showIf: { showHealthCircle: true } },
                { key: 'healthCircleAlpha', label: 'Circle Alpha', type: 'slider', min: 0.1, max: 1, step: 0.05, showIf: { showHealthCircle: true } },
                { key: 'flashOnDamage', label: 'Flash On Damage', type: 'boolean' },
                { key: 'flashDuration', label: 'Flash Duration', type: 'number', min: 0.05, max: 1, step: 0.05, showIf: { flashOnDamage: true } },
            { type: 'groupEnd' },

            // Events
            { type: 'groupStart', label: '📢 Events' },
                { key: 'onDamageEvent', label: 'On Damage Event', type: 'text', hint: 'Event name to emit when damaged' },
                { key: 'onDeathEvent', label: 'On Death Event', type: 'text', hint: 'Event name to emit when killed' },
            { type: 'groupEnd' },
        ];
    }

    // ==================== LIFECYCLE ====================

    start() {
        // Ensure health doesn't exceed max
        this.health = Math.min(this.health, this.maxHealth);
        
        // Ensure arrays are arrays
        if (!Array.isArray(this.familyTags)) {
            this.familyTags = this.familyTags ? [this.familyTags] : [];
        }
        if (!Array.isArray(this.enemyTags)) {
            this.enemyTags = this.enemyTags ? [this.enemyTags] : [];
        }
        if (!Array.isArray(this.dropsOnDamage)) {
            this.dropsOnDamage = [];
        }
        if (!Array.isArray(this.dropsOnDeath)) {
            this.dropsOnDeath = [];
        }
        
        // Store original scale for scale-with-health feature
        this._originalScale = {
            x: this.gameObject.scale?.x ?? 1,
            y: this.gameObject.scale?.y ?? 1
        };
        
        console.log(`[BasicTarget] ${this.gameObject.name || 'Target'} initialized - health: ${this.health}/${this.maxHealth}, familyTags: [${this.familyTags.join(', ')}], enemyTags: [${this.enemyTags.join(', ')}]`);
    }

    loop(deltaTime) {
        // Handle shrinking on death
        if (this._isShrinking) {
            this._updateShrink(deltaTime);
            return; // Don't process other logic while shrinking
        }
        
        // Handle death (non-shrink)
        if (this.isDead && this.destroyOnDeath && !this.shrinkOnDeath) {
            this._deathTimer += deltaTime;
            if (this._deathTimer >= this.deathDelay) {
                this.gameObject.destroy();
                return;
            }
        }

        // Handle flash effect
        if (this._isFlashing) {
            this._flashTimer -= deltaTime;
            if (this._flashTimer <= 0) {
                this._isFlashing = false;
                // Restore original alpha
                if (this._originalAlpha !== null) {
                    this.gameObject.alpha = this._originalAlpha;
                    this._originalAlpha = null;
                }
            }
        }
        
        // Handle health regeneration
        if (this.enableHealthRegen) {
            this._updateHealthRegen(deltaTime);
        }
        
        // Update scale based on health
        if (this.scaleWithHealth && !this.isDead) {
            this._updateHealthScale();
        }
    }

    /**
     * Update shrinking animation on death
     */
    _updateShrink(deltaTime) {
        const currentScale = this.gameObject.scale?.x ?? 1;
        const newScale = currentScale - this.shrinkRate * deltaTime;
        
        if (newScale <= this.shrinkMinScale) {
            this.gameObject.scale = { x: this.shrinkMinScale, y: this.shrinkMinScale };
            this._isShrinking = false;
            
            if (this.destroyAfterShrink) {
                this.gameObject.destroy();
            }
        } else {
            this.gameObject.scale = { x: newScale, y: newScale };
        }
    }

    /**
     * Update health regeneration
     */
    _updateHealthRegen(deltaTime) {
        const now = performance.now() / 1000;
        const timeSinceDamage = now - this._lastDamageTimeForRegen;
        
        // Wait for regen delay
        if (timeSinceDamage < this.healthRegenDelay) return;
        
        // Don't regen if at max health
        if (this.health >= this.maxHealth) return;
        
        // Don't regen if dead (unless revive is enabled)
        if (this.isDead && !this.reviveWhenFullyHealed) return;
        
        // Regenerate health
        this.health = Math.min(this.health + this.healthRegenRate * deltaTime, this.maxHealth);
        
        // Revive if fully healed
        if (this.isDead && this.reviveWhenFullyHealed && this.health >= this.maxHealth) {
            this.revive(1.0);
        }
    }

    /**
     * Update object scale based on current health percentage
     */
    _updateHealthScale() {
        if (!this._originalScale) return;
        
        const healthPercent = this.health / this.maxHealth;
        const scaleRange = this.maxHealthScale - this.minHealthScale;
        const currentScale = this.minHealthScale + scaleRange * healthPercent;
        
        this.gameObject.scale = {
            x: this._originalScale.x * currentScale,
            y: this._originalScale.y * currentScale
        };
    }

    draw(ctx) {
        if (!this.showHealthCircle || this.isDead) return;
        
        const pos = { x: 0, y: 0 };//this.gameObject.getWorldPosition();
        const healthPercent = this.health / this.maxHealth;
        
        // Interpolate color from low (red) to full (green) based on health
        const healthColor = this._lerpColor(this.healthCircleLowColor, this.healthCircleFullColor, healthPercent);
        
        ctx.save();
        ctx.globalAlpha = this.healthCircleAlpha;
        
        // Draw health circle
        ctx.strokeStyle = healthColor;
        ctx.lineWidth = this.healthCircleLineWidth;
        ctx.beginPath();
        ctx.arc(
            pos.x,
            pos.y + this.healthCircleOffsetY,
            this.healthCircleRadius,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        
        // Optional: draw partial circle showing exact health (like a progress ring)
        if (healthPercent < 1) {
            ctx.globalAlpha = this.healthCircleAlpha * 0.3;
            ctx.strokeStyle = this.healthCircleLowColor;
            ctx.beginPath();
            ctx.arc(
                pos.x,
                pos.y + this.healthCircleOffsetY,
                this.healthCircleRadius,
                -Math.PI / 2, // Start from top
                -Math.PI / 2 + (1 - healthPercent) * Math.PI * 2 // Draw missing health portion
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Linearly interpolate between two hex colors
     * @param {string} color1 - Start color (hex)
     * @param {string} color2 - End color (hex)
     * @param {number} t - Interpolation factor (0-1)
     * @returns {string} Interpolated color (hex)
     */
    _lerpColor(color1, color2, t) {
        // Parse hex colors
        const c1 = this._hexToRgb(color1);
        const c2 = this._hexToRgb(color2);
        
        if (!c1 || !c2) return color1;
        
        // Interpolate each channel
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Convert hex color to RGB object
     * @param {string} hex - Hex color string
     * @returns {{r: number, g: number, b: number}|null}
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // ==================== DAMAGE SYSTEM ====================

    /**
     * Apply damage to this target
     * @param {number} damage - Amount of damage to apply
     * @param {Object} source - The object/creature that caused the damage (optional)
     * @returns {boolean} Whether the target died from this damage
     */
    takeDamage(damage, source = null) {
        if (this.isDead) return false;
        
        this.health -= damage;
        this._lastDamageTime = performance.now() / 1000;
        this._lastDamageTimeForRegen = this._lastDamageTime;
        this._lastDamageSource = source;
        
        console.log(`[BasicTarget] ${this.gameObject.name || 'Target'} took ${damage} damage from ${source?.name || 'unknown'} (${Math.round(this.health)}/${this.maxHealth})`);
        
        // Flash effect
        if (this.flashOnDamage && !this._isFlashing) {
            this._isFlashing = true;
            this._flashTimer = this.flashDuration;
            this._originalAlpha = this.gameObject.alpha ?? 1;
            this.gameObject.alpha = 0.5;
        }
        
        // Spawn drops on damage
        //this._spawnDrops(this.dropsOnDamage);
        //if (this.dropsOnDamage) {
        instanceCreate(this.dropsOnDamage[0], this.x, this.y);
        //}
        
        // Emit damage event
        if (this.onDamageEvent) {
            this.gameObject.emit(this.onDamageEvent, { damage, source });
        }
        
        // Check for death
        if (this.health <= 0) {
            this.health = 0;
            this.die(source);
            return true;
        }
        
        return false;
    }

    /**
     * Heal this target
     * @param {number} amount - Amount of health to restore
     */
    heal(amount) {
        if (this.isDead) return;
        
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    /**
     * Kill this target
     * @param {Object} killer - The object/creature that killed this target (optional)
     */
    die(killer = null) {
        if (this.isDead) return;
        
        this.isDead = true;
        this.health = 0;
        this._deathTimer = 0;
        
        console.log(`[BasicTarget] ${this.gameObject.name || 'Target'} was killed by ${killer?.name || 'unknown'}`);
        
        // Spawn drops on death
        //this._spawnDrops(this.dropsOnDeath);
        
        instanceCreate(this.dropsOnDamage[0], this.x, this.y);
        
        // Start shrinking if enabled
        if (this.shrinkOnDeath) {
            this._isShrinking = true;
        }
        
        // Emit death event
        instanceDestroy(this);
    }

    /**
     * Revive this target with specified health
     * @param {number} healthPercent - Health percentage to revive with (0-1, default 1)
     */
    revive(healthPercent = 1) {
        this.isDead = false;
        this.health = this.maxHealth * Math.min(1, Math.max(0, healthPercent));
        this._deathTimer = 0;
        this._isShrinking = false;
        
        // Restore scale if we were shrinking or scaling with health
        if (this._originalScale) {
            if (this.scaleWithHealth) {
                this._updateHealthScale();
            } else {
                this.gameObject.scale = { ...this._originalScale };
            }
        }
        
        console.log(`[BasicTarget] ${this.gameObject.name || 'Target'} revived with ${Math.round(this.health)} health`);
    }

    // ==================== RESOURCE DROPS ====================

    /**
     * Spawn drops from a drop table
     * @param {Array} dropTable - Array of drop definitions [{prefab, chance, minCount, maxCount}]
     */
    _spawnDrops(dropTable) {
        if (!dropTable || !Array.isArray(dropTable) || dropTable.length === 0) return;
        
        const _engine = this.gameObject._engine;
        
        const pos = this.gameObject.getWorldPosition();
        
        for (const drop of dropTable) {
            if (!drop.prefab) continue;
            
            // Check chance
            const chance = drop.chance ?? 1.0;
            if (Math.random() > chance) continue;
            
            // Calculate count
            const minCount = drop.minCount ?? 1;
            const maxCount = drop.maxCount ?? 1;
            const count = Math.floor(minCount + Math.random() * (maxCount - minCount + 1));
            
            // Spawn each drop
            for (let i = 0; i < count; i++) {
                // Random position within spread radius
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * this.dropSpreadRadius;
                const spawnX = pos.x + Math.cos(angle) * dist;
                const spawnY = pos.y + this.dropOffsetY + Math.sin(angle) * dist;
                
                try {
                    instanceCreate(drop.prefab, spawnX, spawnY);
                } catch (e) {
                    console.warn(`[BasicTarget] Failed to spawn drop prefab: ${drop.prefab}`, e);
                }
            }
        }
    }

    // ==================== FAMILY/ENEMY CHECKS ====================

    /**
     * Check if the given object is an enemy of this target
     * @param {Object} obj - The object to check
     * @returns {boolean} Whether the object is an enemy
     */
    isEnemy(obj) {
        if (!obj) return false;
        const objTags = obj.tags || [];
        
        // Check if obj has any of our enemy tags
        return this.enemyTags.some(t => objTags.includes(t));
    }

    /**
     * Check if the given object is a family member (friendly)
     * @param {Object} obj - The object to check
     * @returns {boolean} Whether the object is friendly
     */
    isFriendly(obj) {
        if (!obj) return false;
        const objTags = obj.tags || [];
        
        // Check if obj shares any family tags
        return this.familyTags.some(t => objTags.includes(t));
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = {};
        json.type = 'ProceduralCreatureBasicTarget';
        json.enabled = this.enabled;

        // Health
        json.maxHealth = this.maxHealth;
        json.health = this.health;
        json.destroyOnDeath = this.destroyOnDeath;
        json.deathDelay = this.deathDelay;

        // Health Regeneration
        json.enableHealthRegen = this.enableHealthRegen;
        json.healthRegenRate = this.healthRegenRate;
        json.healthRegenDelay = this.healthRegenDelay;
        json.reviveWhenFullyHealed = this.reviveWhenFullyHealed;

        // Scale With Health
        json.scaleWithHealth = this.scaleWithHealth;
        json.minHealthScale = this.minHealthScale;
        json.maxHealthScale = this.maxHealthScale;

        // Shrink On Death
        json.shrinkOnDeath = this.shrinkOnDeath;
        json.shrinkRate = this.shrinkRate;
        json.shrinkMinScale = this.shrinkMinScale;
        json.destroyAfterShrink = this.destroyAfterShrink;

        // Resource Drops
        json.dropsOnDamage = this.dropsOnDamage;
        json.dropsOnDeath = this.dropsOnDeath;
        json.dropSpreadRadius = this.dropSpreadRadius;
        json.dropOffsetY = this.dropOffsetY;

        // Family/Enemy Groupings
        json.familyTags = this.familyTags;
        json.enemyTags = this.enemyTags;

        // Visual Feedback
        json.showHealthCircle = this.showHealthCircle;
        json.healthCircleRadius = this.healthCircleRadius;
        json.healthCircleLineWidth = this.healthCircleLineWidth;
        json.healthCircleOffsetY = this.healthCircleOffsetY;
        json.healthCircleFullColor = this.healthCircleFullColor;
        json.healthCircleLowColor = this.healthCircleLowColor;
        json.healthCircleAlpha = this.healthCircleAlpha;
        json.flashOnDamage = this.flashOnDamage;
        json.flashDuration = this.flashDuration;

        // Events
        json.onDamageEvent = this.onDamageEvent;
        json.onDeathEvent = this.onDeathEvent;

        return json;
    }

    static fromJSON(json) {
        const module = new ProceduralCreatureBasicTarget();
        module.enabled = json.enabled ?? true;

        // Health
        module.maxHealth = json.maxHealth ?? 100;
        module.health = json.health ?? 100;
        module.destroyOnDeath = json.destroyOnDeath ?? false;
        module.deathDelay = json.deathDelay ?? 0.5;

        // Health Regeneration
        module.enableHealthRegen = json.enableHealthRegen ?? false;
        module.healthRegenRate = json.healthRegenRate ?? 5;
        module.healthRegenDelay = json.healthRegenDelay ?? 5.0;
        module.reviveWhenFullyHealed = json.reviveWhenFullyHealed ?? true;

        // Scale With Health
        module.scaleWithHealth = json.scaleWithHealth ?? false;
        module.minHealthScale = json.minHealthScale ?? 0.3;
        module.maxHealthScale = json.maxHealthScale ?? 1.0;

        // Shrink On Death
        module.shrinkOnDeath = json.shrinkOnDeath ?? false;
        module.shrinkRate = json.shrinkRate ?? 0.5;
        module.shrinkMinScale = json.shrinkMinScale ?? 0.1;
        module.destroyAfterShrink = json.destroyAfterShrink ?? true;

        // Resource Drops
        module.dropsOnDamage = json.dropsOnDamage ?? [];
        module.dropsOnDeath = json.dropsOnDeath ?? [];
        module.dropSpreadRadius = json.dropSpreadRadius ?? 30;
        module.dropOffsetY = json.dropOffsetY ?? 0;

        // Family/Enemy Groupings
        module.familyTags = json.familyTags ?? [];
        module.enemyTags = json.enemyTags ?? [];

        // Visual Feedback
        module.showHealthCircle = json.showHealthCircle ?? true;
        module.healthCircleRadius = json.healthCircleRadius ?? 20;
        module.healthCircleLineWidth = json.healthCircleLineWidth ?? 3;
        module.healthCircleOffsetY = json.healthCircleOffsetY ?? 0;
        module.healthCircleFullColor = json.healthCircleFullColor ?? '#44ff44';
        module.healthCircleLowColor = json.healthCircleLowColor ?? '#ff4444';
        module.healthCircleAlpha = json.healthCircleAlpha ?? 0.7;
        module.flashOnDamage = json.flashOnDamage ?? true;
        module.flashDuration = json.flashDuration ?? 0.15;

        // Events
        module.onDamageEvent = json.onDamageEvent ?? '';
        module.onDeathEvent = json.onDeathEvent ?? '';

        return module;
    }

    clone() {
        return ProceduralCreatureBasicTarget.fromJSON(this.toJSON());
    }
}

window.ProceduralCreatureBasicTarget = ProceduralCreatureBasicTarget;
