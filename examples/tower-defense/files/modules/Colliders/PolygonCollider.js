/**
 * PolygonCollider Module
 * Provides polygon collision detection with custom shapes
 * Can collide with BoxCollider, SphereCollider, and other PolygonColliders
 * Supports auto-detection from Procedural modules (ProceduralRock, ProceduralTree, etc.)
 */

class PolygonCollider extends Module {
    constructor() {
        super();
        
        // Editable properties
        this.points = [
            new Vector2(-32, -32),
            new Vector2(32, -32),
            new Vector2(0, 32)
        ]; // Array of Vector2 points (minimum 3)
        
        this.offsetX = 0;     // Offset from gameObject position
        this.offsetY = 0;
        this.isTrigger = false; // If true, collisions are detected but no physics response
        this.tag = 'solid';        // Tag for collision filtering
        
        // Source module auto-detection
        this.sourceModule = '';  // Name of module to get polygon from (e.g., 'ProceduralRock')
        this.autoDetectOnStart = true;  // Auto-detect polygon from source module on game start
        this.useConvexHull = true;  // Convert to convex hull for better collision performance
        this.simplifyPoints = false; // Reduce point count for performance
        this.maxPoints = 12;  // Max points when simplifying
        
        // Debug visualization
        this.showDebug = true;
        this.debugColor = '#09ff00';
        
        // Editor gizmo settings
        this.showGizmoAlways = true;  // Show edit handles even when not selected
        this.pointRadius = 8;         // Size of draggable point handles
        this.pointColor = '#00ff88';   // Color of point handles
        
        // Editor state
        this.selectedPointIndex = -1;
        this.isDraggingPoint = false;
        
        // Internal
        this._sourceModuleRef = null;
        this._lastSourceHash = '';
        this._sourceRetryCount = 0;
        this._sourceFound = false;
        this._midpointInserted = false;  // Track if a midpoint was already inserted during current drag
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Colliders';
    
    static getIcon() {
        return '⬡';
    }
    
    static getDescription() {
        return 'Custom polygon collision detection with auto-detection from Procedural modules';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    /**
     * Property metadata with organized sections
     */
    getPropertyMetadata() {
        return [
            // === SOURCE MODULE AUTO-DETECTION ===
            { type: 'header', label: '🔗 Auto-Detection from Module' },
            { type: 'hint', label: 'Automatically get collision shape from Procedural modules' },
            { key: 'sourceModule', type: 'select', label: 'Source Module', 
              options: ['', 'ProceduralRock', 'ProceduralTree', 'ProceduralBuilding', 'ProceduralPlant', 'ProceduralFence', 'ProceduralWater', 'ProceduralVehicle', 'PolygonRenderer', 'SimplePolygonRenderer', 'VehicleControllerRenderer'],
              hint: 'Module to get polygon vertices from' },
            { key: 'autoDetectOnStart', type: 'boolean', label: 'Auto-Detect on Start', default: true,
              showIf: (m) => m.sourceModule !== '' },
            { type: 'button', label: '🔄 Detect Now', action: 'detectFromSourceModule',
              showIf: (m) => m.sourceModule !== '' },
            { key: 'useConvexHull', type: 'boolean', label: 'Use Convex Hull', default: true,
              hint: 'Convert to convex shape for reliable collision' },
            { key: 'simplifyPoints', type: 'boolean', label: 'Simplify Points', default: false,
              hint: 'Reduce point count for better performance' },
            { key: 'maxPoints', type: 'number', label: 'Max Points', default: 12, min: 3, max: 32,
              showIf: { simplifyPoints: true } },
            
            // === SHAPE ===
            { type: 'header', label: '⬡ Polygon Shape' },
            { type: 'hint', label: 'Define custom collision shape with at least 3 points' },
            { key: 'points', type: 'array', label: 'Points', elementType: 'vector2', defaultValue: new Vector2(0, 0), minItems: 3 },
            
            // === OFFSET ===
            { type: 'header', label: '↔️ Offset' },
            { key: 'offsetX', type: 'number', label: 'Offset X', default: 0 },
            { key: 'offsetY', type: 'number', label: 'Offset Y', default: 0 },
            
            // === BEHAVIOR ===
            { type: 'header', label: '⚡ Behavior' },
            { key: 'isTrigger', type: 'boolean', label: 'Is Trigger', default: false },
            { type: 'hint', label: 'Triggers detect collisions but don\'t block movement' },
            { key: 'tag', type: 'text', label: 'Tag', default: '' },
            
            // === DEBUG ===
            { type: 'header', label: '🔧 Debug Visualization' },
            { key: 'showDebug', type: 'boolean', label: 'Show Debug', default: true },
            { key: 'debugColor', type: 'color', label: 'Debug Color', default: '#ff00ff', showIf: { showDebug: true } },
            { key: 'showGizmoAlways', type: 'boolean', label: 'Always Show Gizmos', default: true,
              hint: 'Show edit handles even when not selected' },
            { key: 'pointRadius', type: 'slider', label: 'Point Size', default: 8, min: 4, max: 20, showIf: { showDebug: true } },
            { key: 'pointColor', type: 'color', label: 'Point Color', default: '#00ff88', showIf: { showDebug: true } }
        ];
    }
    
    // ==================== SOURCE MODULE INTEGRATION ====================
    
    /**
     * Detect and load polygon from source module
     * Called automatically on start if autoDetectOnStart is true
     */
    detectFromSourceModule() {
        if (!this.sourceModule || !this.gameObject) return false;
        
        const sourceModuleInstance = this.gameObject.getModule(this.sourceModule);
        if (!sourceModuleInstance) {
            console.warn(`PolygonCollider: Source module '${this.sourceModule}' not found on this object`);
            return false;
        }
        
        // Check if module has getPolygonCollider method
        if (typeof sourceModuleInstance.getPolygonCollider !== 'function') {
            console.warn(`PolygonCollider: Source module '${this.sourceModule}' does not have getPolygonCollider() method`);
            return false;
        }
        
        // Get polygon data from source module (local space)
        const polygonData = sourceModuleInstance.getPolygonCollider(false);
        if (!polygonData || !polygonData.vertices || polygonData.vertices.length < 3) {
            console.warn(`PolygonCollider: Source module returned invalid polygon data`);
            return false;
        }
        
        let vertices = polygonData.vertices.map(v => ({ x: v.x, y: v.y }));
        
        // Apply convex hull if enabled
        if (this.useConvexHull) {
            vertices = this._computeConvexHull(vertices);
        }
        
        // Simplify points if enabled
        if (this.simplifyPoints && vertices.length > this.maxPoints) {
            vertices = this._simplifyPolygon(vertices, this.maxPoints);
        }
        
        // Convert to Vector2 points
        this.points = vertices.map(v => new Vector2(v.x, v.y));
        this._sourceModuleRef = sourceModuleInstance;
        
        // Create hash for change detection
        this._lastSourceHash = this._computeHash(sourceModuleInstance);
        
        return true;
    }
    
    /**
     * Check if source module has changed and needs re-detection
     */
    checkSourceModuleChanged() {
        if (!this._sourceModuleRef || !this.sourceModule) return false;
        
        const currentHash = this._computeHash(this._sourceModuleRef);
        if (currentHash !== this._lastSourceHash) {
            this._lastSourceHash = currentHash;
            return true;
        }
        return false;
    }
    
    /**
     * Compute simple hash for change detection
     * @private
     */
    _computeHash(module) {
        // Use seed and size properties common to procedural modules
        const seed = module.seed || 0;
        const size = module.size || module.width || 0;
        const style = module.rockStyle || module.treeStyle || module.buildingStyle || '';
        return `${seed}-${size}-${style}`;
    }
    
    /**
     * Compute convex hull using Graham scan algorithm
     * @param {Array<{x: number, y: number}>} points
     * @returns {Array<{x: number, y: number}>}
     */
    _computeConvexHull(points) {
        if (points.length < 3) return points;
        
        // Find lowest point (and leftmost if tie)
        let lowest = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < points[lowest].y ||
                (points[i].y === points[lowest].y && points[i].x < points[lowest].x)) {
                lowest = i;
            }
        }
        
        // Swap lowest to first position
        [points[0], points[lowest]] = [points[lowest], points[0]];
        const pivot = points[0];
        
        // Sort by polar angle with respect to pivot
        const sorted = points.slice(1).sort((a, b) => {
            const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
            const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
            if (angleA !== angleB) return angleA - angleB;
            // If same angle, sort by distance
            const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
            const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
            return distA - distB;
        });
        
        // Build hull
        const hull = [pivot];
        for (const pt of sorted) {
            while (hull.length > 1) {
                const top = hull[hull.length - 1];
                const second = hull[hull.length - 2];
                const cross = (top.x - second.x) * (pt.y - second.y) - 
                              (top.y - second.y) * (pt.x - second.x);
                if (cross <= 0) {
                    hull.pop();
                } else {
                    break;
                }
            }
            hull.push(pt);
        }
        
        return hull;
    }
    
    /**
     * Simplify polygon to target number of points using Ramer-Douglas-Peucker-like approach
     * @param {Array<{x: number, y: number}>} points
     * @param {number} targetCount
     * @returns {Array<{x: number, y: number}>}
     */
    _simplifyPolygon(points, targetCount) {
        if (points.length <= targetCount) return points;
        
        // Calculate importance of each point (distance from line between neighbors)
        const importance = [];
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            // Distance from point to line between prev and next
            const dist = this._pointToLineDistance(curr.x, curr.y, prev.x, prev.y, next.x, next.y);
            importance.push({ index: i, dist, point: curr });
        }
        
        // Sort by importance (keep most important)
        importance.sort((a, b) => b.dist - a.dist);
        
        // Keep top targetCount points
        const keepIndices = new Set(importance.slice(0, targetCount).map(p => p.index));
        
        // Return points in original order
        return points.filter((_, i) => keepIndices.has(i));
    }
    
    /**
     * Calculate distance from point to line
     * @private
     */
    _pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    }
    
    // ==================== LIFECYCLE ====================
    
    /**
     * Called when the game starts
     * Auto-detects polygon from source module if enabled
     */
    start() {
        this._sourceRetryCount = 0;
        this._sourceFound = false;
        
        if (this.sourceModule && this.autoDetectOnStart) {
            this._sourceFound = this.detectFromSourceModule();
        }
    }
    
    /**
     * Called at the beginning of each frame
     * Retries finding the source module up to 100 times if not found yet
     */
    beginLoop(deltaTime) {
        // If source module is set but not yet found, keep retrying
        if (this.sourceModule && this.autoDetectOnStart && !this._sourceFound && this._sourceRetryCount < 100) {
            this._sourceRetryCount++;
            this._sourceFound = this.detectFromSourceModule();
            
            if (this._sourceFound) {
                console.log(`PolygonCollider: Found source module '${this.sourceModule}' after ${this._sourceRetryCount} attempts`);
            } else if (this._sourceRetryCount >= 100) {
                console.warn(`PolygonCollider: Could not find source module '${this.sourceModule}' after 100 attempts, using default shape`);
            }
        }
    }
    
    /**
     * Called every frame
     * Can re-detect polygon if source module changes (for editor previews)
     */
    loop() {
        // Optionally re-detect if source changed (useful in editor)
        // This is commented out for performance - use manual detection or detectFromSourceModule()
        // if (this.checkSourceModuleChanged()) {
        //     this.detectFromSourceModule();
        // }
    }
    
    // ==================== POLYGON UTILITIES ====================
    
    /**
     * Get the world-space transformed points of the polygon
     * @returns {Array<Vector2>}
     */
    getWorldPoints() {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = this.gameObject.angle || 0;
        
        const cos = Math.cos(angle * Math.PI / 180);
        const sin = Math.sin(angle * Math.PI / 180);
        
        return this.points.map(point => {
            // Apply scale
            let x = point.x * worldScale.x;
            let y = point.y * worldScale.y;
            
            // Apply rotation
            const rotatedX = x * cos - y * sin;
            const rotatedY = x * sin + y * cos;
            
            // Apply position offset
            return new Vector2(
                rotatedX + worldPos.x + this.offsetX,
                rotatedY + worldPos.y + this.offsetY
            );
        });
    }

    getWorldPointsDraw() {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = this.gameObject.angle || 0;
        
        const cos = Math.cos(angle * Math.PI / 180);
        const sin = Math.sin(angle * Math.PI / 180);
        
        return this.points.map(point => {
            // Apply scale
            let x = point.x * worldScale.x;
            let y = point.y * worldScale.y;
            
            // Apply rotation
            const rotatedX = x * cos - y * sin;
            const rotatedY = x * sin + y * cos;
            
            // Apply position offset
            return new Vector2(
                rotatedX + worldPos.x + this.offsetX,
                rotatedY + worldPos.y + this.offsetY
            );
        });
    }
    
    /**
     * Get the axis-aligned bounding box of the polygon
     * @returns {Object} {left, right, top, bottom, x, y, width, height, centerX, centerY}
     */
    getBounds() {
        const worldPoints = this.getWorldPoints();
        
        if (worldPoints.length === 0) {
            const worldPos = this.gameObject.position || { x: 0, y: 0 };
            return {
                left: worldPos.x, right: worldPos.x,
                top: worldPos.y, bottom: worldPos.y,
                x: worldPos.x, y: worldPos.y,
                width: 0, height: 0,
                centerX: worldPos.x, centerY: worldPos.y
            };
        }
        
        let minX = worldPoints[0].x;
        let maxX = worldPoints[0].x;
        let minY = worldPoints[0].y;
        let maxY = worldPoints[0].y;
        
        for (let i = 1; i < worldPoints.length; i++) {
            minX = Math.min(minX, worldPoints[i].x);
            maxX = Math.max(maxX, worldPoints[i].x);
            minY = Math.min(minY, worldPoints[i].y);
            maxY = Math.max(maxY, worldPoints[i].y);
        }
        
        return {
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }
    
    /**
     * Check if a point is inside the polygon (world space)
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPoint(x, y) {
        const worldPoints = this.getWorldPoints();
        
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = worldPoints.length - 1; i < worldPoints.length; j = i++) {
            const xi = worldPoints[i].x;
            const yi = worldPoints[i].y;
            const xj = worldPoints[j].x;
            const yj = worldPoints[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    /**
     * Get the polygon's axes for SAT (Separating Axis Theorem)
     * @returns {Array<{x: number, y: number}>}
     */
    getAxes() {
        const worldPoints = this.getWorldPoints();
        const axes = [];
        
        for (let i = 0; i < worldPoints.length; i++) {
            const p1 = worldPoints[i];
            const p2 = worldPoints[(i + 1) % worldPoints.length];
            
            // Get edge vector
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            
            // Get perpendicular (normal)
            const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
            if (len > 0) {
                axes.push({
                    x: -edgeY / len,
                    y: edgeX / len
                });
            }
        }
        
        return axes;
    }
    
    /**
     * Project polygon onto an axis
     * @param {Object} axis {x, y}
     * @returns {Object} {min, max}
     */
    projectOntoAxis(axis) {
        const worldPoints = this.getWorldPoints();
        
        let min = worldPoints[0].x * axis.x + worldPoints[0].y * axis.y;
        let max = min;
        
        for (let i = 1; i < worldPoints.length; i++) {
            const projection = worldPoints[i].x * axis.x + worldPoints[i].y * axis.y;
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }
        
        return { min, max };
    }
    
    // ==================== COLLISION DETECTION ====================
    
    /**
     * Check if this polygon overlaps with another polygon
     * Uses Separating Axis Theorem (SAT)
     * @param {PolygonCollider} other
     * @returns {boolean}
     */
    overlapsPolygon(other) {
        const axes = [...this.getAxes(), ...other.getAxes()];
        
        for (const axis of axes) {
            const proj1 = this.projectOntoAxis(axis);
            const proj2 = other.projectOntoAxis(axis);
            
            if (proj1.max < proj2.min || proj2.max < proj1.min) {
                return false; // Found separating axis
            }
        }
        
        return true; // No separating axis found
    }
    
    /**
     * Check if this polygon overlaps with a box collider
     * @param {BoxCollider} boxCollider
     * @returns {boolean}
     */
    overlapsBox(boxCollider) {
        // Get box corners as a polygon
        const bounds = boxCollider.getBounds();
        const boxPoints = [
            { x: bounds.left, y: bounds.top },
            { x: bounds.right, y: bounds.top },
            { x: bounds.right, y: bounds.bottom },
            { x: bounds.left, y: bounds.bottom }
        ];
        
        // Test polygon axes
        const polyAxes = this.getAxes();
        for (const axis of polyAxes) {
            const proj1 = this.projectOntoAxis(axis);
            const proj2 = this.projectBoxOntoAxis(boxPoints, axis);
            
            if (proj1.max < proj2.min || proj2.max < proj1.min) {
                return false;
            }
        }
        
        // Test box axes (horizontal and vertical)
        const boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        for (const axis of boxAxes) {
            const proj1 = this.projectOntoAxis(axis);
            const proj2 = this.projectBoxOntoAxis(boxPoints, axis);
            
            if (proj1.max < proj2.min || proj2.max < proj1.min) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Project box points onto an axis
     * @param {Array} points
     * @param {Object} axis
     * @returns {Object} {min, max}
     */
    projectBoxOntoAxis(points, axis) {
        let min = points[0].x * axis.x + points[0].y * axis.y;
        let max = min;
        
        for (let i = 1; i < points.length; i++) {
            const projection = points[i].x * axis.x + points[i].y * axis.y;
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }
        
        return { min, max };
    }
    
    /**
     * Check if this polygon overlaps with a sphere collider
     * @param {SphereCollider} sphereCollider
     * @returns {boolean}
     */
    overlapsSphere(sphereCollider) {
        const center = sphereCollider.getCenter();
        const radius = sphereCollider.getScaledRadius();
        const worldPoints = this.getWorldPoints();
        
        // Check if circle center is inside polygon
        if (this.containsPoint(center.x, center.y)) {
            return true;
        }
        
        // Check distance to each edge
        for (let i = 0; i < worldPoints.length; i++) {
            const p1 = worldPoints[i];
            const p2 = worldPoints[(i + 1) % worldPoints.length];
            
            const dist = this.pointToSegmentDistance(center.x, center.y, p1.x, p1.y, p2.x, p2.y);
            if (dist <= radius) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate distance from point to line segment
     * @param {number} px Point X
     * @param {number} py Point Y
     * @param {number} x1 Segment start X
     * @param {number} y1 Segment start Y
     * @param {number} x2 Segment end X
     * @param {number} y2 Segment end Y
     * @returns {number}
     */
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // Segment is a point
            const dpx = px - x1;
            const dpy = py - y1;
            return Math.sqrt(dpx * dpx + dpy * dpy);
        }
        
        // Project point onto line
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        const distX = px - closestX;
        const distY = py - closestY;
        
        return Math.sqrt(distX * distX + distY * distY);
    }
    
    /**
     * Check if this collider overlaps with another (any type)
     * @param {Module} other
     * @returns {boolean}
     */
    overlaps(other) {
        if (other instanceof PolygonCollider || (other.constructor && other.constructor.name === 'PolygonCollider')) {
            return this.overlapsPolygon(other);
        } else if (other instanceof BoxCollider || (other.constructor && other.constructor.name === 'BoxCollider')) {
            return this.overlapsBox(other);
        } else if (other instanceof SphereCollider || (other.constructor && other.constructor.name === 'SphereCollider')) {
            return this.overlapsSphere(other);
        }
        return false;
    }
    
    // ==================== EDITOR GIZMO SUPPORT ====================
    
    /**
     * Get gizmo handles for level editor
     * Returns array of handle objects for manipulation (like TDPath gizmo system)
     * Note: All handle positions are in WORLD coordinates.
     * Points are stored in local space relative to object position.
     */
    getEditorGizmoHandles() {
        if (!this.showDebug) return [];
        
        // Ensure we have at least 3 points
        if (this.points.length < 3) {
            this.points = [
                new Vector2(-32, -32),
                new Vector2(32, -32),
                new Vector2(0, 32)
            ];
        }
        
        const handles = [];
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = this.gameObject.angle || 0;
        const cos = Math.cos(angle * Math.PI / 180);
        const sin = Math.sin(angle * Math.PI / 180);
        
        // Create a handle for each vertex
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const pointIndex = i;
            
            // Transform local point to world space
            let x = point.x * worldScale.x;
            let y = point.y * worldScale.y;
            const worldX = x * cos - y * sin + worldPos.x + this.offsetX;
            const worldY = x * sin + y * cos + worldPos.y + this.offsetY;
            
            handles.push({
                id: `poly_${i}`,
                index: i,
                x: worldX,
                y: worldY,
                radius: this.pointRadius,
                color: this.pointColor,
                label: `P${i}`,
                onDrag: (newX, newY) => {
                    // Inverse transform from world to local space
                    const currentPos = this.gameObject.position || { x: 0, y: 0 };
                    const currentScale = this.gameObject.getWorldScale();
                    const currentAngle = this.gameObject.angle || 0;
                    
                    let localX = newX - currentPos.x - this.offsetX;
                    let localY = newY - currentPos.y - this.offsetY;
                    
                    // Inverse rotation
                    const invCos = Math.cos(-currentAngle * Math.PI / 180);
                    const invSin = Math.sin(-currentAngle * Math.PI / 180);
                    const rotatedX = localX * invCos - localY * invSin;
                    const rotatedY = localX * invSin + localY * invCos;
                    
                    // Inverse scale
                    this.points[pointIndex].x = rotatedX / currentScale.x;
                    this.points[pointIndex].y = rotatedY / currentScale.y;
                }
            });
        }
        
        // Add midpoint handles for inserting new points on edges
        for (let i = 0; i < this.points.length; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];
            const edgeIndex = i;
            
            // Midpoint in local space
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            // Transform to world space
            let mx = midX * worldScale.x;
            let my = midY * worldScale.y;
            const worldMX = mx * cos - my * sin + worldPos.x + this.offsetX;
            const worldMY = mx * sin + my * cos + worldPos.y + this.offsetY;
            
            handles.push({
                id: `poly_mid_${i}`,
                index: i,
                x: worldMX,
                y: worldMY,
                radius: this.pointRadius * 0.6,
                color: '#ffffff44',
                label: '+',
                isMidpoint: true,
                _insertedPointRef: null,  // Track the inserted point so we only splice once
                onDrag: (newX, newY) => {
                    const currentPos = this.gameObject.position || { x: 0, y: 0 };
                    const currentScale = this.gameObject.getWorldScale();
                    const currentAngle = this.gameObject.angle || 0;
                    
                    let localX = newX - currentPos.x - this.offsetX;
                    let localY = newY - currentPos.y - this.offsetY;
                    
                    const invCos = Math.cos(-currentAngle * Math.PI / 180);
                    const invSin = Math.sin(-currentAngle * Math.PI / 180);
                    const rotatedX = localX * invCos - localY * invSin;
                    const rotatedY = localX * invSin + localY * invCos;
                    
                    // Only insert the point once on first drag, then just move it
                    const handle = handles.find(h => h.id === `poly_mid_${edgeIndex}`);
                    if (handle && !handle._insertedPointRef) {
                        const newPoint = new Vector2(rotatedX / currentScale.x, rotatedY / currentScale.y);
                        this.points.splice(edgeIndex + 1, 0, newPoint);
                        handle._insertedPointRef = newPoint;
                    } else if (handle && handle._insertedPointRef) {
                        // Just update the already-inserted point's position
                        handle._insertedPointRef.x = rotatedX / currentScale.x;
                        handle._insertedPointRef.y = rotatedY / currentScale.y;
                    }
                }
            });
        }
        
        return handles;
    }
    
    /**
     * Called when a new point should be added (e.g., Ctrl+Click in editor)
     * Adds the point at the closest edge position
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     */
    onEditorAddPoint(worldX, worldY) {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = this.gameObject.angle || 0;
        
        // Inverse transform to local space
        let localX = worldX - worldPos.x - this.offsetX;
        let localY = worldY - worldPos.y - this.offsetY;
        
        const invCos = Math.cos(-angle * Math.PI / 180);
        const invSin = Math.sin(-angle * Math.PI / 180);
        const rotatedX = localX * invCos - localY * invSin;
        const rotatedY = localX * invSin + localY * invCos;
        
        const newPoint = new Vector2(rotatedX / worldScale.x, rotatedY / worldScale.y);
        
        // Find the closest edge to insert after
        let bestInsertIndex = this.points.length;
        let bestDist = Infinity;
        
        for (let i = 0; i < this.points.length; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];
            const dist = this._pointToLineDistance(newPoint.x, newPoint.y, p1.x, p1.y, p2.x, p2.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestInsertIndex = i + 1;
            }
        }
        
        this.points.splice(bestInsertIndex, 0, newPoint);
    }
    
    /**
     * Called when a gizmo point should be removed (e.g., right-click in editor)
     * Won't remove if only 3 points remain (minimum polygon)
     * @param {string} handleId - The handle ID (e.g., 'poly_2')
     */
    onEditorRemovePoint(handleId) {
        if (this.points.length <= 3) return; // Minimum 3 points for polygon
        
        const index = parseInt(handleId.replace('poly_', ''));
        if (!isNaN(index) && index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
        }
    }
    
    /**
     * Handle mouse down for point manipulation (legacy support)
     * @param {MouseEvent} e
     * @returns {boolean} true if handled
     */
    onEditorMouseDown(e) {
        if (!this.showDebug) return false;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const engine = window.gameEngine;
        if (!engine) return false;
        
        const worldX = mouseX - engine.camera.x;
        const worldY = mouseY - engine.camera.y;
        
        const worldPoints = this.getWorldPoints();
        const threshold = this.pointRadius + 4;
        
        for (let i = 0; i < worldPoints.length; i++) {
            const dx = worldX - worldPoints[i].x;
            const dy = worldY - worldPoints[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= threshold) {
                this.selectedPointIndex = i;
                this.isDraggingPoint = true;
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle mouse move for point dragging (legacy support)
     * @param {MouseEvent} e
     * @returns {boolean} true if handled
     */
    onEditorMouseMove(e) {
        if (!this.isDraggingPoint || this.selectedPointIndex === -1) return false;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const engine = window.gameEngine;
        if (!engine) return false;
        
        const worldX = mouseX - engine.camera.x;
        const worldY = mouseY - engine.camera.y;
        
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = this.gameObject.angle || 0;
        
        let localX = worldX - worldPos.x - this.offsetX;
        let localY = worldY - worldPos.y - this.offsetY;
        
        const cos = Math.cos(-angle * Math.PI / 180);
        const sin = Math.sin(-angle * Math.PI / 180);
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        
        this.points[this.selectedPointIndex].x = rotatedX / worldScale.x;
        this.points[this.selectedPointIndex].y = rotatedY / worldScale.y;
        
        return true;
    }
    
    /**
     * Handle mouse up to stop dragging (legacy support)
     * @param {MouseEvent} e
     * @returns {boolean} true if handled
     */
    onEditorMouseUp(e) {
        if (this.isDraggingPoint) {
            this.isDraggingPoint = false;
            this.selectedPointIndex = -1;
            return true;
        }
        return false;
    }
    
    // ==================== RAYCASTING ====================
    
    /**
     * Cast a ray and check intersection with this polygon collider
     * @param {number} originX - Ray origin X
     * @param {number} originY - Ray origin Y
     * @param {number} dirX - Direction X (will be normalized)
     * @param {number} dirY - Direction Y (will be normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @returns {Object|null} {hit: true, point, distance, normal} or null
     */
    raycast(originX, originY, dirX, dirY, maxDistance = 1000) {
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) return null;
        dirX /= len;
        dirY /= len;
        
        const worldPoints = this.getWorldPoints();
        if (worldPoints.length < 3) return null;
        
        let closestT = Infinity;
        let closestNormal = null;
        let closestPoint = null;
        
        for (let i = 0; i < worldPoints.length; i++) {
            const p1 = worldPoints[i];
            const p2 = worldPoints[(i + 1) % worldPoints.length];
            
            // Ray-segment intersection
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            
            const denom = dirX * edgeY - dirY * edgeX;
            if (Math.abs(denom) < 1e-10) continue; // Parallel
            
            const t = ((p1.x - originX) * edgeY - (p1.y - originY) * edgeX) / denom;
            const u = ((p1.x - originX) * dirY - (p1.y - originY) * dirX) / denom;
            
            if (t >= 0 && t <= maxDistance && u >= 0 && u <= 1) {
                if (t < closestT) {
                    closestT = t;
                    closestPoint = {
                        x: originX + dirX * t,
                        y: originY + dirY * t
                    };
                    // Edge normal (perpendicular, pointing outward)
                    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
                    if (edgeLen > 0) {
                        closestNormal = {
                            x: -edgeY / edgeLen,
                            y: edgeX / edgeLen
                        };
                        // Ensure normal points toward ray origin
                        const dotCheck = closestNormal.x * dirX + closestNormal.y * dirY;
                        if (dotCheck > 0) {
                            closestNormal.x = -closestNormal.x;
                            closestNormal.y = -closestNormal.y;
                        }
                    }
                }
            }
        }
        
        if (closestT === Infinity) return null;
        
        return {
            hit: true,
            point: closestPoint,
            distance: closestT,
            normal: closestNormal
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    draw(ctx) {
        // Draw debug visualization
        if (this.showDebug || this.gameObject.isEditing) {
            const worldPoints = this.getWorldPointsDraw();
            const worldPos = this.gameObject.position || { x: 0, y: 0 };
            
            if (worldPoints.length < 3) return;
            
            ctx.save();
            
            // Draw polygon outline
            ctx.strokeStyle = this.isTrigger ? '#ffff00' : this.debugColor;
            ctx.lineWidth = 2;
            ctx.setLineDash(this.isTrigger ? [5, 5] : []);
            
            ctx.beginPath();
            ctx.moveTo(
                worldPoints[0].x - worldPos.x,
                worldPoints[0].y - worldPos.y
            );
            
            for (let i = 1; i < worldPoints.length; i++) {
                ctx.lineTo(
                    worldPoints[i].x - worldPos.x,
                    worldPoints[i].y - worldPos.y
                );
            }
            ctx.closePath();
            ctx.stroke();
            
            // Draw points (only in edit mode)
            if (this.gameObject.isEditing) {
                ctx.setLineDash([]);
                for (let i = 0; i < worldPoints.length; i++) {
                    ctx.fillStyle = (i === this.selectedPointIndex) ? '#ffff00' : this.debugColor;
                    ctx.beginPath();
                    ctx.arc(
                        worldPoints[i].x - worldPos.x,
                        worldPoints[i].y - worldPos.y,
                        5, 0, Math.PI * 2
                    );
                    ctx.fill();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                
                // Draw point indices
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < worldPoints.length; i++) {
                    ctx.fillText(
                        i.toString(),
                        worldPoints[i].x - worldPos.x,
                        worldPoints[i].y - worldPos.y
                    );
                }
            }
            
            ctx.restore();
        }
    }
    
    // ==================== OBB COLLISION ====================
    
    /**
     * Get collision info between this polygon and an oriented bounding box (OBB)
     * @param {Array} obbCorners - Array of 4 corner points {x, y} for the OBB
     * @param {Array} obbAxes - Array of 2 normalized axis vectors {x, y} for the OBB
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getOBBCollisionInfo(obbCorners, obbAxes) {
        const polyPoints = this.getWorldPoints();
        if (polyPoints.length < 3) return null;
        
        const polyAxes = this.getAxes();
        
        // Combine all axes
        const allAxes = [...obbAxes, ...polyAxes];
        
        let minOverlap = Infinity;
        let minAxis = null;
        
        // OBB center
        let obbCx = 0, obbCy = 0;
        for (const c of obbCorners) { obbCx += c.x; obbCy += c.y; }
        obbCx /= 4; obbCy /= 4;
        
        // Polygon center
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;
        
        for (const axis of allAxes) {
            // Project OBB corners
            let oMin = Infinity, oMax = -Infinity;
            for (const c of obbCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < oMin) oMin = proj;
                if (proj > oMax) oMax = proj;
            }
            
            // Project polygon points
            let pMin = Infinity, pMax = -Infinity;
            for (const p of polyPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                if (proj < pMin) pMin = proj;
                if (proj > pMax) pMax = proj;
            }
            
            const overlap = Math.min(oMax, pMax) - Math.max(oMin, pMin);
            if (overlap <= 0) return null;
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = obbCx - polyCx;
                const dirY = obbCy - polyCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }
        
        // Calculate contact point: OBB corner closest to polygon center
        let contactX = 0, contactY = 0;
        let minDist = Infinity;
        
        for (const corner of obbCorners) {
            const dx = corner.x - polyCx;
            const dy = corner.y - polyCy;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                contactX = corner.x;
                contactY = corner.y;
            }
        }
        
        // Move contact point to collision surface
        contactX += minAxis.x * minOverlap * 0.5;
        contactY += minAxis.y * minOverlap * 0.5;
        
        return {
            normal: minAxis,
            depth: minOverlap,
            point: { x: contactX, y: contactY }
        };
    }
    
    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>⬡ PolygonCollider Overview</h2>
            <p>The <strong>PolygonCollider</strong> module provides custom-shape collision detection using convex polygons. Perfect for irregular terrain, rocks, vehicles, and any shape that isn't a simple box or circle.</p>
            <ul>
                <li><strong>Custom shapes</strong> — define any convex polygon with 3+ vertices</li>
                <li><strong>Auto-detection</strong> — automatically extract collision shapes from Procedural modules (ProceduralRock, ProceduralTree, etc.)</li>
                <li><strong>SAT collision</strong> — Separating Axis Theorem for accurate polygon-vs-polygon checks</li>
                <li><strong>Cross-collider</strong> — works with BoxCollider, SphereCollider, and other PolygonColliders</li>
                <li><strong>Editor gizmos</strong> — drag vertices and insert new points visually in the editor</li>
            </ul>
            <div class="tip">Enable <strong>Use Convex Hull</strong> to automatically convert complex shapes into reliable convex collision polygons.</div>
        `,

        "Basic Setup": `
            <h2>⚡ Basic Setup</h2>
            <p>To add polygon collision to a GameObject:</p>

            <h3>In the Prefab Editor</h3>
            <ol>
                <li>Add a <strong>PolygonCollider</strong> module to your GameObject</li>
                <li>Edit the <strong>Points</strong> array to define your collision shape</li>
                <li>Or set a <strong>Source Module</strong> to auto-detect from a Procedural module</li>
                <li>Set a <strong>Tag</strong> for collision filtering</li>
            </ol>

            <h3>Define Points in Code</h3>
            <pre><code>start() {
    const col = this.getModule('PolygonCollider');
    
    // Triangle
    col.points = [
        new Vector2(-32, 32),
        new Vector2(32, 32),
        new Vector2(0, -32)
    ];
    col.tag = 'solid';
}

// Diamond shape
col.points = [
    new Vector2(0, -40),
    new Vector2(30, 0),
    new Vector2(0, 40),
    new Vector2(-30, 0)
];</code></pre>

            <div class="tip">Points are in local space relative to the object's center. They automatically transform with the object's position, rotation, and scale.</div>
        `,

        "Auto-Detection": `
            <h2>🔗 Auto-Detection from Procedural Modules</h2>
            <p>PolygonCollider can automatically extract collision shapes from Procedural modules that implement <code>getPolygonCollider()</code>:</p>

            <h3>Supported Source Modules</h3>
            <ul>
                <li>ProceduralRock</li>
                <li>ProceduralTree</li>
                <li>ProceduralBuilding</li>
                <li>ProceduralPlant</li>
                <li>ProceduralFence</li>
                <li>ProceduralWater</li>
                <li>ProceduralVehicle</li>
                <li>PolygonRenderer</li>
                <li>SimplePolygonRenderer</li>
            </ul>

            <h3>Setup Auto-Detection</h3>
            <pre><code>// In the Prefab Editor, set the Source Module property
// Or configure in code:
start() {
    const col = this.getModule('PolygonCollider');
    col.sourceModule = 'ProceduralRock';
    col.autoDetectOnStart = true;
    col.useConvexHull = true;    // Convert to convex for reliable collision
    col.simplifyPoints = true;   // Reduce point count for performance
    col.maxPoints = 8;           // Limit to 8 points
}</code></pre>

            <h3>Manual Detection</h3>
            <pre><code>// Trigger detection manually (e.g., after changing the source module)
const success = col.detectFromSourceModule();
if (success) {
    console.log('Polygon shape loaded:', col.points.length, 'vertices');
}</code></pre>

            <div class="tip">Auto-detection retries up to 100 frames if the source module isn't ready yet — this handles load-order issues automatically.</div>
        `,

        "Collision Detection": `
            <h2>💥 Collision Detection</h2>
            <p>PolygonCollider supports overlap checks with all collider types using SAT:</p>

            <h3>Universal Overlap Check</h3>
            <pre><code>const myCol = this.getModule('PolygonCollider');

// Works with any collider type
if (myCol.overlaps(otherCollider)) {
    console.log('Collision!');
}</code></pre>

            <h3>Type-Specific Checks</h3>
            <pre><code>// Polygon vs Polygon
if (myCol.overlapsPolygon(otherPoly)) { ... }

// Polygon vs Box
if (myCol.overlapsBox(boxCollider)) { ... }

// Polygon vs Sphere
if (myCol.overlapsSphere(sphereCollider)) { ... }</code></pre>

            <h3>Point Testing</h3>
            <pre><code>// Ray-casting algorithm for point-in-polygon
if (myCol.containsPoint(worldX, worldY)) {
    console.log('Point is inside the polygon');
}</code></pre>

            <h3>Bounds Checking</h3>
            <pre><code>const bounds = myCol.getBounds();
console.log('AABB:', bounds.left, bounds.top, bounds.width, bounds.height);
console.log('Center:', bounds.centerX, bounds.centerY);</code></pre>
        `,

        "Editor Gizmos": `
            <h2>✏️ Editor Gizmos</h2>
            <p>PolygonCollider provides interactive editing handles in the level editor:</p>
            <ul>
                <li><strong>Vertex handles</strong> — drag to reposition vertices</li>
                <li><strong>Midpoint handles</strong> — drag the small '+' handles on edges to insert new vertices</li>
                <li><strong>Add point</strong> — Ctrl+Click to add a point at the closest edge position</li>
                <li><strong>Delete point</strong> — remove vertices (minimum 3 required)</li>
            </ul>

            <h3>Customize Gizmo Appearance</h3>
            <pre><code>const col = this.getModule('PolygonCollider');
col.showGizmoAlways = true;    // Show handles even when not selected
col.pointRadius = 10;          // Larger drag handles
col.pointColor = '#ff00ff';    // Custom handle color</code></pre>

            <div class="tip">The gizmo system automatically handles coordinate transforms — you edit in world space while points are stored in local space.</div>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>

            <h3>Shape</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>points</code></td><td>Vector2[]</td><td>triangle</td><td>Array of polygon vertices (min 3)</td></tr>
                <tr><td><code>offsetX</code></td><td>number</td><td>0</td><td>X offset from object center</td></tr>
                <tr><td><code>offsetY</code></td><td>number</td><td>0</td><td>Y offset from object center</td></tr>
            </table>

            <h3>Auto-Detection</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>sourceModule</code></td><td>string</td><td>''</td><td>Module name to get polygon from</td></tr>
                <tr><td><code>autoDetectOnStart</code></td><td>boolean</td><td>true</td><td>Auto-detect shape on game start</td></tr>
                <tr><td><code>useConvexHull</code></td><td>boolean</td><td>true</td><td>Convert to convex hull for reliable collision</td></tr>
                <tr><td><code>simplifyPoints</code></td><td>boolean</td><td>false</td><td>Reduce point count for performance</td></tr>
                <tr><td><code>maxPoints</code></td><td>number</td><td>12</td><td>Max vertices when simplifying (3-32)</td></tr>
            </table>

            <h3>Behavior</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>isTrigger</code></td><td>boolean</td><td>false</td><td>Detect collisions without blocking</td></tr>
                <tr><td><code>tag</code></td><td>string</td><td>'solid'</td><td>Tag for collision filtering</td></tr>
            </table>

            <h3>Debug &amp; Gizmos</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>showDebug</code></td><td>boolean</td><td>true</td><td>Show debug outline</td></tr>
                <tr><td><code>debugColor</code></td><td>string</td><td>'#09ff00'</td><td>Debug outline color</td></tr>
                <tr><td><code>showGizmoAlways</code></td><td>boolean</td><td>true</td><td>Show handles even when not selected</td></tr>
                <tr><td><code>pointRadius</code></td><td>number</td><td>8</td><td>Drag handle size (4-20)</td></tr>
                <tr><td><code>pointColor</code></td><td>string</td><td>'#00ff88'</td><td>Handle color</td></tr>
            </table>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>overlaps(other)</code></td><td>boolean</td><td>Check overlap with any collider type</td></tr>
                <tr><td><code>overlapsPolygon(poly)</code></td><td>boolean</td><td>SAT overlap vs another polygon</td></tr>
                <tr><td><code>overlapsBox(box)</code></td><td>boolean</td><td>SAT overlap vs box collider</td></tr>
                <tr><td><code>overlapsSphere(sphere)</code></td><td>boolean</td><td>Edge-distance overlap vs sphere</td></tr>
                <tr><td><code>containsPoint(x, y)</code></td><td>boolean</td><td>Ray-casting point-in-polygon test</td></tr>
                <tr><td><code>getWorldPoints()</code></td><td>Vector2[]</td><td>Get transformed vertices in world space</td></tr>
                <tr><td><code>getBounds()</code></td><td>object</td><td>Get axis-aligned bounding box</td></tr>
                <tr><td><code>getAxes()</code></td><td>array</td><td>Get SAT test axes (edge normals)</td></tr>
                <tr><td><code>projectOntoAxis(axis)</code></td><td>{min, max}</td><td>Project polygon onto axis</td></tr>
                <tr><td><code>detectFromSourceModule()</code></td><td>boolean</td><td>Load polygon from source module</td></tr>
            </table>
        `
    };

    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'PolygonCollider';
        json.points = this.points.map(p => ({ x: p.x, y: p.y }));
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.isTrigger = this.isTrigger;
        json.tag = this.tag;
        json.showDebug = this.showDebug;
        json.debugColor = this.debugColor;
        json.showGizmoAlways = this.showGizmoAlways;
        json.pointRadius = this.pointRadius;
        json.pointColor = this.pointColor;
        
        // Source module auto-detection properties
        json.sourceModule = this.sourceModule;
        json.autoDetectOnStart = this.autoDetectOnStart;
        json.useConvexHull = this.useConvexHull;
        json.simplifyPoints = this.simplifyPoints;
        json.maxPoints = this.maxPoints;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new PolygonCollider();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        
        if (json.points && json.points.length >= 3) {
            module.points = json.points.map(p => new Vector2(p.x, p.y));
        }
        
        module.offsetX = json.offsetX || 0;
        module.offsetY = json.offsetY || 0;
        module.isTrigger = json.isTrigger || false;
        module.tag = json.tag || '';
        module.showDebug = json.showDebug !== undefined ? json.showDebug : true;
        module.debugColor = json.debugColor || '#ff00ff';
        module.showGizmoAlways = json.showGizmoAlways !== undefined ? json.showGizmoAlways : true;
        module.pointRadius = json.pointRadius || 8;
        module.pointColor = json.pointColor || '#00ff88';
        
        // Source module auto-detection properties
        module.sourceModule = json.sourceModule || '';
        module.autoDetectOnStart = json.autoDetectOnStart !== undefined ? json.autoDetectOnStart : true;
        module.useConvexHull = json.useConvexHull !== undefined ? json.useConvexHull : true;
        module.simplifyPoints = json.simplifyPoints || false;
        module.maxPoints = json.maxPoints || 12;
        
        return module;
    }
    
    clone() {
        const cloned = new PolygonCollider();
        cloned.points = this.points.map(p => new Vector2(p.x, p.y));
        cloned.offsetX = this.offsetX;
        cloned.offsetY = this.offsetY;
        cloned.isTrigger = this.isTrigger;
        cloned.tag = this.tag;
        cloned.showDebug = this.showDebug;
        cloned.debugColor = this.debugColor;
        cloned.showGizmoAlways = this.showGizmoAlways;
        cloned.pointRadius = this.pointRadius;
        cloned.pointColor = this.pointColor;
        cloned.enabled = this.enabled;
        
        // Source module auto-detection properties
        cloned.sourceModule = this.sourceModule;
        cloned.autoDetectOnStart = this.autoDetectOnStart;
        cloned.useConvexHull = this.useConvexHull;
        cloned.simplifyPoints = this.simplifyPoints;
        cloned.maxPoints = this.maxPoints;
        
        return cloned;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.PolygonCollider = PolygonCollider;
}
