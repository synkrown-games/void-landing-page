/**
 * TDPlacement Module
 * Tower Defense turret placement system
 * Namespace: TowerDefense
 * 
 * Features:
 * - Grid-based or free placement
 * - Preview turret before placing
 * - Placement validation (not on path, etc.)
 * - Turret selection panel with configurable turrets
 * - Uses drawGUI for placement UI
 * - ArrayGroup for flexible turret configuration
 */

class TDPlacement extends Module {
    constructor() {
        super();
        
        // Placement Settings
        this.useGrid = true;
        this.gridSize = 50;
        this.showGrid = true;
        this.gridColor = 'rgba(100, 150, 255, 0.15)';
        this.gridStyle = 'lines'; // 'lines', 'dots', 'corners'
        
        // Turrets Array (using arrayGroup structure)
        this.turrets = [
            { prefab: 'BasicTurret', name: 'Basic', cost: 50, color: '#4488ff', fireRate: 1.0, range: 150, damage: 10, uiImage: '' },
            { prefab: 'FastTurret', name: 'Fast', cost: 75, color: '#44ff88', fireRate: 2.0, range: 120, damage: 5, uiImage: '' },
            { prefab: 'SplashTurret', name: 'Splash', cost: 100, color: '#ff8844', fireRate: 0.5, range: 180, damage: 25, uiImage: '' }
        ];
        
        // UI Settings
        this.showPanel = true;
        this.panelPosition = 'bottom'; // 'bottom', 'right', 'left'
        this.panelStyle = 'modern'; // 'modern', 'classic', 'minimal'
        this.panelBackgroundColor = 'rgba(20, 25, 35, 0.95)';
        this.panelPadding = 10;
        this.buttonSize = 70;
        this.buttonSpacing = 10;
        
        // Path Avoidance
        this.pathAvoidanceRadius = 40;
        
        // Turret Info Panel Settings
        this.infoPanelWidth = 220;
        this.infoPanelBackgroundColor = 'rgba(20, 25, 35, 0.95)';
        this.infoPanelBorderColor = 'rgba(100, 150, 255, 0.5)';

        // Worker Builder
        this.useWorkerBuilder = false;

        // Internal: pending builds (waiting for worker)
        this._pendingBuilds = [];   // [{ x, y, config, id, alpha }]
        this._workerBuilder = null; // set by TDWorkerBuilder on its start()
        this._pendingBuildImage = null;
        this._pendingBuildNextId = 0;
        
        // Internal state
        this._selectedTurretIndex = -1;
        this._previewX = 0;
        this._previewY = 0;
        this._canPlace = false;
        this._gameManager = null;
        this._paths = [];
        this._placedTurrets = [];
        
        // Turret selection state
        this._selectedPlacedTurret = null;
        this._infoPanelBounds = null;
        this._upgradeBtnBounds = null;
        this._sellBtnBounds = null;
        
        this._turretPreviewImages = {}; // { [prefab]: HTMLCanvasElement }
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 30;
    
    static getIcon() {
        return '🏗️';
    }
    
    static getDescription() {
        return 'Allows players to place turrets on the map';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === PLACEMENT SETTINGS ===
            _header_placement: { type: 'header', label: '🛠️ Placement Settings' },
            useGrid: { 
                type: 'boolean', 
                label: 'Grid Snapping', 
                default: true,
                hint: 'Snap turret placement to grid'
            },
            gridSize: { 
                type: 'slider', 
                label: 'Grid Size', 
                default: 50, 
                min: 25, 
                max: 100,
                hint: 'Size of placement grid cells'
            },
            pathAvoidanceRadius: { 
                type: 'slider', 
                label: 'Path Clearance', 
                default: 40, 
                min: 10, 
                max: 100,
                hint: 'Minimum distance from path'
            },

            _header_worker: { type: 'header', label: '👷 Worker Builder' },
            useWorkerBuilder: {
                type: 'boolean',
                label: 'Use Worker Builder',
                default: false,
                hint: 'If a TDWorkerBuilder is in the scene, turrets are built by the worker instead of spawning instantly'
            },
            
            // === GRID DISPLAY ===
            _header_grid: { type: 'header', label: '🗒️ Grid Display' },
            showGrid: { 
                type: 'boolean', 
                label: 'Show Grid', 
                default: true
            },
            gridColor: { 
                type: 'color', 
                label: 'Grid Color', 
                default: 'rgba(100,150,255,0.15)',
                hint: 'Color of grid lines'
            },
            gridStyle: {
                type: 'select',
                label: 'Grid Style',
                default: 'lines',
                options: ['lines', 'dots', 'corners'],
                hint: 'Visual style of the placement grid'
            },
            
            // === TURRETS CONFIGURATION ===
            _header_turrets: { type: 'header', label: '🔫 Available Turrets' },
            turrets: {
                type: 'arrayGroup',
                label: 'Turret Types',
                itemLabel: 'Turret',
                minItems: 1,
                itemProperties: [
                    { key: 'prefab', label: 'Prefab', type: 'prefab', default: '', hint: 'Turret prefab to spawn' },
                    { key: 'name', label: 'Display Name', type: 'text', default: 'Turret', hint: 'Name shown in UI' },
                    { key: 'cost', label: 'Cost', type: 'number', default: 50, min: 0, hint: 'Purchase cost' },
                    { key: 'color', label: 'Button Color', type: 'color', default: '#4488ff', hint: 'Color for button/preview' },
                    { key: 'uiImage', label: 'Button Image', type: 'image', default: '', hint: 'Custom image for button (optional)' },
                    { key: 'generateImage', label: 'Auto-generate Image', type: 'boolean', default: '', hint: 'Generate image based on turret (optional)' },
                    { key: 'previewScale', label: 'Preview Scale', type: 'number', default: 0.5, min: 0.1, max: 5, step: 0.1, hint: 'Scale multiplier for the auto-generated preview image' },
                    { key: 'fireRate', label: 'Fire Rate', type: 'number', default: 1.0, min: 0.1, max: 10, step: 0.1, hint: 'Shots per second' },
                    { key: 'range', label: 'Range', type: 'slider', default: 150, min: 50, max: 500, hint: 'Attack range' },
                    { key: 'damage', label: 'Damage', type: 'number', default: 10, min: 1, hint: 'Damage per shot' }
                ],
                hint: 'Configure turrets available for placement'
            },
            
            // === TURRET PANEL ===
            _header_panel: { type: 'header', label: '📱 Turret Panel' },
            showPanel: { 
                type: 'boolean', 
                label: 'Show Panel', 
                default: true
            },
            panelPosition: { 
                type: 'select', 
                label: 'Panel Position', 
                default: 'bottom',
                options: ['bottom', 'right', 'left'],
                hint: 'Where to display turret selection'
            },
            panelStyle: {
                type: 'select',
                label: 'Panel Style',
                default: 'modern',
                options: ['modern', 'classic', 'minimal'],
                hint: 'Visual style of the panel'
            },
            buttonSize: { 
                type: 'slider', 
                label: 'Button Size', 
                default: 70, 
                min: 40, 
                max: 100,
                hint: 'Size of turret selection buttons'
            }
        };
    }
    
    // Helper getters for backwards compatibility
    get turretPrefabs() {
        return this.turrets.map(t => t.prefab);
    }
    get turretCosts() {
        return this.turrets.map(t => t.cost);
    }
    get turretColors() {
        return this.turrets.map(t => t.color);
    }
    get turretNames() {
        return this.turrets.map(t => t.name);
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._selectedTurretIndex = -1;
        this._canPlace = false;
        this._placedTurrets = [];
        
        // Find game manager
        this._gameManager = TDGameManager.findManager();
        
        // Find all paths
        if (this._gameManager) {
            this._paths = this._gameManager.getPaths();
        }

        this._pendingBuilds = [];
        this._pendingBuildNextId = 0;
        this._workerBuilder = null;
        this._pendingBuildImage = this._generatePendingBuildImage();

        // Find worker builder if useWorkerBuilder is on
        if (this.useWorkerBuilder) {
            const wm = typeof findModule === 'function' ? findModule('TDWorkerBuilder') : null;
            if (wm) { this._workerBuilder = wm; wm._placement = this; }
        }

        this._generateTurretPreviews();
        
        //console.log('🏗️ TDPlacement initialized');
    }
    
    loop(deltaTime) {
        // Update preview position from mouse
        const mousePos = typeof mousePosition === 'function' ? mousePosition() : { x: 0, y: 0 };
        const mouseScreenPos = typeof mousePositionScreen === 'function' ? mousePositionScreen() : { x: 0, y: 0 };
        
        // Lazily re-find worker each frame until connected
        if (this.useWorkerBuilder && !this._workerBuilder) {
            const wm = typeof findModule === 'function' ? findModule('TDWorkerBuilder') : null;
            if (wm) {
                this._workerBuilder = wm;
                this._workerBuilder._placement = this;
            }
        }
        
        // Also track touch position for preview
        let touchScreenPos = null;
        let touchWorldPos = null;
        if (typeof touchGetAll === 'function') {
            const touches = touchGetAll();
            if (touches.length > 0) {
                touchScreenPos = { x: touches[0].x, y: touches[0].y };
                // Convert touch screen pos to world pos
                touchWorldPos = this.screenToWorld(touchScreenPos.x, touchScreenPos.y);
            }
        }

        // Fade pending builds as worker approaches
        if (this.useWorkerBuilder && this._workerBuilder && this._pendingBuilds.length > 0) {
            for (const pb of this._pendingBuilds) {
                const wx  = this._workerBuilder.x ?? 0;
                const wy  = this._workerBuilder.y ?? 0;
                const dx  = wx - pb.x;
                const dy  = wy - pb.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const fadeStart = (this._workerBuilder.buildRadius ?? 30) * 2.5;
                const fadeEnd   = (this._workerBuilder.buildRadius ?? 30) * 0.6;

                if (dist < fadeStart) {
                    pb.alpha = Math.max(0, (dist - fadeEnd) / (fadeStart - fadeEnd));
                } else {
                    pb.alpha = 1.0;
                }
            }
        }
        
        // Use touch position for preview if available, otherwise mouse
        const previewWorldPos = touchWorldPos || mousePos;
        
        if (this.useGrid) {
            this._previewX = Math.floor(previewWorldPos.x / this.gridSize) * this.gridSize + this.gridSize / 2;
            this._previewY = Math.floor(previewWorldPos.y / this.gridSize) * this.gridSize + this.gridSize / 2;
        } else {
            this._previewX = previewWorldPos.x;
            this._previewY = previewWorldPos.y;
        }
        
        // Check if can place
        this._canPlace = this.canPlaceAt(this._previewX, this._previewY);
        
        // Check for GUI button clicks FIRST (using screen coordinates)
        // Support both mouse and touch
        const mouseClicked = typeof guiMousePressed === 'function' ? guiMousePressed(0) : 
                            (typeof mousePressed === 'function' ? mousePressed(0) : false);
        const touchClicked = typeof touchStarted === 'function' && touchStarted();
        const guiClicked = mouseClicked || touchClicked;
        
        // Get interaction screen position (touch takes priority)
        const interactionScreenPos = touchScreenPos || mouseScreenPos;
        
        // Check info panel button clicks first
        if (guiClicked && this._selectedPlacedTurret) {
            if (this.isClickOnInfoPanel(interactionScreenPos)) {
                // Handled inside isClickOnInfoPanel
                return;
            }
        }
        
        if (guiClicked && this.isClickOnPanel(interactionScreenPos)) {
            // Button click handled in isClickOnPanel, don't process as placement
            return;
        }
        
        // Handle left click or touch
        if (mousePressed(0) || touchClicked) {
            const interactionWorldPos = touchWorldPos || mousePos;
            
            // If we have a turret to place, try to place it
            if (this._selectedTurretIndex >= 0) {
                this.attemptPlacement();
            } else {
                // Try to select a placed turret
                const clickedTurret = this.getTurretAtPosition(interactionWorldPos.x, interactionWorldPos.y);
                if (clickedTurret) {
                    this.selectPlacedTurret(clickedTurret);
                } else {
                    // Clicked on empty space - deselect
                    this.deselectPlacedTurret();
                }
            }
        }
        
        // Cancel selection with right click or Escape
        if (mousePressed(2) || keyPressed('Escape')) {
            this._selectedTurretIndex = -1;
            this.deselectPlacedTurret();
        }
        
        // Number keys for quick selection
        for (let i = 0; i < this.turretPrefabs.length && i < 9; i++) {
            if (keyPressed(`Digit${i + 1}`)) {
                this.selectTurret(i);
                this.deselectPlacedTurret(); // Deselect placed turret when selecting new turret to place
            }
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const engine = this.gameObject?._engine || (typeof getEngine === 'function' ? getEngine() : null);
        if (engine && engine.screenToWorld) {
            return engine.screenToWorld(screenX, screenY);
        }
        // Fallback - just return screen coords
        return { x: screenX, y: screenY };
    }
    
    draw(ctx) {
        // Switch to world-space drawing (not relative to game object position)
        this.drawUntethered(ctx);
        
        // Draw grid
        if (this.showGrid) {
            this.drawGrid(ctx);
        }

        // Draw pending build previews
        if (this._pendingBuilds.length > 0) {
            this._drawPendingBuilds(ctx);
        }
        
        // Draw preview if turret selected
        if (this._selectedTurretIndex >= 0) {
            this.drawPreview(ctx);
        }
        
        // Return to object-space drawing
        this.drawTethered(ctx);
    }
    
    drawGrid(ctx) {
        ctx.save();
        
        // Get viewport bounds for grid drawing
        let viewX = 0, viewY = 0, viewWidth = 800, viewHeight = 600;
        let zoom = 1;
        
        if (this.engine && this.engine.viewport) {
            viewX = this.engine.viewport.x;
            viewY = this.engine.viewport.y;
            zoom = this.engine.viewport.zoom || 1;
            viewWidth = this.engine.viewport.width / zoom;
            viewHeight = this.engine.viewport.height / zoom;
        }
        
        // Align grid to gridSize intervals
        const startX = Math.floor(viewX / this.gridSize) * this.gridSize;
        const startY = Math.floor(viewY / this.gridSize) * this.gridSize;
        const endX = viewX + viewWidth + this.gridSize;
        const endY = viewY + viewHeight + this.gridSize;
        
        switch (this.gridStyle) {
            case 'dots':
                this.drawDotGrid(ctx, startX, startY, endX, endY);
                break;
            case 'corners':
                this.drawCornerGrid(ctx, startX, startY, endX, endY);
                break;
            case 'lines':
            default:
                this.drawLineGrid(ctx, startX, startY, endX, endY);
        }
        
        ctx.restore();
    }
    
    drawLineGrid(ctx, startX, startY, endX, endY) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }
    
    drawDotGrid(ctx, startX, startY, endX, endY) {
        ctx.fillStyle = this.gridColor.replace('0.15', '0.4');
        
        for (let x = startX; x <= endX; x += this.gridSize) {
            for (let y = startY; y <= endY; y += this.gridSize) {
                ctx.beginPath();
                ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawCornerGrid(ctx, startX, startY, endX, endY) {
        ctx.strokeStyle = this.gridColor.replace('0.15', '0.3');
        ctx.lineWidth = 1;
        const cornerSize = 8;
        
        for (let x = startX; x <= endX; x += this.gridSize) {
            for (let y = startY; y <= endY; y += this.gridSize) {
                // Top-left corner
                ctx.beginPath();
                ctx.moveTo(x, y + cornerSize);
                ctx.lineTo(x, y);
                ctx.lineTo(x + cornerSize, y);
                ctx.stroke();
                
                // Top-right corner
                ctx.beginPath();
                ctx.moveTo(x + this.gridSize - cornerSize, y);
                ctx.lineTo(x + this.gridSize, y);
                ctx.lineTo(x + this.gridSize, y + cornerSize);
                ctx.stroke();
                
                // Bottom-left corner
                ctx.beginPath();
                ctx.moveTo(x, y + this.gridSize - cornerSize);
                ctx.lineTo(x, y + this.gridSize);
                ctx.lineTo(x + cornerSize, y + this.gridSize);
                ctx.stroke();
                
                // Bottom-right corner
                ctx.beginPath();
                ctx.moveTo(x + this.gridSize - cornerSize, y + this.gridSize);
                ctx.lineTo(x + this.gridSize, y + this.gridSize);
                ctx.lineTo(x + this.gridSize, y + this.gridSize - cornerSize);
                ctx.stroke();
            }
        }
    }
    
    drawPreview(ctx) {
        const idx    = this._selectedTurretIndex;
        const config = this.turrets[idx] || {};
        const color  = config.color || '#ffffff';
    
        ctx.save();
        ctx.translate(this._previewX, this._previewY);
        ctx.globalAlpha = 0.7;
    
        // Draw range circle with gradient
        const range = config.range || 150;
        const rangeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
        if (this._canPlace) {
            rangeGradient.addColorStop(0,   'rgba(100, 255, 100, 0.05)');
            rangeGradient.addColorStop(0.7, 'rgba(100, 255, 100, 0.1)');
            rangeGradient.addColorStop(1,   'rgba(100, 255, 100, 0.2)');
        } else {
            rangeGradient.addColorStop(0,   'rgba(255, 100, 100, 0.05)');
            rangeGradient.addColorStop(0.7, 'rgba(255, 100, 100, 0.1)');
            rangeGradient.addColorStop(1,   'rgba(255, 100, 100, 0.2)');
        }
        ctx.fillStyle = rangeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, range, 0, Math.PI * 2);
        ctx.fill();
    
        // Range border
        ctx.strokeStyle = this._canPlace ? 'rgba(100, 255, 100, 0.6)' : 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // --- Draw turret body: cached preview image OR fallback shape ---
        const previewData = config.generateImage
            ? this._turretPreviewImages[config.prefab]
            : null;

        if (previewData && previewData.canvas) {
            const maxSize = 64 * (config.previewScale ?? 1.0);
            const scale   = Math.min(maxSize / previewData.width, maxSize / previewData.height);
            ctx.globalAlpha = this._canPlace ? 0.85 : 0.5;
            ctx.drawImage(
                previewData.canvas,
                previewData.offsetX * scale,
                previewData.offsetY * scale,
                previewData.width   * scale,
                previewData.height  * scale
            );
            ctx.globalAlpha = 0.7;
        } else {
            // Fallback: original circle + barrel
            const turretGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 25);
            turretGradient.addColorStop(0, this.lightenColor(color, 30));
            turretGradient.addColorStop(1, color);
            ctx.fillStyle   = turretGradient;
            ctx.strokeStyle = this._canPlace ? '#88ff88' : '#ff8888';
            ctx.lineWidth   = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.roundRect(8, -4, 22, 8, 2);
            ctx.fill();
        }
    
        // Valid / invalid overlay
        if (!this._canPlace) {
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth   = 4;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(-12, -12); ctx.lineTo(12,  12);
            ctx.moveTo( 12, -12); ctx.lineTo(-12, 12);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#44ff44';
            ctx.lineWidth   = 3;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.beginPath();
            ctx.moveTo(-8, 0); ctx.lineTo(-2, 6); ctx.lineTo(10, -6);
            ctx.stroke();
        }
    
        ctx.restore();
    }
    
    // Color helper
    lightenColor(color, percent) {
        if (!color || color.startsWith('rgba') || color.startsWith('rgb')) return color || '#ffffff';
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
        } catch (e) { return color; }
    }
    
    drawGUI(ctx) {
        if (!this.showPanel) return;
        
        const canvas = ctx.canvas;
        
        // Calculate panel dimensions
        const numTurrets = this.turretPrefabs.length;
        const panelWidth = this.panelPosition === 'bottom' 
            ? numTurrets * (this.buttonSize + this.buttonSpacing) + this.buttonSpacing
            : this.buttonSize + this.panelPadding * 2;
        const panelHeight = this.panelPosition === 'bottom'
            ? this.buttonSize + this.panelPadding * 2
            : numTurrets * (this.buttonSize + this.buttonSpacing) + this.buttonSpacing;
        
        // Calculate panel position
        let panelX, panelY;
        switch (this.panelPosition) {
            case 'bottom':
                panelX = (canvas.width - panelWidth) / 2;
                panelY = canvas.height - panelHeight - 10;
                break;
            case 'right':
                panelX = canvas.width - panelWidth - 10;
                panelY = (canvas.height - panelHeight) / 2;
                break;
            case 'left':
                panelX = 10;
                panelY = (canvas.height - panelHeight) / 2;
                break;
        }
        
        ctx.save();
        
        // Draw panel background
        ctx.fillStyle = this.panelBackgroundColor;
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Draw turret buttons
        const isHorizontal = this.panelPosition === 'bottom';
        
        for (let i = 0; i < numTurrets; i++) {
            const buttonX = isHorizontal 
                ? panelX + this.buttonSpacing + i * (this.buttonSize + this.buttonSpacing)
                : panelX + this.panelPadding;
            const buttonY = isHorizontal
                ? panelY + this.panelPadding
                : panelY + this.buttonSpacing + i * (this.buttonSize + this.buttonSpacing);
            
            this.drawTurretButton(ctx, i, buttonX, buttonY);
        }
        
        // Draw selection info
        if (this._selectedTurretIndex >= 0) {
            const name = this.turretNames[this._selectedTurretIndex] || 'Turret';
            const cost = this.turretCosts[this._selectedTurretIndex] || 0;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${name} - $${cost}`, canvas.width / 2, panelY - 10);
            ctx.fillText('Left-click to place, Right-click to cancel', canvas.width / 2, panelY - 30);
        }
        
        // Draw turret info panel if a placed turret is selected
        if (this._selectedPlacedTurret) {
            this.drawTurretInfoPanel(ctx, canvas);
        }
        
        ctx.restore();
    }
    
    drawTurretInfoPanel(ctx, canvas) {
        const turretModule = this._selectedPlacedTurret.turretModule;
        if (!turretModule) return;
        
        const stats = turretModule.getStats();
        const description = turretModule.description || 'No description';
        const turretName = this._selectedPlacedTurret.config?.name || 'Turret';
        
        // Panel dimensions
        const panelWidth = this.infoPanelWidth;
        const panelHeight = 280;
        const padding = 12;
        const panelX = canvas.width - panelWidth - 15;
        const panelY = 80;
        
        // Store bounds for click detection
        this._infoPanelBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
        
        // Panel background
        ctx.fillStyle = this.infoPanelBackgroundColor;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
        ctx.fill();
        
        // Panel border
        ctx.strokeStyle = this.infoPanelBorderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Header with name and level
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Segoe UI", Arial';
        ctx.textAlign = 'left';
        ctx.fillText(turretName, panelX + padding, panelY + padding + 14);
        
        // Level badge
        const levelText = `Lv.${stats.level + 1}`;
        ctx.font = 'bold 12px "Segoe UI", Arial';
        ctx.fillStyle = stats.level >= stats.maxLevel ? '#ffd700' : '#88ccff';
        ctx.textAlign = 'right';
        ctx.fillText(levelText, panelX + panelWidth - padding, panelY + padding + 14);
        
        // Level stars/progress
        ctx.textAlign = 'left';
        let starY = panelY + padding + 32;
        ctx.fillStyle = '#666666';
        ctx.font = '12px Arial';
        let stars = '';
        for (let i = 0; i < stats.maxLevel; i++) {
            stars += i < stats.level ? '★' : '☆';
        }
        ctx.fillStyle = '#ffd700';
        ctx.fillText(stars, panelX + padding, starY);
        
        // Separator line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + padding, starY + 10);
        ctx.lineTo(panelX + panelWidth - padding, starY + 10);
        ctx.stroke();
        
        // Description
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px "Segoe UI", Arial';
        const descY = starY + 28;
        // Word wrap description
        const words = description.split(' ');
        let line = '';
        let lineY = descY;
        const maxWidth = panelWidth - padding * 2;
        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, panelX + padding, lineY);
                line = word + ' ';
                lineY += 16;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, panelX + padding, lineY);
        
        // Stats section
        const statsY = lineY + 30;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px "Segoe UI", Arial';
        ctx.fillText('Stats:', panelX + padding, statsY);
        
        const statLineHeight = 20;
        let statY = statsY + statLineHeight;
        
        // Damage
        ctx.fillStyle = '#ff8866';
        ctx.font = '12px "Segoe UI", Arial';
        ctx.fillText(`⚔️ Damage: ${stats.damage}`, panelX + padding, statY);
        statY += statLineHeight;
        
        // Range
        ctx.fillStyle = '#66ff88';
        ctx.fillText(`🎯 Range: ${stats.range}`, panelX + padding, statY);
        statY += statLineHeight;
        
        // Fire Rate
        ctx.fillStyle = '#88ccff';
        ctx.fillText(`💨 Fire Rate: ${stats.fireRate.toFixed(1)}/s`, panelX + padding, statY);
        statY += statLineHeight;
        
        // Sell Value
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`💰 Sell Value: $${stats.sellValue}`, panelX + padding, statY);
        
        // Buttons
        const btnWidth = (panelWidth - padding * 3) / 2;
        const btnHeight = 36;
        const btnY = panelY + panelHeight - btnHeight - padding;
        
        // Upgrade button
        const upgradeBtnX = panelX + padding;
        const canUpgrade = !turretModule.isMaxLevel() && this._gameManager?.canAfford(stats.nextUpgradeCost);
        const isMaxLevel = turretModule.isMaxLevel();
        
        this._upgradeBtnBounds = { x: upgradeBtnX, y: btnY, width: btnWidth, height: btnHeight };
        
        // Upgrade button background
        if (isMaxLevel) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        } else if (canUpgrade) {
            ctx.fillStyle = 'rgba(50, 150, 50, 0.9)';
        } else {
            ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
        }
        ctx.beginPath();
        ctx.roundRect(upgradeBtnX, btnY, btnWidth, btnHeight, 6);
        ctx.fill();
        ctx.strokeStyle = isMaxLevel ? '#666666' : (canUpgrade ? '#88ff88' : '#666666');
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Upgrade button text
        ctx.fillStyle = isMaxLevel ? '#888888' : (canUpgrade ? '#ffffff' : '#999999');
        ctx.font = 'bold 12px "Segoe UI", Arial';
        ctx.textAlign = 'center';
        if (isMaxLevel) {
            ctx.fillText('MAX LEVEL', upgradeBtnX + btnWidth / 2, btnY + btnHeight / 2 + 4);
        } else {
            ctx.fillText(`⬆️ $${stats.nextUpgradeCost}`, upgradeBtnX + btnWidth / 2, btnY + btnHeight / 2 + 4);
        }
        
        // Sell button
        const sellBtnX = panelX + padding * 2 + btnWidth;
        this._sellBtnBounds = { x: sellBtnX, y: btnY, width: btnWidth, height: btnHeight };
        
        ctx.fillStyle = 'rgba(150, 50, 50, 0.9)';
        ctx.beginPath();
        ctx.roundRect(sellBtnX, btnY, btnWidth, btnHeight, 6);
        ctx.fill();
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Sell button text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`💰 Sell`, sellBtnX + btnWidth / 2, btnY + btnHeight / 2 + 4);
        
        ctx.textAlign = 'left';
    }
    
    drawTurretButton(ctx, index, x, y) {
        const turretConfig = this.turrets[index] || {};
        const color = turretConfig.color || '#ffffff';
        const cost = turretConfig.cost || 0;
        const name = turretConfig.name || `T${index + 1}`;
        const uiImage = turretConfig.uiImage || '';
        const canAfford = this._gameManager ? this._gameManager.canAfford(cost) : true;
        const isSelected = this._selectedTurretIndex === index;
        
        ctx.save();
        
        // Button background with gradient
        const bgGradient = ctx.createLinearGradient(x, y, x, y + this.buttonSize);
        if (isSelected) {
            bgGradient.addColorStop(0, 'rgba(100, 200, 100, 0.8)');
            bgGradient.addColorStop(1, 'rgba(60, 150, 60, 0.9)');
        } else if (!canAfford) {
            bgGradient.addColorStop(0, 'rgba(80, 40, 40, 0.9)');
            bgGradient.addColorStop(1, 'rgba(50, 25, 25, 0.95)');
        } else {
            bgGradient.addColorStop(0, 'rgba(60, 65, 80, 0.9)');
            bgGradient.addColorStop(1, 'rgba(40, 45, 55, 0.95)');
        }
        
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, this.buttonSize, this.buttonSize, 8);
        ctx.fill();
        
        // Border with glow for selected
        if (isSelected) {
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
        }
        ctx.strokeStyle = isSelected ? '#88ff88' : (canAfford ? '#666677' : '#883333');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Calculate icon area with padding
        const iconPadding = 6;
        const textAreaHeight = 28; // Space for name and cost at bottom
        const iconAreaX = x + iconPadding;
        const iconAreaY = y + iconPadding;
        const iconAreaWidth = this.buttonSize - iconPadding * 2;
        const iconAreaHeight = this.buttonSize - iconPadding * 2 - textAreaHeight;
        const centerX = x + this.buttonSize / 2;
        const centerY = y + iconPadding + iconAreaHeight / 2;

        let customImage = null;

        // 1. Explicit uiImage asset takes priority
        if (turretConfig.uiImage) {
            const engine = this.gameObject?._engine;
            if (engine && engine.assets) {
                const fileName = turretConfig.uiImage.split('/').pop().split('\\').pop();
                customImage = engine.assets.getImage(fileName);
            }
        }

        // 2. Fall back to the auto-generated preview canvas
        if (!customImage && turretConfig.generateImage) {
            const previewData = this._turretPreviewImages[turretConfig.prefab];
            if (previewData) customImage = previewData.canvas;
        }
        
        if (customImage && turretConfig.generateImage && !turretConfig.uiImage) {
            // Auto-generated preview — honour previewScale
            const scale      = turretConfig.previewScale ?? 0.5;
            const scaledW    = customImage.width  * scale;
            const scaledH    = customImage.height * scale;
            const drawX      = centerX - scaledW / 2;
            const drawY      = centerY - scaledH / 2;
        
            // Clip to icon area so oversized previews don't bleed into the name/cost strip
            ctx.save();
            ctx.beginPath();
            ctx.rect(iconAreaX, iconAreaY, iconAreaWidth, iconAreaHeight);
            ctx.clip();
            ctx.globalAlpha = canAfford ? 1.0 : 0.5;
            ctx.drawImage(customImage, drawX, drawY, scaledW, scaledH);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        
        } else if (customImage) {
            // Explicit uiImage asset — existing aspect-ratio fit logic
            ctx.globalAlpha = canAfford ? 1.0 : 0.5;
        
            const imgAspect  = customImage.width / customImage.height;
            const areaAspect = iconAreaWidth / iconAreaHeight;
            let drawWidth, drawHeight, drawX, drawY;
        
            if (imgAspect > areaAspect) {
                drawWidth  = iconAreaWidth;
                drawHeight = iconAreaWidth / imgAspect;
                drawX      = iconAreaX;
                drawY      = iconAreaY + (iconAreaHeight - drawHeight) / 2;
            } else {
                drawHeight = iconAreaHeight;
                drawWidth  = iconAreaHeight * imgAspect;
                drawX      = iconAreaX + (iconAreaWidth - drawWidth) / 2;
                drawY      = iconAreaY;
            }
        
            ctx.drawImage(customImage, drawX, drawY, drawWidth, drawHeight);
            ctx.globalAlpha = 1.0;
        
        } else {
            // Draw default turret icon with gradient
            const iconSize = this.buttonSize * 0.25;
            
            const turretGradient = ctx.createRadialGradient(
                centerX - iconSize * 0.3, centerY - iconSize * 0.3, 0,
                centerX, centerY, iconSize
            );
            turretGradient.addColorStop(0, canAfford ? this.lightenColor(color, 40) : '#888888');
            turretGradient.addColorStop(1, canAfford ? color : '#555555');
            
            ctx.fillStyle = turretGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = canAfford ? '#333333' : '#444444';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Barrel
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.roundRect(centerX + iconSize * 0.3, centerY - 3, iconSize, 6, 2);
            ctx.fill();
        }
        
        // Name
        ctx.fillStyle = canAfford ? '#ffffff' : '#888888';
        ctx.font = `bold ${Math.max(10, this.buttonSize * 0.16)}px 'Segoe UI', Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, centerX, y + this.buttonSize - 22);
        
        // Cost with icon
        ctx.fillStyle = canAfford ? '#ffcc00' : '#ff6666';
        ctx.font = `bold ${Math.max(10, this.buttonSize * 0.18)}px 'Segoe UI', Arial`;
        ctx.fillText(`$${cost}`, centerX, y + this.buttonSize - 8);
        
        // Hotkey badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, 18, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#cccccc';
        ctx.font = `bold 11px 'Segoe UI', Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, x + 12, y + 12);
        
        ctx.restore();
        
        // Store button bounds for click detection
        this._buttonBounds = this._buttonBounds || [];
        this._buttonBounds[index] = { x, y, width: this.buttonSize, height: this.buttonSize };
    }

    _generatePendingBuildImage() {
        const gs = this.gridSize || 50;
        const canvas = document.createElement('canvas');
        canvas.width  = gs;
        canvas.height = gs;
        const ctx = canvas.getContext('2d');
    
        const dotRadius = 4;
        const margin    = 10;
        const positions = [
            { x: margin,      y: margin },
            { x: gs - margin, y: margin },
            { x: margin,      y: gs - margin },
            { x: gs - margin, y: gs - margin }
        ];
    
        for (const pos of positions) {
            // Outer wood-brown circle
            const grad = ctx.createRadialGradient(pos.x - 1, pos.y - 1, 0, pos.x, pos.y, dotRadius);
            grad.addColorStop(0, '#c8853a');
            grad.addColorStop(1, '#7a4a18');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
    
            // Dark ring
            ctx.strokeStyle = '#4a2800';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    
        // Dashed construction outline
        ctx.strokeStyle = 'rgba(200, 140, 60, 0.55)';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(margin, margin, gs - margin * 2, gs - margin * 2);
        ctx.setLineDash([]);
    
        // Centre cross-hair (pre-construction marker)
        ctx.strokeStyle = 'rgba(200, 140, 60, 0.35)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(gs / 2 - 6, gs / 2); ctx.lineTo(gs / 2 + 6, gs / 2);
        ctx.moveTo(gs / 2, gs / 2 - 6); ctx.lineTo(gs / 2, gs / 2 + 6);
        ctx.stroke();
    
        return canvas;
    }
    
    // ==================== PLACEMENT LOGIC ====================
    
    selectTurret(index) {
        if (index < 0 || index >= this.turretPrefabs.length) return;
        
        const cost = this.turretCosts[index] || 0;
        if (this._gameManager && !this._gameManager.canAfford(cost)) {
            //console.log('❌ Cannot afford this turret!');
            return;
        }
        
        this._selectedTurretIndex = index;
        //console.log('🔫 Selected turret:', this.turretNames[index] || this.turretPrefabs[index]);
    }
    
    canPlaceAt(x, y) {
        // Check if too close to path
        for (const path of this._paths) {
            if (this.isOnPath(path, x, y)) {
                return false;
            }
        }
        
        if (instanceAtPoint(x, y)) {
        	return false;
        }
        
        // Check if too close to another turret
        for (const turret of this._placedTurrets) {
            const dx = turret.x - x;
            const dy = turret.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.gridSize * 0.9) {
                return false;
            }
        }
        
        return true;
    }
    
    isOnPath(pathModule, x, y) {
        if (!pathModule) return false;
        
        const path = pathModule.getPath();
        if (!path || path.length < 2) return false;
        
        // Check distance to each path segment
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
            if (dist < this.pathAvoidanceRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
            // Segment is a point
            return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        }
        
        // Project point onto line segment
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
    }
    
    attemptPlacement() {
        if (this._selectedTurretIndex < 0) return;
        if (!this._canPlace) return;
    
        const turretConfig = this.turrets[this._selectedTurretIndex];
        if (!turretConfig) return;
    
        const cost = turretConfig.cost || 0;
        if (this._gameManager && !this._gameManager.spendMoney(cost)) return;
    
        const px = this._previewX;
        const py = this._previewY;
    
        // Try to connect worker if not yet linked
        if (this.useWorkerBuilder && !this._workerBuilder) {
            const wm = typeof findModule === 'function' ? findModule('TDWorkerBuilder') : null;
            if (wm) { this._workerBuilder = wm; wm._placement = this; }
        }
    
        if (this.useWorkerBuilder && this._workerBuilder) {
            const id = this._pendingBuildNextId++;
            const pending = { x: px, y: py, config: turretConfig, id, alpha: 1.0 };
            this._pendingBuilds.push(pending);
            this._placedTurrets.push({ x: px, y: py, object: null, config: turretConfig, turretModule: null, _pending: true });
            this._workerBuilder.enqueueBuild(pending.x, pending.y, pending);
        } else {
            this._spawnTurret(px, py, turretConfig);
        }
    }
    
    isClickOnPanel(screenPos) {
        // Use provided position or fall back to mouse position
        const clickPos = screenPos || (typeof mousePositionScreen === 'function' ? mousePositionScreen() : { x: 0, y: 0 });
        
        if (!this._buttonBounds) return false;
        
        for (const bounds of this._buttonBounds) {
            if (bounds && 
                clickPos.x >= bounds.x && clickPos.x <= bounds.x + bounds.width &&
                clickPos.y >= bounds.y && clickPos.y <= bounds.y + bounds.height) {
                // Find which button was clicked
                const index = this._buttonBounds.indexOf(bounds);
                if (index >= 0) {
                    this.selectTurret(index);
                }
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== TURRET SELECTION ====================
    
    getTurretAtPosition(worldX, worldY) {
        // Check if clicking on a placed turret
        for (const placed of this._placedTurrets) {
            if (!placed.object) continue;
            
            const turretModule = placed.object.getModule ? placed.object.getModule('TDTurret') : null;
            const turretSize = turretModule ? turretModule.turretSize : 24;
            const clickRadius = turretSize * 1.2; // Slightly larger for easier clicking
            
            const dx = worldX - placed.x;
            const dy = worldY - placed.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= clickRadius) {
                return {
                    ...placed,
                    turretModule: turretModule
                };
            }
        }
        return null;
    }
    
    selectPlacedTurret(turretData) {
        // Deselect previous turret
        if (this._selectedPlacedTurret && this._selectedPlacedTurret.turretModule) {
            this._selectedPlacedTurret.turretModule.setSelected(false);
        }
        
        this._selectedPlacedTurret = turretData;
        this._selectedTurretIndex = -1; // Clear placement selection
        
        // Mark turret as selected (shows range)
        if (turretData.turretModule) {
            turretData.turretModule.setSelected(true);
        }
        
        //console.log('🎯 Selected placed turret:', turretData.config?.name || 'Turret');
    }
    
    deselectPlacedTurret() {
        if (this._selectedPlacedTurret && this._selectedPlacedTurret.turretModule) {
            this._selectedPlacedTurret.turretModule.setSelected(false);
        }
        this._selectedPlacedTurret = null;
        this._infoPanelBounds = null;
        this._upgradeBtnBounds = null;
        this._sellBtnBounds = null;
    }

    _spawnTurret(px, py, turretConfig) {
        let turret = null;
        if (typeof instanceCreate === 'function') {
            turret = instanceCreate(turretConfig.prefab, px, py);
        }
    
        if (turret) {
            const turretModule = turret.getModule ? turret.getModule('TDTurret') : null;
            if (turretModule) {
                if (turretConfig.fireRate !== undefined) {
                    turretModule.fireRate      = turretConfig.fireRate;
                    turretModule._baseFireRate = turretConfig.fireRate;
                }
                if (turretConfig.range !== undefined) {
                    turretModule.range      = turretConfig.range;
                    turretModule._baseRange = turretConfig.range;
                }
                if (turretConfig.damage !== undefined) {
                    turretModule.damage      = turretConfig.damage;
                    turretModule._baseDamage = turretConfig.damage;
                }
            }
    
            this._placedTurrets.push({
                x: px, y: py,
                object: turret,
                config: turretConfig,
                turretModule: turretModule
            });
        }
    }

    _finalizePendingBuild(id) {
        const idx = this._pendingBuilds.findIndex(p => p.id === id);
        if (idx === -1) return;
    
        const pending = this._pendingBuilds[idx];
        this._pendingBuilds.splice(idx, 1);
    
        // Remove the placeholder from _placedTurrets
        const phIdx = this._placedTurrets.findIndex(
            t => t._pending && Math.abs(t.x - pending.x) < 1 && Math.abs(t.y - pending.y) < 1
        );
        if (phIdx !== -1) this._placedTurrets.splice(phIdx, 1);
    
        // Spawn the real turret
        this._spawnTurret(pending.x, pending.y, pending.config);
    }

    _drawPendingBuilds(ctx) {
        if (!this._pendingBuildImage) return;
        const gs = this.gridSize || 50;
    
        for (const pb of this._pendingBuilds) {
            ctx.save();
            ctx.globalAlpha = pb.alpha ?? 1.0;
            ctx.drawImage(
                this._pendingBuildImage,
                pb.x - gs / 2,
                pb.y - gs / 2,
                gs, gs
            );
            ctx.restore();
        }
    }

    _generateTurretPreviews() {
        this._turretPreviewImages = {};
    
        for (const turretConfig of this.turrets) {
            if (!turretConfig.prefab || !turretConfig.generateImage) continue;
    
            try {
                // Spawn a real instance of the prefab off-screen
                const OFFSCREEN_POS = -99999;
                const turretObj = typeof instanceCreate === 'function'
                    ? instanceCreate(turretConfig.prefab, OFFSCREEN_POS, OFFSCREEN_POS)
                    : null;
    
                if (!turretObj) continue;
    
                // Give all modules a chance to initialise
                if (typeof turretObj.start === 'function') {
                    try { turretObj.start(); } catch (e) {}
                }
    
                // Use the same cache path TrailRenderer uses — exclude self to avoid recursion
                const excludeList = ['TrailRenderer', 'TDPlacement'];
                turretObj.drawAllModulesUpdate(this.cachePadding, excludeList);
    
                const cacheData = turretObj.getCachedModulesData();
                if (cacheData && cacheData.canvas && cacheData.width > 0 && cacheData.height > 0) {
                    // Copy the canvas so we own it after the object is destroyed
                    const copy = document.createElement('canvas');
                    copy.width  = cacheData.width;
                    copy.height = cacheData.height;
                    const copyCtx = copy.getContext('2d');
                    copyCtx.drawImage(cacheData.canvas, 0, 0);
    
                    // Store with offset info so we can draw it centred correctly
                    this._turretPreviewImages[turretConfig.prefab] = {
                        canvas:  copy,
                        offsetX: cacheData.offsetX,
                        offsetY: cacheData.offsetY,
                        width:   cacheData.width,
                        height:  cacheData.height
                    };
                }
    
                // Destroy the temporary instance — it was only for rendering
                if (typeof turretObj.destroy === 'function') {
                    try { turretObj.destroy(); } catch (e) {}
                } else if (typeof instanceDestroy === 'function') {
                    try { instanceDestroy(turretObj); } catch (e) {}
                }
    
            } catch (e) {
                // Non-fatal — turret falls back to generic icon
            }
        }
    }

    _cropOffscreenCanvas(canvas, size) {
        const ctx    = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, size, size).data;
    
        let minX = size, minY = size, maxX = 0, maxY = 0;
        let hasPixels = false;
    
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const alpha = pixels[(y * size + x) * 4 + 3];
                if (alpha > 4) { // ignore near-transparent fringe
                    hasPixels = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
    
        if (!hasPixels) return canvas; // nothing drawn — return as-is
    
        // Add a small padding around the content
        const PAD = 4;
        minX = Math.max(0,    minX - PAD);
        minY = Math.max(0,    minY - PAD);
        maxX = Math.min(size, maxX + PAD);
        maxY = Math.min(size, maxY + PAD);
    
        const w = maxX - minX;
        const h = maxY - minY;
    
        const cropped    = document.createElement('canvas');
        cropped.width    = w;
        cropped.height   = h;
        const croppedCtx = cropped.getContext('2d');
        croppedCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
        return cropped;
    }
    
    isClickOnInfoPanel(mouseScreenPos) {
        // Check if click is on the info panel
        if (this._infoPanelBounds) {
            const b = this._infoPanelBounds;
            if (mouseScreenPos.x >= b.x && mouseScreenPos.x <= b.x + b.width &&
                mouseScreenPos.y >= b.y && mouseScreenPos.y <= b.y + b.height) {
                
                // Check upgrade button
                if (this._upgradeBtnBounds) {
                    const ub = this._upgradeBtnBounds;
                    if (mouseScreenPos.x >= ub.x && mouseScreenPos.x <= ub.x + ub.width &&
                        mouseScreenPos.y >= ub.y && mouseScreenPos.y <= ub.y + ub.height) {
                        this.handleUpgradeClick();
                        return true;
                    }
                }
                
                // Check sell button
                if (this._sellBtnBounds) {
                    const sb = this._sellBtnBounds;
                    if (mouseScreenPos.x >= sb.x && mouseScreenPos.x <= sb.x + sb.width &&
                        mouseScreenPos.y >= sb.y && mouseScreenPos.y <= sb.y + sb.height) {
                        this.handleSellClick();
                        return true;
                    }
                }
                
                // Clicked on panel but not on buttons - just consume the click
                return true;
            }
        }
        return false;
    }
    
    handleUpgradeClick() {
        if (!this._selectedPlacedTurret || !this._selectedPlacedTurret.turretModule) return;
        
        const turret = this._selectedPlacedTurret.turretModule;
        if (turret.upgrade()) {
            //console.log('⬆️ Turret upgraded successfully!');
        }
    }
    
    handleSellClick() {
        if (!this._selectedPlacedTurret) return;
        
        const turretModule = this._selectedPlacedTurret.turretModule;
        const turretObject = this._selectedPlacedTurret.object;
        
        // Remove from placed turrets list
        const index = this._placedTurrets.findIndex(t => t.object === turretObject);
        if (index > -1) {
            this._placedTurrets.splice(index, 1);
        }
        
        // Sell the turret
        if (turretModule) {
            turretModule.sell();
        }
        
        // Clear selection
        this.deselectPlacedTurret();
    }

    onDestroy() {
        // Release the offscreen canvas
        if (this._pendingBuildImage) {
            this._pendingBuildImage = null;
        }
        // Unlink worker
        if (this._workerBuilder && this._workerBuilder._placement === this) {
            this._workerBuilder._placement = null;
        }
        this._pendingBuilds  = [];
        this._workerBuilder  = null;
        this._turretPreviewImages = {};
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDPlacement';
        json.useGrid = this.useGrid;
        json.gridSize = this.gridSize;
        json.showGrid = this.showGrid;
        json.gridColor = this.gridColor;
        json.gridStyle = this.gridStyle;
        json.turrets = JSON.parse(JSON.stringify(this.turrets));
        json.showPanel = this.showPanel;
        json.panelPosition = this.panelPosition;
        json.panelStyle = this.panelStyle;
        json.buttonSize = this.buttonSize;
        json.pathAvoidanceRadius = this.pathAvoidanceRadius;
        json.useWorkerBuilder = this.useWorkerBuilder;
        return json;
    }
    
    static fromJSON(json) {
        const module = new TDPlacement();
        module.useGrid = json.useGrid ?? true;
        module.gridSize = json.gridSize ?? 50;
        module.showGrid = json.showGrid ?? true;
        module.gridColor = json.gridColor ?? 'rgba(100, 150, 255, 0.15)';
        module.gridStyle = json.gridStyle ?? 'lines';
        
        // Handle new turrets array or legacy format
        if (json.turrets && Array.isArray(json.turrets)) {
            module.turrets = JSON.parse(JSON.stringify(json.turrets));
        } else if (json.turretPrefabs) {
            // Convert from legacy format
            module.turrets = [];
            const count = json.turretPrefabs.length;
            for (let i = 0; i < count; i++) {
                module.turrets.push({
                    prefab: json.turretPrefabs[i] || '',
                    name: json.turretNames?.[i] || 'Turret',
                    cost: json.turretCosts?.[i] || 50,
                    color: json.turretColors?.[i] || '#4488ff',
                    uiImage: '',
                    fireRate: 1.0,
                    range: 150,
                    damage: 10
                });
            }
        }
        
        module.showPanel = json.showPanel ?? true;
        module.panelPosition = json.panelPosition ?? 'bottom';
        module.panelStyle = json.panelStyle ?? 'modern';
        module.buttonSize = json.buttonSize ?? 70;
        module.pathAvoidanceRadius = json.pathAvoidanceRadius ?? 40;
        module.useWorkerBuilder = json.useWorkerBuilder ?? false;
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new TDPlacement();
        cloned.useGrid = this.useGrid;
        cloned.gridSize = this.gridSize;
        cloned.showGrid = this.showGrid;
        cloned.gridColor = this.gridColor;
        cloned.gridStyle = this.gridStyle;
        cloned.turrets = JSON.parse(JSON.stringify(this.turrets));
        cloned.showPanel = this.showPanel;
        cloned.panelPosition = this.panelPosition;
        cloned.panelStyle = this.panelStyle;
        cloned.buttonSize = this.buttonSize;
        cloned.pathAvoidanceRadius = this.pathAvoidanceRadius;
        cloned.enabled = this.enabled;
        cloned.useWorkerBuilder = this.useWorkerBuilder;
        return cloned;
    }
    
    /**
     * Get turret configuration by index
     */
    getTurretConfig(index) {
        return this.turrets[index] || null;
    }
    
    /**
     * Get turret count
     */
    getTurretCount() {
        return this.turrets.length;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDPlacement = TDPlacement;
}

if (typeof Module !== 'undefined') {
    Module.register('TDPlacement', TDPlacement);
}
