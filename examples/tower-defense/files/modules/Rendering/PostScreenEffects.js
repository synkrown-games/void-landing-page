/**
 * PostScreenEffects Module
 * 
 * Full-screen post-processing effects applied directly to the engine's
 * offscreen canvas via onBeforeRenderCallback. This is maximally efficient:
 * the offscreen canvas is already at the game's render resolution (e.g.
 * 320×240), so we work on a tiny buffer. The engine then handles upscaling
 * to the display for free.
 * 
 * Pipeline:
 *   1. onBeforeRenderCallback fires with the offscreen canvas context
 *   2. We capture it into a buffer scaled by resolutionScale (even smaller)
 *   3. Apply all enabled pixel/spatial effects on the tiny buffer
 *   4. Write the result back onto the offscreen canvas
 *   5. Apply overlay effects (vignette, scanlines, tint, fade) directly
 *   6. Engine copies the modified offscreen to the display with scaling
 * 
 * Effects included:
 *   - Brightness / Contrast / Saturation (color grading)
 *   - Grayscale
 *   - Sepia Tone
 *   - Color Tint / Overlay
 *   - Invert Colors
 *   - Vignette
 *   - Chromatic Aberration
 *   - Scanlines (CRT)
 *   - CRT Curvature
 *   - Pixelate / Mosaic
 *   - Noise / Film Grain
 *   - Blur (box blur via downscale)
 *   - Bloom (glow)
 *   - Posterize (color quantize)
 *   - Color Channel Shift (RGB split)
 *   - Sharpen (unsharp mask)
 *   - Dither (ordered Bayer)
 *   - Gradient Map (two-tone)
 *   - Thermal / Heat Map
 *   - Edge Detection (Sobel)
 *   - Glitch (horizontal slice offset)
 *   - Screen Shake (offset jitter)
 *   - Fade to Color (screen fade overlay)
 * 
 * All pixel-level effects operate on the scaled-down buffer for speed.
 * Overlay effects draw directly on the offscreen canvas at render resolution.
 */

class PostScreenEffects extends Module {
    static WIP = false;  // Still a work in progress, expect bugs and missing features!
    constructor() {
        super();

        // ═══════════════════════════════════════
        // GLOBAL
        // ═══════════════════════════════════════
        this.resolutionScale = 0.5;      // 0.1–1.0  (lower = faster)
        this.smoothingEnabled = false;   // image smoothing on upscale
        this.renderMode = 'beforeGUI';   // 'beforeGUI' or 'afterGUI'
        this.forceGPUFallback = false;   // Force CPU processing (for debugging)

        // ═══════════════════════════════════════
        // COLOR GRADING
        // ═══════════════════════════════════════
        this.brightnessEnabled = false;
        this.brightness = 0;            // -100 … 100
        this.contrastEnabled = false;
        this.contrast = 0;              // -100 … 100
        this.saturationEnabled = false;
        this.saturation = 0;            // -100 … 100

        // ═══════════════════════════════════════
        // GRAYSCALE
        // ═══════════════════════════════════════
        this.grayscaleEnabled = false;
        this.grayscaleAmount = 1.0;     // 0–1

        // ═══════════════════════════════════════
        // SEPIA
        // ═══════════════════════════════════════
        this.sepiaEnabled = false;
        this.sepiaAmount = 1.0;         // 0–1

        // ═══════════════════════════════════════
        // INVERT
        // ═══════════════════════════════════════
        this.invertEnabled = false;
        this.invertAmount = 1.0;        // 0–1

        // ═══════════════════════════════════════
        // COLOR TINT
        // ═══════════════════════════════════════
        this.tintEnabled = false;
        this.tintColor = '#ff0000';
        this.tintOpacity = 0.2;         // 0–1
        this.tintBlendMode = 'multiply';

        // ═══════════════════════════════════════
        // VIGNETTE
        // ═══════════════════════════════════════
        this.vignetteEnabled = false;
        this.vignetteIntensity = 0.5;   // 0–1
        this.vignetteRadius = 0.7;      // 0–1 (inner radius)
        this.vignetteColor = '#000000';

        // ═══════════════════════════════════════
        // CHROMATIC ABERRATION
        // ═══════════════════════════════════════
        this.chromaticEnabled = false;
        this.chromaticAmount = 3;       // pixel offset

        // ═══════════════════════════════════════
        // SCANLINES (CRT)
        // ═══════════════════════════════════════
        this.scanlinesEnabled = false;
        this.scanlineSpacing = 3;       // px between lines
        this.scanlineOpacity = 0.3;     // 0–1
        this.scanlineColor = '#000000';

        // ═══════════════════════════════════════
        // CRT CURVATURE
        // ═══════════════════════════════════════
        this.crtEnabled = false;
        this.crtAmount = 0.03;          // 0–0.1 barrel distortion

        // ═══════════════════════════════════════
        // PIXELATE
        // ═══════════════════════════════════════
        this.pixelateEnabled = false;
        this.pixelateSize = 4;          // block size in src pixels

        // ═══════════════════════════════════════
        // NOISE / FILM GRAIN
        // ═══════════════════════════════════════
        this.noiseEnabled = false;
        this.noiseAmount = 0.15;        // 0–1
        this.noiseMonochrome = true;

        // ═══════════════════════════════════════
        // BLUR
        // ═══════════════════════════════════════
        this.blurEnabled = false;
        this.blurAmount = 2;            // passes (1–5)

        // ═══════════════════════════════════════
        // BLOOM
        // ═══════════════════════════════════════
        this.bloomEnabled = false;
        this.bloomThreshold = 200;      // 0–255 luminance threshold
        this.bloomIntensity = 0.6;      // 0–1
        this.bloomRadius = 4;           // blur passes

        // ═══════════════════════════════════════
        // POSTERIZE
        // ═══════════════════════════════════════
        this.posterizeEnabled = false;
        this.posterizeLevels = 4;       // 2–32

        // ═══════════════════════════════════════
        // CHANNEL SHIFT
        // ═══════════════════════════════════════
        this.channelShiftEnabled = false;
        this.channelShiftX = 3;         // px
        this.channelShiftY = 0;

        // ═══════════════════════════════════════
        // SHARPEN
        // ═══════════════════════════════════════
        this.sharpenEnabled = false;
        this.sharpenAmount = 0.5;       // 0–2

        // ═══════════════════════════════════════
        // DITHER (Ordered Bayer 4×4)
        // ═══════════════════════════════════════
        this.ditherEnabled = false;
        this.ditherLevels = 4;          // color quantize levels

        // ═══════════════════════════════════════
        // GRADIENT MAP
        // ═══════════════════════════════════════
        this.gradientMapEnabled = false;
        this.gradientMapColorA = '#000033';
        this.gradientMapColorB = '#ffcc00';

        // ═══════════════════════════════════════
        // THERMAL / HEAT MAP
        // ═══════════════════════════════════════
        this.thermalEnabled = false;

        // ═══════════════════════════════════════
        // EDGE DETECTION
        // ═══════════════════════════════════════
        this.edgeDetectEnabled = false;
        this.edgeDetectThreshold = 30;  // 0–255
        this.edgeDetectColor = '#ffffff';
        this.edgeDetectBg = '#000000';

        // ═══════════════════════════════════════
        // GLITCH
        // ═══════════════════════════════════════
        this.glitchEnabled = false;
        this.glitchIntensity = 0.5;     // 0–1
        this.glitchSpeed = 10;          // changes/sec

        // ═══════════════════════════════════════
        // SCREEN SHAKE
        // ═══════════════════════════════════════
        this.shakeEnabled = false;
        this.shakeIntensity = 4;        // max px offset

        // ═══════════════════════════════════════
        // FADE
        // ═══════════════════════════════════════
        this.fadeEnabled = false;
        this.fadeColor = '#000000';
        this.fadeOpacity = 0.0;         // 0–1

        // ═══════════════════════════════════════
        // INTERNALS
        // ═══════════════════════════════════════
        // Canvas2D for initial CSS filter capture (browser GPU-accelerated)
        this._captureCanvas = null;
        this._captureCtx = null;
        // GPUSurface for pixel manipulation (WebGL2 accelerated)
        this._srcSurface = null;
        this._dstSurface = null;
        this._bloomSurface = null;
        this._lastW = 0;
        this._lastH = 0;
        this._glitchTimer = 0;
        this._glitchSlices = [];
        this._engine = null;
        this._prevBeforeRenderCallback = null;
        this._prevRenderCallback = null;
        this._boundBeforeGUI = null;
        this._boundAfterGUI = null;
        this._useGPUSurface = typeof GPUSurface !== 'undefined';
        // Check if GPU shader effects are available
        this._gpuShadersAvailable = false;
        this._noiseTime = 0;
        this._glitchTime = 0;
    }

    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering';
    static is2D = true;
    static priority = 950;  // Draw after most things including lights

    static getIcon() { return '✨'; }
    static getDescription() {
        return 'GPU-accelerated post-processing effects using WebGL2 shaders for maximum performance. Effects run entirely on GPU when available.';
    }

    // ==================== PROPERTY EDITOR ====================

    getPropertyMetadata() {
        // Dynamic hint based on GPU shader availability  
        const gpuAvailable = this._gpuShadersAvailable && !this.forceGPUFallback;
        const gpuStatus = this.forceGPUFallback 
            ? '🟠 GPU Shaders: DISABLED (forced CPU fallback)'
            : (this._gpuShadersAvailable 
                ? '🟢 GPU Shaders: ACTIVE - Effects run on GPU (fast)'
                : '🟡 GPU Shaders: Unavailable - Using CPU processing');
        
        return [
            // ── Global ──
            { type: 'groupStart', label: '⚙️ Global Settings' },
                { type: 'hint', hint: gpuStatus },
                { type: 'hint', hint: 'Resolution scale controls the size of the internal buffer. Lower = faster but blurrier. Smoothing controls upscale interpolation.' },
                { key: 'resolutionScale', type: 'slider', label: '📐 Resolution Scale', default: 0.5, min: 0.1, max: 1, step: 0.05,
                  hint: '0.1 = very fast/blurry, 1.0 = full res/slow' },
                { key: 'smoothingEnabled', type: 'boolean', label: '🔳 Smoothing', default: false,
                  hint: 'Enable bilinear filtering when upscaling the buffer' },
                { key: 'renderMode', type: 'select', label: '🎯 Render Mode', default: 'beforeGUI',
                  options: ['beforeGUI', 'afterGUI'],
                  hint: 'beforeGUI: effects on game world only, GUI draws clean on top (faster). afterGUI: effects include GUI elements (slower, works at display resolution).' },
                { key: 'forceGPUFallback', type: 'boolean', label: '🐢 Force CPU Mode', default: false,
                  hint: 'Disable GPU shaders and use CPU processing (slower, for debugging/comparison)' },
            { type: 'groupEnd' },

            // ── Color Grading ──
            { type: 'groupStart', label: '🎨 Color Grading' },
                { key: 'brightnessEnabled', type: 'boolean', label: '☀️ Enable Brightness', default: false },
                { key: 'brightness', type: 'slider', label: 'Amount', default: 0, min: -100, max: 100, step: 1,
                  showIf: { brightnessEnabled: true } },
                { key: 'contrastEnabled', type: 'boolean', label: '🔲 Enable Contrast', default: false },
                { key: 'contrast', type: 'slider', label: 'Amount', default: 0, min: -100, max: 100, step: 1,
                  showIf: { contrastEnabled: true } },
                { key: 'saturationEnabled', type: 'boolean', label: '🌈 Enable Saturation', default: false },
                { key: 'saturation', type: 'slider', label: 'Amount', default: 0, min: -100, max: 100, step: 1,
                  showIf: { saturationEnabled: true } },
            { type: 'groupEnd' },

            // ── Grayscale ──
            { type: 'groupStart', label: '⬜ Grayscale' },
                { key: 'grayscaleEnabled', type: 'boolean', label: '⬜ Enable', default: false },
                { key: 'grayscaleAmount', type: 'slider', label: 'Amount', default: 1, min: 0, max: 1, step: 0.05,
                  showIf: { grayscaleEnabled: true } },
            { type: 'groupEnd' },

            // ── Sepia ──
            { type: 'groupStart', label: '📜 Sepia' },
                { key: 'sepiaEnabled', type: 'boolean', label: '📜 Enable', default: false },
                { key: 'sepiaAmount', type: 'slider', label: 'Amount', default: 1, min: 0, max: 1, step: 0.05,
                  showIf: { sepiaEnabled: true } },
            { type: 'groupEnd' },

            // ── Invert ──
            { type: 'groupStart', label: '🔄 Invert Colors' },
                { key: 'invertEnabled', type: 'boolean', label: '🔄 Enable', default: false },
                { key: 'invertAmount', type: 'slider', label: 'Amount', default: 1, min: 0, max: 1, step: 0.05,
                  showIf: { invertEnabled: true } },
            { type: 'groupEnd' },

            // ── Color Tint ──
            { type: 'groupStart', label: '🎭 Color Tint' },
                { key: 'tintEnabled', type: 'boolean', label: '🎭 Enable', default: false },
                { key: 'tintColor', type: 'color', label: 'Color', default: '#ff0000',
                  showIf: { tintEnabled: true } },
                { key: 'tintOpacity', type: 'slider', label: 'Opacity', default: 0.2, min: 0, max: 1, step: 0.05,
                  showIf: { tintEnabled: true } },
                { key: 'tintBlendMode', type: 'select', label: 'Blend Mode', default: 'multiply',
                  options: ['source-over', 'multiply', 'screen', 'overlay', 'color', 'hue', 'saturation', 'luminosity', 'hard-light', 'soft-light', 'color-dodge', 'color-burn'],
                  showIf: { tintEnabled: true } },
            { type: 'groupEnd' },

            // ── Vignette ──
            { type: 'groupStart', label: '🔘 Vignette' },
                { key: 'vignetteEnabled', type: 'boolean', label: '🔘 Enable', default: false },
                { key: 'vignetteIntensity', type: 'slider', label: 'Intensity', default: 0.5, min: 0, max: 1, step: 0.05,
                  showIf: { vignetteEnabled: true } },
                { key: 'vignetteRadius', type: 'slider', label: 'Inner Radius', default: 0.7, min: 0, max: 1, step: 0.05,
                  hint: 'Percentage of screen where vignette starts',
                  showIf: { vignetteEnabled: true } },
                { key: 'vignetteColor', type: 'color', label: 'Color', default: '#000000',
                  showIf: { vignetteEnabled: true } },
            { type: 'groupEnd' },

            // ── Chromatic Aberration ──
            { type: 'groupStart', label: '🌈 Chromatic Aberration' },
                { key: 'chromaticEnabled', type: 'boolean', label: '🌈 Enable', default: false },
                { key: 'chromaticAmount', type: 'slider', label: 'Offset (px)', default: 3, min: 1, max: 20, step: 1,
                  showIf: { chromaticEnabled: true } },
            { type: 'groupEnd' },

            // ── Scanlines ──
            { type: 'groupStart', label: '📺 Scanlines' },
                { key: 'scanlinesEnabled', type: 'boolean', label: '📺 Enable', default: false },
                { key: 'scanlineSpacing', type: 'slider', label: 'Spacing', default: 3, min: 1, max: 10, step: 1,
                  showIf: { scanlinesEnabled: true } },
                { key: 'scanlineOpacity', type: 'slider', label: 'Opacity', default: 0.3, min: 0, max: 1, step: 0.05,
                  showIf: { scanlinesEnabled: true } },
                { key: 'scanlineColor', type: 'color', label: 'Color', default: '#000000',
                  showIf: { scanlinesEnabled: true } },
            { type: 'groupEnd' },

            // ── CRT Curvature ──
            { type: 'groupStart', label: '📟 CRT Curvature' },
                { key: 'crtEnabled', type: 'boolean', label: '📟 Enable', default: false },
                { key: 'crtAmount', type: 'slider', label: 'Curvature', default: 0.03, min: 0, max: 0.1, step: 0.005,
                  hint: 'Barrel distortion strength',
                  showIf: { crtEnabled: true } },
            { type: 'groupEnd' },

            // ── Pixelate ──
            { type: 'groupStart', label: '🔲 Pixelate' },
                { key: 'pixelateEnabled', type: 'boolean', label: '🔲 Enable', default: false },
                { key: 'pixelateSize', type: 'slider', label: 'Block Size', default: 4, min: 2, max: 32, step: 1,
                  showIf: { pixelateEnabled: true } },
            { type: 'groupEnd' },

            // ── Noise / Film Grain ──
            { type: 'groupStart', label: '📻 Noise / Film Grain' },
                { key: 'noiseEnabled', type: 'boolean', label: '📻 Enable', default: false },
                { key: 'noiseAmount', type: 'slider', label: 'Amount', default: 0.15, min: 0, max: 1, step: 0.01,
                  showIf: { noiseEnabled: true } },
                { key: 'noiseMonochrome', type: 'boolean', label: 'Monochrome', default: true,
                  showIf: { noiseEnabled: true } },
            { type: 'groupEnd' },

            // ── Blur ──
            { type: 'groupStart', label: '🌫️ Blur' },
                { key: 'blurEnabled', type: 'boolean', label: '🌫️ Enable', default: false },
                { key: 'blurAmount', type: 'slider', label: 'Radius (px)', default: 2, min: 1, max: 10, step: 1,
                  hint: 'Blur radius in buffer pixels. GPU-accelerated.',
                  showIf: { blurEnabled: true } },
            { type: 'groupEnd' },

            // ── Bloom ──
            { type: 'groupStart', label: '💡 Bloom' },
                { key: 'bloomEnabled', type: 'boolean', label: '💡 Enable', default: false },
                { key: 'bloomThreshold', type: 'slider', label: 'Threshold', default: 200, min: 0, max: 255, step: 1,
                  hint: 'Pixels brighter than this glow',
                  showIf: { bloomEnabled: true } },
                { key: 'bloomIntensity', type: 'slider', label: 'Intensity', default: 0.6, min: 0, max: 1, step: 0.05,
                  showIf: { bloomEnabled: true } },
                { key: 'bloomRadius', type: 'slider', label: 'Radius (passes)', default: 4, min: 1, max: 8, step: 1,
                  showIf: { bloomEnabled: true } },
            { type: 'groupEnd' },

            // ── Posterize ──
            { type: 'groupStart', label: '🎨 Posterize' },
                { key: 'posterizeEnabled', type: 'boolean', label: '🎨 Enable', default: false },
                { key: 'posterizeLevels', type: 'slider', label: 'Levels', default: 4, min: 2, max: 32, step: 1,
                  showIf: { posterizeEnabled: true } },
            { type: 'groupEnd' },

            // ── Channel Shift ──
            { type: 'groupStart', label: '📊 Channel Shift' },
                { key: 'channelShiftEnabled', type: 'boolean', label: '📊 Enable', default: false },
                { key: 'channelShiftX', type: 'slider', label: 'X Offset', default: 3, min: -20, max: 20, step: 1,
                  showIf: { channelShiftEnabled: true } },
                { key: 'channelShiftY', type: 'slider', label: 'Y Offset', default: 0, min: -20, max: 20, step: 1,
                  showIf: { channelShiftEnabled: true } },
            { type: 'groupEnd' },

            // ── Sharpen ──
            { type: 'groupStart', label: '🔪 Sharpen' },
                { key: 'sharpenEnabled', type: 'boolean', label: '🔪 Enable', default: false },
                { key: 'sharpenAmount', type: 'slider', label: 'Amount', default: 0.5, min: 0, max: 2, step: 0.1,
                  showIf: { sharpenEnabled: true } },
            { type: 'groupEnd' },

            // ── Dither ──
            { type: 'groupStart', label: '🔳 Dither' },
                { key: 'ditherEnabled', type: 'boolean', label: '🔳 Enable', default: false },
                { key: 'ditherLevels', type: 'slider', label: 'Color Levels', default: 4, min: 2, max: 16, step: 1,
                  showIf: { ditherEnabled: true } },
            { type: 'groupEnd' },

            // ── Gradient Map ──
            { type: 'groupStart', label: '🌗 Gradient Map' },
                { key: 'gradientMapEnabled', type: 'boolean', label: '🌗 Enable', default: false },
                { key: 'gradientMapColorA', type: 'color', label: 'Shadow Color', default: '#000033',
                  showIf: { gradientMapEnabled: true } },
                { key: 'gradientMapColorB', type: 'color', label: 'Highlight Color', default: '#ffcc00',
                  showIf: { gradientMapEnabled: true } },
            { type: 'groupEnd' },

            // ── Thermal ──
            { type: 'groupStart', label: '🌡️ Thermal / Heat Map' },
                { key: 'thermalEnabled', type: 'boolean', label: '🌡️ Enable', default: false },
            { type: 'groupEnd' },

            // ── Edge Detection ──
            { type: 'groupStart', label: '✏️ Edge Detection' },
                { key: 'edgeDetectEnabled', type: 'boolean', label: '✏️ Enable', default: false },
                { key: 'edgeDetectThreshold', type: 'slider', label: 'Threshold', default: 30, min: 0, max: 255, step: 1,
                  showIf: { edgeDetectEnabled: true } },
                { key: 'edgeDetectColor', type: 'color', label: 'Edge Color', default: '#ffffff',
                  showIf: { edgeDetectEnabled: true } },
                { key: 'edgeDetectBg', type: 'color', label: 'BG Color', default: '#000000',
                  showIf: { edgeDetectEnabled: true } },
            { type: 'groupEnd' },

            // ── Glitch ──
            { type: 'groupStart', label: '📡 Glitch' },
                { key: 'glitchEnabled', type: 'boolean', label: '📡 Enable', default: false },
                { key: 'glitchIntensity', type: 'slider', label: 'Intensity', default: 0.5, min: 0, max: 1, step: 0.05,
                  showIf: { glitchEnabled: true } },
                { key: 'glitchSpeed', type: 'slider', label: 'Speed', default: 10, min: 1, max: 60, step: 1,
                  hint: 'Glitch changes per second',
                  showIf: { glitchEnabled: true } },
            { type: 'groupEnd' },

            // ── Screen Shake ──
            { type: 'groupStart', label: '📳 Screen Shake' },
                { key: 'shakeEnabled', type: 'boolean', label: '📳 Enable', default: false },
                { key: 'shakeIntensity', type: 'slider', label: 'Intensity (px)', default: 4, min: 1, max: 30, step: 1,
                  showIf: { shakeEnabled: true } },
            { type: 'groupEnd' },

            // ── Fade ──
            { type: 'groupStart', label: '⬛ Fade' },
                { key: 'fadeEnabled', type: 'boolean', label: '⬛ Enable', default: false },
                { key: 'fadeColor', type: 'color', label: 'Color', default: '#000000',
                  showIf: { fadeEnabled: true } },
                { key: 'fadeOpacity', type: 'slider', label: 'Opacity', default: 0.0, min: 0, max: 1, step: 0.05,
                  showIf: { fadeEnabled: true } },
            { type: 'groupEnd' },
        ];
    }

    // ==================== LIFECYCLE ====================

    start() {
        const engine = getEngine();
        if (!engine) return;

        this._engine = engine;
        this._ensureBuffers();

        // Hook onBeforeRenderCallback — fires AFTER game objects draw to offscreen
        // but BEFORE the engine copies to display. Used for 'beforeGUI' mode.
        this._prevBeforeRenderCallback = engine.onBeforeRenderCallback;
        this._boundBeforeGUI = (renderCtx) => {
            if (this._prevBeforeRenderCallback) this._prevBeforeRenderCallback(renderCtx);
            if (this.renderMode === 'beforeGUI') this._processFrame(renderCtx);
        };
        engine.onBeforeRenderCallback = this._boundBeforeGUI;

        // Hook onRenderCallback — fires AFTER _drawGUIPhase completes.
        // Used for 'afterGUI' mode so effects include GUI elements.
        this._prevRenderCallback = engine.onRenderCallback;
        this._boundAfterGUI = (ctx) => {
            if (this._prevRenderCallback) this._prevRenderCallback(ctx);
            if (this.renderMode === 'afterGUI') this._processFrame(ctx);
        };
        engine.onRenderCallback = this._boundAfterGUI;
    }

    loop(deltaTime) {
        // Update glitch timer
        if (this.glitchEnabled) {
            this._glitchTimer += deltaTime;
            const interval = 1 / Math.max(1, this.glitchSpeed);
            if (this._glitchTimer >= interval) {
                this._glitchTimer -= interval;
                this._generateGlitchSlices();
            }
        }
    }

    /**
     * Main processing — called via engine callbacks.
     * beforeGUI mode: renderCtx is the offscreen canvas (render resolution).
     * afterGUI mode: renderCtx is the display canvas (screen resolution).
     */
    _processFrame(renderCtx) {
        if (!this.enabled || this.gameObject.isEditing) return;
        if (!this._anyEffectActive()) return;

        // When using GPURenderer, we need to get the surface canvas (where rendering happens)
        // not the target canvas (which only gets updated in endFrame)
        let targetCanvas;
        const isGPURenderer = renderCtx.surface && renderCtx.surface.canvas;
        if (isGPURenderer) {
            // Flush pending draws so surface.canvas has all the content
            renderCtx.surface.flush();
            targetCanvas = renderCtx.surface.canvas;
        } else {
            targetCanvas = renderCtx.canvas;
        }
        
        const srcW = targetCanvas.width;
        const srcH = targetCanvas.height;
        if (srcW <= 0 || srcH <= 0) return;

        renderCtx.save();
        renderCtx.setTransform(1, 0, 0, 1, 0, 0);

        // Fast path: overlay-only effects (no buffer processing needed)
        if (!this._needsBufferProcessing()) {
            if (this.tintEnabled && this.tintOpacity > 0) {
                renderCtx.globalAlpha = this.tintOpacity;
                renderCtx.globalCompositeOperation = this.tintBlendMode;
                renderCtx.fillStyle = this.tintColor;
                renderCtx.fillRect(0, 0, srcW, srcH);
                renderCtx.globalCompositeOperation = 'source-over';
                renderCtx.globalAlpha = 1;
            }
            if (this.scanlinesEnabled) this._drawScanlines(renderCtx, srcW, srcH);
            if (this.vignetteEnabled) this._drawVignette(renderCtx, srcW, srcH);
            if (this.fadeEnabled && this.fadeOpacity > 0) {
                renderCtx.globalAlpha = this.fadeOpacity;
                renderCtx.fillStyle = this.fadeColor;
                renderCtx.fillRect(0, 0, srcW, srcH);
                renderCtx.globalAlpha = 1;
            }
            renderCtx.restore();
            return;
        }

        // Compute effect buffer size
        const scale = Math.max(0.05, Math.min(1, this.resolutionScale));
        const bufW = Math.max(1, Math.floor(srcW * scale));
        const bufH = Math.max(1, Math.floor(srcH * scale));

        // Recreate buffers if size changed
        if (bufW !== this._lastW || bufH !== this._lastH) {
            this._lastW = bufW;
            this._lastH = bufH;
            this._createBuffers(bufW, bufH);
        }

        this._ensureBuffers();

        // ═══════════════════════════════════════════════════════════════════
        // GPU SHADER PATH - All effects run on GPU, minimal CPU-GPU transfers
        // ═══════════════════════════════════════════════════════════════════
        if (this._gpuShadersAvailable && !this.forceGPUFallback) {
            this._processFrameGPU(renderCtx, targetCanvas, srcW, srcH, bufW, bufH, scale);
            renderCtx.restore();
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // CPU FALLBACK PATH - Original getImageData/putImageData approach
        // ═══════════════════════════════════════════════════════════════════
        
        // ── Step 1: Capture with GPU-accelerated CSS filters ──
        const filterStr = this._buildCSSFilterString();
        this._captureCtx.filter = filterStr;
        this._captureCtx.imageSmoothingEnabled = this.smoothingEnabled;
        this._captureCtx.clearRect(0, 0, bufW, bufH);
        this._captureCtx.drawImage(targetCanvas, 0, 0, srcW, srcH, 0, 0, bufW, bufH);
        this._captureCtx.filter = 'none';
        
        // Copy capture to src surface for further processing
        if (this._useGPUSurface) {
            const captureData = this._captureCtx.getImageData(0, 0, bufW, bufH);
            this._srcSurface.clear();
            this._srcSurface.putImageData(captureData, 0, 0);
        }

        // ── Step 2: Pixel effects that can't use CSS filters ──
        const needsPixelPass = this._needsPixelManipulation();

        if (needsPixelPass) {
            if (this._useGPUSurface) {
                this._srcSurface.flush();
                const imageData = this._srcSurface.getImageData(0, 0, bufW, bufH);
                const data = imageData.data;

                if (this.posterizeEnabled) this._applyPosterize(data, this.posterizeLevels);
                if (this.thermalEnabled) this._applyThermal(data);
                if (this.gradientMapEnabled) this._applyGradientMap(data, this.gradientMapColorA, this.gradientMapColorB);
                if (this.noiseEnabled) this._applyNoise(data, this.noiseAmount, this.noiseMonochrome);

                this._srcSurface.clear();
                this._srcSurface.putImageData(imageData, 0, 0);
            } else {
                const srcCtx = this._getSurfaceCtx(this._srcSurface);
                const imageData = srcCtx.getImageData(0, 0, bufW, bufH);
                const data = imageData.data;

                if (this.posterizeEnabled) this._applyPosterize(data, this.posterizeLevels);
                if (this.thermalEnabled) this._applyThermal(data);
                if (this.gradientMapEnabled) this._applyGradientMap(data, this.gradientMapColorA, this.gradientMapColorB);
                if (this.noiseEnabled) this._applyNoise(data, this.noiseAmount, this.noiseMonochrome);

                srcCtx.putImageData(imageData, 0, 0);
            }
        }

        // ── Step 3: Spatial / kernel effects ──
        const srcSurface = this._srcSurface;
        const dstSurface = this._dstSurface;
        
        if (this._useGPUSurface) {
            srcSurface.flush();
        }

        if (this.chromaticEnabled) {
            this._applyChromaticAberration(srcSurface, bufW, bufH, this.chromaticAmount * scale);
        }
        if (this.channelShiftEnabled) {
            this._applyChannelShift(srcSurface, bufW, bufH,
                Math.round(this.channelShiftX * scale),
                Math.round(this.channelShiftY * scale));
        }
        if (this.sharpenEnabled) {
            this._applySharpen(srcSurface, bufW, bufH, this.sharpenAmount);
        }
        if (this.edgeDetectEnabled) {
            this._applyEdgeDetection(srcSurface, bufW, bufH,
                this.edgeDetectThreshold, this.edgeDetectColor, this.edgeDetectBg);
        }
        if (this.ditherEnabled) {
            this._applyDither(srcSurface, bufW, bufH, this.ditherLevels);
        }
        if (this.pixelateEnabled) {
            this._applyPixelate(srcSurface, bufW, bufH, Math.max(2, Math.round(this.pixelateSize * scale)));
        }
        if (this.crtEnabled) {
            this._applyCRT(srcSurface, dstSurface, bufW, bufH, this.crtAmount);
        }
        if (this.bloomEnabled) {
            this._applyBloom(srcSurface, bufW, bufH);
        }
        if (this.glitchEnabled && this._glitchSlices.length > 0) {
            this._applyGlitch(srcSurface, dstSurface, bufW, bufH);
        }

        // ── Step 4: Write processed buffer back onto the offscreen canvas ──
        this._finalizeFrame(renderCtx, srcSurface, srcW, srcH, bufW, bufH);
        renderCtx.restore();
    }
    
    /**
     * GPU Shader processing path - maximum performance
     * All effects run on GPU with minimal CPU involvement
     */
    _processFrameGPU(renderCtx, targetCanvas, srcW, srcH, bufW, bufH, scale) {
        if (this.gameObject.isEditing) return; // Don't render lighting overlay in editor mode
        
        const srcSurface = this._srcSurface;
        
        // ── Step 1: Copy target canvas to GPU surface ──
        // This is the ONLY getImageData in the GPU path
        this._captureCtx.imageSmoothingEnabled = this.smoothingEnabled;
        this._captureCtx.clearRect(0, 0, bufW, bufH);
        this._captureCtx.drawImage(targetCanvas, 0, 0, srcW, srcH, 0, 0, bufW, bufH);
        const captureData = this._captureCtx.getImageData(0, 0, bufW, bufH);
        srcSurface.clear();
        srcSurface.putImageData(captureData, 0, 0);
        
        // ── Step 2: Apply color grading effects via GPU shader ──
        const hasColorGrade = this.brightnessEnabled || this.contrastEnabled || 
                             this.saturationEnabled || this.grayscaleEnabled || 
                             this.sepiaEnabled || this.invertEnabled;
        if (hasColorGrade) {
            srcSurface.applyColorGrade({
                brightness: this.brightnessEnabled ? this.brightness / 100 : 0,
                contrast: this.contrastEnabled ? 1 + this.contrast / 100 : 1,
                saturation: this.saturationEnabled ? 1 + this.saturation / 100 : 1,
                grayscale: this.grayscaleEnabled ? this.grayscaleAmount : 0,
                sepia: this.sepiaEnabled ? this.sepiaAmount : 0,
                invert: this.invertEnabled ? this.invertAmount : 0
            });
        }
        
        // ── Step 3: Apply pixel effects via GPU shaders ──
        if (this.posterizeEnabled) {
            srcSurface.applyPosterize(this.posterizeLevels);
        }
        if (this.thermalEnabled) {
            srcSurface.applyThermal();
        }
        if (this.gradientMapEnabled) {
            const colorA = this._hexToRGB(this.gradientMapColorA);
            const colorB = this._hexToRGB(this.gradientMapColorB);
            srcSurface.applyGradientMap(
                [colorA.r / 255, colorA.g / 255, colorA.b / 255],
                [colorB.r / 255, colorB.g / 255, colorB.b / 255]
            );
        }
        if (this.noiseEnabled) {
            this._noiseTime += 0.1;
            srcSurface.applyNoise(this.noiseAmount, this.noiseMonochrome, this._noiseTime);
        }
        
        // ── Step 4: Apply spatial effects via GPU shaders ──
        if (this.blurEnabled && this.blurAmount > 0) {
            srcSurface.applyBlur(this.blurAmount);
        }
        if (this.chromaticEnabled) {
            srcSurface.applyChromatic(this.chromaticAmount * scale);
        }
        if (this.channelShiftEnabled) {
            srcSurface.applyChannelShift(
                this.channelShiftX * scale,
                this.channelShiftY * scale
            );
        }
        if (this.sharpenEnabled) {
            srcSurface.applySharpen(this.sharpenAmount);
        }
        if (this.edgeDetectEnabled) {
            const ec = this._hexToRGB(this.edgeDetectColor);
            const bc = this._hexToRGB(this.edgeDetectBg);
            srcSurface.applyEdgeDetect(
                this.edgeDetectThreshold,
                [ec.r / 255, ec.g / 255, ec.b / 255],
                [bc.r / 255, bc.g / 255, bc.b / 255]
            );
        }
        if (this.ditherEnabled) {
            srcSurface.applyDither(this.ditherLevels);
        }
        if (this.pixelateEnabled) {
            srcSurface.applyPixelate(Math.max(2, this.pixelateSize * scale));
        }
        if (this.crtEnabled) {
            srcSurface.applyCRT(this.crtAmount);
        }
        if (this.bloomEnabled) {
            srcSurface.applyBloom(this.bloomThreshold, this.bloomIntensity, this.bloomRadius);
        }
        if (this.glitchEnabled) {
            this._glitchTime += 0.1;
            srcSurface.applyGlitch(this.glitchIntensity, this._glitchTime);
        }
        
        // ── Step 5: Finalize and draw to render context ──
        this._finalizeFrame(renderCtx, srcSurface, srcW, srcH, bufW, bufH);
    }
    
    /**
     * Finalize frame - draw processed buffer and overlay effects
     */
    _finalizeFrame(renderCtx, srcSurface, srcW, srcH, bufW, bufH) {
        if (this.gameObject.isEditing) return; // Don't render lighting overlay in editor mode
        
        renderCtx.imageSmoothingEnabled = this.smoothingEnabled;

        // Shake: offset the draw position for jitter effect
        let shakeX = 0, shakeY = 0;
        if (this.shakeEnabled) {
            shakeX = ((Math.random() - 0.5) * 2 * this.shakeIntensity) | 0;
            shakeY = ((Math.random() - 0.5) * 2 * this.shakeIntensity) | 0;
        }

        renderCtx.clearRect(0, 0, srcW, srcH);
        
        // Draw the processed buffer to the render context
        if (this._useGPUSurface) {
            gpuSurfaceDraw(renderCtx, srcSurface, shakeX, shakeY, srcW, srcH);
        } else {
            renderCtx.drawImage(this._getSurfaceCanvas(srcSurface), 0, 0, bufW, bufH,
                shakeX, shakeY, srcW, srcH);
        }

        // ── Overlay effects directly on the offscreen (render resolution) ──

        if (this.tintEnabled && this.tintOpacity > 0) {
            renderCtx.globalAlpha = this.tintOpacity;
            renderCtx.globalCompositeOperation = this.tintBlendMode;
            renderCtx.fillStyle = this.tintColor;
            renderCtx.fillRect(0, 0, srcW, srcH);
            renderCtx.globalCompositeOperation = 'source-over';
            renderCtx.globalAlpha = 1;
        }

        if (this.scanlinesEnabled) {
            this._drawScanlines(renderCtx, srcW, srcH);
        }

        if (this.vignetteEnabled) {
            this._drawVignette(renderCtx, srcW, srcH);
        }

        if (this.fadeEnabled && this.fadeOpacity > 0) {
            renderCtx.globalAlpha = this.fadeOpacity;
            renderCtx.fillStyle = this.fadeColor;
            renderCtx.fillRect(0, 0, srcW, srcH);
            renderCtx.globalAlpha = 1;
        }
    }

    // ==================== BUFFER MANAGEMENT ====================

    _ensureBuffers() {
        if (!this._captureCanvas) {
            const scale = Math.max(0.05, Math.min(1, this.resolutionScale));
            this._createBuffers(
                Math.max(1, Math.floor(320 * scale)),
                Math.max(1, Math.floor(240 * scale))
            );
        }
    }

    _createBuffers(w, h) {
        // Free existing GPU surfaces
        this._freeBuffers();
        
        // Canvas2D for CSS filter capture (browser's GPU acceleration)
        this._captureCanvas = document.createElement('canvas');
        this._captureCanvas.width = w;
        this._captureCanvas.height = h;
        this._captureCtx = this._captureCanvas.getContext('2d', { willReadFrequently: !this._useGPUSurface });
        
        if (this._useGPUSurface) {
            // GPUSurface for pixel manipulation (WebGL2)
            this._srcSurface = gpuSurfaceCreate(w, h);
            this._dstSurface = gpuSurfaceCreate(w, h);
            this._bloomSurface = gpuSurfaceCreate(w, h);
            
            // Check if GPU shader effects are available
            this._gpuShadersAvailable = this._srcSurface && this._srcSurface.hasGPUEffects && this._srcSurface.hasGPUEffects();
        } else {
            // Fallback to Canvas2D if GPUSurface not available
            this._srcSurface = document.createElement('canvas');
            this._srcSurface.width = w;
            this._srcSurface.height = h;
            this._srcSurface._ctx = this._srcSurface.getContext('2d', { willReadFrequently: true });
            
            this._dstSurface = document.createElement('canvas');
            this._dstSurface.width = w;
            this._dstSurface.height = h;
            this._dstSurface._ctx = this._dstSurface.getContext('2d');
            
            this._bloomSurface = document.createElement('canvas');
            this._bloomSurface.width = w;
            this._bloomSurface.height = h;
            this._bloomSurface._ctx = this._bloomSurface.getContext('2d');
            
            this._gpuShadersAvailable = false;
        }
    }
    
    _freeBuffers() {
        if (this._useGPUSurface) {
            if (this._srcSurface) gpuSurfaceFree(this._srcSurface);
            if (this._dstSurface) gpuSurfaceFree(this._dstSurface);
            if (this._bloomSurface) gpuSurfaceFree(this._bloomSurface);
        }
        this._srcSurface = null;
        this._dstSurface = null;
        this._bloomSurface = null;
        this._captureCanvas = null;
        this._captureCtx = null;
        
        // Release bloom temp canvas
        if (this._bloomTmpCanvas) {
            this._bloomTmpCanvas.width = 0;
            this._bloomTmpCanvas.height = 0;
            this._bloomTmpCanvas = null;
        }
    }
    
    _getSurfaceCtx(surface) {
        // Helper to get context from either GPUSurface or canvas
        if (this._useGPUSurface) {
            return surface.ctx || surface._captureCtx;
        }
        return surface._ctx || surface.getContext('2d');
    }
    
    _getSurfaceCanvas(surface) {
        // Helper to get the underlying canvas
        if (this._useGPUSurface && surface.canvas) {
            surface.flush();
            return surface.canvas;
        }
        return surface;
    }

    // ==================== HELPERS ====================

    _anyEffectActive() {
        return this.brightnessEnabled || this.contrastEnabled || this.saturationEnabled ||
               this.grayscaleEnabled || this.sepiaEnabled || this.invertEnabled ||
               this.tintEnabled || this.vignetteEnabled || this.chromaticEnabled ||
               this.scanlinesEnabled || this.crtEnabled || this.pixelateEnabled ||
               this.noiseEnabled || this.blurEnabled || this.bloomEnabled ||
               this.posterizeEnabled || this.channelShiftEnabled || this.sharpenEnabled ||
               this.ditherEnabled || this.gradientMapEnabled || this.thermalEnabled ||
               this.edgeDetectEnabled || this.glitchEnabled || this.shakeEnabled ||
               (this.fadeEnabled && this.fadeOpacity > 0);
    }

    _needsPixelManipulation() {
        // Only exotic effects that can't be done via CSS ctx.filter
        return this.posterizeEnabled || this.thermalEnabled ||
               this.gradientMapEnabled || this.noiseEnabled;
    }

    _needsBufferProcessing() {
        // Returns true if any effect needs the off-screen buffer pipeline
        return this.brightnessEnabled || this.contrastEnabled || this.saturationEnabled ||
               this.grayscaleEnabled || this.sepiaEnabled || this.invertEnabled ||
               this.chromaticEnabled || this.crtEnabled || this.pixelateEnabled ||
               this.noiseEnabled || this.blurEnabled || this.bloomEnabled ||
               this.posterizeEnabled || this.channelShiftEnabled || this.sharpenEnabled ||
               this.ditherEnabled || this.gradientMapEnabled || this.thermalEnabled ||
               this.edgeDetectEnabled || this.glitchEnabled || this.shakeEnabled;
    }

    _buildCSSFilterString() {
        // GPU-accelerated CSS filter effects applied during capture drawImage.
        // These replace manual per-pixel loops for massive performance gain.
        const parts = [];
        if (this.brightnessEnabled && this.brightness !== 0) {
            parts.push(`brightness(${1 + this.brightness / 100})`);
        }
        if (this.contrastEnabled && this.contrast !== 0) {
            parts.push(`contrast(${1 + this.contrast / 100})`);
        }
        if (this.saturationEnabled && this.saturation !== 0) {
            parts.push(`saturate(${1 + this.saturation / 100})`);
        }
        if (this.grayscaleEnabled) {
            parts.push(`grayscale(${this.grayscaleAmount})`);
        }
        if (this.sepiaEnabled) {
            parts.push(`sepia(${this.sepiaAmount})`);
        }
        if (this.invertEnabled) {
            parts.push(`invert(${this.invertAmount})`);
        }
        if (this.blurEnabled) {
            parts.push(`blur(${this.blurAmount}px)`);
        }
        return parts.length > 0 ? parts.join(' ') : 'none';
    }

    // ==================== PIXEL-LEVEL EFFECTS ====================

    _applyBrightness(data, amount) {
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            data[i]     = Math.min(255, Math.max(0, data[i]     + amount));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount));
        }
    }

    _applyContrast(data, amount) {
        const factor = (259 * (amount + 255)) / (255 * (259 - amount));
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            data[i]     = Math.min(255, Math.max(0, factor * (data[i]     - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }
    }

    _applySaturation(data, amount) {
        const s = 1 + amount / 100;
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            data[i]     = Math.min(255, Math.max(0, gray + s * (r - gray)));
            data[i + 1] = Math.min(255, Math.max(0, gray + s * (g - gray)));
            data[i + 2] = Math.min(255, Math.max(0, gray + s * (b - gray)));
        }
    }

    _applyGrayscale(data, amount) {
        const len = data.length;
        const a = amount;
        const ia = 1 - a;
        for (let i = 0; i < len; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            data[i]     = r * ia + gray * a;
            data[i + 1] = g * ia + gray * a;
            data[i + 2] = b * ia + gray * a;
        }
    }

    _applySepia(data, amount) {
        const len = data.length;
        const a = amount;
        const ia = 1 - a;
        for (let i = 0; i < len; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const sr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
            const sg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
            const sb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
            data[i]     = r * ia + sr * a;
            data[i + 1] = g * ia + sg * a;
            data[i + 2] = b * ia + sb * a;
        }
    }

    _applyInvert(data, amount) {
        const len = data.length;
        const a = amount;
        const ia = 1 - a;
        for (let i = 0; i < len; i += 4) {
            data[i]     = data[i]     * ia + (255 - data[i])     * a;
            data[i + 1] = data[i + 1] * ia + (255 - data[i + 1]) * a;
            data[i + 2] = data[i + 2] * ia + (255 - data[i + 2]) * a;
        }
    }

    _applyPosterize(data, levels) {
        const l = Math.max(2, levels);
        const step = 255 / (l - 1);
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            data[i]     = Math.round(Math.round(data[i]     / step) * step);
            data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
            data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
        }
    }

    _applyNoise(data, amount, mono) {
        const len = data.length;
        const strength = amount * 255;
        for (let i = 0; i < len; i += 4) {
            if (mono) {
                const n = (Math.random() - 0.5) * strength;
                data[i]     = Math.min(255, Math.max(0, data[i]     + n));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
            } else {
                data[i]     = Math.min(255, Math.max(0, data[i]     + (Math.random() - 0.5) * strength));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (Math.random() - 0.5) * strength));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (Math.random() - 0.5) * strength));
            }
        }
    }

    _applyThermal(data) {
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            const lum = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
            // Thermal palette: black → blue → magenta → red → yellow → white
            let r, g, b;
            if (lum < 0.2) {
                const t = lum / 0.2;
                r = 0; g = 0; b = Math.round(128 * t);
            } else if (lum < 0.4) {
                const t = (lum - 0.2) / 0.2;
                r = Math.round(128 * t); g = 0; b = Math.round(128 + 127 * (1 - t));
            } else if (lum < 0.6) {
                const t = (lum - 0.4) / 0.2;
                r = Math.round(128 + 127 * t); g = 0; b = Math.round(128 * (1 - t));
            } else if (lum < 0.8) {
                const t = (lum - 0.6) / 0.2;
                r = 255; g = Math.round(255 * t); b = 0;
            } else {
                const t = (lum - 0.8) / 0.2;
                r = 255; g = 255; b = Math.round(255 * t);
            }
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
        }
    }

    _applyGradientMap(data, colorA, colorB) {
        const a = this._hexToRGB(colorA);
        const b = this._hexToRGB(colorB);
        const len = data.length;
        for (let i = 0; i < len; i += 4) {
            const lum = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
            data[i]     = a.r + (b.r - a.r) * lum;
            data[i + 1] = a.g + (b.g - a.g) * lum;
            data[i + 2] = a.b + (b.b - a.b) * lum;
        }
    }

    // ==================== SPATIAL EFFECTS ====================
    
    // Helper to get ImageData from either GPUSurface or Canvas
    _getImageDataFromSurface(surface, w, h) {
        if (this._useGPUSurface && surface.getImageData) {
            surface.flush();
            return surface.getImageData(0, 0, w, h);
        }
        const ctx = surface._ctx || surface.getContext('2d');
        return ctx.getImageData(0, 0, w, h);
    }
    
    // Helper to put ImageData to either GPUSurface or Canvas
    _putImageDataToSurface(surface, imageData) {
        if (this._useGPUSurface && surface.putImageData) {
            surface.clear();
            surface.putImageData(imageData, 0, 0);
            return;
        }
        const ctx = surface._ctx || surface.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
    }

    _applyChromaticAberration(surface, w, h, amount) {
        const amt = Math.max(1, Math.round(amount));
        const imgData = this._getImageDataFromSurface(surface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                // Red channel shifted left
                const rxIdx = (y * w + Math.max(0, x - amt)) * 4;
                // Blue channel shifted right
                const bxIdx = (y * w + Math.min(w - 1, x + amt)) * 4;
                dst[idx]     = src[rxIdx];       // R from left
                dst[idx + 1] = src[idx + 1];     // G stays
                dst[idx + 2] = src[bxIdx + 2];   // B from right
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applyChannelShift(surface, w, h, shiftX, shiftY) {
        const imgData = this._getImageDataFromSurface(surface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                // Shift red channel
                const rx = Math.min(w - 1, Math.max(0, x + shiftX));
                const ry = Math.min(h - 1, Math.max(0, y + shiftY));
                const rIdx = (ry * w + rx) * 4;
                dst[idx] = src[rIdx]; // R shifted
                // Shift blue channel opposite
                const bx = Math.min(w - 1, Math.max(0, x - shiftX));
                const by = Math.min(h - 1, Math.max(0, y - shiftY));
                const bIdx = (by * w + bx) * 4;
                dst[idx + 2] = src[bIdx + 2]; // B shifted opposite
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applySharpen(surface, w, h, amount) {
        const imgData = this._getImageDataFromSurface(surface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;
        const a = amount;

        // Unsharp mask: original + amount * (original - blurred)
        // Using simple 3x3 average as blur approximation
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const center = src[idx + c];
                    // Average of 4 neighbors
                    const avg = (
                        src[((y - 1) * w + x) * 4 + c] +
                        src[((y + 1) * w + x) * 4 + c] +
                        src[(y * w + x - 1) * 4 + c] +
                        src[(y * w + x + 1) * 4 + c]
                    ) * 0.25;
                    dst[idx + c] = Math.min(255, Math.max(0, center + a * (center - avg)));
                }
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applyEdgeDetection(surface, w, h, threshold, edgeColor, bgColor) {
        const imgData = this._getImageDataFromSurface(surface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;
        const ec = this._hexToRGB(edgeColor);
        const bc = this._hexToRGB(bgColor);

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;

                // Sobel operator (luminance)
                const getLum = (px, py) => {
                    const i = (py * w + px) * 4;
                    return src[i] * 0.2126 + src[i + 1] * 0.7152 + src[i + 2] * 0.0722;
                };

                const gx = -getLum(x-1,y-1) - 2*getLum(x-1,y) - getLum(x-1,y+1)
                           + getLum(x+1,y-1) + 2*getLum(x+1,y) + getLum(x+1,y+1);
                const gy = -getLum(x-1,y-1) - 2*getLum(x,y-1) - getLum(x+1,y-1)
                           + getLum(x-1,y+1) + 2*getLum(x,y+1) + getLum(x+1,y+1);

                const mag = Math.sqrt(gx * gx + gy * gy);
                if (mag > threshold) {
                    dst[idx] = ec.r; dst[idx + 1] = ec.g; dst[idx + 2] = ec.b;
                } else {
                    dst[idx] = bc.r; dst[idx + 1] = bc.g; dst[idx + 2] = bc.b;
                }
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applyDither(surface, w, h, levels) {
        // Ordered Bayer 4×4 dithering
        const bayer = [
            [ 0,  8,  2, 10],
            [12,  4, 14,  6],
            [ 3, 11,  1,  9],
            [15,  7, 13,  5]
        ];
        const bayerN = 16; // 4×4
        const step = 255 / Math.max(1, levels - 1);

        const imgData = this._getImageDataFromSurface(surface, w, h);
        const data = imgData.data;

        for (let y = 0; y < h; y++) {
            const by = y & 3; // y % 4
            for (let x = 0; x < w; x++) {
                const bx = x & 3;
                const idx = (y * w + x) * 4;
                const thresh = (bayer[by][bx] / bayerN - 0.5) * step;
                for (let c = 0; c < 3; c++) {
                    const val = data[idx + c] + thresh;
                    data[idx + c] = Math.round(Math.round(val / step) * step);
                    if (data[idx + c] > 255) data[idx + c] = 255;
                    if (data[idx + c] < 0) data[idx + c] = 0;
                }
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applyPixelate(surface, w, h, blockSize) {
        const bs = Math.max(2, blockSize);
        const imgData = this._getImageDataFromSurface(surface, w, h);
        const data = imgData.data;

        for (let y = 0; y < h; y += bs) {
            for (let x = 0; x < w; x += bs) {
                // Average color in block
                let r = 0, g = 0, b = 0, count = 0;
                const maxY = Math.min(y + bs, h);
                const maxX = Math.min(x + bs, w);
                for (let by = y; by < maxY; by++) {
                    for (let bx = x; bx < maxX; bx++) {
                        const idx = (by * w + bx) * 4;
                        r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
                        count++;
                    }
                }
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                // Fill block with average
                for (let by = y; by < maxY; by++) {
                    for (let bx = x; bx < maxX; bx++) {
                        const idx = (by * w + bx) * 4;
                        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
                    }
                }
            }
        }
        this._putImageDataToSurface(surface, imgData);
    }

    _applyBlur(srcSurface, dstSurface, w, h, passes) {
        // Fast box blur via downscale/upscale with smoothing using CSS filter
        // This is handled by _buildCSSFilterString now, but keep for manual blur
        if (this._useGPUSurface) {
            // For GPUSurface, we use the capture canvas for CSS filter blur
            srcSurface.flush();
            const imgData = srcSurface.getImageData(0, 0, w, h);
            this._captureCtx.putImageData(imgData, 0, 0);
            this._captureCtx.filter = `blur(${passes}px)`;
            this._captureCtx.drawImage(this._captureCanvas, 0, 0);
            this._captureCtx.filter = 'none';
            const blurredData = this._captureCtx.getImageData(0, 0, w, h);
            srcSurface.clear();
            srcSurface.putImageData(blurredData, 0, 0);
        } else {
            const srcCtx = srcSurface._ctx;
            const dstCtx = dstSurface._ctx;
            for (let p = 0; p < passes; p++) {
                const halfW = Math.max(1, Math.floor(w / 2));
                const halfH = Math.max(1, Math.floor(h / 2));
                dstCtx.imageSmoothingEnabled = true;
                dstCtx.clearRect(0, 0, w, h);
                dstCtx.drawImage(srcSurface, 0, 0, w, h, 0, 0, halfW, halfH);
                srcCtx.imageSmoothingEnabled = true;
                srcCtx.clearRect(0, 0, w, h);
                srcCtx.drawImage(dstSurface, 0, 0, halfW, halfH, 0, 0, w, h);
            }
        }
    }

    _applyCRT(srcSurface, dstSurface, w, h, amount) {
        // Barrel distortion via pixel remapping
        const imgData = this._getImageDataFromSurface(srcSurface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const k = amount;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = (x - cx) / cx;
                const dy = (y - cy) / cy;
                const r2 = dx * dx + dy * dy;
                const distortion = 1 + k * r2;
                const sx = Math.round(cx + dx * distortion * cx);
                const sy = Math.round(cy + dy * distortion * cy);

                const dstIdx = (y * w + x) * 4;
                if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                    const srcIdx = (sy * w + sx) * 4;
                    dst[dstIdx]     = src[srcIdx];
                    dst[dstIdx + 1] = src[srcIdx + 1];
                    dst[dstIdx + 2] = src[srcIdx + 2];
                    dst[dstIdx + 3] = src[srcIdx + 3];
                } else {
                    dst[dstIdx] = 0; dst[dstIdx + 1] = 0;
                    dst[dstIdx + 2] = 0; dst[dstIdx + 3] = 255;
                }
            }
        }
        this._putImageDataToSurface(srcSurface, imgData);
    }

    _applyBloom(srcSurface, w, h) {
        // 1. Extract bright pixels to bloom surface
        const srcData = this._getImageDataFromSurface(srcSurface, w, h);
        const bloomData = new ImageData(w, h);
        const sd = srcData.data;
        const bd = bloomData.data;
        const thresh = this.bloomThreshold;

        for (let i = 0; i < sd.length; i += 4) {
            const lum = sd[i] * 0.2126 + sd[i + 1] * 0.7152 + sd[i + 2] * 0.0722;
            if (lum > thresh) {
                bd[i]     = sd[i];
                bd[i + 1] = sd[i + 1];
                bd[i + 2] = sd[i + 2];
                bd[i + 3] = 255;
            } else {
                bd[i + 3] = 0;
            }
        }
        
        // 2. Blur bloom buffer via CSS filter (using capture canvas)
        this._captureCtx.clearRect(0, 0, w, h);
        this._captureCtx.putImageData(bloomData, 0, 0);
        
        // Create temp canvas for blur (reuse to avoid per-frame allocation)
        if (!this._bloomTmpCanvas) {
            this._bloomTmpCanvas = document.createElement('canvas');
        }
        const tmpCanvas = this._bloomTmpCanvas;
        if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
            tmpCanvas.width = w;
            tmpCanvas.height = h;
        }
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.clearRect(0, 0, w, h);
        tmpCtx.filter = `blur(${this.bloomRadius}px)`;
        tmpCtx.drawImage(this._captureCanvas, 0, 0);
        
        // 3. Additive blend bloom onto source
        if (this._useGPUSurface) {
            // Read blurred bloom and blend manually
            const blurredBloom = tmpCtx.getImageData(0, 0, w, h);
            const bbd = blurredBloom.data;
            const intensity = this.bloomIntensity;
            
            for (let i = 0; i < sd.length; i += 4) {
                if (bbd[i + 3] > 0) {
                    sd[i]     = Math.min(255, sd[i] + bbd[i] * intensity);
                    sd[i + 1] = Math.min(255, sd[i + 1] + bbd[i + 1] * intensity);
                    sd[i + 2] = Math.min(255, sd[i + 2] + bbd[i + 2] * intensity);
                }
            }
            this._putImageDataToSurface(srcSurface, srcData);
        } else {
            const srcCtx = srcSurface._ctx;
            srcCtx.save();
            srcCtx.globalAlpha = this.bloomIntensity;
            srcCtx.globalCompositeOperation = 'lighter';
            srcCtx.drawImage(tmpCanvas, 0, 0);
            srcCtx.restore();
        }
    }

    // ==================== OVERLAY EFFECTS ====================

    _drawScanlines(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = this.scanlineOpacity;
        ctx.fillStyle = this.scanlineColor;
        const spacing = Math.max(1, this.scanlineSpacing);
        for (let y = 0; y < h; y += spacing) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.restore();
    }

    _drawVignette(ctx, w, h) {
        ctx.save();
        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const innerR = maxR * this.vignetteRadius;
        const outerR = maxR;

        const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');

        // Parse vignette color
        const vc = this._hexToRGB(this.vignetteColor);
        gradient.addColorStop(1, `rgba(${vc.r},${vc.g},${vc.b},${this.vignetteIntensity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    // ==================== GLITCH ====================

    _generateGlitchSlices() {
        const sliceCount = Math.floor(3 + Math.random() * 8);
        this._glitchSlices = [];
        for (let i = 0; i < sliceCount; i++) {
            this._glitchSlices.push({
                y: Math.random(),            // normalized y position
                h: 0.01 + Math.random() * 0.05, // normalized height
                offset: (Math.random() - 0.5) * 2 * this.glitchIntensity
            });
        }
    }

    _applyGlitch(srcSurface, dstSurface, w, h) {
        // Get image data and apply glitch by shifting slices
        const imgData = this._getImageDataFromSurface(srcSurface, w, h);
        const src = new Uint8ClampedArray(imgData.data);
        const dst = imgData.data;
        
        // Copy original first
        dst.set(src);

        for (const slice of this._glitchSlices) {
            const sy = Math.floor(slice.y * h);
            const sh = Math.max(1, Math.floor(slice.h * h));
            const offset = Math.floor(slice.offset * w * 0.1);
            
            // Shift the slice horizontally
            for (let y = sy; y < Math.min(sy + sh, h); y++) {
                for (let x = 0; x < w; x++) {
                    const srcX = x - offset;
                    if (srcX >= 0 && srcX < w) {
                        const dstIdx = (y * w + x) * 4;
                        const srcIdx = (y * w + srcX) * 4;
                        dst[dstIdx]     = src[srcIdx];
                        dst[dstIdx + 1] = src[srcIdx + 1];
                        dst[dstIdx + 2] = src[srcIdx + 2];
                        dst[dstIdx + 3] = src[srcIdx + 3];
                    }
                }
            }
        }
        
        this._putImageDataToSurface(srcSurface, imgData);
    }

    // ==================== UTILITY ====================

    _hexToRGB(hex) {
        const h = hex.replace('#', '');
        return {
            r: parseInt(h.substring(0, 2), 16) || 0,
            g: parseInt(h.substring(2, 4), 16) || 0,
            b: parseInt(h.substring(4, 6), 16) || 0
        };
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON();
        json.type = 'PostScreenEffects';
        // Global
        json.resolutionScale = this.resolutionScale;
        json.smoothingEnabled = this.smoothingEnabled;
        json.renderMode = this.renderMode;
        json.forceGPUFallback = this.forceGPUFallback;
        // Color Grading
        json.brightnessEnabled = this.brightnessEnabled;
        json.brightness = this.brightness;
        json.contrastEnabled = this.contrastEnabled;
        json.contrast = this.contrast;
        json.saturationEnabled = this.saturationEnabled;
        json.saturation = this.saturation;
        // Grayscale
        json.grayscaleEnabled = this.grayscaleEnabled;
        json.grayscaleAmount = this.grayscaleAmount;
        // Sepia
        json.sepiaEnabled = this.sepiaEnabled;
        json.sepiaAmount = this.sepiaAmount;
        // Invert
        json.invertEnabled = this.invertEnabled;
        json.invertAmount = this.invertAmount;
        // Tint
        json.tintEnabled = this.tintEnabled;
        json.tintColor = this.tintColor;
        json.tintOpacity = this.tintOpacity;
        json.tintBlendMode = this.tintBlendMode;
        // Vignette
        json.vignetteEnabled = this.vignetteEnabled;
        json.vignetteIntensity = this.vignetteIntensity;
        json.vignetteRadius = this.vignetteRadius;
        json.vignetteColor = this.vignetteColor;
        // Chromatic
        json.chromaticEnabled = this.chromaticEnabled;
        json.chromaticAmount = this.chromaticAmount;
        // Scanlines
        json.scanlinesEnabled = this.scanlinesEnabled;
        json.scanlineSpacing = this.scanlineSpacing;
        json.scanlineOpacity = this.scanlineOpacity;
        json.scanlineColor = this.scanlineColor;
        // CRT
        json.crtEnabled = this.crtEnabled;
        json.crtAmount = this.crtAmount;
        // Pixelate
        json.pixelateEnabled = this.pixelateEnabled;
        json.pixelateSize = this.pixelateSize;
        // Noise
        json.noiseEnabled = this.noiseEnabled;
        json.noiseAmount = this.noiseAmount;
        json.noiseMonochrome = this.noiseMonochrome;
        // Blur
        json.blurEnabled = this.blurEnabled;
        json.blurAmount = this.blurAmount;
        // Bloom
        json.bloomEnabled = this.bloomEnabled;
        json.bloomThreshold = this.bloomThreshold;
        json.bloomIntensity = this.bloomIntensity;
        json.bloomRadius = this.bloomRadius;
        // Posterize
        json.posterizeEnabled = this.posterizeEnabled;
        json.posterizeLevels = this.posterizeLevels;
        // Channel Shift
        json.channelShiftEnabled = this.channelShiftEnabled;
        json.channelShiftX = this.channelShiftX;
        json.channelShiftY = this.channelShiftY;
        // Sharpen
        json.sharpenEnabled = this.sharpenEnabled;
        json.sharpenAmount = this.sharpenAmount;
        // Dither
        json.ditherEnabled = this.ditherEnabled;
        json.ditherLevels = this.ditherLevels;
        // Gradient Map
        json.gradientMapEnabled = this.gradientMapEnabled;
        json.gradientMapColorA = this.gradientMapColorA;
        json.gradientMapColorB = this.gradientMapColorB;
        // Thermal
        json.thermalEnabled = this.thermalEnabled;
        // Edge Detection
        json.edgeDetectEnabled = this.edgeDetectEnabled;
        json.edgeDetectThreshold = this.edgeDetectThreshold;
        json.edgeDetectColor = this.edgeDetectColor;
        json.edgeDetectBg = this.edgeDetectBg;
        // Glitch
        json.glitchEnabled = this.glitchEnabled;
        json.glitchIntensity = this.glitchIntensity;
        json.glitchSpeed = this.glitchSpeed;
        // Shake
        json.shakeEnabled = this.shakeEnabled;
        json.shakeIntensity = this.shakeIntensity;
        // Fade
        json.fadeEnabled = this.fadeEnabled;
        json.fadeColor = this.fadeColor;
        json.fadeOpacity = this.fadeOpacity;
        return json;
    }

    static fromJSON(json) {
        const m = new PostScreenEffects();
        m.enabled = json.enabled ?? true;
        // Global
        m.resolutionScale = json.resolutionScale ?? 0.5;
        m.smoothingEnabled = json.smoothingEnabled ?? false;
        m.renderMode = json.renderMode ?? 'beforeGUI';
        m.forceGPUFallback = json.forceGPUFallback ?? false;
        // Color Grading
        m.brightnessEnabled = json.brightnessEnabled ?? false;
        m.brightness = json.brightness ?? 0;
        m.contrastEnabled = json.contrastEnabled ?? false;
        m.contrast = json.contrast ?? 0;
        m.saturationEnabled = json.saturationEnabled ?? false;
        m.saturation = json.saturation ?? 0;
        // Grayscale
        m.grayscaleEnabled = json.grayscaleEnabled ?? false;
        m.grayscaleAmount = json.grayscaleAmount ?? 1;
        // Sepia
        m.sepiaEnabled = json.sepiaEnabled ?? false;
        m.sepiaAmount = json.sepiaAmount ?? 1;
        // Invert
        m.invertEnabled = json.invertEnabled ?? false;
        m.invertAmount = json.invertAmount ?? 1;
        // Tint
        m.tintEnabled = json.tintEnabled ?? false;
        m.tintColor = json.tintColor ?? '#ff0000';
        m.tintOpacity = json.tintOpacity ?? 0.2;
        m.tintBlendMode = json.tintBlendMode ?? 'multiply';
        // Vignette
        m.vignetteEnabled = json.vignetteEnabled ?? false;
        m.vignetteIntensity = json.vignetteIntensity ?? 0.5;
        m.vignetteRadius = json.vignetteRadius ?? 0.7;
        m.vignetteColor = json.vignetteColor ?? '#000000';
        // Chromatic
        m.chromaticEnabled = json.chromaticEnabled ?? false;
        m.chromaticAmount = json.chromaticAmount ?? 3;
        // Scanlines
        m.scanlinesEnabled = json.scanlinesEnabled ?? false;
        m.scanlineSpacing = json.scanlineSpacing ?? 3;
        m.scanlineOpacity = json.scanlineOpacity ?? 0.3;
        m.scanlineColor = json.scanlineColor ?? '#000000';
        // CRT
        m.crtEnabled = json.crtEnabled ?? false;
        m.crtAmount = json.crtAmount ?? 0.03;
        // Pixelate
        m.pixelateEnabled = json.pixelateEnabled ?? false;
        m.pixelateSize = json.pixelateSize ?? 4;
        // Noise
        m.noiseEnabled = json.noiseEnabled ?? false;
        m.noiseAmount = json.noiseAmount ?? 0.15;
        m.noiseMonochrome = json.noiseMonochrome ?? true;
        // Blur
        m.blurEnabled = json.blurEnabled ?? false;
        m.blurAmount = json.blurAmount ?? 2;
        // Bloom
        m.bloomEnabled = json.bloomEnabled ?? false;
        m.bloomThreshold = json.bloomThreshold ?? 200;
        m.bloomIntensity = json.bloomIntensity ?? 0.6;
        m.bloomRadius = json.bloomRadius ?? 4;
        // Posterize
        m.posterizeEnabled = json.posterizeEnabled ?? false;
        m.posterizeLevels = json.posterizeLevels ?? 4;
        // Channel Shift
        m.channelShiftEnabled = json.channelShiftEnabled ?? false;
        m.channelShiftX = json.channelShiftX ?? 3;
        m.channelShiftY = json.channelShiftY ?? 0;
        // Sharpen
        m.sharpenEnabled = json.sharpenEnabled ?? false;
        m.sharpenAmount = json.sharpenAmount ?? 0.5;
        // Dither
        m.ditherEnabled = json.ditherEnabled ?? false;
        m.ditherLevels = json.ditherLevels ?? 4;
        // Gradient Map
        m.gradientMapEnabled = json.gradientMapEnabled ?? false;
        m.gradientMapColorA = json.gradientMapColorA ?? '#000033';
        m.gradientMapColorB = json.gradientMapColorB ?? '#ffcc00';
        // Thermal
        m.thermalEnabled = json.thermalEnabled ?? false;
        // Edge Detection
        m.edgeDetectEnabled = json.edgeDetectEnabled ?? false;
        m.edgeDetectThreshold = json.edgeDetectThreshold ?? 30;
        m.edgeDetectColor = json.edgeDetectColor ?? '#ffffff';
        m.edgeDetectBg = json.edgeDetectBg ?? '#000000';
        // Glitch
        m.glitchEnabled = json.glitchEnabled ?? false;
        m.glitchIntensity = json.glitchIntensity ?? 0.5;
        m.glitchSpeed = json.glitchSpeed ?? 10;
        // Shake
        m.shakeEnabled = json.shakeEnabled ?? false;
        m.shakeIntensity = json.shakeIntensity ?? 4;
        // Fade
        m.fadeEnabled = json.fadeEnabled ?? false;
        m.fadeColor = json.fadeColor ?? '#000000';
        m.fadeOpacity = json.fadeOpacity ?? 0;
        return m;
    }

    clone() {
        const c = new PostScreenEffects();
        c.enabled = this.enabled;
        // Global
        c.resolutionScale = this.resolutionScale;
        c.smoothingEnabled = this.smoothingEnabled;
        c.renderMode = this.renderMode;
        // Color Grading
        c.brightnessEnabled = this.brightnessEnabled;
        c.brightness = this.brightness;
        c.contrastEnabled = this.contrastEnabled;
        c.contrast = this.contrast;
        c.saturationEnabled = this.saturationEnabled;
        c.saturation = this.saturation;
        // Grayscale
        c.grayscaleEnabled = this.grayscaleEnabled;
        c.grayscaleAmount = this.grayscaleAmount;
        // Sepia
        c.sepiaEnabled = this.sepiaEnabled;
        c.sepiaAmount = this.sepiaAmount;
        // Invert
        c.invertEnabled = this.invertEnabled;
        c.invertAmount = this.invertAmount;
        // Tint
        c.tintEnabled = this.tintEnabled;
        c.tintColor = this.tintColor;
        c.tintOpacity = this.tintOpacity;
        c.tintBlendMode = this.tintBlendMode;
        // Vignette
        c.vignetteEnabled = this.vignetteEnabled;
        c.vignetteIntensity = this.vignetteIntensity;
        c.vignetteRadius = this.vignetteRadius;
        c.vignetteColor = this.vignetteColor;
        // Chromatic
        c.chromaticEnabled = this.chromaticEnabled;
        c.chromaticAmount = this.chromaticAmount;
        // Scanlines
        c.scanlinesEnabled = this.scanlinesEnabled;
        c.scanlineSpacing = this.scanlineSpacing;
        c.scanlineOpacity = this.scanlineOpacity;
        c.scanlineColor = this.scanlineColor;
        // CRT
        c.crtEnabled = this.crtEnabled;
        c.crtAmount = this.crtAmount;
        // Pixelate
        c.pixelateEnabled = this.pixelateEnabled;
        c.pixelateSize = this.pixelateSize;
        // Noise
        c.noiseEnabled = this.noiseEnabled;
        c.noiseAmount = this.noiseAmount;
        c.noiseMonochrome = this.noiseMonochrome;
        // Blur
        c.blurEnabled = this.blurEnabled;
        c.blurAmount = this.blurAmount;
        // Bloom
        c.bloomEnabled = this.bloomEnabled;
        c.bloomThreshold = this.bloomThreshold;
        c.bloomIntensity = this.bloomIntensity;
        c.bloomRadius = this.bloomRadius;
        // Posterize
        c.posterizeEnabled = this.posterizeEnabled;
        c.posterizeLevels = this.posterizeLevels;
        // Channel Shift
        c.channelShiftEnabled = this.channelShiftEnabled;
        c.channelShiftX = this.channelShiftX;
        c.channelShiftY = this.channelShiftY;
        // Sharpen
        c.sharpenEnabled = this.sharpenEnabled;
        c.sharpenAmount = this.sharpenAmount;
        // Dither
        c.ditherEnabled = this.ditherEnabled;
        c.ditherLevels = this.ditherLevels;
        // Gradient Map
        c.gradientMapEnabled = this.gradientMapEnabled;
        c.gradientMapColorA = this.gradientMapColorA;
        c.gradientMapColorB = this.gradientMapColorB;
        // Thermal
        c.thermalEnabled = this.thermalEnabled;
        // Edge Detection
        c.edgeDetectEnabled = this.edgeDetectEnabled;
        c.edgeDetectThreshold = this.edgeDetectThreshold;
        c.edgeDetectColor = this.edgeDetectColor;
        c.edgeDetectBg = this.edgeDetectBg;
        // Glitch
        c.glitchEnabled = this.glitchEnabled;
        c.glitchIntensity = this.glitchIntensity;
        c.glitchSpeed = this.glitchSpeed;
        // Shake
        c.shakeEnabled = this.shakeEnabled;
        c.shakeIntensity = this.shakeIntensity;
        // Fade
        c.fadeEnabled = this.fadeEnabled;
        c.fadeColor = this.fadeColor;
        c.fadeOpacity = this.fadeOpacity;
        return c;
    }

    onDestroy() {
        // Unhook our callbacks from the engine
        if (this._engine) {
            if (this._engine.onBeforeRenderCallback === this._boundBeforeGUI) {
                this._engine.onBeforeRenderCallback = this._prevBeforeRenderCallback || null;
            }
            if (this._engine.onRenderCallback === this._boundAfterGUI) {
                this._engine.onRenderCallback = this._prevRenderCallback || null;
            }
        }
        this._engine = null;
        this._prevBeforeRenderCallback = null;
        this._prevRenderCallback = null;
        this._boundBeforeGUI = null;
        this._boundAfterGUI = null;
        
        // Free GPU surfaces and buffers
        this._freeBuffers();
    }
}

// ==================== REGISTRATION ====================
window.PostScreenEffects = PostScreenEffects;
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('PostScreenEffects', PostScreenEffects);
}
