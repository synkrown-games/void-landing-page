/**
 * ProceduralCreatureBrain Module
 * Advanced AI controller for ProceduralCreature with:
 * - State machine (idle, wander, chase, hunt, flee, follow, guard, patrol, eat, drink, sleep, investigate, returnToNest)
 * - Hunger/thirst needs system
 * - Memory system (food, water, item, threat locations)
 * - Pack hierarchy (leader/follower/lone wolf)
 * - Hostility and temperament
 * - Collision avoidance and pathfinding around solids
 * - Nest/home system
 * - Emotional randomness
 * - Creature-vs-creature combat
 * 
 * FUTURE PLANS:
 * - Make it so if creature is fighting another creature and another creature(could be player) 
 *      attacks and kills that other creature, then it can have a chance of following that savior
 */

class ProceduralCreatureBrain extends Module {
    static namespace = "AI,Procedural";
    static allowMultiple = false;
    static color = "#4a2f6fff";

    static getIcon() {
        return '🧠';
    }

    static getDescription() {
        return 'Advanced AI brain for ProceduralCreature: needs, memory, pack behavior, combat';
    }

    constructor() {
        super();

        // ==================== CORE STATE ====================
        this.aiEnabled = true;
        this.currentState = "idle"; // Current AI state
        this.defaultState = "wander"; // State to return to when no goals

        // ==================== DETECTION ====================
        this.detectionRadius = 300; // How far creature can sense
        this.fieldOfView = 160; // Degrees of vision cone
        this.hearingRadius = 150; // Range for detecting sounds/combat
        this.smellRadius = 200; // Range for detecting food/water
        this.detectionCheckInterval = 0.2; // Seconds between detection scans (performance)

        // ==================== MOVEMENT ====================
        this.moveSpeed = 100; // Base movement speed
        this.wanderSpeed = 60; // Speed when wandering aimlessly
        this.chaseSpeed = 140; // Speed when chasing target
        this.fleeSpeed = 160; // Speed when fleeing
        this.patrolSpeed = 80; // Speed when patrolling
        this.wanderRadius = 200; // How far to wander from home/nest
        this.wanderPauseMin = 1.0; // Min seconds to pause between wanders
        this.wanderPauseMax = 4.0; // Max seconds to pause between wanders
        this.arrivalThreshold = 15; // Distance to consider "arrived"
        this.turnSpeed = 360; // Degrees per second for smooth rotation
        this.moveAcceleration = 400; // Movement acceleration (pixels per second squared)
        this._currentSpeed = 0; // Internal: current movement speed for acceleration
        this._targetAngle = null; // Internal: target angle for smooth rotation

        // ==================== SMOOTH WANDER ====================
        this.wanderSmoothness = 0.7; // How smooth wander paths are (0 = erratic, 1 = very smooth)
        this.wanderMinDistance = 50; // Minimum distance for wander targets
        this.wanderDirectionBias = 0.6; // Bias toward continuing in same direction (0-1)
        this.wanderCurveAmount = 30; // Max degrees to curve per wander step
        this._wanderDirection = 0; // Current preferred wander direction (radians)
        this._wanderDirectionTimer = 0; // Timer for changing wander direction
        this._wanderDirectionChangeTime = 3.0; // Seconds before considering direction change

        // ==================== COLLISION AVOIDANCE ====================
        this.enableCollision = true;
        this.solidTag = "solid"; // Tag for solid objects
        this.collisionRadius = 20;
        this.collisionSearchRadius = 200;
        this.slideAlongWalls = true;
        this.slideFriction = 0.7;
        this.steeringLookahead = 50; // How far ahead to check for obstacles
        this.avoidanceStrength = 1.5; // How strongly to steer around obstacles

        // ==================== SEPARATION ====================
        this.enableSeparation = true;
        this.separationRadius = 35;
        this.separationStrength = 120;

        // ==================== TEMPERAMENT & HOSTILITY ====================
        this.temperament = "neutral"; // passive, timid, neutral, aggressive, hostile
        this.hostileTags = []; // Tags of objects this creature is hostile toward
        this.friendlyTags = []; // Tags of objects this creature considers friendly
        this.fearTags = []; // Tags this creature flees from
        this.aggressionLevel = 0.5; // 0 = never attacks, 1 = always attacks
        this.courage = 0.5; // 0 = flees easily, 1 = fights to death
        this.fleeHealthThreshold = 0.25; // Health % below which creature flees
        this.territoryRadius = 0; // If > 0, attacks anything hostile that enters this radius around nest
        this.attackCooldown = 0.8; // Seconds between attacks
        this.attackRange = 0; // 0 = use arm reach, otherwise override

        // ==================== RANGED COMBAT / GUN DISTANCE ====================
        this.enableGunDistanceKeeping = true; // When holding a gun, maintain optimal distance from target
        this.gunEngagementDistanceMin = 150; // Minimum distance to keep from target when using guns
        this.gunEngagementDistanceMax = 0; // Maximum distance (0 = use detectionRadius * 0.8)
        this.gunBackpedalSpeed = 0.7; // Speed multiplier when backpedaling (0.5 = half chase speed)
        this.gunStrafeChance = 0.3; // Chance to strafe instead of direct backpedal
        this.gunStrafeDistance = 80; // How far to strafe before stopping
        this.gunStrafeSpeed = 0.4; // Speed multiplier when strafing (relative to backpedal speed)
        this._isBackpedaling = false; // Internal: currently moving away from target
        this._strafeDirection = 0; // Internal: 1 = right, -1 = left
        this._strafeTimer = 0; // Internal: how long we've been strafing
        this._gunFaceTarget = null; // Internal: override rotation to face target while backpedaling

        // ==================== RETALIATION / DAMAGE RESPONSE ====================
        this.retaliateWhenAttacked = true; // Chase and attack whoever damages this creature
        this.retaliationDuration = 10.0; // Seconds to chase attacker before giving up
        this.retaliateRegardlessOfTags = true; // Chase attacker even if not in hostileTags
        this.loseInterestWithoutLOS = true; // Only lose interest in target when line of sight is blocked
        this.loseInterestTime = 3.0; // Seconds without LOS before losing interest
        this._lastAttacker = null; // Internal: last object that dealt damage
        this._lastAttackerTime = 0; // Internal: when we were last attacked
        this._retaliationTarget = null; // Internal: current retaliation target
        this._losLostTime = 0; // Internal: time since we lost line of sight to chase target

        // ==================== FRIENDLY FIRE RESPONSE ====================
        this.friendlyFireTolerance = 3; // Number of hits from a family member before reacting
        this.friendlyFireRetaliateChance = 0.5; // Chance to attack the offending family member (0-1)
        this.friendlyFireFleeChance = 0.2; // Chance to flee from the offender (0-1)
        this.friendlyFireMemoryTime = 30; // Seconds to remember friendly fire hits
        this.friendlyFireResetOnRetaliate = true; // Reset hit count after retaliating

        // ==================== EMOTIONAL VARIATION ====================
        this.emotionalVariance = 0.15; // Random variance in decisions (0-1)
        this.moodSwingInterval = 10; // Seconds between potential mood changes
        this._currentMood = 0; // -1 to 1 (negative = fearful, positive = bold)
        this._moodTimer = 0;
        this._personalityRoll = Math.random(); // Fixed per-instance personality skew

        // ==================== NEEDS SYSTEM ====================
        this.enableHunger = true;
        this.enableThirst = true;
        this.hunger = 0; // 0 = full, 100 = starving
        this.thirst = 0; // 0 = hydrated, 100 = dehydrated
        this.hungerRate = 2.0; // Points per minute
        this.thirstRate = 3.0; // Points per minute
        this.hungerThreshold = 60; // Hunger level that triggers seeking food
        this.thirstThreshold = 60; // Thirst level that triggers seeking water
        this.starvationDamage = 5; // Damage per second when hunger >= 100
        this.dehydrationDamage = 8; // Damage per second when thirst >= 100
        this.eatDuration = 2.0; // Seconds to eat
        this.drinkDuration = 1.5; // Seconds to drink
        this.eatHungerRestore = 50; // Hunger restored per eat
        this.drinkThirstRestore = 50; // Thirst restored per drink
        this.foodTag = "food"; // Tag for food objects
        this.waterTag = "water"; // Tag for water sources

        // ==================== MEMORY SYSTEM ====================
        this.memoryCapacity = 10; // Max remembered locations per category
        this.memoryDecayTime = 300; // Seconds before a memory fades (5 min)
        this.foodMemoryCapacity = 10; // Max remembered food source locations
        this.weaponMemoryCapacity = 10; // Max remembered weapon locations
        this._foodMemories = []; // [{x, y, timestamp, objectId}]
        this._waterMemories = []; // [{x, y, timestamp, objectId}]
        this._itemMemories = []; // [{x, y, timestamp, objectId, itemType}]
        this._weaponMemories = []; // [{x, y, timestamp, objectId, itemType, damage}]
        this._foodSourceMemories = []; // [{x, y, timestamp, objectId}] - ProceduralCreatureItems with type='food'
        this._threatMemories = []; // [{x, y, timestamp, sourceId, damage}]
        this._allyMemories = []; // [{x, y, timestamp, objectId}]

        // ==================== NEST / HOME ====================
        this.enableNest = false;
        this.useStartPositionAsNest = true; // Use spawn position as nest
        this.nestPosition = { x: 0, y: 0 }; // Manual nest position
        this.nestPrefab = ""; // Prefab name for nest object
        this.nestReturnDistance = 500; // Max distance from nest before returning
        this.nestSafeRadius = 40; // Radius around nest considered "safe"
        this.sleepAtNest = true; // Sleep when at nest and not threatened
        this.sleepDuration = 5.0; // Seconds to sleep
        this.sleepHealRate = 10; // Health per second while sleeping

        // ==================== PACK HIERARCHY ====================
        this.enablePackBehavior = true;
        this.packRole = "member"; // leader, member, scout, lone_wolf
        this.leaderTag = ""; // Tag to find pack leader (empty = no leader)
        this.followDistance = 60; // Distance to maintain from leader
        this.maxFollowDistance = 300; // Max distance before losing leader
        this.loyaltyLevel = 0.8; // 0 = easily goes solo, 1 = fiercely loyal
        this.loneWolfChance = 0.05; // Per mood-swing chance of going lone wolf
        this.packCallRadius = 250; // Radius to alert pack members
        this.defendLeader = true; // Attack threats to leader
        this.mimicLeaderState = true; // If leader fights, followers fight too

        // ==================== PLAYER COMMAND ====================
        this.commandedByPlayer = false; // When true, creature is following player commands (follow/stay/patrol/scout)
        this._commandedByPlayerObject = null; // The player that commanded this creature
        this._facingForCommand = false; // When true, creature stops to face the player targeting it
        this._facingForCommandTarget = null; // The player the creature should face

        // ==================== PATROL ====================
        this.patrolMode = "none"; // none, waypoints, random, circuit
        this.patrolPoints = []; // [{x, y}] waypoints
        this.patrolWaitTime = 2.0; // Seconds to wait at each point
        this.patrolChaseEnemies = true; // Chase enemies while patrolling
        this.patrolReturnAfterChase = true; // Return to patrol after chase
        this._patrolIndex = 0;
        this._patrolWaitTimer = 0;
        this._patrolSavedPosition = null; // Position before chasing
        this._patrolWasChasing = false; // Was in chase mode from patrol
        this._followWasChasing = false; // Was in chase mode from follow (player command)
        this._isFollowMoving = false; // Buffer zone tracking to prevent follow jitter

        // ==================== BASE DEFENSE ====================
        this.baseTargetPrefab = ""; // Prefab to move toward and defend (by name or tag)
        this.baseTargetTag = ""; // Tag to find base target (alternative to prefab)
        this.baseDefenseMode = "defend"; // 'defend' = protect the base, 'attack' = attack the base
        this.baseDefenseRadius = 100; // How close to stay to base target (when defending)
        this.basePatrolAroundBase = true; // Patrol around the base instead of standing still
        this.basePatrolRadius = 150; // Radius to patrol around the base
        this.baseDefenseAggression = true; // Whether to chase enemies when defending base
        this._baseTargetObject = null; // Internal: resolved base target
        this._baseTargetSearchTimer = 0; // Internal: timer for searching for base target
        this._baseDefenseWasChasing = false; // Internal: was chasing from base defense state
        this._basePatrolAngle = 0; // Internal: current angle around base for patrol
        this._basePatrolTarget = null; // Internal: current patrol target position

        // ==================== INVESTIGATION ====================
        this.investigateDuration = 3.0; // Seconds to investigate a point
        this.investigateChance = 0.6; // Chance to investigate detected sounds

        // ==================== LOOT / ITEM INTERACTION ====================
        this.canPickUpItems = false;
        this.preferredItemType = ""; // weapon, tool, food, etc. Empty = any
        this.itemSearchRadius = 150;
        this.itemPickupTag = "item"; // Tag for items on the ground
        this.itemPickupBehavior = "opportunistic"; // opportunistic, aggressive, defensive, never
        // opportunistic: pick up nearby items when idle/wandering
        // aggressive: actively seek out weapons, pick up anything with hands free
        // defensive: only seek weapons when attacked (from memory)
        // never: never pick up items
        this.seekWeaponsWhenAttacked = true; // When damaged, seek remembered weapons if defensive
        this.prioritizeWeapons = true; // Prefer weapons over other items
        this.dropItemOnFlee = false; // Drop held items when fleeing

        // ==================== CORNERED BEHAVIOR ====================
        // This temperament makes creature flee from enemies but turn aggressive when cornered
        this.corneredBehavior = false; // Enable cornered behavior (overrides normal flee)
        this.corneredDistance = 80; // Distance to wall/obstacle before considered cornered
        this.corneredCheckDirections = 4; // Number of directions to check for escape routes (4 or 8)
        this.corneredEscapeThreshold = 1; // Min escape routes needed to not be cornered (1 = needs at least 1 way out)
        this.corneredAggressionBoost = 0.5; // Additional aggression when cornered (0-1)
        this.corneredCourageBoost = 0.5; // Additional courage when cornered (0-1)
        this.corneredAttackMultiplier = 1.5; // Damage multiplier when cornered
        this._isCornered = false; // Internal: currently cornered state
        this._lastCorneredCheck = 0; // Performance: don't check every frame
        this._corneredCheckInterval = 0.2; // Seconds between cornered checks

        // ==================== DEBUG ====================
        this.debugDraw = false;
        this.debugShowState = false;
        this.debugShowMemory = false;
        this.debugShowDetection = false;
        this.debugShowNavigation = false;

        // ==================== INTERNAL STATE ====================
        this._creature = null;
        this._stateTime = 0;
        this._stateData = {}; // Per-state scratch data
        this._wanderTarget = null;
        this._wanderPauseTimer = 0;
        this._chaseTarget = null;
        this._fleeFrom = null;
        this._investigatePos = null;
        this._eatTarget = null;
        this._drinkTarget = null;
        this._leader = null;
        this._followers = [];
        this._lastAttackTime = 0;
        this._detectionTimer = 0;
        this._detectedEnemies = [];
        this._detectedFood = [];
        this._detectedWater = [];
        this._detectedItems = [];
        this._detectedAllies = [];
        this._nestWorldPos = null;
        this._velocity = { x: 0, y: 0 };
        this._isSleeping = false;
        this._sleepTimer = 0;
        this._lastStateChange = 0;

        // Friendly fire tracking: { sourceId: { hitCount, lastHitTime, sourceObj } }
        this._friendlyFireHits = {};
        this._lastCheckedDamageTime = 0; // To detect new damage events

        // ==================== ADVANCED NAVIGATION SYSTEM ====================
        // Position history for backtracking
        this.navigationHistorySize = 10; // Max positions to remember
        this.failedLocationMemorySize = 10; // Max failed locations to remember
        this.stuckDetectionMargin = 5; // Pixels - if moved less than this, considered stuck
        this.stuckTimeThreshold = 0.8; // Seconds of no movement before considered stuck
        this.avoidanceDurationMin = 0.8; // Min seconds to walk in avoidance direction
        this.avoidanceDurationMax = 1.5; // Max seconds before retrying target
        this.backtrackCooldown = 3.0; // Seconds before allowing another backtrack
        this.failedAngleMemoryTime = 15.0; // Seconds to remember a failed approach angle
        this.angleRetryMargin = 30; // Degrees - avoid angles within this range of failed angles

        // Internal navigation state (will be serialized)
        this._positionHistory = []; // [{x, y, timestamp, targetX, targetY}]
        this._failedLocations = []; // [{x, y, timestamp, approachAngle, failCount}]
        this._failedAngles = []; // [{angle, timestamp, fromX, fromY, targetX, targetY}]
        this._lastRecordedPos = null;
        this._positionRecordInterval = 0.5; // Record position every N seconds
        this._positionRecordTimer = 0;
        this._stuckTimer = 0;
        this._lastBacktrackTime = 0;
        this._backtrackIndex = 0; // Which history position we're trying to return to
        this._isBacktracking = false;
        this._backtrackTarget = null;
        this._alternateAngleAttempts = 0; // Track how many alternate angles tried
        this._currentApproachAngle = null; // Current angle we're using to approach target

        // ==================== PREDICTIVE PATHFINDING ====================
        this.enablePredictiveChase = true; // Predict where target will be
        this.predictionLookahead = 1.0; // Seconds to predict ahead
        this.predictionUpdateInterval = 0.3; // How often to recalculate prediction
        this._lastTargetPos = null; // Last known target position for velocity calc
        this._targetVelocity = { x: 0, y: 0 }; // Estimated target velocity
        this._predictedInterceptPoint = null; // Where to move to intercept
        this._predictionTimer = 0;

        // ==================== CORRIDOR/TUNNEL NAVIGATION ====================
        this.enableCorridorDetection = true; // Detect narrow passages
        this.corridorWidth = 80; // Pixel width threshold for "corridor"
        this.corridorSlowdown = 0.7; // Speed multiplier in corridors
        this._isInCorridor = false;
        this._corridorDirection = null; // Primary direction of corridor

        // ==================== JUMP/LEAP NAVIGATION ====================
        this.enableJumpNavigation = false; // Can creature jump over obstacles?
        this.maxJumpDistance = 100; // Max pixels creature can jump
        this.jumpCooldown = 2.0; // Seconds between jumps
        this.jumpHeightThreshold = 30; // Max obstacle "height" (width) jumpable
        this._lastJumpTime = 0;
        this._isJumping = false;
        this._jumpTarget = null;

        // ==================== SCENT TRAIL SYSTEM ====================
        this.enableScentTrails = true; // Leave and follow scent trails
        this.scentDropInterval = 1.0; // Seconds between dropping scent marks
        this.scentLifetime = 60.0; // Seconds before scent fades
        this.scentFollowStrength = 0.5; // How strongly to follow scent (0-1)
        this.scentTrailTag = ""; // Tag for creatures whose trails to follow (empty = family only)
        this._scentTrails = []; // [{x, y, timestamp, creatureId, type}] type: 'food', 'danger', 'home', 'general'
        this._lastScentDropTime = 0;

        // ==================== DYNAMIC OBSTACLE PREDICTION ====================
        this.enableDynamicObstaclePrediction = true; // Predict moving obstacle positions
        this.movingObstacleMemory = 2.0; // Seconds to remember obstacle movement patterns
        this._movingObstacles = {}; // { objId: { positions: [], velocity: {x,y} } }

        // ==================== TERRAIN PREFERENCE ====================
        this.enableTerrainPreference = false; // Prefer certain terrain types
        this.preferredTerrainTag = ""; // Tag of preferred terrain
        this.avoidedTerrainTag = ""; // Tag of terrain to avoid
        this.terrainAvoidanceStrength = 0.8; // How much to avoid bad terrain

        // ==================== FLANKING BEHAVIOR ====================
        this.enableFlanking = true; // Try to approach targets from side/behind
        this.flankingAngleOffset = 45; // Degrees to offset approach angle
        this.flankingChance = 0.4; // Chance to attempt flanking vs direct approach
        this._isFlankingApproach = false;
        this._flankingSide = 1; // 1 = right flank, -1 = left flank

        // Grid pathfinding state
        this._pathGrid = null;
        this._path = null;
        this._pathIndex = 0;
        this._pathTarget = null;
        this._lastRepathTime = 0;
    }

    getPropertyMetadata() {
        return [
            // Core
            { type: 'groupStart', label: '🧠 Core AI' },
                { key: 'aiEnabled', label: 'AI Enabled', type: 'boolean', hint: 'Master toggle for AI brain' },
                { key: 'defaultState', label: 'Default State', type: 'select', options: ['idle', 'wander', 'patrol', 'guard', 'base defense'], hint: 'State when no goals are active' },
                //{ key: 'currentState', label: 'Current State', type: 'text', hint: 'Read-only: current AI state' },
            { type: 'groupEnd' },

            // Detection
            { type: 'groupStart', label: '👁️ Detection' },
                { key: 'detectionRadius', label: 'Detection Radius', type: 'number', min: 10, max: 2000, hint: 'How far this creature can see' },
                { key: 'fieldOfView', label: 'Field of View', type: 'slider', min: 10, max: 360, step: 5, hint: 'Vision cone in degrees' },
                { key: 'hearingRadius', label: 'Hearing Radius', type: 'number', min: 0, max: 1000, hint: 'Range for detecting combat/sounds' },
                { key: 'smellRadius', label: 'Smell Radius', type: 'number', min: 0, max: 1000, hint: 'Range for detecting food/water' },
                { key: 'detectionCheckInterval', label: 'Check Interval', type: 'slider', min: 0.05, max: 1.0, step: 0.05, hint: 'Seconds between scans (lower = more CPU)' },
            { type: 'groupEnd' },

            // Movement
            { type: 'groupStart', label: '🚶 Movement' },
                { key: 'moveSpeed', label: 'Move Speed', type: 'number', min: 0, max: 500 },
                { key: 'wanderSpeed', label: 'Wander Speed', type: 'number', min: 0, max: 500 },
                { key: 'chaseSpeed', label: 'Chase Speed', type: 'number', min: 0, max: 500 },
                { key: 'fleeSpeed', label: 'Flee Speed', type: 'number', min: 0, max: 500 },
                { key: 'patrolSpeed', label: 'Patrol Speed', type: 'number', min: 0, max: 500 },
                { key: 'wanderRadius', label: 'Wander Radius', type: 'number', min: 10, max: 2000, hint: 'Max distance from home when wandering' },
                { key: 'wanderPauseMin', label: 'Wander Pause Min', type: 'number', min: 0, max: 30, step: 0.5 },
                { key: 'wanderPauseMax', label: 'Wander Pause Max', type: 'number', min: 0, max: 30, step: 0.5 },
                { key: 'arrivalThreshold', label: 'Arrival Threshold', type: 'number', min: 1, max: 100 },
                { key: 'turnSpeed', label: 'Turn Speed', type: 'number', min: 30, max: 1000, hint: 'Degrees per second (smooth rotation)' },
                { key: 'moveAcceleration', label: 'Acceleration', type: 'number', min: 50, max: 2000, hint: 'Movement acceleration (higher = snappier)' },
                
                // Smooth Wander (nested)
                { type: 'groupStart', label: '🌊 Smooth Wander' },
                    { type: 'hint', hint: 'Makes wandering less erratic and more natural' },
                    { key: 'wanderSmoothness', label: 'Smoothness', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = erratic, 1 = very smooth paths' },
                    { key: 'wanderMinDistance', label: 'Min Distance', type: 'number', min: 10, max: 200, hint: 'Minimum distance for wander targets' },
                    { key: 'wanderDirectionBias', label: 'Direction Bias', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Tendency to continue in same direction' },
                    { key: 'wanderCurveAmount', label: 'Max Curve', type: 'number', min: 0, max: 90, hint: 'Max degrees to curve per step' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
                { key: 'patrolSpeed', label: 'Patrol Speed', type: 'number', min: 0, max: 500 },
                { key: 'wanderRadius', label: 'Wander Radius', type: 'number', min: 10, max: 2000, hint: 'Max distance from home when wandering' },
                { key: 'wanderPauseMin', label: 'Wander Pause Min', type: 'number', min: 0, max: 30, step: 0.5 },
                { key: 'wanderPauseMax', label: 'Wander Pause Max', type: 'number', min: 0, max: 30, step: 0.5 },
                { key: 'arrivalThreshold', label: 'Arrival Threshold', type: 'number', min: 1, max: 100 },
                { key: 'turnSpeed', label: 'Turn Speed', type: 'number', min: 30, max: 1000, hint: 'Degrees per second (smooth rotation)' },
                { key: 'moveAcceleration', label: 'Acceleration', type: 'number', min: 50, max: 2000, hint: 'Movement acceleration (higher = snappier)' },
            { type: 'groupEnd' },

            // Collision
            { type: 'groupStart', label: '💥 Collision & Avoidance' },
                { key: 'enableCollision', label: 'Enable Collision', type: 'boolean' },
                { key: 'solidTag', label: 'Solid Tag', type: 'text', showIf: { enableCollision: true } },
                { key: 'collisionRadius', label: 'Collision Radius', type: 'number', min: 1, max: 100, showIf: { enableCollision: true } },
                { key: 'collisionSearchRadius', label: 'Search Radius', type: 'number', min: 50, max: 1000, showIf: { enableCollision: true } },
                { key: 'slideAlongWalls', label: 'Slide Along Walls', type: 'boolean', showIf: { enableCollision: true } },
                { key: 'slideFriction', label: 'Slide Friction', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enableCollision: true } },
                { key: 'steeringLookahead', label: 'Steering Lookahead', type: 'number', min: 10, max: 200, showIf: { enableCollision: true }, hint: 'How far ahead to check for obstacles' },
                { key: 'avoidanceStrength', label: 'Avoidance Strength', type: 'slider', min: 0.1, max: 5, step: 0.1, showIf: { enableCollision: true } },
            { type: 'groupEnd' },

            // Separation
            { type: 'groupStart', label: '↔️ Creature Separation' },
                { key: 'enableSeparation', label: 'Enable Separation', type: 'boolean' },
                { key: 'separationRadius', label: 'Separation Radius', type: 'number', min: 5, max: 200, showIf: { enableSeparation: true } },
                { key: 'separationStrength', label: 'Separation Strength', type: 'number', min: 0, max: 500, showIf: { enableSeparation: true } },
            { type: 'groupEnd' },

            // Temperament
            { type: 'groupStart', label: '😤 Temperament & Hostility' },
                { key: 'temperament', label: 'Temperament', type: 'select', options: ['passive', 'timid', 'neutral', 'aggressive', 'hostile'], hint: 'Base behavior disposition' },
                { key: 'hostileTags', label: 'Hostile Tags', type: 'array', elementType: 'text', defaultValue: 'player', hint: 'Tags this creature attacks' },
                { key: 'friendlyTags', label: 'Friendly Tags', type: 'array', elementType: 'text', defaultValue: '', hint: 'Tags this creature ignores/helps' },
                { key: 'fearTags', label: 'Fear Tags', type: 'array', elementType: 'text', defaultValue: '', hint: 'Tags this creature flees from' },
                { key: 'aggressionLevel', label: 'Aggression', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = pacifist, 1 = attacks on sight' },
                { key: 'courage', label: 'Courage', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = flees easily, 1 = fights to death' },
                { key: 'fleeHealthThreshold', label: 'Flee Health %', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Health percentage below which creature flees' },
                { key: 'territoryRadius', label: 'Territory Radius', type: 'number', min: 0, max: 1000, hint: '0 = no territory, otherwise attacks hostiles in range' },
                { key: 'attackCooldown', label: 'Attack Cooldown', type: 'number', min: 0.1, max: 10, step: 0.1, hint: 'Seconds between attacks' },
                { key: 'attackRange', label: 'Attack Range Override', type: 'number', min: 0, max: 500, hint: '0 = use arm reach' },
            { type: 'groupEnd' },

            // Gun / Ranged Combat Distance Keeping
            { type: 'groupStart', label: '🔫 Ranged Combat' },
                { type: 'hint', hint: 'When holding a gun, the AI will maintain distance from target instead of closing to melee range' },
                { key: 'enableGunDistanceKeeping', label: 'Enable Gun Distance Keeping', type: 'boolean', hint: 'Maintain optimal distance when using guns' },
                { key: 'gunEngagementDistanceMin', label: 'Min Engagement Distance', type: 'number', min: 50, max: 1000, showIf: { enableGunDistanceKeeping: true }, hint: 'Backpedal if target is closer than this' },
                { key: 'gunEngagementDistanceMax', label: 'Max Engagement Distance', type: 'number', min: 0, max: 2000, showIf: { enableGunDistanceKeeping: true }, hint: '0 = use 80% of detection radius' },
                { key: 'gunBackpedalSpeed', label: 'Backpedal Speed', type: 'slider', min: 0.2, max: 1.0, step: 0.05, showIf: { enableGunDistanceKeeping: true }, hint: 'Speed multiplier when moving away from target' },
                { key: 'gunStrafeChance', label: 'Strafe Chance', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enableGunDistanceKeeping: true }, hint: 'Chance to strafe instead of direct backpedal' },
                { key: 'gunStrafeDistance', label: 'Strafe Distance', type: 'number', min: 20, max: 200, showIf: { enableGunDistanceKeeping: true }, hint: 'How far to strafe before stopping' },
                { key: 'gunStrafeSpeed', label: 'Strafe Speed', type: 'slider', min: 0.1, max: 1.0, step: 0.05, showIf: { enableGunDistanceKeeping: true }, hint: 'Speed multiplier when strafing (0.4 = 40% of backpedal speed)' },
            { type: 'groupEnd' },

            // Retaliation / Damage Response
            { type: 'groupStart', label: '⚔️ Retaliation' },
                { type: 'hint', hint: 'How this creature responds when damaged by any source' },
                { key: 'retaliateWhenAttacked', label: 'Retaliate When Attacked', type: 'boolean', hint: 'Chase and attack whoever damages this creature' },
                { key: 'retaliationDuration', label: 'Retaliation Duration', type: 'number', min: 1, max: 60, showIf: { retaliateWhenAttacked: true }, hint: 'Seconds to chase attacker before giving up' },
                { key: 'retaliateRegardlessOfTags', label: 'Ignore Tags', type: 'boolean', showIf: { retaliateWhenAttacked: true }, hint: 'Chase attacker even if not in hostileTags list' },
                { key: 'loseInterestWithoutLOS', label: 'LOS-Based Interest', type: 'boolean', hint: 'Only lose target when blocked from view for a period' },
                { key: 'loseInterestTime', label: 'LOS Lost Time', type: 'number', min: 0.5, max: 30, step: 0.5, showIf: { loseInterestWithoutLOS: true }, hint: 'Seconds without line-of-sight before losing interest' },
            { type: 'groupEnd' },

            // Friendly Fire Response
            { type: 'groupStart', label: '🤝 Friendly Fire Response' },
                { type: 'hint', hint: 'How this creature reacts when hit by a family member (shared tags) multiple times' },
                { key: 'friendlyFireTolerance', label: 'Hit Tolerance', type: 'number', min: 1, max: 20, hint: 'Hits from a family member before reacting' },
                { key: 'friendlyFireRetaliateChance', label: 'Retaliate Chance', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Chance to attack the offender (modified by aggression)' },
                { key: 'friendlyFireFleeChance', label: 'Flee Chance', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Chance to flee from the offender' },
                { key: 'friendlyFireMemoryTime', label: 'Memory Time', type: 'number', min: 1, max: 300, hint: 'Seconds to remember friendly fire hits' },
                { key: 'friendlyFireResetOnRetaliate', label: 'Reset After Retaliate', type: 'boolean', hint: 'Reset hit count after retaliating or fleeing' },
            { type: 'groupEnd' },

            // Emotional
            { type: 'groupStart', label: '🎭 Emotional Variation' },
                { key: 'emotionalVariance', label: 'Emotional Variance', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Random variation in decisions' },
                { key: 'moodSwingInterval', label: 'Mood Swing Interval', type: 'number', min: 1, max: 120, hint: 'Seconds between potential mood changes' },
            { type: 'groupEnd' },

            // Needs
            { type: 'groupStart', label: '🍖 Needs System' },
                { key: 'enableHunger', label: 'Enable Hunger', type: 'boolean' },
                { key: 'enableThirst', label: 'Enable Thirst', type: 'boolean' },
                { key: 'hunger', label: 'Current Hunger', type: 'slider', min: 0, max: 100, step: 1, hint: '0 = full, 100 = starving' },
                { key: 'thirst', label: 'Current Thirst', type: 'slider', min: 0, max: 100, step: 1, hint: '0 = hydrated, 100 = dehydrated' },
                { key: 'hungerRate', label: 'Hunger Rate', type: 'number', min: 0, max: 50, step: 0.5, hint: 'Points per minute' },
                { key: 'thirstRate', label: 'Thirst Rate', type: 'number', min: 0, max: 50, step: 0.5, hint: 'Points per minute' },
                { key: 'hungerThreshold', label: 'Hunger Threshold', type: 'slider', min: 0, max: 100, step: 5, hint: 'Hunger level that triggers food seeking' },
                { key: 'thirstThreshold', label: 'Thirst Threshold', type: 'slider', min: 0, max: 100, step: 5, hint: 'Thirst level that triggers water seeking' },
                { key: 'starvationDamage', label: 'Starvation Damage', type: 'number', min: 0, max: 50, hint: 'Damage/sec at hunger 100' },
                { key: 'dehydrationDamage', label: 'Dehydration Damage', type: 'number', min: 0, max: 50, hint: 'Damage/sec at thirst 100' },
                { key: 'eatDuration', label: 'Eat Duration', type: 'number', min: 0.5, max: 10, step: 0.5 },
                { key: 'drinkDuration', label: 'Drink Duration', type: 'number', min: 0.5, max: 10, step: 0.5 },
                { key: 'eatHungerRestore', label: 'Eat Restore', type: 'number', min: 1, max: 100, hint: 'Hunger points restored per eat' },
                { key: 'drinkThirstRestore', label: 'Drink Restore', type: 'number', min: 1, max: 100, hint: 'Thirst points restored per drink' },
                { key: 'foodTag', label: 'Food Tag', type: 'text', showIf: { enableHunger: true } },
                { key: 'waterTag', label: 'Water Tag', type: 'text', showIf: { enableThirst: true } },
            { type: 'groupEnd' },

            // Memory
            { type: 'groupStart', label: '🧩 Memory System' },
                { key: 'memoryCapacity', label: 'Memory Capacity', type: 'number', min: 1, max: 50, hint: 'Max remembered locations per category' },
                { key: 'memoryDecayTime', label: 'Memory Decay (s)', type: 'number', min: 10, max: 3600, hint: 'Seconds before a memory fades' },
            { type: 'groupEnd' },

            // Nest
            { type: 'groupStart', label: '🏠 Nest / Home' },
                { key: 'enableNest', label: 'Enable Nest', type: 'boolean' },
                { key: 'useStartPositionAsNest', label: 'Use Start Position', type: 'boolean', showIf: { enableNest: true }, hint: 'Use spawn position as nest location' },
                { key: 'nestPosition', label: 'Nest Position', type: 'vector2', showIf: (m) => m.enableNest && !m.useStartPositionAsNest },
                { key: 'nestPrefab', label: 'Nest Prefab', type: 'prefab', showIf: { enableNest: true }, hint: 'Optional prefab to spawn as nest' },
                { key: 'nestReturnDistance', label: 'Return Distance', type: 'number', min: 50, max: 5000, showIf: { enableNest: true }, hint: 'Max distance before returning to nest' },
                { key: 'nestSafeRadius', label: 'Safe Radius', type: 'number', min: 5, max: 200, showIf: { enableNest: true } },
                { key: 'sleepAtNest', label: 'Sleep at Nest', type: 'boolean', showIf: { enableNest: true } },
                { key: 'sleepDuration', label: 'Sleep Duration', type: 'number', min: 1, max: 60, showIf: { enableNest: true } },
                { key: 'sleepHealRate', label: 'Sleep Heal Rate', type: 'number', min: 0, max: 100, showIf: { enableNest: true }, hint: 'HP healed per second while sleeping' },
            { type: 'groupEnd' },

            // Pack
            { type: 'groupStart', label: '🐺 Pack Hierarchy' },
                { key: 'enablePackBehavior', label: 'Enable Pack', type: 'boolean' },
                { key: 'packRole', label: 'Pack Role', type: 'select', options: ['leader', 'member', 'scout', 'lone_wolf'], showIf: { enablePackBehavior: true } },
                { key: 'leaderTag', label: 'Leader Tag', type: 'text', showIf: (m) => m.enablePackBehavior && m.packRole !== 'leader' && m.packRole !== 'lone_wolf', hint: 'Tag to find pack leader' },
                { key: 'followDistance', label: 'Follow Distance', type: 'number', min: 10, max: 300, showIf: { enablePackBehavior: true } },
                { key: 'maxFollowDistance', label: 'Max Follow Distance', type: 'number', min: 50, max: 2000, showIf: { enablePackBehavior: true } },
                { key: 'loyaltyLevel', label: 'Loyalty', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enablePackBehavior: true }, hint: '0 = easily goes solo, 1 = fiercely loyal' },
                { key: 'loneWolfChance', label: 'Lone Wolf Chance', type: 'slider', min: 0, max: 0.5, step: 0.01, showIf: { enablePackBehavior: true }, hint: 'Per mood-swing chance of going solo' },
                { key: 'packCallRadius', label: 'Pack Call Radius', type: 'number', min: 50, max: 1000, showIf: { enablePackBehavior: true } },
                { key: 'defendLeader', label: 'Defend Leader', type: 'boolean', showIf: { enablePackBehavior: true } },
                { key: 'mimicLeaderState', label: 'Mimic Leader', type: 'boolean', showIf: { enablePackBehavior: true }, hint: 'Followers copy leader behavior (fight when leader fights)' },
            { type: 'groupEnd' },

            // Patrol
            { type: 'groupStart', label: '📍 Patrol' },
                { key: 'patrolMode', label: 'Patrol Mode', type: 'select', options: ['none', 'waypoints', 'random', 'circuit'] },
                { key: 'patrolPoints', label: 'Patrol Waypoints', type: 'array', elementType: 'vector2', defaultValue: { x: 0, y: 0 }, showIf: (m) => m.patrolMode === 'waypoints' || m.patrolMode === 'circuit' },
                { key: 'patrolWaitTime', label: 'Patrol Wait Time', type: 'number', min: 0, max: 30, step: 0.5, showIf: (m) => m.patrolMode !== 'none' },
                { key: 'patrolChaseEnemies', label: 'Chase Enemies', type: 'boolean', hint: 'Chase and attack enemies while patrolling' },
                { key: 'patrolReturnAfterChase', label: 'Return After Chase', type: 'boolean', showIf: { patrolChaseEnemies: true }, hint: 'Return to patrol route after defeating enemies' },
            { type: 'groupEnd' },

            // Base Defense
            { type: 'groupStart', label: '🏰 Base Defense' },
                { type: 'hint', hint: 'Defend or attack a target object. Set defaultState to "base defense" to enable.' },
                { key: 'baseTargetPrefab', label: 'Base Target Prefab', type: 'prefab', hint: 'Prefab name of the target object' },
                { key: 'baseTargetTag', label: 'Base Target Tag', type: 'text', hint: 'Alternative: tag to find target (if prefab not set)' },
                { key: 'baseDefenseMode', label: 'Mode', type: 'select', options: ['defend', 'attack'], hint: 'Defend = protect the base, Attack = assault the base (for enemy waves)' },
                { key: 'baseDefenseRadius', label: 'Defense Radius', type: 'number', min: 20, max: 500, showIf: (m) => m.baseDefenseMode === 'defend', hint: 'How close to stay to the base' },
                { key: 'basePatrolAroundBase', label: 'Patrol Around Base', type: 'boolean', showIf: (m) => m.baseDefenseMode === 'defend', hint: 'Patrol around the base instead of standing still' },
                { key: 'basePatrolRadius', label: 'Patrol Radius', type: 'number', min: 30, max: 500, showIf: (m) => m.baseDefenseMode === 'defend' && m.basePatrolAroundBase, hint: 'Radius to patrol around the base' },
                { key: 'baseDefenseAggression', label: 'Chase Enemies', type: 'boolean', showIf: (m) => m.baseDefenseMode === 'defend', hint: 'Chase and attack enemies when defending base' },
            { type: 'groupEnd' },

            // Investigation
            { type: 'groupStart', label: '🔍 Investigation' },
                { key: 'investigateDuration', label: 'Investigate Duration', type: 'number', min: 0.5, max: 20, step: 0.5 },
                { key: 'investigateChance', label: 'Investigate Chance', type: 'slider', min: 0, max: 1, step: 0.05 },
            { type: 'groupEnd' },

            // Advanced Navigation
            { type: 'groupStart', label: '🧭 Advanced Navigation' },
                { type: 'hint', hint: 'Smart pathfinding with position history, stuck detection, and backtracking' },
                { key: 'navigationHistorySize', label: 'Position History Size', type: 'number', min: 3, max: 30, hint: 'Number of past positions to remember for backtracking' },
                { key: 'failedLocationMemorySize', label: 'Failed Locations Memory', type: 'number', min: 3, max: 30, hint: 'Number of failed/stuck locations to remember' },
                { key: 'stuckDetectionMargin', label: 'Stuck Detection Margin', type: 'number', min: 1, max: 20, hint: 'Pixels - if moved less than this while trying to move, considered stuck' },
                { key: 'stuckTimeThreshold', label: 'Stuck Time Threshold', type: 'slider', min: 0.3, max: 3.0, step: 0.1, hint: 'Seconds of no progress before triggering stuck response' },
                { key: 'avoidanceDurationMin', label: 'Avoidance Duration Min', type: 'slider', min: 0.3, max: 3.0, step: 0.1, hint: 'Min seconds to walk in avoidance direction' },
                { key: 'avoidanceDurationMax', label: 'Avoidance Duration Max', type: 'slider', min: 0.5, max: 5.0, step: 0.1, hint: 'Max seconds before retrying target direction' },
                { key: 'backtrackCooldown', label: 'Backtrack Cooldown', type: 'number', min: 1, max: 30, hint: 'Seconds between backtrack attempts' },
                { key: 'failedAngleMemoryTime', label: 'Failed Angle Memory', type: 'number', min: 5, max: 120, hint: 'Seconds to remember a failed approach angle' },
                { key: 'angleRetryMargin', label: 'Angle Retry Margin', type: 'slider', min: 10, max: 90, step: 5, hint: 'Degrees - avoid angles within this range of failed angles' },
            { type: 'groupEnd' },

            // Predictive Chase
            { type: 'groupStart', label: '🎯 Predictive Chase' },
                { type: 'hint', hint: 'Intercept moving targets by predicting where they will be' },
                { key: 'enablePredictiveChase', label: 'Enable Prediction', type: 'boolean', hint: 'Predict where target will be and intercept' },
                { key: 'predictionLookahead', label: 'Prediction Time', type: 'slider', min: 0.2, max: 3.0, step: 0.1, showIf: { enablePredictiveChase: true }, hint: 'Seconds ahead to predict target position' },
                { key: 'predictionUpdateInterval', label: 'Update Interval', type: 'slider', min: 0.1, max: 1.0, step: 0.05, showIf: { enablePredictiveChase: true } },
            { type: 'groupEnd' },

            // Flanking Behavior
            { type: 'groupStart', label: '🔄 Flanking Behavior' },
                { type: 'hint', hint: 'Approach targets from the side or behind for tactical advantage' },
                { key: 'enableFlanking', label: 'Enable Flanking', type: 'boolean', hint: 'Try to approach targets from side/behind' },
                { key: 'flankingAngleOffset', label: 'Flank Angle', type: 'slider', min: 15, max: 135, step: 5, showIf: { enableFlanking: true }, hint: 'Degrees offset from direct approach' },
                { key: 'flankingChance', label: 'Flanking Chance', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enableFlanking: true }, hint: 'Chance to attempt flanking vs direct' },
            { type: 'groupEnd' },

            // Corridor Navigation
            { type: 'groupStart', label: '🚇 Corridor Detection' },
                { type: 'hint', hint: 'Detect narrow passages and navigate them more carefully' },
                { key: 'enableCorridorDetection', label: 'Enable Detection', type: 'boolean', hint: 'Detect narrow passages' },
                { key: 'corridorWidth', label: 'Corridor Width', type: 'number', min: 30, max: 200, showIf: { enableCorridorDetection: true }, hint: 'Max width to be considered a corridor' },
                { key: 'corridorSlowdown', label: 'Corridor Speed', type: 'slider', min: 0.3, max: 1.0, step: 0.05, showIf: { enableCorridorDetection: true }, hint: 'Speed multiplier in corridors' },
            { type: 'groupEnd' },

            // Scent Trails
            { type: 'groupStart', label: '👃 Scent Trails' },
                { type: 'hint', hint: 'Leave scent markers and follow trails left by other creatures' },
                { key: 'enableScentTrails', label: 'Enable Scent Trails', type: 'boolean', hint: 'Leave and follow scent trails' },
                { key: 'scentDropInterval', label: 'Drop Interval', type: 'slider', min: 0.5, max: 5.0, step: 0.25, showIf: { enableScentTrails: true }, hint: 'Seconds between scent drops' },
                { key: 'scentLifetime', label: 'Scent Lifetime', type: 'number', min: 10, max: 300, showIf: { enableScentTrails: true }, hint: 'Seconds before scent fades' },
                { key: 'scentFollowStrength', label: 'Follow Strength', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enableScentTrails: true }, hint: 'How strongly to follow scent trails' },
                { key: 'scentTrailTag', label: 'Follow Tag', type: 'text', showIf: { enableScentTrails: true }, hint: 'Tag of creatures to follow (empty = family)' },
            { type: 'groupEnd' },

            // Jump Navigation
            { type: 'groupStart', label: '🦘 Jump Navigation' },
                { type: 'hint', hint: 'Allow jumping over small obstacles' },
                { key: 'enableJumpNavigation', label: 'Enable Jump', type: 'boolean', hint: 'Can jump over obstacles' },
                { key: 'maxJumpDistance', label: 'Max Jump Distance', type: 'number', min: 30, max: 300, showIf: { enableJumpNavigation: true }, hint: 'Pixels creature can jump' },
                { key: 'jumpCooldown', label: 'Jump Cooldown', type: 'number', min: 0.5, max: 10, showIf: { enableJumpNavigation: true } },
                { key: 'jumpHeightThreshold', label: 'Max Obstacle Width', type: 'number', min: 10, max: 100, showIf: { enableJumpNavigation: true }, hint: 'Max obstacle width jumpable' },
            { type: 'groupEnd' },

            // Terrain Preference
            { type: 'groupStart', label: '🗺️ Terrain Preference' },
                { type: 'hint', hint: 'Prefer or avoid certain terrain types' },
                { key: 'enableTerrainPreference', label: 'Enable', type: 'boolean', hint: 'Consider terrain preferences' },
                { key: 'preferredTerrainTag', label: 'Preferred Tag', type: 'text', showIf: { enableTerrainPreference: true }, hint: 'Tag of preferred terrain' },
                { key: 'avoidedTerrainTag', label: 'Avoided Tag', type: 'text', showIf: { enableTerrainPreference: true }, hint: 'Tag of terrain to avoid' },
                { key: 'terrainAvoidanceStrength', label: 'Avoidance Strength', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { enableTerrainPreference: true } },
            { type: 'groupEnd' },

            // Dynamic Obstacles
            { type: 'groupStart', label: '🔮 Dynamic Obstacle Prediction' },
                { type: 'hint', hint: 'Predict and avoid moving obstacles' },
                { key: 'enableDynamicObstaclePrediction', label: 'Enable', type: 'boolean', hint: 'Predict moving obstacle positions' },
                { key: 'movingObstacleMemory', label: 'Memory Time', type: 'number', min: 0.5, max: 10, showIf: { enableDynamicObstaclePrediction: true }, hint: 'Seconds to track obstacle movement' },
            { type: 'groupEnd' },

            // Items
            { type: 'groupStart', label: '🎒 Item Interaction' },
                { key: 'canPickUpItems', label: 'Can Pick Up Items', type: 'boolean', hint: 'Requires creature to have arms' },
                { key: 'itemPickupBehavior', label: 'Pickup Behavior', type: 'select', options: ['opportunistic', 'aggressive', 'defensive', 'never'], showIf: { canPickUpItems: true }, hint: 'How creature decides to pick up items' },
                { type: 'hint', hint: 'Opportunistic: grab nearby items when idle. Aggressive: actively seek weapons. Defensive: seek weapons only when attacked.', showIf: { canPickUpItems: true } },
                { key: 'preferredItemType', label: 'Preferred Type', type: 'select', options: ['', 'weapon', 'food', 'tool', 'gun', 'shield'], showIf: { canPickUpItems: true }, hint: 'Empty = any item' },
                { key: 'prioritizeWeapons', label: 'Prioritize Weapons', type: 'boolean', showIf: { canPickUpItems: true }, hint: 'Prefer weapons over other items' },
                { key: 'seekWeaponsWhenAttacked', label: 'Seek Weapons When Hit', type: 'boolean', showIf: { canPickUpItems: true }, hint: 'When damaged, seek remembered weapon locations' },
                { key: 'dropItemOnFlee', label: 'Drop Items When Fleeing', type: 'boolean', showIf: { canPickUpItems: true }, hint: 'Drop held items when entering flee state' },
                { key: 'itemSearchRadius', label: 'Item Search Radius', type: 'number', min: 10, max: 500, showIf: { canPickUpItems: true } },
                { key: 'itemPickupTag', label: 'Item Tag', type: 'text', showIf: { canPickUpItems: true } },
            { type: 'groupEnd' },

            // Cornered Behavior
            { type: 'groupStart', label: '🔺 Cornered Behavior' },
                { type: 'hint', hint: 'Makes creature flee from enemies but fight back when cornered (no escape routes)' },
                { key: 'corneredBehavior', label: 'Enable Cornered Behavior', type: 'boolean', hint: 'Flee until cornered, then fight' },
                { key: 'corneredDistance', label: 'Corner Distance', type: 'number', min: 20, max: 200, showIf: { corneredBehavior: true }, hint: 'Distance to wall before considered blocked' },
                { key: 'corneredEscapeThreshold', label: 'Escape Routes Needed', type: 'number', min: 0, max: 4, showIf: { corneredBehavior: true }, hint: 'Minimum escape routes to not be cornered (0-4)' },
                { key: 'corneredAggressionBoost', label: 'Aggression Boost', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { corneredBehavior: true }, hint: 'Added aggression when cornered' },
                { key: 'corneredCourageBoost', label: 'Courage Boost', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { corneredBehavior: true }, hint: 'Added courage when cornered' },
                { key: 'corneredAttackMultiplier', label: 'Damage Multiplier', type: 'slider', min: 1, max: 3, step: 0.1, showIf: { corneredBehavior: true }, hint: 'Damage bonus when cornered' },
            { type: 'groupEnd' },

            // Debug
            { type: 'groupStart', label: '🐛 Debug' },
                { key: 'debugDraw', label: 'Debug Draw', type: 'boolean' },
                { key: 'debugShowState', label: 'Show State Label', type: 'boolean' },
                { key: 'debugShowMemory', label: 'Show Memory', type: 'boolean', hint: 'Shows food/water/threat memory and navigation history' },
                { key: 'debugShowDetection', label: 'Show Detection Radius', type: 'boolean' },
                { key: 'debugShowNavigation', label: 'Show Navigation Debug', type: 'boolean', hint: 'Shows position history, failed angles, backtrack targets' },
            { type: 'groupEnd' },
        ];
    }

    // ==================== LIFECYCLE ====================

    start() {
        this._creature = this.gameObject.getModule('ProceduralCreature');
        if (!this._creature) {
            //console.warn('ProceduralCreatureBrain: No ProceduralCreature module found on this gameObject!');
        } else {
            // Override creature's movement style to be controlled externally
            // Without this, ProceduralCreature's own velocity loop runs ON TOP of
            // the Brain's direct position changes in _moveToward(), causing
            // compounding velocity feedback (endLoop captures total delta → next
            // frame creature loop re-applies it → speed spirals to ~6-7× intended).
            this._creature.movementStyle = 'controlled';
        }

        // Initialize nest position
        if (this.enableNest && this.useStartPositionAsNest) {
            const pos = this.gameObject.getWorldPosition();
            this._nestWorldPos = { x: pos.x, y: pos.y };
        } else if (this.enableNest) {
            this._nestWorldPos = { x: this.nestPosition.x, y: this.nestPosition.y };
        }

        // Store starting position for guard/patrol states (for returning after chase)
        const startPos = this.gameObject.getWorldPosition();
        this._guardOriginPosition = { x: startPos.x, y: startPos.y };
        this._guardWasChasing = false;
        this._patrolSavedPosition = null;
        this._patrolWasChasing = false;
        this._followWasChasing = false;

        //console.log(`[Brain] ${this.gameObject.name || 'Creature'} initialized - temperament: ${this.temperament}, hostileTags: [${this.hostileTags.join(', ')}], aggression: ${this.aggressionLevel}, canPickUpItems: ${this.canPickUpItems}, armCount: ${this._creature ? this._creature.armCount : 0}`);
        this._changeState(this.defaultState);
    }

    loop(deltaTime) {
        if (!this.aiEnabled || !this._creature || this._creature.isDead) return;

        // Update needs
        this._updateNeeds(deltaTime);

        // Check for friendly fire damage (same-tag attackers)
        this._checkFriendlyFireDamage();

        // Check for general damage response (retaliate against any attacker)
        this._checkDamageResponse();

        // Update mood
        this._updateMood(deltaTime);

        // Periodic detection scan
        this._detectionTimer += deltaTime;
        if (this._detectionTimer >= this.detectionCheckInterval) {
            this._performDetection();
            this._detectionTimer = 0;
        }

        // Decay old memories
        this._decayMemories();

        // Update advanced navigation (position history, stuck detection)
        this._updateAdvancedNavigation(deltaTime);

        // Update scent trail system
        if (this.enableScentTrails) {
            this._updateScentTrails(deltaTime);
        }

        // Update predictive chase
        if (this.enablePredictiveChase && this._chaseTarget) {
            this._updatePredictiveChase(deltaTime);
        }

        // Update dynamic obstacle tracking
        if (this.enableDynamicObstaclePrediction) {
            this._updateDynamicObstacles(deltaTime);
        }

        // Update corridor detection
        if (this.enableCorridorDetection) {
            this._updateCorridorDetection();
        }

        // Update pack relationships
        if (this.enablePackBehavior) {
            this._updatePackBehavior(deltaTime);
        }

        // Update item pickup behavior
        if (this.canPickUpItems && this._creature.armCount > 0) {
            this._updateItemPickupBehavior(deltaTime);
        }

        // Run state machine
        this._stateTime += deltaTime;
        this._updateStateMachine(deltaTime);

        // Ensure chase target is set when enemies are detected and creature should chase
        // Skip for commanded creatures - they only chase through the normal priority system with proper flag setting
        if (!this.commandedByPlayer && !this._chaseTarget && this._detectedEnemies.length > 0 && this._shouldChase() && 
            this.currentState !== 'chase' && this.currentState !== 'hunt' && this.currentState !== 'flee') {
            this._chaseTarget = this._getClosestEnemy();
            if (this._chaseTarget) {
                //console.log(`[Brain] ${this.gameObject.name || 'Creature'} engaging enemy: ${this._chaseTarget.name || 'unknown'}`);
                this._changeState('chase');
            }
        }

        // Apply separation from other creatures
        if (this.enableSeparation) {
            this._applySeparation(deltaTime);
        }
    }

    draw(ctx) {
        if (!this.debugDraw) return;
        if (!this._creature) return;

        const pos = this._creature.getHeadPosition();

        this.drawUntethered(ctx);
        ctx.save();

        // Detection radius
        if (this.debugShowDetection) {
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.detectionRadius, 0, Math.PI * 2);
            ctx.stroke();

            // FOV cone
            const facing = this._creature.getFacingAngle();
            const halfFov = (this.fieldOfView / 2) * Math.PI / 180;
            ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.arc(pos.x, pos.y, this.detectionRadius, facing - halfFov, facing + halfFov);
            ctx.closePath();
            ctx.fill();
        }

        // State label
        if (this.debugShowState) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.currentState.toUpperCase(), pos.x, pos.y - 30);
            if (this._creature) {
                const hp = this._creature.health;
                const maxHp = this._creature.maxHealth;
                ctx.fillStyle = hp > maxHp * 0.5 ? '#4f4' : hp > maxHp * 0.25 ? '#ff4' : '#f44';
                ctx.fillText(`HP: ${Math.round(hp)}/${maxHp}`, pos.x, pos.y - 20);
                ctx.fillText(`commandedByPlayer: ${this.commandedByPlayer}`, pos.x, pos.y - 40);
            }
        }

        // Memory dots
        if (this.debugShowMemory) {
            // Food memories (green)
            ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            for (const mem of this._foodMemories) {
                ctx.beginPath();
                ctx.arc(mem.x, mem.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            // Water memories (blue)
            ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
            for (const mem of this._waterMemories) {
                ctx.beginPath();
                ctx.arc(mem.x, mem.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            // Threat memories (red)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            for (const mem of this._threatMemories) {
                ctx.beginPath();
                ctx.arc(mem.x, mem.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
            
        // ====== ADVANCED NAVIGATION DEBUG ======
        if (this.debugShowNavigation || this.debugShowMemory) {
            // Position history (cyan trail)
            if (this._positionHistory.length > 1) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this._positionHistory[0].x, this._positionHistory[0].y);
                for (let i = 1; i < this._positionHistory.length; i++) {
                    ctx.lineTo(this._positionHistory[i].x, this._positionHistory[i].y);
                }
                ctx.stroke();
                
                // Draw dots at each position
                for (let i = 0; i < this._positionHistory.length; i++) {
                    const hist = this._positionHistory[i];
                    const alpha = 0.3 + (i / this._positionHistory.length) * 0.5;
                    ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(hist.x, hist.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Failed locations (orange X marks)
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
            ctx.lineWidth = 2;
            for (const failed of this._failedLocations) {
                const size = 6 + Math.min(failed.failCount * 2, 10);
                ctx.beginPath();
                ctx.moveTo(failed.x - size, failed.y - size);
                ctx.lineTo(failed.x + size, failed.y + size);
                ctx.moveTo(failed.x + size, failed.y - size);
                ctx.lineTo(failed.x - size, failed.y + size);
                ctx.stroke();
            }
            
            // Failed angles (red lines from position)
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
            ctx.lineWidth = 1;
            for (const failed of this._failedAngles) {
                const length = 30;
                const rad = failed.angle * Math.PI / 180;
                ctx.beginPath();
                ctx.moveTo(failed.fromX, failed.fromY);
                ctx.lineTo(
                    failed.fromX + Math.cos(rad) * length,
                    failed.fromY + Math.sin(rad) * length
                );
                ctx.stroke();
                // Small X at the end
                const endX = failed.fromX + Math.cos(rad) * length;
                const endY = failed.fromY + Math.sin(rad) * length;
                ctx.beginPath();
                ctx.moveTo(endX - 3, endY - 3);
                ctx.lineTo(endX + 3, endY + 3);
                ctx.moveTo(endX + 3, endY - 3);
                ctx.lineTo(endX - 3, endY + 3);
                ctx.stroke();
            }
            
            // Backtrack target (magenta)
            if (this._isBacktracking && this._backtrackTarget) {
                ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(this._backtrackTarget.x, this._backtrackTarget.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw diamond at backtrack target
                ctx.fillStyle = 'rgba(255, 0, 255, 0.6)';
                ctx.beginPath();
                ctx.moveTo(this._backtrackTarget.x, this._backtrackTarget.y - 8);
                ctx.lineTo(this._backtrackTarget.x + 8, this._backtrackTarget.y);
                ctx.lineTo(this._backtrackTarget.x, this._backtrackTarget.y + 8);
                ctx.lineTo(this._backtrackTarget.x - 8, this._backtrackTarget.y);
                ctx.closePath();
                ctx.fill();
            }
            
            // Show stuck timer if building up
            if (this._stuckTimer > 0.2) {
                const stuckPercent = Math.min(this._stuckTimer / this.stuckTimeThreshold, 1);
                ctx.fillStyle = `rgba(255, ${Math.floor(255 * (1 - stuckPercent))}, 0, 0.8)`;
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`STUCK: ${(stuckPercent * 100).toFixed(0)}%`, pos.x, pos.y - 40);
            }
            
            // Show alternate angle attempts
            if (this._alternateAngleAttempts > 0) {
                ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`ALT: ${this._alternateAngleAttempts}`, pos.x, pos.y - 50);
            }
        }

        // Wander/chase target
        if (this._wanderTarget) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(this._wanderTarget.x, this._wanderTarget.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
        this.drawTethered(ctx);
    }

    // ==================== STATE MACHINE ====================

    _changeState(newState) {
        if (this.currentState === newState) return;
        const oldState = this.currentState;
        this.currentState = newState;
        this._stateTime = 0;
        this._stateData = {};
        this._lastStateChange = performance.now() / 1000;
        //this._clearPathfinding();
        //console.log(`[Brain] ${this.gameObject.name || 'Creature'} state: ${oldState} → ${newState}`);
    }

    _updateStateMachine(deltaTime) {
        // If being targeted for command, stop and face the player
        if (this._facingForCommand && this._facingForCommandTarget) {
            const targetPos = this._facingForCommandTarget.getWorldPosition ? 
                this._facingForCommandTarget.getWorldPosition() : this._facingForCommandTarget.position;
            if (targetPos) {
                const myPos = this.gameObject.getWorldPosition();
                const angleToPlayer = Math.atan2(targetPos.y - myPos.y, targetPos.x - myPos.x) * 180 / Math.PI;
                this._smoothRotateTo(angleToPlayer, deltaTime);
            }
            return; // Don't process any state logic while waiting for command
        }

        // Priority interrupts: check for urgent state transitions
        // Skip most priority checks if commanded by player (only allow combat interrupts)
        if (!this.commandedByPlayer) {
            // Non-commanded creatures check all priorities
            if (this._shouldFlee()) {
                if (this.currentState !== 'flee') this._changeState('flee');
            } else if (this._shouldChase()) {
                if (this.currentState !== 'chase' && this.currentState !== 'hunt') this._changeState('chase');
            } else if (this._shouldSeekFood()) {
                if (this.currentState !== 'eat' && this.currentState !== 'seekFood') this._changeState('seekFood');
            } else if (this._shouldSeekWater()) {
                if (this.currentState !== 'drink' && this.currentState !== 'seekWater') this._changeState('seekWater');
            } else if (this._shouldSeekItem()) {
                if (this.currentState !== 'seekItem') this._changeState('seekItem');
            } else if (this._shouldReturnToNest()) {
                if (this.currentState !== 'returnToNest' && this.currentState !== 'sleep') this._changeState('returnToNest');
            }
        } else {
            // Commanded creatures: only interrupt for combat (chase enemies when attacked)
            // Still allow retaliation so they can defend themselves
            if (this._shouldChase() && this.retaliateWhenAttacked) {
                if (this.currentState !== 'chase' && this.currentState !== 'hunt') {
                    // Set appropriate "was chasing" flags so we return to the commanded state after combat
                    const currentPos = this.gameObject.getWorldPosition();
                    if (this.currentState === 'guard') {
                        this._guardWasChasing = true;
                        if (!this._guardOriginPosition) {
                            this._guardOriginPosition = { x: currentPos.x, y: currentPos.y };
                        }
                    } else if (this.currentState === 'patrol') {
                        this._patrolWasChasing = true;
                        this._patrolSavedPosition = { x: currentPos.x, y: currentPos.y };
                    } else if (this.currentState === 'follow') {
                        this._followWasChasing = true;
                    }
                    
                    this._chaseTarget = this._getClosestEnemy();
                    this._changeState('chase');
                }
            }
        }

        // Safety net: commanded creatures should never be idle/wandering - redirect to follow
        if (this.commandedByPlayer && (this.currentState === 'idle' || this.currentState === 'wander')) {
            // Only correct defaultState if it's genuinely unset/wrong
            // Do NOT overwrite valid commanded states like 'base defense', 'guard', 'patrol'
            const validCommandedStates = ['follow', 'guard', 'patrol', 'base defense'];
            if (this._commandedByPlayerObject && !validCommandedStates.includes(this.defaultState)) {
                this.defaultState = 'follow';
                this._leader = this._commandedByPlayerObject;
            }
            this._changeState(this.defaultState);
        }

        switch (this.currentState) {
            case 'idle': this._stateIdle(deltaTime); break;
            case 'wander': this._stateWander(deltaTime); break;
            case 'patrol': this._statePatrol(deltaTime); break;
            case 'chase': this._stateChase(deltaTime); break;
            case 'hunt': this._stateHunt(deltaTime); break;
            case 'flee': this._stateFlee(deltaTime); break;
            case 'follow': this._stateFollow(deltaTime); break;
            case 'guard': this._stateGuard(deltaTime); break;
            case 'seekFood': this._stateSeekFood(deltaTime); break;
            case 'eat': this._stateEat(deltaTime); break;
            case 'seekWater': this._stateSeekWater(deltaTime); break;
            case 'drink': this._stateDrink(deltaTime); break;
            case 'seekItem': this._stateSeekItem(deltaTime); break;
            case 'investigate': this._stateInvestigate(deltaTime); break;
            case 'returnToNest': this._stateReturnToNest(deltaTime); break;
            case 'sleep': this._stateSleep(deltaTime); break;
            case 'base defense': this._stateBaseDefense(deltaTime); break;
            case 'returnToPost': this._stateReturnToPost(deltaTime); break;
            default: 
                // Don't fall back to wander for guard/patrol/base defense default states
                this._changeState(this.defaultState); 
                break;
        }
    }

    // ==================== PRIORITY CHECKS ====================

    _shouldFlee() {
        // Check cornered behavior - flee from fear tags but can flip to aggressive
        if (this.corneredBehavior && this.fearTags.length > 0 && 
            this._detectedEnemies.some(e => this._hasAnyTag(e, this.fearTags))) {
            return true;
        }
        
        // Passive/timid creatures flee from enemies (unless brave enough)
        if (this.temperament === 'passive' || this.temperament === 'timid') {
            if (this._detectedEnemies.length > 0) {
                const effectiveCourage = this._getEffectiveCourage();
                if (effectiveCourage < 0.3) return true;
            }
        }
        // Flee if health low — but NOT hostile/aggressive creatures (they fight to the death based on courage)
        if (this._creature && this.temperament !== 'hostile' && this.temperament !== 'aggressive') {
            if (this._creature.health / this._creature.maxHealth <= this.fleeHealthThreshold) {
                const braveryRoll = this._getEffectiveCourage() + this._currentMood * 0.2 + this._personalityRoll * 0.1;
                if (braveryRoll < 0.7) return true;
            }
        }
        // Fear tags — all temperaments flee from things they specifically fear
        if (this.fearTags.length > 0 && this._detectedEnemies.some(e => this._hasAnyTag(e, this.fearTags))) {
            return true;
        }
        return false;
    }

    /**
     * Check if creature should seek an item (weapon when attacked for defensive, or actively for aggressive)
     */
    _shouldSeekItem() {
        if (!this.canPickUpItems || this.itemPickupBehavior === 'never') return false;
        if (!this._creature || this._creature.armCount === 0) return false;
        
        // Check if hands are free
        const emptyArm = this._creature.getNextEmptyArm();
        if (emptyArm === -1) return false;
        
        // Defensive: only seek weapons when recently attacked
        if (this.itemPickupBehavior === 'defensive') {
            const wasRecentlyAttacked = this._creature._lastDamageTime && 
                (performance.now() / 1000 - this._creature._lastDamageTime < 10);
            
            if (wasRecentlyAttacked && this.seekWeaponsWhenAttacked) {
                // Check if we have weapons in memory
                const weaponMem = this._findBestWeaponFromMemory();
                if (weaponMem) {
                    this._seekItemTarget = weaponMem;
                    return true;
                }
            }
            return false;
        }
        
        // Aggressive: actively seek weapons whenever hands are free
        if (this.itemPickupBehavior === 'aggressive') {
            // Prioritize weapons
            if (this.prioritizeWeapons) {
                const weaponMem = this._findBestWeaponFromMemory();
                if (weaponMem) {
                    this._seekItemTarget = weaponMem;
                    return true;
                }
                // Also check currently detected items
                for (const item of this._detectedItems) {
                    const itemMod = item.getModule ? item.getModule('ProceduralCreatureItem') : null;
                    if (itemMod && !itemMod.isHeld && 
                        (itemMod.itemType === 'weapon' || itemMod.itemType === 'gun' || itemMod.itemType === 'tool')) {
                        const iPos = item.getWorldPosition();
                        this._seekItemTarget = { x: iPos.x, y: iPos.y, objectId: item.id, obj: item };
                        return true;
                    }
                }
            }
            // Pick up any item
            if (this._detectedItems.length > 0) {
                const item = this._detectedItems[0];
                const itemMod = item.getModule ? item.getModule('ProceduralCreatureItem') : null;
                if (itemMod && !itemMod.isHeld) {
                    const iPos = item.getWorldPosition();
                    this._seekItemTarget = { x: iPos.x, y: iPos.y, objectId: item.id, obj: item };
                    return true;
                }
            }
        }
        
        return false;
    }

    _shouldChase() {
        // Priority 1: Retaliation target from being attacked
        if (this._retaliationTarget && this.retaliateWhenAttacked) {
            // Check if retaliation target is still valid and within time limit
            const now = performance.now() / 1000;
            const timeSinceAttack = now - this._lastAttackerTime;
            if (timeSinceAttack < this.retaliationDuration) {
                // Verify target still exists and isn't dead
                let targetPos = null;
                try {
                    targetPos = this._retaliationTarget.getWorldPosition ? this._retaliationTarget.getWorldPosition() : this._retaliationTarget.position;
                } catch(e) { /* target may have been destroyed */ }
                
                if (targetPos) {
                    const targetCreature = this._retaliationTarget.getModule ? 
                        this._retaliationTarget.getModule('ProceduralCreature') : null;
                    if (!targetCreature || !targetCreature.isDead) {
                        // Valid retaliation target - passive creatures still won't chase unless courage allows
                        if (this.temperament !== 'passive') {
                            return true;
                        } else {
                            // Even passive creatures will defend themselves with enough courage
                            const effectiveCourage = this._getEffectiveCourage();
                            if (effectiveCourage > 0.5) return true;
                        }
                    } else {
                        // Target is dead, clear retaliation
                        this._retaliationTarget = null;
                    }
                } else {
                    // Target no longer exists
                    this._retaliationTarget = null;
                }
            } else {
                // Retaliation expired
                this._retaliationTarget = null;
            }
        }

        // Priority 2: Detected enemies based on hostile tags
        if (this._detectedEnemies.length === 0 && !this._retaliationTarget) return false;
        if (this.temperament === 'passive') return false;

        const effectiveAggression = this.aggressionLevel + this._currentMood * this.emotionalVariance * 0.5;

        // Territory defense
        if (this.territoryRadius > 0 && this._nestWorldPos) {
            for (const enemy of this._detectedEnemies) {
                const ePos = enemy.getWorldPosition();
                const dx = ePos.x - this._nestWorldPos.x;
                const dy = ePos.y - this._nestWorldPos.y;
                if (Math.sqrt(dx * dx + dy * dy) < this.territoryRadius) return true;
            }
        }

        // Hostile temperament: always attack detected enemies
        if (this.temperament === 'hostile' && this._detectedEnemies.length > 0) return true;
        // Aggressive temperament: attack when aggression is above low threshold
        if (this.temperament === 'aggressive' && this._detectedEnemies.length > 0 && effectiveAggression > 0.2) return true;
        // Neutral temperament: attack only when aggression is high
        if (this.temperament === 'neutral' && this._detectedEnemies.length > 0 && effectiveAggression > 0.7) return true;

        return false;
    }

    _shouldSeekFood() {
        return this.enableHunger && this.hunger >= this.hungerThreshold && this.currentState !== 'flee' && this.currentState !== 'chase';
    }

    _shouldSeekWater() {
        return this.enableThirst && this.thirst >= this.thirstThreshold && this.currentState !== 'flee' && this.currentState !== 'chase' && this.currentState !== 'seekFood';
    }

    _shouldReturnToNest() {
        if (!this.enableNest || !this._nestWorldPos) return false;
        const pos = this.gameObject.getWorldPosition();
        const dx = pos.x - this._nestWorldPos.x;
        const dy = pos.y - this._nestWorldPos.y;
        return Math.sqrt(dx * dx + dy * dy) > this.nestReturnDistance;
    }

    // ==================== STATE IMPLEMENTATIONS ====================

    _stateIdle(deltaTime) {
        this._creature.stop();
        
        if (this._trySeekNearbyItem(deltaTime)) return;
        this._updateItemPickupBehavior(deltaTime);
        
        this._wanderPauseTimer += deltaTime;
        // Use a longer minimum pause to prevent micro-idle-wander loops
        const pauseTime = Math.max(1.5, this.wanderPauseMin) + 
                          Math.random() * (this.wanderPauseMax - this.wanderPauseMin);
        if (this._wanderPauseTimer >= pauseTime) {
            this._wanderPauseTimer = 0;
            // Commanded/guard creatures don't wander from idle
            if (this.commandedByPlayer || this.defaultState === 'guard' || 
                this.defaultState === 'base defense') {
                this._changeState(this.defaultState);
            } else {
                this._changeState(this.defaultState);
            }
        }
    }

    _stateWander(deltaTime) {
        if (this._trySeekNearbyItem(deltaTime)) return;
        this._updateItemPickupBehavior(deltaTime);
        
        if (!this._wanderTarget) {
            this._pickWanderTarget();
        }
    
        if (this._wanderTarget) {
            const dist = this._distanceTo(this._wanderTarget.x, this._wanderTarget.y);
            
            // If target is too close (can happen after wander direction clamp), repick
            if (dist < this.wanderMinDistance * 0.5) {
                this._wanderTarget = null;
                this._changeState('idle');
                return;
            }
            
            const arrived = this._moveToward(this._wanderTarget.x, this._wanderTarget.y, this.wanderSpeed, deltaTime);
            if (arrived) {
                this._wanderTarget = null;
                this._wanderPauseTimer = 0;
                this._changeState('idle');
            }
        }
    }

    _statePatrol(deltaTime) {
        // For commanded creatures with empty patrolPoints, generate random patrol around saved position
        if (this.patrolMode === 'none') {
            this._changeState('wander');
            return;
        }
        
        // Handle random patrol with no predefined points (used by player commands)
        if (this.patrolPoints.length === 0 && this.patrolMode === 'random') {
            // Use saved position or current position as patrol center
            const center = this._patrolSavedPosition || this.gameObject.getWorldPosition();
            
            // If no current wander target, pick a random point around the patrol center
            if (!this._wanderTarget) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 50 + Math.random() * (this.wanderRadius * 0.5);
                this._wanderTarget = {
                    x: center.x + Math.cos(angle) * dist,
                    y: center.y + Math.sin(angle) * dist
                };
            }
            
            // Check for enemies while patrolling
            // Skip for commanded creatures - _updateStateMachine handles chase transitions with proper flag setting
            if (!this.commandedByPlayer && this.patrolChaseEnemies && this._detectedEnemies.length > 0 && this._shouldChase()) {
                this._patrolWasChasing = true;
                this._chaseTarget = this._getClosestEnemy();
                if (this._chaseTarget) {
                    //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (patrol) engaging enemy: ${this._chaseTarget.name || 'unknown'}`);
                    this._changeState('chase');
                    return;
                }
            }
            
            // Move toward wander target
            const arrived = this._moveToward(this._wanderTarget.x, this._wanderTarget.y, this.patrolSpeed, deltaTime);
            if (arrived) {
                // Wait at this point before moving to next
                this._patrolWaitTimer += deltaTime;
                this._creature.stop();
                if (this._patrolWaitTimer >= this.patrolWaitTime) {
                    this._patrolWaitTimer = 0;
                    this._wanderTarget = null; // Pick a new target next frame
                }
            }
            return;
        }

        // Check for enemies - chase them if we should
        // Skip for commanded creatures - _updateStateMachine handles chase transitions with proper flag setting
        if (!this.commandedByPlayer && this.patrolChaseEnemies && this._detectedEnemies.length > 0 && this._shouldChase()) {
            // Store current position for returning after chase
            const currentPos = this.gameObject.getWorldPosition();
            this._patrolSavedPosition = { x: currentPos.x, y: currentPos.y };
            this._patrolWasChasing = true;
            this._chaseTarget = this._getClosestEnemy();
            if (this._chaseTarget) {
                //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (patrol) engaging enemy: ${this._chaseTarget.name || 'unknown'}`);
                this._changeState('chase');
                return;
            }
        }

        const target = this.patrolPoints[this._patrolIndex];
        if (!target) {
            this._patrolIndex = 0;
            return;
        }

        const arrived = this._moveToward(target.x, target.y, this.patrolSpeed, deltaTime);
        if (arrived) {
            this._patrolWaitTimer += deltaTime;
            this._creature.stop();
            if (this._patrolWaitTimer >= this.patrolWaitTime) {
                this._patrolWaitTimer = 0;
                if (this.patrolMode === 'circuit') {
                    this._patrolIndex = (this._patrolIndex + 1) % this.patrolPoints.length;
                } else if (this.patrolMode === 'waypoints') {
                    this._patrolIndex++;
                    if (this._patrolIndex >= this.patrolPoints.length) {
                        this._patrolIndex = 0;
                    }
                } else if (this.patrolMode === 'random') {
                    this._patrolIndex = Math.floor(Math.random() * this.patrolPoints.length);
                }
            }
        }
    }

    _stateChase(deltaTime) {
        let target = this._chaseTarget;
    
        if (target) {
            const tc = target.getModule ? target.getModule('ProceduralCreature') : null;
            const basicTarget = target.getModule ? target.getModule('ProceduralCreatureBasicTarget') : null;
            if ((tc && tc.isDead) || (basicTarget && basicTarget.isDead)) {
                target = null;
                this._chaseTarget = null;
            }
        }
    
        if (!target && this._retaliationTarget) {
            const now = performance.now() / 1000;
            if (now - this._lastAttackerTime < this.retaliationDuration) {
                target = this._retaliationTarget;
            } else {
                this._retaliationTarget = null;
            }
        }
    
        if (!target) {
            target = this._getClosestEnemy();
        }
    
        if (!target) {
            this._retaliationTarget = null;
            this._isFlankingApproach = false;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._losLostTime = 0;
            this._returnToPostOrDefault();
            return;
        }
    
        this._chaseTarget = target;
    
        let targetPos;
        try {
            targetPos = target.getWorldPosition ? target.getWorldPosition() : target.position;
        } catch(e) {
            this._chaseTarget = null;
            this._isFlankingApproach = false;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._losLostTime = 0;
            this._returnToPostOrDefault();
            return;
        }
        if (!targetPos) {
            this._chaseTarget = null;
            this._isFlankingApproach = false;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._losLostTime = 0;
            this._returnToPostOrDefault();
            return;
        }
    
        this._addMemory(this._threatMemories, targetPos.x, targetPos.y, target.id);
    
        const dist = this._distanceTo(targetPos.x, targetPos.y);
        const hasArms = this._creature.armCount > 0;
        const baseRange = hasArms ? (this._creature.armLength || 30) : (this._creature.headSize || 15);
        const effectiveRange = this.attackRange > 0 ? this.attackRange : baseRange * 1.2;
    
        const holdingGun = this.enableGunDistanceKeeping && this._isHoldingGun();
        let gunRange = null;
        if (holdingGun) {
            gunRange = this._getGunEngagementRange();
        }
    
        let inRange = false;
        if (holdingGun) {
            inRange = dist >= gunRange.min && dist <= gunRange.max;
        } else {
            inRange = dist <= effectiveRange;
        }
    
        if (inRange) {
            this._changeState('hunt');
            return;
        }
    
        let moveTargetX = targetPos.x;
        let moveTargetY = targetPos.y;
        let moveSpeed = this.chaseSpeed;
    
        if (holdingGun && gunRange) {
            const myPos = this.gameObject.getWorldPosition();
            const angleToTarget = Math.atan2(targetPos.y - myPos.y, targetPos.x - myPos.x);
            const stopBackpedalDist = gunRange.min * 1.15;
            const shouldStartBackpedal = dist < gunRange.min / 2;
            const shouldStopBackpedal = dist >= stopBackpedalDist;
    
            if (shouldStartBackpedal || (this._isBackpedaling && !shouldStopBackpedal)) {
                this._isBackpedaling = true;
                const baseSpeed = this.moveSpeed * this.gunBackpedalSpeed;
                moveSpeed = baseSpeed;
    
                if (moveSpeed > 0.1) {
                    if (this._strafeTimer <= 0 && Math.random() < this.gunStrafeChance) {
                        this._strafeDirection = Math.random() < 0.5 ? 1 : -1;
                        this._strafeTimer = 1.5;
                    }
                    const awayAngle = angleToTarget + Math.PI;
                    let moveAngle = awayAngle;
                    let effectiveMoveSpeed = moveSpeed;
                    if (this._strafeTimer > 0) {
                        moveAngle = angleToTarget + (Math.PI / 2) * this._strafeDirection;
                        effectiveMoveSpeed = moveSpeed * this.gunStrafeSpeed / 2;
                        this._strafeTimer -= deltaTime;
                    }
                    const moveX = Math.cos(moveAngle) * effectiveMoveSpeed * deltaTime;
                    const moveY = Math.sin(moveAngle) * effectiveMoveSpeed * deltaTime;
                    if (this.enableCollision) {
                        this._resolveCollision(moveX, moveY, deltaTime, effectiveMoveSpeed);
                    } else {
                        this.gameObject.position.x += moveX;
                        this.gameObject.position.y += moveY;
                    }
                }
                this._smoothRotateTo(angleToTarget * 180 / Math.PI, deltaTime);
                return;
            } else if (dist > gunRange.max) {
                this._isBackpedaling = false;
                this._strafeTimer = 0;
                this._gunFaceTarget = null;
            } else {
                this._isBackpedaling = false;
                this._strafeTimer = 0;
                this._smoothRotateTo(angleToTarget * 180 / Math.PI, deltaTime);
                return;
            }
        } else {
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._gunFaceTarget = null;
        }
    
        if (!this._isBackpedaling && this.enablePredictiveChase && this._predictedInterceptPoint) {
            moveTargetX = this._predictedInterceptPoint.x;
            moveTargetY = this._predictedInterceptPoint.y;
        }
    
        if (!holdingGun && !this._isBackpedaling && this.enableFlanking && dist > effectiveRange * 2) {
            if (!this._isFlankingApproach && Math.random() < this.flankingChance) {
                this._isFlankingApproach = true;
                this._flankingSide = Math.random() < 0.5 ? 1 : -1;
            }
            if (this._isFlankingApproach) {
                const myPos = this.gameObject.getWorldPosition();
                const toTargetAngle = Math.atan2(moveTargetY - myPos.y, moveTargetX - myPos.x);
                const flankAngle = toTargetAngle + (this.flankingAngleOffset * Math.PI / 180) * this._flankingSide;
                const flankDist = Math.min(dist * 0.8, effectiveRange * 2);
                moveTargetX = targetPos.x - Math.cos(flankAngle) * flankDist;
                moveTargetY = targetPos.y - Math.sin(flankAngle) * flankDist;
                if (dist < effectiveRange * 2.5) {
                    this._isFlankingApproach = false;
                }
            }
        }
    
        this._moveToward(moveTargetX, moveTargetY, moveSpeed, deltaTime);
    
        // Lost target check
        let shouldLoseTarget = false;
        if (this.loseInterestWithoutLOS) {
            const hasLOS = this._hasLineOfSight(targetPos.x, targetPos.y);
            if (hasLOS) {
                this._losLostTime = 0;
            } else {
                this._losLostTime += deltaTime;
                if (this._losLostTime >= this.loseInterestTime) {
                    shouldLoseTarget = true;
                }
            }
        } else {
            if (dist > this.detectionRadius * 1.5) {
                shouldLoseTarget = true;
            }
        }
    
        if (shouldLoseTarget) {
            this._chaseTarget = null;
            this._isFlankingApproach = false;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._losLostTime = 0;
            this._investigatePos = { x: targetPos.x, y: targetPos.y };
            
            // Commanded creatures skip investigate — go straight back to commanded state
            if (this.commandedByPlayer) {
                this._returnToPostOrDefault();
            } else {
                this._changeState('investigate');
            }
        }

        const _engine = this.gameObject._engine;
        if (_engine && _engine.instances && !_engine.instances.includes(target)) {
            this._chaseTarget = null;
            this._retaliationTarget = null;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._returnToPostOrDefault();
            return;
        }
    }

    _stateHunt(deltaTime) {
        let target = this._chaseTarget;
    
        if (!target && this._retaliationTarget) {
            target = this._retaliationTarget;
            this._chaseTarget = target;
        }
    
        if (!target) {
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._returnToPostOrDefault();
            return;
        }
    
        const targetPos = target.getWorldPosition ? target.getWorldPosition() : (target.position || null);
        if (!targetPos) {
            this._chaseTarget = null;
            this._retaliationTarget = null;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._returnToPostOrDefault();
            return;
        }
    
        const dist = this._distanceTo(targetPos.x, targetPos.y);
        const hasArms = this._creature.armCount > 0;
        const baseRange = hasArms ? (this._creature.armLength || 30) : (this._creature.headSize || 15);
        const effectiveRange = this.attackRange > 0 ? this.attackRange : baseRange * 1.5;
    
        const holdingGun = this.enableGunDistanceKeeping && this._isHoldingGun();
        let gunRange = null;
        if (holdingGun) {
            gunRange = this._getGunEngagementRange();
        }
    
        let outOfRange = false;
        if (holdingGun) {
            outOfRange = dist > gunRange.max;
        } else {
            outOfRange = dist > effectiveRange * 2.0;
        }
    
        if (outOfRange) {
            this._changeState('chase');
            return;
        }
    
        const myPos = this.gameObject.getWorldPosition();
        const angleToTarget = Math.atan2(targetPos.y - myPos.y, targetPos.x - myPos.x);
    
        if (holdingGun) {
            const targetDist = gunRange.min;
            const stopBackpedalDist = targetDist * 1.15;
            const shouldStartBackpedal = dist < targetDist;
            const shouldStopBackpedal = dist >= stopBackpedalDist;
    
            if (shouldStartBackpedal || (this._isBackpedaling && !shouldStopBackpedal)) {
                this._isBackpedaling = true;
                const baseSpeed = this.moveSpeed * this.gunBackpedalSpeed;
                const urgency = Math.max(0, 1 - (dist / stopBackpedalDist));
                const moveSpeed = baseSpeed * urgency;
    
                if (moveSpeed > 0.1) {
                    if (this._strafeTimer <= 0 && Math.random() < this.gunStrafeChance) {
                        this._strafeDirection = Math.random() < 0.5 ? 1 : -1;
                        this._strafeTimer = 1.5;
                    }
                    const awayAngle = angleToTarget + Math.PI;
                    let moveAngle = awayAngle;
                    let effectiveMoveSpeed = moveSpeed;
                    if (this._strafeTimer > 0) {
                        moveAngle = angleToTarget + (Math.PI / 2) * this._strafeDirection;
                        effectiveMoveSpeed = moveSpeed * this.gunStrafeSpeed;
                        this._strafeTimer -= deltaTime;
                    }
                    const moveX = Math.cos(moveAngle) * effectiveMoveSpeed * deltaTime;
                    const moveY = Math.sin(moveAngle) * effectiveMoveSpeed * deltaTime;
                    if (this.enableCollision) {
                        this._resolveCollision(moveX, moveY, deltaTime, effectiveMoveSpeed);
                    } else {
                        this.gameObject.position.x += moveX;
                        this.gameObject.position.y += moveY;
                    }
                }
                const angleDeg = angleToTarget * 180 / Math.PI;
                this._smoothRotateTo(angleDeg, deltaTime);
            } else {
                this._isBackpedaling = false;
                this._strafeTimer = 0;
                const angleDeg = angleToTarget * 180 / Math.PI;
                this._smoothRotateTo(angleDeg, deltaTime);
            }
        } else {
            if (dist > effectiveRange * 0.5) {
                this._moveToward(targetPos.x, targetPos.y, this.chaseSpeed * 0.6, deltaTime);
            } else {
                const angleDeg = angleToTarget * 180 / Math.PI;
                this._smoothRotateTo(angleDeg, deltaTime);
            }
        }
    
        const now = performance.now() / 1000;
    
        if (holdingGun) {
            if (this._gunBurstShotsFired === undefined) {
                this._gunBurstShotsFired = 0;
                this._gunBurstPauseTimer = 0;
                this._gunReloadTimer = 0;
            }
            const heldGun = this._getHeldGun();
            if (heldGun && heldGun._isReloading) return;
            if (this._gunBurstPauseTimer > 0) {
                this._gunBurstPauseTimer -= deltaTime;
                if (this._creature && typeof this._creature.stopFiring === 'function') {
                    this._creature.stopFiring();
                }
                return;
            }
            const maxBurstSize = 3 + Math.floor(Math.random() * 6);
            if (this._gunBurstShotsFired >= maxBurstSize) {
                this._gunBurstPauseTimer = 0.5 + Math.random() * 1.0;
                this._gunBurstShotsFired = 0;
                if (this._creature && typeof this._creature.stopFiring === 'function') {
                    this._creature.stopFiring();
                }
                return;
            }
            if (now - this._lastAttackTime >= this.attackCooldown) {
                const didPunch = this._creature.punchCombo(targetPos.x, targetPos.y);
                if (didPunch) {
                    this._lastAttackTime = now;
                    this._gunBurstShotsFired++;
                }
            }
        } else {
            if (now - this._lastAttackTime >= this.attackCooldown) {
                let didAttack = false;
                if (this._creature.armCount > 0) {
                    didAttack = this._creature.punchCombo(targetPos.x, targetPos.y);
                } else {
                    didAttack = this._creature.headbutt(targetPos.x, targetPos.y);
                }
                if (didAttack) {
                    this._lastAttackTime = now;
                }
            }
        }
    
        const tc = target.getModule ? target.getModule('ProceduralCreature') : null;
        if (tc && tc.isDead) {
            this._chaseTarget = null;
            this._retaliationTarget = null;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._returnToPostOrDefault();
        }

        const _engine = this.gameObject._engine;
        if (_engine && _engine.instances && !_engine.instances.includes(target)) {
            this._chaseTarget = null;
            this._retaliationTarget = null;
            this._isBackpedaling = false;
            this._strafeTimer = 0;
            this._returnToPostOrDefault();
            return;
        }
    }

    _stateFlee(deltaTime) {
        const threat = this._getClosestEnemy() || this._fleeFrom;
        if (!threat) {
            this._changeState(this.defaultState);
            return;
        }

        const threatPos = threat.getWorldPosition ? threat.getWorldPosition() : (threat.position || threat);
        const myPos = this.gameObject.getWorldPosition();

        // Check if cornered (flee until cornered behavior)
        if (this.corneredBehavior) {
            this._updateCorneredState(deltaTime);
            
            if (this._isCornered) {
                // Cornered! Switch to aggressive combat
                this._chaseTarget = threat;
                this._changeState('chase');
                return;
            }
        }

        // Drop items if configured to do so when fleeing
        if (this.dropItemOnFlee && this._creature && this._creature.isHoldingItem()) {
            this._creature.dropAllItems();
        }

        // Run AWAY from threat
        const dx = myPos.x - threatPos.x;
        const dy = myPos.y - threatPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
            const fleeX = myPos.x + (dx / dist) * 200;
            const fleeY = myPos.y + (dy / dist) * 200;

            // Bias toward nest if available
            if (this._nestWorldPos) {
                const nestDX = this._nestWorldPos.x - myPos.x;
                const nestDY = this._nestWorldPos.y - myPos.y;
                const nestDist = Math.sqrt(nestDX * nestDX + nestDY * nestDY);
                if (nestDist > 0.1) {
                    const nestBias = 0.3;
                    const finalX = fleeX * (1 - nestBias) + (myPos.x + nestDX / nestDist * 200) * nestBias;
                    const finalY = fleeY * (1 - nestBias) + (myPos.y + nestDY / nestDist * 200) * nestBias;
                    this._moveToward(finalX, finalY, this.fleeSpeed, deltaTime);
                } else {
                    this._moveToward(fleeX, fleeY, this.fleeSpeed, deltaTime);
                }
            } else {
                this._moveToward(fleeX, fleeY, this.fleeSpeed, deltaTime);
            }
        }

        // Stop fleeing when far enough away and health not critical
        if (dist > this.detectionRadius * 1.2) {
            const healthPct = this._creature.health / this._creature.maxHealth;
            if (healthPct > this.fleeHealthThreshold + 0.1) {
                this._fleeFrom = null;
                this._isCornered = false;
                this._changeState(this.defaultState);
            }
        }
    }

    /**
     * Check if creature is cornered (no escape routes)
     */
    _updateCorneredState(deltaTime) {
        const now = performance.now() / 1000;
        if (now - this._lastCorneredCheck < this._corneredCheckInterval) return;
        this._lastCorneredCheck = now;

        const pos = this.gameObject.getWorldPosition();
        const checkDist = this.corneredDistance;
        const solids = this._getSolidObjects();
        
        // Check escape routes in 4 or 8 directions
        const numDirections = this.corneredCheckDirections >= 8 ? 8 : 4;
        const angleStep = (Math.PI * 2) / numDirections;
        let escapeRoutes = 0;
        
        for (let i = 0; i < numDirections; i++) {
            const angle = i * angleStep;
            const checkX = pos.x + Math.cos(angle) * checkDist;
            const checkY = pos.y + Math.sin(angle) * checkDist;
            
            // Check if this direction is clear
            if (!this._checkCollisionAt(checkX, checkY, solids)) {
                escapeRoutes++;
            }
        }
        
        // Consider cornered if not enough escape routes
        this._isCornered = escapeRoutes < this.corneredEscapeThreshold;
    }

    /**
     * Get effective aggression considering cornered state
     */
    _getEffectiveAggression() {
        let aggression = this.aggressionLevel + this._currentMood * this.emotionalVariance * 0.5;
        if (this._isCornered && this.corneredBehavior) {
            aggression += this.corneredAggressionBoost;
        }
        return Math.min(1, aggression);
    }

    /**
     * Get effective courage considering cornered state
     */
    _getEffectiveCourage() {
        let courage = this.courage + this._currentMood * this.emotionalVariance;
        if (this._isCornered && this.corneredBehavior) {
            courage += this.corneredCourageBoost;
        }
        return Math.min(1, courage);
    }

    _stateFollow(deltaTime) {
        // Ensure commanded creatures stay in follow mode and defaultState is correct
        if (this.commandedByPlayer && this._commandedByPlayerObject) {
            // Safety: ensure defaultState is 'follow' for commanded followers
            if (this.defaultState !== 'follow') {
                this.defaultState = 'follow';
            }
            // Ensure leader is set to the commander
            if (!this._leader) {
                this._leader = this._commandedByPlayerObject;
            }

            this._wanderTarget = null;
        }
        
        if (!this._leader) {
            // Commanded creatures: restore leader from commander reference before giving up
            if (this.commandedByPlayer && this._commandedByPlayerObject) {
                this._leader = this._commandedByPlayerObject;
            } else {
                // No leader - fall back to default state
                this._changeState(this.defaultState);
                return;
            }
        }

        const leaderPos = this._leader.getWorldPosition ? this._leader.getWorldPosition() : this._leader.position;
        if (!leaderPos) {
            this._changeState(this.defaultState);
            return;
        }
        
        const dist = this._distanceTo(leaderPos.x, leaderPos.y);

        // If commanded by player, never lose the leader - always follow
        if (!this.commandedByPlayer && dist > this.maxFollowDistance) {
            // Lost leader (only for non-commanded creatures)
            this._leader = null;
            this._changeState(this.defaultState);
            return;
        }

        // === DEFEND LEADER: If leader was recently attacked, chase the attacker ===
        if (this.commandedByPlayer || this.defendLeader) {
            const leaderCreature = this._leader.getModule ? this._leader.getModule('ProceduralCreature') : null;
            if (leaderCreature && leaderCreature._lastDamageSource && leaderCreature._lastDamageTime) {
                const now = performance.now() / 1000;
                const timeSinceLeaderHit = now - leaderCreature._lastDamageTime;
                // React within 5 seconds of leader being attacked
                if (timeSinceLeaderHit < 5.0 && leaderCreature._lastDamageSource !== this.gameObject) {
                    const attacker = leaderCreature._lastDamageSource;
                    // Check if attacker is still alive
                    const attackerCreature = attacker.getModule ? attacker.getModule('ProceduralCreature') : null;
                    const attackerAlive = !attackerCreature || !attackerCreature.isDead;
                    
                    if (attackerAlive && attacker !== this._leader) {
                        // Check fear: if attacker is in our fear list AND our courage is low, don't engage
                        let tooScared = false;
                        if (this.fearTags && this.fearTags.length > 0) {
                            const attackerTags = attacker.tags || [];
                            const isFeared = this.fearTags.some(t => attackerTags.includes(t));
                            if (isFeared) {
                                const effectiveCourage = this._getEffectiveCourage();
                                if (effectiveCourage < 0.6) {
                                    tooScared = true;
                                }
                            }
                        }
                        
                        if (!tooScared) {
                            // Defend the leader! Chase the attacker
                            this._followWasChasing = true;
                            this._chaseTarget = attacker;
                            //console.log(`[Brain] ${this.gameObject.name || 'Creature'} defending leader from ${attacker.name || 'unknown'}!`);
                            this._changeState('chase');
                            return;
                        }
                    }
                }
            }
        }

        // Use a buffer zone to prevent jittering: start moving at followDistance, stop at 70% of followDistance
        const stopDistance = this.followDistance * 0.7;

        if (dist > this.followDistance) {
            // Use faster speed when far away to catch up
            const speedMultiplier = dist > this.followDistance * 3 ? 1.5 : 1.0;
            this._moveToward(leaderPos.x, leaderPos.y, this.moveSpeed * speedMultiplier, deltaTime);
            this._isFollowMoving = true;
        } else if (dist < stopDistance || !this._isFollowMoving) {
            // Close enough - commanded creatures just stay close, don't mimic leader combat
            this._isFollowMoving = false;
            if (this.commandedByPlayer) {
                // Just idle near leader
                this._creature.stop();
                return;
            }
            
            // Non-commanded: mirror leader if configured
            if (this.mimicLeaderState) {
                const leaderBrain = this._leader.getModule ? this._leader.getModule('ProceduralCreatureBrain') : null;
                if (leaderBrain && (leaderBrain.currentState === 'chase' || leaderBrain.currentState === 'hunt')) {
                    this._chaseTarget = leaderBrain._chaseTarget;
                    if (this._chaseTarget) {
                        this._changeState('chase');
                        return;
                    }
                }
            }
            // Idle near leader
            this._creature.stop();
        } else {
            // In the buffer zone and was already moving - keep moving
            this._moveToward(leaderPos.x, leaderPos.y, this.moveSpeed, deltaTime);
        }
    }

    _stateGuard(deltaTime) {
        // Use guard origin position (stored at start) or nest position
        const guardPos = this._guardOriginPosition || this._nestWorldPos || this.gameObject.getWorldPosition();
        
        // Check for enemies - chase them if we should
        // Skip for commanded creatures - _updateStateMachine handles chase transitions with proper flag setting
        if (!this.commandedByPlayer && this._detectedEnemies.length > 0 && this._shouldChase()) {
            // Store that we're chasing from guard state
            this._guardWasChasing = true;
            this._chaseTarget = this._getClosestEnemy();
            if (this._chaseTarget) {
                //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (guard) engaging enemy: ${this._chaseTarget.name || 'unknown'}`);
                this._changeState('chase');
                return;
            }
        }
        
        const dist = this._distanceTo(guardPos.x, guardPos.y);

        if (dist > this.nestSafeRadius * 2) {
            this._moveToward(guardPos.x, guardPos.y, this.patrolSpeed, deltaTime);
        } else {
            // Stay near guard position, look around
            this._creature.stop();
        }
    }

    /**
     * State: Base Defense - Move toward and defend/attack a base target object
     * Mode 'defend': Patrol around base, chase enemies that approach
     * Mode 'attack': Move toward base and attack it (for enemy waves)
     */
    _stateBaseDefense(deltaTime) {
        // Ensure commanded creatures stay in follow mode and defaultState is correct
        if (this.commandedByPlayer && this._commandedByPlayerObject) {
            // Safety: ensure defaultState is 'follow' for commanded followers
            if (this.defaultState !== 'follow') {
                this.defaultState = 'follow';
            }
            // Ensure leader is set to the commander
            if (!this._leader) {
                this._leader = this._commandedByPlayerObject;
            }
            return;
        }

        // Find the base target if we don't have one
        if (!this._baseTargetObject || this._baseTargetObject._destroyed) {
            // Search immediately, don't wait
            this._baseTargetObject = this._findBaseTarget();
            
            if (!this._baseTargetObject) {
                // No target found yet - keep searching while wandering toward last known area
                this._baseTargetSearchTimer += deltaTime;
                
                // Wander while searching (don't just stand still)
                if (!this._wanderTarget) {
                    const myPos = this.gameObject.getWorldPosition();
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 50 + Math.random() * 100;
                    this._wanderTarget = {
                        x: myPos.x + Math.cos(angle) * dist,
                        y: myPos.y + Math.sin(angle) * dist
                    };
                }
                this._moveToward(this._wanderTarget.x, this._wanderTarget.y, this.wanderSpeed, deltaTime);
                
                // Give up after extended search
                if (this._baseTargetSearchTimer >= 5.0) {
                    this._changeState('wander');
                }
                return;
            }
            this._baseTargetSearchTimer = 0;
        }
        
        const targetPos = this._baseTargetObject.getWorldPosition();
        const dist = this._distanceTo(targetPos.x, targetPos.y);
        
        // ============ ATTACK MODE ============
        if (this.baseDefenseMode === 'attack') {
            // Only engage enemies that are very close (blocking path) - prioritize reaching base
            const closeEnemies = this._detectedEnemies.filter(e => {
                if (!e || e._destroyed) return false;
                const eDist = this._distanceTo(e.getWorldPosition().x, e.getWorldPosition().y);
                return eDist < 80; // Only engage enemies within 80 pixels
            });
            
            if (closeEnemies.length > 0 && this._shouldChase()) {
                this._baseDefenseWasChasing = true;
                this._chaseTarget = closeEnemies[0];
                if (this._chaseTarget) {
                    //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (attacking base) engaging defender: ${this._chaseTarget.name || 'unknown'}`);
                    this._changeState('chase');
                    return;
                }
            }
            
            // Get the attack range
            const hasArms = this._creature ? this._creature.armCount > 0 : false;
            const baseRange = hasArms ? (this._creature.armLength || 30) : (this._creature ? this._creature.headSize || 15 : 15);
            const effectiveRange = this.attackRange > 0 ? this.attackRange : baseRange * 1.2;
            
            if (dist > effectiveRange) {
                // Move toward base target using improved _moveToward
                this._moveToward(targetPos.x, targetPos.y, this.chaseSpeed, deltaTime);
            } else {
                // In range - attack the base!
                this._attackBaseTarget(deltaTime);
            }
            return;
        }
        
        // ============ DEFEND MODE ============
        // Check for enemies - chase them if we should
        if (this.baseDefenseAggression && this._detectedEnemies.length > 0 && this._shouldChase()) {
            // Store that we're chasing from base defense state
            this._baseDefenseWasChasing = true;
            this._chaseTarget = this._getClosestEnemy();
            if (this._chaseTarget) {
                //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (base defense) engaging enemy: ${this._chaseTarget.name || 'unknown'}`);
                this._changeState('chase');
                return;
            }
        }
        
        // Patrol around base or active guard duty
        if (this.basePatrolAroundBase) {
            // Patrol in a circle around the base
            this._patrolAroundBase(deltaTime, targetPos);
        } else {
            // Active guard mode - stay near base but remain vigilant
            if (dist > this.baseDefenseRadius) {
                // Move back toward base
                this._moveToward(targetPos.x, targetPos.y, this.moveSpeed, deltaTime);
            } else {
                // Near base - active guarding behavior
                this._activeGuardNearBase(deltaTime, targetPos);
            }
        }
    }

    /**
     * Patrol in a circle around the base target
     */
    _patrolAroundBase(deltaTime, basePos) {
        // Pick a patrol target if we don't have one or reached it
        if (!this._basePatrolTarget) {
            this._pickBasePatrolTarget(basePos);
        }
        
        const arrived = this._moveToward(this._basePatrolTarget.x, this._basePatrolTarget.y, this.patrolSpeed, deltaTime);
        
        if (arrived) {
            // Pick next patrol point
            this._pickBasePatrolTarget(basePos);
        }
    }

    /**
     * Pick a new patrol target point around the base
     */
    _pickBasePatrolTarget(basePos) {
        // Advance the patrol angle (randomize direction and distance)
        const angleChange = (Math.PI / 4) + Math.random() * (Math.PI / 2); // 45-135 degrees
        this._basePatrolAngle += angleChange * (Math.random() < 0.5 ? 1 : -1);
        
        // Add some randomness to the radius
        const radiusVariance = 0.3;
        const radius = this.basePatrolRadius * (1 - radiusVariance/2 + Math.random() * radiusVariance);
        
        this._basePatrolTarget = {
            x: basePos.x + Math.cos(this._basePatrolAngle) * radius,
            y: basePos.y + Math.sin(this._basePatrolAngle) * radius
        };
    }

    /**
     * Active guard behavior when stationed near base (not patrolling)
     * Shifts position occasionally, looks around, faces threats
     */
    _activeGuardNearBase(deltaTime, basePos) {
        // Initialize guard state if needed
        if (!this._guardShiftTimer) this._guardShiftTimer = 0;
        if (!this._guardLookTimer) this._guardLookTimer = 0;
        if (!this._guardShiftTarget) this._guardShiftTarget = null;
        
        this._guardShiftTimer += deltaTime;
        this._guardLookTimer += deltaTime;
        
        // If enemies detected, face the closest one (even if not chasing)
        if (this._detectedEnemies.length > 0) {
            const closest = this._getClosestEnemy();
            if (closest && !closest._destroyed) {
                const enemyPos = closest.getWorldPosition();
                const myPos = this.gameObject.getWorldPosition();
                const angleToEnemy = Math.atan2(enemyPos.y - myPos.y, enemyPos.x - myPos.x) * 180 / Math.PI;
                this._smoothRotateTo(angleToEnemy, deltaTime);
                
                // Step toward enemy slightly if they're close (intimidation)
                const eDist = this._distanceTo(enemyPos.x, enemyPos.y);
                if (eDist < this.detectionRadius * 0.5 && eDist > 50) {
                    // Small step toward enemy
                    this._moveToward(enemyPos.x, enemyPos.y, this.moveSpeed * 0.3, deltaTime);
                }
                return;
            }
        }
        
        // Occasionally shift guard position (every 3-6 seconds)
        if (this._guardShiftTimer > 3.0 + Math.random() * 3.0) {
            this._guardShiftTimer = 0;
            
            // Pick a small shift within the defense radius
            const myPos = this.gameObject.getWorldPosition();
            const angleToBase = Math.atan2(basePos.y - myPos.y, basePos.x - myPos.x);
            const randomAngle = angleToBase + (Math.random() - 0.5) * Math.PI; // +/- 90 degrees from base
            const shiftDist = 20 + Math.random() * 40;
            
            this._guardShiftTarget = {
                x: myPos.x + Math.cos(randomAngle) * shiftDist,
                y: myPos.y + Math.sin(randomAngle) * shiftDist
            };
        }
        
        // Move to shift target if we have one
        if (this._guardShiftTarget) {
            const arrived = this._moveToward(this._guardShiftTarget.x, this._guardShiftTarget.y, this.moveSpeed * 0.5, deltaTime);
            if (arrived) {
                this._guardShiftTarget = null;
            }
            return;
        }
        
        // Look around periodically (every 1.5-3 seconds)
        if (this._guardLookTimer > 1.5 + Math.random() * 1.5) {
            this._guardLookTimer = 0;
            
            // Random look direction
            const myPos = this.gameObject.getWorldPosition();
            const angleToBase = Math.atan2(basePos.y - myPos.y, basePos.x - myPos.x) * 180 / Math.PI;
            // Face away from base more often (watching for threats)
            const lookAngle = angleToBase + 180 + (Math.random() - 0.5) * 120;
            this._targetAngle = lookAngle;
        }
        
        // Smooth rotation to look direction
        if (this._targetAngle !== null) {
            this._smoothRotateTo(this._targetAngle, deltaTime);
        }
        
        // Idle stance
        if (this._creature) {
            this._creature.stop();
        }
    }

    /**
     * Attack the base target (when in attack mode)
     */
    _attackBaseTarget(deltaTime) {
        const now = performance.now() / 1000;
        
        // Face the target
        const targetPos = this._baseTargetObject.getWorldPosition();
        const myPos = this.gameObject.getWorldPosition();
        const angleToTarget = Math.atan2(targetPos.y - myPos.y, targetPos.x - myPos.x) * 180 / Math.PI;
        this._smoothRotateTo(angleToTarget, deltaTime);
        
        // Check attack cooldown
        if (now - this._lastAttackTime < this.attackCooldown) {
            return;
        }
        
        // Attack!
        this._lastAttackTime = now;
        
        // Try to damage the base target
        const basicTarget = this._baseTargetObject.getModule ? 
            this._baseTargetObject.getModule('ProceduralCreatureBasicTarget') : null;
        
        if (basicTarget && !basicTarget.isDead) {
            // Calculate damage
            let damage = 10; // Base damage
            
            // Check for held weapon damage
            if (this._creature && this._creature._arms) {
                for (const arm of this._creature._arms) {
                    if (arm.heldItem && arm.heldItem.damage) {
                        damage = Math.max(damage, arm.heldItem.damage);
                    }
                }
            }
            
            // Apply damage
            basicTarget.takeDamage(damage, this.gameObject);
            //console.log(`[Brain] ${this.gameObject.name || 'Creature'} attacked base for ${damage} damage`);
            
            // Trigger attack animation if creature has one
            if (this._creature && this._creature.attack) {
                this._creature.attack();
            }
            
            // If target died, find a new one or go to default state
            if (basicTarget.isDead) {
                this._baseTargetObject = null;
                //console.log(`[Brain] ${this.gameObject.name || 'Creature'} destroyed the base target!`);
            }
        } else {
            // No basic target module, just do attack animation
            if (this._creature && this._creature.attack) {
                this._creature.attack();
            }
        }
    }

    /**
     * Find the base target object by prefab name or tag
     */
    _findBaseTarget() {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return null;
        
        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;
            
            // Check prefab name
            if (this.baseTargetPrefab && inst.prefabName === this.baseTargetPrefab) {
                return inst;
            }
            
            // Check tag
            if (this.baseTargetTag && inst.tags && inst.tags.includes(this.baseTargetTag)) {
                return inst;
            }
            
            // Also check if it has ProceduralCreatureBasicTarget module with matching tag
            const basicTarget = inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            if (basicTarget) {
                // Check if tag matches
                if (this.baseTargetTag && inst.tags && inst.tags.includes(this.baseTargetTag)) {
                    return inst;
                }
            }
        }
        
        return null;
    }

    /**
     * State: Return to Post - Move back to a saved position after chase
     * Used by patrol/guard/base defense states
     */
    _stateReturnToPost(deltaTime) {
        let targetPos = null;
        let nextState = this.defaultState;
        
        // Determine where to return to
        if (this._patrolWasChasing && this._patrolSavedPosition && this.patrolReturnAfterChase) {
            targetPos = this._patrolSavedPosition;
            nextState = 'patrol';
        } else if (this._guardWasChasing && this._guardOriginPosition) {
            targetPos = this._guardOriginPosition;
            nextState = 'guard';
        } else if (this._baseDefenseWasChasing && this._baseTargetObject) {
            const basePos = this._baseTargetObject.getWorldPosition();
            targetPos = { x: basePos.x, y: basePos.y };
            nextState = 'base defense';
        }
        
        if (!targetPos) {
            // Clear chase flags and go to default state
            this._clearChaseFlags();
            this._changeState(this.defaultState);
            return;
        }
        
        // Move toward the return position
        const dist = this._distanceTo(targetPos.x, targetPos.y);
        const arriveThreshold = this.arrivalThreshold * 2;
        
        if (dist > arriveThreshold) {
            this._moveToward(targetPos.x, targetPos.y, this.moveSpeed, deltaTime);
            
            // If we encounter more enemies while returning, engage them
            if (this._detectedEnemies.length > 0 && this._shouldChase()) {
                this._chaseTarget = this._getClosestEnemy();
                if (this._chaseTarget) {
                    //console.log(`[Brain] ${this.gameObject.name || 'Creature'} (returning) engaging new enemy: ${this._chaseTarget.name || 'unknown'}`);
                    this._changeState('chase');
                    return;
                }
            }
        } else {
            // Arrived at post
            this._clearChaseFlags();
            //console.log(`[Brain] ${this.gameObject.name || 'Creature'} returned to ${nextState} position`);
            this._changeState(nextState);
        }
    }

    /**
     * Helper: Decide whether to return to post or go to default state after chase ends
     */
    _returnToPostOrDefault() {
        if ((this._patrolWasChasing && this.patrolReturnAfterChase) ||
            this._guardWasChasing ||
            this._baseDefenseWasChasing) {
            this._changeState('returnToPost');
            return;
        }
    
        if (this._followWasChasing) {
            this._followWasChasing = false;
            this._changeState('follow');
            return;
        }
    
        if (this.commandedByPlayer) {
            const validCommandedStates = ['follow', 'guard', 'patrol', 'base defense'];
            if (!validCommandedStates.includes(this.defaultState)) {
                this.defaultState = 'follow';
            }
            this._changeState(this.defaultState);
            return;
        }
    
        this._changeState(this.defaultState);
    }

    /**
     * Helper: Clear all chase-related flags
     */
    _clearChaseFlags() {
        this._patrolWasChasing = false;
        this._patrolSavedPosition = null;
        this._guardWasChasing = false;
        this._baseDefenseWasChasing = false;
        this._followWasChasing = false;
        this._chaseTarget = null;
    }

    _stateSeekFood(deltaTime) {
        // Try to find food from memory or detection
        let foodTarget = this._findNearestFromMemory(this._foodMemories);
        if (!foodTarget && this._detectedFood.length > 0) {
            const f = this._detectedFood[0];
            const fPos = f.getWorldPosition();
            foodTarget = { x: fPos.x, y: fPos.y, obj: f };
        }

        if (!foodTarget) {
            // No food known, wander to search
            if (!this._wanderTarget) this._pickWanderTarget();
            if (this._wanderTarget) {
                const arrived = this._moveToward(this._wanderTarget.x, this._wanderTarget.y, this.wanderSpeed, deltaTime);
                if (arrived) this._wanderTarget = null;
            }
            // Give up after wandering too long
            if (this._stateTime > 15) this._changeState(this.defaultState);
            return;
        }

        const arrived = this._moveToward(foodTarget.x, foodTarget.y, this.moveSpeed, deltaTime);
        if (arrived) {
            this._eatTarget = foodTarget;
            this._changeState('eat');
        }
    }

    _stateEat(deltaTime) {
        this._creature.stop();
        if (this._stateTime >= this.eatDuration) {
            this.hunger = Math.max(0, this.hunger - this.eatHungerRestore);
            this._changeState(this.defaultState);
        }
    }

    _stateSeekWater(deltaTime) {
        let waterTarget = this._findNearestFromMemory(this._waterMemories);
        if (!waterTarget && this._detectedWater.length > 0) {
            const w = this._detectedWater[0];
            const wPos = w.getWorldPosition();
            waterTarget = { x: wPos.x, y: wPos.y, obj: w };
        }

        if (!waterTarget) {
            if (!this._wanderTarget) this._pickWanderTarget();
            if (this._wanderTarget) {
                const arrived = this._moveToward(this._wanderTarget.x, this._wanderTarget.y, this.wanderSpeed, deltaTime);
                if (arrived) this._wanderTarget = null;
            }
            if (this._stateTime > 15) this._changeState(this.defaultState);
            return;
        }

        const arrived = this._moveToward(waterTarget.x, waterTarget.y, this.moveSpeed, deltaTime);
        if (arrived) {
            this._drinkTarget = waterTarget;
            this._changeState('drink');
        }
    }

    _stateDrink(deltaTime) {
        this._creature.stop();
        if (this._stateTime >= this.drinkDuration) {
            this.thirst = Math.max(0, this.thirst - this.drinkThirstRestore);
            this._changeState(this.defaultState);
        }
    }

    /**
     * State: Seek Item - Move toward a target item and pick it up
     * Used when creature actively seeks weapons or tools
     */
    _stateSeekItem(deltaTime) {
        if (!this._seekItemTarget || !this._creature) {
            this._seekItemTarget = null;
            this._changeState(this.defaultState);
            return;
        }

        // Try to find the actual item object if we only have coordinates/objectId
        let targetObj = this._seekItemTarget.obj;
        let targetModule = null;
        
        // If we don't have the object reference, try to find it by ID or position
        if (!targetObj && this._seekItemTarget.objectId) {
            const _engine = this.gameObject._engine;
            if (_engine && _engine.instances) {
                for (const inst of _engine.instances) {
                    if (inst.id === this._seekItemTarget.objectId) {
                        targetObj = inst;
                        break;
                    }
                }
            }
        }
        
        if (!targetObj || targetObj._destroyed) {
            this._seekItemTarget = null;
            this._changeState(this.defaultState);
            return;
        }

        // Get the item module
        targetModule = targetObj.getModule ? targetObj.getModule('ProceduralCreatureItem') : null;
        
        // Check if item is already held by someone else
        if (targetModule && targetModule.isHeld && targetModule._heldByCreature !== this._creature) {
            this._seekItemTarget = null;
            this._changeState(this.defaultState);
            return;
        }

        // Get current item position (it may have moved)
        const itemPos = targetObj.getWorldPosition ? targetObj.getWorldPosition() : this._seekItemTarget;
        const pos = this.gameObject.getWorldPosition();
        const dist = this._distanceTo(itemPos.x, itemPos.y);

        // Check if we're close enough to pick up
        const pickupRange = this._creature.armLength ? this._creature.armLength * 1.5 : 80;
        
        if (dist <= pickupRange) {
            // Try to pick up the item
            const emptyArm = this._creature.getNextEmptyArm ? this._creature.getNextEmptyArm() : -1;
            
            if (emptyArm !== -1 && this._creature.pickUpItem && targetModule) {
                const success = this._creature.pickUpItem(emptyArm, targetModule);
                if (success) {
                    //console.log(`[Brain] ${this.gameObject.name || 'Creature'} picked up ${targetModule.itemType || 'item'}`);
                }
            }
            
            this._seekItemTarget = null;
            this._changeState(this.defaultState);
            return;
        }

        // Move toward the item
        const arrived = this._moveToward(itemPos.x, itemPos.y, this.moveSpeed, deltaTime);
        
        // Timeout - give up after too long
        if (this._stateTime > 10) {
            this._seekItemTarget = null;
            this._changeState(this.defaultState);
            return;
        }

        // If enemy detected while seeking item, evaluate priorities
        if (this._detectedEnemies.length > 0 && this.itemPickupBehavior !== 'aggressive') {
            // Unless aggressive, break off item seeking when enemies appear
            if (this.itemPickupBehavior === 'defensive' && !this._isHolding('weapon')) {
                // Keep seeking weapon if defensive and don't have one
            } else {
                this._seekItemTarget = null;
                // React to enemy instead
                if (this.aggression > 0.5 || this._isCornered) {
                    this._changeState('chase');
                } else {
                    this._changeState('flee');
                }
            }
        }
    }

    /**
     * Check if creature is holding an item of a specific type
     */
    _isHolding(itemType) {
        if (!this._creature) return false;
        
        // Check all arms for held items
        const arms = ['leftArm', 'rightArm'];
        for (const armName of arms) {
            const arm = this._creature[armName];
            if (arm && arm.heldItem) {
                const item = arm.heldItem;
                if (item.itemType === itemType) return true;
                // Also check for gun as a weapon
                if (itemType === 'weapon' && item.itemType === 'gun') return true;
            }
        }
        return false;
    }

    /**
     * Update item pickup behavior - called during idle/wander for opportunistic pickup
     */
    _updateItemPickupBehavior(deltaTime) {
        if (!this._creature || this.itemPickupBehavior === 'never') return;
        if (!this.canPickUpItems) return;
        
        // Check if creature has hands and empty arm
        if (!this._creature.getNextEmptyArm || !this._creature.pickUpItem) return;
        const emptyArm = this._creature.getNextEmptyArm();
        if (emptyArm === -1) return; // No empty arms, can't pick anything up (note: 0 is valid arm index!)
        
        const pos = this.gameObject.getWorldPosition();
        const pickupRange = this._creature.armLength ? this._creature.armLength * 1.5 : 80;
        
        // Opportunistic pickup - grab nearby items while idle/wandering
        if (this.itemPickupBehavior === 'opportunistic' || this.itemPickupBehavior === 'aggressive') {
            // Look for nearby items in detection results
            let nearestItem = null;
            let nearestItemModule = null;
            let nearestDist = Infinity;
            
            // Check all detected items (includes weapons, food, tools, etc.)
            for (const itemObj of this._detectedItems) {
                if (!itemObj || itemObj._destroyed) continue;
                
                // Get the ProceduralCreatureItem module
                const itemModule = itemObj.getModule ? itemObj.getModule('ProceduralCreatureItem') : null;
                if (!itemModule) continue;
                
                // Skip items already held by someone
                if (itemModule.isHeld || itemModule._heldByCreature) continue;
                
                const itemPos = itemObj.getWorldPosition();
                if (!itemPos) continue;
                
                const dist = Math.sqrt((itemPos.x - pos.x) ** 2 + (itemPos.y - pos.y) ** 2);
                
                // Check if in pickup range
                if (dist > pickupRange) continue;
                
                // Prioritize weapons if configured
                if (this.prioritizeWeapons) {
                    const isWeapon = itemModule.itemType === 'weapon' || itemModule.itemType === 'gun' || itemModule.itemType === 'tool';
                    const currentIsWeapon = nearestItemModule && 
                        (nearestItemModule.itemType === 'weapon' || nearestItemModule.itemType === 'gun' || nearestItemModule.itemType === 'tool');
                    
                    // If current nearest isn't a weapon but this one is, prefer this one
                    if (isWeapon && !currentIsWeapon) {
                        nearestDist = dist;
                        nearestItem = itemObj;
                        nearestItemModule = itemModule;
                        continue;
                    }
                    // If current nearest is a weapon but this one isn't, skip
                    if (!isWeapon && currentIsWeapon) {
                        continue;
                    }
                }
                
                // Otherwise just pick closest
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestItem = itemObj;
                    nearestItemModule = itemModule;
                }
            }
            
            // Pick up if found something in range
            if (nearestItem && nearestItemModule) {
                // For two-handed items, need an arm whose opposing arm is also free
                const isTwoHanded = nearestItemModule.twoHanded || nearestItemModule.gunForegripEnabled;
                const armToUse = isTwoHanded && this._creature.getNextEmptyArmForTwoHanded
                    ? this._creature.getNextEmptyArmForTwoHanded()
                    : this._creature.getNextEmptyArm();
                if (armToUse !== -1) {
                    const success = this._creature.pickUpItem(armToUse, nearestItemModule);
                    if (success) {
                        //console.log(`[Brain] ${this.gameObject.name || 'Creature'} picked up ${nearestItemModule.itemType || 'item'}`);
                    }
                }
            }
        }
    }

    /**
     * Try to walk toward a nearby item if creature has free hands.
     * Returns true if creature is actively seeking an item (caller should skip other logic).
     */
    _trySeekNearbyItem(deltaTime) {
        if (!this.canPickUpItems || this.itemPickupBehavior === 'never') return false;
        if (!this._creature || this._creature.armCount === 0) return false;
        if (!this._creature.getNextEmptyArm) return false;
        
        const emptyArm = this._creature.getNextEmptyArm();
        if (emptyArm === -1) return false;
        
        // Don't seek items if enemies are nearby (unless aggressive)
        if (this._detectedEnemies.length > 0 && this.itemPickupBehavior !== 'aggressive') return false;
        
        const pos = this.gameObject.getWorldPosition();
        const searchRadius = this.itemSearchRadius || 150;
        const pickupRange = this._creature.armLength ? this._creature.armLength * 1.5 : 80;
        
        // Find nearest detected item within search radius
        let nearestItem = null;
        let nearestModule = null;
        let nearestDist = Infinity;
        
        for (const itemObj of this._detectedItems) {
            if (!itemObj || itemObj._destroyed) continue;
            const itemModule = itemObj.getModule ? itemObj.getModule('ProceduralCreatureItem') : null;
            if (!itemModule || itemModule.isHeld || itemModule._heldByCreature) continue;
            
            const itemPos = itemObj.getWorldPosition();
            if (!itemPos) continue;
            
            const dist = Math.sqrt((itemPos.x - pos.x) ** 2 + (itemPos.y - pos.y) ** 2);
            if (dist > searchRadius) continue;
            
            // Prioritize weapons if configured
            if (this.prioritizeWeapons && nearestModule) {
                const isWeapon = itemModule.itemType === 'weapon' || itemModule.itemType === 'gun' || itemModule.itemType === 'tool';
                const currentIsWeapon = nearestModule.itemType === 'weapon' || nearestModule.itemType === 'gun' || nearestModule.itemType === 'tool';
                if (!isWeapon && currentIsWeapon) continue;
                if (isWeapon && !currentIsWeapon) {
                    nearestDist = dist;
                    nearestItem = itemObj;
                    nearestModule = itemModule;
                    continue;
                }
            }
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestItem = itemObj;
                nearestModule = itemModule;
            }
        }
        
        if (!nearestItem) return false;
        
        const itemPos = nearestItem.getWorldPosition();
        
        // If within pickup range, grab it immediately
        if (nearestDist <= pickupRange) {
            // For two-handed items, need an arm whose opposing arm is also free
            const isTwoHanded = nearestModule.twoHanded || nearestModule.gunForegripEnabled;
            const armToUse = isTwoHanded && this._creature.getNextEmptyArmForTwoHanded
                ? this._creature.getNextEmptyArmForTwoHanded()
                : this._creature.getNextEmptyArm();
            if (armToUse !== -1) {
                const success = this._creature.pickUpItem(armToUse, nearestModule);
                if (success) {
                    //console.log(`[Brain] ${this.gameObject.name || 'Creature'} picked up ${nearestModule.itemType || 'item'}`);
                }
            }
            return false; // Done, let normal state continue
        }
        
        // Walk toward the item
        this._moveToward(itemPos.x, itemPos.y, this.wanderSpeed, deltaTime);
        return true; // Actively seeking, skip other state logic
    }

    _stateInvestigate(deltaTime) {
        if (!this._investigatePos) {
            this._changeState(this.defaultState);
            return;
        }

        const arrived = this._moveToward(this._investigatePos.x, this._investigatePos.y, this.patrolSpeed, deltaTime);
        if (arrived || this._stateTime >= this.investigateDuration) {
            this._investigatePos = null;
            this._changeState(this.defaultState);
        }
    }

    _stateReturnToNest(deltaTime) {
        if (!this._nestWorldPos) {
            this._changeState(this.defaultState);
            return;
        }

        const arrived = this._moveToward(this._nestWorldPos.x, this._nestWorldPos.y, this.moveSpeed, deltaTime);
        if (arrived) {
            if (this.sleepAtNest) {
                this._changeState('sleep');
            } else {
                this._changeState(this.defaultState);
            }
        }
    }

    _stateSleep(deltaTime) {
        this._creature.stop();
        this._isSleeping = true;

        // Heal while sleeping
        if (this.sleepHealRate > 0 && this._creature) {
            this._creature.heal(this.sleepHealRate * deltaTime);
        }

        // Wake up on threat
        if (this._detectedEnemies.length > 0) {
            this._isSleeping = false;
            this._changeState('idle');
            return;
        }

        if (this._stateTime >= this.sleepDuration) {
            this._isSleeping = false;
            this._changeState(this.defaultState);
        }
    }

    // ==================== GRID PATHFINDING ====================

    _initPathfindingGrid() {
        if (this._pathGrid) return this._pathGrid;
        if (typeof findModule === 'function') {
            this._pathGrid = findModule('PathFindingGrid');
        }
        return this._pathGrid;
    }

    _movePathfinding(tx, ty, speed, dt, move = true) {
        return false; // Replaced by direct grid access in _moveToward
    }

    _requestPath(tx, ty) {
        const grid = this._initPathfindingGrid();
        if (!grid) return false;
    
        const pos = this.gameObject.getWorldPosition();
        const path = grid.findPath(pos.x, pos.y, tx, ty, {
            algorithm: 'astar',
            smooth: true
        });
    
        if (path && path.length > 0) {
            this._path = path;
            // Skip index 0 — it's the start position (current location)
            this._pathIndex = path.length > 1 ? 1 : 0;
            this._pathTarget = { x: tx, y: ty };
            return true;
        }
    
        if (!this._path) {
            this._path = null;
            this._pathIndex = 0;
        }
        return false;
    }

    _updatePath(tx, ty, isDynamic, deltaTime) {
        if (this._pathIndex === undefined) this._pathIndex = 0;
    
        const now = performance.now() / 1000;
    
        if (isDynamic) {
            // ====== DYNAMIC (follow/chase/flee) ======
            // Repath on timer + only if target moved enough
            const repathInterval = 0.3;
    
            if (this._lastRepathTime && (now - this._lastRepathTime) < repathInterval) {
                return; // Too soon
            }
    
            if (this._path && this._pathTarget) {
                const moved = Math.sqrt(
                    Math.pow(this._pathTarget.x - tx, 2) +
                    Math.pow(this._pathTarget.y - ty, 2)
                );
                if (moved < 48) {
                    this._lastRepathTime = now;
                    return; // Target hasn't moved enough
                }
            }
    
            this._requestPath(tx, ty);
            this._lastRepathTime = now;
    
        } else {
            // ====== STATIC (wander/patrol/seekFood etc.) ======
            const hasPathToTarget = this._path && 
                                    this._pathTarget &&
                                    Math.abs(this._pathTarget.x - tx) < 5 &&
                                    Math.abs(this._pathTarget.y - ty) < 5;
        
            if (!hasPathToTarget) {
                const pos = this.gameObject.getWorldPosition();
                const distToTarget = Math.sqrt(Math.pow(pos.x - tx, 2) + Math.pow(pos.y - ty, 2));
                if (distToTarget <= this.arrivalThreshold) return;
                
                this._requestPath(tx, ty);
                this._lastRepathTime = now;
            }
            // If hasPathToTarget is true, do nothing — let existing path be followed
        }
    }

    _clearPathfinding() {
        if (this._tdPathAgent && this._tdPathAgent._agent) {
            this._tdPathAgent._agent.clearPath();
            this._tdPathAgent._agent.setTargetPosition(0, 0);
            this._tdPathAgent._agent._target = null;
            this._tdPathAgent._agent.targetType = 'position';
        }
    }

    // ==================== MOVEMENT & COLLISION ====================

    _moveToward(targetX, targetY, speed, deltaTime) {
        if (!this._creature) return false;
    
        const now = performance.now() / 1000;
    
        const pos = this.gameObject.getWorldPosition();
        this._stateData.targetX = targetX;
        this._stateData.targetY = targetY;
    
        const grid = this._initPathfindingGrid();
    
        if (grid) {
            // ====== GRID PATHFINDING MODE ======
            const isDynamic = this.currentState === 'follow' ||
                              this.currentState === 'chase' ||
                              this.currentState === 'hunt' ||
                              this.currentState === 'flee';
    
            this._updatePath(targetX, targetY, isDynamic, deltaTime);
    
            const dist = this._distanceTo(targetX, targetY);
            if (dist <= this.arrivalThreshold) {
                this._creature.stop();
                this._path = null;
                this._pathIndex = 0;
                return true;
            }
    
            // Follow current waypoint
            if (this._path && this._pathIndex < this._path.length) {
                const wp = this._path[this._pathIndex];
                const wpDx = wp.x - pos.x;
                const wpDy = wp.y - pos.y;
                const wpDist = Math.sqrt(wpDx * wpDx + wpDy * wpDy);
    
                // Advance waypoint if close enough
                if (wpDist <= this.arrivalThreshold) {
                    this._pathIndex++;
                    // If we've exhausted all waypoints, we've arrived
                    if (this._pathIndex >= this._path.length) {
                        this._creature.stop();
                        this._path = null;
                        this._pathIndex = 0;
                        return true;
                    }
                }
    
                // Move toward current waypoint
                if (wpDist > 0.1) {
                    const ndx = wpDx / wpDist;
                    const ndy = wpDy / wpDist;
                    const moveX = ndx * speed * deltaTime;
                    const moveY = ndy * speed * deltaTime;
    
                    this._resolveCollision(moveX, moveY, deltaTime, speed);
    
                    // Rotate toward waypoint
                    const angle = Math.atan2(ndy, ndx) * 180 / Math.PI;
                    this._smoothRotateTo(angle, deltaTime);
    
                    // Trigger walk animation
                    if (this._creature.moveTowards) {
                        this._creature.moveTowards(wp.x, wp.y, this.arrivalThreshold);
                    }
                }
    
                return false;
            }
    
            // Path is empty or exhausted — fall through to direct movement below
        }
        
        // ====== STUCK DETECTION & FORCE DIRECT MOVEMENT ======
        // Track movement progress - if we haven't moved much in a while, use simpler direct movement
        if (!this._moveTowardLastPos) {
            this._moveTowardLastPos = { x: pos.x, y: pos.y, time: now };
            this._moveTowardStuckTime = 0;
            this._forceDirectMovement = false;
        } else {
            const movedDist = Math.sqrt(
                Math.pow(pos.x - this._moveTowardLastPos.x, 2) +
                Math.pow(pos.y - this._moveTowardLastPos.y, 2)
            );
            
            // Check if target changed (new target resets stuck timer)
            const targetChanged = this._lastMoveTarget && 
                (Math.abs(this._lastMoveTarget.x - targetX) > 10 || Math.abs(this._lastMoveTarget.y - targetY) > 10);
            
            if (targetChanged) {
                this._moveTowardStuckTime = 0;
                this._forceDirectMovement = false;
                this._wallAvoidance = null;
                this._isBacktracking = false;
                this._backtrackTarget = null;
            }
            
            // Update position tracking every 0.3 seconds
            if (now - this._moveTowardLastPos.time > 0.3) {
                if (movedDist < 3) { // Haven't moved much
                    this._moveTowardStuckTime += (now - this._moveTowardLastPos.time);
                } else {
                    this._moveTowardStuckTime = Math.max(0, this._moveTowardStuckTime - 0.2); // Decay stuck time when moving
                }
                this._moveTowardLastPos = { x: pos.x, y: pos.y, time: now };
            }
            
            // Skip stuck detection for moving targets (follow state)
            const isFollowingMovingTarget = this.currentState === 'follow' || 
                                            this.currentState === 'chase' || 
                                            this.currentState === 'hunt' ||
                                            this.currentState === 'flee';
            
            if (this._moveTowardStuckTime > 1.5 && !isFollowingMovingTarget) {
                this._forceDirectMovement = true;
                this._wallAvoidance = null;
                this._isBacktracking = false;
            }
            
            // Reset force mode after 3 seconds of forced movement (try normal again)
            if (this._forceDirectMovement && this._moveTowardStuckTime > 4.5) {
                this._moveTowardStuckTime = 0;
                this._forceDirectMovement = false;
            }
        }
        this._lastMoveTarget = { x: targetX, y: targetY };
        
        // ====== FORCE DIRECT MOVEMENT MODE ======
        // When stuck, bypass complex pathfinding and just move directly toward target
        if (this._forceDirectMovement) {
            const dx = targetX - pos.x;
            const dy = targetY - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= this.arrivalThreshold) {
                this._creature.stop();
                this._forceDirectMovement = false;
                this._moveTowardStuckTime = 0;
                return true;
            }
            
            const ndx = dx / dist;
            const ndy = dy / dist;
            const moveX = ndx * speed * deltaTime;
            const moveY = ndy * speed * deltaTime;
            
            // Simple collision resolution - just slide along
            if (this.enableCollision) {
                this._resolveCollision(moveX, moveY, deltaTime, speed);
            } else {
                this.gameObject.position.x += moveX;
                this.gameObject.position.y += moveY;
            }
            
            // Face movement direction
            const angle = Math.atan2(ndy, ndx) * 180 / Math.PI;
            this._smoothRotateTo(angle, deltaTime);
            
            // Tell creature to animate walking
            if (this._creature.moveTowards) {
                this._creature.moveTowards(targetX, targetY, this.arrivalThreshold);
            }
            
            return false;
        }
        
        // Apply corridor slowdown if in a tight passage
        speed *= this._getCorridorSpeedMultiplier();
        
        // ====== BACKTRACKING MODE ======
        // If we're backtracking to a previous position, handle that first
        if (this._isBacktracking && this._backtrackTarget) {
            const btDist = this._distanceTo(this._backtrackTarget.x, this._backtrackTarget.y);
            
            if (btDist <= this.arrivalThreshold * 2) {
                // Reached backtrack position - now try alternate angle
                this._isBacktracking = false;
                this._alternateAngleAttempts++;
                
                // Calculate alternate angle to try (90 degrees left or right of original failed angle)
                const originalAngle = this._backtrackTarget.failedAngle || 0;
                const alternateOffset = (this._alternateAngleAttempts % 2 === 1) ? 90 : -90;
                const newAngle = (originalAngle + alternateOffset * this._alternateAngleAttempts) * Math.PI / 180;
                
                // Record this failed approach
                this._addFailedAngle(originalAngle, pos.x, pos.y, targetX, targetY);
                
                this._backtrackTarget = null;
                // Continue to normal movement with new approach angle consideration
            } else {
                // Still backtracking - move toward backtrack position
                const btDx = this._backtrackTarget.x - pos.x;
                const btDy = this._backtrackTarget.y - pos.y;
                const btNdx = btDx / btDist;
                const btNdy = btDy / btDist;
                
                const moveX = btNdx * speed * deltaTime;
                const moveY = btNdy * speed * deltaTime;
                
                if (this.enableCollision) {
                    this._resolveCollision(moveX, moveY, deltaTime, speed);
                } else {
                    this.gameObject.position.x += moveX;
                    this.gameObject.position.y += moveY;
                }
                
                const angle = Math.atan2(btNdy, btNdx);
                this._smoothRotateTo(angle * 180 / Math.PI, deltaTime);
                return false;
            }
        }
        
        // ====== WALL AVOIDANCE MODE ======
        // Check if we're in "wall avoidance" mode - walking perpendicular to avoid obstacle
        if (this._wallAvoidance) {
            this._wallAvoidance.timer -= deltaTime;
            
            if (this._wallAvoidance.timer <= 0) {
                // Done avoiding - record this direction attempt and try target again
                const avoidAngle = Math.atan2(this._wallAvoidance.dirY, this._wallAvoidance.dirX) * 180 / Math.PI;
                this._wallAvoidance = null;
            } else {
                // Keep walking in avoidance direction
                const avoidMoveX = this._wallAvoidance.dirX * speed * deltaTime;
                const avoidMoveY = this._wallAvoidance.dirY * speed * deltaTime;
                
                // Check if avoidance direction is also blocked
                const solids = this._getSolidObjects();
                const probeX = pos.x + this._wallAvoidance.dirX * (this.collisionRadius + 5);
                const probeY = pos.y + this._wallAvoidance.dirY * (this.collisionRadius + 5);
                
                const leftBlocked = this._checkCollisionAt(probeX, probeY, solids);
                
                // Also check the other perpendicular direction
                const oppDirX = -this._wallAvoidance.dirX;
                const oppDirY = -this._wallAvoidance.dirY;
                const oppProbeX = pos.x + oppDirX * (this.collisionRadius + 5);
                const oppProbeY = pos.y + oppDirY * (this.collisionRadius + 5);
                const rightBlocked = this._checkCollisionAt(oppProbeX, oppProbeY, solids);
                
                if (leftBlocked && rightBlocked) {
                    // BOTH SIDES BLOCKED! This is a corridor or dead end
                    // Trigger backtracking to previous position
                    this._wallAvoidance = null;
                    this._triggerBacktrack(targetX, targetY, pos);
                    return false;
                } else if (leftBlocked) {
                    // Current avoidance direction blocked - try opposite
                    this._wallAvoidance.dirX = oppDirX;
                    this._wallAvoidance.dirY = oppDirY;
                    this._wallAvoidance.timer = this._wallAvoidance.duration; // Reset timer
                }
                
                // Apply avoidance movement
                if (this.enableCollision) {
                    this._resolveCollision(avoidMoveX, avoidMoveY, deltaTime, speed);
                } else {
                    this.gameObject.position.x += avoidMoveX;
                    this.gameObject.position.y += avoidMoveY;
                }
                
                // Face avoidance direction (smooth rotation)
                const avoidAngle = Math.atan2(this._wallAvoidance.dirY, this._wallAvoidance.dirX);
                this._smoothRotateTo(avoidAngle * 180 / Math.PI, deltaTime);
                
                return false;
            }
        }
        
        // ====== STORE TARGET ======

        let dx = targetX - pos.x;
        let dy = targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.arrivalThreshold) {
            this._creature.stop();
            this._wallAvoidance = null;
            this._resetNavigationState();
            return true;
        }

        // ====== CALCULATE APPROACH ANGLE ======
        // Determine the angle to approach from, considering failed angles
        let approachAngle = Math.atan2(dy, dx);
        this._currentApproachAngle = approachAngle * 180 / Math.PI;
        
        // Check if this angle (or close to it) has failed recently
        const viableAngle = this._findViableApproachAngle(pos.x, pos.y, targetX, targetY, approachAngle);
        if (viableAngle !== null && Math.abs(viableAngle - approachAngle) > 0.1) {
            // Use the alternate angle
            approachAngle = viableAngle;
            dx = Math.cos(approachAngle) * dist;
            dy = Math.sin(approachAngle) * dist;
        }

        // Normalize direction
        const ndx = Math.cos(approachAngle);
        const ndy = Math.sin(approachAngle);

        // ====== OBSTACLE DETECTION ======
        if (this.enableCollision) {
            const solids = this._getSolidObjects();
            const lookAhead = this.collisionRadius + 10;
            const probeX = pos.x + ndx * lookAhead;
            const probeY = pos.y + ndy * lookAhead;
            
            if (this._checkCollisionAt(probeX, probeY, solids)) {
                // Obstacle ahead! Check both perpendicular directions
                const leftDirX = -ndy; // 90 degrees left
                const leftDirY = ndx;
                const rightDirX = ndy; // 90 degrees right
                const rightDirY = -ndx;
                
                const leftProbeX = pos.x + leftDirX * lookAhead;
                const leftProbeY = pos.y + leftDirY * lookAhead;
                const rightProbeX = pos.x + rightDirX * lookAhead;
                const rightProbeY = pos.y + rightDirY * lookAhead;
                
                const leftBlocked = this._checkCollisionAt(leftProbeX, leftProbeY, solids);
                const rightBlocked = this._checkCollisionAt(rightProbeX, rightProbeY, solids);
                
                // ====== BOTH SIDES BLOCKED - BACKTRACK ======
                if (leftBlocked && rightBlocked) {
                    // Dead end or corridor! Backtrack to previous position
                    this._triggerBacktrack(targetX, targetY, pos);
                    return false;
                }
                
                let chosenDirX, chosenDirY;
                
                if (!leftBlocked && !rightBlocked) {
                    // Both clear - use smart selection based on failed angles and target direction
                    const leftAngle = Math.atan2(leftDirY, leftDirX) * 180 / Math.PI;
                    const rightAngle = Math.atan2(rightDirY, rightDirX) * 180 / Math.PI;
                    
                    const leftFailed = this._isAngleFailed(leftAngle, pos.x, pos.y);
                    const rightFailed = this._isAngleFailed(rightAngle, pos.x, pos.y);
                    
                    if (leftFailed && !rightFailed) {
                        chosenDirX = rightDirX;
                        chosenDirY = rightDirY;
                        this._lastTurnDirection = 'right';
                    } else if (rightFailed && !leftFailed) {
                        chosenDirX = leftDirX;
                        chosenDirY = leftDirY;
                        this._lastTurnDirection = 'left';
                    } else {
                        // Neither or both failed - alternate or pick based on angle to target
                        const targetAngle = Math.atan2(targetY - pos.y, targetX - pos.x);
                        const leftDiff = Math.abs(this._angleDifference(leftAngle * Math.PI / 180, targetAngle));
                        const rightDiff = Math.abs(this._angleDifference(rightAngle * Math.PI / 180, targetAngle));
                        
                        if (leftDiff < rightDiff) {
                            chosenDirX = leftDirX;
                            chosenDirY = leftDirY;
                            this._lastTurnDirection = 'left';
                        } else {
                            chosenDirX = rightDirX;
                            chosenDirY = rightDirY;
                            this._lastTurnDirection = 'right';
                        }
                    }
                } else if (!leftBlocked) {
                    chosenDirX = leftDirX;
                    chosenDirY = leftDirY;
                    this._lastTurnDirection = 'left';
                } else {
                    chosenDirX = rightDirX;
                    chosenDirY = rightDirY;
                    this._lastTurnDirection = 'right';
                }
                
                // ====== SET WALL AVOIDANCE MODE (LONGER DURATION) ======
                const avoidDuration = this.avoidanceDurationMin + Math.random() * (this.avoidanceDurationMax - this.avoidanceDurationMin);
                this._wallAvoidance = {
                    dirX: chosenDirX,
                    dirY: chosenDirY,
                    timer: avoidDuration,
                    duration: avoidDuration,
                    originalTarget: { x: targetX, y: targetY },
                    approachAngle: this._currentApproachAngle
                };
                
                // Start moving in avoidance direction immediately
                const avoidMoveX = chosenDirX * speed * deltaTime;
                const avoidMoveY = chosenDirY * speed * deltaTime;
                
                if (this.enableCollision) {
                    this._resolveCollision(avoidMoveX, avoidMoveY, deltaTime, speed);
                } else {
                    this.gameObject.position.x += avoidMoveX;
                    this.gameObject.position.y += avoidMoveY;
                }
                
                // Face avoidance direction (smooth rotation)
                const avoidAngle = Math.atan2(chosenDirY, chosenDirX);
                this._smoothRotateTo(avoidAngle * 180 / Math.PI, deltaTime);
                
                return false;
            }
        }

        // ====== NORMAL MOVEMENT ======
        let steerX = ndx;
        let steerY = ndy;

        let moveX = steerX * speed * deltaTime;
        let moveY = steerY * speed * deltaTime;

        if (this.enableCollision) {
            this._resolveCollision(moveX, moveY, deltaTime, speed);
        } else {
            this.gameObject.position.x += moveX;
            this.gameObject.position.y += moveY;
        }

        // Face movement direction
        const angle = Math.atan2(steerY, steerX);
        this._smoothRotateTo(angle * 180 / Math.PI, deltaTime);

        return false;
    }

    /**
     * Smoothly rotates the creature toward a target angle
     * @param {number} targetDeg - Target angle in degrees
     * @param {number} deltaTime - Time since last frame
     */
    _smoothRotateTo(targetDeg, deltaTime) {
        const currentAngle = this.gameObject.angle;
        
        // Normalize angles to 0-360
        let current = ((currentAngle % 360) + 360) % 360;
        let target = ((targetDeg % 360) + 360) % 360;
        
        // Find shortest rotation direction
        let diff = target - current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        // Apply turn speed limit
        const maxTurn = this.turnSpeed * deltaTime;
        if (Math.abs(diff) <= maxTurn) {
            this.gameObject.angle = targetDeg;
        } else {
            this.gameObject.angle = currentAngle + Math.sign(diff) * maxTurn;
        }
    }

    // ==================== ADVANCED NAVIGATION HELPERS ====================

    /**
     * Update the advanced navigation system - position tracking and stuck detection
     */
    _updateAdvancedNavigation(deltaTime) {
        const pos = this.gameObject.getWorldPosition();
        const now = performance.now() / 1000;

        const pathFinding = this._movePathfinding(0, 0, 0, deltaTime, false);
        if (pathFinding === true) return;
        
        // Record position periodically
        this._positionRecordTimer += deltaTime;
        if (this._positionRecordTimer >= this._positionRecordInterval) {
            this._positionRecordTimer = 0;
            this._recordPosition(pos.x, pos.y, this._stateData.targetX, this._stateData.targetY);
        }
        
        // Stuck detection
        if (this._lastRecordedPos && this._stateData.targetX !== undefined) {
            const movedDist = Math.sqrt(
                Math.pow(pos.x - this._lastRecordedPos.x, 2) + 
                Math.pow(pos.y - this._lastRecordedPos.y, 2)
            );
            
            if (movedDist < this.stuckDetectionMargin) {
                // Hasn't moved much
                this._stuckTimer += deltaTime;
                
                if (this._stuckTimer >= this.stuckTimeThreshold) {
                    // STUCK! Trigger backtracking
                    this._handleStuck(pos);
                    this._stuckTimer = 0;
                }
            } else {
                // Moving fine
                this._stuckTimer = 0;
                this._alternateAngleAttempts = 0; // Reset on successful movement
            }
        }
        
        this._lastRecordedPos = { x: pos.x, y: pos.y };
        
        // Decay old failed angles
        this._failedAngles = this._failedAngles.filter(f => now - f.timestamp < this.failedAngleMemoryTime);
        
        // Decay old failed locations
        this._failedLocations = this._failedLocations.filter(f => now - f.timestamp < this.failedAngleMemoryTime * 2);
    }

    /**
     * Record current position in history
     */
    _recordPosition(x, y, targetX, targetY) {
        const now = performance.now() / 1000;
        
        // Don't record if too close to last recorded position
        if (this._positionHistory.length > 0) {
            const last = this._positionHistory[this._positionHistory.length - 1];
            const dist = Math.sqrt(Math.pow(x - last.x, 2) + Math.pow(y - last.y, 2));
            if (dist < this.stuckDetectionMargin * 3) return;
        }
        
        this._positionHistory.push({
            x, y, timestamp: now,
            targetX: targetX || 0,
            targetY: targetY || 0,
            approachAngle: this._currentApproachAngle || 0
        });
        
        // Trim to max size
        while (this._positionHistory.length > this.navigationHistorySize) {
            this._positionHistory.shift();
        }
    }

    /**
     * Add a failed angle to memory
     */
    _addFailedAngle(angleDeg, fromX, fromY, targetX, targetY) {
        const now = performance.now() / 1000;
        
        // Check if similar angle already exists
        for (const failed of this._failedAngles) {
            const diff = Math.abs(this._angleDifferenceDeg(angleDeg, failed.angle));
            if (diff < this.angleRetryMargin / 2) {
                // Update existing
                failed.timestamp = now;
                failed.failCount = (failed.failCount || 1) + 1;
                return;
            }
        }
        
        this._failedAngles.push({
            angle: angleDeg,
            timestamp: now,
            fromX, fromY,
            targetX, targetY,
            failCount: 1
        });
        
        // Trim
        while (this._failedAngles.length > this.failedLocationMemorySize) {
            this._failedAngles.sort((a, b) => a.timestamp - b.timestamp);
            this._failedAngles.shift();
        }
    }

    /**
     * Add a failed location to memory
     */
    _addFailedLocation(x, y, approachAngle) {
        const now = performance.now() / 1000;
        
        // Check if location already exists
        for (const failed of this._failedLocations) {
            const dist = Math.sqrt(Math.pow(x - failed.x, 2) + Math.pow(y - failed.y, 2));
            if (dist < this.arrivalThreshold * 2) {
                // Update existing
                failed.timestamp = now;
                failed.failCount = (failed.failCount || 1) + 1;
                failed.approachAngle = approachAngle;
                return;
            }
        }
        
        this._failedLocations.push({
            x, y, timestamp: now,
            approachAngle,
            failCount: 1
        });
        
        // Trim
        while (this._failedLocations.length > this.failedLocationMemorySize) {
            this._failedLocations.sort((a, b) => a.timestamp - b.timestamp);
            this._failedLocations.shift();
        }
    }

    /**
     * Check if an angle (degrees) is in our failed angles memory
     */
    _isAngleFailed(angleDeg, fromX, fromY) {
        const now = performance.now() / 1000;
        
        for (const failed of this._failedAngles) {
            if (now - failed.timestamp > this.failedAngleMemoryTime) continue;
            
            // Check if from similar position
            const posDist = Math.sqrt(Math.pow(fromX - failed.fromX, 2) + Math.pow(fromY - failed.fromY, 2));
            if (posDist > this.wanderRadius) continue; // Different area
            
            const diff = Math.abs(this._angleDifferenceDeg(angleDeg, failed.angle));
            if (diff < this.angleRetryMargin) {
                return true;
            }
        }
        return false;
    }

    /**
     * Find a viable approach angle that hasn't failed recently
     */
    _findViableApproachAngle(fromX, fromY, targetX, targetY, preferredAngle) {
        const preferredDeg = preferredAngle * 180 / Math.PI;
        
        // Check if preferred is viable
        if (!this._isAngleFailed(preferredDeg, fromX, fromY)) {
            return preferredAngle; // Original is fine
        }
        
        // Try alternate angles: +30, -30, +60, -60, +90, -90, +120, -120, etc.
        const offsets = [30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180];
        
        for (const offset of offsets) {
            const testAngle = preferredDeg + offset;
            if (!this._isAngleFailed(testAngle, fromX, fromY)) {
                return testAngle * Math.PI / 180;
            }
        }
        
        // All angles failed? Return null to use default
        return null;
    }

    /**
     * Handle being stuck - trigger backtracking
     */
    _handleStuck(pos) {
        const now = performance.now() / 1000;
        
        const pathFinding = this._movePathfinding(0, 0, 0, 0, false);
        if (pathFinding === true) return;
        
        // Record this as a failed location
        this._addFailedLocation(pos.x, pos.y, this._currentApproachAngle || 0);
        
        // Add the current approach angle as failed
        if (this._currentApproachAngle !== null) {
            this._addFailedAngle(
                this._currentApproachAngle, 
                pos.x, pos.y, 
                this._stateData.targetX || 0, 
                this._stateData.targetY || 0
            );
        }
        
        // Trigger backtrack if cooldown has passed
        if (now - this._lastBacktrackTime >= this.backtrackCooldown) {
            this._triggerBacktrack(
                this._stateData.targetX || pos.x, 
                this._stateData.targetY || pos.y, 
                pos
            );
        }
    }

    /**
     * Trigger backtracking to a previous position
     */
    _triggerBacktrack(targetX, targetY, currentPos) {
        const now = performance.now() / 1000;
        
        if (this.currentState === 'follow') {
        	return;
        }

        const pathFinding = this._movePathfinding(0, 0, 0, 0, false);
        if (pathFinding === true) return;
        
        if (this._positionHistory.length < 2) {
            // Not enough history - just pick new wander target
            if (this.currentState === 'wander') {
                this._wanderTarget = null;
            }
            return;
        }
        
        this._lastBacktrackTime = now;
        
        // Find a good position to backtrack to
        // Start from most recent and go back, looking for one that's far enough away
        // and not in a failed location
        let backtrackPos = null;
        const minBacktrackDist = this.arrivalThreshold * 4;
        
        for (let i = this._positionHistory.length - 2; i >= 0; i--) {
            const hist = this._positionHistory[i];
            const dist = Math.sqrt(
                Math.pow(currentPos.x - hist.x, 2) + 
                Math.pow(currentPos.y - hist.y, 2)
            );
            
            if (dist >= minBacktrackDist) {
                // Check if this position is in failed locations
                let isFailed = false;
                for (const failed of this._failedLocations) {
                    const failDist = Math.sqrt(
                        Math.pow(hist.x - failed.x, 2) + 
                        Math.pow(hist.y - failed.y, 2)
                    );
                    if (failDist < this.arrivalThreshold * 2) {
                        isFailed = true;
                        break;
                    }
                }
                
                if (!isFailed) {
                    backtrackPos = hist;
                    this._backtrackIndex = i;
                    break;
                }
            }
        }
        
        if (backtrackPos) {
            this._isBacktracking = true;
            this._backtrackTarget = {
                x: backtrackPos.x,
                y: backtrackPos.y,
                failedAngle: this._currentApproachAngle || 0,
                originalTargetX: targetX,
                originalTargetY: targetY
            };
            
            // Clear wall avoidance
            this._wallAvoidance = null;
        } else {
            // No good backtrack position - try going to earliest known position
            if (this._positionHistory.length > 0) {
                const earliest = this._positionHistory[0];
                this._isBacktracking = true;
                this._backtrackTarget = {
                    x: earliest.x,
                    y: earliest.y,
                    failedAngle: this._currentApproachAngle || 0,
                    originalTargetX: targetX,
                    originalTargetY: targetY
                };
                this._wallAvoidance = null;
            }
        }
    }

    /**
     * Reset navigation state when destination reached
     */
    _resetNavigationState() {
        this._stuckTimer = 0;
        this._alternateAngleAttempts = 0;
        this._isBacktracking = false;
        this._backtrackTarget = null;
        this._currentApproachAngle = null;
    }

    /**
     * Calculate difference between two angles in radians
     */
    _angleDifference(angle1, angle2) {
        let diff = angle1 - angle2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    /**
     * Calculate difference between two angles in degrees
     */
    _angleDifferenceDeg(angle1, angle2) {
        let diff = angle1 - angle2;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    _getAvoidanceSteering(dirX, dirY) {
        const pos = this.gameObject.getWorldPosition();
        const solids = this._getSolidObjects();
        let avoidX = 0;
        let avoidY = 0;

        for (const solid of solids) {
            const sPos = solid.obj.getWorldPosition();
            const dx = pos.x - sPos.x;
            const dy = pos.y - sPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = this.collisionRadius + (solid.radius || 20);

            if (dist < this.steeringLookahead + minDist && dist > 0.1) {
                // Check if obstacle is ahead of us
                const dot = (sPos.x - pos.x) * dirX + (sPos.y - pos.y) * dirY;
                if (dot > 0) {
                    // Push perpendicular to the obstacle direction
                    const pushStrength = 1.0 - (dist / (this.steeringLookahead + minDist));
                    avoidX += (dx / dist) * pushStrength;
                    avoidY += (dy / dist) * pushStrength;
                }
            }
        }

        return { x: avoidX, y: avoidY };
    }

    _resolveCollision(moveX, moveY, deltaTime, speed) {
        const pos = this.gameObject.position;
        const solids = this._getSolidObjects();

        if (solids.length === 0) {
            pos.x += moveX;
            pos.y += moveY;
            return true; // Movement successful
        }

        // Push out if stuck
        const currentCollision = this._checkCollisionAt(pos.x, pos.y, solids);
        if (currentCollision && currentCollision.pushDirection) {
            const pushOut = (currentCollision.penetration || 1) + 0.5;
            pos.x += currentCollision.pushDirection.x * pushOut;
            pos.y += currentCollision.pushDirection.y * pushOut;
        }

        let movedX = false;
        let movedY = false;

        // Try X movement
        if (Math.abs(moveX) > 0.001) {
            if (!this._checkCollisionAt(pos.x + moveX, pos.y, solids)) {
                pos.x += moveX;
                movedX = true;
            } else {
                // Try corner correction - nudge perpendicular to slide around corners
                movedX = this._tryCornerCorrection(moveX, 0, pos, solids);
            }
        }

        // Try Y movement
        if (Math.abs(moveY) > 0.001) {
            if (!this._checkCollisionAt(pos.x, pos.y + moveY, solids)) {
                pos.y += moveY;
                movedY = true;
            } else {
                movedY = this._tryCornerCorrection(0, moveY, pos, solids);
            }
        }

        // If both axes blocked, try surface-tangent sliding
        if (!movedX && !movedY && this.slideAlongWalls &&
            (Math.abs(moveX) > 0.001 || Math.abs(moveY) > 0.001)) {
            const collision = this._checkCollisionAt(pos.x + moveX, pos.y + moveY, solids);
            if (collision && collision.pushDirection) {
                // Project velocity onto surface tangent (perpendicular to collision normal)
                const nx = collision.pushDirection.x;
                const ny = collision.pushDirection.y;
                const tx = -ny;
                const ty = nx;
                const dot = (moveX * tx + moveY * ty);
                const slideMoveX = tx * dot * this.slideFriction;
                const slideMoveY = ty * dot * this.slideFriction;

                if (Math.abs(slideMoveX) > 0.001 || Math.abs(slideMoveY) > 0.001) {
                    if (!this._checkCollisionAt(pos.x + slideMoveX, pos.y + slideMoveY, solids)) {
                        pos.x += slideMoveX;
                        pos.y += slideMoveY;
                        return true;
                    }
                }
            } else if (!collision) {
                // Diagonal is clear even though individual axes weren't
                pos.x += moveX;
                pos.y += moveY;
                return true;
            }
            
            // Completely blocked - increment stuck counter for pathfinding
            this._stuckCounter = (this._stuckCounter || 0) + 1;
            if (this._stuckCounter > 10) {
                // Trigger pathfinding around obstacle
                this._findPathAroundObstacle(solids);
                this._stuckCounter = 0;
            }
            return false;
        }

        this._stuckCounter = 0;
        return movedX || movedY;
    }

    /**
     * Try corner correction - nudge perpendicular to movement to slide around corners
     */
    _tryCornerCorrection(dx, dy, pos, solids) {
        const correction = 8; // Pixels to nudge

        for (let offset = 1; offset <= correction; offset++) {
            if (Math.abs(dx) > 0.001) {
                // Moving horizontally, try vertical offsets
                if (!this._checkCollisionAt(pos.x + dx, pos.y - offset, solids)) {
                    pos.x += dx;
                    pos.y -= offset;
                    return true;
                }
                if (!this._checkCollisionAt(pos.x + dx, pos.y + offset, solids)) {
                    pos.x += dx;
                    pos.y += offset;
                    return true;
                }
            }

            if (Math.abs(dy) > 0.001) {
                // Moving vertically, try horizontal offsets
                if (!this._checkCollisionAt(pos.x - offset, pos.y + dy, solids)) {
                    pos.x -= offset;
                    pos.y += dy;
                    return true;
                }
                if (!this._checkCollisionAt(pos.x + offset, pos.y + dy, solids)) {
                    pos.x += offset;
                    pos.y += dy;
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Simple pathfinding when stuck - try to find a way around the obstacle
     */
    _findPathAroundObstacle(solids) {
        if (!this._stateData.targetX || !this._stateData.targetY) return;

        const pos = this.gameObject.getWorldPosition();
        const targetX = this._stateData.targetX;
        const targetY = this._stateData.targetY;

        // Try 8 directions to find a clear path
        const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
        const probeDistance = this.collisionRadius * 3;
        let bestAngle = null;
        let bestScore = -Infinity;

        for (const angle of angles) {
            const probeX = pos.x + Math.cos(angle) * probeDistance;
            const probeY = pos.y + Math.sin(angle) * probeDistance;

            // Check if this direction is clear
            if (!this._checkCollisionAt(probeX, probeY, solids)) {
                // Score based on how much closer to target this gets us
                const currentDist = Math.sqrt((targetX - pos.x)**2 + (targetY - pos.y)**2);
                const newDist = Math.sqrt((targetX - probeX)**2 + (targetY - probeY)**2);
                const score = currentDist - newDist; // Positive = getting closer

                if (score > bestScore) {
                    bestScore = score;
                    bestAngle = angle;
                }
            }
        }

        // If we found a clear direction, set intermediate waypoint
        if (bestAngle !== null) {
            const waypointDist = probeDistance * 2;
            this._pathfindWaypoint = {
                x: pos.x + Math.cos(bestAngle) * waypointDist,
                y: pos.y + Math.sin(bestAngle) * waypointDist,
                originalTarget: { x: targetX, y: targetY },
                timeout: 2.0 // Seconds before giving up on waypoint
            };
        } else {
            // Completely stuck - pick new wander target
            if (this.currentState === 'wander') {
                this._wanderTarget = null;
                this._isWaiting = true;
                this._wanderWaitTimer = 0;
            }
        }
    }

    _getSolidObjects() {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return [];

        const pos = this.gameObject.getWorldPosition();
        const results = [];
        const searchR = this.collisionSearchRadius;
        const searchRSq = searchR * searchR;

        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;
            
            // Quick distance check first
            const iPos = inst.getWorldPosition();
            const dx = iPos.x - pos.x;
            const dy = iPos.y - pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > searchRSq) continue;

            // Check for BoxCollider with solid tag
            const box = inst.getModule ? inst.getModule('BoxCollider') : null;
            if (box) {
                const hasTag = inst.tag === this.solidTag || 
                              (inst.tags && inst.tags.includes(this.solidTag)) ||
                              box.tag === this.solidTag;
                if (hasTag || (!this.solidTag && !box.isTrigger)) {
                    results.push({ obj: inst, collider: box, type: 'box' });
                    continue;
                }
            }
            
            // Check for SphereCollider
            const sphere = inst.getModule ? inst.getModule('SphereCollider') : null;
            if (sphere) {
                const hasTag = inst.tag === this.solidTag || 
                              (inst.tags && inst.tags.includes(this.solidTag)) ||
                              sphere.tag === this.solidTag;
                if (hasTag || (!this.solidTag && !sphere.isTrigger)) {
                    results.push({ obj: inst, collider: sphere, type: 'sphere' });
                    continue;
                }
            }

            // Check for PolygonCollider
            const poly = inst.getModule ? inst.getModule('PolygonCollider') : null;
            if (poly) {
                const hasTag = inst.tag === this.solidTag || 
                              (inst.tags && inst.tags.includes(this.solidTag)) ||
                              poly.tag === this.solidTag;
                if (hasTag || (!this.solidTag && !poly.isTrigger)) {
                    results.push({ obj: inst, collider: poly, type: 'polygon' });
                }
            }
        }
        return results;
    }

    _checkCollisionAt(x, y, solids) {
        const r = this.collisionRadius;
        
        for (const solid of solids) {
            const { obj, collider, type } = solid;
            let collision = null;

            if (type === 'sphere') {
                collision = this._checkCircleSphereCollision(x, y, obj, collider);
            } else if (type === 'polygon') {
                collision = this._checkCirclePolygonCollision(x, y, collider);
            } else if (type === 'box') {
                // Check if box is rotated or scaled
                const scale = obj.scale || { x: 1, y: 1 };
                const hasScale = typeof scale === 'number' ? Math.abs(scale - 1) > 0.01 :
                                (Math.abs(scale.x - 1) > 0.01 || Math.abs(scale.y - 1) > 0.01);
                const hasRotation = Math.abs(obj.angle || 0) > 0.01;

                if (hasScale || hasRotation) {
                    collision = this._checkCircleRotatedBoxCollision(x, y, obj, collider);
                } else {
                    collision = this._checkCircleAABBCollision(x, y, obj, collider);
                }
            }

            if (collision) {
                collision.object = obj;
                collision.collider = collider;
                return collision;
            }
        }
        return null;
    }

    /**
     * Circle-to-sphere collision
     */
    _checkCircleSphereCollision(x, y, obj, collider) {
        const r = this.collisionRadius;
        const sPos = obj.getWorldPosition();
        const sphereRadius = collider.radius || 20;
        
        const dx = x - sPos.x;
        const dy = y - sPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r + sphereRadius;
        
        if (dist < minDist) {
            return {
                pushDirection: dist > 0.01 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 },
                penetration: minDist - dist
            };
        }
        return null;
    }

    /**
     * Circle-to-AABB collision (non-rotated boxes)
     */
    _checkCircleAABBCollision(x, y, obj, collider) {
        const r = this.collisionRadius;
        
        // Use BoxCollider's getBounds() for accurate dimensions
        let bounds;
        if (typeof collider.getBounds === 'function') {
            bounds = collider.getBounds();
        } else {
            const sPos = obj.getWorldPosition();
            const hw = (collider.width || 40) * 0.5;
            const hh = (collider.height || 40) * 0.5;
            bounds = {
                left: sPos.x - hw,
                right: sPos.x + hw,
                top: sPos.y - hh,
                bottom: sPos.y + hh,
                centerX: sPos.x,
                centerY: sPos.y
            };
        }

        // Find closest point on box to circle center
        const closestX = Math.max(bounds.left, Math.min(x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(y, bounds.bottom));

        const dx = x - closestX;
        const dy = y - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            const penetration = r - dist;
            
            let pushX, pushY;
            if (dist > 0.1) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
                // Circle center is on box edge - push toward box center
                const toCenterX = x - bounds.centerX;
                const toCenterY = y - bounds.centerY;
                const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
                if (toCenterDist > 0.1) {
                    pushX = toCenterX / toCenterDist;
                    pushY = toCenterY / toCenterDist;
                } else {
                    pushX = 0;
                    pushY = -1;
                }
            }
            
            return { pushDirection: { x: pushX, y: pushY }, penetration };
        }
        return null;
    }

    /**
     * Circle-to-rotated-box collision using OBB approach
     */
    _checkCircleRotatedBoxCollision(x, y, obj, collider) {
        const r = this.collisionRadius;

        // Use getWorldPoints() if available for accurate scaled+rotated collision
        if (typeof collider.getWorldPoints === 'function') {
            const worldPoints = collider.getWorldPoints();
            if (worldPoints && worldPoints.length === 4) {
                return this._checkCircleOBBCollision(x, y, worldPoints, r);
            }
        }

        // Fallback: manual calculation
        const sPos = obj.getWorldPosition();
        const scale = obj.scale || { x: 1, y: 1 };
        const scaleX = typeof scale === 'number' ? scale : scale.x;
        const scaleY = typeof scale === 'number' ? scale : scale.y;
        
        const halfW = ((collider.width || 40) * Math.abs(scaleX)) / 2;
        const halfH = ((collider.height || 40) * Math.abs(scaleY)) / 2;
        const angle = (obj.angle || 0) * Math.PI / 180;

        // Transform circle center to box's local space
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const relX = x - sPos.x;
        const relY = y - sPos.y;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;

        // Find closest point on local AABB
        const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
        const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));

        const localDx = localX - closestLocalX;
        const localDy = localY - closestLocalY;
        const distSq = localDx * localDx + localDy * localDy;

        if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            const penetration = r - dist;

            // Transform push direction back to world space
            const cos2 = Math.cos(angle);
            const sin2 = Math.sin(angle);
            let pushLocalX, pushLocalY;

            if (dist > 0.1) {
                pushLocalX = localDx / dist;
                pushLocalY = localDy / dist;
            } else {
                // Inside box - push toward nearest edge
                const distToLeft = localX - (-halfW);
                const distToRight = halfW - localX;
                const distToTop = localY - (-halfH);
                const distToBottom = halfH - localY;
                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                if (minDist === distToLeft) { pushLocalX = -1; pushLocalY = 0; }
                else if (minDist === distToRight) { pushLocalX = 1; pushLocalY = 0; }
                else if (minDist === distToTop) { pushLocalX = 0; pushLocalY = -1; }
                else { pushLocalX = 0; pushLocalY = 1; }
            }

            const worldPushX = pushLocalX * cos2 - pushLocalY * sin2;
            const worldPushY = pushLocalX * sin2 + pushLocalY * cos2;

            return { pushDirection: { x: worldPushX, y: worldPushY }, penetration };
        }
        return null;
    }

    /**
     * Circle-to-OBB collision using world points
     */
    _checkCircleOBBCollision(x, y, worldPoints, r) {
        // Calculate box center
        let centerX = 0, centerY = 0;
        for (const p of worldPoints) {
            centerX += p.x;
            centerY += p.y;
        }
        centerX /= 4;
        centerY /= 4;

        // Get edge vectors (define OBB axes)
        const edge1X = worldPoints[1].x - worldPoints[0].x;
        const edge1Y = worldPoints[1].y - worldPoints[0].y;
        const edge2X = worldPoints[3].x - worldPoints[0].x;
        const edge2Y = worldPoints[3].y - worldPoints[0].y;

        const halfW = Math.sqrt(edge1X * edge1X + edge1Y * edge1Y) / 2;
        const halfH = Math.sqrt(edge2X * edge2X + edge2Y * edge2Y) / 2;

        // Normalize axes
        const axis1X = halfW > 0.001 ? edge1X / (halfW * 2) : 1;
        const axis1Y = halfW > 0.001 ? edge1Y / (halfW * 2) : 0;
        const axis2X = halfH > 0.001 ? edge2X / (halfH * 2) : 0;
        const axis2Y = halfH > 0.001 ? edge2Y / (halfH * 2) : 1;

        // Transform circle to OBB local space
        const relX = x - centerX;
        const relY = y - centerY;
        const localX = relX * axis1X + relY * axis1Y;
        const localY = relX * axis2X + relY * axis2Y;

        // Closest point in local space
        const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
        const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));

        // Transform back to world
        const closestWorldX = centerX + closestLocalX * axis1X + closestLocalY * axis2X;
        const closestWorldY = centerY + closestLocalX * axis1Y + closestLocalY * axis2Y;

        const dx = x - closestWorldX;
        const dy = y - closestWorldY;
        const distSq = dx * dx + dy * dy;

        if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            const penetration = r - dist;
            
            let pushX, pushY;
            if (dist > 0.1) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
                pushX = 0;
                pushY = -1;
            }

            return { pushDirection: { x: pushX, y: pushY }, penetration };
        }
        return null;
    }

    /**
     * Circle-to-polygon collision (simplified)
     */
    _checkCirclePolygonCollision(x, y, collider) {
        // Get world points from polygon collider
        if (typeof collider.getWorldPoints !== 'function') return null;
        
        const points = collider.getWorldPoints();
        if (!points || points.length < 3) return null;

        const r = this.collisionRadius;
        let minDist = Infinity;
        let closestX = x;
        let closestY = y;

        // Check each edge
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            // Closest point on edge segment
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLenSq = edgeX * edgeX + edgeY * edgeY;

            if (edgeLenSq < 0.001) continue;

            const t = Math.max(0, Math.min(1, ((x - p1.x) * edgeX + (y - p1.y) * edgeY) / edgeLenSq));
            const projX = p1.x + t * edgeX;
            const projY = p1.y + t * edgeY;

            const dx = x - projX;
            const dy = y - projY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                closestX = projX;
                closestY = projY;
            }
        }

        if (minDist < r) {
            const dx = x - closestX;
            const dy = y - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            return {
                pushDirection: dist > 0.01 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 },
                penetration: r - dist
            };
        }
        return null;
    }

    _applySeparation(deltaTime) {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return;

        const pos = this.gameObject.getWorldPosition();
        let pushX = 0;
        let pushY = 0;

        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;
            const creature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
            if (!creature) continue;

            const iPos = inst.getWorldPosition();
            const dx = pos.x - iPos.x;
            const dy = pos.y - iPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.separationRadius && dist > 0.01) {
                const force = (1.0 - dist / this.separationRadius) * this.separationStrength;
                pushX += (dx / dist) * force * deltaTime;
                pushY += (dy / dist) * force * deltaTime;
            }
        }

        if (pushX !== 0 || pushY !== 0) {
            this.gameObject.position.x += pushX;
            this.gameObject.position.y += pushY;
        }
    }

    // ==================== PREDICTIVE CHASE ====================

    /**
     * Update predictive chase - calculate where the target will be
     */
    _updatePredictiveChase(deltaTime) {
        if (!this._chaseTarget) {
            this._predictedInterceptPoint = null;
            return;
        }

        this._predictionTimer += deltaTime;
        if (this._predictionTimer < this.predictionUpdateInterval) return;
        this._predictionTimer = 0;

        const targetPos = this._chaseTarget.getWorldPosition();

        // Calculate target velocity from position history
        if (this._lastTargetPos) {
            const dt = this.predictionUpdateInterval;
            this._targetVelocity = {
                x: (targetPos.x - this._lastTargetPos.x) / dt,
                y: (targetPos.y - this._lastTargetPos.y) / dt
            };
        }
        this._lastTargetPos = { x: targetPos.x, y: targetPos.y };

        // Predict future position
        const speed = Math.sqrt(this._targetVelocity.x ** 2 + this._targetVelocity.y ** 2);
        if (speed < 5) {
            // Target barely moving, just go to current position
            this._predictedInterceptPoint = { x: targetPos.x, y: targetPos.y };
        } else {
            // Calculate intercept point
            const myPos = this.gameObject.getWorldPosition();
            const toTarget = {
                x: targetPos.x - myPos.x,
                y: targetPos.y - myPos.y
            };
            const distToTarget = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2);

            // Time to reach target at current chase speed
            const timeToReach = distToTarget / this.chaseSpeed;
            const predictionTime = Math.min(timeToReach, this.predictionLookahead);

            // Predicted position
            this._predictedInterceptPoint = {
                x: targetPos.x + this._targetVelocity.x * predictionTime,
                y: targetPos.y + this._targetVelocity.y * predictionTime
            };
        }
    }

    // ==================== SCENT TRAIL SYSTEM ====================

    /**
     * Update scent trail system - drop and decay scents
     */
    _updateScentTrails(deltaTime) {
        const now = performance.now() / 1000;
        const pos = this.gameObject.getWorldPosition();

        // Drop scent periodically
        if (now - this._lastScentDropTime >= this.scentDropInterval) {
            this._lastScentDropTime = now;

            // Determine scent type based on current state
            let scentType = 'general';
            if (this.currentState === 'flee') scentType = 'danger';
            else if (this.currentState === 'seekFood' || this.currentState === 'eat') scentType = 'food';
            else if (this.currentState === 'returnToNest' || this.currentState === 'sleep') scentType = 'home';

            this._scentTrails.push({
                x: pos.x,
                y: pos.y,
                timestamp: now,
                creatureId: this.gameObject.id || 'self',
                type: scentType
            });

            // Limit trail length
            while (this._scentTrails.length > 100) {
                this._scentTrails.shift();
            }
        }

        // Decay old scents
        this._scentTrails = this._scentTrails.filter(s => now - s.timestamp < this.scentLifetime);
    }

    /**
     * Find nearby scent trails from other creatures
     * @returns {Array} Array of {x, y, type, age} sorted by distance
     */
    _findNearbyScentTrails() {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return [];

        const pos = this.gameObject.getWorldPosition();
        const myTags = this.gameObject.tags || [];
        const nearbyScents = [];
        const now = performance.now() / 1000;

        // Search other creatures for their scent trails
        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;

            const brain = inst.getModule ? inst.getModule('ProceduralCreatureBrain') : null;
            if (!brain || !brain._scentTrails) continue;

            // Check if we should follow this creature's scent
            const instTags = inst.tags || [];
            const isFamilyMember = myTags.some(t => instTags.includes(t));
            const matchesTag = this.scentTrailTag && instTags.includes(this.scentTrailTag);

            if (!isFamilyMember && !matchesTag) continue;

            // Check their scent trails
            for (const scent of brain._scentTrails) {
                const dx = scent.x - pos.x;
                const dy = scent.y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.smellRadius) {
                    nearbyScents.push({
                        x: scent.x,
                        y: scent.y,
                        type: scent.type,
                        age: now - scent.timestamp,
                        dist: dist
                    });
                }
            }
        }

        // Sort by distance
        nearbyScents.sort((a, b) => a.dist - b.dist);
        return nearbyScents;
    }

    /**
     * Get scent-influenced wander target
     */
    _getScentInfluencedTarget(baseTargetX, baseTargetY) {
        if (!this.enableScentTrails || this.scentFollowStrength <= 0) {
            return { x: baseTargetX, y: baseTargetY };
        }

        const nearbyScents = this._findNearbyScentTrails();
        if (nearbyScents.length === 0) {
            return { x: baseTargetX, y: baseTargetY };
        }

        // Find most relevant scent based on state
        let targetScent = null;
        for (const scent of nearbyScents) {
            // Prefer food scents when hungry
            if (this.currentState === 'seekFood' && scent.type === 'food') {
                targetScent = scent;
                break;
            }
            // Avoid danger scents when fleeing or timid
            if (scent.type === 'danger' && (this.currentState === 'flee' || this.temperament === 'timid')) {
                continue;
            }
            // Follow home scents when returning
            if (this.currentState === 'returnToNest' && scent.type === 'home') {
                targetScent = scent;
                break;
            }
            // Default to general scent
            if (!targetScent) {
                targetScent = scent;
            }
        }

        if (!targetScent) {
            return { x: baseTargetX, y: baseTargetY };
        }

        // Blend between base target and scent location
        const freshness = 1 - (targetScent.age / this.scentLifetime);
        const influence = this.scentFollowStrength * freshness;

        return {
            x: baseTargetX * (1 - influence) + targetScent.x * influence,
            y: baseTargetY * (1 - influence) + targetScent.y * influence
        };
    }

    // ==================== DYNAMIC OBSTACLE PREDICTION ====================

    /**
     * Track moving obstacles to predict their future positions
     */
    _updateDynamicObstacles(deltaTime) {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return;

        const pos = this.gameObject.getWorldPosition();
        const now = performance.now() / 1000;

        // Clean up old entries
        for (const id in this._movingObstacles) {
            if (now - this._movingObstacles[id].lastSeen > this.movingObstacleMemory) {
                delete this._movingObstacles[id];
            }
        }

        // Track nearby moving objects
        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;

            const iPos = inst.getWorldPosition();
            const dx = iPos.x - pos.x;
            const dy = iPos.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.collisionSearchRadius) continue;

            // Check if object has a collider (treat as obstacle)
            const box = inst.getModule ? inst.getModule('BoxCollider') : null;
            const sphere = inst.getModule ? inst.getModule('SphereCollider') : null;
            if (!box && !sphere) continue;

            const objId = inst.id || inst._id || 'unknown';
            if (!this._movingObstacles[objId]) {
                this._movingObstacles[objId] = {
                    positions: [],
                    velocity: { x: 0, y: 0 },
                    lastSeen: now
                };
            }

            const record = this._movingObstacles[objId];
            record.positions.push({ x: iPos.x, y: iPos.y, time: now });
            record.lastSeen = now;

            // Keep limited history
            while (record.positions.length > 10) {
                record.positions.shift();
            }

            // Calculate velocity from position history
            if (record.positions.length >= 2) {
                const oldest = record.positions[0];
                const newest = record.positions[record.positions.length - 1];
                const dt = newest.time - oldest.time;
                if (dt > 0.1) {
                    record.velocity = {
                        x: (newest.x - oldest.x) / dt,
                        y: (newest.y - oldest.y) / dt
                    };
                }
            }
        }
    }

    /**
     * Get predicted positions of dynamic obstacles
     */
    _getPredictedObstaclePositions(lookahead = 1.0) {
        const predictions = [];
        const now = performance.now() / 1000;

        for (const id in this._movingObstacles) {
            const record = this._movingObstacles[id];
            if (record.positions.length === 0) continue;

            const speed = Math.sqrt(record.velocity.x ** 2 + record.velocity.y ** 2);
            if (speed < 5) continue; // Object not really moving

            const latest = record.positions[record.positions.length - 1];
            predictions.push({
                current: { x: latest.x, y: latest.y },
                predicted: {
                    x: latest.x + record.velocity.x * lookahead,
                    y: latest.y + record.velocity.y * lookahead
                },
                velocity: record.velocity
            });
        }

        return predictions;
    }

    // ==================== CORRIDOR DETECTION ====================

    /**
     * Detect if creature is in a narrow corridor
     */
    _updateCorridorDetection() {
        const pos = this.gameObject.getWorldPosition();
        const solids = this._getSolidObjects();

        if (solids.length < 2) {
            this._isInCorridor = false;
            return;
        }

        // Check walls on opposing sides
        const checkDist = this.corridorWidth;
        const directions = [
            { x: 1, y: 0 },   // Right
            { x: -1, y: 0 },  // Left
            { x: 0, y: 1 },   // Down
            { x: 0, y: -1 }   // Up
        ];

        let leftBlocked = false, rightBlocked = false;
        let upBlocked = false, downBlocked = false;

        for (const dir of directions) {
            const probeX = pos.x + dir.x * checkDist;
            const probeY = pos.y + dir.y * checkDist;

            if (this._checkCollisionAt(probeX, probeY, solids)) {
                if (dir.x > 0) rightBlocked = true;
                if (dir.x < 0) leftBlocked = true;
                if (dir.y > 0) downBlocked = true;
                if (dir.y < 0) upBlocked = true;
            }
        }

        // Corridor if walls on opposing sides
        const horizontalCorridor = leftBlocked && rightBlocked && !upBlocked && !downBlocked;
        const verticalCorridor = upBlocked && downBlocked && !leftBlocked && !rightBlocked;

        this._isInCorridor = horizontalCorridor || verticalCorridor;
        if (horizontalCorridor) {
            this._corridorDirection = { x: 0, y: 1 }; // Move vertically
        } else if (verticalCorridor) {
            this._corridorDirection = { x: 1, y: 0 }; // Move horizontally
        }
    }

    /**
     * Get speed multiplier for current corridor state
     */
    _getCorridorSpeedMultiplier() {
        if (!this.enableCorridorDetection || !this._isInCorridor) {
            return 1.0;
        }
        return this.corridorSlowdown;
    }

    // ==================== JUMP NAVIGATION ====================

    /**
     * Check if creature can jump over an obstacle
     */
    _canJumpObstacle(obstacleX, obstacleY, obstacleWidth, targetX, targetY) {
        if (!this.enableJumpNavigation) return false;

        const now = performance.now() / 1000;
        if (now - this._lastJumpTime < this.jumpCooldown) return false;

        // Check if obstacle is narrow enough to jump
        if (obstacleWidth > this.jumpHeightThreshold) return false;

        // Check if landing position is clear
        const myPos = this.gameObject.getWorldPosition();
        const toTarget = { x: targetX - myPos.x, y: targetY - myPos.y };
        const dist = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2);
        if (dist < 1) return false;

        const dirX = toTarget.x / dist;
        const dirY = toTarget.y / dist;

        // Calculate landing position (just past obstacle)
        const jumpDist = Math.min(this.maxJumpDistance, obstacleWidth + this.collisionRadius * 3);
        const landingX = myPos.x + dirX * jumpDist;
        const landingY = myPos.y + dirY * jumpDist;

        // Check if landing spot is clear
        const solids = this._getSolidObjects();
        if (this._checkCollisionAt(landingX, landingY, solids)) {
            return false;
        }

        this._jumpTarget = { x: landingX, y: landingY };
        return true;
    }

    /**
     * Execute a jump over an obstacle
     */
    _executeJump() {
        if (!this._jumpTarget) return;

        this._isJumping = true;
        this._lastJumpTime = performance.now() / 1000;

        // Instantly move to landing position (could be animated in ProceduralCreature)
        this.gameObject.position.x = this._jumpTarget.x;
        this.gameObject.position.y = this._jumpTarget.y;

        this._isJumping = false;
        this._jumpTarget = null;
    }

    // ==================== TERRAIN PREFERENCE ====================

    /**
     * Get terrain cost at a position
     * @returns {number} Cost multiplier (< 1 = preferred, > 1 = avoided)
     */
    _getTerrainCostAt(x, y) {
        if (!this.enableTerrainPreference) return 1.0;

        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return 1.0;

        // Check for terrain objects at position
        for (const inst of _engine.instances) {
            const iPos = inst.getWorldPosition();
            const iTags = inst.tags || [];

            // Simple point-in-bounds check (could be more sophisticated)
            const box = inst.getModule ? inst.getModule('BoxCollider') : null;
            if (!box) continue;

            const hw = (box.width || 40) / 2;
            const hh = (box.height || 40) / 2;
            if (x < iPos.x - hw || x > iPos.x + hw || y < iPos.y - hh || y > iPos.y + hh) {
                continue;
            }

            // Check terrain tags
            if (this.preferredTerrainTag && iTags.includes(this.preferredTerrainTag)) {
                return 0.5; // Prefer this terrain
            }
            if (this.avoidedTerrainTag && iTags.includes(this.avoidedTerrainTag)) {
                return 1.0 + this.terrainAvoidanceStrength; // Avoid this terrain
            }
        }

        return 1.0;
    }

    // ==================== DETECTION ====================

    _performDetection() {
        const _engine = this.gameObject._engine;
        if (!_engine || !_engine.instances) return;

        const pos = this.gameObject.getWorldPosition();
        const facing = this._creature ? this._creature.getFacingAngle() : 0;
        const halfFov = (this.fieldOfView / 2) * Math.PI / 180;

        // Ensure tag arrays are arrays (guard against string deserialization)
        if (!Array.isArray(this.hostileTags)) this.hostileTags = this.hostileTags ? [this.hostileTags] : [];
        if (!Array.isArray(this.friendlyTags)) this.friendlyTags = this.friendlyTags ? [this.friendlyTags] : [];
        if (!Array.isArray(this.fearTags)) this.fearTags = this.fearTags ? [this.fearTags] : [];

        this._detectedEnemies = [];
        this._detectedFood = [];
        this._detectedWater = [];
        this._detectedItems = [];
        this._detectedAllies = [];

        for (const inst of _engine.instances) {
            if (inst === this.gameObject) continue;
            if (!inst.tags && !inst.getModule) continue;

            const iPos = inst.getWorldPosition();
            const dx = iPos.x - pos.x;
            const dy = iPos.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.detectionRadius) continue;

            // Check FOV (for visual detection)
            let inFOV = false;
            if (dist < this.hearingRadius) {
                inFOV = true; // Close enough to "hear"
            } else {
                const angleToTarget = Math.atan2(dy, dx);
                let diff = angleToTarget - facing;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                inFOV = Math.abs(diff) < halfFov;
            }

            if (!inFOV && dist > this.smellRadius) continue;

            const tags = inst.tags || [];

            // Enemies - skip dead creatures
            // Check standard hostile/fear tags
            let isEnemy = this.hostileTags.some(t => tags.includes(t)) || this.fearTags.some(t => tags.includes(t));
            
            // Also check ProceduralCreatureBasicTarget module for enemy detection
            const basicTarget = inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            if (basicTarget && !basicTarget.isDead) {
                // Check if this creature's family tags are in the target's enemy tags
                const myTags = this.gameObject.tags || [];
                if (basicTarget.enemyTags && basicTarget.enemyTags.some(t => myTags.includes(t))) {
                    isEnemy = true;
                }
                // Also check if the basic target's tags are in our hostile tags
                if (basicTarget.familyTags && this.hostileTags.some(t => basicTarget.familyTags.includes(t))) {
                    isEnemy = true;
                }
            }
            
            if (isEnemy) {
                // Check if creature is dead before adding to enemies list
                const enemyCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
                // Also check for basic target death
                const isCreatureDead = enemyCreature && enemyCreature.isDead;
                const isBasicTargetDead = basicTarget && basicTarget.isDead;
                
                if (!isCreatureDead && !isBasicTargetDead) {
                    this._detectedEnemies.push(inst);
                    if (this._detectedEnemies.length === 1) {
                        //console.log(`[Brain] ${this.gameObject.name || 'Creature'} detected enemy: ${inst.name || 'unknown'} (dist: ${Math.round(dist)}, temperament: ${this.temperament})`);
                    }
                }
            }

            // Friends - also check ProceduralCreatureBasicTarget for friendly detection
            let isFriend = this.friendlyTags.some(t => tags.includes(t));
            if (basicTarget && !basicTarget.isDead) {
                // Check if this creature's family tags are in the target's family tags (same family)
                const myTags = this.gameObject.tags || [];
                if (basicTarget.familyTags && basicTarget.familyTags.some(t => myTags.includes(t))) {
                    isFriend = true;
                }
            }
            if (isFriend) {
                this._detectedAllies.push(inst);
            }

            // Food (use smell radius)
            if (this.enableHunger && dist <= this.smellRadius && tags.includes(this.foodTag)) {
                this._detectedFood.push(inst);
                this._addMemory(this._foodMemories, iPos.x, iPos.y, inst.id);
            }

            // Water (use smell radius)
            if (this.enableThirst && dist <= this.smellRadius && tags.includes(this.waterTag)) {
                this._detectedWater.push(inst);
                this._addMemory(this._waterMemories, iPos.x, iPos.y, inst.id);
            }

            // Items - also categorize as weapons or food sources
            if (this.canPickUpItems && tags.includes(this.itemPickupTag)) {
                const itemModule = inst.getModule ? inst.getModule('ProceduralCreatureItem') : null;
                if (itemModule && !itemModule.isHeld) {
                    this._detectedItems.push(inst);
                    this._addMemory(this._itemMemories, iPos.x, iPos.y, inst.id, itemModule.itemType);
                    
                    // Categorize into weapon or food memory
                    const itemType = itemModule.itemType || 'generic';
                    if (itemType === 'weapon' || itemType === 'gun' || itemType === 'tool') {
                        // Remember as weapon location
                        this._addWeaponMemory(iPos.x, iPos.y, inst.id, itemType, itemModule.damage || 10);
                    } else if (itemType === 'food' || (itemModule.itemName && itemModule.itemName.toLowerCase().includes('food'))) {
                        // Remember as food source location
                        this._addFoodSourceMemory(iPos.x, iPos.y, inst.id);
                    }
                }
            }
        }
    }

    /**
     * Add a weapon location to memory
     */
    _addWeaponMemory(x, y, objectId, itemType, damage) {
        const now = performance.now() / 1000;
        // Update if already known
        for (let i = 0; i < this._weaponMemories.length; i++) {
            if (this._weaponMemories[i].objectId === objectId) {
                this._weaponMemories[i].x = x;
                this._weaponMemories[i].y = y;
                this._weaponMemories[i].timestamp = now;
                this._weaponMemories[i].damage = damage;
                return;
            }
        }
        // Add new
        if (this._weaponMemories.length >= this.weaponMemoryCapacity) {
            // Remove oldest
            this._weaponMemories.sort((a, b) => a.timestamp - b.timestamp);
            this._weaponMemories.shift();
        }
        this._weaponMemories.push({ x, y, timestamp: now, objectId, itemType, damage });
    }

    /**
     * Add a food source (ProceduralCreatureItem) location to memory
     */
    _addFoodSourceMemory(x, y, objectId) {
        const now = performance.now() / 1000;
        // Update if already known
        for (let i = 0; i < this._foodSourceMemories.length; i++) {
            if (this._foodSourceMemories[i].objectId === objectId) {
                this._foodSourceMemories[i].x = x;
                this._foodSourceMemories[i].y = y;
                this._foodSourceMemories[i].timestamp = now;
                return;
            }
        }
        // Add new
        if (this._foodSourceMemories.length >= this.foodMemoryCapacity) {
            // Remove oldest
            this._foodSourceMemories.sort((a, b) => a.timestamp - b.timestamp);
            this._foodSourceMemories.shift();
        }
        this._foodSourceMemories.push({ x, y, timestamp: now, objectId });
    }

    /**
     * Find nearest remembered weapon
     */
    _findNearestWeaponFromMemory() {
        return this._findNearestFromMemory(this._weaponMemories);
    }

    /**
     * Find the best (highest damage) remembered weapon
     */
    _findBestWeaponFromMemory() {
        if (this._weaponMemories.length === 0) return null;
        const pos = this.gameObject.getWorldPosition();
        let best = null;
        let bestScore = -Infinity;
        for (const mem of this._weaponMemories) {
            const dx = mem.x - pos.x;
            const dy = mem.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Score: prefer higher damage and closer distance
            const score = (mem.damage || 10) - dist * 0.1;
            if (score > bestScore) {
                bestScore = score;
                best = mem;
            }
        }
        return best;
    }

    // ==================== NEEDS ====================

    _updateNeeds(deltaTime) {
        if (this.enableHunger) {
            this.hunger = Math.min(100, this.hunger + (this.hungerRate / 60) * deltaTime);
            if (this.hunger >= 100 && this._creature) {
                this._creature.takeDamage(this.starvationDamage * deltaTime);
            }
        }
        if (this.enableThirst) {
            this.thirst = Math.min(100, this.thirst + (this.thirstRate / 60) * deltaTime);
            if (this.thirst >= 100 && this._creature) {
                this._creature.takeDamage(this.dehydrationDamage * deltaTime);
            }
        }
    }

    // ==================== FRIENDLY FIRE RESPONSE ====================

    /**
     * Check if this creature was recently damaged by a family member (shared tags).
     * If hit enough times, react based on hostility: retaliate, flee, or ignore.
     */
    _checkFriendlyFireDamage() {
        if (!this._creature) return;

        const now = performance.now() / 1000;
        const lastDamageTime = this._creature._lastDamageTime || 0;
        const lastDamageSource = this._creature._lastDamageSource;

        // Only process new damage events
        if (lastDamageTime <= this._lastCheckedDamageTime || !lastDamageSource) return;
        // NOTE: Don't update _lastCheckedDamageTime here! Let _checkDamageResponse handle non-family damage

        // Check if the damage source is a "family member" (shares at least one tag)
        const myTags = this.gameObject.tags || [];
        const sourceTags = lastDamageSource.tags || [];
        if (myTags.length === 0 || sourceTags.length === 0) return;

        const sharesTag = myTags.some(t => sourceTags.includes(t));
        if (!sharesTag) return;
        
        // It IS a family member - now we can mark as checked (only for family hits)
        this._lastCheckedDamageTime = lastDamageTime;

        // It's a family member — track the hit
        const sourceId = lastDamageSource.id || lastDamageSource._id || 'unknown';
        if (!this._friendlyFireHits[sourceId]) {
            this._friendlyFireHits[sourceId] = { hitCount: 0, lastHitTime: 0, sourceObj: null };
        }
        const record = this._friendlyFireHits[sourceId];
        record.hitCount++;
        record.lastHitTime = now;
        record.sourceObj = lastDamageSource;

        // Decay old friendly fire memories
        for (const id in this._friendlyFireHits) {
            if (now - this._friendlyFireHits[id].lastHitTime > this.friendlyFireMemoryTime) {
                delete this._friendlyFireHits[id];
            }
        }

        // Check if tolerance has been exceeded
        if (record.hitCount >= this.friendlyFireTolerance) {
            this._respondToFriendlyFire(record, sourceId);
        }
    }

    /**
     * Decide how to respond when a family member has exceeded the friendly fire tolerance.
     * Based on hostility/aggression, the creature may:
     * - Retaliate: set that family member as its attack target
     * - Flee: run away from the offender
     * - Ignore: just keep going (absorb the hit)
     * @param {object} record - The friendly fire tracking record
     * @param {string} sourceId - The source object's ID
     */
    _respondToFriendlyFire(record, sourceId) {
        // Commanded creatures don't change behavior due to friendly fire - they stay loyal to commands
        //if (this.commandedByPlayer) return;

        const roll = Math.random();

        // Aggression and mood influence chances
        const aggressionMod = this.aggressionLevel + this._currentMood * this.emotionalVariance * 0.3;
        const effectiveRetaliate = this.friendlyFireRetaliateChance * (0.5 + aggressionMod * 0.5);
        const effectiveFlee = this.friendlyFireFleeChance * (1.0 - aggressionMod * 0.5);

        // Temperament overrides
        let retaliateChance = effectiveRetaliate;
        let fleeChance = effectiveFlee;

        if (this.temperament === 'hostile' || this.temperament === 'aggressive') {
            retaliateChance *= 1.5; // More likely to retaliate
            fleeChance *= 0.5; // Less likely to flee
        } else if (this.temperament === 'timid' || this.temperament === 'passive') {
            retaliateChance *= 0.3; // Less likely to retaliate
            fleeChance *= 1.5; // More likely to flee
        }

        // Clamp to 0-1
        retaliateChance = Math.min(1, retaliateChance);
        fleeChance = Math.min(1, fleeChance);

        // The remaining chance after retaliate and flee = just keep going (ignore)
        // Roll against cumulative thresholds
        if (roll < retaliateChance) {
            // RETALIATE: set the offending family member as the chase target
            this._chaseTarget = record.sourceObj;
            this._changeState('chase');
            if (this.friendlyFireResetOnRetaliate) {
                record.hitCount = 0;
            }
        } else if (roll < retaliateChance + fleeChance) {
            // FLEE: run away from the offender
            this._fleeFrom = record.sourceObj;
            this._changeState('flee');
            if (this.friendlyFireResetOnRetaliate) {
                record.hitCount = 0;
            }
        }
        // else: IGNORE — just keep going, no state change
    }

    // ==================== DAMAGE RESPONSE (RETALIATION) ====================

    /**
     * Check if this creature was recently damaged and should retaliate.
     * Unlike _checkFriendlyFireDamage, this handles ANY attacker (not just family members).
     * This is the main system that makes creatures chase whoever hits them.
     */
    _checkDamageResponse() {
        if (!this._creature || !this.retaliateWhenAttacked) return;
        if (this.temperament === 'passive' && this._getEffectiveCourage() < 0.5) return;

        const now = performance.now() / 1000;
        const lastDamageTime = this._creature._lastDamageTime || 0;
        const lastDamageSource = this._creature._lastDamageSource;

        // Only process new damage events (not already checked by friendly fire handler)
        if (lastDamageTime <= this._lastCheckedDamageTime || !lastDamageSource) return;

        // Check if this is a family member (same tags) - friendly fire handler deals with those
        const myTags = this.gameObject.tags || [];
        const sourceTags = lastDamageSource.tags || [];
        const sharesTag = myTags.length > 0 && sourceTags.length > 0 && 
                          myTags.some(t => sourceTags.includes(t));
        
        // If it's a family member, friendly fire handler already dealt with it
        if (sharesTag) return;
        
        // Mark as checked now that we know it's non-family damage
        this._lastCheckedDamageTime = lastDamageTime;

        // This is a non-family attacker! Should we retaliate?
        // Check if attacker matches hostileTags OR if we retaliate regardless of tags
        const isHostileTag = this.hostileTags.length > 0 && 
                            this.hostileTags.some(t => sourceTags.includes(t));
        
        if (isHostileTag || this.retaliateRegardlessOfTags) {
            // Set retaliation target
            this._lastAttacker = lastDamageSource;
            this._lastAttackerTime = now;
            this._retaliationTarget = lastDamageSource;
            //console.log(`[Brain] ${this.gameObject.name || 'Creature'} took damage from ${lastDamageSource.name || 'unknown'}, retaliating! (temperament: ${this.temperament})`);
            
            // Remember threat location in memory
            if (lastDamageSource.getWorldPosition) {
                const attackerPos = lastDamageSource.getWorldPosition();
                this._addMemory(this._threatMemories, attackerPos.x, attackerPos.y, lastDamageSource.id);
            }

            // Immediately switch to chase if not already chasing or fleeing
            if (this.currentState !== 'chase' && this.currentState !== 'hunt' && this.currentState !== 'flee') {
                // For commanded creatures, save return flags so we return to the commanded state after combat
                if (this.commandedByPlayer) {
                    const currentPos = this.gameObject.getWorldPosition();
                    if (this.currentState === 'guard') {
                        this._guardWasChasing = true;
                        if (!this._guardOriginPosition) {
                            this._guardOriginPosition = { x: currentPos.x, y: currentPos.y };
                        }
                    } else if (this.currentState === 'patrol') {
                        this._patrolWasChasing = true;
                        this._patrolSavedPosition = { x: currentPos.x, y: currentPos.y };
                    } else if (this.currentState === 'follow') {
                        this._followWasChasing = true;
                    }
                }

                // Timid creatures might flee instead
                if (this.temperament === 'timid') {
                    const effectiveCourage = this._getEffectiveCourage();
                    if (effectiveCourage < 0.4) {
                        this._fleeFrom = lastDamageSource;
                        this._changeState('flee');
                        return;
                    }
                }
                
                this._chaseTarget = lastDamageSource;
                this._changeState('chase');
            }
        }
    }

    // ==================== MOOD ====================

    _updateMood(deltaTime) {
        // Commanded creatures: just ensure _leader stays pointed at the commander
        // and skip all pack logic that could clear _leader or change packRole.
        if (this.commandedByPlayer) {
            if (this._commandedByPlayerObject && !this._leader) {
                this._leader = this._commandedByPlayerObject;
            }
            return;
        }
        
        this._moodTimer += deltaTime;
        if (this._moodTimer >= this.moodSwingInterval) {
            this._moodTimer = 0;
            // Shift mood randomly with personality bias
            const shift = (Math.random() - 0.5) * 2 * this.emotionalVariance;
            const personalityBias = (this._personalityRoll - 0.5) * 0.3; // Consistent per-creature offset
            this._currentMood = Math.max(-1, Math.min(1, this._currentMood + shift + personalityBias));

            // Lone wolf check for pack members (skip if commanded by player - they stay loyal to commands)
            if (this.enablePackBehavior && this.packRole === 'member' && !this.commandedByPlayer) {
                const loneWolfRoll = Math.random();
                const adjustedChance = this.loneWolfChance * (1.0 - this.loyaltyLevel);
                if (loneWolfRoll < adjustedChance && this._currentMood < -0.3) {
                    this.packRole = 'lone_wolf';
                    this._leader = null;
                }
            }
        }
    }

    // ==================== MEMORY ====================

    _addMemory(memoryArray, x, y, objectId) {
        const now = performance.now() / 1000;
        // Update if already known
        for (let i = 0; i < memoryArray.length; i++) {
            if (memoryArray[i].objectId === objectId) {
                memoryArray[i].x = x;
                memoryArray[i].y = y;
                memoryArray[i].timestamp = now;
                return;
            }
        }
        // Add new
        if (memoryArray.length >= this.memoryCapacity) {
            // Remove oldest
            memoryArray.sort((a, b) => a.timestamp - b.timestamp);
            memoryArray.shift();
        }
        memoryArray.push({ x, y, timestamp: now, objectId });
    }

    _decayMemories() {
        const now = performance.now() / 1000;
        const decay = this.memoryDecayTime;
        this._foodMemories = this._foodMemories.filter(m => now - m.timestamp < decay);
        this._waterMemories = this._waterMemories.filter(m => now - m.timestamp < decay);
        this._itemMemories = this._itemMemories.filter(m => now - m.timestamp < decay);
        this._threatMemories = this._threatMemories.filter(m => now - m.timestamp < decay);
        this._allyMemories = this._allyMemories.filter(m => now - m.timestamp < decay);
        this._weaponMemories = this._weaponMemories.filter(m => now - m.timestamp < decay);
        this._foodSourceMemories = this._foodSourceMemories.filter(m => now - m.timestamp < decay);
    }

    _findNearestFromMemory(memoryArray) {
        if (memoryArray.length === 0) return null;
        const pos = this.gameObject.getWorldPosition();
        let best = null;
        let bestDist = Infinity;
        for (const mem of memoryArray) {
            const dx = mem.x - pos.x;
            const dy = mem.y - pos.y;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                best = mem;
            }
        }
        return best;
    }

    // ==================== PACK ====================

    _updatePackBehavior(deltaTime) {
        // Commanded creatures: just ensure _leader stays pointed at the commander
        // and skip all pack logic that could clear _leader or change packRole.
        if (this.commandedByPlayer) {
            if (this._commandedByPlayerObject && !this._leader) {
                this._leader = this._commandedByPlayerObject;
            }
            return;
        }

        if (this.packRole === 'leader' || this.packRole === 'lone_wolf') return;
        if (!this.leaderTag) return;

        // Find leader if not assigned
        if (!this._leader) {
            const _engine = this.gameObject._engine;
            if (!_engine || !_engine.instances) return;

            for (const inst of _engine.instances) {
                if (inst === this.gameObject) continue;
                if (inst.tags && inst.tags.includes(this.leaderTag)) {
                    const leaderCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
                    if (leaderCreature && !leaderCreature.isDead) {
                        this._leader = inst;
                        break;
                    }
                }
            }
        }

        // If leader found, switch to follow state when idle
        if (this._leader && (this.currentState === 'idle' || this.currentState === 'wander' || this.currentState === 'patrol'  
        || this.currentState === 'guard')) {
            this._changeState('follow');
        }

        // If leader died, go solo or find new leader
        if (this._leader) {
            const leaderCreature = this._leader.getModule ? this._leader.getModule('ProceduralCreature') : null;
            if (!leaderCreature || leaderCreature.isDead) {
                this._leader = null;
                // Emotional reaction: possibly go lone wolf
                if (Math.random() < 0.3 + this.emotionalVariance) {
                    this.packRole = 'lone_wolf';
                }
            }
        }

        // Defend leader
        if (this.defendLeader && this._leader && this._detectedEnemies.length > 0) {
            const leaderPos = this._leader.getWorldPosition();
            for (const enemy of this._detectedEnemies) {
                const ePos = enemy.getWorldPosition();
                const dx = ePos.x - leaderPos.x;
                const dy = ePos.y - leaderPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.packCallRadius) {
                    this._chaseTarget = enemy;
                    this._changeState('chase');
                    return;
                }
            }
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Pick a wander target with smooth, less erratic movement
     * Uses direction bias and curve limiting for natural-looking paths
     */
    _pickWanderTarget() {
        if (this.commandedByPlayer) {
            if (this._commandedByPlayerObject && !this._leader) {
                this._leader = this._commandedByPlayerObject;
            }
            return;
        }
        
        const pos = this.gameObject.getWorldPosition();
        const center = this._nestWorldPos || pos;
        
        if (this._wanderDirection === undefined || this._wanderDirection === 0) {
            this._wanderDirection = Math.random() * Math.PI * 2;
        }
        
        const distFromCenter = Math.sqrt(
            Math.pow(pos.x - center.x, 2) + Math.pow(pos.y - center.y, 2)
        );
        const angleFromCenter = Math.atan2(pos.y - center.y, pos.x - center.x);
        
        let baseAngle;
        if (distFromCenter > this.wanderRadius * 0.8) {
            baseAngle = angleFromCenter + Math.PI;
        } else if (distFromCenter > this.wanderRadius * 0.5) {
            const towardCenter = angleFromCenter + Math.PI;
            const biasStrength = (distFromCenter - this.wanderRadius * 0.5) / (this.wanderRadius * 0.3);
            baseAngle = this._lerpAngle(this._wanderDirection, towardCenter, biasStrength * 0.5);
        } else {
            baseAngle = this._wanderDirection;
        }
        
        const maxCurve = this.wanderCurveAmount * Math.PI / 180;
        const curveAmount = (Math.random() - 0.5) * 2 * maxCurve;
        
        let newAngle;
        if (Math.random() < this.wanderDirectionBias) {
            newAngle = baseAngle + curveAmount * (1 - this.wanderSmoothness);
        } else {
            const randomAngle = Math.random() * Math.PI * 2;
            const blendAmount = 1 - this.wanderSmoothness;
            newAngle = this._lerpAngle(baseAngle, randomAngle, blendAmount);
        }
        
        this._wanderDirection = newAngle;
        
        // Enforce a proper minimum distance so targets are never trivially close
        const minDist = Math.max(this.wanderMinDistance, this.arrivalThreshold * 4);
        const maxDist = this.wanderRadius * (0.3 + this.wanderSmoothness * 0.4);
        // Ensure maxDist is always greater than minDist
        const effectiveMaxDist = Math.max(minDist + 20, maxDist);
        const targetDist = minDist + Math.random() * (effectiveMaxDist - minDist);
        
        let targetX = pos.x + Math.cos(newAngle) * targetDist;
        let targetY = pos.y + Math.sin(newAngle) * targetDist;
        
        const finalDistFromCenter = Math.sqrt(
            Math.pow(targetX - center.x, 2) + Math.pow(targetY - center.y, 2)
        );
        if (finalDistFromCenter > this.wanderRadius) {
            const clampAngle = Math.atan2(targetY - center.y, targetX - center.x);
            targetX = center.x + Math.cos(clampAngle) * this.wanderRadius * 0.9;
            targetY = center.y + Math.sin(clampAngle) * this.wanderRadius * 0.9;
        }
        
        // Final distance check after clamping - if still too close, just push further out
        const finalDist = Math.sqrt(
            Math.pow(targetX - pos.x, 2) + Math.pow(targetY - pos.y, 2)
        );
        if (finalDist < minDist) {
            // Fall back to moving directly away from center, or a random direction
            const fallbackAngle = distFromCenter > 5 ? angleFromCenter + Math.PI : newAngle;
            targetX = pos.x + Math.cos(fallbackAngle) * minDist;
            targetY = pos.y + Math.sin(fallbackAngle) * minDist;
        }
        
        this._wanderTarget = { x: targetX, y: targetY };
    }

    /**
     * Linearly interpolate between two angles (handling wraparound)
     */
    _lerpAngle(a1, a2, t) {
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a1 + diff * t;
    }

    _getClosestEnemy() {
        if (this._detectedEnemies.length === 0) return null;
        const pos = this.gameObject.getWorldPosition();
        let closest = null;
        let closestDist = Infinity;
        for (const enemy of this._detectedEnemies) {
            // Skip dead creatures
            const enemyCreature = enemy.getModule ? enemy.getModule('ProceduralCreature') : null;
            if (enemyCreature && enemyCreature.isDead) continue;
            
            // Skip dead basic targets
            const basicTarget = enemy.getModule ? enemy.getModule('ProceduralCreatureBasicTarget') : null;
            if (basicTarget && basicTarget.isDead) continue;
            
            const ePos = enemy.getWorldPosition();
            const dx = ePos.x - pos.x;
            const dy = ePos.y - pos.y;
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }
        return closest;
    }

    _distanceTo(x, y) {
        const pos = this.gameObject.getWorldPosition();
        const dx = x - pos.x;
        const dy = y - pos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if there's a clear line of sight to a target position
     * Uses raycasting against solid objects
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @returns {boolean} True if line of sight is clear
     */
    _hasLineOfSight(targetX, targetY) {
        if (!this.enableCollision) return true; // No collision = always visible
        
        const pos = this.gameObject.getWorldPosition();
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5) return true; // Very close = visible
        
        const solids = this._getSolidObjects();
        if (!solids || solids.length === 0) return true;
        
        // Raycast check with multiple steps
        const steps = Math.min(20, Math.ceil(dist / 20)); // Check every 20 pixels
        const stepX = dx / steps;
        const stepY = dy / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkX = pos.x + stepX * i;
            const checkY = pos.y + stepY * i;
            
            // Check if this point is inside any solid
            for (const solid of solids) {
                const collider = solid.getModule ? solid.getModule('BoxCollider') : null;
                if (!collider || !collider.enabled) continue;
                
                const solidPos = solid.getWorldPosition();
                const halfW = (collider.width || 32) / 2;
                const halfH = (collider.height || 32) / 2;
                
                // Simple AABB check
                if (checkX >= solidPos.x - halfW && checkX <= solidPos.x + halfW &&
                    checkY >= solidPos.y - halfH && checkY <= solidPos.y + halfH) {
                    return false; // Blocked by solid
                }
            }
        }
        
        return true; // Clear line of sight
    }

    _hasAnyTag(obj, tags) {
        if (!obj.tags || !tags) return false;
        return tags.some(t => obj.tags.includes(t));
    }

    /**
     * Check if the creature is currently holding a gun in any arm
     * @returns {boolean} True if holding at least one gun
     */
    _isHoldingGun() {
        if (!this._creature || !this._creature._arms) return false;
        for (const arm of this._creature._arms) {
            if (arm.heldItem && arm.heldItem.itemType === 'gun') {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the first held gun item (for checking reload state, etc.)
     * @returns {Object|null} The gun item or null
     */
    _getHeldGun() {
        if (!this._creature || !this._creature._arms) return null;
        for (const arm of this._creature._arms) {
            if (arm.heldItem && arm.heldItem.itemType === 'gun') {
                return arm.heldItem;
            }
        }
        return null;
    }

    /**
     * Get the effective engagement range for ranged combat
     * Returns the min and max distance to maintain when using guns
     * @returns {{min: number, max: number}} Distance range
     */
    _getGunEngagementRange() {
        const minDist = this.gunEngagementDistanceMin || 150;
        let maxDist = this.gunEngagementDistanceMax;
        if (!maxDist || maxDist <= 0) {
            maxDist = this.detectionRadius * 0.8;
        }
        // Ensure min doesn't exceed max
        return {
            min: Math.min(minDist, maxDist),
            max: maxDist
        };
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = {};
        json.type = 'ProceduralCreatureBrain';
        json.enabled = this.enabled;

        // Core
        json.aiEnabled = this.aiEnabled;
        json.defaultState = this.defaultState;

        // Detection
        json.detectionRadius = this.detectionRadius;
        json.fieldOfView = this.fieldOfView;
        json.hearingRadius = this.hearingRadius;
        json.smellRadius = this.smellRadius;
        json.detectionCheckInterval = this.detectionCheckInterval;

        // Movement
        json.moveSpeed = this.moveSpeed;
        json.wanderSpeed = this.wanderSpeed;
        json.chaseSpeed = this.chaseSpeed;
        json.fleeSpeed = this.fleeSpeed;
        json.patrolSpeed = this.patrolSpeed;
        json.wanderRadius = this.wanderRadius;
        json.wanderPauseMin = this.wanderPauseMin;
        json.wanderPauseMax = this.wanderPauseMax;
        json.arrivalThreshold = this.arrivalThreshold;
        json.turnSpeed = this.turnSpeed;
        json.moveAcceleration = this.moveAcceleration;

        // Collision
        json.enableCollision = this.enableCollision;
        json.solidTag = this.solidTag;
        json.collisionRadius = this.collisionRadius;
        json.collisionSearchRadius = this.collisionSearchRadius;
        json.slideAlongWalls = this.slideAlongWalls;
        json.slideFriction = this.slideFriction;
        json.steeringLookahead = this.steeringLookahead;
        json.avoidanceStrength = this.avoidanceStrength;

        // Separation
        json.enableSeparation = this.enableSeparation;
        json.separationRadius = this.separationRadius;
        json.separationStrength = this.separationStrength;

        // Temperament
        json.temperament = this.temperament;
        json.hostileTags = this.hostileTags;
        json.friendlyTags = this.friendlyTags;
        json.fearTags = this.fearTags;
        json.aggressionLevel = this.aggressionLevel;
        json.courage = this.courage;
        json.fleeHealthThreshold = this.fleeHealthThreshold;
        json.territoryRadius = this.territoryRadius;
        json.attackCooldown = this.attackCooldown;
        json.attackRange = this.attackRange;

        // Friendly Fire
        json.friendlyFireTolerance = this.friendlyFireTolerance;
        json.friendlyFireRetaliateChance = this.friendlyFireRetaliateChance;
        json.friendlyFireFleeChance = this.friendlyFireFleeChance;
        json.friendlyFireMemoryTime = this.friendlyFireMemoryTime;
        json.friendlyFireResetOnRetaliate = this.friendlyFireResetOnRetaliate;

        // Emotional
        json.emotionalVariance = this.emotionalVariance;
        json.moodSwingInterval = this.moodSwingInterval;

        // Needs
        json.enableHunger = this.enableHunger;
        json.enableThirst = this.enableThirst;
        json.hunger = this.hunger;
        json.thirst = this.thirst;
        json.hungerRate = this.hungerRate;
        json.thirstRate = this.thirstRate;
        json.hungerThreshold = this.hungerThreshold;
        json.thirstThreshold = this.thirstThreshold;
        json.starvationDamage = this.starvationDamage;
        json.dehydrationDamage = this.dehydrationDamage;
        json.eatDuration = this.eatDuration;
        json.drinkDuration = this.drinkDuration;
        json.eatHungerRestore = this.eatHungerRestore;
        json.drinkThirstRestore = this.drinkThirstRestore;
        json.foodTag = this.foodTag;
        json.waterTag = this.waterTag;

        // Memory
        json.memoryCapacity = this.memoryCapacity;
        json.memoryDecayTime = this.memoryDecayTime;

        // Nest
        json.enableNest = this.enableNest;
        json.useStartPositionAsNest = this.useStartPositionAsNest;
        json.nestPosition = this.nestPosition;
        json.nestPrefab = this.nestPrefab;
        json.nestReturnDistance = this.nestReturnDistance;
        json.nestSafeRadius = this.nestSafeRadius;
        json.sleepAtNest = this.sleepAtNest;
        json.sleepDuration = this.sleepDuration;
        json.sleepHealRate = this.sleepHealRate;

        // Pack
        json.enablePackBehavior = this.enablePackBehavior;
        json.packRole = this.packRole;
        json.leaderTag = this.leaderTag;
        json.followDistance = this.followDistance;
        json.maxFollowDistance = this.maxFollowDistance;
        json.loyaltyLevel = this.loyaltyLevel;
        json.loneWolfChance = this.loneWolfChance;
        json.packCallRadius = this.packCallRadius;
        json.defendLeader = this.defendLeader;
        json.mimicLeaderState = this.mimicLeaderState;

        // Patrol
        json.patrolMode = this.patrolMode;
        json.patrolPoints = this.patrolPoints;
        json.patrolWaitTime = this.patrolWaitTime;
        json.patrolChaseEnemies = this.patrolChaseEnemies;
        json.patrolReturnAfterChase = this.patrolReturnAfterChase;

        // Base Defense
        json.baseTargetPrefab = this.baseTargetPrefab;
        json.baseTargetTag = this.baseTargetTag;
        json.baseDefenseMode = this.baseDefenseMode;
        json.baseDefenseRadius = this.baseDefenseRadius;
        json.basePatrolAroundBase = this.basePatrolAroundBase;
        json.basePatrolRadius = this.basePatrolRadius;
        json.baseDefenseAggression = this.baseDefenseAggression;

        // Investigation
        json.investigateDuration = this.investigateDuration;
        json.investigateChance = this.investigateChance;

        // Advanced Navigation
        json.navigationHistorySize = this.navigationHistorySize;
        json.failedLocationMemorySize = this.failedLocationMemorySize;
        json.stuckDetectionMargin = this.stuckDetectionMargin;
        json.stuckTimeThreshold = this.stuckTimeThreshold;
        json.avoidanceDurationMin = this.avoidanceDurationMin;
        json.avoidanceDurationMax = this.avoidanceDurationMax;
        json.backtrackCooldown = this.backtrackCooldown;
        json.failedAngleMemoryTime = this.failedAngleMemoryTime;
        json.angleRetryMargin = this.angleRetryMargin;
        
        // Runtime navigation memory (for save/load during gameplay)
        json._positionHistory = this._positionHistory.map(p => ({
            x: p.x, y: p.y, timestamp: p.timestamp,
            targetX: p.targetX, targetY: p.targetY,
            approachAngle: p.approachAngle
        }));
        json._failedLocations = this._failedLocations.map(f => ({
            x: f.x, y: f.y, timestamp: f.timestamp,
            approachAngle: f.approachAngle, failCount: f.failCount
        }));
        json._failedAngles = this._failedAngles.map(f => ({
            angle: f.angle, timestamp: f.timestamp,
            fromX: f.fromX, fromY: f.fromY,
            targetX: f.targetX, targetY: f.targetY,
            failCount: f.failCount
        }));

        // Predictive Chase
        json.enablePredictiveChase = this.enablePredictiveChase;
        json.predictionLookahead = this.predictionLookahead;
        json.predictionUpdateInterval = this.predictionUpdateInterval;

        // Corridor Detection
        json.enableCorridorDetection = this.enableCorridorDetection;
        json.corridorWidth = this.corridorWidth;
        json.corridorSlowdown = this.corridorSlowdown;

        // Jump Navigation
        json.enableJumpNavigation = this.enableJumpNavigation;
        json.maxJumpDistance = this.maxJumpDistance;
        json.jumpCooldown = this.jumpCooldown;
        json.jumpHeightThreshold = this.jumpHeightThreshold;

        // Scent Trails
        json.enableScentTrails = this.enableScentTrails;
        json.scentDropInterval = this.scentDropInterval;
        json.scentLifetime = this.scentLifetime;
        json.scentFollowStrength = this.scentFollowStrength;
        json.scentTrailTag = this.scentTrailTag;

        // Dynamic Obstacle Prediction
        json.enableDynamicObstaclePrediction = this.enableDynamicObstaclePrediction;
        json.movingObstacleMemory = this.movingObstacleMemory;

        // Terrain Preference
        json.enableTerrainPreference = this.enableTerrainPreference;
        json.preferredTerrainTag = this.preferredTerrainTag;
        json.avoidedTerrainTag = this.avoidedTerrainTag;
        json.terrainAvoidanceStrength = this.terrainAvoidanceStrength;

        // Flanking Behavior
        json.enableFlanking = this.enableFlanking;
        json.flankingAngleOffset = this.flankingAngleOffset;
        json.flankingChance = this.flankingChance;

        // Items
        json.canPickUpItems = this.canPickUpItems;
        json.preferredItemType = this.preferredItemType;
        json.itemSearchRadius = this.itemSearchRadius;
        json.itemPickupTag = this.itemPickupTag;

        // Smooth Wander
        json.wanderSmoothness = this.wanderSmoothness;
        json.wanderMinDistance = this.wanderMinDistance;
        json.wanderDirectionBias = this.wanderDirectionBias;
        json.wanderCurveAmount = this.wanderCurveAmount;

        // Cornered Behavior
        json.corneredBehavior = this.corneredBehavior;
        json.corneredDistance = this.corneredDistance;
        json.corneredEscapeThreshold = this.corneredEscapeThreshold;
        json.corneredAggressionBoost = this.corneredAggressionBoost;
        json.corneredCourageBoost = this.corneredCourageBoost;
        json.dropItemsWhenCornered = this.dropItemsWhenCornered;

        // Item Pickup Behavior
        json.itemPickupBehavior = this.itemPickupBehavior;
        json.weaponMemoryCapacity = this.weaponMemoryCapacity;
        json.foodSourceMemoryCapacity = this.foodSourceMemoryCapacity;

        // Debug
        json.debugDraw = this.debugDraw;
        json.debugShowState = this.debugShowState;
        json.debugShowMemory = this.debugShowMemory;
        json.debugShowDetection = this.debugShowDetection;
        json.debugShowNavigation = this.debugShowNavigation;

        json.retaliateWhenAttacked = this.retaliateWhenAttacked; // Chase and attack whoever damages this creature
        json.retaliationDuration = this.retaliationDuration; // Seconds to chase attacker before giving up
        json.retaliateRegardlessOfTags = this.retaliateRegardlessOfTags; // Chase attacker even if not in hostileTags
        json.loseInterestWithoutLOS = this.loseInterestWithoutLOS; // Only lose target when blocked from view
        json.loseInterestTime = this.loseInterestTime; // Seconds without LOS before losing interest

        // ==================== RANGED COMBAT / GUN DISTANCE ====================
        json.enableGunDistanceKeeping = this.enableGunDistanceKeeping;
        json.gunEngagementDistanceMin = this.gunEngagementDistanceMin;
        json.gunEngagementDistanceMax = this.gunEngagementDistanceMax;
        json.gunBackpedalSpeed = this.gunBackpedalSpeed;
        json.gunStrafeChance = this.gunStrafeChance;
        json.gunStrafeDistance = this.gunStrafeDistance;
        json.gunStrafeSpeed = this.gunStrafeSpeed;

        return json;
    }

    static fromJSON(json) {
        const module = new ProceduralCreatureBrain();
        module.enabled = json.enabled ?? true;

        // Core
        module.aiEnabled = json.aiEnabled ?? true;
        module.defaultState = json.defaultState ?? 'wander';

        // Detection
        module.detectionRadius = json.detectionRadius ?? 300;
        module.fieldOfView = json.fieldOfView ?? 160;
        module.hearingRadius = json.hearingRadius ?? 150;
        module.smellRadius = json.smellRadius ?? 200;
        module.detectionCheckInterval = json.detectionCheckInterval ?? 0.2;

        // Movement
        module.moveSpeed = json.moveSpeed ?? 100;
        module.wanderSpeed = json.wanderSpeed ?? 60;
        module.chaseSpeed = json.chaseSpeed ?? 140;
        module.fleeSpeed = json.fleeSpeed ?? 160;
        module.patrolSpeed = json.patrolSpeed ?? 80;
        module.wanderRadius = json.wanderRadius ?? 200;
        module.wanderPauseMin = json.wanderPauseMin ?? 1.0;
        module.wanderPauseMax = json.wanderPauseMax ?? 4.0;
        module.arrivalThreshold = json.arrivalThreshold ?? 15;
        module.turnSpeed = json.turnSpeed ?? 360;
        module.moveAcceleration = json.moveAcceleration ?? 400;

        // Collision
        module.enableCollision = json.enableCollision ?? true;
        module.solidTag = json.solidTag ?? 'solid';
        module.collisionRadius = json.collisionRadius ?? 20;
        module.collisionSearchRadius = json.collisionSearchRadius ?? 200;
        module.slideAlongWalls = json.slideAlongWalls ?? true;
        module.slideFriction = json.slideFriction ?? 0.7;
        module.steeringLookahead = json.steeringLookahead ?? 50;
        module.avoidanceStrength = json.avoidanceStrength ?? 1.5;

        // Separation
        module.enableSeparation = json.enableSeparation ?? true;
        module.separationRadius = json.separationRadius ?? 35;
        module.separationStrength = json.separationStrength ?? 120;

        // Temperament
        module.temperament = json.temperament ?? 'neutral';
        module.hostileTags = json.hostileTags ?? [];
        module.friendlyTags = json.friendlyTags ?? [];
        module.fearTags = json.fearTags ?? [];
        module.aggressionLevel = json.aggressionLevel ?? 0.5;
        module.courage = json.courage ?? 0.5;
        module.fleeHealthThreshold = json.fleeHealthThreshold ?? 0.25;
        module.territoryRadius = json.territoryRadius ?? 0;
        module.attackCooldown = json.attackCooldown ?? 0.8;
        module.attackRange = json.attackRange ?? 0;

        // Friendly Fire
        module.friendlyFireTolerance = json.friendlyFireTolerance ?? 3;
        module.friendlyFireRetaliateChance = json.friendlyFireRetaliateChance ?? 0.5;
        module.friendlyFireFleeChance = json.friendlyFireFleeChance ?? 0.2;
        module.friendlyFireMemoryTime = json.friendlyFireMemoryTime ?? 30;
        module.friendlyFireResetOnRetaliate = json.friendlyFireResetOnRetaliate ?? true;

        // Emotional
        module.emotionalVariance = json.emotionalVariance ?? 0.15;
        module.moodSwingInterval = json.moodSwingInterval ?? 10;

        // Needs
        module.enableHunger = json.enableHunger ?? true;
        module.enableThirst = json.enableThirst ?? true;
        module.hunger = json.hunger ?? 0;
        module.thirst = json.thirst ?? 0;
        module.hungerRate = json.hungerRate ?? 2.0;
        module.thirstRate = json.thirstRate ?? 3.0;
        module.hungerThreshold = json.hungerThreshold ?? 60;
        module.thirstThreshold = json.thirstThreshold ?? 60;
        module.starvationDamage = json.starvationDamage ?? 5;
        module.dehydrationDamage = json.dehydrationDamage ?? 8;
        module.eatDuration = json.eatDuration ?? 2.0;
        module.drinkDuration = json.drinkDuration ?? 1.5;
        module.eatHungerRestore = json.eatHungerRestore ?? 50;
        module.drinkThirstRestore = json.drinkThirstRestore ?? 50;
        module.foodTag = json.foodTag ?? 'food';
        module.waterTag = json.waterTag ?? 'water';

        // Memory
        module.memoryCapacity = json.memoryCapacity ?? 10;
        module.memoryDecayTime = json.memoryDecayTime ?? 300;

        // Nest
        module.enableNest = json.enableNest ?? false;
        module.useStartPositionAsNest = json.useStartPositionAsNest ?? true;
        module.nestPosition = json.nestPosition ?? { x: 0, y: 0 };
        module.nestPrefab = json.nestPrefab ?? '';
        module.nestReturnDistance = json.nestReturnDistance ?? 500;
        module.nestSafeRadius = json.nestSafeRadius ?? 40;
        module.sleepAtNest = json.sleepAtNest ?? true;
        module.sleepDuration = json.sleepDuration ?? 5.0;
        module.sleepHealRate = json.sleepHealRate ?? 10;

        // Pack
        module.enablePackBehavior = json.enablePackBehavior ?? true;
        module.packRole = json.packRole ?? 'member';
        module.leaderTag = json.leaderTag ?? '';
        module.followDistance = json.followDistance ?? 60;
        module.maxFollowDistance = json.maxFollowDistance ?? 300;
        module.loyaltyLevel = json.loyaltyLevel ?? 0.8;
        module.loneWolfChance = json.loneWolfChance ?? 0.05;
        module.packCallRadius = json.packCallRadius ?? 250;
        module.defendLeader = json.defendLeader ?? true;
        module.mimicLeaderState = json.mimicLeaderState ?? true;

        // Patrol
        module.patrolMode = json.patrolMode ?? 'none';
        module.patrolPoints = json.patrolPoints ?? [];
        module.patrolWaitTime = json.patrolWaitTime ?? 2.0;
        module.patrolChaseEnemies = json.patrolChaseEnemies ?? true;
        module.patrolReturnAfterChase = json.patrolReturnAfterChase ?? true;

        // Base Defense
        module.baseTargetPrefab = json.baseTargetPrefab ?? '';
        module.baseTargetTag = json.baseTargetTag ?? '';
        module.baseDefenseMode = json.baseDefenseMode ?? 'defend';
        module.baseDefenseRadius = json.baseDefenseRadius ?? 100;
        module.basePatrolAroundBase = json.basePatrolAroundBase ?? true;
        module.basePatrolRadius = json.basePatrolRadius ?? 150;
        module.baseDefenseAggression = json.baseDefenseAggression ?? true;

        // Investigation
        module.investigateDuration = json.investigateDuration ?? 3.0;
        module.investigateChance = json.investigateChance ?? 0.6;

        // Advanced Navigation
        module.navigationHistorySize = json.navigationHistorySize ?? 10;
        module.failedLocationMemorySize = json.failedLocationMemorySize ?? 10;
        module.stuckDetectionMargin = json.stuckDetectionMargin ?? 5;
        module.stuckTimeThreshold = json.stuckTimeThreshold ?? 0.8;
        module.avoidanceDurationMin = json.avoidanceDurationMin ?? 0.8;
        module.avoidanceDurationMax = json.avoidanceDurationMax ?? 1.5;
        module.backtrackCooldown = json.backtrackCooldown ?? 3.0;
        module.failedAngleMemoryTime = json.failedAngleMemoryTime ?? 15.0;
        module.angleRetryMargin = json.angleRetryMargin ?? 30;
        
        // Restore runtime navigation memory
        module._positionHistory = (json._positionHistory || []).map(p => ({
            x: p.x, y: p.y, timestamp: p.timestamp,
            targetX: p.targetX || 0, targetY: p.targetY || 0,
            approachAngle: p.approachAngle || 0
        }));
        module._failedLocations = (json._failedLocations || []).map(f => ({
            x: f.x, y: f.y, timestamp: f.timestamp,
            approachAngle: f.approachAngle || 0, failCount: f.failCount || 1
        }));
        module._failedAngles = (json._failedAngles || []).map(f => ({
            angle: f.angle, timestamp: f.timestamp,
            fromX: f.fromX, fromY: f.fromY,
            targetX: f.targetX, targetY: f.targetY,
            failCount: f.failCount || 1
        }));

        // Predictive Chase
        module.enablePredictiveChase = json.enablePredictiveChase ?? true;
        module.predictionLookahead = json.predictionLookahead ?? 1.0;
        module.predictionUpdateInterval = json.predictionUpdateInterval ?? 0.3;

        // Corridor Detection
        module.enableCorridorDetection = json.enableCorridorDetection ?? true;
        module.corridorWidth = json.corridorWidth ?? 80;
        module.corridorSlowdown = json.corridorSlowdown ?? 0.7;

        // Jump Navigation
        module.enableJumpNavigation = json.enableJumpNavigation ?? false;
        module.maxJumpDistance = json.maxJumpDistance ?? 100;
        module.jumpCooldown = json.jumpCooldown ?? 2.0;
        module.jumpHeightThreshold = json.jumpHeightThreshold ?? 30;

        // Scent Trails
        module.enableScentTrails = json.enableScentTrails ?? true;
        module.scentDropInterval = json.scentDropInterval ?? 1.0;
        module.scentLifetime = json.scentLifetime ?? 60.0;
        module.scentFollowStrength = json.scentFollowStrength ?? 0.5;
        module.scentTrailTag = json.scentTrailTag ?? '';

        // Dynamic Obstacle Prediction
        module.enableDynamicObstaclePrediction = json.enableDynamicObstaclePrediction ?? true;
        module.movingObstacleMemory = json.movingObstacleMemory ?? 2.0;

        // Terrain Preference
        module.enableTerrainPreference = json.enableTerrainPreference ?? false;
        module.preferredTerrainTag = json.preferredTerrainTag ?? '';
        module.avoidedTerrainTag = json.avoidedTerrainTag ?? '';
        module.terrainAvoidanceStrength = json.terrainAvoidanceStrength ?? 0.8;

        // Flanking Behavior
        module.enableFlanking = json.enableFlanking ?? true;
        module.flankingAngleOffset = json.flankingAngleOffset ?? 45;
        module.flankingChance = json.flankingChance ?? 0.4;

        // Items
        module.canPickUpItems = json.canPickUpItems ?? false;
        module.preferredItemType = json.preferredItemType ?? '';
        module.itemSearchRadius = json.itemSearchRadius ?? 150;
        module.itemPickupTag = json.itemPickupTag ?? 'item';

        // Smooth Wander
        module.wanderSmoothness = json.wanderSmoothness ?? 0.7;
        module.wanderMinDistance = json.wanderMinDistance ?? 40;
        module.wanderDirectionBias = json.wanderDirectionBias ?? 0.6;
        module.wanderCurveAmount = json.wanderCurveAmount ?? 45;

        // Cornered Behavior
        module.corneredBehavior = json.corneredBehavior ?? 'flee';
        module.corneredDistance = json.corneredDistance ?? 80;
        module.corneredEscapeThreshold = json.corneredEscapeThreshold ?? 2;
        module.corneredAggressionBoost = json.corneredAggressionBoost ?? 0.8;
        module.corneredCourageBoost = json.corneredCourageBoost ?? 0.5;
        module.dropItemsWhenCornered = json.dropItemsWhenCornered ?? false;

        // Item Pickup Behavior
        module.itemPickupBehavior = json.itemPickupBehavior ?? 'opportunistic';
        module.weaponMemoryCapacity = json.weaponMemoryCapacity ?? 10;
        module.foodSourceMemoryCapacity = json.foodSourceMemoryCapacity ?? 10;

        // Debug
        module.debugDraw = json.debugDraw ?? false;
        module.debugShowState = json.debugShowState ?? false;
        module.debugShowMemory = json.debugShowMemory ?? false;
        module.debugShowDetection = json.debugShowDetection ?? false;
        module.debugShowNavigation = json.debugShowNavigation ?? false;

        module.retaliateWhenAttacked = json.retaliateWhenAttacked ?? true;
        module.retaliationDuration = json.retaliationDuration ?? 5.0;
        module.retaliateRegardlessOfTags = json.retaliateRegardlessOfTags ?? false;
        module.loseInterestWithoutLOS = json.loseInterestWithoutLOS ?? true;
        module.loseInterestTime = json.loseInterestTime ?? 3.0;

        // Ranged Combat / Gun Distance
        module.enableGunDistanceKeeping = json.enableGunDistanceKeeping ?? true;
        module.gunEngagementDistanceMin = json.gunEngagementDistanceMin ?? 150;
        module.gunEngagementDistanceMax = json.gunEngagementDistanceMax ?? 0;
        module.gunBackpedalSpeed = json.gunBackpedalSpeed ?? 0.8;
        module.gunStrafeChance = json.gunStrafeChance ?? 0.3;
        module.gunStrafeDistance = json.gunStrafeDistance ?? 60;
        module.gunStrafeSpeed = json.gunStrafeSpeed ?? 0.4;

        return module;
    }

    clone() {
        return ProceduralCreatureBrain.fromJSON(this.toJSON());
    }
}

window.ProceduralCreatureBrain = ProceduralCreatureBrain;
