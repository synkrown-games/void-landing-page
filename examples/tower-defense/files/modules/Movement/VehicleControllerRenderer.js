/**
 * VehicleControllerRenderer Module
 * Handles all visual rendering for VehicleController including:
 * - Door animations (swing open/close on entry/exit)
 * - Vehicle body rendering with damage system
 * - Progressive body deformation using subdivision mesh
 * - Collision damage effects (dents, scratches, glass breaks)
 * 
 * Pairs with VehicleController module on the same GameObject.
 */

class VehicleControllerRenderer extends Module {
    constructor() {
        super();

        // ══════════════════════════════════════════════════════
        // VEHICLE BODY
        // ══════════════════════════════════════════════════════
        this.vehicleImage = '';              // Image path from asset manager
        this.autoDetectSize = false;         // Auto-detect width/height by cropping transparent pixels
        this.vehicleWidth = 40;              // Width of vehicle body (px)
        this.vehicleHeight = 80;             // Height/length of vehicle body (px)
        this.vehicleColor = '#3366cc';       // Base color if no image / for generated body
        this.vehicleOutlineColor = '#1a3366'; // Outline color
        this.vehicleOutlineWidth = 2;
        this.useGeneratedBody = true;        // Use procedural body if no image

        // ══════════════════════════════════════════════════════
        // COLLISION AUTO-RESIZE
        // ══════════════════════════════════════════════════════
        this.autoResizeBoxCollider = false;   // Auto-resize BoxCollider to match deformed vehicle bounds

        // ══════════════════════════════════════════════════════
        // DOOR SYSTEM
        // ══════════════════════════════════════════════════════
        this.doorEnabled = true;             // Enable door animations
        this.doorImage = '';                 // Door image path (optional)
        this.useGeneratedDoor = true;        // Generate gradient door if no image
        this.doorWidth = 8;                  // Door width (px)
        this.doorHeight = 30;                // Door height (px)
        this.doorColor = '#4477dd';          // Door color for generated door
        this.doorColorEnd = '#223366';       // Door gradient end color
        this.doorOffsetX = 12;                // Forward offset from vehicle center to door pivot
        this.doorOffsetY = 0;               // Lateral distance from center to door (always positive)
        this.doorPivotX = 0;                 // Pivot X relative to door (0 = hinge at front edge)
        this.doorPivotY = 0;                 // Pivot Y relative to door (0 = hinge at side edge)
        this.doorOpenAngle = -70;             // Degrees door swings outward
        this.doorOpenTime = 0.4;             // Time to swing open (seconds)
        this.doorCloseTime = 0.3;            // Time to swing closed (seconds)
        this.doorHoldTime = 0.15;            // Time door stays open before closing

        // ══════════════════════════════════════════════════════
        // DAMAGE SYSTEM
        // ══════════════════════════════════════════════════════
        this.damageEnabled = true;           // Enable progressive damage visuals
        this.bodyStrength = 100;             // How resistant the body is to deformation (higher = stronger)
        this.maxDeformation = 12;            // Maximum deformation distance (px)
        this.deformationDecay = 0.0;         // How much deformation heals per second (0 = permanent)
        this.damageThreshold = 50;           // Minimum collision speed to cause damage
        this.damageCooldown = 0.2;           // Seconds between damage events (prevents rapid re-damage)
        this.meshSubdivisions = 3;           // Subdivisions per edge for deformation mesh (more = smoother)
        
        // Realistic deformation
        this.deformRadius = 0.35;            // Base deformation radius as fraction of vehicle size (0.1 - 1.0)
        this.deformRadiusForceScale = true;  // Scale radius with impact force (harder hit = wider area)
        this.crumplePropagation = 0.6;       // How much deformation propagates to neighbors (0-1)
        this.crumpleIterations = 2;          // How many neighbor propagation passes
        this.edgeSoftness = 1.5;             // Multiplier for edge/corner deformation (>1 = softer edges)
        this.centerRigidity = 0.4;           // Multiplier for center area deformation (<1 = more rigid center)
        this.impactDirectional = true;       // Push vertices along impact direction (true) vs toward center (false)
        
        // Damage visual effects
        this.scratchEnabled = true;          // Show scratch marks on damage
        this.scratchColor = '#222222';       // Scratch line color
        this.dentEnabled = true;             // Show dent shadows
        this.dentColor = 'rgba(0,0,0,0.3)';  // Dent shadow color
        this.sparkOnHit = true;              // Emit sparks on collision
        this.sparkColor = '#ffaa00';         // Spark color
        this.sparkCount = 8;                 // Sparks per hit
        
        // Smoke/fire at high damage
        this.smokeEnabled = true;            // Emit smoke when heavily damaged
        this.smokeDamageThreshold = 60;      // Damage % before smoke starts
        this.smokeColor = '#444444';
        this.fireEnabled = true;             // Emit fire when critically damaged
        this.fireDamageThreshold = 85;       // Damage % before fire starts
        this.fireColor = '#ff4400';

        // Glass/window system
        this.windowEnabled = true;           // Draw windows on vehicle
        this.windowColor = '#88ccff';        // Window tint color
        this.windowAlpha = 0.6;              // Window transparency
        this.windowBreakEnabled = true;      // Windows can shatter
        this.windowBreakThreshold = 40;      // Damage % before windows break

        // ══════════════════════════════════════════════════════
        // INTERNAL STATE
        // ══════════════════════════════════════════════════════
        // Door animation state
        this._leftDoorState = 'closed';      // closed | opening | open | closing
        this._rightDoorState = 'closed';
        this._leftDoorAngle = 0;
        this._rightDoorAngle = 0;
        this._leftDoorTimer = 0;
        this._rightDoorTimer = 0;

        // Cached rendering
        this._bodyCanvas = null;
        this._bodyCtx = null;
        this._doorCanvas = null;
        this._doorCtx = null;
        this._needsBodyRedraw = true;
        this._needsDoorRedraw = true;

        // Deformation mesh: 2D grid of {x, y, baseX, baseY, deformX, deformY, u, v}
        this._meshGrid = [];                 // 2D array [row][col]
        this._meshRows = 5;                  // Grid rows
        this._meshCols = 4;                  // Grid columns
        this._meshInitialized = false;
        this._triangles = [];                // Triangulated mesh for rendering

        // Cached deformed image
        this._cachedBodyCanvas = null;
        this._cachedBodyCtx = null;
        this._cachedBodyDirty = true;

        // Damage state
        this._currentDamage = 0;             // 0-100 damage percentage
        this._scratches = [];                // Array of scratch marks {x1, y1, x2, y2, angle}
        this._dents = [];                    // Array of dent positions {x, y, radius, dirX, dirY}
        this._windowsBroken = false;
        this._lastCollisionTime = 0;
        this._smokeParticleTimer = 0;
        this._fireParticleTimer = 0;
        this._mostDamagedPoint = null;       // {x, y} local coords of highest deformation area
        this._impactHistory = [];            // Recent impact points for directional smoke/fire
        
        // Performance optimization caches
        this._cachedAllPoints = null;        // Cached flat array of all mesh points
        this._cachedPerimeterPoints = null;  // Cached perimeter points array
        this._cachedRigidity = null;         // Pre-computed rigidity per mesh point (Float32Array)
        this._deformAmounts = null;          // Pre-allocated deform amounts array (Float32Array)
        this._colliderSyncPending = false;   // Flag for batched collider sync
        this._lastColliderSync = 0;          // Timestamp of last collider sync (throttling)
        this._colliderSyncThrottle = 50;     // Min ms between collider syncs

        // Auto-detect state
        this._autoSizeDetected = false;      // Whether we've already detected size from image
        this._detectedWidth = 0;
        this._detectedHeight = 0;

        // Reference to VehicleController
        this._vehicleController = null;

        // Stored original collision callback for cleanup
        this._originalOnCollisionEnter = null;

        // Reusable particle config objects (avoid per-emission allocation)
        this._sparkConfig = {
            count: 8, color: '#ffaa00', speedMin: 80, speedMax: 200,
            sizeMin: 1, sizeMax: 3, lifetimeMin: 0.1, lifetimeMax: 0.4,
            gravity: 300, fadeOut: true, shape: 'circle'
        };
        this._smokeConfig = {
            count: 1, color: '#444444', speedMin: 10, speedMax: 30,
            sizeMin: 4, sizeMax: 10, lifetimeMin: 0.6, lifetimeMax: 1.5,
            gravity: -20, fadeOut: true, shape: 'circle', spread: Math.PI
        };
        this._fireConfig = {
            count: 2, color: '#ff4400', speedMin: 20, speedMax: 50,
            sizeMin: 3, sizeMax: 8, lifetimeMin: 0.3, lifetimeMax: 0.8,
            gravity: -40, fadeOut: true, shape: 'circle', spread: Math.PI * 0.6
        };
    }

    static namespace = 'Movement,Rendering';
    static is2D = true;

    static getIcon() { return '🚗'; }

    static getDescription() {
        return 'Renders vehicle body, doors, and damage effects. Pairs with VehicleController.';
    }

    // ════════════════════════════════════════════════════════
    // PROPERTY METADATA
    // ════════════════════════════════════════════════════════

    getPropertyMetadata() {
        return [
            // Vehicle Body
            { type: 'groupStart', label: '🚗 Vehicle Body' },
            { type: 'hint', label: 'Configure the vehicle body appearance. Use an image or generate a simple body shape.' },
            { key: 'vehicleImage', label: '🖼️ Vehicle Image', type: 'image', default: '' },
            { key: 'autoDetectSize', label: '📐 Auto-Detect Size', type: 'boolean', default: false, hint: 'Auto-detect width/height from image by trimming transparent pixels' },
            { key: 'useGeneratedBody', label: '⚙️ Use Generated Body', type: 'boolean', default: true, hint: 'Generate a basic body shape if no image is set' },
            { key: 'vehicleWidth', label: '↔️ Width', type: 'number', default: 40, min: 10, max: 200, step: 1, showIf: { autoDetectSize: false } },
            { key: 'vehicleHeight', label: '↕️ Height/Length', type: 'number', default: 80, min: 10, max: 400, step: 1, showIf: { autoDetectSize: false } },
            { key: 'vehicleColor', label: '🎨 Body Color', type: 'color', default: '#3366cc', showIf: { useGeneratedBody: true } },
            { key: 'vehicleOutlineColor', label: '🖊️ Outline Color', type: 'color', default: '#1a3366', showIf: { useGeneratedBody: true } },
            { key: 'vehicleOutlineWidth', label: '📏 Outline Width', type: 'number', default: 2, min: 0, max: 10, step: 0.5, showIf: { useGeneratedBody: true } },
            { type: 'groupEnd' },

            // Door System
            { type: 'groupStart', label: '🚪 Door System' },
            { type: 'hint', label: 'Configure door animations for vehicle entry/exit. Left door is primary, right door mirrors it.' },
            { key: 'doorEnabled', label: '✅ Enable Doors', type: 'boolean', default: true },
            { key: 'doorImage', label: '🖼️ Door Image', type: 'image', default: '', showIf: { doorEnabled: true } },
            { key: 'useGeneratedDoor', label: '⚙️ Use Generated Door', type: 'boolean', default: true, showIf: { doorEnabled: true }, hint: 'Generate a gradient door if no image' },
            { key: 'doorWidth', label: '↔️ Door Width', type: 'number', default: 8, min: 2, max: 30, step: 1, showIf: { doorEnabled: true } },
            { key: 'doorHeight', label: '↕️ Door Height', type: 'number', default: 30, min: 5, max: 60, step: 1, showIf: { doorEnabled: true } },
            { key: 'doorColor', label: '🎨 Door Color', type: 'color', default: '#4477dd', showIf: { doorEnabled: true, useGeneratedDoor: true } },
            { key: 'doorColorEnd', label: '🎨 Door Gradient End', type: 'color', default: '#223366', showIf: { doorEnabled: true, useGeneratedDoor: true } },
            
            { type: 'groupStart', label: '📍 Door Position' },
            { key: 'doorOffsetX', label: '↔️ Lateral Offset', type: 'number', default: 0, min: -50, max: 50, step: 1, showIf: { doorEnabled: true }, hint: 'Forward/back from vehicle center (+ = toward front)' },
            { key: 'doorOffsetY', label: '↕️ Forward Offset', type: 'number', default: 20, min: 5, max: 60, step: 1, showIf: { doorEnabled: true }, hint: 'Distance from center to door pivot' },
            { key: 'doorPivotX', label: '📌 Pivot X', type: 'number', default: 0, min: -20, max: 20, step: 1, showIf: { doorEnabled: true }, hint: 'Pivot point X offset on door' },
            { key: 'doorPivotY', label: '📌 Pivot Y', type: 'number', default: 0, min: -20, max: 20, step: 1, showIf: { doorEnabled: true }, hint: 'Pivot point Y offset on door' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '⏱️ Door Animation' },
            { key: 'doorOpenAngle', label: '📐 Open Angle', type: 'slider', default: 70, min: -120, max: 120, step: 5, showIf: { doorEnabled: true } },
            { key: 'doorOpenTime', label: '⏱️ Open Time', type: 'number', default: 0.4, min: 0.1, max: 2.0, step: 0.05, showIf: { doorEnabled: true } },
            { key: 'doorCloseTime', label: '⏱️ Close Time', type: 'number', default: 0.3, min: 0.1, max: 2.0, step: 0.05, showIf: { doorEnabled: true } },
            { key: 'doorHoldTime', label: '⏱️ Hold Open Time', type: 'number', default: 0.15, min: 0, max: 1.0, step: 0.05, showIf: { doorEnabled: true } },
            { type: 'groupEnd' },
            { type: 'groupEnd' },

            // Damage System
            { type: 'groupStart', label: '💥 Damage System' },
            { type: 'hint', label: 'Progressive damage deforms the vehicle body mesh on collision.' },
            { key: 'damageEnabled', label: '✅ Enable Damage', type: 'boolean', default: true },
            { key: 'bodyStrength', label: '💪 Body Strength', type: 'number', default: 100, min: 10, max: 500, step: 10, showIf: { damageEnabled: true }, hint: 'Higher = more resistant to deformation' },
            { key: 'maxDeformation', label: '📏 Max Deformation', type: 'number', default: 12, min: 1, max: 30, step: 1, showIf: { damageEnabled: true }, hint: 'Maximum mesh point displacement (px)' },
            { key: 'deformationDecay', label: '🔄 Decay Rate', type: 'number', default: 0, min: 0, max: 10, step: 0.5, showIf: { damageEnabled: true }, hint: 'Deformation recovery per second (0 = permanent)' },
            { key: 'damageThreshold', label: '⚡ Damage Threshold', type: 'number', default: 50, min: 0, max: 500, step: 10, showIf: { damageEnabled: true }, hint: 'Minimum collision speed to cause damage' },
            { key: 'damageCooldown', label: '⏱️ Damage Cooldown', type: 'slider', default: 0.2, min: 0, max: 2, step: 0.05, showIf: { damageEnabled: true }, hint: 'Seconds between damage events (prevents rapid re-damage)' },
            { key: 'meshSubdivisions', label: '🔢 Mesh Subdivisions', type: 'number', default: 3, min: 1, max: 8, step: 1, showIf: { damageEnabled: true }, hint: 'More subdivisions = smoother deformation' },
            { type: 'groupEnd' },

            // Realistic Deformation
            { type: 'groupStart', label: '🔧 Deformation Physics' },
            { type: 'hint', label: 'Controls how realistically the body crumples on impact. Vertices deform along the collision direction with crumple propagation.' },
            { key: 'deformRadius', label: '📐 Deform Radius', type: 'slider', default: 0.35, min: 0.1, max: 1.0, step: 0.05, showIf: { damageEnabled: true }, hint: 'Base deformation area as fraction of vehicle size' },
            { key: 'deformRadiusForceScale', label: '📈 Scale w/ Force', type: 'boolean', default: true, showIf: { damageEnabled: true }, hint: 'Harder impacts affect a wider area' },
            { key: 'crumplePropagation', label: '🔗 Crumple Spread', type: 'slider', default: 0.6, min: 0, max: 1, step: 0.05, showIf: { damageEnabled: true }, hint: 'How much deformation spreads to neighbors' },
            { key: 'crumpleIterations', label: '🔄 Spread Passes', type: 'number', default: 2, min: 0, max: 5, step: 1, showIf: { damageEnabled: true }, hint: 'More passes = wider crumple zone' },
            { key: 'edgeSoftness', label: '🧊 Edge Softness', type: 'slider', default: 1.5, min: 0.5, max: 3.0, step: 0.1, showIf: { damageEnabled: true }, hint: 'How easily edges/corners deform (>1 = softer)' },
            { key: 'centerRigidity', label: '🛡️ Center Rigidity', type: 'slider', default: 0.4, min: 0.1, max: 1.0, step: 0.05, showIf: { damageEnabled: true }, hint: 'How rigid the center/cabin is (<1 = more rigid)' },
            { key: 'impactDirectional', label: '➡️ Directional Deform', type: 'boolean', default: true, showIf: { damageEnabled: true }, hint: 'Push vertices along impact direction vs toward center' },
            { type: 'groupEnd' },

            // Damage Effects
            { type: 'groupStart', label: '✨ Damage Effects', showIf: { damageEnabled: true } },
            { key: 'scratchEnabled', label: '🖊️ Scratches', type: 'boolean', default: true, showIf: { damageEnabled: true } },
            { key: 'scratchColor', label: '🎨 Scratch Color', type: 'color', default: '#222222', showIf: { damageEnabled: true, scratchEnabled: true } },
            { key: 'dentEnabled', label: '⚫ Dent Shadows', type: 'boolean', default: true, showIf: { damageEnabled: true } },
            { key: 'dentColor', label: '🎨 Dent Color', type: 'color', default: 'rgba(0,0,0,0.3)', showIf: { damageEnabled: true, dentEnabled: true } },
            { key: 'sparkOnHit', label: '✨ Sparks on Hit', type: 'boolean', default: true, showIf: { damageEnabled: true } },
            { key: 'sparkColor', label: '🎨 Spark Color', type: 'color', default: '#ffaa00', showIf: { damageEnabled: true, sparkOnHit: true } },
            { key: 'sparkCount', label: '🔢 Spark Count', type: 'number', default: 8, min: 1, max: 30, step: 1, showIf: { damageEnabled: true, sparkOnHit: true } },
            { type: 'groupEnd' },

            // Smoke/Fire
            { type: 'groupStart', label: '🔥 Smoke & Fire', showIf: { damageEnabled: true } },
            { key: 'smokeEnabled', label: '💨 Smoke', type: 'boolean', default: true, showIf: { damageEnabled: true } },
            { key: 'smokeDamageThreshold', label: '📊 Smoke Threshold %', type: 'slider', default: 60, min: 10, max: 100, step: 5, showIf: { damageEnabled: true, smokeEnabled: true } },
            { key: 'smokeColor', label: '🎨 Smoke Color', type: 'color', default: '#444444', showIf: { damageEnabled: true, smokeEnabled: true } },
            { key: 'fireEnabled', label: '🔥 Fire', type: 'boolean', default: true, showIf: { damageEnabled: true } },
            { key: 'fireDamageThreshold', label: '📊 Fire Threshold %', type: 'slider', default: 85, min: 10, max: 100, step: 5, showIf: { damageEnabled: true, fireEnabled: true } },
            { key: 'fireColor', label: '🎨 Fire Color', type: 'color', default: '#ff4400', showIf: { damageEnabled: true, fireEnabled: true } },
            { type: 'groupEnd' },

            // Windows
            { type: 'groupStart', label: '🪟 Windows' },
            { key: 'windowEnabled', label: '✅ Draw Windows', type: 'boolean', default: true },
            { key: 'windowColor', label: '🎨 Window Tint', type: 'color', default: '#88ccff', showIf: { windowEnabled: true } },
            { key: 'windowAlpha', label: '🔲 Window Alpha', type: 'slider', default: 0.6, min: 0, max: 1, step: 0.05, showIf: { windowEnabled: true } },
            { key: 'windowBreakEnabled', label: '💔 Windows Can Break', type: 'boolean', default: true, showIf: { windowEnabled: true } },
            { key: 'windowBreakThreshold', label: '📊 Break Threshold %', type: 'slider', default: 40, min: 10, max: 100, step: 5, showIf: { windowEnabled: true, windowBreakEnabled: true } },
            { type: 'groupEnd' },

            // Collision Auto-Resize
            { type: 'groupStart', label: '📦 Collision' },
            { type: 'hint', label: 'Auto-resize BoxCollider to match the vehicle\'s deformed bounds after damage. Provides semi-realistic collision without needing a PolygonCollider.' },
            { key: 'autoResizeBoxCollider', label: '📦 Auto-Resize BoxCollider', type: 'boolean', default: false, hint: 'Resize BoxCollider to fit the deformed vehicle body on damage' },
            { type: 'groupEnd' },

            // Actions
            { type: 'groupStart', label: '🔧 Actions' },
            {
                type: 'button', label: 'Repair Vehicle',
                buttonText: '🔧 Repair', buttonStyle: 'primary', icon: '🔧',
                tooltip: 'Reset all damage and restore vehicle to pristine condition',
                action: 'repair'
            },
            {
                type: 'button', label: 'Test Damage',
                buttonText: '💥 Add Damage', buttonStyle: 'secondary', icon: '💥',
                tooltip: 'Apply test damage to see the effect',
                action: 'testDamage'
            },
            { type: 'groupEnd' }
        ];
    }

    // ════════════════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════════════════

    start() {
        this._vehicleController = this.getModule('VehicleController');
        this._rigidbody = this.getModule('Rigidbody');
        
        // Auto-detect vehicle size from image if enabled
        if (this.autoDetectSize && this.vehicleImage) {
            this._autoDetectVehicleSize();
        }
        
        this._initMesh();
        this._initDoorCanvas();
        this._needsBodyRedraw = true;
        this._needsDoorRedraw = true;
        
        // Subscribe to Rigidbody collision callbacks for damage detection
        // This centralizes collision detection in Rigidbody instead of doing
        // redundant collision loops here
        if (this._rigidbody) {
            const self = this;
            this._originalOnCollisionEnter = this._rigidbody.onCollisionEnter;
            this._rigidbody.onCollisionEnter = function(otherObject, otherCollider, collisionData) {
                // Call original callback first if it exists
                if (self._originalOnCollisionEnter) {
                    self._originalOnCollisionEnter.call(this, otherObject, otherCollider, collisionData);
                }
                // Handle damage from collision
                self._handleRigidbodyCollision(otherObject, collisionData);
            };
        }
    }

    loop(deltaTime) {
        if (deltaTime <= 0) return;

        // Get reference to VehicleController if not cached
        if (!this._vehicleController) {
            this._vehicleController = this.getModule('VehicleController');
        }

        // Get reference to Rigidbody if not cached (for callback subscription if started late)
        if (!this._rigidbody) {
            this._rigidbody = this.getModule('Rigidbody');
            if (this._rigidbody && !this._rigidbody._vcrDamageHooked) {
                // Hook collision callback if we got Rigidbody late
                const self = this;
                const originalOnCollisionEnter = this._rigidbody.onCollisionEnter;
                this._rigidbody.onCollisionEnter = function(otherObject, otherCollider, collisionData) {
                    if (originalOnCollisionEnter) {
                        originalOnCollisionEnter.call(this, otherObject, otherCollider, collisionData);
                    }
                    self._handleRigidbodyCollision(otherObject, collisionData);
                };
                this._rigidbody._vcrDamageHooked = true;
            }
        }

        // Retry auto-detect if image wasn't ready at start()
        if (this.autoDetectSize && this.vehicleImage && !this._autoSizeDetected) {
            this._autoDetectVehicleSize();
            if (this._autoSizeDetected) {
                this._initMesh();
            }
        }

        // Update door animations
        this._updateDoorAnimation(deltaTime);

        // Collision damage is now handled via Rigidbody callbacks (_handleRigidbodyCollision)
        // This avoids redundant collision detection loops

        // Update deformation decay
        if (this.deformationDecay > 0 && this._currentDamage > 0) {
            this._decayDeformation(deltaTime);
        }
        
        // Batched collider sync (throttled to avoid per-hit overhead)
        if (this._colliderSyncPending) {
            const now = performance.now();
            if (now - this._lastColliderSync >= this._colliderSyncThrottle) {
                this._syncPolygonCollider();
                this._syncBoxCollider();
                this._colliderSyncPending = false;
                this._lastColliderSync = now;
            }
        }

        // Update smoke/fire particles
        this._updateDamageParticles(deltaTime);
    }

    draw(ctx) {
        // Draw in local space (already transformed by engine)
        this._drawVehicleBody(ctx);
        this._drawDoors(ctx);
    }

    // ════════════════════════════════════════════════════════
    // MESH INITIALIZATION
    // ════════════════════════════════════════════════════════

    _initMesh() {
        const w = this.vehicleWidth;
        const h = this.vehicleHeight;
        const halfW = w / 2;
        const halfH = h / 2;
        
        // Calculate grid dimensions based on subdivisions
        this._meshRows = Math.max(2, this.meshSubdivisions + 2);
        this._meshCols = Math.max(2, Math.ceil(this.meshSubdivisions * (w / h)) + 2);
        
        const totalPoints = this._meshRows * this._meshCols;
        
        // Pre-allocate performance optimization arrays
        this._cachedRigidity = new Float32Array(totalPoints);
        this._deformAmounts = new Float32Array(totalPoints);
        this._cachedAllPoints = new Array(totalPoints);
        
        // Create grid of points
        this._meshGrid = [];
        let pointIndex = 0;
        
        for (let row = 0; row < this._meshRows; row++) {
            this._meshGrid[row] = [];
            const v = row / (this._meshRows - 1);  // 0 to 1
            const y = -halfH + v * h;
            
            for (let col = 0; col < this._meshCols; col++) {
                const u = col / (this._meshCols - 1);  // 0 to 1
                const x = -halfW + u * w;
                
                const point = {
                    x: x,
                    y: y,
                    baseX: x,
                    baseY: y,
                    deformX: 0,
                    deformY: 0,
                    u: u,  // Texture coordinate
                    v: v,  // Texture coordinate
                    _index: pointIndex,  // Index for fast array lookup
                    _row: row,
                    _col: col
                };
                
                this._meshGrid[row][col] = point;
                this._cachedAllPoints[pointIndex] = point;
                
                // Pre-compute rigidity for this point
                const nx = 1 - Math.abs(x) / halfW; // 0 at edges, 1 at center
                const ny = 1 - Math.abs(y) / halfH;
                const centerness = nx * ny;
                const edgeRigidity = 1.0 / this.edgeSoftness;
                const centerRig = 1.0 / this.centerRigidity;
                const t = centerness * centerness;
                this._cachedRigidity[pointIndex] = edgeRigidity + (centerRig - edgeRigidity) * t;
                
                pointIndex++;
            }
        }
        
        // Cache perimeter points
        this._cachePerimeterPoints();
        
        // Build triangle list for rendering
        this._buildTriangles();
        
        this._meshInitialized = true;
        this._cachedBodyDirty = true;
    }
    
    _cachePerimeterPoints() {
        const points = [];
        
        // Top edge (left to right)
        for (let col = 0; col < this._meshCols; col++) {
            points.push(this._meshGrid[0][col]);
        }
        // Right edge (top to bottom, skip first)
        for (let row = 1; row < this._meshRows; row++) {
            points.push(this._meshGrid[row][this._meshCols - 1]);
        }
        // Bottom edge (right to left, skip first)
        for (let col = this._meshCols - 2; col >= 0; col--) {
            points.push(this._meshGrid[this._meshRows - 1][col]);
        }
        // Left edge (bottom to top, skip first and last)
        for (let row = this._meshRows - 2; row > 0; row--) {
            points.push(this._meshGrid[row][0]);
        }
        
        this._cachedPerimeterPoints = points;
    }
    
    _buildTriangles() {
        this._triangles = [];
        
        for (let row = 0; row < this._meshRows - 1; row++) {
            for (let col = 0; col < this._meshCols - 1; col++) {
                // Get four corners of this cell
                const tl = this._meshGrid[row][col];
                const tr = this._meshGrid[row][col + 1];
                const bl = this._meshGrid[row + 1][col];
                const br = this._meshGrid[row + 1][col + 1];
                
                // Two triangles per cell
                this._triangles.push({
                    p0: tl, p1: tr, p2: bl  // Top-left triangle
                });
                this._triangles.push({
                    p0: tr, p1: br, p2: bl  // Bottom-right triangle
                });
            }
        }
    }
    
    /**
     * Get all mesh points as a flat array (for damage calculation)
     * Uses cached array for performance
     */
    _getAllMeshPoints() {
        return this._cachedAllPoints || [];
    }
    
    /**
     * Get perimeter points only (for outline drawing)
     * Uses cached array for performance
     */
    _getPerimeterPoints() {
        return this._cachedPerimeterPoints || [];
    }

    // ════════════════════════════════════════════════════════
    // DOOR CANVAS INITIALIZATION
    // ════════════════════════════════════════════════════════

    _initDoorCanvas() {
        if (!this.doorEnabled) return;

        // Create door canvas for caching
        const w = Math.ceil(this.doorWidth + 4);
        const h = Math.ceil(this.doorHeight + 4);
        
        if (!this._doorCanvas || this._doorCanvas.width !== w || this._doorCanvas.height !== h) {
            this._doorCanvas = document.createElement('canvas');
            this._doorCanvas.width = w;
            this._doorCanvas.height = h;
            this._doorCtx = this._doorCanvas.getContext('2d');
            this._needsDoorRedraw = true;
        }

        if (this._needsDoorRedraw) {
            this._drawDoorToCache();
            this._needsDoorRedraw = false;
        }
    }

    _drawDoorToCache() {
        if (!this._doorCtx) return;
        const ctx = this._doorCtx;
        const w = this.doorWidth;
        const h = this.doorHeight;
        
        ctx.clearRect(0, 0, this._doorCanvas.width, this._doorCanvas.height);
        ctx.save();
        ctx.translate(2, 2); // Small padding

        // Check for door image
        const engine = this.gameObject._engine;
        if (this.doorImage && engine?.assets) {
            const fileName = this.doorImage.split('/').pop().split('\\').pop();
            const img = engine.assets.getImage(fileName);
            if (img) {
                ctx.drawImage(img, 0, 0, w, h);
                ctx.restore();
                return;
            }
        }

        // Generate gradient door
        if (this.useGeneratedDoor) {
            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            gradient.addColorStop(0, this.doorColor);
            gradient.addColorStop(1, this.doorColorEnd);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            
            // Door edge highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
            
            // Inner shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(w - 2, 0, 2, h);
        }

        ctx.restore();
    }

    // ════════════════════════════════════════════════════════
    // DOOR ANIMATION
    // ════════════════════════════════════════════════════════

    /**
     * Open a specific door
     * @param {'left'|'right'} side - Which door to open
     */
    openDoor(side = 'left') {
        if (!this.doorEnabled) return;
        
        if (side === 'left' && this._leftDoorState === 'closed') {
            this._leftDoorState = 'opening';
            this._leftDoorTimer = 0;
        } else if (side === 'right' && this._rightDoorState === 'closed') {
            this._rightDoorState = 'opening';
            this._rightDoorTimer = 0;
        }
    }

    /**
     * Close a specific door
     * @param {'left'|'right'} side - Which door to close
     */
    closeDoor(side = 'left') {
        if (!this.doorEnabled) return;
        
        if (side === 'left' && (this._leftDoorState === 'open' || this._leftDoorState === 'opening')) {
            this._leftDoorState = 'closing';
            this._leftDoorTimer = 0;
        } else if (side === 'right' && (this._rightDoorState === 'open' || this._rightDoorState === 'opening')) {
            this._rightDoorState = 'closing';
            this._rightDoorTimer = 0;
        }
    }

    /**
     * Play full door animation (open -> hold -> close)
     * @param {'left'|'right'} side - Which door
     */
    playDoorAnimation(side = 'left') {
        this.openDoor(side);
        // The animation state machine will handle the rest
    }

    _updateDoorAnimation(dt) {
        if (!this.doorEnabled) return;

        // Left door
        this._leftDoorTimer += dt;
        switch (this._leftDoorState) {
            case 'opening':
                this._leftDoorAngle = Math.min(this.doorOpenAngle, 
                    (this._leftDoorTimer / this.doorOpenTime) * this.doorOpenAngle);
                if (this._leftDoorTimer >= this.doorOpenTime) {
                    this._leftDoorState = 'open';
                    this._leftDoorTimer = 0;
                    this._leftDoorAngle = this.doorOpenAngle;
                }
                break;
            case 'open':
                if (this._leftDoorTimer >= this.doorHoldTime) {
                    this._leftDoorState = 'closing';
                    this._leftDoorTimer = 0;
                }
                break;
            case 'closing':
                this._leftDoorAngle = Math.max(0, 
                    this.doorOpenAngle - (this._leftDoorTimer / this.doorCloseTime) * this.doorOpenAngle);
                if (this._leftDoorTimer >= this.doorCloseTime) {
                    this._leftDoorState = 'closed';
                    this._leftDoorAngle = 0;
                }
                break;
        }

        // Right door (identical logic)
        this._rightDoorTimer += dt;
        switch (this._rightDoorState) {
            case 'opening':
                this._rightDoorAngle = Math.min(this.doorOpenAngle, 
                    (this._rightDoorTimer / this.doorOpenTime) * this.doorOpenAngle);
                if (this._rightDoorTimer >= this.doorOpenTime) {
                    this._rightDoorState = 'open';
                    this._rightDoorTimer = 0;
                    this._rightDoorAngle = this.doorOpenAngle;
                }
                break;
            case 'open':
                if (this._rightDoorTimer >= this.doorHoldTime) {
                    this._rightDoorState = 'closing';
                    this._rightDoorTimer = 0;
                }
                break;
            case 'closing':
                this._rightDoorAngle = Math.max(0, 
                    this.doorOpenAngle - (this._rightDoorTimer / this.doorCloseTime) * this.doorOpenAngle);
                if (this._rightDoorTimer >= this.doorCloseTime) {
                    this._rightDoorState = 'closed';
                    this._rightDoorAngle = 0;
                }
                break;
        }
    }

    // ════════════════════════════════════════════════════════
    // COLLISION DAMAGE (Rigidbody Callback-Based)
    // ════════════════════════════════════════════════════════

    /**
     * Handle collision damage using data from Rigidbody's collision detection.
     * This replaces the old _checkCollisionDamage and _checkIncomingVehicleDamage
     * methods that did their own collision loops.
     * 
     * @param {Object} otherObject - The other game object we collided with
     * @param {Object} collisionData - Rich collision data from Rigidbody including:
     *   - myVelocity, otherVelocity, relativeVelocity
     *   - mySpeed, otherSpeed, relativeSpeed, closingSpeed
     *   - impactEnergy, contactPoint, normal
     *   - myMass, otherMass
     */
    _handleRigidbodyCollision(otherObject, collisionData) {
        if (!this.damageEnabled || !this.gameObject) return;
        if (!collisionData) return;
        
        const { 
            mySpeed = 0, 
            otherSpeed = 0, 
            relativeSpeed = 0,
            closingSpeed = 0,
            impactEnergy = 0, 
            contactPoint, 
            normal,
            myVelocity,
            otherVelocity,
            relativeVelocity
        } = collisionData;
        
        // Need at least minimal impact to cause damage
        const minSpeed = 5;
        if (mySpeed < minSpeed && otherSpeed < minSpeed && relativeSpeed < minSpeed) return;
        
        // Check if impact energy meets threshold
        const impactThreshold = this.damageThreshold;
        
        // Check various impact conditions (consistent with old methods)
        const highSpeedSelfHit = impactEnergy >= impactThreshold && mySpeed >= impactThreshold * 0.2;
        const highSpeedOtherHit = impactEnergy >= impactThreshold && otherSpeed >= impactThreshold * 0.2;
        const relativeHit = closingSpeed >= impactThreshold * 0.3 && impactEnergy >= impactThreshold * 0.5;
        
        if (!highSpeedSelfHit && !highSpeedOtherHit && !relativeHit) return;
        
        // Debounce per-object
        if (!this._lastCollisionDamage) this._lastCollisionDamage = {};
        const objId = otherObject.id || otherObject.name || 'unknown';
        const now = Date.now();
        const debounceTime = 200;
        if (this._lastCollisionDamage[objId] && now - this._lastCollisionDamage[objId] < debounceTime) return;
        this._lastCollisionDamage[objId] = now;
        
        // Calculate local-space contact point
        const myPos = this.gameObject.position;
        const worldAngle = this.gameObject.angle * (Math.PI / 180);
        const halfW = this.vehicleWidth / 2;
        const halfH = this.vehicleHeight / 2;
        
        let localX, localY;
        
        if (contactPoint) {
            // Transform world contact point to local space
            const cos = Math.cos(-worldAngle);
            const sin = Math.sin(-worldAngle);
            const relX = contactPoint.x - myPos.x;
            const relY = contactPoint.y - myPos.y;
            localX = relX * cos - relY * sin;
            localY = relX * sin + relY * cos;
            // Clamp to vehicle bounds
            localX = Math.max(-halfW, Math.min(halfW, localX));
            localY = Math.max(-halfH, Math.min(halfH, localY));
        } else {
            // Fallback: Calculate from direction to other object
            const dx = otherObject.position.x - myPos.x;
            const dy = otherObject.position.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const dirToOtherX = dx / dist;
            const dirToOtherY = dy / dist;
            
            const cos = Math.cos(-worldAngle);
            const sin = Math.sin(-worldAngle);
            const localDirX = dirToOtherX * cos - dirToOtherY * sin;
            const localDirY = dirToOtherX * sin + dirToOtherY * cos;
            
            if (Math.abs(localDirX) > Math.abs(localDirY)) {
                localX = Math.sign(localDirX) * halfW * 0.95;
                localY = localDirY / Math.abs(localDirX) * halfW * 0.95;
                localY = Math.max(-halfH * 0.95, Math.min(halfH * 0.95, localY));
            } else {
                localY = Math.sign(localDirY) * halfH * 0.95;
                localX = localDirX / Math.abs(localDirY) * halfH * 0.95;
                localX = Math.max(-halfW * 0.95, Math.min(halfW * 0.95, localX));
            }
        }
        
        // Calculate damage based on impact energy
        const impactForce = Math.min(impactEnergy, this.damageThreshold + this.bodyStrength * 3);
        
        // Calculate local-space impact direction
        // Key insight: the direction should always point INTO this vehicle's body at the impact point
        // - When WE are hitting something (mySpeed dominant): use myVelocity (we're crashing forward into obstacle)
        // - When WE are being hit (otherSpeed dominant): use otherVelocity (they're crashing into us)
        // - Using relativeVelocity alone can give wrong sign when being hit while stationary
        let localImpDirX = 0, localImpDirY = -1;
        const cosL = Math.cos(-worldAngle);
        const sinL = Math.sin(-worldAngle);
        
        if (otherSpeed > mySpeed * 1.5 && otherVelocity && otherSpeed > 5) {
            // We're being crashed INTO - use other's velocity (direction they're pushing into us)
            localImpDirX = (otherVelocity.x / otherSpeed) * cosL - (otherVelocity.y / otherSpeed) * sinL;
            localImpDirY = (otherVelocity.x / otherSpeed) * sinL + (otherVelocity.y / otherSpeed) * cosL;
        } else if (myVelocity && mySpeed > 5) {
            // We're doing the crashing - use our velocity (direction we're pushing into obstacle)
            localImpDirX = (myVelocity.x / mySpeed) * cosL - (myVelocity.y / mySpeed) * sinL;
            localImpDirY = (myVelocity.x / mySpeed) * sinL + (myVelocity.y / mySpeed) * cosL;
        } else if (relativeVelocity && relativeSpeed > 1) {
            // Fallback for equal-ish speeds: use relative velocity but ensure it points toward vehicle center
            // If relative velocity points away from contact point (wrong direction), flip it
            const rawDirX = (relativeVelocity.x / relativeSpeed) * cosL - (relativeVelocity.y / relativeSpeed) * sinL;
            const rawDirY = (relativeVelocity.x / relativeSpeed) * sinL + (relativeVelocity.y / relativeSpeed) * cosL;
            
            // Check if direction points generally toward center (correct) or away (wrong)
            // Dot product of impact dir with vector from contact point to center
            const toCenterX = -localX;
            const toCenterY = -localY;
            const dot = rawDirX * toCenterX + rawDirY * toCenterY;
            
            if (dot >= 0) {
                // Direction roughly points inward - use as is
                localImpDirX = rawDirX;
                localImpDirY = rawDirY;
            } else {
                // Direction points outward - flip it
                localImpDirX = -rawDirX;
                localImpDirY = -rawDirY;
            }
        }
        
        this._applyDamageAtPoint(localX, localY, impactForce, { x: localX, y: localY }, localImpDirX, localImpDirY);
        
        // Emit sparks directed away from impact (throttled to prevent particle spam)
        const sparkNow = performance.now();
        if (this.sparkOnHit && typeof particleBurst === 'function' && 
            (!this._lastSparkTime || sparkNow - this._lastSparkTime > 100)) {
            this._lastSparkTime = sparkNow;
            const worldPos = this.gameObject.getWorldPosition();
            const cosW = Math.cos(worldAngle);
            const sinW = Math.sin(worldAngle);
            const worldX = worldPos.x + localX * cosW - localY * sinW;
            const worldY = worldPos.y + localX * sinW + localY * cosW;
            
            // Spark direction based on impact direction
            let sparkAngle = 0;
            if (relativeVelocity) {
                sparkAngle = Math.atan2(-relativeVelocity.y, -relativeVelocity.x) * (180 / Math.PI);
            } else if (myVelocity) {
                sparkAngle = Math.atan2(-myVelocity.y, -myVelocity.x) * (180 / Math.PI);
            }
            
            // Cap spark count to prevent excessive particles
            const actualSparkCount = this.sparkCount > 6 ? 6 : this.sparkCount;
            particleBurst(worldX, worldY, {
                count: actualSparkCount,
                color: this.sparkColor,
                colorEnd: '#ffff00',
                size: 3,
                sizeEnd: 1,
                speed: 100,
                speedVariation: 50,
                angle: sparkAngle,
                spread: 90,
                gravity: 200,
                life: 0.25,
                fadeOut: true
            });
        }
    }

    // ════════════════════════════════════════════════════════
    // LEGACY COLLISION DAMAGE (kept for backwards compatibility)
    // These methods are no longer called from loop() but may be
    // useful for manual collision detection scenarios
    // ════════════════════════════════════════════════════════

    _checkCollisionDamage(dt) {
        if (!this.damageEnabled || !this._vehicleController || !this.gameObject) return;

        const engine = window.gameEngine;
        if (!engine) return;

        // Get our collider
        const myCollider = this.gameObject.getModule('PolygonCollider') || 
                          this.gameObject.getModule('BoxCollider');
        if (!myCollider) return;

        const myPos = this.gameObject.position;
        const worldAngle = this.gameObject.angle * (Math.PI / 180);

        // Get velocity from VehicleController
        const velX = this._vehicleController._velX || 0;
        const velY = this._vehicleController._velY || 0;
        const mySpeed = Math.sqrt(velX * velX + velY * velY);

        // Need at least minimal movement to check for collisions
        if (mySpeed < 5) return;

        for (const obj of engine.instances) {
            if (obj === this.gameObject) continue;

            // Get other object's collider
            const otherCollider = obj.getModule('BoxCollider') || 
                                 obj.getModule('SphereCollider') ||
                                 obj.getModule('PolygonCollider');
            if (!otherCollider) continue;
            if (otherCollider === myCollider) continue;

            // Quick distance check
            const dx = obj.position.x - myPos.x;
            const dy = obj.position.y - myPos.y;
            const distSq = dx * dx + dy * dy;
            const maxRange = Math.max(this.vehicleWidth, this.vehicleHeight) * 2;
            if (distSq > maxRange * maxRange) continue;

            // Check if actually colliding
            if (!myCollider.overlaps(otherCollider)) continue;

            // Get other object's velocity for relative speed calculation
            const otherVC = obj.getModule ? obj.getModule('VehicleController') : null;
            const otherRb = obj.getModule ? obj.getModule('Rigidbody') : null;
            let ovx = 0, ovy = 0;
            if (otherVC) {
                ovx = otherVC._velX || 0;
                ovy = otherVC._velY || 0;
            } else if (otherRb) {
                ovx = otherRb.velocityX || 0;
                ovy = otherRb.velocityY || 0;
            }

            // Direction to other object
            const dist = Math.sqrt(distSq) || 1;
            const dirToOtherX = dx / dist;
            const dirToOtherY = dy / dist;

            // Relative velocity (how fast we're approaching each other)
            const relVx = velX - ovx;
            const relVy = velY - ovy;
            const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

            // Our absolute velocity toward the target
            const velDot = velX * dirToOtherX + velY * dirToOtherY;
            // Relative closing velocity toward the target
            const relVelDot = relVx * dirToOtherX + relVy * dirToOtherY;

            // Calculate impact energy based on mass and velocity for consistent damage
            // Use the kinetic energy formula: KE = 0.5 * m * v^2, but simplified
            const myRb = this.gameObject.getModule('Rigidbody');
            const myMass = myRb ? (myRb.mass || 10) : 10;
            const otherMass = otherRb ? (otherRb.mass || 10) : 10;
            
            // Combined impact energy considers both velocities and masses
            const myImpactEnergy = mySpeed * Math.sqrt(myMass / 10);
            const relImpactEnergy = relSpeed * Math.sqrt((myMass + otherMass) / 20);
            const effectiveImpactEnergy = Math.max(myImpactEnergy, relImpactEnergy);

            // Accept collision damage if impact energy exceeds threshold
            // Use consistent threshold check for both methods
            const impactThreshold = this.damageThreshold;
            const highSpeedHit = effectiveImpactEnergy >= impactThreshold && velDot >= impactThreshold * 0.2;
            const relativeHit = relVelDot >= impactThreshold * 0.3 && relImpactEnergy >= impactThreshold * 0.5;

            if (!highSpeedHit && !relativeHit) continue;

            if (!highSpeedHit && !relativeHit) continue;

            // Debounce per-object (consistent 200ms cooldown for all collision types)
            if (!this._lastCollisionDamage) this._lastCollisionDamage = {};
            const objId = obj.id || obj.name || 'unknown';
            const now = Date.now();
            const debounceTime = 200; // Consistent debounce time
            if (this._lastCollisionDamage[objId] && now - this._lastCollisionDamage[objId] < debounceTime) continue;
            this._lastCollisionDamage[objId] = now;

            // Get collision info with contact point
            const collisionInfo = this._getCollisionInfoBetween(myCollider, otherCollider);

            // Use actual collision point if available, otherwise calculate from direction
            let localX, localY;
            const halfW = this.vehicleWidth / 2;
            const halfH = this.vehicleHeight / 2;

            if (collisionInfo && collisionInfo.point) {
                // Transform world contact point to local space
                const cos = Math.cos(-worldAngle);
                const sin = Math.sin(-worldAngle);
                const relX = collisionInfo.point.x - myPos.x;
                const relY = collisionInfo.point.y - myPos.y;
                localX = relX * cos - relY * sin;
                localY = relX * sin + relY * cos;
                // Clamp to vehicle bounds
                localX = Math.max(-halfW, Math.min(halfW, localX));
                localY = Math.max(-halfH, Math.min(halfH, localY));
            } else {
                // Fallback: Calculate from direction
                const cos = Math.cos(-worldAngle);
                const sin = Math.sin(-worldAngle);
                const localDirX = dirToOtherX * cos - dirToOtherY * sin;
                const localDirY = dirToOtherX * sin + dirToOtherY * cos;

                if (Math.abs(localDirX) > Math.abs(localDirY)) {
                    localX = Math.sign(localDirX) * halfW * 0.95;
                    localY = localDirY / Math.abs(localDirX) * halfW * 0.95;
                    localY = Math.max(-halfH * 0.95, Math.min(halfH * 0.95, localY));
                } else {
                    localY = Math.sign(localDirY) * halfH * 0.95;
                    localX = localDirX / Math.abs(localDirY) * halfH * 0.95;
                    localX = Math.max(-halfW * 0.95, Math.min(halfW * 0.95, localX));
                }
            }

            // Calculate damage based on effective impact energy
            const rawForce = effectiveImpactEnergy;
            const impactForce = Math.min(rawForce, this.damageThreshold + this.bodyStrength * 3);

            // Calculate local-space impact direction from relative velocity
            // Use relative velocity for more accurate impact direction during pushing
            const impDirSpeed = relSpeed > 1 ? relSpeed : mySpeed;
            const impDirVx = relSpeed > 1 ? relVx : velX;
            const impDirVy = relSpeed > 1 ? relVy : velY;
            const cosL = Math.cos(-worldAngle);
            const sinL = Math.sin(-worldAngle);
            const localImpDirX = (impDirVx / impDirSpeed) * cosL - (impDirVy / impDirSpeed) * sinL;
            const localImpDirY = (impDirVx / impDirSpeed) * sinL + (impDirVy / impDirSpeed) * cosL;

            this._applyDamageAtPoint(localX, localY, impactForce, { x: localX, y: localY }, localImpDirX, localImpDirY);

            // Emit sparks directed away from impact (throttled)
            const sparkNow = performance.now();
            if (this.sparkOnHit && typeof particleBurst === 'function' &&
                (!this._lastSparkTime || sparkNow - this._lastSparkTime > 100)) {
                this._lastSparkTime = sparkNow;
                const worldPos = this.gameObject.getWorldPosition();
                const cosW = Math.cos(worldAngle);
                const sinW = Math.sin(worldAngle);
                const worldX = worldPos.x + localX * cosW - localY * sinW;
                const worldY = worldPos.y + localX * sinW + localY * cosW;
                const sparkAngle = Math.atan2(-velY, -velX) * (180 / Math.PI);

                const actualSparkCount = this.sparkCount > 6 ? 6 : this.sparkCount;
                particleBurst(worldX, worldY, {
                    count: actualSparkCount,
                    color: this.sparkColor,
                    colorEnd: '#ffff00',
                    size: 3,
                    sizeEnd: 1,
                    speed: 100,
                    speedVariation: 50,
                    angle: sparkAngle,
                    spread: 90,
                    gravity: 200,
                    life: 0.25,
                    fadeOut: true
                });
            }
        }
    }

    /**
     * Get collision info between two colliders, including contact point
     * Returns {normal, depth, point} or null
     */
    _getCollisionInfoBetween(myCollider, otherCollider) {
        const isBox = (c) => c && c.constructor && c.constructor.name === 'BoxCollider';
        const isSphere = (c) => c && c.constructor && c.constructor.name === 'SphereCollider';
        const isPoly = (c) => c && c.constructor && c.constructor.name === 'PolygonCollider';
        
        // Helper: check if a point is inside a convex polygon
        const pointInConvexPoly = (px, py, points) => {
            let sign = 0;
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                const cross = (p2.x - p1.x) * (py - p1.y) - (p2.y - p1.y) * (px - p1.x);
                if (cross === 0) continue;
                if (sign === 0) sign = cross > 0 ? 1 : -1;
                else if ((cross > 0 ? 1 : -1) !== sign) return false;
            }
            return true;
        };
        
        // Helper: check if a point is inside a box (using AABB)
        const pointInAABB = (px, py, bounds) => {
            return px >= bounds.left && px <= bounds.right && py >= bounds.top && py <= bounds.bottom;
        };
        
        // Box vs Box - find WHICH corner of our box hit them
        if (isBox(myCollider) && isBox(otherCollider)) {
            const b1 = myCollider.getBounds();
            const b2 = otherCollider.getBounds();
            const overlapX = Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left);
            const overlapY = Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top);
            if (overlapX <= 0 || overlapY <= 0) return null;
            
            let normal, depth;
            if (overlapX < overlapY) {
                depth = overlapX;
                normal = { x: b1.centerX < b2.centerX ? -1 : 1, y: 0 };
            } else {
                depth = overlapY;
                normal = { x: 0, y: b1.centerY < b2.centerY ? -1 : 1 };
            }
            
            // Find our box corner that is deepest inside their box
            let myPoints;
            if (myCollider.getWorldPoints) {
                myPoints = myCollider.getWorldPoints();
            } else {
                myPoints = [
                    { x: b1.left, y: b1.top }, { x: b1.right, y: b1.top },
                    { x: b1.right, y: b1.bottom }, { x: b1.left, y: b1.bottom }
                ];
            }
            
            let contactPoint = null;
            let bestScore = -Infinity;
            for (const p of myPoints) {
                // Score by: 1) inside their box, 2) depth of penetration along normal
                const inside = pointInAABB(p.x, p.y, b2);
                const penetration = -(p.x * normal.x + p.y * normal.y);
                const score = (inside ? 1000 : 0) + penetration;
                if (score > bestScore) {
                    bestScore = score;
                    contactPoint = { x: p.x, y: p.y };
                }
            }
            
            return { normal, depth, point: contactPoint };
        }
        
        // Polygon vs Box
        if (isPoly(myCollider) && isBox(otherCollider)) {
            const polyPoints = myCollider.getWorldPoints();
            const polyAxes = myCollider.getAxes();
            let boxPoints, boxAxes;
            if (otherCollider.getWorldPoints && otherCollider.getAxes) {
                boxPoints = otherCollider.getWorldPoints();
                boxAxes = otherCollider.getAxes();
            } else {
                const b = otherCollider.getBounds();
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
                const proj1 = myCollider.projectOntoAxis(axis);
                let pMin = Infinity, pMax = -Infinity;
                for (const p of boxPoints) {
                    const proj = p.x * axis.x + p.y * axis.y;
                    pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
                }
                const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
                if (overlap <= 0) return null;
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    // Normal points toward us (polygon, away from box)
                    const dirX = boxCx - polyCx, dirY = boxCy - polyCy;
                    const dot = dirX * axis.x + dirY * axis.y;
                    minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
                }
            }
            // Find the actual contact point for damage
            // Check BOTH directions: our poly vertices in their box, AND their box vertices in our poly
            // This handles both "polygon corner hits box edge" and "polygon edge hits box corner" cases
            let contactPoint = null;
            let bestInsideScore = -Infinity;
            let insidePoint = null;
            
            // Check our polygon vertices inside their box
            for (const pp of polyPoints) {
                if (pointInConvexPoly(pp.x, pp.y, boxPoints)) {
                    // Score: projection toward box (in -normal direction) = deeper penetration
                    const score = -(pp.x * minAxis.x + pp.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: pp.x, y: pp.y };
                    }
                }
            }
            
            // Also check their box vertices inside our polygon (for edge-on-corner collisions)
            for (const bp of boxPoints) {
                if (pointInConvexPoly(bp.x, bp.y, polyPoints)) {
                    // Score: projection toward box (in -normal direction)
                    // For box vertex in poly, this still represents penetration depth
                    const score = -(bp.x * minAxis.x + bp.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: bp.x, y: bp.y };
                    }
                }
            }
            
            // Fallback: if no vertex is inside either shape, use projection-based nearest point
            if (!insidePoint) {
                let bestOutsideScore = -Infinity;
                for (const pp of polyPoints) {
                    const score = -(pp.x * minAxis.x + pp.y * minAxis.y);
                    if (score > bestOutsideScore) {
                        bestOutsideScore = score;
                        insidePoint = { x: pp.x, y: pp.y };
                    }
                }
            }
            
            contactPoint = insidePoint;
            return { normal: minAxis, depth: minOverlap, point: contactPoint };
        }
        
        // Polygon vs Polygon
        if (isPoly(myCollider) && isPoly(otherCollider)) {
            const points1 = myCollider.getWorldPoints();
            const points2 = otherCollider.getWorldPoints();
            const allAxes = [...myCollider.getAxes(), ...otherCollider.getAxes()];
            let minOverlap = Infinity, minAxis = null;
            let c1x = 0, c1y = 0;
            for (const p of points1) { c1x += p.x; c1y += p.y; }
            c1x /= points1.length; c1y /= points1.length;
            let c2x = 0, c2y = 0;
            for (const p of points2) { c2x += p.x; c2y += p.y; }
            c2x /= points2.length; c2y /= points2.length;
            for (const axis of allAxes) {
                const proj1 = myCollider.projectOntoAxis(axis);
                const proj2 = otherCollider.projectOntoAxis(axis);
                const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
                if (overlap <= 0) return null;
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    const dirX = c2x - c1x, dirY = c2y - c1y;
                    const dot = dirX * axis.x + dirY * axis.y;
                    minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
                }
            }
            // Find the actual contact point for damage
            // Check BOTH directions: our vertices in theirs, AND their vertices in ours
            let contactPoint = null;
            let bestInsideScore = -Infinity;
            let insidePoint = null;
            
            // Check our vertices inside their polygon
            for (const p of points1) {
                if (pointInConvexPoly(p.x, p.y, points2)) {
                    const score = -(p.x * minAxis.x + p.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: p.x, y: p.y };
                    }
                }
            }
            
            // Also check their vertices inside our polygon
            for (const p of points2) {
                if (pointInConvexPoly(p.x, p.y, points1)) {
                    const score = -(p.x * minAxis.x + p.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: p.x, y: p.y };
                    }
                }
            }
            
            // Fallback: if no vertex is inside either shape, use projection-based nearest point
            if (!insidePoint) {
                let bestOutsideScore = -Infinity;
                for (const p of points1) {
                    const score = -(p.x * minAxis.x + p.y * minAxis.y);
                    if (score > bestOutsideScore) {
                        bestOutsideScore = score;
                        insidePoint = { x: p.x, y: p.y };
                    }
                }
            }
            
            contactPoint = insidePoint;
            return { normal: minAxis, depth: minOverlap, point: contactPoint };
        }
        
        // Box vs Polygon - calculate directly to get OUR box's penetrating point
        if (isBox(myCollider) && isPoly(otherCollider)) {
            const polyPoints = otherCollider.getWorldPoints();
            const polyAxes = otherCollider.getAxes();
            let boxPoints, boxAxes;
            if (myCollider.getWorldPoints && myCollider.getAxes) {
                boxPoints = myCollider.getWorldPoints();
                boxAxes = myCollider.getAxes();
            } else {
                const b = myCollider.getBounds();
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
                const proj1 = otherCollider.projectOntoAxis(axis);
                let pMin = Infinity, pMax = -Infinity;
                for (const p of boxPoints) {
                    const proj = p.x * axis.x + p.y * axis.y;
                    pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
                }
                const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
                if (overlap <= 0) return null;
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    // Normal points toward our box (away from polygon)
                    const dirX = polyCx - boxCx, dirY = polyCy - boxCy;
                    const dot = dirX * axis.x + dirY * axis.y;
                    minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
                }
            }
            // Find the actual contact point for damage
            // Check BOTH directions: our box vertices in their poly, AND their poly vertices in our box
            let contactPoint = null;
            let bestInsideScore = -Infinity;
            let insidePoint = null;
            
            // Check our box vertices inside their polygon
            for (const bp of boxPoints) {
                if (pointInConvexPoly(bp.x, bp.y, polyPoints)) {
                    const score = -(bp.x * minAxis.x + bp.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: bp.x, y: bp.y };
                    }
                }
            }
            
            // Also check their polygon vertices inside our box
            for (const pp of polyPoints) {
                if (pointInConvexPoly(pp.x, pp.y, boxPoints)) {
                    const score = -(pp.x * minAxis.x + pp.y * minAxis.y);
                    if (score > bestInsideScore) {
                        bestInsideScore = score;
                        insidePoint = { x: pp.x, y: pp.y };
                    }
                }
            }
            
            // Fallback: if no vertex is inside either shape, use projection-based nearest point
            if (!insidePoint) {
                let bestOutsideScore = -Infinity;
                for (const bp of boxPoints) {
                    const score = -(bp.x * minAxis.x + bp.y * minAxis.y);
                    if (score > bestOutsideScore) {
                        bestOutsideScore = score;
                        insidePoint = { x: bp.x, y: bp.y };
                    }
                }
            }
            
            contactPoint = insidePoint;
            return { normal: minAxis, depth: minOverlap, point: contactPoint };
        }
        
        // Sphere vs Polygon
        if (isSphere(myCollider) && isPoly(otherCollider)) {
            if (myCollider.getPolygonCollisionInfo) {
                return myCollider.getPolygonCollisionInfo(otherCollider);
            }
        }
        
        return null;
    }

    /**
     * Check for other vehicles/rigidbodies colliding INTO us at high speed
     * This causes damage even if we're stationary
     */
    _checkIncomingVehicleDamage(dt) {
        if (!this.damageEnabled || !this.gameObject) return;
        
        const engine = window.gameEngine;
        if (!engine) return;
        
        // Get our collider
        const myCollider = this.gameObject.getModule('PolygonCollider') || 
                          this.gameObject.getModule('BoxCollider');
        if (!myCollider) return;
        
        const myPos = this.gameObject.position;
        const worldAngle = this.gameObject.angle * (Math.PI / 180);
        
        // Get our velocity for relative speed calculation
        const myRb = this.gameObject.getModule('Rigidbody');
        let myVx = 0, myVy = 0;
        if (this._vehicleController) {
            myVx = this._vehicleController._velX || 0;
            myVy = this._vehicleController._velY || 0;
        } else if (myRb) {
            myVx = myRb.velocityX || 0;
            myVy = myRb.velocityY || 0;
        }
        
        for (const obj of engine.instances) {
            if (obj === this.gameObject) continue;
            
            // Check if the other object has a rigidbody with velocity
            const otherRb = obj.getModule ? obj.getModule('Rigidbody') : null;
            if (!otherRb) continue;
            
            // Get other's velocity — prefer VehicleController if present
            const otherVC = obj.getModule ? obj.getModule('VehicleController') : null;
            let ovx, ovy;
            if (otherVC) {
                ovx = otherVC._velX || 0;
                ovy = otherVC._velY || 0;
            } else {
                ovx = otherRb.velocityX || 0;
                ovy = otherRb.velocityY || 0;
            }
            const otherSpeed = Math.sqrt(ovx * ovx + ovy * ovy);
            
            // Relative velocity between us and the other object
            const relVx = ovx - myVx;
            const relVy = ovy - myVy;
            const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
            
            // Need at least minimal other speed or relative closing speed
            if (otherSpeed < 5 && relSpeed < 5) continue;
            
            // Get other object's collider (skip our own - can't damage ourselves)
            const otherCollider = obj.getModule('BoxCollider') || 
                                 obj.getModule('SphereCollider') ||
                                 obj.getModule('PolygonCollider');
            if (!otherCollider) continue;
            if (otherCollider === myCollider) continue;
            
            // Quick distance check
            const dx = myPos.x - obj.position.x;
            const dy = myPos.y - obj.position.y;
            const distSq = dx * dx + dy * dy;
            const maxRange = Math.max(this.vehicleWidth, this.vehicleHeight) * 2;
            if (distSq > maxRange * maxRange) continue;
            
            // Check if actually colliding and get collision info with contact point
            if (!myCollider.overlaps(otherCollider)) continue;
            
            // Get collision info which includes the contact point
            const collisionInfo = this._getCollisionInfoBetween(myCollider, otherCollider);
            
            // Check if other is moving toward us (absolute or relative)
            const dist = Math.sqrt(distSq) || 1;
            const dirToUsX = dx / dist;
            const dirToUsY = dy / dist;
            const velDot = ovx * dirToUsX + ovy * dirToUsY;
            const relVelDot = relVx * dirToUsX + relVy * dirToUsY;
            
            // Calculate impact energy based on mass and velocity for consistent damage
            const myMass = myRb ? (myRb.mass || 10) : 10;
            const otherMass = otherRb.mass || 10;
            
            // Combined impact energy considers both velocities and masses
            const otherImpactEnergy = otherSpeed * Math.sqrt(otherMass / 10);
            const relImpactEnergy = relSpeed * Math.sqrt((myMass + otherMass) / 20);
            const effectiveImpactEnergy = Math.max(otherImpactEnergy, relImpactEnergy);
            
            // Accept collision damage if impact energy exceeds threshold
            // Use consistent threshold check with outgoing damage detection
            const impactThreshold = this.damageThreshold;
            const highSpeedHit = effectiveImpactEnergy >= impactThreshold && velDot >= impactThreshold * 0.2;
            const relativeHit = relVelDot >= impactThreshold * 0.3 && relImpactEnergy >= impactThreshold * 0.5;
            
            if (!highSpeedHit && !relativeHit) continue;
            
            // Debounce per-object (consistent 200ms cooldown)
            if (!this._lastIncomingCollision) this._lastIncomingCollision = {};
            const objId = obj.id || obj.name || 'unknown';
            const now = Date.now();
            const debounceTime = 200; // Consistent debounce time
            if (this._lastIncomingCollision[objId] && now - this._lastIncomingCollision[objId] < debounceTime) continue;
            this._lastIncomingCollision[objId] = now;
            
            // Use actual collision point if available, otherwise calculate from direction
            let localX, localY;
            const halfW = this.vehicleWidth / 2;
            const halfH = this.vehicleHeight / 2;
            
            if (collisionInfo && collisionInfo.point) {
                // Transform world contact point to local space
                const cos = Math.cos(-worldAngle);
                const sin = Math.sin(-worldAngle);
                const relX = collisionInfo.point.x - myPos.x;
                const relY = collisionInfo.point.y - myPos.y;
                localX = relX * cos - relY * sin;
                localY = relX * sin + relY * cos;
                // Clamp to vehicle bounds
                localX = Math.max(-halfW, Math.min(halfW, localX));
                localY = Math.max(-halfH, Math.min(halfH, localY));
            } else {
                // Fallback: Calculate from direction
                const cos = Math.cos(-worldAngle);
                const sin = Math.sin(-worldAngle);
                const localDirX = -dirToUsX * cos - (-dirToUsY) * sin;
                const localDirY = -dirToUsX * sin + (-dirToUsY) * cos;
                
                if (Math.abs(localDirX) > Math.abs(localDirY)) {
                    localX = Math.sign(localDirX) * halfW * 0.95;
                    localY = localDirY / Math.abs(localDirX) * halfW * 0.95;
                    localY = Math.max(-halfH * 0.95, Math.min(halfH * 0.95, localY));
                } else {
                    localY = Math.sign(localDirY) * halfH * 0.95;
                    localX = localDirX / Math.abs(localDirY) * halfH * 0.95;
                    localX = Math.max(-halfW * 0.95, Math.min(halfW * 0.95, localX));
                }
            }
            
            // Calculate damage based on effective impact energy
            const rawForce = effectiveImpactEnergy;
            const impactForce = Math.min(rawForce, this.damageThreshold + this.bodyStrength * 3);
            
            // Calculate local-space impact direction from relative velocity
            const impDirSpeed = relSpeed > 1 ? relSpeed : otherSpeed;
            const impDirVx = relSpeed > 1 ? relVx : ovx;
            const impDirVy = relSpeed > 1 ? relVy : ovy;
            const cosL = Math.cos(-worldAngle);
            const sinL = Math.sin(-worldAngle);
            const localImpDirX = impDirSpeed > 0.1 ? (impDirVx / impDirSpeed) * cosL - (impDirVy / impDirSpeed) * sinL : 0;
            const localImpDirY = impDirSpeed > 0.1 ? (impDirVx / impDirSpeed) * sinL + (impDirVy / impDirSpeed) * cosL : 0;

            this._applyDamageAtPoint(localX, localY, impactForce, { x: localX, y: localY }, localImpDirX, localImpDirY);
            
            // Emit sparks directed away from impact (throttled)
            const sparkNow = performance.now();
            if (this.sparkOnHit && typeof particleBurst === 'function' &&
                (!this._lastSparkTime || sparkNow - this._lastSparkTime > 100)) {
                this._lastSparkTime = sparkNow;
                const worldPos = this.gameObject.getWorldPosition();
                const cosW = Math.cos(worldAngle);
                const sinW = Math.sin(worldAngle);
                const worldX = worldPos.x + localX * cosW - localY * sinW;
                const worldY = worldPos.y + localX * sinW + localY * cosW;
                const sparkAngle = Math.atan2(-ovy, -ovx) * (180 / Math.PI);
                
                const actualSparkCount = this.sparkCount > 6 ? 6 : this.sparkCount;
                particleBurst(worldX, worldY, {
                    count: actualSparkCount,
                    color: this.sparkColor,
                    colorEnd: '#ffff00',
                    size: 3,
                    sizeEnd: 1,
                    speed: 100,
                    speedVariation: 50,
                    angle: sparkAngle,
                    spread: 90,
                    gravity: 200,
                    life: 0.25,
                    fadeOut: true
                });
            }
        }
    }

    _applyDamageAtPoint(localX, localY, speed, collisionPoint = null, impactDirX = 0, impactDirY = 0) {
        if (!this._meshInitialized) this._initMesh();

        // Check damage cooldown - prevent rapid re-damage
        const now = performance.now() * 0.001; // Use performance.now for consistency
        if (this.damageCooldown > 0 && (now - this._lastCollisionTime) < this.damageCooldown) {
            return; // Still on cooldown
        }

        // Calculate damage force based on speed and body strength
        const force = (speed - this.damageThreshold) / this.bodyStrength;
        if (force <= 0) return;

        // Update last collision time for cooldown tracking
        this._lastCollisionTime = now;
        
        // Get mass from rigidbody if available
        const rb = this._vehicleController?._getRigidbody?.();
        const mass = rb?.mass || 10;
        const massMultiplier = mass > 10 ? Math.sqrt(mass * 0.1) : 1;

        const halfW = this.vehicleWidth * 0.5;
        const halfH = this.vehicleHeight * 0.5;
        const vehicleSize = this.vehicleWidth < this.vehicleHeight ? this.vehicleWidth : this.vehicleHeight;

        // --- Impact direction ---
        let dirX = impactDirX;
        let dirY = impactDirY;
        const dirLenSq = dirX * dirX + dirY * dirY;
        
        if (dirLenSq < 0.0001) {
            // Infer direction: from collision point toward vehicle center
            dirX = -localX;
            dirY = -localY;
            const lenSq = dirX * dirX + dirY * dirY;
            if (lenSq > 0.0001) {
                const invLen = 1 / Math.sqrt(lenSq);
                dirX *= invLen;
                dirY *= invLen;
            } else {
                dirX = 0;
                dirY = -1;
            }
        } else {
            const invLen = 1 / Math.sqrt(dirLenSq);
            dirX *= invLen;
            dirY *= invLen;
        }

        // --- Deformation radius ---
        let deformRadius = vehicleSize * this.deformRadius;
        if (this.deformRadiusForceScale) {
            const radiusScale = 0.7 + force * massMultiplier * 0.5;
            deformRadius *= radiusScale < 2.0 ? radiusScale : 2.0;
        }
        if (collisionPoint) {
            deformRadius *= 0.8;
        }
        const deformRadiusSq = deformRadius * deformRadius;

        // Per-hit cap: a single hit can't deform more than 60% of maxDeformation
        const perHitCap = this.maxDeformation * 0.6;
        const maxDeformSq = this.maxDeformation * this.maxDeformation;

        // --- Phase 1: Direct impact deformation ---
        // Use pre-allocated Float32Array for deform amounts
        const totalPoints = this._meshRows * this._meshCols;
        const deformAmounts = this._deformAmounts;
        deformAmounts.fill(0); // Reset
        
        const forceTimesThree = force * massMultiplier * 3;
        
        for (let row = 0; row < this._meshRows; row++) {
            const rowArr = this._meshGrid[row];
            for (let col = 0; col < this._meshCols; col++) {
                const point = rowArr[col];
                const pdx = point.x - localX;
                const pdy = point.y - localY;
                const distSq = pdx * pdx + pdy * pdy;
                
                if (distSq < deformRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const t = dist / deformRadius;
                    const falloff = (1 - t) * (1 - t);
                    
                    // Use pre-computed rigidity
                    const rigidity = this._cachedRigidity[point._index];
                    
                    // Diminishing returns: already-deformed points resist further deformation
                    const existingDeformSq = point.deformX * point.deformX + point.deformY * point.deformY;
                    const remainingCapacity = existingDeformSq < maxDeformSq 
                        ? 1 - Math.sqrt(existingDeformSq) / this.maxDeformation 
                        : 0;
                    
                    const rawAmount = (forceTimesThree * falloff) / rigidity;
                    let deformAmount = rawAmount * remainingCapacity;
                    if (deformAmount > perHitCap) deformAmount = perHitCap;
                    
                    if (deformAmount > 0.01) {
                        // Choose deformation direction
                        let pushX, pushY;
                        
                        if (this.impactDirectional) {
                            const inwardX = -point.baseX;
                            const inwardY = -point.baseY;
                            const inwardLenSq = inwardX * inwardX + inwardY * inwardY;
                            let normInX = 0, normInY = 0;
                            if (inwardLenSq > 0.0001) {
                                const invInLen = 1 / Math.sqrt(inwardLenSq);
                                normInX = inwardX * invInLen;
                                normInY = inwardY * invInLen;
                            }
                            
                            const directBlend = falloff;
                            const splashBlend = (1 - directBlend) * 0.5;
                            pushX = dirX * directBlend + normInX * splashBlend;
                            pushY = dirY * directBlend + normInY * splashBlend;
                            
                            const pushLenSq = pushX * pushX + pushY * pushY;
                            if (pushLenSq > 0.0001) {
                                const invPushLen = 1 / Math.sqrt(pushLenSq);
                                pushX *= invPushLen;
                                pushY *= invPushLen;
                            }
                        } else {
                            // Legacy: push toward center
                            const toCenterX = -point.baseX;
                            const toCenterY = -point.baseY;
                            const toCenterLenSq = toCenterX * toCenterX + toCenterY * toCenterY;
                            if (toCenterLenSq > 0.0001) {
                                const invLen = 1 / Math.sqrt(toCenterLenSq);
                                pushX = toCenterX * invLen;
                                pushY = toCenterY * invLen;
                            } else {
                                pushX = dirX;
                                pushY = dirY;
                            }
                        }
                        
                        point.deformX += pushX * deformAmount;
                        point.deformY += pushY * deformAmount;
                        
                        // Clamp deformation magnitude
                        const deformLenSq = point.deformX * point.deformX + point.deformY * point.deformY;
                        if (deformLenSq > maxDeformSq) {
                            const scale = this.maxDeformation / Math.sqrt(deformLenSq);
                            point.deformX *= scale;
                            point.deformY *= scale;
                        }
                        
                        // Update position and clamp to vehicle bounds
                        point.x = point.baseX + point.deformX;
                        point.y = point.baseY + point.deformY;
                        if (point.x < -halfW) point.x = -halfW;
                        else if (point.x > halfW) point.x = halfW;
                        if (point.y < -halfH) point.y = -halfH;
                        else if (point.y > halfH) point.y = halfH;
                        point.deformX = point.x - point.baseX;
                        point.deformY = point.y - point.baseY;
                        
                        deformAmounts[point._index] = deformAmount;
                    }
                }
            }
        }

        // --- Phase 2: Crumple propagation (optimized) ---
        // Spread deformation to neighboring vertices over multiple iterations
        if (this.crumplePropagation > 0 && this.crumpleIterations > 0) {
            const propHalfCap = perHitCap * 0.5;
            const meshRows = this._meshRows;
            const meshCols = this._meshCols;
            const cachedRigidity = this._cachedRigidity;
            
            for (let iter = 0; iter < this.crumpleIterations; iter++) {
                const iterScale = this.crumplePropagation / (iter + 1);
                
                for (let row = 0; row < meshRows; row++) {
                    const rowArr = this._meshGrid[row];
                    for (let col = 0; col < meshCols; col++) {
                        const point = rowArr[col];
                        const myAmount = deformAmounts[point._index];
                        if (myAmount < 0.01) continue;
                        
                        const propAmount = myAmount * iterScale;
                        if (propAmount < 0.05) continue;
                        
                        // Process 4-connected neighbors inline (avoid array allocation)
                        const neighborIndices = [];
                        if (row > 0) neighborIndices.push(this._meshGrid[row - 1][col]);
                        if (row < meshRows - 1) neighborIndices.push(this._meshGrid[row + 1][col]);
                        if (col > 0) neighborIndices.push(rowArr[col - 1]);
                        if (col < meshCols - 1) neighborIndices.push(rowArr[col + 1]);
                        
                        for (let n = 0; n < neighborIndices.length; n++) {
                            const neighbor = neighborIndices[n];
                            const existingAmount = deformAmounts[neighbor._index];
                            
                            if (propAmount > existingAmount * 0.3) {
                                const rigidity = cachedRigidity[neighbor._index];
                                
                                const existDeformSq = neighbor.deformX * neighbor.deformX + neighbor.deformY * neighbor.deformY;
                                const capacity = existDeformSq < maxDeformSq 
                                    ? 1 - Math.sqrt(existDeformSq) / this.maxDeformation 
                                    : 0;
                                
                                let actualProp = (propAmount / rigidity) * capacity;
                                if (actualProp > propHalfCap) actualProp = propHalfCap;
                                
                                if (actualProp > 0.01) {
                                    neighbor.deformX += dirX * actualProp;
                                    neighbor.deformY += dirY * actualProp;
                                    
                                    const dlSq = neighbor.deformX * neighbor.deformX + neighbor.deformY * neighbor.deformY;
                                    if (dlSq > maxDeformSq) {
                                        const sc = this.maxDeformation / Math.sqrt(dlSq);
                                        neighbor.deformX *= sc;
                                        neighbor.deformY *= sc;
                                    }
                                    
                                    neighbor.x = neighbor.baseX + neighbor.deformX;
                                    neighbor.y = neighbor.baseY + neighbor.deformY;
                                    if (neighbor.x < -halfW) neighbor.x = -halfW;
                                    else if (neighbor.x > halfW) neighbor.x = halfW;
                                    if (neighbor.y < -halfH) neighbor.y = -halfH;
                                    else if (neighbor.y > halfH) neighbor.y = halfH;
                                    neighbor.deformX = neighbor.x - neighbor.baseX;
                                    neighbor.deformY = neighbor.y - neighbor.baseY;
                                    
                                    if (actualProp > existingAmount) {
                                        deformAmounts[neighbor._index] = actualProp;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- Track impact for directional smoke/fire (lightweight) ---
        if (this._impactHistory.length >= 10) this._impactHistory.shift();
        this._impactHistory.push({ x: localX, y: localY, dirX, dirY, force: force * massMultiplier, time: now });

        // --- Add scratch marks oriented to impact direction ---
        if (this.scratchEnabled && Math.random() < 0.7) {
            const scratchLen = 5 + Math.random() * 15;
            const impactAngle = Math.atan2(dirY, dirX);
            const scratchAngle = impactAngle + (Math.PI * 0.5) + (Math.random() - 0.5) * 0.8;
            const cosS = Math.cos(scratchAngle) * scratchLen * 0.5;
            const sinS = Math.sin(scratchAngle) * scratchLen * 0.5;
            if (this._scratches.length >= 20) this._scratches.shift();
            this._scratches.push({
                x1: localX - cosS,
                y1: localY - sinS,
                x2: localX + cosS,
                y2: localY + sinS,
                angle: scratchAngle
            });
        }

        // --- Add dent at impact point ---
        if (this.dentEnabled && Math.random() < 0.5) {
            if (this._dents.length >= 15) this._dents.shift();
            this._dents.push({
                x: localX + dirX * 1.5,
                y: localY + dirY * 1.5,
                radius: 3 + Math.random() * 8,
                dirX: dirX,
                dirY: dirY
            });
        }

        // --- Update damage percentage (optimized) ---
        let totalDeform = 0;
        let maxPointDeformSq = 0;
        let maxDeformPt = null;
        const allPoints = this._cachedAllPoints;
        const numPoints = allPoints.length;
        
        for (let i = 0; i < numPoints; i++) {
            const point = allPoints[i];
            const dlSq = point.deformX * point.deformX + point.deformY * point.deformY;
            if (dlSq > 0.0001) {
                totalDeform += Math.sqrt(dlSq);
                if (dlSq > maxPointDeformSq) {
                    maxPointDeformSq = dlSq;
                    maxDeformPt = point;
                }
            }
        }
        this._currentDamage = (totalDeform / (numPoints * this.maxDeformation)) * 100;
        if (this._currentDamage > 100) this._currentDamage = 100;
        
        if (maxDeformPt) {
            this._mostDamagedPoint = { x: maxDeformPt.baseX, y: maxDeformPt.baseY };
        }

        // Check for window break
        if (this.windowBreakEnabled && !this._windowsBroken && this._currentDamage >= this.windowBreakThreshold) {
            this._windowsBroken = true;
        }

        // Mark cached body as dirty
        this._cachedBodyDirty = true;
        
        // Schedule batched collider sync (processed in loop() with throttling)
        this._colliderSyncPending = true;
    }

    _decayDeformation(dt) {
        const decayAmount = this.deformationDecay * dt;
        let hasDeformation = false;
        const maxDeformation = this.maxDeformation;

        for (let row = 0; row < this._meshRows; row++) {
            const rowArr = this._meshGrid[row];
            for (let col = 0; col < this._meshCols; col++) {
                const point = rowArr[col];
                const deformLenSq = point.deformX * point.deformX + point.deformY * point.deformY;
                if (deformLenSq > 0.0001) {
                    hasDeformation = true;
                    const deformLen = Math.sqrt(deformLenSq);
                    const newLen = deformLen - decayAmount;
                    if (newLen < 0.01) {
                        point.deformX = 0;
                        point.deformY = 0;
                    } else {
                        const scale = newLen / deformLen;
                        point.deformX *= scale;
                        point.deformY *= scale;
                    }
                    point.x = point.baseX + point.deformX;
                    point.y = point.baseY + point.deformY;
                }
            }
        }

        if (hasDeformation) {
            // Recalculate damage percentage using cached array
            let totalDeform = 0;
            const allPoints = this._cachedAllPoints;
            const numPoints = allPoints.length;
            for (let i = 0; i < numPoints; i++) {
                const point = allPoints[i];
                const dlSq = point.deformX * point.deformX + point.deformY * point.deformY;
                if (dlSq > 0.0001) {
                    totalDeform += Math.sqrt(dlSq);
                }
            }
            this._currentDamage = (totalDeform / (numPoints * maxDeformation)) * 100;
            if (this._currentDamage > 100) this._currentDamage = 100;
            this._cachedBodyDirty = true;
            
            // Schedule batched collider sync
            this._colliderSyncPending = true;
        }
    }

    // ════════════════════════════════════════════════════════
    // DAMAGE PARTICLES (SMOKE/FIRE)
    // ════════════════════════════════════════════════════════

    _updateDamageParticles(dt) {
        if (!this.damageEnabled) return;

        // Smoke - throttled emission rate (min 0.15s between emissions)
        if (this.smokeEnabled && this._currentDamage >= this.smokeDamageThreshold) {
            this._smokeParticleTimer += dt;
            const smokeRate = 0.15 + (100 - this._currentDamage) / 200; // Slower rate: 0.15-0.65s
            if (this._smokeParticleTimer >= smokeRate) {
                this._smokeParticleTimer = 0;
                this._emitSmoke();
            }
        }

        // Fire - throttled emission rate (min 0.08s between emissions)
        if (this.fireEnabled && this._currentDamage >= this.fireDamageThreshold) {
            this._fireParticleTimer += dt;
            const fireRate = 0.08 + (100 - this._currentDamage) / 300; // Slower rate: 0.08-0.4s
            if (this._fireParticleTimer >= fireRate) {
                this._fireParticleTimer = 0;
                this._emitFire();
            }
        }
    }

    _emitSmoke() {
        if (typeof particleBurst !== 'function') return;
        
        const worldPos = this.gameObject.getWorldPosition();
        const angle = this.gameObject.angle * (Math.PI / 180);
        const cosW = Math.cos(angle);
        const sinW = Math.sin(angle);
        
        // Emit from most damaged area, fallback to hood
        let localX = 0, localY = -this.vehicleHeight * 0.3;
        if (this._mostDamagedPoint) {
            localX = this._mostDamagedPoint.x;
            localY = this._mostDamagedPoint.y;
        }
        
        const emitX = worldPos.x + localX * cosW - localY * sinW + (Math.random() - 0.5) * 6;
        const emitY = worldPos.y + localX * sinW + localY * cosW + (Math.random() - 0.5) * 6;

        particleBurst(emitX, emitY, {
            count: 1, // Reduced from 2
            color: this.smokeColor,
            colorEnd: '#888888',
            size: 8,
            sizeEnd: 18,
            speed: 15,
            speedVariation: 8,
            angle: -90,
            spread: 25,
            gravity: -25,
            life: 1.2,
            fadeOut: true
        });
    }

    _emitFire() {
        if (typeof particleBurst !== 'function') return;
        
        const worldPos = this.gameObject.getWorldPosition();
        const angle = this.gameObject.angle * (Math.PI / 180);
        const cosW = Math.cos(angle);
        const sinW = Math.sin(angle);
        
        // Emit from most damaged area, fallback to hood
        let localX = 0, localY = -this.vehicleHeight * 0.3;
        if (this._mostDamagedPoint) {
            localX = this._mostDamagedPoint.x;
            localY = this._mostDamagedPoint.y;
        }
        
        const emitX = worldPos.x + localX * cosW - localY * sinW + (Math.random() - 0.5) * 10;
        const emitY = worldPos.y + localX * sinW + localY * cosW + (Math.random() - 0.5) * 10;

        particleBurst(emitX, emitY, {
            count: 2, // Reduced from 3
            color: this.fireColor,
            colorEnd: '#ffff00',
            size: 4,
            sizeEnd: 1,
            speed: 35,
            speedVariation: 15,
            angle: -90,
            spread: 40,
            gravity: -80,
            life: 0.3,
            fadeOut: true
        });
    }

    // ════════════════════════════════════════════════════════
    // DRAWING
    // ════════════════════════════════════════════════════════

    _drawVehicleBody(ctx) {
        const engine = this.gameObject._engine;
        
        // Ensure full opacity for vehicle body rendering
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        
        // Try to draw vehicle image first
        if (this.vehicleImage && engine?.assets) {
            const fileName = this.vehicleImage.split('/').pop().split('\\').pop();
            const img = engine.assets.getImage(fileName);
            if (img) {
                // Check if we need to use mesh deformation
                const hasDeform = this.damageEnabled && this._meshInitialized && this._hasMeshDeformation();
                const hasDamageEffects = this._dents.length > 0 || this._scratches.length > 0;
                
                if (hasDeform) {
                    // Draw deformed image with damage baked in (clipped to alpha)
                    this._drawDeformedImage(ctx, img);
                } else if (hasDamageEffects && this.damageEnabled) {
                    // No deformation but has damage effects - need to clip to image alpha
                    this._drawImageWithClippedDamage(ctx, img);
                } else {
                    // No damage - draw directly (centered crop from source image)
                    const cropW = Math.min(img.width, this.vehicleWidth);
                    const cropH = Math.min(img.height, this.vehicleHeight);
                    const cropX = (img.width - cropW) / 2;
                    const cropY = (img.height - cropH) / 2;
                    ctx.drawImage(img, cropX, cropY, cropW, cropH, -cropW / 2, -cropH / 2, cropW, cropH);
                }
                this._drawWindows(ctx);
                ctx.restore();
                return;
            }
        }

        // Generate body if enabled
        if (this.useGeneratedBody) {
            this._drawGeneratedBody(ctx);
        }
        
        ctx.restore();
    }

    /**
     * Draw image with damage overlay clipped to image alpha (for non-deformed case)
     */
    _drawImageWithClippedDamage(ctx, img) {
        // Create or resize cache canvas if needed
        const cw = this.vehicleWidth + 20;
        const ch = this.vehicleHeight + 20;
        if (!this._cachedBodyCanvas || this._cachedBodyCanvas.width !== cw || this._cachedBodyCanvas.height !== ch) {
            this._cachedBodyCanvas = document.createElement('canvas');
            this._cachedBodyCanvas.width = cw;
            this._cachedBodyCanvas.height = ch;
            this._cachedBodyCtx = this._cachedBodyCanvas.getContext('2d');
            this._cachedBodyDirty = true;
        }
        
        // Use cached version if clean
        if (!this._cachedBodyDirty) {
            ctx.drawImage(
                this._cachedBodyCanvas, 
                -this.vehicleWidth / 2 - 10, 
                -this.vehicleHeight / 2 - 10
            );
            return;
        }

        const cacheCtx = this._cachedBodyCtx;
        const offsetX = cw / 2;
        const offsetY = ch / 2;
        
        cacheCtx.clearRect(0, 0, cw, ch);
        
        // Ensure full opacity for body rendering (fixes transparency issues)
        cacheCtx.globalAlpha = 1;
        cacheCtx.globalCompositeOperation = 'source-over';
        
        // Draw the image centered (crop from center of source instead of scaling)
        const cropW = Math.min(img.width, this.vehicleWidth);
        const cropH = Math.min(img.height, this.vehicleHeight);
        const cropX = (img.width - cropW) / 2;
        const cropY = (img.height - cropH) / 2;
        cacheCtx.drawImage(img, cropX, cropY, cropW, cropH, offsetX - cropW / 2, offsetY - cropH / 2, cropW, cropH);
        
        // Draw damage overlay clipped to image alpha
        this._drawDamageOverlayToCache(cacheCtx, offsetX, offsetY);
        
        this._cachedBodyDirty = false;
        
        // Draw cached result
        ctx.drawImage(
            this._cachedBodyCanvas, 
            -this.vehicleWidth / 2 - 10, 
            -this.vehicleHeight / 2 - 10
        );
    }

    /**
     * Check if any mesh point has deformation
     */
    _hasMeshDeformation() {
        for (let row = 0; row < this._meshRows; row++) {
            for (let col = 0; col < this._meshCols; col++) {
                const point = this._meshGrid[row][col];
                if (Math.abs(point.deformX) > 0.1 || Math.abs(point.deformY) > 0.1) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Draw image through deformed mesh using triangle-based texture mapping
     */
    _drawDeformedImage(ctx, img) {
        // Use cached canvas if not dirty
        if (this._cachedBodyCanvas && !this._cachedBodyDirty) {
            ctx.drawImage(
                this._cachedBodyCanvas, 
                -this.vehicleWidth / 2 - 10, 
                -this.vehicleHeight / 2 - 10
            );
            return;
        }

        // Create or resize cache canvas
        const cw = this.vehicleWidth + 20;
        const ch = this.vehicleHeight + 20;
        if (!this._cachedBodyCanvas || this._cachedBodyCanvas.width !== cw || this._cachedBodyCanvas.height !== ch) {
            this._cachedBodyCanvas = document.createElement('canvas');
            this._cachedBodyCanvas.width = cw;
            this._cachedBodyCanvas.height = ch;
            this._cachedBodyCtx = this._cachedBodyCanvas.getContext('2d');
        }

        const cacheCtx = this._cachedBodyCtx;
        cacheCtx.clearRect(0, 0, cw, ch);
        
        // Ensure full opacity for body rendering (fixes transparency issues)
        cacheCtx.globalAlpha = 1;
        cacheCtx.globalCompositeOperation = 'source-over';
        cacheCtx.imageSmoothingEnabled = false; // Disable anti-aliasing to prevent seam artifacts
        
        // Offset to center of cache canvas
        const offsetX = cw / 2;
        const offsetY = ch / 2;

        // Calculate center crop region in source image
        const cropW = Math.min(img.width, this.vehicleWidth);
        const cropH = Math.min(img.height, this.vehicleHeight);
        const cropX = (img.width - cropW) / 2;
        const cropY = (img.height - cropH) / 2;

        // Draw each triangle with texture mapping
        for (const tri of this._triangles) {
            this._drawTexturedTriangle(
                cacheCtx, img,
                // Destination points (deformed mesh + offset)
                tri.p0.x + offsetX, tri.p0.y + offsetY,
                tri.p1.x + offsetX, tri.p1.y + offsetY,
                tri.p2.x + offsetX, tri.p2.y + offsetY,
                // Source UV coordinates (0-1) mapped to center crop region
                cropX + tri.p0.u * cropW, cropY + tri.p0.v * cropH,
                cropX + tri.p1.u * cropW, cropY + tri.p1.v * cropH,
                cropX + tri.p2.u * cropW, cropY + tri.p2.v * cropH
            );
        }

        // Bake damage overlay onto cached canvas, clipped to car alpha
        this._drawDamageOverlayToCache(cacheCtx, offsetX, offsetY);

        this._cachedBodyDirty = false;

        // Draw cached result
        ctx.drawImage(
            this._cachedBodyCanvas, 
            -this.vehicleWidth / 2 - 10, 
            -this.vehicleHeight / 2 - 10
        );
    }

    /**
     * Draw a single textured triangle using affine transformation
     * This maps a triangular region of the source image to a triangular destination
     */
    _drawTexturedTriangle(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
        ctx.save();
        ctx.globalAlpha = 1; // Ensure full opacity for each triangle
        
        // Expand triangle slightly to eliminate subpixel seams between adjacent triangles
        // Calculate centroid
        const cx = (x0 + x1 + x2) / 3;
        const cy = (y0 + y1 + y2) / 3;
        const expand = 0.75; // pixels to expand outward
        
        // Expand each vertex away from centroid
        const ex0 = x0 + (x0 - cx) / Math.max(1, Math.hypot(x0 - cx, y0 - cy)) * expand;
        const ey0 = y0 + (y0 - cy) / Math.max(1, Math.hypot(x0 - cx, y0 - cy)) * expand;
        const ex1 = x1 + (x1 - cx) / Math.max(1, Math.hypot(x1 - cx, y1 - cy)) * expand;
        const ey1 = y1 + (y1 - cy) / Math.max(1, Math.hypot(x1 - cx, y1 - cy)) * expand;
        const ex2 = x2 + (x2 - cx) / Math.max(1, Math.hypot(x2 - cx, y2 - cy)) * expand;
        const ey2 = y2 + (y2 - cy) / Math.max(1, Math.hypot(x2 - cx, y2 - cy)) * expand;
        
        ctx.beginPath();
        ctx.moveTo(ex0, ey0);
        ctx.lineTo(ex1, ey1);
        ctx.lineTo(ex2, ey2);
        ctx.closePath();
        ctx.clip();

        // Calculate affine transformation matrix
        // We need to map source triangle (u0,v0), (u1,v1), (u2,v2) 
        // to destination triangle (x0,y0), (x1,y1), (x2,y2)
        
        const denom = (u0 - u2) * (v1 - v2) - (u1 - u2) * (v0 - v2);
        if (Math.abs(denom) < 0.001) {
            ctx.restore();
            return; // Degenerate triangle
        }

        const m11 = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / denom;
        const m12 = ((x1 - x2) * (u0 - u2) - (x0 - x2) * (u1 - u2)) / denom;
        const m21 = ((y0 - y2) * (v1 - v2) - (y1 - y2) * (v0 - v2)) / denom;
        const m22 = ((y1 - y2) * (u0 - u2) - (y0 - y2) * (u1 - u2)) / denom;
        const dx = x2 - m11 * u2 - m12 * v2;
        const dy = y2 - m21 * u2 - m22 * v2;

        ctx.transform(m11, m21, m12, m22, dx, dy);
        
        // Draw the image (will be clipped to triangle and transformed)
        ctx.drawImage(img, 0, 0);
        
        ctx.restore();
    }

    _drawGeneratedBody(ctx) {
        if (!this._meshInitialized) this._initMesh();

        ctx.save();

        // Ensure full opacity for body fill (fixes transparency issues from prior ctx state)
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // Draw body using perimeter mesh points
        const perimeterPoints = this._getPerimeterPoints();
        ctx.beginPath();
        if (perimeterPoints.length > 0) {
            ctx.moveTo(perimeterPoints[0].x, perimeterPoints[0].y);
            for (let i = 1; i < perimeterPoints.length; i++) {
                ctx.lineTo(perimeterPoints[i].x, perimeterPoints[i].y);
            }
            ctx.closePath();
        }

        // Fill body with solid color
        ctx.fillStyle = this.vehicleColor;
        ctx.fill();

        // Outline
        if (this.vehicleOutlineWidth > 0) {
            ctx.strokeStyle = this.vehicleOutlineColor;
            ctx.lineWidth = this.vehicleOutlineWidth;
            ctx.stroke();
        }

        // Draw damage overlay clipped to body shape
        this._drawDamageOverlayClipped(ctx, perimeterPoints);

        // Draw windows
        this._drawWindows(ctx);

        ctx.restore();
    }

    _drawDamageOverlay(ctx) {
        if (!this.damageEnabled) return;

        // Draw dents
        if (this.dentEnabled) {
            ctx.fillStyle = this.dentColor;
            for (const dent of this._dents) {
                ctx.beginPath();
                ctx.arc(dent.x, dent.y, dent.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw scratches
        if (this.scratchEnabled) {
            ctx.strokeStyle = this.scratchColor;
            ctx.lineWidth = 1;
            for (const scratch of this._scratches) {
                ctx.beginPath();
                ctx.moveTo(scratch.x1, scratch.y1);
                ctx.lineTo(scratch.x2, scratch.y2);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw damage overlay clipped to body perimeter (for generated bodies)
     * This ensures damage effects only appear within the body shape, preventing
     * transparency issues where semi-transparent dents might extend outside.
     */
    _drawDamageOverlayClipped(ctx, perimeterPoints) {
        if (!this.damageEnabled) return;
        if (this._dents.length === 0 && this._scratches.length === 0) return;
        if (!perimeterPoints || perimeterPoints.length === 0) return;

        ctx.save();

        // Create clipping path from body perimeter
        ctx.beginPath();
        ctx.moveTo(perimeterPoints[0].x, perimeterPoints[0].y);
        for (let i = 1; i < perimeterPoints.length; i++) {
            ctx.lineTo(perimeterPoints[i].x, perimeterPoints[i].y);
        }
        ctx.closePath();
        ctx.clip();

        // Draw dents within clipped region (ensures they stay inside body shape)
        if (this.dentEnabled && this._dents.length > 0) {
            ctx.fillStyle = this.dentColor;
            for (const dent of this._dents) {
                ctx.beginPath();
                ctx.arc(dent.x, dent.y, dent.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw scratches within clipped region
        if (this.scratchEnabled && this._scratches.length > 0) {
            ctx.strokeStyle = this.scratchColor;
            ctx.lineWidth = 1;
            for (const scratch of this._scratches) {
                ctx.beginPath();
                ctx.moveTo(scratch.x1, scratch.y1);
                ctx.lineTo(scratch.x2, scratch.y2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Draw damage overlay to cache canvas, clipped to existing alpha
     * Uses source-atop composite to only draw where car pixels exist
     */
    _drawDamageOverlayToCache(cacheCtx, offsetX, offsetY) {
        if (!this.damageEnabled) return;
        if (this._dents.length === 0 && this._scratches.length === 0) return;

        cacheCtx.save();
        
        // Use source-atop to only draw where the car image has alpha > 0
        cacheCtx.globalCompositeOperation = 'source-atop';
        
        // Draw dents (clipped to car transparency)
        if (this.dentEnabled && this._dents.length > 0) {
            cacheCtx.fillStyle = this.dentColor;
            for (const dent of this._dents) {
                cacheCtx.beginPath();
                cacheCtx.arc(dent.x + offsetX, dent.y + offsetY, dent.radius, 0, Math.PI * 2);
                cacheCtx.fill();
            }
        }

        // Draw scratches (clipped to car transparency)
        if (this.scratchEnabled && this._scratches.length > 0) {
            cacheCtx.strokeStyle = this.scratchColor;
            cacheCtx.lineWidth = 1;
            for (const scratch of this._scratches) {
                cacheCtx.beginPath();
                cacheCtx.moveTo(scratch.x1 + offsetX, scratch.y1 + offsetY);
                cacheCtx.lineTo(scratch.x2 + offsetX, scratch.y2 + offsetY);
                cacheCtx.stroke();
            }
        }

        cacheCtx.restore();
    }

    _drawWindows(ctx) {
        if (!this.windowEnabled) return;

        const halfW = this.vehicleWidth / 2;
        const halfH = this.vehicleHeight / 2;

        // Windshield (front)
        const windshieldY = -halfH * 0.6;
        const windshieldH = halfH * 0.35;
        const windshieldW = halfW * 1.4;

        ctx.save();
        ctx.globalAlpha = this.windowAlpha;

        if (this._windowsBroken) {
            // Draw broken glass effect
            ctx.strokeStyle = this.windowColor;
            ctx.lineWidth = 1;
            
            // Random crack lines
            for (let i = 0; i < 8; i++) {
                const startX = -windshieldW / 2 + Math.random() * windshieldW;
                const startY = windshieldY + Math.random() * windshieldH;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                for (let j = 0; j < 3; j++) {
                    ctx.lineTo(
                        startX + (Math.random() - 0.5) * 20,
                        startY + (Math.random() - 0.5) * 20
                    );
                }
                ctx.stroke();
            }
        } else {
            // Draw intact windows
            ctx.fillStyle = this.windowColor;
            
            // Windshield
            ctx.beginPath();
            ctx.moveTo(-windshieldW / 2, windshieldY);
            ctx.lineTo(windshieldW / 2, windshieldY);
            ctx.lineTo(windshieldW / 2 * 0.8, windshieldY + windshieldH);
            ctx.lineTo(-windshieldW / 2 * 0.8, windshieldY + windshieldH);
            ctx.closePath();
            ctx.fill();

            // Rear window
            const rearY = halfH * 0.3;
            const rearH = halfH * 0.3;
            ctx.beginPath();
            ctx.moveTo(-windshieldW / 2 * 0.7, rearY);
            ctx.lineTo(windshieldW / 2 * 0.7, rearY);
            ctx.lineTo(windshieldW / 2 * 0.6, rearY + rearH);
            ctx.lineTo(-windshieldW / 2 * 0.6, rearY + rearH);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    _drawDoors(ctx) {
        if (!this.doorEnabled) return;
        this._initDoorCanvas();

        const doorW = this.doorWidth;
        const doorH = this.doorHeight;

        // Left door
        if (this._leftDoorAngle > 0.1 || this._leftDoorState !== 'closed') {
            ctx.save();
            // Position at door pivot point
            ctx.translate(-this.doorOffsetY + this.doorPivotY, this.doorOffsetX + this.doorPivotX);
            ctx.rotate(-this._leftDoorAngle * Math.PI / 180);
            ctx.translate(-this.doorPivotY - 2, -this.doorPivotX - 2);
            ctx.drawImage(this._doorCanvas, 0, 0);
            ctx.restore();
        }

        // Right door (mirrored)
        if (this._rightDoorAngle > 0.1 || this._rightDoorState !== 'closed') {
            ctx.save();
            // Position at door pivot point (right side)
            ctx.translate(this.doorOffsetY - this.doorPivotY, this.doorOffsetX + this.doorPivotX);
            ctx.rotate(this._rightDoorAngle * Math.PI / 180);
            ctx.scale(-1, 1); // Mirror
            ctx.translate(-this.doorPivotY - 2, -this.doorPivotX - 2);
            ctx.drawImage(this._doorCanvas, 0, 0);
            ctx.restore();
        }
    }

    // ════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════

    /**
     * Get current damage percentage (0-100)
     */
    getDamage() {
        return this._currentDamage;
    }

    /**
     * Check if vehicle is heavily damaged (smoke threshold)
     */
    isHeavilyDamaged() {
        return this._currentDamage >= this.smokeDamageThreshold;
    }

    /**
     * Check if vehicle is critically damaged (fire threshold)
     */
    isCriticallyDamaged() {
        return this._currentDamage >= this.fireDamageThreshold;
    }

    /**
     * Check if windows are broken
     */
    areWindowsBroken() {
        return this._windowsBroken;
    }

    /**
     * Get polygon collider vertices for PolygonCollider auto-detection
     * Returns the deformed mesh perimeter points in local space
     * @param {boolean} worldSpace - If true, return vertices in world space
     * @returns {{vertices: Array<{x: number, y: number}>}} Polygon data
     */
    getPolygonCollider(worldSpace = false) {
        if (!this._meshInitialized) this._initMesh();
        
        const perimeter = this._getPerimeterPoints();
        const vertices = perimeter.map(p => ({ x: p.x, y: p.y }));
        
        if (worldSpace && this.gameObject) {
            const worldPos = this.gameObject.getWorldPosition();
            const worldAngle = this.gameObject.angle * (Math.PI / 180);
            const cos = Math.cos(worldAngle);
            const sin = Math.sin(worldAngle);
            
            for (const v of vertices) {
                const lx = v.x;
                const ly = v.y;
                v.x = worldPos.x + lx * cos - ly * sin;
                v.y = worldPos.y + lx * sin + ly * cos;
            }
        }
        
        return { vertices };
    }

    // ════════════════════════════════════════════════════════
    // AUTO-DETECT VEHICLE SIZE
    // ════════════════════════════════════════════════════════

    /**
     * Auto-detect vehicle width/height by analyzing the image and trimming
     * transparent pixels. Finds the bounding box of non-transparent content.
     */
    _autoDetectVehicleSize() {
        const engine = this.gameObject?._engine;
        if (!engine?.assets) return;

        const fileName = this.vehicleImage.split('/').pop().split('\\').pop();
        const img = engine.assets.getImage(fileName);
        if (!img || !img.width || !img.height) {
            // Image not loaded yet — try again on next frame
            this._autoSizeDetected = false;
            return;
        }

        // Use a reusable temporary canvas for pixel reading (avoid allocation per call)
        if (!this._detectCanvas) {
            this._detectCanvas = document.createElement('canvas');
        }
        const canvas = this._detectCanvas;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        let detectedW, detectedH;
        
        try {
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            const w = img.width;
            const h = img.height;

            let minX = w, minY = h, maxX = 0, maxY = 0;
            let found = false;

            // Scan all pixels, find bounding box of non-transparent pixels (alpha > 10)
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const alpha = data[(y * w + x) * 4 + 3];
                    if (alpha > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            if (!found) return;

            detectedW = maxX - minX + 1;
            detectedH = maxY - minY + 1;
        } catch (e) {
            // Handle CORS/tainted canvas - fall back to full image dimensions
            console.warn('[VehicleControllerRenderer] Could not read pixel data (CORS), using full image size:', e.message);
            detectedW = img.width;
            detectedH = img.height;
        }

        this._detectedWidth = detectedW;
        this._detectedHeight = detectedH;
        this.vehicleWidth = detectedW;
        this.vehicleHeight = detectedH;
        this._autoSizeDetected = true;

        console.log(`[VehicleControllerRenderer] Auto-detected size: ${detectedW}x${detectedH} (from ${img.width}x${img.height} image, trimmed transparent border)`);

        // Release temp canvas backing store now that detection is done
        if (this._detectCanvas) {
            this._detectCanvas.width = 0;
            this._detectCanvas.height = 0;
        }

        // Re-init mesh with new dimensions
        this._meshInitialized = false;
        this._needsBodyRedraw = true;
    }

    // ════════════════════════════════════════════════════════
    // BOX COLLIDER AUTO-RESIZE
    // ════════════════════════════════════════════════════════

    /**
     * Sync BoxCollider dimensions with the current deformed vehicle bounding box.
     * Uses the perimeter mesh points (edge points that deform with damage) to
     * determine the furthest extent on each side, providing accurate collision
     * bounds without reading image data.
     */
    _syncBoxCollider() {
        if (!this.autoResizeBoxCollider || !this.gameObject) return;

        const boxCollider = this.gameObject.getModule('BoxCollider');
        if (!boxCollider) return;

        if (!this._meshInitialized || !this._meshGrid.length) {
            // No mesh yet — just set to vehicle size
            boxCollider.width = this.vehicleWidth;
            boxCollider.height = this.vehicleHeight;
            return;
        }

        // Use perimeter points (deforming edge points) to find boundaries
        // These are the furthest points on each edge that define the vehicle extent
        const perimeterPoints = this._getPerimeterPoints();
        
        if (perimeterPoints.length === 0) {
            boxCollider.width = this.vehicleWidth;
            boxCollider.height = this.vehicleHeight;
            return;
        }

        // Find the axis-aligned bounding box from deforming perimeter points
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const pt of perimeterPoints) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
        }

        const newW = maxX - minX;
        const newH = maxY - minY;

        // Only update if meaningfully different (avoids jitter)
        if (Math.abs(boxCollider.width - newW) > 0.5 || Math.abs(boxCollider.height - newH) > 0.5) {
            boxCollider.width = newW;
            boxCollider.height = newH;
        }

        // Also offset the collider center to match the deformed center
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        if (typeof boxCollider.offsetX === 'number') {
            if (Math.abs(boxCollider.offsetX - centerX) > 0.5) boxCollider.offsetX = centerX;
        }
        if (typeof boxCollider.offsetY === 'number') {
            if (Math.abs(boxCollider.offsetY - centerY) > 0.5) boxCollider.offsetY = centerY;
        }
    }

    /**
     * Sync PolygonCollider with current mesh deformation
     * Called automatically when damage is applied or repaired
     */
    _syncPolygonCollider() {
        if (!this.gameObject) return;
        
        const polygonCollider = this.gameObject.getModule('PolygonCollider');
        if (!polygonCollider) return;
        
        // Only sync if the collider is set to auto-detect from this module
        if (polygonCollider.sourceModule !== 'VehicleControllerRenderer') return;
        
        // Get current deformed perimeter points
        const perimeter = this._getPerimeterPoints();
        
        // Update the collider's points directly
        polygonCollider.points = perimeter.map(p => {
            // Create Vector2 if available, otherwise plain object
            if (typeof Vector2 !== 'undefined') {
                return new Vector2(p.x, p.y);
            }
            return { x: p.x, y: p.y };
        });
        
        // Mark collider as needing update
        if (polygonCollider._recalculateAxes) {
            polygonCollider._recalculateAxes();
        }
    }

    /**
     * Repair vehicle - reset all damage
     */
    repair() {
        // Reset mesh points
        for (let row = 0; row < this._meshRows; row++) {
            for (let col = 0; col < this._meshCols; col++) {
                const point = this._meshGrid[row][col];
                point.deformX = 0;
                point.deformY = 0;
                point.x = point.baseX;
                point.y = point.baseY;
            }
        }
        
        // Clear damage effects
        this._scratches = [];
        this._dents = [];
        this._currentDamage = 0;
        this._windowsBroken = false;
        this._cachedBodyDirty = true;
        this._mostDamagedPoint = null;
        this._impactHistory = [];
        
        // Sync PolygonCollider if present (restore original collision shape)
        this._syncPolygonCollider();
        
        // Restore BoxCollider to original size
        this._syncBoxCollider();
    }

    /**
     * Check if damage is currently on cooldown
     * @returns {boolean} True if damage cooldown is active
     */
    isDamageOnCooldown() {
        if (this.damageCooldown <= 0) return false;
        const now = typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000;
        return (now - this._lastCollisionTime) < this.damageCooldown;
    }

    /**
     * Get the time remaining on the damage cooldown
     * @returns {number} Seconds remaining, or 0 if not on cooldown
     */
    getDamageCooldownRemaining() {
        if (this.damageCooldown <= 0) return 0;
        const now = typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000;
        const remaining = this.damageCooldown - (now - this._lastCollisionTime);
        return Math.max(0, remaining);
    }

    /**
     * Apply damage for testing
     */
    testDamage() {
        // Ensure mesh is initialized
        if (!this._meshInitialized) this._initMesh();
        
        // Apply damage at a random edge point with realistic impact direction
        const angle = Math.random() * Math.PI * 2;
        const halfW = this.vehicleWidth / 2;
        const halfH = this.vehicleHeight / 2;
        const x = Math.cos(angle) * halfW * 0.9;
        const y = Math.sin(angle) * halfH * 0.9;
        
        // Impact direction: from edge toward center (simulating external hit)
        const impDirX = -Math.cos(angle);
        const impDirY = -Math.sin(angle);
        
        console.log('[VehicleControllerRenderer] testDamage at', x.toFixed(1), y.toFixed(1), 'dir', impDirX.toFixed(2), impDirY.toFixed(2));
        this._applyDamageAtPoint(x, y, this.damageThreshold + 150, { x, y }, impDirX, impDirY);
        console.log('[VehicleControllerRenderer] Damage applied. Current damage:', this._currentDamage.toFixed(1) + '%');
        console.log('[VehicleControllerRenderer] Has deformation:', this._hasMeshDeformation());
    }

    /**
     * Manually apply damage at a world position
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} force - Damage force
     */
    applyDamageAt(worldX, worldY, force, worldDirX = 0, worldDirY = 0) {
        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.angle * (Math.PI / 180);
        
        // Transform to local space
        const dx = worldX - worldPos.x;
        const dy = worldY - worldPos.y;
        const cos = Math.cos(-worldAngle);
        const sin = Math.sin(-worldAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        // Transform direction to local space
        const localDirX = worldDirX * cos - worldDirY * sin;
        const localDirY = worldDirX * sin + worldDirY * cos;

        this._applyDamageAtPoint(localX, localY, this.damageThreshold + force, { x: localX, y: localY }, localDirX, localDirY);
    }

    /**
     * Check if left door is currently animating
     */
    isLeftDoorOpen() {
        return this._leftDoorState !== 'closed';
    }

    /**
     * Check if right door is currently animating
     */
    isRightDoorOpen() {
        return this._rightDoorState !== 'closed';
    }

    // ════════════════════════════════════════════════════════
    // CLEANUP
    // ════════════════════════════════════════════════════════

    onDestroy() {
        // Release off-screen canvases (set size to 0 to free GPU/backing store)
        if (this._bodyCanvas) {
            this._bodyCanvas.width = 0;
            this._bodyCanvas.height = 0;
            this._bodyCanvas = null;
            this._bodyCtx = null;
        }
        if (this._doorCanvas) {
            this._doorCanvas.width = 0;
            this._doorCanvas.height = 0;
            this._doorCanvas = null;
            this._doorCtx = null;
        }
        if (this._cachedBodyCanvas) {
            this._cachedBodyCanvas.width = 0;
            this._cachedBodyCanvas.height = 0;
            this._cachedBodyCanvas = null;
            this._cachedBodyCtx = null;
        }
        if (this._detectCanvas) {
            this._detectCanvas.width = 0;
            this._detectCanvas.height = 0;
            this._detectCanvas = null;
        }

        // Restore monkey-patched collision callback to avoid pinning this module
        if (this._rigidbody) {
            this._rigidbody.onCollisionEnter = this._originalOnCollisionEnter || null;
            this._rigidbody._vcrDamageHooked = false;
        }
        this._originalOnCollisionEnter = null;

        // Release mesh data
        this._meshGrid = [];
        this._triangles = [];
        this._cachedAllPoints = null;
        this._cachedPerimeterPoints = null;
        this._cachedRigidity = null;
        this._deformAmounts = null;

        // Release damage data
        this._scratches = [];
        this._dents = [];
        this._impactHistory = [];
        this._lastCollisionDamage = null;
        this._lastIncomingCollision = null;

        // Release module references
        this._vehicleController = null;
        this._rigidbody = null;
        this._mostDamagedPoint = null;
    }

    // ════════════════════════════════════════════════════════
    // SERIALIZATION
    // ════════════════════════════════════════════════════════

    toJSON() {
        const json = super.toJSON();
        json.type = 'VehicleControllerRenderer';

        // Vehicle body
        json.vehicleImage = this.vehicleImage;
        json.autoDetectSize = this.autoDetectSize;
        json.vehicleWidth = this.vehicleWidth;
        json.vehicleHeight = this.vehicleHeight;
        json.vehicleColor = this.vehicleColor;
        json.vehicleOutlineColor = this.vehicleOutlineColor;
        json.vehicleOutlineWidth = this.vehicleOutlineWidth;
        json.useGeneratedBody = this.useGeneratedBody;

        // Door system
        json.doorEnabled = this.doorEnabled;
        json.doorImage = this.doorImage;
        json.useGeneratedDoor = this.useGeneratedDoor;
        json.doorWidth = this.doorWidth;
        json.doorHeight = this.doorHeight;
        json.doorColor = this.doorColor;
        json.doorColorEnd = this.doorColorEnd;
        json.doorOffsetX = this.doorOffsetX;
        json.doorOffsetY = this.doorOffsetY;
        json.doorPivotX = this.doorPivotX;
        json.doorPivotY = this.doorPivotY;
        json.doorOpenAngle = this.doorOpenAngle;
        json.doorOpenTime = this.doorOpenTime;
        json.doorCloseTime = this.doorCloseTime;
        json.doorHoldTime = this.doorHoldTime;

        // Damage system
        json.damageEnabled = this.damageEnabled;
        json.bodyStrength = this.bodyStrength;
        json.maxDeformation = this.maxDeformation;
        json.deformationDecay = this.deformationDecay;
        json.damageThreshold = this.damageThreshold;
        json.damageCooldown = this.damageCooldown;
        json.meshSubdivisions = this.meshSubdivisions;
        
        // Realistic deformation
        json.deformRadius = this.deformRadius;
        json.deformRadiusForceScale = this.deformRadiusForceScale;
        json.crumplePropagation = this.crumplePropagation;
        json.crumpleIterations = this.crumpleIterations;
        json.edgeSoftness = this.edgeSoftness;
        json.centerRigidity = this.centerRigidity;
        json.impactDirectional = this.impactDirectional;

        // Damage effects
        json.scratchEnabled = this.scratchEnabled;
        json.scratchColor = this.scratchColor;
        json.dentEnabled = this.dentEnabled;
        json.dentColor = this.dentColor;
        json.sparkOnHit = this.sparkOnHit;
        json.sparkColor = this.sparkColor;
        json.sparkCount = this.sparkCount;

        // Smoke/fire
        json.smokeEnabled = this.smokeEnabled;
        json.smokeDamageThreshold = this.smokeDamageThreshold;
        json.smokeColor = this.smokeColor;
        json.fireEnabled = this.fireEnabled;
        json.fireDamageThreshold = this.fireDamageThreshold;
        json.fireColor = this.fireColor;

        // Windows
        json.windowEnabled = this.windowEnabled;
        json.windowColor = this.windowColor;
        json.windowAlpha = this.windowAlpha;
        json.windowBreakEnabled = this.windowBreakEnabled;
        json.windowBreakThreshold = this.windowBreakThreshold;

        // Collision auto-resize
        json.autoResizeBoxCollider = this.autoResizeBoxCollider;

        return json;
    }

    static fromJSON(json) {
        const module = new VehicleControllerRenderer();
        module.enabled = json.enabled ?? true;

        // Vehicle body
        module.vehicleImage = json.vehicleImage ?? '';
        module.autoDetectSize = json.autoDetectSize ?? false;
        module.vehicleWidth = json.vehicleWidth ?? 40;
        module.vehicleHeight = json.vehicleHeight ?? 80;
        module.vehicleColor = json.vehicleColor ?? '#3366cc';
        module.vehicleOutlineColor = json.vehicleOutlineColor ?? '#1a3366';
        module.vehicleOutlineWidth = json.vehicleOutlineWidth ?? 2;
        module.useGeneratedBody = json.useGeneratedBody ?? true;

        // Door system
        module.doorEnabled = json.doorEnabled ?? true;
        module.doorImage = json.doorImage ?? '';
        module.useGeneratedDoor = json.useGeneratedDoor ?? true;
        module.doorWidth = json.doorWidth ?? 8;
        module.doorHeight = json.doorHeight ?? 30;
        module.doorColor = json.doorColor ?? '#4477dd';
        module.doorColorEnd = json.doorColorEnd ?? '#223366';
        module.doorOffsetX = json.doorOffsetX ?? 0;
        module.doorOffsetY = json.doorOffsetY ?? 20;
        module.doorPivotX = json.doorPivotX ?? 0;
        module.doorPivotY = json.doorPivotY ?? 0;
        module.doorOpenAngle = json.doorOpenAngle ?? 70;
        module.doorOpenTime = json.doorOpenTime ?? 0.4;
        module.doorCloseTime = json.doorCloseTime ?? 0.3;
        module.doorHoldTime = json.doorHoldTime ?? 0.15;

        // Damage system
        module.damageEnabled = json.damageEnabled ?? true;
        module.bodyStrength = json.bodyStrength ?? 100;
        module.maxDeformation = json.maxDeformation ?? 12;
        module.deformationDecay = json.deformationDecay ?? 0;
        module.damageThreshold = json.damageThreshold ?? 50;
        module.damageCooldown = json.damageCooldown ?? 0.2;
        module.meshSubdivisions = json.meshSubdivisions ?? 3;
        
        // Realistic deformation
        module.deformRadius = json.deformRadius ?? 0.35;
        module.deformRadiusForceScale = json.deformRadiusForceScale ?? true;
        module.crumplePropagation = json.crumplePropagation ?? 0.6;
        module.crumpleIterations = json.crumpleIterations ?? 2;
        module.edgeSoftness = json.edgeSoftness ?? 1.5;
        module.centerRigidity = json.centerRigidity ?? 0.4;
        module.impactDirectional = json.impactDirectional ?? true;

        // Damage effects
        module.scratchEnabled = json.scratchEnabled ?? true;
        module.scratchColor = json.scratchColor ?? '#222222';
        module.dentEnabled = json.dentEnabled ?? true;
        module.dentColor = json.dentColor ?? 'rgba(0,0,0,0.3)';
        module.sparkOnHit = json.sparkOnHit ?? true;
        module.sparkColor = json.sparkColor ?? '#ffaa00';
        module.sparkCount = json.sparkCount ?? 8;

        // Smoke/fire
        module.smokeEnabled = json.smokeEnabled ?? true;
        module.smokeDamageThreshold = json.smokeDamageThreshold ?? 60;
        module.smokeColor = json.smokeColor ?? '#444444';
        module.fireEnabled = json.fireEnabled ?? true;
        module.fireDamageThreshold = json.fireDamageThreshold ?? 85;
        module.fireColor = json.fireColor ?? '#ff4400';

        // Windows
        module.windowEnabled = json.windowEnabled ?? true;
        module.windowColor = json.windowColor ?? '#88ccff';
        module.windowAlpha = json.windowAlpha ?? 0.6;
        module.windowBreakEnabled = json.windowBreakEnabled ?? true;
        module.windowBreakThreshold = json.windowBreakThreshold ?? 40;

        // Collision auto-resize
        module.autoResizeBoxCollider = json.autoResizeBoxCollider ?? false;

        return module;
    }

    clone() {
        return VehicleControllerRenderer.fromJSON(this.toJSON());
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.VehicleControllerRenderer = VehicleControllerRenderer;
}
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('VehicleControllerRenderer', VehicleControllerRenderer);
}
