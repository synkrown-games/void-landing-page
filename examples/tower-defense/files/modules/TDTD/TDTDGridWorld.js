/**
 * TDTDGridWorld Module
 * A 3D voxel-style grid world rendered using the TopDownThreeD fake 3D system.
 * Think GTA2-style top-down 3D world building with blocks, ramps, and flat surfaces.
 * Supports a block library, collision detection (including ramp height), and viewport culling.
 */

class TDTDGridWorld extends Module {
    constructor() {
        super();

        // ── Grid Dimensions ──
        this.gridWidth = 20;          // Number of cells along X axis
        this.gridHeight = 20;         // Number of cells along Y axis
        this.gridDepth = 5;           // Number of layers along Z axis
        this.cellSize = 32;           // Size of each cell in pixels (square)

        // ── Rendering ──
        this.renderFromDepth = 0;     // Lowest visible Z layer (inclusive)
        this.renderToDepth = -1;      // Highest visible Z layer (-1 = all up to gridDepth-1)
        this.showGridLines = true;    // Show grid overlay in editor
        this.gridLineColor = '#ffffff';
        this.gridLineAlpha = 0.15;
        this.alpha = 1.0;             // Global opacity

        // ── Camera / Z offset (editor visual) ──
        this.editorViewZ = 0;         // Current Z layer being viewed/edited in editor

        // ── Block library ──
        // Each entry defines a block type that can be placed in the grid.
        // Index 0 is always "empty/air".
        this.blockLibrary = [
            { name: 'Air',       color: '#00000000', imagePath: '', blockType: 'empty',     solid: false },
            { name: 'Invisible Block',       color: '#44444400', imagePath: '', blockType: 'empty',     solid: true },
            { name: 'Stone',     color: '#888888',   imagePath: '', blockType: 'block',     solid: true  },
            { name: 'Grass',     color: '#4CAF50',   imagePath: '', blockType: 'block',     solid: true  },
            { name: 'Dirt',      color: '#795548',   imagePath: '', blockType: 'block',     solid: true  },
            { name: 'Water',     color: '#2196F3',   imagePath: '', blockType: 'flat',      solid: false },
            { name: 'Ramp North',color: '#FFEB3B',   imagePath: '', blockType: 'rampNorth', solid: true  },
            { name: 'Ramp South',color: '#FFC107',   imagePath: '', blockType: 'rampSouth', solid: true  },
            { name: 'Ramp East', color: '#FF9800',   imagePath: '', blockType: 'rampEast',  solid: true  },
            { name: 'Ramp West', color: '#FF5722',   imagePath: '', blockType: 'rampWest',  solid: true  },
            { name: 'Half Ramp Bottom N', color: '#E6D430', imagePath: '', blockType: 'halfRampBottomNorth', solid: true },
            { name: 'Half Ramp Bottom S', color: '#D4A800', imagePath: '', blockType: 'halfRampBottomSouth', solid: true },
            { name: 'Half Ramp Bottom E', color: '#D48500', imagePath: '', blockType: 'halfRampBottomEast',  solid: true },
            { name: 'Half Ramp Bottom W', color: '#D45A00', imagePath: '', blockType: 'halfRampBottomWest',  solid: true },
            { name: 'Half Ramp Top N',    color: '#FFF176', imagePath: '', blockType: 'halfRampTopNorth',    solid: true },
            { name: 'Half Ramp Top S',    color: '#FFD54F', imagePath: '', blockType: 'halfRampTopSouth',    solid: true },
            { name: 'Half Ramp Top E',    color: '#FFB74D', imagePath: '', blockType: 'halfRampTopEast',     solid: true },
            { name: 'Half Ramp Top W',    color: '#FF8A65', imagePath: '', blockType: 'halfRampTopWest',     solid: true }
        ];

        // ── Grid data ──
        // 3D array [z][y][x] storing block library indices (0 = air)
        this.cells = [];
        this._initCells();

        // ── Shadow ──
        this.castShadows = false;
        this.shadowAlpha = 0.25;

        // ── Internal caches ──
        this._textureCache = {};       // imagePath → HTMLImageElement
        this._dirtyChunks = true;      // Whether we need to rebuild visible data
        this._visibleCells = [];       // Cached list of cells to draw
        this._lastViewport = null;

        // ── Editor state (not serialized) ──
        this._editorMode = 'none';     // 'none' | 'paint' | 'erase'
        this._editorCursorX = 0;
        this._editorCursorY = 0;
        this._editorCursorZ = 0;
        this._selectedBlockIndex = 1;  // Currently selected block in library
    }

    // ==================== MODULE METADATA ====================
    static namespace = 'TDTD,World,3D';
    static is2D = true;

    static getIcon() { return '🏗️'; }
    static getDescription() {
        return 'A 3D voxel grid world using the TopDownThreeD system. Build GTA2-style top-down 3D environments with blocks, ramps, and textured surfaces.';
    }

    // ==================== EDITABLE PROPERTIES ====================

    getPropertyMetadata() {
        return [
            // === GRID DIMENSIONS ===
            { type: 'groupStart', label: '📐 Grid Dimensions' },
            { key: 'gridWidth',  type: 'number', label: 'Width (X)',  default: 20, min: 1, max: 256,
              hint: 'Number of cells along the X axis' },
            { key: 'gridHeight', type: 'number', label: 'Height (Y)', default: 20, min: 1, max: 256,
              hint: 'Number of cells along the Y axis' },
            { key: 'gridDepth',  type: 'number', label: 'Depth (Z)',  default: 5,  min: 1, max: 64,
              hint: 'Number of vertical layers (Z axis)' },
            { key: 'cellSize',   type: 'number', label: 'Cell Size',  default: 32, min: 4, max: 256,
              hint: 'Size of each cell in pixels (square)' },
            {
                type: 'button',
                label: 'Resize Grid',
                buttonText: '🔄 Apply Resize',
                buttonStyle: 'primary',
                tooltip: 'Resize the grid. Existing blocks are preserved where possible.',
                onClick: (module, editor) => {
                    module.resizeGrid(module.gridWidth, module.gridHeight, module.gridDepth);
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification(`🏗️ Grid resized to ${module.gridWidth}×${module.gridHeight}×${module.gridDepth}`);
                    }
                }
            },
            { type: 'groupEnd' },

            // === RENDERING ===
            { type: 'groupStart', label: '🎨 Rendering' },
            { key: 'alpha', type: 'slider', label: 'Opacity', default: 1.0, min: 0, max: 1, step: 0.01 },
            { key: 'showGridLines', type: 'boolean', label: 'Show Grid Lines', default: true,
              hint: 'Display grid overlay in the editor' },
            { key: 'gridLineColor', type: 'color', label: 'Grid Line Color', default: '#ffffff',
              showIf: { showGridLines: true } },
            { key: 'gridLineAlpha', type: 'slider', label: 'Grid Line Alpha', default: 0.15, min: 0, max: 1, step: 0.01,
              showIf: { showGridLines: true } },
            { key: 'renderFromDepth', type: 'number', label: 'Render From Z', default: 0, min: 0, max: 63,
              hint: 'Lowest Z layer to render (inclusive)' },
            { key: 'renderToDepth', type: 'number', label: 'Render To Z', default: -1, min: -1, max: 63,
              hint: 'Highest Z layer to render (-1 = all)' },
            { type: 'groupEnd' },

            // === SHADOW ===
            { type: 'groupStart', label: '🌑 Shadow' },
            { key: 'castShadows', type: 'boolean', label: 'Cast Shadows', default: false },
            { key: 'shadowAlpha', type: 'slider', label: 'Shadow Opacity', default: 0.25, min: 0, max: 1, step: 0.01,
              showIf: { castShadows: true } },
            { type: 'groupEnd' },

            // === BLOCK LIBRARY ===
            { type: 'groupStart', label: '🧱 Block Library' },
            {
                key: 'blockLibrary',
                label: 'Blocks',
                type: 'arrayGroup',
                itemLabel: 'Block',
                minItems: 1,
                itemProperties: [
                    { key: 'name',      label: 'Name',       type: 'text',    default: 'Block' },
                    { key: 'color',     label: 'Color',      type: 'color',   default: '#888888' },
                    { key: 'imagePath', label: 'Texture',    type: 'image',   default: '' },
                    { key: 'blockType', label: 'Block Type', type: 'select',  default: 'block',
                      options: {
                          'empty':     '🚫 Empty (Air)',
                          'block':     '📦 Solid Block',
                          'flat':      '⬜ Flat Rectangle',
                          'rampNorth': '⬆️ Ramp North (slope toward -Y)',
                          'rampSouth': '⬇️ Ramp South (slope toward +Y)',
                          'rampEast':  '➡️ Ramp East (slope toward +X)',
                          'rampWest':  '⬅️ Ramp West (slope toward -X)',
                          'halfRampBottomNorth': '⬆️ Half Ramp Bottom North (0→½)',
                          'halfRampBottomSouth': '⬇️ Half Ramp Bottom South (0→½)',
                          'halfRampBottomEast':  '➡️ Half Ramp Bottom East (0→½)',
                          'halfRampBottomWest':  '⬅️ Half Ramp Bottom West (0→½)',
                          'halfRampTopNorth':    '⬆️ Half Ramp Top North (½→1)',
                          'halfRampTopSouth':    '⬇️ Half Ramp Top South (½→1)',
                          'halfRampTopEast':     '➡️ Half Ramp Top East (½→1)',
                          'halfRampTopWest':     '⬅️ Half Ramp Top West (½→1)',
                          'halfBlock': '▄ Half Block (half height)',
                          'slab':      '▬ Slab (quarter height)'
                      }
                    },
                    { key: 'solid',     label: 'Solid',      type: 'boolean', default: true,
                      hint: 'Can entities collide with this block?' },
                    { key: 'topColor',  label: 'Top Color',  type: 'color',   default: '',
                      hint: 'Leave empty for auto-calculated lighter top' },
                    { key: 'sideColor', label: 'Side Color', type: 'color',   default: '',
                      hint: 'Leave empty for auto-calculated darker side' }
                ]
            },
            { type: 'groupEnd' },

            // === EDITOR ===
            { type: 'groupStart', label: '🔧 Editor' },
            {
                type: 'button',
                label: 'Open Grid Builder',
                buttonText: '🏗️ Open Grid Builder',
                buttonStyle: 'primary',
                tooltip: 'Open the grid world builder tool in the scene editor',
                onClick: (module, editor) => {
                    module._openGridBuilder();
                }
            },
            {
                type: 'button',
                label: 'Clear All Cells',
                buttonText: '🗑️ Clear Grid',
                buttonStyle: 'danger',
                tooltip: 'Remove all blocks from the grid',
                onClick: (module, editor) => {
                    if (confirm('Clear all blocks? This cannot be undone.')) {
                        module._initCells();
                        module._dirtyChunks = true;
                        if (window.app && window.app.showNotification) {
                            window.app.showNotification('🗑️ Grid cleared');
                        }
                        if (editor) editor.refreshModuleProperties();
                    }
                }
            },
            {
                type: 'button',
                label: 'Fill Ground Layer',
                buttonText: '🟫 Fill Ground (Z=0)',
                buttonStyle: 'success',
                tooltip: 'Fill the bottom layer with the currently selected block type (index 1)',
                onClick: (module, editor) => {
                    module.fillLayer(0, 2);
                    module._dirtyChunks = true;
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('🟫 Ground layer filled');
                    }
                }
            },
            { type: 'groupEnd' }
        ];
    }

    // ==================== CELL MANAGEMENT ====================

    /**
     * Initialize the cells 3D array with all zeros (air)
     * @private
     */
    _initCells() {
        this.cells = [];
        for (let z = 0; z < this.gridDepth; z++) {
            const layer = [];
            for (let y = 0; y < this.gridHeight; y++) {
                const row = new Uint16Array(this.gridWidth); // 0 = air
                layer.push(row);
            }
            this.cells.push(layer);
        }
    }

    /**
     * Resize the grid preserving existing cell data where possible
     * @param {number} newWidth
     * @param {number} newHeight
     * @param {number} newDepth
     */
    resizeGrid(newWidth, newHeight, newDepth) {
        const oldCells = this.cells;
        const oldW = this.gridWidth;
        const oldH = this.gridHeight;
        const oldD = this.gridDepth;

        this.gridWidth = newWidth;
        this.gridHeight = newHeight;
        this.gridDepth = newDepth;
        this._initCells();

        // Copy old data
        const copyW = Math.min(oldW, newWidth);
        const copyH = Math.min(oldH, newHeight);
        const copyD = Math.min(oldD, newDepth);
        for (let z = 0; z < copyD; z++) {
            for (let y = 0; y < copyH; y++) {
                for (let x = 0; x < copyW; x++) {
                    this.cells[z][y][x] = oldCells[z][y][x];
                }
            }
        }
        this._dirtyChunks = true;
    }

    /**
     * Get the block index at a cell position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {number} z - Grid Z (layer)
     * @returns {number} Block library index (0 = air)
     */
    getCell(x, y, z) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight || z < 0 || z >= this.gridDepth) return 0;
        return this.cells[z][y][x];
    }

    /**
     * Set the block at a cell position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {number} z - Grid Z (layer)
     * @param {number} blockIndex - Block library index (0 = air)
     */
    setCell(x, y, z, blockIndex) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight || z < 0 || z >= this.gridDepth) return;
        this.cells[z][y][x] = blockIndex;
        this._dirtyChunks = true;
    }

    /**
     * Fill an entire Z layer with a block index
     * @param {number} z - Layer
     * @param {number} blockIndex
     */
    fillLayer(z, blockIndex) {
        if (z < 0 || z >= this.gridDepth) return;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.cells[z][y][x] = blockIndex;
            }
        }
        this._dirtyChunks = true;
    }

    /**
     * Fill a rectangular region with a block index
     * @param {number} x1 @param {number} y1 @param {number} z1
     * @param {number} x2 @param {number} y2 @param {number} z2
     * @param {number} blockIndex
     */
    fillRegion(x1, y1, z1, x2, y2, z2, blockIndex) {
        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(this.gridWidth - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(this.gridHeight - 1, Math.max(y1, y2));
        const minZ = Math.max(0, Math.min(z1, z2));
        const maxZ = Math.min(this.gridDepth - 1, Math.max(z1, z2));

        for (let z = minZ; z <= maxZ; z++) {
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    this.cells[z][y][x] = blockIndex;
                }
            }
        }
        this._dirtyChunks = true;
    }

    // ==================== COORDINATE CONVERSION ====================

    /**
     * Convert grid coordinates to world position (top-left of cell at ground level of that Z layer)
     * @param {number} gx - Grid X
     * @param {number} gy - Grid Y
     * @param {number} gz - Grid Z
     * @returns {{x: number, y: number, z: number}} World position
     */
    gridToWorld(gx, gy, gz) {
        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        return {
            x: worldPos.x + gx * this.cellSize,
            y: worldPos.y + gy * this.cellSize,
            z: gz * this.cellSize
        };
    }

    /**
     * Convert world coordinates to grid coordinates
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} wz - World Z (optional, for getting Z layer)
     * @returns {{x: number, y: number, z: number}} Grid position (floored)
     */
    worldToGrid(wx, wy, wz = 0) {
        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        return {
            x: Math.floor((wx - worldPos.x) / this.cellSize),
            y: Math.floor((wy - worldPos.y) / this.cellSize),
            z: Math.floor(wz / this.cellSize)
        };
    }

    // ==================== COLLISION DETECTION API ====================

    /**
     * Check if a world position collides with a solid block
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} wz - World Z (height)
     * @returns {boolean}
     */
    isSolidAt(wx, wy, wz) {
        const g = this.worldToGrid(wx, wy, wz);
        const blockIdx = this.getCell(g.x, g.y, g.z);
        if (blockIdx === 0) return false;
        const block = this.blockLibrary[blockIdx];
        if (!block) return false;
        return block.solid === true;
    }

    /**
     * Get the block info at a world position
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} wz - World Z
     * @returns {{blockIndex: number, block: object|null, gridX: number, gridY: number, gridZ: number}|null}
     */
    getBlockAt(wx, wy, wz) {
        const g = this.worldToGrid(wx, wy, wz);
        const blockIdx = this.getCell(g.x, g.y, g.z);
        return {
            blockIndex: blockIdx,
            block: blockIdx > 0 ? (this.blockLibrary[blockIdx] || null) : null,
            gridX: g.x,
            gridY: g.y,
            gridZ: g.z
        };
    }

    /**
     * Get the effective ground height at a world XY position.
     * Scans from top Z layer down to find the first solid block, accounting for ramp slopes.
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @returns {number} World Z of the top surface at that position (-1 if no ground)
     */
    getGroundHeight(wx, wy) {
        const g = this.worldToGrid(wx, wy);
        if (g.x < 0 || g.x >= this.gridWidth || g.y < 0 || g.y >= this.gridHeight) return -1;

        for (let z = this.gridDepth - 1; z >= 0; z--) {
            const blockIdx = this.cells[z][g.y][g.x];
            if (blockIdx === 0) continue;
            const block = this.blockLibrary[blockIdx];
            if (!block || block.blockType === 'empty') continue;

            const baseZ = z * this.cellSize;

            if (block.blockType === 'block') {
                return baseZ + this.cellSize; // Top of the full block
            }
            if (block.blockType === 'halfBlock') {
                return baseZ + this.cellSize * 0.5;
            }
            if (block.blockType === 'slab') {
                return baseZ + this.cellSize * 0.25;
            }
            if (block.blockType === 'flat') {
                return baseZ + 1; // Essentially ground level + tiny offset
            }

            // Ramp handling - interpolate height based on position within cell
            const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
            const localX = (wx - worldPos.x) / this.cellSize - g.x; // 0..1 within cell
            const localY = (wy - worldPos.y) / this.cellSize - g.y; // 0..1 within cell

            if (block.blockType === 'rampNorth') {
                // Slopes up toward -Y (north): at localY=1 → baseZ, at localY=0 → baseZ + cellSize
                return baseZ + (1 - localY) * this.cellSize;
            }
            if (block.blockType === 'rampSouth') {
                // Slopes up toward +Y (south): at localY=0 → baseZ, at localY=1 → baseZ + cellSize
                return baseZ + localY * this.cellSize;
            }
            if (block.blockType === 'rampEast') {
                // Slopes up toward +X (east): at localX=0 → baseZ, at localX=1 → baseZ + cellSize
                return baseZ + localX * this.cellSize;
            }
            if (block.blockType === 'rampWest') {
                // Slopes up toward -X (west): at localX=1 → baseZ, at localX=0 → baseZ + cellSize
                return baseZ + (1 - localX) * this.cellSize;
            }

            // Half ramp bottom: ramps from 0 to half height
            if (block.blockType === 'halfRampBottomNorth') {
                return baseZ + (1 - localY) * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampBottomSouth') {
                return baseZ + localY * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampBottomEast') {
                return baseZ + localX * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampBottomWest') {
                return baseZ + (1 - localX) * this.cellSize * 0.5;
            }

            // Half ramp top: ramps from half height to full height
            if (block.blockType === 'halfRampTopNorth') {
                return baseZ + this.cellSize * 0.5 + (1 - localY) * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampTopSouth') {
                return baseZ + this.cellSize * 0.5 + localY * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampTopEast') {
                return baseZ + this.cellSize * 0.5 + localX * this.cellSize * 0.5;
            }
            if (block.blockType === 'halfRampTopWest') {
                return baseZ + this.cellSize * 0.5 + (1 - localX) * this.cellSize * 0.5;
            }

            // Fallback for unknown types
            return baseZ + this.cellSize;
        }
        return -1; // No ground found
    }

    /**
     * Check collision between an axis-aligned bounding box and the grid world.
     * Returns detailed collision info including which faces are blocked.
     * @param {number} wx - Center world X
     * @param {number} wy - Center world Y
     * @param {number} wz - Base world Z (feet)
     * @param {number} halfW - Half width
     * @param {number} halfH - Half height (Y axis in top-down)
     * @param {number} height - Height of the entity (Z axis)
     * @returns {{hit: boolean, solidCells: Array, groundHeight: number, onGround: boolean, blockedLeft: boolean, blockedRight: boolean, blockedUp: boolean, blockedDown: boolean, blockedAbove: boolean}}
     */
    checkCollisionAABB(wx, wy, wz, halfW, halfH, height) {
        const result = {
            hit: false,
            solidCells: [],
            groundHeight: -1,
            onGround: false,
            blockedLeft: false,
            blockedRight: false,
            blockedUp: false,    // -Y direction (north)
            blockedDown: false,  // +Y direction (south)
            blockedAbove: false  // above head
        };

        // Get corners of the bounding box in grid coordinates
        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };

        const minGX = Math.floor((wx - halfW - worldPos.x) / this.cellSize);
        const maxGX = Math.floor((wx + halfW - worldPos.x) / this.cellSize);
        const minGY = Math.floor((wy - halfH - worldPos.y) / this.cellSize);
        const maxGY = Math.floor((wy + halfH - worldPos.y) / this.cellSize);
        const minGZ = Math.floor(wz / this.cellSize);
        const maxGZ = Math.floor((wz + height) / this.cellSize);

        // Calculate ground height at center
        result.groundHeight = this.getGroundHeight(wx, wy);
        result.onGround = Math.abs(wz - result.groundHeight) < 2;

        // Check each cell the AABB overlaps
        for (let gz = Math.max(0, minGZ); gz <= Math.min(this.gridDepth - 1, maxGZ); gz++) {
            for (let gy = Math.max(0, minGY); gy <= Math.min(this.gridHeight - 1, maxGY); gy++) {
                for (let gx = Math.max(0, minGX); gx <= Math.min(this.gridWidth - 1, maxGX); gx++) {
                    const blockIdx = this.cells[gz][gy][gx];
                    if (blockIdx === 0) continue;
                    const block = this.blockLibrary[blockIdx];
                    if (!block || !block.solid) continue;

                    // Ramps and half-ramps are walkable from the slope side, so check height
                    if (block.blockType.startsWith('ramp') || block.blockType.startsWith('halfRamp')) {
                        const cellWorldX = worldPos.x + (gx + 0.5) * this.cellSize;
                        const cellWorldY = worldPos.y + (gy + 0.5) * this.cellSize;
                        const rampHeight = this.getGroundHeight(cellWorldX, cellWorldY);
                        if (wz >= rampHeight - 2) continue; // Entity is above the ramp surface
                    }

                    result.hit = true;
                    result.solidCells.push({ x: gx, y: gy, z: gz, blockIndex: blockIdx });

                    // Determine which direction is blocked
                    const cellCenterGX = gx + 0.5;
                    const cellCenterGY = gy + 0.5;
                    const entityCenterGX = (wx - worldPos.x) / this.cellSize;
                    const entityCenterGY = (wy - worldPos.y) / this.cellSize;

                    if (cellCenterGX < entityCenterGX) result.blockedLeft = true;
                    if (cellCenterGX > entityCenterGX) result.blockedRight = true;
                    if (cellCenterGY < entityCenterGY) result.blockedUp = true;
                    if (cellCenterGY > entityCenterGY) result.blockedDown = true;
                    if (gz > Math.floor(wz / this.cellSize)) result.blockedAbove = true;
                }
            }
        }

        return result;
    }

    /**
     * Simple point collision check against solid blocks
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} wz - World Z
     * @returns {boolean}
     */
    isPointBlocked(wx, wy, wz) {
        return this.isSolidAt(wx, wy, wz);
    }

    /**
     * Raycast through the grid world.
     * Steps through cells using DDA algorithm.
     * @param {number} startX - World start X
     * @param {number} startY - World start Y
     * @param {number} startZ - World start Z
     * @param {number} dirX - Direction X (normalized)
     * @param {number} dirY - Direction Y (normalized)
     * @param {number} dirZ - Direction Z (normalized)
     * @param {number} maxDist - Maximum distance
     * @returns {{hit: boolean, x: number, y: number, z: number, gridX: number, gridY: number, gridZ: number, distance: number, normal: {x: number, y: number, z: number}, blockIndex: number}|null}
     */
    raycast(startX, startY, startZ, dirX, dirY, dirZ, maxDist = 500) {
        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        const cs = this.cellSize;

        // Convert start to grid-local coordinates
        let rx = (startX - worldPos.x) / cs;
        let ry = (startY - worldPos.y) / cs;
        let rz = startZ / cs;

        // Normalize direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        if (len === 0) return null;
        const ndx = dirX / len;
        const ndy = dirY / len;
        const ndz = dirZ / len;

        // DDA setup
        let gx = Math.floor(rx);
        let gy = Math.floor(ry);
        let gz = Math.floor(rz);

        const stepX = ndx > 0 ? 1 : -1;
        const stepY = ndy > 0 ? 1 : -1;
        const stepZ = ndz > 0 ? 1 : -1;

        const tDeltaX = ndx !== 0 ? Math.abs(1 / ndx) : Infinity;
        const tDeltaY = ndy !== 0 ? Math.abs(1 / ndy) : Infinity;
        const tDeltaZ = ndz !== 0 ? Math.abs(1 / ndz) : Infinity;

        let tMaxX = ndx !== 0 ? ((ndx > 0 ? (gx + 1 - rx) : (rx - gx)) * tDeltaX) : Infinity;
        let tMaxY = ndy !== 0 ? ((ndy > 0 ? (gy + 1 - ry) : (ry - gy)) * tDeltaY) : Infinity;
        let tMaxZ = ndz !== 0 ? ((ndz > 0 ? (gz + 1 - rz) : (rz - gz)) * tDeltaZ) : Infinity;

        const maxSteps = Math.ceil(maxDist / cs) * 3;
        let dist = 0;
        let normalX = 0, normalY = 0, normalZ = 0;

        for (let i = 0; i < maxSteps; i++) {
            // Check current cell
            if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight && gz >= 0 && gz < this.gridDepth) {
                const blockIdx = this.cells[gz][gy][gx];
                if (blockIdx > 0) {
                    const block = this.blockLibrary[blockIdx];
                    if (block && block.solid) {
                        const hitX = worldPos.x + (rx + ndx * dist) * cs;
                        const hitY = worldPos.y + (ry + ndy * dist) * cs;
                        const hitZ = (rz + ndz * dist) * cs;
                        return {
                            hit: true,
                            x: hitX, y: hitY, z: hitZ,
                            gridX: gx, gridY: gy, gridZ: gz,
                            distance: dist * cs,
                            normal: { x: normalX, y: normalY, z: normalZ },
                            blockIndex: blockIdx
                        };
                    }
                }
            }

            // Step to next cell
            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    dist = tMaxX;
                    gx += stepX;
                    tMaxX += tDeltaX;
                    normalX = -stepX; normalY = 0; normalZ = 0;
                } else {
                    dist = tMaxZ;
                    gz += stepZ;
                    tMaxZ += tDeltaZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            } else {
                if (tMaxY < tMaxZ) {
                    dist = tMaxY;
                    gy += stepY;
                    tMaxY += tDeltaY;
                    normalX = 0; normalY = -stepY; normalZ = 0;
                } else {
                    dist = tMaxZ;
                    gz += stepZ;
                    tMaxZ += tDeltaZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            }

            if (dist * cs > maxDist) break;
        }

        return null;
    }

    // ==================== LIFECYCLE METHODS ====================

    start() {
        // Pre-load textures for all blocks in library
        this._preloadTextures();
    }

    loop(deltaTime) {
        // Nothing needed per frame; rendering is in draw()
    }

    draw(ctx) {
        const engine = this.gameObject._engine;
        if (!engine) return;

        const tdtd = engine.TDTD || engine.getTopDownThreeD();
        if (!tdtd) return;

        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = this.alpha;

        this.drawUntethered(ctx);

        // Get viewport for culling
        const vp = engine.viewport;
        const zoom = vp.zoom || 1;
        const vpLeft = vp.x;
        const vpTop = vp.y;
        const vpRight = vp.x + (vp.width || engine.renderWidth) / zoom;
        const vpBottom = vp.y + (vp.height || engine.renderHeight) / zoom;

        const worldPos = this.gameObject.getWorldPosition();
        const cs = this.cellSize;

        // Determine visible grid range
        const minGX = Math.max(0, Math.floor((vpLeft - worldPos.x) / cs) - 1);
        const maxGX = Math.min(this.gridWidth - 1, Math.ceil((vpRight - worldPos.x) / cs) + 1);
        const minGY = Math.max(0, Math.floor((vpTop - worldPos.y) / cs) - 1);
        const maxGY = Math.min(this.gridHeight - 1, Math.ceil((vpBottom - worldPos.y) / cs) + 1);

        // Determine Z range
        const zFrom = Math.max(0, this.renderFromDepth);
        const zTo = this.renderToDepth < 0 ? this.gridDepth - 1 : Math.min(this.gridDepth - 1, this.renderToDepth);

        // Batch render all visible cells through the TDTD depth-sorting system.
        // If no batch is active yet, start one; otherwise join the existing batch.
        // The engine flushes all TDTD draws together at end-of-frame for proper
        // depth sorting across grid cells, sprites, and creatures.
        if (!tdtd._batchMode) {
            tdtd.beginBatch();
        }
        tdtd._needsFlush = true;

        for (let gz = zFrom; gz <= zTo; gz++) {
            for (let gy = minGY; gy <= maxGY; gy++) {
                for (let gx = minGX; gx <= maxGX; gx++) {
                    const blockIdx = this.cells[gz][gy][gx];
                    if (blockIdx === 0) continue;

                    const block = this.blockLibrary[blockIdx];
                    if (!block || block.blockType === 'empty') continue;

                    const wx = worldPos.x + gx * cs;
                    const wy = worldPos.y + gy * cs;
                    const wz = gz * cs; // Positive Z = elevated toward camera in TDTD

                    const color = block.color || '#888888';
                    const options = {};
                    if (block.topColor) options.topColor = block.topColor;
                    if (block.sideColor) options.sideColor = block.sideColor;

                    // Load texture if available
                    const texture = block.imagePath ? this._getTexture(block.imagePath) : null;
                    if (texture) {
                        options.texture = texture;
                        tdtd.textureQuality = 2;
                    }

                    // ── Neighbor face culling ──
                    // A face is skipped when BOTH the current block and its neighbor
                    // fully cover the shared cell boundary.  This prevents redundant
                    // coplanar faces from z-fighting while preserving partial faces
                    // (e.g. a wedge's triangular side next to a full block).
                    const myHeights = this._getBlockCornerHeights(block.blockType);
                    if (myHeights) {
                        const cs_ = this.cellSize;
                        // right (+X):  current corners br,fr  ↔  neighbor's left bl,fl
                        if (myHeights.br >= cs_ && myHeights.fr >= cs_
                            && this._hasFullCoverageOnSide(this.getCell(gx + 1, gy, gz), 'left'))
                            options._skipRight = true;
                        // left (-X):  current bl,fl  ↔  neighbor's right br,fr
                        if (myHeights.bl >= cs_ && myHeights.fl >= cs_
                            && this._hasFullCoverageOnSide(this.getCell(gx - 1, gy, gz), 'right'))
                            options._skipLeft = true;
                        // front (+Y):  current fl,fr  ↔  neighbor's back bl,br
                        if (myHeights.fl >= cs_ && myHeights.fr >= cs_
                            && this._hasFullCoverageOnSide(this.getCell(gx, gy + 1, gz), 'back'))
                            options._skipFront = true;
                        // back (-Y):  current bl,br  ↔  neighbor's front fl,fr
                        if (myHeights.bl >= cs_ && myHeights.br >= cs_
                            && this._hasFullCoverageOnSide(this.getCell(gx, gy - 1, gz), 'front'))
                            options._skipBack = true;
                        // top (+Z):  need all 4 corners  ↔  neighbor below's bottom (always full)
                        if (myHeights.bl >= cs_ && myHeights.br >= cs_ && myHeights.fr >= cs_ && myHeights.fl >= cs_
                            && this._hasFullCoverageOnSide(this.getCell(gx, gy, gz + 1), 'bottom'))
                            options._skipTop = true;
                        // bottom (-Z):  always full  ↔  neighbor above's top (need all 4)
                        if (this._hasFullCoverageOnSide(this.getCell(gx, gy, gz - 1), 'top'))
                            options._skipBottom = true;
                    }

                    // Shadow for elevated blocks
                    if (this.castShadows && gz > 0) {
                        tdtd.drawShadow(wx + cs / 2, wy + cs / 2, wz, cs / 2, {
                            alpha: this.shadowAlpha,
                            stretch: 1.2
                        }, ctx);
                    }

                    // Calculate center of cell for drawing
                    const cx = wx + cs / 2;
                    const cy = wy + cs / 2;

                    switch (block.blockType) {
                        case 'block':
                            tdtd.drawBox(cx, cy, wz, cs, cs, cs, color, options, ctx);
                            break;

                        case 'halfBlock':
                            tdtd.drawBox(cx, cy, wz, cs, cs, cs * 0.5, color, options, ctx);
                            break;

                        case 'slab':
                            tdtd.drawBox(cx, cy, wz, cs, cs, cs * 0.25, color, options, ctx);
                            break;

                        case 'flat':
                            tdtd.drawRect(cx, cy, wz, cs, cs, color, 0, ctx);
                            break;

                        case 'rampNorth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs, br: cs, fr: 0, fl: 0 }, color, options, ctx);
                            break;
                        case 'rampSouth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: 0, br: 0, fr: cs, fl: cs }, color, options, ctx);
                            break;
                        case 'rampEast':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: 0, br: cs, fr: cs, fl: 0 }, color, options, ctx);
                            break;
                        case 'rampWest':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs, br: 0, fr: 0, fl: cs }, color, options, ctx);
                            break;

                        case 'halfRampBottomNorth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs * 0.5, br: cs * 0.5, fr: 0, fl: 0 }, color, options, ctx);
                            break;
                        case 'halfRampBottomSouth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: 0, br: 0, fr: cs * 0.5, fl: cs * 0.5 }, color, options, ctx);
                            break;
                        case 'halfRampBottomEast':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: 0, br: cs * 0.5, fr: cs * 0.5, fl: 0 }, color, options, ctx);
                            break;
                        case 'halfRampBottomWest':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs * 0.5, br: 0, fr: 0, fl: cs * 0.5 }, color, options, ctx);
                            break;

                        case 'halfRampTopNorth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs, br: cs, fr: cs * 0.5, fl: cs * 0.5 }, color, options, ctx);
                            break;
                        case 'halfRampTopSouth':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs * 0.5, br: cs * 0.5, fr: cs, fl: cs }, color, options, ctx);
                            break;
                        case 'halfRampTopEast':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs * 0.5, br: cs, fr: cs, fl: cs * 0.5 }, color, options, ctx);
                            break;
                        case 'halfRampTopWest':
                            tdtd.drawWedge(cx, cy, wz, cs, cs, { bl: cs, br: cs * 0.5, fr: cs * 0.5, fl: cs }, color, options, ctx);
                            break;
                    }
                }
            }
        }

        // Do NOT endBatch here — the engine will flush the shared batch
        // after all game objects have drawn, so billboards/sprites depth-sort
        // correctly against grid cells.

        this.drawTethered(ctx);
        ctx.globalAlpha = prevAlpha;
    }

    // ==================== TEXTURE MANAGEMENT ====================

    /** @private */
    _preloadTextures() {
        const engine = this.gameObject?._engine;
        if (!engine || !engine.assets) return;
        for (const block of this.blockLibrary) {
            if (block.imagePath) {
                this._getTexture(block.imagePath);
            }
        }
    }

    /** @private */
    _getTexture(imagePath) {
        if (!imagePath) return null;
        if (this._textureCache[imagePath]) return this._textureCache[imagePath];

        const engine = this.gameObject?._engine;
        if (!engine || !engine.assets) return null;

        const fileName = imagePath.split('/').pop().split('\\').pop();
        const img = engine.assets.getImage(fileName);
        if (img) {
            this._textureCache[imagePath] = img;
        }
        return img || null;
    }

    /**
     * Check if a block index represents a full opaque block (for neighbor face culling).
     * Only full-height blocks qualify — ramps, slabs, half-blocks leave partial faces exposed.
     * @param {number} blockIdx - Block library index
     * @returns {boolean}
     * @private
     */
    _isFullOpaqueBlock(blockIdx) {
        if (blockIdx <= 0) return false;
        const block = this.blockLibrary[blockIdx];
        if (!block) return false;
        return block.blockType === 'block';
    }

    /**
     * Get the corner top-heights { bl, br, fr, fl } for any solid block type.
     * Full blocks have all corners = cellSize, half-blocks = cellSize * 0.5, etc.
     * @param {string} blockType
     * @returns {{bl:number,br:number,fr:number,fl:number}|null}
     * @private
     */
    _getBlockCornerHeights(blockType) {
        const cs = this.cellSize;
        switch (blockType) {
            case 'block':     return { bl: cs, br: cs, fr: cs, fl: cs };
            case 'empty':     return { bl: cs, br: cs, fr: cs, fl: cs };
            case 'halfBlock': return { bl: cs * 0.5, br: cs * 0.5, fr: cs * 0.5, fl: cs * 0.5 };
            case 'slab':      return { bl: cs * 0.25, br: cs * 0.25, fr: cs * 0.25, fl: cs * 0.25 };
            case 'flat':      return null; // drawn as rect, not a volume

            case 'rampNorth': return { bl: cs, br: cs, fr: 0, fl: 0 };
            case 'rampSouth': return { bl: 0, br: 0, fr: cs, fl: cs };
            case 'rampEast':  return { bl: 0, br: cs, fr: cs, fl: 0 };
            case 'rampWest':  return { bl: cs, br: 0, fr: 0, fl: cs };

            case 'halfRampBottomNorth': return { bl: cs * 0.5, br: cs * 0.5, fr: 0, fl: 0 };
            case 'halfRampBottomSouth': return { bl: 0, br: 0, fr: cs * 0.5, fl: cs * 0.5 };
            case 'halfRampBottomEast':  return { bl: 0, br: cs * 0.5, fr: cs * 0.5, fl: 0 };
            case 'halfRampBottomWest':  return { bl: cs * 0.5, br: 0, fr: 0, fl: cs * 0.5 };

            case 'halfRampTopNorth': return { bl: cs, br: cs, fr: cs * 0.5, fl: cs * 0.5 };
            case 'halfRampTopSouth': return { bl: cs * 0.5, br: cs * 0.5, fr: cs, fl: cs };
            case 'halfRampTopEast':  return { bl: cs * 0.5, br: cs, fr: cs, fl: cs * 0.5 };
            case 'halfRampTopWest':  return { bl: cs, br: cs * 0.5, fr: cs * 0.5, fl: cs };
            default: return null;
        }
    }

    /**
     * Check whether a block in the library fully covers a given cell face.
     * A face is "fully covered" when the block reaches the full cell height on
     * both corners of that side (so an adjacent flush face is completely hidden).
     *
     * For 'top' / 'bottom' the check requires all four corners at full cs.
     * @param {number} blockIdx - Block library index
     * @param {string} side - 'right' | 'left' | 'front' | 'back' | 'top' | 'bottom'
     * @returns {boolean}
     * @private
     */
    _hasFullCoverageOnSide(blockIdx, side) {
        if (blockIdx <= 0) return false;
        const block = this.blockLibrary[blockIdx];
        if (!block || !block.solid) return false;
        const h = this._getBlockCornerHeights(block.blockType);
        if (!h) return false;
        const cs = this.cellSize;
        switch (side) {
            // The two corners touching each face must BOTH equal the cell size
            case 'back':   return h.bl >= cs && h.br >= cs;    // -Y face corners: back-left, back-right
            case 'front':  return h.fl >= cs && h.fr >= cs;    // +Y face corners: front-left, front-right
            case 'left':   return h.bl >= cs && h.fl >= cs;    // -X face corners: back-left, front-left
            case 'right':  return h.br >= cs && h.fr >= cs;    // +X face corners: back-right, front-right
            case 'top':    return h.bl >= cs && h.br >= cs && h.fr >= cs && h.fl >= cs;
            case 'bottom': return true; // All solid blocks have a full bottom plane
        }
        return false;
    }

    // ==================== EDITOR INTEGRATION ====================

    /**
     * Open the grid builder in the scene editor
     */
    _openGridBuilder() {
        if (window.app && window.app.sceneEditor) {
            const sceneEditor = window.app.sceneEditor;
            if (sceneEditor.levelEditor) {
                sceneEditor.levelEditor.setGridWorldPaintMode(this, 'paint');
                sceneEditor.switchRightTab('gridWorld');
            }
        }
    }

    /**
     * Check if a world position is within the grid bounds
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @returns {boolean}
     */
    isWithinBounds(wx, wy) {
        const g = this.worldToGrid(wx, wy);
        return g.x >= 0 && g.x < this.gridWidth && g.y >= 0 && g.y < this.gridHeight;
    }

    /**
     * Handle a grid paint action at a world position (called by level editor)
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {string} mode - 'paint' or 'erase'
     * @param {number} blockIndex - Block library index to paint with
     * @param {number} z - Z layer
     * @returns {boolean} True if a cell was modified
     */
    handleGridPaint(wx, wy, mode, blockIndex, z) {
        const g = this.worldToGrid(wx, wy);
        if (g.x < 0 || g.x >= this.gridWidth || g.y < 0 || g.y >= this.gridHeight) return false;
        if (z < 0 || z >= this.gridDepth) return false;

        const currentBlock = this.cells[z][g.y][g.x];

        if (mode === 'paint') {
            if (currentBlock === blockIndex) return false;
            this.cells[z][g.y][g.x] = blockIndex;
            this._dirtyChunks = true;
            return true;
        } else if (mode === 'erase') {
            if (currentBlock === 0) return false;
            this.cells[z][g.y][g.x] = 0;
            this._dirtyChunks = true;
            return true;
        }
        return false;
    }

    /**
     * Get editor gizmo handles for the grid bounds
     */
    getEditorGizmoHandles() {
        if (!this.gameObject) return [];
        const worldPos = this.gameObject.getWorldPosition();
        const w = this.gridWidth * this.cellSize;
        const h = this.gridHeight * this.cellSize;

        return [
            {
                x: worldPos.x, y: worldPos.y,
                radius: 6, color: '#00ff00', label: 'Grid Origin',
                showGizmoAlways: true
            },
            {
                x: worldPos.x + w, y: worldPos.y + h,
                radius: 6, color: '#ff6600', label: 'Grid End',
                showGizmoAlways: true
            }
        ];
    }

    // ==================== PUBLIC UTILITY API ====================

    /**
     * Get the number of non-air blocks in the grid
     * @returns {number}
     */
    getBlockCount() {
        let count = 0;
        for (let z = 0; z < this.gridDepth; z++) {
            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    if (this.cells[z][y][x] > 0) count++;
                }
            }
        }
        return count;
    }

    /**
     * Get block library entry by index
     * @param {number} index
     * @returns {object|null}
     */
    getBlock(index) {
        return this.blockLibrary[index] || null;
    }

    /**
     * Find a block in the library by name
     * @param {string} name
     * @returns {number} Block index (-1 if not found)
     */
    findBlockByName(name) {
        return this.blockLibrary.findIndex(b => b.name === name);
    }

    /**
     * Move an entity smoothly with grid collision.
     * Handles ramp climbing and blocking.
     * @param {number} wx - Current world X
     * @param {number} wy - Current world Y
     * @param {number} wz - Current world Z (base/feet)
     * @param {number} dx - Desired movement X
     * @param {number} dy - Desired movement Y
     * @param {number} halfW - Half width of entity
     * @param {number} halfH - Half height of entity (Y axis)
     * @param {number} entityHeight - Height of entity (Z axis)
     * @param {number} maxStepHeight - Max height entity can step up (for ramps/stairs)
     * @returns {{x: number, y: number, z: number, grounded: boolean}}
     */
    moveAndSlide(wx, wy, wz, dx, dy, halfW, halfH, entityHeight, maxStepHeight = 8) {
        let newX = wx + dx;
        let newY = wy + dy;
        let newZ = wz;

        // Check X movement
        const collX = this.checkCollisionAABB(newX, wy, wz, halfW, halfH, entityHeight);
        if (collX.hit) {
            // Try stepping up
            const stepGroundH = this.getGroundHeight(newX, wy);
            if (stepGroundH >= 0 && stepGroundH - wz <= maxStepHeight && stepGroundH - wz >= 0) {
                newZ = stepGroundH;
            } else {
                newX = wx; // Block X movement
            }
        }

        // Check Y movement
        const collY = this.checkCollisionAABB(newX, newY, newZ, halfW, halfH, entityHeight);
        if (collY.hit) {
            const stepGroundH = this.getGroundHeight(newX, newY);
            if (stepGroundH >= 0 && stepGroundH - newZ <= maxStepHeight && stepGroundH - newZ >= 0) {
                newZ = stepGroundH;
            } else {
                newY = wy; // Block Y movement
            }
        }

        // Snap to ground if close
        const groundH = this.getGroundHeight(newX, newY);
        const grounded = groundH >= 0 && Math.abs(newZ - groundH) <= maxStepHeight;
        if (grounded && groundH > newZ) {
            newZ = groundH;
        }

        return { x: newX, y: newY, z: newZ, grounded };
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON();
        json.type = 'TDTDGridWorld';

        json.gridWidth = this.gridWidth;
        json.gridHeight = this.gridHeight;
        json.gridDepth = this.gridDepth;
        json.cellSize = this.cellSize;

        json.renderFromDepth = this.renderFromDepth;
        json.renderToDepth = this.renderToDepth;
        json.showGridLines = this.showGridLines;
        json.gridLineColor = this.gridLineColor;
        json.gridLineAlpha = this.gridLineAlpha;
        json.alpha = this.alpha;

        json.castShadows = this.castShadows;
        json.shadowAlpha = this.shadowAlpha;

        // Serialize block library
        json.blockLibrary = this.blockLibrary.map(b => ({ ...b }));

        // Serialize cells as a compact format: array of layers, each layer is a flat array
        // Use actual array dimensions to avoid crashes if gridWidth/Height/Depth were edited without Apply Resize
        json.cells = [];
        const actualDepth = this.cells.length;
        for (let z = 0; z < this.gridDepth; z++) {
            const layerData = [];
            const layer = z < actualDepth ? this.cells[z] : null;
            const actualHeight = layer ? layer.length : 0;
            for (let y = 0; y < this.gridHeight; y++) {
                const row = (layer && y < actualHeight) ? layer[y] : null;
                const actualWidth = row ? row.length : 0;
                for (let x = 0; x < this.gridWidth; x++) {
                    layerData.push(x < actualWidth ? row[x] : 0);
                }
            }
            json.cells.push(layerData);
        }

        return json;
    }

    static fromJSON(json) {
        const module = new TDTDGridWorld();
        module.enabled = json.enabled !== undefined ? json.enabled : true;

        module.gridWidth = json.gridWidth ?? 20;
        module.gridHeight = json.gridHeight ?? 20;
        module.gridDepth = json.gridDepth ?? 5;
        module.cellSize = json.cellSize ?? 32;

        module.renderFromDepth = json.renderFromDepth ?? 0;
        module.renderToDepth = json.renderToDepth ?? -1;
        module.showGridLines = json.showGridLines !== undefined ? json.showGridLines : true;
        module.gridLineColor = json.gridLineColor || '#ffffff';
        module.gridLineAlpha = json.gridLineAlpha ?? 0.15;
        module.alpha = json.alpha ?? 1.0;

        module.castShadows = json.castShadows || false;
        module.shadowAlpha = json.shadowAlpha ?? 0.25;

        // Deserialize block library
        if (json.blockLibrary && Array.isArray(json.blockLibrary)) {
            module.blockLibrary = json.blockLibrary.map(b => ({ ...b }));
        }

        // Deserialize cells
        module._initCells();
        if (json.cells && Array.isArray(json.cells)) {
            for (let z = 0; z < Math.min(json.cells.length, module.gridDepth); z++) {
                const layerData = json.cells[z];
                if (!layerData) continue;
                let i = 0;
                for (let y = 0; y < module.gridHeight; y++) {
                    for (let x = 0; x < module.gridWidth; x++) {
                        if (i < layerData.length) {
                            module.cells[z][y][x] = layerData[i];
                        }
                        i++;
                    }
                }
            }
        }

        return module;
    }

    clone() {
        const cloned = new TDTDGridWorld();
        cloned.enabled = this.enabled;

        cloned.gridWidth = this.gridWidth;
        cloned.gridHeight = this.gridHeight;
        cloned.gridDepth = this.gridDepth;
        cloned.cellSize = this.cellSize;

        cloned.renderFromDepth = this.renderFromDepth;
        cloned.renderToDepth = this.renderToDepth;
        cloned.showGridLines = this.showGridLines;
        cloned.gridLineColor = this.gridLineColor;
        cloned.gridLineAlpha = this.gridLineAlpha;
        cloned.alpha = this.alpha;

        cloned.castShadows = this.castShadows;
        cloned.shadowAlpha = this.shadowAlpha;

        cloned.blockLibrary = this.blockLibrary.map(b => ({ ...b }));

        // Deep copy cells
        cloned._initCells();
        for (let z = 0; z < this.gridDepth; z++) {
            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    cloned.cells[z][y][x] = this.cells[z][y][x];
                }
            }
        }

        return cloned;
    }
}

// Register module globally
window.TDTDGridWorld = TDTDGridWorld;
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('TDTDGridWorld', TDTDGridWorld);
}
