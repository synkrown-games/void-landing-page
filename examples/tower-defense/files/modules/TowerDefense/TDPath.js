/**
 * TDPath Module
 * Tower Defense path system with multiple modes
 * Namespace: TowerDefense
 * 
 * Supports two path definition modes:
 * 1. Children Mode: Uses child game object hierarchy to define path points
 * 2. Gizmo Mode: Uses spline gizmo points defined in the module
 * 
 * Features:
 * - Linear or spline interpolation
 * - Path segments for enemies to follow
 * - Editor visualization with gizmo handles
 * - Path length calculation
 */

class TDPath extends Module {
    constructor() {
        super();

        // Path Mode
        this.pathMode = 'gizmo'; // 'children', 'gizmo', or 'generated'

        // Spline Settings
        this.useSpline = true;
        this.splineResolution = 20; // Points per segment for spline
        this.splineTension = 0.5; // Catmull-Rom tension (0-1)

        // Path Generation Settings (for 'generated' mode)
        this.generationMode = 'waypoints'; // 'waypoints', 'random', 'serpentine'
        this.generatedSegments = 5; // Number of path segments to generate
        this.pathWidth = 40; // Visual width of path
        this.noiseAmount = 0; // Random noise to add to path (0-100)
        this.noiseFrequency = 0.5; // How often noise changes direction
        this.smoothIterations = 2; // Smoothing passes for generated path

        // Waypoint Generation Settings
        this.startX = 0;
        this.startY = 0;
        this.endX = 400;
        this.endY = 300;
        this.generateCurvy = true; // Add curves between waypoints
        this.curviness = 50; // How much curves deviate from straight lines

        // Gizmo Mode Points (array of {x, y} positions)
        this.gizmoPoints = [];

        // Visual Settings (for editor)
        this.showPath = true;
        this.pathColor = '#44ff88';
        this.pathBorderColor = '#228844';
        this.pathWidth = 40;
        this.showPoints = true;
        this.pointColor = '#ffcc00';
        this.pointRadius = 10;
        this.showDirection = true;
        this.showGizmoAlways = true;
        this.pathStyle = 'solid'; // 'solid', 'dashed', 'dotted', 'grass', 'stone'
        this.showPathBorder = true;
        this.pathOpacity = 0.8;

        // Runtime
        this._cachedPath = null;
        this._pathLength = 0;
        this._segmentLengths = [];
        this._gameManager = null;

        // Offscreen rendering
        this.offscreenRender = false; // Enable to render path as cached image
        this._offscreenCanvas = null;
        this._offscreenContext = null;
        this._offscreenDirty = true; // Flag to regenerate offscreen canvas
    }

    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 90;

    static getIcon() {
        return '🛤️';
    }

    static getDescription() {
        return 'Defines enemy path using children hierarchy or gizmo points with optional spline curves';
    }

    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === PATH MODE ===
            _header_mode: { type: 'header', label: '🛤️ Path Configuration' },
            pathMode: {
                type: 'select',
                label: 'Path Mode',
                default: 'gizmo',
                options: ['children', 'gizmo', 'generated'],
                hint: 'Children: use child objects, Gizmo: drag points in editor, Generated: auto-create path'
            },

            // === SPLINE SETTINGS ===
            _header_spline: { type: 'header', label: '〰️ Spline Smoothing' },
            useSpline: {
                type: 'boolean',
                label: 'Enable Spline Curves',
                default: true,
                hint: 'Smooth the path with Catmull-Rom splines'
            },
            splineResolution: {
                type: 'slider',
                label: 'Curve Detail',
                default: 20,
                min: 5,
                max: 50,
                hint: 'Points per curve segment (higher = smoother)'
            },
            splineTension: {
                type: 'slider',
                label: 'Curve Tension',
                default: 0.5,
                min: 0,
                max: 1,
                step: 0.05,
                hint: '0 = sharp corners, 1 = smooth curves'
            },

            // === PATH GENERATION ===
            _header_generation: { type: 'header', label: '✨ Path Generation (Generated Mode)' },
            generationMode: {
                type: 'select',
                label: 'Generation Style',
                default: 'waypoints',
                options: ['waypoints', 'random', 'serpentine'],
                hint: 'How to automatically generate the path'
            },
            generatedSegments: {
                type: 'slider',
                label: 'Path Segments',
                default: 5,
                min: 2,
                max: 20,
                hint: 'Number of segments in generated path'
            },
            noiseAmount: {
                type: 'slider',
                label: 'Path Noise',
                default: 0,
                min: 0,
                max: 100,
                hint: 'Add random variation to path (0 = straight)'
            },
            noiseFrequency: {
                type: 'slider',
                label: 'Noise Frequency',
                default: 0.5,
                min: 0.1,
                max: 2,
                step: 0.1,
                hint: 'How often noise changes direction'
            },
            smoothIterations: {
                type: 'slider',
                label: 'Smoothing Passes',
                default: 2,
                min: 0,
                max: 5,
                hint: 'Additional smoothing iterations'
            },
            generateCurvy: {
                type: 'boolean',
                label: 'Add Curves',
                default: true,
                hint: 'Generate curved path instead of straight lines'
            },
            curviness: {
                type: 'slider',
                label: 'Curviness',
                default: 50,
                min: 0,
                max: 150,
                hint: 'How much curves deviate from straight path'
            },

            // === GENERATION BOUNDS ===
            _header_bounds: { type: 'header', label: '📏 Generation Bounds' },
            startX: { type: 'number', label: 'Start X', default: 0, hint: 'X offset from path object for start point' },
            startY: { type: 'number', label: 'Start Y', default: 0, hint: 'Y offset from path object for start point' },
            endX: { type: 'number', label: 'End X', default: 400, hint: 'X offset from path object for end point' },
            endY: { type: 'number', label: 'End Y', default: 300, hint: 'Y offset from path object for end point' },

            // === VISUAL APPEARANCE ===
            _header_visual: { type: 'header', label: '🎨 Path Appearance' },
            showPath: {
                type: 'boolean',
                label: 'Show Path',
                default: true
            },
            pathStyle: {
                type: 'select',
                label: 'Path Style',
                default: 'solid',
                options: ['solid', 'dashed', 'dotted', 'grass', 'stone'],
                hint: 'Visual style of the path'
            },
            pathColor: {
                type: 'color',
                label: 'Path Color',
                default: '#44ff88'
            },
            pathBorderColor: {
                type: 'color',
                label: 'Border Color',
                default: '#228844'
            },
            pathWidth: {
                type: 'slider',
                label: 'Path Width',
                default: 40,
                min: 5,
                max: 100,
                hint: 'Visual width of the path in pixels'
            },
            pathOpacity: {
                type: 'slider',
                label: 'Path Opacity',
                default: 0.8,
                min: 0.1,
                max: 1,
                step: 0.1
            },
            showPathBorder: {
                type: 'boolean',
                label: 'Show Border',
                default: true
            },

            // === EDITOR POINTS ===
            _header_points: { type: 'header', label: '🔵 Control Points' },
            showPoints: {
                type: 'boolean',
                label: 'Show Points',
                default: true
            },
            pointColor: {
                type: 'color',
                label: 'Point Color',
                default: '#ffcc00'
            },
            pointRadius: {
                type: 'slider',
                label: 'Point Size',
                default: 10,
                min: 4,
                max: 30
            },
            showDirection: {
                type: 'boolean',
                label: 'Show Direction Arrows',
                default: true
            },
            showGizmoAlways: {
                type: 'boolean',
                label: 'Always Show Gizmos',
                default: true,
                hint: 'Show edit handles even when not selected'
            },

            // === OFFSCREEN RENDERING ===
            _header_offscreen: { type: 'header', label: '🖼️ Offscreen Rendering' },
            offscreenRender: {
                type: 'boolean',
                label: 'Offscreen Render',
                default: false,
                hint: 'Render path as cached image for better performance'
            }
        };
    }

    // ==================== LIFECYCLE METHODS ====================

    start() {
        // Find and register with game manager
        this._gameManager = TDGameManager.findManager();
        if (this._gameManager) {
            this._gameManager.registerPath(this);
        }

        // Handle different path modes
        if (this.pathMode === 'generated') {
            this.generatePath();
        } else if (this.pathMode === 'gizmo' && this.gizmoPoints.length === 0) {
            // Create a simple default path shape
            this.gizmoPoints = [
                { x: 100, y: 0 },
                { x: 200, y: 80 },
                { x: 300, y: 0 }
            ];
        }

        // Build the path
        this.rebuildPath();
    }

    /**
     * Generate a path based on generation settings
     */
    generatePath() {
        this.gizmoPoints = [];

        switch (this.generationMode) {
            case 'waypoints':
                this.generateWaypointPath();
                break;
            case 'random':
                this.generateRandomPath();
                break;
            case 'serpentine':
                this.generateSerpentinePath();
                break;
            default:
                this.generateWaypointPath();
        }

        // Apply noise if specified
        if (this.noiseAmount > 0) {
            this.applyNoiseToPath();
        }

        // Apply smoothing
        for (let i = 0; i < this.smoothIterations; i++) {
            this.smoothPath();
        }
    }

    /**
     * Generate path using waypoints with optional curves
     */
    generateWaypointPath() {
        const segments = this.generatedSegments;
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            let x = this.startX + dx * t;
            let y = this.startY + dy * t;

            // Add curves if enabled
            if (this.generateCurvy && i < segments) {
                const curveOffset = this.curviness * Math.sin(t * Math.PI * 2);
                // Perpendicular offset
                const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * curveOffset;
                const perpY = dx / Math.sqrt(dx * dx + dy * dy) * curveOffset;
                x += perpX * (Math.random() * 0.5 + 0.5);
                y += perpY * (Math.random() * 0.5 + 0.5);
            }

            this.gizmoPoints.push({ x, y });
        }
    }

    /**
     * Generate a random wandering path
     */
    generateRandomPath() {
        const segments = this.generatedSegments;
        let x = this.startX;
        let y = this.startY;
        const targetX = this.endX;
        const targetY = this.endY;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            // Blend between random movement and target direction
            const toTargetX = targetX - x;
            const toTargetY = targetY - y;
            const dist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

            const stepDist = dist / (segments - i + 1);
            const randomAngle = (Math.random() - 0.5) * Math.PI * (1 - t); // Less random near end

            const baseAngle = Math.atan2(toTargetY, toTargetX);
            const finalAngle = baseAngle + randomAngle;

            x += Math.cos(finalAngle) * stepDist;
            y += Math.sin(finalAngle) * stepDist;

            this.gizmoPoints.push({ x, y });
        }

        // Ensure we end at the target
        this.gizmoPoints[this.gizmoPoints.length - 1] = { x: targetX, y: targetY };
    }

    /**
     * Generate a serpentine (S-curve) path
     */
    generateSerpentinePath() {
        const segments = this.generatedSegments;
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        const pathLength = Math.sqrt(dx * dx + dy * dy);

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            let x = this.startX + dx * t;
            let y = this.startY + dy * t;

            // Add serpentine wave
            const waveAmplitude = this.curviness;
            const waveFreq = 2; // Number of complete waves
            const wave = Math.sin(t * Math.PI * waveFreq) * waveAmplitude;

            // Apply wave perpendicular to path direction
            const perpX = -dy / pathLength * wave;
            const perpY = dx / pathLength * wave;
            x += perpX;
            y += perpY;

            this.gizmoPoints.push({ x, y });
        }
    }

    /**
     * Apply noise to existing path points
     */
    applyNoiseToPath() {
        const noiseScale = this.noiseAmount;
        let phase = Math.random() * Math.PI * 2;

        for (let i = 0; i < this.gizmoPoints.length - 1; i++) { // Don't modify last point
            const point = this.gizmoPoints[i];
            phase += this.noiseFrequency;

            // Perlin-like noise approximation
            const noiseX = Math.sin(phase) * Math.cos(phase * 0.7) * noiseScale;
            const noiseY = Math.cos(phase * 1.3) * Math.sin(phase * 0.5) * noiseScale;

            point.x += noiseX;
            point.y += noiseY;
        }
    }

    /**
     * Smooth the path using Chaikin's algorithm
     */
    smoothPath() {
        if (this.gizmoPoints.length < 2) return;

        const smoothed = [];

        for (let i = 0; i < this.gizmoPoints.length - 1; i++) {
            const p0 = this.gizmoPoints[i];
            const p1 = this.gizmoPoints[i + 1];

            // Keep first point as-is
            if (i === 0) {
                smoothed.push({ ...p0 });
            }

            // Add two new points at 25% and 75% of segment
            smoothed.push({
                x: p0.x * 0.75 + p1.x * 0.25,
                y: p0.y * 0.75 + p1.y * 0.25
            });
            smoothed.push({
                x: p0.x * 0.25 + p1.x * 0.75,
                y: p0.y * 0.25 + p1.y * 0.75
            });
        }

        // Keep last point
        smoothed.push({ ...this.gizmoPoints[this.gizmoPoints.length - 1] });

        this.gizmoPoints = smoothed;
    }

    /**
     * Regenerate path (useful for editor button)
     */
    regenerate() {
        if (this.pathMode === 'generated') {
            this.generatePath();
            this.rebuildPath();
        }
        this._offscreenDirty = true;
    }

    /**
     * Rebuild the cached path from current configuration
     */
    rebuildPath() {
        const rawPoints = this.getRawPathPoints();

        if (rawPoints.length < 2) {
            this._cachedPath = rawPoints;
            this._pathLength = 0;
            this._segmentLengths = [];
        } else {
            if (this.useSpline && rawPoints.length >= 3) {
                this._cachedPath = this.generateSplinePath(rawPoints);
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
        }

        //console.log(`🛤️ Path built: ${this._cachedPath.length} points, ${Math.round(this._pathLength)}px length`);
        this._offscreenDirty = true;
    }

    /**
     * Get raw path points based on current mode
     */
    getRawPathPoints() {
        if (this.pathMode === 'children') {
            return this.getChildrenPathPoints();
        } else {
            // Both 'gizmo' and 'generated' use gizmoPoints
            return this.getGizmoPathPoints();
        }
    }

    /**
     * Get path points from children hierarchy
     * Returns points in WORLD coordinates
     * Iterates through children, then children of children, etc.
     */
    getChildrenPathPoints() {
        const points = [];

        // Start with this object's world position
        const worldPos = this.worldPosition;
        points.push({ x: worldPos.x, y: worldPos.y });

        // Recursively gather children positions (already in world coords)
        this.gatherChildrenPositions(this.gameObject, points);

        return points;
    }

    /**
     * Recursively gather child positions in order
     */
    gatherChildrenPositions(obj, points) {
        if (!obj || !obj.children) return;

        // Sort children by name to ensure consistent order (path_01, path_02, etc.)
        const sortedChildren = [...obj.children].sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, undefined, { numeric: true });
        });

        for (const child of sortedChildren) {
            // Add child position (world position)
            const worldPos = this.getWorldPosition(child);
            points.push({ x: worldPos.x, y: worldPos.y });

            // Recurse into child's children
            this.gatherChildrenPositions(child, points);
        }
    }

    /**
     * Get world position of a game object
     */
    getWorldPosition(obj) {
        if (!obj) return { x: 0, y: 0 };

        // If object has worldPosition property, use it
        if (obj.worldPosition) {
            return { x: obj.worldPosition.x, y: obj.worldPosition.y };
        }

        // Otherwise calculate from position
        return { x: obj.x || 0, y: obj.y || 0 };
    }

    /**
     * Get path points from gizmo array
     * Returns points in WORLD coordinates
     */
    getGizmoPathPoints() {
        // Get world position of this object
        const worldPos = this.worldPosition;
        const worldX = worldPos.x;
        const worldY = worldPos.y;

        // Start with this object's world position
        const points = [{ x: worldX, y: worldY }];

        // Add gizmo points (relative offsets added to world position)
        for (const point of this.gizmoPoints) {
            points.push({
                x: worldX + (point.x || 0),
                y: worldY + (point.y || 0)
            });
        }

        return points;
    }

    /**
     * Generate smooth spline path using Catmull-Rom interpolation
     */
    generateSplinePath(controlPoints) {
        if (controlPoints.length < 3) return controlPoints;

        const splinePath = [];
        const tension = this.splineTension;

        // Add first point
        splinePath.push({ ...controlPoints[0] });

        // For each segment
        for (let i = 0; i < controlPoints.length - 1; i++) {
            // Get 4 control points for Catmull-Rom
            const p0 = controlPoints[Math.max(0, i - 1)];
            const p1 = controlPoints[i];
            const p2 = controlPoints[Math.min(controlPoints.length - 1, i + 1)];
            const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];

            // Generate points along this segment
            for (let t = 1; t <= this.splineResolution; t++) {
                const tNorm = t / this.splineResolution;
                const point = this.catmullRom(p0, p1, p2, p3, tNorm, tension);
                splinePath.push(point);
            }
        }

        return splinePath;
    }

    /**
     * Catmull-Rom spline interpolation
     */
    catmullRom(p0, p1, p2, p3, t, tension = 0.5) {
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

    // ==================== PATH QUERY METHODS ====================

    /**
     * Get the complete path array
     */
    getPath() {
        if (!this._cachedPath) {
            this.rebuildPath();
        }
        return this._cachedPath;
    }

    /**
     * Get total path length in pixels
     */
    getPathLength() {
        return this._pathLength;
    }

    /**
     * Get number of path segments
     */
    getSegmentCount() {
        return this._cachedPath ? Math.max(0, this._cachedPath.length - 1) : 0;
    }

    /**
     * Get start point of path (in world coordinates)
     */
    getStartPoint() {
        const path = this.getPath();
        if (path.length > 0) {
            return { ...path[0] };
        }
        const worldPos = this.worldPosition;
        return { x: worldPos.x, y: worldPos.y };
    }

    /**
     * Get end point of path (in world coordinates)
     */
    getEndPoint() {
        const path = this.getPath();
        if (path.length > 0) {
            return { ...path[path.length - 1] };
        }
        const worldPos = this.worldPosition;
        return { x: worldPos.x, y: worldPos.y };
    }

    /**
     * Get position at a distance along the path (0 to pathLength)
     */
    getPositionAtDistance(distance) {
        const path = this.getPath();
        if (path.length < 2) {
            return path.length > 0 ? { ...path[0] } : { x: 0, y: 0 };
        }

        // Clamp distance
        distance = Math.max(0, Math.min(distance, this._pathLength));

        // Find which segment we're on
        let accumulated = 0;
        for (let i = 0; i < this._segmentLengths.length; i++) {
            const segLength = this._segmentLengths[i];

            if (accumulated + segLength >= distance) {
                // We're on this segment
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

        // At end of path
        return { ...path[path.length - 1] };
    }

    /**
     * Get position at a normalized progress (0 to 1)
     */
    getPositionAtProgress(progress) {
        progress = Math.max(0, Math.min(1, progress));
        return this.getPositionAtDistance(progress * this._pathLength);
    }

    /**
     * Get direction angle at a distance along the path (in radians)
     */
    getDirectionAtDistance(distance) {
        const path = this.getPath();
        if (path.length < 2) return 0;

        // Get position slightly ahead and behind
        const epsilon = 1;
        const p1 = this.getPositionAtDistance(Math.max(0, distance - epsilon));
        const p2 = this.getPositionAtDistance(Math.min(this._pathLength, distance + epsilon));

        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    /**
     * Add a gizmo point (for gizmo mode)
     */
    addGizmoPoint(x, y) {
        this.gizmoPoints.push({ x, y });
        this.rebuildPath();
    }

    /**
     * Remove a gizmo point by index
     */
    removeGizmoPoint(index) {
        if (index >= 0 && index < this.gizmoPoints.length) {
            this.gizmoPoints.splice(index, 1);
            this.rebuildPath();
        }
    }

    /**
     * Update a gizmo point position
     */
    updateGizmoPoint(index, x, y) {
        if (index >= 0 && index < this.gizmoPoints.length) {
            this.gizmoPoints[index] = { x, y };
            this.rebuildPath();
        }
    }

    // ==================== VISUALIZATION ====================

    draw(ctx) {
        if (!this.showPath) return;

        const path = this.getPath();
        if (path.length < 2) return;

        // Offscreen rendering
        if (this.offscreenRender) {
            this.drawOffscreen(ctx, path);
            return;
        }

        // Path points are in world coordinates, but draw() context is at object position
        // Convert to local coordinates for drawing (0,0 = object center)
        const worldPos = this.worldPosition;
        const offsetX = worldPos.x;
        const offsetY = worldPos.y;

        ctx.save();
        ctx.globalAlpha = this.pathOpacity;

        // Draw path based on style
        switch (this.pathStyle) {
            case 'grass':
                this.drawGrassPath(ctx, path, offsetX, offsetY);
                break;
            case 'stone':
                this.drawStonePath(ctx, path, offsetX, offsetY);
                break;
            case 'dashed':
                this.drawDashedPath(ctx, path, offsetX, offsetY);
                break;
            case 'dotted':
                this.drawDottedPath(ctx, path, offsetX, offsetY);
                break;
            default:
                this.drawSolidPath(ctx, path, offsetX, offsetY);
        }

        ctx.globalAlpha = 1;

        // Draw direction arrows
        if (this.showDirection) {
            this.drawDirectionArrows(ctx, path, offsetX, offsetY);
        }

        // Draw points
        if (this.showPoints) {
            this.drawPathPoints(ctx, path, offsetX, offsetY);
        }

        ctx.restore();
    }

    drawOffscreen(ctx, path) {
        // Bounding box in world coords
        let minX = path[0].x, maxX = path[0].x;
        let minY = path[0].y, maxY = path[0].y;
        for (let i = 1; i < path.length; i++) {
            if (path[i].x < minX) minX = path[i].x;
            if (path[i].x > maxX) maxX = path[i].x;
            if (path[i].y < minY) minY = path[i].y;
            if (path[i].y > maxY) maxY = path[i].y;
        }
    
        const padding = this.pathWidth + 20;
        minX -= padding; maxX += padding;
        minY -= padding; maxY += padding;
    
        const fullWidth  = Math.ceil(maxX - minX);
        const fullHeight = Math.ceil(maxY - minY);
        const TILE = 512;
    
        // Rebuild tiles only when dirty
        if (this._offscreenDirty || !this._offscreenTiles) {
            const cols = Math.ceil(fullWidth  / TILE);
            const rows = Math.ceil(fullHeight / TILE);
            this._offscreenTiles = [];
            this._offscreenBounds = { minX, minY, fullWidth, fullHeight, cols, rows };
    
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Tile pixel bounds within the full image
                    const tileLeft   = col * TILE;
                    const tileTop    = row * TILE;
                    const tileRight  = Math.min(tileLeft + TILE, fullWidth);
                    const tileBottom = Math.min(tileTop  + TILE, fullHeight);
                    const tileW      = tileRight  - tileLeft;
                    const tileH      = tileBottom - tileTop;
    
                    const canvas = document.createElement('canvas');
                    canvas.width  = tileW;
                    canvas.height = tileH;
                    const tCtx = canvas.getContext('2d');
    
                    // offsetX/Y: convert world coord → pixel in this tile
                    // world point p → tile pixel: (p.x - minX - tileLeft, p.y - minY - tileTop)
                    // draw helpers subtract offsetX/Y from world coords, so:
                    //   localX = worldX - offsetX  →  offsetX = worldX - localX = minX + tileLeft
                    const offsetX = minX + tileLeft;
                    const offsetY = minY + tileTop;
    
                    tCtx.save();
                    tCtx.globalAlpha = this.pathOpacity;
    
                    switch (this.pathStyle) {
                        case 'grass':  this.drawGrassPath (tCtx, path, offsetX, offsetY); break;
                        case 'stone':  this.drawStonePath (tCtx, path, offsetX, offsetY); break;
                        case 'dashed': this.drawDashedPath(tCtx, path, offsetX, offsetY); break;
                        case 'dotted': this.drawDottedPath(tCtx, path, offsetX, offsetY); break;
                        case 'sand':   this.drawSandPath  (tCtx, path, offsetX, offsetY); break;
                        case 'lava':   this.drawLavaPath  (tCtx, path, offsetX, offsetY); break;
                        case 'ice':    this.drawIcePath   (tCtx, path, offsetX, offsetY); break;
                        case 'dirt':   this.drawDirtPath  (tCtx, path, offsetX, offsetY); break;
                        default:       this.drawSolidPath (tCtx, path, offsetX, offsetY);
                    }
    
                    tCtx.globalAlpha = 1;
                    if (this.showDirection) this.drawDirectionArrows(tCtx, path, offsetX, offsetY);
                    if (this.showPoints)    this.drawPathPoints     (tCtx, path, offsetX, offsetY);
                    tCtx.restore();
    
                    this._offscreenTiles.push({ canvas, tileLeft, tileTop });
                }
            }
    
            this._offscreenDirty = false;
        }
    
        // Draw() context is offset to world coords via the engine's camera/transform.
        // draw() is called with ctx already translated so that (0,0) = object world position.
        // Our path points are absolute world coords, so subtract the object world position
        // to convert to the local draw space.
        const worldPos  = this.worldPosition;
    
        for (const tile of this._offscreenTiles) {
            // World position of this tile's top-left corner:
            const tileWorldX = minX + tile.tileLeft;
            const tileWorldY = minY + tile.tileTop;
            // Convert to draw-context local space:
            const drawX = tileWorldX - worldPos.x;  // Hmm - wait, see note below
            const drawY = tileWorldY - worldPos.y;
            ctx.drawImage(tile.canvas, drawX, drawY);
        }
    }

    drawSolidPath(ctx, path, offsetX, offsetY) {
        // Draw border/shadow first
        if (this.showPathBorder) {
            ctx.strokeStyle = this.pathBorderColor;
            ctx.lineWidth = this.pathWidth + 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
            }
            ctx.stroke();
        }

        // Main path with gradient
        const gradient = ctx.createLinearGradient(
            path[0].x - offsetX, path[0].y - offsetY,
            path[path.length - 1].x - offsetX, path[path.length - 1].y - offsetY
        );
        gradient.addColorStop(0, this.lightenColor(this.pathColor, 20));
        gradient.addColorStop(0.5, this.pathColor);
        gradient.addColorStop(1, this.darkenColor(this.pathColor, 10));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
        }
        ctx.stroke();

        // Add center line highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = this.pathWidth * 0.3;
        ctx.stroke();
    }

    drawDashedPath(ctx, path, offsetX, offsetY) {
        // Border
        if (this.showPathBorder) {
            ctx.strokeStyle = this.pathBorderColor;
            ctx.lineWidth = this.pathWidth + 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
            }
            ctx.stroke();
        }

        // Dashed main path
        ctx.strokeStyle = this.pathColor;
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = 'round';
        ctx.setLineDash([this.pathWidth * 1.5, this.pathWidth * 0.8]);

        ctx.beginPath();
        ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawDottedPath(ctx, path, offsetX, offsetY) {
        // Draw dots along path
        const dotSpacing = this.pathWidth * 1.5;
        let accumulated = 0;

        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;

                // Draw dot with gradient
                const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, this.pathWidth / 2);
                dotGrad.addColorStop(0, this.lightenColor(this.pathColor, 30));
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

    drawGrassPath(ctx, path, offsetX, offsetY) {
        this.drawSolidPath(ctx, path, offsetX, offsetY);
    
        const turfSpacing = 15;
        let accumulated = 0;
    
        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / segLen;
            const perpY = dx / segLen;
    
            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
    
                for (const side of [-1, 1]) {
                    const grassX = x + perpX * (this.pathWidth / 2 + 3) * side;
                    const grassY = y + perpY * (this.pathWidth / 2 + 3) * side;
    
                    // Integer hash seed from world position
                    const wx = Math.round(grassX + offsetX);
                    const wy = Math.round(grassY + offsetY);
                    const s = (wx * 73856093) ^ (wy * 19349663);
                    const r1 = (((s * 1664525 + 1013904223) >>> 0)) / 4294967295;
                    const r2 = ((((s ^ 0xDEADBEEF) * 22695477 + 1) >>> 0)) / 4294967295;
                    const r3 = ((((s * 1664525) ^ (s >>> 16)) >>> 0)) / 4294967295;
    
                    ctx.save();
                    ctx.translate(grassX, grassY);
                    ctx.rotate((r1 - 0.5) * 0.5);
                    ctx.fillStyle = `hsl(${110 + r2 * 25}, ${55 + r2 * 20}%, ${25 + r3 * 20}%)`;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-2, -8 - r3 * 5);
                    ctx.lineTo(0, -6);
                    ctx.lineTo(2, -8 - r3 * 5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
    
                accumulated += turfSpacing;
            }
            accumulated -= segLen;
        }
    }

    drawStonePath(ctx, path, offsetX, offsetY) {
        // Draw stone/cobblestone path
        if (this.showPathBorder) {
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = this.pathWidth + 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
            }
            ctx.stroke();
        }

        // Base stone color
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = this.pathWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
        }
        ctx.stroke();

        // Draw stone pattern
        const stoneSpacing = this.pathWidth * 0.8;
        let accumulated = 0;
        let stoneIndex = 0;

        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;

                // Draw cobblestone
                const stoneSize = this.pathWidth * 0.35 + Math.sin(stoneIndex * 1.5) * 3;
                const shade = 70 + Math.sin(stoneIndex * 2.3) * 15;

                ctx.fillStyle = `hsl(0, 0%, ${shade}%)`;
                ctx.beginPath();
                ctx.ellipse(x, y, stoneSize, stoneSize * 0.8, stoneIndex * 0.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#444444';
                ctx.lineWidth = 1;
                ctx.stroke();

                accumulated += stoneSpacing;
                stoneIndex++;
            }
            accumulated -= segLen;
        }
    }

    // Color helper functions
    lightenColor(color, percent) {
        if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }

    darkenColor(color, percent) {
        if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }

    drawPathPoints(ctx, path, offsetX = 0, offsetY = 0) {
        ctx.fillStyle = this.pointColor;

        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const localX = point.x - offsetX;
            const localY = point.y - offsetY;
            const isStart = i === 0;
            const isEnd = i === path.length - 1;

            // Use different colors for start/end
            if (isStart) {
                ctx.fillStyle = '#00ff00';
            } else if (isEnd) {
                ctx.fillStyle = '#ff0000';
            } else {
                ctx.fillStyle = this.pointColor;
            }

            ctx.beginPath();
            ctx.arc(localX, localY, isStart ? this.pointRadius + 2 : this.pointRadius, 0, Math.PI * 2);
            ctx.fill();

            // Label for start/end
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isStart) {
                ctx.fillText('S', localX, localY);
            } else if (isEnd) {
                ctx.fillText('E', localX, localY);
            }
        }
    }

    drawDirectionArrows(ctx, path, offsetX = 0, offsetY = 0) {
        if (path.length < 2) return;

        ctx.fillStyle = this.pathColor;

        // Draw arrows at regular intervals
        const arrowInterval = 100; // pixels
        let accumulated = 0;

        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            while (accumulated < segLen) {
                const t = accumulated / segLen;
                const x = p1.x + dx * t - offsetX;
                const y = p1.y + dy * t - offsetY;
                const angle = Math.atan2(dy, dx);

                this.drawArrow(ctx, x, y, angle);
                accumulated += arrowInterval;
            }

            accumulated -= segLen;
        }
    }

    drawArrow(ctx, x, y, angle) {
        const size = 10;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.5, -size * 0.5);
        ctx.lineTo(-size * 0.5, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    onDestroy() {
        // Unregister from game manager
        if (this._gameManager) {
            if (typeof this._gameManager.unregisterPath === 'function') {
                this._gameManager.unregisterPath(this);
            }
            this._gameManager = null;
        }
    
        // Release all offscreen tile canvases
        if (this._offscreenTiles) {
            for (const tile of this._offscreenTiles) {
                // Setting dimensions to 0 releases the GPU texture memory
                tile.canvas.width  = 0;
                tile.canvas.height = 0;
            }
            this._offscreenTiles = null;
        }
    
        // Release legacy single offscreen canvas if present
        if (this._offscreenCanvas) {
            this._offscreenCanvas.width  = 0;
            this._offscreenCanvas.height = 0;
            this._offscreenCanvas   = null;
            this._offscreenContext  = null;
        }
    
        // Clear bounds metadata
        this._offscreenBounds = null;
        this._offscreenDirty  = true;
    
        // Clear cached path data
        this._cachedPath      = null;
        this._segmentLengths  = [];
        this._pathLength      = 0;
    
        // Clear gizmo points
        this.gizmoPoints = [];
    
        //console.log('🛤️ TDPath destroyed and cleaned up');
    }

    // ==================== EDITOR GIZMO SUPPORT ====================

    /**
     * Get gizmo handles for level editor
     * Returns array of handle objects for manipulation
     * Note: All handle positions are in WORLD coordinates.
     * The path starts at the object's world position,
     * then continues through gizmoPoints (which are relative offsets from object position).
     */
    getEditorGizmoHandles() {
        if (this.pathMode !== 'gizmo') return [];

        // If gizmoPoints is empty and we're in editor mode, initialize with default points
        // This ensures the editor always has something to show/edit
        if (this.gizmoPoints.length === 0) {
            this.gizmoPoints = [
                { x: 100, y: 0 },
                { x: 200, y: 80 },
                { x: 300, y: 0 }
            ];
            this.rebuildPath();
        }

        const handles = [];

        // Get world position of this object
        const worldPos = this.worldPosition;
        const worldX = worldPos.x;
        const worldY = worldPos.y;

        // First handle is for the object's starting position (index -1, special case)
        // This is the actual start of the path in world space
        handles.push({
            id: 'gizmo_start',
            index: -1,
            x: worldX,
            y: worldY,
            radius: this.pointRadius + 2,
            color: '#00ff00',
            label: 'Start',
            onDrag: (newX, newY) => {
                // Moving the start point moves the entire object
                // newX, newY are in world space, convert to local if object has parent
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

        // Gizmo point handles - these are relative to object position
        for (let i = 0; i < this.gizmoPoints.length; i++) {
            const point = this.gizmoPoints[i];
            const isLast = i === this.gizmoPoints.length - 1;
            const pointIndex = i; // Capture index for closure
            handles.push({
                id: `gizmo_${i}`,
                index: i,
                x: worldX + point.x,
                y: worldY + point.y,
                radius: this.pointRadius,
                color: isLast ? '#ff0000' : this.pointColor,
                label: isLast ? 'End' : `P${pointIndex + 1}`,
                onDrag: (newX, newY) => {
                    // Get fresh world position at drag time (not captured at handle creation)
                    const currentWorldPos = this.worldPosition;
                    this.updateGizmoPoint(pointIndex, newX - currentWorldPos.x, newY - currentWorldPos.y);
                }
            });
        }

        return handles;
    }

    /**
     * Called when a new gizmo point should be added (e.g., Ctrl+Click in editor)
     */
    onEditorAddPoint(worldX, worldY) {
        const worldPos = this.worldPosition;
        this.addGizmoPoint(worldX - worldPos.x, worldY - worldPos.y);
    }

    /**
     * Called when a gizmo point should be removed (e.g., right-click in editor)
     */
    onEditorRemovePoint(handleId) {
        const index = parseInt(handleId.replace('gizmo_', ''));
        if (!isNaN(index)) {
            this.removeGizmoPoint(index);
        }
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDPath';

        // Path Mode
        json.pathMode = this.pathMode;

        // Spline Settings
        json.useSpline = this.useSpline;
        json.splineResolution = this.splineResolution;
        json.splineTension = this.splineTension;

        // Path Generation Settings
        json.generationMode = this.generationMode;
        json.generatedSegments = this.generatedSegments;
        json.noiseAmount = this.noiseAmount;
        json.noiseFrequency = this.noiseFrequency;
        json.smoothIterations = this.smoothIterations;

        // Waypoint Generation Settings
        json.startX = this.startX;
        json.startY = this.startY;
        json.endX = this.endX;
        json.endY = this.endY;
        json.generateCurvy = this.generateCurvy;
        json.curviness = this.curviness;

        // Gizmo Points
        json.gizmoPoints = JSON.parse(JSON.stringify(this.gizmoPoints));

        // Visual Settings
        json.showPath = this.showPath;
        json.pathColor = this.pathColor;
        json.pathBorderColor = this.pathBorderColor;
        json.pathWidth = this.pathWidth;
        json.pathStyle = this.pathStyle;
        json.showPathBorder = this.showPathBorder;
        json.pathOpacity = this.pathOpacity;
        json.showPoints = this.showPoints;
        json.pointColor = this.pointColor;
        json.pointRadius = this.pointRadius;
        json.showDirection = this.showDirection;
        json.showGizmoAlways = this.showGizmoAlways;

        // Offscreen Rendering
        json.offscreenRender = this.offscreenRender;

        return json;
    }

    static fromJSON(json) {
        const module = new TDPath();

        // Path Mode
        module.pathMode = json.pathMode ?? 'gizmo';

        // Spline Settings
        module.useSpline = json.useSpline ?? true;
        module.splineResolution = json.splineResolution ?? 20;
        module.splineTension = json.splineTension ?? 0.5;

        // Path Generation Settings
        module.generationMode = json.generationMode ?? 'waypoints';
        module.generatedSegments = json.generatedSegments ?? 5;
        module.noiseAmount = json.noiseAmount ?? 0;
        module.noiseFrequency = json.noiseFrequency ?? 0.5;
        module.smoothIterations = json.smoothIterations ?? 2;

        // Waypoint Generation Settings
        module.startX = json.startX ?? 0;
        module.startY = json.startY ?? 0;
        module.endX = json.endX ?? 400;
        module.endY = json.endY ?? 300;
        module.generateCurvy = json.generateCurvy ?? true;
        module.curviness = json.curviness ?? 50;

        // Gizmo Points
        module.gizmoPoints = json.gizmoPoints ? JSON.parse(JSON.stringify(json.gizmoPoints)) : [];

        // Visual Settings
        module.showPath = json.showPath ?? true;
        module.pathColor = json.pathColor ?? '#44ff88';
        module.pathBorderColor = json.pathBorderColor ?? '#228844';
        module.pathWidth = json.pathWidth ?? 40;
        module.pathStyle = json.pathStyle ?? 'solid';
        module.showPathBorder = json.showPathBorder ?? true;
        module.pathOpacity = json.pathOpacity ?? 0.8;
        module.showPoints = json.showPoints ?? true;
        module.pointColor = json.pointColor ?? '#ffcc00';
        module.pointRadius = json.pointRadius ?? 10;
        module.showDirection = json.showDirection ?? true;
        module.showGizmoAlways = json.showGizmoAlways ?? true;

        // Offscreen Rendering
        module.offscreenRender = json.offscreenRender ?? false;

        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }

    clone() {
        const cloned = new TDPath();

        // Path Mode
        cloned.pathMode = this.pathMode;

        // Spline Settings
        cloned.useSpline = this.useSpline;
        cloned.splineResolution = this.splineResolution;
        cloned.splineTension = this.splineTension;

        // Path Generation Settings
        cloned.generationMode = this.generationMode;
        cloned.generatedSegments = this.generatedSegments;
        cloned.noiseAmount = this.noiseAmount;
        cloned.noiseFrequency = this.noiseFrequency;
        cloned.smoothIterations = this.smoothIterations;

        // Waypoint Generation Settings
        cloned.startX = this.startX;
        cloned.startY = this.startY;
        cloned.endX = this.endX;
        cloned.endY = this.endY;
        cloned.generateCurvy = this.generateCurvy;
        cloned.curviness = this.curviness;

        // Gizmo Points
        cloned.gizmoPoints = JSON.parse(JSON.stringify(this.gizmoPoints));

        // Visual Settings
        cloned.showPath = this.showPath;
        cloned.pathColor = this.pathColor;
        cloned.pathBorderColor = this.pathBorderColor;
        cloned.pathWidth = this.pathWidth;
        cloned.pathStyle = this.pathStyle;
        cloned.showPathBorder = this.showPathBorder;
        cloned.pathOpacity = this.pathOpacity;
        cloned.showPoints = this.showPoints;
        cloned.pointColor = this.pointColor;
        cloned.pointRadius = this.pointRadius;
        cloned.showDirection = this.showDirection;
        cloned.showGizmoAlways = this.showGizmoAlways;

        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDPath = TDPath;
}

if (typeof Module !== 'undefined') {
    Module.register('TDPath', TDPath);
}
