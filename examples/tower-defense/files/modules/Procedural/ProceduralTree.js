class ProceduralTree extends Module {
    static namespace = "Procedural,Rendering,Drawing,Top Down";
    static allowMultiple = false;
    static color = "#2d6b2dff";

    static getIcon() { return '🌳'; }
    static getDescription() { return 'Procedural top-down tree with wind, parallax depth & shadows'; }

    constructor() {
        super();
        this.ignoreGameObjectTransform = false;

        // Seed
        this.seed = 12345;
        this.randomizeSeed = false;

        // Tree type
        this.treeType = 'oak'; // oak, pine, palm, willow, dead

        // Trunk
        this.trunkRadius = 8;
        this.trunkColor = '#5a3a1a';
        this.trunkRingColor = '#4a2a0a';
        this.showRings = true;
        this.ringCount = 4;
        this.ringSpacing = 0.7;
        this.barkDetail = true;
        this.barkLines = 6;

        // Trunk Stem (visible 3D trunk)
        this.showTrunkStem = true;
        this.trunkStemTaper = 0.4; // How much the trunk narrows at top (0=same width, 1=point)
        this.trunkStemLength = 0.8; // How far up the trunk extends (0-1, relative to canopy)

        // Canopy (shared)
        this.canopySize = 40;
        this.canopyDensity = 1.0;
        this.leafColor = '#3a8a3a';
        this.leafColorSecondary = '#2a7a2a';
        this.leafHighlight = '#5aaa5a';
        this.leafTransparency = 1.0;
        this.showLeaves = true;

        // Oak
        this.oakClusterCount = 7;
        this.oakClusterSize = 0.6;
        this.oakIrregularity = 0.3;

        // Pine
        this.pineLayerCount = 4;
        this.pinePointiness = 0.7;
        this.pineLayerSpread = 0.85;

        // Palm
        this.palmFrondCount = 6;
        this.palmFrondLength = 35;
        this.palmFrondWidth = 8;
        this.palmFrondDroop = 0.4;
        this.palmCoconutCount = 3;
        this.palmCoconutColor = '#8a6a2a';

        // Willow
        this.willowBranchCount = 10;
        this.willowBranchLength = 40;
        this.willowDroop = 0.8;
        this.willowDensity = 1.2;

        // Dead
        this.deadBranchCount = 5;
        this.deadBranchLength = 25;
        this.deadBranchFork = true;
        this.deadBarkColor = '#6a5a4a';

        // Wind
        this.windEnabled = true;
        this.useWeatherWind = true;
        this.windStrength = 1.0;
        this.windSpeed = 2.0;
        this.windDirection = 0;
        this.windTurbulence = 0.3;

        // Depth / Parallax
        this.depthEnabled = true;
        this.treeHeight = 1.0;
        this.depthIntensity = 0.15;
        this.maxDepthOffset = 32;

        // Outline
        this.showOutline = true;
        this.outlineWidth = 1.5;
        this.outlineColor = '#1a4a1a';

        // Shadow
        this.showShadow = true;
        this.shadowColor = '#000000';
        this.shadowOpacity = 0.3;
        this.shadowOffsetX = 4;
        this.shadowOffsetY = 5;
        this.shadowBlur = 8;
        this.shadowScale = 1.0;

        // Pre-render for performance (disables wind and parallax)
        this.preRender = false;
        this._preRenderCanvas = null;
        this._preRenderCtx = null;
        this._preRenderDirty = true;
        this._preRenderBounds = null;

        // Internal
        this._cachedSeed = null;
        this._windPhase = 0;
        this._clusters = [];
        this._fronds = [];
        this._branches = [];
        this._barkMarks = [];
        this._coconuts = [];

        // Leaf caching for performance
        this._leafCacheEnabled = true;
        this._leafCaches = new Map(); // key -> {canvas, width, height}
        this._cacheInvalidated = true;

        this._generateTree();
    }

    getPropertyMetadata() {
        return [
            { type: 'groupStart', label: '🎲 Randomization' },
                { key: 'seed', label: 'Seed', type: 'number', min: 0, max: 999999 },
                { key: 'randomizeSeed', label: 'Randomize on Start', type: 'boolean' },
                { type: 'button', label: '🎲 Randomize', action: 'randomizeAll' },
                { type: 'button', label: '🔄 Regenerate', action: 'regenerate' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌳 Tree Type' },
                { key: 'treeType', label: 'Type', type: 'select', options: ['oak', 'pine', 'palm', 'willow', 'dead'] },
                { key: 'showLeaves', label: 'Show Leaves', type: 'boolean', showIf: (m) => m.treeType !== 'dead' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🪵 Trunk' },
                { key: 'trunkRadius', label: 'Radius', type: 'number', min: 3, max: 30 },
                { key: 'trunkColor', label: 'Color', type: 'color' },
                { key: 'barkDetail', label: 'Bark Detail', type: 'boolean' },
                { key: 'barkLines', label: 'Bark Lines', type: 'number', min: 2, max: 12, showIf: { barkDetail: true } },
                { key: 'showRings', label: 'Show Rings', type: 'boolean' },
                { key: 'ringCount', label: 'Ring Count', type: 'number', min: 1, max: 10, showIf: { showRings: true } },
                { key: 'ringSpacing', label: 'Ring Spacing', type: 'slider', min: 0.3, max: 1, step: 0.05, showIf: { showRings: true } },
                { key: 'trunkRingColor', label: 'Ring Color', type: 'color', showIf: { showRings: true } },
                { key: 'showTrunkStem', label: 'Show 3D Stem', type: 'boolean', hint: 'Visible trunk extending up into canopy' },
                { key: 'trunkStemTaper', label: 'Stem Taper', type: 'slider', min: 0.1, max: 0.8, step: 0.05, showIf: { showTrunkStem: true } },
                { key: 'trunkStemLength', label: 'Stem Length', type: 'slider', min: 0.3, max: 1, step: 0.05, showIf: { showTrunkStem: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🍃 Canopy', showIf: (m) => m.treeType !== 'dead' },
                { key: 'canopySize', label: 'Size', type: 'number', min: 10, max: 120 },
                { key: 'canopyDensity', label: 'Density', type: 'slider', min: 0.3, max: 2, step: 0.1 },
                { key: 'leafColor', label: 'Primary Color', type: 'color' },
                { key: 'leafColorSecondary', label: 'Secondary Color', type: 'color' },
                { key: 'leafHighlight', label: 'Highlight', type: 'color' },
                { key: 'leafTransparency', label: 'Transparency', type: 'slider', min: 0.1, max: 1, step: 0.05 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌿 Oak Settings', showIf: { treeType: 'oak' } },
                { key: 'oakClusterCount', label: 'Clusters', type: 'number', min: 3, max: 15 },
                { key: 'oakClusterSize', label: 'Cluster Size', type: 'slider', min: 0.3, max: 1, step: 0.05 },
                { key: 'oakIrregularity', label: 'Irregularity', type: 'slider', min: 0, max: 0.6, step: 0.05 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌲 Pine Settings', showIf: { treeType: 'pine' } },
                { key: 'pineLayerCount', label: 'Layers', type: 'number', min: 2, max: 8 },
                { key: 'pinePointiness', label: 'Pointiness', type: 'slider', min: 0.3, max: 1, step: 0.05 },
                { key: 'pineLayerSpread', label: 'Layer Spread', type: 'slider', min: 0.5, max: 1, step: 0.05 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌴 Palm Settings', showIf: { treeType: 'palm' } },
                { key: 'palmFrondCount', label: 'Frond Count', type: 'number', min: 3, max: 12 },
                { key: 'palmFrondLength', label: 'Frond Length', type: 'number', min: 15, max: 80 },
                { key: 'palmFrondWidth', label: 'Frond Width', type: 'number', min: 3, max: 20 },
                { key: 'palmFrondDroop', label: 'Droop', type: 'slider', min: 0, max: 1, step: 0.05 },
                { key: 'palmCoconutCount', label: 'Coconuts', type: 'number', min: 0, max: 8 },
                { key: 'palmCoconutColor', label: 'Coconut Color', type: 'color', showIf: (m) => m.palmCoconutCount > 0 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌾 Willow Settings', showIf: { treeType: 'willow' } },
                { key: 'willowBranchCount', label: 'Branch Count', type: 'number', min: 4, max: 20 },
                { key: 'willowBranchLength', label: 'Branch Length', type: 'number', min: 15, max: 80 },
                { key: 'willowDroop', label: 'Droop', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
                { key: 'willowDensity', label: 'Leaf Density', type: 'slider', min: 0.5, max: 2, step: 0.1 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '💀 Dead Tree Settings', showIf: { treeType: 'dead' } },
                { key: 'deadBranchCount', label: 'Branches', type: 'number', min: 2, max: 10 },
                { key: 'deadBranchLength', label: 'Branch Length', type: 'number', min: 10, max: 50 },
                { key: 'deadBranchFork', label: 'Forked Branches', type: 'boolean' },
                { key: 'deadBarkColor', label: 'Bark Color', type: 'color' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '💨 Wind' },
                { key: 'windEnabled', label: 'Enable Wind', type: 'boolean' },
                { key: 'useWeatherWind', label: 'Use Weather System', type: 'boolean', showIf: { windEnabled: true }, hint: 'Uses weatherGetWind() for direction/strength' },
                { key: 'windStrength', label: 'Strength', type: 'slider', min: 0, max: 3, step: 0.1, showIf: (m) => m.windEnabled && !m.useWeatherWind },
                { key: 'windSpeed', label: 'Speed', type: 'slider', min: 0.5, max: 5, step: 0.1, showIf: { windEnabled: true } },
                { key: 'windDirection', label: 'Direction (°)', type: 'number', min: 0, max: 360, showIf: (m) => m.windEnabled && !m.useWeatherWind },
                { key: 'windTurbulence', label: 'Turbulence', type: 'slider', min: 0, max: 1, step: 0.05, showIf: (m) => m.windEnabled && !m.useWeatherWind },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🏔️ Depth / Parallax' },
                { key: 'depthEnabled', label: 'Enable Depth', type: 'boolean', hint: 'Fake 3D parallax based on viewport center' },
                { key: 'treeHeight', label: 'Tree Height', type: 'slider', min: 0.2, max: 3, step: 0.1, showIf: { depthEnabled: true } },
                { key: 'depthIntensity', label: 'Intensity', type: 'slider', min: 0.01, max: 0.5, step: 0.01, showIf: { depthEnabled: true } },
                { key: 'maxDepthOffset', label: 'Max Offset', type: 'number', min: 2, max: 40, showIf: { depthEnabled: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '✏️ Outline' },
                { key: 'showOutline', label: 'Show Outline', type: 'boolean' },
                { key: 'outlineWidth', label: 'Width', type: 'number', min: 0.5, max: 5, step: 0.5, showIf: { showOutline: true } },
                { key: 'outlineColor', label: 'Color', type: 'color', showIf: { showOutline: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🌑 Shadow' },
                { key: 'showShadow', label: 'Show Shadow', type: 'boolean' },
                { key: 'shadowColor', label: 'Color', type: 'color', showIf: { showShadow: true } },
                { key: 'shadowOpacity', label: 'Opacity', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { showShadow: true } },
                { key: 'shadowBlur', label: 'Blur', type: 'number', min: 0, max: 20, showIf: { showShadow: true } },
                { key: 'shadowOffsetX', label: 'Offset X', type: 'number', min: -30, max: 30, showIf: { showShadow: true } },
                { key: 'shadowOffsetY', label: 'Offset Y', type: 'number', min: -30, max: 30, showIf: { showShadow: true } },
                { key: 'shadowScale', label: 'Scale', type: 'slider', min: 0.5, max: 2, step: 0.05, showIf: { showShadow: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '⚡ Performance' },
                { key: 'preRender', label: 'Pre-render Tree', type: 'boolean', hint: 'Bake tree to image for performance (disables wind & parallax)' },
                { type: 'hint', label: 'Pre-rendering calculates maximum parallax size and bakes the tree to a static image', showIf: { preRender: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '📦 Presets' },
                { type: 'button', label: '🌳 Oak', action: 'presetOak' },
                { type: 'button', label: '🌲 Pine', action: 'presetPine' },
                { type: 'button', label: '🌴 Palm', action: 'presetPalm' },
                { type: 'button', label: '🌾 Willow', action: 'presetWillow' },
                { type: 'button', label: '💀 Dead Tree', action: 'presetDead' },
                { type: 'button', label: '🍁 Autumn Oak', action: 'presetAutumn' },
                { type: 'button', label: '🌸 Cherry Blossom', action: 'presetCherry' },
            { type: 'groupEnd' },
        ];
    }

    // ─── Seeded RNG ───
    _sr() {
        this._cs = (this._cs * 1103515245 + 12345) & 0x7fffffff;
        return this._cs / 0x7fffffff;
    }
    _initSeed(s) { this._cs = s || this.seed; }

    // ─── Actions ───
    randomizeAll() {
        this.seed = Math.floor(Math.random() * 999999);
        this._generateTree();
        this._refreshInspector();
    }
    regenerate() {
        this._generateTree();
        this._refreshInspector();
    }

    // ─── Presets ───
    presetOak() {
        Object.assign(this, {
            treeType: 'oak', canopySize: 45, oakClusterCount: 8, oakClusterSize: 0.6, oakIrregularity: 0.25,
            leafColor: '#3a8a3a', leafColorSecondary: '#2a7a2a', leafHighlight: '#5aaa5a',
            trunkRadius: 8, showLeaves: true, leafTransparency: 1
        });
        this._generateTree(); this._refreshInspector();
    }
    presetPine() {
        Object.assign(this, {
            treeType: 'pine', canopySize: 35, pineLayerCount: 5, pinePointiness: 0.8,
            leafColor: '#2a6a3a', leafColorSecondary: '#1a5a2a', leafHighlight: '#3a8a4a',
            trunkRadius: 6, showLeaves: true, leafTransparency: 1
        });
        this._generateTree(); this._refreshInspector();
    }
    presetPalm() {
        Object.assign(this, {
            treeType: 'palm', canopySize: 40, palmFrondCount: 7, palmFrondLength: 40, palmFrondWidth: 9,
            palmFrondDroop: 0.45, palmCoconutCount: 3,
            leafColor: '#3a9a3a', leafColorSecondary: '#2a8a2a', leafHighlight: '#5aba5a',
            trunkRadius: 7, showLeaves: true, leafTransparency: 1
        });
        this._generateTree(); this._refreshInspector();
    }
    presetWillow() {
        Object.assign(this, {
            treeType: 'willow', canopySize: 50, willowBranchCount: 12, willowBranchLength: 45,
            willowDroop: 0.9, willowDensity: 1.3,
            leafColor: '#4a9a4a', leafColorSecondary: '#3a8a3a', leafHighlight: '#6aba6a',
            trunkRadius: 9, showLeaves: true, leafTransparency: 0.85
        });
        this._generateTree(); this._refreshInspector();
    }
    presetDead() {
        Object.assign(this, {
            treeType: 'dead', deadBranchCount: 6, deadBranchLength: 30, deadBranchFork: true,
            deadBarkColor: '#6a5a4a', trunkRadius: 7, trunkColor: '#5a4a3a', showLeaves: false
        });
        this._generateTree(); this._refreshInspector();
    }
    presetAutumn() {
        Object.assign(this, {
            treeType: 'oak', canopySize: 45, oakClusterCount: 9, oakClusterSize: 0.55,
            leafColor: '#cc6622', leafColorSecondary: '#aa4411', leafHighlight: '#ee8833',
            trunkRadius: 8, showLeaves: true, leafTransparency: 0.9
        });
        this._generateTree(); this._refreshInspector();
    }
    presetCherry() {
        Object.assign(this, {
            treeType: 'oak', canopySize: 38, oakClusterCount: 10, oakClusterSize: 0.5,
            leafColor: '#ffaacc', leafColorSecondary: '#ee88aa', leafHighlight: '#ffccdd',
            trunkRadius: 6, showLeaves: true, leafTransparency: 0.85
        });
        this._generateTree(); this._refreshInspector();
    }

    _refreshInspector() {
        if (window.editor && window.editor.inspector) {
            if (window.editor.inspector.refreshModuleUI) window.editor.inspector.refreshModuleUI(this);
            if (window.editor.refreshCanvas) window.editor.refreshCanvas();
            if (this.gameObject && this.gameObject.scene) this.gameObject.scene.dirty = true;
        }
    }

    // ═══════════════════════════════════════════════════════
    // GENERATION
    // ═══════════════════════════════════════════════════════

    _generateTree() {
        this._initSeed(this.seed);
        this._clusters = [];
        this._fronds = [];
        this._branches = [];
        this._barkMarks = [];
        this._coconuts = [];
        this._cachedSeed = this.seed;
        this._cacheInvalidated = true;
        this._leafCaches.clear();

        // Bark marks (shared)
        if (this.barkDetail) {
            for (let i = 0; i < this.barkLines; i++) {
                const a = this._sr() * Math.PI * 2;
                const r = this._sr() * this.trunkRadius * 0.7;
                this._barkMarks.push({
                    x: Math.cos(a) * r, y: Math.sin(a) * r,
                    len: this.trunkRadius * (0.3 + this._sr() * 0.4),
                    angle: a + (this._sr() - 0.5) * 0.5
                });
            }
        }

        switch (this.treeType) {
            case 'oak': this._genOak(); break;
            case 'pine': this._genPine(); break;
            case 'palm': this._genPalm(); break;
            case 'willow': this._genWillow(); break;
            case 'dead': this._genDead(); break;
        }
    }

    _genOak() {
        const count = Math.floor(this.oakClusterCount * this.canopyDensity);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (this._sr() - 0.5) * this.oakIrregularity * 2;
            const dist = this.canopySize * 0.35 * (0.6 + this._sr() * 0.8);
            const size = this.canopySize * this.oakClusterSize * (0.5 + this._sr() * 0.5);
            this._clusters.push({
                x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
                size, colorVar: 0.85 + this._sr() * 0.3,
                windPhase: this._sr() * Math.PI * 2,
                layer: this._sr() // depth layer 0-1
            });
        }
        // Center cluster
        this._clusters.push({
            x: 0, y: 0, size: this.canopySize * this.oakClusterSize * 0.8,
            colorVar: 1, windPhase: this._sr() * Math.PI * 2, layer: 0.5
        });
        this._clusters.sort((a, b) => a.layer - b.layer);
    }

    _genPine() {
        for (let l = 0; l < this.pineLayerCount; l++) {
            const t = l / (this.pineLayerCount - 1 || 1); // 0 = bottom, 1 = top
            // Bottom layers are largest, top layers shrink significantly
            const sizeFactor = 1 - t * t * this.pinePointiness;
            const layerSize = this.canopySize * sizeFactor * this.pineLayerSpread;
            const pts = 8;
            const verts = [];
            const angleOffset = l * 0.3; // rotate each layer slightly
            for (let i = 0; i < pts; i++) {
                const a = (i / pts) * Math.PI * 2 + angleOffset;
                const r = layerSize * 0.5 * (0.85 + this._sr() * 0.3);
                verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            this._clusters.push({
                verts, layer: t, colorVar: 0.9 + this._sr() * 0.2,
                windPhase: this._sr() * Math.PI * 2,
                layerIndex: l
            });
        }
    }

    _genPalm() {
        for (let i = 0; i < this.palmFrondCount; i++) {
            const angle = (i / this.palmFrondCount) * Math.PI * 2 + (this._sr() - 0.5) * 0.3;
            const length = this.palmFrondLength * (0.8 + this._sr() * 0.4);
            const leaflets = [];
            const leafCount = 6 + Math.floor(this._sr() * 5);
            for (let j = 0; j < leafCount; j++) {
                const lt = (j + 1) / leafCount;
                leaflets.push({
                    t: lt, size: this.palmFrondWidth * (1 - lt * 0.4) * (0.7 + this._sr() * 0.6),
                    side: j % 2 === 0 ? -1 : 1
                });
            }
            this._fronds.push({
                angle, length, leaflets,
                windPhase: this._sr() * Math.PI * 2,
                colorVar: 0.9 + this._sr() * 0.2
            });
        }
        // Coconuts
        for (let i = 0; i < this.palmCoconutCount; i++) {
            const a = this._sr() * Math.PI * 2;
            const d = this.trunkRadius * (0.8 + this._sr() * 0.8);
            this._coconuts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, size: 3 + this._sr() * 2 });
        }
    }

    _genWillow() {
        const count = Math.floor(this.willowBranchCount * this.canopyDensity);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (this._sr() - 0.5) * 0.4;
            const length = this.willowBranchLength * (0.7 + this._sr() * 0.6);
            const subBranches = [];
            const subCount = Math.floor(3 + this._sr() * 4 * this.willowDensity);
            for (let j = 0; j < subCount; j++) {
                subBranches.push({
                    t: 0.3 + this._sr() * 0.6,
                    angle: (this._sr() - 0.5) * 1.2,
                    length: length * (0.3 + this._sr() * 0.4)
                });
            }
            this._branches.push({
                angle, length, subBranches,
                windPhase: this._sr() * Math.PI * 2,
                colorVar: 0.85 + this._sr() * 0.3
            });
        }
    }

    _genDead() {
        for (let i = 0; i < this.deadBranchCount; i++) {
            const angle = (i / this.deadBranchCount) * Math.PI * 2 + (this._sr() - 0.5) * 0.5;
            const length = this.deadBranchLength * (0.6 + this._sr() * 0.8);
            const forks = [];
            if (this.deadBranchFork && this._sr() > 0.3) {
                const ft = 0.5 + this._sr() * 0.4;
                forks.push({
                    t: ft, angle: (this._sr() - 0.5) * 1.0,
                    length: length * (0.3 + this._sr() * 0.3)
                });
            }
            this._branches.push({
                angle, length, forks,
                windPhase: this._sr() * Math.PI * 2,
                width: 2 + this._sr() * 2
            });
        }
    }

    // ═══════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════

    start() {
        if (this.randomizeSeed) this.seed = Math.floor(Math.random() * 999999);
        this._generateTree();
        this._windPhase = Math.random() * Math.PI * 2;
        
        // Create pre-render canvas if enabled
        if (this.preRender) {
            this._createPreRenderCanvas();
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRE-RENDER
    // ═══════════════════════════════════════════════════════

    _calculatePreRenderSize() {
        // Calculate the maximum size needed for the pre-rendered image
        // This includes canopy size + shadow offset + max parallax offset + padding
        const canopy = this.canopySize;
        const trunk = this.trunkRadius;
        const shadow = Math.max(Math.abs(this.shadowOffsetX), Math.abs(this.shadowOffsetY)) + this.shadowBlur;
        const parallax = this.maxDepthOffset * this.treeHeight;
        const padding = 20;
        
        // Calculate based on tree type
        let extraWidth = 0;
        let extraHeight = 0;
        
        switch (this.treeType) {
            case 'willow':
                extraWidth = this.willowBranchLength;
                extraHeight = this.willowBranchLength * this.willowDroop;
                break;
            case 'palm':
                extraWidth = this.palmFrondLength;
                extraHeight = this.palmFrondLength * this.palmFrondDroop;
                break;
            case 'dead':
                extraWidth = this.deadBranchLength;
                extraHeight = this.deadBranchLength;
                break;
        }
        
        const halfWidth = canopy + trunk + shadow + parallax + extraWidth + padding;
        const halfHeight = canopy + trunk + shadow + parallax + extraHeight + padding;
        
        return {
            width: Math.ceil(halfWidth * 2),
            height: Math.ceil(halfHeight * 2),
            centerX: halfWidth,
            centerY: halfHeight
        };
    }

    _createPreRenderCanvas() {
        const size = this._calculatePreRenderSize();
        
        this._preRenderCanvas = document.createElement('canvas');
        this._preRenderCanvas.width = size.width;
        this._preRenderCanvas.height = size.height;
        this._preRenderCtx = this._preRenderCanvas.getContext('2d');
        
        this._preRenderBounds = {
            width: size.width,
            height: size.height,
            centerX: size.centerX,
            centerY: size.centerY
        };
        
        // Temporarily disable wind and parallax for pre-render
        const savedWindEnabled = this.windEnabled;
        const savedDepthEnabled = this.depthEnabled;
        this.windEnabled = false;
        this.depthEnabled = false;
        
        // Render to canvas
        this._preRenderCtx.save();
        this._preRenderCtx.translate(size.centerX, size.centerY);
        this._drawTreeContent(this._preRenderCtx);
        this._preRenderCtx.restore();
        
        // Restore settings
        this.windEnabled = savedWindEnabled;
        this.depthEnabled = savedDepthEnabled;
        
        this._preRenderDirty = false;
    }

    _drawTreeContent(ctx) {
        // Shadow
        if (this.showShadow) this._drawShadow(ctx);

        // Trunk base
        this._drawTrunk(ctx);

        // Trunk stem
        let stemTargetDepth = 0.85;
        if (this.treeType === 'pine' && this._clusters.length > 1) {
            const sortedLayers = this._clusters.map(c => c.layer).sort((a, b) => b - a);
            stemTargetDepth = sortedLayers[1] || 0.85;
        } else if (this.treeType === 'oak' && this._clusters.length > 1) {
            const sortedLayers = this._clusters.map(c => c.layer).sort((a, b) => b - a);
            stemTargetDepth = sortedLayers[1] || 0.85;
        }
        this._drawTrunkStem(ctx, stemTargetDepth);

        // Canopy/branches
        if (this.showLeaves && this.treeType !== 'dead') {
            switch (this.treeType) {
                case 'oak': this._drawOak(ctx); break;
                case 'pine': this._drawPine(ctx); break;
                case 'palm': this._drawPalm(ctx); break;
                case 'willow': this._drawWillow(ctx); break;
            }
        } else if (this.treeType === 'dead') {
            this._drawDead(ctx);
        }
    }

    loop(deltaTime) {
        // Update depth sorting based on parallax height - higher creatures draw on top
        // Negative depth = drawn later = on top
        if (this.gameObject) {
            // Get viewport center in world coordinates
            let vpCenterX = 0, vpCenterY = 0;
            if (typeof getViewport === 'function') {
                const vp = getViewport();
                vpCenterX = vp.x + vp.width / 2;
                vpCenterY = vp.y + vp.height / 2;
            } else if (typeof cameraGetPosition === 'function') {
                const camPos = cameraGetPosition();
                vpCenterX = camPos.x;
                vpCenterY = camPos.y;
            }

            // Distance from viewport center — further away = higher depth (drawn behind)
            const dx = this.gameObject.position.x - vpCenterX;
            const dy = this.gameObject.position.y - vpCenterY;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);

            // Height-based depth: taller creatures draw on top (more negative)
            const heightBasedDepth = -(this.maxDepthOffset || 1.0) * 100 * this.depthIntensity;

            // Combine: height pulls depth negative (on top), distance pushes it positive (behind)
            this.gameObject.depth = heightBasedDepth + distFromCenter * 0.01;
        }

        if (this._cachedSeed !== this.seed) this._generateTree();
        if (this.windEnabled) {
            this._windPhase += this.windSpeed * deltaTime;
            if (this._windPhase > 628) this._windPhase -= 628; // ~200π
        }
    }

    // ═══════════════════════════════════════════════════════
    // WIND
    // ═══════════════════════════════════════════════════════

    _getWind(phaseOffset, heightFactor) {
        if (!this.windEnabled) return { x: 0, y: 0, rot: 0 };

        let strength, dirRad, turb;

        if (this.useWeatherWind && typeof weatherGetWind === 'function') {
            const w = weatherGetWind();
            strength = (w.strength / 100) * this.windStrength;
            dirRad = w.direction * Math.PI / 180;
            turb = w.turbulence;
        } else {
            strength = this.windStrength;
            dirRad = this.windDirection * Math.PI / 180;
            turb = this.windTurbulence;
        }

        const phase = this._windPhase + phaseOffset;
        const wave = Math.sin(phase) + Math.sin(phase * 2.3) * turb * 0.5;
        const s = strength * wave * heightFactor;

        return {
            x: Math.cos(dirRad) * s * 2.5,
            y: Math.sin(dirRad) * s * 1.5,
            rot: wave * 0.1 * strength * heightFactor
        };
    }

    // ═══════════════════════════════════════════════════════
    // DEPTH PARALLAX
    // ═══════════════════════════════════════════════════════

    _getDepthOffset(layerHeight, isTrunk = false) {
        if (!this.depthEnabled) return { x: 0, y: 0 };

        const vp = typeof getViewport === 'function' ? getViewport() : null;
        if (!vp) return { x: 0, y: 0 };

        // Get camera center position
        const camPos = typeof cameraGetPosition === 'function' ? cameraGetPosition() : null;
        if (!camPos) return { x: 0, y: 0 };

        const camX = camPos.x || 0;
        const camY = camPos.y || 0;

        // Direction from camera center to tree
        const dx = this.x - camX;
        const dy = this.y - camY;

        // Trunk stays grounded (no depth offset)
        if (isTrunk) return { x: 0, y: 0 };

        // Remap canopy layers: bottom leaves start at 0.5, top at 1.0
        // This ensures even the lowest canopy elements have visible offset
        const remappedHeight = 0.5 + layerHeight * 0.5;

        // Offset canopy away from camera center (higher = more offset)
        const factor = remappedHeight * this.treeHeight * this.depthIntensity;
        let ox = dx * factor;
        let oy = dy * factor;

        // Clamp to max offset
        const mag = Math.sqrt(ox * ox + oy * oy);
        if (mag > this.maxDepthOffset) {
            const scale = this.maxDepthOffset / mag;
            ox *= scale;
            oy *= scale;
        }

        return { x: ox, y: oy };
    }

    // ═══════════════════════════════════════════════════════
    // COLOR HELPERS
    // ═══════════════════════════════════════════════════════

    _adjustColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const f = Math.max(0, Math.min(2, factor));
        return '#' + [r, g, b].map(c =>
            Math.min(255, Math.floor(c * f)).toString(16).padStart(2, '0')
        ).join('');
    }

    _leafColorWithAlpha(hex, variation) {
        const col = this._adjustColor(hex, variation);
        if (this.leafTransparency >= 1) return col;
        const r = parseInt(col.slice(1, 3), 16);
        const g = parseInt(col.slice(3, 5), 16);
        const b = parseInt(col.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${this.leafTransparency})`;
    }

    // Create down-right gradient for leaves
    _createLeafGradient(ctx, x, y, size, layerDepth) {
        // layerDepth: 0 = bottom (darkest), 1 = top (brightest/set color)
        // More aggressive contrast: bottom=0.35, top=1.0
        const brightnessFactor = 0.35 + layerDepth * 0.65;
        
        // Gradient direction: top-left to bottom-right
        const grad = ctx.createLinearGradient(
            x - size * 0.4, y - size * 0.4,
            x + size * 0.4, y + size * 0.4
        );
        
        // Top-left: highlight color
        grad.addColorStop(0, this._leafColorWithAlpha(
            this._adjustColor(this.leafHighlight, brightnessFactor), 1
        ));
        // Middle: primary color
        grad.addColorStop(0.4, this._leafColorWithAlpha(
            this._adjustColor(this.leafColor, brightnessFactor), 1
        ));
        // Bottom-right: secondary (darker)
        grad.addColorStop(1, this._leafColorWithAlpha(
            this._adjustColor(this.leafColorSecondary, brightnessFactor * 0.75), 1
        ));
        
        return grad;
    }

    // Create gradient outline (darker version of leaf gradient)
    _createOutlineGradient(ctx, x, y, size, layerDepth) {
        // Match leaf contrast: bottom=0.35, top=1.0
        const brightnessFactor = 0.35 + layerDepth * 0.65;
        const outlineDarken = 0.5; // Outlines are 50% darker
        
        const grad = ctx.createLinearGradient(
            x - size * 0.4, y - size * 0.4,
            x + size * 0.4, y + size * 0.4
        );
        
        grad.addColorStop(0, this._adjustColor(this.outlineColor, brightnessFactor * outlineDarken * 1.2));
        grad.addColorStop(0.5, this._adjustColor(this.outlineColor, brightnessFactor * outlineDarken));
        grad.addColorStop(1, this._adjustColor(this.outlineColor, brightnessFactor * outlineDarken * 0.7));
        
        return grad;
    }

    // Get or create cached leaf image
    _getCachedLeaf(key, size, layerDepth, shape = 'circle') {
        if (!this._leafCacheEnabled) return null;
        
        const cacheKey = `${key}_${Math.round(size)}_${layerDepth.toFixed(2)}_${shape}`;
        
        if (this._leafCaches.has(cacheKey)) {
            return this._leafCaches.get(cacheKey);
        }
        
        // Create offscreen canvas
        const padding = this.showOutline ? this.outlineWidth * 2 + 2 : 2;
        const canvasSize = Math.ceil(size + padding * 2);
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        
        const cx = canvasSize / 2;
        const cy = canvasSize / 2;
        const r = size / 2;
        
        if (shape === 'circle') {
            // Draw outline first
            if (this.showOutline) {
                const outlineGrad = this._createOutlineGradient(ctx, cx, cy, size, layerDepth);
                ctx.fillStyle = outlineGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, r + this.outlineWidth, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw leaf gradient
            const leafGrad = this._createLeafGradient(ctx, cx, cy, size, layerDepth);
            ctx.fillStyle = leafGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const cached = { canvas, width: canvasSize, height: canvasSize, cx, cy };
        this._leafCaches.set(cacheKey, cached);
        return cached;
    }

    // Get wind with tip reduction
    _getWindWithTip(phaseOffset, heightFactor, isTopLayer = false) {
        const wind = this._getWind(phaseOffset, heightFactor);
        if (isTopLayer) {
            // Tip moves at half rate
            wind.x *= 0.5;
            wind.y *= 0.5;
            wind.rot *= 0.5;
        }
        return wind;
    }

    // ═══════════════════════════════════════════════════════
    // DRAW
    // ═══════════════════════════════════════════════════════

    draw(ctx) {
        if (this._cachedSeed !== this.seed) this._generateTree();

        // Use pre-rendered canvas if available
        if (this.preRender && this._preRenderCanvas && !this._preRenderDirty) {
            const bounds = this._preRenderBounds;
            ctx.drawImage(this._preRenderCanvas, -bounds.centerX, -bounds.centerY);
            return;
        }
        
        // Create pre-render canvas if needed
        if (this.preRender && this._preRenderDirty) {
            this._createPreRenderCanvas();
            if (this._preRenderCanvas) {
                const bounds = this._preRenderBounds;
                ctx.drawImage(this._preRenderCanvas, -bounds.centerX, -bounds.centerY);
                return;
            }
        }

        ctx.save();
        this._drawTreeContent(ctx);
        ctx.restore();
    }

    // ─── Shadow ───
    _drawShadow(ctx) {
        ctx.save();
        ctx.translate(this.shadowOffsetX, this.shadowOffsetY);
        ctx.globalAlpha = this.shadowOpacity;
        if (this.shadowBlur > 0) ctx.filter = `blur(${this.shadowBlur}px)`;
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        const sx = (this.treeType === 'dead' ? this.deadBranchLength : this.canopySize) * 0.5 * this.shadowScale;
        const sy = sx * 0.7;
        ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ─── Trunk ───
    _drawTrunk(ctx) {
        const r = this.trunkRadius;

        // Trunk circle (base)
        ctx.fillStyle = this.trunkColor;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        if (this.showOutline) {
            // Use darker trunk color for outline, not leaf outline
            ctx.strokeStyle = this._adjustColor(this.trunkColor, 0.5);
            ctx.lineWidth = this.outlineWidth;
            ctx.stroke();
        }

        // Rings
        if (this.showRings) {
            ctx.strokeStyle = this.trunkRingColor;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.4;
            for (let i = 1; i <= this.ringCount; i++) {
                const ringR = r * (i / (this.ringCount + 1)) * this.ringSpacing;
                ctx.beginPath();
                ctx.arc(0, 0, ringR, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Bark marks
        if (this.barkDetail) {
            ctx.strokeStyle = this.trunkRingColor;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.3;
            for (const m of this._barkMarks) {
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(m.x + Math.cos(m.angle) * m.len, m.y + Math.sin(m.angle) * m.len);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    // ─── Trunk Stem (3D visible trunk extending into canopy) ───
    _drawTrunkStem(ctx, targetLayerDepth = 0.85) {
        if (!this.showTrunkStem) return;
        if (this.treeType === 'dead') return; // Dead trees don't need this

        // Get depth offset for the top of the stem (second from top layer)
        const stemTopDepth = this._getDepthOffset(targetLayerDepth);
        
        // Base width and top width (tapered)
        const baseWidth = this.trunkRadius * 2;
        const topWidth = baseWidth * (1 - this.trunkStemTaper);
        
        // Calculate stem length based on canopy size
        const stemLength = this.canopySize * this.trunkStemLength * 0.5;
        
        // The stem tip position is offset by parallax
        const tipX = stemTopDepth.x;
        const tipY = stemTopDepth.y - stemLength * 0.1; // Slight upward bias
        
        // Draw trunk stem with rounded bottom (half-circle wrapping around trunk base)
        ctx.beginPath();
        
        // Start with a half-circle at the bottom (wrapping around the trunk base)
        // The half-circle faces away from the parallax direction
        const halfCircleRadius = baseWidth / 2;
        
        // Calculate angle for the half-circle based on parallax offset direction
        // The visible half should be on the opposite side of where the stem leans
        const parallaxAngle = Math.atan2(tipY, tipX);
        const startAngle = parallaxAngle + Math.PI / 2;
        const endAngle = parallaxAngle - Math.PI / 2;
        
        // Draw the half-circle at the base (visible part wrapping around trunk)
        ctx.arc(0, 0, halfCircleRadius, startAngle, endAngle, false);
        
        // Get the end points of the half-circle
        const leftBaseX = Math.cos(endAngle) * halfCircleRadius;
        const leftBaseY = Math.sin(endAngle) * halfCircleRadius;
        const rightBaseX = Math.cos(startAngle) * halfCircleRadius;
        const rightBaseY = Math.sin(startAngle) * halfCircleRadius;
        
        // Line up to top left (tapered)
        ctx.lineTo(tipX - topWidth / 2, tipY);
        
        // Line across the top
        ctx.lineTo(tipX + topWidth / 2, tipY);
        
        // Line back down to right base
        ctx.lineTo(rightBaseX, rightBaseY);
        
        ctx.closePath();
        
        // Gradient from base (lighter) to top (darker, shaded by canopy above)
        const stemGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
        stemGrad.addColorStop(0, this._adjustColor(this.trunkColor, 1.1)); // Lighter at base
        stemGrad.addColorStop(0.4, this.trunkColor);
        stemGrad.addColorStop(1, this._adjustColor(this.trunkColor, 0.55)); // Darker at top (shaded)
        
        ctx.fillStyle = stemGrad;
        ctx.fill();
        
        // Outline
        if (this.showOutline) {
            ctx.strokeStyle = this._adjustColor(this.trunkColor, 0.4);
            ctx.lineWidth = this.outlineWidth * 0.8;
            ctx.stroke();
        }
        
        // Add some bark texture lines along the stem
        if (this.barkDetail) {
            ctx.strokeStyle = this._adjustColor(this.trunkColor, 0.5);
            ctx.lineWidth = 0.6;
            ctx.globalAlpha = 0.4;
            
            const lineCount = Math.floor(this.barkLines * 0.6);
            for (let i = 0; i < lineCount; i++) {
                const t = (i + 0.5) / lineCount;
                const lx = tipX * t;
                const ly = tipY * t;
                // Interpolate width from base to top
                const w = (baseWidth / 2) * (1 - t) + (topWidth / 2) * t;
                
                ctx.beginPath();
                ctx.moveTo(lx - w * 0.7, ly);
                ctx.lineTo(lx + w * 0.7, ly);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    // ─── Oak ───
    _drawOak(ctx) {
        const maxLayer = Math.max(...this._clusters.map(c => c.layer));
        
        for (const c of this._clusters) {
            const isTopLayer = c.layer >= maxLayer - 0.1;
            const wind = this._getWindWithTip(c.windPhase, 0.5 + c.layer * 0.5, isTopLayer);
            const depth = this._getDepthOffset(c.layer);

            const px = c.x + wind.x + depth.x;
            const py = c.y + wind.y + depth.y;
            const size = c.size;

            // Try to use cached leaf
            const cached = this._getCachedLeaf('oak', size, c.layer, 'circle');
            
            if (cached && this._leafCacheEnabled) {
                // Draw cached image
                ctx.globalAlpha = this.leafTransparency;
                ctx.drawImage(
                    cached.canvas,
                    px - cached.cx,
                    py - cached.cy
                );
                ctx.globalAlpha = 1;
            } else {
                // Fallback: draw directly with gradient
                // Outline first with gradient
                if (this.showOutline) {
                    const outlineGrad = this._createOutlineGradient(ctx, px, py, size, c.layer);
                    ctx.fillStyle = outlineGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, size * 0.5 + this.outlineWidth, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Gradient fill (down-right shading)
                const leafGrad = this._createLeafGradient(ctx, px, py, size, c.layer);
                ctx.fillStyle = leafGrad;
                ctx.beginPath();
                ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ─── Pine ───
    _drawPine(ctx) {
        const maxLayer = this._clusters.length > 0 ? Math.max(...this._clusters.map(c => c.layer)) : 1;
        
        // Draw bottom (biggest) first, top (smallest) last
        for (let i = 0; i < this._clusters.length; i++) {
            const c = this._clusters[i];
            const isTopLayer = c.layer >= maxLayer - 0.05;
            const wind = this._getWindWithTip(c.windPhase, 0.3 + c.layer * 0.7, isTopLayer);
            const depth = this._getDepthOffset(c.layer);

            ctx.save();
            ctx.translate(wind.x + depth.x, wind.y + depth.y);
            ctx.rotate(wind.rot * (isTopLayer ? 0.5 : 1));

            const verts = c.verts;
            if (!verts || verts.length < 3) { ctx.restore(); continue; }

            // Calculate bounding box for gradient
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const v of verts) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const sizeEst = Math.max(maxX - minX, maxY - minY);

            // Layer depth: 1 = top (set color), 0 = bottom (darker)
            // More aggressive contrast for noticeable depth
            const layerDepth = c.layer;
            const brightnessFactor = 0.3 + layerDepth * 0.7; // Bottom=0.3, Top=1.0

            // Outline with gradient
            if (this.showOutline) {
                const outlineGrad = ctx.createLinearGradient(
                    minX - sizeEst * 0.1, minY - sizeEst * 0.1,
                    maxX + sizeEst * 0.1, maxY + sizeEst * 0.1
                );
                outlineGrad.addColorStop(0, this._adjustColor(this.outlineColor, brightnessFactor * 0.7));
                outlineGrad.addColorStop(0.5, this._adjustColor(this.outlineColor, brightnessFactor * 0.5));
                outlineGrad.addColorStop(1, this._adjustColor(this.outlineColor, brightnessFactor * 0.4));
                
                ctx.beginPath();
                ctx.moveTo(verts[0].x, verts[0].y);
                for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j].x, verts[j].y);
                ctx.closePath();
                ctx.lineWidth = this.outlineWidth * 2;
                ctx.strokeStyle = outlineGrad;
                ctx.stroke();
            }

            // Down-right gradient fill
            const leafGrad = ctx.createLinearGradient(
                minX - sizeEst * 0.2, minY - sizeEst * 0.2,
                maxX + sizeEst * 0.2, maxY + sizeEst * 0.2
            );
            // Top-left: highlight (brightest)
            leafGrad.addColorStop(0, this._leafColorWithAlpha(
                this._adjustColor(this.leafHighlight, brightnessFactor * c.colorVar), 1
            ));
            // Middle: primary color
            leafGrad.addColorStop(0.45, this._leafColorWithAlpha(
                this._adjustColor(this.leafColor, brightnessFactor * c.colorVar), 1
            ));
            // Bottom-right: secondary (darkest)
            leafGrad.addColorStop(1, this._leafColorWithAlpha(
                this._adjustColor(this.leafColorSecondary, brightnessFactor * c.colorVar * 0.85), 1
            ));

            ctx.fillStyle = leafGrad;
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j].x, verts[j].y);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    // ─── Palm ───
    _drawPalm(ctx) {
        const frondCount = this._fronds.length;
        
        for (let fi = 0; fi < frondCount; fi++) {
            const frond = this._fronds[fi];
            // Fronds at tips (outer) move less than inner ones
            const isTipFrond = fi === 0 || fi === frondCount - 1;
            const wind = this._getWindWithTip(frond.windPhase, 0.8, isTipFrond);
            const depth = this._getDepthOffset(0.7);

            ctx.save();
            ctx.rotate(frond.angle + wind.rot);

            // Frond stem with gradient
            const stemEndX = frond.length + wind.x * 3;
            const stemEndY = wind.y * 2;
            const droop = frond.length * this.palmFrondDroop;

            // Stem gradient (darker at tip)
            const stemGrad = ctx.createLinearGradient(0, 0, stemEndX, stemEndY + droop);
            stemGrad.addColorStop(0, this._adjustColor(this.leafColorSecondary, frond.colorVar * 0.9));
            stemGrad.addColorStop(1, this._adjustColor(this.leafColorSecondary, frond.colorVar * 0.6));
            
            ctx.strokeStyle = stemGrad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(frond.length * 0.5, droop + depth.y, stemEndX + depth.x, stemEndY + droop * 0.5);
            ctx.stroke();

            // Leaflets along stem with gradient
            for (const lf of frond.leaflets) {
                const px = lf.t * stemEndX;
                const py = lf.t * lf.t * droop;

                const leafAngle = lf.side * 0.6;
                const endX = px + Math.cos(leafAngle) * lf.size;
                const endY = py + Math.sin(leafAngle) * lf.size * lf.side;

                // Layer depth: base leaflets (low t) = top/bright, tip leaflets (high t) = darker
                // More aggressive contrast
                const leafDepth = 1 - lf.t * 0.6;
                const brightnessFactor = 0.4 + leafDepth * 0.6;

                if (this.showOutline) {
                    // Gradient outline
                    const outGrad = ctx.createLinearGradient(px, py, endX + depth.x * lf.t, endY + depth.y * lf.t);
                    outGrad.addColorStop(0, this._adjustColor(this.outlineColor, brightnessFactor * 0.7));
                    outGrad.addColorStop(1, this._adjustColor(this.outlineColor, brightnessFactor * 0.5));
                    
                    ctx.strokeStyle = outGrad;
                    ctx.lineWidth = lf.size * 0.4 + this.outlineWidth;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(endX + depth.x * lf.t, endY + depth.y * lf.t);
                    ctx.stroke();
                }

                // Gradient leaf color
                const leafGrad = ctx.createLinearGradient(px, py, endX + depth.x * lf.t, endY + depth.y * lf.t);
                leafGrad.addColorStop(0, this._leafColorWithAlpha(
                    this._adjustColor(this.leafHighlight, brightnessFactor * frond.colorVar), 1
                ));
                leafGrad.addColorStop(0.5, this._leafColorWithAlpha(
                    this._adjustColor(this.leafColor, brightnessFactor * frond.colorVar), 1
                ));
                leafGrad.addColorStop(1, this._leafColorWithAlpha(
                    this._adjustColor(this.leafColorSecondary, brightnessFactor * frond.colorVar * 0.8), 1
                ));
                
                ctx.strokeStyle = leafGrad;
                ctx.lineWidth = lf.size * 0.35;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(endX + depth.x * lf.t, endY + depth.y * lf.t);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Coconuts with subtle gradient
        for (const co of this._coconuts) {
            const coGrad = ctx.createRadialGradient(
                co.x - co.size * 0.3, co.y - co.size * 0.3, 0,
                co.x, co.y, co.size
            );
            coGrad.addColorStop(0, this._adjustColor(this.palmCoconutColor, 1.2));
            coGrad.addColorStop(1, this._adjustColor(this.palmCoconutColor, 0.7));
            
            ctx.fillStyle = coGrad;
            ctx.beginPath();
            ctx.arc(co.x, co.y, co.size, 0, Math.PI * 2);
            ctx.fill();
            if (this.showOutline) {
                ctx.strokeStyle = this._adjustColor(this.palmCoconutColor, 0.5);
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // ─── Willow ───
    _drawWillow(ctx) {
        ctx.lineCap = 'round';

        for (let bi = 0; bi < this._branches.length; bi++) {
            const br = this._branches[bi];
            // Outer branches are "tips" and move less
            const isTipBranch = bi === 0 || bi === this._branches.length - 1;
            const wind = this._getWindWithTip(br.windPhase, 0.7, isTipBranch);
            const depth = this._getDepthOffset(0.6);

            // Main branch direction
            const dirX = Math.cos(br.angle);
            const dirY = Math.sin(br.angle);
            const endX = dirX * br.length + wind.x * 2 + depth.x;
            const endY = dirY * br.length + wind.y * 2 + depth.y;
            const droop = br.length * this.willowDroop * 0.5;

            // Drooping sub-branches with gradient leaves
            for (let si = 0; si < br.subBranches.length; si++) {
                const sub = br.subBranches[si];
                const sx = dirX * br.length * sub.t;
                const sy = dirY * br.length * sub.t;
                const subEndX = sx + Math.cos(br.angle + sub.angle) * sub.length + wind.x * 3;
                const subEndY = sy + Math.sin(br.angle + sub.angle) * sub.length + droop + wind.y * 2;

                // Layer depth: higher sub-branches (lower t) = brighter
                // More aggressive contrast
                const layerDepth = 1 - sub.t * 0.5;
                const brightnessFactor = 0.35 + layerDepth * 0.65;

                if (this.showOutline) {
                    // Gradient outline
                    const outGrad = ctx.createLinearGradient(
                        sx + depth.x * 0.5, sy + depth.y * 0.5,
                        subEndX + depth.x, subEndY + depth.y
                    );
                    outGrad.addColorStop(0, this._adjustColor(this.outlineColor, brightnessFactor * 0.6));
                    outGrad.addColorStop(1, this._adjustColor(this.outlineColor, brightnessFactor * 0.4));
                    
                    ctx.strokeStyle = outGrad;
                    ctx.lineWidth = 3 + this.outlineWidth;
                    ctx.beginPath();
                    ctx.moveTo(sx + depth.x * 0.5, sy + depth.y * 0.5);
                    ctx.quadraticCurveTo(
                        (sx + subEndX) * 0.5 + depth.x, (sy + subEndY) * 0.5 + droop * 0.3 + depth.y,
                        subEndX + depth.x, subEndY + depth.y
                    );
                    ctx.stroke();
                }

                // Gradient leaf stroke
                const leafGrad = ctx.createLinearGradient(
                    sx + depth.x * 0.5, sy + depth.y * 0.5,
                    subEndX + depth.x, subEndY + depth.y
                );
                leafGrad.addColorStop(0, this._leafColorWithAlpha(
                    this._adjustColor(this.leafHighlight, brightnessFactor * br.colorVar), 1
                ));
                leafGrad.addColorStop(0.4, this._leafColorWithAlpha(
                    this._adjustColor(this.leafColor, brightnessFactor * br.colorVar), 1
                ));
                leafGrad.addColorStop(1, this._leafColorWithAlpha(
                    this._adjustColor(this.leafColorSecondary, brightnessFactor * br.colorVar * 0.8), 1
                ));
                
                ctx.strokeStyle = leafGrad;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(sx + depth.x * 0.5, sy + depth.y * 0.5);
                ctx.quadraticCurveTo(
                    (sx + subEndX) * 0.5 + depth.x, (sy + subEndY) * 0.5 + droop * 0.3 + depth.y,
                    subEndX + depth.x, subEndY + depth.y
                );
                ctx.stroke();
            }

            // Main branch line with subtle gradient
            const branchGrad = ctx.createLinearGradient(0, 0, endX * 0.4, endY * 0.4);
            branchGrad.addColorStop(0, this._adjustColor(this.trunkColor, 1.2));
            branchGrad.addColorStop(1, this._adjustColor(this.trunkColor, 0.9));
            
            ctx.strokeStyle = branchGrad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX * 0.4, endY * 0.4);
            ctx.stroke();
        }
    }

    // ─── Dead ───
    _drawDead(ctx) {
        ctx.lineCap = 'round';

        for (const br of this._branches) {
            const wind = this._getWind(br.windPhase, 0.2);

            const dirX = Math.cos(br.angle);
            const dirY = Math.sin(br.angle);
            const endX = dirX * br.length + wind.x;
            const endY = dirY * br.length + wind.y;

            // Branch
            if (this.showOutline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = br.width + this.outlineWidth * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            ctx.strokeStyle = this.deadBarkColor;
            ctx.lineWidth = br.width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Forks
            if (br.forks) {
                for (const f of br.forks) {
                    const fx = dirX * br.length * f.t;
                    const fy = dirY * br.length * f.t;
                    const fEndX = fx + Math.cos(br.angle + f.angle) * f.length + wind.x;
                    const fEndY = fy + Math.sin(br.angle + f.angle) * f.length + wind.y;

                    ctx.strokeStyle = this.deadBarkColor;
                    ctx.lineWidth = br.width * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(fEndX, fEndY);
                    ctx.stroke();
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════════════════════

    toJSON() {
        const json = super.toJSON();
        json.type = 'ProceduralTree';
        json.seed = this.seed;
        json.randomizeSeed = this.randomizeSeed;
        json.treeType = this.treeType;
        json.trunkRadius = this.trunkRadius;
        json.trunkColor = this.trunkColor;
        json.trunkRingColor = this.trunkRingColor;
        json.showRings = this.showRings;
        json.ringCount = this.ringCount;
        json.ringSpacing = this.ringSpacing;
        json.barkDetail = this.barkDetail;
        json.barkLines = this.barkLines;
        json.showTrunkStem = this.showTrunkStem;
        json.trunkStemTaper = this.trunkStemTaper;
        json.trunkStemLength = this.trunkStemLength;
        json.canopySize = this.canopySize;
        json.canopyDensity = this.canopyDensity;
        json.leafColor = this.leafColor;
        json.leafColorSecondary = this.leafColorSecondary;
        json.leafHighlight = this.leafHighlight;
        json.leafTransparency = this.leafTransparency;
        json.showLeaves = this.showLeaves;
        json.oakClusterCount = this.oakClusterCount;
        json.oakClusterSize = this.oakClusterSize;
        json.oakIrregularity = this.oakIrregularity;
        json.pineLayerCount = this.pineLayerCount;
        json.pinePointiness = this.pinePointiness;
        json.pineLayerSpread = this.pineLayerSpread;
        json.palmFrondCount = this.palmFrondCount;
        json.palmFrondLength = this.palmFrondLength;
        json.palmFrondWidth = this.palmFrondWidth;
        json.palmFrondDroop = this.palmFrondDroop;
        json.palmCoconutCount = this.palmCoconutCount;
        json.palmCoconutColor = this.palmCoconutColor;
        json.willowBranchCount = this.willowBranchCount;
        json.willowBranchLength = this.willowBranchLength;
        json.willowDroop = this.willowDroop;
        json.willowDensity = this.willowDensity;
        json.deadBranchCount = this.deadBranchCount;
        json.deadBranchLength = this.deadBranchLength;
        json.deadBranchFork = this.deadBranchFork;
        json.deadBarkColor = this.deadBarkColor;
        json.windEnabled = this.windEnabled;
        json.useWeatherWind = this.useWeatherWind;
        json.windStrength = this.windStrength;
        json.windSpeed = this.windSpeed;
        json.windDirection = this.windDirection;
        json.windTurbulence = this.windTurbulence;
        json.depthEnabled = this.depthEnabled;
        json.treeHeight = this.treeHeight;
        json.depthIntensity = this.depthIntensity;
        json.maxDepthOffset = this.maxDepthOffset;
        json.showOutline = this.showOutline;
        json.outlineWidth = this.outlineWidth;
        json.outlineColor = this.outlineColor;
        json.showShadow = this.showShadow;
        json.shadowColor = this.shadowColor;
        json.shadowOpacity = this.shadowOpacity;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowBlur = this.shadowBlur;
        json.shadowScale = this.shadowScale;
        json.preRender = this.preRender;
        return json;
    }

    static fromJSON(json) {
        const module = new ProceduralTree();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.seed = json.seed ?? 12345;
        module.randomizeSeed = json.randomizeSeed ?? false;
        module.treeType = json.treeType ?? 'oak';
        module.trunkRadius = json.trunkRadius ?? 8;
        module.trunkColor = json.trunkColor ?? '#5a3a1a';
        module.trunkRingColor = json.trunkRingColor ?? '#4a2a0a';
        module.showRings = json.showRings ?? true;
        module.ringCount = json.ringCount ?? 4;
        module.ringSpacing = json.ringSpacing ?? 0.7;
        module.barkDetail = json.barkDetail ?? true;
        module.barkLines = json.barkLines ?? 6;
        module.showTrunkStem = json.showTrunkStem ?? true;
        module.trunkStemTaper = json.trunkStemTaper ?? 0.4;
        module.trunkStemLength = json.trunkStemLength ?? 0.8;
        module.canopySize = json.canopySize ?? 40;
        module.canopyDensity = json.canopyDensity ?? 1.0;
        module.leafColor = json.leafColor ?? '#3a8a3a';
        module.leafColorSecondary = json.leafColorSecondary ?? '#2a7a2a';
        module.leafHighlight = json.leafHighlight ?? '#5aaa5a';
        module.leafTransparency = json.leafTransparency ?? 1.0;
        module.showLeaves = json.showLeaves ?? true;
        module.oakClusterCount = json.oakClusterCount ?? 7;
        module.oakClusterSize = json.oakClusterSize ?? 0.6;
        module.oakIrregularity = json.oakIrregularity ?? 0.3;
        module.pineLayerCount = json.pineLayerCount ?? 4;
        module.pinePointiness = json.pinePointiness ?? 0.7;
        module.pineLayerSpread = json.pineLayerSpread ?? 0.85;
        module.palmFrondCount = json.palmFrondCount ?? 6;
        module.palmFrondLength = json.palmFrondLength ?? 35;
        module.palmFrondWidth = json.palmFrondWidth ?? 8;
        module.palmFrondDroop = json.palmFrondDroop ?? 0.4;
        module.palmCoconutCount = json.palmCoconutCount ?? 3;
        module.palmCoconutColor = json.palmCoconutColor ?? '#8a6a2a';
        module.willowBranchCount = json.willowBranchCount ?? 10;
        module.willowBranchLength = json.willowBranchLength ?? 40;
        module.willowDroop = json.willowDroop ?? 0.8;
        module.willowDensity = json.willowDensity ?? 1.2;
        module.deadBranchCount = json.deadBranchCount ?? 5;
        module.deadBranchLength = json.deadBranchLength ?? 25;
        module.deadBranchFork = json.deadBranchFork ?? true;
        module.deadBarkColor = json.deadBarkColor ?? '#6a5a4a';
        module.windEnabled = json.windEnabled ?? true;
        module.useWeatherWind = json.useWeatherWind ?? true;
        module.windStrength = json.windStrength ?? 1.0;
        module.windSpeed = json.windSpeed ?? 2.0;
        module.windDirection = json.windDirection ?? 0;
        module.windTurbulence = json.windTurbulence ?? 0.3;
        module.depthEnabled = json.depthEnabled ?? true;
        module.treeHeight = json.treeHeight ?? 1.0;
        module.depthIntensity = json.depthIntensity ?? 0.15;
        module.maxDepthOffset = json.maxDepthOffset ?? 12;
        module.showOutline = json.showOutline ?? true;
        module.outlineWidth = json.outlineWidth ?? 1.5;
        module.outlineColor = json.outlineColor ?? '#1a4a1a';
        module.showShadow = json.showShadow ?? true;
        module.shadowColor = json.shadowColor ?? '#000000';
        module.shadowOpacity = json.shadowOpacity ?? 0.3;
        module.shadowOffsetX = json.shadowOffsetX ?? 4;
        module.shadowOffsetY = json.shadowOffsetY ?? 5;
        module.shadowBlur = json.shadowBlur ?? 8;
        module.shadowScale = json.shadowScale ?? 1.0;
        module.preRender = json.preRender ?? false;
        module._generateTree();
        return module;
    }

    clone() {
        return ProceduralTree.fromJSON(this.toJSON());
    }
}

// Register
if (typeof window !== 'undefined') window.ProceduralTree = ProceduralTree;
if (typeof Module !== 'undefined') Module.register('ProceduralTree', ProceduralTree);
