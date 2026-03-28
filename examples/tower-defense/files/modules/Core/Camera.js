/**
 * Camera Module
 * Controls the game view and camera movement
 */

class Camera extends Module {
    constructor() {
        super();
        
        // === Core Settings ===
        this.cameraType = 'follow';   // 'follow', 'screenToScreen', 'static'
        this.zoom = 1.0;              // Camera zoom level
        this.zoomSmoothing = 0.1;     // How smoothly zoom changes
        this.bounds = null;           // Camera bounds {minX, maxX, minY, maxY}
        this.backgroundColor = '#000000';
        
        // Viewport size for viewport grid
        this.viewportDefaultWidth = 800;
        this.viewportDefaultHeight = 600;
        
        // === Follow Mode Settings ===
        this.followSmoothing = 0.1;   // How smoothly to follow (0-1)
        this.followOffsetX = 0;       // Horizontal offset from target
        this.followOffsetY = 0;       // Vertical offset from target
        
        // === Dead Zone (area where target moves without camera following) ===
        this.deadZoneEnabled = false;
        this.deadZoneWidth = 100;
        this.deadZoneHeight = 100;
        
        // === Look Ahead (camera leads in movement direction) ===
        this.lookAheadEnabled = false;
        this.lookAheadDistance = 100;
        this.lookAheadSmoothing = 0.02;  // Lower = smoother
        
        // === Mouse Look Ahead (for top-down shooters) ===
        this.mouseLookAheadEnabled = false;
        this.mouseLookAheadIntensity = 0.5;  // 0-1, how far towards mouse (0.5 = halfway)
        this.mouseLookAheadSmoothing = 0.03; // How smoothly camera follows mouse
        this.mouseLookAheadMargin = 100;     // Min distance player stays from viewport edge
        
        // === Screen-to-Screen Mode ===
        this.screenTransition = 'slide';  // 'snap', 'slide'
        this.slideSpeed = 500;            // Pixels per second for slide
        this.screenPadding = 0;           // Padding before screen edge triggers transition
        
        // === Speed-Based Zoom ===
        this.speedZoomEnabled = false;
        this.speedZoomIntensity = 0.5;    // How much speed affects zoom
        this.speedZoomMaxSpeed = 500;     // Speed at which max zoom out occurs
        this.speedZoomMinZoom = 0.5;      // Minimum zoom (most zoomed out)
        this.speedZoomSmoothing = 0.05;   // How smoothly zoom adjusts to speed
        
        // === Camera Rotation ===
        this.rotationFollowEnabled = false;
        this.rotationSmoothing = 0.1;
        
        // === RTS Camera Mode ===
        this.rtsPanWithRightMouse = true;      // Hold right mouse button to pan
        this.rtsPanWithMiddleMouse = true;      // Hold middle mouse button to pan
        this.rtsPanSpeed = 1.0;                 // Pan speed multiplier (for right-click/middle-click drag)
        this.rtsEdgeScrollEnabled = true;       // Move camera when mouse is at screen edge
        this.rtsEdgeScrollSpeed = 400;          // Edge scroll speed in pixels per second
        this.rtsEdgeScrollMargin = 20;          // Pixel margin from screen edge to trigger scroll
        this.rtsZoomEnabled = true;             // Zoom with mouse scroll wheel
        this.rtsZoomSpeed = 0.1;                // Zoom step per scroll tick
        this.rtsZoomMin = 0.2;                  // Minimum zoom level
        this.rtsZoomMax = 5.0;                  // Maximum zoom level
        this.rtsZoomSmoothing = 0.15;           // How smoothly zoom transitions (0-1)
        this.rtsKeyboardPanEnabled = false;     // Pan with WASD/Arrow keys
        this.rtsKeyboardPanSpeed = 500;         // Keyboard pan speed in pixels per second

        // === RTS Internal State ===
        this._rtsIsPanning = false;
        this._rtsIsMiddlePanning = false;
        this._rtsPanStartX = 0;
        this._rtsPanStartY = 0;
        this._rtsPanStartViewX = 0;
        this._rtsPanStartViewY = 0;
        this._rtsTargetZoom = 1.0;

        // === Scene Bounds ===
        this.keepWithinSceneBounds = false; // Keep camera within scene play area
        
        // === Rendering ===
        this.pixelPerfect = true; // Round viewport positions to prevent subpixel artifacts
        this.pixelPerfectZoomStep = 64; // Snap zoom to 1/N steps when pixel perfect is on (64 = 1/64 = 0.015625 steps, works for 8/16/32/64px tiles)
        
        // === Viewport Grid (Editor Helper) ===
        this.showViewportGrid = false;
        
        // === Internal State ===
        this._initialized = false;
        this._currentScreenX = 0;
        this._currentScreenY = 0;
        this._isTransitioning = false;
        this._transitionStartX = 0;
        this._transitionStartY = 0;
        this._transitionTargetX = 0;
        this._transitionTargetY = 0;
        this._transitionProgress = 0;
        this._lookAheadX = 0;
        this._lookAheadY = 0;
        this._mouseLookAheadX = 0;
        this._mouseLookAheadY = 0;
        this._currentSpeedZoom = 1.0;
        this._currentRotation = 0;

        // TDTD Z-zoom: adjust camera zoom based on MovementController2D tdtdZ
        this.tdtdZoomEnabled = false;
        this.tdtdZoomScale = 0.005;    // Zoom change per unit of Z (positive = zoom in when higher)
        this.tdtdZoomSmoothing = 0.1;  // Smoothing for Z-based zoom changes
        this._tdtdCurrentZoomOffset = 0; // Internal smoothed offset
        this._tdtdMovementController = null;
        this._tdtdControllerSearched = false;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Core';
    
    static getIcon() {
        return '📷';
    }
    
    static getDescription() {
        return 'Controls the game view and camera movement';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    /**
     * Property metadata with organized sections
     */
    getPropertyMetadata() {
        return [
            // ═══════════════════════════════════════
            // CAMERA TYPE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '📷 Camera Type' },
            { 
                key: 'cameraType', 
                type: 'select', 
                label: '🎬 Mode', 
                default: 'follow',
                options: {
                    'follow': 'Follow Target',
                    'screenToScreen': 'Screen-to-Screen',
                    'static': 'Static (No Follow)',
                    'rts': 'RTS (Mouse Pan & Zoom)'
                },
                hint: 'How the camera tracks the target GameObject'
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // VIEW SETTINGS
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🔍 View Settings' },
            { 
                key: 'zoom', 
                type: 'slider', 
                label: '🔭 Base Zoom', 
                default: 1.0, 
                min: 0.1, 
                max: 10, 
                step: 0.1,
                hint: 'Base camera zoom level (1 = 100%)'
            },
            { 
                key: 'zoomSmoothing', 
                type: 'slider', 
                label: '🎚️ Zoom Smoothing', 
                default: 0.1, 
                min: 0, 
                max: 1, 
                step: 0.05,
                hint: 'How smoothly zoom transitions occur'
            },
            { 
                key: 'backgroundColor', 
                type: 'color', 
                label: '🎨 Background Color', 
                default: '#000000' 
            },
            { 
                key: 'viewportDefaultWidth', 
                type: 'number', 
                label: 'Default viewport width for viewport grid', 
                default: '800' 
            },
            { 
                key: 'viewportDefaultHeight', 
                type: 'number', 
                label: 'Default viewport height for viewport grid', 
                default: '600' 
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // RTS CAMERA MODE
            // ═══════════════════════════════════════
            { 
                type: 'groupStart', 
                label: '🖱️ RTS Camera Settings',
                showIf: { cameraType: 'rts' }
            },
            { 
                type: 'hint', 
                label: 'Mouse-driven camera: right-click drag to pan, scroll to zoom, edge scrolling',
                showIf: { cameraType: 'rts' }
            },
            { type: 'groupStart', label: '🖱️ Mouse Pan' },
            { 
                key: 'rtsPanWithRightMouse', 
                type: 'boolean', 
                label: '✅ Enable Right-Click Pan', 
                default: true,
                showIf: { cameraType: 'rts' },
                hint: 'Hold right mouse button and drag to pan the camera'
            },
            { 
                key: 'rtsPanWithMiddleMouse', 
                type: 'boolean', 
                label: '✅ Enable Middle-Click Pan', 
                default: true,
                showIf: { cameraType: 'rts' },
                hint: 'Hold middle mouse button and drag to pan the camera'
            },
            { 
                key: 'rtsPanSpeed', 
                type: 'slider', 
                label: '⚡ Pan Speed', 
                default: 1.0,
                min: 0.1,
                max: 5.0,
                step: 0.1,
                showIf: (m) => m.cameraType === 'rts' && (m.rtsPanWithRightMouse || m.rtsPanWithMiddleMouse),
                hint: 'Multiplier for mouse drag pan speed'
            },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '↔️ Edge Scrolling' },
            { 
                key: 'rtsEdgeScrollEnabled', 
                type: 'boolean', 
                label: '✅ Enable Edge Scrolling', 
                default: true,
                showIf: { cameraType: 'rts' },
                hint: 'Move camera when mouse is near screen edges'
            },
            { 
                key: 'rtsEdgeScrollSpeed', 
                type: 'slider', 
                label: '⚡ Scroll Speed', 
                default: 400,
                min: 50,
                max: 2000,
                step: 25,
                showIf: (m) => m.cameraType === 'rts' && m.rtsEdgeScrollEnabled,
                hint: 'Pixels per second when edge scrolling'
            },
            { 
                key: 'rtsEdgeScrollMargin', 
                type: 'slider', 
                label: '📏 Edge Margin', 
                default: 20,
                min: 5,
                max: 100,
                step: 5,
                showIf: (m) => m.cameraType === 'rts' && m.rtsEdgeScrollEnabled,
                hint: 'Pixel distance from screen edge to trigger scrolling'
            },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '🔍 Scroll Zoom' },
            { 
                key: 'rtsZoomEnabled', 
                type: 'boolean', 
                label: '✅ Enable Scroll Zoom', 
                default: true,
                showIf: { cameraType: 'rts' },
                hint: 'Zoom in/out with mouse scroll wheel'
            },
            { 
                key: 'rtsZoomSpeed', 
                type: 'slider', 
                label: '⚡ Zoom Speed', 
                default: 0.1,
                min: 0.01,
                max: 0.5,
                step: 0.01,
                showIf: (m) => m.cameraType === 'rts' && m.rtsZoomEnabled,
                hint: 'Zoom step per scroll tick'
            },
            { 
                key: 'rtsZoomMin', 
                type: 'slider', 
                label: '🔭 Min Zoom', 
                default: 0.2,
                min: 0.05,
                max: 1.0,
                step: 0.05,
                showIf: (m) => m.cameraType === 'rts' && m.rtsZoomEnabled,
                hint: 'Most zoomed-out level allowed'
            },
            { 
                key: 'rtsZoomMax', 
                type: 'slider', 
                label: '🔬 Max Zoom', 
                default: 5.0,
                min: 1.0,
                max: 20.0,
                step: 0.5,
                showIf: (m) => m.cameraType === 'rts' && m.rtsZoomEnabled,
                hint: 'Most zoomed-in level allowed'
            },
            { 
                key: 'rtsZoomSmoothing', 
                type: 'slider', 
                label: '🎚️ Zoom Smoothing', 
                default: 0.15,
                min: 0.01,
                max: 1.0,
                step: 0.01,
                showIf: (m) => m.cameraType === 'rts' && m.rtsZoomEnabled,
                hint: 'How smoothly zoom transitions (lower = smoother)'
            },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '⌨️ Keyboard Pan' },
            { 
                key: 'rtsKeyboardPanEnabled', 
                type: 'boolean', 
                label: '✅ Enable Keyboard Pan', 
                default: false,
                showIf: { cameraType: 'rts' },
                hint: 'Pan with WASD or Arrow keys'
            },
            { 
                key: 'rtsKeyboardPanSpeed', 
                type: 'slider', 
                label: '⚡ Keyboard Pan Speed', 
                default: 500,
                min: 50,
                max: 2000,
                step: 25,
                showIf: (m) => m.cameraType === 'rts' && m.rtsKeyboardPanEnabled,
                hint: 'Pixels per second when panning with keyboard'
            },
            { type: 'groupEnd' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // FOLLOW MODE SETTINGS
            // ═══════════════════════════════════════
            { 
                type: 'groupStart', 
                label: '🎯 Follow Settings',
                showIf: { cameraType: 'follow' }
            },
            { 
                type: 'hint', 
                label: 'Camera smoothly follows its parent GameObject',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'followSmoothing', 
                type: 'slider', 
                label: '🏃 Follow Smoothing', 
                default: 0.1, 
                min: 0, 
                max: 1, 
                step: 0.05,
                hint: '0 = instant follow, 1 = very slow follow',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'followOffsetX', 
                type: 'number', 
                label: '↔️ Offset X', 
                default: 0,
                hint: 'Horizontal offset from target center',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'followOffsetY', 
                type: 'number', 
                label: '↕️ Offset Y', 
                default: 0,
                hint: 'Vertical offset from target center',
                showIf: { cameraType: 'follow' }
            },
            
            // === Dead Zone ===
            { 
                type: 'header', 
                label: '⬜ Dead Zone',
                showIf: { cameraType: 'follow' }
            },
            { 
                type: 'hint', 
                label: 'Area where target can move without camera following',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'deadZoneEnabled', 
                type: 'boolean', 
                label: '✅ Enable Dead Zone', 
                default: false,
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'deadZoneWidth', 
                type: 'number', 
                label: '↔️ Width', 
                default: 100,
                min: 0,
                max: 1000,
                step: 10,
                showIf: (m) => m.cameraType === 'follow' && m.deadZoneEnabled
            },
            { 
                key: 'deadZoneHeight', 
                type: 'number', 
                label: '↕️ Height', 
                default: 100,
                min: 0,
                max: 1000,
                step: 10,
                showIf: (m) => m.cameraType === 'follow' && m.deadZoneEnabled
            },
            
            // === Look Ahead ===
            { 
                type: 'header', 
                label: '👀 Look Ahead',
                showIf: { cameraType: 'follow' }
            },
            { 
                type: 'hint', 
                label: 'Camera leads in the direction of movement',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'lookAheadEnabled', 
                type: 'boolean', 
                label: '✅ Enable Look Ahead', 
                default: false,
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'lookAheadDistance', 
                type: 'slider', 
                label: '📏 Distance', 
                default: 100,
                min: 0,
                max: 500,
                step: 10,
                hint: 'How far ahead the camera looks',
                showIf: (m) => m.cameraType === 'follow' && m.lookAheadEnabled
            },
            { 
                key: 'lookAheadSmoothing', 
                type: 'slider', 
                label: '🎚️ Smoothing', 
                default: 0.02,
                min: 0.005,
                max: 0.2,
                step: 0.005,
                hint: 'Lower = smoother (0.02 recommended)',
                showIf: (m) => m.cameraType === 'follow' && m.lookAheadEnabled
            },
            
            // === Mouse Look Ahead ===
            { 
                type: 'header', 
                label: '🖱️ Mouse Look Ahead',
                showIf: { cameraType: 'follow' }
            },
            { 
                type: 'hint', 
                label: 'Camera looks towards mouse cursor (ideal for top-down shooters)',
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'mouseLookAheadEnabled', 
                type: 'boolean', 
                label: '✅ Enable Mouse Look Ahead', 
                default: false,
                showIf: { cameraType: 'follow' }
            },
            { 
                key: 'mouseLookAheadIntensity', 
                type: 'slider', 
                label: '💪 Intensity', 
                default: 0.5,
                min: 0.1,
                max: 1.0,
                step: 0.05,
                hint: 'How far towards mouse (0.5 = halfway between player and mouse)',
                showIf: (m) => m.cameraType === 'follow' && m.mouseLookAheadEnabled
            },
            { 
                key: 'mouseLookAheadSmoothing', 
                type: 'slider', 
                label: '🎚️ Smoothing', 
                default: 0.03,
                min: 0.005,
                max: 0.15,
                step: 0.005,
                hint: 'Lower = smoother camera movement',
                showIf: (m) => m.cameraType === 'follow' && m.mouseLookAheadEnabled
            },
            { 
                key: 'mouseLookAheadMargin', 
                type: 'slider', 
                label: '📏 Edge Margin', 
                default: 100,
                min: 20,
                max: 300,
                step: 10,
                hint: 'Minimum distance player stays from viewport edge',
                showIf: (m) => m.cameraType === 'follow' && m.mouseLookAheadEnabled
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // SCREEN-TO-SCREEN MODE
            // ═══════════════════════════════════════
            { 
                type: 'header', 
                label: '📺 Screen-to-Screen',
                showIf: { cameraType: 'screenToScreen' }
            },
            { 
                type: 'hint', 
                label: 'Camera snaps to screen-sized grid cells. When the target leaves the current screen, camera transitions to the next.',
                showIf: { cameraType: 'screenToScreen' }
            },
            { 
                key: 'screenTransition', 
                type: 'select', 
                label: '🎞️ Transition Style', 
                default: 'slide',
                options: {
                    'snap': 'Instant Snap',
                    'slide': 'Smooth Slide'
                },
                showIf: { cameraType: 'screenToScreen' }
            },
            { 
                key: 'slideSpeed', 
                type: 'slider', 
                label: '⚡ Slide Speed', 
                default: 500,
                min: 100,
                max: 2000,
                step: 50,
                hint: 'Pixels per second during slide transition',
                showIf: (m) => m.cameraType === 'screenToScreen' && m.screenTransition === 'slide'
            },
            { 
                key: 'screenPadding', 
                type: 'number', 
                label: '📐 Edge Padding', 
                default: 0,
                min: 0,
                max: 100,
                step: 5,
                hint: 'Pixels of padding before screen edge triggers transition',
                showIf: { cameraType: 'screenToScreen' }
            },
            
            // ═══════════════════════════════════════
            // SPEED-BASED ZOOM
            // ═══════════════════════════════════════
            { type: 'header', label: '💨 Speed-Based Zoom' },
            { 
                type: 'hint', 
                label: 'Automatically zoom out when the target is moving fast'
            },
            { 
                key: 'speedZoomEnabled', 
                type: 'boolean', 
                label: '✅ Enable Speed Zoom', 
                default: false
            },
            { 
                key: 'speedZoomIntensity', 
                type: 'slider', 
                label: '💪 Intensity', 
                default: 0.5,
                min: 0.1,
                max: 1,
                step: 0.05,
                hint: 'How much speed affects the zoom level',
                showIf: { speedZoomEnabled: true }
            },
            { 
                key: 'speedZoomMaxSpeed', 
                type: 'number', 
                label: '🚀 Max Speed Threshold', 
                default: 500,
                min: 100,
                max: 2000,
                step: 50,
                hint: 'Speed at which maximum zoom out is reached',
                showIf: { speedZoomEnabled: true }
            },
            { 
                key: 'speedZoomMinZoom', 
                type: 'slider', 
                label: '🔍 Min Zoom (Max Out)', 
                default: 0.5,
                min: 0.1,
                max: 1,
                step: 0.05,
                hint: 'Minimum zoom level when at max speed (lower = more zoomed out)',
                showIf: { speedZoomEnabled: true }
            },
            { 
                key: 'speedZoomSmoothing', 
                type: 'slider', 
                label: '🎚️ Zoom Smoothing', 
                default: 0.05,
                min: 0.01,
                max: 0.3,
                step: 0.01,
                hint: 'How smoothly zoom adjusts to speed changes',
                showIf: { speedZoomEnabled: true }
            },
            
            // ═══════════════════════════════════════
            // ROTATION FOLLOW
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🔄 Rotation' },
            { 
                key: 'rotationFollowEnabled', 
                type: 'boolean', 
                label: '✅ Follow Target Rotation', 
                default: false,
                hint: 'Camera rotates to match the target\'s rotation'
            },
            { 
                key: 'rotationSmoothing', 
                type: 'slider', 
                label: '🎚️ Rotation Smoothing', 
                default: 0.1,
                min: 0,
                max: 1,
                step: 0.05,
                showIf: { rotationFollowEnabled: true }
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // SCENE BOUNDS
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '📏 Scene Bounds' },
            { 
                type: 'hint', 
                label: 'Keep camera within the scene play area (set in scene settings)'
            },
            { 
                key: 'keepWithinSceneBounds', 
                type: 'boolean', 
                label: '✅ Keep Within Scene Bounds', 
                default: false,
                hint: 'Prevent camera from showing area outside the scene bounds (requires scene size to be set)'
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // RENDERING
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🎨 Rendering' },
            { 
                key: 'pixelPerfect', 
                type: 'boolean', 
                label: '📐 Pixel Perfect', 
                default: true,
                hint: 'Round viewport positions to whole pixels (prevents subpixel artifacts in tiled backgrounds)'
            },
            {
                key: 'pixelPerfectZoomStep',
                type: 'number',
                label: '🔢 Pixel Perfect Zoom Step',
                default: 64,
                min: 1,
                max: 1024,
                step: 1,
                hint: 'Snap zoom to 1/N increments when Pixel Perfect is on. Higher = finer steps. 64 works well for 8/16/32/64px tiles (set to 0 to disable zoom snapping).',
                showIf: { pixelPerfect: true }
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // VIEWPORT GRID
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '📐 Viewport Grid' },
            { 
                type: 'hint', 
                label: 'Draw a grid showing viewport-sized cells for level design'
            },
            { 
                key: 'showViewportGrid', 
                type: 'boolean', 
                label: '✅ Show Viewport Grid', 
                default: false,
                hint: 'Draw yellow grid lines at viewport width/height intervals'
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // TDTD Z-ZOOM
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🌐 TDTD Z-Zoom' },
            {
                type: 'hint',
                label: 'Adjust camera zoom based on the Z position from a MovementController2D on this game object. Higher Z = more zoom.'
            },
            {
                key: 'tdtdZoomEnabled',
                type: 'boolean',
                label: '✅ TDTD Zoom Enabled',
                default: false,
                hint: 'Enable zoom adjustment based on MovementController2D tdtdZ height'
            },
            {
                key: 'tdtdZoomScale',
                type: 'number',
                label: '📏 Zoom per Z Unit',
                default: 0.005,
                min: -0.1,
                max: 0.1,
                step: 0.001,
                showIf: { tdtdZoomEnabled: true },
                hint: 'How much zoom changes per unit of Z (positive = zoom in when higher)'
            },
            {
                key: 'tdtdZoomSmoothing',
                type: 'slider',
                label: '🔄 Zoom Smoothing',
                default: 0.1,
                min: 0.01,
                max: 1,
                step: 0.01,
                showIf: { tdtdZoomEnabled: true },
                hint: 'How smoothly the zoom adjusts to Z changes (lower = smoother)'
            },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            // ACTIONS
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '⚙️ Actions' },
            {
                type: 'button',
                label: 'Test Shake',
                buttonText: '📳 Shake Camera',
                buttonStyle: 'primary',
                tooltip: 'Preview camera shake effect',
                action: 'testShake'
            },
            {
                type: 'button',
                label: 'Reset Settings',
                buttonText: '🔄 Reset to Defaults',
                buttonStyle: 'danger',
                tooltip: 'Reset all camera settings to default values',
                onClick: function(module, editor) {
                    module.cameraType = 'follow';
                    module.zoom = 1.0;
                    module.zoomSmoothing = 0.1;
                    module.followSmoothing = 0.1;
                    module.followOffsetX = 0;
                    module.followOffsetY = 0;
                    module.deadZoneEnabled = false;
                    module.deadZoneWidth = 100;
                    module.deadZoneHeight = 100;
                    module.lookAheadEnabled = false;
                    module.lookAheadDistance = 100;
                    module.lookAheadSmoothing = 0.05;
                    module.screenTransition = 'slide';
                    module.slideSpeed = 500;
                    module.screenPadding = 0;
                    module.speedZoomEnabled = false;
                    module.speedZoomIntensity = 0.5;
                    module.speedZoomMaxSpeed = 500;
                    module.speedZoomMinZoom = 0.5;
                    module.speedZoomSmoothing = 0.05;
                    module.rotationFollowEnabled = false;
                    module.rotationSmoothing = 0.1;
                    module.rtsPanWithRightMouse = true;
                    module.rtsPanWithMiddleMouse = true;
                    module.rtsPanSpeed = 1.0;
                    module.rtsEdgeScrollEnabled = true;
                    module.rtsEdgeScrollSpeed = 400;
                    module.rtsEdgeScrollMargin = 20;
                    module.rtsZoomEnabled = true;
                    module.rtsZoomSpeed = 0.1;
                    module.rtsZoomMin = 0.2;
                    module.rtsZoomMax = 5.0;
                    module.rtsZoomSmoothing = 0.15;
                    module.rtsKeyboardPanEnabled = false;
                    module.rtsKeyboardPanSpeed = 500;
                    editor.refreshModuleProperties();
                }
            },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() { 
        // Initialize camera on first start - store the initial viewport position
        if (!window.gameEngine || !window.gameEngine.viewport) return;
        
        this._initialized = true;

        const eng = getEngine();
        eng.viewport.x = this.x - eng.viewport.width / 2;
        eng.viewport.y = this.y - eng.viewport.height / 2;
        
        // Store initial viewport position so we can properly initialize
        // the camera without overriding the scene's starting viewport
        this._initialViewportX = window.gameEngine.viewport.x;
        this._initialViewportY = window.gameEngine.viewport.y;
        
        // Initialize screen-to-screen mode
        const targetPos = this.gameObject.getWorldPosition();
        if (this.cameraType === 'screenToScreen') {
            const canvas = window.gameEngine.canvas;
            this._currentScreenX = Math.floor(targetPos.x / canvas.width);
            this._currentScreenY = Math.floor(targetPos.y / canvas.height);
        }
        
        // Initialize positionPrevious on the target gameObject to prevent first-frame velocity spike
        // This ensures velocity is 0 on the first frame rather than based on (0, 0)
        if (this.gameObject.positionPrevious) {
            this.gameObject.positionPrevious.set(targetPos.x, targetPos.y);
        }
        
        // Initialize RTS zoom target
        this._rtsTargetZoom = this.zoom;
    }
    
    loop(deltaTime) {
        if (!window.gameEngine || !window.gameEngine.viewport) return;
        
        // Don't update viewport in editor mode - let the editor control the camera
        if (window.gameEngine.isEditor) return;
        
        const viewport = window.gameEngine.viewport;
        const canvas = window.gameEngine.canvas;
        const targetPos = this.gameObject.getWorldPosition();
        
        // Calculate velocity from GameObject's positionPrevious (frame-accurate velocity)
        const prevPos = this.gameObject.positionPrevious;
        let dx = 0, dy = 0;
        // Use positionPrevious if available and valid (not at origin with object far away)
        if (prevPos && (prevPos.x !== 0 || prevPos.y !== 0 || (targetPos.x === 0 && targetPos.y === 0))) {
            dx = targetPos.x - prevPos.x;
            dy = targetPos.y - prevPos.y;
        }
        const velocityX = dx / (deltaTime || 0.016);
        const velocityY = dy / (deltaTime || 0.016);
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        // Calculate effective zoom (including speed-based zoom)
        let effectiveZoom = this.zoom;
        if (this.speedZoomEnabled && speed > 0) {
            const speedRatio = Math.min(speed / this.speedZoomMaxSpeed, 1);
            const targetSpeedZoom = 1 - (1 - this.speedZoomMinZoom) * speedRatio * this.speedZoomIntensity;
            this._currentSpeedZoom += (targetSpeedZoom - this._currentSpeedZoom) * this.speedZoomSmoothing;
            effectiveZoom = this.zoom * this._currentSpeedZoom;
        } else {
            // Smoothly return to base zoom
            this._currentSpeedZoom += (1 - this._currentSpeedZoom) * this.speedZoomSmoothing;
            effectiveZoom = this.zoom * this._currentSpeedZoom;
        }

        // TDTD Z-zoom: adjust zoom based on MovementController2D tdtdZ on this game object
        if (this.tdtdZoomEnabled) {
            // Find MovementController2D on this game object (cache result)
            if (!this._tdtdControllerSearched) {
                this._tdtdControllerSearched = true;
                if (this.gameObject.getModule) {
                    this._tdtdMovementController = this.gameObject.getModule('MovementController2D');
                }
            }
            const mc = this._tdtdMovementController;
            if (mc && mc.tdtdEnabled) {
                // Negative: higher Z = zoom out (camera pulls back as entity rises)
                const targetZoomOffset = -mc.tdtdZ * this.tdtdZoomScale;
                this._tdtdCurrentZoomOffset += (targetZoomOffset - this._tdtdCurrentZoomOffset) * this.tdtdZoomSmoothing;
                effectiveZoom += this._tdtdCurrentZoomOffset;
                if (effectiveZoom < 0.01) effectiveZoom = 0.01; // guard against zero/negative
            }
        }

        // Pixel-perfect zoom quantization: snap to 1/N steps so tile sizes in screen
        // space are always whole pixels, preventing seams between aligned tiles.
        if (this.pixelPerfect && this.pixelPerfectZoomStep > 0) {
            const step = this.pixelPerfectZoomStep;
            effectiveZoom = Math.round(effectiveZoom * step) / step;
            if (effectiveZoom <= 0) effectiveZoom = 1 / step; // guard against zero
        }
        
        // Center offset calculation
        const centerOffsetX = canvas.width / (2 * effectiveZoom);
        const centerOffsetY = canvas.height / (2 * effectiveZoom);
        
        let finalX, finalY;
        
        // Handle different camera modes
        switch (this.cameraType) {
            case 'follow':
                ({ finalX, finalY } = this._updateFollowMode(
                    targetPos, viewport, canvas, centerOffsetX, centerOffsetY, 
                    velocityX, velocityY, speed, deltaTime
                ));
                break;
                
            case 'screenToScreen':
                ({ finalX, finalY } = this._updateScreenToScreenMode(
                    targetPos, viewport, canvas, deltaTime
                ));
                break;
                
            case 'rts':
                ({ finalX, finalY, effectiveZoom } = this._updateRTSMode(
                    viewport, canvas, effectiveZoom, deltaTime
                ));
                break;
                
            case 'static':
            default:
                // Static mode - don't move camera at all
                finalX = viewport.x;
                finalY = viewport.y;
                break;
        }
        
        // Apply bounds if set
        if (this.bounds) {
            if (this.bounds.minX !== undefined && finalX < this.bounds.minX) finalX = this.bounds.minX;
            if (this.bounds.maxX !== undefined && finalX > this.bounds.maxX) finalX = this.bounds.maxX;
            if (this.bounds.minY !== undefined && finalY < this.bounds.minY) finalY = this.bounds.minY;
            if (this.bounds.maxY !== undefined && finalY > this.bounds.maxY) finalY = this.bounds.maxY;
        }
        
        // Apply scene bounds if enabled
        // This keeps the camera from showing area outside the scene play area
        if (this.keepWithinSceneBounds && window.gameEngine) {
            const sceneWidth = window.gameEngine.sceneWidth;
            const sceneHeight = window.gameEngine.sceneHeight;
            
            // Only apply if scene has bounds (not 0)
            if (sceneWidth > 0 && sceneHeight > 0) {
                // Calculate viewport size at current zoom
                const viewWidth = canvas.width / effectiveZoom;
                const viewHeight = canvas.height / effectiveZoom;
                
                // Clamp camera position so viewport stays within scene bounds
                // Left edge: camera can't go below 0
                if (finalX < 0) finalX = 0;
                // Right edge: camera + viewport width can't exceed scene width
                if (finalX + viewWidth > sceneWidth) finalX = sceneWidth - viewWidth;
                // Top edge: camera can't go below 0
                if (finalY < 0) finalY = 0;
                // Bottom edge: camera + viewport height can't exceed scene height
                if (finalY + viewHeight > sceneHeight) finalY = sceneHeight - viewHeight;
                
                // If viewport is larger than scene, center it
                if (viewWidth > sceneWidth) {
                    finalX = (sceneWidth - viewWidth) / 2;
                }
                if (viewHeight > sceneHeight) {
                    finalY = (sceneHeight - viewHeight) / 2;
                }
            }
        }
        
        // Update viewport position and zoom
        // Round to whole pixels when pixel perfect is enabled to prevent subpixel rendering artifacts
        viewport.x = this.pixelPerfect ? Math.round(finalX) : finalX;
        viewport.y = this.pixelPerfect ? Math.round(finalY) : finalY;
        viewport.zoom = effectiveZoom;
        
        // Handle rotation follow
        if (this.rotationFollowEnabled) {
            const targetRotation = this.gameObject.angle || 0;
            if (this.rotationSmoothing > 0) {
                this._currentRotation += (targetRotation - this._currentRotation) * this.rotationSmoothing;
            } else {
                this._currentRotation = targetRotation;
            }
            viewport.rotation = -this._currentRotation; // Negative to counter-rotate the view
        }
    }
    
    /**
     * Update camera in follow mode
     */
    _updateFollowMode(targetPos, viewport, canvas, centerOffsetX, centerOffsetY, velocityX, velocityY, speed, deltaTime) {
        // Calculate velocity-based look ahead offset
        // Uses direct target calculation to prevent overshoot from dual-smoothing
        let lookAheadOffsetX = 0;
        let lookAheadOffsetY = 0;
        
        if (this.lookAheadEnabled) {
            // Calculate target lookahead position based on velocity direction and speed
            // Clamp speed contribution to prevent extreme lookahead at high speeds
            const speedFactor = Math.min(speed / 200, 1); // Normalize speed (200 = full lookahead)
            
            let targetLookAheadX = 0;
            let targetLookAheadY = 0;
            
            if (speed > 1) { // Small threshold to avoid jitter when nearly stationary
                const normalizedVelX = velocityX / speed;
                const normalizedVelY = velocityY / speed;
                targetLookAheadX = normalizedVelX * this.lookAheadDistance * speedFactor;
                targetLookAheadY = normalizedVelY * this.lookAheadDistance * speedFactor;
            }
            // else: target is (0, 0) - smoothly return to center
            
            // Smooth interpolation toward target lookahead (single smoothing, no accumulation)
            const smoothFactor = 1 - Math.pow(1 - this.lookAheadSmoothing, (deltaTime || 0.016) * 60);
            this._lookAheadX += (targetLookAheadX - this._lookAheadX) * smoothFactor;
            this._lookAheadY += (targetLookAheadY - this._lookAheadY) * smoothFactor;
            
            // Snap to zero when very close to prevent endless micro-movements
            if (Math.abs(this._lookAheadX) < 0.1 && Math.abs(targetLookAheadX) < 0.1) this._lookAheadX = 0;
            if (Math.abs(this._lookAheadY) < 0.1 && Math.abs(targetLookAheadY) < 0.1) this._lookAheadY = 0;
            
            lookAheadOffsetX = this._lookAheadX;
            lookAheadOffsetY = this._lookAheadY;
        }
        
        // Calculate mouse-based look ahead offset
        let mouseLookAheadOffsetX = 0;
        let mouseLookAheadOffsetY = 0;
        
        if (this.mouseLookAheadEnabled && typeof mouse_x === 'function') {
            // Get mouse position in world coordinates (mouseX/mouseY from game-api.js)
            const mouseWorldPosX = mouse_x();
            const mouseWorldPosY = mouse_y();
            
            // Calculate vector from player to mouse
            const toMouseX = mouseWorldPosX - targetPos.x;
            const toMouseY = mouseWorldPosY - targetPos.y;
            
            // Target offset is intensity * distance to mouse
            let targetMouseOffsetX = toMouseX * this.mouseLookAheadIntensity;
            let targetMouseOffsetY = toMouseY * this.mouseLookAheadIntensity;
            
            // Clamp offset so player stays within margin of viewport edges
            // Max offset = half viewport size - margin
            const maxOffsetX = centerOffsetX - this.mouseLookAheadMargin;
            const maxOffsetY = centerOffsetY - this.mouseLookAheadMargin;
            
            if (maxOffsetX > 0) {
                targetMouseOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, targetMouseOffsetX));
            } else {
                targetMouseOffsetX = 0;
            }
            if (maxOffsetY > 0) {
                targetMouseOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, targetMouseOffsetY));
            } else {
                targetMouseOffsetY = 0;
            }
            
            // Smooth interpolation with frame-rate independence
            const smoothFactor = 1 - Math.pow(1 - this.mouseLookAheadSmoothing, (deltaTime || 0.016) * 60);
            this._mouseLookAheadX += (targetMouseOffsetX - this._mouseLookAheadX) * smoothFactor;
            this._mouseLookAheadY += (targetMouseOffsetY - this._mouseLookAheadY) * smoothFactor;
            
            mouseLookAheadOffsetX = this._mouseLookAheadX;
            mouseLookAheadOffsetY = this._mouseLookAheadY;
        } else if (this.mouseLookAheadEnabled) {
            // Smoothly decay when mouse not available
            const decayFactor = Math.pow(0.95, (deltaTime || 0.016) * 60);
            this._mouseLookAheadX *= decayFactor;
            this._mouseLookAheadY *= decayFactor;
        }
        
        // Apply follow offset, velocity look ahead, and mouse look ahead
        const targetWithOffset = {
            x: targetPos.x + this.followOffsetX + lookAheadOffsetX + mouseLookAheadOffsetX,
            y: targetPos.y + this.followOffsetY + lookAheadOffsetY + mouseLookAheadOffsetY
        };
        
        // Target viewport position (top-left) to center on the target
        let targetViewportX = targetWithOffset.x - centerOffsetX;
        let targetViewportY = targetWithOffset.y - centerOffsetY;
        
        // Apply dead zone if enabled
        if (this.deadZoneEnabled) {
            const deadZoneHalfW = this.deadZoneWidth / 2;
            const deadZoneHalfH = this.deadZoneHeight / 2;
            
            // Current center of view
            const viewCenterX = viewport.x + centerOffsetX;
            const viewCenterY = viewport.y + centerOffsetY;
            
            // Check if target is within dead zone
            const deltaX = targetWithOffset.x - viewCenterX;
            const deltaY = targetWithOffset.y - viewCenterY;
            
            // Only move camera if target is outside dead zone
            if (Math.abs(deltaX) > deadZoneHalfW) {
                const pushX = deltaX > 0 ? deltaX - deadZoneHalfW : deltaX + deadZoneHalfW;
                targetViewportX = viewport.x + pushX;
            } else {
                targetViewportX = viewport.x;
            }
            
            if (Math.abs(deltaY) > deadZoneHalfH) {
                const pushY = deltaY > 0 ? deltaY - deadZoneHalfH : deltaY + deadZoneHalfH;
                targetViewportY = viewport.y + pushY;
            } else {
                targetViewportY = viewport.y;
            }
        }
        
        // Smooth follow towards target (lerp between current and target)
        let finalX, finalY;
        if (this.followSmoothing > 0) {
            finalX = viewport.x + (targetViewportX - viewport.x) * this.followSmoothing;
            finalY = viewport.y + (targetViewportY - viewport.y) * this.followSmoothing;
        } else {
            finalX = targetViewportX;
            finalY = targetViewportY;
        }
        
        return { finalX, finalY };
    }
    
    /**
     * Update camera in screen-to-screen mode
     */
    _updateScreenToScreenMode(targetPos, viewport, canvas, deltaTime) {
        const screenWidth = canvas.width;
        const screenHeight = canvas.height;
        
        // Calculate which screen cell the target is in
        const targetScreenX = Math.floor((targetPos.x + this.screenPadding) / screenWidth);
        const targetScreenY = Math.floor((targetPos.y + this.screenPadding) / screenHeight);
        
        // Check if target has moved to a different screen
        if (!this._isTransitioning && (targetScreenX !== this._currentScreenX || targetScreenY !== this._currentScreenY)) {
            // Start transition to new screen
            this._currentScreenX = targetScreenX;
            this._currentScreenY = targetScreenY;
            
            if (this.screenTransition === 'snap') {
                // Instant snap
                viewport.x = targetScreenX * screenWidth;
                viewport.y = targetScreenY * screenHeight;
            } else {
                // Start slide transition
                this._isTransitioning = true;
                this._transitionStartX = viewport.x;
                this._transitionStartY = viewport.y;
                this._transitionTargetX = targetScreenX * screenWidth;
                this._transitionTargetY = targetScreenY * screenHeight;
                this._transitionProgress = 0;
            }
        }
        
        let finalX, finalY;
        
        if (this._isTransitioning) {
            // Calculate transition distance
            const dx = this._transitionTargetX - this._transitionStartX;
            const dy = this._transitionTargetY - this._transitionStartY;
            const totalDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Progress transition
            const moveAmount = this.slideSpeed * (deltaTime || 0.016);
            this._transitionProgress += moveAmount / totalDistance;
            
            if (this._transitionProgress >= 1) {
                // Transition complete
                this._isTransitioning = false;
                this._transitionProgress = 1;
            }
            
            // Ease out cubic for smooth deceleration
            const easedProgress = 1 - Math.pow(1 - this._transitionProgress, 3);
            
            finalX = this._transitionStartX + dx * easedProgress;
            finalY = this._transitionStartY + dy * easedProgress;
        } else {
            // Stay on current screen
            finalX = this._currentScreenX * screenWidth;
            finalY = this._currentScreenY * screenHeight;
        }
        
        return { finalX, finalY };
    }
    
    /**
     * Update camera in RTS mode
     * Supports right-click drag panning, edge scrolling, scroll-wheel zoom, and keyboard panning
     */
    _updateRTSMode(viewport, canvas, effectiveZoom, deltaTime) {
        let finalX = viewport.x;
        let finalY = viewport.y;
        const dt = deltaTime || 0.016;
        
        // Initialize target zoom on first frame
        if (this._rtsTargetZoom === undefined || this._rtsTargetZoom === 1.0 && this.zoom !== 1.0) {
            this._rtsTargetZoom = this.zoom;
        }
        
        // --- Right-click drag to pan ---
        if (this.rtsPanWithRightMouse) {
            const rmDown = typeof mouseDown === 'function' ? mouseDown(2) : false;
            const rmPressed = typeof mousePressed === 'function' ? mousePressed(2) : false;
            
            if (rmPressed) {
                this._rtsIsPanning = true;
                if (typeof mousePositionScreen === 'function') {
                    const sp = mousePositionScreen();
                    this._rtsPanStartX = sp.x;
                    this._rtsPanStartY = sp.y;
                }
                this._rtsPanStartViewX = viewport.x;
                this._rtsPanStartViewY = viewport.y;
            }
            
            if (this._rtsIsPanning && rmDown) {
                if (typeof mousePositionScreen === 'function') {
                    const sp = mousePositionScreen();
                    const dx = (sp.x - this._rtsPanStartX) / effectiveZoom;
                    const dy = (sp.y - this._rtsPanStartY) / effectiveZoom;
                    finalX = this._rtsPanStartViewX - dx * this.rtsPanSpeed;
                    finalY = this._rtsPanStartViewY - dy * this.rtsPanSpeed;
                }
            }
            
            if (!rmDown) {
                this._rtsIsPanning = false;
            }
        }
        
        // --- Middle-click drag to pan ---
        if (this.rtsPanWithMiddleMouse) {
            const mmDown = typeof mouseDown === 'function' ? mouseDown(1) : false;
            const mmPressed = typeof mousePressed === 'function' ? mousePressed(1) : false;
            
            if (mmPressed) {
                this._rtsIsMiddlePanning = true;
                if (typeof mousePositionScreen === 'function') {
                    const sp = mousePositionScreen();
                    this._rtsPanStartX = sp.x;
                    this._rtsPanStartY = sp.y;
                }
                this._rtsPanStartViewX = finalX;
                this._rtsPanStartViewY = finalY;
            }
            
            if (this._rtsIsMiddlePanning && mmDown) {
                if (typeof mousePositionScreen === 'function') {
                    const sp = mousePositionScreen();
                    const dx = (sp.x - this._rtsPanStartX) / effectiveZoom;
                    const dy = (sp.y - this._rtsPanStartY) / effectiveZoom;
                    finalX = this._rtsPanStartViewX - dx * this.rtsPanSpeed;
                    finalY = this._rtsPanStartViewY - dy * this.rtsPanSpeed;
                }
            }
            
            if (!mmDown) {
                this._rtsIsMiddlePanning = false;
            }
        }
        
        // --- Edge scrolling ---
        if (this.rtsEdgeScrollEnabled && !this._rtsIsPanning && !this._rtsIsMiddlePanning) {
            let edgeDx = 0;
            let edgeDy = 0;
            
            if (typeof mousePositionScreen === 'function') {
                const sp = mousePositionScreen();
                const margin = this.rtsEdgeScrollMargin;
                const screenW = canvas.width;
                const screenH = canvas.height;
                
                if (sp.x <= margin) edgeDx = -1;
                else if (sp.x >= screenW - margin) edgeDx = 1;
                if (sp.y <= margin) edgeDy = -1;
                else if (sp.y >= screenH - margin) edgeDy = 1;
            }
            
            const edgeSpeed = (this.rtsEdgeScrollSpeed / effectiveZoom) * dt;
            finalX += edgeDx * edgeSpeed;
            finalY += edgeDy * edgeSpeed;
        }
        
        // --- Keyboard panning (WASD / Arrows) ---
        if (this.rtsKeyboardPanEnabled) {
            let kbDx = 0;
            let kbDy = 0;
            
            if (typeof keyDown === 'function') {
                if (keyDown('KeyW') || keyDown('ArrowUp')) kbDy = -1;
                if (keyDown('KeyS') || keyDown('ArrowDown')) kbDy = 1;
                if (keyDown('KeyA') || keyDown('ArrowLeft')) kbDx = -1;
                if (keyDown('KeyD') || keyDown('ArrowRight')) kbDx = 1;
            }
            
            const kbSpeed = (this.rtsKeyboardPanSpeed / effectiveZoom) * dt;
            finalX += kbDx * kbSpeed;
            finalY += kbDy * kbSpeed;
        }
        
        const wheel = typeof mouseWheel === 'function' ? mouseWheel() : 0;
        // --- Scroll wheel zoom ---
        if (this.rtsZoomEnabled) {
            if (wheel !== 0) {
                const zoomDelta = wheel > 0 ? -this.rtsZoomSpeed : this.rtsZoomSpeed;
                this._rtsTargetZoom = Math.max(this.rtsZoomMin, Math.min(this.rtsZoomMax, this._rtsTargetZoom + zoomDelta));
            }
            
            const prevZoom = effectiveZoom;
            effectiveZoom += (this._rtsTargetZoom - effectiveZoom) * this.rtsZoomSmoothing;
            this.zoom = effectiveZoom;
            
            // Only reposition viewport when user is actively scrolling, not during smooth interpolation
            if (wheel !== 0 && Math.abs(prevZoom - effectiveZoom) > 0.0001) {
                const centerWorldX = finalX + canvas.width / (2 * prevZoom);
                const centerWorldY = finalY + canvas.height / (2 * prevZoom);
                finalX = centerWorldX - canvas.width / (2 * effectiveZoom);
                finalY = centerWorldY - canvas.height / (2 * effectiveZoom);
            }
        }

        if (this.keepWithinSceneBounds && window.gameEngine) {
            const sceneWidth = window.gameEngine.sceneWidth;
            const sceneHeight = window.gameEngine.sceneHeight;
            if (sceneWidth > 0 && sceneHeight > 0) {
                const viewWidth = canvas.width / effectiveZoom;
                const viewHeight = canvas.height / effectiveZoom;
                if (finalX < 0) finalX = 0;
                if (finalY < 0) finalY = 0;
                if (finalX + viewWidth > sceneWidth) finalX = sceneWidth - viewWidth;
                if (finalY + viewHeight > sceneHeight) finalY = sceneHeight - viewHeight;
                if (viewWidth > sceneWidth) finalX = (sceneWidth - viewWidth) / 2;
                if (viewHeight > sceneHeight) finalY = (sceneHeight - viewHeight) / 2;
            }
        }
        
        return { finalX, finalY, effectiveZoom };
    }
    
    // ==================== PUBLIC METHODS ====================
    
    /**
     * Set camera bounds
     * @param {number} minX
     * @param {number} maxX
     * @param {number} minY
     * @param {number} maxY
     */
    setBounds(minX, maxX, minY, maxY) {
        this.bounds = { minX, maxX, minY, maxY };
    }
    
    /**
     * Clear camera bounds
     */
    clearBounds() {
        this.bounds = null;
    }
    
    /**
     * Test shake for editor preview
     */
    testShake() {
        this.shake(15, 400);
    }
    
    /**
     * Shake the camera
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in ms
     * @param {string} type - Shake type: 'random', 'horizontal', 'vertical'
     */
    shake(intensity = 10, duration = 500, type = 'random') {
        if (!window.gameEngine || !window.gameEngine.viewport) return;
        
        const startTime = Date.now();
        const viewport = window.gameEngine.viewport;
        const originalX = viewport.x;
        const originalY = viewport.y;
        
        const shakeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= duration) {
                clearInterval(shakeInterval);
                viewport.x = originalX;
                viewport.y = originalY;
                return;
            }
            
            const progress = elapsed / duration;
            const currentIntensity = intensity * (1 - progress);
            
            let offsetX = 0;
            let offsetY = 0;
            
            switch (type) {
                case 'horizontal':
                    offsetX = (Math.random() - 0.5) * currentIntensity * 2;
                    break;
                case 'vertical':
                    offsetY = (Math.random() - 0.5) * currentIntensity * 2;
                    break;
                case 'random':
                default:
                    offsetX = (Math.random() - 0.5) * currentIntensity * 2;
                    offsetY = (Math.random() - 0.5) * currentIntensity * 2;
                    break;
            }
            
            viewport.x = originalX + offsetX;
            viewport.y = originalY + offsetY;
        }, 16);
    }
    
    /**
     * Force transition to a specific screen (for screen-to-screen mode)
     * @param {number} screenX - Screen X index
     * @param {number} screenY - Screen Y index
     * @param {boolean} instant - If true, snap instantly instead of sliding
     */
    goToScreen(screenX, screenY, instant = false) {
        if (!window.gameEngine || !window.gameEngine.canvas) return;
        
        const canvas = window.gameEngine.canvas;
        this._currentScreenX = screenX;
        this._currentScreenY = screenY;
        
        if (instant || this.screenTransition === 'snap') {
            window.gameEngine.viewport.x = screenX * canvas.width;
            window.gameEngine.viewport.y = screenY * canvas.height;
            this._isTransitioning = false;
        } else {
            this._isTransitioning = true;
            this._transitionStartX = window.gameEngine.viewport.x;
            this._transitionStartY = window.gameEngine.viewport.y;
            this._transitionTargetX = screenX * canvas.width;
            this._transitionTargetY = screenY * canvas.height;
            this._transitionProgress = 0;
        }
    }
    
    /**
     * Get the current screen coordinates (for screen-to-screen mode)
     * @returns {{x: number, y: number}}
     */
    getCurrentScreen() {
        return {
            x: this._currentScreenX,
            y: this._currentScreenY
        };
    }
    
    /**
     * Render viewport grid (called by engine during render phase)
     * Draws yellow grid lines at viewport width/height intervals in world space
     * Grid starts at 0,0 world coordinates for screen-to-screen level design
     */
    draw(ctx) {
        if (!this.showViewportGrid || !this.gameObject.isEditing) return;
        const engine = this.gameObject._engine;
        if (!engine || !engine.viewport || !engine.canvas) return;
        //if (!window.gameEngine || !window.gameEngine.viewport || !window.gameEngine.canvas) return;

        const viewport = engine.viewport;
        const canvas = engine.canvas;
        const zoom = viewport.zoom || 1;
        
        // Cell size = viewport dimensions (one cell = one screen)
        const cellWidth = this.viewportDefaultWidth;
        const cellHeight = this.viewportDefaultHeight;
        
        // Visible area in world coordinates
        const visibleWidth = canvas.width / zoom;
        const visibleHeight = canvas.height / zoom;
        const viewLeft = viewport.x;
        const viewTop = viewport.y;
        const viewRight = viewLeft + visibleWidth;
        const viewBottom = viewTop + visibleHeight;
        
        // Find the first grid line visible (starting from world 0,0)
        const firstVerticalLine = Math.floor(viewLeft / cellWidth) * cellWidth;
        const firstHorizontalLine = Math.floor(viewTop / cellHeight) * cellHeight;
        
        // Convert world position to screen position
        const worldToScreen = (worldX, worldY) => {
            return {
                x: (worldX - viewLeft) * zoom,
                y: (worldY - viewTop) * zoom
            };
        };
        
        // Switch to untethered drawing (removes GameObject transform)
        this.drawUntethered(ctx);
        
        ctx.save();
        
        // Reset to screen-space drawing (remove viewport transform)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Grid styling
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        
        // Draw vertical lines (convert world positions to screen positions)
        for (let worldX = firstVerticalLine; worldX <= viewRight; worldX += cellWidth) {
            const screenPosTop = worldToScreen(worldX, viewTop);
            const screenPosBottom = worldToScreen(worldX, viewBottom);
            
            ctx.beginPath();
            ctx.moveTo(screenPosTop.x, screenPosTop.y);
            ctx.lineTo(screenPosBottom.x, screenPosBottom.y);
            ctx.stroke();
        }
        
        // Draw horizontal lines (convert world positions to screen positions)
        for (let worldY = firstHorizontalLine; worldY <= viewBottom; worldY += cellHeight) {
            const screenPosLeft = worldToScreen(viewLeft, worldY);
            const screenPosRight = worldToScreen(viewRight, worldY);
            
            ctx.beginPath();
            ctx.moveTo(screenPosLeft.x, screenPosLeft.y);
            ctx.lineTo(screenPosRight.x, screenPosRight.y);
            ctx.stroke();
        }
        
        // Draw origin marker (0,0) if visible
        if (0 >= viewLeft && 0 <= viewRight && 0 >= viewTop && 0 <= viewBottom) {
            const originScreen = worldToScreen(0, 0);
            
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            
            // Draw crosshair at world origin (0,0)
            const markerSize = 20;
            ctx.beginPath();
            ctx.moveTo(originScreen.x - markerSize, originScreen.y);
            ctx.lineTo(originScreen.x + markerSize, originScreen.y);
            ctx.moveTo(originScreen.x, originScreen.y - markerSize);
            ctx.lineTo(originScreen.x, originScreen.y + markerSize);
            ctx.stroke();
            
            // Label origin
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.font = '14px monospace';
            ctx.fillText('0,0', originScreen.x + 5, originScreen.y - 5);
        }
        
        // Draw screen cell labels at each grid intersection
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.font = '12px monospace';
        
        for (let worldX = firstVerticalLine; worldX <= viewRight; worldX += cellWidth) {
            for (let worldY = firstHorizontalLine; worldY <= viewBottom; worldY += cellHeight) {
                const gridX = Math.round(worldX / cellWidth);
                const gridY = Math.round(worldY / cellHeight);
                
                const screenPos = worldToScreen(worldX, worldY);
                
                // Draw label at intersection in screen space (offset slightly)
                ctx.fillText(`[${gridX},${gridY}]`, screenPos.x + 5, screenPos.y + 15);
            }
        }
        
        ctx.restore();
        
        // Restore GameObject-relative drawing
        this.drawTethered(ctx);
    }
    
    /**
     * Flash zoom effect (zoom in/out quickly)
     * @param {number} targetZoom - Zoom level to flash to
     * @param {number} duration - Duration in ms
     */
    flashZoom(targetZoom = 1.5, duration = 200) {
        const originalZoom = this.zoom;
        const startTime = Date.now();
        
        const flashInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(flashInterval);
                this.zoom = originalZoom;
                return;
            }
            
            // Sine wave for smooth in-out effect
            const flashProgress = Math.sin(progress * Math.PI);
            this.zoom = originalZoom + (targetZoom - originalZoom) * flashProgress;
        }, 16);
    }
    
    // ==================== SERIALIZATION ====================
    
        
        
    
            
    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON();
        json.type = 'Camera';
        json.cameraType = this.cameraType;
        json.zoom = this.zoom;
        json.zoomSmoothing = this.zoomSmoothing;
        json.bounds = this.bounds;
        json.backgroundColor = this.backgroundColor;
        json.viewportDefaultWidth = this.viewportDefaultWidth;
        json.viewportDefaultHeight = this.viewportDefaultHeight;
        json.followSmoothing = this.followSmoothing;
        json.followOffsetX = this.followOffsetX;
        json.followOffsetY = this.followOffsetY;
        json.deadZoneEnabled = this.deadZoneEnabled;
        json.deadZoneWidth = this.deadZoneWidth;
        json.deadZoneHeight = this.deadZoneHeight;
        json.lookAheadEnabled = this.lookAheadEnabled;
        json.lookAheadDistance = this.lookAheadDistance;
        json.lookAheadSmoothing = this.lookAheadSmoothing;
        json.mouseLookAheadEnabled = this.mouseLookAheadEnabled;
        json.mouseLookAheadIntensity = this.mouseLookAheadIntensity;
        json.mouseLookAheadSmoothing = this.mouseLookAheadSmoothing;
        json.mouseLookAheadMargin = this.mouseLookAheadMargin;
        json.screenTransition = this.screenTransition;
        json.slideSpeed = this.slideSpeed;
        json.screenPadding = this.screenPadding;
        json.speedZoomEnabled = this.speedZoomEnabled;
        json.speedZoomIntensity = this.speedZoomIntensity;
        json.speedZoomMaxSpeed = this.speedZoomMaxSpeed;
        json.speedZoomMinZoom = this.speedZoomMinZoom;
        json.speedZoomSmoothing = this.speedZoomSmoothing;
        json.rotationFollowEnabled = this.rotationFollowEnabled;
        json.rotationSmoothing = this.rotationSmoothing;
        json.keepWithinSceneBounds = this.keepWithinSceneBounds;
        json.showViewportGrid = this.showViewportGrid;
        json.rtsPanWithRightMouse = this.rtsPanWithRightMouse;
        json.rtsPanWithMiddleMouse = this.rtsPanWithMiddleMouse;
        json.rtsPanSpeed = this.rtsPanSpeed;
        json.rtsEdgeScrollEnabled = this.rtsEdgeScrollEnabled;
        json.rtsEdgeScrollSpeed = this.rtsEdgeScrollSpeed;
        json.rtsEdgeScrollMargin = this.rtsEdgeScrollMargin;
        json.rtsZoomEnabled = this.rtsZoomEnabled;
        json.rtsZoomSpeed = this.rtsZoomSpeed;
        json.rtsZoomMin = this.rtsZoomMin;
        json.rtsZoomMax = this.rtsZoomMax;
        json.rtsZoomSmoothing = this.rtsZoomSmoothing;
        json.rtsKeyboardPanEnabled = this.rtsKeyboardPanEnabled;
        json.rtsKeyboardPanSpeed = this.rtsKeyboardPanSpeed;
        // TDTD Z-zoom
        json.tdtdZoomEnabled = this.tdtdZoomEnabled;
        json.tdtdZoomScale = this.tdtdZoomScale;
        json.tdtdZoomSmoothing = this.tdtdZoomSmoothing;
        json.pixelPerfect = this.pixelPerfect;
        return json;
    }

    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {Camera} New instance
     */
    static fromJSON(json) {
        const module = new Camera();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.cameraType = json.cameraType ?? 'follow';
        module.zoom = json.zoom ?? 1.0;
        module.zoomSmoothing = json.zoomSmoothing ?? 0.1;
        module.bounds = json.bounds !== undefined ? json.bounds : null;
        module.backgroundColor = json.backgroundColor ?? '#000000';
        module.viewportDefaultWidth = json.viewportDefaultWidth ?? 800;
        module.viewportDefaultHeight = json.viewportDefaultHeight ?? 600;
        module.followSmoothing = json.followSmoothing ?? 0.1;
        module.followOffsetX = json.followOffsetX ?? 0;
        module.followOffsetY = json.followOffsetY ?? 0;
        module.deadZoneEnabled = json.deadZoneEnabled ?? false;
        module.deadZoneWidth = json.deadZoneWidth ?? 100;
        module.deadZoneHeight = json.deadZoneHeight ?? 100;
        module.lookAheadEnabled = json.lookAheadEnabled ?? false;
        module.lookAheadDistance = json.lookAheadDistance ?? 100;
        module.lookAheadSmoothing = json.lookAheadSmoothing ?? 0.02;
        module.mouseLookAheadEnabled = json.mouseLookAheadEnabled ?? false;
        module.mouseLookAheadIntensity = json.mouseLookAheadIntensity ?? 0.5;
        module.mouseLookAheadSmoothing = json.mouseLookAheadSmoothing ?? 0.03;
        module.mouseLookAheadMargin = json.mouseLookAheadMargin ?? 100;
        module.screenTransition = json.screenTransition ?? 'slide';
        module.slideSpeed = json.slideSpeed ?? 500;
        module.screenPadding = json.screenPadding ?? 0;
        module.speedZoomEnabled = json.speedZoomEnabled ?? false;
        module.speedZoomIntensity = json.speedZoomIntensity ?? 0.5;
        module.speedZoomMaxSpeed = json.speedZoomMaxSpeed ?? 500;
        module.speedZoomMinZoom = json.speedZoomMinZoom ?? 0.5;
        module.speedZoomSmoothing = json.speedZoomSmoothing ?? 0.05;
        module.rotationFollowEnabled = json.rotationFollowEnabled ?? false;
        module.rotationSmoothing = json.rotationSmoothing ?? 0.1;
        module.keepWithinSceneBounds = json.keepWithinSceneBounds ?? false;
        module.showViewportGrid = json.showViewportGrid ?? false;
        module.rtsPanWithRightMouse = json.rtsPanWithRightMouse ?? true;
        module.rtsPanWithMiddleMouse = json.rtsPanWithMiddleMouse ?? true;
        module.rtsPanSpeed = json.rtsPanSpeed ?? 1.0;
        module.rtsEdgeScrollEnabled = json.rtsEdgeScrollEnabled ?? true;
        module.rtsEdgeScrollSpeed = json.rtsEdgeScrollSpeed ?? 400;
        module.rtsEdgeScrollMargin = json.rtsEdgeScrollMargin ?? 20;
        module.rtsZoomEnabled = json.rtsZoomEnabled ?? true;
        module.rtsZoomSpeed = json.rtsZoomSpeed ?? 0.1;
        module.rtsZoomMin = json.rtsZoomMin ?? 0.2;
        module.rtsZoomMax = json.rtsZoomMax ?? 5.0;
        module.rtsZoomSmoothing = json.rtsZoomSmoothing ?? 0.15;
        module.rtsKeyboardPanEnabled = json.rtsKeyboardPanEnabled ?? false;
        module.rtsKeyboardPanSpeed = json.rtsKeyboardPanSpeed ?? 500;
        // TDTD Z-zoom
        module.tdtdZoomEnabled = json.tdtdZoomEnabled ?? false;
        module.tdtdZoomScale = json.tdtdZoomScale ?? 0.005;
        module.tdtdZoomSmoothing = json.tdtdZoomSmoothing ?? 0.1;
        
        module.pixelPerfect = json.pixelPerfect;
        return module;
    }

    /**
     * Clone the module
     * @returns {Camera} Cloned module
     */
    clone() {
        return Camera.fromJSON(this.toJSON());
    }

    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>📷 Camera Overview</h2>
            <p>The <strong>Camera</strong> module controls the game viewport, determining what the player sees on screen. It supports multiple camera modes for different game types:</p>
            <ul>
                <li><strong>Follow</strong> — Smoothly tracks a target GameObject (player, vehicle, etc.)</li>
                <li><strong>Screen-to-Screen</strong> — Snaps or transitions between discrete screen-sized areas</li>
                <li><strong>Static</strong> — Fixed camera position with optional manual control</li>
            </ul>
            <p>Additionally, the camera supports <strong>RTS-style controls</strong> (edge scrolling, drag panning, zoom), <strong>screen shake</strong>, <strong>zoom effects</strong>, and <strong>bounds clamping</strong>.</p>

            <div class="tip">Only one Camera module should be active at a time. Attach it to a dedicated "Camera" GameObject in your scene.</div>
        `,

        "Camera Modes": `
            <h2>🎯 Camera Modes</h2>
            <p>Set the <code>cameraType</code> property (or use the Prefab Editor dropdown) to choose a mode:</p>

            <h3>Follow Mode</h3>
            <p>The camera smoothly follows a target GameObject. Configure the tracking behavior:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>followSmoothing</code></td><td>How quickly the camera catches up (0 = instant, 1 = very slow). Default: <code>0.1</code></td></tr>
                <tr><td><code>deadZoneX / deadZoneY</code></td><td>Area around center where the target can move without the camera following</td></tr>
                <tr><td><code>lookAheadX / lookAheadY</code></td><td>Offset the camera in the direction the target is moving</td></tr>
                <tr><td><code>mouseLookAhead</code></td><td>Offset toward the mouse cursor position for aiming games</td></tr>
                <tr><td><code>rotationFollow</code></td><td>Camera rotates to match the target's rotation</td></tr>
            </table>
            <pre><code>start() {
    const cam = this.getModule('Camera');
    cam.cameraType = 'follow';
    cam.followSmoothing = 0.08;
    cam.deadZoneX = 50;
    cam.deadZoneY = 30;
}</code></pre>

            <h3>Screen-to-Screen Mode</h3>
            <p>Divides the world into screen-sized cells. The camera snaps (or transitions) when the target crosses a cell boundary — classic for Zelda-style or room-based games.</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>screenTransitionSpeed</code></td><td>Speed of the transition between screens (higher = faster)</td></tr>
            </table>
            <pre><code>// Instantly jump to a specific screen
const cam = this.getModule('Camera');
cam.goToScreen(2, 1, true); // column 2, row 1, instant

// Get which screen the camera is currently viewing
const screen = cam.getCurrentScreen(); // { x, y }</code></pre>

            <h3>Static Mode</h3>
            <p>The camera stays at a fixed position. Useful for menu screens, cutscenes, or single-screen games.</p>
        `,

        "Zoom & Effects": `
            <h2>🔍 Zoom & Effects</h2>

            <h3>Zoom</h3>
            <p>Control the camera zoom level:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>zoom</code></td><td>Current zoom level. <code>1.0</code> = normal, <code>2.0</code> = 2x magnification</td></tr>
                <tr><td><code>speedZoom</code></td><td>Automatically reduce zoom based on target speed (useful for racing games)</td></tr>
                <tr><td><code>speedZoomScale</code></td><td>How much speed affects zoom</td></tr>
                <tr><td><code>speedZoomMin</code></td><td>Minimum zoom when at max speed</td></tr>
            </table>
            <pre><code>// Flash zoom effect (e.g., on impact)
const cam = this.getModule('Camera');
cam.flashZoom(1.3, 0.3); // zoom to 1.3x over 0.3 seconds, then return</code></pre>

            <h3>Screen Shake</h3>
            <p>Add camera shake for impacts, explosions, or emphasis:</p>
            <pre><code>const cam = this.getModule('Camera');

// Random shake (default)
cam.shake(8, 0.5);  // intensity 8px, duration 0.5s

// Horizontal shake only
cam.shake(10, 0.3, 'horizontal');

// Vertical shake only
cam.shake(6, 0.4, 'vertical');</code></pre>

            <div class="tip">Shake intensity is in pixels. Values around 5-15 work well for most effects. Higher values create more dramatic shakes.</div>
        `,

        "Bounds & Clamping": `
            <h2>🔒 Bounds & Clamping</h2>
            <p>Restrict the camera to a rectangular region so it doesn't show areas outside your level:</p>
            <pre><code>const cam = this.getModule('Camera');

// Set bounds to match your level size
cam.setBounds(0, 0, 3200, 1800);

// Remove bounds
cam.clearBounds();</code></pre>

            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>useBounds</code></td><td>Enable/disable bounds clamping</td></tr>
                <tr><td><code>boundsX / boundsY</code></td><td>Top-left corner of the bounds region</td></tr>
                <tr><td><code>boundsWidth / boundsHeight</code></td><td>Size of the bounds region</td></tr>
            </table>

            <div class="warning">Bounds should be at least as large as the viewport. If bounds are smaller than the viewport, clamping behavior may look odd.</div>
        `,

        "RTS Controls": `
            <h2>🗺️ RTS Controls</h2>
            <p>Enable real-time strategy style camera controls for top-down games, level editors, or strategy games:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>rtsPanEnabled</code></td><td>Enable mouse-drag panning</td></tr>
                <tr><td><code>rtsPanSpeed</code></td><td>Pan speed multiplier</td></tr>
                <tr><td><code>rtsPanButton</code></td><td>Mouse button for panning (default: middle button)</td></tr>
                <tr><td><code>rtsEdgeScrollEnabled</code></td><td>Pan when the mouse reaches screen edges</td></tr>
                <tr><td><code>rtsEdgeScrollSpeed</code></td><td>Edge scroll speed</td></tr>
                <tr><td><code>rtsEdgeScrollMargin</code></td><td>How many pixels from the edge to trigger scrolling</td></tr>
                <tr><td><code>rtsZoomEnabled</code></td><td>Enable scroll-wheel zoom</td></tr>
                <tr><td><code>rtsZoomSpeed</code></td><td>Zoom speed per scroll tick</td></tr>
                <tr><td><code>rtsZoomMin / rtsZoomMax</code></td><td>Zoom range limits</td></tr>
                <tr><td><code>rtsKeyboardPanEnabled</code></td><td>Pan camera with WASD/arrow keys</td></tr>
                <tr><td><code>rtsKeyboardPanSpeed</code></td><td>Keyboard pan speed in pixels/second</td></tr>
            </table>

            <pre><code>start() {
    const cam = this.getModule('Camera');
    cam.cameraType = 'static';
    cam.rtsPanEnabled = true;
    cam.rtsZoomEnabled = true;
    cam.rtsZoomMin = 0.5;
    cam.rtsZoomMax = 3.0;
    cam.rtsEdgeScrollEnabled = true;
}</code></pre>

            <div class="tip">RTS controls work best with <code>cameraType = 'static'</code>. They can also combine with follow mode for hybrid behavior.</div>
        `,

        "API Reference": `
            <h2>📖 API Reference</h2>
            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>shake(intensity, duration, type?)</code></td><td>Trigger screen shake. Type: <code>'random'</code>, <code>'horizontal'</code>, or <code>'vertical'</code></td></tr>
                <tr><td><code>flashZoom(targetZoom, duration)</code></td><td>Quick zoom effect that returns to normal</td></tr>
                <tr><td><code>setBounds(x, y, w, h)</code></td><td>Set camera bounds region</td></tr>
                <tr><td><code>clearBounds()</code></td><td>Remove camera bounds</td></tr>
                <tr><td><code>goToScreen(x, y, instant?)</code></td><td>Jump to a specific screen cell (screen-to-screen mode)</td></tr>
                <tr><td><code>getCurrentScreen()</code></td><td>Returns <code>{ x, y }</code> of the current screen cell</td></tr>
                <tr><td><code>worldToScreen(worldX, worldY)</code></td><td>Convert world coordinates to screen coordinates</td></tr>
                <tr><td><code>screenToWorld(screenX, screenY)</code></td><td>Convert screen coordinates to world coordinates</td></tr>
                <tr><td><code>getVisibleBounds()</code></td><td>Returns <code>{ left, top, right, bottom }</code> of visible area</td></tr>
            </table>

            <h3>Reading Camera State</h3>
            <pre><code>const cam = this.getModule('Camera');

// Get current camera position
const x = cam.gameObject.x;  // Camera X
const y = cam.gameObject.y;  // Camera Y

// Get zoom level
const zoom = cam.zoom;

// Check visible area
const bounds = cam.getVisibleBounds();
// { left, top, right, bottom }</code></pre>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>cameraType</code></td><td>select</td><td>'follow'</td><td>Camera mode: follow, screenToScreen, static</td></tr>
                <tr><td><code>zoom</code></td><td>number</td><td>1.0</td><td>Zoom level (1 = normal)</td></tr>
                <tr><td><code>followSmoothing</code></td><td>slider</td><td>0.1</td><td>Follow smoothing factor (0-1)</td></tr>
                <tr><td><code>deadZoneX</code></td><td>number</td><td>0</td><td>Horizontal dead zone in pixels</td></tr>
                <tr><td><code>deadZoneY</code></td><td>number</td><td>0</td><td>Vertical dead zone in pixels</td></tr>
                <tr><td><code>lookAheadX</code></td><td>number</td><td>0</td><td>Look-ahead distance X</td></tr>
                <tr><td><code>lookAheadY</code></td><td>number</td><td>0</td><td>Look-ahead distance Y</td></tr>
                <tr><td><code>mouseLookAhead</code></td><td>number</td><td>0</td><td>Mouse look-ahead distance</td></tr>
                <tr><td><code>screenTransitionSpeed</code></td><td>number</td><td>5</td><td>Screen transition speed</td></tr>
                <tr><td><code>speedZoom</code></td><td>boolean</td><td>false</td><td>Auto zoom based on speed</td></tr>
                <tr><td><code>speedZoomScale</code></td><td>number</td><td>0.001</td><td>Speed zoom intensity</td></tr>
                <tr><td><code>speedZoomMin</code></td><td>number</td><td>0.7</td><td>Min zoom at max speed</td></tr>
                <tr><td><code>rotationFollow</code></td><td>boolean</td><td>false</td><td>Rotate camera with target</td></tr>
                <tr><td><code>useBounds</code></td><td>boolean</td><td>false</td><td>Enable bounds clamping</td></tr>
            </table>
        `
    };
}

// Register module globally
if (typeof window !== 'undefined') {
    window.Camera = Camera;
}
