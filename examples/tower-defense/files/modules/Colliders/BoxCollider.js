/**
 * BoxCollider Module
 * Provides rectangular collision detection
 * Works with Rigidbody for physics-based collision response
 */

class BoxCollider extends Module {
    constructor() {
        super();
        
        // Editable properties
        this.width = 64;      // Collision box width
        this.height = 64;     // Collision box height
        this.offsetX = 0;     // Offset from gameObject position
        this.offsetY = 0;
        this.isTrigger = false; // If true, collisions are detected but no physics response
        this.tag = 'solid';        // Tag for collision filtering
        
        // 2.5D Z-Height (for top-down games with jumping)
        this.zHeight = 0;     // Height of collider in Z-axis (objects with zPos > zHeight can pass over)
        
        // Debug visualization
        this.showDebug = true;
        this.debugColor = '#00ff00';
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Colliders';
    
    static getIcon() {
        return '🔲';
    }
    
    static getDescription() {
        return 'Rectangular collision detection and trigger zones';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    /**
     * Property metadata with organized sections
     */
    getPropertyMetadata() {
        return [
            // === DIMENSIONS ===
            { type: 'header', label: '📐 Dimensions' },
            { type: 'hint', label: 'Size of the collision box in pixels' },
            { key: 'width', type: 'number', label: 'Width', default: 64, min: 0 },
            { key: 'height', type: 'number', label: 'Height', default: 64, min: 0 },
            
            // === OFFSET ===
            { type: 'header', label: '↔️ Offset' },
            { type: 'hint', label: 'Position offset from the object center' },
            { key: 'offsetX', type: 'number', label: 'Offset X', default: 0 },
            { key: 'offsetY', type: 'number', label: 'Offset Y', default: 0 },
            
            // === BEHAVIOR ===
            { type: 'header', label: '⚡ Behavior' },
            { key: 'isTrigger', type: 'boolean', label: 'Is Trigger', default: false },
            { type: 'hint', label: 'Triggers detect collisions but don\'t block movement' },
            { key: 'tag', type: 'text', label: 'Tag', default: 'solid' },
            
            // === 2.5D Z-HEIGHT ===
            { type: 'header', label: '📐 2.5D Z-Height' },
            { type: 'hint', label: 'For top-down games: objects with zPos > zHeight can jump over this collider' },
            { key: 'zHeight', type: 'number', label: 'Z-Height', default: 0, min: 0 },
            
            // === DEBUG ===
            { type: 'header', label: '🔧 Debug Visualization' },
            { key: 'showDebug', type: 'boolean', label: 'Show Debug', default: true },
            { key: 'debugColor', type: 'color', label: 'Debug Color', default: '#00ff00', showIf: { showDebug: true } }
        ];
    }
    
    // ==================== COLLISION DETECTION ====================
    
    /**
     * Get the world-space corner points of this box, accounting for rotation
     * @returns {Array<{x: number, y: number}>}
     */
    getWorldPoints() {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        
        const scaledWidth = this.width * Math.abs(worldScale.x);
        const scaledHeight = this.height * Math.abs(worldScale.y);
        
        const centerX = worldPos.x + this.offsetX;
        const centerY = worldPos.y + this.offsetY;
        
        const halfW = scaledWidth / 2;
        const halfH = scaledHeight / 2;
        
        // Local corner points (relative to center)
        const localPoints = [
            { x: -halfW, y: -halfH },
            { x: halfW, y: -halfH },
            { x: halfW, y: halfH },
            { x: -halfW, y: halfH }
        ];
        
        // Rotate and translate to world space
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        return localPoints.map(p => ({
            x: centerX + p.x * cos - p.y * sin,
            y: centerY + p.x * sin + p.y * cos
        }));
    }
    
    /**
     * Get the axes to test for SAT collision (edge normals)
     * @returns {Array<{x: number, y: number}>}
     */
    getAxes() {
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Two perpendicular axes (rotated by box angle)
        return [
            { x: cos, y: sin },      // Right direction
            { x: -sin, y: cos }      // Up direction
        ];
    }
    
    /**
     * Project this box's points onto an axis
     * @param {Object} axis - {x, y} normalized axis
     * @returns {{min: number, max: number}}
     */
    projectOntoAxis(axis) {
        const points = this.getWorldPoints();
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
     * Check if this box is axis-aligned (no rotation)
     * @returns {boolean}
     */
    isAxisAligned() {
        const angle = this.gameObject.angle || 0;
        return angle === 0 || angle % 90 === 0;
    }

    /**
     * Check if this collider overlaps with another box collider
     * @param {BoxCollider} other
     * @returns {boolean}
     */
    overlaps(other) {
        // Handle SphereCollider
        if (other instanceof SphereCollider || (other.constructor && other.constructor.name === 'SphereCollider')) {
            return this.overlapsSphere(other);
        }
        
        // Handle PolygonCollider
        if (other instanceof PolygonCollider || (other.constructor && other.constructor.name === 'PolygonCollider')) {
            return this.overlapsPolygon(other);
        }
        
        // Check if either box is rotated
        const thisRotated = !this.isAxisAligned();
        const otherRotated = other.isAxisAligned ? !other.isAxisAligned() : false;
        
        // If neither is rotated, use fast AABB check
        if (!thisRotated && !otherRotated) {
            const bounds1 = this.getBounds();
            const bounds2 = other.getBounds();
            
            return !(
                bounds1.right < bounds2.left ||
                bounds1.left > bounds2.right ||
                bounds1.bottom < bounds2.top ||
                bounds1.top > bounds2.bottom
            );
        }
        
        // Use SAT for rotated boxes
        return this.overlapsSAT(other);
    }
    
    /**
     * Check overlap using Separating Axis Theorem (for rotated boxes)
     * @param {BoxCollider} other
     * @returns {boolean}
     */
    overlapsSAT(other) {
        // Get axes from both boxes
        const axes1 = this.getAxes();
        const axes2 = other.getAxes ? other.getAxes() : [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        const allAxes = [...axes1, ...axes2];
        
        // Test all axes
        for (const axis of allAxes) {
            const proj1 = this.projectOntoAxis(axis);
            const proj2 = other.projectOntoAxis ? other.projectOntoAxis(axis) : this.projectBoxOntoAxis(other.getWorldPoints ? other.getWorldPoints() : this.getAABBPoints(other), axis);
            
            // Check for gap
            if (proj1.max < proj2.min || proj2.max < proj1.min) {
                return false; // Separating axis found, no collision
            }
        }
        
        return true; // No separating axis found, boxes overlap
    }
    
    /**
     * Get AABB points for a box collider (fallback for non-rotated)
     * @param {BoxCollider} box
     * @returns {Array<{x: number, y: number}>}
     */
    getAABBPoints(box) {
        const bounds = box.getBounds();
        return [
            { x: bounds.left, y: bounds.top },
            { x: bounds.right, y: bounds.top },
            { x: bounds.right, y: bounds.bottom },
            { x: bounds.left, y: bounds.bottom }
        ];
    }

    /**
     * Check if this box collider overlaps with a sphere collider
     * @param {SphereCollider} sphereCollider
     * @returns {boolean}
     */
    overlapsSphere(sphereCollider) {
        const center = sphereCollider.getCenter();
        const scaledRadius = sphereCollider.getScaledRadius();
        
        // If box is axis-aligned, use fast AABB check
        if (this.isAxisAligned()) {
            const bounds = this.getBounds();
            
            // Find the closest point on the box to the circle center
            const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
            const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
            
            // Calculate distance from circle center to closest point
            const dx = center.x - closestX;
            const dy = center.y - closestY;
            const distanceSquared = dx * dx + dy * dy;
            
            return distanceSquared < (scaledRadius * scaledRadius);
        }
        
        // For rotated boxes, find closest point on rotated rectangle
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const boxCenterX = worldPos.x + this.offsetX;
        const boxCenterY = worldPos.y + this.offsetY;
        const angle = -(this.gameObject.angle || 0) * Math.PI / 180;
        
        // Transform circle center to box's local space
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = (center.x - boxCenterX) * cos - (center.y - boxCenterY) * sin;
        const localY = (center.x - boxCenterX) * sin + (center.y - boxCenterY) * cos;
        
        // Get half dimensions
        const worldScale = this.gameObject.getWorldScale();
        const halfW = (this.width * Math.abs(worldScale.x)) / 2;
        const halfH = (this.height * Math.abs(worldScale.y)) / 2;
        
        // Clamp to box bounds in local space
        const closestX = Math.max(-halfW, Math.min(localX, halfW));
        const closestY = Math.max(-halfH, Math.min(localY, halfH));
        
        // Distance check in local space
        const dx = localX - closestX;
        const dy = localY - closestY;
        const distanceSquared = dx * dx + dy * dy;
        
        return distanceSquared < (scaledRadius * scaledRadius);
    }
    
    /**
     * Get collision info between this box and a sphere
     * @param {SphereCollider} sphereCollider
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getSphereCollisionInfo(sphereCollider) {
        const bounds = this.getBounds();
        const center = sphereCollider.getCenter();
        const scaledRadius = sphereCollider.getScaledRadius();
        
        // Find the closest point on the box to the circle center
        const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
        
        // Calculate distance from circle center to closest point
        const dx = center.x - closestX;
        const dy = center.y - closestY;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared >= scaledRadius * scaledRadius) {
            return null; // No collision
        }
        
        const distance = Math.sqrt(distanceSquared);
        
        // Calculate collision normal (pointing from box to sphere)
        let normalX, normalY;
        if (distance === 0) {
            // Circle center is inside the box
            // Find the shortest way out
            const toLeft = center.x - bounds.left;
            const toRight = bounds.right - center.x;
            const toTop = center.y - bounds.top;
            const toBottom = bounds.bottom - center.y;
            
            const minDist = Math.min(toLeft, toRight, toTop, toBottom);
            
            if (minDist === toLeft) {
                normalX = -1; normalY = 0;
            } else if (minDist === toRight) {
                normalX = 1; normalY = 0;
            } else if (minDist === toTop) {
                normalX = 0; normalY = -1;
            } else {
                normalX = 0; normalY = 1;
            }
        } else {
            normalX = dx / distance;
            normalY = dy / distance;
        }
        
        const depth = scaledRadius - distance;
        
        return {
            normal: { x: normalX, y: normalY },
            depth: depth,
            point: { x: closestX, y: closestY }
        };
    }
    
    /**
     * Check if a point is inside this collider
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPoint(x, y) {
        // For axis-aligned, use fast bounds check
        if (this.isAxisAligned()) {
            const bounds = this.getBounds();
            return x >= bounds.left && x <= bounds.right &&
                   y >= bounds.top && y <= bounds.bottom;
        }
        
        // For rotated boxes, transform point to local space
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const boxCenterX = worldPos.x + this.offsetX;
        const boxCenterY = worldPos.y + this.offsetY;
        const angle = -(this.gameObject.angle || 0) * Math.PI / 180;
        
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = (x - boxCenterX) * cos - (y - boxCenterY) * sin;
        const localY = (x - boxCenterX) * sin + (y - boxCenterY) * cos;
        
        const worldScale = this.gameObject.getWorldScale();
        const halfW = (this.width * Math.abs(worldScale.x)) / 2;
        const halfH = (this.height * Math.abs(worldScale.y)) / 2;
        
        return localX >= -halfW && localX <= halfW &&
               localY >= -halfH && localY <= halfH;
    }
    
    /**
     * Get the bounds of this collider in world space
     * @returns {Object} {left, right, top, bottom, x, y, width, height}
     */
    getBounds() {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        const worldScale = this.gameObject.getWorldScale();
        
        const scaledWidth = this.width * Math.abs(worldScale.x);
        const scaledHeight = this.height * Math.abs(worldScale.y);
        
        const centerX = worldPos.x + this.offsetX;
        const centerY = worldPos.y + this.offsetY;
        
        const left = centerX - scaledWidth / 2;
        const right = centerX + scaledWidth / 2;
        const top = centerY - scaledHeight / 2;
        const bottom = centerY + scaledHeight / 2;
        
        return {
            left, right, top, bottom,
            x: left,
            y: top,
            width: scaledWidth,
            height: scaledHeight,
            centerX,
            centerY
        };
    }
    
    // ==================== COLLISION QUERY HELPERS ====================
    
    /**
     * Find all colliders overlapping with this one using efficient radius query
     * @param {number} searchRadius - Optional custom search radius
     * @returns {Array<{object: GameObject, collider: Module}>}
     */
    findOverlappingColliders(searchRadius = null) {
        const bounds = this.getBounds();
        const radius = searchRadius || Math.max(bounds.width, bounds.height) * 2;
        const results = [];
        
        // Use instancesInRadius API for efficient spatial query
        let nearbyObjects;
        if (typeof instancesInRadius === 'function') {
            nearbyObjects = instancesInRadius(bounds.centerX, bounds.centerY, radius);
        } else {
            // Fallback
            const engine = window.gameEngine;
            if (!engine) return results;
            nearbyObjects = engine.instances;
        }
        
        for (const obj of nearbyObjects) {
            if (obj === this.gameObject) continue;
            
            const otherCollider = obj.getModule ? 
                (obj.getModule(BoxCollider) || obj.getModule(SphereCollider)) : null;
            
            if (!otherCollider) continue;
            
            if (this.overlaps(otherCollider)) {
                results.push({ object: obj, collider: otherCollider });
            }
        }
        
        return results;
    }
    
    /**
     * Find all colliders with a specific tag overlapping this one
     * @param {string} tag
     * @returns {Array<{object: GameObject, collider: Module}>}
     */
    findOverlappingWithTag(tag) {
        return this.findOverlappingColliders().filter(item => item.collider.tag === tag);
    }
    
    /**
     * Check if overlapping with any collider of the given tag
     * @param {string} tag
     * @returns {boolean}
     */
    isOverlappingTag(tag) {
        return this.findOverlappingWithTag(tag).length > 0;
    }
    
    /**
     * Get the first overlapping collider with the given tag
     * @param {string} tag
     * @returns {{object: GameObject, collider: Module}|null}
     */
    getFirstOverlappingWithTag(tag) {
        const overlapping = this.findOverlappingWithTag(tag);
        return overlapping.length > 0 ? overlapping[0] : null;
    }
    
    /**
     * Get collision info with another box collider
     * @param {BoxCollider} other
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getBoxCollisionInfo(other) {
        // Check if either box is rotated
        const thisRotated = !this.isAxisAligned();
        const otherRotated = other.isAxisAligned ? !other.isAxisAligned() : false;
        
        // If neither rotated, use fast AABB collision info
        if (!thisRotated && !otherRotated) {
            const bounds1 = this.getBounds();
            const bounds2 = other.getBounds();
            
            // Check if overlapping
            if (bounds1.right < bounds2.left || bounds1.left > bounds2.right ||
                bounds1.bottom < bounds2.top || bounds1.top > bounds2.bottom) {
                return null;
            }
            
            // Calculate overlap on each axis
            const overlapX = Math.min(bounds1.right, bounds2.right) - Math.max(bounds1.left, bounds2.left);
            const overlapY = Math.min(bounds1.bottom, bounds2.bottom) - Math.max(bounds1.top, bounds2.top);
            
            // Find minimum translation vector (MTV)
            let normal, depth;
            if (overlapX < overlapY) {
                depth = overlapX;
                normal = { 
                    x: bounds1.centerX < bounds2.centerX ? -1 : 1, 
                    y: 0 
                };
            } else {
                depth = overlapY;
                normal = { 
                    x: 0, 
                    y: bounds1.centerY < bounds2.centerY ? -1 : 1 
                };
            }
            
            // Calculate contact point (center of overlap region)
            const contactX = (Math.max(bounds1.left, bounds2.left) + Math.min(bounds1.right, bounds2.right)) / 2;
            const contactY = (Math.max(bounds1.top, bounds2.top) + Math.min(bounds1.bottom, bounds2.bottom)) / 2;
            
            return {
                normal,
                depth,
                point: { x: contactX, y: contactY }
            };
        }
        
        // Use SAT for rotated boxes
        return this.getSATCollisionInfo(other);
    }
    
    /**
     * Get collision info using SAT (for rotated boxes)
     * @param {BoxCollider} other
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getSATCollisionInfo(other) {
        // Get axes from both boxes
        const axes1 = this.getAxes();
        const axes2 = other.getAxes ? other.getAxes() : [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        const allAxes = [...axes1, ...axes2];
        
        let minOverlap = Infinity;
        let minAxis = null;
        
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();
        
        // Test all axes
        for (const axis of allAxes) {
            const proj1 = this.projectOntoAxis(axis);
            const proj2 = other.projectOntoAxis ? other.projectOntoAxis(axis) : this.projectBoxOntoAxis(this.getAABBPoints(other), axis);
            
            const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            
            // Check for gap
            if (overlap <= 0) {
                return null; // No collision
            }
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                
                // Determine direction (normal points from other to this - pushing this away)
                const dirX = bounds1.centerX - bounds2.centerX;
                const dirY = bounds1.centerY - bounds2.centerY;
                const dot = dirX * axis.x + dirY * axis.y;
                
                // Normal should point in the direction to push this collider away
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }
        
        // Calculate contact point (center of overlap region)
        const points1 = this.getWorldPoints();
        const points2 = other.getWorldPoints ? other.getWorldPoints() : this.getAABBPoints(other);
        
        // Find contact point by averaging overlapping vertices
        let contactX = 0, contactY = 0, contactCount = 0;
        
        // Check vertices of box1 inside box2
        for (const p of points1) {
            if (other.containsPoint ? other.containsPoint(p.x, p.y) : this.pointInPolygon(p, points2)) {
                contactX += p.x;
                contactY += p.y;
                contactCount++;
            }
        }
        
        // Check vertices of box2 inside box1
        for (const p of points2) {
            if (this.containsPoint(p.x, p.y)) {
                contactX += p.x;
                contactY += p.y;
                contactCount++;
            }
        }
        
        if (contactCount > 0) {
            contactX /= contactCount;
            contactY /= contactCount;
        } else {
            // Fallback to center-based approximation
            contactX = (bounds1.centerX + bounds2.centerX) / 2;
            contactY = (bounds1.centerY + bounds2.centerY) / 2;
        }
        
        return {
            normal: minAxis,
            depth: minOverlap,
            point: { x: contactX, y: contactY }
        };
    }
    
    /**
     * Check if a point is inside a polygon (helper for SAT contact point calculation)
     * @param {Object} point - {x, y}
     * @param {Array} polygon - Array of {x, y} vertices
     * @returns {boolean}
     */
    pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    /**
     * Cast a ray from a point and check intersection with this collider
     * @param {number} originX
     * @param {number} originY
     * @param {number} dirX - Direction X (will be normalized)
     * @param {number} dirY - Direction Y (will be normalized)
     * @param {number} maxDistance
     * @returns {Object|null} {hit: true, point, distance, normal} or null
     */
    raycast(originX, originY, dirX, dirY, maxDistance = 1000) {
        const bounds = this.getBounds();
        
        // Normalize direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) return null;
        dirX /= len;
        dirY /= len;
        
        // AABB ray intersection
        let tmin = -Infinity;
        let tmax = Infinity;
        let normalX = 0, normalY = 0;
        
        // X slab
        if (dirX !== 0) {
            const tx1 = (bounds.left - originX) / dirX;
            const tx2 = (bounds.right - originX) / dirX;
            
            const txmin = Math.min(tx1, tx2);
            const txmax = Math.max(tx1, tx2);
            
            if (txmin > tmin) {
                tmin = txmin;
                normalX = dirX > 0 ? -1 : 1;
                normalY = 0;
            }
            tmax = Math.min(tmax, txmax);
        } else if (originX < bounds.left || originX > bounds.right) {
            return null;
        }
        
        // Y slab
        if (dirY !== 0) {
            const ty1 = (bounds.top - originY) / dirY;
            const ty2 = (bounds.bottom - originY) / dirY;
            
            const tymin = Math.min(ty1, ty2);
            const tymax = Math.max(ty1, ty2);
            
            if (tymin > tmin) {
                tmin = tymin;
                normalX = 0;
                normalY = dirY > 0 ? -1 : 1;
            }
            tmax = Math.min(tmax, tymax);
        } else if (originY < bounds.top || originY > bounds.bottom) {
            return null;
        }
        
        // Check if ray hits
        if (tmax < tmin || tmax < 0 || tmin > maxDistance) {
            return null;
        }
        
        const t = tmin >= 0 ? tmin : tmax;
        if (t > maxDistance) return null;
        
        return {
            hit: true,
            point: { x: originX + dirX * t, y: originY + dirY * t },
            distance: t,
            normal: { x: normalX, y: normalY }
        };
    }
    
    /**
     * Check if this box collider overlaps with a polygon collider
     * @param {PolygonCollider} polygonCollider
     * @returns {boolean}
     */
    overlapsPolygon(polygonCollider) {
        // Use the polygon's overlap method
        return polygonCollider.overlapsBox(this);
    }
    
    /**
     * Get collision info between this box and a polygon
     * @param {PolygonCollider} polygonCollider
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getPolygonCollisionInfo(polygonCollider) {
        if (!this.overlapsPolygon(polygonCollider)) {
            return null;
        }
        
        // SAT (Separating Axis Theorem)
        // Use getWorldPoints() for rotated boxes, fallback to AABB for axis-aligned
        let boxPoints, boxAxes;
        if (!this.isAxisAligned()) {
            boxPoints = this.getWorldPoints();
            boxAxes = this.getAxes();
        } else {
            const bounds = this.getBounds();
            boxPoints = [
                { x: bounds.left, y: bounds.top },
                { x: bounds.right, y: bounds.top },
                { x: bounds.right, y: bounds.bottom },
                { x: bounds.left, y: bounds.bottom }
            ];
            boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        }
        
        const polyPoints = polygonCollider.getWorldPoints();
        const polyAxes = polygonCollider.getAxes();
        const allAxes = [...boxAxes, ...polyAxes];
        
        // Compute actual centroids
        let boxCx = 0, boxCy = 0;
        for (const p of boxPoints) { boxCx += p.x; boxCy += p.y; }
        boxCx /= boxPoints.length;
        boxCy /= boxPoints.length;
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length;
        polyCy /= polyPoints.length;
        
        let minOverlap = Infinity;
        let minAxis = null;
        
        for (const axis of allAxes) {
            const proj1 = this.projectBoxOntoAxis(boxPoints, axis);
            const proj2 = polygonCollider.projectOntoAxis(axis);
            
            const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if (overlap <= 0) return null;
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                
                // Normal points from box toward polygon
                const dirX = polyCx - boxCx;
                const dirY = polyCy - boxCy;
                const dot = dirX * axis.x + dirY * axis.y;
                
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }
        
        // Contact point: deepest penetrating box point into polygon
        // = support of box in minAxis direction (toward polygon)
        let contactPoint = null;
        let maxPen = -Infinity;
        for (const bp of boxPoints) {
            const pen = bp.x * minAxis.x + bp.y * minAxis.y;
            if (pen > maxPen) {
                maxPen = pen;
                contactPoint = { x: bp.x, y: bp.y };
            }
        }
        
        return {
            normal: minAxis,
            depth: minOverlap,
            point: contactPoint
        };
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
    
    // ==================== LIFECYCLE METHODS ====================
    
    draw(ctx) {
        // Draw debug visualization in editor
        if (!this.gameObject) return;
        if (this.showDebug || this.gameObject.isEditing) {
            const worldScale = this.gameObject.getWorldScale();
            const scaledWidth = this.width * Math.abs(worldScale.x);
            const scaledHeight = this.height * Math.abs(worldScale.y);
            
            ctx.save();
            ctx.strokeStyle = this.isTrigger ? '#ffff00' : this.debugColor;
            ctx.lineWidth = 1;
            ctx.setLineDash(this.isTrigger ? [5, 5] : []);
            
            // Draw rectangle at offset (rotation is handled by canvas transform from gameObject)
            ctx.strokeRect(-scaledWidth / 2 + this.offsetX, -scaledHeight / 2 + this.offsetY, scaledWidth, scaledHeight);
            
            // Draw center cross
            ctx.beginPath();
            ctx.moveTo(this.offsetX - 5, this.offsetY);
            ctx.lineTo(this.offsetX + 5, this.offsetY);
            ctx.moveTo(this.offsetX, this.offsetY - 5);
            ctx.lineTo(this.offsetX, this.offsetY + 5);
            ctx.stroke();
            
            // Draw Z-Height indicator (2.5D)
            if (this.zHeight > 0) {
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = '#00ffff';  // Cyan for Z-height
                
                // Draw elevated rectangle (offset upward by zHeight)
                const zOffset = -this.zHeight;  // Negative because up is -Y in canvas
                ctx.strokeRect(
                    -scaledWidth / 2 + this.offsetX, 
                    -scaledHeight / 2 + this.offsetY + zOffset, 
                    scaledWidth, 
                    scaledHeight
                );
                
                // Draw vertical lines connecting ground level to Z-height level (corners)
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                // Left-top corner
                ctx.moveTo(-scaledWidth / 2 + this.offsetX, -scaledHeight / 2 + this.offsetY);
                ctx.lineTo(-scaledWidth / 2 + this.offsetX, -scaledHeight / 2 + this.offsetY + zOffset);
                // Right-top corner
                ctx.moveTo(scaledWidth / 2 + this.offsetX, -scaledHeight / 2 + this.offsetY);
                ctx.lineTo(scaledWidth / 2 + this.offsetX, -scaledHeight / 2 + this.offsetY + zOffset);
                // Right-bottom corner
                ctx.moveTo(scaledWidth / 2 + this.offsetX, scaledHeight / 2 + this.offsetY);
                ctx.lineTo(scaledWidth / 2 + this.offsetX, scaledHeight / 2 + this.offsetY + zOffset);
                // Left-bottom corner
                ctx.moveTo(-scaledWidth / 2 + this.offsetX, scaledHeight / 2 + this.offsetY);
                ctx.lineTo(-scaledWidth / 2 + this.offsetX, scaledHeight / 2 + this.offsetY + zOffset);
                ctx.stroke();
                
                // Draw Z-height label
                ctx.fillStyle = '#00ffff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Z:${this.zHeight}`, scaledWidth / 2 + this.offsetX + 4, this.offsetY + zOffset / 2);
            }
            
            ctx.restore();
        }
    }
    
    // ==================== OBB COLLISION ====================
    
    /**
     * Get collision info between this box and an oriented bounding box (OBB)
     * @param {Array} obbCorners - Array of 4 corner points {x, y} for the OBB
     * @param {Array} obbAxes - Array of 2 normalized axis vectors {x, y} for the OBB
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getOBBCollisionInfo(obbCorners, obbAxes) {
        const boxCorners = this.getWorldPoints();
        const boxAxes = this.getAxes();
        
        // Combine all axes (2 from OBB + 2 from box = 4 SAT axes)
        const allAxes = [...obbAxes, ...boxAxes];
        
        let minOverlap = Infinity;
        let minAxis = null;
        
        // OBB center
        let obbCx = 0, obbCy = 0;
        for (const c of obbCorners) { obbCx += c.x; obbCy += c.y; }
        obbCx /= 4; obbCy /= 4;
        
        // Box center
        let boxCx = 0, boxCy = 0;
        for (const c of boxCorners) { boxCx += c.x; boxCy += c.y; }
        boxCx /= 4; boxCy /= 4;
        
        for (const axis of allAxes) {
            // Project OBB corners
            let oMin = Infinity, oMax = -Infinity;
            for (const c of obbCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < oMin) oMin = proj;
                if (proj > oMax) oMax = proj;
            }
            
            // Project box corners
            let bMin = Infinity, bMax = -Infinity;
            for (const c of boxCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < bMin) bMin = proj;
                if (proj > bMax) bMax = proj;
            }
            
            const overlap = Math.min(oMax, bMax) - Math.max(oMin, bMin);
            if (overlap <= 0) return null; // Separating axis found
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                // Normal should push OBB away from box
                const dirX = obbCx - boxCx;
                const dirY = obbCy - boxCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }
        
        // Calculate contact point: find closest points on OBB edges to box surface
        // Start with OBB corner closest to box center
        let contactX = 0, contactY = 0;
        let minDist = Infinity;
        
        for (const corner of obbCorners) {
            const dx = corner.x - boxCx;
            const dy = corner.y - boxCy;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                contactX = corner.x;
                contactY = corner.y;
            }
        }
        
        // Move contact point to the collision surface (along normal by half penetration)
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
            <h2>🔲 BoxCollider Overview</h2>
            <p>The <strong>BoxCollider</strong> module provides axis-aligned and rotated rectangular collision detection. It's the most common collider type, ideal for walls, platforms, characters, and UI hit areas.</p>
            <ul>
                <li><strong>AABB mode</strong> — fast axis-aligned bounding box checks when the object has no rotation</li>
                <li><strong>OBB mode</strong> — automatic Separating Axis Theorem (SAT) for rotated objects</li>
                <li><strong>Cross-collider</strong> — works with SphereCollider and PolygonCollider</li>
                <li><strong>Trigger mode</strong> — detect overlaps without physics response</li>
            </ul>
            <div class="tip">BoxCollider automatically selects the fastest algorithm based on whether the object is rotated or axis-aligned.</div>
        `,

        "Basic Setup": `
            <h2>⚡ Basic Setup</h2>
            <p>To add collision to a GameObject:</p>

            <h3>In the Prefab Editor</h3>
            <ol>
                <li>Add a <strong>BoxCollider</strong> module to your GameObject</li>
                <li>Set <strong>Width</strong> and <strong>Height</strong> to match your sprite or desired collision area</li>
                <li>Adjust <strong>Offset X/Y</strong> if the collision box should be shifted from center</li>
                <li>Set a <strong>Tag</strong> (e.g., 'solid', 'enemy', 'pickup') for filtering</li>
            </ol>

            <h3>Minimal Code Example</h3>
            <pre><code>start() {
    const col = this.getModule('BoxCollider');
    col.width = 48;
    col.height = 48;
    col.tag = 'player';
    col.isTrigger = false;
}</code></pre>

            <div class="tip">Pair with a <strong>Rigidbody</strong> module for automatic physics-based collision response (blocking, bouncing).</div>
        `,

        "Collision Detection": `
            <h2>💥 Collision Detection</h2>
            <p>BoxCollider provides several ways to check for overlaps:</p>

            <h3>Direct Overlap Check</h3>
            <pre><code>const myCol = this.getModule('BoxCollider');
const otherCol = otherObject.getModule('BoxCollider');

if (myCol.overlaps(otherCol)) {
    console.log('Collision detected!');
}</code></pre>

            <h3>Find All Overlapping Colliders</h3>
            <pre><code>const myCol = this.getModule('BoxCollider');

// Find everything overlapping
const hits = myCol.findOverlappingColliders();
for (const hit of hits) {
    console.log('Overlapping:', hit.object.name, 'tag:', hit.collider.tag);
}

// Filter by tag
const enemies = myCol.findOverlappingWithTag('enemy');
const isOnGround = myCol.isOverlappingTag('solid');

// Get first match
const pickup = myCol.getFirstOverlappingWithTag('pickup');
if (pickup) {
    pickup.object.destroy();
}</code></pre>

            <h3>Point Testing</h3>
            <pre><code>// Check if a world point is inside the collider
if (myCol.containsPoint(mouseX, mouseY)) {
    console.log('Clicked on this object!');
}</code></pre>

            <div class="tip"><code>findOverlappingColliders()</code> uses efficient spatial queries via <code>instancesInRadius</code> so it scales well with many objects.</div>
        `,

        "Collision Info": `
            <h2>📐 Collision Info &amp; Response</h2>
            <p>Get detailed collision information for manual resolution:</p>

            <h3>Box vs Box</h3>
            <pre><code>const info = myCol.getBoxCollisionInfo(otherCol);
if (info) {
    console.log('Normal:', info.normal.x, info.normal.y);
    console.log('Depth:', info.depth);
    console.log('Contact:', info.point.x, info.point.y);

    // Push this object out of the collision
    this.gameObject.x += info.normal.x * info.depth;
    this.gameObject.y += info.normal.y * info.depth;
}</code></pre>

            <h3>Box vs Sphere</h3>
            <pre><code>const sphereCol = otherObject.getModule('SphereCollider');
const info = myCol.getSphereCollisionInfo(sphereCol);
if (info) {
    // info.normal — direction to push apart
    // info.depth  — how far objects overlap
    // info.point  — contact point on the box surface
}</code></pre>

            <h3>Collision Info Object</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                <tr><td><code>normal</code></td><td>{x, y}</td><td>Unit vector pointing from other → this collider</td></tr>
                <tr><td><code>depth</code></td><td>number</td><td>Penetration depth in pixels</td></tr>
                <tr><td><code>point</code></td><td>{x, y}</td><td>Contact point in world space</td></tr>
            </table>
        `,

        "Raycasting": `
            <h2>🔦 Raycasting</h2>
            <p>Cast a ray to detect intersection with this collider:</p>

            <pre><code>const col = this.getModule('BoxCollider');

// Cast a ray from (100, 100) going right
const hit = col.raycast(100, 100, 1, 0, 500);
if (hit) {
    console.log('Hit at:', hit.point.x, hit.point.y);
    console.log('Distance:', hit.distance);
    console.log('Surface normal:', hit.normal.x, hit.normal.y);
}</code></pre>

            <h3>Raycast Result</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                <tr><td><code>hit</code></td><td>boolean</td><td>Always <code>true</code> if returned</td></tr>
                <tr><td><code>point</code></td><td>{x, y}</td><td>World-space hit position</td></tr>
                <tr><td><code>distance</code></td><td>number</td><td>Distance from ray origin to hit</td></tr>
                <tr><td><code>normal</code></td><td>{x, y}</td><td>Surface normal at hit point</td></tr>
            </table>

            <div class="tip">Pass a <code>maxDistance</code> to limit how far the ray travels (default: 1000).</div>
        `,

        "Triggers & Tags": `
            <h2>🏷️ Triggers &amp; Tags</h2>
            <p>Use triggers for detection zones that don't block movement:</p>

            <h3>Trigger Zone Example</h3>
            <pre><code>start() {
    const zone = this.getModule('BoxCollider');
    zone.isTrigger = true;
    zone.tag = 'checkpoint';
    zone.width = 128;
    zone.height = 128;
}

loop(dt) {
    const zone = this.getModule('BoxCollider');
    const player = zone.getFirstOverlappingWithTag('player');
    if (player) {
        console.log('Player reached checkpoint!');
    }
}</code></pre>

            <h3>Tag-Based Filtering</h3>
            <pre><code>// Check specific tags
if (myCol.isOverlappingTag('lava')) {
    this.takeDamage(10);
}

// Get all enemies in range
const enemies = myCol.findOverlappingWithTag('enemy');
console.log(enemies.length + ' enemies nearby');</code></pre>

            <div class="tip">Trigger colliders are drawn with a dashed yellow outline in debug mode to distinguish them from solid colliders.</div>
        `,

        "2.5D Z-Height": `
            <h2>📐 2.5D Z-Height</h2>
            <p>For top-down games with jumping, the <strong>zHeight</strong> property controls when objects can pass over this collider:</p>

            <pre><code>start() {
    const col = this.getModule('BoxCollider');
    col.zHeight = 32; // Objects with zPos > 32 can jump over this
}

// On a jumping character:
// When gameObject.zPos > collider.zHeight, the collision is ignored
// This lets characters jump over low walls and obstacles</code></pre>

            <div class="tip">Set <code>zHeight = 0</code> (default) to always block regardless of the other object's Z position.</div>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>

            <h3>Dimensions</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>width</code></td><td>number</td><td>64</td><td>Collision box width in pixels</td></tr>
                <tr><td><code>height</code></td><td>number</td><td>64</td><td>Collision box height in pixels</td></tr>
                <tr><td><code>offsetX</code></td><td>number</td><td>0</td><td>X offset from object center</td></tr>
                <tr><td><code>offsetY</code></td><td>number</td><td>0</td><td>Y offset from object center</td></tr>
            </table>

            <h3>Behavior</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>isTrigger</code></td><td>boolean</td><td>false</td><td>Detect collisions without blocking</td></tr>
                <tr><td><code>tag</code></td><td>string</td><td>'solid'</td><td>Tag for collision filtering</td></tr>
                <tr><td><code>zHeight</code></td><td>number</td><td>0</td><td>Z-axis height (2.5D jumping support)</td></tr>
            </table>

            <h3>Debug</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>showDebug</code></td><td>boolean</td><td>true</td><td>Show debug outline in editor</td></tr>
                <tr><td><code>debugColor</code></td><td>string</td><td>'#00ff00'</td><td>Debug outline color</td></tr>
            </table>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>overlaps(other)</code></td><td>boolean</td><td>Check overlap with any collider type</td></tr>
                <tr><td><code>containsPoint(x, y)</code></td><td>boolean</td><td>Test if a point is inside the collider</td></tr>
                <tr><td><code>getBounds()</code></td><td>object</td><td>Get AABB bounds {left, right, top, bottom, ...}</td></tr>
                <tr><td><code>getWorldPoints()</code></td><td>array</td><td>Get rotated corner points in world space</td></tr>
                <tr><td><code>findOverlappingColliders(radius?)</code></td><td>array</td><td>Find all overlapping colliders nearby</td></tr>
                <tr><td><code>findOverlappingWithTag(tag)</code></td><td>array</td><td>Find overlapping colliders with a specific tag</td></tr>
                <tr><td><code>isOverlappingTag(tag)</code></td><td>boolean</td><td>Check if overlapping any collider with tag</td></tr>
                <tr><td><code>getFirstOverlappingWithTag(tag)</code></td><td>object|null</td><td>Get first overlapping collider with tag</td></tr>
                <tr><td><code>getBoxCollisionInfo(other)</code></td><td>object|null</td><td>Get collision normal, depth, and contact point</td></tr>
                <tr><td><code>getSphereCollisionInfo(sphere)</code></td><td>object|null</td><td>Get collision info vs a sphere collider</td></tr>
                <tr><td><code>raycast(ox, oy, dx, dy, max?)</code></td><td>object|null</td><td>Ray intersection test</td></tr>
            </table>
        `
    };

    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'BoxCollider';
        json.width = this.width;
        json.height = this.height;
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.isTrigger = this.isTrigger;
        json.tag = this.tag;
        json.zHeight = this.zHeight;
        json.showDebug = this.showDebug;
        json.debugColor = this.debugColor;
        return json;
    }
    
    static fromJSON(json) {
        const module = new BoxCollider();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.width = json.width !== undefined ? json.width : 64;
        module.height = json.height !== undefined ? json.height : 64;
        module.offsetX = json.offsetX || 0;
        module.offsetY = json.offsetY || 0;
        module.isTrigger = json.isTrigger || false;
        module.tag = json.tag || 'solid';
        module.zHeight = json.zHeight || 0;
        module.showDebug = json.showDebug !== undefined ? json.showDebug : true;
        module.debugColor = json.debugColor || '#00ff00';
        return module;
    }
    
    clone() {
        const cloned = new BoxCollider();
        cloned.width = this.width;
        cloned.height = this.height;
        cloned.offsetX = this.offsetX;
        cloned.offsetY = this.offsetY;
        cloned.isTrigger = this.isTrigger;
        cloned.tag = this.tag;
        cloned.zHeight = this.zHeight;
        cloned.showDebug = this.showDebug;
        cloned.debugColor = this.debugColor;
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.BoxCollider = BoxCollider;
}
