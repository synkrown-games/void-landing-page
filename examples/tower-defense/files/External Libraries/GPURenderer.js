/**
 * GPURenderer - High-performance GPU-accelerated Canvas2D-compatible rendering context
 * 
 * Drop-in replacement for CanvasRenderingContext2D using GPUSurface (WebGL2).
 * All existing module draw(ctx) calls work unchanged.
 * 
 * Key features:
 *  - Full Canvas2D API compatibility (fillRect, strokeRect, drawImage, save/restore, etc.)
 *  - Triangle-based batched rendering (not pixel-by-pixel)
 *  - Alpha transparency with proper blending
 *  - Gradient support (linear, radial, conic) via texture rendering
 *  - Shadow rendering (hard shadows with optional blur)
 *  - Blend mode mapping (globalCompositeOperation → WebGL blend states)
 *  - Image texture caching (GPU textures created once, reused across frames)
 *  - Text rendering via texture upload (no CPU getImageData round-trip)
 *  - Per-instance depth tracking for engine integration
 *  - Full transform stack (translate, rotate, scale, setTransform)
 *  - Post-processing effect pipeline (bloom, blur, CRT, 17+ effects)
 * 
 * Performance architecture:
 *  - Solid-color shapes batch via shared 1×1 white pixel texture
 *  - Same-source images batch together (shared texture = no flush)
 *  - Flush only happens on: texture change, blend mode change, or buffer full
 *  - A typical game frame: 3-10 draw calls instead of thousands
 * 
 * Usage in Engine:
 *   engine.useGPU = true;   // enables GPU renderer
 *   // All existing module draw(ctx) calls work unchanged
 * 
 * Shader effects:
 *   engine.gpuRenderer.addEffect('bloom', { threshold: 200, intensity: 0.6, blurPasses: 4 });
 */

class GPURenderer {
    /**
     * @param {HTMLCanvasElement} targetCanvas - The visible canvas to present to
     * @param {number} width - Render resolution width
     * @param {number} height - Render resolution height
     */
    constructor(targetCanvas, width, height) {
        this.targetCanvas = targetCanvas;
        this.targetCtx = targetCanvas.getContext('2d');
        this.width = width;
        this.height = height;

        // Backing GPUSurface at render resolution
        this.surface = new GPUSurface(width, height);

        // ==================== CANVAS 2D STATE ====================
        this._transformStack = [];
        this._currentTransform = new DOMMatrix();

        // Style state
        this.fillStyle = '#000000';
        this.strokeStyle = '#000000';
        this.lineWidth = 1;
        this.globalAlpha = 1.0;
        this.globalCompositeOperation = 'source-over';
        this.font = '10px sans-serif';
        this.textAlign = 'start';
        this.textBaseline = 'alphabetic';
        this.lineCap = 'butt';
        this.lineJoin = 'miter';
        this.miterLimit = 10;
        this.shadowBlur = 0;
        this.shadowColor = 'rgba(0,0,0,0)';
        this.shadowOffsetX = 0;
        this.shadowOffsetY = 0;
        this.imageSmoothingEnabled = false;
        this.imageSmoothingQuality = 'low';

        this._lineDash = [];
        this.lineDashOffset = 0;

        this.direction = 'inherit';
        this.letterSpacing = '0px';
        this.fontKerning = 'auto';
        this.fontStretch = 'normal';
        this.fontVariantCaps = 'normal';
        this.textRendering = 'auto';
        this.wordSpacing = '0px';
        this.filter = 'none';

        this.canvas = targetCanvas;

        this._stateStack = [];

        // ==================== PATH STATE ====================
        this._pathOps = [];
        this._pathStartX = 0;
        this._pathStartY = 0;
        this._pathCurX = 0;
        this._pathCurY = 0;

        // ==================== CLIPPING (stub) ====================
        this._clipRegion = null;

        // ==================== TEXT RENDERING ====================
        this._textCanvas = document.createElement('canvas');
        this._textCanvas.width = 512;
        this._textCanvas.height = 128;
        this._textCtx = this._textCanvas.getContext('2d');
        // Reusable GPU texture for text
        this._textTexture = this.surface.createTextureFromSource(this._textCanvas);

        // ==================== GRADIENT RENDERING ====================
        this._gradientCanvas = document.createElement('canvas');
        this._gradientCanvas.width = 256;
        this._gradientCanvas.height = 256;
        this._gradientCtx = this._gradientCanvas.getContext('2d');
        this._gradientTexture = this.surface.createTextureFromSource(this._gradientCanvas);

        // ==================== SHADER EFFECTS ====================
        this._effects = [];
        this._effectsDirty = false;

        // ==================== CUSTOM SHADERS ====================
        this._customShaders = new Map();

        // ==================== IMAGE TEXTURE CACHE ====================
        // image → { texture, width, height, lastUsed }
        this._textureCache = new Map();
        this._textureCacheMaxSize = 256;
        this._textureCacheFrameCounter = 0;

        // ==================== BLEND MODE TRACKING ====================
        this._lastBlendMode = 'source-over';

        // ==================== DEPTH TRACKING ====================
        this._currentDepth = 0;
        this._drawIndex = 0; // increments per draw call within frame

        // ==================== STATS ====================
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            textureUploads: 0,
            effectPasses: 0,
            batchFlushes: 0,
            textureCacheHits: 0,
            textureCacheMisses: 0
        };

        this.isGPU = this.surface.isGPUAccelerated();

        // ==================== PERFORMANCE OPTIMIZATIONS ====================
        // Pre-allocated temp points to avoid GC pressure from _tx() calls
        // Each quad needs 4 points, shadows need 4 more = 8 points max per draw
        this._tempPoints = [];
        for (let i = 0; i < 16; i++) {
            this._tempPoints.push({ x: 0, y: 0 });
        }
        this._tempPointIndex = 0;

        // State object pool for save/restore (avoids allocating 30+ property objects)
        this._statePool = [];
        this._statePoolMax = 32;

        // Color parsing cache (avoids repeated string parsing)
        this._colorCache = new Map();
        this._colorCacheMaxSize = 64;

        // Cached transform values for fast access
        this._txA = 1; this._txB = 0; this._txC = 0;
        this._txD = 1; this._txE = 0; this._txF = 0;
        this._syncTransformCache();

        // Pre-allocated fill vertex buffer (avoids per-vertex allocation in fill/stroke)
        this._fillBufX = new Float64Array(512);
        this._fillBufY = new Float64Array(512);
        this._fillBufCap = 512;
    }

    // =======================================================================
    //  INTERNAL HELPERS
    // =======================================================================

    /** Sync WebGL blend mode with current globalCompositeOperation. */
    _syncBlendMode() {
        if (this._lastBlendMode !== this.globalCompositeOperation) {
            this._lastBlendMode = this.globalCompositeOperation;
            this.surface.setBlendMode(this.globalCompositeOperation);
        }
    }

    /** Check if fillStyle/strokeStyle is a gradient or pattern object. */
    _isGradientOrPattern(style) {
        return style !== null && typeof style === 'object';
    }

    /** Check if shadow drawing is needed. */
    _hasShadow() {
        if (this.shadowColor === 'rgba(0,0,0,0)' || this.shadowColor === 'transparent') return false;
        return this.shadowBlur > 0 || this.shadowOffsetX !== 0 || this.shadowOffsetY !== 0;
    }

    /**
     * Render a gradient/pattern to a texture covering the given local-space rect.
     * Returns {texture, canvasW, canvasH, drawW, drawH} for UV calculation.
     */
    _getGradientTexture(gradient, x, y, w, h) {
        const gw = Math.max(1, Math.ceil(Math.abs(w)));
        const gh = Math.max(1, Math.ceil(Math.abs(h)));

        // Resize canvas if needed
        if (this._gradientCanvas.width < gw || this._gradientCanvas.height < gh) {
            this._gradientCanvas.width = Math.max(this._gradientCanvas.width, gw);
            this._gradientCanvas.height = Math.max(this._gradientCanvas.height, gh);
            // Must recreate texture when canvas resizes
            this.surface.deleteTexture(this._gradientTexture);
            this._gradientTexture = this.surface.createTextureFromSource(this._gradientCanvas);
        }

        const gctx = this._gradientCtx;
        gctx.clearRect(0, 0, this._gradientCanvas.width, this._gradientCanvas.height);
        gctx.save();
        gctx.translate(-x, -y);
        gctx.fillStyle = gradient;
        gctx.fillRect(x, y, w, h);
        gctx.restore();

        this.surface.updateTexture(this._gradientTexture, this._gradientCanvas);

        return {
            texture: this._gradientTexture,
            canvasW: this._gradientCanvas.width,
            canvasH: this._gradientCanvas.height,
            drawW: gw,
            drawH: gh
        };
    }

    /**
     * Get or create a cached WebGL texture for an image source.
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} image
     * @returns {{ texture: WebGLTexture, width: number, height: number }}
     */
    _getOrCreateTexture(image) {
        let entry = this._textureCache.get(image);
        if (entry) {
            entry.lastUsed = this._textureCacheFrameCounter;
            this.stats.textureCacheHits++;

            // For canvases/videos, re-upload every frame (content may change)
            if (image instanceof HTMLCanvasElement || image instanceof HTMLVideoElement) {
                this.surface.updateTexture(entry.texture, image);
                this.stats.textureUploads++;
            }
            return entry;
        }

        // Create new texture
        this.stats.textureCacheMisses++;
        this.stats.textureUploads++;
        const texture = this.surface.createTextureFromSource(image, this.imageSmoothingEnabled);
        const w = image.width || image.naturalWidth || image.videoWidth || 0;
        const h = image.height || image.naturalHeight || image.videoHeight || 0;

        entry = { texture, width: w, height: h, lastUsed: this._textureCacheFrameCounter };
        this._textureCache.set(image, entry);

        // Evict oldest entries if cache too large
        if (this._textureCache.size > this._textureCacheMaxSize) {
            this._evictTextureCacheEntries();
        }

        return entry;
    }

    /** Evict least-recently-used texture cache entries. */
    _evictTextureCacheEntries() {
        const now = this._textureCacheFrameCounter;
        const toDelete = [];
        for (const [key, entry] of this._textureCache) {
            if (now - entry.lastUsed > 300) { // 300 frames ≈ 5 sec
                toDelete.push(key);
            }
        }
        // If still over limit, remove oldest
        if (toDelete.length === 0) {
            let oldest = Infinity, oldestKey = null;
            for (const [key, entry] of this._textureCache) {
                if (entry.lastUsed < oldest) { oldest = entry.lastUsed; oldestKey = key; }
            }
            if (oldestKey) toDelete.push(oldestKey);
        }
        for (const key of toDelete) {
            const entry = this._textureCache.get(key);
            if (entry) this.surface.deleteTexture(entry.texture);
            this._textureCache.delete(key);
        }
    }

    // =======================================================================
    //  TRANSFORM METHODS
    // =======================================================================

    save() {
        // Get state object from pool or create new one
        const s = this._statePool.length > 0 ? this._statePool.pop() : {};
        //s.transform = DOMMatrix.fromMatrix(this._currentTransform);
        s.transform = new DOMMatrix([
            this._txA, this._txB, this._txC, this._txD, this._txE, this._txF
        ]);
        s.fillStyle = this.fillStyle;
        s.strokeStyle = this.strokeStyle;
        s.lineWidth = this.lineWidth;
        s.globalAlpha = this.globalAlpha;
        s.globalCompositeOperation = this.globalCompositeOperation;
        s.font = this.font;
        s.textAlign = this.textAlign;
        s.textBaseline = this.textBaseline;
        s.lineCap = this.lineCap;
        s.lineJoin = this.lineJoin;
        s.miterLimit = this.miterLimit;
        s.shadowBlur = this.shadowBlur;
        s.shadowColor = this.shadowColor;
        s.shadowOffsetX = this.shadowOffsetX;
        s.shadowOffsetY = this.shadowOffsetY;
        s.imageSmoothingEnabled = this.imageSmoothingEnabled;
        s.imageSmoothingQuality = this.imageSmoothingQuality;
        // Reuse array if exists, otherwise create
        if (s._lineDash) {
            s._lineDash.length = this._lineDash.length;
            for (let i = 0; i < this._lineDash.length; i++) s._lineDash[i] = this._lineDash[i];
        } else {
            s._lineDash = [...this._lineDash];
        }
        s.lineDashOffset = this.lineDashOffset;
        s.direction = this.direction;
        s.letterSpacing = this.letterSpacing;
        s.fontKerning = this.fontKerning;
        s.fontStretch = this.fontStretch;
        s.fontVariantCaps = this.fontVariantCaps;
        s.textRendering = this.textRendering;
        s.wordSpacing = this.wordSpacing;
        s.filter = this.filter;
        s.clipRegion = this._clipRegion;
        this._stateStack.push(s);
    }

    restore() {
        if (this._stateStack.length === 0) return;
        const s = this._stateStack.pop();
        this._currentTransform = s.transform;
        this._syncTransformCache();
        this.fillStyle = s.fillStyle;
        this.strokeStyle = s.strokeStyle;
        this.lineWidth = s.lineWidth;
        this.globalAlpha = s.globalAlpha;
        this.globalCompositeOperation = s.globalCompositeOperation;
        this.font = s.font;
        this.textAlign = s.textAlign;
        this.textBaseline = s.textBaseline;
        this.lineCap = s.lineCap;
        this.lineJoin = s.lineJoin;
        this.miterLimit = s.miterLimit;
        this.shadowBlur = s.shadowBlur;
        this.shadowColor = s.shadowColor;
        this.shadowOffsetX = s.shadowOffsetX;
        this.shadowOffsetY = s.shadowOffsetY;
        this.imageSmoothingEnabled = s.imageSmoothingEnabled;
        this.imageSmoothingQuality = s.imageSmoothingQuality;
        // Copy array back instead of taking reference
        this._lineDash.length = s._lineDash.length;
        for (let i = 0; i < s._lineDash.length; i++) this._lineDash[i] = s._lineDash[i];
        this.lineDashOffset = s.lineDashOffset;
        this.direction = s.direction;
        this.letterSpacing = s.letterSpacing;
        this.fontKerning = s.fontKerning;
        this.fontStretch = s.fontStretch;
        this.fontVariantCaps = s.fontVariantCaps;
        this.textRendering = s.textRendering;
        this.wordSpacing = s.wordSpacing;
        this.filter = s.filter;
        this._clipRegion = s.clipRegion !== undefined ? s.clipRegion : null;
        // Return state object to pool for reuse
        if (this._statePool.length < this._statePoolMax) {
            this._statePool.push(s);
        }
    }

    translate(x, y) {
        this._currentTransform = this._currentTransform.translate(x, y);
        this._syncTransformCache();
    }
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const a = this._txA, b = this._txB, c = this._txC;
        const d = this._txD, e = this._txE, f = this._txF;
        this._txA = a * cos + c * sin;
        this._txB = b * cos + d * sin;
        this._txC = a * -sin + c * cos;
        this._txD = b * -sin + d * cos;
        // e and f unchanged
        this._currentTransform = new DOMMatrix([this._txA, this._txB, this._txC, this._txD, this._txE, this._txF]);
        // No _syncTransformCache() needed — we set the values directly
    }
    scale(sx, sy) {
        this._currentTransform = this._currentTransform.scale(sx, sy);
        this._syncTransformCache();
    }

    transform(a, b, c, d, e, f) {
        this._currentTransform = this._currentTransform.multiply(new DOMMatrix([a, b, c, d, e, f]));
        this._syncTransformCache();
    }

    setTransform(a, b, c, d, e, f) {
        if (a instanceof DOMMatrix) this._currentTransform = DOMMatrix.fromMatrix(a);
        else this._currentTransform = new DOMMatrix([a, b, c, d, e, f]);
        this._syncTransformCache();
    }

    getTransform() {
        return new DOMMatrix([this._txA, this._txB, this._txC, this._txD, this._txE, this._txF]);
    }
    resetTransform() {
        this._currentTransform = new DOMMatrix();
        this._txA = 1; this._txB = 0; this._txC = 0;
        this._txD = 1; this._txE = 0; this._txF = 0;
    }

    /** Sync cached transform values from DOMMatrix (call after any transform change). */
    _syncTransformCache() {
        const m = this._currentTransform;
        this._txA = m.a; this._txB = m.b; this._txC = m.c;
        this._txD = m.d; this._txE = m.e; this._txF = m.f;
    }

    /** Transform a point from local space to surface pixel space (returns new object - use sparingly). */
    _tx(x, y) {
        return {
            x: this._txA * x + this._txC * y + this._txE,
            y: this._txB * x + this._txD * y + this._txF
        };
    }

    /** Transform a point into a pre-allocated temp point (no allocation). */
    _txTemp(x, y) {
        const p = this._tempPoints[this._tempPointIndex];
        this._tempPointIndex = (this._tempPointIndex + 1) & 15; // Wrap at 16
        p.x = this._txA * x + this._txC * y + this._txE;
        p.y = this._txB * x + this._txD * y + this._txF;
        return p;
    }

    /** Transform directly into an output object (zero allocation). */
    _txInto(x, y, out) {
        out.x = this._txA * x + this._txC * y + this._txE;
        out.y = this._txB * x + this._txD * y + this._txF;
        return out;
    }

    /** Get the average scale factor for line width scaling. */
    _getScaleFactor() {
        const sx = Math.sqrt(this._txA * this._txA + this._txB * this._txB);
        const sy = Math.sqrt(this._txC * this._txC + this._txD * this._txD);
        return (sx + sy) / 2;
    }

    /**
     * Get cached parsed color (avoids repeated string parsing).
     * @param {string} style - CSS color string
     * @returns {{ r: number, g: number, b: number, a: number }}
     */
    _getCachedColor(style) {
        // Non-strings (gradients, patterns) bypass cache
        if (typeof style !== 'string') {
            return this.surface._parseColor(style);
        }
        let c = this._colorCache.get(style);
        if (c) return c;
        c = this.surface._parseColor(style);
        // Limit cache size
        if (this._colorCache.size >= this._colorCacheMaxSize) {
            // Clear oldest entries (simple eviction)
            const firstKey = this._colorCache.keys().next().value;
            this._colorCache.delete(firstKey);
        }
        this._colorCache.set(style, c);
        return c;
    }

    // =======================================================================
    //  DEPTH TRACKING
    // =======================================================================

    /**
     * Set the current draw depth (informational).
     * Depth ordering is handled by draw-call order (painter's algorithm).
     * The engine pre-sorts instances by depth before drawing.
     * @param {number} z - Depth value (higher = drawn first / behind)
     */
    setDepth(z) {
        this._currentDepth = z;
    }

    // =======================================================================
    //  SHADOW HELPER
    // =======================================================================

    /**
     * Parse shadow color and return RGBA components for GPU rendering.
     * @returns {{ r: number, g: number, b: number, a: number }|null}
     */
    _getShadowColor() {
        if (!this._hasShadow()) return null;
        return this.surface._parseColor(this.shadowColor);
    }

    /**
     * Draw a shadow quad at the shadow offset for a given local-space rect.
     * @param {number} x - Local X
     * @param {number} y - Local Y
     * @param {number} w - Width
     * @param {number} h - Height
     */
    _drawShadowRect(x, y, w, h) {
        const sc = this._getShadowColor();
        if (!sc) return;
        const ox = this.shadowOffsetX, oy = this.shadowOffsetY;
        const blur = this.shadowBlur;

        // Expand rect by blur amount for approximate soft shadow
        const expand = blur * 0.5;
        const sx = x + ox - expand;
        const sy = y + oy - expand;
        const sw = w + expand * 2;
        const sh = h + expand * 2;

        const p0 = this._tx(sx, sy);
        const p1 = this._tx(sx + sw, sy);
        const p2 = this._tx(sx + sw, sy + sh);
        const p3 = this._tx(sx, sy + sh);

        // Shadow alpha fades with blur
        const shadowAlpha = sc.a * this.globalAlpha * (blur > 0 ? Math.max(0.2, 1.0 - blur * 0.02) : 1.0);

        this.surface.addColoredQuad(
            p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
            sc.r, sc.g, sc.b, shadowAlpha
        );
    }

    /**
     * Draw shadow geometry for the current path.
     * Uses centroid-based fan for uniform triangles (no seams).
     */
    _drawShadowPath() {
        const sc = this._getShadowColor();
        if (!sc) return;
        const ops = this._pathOps;
        if (ops.length < 3) return;

        const ox = this.shadowOffsetX, oy = this.shadowOffsetY;
        const shadowAlpha = sc.a * this.globalAlpha * (this.shadowBlur > 0 ? Math.max(0.2, 1.0 - this.shadowBlur * 0.02) : 1.0);

        // Count vertices
        let vertCount = 0;
        for (let i = 0; i < ops.length; i++) {
            const t = ops[i].type;
            if (t === 'move' || t === 'line') vertCount++;
        }
        if (vertCount < 3) return;

        // Ensure buffers
        if (vertCount > this._fillBufCap) {
            this._fillBufCap = Math.max(vertCount, this._fillBufCap * 2);
            this._fillBufX = new Float64Array(this._fillBufCap);
            this._fillBufY = new Float64Array(this._fillBufCap);
        }

        // Transform with shadow offset into pre-allocated buffers + compute centroid
        const bx = this._fillBufX, by = this._fillBufY;
        const txA = this._txA, txB = this._txB, txC = this._txC;
        const txD = this._txD, txE = this._txE, txF = this._txF;
        let centX = 0, centY = 0, vi = 0;
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            if (op.type === 'move' || op.type === 'line') {
                const lx = op.x + ox, ly = op.y + oy;
                const sx = txA * lx + txC * ly + txE;
                const sy = txB * lx + txD * ly + txF;
                bx[vi] = sx; by[vi] = sy;
                centX += sx; centY += sy;
                vi++;
            }
        }
        centX /= vertCount; centY /= vertCount;

        // Triangle fan from centroid (uniform triangles, no thin slivers)
        for (let i = 0; i < vertCount; i++) {
            const ni = (i + 1) % vertCount;
            this.surface.addColoredTriangle(
                centX, centY,
                bx[i], by[i],
                bx[ni], by[ni],
                sc.r, sc.g, sc.b, shadowAlpha
            );
        }
    }

    // =======================================================================
    //  RECTANGLE METHODS
    // =======================================================================

    clearRect(x, y, w, h) {
        if (x === 0 && y === 0 && w >= this.width && h >= this.height &&
            this._currentTransform.isIdentity) {
            this.surface.clear();
            return;
        }
        this.surface.flush();
        const gl = this.surface.gl;
        if (gl && !this.surface._fallbackMode) {
            const p0 = this._tx(x, y);
            const p1 = this._tx(x + w, y + h);
            const minX = Math.min(p0.x, p1.x), minY = Math.min(p0.y, p1.y);
            const maxX = Math.max(p0.x, p1.x), maxY = Math.max(p0.y, p1.y);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(Math.floor(minX), Math.floor(this.height - maxY),
                       Math.ceil(maxX - minX), Math.ceil(maxY - minY));
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.disable(gl.SCISSOR_TEST);
        }
    }

    fillRect(x, y, w, h) {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._syncBlendMode();

        // Shadow
        if (this._hasShadow()) this._drawShadowRect(x, y, w, h);

        // Transform all 4 corners using temp points (no allocation)
        const p0 = this._txTemp(x, y);
        const p1 = this._txTemp(x + w, y);
        const p2 = this._txTemp(x + w, y + h);
        const p3 = this._txTemp(x, y + h);

        if (this._isGradientOrPattern(this.fillStyle)) {
            // Render gradient to texture, then draw textured quad
            const grad = this._getGradientTexture(this.fillStyle, x, y, w, h);
            this.surface.drawTexturedQuad(
                grad.texture, grad.canvasW, grad.canvasH,
                0, 0, grad.drawW, grad.drawH,
                p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
                1, 1, 1, this.globalAlpha
            );
        } else {
            const c = this._getCachedColor(this.fillStyle);
            const a = c.a * this.globalAlpha;
            this.surface.addColoredQuad(
                p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
                c.r, c.g, c.b, a
            );
        }
    }

    strokeRect(x, y, w, h) {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._syncBlendMode();

        const p0 = this._txTemp(x, y);
        const p1 = this._txTemp(x + w, y);
        const p2 = this._txTemp(x + w, y + h);
        const p3 = this._txTemp(x, y + h);
        const lw = Math.max(1, Math.round(this.lineWidth * this._getScaleFactor()));

        // Cache point values since _txTemp reuses objects
        const p0x = p0.x, p0y = p0.y;
        const p1x = p1.x, p1y = p1.y;
        const p2x = p2.x, p2y = p2.y;
        const p3x = p3.x, p3y = p3.y;

        if (this._isGradientOrPattern(this.strokeStyle)) {
            // Render gradient to texture covering the rect bounds
            const grad = this._getGradientTexture(this.strokeStyle, x, y, w, h);
            const cW = grad.canvasW;
            const cH = grad.canvasH;

            // Draw each edge as a textured line quad
            this._drawGradientLineQuad(p0x, p0y, p1x, p1y, lw, grad.texture, cW, cH, x, y, x + w, y);
            this._drawGradientLineQuad(p1x, p1y, p2x, p2y, lw, grad.texture, cW, cH, x + w, y, x + w, y + h);
            this._drawGradientLineQuad(p2x, p2y, p3x, p3y, lw, grad.texture, cW, cH, x + w, y + h, x, y + h);
            this._drawGradientLineQuad(p3x, p3y, p0x, p0y, lw, grad.texture, cW, cH, x, y + h, x, y);
        } else {
            const c = this._getCachedColor(this.strokeStyle);
            const a = c.a * this.globalAlpha;
            this.surface.addLineQuad(p0x, p0y, p1x, p1y, c.r, c.g, c.b, a, lw);
            this.surface.addLineQuad(p1x, p1y, p2x, p2y, c.r, c.g, c.b, a, lw);
            this.surface.addLineQuad(p2x, p2y, p3x, p3y, c.r, c.g, c.b, a, lw);
            this.surface.addLineQuad(p3x, p3y, p0x, p0y, c.r, c.g, c.b, a, lw);
        }
    }

    /**
     * Draw a line segment with gradient texture.
     * Used internally for gradient strokes.
     */
    _drawGradientLineQuad(x1, y1, x2, y2, width, texture, texW, texH, lx1, ly1, lx2, ly2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) return;
        const hw = Math.max(width, 1) * 0.5;
        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;

        // 4 corners of the line quad (screen space)
        const qx0 = x1 + nx, qy0 = y1 + ny;  // start + normal
        const qx1 = x1 - nx, qy1 = y1 - ny;  // start - normal
        const qx2 = x2 - nx, qy2 = y2 - ny;  // end - normal
        const qx3 = x2 + nx, qy3 = y2 + ny;  // end + normal

        // UV coords based on local positions along the line
        // Compute UV for start and end points in the gradient texture space
        // (Assuming gradient was rendered at local origin)
        const u0 = lx1 / texW, v0 = ly1 / texH;
        const u1 = lx2 / texW, v1 = ly2 / texH;

        // Draw as two triangles with UVs interpolated along the line
        this.surface.drawTexturedTriangle(
            texture,
            qx0, qy0, u0, v0,
            qx1, qy1, u0, v0,
            qx2, qy2, u1, v1,
            1, 1, 1, this.globalAlpha
        );
        this.surface.drawTexturedTriangle(
            texture,
            qx0, qy0, u0, v0,
            qx2, qy2, u1, v1,
            qx3, qy3, u1, v1,
            1, 1, 1, this.globalAlpha
        );
    }

    // =======================================================================
    //  LINE DASH
    // =======================================================================

    setLineDash(segments) {
        if (!Array.isArray(segments)) return;
        for (let i = 0; i < segments.length; i++) {
            if (!isFinite(segments[i]) || segments[i] < 0) return;
        }
        this._lineDash = segments.length % 2 !== 0
            ? [...segments, ...segments]
            : [...segments];
    }

    getLineDash() { return [...this._lineDash]; }

    // =======================================================================
    //  PATH METHODS
    // =======================================================================

    beginPath() { this._pathOps = []; }

    closePath() {
        if (this._pathOps.length > 0) {
            this._pathOps.push({ type: 'close' });
            this._pathCurX = this._pathStartX;
            this._pathCurY = this._pathStartY;
        }
    }

    moveTo(x, y) {
        this._pathOps.push({ type: 'move', x, y });
        this._pathStartX = x; this._pathStartY = y;
        this._pathCurX = x; this._pathCurY = y;
    }

    lineTo(x, y) {
        this._pathOps.push({ type: 'line', x, y });
        this._pathCurX = x; this._pathCurY = y;
    }

    arc(cx, cy, radius, startAngle, endAngle, counterclockwise = false) {
        let start = startAngle, end = endAngle;
        if (counterclockwise) { if (end > start) end -= Math.PI * 2; }
        else { if (end < start) end += Math.PI * 2; }
        const absAngle = Math.abs(end - start);
        // Adaptive segment count: scales with arc length, capped for performance
        const steps = Math.max(12, Math.min(96, (absAngle * radius * 0.15 + 8) | 0));
        const angleStep = (end - start) / steps;
        // For full circles, skip duplicate closing point (prevents degenerate fan triangles)
        const isFullCircle = absAngle >= Math.PI * 1.999;
        const limit = isFullCircle ? steps : steps + 1;
        for (let i = 0; i < limit; i++) {
            const a = start + angleStep * i;
            const px = cx + Math.cos(a) * radius;
            const py = cy + Math.sin(a) * radius;
            if (i === 0 && this._pathOps.length === 0) this.moveTo(px, py);
            else this.lineTo(px, py);
        }
    }

    arcTo(x1, y1, x2, y2, radius) {
        const x0 = this._pathCurX, y0 = this._pathCurY;
        const dx0 = x0 - x1, dy0 = y0 - y1;
        const dx2 = x2 - x1, dy2 = y2 - y1;
        const len0 = Math.sqrt(dx0*dx0 + dy0*dy0);
        const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        if (radius < 0) throw new DOMException('Negative radius', 'IndexSizeError');
        if (len0 === 0 || len2 === 0) { this.lineTo(x1, y1); return; }
        const ux0 = dx0/len0, uy0 = dy0/len0;
        const ux2 = dx2/len2, uy2 = dy2/len2;
        const cross = ux0*uy2 - uy0*ux2;
        const dot = ux0*ux2 + uy0*uy2;
        if (Math.abs(cross) < 1e-8) { this.lineTo(x1, y1); return; }
        const halfAngle = Math.acos(Math.max(-1, Math.min(1, dot))) / 2;
        const tanDist = radius / Math.tan(halfAngle);
        const tx0 = x1 + ux0 * tanDist, ty0 = y1 + uy0 * tanDist;
        const tx2 = x1 + ux2 * tanDist, ty2 = y1 + uy2 * tanDist;
        const ccx = tx0 + (-uy0) * (cross > 0 ? 1 : -1) * radius;
        const ccy = ty0 + (ux0) * (cross > 0 ? 1 : -1) * radius;
        const sa = Math.atan2(ty0 - ccy, tx0 - ccx);
        const ea = Math.atan2(ty2 - ccy, tx2 - ccx);
        this.lineTo(tx0, ty0);
        this.arc(ccx, ccy, radius, sa, ea, cross > 0);
    }

    ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle, counterclockwise = false) {
        let start = startAngle, end = endAngle;
        if (counterclockwise) { if (end > start) end -= Math.PI * 2; }
        else { if (end < start) end += Math.PI * 2; }
        const absAngle = Math.abs(end - start);
        const steps = Math.max(12, Math.min(96, (absAngle * Math.max(rx, ry) * 0.15 + 8) | 0));
        const angleStep = (end - start) / steps;
        const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
        const isFullEllipse = absAngle >= Math.PI * 1.999;
        const limit = isFullEllipse ? steps : steps + 1;
        for (let i = 0; i < limit; i++) {
            const a = start + angleStep * i;
            const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
            const px = cx + lx * cosR - ly * sinR;
            const py = cy + lx * sinR + ly * cosR;
            if (i === 0 && this._pathOps.length === 0) this.moveTo(px, py);
            else this.lineTo(px, py);
        }
    }

    quadraticCurveTo(cpx, cpy, x, y) {
        const sx = this._pathCurX, sy = this._pathCurY;
        const steps = 16;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps, it = 1 - t;
            this.lineTo(it*it*sx + 2*it*t*cpx + t*t*x, it*it*sy + 2*it*t*cpy + t*t*y);
        }
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        const sx = this._pathCurX, sy = this._pathCurY;
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps, it = 1 - t;
            this.lineTo(
                it*it*it*sx + 3*it*it*t*cp1x + 3*it*t*t*cp2x + t*t*t*x,
                it*it*it*sy + 3*it*it*t*cp1y + 3*it*t*t*cp2y + t*t*t*y
            );
        }
    }

    rect(x, y, w, h) {
        this.moveTo(x, y); this.lineTo(x+w, y); this.lineTo(x+w, y+h); this.lineTo(x, y+h);
        this.closePath();
    }

    roundRect(x, y, w, h, radii) {
        let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        r = Math.min(r, w/2, h/2);
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.arc(x + w - r, y + r, r, -Math.PI/2, 0);
        this.lineTo(x + w, y + h - r);
        this.arc(x + w - r, y + h - r, r, 0, Math.PI/2);
        this.lineTo(x + r, y + h);
        this.arc(x + r, y + h - r, r, Math.PI/2, Math.PI);
        this.lineTo(x, y + r);
        this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
        this.closePath();
    }

    stroke() {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._syncBlendMode();
        const ops = this._pathOps;
        if (ops.length === 0) return;

        const lw = Math.max(1, Math.round(this.lineWidth * this._getScaleFactor()));

        if (this._isGradientOrPattern(this.strokeStyle)) {
            // Compute bounding box for gradient texture
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const op of ops) {
                if (op.type === 'move' || op.type === 'line') {
                    minX = Math.min(minX, op.x); minY = Math.min(minY, op.y);
                    maxX = Math.max(maxX, op.x); maxY = Math.max(maxY, op.y);
                }
            }
            const bw = maxX - minX || 1;
            const bh = maxY - minY || 1;
            const grad = this._getGradientTexture(this.strokeStyle, minX, minY, bw, bh);
            const cW = grad.canvasW;
            const cH = grad.canvasH;

            let curX = 0, curY = 0, startX = 0, startY = 0;
            let localCurX = 0, localCurY = 0, localStartX = 0, localStartY = 0;

            for (const op of ops) {
                switch (op.type) {
                    case 'move': {
                        const p = this._tx(op.x, op.y);
                        curX = p.x; curY = p.y; startX = p.x; startY = p.y;
                        localCurX = op.x - minX; localCurY = op.y - minY;
                        localStartX = localCurX; localStartY = localCurY;
                        break;
                    }
                    case 'line': {
                        const p = this._tx(op.x, op.y);
                        const localX = op.x - minX, localY = op.y - minY;
                        this._drawGradientLineQuadUV(curX, curY, p.x, p.y, lw,
                            grad.texture, cW, cH,
                            localCurX, localCurY, localX, localY);
                        curX = p.x; curY = p.y;
                        localCurX = localX; localCurY = localY;
                        break;
                    }
                    case 'close': {
                        this._drawGradientLineQuadUV(curX, curY, startX, startY, lw,
                            grad.texture, cW, cH,
                            localCurX, localCurY, localStartX, localStartY);
                        curX = startX; curY = startY;
                        localCurX = localStartX; localCurY = localStartY;
                        break;
                    }
                }
            }
        } else {
            const c = this._getCachedColor(this.strokeStyle);
            const a = c.a * this.globalAlpha;

            let curX = 0, curY = 0, startX = 0, startY = 0;
            const tempP = this._tempPoints[15]; // Use last temp point

            for (let i = 0; i < ops.length; i++) {
                const op = ops[i];
                switch (op.type) {
                    case 'move': {
                        this._txInto(op.x, op.y, tempP);
                        curX = tempP.x; curY = tempP.y; startX = tempP.x; startY = tempP.y;
                        break;
                    }
                    case 'line': {
                        this._txInto(op.x, op.y, tempP);
                        this.surface.addLineQuad(curX, curY, tempP.x, tempP.y, c.r, c.g, c.b, a, lw);
                        curX = tempP.x; curY = tempP.y;
                        break;
                    }
                    case 'close': {
                        this.surface.addLineQuad(curX, curY, startX, startY, c.r, c.g, c.b, a, lw);
                        curX = startX; curY = startY;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Draw a line segment with gradient texture (UV-based).
     */
    _drawGradientLineQuadUV(x1, y1, x2, y2, width, texture, texW, texH, lu1, lv1, lu2, lv2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) return;
        const hw = Math.max(width, 1) * 0.5;
        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;

        // 4 corners of the line quad
        const qx0 = x1 + nx, qy0 = y1 + ny;
        const qx1 = x1 - nx, qy1 = y1 - ny;
        const qx2 = x2 - nx, qy2 = y2 - ny;
        const qx3 = x2 + nx, qy3 = y2 + ny;

        // UV coords
        const u0 = lu1 / texW, v0 = lv1 / texH;
        const u1 = lu2 / texW, v1 = lv2 / texH;

        this.surface.drawTexturedTriangle(
            texture,
            qx0, qy0, u0, v0,
            qx1, qy1, u0, v0,
            qx2, qy2, u1, v1,
            1, 1, 1, this.globalAlpha
        );
        this.surface.drawTexturedTriangle(
            texture,
            qx0, qy0, u0, v0,
            qx2, qy2, u1, v1,
            qx3, qy3, u1, v1,
            1, 1, 1, this.globalAlpha
        );
    }

    fill() {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._syncBlendMode();
        const ops = this._pathOps;
        if (ops.length < 3) return;

        // Shadow (drawn first; uses _fillBuf internally then returns)
        if (this._hasShadow()) this._drawShadowPath();

        // Count vertices
        let vertCount = 0;
        for (let i = 0; i < ops.length; i++) {
            const t = ops[i].type;
            if (t === 'move' || t === 'line') vertCount++;
        }
        if (vertCount < 3) return;

        // Ensure pre-allocated buffers are large enough
        if (vertCount > this._fillBufCap) {
            this._fillBufCap = Math.max(vertCount, this._fillBufCap * 2);
            this._fillBufX = new Float64Array(this._fillBufCap);
            this._fillBufY = new Float64Array(this._fillBufCap);
        }

        // Transform vertices into pre-allocated buffers + compute centroid (single pass, zero allocation)
        const bx = this._fillBufX, by = this._fillBufY;
        const txA = this._txA, txB = this._txB, txC = this._txC;
        const txD = this._txD, txE = this._txE, txF = this._txF;
        let centX = 0, centY = 0, vi = 0;
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            if (op.type === 'move' || op.type === 'line') {
                const sx = txA * op.x + txC * op.y + txE;
                const sy = txB * op.x + txD * op.y + txF;
                bx[vi] = sx; by[vi] = sy;
                centX += sx; centY += sy;
                vi++;
            }
        }
        centX /= vertCount; centY /= vertCount;

        if (this._isGradientOrPattern(this.fillStyle)) {
            // Compute bounding box in local space for gradient texture
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const localX = [], localY = [];
            let lcx = 0, lcy = 0;
            for (let i = 0; i < ops.length; i++) {
                const op = ops[i];
                if (op.type === 'move' || op.type === 'line') {
                    if (op.x < minX) minX = op.x;
                    if (op.y < minY) minY = op.y;
                    if (op.x > maxX) maxX = op.x;
                    if (op.y > maxY) maxY = op.y;
                    localX.push(op.x); localY.push(op.y);
                    lcx += op.x; lcy += op.y;
                }
            }
            lcx /= vertCount; lcy /= vertCount;
            const bw = maxX - minX || 1, bh = maxY - minY || 1;
            const grad = this._getGradientTexture(this.fillStyle, minX, minY, bw, bh);
            const cW = grad.canvasW, cH = grad.canvasH;
            const uvCX = (lcx - minX) / cW, uvCY = (lcy - minY) / cH;

            // Triangle fan from centroid with gradient texture
            for (let i = 0; i < vertCount; i++) {
                const ni = (i + 1) % vertCount;
                this.surface.drawTexturedTriangle(
                    grad.texture,
                    centX, centY, uvCX, uvCY,
                    bx[i], by[i], (localX[i] - minX) / cW, (localY[i] - minY) / cH,
                    bx[ni], by[ni], (localX[ni] - minX) / cW, (localY[ni] - minY) / cH,
                    1, 1, 1, this.globalAlpha
                );
            }
        } else {
            const c = this._getCachedColor(this.fillStyle);
            const a = c.a * this.globalAlpha;
            // Triangle fan from centroid: uniform triangles eliminate seams between shapes
            for (let i = 0; i < vertCount; i++) {
                const ni = (i + 1) % vertCount;
                this.surface.addColoredTriangle(
                    centX, centY,
                    bx[i], by[i],
                    bx[ni], by[ni],
                    c.r, c.g, c.b, a
                );
            }
        }
    }

    // =======================================================================
    //  CLIPPING & HIT-TESTING
    // =======================================================================

    clip(fillRule) {
        const verts = [];
        for (const op of this._pathOps) {
            if (op.type === 'move' || op.type === 'line') {
                // Transform path vertices to device space using the current transform
                // so the clip region is always in screen/device coordinates.
                const p = this._tx(op.x, op.y);
                verts.push({ x: p.x, y: p.y });
            }
        }
        this._clipRegion = verts.length > 2 ? verts : null;
    }

    isPointInPath(x, y, fillRule) {
        const verts = [];
        for (const op of this._pathOps) {
            if (op.type === 'move' || op.type === 'line') verts.push({ x: op.x, y: op.y });
        }
        return this._pointInPolygon(x, y, verts);
    }

    isPointInStroke(x, y) {
        const halfLW = this.lineWidth / 2;
        let curX = 0, curY = 0;
        for (const op of this._pathOps) {
            if (op.type === 'move') { curX = op.x; curY = op.y; }
            else if (op.type === 'line') {
                if (this._distToSegment(x, y, curX, curY, op.x, op.y) <= halfLW) return true;
                curX = op.x; curY = op.y;
            }
        }
        return false;
    }

    drawFocusIfNeeded(element) { /* No-op */ }

    _pointInPolygon(px, py, verts) {
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const xi = verts[i].x, yi = verts[i].y;
            const xj = verts[j].x, yj = verts[j].y;
            if ((yi > py) !== (yj > py) && px < (xj-xi)*(py-yi)/(yj-yi)+xi) inside = !inside;
        }
        return inside;
    }

    _distToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2-x1, dy = y2-y1;
        const lenSq = dx*dx + dy*dy;
        if (lenSq === 0) return Math.sqrt((px-x1)**2 + (py-y1)**2);
        let t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / lenSq));
        return Math.sqrt((px - (x1+t*dx))**2 + (py - (y1+t*dy))**2);
    }

    // =======================================================================
    //  TEXT METHODS
    // =======================================================================

    fillText(text, x, y, maxWidth) {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._drawText(text, x, y, maxWidth, true);
    }

    strokeText(text, x, y, maxWidth) {
        this.stats.drawCalls++;
        this._drawIndex++;
        this._drawText(text, x, y, maxWidth, false);
    }

    measureText(text) {
        this._textCtx.font = this.font;
        return this._textCtx.measureText(text);
    }

    _drawText(text, x, y, maxWidth, isFill) {
        this._syncBlendMode();
        const tc = this._textCtx;
        tc.font = this.font;

        const metrics = tc.measureText(text);
        const textW = Math.ceil(metrics.width) + 4;
        const fontSize = parseInt(this.font, 10) || 16;
        const textH = fontSize * 2;

        // Resize if needed
        let needsResize = false;
        if (this._textCanvas.width < textW || this._textCanvas.height < textH) {
            this._textCanvas.width = Math.max(this._textCanvas.width, textW);
            this._textCanvas.height = Math.max(this._textCanvas.height, textH);
            needsResize = true;
        }
        tc.clearRect(0, 0, this._textCanvas.width, this._textCanvas.height);
        tc.font = this.font;
        tc.textAlign = this.textAlign;
        tc.textBaseline = this.textBaseline;

        if (isFill) {
            tc.fillStyle = this._isGradientOrPattern(this.fillStyle) ? this.fillStyle : this.fillStyle;
            tc.fillText(text, 2, fontSize, maxWidth);
        } else {
            tc.strokeStyle = this.strokeStyle;
            tc.lineWidth = this.lineWidth;
            tc.strokeText(text, 2, fontSize, maxWidth);
        }

        // Upload text canvas to GPU texture
        if (needsResize) {
            this.surface.deleteTexture(this._textTexture);
            this._textTexture = this.surface.createTextureFromSource(this._textCanvas);
        } else {
            this.surface.updateTexture(this._textTexture, this._textCanvas);
        }
        this.stats.textureUploads++;

        // Alignment offsets
        let alignOffsetX = 0;
        if (this.textAlign === 'center') alignOffsetX = -textW / 2;
        else if (this.textAlign === 'right' || this.textAlign === 'end') alignOffsetX = -textW;

        let baselineOffsetY = 0;
        if (this.textBaseline === 'top') baselineOffsetY = 0;
        else if (this.textBaseline === 'middle') baselineOffsetY = -fontSize / 2;
        else baselineOffsetY = -fontSize;

        // Transform destination quad
        const lx = x + alignOffsetX, ly = y + baselineOffsetY;
        const p0 = this._tx(lx, ly);
        const p1 = this._tx(lx + textW, ly);
        const p2 = this._tx(lx + textW, ly + textH);
        const p3 = this._tx(lx, ly + textH);

        // Shadow
        if (this._hasShadow()) {
            const sc = this._getShadowColor();
            if (sc) {
                const slx = lx + this.shadowOffsetX, sly = ly + this.shadowOffsetY;
                const sp0 = this._tx(slx, sly);
                const sp1 = this._tx(slx + textW, sly);
                const sp2 = this._tx(slx + textW, sly + textH);
                const sp3 = this._tx(slx, sly + textH);
                const sa = sc.a * this.globalAlpha;
                this.surface.drawTexturedQuad(
                    this._textTexture, this._textCanvas.width, this._textCanvas.height,
                    0, 0, textW, textH,
                    sp0.x, sp0.y, sp1.x, sp1.y, sp2.x, sp2.y, sp3.x, sp3.y,
                    sc.r, sc.g, sc.b, sa
                );
            }
        }

        // Draw text textured quad
        this.surface.drawTexturedQuad(
            this._textTexture, this._textCanvas.width, this._textCanvas.height,
            0, 0, textW, textH,
            p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
            1, 1, 1, this.globalAlpha
        );
    }

    // =======================================================================
    //  IMAGE DRAWING (GPU texture-cached)
    // =======================================================================

    /**
     * drawImage - supports all three Canvas2D overloads.
     * Images are cached as GPU textures and drawn as textured quads.
     */
    drawImage(image, ...args) {
        this.stats.drawCalls++;
        this._drawIndex++;
        if (!image) return;
        this._syncBlendMode();

        let sx, sy, sw, sh, dx, dy, dw, dh;
        const imgW = image.width || image.naturalWidth || image.videoWidth || 0;
        const imgH = image.height || image.naturalHeight || image.videoHeight || 0;

        if (args.length === 2) {
            sx = 0; sy = 0; sw = imgW; sh = imgH;
            dx = args[0]; dy = args[1]; dw = imgW; dh = imgH;
        } else if (args.length === 4) {
            sx = 0; sy = 0; sw = imgW; sh = imgH;
            dx = args[0]; dy = args[1]; dw = args[2]; dh = args[3];
        } else if (args.length === 8) {
            sx = args[0]; sy = args[1]; sw = args[2]; sh = args[3];
            dx = args[4]; dy = args[5]; dw = args[6]; dh = args[7];
        } else {
            return;
        }

        if (imgW === 0 || imgH === 0 || dw === 0 || dh === 0) return;

        // Get or create the GPU texture
        const texEntry = this._getOrCreateTexture(image);

        // Transform destination corners using temp points
        const p0 = this._txTemp(dx, dy);
        const p1 = this._txTemp(dx + dw, dy);
        const p2 = this._txTemp(dx + dw, dy + dh);
        const p3 = this._txTemp(dx, dy + dh);
        // Cache values since temp points get reused
        const p0x = p0.x, p0y = p0.y;
        const p1x = p1.x, p1y = p1.y;
        const p2x = p2.x, p2y = p2.y;
        const p3x = p3.x, p3y = p3.y;

        // Shadow
        if (this._hasShadow()) {
            const sc = this._getShadowColor();
            if (sc) {
                const sdx = dx + this.shadowOffsetX, sdy = dy + this.shadowOffsetY;
                const sp0 = this._txTemp(sdx, sdy);
                const sp1 = this._txTemp(sdx + dw, sdy);
                const sp2 = this._txTemp(sdx + dw, sdy + dh);
                const sp3 = this._txTemp(sdx, sdy + dh);
                const sa = sc.a * this.globalAlpha * (this.shadowBlur > 0 ? Math.max(0.2, 1.0 - this.shadowBlur*0.02) : 1.0);
                // Draw shadow with tint = shadow color
                this.surface.drawTexturedQuad(
                    texEntry.texture, texEntry.width, texEntry.height,
                    sx, sy, sw, sh,
                    sp0.x, sp0.y, sp1.x, sp1.y, sp2.x, sp2.y, sp3.x, sp3.y,
                    sc.r, sc.g, sc.b, sa
                );
            }
        }

        // Draw the image — honour clip region if active
        if (this._clipRegion && this._clipRegion.length >= 3) {
            // The clip region vertices are in device (screen) space.
            // We need UVs for each clip vertex. Use the inverse of the current
            // transform to map device coords back to local (drawImage) space,
            // then derive texture UVs from the source rect.
            const inv = this._currentTransform.inverse();
            const texW = texEntry.width;
            const texH = texEntry.height;
            const clipVerts = this._clipRegion;
            const clipLen = clipVerts.length;

            // Pre-compute UV for each clip vertex
            const clipUVs = new Array(clipLen);
            for (let ci = 0; ci < clipLen; ci++) {
                const cv = clipVerts[ci];
                // Inverse-transform from device space to local (drawImage) space
                const lx = inv.a * cv.x + inv.c * cv.y + inv.e;
                const ly = inv.b * cv.x + inv.d * cv.y + inv.f;
                // Map local coords to texture UV via source rect
                clipUVs[ci] = {
                    u: (sx + (lx - dx) / dw * sw) / texW,
                    v: (sy + (ly - dy) / dh * sh) / texH
                };
            }

            // Triangle-fan from first vertex
            for (let ci = 1; ci < clipLen - 1; ci++) {
                this.surface.drawTexturedTriangle(
                    texEntry.texture,
                    clipVerts[0].x,  clipVerts[0].y,  clipUVs[0].u,  clipUVs[0].v,
                    clipVerts[ci].x, clipVerts[ci].y, clipUVs[ci].u, clipUVs[ci].v,
                    clipVerts[ci + 1].x, clipVerts[ci + 1].y, clipUVs[ci + 1].u, clipUVs[ci + 1].v,
                    1, 1, 1, this.globalAlpha
                );
            }
        } else {
            this.surface.drawTexturedQuad(
                texEntry.texture, texEntry.width, texEntry.height,
                sx, sy, sw, sh,
                p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y,
                1, 1, 1, this.globalAlpha
            );
        }
    }

    // =======================================================================
    //  PIXEL MANIPULATION
    // =======================================================================

    getImageData(x, y, w, h) {
        this.surface.flush();
        return this.surface.getImageData(x, y, w, h);
    }

    putImageData(imageData, dx, dy) {
        this.surface.putImageData(imageData, dx, dy);
    }

    createImageData(w, h) {
        return this.targetCtx.createImageData(w, h);
    }

    // =======================================================================
    //  GRADIENT / PATTERN CREATION
    //  Returns real CanvasGradient objects (from temp ctx) with metadata.
    // =======================================================================

    createLinearGradient(x0, y0, x1, y1) {
        const grad = this._gradientCtx.createLinearGradient(x0, y0, x1, y1);
        grad._gpuType = 'linear';
        grad._gpuParams = { x0, y0, x1, y1 };
        grad._gpuStops = [];
        const origAdd = grad.addColorStop.bind(grad);
        grad.addColorStop = (offset, color) => {
            origAdd(offset, color);
            grad._gpuStops.push({ offset, color });
        };
        return grad;
    }

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
        const grad = this._gradientCtx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        grad._gpuType = 'radial';
        grad._gpuParams = { x0, y0, r0, x1, y1, r1 };
        grad._gpuStops = [];
        const origAdd = grad.addColorStop.bind(grad);
        grad.addColorStop = (offset, color) => {
            origAdd(offset, color);
            grad._gpuStops.push({ offset, color });
        };
        return grad;
    }

    createConicGradient(startAngle, x, y) {
        // createConicGradient may not be available on all contexts
        if (this._gradientCtx.createConicGradient) {
            const grad = this._gradientCtx.createConicGradient(startAngle, x, y);
            grad._gpuType = 'conic';
            grad._gpuParams = { startAngle, x, y };
            grad._gpuStops = [];
            const origAdd = grad.addColorStop.bind(grad);
            grad.addColorStop = (offset, color) => {
                origAdd(offset, color);
                grad._gpuStops.push({ offset, color });
            };
            return grad;
        }
        return this.targetCtx.createConicGradient(startAngle, x, y);
    }

    createPattern(image, repetition) {
        return this._gradientCtx.createPattern(image, repetition);
    }

    // =======================================================================
    //  SHADER EFFECT SYSTEM
    // =======================================================================

    /**
     * Add a post-process effect to the chain.
     * 
     * Built-in: 'bloom', 'blur', 'chromatic', 'crt', 'posterize', 'thermal',
     * 'gradientMap', 'noise', 'channelShift', 'sharpen', 'edgeDetect', 'dither',
     * 'pixelate', 'glitch', 'colorGrade'
     */
    addEffect(name, uniforms = {}) {
        const idx = this._effects.length;
        this._effects.push({ name, uniforms });
        this._effectsDirty = true;
        return idx;
    }

    updateEffect(index, uniforms) {
        if (index >= 0 && index < this._effects.length) {
            Object.assign(this._effects[index].uniforms, uniforms);
        }
    }

    removeEffect(index) {
        if (index >= 0 && index < this._effects.length) {
            this._effects.splice(index, 1);
        }
    }

    clearEffects() { this._effects = []; }
    getEffects() { return [...this._effects]; }

    registerShader(name, fragmentSource) {
        if (!this.surface.gl || this.surface._fallbackMode) return false;
        const gl = this.surface.gl;
        const effectVert = `#version 300 es
            in vec2 a_position;
            out vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
                v_texCoord = a_position * 0.5 + 0.5;
            }
        `;
        const program = this.surface._compileShaderProgram(effectVert, fragmentSource);
        if (!program) {
            console.error(`GPURenderer: Failed to compile custom shader '${name}'`);
            return false;
        }
        this.surface._effectShaders[name] = program;
        this._customShaders.set(name, program);
        return true;
    }

    applyShader(name, uniforms = {}) {
        this.surface.applyEffect(name, uniforms);
        this.stats.effectPasses++;
    }

    // =======================================================================
    //  FRAME LIFECYCLE
    // =======================================================================

    beginFrame(backgroundColor) {
        // Reset stats
        this.stats.drawCalls = 0;
        this.stats.triangles = 0;
        this.stats.textureUploads = 0;
        this.stats.effectPasses = 0;
        this.stats.batchFlushes = 0;
        this.stats.textureCacheHits = 0;
        this.stats.textureCacheMisses = 0;
        this._drawIndex = 0;
        this._textureCacheFrameCounter++;
        this._tempPointIndex = 0; // Reset temp point rotation

        // Reset state
        this._currentTransform = new DOMMatrix();
        this._txA = 1; this._txB = 0; this._txC = 0;
        this._txD = 1; this._txE = 0; this._txF = 0;
        // Return any stacked states to pool
        while (this._stateStack.length > 0 && this._statePool.length < this._statePoolMax) {
            this._statePool.push(this._stateStack.pop());
        }
        this._stateStack.length = 0;
        this._lastBlendMode = 'source-over';

        // Ensure default blend mode
        this.surface.setBlendMode('source-over');

        // Clear
        this.surface.clear(backgroundColor);
    }

    endFrame(pixelPerfect = true) {
        // Flush remaining draws
        this.surface.flush();
        this.stats.batchFlushes++;

        // Apply effects
        if (this._effects.length > 0) {
            this.surface.applyEffectChain(this._effects);
            this.stats.effectPasses += this._effects.length;
        }

        // Present to canvas
        this._presentToCanvas(pixelPerfect);

        // Periodic texture cache cleanup (every 300 frames)
        if (this._textureCacheFrameCounter % 300 === 0) {
            this._cleanTextureCache();
        }
    }

    _presentToCanvas(pixelPerfect) {
        const ctx = this.targetCtx;
        const cw = this.targetCanvas.width;
        const ch = this.targetCanvas.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, cw, ch);

        const scaleX = cw / this.width;
        const scaleY = ch / this.height;
        const scale = Math.min(scaleX, scaleY);

        if (pixelPerfect) {
            const pixelScale = Math.max(1, Math.floor(scale));
            const sw = this.width * pixelScale;
            const sh = this.height * pixelScale;
            const ox = Math.floor((cw - sw) / 2);
            const oy = Math.floor((ch - sh) / 2);
            ctx.imageSmoothingEnabled = false;
            gpuSurfaceDraw(ctx, this.surface, ox, oy, sw, sh);
        } else {
            const sw = this.width * scale;
            const sh = this.height * scale;
            const ox = (cw - sw) / 2;
            const oy = (ch - sh) / 2;
            ctx.imageSmoothingEnabled = true;
            gpuSurfaceDraw(ctx, this.surface, ox, oy, sw, sh);
        }
    }

    _cleanTextureCache() {
        const now = this._textureCacheFrameCounter;
        const toDelete = [];
        for (const [key, entry] of this._textureCache) {
            if (now - entry.lastUsed > 600) toDelete.push(key);
        }
        for (const key of toDelete) {
            const entry = this._textureCache.get(key);
            if (entry) this.surface.deleteTexture(entry.texture);
            this._textureCache.delete(key);
        }
    }

    // =======================================================================
    //  RESIZE
    // =======================================================================

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.surface.resize(width, height);
    }

    // =======================================================================
    //  CONTEXT STATE
    // =======================================================================

    getContextAttributes() {
        return {
            alpha: true, desynchronized: false,
            colorSpace: 'srgb', willReadFrequently: false
        };
    }

    isContextLost() {
        if (this.surface && this.surface.gl) return this.surface.gl.isContextLost();
        return true;
    }

    reset() {
        this._currentTransform = new DOMMatrix();
        this._stateStack = [];
        this.fillStyle = '#000000';
        this.strokeStyle = '#000000';
        this.lineWidth = 1;
        this.globalAlpha = 1.0;
        this.globalCompositeOperation = 'source-over';
        this.font = '10px sans-serif';
        this.textAlign = 'start';
        this.textBaseline = 'alphabetic';
        this.lineCap = 'butt';
        this.lineJoin = 'miter';
        this.miterLimit = 10;
        this.shadowBlur = 0;
        this.shadowColor = 'rgba(0,0,0,0)';
        this.shadowOffsetX = 0;
        this.shadowOffsetY = 0;
        this.imageSmoothingEnabled = false;
        this.imageSmoothingQuality = 'low';
        this._lineDash = [];
        this.lineDashOffset = 0;
        this.direction = 'inherit';
        this.letterSpacing = '0px';
        this.fontKerning = 'auto';
        this.fontStretch = 'normal';
        this.fontVariantCaps = 'normal';
        this.textRendering = 'auto';
        this.wordSpacing = '0px';
        this.filter = 'none';
        this._pathOps = [];
        this._clipRegion = null;
        this._lastBlendMode = 'source-over';
        if (this.surface) this.surface.clear();
    }

    // =======================================================================
    //  CLEANUP
    // =======================================================================

    dispose() {
        // Clean up textures
        for (const [, entry] of this._textureCache) {
            this.surface.deleteTexture(entry.texture);
        }
        this._textureCache.clear();
        this._colorCache.clear();

        this._customShaders.clear();
        this._effects = [];
        this._stateStack = [];
        this._statePool = [];
        this._tempPoints = [];

        if (this._textTexture) {
            this.surface.deleteTexture(this._textTexture);
            this._textTexture = null;
        }
        if (this._gradientTexture) {
            this.surface.deleteTexture(this._gradientTexture);
            this._gradientTexture = null;
        }

        if (this.surface) {
            this.surface.free();
            this.surface = null;
        }

        if (this._textCanvas) {
            this._textCanvas.width = 0;
            this._textCanvas.height = 0;
            this._textCanvas = null;
            this._textCtx = null;
        }
        if (this._gradientCanvas) {
            this._gradientCanvas.width = 0;
            this._gradientCanvas.height = 0;
            this._gradientCanvas = null;
            this._gradientCtx = null;
        }
    }

    // =======================================================================
    //  CONVENIENCE
    // =======================================================================

    getSurface() { return this.surface; }
    isAccelerated() { return this.surface && this.surface.isGPUAccelerated(); }
}

// ==================== GLOBAL EXPORT ====================
window.GPURenderer = GPURenderer;
