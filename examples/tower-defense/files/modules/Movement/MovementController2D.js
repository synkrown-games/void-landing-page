/**
 * MovementController2D Module
 * Versatile movement controller supporting both top-down and platformer modes.
 * 
 * TOP-DOWN MODE:  8-directional movement with wall sliding
 * PLATFORMER MODE: Gravity, jumping, slopes, coyote time, wall jumps, and more
 * 
 * Works with BoxCollider, SphereCollider, and PolygonCollider.
 */

class MovementController2D extends Module {
    constructor() {
        super();
        
        // ── Mode ──
        this.movementMode = 'topdown';   // 'topdown' or 'platformer' or 'topdown rotation'
        
        // ── Core Movement ──
        this.moveSpeed = 200;            // Horizontal speed (px/s)
        this.acceleration = 0;           // Acceleration factor (0 = instant)
        this.deceleration = 0;           // Deceleration factor (0 = instant)
        this.diagonalNormalize = true;   // Prevent faster diagonal speed (top-down)
        
        // ── Key Bindings ──
        this.upKey = 'KeyW';
        this.downKey = 'KeyS';
        this.leftKey = 'KeyA';
        this.rightKey = 'KeyD';
        this.useArrowKeys = true;
        
        // ── Top-Down Rotate ──
        this.rotationSpeed = 180;        // Degrees/s rotation speed
        this.strafeLeftKey = 'KeyQ';     // Strafe left (topdown rotate)
        this.strafeRightKey = 'KeyE';    // Strafe right (topdown rotate)
        
        // ── Jump (platformer) ──
        this.jumpKey = 'Space';
        this.jumpForce = 400;            // Initial jump velocity (px/s)
        this.variableJumpHeight = true;  // Release jump key to cut jump short
        this.jumpCutMultiplier = 0.4;    // Velocity multiplied when jump is cut
        this.maxJumps = 1;               // 1 = single, 2 = double, etc.
        this.coyoteTime = 0.1;           // Seconds after leaving ground you can still jump
        this.jumpBufferTime = 0.1;       // Pre-press window (seconds)
        
        // ── Gravity (platformer) ──
        this.gravity = 980;              // Gravity strength (px/s²)
        this.gravityDirection = { x: 0, y: 1 };  // Normalised gravity vector (default: down)
        this.maxFallSpeed = 800;         // Terminal velocity (px/s)
        this.fallingGravityMultiplier = 1.5; // Extra gravity when falling (snappier arcs)
        
        // ── Slopes (platformer) ──
        this.enableSlopes = true;
        this.maxSlopeAngle = 50;         // Max walkable slope (degrees)
        this.slopeRayLength = 20;        // How far below to probe for slope
        this.slopeSnapDistance = 8;       // Snap-to-ground distance when walking downhill
        this.slopeSpeedModifier = true;  // Slow uphill, speed downhill
        
        // ── Wall interaction (platformer) ──
        this.enableWallSlide = false;
        this.wallSlideSpeed = 60;        // Max slide-down speed on walls
        this.enableWallJump = false;
        this.wallJumpForce = { x: 300, y: 400 };  // Wall jump kick vector
        
        // ── Collision ──
        this.checkCollisions = true;
        this.collisionTag = '';
        this.collisionPrecision = 1;
        this.cornerCorrection = 8;
        
        // ── Internal state (not serialised) ──
        this.velocityX = 0;
        this.velocityY = 0;
        this.inputX = 0;
        this.inputY = 0;
        
        // Platformer runtime state
        this._isGrounded = false;
        this._wasGrounded = false;
        this._jumpsRemaining = 1;
        this._coyoteTimer = 0;
        this._jumpBufferTimer = 0;
        this._isTouchingWallLeft = false;
        this._isTouchingWallRight = false;
        this._isWallSliding = false;
        this._groundNormal = { x: 0, y: -1 };
        this._groundAngle = 0;
        this._slopeRight = { x: 1, y: 0 };
        this._onSlope = false;
        this._lastGroundY = 0;
        this._wallJumpLockTimer = 0;
        
        // Debug
        this.showDebug = false;
        
        // ── AI Control ──
        this.playerControlled = true;   // Set false to disable player input (for AI control)
        
        // ── Vehicle Interaction (GTA-Style) ──
        this.vehicleInteraction = false;
        this.vehicleEnterExitKey = 'Enter';
        this.vehicleSearchDistance = 150;
        this.vehicleApproachSpeed = 180;
        
        // ── TDTD Grid World Collision ──
        this.tdtdEnabled = false;          // Enable 3D grid world collision
        this.tdtdZ = 0;                   // Current Z position (height) in the fake 3D world
        this.tdtdHeight = 32;             // Entity height (Z axis) for collision
        this.tdtdGravity = 600;           // Z-axis gravity (px/s²)
        this.tdtdMaxFallSpeed = 800;      // Terminal velocity on Z axis
        this.tdtdMaxStepHeight = 8;       // Max height entity can step up (ramps/stairs)
        this.tdtdCollisionHalfWidth = 8;  // Half-width for AABB grid collision
        this.tdtdCollisionHalfHeight = 8; // Half-height for AABB grid collision
        
        // ── VoxelTerrain2D Collision ──
        this.voxelTerrainEnabled = false;         // Enable collision with VoxelTerrain2D modules
        this.voxelTerrainTag = '';                // Optional: only collide with terrains matching this tag
        
        // VoxelTerrain2D internal state (not serialised)
        this._voxelTerrainModules = null;         // Cached VoxelTerrain2D modules
        this._voxelTerrainLastSearch = 0;         // Timestamp of last module search
        
        // ── TilemapRenderer Collision ──
        this.tilemapEnabled = false;              // Enable collision with TilemapRenderer solid tiles
        this.tilemapTag = '';                     // Optional: only collide with tilemaps matching this tag
        
        // TilemapRenderer internal state (not serialised)
        this._tilemapModules = null;              // Cached TilemapRenderer modules
        this._tilemapLastSearch = 0;              // Timestamp of last module search
        
        // ── Death / Vehicle Hit Detection ──
        this.enableVehicleDeathDetection = true;  // Check for vehicle hits
        this.vehicleDeathSpeedKmh = 20;           // Minimum vehicle speed to kill (km/h)
        this.deadBloodPrefab = '';                // Blood prefab to spawn on death
        this.deadDepth = 1000;                    // Depth to set when dead
        
        // ── Dead State (runtime) ──
        this._isDead = false;
        this._savedDepth = 0;
        this._savedColliders = [];  // Stored collider enabled states
        
        // TDTD internal state (not serialised)
        this._tdtdVelocityZ = 0;
        this._tdtdGrounded = false;
        this._tdtdGridWorld = null;       // Cached reference to TDTDGridWorld module
        
            // Vehicle interaction internal state (not serialised)
        this._vehicleState = 'onFoot';
        this._targetVehicle = null;
        this._targetVehicleGO = null;
        this._targetDoorX = 0;
        this._targetDoorY = 0;
        this._currentVehicle = null;
        this._currentVehicleGO = null;
        this._savedScaleX = 1;
        this._savedScaleY = 1;
        this._savedColliderEnabled = true;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Movement';
    
    static getIcon() {
        return '🕹️';
    }
    
    static getDescription() {
        return 'Versatile 2D movement: top-down (8-dir) or platformer (gravity, jump, slopes)';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    getPropertyMetadata() {
        const isPlatformer    = { movementMode: 'platformer' };
        const isTopdown       = { movementMode: 'topdown' };
        const isTopdownRotate = { movementMode: 'topdownRotate' };
        const isTopdownAny    = (m) => m.movementMode === 'topdown' || m.movementMode === 'topdownRotate';
        
        return [
            // ═══════════════════════════════════════
            //  MODE
            // ═══════════════════════════════════════
            { type: 'header', label: '🎮 Mode' },
            {
                key: 'movementMode', type: 'select', label: 'Movement Mode', default: 'topdown',
                options: { topdown: '⬆️ Top-Down (8-Dir)', topdownRotate: '🔄 Top-Down Rotate', platformer: '🏃 Platformer (Side-Scroll)' },
                hint: 'Top-down: free 8-directional. Platformer: gravity + jump + slopes.'
            },
            
            // ═══════════════════════════════════════
            //  CORE MOVEMENT
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🕹️ Movement' },
                { key: 'moveSpeed', type: 'number', label: 'Move Speed', default: 200, min: 0, hint: 'Horizontal movement speed in pixels/second' },
                { key: 'acceleration', type: 'number', label: 'Acceleration', default: 0, min: 0, hint: '0 = instant speed change. Higher = smoother ramp-up.' },
                { key: 'deceleration', type: 'number', label: 'Deceleration', default: 0, min: 0, hint: '0 = instant stop. Higher = slides to a halt.' },
                { key: 'diagonalNormalize', type: 'boolean', label: 'Normalize Diagonal', default: true, showIf: isTopdown },
                { type: 'hint', label: 'Prevents faster diagonal movement', showIf: isTopdown },
                { key: 'rotationSpeed', type: 'number', label: 'Rotation Speed (°/s)', default: 180, min: 10, max: 720, step: 5, hint: 'How fast the object rotates left/right', showIf: isTopdownRotate },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  KEY BINDINGS
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '⌨️ Key Bindings' },
                { key: 'upKey', type: 'key', label: 'Up / Forward Key', default: 'KeyW', showIf: isTopdownAny },
                { key: 'downKey', type: 'key', label: 'Down / Backward Key', default: 'KeyS', showIf: isTopdownAny },
                { key: 'leftKey', type: 'key', label: 'Left Key', default: 'KeyA' },
                { key: 'rightKey', type: 'key', label: 'Right Key', default: 'KeyD' },
                { key: 'strafeLeftKey', type: 'key', label: 'Strafe Left Key', default: 'KeyQ', showIf: isTopdownRotate },
                { key: 'strafeRightKey', type: 'key', label: 'Strafe Right Key', default: 'KeyE', showIf: isTopdownRotate },
                { key: 'jumpKey', type: 'key', label: 'Jump Key', default: 'Space', showIf: isPlatformer },
                { key: 'useArrowKeys', type: 'boolean', label: 'Also Use Arrow Keys', default: true },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  GRAVITY  (platformer only)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🌍 Gravity', showIf: isPlatformer },
                { key: 'gravity', type: 'number', label: 'Gravity', default: 980, min: 0, hint: 'Acceleration due to gravity (px/s²)' },
                { key: 'gravityDirection', type: 'vector2', label: 'Gravity Direction', default: { x: 0, y: 1 }, hint: 'Normalised direction vector. (0,1) = down, (0,-1) = up, (1,0) = right' },
                { key: 'maxFallSpeed', type: 'number', label: 'Max Fall Speed', default: 800, min: 0, hint: 'Terminal velocity in px/s' },
                { key: 'fallingGravityMultiplier', type: 'slider', label: 'Falling Gravity ×', default: 1.5, min: 1, max: 5, step: 0.1, hint: 'Extra gravity pull when falling — makes arcs snappier' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  JUMP  (platformer only)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🦘 Jump', showIf: isPlatformer },
                { key: 'jumpForce', type: 'number', label: 'Jump Force', default: 400, min: 0, hint: 'Initial upward velocity when jumping (px/s)' },
                { key: 'maxJumps', type: 'number', label: 'Max Jumps', default: 1, min: 1, max: 5, hint: '1 = single jump, 2 = double jump, etc.' },
                { key: 'variableJumpHeight', type: 'boolean', label: 'Variable Height', default: true, hint: 'Release jump key early to cut the jump short' },
                { key: 'jumpCutMultiplier', type: 'slider', label: 'Jump Cut ×', default: 0.4, min: 0.1, max: 1, step: 0.05, showIf: { variableJumpHeight: true }, hint: 'Velocity multiplier when jump is cut (lower = shorter min jump)' },
                
                { type: 'groupStart', label: '⏱️ Timing Assists' },
                    { key: 'coyoteTime', type: 'slider', label: 'Coyote Time', default: 0.1, min: 0, max: 0.5, step: 0.01, hint: 'Grace period after walking off a ledge where jump still works' },
                    { key: 'jumpBufferTime', type: 'slider', label: 'Jump Buffer', default: 0.1, min: 0, max: 0.5, step: 0.01, hint: 'Pre-press: hit jump slightly before landing and it still triggers' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  SLOPES  (platformer only)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '⛰️ Slopes', showIf: isPlatformer },
                { key: 'enableSlopes', type: 'boolean', label: 'Enable Slopes', default: true },
                { key: 'maxSlopeAngle', type: 'slider', label: 'Max Slope Angle', default: 50, min: 0, max: 89, showIf: { enableSlopes: true }, hint: 'Steeper angles become walls' },
                { key: 'slopeRayLength', type: 'number', label: 'Probe Length', default: 20, min: 1, max: 64, showIf: { enableSlopes: true }, hint: 'How far below feet to cast slope detection rays' },
                { key: 'slopeSnapDistance', type: 'number', label: 'Snap Distance', default: 8, min: 0, max: 32, showIf: { enableSlopes: true }, hint: 'Stick to ground when walking downhill' },
                { key: 'slopeSpeedModifier', type: 'boolean', label: 'Slope Speed Adjust', default: true, showIf: { enableSlopes: true }, hint: 'Slower uphill, faster downhill' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  WALL SLIDE / WALL JUMP  (platformer)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🧱 Wall Interaction', showIf: isPlatformer },
                { key: 'enableWallSlide', type: 'boolean', label: 'Wall Slide', default: false, hint: 'Slide slowly down walls when holding toward them' },
                { key: 'wallSlideSpeed', type: 'number', label: 'Slide Speed', default: 60, min: 0, showIf: { enableWallSlide: true }, hint: 'Max downward speed while wall sliding (px/s)' },
                { key: 'enableWallJump', type: 'boolean', label: 'Wall Jump', default: false, showIf: { enableWallSlide: true }, hint: 'Press jump while wall sliding to kick off' },
                { key: 'wallJumpForce', type: 'vector2', label: 'Wall Jump Force', default: { x: 300, y: 400 }, showIf: (m) => m.enableWallSlide && m.enableWallJump, hint: 'X = horizontal kick, Y = upward force' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  COLLISION
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '💥 Collision' },
                { key: 'checkCollisions', type: 'boolean', label: 'Check Collisions', default: true },
                { key: 'collisionTag', type: 'text', label: 'Collision Tag', default: '', showIf: { checkCollisions: true }, hint: 'Leave empty to collide with all solid objects' },
                { key: 'collisionPrecision', type: 'slider', label: 'Precision', default: 1, min: 0.1, max: 10, step: 0.1, showIf: { checkCollisions: true } },
                { key: 'cornerCorrection', type: 'slider', label: 'Corner Correction', default: 8, min: 0, max: 32, showIf: { checkCollisions: true }, hint: 'Nudge around corners to avoid getting stuck' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  VEHICLE INTERACTION (GTA-Style)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🚗 Vehicle Interaction (GTA)' },
            { type: 'hint', label: 'Press a key near a VehicleController to walk to its door, enter, and drive. Movement keys cancel approach.' },
            { key: 'vehicleInteraction', type: 'boolean', label: 'Enable Vehicle Enter/Exit', default: false },
            { key: 'vehicleEnterExitKey', type: 'key', label: 'Enter/Exit Key', default: 'Enter', showIf: { vehicleInteraction: true } },
            { key: 'vehicleSearchDistance', type: 'number', label: 'Search Distance (px)', default: 150, min: 20, max: 500, step: 5, showIf: { vehicleInteraction: true }, hint: 'Max distance to detect a nearby vehicle' },
            { key: 'vehicleApproachSpeed', type: 'number', label: 'Approach Speed', default: 180, min: 50, max: 500, step: 10, showIf: { vehicleInteraction: true }, hint: 'Walk speed when moving toward the vehicle door' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  TDTD GRID WORLD (3D Collision)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🏗️ TDTD Grid World' },
            { type: 'hint', label: 'Enable 3D collision with TDTDGridWorld voxel environments' },
            { key: 'tdtdEnabled', type: 'boolean', label: 'Enable TDTD Collision', default: false },
            { key: 'tdtdZ', type: 'number', label: 'Z Position', default: 0, min: -9999, max: 9999, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Starting height in the 3D world' },
            { key: 'tdtdHeight', type: 'number', label: 'Entity Height (Z)', default: 32, min: 1, max: 512, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Height of the entity collision box on the Z axis' },
            { key: 'tdtdGravity', type: 'number', label: 'Z Gravity', default: 600, min: 0, max: 5000, step: 10,
              showIf: { tdtdEnabled: true }, hint: 'Gravity pulling entity down on the Z axis (px/s²)' },
            { key: 'tdtdMaxFallSpeed', type: 'number', label: 'Max Fall Speed', default: 800, min: 0, max: 5000, step: 10,
              showIf: { tdtdEnabled: true }, hint: 'Terminal velocity on the Z axis' },
            { key: 'tdtdMaxStepHeight', type: 'number', label: 'Max Step Height', default: 8, min: 0, max: 64, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Max height the entity can step up (ramps, stairs)' },
            { key: 'tdtdCollisionHalfWidth', type: 'number', label: 'Collision Half-W', default: 8, min: 1, max: 128, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Half-width of the collision box for grid checks' },
            { key: 'tdtdCollisionHalfHeight', type: 'number', label: 'Collision Half-H', default: 8, min: 1, max: 128, step: 1,
              showIf: { tdtdEnabled: true }, hint: 'Half-height (Y axis) of the collision box for grid checks' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  VOXEL TERRAIN 2D COLLISION
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🟫 VoxelTerrain2D Collision' },
            { type: 'hint', label: 'Enable collision with VoxelTerrain2D voxel-based terrain' },
            { key: 'voxelTerrainEnabled', type: 'boolean', label: 'Enable Voxel Terrain', default: false },
            { key: 'voxelTerrainTag', type: 'text', label: 'Terrain Tag Filter', default: '',
              showIf: { voxelTerrainEnabled: true }, hint: 'Only collide with VoxelTerrain2D modules with this collision tag (empty = all)' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  TILEMAP RENDERER COLLISION
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🗺️ TilemapRenderer Collision' },
            { type: 'hint', label: 'Enable collision with TilemapRenderer solid tiles' },
            { key: 'tilemapEnabled', type: 'boolean', label: 'Enable Tilemap Collision', default: false },
            { key: 'tilemapTag', type: 'text', label: 'Tilemap Tag Filter', default: '',
              showIf: { tilemapEnabled: true }, hint: 'Only collide with TilemapRenderer modules matching this tag (empty = all)' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  AI CONTROL
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🤖 AI Control' },
                { key: 'playerControlled', type: 'boolean', label: 'Player Controlled', default: true, hint: 'Disable to allow AI modules (like MovementController2DBrain) to control movement' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  VEHICLE DEATH DETECTION
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '💀 Vehicle Death Detection' },
                { key: 'enableVehicleDeathDetection', type: 'boolean', label: 'Enable Vehicle Death', default: true, hint: 'Detect when hit by a fast-moving vehicle' },
                { key: 'vehicleDeathSpeedKmh', type: 'number', label: 'Death Speed (km/h)', default: 20, min: 5, max: 200, hint: 'Minimum vehicle speed to trigger death', showIf: { enableVehicleDeathDetection: true } },
                { key: 'deadBloodPrefab', type: 'prefab', label: 'Blood Prefab', default: '', hint: 'Prefab to spawn at death location', showIf: { enableVehicleDeathDetection: true } },
                { key: 'deadDepth', type: 'number', label: 'Dead Depth', default: 1000, hint: 'Depth to set when dead (high = behind most things)', showIf: { enableVehicleDeathDetection: true } },
            { type: 'groupEnd' },
            
            //  DEBUG
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🔧 Debug' },
                { key: 'showDebug', type: 'boolean', label: 'Show Debug Overlay', default: false },
            { type: 'groupEnd' },
        ];
    }
    
    // ==================== LIFECYCLE ====================
    
    start() {
        this.velocityX = 0;
        this.velocityY = 0;
        this.inputX = 0;
        this.inputY = 0;
        
        this._isGrounded = false;
        this._wasGrounded = false;
        this._jumpsRemaining = this.maxJumps;
        this._coyoteTimer = 0;
        this._jumpBufferTimer = 0;
        this._isTouchingWallLeft = false;
        this._isTouchingWallRight = false;
        this._isWallSliding = false;
        this._groundNormal = { x: 0, y: -1 };
        this._groundAngle = 0;
        this._onSlope = false;
        this._lastGroundY = this.gameObject.position.y;
        this._wallJumpLockTimer = 0;
        
        // Vehicle interaction state
        this._vehicleState = 'onFoot';
        this._targetVehicle = null;
        this._targetVehicleGO = null;
        this._currentVehicle = null;
        this._currentVehicleGO = null;
        
        // Dead state
        this._isDead = false;
        this._savedDepth = 0;
        this._savedColliders = [];
        
        // TDTD state
        this._tdtdVelocityZ = 0;
        this._tdtdGrounded = false;
        this._tdtdGridWorld = null;
        
        // VoxelTerrain2D state
        this._voxelTerrainModules = null;
        this._voxelTerrainLastSearch = 0;
        
        // TilemapRenderer state
        this._tilemapModules = null;
        this._tilemapLastSearch = 0;
    }
    
    loop(deltaTime) {
        // ── Dead state - no movement ──
        if (this._isDead) {
            this.velocityX = 0;
            this.velocityY = 0;
            this.inputX = 0;
            this.inputY = 0;
            return;
        }
        
        // ── Vehicle death detection ──
        if (this.enableVehicleDeathDetection && !this._isDead) {
            this._checkVehicleHit();
        }
        
        // ── Vehicle interaction system ──
        if (this.vehicleInteraction) {
            if (this._vehicleState === 'inVehicle') {
                this._updateVehicleInteraction(deltaTime);
                return; // Skip all normal movement while driving
            }
            if (this._vehicleState === 'approaching') {
                this._updateVehicleInteraction(deltaTime);
                // Apply approach movement with collision
                if (this.checkCollisions) {
                    this.moveWithCollision(deltaTime);
                } else {
                    this.gameObject.position.x += this.velocityX * deltaTime;
                    this.gameObject.position.y += this.velocityY * deltaTime;
                }
                return;
            }
            // 'onFoot' — check for vehicle entry, then fall through to normal movement
            this._updateVehicleInteraction(deltaTime);
        }
        
        if (this.movementMode === 'platformer') {
            this._loopPlatformer(deltaTime);
        } else if (this.movementMode === 'topdownRotate') {
            this._loopTopdownRotate(deltaTime);
        } else {
            this._loopTopdown(deltaTime);
        }
        
        // ── Dynamic body push: heavy moving rigidbodies push this player ──
        if (this.checkCollisions) {
            this._applyDynamicBodyPush(deltaTime);
        }
    }
    
    // ==================== TOP-DOWN ROTATE LOOP ====================
    
    _loopTopdownRotate(deltaTime) {
        // When player controlled, read keyboard input. Otherwise AI sets inputX/inputY
        if (this.playerControlled) {
            // ── 1. Rotation input (left/right keys + arrow keys) ──
            let rotateInput = 0;
            if (keyDown(this.leftKey))  rotateInput -= 1;
            if (keyDown(this.rightKey)) rotateInput += 1;
            if (this.useArrowKeys) {
                if (keyDown('ArrowLeft'))  rotateInput -= 1;
                if (keyDown('ArrowRight')) rotateInput += 1;
            }
            rotateInput = Math.max(-1, Math.min(1, rotateInput));
            
            // Apply smooth rotation
            this.gameObject.angle += rotateInput * this.rotationSpeed * deltaTime;
            
            // ── 2. Forward / backward input ──
            let moveForward = 0;
            if (keyDown(this.upKey))   moveForward += 1;
            if (keyDown(this.downKey)) moveForward -= 1;
            if (this.useArrowKeys) {
                if (keyDown('ArrowUp'))   moveForward += 1;
                if (keyDown('ArrowDown')) moveForward -= 1;
            }
            moveForward = Math.max(-1, Math.min(1, moveForward));
            
            // ── 3. Strafe input ──
            let strafeDir = 0;
            if (keyDown(this.strafeLeftKey))  strafeDir -= 1;
            if (keyDown(this.strafeRightKey)) strafeDir += 1;
            strafeDir = Math.max(-1, Math.min(1, strafeDir));
            
            // Normalize diagonal movement
            if (moveForward !== 0 && strafeDir !== 0) {
                const len = Math.sqrt(moveForward * moveForward + strafeDir * strafeDir);
                moveForward /= len;
                strafeDir /= len;
            }
            
            // ── 4. Convert to world-space input based on facing direction ──
            const angleRad = this.gameObject.angle * Math.PI / 180;
            const forwardX =  Math.cos(angleRad);
            const forwardY =  Math.sin(angleRad);
            const rightX   = -Math.sin(angleRad);
            const rightY   =  Math.cos(angleRad);
            
            this.inputX = forwardX * moveForward + rightX * strafeDir;
            this.inputY = forwardY * moveForward + rightY * strafeDir;
        }
        // else: AI brain sets inputX/inputY directly
        
        // ── 5. Apply velocity (uses acceleration / deceleration) ──
        this.updateVelocity(deltaTime);
        
        // ── 6. Move with collision ──
        if (this.tdtdEnabled) {
            // Save pre-move position for TDTD collision recovery
            this._tdtdPreMoveX = this.gameObject.position.x;
            this._tdtdPreMoveY = this.gameObject.position.y;
            // TDTD handles XY movement + 3D grid collision together
            if (!this.checkCollisions) {
                // Apply raw XY movement first (no 2D colliders)
                this.gameObject.position.x += this.velocityX * deltaTime;
                this.gameObject.position.y += this.velocityY * deltaTime;
            } else {
                this.moveWithCollisionSliding(deltaTime);
            }
            this._updateTDTD(deltaTime);
        } else if (this.checkCollisions) {
            this.moveWithCollisionSliding(deltaTime);
        } else {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
        }
    }
    
    // ==================== TOP-DOWN LOOP (unchanged logic) ====================
    
    _loopTopdown(deltaTime) {
        this.updateInput();
        this.updateVelocity(deltaTime);
        
        if (this.tdtdEnabled) {
            // Save pre-move position for TDTD collision recovery
            this._tdtdPreMoveX = this.gameObject.position.x;
            this._tdtdPreMoveY = this.gameObject.position.y;
            // TDTD handles XY movement + 3D grid collision together
            if (!this.checkCollisions) {
                this.gameObject.position.x += this.velocityX * deltaTime;
                this.gameObject.position.y += this.velocityY * deltaTime;
            } else {
                this.moveWithCollision(deltaTime);
            }
            this._updateTDTD(deltaTime);
        } else if (this.checkCollisions) {
            this.moveWithCollision(deltaTime);
        } else {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
        }
    }
    
    // ==================== PLATFORMER LOOP ====================
    
    _loopPlatformer(deltaTime) {
        // ── 1. Input ──
        this._updatePlatformerInput();
        
        // ── 2. Horizontal velocity ──
        this._updatePlatformerHorizontal(deltaTime);
        
        // ── 3. Gravity ──
        this._applyGravity(deltaTime);
        
        // ── 4. Jump logic ──
        this._updateJump(deltaTime);
        
        // ── 5. Wall slide ──
        this._updateWallSlide(deltaTime);
        
        // ── 6. Move with collision ──
        if (this.tdtdEnabled) {
            // Save pre-move position for TDTD wall sliding
            this._tdtdPreMoveX = this.gameObject.position.x;
            this._tdtdPreMoveY = this.gameObject.position.y;
            if (this.checkCollisions) {
                this._moveWithCollisionPlatformer(deltaTime);
            } else {
                this.gameObject.position.x += this.velocityX * deltaTime;
                this.gameObject.position.y += this.velocityY * deltaTime;
            }
            this._updateTDTD(deltaTime);
        } else if (this.checkCollisions) {
            this._moveWithCollisionPlatformer(deltaTime);
        } else {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
        }
        
        // ── 7. Ground check (after movement) ──
        this._updateGroundState();
        
        // ── 8. Slope snap ──
        if (this.enableSlopes && this._isGrounded) {
            this._applySlopeSnap();
        }
    }
    
    // ==================== PLATFORMER INPUT ====================
    
    _updatePlatformerInput() {
        // When not player controlled, input is set externally (by AI brain)
        if (!this.playerControlled) return;
        
        this.inputX = 0;
        this.inputY = 0;
        
        if (keyDown(this.leftKey)) this.inputX -= 1;
        if (keyDown(this.rightKey)) this.inputX += 1;
        
        if (this.useArrowKeys) {
            if (keyDown('ArrowLeft')) this.inputX -= 1;
            if (keyDown('ArrowRight')) this.inputX += 1;
        }
        
        this.inputX = Math.max(-1, Math.min(1, this.inputX));
    }
    
    // ==================== PLATFORMER HORIZONTAL ====================
    
    _updatePlatformerHorizontal(deltaTime) {
        // Wall jump temporarily locks horizontal input
        if (this._wallJumpLockTimer > 0) {
            this._wallJumpLockTimer -= deltaTime;
            return;
        }
        
        // Calculate effective speed on slopes
        let effectiveSpeed = this.moveSpeed;
        if (this.enableSlopes && this.slopeSpeedModifier && this._onSlope && this._isGrounded) {
            const slopeAngleRad = this._groundAngle * Math.PI / 180;
            // Moving uphill: slow down.  Moving downhill: speed up.
            const movingUphill = (this.inputX > 0 && this._slopeRight.y < 0) || (this.inputX < 0 && this._slopeRight.y > 0);
            if (movingUphill) {
                effectiveSpeed *= Math.max(0.4, 1 - Math.sin(slopeAngleRad) * 0.6);
            } else {
                effectiveSpeed *= Math.min(1.6, 1 + Math.sin(slopeAngleRad) * 0.4);
            }
        }
        
        const targetVelX = this.inputX * effectiveSpeed;
        
        if (this.acceleration > 0) {
            if (this.inputX !== 0) {
                const accelFactor = this.acceleration * deltaTime;
                this.velocityX = this._lerp(this.velocityX, targetVelX, accelFactor);
            } else {
                const decelFactor = (this.deceleration > 0 ? this.deceleration : this.acceleration) * deltaTime;
                this.velocityX = this._lerp(this.velocityX, 0, decelFactor);
                if (Math.abs(this.velocityX) < 1) this.velocityX = 0;
            }
        } else {
            this.velocityX = targetVelX;
        }
    }
    
    // ==================== GRAVITY ====================
    
    _applyGravity(deltaTime) {
        // Normalise gravity direction just in case
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        const gnx = gx / glen;
        const gny = gy / glen;
        
        // Determine if we are falling (velocity aligned with gravity)
        const velAlongGravity = this.velocityX * gnx + this.velocityY * gny;
        const isFalling = velAlongGravity > 0;
        
        let gravMult = isFalling ? this.fallingGravityMultiplier : 1;
        
        const accelX = gnx * this.gravity * gravMult;
        const accelY = gny * this.gravity * gravMult;
        
        this.velocityX += accelX * deltaTime;
        this.velocityY += accelY * deltaTime;
        
        // Clamp fall speed
        const newVelAlongGravity = this.velocityX * gnx + this.velocityY * gny;
        if (newVelAlongGravity > this.maxFallSpeed) {
            // Remove excess speed along gravity axis
            const excess = newVelAlongGravity - this.maxFallSpeed;
            this.velocityX -= gnx * excess;
            this.velocityY -= gny * excess;
        }
    }
    
    // ==================== JUMP ====================
    
    _updateJump(deltaTime) {
        // Coyote timer
        if (this._wasGrounded && !this._isGrounded) {
            this._coyoteTimer = this.coyoteTime;
        }
        if (this._coyoteTimer > 0) {
            this._coyoteTimer -= deltaTime;
        }
        
        // Only process player input when playerControlled is true
        // AI can call forceJump() directly
        if (this.playerControlled) {
            // Jump buffer
            const jumpKeyName = this.jumpKey;
            const jumpPressed = keyPressed(jumpKeyName) ||
                                (this.useArrowKeys && keyPressed('ArrowUp'));
            
            if (jumpPressed) {
                this._jumpBufferTimer = this.jumpBufferTime;
            }
        }
        
        if (this._jumpBufferTimer > 0) {
            this._jumpBufferTimer -= deltaTime;
        }
        
        // Attempt jump
        const canCoyote = this._coyoteTimer > 0;
        const canJump = this._isGrounded || canCoyote || this._jumpsRemaining > 0;
        
        if (this._jumpBufferTimer > 0 && canJump) {
            this._executeJump();
            this._jumpBufferTimer = 0;
            this._coyoteTimer = 0;
        }
        
        // Variable jump height — cut velocity on key release (only for player control)
        if (this.variableJumpHeight && this.playerControlled) {
            const jumpKeyName = this.jumpKey;
            const jumpHeld = keyDown(jumpKeyName) ||
                             (this.useArrowKeys && keyDown('ArrowUp'));
            const velAlongGravity = this.velocityX * this.gravityDirection.x + this.velocityY * this.gravityDirection.y;
            
            if (!jumpHeld && velAlongGravity < 0) {
                // Moving against gravity (rising)
                this.velocityX *= (1 - (1 - this.jumpCutMultiplier) * Math.abs(this.gravityDirection.x));
                this.velocityY *= (1 - (1 - this.jumpCutMultiplier) * Math.abs(this.gravityDirection.y));
            }
        }
    }
    
    /**
     * Trigger a jump programmatically (for AI or game logic)
     * @returns {boolean} True if jump was executed, false if not allowed
     */
    forceJump() {
        const canCoyote = this._coyoteTimer > 0;
        const canJump = this._isGrounded || canCoyote || this._jumpsRemaining > 0;
        if (canJump) {
            this._executeJump();
            this._coyoteTimer = 0;
            return true;
        }
        return false;
    }
    
    _executeJump() {
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        
        // Jump opposes gravity
        this.velocityX += (-gx / glen) * this.jumpForce;
        this.velocityY += (-gy / glen) * this.jumpForce;
        
        // Zero out any velocity in gravity direction (clean start)
        const velAlongGrav = this.velocityX * (gx / glen) + this.velocityY * (gy / glen);
        if (velAlongGrav > 0) {
            this.velocityX -= (gx / glen) * velAlongGrav;
            this.velocityY -= (gy / glen) * velAlongGrav;
        }
        
        if (this._isGrounded) {
            this._jumpsRemaining = this.maxJumps - 1;
        } else {
            this._jumpsRemaining--;
        }
        
        this._isGrounded = false;
        this.onJump(this._jumpsRemaining);
    }
    
    // ==================== WALL SLIDE & WALL JUMP ====================
    
    _updateWallSlide(deltaTime) {
        if (!this.enableWallSlide) {
            this._isWallSliding = false;
            return;
        }
        
        const touchingWall = this._isTouchingWallLeft || this._isTouchingWallRight;
        const holdingTowardWall = (this._isTouchingWallLeft && this.inputX < 0) ||
                                  (this._isTouchingWallRight && this.inputX > 0);
        
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        const velAlongGravity = this.velocityX * (gx / glen) + this.velocityY * (gy / glen);
        const isFalling = velAlongGravity > 0;
        
        this._isWallSliding = touchingWall && holdingTowardWall && !this._isGrounded && isFalling;
        
        if (this._isWallSliding) {
            // Clamp fall speed to wall slide speed
            if (velAlongGravity > this.wallSlideSpeed) {
                const excess = velAlongGravity - this.wallSlideSpeed;
                this.velocityX -= (gx / glen) * excess;
                this.velocityY -= (gy / glen) * excess;
            }
        }
        
        // Wall jump (only check player input when playerControlled, AI can use forceWallJump())
        if (this.enableWallJump && this._isWallSliding) {
            let attemptWallJump = false;
            if (this.playerControlled) {
                const jumpPressed = keyPressed(this.jumpKey) ||
                                    (this.useArrowKeys && keyPressed('ArrowUp'));
                attemptWallJump = jumpPressed;
            }
            // AI can set this._requestWallJump = true
            if (attemptWallJump || this._requestWallJump) {
                this._requestWallJump = false;
                const kickDir = this._isTouchingWallLeft ? 1 : -1;
                this.velocityX = kickDir * this.wallJumpForce.x;
                
                // Jump opposes gravity
                const jumpVel = this.wallJumpForce.y;
                this.velocityX += (-gx / glen) * jumpVel * Math.abs(gy / glen);
                this.velocityY = (-gy / glen) * jumpVel;
                
                this._isWallSliding = false;
                this._wallJumpLockTimer = 0.15; // brief input lock for feel
                this._jumpsRemaining = Math.max(this._jumpsRemaining, 1);
                this.onWallJump(kickDir);
            }
        }
    }
    
    /**
     * Trigger a wall jump programmatically (for AI)
     * Only works if currently wall sliding
     */
    forceWallJump() {
        if (this._isWallSliding && this.enableWallJump) {
            this._requestWallJump = true;
        }
    }
    
    // ==================== GROUND / WALL DETECTION ====================
    
    _updateGroundState() {
        this._wasGrounded = this._isGrounded;
        
        const collider = this.getCollider();
        if (!collider || !this.checkCollisions) {
            this._isGrounded = false;
            return;
        }
        
        const collidables = this.getCollidables();
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        const gnx = gx / glen;
        const gny = gy / glen;
        
        // ── Ground check: probe 2px in gravity direction ──
        const probeX = this.gameObject.position.x + gnx * 2;
        const probeY = this.gameObject.position.y + gny * 2;
        const groundHit = this.checkCollisionAt(probeX, probeY, collidables, collider);
        
        this._isGrounded = !!groundHit;
        
        if (this._isGrounded) {
            this._jumpsRemaining = this.maxJumps;
            this._lastGroundY = this.gameObject.position.y;
            
            // Slope detection via side probes
            if (this.enableSlopes) {
                this._detectSlope(collidables, collider);
            }
        } else {
            this._onSlope = false;
            this._groundAngle = 0;
            this._groundNormal = { x: -gnx, y: -gny };
        }
        
        // Landing event
        if (this._isGrounded && !this._wasGrounded) {
            this.onLand();
        }
        
        // ── Wall checks: probe left/right (perpendicular to gravity) ──
        // Perpendicular to gravity: rotate 90°
        const wallCheckDist = 2;
        const perpX = -gny;  // perpendicular to gravity
        const perpY = gnx;
        
        const leftProbeX = this.gameObject.position.x - perpX * wallCheckDist;
        const leftProbeY = this.gameObject.position.y - perpY * wallCheckDist;
        this._isTouchingWallLeft = !!this.checkCollisionAt(leftProbeX, leftProbeY, collidables, collider);
        
        const rightProbeX = this.gameObject.position.x + perpX * wallCheckDist;
        const rightProbeY = this.gameObject.position.y + perpY * wallCheckDist;
        this._isTouchingWallRight = !!this.checkCollisionAt(rightProbeX, rightProbeY, collidables, collider);
    }
    
    // ==================== SLOPE DETECTION ====================
    
    _detectSlope(collidables, collider) {
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        const gnx = gx / glen;
        const gny = gy / glen;
        
        // Cast two probes slightly left and right of center, downward
        const perpX = -gny;
        const perpY = gnx;
        const spread = 4; // pixels apart
        const rayLen = this.slopeRayLength;
        
        // Find ground height at left and right probe points
        const leftGroundY = this._probeGroundHeight(
            this.gameObject.position.x - perpX * spread,
            this.gameObject.position.y - perpY * spread,
            gnx, gny, rayLen, collidables, collider
        );
        const rightGroundY = this._probeGroundHeight(
            this.gameObject.position.x + perpX * spread,
            this.gameObject.position.y + perpY * spread,
            gnx, gny, rayLen, collidables, collider
        );
        
        if (leftGroundY !== null && rightGroundY !== null) {
            // Compute surface tangent from the two probe points
            const dx = perpX * spread * 2;
            const dy = (rightGroundY - leftGroundY);
            const tangentLen = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Normal is perpendicular to tangent (pointing against gravity)
            this._groundNormal = { x: -dy / tangentLen, y: dx / tangentLen };
            
            // Make sure normal points against gravity
            const dotNormalGrav = this._groundNormal.x * gnx + this._groundNormal.y * gny;
            if (dotNormalGrav > 0) {
                this._groundNormal.x = -this._groundNormal.x;
                this._groundNormal.y = -this._groundNormal.y;
            }
            
            // Angle from flat
            const flatNormX = -gnx;
            const flatNormY = -gny;
            const dot = this._groundNormal.x * flatNormX + this._groundNormal.y * flatNormY;
            this._groundAngle = Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI;
            this._onSlope = this._groundAngle > 2; // > 2° counts as a slope
            
            // Slope-aligned right direction (for movement along slope)
            this._slopeRight = { x: dx / tangentLen, y: dy / tangentLen };
            
            // If slope is too steep, treat as wall
            if (this._groundAngle > this.maxSlopeAngle) {
                this._isGrounded = false;
                this._onSlope = false;
            }
        } else {
            this._onSlope = false;
            this._groundAngle = 0;
            this._groundNormal = { x: -gnx, y: -gny };
        }
    }
    
    /**
     * Probe for ground height at a position by stepping in gravity direction.
     * Returns the Y offset where ground was found, or null.
     */
    _probeGroundHeight(startX, startY, gnx, gny, maxDist, collidables, collider) {
        for (let d = 0; d <= maxDist; d += 1) {
            const testX = startX + gnx * d;
            const testY = startY + gny * d;
            if (this.checkCollisionAt(testX, testY, collidables, collider)) {
                return d;
            }
        }
        return null;
    }
    
    /**
     * Snap to ground when walking downhill to prevent bouncing.
     */
    _applySlopeSnap() {
        if (this.slopeSnapDistance <= 0) return;
        if (!this._isGrounded) return;
        
        // Only snap if we were grounded last frame and moving roughly horizontally
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        const gnx = gx / glen;
        const gny = gy / glen;
        const velAlongGravity = this.velocityX * gnx + this.velocityY * gny;
        
        // Don't snap if jumping away from ground
        if (velAlongGravity < -10) return;
        
        const collider = this.getCollider();
        if (!collider) return;
        const collidables = this.getCollidables();
        
        // Try snapping down
        for (let d = 1; d <= this.slopeSnapDistance; d++) {
            const testX = this.gameObject.position.x + gnx * d;
            const testY = this.gameObject.position.y + gny * d;
            if (this.checkCollisionAt(testX, testY, collidables, collider)) {
                // Snap to one pixel before collision
                this.gameObject.position.x += gnx * (d - 1);
                this.gameObject.position.y += gny * (d - 1);
                break;
            }
        }
    }
    
    // ==================== PLATFORMER COLLISION ====================
    
    _moveWithCollisionPlatformer(deltaTime) {
        const collider = this.getCollider();
        
        if (!collider) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const collidables = this.getCollidables();
        
        // Only skip if no standard collidables AND voxel terrain AND tilemap are disabled
        if (collidables.length === 0 && !this.voxelTerrainEnabled && !this.tilemapEnabled) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;
        const startX = this.gameObject.position.x;
        const startY = this.gameObject.position.y;
        
        // Fast path
        if (!this.checkCollisionAt(startX + moveX, startY + moveY, collidables, collider)) {
            this.gameObject.position.x = startX + moveX;
            this.gameObject.position.y = startY + moveY;
            return;
        }
        
        let newX = startX;
        let newY = startY;
        let blockedX = false;
        let blockedY = false;
        
        // ── Resolve X ──
        if (Math.abs(moveX) > 0.001) {
            if (!this.checkCollisionAt(startX + moveX, startY, collidables, collider)) {
                newX = startX + moveX;
            } else {
                newX = this.sweepAxisX(startX, startY, moveX, collidables, collider);
                blockedX = true;
            }
        }
        
        // ── Resolve Y (from new X) ──
        if (Math.abs(moveY) > 0.001) {
            if (!this.checkCollisionAt(newX, startY + moveY, collidables, collider)) {
                newY = startY + moveY;
            } else {
                newY = this.sweepAxisY(newX, startY, moveY, collidables, collider);
                blockedY = true;
            }
        }
        
        // ── Corner correction (platformers benefit hugely from this) ──
        if (this.cornerCorrection > 0) {
            const targetX = startX + moveX;
            const targetY = startY + moveY;
            
            // Head bump correction: moving up and blocked on Y, nudge X
            if (blockedY && moveY < 0 && moveX === 0) {
                for (let offset = 1; offset <= this.cornerCorrection; offset++) {
                    if (!this.checkCollisionAt(startX - offset, targetY, collidables, collider)) {
                        newX = startX - offset;
                        newY = targetY;
                        blockedY = false;
                        break;
                    }
                    if (!this.checkCollisionAt(startX + offset, targetY, collidables, collider)) {
                        newX = startX + offset;
                        newY = targetY;
                        blockedY = false;
                        break;
                    }
                }
            }
            
            // Horizontal blocked — nudge vertically
            if (blockedX && moveY === 0 && moveX !== 0) {
                for (let offset = 1; offset <= this.cornerCorrection; offset++) {
                    if (!this.checkCollisionAt(targetX, startY - offset, collidables, collider)) {
                        newX = targetX;
                        newY = startY - offset;
                        blockedX = false;
                        break;
                    }
                    if (!this.checkCollisionAt(targetX, startY + offset, collidables, collider)) {
                        newX = targetX;
                        newY = startY + offset;
                        blockedX = false;
                        break;
                    }
                }
            }
        }
        
        // Zero out velocity on blocked axes
        if (blockedX) this.velocityX = 0;
        if (blockedY) {
            // If blocked along gravity direction, zero gravity velocity
            const gx = this.gravityDirection.x;
            const gy = this.gravityDirection.y;
            const glen = Math.sqrt(gx * gx + gy * gy) || 1;
            const velAlongGrav = this.velocityX * (gx / glen) + this.velocityY * (gy / glen);
            
            // Only zero the gravity-axis component
            this.velocityY = 0;
            
            if (velAlongGrav > 0) {
                // Was falling — landed
                this._isGrounded = true;
            }
        }
        
        // Fire events
        if (blockedX) this.onCollision(null, 'horizontal');
        if (blockedY) this.onCollision(null, 'vertical');
        
        this.gameObject.position.x = newX;
        this.gameObject.position.y = newY;
    }
    
    // ==================== TDTD GRID WORLD COLLISION ====================
    
    // Collision skin — shrinks the AABB by this many pixels before mapping to
    // grid cells. This prevents exact-boundary false positives where
    // Math.floor(edgePixel / cellSize) selects the next cell even though the
    // entity isn't actually overlapping it.  A value of 0.1 px is invisible
    // but eliminates an entire class of stuck-at-wall and walk-through bugs.
    static get TDTD_COLLISION_SKIN() { return 0.1; }
    
    /**
     * Find the TDTDGridWorld module in the scene (cached after first search)
     * @returns {TDTDGridWorld|null}
     * @private
     */
    _findTDTDGridWorld() {
        if (this._tdtdGridWorld) return this._tdtdGridWorld;
        
        const engine = window.gameEngine || this.gameObject?._engine;
        if (!engine || !engine.instances) return null;
        
        for (const inst of engine.instances) {
            const gridWorld = inst.getModule('TDTDGridWorld');
            if (gridWorld && gridWorld.enabled) {
                this._tdtdGridWorld = gridWorld;
                return gridWorld;
            }
        }
        return null;
    }
    
    /**
     * Check if a block type is a ramp variant.
     * @param {string} blockType
     * @returns {boolean}
     * @private
     */
    _tdtdIsRampType(blockType) {
        return blockType && (blockType.startsWith('ramp') || blockType.startsWith('halfRamp'));
    }
    
    /**
     * Get the effective height of a block type for collision purposes.
     * Full blocks = cellSize, halfBlock = cellSize * 0.5, etc.
     * @param {string} blockType
     * @param {number} cs - Cell size
     * @returns {number}
     * @private
     */
    _tdtdBlockHeight(blockType, cs) {
        switch (blockType) {
            case 'block':     return cs;
            case 'halfBlock': return cs * 0.5;
            case 'slab':      return cs * 0.25;
            case 'flat':      return 1;
            case 'empty':     return cs; // Solid invisible blocks treated as full height
            default:          return cs; // Ramps vary, but max height is cs
        }
    }
    
    /**
     * Get the surface height of a block at a specific world XY position.
     * Handles all block types including ramps with interpolation.
     * Solid 'empty' blocks (invisible walls) are treated as full-height blocks.
     * @param {object} gridWorld - The TDTDGridWorld module
     * @param {object} block - Block definition from the library
     * @param {number} baseZ - Base world Z of the block (layer * cellSize)
     * @param {number} cs - Cell size
     * @param {number} wx - World X to sample
     * @param {number} wy - World Y to sample
     * @param {number} gx - Grid X of the cell
     * @param {number} gy - Grid Y of the cell
     * @returns {number} Surface height in world Z
     * @private
     */
    _tdtdBlockSurface(gridWorld, block, baseZ, cs, wx, wy, gx, gy) {
        const bt = block.blockType;
        if (bt === 'block') return baseZ + cs;
        if (bt === 'empty') return baseZ + cs; // Solid invisible block = full height
        if (bt === 'halfBlock') return baseZ + cs * 0.5;
        if (bt === 'slab') return baseZ + cs * 0.25;
        if (bt === 'flat') return baseZ + 1;
        
        // Ramp types — interpolate height based on position within cell
        const worldPos = gridWorld.gameObject ? gridWorld.gameObject.getWorldPosition() : { x: 0, y: 0 };
        const localX = Math.max(0, Math.min(1, (wx - worldPos.x) / cs - gx));
        const localY = Math.max(0, Math.min(1, (wy - worldPos.y) / cs - gy));
        
        switch (bt) {
            case 'rampNorth': return baseZ + (1 - localY) * cs;
            case 'rampSouth': return baseZ + localY * cs;
            case 'rampEast':  return baseZ + localX * cs;
            case 'rampWest':  return baseZ + (1 - localX) * cs;
            case 'halfRampBottomNorth': return baseZ + (1 - localY) * cs * 0.5;
            case 'halfRampBottomSouth': return baseZ + localY * cs * 0.5;
            case 'halfRampBottomEast':  return baseZ + localX * cs * 0.5;
            case 'halfRampBottomWest':  return baseZ + (1 - localX) * cs * 0.5;
            case 'halfRampTopNorth': return baseZ + cs * 0.5 + (1 - localY) * cs * 0.5;
            case 'halfRampTopSouth': return baseZ + cs * 0.5 + localY * cs * 0.5;
            case 'halfRampTopEast':  return baseZ + cs * 0.5 + localX * cs * 0.5;
            case 'halfRampTopWest':  return baseZ + cs * 0.5 + (1 - localX) * cs * 0.5;
            default: return baseZ + cs;
        }
    }
    
    /**
     * Check if the entity's AABB at position (wx, wy) at height entityZ
     * collides with any wall blocks (blocks that the entity can't step up onto).
     * A block is considered a "wall" if:
     *   - It's solid (block.solid === true), regardless of blockType
     *   - Its surface is too high for the entity to step up (surfaceZ - entityZ > maxStepHeight)
     *   - The entity's Z range overlaps the block's Z range
     * Ramp blocks are walkable when the entity is at or above their surface.
     * @param {object} gridWorld
     * @param {number} wx - World X center
     * @param {number} wy - World Y center
     * @param {number} entityZ - Entity feet Z
     * @param {boolean} [allowStepUp=true] - Whether to allow stepping up small heights
     * @returns {boolean} True if there's a blocking wall
     * @private
     */
    _tdtdHasWall(gridWorld, wx, wy, entityZ, allowStepUp = true) {
        const cs = gridWorld.cellSize;
        const hw = this.tdtdCollisionHalfWidth;
        const hh = this.tdtdCollisionHalfHeight;
        const entityHeight = this.tdtdHeight;
        const maxStep = allowStepUp ? this.tdtdMaxStepHeight : 0;
        const worldPos = gridWorld.gameObject ? gridWorld.gameObject.getWorldPosition() : { x: 0, y: 0 };
        const skin = MovementController2D.TDTD_COLLISION_SKIN;
        
        // Grid cells the entity AABB overlaps in XY — shrink by skin to avoid
        // exact-boundary false positives (floor(boundary/cs) selecting next cell)
        const minGX = Math.floor((wx - hw + skin - worldPos.x) / cs);
        const maxGX = Math.floor((wx + hw - skin - worldPos.x) / cs);
        const minGY = Math.floor((wy - hh + skin - worldPos.y) / cs);
        const maxGY = Math.floor((wy + hh - skin - worldPos.y) / cs);
        
        // Z layers the entity body occupies - include layer 0 for ground-level blocks
        // Use a small epsilon to ensure we catch ground-level blocks when entityZ is exactly 0
        const effectiveZ = Math.max(0, entityZ);
        // Use skin for the lower bound too — when Z is exactly on a layer boundary
        // (e.g. standing on top of layer 0 at Z=cs) include the layer below so
        // adjacent blocks on that layer are still detected as walls.
        const minGZ = Math.max(0, Math.floor(Math.max(0, effectiveZ - skin) / cs));
        const maxGZ = Math.min(gridWorld.gridDepth - 1, Math.floor((effectiveZ + entityHeight - 0.01) / cs));
        
        for (let gy = Math.max(0, minGY); gy <= Math.min(gridWorld.gridHeight - 1, maxGY); gy++) {
            for (let gx = Math.max(0, minGX); gx <= Math.min(gridWorld.gridWidth - 1, maxGX); gx++) {
                for (let gz = Math.max(0, minGZ); gz <= Math.min(gridWorld.gridDepth - 1, maxGZ); gz++) {
                    const blockIdx = gridWorld.cells[gz][gy][gx];
                    if (blockIdx === 0) continue;
                    const block = gridWorld.blockLibrary[blockIdx];
                    // Only check solid blocks — blockType 'empty' with solid=true acts as a wall
                    if (!block || !block.solid) continue;
                    
                    const baseZ = gz * cs;
                    
                    // For ramps, sample surface at the point where entity touches this cell
                    // Use the nearest point in the entity's AABB to the cell center for accurate collision
                    const cellCenterX = worldPos.x + (gx + 0.5) * cs;
                    const cellCenterY = worldPos.y + (gy + 0.5) * cs;
                    const sampleX = Math.max(wx - hw, Math.min(wx + hw, cellCenterX));
                    const sampleY = Math.max(wy - hh, Math.min(wy + hh, cellCenterY));
                    
                    const surfaceZ = this._tdtdBlockSurface(gridWorld, block, baseZ, cs, sampleX, sampleY, gx, gy);
                    
                    // For ramp types: the entity can walk on top of the ramp surface.
                    // If the entity's feet are at or above the surface, it's walkable, not a wall.
                    if (this._tdtdIsRampType(block.blockType)) {
                        if (effectiveZ >= surfaceZ - 1) continue; // On top of or above the ramp surface
                    }
                    
                    // For non-ramp blocks: entity can step up if the surface is within step height
                    // AND the block base is near the entity's feet. The second condition
                    // prevents "stepping through" tall blocks whose surface happens to be
                    // within maxStep but whose body extends far below the entity.
                    if (allowStepUp && (surfaceZ - effectiveZ) <= maxStep && surfaceZ >= effectiveZ
                        && (effectiveZ - baseZ) <= maxStep) {
                        continue;
                    }
                    
                    // Check if entity Z range actually overlaps the block Z range
                    // For ground-level entities (Z=0), they should collide with blocks at Z=0
                    // Use <= for the surface check so entities at exactly the surface still
                    // collide with the block body when step-up was rejected above
                    if (effectiveZ < surfaceZ && (effectiveZ + entityHeight) > baseZ) {
                        return true; // Wall collision
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Get detailed wall collision info including penetration depth and push direction.
     * Used for smooth wall sliding with push-out instead of position revert.
     * @param {object} gridWorld
     * @param {number} wx - World X center
     * @param {number} wy - World Y center
     * @param {number} entityZ - Entity feet Z
     * @returns {{hit: boolean, pushX: number, pushY: number}} Push vector to resolve collision
     * @private
     */
    _tdtdGetWallPush(gridWorld, wx, wy, entityZ) {
        const cs = gridWorld.cellSize;
        const hw = this.tdtdCollisionHalfWidth;
        const hh = this.tdtdCollisionHalfHeight;
        const entityHeight = this.tdtdHeight;
        const maxStep = this.tdtdMaxStepHeight;
        const worldPos = gridWorld.gameObject ? gridWorld.gameObject.getWorldPosition() : { x: 0, y: 0 };
        const skin = MovementController2D.TDTD_COLLISION_SKIN;
        
        // Use effectiveZ to handle ground-level collision properly
        const effectiveZ = Math.max(0, entityZ);
        
        const minGX = Math.floor((wx - hw + skin - worldPos.x) / cs);
        const maxGX = Math.floor((wx + hw - skin - worldPos.x) / cs);
        const minGY = Math.floor((wy - hh + skin - worldPos.y) / cs);
        const maxGY = Math.floor((wy + hh - skin - worldPos.y) / cs);
        const minGZ = Math.max(0, Math.floor(Math.max(0, effectiveZ - skin) / cs));
        const maxGZ = Math.min(gridWorld.gridDepth - 1, Math.floor((effectiveZ + entityHeight - 0.01) / cs));
        
        let totalPushX = 0;
        let totalPushY = 0;
        let hitCount = 0;
        
        for (let gy = Math.max(0, minGY); gy <= Math.min(gridWorld.gridHeight - 1, maxGY); gy++) {
            for (let gx = Math.max(0, minGX); gx <= Math.min(gridWorld.gridWidth - 1, maxGX); gx++) {
                for (let gz = Math.max(0, minGZ); gz <= Math.min(gridWorld.gridDepth - 1, maxGZ); gz++) {
                    const blockIdx = gridWorld.cells[gz][gy][gx];
                    if (blockIdx === 0) continue;
                    const block = gridWorld.blockLibrary[blockIdx];
                    if (!block || !block.solid) continue;
                    
                    const baseZ = gz * cs;
                    
                    // Sample surface at the nearest point in the entity's AABB to the cell center
                    const cellCenterX = worldPos.x + (gx + 0.5) * cs;
                    const cellCenterY = worldPos.y + (gy + 0.5) * cs;
                    const sampleX = Math.max(wx - hw, Math.min(wx + hw, cellCenterX));
                    const sampleY = Math.max(wy - hh, Math.min(wy + hh, cellCenterY));
                    const surfaceZ = this._tdtdBlockSurface(gridWorld, block, baseZ, cs, sampleX, sampleY, gx, gy);
                    
                    // Ramp: walkable if entity is at/above surface
                    if (this._tdtdIsRampType(block.blockType)) {
                        if (effectiveZ >= surfaceZ - 1) continue;
                    }
                    
                    // Steppable — must also be near the block base (same logic as _tdtdHasWall)
                    if ((surfaceZ - effectiveZ) <= maxStep && surfaceZ >= effectiveZ
                        && (effectiveZ - baseZ) <= maxStep) continue;
                    
                    // Check Z overlap
                    if (!(effectiveZ < surfaceZ && (effectiveZ + entityHeight) > baseZ)) continue;
                    
                    // Calculate push-out: find the minimum penetration axis
                    const cellLeft   = worldPos.x + gx * cs;
                    const cellRight  = cellLeft + cs;
                    const cellTop    = worldPos.y + gy * cs;
                    const cellBottom = cellTop + cs;
                    
                    const entityLeft   = wx - hw;
                    const entityRight  = wx + hw;
                    const entityTop    = wy - hh;
                    const entityBottom = wy + hh;
                    
                    // Overlap on each axis
                    const overlapLeft   = entityRight - cellLeft;    // push left (negative X)
                    const overlapRight  = cellRight - entityLeft;    // push right (positive X)
                    const overlapTop    = entityBottom - cellTop;    // push up (negative Y)
                    const overlapBottom = cellBottom - entityTop;    // push down (positive Y)
                    
                    // Find minimum overlap direction
                    let minOverlap = overlapLeft;
                    let pushX = -overlapLeft;
                    let pushY = 0;
                    
                    if (overlapRight < Math.abs(minOverlap)) {
                        minOverlap = overlapRight;
                        pushX = overlapRight;
                        pushY = 0;
                    }
                    if (overlapTop < Math.abs(minOverlap)) {
                        minOverlap = overlapTop;
                        pushX = 0;
                        pushY = -overlapTop;
                    }
                    if (overlapBottom < Math.abs(minOverlap)) {
                        minOverlap = overlapBottom;
                        pushX = 0;
                        pushY = overlapBottom;
                    }
                    
                    totalPushX += pushX;
                    totalPushY += pushY;
                    hitCount++;
                }
            }
        }
        
        if (hitCount === 0) return { hit: false, pushX: 0, pushY: 0 };
        
        return { hit: true, pushX: totalPushX, pushY: totalPushY };
    }
    
    /**
     * Binary search for the furthest non-colliding X position in the grid.
     * Uses 12 iterations for sub-pixel precision.
     * @param {object} gridWorld
     * @param {number} startX - Starting X
     * @param {number} fixedY - Fixed Y coordinate
     * @param {number} moveX - Total X movement
     * @param {number} entityZ - Entity Z height
     * @returns {number} Best X position
     * @private
     */
    _tdtdSweepX(gridWorld, startX, fixedY, moveX, entityZ) {
        let lo = 0, hi = 1;
        let bestX = startX;
        const effectiveZ = Math.max(0, entityZ);
        
        // 12 iterations gives precision to ~1/4096 of the move distance
        for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) * 0.5;
            const testX = startX + moveX * mid;
            
            if (!this._tdtdHasWall(gridWorld, testX, fixedY, effectiveZ)) {
                lo = mid;
                bestX = testX;
            } else {
                hi = mid;
            }
        }
        
        return bestX;
    }
    
    /**
     * Binary search for the furthest non-colliding Y position in the grid.
     * Uses 12 iterations for sub-pixel precision.
     * @param {object} gridWorld
     * @param {number} fixedX - Fixed X coordinate
     * @param {number} startY - Starting Y
     * @param {number} moveY - Total Y movement
     * @param {number} entityZ - Entity Z height
     * @returns {number} Best Y position
     * @private
     */
    _tdtdSweepY(gridWorld, fixedX, startY, moveY, entityZ) {
        let lo = 0, hi = 1;
        let bestY = startY;
        const effectiveZ = Math.max(0, entityZ);
        
        // 12 iterations gives precision to ~1/4096 of the move distance
        for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) * 0.5;
            const testY = startY + moveY * mid;
            
            if (!this._tdtdHasWall(gridWorld, fixedX, testY, effectiveZ)) {
                lo = mid;
                bestY = testY;
            } else {
                hi = mid;
            }
        }
        
        return bestY;
    }
    
    /**
     * Check if the entity's AABB overlaps or is near the grid world bounds.
     * Returns true if the entity should participate in grid collision.
     * @param {object} gridWorld
     * @param {number} wx - World X center
     * @param {number} wy - World Y center
     * @returns {boolean}
     * @private
     */
    _tdtdIsNearGrid(gridWorld, wx, wy) {
        const cs = gridWorld.cellSize;
        const hw = this.tdtdCollisionHalfWidth;
        const hh = this.tdtdCollisionHalfHeight;
        const worldPos = gridWorld.gameObject ? gridWorld.gameObject.getWorldPosition() : { x: 0, y: 0 };
        
        // Grid world boundaries
        const gridRight  = worldPos.x + gridWorld.gridWidth * cs;
        const gridBottom = worldPos.y + gridWorld.gridHeight * cs;
        
        // Margin: one cell size around the grid to catch approach/exit
        const margin = cs;
        
        return (wx + hw > worldPos.x - margin) && (wx - hw < gridRight + margin) &&
               (wy + hh > worldPos.y - margin) && (wy - hh < gridBottom + margin);
    }
    
    /**
     * Find the highest floor surface at or below the entity's Z position.
     * Scans from the top Z layer down, returning the first surface the entity
     * could stand on (at or below entityZ + step tolerance).
     * Handles all block types including solid invisible blocks and ramps.
     * @param {object} gridWorld
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} entityZ - Entity feet Z
     * @returns {number} Floor surface Z, or -1 if no floor found
     * @private
     */
    _tdtdGetFloor(gridWorld, wx, wy, entityZ) {
        const g = gridWorld.worldToGrid(wx, wy);
        if (g.x < 0 || g.x >= gridWorld.gridWidth || g.y < 0 || g.y >= gridWorld.gridHeight) return -1;
        
        const cs = gridWorld.cellSize;
        
        // Scan from top layer down to find the highest walkable surface
        for (let z = gridWorld.gridDepth - 1; z >= 0; z--) {
            const blockIdx = gridWorld.cells[z][g.y][g.x];
            if (blockIdx === 0) continue;
            const block = gridWorld.blockLibrary[blockIdx];
            // Check for any non-null block — solid 'empty' blocks count as floors too
            if (!block) continue;
            // Non-solid blocks (air, water) are not floor — skip unless it's a 'flat' type
            if (!block.solid && block.blockType !== 'flat') continue;
            
            const baseZ = z * cs;
            const surfaceZ = this._tdtdBlockSurface(gridWorld, block, baseZ, cs, wx, wy, g.x, g.y);
            
            // Accept this surface if entity can reach it (at or below entity Z + step tolerance)
            if (surfaceZ <= entityZ + this.tdtdMaxStepHeight + 1) {
                return surfaceZ;
            }
        }
        
        // Fallback: when entity is on the implicit Z=0 ground plane and no
        // floor was found within normal step tolerance, scan bottom-up for the
        // nearest block surface to "mount" onto.  This lets the entity walk
        // from empty cells onto block cells seamlessly.
        // IMPORTANT: Only allow mounting if the surface is within step height!
        // This prevents stepping up onto tall blocks that should be walls.
        if (entityZ <= 1) {
            for (let z = 0; z < gridWorld.gridDepth; z++) {
                const blockIdx = gridWorld.cells[z][g.y][g.x];
                if (blockIdx === 0) continue;
                const block = gridWorld.blockLibrary[blockIdx];
                if (!block) continue;
                if (!block.solid && block.blockType !== 'flat') continue;
                const baseZ = z * cs;
                const surfaceZ = this._tdtdBlockSurface(gridWorld, block, baseZ, cs, wx, wy, g.x, g.y);
                // Only allow mounting if within step height from ground level
                if (surfaceZ <= this.tdtdMaxStepHeight + 1) {
                    return surfaceZ;
                }
                // If this block is too high to step up onto, it's a wall - don't mount
                return -1;
            }
        }
        
        return -1; // No floor found
    }
    
    /**
     * Sample the floor height using multiple points across the entity's AABB footprint.
     * Returns the highest floor found, which prevents the entity from sinking into
     * blocks at the edges. Used for wider/taller entities.
     * @param {object} gridWorld
     * @param {number} wx - World X center
     * @param {number} wy - World Y center
     * @param {number} entityZ - Entity feet Z
     * @returns {number} Highest floor surface Z found, or -1
     * @private
     */
    _tdtdGetFloorMultiSample(gridWorld, wx, wy, entityZ) {
        const hw = this.tdtdCollisionHalfWidth;
        const hh = this.tdtdCollisionHalfHeight;
        
        // Sample at center plus AABB edge midpoints
        let bestFloor = this._tdtdGetFloor(gridWorld, wx, wy, entityZ);
        
        const samples = [
            [wx - hw * 0.7, wy],             // left
            [wx + hw * 0.7, wy],             // right
            [wx, wy - hh * 0.7],             // top
            [wx, wy + hh * 0.7],             // bottom
        ];
        
        for (const [sx, sy] of samples) {
            const f = this._tdtdGetFloor(gridWorld, sx, sy, entityZ);
            if (f > bestFloor) bestFloor = f;
        }
        
        return bestFloor;
    }
    
    /**
     * Update TDTD Z-axis physics and 3D grid world collision.
     * Called after XY movement has been resolved.
     * Handles:
     *   - Z gravity and velocity
     *   - Grid bounds check: only applies collision when entity is within/near the grid
     *   - Wall collision: solid blocks the entity can't step up are treated as walls,
     *     with smooth sliding using binary sweep and push-out
     *   - Floor snapping: entity walks on top of blocks and smoothly up/down ramps
     *   - Step-up: small height changes are auto-climbed
     *   - Step-down: uses speed-aware snap distance for smooth ramp and ledge descent
     *   - Block type awareness: solid invisible blocks, ramps, half-blocks, slabs all handled
     * @param {number} deltaTime
     * @private
     */
    _updateTDTD(deltaTime) {
        const gridWorld = this._findTDTDGridWorld();
        
        // ── 1. Apply Z gravity ──
        if (this.tdtdGravity > 0 && !this._tdtdGrounded) {
            this._tdtdVelocityZ -= this.tdtdGravity * deltaTime;
            if (this._tdtdVelocityZ < -this.tdtdMaxFallSpeed) {
                this._tdtdVelocityZ = -this.tdtdMaxFallSpeed;
            }
        }
        
        // ── 2. Apply Z velocity ──
        this.tdtdZ += this._tdtdVelocityZ * deltaTime;
        
        if (!gridWorld) {
            // No grid world found — just clamp Z at 0 (base ground)
            if (this.tdtdZ <= 0) {
                this.tdtdZ = 0;
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else {
                this._tdtdGrounded = false;
            }
            this._syncTDTDZToRenderers();
            return;
        }
        
        // ── 3. Check if entity is within or near the grid world ──
        const curX = this.gameObject.position.x;
        const curY = this.gameObject.position.y;
        const prevX = this._tdtdPreMoveX !== undefined ? this._tdtdPreMoveX : curX;
        const prevY = this._tdtdPreMoveY !== undefined ? this._tdtdPreMoveY : curY;
        
        if (!this._tdtdIsNearGrid(gridWorld, curX, curY)) {
            // Entity is far from the grid — skip grid collision, fall to Z=0
            if (this.tdtdZ <= 0) {
                this.tdtdZ = 0;
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else {
                this._tdtdGrounded = false;
            }
            this._syncTDTDZToRenderers();
            return;
        }
        
        // ── 3b. Depenetration: if entity spawned inside a wall, push it out ──
        // This handles edge cases like spawning in invalid positions or physics glitches.
        const effectiveZPreMove = Math.max(0, this.tdtdZ);
        if (this._tdtdHasWall(gridWorld, prevX, prevY, effectiveZPreMove, false)) {
            // Entity's starting position this frame is inside a wall
            // Try to push out using the wall push direction
            const pushResult = this._tdtdGetWallPush(gridWorld, prevX, prevY, effectiveZPreMove);
            if (pushResult.hit) {
                const pushMag = Math.sqrt(pushResult.pushX * pushResult.pushX + pushResult.pushY * pushResult.pushY);
                if (pushMag > 0.001) {
                    // Apply a larger push to fully escape (add 1 pixel margin)
                    const escapeX = prevX + pushResult.pushX + Math.sign(pushResult.pushX) * 1;
                    const escapeY = prevY + pushResult.pushY + Math.sign(pushResult.pushY) * 1;
                    
                    // Only apply if the escape position is actually clear
                    if (!this._tdtdHasWall(gridWorld, escapeX, escapeY, effectiveZPreMove, false)) {
                        this.gameObject.position.x = escapeX;
                        this.gameObject.position.y = escapeY;
                        this._tdtdPreMoveX = escapeX;
                        this._tdtdPreMoveY = escapeY;
                    }
                } else {
                    // Push magnitude is ~0 (exact boundary case).  Try pushing
                    // in each cardinal direction by 1 pixel to escape.
                    const escapeAttempts = [
                        [prevX + 1, prevY], [prevX - 1, prevY],
                        [prevX, prevY + 1], [prevX, prevY - 1]
                    ];
                    for (const [ex, ey] of escapeAttempts) {
                        if (!this._tdtdHasWall(gridWorld, ex, ey, effectiveZPreMove, false)) {
                            this.gameObject.position.x = ex;
                            this.gameObject.position.y = ey;
                            this._tdtdPreMoveX = ex;
                            this._tdtdPreMoveY = ey;
                            break;
                        }
                    }
                }
            }
        }
        
        // Re-read cur position after potential depenetration
        const finalCurX = this.gameObject.position.x;
        const finalCurY = this.gameObject.position.y;
        
        // ── 4. Resolve XY collision against 3D grid walls ──
        // A wall is any solid block whose surface is too high for the entity to
        // step up onto. Blocks at or below step height are treated as ground.
        // Uses axis-separated sweep for smooth sliding along walls.
        //
        // ALWAYS check wall collision, including at Z=0 (ground level).
        // The step-up logic handles mounting onto blocks, but the entity should
        // not pass through solid walls even at ground level.
        const effectiveZ = Math.max(0, this.tdtdZ);
        if (this._tdtdHasWall(gridWorld, finalCurX, finalCurY, effectiveZ)) {
            const moveX = finalCurX - prevX;
            const moveY = finalCurY - prevY;
            
            // Try axis-separated resolution with binary sweep
            const xBlocked = this._tdtdHasWall(gridWorld, finalCurX, prevY, effectiveZ);
            const yBlocked = this._tdtdHasWall(gridWorld, prevX, finalCurY, effectiveZ);
            
            if (xBlocked && yBlocked) {
                // Both axes individually blocked — sweep both to find closest safe position
                const bestX = this._tdtdSweepX(gridWorld, prevX, prevY, moveX, effectiveZ);
                const bestY = this._tdtdSweepY(gridWorld, prevX, prevY, moveY, effectiveZ);
                this.gameObject.position.x = bestX;
                this.gameObject.position.y = bestY;
                // Zero velocity on blocked axes
                if (Math.abs(bestX - (prevX + moveX)) > 0.5) this.velocityX = 0;
                if (Math.abs(bestY - (prevY + moveY)) > 0.5) this.velocityY = 0;
            } else if (xBlocked) {
                // X blocked — sweep X, keep full Y
                const bestX = this._tdtdSweepX(gridWorld, prevX, prevY, moveX, effectiveZ);
                this.gameObject.position.x = bestX;
                // Re-check Y from the resolved X position
                if (this._tdtdHasWall(gridWorld, bestX, finalCurY, effectiveZ)) {
                    const bestY = this._tdtdSweepY(gridWorld, bestX, prevY, moveY, effectiveZ);
                    this.gameObject.position.y = bestY;
                    if (Math.abs(bestY - (prevY + moveY)) > 0.5) this.velocityY = 0;
                }
                if (Math.abs(bestX - (prevX + moveX)) > 0.5) this.velocityX = 0;
            } else if (yBlocked) {
                // Y blocked — keep full X, sweep Y
                const bestY = this._tdtdSweepY(gridWorld, prevX, prevY, moveY, effectiveZ);
                this.gameObject.position.y = bestY;
                // Re-check X from the resolved Y position
                if (this._tdtdHasWall(gridWorld, finalCurX, bestY, effectiveZ)) {
                    const bestX = this._tdtdSweepX(gridWorld, prevX, bestY, moveX, effectiveZ);
                    this.gameObject.position.x = bestX;
                    if (Math.abs(bestX - (prevX + moveX)) > 0.5) this.velocityX = 0;
                }
                if (Math.abs(bestY - (prevY + moveY)) > 0.5) this.velocityY = 0;
            } else {
                // Neither axis alone collides but combined does (diagonal corner case)
                // Try push-out based on penetration depth
                const push = this._tdtdGetWallPush(gridWorld, finalCurX, finalCurY, effectiveZ);
                if (push.hit) {
                    const nudgeX = finalCurX + push.pushX + Math.sign(push.pushX) * 0.5;
                    const nudgeY = finalCurY + push.pushY + Math.sign(push.pushY) * 0.5;
                    if (!this._tdtdHasWall(gridWorld, nudgeX, nudgeY, effectiveZ)) {
                        this.gameObject.position.x = nudgeX;
                        this.gameObject.position.y = nudgeY;
                    } else {
                        // Push-out failed — slide along the axis with larger movement
                        if (Math.abs(moveX) >= Math.abs(moveY)) {
                            this.gameObject.position.y = prevY;
                            this.velocityY = 0;
                            if (this._tdtdHasWall(gridWorld, finalCurX, prevY, effectiveZ)) {
                                this.gameObject.position.x = prevX;
                                this.velocityX = 0;
                            }
                        } else {
                            this.gameObject.position.x = prevX;
                            this.velocityX = 0;
                            if (this._tdtdHasWall(gridWorld, prevX, finalCurY, effectiveZ)) {
                                this.gameObject.position.y = prevY;
                                this.velocityY = 0;
                            }
                        }
                    }
                }
            }
            
            // Final safety: if still inside a wall after resolution, revert fully
            if (this._tdtdHasWall(gridWorld, this.gameObject.position.x, this.gameObject.position.y, effectiveZ)) {
                this.gameObject.position.x = prevX;
                this.gameObject.position.y = prevY;
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }
        
        // ── 5. Find floor at the resolved XY position ──
        const finalX = this.gameObject.position.x;
        const finalY = this.gameObject.position.y;
        const floorHeight = this._tdtdGetFloorMultiSample(gridWorld, finalX, finalY, this.tdtdZ);
        
        // Speed-dependent snap-down distance: higher speed = larger snap tolerance
        // This prevents "hopping" when walking quickly down ramps
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const speedSnapBonus = Math.min(speed * deltaTime * 2, this.tdtdMaxStepHeight * 2);
        const snapDownDistance = this.tdtdMaxStepHeight + speedSnapBonus;
        
        if (floorHeight >= 0) {
            if (this.tdtdZ <= floorHeight + 1) {
                // Entity is at or below the floor surface — snap up (step-up / ramp ascent)
                this.tdtdZ = floorHeight;
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else if (this._tdtdGrounded && (this.tdtdZ - floorHeight) <= snapDownDistance) {
                // Was grounded and stepping down — smooth snap (ramp descent / small ledge)
                // Lerp for very smooth ramp transitions when the drop is larger than 2px
                const drop = this.tdtdZ - floorHeight;
                if (drop > 2) {
                    this.tdtdZ = this.tdtdZ + (floorHeight - this.tdtdZ) * Math.min(1, deltaTime * 20);
                    // Close enough — snap exactly
                    if (Math.abs(this.tdtdZ - floorHeight) < 0.5) this.tdtdZ = floorHeight;
                } else {
                    this.tdtdZ = floorHeight;
                }
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else {
                // Above the floor by more than snap distance — airborne (falling)
                this._tdtdGrounded = false;
            }
        } else {
            // No blocks found underneath — treat Z=0 as an implicit ground plane.
            // This lets the entity walk freely on Z=0 over empty grid cells.
            if (this.tdtdZ <= 0) {
                this.tdtdZ = 0;
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else if (this._tdtdGrounded && this.tdtdZ <= snapDownDistance) {
                // Was grounded, small drop to Z=0 — snap down smoothly
                if (this.tdtdZ > 2) {
                    this.tdtdZ = this.tdtdZ + (0 - this.tdtdZ) * Math.min(1, deltaTime * 20);
                    if (this.tdtdZ < 0.5) this.tdtdZ = 0;
                } else {
                    this.tdtdZ = 0;
                }
                if (this._tdtdVelocityZ < 0) this._tdtdVelocityZ = 0;
                this._tdtdGrounded = true;
            } else {
                // Above Z=0 by more than snap distance — airborne (falling)
                this._tdtdGrounded = false;
            }
        }
        
        // ── 6. Sync Z to any TDTD-enabled renderers on same object ──
        this._syncTDTDZToRenderers();
    }
    
    /**
     * Sync the current tdtdZ to any TDTD-enabled sprite renderers on the same game object.
     * This keeps the visual position in sync with the physics Z position.
     * The renderer Z is set to match the collision Z exactly - no offset added.
     * Visual offset should be handled in the renderer's own drawing code if needed.
     * @private
     */
    _syncTDTDZToRenderers() {
        if (!this.gameObject) return;
        
        // Use exact collision Z - no offset. The visual "feet" position should
        // match the collision position for accurate ground contact.
        const renderZ = this.tdtdZ + this.tdtdZOffset;
        
        const spriteRenderer = this.gameObject.getModule('SpriteRenderer');
        if (spriteRenderer && spriteRenderer.tdtdEnabled) {
            spriteRenderer.tdtdZ = renderZ;
        }
        
        const sheetRenderer = this.gameObject.getModule('SpriteSheetRenderer');
        if (sheetRenderer && sheetRenderer.tdtdEnabled) {
            sheetRenderer.tdtdZ = renderZ;
        }
        
        const creature = this.gameObject.getModule('ProceduralCreature');
        if (creature && creature.tdtdEnabled) {
            // Match collision Z exactly for proper ground contact
            creature.tdtdZ = renderZ;
        }
    }
    
    /**
     * Get the current TDTD Z position
     * @returns {number}
     */
    getTDTDZ() {
        return this.tdtdZ;
    }
    
    /**
     * Set the TDTD Z velocity (e.g., for jumping in 3D)
     * @param {number} vz - Z velocity (positive = up)
     */
    setTDTDVelocityZ(vz) {
        this._tdtdVelocityZ = vz;
        this._tdtdGrounded = false;
    }
    
    /**
     * Check if the entity is grounded in the TDTD grid world
     * @returns {boolean}
     */
    isTDTDGrounded() {
        return this._tdtdGrounded;
    }
    
    // ==================== DRAW (debug) ====================
    
    draw(ctx) {
        if (!this.showDebug) return;
        
        ctx.save();
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px monospace';
        
        if (this.movementMode === 'platformer') {
            ctx.fillText(`Vel: (${this.velocityX.toFixed(0)}, ${this.velocityY.toFixed(0)})`, -40, -56);
            ctx.fillText(`Ground: ${this._isGrounded ? 'YES' : 'NO'}`, -40, -44);
            ctx.fillText(`Jumps: ${this._jumpsRemaining}/${this.maxJumps}`, -40, -32);
            ctx.fillText(`Slope: ${this._groundAngle.toFixed(1)}°`, -40, -20);
            if (this._isWallSliding) {
                ctx.fillStyle = '#ff8800';
                ctx.fillText('WALL SLIDE', -40, -8);
            }
            
            // Ground normal
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this._groundNormal.x * 20, this._groundNormal.y * 20);
            ctx.stroke();
            
            // Ground probe indicator
            if (this._isGrounded) {
                ctx.fillStyle = '#00ff0088';
                ctx.fillRect(-3, 0, 6, 4);
            }
        } else {
            ctx.fillText(`VelX: ${this.velocityX.toFixed(1)}`, -30, -40);
            ctx.fillText(`VelY: ${this.velocityY.toFixed(1)}`, -30, -28);
            ctx.fillText(`Input: (${this.inputX.toFixed(2)}, ${this.inputY.toFixed(2)})`, -30, -16);
            if (this.movementMode === 'topdownRotate') {
                ctx.fillText(`Angle: ${this.gameObject.angle.toFixed(1)}°`, -30, -4);
            }
        }
        
        // Velocity vector
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.velocityX * 0.1, this.velocityY * 0.1);
        ctx.stroke();
        
        // TDTD debug info
        if (this.tdtdEnabled) {
            ctx.fillStyle = '#ffaa00';
            const yOff = this.movementMode === 'platformer' ? 12 : 8;
            ctx.fillText(`Z: ${this.tdtdZ.toFixed(1)} | VelZ: ${this._tdtdVelocityZ.toFixed(1)}`, -40, yOff);
            ctx.fillText(`Ground3D: ${this._tdtdGrounded ? 'YES' : 'NO'}`, -40, yOff + 12);
        }
        
        ctx.restore();
    }
    
    // ==================== TOP-DOWN INPUT (existing) ====================
    
    updateInput() {
        // When not player controlled, input is set externally (by AI brain)
        if (!this.playerControlled) return;
        
        this.inputX = 0;
        this.inputY = 0;
        
        if (keyDown(this.leftKey)) this.inputX -= 1;
        if (keyDown(this.rightKey)) this.inputX += 1;
        if (keyDown(this.upKey)) this.inputY -= 1;
        if (keyDown(this.downKey)) this.inputY += 1;
        
        if (this.useArrowKeys) {
            if (keyDown('ArrowLeft')) this.inputX -= 1;
            if (keyDown('ArrowRight')) this.inputX += 1;
            if (keyDown('ArrowUp')) this.inputY -= 1;
            if (keyDown('ArrowDown')) this.inputY += 1;
        }
        
        this.inputX = Math.max(-1, Math.min(1, this.inputX));
        this.inputY = Math.max(-1, Math.min(1, this.inputY));
        
        if (this.diagonalNormalize && this.inputX !== 0 && this.inputY !== 0) {
            const length = Math.sqrt(this.inputX * this.inputX + this.inputY * this.inputY);
            this.inputX /= length;
            this.inputY /= length;
        }
    }
    
    // ==================== TOP-DOWN VELOCITY (existing) ====================
    
    updateVelocity(deltaTime) {
        const targetVelX = this.inputX * this.moveSpeed;
        const targetVelY = this.inputY * this.moveSpeed;
        
        if (this.acceleration > 0) {
            const accelFactor = this.acceleration * deltaTime;
            
            if (this.inputX !== 0) {
                this.velocityX = this._lerp(this.velocityX, targetVelX, accelFactor);
            } else {
                const decelFactor = (this.deceleration > 0 ? this.deceleration : this.acceleration) * deltaTime;
                this.velocityX = this._lerp(this.velocityX, 0, decelFactor);
                if (Math.abs(this.velocityX) < 1) this.velocityX = 0;
            }
            
            if (this.inputY !== 0) {
                this.velocityY = this._lerp(this.velocityY, targetVelY, accelFactor);
            } else {
                const decelFactor = (this.deceleration > 0 ? this.deceleration : this.acceleration) * deltaTime;
                this.velocityY = this._lerp(this.velocityY, 0, decelFactor);
                if (Math.abs(this.velocityY) < 1) this.velocityY = 0;
            }
        } else {
            this.velocityX = targetVelX;
            this.velocityY = targetVelY;
        }
    }
    
    /**
     * Linear interpolation helper
     */
    _lerp(from, to, t) {
        return from + (to - from) * Math.min(1, t);
    }
    
    // keep legacy alias
    lerp(from, to, t) {
        return this._lerp(from, to, t);
    }
    
    // ==================== COLLISION METHODS ====================
    
    /**
     * Get the collider attached to this game object
     */
    getCollider() {
        return this.gameObject.getModule('BoxCollider') ||
               this.gameObject.getModule('SphereCollider') ||
               this.gameObject.getModule('PolygonCollider');
    }
    
    /**
     * Get all collidable objects in the scene
     */
    getCollidables() {
        const engine = window.gameEngine;
        if (!engine) return [];
        
        return engine.instances.filter(inst => {
            if (inst === this.gameObject) return false;
            
            const otherCollider = inst.getModule('BoxCollider') ||
                                  inst.getModule('SphereCollider') ||
                                  inst.getModule('PolygonCollider');
            
            if (!otherCollider) return false;
            if (otherCollider.isTrigger) return false;
            
            if (this.collisionTag && this.collisionTag !== '' && otherCollider.tag !== this.collisionTag) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Check if there's a collision at the given position
     */
    checkCollisionAt(x, y, collidables, myCollider) {
        const originalX = this.gameObject.position.x;
        const originalY = this.gameObject.position.y;
        
        this.gameObject.position.x = x;
        this.gameObject.position.y = y;
        
        let collision = null;
        
        // Check standard colliders
        for (const obj of collidables) {
            const otherCollider = obj.getModule('BoxCollider') ||
                                  obj.getModule('SphereCollider') ||
                                  obj.getModule('PolygonCollider');
            
            if (!otherCollider) continue;
            
            if (myCollider.overlaps(otherCollider)) {
                collision = { object: obj, collider: otherCollider };
                break;
            }
        }
        
        // Check VoxelTerrain2D collision if enabled and no standard collision found
        if (!collision && this.voxelTerrainEnabled) {
            if (this._checkVoxelTerrainCollisionAt(x, y)) {
                collision = { object: null, collider: null, isVoxelTerrain: true };
            }
        }
        
        // Check TilemapRenderer collision if enabled and no collision found yet
        if (!collision && this.tilemapEnabled) {
            if (this._checkTilemapCollisionAt(x, y)) {
                collision = { object: null, collider: null, isTilemap: true };
            }
        }
        
        this.gameObject.position.x = originalX;
        this.gameObject.position.y = originalY;
        
        return collision;
    }
    
    // ==================== VOXEL TERRAIN 2D COLLISION ====================
    
    /**
     * Find all VoxelTerrain2D modules in the scene (cached for performance)
     * @returns {Array} Array of VoxelTerrain2D modules with collision enabled
     */
    _findVoxelTerrainModules() {
        // Cache refresh every 500ms to handle dynamic terrain spawning
        const now = performance.now();
        if (this._voxelTerrainModules && this._voxelTerrainModules.length > 0 && (now - this._voxelTerrainLastSearch) < 500) {
            return this._voxelTerrainModules;
        }
        
        this._voxelTerrainLastSearch = now;
        
        let allTerrains = [];
        
        // Try using findAllModules from game-api.js first
        if (typeof findAllModules === 'function') {
            allTerrains = findAllModules('VoxelTerrain2D');
        }
        
        // Fallback: search through engine instances directly
        if (allTerrains.length === 0) {
            const engine = window.gameEngine || (this.gameObject && this.gameObject._engine);
            if (engine && engine.instances) {
                for (const inst of engine.instances) {
                    const terrain = inst.getModule('VoxelTerrain2D');
                    if (terrain && terrain.enabled) {
                        allTerrains.push(terrain);
                    }
                }
            }
        }
        
        // Filter by enabled collision and optional tag
        this._voxelTerrainModules = allTerrains.filter(terrain => {
            if (!terrain.enableCollision) return false;
            if (this.voxelTerrainTag && this.voxelTerrainTag !== '' && terrain.collisionTag !== this.voxelTerrainTag) {
                return false;
            }
            return true;
        });
        
        return this._voxelTerrainModules;
    }
    
    /**
     * Get entity bounds for voxel terrain collision
     * @returns {{x: number, y: number, width: number, height: number}|null}
     */
    _getEntityBounds() {
        const collider = this.getCollider();
        if (!collider) return null;
        
        if (collider.getBounds) {
            const bounds = collider.getBounds();
            return {
                x: bounds.left,
                y: bounds.top,
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top
            };
        }
        
        // Fallback for sphere collider
        if (collider.radius !== undefined) {
            const pos = this.gameObject.getWorldPosition();
            const scale = this.gameObject.getWorldScale();
            const radius = collider.radius * Math.max(scale.x, scale.y);
            return {
                x: pos.x - radius,
                y: pos.y - radius,
                width: radius * 2,
                height: radius * 2
            };
        }
        
        return null;
    }
    
    /**
     * Check if an entity at position (x, y) collides with any VoxelTerrain2D
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @returns {boolean} True if collision detected
     */
    _checkVoxelTerrainCollisionAt(x, y) {
        if (!this.voxelTerrainEnabled) return false;
        
        const terrains = this._findVoxelTerrainModules();
        if (terrains.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        // Offset bounds to the test position
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        const testBounds = {
            x: bounds.x + offsetX,
            y: bounds.y + offsetY,
            width: bounds.width,
            height: bounds.height
        };
        
        for (const terrain of terrains) {
            if (terrain.checkRectCollision(testBounds.x, testBounds.y, testBounds.width, testBounds.height)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Resolve VoxelTerrain2D collision and return push-out + state info
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @returns {{pushX: number, pushY: number, grounded: boolean, hitCeiling: boolean, hitWallLeft: boolean, hitWallRight: boolean}|null}
     */
    _resolveVoxelTerrainCollision(x, y) {
        if (!this.voxelTerrainEnabled) return null;
        
        const terrains = this._findVoxelTerrainModules();
        if (terrains.length === 0) return null;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return null;
        
        // Offset bounds to the test position
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        const testBounds = {
            x: bounds.x + offsetX,
            y: bounds.y + offsetY,
            width: bounds.width,
            height: bounds.height
        };
        
        let totalPushX = 0;
        let totalPushY = 0;
        let grounded = false;
        let hitCeiling = false;
        let hitWallLeft = false;
        let hitWallRight = false;
        
        for (const terrain of terrains) {
            const result = terrain.resolveRectCollision(
                testBounds.x, testBounds.y, 
                testBounds.width, testBounds.height,
                this.velocityX, this.velocityY
            );
            
            if (result) {
                totalPushX += result.pushX;
                totalPushY += result.pushY;
                if (result.grounded) grounded = true;
                if (result.hitCeiling) hitCeiling = true;
                if (result.hitWallLeft) hitWallLeft = true;
                if (result.hitWallRight) hitWallRight = true;
            }
        }
        
        if (totalPushX === 0 && totalPushY === 0 && !grounded && !hitCeiling && !hitWallLeft && !hitWallRight) {
            return null;
        }
        
        return { pushX: totalPushX, pushY: totalPushY, grounded, hitCeiling, hitWallLeft, hitWallRight };
    }
    
    /**
     * Check if there's ground below at the given position using VoxelTerrain2D
     * @param {number} x - World X position  
     * @param {number} y - World Y position
     * @param {number} probeDistance - How far below to check
     * @returns {boolean} True if ground found
     */
    _checkVoxelTerrainGround(x, y, probeDistance = 2) {
        if (!this.voxelTerrainEnabled) return false;
        
        const terrains = this._findVoxelTerrainModules();
        if (terrains.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        // Check a thin strip below the entity's feet
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        const footY = bounds.y + bounds.height + offsetY;
        
        for (const terrain of terrains) {
            // Check multiple points along the bottom edge for better accuracy
            const checkPoints = [
                bounds.x + offsetX + bounds.width * 0.25,
                bounds.x + offsetX + bounds.width * 0.5,
                bounds.x + offsetX + bounds.width * 0.75
            ];
            
            for (const checkX of checkPoints) {
                for (let dy = 0; dy <= probeDistance; dy++) {
                    if (terrain.checkCollision(checkX, footY + dy)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check wall collision using VoxelTerrain2D (for wall slide/jump detection)
     * @param {number} x - World X position
     * @param {number} y - World Y position  
     * @param {number} direction - -1 for left, 1 for right
     * @param {number} probeDistance - How far to check
     * @returns {boolean} True if wall found
     */
    _checkVoxelTerrainWall(x, y, direction, probeDistance = 2) {
        if (!this.voxelTerrainEnabled) return false;
        
        const terrains = this._findVoxelTerrainModules();
        if (terrains.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        
        // Check from the side of the entity
        const sideX = direction < 0 
            ? bounds.x + offsetX - probeDistance 
            : bounds.x + offsetX + bounds.width + probeDistance;
        
        const midY = bounds.y + offsetY + bounds.height * 0.5;
        
        for (const terrain of terrains) {
            if (terrain.checkCollision(sideX, midY)) {
                return true;
            }
        }
        
        return false;
    }

    // ==================== TILEMAP RENDERER COLLISION ====================
    
    /**
     * Find all TilemapRenderer modules in the scene (cached for performance)
     * @returns {Array} Array of TilemapRenderer modules
     */
    _findTilemapModules() {
        // Cache refresh every 500ms to handle dynamic tilemap spawning
        const now = performance.now();
        if (this._tilemapModules && this._tilemapModules.length > 0 && (now - this._tilemapLastSearch) < 500) {
            return this._tilemapModules;
        }
        
        this._tilemapLastSearch = now;
        
        let allTilemaps = [];
        
        // Try using findAllModules from game-api.js first
        if (typeof findAllModules === 'function') {
            allTilemaps = findAllModules('TilemapRenderer');
        }
        
        // Fallback: search through engine instances directly
        if (allTilemaps.length === 0) {
            const engine = window.gameEngine || (this.gameObject && this.gameObject._engine);
            if (engine && engine.instances) {
                for (const inst of engine.instances) {
                    const tilemap = inst.getModule('TilemapRenderer');
                    if (tilemap && tilemap.enabled) {
                        allTilemaps.push(tilemap);
                    }
                }
            }
        }
        
        // Filter by optional tag
        this._tilemapModules = allTilemaps.filter(tilemap => {
            if (this.tilemapTag && this.tilemapTag !== '' && tilemap.collisionTag !== this.tilemapTag) {
                return false;
            }
            return true;
        });
        
        return this._tilemapModules;
    }
    
    /**
     * Check if an entity at position (x, y) collides with any TilemapRenderer solid tiles
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @returns {boolean} True if collision detected
     */
    _checkTilemapCollisionAt(x, y) {
        if (!this.tilemapEnabled) return false;
        
        const tilemaps = this._findTilemapModules();
        if (tilemaps.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        // Offset bounds to the test position
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        const testBounds = {
            x: bounds.x + offsetX,
            y: bounds.y + offsetY,
            width: bounds.width,
            height: bounds.height
        };
        
        for (const tilemap of tilemaps) {
            if (tilemap.checkRectCollision(testBounds.x, testBounds.y, testBounds.width, testBounds.height)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if there's ground below at the given position using TilemapRenderer
     * @param {number} x - World X position  
     * @param {number} y - World Y position
     * @param {number} probeDistance - How far below to check
     * @returns {boolean} True if ground found
     */
    _checkTilemapGround(x, y, probeDistance = 2) {
        if (!this.tilemapEnabled) return false;
        
        const tilemaps = this._findTilemapModules();
        if (tilemaps.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        // Check a thin strip below the entity's feet
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        const footY = bounds.y + bounds.height + offsetY;
        
        for (const tilemap of tilemaps) {
            // Check multiple points along the bottom edge for better accuracy
            const checkPoints = [
                bounds.x + offsetX + bounds.width * 0.25,
                bounds.x + offsetX + bounds.width * 0.5,
                bounds.x + offsetX + bounds.width * 0.75
            ];
            
            for (const checkX of checkPoints) {
                for (let dy = 0; dy <= probeDistance; dy++) {
                    if (tilemap.checkCollision(checkX, footY + dy)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check wall collision using TilemapRenderer (for wall slide/jump detection)
     * @param {number} x - World X position
     * @param {number} y - World Y position  
     * @param {number} direction - -1 for left, 1 for right
     * @param {number} probeDistance - How far to check
     * @returns {boolean} True if wall found
     */
    _checkTilemapWall(x, y, direction, probeDistance = 2) {
        if (!this.tilemapEnabled) return false;
        
        const tilemaps = this._findTilemapModules();
        if (tilemaps.length === 0) return false;
        
        const bounds = this._getEntityBounds();
        if (!bounds) return false;
        
        const offsetX = x - this.gameObject.position.x;
        const offsetY = y - this.gameObject.position.y;
        
        // Check from the side of the entity
        const sideX = direction < 0 
            ? bounds.x + offsetX - probeDistance 
            : bounds.x + offsetX + bounds.width + probeDistance;
        
        const midY = bounds.y + offsetY + bounds.height * 0.5;
        
        for (const tilemap of tilemaps) {
            if (tilemap.checkCollision(sideX, midY)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Move with axis-separated collision for smooth wall sliding (top-down).
     */
    moveWithCollision(deltaTime) {
        const collider = this.getCollider();
        
        if (!collider) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const collidables = this.getCollidables();
        
        // Only skip if no standard collidables AND voxel terrain AND tilemap are disabled
        if (collidables.length === 0 && !this.voxelTerrainEnabled && !this.tilemapEnabled) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;
        const startX = this.gameObject.position.x;
        const startY = this.gameObject.position.y;
        
        // Fast path
        if (!this.checkCollisionAt(startX + moveX, startY + moveY, collidables, collider)) {
            this.gameObject.position.x = startX + moveX;
            this.gameObject.position.y = startY + moveY;
            return;
        }
        
        let newX = startX;
        let newY = startY;
        let blockedX = false;
        let blockedY = false;
        
        // Resolve X
        if (Math.abs(moveX) > 0.001) {
            if (!this.checkCollisionAt(startX + moveX, startY, collidables, collider)) {
                newX = startX + moveX;
            } else {
                newX = this.sweepAxisX(startX, startY, moveX, collidables, collider);
                blockedX = true;
            }
        }
        
        // Resolve Y
        if (Math.abs(moveY) > 0.001) {
            if (!this.checkCollisionAt(newX, startY + moveY, collidables, collider)) {
                newY = startY + moveY;
            } else {
                newY = this.sweepAxisY(newX, startY, moveY, collidables, collider);
                blockedY = true;
            }
        }
        
        // Corner correction
        if (this.cornerCorrection > 0) {
            const targetX = startX + moveX;
            const targetY = startY + moveY;
            
            if (blockedX && moveY === 0 && moveX !== 0) {
                for (let offset = 1; offset <= this.cornerCorrection; offset++) {
                    if (!this.checkCollisionAt(targetX, startY - offset, collidables, collider)) {
                        newX = targetX; newY = startY - offset; blockedX = false; break;
                    }
                    if (!this.checkCollisionAt(targetX, startY + offset, collidables, collider)) {
                        newX = targetX; newY = startY + offset; blockedX = false; break;
                    }
                }
            } else if (blockedY && moveX === 0 && moveY !== 0) {
                for (let offset = 1; offset <= this.cornerCorrection; offset++) {
                    if (!this.checkCollisionAt(startX - offset, targetY, collidables, collider)) {
                        newX = startX - offset; newY = targetY; blockedY = false; break;
                    }
                    if (!this.checkCollisionAt(startX + offset, targetY, collidables, collider)) {
                        newX = startX + offset; newY = targetY; blockedY = false; break;
                    }
                }
            }
        }
        
        if (blockedX) this.velocityX = 0;
        if (blockedY) this.velocityY = 0;
        
        if (blockedX) this.onCollision(null, 'horizontal');
        if (blockedY) this.onCollision(null, 'vertical');
        
        this.gameObject.position.x = newX;
        this.gameObject.position.y = newY;
    }
    
    /**
     * Binary search for furthest valid X position before collision.
     */
    sweepAxisX(startX, fixedY, moveX, collidables, collider) {
        let lo = 0, hi = 1;
        let bestX = startX;
        
        for (let i = 0; i < 10; i++) {
            const mid = (lo + hi) * 0.5;
            const testX = startX + moveX * mid;
            
            if (!this.checkCollisionAt(testX, fixedY, collidables, collider)) {
                lo = mid;
                bestX = testX;
            } else {
                hi = mid;
            }
        }
        
        return bestX;
    }
    
    /**
     * Binary search for furthest valid Y position before collision.
     */
    sweepAxisY(fixedX, startY, moveY, collidables, collider) {
        let lo = 0, hi = 1;
        let bestY = startY;
        
        for (let i = 0; i < 10; i++) {
            const mid = (lo + hi) * 0.5;
            const testY = startY + moveY * mid;
            
            if (!this.checkCollisionAt(fixedX, testY, collidables, collider)) {
                lo = mid;
                bestY = testY;
            } else {
                hi = mid;
            }
        }
        
        return bestY;
    }
    
    // ==================== NORMAL-BASED COLLISION (for topdown rotation) ====================
    
    /**
     * Get collision info (normal + depth) between two colliders.
     * Mirrors the approach used in Rigidbody.js for proper separation.
     */
    _getCollisionInfo(myCollider, otherCollider) {
        const isBox = (c) => c && c.constructor && c.constructor.name === 'BoxCollider';
        const isSphere = (c) => c && c.constructor && c.constructor.name === 'SphereCollider';
        const isPoly = (c) => c && c.constructor && c.constructor.name === 'PolygonCollider';
        
        if (isBox(myCollider) && isBox(otherCollider)) {
            return myCollider.getBoxCollisionInfo ? myCollider.getBoxCollisionInfo(otherCollider) : this._getBoxBoxInfo(myCollider, otherCollider);
        }
        if (isBox(myCollider) && isSphere(otherCollider)) {
            const info = myCollider.getSphereCollisionInfo ? myCollider.getSphereCollisionInfo(otherCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isSphere(myCollider) && isBox(otherCollider)) {
            return myCollider.getBoxCollisionInfo ? myCollider.getBoxCollisionInfo(otherCollider) : null;
        }
        if (isSphere(myCollider) && isSphere(otherCollider)) {
            return myCollider.getSphereCollisionInfo ? myCollider.getSphereCollisionInfo(otherCollider) : null;
        }
        if (isBox(myCollider) && isPoly(otherCollider)) {
            if (myCollider.isAxisAligned && !myCollider.isAxisAligned()) {
                const obbCorners = myCollider.getWorldPoints();
                const obbAxes = myCollider.getAxes();
                const info = otherCollider.getOBBCollisionInfo ? otherCollider.getOBBCollisionInfo(obbCorners, obbAxes) : null;
                if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
                return info;
            }
            // Use our own SAT implementation for consistent results
            return this._getBoxPolyInfo(myCollider, otherCollider);
        }
        if (isPoly(myCollider) && isBox(otherCollider)) {
            if (otherCollider.isAxisAligned && !otherCollider.isAxisAligned()) {
                const obbCorners = otherCollider.getWorldPoints();
                const obbAxes = otherCollider.getAxes();
                // getOBBCollisionInfo returns normal pointing toward OBB (wall)
                // We need it pointing away from OBB (toward player), so flip it
                const info = myCollider.getOBBCollisionInfo ? myCollider.getOBBCollisionInfo(obbCorners, obbAxes) : null;
                if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
                return info;
            }
            return this._getPolyBoxInfo(myCollider, otherCollider);
        }
        if (isSphere(myCollider) && isPoly(otherCollider)) {
            // SphereCollider.getPolygonCollisionInfo returns normal pointing toward polygon
            // We need it pointing away from polygon (toward player), so flip it
            const info = myCollider.getPolygonCollisionInfo ? myCollider.getPolygonCollisionInfo(otherCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isPoly(myCollider) && isSphere(otherCollider)) {
            const info = otherCollider.getPolygonCollisionInfo ? otherCollider.getPolygonCollisionInfo(myCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isPoly(myCollider) && isPoly(otherCollider)) {
            return this._getPolyPolyInfo(myCollider, otherCollider);
        }
        return null;
    }
    
    /** AABB vs AABB collision info fallback */
    _getBoxBoxInfo(box1, box2) {
        const b1 = box1.getBounds();
        const b2 = box2.getBounds();
        const overlapX = Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left);
        const overlapY = Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top);
        if (overlapX <= 0 || overlapY <= 0) return null;
        if (overlapX < overlapY) {
            return { normal: { x: b1.centerX < b2.centerX ? -1 : 1, y: 0 }, depth: overlapX };
        } else {
            return { normal: { x: 0, y: b1.centerY < b2.centerY ? -1 : 1 }, depth: overlapY };
        }
    }
    
    /** Polygon vs Box collision info fallback */
    _getPolyBoxInfo(polygon, box) {
        const polyPoints = polygon.getWorldPoints();
        const polyAxes = polygon.getAxes();
        let boxPoints, boxAxes;
        if (box.getWorldPoints && box.getAxes) {
            boxPoints = box.getWorldPoints();
            boxAxes = box.getAxes();
        } else {
            const b = box.getBounds();
            boxPoints = [
                { x: b.left, y: b.top }, { x: b.right, y: b.top },
                { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }
            ];
            boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        }
        const allAxes = [...polyAxes, ...boxAxes];
        let minOverlap = Infinity, minAxis = null;
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;
        let boxCx = 0, boxCy = 0;
        for (const p of boxPoints) { boxCx += p.x; boxCy += p.y; }
        boxCx /= boxPoints.length; boxCy /= boxPoints.length;
        for (const axis of allAxes) {
            const proj1 = polygon.projectOntoAxis(axis);
            let pMin = Infinity, pMax = -Infinity;
            for (const p of boxPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
            }
            const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = boxCx - polyCx, dirY = boxCy - polyCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Calculate contact point - find deepest penetrating point from box into polygon
        // Search in -minAxis direction for the point closest to polygon center
        let contactPoint = null;
        let bestScore = -Infinity;
        for (const bp of boxPoints) {
            // Score = projection in -normal direction (toward polygon)
            // Higher score = deeper into polygon along collision normal
            const score = -(bp.x * minAxis.x + bp.y * minAxis.y);
            if (score > bestScore) {
                bestScore = score;
                contactPoint = { x: bp.x, y: bp.y };
            }
        }
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    /** Box vs Polygon collision info - for MC2D with BoxCollider vs PolygonCollider walls */
    _getBoxPolyInfo(box, polygon) {
        const polyPoints = polygon.getWorldPoints();
        const polyAxes = polygon.getAxes();
        let boxPoints, boxAxes;
        if (box.getWorldPoints && box.getAxes) {
            boxPoints = box.getWorldPoints();
            boxAxes = box.getAxes();
        } else {
            const b = box.getBounds();
            boxPoints = [
                { x: b.left, y: b.top }, { x: b.right, y: b.top },
                { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }
            ];
            boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        }
        const allAxes = [...polyAxes, ...boxAxes];
        let minOverlap = Infinity, minAxis = null;
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;
        let boxCx = 0, boxCy = 0;
        for (const p of boxPoints) { boxCx += p.x; boxCy += p.y; }
        boxCx /= boxPoints.length; boxCy /= boxPoints.length;
        for (const axis of allAxes) {
            const proj1 = polygon.projectOntoAxis(axis);
            let pMin = Infinity, pMax = -Infinity;
            for (const p of boxPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
            }
            const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                // Normal points toward box (player) = away from polygon
                const dirX = polyCx - boxCx, dirY = polyCy - boxCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Contact point: find polygon vertex deepest into box (for collision response)
        let contactPoint = null;
        let bestScore = -Infinity;
        for (const pp of polyPoints) {
            const score = -(pp.x * minAxis.x + pp.y * minAxis.y);
            if (score > bestScore) {
                bestScore = score;
                contactPoint = { x: pp.x, y: pp.y };
            }
        }
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    /** Polygon vs Polygon collision info fallback */
    _getPolyPolyInfo(poly1, poly2) {
        const points1 = poly1.getWorldPoints();
        const points2 = poly2.getWorldPoints();
        const allAxes = [...poly1.getAxes(), ...poly2.getAxes()];
        let minOverlap = Infinity, minAxis = null;
        let c1x = 0, c1y = 0;
        for (const p of points1) { c1x += p.x; c1y += p.y; }
        c1x /= points1.length; c1y /= points1.length;
        let c2x = 0, c2y = 0;
        for (const p of points2) { c2x += p.x; c2y += p.y; }
        c2x /= points2.length; c2y /= points2.length;
        for (const axis of allAxes) {
            const proj1 = poly1.projectOntoAxis(axis);
            const proj2 = poly2.projectOntoAxis(axis);
            const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = c2x - c1x, dirY = c2y - c1y;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Calculate contact point - find deepest penetrating point from poly2 into poly1
        let contactPoint = null;
        let maxPen = -Infinity;
        for (const p of points2) {
            const pen = -((p.x - c1x) * minAxis.x + (p.y - c1y) * minAxis.y);
            if (pen > maxPen) {
                maxPen = pen;
                contactPoint = { x: p.x, y: p.y };
            }
        }
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    /**
     * Normal-based collision with wall sliding.
     * Moves to target position, then resolves any overlaps by separating along
     * collision normals and projecting velocity onto the wall surface.
     * This allows smooth sliding along walls and rotated colliders.
     */
    moveWithCollisionSliding(deltaTime) {
        const collider = this.getCollider();
        if (!collider) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const collidables = this.getCollidables();
        if (collidables.length === 0) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;
        
        // Move to desired position
        this.gameObject.position.x += moveX;
        this.gameObject.position.y += moveY;
        
        // Resolve overlaps iteratively (up to a few passes for multi-collider corners)
        const maxPasses = 4;
        let collided = false;
        
        for (let pass = 0; pass < maxPasses; pass++) {
            let deepestInfo = null;
            let deepestDepth = 0;
            let deepestObj = null;
            
            for (const obj of collidables) {
                const otherCollider = obj.getModule('BoxCollider') ||
                                      obj.getModule('SphereCollider') ||
                                      obj.getModule('PolygonCollider');
                if (!otherCollider) continue;
                if (!collider.overlaps(otherCollider)) continue;
                
                const info = this._getCollisionInfo(collider, otherCollider);
                if (info && info.depth > deepestDepth) {
                    deepestInfo = info;
                    deepestDepth = info.depth;
                    deepestObj = obj;
                }
            }
            
            if (!deepestInfo) break; // No more overlaps
            
            collided = true;
            const { normal, depth } = deepestInfo;
            
            // Clamp separation to prevent tunneling through to other side
            // Max separation per pass should be reasonable (e.g. half collider size)
            const maxSeparation = 32;
            const clampedDepth = Math.min(depth, maxSeparation);
            
            // Separate along the collision normal (push out of the wall)
            this.gameObject.position.x += normal.x * (clampedDepth + 0.1);
            this.gameObject.position.y += normal.y * (clampedDepth + 0.1);
            
            // Project velocity onto the wall surface (remove normal component)
            // This is what makes wall sliding smooth
            const vDotN = this.velocityX * normal.x + this.velocityY * normal.y;
            if (vDotN < 0) {
                // Only remove the component pushing into the wall
                this.velocityX -= vDotN * normal.x;
                this.velocityY -= vDotN * normal.y;
            }
            
            this.onCollision({ object: deepestObj, normal: normal }, 'slide');
        }
    }
    
    // ==================== DYNAMIC BODY PUSH (mass-based interaction) ====================
    
    /**
     * Check for nearby heavy dynamic Rigidbody objects (e.g. vehicles) that should
     * push this player. Uses mass comparison: if the other object is heavier and
     * moving toward the player, the player gets pushed.
     * Player mass comes from its own Rigidbody (if present), or defaults to 1.0.
     */
    _applyDynamicBodyPush(deltaTime) {
        const collider = this.getCollider();
        if (!collider) return;
        
        // Get player mass
        const myRb = this.gameObject.getModule ? this.gameObject.getModule('Rigidbody') : null;
        const myMass = (myRb && myRb.mass) ? myRb.mass : 1.0;
        
        const myBounds = collider.getBounds ? collider.getBounds() : null;
        if (!myBounds) return;
        
        const engine = window.gameEngine;
        if (!engine) return;
        
        const px = this.gameObject.position.x;
        const py = this.gameObject.position.y;
        
        for (const obj of engine.instances) {
            if (obj === this.gameObject) continue;
            
            const otherRb = obj.getModule ? obj.getModule('Rigidbody') : null;
            if (!otherRb || otherRb.isKinematic) continue;
            
            const otherMass = otherRb.mass || 1.0;
            if (otherMass <= myMass) continue; // Same or lighter — no push
            
            // Check if other object is moving
            const ovx = otherRb.velocityX || 0;
            const ovy = otherRb.velocityY || 0;
            const otherSpeed = Math.sqrt(ovx * ovx + ovy * ovy);
            if (otherSpeed < 2) continue;
            
            // Quick distance check before expensive collider operations
            const dx = px - obj.position.x;
            const dy = py - obj.position.y;
            const distSq = dx * dx + dy * dy;
            const maxRange = 200; // don't check objects too far away
            if (distSq > maxRange * maxRange) continue;
            
            // Check if the other object's collider is close/overlapping
            const otherCollider = obj.getModule('BoxCollider') ||
                                  obj.getModule('SphereCollider') ||
                                  obj.getModule('PolygonCollider');
            if (!otherCollider) continue;
            
            const otherBounds = otherCollider.getBounds ? otherCollider.getBounds() : null;
            if (!otherBounds) continue;
            
            // Proximity check: are bounds nearly touching or overlapping?
            const gapX = Math.max(0, Math.max(myBounds.left - otherBounds.right, otherBounds.left - myBounds.right));
            const gapY = Math.max(0, Math.max(myBounds.top - otherBounds.bottom, otherBounds.top - myBounds.bottom));
            const pushThreshold = otherSpeed * deltaTime + 4; // moving objects can reach us within one frame
            if (gapX > pushThreshold || gapY > pushThreshold) continue;
            
            // Check if other is moving toward us
            const dist = Math.sqrt(distSq) || 1;
            const dirToUsX = dx / dist;
            const dirToUsY = dy / dist;
            const velDot = ovx * dirToUsX + ovy * dirToUsY;
            if (velDot < 0) continue; // Moving away
            
            // Apply push: heavier object pushes lighter player
            const massRatio = myMass / otherMass; // 0..1
            const pushStrength = (1 - massRatio) * 0.8; // scale slightly to prevent over-pushing
            
            this.velocityX += ovx * pushStrength;
            this.velocityY += ovy * pushStrength;
            this.gameObject.position.x += ovx * pushStrength * deltaTime;
            this.gameObject.position.y += ovy * pushStrength * deltaTime;
        }
    }
    
    // ==================== EVENTS (override in subclasses / event sheets) ====================
    
    /**
     * Called when a collision blocks movement.
     * @param {Object|null} collision - Collision info
     * @param {string} axis - 'horizontal' or 'vertical'
     */
    onCollision(collision, axis) {
        // Override for custom collision response
    }
    
    /**
     * Called when a jump is executed.
     * @param {number} jumpsRemaining - Jumps left after this one
     */
    onJump(jumpsRemaining) {
        // Override to play jump sound, animation, particles, etc.
    }
    
    /**
     * Called when landing on the ground.
     */
    onLand() {
        // Override to play land sound, squash animation, dust particles, etc.
    }
    
    /**
     * Called when performing a wall jump.
     * @param {number} direction - 1 = kicked right, -1 = kicked left
     */
    onWallJump(direction) {
        // Override for wall jump effects
    }
    
    // ==================== DEATH / VEHICLE HIT DETECTION ====================
    
    /**
     * Check if hit by a fast-moving vehicle
     */
    _checkVehicleHit() {
        // Don't check for vehicle hits while inside a vehicle
        if (this._vehicleState === 'inVehicle' || this.playerControlled) return;
        
        // Also check if there's a brain controlling us that's in a vehicle
        const brain = this.gameObject.getModule ? this.gameObject.getModule('MovementController2DBrain') : null;
        if (brain && brain._isInVehicle) return;
        
        // Get our collider
        const myCollider = this.getCollider();
        if (!myCollider) return;
        
        const myBounds = myCollider.getBounds ? myCollider.getBounds() : null;
        const myX = this.gameObject.position.x;
        const myY = this.gameObject.position.y;
        const myRadius = myBounds ? Math.max(myBounds.width, myBounds.height) * 0.5 : 16;
        
        // Find all VehicleController modules in the scene
        const vehicleModules = typeof findAllModules === 'function' ? findAllModules('VehicleController') : [];
        
        for (const vc of vehicleModules) {
            if (!vc || !vc.gameObject) continue;
            
            // Skip if we are the occupant of this vehicle (either directly or via brain)
            if (vc._occupant === this || vc._occupant === brain || vc._occupant === this.gameObject) continue;
            
            // Get the vehicle's collider(s)
            const vgo = vc.gameObject;
            const vehicleCollider = vgo.getModule ? (
                vgo.getModule('BoxCollider') || 
                vgo.getModule('SphereCollider') || 
                vgo.getModule('PolygonCollider')
            ) : null;
            
            // Calculate vehicle's actual speed from velocity components
            let speedPxs = 0;
            let velX = 0, velY = 0;
            if (vc._velX !== undefined && vc._velY !== undefined) {
                velX = vc._velX;
                velY = vc._velY;
                speedPxs = Math.sqrt(velX * velX + velY * velY);
            } else if (vc._currentSpeed !== undefined) {
                speedPxs = Math.abs(vc._currentSpeed);
            }
            
            // Convert px/s to km/h (1 km/h ≈ 2.778 px/s)
            const pxsToKmh = 1 / 2.778;
            const speedKmh = speedPxs * pxsToKmh;
            
            // Skip slow vehicles early (before expensive overlap checks)
            if (speedKmh < this.vehicleDeathSpeedKmh) continue;
            
            // Check collision via multiple methods
            let isHit = false;
            
            // Method 1: Collider overlap (most accurate but can miss fast objects)
            if (vehicleCollider) {
                if (typeof myCollider.overlaps === 'function') {
                    isHit = myCollider.overlaps(vehicleCollider);
                } else if (typeof vehicleCollider.overlaps === 'function') {
                    isHit = vehicleCollider.overlaps(myCollider);
                }
            }
            
            // Method 2: Distance + velocity direction check (catches fast-moving vehicles)
            if (!isHit && speedPxs > 50) {  // Only for fast vehicles
                const vehX = vgo.position.x;
                const vehY = vgo.position.y;
                const dx = myX - vehX;
                const dy = myY - vehY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Get vehicle bounds for radius
                const vehBounds = vehicleCollider && vehicleCollider.getBounds ? vehicleCollider.getBounds() : null;
                const vehRadius = vehBounds ? Math.max(vehBounds.width, vehBounds.height) * 0.5 : 30;
                
                // Close proximity check (within combined radii + small margin)
                const hitDistance = myRadius + vehRadius + 5;
                
                if (dist < hitDistance) {
                    // Check if vehicle is moving toward us (not away)
                    const velMag = speedPxs || 1;
                    const velDirX = velX / velMag;
                    const velDirY = velY / velMag;
                    const toPedX = dx / (dist || 1);
                    const toPedY = dy / (dist || 1);
                    
                    // Dot product > 0 means vehicle is heading toward pedestrian
                    const headingToward = velDirX * toPedX + velDirY * toPedY;
                    
                    if (headingToward > 0.3) {  // Heading generally toward us
                        isHit = true;
                    }
                }
            }
            
            if (isHit) {
                // Hit by fast vehicle - die!
                this.die(vgo);
                return;
            }
        }
    }
    
    /**
     * Kill this character - disable colliders, set depth, spawn blood
     * @param {GameObject} killer - The object that killed this character (optional)
     */
    die(killer = null) {
        if (this._isDead) return;
        
        this._isDead = true;
        
        // Save and set depth
        this._savedDepth = this.gameObject.depth || 0;
        this.gameObject.depth = this.deadDepth;
        
        // Disable all colliders
        this._savedColliders = [];
        const modules = this.gameObject.modules || [];
        for (const mod of modules) {
            if (mod && mod.constructor && mod.constructor.name && 
                mod.constructor.name.includes('Collider')) {
                this._savedColliders.push({ module: mod, enabled: mod.enabled });
                mod.enabled = false;
            }
        }
        
        // Stop movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.inputX = 0;
        this.inputY = 0;
        
        // Spawn blood prefab if set
        if (this.deadBloodPrefab && typeof instanceCreate === 'function') {
            instanceCreate(this.deadBloodPrefab, 
                this.gameObject.position.x, 
                this.gameObject.position.y);
        }
        
        // Call event hook
        this.onDeath(killer);
    }
    
    /**
     * Revive this character - re-enable colliders, restore depth
     */
    revive() {
        if (!this._isDead) return;
        
        this._isDead = false;
        
        // Restore depth
        this.gameObject.depth = this._savedDepth;
        
        // Re-enable colliders
        for (const saved of this._savedColliders) {
            if (saved.module) {
                saved.module.enabled = saved.enabled;
            }
        }
        this._savedColliders = [];
        
        // Call event hook
        this.onRevive();
    }
    
    /**
     * Check if character is dead
     * @returns {boolean}
     */
    isDead() {
        return this._isDead;
    }
    
    /**
     * Called when character dies
     * @param {GameObject} killer - The object that killed this character
     */
    onDeath(killer) {
        // Override for death animation, sound, etc.
    }
    
    /**
     * Called when character is revived
     */
    onRevive() {
        // Override for revive effects
    }
    
    // ==================== VEHICLE INTERACTION (GTA-Style) ====================
    
    _updateVehicleInteraction(dt) {
        if (!this.playerControlled) return;
        switch (this._vehicleState) {
            case 'onFoot': {
                // Check for enter key press
                if (keyPressed(this.vehicleEnterExitKey)) {
                    this._tryApproachVehicle();
                }
                break;
            }
            
            case 'approaching': {
                // Any movement key cancels approach and returns to manual control
                const anyMoveKey = keyDown(this.leftKey) || keyDown(this.rightKey) ||
                                   keyDown(this.upKey) || keyDown(this.downKey);
                const anyArrowKey = this.useArrowKeys && (
                    keyDown('ArrowLeft') || keyDown('ArrowRight') ||
                    keyDown('ArrowUp') || keyDown('ArrowDown')
                );
                
                if (anyMoveKey || anyArrowKey) {
                    // Cancel approach
                    this._vehicleState = 'onFoot';
                    this._targetVehicle = null;
                    this._targetVehicleGO = null;
                    this.velocityX = 0;
                    this.velocityY = 0;
                    break;
                }
                
                // Validate target still exists
                if (!this._targetVehicleGO || !this._targetVehicle) {
                    this._vehicleState = 'onFoot';
                    this.velocityX = 0;
                    this.velocityY = 0;
                    break;
                }
                
                // Update door position (vehicle may have moved/rotated)
                // Use the door side we originally chose to approach
                let doorPos;
                if (this._targetDoorSide && this._targetDoorSide !== this._targetVehicle.driverSide) {
                    // Approaching passenger door
                    doorPos = this._targetVehicle.getPassengerDoorWorldPosition ? 
                        this._targetVehicle.getPassengerDoorWorldPosition() :
                        this._targetVehicle.getDriverDoorWorldPosition();
                } else {
                    // Approaching driver door
                    doorPos = this._targetVehicle.getDriverDoorWorldPosition();
                }
                this._targetDoorX = doorPos.x;
                this._targetDoorY = doorPos.y;
                
                // Move toward door
                const dx = this._targetDoorX - this.gameObject.position.x;
                const dy = this._targetDoorY - this.gameObject.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 8) {
                    // Reached door — enter vehicle
                    this.velocityX = 0;
                    this.velocityY = 0;
                    this._enterVehicle();
                } else {
                    // Walk toward door at approach speed
                    const nx = dx / dist;
                    const ny = dy / dist;
                    this.velocityX = nx * this.vehicleApproachSpeed;
                    this.velocityY = ny * this.vehicleApproachSpeed;
                }
                break;
            }
            
            case 'inVehicle': {
                // Snap player position and angle to vehicle
                if (this._currentVehicleGO) {
                    this.gameObject.position.x = this._currentVehicleGO.position.x;
                    this.gameObject.position.y = this._currentVehicleGO.position.y;
                    this.gameObject.angle = this._currentVehicleGO.angle;
                }
                
                // Check for exit key
                if (keyPressed(this.vehicleEnterExitKey)) {
                    this._exitVehicle();
                }
                break;
            }
        }
    }
    
    _tryApproachVehicle() {
        // Find all VehicleController modules in the scene
        const vehicleModules = typeof findAllModules === 'function' ? findAllModules('VehicleController') : [];
        
        let nearestVehicle = null;
        let nearestGO = null;
        let nearestDist = Infinity;
        let nearestDoorPos = null;
        let nearestDoorSide = 'left';
        
        const px = this.gameObject.position.x;
        const py = this.gameObject.position.y;
        
        for (const vc of vehicleModules) {
            if (!vc.vehicleInteractionEnabled) continue;
            // Allow entering occupied vehicles (carjacking) - occupant will be ejected
            
            const vgo = vc.gameObject;
            if (!vgo) continue;
            
            // Check distance to vehicle center first for quick rejection
            const dx = vgo.position.x - px;
            const dy = vgo.position.y - py;
            const centerDist = Math.sqrt(dx * dx + dy * dy);
            
            if (centerDist < this.vehicleSearchDistance + 50) {
                // Get nearest door position (player can enter either side)
                const doorInfo = vc.getNearestDoorPosition ? 
                    vc.getNearestDoorPosition(px, py) : 
                    { ...vc.getDriverDoorWorldPosition(), side: vc.driverSide };
                
                const doorDx = doorInfo.x - px;
                const doorDy = doorInfo.y - py;
                const doorDist = Math.sqrt(doorDx * doorDx + doorDy * doorDy);
                
                if (doorDist < this.vehicleSearchDistance && doorDist < nearestDist) {
                    nearestDist = doorDist;
                    nearestVehicle = vc;
                    nearestGO = vgo;
                    nearestDoorPos = doorInfo;
                    nearestDoorSide = doorInfo.side || 'left';
                }
            }
        }
        
        if (nearestVehicle) {
            this._targetVehicle = nearestVehicle;
            this._targetVehicleGO = nearestGO;
            this._targetDoorX = nearestDoorPos.x;
            this._targetDoorY = nearestDoorPos.y;
            this._targetDoorSide = nearestDoorSide; // Track which door we're approaching
            this._vehicleState = 'approaching';
        }
    }
    
    _enterVehicle() {
        if (!this._targetVehicle || !this._targetVehicleGO) return;
        
        // If vehicle is occupied, eject the current occupant (carjacking)
        if (this._targetVehicle._occupant) {
            const previousOccupant = this._targetVehicle._occupant;
            
            // Check if it's a MovementController2DBrain (AI)
            if (previousOccupant.exitVehicle && typeof previousOccupant.exitVehicle === 'function') {
                // AI brain - call its exit function
                previousOccupant.exitVehicle();
            } else if (previousOccupant._exitVehicle && typeof previousOccupant._exitVehicle === 'function') {
                // Another MovementController2D - force exit
                previousOccupant._exitVehicle();
            } else {
                // Generic fallback - just clear occupant and try to restore their state
                this._ejectOccupant(previousOccupant, this._targetVehicle, this._targetVehicleGO);
            }
            
            // Clear occupant reference
            this._targetVehicle._occupant = null;
        }
        
        // Trigger door animation on the door we approached
        if (this._targetVehicle.triggerDoorAnimation) {
            this._targetVehicle.triggerDoorAnimation(this._targetDoorSide || 'left');
        }
        
        // Store references
        this._currentVehicle = this._targetVehicle;
        this._currentVehicleGO = this._targetVehicleGO;
        this._enteredDoorSide = this._targetDoorSide || 'left'; // Remember which door we entered
        
        // Mark vehicle as occupied
        this._currentVehicle._occupant = this;
        
        // Snap player to vehicle position
        this.gameObject.position.x = this._currentVehicleGO.position.x;
        this.gameObject.position.y = this._currentVehicleGO.position.y;
        
        // Disable player collider so it doesn't interfere with vehicle
        const collider = this.getCollider();
        if (collider) {
            this._savedColliderEnabled = collider.enabled;
            collider.enabled = false;
        }
        
        // Hide player visually (scale to 0)
        this._savedScaleX = this.gameObject.scale ? this.gameObject.scale.x : 1;
        this._savedScaleY = this.gameObject.scale ? this.gameObject.scale.y : 1;
        if (this.gameObject.scale) {
            this.gameObject.scale.x = 0;
            this.gameObject.scale.y = 0;
        }
        
        // Stop player movement
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Activate vehicle control
        this._currentVehicle.playerControlled = true;
        
        // Update state
        this._vehicleState = 'inVehicle';
        this._targetVehicle = null;
        this._targetVehicleGO = null;
        this._targetDoorSide = null;
    }
    
    _exitVehicle() {
        if (!this._currentVehicle || !this._currentVehicleGO) return;
        
        // Calculate exit position using smart exit (checks for blocked doors)
        // Defaults to driver side, falls back to passenger, then front
        const exitInfo = this._currentVehicle.getExitWorldPosition();
        const exitSide = exitInfo.side || this._currentVehicle.driverSide;
        
        // Trigger door animation on exit side
        if (this._currentVehicle.triggerDoorAnimation) {
            this._currentVehicle.triggerDoorAnimation(exitSide);
        }
        
        // Deactivate vehicle control
        this._currentVehicle.playerControlled = false;
        this._currentVehicle._occupant = null;
        
        // Move player to exit position
        this.gameObject.position.x = exitInfo.x;
        this.gameObject.position.y = exitInfo.y;
        
        // Re-enable player collider
        const collider = this.getCollider();
        if (collider) {
            collider.enabled = this._savedColliderEnabled !== undefined ? this._savedColliderEnabled : true;
        }
        
        // Restore player visibility
        if (this.gameObject.scale) {
            this.gameObject.scale.x = this._savedScaleX || 1;
            this.gameObject.scale.y = this._savedScaleY || 1;
        }
        
        // Stop movement
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Clear state
        this._currentVehicle = null;
        this._currentVehicleGO = null;
        this._enteredDoorSide = null;
        this._vehicleState = 'onFoot';
    }
    
    /**
     * Eject an occupant from a vehicle (used for carjacking)
     * @param {object} occupant - The occupant to eject (could be any module)
     * @param {VehicleController} vehicleController - The vehicle
     * @param {GameObject} vehicleObject - The vehicle's GameObject
     * @private
     */
    _ejectOccupant(occupant, vehicleController, vehicleObject) {
        if (!occupant || !occupant.gameObject) return;
        
        // Get exit position
        const exitPos = vehicleController.getExitWorldPosition ? 
            vehicleController.getExitWorldPosition() : 
            { x: vehicleObject.position.x + 30, y: vehicleObject.position.y };
        
        // Move occupant to exit position
        occupant.gameObject.position.x = exitPos.x;
        occupant.gameObject.position.y = exitPos.y;
        
        // Restore visibility
        if (occupant.gameObject.scale) {
            occupant.gameObject.scale.x = occupant._savedScaleX || 1;
            occupant.gameObject.scale.y = occupant._savedScaleY || 1;
        }
        
        // Re-enable collider
        const collider = occupant.gameObject.getModule ? occupant.gameObject.getModule('Collider') : null;
        if (collider) {
            collider.enabled = occupant._savedColliderEnabled !== undefined ? occupant._savedColliderEnabled : true;
        }
        
        // Reset internal vehicle state if present
        if (occupant._isInVehicle !== undefined) {
            occupant._isInVehicle = false;
        }
        if (occupant._vehicleController !== undefined) {
            occupant._vehicleController = null;
        }
        if (occupant._vehicleObject !== undefined) {
            occupant._vehicleObject = null;
        }
        if (occupant._vehicleState !== undefined) {
            occupant._vehicleState = 'onFoot';
        }
        if (occupant._nodesInitialized !== undefined) {
            occupant._nodesInitialized = false;
        }
        
        // Trigger door animation
        if (vehicleController.triggerDoorAnimation) {
            vehicleController.triggerDoorAnimation(exitPos.side || vehicleController.driverSide || 'left');
        }
        
        console.log('[MovementController2D] Ejected occupant from vehicle');
    }
    
    /** Is the player currently inside a vehicle? */
    isInVehicle() {
        return this._vehicleState === 'inVehicle';
    }
    
    /** Is the player currently walking toward a vehicle? */
    isApproachingVehicle() {
        return this._vehicleState === 'approaching';
    }
    
    /** Get the VehicleController module the player is currently driving (or null) */
    getCurrentVehicle() {
        return this._currentVehicle;
    }
    
    /** Get the vehicle GameObject the player is currently in (or null) */
    getCurrentVehicleObject() {
        return this._currentVehicleGO;
    }
    
    /** Force exit from vehicle (e.g. vehicle destroyed, cutscene) */
    forceExitVehicle() {
        if (this._vehicleState === 'inVehicle') {
            this._exitVehicle();
        } else if (this._vehicleState === 'approaching') {
            this._vehicleState = 'onFoot';
            this._targetVehicle = null;
            this._targetVehicleGO = null;
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Get current velocity as a vector
     * @returns {Object} {x, y}
     */
    getVelocity() {
        return { x: this.velocityX, y: this.velocityY };
    }
    
    /**
     * Set velocity directly
     */
    setVelocity(x, y) {
        this.velocityX = x;
        this.velocityY = y;
    }
    
    /**
     * Add to current velocity (for knockback, boosts, etc.)
     */
    addVelocity(x, y) {
        this.velocityX += x;
        this.velocityY += y;
    }
    
    /**
     * Stop all movement
     */
    stop() {
        this.velocityX = 0;
        this.velocityY = 0;
    }
    
    /**
     * Check if currently moving
     * @returns {boolean}
     */
    isMoving() {
        return this.velocityX !== 0 || this.velocityY !== 0;
    }
    
    /**
     * Is the character on the ground? (platformer mode)
     * @returns {boolean}
     */
    isGrounded() {
        return this._isGrounded;
    }
    
    /**
     * Is the character wall-sliding? (platformer mode)
     * @returns {boolean}
     */
    isWallSliding() {
        return this._isWallSliding;
    }

    /**
     * Is the character touching a wall on the left? (platformer mode)
     * @returns {boolean}
     */
    isWallLeft() {
        return this._isTouchingWallLeft;
    }
    
    /**
     * Is the character touching a wall on the right? (platformer mode)
     * @returns {boolean}
     */
    isWallRight() {
        return this._isTouchingWallRight;
    }

    /**
     * Is the character standing on a slope? (platformer mode)
     * @returns {boolean}
     */
    isOnSlope() {
        return this._onSlope;
    }
    
    /**
     * Get the current ground surface angle in degrees (0 = flat).
     * @returns {number}
     */
    getGroundAngle() {
        return this._groundAngle;
    }
    
    /**
     * Get ground normal vector.
     * @returns {Object} {x, y}
     */
    getGroundNormal() {
        return { ...this._groundNormal };
    }
    
    /**
     * Force a jump (bypasses input, useful for bounce pads / scripts).
     * @param {number} [force] - Override jump force (optional)
     */
    forceJump(force) {
        const origForce = this.jumpForce;
        if (force !== undefined) this.jumpForce = force;
        this._executeJump();
        this.jumpForce = origForce;
    }
    
    /**
     * Get movement direction as normalized vector
     */
    getDirection() {
        const length = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (length === 0) return { x: 0, y: 0 };
        return { x: this.velocityX / length, y: this.velocityY / length };
    }
    
    /**
     * Get the angle of movement in degrees (0 = right, 90 = down)
     */
    getMovementAngle() {
        if (this.velocityX === 0 && this.velocityY === 0) return 0;
        return Math.atan2(this.velocityY, this.velocityX) * 180 / Math.PI;
    }
    
    /**
     * Get how many jumps remain before landing.
     * @returns {number}
     */
    getJumpsRemaining() {
        return this._jumpsRemaining;
    }
    
    // ==================== ADDITIONAL API ====================
    
    /**
     * Check if the character is currently grounded
     * @returns {boolean}
     */
    isGrounded() {
        return this._isGrounded;
    }
    
    /**
     * Check if the character is currently jumping
     * @returns {boolean}
     */
    isJumping() {
        return this._isJumping;
    }
    
    /**
     * Check if the character is currently wall sliding
     * @returns {boolean}
     */
    isWallSliding() {
        return this._isWallSliding;
    }
    
    /**
     * Check if touching a wall on the left side
     * @returns {boolean}
     */
    isTouchingWallLeft() {
        return this._isTouchingWallLeft;
    }
    
    /**
     * Check if touching a wall on the right side
     * @returns {boolean}
     */
    isTouchingWallRight() {
        return this._isTouchingWallRight;
    }
    
    /**
     * Check if touching any wall
     * @returns {boolean}
     */
    isTouchingWall() {
        return this._isTouchingWallLeft || this._isTouchingWallRight;
    }
    
    /**
     * Get the wall direction (-1 = left, 1 = right, 0 = none)
     * @returns {number}
     */
    getWallDirection() {
        if (this._isTouchingWallLeft) return -1;
        if (this._isTouchingWallRight) return 1;
        return 0;
    }
    
    /**
     * Get current velocity as object
     * @returns {{x: number, y: number}}
     */
    getVelocity() {
        return { x: this.velocityX, y: this.velocityY };
    }
    
    /**
     * Set velocity directly
     * @param {number} x - Horizontal velocity
     * @param {number} y - Vertical velocity
     */
    setVelocity(x, y) {
        this.velocityX = x;
        this.velocityY = y;
    }
    
    /**
     * Add to current velocity
     * @param {number} x - Horizontal addition
     * @param {number} y - Vertical addition
     */
    addVelocity(x, y) {
        this.velocityX += x;
        this.velocityY += y;
    }
    
    /**
     * Get current input direction
     * @returns {{x: number, y: number}}
     */
    getInputDirection() {
        return { x: this.inputX, y: this.inputY };
    }
    
    /**
     * Set input direction programmatically (for AI/cutscenes)
     * @param {number} x - Horizontal input (-1 to 1)
     * @param {number} y - Vertical input (-1 to 1)
     */
    setInputDirection(x, y) {
        this.inputX = Math.max(-1, Math.min(1, x));
        this.inputY = Math.max(-1, Math.min(1, y));
    }
    
    /**
     * Trigger a jump programmatically
     * @param {number} [forceMultiplier=1] - Multiply jump force by this amount
     * @returns {boolean} True if jump was performed
     */
    triggerJump(forceMultiplier = 1) {
        if (this._jumpsRemaining <= 0 && !this._isGrounded && !this._isWallSliding) {
            return false;
        }
        
        // Calculate jump direction (opposite to gravity)
        const gx = this.gravityDirection.x;
        const gy = this.gravityDirection.y;
        const glen = Math.sqrt(gx * gx + gy * gy) || 1;
        
        const jumpX = (-gx / glen) * this.jumpForce * forceMultiplier;
        const jumpY = (-gy / glen) * this.jumpForce * forceMultiplier;
        
        // Apply jump
        if (Math.abs(gx) > Math.abs(gy)) {
            this.velocityX = jumpX;
        } else {
            this.velocityY = jumpY;
        }
        
        this._jumpsRemaining--;
        this._isJumping = true;
        this._isGrounded = false;
        
        this.onJump();
        return true;
    }
    
    /**
     * Force the character to become grounded (resets jumps, clears jumping state)
     */
    forceGround() {
        this._isGrounded = true;
        this._isJumping = false;
        this._jumpsRemaining = this.maxJumps;
        this._coyoteTimer = this.coyoteTime;
    }
    
    /**
     * Force the character to become airborne
     * @param {number} [initialVelocityY=0] - Initial vertical velocity
     */
    forceAirborne(initialVelocityY = 0) {
        this._isGrounded = false;
        if (initialVelocityY !== 0) {
            this.velocityY = initialVelocityY;
        }
    }
    
    /**
     * Stop all movement immediately
     */
    stopMovement() {
        this.velocityX = 0;
        this.velocityY = 0;
        this.inputX = 0;
        this.inputY = 0;
    }
    
    /**
     * Get current facing direction
     * @returns {number} -1 for left, 1 for right
     */
    getFacingDirection() {
        return this._lastFacingDir || 1;
    }
    
    /**
     * Set facing direction
     * @param {number} dir - -1 for left, 1 for right
     */
    setFacingDirection(dir) {
        this._lastFacingDir = dir < 0 ? -1 : 1;
        if (this.flipSpriteOnTurn && this.gameObject.sprite) {
            this.gameObject.sprite.flipped = this._lastFacingDir < 0;
        }
    }
    
    /**
     * Check if within coyote time (can still jump after leaving ground)
     * @returns {boolean}
     */
    inCoyoteTime() {
        return !this._isGrounded && this._coyoteTimer > 0;
    }
    
    /**
     * Get remaining coyote time
     * @returns {number}
     */
    getCoyoteTimeRemaining() {
        return Math.max(0, this._coyoteTimer);
    }
    
    /**
     * Get current movement mode
     * @returns {string} 'topdown', 'topdownRotate', or 'platformer'
     */
    getMovementMode() {
        return this.movementMode;
    }
    
    /**
     * Change movement mode at runtime
     * @param {string} mode - 'topdown', 'topdownRotate', or 'platformer'
     */
    setMovementMode(mode) {
        if (['topdown', 'topdownRotate', 'platformer'].includes(mode)) {
            this.movementMode = mode;
        }
    }
    
    /**
     * Apply an external force (e.g., knockback, explosion)
     * @param {number} forceX - Horizontal force
     * @param {number} forceY - Vertical force
     */
    applyForce(forceX, forceY) {
        this.velocityX += forceX;
        this.velocityY += forceY;
    }
    
    /**
     * Apply impulse that overrides current velocity
     * @param {number} impulseX - Horizontal impulse
     * @param {number} impulseY - Vertical impulse
     */
    applyImpulse(impulseX, impulseY) {
        this.velocityX = impulseX;
        this.velocityY = impulseY;
    }
    
    /**
     * Get horizontal speed (absolute value)
     * @returns {number}
     */
    getHorizontalSpeed() {
        return Math.abs(this.velocityX);
    }
    
    /**
     * Get vertical speed (absolute value)
     * @returns {number}
     */
    getVerticalSpeed() {
        return Math.abs(this.velocityY);
    }
    
    /**
     * Check if moving horizontally
     * @returns {boolean}
     */
    isMovingHorizontally() {
        return Math.abs(this.velocityX) > 1;
    }
    
    /**
     * Check if falling (moving downward in platformer mode)
     * @returns {boolean}
     */
    isFalling() {
        return !this._isGrounded && this.velocityY > 0;
    }
    
    /**
     * Check if rising (moving upward in platformer mode)
     * @returns {boolean}
     */
    isRising() {
        return this.velocityY < 0;
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'MovementController2D';
        
        // Mode
        json.movementMode = this.movementMode;
        
        // Core movement
        json.moveSpeed = this.moveSpeed;
        json.acceleration = this.acceleration;
        json.deceleration = this.deceleration;
        json.diagonalNormalize = this.diagonalNormalize;
        
        // Keys
        json.upKey = this.upKey;
        json.downKey = this.downKey;
        json.leftKey = this.leftKey;
        json.rightKey = this.rightKey;
        json.jumpKey = this.jumpKey;
        json.useArrowKeys = this.useArrowKeys;
        
        // Top-Down Rotate
        json.rotationSpeed = this.rotationSpeed;
        json.strafeLeftKey = this.strafeLeftKey;
        json.strafeRightKey = this.strafeRightKey;
        
        // Jump
        json.jumpForce = this.jumpForce;
        json.variableJumpHeight = this.variableJumpHeight;
        json.jumpCutMultiplier = this.jumpCutMultiplier;
        json.maxJumps = this.maxJumps;
        json.coyoteTime = this.coyoteTime;
        json.jumpBufferTime = this.jumpBufferTime;
        
        // Gravity
        json.gravity = this.gravity;
        json.gravityDirection = { ...this.gravityDirection };
        json.maxFallSpeed = this.maxFallSpeed;
        json.fallingGravityMultiplier = this.fallingGravityMultiplier;
        
        // Slopes
        json.enableSlopes = this.enableSlopes;
        json.maxSlopeAngle = this.maxSlopeAngle;
        json.slopeRayLength = this.slopeRayLength;
        json.slopeSnapDistance = this.slopeSnapDistance;
        json.slopeSpeedModifier = this.slopeSpeedModifier;
        
        // Wall interaction
        json.enableWallSlide = this.enableWallSlide;
        json.wallSlideSpeed = this.wallSlideSpeed;
        json.enableWallJump = this.enableWallJump;
        json.wallJumpForce = { ...this.wallJumpForce };
        
        // Collision
        json.checkCollisions = this.checkCollisions;
        json.collisionTag = this.collisionTag;
        json.collisionPrecision = this.collisionPrecision;
        json.cornerCorrection = this.cornerCorrection;
        
        // Debug
        json.showDebug = this.showDebug;
        
        // AI Control
        json.playerControlled = this.playerControlled;
        
        // Vehicle Interaction
        json.vehicleInteraction = this.vehicleInteraction;
        json.vehicleEnterExitKey = this.vehicleEnterExitKey;
        json.vehicleSearchDistance = this.vehicleSearchDistance;
        json.vehicleApproachSpeed = this.vehicleApproachSpeed;
        
        // TDTD Grid World
        json.tdtdEnabled = this.tdtdEnabled;
        json.tdtdZ = this.tdtdZ;
        json.tdtdHeight = this.tdtdHeight;
        json.tdtdGravity = this.tdtdGravity;
        json.tdtdMaxFallSpeed = this.tdtdMaxFallSpeed;
        json.tdtdMaxStepHeight = this.tdtdMaxStepHeight;
        json.tdtdCollisionHalfWidth = this.tdtdCollisionHalfWidth;
        json.tdtdCollisionHalfHeight = this.tdtdCollisionHalfHeight;
        
        // Vehicle Death Detection
        json.enableVehicleDeathDetection = this.enableVehicleDeathDetection;
        json.vehicleDeathSpeedKmh = this.vehicleDeathSpeedKmh;
        json.deadBloodPrefab = this.deadBloodPrefab;
        json.deadDepth = this.deadDepth;
        
        // VoxelTerrain2D Collision
        json.voxelTerrainEnabled = this.voxelTerrainEnabled;
        json.voxelTerrainTag = this.voxelTerrainTag;
        
        // TilemapRenderer Collision
        json.tilemapEnabled = this.tilemapEnabled;
        json.tilemapTag = this.tilemapTag;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new MovementController2D();
        module.enabled = json.enabled ?? true;
        
        // Mode
        module.movementMode = json.movementMode || 'topdown';
        
        // Core movement
        module.moveSpeed = json.moveSpeed ?? 200;
        module.acceleration = json.acceleration ?? 0;
        module.deceleration = json.deceleration ?? 0;
        module.diagonalNormalize = json.diagonalNormalize ?? true;
        
        // Keys
        module.upKey = json.upKey || 'KeyW';
        module.downKey = json.downKey || 'KeyS';
        module.leftKey = json.leftKey || 'KeyA';
        module.rightKey = json.rightKey || 'KeyD';
        module.jumpKey = json.jumpKey || 'Space';
        module.useArrowKeys = json.useArrowKeys ?? true;
        
        // Top-Down Rotate
        module.rotationSpeed = json.rotationSpeed ?? 180;
        module.strafeLeftKey = json.strafeLeftKey || 'KeyQ';
        module.strafeRightKey = json.strafeRightKey || 'KeyE';
        
        // Jump
        module.jumpForce = json.jumpForce ?? 400;
        module.variableJumpHeight = json.variableJumpHeight ?? true;
        module.jumpCutMultiplier = json.jumpCutMultiplier ?? 0.4;
        module.maxJumps = json.maxJumps ?? 1;
        module.coyoteTime = json.coyoteTime ?? 0.1;
        module.jumpBufferTime = json.jumpBufferTime ?? 0.1;
        
        // Gravity
        module.gravity = json.gravity ?? 980;
        module.gravityDirection = json.gravityDirection ? { ...json.gravityDirection } : { x: 0, y: 1 };
        module.maxFallSpeed = json.maxFallSpeed ?? 800;
        module.fallingGravityMultiplier = json.fallingGravityMultiplier ?? 1.5;
        
        // Slopes
        module.enableSlopes = json.enableSlopes ?? true;
        module.maxSlopeAngle = json.maxSlopeAngle ?? 50;
        module.slopeRayLength = json.slopeRayLength ?? 20;
        module.slopeSnapDistance = json.slopeSnapDistance ?? 8;
        module.slopeSpeedModifier = json.slopeSpeedModifier ?? true;
        
        // Wall interaction
        module.enableWallSlide = json.enableWallSlide ?? false;
        module.wallSlideSpeed = json.wallSlideSpeed ?? 60;
        module.enableWallJump = json.enableWallJump ?? false;
        module.wallJumpForce = json.wallJumpForce ? { ...json.wallJumpForce } : { x: 300, y: 400 };
        
        // Collision
        module.checkCollisions = json.checkCollisions ?? true;
        module.collisionTag = json.collisionTag || '';
        module.collisionPrecision = json.collisionPrecision ?? 1;
        module.cornerCorrection = json.cornerCorrection ?? 8;
        
        // Debug
        module.showDebug = json.showDebug ?? false;
        
        // AI Control
        module.playerControlled = json.playerControlled ?? true;
        
        // Vehicle Interaction
        module.vehicleInteraction = json.vehicleInteraction ?? false;
        module.vehicleEnterExitKey = json.vehicleEnterExitKey || 'Enter';
        module.vehicleSearchDistance = json.vehicleSearchDistance ?? 150;
        module.vehicleApproachSpeed = json.vehicleApproachSpeed ?? 180;
        
        // TDTD Grid World
        module.tdtdEnabled = json.tdtdEnabled ?? false;
        module.tdtdZ = json.tdtdZ ?? 0;
        module.tdtdHeight = json.tdtdHeight ?? 32;
        module.tdtdGravity = json.tdtdGravity ?? 600;
        module.tdtdMaxFallSpeed = json.tdtdMaxFallSpeed ?? 800;
        module.tdtdMaxStepHeight = json.tdtdMaxStepHeight ?? 8;
        module.tdtdCollisionHalfWidth = json.tdtdCollisionHalfWidth ?? 8;
        module.tdtdCollisionHalfHeight = json.tdtdCollisionHalfHeight ?? 8;
        
        // Vehicle Death Detection
        module.enableVehicleDeathDetection = json.enableVehicleDeathDetection ?? true;
        module.vehicleDeathSpeedKmh = json.vehicleDeathSpeedKmh ?? 20;
        module.deadBloodPrefab = json.deadBloodPrefab || '';
        module.deadDepth = json.deadDepth ?? 1000;
        
        // VoxelTerrain2D Collision
        module.voxelTerrainEnabled = json.voxelTerrainEnabled ?? false;
        module.voxelTerrainTag = json.voxelTerrainTag || '';
        
        // TilemapRenderer Collision
        module.tilemapEnabled = json.tilemapEnabled ?? false;
        module.tilemapTag = json.tilemapTag || '';
        
        return module;
    }
    
    clone() {
        const c = new MovementController2D();
        c.enabled = this.enabled;
        
        // Mode
        c.movementMode = this.movementMode;
        
        // Core movement
        c.moveSpeed = this.moveSpeed;
        c.acceleration = this.acceleration;
        c.deceleration = this.deceleration;
        c.diagonalNormalize = this.diagonalNormalize;
        
        // Keys
        c.upKey = this.upKey;
        c.downKey = this.downKey;
        c.leftKey = this.leftKey;
        c.rightKey = this.rightKey;
        c.jumpKey = this.jumpKey;
        c.useArrowKeys = this.useArrowKeys;
        
        // Top-Down Rotate
        c.rotationSpeed = this.rotationSpeed;
        c.strafeLeftKey = this.strafeLeftKey;
        c.strafeRightKey = this.strafeRightKey;
        
        // Jump
        c.jumpForce = this.jumpForce;
        c.variableJumpHeight = this.variableJumpHeight;
        c.jumpCutMultiplier = this.jumpCutMultiplier;
        c.maxJumps = this.maxJumps;
        c.coyoteTime = this.coyoteTime;
        c.jumpBufferTime = this.jumpBufferTime;
        
        // Gravity
        c.gravity = this.gravity;
        c.gravityDirection = { ...this.gravityDirection };
        c.maxFallSpeed = this.maxFallSpeed;
        c.fallingGravityMultiplier = this.fallingGravityMultiplier;
        
        // Slopes
        c.enableSlopes = this.enableSlopes;
        c.maxSlopeAngle = this.maxSlopeAngle;
        c.slopeRayLength = this.slopeRayLength;
        c.slopeSnapDistance = this.slopeSnapDistance;
        c.slopeSpeedModifier = this.slopeSpeedModifier;
        
        // Wall interaction
        c.enableWallSlide = this.enableWallSlide;
        c.wallSlideSpeed = this.wallSlideSpeed;
        c.enableWallJump = this.enableWallJump;
        c.wallJumpForce = { ...this.wallJumpForce };
        
        // Collision
        c.checkCollisions = this.checkCollisions;
        c.collisionTag = this.collisionTag;
        c.collisionPrecision = this.collisionPrecision;
        c.cornerCorrection = this.cornerCorrection;
        
        // Debug
        c.showDebug = this.showDebug;
        
        // AI Control
        c.playerControlled = this.playerControlled;
        
        // Vehicle Interaction
        c.vehicleInteraction = this.vehicleInteraction;
        c.vehicleEnterExitKey = this.vehicleEnterExitKey;
        c.vehicleSearchDistance = this.vehicleSearchDistance;
        c.vehicleApproachSpeed = this.vehicleApproachSpeed;
        
        // TDTD Grid World
        c.tdtdEnabled = this.tdtdEnabled;
        c.tdtdZ = this.tdtdZ;
        c.tdtdHeight = this.tdtdHeight;
        c.tdtdGravity = this.tdtdGravity;
        c.tdtdMaxFallSpeed = this.tdtdMaxFallSpeed;
        c.tdtdMaxStepHeight = this.tdtdMaxStepHeight;
        c.tdtdCollisionHalfWidth = this.tdtdCollisionHalfWidth;
        c.tdtdCollisionHalfHeight = this.tdtdCollisionHalfHeight;
        
        // Vehicle Death Detection
        c.enableVehicleDeathDetection = this.enableVehicleDeathDetection;
        c.vehicleDeathSpeedKmh = this.vehicleDeathSpeedKmh;
        c.deadBloodPrefab = this.deadBloodPrefab;
        c.deadDepth = this.deadDepth;
        
        // VoxelTerrain2D Collision
        c.voxelTerrainEnabled = this.voxelTerrainEnabled;
        c.voxelTerrainTag = this.voxelTerrainTag;
        
        // TilemapRenderer Collision
        c.tilemapEnabled = this.tilemapEnabled;
        c.tilemapTag = this.tilemapTag;
        
        return c;
    }

    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>🏃 MovementController2D Overview</h2>
            <p>The <strong>MovementController2D</strong> module provides ready-to-use 2D movement for characters, enemies, and NPCs. It supports two distinct modes:</p>
            <ul>
                <li><strong>Top-Down</strong> — 8-directional movement for RPGs, adventure games, twin-stick shooters</li>
                <li><strong>Platformer</strong> — Side-scrolling physics with gravity, jumping, wall slides, and slopes</li>
            </ul>
            <p>The controller handles input (keyboard + gamepad), acceleration/deceleration, collision response via Rigidbody, and fires events for animation and game logic.</p>

            <div class="tip">This module requires a <strong>Rigidbody</strong> module on the same GameObject for collision detection to work.</div>
        `,

        "Top-Down Mode": `
            <h2>⬆️ Top-Down Mode</h2>
            <p>Set <code>movementType = 'topdown'</code> for 8-directional movement. The character moves in the direction of key input with smooth acceleration and deceleration.</p>

            <h3>Key Properties</h3>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>moveSpeed</code></td><td>200</td><td>Maximum movement speed (px/s)</td></tr>
                <tr><td><code>acceleration</code></td><td>800</td><td>How quickly the character reaches max speed</td></tr>
                <tr><td><code>deceleration</code></td><td>800</td><td>How quickly the character stops</td></tr>
                <tr><td><code>rotateToDirection</code></td><td>false</td><td>Rotate the sprite to face the movement direction</td></tr>
                <tr><td><code>rotationSpeed</code></td><td>10</td><td>How fast the sprite rotates to face direction</td></tr>
            </table>

            <pre><code>start() {
    const mc = this.getModule('MovementController2D');
    mc.movementType = 'topdown';
    mc.moveSpeed = 250;
    mc.acceleration = 1000;
    mc.rotateToDirection = true;
}</code></pre>

            <div class="tip">Diagonal movement is automatically normalized so the character doesn't move faster diagonally than in cardinal directions.</div>
        `,

        "Platformer Mode": `
            <h2>🎮 Platformer Mode</h2>
            <p>Set <code>movementType = 'platformer'</code> for side-scrolling gameplay with gravity, jumping, and advanced movement mechanics.</p>

            <h3>Core Properties</h3>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>moveSpeed</code></td><td>200</td><td>Horizontal movement speed</td></tr>
                <tr><td><code>gravity</code></td><td>980</td><td>Gravity strength (px/s²)</td></tr>
                <tr><td><code>jumpForce</code></td><td>400</td><td>Initial jump velocity</td></tr>
                <tr><td><code>maxJumps</code></td><td>1</td><td>Max jumps (2+ for double jump)</td></tr>
                <tr><td><code>coyoteTime</code></td><td>0.1</td><td>Grace period to jump after leaving a ledge (seconds)</td></tr>
                <tr><td><code>jumpBufferTime</code></td><td>0.1</td><td>Buffer window for pressing jump before landing</td></tr>
                <tr><td><code>variableJumpHeight</code></td><td>true</td><td>Release jump early for a shorter hop</td></tr>
            </table>

            <h3>Slopes & Walls</h3>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>slopeHandling</code></td><td>true</td><td>Enable slope movement</td></tr>
                <tr><td><code>maxSlopeAngle</code></td><td>50</td><td>Max walkable slope angle in degrees</td></tr>
                <tr><td><code>wallSlide</code></td><td>false</td><td>Slide down walls when pressed against them</td></tr>
                <tr><td><code>wallSlideSpeed</code></td><td>50</td><td>Wall slide fall speed (capped)</td></tr>
                <tr><td><code>wallJump</code></td><td>false</td><td>Jump off walls while wall sliding</td></tr>
                <tr><td><code>wallJumpForceX/Y</code></td><td>250/350</td><td>Wall jump forces</td></tr>
            </table>

            <pre><code>start() {
    const mc = this.getModule('MovementController2D');
    mc.movementType = 'platformer';
    mc.jumpForce = 450;
    mc.maxJumps = 2;        // Double jump
    mc.wallSlide = true;
    mc.wallJump = true;
    mc.coyoteTime = 0.12;
}</code></pre>
        `,

        "Events & Callbacks": `
            <h2>📢 Events & Callbacks</h2>
            <p>The controller fires callbacks you can assign for animation triggers, sound effects, and game logic:</p>
            <table>
                <tr><th>Callback</th><th>When It Fires</th><th>Arguments</th></tr>
                <tr><td><code>onJump</code></td><td>Player jumps (including double/wall jumps)</td><td><code>{ jumpCount, isWallJump }</code></td></tr>
                <tr><td><code>onLand</code></td><td>Player lands on ground</td><td><code>{ velocity }</code></td></tr>
                <tr><td><code>onWallJump</code></td><td>Player wall-jumps</td><td><code>{ direction }</code></td></tr>
                <tr><td><code>onCollision</code></td><td>Collision detected with solid object</td><td><code>{ other, normal }</code></td></tr>
            </table>

            <pre><code>start() {
    const mc = this.getModule('MovementController2D');
    
    mc.onJump = (info) => {
        console.log('Jumped!', info.jumpCount);
        // Play jump animation/sound
    };
    
    mc.onLand = (info) => {
        console.log('Landed with velocity:', info.velocity);
        // Play landing particles
    };
    
    mc.onWallJump = (info) => {
        console.log('Wall jumped! Direction:', info.direction);
    };
}</code></pre>
        `,

        "API Reference": `
            <h2>📖 API Reference</h2>
            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getVelocity()</code></td><td>Returns <code>{ x, y }</code> current velocity</td></tr>
                <tr><td><code>setVelocity(x, y)</code></td><td>Directly set velocity</td></tr>
                <tr><td><code>addVelocity(x, y)</code></td><td>Add to current velocity (impulse)</td></tr>
                <tr><td><code>stop()</code></td><td>Zero all velocity immediately</td></tr>
                <tr><td><code>isMoving()</code></td><td>Returns <code>true</code> if the character has velocity</td></tr>
                <tr><td><code>isGrounded()</code></td><td>Returns <code>true</code> if on the ground (platformer mode)</td></tr>
                <tr><td><code>forceJump()</code></td><td>Trigger a jump programmatically, bypassing input</td></tr>
                <tr><td><code>getDirection()</code></td><td>Returns facing direction string or angle</td></tr>
            </table>

            <h3>Usage Examples</h3>
            <pre><code>const mc = this.getModule('MovementController2D');

// Knockback effect
mc.addVelocity(-300, -200);

// Check state for animation
if (mc.isGrounded()) {
    if (mc.isMoving()) playAnim('run');
    else playAnim('idle');
} else {
    playAnim('jump');
}

// Programmatic jump (e.g., from a bounce pad)
mc.forceJump();</code></pre>
        `,

        "Input & Controls": `
            <h2>🎹 Input & Controls</h2>
            <p>The controller reads keyboard and gamepad input automatically. Configure which keys to use:</p>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>keyUp</code></td><td>ArrowUp / W</td><td>Move up (top-down) or jump (platformer)</td></tr>
                <tr><td><code>keyDown</code></td><td>ArrowDown / S</td><td>Move down (top-down)</td></tr>
                <tr><td><code>keyLeft</code></td><td>ArrowLeft / A</td><td>Move left</td></tr>
                <tr><td><code>keyRight</code></td><td>ArrowRight / D</td><td>Move right</td></tr>
                <tr><td><code>keyJump</code></td><td>Space</td><td>Jump key (platformer mode)</td></tr>
            </table>
            <p>Gamepad support is built-in — the left stick controls movement and a configurable button handles jumping.</p>

            <h3>Disabling Player Input</h3>
            <p>To control movement programmatically (e.g., for AI or cutscenes), disable player input:</p>
            <pre><code>const mc = this.getModule('MovementController2D');
mc.playerControlled = false;

// Now drive movement via code
mc.setVelocity(100, 0); // Move right</code></pre>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>movementType</code></td><td>select</td><td>'topdown'</td><td>Movement mode: topdown or platformer</td></tr>
                <tr><td><code>moveSpeed</code></td><td>number</td><td>200</td><td>Max movement speed (px/s)</td></tr>
                <tr><td><code>acceleration</code></td><td>number</td><td>800</td><td>Acceleration rate</td></tr>
                <tr><td><code>deceleration</code></td><td>number</td><td>800</td><td>Deceleration rate</td></tr>
                <tr><td><code>gravity</code></td><td>number</td><td>980</td><td>Gravity (platformer only)</td></tr>
                <tr><td><code>jumpForce</code></td><td>number</td><td>400</td><td>Jump velocity</td></tr>
                <tr><td><code>maxJumps</code></td><td>number</td><td>1</td><td>Maximum jump count</td></tr>
                <tr><td><code>coyoteTime</code></td><td>number</td><td>0.1</td><td>Coyote time (seconds)</td></tr>
                <tr><td><code>jumpBufferTime</code></td><td>number</td><td>0.1</td><td>Jump buffer window (seconds)</td></tr>
                <tr><td><code>variableJumpHeight</code></td><td>boolean</td><td>true</td><td>Short hop on early release</td></tr>
                <tr><td><code>wallSlide</code></td><td>boolean</td><td>false</td><td>Enable wall sliding</td></tr>
                <tr><td><code>wallJump</code></td><td>boolean</td><td>false</td><td>Enable wall jumping</td></tr>
                <tr><td><code>slopeHandling</code></td><td>boolean</td><td>true</td><td>Enable slope walking</td></tr>
                <tr><td><code>maxSlopeAngle</code></td><td>number</td><td>50</td><td>Max walkable slope (degrees)</td></tr>
                <tr><td><code>rotateToDirection</code></td><td>boolean</td><td>false</td><td>Rotate sprite to face movement</td></tr>
                <tr><td><code>playerControlled</code></td><td>boolean</td><td>true</td><td>Accept player input</td></tr>
            </table>
        `
    };
}

// Register module globally
if (typeof window !== 'undefined') {
    window.MovementController2D = MovementController2D;
}

// Register with Module system if available
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('MovementController2D', MovementController2D);
}
