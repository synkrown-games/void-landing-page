/**
 * TilemapWorldGenerator Module
 * Procedural world generation for TilemapRenderer.
 * Requires a TilemapRenderer module on the same game object.
 * 
 * Supports multiple generation modes:
 * - 2D Platformer (Terraria-style terrain with layers, caves, ores)
 * - Top-Down City (roads, footpaths, building plots, districts)
 * - Top-Down Overworld (grass, water, forests, paths)
 * - Dungeon/Cave (underground cave systems)
 * 
 * City Generation Features:
 * - District system (like biomes): Downtown, Residential, Industrial zones
 * - Each district has unique road styles, block sizes, building types
 * - Dead-end roads with cul-de-sacs for organic city layouts
 * - Alley generation between buildings
 * - Building prefab spawning with configurable footprints
 * - Park prefab spawning (trees, benches, etc.)
 * - Generated object tracking for clean regeneration
 * 
 * All tile assignments and generation parameters are fully customizable
 * via arrayGroup properties.
 */

class TilemapWorldGenerator extends Module {
    
    constructor() {
        super();
        
        // === GENERATION MODE ===
        this.generationMode = 'platformer';  // 'platformer', 'city', 'overworld', 'cave'
        this.seed = 12345;
        this.useRandomSeed = false;
        
        // === PLATFORMER SETTINGS ===
        this.platformerSurfaceY = 0.3;       // Surface starts at 30% from top (0-1)
        this.platformerHillFrequency = 0.04; // Hill frequency (lower = wider hills)
        this.platformerHillAmplitude = 5;    // Hill height variance in tiles
        this.platformerCaveChance = 0.42;    // Cellular automata initial fill for caves
        this.platformerCaveSmoothPasses = 4; // Smoothing iterations for caves
        this.platformerCaveMinDepth = 8;     // Caves only appear below this many tiles from surface
        this.platformerGenerateOres = true;
        this.platformerGenerateCaves = true;
        this.platformerSurfaceSmoothing = true; // Smooth jagged surface
        
        // Platformer terrain layers - arrayGroup
        // Each layer: { name, tileX, tileY, depthMin, depthMax, solid }
        this.platformerLayers = [
            { name: 'Grass', tileX: 0, tileY: 0, depthMin: 0, depthMax: 0, solid: true },
            { name: 'Dirt', tileX: 1, tileY: 0, depthMin: 1, depthMax: 4, solid: true },
            { name: 'Stone', tileX: 2, tileY: 0, depthMin: 5, depthMax: 999, solid: true }
        ];
        
        // Platformer ore definitions - arrayGroup
        // Each ore: { name, tileX, tileY, minDepth, maxDepth, veinSize, rarity, solid }
        this.platformerOres = [
            { name: 'Coal', tileX: 3, tileY: 0, minDepth: 5, maxDepth: 999, veinSizeMin: 2, veinSizeMax: 5, rarity: 0.08, solid: true },
            { name: 'Iron', tileX: 4, tileY: 0, minDepth: 10, maxDepth: 999, veinSizeMin: 2, veinSizeMax: 4, rarity: 0.05, solid: true },
            { name: 'Gold', tileX: 5, tileY: 0, minDepth: 20, maxDepth: 999, veinSizeMin: 1, veinSizeMax: 3, rarity: 0.02, solid: true },
            { name: 'Diamond', tileX: 6, tileY: 0, minDepth: 30, maxDepth: 999, veinSizeMin: 1, veinSizeMax: 2, rarity: 0.008, solid: true }
        ];
        
        // Platformer surface decorations (trees, flowers, etc placed ON surface)
        this.platformerDecorations = [
            { name: 'Tree', tileX: 0, tileY: 1, chance: 0.1, onSurface: true },
            { name: 'Flower', tileX: 1, tileY: 1, chance: 0.15, onSurface: true }
        ];
        
        // Sky/background tile (empty space above ground)
        this.platformerSkyTileX = -1;    // -1 = leave empty (no tile)
        this.platformerSkyTileY = -1;
        
        // === CITY SETTINGS ===
        this.cityBlockSizeMin = 8;        // Min block size (tiles)
        this.cityBlockSizeMax = 16;       // Max block size (tiles)
        this.cityRoadFrequency = 0.25;    // How often roads appear
        this.cityMaxLanes = 4;            // Max lanes per road (1-4)
        this.cityFootpathWidth = 1;       // Footpath width in tiles
        this.cityBuildingFillTile = false; // Fill building areas with a tile
        this.cityParksChance = 0.15;      // Chance for a block to be a park
        this.cityIntersectionStyle = 'open'; // 'open', 'roundabout'
        
        // Advanced city settings
        this.cityDeadEndChance = 0.25;    // Chance for a road to end early (dead end)
        this.cityDeadEndMinLength = 0.3;  // Min length before road can end (0-1)
        this.cityDeadEndCapStyle = 'building'; // 'building', 'park', 'turnaround'
        this.cityAlleyChance = 0.15;      // Chance for narrow alleys between buildings
        this.cityAlleyWidth = 1;          // Alley width in tiles
        
        // City tile definitions - arrayGroup
        this.cityTiles = [
            { name: 'Road Vertical Left Lane', tileX: 0, tileY: 2, role: 'roadVertLeft' },
            { name: 'Road Vertical Right Lane', tileX: 1, tileY: 2, role: 'roadVertRight' },
            { name: 'Road Horizontal Top Lane', tileX: 2, tileY: 2, role: 'roadHorizTop' },
            { name: 'Road Horizontal Bottom Lane', tileX: 3, tileY: 2, role: 'roadHorizBottom' },
            { name: 'Footpath', tileX: 4, tileY: 2, role: 'footpath' },
            { name: 'Intersection', tileX: 5, tileY: 2, role: 'intersection' },
            { name: 'Building Ground', tileX: 6, tileY: 2, role: 'buildingGround' },
            { name: 'Park/Grass', tileX: 7, tileY: 2, role: 'park' },
            { name: 'Empty Lot', tileX: 0, tileY: 3, role: 'emptyLot' },
            { name: 'Road Center Line V', tileX: 1, tileY: 3, role: 'roadCenterV' },
            { name: 'Road Center Line H', tileX: 2, tileY: 3, role: 'roadCenterH' },
            { name: 'Road End Cap', tileX: 3, tileY: 3, role: 'roadEndCap' },
            { name: 'Alley', tileX: 4, tileY: 3, role: 'alley' }
        ];
        
        // === CITY DISTRICTS (Biome-like system) ===
        this.cityUseDistricts = true;
        this.cityDistricts = [
            {
                name: 'Downtown',
                weight: 1,                 // Relative spawn weight
                blockSizeMin: 6,
                blockSizeMax: 12,
                maxLanes: 2,
                footpathWidth: 2,
                parksChance: 0.05,
                deadEndChance: 0.1,
                buildingDensity: 0.9,      // How densely buildings fill the block
                buildingPrefabs: [],       // Building prefab configs
                parkPrefabs: [],           // Park decoration prefabs (trees, benches)
                tiles: [
                    { name: 'Road V Left', tileX: 0, tileY: 2, role: 'roadVertLeft' },
                    { name: 'Road V Right', tileX: 1, tileY: 2, role: 'roadVertRight' },
                    { name: 'Road H Top', tileX: 2, tileY: 2, role: 'roadHorizTop' },
                    { name: 'Road H Bottom', tileX: 3, tileY: 2, role: 'roadHorizBottom' },
                    { name: 'Footpath', tileX: 4, tileY: 2, role: 'footpath' },
                    { name: 'Intersection', tileX: 5, tileY: 2, role: 'intersection' },
                    { name: 'Building Ground', tileX: 6, tileY: 2, role: 'buildingGround' },
                    { name: 'Park', tileX: 7, tileY: 2, role: 'park' }
                ]
            },
            {
                name: 'Residential',
                weight: 2,
                blockSizeMin: 10,
                blockSizeMax: 20,
                maxLanes: 1,
                footpathWidth: 1,
                parksChance: 0.25,
                deadEndChance: 0.35,
                buildingDensity: 0.6,
                buildingPrefabs: [],
                parkPrefabs: [],
                tiles: [
                    { name: 'Road V Left', tileX: 0, tileY: 2, role: 'roadVertLeft' },
                    { name: 'Road V Right', tileX: 1, tileY: 2, role: 'roadVertRight' },
                    { name: 'Road H Top', tileX: 2, tileY: 2, role: 'roadHorizTop' },
                    { name: 'Road H Bottom', tileX: 3, tileY: 2, role: 'roadHorizBottom' },
                    { name: 'Footpath', tileX: 4, tileY: 2, role: 'footpath' },
                    { name: 'Intersection', tileX: 5, tileY: 2, role: 'intersection' },
                    { name: 'Building Ground', tileX: 6, tileY: 2, role: 'buildingGround' },
                    { name: 'Park', tileX: 7, tileY: 2, role: 'park' }
                ]
            },
            {
                name: 'Industrial',
                weight: 1,
                blockSizeMin: 15,
                blockSizeMax: 30,
                maxLanes: 3,
                footpathWidth: 1,
                parksChance: 0.02,
                deadEndChance: 0.2,
                buildingDensity: 0.8,
                buildingPrefabs: [],
                parkPrefabs: [],
                tiles: [
                    { name: 'Road V Left', tileX: 0, tileY: 2, role: 'roadVertLeft' },
                    { name: 'Road V Right', tileX: 1, tileY: 2, role: 'roadVertRight' },
                    { name: 'Road H Top', tileX: 2, tileY: 2, role: 'roadHorizTop' },
                    { name: 'Road H Bottom', tileX: 3, tileY: 2, role: 'roadHorizBottom' },
                    { name: 'Footpath', tileX: 4, tileY: 2, role: 'footpath' },
                    { name: 'Intersection', tileX: 5, tileY: 2, role: 'intersection' },
                    { name: 'Building Ground', tileX: 6, tileY: 2, role: 'buildingGround' },
                    { name: 'Park', tileX: 7, tileY: 2, role: 'park' }
                ]
            }
        ];
        
        // === BUILDING PREFAB SETTINGS ===
        this.citySpawnBuildingPrefabs = true;
        this.cityBuildingPrefabs = [
            { 
                name: 'Small Building', 
                prefab: '', 
                widthTiles: 2, 
                heightTiles: 2,
                chance: 0.3,
                minPerBlock: 0,
                maxPerBlock: 4
            },
            { 
                name: 'Medium Building', 
                prefab: '', 
                widthTiles: 3, 
                heightTiles: 3,
                chance: 0.2,
                minPerBlock: 0,
                maxPerBlock: 2
            },
            { 
                name: 'Large Building', 
                prefab: '', 
                widthTiles: 4, 
                heightTiles: 4,
                chance: 0.1,
                minPerBlock: 0,
                maxPerBlock: 1
            }
        ];
        
        // Park decorations (trees, benches, etc)
        this.cityParkPrefabs = [
            {
                name: 'Tree',
                prefab: '',
                widthTiles: 1,
                heightTiles: 1,
                chance: 0.4,
                minPerBlock: 2,
                maxPerBlock: 10
            },
            {
                name: 'Bench',
                prefab: '',
                widthTiles: 1,
                heightTiles: 1,
                chance: 0.15,
                minPerBlock: 0,
                maxPerBlock: 4
            }
        ];
        
        // === OVERWORLD SETTINGS ===
        this.overworldWaterLevel = 0.35;    // Perlin threshold for water
        this.overworldForestLevel = 0.55;   // Perlin threshold for forests
        this.overworldMountainLevel = 0.75; // Perlin threshold for mountains
        this.overworldNoiseScale = 0.05;    // Noise frequency
        this.overworldNoiseOctaves = 4;     // Noise detail
        this.overworldPathCount = 3;        // Number of random paths
        this.overworldPathWidth = 1;        // Path width in tiles
        this.overworldLakeSmoothing = 3;    // Smooth water edges
        
        // Overworld tile definitions - arrayGroup
        this.overworldTiles = [
            { name: 'Deep Water', tileX: 0, tileY: 4, role: 'deepWater', solid: false },
            { name: 'Shallow Water', tileX: 1, tileY: 4, role: 'shallowWater', solid: false },
            { name: 'Sand', tileX: 2, tileY: 4, role: 'sand', solid: false },
            { name: 'Grass', tileX: 3, tileY: 4, role: 'grass', solid: false },
            { name: 'Forest', tileX: 4, tileY: 4, role: 'forest', solid: true },
            { name: 'Dense Forest', tileX: 5, tileY: 4, role: 'denseForest', solid: true },
            { name: 'Mountain', tileX: 6, tileY: 4, role: 'mountain', solid: true },
            { name: 'Snow', tileX: 7, tileY: 4, role: 'snow', solid: true },
            { name: 'Path', tileX: 0, tileY: 5, role: 'path', solid: false }
        ];
        
        // === CAVE SETTINGS ===
        this.caveFillPercent = 0.45;     // Initial fill percent for cellular automata
        this.caveSmoothPasses = 5;       // Smoothing passes
        this.caveMinWallNeighbors = 4;   // Min neighbors to become wall
        this.caveConnectRegions = true;  // Ensure all open areas are connected
        this.caveOreGeneration = true;   // Generate ores in cave walls
        
        // Cave tile definitions - arrayGroup
        this.caveTiles = [
            { name: 'Cave Floor', tileX: 0, tileY: 6, role: 'floor', solid: false },
            { name: 'Cave Wall', tileX: 1, tileY: 6, role: 'wall', solid: true },
            { name: 'Cave Wall Top', tileX: 2, tileY: 6, role: 'wallTop', solid: true },
            { name: 'Stalagmite', tileX: 3, tileY: 6, role: 'decoration', solid: true },
            { name: 'Crystal', tileX: 4, tileY: 6, role: 'crystal', solid: false },
            { name: 'Underground Water', tileX: 5, tileY: 6, role: 'water', solid: false }
        ];
        
        // === NODE SYSTEM SETTINGS ===
        this.enableNodeSystem = false;      // Enable node-based pathfinding
        this.drivingSide = 'right';         // 'left' or 'right' - which side of the road vehicles drive on
        
        // Node type mappings - which tile roles become which node type
        // nodeId is a string like 'pedestrian', 'vehicle', etc.
        this.nodeTypeMappings = [
            { role: 'footpath', nodeId: 'pedestrian' },
            { role: 'roadVertLeft', nodeId: 'vehicle' },
            { role: 'roadVertRight', nodeId: 'vehicle' },
            { role: 'roadHorizTop', nodeId: 'vehicle' },
            { role: 'roadHorizBottom', nodeId: 'vehicle' },
            { role: 'intersection', nodeId: 'vehicle' },
            { role: 'alley', nodeId: 'pedestrian' }
        ];
        
        // === NPC SPAWN POOLING SETTINGS ===
        this.enableNPCSpawning = false;     // Enable NPC spawn system
        this.npcViewportMargin = 100;       // Pixels outside viewport before despawn
        
        // NPC spawn configurations - array of spawn rules
        this.npcSpawnConfigs = [
            {
                name: 'Pedestrian',
                nodeId: 'pedestrian',        // Which node type to spawn on
                prefabs: [                   // Weighted prefab selection
                    { prefab: '', weight: 1 }
                ],
                maxInstances: 10,            // Max concurrent instances
                spawnRadiusMin: 0,           // Min random distance from node center
                spawnRadiusMax: 8            // Max random distance from node center
            },
            {
                name: 'Vehicle',
                nodeId: 'vehicle',
                prefabs: [
                    { prefab: '', weight: 1 }
                ],
                maxInstances: 5,
                spawnRadiusMin: 0,
                spawnRadiusMax: 4
            }
        ];
        
        // === INTERNAL STATE ===
        this._tilemapRenderer = null;
        this._rngState = 0;
        this._generated = false;
        
        // === NODE SYSTEM INTERNAL STATE ===
        this._nodeMap = null;              // 2D array of node data { nodeId, tileX, tileY, worldX, worldY, connections }
        this._nodesByType = {};            // { nodeId: [nodeRefs] } for quick lookup
        this._allNodes = [];               // Flat array of all nodes
        
        // === NPC POOL INTERNAL STATE ===
        this._npcPools = {};               // { configName: { active: [], inactive: [], created: 0 } }
        this._activeNPCs = [];             // Currently active NPC tracking
        this._npcOccupiedNodes = new Set(); // Track which nodes have an NPC (one per node)
        
        // === GENERATED OBJECT TRACKING ===
        // Track spawned prefabs so we can remove them on regeneration
        this._generatedObjects = [];       // Array of { gameObject, type, blockX, blockY } - runtime references
        this._generatedObjectsData = [];   // Array of { prefab, tileX, tileY, widthTiles, heightTiles, type } - serializable metadata
        this._generatedBlocks = [];        // Block metadata for regeneration
        this._districtMap = null;          // 2D array mapping tiles to districts
        
        // === REUSABLE BOUNDS OBJECTS (avoid per-frame allocation) ===
        this._viewBounds = { left: 0, right: 0, top: 0, bottom: 0 };
        this._spawnBounds = { left: 0, right: 0, top: 0, bottom: 0 };
        this._despawnBounds = { left: 0, right: 0, top: 0, bottom: 0 };
        
        // === REUSABLE NPC SPAWN ARRAYS (avoid per-frame allocation) ===
        this._validSpawnNodes = [];     // Reusable array for _trySpawnNPC
        this._hasNPCPools = false;      // Flag to avoid Object.keys() check every frame
        this._poolNames = [];           // Cached pool name list
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Rendering,Procedural';
    static is2D = true;
    
    static getIcon() {
        return '🏗️';
    }
    
    static getDescription() {
        return 'Procedural world generator for TilemapRenderer. Generates 2D platformer terrain, top-down cities, overworlds, and caves.';
    }
    
    // ==================== PROPERTY METADATA ====================
    
    getPropertyMetadata() {
        const hasTilemap = this._getTilemapRenderer() !== null;
        const statusHint = hasTilemap 
            ? '✅ TilemapRenderer found on this object' 
            : '⚠️ Requires a TilemapRenderer module on this game object!';
        
        return [
            // === STATUS ===
            { type: 'hint', label: statusHint },
            
            // === GENERATION MODE ===
            { type: 'header', label: '🌍 Generation Settings' },
            { type: 'groupStart', label: '⚙️ Mode & Seed' },
            {
                key: 'generationMode',
                type: 'select',
                label: '🗺️ Generation Mode',
                default: 'platformer',
                options: {
                    'platformer': '🏔️ 2D Platformer (Terraria-style)',
                    'city': '🏙️ Top-Down City',
                    'overworld': '🌳 Top-Down Overworld',
                    'cave': '🕳️ Dungeon / Cave'
                }
            },
            { key: 'seed', type: 'number', label: '🌱 Seed', default: 12345, min: 0, max: 999999 },
            { key: 'useRandomSeed', type: 'boolean', label: '🎲 Random Seed', default: false, hint: 'Generate a random seed each time' },
            {
                type: 'button',
                buttonText: '🎰 Randomize Seed',
                buttonStyle: 'primary',
                tooltip: 'Set a new random seed',
                onClick: function(module, editor) {
                    module.seed = Math.floor(Math.random() * 999999);
                    if (editor && editor.refreshModuleProperties) editor.refreshModuleProperties();
                }
            },
            { type: 'groupEnd' },
            
            // === GENERATE BUTTON ===
            {
                type: 'button',
                buttonText: '🏗️ Generate World',
                buttonStyle: 'success',
                tooltip: 'Generate the world using current settings',
                onClick: function(module, editor) {
                    module.generate();
                    if (editor && editor.markDirty) editor.markDirty();
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification('🏗️ World generated!');
                    }
                }
            },
            {
                type: 'button',
                buttonText: '🧹 Clear World',
                buttonStyle: 'danger',
                tooltip: 'Clear the entire tilemap',
                onClick: function(module, editor) {
                    if (confirm('Clear the entire tilemap?')) {
                        const tm = module._getTilemapRenderer();
                        if (tm) {
                            tm.clearMap();
                            tm.clearAllSolid();
                            tm.invalidateOffscreenCache();
                            if (editor && editor.markDirty) editor.markDirty();
                        }
                    }
                }
            },
            
            // ============================================================
            // PLATFORMER SETTINGS
            // ============================================================
            { type: 'groupStart', label: '🏔️ Platformer Settings', showIf: { generationMode: 'platformer' } },
            
                { type: 'groupStart', label: '🌄 Terrain Shape' },
                    { key: 'platformerSurfaceY', type: 'slider', label: 'Surface Height', default: 0.3, min: 0.1, max: 0.9, step: 0.05, hint: 'Where the surface starts (0=top, 1=bottom)' },
                    { key: 'platformerHillFrequency', type: 'slider', label: 'Hill Frequency', default: 0.04, min: 0.005, max: 0.2, step: 0.005, hint: 'Lower = wider rolling hills' },
                    { key: 'platformerHillAmplitude', type: 'number', label: 'Hill Amplitude', default: 5, min: 0, max: 30, hint: 'Hill height variance in tiles' },
                    { key: 'platformerSurfaceSmoothing', type: 'boolean', label: 'Smooth Surface', default: true },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🪨 Terrain Layers' },
                    { type: 'hint', label: 'Define terrain layers from surface down. depthMin/Max = tiles below surface (0 = surface). Set depthMax to 999 for "rest of the world".' },
                    {
                        key: 'platformerLayers',
                        label: 'Terrain Layers',
                        type: 'arrayGroup',
                        itemLabel: 'Layer',
                        minItems: 1,
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Layer' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'depthMin', label: 'Depth Min (tiles)', type: 'number', default: 0, min: 0, max: 999, hint: 'Min tiles below surface' },
                            { key: 'depthMax', label: 'Depth Max (tiles)', type: 'number', default: 5, min: 0, max: 999, hint: 'Max tiles below surface (999 = infinite)' },
                            { key: 'solid', label: 'Solid', type: 'boolean', default: true }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🕳️ Caves' },
                    { key: 'platformerGenerateCaves', type: 'boolean', label: 'Generate Caves', default: true },
                    { key: 'platformerCaveChance', type: 'slider', label: 'Cave Density', default: 0.42, min: 0.3, max: 0.6, step: 0.01, showIf: { platformerGenerateCaves: true }, hint: 'Higher = more open caves' },
                    { key: 'platformerCaveSmoothPasses', type: 'number', label: 'Smooth Passes', default: 4, min: 1, max: 10, showIf: { platformerGenerateCaves: true } },
                    { key: 'platformerCaveMinDepth', type: 'number', label: 'Cave Min Depth', default: 8, min: 1, max: 50, showIf: { platformerGenerateCaves: true }, hint: 'Caves start this many tiles below surface' },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '💎 Ores' },
                    { key: 'platformerGenerateOres', type: 'boolean', label: 'Generate Ores', default: true },
                    { type: 'hint', label: 'Define ore types with depth ranges and rarity. Rarity is chance per tile (0.01 = 1%).' },
                    {
                        key: 'platformerOres',
                        label: 'Ore Types',
                        type: 'arrayGroup',
                        itemLabel: 'Ore',
                        minItems: 0,
                        showIf: { platformerGenerateOres: true },
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Ore' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'minDepth', label: 'Min Depth', type: 'number', default: 5, min: 0, max: 999, hint: 'Min tiles below surface' },
                            { key: 'maxDepth', label: 'Max Depth', type: 'number', default: 999, min: 0, max: 999 },
                            { key: 'veinSizeMin', label: 'Vein Size Min', type: 'number', default: 1, min: 1, max: 20 },
                            { key: 'veinSizeMax', label: 'Vein Size Max', type: 'number', default: 4, min: 1, max: 20 },
                            { key: 'rarity', label: 'Rarity (0-1)', type: 'slider', default: 0.05, min: 0.001, max: 0.3, step: 0.001, hint: 'Chance per tile to start a vein' },
                            { key: 'solid', label: 'Solid', type: 'boolean', default: true }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🌿 Surface Decorations' },
                    { type: 'hint', label: 'Tiles placed on the surface (like trees, flowers). These sit above the grass layer.' },
                    {
                        key: 'platformerDecorations',
                        label: 'Decorations',
                        type: 'arrayGroup',
                        itemLabel: 'Decoration',
                        minItems: 0,
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Decoration' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'chance', label: 'Chance (0-1)', type: 'slider', default: 0.1, min: 0, max: 1, step: 0.01 },
                            { key: 'onSurface', label: 'On Surface', type: 'boolean', default: true, hint: 'Place above the surface tile' }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '☁️ Sky' },
                    { type: 'hint', label: 'Tile to fill the sky area. Set X to -1 for empty sky.' },
                    { key: 'platformerSkyTileX', type: 'number', label: 'Sky Tile X', default: -1, min: -1, max: 255 },
                    { key: 'platformerSkyTileY', type: 'number', label: 'Sky Tile Y', default: -1, min: -1, max: 255 },
                { type: 'groupEnd' },
                
            { type: 'groupEnd' },
            
            // ============================================================
            // CITY SETTINGS
            // ============================================================
            { type: 'groupStart', label: '🏙️ City Settings', showIf: { generationMode: 'city' } },
            
                { type: 'groupStart', label: '🏗️ Basic Layout (Non-District Mode)' },
                    { type: 'hint', label: 'These settings are used when Districts are disabled.' },
                    { key: 'cityBlockSizeMin', type: 'number', label: 'Block Size Min', default: 8, min: 4, max: 32, hint: 'Minimum city block size in tiles', showIf: { cityUseDistricts: false } },
                    { key: 'cityBlockSizeMax', type: 'number', label: 'Block Size Max', default: 16, min: 4, max: 64, hint: 'Maximum city block size in tiles', showIf: { cityUseDistricts: false } },
                    { key: 'cityMaxLanes', type: 'number', label: 'Max Lane Count', default: 4, min: 1, max: 6, hint: 'Max lanes per road (each side)', showIf: { cityUseDistricts: false } },
                    { key: 'cityFootpathWidth', type: 'number', label: 'Footpath Width', default: 1, min: 0, max: 3, hint: 'Tiles of footpath on each side of road', showIf: { cityUseDistricts: false } },
                    { key: 'cityParksChance', type: 'slider', label: 'Park Chance', default: 0.15, min: 0, max: 0.5, step: 0.05, hint: 'Chance for a block to be a park instead of a building lot', showIf: { cityUseDistricts: false } },
                    { key: 'cityBuildingFillTile', type: 'boolean', label: 'Fill Building Lots', default: false, hint: 'Fill building areas with a tile instead of empty' },
                    {
                        key: 'cityIntersectionStyle',
                        type: 'select',
                        label: 'Intersection Style',
                        default: 'open',
                        options: {
                            'open': '🔲 Open',
                            'roundabout': '🔵 Roundabout'
                        }
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🛤️ Road Variation' },
                    { type: 'hint', label: 'Create more organic road layouts with dead ends and alleys.' },
                    { key: 'cityDeadEndChance', type: 'slider', label: 'Dead End Chance', default: 0.25, min: 0, max: 0.6, step: 0.05, hint: 'Chance for a road to end before crossing the map', showIf: { cityUseDistricts: false } },
                    { key: 'cityDeadEndMinLength', type: 'slider', label: 'Dead End Min Length', default: 0.3, min: 0.1, max: 0.8, step: 0.05, hint: 'Minimum road length before it can become a dead end (0-1)' },
                    {
                        key: 'cityDeadEndCapStyle',
                        type: 'select',
                        label: 'Dead End Style',
                        default: 'building',
                        options: {
                            'building': '🏢 Building (cul-de-sac)',
                            'park': '🌳 Park/Green Space',
                            'turnaround': '🔄 Turnaround Circle'
                        }
                    },
                    { key: 'cityAlleyChance', type: 'slider', label: 'Alley Chance', default: 0.15, min: 0, max: 0.5, step: 0.05, hint: 'Chance for narrow alleys between buildings' },
                    { key: 'cityAlleyWidth', type: 'number', label: 'Alley Width', default: 1, min: 1, max: 2, hint: 'Alley width in tiles' },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🗺️ Districts (Biomes)' },
                    { type: 'hint', label: 'Districts create varied city areas like downtown, residential, and industrial zones. Each district can have unique road styles, block sizes, and building types.' },
                    { key: 'cityUseDistricts', type: 'boolean', label: '✨ Enable Districts', default: true, hint: 'Use district system for varied city generation' },
                    {
                        key: 'cityDistricts',
                        label: 'City Districts',
                        type: 'arrayGroup',
                        itemLabel: 'District',
                        minItems: 1,
                        showIf: { cityUseDistricts: true },
                        itemProperties: [
                            { key: 'name', label: '📛 Name', type: 'text', default: 'District' },
                            { key: 'weight', label: '⚖️ Spawn Weight', type: 'number', default: 1, min: 0.1, max: 10, hint: 'Higher = more common' },
                            { key: 'blockSizeMin', label: 'Block Size Min', type: 'number', default: 8, min: 4, max: 32 },
                            { key: 'blockSizeMax', label: 'Block Size Max', type: 'number', default: 16, min: 4, max: 64 },
                            { key: 'maxLanes', label: 'Max Lanes', type: 'number', default: 2, min: 1, max: 6 },
                            { key: 'footpathWidth', label: 'Footpath Width', type: 'number', default: 1, min: 0, max: 3 },
                            { key: 'parksChance', label: 'Parks Chance', type: 'slider', default: 0.15, min: 0, max: 0.5, step: 0.05 },
                            { key: 'deadEndChance', label: 'Dead End Chance', type: 'slider', default: 0.25, min: 0, max: 0.6, step: 0.05 },
                            { key: 'buildingDensity', label: 'Building Density', type: 'slider', default: 0.7, min: 0.1, max: 1, step: 0.05, hint: 'How full blocks are with buildings' },
                            {
                                key: 'tiles',
                                label: '🎨 District Tiles',
                                type: 'arrayGroup',
                                itemLabel: 'Tile',
                                minItems: 1,
                                itemProperties: [
                                    { key: 'name', label: 'Name', type: 'text', default: 'Tile' },
                                    { key: 'tileX', label: 'Tile X', type: 'number', default: 0, min: 0, max: 255 },
                                    { key: 'tileY', label: 'Tile Y', type: 'number', default: 0, min: 0, max: 255 },
                                    {
                                        key: 'role',
                                        label: 'Role',
                                        type: 'select',
                                        default: 'footpath',
                                        options: {
                                            'roadVertLeft': '⬆️ Road V Left',
                                            'roadVertRight': '⬇️ Road V Right',
                                            'roadHorizTop': '⬅️ Road H Top',
                                            'roadHorizBottom': '➡️ Road H Bottom',
                                            'roadCenterV': '| Center V',
                                            'roadCenterH': '— Center H',
                                            'footpath': '🚶 Footpath',
                                            'intersection': '✚ Intersection',
                                            'buildingGround': '🏢 Building',
                                            'park': '🌳 Park',
                                            'emptyLot': '⬜ Empty Lot',
                                            'roadEndCap': '🔚 Road End',
                                            'alley': '🚶 Alley'
                                        }
                                    }
                                ]
                            },
                            {
                                key: 'buildingPrefabs',
                                label: '🏢 Building Prefabs',
                                type: 'arrayGroup',
                                itemLabel: 'Building',
                                minItems: 0,
                                hint: 'Prefabs spawn at runtime only. Set prefab names to your project prefabs.',
                                itemProperties: [
                                    { key: 'name', label: 'Name', type: 'text', default: 'Building' },
                                    { key: 'prefab', label: 'Prefab', type: 'prefab', default: '' },
                                    { key: 'widthTiles', label: 'Width (tiles)', type: 'number', default: 2, min: 1, max: 20, hint: 'Building footprint width' },
                                    { key: 'heightTiles', label: 'Height (tiles)', type: 'number', default: 2, min: 1, max: 20, hint: 'Building footprint height' },
                                    { key: 'chance', label: 'Spawn Chance', type: 'slider', default: 0.3, min: 0, max: 1, step: 0.05 },
                                    { key: 'maxPerBlock', label: 'Max Per Block', type: 'number', default: 4, min: 0, max: 20 }
                                ]
                            },
                            {
                                key: 'parkPrefabs',
                                label: '🌳 Park Prefabs',
                                type: 'arrayGroup',
                                itemLabel: 'Decoration',
                                minItems: 0,
                                itemProperties: [
                                    { key: 'name', label: 'Name', type: 'text', default: 'Tree' },
                                    { key: 'prefab', label: 'Prefab', type: 'prefab', default: '' },
                                    { key: 'widthTiles', label: 'Width (tiles)', type: 'number', default: 1, min: 1, max: 10 },
                                    { key: 'heightTiles', label: 'Height (tiles)', type: 'number', default: 1, min: 1, max: 10 },
                                    { key: 'chance', label: 'Spawn Chance', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05 },
                                    { key: 'maxPerBlock', label: 'Max Per Block', type: 'number', default: 10, min: 0, max: 50 }
                                ]
                            }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🏢 Building Prefabs (Non-District)', showIf: { cityUseDistricts: false } },
                    { type: 'hint', label: '⚠️ Building prefabs are spawned at RUNTIME only (when game is playing). Configure prefab names from your project\'s prefabs.' },
                    { key: 'citySpawnBuildingPrefabs', type: 'boolean', label: '🏗️ Spawn Building Prefabs', default: true },
                    {
                        key: 'cityBuildingPrefabs',
                        label: 'Building Prefabs',
                        type: 'arrayGroup',
                        itemLabel: 'Building',
                        minItems: 0,
                        showIf: { citySpawnBuildingPrefabs: true },
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Building' },
                            { key: 'prefab', label: 'Prefab', type: 'prefab', default: '' },
                            { key: 'widthTiles', label: 'Width (tiles)', type: 'number', default: 2, min: 1, max: 20, hint: 'Building footprint width in tilemap tiles' },
                            { key: 'heightTiles', label: 'Height (tiles)', type: 'number', default: 2, min: 1, max: 20, hint: 'Building footprint height in tilemap tiles' },
                            { key: 'chance', label: 'Spawn Chance', type: 'slider', default: 0.3, min: 0, max: 1, step: 0.05 },
                            { key: 'minPerBlock', label: 'Min Per Block', type: 'number', default: 0, min: 0, max: 20 },
                            { key: 'maxPerBlock', label: 'Max Per Block', type: 'number', default: 4, min: 0, max: 20 }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🌳 Park Prefabs (Non-District)', showIf: { cityUseDistricts: false } },
                    { type: 'hint', label: '⚠️ Park decorations (trees, benches) spawn at RUNTIME only. Configure prefab names from your project.' },
                    {
                        key: 'cityParkPrefabs',
                        label: 'Park Prefabs',
                        type: 'arrayGroup',
                        itemLabel: 'Decoration',
                        minItems: 0,
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Tree' },
                            { key: 'prefab', label: 'Prefab', type: 'prefab', default: '' },
                            { key: 'widthTiles', label: 'Width (tiles)', type: 'number', default: 1, min: 1, max: 10 },
                            { key: 'heightTiles', label: 'Height (tiles)', type: 'number', default: 1, min: 1, max: 10 },
                            { key: 'chance', label: 'Spawn Chance', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05 },
                            { key: 'minPerBlock', label: 'Min Per Block', type: 'number', default: 2, min: 0, max: 20 },
                            { key: 'maxPerBlock', label: 'Max Per Block', type: 'number', default: 10, min: 0, max: 50 }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🛣️ City Tiles (Non-District)' },
                    { type: 'hint', label: 'Assign tiles for roads, footpaths, and building areas. Role determines how each tile is used.' },
                    {
                        key: 'cityTiles',
                        label: 'City Tiles',
                        type: 'arrayGroup',
                        itemLabel: 'Tile',
                        minItems: 1,
                        showIf: { cityUseDistricts: false },
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Tile' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            {
                                key: 'role',
                                label: 'Role',
                                type: 'select',
                                default: 'footpath',
                                options: {
                                    'roadVertLeft': '⬆️ Road Vertical Left Lane',
                                    'roadVertRight': '⬇️ Road Vertical Right Lane',
                                    'roadHorizTop': '⬅️ Road Horizontal Top Lane',
                                    'roadHorizBottom': '➡️ Road Horizontal Bottom Lane',
                                    'roadCenterV': '| Road Center Line Vertical',
                                    'roadCenterH': '— Road Center Line Horizontal',
                                    'footpath': '🚶 Footpath / Sidewalk',
                                    'intersection': '✚ Road Intersection',
                                    'buildingGround': '🏢 Building Ground',
                                    'park': '🌳 Park / Green Space',
                                    'emptyLot': '⬜ Empty Lot',
                                    'roadEndCap': '🔚 Road End Cap',
                                    'alley': '🚶 Alley'
                                }
                            }
                        ]
                    },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🧹 Generated Objects' },
                    { type: 'hint', label: 'Manage spawned building and park prefabs.' },
                    {
                        type: 'button',
                        buttonText: '🗑️ Clear Generated Objects',
                        buttonStyle: 'danger',
                        tooltip: 'Remove all spawned building/park prefabs (keeps tilemap)',
                        onClick: function(module, editor) {
                            module.clearGeneratedObjects();
                            if (window.app && window.app.showNotification) {
                                window.app.showNotification('🗑️ Cleared generated objects');
                            }
                        }
                    },
                    {
                        type: 'custom',
                        render: function(container, module, editor) {
                            // Check both runtime refs and saved metadata
                            const runtimeCount = module._generatedObjects ? module._generatedObjects.length : 0;
                            const savedCount = module._generatedObjectsData ? module._generatedObjectsData.length : 0;
                            const count = runtimeCount || savedCount;
                            const source = runtimeCount > 0 ? '(current session)' : savedCount > 0 ? '(from saved data)' : '';
                            container.innerHTML = `<div style="padding: 8px; background: #1a1a2e; border-radius: 4px; font-size: 12px;">
                                <strong>📊 Generated Objects:</strong> ${count} prefabs ${source}
                            </div>`;
                        }
                    },
                { type: 'groupEnd' },
                
            { type: 'groupEnd' },
            
            // ============================================================
            // OVERWORLD SETTINGS
            // ============================================================
            { type: 'groupStart', label: '🌳 Overworld Settings', showIf: { generationMode: 'overworld' } },
            
                { type: 'groupStart', label: '🗺️ Terrain Generation' },
                    { key: 'overworldNoiseScale', type: 'slider', label: 'Noise Scale', default: 0.05, min: 0.01, max: 0.2, step: 0.005, hint: 'Lower = larger terrain features' },
                    { key: 'overworldNoiseOctaves', type: 'number', label: 'Detail Octaves', default: 4, min: 1, max: 8 },
                    { key: 'overworldWaterLevel', type: 'slider', label: 'Water Level', default: 0.35, min: 0, max: 0.8, step: 0.05, hint: 'Noise values below this become water' },
                    { key: 'overworldForestLevel', type: 'slider', label: 'Forest Level', default: 0.55, min: 0.2, max: 0.9, step: 0.05 },
                    { key: 'overworldMountainLevel', type: 'slider', label: 'Mountain Level', default: 0.75, min: 0.4, max: 1.0, step: 0.05 },
                    { key: 'overworldLakeSmoothing', type: 'number', label: 'Lake Smoothing', default: 3, min: 0, max: 8 },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🛤️ Paths' },
                    { key: 'overworldPathCount', type: 'number', label: 'Path Count', default: 3, min: 0, max: 10, hint: 'Number of random paths through the world' },
                    { key: 'overworldPathWidth', type: 'number', label: 'Path Width', default: 1, min: 1, max: 4 },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🎨 Overworld Tiles' },
                    { type: 'hint', label: 'Assign tiles for each terrain type. Roles: deepWater, shallowWater, sand, grass, forest, denseForest, mountain, snow, path' },
                    {
                        key: 'overworldTiles',
                        label: 'Terrain Tiles',
                        type: 'arrayGroup',
                        itemLabel: 'Tile',
                        minItems: 1,
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Tile' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            {
                                key: 'role',
                                label: 'Terrain Role',
                                type: 'select',
                                default: 'grass',
                                options: {
                                    'deepWater': '🌊 Deep Water',
                                    'shallowWater': '💧 Shallow Water',
                                    'sand': '🏖️ Sand / Beach',
                                    'grass': '🌿 Grass',
                                    'forest': '🌲 Forest',
                                    'denseForest': '🌳 Dense Forest',
                                    'mountain': '⛰️ Mountain',
                                    'snow': '❄️ Snow Peak',
                                    'path': '🛤️ Path / Trail'
                                }
                            },
                            { key: 'solid', label: 'Solid', type: 'boolean', default: false }
                        ]
                    },
                { type: 'groupEnd' },
                
            { type: 'groupEnd' },
            
            // ============================================================
            // CAVE SETTINGS
            // ============================================================
            { type: 'groupStart', label: '🕳️ Cave Settings', showIf: { generationMode: 'cave' } },
            
                { type: 'groupStart', label: '🪨 Cave Generation' },
                    { key: 'caveFillPercent', type: 'slider', label: 'Wall Fill %', default: 0.45, min: 0.3, max: 0.65, step: 0.01, hint: 'Initial random wall fill. Higher = denser caves' },
                    { key: 'caveSmoothPasses', type: 'number', label: 'Smooth Passes', default: 5, min: 1, max: 10, hint: 'More passes = smoother caves' },
                    { key: 'caveMinWallNeighbors', type: 'number', label: 'Min Wall Neighbors', default: 4, min: 3, max: 6, hint: 'Cells with >= this many wall neighbors become wall' },
                    { key: 'caveConnectRegions', type: 'boolean', label: 'Connect All Regions', default: true, hint: 'Ensure all open areas are connected' },
                    { key: 'caveOreGeneration', type: 'boolean', label: 'Generate Ores', default: true },
                { type: 'groupEnd' },
                
                { type: 'groupStart', label: '🎨 Cave Tiles' },
                    { type: 'hint', label: 'Assign tiles for cave floors, walls, decorations. Roles: floor, wall, wallTop, decoration, crystal, water' },
                    {
                        key: 'caveTiles',
                        label: 'Cave Tiles',
                        type: 'arrayGroup',
                        itemLabel: 'Tile',
                        minItems: 1,
                        itemProperties: [
                            { key: 'name', label: 'Name', type: 'text', default: 'Tile' },
                            { key: 'tileX', label: 'Tile Sheet X', type: 'number', default: 0, min: 0, max: 255 },
                            { key: 'tileY', label: 'Tile Sheet Y', type: 'number', default: 0, min: 0, max: 255 },
                            {
                                key: 'role',
                                label: 'Role',
                                type: 'select',
                                default: 'floor',
                                options: {
                                    'floor': '⬜ Cave Floor',
                                    'wall': '🧱 Cave Wall',
                                    'wallTop': '🔝 Wall Top Edge',
                                    'decoration': '🪨 Decoration (stalagmite etc)',
                                    'crystal': '💎 Crystal',
                                    'water': '💧 Underground Water'
                                }
                            },
                            { key: 'solid', label: 'Solid', type: 'boolean', default: true }
                        ]
                    },
                { type: 'groupEnd' },
                
            { type: 'groupEnd' },
            
            // ============================================================
            // NODE SYSTEM (City mode)
            // ============================================================
            { type: 'groupStart', label: '🗺️ Node System', showIf: { generationMode: 'city' } },
                { type: 'hint', label: 'Node system creates pathfinding nodes on walkable tiles. NPCs can follow these nodes for realistic movement.' },
                { key: 'enableNodeSystem', type: 'boolean', label: '✨ Enable Node System', default: false },
                {
                    key: 'drivingSide',
                    type: 'select',
                    label: '🚗 Driving Side',
                    default: 'right',
                    showIf: { enableNodeSystem: true },
                    options: {
                        'left': '⬅️ Left (UK/Japan)',
                        'right': '➡️ Right (US/EU)'
                    },
                    hint: 'Which side of the road vehicles drive on'
                },
                { type: 'groupStart', label: '🔗 Node Type Mappings', showIf: { enableNodeSystem: true } },
                    { type: 'hint', label: 'Map tile roles to node IDs. NPCs use node IDs to determine which paths to follow.' },
                    {
                        key: 'nodeTypeMappings',
                        label: 'Mappings',
                        type: 'arrayGroup',
                        itemLabel: 'Mapping',
                        minItems: 0,
                        itemProperties: [
                            {
                                key: 'role',
                                label: 'Tile Role',
                                type: 'select',
                                default: 'footpath',
                                options: {
                                    'footpath': '🚶 Footpath',
                                    'roadVertLeft': '⬆️ Road V Left',
                                    'roadVertRight': '⬇️ Road V Right',
                                    'roadHorizTop': '⬅️ Road H Top',
                                    'roadHorizBottom': '➡️ Road H Bottom',
                                    'intersection': '✚ Intersection',
                                    'alley': '🚶 Alley',
                                    'park': '🌳 Park'
                                }
                            },
                            { key: 'nodeId', label: 'Node ID', type: 'text', default: 'pedestrian', hint: 'String ID like "pedestrian", "vehicle"' }
                        ]
                    },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            
            // ============================================================
            // NPC SPAWN POOLING (City mode)
            // ============================================================
            { type: 'groupStart', label: '👥 NPC Spawning', showIf: { generationMode: 'city' } },
                { type: 'hint', label: 'Spawn NPCs at nodes outside viewport. They despawn past the margin and respawn elsewhere.' },
                { key: 'enableNPCSpawning', type: 'boolean', label: '✨ Enable NPC Spawning', default: false },
                { key: 'npcViewportMargin', type: 'number', label: 'Viewport Margin (px)', default: 100, min: 0, max: 500, showIf: { enableNPCSpawning: true }, hint: 'Distance outside viewport before spawn/despawn' },
                
                { type: 'groupStart', label: '📋 Spawn Configurations', showIf: { enableNPCSpawning: true } },
                    {
                        key: 'npcSpawnConfigs',
                        label: 'NPC Types',
                        type: 'arrayGroup',
                        itemLabel: 'NPC Type',
                        minItems: 0,
                        itemProperties: [
                            { key: 'name', label: '📛 Name', type: 'text', default: 'NPC' },
                            { key: 'nodeId', label: '🗺️ Node ID', type: 'text', default: 'pedestrian', hint: 'Which node type to spawn on' },
                            { key: 'maxInstances', label: '📊 Max Instances', type: 'number', default: 10, min: 1, max: 100 },
                            { key: 'spawnRadiusMin', label: 'Spawn Radius Min', type: 'number', default: 0, min: 0, max: 64 },
                            { key: 'spawnRadiusMax', label: 'Spawn Radius Max', type: 'number', default: 8, min: 0, max: 64 },
                            {
                                key: 'prefabs',
                                label: '🎭 Prefabs (Weighted)',
                                type: 'arrayGroup',
                                itemLabel: 'Prefab',
                                minItems: 1,
                                itemProperties: [
                                    { key: 'prefab', label: 'Prefab', type: 'prefab', default: '' },
                                    { key: 'weight', label: 'Weight', type: 'number', default: 1, min: 0.1, max: 10, hint: 'Higher = more likely' }
                                ]
                            }
                        ]
                    },
                { type: 'groupEnd' },
                
                {
                    type: 'custom',
                    showIf: { enableNPCSpawning: true },
                    render: function(container, module, editor) {
                        const nodeCount = module._allNodes ? module._allNodes.length : 0;
                        const activeCount = module._activeNPCs ? module._activeNPCs.length : 0;
                        let poolInfo = '';
                        if (module._npcPools) {
                            const entries = Object.entries(module._npcPools);
                            poolInfo = entries.map(([name, pool]) => `${name}: ${pool.active.length}/${pool.config.maxInstances} (${pool.inactive.length} pooled)`).join(', ');
                        }
                        container.innerHTML = `<div style="padding: 8px; background: #1a1a2e; border-radius: 4px; font-size: 12px;">
                            <strong>📊 Node System:</strong> ${nodeCount} nodes<br>
                            <strong>👥 Active NPCs:</strong> ${activeCount}<br>
                            ${poolInfo ? `<strong>🏊 Pools:</strong> ${poolInfo}` : ''}
                        </div>`;
                    }
                },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE ====================
    
    start() {
        // Skip auto-generation in editor mode
        // Check both isEditing flag and engine.isEditor to handle timing edge cases
        // (isEditing may not be set yet when start() is called during scene load)
        if (this.gameObject.isEditing) return;
        if (this.gameObject._engine && this.gameObject._engine.isEditor) return;

        // Optionally auto-generate - for now, manual via button
        this.generate();
        
        // Initialize node system after generation (also required for NPC spawning)
        if ((this.enableNodeSystem || this.enableNPCSpawning) && this.generationMode === 'city') {
           // console.log('[TilemapWorldGenerator] About to call _buildNodeMap()...');
            try {
                this._buildNodeMap();
                //console.log(`[TilemapWorldGenerator] Node map built: ${this._allNodes.length} nodes total`);
            } catch (e) {
               // console.error('[TilemapWorldGenerator] _buildNodeMap FAILED:', e);
            }
        } else {
            //console.log(`[TilemapWorldGenerator] Skipping node build: enableNodeSystem=${this.enableNodeSystem}, enableNPCSpawning=${this.enableNPCSpawning}, mode=${this.generationMode}`);
        }
        
        // Initialize NPC pooling system
        if (this.enableNPCSpawning && this.generationMode === 'city') {
            //console.log('[TilemapWorldGenerator] Initializing NPC pools...');
            this._initNPCPools();
            //console.log(`[TilemapWorldGenerator] NPC pools initialized: ${Object.keys(this._npcPools).length} pools`);
        }
    }
    
    loop(deltaTime) {
        // Handle NPC spawn/despawn based on viewport
        if (this.enableNPCSpawning && this._hasNPCPools) {
            this._updateNPCSpawning(deltaTime);
        }
    }
    
    // ==================== TILEMAP ACCESS ====================
    
    /**
     * Get the TilemapRenderer on this game object
     * @returns {TilemapRenderer|null}
     */
    _getTilemapRenderer() {
        if (this._tilemapRenderer && this._tilemapRenderer.gameObject === this.gameObject) {
            return this._tilemapRenderer;
        }
        if (this.gameObject && this.gameObject.modules) {
            // Search directly in modules array to find TilemapRenderer regardless of enabled state
            for (const mod of this.gameObject.modules) {
                if (mod.constructor.name === 'TilemapRenderer') {
                    this._tilemapRenderer = mod;
                    return mod;
                }
            }
        }
        return null;
    }
    
    // ==================== SEEDED RNG ====================
    
    /**
     * Initialize the seeded RNG
     */
    _initRng(seed) {
        this._rngState = seed || this.seed;
    }
    
    /**
     * Seeded random number generator (Mulberry32)
     * @returns {number} Random float 0-1
     */
    _random() {
        this._rngState |= 0;
        this._rngState = this._rngState + 0x6D2B79F5 | 0;
        let t = Math.imul(this._rngState ^ this._rngState >>> 15, 1 | this._rngState);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    
    /**
     * Random integer in range [min, max] inclusive
     */
    _randomInt(min, max) {
        return Math.floor(this._random() * (max - min + 1)) + min;
    }
    
    /**
     * Random float in range [min, max]
     */
    _randomFloat(min, max) {
        return this._random() * (max - min) + min;
    }
    
    // ==================== NOISE FUNCTIONS ====================
    
    /**
     * Simple value noise (seeded)
     */
    _noise2D(x, y) {
        // Hash-based value noise
        const n = Math.sin(x * 12.9898 + y * 78.233 + this.seed * 0.1) * 43758.5453;
        return n - Math.floor(n);
    }
    
    /**
     * Smoothed noise
     */
    _smoothNoise(x, y) {
        const corners = (this._noise2D(x-1, y-1) + this._noise2D(x+1, y-1) + 
                         this._noise2D(x-1, y+1) + this._noise2D(x+1, y+1)) / 16;
        const sides = (this._noise2D(x-1, y) + this._noise2D(x+1, y) +
                       this._noise2D(x, y-1) + this._noise2D(x, y+1)) / 8;
        const center = this._noise2D(x, y) / 4;
        return corners + sides + center;
    }
    
    /**
     * Interpolated noise
     */
    _interpolatedNoise(x, y) {
        const intX = Math.floor(x);
        const intY = Math.floor(y);
        const fracX = x - intX;
        const fracY = y - intY;
        
        // Smoothstep interpolation
        const sx = fracX * fracX * (3 - 2 * fracX);
        const sy = fracY * fracY * (3 - 2 * fracY);
        
        const v1 = this._smoothNoise(intX, intY);
        const v2 = this._smoothNoise(intX + 1, intY);
        const v3 = this._smoothNoise(intX, intY + 1);
        const v4 = this._smoothNoise(intX + 1, intY + 1);
        
        const i1 = v1 + sx * (v2 - v1);
        const i2 = v3 + sx * (v4 - v3);
        return i1 + sy * (i2 - i1);
    }
    
    /**
     * Multi-octave Perlin-like noise
     */
    _perlinNoise(x, y, scale, octaves) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this._interpolatedNoise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
    
    // ==================== MAIN GENERATE ====================
    
    /**
     * Generate the world based on current mode
     */
    generate() {
        const tm = this._getTilemapRenderer();
        if (!tm) {
            //console.warn('[TilemapWorldGenerator] No TilemapRenderer found on this game object!');
            if (window.app && window.app.showNotification) {
                window.app.showNotification('⚠️ TilemapWorldGenerator requires a TilemapRenderer module on this game object!');
            }
            return;
        }
        
        // Validate map dimensions
        if (tm.mapWidth < 1 || tm.mapHeight < 1) {
            //console.warn('[TilemapWorldGenerator] Invalid map dimensions:', tm.mapWidth, 'x', tm.mapHeight);
            if (window.app && window.app.showNotification) {
                window.app.showNotification('⚠️ Map dimensions must be at least 1x1!');
            }
            return;
        }
        
        //console.log(`[TilemapWorldGenerator] Generating ${this.generationMode} world (${tm.mapWidth}x${tm.mapHeight})...`);
        
        // Seed the RNG
        const actualSeed = this.useRandomSeed ? Math.floor(Math.random() * 999999) : this.seed;
        this._initRng(actualSeed);
        
        // Clear existing map
        tm.clearMap();
        tm.clearAllSolid();
        
        // Ensure map data is initialized
        if (tm.mapData.length !== tm.mapWidth * tm.mapHeight) {
            tm.initializeMapData();
        }
        if (tm.solidData.length !== tm.mapWidth * tm.mapHeight) {
            tm.initializeSolidData();
        }
        
        // Generate based on mode
        switch (this.generationMode) {
            case 'platformer':
                this._generatePlatformer(tm);
                break;
            case 'city':
                this._generateCity(tm);
                break;
            case 'overworld':
                this._generateOverworld(tm);
                break;
            case 'cave':
                this._generateCave(tm);
                break;
        }
        
        // Invalidate rendering cache
        tm.invalidateOffscreenCache();
        this._generated = true;
        
        // Clean up generation temp data that's no longer needed
        // (district map is only needed during city generation, not at runtime)
        if (this.generationMode !== 'city') {
            this._districtMap = null;
        }
    }
    
    // ==================== PLATFORMER GENERATION ====================
    
    /**
     * Generate a Terraria-style 2D platformer world
     */
    _generatePlatformer(tm) {
        const width = tm.mapWidth;
        const height = tm.mapHeight;
        
        // Step 1: Generate surface heightmap
        const surfaceY = this._generateSurfaceHeightmap(width, height);
        
        // Step 2: Fill terrain layers
        this._fillPlatformerTerrain(tm, width, height, surfaceY);
        
        // Step 3: Carve caves
        if (this.platformerGenerateCaves) {
            this._carvePlatformerCaves(tm, width, height, surfaceY);
        }
        
        // Step 4: Generate ores
        if (this.platformerGenerateOres) {
            this._generatePlatformerOres(tm, width, height, surfaceY);
        }
        
        // Step 5: Place surface decorations
        this._placePlatformerDecorations(tm, width, height, surfaceY);
        
        // Step 6: Fill sky
        this._fillPlatformerSky(tm, width, height, surfaceY);
    }
    
    /**
     * Generate height map for platformer surface
     */
    _generateSurfaceHeightmap(width, height) {
        const baseSurfaceY = Math.floor(height * this.platformerSurfaceY);
        const surfaceY = new Array(width);
        
        for (let x = 0; x < width; x++) {
            // Multi-octave noise for natural-looking terrain
            let noiseVal = 0;
            noiseVal += Math.sin(x * this.platformerHillFrequency * Math.PI + this.seed * 0.1) * 0.5;
            noiseVal += Math.sin(x * this.platformerHillFrequency * 2.3 * Math.PI + this.seed * 0.37) * 0.25;
            noiseVal += Math.sin(x * this.platformerHillFrequency * 5.1 * Math.PI + this.seed * 0.73) * 0.125;
            
            // Add some noise variation
            noiseVal += (this._noise2D(x * 0.1, this.seed) - 0.5) * 0.3;
            
            surfaceY[x] = Math.round(baseSurfaceY + noiseVal * this.platformerHillAmplitude);
            surfaceY[x] = Math.max(1, Math.min(height - 2, surfaceY[x]));
        }
        
        // Smooth surface if enabled
        if (this.platformerSurfaceSmoothing) {
            for (let pass = 0; pass < 2; pass++) {
                const smoothed = [...surfaceY];
                for (let x = 1; x < width - 1; x++) {
                    smoothed[x] = Math.round((surfaceY[x - 1] + surfaceY[x] * 2 + surfaceY[x + 1]) / 4);
                }
                for (let x = 0; x < width; x++) surfaceY[x] = smoothed[x];
            }
        }
        
        return surfaceY;
    }
    
    /**
     * Fill platformer terrain based on layer definitions
     */
    _fillPlatformerTerrain(tm, width, height, surfaceY) {
        // Sort layers by depthMin to ensure correct painting order
        const layers = [...this.platformerLayers].sort((a, b) => a.depthMin - b.depthMin);
        
        for (let x = 0; x < width; x++) {
            const surface = surfaceY[x];
            
            for (let y = surface; y < height; y++) {
                const depth = y - surface;
                
                // Find which layer this depth belongs to
                let layerTile = null;
                let isSolid = false;
                
                for (let i = layers.length - 1; i >= 0; i--) {
                    const layer = layers[i];
                    const depthMin = layer.depthMin || 0;
                    let depthMax = layer.depthMax;
                    if (depthMax === undefined || depthMax === null) depthMax = 999;
                    
                    // Simple depth check - use the layer's defined range directly
                    // This ensures no gaps between layers
                    
                    if (depth >= depthMin && depth <= depthMax) {
                        layerTile = layer;
                        isSolid = layer.solid !== false;
                        break;
                    }
                }
                
                if (layerTile) {
                    tm.setTileAt(x, y, layerTile.tileX, layerTile.tileY);
                    tm.setSolidAt(x, y, isSolid);
                }
            }
        }
    }
    
    /**
     * Carve caves using cellular automata
     */
    _carvePlatformerCaves(tm, width, height, surfaceY) {
        // Create cave map using cellular automata
        const caveMap = [];
        for (let y = 0; y < height; y++) {
            caveMap[y] = new Array(width).fill(false);
        }
        
        // Initialize with random noise (only below cave min depth)
        for (let x = 0; x < width; x++) {
            const surface = surfaceY[x];
            for (let y = 0; y < height; y++) {
                const depth = y - surface;
                if (depth >= this.platformerCaveMinDepth) {
                    caveMap[y][x] = this._random() < this.platformerCaveChance;
                }
            }
        }
        
        // Cellular automata smoothing
        for (let pass = 0; pass < this.platformerCaveSmoothPasses; pass++) {
            const newMap = caveMap.map(row => [...row]);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            if (caveMap[y + dy][x + dx]) neighbors++;
                        }
                    }
                    // Rule: become open if >= 4 neighbors are open, wall otherwise
                    newMap[y][x] = neighbors >= 4;
                }
            }
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    caveMap[y][x] = newMap[y][x];
                }
            }
        }
        
        // Apply caves: clear tiles where cave map is true
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (caveMap[y][x]) {
                    tm.clearTileAt(x, y);
                    tm.setSolidAt(x, y, false);
                }
            }
        }
    }
    
    /**
     * Generate ore veins in the terrain
     */
    _generatePlatformerOres(tm, width, height, surfaceY) {
        for (const ore of this.platformerOres) {
            for (let x = 0; x < width; x++) {
                const surface = surfaceY[x];
                for (let y = 0; y < height; y++) {
                    const depth = y - surface;
                    
                    // Check depth range
                    if (depth < (ore.minDepth || 0) || depth > (ore.maxDepth || 999)) continue;
                    
                    // Only place ore where there's existing terrain (not in caves)
                    if (!tm.getTileAt(x, y)) continue;
                    
                    // Rarity check
                    if (this._random() > (ore.rarity || 0.05)) continue;
                    
                    // Generate a vein
                    const veinSize = this._randomInt(ore.veinSizeMin || 1, ore.veinSizeMax || 3);
                    this._placeOreVein(tm, x, y, ore, veinSize, width, height, surfaceY);
                }
            }
        }
    }
    
    /**
     * Place a single ore vein using random walk
     */
    _placeOreVein(tm, startX, startY, ore, veinSize, width, height, surfaceY) {
        let cx = startX;
        let cy = startY;
        
        for (let i = 0; i < veinSize; i++) {
            if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                // Only place ore on existing terrain
                if (tm.getTileAt(cx, cy)) {
                    tm.setTileAt(cx, cy, ore.tileX, ore.tileY);
                    tm.setSolidAt(cx, cy, ore.solid !== false);
                }
            }
            
            // Random walk
            const dir = this._randomInt(0, 3);
            if (dir === 0) cx++;
            else if (dir === 1) cx--;
            else if (dir === 2) cy++;
            else cy--;
        }
    }
    
    /**
     * Place surface decorations (trees, flowers, etc.)
     */
    _placePlatformerDecorations(tm, width, height, surfaceY) {
        for (const deco of this.platformerDecorations) {
            for (let x = 0; x < width; x++) {
                if (this._random() > (deco.chance || 0.1)) continue;
                
                const surface = surfaceY[x];
                
                if (deco.onSurface) {
                    // Place 1 tile above surface
                    const py = surface - 1;
                    if (py >= 0 && !tm.getTileAt(x, py)) {
                        tm.setTileAt(x, py, deco.tileX, deco.tileY);
                        // Decorations are not solid by default
                    }
                }
            }
        }
    }
    
    /**
     * Fill sky area with sky tiles (or leave empty)
     */
    _fillPlatformerSky(tm, width, height, surfaceY) {
        if (this.platformerSkyTileX < 0) return; // Skip if set to -1
        
        for (let x = 0; x < width; x++) {
            const surface = surfaceY[x];
            for (let y = 0; y < surface; y++) {
                if (!tm.getTileAt(x, y)) { // Don't overwrite decorations
                    tm.setTileAt(x, y, this.platformerSkyTileX, this.platformerSkyTileY);
                    tm.setSolidAt(x, y, false);
                }
            }
        }
    }
    
    // ==================== CITY GENERATION ====================
    
    /**
     * Clear all generated prefab objects (buildings, trees, etc)
     * Works both during runtime (using object references) and after reload (using saved metadata)
     */
    clearGeneratedObjects() {
        const tm = this._getTilemapRenderer();
        const tileW = tm?.tileWidth || 32;
        const tileH = tm?.tileHeight || 32;
        
        // First, try to destroy objects we have direct references to (current session)
        if (this._generatedObjects && this._generatedObjects.length > 0) {
            for (const obj of this._generatedObjects) {
                if (obj.gameObject && typeof instanceDestroy === 'function') {
                    try {
                        instanceDestroy(obj.gameObject);
                    } catch (e) {
                        // Object may already be destroyed
                    }
                }
            }
        }
        
        // Second, use saved metadata to find and destroy objects (after reload)
        // This handles the case where project was saved, closed, and reopened
        if (this._generatedObjectsData && this._generatedObjectsData.length > 0 && typeof instanceFindByPrefab === 'function') {
            for (const data of this._generatedObjectsData) {
                if (!data.prefab) continue;
                
                // Calculate the pixel position where this object was spawned
                const pixelX = data.tileX * tileW + (data.widthTiles * tileW) / 2;
                const pixelY = data.tileY * tileH + (data.heightTiles * tileH) / 2;
                
                // Find all instances of this prefab and destroy ones at this position
                try {
                    const instances = instanceFindByPrefab(data.prefab);
                    for (const inst of instances) {
                        // Check if instance is at the expected position (with small tolerance)
                        const dx = Math.abs(inst.x - pixelX);
                        const dy = Math.abs(inst.y - pixelY);
                        if (dx < tileW && dy < tileH) {
                            instanceDestroy(inst);
                        }
                    }
                } catch (e) {
                    // instanceFindByPrefab may not be available in editor
                }
            }
        }
        
        this._generatedObjects = [];
        this._generatedObjectsData = [];
        this._generatedBlocks = [];
    }
    
    /**
     * Generate a top-down city layout
     */
    _generateCity(tm) {
        const width = tm.mapWidth;
        const height = tm.mapHeight;
        
        // Clear any previously spawned objects
        this.clearGeneratedObjects();
        this._generatedObjects = [];
        this._generatedBlocks = [];
        
        // Step 1: Generate district map (if using districts)
        if (this.cityUseDistricts && this.cityDistricts && this.cityDistricts.length > 0) {
            this._districtMap = this._generateDistrictMap(width, height);
        } else {
            this._districtMap = null;
        }
        
        // Get tile role lookup (use default tiles or first district)
        const defaultTiles = this._getCityTileLookup();
        
        // Step 2: Fill everything with empty lot first
        const emptyLot = defaultTiles['emptyLot'] || defaultTiles['buildingGround'];
        if (emptyLot) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    tm.setTileAt(x, y, emptyLot.tileX, emptyLot.tileY);
                    tm.setSolidAt(x, y, false);
                }
            }
        }
        
        // Step 3: Generate road network (with support for districts and dead ends)
        const roads = this._generateCityRoadsAdvanced(width, height);
        
        // Step 4: Paint roads, footpaths, and intersections
        this._paintCityRoadsAdvanced(tm, width, height, roads, defaultTiles);
        
        // Step 5: Fill building plots and parks (with prefab spawning)
        this._fillCityBlocksAdvanced(tm, width, height, roads, defaultTiles);
    }
    
    /**
     * Generate district map using Voronoi-like noise
     */
    _generateDistrictMap(width, height) {
        const map = [];
        const districts = this.cityDistricts;
        
        // Calculate total weight for random selection
        let totalWeight = 0;
        for (const d of districts) {
            totalWeight += (d.weight || 1);
        }
        
        // Create Voronoi-like regions using noise
        const regionScale = 0.03; // Larger = smaller regions
        
        for (let y = 0; y < height; y++) {
            map[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                // Use noise to create organic district boundaries
                const noiseVal = this._perlinNoise(x, y, regionScale, 3);
                
                // Map noise to district based on weights
                let accumulated = 0;
                let selectedIdx = 0;
                const threshold = noiseVal * totalWeight;
                
                for (let i = 0; i < districts.length; i++) {
                    accumulated += (districts[i].weight || 1);
                    if (threshold < accumulated) {
                        selectedIdx = i;
                        break;
                    }
                }
                
                map[y][x] = selectedIdx;
            }
        }
        
        // Smooth district boundaries
        for (let pass = 0; pass < 3; pass++) {
            const smoothed = map.map(row => [...row]);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    // Count neighbors of each district type
                    const counts = {};
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const d = map[y + dy][x + dx];
                            counts[d] = (counts[d] || 0) + 1;
                        }
                    }
                    // Pick the majority
                    let maxCount = 0;
                    let majority = map[y][x];
                    for (const [d, c] of Object.entries(counts)) {
                        if (c > maxCount) {
                            maxCount = c;
                            majority = parseInt(d);
                        }
                    }
                    smoothed[y][x] = majority;
                }
            }
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    map[y][x] = smoothed[y][x];
                }
            }
        }
        
        return map;
    }
    
    /**
     * Get district settings at a position
     */
    _getDistrictAt(x, y) {
        if (!this.cityUseDistricts || !this._districtMap || !this.cityDistricts) {
            return null;
        }
        
        const height = this._districtMap.length;
        const width = this._districtMap[0]?.length || 0;
        
        if (y < 0 || y >= height || x < 0 || x >= width) {
            return this.cityDistricts[0] || null;
        }
        
        const idx = this._districtMap[y][x];
        return this.cityDistricts[idx] || this.cityDistricts[0] || null;
    }
    
    /**
     * Get city tile lookup by role
     */
    _getCityTileLookup() {
        const lookup = {};
        for (const tile of this.cityTiles) {
            if (tile.role) {
                lookup[tile.role] = tile;
            }
        }
        return lookup;
    }
    
    /**
     * Get tile lookup for a specific district
     */
    _getDistrictTileLookup(district) {
        if (!district || !district.tiles || district.tiles.length === 0) {
            return this._getCityTileLookup();
        }
        
        const lookup = {};
        for (const tile of district.tiles) {
            if (tile.role) {
                lookup[tile.role] = tile;
            }
        }
        return lookup;
    }
    
    /**
     * Generate city road positions with dead ends and varied block sizes
     * Returns { horizontalRoads: [{y, lanes, startX, endX, district}], verticalRoads: [{x, lanes, startY, endY, district}] }
     */
    _generateCityRoadsAdvanced(width, height) {
        const horizontalRoads = [];
        const verticalRoads = [];
        
        // Helper to get block settings for a position
        const getSettings = (x, y) => {
            const district = this._getDistrictAt(x, y);
            if (district) {
                return {
                    blockSizeMin: district.blockSizeMin || this.cityBlockSizeMin,
                    blockSizeMax: district.blockSizeMax || this.cityBlockSizeMax,
                    maxLanes: district.maxLanes || this.cityMaxLanes,
                    footpathWidth: district.footpathWidth ?? this.cityFootpathWidth,
                    deadEndChance: district.deadEndChance ?? this.cityDeadEndChance
                };
            }
            return {
                blockSizeMin: this.cityBlockSizeMin,
                blockSizeMax: this.cityBlockSizeMax,
                maxLanes: this.cityMaxLanes,
                footpathWidth: this.cityFootpathWidth,
                deadEndChance: this.cityDeadEndChance
            };
        };
        
        // Generate vertical roads
        let x = this._randomInt(4, 12);
        while (x < width - 4) {
            const settings = getSettings(x, Math.floor(height / 2));
            const lanes = this._randomInt(1, Math.min(settings.maxLanes, 3));
            const roadWidth = lanes * 2 + (lanes > 1 ? 1 : 0) + settings.footpathWidth * 2;
            
            // Determine if this road is a dead end
            let startY = 0;
            let endY = height - 1;
            
            if (this._random() < settings.deadEndChance) {
                // Create a dead end
                const minLength = Math.floor(height * this.cityDeadEndMinLength);
                if (this._random() < 0.5) {
                    // Dead end at top (starts from bottom)
                    endY = this._randomInt(minLength, Math.floor(height * 0.8));
                } else {
                    // Dead end at bottom (starts from top)
                    startY = this._randomInt(Math.floor(height * 0.2), height - minLength);
                }
            }
            
            verticalRoads.push({
                pos: x,
                lanes: lanes,
                startY: startY,
                endY: endY,
                isDeadEnd: startY > 0 || endY < height - 1,
                district: this._getDistrictAt(x, Math.floor((startY + endY) / 2))
            });
            
            x += this._randomInt(settings.blockSizeMin, settings.blockSizeMax) + roadWidth;
        }
        
        // Generate horizontal roads
        let y = this._randomInt(4, 12);
        while (y < height - 4) {
            const settings = getSettings(Math.floor(width / 2), y);
            const lanes = this._randomInt(1, Math.min(settings.maxLanes, 3));
            const roadHeight = lanes * 2 + (lanes > 1 ? 1 : 0) + settings.footpathWidth * 2;
            
            // Determine if this road is a dead end
            let startX = 0;
            let endX = width - 1;
            
            if (this._random() < settings.deadEndChance) {
                // Create a dead end
                const minLength = Math.floor(width * this.cityDeadEndMinLength);
                if (this._random() < 0.5) {
                    // Dead end at left (starts from right)
                    endX = this._randomInt(minLength, Math.floor(width * 0.8));
                } else {
                    // Dead end at right (starts from left)
                    startX = this._randomInt(Math.floor(width * 0.2), width - minLength);
                }
            }
            
            horizontalRoads.push({
                pos: y,
                lanes: lanes,
                startX: startX,
                endX: endX,
                isDeadEnd: startX > 0 || endX < width - 1,
                district: this._getDistrictAt(Math.floor((startX + endX) / 2), y)
            });
            
            y += this._randomInt(settings.blockSizeMin, settings.blockSizeMax) + roadHeight;
        }
        
        // Sometimes add alleys between existing roads
        const alleyRoads = [];
        if (this.cityAlleyChance > 0) {
            for (let i = 0; i < verticalRoads.length - 1; i++) {
                if (this._random() < this.cityAlleyChance) {
                    const midX = Math.floor((verticalRoads[i].pos + verticalRoads[i + 1].pos) / 2);
                    alleyRoads.push({
                        pos: midX,
                        lanes: 0, // Alleys have no lanes
                        isAlley: true,
                        startY: 0,
                        endY: height - 1,
                        district: this._getDistrictAt(midX, Math.floor(height / 2))
                    });
                }
            }
        }
        
        return { 
            horizontalRoads, 
            verticalRoads: [...verticalRoads, ...alleyRoads]
        };
    }
    
    /**
     * Paint roads onto the tilemap with support for dead ends and districts
     */
    _paintCityRoadsAdvanced(tm, width, height, roads, defaultTiles) {
        // Track which cells are road for intersection detection
        const isRoad = new Array(width * height).fill(false);
        const isFootpath = new Array(width * height).fill(false);
        
        // Draw vertical roads
        for (const road of roads.verticalRoads) {
            const district = road.district;
            const tiles = district ? this._getDistrictTileLookup(district) : defaultTiles;
            const footpathWidth = district?.footpathWidth ?? this.cityFootpathWidth;
            
            const footpath = tiles['footpath'] || defaultTiles['footpath'];
            const roadVertLeft = tiles['roadVertLeft'] || defaultTiles['roadVertLeft'];
            const roadVertRight = tiles['roadVertRight'] || defaultTiles['roadVertRight'];
            const roadCenterV = tiles['roadCenterV'] || defaultTiles['roadCenterV'];
            const roadEndCap = tiles['roadEndCap'] || defaultTiles['roadEndCap'];
            const alleyTile = tiles['alley'] || defaultTiles['alley'] || footpath;
            
            // Alley handling
            if (road.isAlley) {
                for (let y = road.startY; y <= road.endY; y++) {
                    for (let w = 0; w < this.cityAlleyWidth; w++) {
                        const ax = road.pos + w;
                        if (ax >= 0 && ax < width && alleyTile) {
                            tm.setTileAt(ax, y, alleyTile.tileX, alleyTile.tileY);
                            isRoad[y * width + ax] = true;
                        }
                    }
                }
                continue;
            }
            
            const startX = road.pos;
            const footW = footpathWidth;
            
            for (let y = road.startY; y <= road.endY; y++) {
                // Check if we're at a dead end cap
                const isEndCap = road.isDeadEnd && (
                    (y === road.startY && road.startY > 0) ||
                    (y === road.endY && road.endY < height - 1)
                );
                
                // Footpath left
                for (let f = 0; f < footW; f++) {
                    const fx = startX - footW + f;
                    if (fx >= 0 && fx < width && footpath) {
                        tm.setTileAt(fx, y, footpath.tileX, footpath.tileY);
                        isFootpath[y * width + fx] = true;
                    }
                }
                
                // Left lanes
                for (let l = 0; l < road.lanes; l++) {
                    const lx = startX + l;
                    if (lx >= 0 && lx < width && roadVertLeft) {
                        if (isEndCap && roadEndCap) {
                            tm.setTileAt(lx, y, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(lx, y, roadVertLeft.tileX, roadVertLeft.tileY);
                        }
                        isRoad[y * width + lx] = true;
                    }
                }
                
                // Center line (for multi-lane roads)
                if (road.lanes > 1 && roadCenterV) {
                    const cx = startX + road.lanes;
                    if (cx >= 0 && cx < width) {
                        if (isEndCap && roadEndCap) {
                            tm.setTileAt(cx, y, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(cx, y, roadCenterV.tileX, roadCenterV.tileY);
                        }
                        isRoad[y * width + cx] = true;
                    }
                }
                
                // Right lanes
                const rightStart = startX + road.lanes + (road.lanes > 1 ? 1 : 0);
                for (let l = 0; l < road.lanes; l++) {
                    const rx = rightStart + l;
                    if (rx >= 0 && rx < width && roadVertRight) {
                        if (isEndCap && roadEndCap) {
                            tm.setTileAt(rx, y, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(rx, y, roadVertRight.tileX, roadVertRight.tileY);
                        }
                        isRoad[y * width + rx] = true;
                    }
                }
                
                // Footpath right
                for (let f = 0; f < footW; f++) {
                    const fx = rightStart + road.lanes + f;
                    if (fx >= 0 && fx < width && footpath) {
                        tm.setTileAt(fx, y, footpath.tileX, footpath.tileY);
                        isFootpath[y * width + fx] = true;
                    }
                }
            }
        }
        
        // Draw horizontal roads
        for (const road of roads.horizontalRoads) {
            const district = road.district;
            const tiles = district ? this._getDistrictTileLookup(district) : defaultTiles;
            const footpathWidth = district?.footpathWidth ?? this.cityFootpathWidth;
            
            const footpath = tiles['footpath'] || defaultTiles['footpath'];
            const roadHorizTop = tiles['roadHorizTop'] || defaultTiles['roadHorizTop'];
            const roadHorizBottom = tiles['roadHorizBottom'] || defaultTiles['roadHorizBottom'];
            const roadCenterH = tiles['roadCenterH'] || defaultTiles['roadCenterH'];
            const intersection = tiles['intersection'] || defaultTiles['intersection'];
            const roadEndCap = tiles['roadEndCap'] || defaultTiles['roadEndCap'];
            
            const startY = road.pos;
            const footW = footpathWidth;
            
            for (let x = road.startX; x <= road.endX; x++) {
                // Check if we're at a dead end cap
                const isEndCap = road.isDeadEnd && (
                    (x === road.startX && road.startX > 0) ||
                    (x === road.endX && road.endX < width - 1)
                );
                
                // Footpath top
                for (let f = 0; f < footW; f++) {
                    const fy = startY - footW + f;
                    if (fy >= 0 && fy < height && footpath) {
                        // Don't overwrite road tiles
                        if (!isRoad[fy * width + x]) {
                            tm.setTileAt(x, fy, footpath.tileX, footpath.tileY);
                            isFootpath[fy * width + x] = true;
                        }
                    }
                }
                
                // Top lanes
                for (let l = 0; l < road.lanes; l++) {
                    const ly = startY + l;
                    if (ly >= 0 && ly < height && roadHorizTop) {
                        // At intersections, use intersection tile
                        if (isRoad[ly * width + x] && intersection) {
                            tm.setTileAt(x, ly, intersection.tileX, intersection.tileY);
                        } else if (isEndCap && roadEndCap) {
                            tm.setTileAt(x, ly, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(x, ly, roadHorizTop.tileX, roadHorizTop.tileY);
                        }
                        isRoad[ly * width + x] = true;
                    }
                }
                
                // Center line
                if (road.lanes > 1 && roadCenterH) {
                    const cy = startY + road.lanes;
                    if (cy >= 0 && cy < height) {
                        if (isRoad[cy * width + x] && intersection) {
                            tm.setTileAt(x, cy, intersection.tileX, intersection.tileY);
                        } else if (isEndCap && roadEndCap) {
                            tm.setTileAt(x, cy, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(x, cy, roadCenterH.tileX, roadCenterH.tileY);
                        }
                        isRoad[cy * width + x] = true;
                    }
                }
                
                // Bottom lanes
                const bottomStart = startY + road.lanes + (road.lanes > 1 ? 1 : 0);
                for (let l = 0; l < road.lanes; l++) {
                    const ly = bottomStart + l;
                    if (ly >= 0 && ly < height && roadHorizBottom) {
                        if (isRoad[ly * width + x] && intersection) {
                            tm.setTileAt(x, ly, intersection.tileX, intersection.tileY);
                        } else if (isEndCap && roadEndCap) {
                            tm.setTileAt(x, ly, roadEndCap.tileX, roadEndCap.tileY);
                        } else {
                            tm.setTileAt(x, ly, roadHorizBottom.tileX, roadHorizBottom.tileY);
                        }
                        isRoad[ly * width + x] = true;
                    }
                }
                
                // Footpath bottom
                for (let f = 0; f < footW; f++) {
                    const fy = bottomStart + road.lanes + f;
                    if (fy >= 0 && fy < height && footpath) {
                        if (!isRoad[fy * width + x]) {
                            tm.setTileAt(x, fy, footpath.tileX, footpath.tileY);
                            isFootpath[fy * width + x] = true;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Fill city blocks (building lots and parks) with support for prefabs
     */
    _fillCityBlocksAdvanced(tm, width, height, roads, defaultTiles) {
        // Identify blocks using flood fill
        const visited = new Array(width * height).fill(false);
        const blocks = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                
                const tile = tm.getTileAt(x, y);
                if (!tile) continue;
                
                // Check if this tile is the empty lot / not road
                const isEmptyLot = defaultTiles['emptyLot'] && tile.sheetX === defaultTiles['emptyLot'].tileX && tile.sheetY === defaultTiles['emptyLot'].tileY;
                const isBuildingG = defaultTiles['buildingGround'] && tile.sheetX === defaultTiles['buildingGround'].tileX && tile.sheetY === defaultTiles['buildingGround'].tileY;
                
                if (!isEmptyLot && !isBuildingG) continue;
                
                // Flood fill to find this block
                const blockTiles = [];
                const queue = [{ x, y }];
                let minX = x, maxX = x, minY = y, maxY = y;
                visited[idx] = true;
                
                while (queue.length > 0) {
                    const pos = queue.shift();
                    blockTiles.push(pos);
                    
                    minX = Math.min(minX, pos.x);
                    maxX = Math.max(maxX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxY = Math.max(maxY, pos.y);
                    
                    const neighbors = [
                        { x: pos.x - 1, y: pos.y },
                        { x: pos.x + 1, y: pos.y },
                        { x: pos.x, y: pos.y - 1 },
                        { x: pos.x, y: pos.y + 1 }
                    ];
                    
                    for (const n of neighbors) {
                        if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
                        const nIdx = n.y * width + n.x;
                        if (visited[nIdx]) continue;
                        
                        const nTile = tm.getTileAt(n.x, n.y);
                        if (!nTile) continue;
                        
                        const nIsEmpty = defaultTiles['emptyLot'] && nTile.sheetX === defaultTiles['emptyLot'].tileX && nTile.sheetY === defaultTiles['emptyLot'].tileY;
                        const nIsBuilding = defaultTiles['buildingGround'] && nTile.sheetX === defaultTiles['buildingGround'].tileX && nTile.sheetY === defaultTiles['buildingGround'].tileY;
                        
                        if (nIsEmpty || nIsBuilding) {
                            visited[nIdx] = true;
                            queue.push(n);
                        }
                    }
                }
                
                if (blockTiles.length > 4) {
                    blocks.push({
                        tiles: blockTiles,
                        minX, maxX, minY, maxY,
                        width: maxX - minX + 1,
                        height: maxY - minY + 1,
                        centerX: Math.floor((minX + maxX) / 2),
                        centerY: Math.floor((minY + maxY) / 2)
                    });
                }
            }
        }
        
        // Process each block
        for (const block of blocks) {
            // Get district for this block
            const district = this._getDistrictAt(block.centerX, block.centerY);
            const tiles = district ? this._getDistrictTileLookup(district) : defaultTiles;
            
            const park = tiles['park'] || defaultTiles['park'];
            const buildingGround = tiles['buildingGround'] || defaultTiles['buildingGround'] || defaultTiles['emptyLot'];
            
            // Get settings
            const parksChance = district?.parksChance ?? this.cityParksChance;
            const buildingDensity = district?.buildingDensity ?? 0.7;
            
            // Decide: park or building lot
            const isPark = this._random() < parksChance;
            
            if (isPark && park) {
                // Make this block a park
                for (const bt of block.tiles) {
                    tm.setTileAt(bt.x, bt.y, park.tileX, park.tileY);
                }
                
                // Spawn park prefabs (trees, etc)
                this._spawnParkPrefabs(tm, block, district);
            } else {
                // Fill with building ground if enabled
                if (this.cityBuildingFillTile && buildingGround) {
                    for (const bt of block.tiles) {
                        tm.setTileAt(bt.x, bt.y, buildingGround.tileX, buildingGround.tileY);
                    }
                }
                
                // Spawn building prefabs
                this._spawnBuildingPrefabs(tm, block, district, buildingDensity);
            }
            
            // Store block for tracking
            this._generatedBlocks.push({
                ...block,
                isPark,
                districtName: district?.name || 'Default'
            });
        }
    }
    
    /**
     * Spawn building prefabs in a block
     */
    _spawnBuildingPrefabs(tm, block, district, density) {
        if (this.gameObject.isEditing) return; // Don't spawn prefabs in editor mode
        // Get prefab config
        let prefabs;
        if (district && district.buildingPrefabs && district.buildingPrefabs.length > 0) {
            prefabs = district.buildingPrefabs;
        } else if (this.citySpawnBuildingPrefabs && this.cityBuildingPrefabs) {
            prefabs = this.cityBuildingPrefabs;
        } else {
            return;
        }
        
        // Filter prefabs with valid prefab names
        const validPrefabs = prefabs.filter(p => p.prefab && p.prefab.trim() !== '');
        if (validPrefabs.length === 0) {
            // Note: No valid prefabs configured - this is normal if user hasn't set them up
            return;
        }
        
        // Check if instanceCreate is available (only at runtime)
        if (typeof instanceCreate !== 'function') {
            //console.log('[TilemapWorldGenerator] Building prefabs require runtime - skipping in editor mode');
            return;
        }
        
        // Build a Set of valid tile positions (tiles that are actually in the block, not on roads)
        // The block.tiles array contains only the valid building tiles from flood fill
        const validTiles = new Set();
        for (const t of block.tiles) {
            // Convert to local coordinates relative to block.minX, block.minY
            const localKey = `${t.x - block.minX},${t.y - block.minY}`;
            validTiles.add(localKey);
        }
        
        const grid = [];
        for (let y = 0; y < block.height; y++) {
            grid[y] = new Array(block.width).fill(false);
        }
        
        // Calculate how many buildings to try to place based on density
        const maxArea = block.width * block.height;
        let usedArea = 0;
        const targetAreaRatio = density;
        
        // Sort prefabs by size (larger first for better packing)
        const sortedPrefabs = [...validPrefabs].sort((a, b) => 
            (b.widthTiles * b.heightTiles) - (a.widthTiles * a.heightTiles)
        );
        
        // Place buildings
        for (const prefabConfig of sortedPrefabs) {
            const buildingW = prefabConfig.widthTiles || 2;
            const buildingH = prefabConfig.heightTiles || 2;
            let placedCount = 0;
            const maxCount = prefabConfig.maxPerBlock || 4;
            
            // Try to place this building type
            let attempts = 0;
            const maxAttempts = 50;
            
            while (placedCount < maxCount && usedArea / maxArea < targetAreaRatio && attempts < maxAttempts) {
                attempts++;
                
                if (this._random() > (prefabConfig.chance || 0.3)) continue;
                
                // Find a valid position
                const localX = this._randomInt(0, block.width - buildingW);
                const localY = this._randomInt(0, block.height - buildingH);
                
                // Check if space is available AND all footprint tiles are valid building tiles (not on roads)
                let canPlace = true;
                for (let dy = 0; dy < buildingH && canPlace; dy++) {
                    for (let dx = 0; dx < buildingW && canPlace; dx++) {
                        const checkX = localX + dx;
                        const checkY = localY + dy;
                        if (checkY >= block.height || checkX >= block.width) {
                            canPlace = false;
                        } else if (grid[checkY][checkX]) {
                            canPlace = false;
                        } else if (!validTiles.has(`${checkX},${checkY}`)) {
                            // This tile position is in the bounding box but not a valid building tile
                            // (it's on a road, footpath, or outside the block)
                            canPlace = false;
                        }
                    }
                }
                
                if (!canPlace) continue;
                
                // Mark grid as used
                for (let dy = 0; dy < buildingH; dy++) {
                    for (let dx = 0; dx < buildingW; dx++) {
                        grid[localY + dy][localX + dx] = true;
                    }
                }
                usedArea += buildingW * buildingH;
                
                // Calculate world position
                const worldTileX = block.minX + localX;
                const worldTileY = block.minY + localY;
                
                // Convert tile position to pixel position
                // Use getMapTileSize() for the actual rendered tile size
                const tileSize = tm.getMapTileSize ? tm.getMapTileSize() : (tm.mapTileSize || tm.tileSize || 32);
                
                // Get the tilemap's world position and offset
                const tmWorldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
                const offsetX = tm.offsetX || 0;
                const offsetY = tm.offsetY || 0;
                
                // Calculate pixel position: tilemap world pos + tile offset + centered on building footprint
                const pixelX = tmWorldPos.x + offsetX + (worldTileX * tileSize) + (buildingW * tileSize) / 2;
                const pixelY = tmWorldPos.y + offsetY + (worldTileY * tileSize) + (buildingH * tileSize) / 2;
                
                // Spawn the prefab
                if (typeof instanceCreate === 'function') {
                    try {
                        const obj = instanceCreate(prefabConfig.prefab, pixelX, pixelY);
                        if (obj) {
                            this._generatedObjects.push({
                                gameObject: obj,
                                type: 'building',
                                prefab: prefabConfig.prefab,
                                tileX: worldTileX,
                                tileY: worldTileY,
                                widthTiles: buildingW,
                                heightTiles: buildingH
                            });
                            placedCount++;
                        }
                    } catch (e) {
                        console.warn('[TilemapWorldGenerator] Failed to spawn building prefab:', e);
                    }
                }
            }
        }
    }
    
    /**
     * Spawn park decoration prefabs (trees, benches, etc)
     */
    _spawnParkPrefabs(tm, block, district) {
        if (this.gameObject.isEditing) return; // Don't spawn prefabs in editor mode
        // Get prefab config
        let prefabs;
        if (district && district.parkPrefabs && district.parkPrefabs.length > 0) {
            prefabs = district.parkPrefabs;
        } else if (this.cityParkPrefabs) {
            prefabs = this.cityParkPrefabs;
        } else {
            return;
        }
        
        // Filter prefabs with valid prefab names
        const validPrefabs = prefabs.filter(p => p.prefab && p.prefab.trim() !== '');
        if (validPrefabs.length === 0) return;
        
        // Check if instanceCreate is available (only at runtime)
        if (typeof instanceCreate !== 'function') {
            return; // Skip silently - building function already logs this
        }
        
        // Build a Set of valid tile positions (tiles that are actually in the block)
        const validTiles = new Set();
        for (const t of block.tiles) {
            const localKey = `${t.x - block.minX},${t.y - block.minY}`;
            validTiles.add(localKey);
        }
        
        // Create a grid to track placements
        const grid = [];
        for (let y = 0; y < block.height; y++) {
            grid[y] = new Array(block.width).fill(false);
        }
        
        // Place decorations
        for (const prefabConfig of validPrefabs) {
            const decoW = prefabConfig.widthTiles || 1;
            const decoH = prefabConfig.heightTiles || 1;
            let placedCount = 0;
            const maxCount = prefabConfig.maxPerBlock || 10;
            const minCount = prefabConfig.minPerBlock || 0;
            
            let attempts = 0;
            const maxAttempts = 100;
            
            while ((placedCount < minCount || (this._random() < (prefabConfig.chance || 0.4) && placedCount < maxCount)) && attempts < maxAttempts) {
                attempts++;
                
                // Find a valid position
                const localX = this._randomInt(0, block.width - decoW);
                const localY = this._randomInt(0, block.height - decoH);
                
                // Check if space is available AND all tiles are valid park tiles
                let canPlace = true;
                for (let dy = 0; dy < decoH && canPlace; dy++) {
                    for (let dx = 0; dx < decoW && canPlace; dx++) {
                        const checkX = localX + dx;
                        const checkY = localY + dy;
                        if (checkY >= block.height || checkX >= block.width) {
                            canPlace = false;
                        } else if (grid[checkY][checkX]) {
                            canPlace = false;
                        } else if (!validTiles.has(`${checkX},${checkY}`)) {
                            canPlace = false;
                        }
                    }
                }
                
                if (!canPlace) continue;
                
                // Mark grid as used
                for (let dy = 0; dy < decoH; dy++) {
                    for (let dx = 0; dx < decoW; dx++) {
                        grid[localY + dy][localX + dx] = true;
                    }
                }
                
                // Calculate world position
                const worldTileX = block.minX + localX;
                const worldTileY = block.minY + localY;
                
                // Convert tile position to pixel position
                // Use getMapTileSize() for the actual rendered tile size
                const tileSize = tm.getMapTileSize ? tm.getMapTileSize() : (tm.mapTileSize || tm.tileSize || 32);
                
                // Get the tilemap's world position and offset
                const tmWorldPos = this.gameObject ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
                const offsetX = tm.offsetX || 0;
                const offsetY = tm.offsetY || 0;
                
                // Calculate pixel position: tilemap world pos + tile offset + centered on decoration footprint
                const pixelX = tmWorldPos.x + offsetX + (worldTileX * tileSize) + (decoW * tileSize) / 2;
                const pixelY = tmWorldPos.y + offsetY + (worldTileY * tileSize) + (decoH * tileSize) / 2;
                
                // Spawn the prefab
                if (typeof instanceCreate === 'function') {
                    try {
                        const obj = instanceCreate(prefabConfig.prefab, pixelX, pixelY);
                        if (obj) {
                            this._generatedObjects.push({
                                gameObject: obj,
                                type: 'park_decoration',
                                prefab: prefabConfig.prefab,
                                tileX: worldTileX,
                                tileY: worldTileY,
                                widthTiles: decoW,
                                heightTiles: decoH
                            });
                            placedCount++;
                        }
                    } catch (e) {
                        console.warn('[TilemapWorldGenerator] Failed to spawn park prefab:', e);
                    }
                }
            }
        }
    }
    
    // ==================== OVERWORLD GENERATION ====================
    
    /**
     * Generate a top-down overworld with biomes
     */
    _generateOverworld(tm) {
        const width = tm.mapWidth;
        const height = tm.mapHeight;
        
        // Get tile lookup by role
        const tiles = this._getOverworldTileLookup();
        
        // Step 1: Generate base terrain from noise
        const heightMap = [];
        for (let y = 0; y < height; y++) {
            heightMap[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                heightMap[y][x] = this._perlinNoise(x, y, this.overworldNoiseScale, this.overworldNoiseOctaves);
            }
        }
        
        // Step 2: Smooth water edges
        for (let pass = 0; pass < this.overworldLakeSmoothing; pass++) {
            const smoothed = heightMap.map(row => [...row]);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const avg = (heightMap[y-1][x] + heightMap[y+1][x] + 
                                heightMap[y][x-1] + heightMap[y][x+1] + 
                                heightMap[y][x] * 2) / 6;
                    // Only smooth near water boundaries
                    if (Math.abs(heightMap[y][x] - this.overworldWaterLevel) < 0.1) {
                        smoothed[y][x] = avg;
                    }
                }
            }
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    heightMap[y][x] = smoothed[y][x];
                }
            }
        }
        
        // Step 3: Assign tiles based on height
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const h = heightMap[y][x];
                let tile = null;
                let isSolid = false;
                
                if (h < this.overworldWaterLevel * 0.6) {
                    tile = tiles['deepWater'];
                } else if (h < this.overworldWaterLevel) {
                    tile = tiles['shallowWater'];
                } else if (h < this.overworldWaterLevel + 0.05) {
                    tile = tiles['sand'];
                } else if (h < this.overworldForestLevel) {
                    tile = tiles['grass'];
                } else if (h < this.overworldForestLevel + (this.overworldMountainLevel - this.overworldForestLevel) * 0.5) {
                    tile = tiles['forest'];
                    isSolid = tile ? (tile.solid !== false) : false;
                } else if (h < this.overworldMountainLevel) {
                    tile = tiles['denseForest'];
                    isSolid = tile ? (tile.solid !== false) : false;
                } else if (h < this.overworldMountainLevel + 0.1) {
                    tile = tiles['mountain'];
                    isSolid = tile ? (tile.solid !== false) : true;
                } else {
                    tile = tiles['snow'];
                    isSolid = tile ? (tile.solid !== false) : true;
                }
                
                if (tile) {
                    tm.setTileAt(x, y, tile.tileX, tile.tileY);
                    tm.setSolidAt(x, y, isSolid);
                }
            }
        }
        
        // Step 4: Generate paths
        this._generateOverworldPaths(tm, width, height, heightMap, tiles);
    }
    
    /**
     * Get overworld tile lookup by role
     */
    _getOverworldTileLookup() {
        const lookup = {};
        for (const tile of this.overworldTiles) {
            if (tile.role) {
                lookup[tile.role] = tile;
            }
        }
        return lookup;
    }
    
    /**
     * Generate random paths across the overworld
     */
    _generateOverworldPaths(tm, width, height, heightMap, tiles) {
        const pathTile = tiles['path'];
        if (!pathTile) return;
        
        for (let p = 0; p < this.overworldPathCount; p++) {
            // Random start/end points (on land)
            let startX, startY, endX, endY;
            let attempts = 0;
            
            // Find a start point on land
            do {
                startX = this._randomInt(0, width - 1);
                startY = this._randomInt(0, height - 1);
                attempts++;
            } while (heightMap[startY][startX] < this.overworldWaterLevel && attempts < 100);
            
            // Find an end point on land (distant from start)
            attempts = 0;
            do {
                endX = this._randomInt(0, width - 1);
                endY = this._randomInt(0, height - 1);
                attempts++;
            } while ((heightMap[endY][endX] < this.overworldWaterLevel || 
                     (Math.abs(endX - startX) + Math.abs(endY - startY)) < width * 0.3) && 
                     attempts < 100);
            
            // Walk from start to end with some meandering
            let cx = startX;
            let cy = startY;
            
            while (cx !== endX || cy !== endY) {
                // Paint path at current position
                for (let dy = -Math.floor(this.overworldPathWidth / 2); dy <= Math.floor(this.overworldPathWidth / 2); dy++) {
                    for (let dx = -Math.floor(this.overworldPathWidth / 2); dx <= Math.floor(this.overworldPathWidth / 2); dx++) {
                        const px = cx + dx;
                        const py = cy + dy;
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            // Only draw on land
                            if (heightMap[py][px] >= this.overworldWaterLevel) {
                                tm.setTileAt(px, py, pathTile.tileX, pathTile.tileY);
                                tm.setSolidAt(px, py, false);
                            }
                        }
                    }
                }
                
                // Move toward end with some randomness
                const dx = endX - cx;
                const dy = endY - cy;
                
                if (this._random() < 0.3) {
                    // Random meander
                    if (this._random() < 0.5) cx += (this._random() < 0.5 ? 1 : -1);
                    else cy += (this._random() < 0.5 ? 1 : -1);
                } else {
                    // Move toward target
                    if (Math.abs(dx) > Math.abs(dy)) {
                        cx += dx > 0 ? 1 : -1;
                    } else {
                        cy += dy > 0 ? 1 : -1;
                    }
                }
                
                // Clamp
                cx = Math.max(0, Math.min(width - 1, cx));
                cy = Math.max(0, Math.min(height - 1, cy));
            }
        }
    }
    
    // ==================== CAVE GENERATION ====================
    
    /**
     * Generate a cave/dungeon using cellular automata
     */
    _generateCave(tm) {
        const width = tm.mapWidth;
        const height = tm.mapHeight;
        
        // Get tile lookup
        const tiles = this._getCaveTileLookup();
        
        // Step 1: Initialize with random walls
        const caveMap = []; // false = wall/solid, true = open/floor
        for (let y = 0; y < height; y++) {
            caveMap[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                // Edges are always walls
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    caveMap[y][x] = false;
                } else {
                    caveMap[y][x] = this._random() >= this.caveFillPercent;
                }
            }
        }
        
        // Step 2: Cellular automata smoothing
        for (let pass = 0; pass < this.caveSmoothPasses; pass++) {
            const newMap = caveMap.map(row => [...row]);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let wallCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (!caveMap[y + dy][x + dx]) wallCount++;
                        }
                    }
                    // Include self in the count (9 total cells)
                    newMap[y][x] = wallCount < this.caveMinWallNeighbors;
                }
            }
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    caveMap[y][x] = newMap[y][x];
                }
            }
        }
        
        // Step 3: Connect regions if desired
        if (this.caveConnectRegions) {
            this._connectCaveRegions(caveMap, width, height);
        }
        
        // Step 4: Paint tiles
        const floorTile = tiles['floor'];
        const wallTile = tiles['wall'];
        const wallTopTile = tiles['wallTop'];
        const decoTile = tiles['decoration'];
        const crystalTile = tiles['crystal'];
        const waterTile = tiles['water'];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (caveMap[y][x]) {
                    // Open floor
                    if (floorTile) {
                        tm.setTileAt(x, y, floorTile.tileX, floorTile.tileY);
                        tm.setSolidAt(x, y, false);
                    }
                    
                    // Random decorations on floor
                    if (decoTile && this._random() < 0.03) {
                        tm.setTileAt(x, y, decoTile.tileX, decoTile.tileY);
                        tm.setSolidAt(x, y, decoTile.solid !== false);
                    }
                    
                    // Random crystals
                    if (crystalTile && this._random() < 0.01) {
                        tm.setTileAt(x, y, crystalTile.tileX, crystalTile.tileY);
                        tm.setSolidAt(x, y, crystalTile.solid !== undefined ? crystalTile.solid : false);
                    }
                } else {
                    // Wall
                    // Check if this is a wall with floor below (wall top edge)
                    if (wallTopTile && y < height - 1 && caveMap[y + 1][x]) {
                        tm.setTileAt(x, y, wallTopTile.tileX, wallTopTile.tileY);
                    } else if (wallTile) {
                        tm.setTileAt(x, y, wallTile.tileX, wallTile.tileY);
                    }
                    tm.setSolidAt(x, y, true);
                }
            }
        }
        
        // Step 5: Generate small water pools in open areas
        if (waterTile) {
            this._generateCaveWaterPools(tm, caveMap, width, height, waterTile);
        }
        
        // Step 6: Generate ores in walls
        if (this.caveOreGeneration && this.platformerOres.length > 0) {
            this._generateCaveOres(tm, caveMap, width, height);
        }
    }
    
    /**
     * Get cave tile lookup by role
     */
    _getCaveTileLookup() {
        const lookup = {};
        for (const tile of this.caveTiles) {
            if (tile.role) {
                lookup[tile.role] = tile;
            }
        }
        return lookup;
    }
    
    /**
     * Connect disconnected cave regions using tunnels
     */
    _connectCaveRegions(caveMap, width, height) {
        // Find all connected regions using flood fill
        const regionMap = new Array(height).fill(null).map(() => new Array(width).fill(-1));
        const regions = []; // Array of arrays of {x,y}
        let regionId = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!caveMap[y][x] || regionMap[y][x] !== -1) continue;
                
                // New region found - flood fill
                const region = [];
                const queue = [{ x, y }];
                regionMap[y][x] = regionId;
                
                while (queue.length > 0) {
                    const pos = queue.shift();
                    region.push(pos);
                    
                    const neighbors = [
                        { x: pos.x - 1, y: pos.y },
                        { x: pos.x + 1, y: pos.y },
                        { x: pos.x, y: pos.y - 1 },
                        { x: pos.x, y: pos.y + 1 }
                    ];
                    
                    for (const n of neighbors) {
                        if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
                        if (!caveMap[n.y][n.x] || regionMap[n.y][n.x] !== -1) continue;
                        regionMap[n.y][n.x] = regionId;
                        queue.push(n);
                    }
                }
                
                regions.push(region);
                regionId++;
            }
        }
        
        if (regions.length <= 1) return;
        
        // Connect each region to the next with a tunnel
        for (let r = 1; r < regions.length; r++) {
            const regionA = regions[r - 1];
            const regionB = regions[r];
            
            // Find closest points between regions
            let bestDist = Infinity;
            let bestA = null, bestB = null;
            
            // Sample to avoid O(n*m) with large regions
            const sampleA = regionA.length > 50 ? regionA.filter((_, i) => i % Math.ceil(regionA.length / 50) === 0) : regionA;
            const sampleB = regionB.length > 50 ? regionB.filter((_, i) => i % Math.ceil(regionB.length / 50) === 0) : regionB;
            
            for (const a of sampleA) {
                for (const b of sampleB) {
                    const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestA = a;
                        bestB = b;
                    }
                }
            }
            
            if (bestA && bestB) {
                // Carve tunnel between best points
                this._carveTunnel(caveMap, bestA.x, bestA.y, bestB.x, bestB.y, width, height);
            }
        }
    }
    
    /**
     * Carve a tunnel between two points
     */
    _carveTunnel(caveMap, x1, y1, x2, y2, width, height) {
        let cx = x1;
        let cy = y1;
        
        while (cx !== x2 || cy !== y2) {
            // Open a 1-2 wide corridor
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
                        caveMap[ny][nx] = true;
                    }
                }
            }
            
            // Move toward target
            if (this._random() < 0.5) {
                if (cx !== x2) cx += cx < x2 ? 1 : -1;
            } else {
                if (cy !== y2) cy += cy < y2 ? 1 : -1;
            }
        }
    }
    
    /**
     * Generate small water pools in cave floors
     */
    _generateCaveWaterPools(tm, caveMap, width, height, waterTile) {
        const poolCount = Math.floor(width * height * 0.0005);
        
        for (let p = 0; p < poolCount; p++) {
            const cx = this._randomInt(2, width - 3);
            const cy = this._randomInt(2, height - 3);
            
            if (!caveMap[cy][cx]) continue; // Must be floor
            
            // Random-sized pool
            const size = this._randomInt(2, 5);
            for (let dy = -size; dy <= size; dy++) {
                for (let dx = -size; dx <= size; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (!caveMap[ny][nx]) continue; // Only on floors
                    
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= size * 0.7 + this._random() * size * 0.3) {
                        tm.setTileAt(nx, ny, waterTile.tileX, waterTile.tileY);
                        tm.setSolidAt(nx, ny, false);
                    }
                }
            }
        }
    }
    
    /**
     * Generate ores in cave walls (reuses platformerOres config)
     */
    _generateCaveOres(tm, caveMap, width, height) {
        for (const ore of this.platformerOres) {
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (caveMap[y][x]) continue; // Skip floor tiles (only place in walls)
                    
                    // Check if near a floor (exposed wall)
                    let nearFloor = false;
                    for (let dy = -1; dy <= 1 && !nearFloor; dy++) {
                        for (let dx = -1; dx <= 1 && !nearFloor; dx++) {
                            if (y + dy >= 0 && y + dy < height && x + dx >= 0 && x + dx < width) {
                                if (caveMap[y + dy][x + dx]) nearFloor = true;
                            }
                        }
                    }
                    
                    if (!nearFloor) continue; // Only place ores in walls near floors (visible)
                    
                    if (this._random() > (ore.rarity || 0.05) * 2) continue; // Double rarity for cave ores
                    
                    // Place ore vein
                    const veinSize = this._randomInt(ore.veinSizeMin || 1, ore.veinSizeMax || 3);
                    let cx = x, cy = y;
                    for (let i = 0; i < veinSize; i++) {
                        if (cx >= 0 && cx < width && cy >= 0 && cy < height && !caveMap[cy][cx]) {
                            tm.setTileAt(cx, cy, ore.tileX, ore.tileY);
                            tm.setSolidAt(cx, cy, ore.solid !== false);
                        }
                        const dir = this._randomInt(0, 3);
                        if (dir === 0) cx++;
                        else if (dir === 1) cx--;
                        else if (dir === 2) cy++;
                        else cy--;
                    }
                }
            }
        }
    }
    
    // ==================== NODE SYSTEM ====================
    
    /**
     * Build the node map from the generated tilemap
     * Creates nodes at the center of each tile that has a node type mapping
     */
    _buildNodeMap() {
        const tm = this._getTilemapRenderer();
        if (!tm) {
            console.warn('[TilemapWorldGenerator] _buildNodeMap: No TilemapRenderer found');
            return;
        }
        
        const width = tm.mapWidth;
        const height = tm.mapHeight;
        const tileW = tm.getMapTileSize ? tm.getMapTileSize() : (tm.tileSize || 16);
        const tileH = tileW; // Tiles are square
        
        //console.log(`[TilemapWorldGenerator] Building node map: ${width}x${height} tiles, ${tileW}x${tileH}px each`);
        
        // Create role -> nodeId lookup
        const roleToNode = {};
        for (const mapping of this.nodeTypeMappings) {
            roleToNode[mapping.role] = mapping.nodeId;
        }
        //console.log('[TilemapWorldGenerator] Role->Node mappings:', JSON.stringify(roleToNode));
        
        // Get tile lookup for role identification
        const tileLookup = this._getCityTileLookup();
        const tileKeyToRole = {};
        for (const role in tileLookup) {
            const tile = tileLookup[role];
            tileKeyToRole[`${tile.tileX},${tile.tileY}`] = role;
        }
       // console.log('[TilemapWorldGenerator] TileKey->Role mappings:', JSON.stringify(tileKeyToRole));
        
        // Also include district tiles
        if (this.cityUseDistricts && this.cityDistricts) {
            for (const district of this.cityDistricts) {
                if (district.tiles) {
                    for (const tile of district.tiles) {
                        if (tile.role) {
                            tileKeyToRole[`${tile.tileX},${tile.tileY}`] = tile.role;
                        }
                    }
                }
            }
        }
        
        // Initialize storage
        this._nodeMap = [];
        this._nodesByType = {};
        this._allNodes = [];
        
        // Debug: sample some tiles to see what's actually in the map
        const sampleTiles = [];
        for (let y = 0; y < Math.min(5, height); y++) {
            for (let x = 0; x < Math.min(10, width); x++) {
                const td = tm.getTileAt(x, y);
                if (td) {
                    // getTileAt returns { sheetX, sheetY } (position in tileset)
                    sampleTiles.push({ mapX: x, mapY: y, sheetX: td.sheetX, sheetY: td.sheetY });
                }
            }
        }
        //console.log('[TilemapWorldGenerator] Sample tiles from map:', JSON.stringify(sampleTiles.slice(0, 10)));
        
        // Build node map
        let unmatchedTiles = 0;
        let matchedTiles = 0;
        for (let y = 0; y < height; y++) {
            this._nodeMap[y] = [];
            for (let x = 0; x < width; x++) {
                const tileData = tm.getTileAt(x, y);
                if (!tileData) {
                    this._nodeMap[y][x] = null;
                    continue;
                }
                
                // getTileAt returns { sheetX, sheetY } (position in tileset)
                const tileKey = `${tileData.sheetX},${tileData.sheetY}`;
                const role = tileKeyToRole[tileKey];
                const nodeId = role ? roleToNode[role] : null;
                
                if (!nodeId) {
                    this._nodeMap[y][x] = null;
                    unmatchedTiles++;
                    continue;
                }
                
                matchedTiles++;
                
                // Create node at tile center
                const worldX = this.gameObject.position.x + x * tileW + tileW / 2;
                const worldY = this.gameObject.position.y + y * tileH + tileH / 2;
                
                const node = {
                    nodeId: nodeId,
                    role: role,
                    tileX: x,
                    tileY: y,
                    worldX: worldX,
                    worldY: worldY,
                    connections: [] // Will be populated after all nodes exist
                };
                
                this._nodeMap[y][x] = node;
                this._allNodes.push(node);
                
                if (!this._nodesByType[nodeId]) {
                    this._nodesByType[nodeId] = [];
                }
                this._nodesByType[nodeId].push(node);
            }
        }
        
        // Build connections (4-directional neighbors)
        for (const node of this._allNodes) {
            const x = node.tileX;
            const y = node.tileY;
            
            // Check all 4 neighbors
            const neighbors = [
                { dx: 0, dy: -1, dir: 'north' },
                { dx: 0, dy: 1, dir: 'south' },
                { dx: -1, dy: 0, dir: 'west' },
                { dx: 1, dy: 0, dir: 'east' }
            ];
            
            for (const n of neighbors) {
                const nx = x + n.dx;
                const ny = y + n.dy;
                
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                    const neighbor = this._nodeMap[ny][nx];
                    if (neighbor && neighbor.nodeId === node.nodeId) {
                        node.connections.push({
                            node: neighbor,
                            direction: n.dir
                        });
                    }
                }
            }
        }
        
        // Log summary by node type
        const summary = {};
        for (const nodeId in this._nodesByType) {
            summary[nodeId] = this._nodesByType[nodeId].length;
        }
        //console.log(`[TilemapWorldGenerator] Node map complete. ${matchedTiles} tiles matched to nodes, ${unmatchedTiles} tiles with no matching node type.`);
        //console.log('[TilemapWorldGenerator] Nodes by type:', JSON.stringify(summary));
    }
    
    /**
     * Get node at a world position
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @returns {object|null} Node data or null
     */
    getNodeAtWorldPosition(worldX, worldY) {
        const tm = this._getTilemapRenderer();
        if (!tm || !this._nodeMap) return null;
        
        const tileW = tm.tileWidth;
        const tileH = tm.tileHeight;
        
        const tileX = Math.floor((worldX - this.gameObject.position.x) / tileW);
        const tileY = Math.floor((worldY - this.gameObject.position.y) / tileH);
        
        if (tileY >= 0 && tileY < this._nodeMap.length && 
            tileX >= 0 && tileX < (this._nodeMap[0]?.length || 0)) {
            return this._nodeMap[tileY][tileX];
        }
        return null;
    }
    
    /**
     * Get all nodes of a specific type
     * @param {string} nodeId - Node type ID (e.g., 'pedestrian', 'vehicle')
     * @returns {array} Array of nodes
     */
    getNodesOfType(nodeId) {
        return this._nodesByType[nodeId] || [];
    }
    
    /**
     * Get the nearest node to a position
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {string} [nodeId] - Optional node type filter
     * @returns {object|null} Nearest node or null
     */
    getNearestNode(worldX, worldY, nodeId = null) {
        const nodes = nodeId ? this.getNodesOfType(nodeId) : this._allNodes;
        if (!nodes || nodes.length === 0) return null;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const node of nodes) {
            const dx = node.worldX - worldX;
            const dy = node.worldY - worldY;
            const dist = dx * dx + dy * dy;
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = node;
            }
        }
        
        return nearest;
    }
    
    /**
     * Get the next node in a path, avoiding previous nodes
     * @param {object} currentNode - Current node
     * @param {array} prevNodes - Array of previous nodes (up to 2) to avoid backtracking
     * @param {string} [preferDirection] - Optional preferred direction ('north', 'south', 'east', 'west')
     * @returns {object|null} Next node or null if dead end
     */
    getNextNode(currentNode, prevNodes = [], preferDirection = null) {
        if (!currentNode || !currentNode.connections || currentNode.connections.length === 0) {
            return null;
        }
        
        // Filter out connections that lead to previous nodes
        const validConnections = currentNode.connections.filter(conn => {
            for (const prev of prevNodes) {
                if (prev && conn.node.tileX === prev.tileX && conn.node.tileY === prev.tileY) {
                    return false;
                }
            }
            return true;
        });
        
        if (validConnections.length === 0) {
            // Dead end - allow backtracking
            if (currentNode.connections.length > 0) {
                return currentNode.connections[Math.floor(Math.random() * currentNode.connections.length)].node;
            }
            return null;
        }
        
        // If preferred direction specified, try that first
        if (preferDirection) {
            const preferred = validConnections.find(c => c.direction === preferDirection);
            if (preferred) return preferred.node;
        }
        
        // Random valid connection
        return validConnections[Math.floor(Math.random() * validConnections.length)].node;
    }
    
    /**
     * Get nodes within a radius of a position
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {number} radius - Search radius in pixels
     * @param {string} [nodeId] - Optional node type filter
     * @returns {array} Array of nodes within radius
     */
    getNodesInRadius(worldX, worldY, radius, nodeId = null) {
        const nodes = nodeId ? this.getNodesOfType(nodeId) : this._allNodes;
        if (!nodes) return [];
        
        const radiusSq = radius * radius;
        const result = [];
        
        for (const node of nodes) {
            const dx = node.worldX - worldX;
            const dy = node.worldY - worldY;
            if (dx * dx + dy * dy <= radiusSq) {
                result.push(node);
            }
        }
        
        return result;
    }
    
    // ==================== NPC POOL SYSTEM ====================
    
    /**
     * Initialize NPC pools - sets up pool structures for lazy instance creation.
     * Instances are created on-demand at spawn time and reused when despawned.
     */
    _initNPCPools() {
        this._npcPools = {};
        this._activeNPCs = [];
        this._npcOccupiedNodes = new Set();
        this._poolNames = [];
        this._hasNPCPools = false;
        
        for (const config of this.npcSpawnConfigs) {
            if (!config.prefabs || config.prefabs.length === 0) {
                //console.warn(`TilemapWorldGenerator: NPC config "${config.name}" has no prefabs defined.`);
                continue;
            }
            
            // Filter to valid prefabs (non-empty names)
            const validPrefabs = config.prefabs.filter(p => p.prefab && p.prefab.length > 0);
            if (validPrefabs.length === 0) {
                //console.warn(`TilemapWorldGenerator: NPC config "${config.name}" has no valid prefab names. Assign a prefab in the NPC Spawning settings.`);
                continue;
            }
            
            const nodeCount = this.getNodesOfType(config.nodeId).length;
            if (nodeCount === 0) {
                //console.warn(`TilemapWorldGenerator: NPC config "${config.name}" uses nodeId "${config.nodeId}" but no nodes of that type exist. Check Node Type Mappings.`);
            }
            
            let totalWeight = 0;
            for (const p of validPrefabs) {
                totalWeight += (p.weight || 1);
            }
            
            const pool = {
                config: config,
                validPrefabs: validPrefabs,
                active: [],      // Currently spawned NPC entries
                inactive: [],    // Despawned NPC entries ready for reuse
                totalWeight: totalWeight,
                created: 0       // Total instances ever created (caps at maxInstances)
            };
            
            //console.log(`[TilemapWorldGenerator] Pool "${config.name}": ${validPrefabs.length} prefabs, ${nodeCount} nodes of type "${config.nodeId}", max ${config.maxInstances}`);
            
            this._npcPools[config.name] = pool;
        }
        
        // Cache pool names to avoid Object.keys() every frame
        this._poolNames = Object.keys(this._npcPools);
        this._hasNPCPools = this._poolNames.length > 0;
    }
    
    /**
     * Select a prefab based on weight (only considers valid prefabs)
     */
    _selectWeightedPrefab(prefabs, totalWeight) {
        let r = Math.random() * totalWeight;
        for (const p of prefabs) {
            r -= (p.weight || 1);
            if (r <= 0) return p;
        }
        return prefabs[prefabs.length - 1];
    }
    
    /**
     * Create a single NPC instance from the pool's prefab list.
     * Called lazily when no inactive instances are available.
     * @param {object} pool - Pool object
     * @param {number} spawnX - World X to create at
     * @param {number} spawnY - World Y to create at
     */
    _createNPCInstance(pool, spawnX, spawnY) {
        if (typeof instanceCreate !== 'function') {
            //console.warn('TilemapWorldGenerator: instanceCreate not available');
            return null;
        }
        
        const prefabEntry = this._selectWeightedPrefab(pool.validPrefabs, pool.totalWeight);
        if (!prefabEntry || !prefabEntry.prefab) return null;
        
        try {
            // Create directly at the spawn position so the spatial chunk system
            // marks it active, and the brain's lazy init can find nodes nearby.
            const instance = instanceCreate(prefabEntry.prefab, spawnX, spawnY);
            if (!instance) {
                //console.warn(`TilemapWorldGenerator: instanceCreate returned null for "${prefabEntry.prefab}". Check prefab name.`);
                return null;
            }
            
            pool.created++;
            
            return {
                gameObject: instance,
                prefabName: prefabEntry.prefab,
                active: false,
                currentNode: null,
                prevNodes: [],
                occupantInstance: null  // Cached occupant for vehicles (created once, reused)
            };
        } catch (e) {
            //console.warn(`TilemapWorldGenerator: Failed to create NPC prefab "${prefabEntry.prefab}"`, e);
            return null;
        }
    }
    
    /**
     * Update NPC spawning - spawn outside viewport on unoccupied nodes,
     * despawn when far past margin, reuse pooled instances.
     */
    _updateNPCSpawning(deltaTime) {
        const cam = this._getCameraPosition();
        if (!cam) return;
        
        const canvasW = typeof canvas !== 'undefined' ? canvas.width : 800;
        const canvasH = typeof canvas !== 'undefined' ? canvas.height : 600;
        const margin = this.npcViewportMargin;
        
        // Inner viewport (never spawn inside this)
        const viewBounds = this._viewBounds;
        viewBounds.left = cam.x - canvasW / 2;
        viewBounds.right = cam.x + canvasW / 2;
        viewBounds.top = cam.y - canvasH / 2;
        viewBounds.bottom = cam.y + canvasH / 2;
        
        // Spawn zone: ring just outside viewport up to margin distance
        const spawnBounds = this._spawnBounds;
        spawnBounds.left = cam.x - canvasW / 2 - margin;
        spawnBounds.right = cam.x + canvasW / 2 + margin;
        spawnBounds.top = cam.y - canvasH / 2 - margin;
        spawnBounds.bottom = cam.y + canvasH / 2 + margin;
        
        // Despawn boundary: further out at 2x margin
        const despawnDist = margin * 2;
        const despawnBounds = this._despawnBounds;
        despawnBounds.left = cam.x - canvasW / 2 - despawnDist;
        despawnBounds.right = cam.x + canvasW / 2 + despawnDist;
        despawnBounds.top = cam.y - canvasH / 2 - despawnDist;
        despawnBounds.bottom = cam.y + canvasH / 2 + despawnDist;
        
        // Process each pool
        for (let pi = 0; pi < this._poolNames.length; pi++) {
            const poolName = this._poolNames[pi];
            const pool = this._npcPools[poolName];
            
            // Despawn NPCs that moved past the despawn boundary
            for (let i = pool.active.length - 1; i >= 0; i--) {
                const npc = pool.active[i];
                const x = npc.gameObject.position.x;
                const y = npc.gameObject.position.y;
                
                if (x < despawnBounds.left || x > despawnBounds.right ||
                    y < despawnBounds.top || y > despawnBounds.bottom) {
                    this._despawnNPC(npc, pool);
                }
            }
            
            // Spawn new NPCs if under max limit
            const maxActive = pool.config.maxInstances || 10;
            let attempts = 0;
            const maxAttempts = 5; // Limit attempts per frame to avoid stalls
            
            while (pool.active.length < maxActive && attempts < maxAttempts) {
                const spawned = this._trySpawnNPC(pool, spawnBounds, viewBounds);
                if (!spawned) break;
                attempts++;
            }
        }
    }
    
    /**
     * Get camera position (works with 2D camera system)
     */
    _getCameraPosition() {
        if (typeof cameraGetPosition === 'function') {
            return cameraGetPosition();
        }
        // Fallback to canvas center
        const canvasW = typeof canvas !== 'undefined' ? canvas.width : 800;
        const canvasH = typeof canvas !== 'undefined' ? canvas.height : 600;
        return { x: canvasW / 2, y: canvasH / 2 };
    }
    
    /**
     * Try to spawn an NPC at a valid node position.
     * Enforces one NPC per tile node. Creates instances lazily or reuses pooled ones.
     */
    _trySpawnNPC(pool, spawnBounds, viewBounds) {
        // Find valid spawn nodes
        const nodes = this.getNodesOfType(pool.config.nodeId);
        if (!nodes || nodes.length === 0) {
            if (!pool._noNodesWarned) {
                //console.warn(`[NPC Spawn] Pool "${pool.config.name}": No nodes of type "${pool.config.nodeId}"`);
                pool._noNodesWarned = true;
            }
            return false;
        }
        
        // Filter nodes: inside spawn band, outside viewport, not already occupied
        // Reuse the cached array to avoid per-call allocation
        const validNodes = this._validSpawnNodes;
        validNodes.length = 0;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            // Must be inside spawn bounds
            if (node.worldX < spawnBounds.left || node.worldX > spawnBounds.right ||
                node.worldY < spawnBounds.top || node.worldY > spawnBounds.bottom) {
                continue;
            }
            // Must be outside visible viewport
            if (node.worldX >= viewBounds.left && node.worldX <= viewBounds.right &&
                node.worldY >= viewBounds.top && node.worldY <= viewBounds.bottom) {
                continue;
            }
            // Must not already have an NPC on it
            if (this._npcOccupiedNodes.has(node)) {
                continue;
            }
            validNodes.push(node);
        }
        
        if (validNodes.length === 0) {
            return false;
        }
        
        // Pick a random valid node
        const node = validNodes[Math.floor(Math.random() * validNodes.length)];
        
        // Calculate spawn position
        const radiusMin = pool.config.spawnRadiusMin || 0;
        const radiusMax = pool.config.spawnRadiusMax || 0;
        const angle = Math.random() * Math.PI * 2;
        const dist = radiusMin + Math.random() * (radiusMax - radiusMin);
        const spawnX = node.worldX + Math.cos(angle) * dist;
        const spawnY = node.worldY + Math.sin(angle) * dist;
        
        // Get or create an NPC instance
        let npc;
        if (pool.inactive.length > 0) {
            // Reuse a despawned instance from the pool
            npc = pool.inactive.pop();
        } else if (pool.created < (pool.config.maxInstances || 10)) {
            // Lazily create a new instance at the spawn position so the engine's
            // spatial chunking marks it active immediately
            npc = this._createNPCInstance(pool, spawnX, spawnY);
            if (!npc) return false;
        } else {
            return false; // At capacity, no inactive instances available
        }
        
        // Activate the NPC
        npc.gameObject._isPooled = false;  // Clear pooled flag so engine includes it in spatial queries
        npc.gameObject.position.x = spawnX;
        npc.gameObject.position.y = spawnY;
        npc.gameObject.visible = true;
        npc.gameObject.enabled = true;
        npc.active = true;
        npc.currentNode = node;
        // Clear in-place to avoid allocation for pooled objects
        if (npc.prevNodes) {
            npc.prevNodes.length = 0;
        } else {
            npc.prevNodes = [];
        }
        
        // Set initial rotation based on road direction from tile role
        // Default 0° = facing right, so we rotate based on lane direction
        if (node.role) {
            const roleToAngle = {
                'roadVertLeft': -90,      // North lane - face up
                'roadVertRight': 90,      // South lane - face down
                'roadHorizTop': 0,        // East lane - face right (default)
                'roadHorizBottom': 180    // West lane - face left
            };
            if (roleToAngle[node.role] !== undefined) {
                npc.gameObject.angle = roleToAngle[node.role];
            }
        }
        
        // Reset the MovementController2DBrain if present so it re-acquires nodes at new position
        // Use fullReset() to also repair vehicle damage for vehicle prefabs
        const brain = npc.gameObject.getModule ? npc.gameObject.getModule('MovementController2DBrain') : null;
        if (brain) {
            if (typeof brain.fullReset === 'function') {
                brain.fullReset();
            } else if (typeof brain.resetNodeState === 'function') {
                brain.resetNodeState();
            }
        }
        
        // Reset MovementController2D death state if present (revive dead NPCs on respawn)
        const mc2d = npc.gameObject.getModule ? npc.gameObject.getModule('MovementController2D') : null;
        if (mc2d && typeof mc2d.revive === 'function') {
            mc2d.revive();
        }
        
        // Reset VehicleControllerRenderer if present to restore vehicle to pristine condition
        const vehicleRenderer = npc.gameObject.getModule ? npc.gameObject.getModule('VehicleControllerRenderer') : null;
        if (vehicleRenderer && typeof vehicleRenderer.repair === 'function') {
            vehicleRenderer.repair();
        }
        
        // Reset VehicleController occupant and spawn occupant prefab if configured
        const vehicleController = npc.gameObject.getModule ? npc.gameObject.getModule('VehicleController') : null;
        if (vehicleController) {
            // Clear any active occupant reference (but don't destroy - we'll reuse)
            if (vehicleController._occupant) {
                const existingOccupant = vehicleController._occupant;
                // Exit vehicle first to reset state
                if (existingOccupant.exitVehicle && typeof existingOccupant.exitVehicle === 'function') {
                    existingOccupant.exitVehicle();
                } else if (existingOccupant._exitVehicle && typeof existingOccupant._exitVehicle === 'function') {
                    existingOccupant._exitVehicle();
                }
                // Don't destroy - we keep the cached occupant for reuse
                vehicleController._occupant = null;
            }
            vehicleController.playerControlled = false;
            
            // Reuse cached occupant or create one if needed (only created once per NPC)
            if (vehicleController.occupantPrefab) {
                let occupantGO = null;
                
                // Check if we have a cached occupant from a previous spawn
                if (npc.occupantInstance) {
                    occupantGO = npc.occupantInstance;
                    // Reposition and reactivate the cached occupant
                    occupantGO._isPooled = false;  // Clear pooled flag so engine includes it
                    occupantGO.position.x = npc.gameObject.position.x;
                    occupantGO.position.y = npc.gameObject.position.y;
                    occupantGO.enabled = true;
                } else if (typeof instanceCreate === 'function') {
                    // First time - create and cache the occupant
                    occupantGO = instanceCreate(vehicleController.occupantPrefab, npc.gameObject.position.x, npc.gameObject.position.y);
                    if (occupantGO) {
                        npc.occupantInstance = occupantGO;  // Cache for reuse
                    }
                }
                
                if (occupantGO) {
                    // Look for a brain on the occupant to put it in the vehicle
                    const occupantBrain = occupantGO.getModule ? occupantGO.getModule('MovementController2DBrain') : null;
                    if (occupantBrain && occupantBrain.enterVehicle) {
                        occupantBrain.enterVehicle(vehicleController);
                    } else {
                        // Fallback: manually set as occupant and hide
                        vehicleController._occupant = occupantBrain || occupantGO;
                        vehicleController.playerControlled = false;
                        occupantGO.visible = false;
                        if (occupantGO.scale) {
                            occupantGO.scale.x = 0;
                            occupantGO.scale.y = 0;
                        }
                    }
                }
            }
        }
        
        pool.active.push(npc);
        this._activeNPCs.push(npc);
        this._npcOccupiedNodes.add(node);
        
        return true;
    }
    
    /**
     * Despawn an NPC - hide and disable it, free its node, and return it to the inactive pool for reuse.
     */
    _despawnNPC(npc, pool) {
        // Clear VehicleController occupant reference (but don't destroy - occupant is cached on npc.occupantInstance)
        const vehicleController = npc.gameObject.getModule ? npc.gameObject.getModule('VehicleController') : null;
        if (vehicleController && vehicleController._occupant) {
            const occupant = vehicleController._occupant;
            // Exit vehicle to reset state
            if (occupant.exitVehicle && typeof occupant.exitVehicle === 'function') {
                occupant.exitVehicle();
            } else if (occupant._exitVehicle && typeof occupant._exitVehicle === 'function') {
                occupant._exitVehicle();
            }
            vehicleController._occupant = null;
            vehicleController.playerControlled = false;
        }
        
        // Hide and disable the cached occupant (if any) - don't destroy, we'll reuse it
        if (npc.occupantInstance) {
            npc.occupantInstance.visible = false;
            npc.occupantInstance.enabled = false;
            npc.occupantInstance._isPooled = true;  // Mark as pooled so engine skips it in spatial queries
            npc.occupantInstance.position.x = -9999;
            npc.occupantInstance.position.y = -9999;
        }
        
        npc.gameObject.visible = false;
        npc.gameObject.enabled = false;
        npc.gameObject._isPooled = true;  // Mark as pooled so engine skips it in spatial queries/chunk updates
        npc.gameObject.position.x = -9999;
        npc.gameObject.position.y = -9999;
        npc.active = false;
        
        // Free the occupied node
        if (npc.currentNode) {
            this._npcOccupiedNodes.delete(npc.currentNode);
        }
        npc.currentNode = null;
        // Clear in-place to avoid allocation for pooled objects
        if (npc.prevNodes) {
            npc.prevNodes.length = 0;
        }
        
        // Move from active to inactive pool for reuse
        const activeIdx = pool.active.indexOf(npc);
        if (activeIdx !== -1) pool.active.splice(activeIdx, 1);
        
        const globalIdx = this._activeNPCs.indexOf(npc);
        if (globalIdx !== -1) this._activeNPCs.splice(globalIdx, 1);
        
        pool.inactive.push(npc);
    }
    
    /**
     * Get active NPC info for a specific GameObject
     * @param {GameObject} gameObject - The NPC's GameObject
     * @returns {object|null} NPC tracking data or null
     */
    getNPCInfo(gameObject) {
        if (!gameObject) return null;
        return this._activeNPCs.find(npc => npc.gameObject === gameObject || npc.gameObject._id === gameObject._id);
    }
    
    /**
     * Update NPC's current node (called by AI brain modules).
     * Frees the old node and marks the new one as occupied.
     * @param {GameObject} gameObject - The NPC's GameObject
     * @param {object} newNode - The new current node
     */
    setNPCCurrentNode(gameObject, newNode) {
        const npc = this.getNPCInfo(gameObject);
        if (!npc) return;
        
        // Free previous node
        if (npc.currentNode) {
            this._npcOccupiedNodes.delete(npc.currentNode);
            npc.prevNodes.unshift(npc.currentNode);
            if (npc.prevNodes.length > 2) {
                npc.prevNodes.pop();
            }
        }
        
        // Occupy new node
        npc.currentNode = newNode;
        if (newNode) {
            this._npcOccupiedNodes.add(newNode);
        }
    }
    
    // ==================== SERIALIZATION ====================
    
    onDestroy() {
        // Destroy all generated building/park prefabs
        if (typeof this.clearGeneratedObjects === 'function') {
            try { this.clearGeneratedObjects(); } catch (e) {}
        }
        
        // Destroy all pooled NPC instances (both active and inactive) including cached occupants
        for (const poolName in this._npcPools) {
            const pool = this._npcPools[poolName];
            if (pool.active) {
                for (const npc of pool.active) {
                    // Destroy cached occupant first
                    if (npc.occupantInstance && typeof instanceDestroy === 'function') {
                        try { instanceDestroy(npc.occupantInstance); } catch (e) {}
                        npc.occupantInstance = null;
                    }
                    if (npc.gameObject && typeof instanceDestroy === 'function') {
                        try { instanceDestroy(npc.gameObject); } catch (e) {}
                    }
                }
                pool.active.length = 0;
            }
            if (pool.inactive) {
                for (const npc of pool.inactive) {
                    // Destroy cached occupant first
                    if (npc.occupantInstance && typeof instanceDestroy === 'function') {
                        try { instanceDestroy(npc.occupantInstance); } catch (e) {}
                        npc.occupantInstance = null;
                    }
                    if (npc.gameObject && typeof instanceDestroy === 'function') {
                        try { instanceDestroy(npc.gameObject); } catch (e) {}
                    }
                }
                pool.inactive.length = 0;
            }
        }
        
        // Release node graph (large interconnected structure)
        // Break circular references between nodes so GC can collect them
        if (this._allNodes) {
            for (let i = 0; i < this._allNodes.length; i++) {
                const node = this._allNodes[i];
                if (node && node.connections) node.connections.length = 0;
            }
            this._allNodes.length = 0;
        }
        this._nodesByType = {};
        this._nodeMap = null;
        
        // Release all tracking structures
        this._npcPools = {};
        this._hasNPCPools = false;
        this._poolNames = [];
        if (this._activeNPCs) this._activeNPCs.length = 0;
        if (this._npcOccupiedNodes) this._npcOccupiedNodes.clear();
        if (this._generatedObjects) this._generatedObjects.length = 0;
        if (this._generatedObjectsData) this._generatedObjectsData.length = 0;
        if (this._generatedBlocks) this._generatedBlocks.length = 0;
        if (this._validSpawnNodes) this._validSpawnNodes.length = 0;
        this._districtMap = null;
        this._tilemapRenderer = null;
    }
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TilemapWorldGenerator';
        
        // Mode & seed
        json.generationMode = this.generationMode;
        json.seed = this.seed;
        json.useRandomSeed = this.useRandomSeed;
        
        // Platformer
        json.platformerSurfaceY = this.platformerSurfaceY;
        json.platformerHillFrequency = this.platformerHillFrequency;
        json.platformerHillAmplitude = this.platformerHillAmplitude;
        json.platformerCaveChance = this.platformerCaveChance;
        json.platformerCaveSmoothPasses = this.platformerCaveSmoothPasses;
        json.platformerCaveMinDepth = this.platformerCaveMinDepth;
        json.platformerGenerateOres = this.platformerGenerateOres;
        json.platformerGenerateCaves = this.platformerGenerateCaves;
        json.platformerSurfaceSmoothing = this.platformerSurfaceSmoothing;
        json.platformerLayers = this.platformerLayers.map(l => ({ ...l }));
        json.platformerOres = this.platformerOres.map(o => ({ ...o }));
        json.platformerDecorations = this.platformerDecorations.map(d => ({ ...d }));
        json.platformerSkyTileX = this.platformerSkyTileX;
        json.platformerSkyTileY = this.platformerSkyTileY;
        
        // City
        json.cityBlockSizeMin = this.cityBlockSizeMin;
        json.cityBlockSizeMax = this.cityBlockSizeMax;
        json.cityRoadFrequency = this.cityRoadFrequency;
        json.cityMaxLanes = this.cityMaxLanes;
        json.cityFootpathWidth = this.cityFootpathWidth;
        json.cityBuildingFillTile = this.cityBuildingFillTile;
        json.cityParksChance = this.cityParksChance;
        json.cityIntersectionStyle = this.cityIntersectionStyle;
        json.cityTiles = this.cityTiles.map(t => ({ ...t }));
        
        // City - Advanced road settings
        json.cityDeadEndChance = this.cityDeadEndChance;
        json.cityDeadEndMinLength = this.cityDeadEndMinLength;
        json.cityDeadEndCapStyle = this.cityDeadEndCapStyle;
        json.cityAlleyChance = this.cityAlleyChance;
        json.cityAlleyWidth = this.cityAlleyWidth;
        
        // City - Districts
        json.cityUseDistricts = this.cityUseDistricts;
        json.cityDistricts = this.cityDistricts.map(d => ({
            ...d,
            tiles: d.tiles ? d.tiles.map(t => ({ ...t })) : [],
            buildingPrefabs: d.buildingPrefabs ? d.buildingPrefabs.map(b => ({ ...b })) : [],
            parkPrefabs: d.parkPrefabs ? d.parkPrefabs.map(p => ({ ...p })) : []
        }));
        
        // City - Building/Park prefabs (non-district mode)
        json.citySpawnBuildingPrefabs = this.citySpawnBuildingPrefabs;
        json.cityBuildingPrefabs = this.cityBuildingPrefabs.map(b => ({ ...b }));
        json.cityParkPrefabs = this.cityParkPrefabs.map(p => ({ ...p }));
        
        // Overworld
        json.overworldWaterLevel = this.overworldWaterLevel;
        json.overworldForestLevel = this.overworldForestLevel;
        json.overworldMountainLevel = this.overworldMountainLevel;
        json.overworldNoiseScale = this.overworldNoiseScale;
        json.overworldNoiseOctaves = this.overworldNoiseOctaves;
        json.overworldPathCount = this.overworldPathCount;
        json.overworldPathWidth = this.overworldPathWidth;
        json.overworldLakeSmoothing = this.overworldLakeSmoothing;
        json.overworldTiles = this.overworldTiles.map(t => ({ ...t }));
        
        // Cave
        json.caveFillPercent = this.caveFillPercent;
        json.caveSmoothPasses = this.caveSmoothPasses;
        json.caveMinWallNeighbors = this.caveMinWallNeighbors;
        json.caveConnectRegions = this.caveConnectRegions;
        json.caveOreGeneration = this.caveOreGeneration;
        json.caveTiles = this.caveTiles.map(t => ({ ...t }));
        
        // Node System
        json.enableNodeSystem = this.enableNodeSystem;
        json.drivingSide = this.drivingSide;
        json.nodeTypeMappings = this.nodeTypeMappings.map(m => ({ ...m }));
        
        // NPC Spawning
        json.enableNPCSpawning = this.enableNPCSpawning;
        json.npcViewportMargin = this.npcViewportMargin;
        json.npcSpawnConfigs = this.npcSpawnConfigs.map(c => ({
            ...c,
            prefabs: c.prefabs ? c.prefabs.map(p => ({ ...p })) : []
        }));
        
        // Generated objects metadata (for clearing after reload)
        // We save metadata, not object references, since those can't be serialized
        if (this._generatedObjects && this._generatedObjects.length > 0) {
            json._generatedObjectsData = this._generatedObjects.map(obj => ({
                prefab: obj.prefab,
                tileX: obj.tileX,
                tileY: obj.tileY,
                widthTiles: obj.widthTiles,
                heightTiles: obj.heightTiles,
                type: obj.type
            }));
        } else if (this._generatedObjectsData && this._generatedObjectsData.length > 0) {
            json._generatedObjectsData = this._generatedObjectsData.map(d => ({ ...d }));
        }
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new TilemapWorldGenerator();
        module.enabled = json.enabled ?? true;
        
        // Mode & seed
        module.generationMode = json.generationMode || 'platformer';
        module.seed = json.seed ?? 12345;
        module.useRandomSeed = json.useRandomSeed ?? false;
        
        // Platformer
        module.platformerSurfaceY = json.platformerSurfaceY ?? 0.3;
        module.platformerHillFrequency = json.platformerHillFrequency ?? 0.04;
        module.platformerHillAmplitude = json.platformerHillAmplitude ?? 5;
        module.platformerCaveChance = json.platformerCaveChance ?? 0.42;
        module.platformerCaveSmoothPasses = json.platformerCaveSmoothPasses ?? 4;
        module.platformerCaveMinDepth = json.platformerCaveMinDepth ?? 8;
        module.platformerGenerateOres = json.platformerGenerateOres ?? true;
        module.platformerGenerateCaves = json.platformerGenerateCaves ?? true;
        module.platformerSurfaceSmoothing = json.platformerSurfaceSmoothing ?? true;
        module.platformerLayers = Array.isArray(json.platformerLayers) ? json.platformerLayers.map(l => ({ ...l })) : module.platformerLayers;
        module.platformerOres = Array.isArray(json.platformerOres) ? json.platformerOres.map(o => ({ ...o })) : module.platformerOres;
        module.platformerDecorations = Array.isArray(json.platformerDecorations) ? json.platformerDecorations.map(d => ({ ...d })) : module.platformerDecorations;
        module.platformerSkyTileX = json.platformerSkyTileX ?? -1;
        module.platformerSkyTileY = json.platformerSkyTileY ?? -1;
        
        // City
        module.cityBlockSizeMin = json.cityBlockSizeMin ?? 8;
        module.cityBlockSizeMax = json.cityBlockSizeMax ?? 16;
        module.cityRoadFrequency = json.cityRoadFrequency ?? 0.25;
        module.cityMaxLanes = json.cityMaxLanes ?? 4;
        module.cityFootpathWidth = json.cityFootpathWidth ?? 1;
        module.cityBuildingFillTile = json.cityBuildingFillTile ?? false;
        module.cityParksChance = json.cityParksChance ?? 0.15;
        module.cityIntersectionStyle = json.cityIntersectionStyle || 'open';
        module.cityTiles = Array.isArray(json.cityTiles) ? json.cityTiles.map(t => ({ ...t })) : module.cityTiles;
        
        // City - Advanced road settings
        module.cityDeadEndChance = json.cityDeadEndChance ?? 0.25;
        module.cityDeadEndMinLength = json.cityDeadEndMinLength ?? 0.3;
        module.cityDeadEndCapStyle = json.cityDeadEndCapStyle || 'building';
        module.cityAlleyChance = json.cityAlleyChance ?? 0.15;
        module.cityAlleyWidth = json.cityAlleyWidth ?? 1;
        
        // City - Districts
        module.cityUseDistricts = json.cityUseDistricts ?? true;
        if (Array.isArray(json.cityDistricts)) {
            module.cityDistricts = json.cityDistricts.map(d => ({
                ...d,
                tiles: d.tiles ? d.tiles.map(t => ({ ...t })) : [],
                buildingPrefabs: d.buildingPrefabs ? d.buildingPrefabs.map(b => ({ ...b })) : [],
                parkPrefabs: d.parkPrefabs ? d.parkPrefabs.map(p => ({ ...p })) : []
            }));
        }
        
        // City - Building/Park prefabs (non-district mode)
        module.citySpawnBuildingPrefabs = json.citySpawnBuildingPrefabs ?? true;
        module.cityBuildingPrefabs = Array.isArray(json.cityBuildingPrefabs) ? json.cityBuildingPrefabs.map(b => ({ ...b })) : module.cityBuildingPrefabs;
        module.cityParkPrefabs = Array.isArray(json.cityParkPrefabs) ? json.cityParkPrefabs.map(p => ({ ...p })) : module.cityParkPrefabs;
        
        // Overworld
        module.overworldWaterLevel = json.overworldWaterLevel ?? 0.35;
        module.overworldForestLevel = json.overworldForestLevel ?? 0.55;
        module.overworldMountainLevel = json.overworldMountainLevel ?? 0.75;
        module.overworldNoiseScale = json.overworldNoiseScale ?? 0.05;
        module.overworldNoiseOctaves = json.overworldNoiseOctaves ?? 4;
        module.overworldPathCount = json.overworldPathCount ?? 3;
        module.overworldPathWidth = json.overworldPathWidth ?? 1;
        module.overworldLakeSmoothing = json.overworldLakeSmoothing ?? 3;
        module.overworldTiles = Array.isArray(json.overworldTiles) ? json.overworldTiles.map(t => ({ ...t })) : module.overworldTiles;
        
        // Cave
        module.caveFillPercent = json.caveFillPercent ?? 0.45;
        module.caveSmoothPasses = json.caveSmoothPasses ?? 5;
        module.caveMinWallNeighbors = json.caveMinWallNeighbors ?? 4;
        module.caveConnectRegions = json.caveConnectRegions ?? true;
        module.caveOreGeneration = json.caveOreGeneration ?? true;
        module.caveTiles = Array.isArray(json.caveTiles) ? json.caveTiles.map(t => ({ ...t })) : module.caveTiles;
        
        // Node System
        module.enableNodeSystem = json.enableNodeSystem ?? false;
        module.drivingSide = json.drivingSide || 'right';
        module.nodeTypeMappings = Array.isArray(json.nodeTypeMappings) 
            ? json.nodeTypeMappings.map(m => ({ ...m })) 
            : module.nodeTypeMappings;
        
        // NPC Spawning
        module.enableNPCSpawning = json.enableNPCSpawning ?? false;
        module.npcViewportMargin = json.npcViewportMargin ?? 100;
        module.npcSpawnConfigs = Array.isArray(json.npcSpawnConfigs) 
            ? json.npcSpawnConfigs.map(c => ({
                ...c,
                prefabs: c.prefabs ? c.prefabs.map(p => ({ ...p })) : []
            })) 
            : module.npcSpawnConfigs;
        
        // Generated objects metadata (for clearing after reload)
        module._generatedObjectsData = Array.isArray(json._generatedObjectsData) 
            ? json._generatedObjectsData.map(d => ({ ...d })) 
            : [];
        module._generatedObjects = [];
        
        return module;
    }
    
    clone() {
        const cloned = new TilemapWorldGenerator();
        cloned.enabled = this.enabled;
        
        // Mode & seed
        cloned.generationMode = this.generationMode;
        cloned.seed = this.seed;
        cloned.useRandomSeed = this.useRandomSeed;
        
        // Platformer
        cloned.platformerSurfaceY = this.platformerSurfaceY;
        cloned.platformerHillFrequency = this.platformerHillFrequency;
        cloned.platformerHillAmplitude = this.platformerHillAmplitude;
        cloned.platformerCaveChance = this.platformerCaveChance;
        cloned.platformerCaveSmoothPasses = this.platformerCaveSmoothPasses;
        cloned.platformerCaveMinDepth = this.platformerCaveMinDepth;
        cloned.platformerGenerateOres = this.platformerGenerateOres;
        cloned.platformerGenerateCaves = this.platformerGenerateCaves;
        cloned.platformerSurfaceSmoothing = this.platformerSurfaceSmoothing;
        cloned.platformerLayers = this.platformerLayers.map(l => ({ ...l }));
        cloned.platformerOres = this.platformerOres.map(o => ({ ...o }));
        cloned.platformerDecorations = this.platformerDecorations.map(d => ({ ...d }));
        cloned.platformerSkyTileX = this.platformerSkyTileX;
        cloned.platformerSkyTileY = this.platformerSkyTileY;
        
        // City
        cloned.cityBlockSizeMin = this.cityBlockSizeMin;
        cloned.cityBlockSizeMax = this.cityBlockSizeMax;
        cloned.cityRoadFrequency = this.cityRoadFrequency;
        cloned.cityMaxLanes = this.cityMaxLanes;
        cloned.cityFootpathWidth = this.cityFootpathWidth;
        cloned.cityBuildingFillTile = this.cityBuildingFillTile;
        cloned.cityParksChance = this.cityParksChance;
        cloned.cityIntersectionStyle = this.cityIntersectionStyle;
        cloned.cityTiles = this.cityTiles.map(t => ({ ...t }));
        
        // City - Advanced road settings
        cloned.cityDeadEndChance = this.cityDeadEndChance;
        cloned.cityDeadEndMinLength = this.cityDeadEndMinLength;
        cloned.cityDeadEndCapStyle = this.cityDeadEndCapStyle;
        cloned.cityAlleyChance = this.cityAlleyChance;
        cloned.cityAlleyWidth = this.cityAlleyWidth;
        
        // City - Districts
        cloned.cityUseDistricts = this.cityUseDistricts;
        cloned.cityDistricts = this.cityDistricts.map(d => ({
            ...d,
            tiles: d.tiles ? d.tiles.map(t => ({ ...t })) : [],
            buildingPrefabs: d.buildingPrefabs ? d.buildingPrefabs.map(b => ({ ...b })) : [],
            parkPrefabs: d.parkPrefabs ? d.parkPrefabs.map(p => ({ ...p })) : []
        }));
        
        // City - Building/Park prefabs (non-district mode)
        cloned.citySpawnBuildingPrefabs = this.citySpawnBuildingPrefabs;
        cloned.cityBuildingPrefabs = this.cityBuildingPrefabs.map(b => ({ ...b }));
        cloned.cityParkPrefabs = this.cityParkPrefabs.map(p => ({ ...p }));
        
        // Overworld
        cloned.overworldWaterLevel = this.overworldWaterLevel;
        cloned.overworldForestLevel = this.overworldForestLevel;
        cloned.overworldMountainLevel = this.overworldMountainLevel;
        cloned.overworldNoiseScale = this.overworldNoiseScale;
        cloned.overworldNoiseOctaves = this.overworldNoiseOctaves;
        cloned.overworldPathCount = this.overworldPathCount;
        cloned.overworldPathWidth = this.overworldPathWidth;
        cloned.overworldLakeSmoothing = this.overworldLakeSmoothing;
        cloned.overworldTiles = this.overworldTiles.map(t => ({ ...t }));
        
        // Cave
        cloned.caveFillPercent = this.caveFillPercent;
        cloned.caveSmoothPasses = this.caveSmoothPasses;
        cloned.caveMinWallNeighbors = this.caveMinWallNeighbors;
        cloned.caveConnectRegions = this.caveConnectRegions;
        cloned.caveOreGeneration = this.caveOreGeneration;
        cloned.caveTiles = this.caveTiles.map(t => ({ ...t }));
        
        // Node System
        cloned.enableNodeSystem = this.enableNodeSystem;
        cloned.drivingSide = this.drivingSide;
        cloned.nodeTypeMappings = this.nodeTypeMappings.map(m => ({ ...m }));
        
        // NPC Spawning
        cloned.enableNPCSpawning = this.enableNPCSpawning;
        cloned.npcViewportMargin = this.npcViewportMargin;
        cloned.npcSpawnConfigs = this.npcSpawnConfigs.map(c => ({
            ...c,
            prefabs: c.prefabs ? c.prefabs.map(p => ({ ...p })) : []
        }));
        
        // Generated objects metadata - clone does NOT copy generated objects
        // Each clone should have its own fresh generation state
        cloned._generatedObjectsData = [];
        cloned._generatedObjects = [];
        
        // Node system state - not cloned, regenerated on start
        cloned._nodeMap = null;
        cloned._nodesByType = {};
        cloned._allNodes = [];
        cloned._npcPools = {};
        cloned._activeNPCs = [];
        cloned._npcOccupiedNodes = new Set();
        
        return cloned;
    }
}

// Register the module
window.TilemapWorldGenerator = TilemapWorldGenerator;
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('TilemapWorldGenerator', TilemapWorldGenerator);
}
