/**
 * ContainWithinScene Module
 * Keeps game objects within the scene boundaries or wraps them to the opposite side.
 * 
 * Features:
 * - Contain Mode: Prevents object from leaving scene bounds (uses collider if available)
 * - Wrap Mode: Teleports object to opposite side of scene when leaving bounds
 * - Supports BoxCollider and SphereCollider for accurate containment
 * - Falls back to position (x/y) if no collider is present
 * - Camera-aware: Instantly jumps viewport when wrapping (no lerp across scene)
 */
class ContainWithinScene extends Module {
    static is2D = true;
    static isPixi = true;
    static namespace = 'Core,Movement';
    static priority = 100; // Run after most movement modules

    constructor() {
        super();
        
        // ==================== MODE SETTINGS ====================
        this.containMode = 'contain'; // 'contain', 'wrap', 'none'
        
        // ==================== CONTAIN SETTINGS ====================
        this.bounceOnEdge = false;         // Reverse velocity when hitting edge (requires Rigidbody)
        this.bounceMultiplier = 1.0;       // Velocity multiplier on bounce (1 = full, 0.5 = half)
        
        // ==================== WRAP SETTINGS ====================
        this.wrapMargin = 0;               // Extra margin before wrap triggers
        this.jumpCameraOnWrap = true;      // If object has Camera module, jump viewport instantly
        
        // ==================== EDGE OPTIONS ====================
        this.containLeft = true;
        this.containRight = true;
        this.containTop = true;
        this.containBottom = true;
        
        // ==================== DEBUG ====================
        this.showDebugBounds = false;
        this.debugColor = '#ff00ff';
        
        // ==================== INTERNAL ====================
        this._lastWrapX = 0;
        this._lastWrapY = 0;
    }

    static getIcon() { return '📦'; }

    static getDescription() {
        return 'Keeps game objects within scene bounds or wraps them to the opposite side';
    }

    // ==================== PROPERTY METADATA ====================
    
    getPropertyMetadata() {
        return [
            // ══════════════════════════════════════════════════════════════
            // MODE
            // ══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎮 Mode' },
            
                { 
                    type: 'hint', 
                    label: 'How the object behaves when reaching scene edges' 
                },
                { 
                    key: 'containMode', 
                    label: '📋 Mode', 
                    type: 'select', 
                    options: {
                        'contain': 'Contain (Stop at Edge)',
                        'wrap': 'Wrap (Teleport to Opposite)',
                        'none': 'None (Disabled)'
                    },
                    default: 'contain'
                },
            
            { type: 'groupEnd' },

            // ══════════════════════════════════════════════════════════════
            // CONTAIN SETTINGS
            // ══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🛑 Contain Settings', showIf: { containMode: 'contain' } },
            
                { 
                    type: 'hint', 
                    label: 'Uses BoxCollider/SphereCollider bounds if present, otherwise uses position' 
                },
                { 
                    key: 'bounceOnEdge', 
                    label: '🏀 Bounce on Edge', 
                    type: 'boolean', 
                    default: false,
                    hint: 'Reverse velocity when hitting edge (requires Rigidbody)'
                },
                { 
                    key: 'bounceMultiplier', 
                    label: '💪 Bounce Multiplier', 
                    type: 'slider', 
                    default: 1.0, 
                    min: 0, 
                    max: 2, 
                    step: 0.1,
                    hint: 'Velocity retention on bounce (1 = full, 0.5 = half)',
                    showIf: { bounceOnEdge: true }
                },
            
            { type: 'groupEnd' },

            // ══════════════════════════════════════════════════════════════
            // WRAP SETTINGS
            // ══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🔄 Wrap Settings', showIf: { containMode: 'wrap' } },
            
                { 
                    type: 'hint', 
                    label: 'Wrap uses position (x/y) for teleport, not collider bounds' 
                },
                { 
                    key: 'wrapMargin', 
                    label: '📏 Wrap Margin', 
                    type: 'number', 
                    default: 0, 
                    min: 0, 
                    max: 500,
                    hint: 'Extra distance past edge before wrap triggers'
                },
                { 
                    key: 'jumpCameraOnWrap', 
                    label: '📷 Jump Camera', 
                    type: 'boolean', 
                    default: true,
                    hint: 'If this object has a Camera module, instantly jump viewport (no lerp)'
                },
            
            { type: 'groupEnd' },

            // ══════════════════════════════════════════════════════════════
            // EDGE OPTIONS
            // ══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🧱 Edge Options', showIf: { containMode: ['contain', 'wrap'] } },
            
                { 
                    type: 'hint', 
                    label: 'Select which edges to apply containment/wrapping' 
                },
                { 
                    key: 'containLeft', 
                    label: '⬅️ Left Edge', 
                    type: 'boolean', 
                    default: true
                },
                { 
                    key: 'containRight', 
                    label: '➡️ Right Edge', 
                    type: 'boolean', 
                    default: true
                },
                { 
                    key: 'containTop', 
                    label: '⬆️ Top Edge', 
                    type: 'boolean', 
                    default: true
                },
                { 
                    key: 'containBottom', 
                    label: '⬇️ Bottom Edge', 
                    type: 'boolean', 
                    default: true
                },
            
            { type: 'groupEnd' },

            // ══════════════════════════════════════════════════════════════
            // DEBUG
            // ══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🐛 Debug' },
            
                { 
                    key: 'showDebugBounds', 
                    label: '👁️ Show Debug Bounds', 
                    type: 'boolean', 
                    default: false
                },
                { 
                    key: 'debugColor', 
                    label: '🎨 Debug Color', 
                    type: 'color', 
                    default: '#ff00ff',
                    showIf: { showDebugBounds: true }
                },
            
            { type: 'groupEnd' },
        ];
    }

    // ==================== LIFECYCLE METHODS ====================

    loop(deltaTime) {
        if (this.containMode === 'none') return;
        
        const engine = this.gameObject._engine;
        if (!engine) return;
        
        const sceneWidth = engine.sceneWidth;
        const sceneHeight = engine.sceneHeight;
        
        // Don't perform if scene has no bounds
        if (!sceneWidth || sceneWidth <= 0 || !sceneHeight || sceneHeight <= 0) return;
        
        if (this.containMode === 'contain') {
            this._performContain(sceneWidth, sceneHeight);
        } else if (this.containMode === 'wrap') {
            this._performWrap(sceneWidth, sceneHeight);
        }
    }

    draw(ctx) {
        // Debug visualization
        if (!this.showDebugBounds) return;
        
        const engine = this.gameObject._engine;
        if (!engine) return;
        
        const sceneWidth = engine.sceneWidth;
        const sceneHeight = engine.sceneHeight;
        
        if (!sceneWidth || !sceneHeight) return;
        
        // Draw scene bounds
        ctx.save();
        
        // Reset transform to draw in world space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const viewport = engine.viewport || { x: 0, y: 0, zoom: 1 };
        const zoom = viewport.zoom || 1;
        
        ctx.strokeStyle = this.debugColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const screenX = -viewport.x * zoom;
        const screenY = -viewport.y * zoom;
        
        ctx.strokeRect(
            screenX,
            screenY,
            sceneWidth * zoom,
            sceneHeight * zoom
        );
        
        ctx.restore();
    }

    // ==================== CONTAIN LOGIC ====================

    /**
     * Contain the object within scene bounds using collider if available
     */
    _performContain(sceneWidth, sceneHeight) {
        const collider = this._getCollider();
        const rigidbody = this.getModule('Rigidbody');
        
        let bounds;
        
        if (collider) {
            bounds = this._getColliderBounds(collider);
        } else {
            // Use position as a point
            bounds = {
                left: this.x,
                right: this.x,
                top: this.y,
                bottom: this.y,
                centerX: this.x,
                centerY: this.y,
                width: 0,
                height: 0
            };
        }
        
        let hitLeft = false, hitRight = false, hitTop = false, hitBottom = false;
        
        // Check and clamp left edge
        if (this.containLeft && bounds.left < 0) {
            const correction = -bounds.left;
            this.x += correction;
            hitLeft = true;
        }
        
        // Check and clamp right edge
        if (this.containRight && bounds.right > sceneWidth) {
            const correction = bounds.right - sceneWidth;
            this.x -= correction;
            hitRight = true;
        }
        
        // Check and clamp top edge
        if (this.containTop && bounds.top < 0) {
            const correction = -bounds.top;
            this.y += correction;
            hitTop = true;
        }
        
        // Check and clamp bottom edge
        if (this.containBottom && bounds.bottom > sceneHeight) {
            const correction = bounds.bottom - sceneHeight;
            this.y -= correction;
            hitBottom = true;
        }
        
        // Apply bounce if enabled and we have a rigidbody
        if (this.bounceOnEdge && rigidbody) {
            if ((hitLeft || hitRight) && rigidbody.velocityX !== undefined) {
                rigidbody.velocityX = -rigidbody.velocityX * this.bounceMultiplier;
            }
            if ((hitTop || hitBottom) && rigidbody.velocityY !== undefined) {
                rigidbody.velocityY = -rigidbody.velocityY * this.bounceMultiplier;
            }
        }
    }

    // ==================== WRAP LOGIC ====================

    /**
     * Wrap the object to the opposite side of the scene
     */
    _performWrap(sceneWidth, sceneHeight) {
        const x = this.x;
        const y = this.y;
        const margin = this.wrapMargin;
        
        let wrapped = false;
        let newX = x;
        let newY = y;
        let wrapDeltaX = 0;
        let wrapDeltaY = 0;
        
        // Check left edge - wrap to right
        if (this.containLeft && x < -margin) {
            newX = sceneWidth + margin + x; // Maintain offset past edge
            wrapDeltaX = sceneWidth;
            wrapped = true;
        }
        
        // Check right edge - wrap to left
        if (this.containRight && x > sceneWidth + margin) {
            newX = -margin + (x - sceneWidth - margin);
            wrapDeltaX = -sceneWidth;
            wrapped = true;
        }
        
        // Check top edge - wrap to bottom
        if (this.containTop && y < -margin) {
            newY = sceneHeight + margin + y;
            wrapDeltaY = sceneHeight;
            wrapped = true;
        }
        
        // Check bottom edge - wrap to top
        if (this.containBottom && y > sceneHeight + margin) {
            newY = -margin + (y - sceneHeight - margin);
            wrapDeltaY = -sceneHeight;
            wrapped = true;
        }
        
        if (wrapped) {
            // Store wrap delta for camera jump
            this._lastWrapX = wrapDeltaX;
            this._lastWrapY = wrapDeltaY;
            
            // Update position
            this.x = newX;
            this.y = newY;
            
            // Handle camera jump if this object has a Camera module
            if (this.jumpCameraOnWrap) {
                this._jumpCameraIfPresent(wrapDeltaX, wrapDeltaY);
            }
        }
    }

    /**
     * Instantly jump the camera viewport if this object has a Camera module
     */
    _jumpCameraIfPresent(deltaX, deltaY) {
        const camera = this.getModule('Camera');
        if (!camera) return;
        
        const engine = this.gameObject._engine;
        if (!engine || !engine.viewport) return;
        
        // Instantly move viewport by the wrap amount
        engine.viewport.x += deltaX;
        engine.viewport.y += deltaY;
        
        // Also update camera's internal tracking to prevent lerp back
        if (camera._lastTargetX !== undefined) {
            camera._lastTargetX += deltaX;
        }
        if (camera._lastTargetY !== undefined) {
            camera._lastTargetY += deltaY;
        }
        
        // Update screen-to-screen mode tracking if applicable
        if (camera._currentScreenX !== undefined && camera.cameraType === 'screenToScreen') {
            const canvas = engine.canvas;
            if (canvas) {
                camera._currentScreenX = Math.floor(this.x / canvas.width);
                camera._currentScreenY = Math.floor(this.y / canvas.height);
            }
        }
    }

    // ==================== COLLIDER HELPERS ====================

    /**
     * Get the first available collider (BoxCollider or SphereCollider)
     */
    _getCollider() {
        // Try BoxCollider first
        const boxCollider = this.getModule('BoxCollider');
        if (boxCollider && boxCollider.enabled !== false) {
            return boxCollider;
        }
        
        // Try SphereCollider
        const sphereCollider = this.getModule('SphereCollider');
        if (sphereCollider && sphereCollider.enabled !== false) {
            return sphereCollider;
        }
        
        return null;
    }

    /**
     * Get bounds from a collider (BoxCollider or SphereCollider)
     */
    _getColliderBounds(collider) {
        // BoxCollider has getBounds()
        if (collider.getBounds) {
            return collider.getBounds();
        }
        
        // SphereCollider - calculate bounds from center and radius
        if (collider.radius !== undefined) {
            const center = collider.getCenter ? collider.getCenter() : { 
                x: this.x + (collider.offsetX || 0), 
                y: this.y + (collider.offsetY || 0) 
            };
            
            const worldScale = this.gameObject.getWorldScale ? this.gameObject.getWorldScale() : { x: 1, y: 1 };
            const scaledRadius = collider.radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y));
            
            return {
                left: center.x - scaledRadius,
                right: center.x + scaledRadius,
                top: center.y - scaledRadius,
                bottom: center.y + scaledRadius,
                centerX: center.x,
                centerY: center.y,
                width: scaledRadius * 2,
                height: scaledRadius * 2
            };
        }
        
        // Fallback to position
        return {
            left: this.x,
            right: this.x,
            top: this.y,
            bottom: this.y,
            centerX: this.x,
            centerY: this.y,
            width: 0,
            height: 0
        };
    }

    // ==================== PUBLIC API ====================

    /**
     * Force contain/wrap check immediately
     */
    forceCheck() {
        const engine = this.gameObject._engine;
        if (!engine) return;
        
        const sceneWidth = engine.sceneWidth;
        const sceneHeight = engine.sceneHeight;
        
        if (!sceneWidth || !sceneHeight) return;
        
        if (this.containMode === 'contain') {
            this._performContain(sceneWidth, sceneHeight);
        } else if (this.containMode === 'wrap') {
            this._performWrap(sceneWidth, sceneHeight);
        }
    }

    /**
     * Check if position is within scene bounds
     */
    isWithinBounds(x = this.x, y = this.y) {
        const engine = this.gameObject._engine;
        if (!engine) return true;
        
        const sceneWidth = engine.sceneWidth;
        const sceneHeight = engine.sceneHeight;
        
        if (!sceneWidth || !sceneHeight) return true;
        
        return x >= 0 && x <= sceneWidth && y >= 0 && y <= sceneHeight;
    }

    /**
     * Get the last wrap delta (for external systems that need to know)
     */
    getLastWrapDelta() {
        return { x: this._lastWrapX, y: this._lastWrapY };
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON();
        json.type = 'ContainWithinScene';
        
        json.containMode = this.containMode;
        json.bounceOnEdge = this.bounceOnEdge;
        json.bounceMultiplier = this.bounceMultiplier;
        json.wrapMargin = this.wrapMargin;
        json.jumpCameraOnWrap = this.jumpCameraOnWrap;
        json.containLeft = this.containLeft;
        json.containRight = this.containRight;
        json.containTop = this.containTop;
        json.containBottom = this.containBottom;
        json.showDebugBounds = this.showDebugBounds;
        json.debugColor = this.debugColor;
        
        return json;
    }

    static fromJSON(json) {
        const module = new ContainWithinScene();
        module.enabled = json.enabled ?? true;
        
        module.containMode = json.containMode || 'contain';
        module.bounceOnEdge = json.bounceOnEdge ?? false;
        module.bounceMultiplier = json.bounceMultiplier ?? 1.0;
        module.wrapMargin = json.wrapMargin ?? 0;
        module.jumpCameraOnWrap = json.jumpCameraOnWrap ?? true;
        module.containLeft = json.containLeft ?? true;
        module.containRight = json.containRight ?? true;
        module.containTop = json.containTop ?? true;
        module.containBottom = json.containBottom ?? true;
        module.showDebugBounds = json.showDebugBounds ?? false;
        module.debugColor = json.debugColor || '#ff00ff';
        
        return module;
    }

    clone() {
        return ContainWithinScene.fromJSON(this.toJSON());
    }
}

// ============================================
// REQUIRED: Register module (DO NOT REMOVE!)
// ============================================
if (typeof window !== 'undefined') {
    window.ContainWithinScene = ContainWithinScene;
}

if (typeof Module !== 'undefined' && Module.register) {
    Module.register('ContainWithinScene', ContainWithinScene);
}
