/**
 * MovementController2DBrain Module
 * AI brain for controlling MovementController2D and VehicleController.
 * 
 * Features a state-based system with:
 * - followNodes: Follow nodes of a specific type from TilemapWorldGenerator
 * - flee: Flee from a target instance, using nodes loosely to avoid solids
 * - chase: Chase a target instance, ignoring nodes until target is too far
 * - goToPosition: Pathfind to any world position using A* algorithm
 * - driving: Control a vehicle using vehicle nodes
 * - carThief: Find nearest empty vehicle, enter it, and start driving
 * 
 * Requires:
 * - MovementController2D module on the same GameObject (with playerControlled = false)
 * - TilemapWorldGenerator with enableNodeSystem = true (for node following)
 * - VehicleController on any vehicle the NPC may drive
 */

class MovementController2DBrain extends Module {
    constructor() {
        super();
        
        // ── State Machine ──
        this.currentState = 'followNodes';   // 'followNodes', 'flee', 'chase', 'idle', 'goToPosition', 'driving', 'carThief'
        
        // ── Follow Nodes State ──
        this.followNodeId = 'pedestrian';    // Node type ID to follow
        this.followSpeed = 1.0;              // Speed multiplier for following
        this.nodeReachDistance = 8;          // Distance to consider node "reached"
        this.randomTurnChance = 0.3;         // Chance to pick random direction at intersections
        
        // ── Flee State ──
        this.fleeTargetId = '';              // GameObject._id of the instance to flee from
        this.fleeDistance = 200;             // Distance at which to stop fleeing
        this.fleeSpeed = 1.5;                // Speed multiplier when fleeing
        this.fleeTurnAngle = 90;             // Degrees to turn to avoid solids
        this.fleeUseNodes = true;            // Use node system loosely when fleeing
        
        // ── Chase State ──
        this.chaseTargetId = '';             // GameObject._id of the instance to chase
        this.chaseGiveUpDistance = 400;      // Distance at which to give up chasing
        this.chaseSpeed = 1.3;               // Speed multiplier when chasing
        this.chaseLoseDistance = 300;        // Distance at which target is "lost"
        this.chaseReturnState = 'followNodes'; // State to return to after giving up
        
        // ── Go To Position State (A* Pathfinding) ──
        this.targetX = 0;                    // World X position to navigate to
        this.targetY = 0;                    // World Y position to navigate to
        this.pathfindSpeed = 1.0;            // Speed multiplier when pathfinding
        this.pathfindNodeId = 'pedestrian';  // Node type to use for pathfinding
        this.pathfindCompleteDistance = 16;  // Distance to consider destination reached
        this.pathfindCompleteState = 'idle'; // State to switch to when destination reached
        
        // ── Driving State ──
        this.vehicleNodeId = 'vehicle';      // Node type for vehicle paths
        this.drivingSpeed = 0.7;             // Throttle amount (0-1)
        this.drivingTurnSpeed = 2.0;         // How sharp turns are
        this.drivingNodeReachDistance = 32;  // Distance to consider vehicle node reached
        this.drivingSide = 'right';          // Which side of road to drive on ('left' or 'right')
        this.obeyTrafficLights = true;       // Whether to stop at red lights
        this.stoppingDistance = 100;         // Distance to start braking before stops
        
        // ── Driving Speed Limits ──
        this.drivingMaxSpeedKmh = 60;           // Maximum AI driving speed in km/h (prevents zooming off)
        this.drivingCruiseSpeedKmh = 40;        // Target cruising speed in km/h
        this.drivingMinThrottle = 0.15;         // Minimum throttle when moving
        this.drivingSpeedLimitEnabled = true;   // Enable speed limiting based on velocity
        
        // ── Driving Obstacle Avoidance ──
        this.drivingObstacleDetection = true;   // Enable raycast obstacle detection
        this.drivingObstacleDistance = 180;     // Distance to detect obstacles ahead (px)
        this.drivingObstacleAvoidance = 0.5;    // Steering amount for avoidance (0-1)
        this.drivingEnableManeuvers = true;     // Enable 3-point turns when stuck
        this.drivingReverseTime = 0.6;          // Seconds to reverse during maneuver
        this.drivingMaxManeuverAttempts = 5;    // Max 3-point turn attempts before giving up
        
        // ── Car Thief Mode ──
        this.carThief = false;               // If true, NPC will steal nearest empty vehicle
        this.carThiefSearchRadius = 500;     // Radius to search for vehicles
        this.carThiefReturnState = 'driving'; // State after entering vehicle
        
        // ── Internal State ──
        this._movementController = null;
        this._tilemapWorldGen = null;
        this._currentNode = null;
        this._targetNode = null;
        this._prevNodes = [];                // Last 2 nodes for backtracking avoidance
        this._fleeTarget = null;             // Cached flee target GameObject
        this._chaseTarget = null;            // Cached chase target GameObject
        this._stuckTimer = 0;                // Time spent moving toward same target
        this._lastPosition = { x: 0, y: 0 };
        this._lastDirection = { x: 0, y: 0 };
        
        // ── Pathfinding Internal State ──
        this._path = [];                     // A* computed path (array of nodes)
        this._pathIndex = 0;                 // Current index in path
        this._pathComputeTimer = 0;          // Time since last path computation
        
        // ── Vehicle Internal State ──
        this._vehicleController = null;      // Cached VehicleController
        this._vehicleObject = null;          // Cached vehicle GameObject
        this._isInVehicle = false;           // Whether NPC is currently in a vehicle
        this._vehiclePath = [];              // A* path for vehicle
        this._vehiclePathIndex = 0;          // Current index in vehicle path
        this._targetVehicle = null;          // Vehicle to steal (carThief mode)
        this._approachingVehicle = false;    // Whether approaching vehicle to enter
        
        // ── Driving Maneuver State ──
        this._drivingManeuver = 'none';      // 'none', 'reversing', 'turning', 'forward'
        this._maneuverTimer = 0;             // Time in current maneuver phase
        this._maneuverTurnDir = 0;           // -1 = left, 1 = right
        this._maneuverAttempts = 0;          // Number of 3-point turn attempts
        this._lastObstacleTime = 0;          // Time since obstacle detected
        this._obstacleAheadDist = 999;       // Distance to obstacle ahead (999 = clear)
        this._obstacleLeftDist = 999;        // Distance to obstacle on left (999 = clear)
        this._obstacleRightDist = 999;       // Distance to obstacle on right (999 = clear)
        this._obstacleRearDist = 80;         // Distance to obstacle behind
        this._reverseTimer = 0;              // Time spent reversing
        this._vehicleStuckTimer = 0;         // Time vehicle has been stuck
        this._lastVehiclePos = { x: 0, y: 0 }; // For stuck detection
        
        // ── Physical Collision State ──
        this._physicalCollisionTimer = 0;    // Time since physical collision detected
        this._isPhysicallyColliding = false; // Currently touching another object
        this._collisionDirection = { x: 0, y: 0 }; // Direction to collision
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'AI,Movement';
    static is2D = true;
    
    static getIcon() {
        return '🧠';
    }
    
    static getDescription() {
        return 'AI brain for MovementController2D and VehicleController. State-based system for pathfinding, node following, fleeing, chasing, and driving.';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    
    getPropertyMetadata() {
        return [
            // ═══════════════════════════════════════
            //  STATE MACHINE
            // ═══════════════════════════════════════
            { type: 'header', label: '🧠 AI Brain' },
            { type: 'hint', label: 'Requires MovementController2D (with playerControlled = false) on the same object.' },
            {
                key: 'currentState',
                type: 'select',
                label: '🎯 Current State',
                default: 'followNodes',
                options: {
                    'idle': '💤 Idle (No Movement)',
                    'followNodes': '🚶 Follow Nodes',
                    'flee': '🏃 Flee from Target',
                    'chase': '🎯 Chase Target',
                    'goToPosition': '📍 Go To Position (A*)',
                    'driving': '🚗 Driving Vehicle',
                    'carThief': '🔓 Car Thief Mode'
                }
            },
            
            // ═══════════════════════════════════════
            //  FOLLOW NODES STATE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🚶 Follow Nodes' },
                { key: 'followNodeId', type: 'text', label: 'Node ID', default: 'pedestrian', hint: 'Node type to follow (e.g., "pedestrian", "vehicle")' },
                { key: 'followSpeed', type: 'slider', label: 'Speed Multiplier', default: 1.0, min: 0.1, max: 3, step: 0.1 },
                { key: 'nodeReachDistance', type: 'number', label: 'Reach Distance', default: 8, min: 1, max: 64, hint: 'Distance to consider node reached' },
                { key: 'randomTurnChance', type: 'slider', label: 'Random Turn Chance', default: 0.3, min: 0, max: 1, step: 0.05, hint: 'Chance to pick random direction at intersections' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  FLEE STATE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🏃 Flee State' },
                { type: 'hint', label: 'Flee from a specific GameObject by its _id. Use setFleeTarget() at runtime, or set fleeTargetId.' },
                { key: 'fleeTargetId', type: 'text', label: 'Target ID', default: '', hint: 'GameObject._id to flee from' },
                { key: 'fleeDistance', type: 'number', label: 'Safe Distance', default: 200, min: 50, max: 1000, hint: 'Stop fleeing when this far away' },
                { key: 'fleeSpeed', type: 'slider', label: 'Speed Multiplier', default: 1.5, min: 0.5, max: 3, step: 0.1 },
                { key: 'fleeTurnAngle', type: 'number', label: 'Turn Angle', default: 90, min: 45, max: 180, hint: 'Degrees to turn when hitting solid' },
                { key: 'fleeUseNodes', type: 'boolean', label: 'Use Nodes Loosely', default: true, hint: 'Prefer node paths while fleeing' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  CHASE STATE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🎯 Chase State' },
                { type: 'hint', label: 'Chase a specific GameObject by its _id. Ignores nodes until target is too far.' },
                { key: 'chaseTargetId', type: 'text', label: 'Target ID', default: '', hint: 'GameObject._id to chase' },
                { key: 'chaseGiveUpDistance', type: 'number', label: 'Give Up Distance', default: 400, min: 100, max: 2000, hint: 'Give up when target is this far' },
                { key: 'chaseSpeed', type: 'slider', label: 'Speed Multiplier', default: 1.3, min: 0.5, max: 3, step: 0.1 },
                { key: 'chaseReturnState', type: 'select', label: 'Return State', default: 'followNodes', options: { idle: 'Idle', followNodes: 'Follow Nodes' }, hint: 'State to return to after giving up' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  GO TO POSITION STATE (A* PATHFINDING)
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '📍 Go To Position' },
                { type: 'hint', label: 'Use goToPosition(x, y) at runtime to set destination. Uses A* pathfinding via nodes.' },
                { key: 'targetX', type: 'number', label: 'Target X', default: 0, hint: 'World X coordinate' },
                { key: 'targetY', type: 'number', label: 'Target Y', default: 0, hint: 'World Y coordinate' },
                { key: 'pathfindNodeId', type: 'text', label: 'Node ID', default: 'pedestrian', hint: 'Node type to use for pathfinding' },
                { key: 'pathfindSpeed', type: 'slider', label: 'Speed Multiplier', default: 1.0, min: 0.1, max: 3, step: 0.1 },
                { key: 'pathfindCompleteDistance', type: 'number', label: 'Complete Distance', default: 16, min: 4, max: 64, hint: 'Distance to consider destination reached' },
                { key: 'pathfindCompleteState', type: 'select', label: 'Complete State', default: 'idle', options: { idle: 'Idle', followNodes: 'Follow Nodes' }, hint: 'State after reaching destination' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  DRIVING STATE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🚗 Driving' },
                { type: 'hint', label: 'Controls a VehicleController. NPC must enter vehicle first (via carThief or enterVehicle()). Uses lane-aware pathfinding with obstacle avoidance.' },
                { key: 'vehicleNodeId', type: 'text', label: 'Vehicle Node ID', default: 'vehicle', hint: 'Node type for vehicle paths' },
                { key: 'drivingSpeed', type: 'slider', label: 'Max Throttle', default: 0.7, min: 0.1, max: 1.0, step: 0.05, hint: 'Maximum throttle (varies based on turns/obstacles)' },
                { key: 'drivingTurnSpeed', type: 'slider', label: 'Turn Speed', default: 2.0, min: 0.5, max: 5, step: 0.1 },
                { key: 'drivingNodeReachDistance', type: 'number', label: 'Node Reach Distance', default: 32, min: 8, max: 128, hint: 'Distance to consider vehicle node reached' },
                { key: 'drivingSide', type: 'select', label: 'Driving Side', default: 'right', options: { left: 'Left', right: 'Right' }, hint: 'Which side of the road to drive on' },
                { key: 'obeyTrafficLights', type: 'boolean', label: 'Obey Traffic Lights', default: true },
                { key: 'stoppingDistance', type: 'number', label: 'Stopping Distance', default: 100, min: 20, max: 300, hint: 'Distance to start braking before stops' },
                
                { type: 'header', label: '⏱️ Speed Limits' },
                { key: 'drivingSpeedLimitEnabled', type: 'boolean', label: 'Enable Speed Limiting', default: true, hint: 'Limit throttle based on current velocity (prevents zooming off in fast cars)' },
                { key: 'drivingMaxSpeedKmh', type: 'number', label: 'Max Speed (km/h)', default: 60, min: 20, max: 200, hint: 'Maximum AI driving speed' },
                { key: 'drivingCruiseSpeedKmh', type: 'number', label: 'Cruise Speed (km/h)', default: 40, min: 10, max: 150, hint: 'Target cruising speed on straight roads' },
                { key: 'drivingMinThrottle', type: 'slider', label: 'Min Throttle', default: 0.15, min: 0.05, max: 0.5, step: 0.05, hint: 'Minimum throttle when moving (keeps car rolling)' },
                
                { type: 'header', label: '🛡️ Obstacle Avoidance' },
                { key: 'drivingObstacleDetection', type: 'boolean', label: 'Enable Obstacle Detection', default: true, hint: 'Use raycasts to detect and avoid obstacles' },
                { key: 'drivingObstacleDistance', type: 'number', label: 'Detection Distance', default: 180, min: 60, max: 400, hint: 'Raycast distance for obstacle detection (px)' },
                { key: 'drivingObstacleAvoidance', type: 'slider', label: 'Avoidance Strength', default: 0.5, min: 0.1, max: 1.0, step: 0.1, hint: 'How hard to steer away from obstacles' },
                
                { type: 'header', label: '🔄 3-Point Turns' },
                { key: 'drivingEnableManeuvers', type: 'boolean', label: 'Enable 3-Point Turns', default: true, hint: 'Reverse and turn when target is behind or stuck' },
                { key: 'drivingReverseTime', type: 'slider', label: 'Reverse Duration', default: 0.6, min: 0.3, max: 1.5, step: 0.1, hint: 'Seconds to reverse during maneuver' },
                { key: 'drivingMaxManeuverAttempts', type: 'number', label: 'Max Attempts', default: 5, min: 1, max: 10, hint: 'Max 3-point turn attempts before giving up' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  CAR THIEF MODE
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🔓 Car Thief' },
                { type: 'hint', label: 'NPC will run to nearest empty vehicle, enter it, and start driving.' },
                { key: 'carThief', type: 'boolean', label: 'Enable Car Thief', default: false },
                { key: 'carThiefSearchRadius', type: 'number', label: 'Search Radius', default: 500, min: 100, max: 2000, hint: 'Distance to search for vehicles' },
                { key: 'carThiefReturnState', type: 'select', label: 'After Entering', default: 'driving', options: { driving: 'Start Driving', idle: 'Idle in Vehicle' }, hint: 'State after entering vehicle' },
            { type: 'groupEnd' },
            
            // ═══════════════════════════════════════
            //  DEBUG
            // ═══════════════════════════════════════
            { type: 'groupStart', label: '🔧 Debug' },
                {
                    type: 'custom',
                    render: function(container, module, editor) {
                        const state = module.currentState || 'unknown';
                        const node = module._currentNode;
                        const target = module._targetNode;
                        const inVehicle = module._isInVehicle;
                        const pathLen = module._path ? module._path.length : 0;
                        const obstAhead = module._obstacleAheadDist !== undefined ? module._obstacleAheadDist.toFixed(0) : '?';
                        const obstLeft = module._obstacleLeftDist !== undefined ? module._obstacleLeftDist.toFixed(0) : '?';
                        const obstRight = module._obstacleRightDist !== undefined ? module._obstacleRightDist.toFixed(0) : '?';
                        container.innerHTML = `<div style="padding: 8px; background: #1a1a2e; border-radius: 4px; font-size: 12px;">
                            <strong>State:</strong> ${state}<br>
                            <strong>Current Node:</strong> ${node ? `(${node.tileX}, ${node.tileY})` : 'None'}<br>
                            <strong>Target Node:</strong> ${target ? `(${target.tileX}, ${target.tileY})` : 'None'}<br>
                            <strong>In Vehicle:</strong> ${inVehicle ? 'Yes' : 'No'}<br>
                            <strong>Path Length:</strong> ${pathLen}<br>
                            ${inVehicle ? `<strong>Obstacles:</strong> F:${obstAhead} L:${obstLeft} R:${obstRight}` : ''}
                        </div>`;
                    }
                },
            { type: 'groupEnd' },
        ];
    }
    
    // ==================== LIFECYCLE ====================
    
    start() {
        // Get MovementController2D
        this._movementController = this.gameObject.getModule('MovementController2D');
        if (this._movementController) {
            // Ensure playerControlled is false for AI control
            this._movementController.playerControlled = false;
        }
        
        // Find TilemapWorldGenerator in scene
        this._tilemapWorldGen = this._findTilemapWorldGenerator();
        
        // We do NOT acquire nodes here because the NPC may be spawned far offscreen.
        // Node acquisition is done lazily in loop() once positioned.
        this._nodesInitialized = false;
        
        this._lastPosition = { x: this.gameObject.position.x, y: this.gameObject.position.y };
    }
    
    loop(deltaTime) {
        if (!this._movementController) {
            this._movementController = this.gameObject.getModule('MovementController2D');
            if (this._movementController) {
                this._movementController.playerControlled = false;
            }
            if (!this._movementController) {
                // Only log once per second to avoid spam
                if (!this._lastMCWarn || Date.now() - this._lastMCWarn > 5000) {
                    //console.warn('[MovementController2DBrain] No MovementController2D found on', this.gameObject.name || this.gameObject._id);
                    this._lastMCWarn = Date.now();
                }
                return;
            }
        }
        
        // Lazy node initialization — wait until positioned at a meaningful location
        if (!this._nodesInitialized) {
            if (!this._tilemapWorldGen) {
                this._tilemapWorldGen = this._findTilemapWorldGenerator();
                if (!this._tilemapWorldGen) {
                    // Only log once per 5 seconds
                    if (!this._lastTWGWarn || Date.now() - this._lastTWGWarn > 5000) {
                        //console.warn('[MovementController2DBrain] TilemapWorldGenerator not found in scene');
                        this._lastTWGWarn = Date.now();
                    }
                }
            }
            if (this._tilemapWorldGen && this.gameObject.position.x > -9000) {
                const allNodes = this._tilemapWorldGen.getNodesOfType(this.followNodeId);
                //console.log(`[MovementController2DBrain] Found ${allNodes.length} nodes of type "${this.followNodeId}"`);
                
                this._currentNode = this._tilemapWorldGen.getNearestNode(
                    this.gameObject.position.x,
                    this.gameObject.position.y,
                    this.followNodeId
                );
                if (this._currentNode) {
                    //console.log(`[MovementController2DBrain] Initialized at node (${this._currentNode.tileX}, ${this._currentNode.tileY})`);
                    this._pickNextNode();
                    this._nodesInitialized = true;
                } else {
                    //console.warn(`[MovementController2DBrain] No nearest node found for "${this.followNodeId}" near (${this.gameObject.position.x.toFixed(0)}, ${this.gameObject.position.y.toFixed(0)})`);
                }
            }
        }
        
        // Update based on current state
        switch (this.currentState) {
            case 'followNodes':
                this._updateFollowNodes(deltaTime);
                break;
            case 'flee':
                this._updateFlee(deltaTime);
                break;
            case 'chase':
                this._updateChase(deltaTime);
                break;
            case 'goToPosition':
                this._updateGoToPosition(deltaTime);
                break;
            case 'driving':
                this._updateDriving(deltaTime);
                break;
            case 'carThief':
                this._updateCarThief(deltaTime);
                break;
            case 'idle':
            default:
                // If in vehicle, stop the vehicle; otherwise stop walking
                if (this._isInVehicle && this._vehicleController) {
                    this._vehicleController.setThrottle(0);
                    this._vehicleController.setBrake(0.5);
                    this._vehicleController.setSteering(0);
                } else if (this._movementController) {
                    this._movementController.inputX = 0;
                    this._movementController.inputY = 0;
                }
                break;
        }
        
        // Keep NPC position synced with vehicle (for all states while in vehicle)
        if (this._isInVehicle && this._vehicleObject) {
            this.gameObject.position.x = this._vehicleObject.position.x;
            this.gameObject.position.y = this._vehicleObject.position.y;
        }
        
        // Check for stuck (only when on foot)
        if (!this._isInVehicle) {
            this._checkStuck(deltaTime);
        }
    }
    
    // ==================== STATE: FOLLOW NODES ====================
    
    _updateFollowNodes(deltaTime) {
        if (!this._tilemapWorldGen || !this._targetNode) {
            // No node system or no target - idle
            this._movementController.inputX = 0;
            this._movementController.inputY = 0;
            return;
        }
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        
        // Check if we've reached the target node
        const dx = this._targetNode.worldX - x;
        const dy = this._targetNode.worldY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.nodeReachDistance) {
            // Reached node - update current and pick next
            this._updatePrevNodes(this._currentNode);
            this._currentNode = this._targetNode;
            this._updateNPCNode();
            this._pickNextNode();
            return;
        }
        
        // Move toward target node
        const len = dist > 0 ? dist : 1;
        this._movementController.inputX = (dx / len) * this.followSpeed;
        this._movementController.inputY = (dy / len) * this.followSpeed;
        
        // Clamp
        this._clampInput();
    }
    
    _pickNextNode() {
        if (!this._tilemapWorldGen) return;
        
        // Use random turn chance at intersections
        let preferDirection = null;
        if (this._currentNode && this._currentNode.connections && this._currentNode.connections.length > 2) {
            // At intersection - maybe pick random direction
            if (Math.random() > this.randomTurnChance && this._lastDirection.x !== 0 || this._lastDirection.y !== 0) {
                // Continue in same direction
                if (Math.abs(this._lastDirection.x) > Math.abs(this._lastDirection.y)) {
                    preferDirection = this._lastDirection.x > 0 ? 'east' : 'west';
                } else {
                    preferDirection = this._lastDirection.y > 0 ? 'south' : 'north';
                }
            }
        }
        
        this._targetNode = this._tilemapWorldGen.getNextNode(
            this._currentNode,
            this._prevNodes,
            preferDirection
        );
        
        // Update last direction
        if (this._currentNode && this._targetNode) {
            this._lastDirection = {
                x: this._targetNode.worldX - this._currentNode.worldX,
                y: this._targetNode.worldY - this._currentNode.worldY
            };
        }
    }
    
    // ==================== STATE: FLEE ====================
    
    _updateFlee(deltaTime) {
        // Find flee target
        if (!this._fleeTarget && this.fleeTargetId) {
            this._fleeTarget = this._findGameObjectById(this.fleeTargetId);
        }
        
        if (!this._fleeTarget || !this._fleeTarget.enabled) {
            // No target - return to follow nodes
            this.setState('followNodes');
            return;
        }
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        const tx = this._fleeTarget.position.x;
        const ty = this._fleeTarget.position.y;
        
        // Check distance
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > this.fleeDistance) {
            // Safe - return to following nodes
            this.setState('followNodes');
            return;
        }
        
        // Flee in opposite direction
        let fleeX = -dx;
        let fleeY = -dy;
        const len = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
        fleeX /= len;
        fleeY /= len;
        
        // Use nodes loosely - prefer node directions if available
        if (this.fleeUseNodes && this._tilemapWorldGen) {
            const nearestNode = this._tilemapWorldGen.getNearestNode(x, y, this.followNodeId);
            if (nearestNode && nearestNode.connections && nearestNode.connections.length > 0) {
                // Find connection most aligned with flee direction
                let bestConn = null;
                let bestDot = -Infinity;
                
                for (const conn of nearestNode.connections) {
                    const cdx = conn.node.worldX - x;
                    const cdy = conn.node.worldY - y;
                    const clen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
                    const dot = (cdx / clen) * fleeX + (cdy / clen) * fleeY;
                    
                    if (dot > bestDot) {
                        bestDot = dot;
                        bestConn = conn;
                    }
                }
                
                if (bestConn && bestDot > 0.3) {
                    // Use node direction
                    const cdx = bestConn.node.worldX - x;
                    const cdy = bestConn.node.worldY - y;
                    const clen = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
                    fleeX = cdx / clen;
                    fleeY = cdy / clen;
                }
            }
        }
        
        // Check for solid ahead and turn if needed
        if (this._wouldHitSolid(x + fleeX * 16, y + fleeY * 16)) {
            // Turn to avoid solid
            const turnRad = (this.fleeTurnAngle * Math.PI) / 180;
            const newX = fleeX * Math.cos(turnRad) - fleeY * Math.sin(turnRad);
            const newY = fleeX * Math.sin(turnRad) + fleeY * Math.cos(turnRad);
            
            // 50% chance to turn left or right
            if (Math.random() > 0.5) {
                fleeX = newX;
                fleeY = newY;
            } else {
                fleeX = fleeX * Math.cos(-turnRad) - fleeY * Math.sin(-turnRad);
                fleeY = fleeX * Math.sin(-turnRad) + fleeY * Math.cos(-turnRad);
            }
        }
        
        this._movementController.inputX = fleeX * this.fleeSpeed;
        this._movementController.inputY = fleeY * this.fleeSpeed;
        this._clampInput();
    }
    
    // ==================== STATE: CHASE ====================
    
    _updateChase(deltaTime) {
        // Find chase target
        if (!this._chaseTarget && this.chaseTargetId) {
            this._chaseTarget = this._findGameObjectById(this.chaseTargetId);
        }
        
        if (!this._chaseTarget || !this._chaseTarget.enabled) {
            // No target - return to default state
            this.setState(this.chaseReturnState);
            return;
        }
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        const tx = this._chaseTarget.position.x;
        const ty = this._chaseTarget.position.y;
        
        // Check distance
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > this.chaseGiveUpDistance) {
            // Target too far - give up
            this.setState(this.chaseReturnState);
            return;
        }
        
        // Move directly toward target
        const len = dist > 0 ? dist : 1;
        this._movementController.inputX = (dx / len) * this.chaseSpeed;
        this._movementController.inputY = (dy / len) * this.chaseSpeed;
        this._clampInput();
    }
    
    // ==================== STATE: GO TO POSITION (A* PATHFINDING) ====================
    
    _updateGoToPosition(deltaTime) {
        if (!this._tilemapWorldGen) return;
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        
        // Check if we've reached the destination
        const dx = this.targetX - x;
        const dy = this.targetY - y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        if (distToTarget < this.pathfindCompleteDistance) {
            // Reached destination
            this.setState(this.pathfindCompleteState);
            this._path = [];
            this._pathIndex = 0;
            return;
        }
        
        // Compute path if we don't have one or need to recalculate
        if (this._path.length === 0 || this._pathIndex >= this._path.length) {
            this._computePath(this.targetX, this.targetY, this.pathfindNodeId);
            this._pathIndex = 0;
            
            if (this._path.length === 0) {
                // No path found - move directly
                const len = distToTarget > 0 ? distToTarget : 1;
                this._movementController.inputX = (dx / len) * this.pathfindSpeed;
                this._movementController.inputY = (dy / len) * this.pathfindSpeed;
                this._clampInput();
                return;
            }
        }
        
        // Follow the computed path
        const targetNode = this._path[this._pathIndex];
        if (!targetNode) {
            this._path = [];
            return;
        }
        
        const ndx = targetNode.worldX - x;
        const ndy = targetNode.worldY - y;
        const nodeDist = Math.sqrt(ndx * ndx + ndy * ndy);
        
        if (nodeDist < this.nodeReachDistance) {
            // Reached this node, move to next
            this._pathIndex++;
            return;
        }
        
        // Move toward current path node
        const nlen = nodeDist > 0 ? nodeDist : 1;
        this._movementController.inputX = (ndx / nlen) * this.pathfindSpeed;
        this._movementController.inputY = (ndy / nlen) * this.pathfindSpeed;
        this._clampInput();
    }
    
    // ==================== STATE: DRIVING ====================
    
    _updateDriving(deltaTime) {
        // Ensure we have a vehicle controller
        if (!this._isInVehicle || !this._vehicleController) {
            // Not in a vehicle - switch to idle
            this.setState('idle');
            return;
        }
        
        // Keep NPC position synced with vehicle
        if (this._vehicleObject) {
            this.gameObject.position.x = this._vehicleObject.position.x;
            this.gameObject.position.y = this._vehicleObject.position.y;
        }
        
        if (!this._tilemapWorldGen) {
            this._tilemapWorldGen = this._findTilemapWorldGenerator();
            if (!this._tilemapWorldGen) {
                // No tilemap - just drive forward slowly
                this._vehicleController.setThrottle(this.drivingSpeed * 0.5);
                this._vehicleController.setSteering(0);
                this._vehicleController.setBrake(0);
                return;
            }
        }
        
        const vc = this._vehicleController;
        const vgo = this._vehicleObject;
        const vx = vgo.position.x;
        const vy = vgo.position.y;
        const vAngle = vgo.angle * (Math.PI / 180);
        
        // Check for obstacles using raycasts
        this._updateObstacleDetection(vx, vy, vAngle);
        
        // Check for PHYSICAL collisions (actual overlaps, not just raycasts)
        this._updatePhysicalCollisionDetection(vx, vy, vAngle, deltaTime);
        
        // Check if stuck
        this._updateVehicleStuckDetection(vx, vy, deltaTime);
        
        // Get current vehicle node if not set
        if (!this._currentNode) {
            this._currentNode = this._tilemapWorldGen.getNearestNode(vx, vy, this.vehicleNodeId);
            if (this._currentNode) {
                this._pickNextVehicleNode();
            } else {
                // No nodes found - drive forward slowly
                vc.setThrottle(this.drivingSpeed * 0.3);
                vc.setSteering(0);
                vc.setBrake(0);
                return;
            }
        }
        
        if (!this._targetNode) {
            this._pickNextVehicleNode();
            if (!this._targetNode) {
                // No target - idle
                vc.setThrottle(0);
                vc.setBrake(0.3);
                vc.setSteering(0);
                return;
            }
        }
        
        // Calculate direction to target node
        const dx = this._targetNode.worldX - vx;
        const dy = this._targetNode.worldY - vy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if we've reached the target node
        if (dist < this.drivingNodeReachDistance) {
            this._updatePrevNodes(this._currentNode);
            this._currentNode = this._targetNode;
            this._pickNextVehicleNode();
            this._drivingManeuver = 'none';
            this._maneuverAttempts = 0;
            return;
        }
        
        // Calculate angle to target
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - vAngle;
        
        // Normalize angle difference to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Get expected lane direction from tile role
        const laneExpectedDir = this._getLaneExpectedDirection(this._currentNode);
        
        // Check if we need to do a maneuver (target is behind us or we're stuck)
        if (this.drivingEnableManeuvers) {
            const targetIsBehind = Math.abs(angleDiff) > Math.PI * 0.65;
            
            // More responsive stuck detection
            // If obstacle is close ahead AND we haven't moved much, we're probably stuck
            const stuckByObstacle = this._obstacleAheadDist < 50 && this._vehicleStuckTimer > 0.5;
            const veryStuck = this._vehicleStuckTimer > 1.0;
            
            // PHYSICAL collision detection - if we're touching something, react immediately
            const physicallyStuck = this._isPhysicallyColliding && this._physicalCollisionTimer > 0.15;
            
            const needsManeuver = targetIsBehind || stuckByObstacle || veryStuck || physicallyStuck;
            
            // Handle maneuver state machine (3-point turn)
            if (needsManeuver && this._drivingManeuver === 'none') {
                this._startManeuver(angleDiff);
            }
        }
        
        if (this._drivingManeuver !== 'none') {
            this._executeManeuver(deltaTime, angleDiff, vc);
            return;
        }
        
        // Normal driving - navigate to target with obstacle avoidance
        this._executeDriving(angleDiff, dist, laneExpectedDir, vc);
    }
    
    /**
     * Update obstacle detection using raycasts
     */
    _updateObstacleDetection(vx, vy, vAngle) {
        // Skip if obstacle detection is disabled
        if (!this.drivingObstacleDetection) {
            this._obstacleAheadDist = 999;
            this._obstacleLeftDist = 999;
            this._obstacleRightDist = 999;
            this._obstacleRearDist = 60;
            return;
        }
        
        // Only update every 2 frames for performance (not 3 - need faster response)
        if (!this._obstacleCheckFrame) this._obstacleCheckFrame = 0;
        this._obstacleCheckFrame++;
        if (this._obstacleCheckFrame % 2 !== 0) return;
        
        // Check if raycastAllDir is available (we need all hits to filter our own vehicle)
        const useAllDir = typeof raycastAllDir === 'function';
        if (!useAllDir && typeof raycastDir !== 'function') {
            this._obstacleAheadDist = 999;
            this._obstacleLeftDist = 999;
            this._obstacleRightDist = 999;
            this._obstacleRearDist = 60;
            return;
        }
        
        const forwardX = Math.cos(vAngle);
        const forwardY = Math.sin(vAngle);
        const rightX = -Math.sin(vAngle);
        const rightY = Math.cos(vAngle);
        
        // Cast rays - use configurable distance
        const rayDist = this.drivingObstacleDistance;
        
        // Reference to our vehicle AND our own NPC gameObject for filtering
        const ownVehicle = this._vehicleObject;
        const ownNPC = this.gameObject;
        
        // Helper to filter out own vehicle from hits
        const getFilteredHit = (hits) => {
            if (!hits) return null;
            // If it's an array (from raycastAllDir), find first hit that isn't our vehicle or NPC
            if (Array.isArray(hits)) {
                for (const hit of hits) {
                    if (hit && hit.gameObject && hit.gameObject !== ownVehicle && hit.gameObject !== ownNPC) {
                        return hit;
                    }
                }
                return null;
            }
            // Single hit - check if it's our vehicle or NPC
            if (!hits.gameObject) return hits; // No gameObject info, assume valid
            if (hits.gameObject === ownVehicle || hits.gameObject === ownNPC) return null;
            return hits;
        };
        
        // Use larger forward offset to ensure rays start outside vehicle bounds
        const frontOffset = 55;  // Increased from 45
        const sideOffset = 35;   // Increased from 30
        
        // Forward ray (ahead of vehicle)
        const aheadStartX = vx + forwardX * frontOffset;
        const aheadStartY = vy + forwardY * frontOffset;
        const hitAhead = useAllDir 
            ? getFilteredHit(raycastAllDir(aheadStartX, aheadStartY, forwardX, forwardY, rayDist, ''))
            : getFilteredHit(raycastDir(aheadStartX, aheadStartY, forwardX, forwardY, rayDist, ''));
        this._obstacleAheadDist = hitAhead ? hitAhead.distance : rayDist;
        
        // Forward-left ray - start from front-left corner of vehicle, wider angle for better side detection
        const leftAngle = vAngle - Math.PI / 4;  // 45 degrees left instead of 30
        const leftStartX = vx + forwardX * frontOffset * 0.6 - rightX * sideOffset;
        const leftStartY = vy + forwardY * frontOffset * 0.6 - rightY * sideOffset;
        const hitLeft = useAllDir
            ? getFilteredHit(raycastAllDir(leftStartX, leftStartY, Math.cos(leftAngle), Math.sin(leftAngle), rayDist * 0.7, ''))
            : getFilteredHit(raycastDir(leftStartX, leftStartY, Math.cos(leftAngle), Math.sin(leftAngle), rayDist * 0.7, ''));
        this._obstacleLeftDist = hitLeft ? hitLeft.distance : rayDist;
        
        // Forward-right ray - start from front-right corner of vehicle, wider angle
        const rightAngle = vAngle + Math.PI / 4;  // 45 degrees right instead of 30
        const rightStartX = vx + forwardX * frontOffset * 0.6 + rightX * sideOffset;
        const rightStartY = vy + forwardY * frontOffset * 0.6 + rightY * sideOffset;
        const hitRight = useAllDir
            ? getFilteredHit(raycastAllDir(rightStartX, rightStartY, Math.cos(rightAngle), Math.sin(rightAngle), rayDist * 0.7, ''))
            : getFilteredHit(raycastDir(rightStartX, rightStartY, Math.cos(rightAngle), Math.sin(rightAngle), rayDist * 0.7, ''));
        this._obstacleRightDist = hitRight ? hitRight.distance : rayDist;
        
        // Rear ray for reversing
        const rearStartX = vx - forwardX * frontOffset;
        const rearStartY = vy - forwardY * frontOffset;
        const hitRear = useAllDir
            ? getFilteredHit(raycastAllDir(rearStartX, rearStartY, -forwardX, -forwardY, 80, ''))
            : getFilteredHit(raycastDir(rearStartX, rearStartY, -forwardX, -forwardY, 80, ''));
        this._obstacleRearDist = hitRear ? hitRear.distance : 80;
    }
    
    /**
     * Detect if vehicle is stuck
     */
    _updateVehicleStuckDetection(vx, vy, deltaTime) {
        const dx = vx - this._lastVehiclePos.x;
        const dy = vy - this._lastVehiclePos.y;
        const moved = Math.sqrt(dx * dx + dy * dy);
        
        if (moved < 0.5) {
            this._vehicleStuckTimer += deltaTime;
        } else {
            this._vehicleStuckTimer = 0;
        }
        
        this._lastVehiclePos = { x: vx, y: vy };
    }
    
    /**
     * Detect PHYSICAL collisions using actual collider overlaps
     * This catches collisions that rays miss (e.g., already overlapping)
     */
    _updatePhysicalCollisionDetection(vx, vy, vAngle, deltaTime) {
        if (!this._vehicleObject) {
            this._isPhysicallyColliding = false;
            return;
        }
        
        // Get our vehicle's collider
        const vgo = this._vehicleObject;
        const myCollider = vgo.getModule ? (
            vgo.getModule('BoxCollider') || 
            vgo.getModule('SphereCollider') ||
            vgo.getModule('PolygonCollider')
        ) : null;
        
        if (!myCollider) {
            this._isPhysicallyColliding = false;
            return;
        }
        
        const myBounds = myCollider.getBounds ? myCollider.getBounds() : null;
        if (!myBounds) {
            this._isPhysicallyColliding = false;
            return;
        }
        
        // Find nearby objects
        const searchRadius = Math.max(myBounds.width, myBounds.height) * 2;
        let nearbyObjects;
        if (typeof instancesInRadius === 'function') {
            nearbyObjects = instancesInRadius(vx, vy, searchRadius);
        } else {
            const engine = window.gameEngine;
            if (!engine) {
                this._isPhysicallyColliding = false;
                return;
            }
            nearbyObjects = engine.instances.filter(inst => {
                if (inst === vgo || inst === this.gameObject) return false;
                const dx = inst.position.x - vx;
                const dy = inst.position.y - vy;
                return (dx * dx + dy * dy) <= searchRadius * searchRadius;
            });
        }
        
        let foundCollision = false;
        let collisionDx = 0;
        let collisionDy = 0;
        
        for (const otherObj of nearbyObjects) {
            if (otherObj === vgo || otherObj === this.gameObject) continue;
            
            // Get other object's collider
            const otherCollider = otherObj.getModule ? (
                otherObj.getModule('BoxCollider') || 
                otherObj.getModule('SphereCollider') ||
                otherObj.getModule('PolygonCollider')
            ) : null;
            
            if (!otherCollider) continue;
            
            // Check overlap
            let isOverlapping = false;
            if (typeof myCollider.overlaps === 'function') {
                isOverlapping = myCollider.overlaps(otherCollider);
            } else if (typeof otherCollider.overlaps === 'function') {
                isOverlapping = otherCollider.overlaps(myCollider);
            } else {
                // Fallback to AABB check
                const otherBounds = otherCollider.getBounds ? otherCollider.getBounds() : null;
                if (otherBounds) {
                    isOverlapping = !(myBounds.x + myBounds.width < otherBounds.x ||
                                     myBounds.x > otherBounds.x + otherBounds.width ||
                                     myBounds.y + myBounds.height < otherBounds.y ||
                                     myBounds.y > otherBounds.y + otherBounds.height);
                }
            }
            
            if (isOverlapping) {
                foundCollision = true;
                collisionDx += otherObj.position.x - vx;
                collisionDy += otherObj.position.y - vy;
            }
        }
        
        if (foundCollision) {
            this._physicalCollisionTimer += deltaTime;
            this._isPhysicallyColliding = true;
            const len = Math.sqrt(collisionDx * collisionDx + collisionDy * collisionDy) || 1;
            this._collisionDirection = { x: collisionDx / len, y: collisionDy / len };
        } else {
            this._physicalCollisionTimer = 0;
            this._isPhysicallyColliding = false;
            this._collisionDirection = { x: 0, y: 0 };
        }
    }
    
    /**
     * Get expected driving direction from lane role
     * @param {object} node - Current node
     * @returns {object|null} { angle, dx, dy } or null
     */
    _getLaneExpectedDirection(node) {
        if (!node || !node.role) return null;
        
        const role = node.role;
        
        // Determine expected direction based on lane role
        // roadVertLeft = driving north/up (angle = -90deg)
        // roadVertRight = driving south/down (angle = 90deg)
        // roadHorizTop = driving east/right (angle = 0deg)  
        // roadHorizBottom = driving west/left (angle = 180deg)
        // For right-side driving countries
        switch (role) {
            case 'roadVertLeft':
                return { angle: -Math.PI / 2, dx: 0, dy: -1 };  // North
            case 'roadVertRight':
                return { angle: Math.PI / 2, dx: 0, dy: 1 };    // South
            case 'roadHorizTop':
                return { angle: 0, dx: 1, dy: 0 };              // East
            case 'roadHorizBottom':
                return { angle: Math.PI, dx: -1, dy: 0 };       // West
            case 'intersection':
                return null; // Any direction OK at intersection
            default:
                return null;
        }
    }
    
    /**
     * Start a maneuver (3-point turn or reverse)
     */
    _startManeuver(angleDiff) {
        this._drivingManeuver = 'reversing';
        this._maneuverTimer = 0;
        this._maneuverAttempts++;
        
        // Determine turn direction based on:
        // 1. Physical collision direction (if colliding, turn away from it)
        // 2. Which side has more clearance (prefer turning toward clearer side)
        // 3. Target direction if sides are similar
        
        // First check physical collision direction
        if (this._isPhysicallyColliding && (this._collisionDirection.x !== 0 || this._collisionDirection.y !== 0)) {
            // Get vehicle's forward and right vectors
            const vAngle = this._vehicleObject ? this._vehicleObject.angle * Math.PI / 180 : 0;
            const rightX = -Math.sin(vAngle);
            const rightY = Math.cos(vAngle);
            
            // Collision is on which side of us?
            const collisionOnRight = this._collisionDirection.x * rightX + this._collisionDirection.y * rightY;
            
            if (Math.abs(collisionOnRight) > 0.3) {
                // Clear side preference from physical collision
                this._maneuverTurnDir = collisionOnRight > 0 ? -1 : 1;  // Turn away from collision
                return;
            }
        }
        
        // Fall back to raycast-based decision
        const leftClearer = this._obstacleLeftDist > this._obstacleRightDist + 30;
        const rightClearer = this._obstacleRightDist > this._obstacleLeftDist + 30;
        
        if (leftClearer) {
            this._maneuverTurnDir = -1;  // Turn left
        } else if (rightClearer) {
            this._maneuverTurnDir = 1;   // Turn right
        } else {
            // Sides are similar - turn toward target
            this._maneuverTurnDir = angleDiff > 0 ? 1 : -1;
        }
        
        // console.log('[MovementController2DBrain] Starting maneuver, turn dir:', this._maneuverTurnDir, 'L:', this._obstacleLeftDist.toFixed(0), 'R:', this._obstacleRightDist.toFixed(0));
    }
    
    /**
     * Execute current maneuver state
     */
    _executeManeuver(deltaTime, angleDiff, vc) {
        this._maneuverTimer += deltaTime;
        
        // Safety: abort after too many attempts (use configurable max)
        if (this._maneuverAttempts > this.drivingMaxManeuverAttempts) {
            this._drivingManeuver = 'none';
            this._maneuverAttempts = 0;
            // Pick a new node - we're probably stuck in a bad spot
            this._currentNode = this._tilemapWorldGen.getNearestNode(
                this._vehicleObject.position.x,
                this._vehicleObject.position.y,
                this.vehicleNodeId
            );
            this._prevNodes = [];
            this._pickNextVehicleNode();
            return;
        }
        
        switch (this._drivingManeuver) {
            case 'reversing':
                // Reverse while turning wheel to set up for going around obstacle
                // When reversing, steer OPPOSITE to intended direction (rear swings the other way)
                const reverseSteer = -this._maneuverTurnDir * 0.9;
                vc.setThrottle(-0.5);  // Reverse
                vc.setSteering(reverseSteer);
                vc.setBrake(0);
                vc.setHandbrake(false);
                
                // Check if we've reversed enough, hit obstacle behind, or cleared the front
                const reverseTime = this.drivingReverseTime + Math.random() * 0.2;
                const clearedFront = this._obstacleAheadDist > 100;  // Front is clear now
                const hitRear = this._obstacleRearDist < 25;  // About to hit something behind
                
                if (this._maneuverTimer > reverseTime || hitRear || clearedFront) {
                    this._drivingManeuver = 'turning';
                    this._maneuverTimer = 0;
                }
                break;
                
            case 'turning':
                // Turn toward clearer direction while moving forward
                const turnSteer = this._maneuverTurnDir * 1.0;
                vc.setThrottle(0.45);
                vc.setSteering(turnSteer);
                vc.setBrake(0);
                vc.setHandbrake(false);
                
                // Re-check which side is clearer - adapt turn direction if needed
                if (this._maneuverTimer > 0.2) {
                    const leftNowClearer = this._obstacleLeftDist > this._obstacleRightDist + 50;
                    const rightNowClearer = this._obstacleRightDist > this._obstacleLeftDist + 50;
                    if (leftNowClearer && this._maneuverTurnDir > 0) {
                        this._maneuverTurnDir = -1;  // Switch to turning left
                    } else if (rightNowClearer && this._maneuverTurnDir < 0) {
                        this._maneuverTurnDir = 1;   // Switch to turning right
                    }
                }
                
                // Check completion conditions
                const turnTime = 0.6 + Math.random() * 0.3;
                const nowFacingTarget = Math.abs(angleDiff) < Math.PI * 0.4;
                const frontCleared = this._obstacleAheadDist > 80;
                
                if ((nowFacingTarget && frontCleared) || this._maneuverTimer > turnTime) {
                    // Check if we need another iteration
                    if (this._obstacleAheadDist < 50 && this._maneuverAttempts < this.drivingMaxManeuverAttempts - 1) {
                        // Still blocked ahead, do another reverse
                        this._drivingManeuver = 'reversing';
                        this._maneuverTimer = 0;
                    } else {
                        // Done with maneuver
                        this._drivingManeuver = 'none';
                        this._maneuverTimer = 0;
                        this._maneuverAttempts = 0;  // Reset attempts on success
                    }
                }
                break;
                
            default:
                this._drivingManeuver = 'none';
                break;
        }
    }
    
    /**
     * Execute normal driving toward target with obstacle avoidance
     */
    _executeDriving(angleDiff, dist, laneDir, vc) {
        // IMMEDIATE PHYSICAL COLLISION RESPONSE - highest priority
        if (this._isPhysicallyColliding) {
            // We're touching something! Brake and steer away immediately
            vc.setThrottle(0);
            vc.setBrake(0.8);
            
            // Steer away from collision direction
            if (this._collisionDirection.x !== 0 || this._collisionDirection.y !== 0) {
                const vAngle = this._vehicleObject ? this._vehicleObject.angle * Math.PI / 180 : 0;
                const rightX = -Math.sin(vAngle);
                const rightY = Math.cos(vAngle);
                
                // Which side is the collision on?
                const collisionOnRight = this._collisionDirection.x * rightX + this._collisionDirection.y * rightY;
                const emergencySteer = collisionOnRight > 0 ? -0.9 : 0.9;  // Steer away
                vc.setSteering(emergencySteer);
            } else {
                // No clear direction - just pick based on raycast data
                const emergencySteer = this._obstacleLeftDist > this._obstacleRightDist ? -0.8 : 0.8;
                vc.setSteering(emergencySteer);
            }
            vc.setHandbrake(false);
            return;
        }
        
        // EMERGENCY CHECK: If obstacle is close ahead, brake and steer away
        // Note: ray starts ~55px ahead of vehicle, so add that to get actual distance
        if (this._obstacleAheadDist < 60) {
            // Emergency brake - obstacle is close
            const urgency = 1 - (this._obstacleAheadDist / 60);
            vc.setThrottle(0);
            vc.setBrake(0.5 + urgency * 0.5);
            
            // Steer away from the obstacle - pick the clearer side
            let emergencySteer = 0;
            if (this._obstacleLeftDist > this._obstacleRightDist + 20) {
                emergencySteer = -0.8;  // Turn left
            } else if (this._obstacleRightDist > this._obstacleLeftDist + 20) {
                emergencySteer = 0.8;   // Turn right
            } else {
                // Both sides similar - use angle difference to decide
                emergencySteer = angleDiff > 0 ? 0.6 : -0.6;
            }
            vc.setSteering(emergencySteer);
            vc.setHandbrake(false);
            
            // If we're stopped and obstacle is super close, trigger a maneuver
            if (this._obstacleAheadDist < 20 && this.drivingEnableManeuvers && this._drivingManeuver === 'none') {
                this._startManeuver(angleDiff);
            }
            return;
        }
        
        // Base steering from angle difference
        let steerAmount = Math.max(-1, Math.min(1, angleDiff * this.drivingTurnSpeed * 0.7));
        
        // Obstacle avoidance - steer away from obstacles (use configurable avoidance strength)
        // Use full detection distance as threshold for smoother avoidance
        const obstacleThreshold = this.drivingObstacleDistance * 0.7;
        const avoidStrength = this.drivingObstacleAvoidance;
        
        // Also consider forward obstacle for steering
        if (this._obstacleAheadDist < obstacleThreshold) {
            // Obstacle ahead - steer toward the clearer side
            const aheadUrgency = 1 - (this._obstacleAheadDist / obstacleThreshold);
            if (this._obstacleLeftDist > this._obstacleRightDist) {
                steerAmount -= avoidStrength * aheadUrgency;  // Steer left
            } else {
                steerAmount += avoidStrength * aheadUrgency;  // Steer right
            }
        }
        
        if (this._obstacleLeftDist < obstacleThreshold && this._obstacleRightDist >= obstacleThreshold) {
            // Obstacle on left - steer right
            steerAmount += avoidStrength * (1 - this._obstacleLeftDist / obstacleThreshold);
        } else if (this._obstacleRightDist < obstacleThreshold && this._obstacleLeftDist >= obstacleThreshold) {
            // Obstacle on right - steer left
            steerAmount -= avoidStrength * (1 - this._obstacleRightDist / obstacleThreshold);
        } else if (this._obstacleLeftDist < obstacleThreshold && this._obstacleRightDist < obstacleThreshold) {
            // Obstacles on both sides - corridor, slow down and try to center
            const centerBias = (this._obstacleRightDist - this._obstacleLeftDist) / obstacleThreshold * 0.5;
            steerAmount += centerBias;
        }
        
        // Clamp steering
        steerAmount = Math.max(-1, Math.min(1, steerAmount));
        
        // Get current vehicle speed for throttle limiting
        let currentSpeedKmh = 0;
        if (this.drivingSpeedLimitEnabled && vc._currentSpeed !== undefined) {
            // Convert px/s to km/h (assuming 1 km = ~2778 pixels at typical scale)
            // VehicleController uses _kmhToPxs internally, we reverse it 
            // Typical scale: 1 km/h ≈ 2.778 px/s, so px/s / 2.778 ≈ km/h
            const pxsToKmh = 1 / 2.778;
            currentSpeedKmh = Math.abs(vc._currentSpeed) * pxsToKmh;
        }
        
        // Calculate throttle based on multiple factors
        let throttle = this.drivingSpeed;
        
        // 0. CRITICAL: Speed-based throttle limiting (prevents zooming off in fast cars)
        if (this.drivingSpeedLimitEnabled && currentSpeedKmh > 0) {
            const targetSpeed = this.drivingCruiseSpeedKmh;
            const maxSpeed = this.drivingMaxSpeedKmh;
            
            if (currentSpeedKmh >= maxSpeed) {
                // At or above max - no throttle, coast or brake
                throttle = 0;
            } else if (currentSpeedKmh >= targetSpeed) {
                // Between cruise and max - reduce throttle proportionally
                const overCruise = (currentSpeedKmh - targetSpeed) / (maxSpeed - targetSpeed);
                throttle *= (1 - overCruise * 0.9);  // Reduce to near zero as we approach max
            } else if (currentSpeedKmh > targetSpeed * 0.8) {
                // Approaching cruise speed - start easing off
                const approachFactor = (currentSpeedKmh - targetSpeed * 0.8) / (targetSpeed * 0.2);
                throttle *= (1 - approachFactor * 0.4);
            }
            // Below 80% cruise speed - use full calculated throttle
        }
        
        // 1. Reduce for sharp turns
        const turnFactor = 1 - Math.abs(angleDiff) / Math.PI;
        throttle *= (0.4 + 0.6 * turnFactor);
        
        // 2. Reduce when obstacle ahead - more aggressive braking
        const obstacleBrakeThreshold = this.drivingObstacleDistance * 0.7;  // Increased from 0.65
        if (this._obstacleAheadDist < obstacleBrakeThreshold) {
            const obstacleFactor = this._obstacleAheadDist / obstacleBrakeThreshold;
            throttle *= obstacleFactor * obstacleFactor;  // Quadratic falloff for more aggressive slowing
            
            // If close, start braking as well
            if (this._obstacleAheadDist < obstacleBrakeThreshold * 0.5) {
                const brakeFactor = 1 - (this._obstacleAheadDist / (obstacleBrakeThreshold * 0.5));
                vc.setSteering(steerAmount);
                vc.setThrottle(throttle * 0.3);
                vc.setBrake(brakeFactor * 0.6);
                vc.setHandbrake(false);
                return;
            }
        }
        
        // 3. Reduce when far from lane direction (driving wrong way)
        if (laneDir) {
            const vAngle = this._vehicleObject.angle * (Math.PI / 180);
            let laneDiff = laneDir.angle - vAngle;
            while (laneDiff > Math.PI) laneDiff -= Math.PI * 2;
            while (laneDiff < -Math.PI) laneDiff += Math.PI * 2;
            
            // If driving opposite to lane direction, slow down
            if (Math.abs(laneDiff) > Math.PI * 0.6) {
                throttle *= 0.5;
            }
        }
        
        // 4. Reduce close to target node
        if (dist < 50) {
            throttle *= (0.5 + 0.5 * (dist / 50));
        }
        
        // Ensure minimum throttle when not blocked (but not if at max speed)
        if (currentSpeedKmh < this.drivingMaxSpeedKmh) {
            throttle = Math.max(this.drivingMinThrottle, throttle);
        }
        
        // Apply braking if significantly over max speed
        let brake = 0;
        if (this.drivingSpeedLimitEnabled && currentSpeedKmh > this.drivingMaxSpeedKmh * 1.1) {
            brake = 0.3;
            throttle = 0;
        }
        
        // Apply controls
        vc.setSteering(steerAmount);
        vc.setThrottle(throttle);
        vc.setBrake(brake);
        vc.setHandbrake(false);
    }
    
    _pickNextVehicleNode() {
        if (!this._tilemapWorldGen || !this._currentNode) return;
        
        const connections = this._currentNode.connections;
        if (!connections || connections.length === 0) {
            this._targetNode = null;
            return;
        }
        
        // Get expected direction for current lane
        const currentLaneDir = this._getLaneExpectedDirection(this._currentNode);
        
        // Get vehicle's current facing direction for forward preference
        let vehicleForwardX = 0, vehicleForwardY = 0;
        if (this._vehicleObject) {
            const vAngle = this._vehicleObject.angle * (Math.PI / 180);
            vehicleForwardX = Math.cos(vAngle);
            vehicleForwardY = Math.sin(vAngle);
        }
        
        // Filter out previous nodes AND non-vehicle nodes (avoid pedestrian nodes)
        const validConnections = connections.filter(conn => {
            // Skip previous nodes to avoid backtracking
            for (const prev of this._prevNodes) {
                if (prev && conn.node.tileX === prev.tileX && conn.node.tileY === prev.tileY) {
                    return false;
                }
            }
            
            // Skip pedestrian nodes - vehicles should stay on vehicle roads
            if (conn.node.nodeId === 'pedestrian') {
                return false;
            }
            
            return true;
        });
        
        // If no valid connections, allow backtracking (but still not pedestrian)
        let candidates = validConnections.length > 0 ? validConnections : connections.filter(conn => {
            return conn.node.nodeId !== 'pedestrian';
        });
        
        // If still no candidates, use all connections as last resort
        if (candidates.length === 0) {
            candidates = connections;
        }
        
        // Score each connection based on multiple factors
        let bestConn = null;
        let bestScore = -Infinity;
        
        for (const conn of candidates) {
            let score = 0;
            const nextNode = conn.node;
            
            // Calculate direction to this node
            const cdx = nextNode.worldX - this._currentNode.worldX;
            const cdy = nextNode.worldY - this._currentNode.worldY;
            const len = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
            const dirX = cdx / len;
            const dirY = cdy / len;
            
            // HIGHEST PRIORITY: Node in vehicle's forward direction
            // This prevents driving in circles
            if (vehicleForwardX !== 0 || vehicleForwardY !== 0) {
                const forwardDot = dirX * vehicleForwardX + dirY * vehicleForwardY;
                // Strong preference for forward direction (up to +15 points)
                score += forwardDot * 15;
                
                // Heavily penalize nodes behind the vehicle (requires U-turn)
                if (forwardDot < -0.3) {
                    score -= 20;
                }
            }
            
            // HIGH PRIORITY: Lane direction alignment
            if (currentLaneDir) {
                // Dot product with expected lane direction
                const laneDot = dirX * currentLaneDir.dx + dirY * currentLaneDir.dy;
                score += laneDot * 10;
            }
            
            // MEDIUM PRIORITY: Next node's lane compatibility
            const nextLaneDir = this._getLaneExpectedDirection(nextNode);
            if (nextLaneDir && currentLaneDir) {
                const angleDiff = Math.abs(nextLaneDir.angle - currentLaneDir.angle);
                if (angleDiff < Math.PI / 2) {
                    score += 5;  // Same general direction
                } else if (angleDiff > Math.PI * 0.8) {
                    score -= 10;  // Opposite direction (wrong way) - increased penalty
                }
            }
            
            // LOW PRIORITY: Intersections allow direction changes
            if (nextNode.role === 'intersection') {
                score += 2;
            }
            
            // LOW PRIORITY: Penalize pedestrian nodes strongly
            if (nextNode.nodeId === 'pedestrian') {
                score -= 50;
            }
            
            // LOWEST PRIORITY: Continue in same general direction as momentum
            if (this._lastDirection.x !== 0 || this._lastDirection.y !== 0) {
                const ldx = this._lastDirection.x;
                const ldy = this._lastDirection.y;
                const llen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
                const momentumDot = dirX * (ldx / llen) + dirY * (ldy / llen);
                score += momentumDot * 3;
            }
            
            // Small random factor to avoid always picking same path
            score += Math.random() * 0.5;
            
            if (score > bestScore) {
                bestScore = score;
                bestConn = conn;
            }
        }
        
        this._targetNode = bestConn ? bestConn.node : null;
        
        // Update last direction
        if (this._currentNode && this._targetNode) {
            this._lastDirection = {
                x: this._targetNode.worldX - this._currentNode.worldX,
                y: this._targetNode.worldY - this._currentNode.worldY
            };
        }
    }
    
    _getDrivingSideDirection() {
        // Convert driving side preference to node direction
        // This is a hint - the priority is staying on the correct lane
        if (this._lastDirection.x !== 0 || this._lastDirection.y !== 0) {
            // Continue in same general direction
            if (Math.abs(this._lastDirection.x) > Math.abs(this._lastDirection.y)) {
                return this._lastDirection.x > 0 ? 'east' : 'west';
            } else {
                return this._lastDirection.y > 0 ? 'south' : 'north';
            }
        }
        return null;
    }
    
    // ==================== STATE: CAR THIEF ====================
    
    _updateCarThief(deltaTime) {
        // If already in vehicle, switch to driving
        if (this._isInVehicle && this._vehicleController) {
            this.setState(this.carThiefReturnState);
            return;
        }
        
        // If approaching a vehicle, continue approach
        if (this._approachingVehicle && this._targetVehicle) {
            this._updateApproachVehicle(deltaTime);
            return;
        }
        
        // Find nearest empty vehicle
        const vehicle = this._findNearestEmptyVehicle();
        if (!vehicle) {
            // No vehicle found - go idle or follow nodes
            this.setState('followNodes');
            return;
        }
        
        this._targetVehicle = vehicle;
        this._approachingVehicle = true;
    }
    
    _updateApproachVehicle(deltaTime) {
        if (!this._targetVehicle || !this._targetVehicle.gameObject) {
            this._approachingVehicle = false;
            this._targetVehicle = null;
            return;
        }
        
        const vc = this._targetVehicle;
        const vgo = vc.gameObject;
        
        // Check if vehicle is now occupied
        if (vc.isOccupied && vc.isOccupied()) {
            this._approachingVehicle = false;
            this._targetVehicle = null;
            this.setState('followNodes');
            return;
        }
        
        // Get door position
        const doorPos = vc.getDriverDoorWorldPosition ? 
            vc.getDriverDoorWorldPosition() : 
            { x: vgo.position.x, y: vgo.position.y };
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        const dx = doorPos.x - x;
        const dy = doorPos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if close enough to enter
        if (dist < 20) {
            // Enter the vehicle
            this._enterVehicle(vc, vgo);
            this._approachingVehicle = false;
            this._targetVehicle = null;
            this.setState(this.carThiefReturnState);
            return;
        }
        
        // Move toward door
        const len = dist > 0 ? dist : 1;
        this._movementController.inputX = (dx / len) * this.followSpeed * 1.5; // Run to vehicle
        this._movementController.inputY = (dy / len) * this.followSpeed * 1.5;
        this._clampInput();
    }
    
    _findNearestEmptyVehicle() {
        if (typeof findByModule !== 'function') return null;
        
        const vehicles = findByModule('VehicleController');
        if (!vehicles || vehicles.length === 0) return null;
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        const radiusSq = this.carThiefSearchRadius * this.carThiefSearchRadius;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const vgo of vehicles) {
            const vc = vgo.getModule('VehicleController');
            if (!vc || !vc.vehicleInteractionEnabled) continue;
            
            // Skip occupied vehicles
            if (vc.isOccupied && vc.isOccupied()) continue;
            
            const dx = vgo.position.x - x;
            const dy = vgo.position.y - y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < radiusSq && distSq < nearestDist) {
                nearestDist = distSq;
                nearest = vc;
            }
        }
        
        return nearest;
    }
    
    _enterVehicle(vehicleController, vehicleObject) {
        // Store references
        this._vehicleController = vehicleController;
        this._vehicleObject = vehicleObject;
        this._isInVehicle = true;
        
        // Mark vehicle as occupied
        if (vehicleController._occupant === undefined) {
            vehicleController._occupant = this;
        }
        vehicleController._occupant = this;
        
        // Disable AI-controlled mode temporarily on MovementController2D
        // Snap position to vehicle
        this.gameObject.position.x = vehicleObject.position.x;
        this.gameObject.position.y = vehicleObject.position.y;
        
        // Disable colliders so they don't interfere with raycasts
        const collider = this.gameObject.getModule('BoxCollider') || 
                         this.gameObject.getModule('SphereCollider') || 
                         this.gameObject.getModule('PolygonCollider');
        if (collider) {
            this._savedColliderEnabled = collider.enabled;
            collider.enabled = false;
        }
        
        // Hide NPC visually
        if (this.gameObject.scale) {
            this._savedScaleX = this.gameObject.scale.x;
            this._savedScaleY = this.gameObject.scale.y;
            this.gameObject.scale.x = 0;
            this.gameObject.scale.y = 0;
        }
        
        // Take control of vehicle
        vehicleController.playerControlled = false;
        
        // Trigger door animation
        if (vehicleController.triggerDoorAnimation) {
            vehicleController.triggerDoorAnimation(vehicleController.driverSide || 'left');
        }
        
        // Initialize vehicle node tracking
        this._currentNode = null;
        this._targetNode = null;
        this._prevNodes = [];
        
        //console.log('[MovementController2DBrain] Entered vehicle:', vehicleObject.name || vehicleObject._id);
    }
    
    // ==================== A* PATHFINDING ====================
    
    /**
     * Compute A* path from current position to target position
     * @param {number} targetX - World X coordinate
     * @param {number} targetY - World Y coordinate
     * @param {string} nodeId - Node type to use for pathfinding
     * @returns {array} Array of nodes forming the path
     */
    _computePath(targetX, targetY, nodeId) {
        if (!this._tilemapWorldGen) {
            this._path = [];
            return [];
        }
        
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        
        // Get start and end nodes
        const startNode = this._tilemapWorldGen.getNearestNode(x, y, nodeId);
        const endNode = this._tilemapWorldGen.getNearestNode(targetX, targetY, nodeId);
        
        if (!startNode || !endNode) {
            this._path = [];
            return [];
        }
        
        // A* algorithm
        const openSet = [startNode];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        // Use node key for map lookups
        const nodeKey = (n) => `${n.tileX},${n.tileY}`;
        
        gScore.set(nodeKey(startNode), 0);
        fScore.set(nodeKey(startNode), this._heuristic(startNode, endNode));
        
        while (openSet.length > 0) {
            // Get node with lowest fScore
            let current = openSet[0];
            let currentIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                const f = fScore.get(nodeKey(openSet[i])) || Infinity;
                if (f < (fScore.get(nodeKey(current)) || Infinity)) {
                    current = openSet[i];
                    currentIdx = i;
                }
            }
            
            // Check if reached goal
            if (current.tileX === endNode.tileX && current.tileY === endNode.tileY) {
                this._path = this._reconstructPath(cameFrom, current);
                return this._path;
            }
            
            // Remove current from openSet
            openSet.splice(currentIdx, 1);
            
            // Check all neighbors
            if (!current.connections) continue;
            
            for (const conn of current.connections) {
                const neighbor = conn.node;
                if (!neighbor) continue;
                
                const tentativeG = (gScore.get(nodeKey(current)) || Infinity) + this._nodeDist(current, neighbor);
                
                if (tentativeG < (gScore.get(nodeKey(neighbor)) || Infinity)) {
                    cameFrom.set(nodeKey(neighbor), current);
                    gScore.set(nodeKey(neighbor), tentativeG);
                    fScore.set(nodeKey(neighbor), tentativeG + this._heuristic(neighbor, endNode));
                    
                    if (!openSet.find(n => n.tileX === neighbor.tileX && n.tileY === neighbor.tileY)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        // No path found
        this._path = [];
        return [];
    }
    
    _heuristic(nodeA, nodeB) {
        // Manhattan distance
        const dx = Math.abs(nodeA.worldX - nodeB.worldX);
        const dy = Math.abs(nodeA.worldY - nodeB.worldY);
        return dx + dy;
    }
    
    _nodeDist(nodeA, nodeB) {
        const dx = nodeA.worldX - nodeB.worldX;
        const dy = nodeA.worldY - nodeB.worldY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    _reconstructPath(cameFrom, current) {
        const path = [current];
        const nodeKey = (n) => `${n.tileX},${n.tileY}`;
        
        while (cameFrom.has(nodeKey(current))) {
            current = cameFrom.get(nodeKey(current));
            path.unshift(current);
        }
        
        return path;
    }
    
    // ==================== UTILITIES ====================
    
    _clampInput() {
        const inputLen = Math.sqrt(
            this._movementController.inputX * this._movementController.inputX +
            this._movementController.inputY * this._movementController.inputY
        );
        if (inputLen > 1) {
            this._movementController.inputX /= inputLen;
            this._movementController.inputY /= inputLen;
        }
    }
    
    _updatePrevNodes(node) {
        if (node) {
            this._prevNodes.unshift(node);
            if (this._prevNodes.length > 2) {
                this._prevNodes.pop();
            }
        }
    }
    
    _updateNPCNode() {
        // Update NPC info in TilemapWorldGenerator if spawned via that system
        if (this._tilemapWorldGen && this._currentNode) {
            this._tilemapWorldGen.setNPCCurrentNode(this.gameObject, this._currentNode);
        }
    }
    
    _findTilemapWorldGenerator() {
        // Search all GameObjects for TilemapWorldGenerator
        if (typeof findModule === 'function') {
            return findModule('TilemapWorldGenerator');
        }
        // Fallback: search via findByModule
        if (typeof findByModule === 'function') {
            const objects = findByModule('TilemapWorldGenerator');
            if (objects && objects.length > 0) {
                return objects[0].getModule('TilemapWorldGenerator');
            }
        }
        return null;
    }
    
    _findGameObjectById(id) {
        if (!id) return null;
        
        // Search all instances
        if (typeof instanceFindAll === 'function') {
            const all = instanceFindAll('*');
            if (all) {
                for (const obj of all) {
                    if (obj._id === id || obj._id === parseInt(id)) {
                        return obj;
                    }
                }
            }
        }
        return null;
    }
    
    _wouldHitSolid(x, y) {
        // Check collision at position
        if (typeof checkCollisionAt === 'function') {
            const hit = checkCollisionAt(x, y, '', this.gameObject);
            return hit !== null;
        }
        return false;
    }
    
    _checkStuck(deltaTime) {
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y;
        
        const dx = x - this._lastPosition.x;
        const dy = y - this._lastPosition.y;
        const moved = Math.sqrt(dx * dx + dy * dy);
        
        if (moved < 1) {
            this._stuckTimer += deltaTime;
            
            // If stuck for more than 2 seconds, pick a new node
            if (this._stuckTimer > 2) {
                this._stuckTimer = 0;
                
                if (this.currentState === 'followNodes') {
                    // Clear prev nodes to allow backtracking
                    this._prevNodes = [];
                    this._pickNextNode();
                }
            }
        } else {
            this._stuckTimer = 0;
        }
        
        this._lastPosition = { x, y };
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Set the current AI state
     * @param {string} state - 'idle', 'followNodes', 'flee', 'chase', 'goToPosition', 'driving', 'carThief'
     */
    setState(state) {
        const prevState = this.currentState;
        this.currentState = state;
        
        // Reset target caches when changing state
        if (state === 'followNodes') {
            // Re-acquire current node
            if (this._tilemapWorldGen) {
                this._currentNode = this._tilemapWorldGen.getNearestNode(
                    this.gameObject.position.x,
                    this.gameObject.position.y,
                    this.followNodeId
                );
                this._pickNextNode();
                this._nodesInitialized = !!this._currentNode;
            }
        } else if (state === 'driving') {
            // Re-acquire vehicle nodes
            if (this._tilemapWorldGen && this._isInVehicle) {
                this._currentNode = this._tilemapWorldGen.getNearestNode(
                    this._vehicleObject.position.x,
                    this._vehicleObject.position.y,
                    this.vehicleNodeId
                );
                this._pickNextVehicleNode();
            }
        } else if (state === 'goToPosition') {
            // Clear existing path to force recomputation
            this._path = [];
            this._pathIndex = 0;
        } else if (state === 'carThief') {
            // Reset car thief state
            this._targetVehicle = null;
            this._approachingVehicle = false;
        }
    }
    
    /**
     * Navigate to a world position using A* pathfinding
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {string} [nodeId] - Optional node type (defaults to pathfindNodeId)
     * @param {string} [completeState] - State to switch to when destination reached
     */
    goToPosition(x, y, nodeId, completeState) {
        this.targetX = x;
        this.targetY = y;
        if (nodeId) this.pathfindNodeId = nodeId;
        if (completeState) this.pathfindCompleteState = completeState;
        
        // Clear path to compute new one
        this._path = [];
        this._pathIndex = 0;
        
        this.setState('goToPosition');
    }
    
    /**
     * Get the computed A* path
     * @returns {array} Array of nodes in the current path
     */
    getPath() {
        return this._path;
    }
    
    /**
     * Check if currently pathfinding to a destination
     * @returns {boolean}
     */
    isPathfinding() {
        return this.currentState === 'goToPosition' && this._path.length > 0;
    }
    
    /**
     * Set the flee target by GameObject
     * @param {GameObject} target - The GameObject to flee from
     */
    setFleeTarget(target) {
        if (target) {
            this._fleeTarget = target;
            this.fleeTargetId = target._id.toString();
        } else {
            this._fleeTarget = null;
            this.fleeTargetId = '';
        }
    }
    
    /**
     * Set the chase target by GameObject
     * @param {GameObject} target - The GameObject to chase
     */
    setChaseTarget(target) {
        if (target) {
            this._chaseTarget = target;
            this.chaseTargetId = target._id.toString();
        } else {
            this._chaseTarget = null;
            this.chaseTargetId = '';
        }
    }
    
    /**
     * Enter a specific vehicle
     * @param {VehicleController} vehicleController - The vehicle to enter
     */
    enterVehicle(vehicleController) {
        if (!vehicleController || !vehicleController.gameObject) return false;
        if (vehicleController.isOccupied && vehicleController.isOccupied()) return false;
        
        this._enterVehicle(vehicleController, vehicleController.gameObject);
        return true;
    }
    
    /**
     * Exit the current vehicle
     */
    exitVehicle() {
        if (!this._isInVehicle || !this._vehicleController) return;
        
        const vc = this._vehicleController;
        const vgo = this._vehicleObject;
        
        // Get exit position
        const exitPos = vc.getExitWorldPosition ? 
            vc.getExitWorldPosition() : 
            { x: vgo.position.x + 30, y: vgo.position.y };
        
        // Unmark vehicle as occupied
        vc._occupant = null;
        
        // Restore NPC visibility
        if (this.gameObject.scale && this._savedScaleX !== undefined) {
            this.gameObject.scale.x = this._savedScaleX;
            this.gameObject.scale.y = this._savedScaleY;
        }
        
        // Re-enable collider
        const collider = this.gameObject.getModule('BoxCollider') || 
                         this.gameObject.getModule('SphereCollider') || 
                         this.gameObject.getModule('PolygonCollider');
        if (collider && this._savedColliderEnabled !== undefined) {
            collider.enabled = this._savedColliderEnabled;
        }
        
        // Move NPC to exit position
        this.gameObject.position.x = exitPos.x;
        this.gameObject.position.y = exitPos.y;
        
        // Trigger door animation
        if (vc.triggerDoorAnimation) {
            vc.triggerDoorAnimation(exitPos.side || vc.driverSide || 'left');
        }
        
        // Clear vehicle state
        this._vehicleController = null;
        this._vehicleObject = null;
        this._isInVehicle = false;
        this._currentNode = null;
        this._targetNode = null;
        
        // Reset node tracking for walking
        this._nodesInitialized = false;
        
        //console.log('[MovementController2DBrain] Exited vehicle');
    }
    
    /**
     * Check if NPC is currently in a vehicle
     * @returns {boolean}
     */
    isInVehicle() {
        return this._isInVehicle;
    }
    
    /**
     * Get the current vehicle controller (if in vehicle)
     * @returns {VehicleController|null}
     */
    getCurrentVehicle() {
        return this._vehicleController;
    }
    
    /**
     * Drive to a world position using A* pathfinding with vehicle nodes
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    driveToPosition(x, y) {
        if (!this._isInVehicle || !this._vehicleController) {
            //console.warn('[MovementController2DBrain] Cannot driveToPosition - not in vehicle');
            return;
        }
        
        // Compute vehicle path
        this._computePath(x, y, this.vehicleNodeId);
        this._vehiclePath = this._path.slice();
        this._vehiclePathIndex = 0;
        
        this.setState('driving');
    }
    
    /**
     * Trigger car thief mode - find and steal nearest empty vehicle
     */
    triggerCarThief() {
        this.carThief = true;
        this.setState('carThief');
    }
    
    /**
     * Get current state info
     * @returns {object} State information
     */
    getStateInfo() {
        return {
            state: this.currentState,
            currentNode: this._currentNode,
            targetNode: this._targetNode,
            fleeTarget: this._fleeTarget,
            chaseTarget: this._chaseTarget,
            isInVehicle: this._isInVehicle,
            vehicle: this._vehicleController,
            path: this._path,
            pathIndex: this._pathIndex
        };
    }
    
    /**
     * Reset node tracking state - call this when the NPC is respawned/repositioned.
     * Forces the brain to re-acquire nodes at its current position.
     */
    resetNodeState() {
        this._currentNode = null;
        this._targetNode = null;
        this._prevNodes = [];
        this._nodesInitialized = false;
        this._lastDirection = { x: 0, y: 0 };
        this._stuckTimer = 0;
        this._path = [];
        this._pathIndex = 0;
        
        // Reset driving-specific state
        this._drivingManeuver = 'none';
        this._maneuverTimer = 0;
        this._maneuverTurnDir = 0;
        this._maneuverAttempts = 0;
        this._lastObstacleTime = 0;
        this._obstacleAheadDist = 999;
        this._obstacleLeftDist = 999;
        this._obstacleRightDist = 999;
        this._obstacleRearDist = 60;
        this._reverseTimer = 0;
        this._vehicleStuckTimer = 0;
        this._lastVehiclePos = { x: 0, y: 0 };
        
        // Reset car thief state
        this._targetVehicle = null;
        this._approachingVehicle = false;
    }
    
    /**
     * Reset vehicle to pristine condition - repairs damage and resets renderer.
     * Call this when a vehicle is respawned to remove damage.
     * @param {GameObject} vehicleObject - The vehicle GameObject (optional, uses current vehicle if in one)
     */
    resetVehicle(vehicleObject) {
        const vgo = vehicleObject || this._vehicleObject;
        if (!vgo) return;
        
        // Reset VehicleControllerRenderer if present (removes damage)
        const renderer = vgo.getModule ? vgo.getModule('VehicleControllerRenderer') : null;
        if (renderer && typeof renderer.repair === 'function') {
            renderer.repair();
        }
        
        // Reset VehicleController state
        const vc = vgo.getModule ? vgo.getModule('VehicleController') : null;
        if (vc) {
            // Clear velocity
            vc._velX = 0;
            vc._velY = 0;
            vc._currentSpeed = 0;
            vc._currentSteer = 0;
            vc._throttle = 0;
            vc._brakeInput = 0;
            vc._steerInput = 0;
            vc._handbrakeInput = false;
            
            // Reset gear
            vc._currentGear = 1;
            vc._currentRPM = 800;
            vc._isShifting = false;
            
            // Clear occupant
            vc._occupant = null;
        }
    }
    
    /**
     * Full reset for respawn - resets both brain state and vehicle if present.
     * Call this when an NPC with a vehicle is respawned.
     */
    fullReset() {
        // Save vehicle reference before resetNodeState clears it
        const wasInVehicle = this._isInVehicle;
        const vehicleRef = this._vehicleObject;
        
        this.resetNodeState();
        
        // Reset vehicle if we were in one
        if (wasInVehicle && vehicleRef) {
            this.resetVehicle(vehicleRef);
        }
        
        // Also try to find and reset vehicle by vehicleNodeId for vehicle prefabs
        if (!vehicleRef && this.vehicleNodeId && this.gameObject) {
            const vgo = this.gameObject.getChildByName ? 
                this.gameObject.getChildByName(this.vehicleNodeId) : null;
            if (vgo) {
                this.resetVehicle(vgo);
            }
        }
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'MovementController2DBrain';
        
        // State
        json.currentState = this.currentState;
        
        // Follow Nodes
        json.followNodeId = this.followNodeId;
        json.followSpeed = this.followSpeed;
        json.nodeReachDistance = this.nodeReachDistance;
        json.randomTurnChance = this.randomTurnChance;
        
        // Flee
        json.fleeTargetId = this.fleeTargetId;
        json.fleeDistance = this.fleeDistance;
        json.fleeSpeed = this.fleeSpeed;
        json.fleeTurnAngle = this.fleeTurnAngle;
        json.fleeUseNodes = this.fleeUseNodes;
        
        // Chase
        json.chaseTargetId = this.chaseTargetId;
        json.chaseGiveUpDistance = this.chaseGiveUpDistance;
        json.chaseSpeed = this.chaseSpeed;
        json.chaseLoseDistance = this.chaseLoseDistance;
        json.chaseReturnState = this.chaseReturnState;
        
        // Go To Position (A* Pathfinding)
        json.targetX = this.targetX;
        json.targetY = this.targetY;
        json.pathfindSpeed = this.pathfindSpeed;
        json.pathfindNodeId = this.pathfindNodeId;
        json.pathfindCompleteDistance = this.pathfindCompleteDistance;
        json.pathfindCompleteState = this.pathfindCompleteState;
        
        // Driving
        json.vehicleNodeId = this.vehicleNodeId;
        json.drivingSpeed = this.drivingSpeed;
        json.drivingTurnSpeed = this.drivingTurnSpeed;
        json.drivingNodeReachDistance = this.drivingNodeReachDistance;
        json.drivingSide = this.drivingSide;
        json.obeyTrafficLights = this.obeyTrafficLights;
        json.stoppingDistance = this.stoppingDistance;
        
        // Driving Speed Limits
        json.drivingMaxSpeedKmh = this.drivingMaxSpeedKmh;
        json.drivingCruiseSpeedKmh = this.drivingCruiseSpeedKmh;
        json.drivingMinThrottle = this.drivingMinThrottle;
        json.drivingSpeedLimitEnabled = this.drivingSpeedLimitEnabled;
        
        // Driving Obstacle Avoidance
        json.drivingObstacleDetection = this.drivingObstacleDetection;
        json.drivingObstacleDistance = this.drivingObstacleDistance;
        json.drivingObstacleAvoidance = this.drivingObstacleAvoidance;
        json.drivingEnableManeuvers = this.drivingEnableManeuvers;
        json.drivingReverseTime = this.drivingReverseTime;
        json.drivingMaxManeuverAttempts = this.drivingMaxManeuverAttempts;
        
        // Car Thief
        json.carThief = this.carThief;
        json.carThiefSearchRadius = this.carThiefSearchRadius;
        json.carThiefReturnState = this.carThiefReturnState;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new MovementController2DBrain();
        module.enabled = json.enabled ?? true;
        
        // State
        module.currentState = json.currentState || 'followNodes';
        
        // Follow Nodes
        module.followNodeId = json.followNodeId || 'pedestrian';
        module.followSpeed = json.followSpeed ?? 1.0;
        module.nodeReachDistance = json.nodeReachDistance ?? 8;
        module.randomTurnChance = json.randomTurnChance ?? 0.3;
        
        // Flee
        module.fleeTargetId = json.fleeTargetId || '';
        module.fleeDistance = json.fleeDistance ?? 200;
        module.fleeSpeed = json.fleeSpeed ?? 1.5;
        module.fleeTurnAngle = json.fleeTurnAngle ?? 90;
        module.fleeUseNodes = json.fleeUseNodes ?? true;
        
        // Chase
        module.chaseTargetId = json.chaseTargetId || '';
        module.chaseGiveUpDistance = json.chaseGiveUpDistance ?? 400;
        module.chaseSpeed = json.chaseSpeed ?? 1.3;
        module.chaseLoseDistance = json.chaseLoseDistance ?? 300;
        module.chaseReturnState = json.chaseReturnState || 'followNodes';
        
        // Go To Position (A* Pathfinding)
        module.targetX = json.targetX ?? 0;
        module.targetY = json.targetY ?? 0;
        module.pathfindSpeed = json.pathfindSpeed ?? 1.0;
        module.pathfindNodeId = json.pathfindNodeId || 'pedestrian';
        module.pathfindCompleteDistance = json.pathfindCompleteDistance ?? 16;
        module.pathfindCompleteState = json.pathfindCompleteState || 'idle';
        
        // Driving
        module.vehicleNodeId = json.vehicleNodeId || 'vehicle';
        module.drivingSpeed = json.drivingSpeed ?? 0.7;
        module.drivingTurnSpeed = json.drivingTurnSpeed ?? 2.0;
        module.drivingNodeReachDistance = json.drivingNodeReachDistance ?? 32;
        module.drivingSide = json.drivingSide || 'right';
        module.obeyTrafficLights = json.obeyTrafficLights ?? true;
        module.stoppingDistance = json.stoppingDistance ?? 100;
        
        // Driving Speed Limits
        module.drivingMaxSpeedKmh = json.drivingMaxSpeedKmh ?? 60;
        module.drivingCruiseSpeedKmh = json.drivingCruiseSpeedKmh ?? 40;
        module.drivingMinThrottle = json.drivingMinThrottle ?? 0.15;
        module.drivingSpeedLimitEnabled = json.drivingSpeedLimitEnabled ?? true;
        
        // Driving Obstacle Avoidance
        module.drivingObstacleDetection = json.drivingObstacleDetection ?? true;
        module.drivingObstacleDistance = json.drivingObstacleDistance ?? 120;
        module.drivingObstacleAvoidance = json.drivingObstacleAvoidance ?? 0.4;
        module.drivingEnableManeuvers = json.drivingEnableManeuvers ?? true;
        module.drivingReverseTime = json.drivingReverseTime ?? 0.6;
        module.drivingMaxManeuverAttempts = json.drivingMaxManeuverAttempts ?? 5;
        
        // Car Thief
        module.carThief = json.carThief ?? false;
        module.carThiefSearchRadius = json.carThiefSearchRadius ?? 500;
        module.carThiefReturnState = json.carThiefReturnState || 'driving';
        
        return module;
    }
    
    clone() {
        const c = new MovementController2DBrain();
        c.enabled = this.enabled;
        
        // State
        c.currentState = this.currentState;
        
        // Follow Nodes
        c.followNodeId = this.followNodeId;
        c.followSpeed = this.followSpeed;
        c.nodeReachDistance = this.nodeReachDistance;
        c.randomTurnChance = this.randomTurnChance;
        
        // Flee
        c.fleeTargetId = this.fleeTargetId;
        c.fleeDistance = this.fleeDistance;
        c.fleeSpeed = this.fleeSpeed;
        c.fleeTurnAngle = this.fleeTurnAngle;
        c.fleeUseNodes = this.fleeUseNodes;
        
        // Chase
        c.chaseTargetId = this.chaseTargetId;
        c.chaseGiveUpDistance = this.chaseGiveUpDistance;
        c.chaseSpeed = this.chaseSpeed;
        c.chaseLoseDistance = this.chaseLoseDistance;
        c.chaseReturnState = this.chaseReturnState;
        
        // Go To Position (A* Pathfinding)
        c.targetX = this.targetX;
        c.targetY = this.targetY;
        c.pathfindSpeed = this.pathfindSpeed;
        c.pathfindNodeId = this.pathfindNodeId;
        c.pathfindCompleteDistance = this.pathfindCompleteDistance;
        c.pathfindCompleteState = this.pathfindCompleteState;
        
        // Driving
        c.vehicleNodeId = this.vehicleNodeId;
        c.drivingSpeed = this.drivingSpeed;
        c.drivingTurnSpeed = this.drivingTurnSpeed;
        c.drivingNodeReachDistance = this.drivingNodeReachDistance;
        c.drivingSide = this.drivingSide;
        c.obeyTrafficLights = this.obeyTrafficLights;
        c.stoppingDistance = this.stoppingDistance;
        
        // Driving Speed Limits
        c.drivingMaxSpeedKmh = this.drivingMaxSpeedKmh;
        c.drivingCruiseSpeedKmh = this.drivingCruiseSpeedKmh;
        c.drivingMinThrottle = this.drivingMinThrottle;
        c.drivingSpeedLimitEnabled = this.drivingSpeedLimitEnabled;
        
        // Driving Obstacle Avoidance
        c.drivingObstacleDetection = this.drivingObstacleDetection;
        c.drivingObstacleDistance = this.drivingObstacleDistance;
        c.drivingObstacleAvoidance = this.drivingObstacleAvoidance;
        c.drivingEnableManeuvers = this.drivingEnableManeuvers;
        c.drivingReverseTime = this.drivingReverseTime;
        c.drivingMaxManeuverAttempts = this.drivingMaxManeuverAttempts;
        
        // Car Thief
        c.carThief = this.carThief;
        c.carThiefSearchRadius = this.carThiefSearchRadius;
        c.carThiefReturnState = this.carThiefReturnState;
        
        return c;
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.MovementController2DBrain = MovementController2DBrain;
}

// Register with Module system if available
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('MovementController2DBrain', MovementController2DBrain);
}
