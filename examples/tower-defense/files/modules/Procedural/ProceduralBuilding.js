class ProceduralBuilding extends Module {
    static namespace = "Procedural,Rendering,Drawing";
    static allowMultiple = false;
    static color = "#6a5a4aff";

    static getIcon() {
        return '🏠';
    }
    
    static getDescription() {
        return 'Generates procedural top-down view buildings with rooftops, chimneys, and details';
    }

    constructor() {
        super();

        // Seed for randomization
        this.seed = 12345;
        this.randomizeSeed = false;

        // Building type
        this.buildingStyle = "house"; // house, shop, tavern, castle, tower, barn, temple, ruins, forge, lighthouse, windmill, manor
        this.width = 80;
        this.height = 60;
        this.sizeVariation = 0.1;

        // Roof settings
        this.roofStyle = "peaked"; // peaked, flat, domed, thatched, tiled, slanted
        this.roofColor = "#8a4a3a";
        this.roofColorSecondary = "#7a3a2a";
        this.roofHighlight = "#9a5a4a";
        this.roofRidgeVisible = true;
        this.roofRidgeColor = "#6a3a2a";
        this.roofOverhang = 5;

        // Walls (visible edges from top-down)
        this.wallVisible = true;
        this.wallHeight = 8;
        this.wallColor = "#c4a882";
        this.wallColorDark = "#a48862";
        this.wallStyle = "stone"; // stone, wood, brick, plaster

        // Chimney
        this.chimneyEnabled = true;
        this.chimneyCount = 1;
        this.chimneySize = 8;
        this.chimneyColor = "#5a4a4a";
        this.chimneySmoke = true;
        this.chimneySmokeColor = "#888888";

        // Windows (skylights visible from top)
        this.skylightEnabled = true;
        this.skylightCount = 2;
        this.skylightSize = 6;
        this.skylightColor = "#88ccff";
        this.skylightGlow = true;

        // Door canopy/entrance marker
        this.entranceVisible = true;
        this.entranceWidth = 15;
        this.entranceDepth = 8;
        this.entranceSide = "south"; // north, south, east, west
        this.entranceColor = "#6a4a3a";

        // Details
        this.showWeathering = true;
        this.weatheringIntensity = 0.3;
        this.showMoss = false;
        this.mossAmount = 0.2;
        this.mossColor = "#4a6a4a";
        this.showRoofTiles = true;
        this.tileRows = 6;

        // Tower specific
        this.towerBattlements = true;
        this.battlementCount = 8;
        this.battlementSize = 6;

        // Castle specific
        this.castleTowers = true;
        this.castleTowerCount = 4;
        this.castleTowerSize = 20;
        this.castleFlag = true;
        this.flagColor = "#cc3333";

        // Temple specific
        this.templeColumns = true;
        this.columnCount = 6;
        this.templeGlow = true;
        this.templeGlowColor = "#ffdd88";

        // Ruins specific
        this.ruinsDecay = 0.5;
        this.ruinsDebris = true;

        // Forge specific
        this.forgeGlow = true;
        this.forgeGlowColor = "#ff6600";

        // Lighthouse specific
        this.lighthouseBeam = true;
        this.lighthouseBeamColor = "#ffff88";

        // Windmill specific
        this.windmillBlades = 4;
        this.windmillBladeColor = "#c8a870";

        // Manor specific
        this.manorWings = true;
        this.manorWingSize = 30;

        // Shading
        this.lightAngle = 315;
        this.lightIntensity = 0.4;
        this.ambientOcclusion = true;
        this.aoIntensity = 0.3;

        // Outline
        this.showOutline = true;
        this.outlineWidth = 2;
        this.outlineColor = "#3a2a2a";

        // Shadow
        this.showShadow = true;
        this.shadowOpacity = 0.4;
        this.shadowBlur = 8;
        this.shadowOffsetX = 6;
        this.shadowOffsetY = 8;
        this.shadowColor = "#000000";

        this.cityFloors = 5;
        this.cityFloorColor = "#8a9aaa";
        this.cityFloorColorAlt = "#7a8a9a";
        this.cityWindowColor = "#8a959b";
        this.cityWindowGlow = true;
        this.cityRooftopDetails = true;
        this.cityACUnits = true;
        this.cityRedLight = true;
        this.cityRedLightColor = "#ff2222";

        // Internal state
        this._cachedSeed = null;
        this._roofTiles = [];
        this._skylights = [];
        this._chimneys = [];
        this._weatheringSpots = [];
        this._mossPatches = [];
        this._debris = [];
        this._smokeParticles = [];
        this._flagTime = 0;
        this._windmillAngle = 0;
        this._lighthouseAngle = 0;

        // Canvas caching for performance (disabled when smoke/animation is active)
        this._cachedCanvas = null;
        this._cachedCtx = null;
        this._cacheValid = false;
        this._cacheKey = null;
        this.enableCaching = true;

        // Offscreen canvas for clipping moss/weathering
        this._buildingShapeCanvas = null;
    }

    getPropertyMetadata() {
        return [
            // ═══════════════════════════════════════════════════════════════
            // 🎲 RANDOMIZATION
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎲 Randomization' },
                { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 999999 },
                { key: 'randomizeSeed', label: 'Randomize on Start', type: 'boolean' },
                { key: 'enableCaching', label: 'Enable Caching', type: 'boolean', hint: 'Cache rendering (auto-disabled with animation)' },
                { type: 'button', label: '🎲 Randomize Now', action: 'randomizeAll' },
                { type: 'button', label: '🔄 Regenerate', action: 'regenerate' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏠 BUILDING TYPE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏠 Building Type' },
                { key: 'buildingStyle', label: 'Style', type: 'select', options: ['house', 'shop', 'tavern', 'castle', 'tower', 'barn', 'temple', 'ruins', 'forge', 'lighthouse', 'windmill', 'manor', 'city'] },
                { key: 'width', label: 'Width', type: 'number', min: 30, max: 512 },
                { key: 'height', label: 'Height', type: 'number', min: 30, max: 512 },
                { key: 'sizeVariation', label: 'Size Variation', type: 'slider', min: 0, max: 0.3, step: 0.01 },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏚️ ROOF
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏚️ Roof' },
                { key: 'roofStyle', label: 'Style', type: 'select', options: ['peaked', 'flat', 'domed', 'thatched', 'tiled', 'slanted'] },
                { key: 'roofColor', label: 'Color', type: 'color' },
                { key: 'roofColorSecondary', label: 'Secondary', type: 'color' },
                { key: 'roofHighlight', label: 'Highlight', type: 'color' },
                { key: 'roofRidgeVisible', label: 'Show Ridge', type: 'boolean' },
                { key: 'roofRidgeColor', label: 'Ridge Color', type: 'color', showIf: { roofRidgeVisible: true } },
                { key: 'roofOverhang', label: 'Overhang', type: 'number', min: 0, max: 15 },
                { key: 'showRoofTiles', label: 'Show Tiles', type: 'boolean' },
                { key: 'tileRows', label: 'Tile Rows', type: 'number', min: 2, max: 12, showIf: { showRoofTiles: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🧱 WALLS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🧱 Walls' },
                { key: 'wallVisible', label: 'Visible', type: 'boolean' },
                { key: 'wallHeight', label: 'Height', type: 'number', min: 3, max: 20, showIf: { wallVisible: true } },
                { key: 'wallStyle', label: 'Style', type: 'select', options: ['stone', 'wood', 'brick', 'plaster'], showIf: { wallVisible: true } },
                { key: 'wallColor', label: 'Color', type: 'color', showIf: { wallVisible: true } },
                { key: 'wallColorDark', label: 'Shadow Color', type: 'color', showIf: { wallVisible: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🔥 CHIMNEY
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🔥 Chimney' },
                { key: 'chimneyEnabled', label: 'Enabled', type: 'boolean' },
                { key: 'chimneyCount', label: 'Count', type: 'number', min: 1, max: 4, showIf: { chimneyEnabled: true } },
                { key: 'chimneySize', label: 'Size', type: 'number', min: 4, max: 15, showIf: { chimneyEnabled: true } },
                { key: 'chimneyColor', label: 'Color', type: 'color', showIf: { chimneyEnabled: true } },
                { key: 'chimneySmoke', label: 'Smoke', type: 'boolean', showIf: { chimneyEnabled: true } },
                { key: 'chimneySmokeColor', label: 'Smoke Color', type: 'color', showIf: (m) => m.chimneyEnabled && m.chimneySmoke },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🪟 SKYLIGHTS
            // ═══════════════════════════════════════════════════════════════
            /*{ type: 'groupStart', label: '🪟 Skylights' },
                { key: 'skylightEnabled', label: 'Enabled', type: 'boolean' },
                { key: 'skylightCount', label: 'Count', type: 'number', min: 1, max: 6, showIf: { skylightEnabled: true } },
                { key: 'skylightSize', label: 'Size', type: 'number', min: 3, max: 12, showIf: { skylightEnabled: true } },
                { key: 'skylightColor', label: 'Color', type: 'color', showIf: { skylightEnabled: true } },
                { key: 'skylightGlow', label: 'Glow', type: 'boolean', showIf: { skylightEnabled: true } },
            { type: 'groupEnd' },*/

            // ═══════════════════════════════════════════════════════════════
            // 🚪 ENTRANCE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🚪 Entrance' },
                { key: 'entranceVisible', label: 'Visible', type: 'boolean' },
                { key: 'entranceSide', label: 'Side', type: 'select', options: ['north', 'south', 'east', 'west'], showIf: { entranceVisible: true } },
                { key: 'entranceWidth', label: 'Width', type: 'number', min: 8, max: 30, showIf: { entranceVisible: true } },
                { key: 'entranceDepth', label: 'Depth', type: 'number', min: 4, max: 15, showIf: { entranceVisible: true } },
                { key: 'entranceColor', label: 'Color', type: 'color', showIf: { entranceVisible: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🚪 CITY BUILDING
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏙️ City Building Settings', showIf: { buildingStyle: 'city' } },
               // { key: 'cityFloors', label: 'Floors', type: 'number', min: 2, max: 20 },
                { key: 'cityFloorColor', label: 'Outer Color', type: 'color' },
               // { key: 'cityFloorColorAlt', label: 'Alternate Floor', type: 'color' },
                { key: 'cityWindowColor', label: 'Inner Color', type: 'color' },
                //{ key: 'cityWindowGlow', label: 'Window Glow', type: 'boolean' },
                { key: 'cityRooftopDetails', label: 'Rooftop Details', type: 'boolean' },
                { key: 'cityACUnits', label: 'AC Units', type: 'boolean' },
                { key: 'cityRedLight', label: 'Rooftop Red Light', type: 'boolean' },
                { key: 'cityRedLightColor', label: 'Red Light Color', type: 'color', showIf: { cityRedLight: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏰 CASTLE SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏰 Castle Settings', showIf: { buildingStyle: 'castle' } },
                { key: 'castleTowers', label: 'Corner Towers', type: 'boolean' },
                { key: 'castleTowerCount', label: 'Tower Count', type: 'number', min: 2, max: 6, showIf: { castleTowers: true } },
                { key: 'castleTowerSize', label: 'Tower Size', type: 'number', min: 10, max: 40, showIf: { castleTowers: true } },
                { key: 'castleFlag', label: 'Show Flag', type: 'boolean' },
                { key: 'flagColor', label: 'Flag Color', type: 'color', showIf: { castleFlag: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🗼 TOWER SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🗼 Tower Settings', showIf: { buildingStyle: 'tower' } },
                { key: 'towerBattlements', label: 'Battlements', type: 'boolean' },
                { key: 'battlementCount', label: 'Count', type: 'number', min: 4, max: 16, showIf: { towerBattlements: true } },
                { key: 'battlementSize', label: 'Size', type: 'number', min: 3, max: 12, showIf: { towerBattlements: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ⛪ TEMPLE SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '⛪ Temple Settings', showIf: { buildingStyle: 'temple' } },
                { key: 'templeColumns', label: 'Columns', type: 'boolean' },
                { key: 'columnCount', label: 'Column Count', type: 'number', min: 4, max: 12, showIf: { templeColumns: true } },
                { key: 'templeGlow', label: 'Inner Glow', type: 'boolean' },
                { key: 'templeGlowColor', label: 'Glow Color', type: 'color', showIf: { templeGlow: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏚️ RUINS SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏚️ Ruins Settings', showIf: { buildingStyle: 'ruins' } },
                { key: 'ruinsDecay', label: 'Decay Amount', type: 'slider', min: 0.1, max: 1, step: 0.05 },
                { key: 'ruinsDebris', label: 'Show Debris', type: 'boolean' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🔨 FORGE SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🔨 Forge Settings', showIf: { buildingStyle: 'forge' } },
                { key: 'forgeGlow', label: 'Forge Glow', type: 'boolean' },
                { key: 'forgeGlowColor', label: 'Glow Color', type: 'color', showIf: { forgeGlow: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏮 LIGHTHOUSE SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏮 Lighthouse Settings', showIf: { buildingStyle: 'lighthouse' } },
                { key: 'lighthouseBeam', label: 'Light Beam', type: 'boolean' },
                { key: 'lighthouseBeamColor', label: 'Beam Color', type: 'color', showIf: { lighthouseBeam: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌬️ WINDMILL SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌬️ Windmill Settings', showIf: { buildingStyle: 'windmill' } },
                { key: 'windmillBlades', label: 'Blade Count', type: 'number', min: 2, max: 6 },
                { key: 'windmillBladeColor', label: 'Blade Color', type: 'color' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏛️ MANOR SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏛️ Manor Settings', showIf: { buildingStyle: 'manor' } },
                { key: 'manorWings', label: 'Side Wings', type: 'boolean' },
                { key: 'manorWingSize', label: 'Wing Size', type: 'number', min: 15, max: 60, showIf: { manorWings: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌿 WEATHERING
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌿 Weathering' },
                { key: 'showWeathering', label: 'Show Weathering', type: 'boolean' },
                { key: 'weatheringIntensity', label: 'Intensity', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { showWeathering: true } },
                { key: 'showMoss', label: 'Show Moss', type: 'boolean' },
                { key: 'mossAmount', label: 'Moss Amount', type: 'slider', min: 0, max: 0.5, step: 0.05, showIf: { showMoss: true } },
                { key: 'mossColor', label: 'Moss Color', type: 'color', showIf: { showMoss: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 💡 SHADING
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💡 Shading' },
                { key: 'lightAngle', label: 'Light Angle', type: 'number', min: 0, max: 360 },
                { key: 'lightIntensity', label: 'Light Intensity', type: 'slider', min: 0, max: 1, step: 0.05 },
                { key: 'ambientOcclusion', label: 'Ambient Occlusion', type: 'boolean' },
                { key: 'aoIntensity', label: 'AO Intensity', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { ambientOcclusion: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ✏️ OUTLINE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '✏️ Outline' },
                { key: 'showOutline', label: 'Show Outline', type: 'boolean' },
                { key: 'outlineWidth', label: 'Width', type: 'number', min: 1, max: 6, showIf: { showOutline: true } },
                { key: 'outlineColor', label: 'Color', type: 'color', showIf: { showOutline: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌑 SHADOW
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌑 Shadow' },
                { key: 'showShadow', label: 'Show Shadow', type: 'boolean' },
                { key: 'shadowColor', label: 'Color', type: 'color', showIf: { showShadow: true } },
                { key: 'shadowOpacity', label: 'Opacity', type: 'slider', min: 0, max: 1, step: 0.01, showIf: { showShadow: true } },
                { key: 'shadowBlur', label: 'Blur', type: 'number', min: 0, max: 20, showIf: { showShadow: true } },
                { key: 'shadowOffsetX', label: 'Offset X', type: 'number', min: -30, max: 30, showIf: { showShadow: true } },
                { key: 'shadowOffsetY', label: 'Offset Y', type: 'number', min: -30, max: 30, showIf: { showShadow: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 📦 PRESETS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '📦 Presets' },
                { type: 'button', label: '🏠 Cottage', action: 'presetCottage' },
                { type: 'button', label: '🏪 Shop', action: 'presetShop' },
                { type: 'button', label: '🏙️ City Building', action: 'presetCity' },
                { type: 'button', label: '🍺 Tavern', action: 'presetTavern' },
                { type: 'button', label: '🏰 Castle', action: 'presetCastle' },
                { type: 'button', label: '🗼 Watchtower', action: 'presetWatchtower' },
                { type: 'button', label: '🏚️ Barn', action: 'presetBarn' },
                { type: 'button', label: '⛪ Temple', action: 'presetTemple' },
                { type: 'button', label: '🏚️ Ruins', action: 'presetRuins' },
                { type: 'button', label: '🏔️ Stone House', action: 'presetStoneHouse' },
                { type: 'button', label: '🌿 Overgrown', action: 'presetOvergrown' },
                { type: 'button', label: '🔨 Forge', action: 'presetForge' },
                { type: 'button', label: '🏮 Lighthouse', action: 'presetLighthouse' },
                { type: 'button', label: '🌬️ Windmill', action: 'presetWindmill' },
                { type: 'button', label: '🏛️ Manor', action: 'presetManor' },
            { type: 'groupEnd' },
        ];
    }

    // Seeded random
    _seededRandom() {
        this._currentSeed = (this._currentSeed * 1103515245 + 12345) & 0x7fffffff;
        return this._currentSeed / 0x7fffffff;
    }

    _initSeed(seed) {
        this._currentSeed = seed || this.seed;
    }

    // Actions
    randomizeAll() {
        this.seed = Math.floor(Math.random() * 999999);
        this._generateBuilding();
        this._refreshInspector();
    }

    regenerate() {
        this._generateBuilding();
        this._refreshInspector();
    }

    // Presets
    presetCottage() {
        this.buildingStyle = "house";
        this.width = 60;
        this.height = 50;
        this.roofStyle = "thatched";
        this.roofColor = "#8a7a5a";
        this.roofColorSecondary = "#7a6a4a";
        this.wallStyle = "plaster";
        this.wallColor = "#e8dcc8";
        this.chimneyEnabled = true;
        this.chimneyCount = 1;
        this.chimneySmoke = true;
        this.skylightEnabled = false;
        this.showMoss = true;
        this.mossAmount = 0.15;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetShop() {
        this.buildingStyle = "shop";
        this.width = 70;
        this.height = 55;
        this.roofStyle = "slanted";
        this.roofColor = "#6a4a3a";
        this.wallStyle = "wood";
        this.wallColor = "#c4a070";
        this.chimneyEnabled = false;
        this.skylightEnabled = true;
        this.skylightCount = 3;
        this.entranceVisible = true;
        this.entranceWidth = 20;
        this.showMoss = false;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetCity() {
        this.buildingStyle = "city";
        this.width = 70;
        this.height = 80;
        this.roofStyle = "flat";
        this.roofColor = "#6a7a8a";
        this.wallStyle = "stone";
        this.wallColor = "#8a9aaa";
        this.cityFloors = 8;
        this.cityWindowColor = "#ffffcc";
        this.cityWindowGlow = true;
        this.cityRooftopDetails = true;
        this.cityACUnits = true;
        this.chimneyEnabled = false;
        this.showWeathering = true;
        this.weatheringIntensity = 0.2;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetTavern() {
        this.buildingStyle = "tavern";
        this.width = 90;
        this.height = 70;
        this.roofStyle = "peaked";
        this.roofColor = "#5a3a2a";
        this.wallStyle = "wood";
        this.wallColor = "#a08060";
        this.chimneyEnabled = true;
        this.chimneyCount = 2;
        this.chimneySmoke = true;
        this.skylightEnabled = true;
        this.skylightCount = 4;
        this.skylightGlow = true;
        this.entranceWidth = 18;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetCastle() {
        this.buildingStyle = "castle";
        this.width = 120;
        this.height = 100;
        this.roofStyle = "flat";
        this.roofColor = "#6a6a6a";
        this.wallStyle = "stone";
        this.wallColor = "#9a9a8a";
        this.wallHeight = 15;
        this.chimneyEnabled = false;
        this.castleTowers = true;
        this.castleTowerCount = 4;
        this.castleTowerSize = 25;
        this.castleFlag = true;
        this.flagColor = "#cc3333";
        this.showWeathering = true;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetWatchtower() {
        this.buildingStyle = "tower";
        this.width = 40;
        this.height = 40;
        this.roofStyle = "peaked";
        this.roofColor = "#5a4a4a";
        this.wallStyle = "stone";
        this.wallColor = "#8a8a7a";
        this.wallHeight = 12;
        this.towerBattlements = true;
        this.battlementCount = 8;
        this.chimneyEnabled = false;
        this.skylightEnabled = false;
        this.entranceVisible = false;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetBarn() {
        this.buildingStyle = "barn";
        this.width = 100;
        this.height = 60;
        this.roofStyle = "peaked";
        this.roofColor = "#8a3a2a";
        this.wallStyle = "wood";
        this.wallColor = "#8a5a3a";
        this.wallHeight = 10;
        this.chimneyEnabled = false;
        this.skylightEnabled = false;
        this.entranceVisible = true;
        this.entranceWidth = 25;
        this.showWeathering = true;
        this.weatheringIntensity = 0.4;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetTemple() {
        this.buildingStyle = "temple";
        this.width = 80;
        this.height = 100;
        this.roofStyle = "domed";
        this.roofColor = "#d4c4a4";
        this.wallStyle = "stone";
        this.wallColor = "#e8e0d0";
        this.templeColumns = true;
        this.columnCount = 8;
        this.templeGlow = true;
        this.templeGlowColor = "#ffee88";
        this.chimneyEnabled = false;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetRuins() {
        this.buildingStyle = "ruins";
        this.width = 80;
        this.height = 70;
        this.roofStyle = "flat";
        this.wallStyle = "stone";
        this.wallColor = "#7a7a6a";
        this.ruinsDecay = 0.6;
        this.ruinsDebris = true;
        this.chimneyEnabled = false;
        this.skylightEnabled = false;
        this.showMoss = true;
        this.mossAmount = 0.4;
        this.showWeathering = true;
        this.weatheringIntensity = 0.6;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetStoneHouse() {
        this.buildingStyle = "house";
        this.width = 70;
        this.height = 55;
        this.roofStyle = "tiled";
        this.roofColor = "#5a5a5a";
        this.wallStyle = "stone";
        this.wallColor = "#b0a898";
        this.chimneyEnabled = true;
        this.chimneySmoke = true;
        this.skylightEnabled = true;
        this.skylightCount = 2;
        this.showWeathering = true;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetOvergrown() {
        this.buildingStyle = "house";
        this.width = 65;
        this.height = 50;
        this.roofStyle = "thatched";
        this.roofColor = "#6a7a5a";
        this.wallStyle = "stone";
        this.wallColor = "#8a8a7a";
        this.showMoss = true;
        this.mossAmount = 0.45;
        this.mossColor = "#4a6a3a";
        this.showWeathering = true;
        this.weatheringIntensity = 0.5;
        this.chimneyEnabled = true;
        this.chimneySmoke = false;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetForge() {
        this.buildingStyle = "forge";
        this.width = 65;
        this.height = 55;
        this.roofStyle = "peaked";
        this.roofColor = "#4a3a3a";
        this.roofColorSecondary = "#3a2a2a";
        this.wallStyle = "stone";
        this.wallColor = "#7a6a5a";
        this.wallColorDark = "#5a4a3a";
        this.chimneyEnabled = true;
        this.chimneyCount = 2;
        this.chimneySmoke = true;
        this.chimneySmokeColor = "#555555";
        this.chimneyColor = "#3a3a3a";
        this.forgeGlow = true;
        this.forgeGlowColor = "#ff6600";
        this.skylightEnabled = false;
        this.showWeathering = true;
        this.weatheringIntensity = 0.4;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetLighthouse() {
        this.buildingStyle = "lighthouse";
        this.width = 35;
        this.height = 35;
        this.roofStyle = "peaked";
        this.roofColor = "#cc3333";
        this.roofColorSecondary = "#aa2222";
        this.roofHighlight = "#dd4444";
        this.wallStyle = "plaster";
        this.wallColor = "#f0f0f0";
        this.wallColorDark = "#d0d0d0";
        this.chimneyEnabled = false;
        this.lighthouseBeam = true;
        this.lighthouseBeamColor = "#ffffaa";
        this.skylightEnabled = false;
        this.showWeathering = false;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetWindmill() {
        this.buildingStyle = "windmill";
        this.width = 45;
        this.height = 45;
        this.roofStyle = "peaked";
        this.roofColor = "#8a6a4a";
        this.wallStyle = "stone";
        this.wallColor = "#c8b898";
        this.windmillBlades = 4;
        this.windmillBladeColor = "#c8a870";
        this.chimneyEnabled = false;
        this.skylightEnabled = false;
        this.showWeathering = true;
        this.weatheringIntensity = 0.2;
        this._generateBuilding();
        this._refreshInspector();
    }

    presetManor() {
        this.buildingStyle = "manor";
        this.width = 90;
        this.height = 70;
        this.roofStyle = "peaked";
        this.roofColor = "#4a4a6a";
        this.roofColorSecondary = "#3a3a5a";
        this.roofHighlight = "#5a5a7a";
        this.wallStyle = "brick";
        this.wallColor = "#c08070";
        this.wallColorDark = "#a06050";
        this.wallHeight = 10;
        this.manorWings = true;
        this.manorWingSize = 35;
        this.chimneyEnabled = true;
        this.chimneyCount = 3;
        this.chimneySmoke = false;
        this.skylightEnabled = true;
        this.skylightCount = 4;
        this.showWeathering = true;
        this.weatheringIntensity = 0.2;
        this._generateBuilding();
        this._refreshInspector();
    }

    _refreshInspector() {
        if (window.editor && window.editor.inspector) {
            if (window.editor.inspector.refreshModuleUI) {
                window.editor.inspector.refreshModuleUI(this);
            }
            if (window.editor.refreshCanvas) {
                window.editor.refreshCanvas();
            }
            if (this.gameObject && this.gameObject.scene) {
                this.gameObject.scene.dirty = true;
            }
        }
    }

    rebuild() {
        this._generateBuilding();
    }

    _generateBuilding() {
        this._initSeed(this.seed);
        this._cachedSeed = Number(this.seed);
        this._roofTiles = [];
        this._skylights = [];
        this._chimneys = [];
        this._weatheringSpots = [];
        this._mossPatches = [];
        this._debris = [];
        this._smokeParticles = [];
        this._sparkParticles = [];
        this._cachedSeed = this.seed;
        this._cacheValid = false;

        const w = this.width;
        const h = this.height;

        // Generate roof tiles
        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._generateRoofTiles();
        }

        // Generate skylights
        /*if (this.skylightEnabled) {
            for (let i = 0; i < this.skylightCount; i++) {
                this._skylights.push({
                    x: (this._seededRandom() - 0.5) * w * 0.5,
                    y: (this._seededRandom() - 0.5) * h * 0.4,
                    size: this.skylightSize * (0.8 + this._seededRandom() * 0.4),
                    rotation: this._seededRandom() * 0.2 - 0.1
                });
            }
        }*/

        // Generate chimneys
        if (this.chimneyEnabled) {
            const placed = [];
            const minDist = this.chimneySize * 2.5;
            for (let i = 0; i < this.chimneyCount; i++) {
                const pos = this._findNonOverlappingPosition(
                    placed, minDist,
                    -this.width * 0.35, -this.height * 0.35,
                     this.width * 0.7,   this.height * 0.7
                );
                placed.push(pos);
                this._chimneys.push({
                    x: pos.x,
                    y: pos.y,
                    size: this.chimneySize * (0.8 + this._seededRandom() * 0.4),
                    smokeParticles: Array.from({ length: 8 }, (_, i) => ({
                        x: 0,
                        y: 0,
                        size: 3 + Math.random() * 4,
                        opacity: 0.3 + Math.random() * 0.3,
                        speed: 5 + Math.random() * 10,
                        drift: (Math.random() - 0.5) * 2
                    })),
                    sparkParticles: Array.from({ length: 8 }, () => ({
                        x: (Math.random() - 0.5) * 4,
                        y: -Math.random() * 20,
                        size: 2,
                        opacity: 0.6 + Math.random() * 0.4,
                        speed: 3 + Math.random() * 5,
                        drift: (Math.random() - 0.5) * 2,
                        angle: Math.random() * Math.PI * 2
                    }))
                });
            }
        }

        // Generate weathering
        if (this.showWeathering) {
            const spotCount = Math.floor(20 * this.weatheringIntensity);
            for (let i = 0; i < spotCount; i++) {
                this._weatheringSpots.push({
                    x: (this._seededRandom() - 0.5) * w,
                    y: (this._seededRandom() - 0.5) * h,
                    size: 3 + this._seededRandom() * 8,
                    opacity: 0.1 + this._seededRandom() * 0.2
                });
            }
        }

        // Generate moss
        if (this.showMoss) {
            const patchCount = Math.floor(15 * this.mossAmount);
            for (let i = 0; i < patchCount; i++) {
                this._mossPatches.push({
                    x: (this._seededRandom() - 0.5) * w * 0.9,
                    y: (this._seededRandom() - 0.5) * h * 0.9,
                    size: 5 + this._seededRandom() * 12,
                    opacity: 0.4 + this._seededRandom() * 0.4
                });
            }
        }

        // Generate debris for ruins
        if (this.buildingStyle === 'ruins' && this.ruinsDebris) {
            const debrisCount = Math.floor(20 * this.ruinsDecay);
            for (let i = 0; i < debrisCount; i++) {
                this._debris.push({
                    x: (this._seededRandom() - 0.5) * w * 1.5,
                    y: (this._seededRandom() - 0.5) * h * 1.5,
                    size: 2 + this._seededRandom() * 6,
                    rotation: this._seededRandom() * Math.PI * 2,
                    type: this._seededRandom() > 0.5 ? 'stone' : 'wood'
                });
            }
        }
    }

    _generateRoofTiles() {
        const w = this.width;
        const h = this.height;
        
        for (let row = 0; row < this.tileRows; row++) {
            const rowY = -h/2 + (row / this.tileRows) * h;
            const tilesInRow = Math.floor(w / 8);
            
            for (let col = 0; col < tilesInRow; col++) {
                const offset = (row % 2) * 4;
                this._roofTiles.push({
                    x: -w/2 + offset + col * 8,
                    y: rowY,
                    width: 8,
                    height: h / this.tileRows,
                    shade: 0.9 + this._seededRandom() * 0.1 // FIX: clamped to [0.9, 1.0], was going over 1.0
                });
            }
        }
    }

    start() {
        if (this.randomizeSeed) {
            this.seed = Math.floor(Math.random() * 999999);
        }
        this._generateBuilding();
    }

    loop(deltaTime) {
        const dt = deltaTime;
    
        if (Number(this._cachedSeed) !== Number(this.seed)) {
            this._generateBuilding();
        }
    
        this._windTime = (this._windTime || 0) + dt;
    
        if (this.chimneyEnabled && this.chimneySmoke) {
            for (const chimney of this._chimneys) {
                for (const smoke of chimney.smokeParticles) {
                    smoke.y -= smoke.speed * deltaTime;
                    smoke.x += smoke.drift * deltaTime;
                    smoke.size += 2 * deltaTime;
                    smoke.opacity -= 0.15 * deltaTime;
    
                    if (smoke.opacity <= 0) {
                        smoke.y = 0;
                        smoke.x = 0;
                        smoke.size = 3 + Math.random() * 4;
                        smoke.opacity = 0.3 + Math.random() * 0.3;
                    }
                }
    
                for (const spark of chimney.sparkParticles) {
                    spark.y -= (spark.speed * 1.5) * deltaTime;
                    spark.angle = (spark.angle || 0) + (5 * deltaTime);
                    spark.x += (Math.sin(spark.angle) * 3) * deltaTime;
                    spark.opacity -= 0.2 * deltaTime;
    
                    if (spark.opacity <= 0) {
                        spark.y = 0;
                        spark.x = (Math.random() - 0.5) * 4;
                        spark.opacity = 0.8 + Math.random() * 0.2;
                        spark.angle = Math.random() * Math.PI * 2;
                    }
                }
            }
        }
    
        this._flagTime = (this._flagTime || 0) + dt;
        this._windmillAngle = (this._windmillAngle || 0) + dt * 1.2;
        this._lighthouseAngle = (this._lighthouseAngle || 0) + dt * 0.8;
        this._redLightTime = (this._redLightTime || 0) + deltaTime;
    }

    _findNonOverlappingPosition(existing, minDist, areaX, areaY, areaW, areaH, maxTries = 30) {
        for (let attempt = 0; attempt < maxTries; attempt++) {
            const x = areaX + this._seededRandom() * areaW;
            const y = areaY + this._seededRandom() * areaH;
            let ok = true;
            for (const p of existing) {
                const dx = p.x - x, dy = p.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < minDist) { ok = false; break; }
            }
            if (ok) return { x, y };
        }
        // fallback: just return last attempted position
        return {
            x: areaX + this._seededRandom() * areaW,
            y: areaY + this._seededRandom() * areaH
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIX: _drawSurfaceDetails
    //
    // The original code drew an opaque black silhouette mask onto the detail
    // canvas, then used source-atop to clip weathering/moss to it — which is
    // correct in isolation. The bug was that after blitting the detail canvas
    // back with ctx.drawImage the main context's globalCompositeOperation was
    // still 'source-over', but the BLACK mask pixels from step 1 were being
    // composited onto the main canvas because the detail canvas background was
    // transparent only *outside* the shape — the shape itself was solid black
    // before source-atop replaced it.
    //
    // Fix: use a TWO-PASS approach on the detail canvas.
    //   Pass 1 — draw the mask shape in solid black on a clean canvas.
    //   Pass 2 — draw weathering/moss with source-atop (clips to shape).
    //   Then blit to main ctx with source-atop as well, so only non-transparent
    //   pixels from the detail canvas land on top of the already-painted roof.
    //
    // Actually the cleanest fix is even simpler: draw weathering/moss directly
    // on the main ctx using a clip path derived from the building shape instead
    // of a separate canvas. This avoids any compositing confusion entirely.
    // ─────────────────────────────────────────────────────────────────────────
    _drawSurfaceDetails(ctx, w, h) {
        if (!this.showWeathering && !this.showMoss) return;

        ctx.save();

        // Build a clip path matching the building silhouette
        ctx.beginPath();
        const pad = this.roofOverhang + 2;
        switch (this.buildingStyle) {
            case 'tower':
            case 'lighthouse':
            case 'windmill': {
                const r = Math.min(w, h) / 2 + pad;
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                break;
            }
            case 'castle': {
                ctx.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
                if (this.castleTowers) {
                    const tr = this.castleTowerSize / 2;
                    const centers = [
                        { x: -w / 2, y: -h / 2 },
                        { x:  w / 2, y: -h / 2 },
                        { x: -w / 2, y:  h / 2 },
                        { x:  w / 2, y:  h / 2 },
                    ];
                    for (let i = 0; i < Math.min(this.castleTowerCount, centers.length); i++) {
                        ctx.moveTo(centers[i].x + tr, centers[i].y);
                        ctx.arc(centers[i].x, centers[i].y, tr, 0, Math.PI * 2);
                    }
                }
                break;
            }
            case 'manor': {
                ctx.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
                if (this.manorWings) {
                    const ws = this.manorWingSize;
                    ctx.rect(-w / 2 - ws - pad, -h / 4 - pad, ws + pad, h / 2 + pad * 2);
                    ctx.rect(w / 2 - pad, -h / 4 - pad, ws + pad, h / 2 + pad * 2);
                }
                break;
            }
            default:
                ctx.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
                break;
        }
        ctx.clip();

        // Draw weathering spots (clipped to building shape)
        if (this.showWeathering) {
            for (const spot of this._weatheringSpots) {
                ctx.globalAlpha = spot.opacity;
                ctx.fillStyle = '#3a3a3a';
                ctx.beginPath();
                ctx.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw moss patches (clipped to building shape)
        if (this.showMoss) {
            for (const patch of this._mossPatches) {
                ctx.globalAlpha = patch.opacity;
                ctx.fillStyle = this.mossColor;
                ctx.beginPath();
                ctx.arc(patch.x, patch.y, patch.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    draw(ctx) {
        //if (this._skylights.length === 0 && this.skylightEnabled) {
        //    this._generateBuilding();
        //}

        // Determine if this building has live animation
        const hasAnimation = (this.chimneyEnabled && this.chimneySmoke) ||
                             (this.buildingStyle === 'castle' && this.castleFlag) ||
                             (this.buildingStyle === 'windmill') ||
                             (this.buildingStyle === 'lighthouse' && this.lighthouseBeam) ||
                             (this.buildingStyle === 'city' && this.cityRedLight);

        const canCache = this.enableCaching && !hasAnimation;
        
        if (canCache) {
            const cacheKey = this._getCacheKey();
            
            if (!this._cacheValid || this._cacheKey !== cacheKey) {
                this._renderToCache();
                this._cacheKey = cacheKey;
                this._cacheValid = true;
            }
            
            if (this._cachedCanvas) {
                ctx.save();
                ctx.drawImage(
                    this._cachedCanvas,
                    -this._cachedCanvas.width / 2,
                    -this._cachedCanvas.height / 2
                );
                ctx.restore();
            }
            return;
        }

        this._drawDirect(ctx);
    }

    _getCacheKey() {
        return `${this.seed}_${this.buildingStyle}_${this.width}_${this.height}_${this.roofStyle}_${this.roofColor}_` +
               `${this.roofColorSecondary}_${this.roofHighlight}_${this.roofRidgeVisible}_${this.roofRidgeColor}_${this.roofOverhang}_` +
               `${this.wallVisible}_${this.wallHeight}_${this.wallColor}_${this.wallColorDark}_${this.wallStyle}_` +
               `${this.chimneyEnabled}_${this.chimneyCount}_${this.chimneySize}_${this.chimneyColor}_` +
               `${this.skylightEnabled}_${this.skylightCount}_${this.skylightSize}_${this.skylightColor}_${this.skylightGlow}_` +
               `${this.entranceVisible}_${this.entranceWidth}_${this.entranceDepth}_${this.entranceSide}_${this.entranceColor}_` +
               `${this.showWeathering}_${this.weatheringIntensity}_${this.showMoss}_${this.mossAmount}_${this.showRoofTiles}_${this.tileRows}_` +
               `${this.showOutline}_${this.outlineWidth}_${this.outlineColor}_` +
               `${this.showShadow}_${this.shadowOpacity}_${this.shadowBlur}_${this.shadowOffsetX}_${this.shadowOffsetY}_${this.shadowColor}_` +
               `${this.manorWings}_${this.manorWingSize}_${this.forgeGlow}_${this.forgeGlowColor}_${this.templeGlow}_${this.templeGlowColor}`;
    }

    _renderToCache() {
        const wingExtra = (this.buildingStyle === 'manor' && this.manorWings) ? this.manorWingSize : 0;
        const padding = Math.max(30, this.shadowBlur + Math.abs(this.shadowOffsetX) + Math.abs(this.shadowOffsetY));
        const maxW = this.width + this.roofOverhang * 2 + padding * 2 + wingExtra * 2;
        const maxH = this.height + this.roofOverhang * 2 + this.wallHeight + padding * 2;
        
        if (!this._cachedCanvas) {
            this._cachedCanvas = document.createElement('canvas');
            this._cachedCtx = this._cachedCanvas.getContext('2d');
            this._cachedCtx.imageSmoothingEnabled = false;
        }
        
        if (this._cachedCanvas.width !== maxW || this._cachedCanvas.height !== maxH) {
            this._cachedCanvas.width = maxW;
            this._cachedCanvas.height = maxH;
        }
        
        this._cachedCtx.clearRect(0, 0, maxW, maxH);
        this._cachedCtx.save();
        this._cachedCtx.translate(maxW / 2, maxH / 2);
        this._drawDirect(this._cachedCtx);
        this._cachedCtx.restore();
    }

    invalidateCache() {
        this._cacheValid = false;
    }

    _drawDirect(ctx) {
        ctx.save();

        // Draw shadow
        if (this.showShadow) {
            this._drawShadow(ctx);
        }

        // Draw based on building style
        switch (this.buildingStyle) {
            case 'castle':
                this._drawCastle(ctx);
                break;
            case 'tower':
                this._drawTower(ctx);
                break;
            case 'temple':
                this._drawTemple(ctx);
                break;
            case 'ruins':
                this._drawRuins(ctx);
                break;
            case 'forge':
                this._drawForge(ctx);
                break;
            case 'lighthouse':
                this._drawLighthouse(ctx);
                break;
            case 'windmill':
                this._drawWindmill(ctx);
                break;
            case 'manor':
                this._drawManor(ctx);
                break;
            case 'shop':
                this._drawShop(ctx);
                break;
            case 'tavern':
                this._drawTavern(ctx);
                break;
            case 'barn':
                this._drawBarn(ctx);
                break;
            case 'city':
                this._drawCity(ctx);
                break;
            default:
                this._drawStandardBuilding(ctx);
                break;
        }

        ctx.restore();
    }

    _drawShadow(ctx) {
        ctx.save();
        ctx.translate(this.shadowOffsetX, this.shadowOffsetY);
        ctx.globalAlpha = this.shadowOpacity;
        ctx.filter = `blur(${this.shadowBlur}px)`;
        ctx.fillStyle = this.shadowColor;

        if (this.buildingStyle === 'tower' || this.buildingStyle === 'lighthouse' || this.buildingStyle === 'windmill') {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(this.width, this.height) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.buildingStyle === 'manor' && this.manorWings) {
            const ws = this.manorWingSize;
            ctx.fillRect(-this.width / 2 - ws, -this.height / 4, this.width + ws * 2, this.height / 2);
            ctx.fillRect(-this.width / 2 - this.roofOverhang, -this.height / 2 - this.roofOverhang,
                this.width + this.roofOverhang * 2, this.height + this.roofOverhang * 2);
        } else {
            ctx.fillRect(-this.width / 2 - this.roofOverhang, -this.height / 2 - this.roofOverhang,
                        this.width + this.roofOverhang * 2, this.height + this.roofOverhang * 2);
        }

        ctx.restore();
    }

    _drawStandardBuilding(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;

        if (this.wallVisible) {
            this._drawWalls(ctx, w, h);
        }

        this._drawRoof(ctx, w, h, overhang);

        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._drawRoofTiles(ctx);
        }

        if (this.roofRidgeVisible && (this.roofStyle === 'peaked' || this.roofStyle === 'slanted')) {
            this._drawRoofRidge(ctx, w, h);
        }

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w / 2 - overhang, -h / 2 - overhang, w + overhang * 2, h + overhang * 2);
        }

        // Clipped surface details
        this._drawSurfaceDetails(ctx, w, h);

        if (this.entranceVisible) {
            this._drawEntrance(ctx, w, h);
        }

        if (this.skylightEnabled) {
            //this._drawSkylights(ctx);
        }

        if (this.chimneyEnabled) {
            this._drawChimneys(ctx, deltaTime);
        }
    }

    // ─── SHOP ───────────────────────────────────────────────────────────────
    _drawShop(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;

        if (this.wallVisible) this._drawWalls(ctx, w, h);

        this._drawRoof(ctx, w, h, overhang);

        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._drawRoofTiles(ctx);
        }
        if (this.roofRidgeVisible && (this.roofStyle === 'peaked' || this.roofStyle === 'slanted')) {
            this._drawRoofRidge(ctx, w, h);
        }

        // Awning / canopy stripe across front
        const awningY = h / 2 + overhang;
        const stripeH = 7;
        const stripes = 5;
        for (let i = 0; i < stripes; i++) {
            ctx.fillStyle = i % 2 === 0 ? this.roofColor : this.roofHighlight;
            ctx.fillRect(-w / 2 + (i / stripes) * w, awningY, w / stripes, stripeH);
        }
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2, awningY, w, stripeH);

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w / 2 - overhang, -h / 2 - overhang, w + overhang * 2, h + overhang * 2);
        }

        // Display window (front face)
        ctx.fillStyle = this.skylightColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-w / 2 + 8, h / 2 - 12, w - 16, 12);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this._adjustColor(this.wallColor, 0.7);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w / 2 + 8, h / 2 - 12, w - 16, 12);

        // Sign above door
        ctx.fillStyle = this._adjustColor(this.roofColor, 1.2);
        ctx.fillRect(-10, -h / 2 - overhang - 8, 20, 7);
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -h / 2 - overhang - 8, 20, 7);

        this._drawSurfaceDetails(ctx, w, h);

        if (this.entranceVisible) this._drawEntrance(ctx, w, h);
        if (this.skylightEnabled) this._drawSkylights(ctx);
        if (this.chimneyEnabled) this._drawChimneys(ctx, deltaTime);
    }

    // ─── TAVERN ─────────────────────────────────────────────────────────────
    _drawTavern(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;

        if (this.wallVisible) this._drawWalls(ctx, w, h);

        this._drawRoof(ctx, w, h, overhang);

        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._drawRoofTiles(ctx);
        }
        if (this.roofRidgeVisible && (this.roofStyle === 'peaked' || this.roofStyle === 'slanted')) {
            this._drawRoofRidge(ctx, w, h);
        }

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w / 2 - overhang, -h / 2 - overhang, w + overhang * 2, h + overhang * 2);
        }

        // Hanging sign
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.7);
        ctx.fillRect(w / 2 + overhang, -8, 18, 14);
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(w / 2 + overhang, -8, 18, 14);
        // Sign post
        ctx.strokeStyle = this._adjustColor(this.wallColor, 0.5);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w / 2 + overhang, -h / 2);
        ctx.lineTo(w / 2 + overhang, -8);
        ctx.stroke();

        // Covered porch extension on entrance side
        const porchD = 12;
        ctx.fillStyle = this._adjustColor(this.roofColor, 0.9);
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-w / 2, h / 2 + overhang, w, porchD);
        ctx.globalAlpha = 1;

        this._drawSurfaceDetails(ctx, w, h);

        if (this.entranceVisible) this._drawEntrance(ctx, w, h);
        //if (this.skylightEnabled) this._drawSkylights(ctx);
        if (this.chimneyEnabled) this._drawChimneys(ctx, deltaTime);
    }

    // ─── BARN ───────────────────────────────────────────────────────────────
    _drawBarn(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;

        if (this.wallVisible) this._drawWalls(ctx, w, h);

        // Barn roof — gambrel style approximation (two-tone)
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, this.roofHighlight);
        grad.addColorStop(0.4, this.roofColor);
        grad.addColorStop(1, this.roofColorSecondary);
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2 - overhang, -h / 2 - overhang, w + overhang * 2, h + overhang * 2);

        // Gambrel ridge band
        ctx.fillStyle = this._adjustColor(this.roofColor, 0.8);
        ctx.fillRect(-w / 2 - overhang, -4, w + overhang * 2, 8);

        // Vertical wood plank lines
        ctx.strokeStyle = this._adjustColor(this.wallColor, 0.75);
        ctx.lineWidth = 1.5;
        const plankW = 10;
        for (let x = -w / 2; x < w / 2; x += plankW) {
            ctx.beginPath();
            ctx.moveTo(x, -h / 2);
            ctx.lineTo(x, h / 2);
            ctx.stroke();
        }

        if (this.roofRidgeVisible) this._drawRoofRidge(ctx, w, h);

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w / 2 - overhang, -h / 2 - overhang, w + overhang * 2, h + overhang * 2);
        }

        this._drawSurfaceDetails(ctx, w, h);

        if (this.entranceVisible) this._drawEntrance(ctx, w, h);
        if (this.chimneyEnabled) this._drawChimneys(ctx, deltaTime);

        // Large barn door X bracing hint
        ctx.strokeStyle = this._adjustColor(this.wallColor, 0.6);
        ctx.lineWidth = 2;
        const dw = this.entranceWidth;
        ctx.beginPath();
        ctx.moveTo(-dw / 2, h / 2 - 2);
        ctx.lineTo(dw / 2, h / 2 - 12);
        ctx.moveTo(dw / 2, h / 2 - 2);
        ctx.lineTo(-dw / 2, h / 2 - 12);
        ctx.stroke();
    }

    _drawWalls(ctx, w, h) {
        const wallH = this.wallHeight;
        
        ctx.fillStyle = this.wallColorDark;
        
        // South wall (bottom, in shadow)
        //ctx.fillRect(-w/2, h/2, w, wallH);
        
        // East wall (right side)
        /*ctx.fillStyle = this.wallColor;
        ctx.beginPath();
        ctx.moveTo(w/2, -h/2);
        ctx.lineTo(w/2, -h/2);
        ctx.lineTo(w/2, h/2);
        ctx.lineTo(w/2, h/2);
        ctx.closePath();
        ctx.fill();*/

        // Add brick/stone pattern
        if (this.wallStyle === 'brick' || this.wallStyle === 'stone') {
            ctx.strokeStyle = this._adjustColor(this.wallColorDark, 0.8);
            ctx.lineWidth = 0.5;
            
            for (let y = h/2; y < h/2 + wallH; y += 4) {
                ctx.beginPath();
                ctx.moveTo(-w/2, y);
                ctx.lineTo(w/2, y);
                ctx.stroke();
            }
        }
    }

    _drawRoof(ctx, w, h, overhang) {
        const gradient = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        gradient.addColorStop(0, this.roofHighlight);
        gradient.addColorStop(0.5, this.roofColor);
        gradient.addColorStop(1, this.roofColorSecondary);

        ctx.fillStyle = gradient;

        switch (this.roofStyle) {
            case 'peaked':
            case 'thatched':
            case 'tiled':
                ctx.fillRect(-w/2 - overhang, -h/2 - overhang, w + overhang * 2, h + overhang * 2);
                break;
                
            case 'domed':
                ctx.beginPath();
                ctx.ellipse(0, 0, w/2 + overhang, h/2 + overhang, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Dome highlight
                const domeGradient = ctx.createRadialGradient(-w*0.15, -h*0.15, 0, 0, 0, w/2);
                domeGradient.addColorStop(0, this.roofHighlight);
                domeGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
                ctx.fillStyle = domeGradient;
                ctx.beginPath();
                ctx.ellipse(0, 0, w/2 + overhang, h/2 + overhang, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'flat':
                ctx.fillRect(-w/2 - overhang, -h/2 - overhang, w + overhang * 2, h + overhang * 2);
                
                // Flat roof edge
                ctx.strokeStyle = this.roofColorSecondary;
                ctx.lineWidth = 3;
                ctx.strokeRect(-w/2 - overhang + 2, -h/2 - overhang + 2, 
                              w + overhang * 2 - 4, h + overhang * 2 - 4);
                break;
                
            case 'slanted':
                ctx.beginPath();
                ctx.moveTo(-w/2 - overhang, -h/2 - overhang);
                ctx.lineTo(w/2 + overhang, -h/2 - overhang + 10);
                ctx.lineTo(w/2 + overhang, h/2 + overhang);
                ctx.lineTo(-w/2 - overhang, h/2 + overhang - 5);
                ctx.closePath();
                ctx.fill();
                break;
        }

        // Thatched texture
        if (this.roofStyle === 'thatched') {
            this._initSeed(this.seed + 77777);
            ctx.strokeStyle = this._adjustColor(this.roofColor, 0.85);
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 30; i++) {
                const x = -w/2 + this._seededRandom() * w;
                const y = -h/2 + this._seededRandom() * h;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 5 + this._seededRandom() * 5, y + 2);
                ctx.stroke();
            }
        }
    }

    _drawRoofTiles(ctx) {
        ctx.fillStyle = this.roofColorSecondary;
        
        for (const tile of this._roofTiles) {
            ctx.globalAlpha = tile.shade;
            ctx.fillRect(tile.x, tile.y, tile.width - 1, tile.height - 1);
        }
        ctx.globalAlpha = 1;
    }

    _drawRoofRidge(ctx, w, h) {
        ctx.strokeStyle = this.roofRidgeColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        if (this.roofStyle === 'slanted') {
            ctx.beginPath();
            ctx.moveTo(-w/2 - this.roofOverhang, -h/2 - this.roofOverhang);
            ctx.lineTo(w/2 + this.roofOverhang, -h/2 - this.roofOverhang + 10);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(-w/2 - this.roofOverhang, 0);
            ctx.lineTo(w/2 + this.roofOverhang, 0);
            ctx.stroke();
        }
    }

    _drawEntrance(ctx, w, h) {
        ctx.fillStyle = this.entranceColor;
        
        let x, y, ew, eh;
        
        switch (this.entranceSide) {
            case 'north':
                x = -this.entranceWidth / 2;
                y = -h/2 - this.roofOverhang - this.entranceDepth;
                ew = this.entranceWidth;
                eh = this.entranceDepth;
                break;
            case 'south':
                x = -this.entranceWidth / 2;
                y = h/2 + this.roofOverhang;
                ew = this.entranceWidth;
                eh = this.entranceDepth;
                break;
            case 'east':
                x = w/2 + this.roofOverhang;
                y = -this.entranceWidth / 2;
                ew = this.entranceDepth;
                eh = this.entranceWidth;
                break;
            case 'west':
                x = -w/2 - this.roofOverhang - this.entranceDepth;
                y = -this.entranceWidth / 2;
                ew = this.entranceDepth;
                eh = this.entranceWidth;
                break;
        }

        // Canopy/awning
        ctx.fillRect(x, y, ew, eh);
        
        // Door indication (darker area)
        ctx.fillStyle = this._adjustColor(this.entranceColor, 0.7);
        ctx.fillRect(x + ew * 0.2, y + eh * 0.2, ew * 0.6, eh * 0.6);

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(x, y, ew, eh);
        }
    }

    _drawSkylights(ctx) {
        for (const skylight of this._skylights) {
            ctx.save();
            ctx.translate(skylight.x, skylight.y);
            ctx.rotate(skylight.rotation);

            // Glow effect
            if (this.skylightGlow) {
                ctx.shadowColor = this.skylightColor;
                ctx.shadowBlur = 8;
            }

            // Skylight frame
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(-skylight.size - 1, -skylight.size - 1, 
                        skylight.size * 2 + 2, skylight.size * 2 + 2);

            // Glass
            ctx.fillStyle = this.skylightColor;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(-skylight.size, -skylight.size, 
                        skylight.size * 2, skylight.size * 2);

            // Cross frame
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(-0.5, -skylight.size, 1, skylight.size * 2);
            ctx.fillRect(-skylight.size, -0.5, skylight.size * 2, 1);

            ctx.restore();
        }
    }

    _drawChimneys(ctx, deltaTime) {
        for (const chimney of this._chimneys) {
            ctx.save();
            ctx.translate(chimney.x, chimney.y);
    
            // 1. Chimney body
            ctx.fillStyle = this.chimneyColor;
            ctx.fillRect(-chimney.size / 2, -chimney.size / 2, chimney.size, chimney.size);
    
            // 2. Chimney top rim
            ctx.fillStyle = this._adjustColor(this.chimneyColor, 0.8);
            ctx.fillRect(-chimney.size / 2 - 1, -chimney.size / 2 - 2, chimney.size + 2, 3);
    
            // 3. Inner dark (chimney opening)
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(-chimney.size / 2 + 2, -chimney.size / 2 + 2, chimney.size - 4, chimney.size - 4);
    
            // 5. Outline
            if (this.showOutline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(-chimney.size / 2, -chimney.size / 2, chimney.size, chimney.size);
            }
    
            // 4. Draw Smoke & Sparks
            if (this.chimneySmoke) {
                const smokeRgb = this._hexToRgb(this.chimneySmokeColor);
                const sr = smokeRgb.r, sg = smokeRgb.g, sb = smokeRgb.b;

                for (const smoke of chimney.smokeParticles) {
                    const gradient = ctx.createRadialGradient(
                        smoke.x, smoke.y - chimney.size / 2, 0,
                        smoke.x, smoke.y - chimney.size / 2, Math.max(0.1, smoke.size)
                    );
                    gradient.addColorStop(0, `rgba(${sr},${sg},${sb},${Math.max(0, smoke.opacity)})`);
                    gradient.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.globalAlpha = 1;
                    ctx.beginPath();
                    ctx.arc(smoke.x, smoke.y - chimney.size / 2, Math.max(0.1, smoke.size), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            
                for (const spark of chimney.sparkParticles) {
                    ctx.globalAlpha = Math.max(0, spark.opacity);
                    const zigzag = Math.sin(spark.y * 0.2) * 2;
                    ctx.fillStyle = '#ffcc00';
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = '#ff6600';
                    ctx.fillRect(spark.x + zigzag, spark.y - chimney.size / 2, 2, 2);
                    ctx.shadowBlur = 0;
                }
                ctx.globalAlpha = 1;
            }
    
            ctx.restore();
        }
    }

    _drawCity(ctx) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;
        const edgeThickness = 4; // the concrete parapet edge thickness
    
        // ── PARAPET EDGE (concrete rim seen from top) ────────────────────────
        // Outer edge - darker concrete
        ctx.fillStyle = this._adjustColor(this.cityFloorColor, 0.75);
        ctx.fillRect(-w / 2 - overhang, -h / 2 - overhang,
            w + overhang * 2, h + overhang * 2);
    
        // Inner roof surface
        ctx.fillStyle = this.cityWindowColor;
        ctx.fillRect(
            -w / 2 - overhang + edgeThickness,
            -h / 2 - overhang + edgeThickness,
            w + overhang * 2 - edgeThickness * 2,
            h + overhang * 2 - edgeThickness * 2
        );
    
        // Parapet inner shadow line (gives the rim depth)
        ctx.strokeStyle = this._adjustColor(this.cityFloorColor, 0.5);
        ctx.lineWidth = 2;
        ctx.strokeRect(
            -w / 2 - overhang + edgeThickness,
            -h / 2 - overhang + edgeThickness,
            w + overhang * 2 - edgeThickness * 2,
            h + overhang * 2 - edgeThickness * 2
        );
    
        // Subtle roof surface texture lines (tar paper seams)
        ctx.strokeStyle = this._adjustColor(this.cityFloorColor, 0.88);
        ctx.lineWidth = 1;
        const innerX = -w / 2 - overhang + edgeThickness;
        const innerY = -h / 2 - overhang + edgeThickness;
        const innerW = w + overhang * 2 - edgeThickness * 2;
        const innerH = h + overhang * 2 - edgeThickness * 2;
        const seamSpacing = 18;
        for (let y = innerY + seamSpacing; y < innerY + innerH; y += seamSpacing) {
            ctx.beginPath();
            ctx.moveTo(innerX, y);
            ctx.lineTo(innerX + innerW, y);
            ctx.stroke();
        }
    
        // ── AC UNITS (top-down boxes with shadows) ───────────────────────────
        if (this.cityACUnits) {
            this._initSeed(this.seed + 9999);
            const acCount = 1 + Math.floor(this._seededRandom() * 4);
            const placedAC = [];
        
            for (let i = 0; i < acCount; i++) {
                const acW = 10 + this._seededRandom() * 6;
                const acH = 7 + this._seededRandom() * 4;
                const minDist = Math.max(acW, acH) * 1.8;
        
                const pos = this._findNonOverlappingPosition(
                    placedAC, minDist,
                    innerX + 8, innerY + 8,
                    innerW - 16, innerH - 16
                );
                placedAC.push(pos);

                const ax = pos.x, ay = pos.y;
    
                // Drop shadow
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(ax - acW / 2 + 2, ay - acH / 2 + 2, acW, acH);
    
                // Unit body
                ctx.fillStyle = '#b8bec6';
                ctx.fillRect(ax - acW / 2, ay - acH / 2, acW, acH);
    
                // Top highlight (light catching the top face)
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(ax - acW / 2, ay - acH / 2, acW, acH * 0.35);
    
                // Vent lines across the unit
                ctx.strokeStyle = '#8a9098';
                ctx.lineWidth = 0.75;
                const ventCount = 3;
                for (let v = 1; v <= ventCount; v++) {
                    const vx = ax - acW / 2 + (acW / (ventCount + 1)) * v;
                    ctx.beginPath();
                    ctx.moveTo(vx, ay - acH / 2 + 1);
                    ctx.lineTo(vx, ay + acH / 2 - 1);
                    ctx.stroke();
                }
    
                // Outline
                ctx.strokeStyle = '#6a7078';
                ctx.lineWidth = 0.75;
                ctx.strokeRect(ax - acW / 2, ay - acH / 2, acW, acH);
            }
        }
    
        // ── ROOFTOP DETAILS ───────────────────────────────────────────────────
        if (this.cityRooftopDetails) {
            // Stairwell/elevator shaft box (top-down: just a darker rectangle)
            const shaftX = innerX + innerW * 0.6;
            const shaftY = innerY + innerH * 0.15;
            const shaftW = 18;
            const shaftH = 14;
    
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(shaftX + 2, shaftY + 2, shaftW, shaftH);
    
            // Box
            ctx.fillStyle = this._adjustColor(this.roofColor, 0.75);
            ctx.fillRect(shaftX, shaftY, shaftW, shaftH);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(shaftX, shaftY, shaftW, shaftH * 0.3);
            ctx.strokeStyle = this._adjustColor(this.roofColor, 0.55);
            ctx.lineWidth = 1;
            ctx.strokeRect(shaftX, shaftY, shaftW, shaftH);
    
            // Water tower (top-down: circle with shadow)
            const wtX = innerX + innerW * 0.2;
            const wtY = innerY + innerH * 0.65;
            const wtR = 7;
    
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(wtX + 2, wtY + 2, wtR, wtR * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.fillStyle = this._adjustColor(this.cityFloorColor, 0.8);
            ctx.beginPath();
            ctx.arc(wtX, wtY, wtR, 0, Math.PI * 2);
            ctx.fill();
    
            // Highlight on water tower
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.arc(wtX - wtR * 0.3, wtY - wtR * 0.3, wtR * 0.45, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.strokeStyle = this._adjustColor(this.cityFloorColor, 0.6);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(wtX, wtY, wtR, 0, Math.PI * 2);
            ctx.stroke();
    
            // Antenna (top-down: just a small dot with a cross)
            const antX = innerX + innerW * 0.75;
            const antY = innerY + innerH * 0.72;
            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.arc(antX, antY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#777777';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(antX - 5, antY);
            ctx.lineTo(antX + 5, antY);
            ctx.moveTo(antX, antY - 5);
            ctx.lineTo(antX, antY + 5);
            ctx.stroke();
        }
    
        // ── FLASHING RED AVIATION LIGHT ───────────────────────────────────────
        if (this.cityRedLight) {
            const t = this._redLightTime || 0;
            // Pulse: on for 0.2s, off for 1.3s
            const cycle = t % 1.5;
            const on = cycle < 0.2;
            const pulseAlpha = on ? 0.9 : (cycle < 0.5 ? (0.5 - cycle) / 0.3 * 0.4 : 0);
    
            if (pulseAlpha > 0) {
                const lx = 0;
                const ly = -h / 2 - overhang + edgeThickness + 6;
    
                // Glow shadow on roof surface
                ctx.save();
                const glowR = 18 + pulseAlpha * 10;
                const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowR);
                glow.addColorStop(0, `rgba(255,40,40,${pulseAlpha * 0.6})`);
                glow.addColorStop(1, 'rgba(255,40,40,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(lx, ly, glowR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
    
                // Light housing (small dark circle)
                ctx.fillStyle = '#333333';
                ctx.beginPath();
                ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
                ctx.fill();
    
                // Light lens
                ctx.fillStyle = this.cityRedLightColor;
                ctx.globalAlpha = pulseAlpha;
                ctx.beginPath();
                ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                // Dormant light housing
                const lx = 0;
                const ly = -h / 2 - overhang + edgeThickness + 6;
                ctx.fillStyle = '#333333';
                ctx.beginPath();
                ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = this._adjustColor(this.cityRedLightColor, 0.3);
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    
        // ── WEATHERING / MOSS ─────────────────────────────────────────────────
        this._drawSurfaceDetails(ctx, w, h);
    
        // ── OUTLINE ───────────────────────────────────────────────────────────
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w / 2 - overhang, -h / 2 - overhang,
                w + overhang * 2, h + overhang * 2);
        }
    }

    // ─── CASTLE ─────────────────────────────────────────────────────────────
    _drawCastle(ctx) {
        const w = this.width;
        const h = this.height;

        // Main castle body
        ctx.fillStyle = this.wallColor;
        ctx.fillRect(-w/2, -h/2, w, h);

        // Inner courtyard
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.7);
        ctx.fillRect(-w/2 + 15, -h/2 + 15, w - 30, h - 30);

        // Corner tower centers — positioned exactly on the castle corners
        const tr = this.castleTowerSize / 2;
        const towerCenters = [
            { x: -w/2, y: -h/2 },   // top-left corner
            { x:  w/2, y: -h/2 },   // top-right corner
            { x: -w/2, y:  h/2 },   // bottom-left corner
            { x:  w/2, y:  h/2 },   // bottom-right corner
        ];

        if (this.castleTowers) {
            for (let i = 0; i < Math.min(this.castleTowerCount, towerCenters.length); i++) {
                const { x: cx, y: cy } = towerCenters[i];

                // Tower base
                ctx.fillStyle = this.wallColor;
                ctx.beginPath();
                ctx.arc(cx, cy, tr, 0, Math.PI * 2);
                ctx.fill();

                // Tower top (lighter inner disc)
                ctx.fillStyle = this._adjustColor(this.wallColor, 1.15);
                ctx.beginPath();
                ctx.arc(cx, cy, tr - 3, 0, Math.PI * 2);
                ctx.fill();

                // Battlements on tower
                this._drawBattlements(ctx, cx, cy, tr, 6);
            }
        }

        // Wall battlements
        this._drawWallBattlements(ctx, w, h);

        // Clipped surface details
        this._drawSurfaceDetails(ctx, w, h);

        // Entrance
        if (this.entranceVisible) {
            this._drawCastleGate(ctx, w, h);
        }

        // Animated flag — sits on top of the first (top-left) tower center
        if (this.castleFlag && this.castleTowers) {
            const { x: fcx, y: fcy } = towerCenters[0];
            this._drawAnimatedFlag(ctx, fcx, fcy);
        }

        // Outline
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w/2, -h/2, w, h);
        }
    }

    _drawAnimatedFlag(ctx, px, py) {
        ctx.save();
        // Translate to the tower centre; the pole rises straight up from there
        ctx.translate(px, py);

        const poleH = 18;

        // Pole — from tower centre upward
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -poleH);
        ctx.stroke();

        // Animated wavy flag using sine curve
        const t = this._flagTime || 0;
        const flagW = 16;
        const flagH = 9;
        const segments = 8;

        ctx.fillStyle = this.flagColor;
        ctx.beginPath();
        ctx.moveTo(0, -poleH);

        // Top edge (wavy)
        for (let i = 0; i <= segments; i++) {
            const fx = (i / segments) * flagW;
            const wave = Math.sin(t * 3 + i * 0.8) * 2 * (i / segments);
            ctx.lineTo(fx, -poleH + wave);
        }

        // Bottom edge (wavy, offset phase)
        for (let i = segments; i >= 0; i--) {
            const fx = (i / segments) * flagW;
            const wave = Math.sin(t * 3 + i * 0.8 + 0.5) * 2 * (i / segments);
            ctx.lineTo(fx, -poleH + flagH + wave);
        }

        ctx.closePath();
        ctx.fill();

        // Flag outline
        ctx.strokeStyle = this._adjustColor(this.flagColor, 0.7);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
    }

    _drawWallBattlements(ctx, w, h) {
        ctx.fillStyle = this.wallColor;
        const size = 5;
        const gap = 8;

        // Top wall
        for (let x = -w/2 + 10; x < w/2 - 10; x += gap) {
            ctx.fillRect(x, -h/2 - size, size, size);
        }
        // Bottom wall
        for (let x = -w/2 + 10; x < w/2 - 10; x += gap) {
            ctx.fillRect(x, h/2, size, size);
        }
        // Left wall
        for (let y = -h/2 + 10; y < h/2 - 10; y += gap) {
            ctx.fillRect(-w/2 - size, y, size, size);
        }
        // Right wall
        for (let y = -h/2 + 10; y < h/2 - 10; y += gap) {
            ctx.fillRect(w/2, y, size, size);
        }
    }

    _drawBattlements(ctx, cx, cy, radius, count) {
        ctx.fillStyle = this.wallColor;
        const size = 4;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = cx + Math.cos(angle) * (radius + size/2) - size/2;
            const y = cy + Math.sin(angle) * (radius + size/2) - size/2;
            ctx.fillRect(x, y, size, size);
        }
    }

    _drawCastleGate(ctx, w, h) {
        const gateW = 25;
        const gateH = 15;
        
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.9);
        ctx.fillRect(-gateW/2, h/2 - 5, gateW, gateH + 5);

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-gateW/2 + 3, h/2 - 2, gateW - 6, gateH);

        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 2;
        for (let x = -gateW/2 + 6; x < gateW/2 - 3; x += 4) {
            ctx.beginPath();
            ctx.moveTo(x, h/2);
            ctx.lineTo(x, h/2 + gateH - 3);
            ctx.stroke();
        }
    }

    // ─── TOWER ──────────────────────────────────────────────────────────────
    _drawTower(ctx) {
        const r = Math.min(this.width, this.height) / 2;

        // Tower base
        ctx.fillStyle = this.wallColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner tower (roof)
        const gradient = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
        gradient.addColorStop(0, this.roofHighlight);
        gradient.addColorStop(0.5, this.roofColor);
        gradient.addColorStop(1, this.roofColorSecondary);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
        ctx.fill();

        if (this.towerBattlements) {
            this._drawBattlements(ctx, 0, 0, r, this.battlementCount);
        }

        // Center spire
        ctx.fillStyle = this.roofRidgeColor;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

        this._drawSurfaceDetails(ctx, this.width, this.height);

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ─── TEMPLE ─────────────────────────────────────────────────────────────
    _drawTemple(ctx) {
        const w = this.width;
        const h = this.height;

        // Temple platform/steps
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.85);
        ctx.fillRect(-w/2 - 12, -h/2 - 12, w + 24, h + 24);

        ctx.fillStyle = this._adjustColor(this.wallColor, 0.92);
        ctx.fillRect(-w/2 - 6, -h/2 - 6, w + 12, h + 12);

        // Main temple body
        ctx.fillStyle = this.wallColor;
        ctx.fillRect(-w/2, -h/2, w, h);

        // Inner sanctum
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.88);
        ctx.fillRect(-w/2 + 10, -h/2 + 10, w - 20, h - 20);

        // Roof/dome drawn on top
        ctx.save();
        ctx.beginPath();
        ctx.rect(-w/2, -h/2, w, h);
        ctx.clip();
        this._drawRoof(ctx, w * 0.85, h * 0.85, 0);
        ctx.restore();

        // Temple glow
        if (this.templeGlow) {
            ctx.save();
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35);
            glowGradient.addColorStop(0, this.templeGlowColor);
            glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Columns around perimeter
        if (this.templeColumns) {
            const colRadius = 4;
            const halfCols = Math.floor(this.columnCount / 2);
            const colSpacingX = (w - 20) / (halfCols + 1);
            const colSpacingY = (h - 20) / (halfCols + 1);

            // Top and bottom columns
            for (let i = 1; i <= halfCols; i++) {
                const cx = -w/2 + 10 + i * colSpacingX;
                // Top
                this._drawColumn(ctx, cx, -h/2 - 6, colRadius);
                // Bottom
                this._drawColumn(ctx, cx, h/2 + 6, colRadius);
            }
            // Left and right columns (corners excluded)
            for (let i = 1; i <= Math.max(1, Math.floor(this.columnCount / 4)); i++) {
                const cy = -h/2 + 10 + i * colSpacingY;
                // Left
                this._drawColumn(ctx, -w/2 - 6, cy, colRadius);
                // Right
                this._drawColumn(ctx, w/2 + 6, cy, colRadius);
            }
        }

        this._drawSurfaceDetails(ctx, w, h);

        // Outline
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w/2, -h/2, w, h);
        }
    }

    _drawColumn(ctx, x, y, r) {
        // Column base shadow
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.75);
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, r + 1, 0, Math.PI * 2);
        ctx.fill();

        // Column body
        ctx.fillStyle = this._adjustColor(this.wallColor, 1.2);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Column highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (this.showOutline) {
            ctx.strokeStyle = this._adjustColor(this.outlineColor, 1.5);
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ─── RUINS ──────────────────────────────────────────────────────────────
    _drawRuins(ctx) {
        const w = this.width;
        const h = this.height;
        const decay = this.ruinsDecay;

        ctx.fillStyle = this.wallColor;
        
        this._initSeed(this.seed + 1000);
        
        const segments = 8;
        ctx.beginPath();
        ctx.moveTo(-w/2, -h/2);
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = -w/2 + t * w;
            const breakage = this._seededRandom() * h * decay * 0.3;
            ctx.lineTo(x, -h/2 + breakage);
        }
        
        ctx.lineTo(w/2, h/2 - this._seededRandom() * h * decay * 0.2);
        
        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const x = -w/2 + t * w;
            const breakage = this._seededRandom() * h * decay * 0.3;
            ctx.lineTo(x, h/2 - breakage);
        }
        
        ctx.closePath();
        ctx.fill();

        // Remaining wall sections
        ctx.fillStyle = this._adjustColor(this.wallColor, 0.85);
        for (let i = 0; i < 3; i++) {
            if (this._seededRandom() > decay) {
                const x = -w/2 + this._seededRandom() * w * 0.8;
                const y = -h/2 + this._seededRandom() * h * 0.8;
                const wallW = 10 + this._seededRandom() * 20;
                const wallH = 5 + this._seededRandom() * 10;
                ctx.fillRect(x, y, wallW, wallH);
            }
        }

        // Debris
        if (this.ruinsDebris) {
            for (const debris of this._debris) {
                ctx.save();
                ctx.translate(debris.x, debris.y);
                ctx.rotate(debris.rotation);
                
                if (debris.type === 'stone') {
                    ctx.fillStyle = this._adjustColor(this.wallColor, 0.7);
                    ctx.beginPath();
                    ctx.arc(0, 0, debris.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#6a5040';
                    ctx.fillRect(-debris.size, -debris.size/3, debris.size * 2, debris.size/1.5);
                }
                
                ctx.restore();
            }
        }

        // Surface details (clipped)
        this._drawSurfaceDetails(ctx, w, h);

        // Outline
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.stroke();
        }
    }

    // ─── FORGE ──────────────────────────────────────────────────────────────
    _drawForge(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;

        if (this.wallVisible) this._drawWalls(ctx, w, h);

        this._drawRoof(ctx, w, h, overhang);

        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._drawRoofTiles(ctx);
        }
        if (this.roofRidgeVisible) this._drawRoofRidge(ctx, w, h);

        // Forge pit (central glow area)
        if (this.forgeGlow) {
            const glowGrad = ctx.createRadialGradient(0, 5, 0, 0, 5, w * 0.3);
            glowGrad.addColorStop(0, this.forgeGlowColor);
            glowGrad.addColorStop(0.4, this._adjustColor(this.forgeGlowColor, 0.6));
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.ellipse(0, 5, w * 0.22, h * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Forge opening (dark pit)
            ctx.fillStyle = '#1a0a00';
            ctx.beginPath();
            ctx.ellipse(0, 5, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ember glow rim
            ctx.strokeStyle = this.forgeGlowColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 5, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Anvil silhouette
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-8, h * 0.1, 16, 8);
        ctx.fillRect(-5, h * 0.1 - 4, 10, 5);

        this._drawSurfaceDetails(ctx, w, h);
        if (this.entranceVisible) this._drawEntrance(ctx, w, h);
        if (this.chimneyEnabled) this._drawChimneys(ctx, deltaTime);

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w/2 - overhang, -h/2 - overhang, w + overhang * 2, h + overhang * 2);
        }
    }

    // ─── LIGHTHOUSE ─────────────────────────────────────────────────────────
    _drawLighthouse(ctx) {
        const r = Math.min(this.width, this.height) / 2;

        // Base
        ctx.fillStyle = this.wallColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Red/white stripe pattern
        const stripeCount = 5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
        ctx.clip();
        for (let i = 0; i < stripeCount; i++) {
            const y = -r + (i / stripeCount) * r * 2;
            ctx.fillStyle = i % 2 === 0 ? this.roofColor : this.wallColor;
            ctx.fillRect(-r, y, r * 2, r * 2 / stripeCount);
        }
        ctx.restore();

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        this._drawSurfaceDetails(ctx, this.width, this.height);

        // Rotating light beam
        if (this.lighthouseBeam) {
            const angle = this._lighthouseAngle || 0;
            ctx.save();
            ctx.rotate(angle);

            // Fallback: draw two triangular beams
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = this.lighthouseBeamColor;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r * 4, -r * 1.5);
            ctx.lineTo(r * 4, r * 1.5);
            ctx.closePath();
            ctx.fill();

            ctx.rotate(Math.PI);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r * 4, -r * 1.5);
            ctx.lineTo(r * 4, r * 1.5);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Lamp room (top circle)
        ctx.fillStyle = this.roofColor;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Lamp glow
        ctx.save();
        const lampGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.35);
        lampGrad.addColorStop(0, this.lighthouseBeamColor);
        lampGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = lampGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ─── WINDMILL ───────────────────────────────────────────────────────────
    _drawWindmill(ctx) {
        const r = Math.min(this.width, this.height) / 2;

        // Round stone base
        ctx.fillStyle = this.wallColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Stone ring detail
        ctx.strokeStyle = this._adjustColor(this.wallColor, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
        ctx.stroke();

        // Conical roof top
        const roofGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.6);
        roofGrad.addColorStop(0, this.roofHighlight);
        roofGrad.addColorStop(1, this.roofColorSecondary);
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        
        this._drawSurfaceDetails(ctx, this.width, this.height);

        // ── TOP-DOWN WINDMILL BLADES ──────────────────────────────────────
        // Each blade is rendered as a foreshortened ellipse to give the
        // impression of a flat horizontal sail viewed from directly above.
        // The blade rotates around the hub; as the angle changes the blade
        // appears to shorten (foreshortening via the Y-scale of the ellipse)
        // just like a real propeller seen from above.
        ctx.save();
        ctx.rotate(this._windmillAngle || 0);

        const bladeCount = this.windmillBlades;
        const bladeLength = r * 1.05;   // how far blade extends from hub
        const bladeW = r * 0.18;         // half-width of blade at its widest
        const hubR = 5;

        for (let i = 0; i < bladeCount; i++) {
            const bladeAngle = (i / bladeCount) * Math.PI * 2;

            ctx.save();
            ctx.rotate(bladeAngle);

            // The blade points "upward" (negative Y) in local space.
            // We draw it as a tapered ellipse-like shape.
            // To fake top-down foreshortening we squash the blade on the
            // axis perpendicular to its length using cos of the blade angle.
            // When the blade is pointing left/right (cos≈0) it looks thin;
            // when pointing up/down (cos≈±1) it looks wide.
            const depthScale = Math.abs(Math.cos(bladeAngle)) * 0.55 + 0.1;

            // Shadow / dark underside (offset slightly)
            ctx.fillStyle = this._adjustColor(this.windmillBladeColor, 0.55);
            ctx.beginPath();
            ctx.save();
            ctx.scale(depthScale, 1);
            ctx.ellipse(
                bladeW * 0.15 / depthScale,   // slight offset for 3-D look
                -(hubR + bladeLength * 0.5),
                bladeW,
                bladeLength * 0.52,
                0, 0, Math.PI * 2
            );
            ctx.restore();
            ctx.fill();

            // Main blade face
            const faceGrad = ctx.createLinearGradient(0, -hubR, 0, -(hubR + bladeLength));
            faceGrad.addColorStop(0, this._adjustColor(this.windmillBladeColor, 1.15));
            faceGrad.addColorStop(0.5, this.windmillBladeColor);
            faceGrad.addColorStop(1, this._adjustColor(this.windmillBladeColor, 0.75));
            ctx.fillStyle = faceGrad;
            ctx.beginPath();
            ctx.save();
            ctx.scale(depthScale, 1);
            ctx.ellipse(
                0,
                -(hubR + bladeLength * 0.5),
                bladeW,
                bladeLength * 0.5,
                0, 0, Math.PI * 2
            );
            ctx.restore();
            ctx.fill();

            // Blade edge outline
            ctx.strokeStyle = this._adjustColor(this.windmillBladeColor, 0.6);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.save();
            ctx.scale(depthScale, 1);
            ctx.ellipse(
                0,
                -(hubR + bladeLength * 0.5),
                bladeW,
                bladeLength * 0.5,
                0, 0, Math.PI * 2
            );
            ctx.restore();
            ctx.stroke();

            // Centre spine line along blade
            ctx.strokeStyle = this._adjustColor(this.windmillBladeColor, 0.55);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -hubR);
            ctx.lineTo(0, -(hubR + bladeLength));
            ctx.stroke();

            ctx.restore(); // blade angle
        }

        // Hub cap
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.arc(0, 0, hubR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, hubR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore(); // windmill rotation

    }

    // ─── MANOR ──────────────────────────────────────────────────────────────
    _drawManor(ctx, deltaTime) {
        const w = this.width;
        const h = this.height;
        const overhang = this.roofOverhang;
        const ws = this.manorWingSize;

        // Side wings (drawn behind main body)
        if (this.manorWings) {
            const wingH = h / 2;
            const wingY = -wingH / 2;

            // Left wing
            ctx.fillStyle = this._adjustColor(this.wallColor, 0.95);
            ctx.fillRect(-w/2 - ws, wingY, ws, wingH);
            const lwGrad = ctx.createLinearGradient(-w/2 - ws, wingY, -w/2, wingY + wingH);
            lwGrad.addColorStop(0, this.roofHighlight);
            lwGrad.addColorStop(1, this.roofColorSecondary);
            ctx.fillStyle = lwGrad;
            ctx.fillRect(-w/2 - ws - overhang, wingY - overhang, ws + overhang * 2, wingH + overhang * 2);

            // Right wing
            ctx.fillStyle = this._adjustColor(this.wallColor, 0.95);
            ctx.fillRect(w/2, wingY, ws, wingH);
            const rwGrad = ctx.createLinearGradient(w/2, wingY, w/2 + ws, wingY + wingH);
            rwGrad.addColorStop(0, this.roofHighlight);
            rwGrad.addColorStop(1, this.roofColorSecondary);
            ctx.fillStyle = rwGrad;
            ctx.fillRect(w/2 - overhang, wingY - overhang, ws + overhang * 2, wingH + overhang * 2);

            // Wing ridge lines
            if (this.roofRidgeVisible) {
                ctx.strokeStyle = this.roofRidgeColor;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-w/2 - ws - overhang, wingY + wingH / 2);
                ctx.lineTo(-w/2 + overhang, wingY + wingH / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(w/2 - overhang, wingY + wingH / 2);
                ctx.lineTo(w/2 + ws + overhang, wingY + wingH / 2);
                ctx.stroke();
            }

            // Wing outlines
            if (this.showOutline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.strokeRect(-w/2 - ws - overhang, wingY - overhang, ws + overhang * 2, wingH + overhang * 2);
                ctx.strokeRect(w/2 - overhang, wingY - overhang, ws + overhang * 2, wingH + overhang * 2);
            }
        }

        // Main body walls
        if (this.wallVisible) this._drawWalls(ctx, w, h);

        // Main body roof
        this._drawRoof(ctx, w, h, overhang);

        if (this.showRoofTiles && this.roofStyle !== 'flat' && this.roofStyle !== 'domed') {
            this._drawRoofTiles(ctx);
        }
        if (this.roofRidgeVisible && (this.roofStyle === 'peaked' || this.roofStyle === 'slanted')) {
            this._drawRoofRidge(ctx, w, h);
        }

        // Central decorative gable dormer
        ctx.fillStyle = this._adjustColor(this.roofColor, 1.1);
        ctx.beginPath();
        ctx.moveTo(-10, -h/2 - overhang - 2);
        ctx.lineTo(0, -h/2 - overhang - 14);
        ctx.lineTo(10, -h/2 - overhang - 2);
        ctx.closePath();
        ctx.fill();
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        this._drawSurfaceDetails(ctx, w + (this.manorWings ? ws * 2 : 0), h);

        if (this.entranceVisible) this._drawEntrance(ctx, w, h);
        if (this.skylightEnabled) this._drawSkylights(ctx);
        if (this.chimneyEnabled) this._drawChimneys(ctx, deltaTime);

        // Main body outline
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeRect(-w/2 - overhang, -h/2 - overhang, w + overhang * 2, h + overhang * 2);
        }
    }

    _adjustColor(hex, factor) {
        const rgb = this._hexToRgb(hex);
        const r = Math.min(255, Math.round(rgb.r * factor));
        const g = Math.min(255, Math.round(rgb.g * factor));
        const b = Math.min(255, Math.round(rgb.b * factor));
        return `rgb(${r}, ${g}, ${b})`;
    }

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COLLIDER API METHODS
    // ═══════════════════════════════════════════════════════════════════════

    getPolygonCollider(worldSpace = false) {
        const hw = this.width / 2 + this.roofOverhang;
        const hh = this.height / 2 + this.roofOverhang;
        
        let vertices = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];

        let center = { x: 0, y: 0 };

        if (worldSpace && this.gameObject) {
            const go = this.gameObject;
            const goRad = (go.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(goRad);
            const sin = Math.sin(goRad);
            const scaleX = go.scale?.x || 1;
            const scaleY = go.scale?.y || 1;

            vertices = vertices.map(v => ({
                x: go.x + (v.x * scaleX * cos - v.y * scaleY * sin),
                y: go.y + (v.x * scaleX * sin + v.y * scaleY * cos)
            }));
            center = { x: go.x, y: go.y };
        }

        return { vertices, center, pointCount: vertices.length };
    }

    getBoxCollider(options = {}) {
        const { angleBased = true, worldSpace = false, includeOverhang = true } = options;

        const overhang = includeOverhang ? this.roofOverhang : 0;
        const width = this.width + overhang * 2;
        const height = this.height + overhang * 2;

        const hw = width / 2;
        const hh = height / 2;
        let vertices = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];

        let result = {
            x: 0,
            y: 0,
            width,
            height,
            angle: 0,
            vertices
        };

        if (worldSpace && this.gameObject) {
            const go = this.gameObject;
            const goRad = (go.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(goRad);
            const sin = Math.sin(goRad);
            const scaleX = go.scale?.x || 1;
            const scaleY = go.scale?.y || 1;

            result.x = go.x;
            result.y = go.y;
            result.width *= scaleX;
            result.height *= scaleY;
            result.angle = angleBased ? (go.rotation || 0) : 0;
            
            if (angleBased) {
                result.vertices = vertices.map(v => ({
                    x: go.x + (v.x * scaleX * cos - v.y * scaleY * sin),
                    y: go.y + (v.x * scaleX * sin + v.y * scaleY * cos)
                }));
            } else {
                result.vertices = vertices.map(v => ({
                    x: go.x + v.x * scaleX,
                    y: go.y + v.y * scaleY
                }));
            }
        }

        return result;
    }

    getCircleCollider(worldSpace = false) {
        const hw = this.width / 2 + this.roofOverhang;
        const hh = this.height / 2 + this.roofOverhang;
        const radius = Math.sqrt(hw * hw + hh * hh);
        
        let result = { x: 0, y: 0, radius };

        if (worldSpace && this.gameObject) {
            const go = this.gameObject;
            const avgScale = ((go.scale?.x || 1) + (go.scale?.y || 1)) / 2;
            result.x = go.x;
            result.y = go.y;
            result.radius *= avgScale;
        }

        return result;
    }

    toJSON() {
        const json = super.toJSON();
        json.type = 'ProceduralBuilding';
        json.seed = this.seed;
        json.randomizeSeed = this.randomizeSeed;
        json.buildingStyle = this.buildingStyle;
        json.width = this.width;
        json.height = this.height;
        json.sizeVariation = this.sizeVariation;
        json.roofStyle = this.roofStyle;
        json.roofColor = this.roofColor;
        json.roofColorSecondary = this.roofColorSecondary;
        json.roofHighlight = this.roofHighlight;
        json.roofRidgeVisible = this.roofRidgeVisible;
        json.roofRidgeColor = this.roofRidgeColor;
        json.roofOverhang = this.roofOverhang;
        json.wallVisible = this.wallVisible;
        json.wallHeight = this.wallHeight;
        json.wallColor = this.wallColor;
        json.wallColorDark = this.wallColorDark;
        json.wallStyle = this.wallStyle;
        json.chimneyEnabled = this.chimneyEnabled;
        json.chimneyCount = this.chimneyCount;
        json.chimneySize = this.chimneySize;
        json.chimneyColor = this.chimneyColor;
        json.chimneySmoke = this.chimneySmoke;
        json.chimneySmokeColor = this.chimneySmokeColor;
        json.skylightEnabled = this.skylightEnabled;
        json.skylightCount = this.skylightCount;
        json.skylightSize = this.skylightSize;
        json.skylightColor = this.skylightColor;
        json.skylightGlow = this.skylightGlow;
        json.entranceVisible = this.entranceVisible;
        json.entranceWidth = this.entranceWidth;
        json.entranceDepth = this.entranceDepth;
        json.entranceSide = this.entranceSide;
        json.entranceColor = this.entranceColor;
        json.showWeathering = this.showWeathering;
        json.weatheringIntensity = this.weatheringIntensity;
        json.showMoss = this.showMoss;
        json.mossAmount = this.mossAmount;
        json.mossColor = this.mossColor;
        json.showRoofTiles = this.showRoofTiles;
        json.tileRows = this.tileRows;
        json.towerBattlements = this.towerBattlements;
        json.battlementCount = this.battlementCount;
        json.battlementSize = this.battlementSize;
        json.castleTowers = this.castleTowers;
        json.castleTowerCount = this.castleTowerCount;
        json.castleTowerSize = this.castleTowerSize;
        json.castleFlag = this.castleFlag;
        json.flagColor = this.flagColor;
        json.templeColumns = this.templeColumns;
        json.columnCount = this.columnCount;
        json.templeGlow = this.templeGlow;
        json.templeGlowColor = this.templeGlowColor;
        json.ruinsDecay = this.ruinsDecay;
        json.ruinsDebris = this.ruinsDebris;
        json.forgeGlow = this.forgeGlow;
        json.forgeGlowColor = this.forgeGlowColor;
        json.lighthouseBeam = this.lighthouseBeam;
        json.lighthouseBeamColor = this.lighthouseBeamColor;
        json.windmillBlades = this.windmillBlades;
        json.windmillBladeColor = this.windmillBladeColor;
        json.manorWings = this.manorWings;
        json.manorWingSize = this.manorWingSize;
        json.lightAngle = this.lightAngle;
        json.lightIntensity = this.lightIntensity;
        json.ambientOcclusion = this.ambientOcclusion;
        json.aoIntensity = this.aoIntensity;
        json.showOutline = this.showOutline;
        json.outlineWidth = this.outlineWidth;
        json.outlineColor = this.outlineColor;
        json.showShadow = this.showShadow;
        json.shadowOpacity = this.shadowOpacity;
        json.shadowBlur = this.shadowBlur;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowColor = this.shadowColor;
        json.cityFloors = this.cityFloors;
        json.cityFloorColor = this.cityFloorColor;
        json.cityFloorColorAlt = this.cityFloorColorAlt;
        json.cityWindowColor = this.cityWindowColor;
        json.cityWindowGlow = this.cityWindowGlow;
        json.cityRooftopDetails = this.cityRooftopDetails;
        json.cityACUnits = this.cityACUnits;
        return json;
    }

    static fromJSON(json) {
        const module = new ProceduralBuilding();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.seed = json.seed ?? 12345;
        module.randomizeSeed = json.randomizeSeed ?? false;
        module.buildingStyle = json.buildingStyle ?? 'house';
        module.width = json.width ?? 80;
        module.height = json.height ?? 60;
        module.sizeVariation = json.sizeVariation ?? 0.1;
        module.roofStyle = json.roofStyle ?? 'peaked';
        module.roofColor = json.roofColor ?? '#8a4a3a';
        module.roofColorSecondary = json.roofColorSecondary ?? '#7a3a2a';
        module.roofHighlight = json.roofHighlight ?? '#9a5a4a';
        module.roofRidgeVisible = json.roofRidgeVisible ?? true;
        module.roofRidgeColor = json.roofRidgeColor ?? '#6a3a2a';
        module.roofOverhang = json.roofOverhang ?? 5;
        module.wallVisible = json.wallVisible ?? true;
        module.wallHeight = json.wallHeight ?? 8;
        module.wallColor = json.wallColor ?? '#c4a882';
        module.wallColorDark = json.wallColorDark ?? '#a48862';
        module.wallStyle = json.wallStyle ?? 'stone';
        module.chimneyEnabled = json.chimneyEnabled ?? true;
        module.chimneyCount = json.chimneyCount ?? 1;
        module.chimneySize = json.chimneySize ?? 8;
        module.chimneyColor = json.chimneyColor ?? '#5a4a4a';
        module.chimneySmoke = json.chimneySmoke ?? true;
        module.chimneySmokeColor = json.chimneySmokeColor ?? '#888888';
        module.skylightEnabled = json.skylightEnabled ?? true;
        module.skylightCount = json.skylightCount ?? 2;
        module.skylightSize = json.skylightSize ?? 6;
        module.skylightColor = json.skylightColor ?? '#88ccff';
        module.skylightGlow = json.skylightGlow ?? true;
        module.entranceVisible = json.entranceVisible ?? true;
        module.entranceWidth = json.entranceWidth ?? 15;
        module.entranceDepth = json.entranceDepth ?? 8;
        module.entranceSide = json.entranceSide ?? 'south';
        module.entranceColor = json.entranceColor ?? '#6a4a3a';
        module.showWeathering = json.showWeathering ?? true;
        module.weatheringIntensity = json.weatheringIntensity ?? 0.3;
        module.showMoss = json.showMoss ?? false;
        module.mossAmount = json.mossAmount ?? 0.2;
        module.mossColor = json.mossColor ?? '#4a6a4a';
        module.showRoofTiles = json.showRoofTiles ?? true;
        module.tileRows = json.tileRows ?? 6;
        module.towerBattlements = json.towerBattlements ?? true;
        module.battlementCount = json.battlementCount ?? 8;
        module.battlementSize = json.battlementSize ?? 6;
        module.castleTowers = json.castleTowers ?? true;
        module.castleTowerCount = json.castleTowerCount ?? 4;
        module.castleTowerSize = json.castleTowerSize ?? 20;
        module.castleFlag = json.castleFlag ?? true;
        module.flagColor = json.flagColor ?? '#cc3333';
        module.templeColumns = json.templeColumns ?? true;
        module.columnCount = json.columnCount ?? 6;
        module.templeGlow = json.templeGlow ?? true;
        module.templeGlowColor = json.templeGlowColor ?? '#ffdd88';
        module.ruinsDecay = json.ruinsDecay ?? 0.5;
        module.ruinsDebris = json.ruinsDebris ?? true;
        module.forgeGlow = json.forgeGlow ?? true;
        module.forgeGlowColor = json.forgeGlowColor ?? '#ff6600';
        module.lighthouseBeam = json.lighthouseBeam ?? true;
        module.lighthouseBeamColor = json.lighthouseBeamColor ?? '#ffff88';
        module.windmillBlades = json.windmillBlades ?? 4;
        module.windmillBladeColor = json.windmillBladeColor ?? '#c8a870';
        module.manorWings = json.manorWings ?? true;
        module.manorWingSize = json.manorWingSize ?? 30;
        module.lightAngle = json.lightAngle ?? 315;
        module.lightIntensity = json.lightIntensity ?? 0.4;
        module.ambientOcclusion = json.ambientOcclusion ?? true;
        module.aoIntensity = json.aoIntensity ?? 0.3;
        module.showOutline = json.showOutline ?? true;
        module.outlineWidth = json.outlineWidth ?? 2;
        module.outlineColor = json.outlineColor ?? '#3a2a2a';
        module.showShadow = json.showShadow ?? true;
        module.shadowOpacity = json.shadowOpacity ?? 0.4;
        module.shadowBlur = json.shadowBlur ?? 8;
        module.shadowOffsetX = json.shadowOffsetX ?? 6;
        module.shadowOffsetY = json.shadowOffsetY ?? 8;
        module.shadowColor = json.shadowColor ?? '#000000';
        module.cityFloors = json.cityFloors ?? 5;
        module.cityFloorColor = json.cityFloorColor ?? '#8a9aaa';
        module.cityFloorColorAlt = json.cityFloorColorAlt ?? '#7a8a9a';
        module.cityWindowColor = json.cityWindowColor ?? '#ffffcc';
        module.cityWindowGlow = json.cityWindowGlow ?? true;
        module.cityRooftopDetails = json.cityRooftopDetails ?? true;
        module.cityACUnits = json.cityACUnits ?? true;
        module._generateBuilding();
        return module;
    }

    clone() {
        return ProceduralBuilding.fromJSON(this.toJSON());
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.ProceduralBuilding = ProceduralBuilding;
}

if (typeof Module !== 'undefined') {
    Module.register('ProceduralBuilding', ProceduralBuilding);
}