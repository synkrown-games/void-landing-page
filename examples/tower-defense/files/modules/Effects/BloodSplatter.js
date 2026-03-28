/**
 * BloodSplatter Module
 * Creates 2.5D blood splatter effects with particles that leave decals
 * 
 * Features:
 * - Burst particles with adjustable 2.5D Y-axis offset (fake depth)
 * - Random angles, directions, speeds, and lifetimes
 * - Particles create blood spots on the decal layer when they die
 * - Efficient: uses the engine's chunked decal system
 */

class BloodSplatter extends Module {
    constructor() {
        super();
        
        // ==================== PARTICLE SETTINGS ====================
        this.particleCount = 15;           // Number of particles per splatter
        this.particleLifetimeMin = 0.3;    // Minimum particle lifetime (seconds)
        this.particleLifetimeMax = 0.8;    // Maximum particle lifetime (seconds)
        this.speedMin = 100;               // Minimum initial speed
        this.speedMax = 300;               // Maximum initial speed
        this.spreadAngle = 360;            // Emission spread in degrees (360 = all directions)
        this.baseAngle = -90;              // Base emission angle (-90 = up)
        this.gravity = 600;                // Gravity affecting particles
        this.particleSizeMin = 2;          // Minimum particle size
        this.particleSizeMax = 6;          // Maximum particle size
        this.particleColor = '#cc0000';    // Blood particle color
        this.particleEndColor = '#660000'; // Particle color at end of life
        this.fadeOut = true;               // Fade particles over lifetime
        
        // ==================== 2.5D SETTINGS ====================
        // These create fake depth by offsetting particles along Y axis
        this.yDepthEnabled = true;         // Enable 2.5D Y-axis depth
        this.yDepthMin = -20;              // Minimum Y depth offset (negative = appears closer)
        this.yDepthMax = 20;               // Maximum Y depth offset (positive = appears farther)
        this.yDepthScale = 0.5;            // How much depth affects particle size (0-1)
        
        // ==================== DECAL SETTINGS ====================
        this.createDecals = true;          // Create blood spots on decal layer
        this.decalSizeMin = 3;             // Minimum decal size
        this.decalSizeMax = 12;            // Maximum decal size
        this.decalColor = '#880000';       // Blood decal color
        this.decalAlpha = 0.8;             // Decal transparency (0-1)
        this.decalVariation = true;        // Add color variation to decals
        
        // ==================== BEHAVIOR ====================
        this.autoPlay = true;             // Auto-play on start (usually triggered manually)
        this.destroyOnComplete = true;    // Destroy game object when all particles are gone
        
        // ==================== INTERNAL STATE ====================
        this._particles = [];
        this._isPlaying = false;
        this._completedParticles = 0;
        
        // Cached color values (avoid parsing hex every frame)
        this._cachedStartRgb = null;
        this._cachedEndRgb = null;
        this._cachedStartColor = '';
        this._cachedEndColor = '';
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Effects';
    
    static getIcon() {
        return '🩸';
    }
    
    static getDescription() {
        return 'Creates 2.5D blood splatter effects with decal persistence';
    }
    
    getPropertyMetadata() {
        return [
            // === PARTICLE SETTINGS ===
            { type: 'groupStart', label: '💥 Particle Settings' },
                { key: 'particleCount', label: 'Particle Count', type: 'number', default: 15, min: 1, max: 100, step: 1 },
                { type: 'hint', label: 'Number of blood droplets per splatter' },
                { type: 'groupStart', label: '⏱️ Lifetime' },
                    { key: 'particleLifetimeMin', label: 'Min Lifetime', type: 'number', default: 0.3, min: 0.1, max: 5, step: 0.1 },
                    { key: 'particleLifetimeMax', label: 'Max Lifetime', type: 'number', default: 0.8, min: 0.1, max: 5, step: 0.1 },
                    { type: 'hint', label: 'Random lifetime range in seconds' },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '🚀 Speed & Direction' },
                    { key: 'speedMin', label: 'Min Speed', type: 'number', default: 100, min: 0, max: 1000, step: 10 },
                    { key: 'speedMax', label: 'Max Speed', type: 'number', default: 300, min: 0, max: 1000, step: 10 },
                    { key: 'spreadAngle', label: 'Spread (°)', type: 'number', default: 360, min: 0, max: 360, step: 5 },
                    { type: 'hint', label: '360 = all directions, lower = more focused' },
                    { key: 'baseAngle', label: 'Base Angle (°)', type: 'number', default: -90, min: -180, max: 180, step: 5 },
                    { type: 'hint', label: '-90=up, 0=right, 90=down, 180=left' },
                    { key: 'gravity', label: 'Gravity', type: 'number', default: 600, min: 0, max: 2000, step: 10 },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '📏 Size' },
                    { key: 'particleSizeMin', label: 'Min Size', type: 'number', default: 2, min: 1, max: 50, step: 1 },
                    { key: 'particleSizeMax', label: 'Max Size', type: 'number', default: 6, min: 1, max: 50, step: 1 },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '🎨 Color' },
                    { key: 'particleColor', label: 'Start Color', type: 'color', default: '#cc0000' },
                    { key: 'particleEndColor', label: 'End Color', type: 'color', default: '#660000' },
                    { key: 'fadeOut', label: 'Fade Out', type: 'boolean', default: true },
                    { type: 'hint', label: 'Particles fade as they die' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            
            // === 2.5D DEPTH SETTINGS ===
            { type: 'groupStart', label: '📐 2.5D Depth' },
                { key: 'yDepthEnabled', label: 'Enable Y Depth', type: 'boolean', default: true },
                { type: 'hint', label: 'Fake depth by offsetting Y position' },
                { key: 'yDepthMin', label: 'Min Y Offset', type: 'number', default: -20, min: -100, max: 100, step: 1, showIf: { yDepthEnabled: true } },
                { key: 'yDepthMax', label: 'Max Y Offset', type: 'number', default: 20, min: -100, max: 100, step: 1, showIf: { yDepthEnabled: true } },
                { type: 'hint', label: 'Negative=closer, Positive=farther', showIf: { yDepthEnabled: true } },
                { key: 'yDepthScale', label: 'Depth Scale', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05, showIf: { yDepthEnabled: true } },
                { type: 'hint', label: 'How much depth affects particle size', showIf: { yDepthEnabled: true } },
            { type: 'groupEnd' },
            
            // === DECAL SETTINGS ===
            { type: 'groupStart', label: '🩸 Decals' },
                { key: 'createDecals', label: 'Create Decals', type: 'boolean', default: true },
                { type: 'hint', label: 'Leave blood spots on decal layer' },
                { type: 'groupStart', label: '📏 Decal Size' },
                    { key: 'decalSizeMin', label: 'Min Size', type: 'number', default: 3, min: 1, max: 50, step: 1, showIf: { createDecals: true } },
                    { key: 'decalSizeMax', label: 'Max Size', type: 'number', default: 12, min: 1, max: 50, step: 1, showIf: { createDecals: true } },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '🎨 Decal Appearance' },
                    { key: 'decalColor', label: 'Decal Color', type: 'color', default: '#880000', showIf: { createDecals: true } },
                    { key: 'decalAlpha', label: 'Opacity', type: 'slider', default: 0.8, min: 0, max: 1, step: 0.05, showIf: { createDecals: true } },
                    { key: 'decalVariation', label: 'Color Variation', type: 'boolean', default: true, showIf: { createDecals: true } },
                    { type: 'hint', label: 'Add random color variation to decals', showIf: { createDecals: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            
            // === BEHAVIOR ===
            { type: 'groupStart', label: '⚙️ Behavior' },
                { key: 'autoPlay', label: 'Auto Play', type: 'boolean', default: false },
                { type: 'hint', label: 'Play automatically on start (usually triggered via code)' },
                { key: 'destroyOnComplete', label: 'Destroy On Complete', type: 'boolean', default: false },
                { type: 'hint', label: 'Destroy game object when all particles are gone' },
            { type: 'groupEnd' },
        ];
    }
    
    // ==================== LIFECYCLE ====================
    
    start() {
        if (this.autoPlay) {
            this.play();
        }
    }
    
    loop(deltaTime) {
        if (!this._isPlaying && this._particles.length === 0) return;
        
        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            
            // Update lifetime
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                // Particle died - create decal if enabled
                if (this.createDecals) {
                    this._createDecal(p);
                }
                
                // Remove particle
                this._particles.splice(i, 1);
                this._completedParticles++;
                continue;
            }
            
            // Apply gravity
            p.vy += this.gravity * deltaTime;
            
            // Update position
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            
            // Update 2.5D depth offset (slight drift)
            if (this.yDepthEnabled) {
                p.yDepth += p.yDepthVel * deltaTime;
            }
            
            // Calculate life ratio for interpolation
            p.lifeRatio = p.life / p.maxLife;
        }
        
        // Check if complete
        if (this._particles.length === 0 && this._isPlaying) {
            this._isPlaying = false;
            
            if (this.destroyOnComplete && this.gameObject) {
                this.gameObject._engine?.instanceDestroy(this.gameObject);
            }
        }
    }
    
    draw(ctx) {
        const worldPos = this.gameObject.getWorldPosition();

        this.drawUntethered(ctx);
        
        // Cache color parsing (avoid regex every frame)
        if (this._cachedStartColor !== this.particleColor) {
            this._cachedStartColor = this.particleColor;
            this._cachedStartRgb = this._hexToRgb(this.particleColor);
        }
        if (this._cachedEndColor !== this.particleEndColor) {
            this._cachedEndColor = this.particleEndColor;
            this._cachedEndRgb = this._hexToRgb(this.particleEndColor);
        }
        
        const startRgb = this._cachedStartRgb;
        const endRgb = this._cachedEndRgb;
        
        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            // Calculate actual position with 2.5D depth
            let drawX = worldPos.x + p.x;
            let drawY = worldPos.y + p.y;
            
            if (this.yDepthEnabled) {
                drawY += p.yDepth;
            }
            
            // Calculate size with depth scaling
            let size = p.size;
            if (this.yDepthEnabled && this.yDepthScale > 0) {
                // Particles with positive yDepth (farther) appear smaller
                const depthFactor = 1 - (p.yDepth / this.yDepthMax) * this.yDepthScale * 0.5;
                size *= Math.max(0.3, depthFactor);
            }
            
            // Interpolate color using cached RGB values (avoid hex conversion)
            const t = 1 - p.lifeRatio;
            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t);
            
            // Calculate alpha
            let alpha = 1;
            if (this.fadeOut) {
                alpha = p.lifeRatio;
            }
            
            // Draw particle
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        this.drawTethered(ctx);
    }
    
    // ==================== PUBLIC METHODS ====================
    
    /**
     * Trigger a blood splatter effect
     * @param {number} offsetX - Optional X offset from game object position
     * @param {number} offsetY - Optional Y offset from game object position
     */
    play(offsetX = 0, offsetY = 0) {
        this._isPlaying = true;
        this._completedParticles = 0;
        
        // Create particles
        for (let i = 0; i < this.particleCount; i++) {
            this._createParticle(offsetX, offsetY);
        }
    }
    
    /**
     * Create a splatter at a specific world position
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     */
    playAt(worldX, worldY) {
        const worldPos = this.gameObject.getWorldPosition();
        const offsetX = worldX - worldPos.x;
        const offsetY = worldY - worldPos.y;
        this.play(offsetX, offsetY);
    }
    
    /**
     * Stop the splatter effect and clear all particles
     */
    stop() {
        this._isPlaying = false;
        this._particles = [];
    }
    
    /**
     * Check if the splatter is currently active
     * @returns {boolean}
     */
    isPlaying() {
        return this._isPlaying || this._particles.length > 0;
    }
    
    /**
     * Get the number of active particles
     * @returns {number}
     */
    getParticleCount() {
        return this._particles.length;
    }
    
    // ==================== PRIVATE METHODS ====================
    
    /**
     * Create a single particle
     * @private
     */
    _createParticle(offsetX, offsetY) {
        // Random angle within spread
        const halfSpread = this.spreadAngle / 2;
        const angle = (this.baseAngle + (Math.random() - 0.5) * 2 * halfSpread) * Math.PI / 180;
        
        // Random speed
        const speed = this.speedMin + Math.random() * (this.speedMax - this.speedMin);
        
        // Random lifetime
        const lifetime = this.particleLifetimeMin + Math.random() * (this.particleLifetimeMax - this.particleLifetimeMin);
        
        // Random size
        const size = this.particleSizeMin + Math.random() * (this.particleSizeMax - this.particleSizeMin);
        
        // Random 2.5D depth
        const yDepth = this.yDepthMin + Math.random() * (this.yDepthMax - this.yDepthMin);
        const yDepthVel = (Math.random() - 0.5) * 20; // Slight drift in depth
        
        const particle = {
            x: offsetX,
            y: offsetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            life: lifetime,
            maxLife: lifetime,
            lifeRatio: 1,
            yDepth: this.yDepthEnabled ? yDepth : 0,
            yDepthVel: this.yDepthEnabled ? yDepthVel : 0
        };
        
        this._particles.push(particle);
    }
    
    /**
     * Create a blood decal on the decal layer
     * @param {Object} particle - The dying particle
     * @private
     */
    _createDecal(particle) {
        const engine = this.gameObject._engine;
        if (!engine) return;
        
        // Calculate world position
        const worldPos = this.gameObject.getWorldPosition();
        let worldX = worldPos.x + particle.x;
        let worldY = worldPos.y + particle.y;
        
        // Add 2.5D depth offset to final position
        if (this.yDepthEnabled) {
            worldY += particle.yDepth;
        }
        
        // Get decal layer context at this position
        const decal = engine.drawDecalLayer(worldX, worldY);
        if (!decal) return; // Outside active chunks
        
        // Random decal size
        const size = this.decalSizeMin + Math.random() * (this.decalSizeMax - this.decalSizeMin);
        
        // Get color (with optional variation)
        let color = this.decalColor;
        if (this.decalVariation) {
            color = this._varyColor(this.decalColor, 20);
        }
        
        // Draw the blood spot
        decal.ctx.save();
        decal.ctx.globalAlpha = this.decalAlpha;
        decal.ctx.fillStyle = color;
        
        // Draw irregular blood spot (multiple overlapping circles)
        const numCircles = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numCircles; i++) {
            const offsetX = (Math.random() - 0.5) * size * 0.5;
            const offsetY = (Math.random() - 0.5) * size * 0.5;
            const subSize = size * (0.5 + Math.random() * 0.5);
            
            decal.ctx.beginPath();
            decal.ctx.arc(decal.localX + offsetX, decal.localY + offsetY, subSize, 0, Math.PI * 2);
            decal.ctx.fill();
        }
        
        decal.ctx.restore();
    }
    
    /**
     * Linearly interpolate between two colors
     * @param {string} color1 - Start color (hex)
     * @param {string} color2 - End color (hex)
     * @param {number} t - Interpolation factor (0-1)
     * @returns {string} Interpolated color (hex)
     * @private
     */
    _lerpColor(color1, color2, t) {
        const c1 = this._hexToRgb(color1);
        const c2 = this._hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return this._rgbToHex(r, g, b);
    }
    
    /**
     * Add random variation to a color
     * @param {string} color - Base color (hex)
     * @param {number} amount - Variation amount (0-255)
     * @returns {string} Varied color (hex)
     * @private
     */
    _varyColor(color, amount) {
        const c = this._hexToRgb(color);
        
        const r = Math.max(0, Math.min(255, c.r + (Math.random() - 0.5) * 2 * amount));
        const g = Math.max(0, Math.min(255, c.g + (Math.random() - 0.5) * 2 * amount));
        const b = Math.max(0, Math.min(255, c.b + (Math.random() - 0.5) * 2 * amount));
        
        return this._rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    }
    
    /**
     * Convert hex color to RGB
     * @param {string} hex - Hex color string
     * @returns {{r: number, g: number, b: number}}
     * @private
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    /**
     * Convert RGB to hex color
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {string} Hex color string
     * @private
     */
    _rgbToHex(r, g, b) {
        const toHex = (x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    
    // ==================== SERIALIZATION ====================
    
    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON ? super.toJSON() : { enabled: this.enabled };
        json.type = 'BloodSplatter';
        
        // Particle settings
        json.particleCount = this.particleCount;
        json.particleLifetimeMin = this.particleLifetimeMin;
        json.particleLifetimeMax = this.particleLifetimeMax;
        json.speedMin = this.speedMin;
        json.speedMax = this.speedMax;
        json.spreadAngle = this.spreadAngle;
        json.baseAngle = this.baseAngle;
        json.gravity = this.gravity;
        json.particleSizeMin = this.particleSizeMin;
        json.particleSizeMax = this.particleSizeMax;
        json.particleColor = this.particleColor;
        json.particleEndColor = this.particleEndColor;
        json.fadeOut = this.fadeOut;
        
        // 2.5D settings
        json.yDepthEnabled = this.yDepthEnabled;
        json.yDepthMin = this.yDepthMin;
        json.yDepthMax = this.yDepthMax;
        json.yDepthScale = this.yDepthScale;
        
        // Decal settings
        json.createDecals = this.createDecals;
        json.decalSizeMin = this.decalSizeMin;
        json.decalSizeMax = this.decalSizeMax;
        json.decalColor = this.decalColor;
        json.decalAlpha = this.decalAlpha;
        json.decalVariation = this.decalVariation;
        
        // Behavior
        json.autoPlay = this.autoPlay;
        json.destroyOnComplete = this.destroyOnComplete;
        
        return json;
    }
    
    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {BloodSplatter} New instance
     */
    static fromJSON(json) {
        const module = new BloodSplatter();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        
        // Particle settings
        module.particleCount = json.particleCount ?? 15;
        module.particleLifetimeMin = json.particleLifetimeMin ?? 0.3;
        module.particleLifetimeMax = json.particleLifetimeMax ?? 0.8;
        module.speedMin = json.speedMin ?? 100;
        module.speedMax = json.speedMax ?? 300;
        module.spreadAngle = json.spreadAngle ?? 360;
        module.baseAngle = json.baseAngle ?? -90;
        module.gravity = json.gravity ?? 600;
        module.particleSizeMin = json.particleSizeMin ?? 2;
        module.particleSizeMax = json.particleSizeMax ?? 6;
        module.particleColor = json.particleColor ?? '#cc0000';
        module.particleEndColor = json.particleEndColor ?? '#660000';
        module.fadeOut = json.fadeOut ?? true;
        
        // 2.5D settings
        module.yDepthEnabled = json.yDepthEnabled ?? true;
        module.yDepthMin = json.yDepthMin ?? -20;
        module.yDepthMax = json.yDepthMax ?? 20;
        module.yDepthScale = json.yDepthScale ?? 0.5;
        
        // Decal settings
        module.createDecals = json.createDecals ?? true;
        module.decalSizeMin = json.decalSizeMin ?? 3;
        module.decalSizeMax = json.decalSizeMax ?? 12;
        module.decalColor = json.decalColor ?? '#880000';
        module.decalAlpha = json.decalAlpha ?? 0.8;
        module.decalVariation = json.decalVariation ?? true;
        
        // Behavior
        module.autoPlay = json.autoPlay ?? false;
        module.destroyOnComplete = json.destroyOnComplete ?? false;
        
        return module;
    }
    
    /**
     * Clone the module
     * @returns {BloodSplatter} Cloned module
     */
    clone() {
        return BloodSplatter.fromJSON(this.toJSON());
    }
    
    // ==================== POOL RESET ====================
    
    /**
     * Reset state when recycled from object pool
     * @private
     */
    _resetForPool() {
        this._particles = [];
        this._isPlaying = false;
        this._completedParticles = 0;
        this._cachedStartRgb = null;
        this._cachedEndRgb = null;
        this._cachedStartColor = '';
        this._cachedEndColor = '';
    }
}

// Register for module discovery
if (typeof window !== 'undefined') {
    window.BloodSplatter = BloodSplatter;
}
