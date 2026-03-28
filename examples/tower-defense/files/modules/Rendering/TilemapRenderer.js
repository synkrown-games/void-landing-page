/**
 * TilemapRenderer Module
 * Renders a 2D tilemap using a sprite sheet and allows live tile editing in the scene editor.
 * 
 * Features:
 * - Configurable tile sprite sheet with columns/rows
 * - Map Data: stores which tile from the tileset is at each position
 * - Live tile painting in scene editor via module buttons
 * - Solid/collision data per tile
 * - Collision API: point, rect, and raycast queries
 * - Editor gizmo handles for tilemap bounds
 */

class TilemapRenderer extends Module {
    
    constructor() {
        super();
        
        // === TILESET CONFIGURATION ===
        this.tilesetImage = '';          // Path to the tileset sprite sheet image
        this.tilesetMode = 'tileSize';   // 'tileSize' (specify pixel size) or 'gridSize' (specify columns/rows)
        this.tileSize = 16;              // Tile size in pixels (when mode = 'tileSize')
        this.gridColumns = 8;            // Number of columns in tileset (when mode = 'gridSize')
        this.gridRows = 8;               // Number of rows in tileset (when mode = 'gridSize')
        
        // === TILEMAP CONFIGURATION ===
        this.mapWidth = 10;              // Width of the tilemap in tiles
        this.mapHeight = 10;             // Height of the tilemap in tiles
        this.mapTileSize = 0;            // Size to render tiles at on map (0 = same as source tile size)
        
        // === MAP DATA ===
        // Each cell stores: { sheetX, sheetY } or null for empty
        // Stored as flat array: index = y * mapWidth + x
        this.mapData = [];
        
        // === SOLID DATA ===
        // Separate array for solid tiles (true/false)
        this.solidData = [];
        
        // === RENDERING OPTIONS ===
        this.useBackgroundLayer = false; // Draw to engine's background layer (behind all objects)
        this.pixelPerfect = true;        // Snap positions/sizes to whole pixels to prevent seams
        this.offsetX = 0;                // X offset for rendering
        this.offsetY = 0;                // Y offset for rendering
        this.alpha = 1.0;                // Opacity
        this.smoothing = false;          // Image smoothing (false for pixel art)
        this.renderMode = 'viewport';    // 'viewport' (cull to camera), 'offscreen' (pre-render), 'full' (draw all)
        
        // === EDITOR STATE (not serialized) ===
        this._editorMode = 'none';       // 'none', 'paint', 'erase', 'solid', 'solidErase'
        this._selectedSheetX = 0;        // Selected tile X in tileset
        this._selectedSheetY = 0;        // Selected tile Y in tileset
        this._tileSelectorWindow = null; // Reference to tile selector window
        this._cachedImage = null;
        this._cachedImagePath = '';
        
        // === OFFSCREEN CANVAS CACHE ===
        this._offscreenCanvas = null;
        this._offscreenDirty = true;     // Needs re-render
        this._offscreenTileSize = 0;     // Tile size when cached
        
        // === CHUNKED OFFSCREEN CACHE (for large maps) ===
        this._chunks = [];               // Array of chunk canvases
        this._chunkSize = 512;           // Max chunk size in pixels
        this._chunksPerRow = 0;          // Number of chunks horizontally
        this._chunksPerCol = 0;          // Number of chunks vertically
        this._chunksDirty = true;        // Chunks need rebuilding
        
        // === IMAGE LOADING STATE (prevents per-frame Image creation) ===
        this._imageLoading = false;      // True while an Image is being loaded asynchronously
        this._imageLoadingPath = '';     // The path being loaded
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering';
    static is2D = true;  // Canvas2D only
    
    static getIcon() {
        return '🗺️';
    }
    
    static getDescription() {
        return 'Tilemap renderer with live tile painting and collision support. Select tiles from tileset and paint onto map.';
    }
    
    // ==================== PROPERTY METADATA ====================
    
    getPropertyMetadata() {
        // Calculate tileset info for display
        const info = this._getTilesetInfo();
        const tilesetStatus = info.valid 
            ? `✅ ${info.columns}×${info.rows} tiles (${info.tileSize}×${info.tileSize}px each)`
            : '⚠️ Set a tileset image';
        
        return [
            // === TILESET IMAGE ===
            { type: 'header', label: '🖼️ Tileset Image' },
            { key: 'tilesetImage', type: 'image', label: 'Tileset', default: '' },
            { type: 'hint', label: tilesetStatus },
            
            // === TILESET DETECTION MODE ===
            { type: 'groupStart', label: '📐 Tileset Layout' },
            { 
                key: 'tilesetMode', 
                type: 'select', 
                label: 'Detection Mode', 
                default: 'tileSize',
                options: {
                    'tileSize': '🔲 Specify Tile Size (px)',
                    'gridSize': '⊞ Specify Grid Size (cols×rows)'
                }
            },
            { type: 'hint', label: 'Choose how to define the tileset grid' },
            
            // Show tile size when mode = 'tileSize'
            { 
                key: 'tileSize', 
                type: 'number', 
                label: 'Tile Size (px)', 
                default: 16, 
                min: 1, 
                max: 512,
                showIf: { tilesetMode: 'tileSize' }
            },
            
            // Show grid columns/rows when mode = 'gridSize'
            { 
                key: 'gridColumns', 
                type: 'number', 
                label: 'Columns', 
                default: 8, 
                min: 1, 
                max: 256,
                showIf: { tilesetMode: 'gridSize' }
            },
            { 
                key: 'gridRows', 
                type: 'number', 
                label: 'Rows', 
                default: 8, 
                min: 1, 
                max: 256,
                showIf: { tilesetMode: 'gridSize' }
            },
            { type: 'groupEnd' },
            
            // === MAP SIZE ===
            { type: 'header', label: '🗺️ Map Configuration' },
            { type: 'groupStart', label: '📏 Map Dimensions' },
            { key: 'mapWidth', type: 'number', label: 'Width (tiles)', default: 10, min: 1, max: 256 },
            { key: 'mapHeight', type: 'number', label: 'Height (tiles)', default: 10, min: 1, max: 256 },
            { key: 'mapTileSize', type: 'number', label: 'Render Size (px)', default: 0, min: 0, max: 512, hint: '0 = same as source tile size' },
            { type: 'groupEnd' },
            
            // === TILE PAINTING ===
            { type: 'header', label: '🖌️ Tile Painting' },
            { type: 'hint', label: 'Select a tile from the tileset, then paint onto the map' },
            {
                type: 'button',
                buttonText: '🔲 Select Tile',
                buttonStyle: 'primary',
                tooltip: 'Open tileset to select a tile to paint',
                onClick: function(module, editor) {
                    module.openTileSelector(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🖌️ Paint',
                buttonStyle: 'primary',
                tooltip: 'Enter tile painting mode',
                onClick: function(module, editor) {
                    module.enterTilePaintMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🗑️ Erase',
                buttonStyle: 'danger',
                tooltip: 'Enter tile erase mode',
                onClick: function(module, editor) {
                    module.enterTileEraseMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🧹 Clear Map',
                buttonStyle: 'danger',
                tooltip: 'Clear all tiles from the map',
                onClick: function(module, editor) {
                    if (confirm('Clear all tiles from this tilemap?')) {
                        module.clearMap();
                        if (editor && editor.markDirty) editor.markDirty();
                    }
                }
            },
            
            // === COLLISION ===
            { type: 'groupStart', label: '🧱 Collision (Solid Tiles)' },
            { type: 'hint', label: 'Mark tiles as solid for collision. Red overlay when editing.' },
            {
                type: 'button',
                buttonText: '🧱 Paint Solid',
                buttonStyle: 'primary',
                tooltip: 'Mark tiles as solid',
                onClick: function(module, editor) {
                    module.enterSolidPaintMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '💨 Remove Solid',
                buttonStyle: 'danger',
                tooltip: 'Remove solid from tiles',
                onClick: function(module, editor) {
                    module.enterSolidEraseMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '⚡ Auto Solid',
                buttonStyle: 'success',
                tooltip: 'Make all non-empty tiles solid',
                onClick: function(module, editor) {
                    module.autoSolid();
                    if (editor && editor.markDirty) editor.markDirty();
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('⚡ Auto solid applied!');
                    }
                }
            },
            {
                type: 'button',
                buttonText: '🧹 Clear Solid',
                buttonStyle: 'danger',
                tooltip: 'Remove solid from all tiles',
                onClick: function(module, editor) {
                    if (confirm('Remove solid from all tiles?')) {
                        module.clearAllSolid();
                        if (editor && editor.markDirty) editor.markDirty();
                    }
                }
            },
            { type: 'groupEnd' },
            
            // === RENDERING OPTIONS ===
            { type: 'groupStart', label: '🎨 Rendering Options' },
            { 
                key: 'useBackgroundLayer', 
                type: 'boolean', 
                label: '🎨 Use Background Layer', 
                default: false,
                hint: 'Draw to dedicated background layer (behind all objects). Useful for terrain.'
            },
            { 
                key: 'pixelPerfect', 
                type: 'boolean', 
                label: '🔲 Pixel Perfect', 
                default: true,
                hint: 'Snap tile positions to whole pixels to prevent seams (especially with zoom).'
            },
            { 
                key: 'renderMode', 
                type: 'select', 
                label: 'Render Mode', 
                default: 'viewport',
                options: {
                    'viewport': '📷 Viewport Culling (large maps)',
                    'offscreen': '🖼️ Offscreen Canvas (small maps)',
                    'full': '🗺️ Full Render (all tiles)'
                }
            },
            { type: 'hint', label: 'Viewport: only draws visible tiles. Offscreen: pre-renders to canvas (max ~4096px).' },
            { key: 'offsetX', type: 'number', label: 'Offset X', default: 0, min: -10000, max: 10000 },
            { key: 'offsetY', type: 'number', label: 'Offset Y', default: 0, min: -10000, max: 10000 },
            { key: 'alpha', type: 'slider', label: 'Opacity', default: 1, min: 0, max: 1, step: 0.01 },
            { key: 'smoothing', type: 'boolean', label: 'Smoothing', default: false },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        // Initialize map data if empty
        if (this.mapData.length === 0) {
            this.initializeMapData();
        }
        // Initialize solid data if empty
        if (this.solidData.length === 0) {
            this.initializeSolidData();
        }
        // Pre-render chunks for offscreen mode ONLY if not in editor mode
        // In editor mode, defer chunk building to draw() when actually needed
        // This prevents freeze when opening large tilemaps in the scene editor
        if (this.renderMode === 'offscreen' && !this.gameObject.isEditing) {
            this._buildChunks();
        }
    }
    
    loop(deltaTime) {
        // Tilemap is static, but check if image path changed (invalidate cache)
        if (this._cachedImagePath && this._cachedImagePath !== this.tilesetImage) {
            this._cachedImage = null;
            this._cachedImagePath = '';
            this._imageLoading = false;
            this._imageLoadingPath = '';
            this._offscreenDirty = true;
            this._chunksDirty = true;
        }
    }
    
    /**
     * Cleanup when module/gameObject is destroyed
     * Prevents memory leaks from offscreen canvases
     */
    onDestroy() {
        // Close tile selector window if open
        if (this._tileSelectorWindow) {
            try {
                this._tileSelectorWindow.close();
            } catch (e) { /* already closed */ }
            this._tileSelectorWindow = null;
        }
        
        // Clear offscreen canvas
        if (this._offscreenCanvas) {
            // Clear the canvas context to release memory
            const ctx = this._offscreenCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this._offscreenCanvas.width, this._offscreenCanvas.height);
            this._offscreenCanvas.width = 0;
            this._offscreenCanvas.height = 0;
            this._offscreenCanvas = null;
        }
        
        // Clear all chunk canvases
        if (this._chunks && this._chunks.length > 0) {
            for (const chunk of this._chunks) {
                if (chunk) {
                    const ctx = chunk.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, chunk.width, chunk.height);
                    chunk.width = 0;
                    chunk.height = 0;
                }
            }
            this._chunks = [];
        }
        
        // Clear cached image reference
        this._cachedImage = null;
        this._cachedImagePath = '';
        this._imageLoading = false;
        this._imageLoadingPath = '';
        
        // Clear map data references
        this.mapData = [];
        this.solidData = [];
    }
    
    /**
     * Call this after bulk tile changes to rebuild offscreen cache/chunks.
     * For offscreen render mode, this pre-renders the tilemap into chunks.
     */
    updateTilemap() {
        this._offscreenDirty = true;
        this._chunksDirty = true;
        if (this.renderMode === 'offscreen') {
            this._buildChunks();
        }
    }
    
    // ==================== TILESET INFO ====================
    
    /**
     * Get computed tileset info based on current mode and image
     * @returns {object} { valid, tileSize, columns, rows, imageWidth, imageHeight }
     */
    _getTilesetInfo() {
        const image = this.getTilesetImage();
        if (!image || !image.naturalWidth || !image.naturalHeight) {
            return { valid: false, tileSize: this.tileSize, columns: 0, rows: 0, imageWidth: 0, imageHeight: 0 };
        }
        
        const imgW = image.naturalWidth;
        const imgH = image.naturalHeight;
        
        let tileSize, columns, rows;
        
        if (this.tilesetMode === 'tileSize') {
            // User specified tile size -> compute columns/rows from image
            tileSize = this.tileSize || 16;
            columns = Math.floor(imgW / tileSize);
            rows = Math.floor(imgH / tileSize);
        } else {
            // User specified grid size -> compute tile size from image
            columns = this.gridColumns || 8;
            rows = this.gridRows || 8;
            // Use the smaller dimension to ensure square tiles
            const computedW = Math.floor(imgW / columns);
            const computedH = Math.floor(imgH / rows);
            tileSize = Math.min(computedW, computedH);
        }
        
        return { 
            valid: columns > 0 && rows > 0 && tileSize > 0,
            tileSize, 
            columns, 
            rows, 
            imageWidth: imgW, 
            imageHeight: imgH 
        };
    }
    
    /**
     * Get effective tile size (computed from mode)
     */
    getTileSize() {
        const info = this._getTilesetInfo();
        return info.tileSize || this.tileSize || 16;
    }
    
    /**
     * Get effective number of columns in tileset
     */
    getColumns() {
        const info = this._getTilesetInfo();
        return info.columns || 8;
    }
    
    /**
     * Get effective number of rows in tileset
     */
    getRows() {
        const info = this._getTilesetInfo();
        return info.rows || 8;
    }
    
    /**
     * Get the size to render tiles at on the map
     * Returns mapTileSize if set, otherwise falls back to source tile size
     */
    getMapTileSize() {
        if (this.mapTileSize && this.mapTileSize > 0) {
            return this.mapTileSize;
        }
        return this.getTileSize();
    }
    
    /**
     * Draw the tilemap. 
     * The engine already applies the game object's world transform before calling draw(),
     * so we draw in object-space (0,0 = object origin). Offset shifts the tilemap within that space.
     */
    draw(ctx) {
        // If using background layer, drawing was done via _drawToBackgroundLayer - skip here
        if (this.useBackgroundLayer && !this.gameObject.isEditing) return;
        
        const engine = this.gameObject._engine;
        const isEditing = this.gameObject.isEditing;
        
        // Apply rendering options
        ctx.imageSmoothingEnabled = this.smoothing;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= this.alpha;
        
        // Save context so our offset translate doesn't leak
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        
        // Try to get tileset image
        const image = this.getTilesetImage();
        
        // Source tile size (from tileset) and map tile size (rendered size)
        const srcTileSize = this.getTileSize();
        const mapTileSize = this.getMapTileSize();
        
        // Draw tiles based on render mode
        if (image) {
            if (this.renderMode === 'offscreen') {
                this._drawOffscreen(ctx, image, srcTileSize, mapTileSize);
            } else if (this.renderMode === 'viewport') {
                this._drawViewportCulled(ctx, image, srcTileSize, mapTileSize, engine);
            } else {
                // 'full' mode - draw all tiles
                this._drawAllTiles(ctx, image, srcTileSize, mapTileSize);
            }
        }
        
        // Draw editor overlays only when this game object is selected in the editor
        if (isEditing) {
            this.drawEditorGrid(ctx);
            
            // Draw solid overlay when in solid edit mode or always show subtle solid markers
            if (this._editorMode === 'solid' || this._editorMode === 'solidErase') {
                this.drawSolidOverlay(ctx);
            } else {
                // Show subtle solid indicators even in other modes
                this.drawSolidOverlaySubtle(ctx);
            }
        }
        
        ctx.restore();
        ctx.globalAlpha = prevAlpha;
    }
    
    /**
     * Draw all tiles (full mode) - no culling
     * @private
     */
    _drawAllTiles(ctx, image, srcTileSize, mapTileSize) {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.getTileAt(x, y);
                if (!tile) continue;
                
                let destX = x * mapTileSize;
                let destY = y * mapTileSize;
                const srcX = tile.sheetX * srcTileSize;
                const srcY = tile.sheetY * srcTileSize;
                
                // Pixel perfect: snap to whole pixels
                if (this.pixelPerfect) {
                    destX = Math.round(destX);
                    destY = Math.round(destY);
                }
                
                ctx.drawImage(
                    image,
                    srcX, srcY, srcTileSize, srcTileSize,
                    destX, destY, mapTileSize, mapTileSize
                );
            }
        }
    }
    
    /**
     * Draw only tiles visible in viewport (viewport culling mode)
     * @private
     */
    _drawViewportCulled(ctx, image, srcTileSize, mapTileSize, engine) {
        // Get viewport bounds in world space
        let viewX = 0, viewY = 0, viewW = 800, viewH = 600;
        
        if (engine && engine.viewport) {
            const zoom = engine.viewport.zoom || 1;
            viewX = engine.viewport.x || 0;
            viewY = engine.viewport.y || 0;
            // Convert pixel dimensions to world units by dividing by zoom
            viewW = (engine.viewport.width || 800) / zoom;
            viewH = (engine.viewport.height || 600) / zoom;
        }
        
        // Get tilemap world transform
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        
        // Tilemap origin in world space (with offset)
        const tilemapWorldX = objPos.x + this.offsetX * objScale.x;
        const tilemapWorldY = objPos.y + this.offsetY * objScale.y;
        const scaledTileSize = mapTileSize * objScale.x; // Assuming uniform scale
        
        // Calculate visible tile range
        // Convert viewport corners to tile coordinates
        const startTileX = Math.max(0, Math.floor((viewX - tilemapWorldX) / scaledTileSize));
        const startTileY = Math.max(0, Math.floor((viewY - tilemapWorldY) / scaledTileSize));
        const endTileX = Math.min(this.mapWidth - 1, Math.ceil((viewX + viewW - tilemapWorldX) / scaledTileSize));
        const endTileY = Math.min(this.mapHeight - 1, Math.ceil((viewY + viewH - tilemapWorldY) / scaledTileSize));
        
        // Draw only visible tiles
        for (let y = startTileY; y <= endTileY; y++) {
            for (let x = startTileX; x <= endTileX; x++) {
                const tile = this.getTileAt(x, y);
                if (!tile) continue;
                
                let destX = x * mapTileSize;
                let destY = y * mapTileSize;
                const srcX = tile.sheetX * srcTileSize;
                const srcY = tile.sheetY * srcTileSize;
                
                // Pixel perfect: snap to whole pixels
                if (this.pixelPerfect) {
                    destX = Math.round(destX);
                    destY = Math.round(destY);
                }
                
                ctx.drawImage(
                    image,
                    srcX, srcY, srcTileSize, srcTileSize,
                    destX, destY, mapTileSize, mapTileSize
                );
            }
        }
    }
    
    /**
     * Draw using offscreen canvas (pre-rendered)
     * Small maps (<=512x512) use a single canvas.
     * Larger maps use chunked rendering with viewport culling.
     * @private
     */
    _drawOffscreen(ctx, image, srcTileSize, mapTileSize) {
        const mapPixelW = this.mapWidth * mapTileSize;
        const mapPixelH = this.mapHeight * mapTileSize;
        
        // Small maps use single canvas approach
        if (mapPixelW <= this._chunkSize && mapPixelH <= this._chunkSize) {
            // Check if we need to rebuild the offscreen canvas
            const needsRebuild = this._offscreenDirty || 
                                !this._offscreenCanvas ||
                                this._offscreenCanvas.width !== mapPixelW ||
                                this._offscreenCanvas.height !== mapPixelH ||
                                this._offscreenTileSize !== mapTileSize;
            
            if (needsRebuild) {
                this._buildOffscreenCanvas(image, srcTileSize, mapTileSize);
            }
            
            // Draw the offscreen canvas
            if (this._offscreenCanvas) {
                ctx.drawImage(this._offscreenCanvas, 0, 0);
            }
        } else {
            // Large maps use chunked approach
            this._drawChunkedOffscreen(ctx, image, srcTileSize, mapTileSize);
        }
    }
    
    /**
     * Build/rebuild the offscreen canvas cache
     * @private
     */
    _buildOffscreenCanvas(image, srcTileSize, mapTileSize) {
        const mapPixelW = this.mapWidth * mapTileSize;
        const mapPixelH = this.mapHeight * mapTileSize;
        
        // Create or resize offscreen canvas
        if (!this._offscreenCanvas) {
            this._offscreenCanvas = document.createElement('canvas');
        }
        this._offscreenCanvas.width = mapPixelW;
        this._offscreenCanvas.height = mapPixelH;
        this._offscreenTileSize = mapTileSize;
        
        const offCtx = this._offscreenCanvas.getContext('2d');
        offCtx.imageSmoothingEnabled = this.smoothing;
        offCtx.clearRect(0, 0, mapPixelW, mapPixelH);
        
        // Render all tiles to offscreen canvas
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.getTileAt(x, y);
                if (!tile) continue;
                
                const destX = x * mapTileSize;
                const destY = y * mapTileSize;
                const srcX = tile.sheetX * srcTileSize;
                const srcY = tile.sheetY * srcTileSize;
                
                offCtx.drawImage(
                    image,
                    srcX, srcY, srcTileSize, srcTileSize,
                    destX, destY, mapTileSize, mapTileSize
                );
            }
        }
        
        this._offscreenDirty = false;
    }
    
    /**
     * Mark the offscreen canvas as dirty (needs re-render)
     * Call this when tiles are modified
     */
    invalidateOffscreenCache() {
        this._offscreenDirty = true;
        this._chunksDirty = true;
    }
    
    /**
     * Build/rebuild chunk canvases for large tilemaps.
     * Each chunk is at most _chunkSize x _chunkSize pixels.
     * @private
     */
    _buildChunks() {
        const image = this.getTilesetImage();
        if (!image) {
            this._chunksDirty = true;
            return;
        }
        
        const srcTileSize = this.getTileSize();
        const mapTileSize = this.getMapTileSize();
        const mapPixelW = this.mapWidth * mapTileSize;
        const mapPixelH = this.mapHeight * mapTileSize;
        
        // Calculate number of chunks needed
        this._chunksPerRow = Math.ceil(mapPixelW / this._chunkSize);
        this._chunksPerCol = Math.ceil(mapPixelH / this._chunkSize);
        const totalChunks = this._chunksPerRow * this._chunksPerCol;
        
        // Clean up excess chunks (prevents GPU memory leaks from orphaned canvases)
        while (this._chunks.length > totalChunks) {
            const oldChunk = this._chunks.pop();
            if (oldChunk) {
                const ctx = oldChunk.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, oldChunk.width, oldChunk.height);
                oldChunk.width = 0;
                oldChunk.height = 0;
            }
        }
        // Add new chunks if needed
        while (this._chunks.length < totalChunks) {
            this._chunks.push(document.createElement('canvas'));
        }
        
        // Render each chunk
        for (let cy = 0; cy < this._chunksPerCol; cy++) {
            for (let cx = 0; cx < this._chunksPerRow; cx++) {
                const chunkIndex = cy * this._chunksPerRow + cx;
                const chunk = this._chunks[chunkIndex];
                
                // Chunk pixel bounds in tilemap space
                const chunkPixelX = cx * this._chunkSize;
                const chunkPixelY = cy * this._chunkSize;
                const chunkW = Math.min(this._chunkSize, mapPixelW - chunkPixelX);
                const chunkH = Math.min(this._chunkSize, mapPixelH - chunkPixelY);
                
                chunk.width = chunkW;
                chunk.height = chunkH;
                
                const chunkCtx = chunk.getContext('2d');
                chunkCtx.imageSmoothingEnabled = this.smoothing;
                chunkCtx.clearRect(0, 0, chunkW, chunkH);
                
                // Calculate tile range for this chunk
                const startTileX = Math.floor(chunkPixelX / mapTileSize);
                const startTileY = Math.floor(chunkPixelY / mapTileSize);
                const endTileX = Math.min(this.mapWidth - 1, Math.ceil((chunkPixelX + chunkW) / mapTileSize));
                const endTileY = Math.min(this.mapHeight - 1, Math.ceil((chunkPixelY + chunkH) / mapTileSize));
                
                // Draw tiles that fall within this chunk
                for (let y = startTileY; y <= endTileY; y++) {
                    for (let x = startTileX; x <= endTileX; x++) {
                        const tile = this.getTileAt(x, y);
                        if (!tile) continue;
                        
                        // Tile position relative to chunk
                        const destX = x * mapTileSize - chunkPixelX;
                        const destY = y * mapTileSize - chunkPixelY;
                        const srcX = tile.sheetX * srcTileSize;
                        const srcY = tile.sheetY * srcTileSize;
                        
                        chunkCtx.drawImage(
                            image,
                            srcX, srcY, srcTileSize, srcTileSize,
                            destX, destY, mapTileSize, mapTileSize
                        );
                    }
                }
            }
        }
        
        this._chunksDirty = false;
    }
    
    /**
     * Draw tilemap using pre-rendered chunks, only drawing chunks visible in viewport.
     * @private
     */
    _drawChunkedOffscreen(ctx, image, srcTileSize, mapTileSize) {
        // In editor mode, use viewport culling directly instead of building chunks
        // This prevents freeze when opening large tilemaps in the scene editor
        const isEditing = this.gameObject?.isEditing;
        if (isEditing) {
            this._drawViewportCulled(ctx, image, srcTileSize, mapTileSize, this.gameObject._engine);
            return;
        }
        
        // Rebuild chunks if dirty
        if (this._chunksDirty || this._chunks.length === 0) {
            this._buildChunks();
        }
        
        // If still no chunks (image not loaded), fall back to viewport culling
        if (this._chunks.length === 0) {
            this._drawViewportCulled(ctx, image, srcTileSize, mapTileSize, this.gameObject._engine);
            return;
        }
        
        const engine = this.gameObject._engine;
        
        // Get viewport bounds in world space
        let viewX = 0, viewY = 0, viewW = 800, viewH = 600;
        if (engine && engine.viewport) {
            const zoom = engine.viewport.zoom || 1;
            viewX = engine.viewport.x || 0;
            viewY = engine.viewport.y || 0;
            // Convert pixel dimensions to world units by dividing by zoom
            viewW = (engine.viewport.width || 800) / zoom;
            viewH = (engine.viewport.height || 600) / zoom;
        }
        
        // Get tilemap world transform
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        
        // Tilemap origin in world space (with offset)
        const tilemapWorldX = objPos.x + this.offsetX * objScale.x;
        const tilemapWorldY = objPos.y + this.offsetY * objScale.y;
        
        // Draw only chunks that intersect viewport
        for (let cy = 0; cy < this._chunksPerCol; cy++) {
            for (let cx = 0; cx < this._chunksPerRow; cx++) {
                const chunkIndex = cy * this._chunksPerRow + cx;
                const chunk = this._chunks[chunkIndex];
                if (!chunk || chunk.width === 0 || chunk.height === 0) continue;
                
                // Chunk position in local tilemap space
                const chunkLocalX = cx * this._chunkSize;
                const chunkLocalY = cy * this._chunkSize;
                
                // Chunk position in world space
                const chunkWorldX = tilemapWorldX + chunkLocalX * objScale.x;
                const chunkWorldY = tilemapWorldY + chunkLocalY * objScale.y;
                const chunkWorldW = chunk.width * objScale.x;
                const chunkWorldH = chunk.height * objScale.y;
                
                // Check if chunk intersects viewport
                if (chunkWorldX + chunkWorldW < viewX || chunkWorldX > viewX + viewW ||
                    chunkWorldY + chunkWorldH < viewY || chunkWorldY > viewY + viewH) {
                    continue; // Skip this chunk - not visible
                }
                
                // Draw the chunk at its local position (context already has offset applied)
                ctx.drawImage(chunk, chunkLocalX, chunkLocalY);
            }
        }
    }
    
    // ==================== BACKGROUND LAYER RENDERING ====================
    
    /**
     * Draw to the engine's background layer canvas
     * This draws in screen space, behind all game objects
     * Called by the engine's background layer system
     */
    _drawToBackgroundLayer() {
        if (!this.useBackgroundLayer) return;
        
        const engine = this.gameObject._engine;
        if (!engine || !engine.assets) return;
        
        // Get the background layer context (creates it if needed)
        const bgCtx = engine.drawBackgroundLayer();
        if (!bgCtx) return;
        
        // Get background layer canvas
        const bgCanvas = engine._backgroundLayerCanvas;
        if (!bgCanvas) return;
        
        // Try to get tileset image
        const image = this.getTilesetImage();
        if (!image) return;
        
        // Source tile size (from tileset) and map tile size (rendered size)
        const srcTileSize = this.getTileSize();
        let mapTileSize = this.getMapTileSize();
        
        // Pixel perfect: snap tile size to whole pixel
        if (this.pixelPerfect) {
            mapTileSize = Math.round(mapTileSize);
        }
        
        // Apply rendering options
        bgCtx.imageSmoothingEnabled = this.smoothing;
        const prevAlpha = bgCtx.globalAlpha;
        bgCtx.globalAlpha *= this.alpha;
        
        // Get world transform info for positioning
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        
        // Get viewport info for positioning
        const viewX = engine.viewport ? (engine.viewport.x || 0) : 0;
        const viewY = engine.viewport ? (engine.viewport.y || 0) : 0;
        const zoom = engine.viewport ? (engine.viewport.zoom || 1) : 1;
        
        // Save context and apply transforms
        bgCtx.save();
        
        // Transform from world to screen space
        // Screen position = (worldPos - viewportPos) * zoom
        let screenX = (objPos.x - viewX + this.offsetX * objScale.x) * zoom;
        let screenY = (objPos.y - viewY + this.offsetY * objScale.y) * zoom;
        
        // Pixel perfect: snap screen position
        if (this.pixelPerfect) {
            screenX = Math.round(screenX);
            screenY = Math.round(screenY);
        }
        
        bgCtx.translate(screenX, screenY);
        bgCtx.scale(objScale.x * zoom, objScale.y * zoom);
        
        // Draw tiles based on render mode
        if (this.renderMode === 'offscreen') {
            this._drawOffscreen(bgCtx, image, srcTileSize, mapTileSize);
        } else if (this.renderMode === 'viewport') {
            // For background layer, just draw all visible tiles directly
            this._drawAllTiles(bgCtx, image, srcTileSize, mapTileSize);
        } else {
            this._drawAllTiles(bgCtx, image, srcTileSize, mapTileSize);
        }
        
        bgCtx.restore();
        bgCtx.globalAlpha = prevAlpha;
    }
    
    // ==================== EDITOR GIZMO HANDLES ====================
    
    /**
     * Return gizmo handles for the level editor to draw.
     * Shows origin and bottom-right corner of the tilemap in world space.
     */
    getEditorGizmoHandles() {
        if (!this.gameObject) return [];
        const worldPos = this.gameObject.getWorldPosition();
        const worldScale = this.gameObject.getWorldScale();
        const mapTileSize = this.getMapTileSize();
        const w = this.mapWidth * mapTileSize * worldScale.x;
        const h = this.mapHeight * mapTileSize * worldScale.y;
        
        return [
            {
                x: worldPos.x + this.offsetX * worldScale.x,
                y: worldPos.y + this.offsetY * worldScale.y,
                radius: 6, color: '#00ff00', label: 'Tilemap Origin',
                showGizmoAlways: true
            },
            {
                x: worldPos.x + this.offsetX * worldScale.x + w,
                y: worldPos.y + this.offsetY * worldScale.y + h,
                radius: 6, color: '#ff6600', label: 'Tilemap End',
                showGizmoAlways: true
            }
        ];
    }
    
    // ==================== IMAGE LOADING ====================
    
    /**
     * Get the tileset image from various sources
     * Tries: engine assets, app.fileSystem, cached image
     * @returns {HTMLImageElement|null}
     */
    getTilesetImage() {
        if (!this.tilesetImage) return null;
        
        // Check cached image first
        if (this._cachedImage && this._cachedImagePath === this.tilesetImage) {
            return this._cachedImage;
        }
        
        // If we're already loading this image asynchronously, don't create another Image
        if (this._imageLoading && this._imageLoadingPath === this.tilesetImage) {
            return null;
        }
        
        const engine = this.gameObject ? this.gameObject._engine : null;
        let image = null;
        
        // Try 1: Engine asset manager with full path
        if (engine && engine.assets) {
            image = engine.assets.getImage(this.tilesetImage);
        }
        
        // Try 2: Engine asset manager with just filename
        if (!image && engine && engine.assets) {
            const fileName = this.tilesetImage.split('/').pop().split('\\').pop();
            image = engine.assets.getImage(fileName);
        }
        
        // Try 3: Load from app.fileSystem
        if (!image && window.app && window.app.fileSystem) {
            try {
                const content = window.app.fileSystem.getFileContent(this.tilesetImage);
                if (content && (content.startsWith('data:') || content.startsWith('blob:'))) {
                    const img = new Image();
                    img.src = content;
                    if (img.complete && img.naturalWidth > 0) {
                        image = img;
                    } else {
                        // Load asynchronously - set loading flag to prevent creating new Images each frame
                        this._imageLoading = true;
                        this._imageLoadingPath = this.tilesetImage;
                        img.onload = () => {
                            this._cachedImage = img;
                            this._cachedImagePath = this.tilesetImage;
                            this._imageLoading = false;
                            this._imageLoadingPath = '';
                            this._offscreenDirty = true;
                            this._chunksDirty = true;
                        };
                        img.onerror = () => {
                            this._imageLoading = false;
                            this._imageLoadingPath = '';
                        };
                    }
                }
            } catch (e) {
                // File not found
            }
        }
        
        // Try 4: Load from ProjectManager assets
        if (!image && window.ProjectManager && ProjectManager.project && ProjectManager.project.assets) {
            const asset = ProjectManager.project.assets[this.tilesetImage];
            if (asset && asset.data) {
                const img = new Image();
                img.src = asset.data;
                if (img.complete && img.naturalWidth > 0) {
                    image = img;
                } else {
                    // Load asynchronously - set loading flag to prevent creating new Images each frame
                    this._imageLoading = true;
                    this._imageLoadingPath = this.tilesetImage;
                    img.onload = () => {
                        this._cachedImage = img;
                        this._cachedImagePath = this.tilesetImage;
                        this._imageLoading = false;
                        this._imageLoadingPath = '';
                        this._offscreenDirty = true;
                        this._chunksDirty = true;
                    };
                    img.onerror = () => {
                        this._imageLoading = false;
                        this._imageLoadingPath = '';
                    };
                }
            }
        }
        
        // Cache the result
        if (image) {
            this._cachedImage = image;
            this._cachedImagePath = this.tilesetImage;
            this._imageLoading = false;
            this._imageLoadingPath = '';
        }
        
        return image;
    }
    
    // ==================== EDITOR DRAWING ====================
    
    /**
     * Draw editor grid overlay (in object-space, offset already applied)
     */
    drawEditorGrid(ctx) {
        const mapTileSize = this.getMapTileSize();
        const mapPixelW = this.mapWidth * mapTileSize;
        const mapPixelH = this.mapHeight * mapTileSize;
        
        // Draw border around entire tilemap
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, mapPixelW, mapPixelH);
        
        // Grid line color based on editor mode
        if (this._editorMode === 'paint') {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        } else if (this._editorMode === 'erase') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        } else if (this._editorMode === 'solid') {
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
        } else if (this._editorMode === 'solidErase') {
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        } else {
            ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
        }
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.mapWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * mapTileSize, 0);
            ctx.lineTo(x * mapTileSize, mapPixelH);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.mapHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * mapTileSize);
            ctx.lineTo(mapPixelW, y * mapTileSize);
            ctx.stroke();
        }
    }
    
    /**
     * Draw solid tile overlay (red transparent squares) - prominent mode
     */
    drawSolidOverlay(ctx) {
        const mapTileSize = this.getMapTileSize();
        ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.isSolidAt(x, y)) {
                    ctx.fillRect(
                        x * mapTileSize + 2,
                        y * mapTileSize + 2,
                        mapTileSize - 4,
                        mapTileSize - 4
                    );
                }
            }
        }
    }
    
    /**
     * Draw subtle solid indicators (small corner markers)
     */
    drawSolidOverlaySubtle(ctx) {
        const mapTileSize = this.getMapTileSize();
        ctx.fillStyle = 'rgba(255, 100, 50, 0.3)';
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.isSolidAt(x, y)) {
                    // Draw small corner triangle to indicate solid
                    const tx = x * mapTileSize;
                    const ty = y * mapTileSize;
                    const s = mapTileSize * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx + s, ty);
                    ctx.lineTo(tx, ty + s);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }
    
    // ==================== MAP DATA MANAGEMENT ====================
    
    /**
     * Initialize map data with empty tiles (null)
     */
    initializeMapData() {
        this.mapData = new Array(this.mapWidth * this.mapHeight).fill(null);
    }
    
    /**
     * Initialize solid data with all false
     */
    initializeSolidData() {
        this.solidData = new Array(this.mapWidth * this.mapHeight).fill(false);
    }
    
    /**
     * Resize map data when dimensions change
     */
    resizeMapData(newWidth, newHeight) {
        const newMapData = new Array(newWidth * newHeight).fill(null);
        const newSolidData = new Array(newWidth * newHeight).fill(false);
        
        // Copy existing data
        const copyWidth = Math.min(this.mapWidth, newWidth);
        const copyHeight = Math.min(this.mapHeight, newHeight);
        
        for (let y = 0; y < copyHeight; y++) {
            for (let x = 0; x < copyWidth; x++) {
                const oldIndex = y * this.mapWidth + x;
                const newIndex = y * newWidth + x;
                if (oldIndex < this.mapData.length) {
                    newMapData[newIndex] = this.mapData[oldIndex];
                }
                if (oldIndex < this.solidData.length) {
                    newSolidData[newIndex] = this.solidData[oldIndex];
                }
            }
        }
        
        this.mapData = newMapData;
        this.solidData = newSolidData;
        this.mapWidth = newWidth;
        this.mapHeight = newHeight;
    }
    
    /**
     * Get tile data at map coordinates
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     * @returns {object|null} Tile data { sheetX, sheetY } or null for empty
     */
    getTileAt(mapX, mapY) {
        if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) {
            return null;
        }
        const index = mapY * this.mapWidth + mapX;
        return this.mapData[index] || null;
    }
    
    /**
     * Set tile at map coordinates
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     * @param {number} sheetX - X position in tileset
     * @param {number} sheetY - Y position in tileset
     */
    setTileAt(mapX, mapY, sheetX, sheetY) {
        if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) return;
        
        // Ensure map data is initialized
        if (this.mapData.length !== this.mapWidth * this.mapHeight) {
            this.initializeMapData();
        }
        
        const index = mapY * this.mapWidth + mapX;
        this.mapData[index] = { sheetX, sheetY };
        
        // Mark offscreen cache as dirty
        this._offscreenDirty = true;
        this._chunksDirty = true;
    }
    
    /**
     * Clear tile at map coordinates
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     */
    clearTileAt(mapX, mapY) {
        if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) return;
        
        const index = mapY * this.mapWidth + mapX;
        if (this.mapData.length > index) {
            this.mapData[index] = null;
        }
        
        // Mark offscreen cache as dirty
        this._offscreenDirty = true;
        this._chunksDirty = true;
    }
    
    /**
     * Clear all tiles from the map
     */
    clearMap() {
        this.initializeMapData();
        this._offscreenDirty = true;
        this._chunksDirty = true;
    }
    
    // ==================== SOLID DATA MANAGEMENT ====================
    
    /**
     * Check if a tile is solid at map coordinates
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     * @returns {boolean} True if tile is solid
     */
    isSolidAt(mapX, mapY) {
        if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) {
            return false;
        }
        const index = mapY * this.mapWidth + mapX;
        return this.solidData[index] === true;
    }
    
    /**
     * Set solid at map coordinates
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     * @param {boolean} solid - Whether tile is solid
     */
    setSolidAt(mapX, mapY, solid) {
        if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) return;
        
        // Ensure solid data is initialized
        if (this.solidData.length !== this.mapWidth * this.mapHeight) {
            this.initializeSolidData();
        }
        
        const index = mapY * this.mapWidth + mapX;
        this.solidData[index] = solid;
    }
    
    /**
     * Auto-solid: make all non-empty tiles solid
     */
    autoSolid() {
        if (this.solidData.length !== this.mapWidth * this.mapHeight) {
            this.initializeSolidData();
        }
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.getTileAt(x, y);
                this.setSolidAt(x, y, tile !== null);
            }
        }
    }
    
    /**
     * Clear all solid data
     */
    clearAllSolid() {
        this.initializeSolidData();
    }
    
    /**
     * Check if tile has content (not empty)
     * @param {number} mapX - X coordinate in tile units
     * @param {number} mapY - Y coordinate in tile units
     * @returns {boolean} True if tile has content
     */
    hasTileAt(mapX, mapY) {
        return this.getTileAt(mapX, mapY) !== null;
    }
    
    // ==================== COORDINATE CONVERSION ====================
    
    /**
     * Convert world coordinates to tile coordinates
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {object} { tileX, tileY }
     */
    worldToTile(worldX, worldY) {
        if (!this.gameObject) return { tileX: -1, tileY: -1 };
        
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const mapTileSize = this.getMapTileSize();
        
        // Get relative position to tilemap origin (accounting for offset and scale)
        const relX = worldX - objPos.x - this.offsetX * objScale.x;
        const relY = worldY - objPos.y - this.offsetY * objScale.y;
        
        // Convert to tile coordinates (using map tile size for world positioning)
        const tileX = Math.floor(relX / (mapTileSize * objScale.x));
        const tileY = Math.floor(relY / (mapTileSize * objScale.y));
        
        return { tileX, tileY };
    }
    
    /**
     * Convert tile coordinates to world coordinates (center of tile)
     * @param {number} tileX - Tile X coordinate
     * @param {number} tileY - Tile Y coordinate
     * @returns {object} { worldX, worldY }
     */
    tileToWorld(tileX, tileY) {
        if (!this.gameObject) return { worldX: 0, worldY: 0 };
        
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const mapTileSize = this.getMapTileSize();
        
        const worldX = objPos.x + this.offsetX * objScale.x + (tileX + 0.5) * mapTileSize * objScale.x;
        const worldY = objPos.y + this.offsetY * objScale.y + (tileY + 0.5) * mapTileSize * objScale.y;
        
        return { worldX, worldY };
    }
    
    /**
     * Get collision data for physics systems
     * @returns {Array} Array of solid tile world bounds
     */
    getSolidTileBounds() {
        const solidBounds = [];
        if (!this.gameObject) return solidBounds;
        
        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const mapTileSize = this.getMapTileSize();
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (!this.isSolidAt(x, y)) continue;
                
                const worldX = objPos.x + this.offsetX * objScale.x + x * mapTileSize * objScale.x;
                const worldY = objPos.y + this.offsetY * objScale.y + y * mapTileSize * objScale.y;
                const worldWidth = mapTileSize * objScale.x;
                const worldHeight = mapTileSize * objScale.y;
                
                solidBounds.push({
                    x: worldX,
                    y: worldY,
                    width: worldWidth,
                    height: worldHeight,
                    tileX: x,
                    tileY: y
                });
            }
        }
        
        return solidBounds;
    }
    
    // ==================== COLLISION API ====================
    
    /**
     * Check if a world position collides with a solid tile
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {boolean} True if colliding with solid tile
     */
    checkCollision(worldX, worldY) {
        const { tileX, tileY } = this.worldToTile(worldX, worldY);
        return this.isSolidAt(tileX, tileY);
    }
    
    /**
     * Check if a rectangle collides with any solid tiles
     * @param {number} x - Left edge X position
     * @param {number} y - Top edge Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @returns {boolean} True if colliding with any solid tile
     */
    checkRectCollision(x, y, width, height) {
        const topLeft = this.worldToTile(x, y);
        const bottomRight = this.worldToTile(x + width - 1, y + height - 1);
        
        for (let ty = topLeft.tileY; ty <= bottomRight.tileY; ty++) {
            for (let tx = topLeft.tileX; tx <= bottomRight.tileX; tx++) {
                if (this.isSolidAt(tx, ty)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Get all solid tiles colliding with a rectangle
     * @param {number} x - Left edge X position
     * @param {number} y - Top edge Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @returns {Array} Array of { tileX, tileY, worldX, worldY, width, height }
     */
    getCollidingTiles(x, y, width, height) {
        const collisions = [];
        const topLeft = this.worldToTile(x, y);
        const bottomRight = this.worldToTile(x + width - 1, y + height - 1);
        const mapTileSize = this.getMapTileSize();
        
        for (let ty = topLeft.tileY; ty <= bottomRight.tileY; ty++) {
            for (let tx = topLeft.tileX; tx <= bottomRight.tileX; tx++) {
                if (this.isSolidAt(tx, ty)) {
                    const worldPos = this.tileToWorld(tx, ty);
                    const objScale = this.gameObject ? this.gameObject.getWorldScale() : { x: 1, y: 1 };
                    collisions.push({
                        tileX: tx,
                        tileY: ty,
                        worldX: worldPos.worldX - mapTileSize * objScale.x / 2,
                        worldY: worldPos.worldY - mapTileSize * objScale.y / 2,
                        width: mapTileSize * objScale.x,
                        height: mapTileSize * objScale.y
                    });
                }
            }
        }
        return collisions;
    }
    
    /**
     * Raycast against solid tiles
     * @param {number} startX - Start X position
     * @param {number} startY - Start Y position
     * @param {number} endX - End X position
     * @param {number} endY - End Y position
     * @returns {object|null} Hit info { tileX, tileY, worldX, worldY, distance } or null
     */
    raycast(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mapTileSize = this.getMapTileSize();
        const steps = Math.ceil(distance / mapTileSize);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const checkX = startX + dx * t;
            const checkY = startY + dy * t;
            const { tileX, tileY } = this.worldToTile(checkX, checkY);
            
            if (this.isSolidAt(tileX, tileY)) {
                return {
                    tileX,
                    tileY,
                    worldX: checkX,
                    worldY: checkY,
                    distance: distance * t
                };
            }
        }
        return null;
    }
    
    // ==================== EDITOR INTEGRATION ====================
    
    /**
     * Open tile selector - pick a tile from the tileset to paint
     * @param {object} editor - The editor instance
     */
    openTileSelector(editor) {
        // Close existing selector if open
        if (this._tileSelectorWindow) {
            this._tileSelectorWindow.close();
            this._tileSelectorWindow = null;
        }
        
        // Get tileset image
        if (!this.tilesetImage) {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('⚠️ Please set a tileset image first');
            }
            return;
        }
        
        const image = this.getTilesetImage();
        if (!image) {
            if (window.app && window.app.showNotification) {
                window.app.showNotification('⚠️ Tileset image not loaded. Make sure the image exists in your project.');
            }
            return;
        }
        
        // Create tile selector window
        const win = new KGUIWindow('🎨 Select Tile');
        win.setSize(400, 450);
        win.center();
        this._tileSelectorWindow = win;
        
        const content = win.content;
        content.style.padding = '10px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '10px';
        
        // Selected tile preview
        const infoDiv = document.createElement('div');
        infoDiv.style.display = 'flex';
        infoDiv.style.gap = '10px';
        infoDiv.style.alignItems = 'center';
        infoDiv.style.padding = '8px';
        infoDiv.style.background = 'var(--bg-secondary)';
        infoDiv.style.borderRadius = '4px';
        
        const tileSize = this.getTileSize();
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = tileSize * 2;
        previewCanvas.height = tileSize * 2;
        previewCanvas.style.border = '1px solid var(--border-color)';
        previewCanvas.style.imageRendering = 'pixelated';
        infoDiv.appendChild(previewCanvas);
        
        const infoText = document.createElement('div');
        infoText.style.flex = '1';
        infoDiv.appendChild(infoText);
        
        content.appendChild(infoDiv);
        
        // Update preview function
        const cols = this.getColumns();
        const rows = this.getRows();
        
        const updatePreview = () => {
            const previewCtx = previewCanvas.getContext('2d');
            previewCtx.imageSmoothingEnabled = false;
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.drawImage(
                image,
                this._selectedSheetX * tileSize, this._selectedSheetY * tileSize,
                tileSize, tileSize,
                0, 0, previewCanvas.width, previewCanvas.height
            );
            
            infoText.innerHTML = `<strong>Selected Tile:</strong><br>Sheet X: ${this._selectedSheetX}, Y: ${this._selectedSheetY}`;
        };
        
        updatePreview();
        
        // Tileset canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.flex = '1';
        canvasContainer.style.overflow = 'auto';
        canvasContainer.style.border = '1px solid var(--border-color)';
        canvasContainer.style.borderRadius = '4px';
        canvasContainer.style.background = 'var(--bg-tertiary)';
        
        const tilesetCanvas = document.createElement('canvas');
        tilesetCanvas.width = cols * tileSize;
        tilesetCanvas.height = rows * tileSize;
        tilesetCanvas.style.imageRendering = 'pixelated';
        tilesetCanvas.style.cursor = 'pointer';
        canvasContainer.appendChild(tilesetCanvas);
        content.appendChild(canvasContainer);
        
        // Draw tileset function
        const drawTileset = () => {
            const tilesetCtx = tilesetCanvas.getContext('2d');
            tilesetCtx.imageSmoothingEnabled = false;
            tilesetCtx.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
            tilesetCtx.drawImage(image, 0, 0);
            
            // Draw grid using tile size
            tilesetCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            tilesetCtx.lineWidth = 1;
            for (let x = 0; x <= cols; x++) {
                tilesetCtx.beginPath();
                tilesetCtx.moveTo(x * tileSize, 0);
                tilesetCtx.lineTo(x * tileSize, tilesetCanvas.height);
                tilesetCtx.stroke();
            }
            for (let y = 0; y <= rows; y++) {
                tilesetCtx.beginPath();
                tilesetCtx.moveTo(0, y * tileSize);
                tilesetCtx.lineTo(tilesetCanvas.width, y * tileSize);
                tilesetCtx.stroke();
            }
            
            // Highlight selected
            tilesetCtx.strokeStyle = '#00ff00';
            tilesetCtx.lineWidth = 3;
            tilesetCtx.strokeRect(
                this._selectedSheetX * tileSize + 1,
                this._selectedSheetY * tileSize + 1,
                tileSize - 2,
                tileSize - 2
            );
        };
        
        drawTileset();
        
        // Handle click on tileset
        tilesetCanvas.onclick = (e) => {
            const rect = tilesetCanvas.getBoundingClientRect();
            const scaleX = tilesetCanvas.width / rect.width;
            const scaleY = tilesetCanvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX / tileSize);
            const y = Math.floor((e.clientY - rect.top) * scaleY / tileSize);
            
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
                this._selectedSheetX = x;
                this._selectedSheetY = y;
                updatePreview();
                drawTileset();
            }
        };
        
        // Paint button
        const paintBtn = document.createElement('button');
        paintBtn.className = 'kgui-button';
        paintBtn.innerHTML = '🖌️ Start Painting';
        paintBtn.style.background = 'linear-gradient(180deg, #0077dd 0%, #0055aa 100%)';
        paintBtn.style.color = '#fff';
        paintBtn.style.padding = '10px';
        paintBtn.style.border = 'none';
        paintBtn.onclick = () => {
            win.close();
            this.enterTilePaintMode(editor);
        };
        content.appendChild(paintBtn);
        
        // Clean up on close
        win.onClose(() => {
            this._tileSelectorWindow = null;
        });
    }
    
    /**
     * Enter tile painting mode
     * @param {object} editor - The editor instance
     */
    enterTilePaintMode(editor) {
        this._editorMode = 'paint';
        this._setLevelEditorTilePaintMode('paint');
        
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`🖌️ Painting tile (${this._selectedSheetX}, ${this._selectedSheetY}). Click to paint. Right-click or ESC to exit.`);
        }
    }
    
    /**
     * Enter tile erase mode
     * @param {object} editor - The editor instance
     */
    enterTileEraseMode(editor) {
        this._editorMode = 'erase';
        this._setLevelEditorTilePaintMode('erase');
        
        if (window.app && window.app.showNotification) {
            window.app.showNotification('🗑️ Tile erase mode. Click to remove tiles. Right-click or ESC to exit.');
        }
    }
    
    /**
     * Enter solid paint mode
     * @param {object} editor - The editor instance
     */
    enterSolidPaintMode(editor) {
        this._editorMode = 'solid';
        this._setLevelEditorTilePaintMode('solid');
        
        if (window.app && window.app.showNotification) {
            window.app.showNotification('🧱 Solid paint mode. Click to mark tiles as solid. Right-click or ESC to exit.');
        }
    }
    
    /**
     * Enter solid erase mode
     * @param {object} editor - The editor instance
     */
    enterSolidEraseMode(editor) {
        this._editorMode = 'solidErase';
        this._setLevelEditorTilePaintMode('solidErase');
        
        if (window.app && window.app.showNotification) {
            window.app.showNotification('💨 Remove solid mode. Click to remove solid. Right-click or ESC to exit.');
        }
    }
    
    /**
     * Helper: Notify the level editor to enter/exit tile paint mode
     * @param {string} mode - 'paint', 'erase', 'solid', 'solidErase'
     * @private
     */
    _setLevelEditorTilePaintMode(mode) {
        if (window.app && window.app.sceneEditor) {
            const sceneEditor = window.app.sceneEditor;
            if (sceneEditor.levelEditor) {
                sceneEditor.levelEditor.setTilePaintMode(this, mode);
            }
        }
    }
    
    /**
     * Exit tile editing mode
     */
    exitEditMode() {
        this._editorMode = 'none';
        
        if (window.app && window.app.sceneEditor) {
            const sceneEditor = window.app.sceneEditor;
            if (sceneEditor.levelEditor) {
                sceneEditor.levelEditor.exitTilePaintMode();
            }
        }
    }
    
    /**
     * Handle tile paint click from the level editor.
     * Accepts paint mode as parameter for robustness - does NOT rely on _editorMode state
     * (similar to TDTDGridWorld.handleGridPaint pattern).
     * @param {number} worldX - World X position of click
     * @param {number} worldY - World Y position of click
     * @param {string} [mode] - Paint mode: 'paint', 'erase', 'solid', 'solidErase'. Falls back to _editorMode if not provided.
     * @returns {boolean} True if a tile was painted/erased
     */
    handleTilePaint(worldX, worldY, mode) {
        // Use explicit mode parameter if given, otherwise fall back to _editorMode
        const paintMode = mode || this._editorMode;
        
        const { tileX, tileY } = this.worldToTile(worldX, worldY);
        
        if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
            if (paintMode === 'paint') {
                this.setTileAt(tileX, tileY, this._selectedSheetX, this._selectedSheetY);
            } else if (paintMode === 'erase') {
                this.clearTileAt(tileX, tileY);
            } else if (paintMode === 'solid') {
                this.setSolidAt(tileX, tileY, true);
            } else if (paintMode === 'solidErase') {
                this.setSolidAt(tileX, tileY, false);
            }
            return true;
        }
        return false;
    }
    
    /**
     * Check if world position is within tilemap bounds
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {boolean} True if within bounds
     */
    isWithinBounds(worldX, worldY) {
        const { tileX, tileY } = this.worldToTile(worldX, worldY);
        return tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight;
    }
    
    /**
     * Get currently selected tile sheet position
     * @returns {object} { sheetX, sheetY }
     */
    getSelectedTile() {
        return {
            sheetX: this._selectedSheetX,
            sheetY: this._selectedSheetY
        };
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TilemapRenderer';
        
        // Tileset configuration
        json.tilesetImage = this.tilesetImage;
        json.tilesetMode = this.tilesetMode;
        json.tileSize = this.tileSize;
        json.gridColumns = this.gridColumns;
        json.gridRows = this.gridRows;
        
        // Map
        json.mapWidth = this.mapWidth;
        json.mapHeight = this.mapHeight;
        json.mapTileSize = this.mapTileSize;
        
        // Map data - compact: array of { sheetX, sheetY } or null
        json.mapData = this.mapData.map(tile => tile ? { sheetX: tile.sheetX, sheetY: tile.sheetY } : null);
        
        // Solid data - array of booleans
        json.solidData = [...this.solidData];
        
        // Rendering
        json.useBackgroundLayer = this.useBackgroundLayer;
        json.pixelPerfect = this.pixelPerfect;
        json.offsetX = this.offsetX;
        json.offsetY = this.offsetY;
        json.alpha = this.alpha;
        json.smoothing = this.smoothing;
        json.renderMode = this.renderMode;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new TilemapRenderer();
        module.enabled = json.enabled ?? true;
        
        // Tileset configuration
        module.tilesetImage = json.tilesetImage || '';
        module.tilesetMode = json.tilesetMode || 'tileSize';
        module.tileSize = json.tileSize ?? json.tileWidth ?? 16;  // fallback to old tileWidth for compatibility
        module.gridColumns = json.gridColumns ?? json.tilesetColumns ?? 8;  // fallback to old tilesetColumns
        module.gridRows = json.gridRows ?? json.tilesetRows ?? 8;  // fallback to old tilesetRows
        
        // Map
        module.mapWidth = json.mapWidth ?? 10;
        module.mapHeight = json.mapHeight ?? 10;
        module.mapTileSize = json.mapTileSize ?? 0;
        
        // Map data - array of { sheetX, sheetY } or null
        if (Array.isArray(json.mapData)) {
            module.mapData = json.mapData.map(tile => tile ? { sheetX: tile.sheetX, sheetY: tile.sheetY } : null);
        } else {
            module.mapData = [];
        }
        
        // Solid data - array of booleans
        if (Array.isArray(json.solidData)) {
            module.solidData = [...json.solidData];
        } else {
            module.solidData = [];
        }
        
        // Ensure data arrays are properly sized
        if (module.mapData.length !== module.mapWidth * module.mapHeight) {
            module.initializeMapData();
        }
        if (module.solidData.length !== module.mapWidth * module.mapHeight) {
            module.initializeSolidData();
        }
        
        // Rendering
        module.useBackgroundLayer = json.useBackgroundLayer ?? false;
        module.pixelPerfect = json.pixelPerfect ?? true;
        module.offsetX = json.offsetX ?? 0;
        module.offsetY = json.offsetY ?? 0;
        module.alpha = json.alpha ?? 1.0;
        module.smoothing = json.smoothing ?? false;
        module.renderMode = json.renderMode || 'viewport';
        
        return module;
    }
    
    clone() {
        const cloned = new TilemapRenderer();
        cloned.enabled = this.enabled;
        
        // Tileset configuration
        cloned.tilesetImage = this.tilesetImage;
        cloned.tilesetMode = this.tilesetMode;
        cloned.tileSize = this.tileSize;
        cloned.gridColumns = this.gridColumns;
        cloned.gridRows = this.gridRows;
        
        // Map
        cloned.mapWidth = this.mapWidth;
        cloned.mapHeight = this.mapHeight;
        cloned.mapTileSize = this.mapTileSize;
        
        // Deep clone map data
        cloned.mapData = this.mapData.map(tile => tile ? { sheetX: tile.sheetX, sheetY: tile.sheetY } : null);
        cloned.solidData = [...this.solidData];
        
        // Rendering
        cloned.useBackgroundLayer = this.useBackgroundLayer;
        cloned.pixelPerfect = this.pixelPerfect;
        cloned.offsetX = this.offsetX;
        cloned.offsetY = this.offsetY;
        cloned.alpha = this.alpha;
        cloned.smoothing = this.smoothing;
        cloned.renderMode = this.renderMode;
        
        return cloned;
    }
}

// Register the module
window.TilemapRenderer = TilemapRenderer;
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('TilemapRenderer', TilemapRenderer);
}
