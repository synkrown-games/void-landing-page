/**
 * SplinePath Module
 * Advanced path renderer with viewport culling, texture support, and creative styling
 * Namespace: Rendering
 * 
 * Features:
 * - Viewport-aware rendering (only renders visible path segments)
 * - Image texture support for path surface
 * - Multiple creative path styles (solid, dashed, railroad, rope, chains, lava, etc.)
 * - Catmull-Rom spline interpolation
 * - Gizmo handles for editor manipulation
 * - Decorative elements (grass tufts, stones, runes, etc.)
 */

class SplinePathRenderer extends Module {
    constructor() {
        super();
        
        // === PATH POINTS ===
        // Array of {x, y} positions relative to object position
        this.pathPoints = [];
        
        // === SPLINE SETTINGS ===
        this.useSpline = true;
        this.splineResolution = 15; // Points per segment for smooth curves
        this.splineTension = 0.5;   // Catmull-Rom tension (0 = sharp, 1 = smooth)
        
        // === PATH APPEARANCE ===
        this.pathStyle = 'solid';   // 'solid', 'dashed', 'dotted', 'railroad', 'rope', 'chain', 'lava', 'ice', 'grass', 'stone', 'magical', 'electric'
        this.pathWidth = 30;
        this.pathColor = '#6b8e23';
        this.pathBorderColor = '#556b2f';
        this.pathOpacity = 1.0;
        this.showBorder = true;
        this.borderWidth = 4;
        
        // === TEXTURE SETTINGS ===
        this.useTexture = false;
        this.texturePath = '';
        this.textureScale = 1.0;
        this.textureRepeat = true;
        this.textureOffsetX = 0;
        this.textureOffsetY = 0;
        this.textureBlendMode = 'source-over';
        this.textureOpacity = 1.0;
        
        // === EFFECTS ===
        this.glowEnabled = false;
        this.glowColor = '#ffffff';
        this.glowIntensity = 10;
        this.animateTexture = false;
        this.animationSpeed = 1.0;
        
        // === DECORATION ===
        this.showDecorations = false;
        this.decorationType = 'none'; // 'none', 'grass', 'stones', 'runes', 'torches', 'crystals'
        this.decorationDensity = 0.5;
        this.decorationScale = 1.0;
        
        // === DIRECTION INDICATORS ===
        this.showDirection = false;
        this.directionInterval = 100; // Pixels between arrows
        this.directionColor = '#ffffff';
        this.directionSize = 10;
        
        // === ENDPOINTS ===
        this.showEndpoints = true;
        this.startPointColor = '#00ff00';
        this.endPointColor = '#ff0000';
        this.pointRadius = 8;
        
        // === EDGE SOFTNESS ===
        this.edgeSoftness = false;       // Enable soft alpha gradient on path edges
        this.edgeSoftnessWidth = 8;      // Width of the edge gradient in pixels
        this.edgeSoftnessCurve = 0.5;    // 0 = linear falloff, 1 = smooth ease-out
        this.edgeSoftnessNoise = 0;      // Random wobble on edge boundary (0 = straight, 1 = very organic)

        // === CHUNKED CANVAS RENDERING ===
        this.useChunkedCanvas = true;      // Enable chunked offscreen canvas rendering
        this.chunkSize = 512;              // Max chunk dimension in pixels
        this._chunkCache = new Map();      // Map of "cx_cy" -> { canvas, ctx, dirty }
        this._chunkVersion = 0;            // Increment to invalidate all chunks
        
        // === END SOFTNESS ===
        this.endSoftness = false;        // Enable soft alpha gradient on path start/end
        this.endSoftnessLength = 20;     // Length of the end gradient in pixels
        this.endSoftnessCurve = 0.5;     // 0 = linear falloff, 1 = smooth ease-out
        
        // === VIEWPORT CULLING ===
        this.viewportMargin = 50; // Extra margin for culling
        
        // === TEXTURE SEED ===
        this.textureSeed = 12345; // Seed for deterministic texture generation
        
        // === RUNTIME CACHE ===
        this._currentSeed = 12345; // Runtime seed state
        this._softCanvas = null;  // Offscreen canvas for softness compositing
        this._softCtx = null;
        this._cachedPath = null;
        this._pathLength = 0;
        this._segmentLengths = [];
        this._textureCanvas = null;
        this._textureCtx = null;
        this._cachedTexture = null;
        this._cachedTexturePath = null;
        this._animationTime = 0;
        this._patternCache = {};
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering,Drawing,Procedural';
    static is2D = true;
    static priority = 50; // Render before most things
    
    static getIcon() {
        return '🛤️';
    }
    
    static getDescription() {
        return 'Advanced spline path renderer with viewport culling, textures, and creative styling options';
    }
    
    // ==================== SEEDED RANDOM ====================
    
    /**
     * Reset the random seed to the configured textureSeed
     * Call this at the start of each render to ensure consistent results
     */
    _resetSeed() {
        this._currentSeed = this.textureSeed;
    }
    
    /**
     * Generate a seeded pseudo-random number between 0 and 1
     * Uses a simple linear congruential generator
     */
    _seededRandom() {
        // LCG parameters (same as glibc)
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648; // 2^31
        this._currentSeed = (a * this._currentSeed + c) % m;
        return this._currentSeed / m;
    }
    
    /**
     * Get the appropriate line cap style based on endSoftness setting
     * When endpoint blending is enabled, we use 'butt' to avoid opaque round tips
     * @returns {string} 'butt' if endSoftness is enabled, 'round' otherwise
     */
    _getCapStyle() {
        return this.endSoftness ? 'butt' : 'round';
    }
    
    // ==================== PROPERTY METADATA ====================
    
    getPropertyMetadata() {
        return [
            // === PATH POINTS ===
            { type: 'header', label: '📍 Path Points' },
            { type: 'hint', label: 'Define path points relative to object position. Use Ctrl+Click in editor to add points.' },
            { key: 'pathPoints', type: 'array', label: 'Points', elementType: 'vector2', minItems: 0,
              hint: 'Path waypoints (relative to object position)' },
            
            // === SPLINE SETTINGS ===
            { type: 'groupStart', label: '〰️ Spline Smoothing' },
            { key: 'useSpline', type: 'boolean', label: 'Enable Spline', default: true,
              hint: 'Smooth path with Catmull-Rom splines' },
            { key: 'splineResolution', type: 'slider', label: 'Curve Detail', default: 15, min: 3, max: 50,
              hint: 'Points per curve segment (higher = smoother)',
              showIf: { useSpline: true } },
            { key: 'splineTension', type: 'slider', label: 'Tension', default: 0.5, min: 0, max: 1, step: 0.05,
              hint: '0 = sharp corners, 1 = smooth curves',
              showIf: { useSpline: true } },
            { type: 'groupEnd' },
            
            // === PATH STYLE ===
            { type: 'header', label: '🎨 Path Style' },
            { key: 'pathStyle', type: 'select', label: 'Style', default: 'solid',
              options: {
                'solid': '⬛ Solid',
                'dashed': '➖ Dashed',
                'dotted': '⚫ Dotted',
                'railroad': '🚂 Railroad',
                'rope': '🪢 Rope',
                'chain': '⛓️ Chain',
                'lava': '🌋 Lava Flow',
                'ice': '🧊 Ice Path',
                'grass': '🌿 Grass Trail',
                'stone': '🪨 Stone Path',
                'magical': '✨ Magical',
                'electric': '⚡ Electric',
                'water': '🌊 Water Stream',
                'brick': '🧱 Brick Road',
                'neon': '💜 Neon Glow',
                'sand': '🏖️ Sandy Path',
                'dirt': '🟤 Dirt Trail',
                'mud': '💩 Muddy Path',
                'roadWhite': '🛣️ Road (White Lines)',
                'roadYellow': '🛣️ Road (Yellow Lines)',
                'roadDouble': '🛣️ Road (Double Yellow)',
                'cobblestone': '⬜ Cobblestone',
                'wood': '🪵 Wooden Planks',
                'metal': '⚙️ Metal Grating',
                'candy': '🍬 Candy Path',
                'rainbow': '🌈 Rainbow',
                'blood': '🩸 Blood Trail',
                'slime': '🟢 Slime Trail',
                'circuit': '💻 Circuit Board',
                'vine': '🌱 Vine Path'
              }
            },
            { key: 'pathWidth', type: 'slider', label: 'Width', default: 30, min: 5, max: 150,
              hint: 'Path width in pixels' },
            { key: 'pathColor', type: 'color', label: 'Color', default: '#6b8e23' },
            { key: 'pathOpacity', type: 'slider', label: 'Opacity', default: 1.0, min: 0, max: 1, step: 0.05 },
            
            // === BORDER ===
            { type: 'groupStart', label: '🔲 Border' },
            { key: 'showBorder', type: 'boolean', label: 'Show Border', default: true },
            { key: 'pathBorderColor', type: 'color', label: 'Border Color', default: '#556b2f',
              showIf: { showBorder: true } },
            { key: 'borderWidth', type: 'slider', label: 'Border Width', default: 4, min: 1, max: 20,
              showIf: { showBorder: true } },
            { type: 'groupEnd' },
            
            // === TEXTURE ===
            { type: 'header', label: '🖼️ Texture' },
            { key: 'useTexture', type: 'boolean', label: 'Use Texture', default: false,
              hint: 'Apply an image texture to the path' },
            { key: 'texturePath', type: 'image', label: 'Texture Image', default: '',
              showIf: { useTexture: true } },
            { type: 'groupStart', label: '⚙️ Texture Options' },
            { key: 'textureScale', type: 'slider', label: 'Scale', default: 1.0, min: 0.1, max: 5, step: 0.1,
              showIf: { useTexture: true } },
            { key: 'textureRepeat', type: 'boolean', label: 'Repeat', default: true,
              showIf: { useTexture: true } },
            { key: 'textureOffsetX', type: 'number', label: 'Offset X', default: 0, min: -500, max: 500,
              showIf: { useTexture: true } },
            { key: 'textureOffsetY', type: 'number', label: 'Offset Y', default: 0, min: -500, max: 500,
              showIf: { useTexture: true } },
            { key: 'textureBlendMode', type: 'select', label: 'Blend Mode', default: 'source-over',
              options: {
                'source-over': 'Normal',
                'multiply': 'Multiply',
                'screen': 'Screen',
                'overlay': 'Overlay',
                'soft-light': 'Soft Light'
              },
              showIf: { useTexture: true } },
            { key: 'textureOpacity', type: 'slider', label: 'Texture Opacity', default: 1.0, min: 0, max: 1, step: 0.05,
              showIf: { useTexture: true } },
            { type: 'groupEnd' },
            
            // === EFFECTS ===
            { type: 'header', label: '✨ Effects' },
            { type: 'groupStart', label: '💫 Glow Effect' },
            { key: 'glowEnabled', type: 'boolean', label: 'Enable Glow', default: false },
            { key: 'glowColor', type: 'color', label: 'Glow Color', default: '#ffffff',
              showIf: { glowEnabled: true } },
            { key: 'glowIntensity', type: 'slider', label: 'Glow Intensity', default: 10, min: 1, max: 50,
              showIf: { glowEnabled: true } },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '🎬 Animation' },
            { key: 'animateTexture', type: 'boolean', label: 'Animate', default: false,
              hint: 'Animate texture/effects along path' },
            { key: 'animationSpeed', type: 'slider', label: 'Animation Speed', default: 1.0, min: 0.1, max: 5, step: 0.1,
              showIf: { animateTexture: true } },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '🎲 Randomization' },
            { key: 'textureSeed', type: 'number', label: 'Texture Seed', default: 12345, min: 1, max: 999999,
              hint: 'Seed for deterministic texture/decoration placement. Change this to get different random patterns.' },
            { type: 'groupEnd' },
            
            // === DECORATIONS ===
            { type: 'header', label: '🌸 Decorations' },
            { key: 'showDecorations', type: 'boolean', label: 'Show Decorations', default: false },
            { key: 'decorationType', type: 'select', label: 'Type', default: 'none',
              options: {
                'none': '❌ None',
                'grass': '🌿 Grass Tufts',
                'stones': '🪨 Pebbles',
                'runes': '🔮 Runes',
                'torches': '🔥 Torches',
                'crystals': '💎 Crystals',
                'flowers': '🌸 Flowers',
                'mushrooms': '🍄 Mushrooms'
              },
              showIf: { showDecorations: true } },
            { key: 'decorationDensity', type: 'slider', label: 'Density', default: 0.5, min: 0.1, max: 1, step: 0.1,
              showIf: { showDecorations: true } },
            { key: 'decorationScale', type: 'slider', label: 'Scale', default: 1.0, min: 0.5, max: 2, step: 0.1,
              showIf: { showDecorations: true } },
            
            // === DIRECTION ARROWS ===
            { type: 'header', label: '➡️ Direction Arrows' },
            { key: 'showDirection', type: 'boolean', label: 'Show Direction', default: false },
            { key: 'directionInterval', type: 'slider', label: 'Arrow Spacing', default: 100, min: 30, max: 300,
              showIf: { showDirection: true } },
            { key: 'directionColor', type: 'color', label: 'Arrow Color', default: '#ffffff',
              showIf: { showDirection: true } },
            { key: 'directionSize', type: 'slider', label: 'Arrow Size', default: 10, min: 5, max: 30,
              showIf: { showDirection: true } },
            
            // === ENDPOINTS ===
            { type: 'groupStart', label: '🎯 Endpoints' },
            { key: 'showEndpoints', type: 'boolean', label: 'Show Endpoints', default: true },
            { key: 'startPointColor', type: 'color', label: 'Start Color', default: '#00ff00',
              showIf: { showEndpoints: true } },
            { key: 'endPointColor', type: 'color', label: 'End Color', default: '#ff0000',
              showIf: { showEndpoints: true } },
            { key: 'pointRadius', type: 'slider', label: 'Point Size', default: 8, min: 4, max: 20,
              showIf: { showEndpoints: true } },
            { type: 'groupEnd' },
            
            // === EDGE SOFTNESS ===
            { type: 'header', label: '🌫️ Edge Softness' },
            { type: 'hint', label: 'Soft alpha gradient transparency on path edges and ends. Great for dirt paths, grass trails, etc.' },
            { type: 'groupStart', label: '🔘 Edge Gradient' },
            { key: 'edgeSoftness', type: 'boolean', label: 'Enable Edge Softness', default: false,
              hint: 'Fade the edges of the path to transparent' },
            { key: 'edgeSoftnessWidth', type: 'slider', label: 'Edge Width', default: 8, min: 1, max: 50,
              hint: 'Width of the transparent gradient on each edge (pixels)',
              showIf: { edgeSoftness: true } },
            { key: 'edgeSoftnessCurve', type: 'slider', label: 'Edge Curve', default: 0.5, min: 0, max: 1, step: 0.05,
              hint: '0 = linear falloff, 1 = smooth ease-out',
              showIf: { edgeSoftness: true } },
            { key: 'edgeSoftnessNoise', type: 'slider', label: 'Edge Noise', default: 0, min: 0, max: 1, step: 0.05,
              hint: '0 = perfectly straight edge, 1 = very organic/random edge wobble',
              showIf: { edgeSoftness: true } },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '🔚 End Gradient' },
            { key: 'endSoftness', type: 'boolean', label: 'Enable End Softness', default: false,
              hint: 'Fade the start and end of the path to transparent' },
            { key: 'endSoftnessLength', type: 'slider', label: 'End Length', default: 20, min: 1, max: 100,
              hint: 'Length of the transparent gradient at each end (pixels)',
              showIf: { endSoftness: true } },
            { key: 'endSoftnessCurve', type: 'slider', label: 'End Curve', default: 0.5, min: 0, max: 1, step: 0.05,
              hint: '0 = linear falloff, 1 = smooth ease-out',
              showIf: { endSoftness: true } },
            { type: 'groupEnd' },
            
            // === VIEWPORT ===
            { type: 'groupStart', label: '📐 Viewport Culling' },
            { type: 'hint', label: 'Only renders path segments visible in the viewport for performance' },
            { key: 'viewportMargin', type: 'slider', label: 'Margin', default: 50, min: 0, max: 200,
              hint: 'Extra margin around viewport for culling' },
            { type: 'groupEnd' },
            
            // === PERFORMANCE ===
            { type: 'groupStart', label: '⚡ Performance' },
            { key: 'enableLOD', type: 'boolean', label: 'Enable LOD', default: true,
              hint: 'Reduce detail when zoomed out for better performance' },
            { key: 'lodThreshold', type: 'slider', label: 'LOD Threshold', default: 0.5, min: 0.1, max: 1, step: 0.05,
              hint: 'Zoom level below which to reduce detail',
              showIf: { enableLOD: true } },
            { key: 'skipDecorationsOnLOD', type: 'boolean', label: 'Skip Decorations on LOD', default: true,
              hint: 'Skip decorations when zoomed out',
              showIf: { enableLOD: true } },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        // Initialize with default points if empty
        if (this.pathPoints.length === 0) {
            this.pathPoints = [
                { x: 50, y: 0 },
                { x: 150, y: 50 },
                { x: 250, y: 0 },
                { x: 350, y: 50 }
            ];
        }
        this.rebuildPath();
    }
    
    loop(deltaTime) {
        // Update animation time
        if (this.animateTexture) {
            this._animationTime += deltaTime * this.animationSpeed;
        }
    }
    
    draw(ctx) {
        if (!this.enabled || this.pathPoints.length < 1) return;
    
        if (!this._cachedPath) this.rebuildPath();
        const path = this._cachedPath;
        if (!path || path.length < 2) return;
    
        const engine = this.gameObject?._engine;
        const viewport = engine?.viewport;
        const hasViewportInfo = viewport && typeof viewport.x === 'number';
        const viewportZoom = viewport?.zoom || 1;
        const isLOD = this.enableLOD && viewportZoom < this.lodThreshold;
    
        let visibleRuns = [path];
    
        if (hasViewportInfo) {
            const viewportX = viewport.x;
            const viewportY = viewport.y;
            const viewportWidth = viewport.width || 800;
            const viewportHeight = viewport.height || 600;
            const worldViewWidth = viewportWidth / viewportZoom;
            const worldViewHeight = viewportHeight / viewportZoom;
            const margin = this.viewportMargin + this.pathWidth;
            const goWorldPos = this.gameObject?.getWorldPosition?.() || this.gameObject?.position || { x: 0, y: 0 };
            const worldPos = {
                x: typeof goWorldPos.x === 'number' ? goWorldPos.x : 0,
                y: typeof goWorldPos.y === 'number' ? goWorldPos.y : 0
            };
    
            const worldPath = path.map(p => ({ x: p.x + worldPos.x, y: p.y + worldPos.y }));
            const visibleWorldRuns = this._getVisiblePathSegments(
                worldPath,
                viewportX - margin, viewportY - margin,
                worldViewWidth + margin * 2, worldViewHeight + margin * 2
            );
    
            if (visibleWorldRuns.length === 0) return;
    
            visibleRuns = visibleWorldRuns.map(run =>
                run.map(p => ({ x: p.x - worldPos.x, y: p.y - worldPos.y, index: p.index }))
            );
        }
    
        this._resetSeed();
    
        const needsSoftness = (this.edgeSoftness || this.endSoftness) && !isLOD;
    
        if (needsSoftness && this.useChunkedCanvas) {
            this._drawWithChunkedSoftness(ctx, path, visibleRuns, isLOD, viewport, viewportZoom);
        } else if (needsSoftness) {
            this._drawWithSingleSoftness(ctx, path, visibleRuns, isLOD);
        } else {
            this._drawDirect(ctx, path, visibleRuns, isLOD);
        }
    
        if (this.showEndpoints) {
            this._drawEndpoints(ctx, path);
        }
    }

    /**
     * Original single-canvas softness path (kept as fallback)
     */
    _drawWithSingleSoftness(ctx, path, visibleRuns, isLOD) {
        const softBounds = this._getRunsBoundingBox(visibleRuns);
        if (!softBounds) return;

        const canvasW = Math.ceil(softBounds.width);
        const canvasH = Math.ceil(softBounds.height);
        if (canvasW <= 0 || canvasH <= 0) return;

        if (!this._softCanvas || this._softCanvas.width !== canvasW || this._softCanvas.height !== canvasH) {
            this._softCanvas = document.createElement('canvas');
            this._softCanvas.width = canvasW;
            this._softCanvas.height = canvasH;
            this._softCtx = this._softCanvas.getContext('2d');
            this._softCtx.imageSmoothingEnabled = true;
        }

        this._softCtx.clearRect(0, 0, canvasW, canvasH);
        this._softCtx.save();
        this._softCtx.translate(-softBounds.x, -softBounds.y);

        const drawCtx = this._softCtx;
        drawCtx.save();

        if (this.glowEnabled) {
            drawCtx.shadowColor = this.glowColor;
            drawCtx.shadowBlur = this.glowIntensity;
        }

        for (const run of visibleRuns) {
            if (run.length < 2) continue;
            const startIndex = run[0].index || 0;
            let startDistance = 0;
            for (let i = 0; i < startIndex && i < this._segmentLengths.length; i++) {
                startDistance += this._segmentLengths[i];
            }
            this._drawPathStyle(drawCtx, run, startDistance, isLOD);
            if (this.useTexture && this.texturePath && !isLOD) this._drawTexturedPath(drawCtx, run, startDistance);
            if (this.showDecorations && this.decorationType !== 'none') {
                if (!isLOD || !this.skipDecorationsOnLOD) this._drawDecorations(drawCtx, run, startDistance);
            }
            if (this.showDirection && !isLOD) this._drawDirectionArrows(drawCtx, run, startDistance);
        }

        drawCtx.restore();
        this._softCtx.restore();

        if (this.edgeSoftness) this._applyEdgeSoftness(this._softCtx, visibleRuns, softBounds);
        if (this.endSoftness) this._applyEndSoftness(this._softCtx, path, softBounds);

        ctx.save();
        ctx.globalAlpha = this.pathOpacity;
        if (this.glowEnabled) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowIntensity;
        }
        ctx.drawImage(this._softCanvas, softBounds.x, softBounds.y);
        ctx.restore();
    }

    /**
     * Direct draw path (no softness, no offscreen canvas)
     */
    _drawDirect(ctx, path, visibleRuns, isLOD) {
        ctx.save();
        ctx.globalAlpha = this.pathOpacity;

        if (this.glowEnabled) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowIntensity;
        }

        for (const run of visibleRuns) {
            if (run.length < 2) continue;
            const startIndex = run[0].index || 0;
            let startDistance = 0;
            for (let i = 0; i < startIndex && i < this._segmentLengths.length; i++) {
                startDistance += this._segmentLengths[i];
            }
            this._drawPathStyle(ctx, run, startDistance, isLOD);
            if (this.useTexture && this.texturePath && !isLOD) this._drawTexturedPath(ctx, run, startDistance);
            if (this.showDecorations && this.decorationType !== 'none') {
                if (!isLOD || !this.skipDecorationsOnLOD) this._drawDecorations(ctx, run, startDistance);
            }
            if (this.showDirection && !isLOD) this._drawDirectionArrows(ctx, run, startDistance);
        }

        ctx.restore();
    }

    /**
     * Chunked softness rendering.
     * 
     * Splits the bounding box of visible runs into chunkSize x chunkSize tiles.
     * Each tile is rendered to its own offscreen canvas, softness-masked, then
     * stamped onto the main ctx. Tiles are cached by their chunk grid coordinate
     * and only invalidated when _chunkVersion changes (i.e. rebuildPath is called).
     * 
     * This keeps individual canvas allocations small (≤512×512) which is friendlier
     * to GPU texture upload limits and avoids allocating one giant canvas.
     */
    _drawWithChunkedSoftness(ctx, path, visibleRuns, isLOD, viewport, viewportZoom) {
        const softBounds = this._getRunsBoundingBox(visibleRuns);
        if (!softBounds) return;

        const CHUNK = this.chunkSize;

        // World-space bounds of the full path (for chunk grid alignment)
        const fullBounds = this._getRunsBoundingBox([path]);
        if (!fullBounds) return;

        // Align chunk grid to fullBounds origin so chunk IDs are stable
        // regardless of which subset is visible
        const gridOriginX = Math.floor(fullBounds.x / CHUNK) * CHUNK;
        const gridOriginY = Math.floor(fullBounds.y / CHUNK) * CHUNK;

        // Which chunks intersect the visible softBounds?
        const chunkX0 = Math.floor((softBounds.x - gridOriginX) / CHUNK);
        const chunkY0 = Math.floor((softBounds.y - gridOriginY) / CHUNK);
        const chunkX1 = Math.floor((softBounds.x + softBounds.width - gridOriginX) / CHUNK);
        const chunkY1 = Math.floor((softBounds.y + softBounds.height - gridOriginY) / CHUNK);

        ctx.save();
        ctx.globalAlpha = this.pathOpacity;
        if (this.glowEnabled) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowIntensity;
        }

        for (let cy = chunkY0; cy <= chunkY1; cy++) {
            for (let cx = chunkX0; cx <= chunkX1; cx++) {
                const key = `${cx}_${cy}`;

                // World-space rect for this chunk tile
                const tileX = gridOriginX + cx * CHUNK;
                const tileY = gridOriginY + cy * CHUNK;
                const tileW = CHUNK;
                const tileH = CHUNK;

                // Check cache
                let entry = this._chunkCache.get(key);
                const isStale = !entry || entry.version !== this._chunkVersion;

                if (isStale) {
                    // Allocate or reuse canvas
                    if (!entry) {
                        const canvas = document.createElement('canvas');
                        canvas.width = CHUNK;
                        canvas.height = CHUNK;
                        const offCtx = canvas.getContext('2d');
                        offCtx.imageSmoothingEnabled = false;
                        entry = { canvas, ctx: offCtx, version: -1 };
                        this._chunkCache.set(key, entry);
                    }

                    const offCtx = entry.ctx;
                    offCtx.clearRect(0, 0, CHUNK, CHUNK);

                    // Translate so that tileX,tileY maps to 0,0 in the offscreen canvas
                    offCtx.save();
                    offCtx.translate(-tileX, -tileY);

                    if (this.glowEnabled) {
                        offCtx.shadowColor = this.glowColor;
                        offCtx.shadowBlur = this.glowIntensity;
                    }

                    // We only draw runs that actually intersect this tile
                    const tileRuns = this._clampRunsToTile(visibleRuns, tileX, tileY, tileW, tileH);

                    for (const run of tileRuns) {
                        if (run.length < 2) continue;
                        const startIndex = run[0].index || 0;
                        let startDistance = 0;
                        for (let i = 0; i < startIndex && i < this._segmentLengths.length; i++) {
                            startDistance += this._segmentLengths[i];
                        }
                        this._drawPathStyle(offCtx, run, startDistance, isLOD);
                        if (this.useTexture && this.texturePath && !isLOD) this._drawTexturedPath(offCtx, run, startDistance);
                        if (this.showDecorations && this.decorationType !== 'none') {
                            if (!isLOD || !this.skipDecorationsOnLOD) this._drawDecorations(offCtx, run, startDistance);
                        }
                        if (this.showDirection && !isLOD) this._drawDirectionArrows(offCtx, run, startDistance);
                    }

                    offCtx.restore();

                    // Apply softness masks in tile-local space
                    const tileBoundsLocal = { x: tileX, y: tileY, width: tileW, height: tileH };

                    if (this.edgeSoftness) {
                        this._applyEdgeSoftness(offCtx, tileRuns.length > 0 ? tileRuns : visibleRuns, tileBoundsLocal);
                    }
                    if (this.endSoftness) {
                        this._applyEndSoftness(offCtx, path, tileBoundsLocal);
                    }

                    entry.version = this._chunkVersion;
                }

                // Stamp tile onto main canvas
                ctx.drawImage(entry.canvas, tileX, tileY);
            }
        }

        ctx.restore();
    }

    /**
     * Filter and return only the runs (or partial runs by reference, not clipped)
     * that have at least one point within or near the given tile rect.
     * We include a run if its bounding box overlaps the tile (expanded by pathWidth).
     */
    _clampRunsToTile(runs, tileX, tileY, tileW, tileH) {
        const pad = this.pathWidth;
        const result = [];
        for (const run of runs) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of run) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            }
            // AABB overlap check with padding
            if (maxX + pad >= tileX && minX - pad <= tileX + tileW &&
                maxY + pad >= tileY && minY - pad <= tileY + tileH) {
                result.push(run);
            }
        }
        return result;
    }
    
    // ==================== PATH BUILDING ====================
    
    /**
     * Rebuild the cached path from current points
     */
    rebuildPath() {
        const rawPoints = this._getRawPathPoints();
        
        if (rawPoints.length < 2) {
            this._cachedPath = rawPoints;
            this._pathLength = 0;
            this._segmentLengths = [];
            return;
        }
        
        if (this.useSpline && rawPoints.length >= 3) {
            this._cachedPath = this._generateSplinePath(rawPoints);
        } else {
            this._cachedPath = rawPoints;
        }
        
        // Calculate path length and segment lengths
        this._segmentLengths = [];
        this._pathLength = 0;
        
        for (let i = 1; i < this._cachedPath.length; i++) {
            const dx = this._cachedPath[i].x - this._cachedPath[i - 1].x;
            const dy = this._cachedPath[i].y - this._cachedPath[i - 1].y;
            const segLength = Math.sqrt(dx * dx + dy * dy);
            this._segmentLengths.push(segLength);
            this._pathLength += segLength;
        }

        // Invalidate chunk cache whenever path geometry changes
        this._chunkVersion = (this._chunkVersion || 0) + 1;

        // Evict entries that are too old to bother keeping
        // (cap cache size to avoid unbounded memory growth on very long paths)
        if (this._chunkCache && this._chunkCache.size > 256) {
            // Keep only entries from the current version (i.e. clear stale ones)
            for (const [key, entry] of this._chunkCache) {
                if (entry.version !== this._chunkVersion) {
                    this._chunkCache.delete(key);
                }
            }
        }
    }
    
    /**
     * Get raw path points in LOCAL coordinates (relative to object position)
     * The canvas transform is already applied by GameObject.draw()
     */
    _getRawPathPoints() {
        // Start with object position (origin in local space)
        const points = [{ x: 0, y: 0 }];
        
        // Add path points (relative offsets from object position)
        for (const point of this.pathPoints) {
            points.push({
                x: point.x || 0,
                y: point.y || 0
            });
        }
        
        return points;
    }
    
    /**
     * Generate smooth spline path using Catmull-Rom interpolation
     */
    _generateSplinePath(controlPoints) {
        if (controlPoints.length < 3) return controlPoints;
        
        const splinePath = [];
        const tension = this.splineTension;
        
        splinePath.push({ ...controlPoints[0] });
        
        for (let i = 0; i < controlPoints.length - 1; i++) {
            const p0 = controlPoints[Math.max(0, i - 1)];
            const p1 = controlPoints[i];
            const p2 = controlPoints[Math.min(controlPoints.length - 1, i + 1)];
            const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];
            
            for (let t = 1; t <= this.splineResolution; t++) {
                const tNorm = t / this.splineResolution;
                const point = this._catmullRom(p0, p1, p2, p3, tNorm, tension);
                splinePath.push(point);
            }
        }
        
        return splinePath;
    }
    
    /**
     * Catmull-Rom spline interpolation
     */
    _catmullRom(p0, p1, p2, p3, t, tension = 0.5) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const v0x = (p2.x - p0.x) * tension;
        const v0y = (p2.y - p0.y) * tension;
        const v1x = (p3.x - p1.x) * tension;
        const v1y = (p3.y - p1.y) * tension;
        
        const a = 2 * p1.x - 2 * p2.x + v0x + v1x;
        const b = -3 * p1.x + 3 * p2.x - 2 * v0x - v1x;
        const c = v0x;
        const d = p1.x;
        
        const e = 2 * p1.y - 2 * p2.y + v0y + v1y;
        const f = -3 * p1.y + 3 * p2.y - 2 * v0y - v1y;
        const g = v0y;
        const h = p1.y;
        
        return {
            x: a * t3 + b * t2 + c * t + d,
            y: e * t3 + f * t2 + g * t + h
        };
    }
    
    // ==================== VIEWPORT CULLING ====================
    
    /**
     * Get path segments that are visible within the viewport
     * Returns an array of "runs" - each run is an array of consecutive visible points
     * This prevents connecting non-adjacent visible segments
     * 
     * CULLING RULES:
     * 1. Include segments where at least one point is inside the viewport
     * 2. Include segments that cross the viewport even if both endpoints are outside
     * 3. Return separate runs for disconnected visible sections
     */
    _getVisiblePathSegments(path, viewX, viewY, viewWidth, viewHeight) {
        if (path.length < 2) return [];
        
        const runs = []; // Array of arrays - each sub-array is a consecutive run
        let currentRun = [];
        
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const isInside = this._isPointInRect(point.x, point.y, viewX, viewY, viewWidth, viewHeight);
            
            // Check if the segment FROM the previous point TO this point should be drawn
            let segmentVisible = false;
            
            if (i > 0) {
                const prevPoint = path[i - 1];
                const prevInside = this._isPointInRect(prevPoint.x, prevPoint.y, viewX, viewY, viewWidth, viewHeight);
                
                // Segment is visible if either endpoint is inside, or if segment crosses viewport
                if (isInside || prevInside) {
                    segmentVisible = true;
                } else if (this._segmentIntersectsRect(
                    prevPoint.x, prevPoint.y, point.x, point.y,
                    viewX, viewY, viewWidth, viewHeight
                )) {
                    segmentVisible = true;
                }
            }
            
            if (segmentVisible) {
                // If starting a new run, add the previous point first
                if (currentRun.length === 0 && i > 0) {
                    currentRun.push({ ...path[i - 1], index: i - 1 });
                }
                currentRun.push({ ...point, index: i });
            } else {
                // Segment not visible - end current run if we have one
                if (currentRun.length >= 2) {
                    runs.push(currentRun);
                }
                currentRun = [];
            }
        }
        
        // Don't forget the last run
        if (currentRun.length >= 2) {
            runs.push(currentRun);
        }
        
        return runs;
    }
    
    /**
     * Check if a point is inside a rectangle
     */
    _isPointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }
    
    /**
     * Check if a line segment intersects a rectangle
     * Uses Cohen-Sutherland-style region coding for efficient culling
     */
    _segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Quick AABB check first
        const segMinX = Math.min(x1, x2);
        const segMaxX = Math.max(x1, x2);
        const segMinY = Math.min(y1, y2);
        const segMaxY = Math.max(y1, y2);
        
        // No intersection if segment's bounding box doesn't overlap rectangle
        if (segMaxX < rx || segMinX > rx + rw || segMaxY < ry || segMinY > ry + rh) {
            return false;
        }
        
        // Check intersection with each edge of the rectangle
        const rectRight = rx + rw;
        const rectBottom = ry + rh;
        
        // Left edge
        if (this._lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, rectBottom)) return true;
        // Right edge
        if (this._lineIntersectsLine(x1, y1, x2, y2, rectRight, ry, rectRight, rectBottom)) return true;
        // Top edge
        if (this._lineIntersectsLine(x1, y1, x2, y2, rx, ry, rectRight, ry)) return true;
        // Bottom edge
        if (this._lineIntersectsLine(x1, y1, x2, y2, rx, rectBottom, rectRight, rectBottom)) return true;
        
        return false;
    }
    
    /**
     * Check if two line segments intersect
     */
    _lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (Math.abs(denom) < 0.0001) return false; // Parallel lines
        
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }
    
    // ==================== PATH STYLE RENDERING ====================
    
    /**
     * Draw path based on current style
     * @param {boolean} isLOD - If true, use simplified rendering for performance
     */
    _drawPathStyle(ctx, segments, startDistance = 0, isLOD = false) {
        if (segments.length < 2) return;
        
        // Path segments are already in local coordinates (0,0 is object position)
        // No offset needed since canvas is already transformed by GameObject.draw()
        const offsetX = 0;
        const offsetY = 0;
        
        // Complex styles that should fall back to solid on LOD
        const complexStyles = ['rope', 'chain', 'magical', 'electric', 'grass', 'stone', 'brick', 
                              'cobblestone', 'wood', 'vine', 'circuit', 'candy', 'rainbow'];
        
        // On LOD, complex styles fall back to simpler rendering
        if (isLOD && complexStyles.includes(this.pathStyle)) {
            this._drawSolidPath(ctx, segments, offsetX, offsetY, startDistance);
            return;
        }
        
        switch (this.pathStyle) {
            case 'dashed':
                this._drawDashedPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'dotted':
                this._drawDottedPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'railroad':
                this._drawRailroadPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'rope':
                this._drawRopePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'chain':
                this._drawChainPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'lava':
                this._drawLavaPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'ice':
                this._drawIcePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'grass':
                this._drawGrassPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'stone':
                this._drawStonePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'magical':
                this._drawMagicalPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'electric':
                this._drawElectricPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'water':
                this._drawWaterPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'brick':
                this._drawBrickPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'neon':
                this._drawNeonPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'sand':
                this._drawSandPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'dirt':
                this._drawDirtPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'mud':
                this._drawMudPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'roadWhite':
                this._drawRoadPath(ctx, segments, offsetX, offsetY, startDistance, 'white');
                break;
            case 'roadYellow':
                this._drawRoadPath(ctx, segments, offsetX, offsetY, startDistance, 'yellow');
                break;
            case 'roadDouble':
                this._drawRoadPath(ctx, segments, offsetX, offsetY, startDistance, 'double');
                break;
            case 'cobblestone':
                this._drawCobblestonePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'wood':
                this._drawWoodPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'metal':
                this._drawMetalPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'candy':
                this._drawCandyPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'rainbow':
                this._drawRainbowPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'blood':
                this._drawBloodPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'slime':
                this._drawSlimePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'circuit':
                this._drawCircuitPath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            case 'vine':
                this._drawVinePath(ctx, segments, offsetX, offsetY, startDistance);
                break;
            default:
                this._drawSolidPath(ctx, segments, offsetX, offsetY, startDistance);
        }
    }
    
    /**
     * Draw solid path with optional border
     */
    _drawSolidPath(ctx, segments, offsetX, offsetY) {
        const capStyle = this.endSoftness ? 'butt' : 'round';
        
        // Draw border first
        if (this.showBorder) {
            ctx.strokeStyle = this.pathBorderColor;
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = capStyle;
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main path with gradient
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, this._lightenColor(this.pathColor, 15));
        gradient.addColorStop(0.5, this.pathColor);
        gradient.addColorStop(1, this._darkenColor(this.pathColor, 10));
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = capStyle;
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Center highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = this.pathWidth * 0.3;
        ctx.stroke();
    }
    
    /**
     * Draw dashed path
     */
    _drawDashedPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        if (this.showBorder) {
            ctx.strokeStyle = this.pathBorderColor;
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        const dashOffset = this.animateTexture ? (this._animationTime * 50) % (this.pathWidth * 2) : 0;
        
        ctx.strokeStyle = this.pathColor;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.setLineDash([this.pathWidth * 1.2, this.pathWidth * 0.6]);
        ctx.lineDashOffset = -dashOffset;
        
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /**
     * Draw dotted path
     */
    _drawDottedPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const dotSpacing = this.pathWidth * 1.5;
        const animOffset = this.animateTexture ? (this._animationTime * 30) % dotSpacing : 0;
        let accumulated = ((animOffset - startDistance % dotSpacing) + dotSpacing) % dotSpacing;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Dot with gradient
                const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, this.pathWidth / 2);
                dotGrad.addColorStop(0, this._lightenColor(this.pathColor, 30));
                dotGrad.addColorStop(1, this.pathColor);
                
                ctx.fillStyle = dotGrad;
                ctx.beginPath();
                ctx.arc(x, y, this.pathWidth / 2, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += dotSpacing;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw railroad track style path
     */
    _drawRailroadPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const railWidth = this.pathWidth * 0.15;
        const railGap = this.pathWidth * 0.35;
        const tieSpacing = this.pathWidth * 0.8;
        const tieWidth = this.pathWidth * 0.2;
        
        // Draw ties (wooden planks)
        const animOffset = this.animateTexture ? (this._animationTime * 20) % tieSpacing : 0;
        let accumulated = ((animOffset - startDistance % tieSpacing) + tieSpacing) % tieSpacing;
        
        // Reset seed based on startDistance for consistent wood grain
        let tieIndex = Math.floor(startDistance / tieSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Set seed based on tie index for consistent wood grain
                this._currentSeed = this.textureSeed + tieIndex * 100;
                
                ctx.fillStyle = '#5c4033';
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.atan2(dy, dx));
                ctx.fillRect(-tieWidth / 2, -this.pathWidth / 2, tieWidth, this.pathWidth);
                
                // Wood grain lines
                ctx.strokeStyle = '#4a3628';
                ctx.lineWidth = 1;
                for (let l = -3; l <= 3; l++) {
                    ctx.beginPath();
                    ctx.moveTo(-tieWidth / 2, l * 4);
                    ctx.lineTo(tieWidth / 2, l * 4 + (this._seededRandom() - 0.5) * 2);
                    ctx.stroke();
                }
                ctx.restore();
                
                accumulated += tieSpacing;
                tieIndex++;
            }
            accumulated -= segLen;
        }
        
        // Draw rails
        for (const side of [-1, 1]) {
            ctx.strokeStyle = '#708090';
            ctx.lineWidth = railWidth;
            ctx.lineCap = this._getCapStyle();
            
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const p = segments[i];
                let perpX = 0, perpY = 0;
                
                if (i < segments.length - 1) {
                    const dx = segments[i + 1].x - p.x;
                    const dy = segments[i + 1].y - p.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    perpX = -dy / len;
                    perpY = dx / len;
                } else if (i > 0) {
                    const dx = p.x - segments[i - 1].x;
                    const dy = p.y - segments[i - 1].y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    perpX = -dy / len;
                    perpY = dx / len;
                }
                
                const x = p.x + perpX * railGap * side - offsetX;
                const y = p.y + perpY * railGap * side - offsetY;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Rail highlight
            ctx.strokeStyle = '#a0a0a0';
            ctx.lineWidth = railWidth * 0.3;
            ctx.stroke();
        }
    }
    
    /**
     * Draw rope style path
     */
    _drawRopePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const ropeWidth = this.pathWidth;
        const strandCount = 3;
        const twistFrequency = 0.05;
        const animOffset = this.animateTexture ? this._animationTime * 2 : 0;
        
        // Draw shadow / border
        if (this.showBorder) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = ropeWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX + 2, segments[0].y - offsetY + 2);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX + 2, segments[i].y - offsetY + 2);
            }
            ctx.stroke();
        }
        
        // Base rope color
        ctx.strokeStyle = this._darkenColor(this.pathColor, 20);
        ctx.lineWidth = ropeWidth;
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Draw twisted strands - use startDistance for stability
        for (let strand = 0; strand < strandCount; strand++) {
            const phase = (strand / strandCount) * Math.PI * 2;
            const strandColor = strand === 0 ? this._lightenColor(this.pathColor, 20) :
                               strand === 1 ? this.pathColor :
                               this._darkenColor(this.pathColor, 15);
            
            ctx.strokeStyle = strandColor;
            ctx.lineWidth = ropeWidth * 0.35;
            ctx.lineCap = this._getCapStyle();
            
            ctx.beginPath();
            let dist = startDistance; // Start from global distance
            for (let i = 0; i < segments.length; i++) {
                const p = segments[i];
                if (i > 0) {
                    const prev = segments[i - 1];
                    dist += Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
                }
                
                let perpX = 0, perpY = 0;
                if (i < segments.length - 1) {
                    const dx = segments[i + 1].x - p.x;
                    const dy = segments[i + 1].y - p.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                } else if (i > 0) {
                    const dx = p.x - segments[i - 1].x;
                    const dy = p.y - segments[i - 1].y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                }
                
                const twist = Math.sin(dist * twistFrequency + phase + animOffset) * ropeWidth * 0.3;
                const x = p.x + perpX * twist - offsetX;
                const y = p.y + perpY * twist - offsetY;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    
    /**
     * Draw chain style path
     */
    _drawChainPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const linkLength = this.pathWidth * 1.2;
        const linkWidth = this.pathWidth * 0.6;
        const linkThickness = this.pathWidth * 0.15;
        const linkSpacing = linkLength * 0.7;
        const animOffset = this.animateTexture ? (this._animationTime * 30) % (linkSpacing * 2) : 0;
        let accumulated = ((animOffset - startDistance % linkSpacing) + linkSpacing) % linkSpacing;
        let linkIndex = Math.floor(startDistance / linkSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                const isHorizontal = linkIndex % 2 === 0;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Draw chain link
                ctx.strokeStyle = this._darkenColor(this.pathColor, 10);
                ctx.lineWidth = linkThickness;
                ctx.lineCap = this._getCapStyle();
                
                if (isHorizontal) {
                    // Horizontal oval link
                    ctx.beginPath();
                    ctx.ellipse(0, 0, linkLength / 2, linkWidth / 2, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    // Highlight
                    ctx.strokeStyle = this._lightenColor(this.pathColor, 30);
                    ctx.lineWidth = linkThickness * 0.5;
                    ctx.beginPath();
                    ctx.ellipse(0, -linkWidth * 0.2, linkLength / 2 - 2, linkWidth / 2 - 2, 0, Math.PI, Math.PI * 1.8);
                    ctx.stroke();
                } else {
                    // Vertical oval link (rotated 90 degrees)
                    ctx.beginPath();
                    ctx.ellipse(0, 0, linkWidth / 2, linkLength / 2, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    ctx.strokeStyle = this._lightenColor(this.pathColor, 30);
                    ctx.lineWidth = linkThickness * 0.5;
                    ctx.beginPath();
                    ctx.ellipse(-linkWidth * 0.2, 0, linkWidth / 2 - 2, linkLength / 2 - 2, 0, Math.PI * 0.5, Math.PI * 1.3);
                    ctx.stroke();
                }
                
                ctx.restore();
                accumulated += linkSpacing;
                linkIndex++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw lava flow style path
     */
    _drawLavaPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Dark crust border
        if (this.showBorder) {
            ctx.strokeStyle = '#1a0a00';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Inner lava gradient
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, '#ff4500');
        gradient.addColorStop(0.3, '#ff6600');
        gradient.addColorStop(0.5, '#ffcc00');
        gradient.addColorStop(0.7, '#ff6600');
        gradient.addColorStop(1, '#ff4500');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Animated hot spots - use startDistance for stability
        if (this.animateTexture) {
            const hotSpotSpacing = this.pathWidth * 2;
            let accumulated = startDistance % hotSpotSpacing;
            
            for (let i = 1; i < segments.length; i++) {
                const p1 = segments[i - 1];
                const p2 = segments[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                if (segLen === 0) continue;
                
                while (accumulated < segLen) {
                    const t = accumulated / segLen;
                    const globalDist = startDistance + accumulated;
                    const x = p1.x + dx * t - offsetX;
                    const y = p1.y + dy * t - offsetY;
                    
                    // Hot spot intensity based on global distance
                    const intensity = (Math.sin(globalDist * 0.02 + time * 3) + 1) * 0.5;
                    if (intensity > 0.5) {
                        const hotSpotGrad = ctx.createRadialGradient(x, y, 0, x, y, this.pathWidth * 0.6);
                        hotSpotGrad.addColorStop(0, `rgba(255, 255, 200, ${intensity * 0.8})`);
                        hotSpotGrad.addColorStop(0.5, `rgba(255, 200, 0, ${intensity * 0.4})`);
                        hotSpotGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
                        
                        ctx.fillStyle = hotSpotGrad;
                        ctx.beginPath();
                        ctx.arc(x, y, this.pathWidth * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    accumulated += hotSpotSpacing;
                }
                accumulated -= segLen;
            }
        }
        
        // Crust cracks - use startDistance for stability
        const crackSpacing = 20;
        let crackAccum = startDistance % crackSpacing;
        let crackIdx = Math.floor(startDistance / crackSpacing);
        ctx.strokeStyle = '#330000';
        ctx.lineWidth = 1;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            while (crackAccum < segLen) {
                const t = crackAccum / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + crackIdx * 100;
                const crackLen = 5 + this._seededRandom() * 10;
                const crackAngle = this._seededRandom() * Math.PI * 2;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(crackAngle) * crackLen, y + Math.sin(crackAngle) * crackLen);
                ctx.stroke();
                
                crackAccum += crackSpacing;
                crackIdx++;
            }
            crackAccum -= segLen;
        }
    }
    
    /**
     * Draw ice path style
     */
    _drawIcePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Icy glow
        if (this.animateTexture) {
            ctx.shadowColor = '#88ccff';
            ctx.shadowBlur = 10 + Math.sin(this._animationTime * 2) * 5;
        }
        
        // Border (frost)
        if (this.showBorder) {
            ctx.strokeStyle = '#a0c0d0';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main ice body
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, '#d0e8f0');
        gradient.addColorStop(0.3, '#e8f4ff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(0.7, '#e8f4ff');
        gradient.addColorStop(1, '#c0d8e8');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Ice cracks - use startDistance for stability
        const crackSpacing = 25;
        let accumulated = startDistance % crackSpacing;
        let crackIdx = Math.floor(startDistance / crackSpacing);
        ctx.strokeStyle = 'rgba(100, 150, 180, 0.4)';
        ctx.lineWidth = 1;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Draw branching crack - seed based on crack index
                this._currentSeed = this.textureSeed + crackIdx * 100;
                this._drawIceCrack(ctx, x, y, this._seededRandom() * Math.PI * 2, 15, 3);
                accumulated += crackSpacing;
                crackIdx++;
            }
            accumulated -= segLen;
        }
        
        // Sparkles - use startDistance for stability
        const sparkleSpacing = 30;
        let sparkleAccum = startDistance % sparkleSpacing;
        let sparkleIdx = Math.floor(startDistance / sparkleSpacing);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (sparkleAccum < segLen) {
                const t = sparkleAccum / segLen;
                this._currentSeed = this.textureSeed + sparkleIdx * 100;
                const offX = (this._seededRandom() - 0.5) * this.pathWidth * 0.8;
                const offY = (this._seededRandom() - 0.5) * this.pathWidth * 0.8;
                const x = p1.x + dx * t - offsetX + perpX * offX;
                const y = p1.y + dy * t - offsetY + perpY * offY;
                
                const sparkleSize = 1 + this._seededRandom() * 2;
                ctx.beginPath();
                ctx.arc(x, y, sparkleSize, 0, Math.PI * 2);
                ctx.fill();
                
                sparkleAccum += sparkleSpacing;
                sparkleIdx++;
            }
            sparkleAccum -= segLen;
        }
    }
    
    _drawIceCrack(ctx, x, y, angle, length, depth) {
        if (depth <= 0 || length < 3) return;
        
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Branch
        if (this._seededRandom() > 0.5) {
            const branchAngle = angle + (this._seededRandom() - 0.5) * Math.PI * 0.5;
            this._drawIceCrack(ctx, endX, endY, branchAngle, length * 0.6, depth - 1);
        }
    }
    
    /**
     * Draw grass trail style
     */
    _drawGrassPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Dirt base border
        if (this.showBorder) {
            ctx.strokeStyle = this.pathBorderColor || '#5a4a32';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main dirt path
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, '#5f4f3b');
        gradient.addColorStop(0.5, '#614e3a');
        gradient.addColorStop(1, '#66543f');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Draw grass tufts along edges
        const grassSpacing = 15;
        let accumulated = startDistance % grassSpacing;
        let grassIndex = Math.floor(startDistance / grassSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Draw grass on both sides
                for (const side of [-1, 1]) {
                    // Set seed based on grass index for consistent appearance
                    this._currentSeed = this.textureSeed + grassIndex * 100 + (side === 1 ? 50 : 0);
                    
                    const grassX = x + perpX * (this.pathWidth / 2 + 3) * side;
                    const grassY = y + perpY * (this.pathWidth / 2 + 3) * side;
                    
                    // Random grass tuft
                    ctx.save();
                    ctx.translate(grassX, grassY);
                    ctx.rotate(this._seededRandom() * 0.4 - 0.2);
                    
                    const hue = 100 + this._seededRandom() * 30;
                    const sat = 50 + this._seededRandom() * 20;
                    const light = 30 + this._seededRandom() * 15;
                    ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
                    
                    // Draw grass blades
                    for (let b = 0; b < 3; b++) {
                        const bladeAngle = (b - 1) * 0.3 + (this._seededRandom() - 0.5) * 0.2;
                        const bladeHeight = 6 + this._seededRandom() * 6;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.quadraticCurveTo(
                            Math.sin(bladeAngle) * bladeHeight * 0.5,
                            -bladeHeight * 0.5,
                            Math.sin(bladeAngle) * bladeHeight,
                            -bladeHeight
                        );
                        ctx.quadraticCurveTo(
                            Math.sin(bladeAngle) * bladeHeight + 1,
                            -bladeHeight * 0.5,
                            2,
                            0
                        );
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.restore();
                }
                
                accumulated += grassSpacing;
                grassIndex++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw stone/cobblestone path
     */
    _drawStonePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Dark base border
        if (this.showBorder) {
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Base stone color
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Draw cobblestones
        const stoneSpacing = this.pathWidth * 0.7;
        let accumulated = startDistance % stoneSpacing;
        let stoneIndex = Math.floor(startDistance / stoneSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Set seed based on stone index for consistent appearance
                this._currentSeed = this.textureSeed + stoneIndex * 100;
                
                // Draw stone
                const stoneSize = this.pathWidth * 0.3 + Math.sin(stoneIndex * 1.5) * 3;
                const shade = 55 + Math.sin(stoneIndex * 2.3) * 20;
                const offsetRand = (Math.sin(stoneIndex * 3.7) - 0.5) * this.pathWidth * 0.2;
                
                ctx.fillStyle = `hsl(30, 5%, ${shade}%)`;
                ctx.beginPath();
                ctx.ellipse(x + offsetRand, y, stoneSize, stoneSize * (0.7 + this._seededRandom() * 0.3), stoneIndex * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Stone outline
                ctx.strokeStyle = `hsl(30, 5%, ${shade - 15}%)`;
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Highlight
                ctx.strokeStyle = `hsl(30, 5%, ${shade + 15}%)`;
                ctx.beginPath();
                ctx.arc(x + offsetRand - stoneSize * 0.2, y - stoneSize * 0.2, stoneSize * 0.4, Math.PI, Math.PI * 1.5);
                ctx.stroke();
                
                accumulated += stoneSpacing;
                stoneIndex++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw magical/ethereal path
     */
    _drawMagicalPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Border glow
        if (this.showBorder) {
            ctx.strokeStyle = '#4400aa';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Outer glow
        ctx.shadowColor = this.glowColor || '#8800ff';
        ctx.shadowBlur = 20 + Math.sin(time * 2) * 5;
        
        // Main path with animated gradient
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        
        const hueShift = this.animateTexture ? (time * 30) % 360 : 0;
        gradient.addColorStop(0, `hsl(${(270 + hueShift) % 360}, 70%, 60%)`);
        gradient.addColorStop(0.5, `hsl(${(300 + hueShift) % 360}, 80%, 70%)`);
        gradient.addColorStop(1, `hsl(${(330 + hueShift) % 360}, 70%, 60%)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Animated particles - use startDistance for stability
        if (this.animateTexture) {
            const particleSpacing = 20;
            const animOffset = (time * 50) % particleSpacing;
            let accumulated = (startDistance + animOffset) % particleSpacing;
            
            for (let i = 1; i < segments.length; i++) {
                const p1 = segments[i - 1];
                const p2 = segments[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                if (segLen === 0) continue;
                const perpX = -dy / segLen;
                const perpY = dx / segLen;
                
                while (accumulated < segLen) {
                    const t = accumulated / segLen;
                    const globalDist = startDistance + accumulated;
                    const baseX = p1.x + dx * t - offsetX;
                    const baseY = p1.y + dy * t - offsetY;
                    
                    // Floating particle
                    const floatOffset = Math.sin(time * 3 + globalDist * 0.1) * this.pathWidth * 0.3;
                    const particleX = baseX + perpX * floatOffset;
                    const particleY = baseY + perpY * floatOffset;
                    const particleSize = 2 + Math.sin(time * 5 + globalDist) * 1.5;
                    const alpha = 0.5 + Math.sin(time * 4 + globalDist * 0.2) * 0.3;
                    
                    const particleGrad = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, particleSize * 2);
                    particleGrad.addColorStop(0, `hsla(${(280 + time * 20 + globalDist) % 360}, 100%, 80%, ${alpha})`);
                    particleGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    ctx.fillStyle = particleGrad;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, particleSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    accumulated += particleSpacing;
                }
                accumulated -= segLen;
            }
        }
        
        // Runes along path - use startDistance for stability
        const runeSpacing = this.pathWidth * 2.5;
        let runeAccum = startDistance % runeSpacing;
        let runeIdx = Math.floor(startDistance / runeSpacing);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${this.pathWidth * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const runes = ['✦', '✧', '◇', '○', '◈', '✴'];
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            while (runeAccum < segLen) {
                const t = runeAccum / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                const runeIndex = runeIdx % runes.length;
                
                ctx.save();
                ctx.translate(x, y);
                if (this.animateTexture) {
                    ctx.rotate(time + runeIdx * 0.5);
                    ctx.globalAlpha = 0.4 + Math.sin(time * 2 + runeIdx * 0.5) * 0.3;
                }
                ctx.fillText(runes[runeIndex], 0, 0);
                ctx.restore();
                
                runeAccum += runeSpacing;
                runeIdx++;
            }
            runeAccum -= segLen;
        }
    }
    
    /**
     * Draw electric/lightning path
     */
    _drawElectricPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Dark conduit border
        if (this.showBorder) {
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Inner conduit
        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Electric glow
        ctx.shadowColor = this.pathColor || '#00ffff';
        ctx.shadowBlur = 15 + (this.animateTexture ? Math.sin(time * 10) * 8 : 0);
        
        // Lightning bolts - use startDistance for stability
        const boltSpacing = this.pathWidth * 1.5;
        const animOffset = this.animateTexture ? (time * 100) % boltSpacing : 0;
        let accumulated = (startDistance + animOffset) % boltSpacing;
        let boltIdx = Math.floor(startDistance / boltSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                const globalDist = startDistance + accumulated;
                
                // Draw lightning bolt segment
                const intensity = this.animateTexture ? 
                    0.3 + Math.abs(Math.sin(time * 15 + globalDist * 0.2)) * 0.7 : 0.8;
                
                ctx.strokeStyle = `rgba(100, 200, 255, ${intensity})`;
                ctx.lineWidth = 2 + intensity * 2;
                
                // Jagged line - seed based on bolt index for stability
                this._currentSeed = this.textureSeed + boltIdx * 100;
                ctx.beginPath();
                const startX = x + perpX * this.pathWidth * 0.3 * (this._seededRandom() - 0.5);
                const startY = y + perpY * this.pathWidth * 0.3 * (this._seededRandom() - 0.5);
                ctx.moveTo(startX, startY);
                
                let boltX = startX;
                let boltY = startY;
                const boltLength = this.pathWidth * 0.8;
                const segments_bolt = 3 + Math.floor(this._seededRandom() * 3);
                
                for (let s = 0; s < segments_bolt; s++) {
                    const angle = Math.atan2(dy, dx) + (this._seededRandom() - 0.5) * 1.5;
                    const stepLen = boltLength / segments_bolt;
                    boltX += Math.cos(angle) * stepLen;
                    boltY += Math.sin(angle) * stepLen;
                    ctx.lineTo(boltX, boltY);
                }
                ctx.stroke();
                
                // Bright core
                if (intensity > 0.6) {
                    ctx.strokeStyle = `rgba(200, 255, 255, ${intensity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                
                accumulated += boltSpacing;
                boltIdx++;
            }
            accumulated -= segLen;
        }
        
        ctx.shadowBlur = 0;
        
        // Energy nodes at intervals - use startDistance for stability
        const nodeSpacing = this.pathWidth * 3;
        let nodeAccum = startDistance % nodeSpacing;
        let nodeIdx = Math.floor(startDistance / nodeSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            while (nodeAccum < segLen) {
                const t = nodeAccum / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                const nodeGrad = ctx.createRadialGradient(x, y, 0, x, y, this.pathWidth * 0.4);
                const pulseIntensity = this.animateTexture ? 
                    0.5 + Math.sin(time * 5 + nodeIdx * 0.5) * 0.3 : 0.7;
                nodeGrad.addColorStop(0, `rgba(150, 255, 255, ${pulseIntensity})`);
                nodeGrad.addColorStop(0.5, `rgba(50, 150, 255, ${pulseIntensity * 0.5})`);
                nodeGrad.addColorStop(1, 'rgba(0, 50, 100, 0)');
                
                ctx.fillStyle = nodeGrad;
                ctx.beginPath();
                ctx.arc(x, y, this.pathWidth * 0.4, 0, Math.PI * 2);
                ctx.fill();
                
                nodeAccum += nodeSpacing;
                nodeIdx++;
            }
            nodeAccum -= segLen;
        }
    }
    
    /**
     * Draw water stream style path
     */
    _drawWaterPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // River bank border
        if (this.showBorder) {
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Water gradient
        const waterGrad = ctx.createLinearGradient(
            segments[0].x - offsetX - this.pathWidth,
            segments[0].y - offsetY,
            segments[0].x - offsetX + this.pathWidth,
            segments[0].y - offsetY
        );
        waterGrad.addColorStop(0, '#1565c0');
        waterGrad.addColorStop(0.3, '#42a5f5');
        waterGrad.addColorStop(0.5, '#64b5f6');
        waterGrad.addColorStop(0.7, '#42a5f5');
        waterGrad.addColorStop(1, '#1565c0');
        
        ctx.strokeStyle = waterGrad;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Animated wave ripples - use startDistance for stability
        const waveSpacing = 25;
        const animOffset = this.animateTexture ? (time * 40) % waveSpacing : 0;
        let accumulated = (startDistance + animOffset) % waveSpacing;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                const globalDist = startDistance + accumulated - animOffset;
                
                // Wave arc
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                const wavePhase = this.animateTexture ? Math.sin(time * 3 + globalDist * 0.05) : 0;
                ctx.beginPath();
                ctx.arc(0, wavePhase * 3, this.pathWidth * 0.35, -0.6, 0.6);
                ctx.stroke();
                
                ctx.restore();
                
                accumulated += waveSpacing;
            }
            accumulated -= segLen;
        }
        
        // Foam spots - use startDistance for stability
        const foamSpacing = 18;
        let foamAccum = startDistance % foamSpacing;
        let foamIdx = Math.floor(startDistance / foamSpacing);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (foamAccum < segLen) {
                const t = foamAccum / segLen;
                const baseX = p1.x + dx * t - offsetX;
                const baseY = p1.y + dy * t - offsetY;
                
                // Seed based on foam index for stability
                this._currentSeed = this.textureSeed + foamIdx * 100;
                const offset = (this._seededRandom() - 0.5) * this.pathWidth * 0.6;
                const x = baseX + perpX * offset;
                const y = baseY + perpY * offset;
                
                const foamSize = 2 + this._seededRandom() * 3;
                ctx.beginPath();
                ctx.arc(x, y, foamSize, 0, Math.PI * 2);
                ctx.fill();
                
                foamAccum += foamSpacing;
                foamIdx++;
            }
            foamAccum -= segLen;
        }
    }
    
    /**
     * Draw brick road style path
     */
    _drawBrickPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Dark mortar base / border
        if (this.showBorder) {
            ctx.strokeStyle = '#4a3728';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Mortar base
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Draw bricks
        const brickWidth = this.pathWidth * 0.5;
        const brickHeight = this.pathWidth * 0.22;
        const brickSpacing = brickWidth + 2;
        let accumulated = startDistance % brickSpacing;
        let rowIndex = Math.floor(startDistance / brickSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            const angle = Math.atan2(dy, dx);
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Draw 3 rows of bricks
                for (let row = -1; row <= 1; row++) {
                    const brickX = x + perpX * row * (brickHeight + 1.5);
                    const brickY = y + perpY * row * (brickHeight + 1.5);
                    
                    // Offset alternating rows
                    const rowShift = (row % 2 === 0) ? 0 : brickWidth * 0.5;
                    const adjustedX = brickX + Math.cos(angle) * rowShift;
                    const adjustedY = brickY + Math.sin(angle) * rowShift;
                    
                    // Brick color variation - use rowIndex for stability
                    const hue = 8 + Math.sin(rowIndex + row) * 8;
                    const shade = 38 + Math.sin(rowIndex * 0.5 + row * 2) * 8;
                    
                    ctx.save();
                    ctx.translate(adjustedX, adjustedY);
                    ctx.rotate(angle);
                    
                    // Brick shadow
                    ctx.fillStyle = `hsl(${hue}, 50%, ${shade - 8}%)`;
                    ctx.fillRect(-brickWidth/2 + 1, -brickHeight/2 + 1, brickWidth - 2, brickHeight - 2);
                    
                    // Brick face
                    ctx.fillStyle = `hsl(${hue}, 55%, ${shade}%)`;
                    ctx.fillRect(-brickWidth/2, -brickHeight/2, brickWidth - 2, brickHeight - 2);
                    
                    ctx.restore();
                }
                
                accumulated += brickSpacing;
                rowIndex++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw neon glow style path
     */
    _drawNeonPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        const pulseIntensity = this.animateTexture ? 0.7 + Math.sin(time * 4) * 0.3 : 1;
        
        // Dark background border
        if (this.showBorder) {
            ctx.strokeStyle = '#0a0a15';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Outer glow
        ctx.shadowColor = this.pathColor;
        ctx.shadowBlur = 25 * pulseIntensity;
        ctx.strokeStyle = this.pathColor;
        ctx.lineWidth = this.pathWidth;
        ctx.stroke();
        
        // Inner bright core
        ctx.shadowBlur = 15 * pulseIntensity;
        ctx.strokeStyle = this._lightenColor(this.pathColor, 40);
        ctx.lineWidth = this.pathWidth * 0.6;
        ctx.stroke();
        
        // Center white hot core
        ctx.shadowBlur = 10 * pulseIntensity;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * pulseIntensity})`;
        ctx.lineWidth = this.pathWidth * 0.2;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Animated energy pulses
        if (this.animateTexture) {
            const pulseSpacing = this.pathWidth * 3;
            let pulseAccum = (time * 80) % pulseSpacing;
            
            for (let i = 1; i < segments.length; i++) {
                const p1 = segments[i - 1];
                const p2 = segments[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                
                while (pulseAccum < segLen) {
                    const t = pulseAccum / segLen;
                    const x = p1.x + dx * t - offsetX;
                    const y = p1.y + dy * t - offsetY;
                    
                    const pulseGrad = ctx.createRadialGradient(x, y, 0, x, y, this.pathWidth * 0.8);
                    pulseGrad.addColorStop(0, `${this._lightenColor(this.pathColor, 60)}cc`);
                    pulseGrad.addColorStop(0.5, `${this.pathColor}66`);
                    pulseGrad.addColorStop(1, 'transparent');
                    
                    ctx.fillStyle = pulseGrad;
                    ctx.beginPath();
                    ctx.arc(x, y, this.pathWidth * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    pulseAccum += pulseSpacing;
                }
                pulseAccum -= segLen;
            }
        }
    }
    
    /**
     * Draw sandy beach path style
     */
    _drawSandPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Rocky edge border
        if (this.showBorder) {
            ctx.strokeStyle = '#8b7355';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Sand gradient
        const sandGrad = ctx.createLinearGradient(
            segments[0].x - offsetX - this.pathWidth,
            segments[0].y - offsetY,
            segments[0].x - offsetX + this.pathWidth,
            segments[0].y - offsetY
        );
        sandGrad.addColorStop(0, '#c9b896');
        sandGrad.addColorStop(0.3, '#e8dcc8');
        sandGrad.addColorStop(0.5, '#f5e6d3');
        sandGrad.addColorStop(0.7, '#e8dcc8');
        sandGrad.addColorStop(1, '#c9b896');
        
        ctx.strokeStyle = sandGrad;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Sand grain texture - use startDistance for stability
        const grainSpacing = 8;
        let grainAccum = startDistance % grainSpacing;
        let grainIdx = Math.floor(startDistance / grainSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (grainAccum < segLen) {
                const t = grainAccum / segLen;
                const baseX = p1.x + dx * t - offsetX;
                const baseY = p1.y + dy * t - offsetY;
                
                // Scatter grains across width - seed based on index
                for (let g = 0; g < 3; g++) {
                    this._currentSeed = this.textureSeed + grainIdx * 100 + g * 33;
                    const offset = (this._seededRandom() - 0.5) * this.pathWidth * 0.8;
                    const x = baseX + perpX * offset;
                    const y = baseY + perpY * offset;
                    
                    const shade = 180 + this._seededRandom() * 40;
                    ctx.fillStyle = `rgb(${shade}, ${shade - 20}, ${shade - 40})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 0.5 + this._seededRandom(), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                grainAccum += grainSpacing;
                grainIdx++;
            }
            grainAccum -= segLen;
        }
        
        // Small pebbles - use startDistance for stability
        const pebbleSpacing = 35;
        let pebbleAccum = startDistance % pebbleSpacing;
        let pebbleIdx = Math.floor(startDistance / pebbleSpacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (pebbleAccum < segLen) {
                const t = pebbleAccum / segLen;
                const baseX = p1.x + dx * t - offsetX;
                const baseY = p1.y + dy * t - offsetY;
                
                // Seed based on pebble index
                this._currentSeed = this.textureSeed + pebbleIdx * 100;
                const offset = (this._seededRandom() - 0.5) * this.pathWidth * 0.5;
                const x = baseX + perpX * offset;
                const y = baseY + perpY * offset;
                
                const pebbleSize = 2 + this._seededRandom() * 3;
                const shade = 100 + this._seededRandom() * 40;
                ctx.fillStyle = `hsl(30, 10%, ${shade / 2.55}%)`;
                ctx.beginPath();
                ctx.ellipse(x, y, pebbleSize, pebbleSize * 0.7, this._seededRandom() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
                
                pebbleAccum += pebbleSpacing;
                pebbleIdx++;
            }
            pebbleAccum -= segLen;
        }
    }

    // ==================== NEW PATH STYLES ====================
    
    /**
     * Draw dirt trail path
     */
    _drawDirtPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = this._darkenColor('#8B4513', 30);
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main dirt color
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.5, '#A0522D');
        gradient.addColorStop(1, '#8B4513');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Add dirt texture (small rocks and marks)
        const spacing = 8;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const off = (this._seededRandom() - 0.5) * this.pathWidth * 0.7;
                const shade = 90 + this._seededRandom() * 40;
                ctx.fillStyle = `hsl(25, 40%, ${shade / 2.55}%)`;
                ctx.beginPath();
                ctx.arc(x + perpX * off, y + perpY * off, 1 + this._seededRandom() * 2, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw muddy path
     */
    _drawMudPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = '#3d2817';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main mud color
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Wet spots / puddles
        const spacing = this.pathWidth * 0.8;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const off = (this._seededRandom() - 0.5) * this.pathWidth * 0.5;
                const puddleSize = 4 + this._seededRandom() * 8;
                
                // Darker wet mud
                ctx.fillStyle = 'rgba(60, 40, 25, 0.6)';
                ctx.beginPath();
                ctx.ellipse(x + perpX * off, y + perpY * off, puddleSize, puddleSize * 0.6, idx, 0, Math.PI * 2);
                ctx.fill();
                
                // Reflection highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.ellipse(x + perpX * off - 2, y + perpY * off - 2, puddleSize * 0.4, puddleSize * 0.3, idx, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw road with lane markings
     */
    _drawRoadPath(ctx, segments, offsetX, offsetY, startDistance = 0, lineType = 'white') {
        // Road edge / border
        if (this.showBorder) {
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Main asphalt
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Asphalt texture
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = this.pathWidth * 0.9;
        ctx.stroke();
        
        // Lane markings
        const dashLength = this.pathWidth * 1.5;
        const gapLength = this.pathWidth;
        const totalCycle = dashLength + gapLength;
        const lineColor = lineType === 'yellow' || lineType === 'double' ? '#ffd700' : '#ffffff';
        
        if (lineType === 'double') {
            // Double yellow lines
            for (const offset of [-2, 2]) {
                let accumulated = startDistance % totalCycle;
                
                for (let i = 1; i < segments.length; i++) {
                    const p1 = segments[i - 1];
                    const p2 = segments[i];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const segLen = Math.sqrt(dx * dx + dy * dy);
                    if (segLen === 0) continue;
                    const perpX = -dy / segLen;
                    const perpY = dx / segLen;
                    
                    while (accumulated < segLen) {
                        const t1 = accumulated / segLen;
                        const t2 = Math.min((accumulated + dashLength) / segLen, 1);
                        
                        const x1 = p1.x + dx * t1 - offsetX + perpX * offset;
                        const y1 = p1.y + dy * t1 - offsetY + perpY * offset;
                        const x2 = p1.x + dx * t2 - offsetX + perpX * offset;
                        const y2 = p1.y + dy * t2 - offsetY + perpY * offset;
                        
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = 2;
                        ctx.lineCap = 'butt';
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                        
                        accumulated += totalCycle;
                    }
                    accumulated -= segLen;
                }
            }
        } else {
            // Single dashed line
            let accumulated = startDistance % totalCycle;
            
            for (let i = 1; i < segments.length; i++) {
                const p1 = segments[i - 1];
                const p2 = segments[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                if (segLen === 0) continue;
                
                while (accumulated < segLen) {
                    const t1 = accumulated / segLen;
                    const t2 = Math.min((accumulated + dashLength) / segLen, 1);
                    
                    const x1 = p1.x + dx * t1 - offsetX;
                    const y1 = p1.y + dy * t1 - offsetY;
                    const x2 = p1.x + dx * t2 - offsetX;
                    const y2 = p1.y + dy * t2 - offsetY;
                    
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'butt';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    
                    accumulated += totalCycle;
                }
                accumulated -= segLen;
            }
        }
    }
    
    /**
     * Draw cobblestone path
     */
    _drawCobblestonePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Base mortar
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Cobblestones
        const stoneSize = this.pathWidth * 0.25;
        const spacing = stoneSize * 1.1;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Draw multiple rows of stones
                for (let row = -1; row <= 1; row++) {
                    this._currentSeed = this.textureSeed + idx * 100 + row * 33;
                    const rowOffset = row * stoneSize * 1.05;
                    const stagger = (idx % 2 === 0 ? 0 : stoneSize * 0.5) * (row % 2 === 0 ? 1 : -1);
                    const sx = x + perpX * rowOffset;
                    const sy = y + perpY * rowOffset;
                    
                    const shade = 50 + this._seededRandom() * 30;
                    const size = stoneSize * (0.8 + this._seededRandom() * 0.4);
                    
                    ctx.fillStyle = `hsl(0, 0%, ${shade}%)`;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy, size, size * 0.8, this._seededRandom() * Math.PI, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Highlight
                    ctx.fillStyle = `hsl(0, 0%, ${shade + 15}%)`;
                    ctx.beginPath();
                    ctx.ellipse(sx - size * 0.2, sy - size * 0.2, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw wooden plank path
     */
    _drawWoodPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = '#2d1f14';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Draw planks
        const plankWidth = this.pathWidth * 0.4;
        const spacing = plankWidth + 3;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const shade = 35 + this._seededRandom() * 20;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Plank shadow
                ctx.fillStyle = `hsl(30, 40%, ${shade - 10}%)`;
                ctx.fillRect(-plankWidth/2 + 1, -this.pathWidth/2 + 1, plankWidth - 2, this.pathWidth - 2);
                
                // Plank face
                ctx.fillStyle = `hsl(30, 40%, ${shade}%)`;
                ctx.fillRect(-plankWidth/2, -this.pathWidth/2, plankWidth - 2, this.pathWidth - 2);
                
                // Wood grain
                ctx.strokeStyle = `hsl(30, 30%, ${shade - 5}%)`;
                ctx.lineWidth = 0.5;
                for (let g = 0; g < 4; g++) {
                    const gy = -this.pathWidth/2 + (g + 0.5) * (this.pathWidth / 4);
                    ctx.beginPath();
                    ctx.moveTo(-plankWidth/2 + 2, gy);
                    ctx.lineTo(plankWidth/2 - 4, gy + (this._seededRandom() - 0.5) * 3);
                    ctx.stroke();
                }
                
                ctx.restore();
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw metal grating path
     */
    _drawMetalPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Base metal
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Grating pattern
        const spacing = 10;
        let accumulated = startDistance % spacing;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Cross hatch lines
                ctx.strokeStyle = '#3a3a3a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + perpX * this.pathWidth * 0.4, y + perpY * this.pathWidth * 0.4);
                ctx.lineTo(x - perpX * this.pathWidth * 0.4, y - perpY * this.pathWidth * 0.4);
                ctx.stroke();
                
                accumulated += spacing;
            }
            accumulated -= segLen;
        }
        
        // Highlight edge
        ctx.strokeStyle = '#6a6a6a';
        ctx.lineWidth = 2;
        ctx.lineCap = this._getCapStyle();
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
    }
    
    /**
     * Draw candy path
     */
    _drawCandyPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Border
        if (this.showBorder) {
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        // Base pink
        ctx.strokeStyle = '#FFB6C1';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Candy stripes
        const stripeSpacing = this.pathWidth * 0.6;
        const animOffset = this.animateTexture ? (time * 30) % stripeSpacing : 0;
        let accumulated = (startDistance + animOffset) % stripeSpacing;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = this.pathWidth * 0.15;
                ctx.beginPath();
                ctx.moveTo(x + perpX * this.pathWidth * 0.4, y + perpY * this.pathWidth * 0.4);
                ctx.lineTo(x - perpX * this.pathWidth * 0.4, y - perpY * this.pathWidth * 0.4);
                ctx.stroke();
                
                accumulated += stripeSpacing;
            }
            accumulated -= segLen;
        }
        
        // Sparkles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        let sparkleAccum = startDistance % 25;
        let sparkleIdx = Math.floor(startDistance / 25);
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (sparkleAccum < segLen) {
                const t = sparkleAccum / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + sparkleIdx * 100;
                const off = (this._seededRandom() - 0.5) * this.pathWidth * 0.6;
                ctx.beginPath();
                ctx.arc(x + perpX * off, y + perpY * off, 1 + this._seededRandom(), 0, Math.PI * 2);
                ctx.fill();
                
                sparkleAccum += 25;
                sparkleIdx++;
            }
            sparkleAccum -= segLen;
        }
    }
    
    /**
     * Draw rainbow path
     */
    _drawRainbowPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
        const stripeHeight = this.pathWidth / colors.length;
        
        // Draw each color stripe
        for (let c = 0; c < colors.length; c++) {
            const offset = (c - (colors.length - 1) / 2) * stripeHeight;
            const hueShift = this.animateTexture ? (time * 50 + c * 20) % 360 : 0;
            
            ctx.strokeStyle = colors[c];
            ctx.lineWidth = stripeHeight + 1;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const p = segments[i];
                let perpX = 0, perpY = 0;
                
                if (i < segments.length - 1) {
                    const dx = segments[i + 1].x - p.x;
                    const dy = segments[i + 1].y - p.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                } else if (i > 0) {
                    const dx = p.x - segments[i - 1].x;
                    const dy = p.y - segments[i - 1].y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                }
                
                const x = p.x + perpX * offset - offsetX;
                const y = p.y + perpY * offset - offsetY;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        // Sparkle overlay
        if (this.animateTexture) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            let sparkleAccum = (startDistance + time * 40) % 20;
            for (let i = 1; i < segments.length; i++) {
                const p1 = segments[i - 1];
                const p2 = segments[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                if (segLen === 0) continue;
                const perpX = -dy / segLen;
                const perpY = dx / segLen;
                
                while (sparkleAccum < segLen) {
                    const t = sparkleAccum / segLen;
                    const x = p1.x + dx * t - offsetX;
                    const y = p1.y + dy * t - offsetY;
                    const off = Math.sin(sparkleAccum * 0.3 + time * 5) * this.pathWidth * 0.3;
                    
                    ctx.beginPath();
                    ctx.arc(x + perpX * off, y + perpY * off, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    sparkleAccum += 20;
                }
                sparkleAccum -= segLen;
            }
        }
    }
    
    /**
     * Draw blood trail path
     */
    _drawBloodPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        // Dark base
        ctx.strokeStyle = '#2a0a0a';
        ctx.lineWidth = this.pathWidth + (this.showBorder ? this.borderWidth * 2 : 0);
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Main blood color
        const gradient = ctx.createLinearGradient(
            segments[0].x - offsetX, segments[0].y - offsetY,
            segments[segments.length - 1].x - offsetX, segments[segments.length - 1].y - offsetY
        );
        gradient.addColorStop(0, '#8B0000');
        gradient.addColorStop(0.5, '#B22222');
        gradient.addColorStop(1, '#8B0000');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.stroke();
        
        // Blood splatters
        const spacing = 15;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const off = (this._seededRandom() - 0.5) * this.pathWidth * 0.8;
                const splatterSize = 2 + this._seededRandom() * 4;
                
                ctx.fillStyle = `rgba(139, 0, 0, ${0.3 + this._seededRandom() * 0.4})`;
                ctx.beginPath();
                ctx.arc(x + perpX * off, y + perpY * off, splatterSize, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw slime trail path
     */
    _drawSlimePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Slime glow
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = this.animateTexture ? 10 + Math.sin(time * 3) * 5 : 10;
        
        // Main slime
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Highlight
        ctx.strokeStyle = 'rgba(144, 238, 144, 0.5)';
        ctx.lineWidth = this.pathWidth * 0.4;
        ctx.stroke();
        
        // Bubbles
        const spacing = 20;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const off = (this._seededRandom() - 0.5) * this.pathWidth * 0.6;
                const bubbleSize = 2 + this._seededRandom() * 4;
                const bubbleY = this.animateTexture ? Math.sin(time * 4 + idx) * 2 : 0;
                
                ctx.fillStyle = 'rgba(144, 238, 144, 0.6)';
                ctx.beginPath();
                ctx.arc(x + perpX * off, y + perpY * off + bubbleY, bubbleSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Bubble highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(x + perpX * off - bubbleSize * 0.3, y + perpY * off + bubbleY - bubbleSize * 0.3, bubbleSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw circuit board path
     */
    _drawCircuitPath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // PCB green base
        if (this.showBorder) {
            ctx.strokeStyle = '#0a2a0a';
            ctx.lineWidth = this.pathWidth + this.borderWidth * 2;
            ctx.lineCap = this._getCapStyle();
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
            }
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#1a4a1a';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Circuit traces
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Circuit nodes
        const spacing = this.pathWidth * 0.8;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                // Node glow when animated
                if (this.animateTexture) {
                    const pulse = Math.sin(time * 5 + idx * 0.5) > 0.5 ? 1 : 0.3;
                    ctx.fillStyle = `rgba(0, 255, 0, ${pulse * 0.8})`;
                } else {
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
                }
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Silver solder pad
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#e0e0e0';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }
    
    /**
     * Draw vine path
     */
    _drawVinePath(ctx, segments, offsetX, offsetY, startDistance = 0) {
        const time = this._animationTime;
        
        // Main vine
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = this.pathWidth * 0.4;
        ctx.lineCap = this._getCapStyle();
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segments[0].x - offsetX, segments[0].y - offsetY);
        for (let i = 1; i < segments.length; i++) {
            ctx.lineTo(segments[i].x - offsetX, segments[i].y - offsetY);
        }
        ctx.stroke();
        
        // Secondary vines
        ctx.strokeStyle = '#2E8B2E';
        ctx.lineWidth = this.pathWidth * 0.2;
        for (const offset of [-0.3, 0.3]) {
            ctx.beginPath();
            for (let i = 0; i < segments.length; i++) {
                const p = segments[i];
                let perpX = 0, perpY = 0;
                
                if (i < segments.length - 1) {
                    const dx = segments[i + 1].x - p.x;
                    const dy = segments[i + 1].y - p.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                } else if (i > 0) {
                    const dx = p.x - segments[i - 1].x;
                    const dy = p.y - segments[i - 1].y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    perpX = -dy / len;
                    perpY = dx / len;
                }
                
                const wave = this.animateTexture ? Math.sin(i * 0.5 + time * 2) * 3 : 0;
                const x = p.x + perpX * (this.pathWidth * offset + wave) - offsetX;
                const y = p.y + perpY * (this.pathWidth * offset + wave) - offsetY;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        // Leaves
        const spacing = this.pathWidth * 0.6;
        let accumulated = startDistance % spacing;
        let idx = Math.floor(startDistance / spacing);
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (segLen === 0) continue;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                this._currentSeed = this.textureSeed + idx * 100;
                const side = this._seededRandom() > 0.5 ? 1 : -1;
                const leafAngle = angle + side * (0.3 + this._seededRandom() * 0.5);
                const leafSize = 6 + this._seededRandom() * 6;
                const leafX = x + perpX * this.pathWidth * 0.25 * side;
                const leafY = y + perpY * this.pathWidth * 0.25 * side;
                
                // Animate leaf sway
                const sway = this.animateTexture ? Math.sin(time * 2 + idx) * 0.1 : 0;
                
                ctx.save();
                ctx.translate(leafX, leafY);
                ctx.rotate(leafAngle + sway);
                
                ctx.fillStyle = `hsl(${100 + this._seededRandom() * 30}, ${50 + this._seededRandom() * 20}%, ${30 + this._seededRandom() * 15}%)`;
                ctx.beginPath();
                ctx.ellipse(leafSize/2, 0, leafSize, leafSize * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Leaf vein
                ctx.strokeStyle = 'rgba(0, 50, 0, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(leafSize, 0);
                ctx.stroke();
                
                ctx.restore();
                
                accumulated += spacing;
                idx++;
            }
            accumulated -= segLen;
        }
    }

    // ==================== TEXTURE RENDERING ====================
    
    /**
     * Draw textured path overlay
     */
    _drawTexturedPath(ctx, segments, startDistance = 0) {
        if (segments.length < 2) return;
        
        const engine = this.gameObject?._engine;
        if (!engine?.assets) return;
        
        // Get texture image - extract just the filename from the path
        const fileName = this.texturePath.split('/').pop().split('\\').pop();
        const image = engine.assets.getImage(fileName);
        if (!image) return;
        
        // Path segments are already in local coordinates
        const offsetX = 0;
        const offsetY = 0;
        
        ctx.save();
        ctx.globalCompositeOperation = this.textureBlendMode;
        ctx.globalAlpha = this.textureOpacity;
        
        // Create clipping path along the spline
        ctx.beginPath();
        this._createPathShape(ctx, segments, offsetX, offsetY, this.pathWidth);
        ctx.clip();
        
        // Calculate texture tiling
        const texWidth = image.width * this.textureScale;
        const texHeight = image.height * this.textureScale;
        const animOffsetX = this.animateTexture ? (this._animationTime * 50) % texWidth : 0;
        const animOffsetY = this.animateTexture ? (this._animationTime * 30) % texHeight : 0;
        
        // Get bounding box of visible segments
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const seg of segments) {
            minX = Math.min(minX, seg.x - offsetX - this.pathWidth);
            minY = Math.min(minY, seg.y - offsetY - this.pathWidth);
            maxX = Math.max(maxX, seg.x - offsetX + this.pathWidth);
            maxY = Math.max(maxY, seg.y - offsetY + this.pathWidth);
        }
        
        // Tile texture within bounds
        if (this.textureRepeat) {
            const startX = Math.floor((minX + this.textureOffsetX - animOffsetX) / texWidth) * texWidth - this.textureOffsetX + animOffsetX;
            const startY = Math.floor((minY + this.textureOffsetY - animOffsetY) / texHeight) * texHeight - this.textureOffsetY + animOffsetY;
            
            for (let y = startY; y < maxY; y += texHeight) {
                for (let x = startX; x < maxX; x += texWidth) {
                    ctx.drawImage(image, x, y, texWidth, texHeight);
                }
            }
        } else {
            // Single texture centered on path
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            ctx.drawImage(image, centerX - texWidth / 2, centerY - texHeight / 2, texWidth, texHeight);
        }
        
        ctx.restore();
    }
    
    /**
     * Create a closed path shape for clipping or filling
     * Uses flat caps when endSoftness is enabled to avoid opaque round tips
     */
    _createPathShape(ctx, segments, offsetX, offsetY, width) {
        if (segments.length < 2) return;
        
        const halfWidth = width / 2;
        const useFlatCaps = this.endSoftness;
        const leftPoints = [];
        const rightPoints = [];
        
        // Calculate perpendicular offsets for each point
        for (let i = 0; i < segments.length; i++) {
            const p = segments[i];
            let perpX = 0, perpY = 0;
            
            if (i === 0) {
                const next = segments[1];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else if (i === segments.length - 1) {
                const prev = segments[i - 1];
                const dx = p.x - prev.x;
                const dy = p.y - prev.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else {
                // Average of adjacent segment normals
                const prev = segments[i - 1];
                const next = segments[i + 1];
                const dx1 = p.x - prev.x;
                const dy1 = p.y - prev.y;
                const dx2 = next.x - p.x;
                const dy2 = next.y - p.y;
                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                perpX = (-dy1 / len1 - dy2 / len2) / 2;
                perpY = (dx1 / len1 + dx2 / len2) / 2;
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
                if (perpLen > 0.001) {
                    perpX /= perpLen;
                    perpY /= perpLen;
                }
            }
            
            leftPoints.push({
                x: p.x + perpX * halfWidth - offsetX,
                y: p.y + perpY * halfWidth - offsetY
            });
            rightPoints.push({
                x: p.x - perpX * halfWidth - offsetX,
                y: p.y - perpY * halfWidth - offsetY
            });
        }
        
        // Draw closed shape: left side forward, right side backward
        ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
        for (let i = 1; i < leftPoints.length; i++) {
            ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
        }
        
        if (useFlatCaps) {
            // Flat end cap: just connect last left to last right
            const lastLeft = leftPoints[leftPoints.length - 1];
            const lastRight = rightPoints[rightPoints.length - 1];
            ctx.lineTo(lastRight.x, lastRight.y);
        } else {
            // Round end cap
            const lastLeft = leftPoints[leftPoints.length - 1];
            const lastRight = rightPoints[rightPoints.length - 1];
            ctx.arc(
                (lastLeft.x + lastRight.x) / 2,
                (lastLeft.y + lastRight.y) / 2,
                halfWidth,
                Math.atan2(lastLeft.y - lastRight.y, lastLeft.x - lastRight.x),
                Math.atan2(lastRight.y - lastLeft.y, lastRight.x - lastLeft.x)
            );
        }
        
        // Right side backward
        for (let i = rightPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
        }
        
        if (useFlatCaps) {
            // Flat start cap: just close back to first left
            ctx.lineTo(leftPoints[0].x, leftPoints[0].y);
        } else {
            // Round start cap
            const firstLeft = leftPoints[0];
            const firstRight = rightPoints[0];
            ctx.arc(
                (firstLeft.x + firstRight.x) / 2,
                (firstLeft.y + firstRight.y) / 2,
                halfWidth,
                Math.atan2(firstRight.y - firstLeft.y, firstRight.x - firstLeft.x),
                Math.atan2(firstLeft.y - firstRight.y, firstLeft.x - firstRight.x)
            );
        }
        ctx.closePath();
    }
    
    // ==================== SOFTNESS RENDERING ====================
    
    /**
     * Get bounding box of all visible path runs (with padding for path width)
     */
    _getRunsBoundingBox(runs) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const run of runs) {
            for (const p of run) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
        }
        if (minX === Infinity) return null;
        const pad = this.pathWidth + (this.showDecorations ? 30 * this.decorationScale : 0) + 10;
        return {
            x: minX - pad,
            y: minY - pad,
            width: (maxX - minX) + pad * 2,
            height: (maxY - minY) + pad * 2
        };
    }
    
    /**
     * Apply edge softness: erase the outer edges of the path with a gradient
     * Uses concentric closed-polygon strips to avoid alpha overlap artifacts on curves
     * Uses destination-out to carve transparency into the offscreen canvas
     */
    _applyEdgeSoftness(offCtx, runs, bounds) {
        const halfWidth = this.pathWidth / 2;
        const softWidth = Math.min(this.edgeSoftnessWidth, halfWidth - 1);
        if (softWidth <= 0) return;
        
        offCtx.save();
        offCtx.translate(-bounds.x, -bounds.y);
        offCtx.globalCompositeOperation = 'destination-out';
        
        // Use N concentric strips to approximate gradient without overlap
        // Each strip is a single closed polygon so no self-overlap on curves
        const steps = Math.max(4, Math.min(12, Math.ceil(softWidth / 2)));
        
        for (const run of runs) {
            if (run.length < 2) continue;
            
            // Pre-compute perpendicular normals for all points
            const normals = this._computePathNormals(run);
            
            // Pre-compute noise offsets per point (seeded for stability)
            let noiseOffsets = null;
            if (this.edgeSoftnessNoise > 0) {
                noiseOffsets = this._computeEdgeNoise(run, normals);
            }
            
            for (const side of [-1, 1]) {
                // Draw concentric strips from inner (least erase) to outer (most erase)
                for (let step = 0; step < steps; step++) {
                    const t0 = step / steps;       // inner boundary of this strip (0 = opaque edge)
                    const t1 = (step + 1) / steps; // outer boundary of this strip (1 = full erase)
                    
                    // Alpha for this strip: how much to erase
                    // Use the midpoint of the strip for the erase alpha
                    const tMid = (t0 + t1) / 2;
                    const alpha = this._easeCurve(tMid, this.edgeSoftnessCurve);
                    
                    // Build the strip as a single closed polygon
                    const innerDist = halfWidth - softWidth + softWidth * t0;
                    const outerDist = halfWidth - softWidth + softWidth * t1;
                    
                    offCtx.fillStyle = `rgba(0,0,0,${alpha})`;
                    offCtx.beginPath();
                    
                    // Forward along inner boundary
                    for (let i = 0; i < run.length; i++) {
                        const p = run[i];
                        const n = normals[i];
                        let dist = innerDist;
                        if (noiseOffsets) {
                            dist += noiseOffsets[i] * (1 - t0); // Noise fades toward outer edge
                        }
                        const x = p.x + n.x * dist * side;
                        const y = p.y + n.y * dist * side;
                        if (i === 0) offCtx.moveTo(x, y);
                        else offCtx.lineTo(x, y);
                    }
                    // Backward along outer boundary
                    for (let i = run.length - 1; i >= 0; i--) {
                        const p = run[i];
                        const n = normals[i];
                        let dist = outerDist;
                        if (noiseOffsets) {
                            dist += noiseOffsets[i] * (1 - t1);
                        }
                        const x = p.x + n.x * dist * side;
                        const y = p.y + n.y * dist * side;
                        offCtx.lineTo(x, y);
                    }
                    offCtx.closePath();
                    offCtx.fill();
                }
            }
        }
        
        offCtx.restore();
    }
    
    /**
     * Compute perpendicular normals for each point in a path run
     */
    _computePathNormals(segments) {
        const normals = [];
        for (let i = 0; i < segments.length; i++) {
            const p = segments[i];
            let perpX = 0, perpY = 0;
            
            if (i === 0) {
                const next = segments[1];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else if (i === segments.length - 1) {
                const prev = segments[i - 1];
                const dx = p.x - prev.x;
                const dy = p.y - prev.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else {
                const prev = segments[i - 1];
                const next = segments[i + 1];
                const dx1 = p.x - prev.x;
                const dy1 = p.y - prev.y;
                const dx2 = next.x - p.x;
                const dy2 = next.y - p.y;
                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                perpX = (-dy1 / len1 - dy2 / len2) / 2;
                perpY = (dx1 / len1 + dx2 / len2) / 2;
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
                if (perpLen > 0.001) {
                    perpX /= perpLen;
                    perpY /= perpLen;
                }
            }
            normals.push({ x: perpX, y: perpY });
        }
        return normals;
    }
    
    /**
     * Compute seeded noise offsets for edge softness wobble
     * Uses position-based seeding for culling stability
     */
    _computeEdgeNoise(segments, normals) {
        const noise = this.edgeSoftnessNoise;
        const maxWobble = this.edgeSoftnessWidth * noise * 0.8;
        const offsets = [];
        
        for (let i = 0; i < segments.length; i++) {
            // Seed based on approximate position (rounded) for stability
            const px = Math.round(segments[i].x * 0.5);
            const py = Math.round(segments[i].y * 0.5);
            this._currentSeed = this.textureSeed + px * 7919 + py * 6271;
            const wobble = (this._seededRandom() - 0.5) * 2 * maxWobble;
            offsets.push(wobble);
        }
        return offsets;
    }
    
    /**
     * Apply end softness: fade the start and end of the path to transparent
     */
    _applyEndSoftness(offCtx, fullPath, bounds) {
        if (!fullPath || fullPath.length < 2) return;
        const fadeLen = Math.min(this.endSoftnessLength, this._pathLength / 2);
        if (fadeLen <= 0) return;
        
        offCtx.save();
        offCtx.translate(-bounds.x, -bounds.y);
        offCtx.globalCompositeOperation = 'destination-out';
        
        const halfWidth = this.pathWidth / 2 + 2; // Slight padding to cover antialiasing
        
        // === FADE START ===
        this._drawEndFadeRegion(offCtx, fullPath, halfWidth, fadeLen, true);
        
        // === FADE END ===
        this._drawEndFadeRegion(offCtx, fullPath, halfWidth, fadeLen, false);
        
        offCtx.restore();
    }
    
    /**
     * Draw a fade region at the start or end of the path
     */
    _drawEndFadeRegion(offCtx, fullPath, halfWidth, fadeLen, isStart) {
        // Walk along the path to find the point at fadeLen distance
        let dist = 0;
        let fadeEndIdx = isStart ? 1 : fullPath.length - 2;
        const pathLen = this._pathLength;
        
        if (isStart) {
            // Find the segment index where we reach fadeLen
            for (let i = 1; i < fullPath.length; i++) {
                const dx = fullPath[i].x - fullPath[i-1].x;
                const dy = fullPath[i].y - fullPath[i-1].y;
                const sl = Math.sqrt(dx * dx + dy * dy);
                if (dist + sl >= fadeLen) {
                    fadeEndIdx = i;
                    break;
                }
                dist += sl;
                fadeEndIdx = i;
            }
        } else {
            for (let i = fullPath.length - 2; i >= 0; i--) {
                const dx = fullPath[i+1].x - fullPath[i].x;
                const dy = fullPath[i+1].y - fullPath[i].y;
                const sl = Math.sqrt(dx * dx + dy * dy);
                if (dist + sl >= fadeLen) {
                    fadeEndIdx = i;
                    break;
                }
                dist += sl;
                fadeEndIdx = i;
            }
        }
        
        // Get the endpoint and the point at fadeLen for the gradient direction
        const tipPoint = isStart ? fullPath[0] : fullPath[fullPath.length - 1];
        const fadePoint = isStart ? fullPath[fadeEndIdx] : fullPath[fadeEndIdx];
        
        // Compute gradient along path direction
        const gradDx = fadePoint.x - tipPoint.x;
        const gradDy = fadePoint.y - tipPoint.y;
        const gradLen = Math.sqrt(gradDx * gradDx + gradDy * gradDy) || 1;
        
        const grad = offCtx.createLinearGradient(
            tipPoint.x, tipPoint.y,
            tipPoint.x + (gradDx / gradLen) * fadeLen,
            tipPoint.y + (gradDy / gradLen) * fadeLen
        );
        
        const curve = this.endSoftnessCurve;
        // At the tip: fully erase
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        if (curve > 0.01) {
            grad.addColorStop(0.25, `rgba(0,0,0,${1 - this._easeCurve(0.25, curve)})`);
            grad.addColorStop(0.5, `rgba(0,0,0,${1 - this._easeCurve(0.5, curve)})`);
            grad.addColorStop(0.75, `rgba(0,0,0,${1 - this._easeCurve(0.75, curve)})`);
        }
        // At fadeLen: don't erase
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        offCtx.fillStyle = grad;
        
        // Build a thick region around the start/end of path
        const startI = isStart ? 0 : fadeEndIdx;
        const endI = isStart ? fadeEndIdx : fullPath.length - 1;
        
        const leftPts = [];
        const rightPts = [];
        for (let i = startI; i <= endI; i++) {
            const p = fullPath[i];
            let perpX = 0, perpY = 0;
            if (i === 0) {
                const next = fullPath[Math.min(1, fullPath.length - 1)];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else if (i === fullPath.length - 1) {
                const prev = fullPath[i - 1];
                const dx = p.x - prev.x;
                const dy = p.y - prev.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else {
                const prev = fullPath[i - 1];
                const next = fullPath[i + 1];
                const dx1 = p.x - prev.x;
                const dy1 = p.y - prev.y;
                const dx2 = next.x - p.x;
                const dy2 = next.y - p.y;
                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                perpX = (-dy1 / len1 - dy2 / len2) / 2;
                perpY = (dx1 / len1 + dx2 / len2) / 2;
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
                if (perpLen > 0.001) { perpX /= perpLen; perpY /= perpLen; }
            }
            leftPts.push({ x: p.x + perpX * halfWidth, y: p.y + perpY * halfWidth });
            rightPts.push({ x: p.x - perpX * halfWidth, y: p.y - perpY * halfWidth });
        }
        
        offCtx.beginPath();
        offCtx.moveTo(leftPts[0].x, leftPts[0].y);
        for (let i = 1; i < leftPts.length; i++) {
            offCtx.lineTo(leftPts[i].x, leftPts[i].y);
        }
        for (let i = rightPts.length - 1; i >= 0; i--) {
            offCtx.lineTo(rightPts[i].x, rightPts[i].y);
        }
        offCtx.closePath();
        offCtx.fill();
    }
    
    /**
     * Ease curve for softness gradient
     * @param {number} t - 0 to 1 linear position
     * @param {number} curve - 0 = linear, 1 = smooth ease
     * @returns {number} Eased alpha value
     */
    _easeCurve(t, curve) {
        // Blend between linear and ease-out cubic
        const linear = t;
        const easeOut = 1 - Math.pow(1 - t, 3);
        return linear * (1 - curve) + easeOut * curve;
    }
    
    // ==================== DECORATIONS ====================
    
    _drawDecorations(ctx, segments, startDistance = 0) {
        if (segments.length < 2) return;
        
        // Path segments are already in local coordinates
        const spacing = 30 / this.decorationDensity;
        
        // Compute decoration positions using absolute path distance (not accumulated floats)
        // This ensures decorations are perfectly stable regardless of viewport culling
        
        // Find the first decoration index along the full path that falls within our segment range
        // endDistance = startDistance + total length of these segments
        let totalRunLength = 0;
        const segLens = [];
        for (let i = 1; i < segments.length; i++) {
            const dx = segments[i].x - segments[i - 1].x;
            const dy = segments[i].y - segments[i - 1].y;
            const sl = Math.sqrt(dx * dx + dy * dy);
            segLens.push(sl);
            totalRunLength += sl;
        }
        const endDistance = startDistance + totalRunLength;
        
        // Find the first decoration slot at or after startDistance
        const firstSlot = Math.ceil(startDistance / spacing);
        const lastSlot = Math.floor(endDistance / spacing);
        
        for (let slot = firstSlot; slot <= lastSlot; slot++) {
            const globalDist = slot * spacing;
            const localDist = globalDist - startDistance;
            
            // Find which segment this falls in
            let accum = 0;
            let segIdx = -1;
            for (let i = 0; i < segLens.length; i++) {
                if (accum + segLens[i] >= localDist - 0.001) {
                    segIdx = i;
                    break;
                }
                accum += segLens[i];
            }
            if (segIdx < 0) continue;
            
            const p1 = segments[segIdx];
            const p2 = segments[segIdx + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = segLens[segIdx];
            if (segLen < 0.001) continue;
            
            const t = Math.max(0, Math.min(1, (localDist - accum) / segLen));
            const x = p1.x + dx * t;
            const y = p1.y + dy * t;
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
            
            for (const side of [-1, 1]) {
                const decX = x + perpX * (this.pathWidth / 2 + 5) * side;
                const decY = y + perpY * (this.pathWidth / 2 + 5) * side;
                
                // Deterministic seed based on slot index (integer) - perfectly stable
                this._currentSeed = this.textureSeed + slot * 1000 + (side === 1 ? 500 : 0);
                
                this._drawDecoration(ctx, decX, decY, this.decorationType, side);
            }
        }
    }
    
    _drawDecoration(ctx, x, y, type, side) {
        const scale = this.decorationScale;
        ctx.save();
        ctx.translate(x, y);
        
        switch (type) {
            case 'grass':
                this._drawGrassTuft(ctx, scale);
                break;
            case 'stones':
                this._drawPebbles(ctx, scale);
                break;
            case 'runes':
                this._drawRune(ctx, scale);
                break;
            case 'torches':
                if (side === 1) this._drawTorch(ctx, scale);
                break;
            case 'crystals':
                this._drawCrystal(ctx, scale);
                break;
            case 'flowers':
                this._drawFlower(ctx, scale);
                break;
            case 'mushrooms':
                this._drawMushroom(ctx, scale);
                break;
        }
        
        ctx.restore();
    }
    
    _drawGrassTuft(ctx, scale) {
        for (let i = 0; i < 3; i++) {
            const angle = (i - 1) * 0.3;
            const height = (8 + this._seededRandom() * 6) * scale;
            ctx.fillStyle = `hsl(${100 + this._seededRandom() * 30}, ${50 + this._seededRandom() * 20}%, ${30 + this._seededRandom() * 15}%)`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(angle * height * 0.5, -height * 0.6, angle * height, -height);
            ctx.quadraticCurveTo(angle * height + 1, -height * 0.6, 2, 0);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    _drawPebbles(ctx, scale) {
        for (let i = 0; i < 2 + Math.floor(this._seededRandom() * 2); i++) {
            const px = (this._seededRandom() - 0.5) * 10 * scale;
            const py = (this._seededRandom() - 0.5) * 6 * scale;
            const size = (2 + this._seededRandom() * 3) * scale;
            ctx.fillStyle = `hsl(30, 10%, ${40 + this._seededRandom() * 20}%)`;
            ctx.beginPath();
            ctx.ellipse(px, py, size, size * 0.7, this._seededRandom() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    _drawRune(ctx, scale) {
        ctx.fillStyle = `hsla(${260 + this._seededRandom() * 40}, 70%, 60%, 0.7)`;
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const runes = ['✦', '✧', '◇', '◈', '✴', '⚝'];
        ctx.fillText(runes[Math.floor(this._seededRandom() * runes.length)], 0, 0);
    }
    
    _drawTorch(ctx, scale) {
        // Torch post
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(-2 * scale, -15 * scale, 4 * scale, 15 * scale);
        
        // Flame
        const flameGrad = ctx.createRadialGradient(0, -18 * scale, 0, 0, -18 * scale, 8 * scale);
        flameGrad.addColorStop(0, 'rgba(255, 255, 100, 0.9)');
        flameGrad.addColorStop(0.5, 'rgba(255, 150, 0, 0.7)');
        flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.ellipse(0, -18 * scale, 6 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    _drawCrystal(ctx, scale) {
        const hue = 180 + this._seededRandom() * 60;
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
        ctx.beginPath();
        ctx.moveTo(0, -12 * scale);
        ctx.lineTo(4 * scale, -4 * scale);
        ctx.lineTo(3 * scale, 0);
        ctx.lineTo(-3 * scale, 0);
        ctx.lineTo(-4 * scale, -4 * scale);
        ctx.closePath();
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = `hsla(${hue}, 80%, 80%, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(-1 * scale, -10 * scale);
        ctx.lineTo(1 * scale, -10 * scale);
        ctx.lineTo(2 * scale, -5 * scale);
        ctx.lineTo(-2 * scale, -5 * scale);
        ctx.closePath();
        ctx.fill();
    }
    
    _drawFlower(ctx, scale) {
        const petalCount = 5;
        const petalHue = this._seededRandom() * 360;
        
        // Petals
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            ctx.fillStyle = `hsl(${petalHue}, 70%, 70%)`;
            ctx.beginPath();
            ctx.ellipse(
                Math.cos(angle) * 4 * scale,
                Math.sin(angle) * 4 * scale - 4 * scale,
                3 * scale, 5 * scale,
                angle, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Center
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, -4 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Stem
        ctx.strokeStyle = '#228b22';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -4 * scale);
        ctx.stroke();
    }
    
    _drawMushroom(ctx, scale) {
        // Stem
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3 * scale, 5 * scale, 0, 0, Math.PI);
        ctx.fill();
        
        // Cap
        const capHue = this._seededRandom() > 0.5 ? 0 : 30;
        ctx.fillStyle = `hsl(${capHue}, 70%, 45%)`;
        ctx.beginPath();
        ctx.ellipse(0, -4 * scale, 6 * scale, 4 * scale, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Spots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 3; i++) {
            const spotX = (this._seededRandom() - 0.5) * 8 * scale;
            const spotY = -5 * scale + this._seededRandom() * 2 * scale;
            ctx.beginPath();
            ctx.arc(spotX, spotY, 1.5 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // ==================== DIRECTION ARROWS ====================
    
    _drawDirectionArrows(ctx, segments, startDistance = 0) {
        if (segments.length < 2) return;
        
        // Path segments are already in local coordinates
        const offsetX = 0;
        const offsetY = 0;
        
        ctx.fillStyle = this.directionColor;
        
        // Use startDistance to maintain consistent arrow placement
        const interval = this.directionInterval;
        let accumulated = ((interval / 2) - startDistance % interval + interval) % interval;
        
        for (let i = 1; i < segments.length; i++) {
            const p1 = segments[i - 1];
            const p2 = segments[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Arrow shape
                ctx.beginPath();
                ctx.moveTo(this.directionSize, 0);
                ctx.lineTo(-this.directionSize * 0.5, -this.directionSize * 0.5);
                ctx.lineTo(-this.directionSize * 0.3, 0);
                ctx.lineTo(-this.directionSize * 0.5, this.directionSize * 0.5);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                accumulated += this.directionInterval;
            }
            accumulated -= segLen;
        }
    }
    
    // ==================== ENDPOINTS ====================
    
    _drawEndpoints(ctx, path) {
        if (path.length < 1) return;
        
        // Path points are already in local coordinates
        const offsetX = 0;
        const offsetY = 0;
        
        // Start point
        const start = path[0];
        const startGrad = ctx.createRadialGradient(
            start.x - offsetX, start.y - offsetY, 0,
            start.x - offsetX, start.y - offsetY, this.pointRadius
        );
        startGrad.addColorStop(0, this._lightenColor(this.startPointColor, 30));
        startGrad.addColorStop(1, this.startPointColor);
        
        ctx.fillStyle = startGrad;
        ctx.beginPath();
        ctx.arc(start.x - offsetX, start.y - offsetY, this.pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Start label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', start.x - offsetX, start.y - offsetY);
        
        // End point
        if (path.length > 1) {
            const end = path[path.length - 1];
            const endGrad = ctx.createRadialGradient(
                end.x - offsetX, end.y - offsetY, 0,
                end.x - offsetX, end.y - offsetY, this.pointRadius
            );
            endGrad.addColorStop(0, this._lightenColor(this.endPointColor, 30));
            endGrad.addColorStop(1, this.endPointColor);
            
            ctx.fillStyle = endGrad;
            ctx.beginPath();
            ctx.arc(end.x - offsetX, end.y - offsetY, this.pointRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.fillText('E', end.x - offsetX, end.y - offsetY);
        }
    }
    
    // ==================== COLOR UTILITIES ====================
    
    _lightenColor(color, percent) {
        if (!color || color.startsWith('rgba') || color.startsWith('rgb')) return color;
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }
    
    _darkenColor(color, percent) {
        if (!color || color.startsWith('rgba') || color.startsWith('rgb')) return color;
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Get the complete cached path
     */
    getPath() {
        if (!this._cachedPath) this.rebuildPath();
        return this._cachedPath;
    }
    
    /**
     * Get total path length
     */
    getPathLength() {
        return this._pathLength;
    }
    
    /**
     * Get position at distance along path
     */
    getPositionAtDistance(distance) {
        const path = this.getPath();
        if (path.length < 2) return path.length > 0 ? { ...path[0] } : { x: 0, y: 0 };
        
        distance = Math.max(0, Math.min(distance, this._pathLength));
        let accumulated = 0;
        
        for (let i = 0; i < this._segmentLengths.length; i++) {
            const segLength = this._segmentLengths[i];
            if (accumulated + segLength >= distance) {
                const segProgress = (distance - accumulated) / segLength;
                const p1 = path[i];
                const p2 = path[i + 1];
                return {
                    x: p1.x + (p2.x - p1.x) * segProgress,
                    y: p1.y + (p2.y - p1.y) * segProgress
                };
            }
            accumulated += segLength;
        }
        
        return { ...path[path.length - 1] };
    }
    
    /**
     * Get position at normalized progress (0-1)
     */
    getPositionAtProgress(progress) {
        progress = Math.max(0, Math.min(1, progress));
        return this.getPositionAtDistance(progress * this._pathLength);
    }
    
    /**
     * Add a path point
     */
    addPoint(x, y) {
        this.pathPoints.push({ x, y });
        this.rebuildPath();
    }
    
    /**
     * Remove a path point by index
     */
    removePoint(index) {
        if (index >= 0 && index < this.pathPoints.length) {
            this.pathPoints.splice(index, 1);
            this.rebuildPath();
        }
    }
    
    /**
     * Update a path point
     */
    updatePoint(index, x, y) {
        if (index >= 0 && index < this.pathPoints.length) {
            this.pathPoints[index] = { x, y };
            this.rebuildPath();
        }
    }
    
    // ==================== PATH FOLLOWING API ====================
    
    /**
     * Get the total length of the path in pixels
     * @returns {number} Total path length
     */
    getPathLength() {
        if (!this._cachedPath) this.rebuildPath();
        return this._pathLength;
    }
    
    /**
     * Get all path points in world coordinates
     * Useful for AI waypoint systems
     * @returns {Array<{x: number, y: number}>} Array of world position points
     */
    getWorldPathPoints() {
        if (!this._cachedPath) this.rebuildPath();
        const worldPos = this.worldPosition;
        return this._cachedPath.map(p => ({
            x: p.x + worldPos.x,
            y: p.y + worldPos.y
        }));
    }
    
    /**
     * Get the original control points (not interpolated) in world coordinates
     * Useful for AI patrol nodes - gives the actual waypoints without spline interpolation
     * @returns {Array<{x: number, y: number}>} Array of world position control points
     */
    getWaypointNodes() {
        const worldPos = this.worldPosition;
        
        // Start with object position as first node
        const nodes = [{ x: worldPos.x, y: worldPos.y }];
        
        // Add all path points as nodes
        for (const point of this.pathPoints) {
            nodes.push({
                x: worldPos.x + (point.x || 0),
                y: worldPos.y + (point.y || 0)
            });
        }
        
        return nodes;
    }
    
    /**
     * Get position along the path at a given progress (0-1)
     * @param {number} progress - Progress along path (0 = start, 1 = end)
     * @param {boolean} [worldCoords=true] - Return world coordinates if true, local if false
     * @returns {{x: number, y: number}} Position on the path
     */
    getPositionAtProgress(progress, worldCoords = true) {
        if (!this._cachedPath) this.rebuildPath();
        if (this._cachedPath.length < 2) {
            const worldPos = this.worldPosition;
            return worldCoords ? { x: worldPos.x, y: worldPos.y } : { x: 0, y: 0 };
        }
        
        progress = Math.max(0, Math.min(1, progress));
        const targetDist = progress * this._pathLength;
        
        return this._getPositionAtDistance(targetDist, worldCoords);
    }
    
    /**
     * Get position along the path at a given distance from start
     * @param {number} distance - Distance in pixels from start
     * @param {boolean} [worldCoords=true] - Return world coordinates if true, local if false
     * @returns {{x: number, y: number}} Position on the path
     */
    getPositionAtDistance(distance, worldCoords = true) {
        if (!this._cachedPath) this.rebuildPath();
        return this._getPositionAtDistance(distance, worldCoords);
    }
    
    /**
     * Internal method to get position at a distance
     */
    _getPositionAtDistance(distance, worldCoords) {
        if (this._cachedPath.length < 2) {
            const worldPos = this.worldPosition;
            return worldCoords ? { x: worldPos.x, y: worldPos.y } : { x: 0, y: 0 };
        }
        
        distance = Math.max(0, Math.min(this._pathLength, distance));
        
        let accumulated = 0;
        for (let i = 0; i < this._segmentLengths.length; i++) {
            const segLen = this._segmentLengths[i];
            if (accumulated + segLen >= distance) {
                // Found the segment
                const t = (distance - accumulated) / segLen;
                const p1 = this._cachedPath[i];
                const p2 = this._cachedPath[i + 1];
                
                const localPos = {
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                };
                
                if (worldCoords) {
                    const worldPos = this.worldPosition;
                    return {
                        x: localPos.x + worldPos.x,
                        y: localPos.y + worldPos.y
                    };
                }
                return localPos;
            }
            accumulated += segLen;
        }
        
        // Return end point
        const lastPoint = this._cachedPath[this._cachedPath.length - 1];
        if (worldCoords) {
            const worldPos = this.worldPosition;
            return { x: lastPoint.x + worldPos.x, y: lastPoint.y + worldPos.y };
        }
        return { x: lastPoint.x, y: lastPoint.y };
    }
    
    /**
     * Get the tangent (direction) at a given progress along the path
     * @param {number} progress - Progress along path (0 = start, 1 = end)
     * @returns {{x: number, y: number, angle: number}} Normalized direction vector and angle in degrees
     */
    getTangentAtProgress(progress) {
        if (!this._cachedPath) this.rebuildPath();
        if (this._cachedPath.length < 2) return { x: 1, y: 0, angle: 0 };
        
        progress = Math.max(0, Math.min(1, progress));
        const targetDist = progress * this._pathLength;
        
        return this._getTangentAtDistance(targetDist);
    }
    
    /**
     * Get the tangent at a given distance
     */
    getTangentAtDistance(distance) {
        if (!this._cachedPath) this.rebuildPath();
        return this._getTangentAtDistance(distance);
    }
    
    /**
     * Internal method to get tangent at distance
     */
    _getTangentAtDistance(distance) {
        if (this._cachedPath.length < 2) return { x: 1, y: 0, angle: 0 };
        
        distance = Math.max(0, Math.min(this._pathLength, distance));
        
        let accumulated = 0;
        for (let i = 0; i < this._segmentLengths.length; i++) {
            const segLen = this._segmentLengths[i];
            if (accumulated + segLen >= distance || i === this._segmentLengths.length - 1) {
                const p1 = this._cachedPath[i];
                const p2 = this._cachedPath[i + 1];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                
                if (len === 0) return { x: 1, y: 0, angle: 0 };
                
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                return {
                    x: dx / len,
                    y: dy / len,
                    angle: angle
                };
            }
            accumulated += segLen;
        }
        
        return { x: 1, y: 0, angle: 0 };
    }
    
    /**
     * Get the closest point on the path to a given position
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{x: number, y: number, progress: number, distance: number}} Closest point info
     */
    getClosestPointOnPath(worldX, worldY) {
        if (!this._cachedPath) this.rebuildPath();
        if (this._cachedPath.length < 2) {
            const worldPos = this.worldPosition;
            return {
                x: worldPos.x,
                y: worldPos.y,
                progress: 0,
                distance: Math.sqrt((worldX - worldPos.x) ** 2 + (worldY - worldPos.y) ** 2)
            };
        }
        
        const worldPos = this.worldPosition;
        const localX = worldX - worldPos.x;
        const localY = worldY - worldPos.y;
        
        let closestPoint = null;
        let closestDist = Infinity;
        let closestProgress = 0;
        let accumulated = 0;
        
        for (let i = 0; i < this._segmentLengths.length; i++) {
            const segLen = this._segmentLengths[i];
            const p1 = this._cachedPath[i];
            const p2 = this._cachedPath[i + 1];
            
            // Find closest point on this segment
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            
            // Project point onto line segment
            let t = ((localX - p1.x) * dx + (localY - p1.y) * dy) / (segLen * segLen);
            t = Math.max(0, Math.min(1, t));
            
            const px = p1.x + t * dx;
            const py = p1.y + t * dy;
            
            const dist = Math.sqrt((localX - px) ** 2 + (localY - py) ** 2);
            
            if (dist < closestDist) {
                closestDist = dist;
                closestPoint = { x: px + worldPos.x, y: py + worldPos.y };
                closestProgress = (accumulated + t * segLen) / this._pathLength;
            }
            
            accumulated += segLen;
        }
        
        return {
            ...closestPoint,
            progress: closestProgress,
            distance: closestDist
        };
    }
    
    /**
     * Check if the path has SplinePathRenderer (for duck-typing in VOIDAIBrain)
     * @returns {boolean} Always true for this module
     */
    hasSplinePath() {
        return true;
    }

    // ==================== EDITOR GIZMO SUPPORT ====================
    
    /**
     * Get gizmo handles for level editor
     */
    getEditorGizmoHandles() {
        // Initialize with default points if empty
        if (this.pathPoints.length === 0) {
            this.pathPoints = [
                { x: 50, y: 0 },
                { x: 150, y: 50 },
                { x: 250, y: 0 }
            ];
            this.rebuildPath();
        }
        
        const handles = [];
        const worldPos = this.worldPosition;
        const worldX = worldPos.x;
        const worldY = worldPos.y;
        
        // Start handle (object position)
        handles.push({
            id: 'spline_start',
            index: -1,
            x: worldX,
            y: worldY,
            radius: this.pointRadius + 2,
            color: this.startPointColor,
            label: 'Start',
            onDrag: (newX, newY) => {
                if (this.gameObject && this.gameObject.parent) {
                    const parentWorld = this.gameObject.parent.getWorldPosition();
                    this.x = newX - parentWorld.x;
                    this.y = newY - parentWorld.y;
                } else {
                    this.x = newX;
                    this.y = newY;
                }
                this.rebuildPath();
            }
        });
        
        // Path point handles
        for (let i = 0; i < this.pathPoints.length; i++) {
            const point = this.pathPoints[i];
            const isLast = i === this.pathPoints.length - 1;
            const pointIndex = i;
            
            handles.push({
                id: `spline_${i}`,
                index: i,
                x: worldX + point.x,
                y: worldY + point.y,
                radius: this.pointRadius,
                color: isLast ? this.endPointColor : '#ffcc00',
                label: isLast ? 'End' : `P${pointIndex + 1}`,
                onDrag: (newX, newY) => {
                    const currentWorldPos = this.worldPosition;
                    this.updatePoint(pointIndex, newX - currentWorldPos.x, newY - currentWorldPos.y);
                }
            });
        }
        
        return handles;
    }
    
    /**
     * Add point in editor (Ctrl+Click)
     */
    onEditorAddPoint(worldX, worldY) {
        const worldPos = this.worldPosition;
        this.addPoint(worldX - worldPos.x, worldY - worldPos.y);
    }
    
    /**
     * Remove point in editor (right-click)
     */
    onEditorRemovePoint(handleId) {
        const index = parseInt(handleId.replace('spline_', ''));
        if (!isNaN(index) && index >= 0) {
            this.removePoint(index);
        }
    }

    onDestroy() {
        this._cachedPath = null;
        this._cachedTexture = null;
        this._cachedTexturePath = null;
        this._chunkCache = null;
        this._softCanvas = null;
        this._textureCanvas = null;
        this._softCtx = null;
        this._textureCtx = null;
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'SplinePathRenderer';
        
        // Path points
        json.pathPoints = JSON.parse(JSON.stringify(this.pathPoints));
        
        // Spline settings
        json.useSpline = this.useSpline;
        json.splineResolution = this.splineResolution;
        json.splineTension = this.splineTension;
        
        // Appearance
        json.pathStyle = this.pathStyle;
        json.pathWidth = this.pathWidth;
        json.pathColor = this.pathColor;
        json.pathBorderColor = this.pathBorderColor;
        json.pathOpacity = this.pathOpacity;
        json.showBorder = this.showBorder;
        json.borderWidth = this.borderWidth;
        
        // Texture
        json.useTexture = this.useTexture;
        json.texturePath = this.texturePath;
        json.textureScale = this.textureScale;
        json.textureRepeat = this.textureRepeat;
        json.textureOffsetX = this.textureOffsetX;
        json.textureOffsetY = this.textureOffsetY;
        json.textureBlendMode = this.textureBlendMode;
        json.textureOpacity = this.textureOpacity;
        
        // Effects
        json.glowEnabled = this.glowEnabled;
        json.glowColor = this.glowColor;
        json.glowIntensity = this.glowIntensity;
        json.animateTexture = this.animateTexture;
        json.animationSpeed = this.animationSpeed;
        
        // Decorations
        json.showDecorations = this.showDecorations;
        json.decorationType = this.decorationType;
        json.decorationDensity = this.decorationDensity;
        json.decorationScale = this.decorationScale;
        
        // Direction
        json.showDirection = this.showDirection;
        json.directionInterval = this.directionInterval;
        json.directionColor = this.directionColor;
        json.directionSize = this.directionSize;
        
        // Endpoints
        json.showEndpoints = this.showEndpoints;
        json.startPointColor = this.startPointColor;
        json.endPointColor = this.endPointColor;
        json.pointRadius = this.pointRadius;
        
        // Viewport
        json.viewportMargin = this.viewportMargin;
        
        // Texture seed
        json.textureSeed = this.textureSeed;
        
        // Edge softness
        json.edgeSoftness = this.edgeSoftness;
        json.edgeSoftnessWidth = this.edgeSoftnessWidth;
        json.edgeSoftnessCurve = this.edgeSoftnessCurve;
        json.edgeSoftnessNoise = this.edgeSoftnessNoise;
        
        // End softness
        json.endSoftness = this.endSoftness;
        json.endSoftnessLength = this.endSoftnessLength;
        json.endSoftnessCurve = this.endSoftnessCurve;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new SplinePathRenderer();
        
        // Path points
        module.pathPoints = json.pathPoints ? JSON.parse(JSON.stringify(json.pathPoints)) : [];
        
        // Spline settings
        module.useSpline = json.useSpline ?? true;
        module.splineResolution = json.splineResolution ?? 15;
        module.splineTension = json.splineTension ?? 0.5;
        
        // Appearance
        module.pathStyle = json.pathStyle ?? 'solid';
        module.pathWidth = json.pathWidth ?? 30;
        module.pathColor = json.pathColor ?? '#6b8e23';
        module.pathBorderColor = json.pathBorderColor ?? '#556b2f';
        module.pathOpacity = json.pathOpacity ?? 1.0;
        module.showBorder = json.showBorder ?? true;
        module.borderWidth = json.borderWidth ?? 4;
        
        // Texture
        module.useTexture = json.useTexture ?? false;
        module.texturePath = json.texturePath ?? '';
        module.textureScale = json.textureScale ?? 1.0;
        module.textureRepeat = json.textureRepeat ?? true;
        module.textureOffsetX = json.textureOffsetX ?? 0;
        module.textureOffsetY = json.textureOffsetY ?? 0;
        module.textureBlendMode = json.textureBlendMode ?? 'source-over';
        module.textureOpacity = json.textureOpacity ?? 1.0;
        
        // Effects
        module.glowEnabled = json.glowEnabled ?? false;
        module.glowColor = json.glowColor ?? '#ffffff';
        module.glowIntensity = json.glowIntensity ?? 10;
        module.animateTexture = json.animateTexture ?? false;
        module.animationSpeed = json.animationSpeed ?? 1.0;
        
        // Decorations
        module.showDecorations = json.showDecorations ?? false;
        module.decorationType = json.decorationType ?? 'none';
        module.decorationDensity = json.decorationDensity ?? 0.5;
        module.decorationScale = json.decorationScale ?? 1.0;
        
        // Direction
        module.showDirection = json.showDirection ?? false;
        module.directionInterval = json.directionInterval ?? 100;
        module.directionColor = json.directionColor ?? '#ffffff';
        module.directionSize = json.directionSize ?? 10;
        
        // Endpoints
        module.showEndpoints = json.showEndpoints ?? true;
        module.startPointColor = json.startPointColor ?? '#00ff00';
        module.endPointColor = json.endPointColor ?? '#ff0000';
        module.pointRadius = json.pointRadius ?? 8;
        
        // Viewport
        module.viewportMargin = json.viewportMargin ?? 50;
        
        // Texture seed
        module.textureSeed = json.textureSeed ?? 12345;
        
        // Edge softness
        module.edgeSoftness = json.edgeSoftness ?? false;
        module.edgeSoftnessWidth = json.edgeSoftnessWidth ?? 8;
        module.edgeSoftnessCurve = json.edgeSoftnessCurve ?? 0.5;
        module.edgeSoftnessNoise = json.edgeSoftnessNoise ?? 0;
        
        // End softness
        module.endSoftness = json.endSoftness ?? false;
        module.endSoftnessLength = json.endSoftnessLength ?? 20;
        module.endSoftnessCurve = json.endSoftnessCurve ?? 0.5;
        
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new SplinePathRenderer();
        
        // Path points
        cloned.pathPoints = JSON.parse(JSON.stringify(this.pathPoints));
        
        // Spline settings
        cloned.useSpline = this.useSpline;
        cloned.splineResolution = this.splineResolution;
        cloned.splineTension = this.splineTension;
        
        // Appearance
        cloned.pathStyle = this.pathStyle;
        cloned.pathWidth = this.pathWidth;
        cloned.pathColor = this.pathColor;
        cloned.pathBorderColor = this.pathBorderColor;
        cloned.pathOpacity = this.pathOpacity;
        cloned.showBorder = this.showBorder;
        cloned.borderWidth = this.borderWidth;
        
        // Texture
        cloned.useTexture = this.useTexture;
        cloned.texturePath = this.texturePath;
        cloned.textureScale = this.textureScale;
        cloned.textureRepeat = this.textureRepeat;
        cloned.textureOffsetX = this.textureOffsetX;
        cloned.textureOffsetY = this.textureOffsetY;
        cloned.textureBlendMode = this.textureBlendMode;
        cloned.textureOpacity = this.textureOpacity;
        
        // Effects
        cloned.glowEnabled = this.glowEnabled;
        cloned.glowColor = this.glowColor;
        cloned.glowIntensity = this.glowIntensity;
        cloned.animateTexture = this.animateTexture;
        cloned.animationSpeed = this.animationSpeed;
        
        // Decorations
        cloned.showDecorations = this.showDecorations;
        cloned.decorationType = this.decorationType;
        cloned.decorationDensity = this.decorationDensity;
        cloned.decorationScale = this.decorationScale;
        
        // Direction
        cloned.showDirection = this.showDirection;
        cloned.directionInterval = this.directionInterval;
        cloned.directionColor = this.directionColor;
        cloned.directionSize = this.directionSize;
        
        // Endpoints
        cloned.showEndpoints = this.showEndpoints;
        cloned.startPointColor = this.startPointColor;
        cloned.endPointColor = this.endPointColor;
        cloned.pointRadius = this.pointRadius;
        
        // Viewport
        cloned.viewportMargin = this.viewportMargin;
        
        // Edge softness
        cloned.edgeSoftness = this.edgeSoftness;
        cloned.edgeSoftnessWidth = this.edgeSoftnessWidth;
        cloned.edgeSoftnessCurve = this.edgeSoftnessCurve;
        cloned.edgeSoftnessNoise = this.edgeSoftnessNoise;
        
        // End softness
        cloned.endSoftness = this.endSoftness;
        cloned.endSoftnessLength = this.endSoftnessLength;
        cloned.endSoftnessCurve = this.endSoftnessCurve;
        
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.SplinePathRenderer = SplinePathRenderer;
}

if (typeof Module !== 'undefined') {
    Module.register('SplinePathRenderer', SplinePathRenderer);
}
