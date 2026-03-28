/**
 * VoxelTerrain2D Module
 * A highly optimized 2D voxel-based terrain system with smooth rendering, customizable voxel types,
 * and comprehensive collision support. Supports massive maps (3000x3000+) via lazy chunk rendering.
 * 
 * Features:
 * - Multiple voxel types with customizable appearance
 * - Smooth terrain using marching squares algorithm
 * - Color blending between adjacent voxel types
 * - Image textures, generated patterns (lines, circles, noise)
 * - Outline rendering
 * - Live voxel painting in scene editor
 * - Collision API compatible with MovementController2D
 * - Efficient viewport culling and lazy chunk rendering
 * - Supports terrains up to 8192x8192+ voxels (67+ million voxels!)
 * - Intelligent memory management for large maps
 */

class VoxelTerrain2D extends Module {

    constructor() {
        super();

        // === TERRAIN CONFIGURATION ===
        this.gridWidth = 32;              // Width in voxels
        this.gridHeight = 24;             // Height in voxels
        this.voxelSize = 16;              // Size of each voxel in pixels

        // === VOXEL DATA ===
        // Each cell stores voxel type index (0 = empty, 1+ = voxel type)
        // Stored as flat array: index = y * gridWidth + x
        this.voxelData = [];

        // === VOXEL TYPES ===
        // Array of voxel type definitions
        this.voxelTypes = [
            {
                name: 'Dirt',
                color: '#8B4513',
                colorVariation: 15,
                secondaryColor: '#654321',
                blendMode: 'gradient',      // 'solid', 'gradient', 'noise', 'texture'
                pattern: 'none',            // 'none', 'lines', 'circles', 'dots', 'noise', 'crosshatch'
                patternColor: '#5C3317',
                patternSize: 4,
                patternDensity: 0.3,
                outlineColor: '#3D2314',
                outlineWidth: 1,
                texture: '',
                friction: 1.0,
                bounciness: 0,
                solid: true,
                smoothing: 1.0              // Per-type smoothing multiplier (0-1)
            },
            {
                name: 'Stone',
                color: '#696969',
                colorVariation: 10,
                secondaryColor: '#555555',
                blendMode: 'noise',
                pattern: 'lines',
                patternColor: '#505050',
                patternSize: 6,
                patternDensity: 0.2,
                outlineColor: '#404040',
                outlineWidth: 2,
                texture: '',
                friction: 0.8,
                bounciness: 0,
                solid: true,
                smoothing: 0.8              // Slightly less rounded
            },
            {
                name: 'Grass',
                color: '#228B22',
                colorVariation: 20,
                secondaryColor: '#356B35',
                blendMode: 'gradient',
                pattern: 'dots',
                patternColor: '#1A6B1A',
                patternSize: 3,
                patternDensity: 0.4,
                outlineColor: '#145014',
                outlineWidth: 1,
                texture: '',
                friction: 1.0,
                bounciness: 0,
                solid: true,
                smoothing: 1.0
            },
            {
                name: 'Sand',
                color: '#F4A460',
                colorVariation: 15,
                secondaryColor: '#DEB887',
                blendMode: 'noise',
                pattern: 'dots',
                patternColor: '#CD853F',
                patternSize: 2,
                patternDensity: 0.6,
                outlineColor: '#C19A6B',
                outlineWidth: 1,
                texture: '',
                friction: 1.2,
                bounciness: 0,
                solid: true,
                smoothing: 1.0
            },
            {
                name: 'Water',
                color: '#4169E1',
                colorVariation: 10,
                secondaryColor: '#1E90FF',
                blendMode: 'gradient',
                pattern: 'waves',
                patternColor: '#6495ED',
                patternSize: 8,
                patternDensity: 0.3,
                outlineColor: '#000080',
                outlineWidth: 0,
                texture: '',
                friction: 0.3,
                bounciness: 0,
                solid: false,
                smoothing: 1.0
            }
        ];

        // === RENDERING OPTIONS ===
        this.smoothing = 0.5;             // Corner roundness (0 = blocky, 1 = fully rounded/circular)
        this.enableOutlines = true;       // Draw outlines around terrain
        this.globalOutlineColor = '';     // Override per-voxel outline ('' = use voxel type)
        this.globalOutlineWidth = 0;      // Override outline width (0 = use voxel type)
        this.enableBlending = true;       // Blend colors between adjacent voxel types
        this.blendDistance = 0.3;         // How far blending extends (0-1)
        this.enableShadows = true;        // Add subtle shadows for depth
        this.shadowColor = 'rgba(0,0,0,0.2)';
        this.shadowOffset = 2;
        this.pixelPerfect = true;         // Snap to whole pixels
        this.alpha = 1.0;                 // Global opacity
        this.renderMode = 'viewport';     // 'viewport', 'offscreen', 'full'

        // === COLLISION ===
        this.enableCollision = true;
        this.collisionTag = 'terrain';    // Tag for collision queries

        // === GENERATION SEED OPTIONS ===
        this.generationSeed = 0;          // Seed for terrain generation (0 = random)
        this.patternSeed = 0;             // Seed for pattern randomization (0 = random)
        this.useSeededGeneration = false; // If true, use generationSeed instead of random
        this.useSeededPatterns = false;   // If true, use patternSeed instead of random

        // === EDITOR STATE (not serialized) ===
        this._editorMode = 'none';        // 'none', 'paint', 'erase'
        this._selectedVoxelType = 1;      // Currently selected voxel type for painting
        this._brushSize = 1;              // Brush size in voxels
        this._voxelSelectorWindow = null;

        // === CHUNK-BASED RENDER CACHE ===
        // Chunks are small cached canvases for efficient large terrain rendering
        this.chunkSize = 32;              // Size of each chunk in voxels (32x32 voxels per chunk)
        this._chunkCache = new Map();     // Map: "chunkX,chunkY" -> { canvas, ctx, dirty, lastAccess, isEmpty }
        this._dirtyChunks = new Set();    // Set of chunk keys that need re-render
        this._maxCachedChunks = 128;      // Maximum chunks to keep in memory (reduced for large maps)
        this._chunkDisposeDelay = 3000;   // Time before disposing unused chunks (ms)
        this._lastChunkCleanup = 0;       // Last time we cleaned up old chunks
        this._viewportPadding = 1;        // Extra chunks to render around viewport
        this._enableViewportCulling = false; // Only render visible chunks (auto-enabled for large maps)

        // === NOISE GENERATOR (for patterns) ===
        this._noiseSeed = Math.random() * 10000;  // Internal seed (derived from patternSeed or random)

        // === MARCHING SQUARES LOOKUP ===
        // Each case maps to polygon vertices for smooth edges
        this._marchingSquaresCases = this._initMarchingSquares();
    }

    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering';
    static is2D = true;

    static getIcon() {
        return '🧱';
    }

    static getDescription() {
        return 'Optimized 2D voxel terrain with smooth rendering, customizable types, patterns, collision support. Handles massive maps (3000x3000+) via lazy chunk rendering!';
    }

    // ==================== PROPERTY METADATA ====================

    getPropertyMetadata() {
        const voxelCount = this.voxelData.filter(v => v > 0).length;
        const totalVoxels = this.gridWidth * this.gridHeight;
        const fillPercent = totalVoxels > 0 ? Math.round((voxelCount / totalVoxels) * 100) : 0;

        // Calculate chunk info
        const { chunksX, chunksY } = this._getChunkGridSize();
        const totalChunks = chunksX * chunksY;
        const cachedChunks = this._chunkCache ? this._chunkCache.size : 0;

        return [
            // === TERRAIN SIZE ===
            { type: 'header', label: '🗺️ Terrain Configuration' },
            { type: 'hint', label: `${voxelCount.toLocaleString()} / ${totalVoxels.toLocaleString()} voxels filled (${fillPercent}%)` },
            { type: 'hint', label: `📦 ${cachedChunks} / ${totalChunks} chunks (${chunksX}×${chunksY} grid, lazy-rendered)` },
            { type: 'groupStart', label: '📐 Grid Size' },
            { key: 'gridWidth', type: 'number', label: 'Width (voxels)', default: 32, min: 4, max: 8192, hint: 'Supports up to 8192+ with lazy rendering!' },
            { key: 'gridHeight', type: 'number', label: 'Height (voxels)', default: 24, min: 4, max: 8192, hint: 'Supports up to 8192+ with lazy rendering!' },
            { key: 'voxelSize', type: 'number', label: 'Voxel Size (px)', default: 16, min: 4, max: 128 },
            { key: 'chunkSize', type: 'number', label: 'Chunk Size (voxels)', default: 32, min: 8, max: 128, hint: 'Larger = fewer chunks, smaller = better culling' },
            { type: 'groupEnd' },

            // === VOXEL TYPES ===
            { type: 'header', label: '🎨 Voxel Types' },
            {
                key: 'voxelTypes',
                type: 'arrayGroup',
                label: 'Voxel Types',
                itemLabel: (item, index) => `${index + 1}. ${item.name || 'Voxel'}`,
                minItems: 1,
                itemProperties: [
                    { key: 'name', type: 'text', label: '📛 Name', default: 'New Voxel' },
                    // Colors
                    { key: 'color', type: 'color', label: '🎨 Primary Color', default: '#808080' },
                    { key: 'colorVariation', type: 'slider', label: 'Color Variation', default: 10, min: 0, max: 50 },
                    { key: 'secondaryColor', type: 'color', label: 'Secondary Color', default: '#606060' },
                    {
                        key: 'blendMode',
                        type: 'select',
                        label: 'Blend Mode',
                        default: 'solid',
                        options: {
                            'solid': '🟫 Solid',
                            'gradient': '🌈 Gradient',
                            'noise': '📺 Noise',
                            'texture': '🖼️ Texture'
                        }
                    },
                    // Pattern
                    {
                        key: 'pattern',
                        type: 'select',
                        label: '✨ Pattern Type',
                        default: 'none',
                        options: {
                            'none': '❌ None',
                            'lines': '═ Lines',
                            'circles': '◯ Circles',
                            'dots': '• Dots',
                            'noise': '📺 Noise',
                            'crosshatch': '╳ Crosshatch',
                            'waves': '〰️ Waves',
                            'bricks': '🧱 Bricks'
                        }
                    },
                    { key: 'patternColor', type: 'color', label: 'Pattern Color', default: '#404040' },
                    { key: 'patternSize', type: 'number', label: 'Pattern Size', default: 4, min: 1, max: 32 },
                    { key: 'patternDensity', type: 'slider', label: 'Pattern Density', default: 0.3, min: 0, max: 1, step: 0.05 },
                    // Outline
                    { key: 'outlineColor', type: 'color', label: '📏 Outline Color', default: '#202020' },
                    { key: 'outlineWidth', type: 'number', label: 'Outline Width', default: 1, min: 0, max: 8 },
                    // Texture
                    { key: 'texture', type: 'image', label: '🖼️ Texture Image', default: '' },
                    // Physics
                    { key: 'friction', type: 'slider', label: '⚙️ Friction', default: 1.0, min: 0, max: 2, step: 0.1 },
                    { key: 'bounciness', type: 'slider', label: 'Bounciness', default: 0, min: 0, max: 1, step: 0.1 },
                    { key: 'solid', type: 'boolean', label: 'Is Solid', default: true },
                    // Smoothing
                    { key: 'smoothing', type: 'slider', label: '🌊 Smoothing', default: 1.0, min: 0, max: 1, step: 0.05, hint: 'Per-type corner roundness multiplier' }
                ]
            },

            // === VOXEL PAINTING ===
            { type: 'header', label: '🖌️ Voxel Painting' },
            { type: 'hint', label: 'Select a voxel type and paint onto the terrain' },
            {
                type: 'button',
                buttonText: '🎨 Select Voxel Type',
                buttonStyle: 'primary',
                tooltip: 'Choose a voxel type to paint',
                onClick: function (module, editor) {
                    module.openVoxelSelector(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🖌️ Paint',
                buttonStyle: 'primary',
                tooltip: 'Enter voxel painting mode',
                onClick: function (module, editor) {
                    module.enterPaintMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🗑️ Erase',
                buttonStyle: 'danger',
                tooltip: 'Enter voxel erase mode',
                onClick: function (module, editor) {
                    module.enterEraseMode(editor);
                }
            },
            {
                type: 'button',
                buttonText: '🧹 Clear All',
                buttonStyle: 'danger',
                tooltip: 'Clear all voxels',
                onClick: function (module, editor) {
                    if (confirm('Clear all voxels from the terrain?')) {
                        module.clearAll();
                        if (editor && editor.markDirty) editor.markDirty();
                    }
                }
            },

            // === GENERATION TOOLS ===
            { type: 'groupStart', label: '⚡ Quick Generate' },
            {
                type: 'button',
                buttonText: '🌄 Generate Hills',
                buttonStyle: 'success',
                tooltip: 'Generate procedural hill terrain',
                onClick: function (module, editor) {
                    module.generateHills();
                    if (editor && editor.markDirty) editor.markDirty();
                }
            },
            {
                type: 'button',
                buttonText: '🏔️ Generate Caves',
                buttonStyle: 'success',
                tooltip: 'Generate procedural cave system',
                onClick: function (module, editor) {
                    module.generateCaves();
                    if (editor && editor.markDirty) editor.markDirty();
                }
            },
            {
                type: 'button',
                buttonText: '🟫 Fill Ground',
                buttonStyle: 'success',
                tooltip: 'Fill bottom half with default voxel',
                onClick: function (module, editor) {
                    module.fillGround();
                    if (editor && editor.markDirty) editor.markDirty();
                }
            },
            { type: 'groupEnd' },

            // === RENDERING OPTIONS ===
            { type: 'groupStart', label: '🎨 Rendering Options' },
            { key: 'smoothing', type: 'slider', label: '🌊 Corner Roundness', default: 0.5, min: 0, max: 1, step: 0.05, hint: '0 = blocky squares, 1 = fully rounded (circle)' },
            { key: 'enableBlending', type: 'boolean', label: '🌈 Enable Blending', default: true, hint: 'Blend colors between adjacent voxel types' },
            { key: 'blendDistance', type: 'slider', label: 'Blend Distance', default: 0.3, min: 0, max: 1, step: 0.05, showIf: { enableBlending: true }, hint: 'How far blending extends into adjacent voxels' },
            { key: 'enableOutlines', type: 'boolean', label: '📏 Enable Outlines', default: true },
            { key: 'globalOutlineColor', type: 'color', label: 'Global Outline Color', default: '', showIf: { enableOutlines: true }, hint: 'Leave empty to use per-voxel colors' },
            { key: 'globalOutlineWidth', type: 'number', label: 'Global Outline Width', default: 0, min: 0, max: 8, showIf: { enableOutlines: true }, hint: '0 = use per-voxel width' },
            { key: 'enableShadows', type: 'boolean', label: '🌑 Enable Shadows', default: true },
            { key: 'shadowColor', type: 'color', label: 'Shadow Color', default: 'rgba(0,0,0,0.2)', showIf: { enableShadows: true } },
            { key: 'shadowOffset', type: 'number', label: 'Shadow Offset', default: 2, min: 0, max: 10, showIf: { enableShadows: true } },
            { key: 'pixelPerfect', type: 'boolean', label: '🔲 Pixel Perfect', default: true },
            { key: 'alpha', type: 'slider', label: 'Opacity', default: 1, min: 0, max: 1, step: 0.01 },
            { type: 'groupEnd' },

            // === PERFORMANCE ===
            { type: 'groupStart', label: '⚡ Performance (Advanced)' },
            { type: 'hint', label: 'Optimizations for large maps' },
            { key: '_enableViewportCulling', type: 'boolean', label: '🔍 Viewport Culling', default: false, hint: 'Only render visible chunks. Auto-enabled for maps >500 chunks.' },
            { key: '_maxCachedChunks', type: 'number', label: '📦 Max Cached Chunks', default: 128, min: 16, max: 512, hint: 'Maximum chunks kept in memory. Lower = less RAM usage' },
            { key: '_viewportPadding', type: 'number', label: '🔲 Viewport Padding', default: 1, min: 0, max: 5, hint: 'Extra chunks rendered around viewport (prevents pop-in)' },
            { type: 'hint', label: `💡 Culling auto-activates for maps >500 chunks (~700×700 voxels)` },
            { type: 'groupEnd' },

            // === COLLISION ===
            { type: 'groupStart', label: '💥 Collision' },
            { key: 'enableCollision', type: 'boolean', label: 'Enable Collision', default: true },
            { key: 'collisionTag', type: 'text', label: 'Collision Tag', default: 'terrain', showIf: { enableCollision: true } },
            { type: 'groupEnd' },

            // === SEED & RANDOMIZATION ===
            { type: 'groupStart', label: '🎲 Seed & Randomization' },
            { type: 'hint', label: 'Control randomness for reproducible terrain' },
            { key: 'useSeededGeneration', type: 'boolean', label: '🔒 Use Seeded Generation', default: false, hint: 'Use a fixed seed for terrain generation' },
            { key: 'generationSeed', type: 'number', label: 'Generation Seed', default: 0, min: 0, max: 999999, showIf: { useSeededGeneration: true }, hint: 'Seed value for terrain generation' },
            { key: 'useSeededPatterns', type: 'boolean', label: '🎨 Use Seeded Patterns', default: false, hint: 'Use a fixed seed for pattern decoration' },
            { key: 'patternSeed', type: 'number', label: 'Pattern Seed', default: 0, min: 0, max: 999999, showIf: { useSeededPatterns: true }, hint: 'Seed value for pattern randomization' },
            {
                type: 'button',
                buttonText: '🎲 Randomize Seeds',
                buttonStyle: 'success',
                tooltip: 'Generate new random seed values',
                onClick: function (module, editor) {
                    module.generationSeed = Math.floor(Math.random() * 999999);
                    module.patternSeed = Math.floor(Math.random() * 999999);
                    module._updateNoiseSeed();
                    module._invalidateAllChunks();
                    if (editor && editor.markDirty) editor.markDirty();
                    if (editor && editor.refreshPanel) editor.refreshPanel();
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification(`🎲 Seeds randomized: Gen=${module.generationSeed}, Pattern=${module.patternSeed}`);
                    }
                }
            },
            {
                type: 'button',
                buttonText: '🔄 Apply Pattern Seed',
                buttonStyle: 'primary',
                tooltip: 'Re-apply pattern seed to refresh decorations',
                onClick: function (module, editor) {
                    module._updateNoiseSeed();
                    module._invalidateAllChunks();
                    if (editor && editor.markDirty) editor.markDirty();
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('🎨 Pattern seed applied!');
                    }
                }
            },
            { type: 'groupEnd' }
        ];
    }

    // ==================== LIFECYCLE METHODS ====================

    start() {
        // Initialize voxel data if empty
        if (this.voxelData.length === 0) {
            this.initializeVoxelData();
        }

        // Initialize pattern noise seed
        this._updateNoiseSeed();

        // NOTE: Chunks are now rendered lazily on-demand for better performance
        // No pre-rendering needed - this allows maps of any size!
    }

    /**
     * Update the internal noise seed based on pattern seed settings
     */
    _updateNoiseSeed() {
        if (this.useSeededPatterns && this.patternSeed > 0) {
            this._noiseSeed = this.patternSeed;
        } else if (!this.useSeededPatterns) {
            // Only randomize if we're not using seeded patterns
            this._noiseSeed = Math.random() * 10000;
        }
    }

    /**
     * Invalidate all chunks to force re-render
     */
    _invalidateAllChunks() {
        const { chunksX, chunksY } = this._getChunkGridSize();
        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                this._markChunkDirty(cx, cy);
            }
        }
    }

    /**
     * Get a seeded random number generator
     * @param {number} seed - The seed value
     * @returns {function} A function that returns pseudo-random numbers 0-1
     */
    _createSeededRandom(seed) {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    loop(deltaTime) {
        // Nothing needed per-frame for static terrain
    }

    /**
     * Pre-render all chunks to their canvases
     * DEPRECATED: For backwards compatibility only. Use lazy rendering instead.
     * Only call this for small maps (< 1000x1000) if you need everything pre-cached.
     */
    _preRenderAllChunks() {
        const { chunksX, chunksY } = this._getChunkGridSize();
        const totalChunks = chunksX * chunksY;
        
        // Safety check: don't pre-render massive maps
        if (totalChunks > 500) {
            console.warn(`VoxelTerrain2D: Skipping pre-render of ${totalChunks} chunks for large map. Using lazy rendering.`);
            return;
        }

        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                this._renderChunk(cx, cy);
            }
        }
    }

    /**
     * Cleanup when module/gameObject is destroyed
     */
    onDestroy() {
        // Close voxel selector window if open
        if (this._voxelSelectorWindow) {
            try {
                this._voxelSelectorWindow.close();
            } catch (e) { /* already closed */ }
            this._voxelSelectorWindow = null;
        }

        // Dispose all chunk canvases
        this._disposeAllChunks();

        // Clear data references
        this.voxelData = [];
    }

    /**
     * Dispose all cached chunks and release memory
     */
    _disposeAllChunks() {
        for (const [key, chunk] of this._chunkCache) {
            if (chunk.canvas) {
                if (chunk.ctx) chunk.ctx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);
                chunk.canvas.width = 0;
                chunk.canvas.height = 0;
                chunk.canvas = null;
                chunk.ctx = null;
            }
        }
        this._chunkCache.clear();
        this._dirtyChunks.clear();
    }

    /**
     * Get chunk coordinates from voxel coordinates
     */
    _getChunkCoords(voxelX, voxelY) {
        return {
            chunkX: Math.floor(voxelX / this.chunkSize),
            chunkY: Math.floor(voxelY / this.chunkSize)
        };
    }

    /**
     * Get chunk key for cache storage
     */
    _getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    /**
     * Get or create a chunk at the specified chunk coordinates
     */
    _getOrCreateChunk(chunkX, chunkY) {
        const key = this._getChunkKey(chunkX, chunkY);
        let chunk = this._chunkCache.get(key);

        if (!chunk) {
            // Create new chunk
            const chunkPixelSize = this.chunkSize * this.voxelSize;
            const canvas = document.createElement('canvas');
            canvas.width = chunkPixelSize;
            canvas.height = chunkPixelSize;
            const ctx = canvas.getContext('2d');

            chunk = {
                canvas,
                ctx,
                dirty: true,
                lastAccess: performance.now(),
                chunkX,
                chunkY
            };

            this._chunkCache.set(key, chunk);
            this._dirtyChunks.add(key);
        }

        chunk.lastAccess = performance.now();
        return chunk;
    }

    /**
     * Mark a chunk as dirty (needs re-render)
     */
    _markChunkDirty(chunkX, chunkY) {
        const key = this._getChunkKey(chunkX, chunkY);
        const chunk = this._chunkCache.get(key);
        if (chunk) {
            chunk.dirty = true;
        }
        this._dirtyChunks.add(key);
    }

    /**
     * Mark all chunks containing a voxel region as dirty
     */
    _markVoxelRegionDirty(voxelX, voxelY, width = 1, height = 1) {
        const startChunk = this._getChunkCoords(voxelX - 1, voxelY - 1); // -1 for neighbor effect
        const endChunk = this._getChunkCoords(voxelX + width, voxelY + height);

        for (let cy = startChunk.chunkY; cy <= endChunk.chunkY; cy++) {
            for (let cx = startChunk.chunkX; cx <= endChunk.chunkX; cx++) {
                this._markChunkDirty(cx, cy);
            }
        }
    }

    /**
     * Clean up old unused chunks to free memory
     */
    _cleanupOldChunks() {
        const now = performance.now();

        // Only run cleanup periodically
        if (now - this._lastChunkCleanup < 1000) return;
        this._lastChunkCleanup = now;

        // If under limit, no cleanup needed
        if (this._chunkCache.size <= this._maxCachedChunks) return;

        // Sort chunks by last access time
        const entries = [...this._chunkCache.entries()];
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        // Remove oldest chunks until under limit
        const toRemove = this._chunkCache.size - this._maxCachedChunks + 16; // Remove some extra buffer
        let removed = 0;
        
        for (let i = 0; i < entries.length && removed < toRemove; i++) {
            const [key, chunk] = entries[i];

            // Don't remove chunks accessed very recently
            if (now - chunk.lastAccess < this._chunkDisposeDelay) continue;

            // Dispose chunk
            if (chunk.canvas) {
                if (chunk.ctx) chunk.ctx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);
                chunk.canvas.width = 0;
                chunk.canvas.height = 0;
                chunk.canvas = null;
                chunk.ctx = null;
            }

            this._chunkCache.delete(key);
            this._dirtyChunks.delete(key);
            removed++;
        }
    }

    /**
     * Get the number of chunks in each dimension
     */
    _getChunkGridSize() {
        return {
            chunksX: Math.ceil(this.gridWidth / this.chunkSize),
            chunksY: Math.ceil(this.gridHeight / this.chunkSize)
        };
    }

    /**
     * Render a specific chunk to its canvas
     */
    _renderChunk(chunkX, chunkY) {
        const chunk = this._getOrCreateChunk(chunkX, chunkY);
        if (!chunk.dirty) return chunk;

        const ctx = chunk.ctx;
        const vs = this.voxelSize;
        const cs = this.chunkSize;
        const chunkPixelSize = cs * vs;

        // Clear chunk
        ctx.clearRect(0, 0, chunkPixelSize, chunkPixelSize);

        // Calculate voxel range for this chunk
        const startVoxelX = chunkX * cs;
        const startVoxelY = chunkY * cs;
        const endVoxelX = Math.min(startVoxelX + cs, this.gridWidth);
        const endVoxelY = Math.min(startVoxelY + cs, this.gridHeight);

        // Group voxels by type for batched rendering
        const voxelsByType = new Map();
        let hasVoxels = false;

        for (let y = startVoxelY; y < endVoxelY; y++) {
            for (let x = startVoxelX; x < endVoxelX; x++) {
                const voxelType = this.getVoxelAt(x, y);
                if (voxelType <= 0) continue;

                hasVoxels = true;
                if (!voxelsByType.has(voxelType)) {
                    voxelsByType.set(voxelType, []);
                }
                voxelsByType.get(voxelType).push({ x, y });
            }
        }

        // Mark chunk as empty if no voxels found (optimization)
        chunk.isEmpty = !hasVoxels;
        if (!hasVoxels) {
            chunk.dirty = false;
            this._dirtyChunks.delete(this._getChunkKey(chunkX, chunkY));
            return chunk;
        }

        // Render shadows first (all types)
        if (this.enableShadows) {
            ctx.fillStyle = this.shadowColor;
            for (const [typeIndex, voxels] of voxelsByType) {
                const type = this.voxelTypes[typeIndex - 1];
                if (!type || !type.solid) continue;

                // Get per-type smoothing (default 1.0 if not set)
                const typeSmoothing = type.smoothing ?? 1.0;

                for (const { x, y } of voxels) {
                    // Convert to local chunk coordinates
                    const px = (x - startVoxelX) * vs + this.shadowOffset;
                    const py = (y - startVoxelY) * vs + this.shadowOffset;

                    if (this.smoothing > 0 && typeSmoothing > 0) {
                        const corners = this._getCornerRadii(x, y, this.smoothing, vs / 2, typeSmoothing);
                        this._fillRoundedRect(ctx, px, py, vs, vs, corners);
                    } else {
                        ctx.fillRect(px, py, vs, vs);
                    }
                }
            }
        }

        // Render fills by type (batched by color)
        for (const [typeIndex, voxels] of voxelsByType) {
            const type = this.voxelTypes[typeIndex - 1];
            if (!type) continue;

            // Get per-type smoothing (default 1.0 if not set)
            const typeSmoothing = type.smoothing ?? 1.0;
            const effectiveSmoothing = this.smoothing * typeSmoothing;

            for (const { x, y } of voxels) {
                // Convert to local chunk coordinates
                const px = (x - startVoxelX) * vs;
                const py = (y - startVoxelY) * vs;

                // Get color with variation
                const fillColor = this._getVoxelColor(type, x, y);
                ctx.fillStyle = fillColor;

                if (effectiveSmoothing > 0) {
                    const corners = this._getCornerRadii(x, y, this.smoothing, vs / 2, typeSmoothing);
                    this._fillRoundedRect(ctx, px, py, vs, vs, corners);

                    // Draw corner fills to close diagonal gaps
                    this._drawCornerFills(ctx, px, py, vs, x, y, fillColor, effectiveSmoothing);

                    // Draw pattern overlay with rounded clipping
                    if (type.pattern && type.pattern !== 'none') {
                        this._drawPattern(ctx, px, py, vs, vs, type, x, y, corners);
                    }
                } else {
                    ctx.fillRect(px, py, vs, vs);

                    // Draw pattern overlay with square clipping
                    if (type.pattern && type.pattern !== 'none') {
                        this._drawPattern(ctx, px, py, vs, vs, type, x, y, null);
                    }
                }

                // Draw blending effects
                if (this.enableBlending) {
                    this._drawBlendingEffects(ctx, px, py, vs, vs, x, y, type);
                }
            }
        }

        // Render outlines (batched by type)
        if (this.enableOutlines) {
            for (const [typeIndex, voxels] of voxelsByType) {
                const type = this.voxelTypes[typeIndex - 1];
                if (!type) continue;

                const outlineWidth = this.globalOutlineWidth || type.outlineWidth;
                if (outlineWidth <= 0) continue;

                ctx.strokeStyle = this.globalOutlineColor || type.outlineColor;
                ctx.lineWidth = outlineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Batch all outlines into one path
                ctx.beginPath();

                // Get per-type smoothing for outlines
                const typeSmoothing = type.smoothing ?? 1.0;
                const effectiveSmoothing = this.smoothing * typeSmoothing;

                for (const { x, y } of voxels) {
                    // Convert to local chunk coordinates
                    const px = (x - startVoxelX) * vs;
                    const py = (y - startVoxelY) * vs;

                    // Check neighbors
                    const top = this.getVoxelAt(x, y - 1) > 0;
                    const bottom = this.getVoxelAt(x, y + 1) > 0;
                    const left = this.getVoxelAt(x - 1, y) > 0;
                    const right = this.getVoxelAt(x + 1, y) > 0;

                    if (effectiveSmoothing > 0) {
                        const corners = this._getCornerRadii(x, y, this.smoothing, vs / 2, typeSmoothing);
                        this._traceOutlineEdges(ctx, px, py, vs, corners, top, bottom, left, right);
                    } else {
                        // Blocky outlines
                        if (!top) { ctx.moveTo(px, py); ctx.lineTo(px + vs, py); }
                        if (!right) { ctx.moveTo(px + vs, py); ctx.lineTo(px + vs, py + vs); }
                        if (!bottom) { ctx.moveTo(px + vs, py + vs); ctx.lineTo(px, py + vs); }
                        if (!left) { ctx.moveTo(px, py + vs); ctx.lineTo(px, py); }
                    }
                }

                ctx.stroke();
            }
        }

        chunk.dirty = false;
        this._dirtyChunks.delete(this._getChunkKey(chunkX, chunkY));

        return chunk;
    }

    /**
     * Get visible chunk range based on viewport
     */
    _getVisibleChunkRange(engine) {
        if (!engine || !this.gameObject) {
            // No engine/viewport - return all chunks
            const { chunksX, chunksY } = this._getChunkGridSize();
            return { minCX: 0, minCY: 0, maxCX: chunksX - 1, maxCY: chunksY - 1 };
        }

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const vs = this.voxelSize;
        const cs = this.chunkSize;
        const chunkPixelSize = cs * vs; // Size in local pixel coordinates
        const chunkWorldSize = chunkPixelSize * objScale.x; // Size in world coordinates (assume uniform scale)

        // Get viewport bounds in world space
        let viewLeft, viewTop, viewRight, viewBottom;

        if (engine.camera) {
            const cam = engine.camera;
            const viewWidth = (engine.width || 800) / cam.zoom;
            const viewHeight = (engine.height || 600) / cam.zoom;
            viewLeft = cam.x - viewWidth / 2;
            viewTop = cam.y - viewHeight / 2;
            viewRight = cam.x + viewWidth / 2;
            viewBottom = cam.y + viewHeight / 2;
        } else {
            // Fallback: use engine dimensions centered at origin
            const w = engine.width || 800;
            const h = engine.height || 600;
            viewLeft = -w / 2;
            viewTop = -h / 2;
            viewRight = w / 2;
            viewBottom = h / 2;
        }

        // Convert viewport bounds to local terrain coordinates (in pixels)
        const localLeft = (viewLeft - objPos.x) / objScale.x;
        const localTop = (viewTop - objPos.y) / objScale.y;
        const localRight = (viewRight - objPos.x) / objScale.x;
        const localBottom = (viewBottom - objPos.y) / objScale.y;

        // Convert to chunk coordinates with padding
        const pad = this._viewportPadding;
        const minCX = Math.max(0, Math.floor(localLeft / chunkPixelSize) - pad);
        const minCY = Math.max(0, Math.floor(localTop / chunkPixelSize) - pad);
        const { chunksX, chunksY } = this._getChunkGridSize();
        const maxCX = Math.min(chunksX - 1, Math.ceil(localRight / chunkPixelSize) + pad);
        const maxCY = Math.min(chunksY - 1, Math.ceil(localBottom / chunkPixelSize) + pad);

        return { minCX, minCY, maxCX, maxCY };
    }

    // ==================== DRAWING ====================

    draw(ctx) {
        const engine = this.gameObject._engine;
        const isEditing = this.gameObject.isEditing;

        ctx.imageSmoothingEnabled = false;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= this.alpha;

        ctx.save();

        const vs = this.voxelSize;
        const cs = this.chunkSize;
        const chunkPixelSize = cs * vs;
        const { chunksX, chunksY } = this._getChunkGridSize();
        const totalChunks = chunksX * chunksY;

        // Determine which chunks to render
        let minCX = 0, minCY = 0, maxCX = chunksX - 1, maxCY = chunksY - 1;
        
        // Auto-enable viewport culling for large maps (>500 chunks) OR if manually enabled
        const shouldCull = this._enableViewportCulling || totalChunks > 500;
        
        // Use viewport culling for large maps (but not in editor mode)
        if (shouldCull && !isEditing) {
            const visibleRange = this._getVisibleChunkRange(engine);
            minCX = visibleRange.minCX;
            minCY = visibleRange.minCY;
            maxCX = visibleRange.maxCX;
            maxCY = visibleRange.maxCY;
        }

        // Render visible chunks only
        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                // Get or create chunk (lazy initialization)
                const chunk = this._getOrCreateChunk(cx, cy);

                // Render if dirty or never rendered
                if (chunk.dirty) {
                    this._renderChunk(cx, cy);
                }

                // Skip drawing empty chunks
                if (chunk.isEmpty) continue;

                // Calculate chunk position in local space
                const chunkPosX = cx * chunkPixelSize;
                const chunkPosY = cy * chunkPixelSize;

                // Draw the chunk
                if (chunk && chunk.canvas) {
                    ctx.drawImage(chunk.canvas, chunkPosX, chunkPosY);
                }
            }
        }

        // Cleanup old chunks periodically (for large maps)
        this._cleanupOldChunks();

        // Draw editor overlays
        if (isEditing) {
            this._drawEditorGrid(ctx);
            this._drawEditorHighlight(ctx);
        }

        ctx.restore();
        ctx.globalAlpha = prevAlpha;
    }

    /**
     * Fill a rounded rect (fast version - single path)
     */
    _fillRoundedRect(ctx, x, y, w, h, corners) {
        const { tl, tr, bl, br } = corners;

        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + w - tr, y);
        if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr);
        else ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - br);
        if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
        else ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + bl, y + h);
        if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl);
        else ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + tl);
        if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl);
        else ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Trace outline edges for rounded voxel (adds to current path)
     */
    _traceOutlineEdges(ctx, px, py, vs, corners, top, bottom, left, right) {
        const { tl, tr, bl, br } = corners;

        // Top edge
        if (!top) {
            ctx.moveTo(px + tl, py);
            ctx.lineTo(px + vs - tr, py);
        }

        // Top-right corner
        if (tr > 0 && (!top || !right)) {
            ctx.moveTo(px + vs - tr, py);
            ctx.arc(px + vs - tr, py + tr, tr, -Math.PI / 2, 0);
        }

        // Right edge
        if (!right) {
            ctx.moveTo(px + vs, py + tr);
            ctx.lineTo(px + vs, py + vs - br);
        }

        // Bottom-right corner
        if (br > 0 && (!bottom || !right)) {
            ctx.moveTo(px + vs, py + vs - br);
            ctx.arc(px + vs - br, py + vs - br, br, 0, Math.PI / 2);
        }

        // Bottom edge
        if (!bottom) {
            ctx.moveTo(px + vs - br, py + vs);
            ctx.lineTo(px + bl, py + vs);
        }

        // Bottom-left corner
        if (bl > 0 && (!bottom || !left)) {
            ctx.moveTo(px + bl, py + vs);
            ctx.arc(px + bl, py + vs - bl, bl, Math.PI / 2, Math.PI);
        }

        // Left edge
        if (!left) {
            ctx.moveTo(px, py + vs - bl);
            ctx.lineTo(px, py + tl);
        }

        // Top-left corner
        if (tl > 0 && (!top || !left)) {
            ctx.moveTo(px, py + tl);
            ctx.arc(px + tl, py + tl, tl, Math.PI, Math.PI * 1.5);
        }
    }

    /**
     * Get voxel color with variation
     */
    _getVoxelColor(type, x, y) {
        if (type.colorVariation === 0) return type.color;

        // Use deterministic noise for consistent color variation
        const noise = this._deterministicNoise(x * 17 + y * 31 + this._noiseSeed);
        const variation = (noise - 0.5) * 2 * type.colorVariation;

        return this._adjustColorBrightness(type.color, variation);
    }

    /**
     * Draw pattern overlay on voxel with proper clipping for rounded corners
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} px - Pixel X position in chunk
     * @param {number} py - Pixel Y position in chunk 
     * @param {number} w - Width of voxel
     * @param {number} h - Height of voxel
     * @param {Object} type - Voxel type definition
     * @param {number} gridX - Grid X coordinate (world space)
     * @param {number} gridY - Grid Y coordinate (world space)
     * @param {Object|null} corners - Corner radii { tl, tr, bl, br } for clipping, or null for square
     */
    _drawPattern(ctx, px, py, w, h, type, gridX, gridY, corners) {
        if (type.pattern === 'none') return;

        ctx.save();

        // Clip to the voxel shape (rounded or square)
        ctx.beginPath();
        if (corners && (corners.tl > 0 || corners.tr > 0 || corners.bl > 0 || corners.br > 0)) {
            this._traceRoundedRect(ctx, px, py, w, h, corners);
        } else {
            ctx.rect(px, py, w, h);
        }
        ctx.clip();

        const patternColor = type.patternColor;
        const size = type.patternSize;
        const density = type.patternDensity;

        ctx.fillStyle = patternColor;
        ctx.strokeStyle = patternColor;
        ctx.lineWidth = 1;

        // Calculate world pixel offset for pattern alignment across blocks
        const worldPxX = gridX * w;
        const worldPxY = gridY * h;

        switch (type.pattern) {
            case 'lines':
                // Lines should align across blocks - use world coordinates for consistent positioning
                ctx.globalAlpha = density;
                const lineSpacing = size * 2;
                // Calculate the starting offset based on world position to ensure alignment
                const lineOffset = (worldPxX + worldPxY) % lineSpacing;
                // Draw lines that extend beyond the block for proper alignment
                for (let i = -w - lineOffset; i < w + h + lineSpacing; i += lineSpacing) {
                    ctx.beginPath();
                    ctx.moveTo(px + i, py);
                    ctx.lineTo(px + i - h, py + h);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;

            case 'circles':
                const numCircles = Math.floor(w * h * density / (size * size * 10));
                for (let i = 0; i < numCircles; i++) {
                    const cx = px + this._deterministicNoise(gridX * 100 + gridY * 200 + i + this._noiseSeed) * w;
                    const cy = py + this._deterministicNoise(gridX * 300 + gridY * 400 + i + this._noiseSeed) * h;
                    const r = size * (0.5 + this._deterministicNoise(gridX * 500 + gridY * 600 + i + this._noiseSeed) * 0.5);
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'dots':
                // Dots aligned to world grid for consistency
                const dotStartX = -((worldPxX % size) + size) % size;
                const dotStartY = -((worldPxY % size) + size) % size;
                for (let dy = dotStartY; dy < h + size; dy += size) {
                    for (let dx = dotStartX; dx < w + size; dx += size) {
                        const worldDotX = worldPxX + dx;
                        const worldDotY = worldPxY + dy;
                        if (this._deterministicNoise(worldDotX * 17 + worldDotY * 31 + this._noiseSeed) < density) {
                            ctx.fillRect(px + dx, py + dy, Math.max(1, size / 4), Math.max(1, size / 4));
                        }
                    }
                }
                break;

            case 'noise':
                ctx.globalAlpha = density;
                for (let dy = 0; dy < h; dy += 2) {
                    for (let dx = 0; dx < w; dx += 2) {
                        const n = this._deterministicNoise(worldPxX + dx + (worldPxY + dy) * 1000 + this._noiseSeed);
                        if (n > 0.5) {
                            ctx.fillRect(px + dx, py + dy, 2, 2);
                        }
                    }
                }
                ctx.globalAlpha = 1;
                break;

            case 'crosshatch':
                // Aligned crosshatch using world coordinates
                ctx.globalAlpha = density;
                const crossOffset1 = (worldPxX + worldPxY) % size;
                const crossOffset2 = (worldPxX - worldPxY + size * 100) % size;
                // Forward diagonal lines
                for (let i = -w - crossOffset1; i < w + h + size; i += size) {
                    ctx.beginPath();
                    ctx.moveTo(px + i, py);
                    ctx.lineTo(px + i - h, py + h);
                    ctx.stroke();
                }
                // Backward diagonal lines
                for (let i = -crossOffset2; i < w + h + size; i += size) {
                    ctx.beginPath();
                    ctx.moveTo(px + w - i, py);
                    ctx.lineTo(px + w - i + h, py + h);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;

            case 'waves':
                // Waves extend continuously across blocks using world coordinates
                ctx.globalAlpha = density;
                const waveAmplitude = size / 2;
                const waveFrequency = size;
                // Calculate wave vertical offset based on world position for alignment
                const waveVertOffset = worldPxY % size;
                for (let i = -waveVertOffset; i < h + size; i += size) {
                    ctx.beginPath();
                    // Start from before the block to ensure continuity
                    const startX = -4;
                    const worldStartX = worldPxX + startX;
                    const startWaveY = i + Math.sin(worldStartX / waveFrequency * Math.PI) * waveAmplitude;
                    ctx.moveTo(px + startX, py + startWaveY);
                    // Draw wave across and beyond the block
                    for (let j = startX; j <= w + 4; j += 2) {
                        const worldX = worldPxX + j;
                        const waveY = i + Math.sin(worldX / waveFrequency * Math.PI) * waveAmplitude;
                        ctx.lineTo(px + j, py + waveY);
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;

            case 'bricks':
                // Bricks aligned to world grid
                ctx.strokeStyle = patternColor;
                ctx.lineWidth = 1;
                const brickH = size;
                const brickW = size * 2;
                // Calculate offset based on world position
                const brickOffsetX = worldPxX % brickW;
                const brickOffsetY = worldPxY % brickH;
                const worldRow = Math.floor(worldPxY / brickH);

                for (let row = -1; row <= Math.ceil(h / brickH) + 1; row++) {
                    const actualRow = worldRow + row;
                    const rowOffset = (actualRow % 2) * (brickW / 2);
                    const startY = row * brickH - brickOffsetY;

                    for (let col = -2; col <= Math.ceil(w / brickW) + 2; col++) {
                        const startX = col * brickW - brickOffsetX + rowOffset;
                        ctx.strokeRect(px + startX, py + startY, brickW, brickH);
                    }
                }
                break;
        }

        ctx.restore();
    }

    /**
     * Draw blending effects between different voxel types
     * Includes cardinal directions and diagonal corners
     */
    _drawBlendingEffects(ctx, px, py, w, h, gridX, gridY, type) {
        const blend = this.blendDistance;
        const currentType = this.getVoxelAt(gridX, gridY);
        const blendSize = w * blend;

        // Check cardinal neighbors and blend if different
        const cardinalNeighbors = [
            { dx: -1, dy: 0, side: 'left' },
            { dx: 1, dy: 0, side: 'right' },
            { dx: 0, dy: -1, side: 'top' },
            { dx: 0, dy: 1, side: 'bottom' }
        ];

        for (const n of cardinalNeighbors) {
            const neighborType = this.getVoxelAt(gridX + n.dx, gridY + n.dy);
            if (neighborType > 0 && neighborType !== currentType) {
                const neighborDef = this.voxelTypes[neighborType - 1];
                if (neighborDef) {
                    let grad;

                    ctx.save();
                    ctx.globalAlpha = 0.3;

                    switch (n.side) {
                        case 'left':
                            grad = ctx.createLinearGradient(px, py, px + blendSize, py);
                            grad.addColorStop(0, neighborDef.color);
                            grad.addColorStop(1, 'transparent');
                            ctx.fillStyle = grad;
                            ctx.fillRect(px, py, blendSize, h);
                            break;
                        case 'right':
                            grad = ctx.createLinearGradient(px + w - blendSize, py, px + w, py);
                            grad.addColorStop(0, 'transparent');
                            grad.addColorStop(1, neighborDef.color);
                            ctx.fillStyle = grad;
                            ctx.fillRect(px + w - blendSize, py, blendSize, h);
                            break;
                        case 'top':
                            grad = ctx.createLinearGradient(px, py, px, py + blendSize);
                            grad.addColorStop(0, neighborDef.color);
                            grad.addColorStop(1, 'transparent');
                            ctx.fillStyle = grad;
                            ctx.fillRect(px, py, w, blendSize);
                            break;
                        case 'bottom':
                            grad = ctx.createLinearGradient(px, py + h - blendSize, px, py + h);
                            grad.addColorStop(0, 'transparent');
                            grad.addColorStop(1, neighborDef.color);
                            ctx.fillStyle = grad;
                            ctx.fillRect(px, py + h - blendSize, w, blendSize);
                            break;
                    }

                    ctx.restore();
                }
            }
        }

        // Check diagonal neighbors for corner blending
        const diagonalNeighbors = [
            { dx: -1, dy: -1, corner: 'tl' },  // top-left
            { dx: 1, dy: -1, corner: 'tr' },   // top-right
            { dx: -1, dy: 1, corner: 'bl' },   // bottom-left
            { dx: 1, dy: 1, corner: 'br' }     // bottom-right
        ];

        for (const d of diagonalNeighbors) {
            const diagonalType = this.getVoxelAt(gridX + d.dx, gridY + d.dy);
            // Blend diagonal corner if it's a different type
            // This smooths the visual transition at corner junctions
            if (diagonalType > 0 && diagonalType !== currentType) {
                const diagonalDef = this.voxelTypes[diagonalType - 1];
                if (diagonalDef) {
                    ctx.save();
                    ctx.globalAlpha = 0.25;

                    // Create radial gradient for corner
                    let centerX, centerY;
                    switch (d.corner) {
                        case 'tl':
                            centerX = px;
                            centerY = py;
                            break;
                        case 'tr':
                            centerX = px + w;
                            centerY = py;
                            break;
                        case 'bl':
                            centerX = px;
                            centerY = py + h;
                            break;
                        case 'br':
                            centerX = px + w;
                            centerY = py + h;
                            break;
                    }

                    const grad = ctx.createRadialGradient(
                        centerX, centerY, 0,
                        centerX, centerY, blendSize
                    );
                    grad.addColorStop(0, diagonalDef.color);
                    grad.addColorStop(1, 'transparent');

                    ctx.fillStyle = grad;
                    // Draw a quarter circle area for the corner blend
                    ctx.beginPath();
                    let startAngle, endAngle;
                    switch (d.corner) {
                        case 'tl': startAngle = 0; endAngle = Math.PI / 2; break;
                        case 'tr': startAngle = Math.PI / 2; endAngle = Math.PI; break;
                        case 'bl': startAngle = -Math.PI / 2; endAngle = 0; break;
                        case 'br': startAngle = Math.PI; endAngle = Math.PI * 1.5; break;
                    }
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, blendSize, startAngle, endAngle);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }
            }
        }
    }

    /**
     * Draw outline only on edges
     */
    _drawVoxelOutline(ctx, gridX, gridY, px, py, vs, currentType) {
        const left = this.getVoxelAt(gridX - 1, gridY);
        const right = this.getVoxelAt(gridX + 1, gridY);
        const top = this.getVoxelAt(gridX, gridY - 1);
        const bottom = this.getVoxelAt(gridX, gridY + 1);

        ctx.beginPath();

        if (left !== currentType) {
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + vs);
        }
        if (right !== currentType) {
            ctx.moveTo(px + vs, py);
            ctx.lineTo(px + vs, py + vs);
        }
        if (top !== currentType) {
            ctx.moveTo(px, py);
            ctx.lineTo(px + vs, py);
        }
        if (bottom !== currentType) {
            ctx.moveTo(px, py + vs);
            ctx.lineTo(px + vs, py + vs);
        }

        ctx.stroke();
    }

    /**
     * Calculate corner radii based on neighboring voxels
     * Returns { tl, tr, bl, br } with radius values
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @param {number} roundness - Global roundness setting (0-1)
     * @param {number} maxRadius - Maximum radius in pixels
     * @param {number} typeSmoothing - Per-type smoothing multiplier (0-1, default 1)
     */
    _getCornerRadii(x, y, roundness, maxRadius, typeSmoothing = 1.0) {
        // Check all 8 neighbors
        const top = this.getVoxelAt(x, y - 1) > 0;
        const bottom = this.getVoxelAt(x, y + 1) > 0;
        const left = this.getVoxelAt(x - 1, y) > 0;
        const right = this.getVoxelAt(x + 1, y) > 0;
        const topLeft = this.getVoxelAt(x - 1, y - 1) > 0;
        const topRight = this.getVoxelAt(x + 1, y - 1) > 0;
        const bottomLeft = this.getVoxelAt(x - 1, y + 1) > 0;
        const bottomRight = this.getVoxelAt(x + 1, y + 1) > 0;

        // Combine global roundness with per-type smoothing
        const effectiveRoundness = roundness * typeSmoothing;
        const radius = maxRadius * effectiveRoundness;

        // A corner is rounded if it faces empty space (no neighbors in that direction)
        // A corner needs rounding if: no diagonal neighbor AND (no horizontal OR no vertical neighbor)
        return {
            tl: (!topLeft && !top && !left) ? radius : 0,
            tr: (!topRight && !top && !right) ? radius : 0,
            bl: (!bottomLeft && !bottom && !left) ? radius : 0,
            br: (!bottomRight && !bottom && !right) ? radius : 0
        };
    }

    /**
     * Get corner fill configurations for diagonal neighbors
     * Returns an array of corner fills needed at this voxel position
     * A corner fill is needed when there's a diagonal neighbor but no adjacent neighbors
     */
    _getCornerFills(x, y) {
        const currentType = this.getVoxelAt(x, y);
        if (currentType <= 0) return [];

        const fills = [];

        // Check all 8 neighbors
        const top = this.getVoxelAt(x, y - 1);
        const bottom = this.getVoxelAt(x, y + 1);
        const left = this.getVoxelAt(x - 1, y);
        const right = this.getVoxelAt(x + 1, y);
        const topLeft = this.getVoxelAt(x - 1, y - 1);
        const topRight = this.getVoxelAt(x + 1, y - 1);
        const bottomLeft = this.getVoxelAt(x - 1, y + 1);
        const bottomRight = this.getVoxelAt(x + 1, y + 1);

        // Top-left corner fill: diagonal exists but no top and no left neighbor
        // This fills the gap between this voxel's TL corner and the diagonal voxel's BR corner
        if (topLeft > 0 && top <= 0 && left <= 0) {
            fills.push({ corner: 'tl', diagonalType: topLeft });
        }

        // Top-right corner fill
        if (topRight > 0 && top <= 0 && right <= 0) {
            fills.push({ corner: 'tr', diagonalType: topRight });
        }

        // Bottom-left corner fill
        if (bottomLeft > 0 && bottom <= 0 && left <= 0) {
            fills.push({ corner: 'bl', diagonalType: bottomLeft });
        }

        // Bottom-right corner fill
        if (bottomRight > 0 && bottom <= 0 && right <= 0) {
            fills.push({ corner: 'br', diagonalType: bottomRight });
        }

        return fills;
    }

    /**
     * Draw corner fills to close gaps between diagonally adjacent voxels
     * This creates smooth inner corners where two voxels meet diagonally
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} px - Pixel X position
     * @param {number} py - Pixel Y position
     * @param {number} vs - Voxel size in pixels
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @param {string} fillColor - Color to fill with
     * @param {number} roundness - Effective roundness (global * type smoothing)
     */
    _drawCornerFills(ctx, px, py, vs, x, y, fillColor, roundness) {
        if (roundness <= 0) return;

        const fills = this._getCornerFills(x, y);
        if (fills.length === 0) return;

        const radius = (vs / 2) * roundness;

        ctx.save();
        ctx.fillStyle = fillColor;

        for (const fill of fills) {
            // Draw a quarter-circle fill to smooth the inner corner
            // This fills the concave gap between diagonally adjacent voxels
            ctx.beginPath();

            switch (fill.corner) {
                case 'tl':
                    // Fill top-left inner corner
                    // Arc center is at corner, arc fills the inner corner area
                    ctx.moveTo(px, py);
                    ctx.arc(px, py, radius, 0, Math.PI / 2, false);
                    ctx.lineTo(px, py);
                    break;

                case 'tr':
                    // Fill top-right inner corner
                    ctx.moveTo(px + vs, py);
                    ctx.arc(px + vs, py, radius, Math.PI / 2, Math.PI, false);
                    ctx.lineTo(px + vs, py);
                    break;

                case 'bl':
                    // Fill bottom-left inner corner
                    ctx.moveTo(px, py + vs);
                    ctx.arc(px, py + vs, radius, -Math.PI / 2, 0, false);
                    ctx.lineTo(px, py + vs);
                    break;

                case 'br':
                    // Fill bottom-right inner corner
                    ctx.moveTo(px + vs, py + vs);
                    ctx.arc(px + vs, py + vs, radius, Math.PI, -Math.PI / 2, false);
                    ctx.lineTo(px + vs, py + vs);
                    break;
            }

            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw a voxel with individually rounded corners
     */
    _drawRoundedVoxel(ctx, x, y, w, h, corners, fillColor) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        this._traceRoundedRect(ctx, x, y, w, h, corners);
        ctx.fill();
    }

    /**
     * Clip to rounded voxel shape
     */
    _clipRoundedVoxel(ctx, x, y, w, h, corners) {
        ctx.beginPath();
        this._traceRoundedRect(ctx, x, y, w, h, corners);
        ctx.clip();
    }

    /**
     * Trace a rounded rectangle path with individual corner radii
     */
    _traceRoundedRect(ctx, x, y, w, h, corners) {
        const { tl, tr, bl, br } = corners;

        ctx.moveTo(x + tl, y);

        // Top edge
        ctx.lineTo(x + w - tr, y);

        // Top-right corner
        if (tr > 0) {
            ctx.arcTo(x + w, y, x + w, y + tr, tr);
        } else {
            ctx.lineTo(x + w, y);
        }

        // Right edge
        ctx.lineTo(x + w, y + h - br);

        // Bottom-right corner
        if (br > 0) {
            ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
        } else {
            ctx.lineTo(x + w, y + h);
        }

        // Bottom edge
        ctx.lineTo(x + bl, y + h);

        // Bottom-left corner
        if (bl > 0) {
            ctx.arcTo(x, y + h, x, y + h - bl, bl);
        } else {
            ctx.lineTo(x, y + h);
        }

        // Left edge
        ctx.lineTo(x, y + tl);

        // Top-left corner
        if (tl > 0) {
            ctx.arcTo(x, y, x + tl, y, tl);
        } else {
            ctx.lineTo(x, y);
        }

        ctx.closePath();
    }

    /**
     * Draw outline for rounded voxel, only on edges facing empty space
     */
    _drawRoundedVoxelOutline(ctx, px, py, w, h, corners, gridX, gridY) {
        const top = this.getVoxelAt(gridX, gridY - 1) > 0;
        const bottom = this.getVoxelAt(gridX, gridY + 1) > 0;
        const left = this.getVoxelAt(gridX - 1, gridY) > 0;
        const right = this.getVoxelAt(gridX + 1, gridY) > 0;

        const { tl, tr, bl, br } = corners;

        ctx.beginPath();

        // Top edge (if no neighbor above)
        if (!top) {
            ctx.moveTo(px + tl, py);
            ctx.lineTo(px + w - tr, py);
        }

        // Top-right corner arc (if rounded)
        if (tr > 0 && (!top || !right)) {
            ctx.moveTo(px + w - tr, py);
            ctx.arc(px + w - tr, py + tr, tr, -Math.PI / 2, 0);
        }

        // Right edge (if no neighbor to right)
        if (!right) {
            ctx.moveTo(px + w, py + tr);
            ctx.lineTo(px + w, py + h - br);
        }

        // Bottom-right corner arc (if rounded)
        if (br > 0 && (!bottom || !right)) {
            ctx.moveTo(px + w, py + h - br);
            ctx.arc(px + w - br, py + h - br, br, 0, Math.PI / 2);
        }

        // Bottom edge (if no neighbor below)
        if (!bottom) {
            ctx.moveTo(px + w - br, py + h);
            ctx.lineTo(px + bl, py + h);
        }

        // Bottom-left corner arc (if rounded)
        if (bl > 0 && (!bottom || !left)) {
            ctx.moveTo(px + bl, py + h);
            ctx.arc(px + bl, py + h - bl, bl, Math.PI / 2, Math.PI);
        }

        // Left edge (if no neighbor to left)
        if (!left) {
            ctx.moveTo(px, py + h - bl);
            ctx.lineTo(px, py + tl);
        }

        // Top-left corner arc (if rounded)
        if (tl > 0 && (!top || !left)) {
            ctx.moveTo(px, py + tl);
            ctx.arc(px + tl, py + tl, tl, Math.PI, Math.PI * 1.5);
        }

        ctx.stroke();
    }

    /**
     * Initialize marching squares lookup table (kept for compatibility)
     */
    _initMarchingSquares() {
        return {}; // No longer used - using rounded corners instead
    }

    // ==================== EDITOR DRAWING ====================

    _drawEditorGrid(ctx) {
        const vs = this.voxelSize;
        const gridW = this.gridWidth * vs;
        const gridH = this.gridHeight * vs;

        // Draw border
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, gridW, gridH);

        // Grid color based on mode
        if (this._editorMode === 'paint') {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        } else if (this._editorMode === 'erase') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        } else {
            ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
        }
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * vs, 0);
            ctx.lineTo(x * vs, gridH);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * vs);
            ctx.lineTo(gridW, y * vs);
            ctx.stroke();
        }
    }

    _drawEditorHighlight(ctx) {
        if (this._editorMode === 'none') return;

        // Get mouse position in world space
        const mousePos = mousePosition ? mousePosition() : null;
        if (!mousePos) return;

        const { gridX, gridY } = this.worldToGrid(mousePos.x, mousePos.y);
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) return;

        const vs = this.voxelSize;
        const brushSize = this._brushSize;

        // Draw brush preview
        ctx.save();

        if (this._editorMode === 'paint') {
            const type = this.voxelTypes[this._selectedVoxelType - 1];
            ctx.fillStyle = type ? type.color : '#00ff00';
            ctx.globalAlpha = 0.5;
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.globalAlpha = 0.3;
        }

        for (let dy = 0; dy < brushSize; dy++) {
            for (let dx = 0; dx < brushSize; dx++) {
                const bx = gridX + dx - Math.floor(brushSize / 2);
                const by = gridY + dy - Math.floor(brushSize / 2);
                if (bx >= 0 && bx < this.gridWidth && by >= 0 && by < this.gridHeight) {
                    ctx.fillRect(bx * vs, by * vs, vs, vs);
                }
            }
        }

        // Draw brush outline
        ctx.strokeStyle = this._editorMode === 'paint' ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;

        const startBx = (gridX - Math.floor(brushSize / 2)) * vs;
        const startBy = (gridY - Math.floor(brushSize / 2)) * vs;
        ctx.strokeRect(startBx, startBy, brushSize * vs, brushSize * vs);

        ctx.restore();
    }

    // ==================== EDITOR GIZMO HANDLES ====================

    getEditorGizmoHandles() {
        if (!this.gameObject) return [];
        const worldPos = this.gameObject.getWorldPosition();
        const worldScale = this.gameObject.getWorldScale();
        const w = this.gridWidth * this.voxelSize * worldScale.x;
        const h = this.gridHeight * this.voxelSize * worldScale.y;

        return [
            {
                x: worldPos.x,
                y: worldPos.y,
                radius: 6, color: '#00ff00', label: 'Terrain Origin',
                showGizmoAlways: true
            },
            {
                x: worldPos.x + w,
                y: worldPos.y + h,
                radius: 6, color: '#ff6600', label: 'Terrain End',
                showGizmoAlways: true
            }
        ];
    }

    // ==================== VOXEL DATA MANAGEMENT ====================

    initializeVoxelData() {
        this.voxelData = new Array(this.gridWidth * this.gridHeight).fill(0);
    }

    resizeGrid(newWidth, newHeight) {
        const newData = new Array(newWidth * newHeight).fill(0);

        const copyW = Math.min(this.gridWidth, newWidth);
        const copyH = Math.min(this.gridHeight, newHeight);

        for (let y = 0; y < copyH; y++) {
            for (let x = 0; x < copyW; x++) {
                const oldIndex = y * this.gridWidth + x;
                const newIndex = y * newWidth + x;
                if (oldIndex < this.voxelData.length) {
                    newData[newIndex] = this.voxelData[oldIndex];
                }
            }
        }

        this.voxelData = newData;
        this.gridWidth = newWidth;
        this.gridHeight = newHeight;

        // Dispose all chunks since grid structure changed
        this._invalidateAndDisposeAllChunks();
    }

    /**
     * Get voxel type at grid coordinates
     * @returns {number} 0 = empty, 1+ = voxel type index
     */
    getVoxelAt(gridX, gridY) {
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            return 0;
        }
        const index = gridY * this.gridWidth + gridX;
        return this.voxelData[index] || 0;
    }

    /**
     * Set voxel at grid coordinates
     * @param {number} voxelType 0 = empty, 1+ = voxel type index
     */
    setVoxelAt(gridX, gridY, voxelType) {
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) return;

        if (this.voxelData.length !== this.gridWidth * this.gridHeight) {
            this.initializeVoxelData();
        }

        const index = gridY * this.gridWidth + gridX;
        this.voxelData[index] = voxelType;

        // Mark affected chunk(s) as dirty (includes neighbor chunks for edge rendering)
        this._markVoxelRegionDirty(gridX, gridY);
    }

    /**
     * Clear voxel at grid coordinates
     */
    clearVoxelAt(gridX, gridY) {
        this.setVoxelAt(gridX, gridY, 0);
    }

    /**
     * Clear all voxels
     */
    clearAll() {
        this.initializeVoxelData();
        // Dispose and reset all chunks
        this._invalidateAndDisposeAllChunks();
    }

    /**
     * Convert world coordinates to voxel/tile coordinates
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {object} { tileX, tileY }
     */
    worldToTile(worldX, worldY) {
        if (!this.gameObject) return { tileX: -1, tileY: -1 };

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();

        // Get relative position to terrain origin (accounting for scale)
        const relX = worldX - objPos.x;
        const relY = worldY - objPos.y;

        // Convert to voxel coordinates
        const tileX = Math.floor(relX / (this.voxelSize * objScale.x));
        const tileY = Math.floor(relY / (this.voxelSize * objScale.y));

        return { tileX, tileY };
    }

    /**
     * Convert voxel/tile coordinates to world coordinates (center of voxel)
     * @param {number} tileX - Voxel X coordinate
     * @param {number} tileY - Voxel Y coordinate
     * @returns {object} { worldX, worldY }
     */
    tileToWorld(tileX, tileY) {
        if (!this.gameObject) return { worldX: 0, worldY: 0 };

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();

        // Convert to world coordinates (center of voxel)
        const worldX = objPos.x + (tileX + 0.5) * this.voxelSize * objScale.x;
        const worldY = objPos.y + (tileY + 0.5) * this.voxelSize * objScale.y;

        return { worldX, worldY };
    }

    /**
     * Check if voxel exists at grid coordinates
     */
    hasVoxelAt(gridX, gridY) {
        return this.getVoxelAt(gridX, gridY) > 0;
    }

    /**
     * Check if voxel is solid at grid coordinates
     */
    isSolidAt(gridX, gridY) {
        const voxelType = this.getVoxelAt(gridX, gridY);
        if (voxelType <= 0) return false;
        const type = this.voxelTypes[voxelType - 1];
        return type ? type.solid : false;
    }

    /**
     * Get voxel type definition
     */
    getVoxelTypeAt(gridX, gridY) {
        const voxelType = this.getVoxelAt(gridX, gridY);
        if (voxelType <= 0) return null;
        return this.voxelTypes[voxelType - 1] || null;
    }

    /**
     * Invalidate cache (marks all chunks for full redraw)
     */
    _invalidateCache() {
        // Mark all existing chunks as dirty
        for (const [key, chunk] of this._chunkCache) {
            chunk.dirty = true;
            this._dirtyChunks.add(key);
        }
    }

    /**
     * Invalidate and dispose all chunks (use when grid size changes)
     * Chunks will be re-rendered lazily on demand
     */
    _invalidateAndDisposeAllChunks() {
        this._disposeAllChunks();
        // Chunks will be rendered lazily when needed (no pre-render for large maps)
    }

    // ==================== COORDINATE CONVERSION ====================

    /**
     * Convert world coordinates to grid coordinates
     */
    worldToGrid(worldX, worldY) {
        if (!this.gameObject) return { gridX: -1, gridY: -1 };

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const vs = this.voxelSize;

        const relX = worldX - objPos.x;
        const relY = worldY - objPos.y;

        const gridX = Math.floor(relX / (vs * objScale.x));
        const gridY = Math.floor(relY / (vs * objScale.y));

        return { gridX, gridY };
    }

    /**
     * Convert grid coordinates to world coordinates (center of voxel)
     */
    gridToWorld(gridX, gridY) {
        if (!this.gameObject) return { worldX: 0, worldY: 0 };

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const vs = this.voxelSize;

        const worldX = objPos.x + (gridX + 0.5) * vs * objScale.x;
        const worldY = objPos.y + (gridY + 0.5) * vs * objScale.y;

        return { worldX, worldY };
    }

    // ==================== COLLISION API ====================

    /**
     * Check if a world position collides with solid voxel
     */
    checkCollision(worldX, worldY) {
        const { gridX, gridY } = this.worldToGrid(worldX, worldY);
        return this.isSolidAt(gridX, gridY);
    }

    /**
     * Check if a rectangle collides with any solid voxels
     */
    checkRectCollision(x, y, width, height) {
        const topLeft = this.worldToGrid(x, y);
        const bottomRight = this.worldToGrid(x + width - 1, y + height - 1);

        for (let gy = topLeft.gridY; gy <= bottomRight.gridY; gy++) {
            for (let gx = topLeft.gridX; gx <= bottomRight.gridX; gx++) {
                if (this.isSolidAt(gx, gy)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get all solid voxels colliding with a rectangle
     */
    getCollidingVoxels(x, y, width, height) {
        const collisions = [];
        const topLeft = this.worldToGrid(x, y);
        const bottomRight = this.worldToGrid(x + width - 1, y + height - 1);
        const vs = this.voxelSize;

        for (let gy = topLeft.gridY; gy <= bottomRight.gridY; gy++) {
            for (let gx = topLeft.gridX; gx <= bottomRight.gridX; gx++) {
                if (this.isSolidAt(gx, gy)) {
                    const worldPos = this.gridToWorld(gx, gy);
                    const objScale = this.gameObject ? this.gameObject.getWorldScale() : { x: 1, y: 1 };
                    const type = this.getVoxelTypeAt(gx, gy);

                    collisions.push({
                        gridX: gx,
                        gridY: gy,
                        worldX: worldPos.worldX - vs * objScale.x / 2,
                        worldY: worldPos.worldY - vs * objScale.y / 2,
                        width: vs * objScale.x,
                        height: vs * objScale.y,
                        friction: type ? type.friction : 1,
                        bounciness: type ? type.bounciness : 0,
                        voxelType: type
                    });
                }
            }
        }
        return collisions;
    }

    /**
     * Raycast against solid voxels
     */
    raycast(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const vs = this.voxelSize;
        const steps = Math.ceil(distance / vs);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const checkX = startX + dx * t;
            const checkY = startY + dy * t;
            const { gridX, gridY } = this.worldToGrid(checkX, checkY);

            if (this.isSolidAt(gridX, gridY)) {
                const type = this.getVoxelTypeAt(gridX, gridY);
                return {
                    gridX,
                    gridY,
                    worldX: checkX,
                    worldY: checkY,
                    distance: distance * t,
                    voxelType: type
                };
            }
        }
        return null;
    }

    /**
     * Get all solid voxel bounds (for physics integration)
     */
    getSolidVoxelBounds() {
        const bounds = [];
        if (!this.gameObject) return bounds;

        const objPos = this.gameObject.getWorldPosition();
        const objScale = this.gameObject.getWorldScale();
        const vs = this.voxelSize;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!this.isSolidAt(x, y)) continue;

                const worldX = objPos.x + x * vs * objScale.x;
                const worldY = objPos.y + y * vs * objScale.y;
                const type = this.getVoxelTypeAt(x, y);

                bounds.push({
                    x: worldX,
                    y: worldY,
                    width: vs * objScale.x,
                    height: vs * objScale.y,
                    gridX: x,
                    gridY: y,
                    friction: type ? type.friction : 1,
                    bounciness: type ? type.bounciness : 0
                });
            }
        }

        return bounds;
    }

    /**
     * Resolve collision with a rectangle, returning push-out vector
     * Compatible with MovementController2D collision handling
     */
    resolveRectCollision(x, y, width, height, velocityX = 0, velocityY = 0) {
        const collisions = this.getCollidingVoxels(x, y, width, height);
        if (collisions.length === 0) return { pushX: 0, pushY: 0, grounded: false, hitCeiling: false, hitWallLeft: false, hitWallRight: false };

        let pushX = 0;
        let pushY = 0;
        let grounded = false;
        let hitCeiling = false;
        let hitWallLeft = false;
        let hitWallRight = false;

        const entityCenterX = x + width / 2;
        const entityCenterY = y + height / 2;

        for (const col of collisions) {
            const voxelCenterX = col.worldX + col.width / 2;
            const voxelCenterY = col.worldY + col.height / 2;

            const overlapX = (width / 2 + col.width / 2) - Math.abs(entityCenterX - voxelCenterX);
            const overlapY = (height / 2 + col.height / 2) - Math.abs(entityCenterY - voxelCenterY);

            if (overlapX > 0 && overlapY > 0) {
                // Resolve based on smallest overlap
                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (entityCenterX < voxelCenterX) {
                        pushX = Math.min(pushX, -overlapX);
                        hitWallRight = true;
                    } else {
                        pushX = Math.max(pushX, overlapX);
                        hitWallLeft = true;
                    }
                } else {
                    // Vertical collision
                    if (entityCenterY < voxelCenterY) {
                        pushY = Math.min(pushY, -overlapY);
                        grounded = true;
                    } else {
                        pushY = Math.max(pushY, overlapY);
                        hitCeiling = true;
                    }
                }
            }
        }

        return { pushX, pushY, grounded, hitCeiling, hitWallLeft, hitWallRight };
    }

    // ==================== PROCEDURAL GENERATION ====================

    /**
     * Generate procedural hill terrain
     */
    generateHills() {
        this.initializeVoxelData();

        // Create random function (seeded or not)
        const random = this.useSeededGeneration && this.generationSeed > 0
            ? this._createSeededRandom(this.generationSeed)
            : Math.random;

        const baseHeight = Math.floor(this.gridHeight * 0.6);

        // Generate random phase offsets for more variety
        const phase1 = random() * Math.PI * 2;
        const phase2 = random() * Math.PI * 2;
        const phase3 = random() * Math.PI * 2;
        const freq1 = 0.08 + random() * 0.04;
        const freq2 = 0.2 + random() * 0.1;
        const freq3 = 0.04 + random() * 0.02;

        for (let x = 0; x < this.gridWidth; x++) {
            // Noise-based height with seeded parameters
            const noise1 = Math.sin(x * freq1 + phase1) * 4;
            const noise2 = Math.sin(x * freq2 + phase2) * 2;
            const noise3 = Math.sin(x * freq3 + phase3) * 6;
            const height = Math.floor(baseHeight + noise1 + noise2 + noise3);

            for (let y = height; y < this.gridHeight; y++) {
                // Top layer: grass (type 3)
                if (y === height) {
                    this.setVoxelAt(x, y, 3);
                }
                // Middle layer: dirt (type 1)
                else if (y < height + 4) {
                    this.setVoxelAt(x, y, 1);
                }
                // Bottom layer: stone (type 2)
                else {
                    this.setVoxelAt(x, y, 2);
                }
            }
        }

        const seedInfo = this.useSeededGeneration ? ` (seed: ${this.generationSeed})` : '';
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`🌄 Hills generated!${seedInfo}`);
        }
    }

    /**
     * Generate procedural cave system
     */
    generateCaves() {
        // Create random function (seeded or not)
        const random = this.useSeededGeneration && this.generationSeed > 0
            ? this._createSeededRandom(this.generationSeed)
            : Math.random;

        // Fill with stone first
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.setVoxelAt(x, y, 2); // Stone
            }
        }

        // Carve out caves using cellular automata
        const caveData = new Array(this.gridWidth * this.gridHeight);

        // Random initial state (using seeded random)
        const fillChance = 0.42 + random() * 0.06; // Slight variation in initial density
        for (let i = 0; i < caveData.length; i++) {
            caveData[i] = random() < fillChance;
        }

        // Apply cellular automata rules
        for (let iter = 0; iter < 5; iter++) {
            const newData = [...caveData];

            for (let y = 1; y < this.gridHeight - 1; y++) {
                for (let x = 1; x < this.gridWidth - 1; x++) {
                    const idx = y * this.gridWidth + x;

                    // Count neighbors
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const ni = (y + dy) * this.gridWidth + (x + dx);
                            if (caveData[ni]) neighbors++;
                        }
                    }

                    // Apply rule
                    newData[idx] = neighbors >= 5;
                }
            }

            for (let i = 0; i < caveData.length; i++) {
                caveData[i] = newData[i];
            }
        }

        // Apply cave data
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const idx = y * this.gridWidth + x;
                if (!caveData[idx]) {
                    this.setVoxelAt(x, y, 0); // Empty
                }
            }
        }

        const seedInfo = this.useSeededGeneration ? ` (seed: ${this.generationSeed})` : '';
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`🏔️ Caves generated!${seedInfo}`);
        }
    }

    /**
     * Fill bottom half with default voxel
     */
    fillGround() {
        const midY = Math.floor(this.gridHeight / 2);

        for (let y = midY; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.setVoxelAt(x, y, 1); // Dirt
            }
        }

        // Add grass on top
        for (let x = 0; x < this.gridWidth; x++) {
            this.setVoxelAt(x, midY, 3); // Grass
        }

        if (window.app && window.app.showNotification) {
            window.app.showNotification('🟫 Ground filled!');
        }
    }

    // ==================== EDITOR INTEGRATION ====================

    /**
     * Open voxel type selector window
     */
    openVoxelSelector(editor) {
        if (this._voxelSelectorWindow) {
            this._voxelSelectorWindow.close();
            this._voxelSelectorWindow = null;
        }

        const win = new KGUIWindow('🎨 Select Voxel Type');
        win.setSize(350, 400);
        win.center();
        this._voxelSelectorWindow = win;

        const content = win.content;
        content.style.padding = '10px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';

        // Current selection info
        const infoDiv = document.createElement('div');
        infoDiv.style.padding = '10px';
        infoDiv.style.background = 'var(--bg-secondary)';
        infoDiv.style.borderRadius = '4px';
        infoDiv.style.textAlign = 'center';
        content.appendChild(infoDiv);

        const updateInfo = () => {
            const type = this.voxelTypes[this._selectedVoxelType - 1];
            if (type) {
                infoDiv.innerHTML = `<strong>Selected:</strong> ${this._selectedVoxelType}. ${type.name}<br>
                    <span style="display:inline-block;width:20px;height:20px;background:${type.color};border:1px solid #fff;vertical-align:middle;"></span>`;
            }
        };
        updateInfo();

        // Brush size slider
        const brushDiv = document.createElement('div');
        brushDiv.style.display = 'flex';
        brushDiv.style.alignItems = 'center';
        brushDiv.style.gap = '10px';

        const brushLabel = document.createElement('span');
        brushLabel.textContent = 'Brush Size: ';
        brushDiv.appendChild(brushLabel);

        const brushSlider = document.createElement('input');
        brushSlider.type = 'range';
        brushSlider.min = '1';
        brushSlider.max = '10';
        brushSlider.value = this._brushSize;
        brushSlider.style.flex = '1';
        brushSlider.oninput = () => {
            this._brushSize = parseInt(brushSlider.value);
            brushValue.textContent = this._brushSize;
        };
        brushDiv.appendChild(brushSlider);

        const brushValue = document.createElement('span');
        brushValue.textContent = this._brushSize;
        brushDiv.appendChild(brushValue);

        content.appendChild(brushDiv);

        // Voxel type buttons
        const typesDiv = document.createElement('div');
        typesDiv.style.flex = '1';
        typesDiv.style.overflow = 'auto';
        typesDiv.style.display = 'flex';
        typesDiv.style.flexDirection = 'column';
        typesDiv.style.gap = '4px';

        this.voxelTypes.forEach((type, index) => {
            const btn = document.createElement('button');
            btn.className = 'kgui-button';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '10px';
            btn.style.padding = '8px';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';

            if (index + 1 === this._selectedVoxelType) {
                btn.style.background = 'linear-gradient(180deg, #0077dd 0%, #0055aa 100%)';
            }

            const colorSwatch = document.createElement('span');
            colorSwatch.style.width = '24px';
            colorSwatch.style.height = '24px';
            colorSwatch.style.background = type.color;
            colorSwatch.style.border = '2px solid ' + type.outlineColor;
            colorSwatch.style.borderRadius = '4px';
            btn.appendChild(colorSwatch);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${index + 1}. ${type.name}`;
            nameSpan.style.flex = '1';
            btn.appendChild(nameSpan);

            const solidIcon = document.createElement('span');
            solidIcon.textContent = type.solid ? '🧱' : '💨';
            btn.appendChild(solidIcon);

            btn.onclick = () => {
                this._selectedVoxelType = index + 1;
                updateInfo();
                // Update button styles
                typesDiv.querySelectorAll('button').forEach((b, i) => {
                    b.style.background = (i === index) ? 'linear-gradient(180deg, #0077dd 0%, #0055aa 100%)' : '';
                });
            };

            typesDiv.appendChild(btn);
        });

        content.appendChild(typesDiv);

        // Paint button
        const paintBtn = document.createElement('button');
        paintBtn.className = 'kgui-button';
        paintBtn.innerHTML = '🖌️ Start Painting';
        paintBtn.style.background = 'linear-gradient(180deg, #22cc22 0%, #119911 100%)';
        paintBtn.style.color = '#fff';
        paintBtn.style.padding = '10px';
        paintBtn.onclick = () => {
            win.close();
            this.enterPaintMode(editor);
        };
        content.appendChild(paintBtn);

        win.onClose(() => {
            this._voxelSelectorWindow = null;
        });
    }

    enterPaintMode(editor) {
        this._editorMode = 'paint';
        this._setEditorVoxelPaintMode('paint');

        if (window.app && window.app.showNotification) {
            const type = this.voxelTypes[this._selectedVoxelType - 1];
            window.app.showNotification(`🖌️ Painting ${type ? type.name : 'voxel'}. Click to paint. Right-click or ESC to exit.`);
        }
    }

    enterEraseMode(editor) {
        this._editorMode = 'erase';
        this._setEditorVoxelPaintMode('erase');

        if (window.app && window.app.showNotification) {
            window.app.showNotification('🗑️ Erase mode. Click to remove voxels. Right-click or ESC to exit.');
        }
    }

    _setEditorVoxelPaintMode(mode) {
        if (window.app && window.app.sceneEditor) {
            const sceneEditor = window.app.sceneEditor;
            if (sceneEditor.levelEditor) {
                sceneEditor.levelEditor.setTilePaintMode(this, mode);
            }
        }
    }

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
     * Handle voxel paint from level editor
     */
    handleTilePaint(worldX, worldY, mode) {
        const paintMode = mode || this._editorMode;
        const { gridX, gridY } = this.worldToGrid(worldX, worldY);

        const brushSize = this._brushSize;
        const halfBrush = Math.floor(brushSize / 2);

        let painted = false;

        for (let dy = 0; dy < brushSize; dy++) {
            for (let dx = 0; dx < brushSize; dx++) {
                const bx = gridX + dx - halfBrush;
                const by = gridY + dy - halfBrush;

                if (bx >= 0 && bx < this.gridWidth && by >= 0 && by < this.gridHeight) {
                    if (paintMode === 'paint') {
                        this.setVoxelAt(bx, by, this._selectedVoxelType);
                        painted = true;
                    } else if (paintMode === 'erase') {
                        this.clearVoxelAt(bx, by);
                        painted = true;
                    }
                }
            }
        }

        return painted;
    }

    /**
     * Check if world position is within terrain bounds
     */
    isWithinBounds(worldX, worldY) {
        const { gridX, gridY } = this.worldToGrid(worldX, worldY);
        return gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight;
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Deterministic noise function for consistent patterns
     */
    _deterministicNoise(seed) {
        const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
    }

    /**
     * Adjust color brightness
     */
    _adjustColorBrightness(hex, amount) {
        // Parse hex color
        let r, g, b;
        if (hex.startsWith('#')) {
            const bigint = parseInt(hex.slice(1), 16);
            r = (bigint >> 16) & 255;
            g = (bigint >> 8) & 255;
            b = bigint & 255;
        } else {
            return hex;
        }

        // Adjust brightness
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));

        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'VoxelTerrain2D';

        // Grid configuration
        json.gridWidth = this.gridWidth;
        json.gridHeight = this.gridHeight;
        json.voxelSize = this.voxelSize;
        json.chunkSize = this.chunkSize;

        // Voxel data
        json.voxelData = [...this.voxelData];

        // Voxel types - deep clone
        json.voxelTypes = this.voxelTypes.map(type => ({ ...type }));

        // Rendering options
        json.smoothing = this.smoothing;
        json.enableOutlines = this.enableOutlines;
        json.globalOutlineColor = this.globalOutlineColor;
        json.globalOutlineWidth = this.globalOutlineWidth;
        json.enableBlending = this.enableBlending;
        json.blendDistance = this.blendDistance;
        json.enableShadows = this.enableShadows;
        json.shadowColor = this.shadowColor;
        json.shadowOffset = this.shadowOffset;
        json.pixelPerfect = this.pixelPerfect;
        json.alpha = this.alpha;
        json.renderMode = this.renderMode;

        // Collision
        json.enableCollision = this.enableCollision;
        json.collisionTag = this.collisionTag;

        // Seed options
        json.generationSeed = this.generationSeed;
        json.patternSeed = this.patternSeed;
        json.useSeededGeneration = this.useSeededGeneration;
        json.useSeededPatterns = this.useSeededPatterns;

        return json;
    }

    static fromJSON(json) {
        const module = new VoxelTerrain2D();
        module.enabled = json.enabled ?? true;

        // Grid configuration
        module.gridWidth = json.gridWidth ?? 32;
        module.gridHeight = json.gridHeight ?? 24;
        module.voxelSize = json.voxelSize ?? 16;
        module.chunkSize = json.chunkSize ?? 32;

        // Voxel data
        if (Array.isArray(json.voxelData)) {
            module.voxelData = [...json.voxelData];
        } else {
            module.voxelData = [];
        }

        // Voxel types
        if (Array.isArray(json.voxelTypes)) {
            module.voxelTypes = json.voxelTypes.map(type => ({ ...type }));
        }

        // Ensure voxel data is properly sized
        if (module.voxelData.length !== module.gridWidth * module.gridHeight) {
            module.initializeVoxelData();
        }

        // Rendering options
        module.smoothing = json.smoothing ?? 0.5;
        module.enableOutlines = json.enableOutlines ?? true;
        module.globalOutlineColor = json.globalOutlineColor ?? '';
        module.globalOutlineWidth = json.globalOutlineWidth ?? 0;
        module.enableBlending = json.enableBlending ?? true;
        module.blendDistance = json.blendDistance ?? 0.3;
        module.enableShadows = json.enableShadows ?? true;
        module.shadowColor = json.shadowColor ?? 'rgba(0,0,0,0.2)';
        module.shadowOffset = json.shadowOffset ?? 2;
        module.pixelPerfect = json.pixelPerfect ?? true;
        module.alpha = json.alpha ?? 1.0;
        module.renderMode = json.renderMode ?? 'viewport';

        // Collision
        module.enableCollision = json.enableCollision ?? true;
        module.collisionTag = json.collisionTag ?? 'terrain';

        // Seed options
        module.generationSeed = json.generationSeed ?? 0;
        module.patternSeed = json.patternSeed ?? 0;
        module.useSeededGeneration = json.useSeededGeneration ?? false;
        module.useSeededPatterns = json.useSeededPatterns ?? false;

        // Initialize noise seed based on loaded settings
        module._updateNoiseSeed();

        return module;
    }

    clone() {
        const cloned = new VoxelTerrain2D();
        cloned.enabled = this.enabled;

        // Grid configuration
        cloned.gridWidth = this.gridWidth;
        cloned.gridHeight = this.gridHeight;
        cloned.voxelSize = this.voxelSize;
        cloned.chunkSize = this.chunkSize;

        // Deep clone voxel data
        cloned.voxelData = [...this.voxelData];

        // Deep clone voxel types
        cloned.voxelTypes = this.voxelTypes.map(type => ({ ...type }));

        // Rendering options
        cloned.smoothing = this.smoothing;
        cloned.enableOutlines = this.enableOutlines;
        cloned.globalOutlineColor = this.globalOutlineColor;
        cloned.globalOutlineWidth = this.globalOutlineWidth;
        cloned.enableBlending = this.enableBlending;
        cloned.blendDistance = this.blendDistance;
        cloned.enableShadows = this.enableShadows;
        cloned.shadowColor = this.shadowColor;
        cloned.shadowOffset = this.shadowOffset;
        cloned.pixelPerfect = this.pixelPerfect;
        cloned.alpha = this.alpha;
        cloned.renderMode = this.renderMode;

        // Collision
        cloned.enableCollision = this.enableCollision;
        cloned.collisionTag = this.collisionTag;

        // Seed options
        cloned.generationSeed = this.generationSeed;
        cloned.patternSeed = this.patternSeed;
        cloned.useSeededGeneration = this.useSeededGeneration;
        cloned.useSeededPatterns = this.useSeededPatterns;

        return cloned;
    }
}

// Register the module
window.VoxelTerrain2D = VoxelTerrain2D;
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('VoxelTerrain2D', VoxelTerrain2D);
}
