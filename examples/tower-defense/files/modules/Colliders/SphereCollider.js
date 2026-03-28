/**
 * SphereCollider Module
 * Provides circular collision detection
 * Can collide with both BoxCollider and other SphereColliders
 */

class SphereCollider extends Module {
    constructor() {
        super();
        
        // Editable properties
        this.radius = 32;     // Collision circle radius
        this.offsetX = 0;     // Offset from gameObject position
        this.offsetY = 0;
        this.isTrigger = false; // If true, collisions are detected but no physics response
        this.tag = 'solid';        // Tag for collision filtering
        
        // Debug visualization
        this.showDebug = true;
        this.debugColor = '#00ff0d';
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Colliders';
    
    static getIcon() {
        return '⭕';
    }
    
    static getDescription() {
        return 'Circular collision detection and trigger zones';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    /**
     * Property metadata with organized sections
     */
    getPropertyMetadata() {
        return [
            // === SIZE ===
            { type: 'header', label: '⭕ Size' },
            { key: 'radius', type: 'number', label: 'Radius', default: 32, min: 0 },
            
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
            
            // === DEBUG ===
            { type: 'header', label: '🔧 Debug Visualization' },
            { key: 'showDebug', type: 'boolean', label: 'Show Debug', default: true },
            { key: 'debugColor', type: 'color', label: 'Debug Color', default: '#00ffff', showIf: { showDebug: true } }
        ];
    }
    
    // ==================== COLLISION DETECTION ====================
    
    /**
     * Check if this sphere collider overlaps with another sphere collider
     * @param {SphereCollider} other
     * @returns {boolean}
     */
    overlapsSphere(other) {
        const center1 = this.getCenter();
        const center2 = other.getCenter();
        
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const worldScale1 = this.gameObject.getWorldScale();
        const worldScale2 = other.gameObject.getWorldScale();
        
        const scaledRadius1 = this.radius * Math.max(Math.abs(worldScale1.x), Math.abs(worldScale1.y));
        const scaledRadius2 = other.radius * Math.max(Math.abs(worldScale2.x), Math.abs(worldScale2.y));
        
        return distance < (scaledRadius1 + scaledRadius2);
    }
    
    /**
     * Check if this sphere collider overlaps with a box collider
     * @param {BoxCollider} boxCollider
     * @returns {boolean}
     */
    overlapsBox(boxCollider) {
        const center = this.getCenter();
        const bounds = boxCollider.getBounds();
        
        const worldScale = this.gameObject.getWorldScale();
        const scaledRadius = this.radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y));
        
        // Find the closest point on the box to the circle center
        const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
        
        // Calculate distance from circle center to closest point
        const dx = center.x - closestX;
        const dy = center.y - closestY;
        const distanceSquared = dx * dx + dy * dy;
        
        return distanceSquared < (scaledRadius * scaledRadius);
    }
    
    /**
     * Check if this collider overlaps with another (any type)
     * @param {Module} other - BoxCollider or SphereCollider
     * @returns {boolean}
     */
    overlaps(other) {
        if (other instanceof SphereCollider) {
            return this.overlapsSphere(other);
        } else if (other instanceof BoxCollider) {
            return this.overlapsBox(other);
        } else if (other instanceof PolygonCollider || (other.constructor && other.constructor.name === 'PolygonCollider')) {
            return this.overlapsPolygon(other);
        }
        return false;
    }
    
    /**
     * Check if a point is inside this collider
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    containsPoint(x, y) {
        const center = this.getCenter();
        const worldScale = this.gameObject.getWorldScale();
        const scaledRadius = this.radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y));
        
        const dx = x - center.x;
        const dy = y - center.y;
        
        return (dx * dx + dy * dy) <= (scaledRadius * scaledRadius);
    }
    
    /**
     * Get the center point of this collider in world space
     * @returns {Object} {x, y}
     */
    getCenter() {
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        
        return {
            x: worldPos.x + this.offsetX,
            y: worldPos.y + this.offsetY
        };
    }
    
    /**
     * Get the scaled radius of this collider
     * @returns {number}
     */
    getScaledRadius() {
        const worldScale = this.gameObject.getWorldScale();
        return this.radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y));
    }
    
    /**
     * Get the bounds of this collider (AABB)
     * @returns {Object} {left, right, top, bottom, x, y, width, height, centerX, centerY}
     */
    getBounds() {
        const center = this.getCenter();
        const scaledRadius = this.getScaledRadius();
        
        return {
            left: center.x - scaledRadius,
            right: center.x + scaledRadius,
            top: center.y - scaledRadius,
            bottom: center.y + scaledRadius,
            x: center.x - scaledRadius,
            y: center.y - scaledRadius,
            width: scaledRadius * 2,
            height: scaledRadius * 2,
            centerX: center.x,
            centerY: center.y
        };
    }
    
    /**
     * Get collision info between this sphere and a box
     * @param {BoxCollider} boxCollider
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getBoxCollisionInfo(boxCollider) {
        const center = this.getCenter();
        const bounds = boxCollider.getBounds();
        const scaledRadius = this.getScaledRadius();
        
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
        
        // Calculate collision normal
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
     * Get collision info between this sphere and another sphere
     * @param {SphereCollider} other
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getSphereCollisionInfo(other) {
        const center1 = this.getCenter();
        const center2 = other.getCenter();
        
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const scaledRadius1 = this.getScaledRadius();
        const scaledRadius2 = other.getScaledRadius();
        const combinedRadius = scaledRadius1 + scaledRadius2;
        
        if (distance >= combinedRadius) {
            return null; // No collision
        }
        
        // Calculate collision normal
        let normalX, normalY;
        if (distance === 0) {
            // Centers are at the same position
            normalX = 1;
            normalY = 0;
        } else {
            normalX = dx / distance;
            normalY = dy / distance;
        }
        
        const depth = combinedRadius - distance;
        
        return {
            normal: { x: normalX, y: normalY },
            depth: depth,
            point: {
                x: center1.x + normalX * scaledRadius1,
                y: center1.y + normalY * scaledRadius1
            }
        };
    }
    
    /**
     * Check if this sphere collider overlaps with a polygon collider
     * @param {PolygonCollider} polygonCollider
     * @returns {boolean}
     */
    overlapsPolygon(polygonCollider) {
        // Use the polygon's overlap method
        return polygonCollider.overlapsSphere(this);
    }
    
    /**
     * Get collision info between this sphere and a polygon
     * @param {PolygonCollider} polygonCollider
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getPolygonCollisionInfo(polygonCollider) {
        if (!this.overlapsPolygon(polygonCollider)) {
            return null;
        }
        
        const center = this.getCenter();
        const radius = this.getScaledRadius();
        const worldPoints = polygonCollider.getWorldPoints();
        
        let minDistance = Infinity;
        let closestPoint = null;
        let edgeNormalX = 0;
        let edgeNormalY = 0;
        
        // Find closest edge
        for (let i = 0; i < worldPoints.length; i++) {
            const p1 = worldPoints[i];
            const p2 = worldPoints[(i + 1) % worldPoints.length];
            
            // Get edge vector
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
            
            if (edgeLen === 0) continue;
            
            // Project circle center onto edge
            const dx = center.x - p1.x;
            const dy = center.y - p1.y;
            let t = (dx * edgeX + dy * edgeY) / (edgeLen * edgeLen);
            t = Math.max(0, Math.min(1, t));
            
            const closestX = p1.x + t * edgeX;
            const closestY = p1.y + t * edgeY;
            
            const distX = center.x - closestX;
            const distY = center.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);
            
            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = { x: closestX, y: closestY };
                
                // Edge normal (perpendicular)
                edgeNormalX = -edgeY / edgeLen;
                edgeNormalY = edgeX / edgeLen;
                
                // Make sure normal points away from polygon center
                const polyBounds = polygonCollider.getBounds();
                const toCenterX = center.x - polyBounds.centerX;
                const toCenterY = center.y - polyBounds.centerY;
                const dot = toCenterX * edgeNormalX + toCenterY * edgeNormalY;
                
                if (dot < 0) {
                    edgeNormalX = -edgeNormalX;
                    edgeNormalY = -edgeNormalY;
                }
            }
        }
        
        // Check if circle center is inside polygon
        if (polygonCollider.containsPoint(center.x, center.y)) {
            // Inside - push out along closest edge normal
            const depth = radius + minDistance;
            return {
                normal: { x: edgeNormalX, y: edgeNormalY },
                depth: depth,
                point: closestPoint
            };
        } else {
            // Outside - normal points from surface to center
            const depth = radius - minDistance;
            const normalLen = Math.sqrt(
                (center.x - closestPoint.x) ** 2 + 
                (center.y - closestPoint.y) ** 2
            );
            
            return {
                normal: {
                    x: normalLen > 0 ? (center.x - closestPoint.x) / normalLen : edgeNormalX,
                    y: normalLen > 0 ? (center.y - closestPoint.y) / normalLen : edgeNormalY
                },
                depth: depth,
                point: closestPoint
            };
        }
    }
    
    // ==================== RAYCASTING ====================
    
    /**
     * Cast a ray and check intersection with this sphere collider
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
        
        const center = this.getCenter();
        const radius = this.getScaledRadius();
        
        // Vector from origin to circle center
        const ocX = center.x - originX;
        const ocY = center.y - originY;
        
        // Project oc onto ray direction
        const tca = ocX * dirX + ocY * dirY;
        
        // Distance squared from center to closest approach
        const d2 = ocX * ocX + ocY * ocY - tca * tca;
        const r2 = radius * radius;
        
        if (d2 > r2) return null; // Ray misses sphere
        
        const thc = Math.sqrt(r2 - d2);
        let t0 = tca - thc;
        let t1 = tca + thc;
        
        // Pick the closest positive intersection
        let t = t0;
        if (t < 0) {
            t = t1;
            if (t < 0) return null; // Both behind ray
        }
        
        if (t > maxDistance) return null;
        
        const hitX = originX + dirX * t;
        const hitY = originY + dirY * t;
        
        // Normal points outward from center
        const nx = hitX - center.x;
        const ny = hitY - center.y;
        const nLen = Math.sqrt(nx * nx + ny * ny);
        
        return {
            hit: true,
            point: { x: hitX, y: hitY },
            distance: t,
            normal: nLen > 0 ? { x: nx / nLen, y: ny / nLen } : { x: 0, y: -1 }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    draw(ctx) {
        // Draw debug visualization in editor
        if (this.showDebug || this.gameObject.isEditing) {
            const center = { x: 0, y: 0 }; //this.getCenter();
            const scaledRadius = this.getScaledRadius();
            
            ctx.save();
            ctx.strokeStyle = this.isTrigger ? '#ffff00' : this.debugColor;
            ctx.lineWidth = 1;
            ctx.setLineDash(this.isTrigger ? [5, 5] : []);
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(center.x, center.y, scaledRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw center cross
            ctx.beginPath();
            ctx.moveTo(center.x - 5, center.y);
            ctx.lineTo(center.x + 5, center.y);
            ctx.moveTo(center.x, center.y - 5);
            ctx.lineTo(center.x, center.y + 5);
            ctx.stroke();
            
            // Draw radius line
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(center.x + scaledRadius, center.y);
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    // ==================== OBB COLLISION ====================
    
    /**
     * Get collision info between this sphere and an oriented bounding box (OBB)
     * @param {Array} obbCorners - Array of 4 corner points {x, y} for the OBB
     * @param {Array} obbAxes - Array of 2 normalized axis vectors {x, y} for the OBB
     * @returns {Object|null} {normal, depth, point} or null if no collision
     */
    getOBBCollisionInfo(obbCorners, obbAxes) {
        const center = this.getCenter();
        const radius = this.getScaledRadius();
        
        // Find the closest point on the OBB edges to the sphere center
        let minDist = Infinity;
        let closestX = center.x;
        let closestY = center.y;
        let edgeNormalX = 0;
        let edgeNormalY = 0;
        
        // Check each edge of the OBB
        for (let i = 0; i < 4; i++) {
            const p1 = obbCorners[i];
            const p2 = obbCorners[(i + 1) % 4];
            
            // Get edge vector
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
            
            if (edgeLen === 0) continue;
            
            // Project sphere center onto edge
            const dx = center.x - p1.x;
            const dy = center.y - p1.y;
            let t = (dx * edgeX + dy * edgeY) / (edgeLen * edgeLen);
            t = Math.max(0, Math.min(1, t));
            
            const projX = p1.x + t * edgeX;
            const projY = p1.y + t * edgeY;
            
            const distX = center.x - projX;
            const distY = center.y - projY;
            const dist = Math.sqrt(distX * distX + distY * distY);
            
            if (dist < minDist) {
                minDist = dist;
                closestX = projX;
                closestY = projY;
                
                // Edge normal (perpendicular, pointing outward)
                edgeNormalX = -edgeY / edgeLen;
                edgeNormalY = edgeX / edgeLen;
                
                // Make sure normal points toward sphere
                const toCenterX = center.x - (p1.x + p2.x) * 0.5;
                const toCenterY = center.y - (p1.y + p2.y) * 0.5;
                const dot = toCenterX * edgeNormalX + toCenterY * edgeNormalY;
                if (dot < 0) {
                    edgeNormalX = -edgeNormalX;
                    edgeNormalY = -edgeNormalY;
                }
            }
        }
        
        // Check if sphere is inside OBB (point in polygon test)
        let inside = false;
        for (let i = 0, j = 3; i < 4; j = i++) {
            const xi = obbCorners[i].x, yi = obbCorners[i].y;
            const xj = obbCorners[j].x, yj = obbCorners[j].y;
            if (((yi > center.y) !== (yj > center.y)) &&
                (center.x < (xj - xi) * (center.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        if (inside) {
            // Sphere center is inside OBB - push out along closest edge normal
            const depth = radius + minDist;
            return {
                normal: { x: edgeNormalX, y: edgeNormalY },
                depth: depth,
                point: { x: closestX, y: closestY }
            };
        }
        
        // Check if close enough to collide
        if (minDist >= radius) {
            return null; // No collision
        }
        
        // Collision - calculate normal and depth
        const depth = radius - minDist;
        let normalX, normalY;
        
        if (minDist > 0.001) {
            normalX = (center.x - closestX) / minDist;
            normalY = (center.y - closestY) / minDist;
        } else {
            normalX = edgeNormalX;
            normalY = edgeNormalY;
        }
        
        return {
            normal: { x: normalX, y: normalY },
            depth: depth,
            point: { x: closestX, y: closestY }
        };
    }
    
    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>⭕ SphereCollider Overview</h2>
            <p>The <strong>SphereCollider</strong> (also called <strong>CircleCollider</strong>) provides circular collision detection. It's ideal for round objects, characters, projectiles, and proximity detection.</p>
            <ul>
                <li><strong>Circle vs Circle</strong> — fast distance-based overlap checks</li>
                <li><strong>Circle vs Box</strong> — closest-point-on-rectangle algorithm</li>
                <li><strong>Circle vs Polygon</strong> — edge-distance and containment checks</li>
                <li><strong>Raycasting</strong> — ray-circle intersection for line-of-sight checks</li>
                <li><strong>Trigger mode</strong> — detect overlaps without physics response</li>
            </ul>
            <div class="tip">SphereCollider is the fastest collider type — prefer it when an approximate circle shape is acceptable.</div>
        `,

        "Basic Setup": `
            <h2>⚡ Basic Setup</h2>
            <p>To add circular collision to a GameObject:</p>

            <h3>In the Prefab Editor</h3>
            <ol>
                <li>Add a <strong>SphereCollider</strong> module to your GameObject</li>
                <li>Set the <strong>Radius</strong> to match your sprite or desired collision area</li>
                <li>Adjust <strong>Offset X/Y</strong> if the circle should be shifted from center</li>
                <li>Set a <strong>Tag</strong> (e.g., 'solid', 'enemy', 'bullet') for filtering</li>
            </ol>

            <h3>Minimal Code Example</h3>
            <pre><code>start() {
    const col = this.getModule('SphereCollider');
    col.radius = 24;
    col.tag = 'bullet';
    col.isTrigger = true; // Detect hits without blocking
}</code></pre>

            <div class="tip">The collider radius scales automatically with the GameObject's world scale (uses the larger of scaleX/scaleY).</div>
        `,

        "Collision Detection": `
            <h2>💥 Collision Detection</h2>
            <p>SphereCollider supports overlap checks with all collider types:</p>

            <h3>Check Overlap with Any Collider</h3>
            <pre><code>const myCol = this.getModule('SphereCollider');
const otherCol = otherObject.getModule('BoxCollider');

if (myCol.overlaps(otherCol)) {
    console.log('Hit!');
}</code></pre>

            <h3>Specific Overlap Methods</h3>
            <pre><code>const myCol = this.getModule('SphereCollider');

// Sphere vs Sphere
const otherSphere = enemy.getModule('SphereCollider');
if (myCol.overlapsSphere(otherSphere)) { ... }

// Sphere vs Box
const boxCol = wall.getModule('BoxCollider');
if (myCol.overlapsBox(boxCol)) { ... }

// Sphere vs Polygon
const polyCol = terrain.getModule('PolygonCollider');
if (myCol.overlapsPolygon(polyCol)) { ... }</code></pre>

            <h3>Point Testing</h3>
            <pre><code>// Check if a world point is inside the circle
if (myCol.containsPoint(mouseX, mouseY)) {
    console.log('Clicked on this object!');
}</code></pre>
        `,

        "Collision Info": `
            <h2>📐 Collision Info &amp; Response</h2>
            <p>Get detailed collision data for manual resolution:</p>

            <h3>Sphere vs Box</h3>
            <pre><code>const info = myCol.getBoxCollisionInfo(boxCollider);
if (info) {
    // Push sphere out of the box
    this.gameObject.x += info.normal.x * info.depth;
    this.gameObject.y += info.normal.y * info.depth;
}</code></pre>

            <h3>Sphere vs Sphere</h3>
            <pre><code>const info = myCol.getSphereCollisionInfo(otherSphere);
if (info) {
    // Separate both objects equally
    this.gameObject.x += info.normal.x * info.depth * 0.5;
    this.gameObject.y += info.normal.y * info.depth * 0.5;
    other.x -= info.normal.x * info.depth * 0.5;
    other.y -= info.normal.y * info.depth * 0.5;
}</code></pre>

            <h3>Sphere vs Polygon</h3>
            <pre><code>const info = myCol.getPolygonCollisionInfo(polyCollider);
if (info) {
    this.gameObject.x += info.normal.x * info.depth;
    this.gameObject.y += info.normal.y * info.depth;
}</code></pre>

            <h3>Collision Info Object</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                <tr><td><code>normal</code></td><td>{x, y}</td><td>Unit vector pushing this collider away</td></tr>
                <tr><td><code>depth</code></td><td>number</td><td>Penetration depth in pixels</td></tr>
                <tr><td><code>point</code></td><td>{x, y}</td><td>Contact point in world space</td></tr>
            </table>
        `,

        "Raycasting": `
            <h2>🔦 Raycasting</h2>
            <p>Cast a ray to detect intersection with this sphere collider:</p>

            <pre><code>const col = this.getModule('SphereCollider');

// Cast a ray from (0, 0) going right
const hit = col.raycast(0, 0, 1, 0, 500);
if (hit) {
    console.log('Hit sphere at:', hit.point.x, hit.point.y);
    console.log('Distance:', hit.distance);
    console.log('Surface normal:', hit.normal.x, hit.normal.y);
}</code></pre>

            <h3>Raycast Result</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                <tr><td><code>hit</code></td><td>boolean</td><td>Always <code>true</code> if returned</td></tr>
                <tr><td><code>point</code></td><td>{x, y}</td><td>World-space hit position</td></tr>
                <tr><td><code>distance</code></td><td>number</td><td>Distance from ray origin</td></tr>
                <tr><td><code>normal</code></td><td>{x, y}</td><td>Surface normal at hit (points outward from center)</td></tr>
            </table>

            <div class="tip">The ray direction is automatically normalized. Pass <code>maxDistance</code> to limit range (default: 1000).</div>
        `,

        "Utility Methods": `
            <h2>🔧 Utility Methods</h2>

            <h3>Get Center &amp; Radius</h3>
            <pre><code>const col = this.getModule('SphereCollider');

// Get world-space center (accounts for offset)
const center = col.getCenter();
console.log('Center:', center.x, center.y);

// Get scale-adjusted radius
const radius = col.getScaledRadius();
console.log('Effective radius:', radius);

// Get axis-aligned bounding box
const bounds = col.getBounds();
console.log('AABB:', bounds.left, bounds.top, bounds.width, bounds.height);</code></pre>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>

            <h3>Size</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>radius</code></td><td>number</td><td>32</td><td>Collision circle radius in pixels</td></tr>
                <tr><td><code>offsetX</code></td><td>number</td><td>0</td><td>X offset from object center</td></tr>
                <tr><td><code>offsetY</code></td><td>number</td><td>0</td><td>Y offset from object center</td></tr>
            </table>

            <h3>Behavior</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>isTrigger</code></td><td>boolean</td><td>false</td><td>Detect collisions without blocking</td></tr>
                <tr><td><code>tag</code></td><td>string</td><td>'solid'</td><td>Tag for collision filtering</td></tr>
            </table>

            <h3>Debug</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>showDebug</code></td><td>boolean</td><td>true</td><td>Show debug circle in editor</td></tr>
                <tr><td><code>debugColor</code></td><td>string</td><td>'#00ff0d'</td><td>Debug outline color</td></tr>
            </table>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>overlaps(other)</code></td><td>boolean</td><td>Check overlap with any collider type</td></tr>
                <tr><td><code>overlapsSphere(other)</code></td><td>boolean</td><td>Check overlap with another sphere</td></tr>
                <tr><td><code>overlapsBox(box)</code></td><td>boolean</td><td>Check overlap with a box collider</td></tr>
                <tr><td><code>overlapsPolygon(poly)</code></td><td>boolean</td><td>Check overlap with a polygon collider</td></tr>
                <tr><td><code>containsPoint(x, y)</code></td><td>boolean</td><td>Test if a point is inside the circle</td></tr>
                <tr><td><code>getCenter()</code></td><td>{x, y}</td><td>Get world-space center position</td></tr>
                <tr><td><code>getScaledRadius()</code></td><td>number</td><td>Get scale-adjusted radius</td></tr>
                <tr><td><code>getBounds()</code></td><td>object</td><td>Get AABB bounds</td></tr>
                <tr><td><code>getBoxCollisionInfo(box)</code></td><td>object|null</td><td>Collision info vs box collider</td></tr>
                <tr><td><code>getSphereCollisionInfo(sphere)</code></td><td>object|null</td><td>Collision info vs another sphere</td></tr>
                <tr><td><code>getPolygonCollisionInfo(poly)</code></td><td>object|null</td><td>Collision info vs polygon collider</td></tr>
                <tr><td><code>raycast(ox, oy, dx, dy, max?)</code></td><td>object|null</td><td>Ray intersection test</td></tr>
            </table>
        `
    };

    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'SphereCollider';
        json.radius = this.radius;
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.isTrigger = this.isTrigger;
        json.tag = this.tag;
        json.showDebug = this.showDebug;
        json.debugColor = this.debugColor;
        return json;
    }
    
    static fromJSON(json) {
        const module = new SphereCollider();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.radius = json.radius !== undefined ? json.radius : 32;
        module.offsetX = json.offsetX || 0;
        module.offsetY = json.offsetY || 0;
        module.isTrigger = json.isTrigger || false;
        module.tag = json.tag || '';
        module.showDebug = json.showDebug !== undefined ? json.showDebug : true;
        module.debugColor = json.debugColor || '#00ffff';
        return module;
    }
    
    clone() {
        const cloned = new SphereCollider();
        cloned.radius = this.radius;
        cloned.offsetX = this.offsetX;
        cloned.offsetY = this.offsetY;
        cloned.isTrigger = this.isTrigger;
        cloned.tag = this.tag;
        cloned.showDebug = this.showDebug;
        cloned.debugColor = this.debugColor;
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.SphereCollider = SphereCollider;
    window.CircleCollider = SphereCollider;
}

// Register with Module system if available
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('SphereCollider', SphereCollider);
    Module.register('CircleCollider', SphereCollider);
}
