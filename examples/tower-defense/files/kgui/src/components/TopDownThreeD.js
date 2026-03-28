/**
 * TopDownThreeD - Fake 3D Drawing System for Top-Down Perspective
 * 
 * Provides 3D-like rendering using 2D canvas by:
 * - Projecting 3D coordinates to 2D screen space based on depth
 * - Scaling objects based on distance from camera (z-depth)
 * - Fast depth sorting using painter's algorithm with z-buffer optimization
 * - Texture mapping support for shapes
 * - Basic shape primitives and custom vertex-based shapes
 * 
 * The viewport acts as a camera looking DOWN the Z-axis from above.
 * Positive Z = UP toward the camera = larger (closer).
 * Negative Z = DOWN away from the camera = smaller (farther).
 * Z=0 is the ground plane (scale = 1).
 * 
 * Usage: engine.TDTD.drawBox(x, y, z, width, height, depth, color);
 *   - z is the BASE (ground) elevation of the box
 *   - depth is how tall the box is (positive = upward toward camera)
 */

class TopDownThreeD {
    /**
     * Create a new TopDownThreeD renderer
     * @param {Engine} engine - The game engine instance
     */
    constructor(engine) {
        this.engine = engine;
        
        // Camera settings
        this.focalLength = 500;         // Perspective focal length (higher = less perspective distortion)
        this.cameraZ = 0;               // Camera position on Z axis (0 = at ground level)
        this.vanishingPointX = 0;       // X offset for vanishing point (0 = viewport center)
        this.vanishingPointY = 0;       // Y offset for vanishing point (0 = viewport center)
        
        // Depth sorting
        this._drawQueue = [];           // Queue of objects to draw, sorted by depth
        this._sortDirty = false;        // Whether queue needs re-sorting
        
        // Performance: Pre-allocated arrays for vertex calculations
        this._tempVerts = [];
        this._tempProjected = [];
        
        // Z-buffer for depth testing (optional, for more accurate overlaps)
        this._useZBuffer = false;
        this._zBuffer = null;
        this._zBufferWidth = 0;
        this._zBufferHeight = 0;
        
        // Rendering settings
        this.wireframe = false;         // Draw wireframe instead of filled
        this.showDepthShading = true;   // Darken objects based on distance
        this.depthShadingFactor = 0.3;  // How much to darken (0-1)
        this.minDepthScale = 0.05;      // Minimum scale for far objects
        this.maxDepthScale = 5.0;       // Maximum scale for close objects
        this.depthCullNear = -500;      // Cull objects below this Z (underground / behind camera)
        this.depthCullFar = 5000;       // Cull objects above this Z (extremely elevated)
        
        // Pixel perfect mode - rounds all projected coordinates to integers to eliminate sub-pixel seams
        this.pixelPerfect = true;
        
        // Backface culling bias - faces whose dot product with the camera direction is below this
        // value are treated as back-facing and culled. A small positive bias (0.05) prevents
        // near-tangential back faces from sneaking through the depth sort and poking through
        // front faces by a few pixels. Set to 0 for maximum surface visibility.
        this.backfaceBias = 0.05;
        
        // Tall shape handling - auto-subdivide shapes whose height exceeds a fraction of focalLength
        // to prevent severe perspective trapezoid distortion and face-crossing artifacts
        this.autoSubdivideTall = true;   // Enable vertical subdivision for tall shapes
        this.tallShapeSubdivisions = 4;  // Maximum number of vertical segments per shape
        this.tallShapeThreshold = 0.5;   // Height / focalLength ratio that triggers subdivision
        
        // Texture quality: controls how many triangles each textured quad is split into.
        // 1 = 2 triangles (fast, visible affine warp on trapezoids)
        // 2 = 4 triangles via centroid fan (good balance, default)
        // 3+ = NxN grid subdivision (N=quality), giving 2·N² triangles per quad
        this.textureQuality = 2;
        
        // Texture cache
        this._textureCache = new Map();
        
        // Batch rendering
        this._batchMode = false;
        this._batchQueue = [];
        this._needsFlush = false;       // Flag for engine to know batch needs flushing
    }
    
    // ==================== PROJECTION SYSTEM ====================
    
    /**
     * Get the viewport center in world space
     * @returns {{x: number, y: number}}
     */
    getViewportCenter() {
        const vp = this.engine.viewport;
        const zoom = vp.zoom || 1;
        // Calculate the visible area width/height in world units
        const visibleWidth = (vp.width || this.engine.renderWidth) / zoom;
        const visibleHeight = (vp.height || this.engine.renderHeight) / zoom;
        return {
            x: vp.x + visibleWidth / 2 + this.vanishingPointX,
            y: vp.y + visibleHeight / 2 + this.vanishingPointY
        };
    }
    
    /**
     * Get the effective focal length adjusted for viewport zoom.
     * Zooming out increases effective focal length, reducing perspective distortion
     * so 3D shapes maintain their proportions at any zoom level.
     * Zooming in decreases it, creating stronger perspective.
     * @returns {number}
     * @private
     */
    _getEffectiveFocalLength() {
        const zoom = (this.engine && this.engine.viewport) ? (this.engine.viewport.zoom || 1) : 1;
        return this.focalLength / zoom;
    }
    
    /**
     * Calculate perspective scale based on Z depth
     * Objects at z=0 have scale=1 (ground). Positive Z = up toward camera = larger.
     * Negative Z = below ground = smaller (farther from camera).
     * Uses zoom-adjusted focal length so 3D depth stays proportional at all zoom levels.
     * @param {number} z - World Z (positive = up = closer to camera)
     * @returns {number} Scale factor
     */
    getDepthScale(z) {
        // Use zoom-adjusted focal length so zooming out reduces perspective distortion
        // (shapes keep their 3D proportions) and zooming in increases it
        const effectiveFocal = this._getEffectiveFocalLength();
        const depth = this.cameraZ - z;
        
        // Prevent division by zero or extreme values when depth approaches -effectiveFocal
        const safeDepth = Math.max(depth, -effectiveFocal * 0.9);
        const denominator = effectiveFocal + safeDepth;
        
        // Ensure we never divide by zero or very small numbers
        if (denominator <= 1) {
            return this.maxDepthScale;
        }
        
        const scale = effectiveFocal / denominator;
        return Math.max(this.minDepthScale, Math.min(this.maxDepthScale, scale));
    }
    
    /**
     * Project a 3D point to 2D screen coordinates
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} z - World Z (depth)
     * @returns {{x: number, y: number, scale: number, visible: boolean}}
     */
    project(x, y, z) {
        // Soft culling - objects outside depth range are not visible
        // Use softer near culling to prevent sudden clipping
        if (z < this.depthCullNear || z > this.depthCullFar) {
            return { x: 0, y: 0, scale: 0, visible: false };
        }
        
        const scale = this.getDepthScale(z);
        
        // For top-down perspective, the vanishing point is at the center of the viewport
        // Objects scale based on their Z depth but maintain their X,Y world position
        // This gives a "looking down" effect where elevated objects appear slightly shifted
        const center = this.getViewportCenter();
        
        // Calculate the offset from center and scale it
        // This creates the perspective convergence effect
        const offsetX = x - center.x;
        const offsetY = y - center.y;
        
        // Project: objects further away (smaller scale) appear closer to center
        // Objects closer (larger scale) appear more spread from center
        const projX = center.x + offsetX * scale;
        const projY = center.y + offsetY * scale;
        
        // pixelPerfect: snap to integer pixels to eliminate seams between adjacent faces
        if (this.pixelPerfect) {
            return {
                x: Math.round(projX),
                y: Math.round(projY),
                scale: scale,
                visible: true
            };
        }
        
        return {
            x: projX,
            y: projY,
            scale: scale,
            visible: true
        };
    }
    
    /**
     * Project an array of 3D vertices to 2D
     * @param {Array<{x: number, y: number, z: number}>} vertices
     * @returns {Array<{x: number, y: number, scale: number, visible: boolean}>}
     */
    projectVertices(vertices) {
        const projected = [];
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            projected.push(this.project(v.x, v.y, v.z));
        }
        return projected;
    }
    
    // ==================== COLOR UTILITIES ====================
    
    /**
     * Apply depth shading to a color
     * @param {string} color - CSS color string
     * @param {number} z - Depth value
     * @returns {string} Shaded color
     */
    applyDepthShading(color, z) {
        if (!this.showDepthShading) return color;
        
        const scale = this.getDepthScale(z);
        // Invert scale for shading: further = darker
        const shadeFactor = Math.max(0, Math.min(1, scale));
        
        // Parse color and apply shading
        return this._shadeColor(color, shadeFactor);
    }
    
    /**
     * Internal color shading function
     * @param {string} color - CSS color
     * @param {number} factor - Brightness factor (0-1)
     * @returns {string}
     * @private
     */
    _shadeColor(color, factor) {
        // Handle hex colors
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const r = Math.round(parseInt(hex.slice(0, 2), 16) * factor);
            const g = Math.round(parseInt(hex.slice(2, 4), 16) * factor);
            const b = Math.round(parseInt(hex.slice(4, 6), 16) * factor);
            return `rgb(${r},${g},${b})`;
        }
        
        // Handle rgb/rgba colors
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = Math.round(parseInt(rgbMatch[1]) * factor);
            const g = Math.round(parseInt(rgbMatch[2]) * factor);
            const b = Math.round(parseInt(rgbMatch[3]) * factor);
            if (color.includes('rgba')) {
                const aMatch = color.match(/,\s*([\d.]+)\)$/);
                const a = aMatch ? parseFloat(aMatch[1]) : 1;
                return `rgba(${r},${g},${b},${a})`;
            }
            return `rgb(${r},${g},${b})`;
        }
        
        return color; // Return as-is for named colors etc.
    }
    
    // ==================== DEPTH SORTING ====================
    
    /**
     * Begin batch rendering mode - objects are queued and depth-sorted before drawing
     */
    beginBatch() {
        this._batchMode = true;
        this._batchQueue = [];
    }
    
    /**
     * End batch mode and render all queued objects in depth order
     * @param {CanvasRenderingContext2D} ctx
     */
    endBatch(ctx) {
        if (!this._batchMode) return;
        
        // Get viewport center - this is where the camera looks at
        const center = this.getViewportCenter();
        
        // For top-down 3D rendering, imagine a camera positioned above the viewport center
        // looking straight down. The camera is at position (center.x, center.y, cameraHeight).
        // 
        // Objects should be sorted by their 3D distance from this camera position.
        // Objects further from the camera are drawn first (painter's algorithm).
        //
        // Camera conceptual position: above viewport center, looking down
        // cameraHeight represents how high the virtual camera is above the scene
        const cameraHeight = this.focalLength + this.cameraZ;
        
        for (const item of this._batchQueue) {
            const worldX = item.worldX !== undefined ? item.worldX : 0;
            const worldY = item.worldY !== undefined ? item.worldY : 0;
            const worldZ = item.sortZ;
            
            // Calculate 3D distance from camera to object
            const dx = worldX - center.x;
            const dy = worldY - center.y;
            const dz = worldZ - cameraHeight; // Object Z relative to camera height
            
            // 3D Euclidean distance from camera to object
            // Objects further away (larger distance) should be drawn first (lower sort value)
            // We negate because we want back-to-front order (further = drawn first)
            const distanceFromCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Sort by negative distance so further objects sort earlier
            item.sortDepth = -distanceFromCamera;
        }
        
        // Sort by combined depth - ascending order (most negative/furthest first)
        this._batchQueue.sort((a, b) => a.sortDepth - b.sortDepth);
        
        // Render all queued items
        for (const item of this._batchQueue) {
            item.draw(ctx);
        }
        
        this._batchMode = false;
        this._batchQueue = [];
    }
    
    /**
     * Get current viewport bounds in world coordinates
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    getViewportBounds() {
        const vp = this.engine.viewport;
        const zoom = vp.zoom || 1;
        const width = (vp.width || this.engine.renderWidth) / zoom;
        const height = (vp.height || this.engine.renderHeight) / zoom;
        return {
            left: vp.x,
            top: vp.y,
            right: vp.x + width,
            bottom: vp.y + height,
            width: width,
            height: height
        };
    }
    
    /**
     * Check if a projected point is within the viewport (with padding)
     * @param {{x: number, y: number}} point - Projected screen coordinates
     * @param {number} [padding=0] - Extra padding around viewport
     * @returns {boolean}
     */
    isPointInViewport(point, padding = 0) {
        const bounds = this.getViewportBounds();
        return point.x >= bounds.left - padding && 
               point.x <= bounds.right + padding &&
               point.y >= bounds.top - padding && 
               point.y <= bounds.bottom + padding;
    }
    
    /**
     * Check if ALL projected vertices are outside the viewport (for culling)
     * Returns true if the shape should be culled (not drawn)
     * @param {Array<{x: number, y: number}>} projectedVerts - Array of projected vertices
     * @param {number} [padding=50] - Extra padding to prevent popping
     * @returns {boolean} True if shape should be culled
     */
    shouldCullShape(projectedVerts, padding = 50) {
        if (!projectedVerts || projectedVerts.length === 0) return true;
        
        const bounds = this.getViewportBounds();
        const left = bounds.left - padding;
        const right = bounds.right + padding;
        const top = bounds.top - padding;
        const bottom = bounds.bottom + padding;
        
        // Check if ALL vertices are outside on the same side
        let allLeft = true, allRight = true, allTop = true, allBottom = true;
        
        for (const v of projectedVerts) {
            if (v.x >= left) allLeft = false;
            if (v.x <= right) allRight = false;
            if (v.y >= top) allTop = false;
            if (v.y <= bottom) allBottom = false;
            
            // Early exit: if at least one vertex might be visible, don't cull
            if (!allLeft && !allRight && !allTop && !allBottom) {
                return false;
            }
        }
        
        // Cull if all vertices are outside on the same side
        return allLeft || allRight || allTop || allBottom;
    }
    
    /**
     * Queue a draw call for batch rendering
     * @param {number} sortZ - Z value for sorting (typically average Z of shape)
     * @param {Function} drawFn - Function to call for drawing (receives ctx)
     * @param {number} [worldX] - World X position for distance-based sorting
     * @param {number} [worldY] - World Y position for distance-based sorting
     * @private
     */
    _queueDraw(sortZ, drawFn, worldX = undefined, worldY = undefined) {
        if (this._batchMode) {
            this._batchQueue.push({ sortZ, draw: drawFn, worldX, worldY });
        } else {
            drawFn(this.engine.offscreenCtx);
        }
    }
    
    // ==================== BASIC SHAPE DRAWING ====================
    
    /**
     * Draw a point/circle at 3D coordinates
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} z - Depth
     * @param {number} radius - Base radius
     * @param {string} color - Fill color
     * @param {CanvasRenderingContext2D} [ctx] - Optional context (uses engine's if not provided)
     */
    drawPoint(x, y, z, radius, color, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        // Viewport culling - check if point is outside viewport
        if (this.shouldCullShape([proj], radius * proj.scale)) return;
        
        const scaledRadius = radius * proj.scale;
        const shadedColor = this.applyDepthShading(color, z);
        
        const drawFn = (renderCtx) => {
            renderCtx.fillStyle = shadedColor;
            renderCtx.beginPath();
            renderCtx.arc(proj.x, proj.y, scaledRadius, 0, Math.PI * 2);
            renderCtx.fill();
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a line between two 3D points
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} z1 - Start Z
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} z2 - End Z
     * @param {string} color - Line color
     * @param {number} [lineWidth=1] - Line thickness
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawLine(x1, y1, z1, x2, y2, z2, color, lineWidth = 1, ctx = null) {
        const p1 = this.project(x1, y1, z1);
        const p2 = this.project(x2, y2, z2);
        
        if (!p1.visible && !p2.visible) return;
        
        // Viewport culling - check if both endpoints are outside viewport
        if (this.shouldCullShape([p1, p2])) return;
        
        const avgZ = (z1 + z2) / 2;
        const avgX = (x1 + x2) / 2;
        const avgY = (y1 + y2) / 2;
        const shadedColor = this.applyDepthShading(color, avgZ);
        const avgScale = (p1.scale + p2.scale) / 2;
        
        const drawFn = (renderCtx) => {
            renderCtx.strokeStyle = shadedColor;
            renderCtx.lineWidth = lineWidth * avgScale;
            renderCtx.beginPath();
            renderCtx.moveTo(p1.x, p1.y);
            renderCtx.lineTo(p2.x, p2.y);
            renderCtx.stroke();
        };
        
        if (this._batchMode) {
            this._queueDraw(avgZ, drawFn, avgX, avgY);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D box (rectangular prism) - shows top and visible sides
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z elevation (0 = ground). Positive Z goes UP toward the camera.
     * @param {number} width - Width (X axis)
     * @param {number} height - Height (Y axis)
     * @param {number} depth - Box height along Z axis (positive = upward toward camera)
     * @param {string} color - Base color
     * @param {Object} [options] - Additional options
     * @param {string} [options.topColor] - Color for top face
     * @param {string} [options.sideColor] - Color for side faces
     * @param {boolean} [options.outline=false] - Draw outline
     * @param {string} [options.outlineColor='#000'] - Outline color
     * @param {HTMLImageElement} [options.texture] - Texture applied to all faces (fallback)
     * @param {HTMLImageElement} [options.topTexture] - Texture for the top (roof) face only
     * @param {HTMLImageElement} [options.sideTexture] - Texture for the four side faces only
     * @param {HTMLImageElement} [options.bottomWallTexture] - Texture for side faces on the bottom subdivision segment
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawBox(x, y, z, width, height, depth, color, options = {}, ctx = null) {
        const hw = width / 2;
        const hh = height / 2;
        
        // Auto-subdivide tall boxes so each segment has limited perspective distortion.
        // Interior horizontal faces (_skipTop / _skipBottom) are suppressed to avoid
        // visible seams inside the solid volume.
        if (this.autoSubdivideTall && !options._isSubdivision) {
            const segs = this._getTallShapeSegments(depth);
            if (segs > 1) {
                const segDepth = depth / segs;
                for (let i = 0; i < segs; i++) {
                    const segOpts = Object.assign({}, options, {
                        _isSubdivision: true,
                        _skipTop:    (i < segs - 1) || !!options._skipTop,
                        _skipBottom: (i > 0) || !!options._skipBottom,
                        _isBottomSegment: i === 0
                    });
                    this.drawBox(x, y, z + i * segDepth, width, height, segDepth, color, segOpts, ctx);
                }
                return;
            }
        }
        
        // Define the 8 corners of the box
        const corners = [
            // Bottom face (z)
            { x: x - hw, y: y - hh, z: z },           // 0: back-left
            { x: x + hw, y: y - hh, z: z },           // 1: back-right
            { x: x + hw, y: y + hh, z: z },           // 2: front-right
            { x: x - hw, y: y + hh, z: z },           // 3: front-left
            // Top face (z + depth)
            { x: x - hw, y: y - hh, z: z + depth },   // 4: back-left
            { x: x + hw, y: y - hh, z: z + depth },   // 5: back-right
            { x: x + hw, y: y + hh, z: z + depth },   // 6: front-right
            { x: x - hw, y: y + hh, z: z + depth },   // 7: front-left
        ];
        
        // Project all corners
        const proj = corners.map(c => this.project(c.x, c.y, c.z));
        
        // Check if any vertex is visible
        if (!proj.some(p => p.visible)) return;
        
        // Viewport culling - check if ALL vertices are outside viewport
        if (this.shouldCullShape(proj)) return;
        
        const topColor = options.topColor || this._lightenColor(color, 1.3);
        const sideColor = options.sideColor || this._shadeColor(color, 0.7);
        const outline = options.outline || false;
        const outlineColor = options.outlineColor || '#000';
        const texture = options.texture || null;
        const topTexture = options.topTexture || texture;
        const sideTexture = options.sideTexture || texture;
        const bottomWallTexture = options.bottomWallTexture || null;
        
        // Calculate sort depth (use center of box)
        const sortZ = z + depth / 2;
        
        // Get viewport center for face sorting
        const center = this.getViewportCenter();
        const cameraHeight = this.focalLength + this.cameraZ;
        
        // Calculate camera direction to box center (for face visibility).
        // Normalise so that backfaceBias is a cosine value (angle-based), not world-units.
        const toCamRawX = center.x - x;
        const toCamRawY = center.y - y;
        const toCamRawZ = cameraHeight - (z + depth / 2);
        const toCamLen  = Math.sqrt(toCamRawX * toCamRawX + toCamRawY * toCamRawY + toCamRawZ * toCamRawZ);
        const toCameraX = toCamLen > 0 ? toCamRawX / toCamLen : 0;
        const toCameraY = toCamLen > 0 ? toCamRawY / toCamLen : 0;
        const toCameraZ = toCamLen > 0 ? toCamRawZ / toCamLen : 1;
        
        // Define all 6 faces with their properties
        const faces = [
            // Bottom face (z=0 plane) - normal points -Z
            {
                verts: [proj[0], proj[1], proj[2], proj[3]],
                normal: { x: 0, y: 0, z: -1 },
                color: this.applyDepthShading(this._shadeColor(color, 0.4), z),
                worldCenter: { x: x, y: y, z: z },
                faceType: 'bottom', direction: 'bottom'
            },
            // Top face (z=depth plane) - normal points +Z  
            {
                verts: [proj[4], proj[5], proj[6], proj[7]],
                normal: { x: 0, y: 0, z: 1 },
                color: this.applyDepthShading(topColor, z + depth),
                worldCenter: { x: x, y: y, z: z + depth },
                faceType: 'top', direction: 'top'
            },
            // Back face (y=-hh) - normal points -Y
            {
                verts: [proj[4], proj[5], proj[1], proj[0]],
                normal: { x: 0, y: -1, z: 0 },
                color: this.applyDepthShading(this._shadeColor(sideColor, 0.9), z + depth / 2),
                worldCenter: { x: x, y: y - hh, z: z + depth / 2 },
                faceType: 'side', direction: 'back'
            },
            // Front face (y=+hh) - normal points +Y
            {
                verts: [proj[7], proj[6], proj[2], proj[3]],
                normal: { x: 0, y: 1, z: 0 },
                color: this.applyDepthShading(sideColor, z + depth / 2),
                worldCenter: { x: x, y: y + hh, z: z + depth / 2 },
                faceType: 'side', direction: 'front'
            },
            // Left face (x=-hw) - normal points -X
            {
                verts: [proj[4], proj[7], proj[3], proj[0]],
                normal: { x: -1, y: 0, z: 0 },
                color: this.applyDepthShading(this._shadeColor(color, 0.6), z + depth / 2),
                worldCenter: { x: x - hw, y: y, z: z + depth / 2 },
                faceType: 'side', direction: 'left'
            },
            // Right face (x=+hw) - normal points +X
            {
                verts: [proj[5], proj[6], proj[2], proj[1]],
                normal: { x: 1, y: 0, z: 0 },
                color: this.applyDepthShading(this._shadeColor(color, 0.8), z + depth / 2),
                worldCenter: { x: x + hw, y: y, z: z + depth / 2 },
                faceType: 'side', direction: 'right'
            }
        ];
        
        // Backface culling
        for (const face of faces) {
            const dot = face.normal.x * toCameraX + 
                       face.normal.y * toCameraY + 
                       face.normal.z * toCameraZ;
            face.visible = dot > this.backfaceBias;
        }
        
        // Check if face should be skipped (neighbor culling or subdivision)
        const _shouldSkip = (face) => {
            if (!face.visible) return true;
            const d = face.direction;
            if (options._skipTop    && d === 'top')    return true;
            if (options._skipBottom && d === 'bottom') return true;
            if (options._skipBack   && d === 'back')   return true;
            if (options._skipFront  && d === 'front')  return true;
            if (options._skipLeft   && d === 'left')   return true;
            if (options._skipRight  && d === 'right')  return true;
            return false;
        };
        
        // Helper: render a single face
        const isBottomSeg = !!options._isBottomSegment;
        const _renderFace = (renderCtx, face) => {
            const faceTex = face.faceType === 'top'   ? topTexture :
                            face.faceType === 'bottom' ? texture :
                            (isBottomSeg && bottomWallTexture) ? bottomWallTexture :
                            sideTexture;
            if (faceTex) {
                this._drawTexturedQuadFace(renderCtx, faceTex, face.verts, face.color, null);
            } else {
                this._drawQuad(renderCtx, face.verts, face.color, outline, outlineColor);
            }
        };
        
        // Sort nudge: offset face sort position along its outward normal.
        // A larger value better disambiguates coplanar faces on shared
        // boundaries (e.g. a block face beside a wedge face).
        const SORT_NUDGE = 0.5;
        
        if (this._batchMode) {
            // Per-face batching: each visible face is a separate batch entry
            for (const face of faces) {
                if (_shouldSkip(face)) continue;
                // Per-face viewport cull
                if (this.shouldCullShape(face.verts, 10)) continue;
                const faceRef = face;
                this._queueDraw(
                    faceRef.worldCenter.z + faceRef.normal.z * SORT_NUDGE,
                    (renderCtx) => _renderFace(renderCtx, faceRef),
                    faceRef.worldCenter.x + faceRef.normal.x * SORT_NUDGE,
                    faceRef.worldCenter.y + faceRef.normal.y * SORT_NUDGE
                );
            }
        } else {
            // Immediate mode: sort faces internally and draw
            for (const face of faces) {
                const dx = face.worldCenter.x - center.x;
                const dy = face.worldCenter.y - center.y;
                const dz = face.worldCenter.z - cameraHeight;
                face.sortDepth = -(dx * dx + dy * dy + dz * dz);
            }
            faces.sort((a, b) => a.sortDepth - b.sortDepth);
            const renderCtx = ctx || this.engine.offscreenCtx;
            for (const face of faces) {
                if (_shouldSkip(face)) continue;
                _renderFace(renderCtx, face);
            }
        }
    }
    
    /**
     * Draw a wedge/ramp shape — a box with variable-height top corners.
     * All faces are rendered as a single depth-sorted unit, preventing clipping artifacts
     * that occur when ramp faces are drawn as individual polygons.
     *
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z elevation
     * @param {number} width - Width (X axis)
     * @param {number} height - Height (Y axis in top-down)
     * @param {{bl: number, br: number, fr: number, fl: number}} topHeights - Z offset above base for each top corner:
     *    bl = back-left (-X,-Y), br = back-right (+X,-Y),
     *    fr = front-right (+X,+Y), fl = front-left (-X,+Y)
     * @param {string} color - Base color
     * @param {Object} [options] - Additional options
     * @param {string} [options.topColor] - Color for slope/top face
     * @param {string} [options.sideColor] - Color for side faces
     * @param {boolean} [options.outline=false] - Draw outline
     * @param {string} [options.outlineColor='#000'] - Outline color
     * @param {HTMLImageElement} [options.texture] - Texture for all faces
     * @param {HTMLImageElement} [options.topTexture] - Texture for slope face only
     * @param {HTMLImageElement} [options.sideTexture] - Texture for side faces only
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawWedge(x, y, z, width, height, topHeights, color, options = {}, ctx = null) {
        const hw = width / 2;
        const hh = height / 2;
        
        const bl = topHeights.bl || 0;
        const br = topHeights.br || 0;
        const fr = topHeights.fr || 0;
        const fl = topHeights.fl || 0;
        
        // Max height for sorting and culling
        const maxH = Math.max(bl, br, fr, fl);
        if (maxH <= 0) return; // Completely flat/empty
        
        // Define 8 corners
        const corners = [
            // Bottom face (all at z)
            { x: x - hw, y: y - hh, z: z },           // 0: back-left bottom
            { x: x + hw, y: y - hh, z: z },           // 1: back-right bottom
            { x: x + hw, y: y + hh, z: z },           // 2: front-right bottom
            { x: x - hw, y: y + hh, z: z },           // 3: front-left bottom
            // Top face (variable heights above z)
            { x: x - hw, y: y - hh, z: z + bl },      // 4: back-left top
            { x: x + hw, y: y - hh, z: z + br },      // 5: back-right top
            { x: x + hw, y: y + hh, z: z + fr },      // 6: front-right top
            { x: x - hw, y: y + hh, z: z + fl },      // 7: front-left top
        ];
        
        // Project all corners
        const proj = corners.map(c => this.project(c.x, c.y, c.z));
        
        // Check visibility
        if (!proj.some(p => p.visible)) return;
        if (this.shouldCullShape(proj)) return;
        
        const topColor = options.topColor || this._lightenColor(color, 1.3);
        const sideColor = options.sideColor || this._shadeColor(color, 0.7);
        const outline = options.outline || false;
        const outlineColor = options.outlineColor || '#000';
        const texture = options.texture || null;
        const topTexture = options.topTexture || texture;
        const sideTexture = options.sideTexture || texture;
        
        // Sort depth (center of shape)
        const avgTopZ = (bl + br + fr + fl) / 4;
        const sortZ = z + avgTopZ / 2;
        
        // Camera info for face sorting and backface culling
        const center = this.getViewportCenter();
        const cameraHeight = this.focalLength + this.cameraZ;
        
        const toCamRawX = center.x - x;
        const toCamRawY = center.y - y;
        const toCamRawZ = cameraHeight - sortZ;
        const toCamLen = Math.sqrt(toCamRawX * toCamRawX + toCamRawY * toCamRawY + toCamRawZ * toCamRawZ);
        const toCameraX = toCamLen > 0 ? toCamRawX / toCamLen : 0;
        const toCameraY = toCamLen > 0 ? toCamRawY / toCamLen : 0;
        const toCameraZ = toCamLen > 0 ? toCamRawZ / toCamLen : 1;
        
        // Build face list
        const faces = [];
        
        // --- Bottom face: [0,1,2,3], normal (0,0,-1) ---
        faces.push({
            verts: [proj[0], proj[1], proj[2], proj[3]],
            normal: { x: 0, y: 0, z: -1 },
            color: this.applyDepthShading(this._shadeColor(color, 0.4), z),
            worldCenter: { x: x, y: y, z: z },
            faceType: 'bottom', direction: 'bottom'
        });
        
        // --- Slope/top face: [4,5,6,7] ---
        {
            const e1x = corners[5].x - corners[4].x;
            const e1y = corners[5].y - corners[4].y;
            const e1z = corners[5].z - corners[4].z;
            const e2x = corners[7].x - corners[4].x;
            const e2y = corners[7].y - corners[4].y;
            const e2z = corners[7].z - corners[4].z;
            let nx = e1y * e2z - e1z * e2y;
            let ny = e1z * e2x - e1x * e2z;
            let nz = e1x * e2y - e1y * e2x;
            const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nLen > 0) { nx /= nLen; ny /= nLen; nz /= nLen; }
            if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
            
            const slopeAvgZ = (corners[4].z + corners[5].z + corners[6].z + corners[7].z) / 4;
            faces.push({
                verts: [proj[4], proj[5], proj[6], proj[7]],
                normal: { x: nx, y: ny, z: nz },
                color: this.applyDepthShading(topColor, slopeAvgZ),
                worldCenter: { x: x, y: y, z: slopeAvgZ },
                faceType: 'top', direction: 'top'
            });
        }
        
        // --- Back face (-Y): corners [4,5,1,0] ---
        if (bl > 0 || br > 0) {
            let verts;
            if (bl > 0 && br > 0) verts = [proj[4], proj[5], proj[1], proj[0]];
            else if (br > 0)      verts = [proj[5], proj[1], proj[0]];
            else                  verts = [proj[4], proj[1], proj[0]];
            faces.push({
                verts,
                normal: { x: 0, y: -1, z: 0 },
                color: this.applyDepthShading(this._shadeColor(sideColor, 0.9), z + Math.max(bl, br) / 2),
                worldCenter: { x: x, y: y - hh, z: z + Math.max(bl, br) / 2 },
                faceType: 'side', direction: 'back'
            });
        }
        
        // --- Front face (+Y): corners [7,6,2,3] ---
        if (fl > 0 || fr > 0) {
            let verts;
            if (fl > 0 && fr > 0) verts = [proj[7], proj[6], proj[2], proj[3]];
            else if (fr > 0)      verts = [proj[6], proj[2], proj[3]];
            else                  verts = [proj[7], proj[2], proj[3]];
            faces.push({
                verts,
                normal: { x: 0, y: 1, z: 0 },
                color: this.applyDepthShading(sideColor, z + Math.max(fl, fr) / 2),
                worldCenter: { x: x, y: y + hh, z: z + Math.max(fl, fr) / 2 },
                faceType: 'side', direction: 'front'
            });
        }
        
        // --- Left face (-X): corners [4,7,3,0] ---
        if (bl > 0 || fl > 0) {
            let verts;
            if (bl > 0 && fl > 0) verts = [proj[4], proj[7], proj[3], proj[0]];
            else if (fl > 0)      verts = [proj[7], proj[3], proj[0]];
            else                  verts = [proj[4], proj[3], proj[0]];
            faces.push({
                verts,
                normal: { x: -1, y: 0, z: 0 },
                color: this.applyDepthShading(this._shadeColor(color, 0.6), z + Math.max(bl, fl) / 2),
                worldCenter: { x: x - hw, y: y, z: z + Math.max(bl, fl) / 2 },
                faceType: 'side', direction: 'left'
            });
        }
        
        // --- Right face (+X): corners [5,6,2,1] ---
        if (br > 0 || fr > 0) {
            let verts;
            if (br > 0 && fr > 0) verts = [proj[5], proj[6], proj[2], proj[1]];
            else if (fr > 0)      verts = [proj[6], proj[2], proj[1]];
            else                  verts = [proj[5], proj[2], proj[1]];
            faces.push({
                verts,
                normal: { x: 1, y: 0, z: 0 },
                color: this.applyDepthShading(this._shadeColor(color, 0.8), z + Math.max(br, fr) / 2),
                worldCenter: { x: x + hw, y: y, z: z + Math.max(br, fr) / 2 },
                faceType: 'side', direction: 'right'
            });
        }
        
        // Backface culling
        for (const face of faces) {
            const dot = face.normal.x * toCameraX + face.normal.y * toCameraY + face.normal.z * toCameraZ;
            face.visible = dot > this.backfaceBias;
        }
        
        // Check if face should be skipped (neighbor culling)
        const _shouldSkip = (face) => {
            if (!face.visible) return true;
            const d = face.direction;
            if (options._skipTop    && d === 'top')    return true;
            if (options._skipBottom && d === 'bottom') return true;
            if (options._skipBack   && d === 'back')   return true;
            if (options._skipFront  && d === 'front')  return true;
            if (options._skipLeft   && d === 'left')   return true;
            if (options._skipRight  && d === 'right')  return true;
            return false;
        };
        
        // Helper: render a single wedge face
        const _renderWedgeFace = (renderCtx, face) => {
            const faceTex = face.faceType === 'top' ? topTexture :
                            face.faceType === 'bottom' ? texture : sideTexture;
            if (faceTex && face.verts.length === 4) {
                this._drawTexturedQuadFace(renderCtx, faceTex, face.verts, face.color, null);
            } else if (face.verts.length === 4) {
                this._drawQuad(renderCtx, face.verts, face.color, outline, outlineColor);
            } else if (face.verts.length >= 3) {
                renderCtx.fillStyle = face.color;
                renderCtx.beginPath();
                renderCtx.moveTo(face.verts[0].x, face.verts[0].y);
                for (let i = 1; i < face.verts.length; i++) {
                    renderCtx.lineTo(face.verts[i].x, face.verts[i].y);
                }
                renderCtx.closePath();
                renderCtx.fill();
                if (outline) {
                    renderCtx.strokeStyle = outlineColor;
                    renderCtx.lineWidth = 1;
                    renderCtx.stroke();
                }
            }
        };
        
        // Sort nudge for stable ordering of coplanar faces
        const SORT_NUDGE = 0.5;
        
        if (this._batchMode) {
            // Per-face batching: each visible face is a separate batch entry
            for (const face of faces) {
                if (_shouldSkip(face)) continue;
                if (this.shouldCullShape(face.verts, 10)) continue;
                const faceRef = face;
                this._queueDraw(
                    faceRef.worldCenter.z + faceRef.normal.z * SORT_NUDGE,
                    (renderCtx) => _renderWedgeFace(renderCtx, faceRef),
                    faceRef.worldCenter.x + faceRef.normal.x * SORT_NUDGE,
                    faceRef.worldCenter.y + faceRef.normal.y * SORT_NUDGE
                );
            }
        } else {
            // Immediate mode: sort faces internally and draw
            for (const face of faces) {
                const dx = face.worldCenter.x - center.x;
                const dy = face.worldCenter.y - center.y;
                const dz = face.worldCenter.z - cameraHeight;
                face.sortDepth = -(dx * dx + dy * dy + dz * dz);
            }
            faces.sort((a, b) => a.sortDepth - b.sortDepth);
            const renderCtx = ctx || this.engine.offscreenCtx;
            for (const face of faces) {
                if (_shouldSkip(face)) continue;
                _renderWedgeFace(renderCtx, face);
            }
        }
    }
    
    /**
     * Draw a flat rectangle at a specific Z depth
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Z depth
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {string} color - Fill color
     * @param {number} [rotation=0] - Rotation in radians
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawRect(x, y, z, width, height, color, rotation = 0, ctx = null) {
        const hw = width / 2;
        const hh = height / 2;
        
        // Calculate corner positions with rotation
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        const corners = [
            { x: x + (-hw * cos - -hh * sin), y: y + (-hw * sin + -hh * cos), z },
            { x: x + (hw * cos - -hh * sin), y: y + (hw * sin + -hh * cos), z },
            { x: x + (hw * cos - hh * sin), y: y + (hw * sin + hh * cos), z },
            { x: x + (-hw * cos - hh * sin), y: y + (-hw * sin + hh * cos), z }
        ];
        
        const proj = corners.map(c => this.project(c.x, c.y, c.z));
        
        if (!proj.some(p => p.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape(proj)) return;
        
        const shadedColor = this.applyDepthShading(color, z);
        
        const drawFn = (renderCtx) => {
            this._drawQuad(renderCtx, proj, shadedColor, false);
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a circle/ellipse at a specific Z depth
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Z depth
     * @param {number} radius - Radius
     * @param {string} color - Fill color
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawCircle(x, y, z, radius, color, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        // Viewport culling
        if (this.shouldCullShape([proj], radius * proj.scale)) return;
        
        const scaledRadius = radius * proj.scale;
        const shadedColor = this.applyDepthShading(color, z);
        
        const drawFn = (renderCtx) => {
            renderCtx.fillStyle = shadedColor;
            renderCtx.beginPath();
            renderCtx.arc(proj.x, proj.y, scaledRadius, 0, Math.PI * 2);
            renderCtx.fill();
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D cylinder (vertical)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} radius - Radius
     * @param {number} height - Height (Z axis)
     * @param {string} color - Base color
     * @param {number} [segments=16] - Number of segments for smoothness
     * @param {Object} [options] - Options (texture, etc.)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawCylinder(x, y, z, radius, height, color, segments = 16, options = {}, ctx = null) {
        // Handle old API where options was ctx
        if (options instanceof CanvasRenderingContext2D) {
            ctx = options;
            options = {};
        }
        
        const topZ = z + height;
        
        // Auto-subdivide tall cylinders so each segment spans a smaller Z range.
        // The top cap is only drawn on the uppermost segment (_skipTopCap suppresses others).
        if (this.autoSubdivideTall && !options._isSubdivision) {
            const segs = this._getTallShapeSegments(height);
            if (segs > 1) {
                const segH = height / segs;
                for (let i = 0; i < segs; i++) {
                    const segOpts = Object.assign({}, options, {
                        _isSubdivision: true,
                        _skipTopCap: i < segs - 1
                    });
                    this.drawCylinder(x, y, z + i * segH, radius, segH, color, segments, segOpts, ctx);
                }
                return;
            }
        }
        
        const texture = options.texture || null;
        
        // Generate circle vertices for top and bottom
        const topVerts = [];
        const bottomVerts = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const vx = x + Math.cos(angle) * radius;
            const vy = y + Math.sin(angle) * radius;
            topVerts.push({ x: vx, y: vy, z: topZ });
            bottomVerts.push({ x: vx, y: vy, z: z });
        }
        
        const topProj = topVerts.map(v => this.project(v.x, v.y, v.z));
        const bottomProj = bottomVerts.map(v => this.project(v.x, v.y, v.z));
        
        // Viewport culling - check all vertices
        const allProj = [...topProj, ...bottomProj];
        if (this.shouldCullShape(allProj)) return;
        
        const sortZ = z + height / 2;
        const topColor = this._lightenColor(color, 1.2);
        const sideColor = this._shadeColor(color, 0.8);
        
        // Get viewport center for face sorting
        const center = this.getViewportCenter();
        const cameraHeight = this.focalLength + this.cameraZ;
        
        // Direction from cylinder to camera (for backface culling).
        // Normalise so backfaceBias is a consistent cosine threshold regardless of distance.
        const toCamRawX = center.x - x;
        const toCamRawY = center.y - y;
        const toCamRawZ = cameraHeight - (z + height / 2);
        const toCamLen  = Math.sqrt(toCamRawX * toCamRawX + toCamRawY * toCamRawY + toCamRawZ * toCamRawZ);
        const toCameraX = toCamLen > 0 ? toCamRawX / toCamLen : 0;
        const toCameraY = toCamLen > 0 ? toCamRawY / toCamLen : 0;
        const toCameraZ = toCamLen > 0 ? toCamRawZ / toCamLen : 1;
        
        const drawFn = (renderCtx) => {
            // Collect all faces (side quads + top cap) with their depth info
            const faces = [];
            
            // Side faces
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                const angle = ((i + 0.5) / segments) * Math.PI * 2; // Center angle of face
                
                // Face normal points outward from cylinder axis
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                
                // Check if face is visible (normal points toward camera)
                const dot = normalX * toCameraX + normalY * toCameraY;
                
                if (dot > this.backfaceBias) { // Only include visible faces
                    // Face center position
                    const faceCenterX = x + normalX * radius;
                    const faceCenterY = y + normalY * radius;
                    const faceCenterZ = z + height / 2;
                    
                    // Distance from camera for sorting
                    const dx = faceCenterX - center.x;
                    const dy = faceCenterY - center.y;
                    const dz = faceCenterZ - cameraHeight;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    
                    // Calculate face brightness based on angle
                    const brightness = 0.6 + Math.cos(angle) * 0.3;
                    const faceColor = this._shadeColor(sideColor, brightness);
                    
                    faces.push({
                        type: 'quad',
                        verts: [bottomProj[i], bottomProj[next], topProj[next], topProj[i]],
                        color: this.applyDepthShading(faceColor, z),
                        sortDepth: -distSq,
                        segmentIndex: i
                    });
                }
            }
            
            // Top cap - always visible in top-down view (normal points +Z toward camera).
            // Suppressed for intermediate subdivision segments to avoid interior discs.
            if (toCameraZ > 0 && !options._skipTopCap) {
                const dx = x - center.x;
                const dy = y - center.y;
                const dz = topZ - cameraHeight;
                const distSq = dx * dx + dy * dy + dz * dz;
                
                faces.push({
                    type: 'cap',
                    verts: topProj,
                    color: this.applyDepthShading(topColor, topZ),
                    sortDepth: -distSq
                });
            }
            
            // Sort faces by distance (furthest first)
            faces.sort((a, b) => a.sortDepth - b.sortDepth);
            
            // Draw faces
            for (const face of faces) {
                if (face.type === 'quad') {
                    if (texture) {
                        // Calculate UV coordinates for cylinder wrap
                        const u1 = face.segmentIndex / segments;
                        const u2 = (face.segmentIndex + 1) / segments;
                        this._drawTexturedQuadFace(renderCtx, texture, face.verts, face.color, [
                            { u: u1, v: 1 },  // bottom-left
                            { u: u2, v: 1 },  // bottom-right
                            { u: u2, v: 0 },  // top-right
                            { u: u1, v: 0 }   // top-left
                        ]);
                    } else {
                        this._drawQuad(renderCtx, face.verts, face.color, false);
                    }
                } else {
                    // Draw cap polygon (no texture on caps)
                    renderCtx.fillStyle = face.color;
                    renderCtx.beginPath();
                    renderCtx.moveTo(face.verts[0].x, face.verts[0].y);
                    for (let i = 1; i < face.verts.length; i++) {
                        renderCtx.lineTo(face.verts[i].x, face.verts[i].y);
                    }
                    renderCtx.closePath();
                    renderCtx.fill();
                }
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D cone
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} radius - Base radius
     * @param {number} height - Height (Z axis)
     * @param {string} color - Base color
     * @param {number} [segments=16] - Number of segments
     * @param {Object} [options] - Options (texture, outline, etc.)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawCone(x, y, z, radius, height, color, segments = 16, options = {}, ctx = null) {
        // Handle old API where options was ctx
        if (options instanceof CanvasRenderingContext2D) {
            ctx = options;
            options = {};
        }
        
        const apexWorld = { x: x, y: y, z: z + height };
        const apex = this.project(apexWorld.x, apexWorld.y, apexWorld.z);
        
        // Generate base circle vertices (world and projected)
        const baseWorld = [];
        const baseVerts = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const vx = x + Math.cos(angle) * radius;
            const vy = y + Math.sin(angle) * radius;
            baseWorld.push({ x: vx, y: vy, z: z });
            baseVerts.push(this.project(vx, vy, z));
        }
        
        // Check if any vertices are visible
        if (!apex.visible && !baseVerts.some(v => v.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape([apex, ...baseVerts])) return;
        
        const sortZ = z + height / 2;
        
        // Get viewport center for face sorting
        const center = this.getViewportCenter();
        const cameraHeight = this.focalLength + this.cameraZ;
        
        // Direction from cone center to camera
        // Normalise so backfaceBias is a consistent cosine threshold regardless of distance.
        const toCamRawX = center.x - x;
        const toCamRawY = center.y - y;
        const toCamRawZ = cameraHeight - (z + height / 2);
        const toCamLen  = Math.sqrt(toCamRawX * toCamRawX + toCamRawY * toCamRawY + toCamRawZ * toCamRawZ);
        const toCameraX = toCamLen > 0 ? toCamRawX / toCamLen : 0;
        const toCameraY = toCamLen > 0 ? toCamRawY / toCamLen : 0;
        const toCameraZ = toCamLen > 0 ? toCamRawZ / toCamLen : 1;
        
        // Get texture if provided
        const texture = options.texture || null;
        
        const drawFn = (renderCtx) => {
            const faces = [];
            
            // Base circle face - visible when looking down at the cone (top-down view)
            // In top-down view, we're typically looking DOWN, so toCameraZ is usually positive
            // The base is at the BOTTOM of the cone, so it's visible when camera is below the apex
            // For top-down perspective where height is negative (going down into screen), adjust accordingly
            const effectiveHeight = Math.abs(height);
            const baseNormalZ = height >= 0 ? -1 : 1; // Base normal points away from apex
            const baseDot = baseNormalZ * toCameraZ;
            
            if (baseDot > 0) {
                const dx = x - center.x;
                const dy = y - center.y;
                const dz = z - cameraHeight;
                faces.push({
                    type: 'base',
                    verts: baseVerts,
                    color: this.applyDepthShading(this._shadeColor(color, 0.6), z),
                    sortDepth: -(dx * dx + dy * dy + dz * dz)
                });
            }
            
            // Side triangles - always draw all visible faces
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                const angle = ((i + 0.5) / segments) * Math.PI * 2;
                
                // Calculate face normal (points outward and upward/downward for cone)
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                // Cone slant normal has component toward apex
                const slopeAngle = Math.atan2(radius, effectiveHeight);
                const horizontalComponent = Math.cos(slopeAngle);
                const verticalComponent = Math.sin(slopeAngle) * (height >= 0 ? 1 : -1);
                
                // Scaled normal
                const faceDirX = normalX * horizontalComponent;
                const faceDirY = normalY * horizontalComponent;
                const faceDirZ = verticalComponent;
                
                // Check visibility (dot product with camera direction)
                const dot = faceDirX * toCameraX + faceDirY * toCameraY + faceDirZ * toCameraZ;
                
                if (dot > this.backfaceBias) {
                    // Face center (roughly at 1/3 height from base)
                    const faceCenterX = x + normalX * radius * 0.67;
                    const faceCenterY = y + normalY * radius * 0.67;
                    const faceCenterZ = z + height * 0.33;
                    
                    const dx = faceCenterX - center.x;
                    const dy = faceCenterY - center.y;
                    const dz = faceCenterZ - cameraHeight;
                    
                    const brightness = 0.6 + Math.cos(angle) * 0.4;
                    
                    faces.push({
                        type: 'tri',
                        apex: apex,
                        v1: baseVerts[i],
                        v2: baseVerts[next],
                        angle: angle,
                        color: this.applyDepthShading(this._shadeColor(color, brightness), z + height / 2),
                        sortDepth: -(dx * dx + dy * dy + dz * dz)
                    });
                }
            }
            
            // Sort faces by distance (furthest first for painter's algorithm)
            faces.sort((a, b) => a.sortDepth - b.sortDepth);
            
            // Draw faces
            for (const face of faces) {
                if (texture && face.type === 'tri') {
                    // Apply texture with shading
                    this._drawTexturedConeTriangle(renderCtx, texture, face, radius, segments, color, z + height / 2);
                } else {
                    renderCtx.fillStyle = face.color;
                    renderCtx.beginPath();
                    if (face.type === 'base') {
                        renderCtx.moveTo(face.verts[0].x, face.verts[0].y);
                        for (let i = 1; i < face.verts.length; i++) {
                            renderCtx.lineTo(face.verts[i].x, face.verts[i].y);
                        }
                    } else {
                        renderCtx.moveTo(face.apex.x, face.apex.y);
                        renderCtx.lineTo(face.v1.x, face.v1.y);
                        renderCtx.lineTo(face.v2.x, face.v2.y);
                    }
                    renderCtx.closePath();
                    renderCtx.fill();
                }
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D pyramid (square base)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} size - Base size
     * @param {number} height - Height (Z axis)
     * @param {string} color - Base color
     * @param {number} [rotation=0] - Rotation around Z axis
     * @param {Object} [options] - Options (texture, etc.)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawPyramid(x, y, z, size, height, color, rotation = 0, options = {}, ctx = null) {
        // Handle old API where options was ctx
        if (options instanceof CanvasRenderingContext2D) {
            ctx = options;
            options = {};
        }
        
        const hs = size / 2;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const texture = options.texture || null;
        
        // Base corners (rotated)
        const base = [
            { x: x + (-hs * cos - -hs * sin), y: y + (-hs * sin + -hs * cos), z },
            { x: x + (hs * cos - -hs * sin), y: y + (hs * sin + -hs * cos), z },
            { x: x + (hs * cos - hs * sin), y: y + (hs * sin + hs * cos), z },
            { x: x + (-hs * cos - hs * sin), y: y + (-hs * sin + hs * cos), z }
        ];
        
        const baseProj = base.map(v => this.project(v.x, v.y, v.z));
        const apex = this.project(x, y, z + height);
        const apexWorld = { x: x, y: y, z: z + height };
        
        if (!apex.visible && !baseProj.some(p => p.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape([apex, ...baseProj])) return;
        
        const sortZ = z + height / 2;
        
        // Get viewport center for face sorting
        const center = this.getViewportCenter();
        const cameraHeight = this.focalLength + this.cameraZ;
        
        // Direction from pyramid to camera
        // Normalise so backfaceBias is a consistent cosine threshold regardless of distance.
        const toCamRawX = center.x - x;
        const toCamRawY = center.y - y;
        const toCamRawZ = cameraHeight - (z + height / 2);
        const toCamLen  = Math.sqrt(toCamRawX * toCamRawX + toCamRawY * toCamRawY + toCamRawZ * toCamRawZ);
        const toCameraX = toCamLen > 0 ? toCamRawX / toCamLen : 0;
        const toCameraY = toCamLen > 0 ? toCamRawY / toCamLen : 0;
        const toCameraZ = toCamLen > 0 ? toCamRawZ / toCamLen : 1;
        
        const drawFn = (renderCtx) => {
            const faces = [];
            
            // Face normals for pyramid (pointing outward)
            // Face 0: between base[0] and base[1] (back face, -Y normal after rotation)
            // Face 1: between base[1] and base[2] (right face, +X normal after rotation)
            // Face 2: between base[2] and base[3] (front face, +Y normal after rotation)
            // Face 3: between base[3] and base[0] (left face, -X normal after rotation)
            
            const faceNormals = [
                { x: -sin, y: -cos, z: 0 },   // Rotated -Y
                { x: cos, y: -sin, z: 0 },    // Rotated +X
                { x: sin, y: cos, z: 0 },     // Rotated +Y
                { x: -cos, y: sin, z: 0 }     // Rotated -X
            ];
            
            // Adjust normals for sloped pyramid faces (they point outward AND upward)
            const slopeAngle = Math.atan2(hs, height);
            const cosSlope = Math.cos(slopeAngle);
            const sinSlope = Math.sin(slopeAngle);
            
            const faceColors = [0.6, 0.8, 1.0, 0.7];
            
            // Base face (only visible from below)
            if (toCameraZ < -height / 2) {
                const dx = x - center.x;
                const dy = y - center.y;
                const dz = z - cameraHeight;
                faces.push({
                    type: 'base',
                    verts: baseProj,
                    color: this.applyDepthShading(this._shadeColor(color, 0.5), z),
                    sortDepth: -(dx * dx + dy * dy + dz * dz)
                });
            }
            
            // Four triangular side faces
            for (let i = 0; i < 4; i++) {
                const next = (i + 1) % 4;
                
                // Calculate normal with slope
                const normalX = faceNormals[i].x * cosSlope;
                const normalY = faceNormals[i].y * cosSlope;
                const normalZ = sinSlope;
                
                // Check visibility
                const dot = normalX * toCameraX + normalY * toCameraY + normalZ * toCameraZ;
                
                if (dot > this.backfaceBias) {
                    // Face center
                    const faceCenterX = (base[i].x + base[next].x + x) / 3;
                    const faceCenterY = (base[i].y + base[next].y + y) / 3;
                    const faceCenterZ = z + height / 3;
                    
                    const dx = faceCenterX - center.x;
                    const dy = faceCenterY - center.y;
                    const dz = faceCenterZ - cameraHeight;
                    
                    faces.push({
                        type: 'tri',
                        apex: apex,
                        v1: baseProj[i],
                        v2: baseProj[next],
                        color: this.applyDepthShading(this._shadeColor(color, faceColors[i]), z + height / 2),
                        sortDepth: -(dx * dx + dy * dy + dz * dz),
                        faceIndex: i
                    });
                }
            }
            
            // Sort faces
            faces.sort((a, b) => a.sortDepth - b.sortDepth);
            
            // Draw faces
            for (const face of faces) {
                if (texture && face.type === 'tri') {
                    // Draw textured triangle with shading
                    renderCtx.save();
                    renderCtx.beginPath();
                    renderCtx.moveTo(face.apex.x, face.apex.y);
                    renderCtx.lineTo(face.v1.x, face.v1.y);
                    renderCtx.lineTo(face.v2.x, face.v2.y);
                    renderCtx.closePath();
                    renderCtx.clip();
                    
                    // Map texture to triangle
                    const u1 = face.faceIndex / 4;
                    const u2 = (face.faceIndex + 1) / 4;
                    this._drawTexturedTriangle(renderCtx, texture,
                        face.apex, face.v1, face.v2,
                        { u: (u1 + u2) / 2, v: 0 },
                        { u: u1, v: 1 },
                        { u: u2, v: 1 }
                    );
                    
                    // Apply shading overlay
                    renderCtx.globalCompositeOperation = 'multiply';
                    renderCtx.fillStyle = face.color;
                    renderCtx.fillRect(-10000, -10000, 20000, 20000);
                    renderCtx.restore();
                } else {
                    renderCtx.fillStyle = face.color;
                    renderCtx.beginPath();
                    if (face.type === 'base') {
                        renderCtx.moveTo(face.verts[0].x, face.verts[0].y);
                        for (let i = 1; i < 4; i++) {
                            renderCtx.lineTo(face.verts[i].x, face.verts[i].y);
                        }
                    } else {
                        renderCtx.moveTo(face.apex.x, face.apex.y);
                        renderCtx.lineTo(face.v1.x, face.v1.y);
                        renderCtx.lineTo(face.v2.x, face.v2.y);
                    }
                    renderCtx.closePath();
                    renderCtx.fill();
                }
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D sphere (approximated with shading)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Center Z
     * @param {number} radius - Radius
     * @param {string} color - Base color
     * @param {Object} [options] - Options (texture, etc.)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawSphere(x, y, z, radius, color, options = {}, ctx = null) {
        // Handle old API where options was ctx
        if (options instanceof CanvasRenderingContext2D) {
            ctx = options;
            options = {};
        }
        
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        const scaledRadius = radius * proj.scale;
        const texture = options.texture || null;
        
        // Viewport culling
        if (this.shouldCullShape([proj], scaledRadius)) return;
        
        const drawFn = (renderCtx) => {
            const baseColor = this.applyDepthShading(color, z);
            
            if (texture) {
                // Draw textured sphere
                this._drawTexturedCircle(renderCtx, texture, proj, scaledRadius, baseColor);
            } else {
                // Create radial gradient for 3D sphere effect
                const gradient = renderCtx.createRadialGradient(
                    proj.x - scaledRadius * 0.3, proj.y - scaledRadius * 0.3, 0,
                    proj.x, proj.y, scaledRadius
                );
                
                gradient.addColorStop(0, this._lightenColor(baseColor, 1.4));
                gradient.addColorStop(0.5, baseColor);
                gradient.addColorStop(1, this._shadeColor(baseColor, 0.4));
                
                renderCtx.fillStyle = gradient;
                renderCtx.beginPath();
                renderCtx.arc(proj.x, proj.y, scaledRadius, 0, Math.PI * 2);
                renderCtx.fill();
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a 3D ring/torus (viewed from above)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Center Z
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius (hole)
     * @param {string} color - Base color
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawRing(x, y, z, outerRadius, innerRadius, color, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        const scaledOuter = outerRadius * proj.scale;
        
        // Viewport culling
        if (this.shouldCullShape([proj], scaledOuter)) return;
        
        const scaledInner = innerRadius * proj.scale;
        const shadedColor = this.applyDepthShading(color, z);
        
        const drawFn = (renderCtx) => {
            renderCtx.fillStyle = shadedColor;
            renderCtx.beginPath();
            renderCtx.arc(proj.x, proj.y, scaledOuter, 0, Math.PI * 2);
            renderCtx.arc(proj.x, proj.y, scaledInner, Math.PI * 2, 0, true);
            renderCtx.fill();
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    // ==================== POLYGON / VERTEX-BASED DRAWING ====================
    
    /**
     * Draw a custom polygon from 3D vertices
     * @param {Array<{x: number, y: number, z: number}>} vertices - Array of 3D vertices
     * @param {string} color - Fill color
     * @param {Object} [options] - Drawing options
     * @param {boolean} [options.closed=true] - Close the polygon
     * @param {boolean} [options.fill=true] - Fill the polygon
     * @param {boolean} [options.stroke=false] - Stroke the outline
     * @param {string} [options.strokeColor='#000'] - Stroke color
     * @param {number} [options.strokeWidth=1] - Stroke width
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawPolygon(vertices, color, options = {}, ctx = null) {
        if (vertices.length < 3) return;
        
        const projected = this.projectVertices(vertices);
        if (!projected.some(p => p.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape(projected)) return;
        
        const closed = options.closed !== false;
        const fill = options.fill !== false;
        const stroke = options.stroke || false;
        const strokeColor = options.strokeColor || '#000';
        const strokeWidth = options.strokeWidth || 1;
        
        // Calculate average Z for sorting and shading
        const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length;
        const avgX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
        const avgY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
        const shadedColor = this.applyDepthShading(color, avgZ);
        const avgScale = projected.reduce((sum, p) => sum + p.scale, 0) / projected.length;
        
        const drawFn = (renderCtx) => {
            renderCtx.beginPath();
            renderCtx.moveTo(projected[0].x, projected[0].y);
            
            for (let i = 1; i < projected.length; i++) {
                renderCtx.lineTo(projected[i].x, projected[i].y);
            }
            
            if (closed) {
                renderCtx.closePath();
            }
            
            if (fill) {
                renderCtx.fillStyle = shadedColor;
                renderCtx.fill();
            }
            
            if (stroke) {
                renderCtx.strokeStyle = this.applyDepthShading(strokeColor, avgZ);
                renderCtx.lineWidth = strokeWidth * avgScale;
                renderCtx.stroke();
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(avgZ, drawFn, avgX, avgY);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a triangle in 3D space
     * @param {number} x1 - First vertex X
     * @param {number} y1 - First vertex Y
     * @param {number} z1 - First vertex Z
     * @param {number} x2 - Second vertex X
     * @param {number} y2 - Second vertex Y
     * @param {number} z2 - Second vertex Z
     * @param {number} x3 - Third vertex X
     * @param {number} y3 - Third vertex Y
     * @param {number} z3 - Third vertex Z
     * @param {string} color - Fill color
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3, color, ctx = null) {
        this.drawPolygon([
            { x: x1, y: y1, z: z1 },
            { x: x2, y: y2, z: z2 },
            { x: x3, y: y3, z: z3 }
        ], color, { closed: true, fill: true }, ctx);
    }
    
    /**
     * Draw an extruded polygon (2D shape with height)
     * @param {Array<{x: number, y: number}>} baseVertices - 2D vertices for the base
     * @param {number} z - Base Z level
     * @param {number} height - Extrusion height
     * @param {string} color - Base color
     * @param {Object} [options] - Options
     * @param {string} [options.topColor] - Top face color
     * @param {string} [options.sideColor] - Side face color
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawExtrudedPolygon(baseVertices, z, height, color, options = {}, ctx = null) {
        if (baseVertices.length < 3) return;
        
        const topColor = options.topColor || this._lightenColor(color, 1.2);
        const sideColor = options.sideColor || this._shadeColor(color, 0.7);
        const topZ = z + height;
        
        // Auto-subdivide tall extruded polygons.
        // Top cap is drawn only on the uppermost segment.
        if (this.autoSubdivideTall && !options._isSubdivision) {
            const segs = this._getTallShapeSegments(height);
            if (segs > 1) {
                const segH = height / segs;
                for (let i = 0; i < segs; i++) {
                    const segOpts = Object.assign({}, options, {
                        _isSubdivision: true,
                        _skipTopCap: i < segs - 1
                    });
                    this.drawExtrudedPolygon(baseVertices, z + i * segH, segH, color, segOpts, ctx);
                }
                return;
            }
        }
        
        // Calculate center of polygon for sorting
        const avgX = baseVertices.reduce((sum, v) => sum + v.x, 0) / baseVertices.length;
        const avgY = baseVertices.reduce((sum, v) => sum + v.y, 0) / baseVertices.length;
        
        // Project all vertices
        const bottomProj = baseVertices.map(v => this.project(v.x, v.y, z));
        const topProj = baseVertices.map(v => this.project(v.x, v.y, topZ));
        
        if (!bottomProj.some(p => p.visible) && !topProj.some(p => p.visible)) return;
        
        // Viewport culling
        const allProj = [...bottomProj, ...topProj];
        if (this.shouldCullShape(allProj)) return;
        
        const sortZ = z + height / 2;
        
        const drawFn = (renderCtx) => {
            // Draw side faces
            for (let i = 0; i < baseVertices.length; i++) {
                const next = (i + 1) % baseVertices.length;
                
                const quadProj = [
                    bottomProj[i],
                    bottomProj[next],
                    topProj[next],
                    topProj[i]
                ];
                
                // Calculate side brightness based on face normal
                const dx = baseVertices[next].x - baseVertices[i].x;
                const dy = baseVertices[next].y - baseVertices[i].y;
                const angle = Math.atan2(dy, dx);
                const brightness = 0.6 + Math.cos(angle) * 0.3;
                
                this._drawQuad(renderCtx, quadProj, 
                    this.applyDepthShading(this._shadeColor(sideColor, brightness), z), false);
            }
            
            // Draw top face - suppressed for interior subdivision segments
            if (!options._skipTopCap) {
                renderCtx.fillStyle = this.applyDepthShading(topColor, topZ);
                renderCtx.beginPath();
                renderCtx.moveTo(topProj[0].x, topProj[0].y);
                for (let i = 1; i < topProj.length; i++) {
                    renderCtx.lineTo(topProj[i].x, topProj[i].y);
                }
                renderCtx.closePath();
                renderCtx.fill();
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, avgX, avgY);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    // ==================== TEXTURE MAPPING ====================
    
    /**
     * Draw a textured rectangle at a 3D position
     * @param {HTMLImageElement|HTMLCanvasElement} texture - The texture image
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Z depth
     * @param {number} width - Width (or null for texture width)
     * @param {number} height - Height (or null for texture height)
     * @param {number} [rotation=0] - Rotation in radians
     * @param {Object} [options] - Options
     * @param {number} [options.alpha=1] - Opacity
     * @param {number} [options.srcX=0] - Source X
     * @param {number} [options.srcY=0] - Source Y
     * @param {number} [options.srcW] - Source width
     * @param {number} [options.srcH] - Source height
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawTexture(texture, x, y, z, width = null, height = null, rotation = 0, options = {}, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        const w = (width || texture.width) * proj.scale;
        const h = (height || texture.height) * proj.scale;
        
        // Viewport culling
        if (this.shouldCullShape([proj], Math.max(w, h) / 2)) return;
        
        const alpha = options.alpha !== undefined ? options.alpha : 1;
        
        const drawFn = (renderCtx) => {
            renderCtx.save();
            renderCtx.globalAlpha = alpha;
            renderCtx.translate(proj.x, proj.y);
            renderCtx.rotate(rotation);
            
            if (options.srcX !== undefined) {
                renderCtx.drawImage(
                    texture,
                    options.srcX, options.srcY,
                    options.srcW || texture.width, options.srcH || texture.height,
                    -w / 2, -h / 2, w, h
                );
            } else {
                renderCtx.drawImage(texture, -w / 2, -h / 2, w, h);
            }
            
            renderCtx.restore();
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a texture mapped to a quadrilateral (for perspective-correct texturing)
     * Uses affine texture mapping (not fully perspective-correct but fast)
     * @param {HTMLImageElement|HTMLCanvasElement} texture - The texture
     * @param {Array<{x: number, y: number, z: number}>} vertices - 4 corner vertices (clockwise from top-left)
     * @param {Object} [options] - Options
     * @param {number} [options.alpha=1] - Opacity
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawTexturedQuad(texture, vertices, options = {}, ctx = null) {
        if (vertices.length !== 4) return;
        
        const proj = this.projectVertices(vertices);
        if (!proj.some(p => p.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape(proj)) return;
        
        const avgZ = vertices.reduce((sum, v) => sum + v.z, 0) / 4;
        const avgX = vertices.reduce((sum, v) => sum + v.x, 0) / 4;
        const avgY = vertices.reduce((sum, v) => sum + v.y, 0) / 4;
        const alpha = options.alpha !== undefined ? options.alpha : 1;
        
        const drawFn = (renderCtx) => {
            renderCtx.save();
            renderCtx.globalAlpha = alpha;
            
            // Subdivide quad into two triangles for better quality
            this._drawTexturedTriangle(renderCtx, texture,
                proj[0], proj[1], proj[2],
                { u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }
            );
            this._drawTexturedTriangle(renderCtx, texture,
                proj[0], proj[2], proj[3],
                { u: 0, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 }
            );
            
            renderCtx.restore();
        };
        
        if (this._batchMode) {
            this._queueDraw(avgZ, drawFn, avgX, avgY);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Extract a 0-1 luminance/brightness value from a CSS colour string.
     * Used to convert face shading colours into a neutral overlay opacity.
     * @param {string} color
     * @returns {number} 0 (black) … 1 (white)
     * @private
     */
    _colorToBrightness(color) {
        if (color && color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            return 0.299 * r + 0.587 * g + 0.114 * b;
        }
        const m = color && color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) return (0.299 * parseInt(m[1]) + 0.587 * parseInt(m[2]) + 0.114 * parseInt(m[3])) / 255;
        return 1;
    }
    
    /**
     * Draw a textured triangle using affine mapping.
     * Clips to the screen-space triangle FIRST, then applies the affine transform
     * and draws the texture. This order ensures the clip and the transform never
     * interfere with each other, eliminating skewed textures and triangle extrusions.
     * @private
     */
    _drawTexturedTriangle(ctx, texture, p0, p1, p2, uv0, uv1, uv2) {
        const tw = texture.width;
        const th = texture.height;
        
        // Screen-space coordinates
        const x0 = p0.x, y0 = p0.y;
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        
        // Texture-space coordinates (in pixels)
        const u0 = uv0.u * tw, v0 = uv0.v * th;
        const u1 = uv1.u * tw, v1 = uv1.v * th;
        const u2 = uv2.u * tw, v2 = uv2.v * th;
        
        // Solve for affine transform: texture coords → screen coords
        const det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
        if (Math.abs(det) < 0.001) return;
        
        const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det;
        const b = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / det;
        const c = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / det;
        const d = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det;
        const e = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / det;
        const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / det;
        
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 1. Clip to the screen-space triangle BEFORE changing the transform.
        //    This locks the clip region to the correct device pixels and is never
        //    affected by the affine transform applied in step 2.
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.clip();
        
        // 2. Apply the affine transform (texture space → screen space).
        ctx.transform(a, d, b, e, c, f);
        
        // 3. Draw the full texture – the clip above ensures only the triangle is painted.
        ctx.drawImage(texture, 0, 0);
        ctx.restore();
    }
    
    /**
     * Draw a textured cone triangle face with shading
     * @private
     */
    _drawTexturedConeTriangle(ctx, texture, face, radius, segments, color, avgZ) {
        // Calculate UV coordinates based on the face angle
        const segmentAngle = (Math.PI * 2) / segments;
        const faceIndex = Math.round(face.angle / segmentAngle);
        
        // Map texture slice to cone face
        const u1 = faceIndex / segments;
        const u2 = (faceIndex + 1) / segments;
        
        // Draw textured triangle with shading overlay
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(face.apex.x, face.apex.y);
        ctx.lineTo(face.v1.x, face.v1.y);
        ctx.lineTo(face.v2.x, face.v2.y);
        ctx.closePath();
        ctx.clip();
        
        // Draw texture mapped to triangle
        this._drawTexturedTriangle(ctx, texture,
            face.apex, face.v1, face.v2,
            { u: (u1 + u2) / 2, v: 0 }, // apex at top center of slice
            { u: u1, v: 1 },             // v1 at bottom left
            { u: u2, v: 1 }              // v2 at bottom right
        );
        
        // Apply shading as a semi-transparent black overlay (grayscale brightness approach)
        const brightness = this._colorToBrightness(face.color);
        const darkness = Math.max(0, Math.min(1, 1 - brightness));
        if (darkness > 0.01) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(0,0,0,${darkness.toFixed(3)})`;
            ctx.fillRect(-10000, -10000, 20000, 20000);
        }
        ctx.restore();
    }
    
    /**
     * Draw a textured quad face with shading
     * @private
     */
    _drawTexturedQuadFace(ctx, texture, verts, color, uvCoords = null) {
        // Default UV coords: top-left → top-right → bottom-right → bottom-left
        const uvs = uvCoords || [
            { u: 0, v: 0 },
            { u: 1, v: 0 },
            { u: 1, v: 1 },
            { u: 0, v: 1 }
        ];
        
        const q = Math.max(1, Math.round(this.textureQuality));
        
        if (q === 1) {
            // Quality 1: simple 2-triangle diagonal split (fastest)
            this._drawTexturedTriangle(ctx, texture,
                verts[0], verts[1], verts[2],
                uvs[0], uvs[1], uvs[2]
            );
            this._drawTexturedTriangle(ctx, texture,
                verts[0], verts[2], verts[3],
                uvs[0], uvs[2], uvs[3]
            );
        } else if (q === 2) {
            // Quality 2: 4-triangle centroid fan (good balance)
            const cx = (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4;
            const cy = (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4;
            const cu = (uvs[0].u + uvs[1].u + uvs[2].u + uvs[3].u) / 4;
            const cv = (uvs[0].v + uvs[1].v + uvs[2].v + uvs[3].v) / 4;
            const cVert = { x: cx, y: cy };
            const cUV   = { u: cu, v: cv };
            for (let i = 0; i < 4; i++) {
                const ni = (i + 1) % 4;
                this._drawTexturedTriangle(ctx, texture,
                    cVert, verts[i], verts[ni],
                    cUV,   uvs[i],   uvs[ni]
                );
            }
        } else {
            // Quality 3+: NxN grid subdivision for near-perspective-correct mapping.
            // Bilinearly interpolate screen positions and UVs across the quad.
            const n = q; // grid divisions per axis
            // Helper: bilinear interpolation across the quad
            const lerp = (a, b, t) => a + (b - a) * t;
            const bilerp = (v0, v1, v2, v3, s, t) => {
                const top = lerp(v0, v1, s);
                const bot = lerp(v3, v2, s);
                return lerp(top, bot, t);
            };
            for (let row = 0; row < n; row++) {
                const t0 = row / n;
                const t1 = (row + 1) / n;
                for (let col = 0; col < n; col++) {
                    const s0 = col / n;
                    const s1 = (col + 1) / n;
                    // 4 corners of this sub-quad
                    const p00 = { x: bilerp(verts[0].x, verts[1].x, verts[2].x, verts[3].x, s0, t0),
                                  y: bilerp(verts[0].y, verts[1].y, verts[2].y, verts[3].y, s0, t0) };
                    const p10 = { x: bilerp(verts[0].x, verts[1].x, verts[2].x, verts[3].x, s1, t0),
                                  y: bilerp(verts[0].y, verts[1].y, verts[2].y, verts[3].y, s1, t0) };
                    const p11 = { x: bilerp(verts[0].x, verts[1].x, verts[2].x, verts[3].x, s1, t1),
                                  y: bilerp(verts[0].y, verts[1].y, verts[2].y, verts[3].y, s1, t1) };
                    const p01 = { x: bilerp(verts[0].x, verts[1].x, verts[2].x, verts[3].x, s0, t1),
                                  y: bilerp(verts[0].y, verts[1].y, verts[2].y, verts[3].y, s0, t1) };
                    // Corresponding UVs
                    const uv00 = { u: bilerp(uvs[0].u, uvs[1].u, uvs[2].u, uvs[3].u, s0, t0),
                                   v: bilerp(uvs[0].v, uvs[1].v, uvs[2].v, uvs[3].v, s0, t0) };
                    const uv10 = { u: bilerp(uvs[0].u, uvs[1].u, uvs[2].u, uvs[3].u, s1, t0),
                                   v: bilerp(uvs[0].v, uvs[1].v, uvs[2].v, uvs[3].v, s1, t0) };
                    const uv11 = { u: bilerp(uvs[0].u, uvs[1].u, uvs[2].u, uvs[3].u, s1, t1),
                                   v: bilerp(uvs[0].v, uvs[1].v, uvs[2].v, uvs[3].v, s1, t1) };
                    const uv01 = { u: bilerp(uvs[0].u, uvs[1].u, uvs[2].u, uvs[3].u, s0, t1),
                                   v: bilerp(uvs[0].v, uvs[1].v, uvs[2].v, uvs[3].v, s0, t1) };
                    // Two triangles per sub-quad
                    this._drawTexturedTriangle(ctx, texture, p00, p10, p11, uv00, uv10, uv11);
                    this._drawTexturedTriangle(ctx, texture, p00, p11, p01, uv00, uv11, uv01);
                }
            }
        }
        
        // Shading overlay: a semi-transparent black polygon drawn over the texture.
        // Bounded explicitly by the face polygon so it never leaks outside.
        const brightness = this._colorToBrightness(color);
        const darkness = Math.max(0, Math.min(1, 1 - brightness));
        if (darkness > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.closePath();
            ctx.fillStyle = `rgba(0,0,0,${darkness.toFixed(3)})`;
            ctx.fill();
            ctx.restore();
        }
    }
    
    /**
     * Draw a textured circle/sphere with shading
     * @private
     */
    _drawTexturedCircle(ctx, texture, proj, scaledRadius, color) {
        ctx.save();
        
        // Clip to circle
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, scaledRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw texture
        ctx.drawImage(texture, 
            proj.x - scaledRadius, proj.y - scaledRadius,
            scaledRadius * 2, scaledRadius * 2
        );
        
        // Apply directional shading gradient overlay using source-over so the texture
        // hue is preserved while brightness varies across the sphere surface.
        ctx.globalCompositeOperation = 'source-over';
        const baseBrightness = this._colorToBrightness(color);
        const gradient = ctx.createRadialGradient(
            proj.x - scaledRadius * 0.3, proj.y - scaledRadius * 0.3, 0,
            proj.x, proj.y, scaledRadius
        );
        // Highlight: almost no overlay; shadow: darkens toward the edge
        gradient.addColorStop(0,   `rgba(0,0,0,0)`);
        gradient.addColorStop(0.5, `rgba(0,0,0,${(Math.max(0, 1 - baseBrightness) * 0.3).toFixed(3)})`);
        gradient.addColorStop(1,   `rgba(0,0,0,${(Math.max(0, 1 - baseBrightness) * 0.7).toFixed(3)})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(proj.x - scaledRadius, proj.y - scaledRadius, scaledRadius * 2, scaledRadius * 2);
        
        ctx.restore();
    }
    
    // ==================== TEXT DRAWING ====================
    
    /**
     * Draw text at a 3D position
     * @param {string} text - The text to draw
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} z - Depth
     * @param {Object} [options] - Text options
     * @param {string} [options.font='16px Arial'] - Font
     * @param {string} [options.color='#fff'] - Text color
     * @param {string} [options.align='center'] - Text alignment
     * @param {string} [options.baseline='middle'] - Text baseline
     * @param {boolean} [options.stroke=false] - Stroke text
     * @param {string} [options.strokeColor='#000'] - Stroke color
     * @param {number} [options.strokeWidth=2] - Stroke width
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawText(text, x, y, z, options = {}, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        const font = options.font || '16px Arial';
        
        // Scale font size
        const fontSize = parseFloat(font);
        
        // Viewport culling (use a rough estimate for text size)
        if (this.shouldCullShape([proj], fontSize * proj.scale * 5)) return;
        
        const color = options.color || '#fff';
        const align = options.align || 'center';
        const baseline = options.baseline || 'middle';
        const stroke = options.stroke || false;
        const strokeColor = options.strokeColor || '#000';
        const strokeWidth = options.strokeWidth || 2;
        
        const scaledFont = font.replace(/[\d.]+/, (fontSize * proj.scale).toFixed(1));
        
        const shadedColor = this.applyDepthShading(color, z);
        
        const drawFn = (renderCtx) => {
            renderCtx.font = scaledFont;
            renderCtx.textAlign = align;
            renderCtx.textBaseline = baseline;
            
            if (stroke) {
                renderCtx.strokeStyle = this.applyDepthShading(strokeColor, z);
                renderCtx.lineWidth = strokeWidth * proj.scale;
                renderCtx.strokeText(text, proj.x, proj.y);
            }
            
            renderCtx.fillStyle = shadedColor;
            renderCtx.fillText(text, proj.x, proj.y);
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    // ==================== HELPER DRAWING FUNCTIONS ====================
    
    /**
     * Calculate how many vertical segments a tall shape needs to avoid perspective
     * distortion artefacts (crossed faces, excessive trapezoid stretch).
     * Returns 1 when no subdivision is required.
     * @param {number} h - Absolute height/depth of the shape along the Z axis
     * @returns {number}
     * @private
     */
    _getTallShapeSegments(h) {
        const ratio = Math.abs(h) / (this.focalLength * this.tallShapeThreshold);
        if (ratio <= 1) return 1;
        return Math.min(this.tallShapeSubdivisions, Math.ceil(ratio));
    }
    
    /**
     * Internal helper to draw a quad from projected vertices
     * @private
     */
    _drawQuad(ctx, projectedVerts, color, outline = false, outlineColor = '#000') {
        if (projectedVerts.length !== 4) return;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(projectedVerts[0].x, projectedVerts[0].y);
        ctx.lineTo(projectedVerts[1].x, projectedVerts[1].y);
        ctx.lineTo(projectedVerts[2].x, projectedVerts[2].y);
        ctx.lineTo(projectedVerts[3].x, projectedVerts[3].y);
        ctx.closePath();
        ctx.fill();
        
        if (outline) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    /**
     * Lighten a color
     * @private
     */
    _lightenColor(color, factor) {
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const r = Math.min(255, Math.round(parseInt(hex.slice(0, 2), 16) * factor));
            const g = Math.min(255, Math.round(parseInt(hex.slice(2, 4), 16) * factor));
            const b = Math.min(255, Math.round(parseInt(hex.slice(4, 6), 16) * factor));
            return `rgb(${r},${g},${b})`;
        }
        
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = Math.min(255, Math.round(parseInt(rgbMatch[1]) * factor));
            const g = Math.min(255, Math.round(parseInt(rgbMatch[2]) * factor));
            const b = Math.min(255, Math.round(parseInt(rgbMatch[3]) * factor));
            return `rgb(${r},${g},${b})`;
        }
        
        return color;
    }
    
    // ==================== BILLBOARD SPRITES ====================
    
    /**
     * Draw a billboard sprite (always faces camera, scales with depth)
     * @param {HTMLImageElement|HTMLCanvasElement} sprite - The sprite image
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} z - World Z (depth)
     * @param {Object} [options] - Options
     * @param {number} [options.width] - Override width
     * @param {number} [options.height] - Override height
     * @param {number} [options.anchorX=0.5] - Anchor X (0-1)
     * @param {number} [options.anchorY=1] - Anchor Y (0-1, 1 = bottom)
     * @param {number} [options.alpha=1] - Opacity
     * @param {boolean} [options.flipX=false] - Flip horizontally
     * @param {boolean} [options.flipY=false] - Flip vertically
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawBillboard(sprite, x, y, z, options = {}, ctx = null) {
        const proj = this.project(x, y, z);
        if (!proj.visible) return;
        
        const width = (options.width || sprite.width) * proj.scale;
        const height = (options.height || sprite.height) * proj.scale;
        
        // Viewport culling
        if (this.shouldCullShape([proj], Math.max(width, height))) return;
        
        const anchorX = options.anchorX !== undefined ? options.anchorX : 0.5;
        const anchorY = options.anchorY !== undefined ? options.anchorY : 1;
        const alpha = options.alpha !== undefined ? options.alpha : 1;
        const flipX = options.flipX || false;
        const flipY = options.flipY || false;
        
        const drawFn = (renderCtx) => {
            renderCtx.save();
            renderCtx.globalAlpha = alpha;
            
            const drawX = proj.x - width * anchorX;
            const drawY = proj.y - height * anchorY;
            
            if (flipX || flipY) {
                renderCtx.translate(proj.x, proj.y);
                renderCtx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
                renderCtx.drawImage(sprite, -width * anchorX, -height * anchorY, width, height);
            } else {
                renderCtx.drawImage(sprite, drawX, drawY, width, height);
            }
            
            renderCtx.restore();
        };
        
        if (this._batchMode) {
            this._queueDraw(z, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    // ==================== SHADOW SYSTEM ====================
    
    /**
     * Draw a shadow ellipse beneath an object
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Object's Z height (shadow is at z=0)
     * @param {number} radius - Shadow radius
     * @param {Object} [options] - Options
     * @param {number} [options.alpha=0.3] - Shadow opacity
     * @param {string} [options.color='#000'] - Shadow color
     * @param {number} [options.stretch=1.5] - Vertical stretch factor
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawShadow(x, y, z, radius, options = {}, ctx = null) {
        const shadowZ = 0; // Shadow always on ground
        const proj = this.project(x, y, shadowZ);
        if (!proj.visible) return;
        
        // Shadow shrinks as object gets higher
        const heightFactor = Math.max(0.3, 1 - z * 0.002);
        const alpha = (options.alpha !== undefined ? options.alpha : 0.3) * heightFactor;
        const color = options.color || '#000';
        const stretch = options.stretch || 1.5;
        
        const scaledRadius = radius * proj.scale * heightFactor;
        
        const drawFn = (renderCtx) => {
            renderCtx.save();
            renderCtx.globalAlpha = alpha;
            renderCtx.fillStyle = color;
            
            renderCtx.beginPath();
            renderCtx.ellipse(proj.x, proj.y, scaledRadius, scaledRadius / stretch, 0, 0, Math.PI * 2);
            renderCtx.fill();
            
            renderCtx.restore();
        };
        
        // Shadow should always be drawn behind the object
        const sortZ = -9999; // Very far back
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    // ==================== ADVANCED SHAPES ====================
    
    /**
     * Draw a wall segment (vertical rectangle in 3D space)
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} z - Base Z
     * @param {number} height - Wall height
     * @param {string} color - Wall color
     * @param {Object} [options] - Options
     * @param {HTMLImageElement} [options.texture] - Wall texture
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawWall(x1, y1, x2, y2, z, height, color, options = {}, ctx = null) {
        const topZ = z + height;
        
        // Auto-subdivide tall walls to keep each face's Z span small.
        if (this.autoSubdivideTall && !options._isSubdivision) {
            const segs = this._getTallShapeSegments(height);
            if (segs > 1) {
                const segH = height / segs;
                for (let i = 0; i < segs; i++) {
                    const segOpts = Object.assign({}, options, { _isSubdivision: true });
                    this.drawWall(x1, y1, x2, y2, z + i * segH, segH, color, segOpts, ctx);
                }
                return;
            }
        }
        
        const vertices = [
            { x: x1, y: y1, z: z },
            { x: x2, y: y2, z: z },
            { x: x2, y: y2, z: topZ },
            { x: x1, y: y1, z: topZ }
        ];
        
        const proj = this.projectVertices(vertices);
        if (!proj.some(p => p.visible)) return;
        
        // Viewport culling
        if (this.shouldCullShape(proj)) return;
        
        const avgZ = z + height / 2;
        const avgX = (x1 + x2) / 2;
        const avgY = (y1 + y2) / 2;
        
        // Calculate wall facing for brightness
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const brightness = 0.6 + Math.cos(angle) * 0.4;
        
        const drawFn = (renderCtx) => {
            if (options.texture) {
                // Textured wall
                this._drawTexturedTriangle(renderCtx, options.texture,
                    proj[0], proj[1], proj[2],
                    { u: 0, v: 1 }, { u: 1, v: 1 }, { u: 1, v: 0 }
                );
                this._drawTexturedTriangle(renderCtx, options.texture,
                    proj[0], proj[2], proj[3],
                    { u: 0, v: 1 }, { u: 1, v: 0 }, { u: 0, v: 0 }
                );
            } else {
                // Solid color wall
                this._drawQuad(renderCtx, proj, 
                    this.applyDepthShading(this._shadeColor(color, brightness), avgZ), false);
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(avgZ, drawFn, avgX, avgY);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a floor tile
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Z level
     * @param {number} width - Tile width
     * @param {number} height - Tile height (Y axis)
     * @param {string} color - Tile color
     * @param {Object} [options] - Options
     * @param {HTMLImageElement} [options.texture] - Tile texture
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawFloorTile(x, y, z, width, height, color, options = {}, ctx = null) {
        const hw = width / 2;
        const hh = height / 2;
        
        const vertices = [
            { x: x - hw, y: y - hh, z },
            { x: x + hw, y: y - hh, z },
            { x: x + hw, y: y + hh, z },
            { x: x - hw, y: y + hh, z }
        ];
        
        if (options.texture) {
            this.drawTexturedQuad(options.texture, vertices, options, ctx);
        } else {
            this.drawPolygon(vertices, color, { closed: true, fill: true }, ctx);
        }
    }
    
    /**
     * Draw a staircase
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} z - Base Z
     * @param {number} width - Stair width
     * @param {number} stepDepth - Depth of each step
     * @param {number} stepHeight - Height of each step
     * @param {number} steps - Number of steps
     * @param {string} color - Stair color
     * @param {number} [rotation=0] - Rotation in radians
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawStairs(x, y, z, width, stepDepth, stepHeight, steps, color, rotation = 0, ctx = null) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        for (let i = 0; i < steps; i++) {
            const stepZ = z + i * stepHeight;
            const stepY = y + i * stepDepth;
            
            // Rotate step position
            const rotX = x;
            const rotY = stepY * cos - 0 * sin + y * (1 - cos);
            
            // Draw step top (horizontal surface)
            const hw = width / 2;
            const hd = stepDepth / 2;
            
            // Top surface
            this.drawRect(rotX, rotY, stepZ + stepHeight, width, stepDepth, 
                this._lightenColor(color, 1.1), rotation, ctx);
            
            // Front face (riser)
            this.drawWall(
                rotX - hw, rotY + hd,
                rotX + hw, rotY + hd,
                stepZ, stepHeight, color, {}, ctx
            );
        }
    }
    
    // ==================== GRID AND HELPERS ====================
    
    /**
     * Draw a 3D grid at a specific Z level
     * @param {number} z - Z level
     * @param {number} [gridSize=64] - Size of each grid cell
     * @param {string} [color='rgba(255,255,255,0.2)'] - Grid line color
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawGrid(z, gridSize = 64, color = 'rgba(255,255,255,0.2)', ctx = null) {
        const vp = this.engine.viewport;
        const zoom = vp.zoom || 1;
        
        // Calculate visible area
        const left = vp.x - gridSize;
        const right = vp.x + this.engine.renderWidth / zoom + gridSize;
        const top = vp.y - gridSize;
        const bottom = vp.y + this.engine.renderHeight / zoom + gridSize;
        
        // Snap to grid
        const startX = Math.floor(left / gridSize) * gridSize;
        const startY = Math.floor(top / gridSize) * gridSize;
        
        const renderCtx = ctx || this.engine.offscreenCtx;
        
        // Draw vertical lines
        for (let x = startX; x <= right; x += gridSize) {
            this.drawLine(x, top, z, x, bottom, z, color, 1, renderCtx);
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= bottom; y += gridSize) {
            this.drawLine(left, y, z, right, y, z, color, 1, renderCtx);
        }
    }
    
    /**
     * Draw 3D axes at origin
     * @param {number} length - Axis length
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawAxes(length = 100, ctx = null) {
        // X axis (red)
        this.drawLine(0, 0, 0, length, 0, 0, '#ff0000', 2, ctx);
        // Y axis (green)
        this.drawLine(0, 0, 0, 0, length, 0, '#00ff00', 2, ctx);
        // Z axis (blue) - draw as vertical line going "up"
        this.drawLine(0, 0, 0, 0, 0, length, '#0000ff', 2, ctx);
        
        // Origin sphere
        this.drawSphere(0, 0, 0, 5, '#ffffff', ctx);
    }
    
    // ==================== DEPTH SORTING UTILITIES ====================
    
    /**
     * Create a sorted draw list from an array of 3D objects
     * Each object should have {x, y, z, draw: function(ctx)}
     * @param {Array} objects - Array of drawable objects
     * @returns {Array} Sorted array (back to front)
     */
    sortByDepth(objects) {
        return objects.slice().sort((a, b) => b.z - a.z);
    }
    
    /**
     * Get the sort depth for a set of vertices (average Z)
     * @param {Array<{z: number}>} vertices
     * @returns {number}
     */
    getAverageDepth(vertices) {
        if (!vertices.length) return 0;
        return vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length;
    }
    
    /**
     * Get the sort depth for a bounding box (max Z for back-to-front sorting)
     * @param {Array<{z: number}>} vertices
     * @returns {number}
     */
    getMaxDepth(vertices) {
        if (!vertices.length) return 0;
        return Math.max(...vertices.map(v => v.z));
    }
    
    // ==================== CAMERA CONTROLS ====================
    
    /**
     * Set the camera's Z position
     * @param {number} z - Camera Z position
     */
    setCameraZ(z) {
        this.cameraZ = z;
    }
    
    /**
     * Set the focal length (affects perspective distortion)
     * @param {number} focalLength - Focal length (higher = less distortion)
     */
    setFocalLength(focalLength) {
        this.focalLength = Math.max(100, focalLength);
    }
    
    /**
     * Set the vanishing point offset from viewport center
     * @param {number} x - X offset
     * @param {number} y - Y offset
     */
    setVanishingPoint(x, y) {
        this.vanishingPointX = x;
        this.vanishingPointY = y;
    }
    
    /**
     * Set depth culling range
     * @param {number} near - Near culling distance
     * @param {number} far - Far culling distance
     */
    setDepthCulling(near, far) {
        this.depthCullNear = near;
        this.depthCullFar = far;
    }
    
    // ==================== CONFIGURATION ====================
    
    /**
     * Enable or disable depth shading
     * @param {boolean} enabled
     * @param {number} [factor=0.3] - Shading intensity
     */
    setDepthShading(enabled, factor = 0.3) {
        this.showDepthShading = enabled;
        this.depthShadingFactor = factor;
    }
    
    /**
     * Set scale limits for depth projection
     * @param {number} min - Minimum scale for far objects
     * @param {number} max - Maximum scale for near objects
     */
    setScaleLimits(min, max) {
        this.minDepthScale = min;
        this.maxDepthScale = max;
    }
    
    // ==================== TREE SHAPES ====================
    
    /**
     * Draw a pine/conifer tree (triangular shape with trunk)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} trunkHeight - Height of the trunk
     * @param {number} foliageHeight - Height of the foliage (cone)
     * @param {number} trunkRadius - Radius of the trunk
     * @param {number} foliageRadius - Radius of the foliage base
     * @param {Object} [options] - Options
     * @param {string} [options.trunkColor='#5D4037'] - Trunk color (brown)
     * @param {string} [options.foliageColor='#2E7D32'] - Foliage color (green)
     * @param {number} [options.layers=3] - Number of foliage layers
     * @param {number} [options.segments=12] - Segments for cone smoothness
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawPineTree(x, y, z, trunkHeight, foliageHeight, trunkRadius, foliageRadius, options = {}, ctx = null) {
        const trunkColor = options.trunkColor || '#5D4037';
        const foliageColor = options.foliageColor || '#2E7D32';
        const layers = options.layers || 3;
        const segments = options.segments || 12;
        
        const sortZ = z + trunkHeight + foliageHeight / 2;
        
        const drawFn = (renderCtx) => {
            // Draw trunk (cylinder)
            this.drawCylinder(x, y, z, trunkRadius, trunkHeight, trunkColor, segments, renderCtx);
            
            // Draw layered foliage cones
            const layerHeight = foliageHeight / layers;
            for (let i = 0; i < layers; i++) {
                const layerZ = z + trunkHeight + (i * layerHeight * 0.6);
                const layerRadius = foliageRadius * (1 - i * 0.2);
                const coneHeight = layerHeight * 1.3;
                
                // Slightly different shade for each layer
                const layerColor = this._shadeColor(foliageColor, 0.9 + i * 0.1);
                this.drawCone(x, y, layerZ, layerRadius, coneHeight, layerColor, segments, renderCtx);
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw an oak/deciduous tree (spherical foliage with trunk)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} trunkHeight - Height of the trunk
     * @param {number} trunkRadius - Radius of the trunk
     * @param {number} foliageRadius - Radius of the foliage sphere
     * @param {Object} [options] - Options
     * @param {string} [options.trunkColor='#5D4037'] - Trunk color (brown)
     * @param {string} [options.foliageColor='#4CAF50'] - Foliage color (green)
     * @param {number} [options.clusters=1] - Number of foliage clusters (1-5)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawOakTree(x, y, z, trunkHeight, trunkRadius, foliageRadius, options = {}, ctx = null) {
        const trunkColor = options.trunkColor || '#5D4037';
        const foliageColor = options.foliageColor || '#4CAF50';
        const clusters = Math.max(1, Math.min(5, options.clusters || 1));
        
        const sortZ = z + trunkHeight + foliageRadius;
        
        const drawFn = (renderCtx) => {
            // Draw trunk
            this.drawCylinder(x, y, z, trunkRadius, trunkHeight, trunkColor, 8, renderCtx);
            
            // Draw foliage cluster(s)
            const foliageZ = z + trunkHeight;
            
            if (clusters === 1) {
                // Single central sphere
                this.drawSphere(x, y, foliageZ + foliageRadius * 0.5, foliageRadius, foliageColor, renderCtx);
            } else {
                // Multiple overlapping spheres for fuller look
                const clusterRadius = foliageRadius * 0.7;
                const spreadRadius = foliageRadius * 0.4;
                
                // Central sphere
                this.drawSphere(x, y, foliageZ + foliageRadius * 0.5, clusterRadius, foliageColor, renderCtx);
                
                // Surrounding spheres
                for (let i = 0; i < clusters - 1; i++) {
                    const angle = (i / (clusters - 1)) * Math.PI * 2;
                    const cx = x + Math.cos(angle) * spreadRadius;
                    const cy = y + Math.sin(angle) * spreadRadius;
                    const cz = foliageZ + foliageRadius * 0.3 + Math.random() * foliageRadius * 0.3;
                    const cr = clusterRadius * (0.8 + Math.random() * 0.2);
                    const cc = this._shadeColor(foliageColor, 0.85 + Math.random() * 0.3);
                    this.drawSphere(cx, cy, cz, cr, cc, renderCtx);
                }
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a palm tree (curved trunk with fronds)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} trunkHeight - Height of the trunk
     * @param {number} trunkRadius - Radius of the trunk
     * @param {number} frondLength - Length of palm fronds
     * @param {Object} [options] - Options
     * @param {string} [options.trunkColor='#8D6E63'] - Trunk color (tan/brown)
     * @param {string} [options.frondColor='#66BB6A'] - Frond color (green)
     * @param {number} [options.fronds=7] - Number of fronds
     * @param {number} [options.trunkCurve=0] - Trunk curve amount (pixels offset at top)
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawPalmTree(x, y, z, trunkHeight, trunkRadius, frondLength, options = {}, ctx = null) {
        const trunkColor = options.trunkColor || '#8D6E63';
        const frondColor = options.frondColor || '#66BB6A';
        const frondCount = options.fronds || 7;
        const trunkCurve = options.trunkCurve || 0;
        
        const sortZ = z + trunkHeight + frondLength * 0.3;
        
        const drawFn = (renderCtx) => {
            // Draw trunk segments (to simulate curved or straight trunk)
            const segments = 6;
            const segmentHeight = trunkHeight / segments;
            
            for (let i = 0; i < segments; i++) {
                const t = i / segments;
                const nextT = (i + 1) / segments;
                
                // Curve offset increases towards top
                const curveOffset = trunkCurve * Math.pow(t, 2);
                const nextCurveOffset = trunkCurve * Math.pow(nextT, 2);
                
                // Trunk gets thinner towards top
                const radiusFactor = 1 - t * 0.3;
                const segmentRadius = trunkRadius * radiusFactor;
                
                const segZ = z + i * segmentHeight;
                const segX = x + curveOffset;
                
                // Draw as a cylinder segment
                this.drawCylinder(segX, y, segZ, segmentRadius, segmentHeight * 1.1, 
                    this._shadeColor(trunkColor, 0.9 + (i % 2) * 0.15), 6, renderCtx);
            }
            
            // Frond attachment point
            const topX = x + trunkCurve;
            const topZ = z + trunkHeight;
            
            // Draw fronds (elongated triangles radiating from top)
            for (let i = 0; i < frondCount; i++) {
                const angle = (i / frondCount) * Math.PI * 2;
                const droop = 0.3 + Math.random() * 0.2; // How much the frond droops
                
                // Frond base at trunk top
                const frondBaseX = topX;
                const frondBaseY = y;
                const frondBaseZ = topZ;
                
                // Frond tip (droops down)
                const frondTipX = topX + Math.cos(angle) * frondLength;
                const frondTipY = y + Math.sin(angle) * frondLength;
                const frondTipZ = topZ - frondLength * droop;
                
                // Frond color with slight variation
                const fc = this._shadeColor(frondColor, 0.85 + Math.random() * 0.3);
                
                // Draw frond as a line (or could be a thin triangle)
                this.drawLine(frondBaseX, frondBaseY, frondBaseZ, 
                    frondTipX, frondTipY, frondTipZ, fc, 3, renderCtx);
                
                // Add secondary frond lines for fullness
                const midX = (frondBaseX + frondTipX) / 2;
                const midY = (frondBaseY + frondTipY) / 2;
                const midZ = (frondBaseZ + frondTipZ) / 2 + frondLength * 0.05;
                
                this.drawLine(frondBaseX, frondBaseY, frondBaseZ, 
                    midX, midY, midZ, fc, 4, renderCtx);
            }
            
            // Central coconut cluster (optional visual)
            this.drawSphere(topX, y, topZ, trunkRadius * 0.8, 
                this._shadeColor(frondColor, 0.6), renderCtx);
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a bush/shrub (low-lying foliage cluster)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} radius - Bush radius
     * @param {number} height - Bush height
     * @param {Object} [options] - Options
     * @param {string} [options.color='#43A047'] - Bush color
     * @param {number} [options.clusters=3] - Number of foliage clusters
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawBush(x, y, z, radius, height, options = {}, ctx = null) {
        const color = options.color || '#43A047';
        const clusters = options.clusters || 3;
        
        const sortZ = z + height / 2;
        
        const drawFn = (renderCtx) => {
            // Draw multiple overlapping spheres for bush look
            const baseRadius = radius * 0.6;
            
            // Central cluster
            this.drawSphere(x, y, z + height * 0.4, baseRadius, color, renderCtx);
            
            // Surrounding clusters
            for (let i = 0; i < clusters; i++) {
                const angle = (i / clusters) * Math.PI * 2;
                const cx = x + Math.cos(angle) * radius * 0.4;
                const cy = y + Math.sin(angle) * radius * 0.4;
                const cz = z + height * 0.2 + Math.random() * height * 0.2;
                const cr = baseRadius * (0.6 + Math.random() * 0.4);
                const cc = this._shadeColor(color, 0.85 + Math.random() * 0.3);
                this.drawSphere(cx, cy, cz, cr, cc, renderCtx);
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
    
    /**
     * Draw a dead/bare tree (trunk with branches, no foliage)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} z - Base Z
     * @param {number} trunkHeight - Height of the trunk
     * @param {number} trunkRadius - Radius of the trunk
     * @param {Object} [options] - Options
     * @param {string} [options.color='#5D4037'] - Tree color (brown)
     * @param {number} [options.branches=5] - Number of branches
     * @param {number} [options.branchLength=40] - Branch length
     * @param {CanvasRenderingContext2D} [ctx]
     */
    drawDeadTree(x, y, z, trunkHeight, trunkRadius, options = {}, ctx = null) {
        const color = options.color || '#5D4037';
        const branchCount = options.branches || 5;
        const branchLength = options.branchLength || 40;
        
        const sortZ = z + trunkHeight;
        
        const drawFn = (renderCtx) => {
            // Draw main trunk
            this.drawCylinder(x, y, z, trunkRadius, trunkHeight, color, 6, renderCtx);
            
            // Draw branches at various heights
            for (let i = 0; i < branchCount; i++) {
                const branchZ = z + trunkHeight * (0.4 + Math.random() * 0.5);
                const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
                
                // Branch angles slightly upward
                const endX = x + Math.cos(angle) * branchLength;
                const endY = y + Math.sin(angle) * branchLength;
                const endZ = branchZ + branchLength * 0.3;
                
                const branchColor = this._shadeColor(color, 0.8 + Math.random() * 0.2);
                this.drawLine(x, y, branchZ, endX, endY, endZ, branchColor, 
                    trunkRadius * 0.4, renderCtx);
                
                // Add smaller sub-branches
                const subAngle = angle + (Math.random() - 0.5) * 0.8;
                const subLength = branchLength * 0.5;
                const subEndX = endX + Math.cos(subAngle) * subLength;
                const subEndY = endY + Math.sin(subAngle) * subLength;
                const subEndZ = endZ + subLength * 0.2;
                
                this.drawLine(endX, endY, endZ, subEndX, subEndY, subEndZ, 
                    branchColor, trunkRadius * 0.2, renderCtx);
            }
        };
        
        if (this._batchMode) {
            this._queueDraw(sortZ, drawFn, x, y);
        } else {
            drawFn(ctx || this.engine.offscreenCtx);
        }
    }
}

// Expose to window
window.TopDownThreeD = TopDownThreeD;
