/**
 * SpriteRenderer Module
 * Renders sprites from the asset manager on the game canvas
 */

class SpriteRenderer extends Module {
    constructor() {
        super();
        
        // Renderer mode
        this.useBackgroundLayer = false; // Draw to engine's background layer (behind all objects)
        
        // Editable properties
        this.imagePath = ''; // Image filename in asset manager (e.g., "player.png" or "image.png")
        this.width = 64;     // Display width (0 = use image natural width)
        this.height = 64;    // Display height (0 = use image natural height)
        this.flipX = false;  // Flip horizontally
        this.flipY = false;  // Flip vertically
        this.alpha = 1.0;    // Opacity (0-1)
        this.color = '#ffffff'; // Tint color
        this.offsetX = 0;    // Offset from gameObject position
        this.offsetY = 0;
        this.smoothing = false; // Image smoothing (false for pixel art)
        this.pixelPerfect = true; // Snap draw positions/sizes to whole pixels to prevent seams
        
        // Internal: track pending editor image loads to avoid re-entry
        this._editorImageLoading = false;
        
        // ── TopDownThreeD (TDTD) Integration ──
        this.tdtdEnabled = false;      // Render as a flat billboard in the TDTD 3D world
        this.tdtdZ = 0;               // Z position (height) in the fake 3D world
        this.tdtdAnchorY = 1;         // Anchor Y (0=center, 1=bottom-anchored on ground)
        
        // Tint cache (for efficient color tinting)
        this._tintCanvas = null;
        this._tintCtx = null;
        this._cachedTintColor = null;
        this._cachedTintImagePath = null;
        this._cachedTintImageWidth = 0;
        this._cachedTintImageHeight = 0;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering,Drawing';
    static is2D = true;  // Only available in Canvas2D mode
    
    static getIcon() {
        return '🖼️';
    }
    
    static getDescription() {
        return 'Renders sprites and images on the canvas (Canvas2D)';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
        
    // ==================== LIFECYCLE METHODS ====================
    
    loop(deltaTime) {
        // SpriteRenderer doesn't need to update each frame
    }
    
    draw(ctx) {
    	// Draw editor visualization overlay
        if (this.gameObject.isEditing) {
            this._drawEditorPlaceholder(ctx);
            return;
        }

        // ── TDTD billboard rendering ──
        if (this.tdtdEnabled) {
            this.drawUntethered(ctx);
            this._drawTDTDBillboard(ctx);
            this.drawTethered(ctx);
            return;
        }

        // Viewport culling: skip draw if sprite is entirely outside the visible area
        const engine = this.gameObject._engine;
        if (engine) {
            const canvas = engine.canvas || engine._canvas;
            if (canvas) {
                const cam   = engine.viewport || { x: 0, y: 0 };
                const zoom  = engine.viewport?.zoom || engine.zoom || 1;
                const renderW = engine.viewport.width || canvas.width;
                const renderH = engine.viewport.height || canvas.height;

                // Viewport bounds in world space
                // viewport.x/y is the top-left corner (from applyTransform: scale then translate(-x,-y))
                const vpLeft   = cam.x;
                const vpRight  = cam.x + renderW / zoom;
                const vpTop    = cam.y;
                const vpBottom = cam.y + renderH / zoom;

                // Sprite bounds in world space
                const worldPos = this.gameObject.getWorldPosition();
                const fileName = this.imagePath.split('/').pop().split('\\').pop();
                const img      = engine.assets?.getImage(fileName);
                const drawW    = this.width  > 0 ? this.width  : (img?.naturalWidth  || img?.width  || 64);
                const drawH    = this.height > 0 ? this.height : (img?.naturalHeight || img?.height || 64);

                const spriteLeft   = worldPos.x + this.offsetX - drawW / 2;
                const spriteRight  = worldPos.x + this.offsetX + drawW / 2;
                const spriteTop    = worldPos.y + this.offsetY - drawH / 2;
                const spriteBottom = worldPos.y + this.offsetY + drawH / 2;

                // AABB intersection test – skip if no overlap
                if (spriteRight < vpLeft || spriteLeft > vpRight ||
                    spriteBottom < vpTop  || spriteTop  > vpBottom) {
                    return;
                }
            }
        }
        
        // If using background layer, drawing is handled by _drawToBackgroundLayer - skip here
        if (this.useBackgroundLayer) return;
        
        this._drawSprite(ctx);
    }
    
    /**
     * Core sprite drawing logic (shared between draw() and _drawToBackgroundLayer())
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawSprite(ctx) {
        // Get image directly from engine's asset manager
        const engine = this.gameObject._engine;
        if (!engine || !engine.assets) return;
        
        // Extract just the filename from the path (in case full path was provided)
        const fileName = this.imagePath.split('/').pop().split('\\').pop();
        let image = engine.assets.getImage(fileName);
        
        // If image not found and we're in editor mode, try to load it
        if (!image && this.imagePath) {
            if (this.gameObject.isEditing && !this._editorImageLoading) {
                this._editorImageLoading = true;
                engine.assets.loadImage(this.imagePath, fileName).then(() => {
                    this._editorImageLoading = false;
                }).catch(() => {
                    this._editorImageLoading = false;
                });
            }
            return;
        }
        
        // Apply tint if not white (use cached tinted image)
        const needsTint = this.color !== '#ffffff' && this.color !== '#fff';
        if (needsTint) {
            image = this._getTintedImage(image);
        }
        
        const worldPos = { x: 0, y: 0};
        const worldAngle = 0;//this.gameObject.getWorldAngle();
        const worldScale = 0;//this.gameObject.getWorldScale();
        
        ctx.save();
        
        // Apply smoothing setting
        ctx.imageSmoothingEnabled = this.smoothing;
        
        // Apply position and rotation
        //ctx.translate(worldPos.x + this.offsetX, worldPos.y + this.offsetY);
        //ctx.rotate(worldAngle);
        
        // Apply scale and flip
        let scaleX = worldScale.x * (this.flipX ? -1 : 1);
        let scaleY = worldScale.y * (this.flipY ? -1 : 1);
        //ctx.scale(scaleX, scaleY);
        
        // Apply alpha
        ctx.globalAlpha = this.alpha;
        
        // Determine dimensions
        const drawWidth = this.width > 0 ? this.width : image.naturalWidth || image.width;
        const drawHeight = this.height > 0 ? this.height : image.naturalHeight || image.height;
        
        // Draw centered on the position
        ctx.drawImage(
            image,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );
        
        ctx.restore();
    }
    
    /**
     * Draw to the engine's background layer canvas
     * This draws in screen space, behind all game objects
     * Called automatically by the engine when useBackgroundLayer is true
     * @private
     */
    _drawToBackgroundLayer() {
        const engine = this.gameObject._engine;
        if (!engine || !engine.assets) return;

        if (this.gameObject.isEditing) {
            return;
        }
        
        // Get the background layer context (creates it if needed)
        const bgCtx = engine.drawBackgroundLayer();
        if (!bgCtx) return;
        
        // Get background layer canvas dimensions
        const bgCanvas = engine._backgroundLayerCanvas;
        if (!bgCanvas) return;
        
        if (!this.imagePath) return;
        
        // Get image from asset manager
        const fileName = this.imagePath.split('/').pop().split('\\').pop();
        let image = engine.assets.getImage(fileName);
        
        // If image not found and we're in editor mode, try to load it
        if (!image) {
            if (this.gameObject.isEditing && !this._editorImageLoading) {
                this._editorImageLoading = true;
                engine.assets.loadImage(this.imagePath, fileName).then(() => {
                    this._editorImageLoading = false;
                }).catch(() => {
                    this._editorImageLoading = false;
                });
            }
            return;
        }
        
        // Set the context smoothing
        bgCtx.imageSmoothingEnabled = this.smoothing;
        
        // Apply tint if not white
        const needsTint = this.color !== '#ffffff' && this.color !== '#fff';
        if (needsTint) {
            image = this._getTintedImage(image);
        }
        
        // Get camera/viewport info for proper world-to-screen transform
        const cam = engine.viewport || { x: 0, y: 0 };
        const zoom = engine.viewport?.zoom || engine.zoom || 1;
        
        // Calculate world position of the sprite
        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.getWorldAngle();
        const worldScale = this.gameObject.getWorldScale();
        
        // Convert world position to screen position
        // viewport.x/y is the world coordinate at the screen's top-left corner,
        // so world-to-screen is simply (worldPos - cam) * zoom with no center offset
        const screenXRaw = (worldPos.x + this.offsetX - cam.x) * zoom;
        const screenYRaw = (worldPos.y + this.offsetY - cam.y) * zoom;
        
        // Determine dimensions (in world units, then scaled to screen)
        const baseWidth = this.width > 0 ? this.width : image.naturalWidth || image.width;
        const baseHeight = this.height > 0 ? this.height : image.naturalHeight || image.height;
        const drawWRaw = baseWidth * Math.abs(worldScale.x) * zoom;
        const drawHRaw = baseHeight * Math.abs(worldScale.y) * zoom;
        
        // Pixel perfect: snap positions and sizes to whole pixels to prevent sub-pixel seams
        const screenX = this.pixelPerfect ? Math.round(screenXRaw) : screenXRaw;
        const screenY = this.pixelPerfect ? Math.round(screenYRaw) : screenYRaw;
        const drawW = this.pixelPerfect ? Math.round(drawWRaw) : drawWRaw;
        const drawH = this.pixelPerfect ? Math.round(drawHRaw) : drawHRaw;
        
        bgCtx.save();
        bgCtx.globalAlpha = this.alpha;
        
        // Apply position and rotation in screen space
        bgCtx.translate(screenX, screenY);
        bgCtx.rotate(worldAngle);
        
        // Apply flip (scale is already baked into drawW/drawH)
        const flipScaleX = this.flipX ? -1 : 1;
        const flipScaleY = this.flipY ? -1 : 1;
        if (flipScaleX !== 1 || flipScaleY !== 1) {
            bgCtx.scale(flipScaleX, flipScaleY);
        }
        
        // Draw centered
        bgCtx.drawImage(
            image,
            -drawW / 2,
            -drawH / 2,
            drawW,
            drawH
        );
        
        bgCtx.restore();
    }
    
    // ==================== PUBLIC METHODS ====================
    
    /**
     * Set the sprite image by path
     * @param {string} path - Path to the image (name used in asset manager)
     */
    setImage(path) {
        this.imagePath = path;
    }
    
    /**
     * Set the sprite size
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }
    
    /**
     * Get the current sprite bounds in world space
     * @returns {Object} {x, y, width, height}
     */
    getBounds() {
        const engine = this.gameObject._engine;
        if (!engine || !engine.assets) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        // Extract just the filename from the path
        const fileName = this.imagePath.split('/').pop().split('\\').pop();
        const image = engine.assets.getImage(fileName);
        if (!image) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        const worldPos = this.gameObject.getWorldPosition();
        const drawWidth = this.width > 0 ? this.width : image.naturalWidth;
        const drawHeight = this.height > 0 ? this.height : image.naturalHeight;
        
        return {
            x: worldPos.x + this.offsetX - drawWidth / 2,
            y: worldPos.y + this.offsetY - drawHeight / 2,
            width: drawWidth,
            height: drawHeight
        };
    }
    
    /**
     * Get a tinted version of the image (cached for performance)
     * Uses offscreen canvas with multiply composite operation
     * @param {HTMLImageElement} image - The source image
     * @returns {HTMLCanvasElement} - The tinted image canvas
     */
    _getTintedImage(image) {
        const imgWidth = image.naturalWidth || image.width;
        const imgHeight = image.naturalHeight || image.height;
        
        // Check if we can use cached version
        if (this._tintCanvas && 
            this._cachedTintColor === this.color &&
            this._cachedTintImagePath === this.imagePath &&
            this._cachedTintImageWidth === imgWidth &&
            this._cachedTintImageHeight === imgHeight) {
            return this._tintCanvas;
        }
        
        // Create or resize offscreen canvas
        if (!this._tintCanvas || 
            this._tintCanvas.width !== imgWidth || 
            this._tintCanvas.height !== imgHeight) {
            this._tintCanvas = document.createElement('canvas');
            this._tintCanvas.width = imgWidth;
            this._tintCanvas.height = imgHeight;
            this._tintCtx = this._tintCanvas.getContext('2d');
            this._tintCtx.imageSmoothingEnabled = false;
        }
        
        const tctx = this._tintCtx;
        
        // Clear and draw original image
        tctx.clearRect(0, 0, imgWidth, imgHeight);
        tctx.globalCompositeOperation = 'source-over';
        tctx.drawImage(image, 0, 0);
        
        // Apply tint using multiply (preserves luminosity variation)
        tctx.globalCompositeOperation = 'multiply';
        tctx.fillStyle = this.color;
        tctx.fillRect(0, 0, imgWidth, imgHeight);
        
        // Restore alpha from original image (multiply affects alpha too)
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(image, 0, 0);
        
        // Reset composite operation
        tctx.globalCompositeOperation = 'source-over';
        
        // Update cache keys
        this._cachedTintColor = this.color;
        this._cachedTintImagePath = this.imagePath;
        this._cachedTintImageWidth = imgWidth;
        this._cachedTintImageHeight = imgHeight;
        
        return this._tintCanvas;
    }
    
    /**
     * Draw a yellow rectangle with a directional arrow for editor visualization
     * Helps visualize the sprite placeholder when the image isn't loaded
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawEditorPlaceholder(ctx) {
        const drawWidth = this.width > 0 ? this.width : 64;
        const drawHeight = this.height > 0 ? this.height : 64;
        const halfW = drawWidth / 2;
        const halfH = drawHeight / 2;
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        
        // Yellow dashed rectangle outline
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(-halfW, -halfH, drawWidth, drawHeight);
        ctx.setLineDash([]);
        
        // Semi-transparent yellow fill
        ctx.fillStyle = 'rgba(255, 204, 0, 0.12)';
        ctx.fillRect(-halfW, -halfH, drawWidth, drawHeight);
        
        // Directional arrow pointing right (angle = 0)
        const arrowLen = Math.min(halfW, halfH) * 0.7;
        const arrowHeadSize = arrowLen * 0.35;
        
        ctx.strokeStyle = '#ffcc00';
        ctx.fillStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(-arrowLen, 0);
        ctx.lineTo(arrowLen - arrowHeadSize, 0);
        ctx.stroke();
        
        // Arrow head (triangle)
        ctx.beginPath();
        ctx.moveTo(arrowLen, 0);
        ctx.lineTo(arrowLen - arrowHeadSize, -arrowHeadSize * 0.6);
        ctx.lineTo(arrowLen - arrowHeadSize, arrowHeadSize * 0.6);
        ctx.closePath();
        ctx.fill();
        
        // Label
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc00';
        const label = this.imagePath ? this.imagePath.split('/').pop().split('\\').pop() : 'No Image';
        ctx.fillText(label, 0, -halfH - 4);
        
        ctx.restore();
    }
    
    // ==================== TDTD BILLBOARD RENDERING ====================

    /**
     * Draw the sprite as a TDTD billboard (depth-sorted flat sprite in fake 3D)
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _drawTDTDBillboard(ctx) {
        const engine = this.gameObject._engine;
        if (!engine) return;

        const tdtd = engine.TDTD || (engine.getTopDownThreeD && engine.getTopDownThreeD());
        if (!tdtd) return;

        // Get the image
        if (!this.imagePath) return;
        const fileName = this.imagePath.split('/').pop().split('\\').pop();
        let image = engine.assets?.getImage(fileName);
        if (!image) return;

        // Apply tint if needed
        const needsTint = this.color !== '#ffffff' && this.color !== '#fff';
        if (needsTint) {
            image = this._getTintedImage(image);
        }

        // Ensure TDTD batch mode is active so this billboard is depth-sorted
        // together with grid cells and other TDTD objects
        if (!tdtd._batchMode) {
            tdtd.beginBatch();
        }
        tdtd._needsFlush = true;

        const worldPos = this.gameObject.getWorldPosition();
        const wx = worldPos.x + this.offsetX;
        const wy = worldPos.y + this.offsetY;
        const wz = this.tdtdZ;

        const drawWidth = this.width > 0 ? this.width : (image.naturalWidth || image.width || 64);
        const drawHeight = this.height > 0 ? this.height : (image.naturalHeight || image.height || 64);

        tdtd.drawBillboard(image, wx, wy, wz, {
            width: drawWidth,
            height: drawHeight,
            anchorX: 0.5,
            anchorY: this.tdtdAnchorY,
            alpha: this.alpha,
            flipX: this.flipX,
            flipY: this.flipY
        }, ctx);
    }

    // ==================== SERIALIZATION ======================================

    /**
     * Property metadata for the inspector
     * @returns {Array} Property definitions
     */
    getPropertyMetadata() {
        return [
            // === RENDERER ===
            { type: 'header', label: '⚙️ Renderer' },
            { 
                key: 'useBackgroundLayer', 
                type: 'boolean', 
                label: '🎨 Use Background Layer', 
                default: false,
                hint: 'Draw to dedicated background layer (behind all objects). Disable to draw with normal objects.'
            },
            // === SPRITE ===
            { type: 'groupStart', label: '🖼️ Sprite' },
            { key: 'imagePath', type: 'image', label: 'Image', default: '' },
            { type: 'hint', label: 'Select an image from the asset manager to render as a sprite' },
            { type: 'groupEnd' },
            // === SIZE ===
            { type: 'groupStart', label: '📐 Size' },
            { type: 'hint', label: 'Set to 0 to use natural image size' },
            { key: 'width', type: 'number', label: 'Width', default: 64, min: 0, max: 2048 },
            { key: 'height', type: 'number', label: 'Height', default: 64, min: 0, max: 2048 },
            { type: 'groupEnd' },
            // === TRANSFORM ===
            { type: 'groupStart', label: '🔄 Transform' },
            { key: 'flipX', type: 'boolean', label: 'Flip X', default: false },
            { key: 'flipY', type: 'boolean', label: 'Flip Y', default: false },
            { key: 'offsetX', type: 'number', label: 'Offset X', default: 0, min: -1000, max: 1000 },
            { key: 'offsetY', type: 'number', label: 'Offset Y', default: 0, min: -1000, max: 1000 },
            { type: 'groupEnd' },
            // === APPEARANCE ===
            { type: 'groupStart', label: '🎨 Appearance' },
            { key: 'alpha', type: 'slider', label: 'Alpha', default: 1.0, min: 0, max: 1, step: 0.01 },
            { key: 'color', type: 'color', label: 'Tint Color', default: '#ffffff' },
            { key: 'smoothing', type: 'boolean', label: 'Smoothing', default: false },
            {
                key: 'pixelPerfect',
                type: 'checkbox',
                label: 'Pixel Perfect',
                default: true,
                hint: 'Snap draw positions and sizes to whole pixels to prevent sub-pixel seams (especially with zoom)'
            },
            { type: 'groupEnd' },
            // === TDTD (TopDown 3D) ===
            { type: 'groupStart', label: '🏗️ TopDown 3D (TDTD)' },
            { type: 'hint', label: 'Render this sprite as a billboard in the fake 3D world' },
            { key: 'tdtdEnabled', type: 'boolean', label: 'Enable TDTD', default: false },
            { key: 'tdtdZ', type: 'number', label: 'Z Position', default: 0, min: -9999, max: 9999, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Height in the 3D world (positive = elevated)' },
            { key: 'tdtdAnchorY', type: 'slider', label: 'Anchor Y', default: 1, min: 0, max: 1, step: 0.05,
              showIf: { tdtdEnabled: true }, hint: '0 = center, 0.5 = middle, 1 = bottom (feet on ground)' },
            { type: 'groupEnd' }
        ];
    }

    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON();
        json.type = 'SpriteRenderer';
        json.useBackgroundLayer = this.useBackgroundLayer;
        json.imagePath = this.imagePath;
        json.width = this.width;
        json.height = this.height;
        json.flipX = this.flipX;
        json.flipY = this.flipY;
        json.alpha = this.alpha;
        json.color = this.color;
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.smoothing = this.smoothing;
        json.pixelPerfect = this.pixelPerfect;
        // TDTD
        json.tdtdEnabled = this.tdtdEnabled;
        json.tdtdZ = this.tdtdZ;
        json.tdtdAnchorY = this.tdtdAnchorY;
        return json;
    }

    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {SpriteRenderer} New instance
     */
    static fromJSON(json) {
        const module = new SpriteRenderer();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.useBackgroundLayer = json.useBackgroundLayer ?? false;
        module.imagePath = json.imagePath ?? '';
        module.width = json.width ?? 64;
        module.height = json.height ?? 64;
        module.flipX = json.flipX ?? false;
        module.flipY = json.flipY ?? false;
        module.alpha = json.alpha ?? 1.0;
        module.color = json.color ?? '#ffffff';
        module.offsetX = json.offsetX ?? 0;
        module.offsetY = json.offsetY ?? 0;
        module.smoothing = json.smoothing ?? false;
        module.pixelPerfect = json.pixelPerfect ?? true;
        // TDTD
        module.tdtdEnabled = json.tdtdEnabled ?? false;
        module.tdtdZ = json.tdtdZ ?? 0;
        module.tdtdAnchorY = json.tdtdAnchorY ?? 1;
        return module;
    }

    /**
     * Clone the module
     * @returns {SpriteRenderer} Cloned module
     */
    clone() {
        return SpriteRenderer.fromJSON(this.toJSON());
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.SpriteRenderer = SpriteRenderer;
}
