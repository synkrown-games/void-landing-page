/**
 * SpriteSheetRenderer Module
 * Renders animated sprites from sprite sheets with animation control
 * Layout: Columns = animation frames (left to right), Rows = different animations (top to bottom)
 * Frame size is automatically calculated: imageWidth/columns x imageHeight/rows
 */

class SpriteSheetRenderer extends Module {
    constructor() {
        super();
        
        // Renderer mode
        this.usePixiJS = false;  // Use Pixi.js hardware-accelerated rendering
        
        // === SPRITE SHEET LAYOUT ===
        this.imagePath = '';
        this.columns = 1;               // Number of frames per animation (horizontal, left to right)
        this.rows = 1;                  // Number of different animations (vertical, top to bottom)
        
        // === ANIMATION CONTROL ===
        this.currentRow = 0;            // Which animation row to play (0-based)
        this.currentFrame = 0;          // Current frame in the animation (0-based)
        this.startFrame = 0;            // First frame of animation range
        this.endFrame = -1;             // Last frame of animation range (-1 = use columns-1)
        this.animationSpeed = 10;       // Frames per second
        this.looping = true;            // Whether animation should loop (renamed from 'loop' to avoid method conflict)
        this.autoPlay = true;
        this.reverseAnimation = false;  // Play animation in reverse direction
        
        // === FRAME TWEENING ===
        this.frameTweening = false;     // Enable crossfade between frames
        this.tweenDuration = 0.8;       // Duration of crossfade (0-1, fraction of frame time) - higher = longer blend
        this.tweenEasing = 'smoothstep'; // Easing for frame tweening (smoothstep is mathematically optimal)
        this.loopTweening = true;       // Enable tweening on loop restart (end->start) - default true for smooth loops
        this.crossfadeMode = 'dissolve'; // 'dissolve' (true blend), 'overlay' (fade over), 'additive' (bright blend)
        this.blendStrength = 1.0;       // How strong the crossfade is (0-1, lower = subtler)
        
        // === RENDERING ===
        this.flipX = false;
        this.flipY = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.width = 0;                 // 0 = use calculated frame width
        this.height = 0;                // 0 = use calculated frame height
        this.alpha = 1;
        this.color = '#ffffff';         // Tint color
        this.smoothing = false;          // Image smoothing (false for pixel art)
        
        // Animation system (for advanced named animations)
        this.animations = {};           // Named animations { name: {row, startFrame, endFrame, speed, loop} }
        this.currentAnimation = null;
        this.isPlaying = true;          // Default to true to match autoPlay default
        
        // === ANIMATION BLENDING ===
        this.blendEasing = 'sine';         // Easing: 'linear', 'sine', 'ease-in', 'ease-out', 'ease-in-out', 'elastic'
        this.blendScaleBounce = false;     // Add subtle scale bounce during transition
        this.blendScaleAmount = 0.05;      // How much to scale (0.05 = 5% bounce)
        this.blendGhostFrames = false;     // Show afterimage/ghost of previous frame
        this.blendGhostCount = 2;          // Number of ghost frames
        this.blendColorFlash = false;      // Brief color tint during transition
        this.blendFlashColor = '#ffffff';  // Flash color
        this.blendFlashIntensity = 0.3;    // Flash intensity (0-1)
        
        // Internal state
        this._image = null;
        this._frameTimer = 0;           // Time accumulated in current frame
        this._animationFrame = 0;       // Frame within current animation
        
        // Continuous frame interpolation state (for smooth transitions)
        this._displayFrame = 0;         // The "base" frame currently being displayed
        this._nextDisplayFrame = 0;     // The next frame to blend towards
        this._frameBlendFactor = 0;     // 0-1 blend factor between display and next frame
        this._isLoopTransition = false; // Is this a loop restart transition (last->first)
        
        // Tint cache (for efficient color tinting)
        this._tintCanvas = null;
        this._tintCtx = null;
        this._cachedTintColor = null;
        this._cachedTintImagePath = null;
        this._cachedTintImageWidth = 0;
        this._cachedTintImageHeight = 0;
        
        // TopDownThreeD (TDTD) Integration
        this.tdtdEnabled = false;      // Render as a billboard in the TDTD 3D world
        this.tdtdZ = 0;               // Z position (height) in the fake 3D world
        this.tdtdAnchorY = 1;         // Anchor Y (0=center, 1=bottom-anchored on ground)
        
        // Pixi.js internal state
        this._pixiSprite = null;
        this._pixiTextures = [];       // Array of frame textures
        this._pixiBaseTexture = null;
        this._lastPixiImagePath = '';
        this._pixiTextureLoaded = false;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering,Drawing';
    static is2D = true;  // Only available in Canvas2D mode
    
    static getIcon() {
        return '🎬';
    }
    
    static getDescription() {
        return 'Animated sprite sheets. Columns→frames, Rows↓animations. Auto-calculates frame size.';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    /**
     * Property metadata with organized sections
     */
    getPropertyMetadata() {
        return [
            // === RENDERER MODE ===
            { type: 'groupStart', label: '⚙️ Renderer' },
            { 
                key: 'usePixiJS', 
                type: 'boolean', 
                label: '🎮 Use Pixi.js', 
                default: false,
                hint: 'Enable hardware-accelerated WebGL rendering (requires Pixi.js mode)'
            },
            { type: 'groupEnd' },
            
            // === SPRITE SHEET ===
            { type: 'groupStart', label: '📄 Sprite Sheet' },
            { key: 'imagePath', type: 'image', label: 'Image', default: '' },
            { type: 'hint', label: 'Frame size is auto-calculated from columns/rows' },
            { type: 'groupEnd' },
            
            // === LAYOUT ===
            { type: 'groupStart', label: '📐 Layout' },
            { key: 'columns', type: 'number', label: 'Columns (Frames →)', default: 1, min: 1, max: 1000 },
            { key: 'rows', type: 'number', label: 'Rows (Animations ↓)', default: 1, min: 1, max: 100 },
            { type: 'groupEnd' },
            
            // === ANIMATION ===
            { type: 'groupStart', label: '🎬 Animation' },
            { key: 'currentRow', type: 'number', label: 'Current Row', default: 0, min: 0, max: 99 },
            { key: 'currentFrame', type: 'number', label: 'Current Frame', default: 0, min: 0, max: 9999 },
            { key: 'startFrame', type: 'number', label: 'Start Frame', default: 0, min: 0, max: 9999 },
            { key: 'endFrame', type: 'number', label: 'End Frame', default: -1, min: -1, max: 9999 },
            { type: 'hint', label: 'End Frame -1 = last column. Same start/end = still frame' },
            { key: 'animationSpeed', type: 'slider', label: 'Speed (FPS)', default: 10, min: 0, max: 120, step: 1 },
            { key: 'looping', type: 'boolean', label: 'Loop', default: true },
            { key: 'autoPlay', type: 'boolean', label: 'Auto Play', default: true },
            { key: 'reverseAnimation', type: 'boolean', label: 'Reverse', default: false },
            { type: 'groupEnd' },
            
            // === FRAME TWEENING ===
            { type: 'groupStart', label: '🔀 Frame Tweening' },
            { type: 'hint', label: 'Crossfade between frames for smoother animation' },
            { key: 'frameTweening', type: 'boolean', label: 'Enable Tweening', default: false },
            { key: 'crossfadeMode', type: 'select', label: 'Crossfade Mode', default: 'dissolve', options: ['dissolve', 'overlay', 'additive'], showIf: { frameTweening: true } },
            { type: 'hint', label: 'Dissolve: true blend | Overlay: fade over | Additive: bright blend', showIf: { frameTweening: true } },
            { key: 'blendStrength', type: 'slider', label: 'Blend Strength', default: 1.0, min: 0.1, max: 1.0, step: 0.05, showIf: { frameTweening: true } },
            { key: 'tweenDuration', type: 'slider', label: 'Tween Duration', default: 0.8, min: 0.1, max: 1.0, step: 0.05, showIf: { frameTweening: true } },
            { key: 'tweenEasing', type: 'select', label: 'Tween Easing', default: 'smoothstep', options: ['smoothstep', 'sine', 'linear', 'ease-in', 'ease-out', 'ease-in-out'], showIf: { frameTweening: true } },
            { key: 'loopTweening', type: 'boolean', label: 'Tween Loop Restart', default: true, showIf: { frameTweening: true } },
            { type: 'groupEnd' },
            
            // === TRANSFORM ===
            { type: 'groupStart', label: '🔄 Transform' },
            { key: 'flipX', type: 'boolean', label: 'Flip X', default: false },
            { key: 'flipY', type: 'boolean', label: 'Flip Y', default: false },
            { key: 'offsetX', type: 'number', label: 'Offset X', default: 0, min: -1000, max: 1000 },
            { key: 'offsetY', type: 'number', label: 'Offset Y', default: 0, min: -1000, max: 1000 },
            { type: 'groupEnd' },
            
            // === SIZE ===
            { type: 'groupStart', label: '📏 Size Override' },
            { type: 'hint', label: 'Set to 0 for auto-calculated size' },
            { key: 'width', type: 'number', label: 'Width', default: 0, min: 0, max: 2048 },
            { key: 'height', type: 'number', label: 'Height', default: 0, min: 0, max: 2048 },
            { type: 'groupEnd' },
            
            // === APPEARANCE ===
            { type: 'groupStart', label: '🎨 Appearance' },
            { key: 'alpha', type: 'slider', label: 'Opacity', default: 1, min: 0, max: 1, step: 0.01 },
            { key: 'color', type: 'color', label: 'Tint Color', default: '#ffffff' },
            { key: 'smoothing', type: 'boolean', label: 'Smoothing', default: false },
            { type: 'groupEnd' },
            
            // === BLEND EFFECTS ===
            { type: 'groupStart', label: '✨ Blend Effects' },
            { type: 'hint', label: 'Effects applied during animation transitions' },
            { key: 'blendEasing', type: 'select', label: 'Easing Curve', default: 'sine', options: ['linear', 'sine', 'ease-in', 'ease-out', 'ease-in-out', 'elastic'] },


            // Scale Bounce
            { key: 'blendScaleBounce', type: 'boolean', label: 'Scale Bounce', default: false },
            { key: 'blendScaleAmount', type: 'number', label: 'Bounce Amount', default: 0.05, min: 0.01, max: 0.3, step: 0.01, showIf: { blendScaleBounce: true } },
            
            // Ghost Frames
            { key: 'blendGhostFrames', type: 'boolean', label: 'Ghost Frames', default: false },
            { key: 'blendGhostCount', type: 'number', label: 'Ghost Count', default: 2, min: 1, max: 5, showIf: { blendGhostFrames: true } },
            
            // Color Flash
            { key: 'blendColorFlash', type: 'boolean', label: 'Color Flash', default: false },
            { key: 'blendFlashColor', type: 'color', label: 'Flash Color', default: '#ffffff', showIf: { blendColorFlash: true } },
            { key: 'blendFlashIntensity', type: 'number', label: 'Flash Intensity', default: 0.3, min: 0.1, max: 1.0, step: 0.05, showIf: { blendColorFlash: true } },
            { type: 'groupEnd' },

            // === TDTD (TopDown 3D) ===
            { type: 'groupStart', label: '🏗️ TopDown 3D (TDTD)' },
            { type: 'hint', label: 'Render this animated sprite as a billboard in the fake 3D world' },
            { key: 'tdtdEnabled', type: 'boolean', label: 'Enable TDTD', default: false },
            { key: 'tdtdZ', type: 'number', label: 'Z Position', default: 0, min: -9999, max: 9999, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Height in the 3D world (positive = elevated)' },
            { key: 'tdtdAnchorY', type: 'slider', label: 'Anchor Y', default: 1, min: 0, max: 1, step: 0.05,
              showIf: { tdtdEnabled: true }, hint: '0 = center, 0.5 = middle, 1 = bottom (feet on ground)' },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    async start() {
        this.loadImage();
        // Ensure isPlaying is set correctly on start
        if (this.autoPlay && !this.isPlaying) {
            this.isPlaying = true;
        }
        
        // Load Pixi.js textures if enabled
        if (this.usePixiJS && this.imagePath) {
            await this._loadPixiTextures();
        }
    }
    
    loop(deltaTime) {
        if (!this.isPlaying || this.animationSpeed <= 0) return;
        
        // Calculate effective frame range
        const effectiveEndFrame = this.endFrame >= 0 ? this.endFrame : (this.columns - 1);
        const effectiveStartFrame = Math.min(this.startFrame, effectiveEndFrame);
        const totalFrames = effectiveEndFrame - effectiveStartFrame + 1;
        
        // If start and end frame are the same, just show that still frame
        if (effectiveStartFrame === effectiveEndFrame) {
            this.currentFrame = effectiveStartFrame;
            this._displayFrame = effectiveStartFrame;
            this._frameBlendFactor = 0;
            return;
        }
        
        const frameTime = 1 / this.animationSpeed;
        
        // Accumulate time
        this._frameTimer += deltaTime;
        
        // Calculate how many frames to advance
        while (this._frameTimer >= frameTime) {
            this._frameTimer -= frameTime;
            this._advanceFrame(effectiveStartFrame, effectiveEndFrame);
        }
        
        // Calculate continuous blend factor based on time through current frame
        // This creates smooth interpolation between frames
        if (this.frameTweening) {
            // _frameTimer is how far into the current frame we are (0 to frameTime)
            // Convert to 0-1 range
            const rawProgress = this._frameTimer / frameTime;
            
            // Apply tween duration - controls when blending starts within the frame
            // tweenDuration of 1.0 = blend entire frame duration
            // tweenDuration of 0.5 = only blend during last 50% of frame
            const blendStart = 1.0 - this.tweenDuration;
            
            if (rawProgress >= blendStart) {
                // We're in the blending zone
                this._frameBlendFactor = (rawProgress - blendStart) / this.tweenDuration;
            } else {
                // Not yet blending
                this._frameBlendFactor = 0;
            }
            
            // Calculate the next frame for blending
            this._displayFrame = this.currentFrame;
            if (this.reverseAnimation) {
                this._nextDisplayFrame = this.currentFrame - 1;
                if (this._nextDisplayFrame < effectiveStartFrame) {
                    this._nextDisplayFrame = this.looping ? effectiveEndFrame : effectiveStartFrame;
                    this._isLoopTransition = this.looping;
                } else {
                    this._isLoopTransition = false;
                }
            } else {
                this._nextDisplayFrame = this.currentFrame + 1;
                if (this._nextDisplayFrame > effectiveEndFrame) {
                    this._nextDisplayFrame = this.looping ? effectiveStartFrame : effectiveEndFrame;
                    this._isLoopTransition = this.looping;
                } else {
                    this._isLoopTransition = false;
                }
            }
            
            // If loop tweening is disabled and this is a loop transition, don't blend
            if (this._isLoopTransition && !this.loopTweening) {
                this._frameBlendFactor = 0;
            }
        } else {
            this._displayFrame = this.currentFrame;
            this._frameBlendFactor = 0;
        }
    }
    
    /**
     * Internal method to advance to the next/previous frame
     */
    _advanceFrame(startFrame, endFrame) {
        if (this.reverseAnimation) {
            // Reverse direction
            this.currentFrame--;
            if (this.currentFrame < startFrame) {
                if (this.looping) {
                    this.currentFrame = endFrame;
                } else {
                    this.currentFrame = startFrame;
                    this.isPlaying = false;
                }
            }
        } else {
            // Forward direction
            this.currentFrame++;
            if (this.currentFrame > endFrame) {
                if (this.looping) {
                    this.currentFrame = startFrame;
                } else {
                    this.currentFrame = endFrame;
                    this.isPlaying = false;
                }
            }
        }
    }
    
    draw(ctx) {
        // Skip Canvas2D drawing if using Pixi.js
        if (this.usePixiJS) return;
        
        // ── TDTD billboard rendering ──
        if (this.tdtdEnabled) {
            this.drawUntethered(ctx);
            this._drawTDTDBillboard(ctx);
            this.drawTethered(ctx);
            return;
        }
        
        // Get image directly from engine's asset manager (like SpriteRenderer)
        const engine = this.gameObject._engine;
        if (!engine || !engine.assets) return;
        
        // Extract just the filename from the path
        const fileName = this.imagePath.split('/').pop().split('\\').pop();
        let image = engine.assets.getImage(fileName);
        if (!image) return;
        
        // Apply tint if not white (use cached tinted image)
        const needsTint = this.color !== '#ffffff' && this.color !== '#fff';
        if (needsTint) {
            image = this._getTintedImage(image);
        }
        
        // Calculate actual frame dimensions from image size and grid
        // Image width divided by columns = frame width
        // Image height divided by rows = frame height
        const imgWidth = image.naturalWidth || image.width;
        const imgHeight = image.naturalHeight || image.height;
        const actualFrameWidth = imgWidth / this.columns;
        const actualFrameHeight = imgHeight / this.rows;
        
        // Calculate source rectangle (where in the sprite sheet)
        // Column = which frame in the animation (horizontal, left to right)
        // Row = which animation (vertical, top to bottom)
        // Use Math.floor() for source coordinates to prevent bleeding from adjacent frames
        // when the frame dimensions don't divide evenly or when scaling
        const col = this.currentFrame % this.columns;
        const row = this.currentRow;
        const sx = Math.floor(col * actualFrameWidth);
        const sy = Math.floor(row * actualFrameHeight);
        // Also floor the source dimensions to ensure we don't sample beyond frame boundaries
        const srcWidth = Math.floor(actualFrameWidth);
        const srcHeight = Math.floor(actualFrameHeight);
        
        // Calculate destination size (use custom width/height if set, otherwise use frame dimensions)
        const drawWidth = this.width > 0 ? this.width : actualFrameWidth;
        const drawHeight = this.height > 0 ? this.height : actualFrameHeight;
        
        // Get world transforms (matching SpriteRenderer behavior)
        const worldAngle = this.gameObject.getWorldAngle();
        const worldScale = this.gameObject.getWorldScale();
        
        ctx.save();
        
        // Apply smoothing setting
        ctx.imageSmoothingEnabled = this.smoothing;
        
        // Translate to the offset position
        ctx.translate(this.offsetX, this.offsetY);
        ctx.rotate(worldAngle);
        
        // Apply scale and flip
        const scaleX = worldScale.x * (this.flipX ? -1 : 1);
        const scaleY = worldScale.y * (this.flipY ? -1 : 1);
        ctx.scale(scaleX, scaleY);
        
        // Handle continuous frame interpolation (smooth time-based blending)
        if (this.frameTweening && this._frameBlendFactor > 0 && this._displayFrame !== this._nextDisplayFrame) {
            // Apply easing to the blend factor for smoother visual transition
            const easedBlend = this._getEasedBlendAlpha(this._frameBlendFactor, this.tweenEasing);
            const strength = this.blendStrength;
            
            // Calculate source rect for current display frame
            const currCol = this._displayFrame % this.columns;
            const currSx = Math.floor(currCol * actualFrameWidth);
            const currSy = Math.floor(row * actualFrameHeight);
            
            // Calculate source rect for next frame (what we're blending towards)
            const nextCol = this._nextDisplayFrame % this.columns;
            const nextSx = Math.floor(nextCol * actualFrameWidth);
            const nextSy = Math.floor(row * actualFrameHeight);
            
            // Calculate blend alphas
            // At blend=0: show 100% current, 0% next
            // At blend=1: show 0% current, 100% next
            const t = easedBlend * strength;
            const currAlpha = 1.0 - t;
            const nextAlpha = t;
            
            // Apply crossfade mode
            switch (this.crossfadeMode) {
                case 'dissolve':
                    // True dissolve: complementary alphas
                    ctx.globalAlpha = this.alpha * currAlpha;
                    ctx.drawImage(
                        image,
                        currSx, currSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    
                    ctx.globalAlpha = this.alpha * nextAlpha;
                    ctx.drawImage(
                        image,
                        nextSx, nextSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    break;
                    
                case 'overlay':
                    // Overlay: next frame at full alpha, current fades out on top
                    ctx.globalAlpha = this.alpha;
                    ctx.drawImage(
                        image,
                        nextSx, nextSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    
                    ctx.globalAlpha = this.alpha * currAlpha * strength;
                    ctx.drawImage(
                        image,
                        currSx, currSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    break;
                    
                case 'additive':
                    // Additive: both frames contribute
                    ctx.globalAlpha = this.alpha * currAlpha;
                    ctx.drawImage(
                        image,
                        currSx, currSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = this.alpha * nextAlpha * 0.4;
                    ctx.drawImage(
                        image,
                        nextSx, nextSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = this.alpha * nextAlpha;
                    ctx.drawImage(
                        image,
                        nextSx, nextSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    break;
                    
                default:
                    // Default dissolve
                    ctx.globalAlpha = this.alpha * currAlpha;
                    ctx.drawImage(
                        image,
                        currSx, currSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
                    ctx.globalAlpha = this.alpha * nextAlpha;
                    ctx.drawImage(
                        image,
                        nextSx, nextSy, srcWidth, srcHeight,
                        -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
                    );
            }
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
            ctx.globalAlpha = 1;
            return;
        }
        
        // Handle animation blending (crossfade between named animations)
        if (this._blendEnabled && this._blendAlpha < 1.0) {
            // Calculate eased alpha based on easing type (use passed value or instance property)
            const easedAlpha = this._getEasedBlendAlpha(this._blendAlpha, this._blendEasing || this.blendEasing || 'sine');
            
            // Calculate fade values
            const fadeOut = 1.0 - easedAlpha;
            const fadeIn = easedAlpha;
            
            // Draw previous frame with fading alpha
            // Use Math.floor() to prevent bleeding from adjacent frames
            const prevCol = this._blendPreviousFrame % this.columns;
            const prevRow = this._blendPreviousRow;
            const prevSx = Math.floor(prevCol * actualFrameWidth);
            const prevSy = Math.floor(prevRow * actualFrameHeight);
            
            // Ghost frames effect - draw trailing afterimages
            const useGhostFrames = this._blendGhostFrames !== undefined ? this._blendGhostFrames : this.blendGhostFrames;
            const ghostCount = this._blendGhostCount || this.blendGhostCount || 2;
            if (useGhostFrames && ghostCount > 0) {
                for (let i = ghostCount; i >= 1; i--) {
                    const ghostAlpha = (fadeOut * 0.3) / (i + 1); // Decreasing alpha for each ghost
                    const ghostOffset = i * 2 * (this.flipX ? 1 : -1); // Slight offset
                    
                    ctx.globalAlpha = this.alpha * ghostAlpha;
                    ctx.drawImage(
                        image,
                        prevSx, prevSy, srcWidth, srcHeight,
                        -drawWidth / 2 + ghostOffset, -drawHeight / 2, drawWidth, drawHeight
                    );
                }
            }
            
            // Scale bounce effect - apply scale pulse during blend
            let blendScale = 1.0;
            const useScaleBounce = this._blendScaleBounce !== undefined ? this._blendScaleBounce : this.blendScaleBounce;
            if (useScaleBounce) {
                const bounceAmount = this._blendScaleAmount || this.blendScaleAmount || 0.05;
                // Sin curve peaks at 0.5, creating a bounce in the middle of transition
                blendScale = 1.0 + Math.sin(this._blendAlpha * Math.PI) * bounceAmount;
            }
            
            ctx.save();
            if (blendScale !== 1.0) {
                ctx.scale(blendScale, blendScale);
            }
            
            // Draw previous frame
            ctx.globalAlpha = this.alpha * fadeOut;
            ctx.drawImage(
                image,
                prevSx, prevSy, srcWidth, srcHeight,
                -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
            );
            
            // Draw current frame with increasing alpha (overlapping the previous)
            ctx.globalAlpha = this.alpha * fadeIn;
            ctx.drawImage(
                image,
                sx, sy, srcWidth, srcHeight,
                -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
            );
            
            // Color flash effect - overlay color at peak of transition
            const useColorFlash = this._blendColorFlash !== undefined ? this._blendColorFlash : this.blendColorFlash;
            if (useColorFlash) {
                const flashIntensity = this._blendFlashIntensity || this.blendFlashIntensity || 0.3;
                // Flash peaks in the middle of the transition
                const flashAlpha = Math.sin(this._blendAlpha * Math.PI) * flashIntensity;
                
                if (flashAlpha > 0.01) {
                    ctx.globalAlpha = flashAlpha;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = this._blendFlashColor || this.blendFlashColor || '#ffffff';
                    ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
            
            ctx.restore();
            
            // Skip the normal draw below since we already drew the current frame
            ctx.restore();
            ctx.globalAlpha = 1;
            return;
        } else {
            // Normal alpha
            ctx.globalAlpha = this.alpha;
        }
        
        // Draw the sprite centered at 0,0
        ctx.drawImage(
            image,
            sx, sy, srcWidth, srcHeight,
            -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
        );
        
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    
    // ==================== IMAGE LOADING ====================
    
    loadImage() {
        // Image loading is now handled directly in draw() via asset manager
        // This method is kept for compatibility but no longer needed
    }
    
    // ==================== ANIMATION API ====================
    
    /**
     * Define a named animation
     * @param {string} name - Animation name
     * @param {number} row - Which row of the sprite sheet (0-based)
     * @param {number} startFrame - Starting frame index (0-based, optional, defaults to 0)
     * @param {number} endFrame - Ending frame index (optional, defaults to columns-1)
     * @param {number} speed - Animation speed in FPS (optional, uses default if not provided)
     * @param {boolean} loop - Whether to loop (optional, uses default if not provided)
     */
    addAnimation(name, row, startFrame = 0, endFrame = null, speed = null, loop = null) {
        this.animations[name] = {
            row: row,
            start: startFrame,
            end: endFrame !== null ? endFrame : (this.columns - 1),
            speed: speed !== null ? speed : this.animationSpeed,
            loop: loop !== null ? loop : this.looping
        };
    }
    
    /**
     * Play a named animation
     * @param {string} name - Animation name
     * @param {boolean} restart - Whether to restart if already playing
     */
    playAnimation(name, restart = false) {
        if (!this.animations[name]) {
            console.warn(`Animation "${name}" not found`);
            return;
        }
        
        // If same animation and not restarting, continue
        if (this.currentAnimation === name && !restart && this.isPlaying) {
            return;
        }
        
        const anim = this.animations[name];
        this.currentAnimation = name;
        this.currentRow = anim.row;
        this.currentFrame = anim.start;
        this._animationFrame = 0;
        this.animationSpeed = anim.speed;
        this.looping = anim.loop;
        this.isPlaying = true;
        this._frameTimer = 0;
    }
    
    /**
     * Stop the current animation
     */
    stopAnimation() {
        this.isPlaying = false;
        this.currentAnimation = null;
    }
    
    /**
     * Pause the current animation
     */
    pauseAnimation() {
        this.isPlaying = false;
    }
    
    /**
     * Resume the current animation
     */
    resumeAnimation() {
        this.isPlaying = true;
    }
    
    /**
     * Check if a specific animation is currently playing
     * @param {string} name - Animation name
     * @returns {boolean}
     */
    isAnimationPlaying(name) {
        return this.currentAnimation === name && this.isPlaying;
    }
    
    /**
     * Get the current animation name
     * @returns {string|null}
     */
    getCurrentAnimation() {
        return this.currentAnimation;
    }
    
    /**
     * Set the current frame directly
     * @param {number} frame
     */
    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.columns - 1));
    }
    
    /**
     * Go to next frame (respects start/end frame range and reverse setting)
     */
    nextFrame() {
        if (this.currentAnimation) {
            const anim = this.animations[this.currentAnimation];
            
            if (this.reverseAnimation) {
                this._animationFrame--;
                if (this._animationFrame < 0) {
                    const frameCount = anim.end - anim.start + 1;
                    if (anim.loop) {
                        this._animationFrame = frameCount - 1;
                        this.currentFrame = anim.end;
                    } else {
                        this._animationFrame = 0;
                        this.currentFrame = anim.start;
                        this.isPlaying = false;
                    }
                } else {
                    this.currentFrame = anim.start + this._animationFrame;
                }
            } else {
                this._animationFrame++;
                const frameCount = anim.end - anim.start + 1;
                if (this._animationFrame >= frameCount) {
                    if (anim.loop) {
                        this._animationFrame = 0;
                        this.currentFrame = anim.start;
                    } else {
                        this._animationFrame = frameCount - 1;
                        this.currentFrame = anim.end;
                        this.isPlaying = false;
                    }
                } else {
                    this.currentFrame = anim.start + this._animationFrame;
                }
            }
        } else {
            // No named animation, use start/end frame range
            const effectiveEndFrame = this.endFrame >= 0 ? this.endFrame : (this.columns - 1);
            const effectiveStartFrame = Math.min(this.startFrame, effectiveEndFrame);
            
            if (this.reverseAnimation) {
                this.currentFrame--;
                if (this.currentFrame < effectiveStartFrame) {
                    if (this.looping) {
                        this.currentFrame = effectiveEndFrame;
                    } else {
                        this.currentFrame = effectiveStartFrame;
                        this.isPlaying = false;
                    }
                }
            } else {
                this.currentFrame++;
                if (this.currentFrame > effectiveEndFrame) {
                    if (this.looping) {
                        this.currentFrame = effectiveStartFrame;
                    } else {
                        this.currentFrame = effectiveEndFrame;
                        this.isPlaying = false;
                    }
                }
            }
        }
    }
    
    /**
     * Go to previous frame (respects start/end frame range)
     */
    previousFrame() {
        if (this.currentAnimation) {
            const anim = this.animations[this.currentAnimation];
            this._animationFrame--;
            
            if (this._animationFrame < 0) {
                if (anim.loop) {
                    const frameCount = anim.end - anim.start + 1;
                    this._animationFrame = frameCount - 1;
                    this.currentFrame = anim.end;
                } else {
                    this._animationFrame = 0;
                    this.currentFrame = anim.start;
                }
            } else {
                this.currentFrame = anim.start + this._animationFrame;
            }
        } else {
            // Use start/end frame range
            const effectiveEndFrame = this.endFrame >= 0 ? this.endFrame : (this.columns - 1);
            const effectiveStartFrame = Math.min(this.startFrame, effectiveEndFrame);
            
            this.currentFrame--;
            if (this.currentFrame < effectiveStartFrame) {
                if (this.looping) {
                    this.currentFrame = effectiveEndFrame;
                } else {
                    this.currentFrame = effectiveStartFrame;
                }
            }
        }
    }
    
    /**
     * Play the animation (resume or start)
     */
    play() {
        this.isPlaying = true;
    }
    
    /**
     * Pause the animation
     */
    pause() {
        this.isPlaying = false;
    }
    
    /**
     * Stop and reset the animation
     */
    stop() {
        this.isPlaying = false;
        this.currentFrame = this.startFrame;
        this._animationFrame = 0;
        this._frameTimer = 0;
        this._frameBlendFactor = 0;
        this._displayFrame = this.startFrame;
    }
    
    /**
     * Set the image path and reload
     * @param {string} path
     */
    setImage(path) {
        this.imagePath = path;
        this.loadImage();
    }
    
    /**
     * Set flip state
     * @param {boolean} flipX
     * @param {boolean} flipY
     */
    setFlip(flipX, flipY = null) {
        this.flipX = flipX;
        if (flipY !== null) {
            this.flipY = flipY;
        }
    }
    
    // ==================== PIXI.JS RENDERING ====================
    
    /**
     * Load sprite sheet and create frame textures for Pixi.js
     */
    async _loadPixiTextures() {
        const engine = this.gameObject._engine;
        if (!engine || !engine.pixiManager) {
            console.warn('SpriteSheetRenderer: Pixi.js manager not available');
            return;
        }
        
        // Clean up existing Pixi objects
        this._cleanupPixiObjects();
        
        if (!this.imagePath) return;
        
        try {
            // Get image source (same logic as PixiSprite)
            let cleanPath = this.imagePath;
            if (cleanPath.startsWith('blob://')) {
                cleanPath = cleanPath.replace('blob://', '');
            }
            const fileName = cleanPath.split('/').pop().split('\\').pop();
            
            let imageSource = null;
            
            if (engine.assets) {
                let img = engine.assets.getImage(fileName);
                if (!img && cleanPath !== fileName) {
                    img = engine.assets.getImage(cleanPath);
                }
                if (!img && engine.assets.images) {
                    for (const [key, mapImg] of engine.assets.images) {
                        if (key.endsWith(fileName) || key === fileName) {
                            img = mapImg;
                            break;
                        }
                    }
                }
                
                if (img && img instanceof HTMLImageElement) {
                    if (img.src.startsWith('data:')) {
                        imageSource = img.src;
                    } else {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth || img.width;
                            canvas.height = img.naturalHeight || img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            imageSource = canvas.toDataURL('image/png');
                        } catch (e) {
                            imageSource = img.src;
                        }
                    }
                }
            }
            
            if (!imageSource) {
                let normalizedPath = cleanPath.replace(/^\/+/, '');
                imageSource = normalizedPath.startsWith('files/') ? normalizedPath : 'files/' + normalizedPath;
            }
            
            // Load base texture
            this._pixiBaseTexture = await engine.pixiManager.loadTexture(imageSource);
            if (!this._pixiBaseTexture || !this._pixiBaseTexture.valid) {
                console.error(`SpriteSheetRenderer: Failed to load texture for "${fileName}"`);
                return;
            }
            
            // Calculate frame dimensions
            const imgWidth = this._pixiBaseTexture.width;
            const imgHeight = this._pixiBaseTexture.height;
            const frameWidth = imgWidth / this.columns;
            const frameHeight = imgHeight / this.rows;
            
            // Create frame textures for all frames
            this._pixiTextures = [];
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.columns; col++) {
                    const frame = new PIXI.Rectangle(
                        col * frameWidth,
                        row * frameHeight,
                        frameWidth,
                        frameHeight
                    );
                    const frameTexture = new PIXI.Texture(this._pixiBaseTexture.baseTexture, frame);
                    this._pixiTextures.push(frameTexture);
                }
            }
            
            // Create sprite with first frame
            this._pixiSprite = new PIXI.Sprite(this._pixiTextures[0]);
            this._pixiSprite.anchor.set(0.5, 0.5);
            
            // Add to stage
            const name = `spritesheet_${this.gameObject.name}_${this.gameObject._id || Date.now()}`;
            engine.pixiManager.add(this._pixiSprite, name);
            
            this._lastPixiImagePath = this.imagePath;
            this._pixiTextureLoaded = true;
            
            console.log(`SpriteSheetRenderer: Loaded Pixi.js spritesheet "${fileName}" (${this.columns}x${this.rows} = ${this._pixiTextures.length} frames)`);
        } catch (error) {
            console.error('SpriteSheetRenderer: Failed to load Pixi.js textures:', error);
            this._pixiTextureLoaded = false;
        }
    }
    
    /**
     * Update Pixi.js sprite each frame
     */
    _updatePixiSprite() {
        if (!this._pixiSprite) {
            // Try to load if not loaded yet
            if (this.imagePath && !this._pixiTextureLoaded) {
                this._loadPixiTextures();
            }
            return;
        }
        
        const engine = this.gameObject._engine;
        if (!engine || !engine.pixiManager) return;
        
        // Check if image path changed
        if (this._lastPixiImagePath !== this.imagePath) {
            this._loadPixiTextures();
            return;
        }
        
        // Calculate current frame texture index
        const frameIndex = this.currentRow * this.columns + this.currentFrame;
        if (frameIndex >= 0 && frameIndex < this._pixiTextures.length) {
            this._pixiSprite.texture = this._pixiTextures[frameIndex];
        }
        
        // Get world transform
        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.getWorldAngle();
        const worldScale = this.gameObject.getWorldScale();
        
        // Calculate display size
        const frameWidth = this._pixiBaseTexture ? this._pixiBaseTexture.width / this.columns : 0;
        const frameHeight = this._pixiBaseTexture ? this._pixiBaseTexture.height / this.rows : 0;
        const drawWidth = this.width > 0 ? this.width : frameWidth;
        const drawHeight = this.height > 0 ? this.height : frameHeight;
        
        // Update sprite transform
        this._pixiSprite.x = worldPos.x + this.offsetX;
        this._pixiSprite.y = worldPos.y + this.offsetY;
        this._pixiSprite.rotation = worldAngle;
        
        // Apply scale with flip
        const scaleX = (drawWidth / frameWidth) * worldScale.x * (this.flipX ? -1 : 1);
        const scaleY = (drawHeight / frameHeight) * worldScale.y * (this.flipY ? -1 : 1);
        this._pixiSprite.scale.set(scaleX, scaleY);
        
        // Apply visual properties
        this._pixiSprite.tint = this._hexToPixiTint(this.color);
        this._pixiSprite.alpha = this.alpha;
        this._pixiSprite.visible = this.enabled;
    }
    
    /**
     * Clean up Pixi.js objects
     */
    _cleanupPixiObjects() {
        const engine = this.gameObject?._engine;
        
        if (this._pixiSprite) {
            if (engine?.pixiManager) {
                engine.pixiManager.remove(this._pixiSprite);
            }
            this._pixiSprite.destroy();
            this._pixiSprite = null;
        }
        
        // Clean up frame textures (but not base texture - it's cached)
        for (const tex of this._pixiTextures) {
            tex.destroy(false); // Don't destroy base texture
        }
        this._pixiTextures = [];
        this._pixiBaseTexture = null;
        this._pixiTextureLoaded = false;
    }
    
    /**
     * Convert hex color string to Pixi tint number
     */
    _hexToPixiTint(hexColor) {
        if (!hexColor || hexColor === '#ffffff' || hexColor === '#fff') return 0xFFFFFF;
        const hex = hexColor.replace('#', '');
        return parseInt(hex, 16);
    }
    
    onDestroy() {
        this._cleanupPixiObjects();
    }
    
    /**
     * Calculate eased blend alpha based on easing type
     * @param {number} t - Linear progress (0-1)
     * @param {string} easing - Easing type
     * @returns {number} - Eased value (0-1)
     */
    _getEasedBlendAlpha(t, easing) {
        // Clamp t to 0-1 to prevent any out-of-bounds values
        t = Math.max(0, Math.min(1, t));
        
        switch (easing) {
            case 'linear':
                return t;
            case 'smoothstep':
                // Smoothstep (Hermite interpolation) - mathematically optimal for smooth transitions
                // Has zero first-derivative at both ends, meaning no sudden changes
                return t * t * (3 - 2 * t);
            case 'smootherstep':
                // Even smoother - zero first AND second derivative at both ends
                return t * t * t * (t * (t * 6 - 15) + 10);
            case 'sine':
                // Sine easing - smooth S-curve
                return (1 - Math.cos(t * Math.PI)) / 2;
            case 'ease-in':
                // Quadratic ease in - slow start
                return t * t;
            case 'ease-out':
                // Quadratic ease out - slow end
                return 1 - (1 - t) * (1 - t);
            case 'ease-in-out':
                // Cubic ease in-out - slow start and end
                return t < 0.5 
                    ? 4 * t * t * t 
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'elastic':
                // Elastic - overshoots slightly
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
            default:
                // Default to smoothstep
                return t * t * (3 - 2 * t);
        }
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
    
    // ==================== SERIALIZATION ======================================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'SpriteSheetRenderer';
        json.usePixiJS = this.usePixiJS;
        json.imagePath = this.imagePath;
        json.columns = this.columns;
        json.rows = this.rows;
        json.currentRow = this.currentRow;
        json.currentFrame = this.currentFrame;
        json.startFrame = this.startFrame;
        json.endFrame = this.endFrame;
        json.animationSpeed = this.animationSpeed;
        json.looping = this.looping;
        json.autoPlay = this.autoPlay;
        json.reverseAnimation = this.reverseAnimation;
        json.frameTweening = this.frameTweening;
        json.tweenDuration = this.tweenDuration;
        json.tweenEasing = this.tweenEasing;
        json.loopTweening = this.loopTweening;
        json.crossfadeMode = this.crossfadeMode;
        json.blendStrength = this.blendStrength;
        json.flipX = this.flipX;
        json.flipY = this.flipY;
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.width = this.width;
        json.height = this.height;
        json.alpha = this.alpha;
        json.color = this.color;
        json.animations = this.animations;
        json.currentAnimation = this.currentAnimation;
        json.isPlaying = this.isPlaying;

        json.smoothing = this.smoothing;
        
        // Blend effects
        json.blendEasing = this.blendEasing;
        json.blendScaleBounce = this.blendScaleBounce;
        json.blendScaleAmount = this.blendScaleAmount;
        json.blendGhostFrames = this.blendGhostFrames;
        json.blendGhostCount = this.blendGhostCount;
        json.blendColorFlash = this.blendColorFlash;
        json.blendFlashColor = this.blendFlashColor;
        json.blendFlashIntensity = this.blendFlashIntensity;
        
        // TDTD
        json.tdtdEnabled = this.tdtdEnabled;
        json.tdtdZ = this.tdtdZ;
        json.tdtdAnchorY = this.tdtdAnchorY;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new SpriteSheetRenderer();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.usePixiJS = json.usePixiJS || false;
        module.imagePath = json.imagePath || '';
        
        // Support both old and new property names
        module.columns = json.columns !== undefined ? json.columns : (json.framesPerRow || 1);
        module.rows = json.rows !== undefined ? json.rows : 1;
        module.currentRow = json.currentRow !== undefined ? json.currentRow : 0;
        
        module.currentFrame = json.currentFrame !== undefined ? json.currentFrame : 0;
        module.startFrame = json.startFrame !== undefined ? json.startFrame : 0;
        module.endFrame = json.endFrame !== undefined ? json.endFrame : -1;
        module.animationSpeed = json.animationSpeed !== undefined ? json.animationSpeed : 10;
        module.looping = json.looping !== undefined ? json.looping : (json.loop !== undefined ? json.loop : true);
        module.autoPlay = json.autoPlay !== undefined ? json.autoPlay : true;
        module.reverseAnimation = json.reverseAnimation !== undefined ? json.reverseAnimation : false;
        module.frameTweening = json.frameTweening !== undefined ? json.frameTweening : false;
        module.tweenDuration = json.tweenDuration !== undefined ? json.tweenDuration : 0.8;
        module.tweenEasing = json.tweenEasing !== undefined ? json.tweenEasing : 'smoothstep';
        module.loopTweening = json.loopTweening !== undefined ? json.loopTweening : true;
        module.crossfadeMode = json.crossfadeMode !== undefined ? json.crossfadeMode : 'dissolve';
        module.blendStrength = json.blendStrength !== undefined ? json.blendStrength : 1.0;
        module.flipX = json.flipX || false;
        module.flipY = json.flipY || false;
        module.offsetX = json.offsetX !== undefined ? json.offsetX : 0;
        module.offsetY = json.offsetY !== undefined ? json.offsetY : 0;
        module.width = json.width !== undefined ? json.width : 0;
        module.height = json.height !== undefined ? json.height : 0;
        module.alpha = json.alpha !== undefined ? json.alpha : 1;
        module.color = json.color || '#ffffff';
        module.animations = json.animations || {};
        module.currentAnimation = json.currentAnimation || null;
        
        // Ensure isPlaying is set based on autoPlay (critical for animation to work)
        // If isPlaying was explicitly saved, use that, otherwise use autoPlay
        module.isPlaying = json.isPlaying !== undefined ? json.isPlaying : module.autoPlay;

        module.smoothing = json.smoothing !== undefined ? json.smoothing : false;
        
        // Blend effects
        module.blendEasing = json.blendEasing !== undefined ? json.blendEasing : 'sine';
        module.blendScaleBounce = json.blendScaleBounce !== undefined ? json.blendScaleBounce : false;
        module.blendScaleAmount = json.blendScaleAmount !== undefined ? json.blendScaleAmount : 0.05;
        module.blendGhostFrames = json.blendGhostFrames !== undefined ? json.blendGhostFrames : false;
        module.blendGhostCount = json.blendGhostCount !== undefined ? json.blendGhostCount : 2;
        module.blendColorFlash = json.blendColorFlash !== undefined ? json.blendColorFlash : false;
        module.blendFlashColor = json.blendFlashColor !== undefined ? json.blendFlashColor : '#ffffff';
        module.blendFlashIntensity = json.blendFlashIntensity !== undefined ? json.blendFlashIntensity : 0.3;
        
        // TDTD
        module.tdtdEnabled = json.tdtdEnabled ?? false;
        module.tdtdZ = json.tdtdZ ?? 0;
        module.tdtdAnchorY = json.tdtdAnchorY ?? 1;
        
        return module;
    }
    
    clone() {
        const cloned = new SpriteSheetRenderer();
        cloned.usePixiJS = this.usePixiJS;
        cloned.imagePath = this.imagePath;
        cloned.columns = this.columns;
        cloned.rows = this.rows;
        cloned.currentRow = this.currentRow;
        cloned.currentFrame = this.currentFrame;
        cloned.startFrame = this.startFrame;
        cloned.endFrame = this.endFrame;
        cloned.animationSpeed = this.animationSpeed;
        cloned.looping = this.looping;
        cloned.autoPlay = this.autoPlay;
        cloned.reverseAnimation = this.reverseAnimation;
        cloned.frameTweening = this.frameTweening;
        cloned.tweenDuration = this.tweenDuration;
        cloned.tweenEasing = this.tweenEasing;
        cloned.loopTweening = this.loopTweening;
        cloned.crossfadeMode = this.crossfadeMode;
        cloned.blendStrength = this.blendStrength;
        cloned.flipX = this.flipX;
        cloned.flipY = this.flipY;
        cloned.offsetX = this.offsetX;
        cloned.offsetY = this.offsetY;
        cloned.width = this.width;
        cloned.height = this.height;
        cloned.alpha = this.alpha;
        cloned.color = this.color;
        cloned.animations = JSON.parse(JSON.stringify(this.animations));
        cloned.currentAnimation = this.currentAnimation;
        cloned.isPlaying = this.isPlaying;
        cloned.enabled = this.enabled;

        cloned.smoothing = this.smoothing;
        
        // Blend effects
        cloned.blendEasing = this.blendEasing;
        cloned.blendScaleBounce = this.blendScaleBounce;
        cloned.blendScaleAmount = this.blendScaleAmount;
        cloned.blendGhostFrames = this.blendGhostFrames;
        cloned.blendGhostCount = this.blendGhostCount;
        cloned.blendColorFlash = this.blendColorFlash;
        cloned.blendFlashColor = this.blendFlashColor;
        cloned.blendFlashIntensity = this.blendFlashIntensity;
        
        // TDTD
        cloned.tdtdEnabled = this.tdtdEnabled;
        cloned.tdtdZ = this.tdtdZ;
        cloned.tdtdAnchorY = this.tdtdAnchorY;
        
        return cloned;
    }

    // ==================== TDTD BILLBOARD RENDERING ====================

    /**
     * Draw the current sprite sheet frame as a TDTD billboard (depth-sorted in fake 3D)
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

        // Calculate frame dimensions
        const imgWidth = image.naturalWidth || image.width;
        const imgHeight = image.naturalHeight || image.height;
        const actualFrameWidth = imgWidth / this.columns;
        const actualFrameHeight = imgHeight / this.rows;

        // Current frame source rect
        const col = this.currentFrame % this.columns;
        const row = this.currentRow;
        const sx = Math.floor(col * actualFrameWidth);
        const sy = Math.floor(row * actualFrameHeight);
        const srcWidth = Math.floor(actualFrameWidth);
        const srcHeight = Math.floor(actualFrameHeight);

        // Destination size
        const drawWidth = this.width > 0 ? this.width : actualFrameWidth;
        const drawHeight = this.height > 0 ? this.height : actualFrameHeight;

        const worldPos = this.gameObject.getWorldPosition();
        const wx = worldPos.x + this.offsetX;
        const wy = worldPos.y + this.offsetY;
        const wz = this.tdtdZ;

        // Create an offscreen canvas for the current frame to pass to drawBillboard
        if (!this._tdtdFrameCanvas || this._tdtdFrameCanvas.width !== srcWidth || this._tdtdFrameCanvas.height !== srcHeight) {
            this._tdtdFrameCanvas = document.createElement('canvas');
            this._tdtdFrameCanvas.width = srcWidth;
            this._tdtdFrameCanvas.height = srcHeight;
            this._tdtdFrameCtx = this._tdtdFrameCanvas.getContext('2d');
        }

        const fCtx = this._tdtdFrameCtx;
        fCtx.clearRect(0, 0, srcWidth, srcHeight);
        fCtx.imageSmoothingEnabled = this.smoothing;
        fCtx.drawImage(image, sx, sy, srcWidth, srcHeight, 0, 0, srcWidth, srcHeight);

        // Ensure TDTD batch mode is active so this billboard is depth-sorted
        // together with grid cells and other TDTD objects
        if (!tdtd._batchMode) {
            tdtd.beginBatch();
        }
        tdtd._needsFlush = true;

        tdtd.drawBillboard(this._tdtdFrameCanvas, wx, wy, wz, {
            width: drawWidth,
            height: drawHeight,
            anchorX: 0.5,
            anchorY: this.tdtdAnchorY,
            alpha: this.alpha,
            flipX: this.flipX,
            flipY: this.flipY
        }, ctx);
    }

    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>🎬 SpriteSheetRenderer Overview</h2>
            <p>The <strong>SpriteSheetRenderer</strong> module renders animated sprites from sprite sheet images. It supports multiple animations organized in a grid layout:</p>
            <ul>
                <li><strong>Columns</strong> = animation frames (left to right →)</li>
                <li><strong>Rows</strong> = different animations (top to bottom ↓)</li>
            </ul>
            <p>Frame size is automatically calculated: <code>imageWidth / columns</code> × <code>imageHeight / rows</code>.</p>

            <h3>Sprite Sheet Layout Example</h3>
            <p>For a 512×256 image with 4 columns and 2 rows:</p>
            <table>
                <tr><th></th><th>Col 0</th><th>Col 1</th><th>Col 2</th><th>Col 3</th></tr>
                <tr><td><strong>Row 0</strong> (e.g. Idle)</td><td>Frame 0</td><td>Frame 1</td><td>Frame 2</td><td>Frame 3</td></tr>
                <tr><td><strong>Row 1</strong> (e.g. Walk)</td><td>Frame 0</td><td>Frame 1</td><td>Frame 2</td><td>Frame 3</td></tr>
            </table>
            <p>Each frame would be 128×128 pixels.</p>

            <div class="tip">Set <code>columns</code> and <code>rows</code> to match your sprite sheet grid. The renderer does the rest automatically.</div>
        `,

        "Basic Setup": `
            <h2>⚡ Basic Setup</h2>
            <p>To get a sprite sheet animation running, you only need a few properties:</p>

            <h3>In the Prefab Editor</h3>
            <ol>
                <li>Add a <strong>SpriteSheetRenderer</strong> module to your GameObject</li>
                <li>Set the <strong>Image</strong> to your sprite sheet file</li>
                <li>Set <strong>Columns</strong> to the number of frames per row</li>
                <li>Set <strong>Rows</strong> to the number of animation rows</li>
                <li>Set <strong>Current Row</strong> to choose which animation to play</li>
                <li>Adjust <strong>Speed (FPS)</strong> as needed (default: 10)</li>
            </ol>

            <h3>Minimal Code Example</h3>
            <p>If you want to configure it programmatically from another module's <code>start()</code>:</p>
            <pre><code>start() {
    const sprite = this.getModule('SpriteSheetRenderer');
    sprite.imagePath = 'my-spritesheet.png';
    sprite.columns = 6;   // 6 frames per animation
    sprite.rows = 4;      // 4 different animations
    sprite.currentRow = 0; // Play the first animation
    sprite.animationSpeed = 12;
}</code></pre>

            <div class="tip">Set <code>autoPlay</code> to <code>true</code> (the default) so animation starts immediately when the scene loads.</div>
        `,

        "Named Animations": `
            <h2>🎭 Named Animations</h2>
            <p>For characters with multiple animations (idle, walk, run, attack, etc.), use the <strong>named animation system</strong>. This lets you define and switch between animations by name.</p>

            <h3>Defining Animations</h3>
            <pre><code>// addAnimation(name, row, startFrame, endFrame, speed, loop)
start() {
    const sprite = this.getModule('SpriteSheetRenderer');
    sprite.columns = 8;
    sprite.rows = 4;

    // Define animations
    sprite.addAnimation('idle',   0, 0, 3, 8, true);   // Row 0, frames 0-3, 8fps, looping
    sprite.addAnimation('walk',   1, 0, 7, 12, true);   // Row 1, frames 0-7, 12fps, looping
    sprite.addAnimation('attack', 2, 0, 5, 15, false);  // Row 2, frames 0-5, 15fps, no loop
    sprite.addAnimation('death',  3, 0, 6, 10, false);  // Row 3, frames 0-6, 10fps, no loop

    // Play an animation
    sprite.playAnimation('idle');
}</code></pre>

            <h3>addAnimation Parameters</h3>
            <table>
                <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                <tr><td><code>name</code></td><td>string</td><td>Animation name (used to play it)</td></tr>
                <tr><td><code>row</code></td><td>number</td><td>Which row of the sprite sheet (0-based)</td></tr>
                <tr><td><code>startFrame</code></td><td>number</td><td>Starting frame index (default: 0)</td></tr>
                <tr><td><code>endFrame</code></td><td>number</td><td>Ending frame index (default: columns-1)</td></tr>
                <tr><td><code>speed</code></td><td>number</td><td>FPS for this animation (default: uses animationSpeed)</td></tr>
                <tr><td><code>loop</code></td><td>boolean</td><td>Whether to loop (default: uses looping property)</td></tr>
            </table>

            <h3>Switching Animations</h3>
            <pre><code>loop(dt) {
    const sprite = this.getModule('SpriteSheetRenderer');

    if (this.isMoving) {
        sprite.playAnimation('walk');  // Won't restart if already playing
    } else {
        sprite.playAnimation('idle');
    }

    // Force restart an animation
    sprite.playAnimation('attack', true); // true = restart even if already playing
}</code></pre>

            <div class="tip"><code>playAnimation()</code> is smart — it won't restart if the same animation is already playing. Pass <code>true</code> as the second argument to force restart.</div>
        `,

        "Playback Control": `
            <h2>▶️ Playback Control</h2>
            <p>Control animation playback with these methods:</p>

            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>play()</code></td><td>Resume/start animation playback</td></tr>
                <tr><td><code>pause()</code></td><td>Pause animation (keeps current frame)</td></tr>
                <tr><td><code>stop()</code></td><td>Stop and reset to start frame</td></tr>
                <tr><td><code>playAnimation(name)</code></td><td>Play a named animation</td></tr>
                <tr><td><code>stopAnimation()</code></td><td>Stop and clear named animation</td></tr>
                <tr><td><code>pauseAnimation()</code></td><td>Pause current named animation</td></tr>
                <tr><td><code>resumeAnimation()</code></td><td>Resume paused animation</td></tr>
                <tr><td><code>setFrame(n)</code></td><td>Jump to a specific frame</td></tr>
                <tr><td><code>nextFrame()</code></td><td>Advance one frame</td></tr>
                <tr><td><code>previousFrame()</code></td><td>Go back one frame</td></tr>
            </table>

            <h3>Checking Animation State</h3>
            <pre><code>const sprite = this.getModule('SpriteSheetRenderer');

// Check if a specific animation is playing
if (sprite.isAnimationPlaying('attack')) {
    // Attack animation is currently active
}

// Get current animation name (null if none)
const current = sprite.getCurrentAnimation();

// Check playback state
if (sprite.isPlaying) {
    // Currently animating
}

// Read current frame directly
console.log('Frame:', sprite.currentFrame);
console.log('Row:', sprite.currentRow);</code></pre>

            <h3>Manual Frame Control</h3>
            <pre><code>// Use as a still image (no auto-advance)
sprite.autoPlay = false;
sprite.isPlaying = false;
sprite.currentRow = 2;
sprite.setFrame(3); // Show row 2, frame 3

// Step through frames manually
sprite.nextFrame();     // Go to next frame
sprite.previousFrame(); // Go back one frame</code></pre>
        `,

        "Rendering Options": `
            <h2>🎨 Rendering Options</h2>

            <h3>Flipping</h3>
            <pre><code>const sprite = this.getModule('SpriteSheetRenderer');

// Flip horizontally (e.g., face left vs right)
sprite.flipX = true;

// Flip vertically
sprite.flipY = true;

// Or use the helper method
sprite.setFlip(true, false); // flipX=true, flipY=false</code></pre>

            <h3>Offset & Size</h3>
            <pre><code>sprite.offsetX = 10;  // Shift drawing position
sprite.offsetY = -5;

// Override the auto-calculated frame size
sprite.width = 64;   // 0 = use auto size
sprite.height = 64;</code></pre>

            <h3>Opacity & Tint</h3>
            <pre><code>sprite.alpha = 0.5;          // Half transparent
sprite.color = '#ff0000';   // Red tint (multiply blend)
sprite.color = '#ffffff';   // No tint (default)</code></pre>

            <h3>Image Smoothing</h3>
            <pre><code>// For pixel art, keep smoothing OFF (default)
sprite.smoothing = false;

// For high-res art, enable smoothing
sprite.smoothing = true;</code></pre>

            <div class="tip">Tint color uses multiply blending — <code>#ffffff</code> means no tint. Use colors to colorize sprites at runtime (e.g., team colors).</div>
        `,

        "Frame Tweening": `
            <h2>🔀 Frame Tweening</h2>
            <p>Frame tweening creates smooth crossfades between animation frames, making lower-FPS animations appear smoother.</p>

            <h3>Enable Tweening</h3>
            <pre><code>const sprite = this.getModule('SpriteSheetRenderer');
sprite.frameTweening = true;
sprite.tweenDuration = 0.8;       // 80% of frame time spent blending
sprite.tweenEasing = 'smoothstep'; // Easing function
sprite.loopTweening = true;       // Smooth loop restarts</code></pre>

            <h3>Crossfade Modes</h3>
            <table>
                <tr><th>Mode</th><th>Description</th></tr>
                <tr><td><code>dissolve</code></td><td>True blend — both frames contribute proportionally</td></tr>
                <tr><td><code>overlay</code></td><td>Next frame shows fully, current fades out on top</td></tr>
                <tr><td><code>additive</code></td><td>Bright blend — both frames add together during transition</td></tr>
            </table>

            <h3>Easing Options</h3>
            <p>Available easing functions for <code>tweenEasing</code>:</p>
            <ul>
                <li><strong>smoothstep</strong> — Hermite interpolation, optimal for most uses (default)</li>
                <li><strong>sine</strong> — Smooth S-curve</li>
                <li><strong>linear</strong> — Constant speed</li>
                <li><strong>ease-in</strong> — Slow start</li>
                <li><strong>ease-out</strong> — Slow end</li>
                <li><strong>ease-in-out</strong> — Slow start and end</li>
            </ul>

            <div class="tip">Frame tweening works best at lower FPS values (4-15). At high FPS, the individual frames already change fast enough.</div>
        `,

        "Blend Effects": `
            <h2>✨ Blend Effects</h2>
            <p>These effects trigger during animation transitions (mainly when switching between named animations).</p>

            <h3>Scale Bounce</h3>
            <p>Adds a subtle scale pulse during transitions:</p>
            <pre><code>sprite.blendScaleBounce = true;
sprite.blendScaleAmount = 0.05; // 5% bounce (0.01 to 0.3)</code></pre>

            <h3>Ghost Frames</h3>
            <p>Shows trailing afterimages of the previous animation frame:</p>
            <pre><code>sprite.blendGhostFrames = true;
sprite.blendGhostCount = 2; // Number of ghost frames (1-5)</code></pre>

            <h3>Color Flash</h3>
            <p>Brief color overlay at the peak of the transition:</p>
            <pre><code>sprite.blendColorFlash = true;
sprite.blendFlashColor = '#ffffff'; // Flash color
sprite.blendFlashIntensity = 0.3;   // 0-1 intensity</code></pre>

            <h3>Blend Easing</h3>
            <p>Controls how the transition timing feels:</p>
            <ul>
                <li><code>linear</code>, <code>sine</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code>, <code>elastic</code></li>
            </ul>
            <pre><code>sprite.blendEasing = 'elastic'; // Overshoots slightly for punch effect</code></pre>
        `,

        "Full Example Module": `
            <h2>📝 Full Example: Character Controller</h2>
            <p>Here's a complete module that uses SpriteSheetRenderer to animate a character with idle, walk, and attack animations:</p>

            <pre><code>class CharacterAnimator extends Module {
    constructor() {
        super();
        this.moveSpeed = 150;
        this.isAttacking = false;
    }

    start() {
        // Get the SpriteSheetRenderer on this same GameObject
        this.sprite = this.getModule('SpriteSheetRenderer');

        // Configure the sprite sheet (8 columns, 3 rows)
        this.sprite.columns = 8;
        this.sprite.rows = 3;
        this.sprite.animationSpeed = 10;
        this.sprite.smoothing = false; // pixel art

        // Define named animations
        this.sprite.addAnimation('idle',   0, 0, 3, 8, true);
        this.sprite.addAnimation('walk',   1, 0, 7, 12, true);
        this.sprite.addAnimation('attack', 2, 0, 5, 16, false);

        // Start with idle
        this.sprite.playAnimation('idle');
    }

    loop(dt) {
        // Don't move while attacking
        if (this.isAttacking) {
            // Check if attack animation finished
            if (!this.sprite.isPlaying) {
                this.isAttacking = false;
                this.sprite.playAnimation('idle');
            }
            return;
        }

        // Movement with keyboard
        const input = this.gameObject._engine.input;
        let dx = 0;

        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
            dx = -1;
            this.sprite.flipX = true; // Face left
        }
        if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
            dx = 1;
            this.sprite.flipX = false; // Face right
        }

        // Move
        if (dx !== 0) {
            this.gameObject.x += dx * this.moveSpeed * dt;
            this.sprite.playAnimation('walk');
        } else {
            this.sprite.playAnimation('idle');
        }

        // Attack on Space
        if (input.isKeyPressed('Space')) {
            this.isAttacking = true;
            this.sprite.playAnimation('attack', true);
        }
    }
}</code></pre>

            <div class="tip">The <code>SpriteSheetRenderer</code> must be on the same GameObject. Use <code>this.getModule('SpriteSheetRenderer')</code> to access it from your custom module.</div>

            <div class="warning">When checking if a non-looping animation is done, check <code>sprite.isPlaying</code> — it becomes <code>false</code> when the last frame is reached.</div>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>

            <h3>Sprite Sheet</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>imagePath</code></td><td>string</td><td>''</td><td>Path to the sprite sheet image</td></tr>
                <tr><td><code>columns</code></td><td>number</td><td>1</td><td>Frames per row (horizontal)</td></tr>
                <tr><td><code>rows</code></td><td>number</td><td>1</td><td>Number of animation rows (vertical)</td></tr>
            </table>

            <h3>Animation</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>currentRow</code></td><td>number</td><td>0</td><td>Active animation row</td></tr>
                <tr><td><code>currentFrame</code></td><td>number</td><td>0</td><td>Current frame index</td></tr>
                <tr><td><code>startFrame</code></td><td>number</td><td>0</td><td>First frame in range</td></tr>
                <tr><td><code>endFrame</code></td><td>number</td><td>-1</td><td>Last frame in range (-1 = last column)</td></tr>
                <tr><td><code>animationSpeed</code></td><td>number</td><td>10</td><td>Frames per second</td></tr>
                <tr><td><code>looping</code></td><td>boolean</td><td>true</td><td>Loop the animation</td></tr>
                <tr><td><code>autoPlay</code></td><td>boolean</td><td>true</td><td>Start playing automatically</td></tr>
                <tr><td><code>reverseAnimation</code></td><td>boolean</td><td>false</td><td>Play in reverse direction</td></tr>
            </table>

            <h3>Rendering</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>flipX</code></td><td>boolean</td><td>false</td><td>Mirror horizontally</td></tr>
                <tr><td><code>flipY</code></td><td>boolean</td><td>false</td><td>Mirror vertically</td></tr>
                <tr><td><code>offsetX/Y</code></td><td>number</td><td>0</td><td>Drawing offset in pixels</td></tr>
                <tr><td><code>width</code></td><td>number</td><td>0</td><td>Override width (0 = auto)</td></tr>
                <tr><td><code>height</code></td><td>number</td><td>0</td><td>Override height (0 = auto)</td></tr>
                <tr><td><code>alpha</code></td><td>number</td><td>1</td><td>Opacity (0-1)</td></tr>
                <tr><td><code>color</code></td><td>string</td><td>'#ffffff'</td><td>Tint color (multiply blend)</td></tr>
                <tr><td><code>smoothing</code></td><td>boolean</td><td>false</td><td>Image smoothing (off for pixel art)</td></tr>
            </table>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>addAnimation(name, row, start, end, speed, loop)</code></td><td>void</td><td>Define a named animation</td></tr>
                <tr><td><code>playAnimation(name, restart?)</code></td><td>void</td><td>Play named animation</td></tr>
                <tr><td><code>stopAnimation()</code></td><td>void</td><td>Stop and clear current animation</td></tr>
                <tr><td><code>pauseAnimation()</code></td><td>void</td><td>Pause playback</td></tr>
                <tr><td><code>resumeAnimation()</code></td><td>void</td><td>Resume playback</td></tr>
                <tr><td><code>isAnimationPlaying(name)</code></td><td>boolean</td><td>Check if specific animation is playing</td></tr>
                <tr><td><code>getCurrentAnimation()</code></td><td>string|null</td><td>Get current animation name</td></tr>
                <tr><td><code>play()</code></td><td>void</td><td>Resume animation</td></tr>
                <tr><td><code>pause()</code></td><td>void</td><td>Pause animation</td></tr>
                <tr><td><code>stop()</code></td><td>void</td><td>Stop and reset</td></tr>
                <tr><td><code>setFrame(frame)</code></td><td>void</td><td>Jump to specific frame</td></tr>
                <tr><td><code>nextFrame()</code></td><td>void</td><td>Advance one frame</td></tr>
                <tr><td><code>previousFrame()</code></td><td>void</td><td>Go back one frame</td></tr>
                <tr><td><code>setImage(path)</code></td><td>void</td><td>Change sprite sheet image</td></tr>
                <tr><td><code>setFlip(flipX, flipY?)</code></td><td>void</td><td>Set flip state</td></tr>
            </table>
        `
    };
}

// Register module globally
if (typeof window !== 'undefined') {
    window.SpriteSheetRenderer = SpriteSheetRenderer;
}
