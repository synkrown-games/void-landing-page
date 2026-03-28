class ProceduralCreature extends Module {
    static namespace = "Procedural";
    static allowMultiple = false;
    static color = "#2d1f3fff";

    static getIcon() {
        return '🐉';
    }
    
    static getDescription() {
        return 'Generates top-down view procedural creatures with IK locomotion';
    }

    constructor() {
        super();

        this.ignoreGameObjectTransform = false;

        // Body properties
        this.bodySegments = 3;
        this.segmentLength = 20;
        this.headSize = 25;
        this.bodyWidth = 18;
        this.tailTaper = 0.6;
        this.segmentSmoothing = 0.15;

        // Leg properties
        this.legPairs = 4;
        this.legSegments = 2;
        this.legLength = 35;
        this.legThickness = 4;
        this.legSpread = 45;
        this.legForwardOffset = 0.3;
        this.legRandomness = 0.15;
        this.legHipInset = 0.5; // How much hips are inset toward body center (0 = edge, 1 = center)

        // IK locomotion
        this.stepDistance = 40;
        this.stepHeight = 8;
        this.stepSpeed = 6;
        this.alternateLegs = true;
        
        // Enhanced leg behavior
        this.legBendStrength = 1.0; // How much legs bend at joints (0-2)
        this.legGroundingStrength = 0.5; // How firmly legs plant on ground when standing
        this.legAnticipation = true; // Legs reach forward when about to step
        this.keepFeetOnStop = true; // Keep feet where they are when stopped (vs stepping to rest)
        this.footGluingStrength = 0.95; // How firmly feet stay planted (0-1, higher = more glued)

        // Visual properties
        this.bodyColor = "#3a2f4a";
        this.legColor = "#2d2436";
        this.footColor = ""; // Optional foot color (uses accentColor if empty)
        this.accentColor = "#6b5a7d";
        this.showEyes = true;
        this.eyeCount = 2;
        this.eyeSize = 1.0; // Eye size multiplier (0.5-2.0)
        this.eyeStyle = "round"; // round, oval, slit, compound, glowing, dot, angry, cute
        this.showPupil = true; // Whether to show pupil
        this.pupilSize = 0.45; // Pupil size relative to eye (0.1-0.8)
        this.pupilColor = "#111111"; // Pupil color
        this.showJoints = true;

        // Isometric view
        this.isometricAngle = 0;
        this.bodyHeight = 0;
        
        // 2.5D mode
        this.enable25DMode = false;
        this.bodyElevation = 30; // How high body floats above ground

        // Depth / Parallax (fake 3D top-down)
        this.depthEnabled = false;
        this.depthIntensity = 0.15; // How much parts shift based on camera position
        this.maxDepthOffset = 20; // Maximum pixel offset
        this.headHeight = 1.0; // Head is highest (most parallax)
        this.bodyHeightDepth = 0.7; // Body segments height
        this.armHeightDepth = 0.5; // Arms/shoulders height  
        this.handHeightDepth = 0.25; // Hands height (between arms and ground)
        this.legHeightDepth = 0.0; // Legs are grounded (no parallax)

        // Movement
        this.moveSpeed = 80;
        this.targetObject = "";
        this.wanderRadius = 200;
        this.wanderWaitTime = 2;
        this.arrivalThreshold = 20;

        // Head look
        this.headLookEnabled = true;
        this.headLookRange = 150;
        this.headLookSpeed = 3;
        this.headLookObject = "interesting";
        this.headMaxTurnAngle = 72; // Max head turn in degrees relative to body

        // Body articulation
        this.bodyMaxTurnAngle = 0; // Max turn per segment in degrees (0 = free/unlimited)
        this.bodyTurnTaper = 1.0; // Taper scale along body (>1 = more flex at tail, <1 = less flex at tail)

        // Internal state
        this._segments = [];
        this._legs = [];
        this._arms = [];
        this._sparkParticles = []; // Spark particles from weapon/item collisions
        this._wanderTarget = null;
        this._wanderWaitTimer = 0;
        this._isWaiting = false;
        this._velocity = new Vector2(0, 0);
        this._knockbackVelocity = new Vector2(0, 0); // Separate knockback velocity (not derived from position changes)
        this._lastPosition = null; // For automatic velocity detection
        this._autoVelocityEnabled = true; // Automatically detect velocity from position changes
        this._headAngle = 0;
        this._headTargetAngle = 0;
        this._controllerFaceMouse = false; // True only when faceMouse is driving head (not lock-on targeting)

        // Body customization
        this.bodyShape = "ellipse"; // ellipse, circle, rectangle, triangle
        this.bodyScaleX = 1.0;
        this.bodyScaleY = 1.0;
        this.spinePattern = "none"; // none, spikes, plates, fur
        this.spineSize = 5;
        this.spineCount = 6;

        // Snake movement properties (body wave motion)
        this.enableSnakeWave = false; // Enable snake-like body wave even with legs
        this.snakeWaveAmplitude = 20; // How wide the S-curve is
        this.snakeWaveFrequency = 2.0; // How many waves along the body
        this.snakeWaveSpeed = 3.0; // How fast the wave propagates
        this._snakeWavePhase = 0; // Internal phase for wave animation

        // Leg customization
        this.legJointStyle = "smooth"; // smooth, angular, organic
        this.legTipShape = "circle"; // circle, claw, pad, hoof, spike, webbed, suction, pincer, talon, boot
        this.legOffsetVariation = 0.2; // Vertical offset randomness

        // Head customization
        this.headShape = "ellipse"; // ellipse, circle, triangle, rectangle, diamond, human, alien, bulbous, custom
        this.antennaCount = 0;
        this.antennaLength = 15;
        this.mandibles = false;
        
        // Custom head shape settings (when headShape = "custom")
        this.customHeadBackWidth = 0.5; // Back half width multiplier (0.1-1.0)
        this.customHeadFrontWidth = 0.4; // Front half width multiplier (0.1-1.0)
        this.customHeadBackCurve = 0.5; // Back tip smoothness (0 = pointed, 1 = rounded)
        this.customHeadFrontCurve = 0.5; // Front tip smoothness (0 = pointed, 1 = rounded)
        this.customHeadLength = 1.0; // Head length multiplier (extends back, 0.5-2.0)

        // Mouth style (replaces simple mandibles when using advanced mouth types)
        this.mouthStyle = "none"; // none, mandibles, squidTentacles, beak, proboscis, lamprey, pinchers
        this.mouthColor = "#6b5a7d";
        
        // Squid tentacles mouth properties (physics-based like ponytail)
        this.mouthTentacleCount = 4; // Number of tentacles (1-8)
        this.mouthTentacleLength = 25; // Total tentacle length
        this.mouthTentacleThickness = 4; // Base thickness
        this.mouthTentacleTaper = 0.7; // Taper amount (0 = no taper, 1 = point)
        this.mouthTentacleSegments = 6; // Physics segments per tentacle
        this.mouthTentacleSpread = 60; // Degrees of spread between outer tentacles
        this.mouthTentacleStiffness = 0.4; // Rigidity (0 = floppy/flowing, 1 = rigid)
        this.mouthTentacleSpring = 12; // Spring stiffness for physics (like ponytail)
        this.mouthTentacleDrag = 0.92; // Air resistance (like ponytail)
        this.mouthTentacleInertia = 80; // How much tentacles trail behind (like ponytail)
        this.mouthTentacleCollision = true; // Tentacles aware of each other for collision
        this.mouthTentacleAccentColor = ""; // Optional accent for tips
        this.mouthTentacleSuckers = false; // Show sucker details on tentacles
        this._mouthTentacleChains = []; // Physics chains for tentacles
        this._mouthTentacleGravityFactor = 1.0; // Gravity simulation factor

        // Spline body rendering
        this.splineBody = false; // Draw body as one smooth spline instead of individual segments
        this.splineBodyTension = 0.4; // Smoothness of the spline curve (0 = angular, 1 = very smooth)
        
        // Beak mouth properties
        this.beakLength = 15; // Length of the beak
        this.beakWidth = 10; // Width/opening of beak
        this.beakCurve = 0.3; // How curved the beak is (0 = straight, 1 = very curved)
        
        // Proboscis (mosquito/butterfly tube) properties
        this.proboscisLength = 30; // Length of the tube
        this.proboscisThickness = 2; // Thickness of tube
        this.proboscisCurl = 0; // Curl amount when retracted (0 = straight)
        
        // Lamprey mouth properties
        this.lampreyRadius = 12; // Radius of the circular mouth
        this.lampreyTeethRings = 2; // Rings of teeth
        this.lampreyTeethCount = 8; // Teeth per ring
        
        // Pincher mouth properties (like ant/beetle)
        this.pincherLength = 12; // Length of pinchers
        this.pincherCurve = 0.4; // Inward curve amount
        this.pincherGap = 8; // Gap between pinchers
        
        // Internal mouth physics state
        this._mouthTentacleChains = []; // Array of physics chains for each tentacle

        // Hand/claw customization
        this.armTipShape = "circle"; // circle, claw, hand, fist, tentacle, hook, blade, paw, mitten, sucker, pincer, stump, spike, webbed, bone, flame, crystal
        this.armTipSize = 1.5; // Multiplier for tip size
        this.clawLength = 8; // Length of claw protrusions
        this.fingerCount = 3; // Number of fingers for hand shape
        this.fingerSpread = 30; // Degrees of finger spread

        // Head decorations
        this.hairStyle = "none"; // none, spiky, ponytail, mohawk, long, curly
        this.hairLength = 20;
        this.hairThickness = 2;
        this.hairColor = "#6b5a7d";
        this.hairCount = 5; // Number of hair strands/spikes
        this.ponytailLength = 30;
        this.ponytailBounce = true; // Animated ponytail
        this.ponytailSegments = 5; // Number of physics joints in ponytail
        this.ponytailDrag = 0.92; // Air resistance (0-1, higher = more drag)
        this.ponytailSpring = 12; // Spring stiffness for segments
        this.ponytailInertia = 80; // How much ponytail trails behind movement (top-down "gravity")
        this.ponytailThickness = 4; // Base thickness at root
        this.ponytailTaper = 0.7; // How much to taper (0 = no taper, 1 = full taper to point)
        this.ponytailAccentColor = "#8b7a9d"; // Accent color for alternating segments
        this._ponytailChain = []; // Physics chain for ponytail segments
        this.headAccessory = "none"; // none, horns, ears, crown, tusks, crest, frills, fangs, snout, beak, whiskers, spikes
        this.accessorySize = 15;
        this.accessoryColor = "#6b5a7d";

        this._ponytailAngle = 0;
        this._ponytailVelocity = 0;

        // Tail properties
        this.tailEnabled = false;
        this.tailSegments = 5; // Number of tail chain segments
        this.tailLength = 40; // Total tail length
        this.tailThickness = 6; // Base thickness at root
        this.tailTaperAmount = 0.85; // How much the tail tapers (0 = uniform, 1 = full taper to point)
        this.tailColor = "#3a2f4a"; // Tail color (defaults to body color)
        this.tailTipColor = ""; // Optional accent color for tail tip

        // Tail physics
        this.tailSpring = 22; // Spring stiffness pulling tail segments toward rest
        this.tailDamping = 0.78; // Velocity damping (0-1, higher = more damping / less whip)
        this.tailElasticity = 0.75; // How elastic/bouncy the tail is (0 = stiff, 1 = very elastic)
        this.tailInertia = 120; // How much the tail trails behind movement (higher = more drag)
        this.tailStiffness = 0.3; // Resistance to bending (0 = floppy, 1 = rigid)

        // Tail waving / wagging
        this.tailWaveEnabled = false; // Enable automatic tail waving/wagging
        this.tailWaveSpeed = 3.0; // Oscillation speed (cycles per second)
        this.tailWaveAmplitude = 25; // Max angle of wave in degrees
        this.tailWaveSpeedVariation = 0.3; // Random speed variation per cycle
        this.tailWaveCascade = true; // Wave cascades down tail (vs all segments in sync)
        this.tailWaveCascadeDelay = 0.15; // Phase delay per segment when cascading
        this.tailWaveIdleOnly = false; // Only wave when creature is idle/stopped

        // Tail leg redistribution
        this.tailBodyPercent = 0; // Percentage of back-half body that is "tail" (0-100)
        // 0% = legs distributed normally, 100% = all legs crammed to front segment

        // Tail internal state
        this._tailChain = []; // Physics chain for tail segments [{pos, angle, velocity}]
        this._tailWavePhase = 0; // Current wave phase

        // Offscreen canvas caching for static parts (head + body segments)
        this._headCache = null; // { canvas, width, height, originX, originY }
        this._segmentCaches = []; // array of { canvas, width, height, originX, originY } per segment index
        this._cacheKey = ''; // serialized visual properties — rebuild cache when this changes

        // Arm properties
        this.armCount = 2;
        this.armLength = 30;
        this.armThickness = 3;
        this.armSegments = 2;
        this.armReachRange = 100;
        this.armReachSpeed = 4;
        this.armColor = "#2d2436";
        this.armSpringStiffness = 500; // How strongly arms return to rest position
        this.armSpringDamping = 0.2; // How much the spring motion is dampened (0-1)
        this.armRestForwardDistance = 0.8; // How far forward arms rest (0-1 of arm length)
        this.armRestOutwardAngle = 17; // Degrees outward from forward direction
        this.armStrength = 1.0; // Resistance to item weight pull during swings (0.1 = weak, 5 = very strong)

        // Arm animation states
        this.punchSpeed = 8; // Speed of punch animation
        this.punchWindupDistance = 0.3; // How far back to wind up (0-1)
        this.punchReachDistance = 1.2; // How far forward to reach (multiplier of arm length)
        this.punchArcAmount = 25; // Degrees of arc during punch
        this.punchCrossBody = true; // Punch-Out!! style: punch crosses to opposite side
        this.punchCrossAmount = 0.6; // How far across body the punch goes (0-1)
        this.grabSpeed = 5; // Speed of grab animation
        this.grabHoldTime = 0.5; // How long to hold the grab
        this.punchCooldown = 0.15; // Minimum seconds between consecutive arm attacks

        // Gun arm aiming — arms holding guns aim toward mouse or forward
        this.gunArmAiming = true; // When true, arms holding guns point forward / toward mouse
        this.gunAimMaxAngle = 120; // Maximum degrees arms can aim from forward direction
        this.gunCrossBodyAngleLimit = 45; // Maximum degrees arm can aim across body (prevents unrealistic cross-aiming)
        
        // Weapon swing overshoot - momentum carries weapon past target
        this.swingOvershootAmount = 1.0; // Multiplier for follow-through momentum (0.5 = subtle, 2.0 = dramatic)
        
        // Punch combo system
        this._comboArmIndex = 0; // Current arm in combo sequence
        this._lastPunchTime = 0; // Time of last punch
        this._comboWindow = 0.4; // Seconds to chain punches
        
        // Headbutt attack state (for creatures without arms)
        this._isHeadbutting = false;
        this._headbuttTime = 0;
        this._headbuttAngle = 0;
        this._headbuttPhase = null;
        this._headbuttOffset = 0;
        this._headbuttHitTargets = new Set();
        this._lastHeadbuttTime = 0;

        // Arm movement animation
        this.armSwingSpeed = 2.5; // Speed of arm swing when moving
        this.armSwingAmount = 15; // Degrees of swing per arm when moving
        this.armSwingEnabled = true; // Enable/disable arm swing animation

        // Movement patterns
        this.movementStyle = "none"; // wander, circle, zigzag, patrol
        this.turnSpeed = 180; // degrees per second
        this.acceleration = 300;

        this.accentColor = "#6b5a7d";
        this.eyeColor = "#ffffff";
        this.antennaColor = "#6b5a7d";
        this.mandibleColor = "#6b5a7d";
        this.spineColor = "#6b5a7d";
        this.showEyes = true;

        this.footAngleOffset = 0; // Degrees to rotate feet outward (left feet +, right feet -)

        // Eye extrusion (stalked eyes like crabs)
        this.eyeExtrudeDistance = 0; // How far eyes extend from head (0 = flush)
        this.eyeExtrudeThickness = 2; // Thickness of the eye stalks

        // Shadow properties
        this.showShadow = true;
        this.shadowOpacity = 0.3;
        this.shadowBlur = 15;
        this.shadowOffsetX = 3;
        this.shadowOffsetY = 5;
        this.shadowColor = "#000000";

        // Directional arrow indicator (shows facing direction)
        this.showDirectionalArrow = false;
        this.directionalArrowColor = "#4a90d9";
        this.directionalArrowHealthColor = false; // When true, color based on health (green→red)
        this.directionalArrowOutlineColor = "#ffffff";
        this.directionalArrowOutlineWidth = 2;
        this.directionalArrowOpacity = 0.6;
        this.directionalArrowSize = 1.0; // Scale multiplier
        this.directionalArrowOffset = 0; // Distance ahead of head (can be negative)

        // Target reticle (shown when this creature is being targeted)
        this.showTargetReticle = true; // Whether to show reticle when targeted
        this.targetReticleColor = "#ff4444";
        this.targetReticleOutlineColor = "#ffffff";
        this.targetReticleOutlineWidth = 2;
        this.targetReticleOpacity = 0.7;
        this.targetReticleSize = 1.0; // Scale multiplier
        this.targetReticleSpinSpeed = 90; // Degrees per second
        this.targetReticlePulseSpeed = 2.0; // Pulses per second
        this.targetReticlePulseAmount = 0.15; // Scale variation (0-0.5)
        this.targetReticleSegments = 4; // Number of arc segments in the reticle
        this._isBeingTargeted = false; // Internal: set by other creatures when targeting this one
        this._targetReticlePhase = 0; // Internal: animation phase
        this._targetingCreature = null; // Internal: reference to creature targeting this one

        // Breathing animation (secondary idle motion)
        this.breathingEnabled = true;
        this.breathingSpeed = 0.5; // Cycles per second
        this.breathingAmount = 0.08; // Scale variation (0-0.3)
        this.breathingAsync = true; // Different segments breathe at different phases
        this._breathingPhase = 0; // Internal phase tracker

        // Creature scale (applied to all dimensions)
        this.creatureScale = 1.0;

        // Grab range for picking up items
        this.grabRange = 60;

        // Health & Combat
        this.maxHealth = 100;
        this.health = 100;
        this.armor = 0; // Flat damage reduction
        this.isInvulnerable = false;
        this._damageFlashTimer = 0;
        this._lastDamageSource = null;
        this._lastDamageTime = 0;

        this.friendlyFire = false; // Whether this creature's attacks can hit creatures with matching tags
        this.bloodPrefab = ''; // Prefab to spawn when this creature takes damage (blood effect)
        this.punchDamage = 4; // Damage dealt by bare-fist punches (no weapon)
        this.punchKnockback = 30; // Knockback force for bare-fist punches

        // Punch hit tracking (prevents multi-hitting same target in one punch)
        this._punchHitTargets = new Set();

        // Weapon/Hand collision settings (works with BoxCollider, CircleCollider, PolygonCollider)
        this.weaponSolidCollision = true; // Held weapons OR bare hands collide with solid colliders
        this.weaponWeaponCollision = true; // Held weapons from different creatures collide (sword fights)
        this.weaponCollisionSolidTag = "solid"; // Tag for solid objects (empty = all non-trigger colliders)
        this.weaponCollisionSearchRadius = 200; // Search radius for weapon/hand collisions
        this.weaponCollisionBounce = 0.6; // Bounce factor on attack collision (idle slides smoothly)
        this.backswingDamageMultiplier = 0.4; // Damage multiplier when hitting during followthrough (backswing)

        // Foot collision settings (prevents feet from passing through solid colliders)
        this.constrainFeet = true; // Prevent creature feet from overlapping solid colliders
        this.footCollisionRadius = 4; // Radius to use for foot collision checks
        this.footCollisionSolidTag = "solid"; // Tag to identify solid objects for foot collision
        this.footCollisionSearchRadius = 200; // Only check objects within this radius (performance)

        // Targeting system (autonomous creature targeting)
        this.targetingEnabled = false; // Master toggle for autonomous targeting
        this.targetingEnemyTag = "enemy"; // Comma-separated tags of hostile targets
        this.targetingFriendlyTag = "friendly"; // Comma-separated tags to exclude
        this.targetingRange = 250; // Detection range for finding targets
        this.targetingTurnSpeed = 120; // Degrees per second to face target (large = slow)
        this.targetingHeadLook = true; // Head tracks the target
        this.targetingFacebody = true; // Body turns to face the target
        this.gunAccuracy = 0; // Aim accuracy for guns (0 = no lead prediction, 1 = perfect lead prediction)

        // ═══════════════════════════════════════════════════════════════
        // WORM DIG MODE
        // ═══════════════════════════════════════════════════════════════
        this.wormDigEnabled = false;          // Master toggle for dig/burrow behavior
        this.wormBurrowSpeed = 2.5;           // Segments buried/revealed per second
        this.wormSurfacePercent = 0;          // 0 = fully underground, 1 = fully above (0–1)
        this.wormAutoSurface = true;          // Randomly surface to attack
        this.wormAutoSurfaceInterval = [4, 10]; // [min, max] seconds between random surfaces
        this.wormSurfaceHoldTime = 3.5;       // Seconds to stay above ground before re-burrowing
        this.wormAttackOnSurface = true;      // Auto-attack nearest enemy when surfacing

        // Visual — underground indicator particles
        this.wormParticleColor = "#8B6914";
        this.wormParticleAccentColor = "#5a4010";
        this.wormParticleCount = 8;           // Particles per burst
        this.wormParticleSize = 5;
        this.wormParticleSpeed = 60;
        this.wormParticleLifetime = 0.6;
        this.wormParticleSpread = 140;        // Degrees of spread for dirt particles
        this.wormShowUndergroundIndicator = true; // Show ripple/trail while underground
        this.wormIndicatorColor = "#6B4F10";
        this.wormIndicatorOpacity = 0.45;
        this.wormIndicatorSize = 1.0;         // Scale of the underground ripple indicator

        // Internal worm dig state
        this._wormState = 'above';            // 'above' | 'burrowing' | 'underground' | 'surfacing'
        this._wormSegmentVisibility = [];     // Per-segment 0–1 visibility (1=fully visible)
        this._wormNextSurfaceTimer = 0;       // Countdown to next auto-surface
        this._wormHoldTimer = 0;             // Time spent above ground
        this._wormDirtParticles = [];        // Active dirt particle objects
        this._wormIndicatorPhase = 0;        // Phase for underground ripple animation
        this._wormIsProtected = false;       // True when head is underground (invulnerable)
        this._wormManualControl = false;     // True when burrow/surface called manually

        // Targeting internal state
        this._targetingTarget = null; // Currently targeted game object
        this._targetingSearchTimer = 0; // Avoid scanning every frame

        this.isDead = false;
        this.decayTimer = 0;
        this.decayMaxTime = 30.0; // 30 seconds to fully decay

        // Swing hit tracking (prevents multi-hitting same target in one swing)
        this._swingHitTargets = new Set();
        this.deathPositions = null; // Store segment positions at death
        this.deathAngles = null; // Store segment angles at death
        this.originalScale = 1.0;

        // TDTD (TopDownThreeD) rendering
        this.tdtdEnabled = false;
        this.tdtdZ = 0;           // Z position in the fake 3D world
        this.tdtdAnchorY = 1.0;   // Billboard anchor Y (0=top, 1=bottom)

        // Offscreen canvas for TDTD rendering
        this._tdtdCanvas = null;
        this._tdtdCtx = null;

        this.generateRandomCreatureBoolean = false;

        this._initializeCreature();
    }

    /**
     * Property metadata for the inspector
     * @returns {Array} Property definitions
     */
    getPropertyMetadata() {
        return [
            // ═══════════════════════════════════════════════════════════════
            // 🎭 CREATURE PRESETS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎭 Presets MKI' },
                { type: 'hint', hint: 'Click a preset to configure the creature as that type' },
                { type: 'button', label: '🧍 Human', buttonStyle: 'primary', action: 'applyPresetHuman', tooltip: 'Bipedal humanoid with arms' },
                { type: 'button', label: '🕷️ Spider', buttonStyle: 'primary', action: 'applyPresetSpider', tooltip: '8-legged arachnid' },
                { type: 'button', label: '🐛 Centipede', buttonStyle: 'primary', action: 'applyPresetCentipede', tooltip: 'Long body with many legs' },
                { type: 'button', label: '🦎 Lizard', buttonStyle: 'primary', action: 'applyPresetLizard', tooltip: '4-legged reptile with tail' },
                { type: 'button', label: '🐜 Ant', buttonStyle: 'primary', action: 'applyPresetAnt', tooltip: '6-legged insect with antennae' },
                { type: 'button', label: '🦀 Crab', buttonStyle: 'primary', action: 'applyPresetCrab', tooltip: 'Wide body with claws' },
                //{ type: 'button', buttonText: '🐍 Snake', buttonStyle: 'primary', action: 'applyPresetSnake', tooltip: 'Legless serpent' },
                { type: 'button', label: '🦑 Octopus', buttonStyle: 'primary', action: 'applyPresetOctopus', tooltip: '8 tentacle arms' },
                { type: 'button', label: '🐕 Dog', buttonStyle: 'primary', action: 'applyPresetDog', tooltip: '4-legged quadruped' },
                { type: 'button', label: '🐈 Cat', buttonStyle: 'primary', action: 'applyPresetCat', tooltip: 'Agile feline' },
                { type: 'button', label: '🦂 Scorpion', buttonStyle: 'primary', action: 'applyPresetScorpion', tooltip: 'Arachnid with claws and tail' },
                { type: 'button', label: '🐦 Bird', buttonStyle: 'primary', action: 'applyPresetBird', tooltip: 'Small hopping bird' },
                //{ type: 'button', buttonText: '🪱 Worm', buttonStyle: 'primary', action: 'applyPresetWorm', tooltip: 'Segmented crawling worm' },
                { type: 'button', label: '🪲 Beetle', buttonStyle: 'primary', action: 'applyPresetBeetle', tooltip: 'Armored beetle with shell' },
                { type: 'button', label: '🪼 Jellyfish', buttonStyle: 'primary', action: 'applyPresetJellyfish', tooltip: 'Floating with tentacles' },
                { type: 'button', label: '🐉 Dragon', buttonStyle: 'primary', action: 'applyPresetDragon', tooltip: 'Winged mythical beast' },
                { type: 'button', label: '🐸 Frog', buttonStyle: 'primary', action: 'applyPresetFrog', tooltip: 'Compact amphibian with bulging eyes' },
                { type: 'button', label: '🦗 Mantis', buttonStyle: 'primary', action: 'applyPresetMantis', tooltip: 'Stalking predator with raptorial arms' },
                { type: 'button', label: '🐺 Wolf', buttonStyle: 'primary', action: 'applyPresetWolf', tooltip: 'Powerful pack predator' },
                { type: 'button', label: '🐢 Turtle', buttonStyle: 'primary', action: 'applyPresetTurtle', tooltip: 'Armored slow reptile with shell' },
                { type: 'button', label: '🦟 Mosquito', buttonStyle: 'primary', action: 'applyPresetMosquito', tooltip: 'Tiny buzzing insect' },
                { type: 'button', label: '🐊 Crocodile', buttonStyle: 'primary', action: 'applyPresetCrocodile', tooltip: 'Massive armored reptile' },
                { type: 'button', label: '🦞 Lobster', buttonStyle: 'primary', action: 'applyPresetLobster', tooltip: 'Armored crustacean with big claws' },
                { type: 'button', label: '🤖 Robot Spider', buttonStyle: 'primary', action: 'applyPresetRobotSpider', tooltip: 'Mechanical 8-legged robot' },
                { type: 'button', label: '🦾 Robot Human', buttonStyle: 'primary', action: 'applyPresetRobotHuman', tooltip: 'Bipedal humanoid robot' },
                { type: 'button', label: '⚙️ Robot Mech', buttonStyle: 'primary', action: 'applyPresetRobotMech', tooltip: 'Heavy armored mech unit' },
            { type: 'groupEnd' },

            
            { type: 'groupStart', label: '🎭 Presets MKII' },
                { type: 'hint', hint: 'Click a preset to configure the creature as that type' },
                { type: 'button', label: '🦖 T-Rex', buttonStyle: 'primary', action: 'applyPresetTRex', tooltip: 'Massive bipedal apex predator' },
                { type: 'button', label: '🦕 Brachiosaurus', buttonStyle: 'primary', action: 'applyPresetBrachiosaurus', tooltip: 'Giant long-necked sauropod' },
                { type: 'button', label: '🔱 Triceratops', buttonStyle: 'primary', action: 'applyPresetTriceratops', tooltip: 'Armored horned quadruped' },
                { type: 'button', label: '🗡️ Raptor', buttonStyle: 'primary', action: 'applyPresetRaptor', tooltip: 'Fast feathered pack hunter' },
                { type: 'button', label: '🛡️ Ankylosaurus', buttonStyle: 'primary', action: 'applyPresetAnkylosaurus', tooltip: 'Living tank with club tail' },
                { type: 'button', label: '🌋 Stegosaurus', buttonStyle: 'primary', action: 'applyPresetStegosaurus', tooltip: 'Plated dinosaur with spiked tail' },
                { type: 'button', label: '🦅 Pterosaur', buttonStyle: 'primary', action: 'applyPresetPterosaur', tooltip: 'Winged flying reptile' },
                { type: 'button', label: '👽 Alien Biped', buttonStyle: 'primary', action: 'applyPresetAlienBiped', tooltip: 'Tall slender grey alien' },
                { type: 'button', label: '🐛 Alien Insectoid', buttonStyle: 'primary', action: 'applyPresetAlienInsectoid', tooltip: 'Chitinous hive-mind warrior' },
                { type: 'button', label: '🐙 Alien Tentacled', buttonStyle: 'primary', action: 'applyPresetAlienTentacled', tooltip: 'Lovecraftian floating horror' },
                { type: 'button', label: '🐆 Alien Quadruped', buttonStyle: 'primary', action: 'applyPresetAlienQuadruped', tooltip: 'Bioluminescent alien predator' },
                { type: 'button', label: '🦀 Alien Crustacean', buttonStyle: 'primary', action: 'applyPresetAlienCrustacean', tooltip: 'Armored multi-limbed alien tank' },
                { type: 'button', label: '🪱 Alien Worm', buttonStyle: 'primary', action: 'applyPresetAlienWorm', tooltip: 'Massive burrowing alien worm' },
                { type: 'button', label: '💀 Alien Swarmer', buttonStyle: 'primary', action: 'applyPresetAlienSwarmer', tooltip: 'Tiny fast aggressive swarm unit' },
                { type: 'button', label: '🦋 Alien Floater', buttonStyle: 'primary', action: 'applyPresetAlienFloater', tooltip: 'Gas-bag manta ray floater' },
                { type: 'button', label: '🕷️ Parasite', buttonStyle: 'primary', action: 'applyPresetParasite', tooltip: 'Face-hugger gripping horror' },
                { type: 'button', label: '🐛 Giant Centipede', buttonStyle: 'primary', action: 'applyPresetGiantCentipede', tooltip: 'Massive dungeon boss arthropod' },
                { type: 'button', label: '😈 Goblin', buttonStyle: 'primary', action: 'applyPresetGoblin', tooltip: 'Mischievous hunched fantasy creature' },
                { type: 'button', label: '👿 Demon Lord', buttonStyle: 'primary', action: 'applyPresetDemonLord', tooltip: 'Massive winged dark fantasy boss' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ⚙️ GENERAL SETTINGS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '⚙️ General Settings' },
                { key: 'ignoreGameObjectTransform', label: 'Ignore GameObject Transform', type: 'boolean', hint: 'When enabled, creature ignores parent transform' },
                { key: 'creatureScale', label: 'Creature Scale', type: 'slider', min: 0.1, max: 1, step: 0.05, hint: 'Scales all creature dimensions (body, legs, arms, head)' },
                { key: 'grabRange', label: 'Grab Range', type: 'number', min: 10, max: 200, hint: 'How far the creature can reach to grab items' },
                { key: 'generateRandomCreatureBoolean', label: 'Generate Random Creature', type: 'boolean', hint: 'Randomize all creature properties on creation' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🦴 BODY STRUCTURE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🦴 Body Structure' },
                { key: 'bodySegments', label: 'Body Segments', type: 'number', min: 1, max: 20, hint: 'Number of segments in the body chain' },
                { key: 'segmentLength', label: 'Segment Length', type: 'number', min: 1, max: 100, hint: 'Distance between each segment' },
                { key: 'segmentSmoothing', label: 'Segment Smoothing', type: 'slider', min: 0, max: 1, step: 0.01, hint: 'How smoothly segments follow each other' },
                { key: 'headSize', label: 'Head Size', type: 'number', min: 1, max: 100, hint: 'Size of the head segment' },
                { key: 'bodyWidth', label: 'Body Width', type: 'number', min: 1, max: 100, hint: 'Width of the body segments' },
                { key: 'tailTaper', label: 'Tail Taper', type: 'slider', min: 0, max: 1, step: 0.01, hint: 'How much the body tapers towards the tail' },
                { key: 'bodyHeight', label: 'Body Height', type: 'number', min: 0, max: 100, hint: 'Height offset for isometric view' },

                // Body Shape Customization (nested)
                { type: 'groupStart', label: '📐 Body Shape' },
                    { key: 'bodyShape', label: 'Shape', type: 'select', options: ['ellipse', 'circle', 'rectangle', 'triangle'], hint: 'Base shape of body segments' },
                    { key: 'bodyScaleX', label: 'Scale X', type: 'slider', min: 0.1, max: 2, step: 0.01, hint: 'Horizontal scale of body' },
                    { key: 'bodyScaleY', label: 'Scale Y', type: 'slider', min: 0.1, max: 2, step: 0.01, hint: 'Vertical scale of body' },
                { type: 'groupEnd' },

                // Spine Decorations (nested)
                { type: 'groupStart', label: '🦔 Spines & Plates' },
                    { key: 'spinePattern', label: 'Pattern', type: 'select', options: ['none', 'spikes', 'plates', 'fur'], hint: 'Decorations along the spine' },
                    { key: 'spineCount', label: 'Count', type: 'number', min: 0, max: 20, showIf: { spinePattern: ['spikes', 'plates', 'fur'] } },
                    { key: 'spineSize', label: 'Size', type: 'number', min: 1, max: 30, showIf: { spinePattern: ['spikes', 'plates', 'fur'] } },
                    { key: 'spineColor', label: 'Color', type: 'color', showIf: { spinePattern: ['spikes', 'plates', 'fur'] } },
                { type: 'groupEnd' },

                { type: 'groupStart', label: '〰️ Spline Body' },
                    { key: 'splineBody', label: 'Enable Spline Body', type: 'boolean', hint: 'Draw the whole body as one smooth continuous shape instead of separate segments' },
                    { key: 'splineBodyTension', label: 'Spline Tension', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { splineBody: true }, hint: '0 = angular/tight, 1 = very smooth/loose' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 👤 HEAD & FACE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '👤 Head & Face' },
                { key: 'headShape', label: 'Head Shape', type: 'select', options: ['ellipse', 'circle', 'triangle', 'rectangle', 'diamond', 'human', 'alien', 'bulbous', 'custom'] },
                
                // Custom Head Settings (nested, only shown when headShape is 'custom')
                { type: 'groupStart', label: '⚙️ Custom Head Settings', showIf: { headShape: 'custom' } },
                    { key: 'customHeadLength', label: 'Head Length', type: 'slider', min: 0.5, max: 2.0, step: 0.05, hint: 'Length of head (extends back)' },
                    { key: 'customHeadBackWidth', label: 'Back Width', type: 'slider', min: 0.1, max: 1.0, step: 0.05, hint: 'Width of back half of head' },
                    { key: 'customHeadFrontWidth', label: 'Front Width', type: 'slider', min: 0.1, max: 1.0, step: 0.05, hint: 'Width of front half of head' },
                    { key: 'customHeadBackCurve', label: 'Back Smoothness', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = pointed, 1 = rounded' },
                    { key: 'customHeadFrontCurve', label: 'Front Smoothness', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = pointed, 1 = rounded' },
                { type: 'groupEnd' },

                // Eyes (nested)
                { type: 'groupStart', label: '👁️ Eyes' },
                    { key: 'showEyes', label: 'Show Eyes', type: 'boolean' },
                    { key: 'eyeCount', label: 'Eye Count', type: 'number', min: 0, max: 8, showIf: { showEyes: true } },
                    { key: 'eyeStyle', label: 'Eye Style', type: 'select', options: ['round', 'oval', 'slit', 'compound', 'glowing', 'dot', 'angry', 'cute'], showIf: { showEyes: true }, hint: 'Visual style of the eyes' },
                    { key: 'eyeSize', label: 'Eye Size', type: 'slider', min: 0.5, max: 2.0, step: 0.05, showIf: { showEyes: true }, hint: 'Size multiplier for eyes' },
                    { key: 'eyeColor', label: 'Eye Color', type: 'color', showIf: { showEyes: true } },
                    { key: 'showPupil', label: 'Show Pupil', type: 'boolean', showIf: { showEyes: true } },
                    { key: 'pupilSize', label: 'Pupil Size', type: 'slider', min: 0.1, max: 0.8, step: 0.05, showIf: (m) => m.showEyes && m.showPupil, hint: 'Size of pupil relative to eye' },
                    { key: 'pupilColor', label: 'Pupil Color', type: 'color', showIf: (m) => m.showEyes && m.showPupil },
                    { key: 'eyeExtrudeDistance', label: 'Stalk Length', type: 'number', min: 0, max: 40, showIf: { showEyes: true }, hint: 'How far eyes extend outward on stalks (0 = flush)' },
                    { key: 'eyeExtrudeThickness', label: 'Stalk Thickness', type: 'number', min: 1, max: 8, showIf: (m) => m.showEyes && m.eyeExtrudeDistance > 0, hint: 'Thickness of the eye stalks' },
                { type: 'groupEnd' },

                // Antennae (nested)
                { type: 'groupStart', label: '📡 Antennae' },
                    { key: 'antennaCount', label: 'Count', type: 'number', min: 0, max: 6 },
                    { key: 'antennaLength', label: 'Length', type: 'number', min: 5, max: 50, showIf: (m) => m.antennaCount > 0 },
                    { key: 'antennaColor', label: 'Color', type: 'color', showIf: (m) => m.antennaCount > 0 },
                { type: 'groupEnd' },

                // Mandibles (nested - legacy, use Mouth Style for more options)
                { type: 'groupStart', label: '🦷 Mandibles (Legacy)' },
                    { key: 'mandibles', label: 'Show Mandibles', type: 'boolean', hint: 'Simple mandibles. Use Mouth Style for more options.' },
                    { key: 'mandibleColor', label: 'Color', type: 'color', showIf: { mandibles: true } },
                { type: 'groupEnd' },

                // Mouth Style (advanced mouth options)
                { type: 'groupStart', label: '👄 Mouth Style' },
                    { key: 'mouthStyle', label: 'Style', type: 'select', options: ['none', 'squidTentacles', 'beak', 'proboscis', 'lamprey', 'pinchers'], hint: 'Advanced mouth types with physics' },
                    { key: 'mouthColor', label: 'Color', type: 'color', showIf: (m) => m.mouthStyle !== 'none' },
                    
                    // Squid Tentacles options
                    { type: 'groupStart', label: '🦑 Squid Tentacles', showIf: { mouthStyle: 'squidTentacles' } },
                        { key: 'mouthTentacleCount', label: 'Count', type: 'number', min: 1, max: 8, hint: 'Number of tentacles' },
                        { key: 'mouthTentacleLength', label: 'Length', type: 'number', min: 5, max: 60, hint: 'Total tentacle length' },
                        { key: 'mouthTentacleThickness', label: 'Thickness', type: 'number', min: 1, max: 10, hint: 'Base thickness' },
                        { key: 'mouthTentacleTaper', label: 'Taper', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Taper to point' },
                        { key: 'mouthTentacleSegments', label: 'Segments', type: 'number', min: 3, max: 10, hint: 'Physics segments per tentacle' },
                        { key: 'mouthTentacleSpread', label: 'Spread', type: 'number', min: 10, max: 90, hint: 'Degrees between outer tentacles' },
                        { key: 'mouthTentacleStiffness', label: 'Stiffness', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = floppy, 1 = rigid' },
                        { key: 'mouthTentacleSpring', label: 'Spring', type: 'number', min: 5, max: 40, hint: 'Spring force' },
                        { key: 'mouthTentacleDrag', label: 'Drag', type: 'slider', min: 0.7, max: 0.98, step: 0.01, hint: 'Air resistance' },
                        { key: 'mouthTentacleInertia', label: 'Inertia', type: 'number', min: 10, max: 150, hint: 'Trail behind movement' },
                        { key: 'mouthTentacleCollision', label: 'Self Collision', type: 'boolean', hint: 'Tentacles push apart' },
                        { key: 'mouthTentacleAccentColor', label: 'Tip Color', type: 'color', hint: 'Optional accent for tips' },
                        { key: 'mouthTentacleSuckers', label: 'Show Suckers', type: 'boolean', hint: 'Sucker details' },
                    { type: 'groupEnd' },
                    
                    // Beak options
                    { type: 'groupStart', label: '🐦 Beak', showIf: { mouthStyle: 'beak' } },
                        { key: 'beakLength', label: 'Length', type: 'number', min: 5, max: 40 },
                        { key: 'beakWidth', label: 'Width', type: 'number', min: 3, max: 25 },
                        { key: 'beakCurve', label: 'Curve', type: 'slider', min: 0, max: 1, step: 0.05, hint: '0 = straight, 1 = curved' },
                    { type: 'groupEnd' },
                    
                    // Proboscis options
                    { type: 'groupStart', label: '🦟 Proboscis', showIf: { mouthStyle: 'proboscis' } },
                        { key: 'proboscisLength', label: 'Length', type: 'number', min: 10, max: 60 },
                        { key: 'proboscisThickness', label: 'Thickness', type: 'number', min: 1, max: 6 },
                        { key: 'proboscisCurl', label: 'Curl', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Coil when retracted' },
                    { type: 'groupEnd' },
                    
                    // Lamprey options
                    { type: 'groupStart', label: '🔴 Lamprey', showIf: { mouthStyle: 'lamprey' } },
                        { key: 'lampreyRadius', label: 'Radius', type: 'number', min: 5, max: 30 },
                        { key: 'lampreyTeethRings', label: 'Teeth Rings', type: 'number', min: 1, max: 4 },
                        { key: 'lampreyTeethCount', label: 'Teeth Per Ring', type: 'number', min: 4, max: 16 },
                    { type: 'groupEnd' },
                    
                    // Pinchers options
                    { type: 'groupStart', label: '🪲 Pinchers', showIf: { mouthStyle: 'pinchers' } },
                        { key: 'pincherLength', label: 'Length', type: 'number', min: 5, max: 30 },
                        { key: 'pincherCurve', label: 'Curve', type: 'slider', min: 0, max: 1, step: 0.05 },
                        { key: 'pincherGap', label: 'Gap', type: 'number', min: 2, max: 20 },
                    { type: 'groupEnd' },
                { type: 'groupEnd' },

                // Head Look (nested)
                { type: 'groupStart', label: '👀 Head Tracking' },
                    { key: 'headLookEnabled', label: 'Enabled', type: 'boolean', hint: 'Head follows target objects' },
                    { key: 'headLookObject', label: 'Look At Tags', type: 'text', showIf: { headLookEnabled: true }, hint: 'Comma-separated tags of objects to look at (finds nearest in range)' },
                    { key: 'headLookRange', label: 'Range', type: 'number', min: 10, max: 500, showIf: { headLookEnabled: true } },
                    { key: 'headLookSpeed', label: 'Speed', type: 'number', min: 0.1, max: 20, showIf: { headLookEnabled: true } },
                    { key: 'headMaxTurnAngle', label: 'Max Head Turn', type: 'number', min: 1, max: 180, hint: 'Max head rotation in degrees relative to body' },
                { type: 'groupEnd' },

                // Body Articulation (nested)
                { type: 'groupStart', label: '🔗 Body Articulation' },
                    { key: 'bodyMaxTurnAngle', label: 'Max Segment Turn', type: 'number', min: 0, max: 90, hint: 'Max turn per body segment in degrees (0 = unlimited)' },
                    { key: 'bodyTurnTaper', label: 'Turn Taper', type: 'slider', min: 0.1, max: 3, step: 0.01, hint: '>1 = more flex at tail, <1 = less flex at tail' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 💇 HAIR & ACCESSORIES
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💇 Hair & Accessories' },
                // Hair (nested)
                { type: 'groupStart', label: '💈 Hair Style' },
                    { key: 'hairStyle', label: 'Style', type: 'select', options: ['none', 'spiky', 'ponytail', 'mohawk', 'long', 'curly', 'buzz', 'afro', 'slicked', 'short', 'bald_top'] },
                    { key: 'hairCount', label: 'Strand Count', type: 'number', min: 1, max: 20, showIf: (m) => m.hairStyle !== 'none' && m.hairStyle !== 'buzz' && m.hairStyle !== 'afro' && m.hairStyle !== 'bald_top' },
                    { key: 'hairLength', label: 'Length', type: 'number', min: 5, max: 100, showIf: (m) => m.hairStyle !== 'none' },
                    { key: 'hairThickness', label: 'Thickness', type: 'number', min: 1, max: 10, showIf: (m) => m.hairStyle !== 'none' },
                    { key: 'hairColor', label: 'Color', type: 'color', showIf: (m) => m.hairStyle !== 'none' },
                    { key: 'ponytailLength', label: 'Ponytail Length', type: 'number', min: 10, max: 120, showIf: { hairStyle: 'ponytail' } },
                    { key: 'ponytailBounce', label: 'Ponytail Bounce', type: 'boolean', showIf: { hairStyle: 'ponytail' } },
                    { key: 'ponytailSegments', label: 'Ponytail Joints', type: 'number', min: 2, max: 12, showIf: { hairStyle: 'ponytail' }, hint: 'More joints = smoother physics' },
                    { key: 'ponytailThickness', label: 'Base Thickness', type: 'number', min: 1, max: 15, showIf: { hairStyle: 'ponytail' } },
                    { key: 'ponytailTaper', label: 'Taper Amount', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { hairStyle: 'ponytail' }, hint: '0 = uniform, 1 = tapers to point' },
                    { key: 'ponytailAccentColor', label: 'Accent Color', type: 'color', showIf: { hairStyle: 'ponytail' }, hint: 'Alternates with hair color' },
                    { key: 'ponytailSpring', label: 'Spring Stiffness', type: 'number', min: 1, max: 30, showIf: { hairStyle: 'ponytail' }, hint: 'How stiff the ponytail is' },
                    { key: 'ponytailDrag', label: 'Air Drag', type: 'slider', min: 0.7, max: 0.99, step: 0.01, showIf: { hairStyle: 'ponytail' }, hint: 'Air resistance (higher = slower movement)' },
                    { key: 'ponytailInertia', label: 'Trail Inertia', type: 'number', min: 0, max: 200, showIf: { hairStyle: 'ponytail' }, hint: 'How much ponytail trails behind movement' },
                { type: 'groupEnd' },

                // Accessories (nested)
                { type: 'groupStart', label: '👑 Head Accessories' },
                    { key: 'headAccessory', label: 'Accessory', type: 'select', options: ['none', 'horns', 'ears', 'crown', 'tusks', 'crest', 'frills', 'fangs', 'snout', 'beak', 'whiskers', 'spikes', 'army_hat', 'cowboy_hat', 'baseball_cap', 'beret', 'helmet', 'bandana', 'headphones', 'goggles', 'top_hat', 'wizard_hat'] },
                    { key: 'accessorySize', label: 'Size', type: 'number', min: 5, max: 40, showIf: (m) => m.headAccessory !== 'none' },
                    { key: 'accessoryColor', label: 'Color', type: 'color', showIf: (m) => m.headAccessory !== 'none' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🦵 LEGS & LOCOMOTION
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🦵 Legs & Locomotion' },
                { key: 'legPairs', label: 'Leg Pairs', type: 'number', min: 0, max: 10, hint: 'Number of leg pairs (0 for snake)' },
                { key: 'legSegments', label: 'Leg Segments', type: 'number', min: 1, max: 5, showIf: (m) => m.legPairs > 0 },
                { key: 'legLength', label: 'Leg Length', type: 'number', min: 5, max: 100, showIf: (m) => m.legPairs > 0 },
                { key: 'legThickness', label: 'Leg Thickness', type: 'number', min: 1, max: 15, showIf: (m) => m.legPairs > 0 },
                { key: 'legSpread', label: 'Leg Spread', type: 'number', min: 0, max: 90, showIf: (m) => m.legPairs > 0, hint: 'Angle of legs from body' },
                { key: 'legHipInset', label: 'Hip Inset', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.legPairs > 0, hint: 'How close hips attach to body center (0=edge, 1=center)' },
                { key: 'legForwardOffset', label: 'Forward Offset', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.legPairs > 0 },
                { key: 'legRandomness', label: 'Randomness', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.legPairs > 0 },
                { key: 'legColor', label: 'Leg Color', type: 'color', showIf: (m) => m.legPairs > 0 },
                { key: 'footColor', label: 'Foot Color', type: 'color', showIf: (m) => m.legPairs > 0, hint: 'Color of feet/tips (uses accent color if empty)' },
                { key: 'footAngleOffset', label: 'Foot Angle Offset', type: 'number', min: -90, max: 90, showIf: (m) => m.legPairs > 0, hint: 'Rotate feet outward from body (positive = more outward)' },

                // Leg Style (nested)
                { type: 'groupStart', label: '🎨 Leg Style' },
                    { key: 'legJointStyle', label: 'Joint Style', type: 'select', options: ['smooth', 'angular', 'organic'] },
                    { key: 'legTipShape', label: 'Tip Shape', type: 'select', options: ['circle', 'claw', 'pad', 'hoof', 'spike', 'webbed', 'suction', 'pincer', 'talon', 'boot'] },
                    { key: 'legOffsetVariation', label: 'Offset Variation', type: 'slider', min: 0, max: 1, step: 0.01 },
                    { key: 'showJoints', label: 'Show Joints', type: 'boolean' },
                { type: 'groupEnd' },

                // IK Stepping (nested)
                { type: 'groupStart', label: '🚶 IK Stepping' },
                    { key: 'stepDistance', label: 'Step Distance', type: 'number', min: 5, max: 100, hint: 'Distance before leg steps' },
                    { key: 'stepHeight', label: 'Step Height', type: 'number', min: 0, max: 30, hint: 'How high legs lift when stepping' },
                    { key: 'stepSpeed', label: 'Step Speed', type: 'number', min: 1, max: 20, hint: 'Speed of step animation' },
                    { key: 'alternateLegs', label: 'Alternate Legs', type: 'boolean', hint: 'Step legs in alternating pattern' },
                    { key: 'legBendStrength', label: 'Bend Strength', type: 'slider', min: 0, max: 2, step: 0.1, hint: 'How much legs bend at joints' },
                    { key: 'legGroundingStrength', label: 'Grounding', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'How firmly legs plant when standing' },
                    { key: 'legAnticipation', label: 'Leg Anticipation', type: 'boolean', hint: 'Legs reach forward when about to step' },
                    { key: 'keepFeetOnStop', label: 'Keep Feet On Stop', type: 'boolean', hint: 'Feet stay in place when stopped instead of moving to rest' },
                    { key: 'footGluingStrength', label: 'Foot Gluing', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'How firmly feet stay planted (higher = less hover)' },
                { type: 'groupEnd' },

                // Snake Movement (nested - body wave options)
                { type: 'groupStart', label: '🐍 Body Wave Movement' },
                    { key: 'enableSnakeWave', label: 'Enable Body Wave', type: 'boolean', hint: 'Enable snake-like body wave (works with or without legs)' },
                    { key: 'snakeWaveAmplitude', label: 'Wave Amplitude', type: 'number', min: 0, max: 50, showIf: { enableSnakeWave: true }, hint: 'Width of the S-curve' },
                    { key: 'snakeWaveFrequency', label: 'Wave Frequency', type: 'number', min: 0.1, max: 5, step: 0.1, showIf: { enableSnakeWave: true }, hint: 'Number of waves along body' },
                    { key: 'snakeWaveSpeed', label: 'Wave Speed', type: 'number', min: 0.1, max: 10, step: 0.1, showIf: { enableSnakeWave: true }, hint: 'Speed of wave propagation' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🪱 WORM DIG MODE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🪱 Worm Dig Mode' },
                { type: 'hint', hint: 'Creature burrows underground segment-by-segment. Protected while underground, can attack when surfacing.' },
                { key: 'wormDigEnabled', label: 'Enable Dig Mode', type: 'boolean', hint: 'Master toggle for dig/burrow behavior' },
                { key: 'wormBurrowSpeed', label: 'Burrow Speed', type: 'slider', min: 0.5, max: 8, step: 0.1, showIf: { wormDigEnabled: true }, hint: 'How fast segments bury/reveal per second' },
                { key: 'wormSurfaceHoldTime', label: 'Surface Hold Time', type: 'number', min: 0.5, max: 20, step: 0.1, showIf: { wormDigEnabled: true }, hint: 'Seconds to stay above ground before burrowing again' },
                { key: 'wormAutoSurface', label: 'Auto Surface', type: 'boolean', showIf: { wormDigEnabled: true }, hint: 'Randomly surface at intervals' },
                { key: 'wormAttackOnSurface', label: 'Attack On Surface', type: 'boolean', showIf: (m) => m.wormDigEnabled && m.wormAutoSurface, hint: 'Auto-attack nearest enemy when surfacing' },

                { type: 'groupStart', label: '💨 Dirt Particles', showIf: { wormDigEnabled: true } },
                    { key: 'wormParticleColor', label: 'Particle Color', type: 'color' },
                    { key: 'wormParticleAccentColor', label: 'Accent Color', type: 'color' },
                    { key: 'wormParticleCount', label: 'Count', type: 'number', min: 1, max: 30 },
                    { key: 'wormParticleSize', label: 'Size', type: 'number', min: 1, max: 20 },
                    { key: 'wormParticleSpeed', label: 'Speed', type: 'number', min: 10, max: 200 },
                    { key: 'wormParticleLifetime', label: 'Lifetime', type: 'number', min: 0.1, max: 2, step: 0.05 },
                    { key: 'wormParticleSpread', label: 'Spread Angle', type: 'number', min: 10, max: 360 },
                { type: 'groupEnd' },

                { type: 'groupStart', label: '🌊 Underground Indicator', showIf: { wormDigEnabled: true } },
                    { key: 'wormShowUndergroundIndicator', label: 'Show Indicator', type: 'boolean', hint: 'Show ripple/trail while underground' },
                    { key: 'wormIndicatorColor', label: 'Indicator Color', type: 'color', showIf: { wormShowUndergroundIndicator: true } },
                    { key: 'wormIndicatorOpacity', label: 'Opacity', type: 'slider', min: 0.05, max: 1, step: 0.05, showIf: { wormShowUndergroundIndicator: true } },
                    { key: 'wormIndicatorSize', label: 'Size', type: 'slider', min: 0.3, max: 3, step: 0.1, showIf: { wormShowUndergroundIndicator: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 💪 ARMS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💪 Arms' },
                { key: 'armCount', label: 'Arm Count', type: 'number', min: 0, max: 8 },
                { key: 'armLength', label: 'Length', type: 'number', min: 10, max: 100, showIf: (m) => m.armCount > 0 },
                { key: 'armThickness', label: 'Thickness', type: 'number', min: 1, max: 15, showIf: (m) => m.armCount > 0 },
                { key: 'armSegments', label: 'Segments', type: 'number', min: 1, max: 5, showIf: (m) => m.armCount > 0 },
                { key: 'armColor', label: 'Color', type: 'color', showIf: (m) => m.armCount > 0 },

                // Arm Tips (nested)
                { type: 'groupStart', label: '✋ Arm Tips' },
                    { key: 'armTipShape', label: 'Tip Shape', type: 'select', options: ['circle', 'claw', 'hand', 'fist', 'tentacle', 'hook', 'blade', 'paw', 'mitten', 'sucker', 'pincer', 'stump', 'spike', 'webbed', 'bone', 'flame', 'crystal'] },
                    { key: 'armTipSize', label: 'Tip Size', type: 'number', min: 0.5, max: 3, step: 0.1 },
                    { key: 'clawLength', label: 'Claw Length', type: 'number', min: 1, max: 20, showIf: (m) => m.armTipShape === 'claw' || m.armTipShape === 'pincer' },
                    { key: 'fingerCount', label: 'Finger Count', type: 'number', min: 2, max: 6, showIf: (m) => m.armTipShape === 'hand' || m.armTipShape === 'webbed' },
                    { key: 'fingerSpread', label: 'Finger Spread', type: 'number', min: 10, max: 60, showIf: (m) => m.armTipShape === 'hand' || m.armTipShape === 'webbed' },
                { type: 'groupEnd' },

                // Arm Physics (nested)
                { type: 'groupStart', label: '🎯 Arm Physics' },
                    { key: 'armReachRange', label: 'Reach Range', type: 'number', min: 10, max: 200 },
                    { key: 'armReachSpeed', label: 'Reach Speed', type: 'number', min: 1, max: 20 },
                    { key: 'armSpringStiffness', label: 'Spring Stiffness', type: 'number', min: 1, max: 1000, hint: 'How strongly arms return to rest' },
                    { key: 'armSpringDamping', label: 'Spring Damping', type: 'slider', min: 0, max: 1, step: 0.01, hint: 'Dampening of spring motion' },
                    { key: 'armRestForwardDistance', label: 'Rest Forward Dist', type: 'slider', min: 0, max: 1, step: 0.01 },
                    { key: 'armRestOutwardAngle', label: 'Rest Outward Angle', type: 'number', min: 0, max: 90 },
                    { key: 'armStrength', label: 'Arm Strength', type: 'slider', min: 0.1, max: 5, step: 0.1, hint: 'Resistance to held item weight during swings (higher = less pull from heavy items)' },
                { type: 'groupEnd' },

                // Arm Animation (nested)
                { type: 'groupStart', label: '🏃 Arm Animation' },
                    { key: 'armSwingEnabled', label: 'Arm Swing', type: 'boolean', hint: 'Enable arm swing while moving' },
                    { key: 'armSwingSpeed', label: 'Swing Speed', type: 'number', min: 0.5, max: 10, showIf: { armSwingEnabled: true } },
                    { key: 'armSwingAmount', label: 'Swing Amount', type: 'number', min: 5, max: 45, showIf: { armSwingEnabled: true } },
                { type: 'groupEnd' },

                // Punch & Grab (nested)
                { type: 'groupStart', label: '👊 Punch & Grab' },
                    { key: 'punchSpeed', label: 'Punch Speed', type: 'number', min: 1, max: 20 },
                    { key: 'punchWindupDistance', label: 'Windup Distance', type: 'slider', min: 0, max: 1, step: 0.01 },
                    { key: 'punchReachDistance', label: 'Reach Distance', type: 'number', min: 0.5, max: 2, step: 0.1 },
                    { key: 'punchArcAmount', label: 'Arc Amount', type: 'number', min: 0, max: 45 },
                    { key: 'punchCrossBody', label: 'Cross-Body Style', type: 'boolean', hint: 'Punch-Out!! style punch across body' },
                    { key: 'punchCrossAmount', label: 'Cross Amount', type: 'slider', min: 0, max: 1, step: 0.1, showIf: { punchCrossBody: true } },
                    { key: 'swingOvershootAmount', label: 'Swing Overshoot', type: 'slider', min: 0, max: 3, step: 0.1, hint: 'How much weapon momentum carries past target (0.5 = subtle, 2.0 = dramatic)' },
                    { key: 'grabSpeed', label: 'Grab Speed', type: 'number', min: 1, max: 20 },
                    { key: 'grabHoldTime', label: 'Grab Hold Time', type: 'number', min: 0.1, max: 3, step: 0.1 },
                    { key: 'punchCooldown', label: 'Punch Cooldown', type: 'number', min: 0, max: 2, step: 0.05, hint: 'Minimum seconds between consecutive arm attacks' },
                    { key: 'gunArmAiming', label: 'Gun Arm Aiming', type: 'boolean', hint: 'Arms holding guns aim toward mouse (if faceMouse) or forward' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🎮 MOVEMENT & AI
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎮 Movement & AI' },
                { key: 'movementStyle', label: 'Movement Style', type: 'select', options: ['none', 'wander', 'circle', 'zigzag', 'patrol'] },
                { key: 'moveSpeed', label: 'Move Speed', type: 'number', min: 0, max: 500, hint: 'Movement speed in pixels per second' },
                { key: 'turnSpeed', label: 'Turn Speed', type: 'number', min: 10, max: 360, hint: 'Degrees per second' },
                { key: 'acceleration', label: 'Acceleration', type: 'number', min: 10, max: 1000 },
                { key: 'targetObject', label: 'Target Object', type: 'text', hint: 'Name of object to follow' },

                // Wander Settings (nested)
                { type: 'groupStart', label: '🌀 Wander Settings' },
                    { key: 'wanderRadius', label: 'Wander Radius', type: 'number', min: 50, max: 1000 },
                    { key: 'wanderWaitTime', label: 'Wait Time', type: 'number', min: 0, max: 10, step: 0.1, hint: 'Pause between movements' },
                    { key: 'arrivalThreshold', label: 'Arrival Threshold', type: 'number', min: 5, max: 50, hint: 'Distance to consider arrived' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🎨 COLORS
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎨 Colors' },
                { key: 'bodyColor', label: 'Body Color', type: 'color' },
                { key: 'accentColor', label: 'Accent Color', type: 'color' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌑 SHADOW
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌑 Shadow' },
                { key: 'showShadow', label: 'Show Shadow', type: 'boolean' },
                { key: 'shadowColor', label: 'Shadow Color', type: 'color', showIf: { showShadow: true } },
                { key: 'shadowOpacity', label: 'Opacity', type: 'slider', min: 0, max: 1, step: 0.01, showIf: { showShadow: true } },
                { key: 'shadowBlur', label: 'Blur', type: 'number', min: 0, max: 50, showIf: { showShadow: true } },
                { key: 'shadowOffsetX', label: 'Offset X', type: 'number', min: -50, max: 50, showIf: { showShadow: true } },
                { key: 'shadowOffsetY', label: 'Offset Y', type: 'number', min: -50, max: 50, showIf: { showShadow: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ➡️ DIRECTIONAL ARROW
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '➡️ Directional Arrow' },
                { type: 'hint', hint: 'RTS-style selection indicator with circle and arrow showing facing direction' },
                { key: 'showDirectionalArrow', label: 'Show Arrow', type: 'boolean', hint: 'Display a directional indicator showing facing direction' },
                { key: 'directionalArrowHealthColor', label: 'Color by Health', type: 'boolean', showIf: { showDirectionalArrow: true }, hint: 'Green at full health, red at 0 health. Arrow turns orange while reloading.' },
                { key: 'directionalArrowColor', label: 'Arrow Color', type: 'color', showIf: { showDirectionalArrow: true, directionalArrowHealthColor: false } },
                { key: 'directionalArrowOutlineColor', label: 'Outline Color', type: 'color', showIf: { showDirectionalArrow: true } },
                { key: 'directionalArrowOutlineWidth', label: 'Outline Width', type: 'number', min: 0, max: 8, showIf: { showDirectionalArrow: true } },
                { key: 'directionalArrowOpacity', label: 'Opacity', type: 'slider', min: 0.1, max: 1, step: 0.05, showIf: { showDirectionalArrow: true } },
                { key: 'directionalArrowSize', label: 'Size', type: 'slider', min: 0.3, max: 3, step: 0.1, showIf: { showDirectionalArrow: true }, hint: 'Scale multiplier for the indicator' },
                { key: 'directionalArrowOffset', label: 'Offset', type: 'number', min: -50, max: 100, showIf: { showDirectionalArrow: true }, hint: 'Distance from creature center (negative = closer)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🎯 TARGET RETICLE
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎯 Target Reticle' },
                { type: 'hint', hint: 'Animated reticle shown under this creature when it is being targeted by another creature or gun' },
                { key: 'showTargetReticle', label: 'Show When Targeted', type: 'boolean', hint: 'Display animated reticle when this creature is targeted' },
                { key: 'targetReticleColor', label: 'Reticle Color', type: 'color', showIf: { showTargetReticle: true } },
                { key: 'targetReticleOutlineColor', label: 'Outline Color', type: 'color', showIf: { showTargetReticle: true } },
                { key: 'targetReticleOutlineWidth', label: 'Outline Width', type: 'number', min: 0, max: 8, showIf: { showTargetReticle: true } },
                { key: 'targetReticleOpacity', label: 'Opacity', type: 'slider', min: 0.1, max: 1, step: 0.05, showIf: { showTargetReticle: true } },
                { key: 'targetReticleSize', label: 'Size', type: 'slider', min: 0.3, max: 3, step: 0.1, showIf: { showTargetReticle: true }, hint: 'Scale multiplier for the reticle' },
                { key: 'targetReticleSpinSpeed', label: 'Spin Speed', type: 'number', min: 0, max: 360, showIf: { showTargetReticle: true }, hint: 'Rotation speed in degrees per second' },
                { key: 'targetReticlePulseSpeed', label: 'Pulse Speed', type: 'slider', min: 0.5, max: 5, step: 0.1, showIf: { showTargetReticle: true }, hint: 'Scale pulse cycles per second' },
                { key: 'targetReticlePulseAmount', label: 'Pulse Amount', type: 'slider', min: 0, max: 0.5, step: 0.05, showIf: { showTargetReticle: true }, hint: 'How much the reticle pulses in size' },
                { key: 'targetReticleSegments', label: 'Segments', type: 'number', min: 2, max: 8, showIf: { showTargetReticle: true }, hint: 'Number of arc segments in the reticle' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 📐 2.5D / ISOMETRIC VIEW
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '📐 2.5D / Isometric View' },
                { type: 'hint', hint: 'Elevates the body while keeping feet grounded for a 2.5D look' },
                { key: 'enable25DMode', label: 'Enable 2.5D Mode', type: 'boolean', hint: 'Body floats above ground, legs stretch down' },
                { key: 'bodyElevation', label: 'Body Elevation', type: 'number', min: 0, max: 100, hint: 'How high the body sits above ground', showIf: { enable25DMode: true } },
                { key: 'isometricAngle', label: 'Isometric Angle', type: 'number', min: 0, max: 90, hint: 'Angle for isometric projection' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🏔️ DEPTH / PARALLAX (Fake 3D)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🏔️ Depth / Parallax' },
                { type: 'hint', hint: 'Fake 3D parallax based on viewport center - head/body shift relative to camera' },
                { key: 'depthEnabled', label: 'Enable Depth', type: 'boolean', hint: 'Parts shift based on camera position for fake 3D' },
                { key: 'depthIntensity', label: 'Intensity', type: 'slider', min: 0.01, max: 0.5, step: 0.01, showIf: { depthEnabled: true }, hint: 'How much parts shift' },
                { key: 'maxDepthOffset', label: 'Max Offset', type: 'number', min: 2, max: 60, showIf: { depthEnabled: true }, hint: 'Maximum pixel offset' },
                { key: 'headHeight', label: 'Head Height', type: 'slider', min: 0, max: 2, step: 0.1, showIf: { depthEnabled: true }, hint: 'Head parallax (1.0 = full)' },
                { key: 'bodyHeightDepth', label: 'Body Height', type: 'slider', min: 0, max: 2, step: 0.1, showIf: { depthEnabled: true }, hint: 'Body segment parallax' },
                { key: 'armHeightDepth', label: 'Arm Height', type: 'slider', min: 0, max: 2, step: 0.1, showIf: { depthEnabled: true }, hint: 'Arm/shoulder parallax' },
                { key: 'handHeightDepth', label: 'Hand Height', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { depthEnabled: true }, hint: 'Hand parallax (between arm and ground)' },
                { key: 'legHeightDepth', label: 'Leg Height', type: 'slider', min: 0, max: 1, step: 0.1, showIf: { depthEnabled: true }, hint: 'Leg parallax (0 = grounded)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌬️ BREATHING ANIMATION
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌬️ Breathing Animation' },
                { type: 'hint', hint: 'Subtle idle breathing motion for added life' },
                { key: 'breathingEnabled', label: 'Enable Breathing', type: 'boolean', hint: 'Adds subtle scale pulsing to body segments' },
                { key: 'breathingSpeed', label: 'Breathing Speed', type: 'number', min: 0.2, max: 5, step: 0.1, showIf: { breathingEnabled: true }, hint: 'Cycles per second' },
                { key: 'breathingAmount', label: 'Breathing Amount', type: 'slider', min: 0, max: 0.3, step: 0.01, showIf: { breathingEnabled: true }, hint: 'How much segments scale' },
                { key: 'breathingAsync', label: 'Async Segments', type: 'boolean', showIf: { breathingEnabled: true }, hint: 'Segments breathe at different phases' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🐕 TAIL
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🐕 Tail' },
                { type: 'hint', hint: 'Adds a physics-driven tail that reacts to movement, rotation, and optionally waves/wags' },
                { key: 'tailEnabled', label: 'Enable Tail', type: 'boolean', hint: 'Attach a tail to the last body segment' },
                { key: 'tailSegments', label: 'Segments', type: 'number', min: 2, max: 20, showIf: { tailEnabled: true }, hint: 'Number of chain links in the tail' },
                { key: 'tailLength', label: 'Length', type: 'number', min: 5, max: 200, showIf: { tailEnabled: true }, hint: 'Total tail length in pixels' },
                { key: 'tailThickness', label: 'Thickness', type: 'number', min: 1, max: 20, showIf: { tailEnabled: true }, hint: 'Base thickness at root' },
                { key: 'tailTaperAmount', label: 'Taper', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { tailEnabled: true }, hint: '0 = uniform width, 1 = tapers to a point' },
                { key: 'tailColor', label: 'Color', type: 'color', showIf: { tailEnabled: true } },
                { key: 'tailTipColor', label: 'Tip Color', type: 'color', showIf: { tailEnabled: true }, hint: 'Optional accent color for the tail tip (leave blank to match tail color)' },

                // Tail Physics (nested)
                { type: 'groupStart', label: '⚡ Tail Physics' },
                    { key: 'tailSpring', label: 'Spring', type: 'number', min: 1, max: 30, showIf: { tailEnabled: true }, hint: 'Spring stiffness pulling tail toward rest pose' },
                    { key: 'tailDamping', label: 'Damping', type: 'slider', min: 0.5, max: 0.99, step: 0.01, showIf: { tailEnabled: true }, hint: 'Velocity damping (higher = less whip)' },
                    { key: 'tailElasticity', label: 'Elasticity', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { tailEnabled: true }, hint: '0 = stiff, 1 = very elastic/bouncy' },
                    { key: 'tailInertia', label: 'Inertia', type: 'number', min: 0, max: 200, showIf: { tailEnabled: true }, hint: 'How much the tail trails behind movement' },
                    { key: 'tailStiffness', label: 'Stiffness', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { tailEnabled: true }, hint: 'Resistance to bending (0 = floppy, 1 = rigid)' },
                { type: 'groupEnd' },

                // Tail Waving / Wagging (nested)
                { type: 'groupStart', label: '🎵 Tail Waving / Wagging' },
                    { key: 'tailWaveEnabled', label: 'Enable Waving', type: 'boolean', showIf: { tailEnabled: true }, hint: 'Automatic tail waving/wagging animation' },
                    { key: 'tailWaveSpeed', label: 'Wave Speed', type: 'number', min: 0.5, max: 15, step: 0.5, showIf: (m) => m.tailEnabled && m.tailWaveEnabled, hint: 'Oscillation speed (cycles per second)' },
                    { key: 'tailWaveAmplitude', label: 'Wave Amplitude', type: 'number', min: 5, max: 90, showIf: (m) => m.tailEnabled && m.tailWaveEnabled, hint: 'Max swing angle in degrees' },
                    { key: 'tailWaveSpeedVariation', label: 'Speed Variation', type: 'slider', min: 0, max: 1, step: 0.05, showIf: (m) => m.tailEnabled && m.tailWaveEnabled, hint: 'Random variation in wave speed per cycle' },
                    { key: 'tailWaveCascade', label: 'Cascade', type: 'boolean', showIf: (m) => m.tailEnabled && m.tailWaveEnabled, hint: 'Wave ripples down the tail vs all in sync' },
                    { key: 'tailWaveCascadeDelay', label: 'Cascade Delay', type: 'slider', min: 0, max: 0.5, step: 0.01, showIf: (m) => m.tailEnabled && m.tailWaveEnabled && m.tailWaveCascade, hint: 'Phase delay per segment' },
                    { key: 'tailWaveIdleOnly', label: 'Idle Only', type: 'boolean', showIf: (m) => m.tailEnabled && m.tailWaveEnabled, hint: 'Only wave when creature is stopped' },
                { type: 'groupEnd' },

                // Tail Leg Redistribution (nested)
                { type: 'groupStart', label: '🦵 Leg Redistribution' },
                    { type: 'hint', hint: 'Controls how much of the back half of the body is treated as tail, pushing leg pairs forward' },
                    { key: 'tailBodyPercent', label: 'Tail Body %', type: 'slider', min: 0, max: 100, step: 1, showIf: (m) => m.tailEnabled && m.legPairs > 0, hint: '0% = normal leg spread, 100% = all legs crammed to front' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ❤️ HEALTH & COMBAT
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '❤️ Health & Combat' },
                { key: 'maxHealth', label: 'Max Health', type: 'number', min: 1, max: 10000, hint: 'Maximum hit points' },
                { key: 'health', label: 'Current Health', type: 'number', min: 0, max: 10000, hint: 'Current hit points' },
                { key: 'armor', label: 'Armor', type: 'number', min: 0, max: 1000, hint: 'Flat damage reduction' },
                { key: 'isInvulnerable', label: 'Invulnerable', type: 'boolean', hint: 'Cannot take damage' },
                { key: 'friendlyFire', label: 'Friendly Fire', type: 'boolean', hint: 'If true, this creature\'s attacks can hit creatures with matching tags' },
                { key: 'bloodPrefab', label: 'Blood Prefab', type: 'prefab', hint: 'Prefab to spawn at creature position when it takes damage (blood/hit effect)' },
                { key: 'punchDamage', label: 'Punch Damage', type: 'number', min: 0, max: 100, hint: 'Damage dealt by bare-fist punches (no weapon held)' },
                { key: 'punchKnockback', label: 'Punch Knockback', type: 'number', min: 0, max: 200, hint: 'Knockback force for bare-fist punches' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ⚔️ WEAPON COLLISION
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '⚔️ Weapon/Hand Collision' },
                { type: 'hint', hint: 'Collides held weapons OR bare hands with solid colliders (Box, Circle, Polygon)' },
                { key: 'weaponSolidCollision', label: 'Enable Collision', type: 'boolean', hint: 'Held weapons/hands deflect off solid colliders' },
                { key: 'weaponWeaponCollision', label: 'Weapon vs Weapons', type: 'boolean', hint: 'Held weapons from different creatures collide (sword fights)' },
                { key: 'weaponCollisionSolidTag', label: 'Solid Tag', type: 'text', showIf: { weaponSolidCollision: true }, hint: 'Tag for solid objects (empty = all non-trigger colliders)' },
                { key: 'weaponCollisionSearchRadius', label: 'Search Radius', type: 'number', min: 50, max: 1000, hint: 'Only check colliders within this distance' },
                { key: 'weaponCollisionBounce', label: 'Bounce Factor', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'How much the arm bounces on attack collision (idle slides smoothly)' },
                { key: 'backswingDamageMultiplier', label: 'Backswing Damage', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'Damage multiplier for hits during followthrough (backswing)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🦶 FOOT COLLISION
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🦶 Foot Collision' },
                { key: 'constrainFeet', label: 'Constrain Feet', type: 'boolean', hint: 'Prevent creature feet from clipping through solid colliders' },
                { key: 'footCollisionRadius', label: 'Foot Collision Radius', type: 'number', min: 1, max: 20, showIf: { constrainFeet: true }, hint: 'Size of collision check for each foot' },
                { key: 'footCollisionSolidTag', label: 'Solid Tag', type: 'text', showIf: { constrainFeet: true }, hint: 'Tag for solid objects that feet collide with' },
                { key: 'footCollisionSearchRadius', label: 'Search Radius', type: 'number', min: 50, max: 1000, showIf: { constrainFeet: true }, hint: 'Only check colliders within this distance (performance)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🎯 TARGETING SYSTEM
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🎯 Targeting System' },
                { type: 'hint', hint: 'Autonomous targeting for AI-controlled creatures (not needed if using ProceduralCreatureController lock-on)' },
                { key: 'targetingEnabled', label: 'Enable Targeting', type: 'boolean', hint: 'Creature autonomously faces the nearest enemy' },
                { key: 'targetingEnemyTag', label: 'Enemy Tags', type: 'text', showIf: { targetingEnabled: true }, hint: 'Comma-separated tags to consider hostile' },
                { key: 'targetingFriendlyTag', label: 'Friendly Tags', type: 'text', showIf: { targetingEnabled: true }, hint: 'Comma-separated tags to exclude from targeting' },
                { key: 'targetingRange', label: 'Detection Range', type: 'number', min: 50, max: 1000, showIf: { targetingEnabled: true }, hint: 'Max distance to detect enemies' },
                { key: 'targetingTurnSpeed', label: 'Turn Speed (°/s)', type: 'number', min: 10, max: 720, showIf: { targetingEnabled: true }, hint: 'How fast the creature turns toward target (large creatures = slower)' },
                { key: 'targetingHeadLook', label: 'Head Tracks Target', type: 'boolean', showIf: { targetingEnabled: true }, hint: 'Head looks at the targeted enemy' },
                { key: 'targetingFacebody', label: 'Body Faces Target', type: 'boolean', showIf: { targetingEnabled: true }, hint: 'Body turns to face the targeted enemy' },
                { key: 'gunAccuracy', label: 'Gun Accuracy', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { targetingEnabled: true }, hint: 'Lead prediction accuracy (0 = no prediction, 1 = perfect aim accounting for target movement)' },
                { key: 'gunAimMaxAngle', label: 'Gun Aim Max Angle', type: 'number', min: 0, max: 180, showIf: { targetingEnabled: true }, hint: 'Maximum angle the creature can aim its gun (for limited neck rotation)' },
                { key: 'gunCrossBodyAngleLimit', label: 'Gun Cross-Body Limit', type: 'number', min: 0, max: 180, showIf: { targetingEnabled: true }, hint: 'Maximum angle for aiming across the body (for right/left arm preference)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 💀 DEATH & DECAY
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💀 Death & Decay' },
                { key: 'isDead', label: 'Is Dead', type: 'boolean' },
                { key: 'decayMaxTime', label: 'Decay Time', type: 'number', min: 1, max: 120, step: 1, hint: 'Seconds until fully decayed' },
                { key: 'decayTimer', label: 'Decay Timer', type: 'number', min: 0, hint: 'Current decay progress (read-only)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🌐 TDTD (TopDownThreeD) RENDERING
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🌐 TDTD (TopDownThreeD)' },
                { type: 'hint', hint: 'Render the creature as a billboard in the TopDownThreeD fake 3D world. Scale adjusts relative to Z height using creatureScale as the base.' },
                { key: 'tdtdEnabled', label: 'TDTD Enabled', type: 'boolean', hint: 'Enable TopDownThreeD billboard rendering' },
                { key: 'tdtdZ', label: 'Z Position', type: 'number', showIf: { tdtdEnabled: true }, hint: 'Z height in the fake 3D world' },
                { key: 'tdtdAnchorY', label: 'Anchor Y', type: 'slider', min: 0, max: 1, step: 0.05, showIf: { tdtdEnabled: true }, hint: 'Billboard anchor (0=top, 1=bottom)' },
            { type: 'groupEnd' },
        ];
    }

    refreshInspector() {
        if (window.editor && window.editor.inspector) {
            // Clear any cached property data
            if (window.editor.inspector.clearModuleCache) {
                window.editor.inspector.clearModuleCache(this);
            }

            // Re-generate the module UI
            window.editor.inspector.refreshModuleUI(this);

            // Refresh the canvas to show visual changes
            if (window.editor.refreshCanvas) {
                window.editor.refreshCanvas();
            }

            // Mark the scene as dirty so it gets saved
            if (this.gameObject && this.gameObject.scene) {
                this.gameObject.scene.dirty = true;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CREATURE PRESET STUBS - all logic lives in CreaturePresets.js
    // ═══════════════════════════════════════════════════════════════════════

    // Original presets
    applyPresetHuman()        { ProceduralCreaturePresets.apply(this, 'Human'); }
    applyPresetSpider()       { ProceduralCreaturePresets.apply(this, 'Spider'); }
    applyPresetCentipede()    { ProceduralCreaturePresets.apply(this, 'Centipede'); }
    applyPresetLizard()       { ProceduralCreaturePresets.apply(this, 'Lizard'); }
    applyPresetAnt()          { ProceduralCreaturePresets.apply(this, 'Ant'); }
    applyPresetCrab()         { ProceduralCreaturePresets.apply(this, 'Crab'); }
    applyPresetSnake()        { ProceduralCreaturePresets.apply(this, 'Snake'); }
    applyPresetOctopus()      { ProceduralCreaturePresets.apply(this, 'Octopus'); }
    applyPresetDog()          { ProceduralCreaturePresets.apply(this, 'Dog'); }
    applyPresetCat()          { ProceduralCreaturePresets.apply(this, 'Cat'); }
    applyPresetScorpion()     { ProceduralCreaturePresets.apply(this, 'Scorpion'); }
    applyPresetBird()         { ProceduralCreaturePresets.apply(this, 'Bird'); }
    applyPresetWorm()         { ProceduralCreaturePresets.apply(this, 'Worm'); }
    applyPresetBeetle()       { ProceduralCreaturePresets.apply(this, 'Beetle'); }
    applyPresetJellyfish()    { ProceduralCreaturePresets.apply(this, 'Jellyfish'); }
    applyPresetDragon()       { ProceduralCreaturePresets.apply(this, 'Dragon'); }
    applyPresetFrog()         { ProceduralCreaturePresets.apply(this, 'Frog'); }
    applyPresetMantis()       { ProceduralCreaturePresets.apply(this, 'Mantis'); }
    applyPresetWolf()         { ProceduralCreaturePresets.apply(this, 'Wolf'); }
    applyPresetTurtle()       { ProceduralCreaturePresets.apply(this, 'Turtle'); }
    applyPresetMosquito()     { ProceduralCreaturePresets.apply(this, 'Mosquito'); }
    applyPresetCrocodile()    { ProceduralCreaturePresets.apply(this, 'Crocodile'); }
    applyPresetLobster()      { ProceduralCreaturePresets.apply(this, 'Lobster'); }
    applyPresetRobotSpider()  { ProceduralCreaturePresets.apply(this, 'RobotSpider'); }
    applyPresetRobotHuman()   { ProceduralCreaturePresets.apply(this, 'RobotHuman'); }
    applyPresetRobotMech()    { ProceduralCreaturePresets.apply(this, 'RobotMech'); }

    // Dinosaurs
    applyPresetTRex()         { ProceduralCreaturePresets.apply(this, 'TRex'); }
    applyPresetBrachiosaurus(){ ProceduralCreaturePresets.apply(this, 'Brachiosaurus'); }
    applyPresetTriceratops()  { ProceduralCreaturePresets.apply(this, 'Triceratops'); }
    applyPresetRaptor()       { ProceduralCreaturePresets.apply(this, 'Raptor'); }
    applyPresetAnkylosaurus() { ProceduralCreaturePresets.apply(this, 'Ankylosaurus'); }
    applyPresetStegosaurus()  { ProceduralCreaturePresets.apply(this, 'Stegosaurus'); }
    applyPresetPterosaur()    { ProceduralCreaturePresets.apply(this, 'Pterosaur'); }

    // Aliens & Fantasy
    applyPresetAlienBiped()       { ProceduralCreaturePresets.apply(this, 'AlienBiped'); }
    applyPresetAlienInsectoid()   { ProceduralCreaturePresets.apply(this, 'AlienInsectoid'); }
    applyPresetAlienTentacled()   { ProceduralCreaturePresets.apply(this, 'AlienTentacled'); }
    applyPresetAlienQuadruped()   { ProceduralCreaturePresets.apply(this, 'AlienQuadruped'); }
    applyPresetAlienCrustacean()  { ProceduralCreaturePresets.apply(this, 'AlienCrustacean'); }
    applyPresetAlienWorm()        { ProceduralCreaturePresets.apply(this, 'AlienWorm'); }
    applyPresetAlienSwarmer()     { ProceduralCreaturePresets.apply(this, 'AlienSwarmer'); }
    applyPresetAlienFloater()     { ProceduralCreaturePresets.apply(this, 'AlienFloater'); }
    applyPresetParasite()         { ProceduralCreaturePresets.apply(this, 'Parasite'); }
    applyPresetGiantCentipede()   { ProceduralCreaturePresets.apply(this, 'GiantCentipede'); }
    applyPresetGoblin()           { ProceduralCreaturePresets.apply(this, 'Goblin'); }
    applyPresetDemonLord()        { ProceduralCreaturePresets.apply(this, 'DemonLord'); }

    _initializeCreature() {
        this._segments = [];
        this._legs = [];

        // Invalidate drawing caches since visual properties may have changed
        this._invalidateCaches();

        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : new Vector2(0, 0);

        // Initialize body segments with absolute world positions
        for (let i = 0; i < this.bodySegments; i++) {
            this._segments.push({
                worldPos: new Vector2(worldPos.x - i * this.segmentLength, worldPos.y),
                angle: 0 // This is now the absolute world angle
            });
        }

        // Initialize ponytail chain
        this._ponytailChain = [];

        // Initialize mouth tentacle chains
        this._mouthTentacleChains = [];

        // Initialize tail chain
        this._tailChain = [];
        this._tailWavePhase = 0;
        if (this.tailEnabled && this._segments.length > 0) {
            const lastSeg = this._segments[this._segments.length - 1];
            const tailAngle = lastSeg.angle + Math.PI; // Points away from body
            const tailSegLen = this.tailLength / (this.tailSegments || 5);
            for (let i = 0; i < (this.tailSegments || 5); i++) {
                this._tailChain.push({
                    x: lastSeg.worldPos.x + Math.cos(tailAngle) * tailSegLen * (i + 1),
                    y: lastSeg.worldPos.y + Math.sin(tailAngle) * tailSegLen * (i + 1),
                    angle: tailAngle,
                    velX: 0,
                    velY: 0
                });
            }
        }

        // Initialize legs with position along body
        for (let i = 0; i < this.legPairs; i++) {
            let segmentIndex, positionAlongSegment, legAngleOffset, bodyPositionOffset;

            if (this.bodySegments === 1) {
                // For single-segment bodies (like spiders), distribute legs evenly along the body length
                segmentIndex = 0;
                
                // Calculate position along the body from front (-0.5) to back (0.5)
                // This creates even distribution along the body's sides
                let normalizedPos = this.legPairs > 1 ? (i / (this.legPairs - 1)) : 0.5;

                // Apply tailBodyPercent: compress legs toward the front
                // tailBodyPercent=0 → normal, tailBodyPercent=100 → all legs crammed to front
                if (this.tailEnabled && this.tailBodyPercent > 0 && this.legPairs > 1) {
                    const compressionFactor = 1 - (this.tailBodyPercent / 100);
                    // Remap normalizedPos from [0,1] to [0, compressionFactor]
                    normalizedPos = normalizedPos * compressionFactor;
                }
                
                // positionAlongSegment controls where the leg attaches along the body (front to back)
                // Map from 0 to 1 -> -0.4 to 0.4 (keeping legs within body bounds)
                positionAlongSegment = (normalizedPos - 0.5) * 0.8;
                
                // Store the offset for positioning the leg attachment point
                bodyPositionOffset = positionAlongSegment;
                
                // Front legs angle forward, back legs angle backward for natural spider stance
                // Creates a radial spread pattern
                const spreadFactor = (normalizedPos - 0.5) * 2; // -1 to 1 from front to back
                legAngleOffset = spreadFactor * this.legSpread * 0.5;
            } else {
                const totalLength = (this.bodySegments - 1);
                let legPosition = (i / (this.legPairs - 1 || 1)) * totalLength;

                // Apply tailBodyPercent: compress legs toward the front segments
                // tailBodyPercent=0 → normal, tailBodyPercent=100 → all legs near first segment
                if (this.tailEnabled && this.tailBodyPercent > 0 && this.legPairs > 1) {
                    const compressionFactor = 1 - (this.tailBodyPercent / 100);
                    // Remap legPosition from [0, totalLength] to [0, totalLength * compressionFactor]
                    legPosition = legPosition * compressionFactor;
                }

                segmentIndex = Math.floor(legPosition);
                positionAlongSegment = legPosition - segmentIndex;
                bodyPositionOffset = 0;

                if (segmentIndex >= this.bodySegments) {
                    segmentIndex = this.bodySegments - 1;
                    positionAlongSegment = 1;
                }

                legAngleOffset = 0;
            }

            for (let side = 0; side < 2; side++) {
                const lengthVariation = 1 + (Math.random() - 0.5) * this.legRandomness;
                const angleVariation = (Math.random() - 0.5) * this.legRandomness * 30;
                const thicknessVariation = 1 + (Math.random() - 0.5) * this.legRandomness * 0.3;
                const verticalOffset = (Math.random() - 0.5) * this.legOffsetVariation * this.bodyWidth;
                const phaseOffset = side === 0 ? 0 : 0.5;
                const sideMultiplier = side === 0 ? -1 : 1;
                
                // Mirror the legAngleOffset for right side legs
                // Left legs (side=-1) use positive offset, right legs (side=1) use negative
                // Fan legs that share the same segment
                const pairsOnThisSegment = [];
                for (let k = 0; k < this.legPairs; k++) {
                    let kSegIdx;
                    if (this.bodySegments === 1) {
                        kSegIdx = 0;
                    } else {
                        const totalLength = (this.bodySegments - 1);
                        let kLegPos = (k / (this.legPairs - 1 || 1)) * totalLength;
                        if (this.tailEnabled && this.tailBodyPercent > 0 && this.legPairs > 1) {
                            kLegPos *= (1 - this.tailBodyPercent / 100);
                        }
                        kSegIdx = Math.min(Math.floor(kLegPos), this.bodySegments - 1);
                    }
                    if (kSegIdx === segmentIndex) pairsOnThisSegment.push(k);
                }
                const numOnSeg = pairsOnThisSegment.length;
                const posOnSeg = pairsOnThisSegment.indexOf(i);
                
                // For bodySegments===1, use full radial spread; otherwise spread co-segment legs
                let pairFanOffset = 0;
                if (this.bodySegments === 1) {
                    pairFanOffset = ((i / (this.legPairs - 1 || 1)) - 0.5) * (this.legSpread * 0.8);
                } else if (numOnSeg > 1) {
                    // Spread co-segment pairs evenly
                    pairFanOffset = ((posOnSeg / (numOnSeg - 1)) - 0.5) * (this.legSpread * 0.8);
                }
                const mirroredAngleOffset = (legAngleOffset + pairFanOffset) * -sideMultiplier;

                this._legs.push({
                    segmentIndex: segmentIndex,
                    positionAlongSegment: positionAlongSegment,
                    bodyPositionOffset: bodyPositionOffset || 0, // Offset along body for single-segment creatures
                    side: sideMultiplier,
                    pairIndex: i,
                    currentPos: new Vector2(0, 0),
                    targetPos: new Vector2(0, 0),
                    restPos: new Vector2(0, 0),
                    isMoving: false,
                    moveProgress: 0,
                    startPos: new Vector2(0, 0),
                    lengthMultiplier: lengthVariation,
                    angleOffset: angleVariation + mirroredAngleOffset,
                    thicknessMultiplier: thicknessVariation,
                    verticalOffset: verticalOffset,
                    phaseOffset: phaseOffset,
                    initialized: false, // new flag to reliably initialize currentPos
                    bendDirection: sideMultiplier // Mirror bend direction: left legs bend left, right legs bend right
                });
            }
        }


        // Initialize arms attached to head
        this._arms = [];
        for (let i = 0; i < this.armCount; i++) {
            // Determine side: first half are left, second half are right
            const isLeftSide = i < this.armCount / 2;
            const sideMultiplier = isLeftSide ? -1 : 1;

            // Stagger the phase for each arm pair
            const pairIndex = isLeftSide ? i : i - Math.floor(this.armCount / 2);
            const swingPhase = pairIndex * Math.PI * 0.3; // Offset each pair

            this._arms.push({
                index: i,
                side: sideMultiplier, // -1 for left, 1 for right
                currentHandPos: new Vector2(0, 0),
                targetHandPos: new Vector2(0, 0),
                restHandPos: new Vector2(0, 0),
                handVelocity: new Vector2(0, 0), // Spring velocity
                reachingTarget: null,
                initialized: false,
                manualControl: false,
                swingPhase: swingPhase, // Phase offset for swing animation
                swingTime: 0, // Current swing time

                // Animation state system
                state: 'idle', // idle, punching, grabbing, holding, returning, holdingItem
                stateTime: 0, // Time in current state
                stateStartPos: new Vector2(0, 0), // Position when state started
                stateTargetPos: new Vector2(0, 0), // Target position for state
                punchWindupPos: new Vector2(0, 0), // Windup position for punch
                punchReachPos: new Vector2(0, 0), // Maximum reach position for punch
                punchPower: 0, // Current punch speed/power
                grabTargetPos: new Vector2(0, 0), // Position to grab
                grabHoldTimer: 0, // Timer for holding grab
                _emptyGrab: false, // True when grab found nothing
                _lastPunchEndTime: 0, // When this arm last finished a punch
                _isFiring: false, // Currently in gun firing recoil animation
                _swingHitChecked: false, // Whether the cone hit check has been performed this swing
                _foregripTarget: null, // World position of foregrip this arm is reaching for
                _foregripSourceArm: -1, // Index of the arm whose gun has the foregrip
                _twoHandedTarget: null, // World position of second grip this arm is reaching for
                _twoHandedSourceArm: -1, // Index of the arm whose item this arm is supporting
                heldItem: null, // Reference to held ProceduralCreatureItem
                _pointTarget: null // External aim target {x,y} set by handPointTo()
            });
        }
    }

    start() {
        this._initializeCreature();

        if (this.generateRandomCreatureBoolean) {
            this._randomizeAllProperties();
            //this.refreshInspector();
        }

        // Initialize last position for velocity tracking
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this._lastPosition = { x: pos.x, y: pos.y };
        }
    }

    /**
     * Called before loop - save position for automatic velocity detection
     */
    beginLoop(deltaTime) {
        if (this._autoVelocityEnabled && this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            if (!this._lastPosition) {
                this._lastPosition = { x: pos.x, y: pos.y };
            }
        }

        // Capture angle at start of frame for rotation detection
        if (this.gameObject) {
            this._beginLoopAngle = this.gameObject.angle;
        }
    }

    /**
     * Called after loop - calculate velocity from position change
     */
    endLoop(deltaTime) {
        if (this._autoVelocityEnabled && this.gameObject && this._lastPosition && deltaTime > 0 && !this.isDead) {
            const pos = this.gameObject.getWorldPosition();
            
            // Calculate velocity from position change
            const dx = pos.x - this._lastPosition.x;
            const dy = pos.y - this._lastPosition.y;
            
            // Only update if there was actual movement (to avoid overriding internal velocity when self-moving)
            // or if movementStyle is 'controlled' (external control)
            if (this.movementStyle === 'controlled' || 
                (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
                // Convert position delta to velocity (units per second)
                this._velocity.x = dx / deltaTime;
                this._velocity.y = dy / deltaTime;
            }
            
            // Save current position for next frame
            this._lastPosition.x = pos.x;
            this._lastPosition.y = pos.y;
        }

        // Detect rotation: compare angle at end of frame vs start of frame
        if (this.gameObject && this._beginLoopAngle !== undefined) {
            let angleDelta = this.gameObject.angle - this._beginLoopAngle;
            // Normalize to -180..180
            while (angleDelta > 180) angleDelta -= 360;
            while (angleDelta < -180) angleDelta += 360;
            this._isRotating = Math.abs(angleDelta) > 0.01;
        } else {
            this._isRotating = false;
        }
    }

    loop(deltaTime) {
        // Gate expensive searches to different frames per creature to spread CPU load.
        // Each creature gets a unique slot so they don't all run on the same frame.
        if (!this._frameOffset) {
            this._frameOffset = Math.floor(Math.random() * 4); // 0-3
        }
        this._globalFrame = ((this._globalFrame || 0) + 1);
        // Update depth sorting relative to viewport center
        // Objects further from the viewport center get a higher (more positive) depth number,
        // meaning they render behind objects closer to the center (lower/negative depth = on top)
        if (this.depthEnabled && this.gameObject && !this.isDead) {
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
            const heightBasedDepth = -(this.headHeightDepth || 1.0) * 100 * this.depthIntensity;

            // Combine: height pulls depth negative (on top), distance pushes it positive (behind)
            this.gameObject.depth = heightBasedDepth + distFromCenter * 0.01;
        }

        if (this.isDead && this.gameObject.depth !== 10000) {
            this.gameObject.depth = 10000;
            this.depthEnabled = false; // Disable further depth updates after
        }

        // Update worm dig mode
        if (this.wormDigEnabled) {
            this._updateWormDig(deltaTime);
        }

        // Update breathing animation phase
        if (this.breathingEnabled && !this.isDead) {
            this._breathingPhase += deltaTime * this.breathingSpeed * Math.PI * 2;
            if (this._breathingPhase > Math.PI * 2) {
                this._breathingPhase -= Math.PI * 2;
            }
        }

        // Tick damage flash timer
        if (this._damageFlashTimer > 0) {
            this._damageFlashTimer -= deltaTime;
        }

        // Handle death and decay
        if (this.isDead) {
            // Ensure segments are at valid positions for drawing
            // If segments are at (0,0) but gameObject isn't, they were never properly initialized
            // In that case, initialize them at the gameObject's current position
            const worldPos = this.gameObject.getWorldPosition();
            if (this._segments.length > 0) {
                const seg0 = this._segments[0];
                // Check if head segment is far from gameObject (indicating uninitialized or stale data)
                const distToGO = Math.abs(seg0.worldPos.x - worldPos.x) + Math.abs(seg0.worldPos.y - worldPos.y);
                if (distToGO > 1) {
                    // Segments are not aligned with gameObject - reinitialize them
                    const bodyAngle = this.gameObject.angle * Math.PI / 180;
                    for (let i = 0; i < this._segments.length; i++) {
                        this._segments[i].worldPos.x = worldPos.x - Math.cos(bodyAngle) * i * this.segmentLength;
                        this._segments[i].worldPos.y = worldPos.y - Math.sin(bodyAngle) * i * this.segmentLength;
                        this._segments[i].angle = bodyAngle;
                    }
                }
            }
            
            // Just update decay - don't modify any other positions
            this._updateDecay(deltaTime);
            return; // Skip normal movement updates
        }

        // Check for collision with thrown items
        this._checkThrownItemCollisions(deltaTime);

        const pos = this.gameObject.position;

        // When controlled externally (e.g. ProceduralCreatureController), skip all
        // movement/velocity/position/angle logic — the controller already handled that.
        // Only run visual updates: arm IK, head look, body segments, leg IK.
        if (this.movementStyle === 'controlled') {
            // Apply knockback velocity even when externally controlled
            // Use separate _knockbackVelocity to avoid feedback loop with position-derived _velocity
            if (!this._knockbackVelocity) this._knockbackVelocity = new Vector2(0, 0);
            const knockbackMag = Math.sqrt(this._knockbackVelocity.x * this._knockbackVelocity.x + this._knockbackVelocity.y * this._knockbackVelocity.y);
            if (knockbackMag > 1) {
                // Check for wall collisions before applying knockback movement
                const knockbackMoveX = this._knockbackVelocity.x * deltaTime;
                const knockbackMoveY = this._knockbackVelocity.y * deltaTime;
                const knockbackCollision = this._checkKnockbackCollision(knockbackMoveX * 5, knockbackMoveY * 5);
                
                if (knockbackCollision) {
                    pos.x += knockbackMoveX * knockbackCollision.multiplierX;
                    pos.y += knockbackMoveY * knockbackCollision.multiplierY;
                    // Zero out blocked velocity components to prevent wall sliding
                    if (knockbackCollision.multiplierX === 0) this._knockbackVelocity.x = 0;
                    if (knockbackCollision.multiplierY === 0) this._knockbackVelocity.y = 0;
                } else {
                    pos.x += knockbackMoveX;
                    pos.y += knockbackMoveY;
                }
                
                // Decay knockback velocity (friction)
                this._knockbackVelocity.x *= 0.85;
                this._knockbackVelocity.y *= 0.85;
                
                // Stop very small velocities
                if (Math.abs(this._knockbackVelocity.x) < 1) this._knockbackVelocity.x = 0;
                if (Math.abs(this._knockbackVelocity.y) < 1) this._knockbackVelocity.y = 0;
            }
            
            // Check for collision with thrown items
            this._checkThrownItemCollisions(deltaTime);
            // Run autonomous targeting even when externally controlled
            // (controller may override with its own lock-on, but this
            // ensures targetingEnabled works for gun aiming fallback)
            this._updateTargeting(deltaTime);
            this._updateHeadbutt(deltaTime);
            this._updateArmIK(deltaTime);
            this._updateWeaponCollisions(deltaTime);
            this._updateSparkParticles(deltaTime);
            this._updateHeadLook(deltaTime);
            this._updatePonytailPhysics(deltaTime);
            this._updateTailPhysics(deltaTime);
            this._updateMouthTentaclePhysics(deltaTime);
            this._updateBodySegments(deltaTime);
            this._updateLegIK(deltaTime);
            return;
        }

        // Determine movement direction
        let targetDir = new Vector2(0, 0);
        let hasTarget = false;

        if (this.targetObject && this.targetObject.length > 0) {
            const target = this.findObject(this.targetObject);
            if (target) {
                targetDir.x = target.position.x - pos.x;
                targetDir.y = target.position.y - pos.y;
                const dist = Math.sqrt(targetDir.x * targetDir.x + targetDir.y * targetDir.y);
                if (dist > this.arrivalThreshold) {
                    targetDir.x /= dist;
                    targetDir.y /= dist;
                    hasTarget = true;
                } else {
                    targetDir.x = 0;
                    targetDir.y = 0;
                }
            }
        }

        if (!hasTarget) {
            // Apply movement style
            switch (this.movementStyle) {
                case "wander":
                    // Wander behavior - pick location, walk, wait, repeat
                    if (this._isWaiting) {
                        this._wanderWaitTimer += deltaTime;
                        if (this._wanderWaitTimer >= this.wanderWaitTime) {
                            this._isWaiting = false;
                            this._wanderTarget = null;
                        }
                    } else {
                        if (!this._wanderTarget) {
                            // Pick new wander target from CURRENT position
                            const angle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * this.wanderRadius;

                            this._wanderTarget = new Vector2(
                                pos.x + Math.cos(angle) * dist,
                                pos.y + Math.sin(angle) * dist
                            );
                        }

                        // Move toward wander target
                        const dx = this._wanderTarget.x - pos.x;
                        const dy = this._wanderTarget.y - pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < this.arrivalThreshold) {
                            // Arrived at target, start waiting
                            this._isWaiting = true;
                            this._wanderWaitTimer = 0;
                            this._wanderTarget = null;
                            targetDir.x = 0;
                            targetDir.y = 0;
                        } else {
                            targetDir.x = dx / dist;
                            targetDir.y = dy / dist;
                        }
                    }
                    break;

                case "circle":
                    // Circle movement
                    if (!this._circleCenter) {
                        this._circleCenter = new Vector2(pos.x, pos.y);
                        this._circleAngle = 0;
                    }
                    this._circleAngle += deltaTime * (this.moveSpeed / this.wanderRadius);
                    const targetX = this._circleCenter.x + Math.cos(this._circleAngle) * this.wanderRadius;
                    const targetY = this._circleCenter.y + Math.sin(this._circleAngle) * this.wanderRadius;
                    targetDir.x = targetX - pos.x;
                    targetDir.y = targetY - pos.y;
                    const dist = Math.sqrt(targetDir.x * targetDir.x + targetDir.y * targetDir.y);
                    if (dist > 0) {
                        targetDir.x /= dist;
                        targetDir.y /= dist;
                    }
                    break;

                case "zigzag":
                    // Zigzag movement
                    if (!this._zigzagTarget) {
                        this._zigzagTarget = new Vector2(pos.x + 100, pos.y);
                        this._zigzagDirection = 1;
                    }
                    const dxZig = this._zigzagTarget.x - pos.x;
                    const dyZig = this._zigzagTarget.y - pos.y;
                    const distZig = Math.sqrt(dxZig * dxZig + dyZig * dyZig);
                    if (distZig < this.arrivalThreshold) {
                        this._zigzagDirection *= -1;
                        const forward = Math.atan2(dyZig, dxZig);
                        this._zigzagTarget.x = pos.x + Math.cos(forward) * 100;
                        this._zigzagTarget.y = pos.y + Math.sin(forward) * 100 + this._zigzagDirection * 50;
                    }
                    targetDir.x = dxZig / distZig;
                    targetDir.y = dyZig / distZig;
                    break;

                case "patrol":
                    // Patrol between points
                    if (!this._patrolPoints) {
                        this._patrolPoints = [
                            new Vector2(pos.x - this.wanderRadius, pos.y),
                            new Vector2(pos.x + this.wanderRadius, pos.y)
                        ];
                        this._patrolIndex = 0;
                    }
                    const patrolTarget = this._patrolPoints[this._patrolIndex];
                    const dxPatrol = patrolTarget.x - pos.x;
                    const dyPatrol = patrolTarget.y - pos.y;
                    const distPatrol = Math.sqrt(dxPatrol * dxPatrol + dyPatrol * dyPatrol);
                    if (distPatrol < this.arrivalThreshold) {
                        this._patrolIndex = (this._patrolIndex + 1) % this._patrolPoints.length;
                    }
                    if (distPatrol > 0) {
                        targetDir.x = dxPatrol / distPatrol;
                        targetDir.y = dyPatrol / distPatrol;
                    }
                    break;
            }
        }

        // Update arm IK
        this._updateArmIK(deltaTime);
        this._updateWeaponCollisions(deltaTime);
        this._updateSparkParticles(deltaTime);

        // Apply movement with proper acceleration
        this._velocity.x += targetDir.x * deltaTime * this.acceleration;
        this._velocity.y += targetDir.y * deltaTime * this.acceleration;

        const speed = Math.sqrt(this._velocity.x * this._velocity.x + this._velocity.y * this._velocity.y);
        if (speed > this.moveSpeed) {
            this._velocity.x = (this._velocity.x / speed) * this.moveSpeed;
            this._velocity.y = (this._velocity.y / speed) * this.moveSpeed;
        }

        // Apply friction
        const friction = targetDir.x === 0 && targetDir.y === 0 ? 0.85 : 0.95;
        this._velocity.x *= friction;
        this._velocity.y *= friction;

        pos.x += this._velocity.x * deltaTime;
        pos.y += this._velocity.y * deltaTime;

        // Update body angle with proper turn speed
        if (speed > 1) {
            const targetAngle = Math.atan2(this._velocity.y, this._velocity.x) * 180 / Math.PI;
            let angleDiff = targetAngle - this.gameObject.angle;

            // Normalize angle difference
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;

            // Use the actual turnSpeed property
            const maxTurnSpeed = this.turnSpeed; // degrees per second
            const turnAmount = Math.max(-maxTurnSpeed * deltaTime, Math.min(maxTurnSpeed * deltaTime, angleDiff));

            this.gameObject.angle += turnAmount;
        }

        // Update autonomous targeting (face nearest enemy)
        this._updateTargeting(deltaTime);

        // Update headbutt animation (for creatures without arms)
        this._updateHeadbutt(deltaTime);

        // Update head look direction
        this._updateHeadLook(deltaTime);

        // Update ponytail physics
        this._updatePonytailPhysics(deltaTime);

        // Update tail physics
        this._updateTailPhysics(deltaTime);

        // Update mouth tentacle physics
        this._updateMouthTentaclePhysics(deltaTime);

        // Update body segments (snake-like following)
        this._updateBodySegments(deltaTime);

        // Update leg IK
        this._updateLegIK(deltaTime);
    }

    rebuild() {
        this._initializeCreature();
    }

    _updatePonytailPhysics(deltaTime) {
        if (this.hairStyle !== "ponytail" || !this.ponytailBounce) {
            this._ponytailChain = [];
            return;
        }

        const head = this._segments[0];
        const headWorldAngle = head.angle + this._headAngle;
        const segCount = this.ponytailSegments || 5;
        const baseSegLen = this.ponytailLength / segCount; // Full/extended segment length
        const spring = this.ponytailSpring || 12;
        const drag = this.ponytailDrag || 0.92;
        const inertia = this.ponytailInertia || 80;
        const maxAnglePerSeg = Math.PI * 0.35; // Angle limit per segment

        // Calculate velocity magnitude to determine if creature is moving
        const velocityMag = Math.sqrt(this._velocity.x * this._velocity.x + this._velocity.y * this._velocity.y);
        const isMoving = velocityMag > 5; // Threshold for considering creature as "moving"

        // Gravity shrink simulation for bird's eye view:
        // When stationary, ponytail "lays flat" by shrinking segments towards the base
        // Tip shrinks most (~70% shrink = 30% of base), base shrinks least (~10% shrink = 90% of base)
        // When moving, segments extend back to full length (clamped at max)
        // Use smooth interpolation to avoid sudden changes
        if (this._ponytailGravityFactor === undefined) {
            this._ponytailGravityFactor = isMoving ? 1.0 : 0.0; // 1 = extended (moving), 0 = contracted (stationary)
        }
        const targetGravityFactor = isMoving ? 1.0 : 0.0;
        // Smooth transition between states
        const gravityTransitionSpeed = isMoving ? 4.0 : 2.0; // Extend faster than contract
        this._ponytailGravityFactor += (targetGravityFactor - this._ponytailGravityFactor) * gravityTransitionSpeed * deltaTime;
        this._ponytailGravityFactor = Math.max(0, Math.min(1, this._ponytailGravityFactor));

        // Initialize chain if needed
        if (!this._ponytailChain || this._ponytailChain.length !== segCount) {
            this._ponytailChain = [];
            // Ponytail root is at back of head in world space
            const rootX = head.worldPos.x + Math.cos(headWorldAngle + Math.PI) * this.headSize * 0.5;
            const rootY = head.worldPos.y + Math.sin(headWorldAngle + Math.PI) * this.headSize * 0.5;
            let cumulativeDist = 0;
            for (let i = 0; i < segCount; i++) {
                const angle = headWorldAngle + Math.PI; // Points backward
                // Calculate gravity-contracted length for this segment
                const segFraction = i / Math.max(1, segCount - 1); // 0 at base, 1 at tip
                const gravityScale = this._getGravityScaleForSegment(segFraction, this._ponytailGravityFactor);
                const segLen = baseSegLen * gravityScale;
                cumulativeDist += segLen;
                this._ponytailChain.push({
                    x: rootX + Math.cos(angle) * cumulativeDist,
                    y: rootY + Math.sin(angle) * cumulativeDist,
                    angle: angle,
                    velX: 0,
                    velY: 0,
                    baseLength: baseSegLen // Store base length for extension clamping
                });
            }
        }

        // Calculate root position (back of head in world space)
        const rootX = head.worldPos.x + Math.cos(headWorldAngle + Math.PI) * this.headSize * 0.5;
        const rootY = head.worldPos.y + Math.sin(headWorldAngle + Math.PI) * this.headSize * 0.5;

        // Inertia force from creature movement
        const inertiaForceX = -this._velocity.x * (inertia / 100);
        const inertiaForceY = -this._velocity.y * (inertia / 100);

        for (let i = 0; i < segCount; i++) {
            const seg = this._ponytailChain[i];

            // Calculate gravity-scaled segment length for this segment
            const segFraction = i / Math.max(1, segCount - 1); // 0 at base, 1 at tip
            const gravityScale = this._getGravityScaleForSegment(segFraction, this._ponytailGravityFactor);
            const segLen = baseSegLen * gravityScale;
            const maxSegLen = baseSegLen; // Clamp to full length when extended

            // Parent position and angle
            let parentX, parentY, parentAngle;
            if (i === 0) {
                parentX = rootX;
                parentY = rootY;
                parentAngle = headWorldAngle + Math.PI; // Points backward from head
            } else {
                const prev = this._ponytailChain[i - 1];
                parentX = prev.x;
                parentY = prev.y;
                parentAngle = prev.angle;
            }

            // Target rest position: extend from parent in parent's angle direction
            const restX = parentX + Math.cos(parentAngle) * segLen;
            const restY = parentY + Math.sin(parentAngle) * segLen;

            // Spring force toward rest position
            const forceX = (restX - seg.x) * spring + inertiaForceX;
            const forceY = (restY - seg.y) * spring + inertiaForceY;

            // Apply forces and drag
            seg.velX = (seg.velX + forceX * deltaTime) * drag;
            seg.velY = (seg.velY + forceY * deltaTime) * drag;
            seg.x += seg.velX * deltaTime;
            seg.y += seg.velY * deltaTime;

            // Enforce distance from parent (constraint) - clamped to max length
            const dx = seg.x - parentX;
            const dy = seg.y - parentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
                // Clamp distance: when moving, allow physics to extend up to max length
                // When stationary, contract toward gravity-scaled length
                const constraintLen = Math.min(Math.max(dist, segLen), maxSegLen);
                seg.x = parentX + (dx / dist) * constraintLen;
                seg.y = parentY + (dy / dist) * constraintLen;
            }

            // Update angle
            seg.angle = Math.atan2(seg.y - parentY, seg.x - parentX);

            // Angle limiting: clamp relative angle to parent
            let relAngle = seg.angle - parentAngle;
            while (relAngle > Math.PI) relAngle -= Math.PI * 2;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;
            if (Math.abs(relAngle) > maxAnglePerSeg) {
                relAngle = Math.sign(relAngle) * maxAnglePerSeg;
                seg.angle = parentAngle + relAngle;
                // Reposition to match clamped angle (use current constrained length)
                const currentDist = Math.sqrt((seg.x - parentX) ** 2 + (seg.y - parentY) ** 2);
                const finalLen = Math.min(Math.max(currentDist, segLen), maxSegLen);
                seg.x = parentX + Math.cos(seg.angle) * finalLen;
                seg.y = parentY + Math.sin(seg.angle) * finalLen;
            }
        }
    }

    /**
     * Calculate the gravity scale for a ponytail segment.
     * When stationary (gravityFactor = 0), segments shrink to simulate laying flat:
     * - Base segments: shrink to ~90% (only 10% shrink)
     * - Tip segments: shrink to ~30% (70% shrink)
     * When moving (gravityFactor = 1), all segments are at 100% (full length).
     * @param {number} segFraction - Position along ponytail (0 = base, 1 = tip)
     * @param {number} gravityFactor - 0 = fully contracted (stationary), 1 = fully extended (moving)
     * @returns {number} Scale factor for segment length (0.3 to 1.0)
     */
    _getGravityScaleForSegment(segFraction, gravityFactor) {
        // Contracted scales: base = 0.9 (10% shrink), tip = 0.3 (70% shrink)
        // Linear interpolation from base to tip
        const baseContractedScale = 0.9; // Base shrinks only 10%
        const tipContractedScale = 0.3;  // Tip shrinks 70%
        const contractedScale = baseContractedScale + (tipContractedScale - baseContractedScale) * segFraction;
        
        // Interpolate between contracted and extended (1.0) based on movement
        return contractedScale + (1.0 - contractedScale) * gravityFactor;
    }

    _updateTailPhysics(deltaTime) {
        if (!this.tailEnabled || !this._segments || this._segments.length === 0) {
            return;
        }

        const lastSeg = this._segments[this._segments.length - 1];
        const segCount = this.tailSegments || 5;
        const segLen = this.tailLength / segCount;
        const spring = this.tailSpring || 22;
        const damping = this.tailDamping || 0.78;
        const elasticity = this.tailElasticity || 0.75;
        const inertia = this.tailInertia || 120;
        const stiffness = this.tailStiffness || 0.3;
        // Tighter angle limits — stiffness 0 = 25° max bend per seg, stiffness 1 = 5°
        const maxAnglePerSeg = Math.PI / 180 * (5 + (1 - stiffness) * 20);

        // Tail root: extends from the back of the last body segment
        const rootAngle = lastSeg.angle + Math.PI; // Points backward
        const rootX = lastSeg.worldPos.x + Math.cos(rootAngle) * this.segmentLength * 0.3;
        const rootY = lastSeg.worldPos.y + Math.sin(rootAngle) * this.segmentLength * 0.3;

        // Initialize chain if needed
        if (!this._tailChain || this._tailChain.length !== segCount) {
            this._tailChain = [];
            for (let i = 0; i < segCount; i++) {
                this._tailChain.push({
                    x: rootX + Math.cos(rootAngle) * segLen * (i + 1),
                    y: rootY + Math.sin(rootAngle) * segLen * (i + 1),
                    angle: rootAngle,
                    velX: 0,
                    velY: 0
                });
            }
        }

        // Inertia force from creature movement (tail trails behind)
        const inertiaForceX = -this._velocity.x * (inertia / 100);
        const inertiaForceY = -this._velocity.y * (inertia / 100);

        // Frame-rate independent damping: convert per-second damping to per-frame
        const dampingPerFrame = Math.pow(damping, deltaTime * 60);

        // Tail waving/wagging
        let waveForceAngle = 0;
        if (this.tailWaveEnabled) {
            const velocityMag = Math.sqrt(this._velocity.x * this._velocity.x + this._velocity.y * this._velocity.y);
            const shouldWave = !this.tailWaveIdleOnly || velocityMag < 2;
            if (shouldWave) {
                this._tailWavePhase += deltaTime * this.tailWaveSpeed * Math.PI * 2;
                if (this._tailWavePhase > Math.PI * 200) this._tailWavePhase -= Math.PI * 200;
            }
        }

        for (let i = 0; i < segCount; i++) {
            const seg = this._tailChain[i];
            const segFraction = i / segCount; // 0 at root, ~1 at tip

            // Parent position and angle (use physics angle, not wave-displaced)
            let parentX, parentY, parentAngle;
            if (i === 0) {
                parentX = rootX;
                parentY = rootY;
                parentAngle = rootAngle;
            } else {
                const prev = this._tailChain[i - 1];
                parentX = prev.x;
                parentY = prev.y;
                parentAngle = prev.physicsAngle !== undefined ? prev.physicsAngle : prev.angle;
            }

            // Target rest position — straight behind parent (no wave here)
            const targetAngle = parentAngle;

            const restX = parentX + Math.cos(targetAngle) * segLen;
            const restY = parentY + Math.sin(targetAngle) * segLen;

            // Spring force toward rest position
            // Elasticity controls how "loose" the tail feels: lower = stiffer spring
            const springStrength = spring * (1 - elasticity * 0.3);
            const forceX = (restX - seg.x) * springStrength + inertiaForceX * (0.3 + segFraction * 0.3);
            const forceY = (restY - seg.y) * springStrength + inertiaForceY * (0.3 + segFraction * 0.3);

            // Apply forces with frame-rate independent damping
            seg.velX = (seg.velX + forceX * deltaTime) * dampingPerFrame;
            seg.velY = (seg.velY + forceY * deltaTime) * dampingPerFrame;
            seg.x += seg.velX * deltaTime;
            seg.y += seg.velY * deltaTime;

            // Enforce fixed distance constraint from parent
            const dx = seg.x - parentX;
            const dy = seg.y - parentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.001) {
                seg.x = parentX + (dx / dist) * segLen;
                seg.y = parentY + (dy / dist) * segLen;
            }

            // Update angle
            seg.angle = Math.atan2(seg.y - parentY, seg.x - parentX);

            // Angle limiting per segment (tighter = more rigid tail)
            let relAngle = seg.angle - parentAngle;
            while (relAngle > Math.PI) relAngle -= Math.PI * 2;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;
            if (Math.abs(relAngle) > maxAnglePerSeg) {
                relAngle = Math.sign(relAngle) * maxAnglePerSeg;
                seg.angle = parentAngle + relAngle;
                seg.x = parentX + Math.cos(seg.angle) * segLen;
                seg.y = parentY + Math.sin(seg.angle) * segLen;
            }

            // Store physics angle before wave displacement
            seg.physicsAngle = seg.angle;

            // Apply wave as POST-PHYSICS angular displacement.
            // This ensures the wave is always visible regardless of inertia/movement.
            // The wave rotates the segment around its parent, not through the spring.
            if (this.tailWaveEnabled) {
                const wavePhase = this.tailWaveCascade
                    ? this._tailWavePhase - i * this.tailWaveCascadeDelay * Math.PI * 2
                    : this._tailWavePhase;
                const waveAmp = this.tailWaveAmplitude * (Math.PI / 180);
                // Amplitude increases toward tip for natural wave look
                const ampScale = 0.3 + segFraction * 0.7;
                const waveOffset = Math.sin(wavePhase) * waveAmp * ampScale;

                // Rotate this segment's position around its parent by waveOffset
                seg.angle = seg.physicsAngle + waveOffset;
                seg.x = parentX + Math.cos(seg.angle) * segLen;
                seg.y = parentY + Math.sin(seg.angle) * segLen;
            }
        }
    }

    /**
     * Get the front offset multiplier for the current head shape.
     * Returns how far forward from center the front of the head extends (as a multiplier of headSize).
     */
    _getHeadFrontOffset() {
        switch (this.headShape) {
            case "circle": return 0.5;
            case "triangle": return 0.35;
            case "rectangle": return 0.5;
            case "diamond": return 0.6;
            case "human": return 0.56;  // len * 0.8 where len = 0.7
            case "alien": return 0.36;  // faceLen * 0.9 where faceLen = 0.4
            case "bulbous": return 0.48; // len * 0.6 where len = 0.8
            case "ellipse":
            default: return 0.7;
        }
    }

    /**
     * Update physics for mouth tentacles (squid-like appendages at the front of the head)
     * Similar to ponytail physics but with multiple chains flowing together,
     * roots at the front of the head facing forward
     */
    _updateMouthTentaclePhysics(deltaTime) {
        if (this.mouthStyle !== "squidTentacles") {
            this._mouthTentacleChains = [];
            return;
        }

        if (!this._segments || this._segments.length === 0) return;
        const head = this._segments[0];
        if (!head || !head.worldPos) return;

        // Ensure velocity exists
        if (!this._velocity) {
            this._velocity = { x: 0, y: 0 };
        }

        const headWorldAngle = head.angle + (this._headAngle || 0);
        const tentacleCount = Math.max(1, Math.min(8, this.mouthTentacleCount || 4));
        const segCount = Math.max(3, Math.min(12, this.mouthTentacleSegments || 6));
        const baseSegLen = (this.mouthTentacleLength || 25) / segCount;
        const spring = this.mouthTentacleSpring || 12;
        const drag = this.mouthTentacleDrag || 0.92;
        const inertia = this.mouthTentacleInertia || 80;
        const stiffness = this.mouthTentacleStiffness || 0.4;
        const spread = (this.mouthTentacleSpread || 60) * Math.PI / 180;
        const headSize = this.headSize || 25;
        
        // Get head-shape-aware front offset
        const headFrontOffset = this._getHeadFrontOffset();

        // More rigid = smaller max angle per segment
        const maxAnglePerSeg = Math.PI * (0.2 + (1 - stiffness) * 0.4);

        // Calculate velocity magnitude to determine if creature is moving
        const velX = this._velocity.x || 0;
        const velY = this._velocity.y || 0;
        const velocityMag = Math.sqrt(velX * velX + velY * velY);
        const isMoving = velocityMag > 5;

        // Gravity factor for "laying flat" simulation (like ponytail)
        // When stationary, tentacles contract; when moving, they extend
        if (this._mouthTentacleGravityFactor === undefined) {
            this._mouthTentacleGravityFactor = isMoving ? 1.0 : 0.0;
        }
        const targetGravityFactor = isMoving ? 1.0 : 0.0;
        const gravityTransitionSpeed = isMoving ? 4.0 : 2.0;
        this._mouthTentacleGravityFactor += (targetGravityFactor - this._mouthTentacleGravityFactor) * gravityTransitionSpeed * deltaTime;
        this._mouthTentacleGravityFactor = Math.max(0, Math.min(1, this._mouthTentacleGravityFactor));

        // Root position (front of head in world space, adjusted for head shape)
        const rootX = head.worldPos.x + Math.cos(headWorldAngle) * headSize * headFrontOffset;
        const rootY = head.worldPos.y + Math.sin(headWorldAngle) * headSize * headFrontOffset;

        // Initialize chains if needed
        if (!this._mouthTentacleChains || this._mouthTentacleChains.length !== tentacleCount) {
            this._mouthTentacleChains = [];
            
            for (let t = 0; t < tentacleCount; t++) {
                // Calculate the angle offset for this tentacle (spread evenly)
                const angleOffset = tentacleCount === 1 
                    ? 0 
                    : ((t / (tentacleCount - 1)) - 0.5) * spread;
                const tentacleAngle = headWorldAngle + angleOffset;
                
                const chain = [];
                let cumulativeDist = 0;
                for (let i = 0; i < segCount; i++) {
                    const segFraction = i / Math.max(1, segCount - 1);
                    const gravityScale = this._getGravityScaleForSegment(segFraction, this._mouthTentacleGravityFactor);
                    const segLen = baseSegLen * gravityScale;
                    cumulativeDist += segLen;
                    
                    chain.push({
                        x: rootX + Math.cos(tentacleAngle) * cumulativeDist,
                        y: rootY + Math.sin(tentacleAngle) * cumulativeDist,
                        angle: tentacleAngle,
                        velX: 0,
                        velY: 0,
                        baseLength: baseSegLen
                    });
                }
                this._mouthTentacleChains.push({
                    segments: chain,
                    baseAngleOffset: angleOffset
                });
            }
        }

        // Inertia force - tentacles trail behind movement (opposite to velocity)
        const inertiaForceX = -velX * (inertia / 100);
        const inertiaForceY = -velY * (inertia / 100);

        // Update each tentacle chain (ponytail-like physics)
        for (let t = 0; t < tentacleCount; t++) {
            const chainData = this._mouthTentacleChains[t];
            if (!chainData || !chainData.segments) continue;
            
            const chain = chainData.segments;
            const baseAngleOffset = chainData.baseAngleOffset;
            
            for (let i = 0; i < chain.length; i++) {
                const seg = chain[i];
                if (!seg) continue;
                
                // Calculate gravity-scaled segment length
                const segFraction = i / Math.max(1, chain.length - 1);
                const gravityScale = this._getGravityScaleForSegment(segFraction, this._mouthTentacleGravityFactor);
                const segLen = baseSegLen * gravityScale;
                const maxSegLen = baseSegLen; // Clamp to full length when extended

                // Parent position and angle
                let parentX, parentY, parentAngle;
                if (i === 0) {
                    parentX = rootX;
                    parentY = rootY;
                    parentAngle = headWorldAngle + baseAngleOffset;
                } else {
                    const prev = chain[i - 1];
                    parentX = prev.x;
                    parentY = prev.y;
                    parentAngle = prev.angle;
                }

                // Rest position: extend from parent in parent's direction
                const restX = parentX + Math.cos(parentAngle) * segLen;
                const restY = parentY + Math.sin(parentAngle) * segLen;

                // Spring force toward rest position
                const forceX = (restX - seg.x) * spring + inertiaForceX;
                const forceY = (restY - seg.y) * spring + inertiaForceY;

                // Apply forces and drag
                seg.velX = (seg.velX + forceX * deltaTime) * drag;
                seg.velY = (seg.velY + forceY * deltaTime) * drag;
                seg.x += seg.velX * deltaTime;
                seg.y += seg.velY * deltaTime;

                // Enforce distance from parent (constraint) - clamped to max length
                const dx = seg.x - parentX;
                const dy = seg.y - parentY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0.001) {
                    const constraintLen = Math.min(Math.max(dist, segLen), maxSegLen);
                    seg.x = parentX + (dx / dist) * constraintLen;
                    seg.y = parentY + (dy / dist) * constraintLen;
                }

                // Update angle
                seg.angle = Math.atan2(seg.y - parentY, seg.x - parentX);

                // Angle limiting: clamp relative angle to parent
                let relAngle = seg.angle - parentAngle;
                while (relAngle > Math.PI) relAngle -= Math.PI * 2;
                while (relAngle < -Math.PI) relAngle += Math.PI * 2;
                if (Math.abs(relAngle) > maxAnglePerSeg) {
                    relAngle = Math.sign(relAngle) * maxAnglePerSeg;
                    seg.angle = parentAngle + relAngle;
                    const currentDist = Math.sqrt((seg.x - parentX) ** 2 + (seg.y - parentY) ** 2);
                    const finalLen = Math.min(Math.max(currentDist, segLen), maxSegLen);
                    seg.x = parentX + Math.cos(seg.angle) * finalLen;
                    seg.y = parentY + Math.sin(seg.angle) * finalLen;
                }
            }
        }

        // Gentle self-collision between tentacles (if enabled) - only on outer segments to avoid jitter
        if (this.mouthTentacleCollision && tentacleCount > 1) {
            const collisionRadius = (this.mouthTentacleThickness || 4) * 0.8;
            const pushStrength = 0.3; // Gentle push to avoid jitter

            for (let t1 = 0; t1 < tentacleCount; t1++) {
                const chain1 = this._mouthTentacleChains[t1];
                if (!chain1 || !chain1.segments) continue;
                
                for (let t2 = t1 + 1; t2 < tentacleCount; t2++) {
                    const chain2 = this._mouthTentacleChains[t2];
                    if (!chain2 || !chain2.segments) continue;
                    
                    // Only check outer half of segments (tips are more likely to collide)
                    const startIdx = Math.floor(chain1.segments.length * 0.4);
                    for (let i = startIdx; i < chain1.segments.length && i < chain2.segments.length; i++) {
                        const seg1 = chain1.segments[i];
                        const seg2 = chain2.segments[i];
                        if (!seg1 || !seg2) continue;
                        
                        const dx = seg2.x - seg1.x;
                        const dy = seg2.y - seg1.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < collisionRadius * 2 && dist > 0.001) {
                            const overlap = collisionRadius * 2 - dist;
                            const pushX = (dx / dist) * overlap * pushStrength;
                            const pushY = (dy / dist) * overlap * pushStrength;
                            
                            // Apply gentle velocity-based push instead of position snap
                            seg1.velX -= pushX * 10;
                            seg1.velY -= pushY * 10;
                            seg2.velX += pushX * 10;
                            seg2.velY += pushY * 10;
                        }
                    }
                }
            }
        }
    }

    _updateDecay(deltaTime) {
        this.decayTimer += deltaTime;

        const decayProgress = Math.min(1.0, this.decayTimer / this.decayMaxTime);

        // Darken color only slightly at the beginning, then stay at that darkness
        // Only darken during the first 30% of decay time, then maintain that color
        const darkenProgress = Math.min(0.3, decayProgress) / 0.3; // 0 to 1 over first 30%
        const colorFade = 1.0 - (darkenProgress * 0.35); // Fade to 65% brightness (only 35% darker)

        // Apply darkening to ORIGINAL colors stored at death, not current colors
        this.bodyColor = this._darkenColor(this.deathBodyColor || this.bodyColor, colorFade);
        if (this.deathHeadColor) {
            this.headColor = this._darkenColor(this.deathHeadColor, colorFade);
        }
        this.eyeColor = this._darkenColor(this.deathEyeColor || this.eyeColor, colorFade);

        // Shrink scale
        const targetScale = 0.01;
        this.gameObject.scale.x = this.originalScale * (1.0 - decayProgress * (1.0 - targetScale));
        this.gameObject.scale.y = this.originalScale * (1.0 - decayProgress * (1.0 - targetScale));

        // Destroy when fully decayed
        if (decayProgress >= 1.0) {
            if (this.gameObject && this.gameObject.destroy) {
                this.gameObject.destroy();
            }
        }
    }

    _darkenColor(color, brightness) {
        // Guard against undefined or invalid color values
        if (!color || typeof color !== 'string') {
            return '#000000'; // Return black as default
        }

        // Parse hex color
        let hex = color.replace('#', '');

        // Validate hex format
        if (hex.length !== 6) {
            //console.warn('Invalid color format:', color);
            return '#000000';
        }

        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // Check for NaN
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            //console.warn('Invalid color hex values:', color);
            return '#000000';
        }

        // Apply brightness
        r = Math.floor(r * brightness);
        g = Math.floor(g * brightness);
        b = Math.floor(b * brightness);

        // Convert back to hex
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    _updateArmIK(deltaTime) {
        if (this.armCount === 0 || this._arms.length === 0) return;

        const head = this._segments[0];
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        // headWorldAngle includes head look - used for determining which side objects are on
        const headWorldAngle = head.angle + this._headAngle;
        // bodySegmentAngle is just the body/shoulder orientation - arms attach here (no head look rotation)
        const bodySegmentAngle = head.angle;

        // Calculate height offset for isometric view
        const isometricRad = this.isometricAngle * Math.PI / 180;
        let heightOffset = -Math.sin(isometricRad) * this.bodyHeight;
        
        // Add 2.5D elevation if enabled - arms attach closer to body (less elevation than legs)
        if (this.enable25DMode && this.bodyElevation > 0) {
            heightOffset -= this.bodyElevation * 0.9; // Arms slightly lower than body center
        }

        // Add depth parallax offset for arms
        const armDepthOffset = this._getDepthOffset(this.armHeightDepth);

        // Check if creature is moving
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        const isMoving = velocityMag > 1;

        // Find interesting objects within reach range
        let interestingObjects = [];
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (_instances) {
            for (let obj of _instances) {
                if (obj === this.gameObject) continue;

                // Check if object has "interesting" tag
                if (obj.tag === "interesting" || obj.name === "interesting") {
                    const dx = obj.position.x - head.worldPos.x;
                    const dy = obj.position.y - head.worldPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= this.armReachRange) {
                        // Calculate which side the object is on relative to creature
                        const objAngle = Math.atan2(dy, dx);
                        let relativeAngle = objAngle - headWorldAngle;

                        // Normalize to -PI to PI
                        while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
                        while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

                        interestingObjects.push({
                            obj: obj,
                            distance: dist,
                            worldX: obj.position.x,
                            worldY: obj.position.y,
                            relativeAngle: relativeAngle,
                            isOnLeft: relativeAngle < 0
                        });
                    }
                }
            }
        }

        // Sort by distance (closest first)
        interestingObjects.sort((a, b) => a.distance - b.distance);

        // === PRE-PASS: Update foregrip and two-handed target positions ===
        // This runs BEFORE the main arm state machine so that off-hand arms know their
        // target positions even if processed before the arm holding the weapon.
        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            
            // Check if this arm holds an item with a foregrip
            if (arm.heldItem && arm.heldItem.gunForegripEnabled && arm.heldItem.isHeld) {
                const foregripPos = arm.heldItem.getForegripWorldPosition();
                if (foregripPos) {
                    // Only the opposing paired arm can grip the foregrip
                    const opposingIndex = this.getOpposingArmIndex(i);
                    if (opposingIndex >= 0) {
                        const otherArm = this._arms[opposingIndex];
                        const alreadyAssigned = (otherArm._foregripSourceArm === i);
                        const canAssign = alreadyAssigned || (
                            !otherArm.heldItem &&
                            otherArm.state !== 'punching' && 
                            otherArm.state !== 'grabbing' &&
                            !otherArm._foregripTarget &&
                            !otherArm._twoHandedTarget
                        );
                        if (canAssign) {
                            // Assign foregrip target to opposing arm
                            otherArm.state = 'holdingItem';
                            otherArm._foregripTarget = foregripPos;
                            otherArm._foregripSourceArm = i;
                        }
                    }
                }
            }
            
            // Check if this arm holds a two-handed item (without foregrip)
            if (arm.heldItem && arm.heldItem.twoHanded && arm.heldItem.isHeld && !arm.heldItem.gunForegripEnabled) {
                const secondHandPos = arm.heldItem.getSecondHandWorldPosition();
                if (secondHandPos) {
                    // Only the opposing paired arm can support two-handed grip
                    const opposingIndex = this.getOpposingArmIndex(i);
                    if (opposingIndex >= 0) {
                        const otherArm = this._arms[opposingIndex];
                        const alreadyAssigned = (otherArm._twoHandedSourceArm === i);
                        const canAssign = alreadyAssigned || (
                            !otherArm.heldItem &&
                            otherArm.state !== 'punching' && 
                            otherArm.state !== 'grabbing' &&
                            !otherArm._foregripTarget &&
                            !otherArm._twoHandedTarget
                        );
                        if (canAssign) {
                            // Assign two-handed target to opposing arm
                            otherArm.state = 'holdingItem';
                            otherArm._twoHandedTarget = secondHandPos;
                            otherArm._twoHandedSourceArm = i;
                        }
                    }
                }
            }
            
            // Clear stale targets if source arm no longer holds the weapon
            if (arm._foregripTarget && arm._foregripSourceArm !== undefined) {
                const sourceArm = this._arms[arm._foregripSourceArm];
                if (!sourceArm || !sourceArm.heldItem || !sourceArm.heldItem.gunForegripEnabled || !sourceArm.heldItem.isHeld) {
                    arm._foregripTarget = null;
                    arm._foregripSourceArm = undefined;
                    if (!arm.heldItem) {
                        arm.state = 'idle';
                    }
                }
            }
            if (arm._twoHandedTarget && arm._twoHandedSourceArm !== undefined) {
                const sourceArm = this._arms[arm._twoHandedSourceArm];
                if (!sourceArm || !sourceArm.heldItem || !sourceArm.heldItem.twoHanded || !sourceArm.heldItem.isHeld) {
                    arm._twoHandedTarget = null;
                    arm._twoHandedSourceArm = undefined;
                    if (!arm.heldItem) {
                        arm.state = 'idle';
                    }
                }
            }
        }

        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            
            // === SAVE CONTACT STATE FROM LAST FRAME ===
            // This happens at the START of arm IK so we have the collision results from 
            // the previous frame's _updateWeaponCollisions (which runs AFTER arm IK).
            arm._weaponSolidContactLastFrame = arm._weaponSolidContact;
            arm._weaponSolidNormalLastFrame = arm._weaponSolidNormal ? { x: arm._weaponSolidNormal.x, y: arm._weaponSolidNormal.y } : null;
            arm._weaponSolidContact = false;
            arm._weaponSolidNormal = null;
            
            const isLeftSide = arm.side === -1;

            // Update swing time when moving
            if (isMoving && this.armSwingEnabled) {
                arm.swingTime += deltaTime * this.armSwingSpeed;
            }

            // Calculate arm base position PERPENDICULAR to body direction (not head look)
            // Arms attach to shoulders which stay fixed relative to the body segment, not rotating with head
            // In 2.5D mode, arms attach closer to the body center
            const perpendicularAngle = bodySegmentAngle + (Math.PI / 2) * arm.side;
            const baseRadius = (this.enable25DMode ? this.headSize * 0.3 : this.headSize * 0.4) * (this.creatureScale || 1.0);
            const baseWorldX = head.worldPos.x + Math.cos(perpendicularAngle) * baseRadius;
            const baseWorldY = head.worldPos.y + Math.sin(perpendicularAngle) * baseRadius + heightOffset;

            // Store base position for drawing
            arm.baseWorldX = baseWorldX;
            arm.baseWorldY = baseWorldY;

            // Calculate natural rest position for this arm
            const armsPerSide = this.armCount / 2;
            let angleDistribution = 0;

            if (armsPerSide > 1) {
                const armPositionOnSide = isLeftSide ? i : i - Math.floor(this.armCount / 2);
                const normalizedPosition = armsPerSide > 1 ? armPositionOnSide / (armsPerSide - 1) : 0;
                angleDistribution = normalizedPosition * 30 * (Math.PI / 180);
            }

            const baseOutwardAngle = this.armRestOutwardAngle * Math.PI / 180;
            const outwardAngleRad = arm.side * (baseOutwardAngle + angleDistribution);

            // Add swing animation when moving (only if idle)
            let swingAngleOffset = 0;
            if (isMoving && this.armSwingEnabled && arm.state === 'idle') {
                const swingPhaseAngle = arm.swingTime + arm.swingPhase;
                swingAngleOffset = Math.sin(swingPhaseAngle) * (this.armSwingAmount * Math.PI / 180);
            }

            // Arms rest relative to body segment angle, not head look direction
            const naturalRestAngle = bodySegmentAngle + outwardAngleRad + swingAngleOffset;
            const naturalRestDistance = this.armLength * this.armRestForwardDistance;
            const naturalRestX = baseWorldX + Math.cos(naturalRestAngle) * naturalRestDistance;
            const naturalRestY = baseWorldY + Math.sin(naturalRestAngle) * naturalRestDistance;

            // Update state machine
            arm.stateTime += deltaTime;
            let targetWorldX = naturalRestX;
            let targetWorldY = naturalRestY;

            switch (arm.state) {
                case 'idle':
                    // Check for automatic reaching or manual control
                    if (!arm.manualControl) {
                        let foundTarget = false;
                        for (let obj of interestingObjects) {
                            const sideMatches = isLeftSide ? obj.isOnLeft : !obj.isOnLeft;
                            if (sideMatches) {
                                arm.reachingTarget = obj.obj;
                                targetWorldX = obj.worldX;
                                targetWorldY = obj.worldY;
                                foundTarget = true;
                                break;
                            }
                        }
                        if (!foundTarget) {
                            arm.reachingTarget = null;
                        }
                    }
                    break;

                case 'punching':
                    // During punching, use body facing angle (not head-look) for arm base
                    // This matches what punchWithArm() uses when initiating the punch
                    const punchPerp = bodyAngle + (Math.PI / 2) * arm.side;
                    const punchBaseRadius = this.enable25DMode ? this.headSize * 0.3 : this.headSize * 0.4;
                    const punchBaseX = head.worldPos.x + Math.cos(punchPerp) * punchBaseRadius;
                    const punchBaseY = head.worldPos.y + Math.sin(punchPerp) * punchBaseRadius + heightOffset;
                    // Update stored base to match (used by drawing and arc swing)
                    arm.baseWorldX = punchBaseX;
                    arm.baseWorldY = punchBaseY;

                    if (arm._isSwinging && arm.heldItem) {
                        // === IK TARGET-BASED ATTACK ===
                        // The arm tries to drive the item's weight offset point toward
                        // a target point in front of the creature. Joint angles are solved
                        // each frame, respecting natural limits. Arm strength vs item weight
                        // creates organic, physically-plausible motion.

                        const swBaseX = punchBaseX;
                        const swBaseY = punchBaseY;
                        const swSide = arm.side;
                        const swStrength = Math.max(0.1, this.getEffectiveArmStrength(i));
                        const swItemWeight = arm._swingItemWeight || 1.0;
                        const swItemBalance = arm._swingItemBalance || 0.5;
                        const swMOI = arm._swingMomentOfInertia || 1.0;
                        const heaviness = swItemWeight * (0.3 + swItemBalance * 0.7) / swStrength;

                        // Account for body rotation since attack started
                        const bodyAngleDelta = bodyAngle - (arm._punchInitialBodyAngle || bodyAngle);

                        // Rotate the IK target and windup positions with the body
                        const cosD = Math.cos(bodyAngleDelta);
                        const sinD = Math.sin(bodyAngleDelta);

                        // Original target relative to where attack started
                        const origTargetDX = arm._ikTargetX - (arm._swingBaseX || swBaseX);
                        const origTargetDY = arm._ikTargetY - (arm._swingBaseY || swBaseY);
                        const rotTargetX = swBaseX + origTargetDX * cosD - origTargetDY * sinD;
                        const rotTargetY = swBaseY + origTargetDX * sinD + origTargetDY * cosD;

                        const attackAngle = arm._ikAttackAngle + bodyAngleDelta;
                        const gripToWeight = arm._ikGripToWeight || 15;
                        const maxArmReach = this.armLength * 0.95;

                        // Update phase time
                        arm._ikPhaseTime += deltaTime;

                        // Calculate the hand target position based on attack phase
                        // The key insight: we want the WEIGHT POINT of the item (not the hand)
                        // to reach the target. So the hand needs to be positioned such that
                        // when the item extends from the grip, its weight point lands on target.

                        if (arm._ikPhase === 'windup') {
                            // Phase 1: WINDUP — Open arm away from body and pull back
                            // Calculates potential muscle energy by coiling
                            const t = Math.min(1.0, arm._ikPhaseTime / arm._ikWindupTime);

                            // Weight-responsive easing: heavier items move more deliberately
                            const windupPower = 1.5 + Math.min(heaviness * 0.6, 1.5);
                            const eased = Math.pow(t, windupPower);

                            // Windup position: arm opens outward and pulls back
                            const windupAngle = arm._ikWindupAngle + bodyAngleDelta;
                            const windupDist = arm._ikWindupDist;

                            // Coiling effect: pull hand inward at peak, heavier = more coil
                            const coilAmount = 0.15 + Math.min(heaviness * 0.1, 0.2);
                            const coilFactor = 1.0 - coilAmount * Math.sin(t * Math.PI);

                            const windupX = swBaseX + Math.cos(windupAngle) * windupDist * coilFactor;
                            const windupY = swBaseY + Math.sin(windupAngle) * windupDist * coilFactor;

                            // Blend from start position to windup position
                            const startX = arm._ikStartHandX;
                            const startY = arm._ikStartHandY;
                            targetWorldX = startX + (windupX - startX) * eased;
                            targetWorldY = startY + (windupY - startY) * eased;

                            arm.punchPower = 0;
                            arm._swingAngularVelocity = 0;
                            arm._swingPrevAngle = Math.atan2(targetWorldY - swBaseY, targetWorldX - swBaseX);

                            if (t >= 1.0) {
                                arm._ikPhase = 'strike';
                                arm._ikPhaseTime = 0;
                                arm._ikStrikeStartX = targetWorldX;
                                arm._ikStrikeStartY = targetWorldY;
                            }
                        } else if (arm._ikPhase === 'strike') {
                            // Phase 2: STRIKE — Sweep the weapon in an arc across the front of the creature
                            // Instead of going in a straight line to the target, we sweep through an arc
                            // that covers the area in front of the creature, hitting anything in that zone.
                            const t = Math.min(1.0, arm._ikPhaseTime / arm._ikStrikeTime);

                            // Explosive acceleration, heavier items take longer to overcome inertia
                            const inertiaPower = 2.0 + Math.min(heaviness * 0.8, 2.0);
                            const eased = 1 - Math.pow(1 - t, inertiaPower);

                            // Get the swing arc angle from the item (defaults to 90 degrees for good coverage)
                            const swingArcAngle = arm._ikSwingArcAngle || (Math.PI * 0.5);
                            
                            // Calculate the start and end angles of the arc swing
                            // The arm starts at windup position (to one side) and swings across to the other side
                            // swSide is -1 for left arm, 1 for right arm
                            // Left arm: swings from right side to left side (clockwise from creature's perspective)
                            // Right arm: swings from left side to right side (counter-clockwise)
                            const arcStartAngle = attackAngle - swSide * swingArcAngle * 0.6; // Start behind the target direction
                            const arcEndAngle = attackAngle + swSide * swingArcAngle * 0.6; // End past the target direction
                            
                            // Interpolate the angle through the arc
                            const currentArcAngle = arcStartAngle + (arcEndAngle - arcStartAngle) * eased;
                            
                            // The hand sweeps at a consistent distance (arm reach) to cover maximum area
                            // Use a slightly extended reach during the peak of the swing
                            const swingReach = maxArmReach * (0.9 + 0.15 * Math.sin(t * Math.PI));
                            
                            // Calculate hand position along the arc
                            targetWorldX = swBaseX + Math.cos(currentArcAngle) * swingReach;
                            targetWorldY = swBaseY + Math.sin(currentArcAngle) * swingReach;

                            // Tip-heavy items extend arm outward more during strike (centrifugal pull)
                            const tipPull = 0.06 + swItemBalance * 0.06;
                            const strikeExtend = 1.0 + tipPull * Math.sin(t * Math.PI);
                            const extDX = targetWorldX - swBaseX;
                            const extDY = targetWorldY - swBaseY;
                            targetWorldX = swBaseX + extDX * strikeExtend;
                            targetWorldY = swBaseY + extDY * strikeExtend;

                            // Punch power calculation (angular speed of swing)
                            const prevT = Math.max(0, (arm._ikPhaseTime - deltaTime) / arm._ikStrikeTime);
                            const prevEased = 1 - Math.pow(1 - prevT, inertiaPower);
                            const angularSpeed = Math.abs((arcEndAngle - arcStartAngle) * (eased - prevEased)) / Math.max(deltaTime, 0.001);
                            arm.punchPower = angularSpeed * swingReach * this.punchSpeed * 0.5;

                            // Track angular velocity for item rotation lag
                            const currentHandAngle = Math.atan2(targetWorldY - swBaseY, targetWorldX - swBaseX);
                            arm._swingAngularVelocity = (currentHandAngle - (arm._swingPrevAngle || currentHandAngle)) / Math.max(deltaTime, 0.001);
                            arm._swingPrevAngle = currentHandAngle;

                            // === CONE-BASED HIT DETECTION at swing midpoint ===
                            // At ~50% through the swing, do a single cone check covering the full swing arc
                            // This is more reliable than per-frame OBB collision and ensures hits register
                            if (!arm._swingHitChecked && t >= 0.4 && t <= 0.7) {
                                arm._swingHitChecked = true;
                                // Calculate item reach: arm length + item length
                                const itemLength = arm.heldItem.itemLength || 30;
                                const coneRadius = swingReach + itemLength + gripToWeight;
                                // Cone covers the full swing arc
                                const coneStartAngle = arcStartAngle;
                                const coneEndAngle = arcEndAngle;
                                this._checkSwingHitsCone(arm, swBaseX, swBaseY, attackAngle, coneStartAngle, coneEndAngle, coneRadius, i);
                            }

                            if (t >= 1.0) {
                                arm._ikPhase = 'followthrough';
                                arm._ikPhaseTime = 0;
                                arm._ikFollowStartX = targetWorldX;
                                arm._ikFollowStartY = targetWorldY;
                                arm._ikFollowStartAngle = currentHandAngle;
                                arm._swingHitChecked = false; // Reset for next swing
                            }
                        } else if (arm._ikPhase === 'followthrough') {
                            // Phase 3: FOLLOW-THROUGH — Momentum carries the arm past the target,
                            // then arm strength pulls it back. Heavy items overshoot more.
                            // swingOvershootAmount controls the intensity of this effect.
                            const t = Math.min(1.0, arm._ikPhaseTime / arm._ikFollowTime);

                            if (t >= 1.0) {
                                // Attack complete — return to holdingItem
                                arm.state = 'holdingItem';
                                arm.stateTime = 0;
                                arm.punchPower = 0;
                                arm._isSwinging = false;
                                arm._isStabbing = false;
                                arm._ikAttack = false;
                                arm._swingAngularVelocity = 0;
                                arm._swingPrevAngle = undefined;
                                arm._lastPunchEndTime = performance.now() / 1000;
                                arm._swingHitSolid = false;
                                arm._backswingColliding = false;
                                arm._backswingHitChecked = false;
                                this._swingHitTargets.clear();
                                break;
                            }

                            // Overshoot: item weight momentum carries past the target
                            // Apply swingOvershootAmount multiplier for more dramatic follow-through
                            const overshootMul = this.swingOvershootAmount || 1.0;
                            const weightPull = swItemWeight * (1.0 + swItemBalance * 0.8) / swStrength;
                            const overshootDist = this.armLength * 0.15 * (1.0 + weightPull * 0.5) * overshootMul;
                            // Decay rate: strong arms decelerate faster, lower overshoot = faster recovery
                            const decayRate = 3.5 * swStrength / Math.max(0.3, swMOI) / Math.max(0.5, overshootMul);
                            const decay = Math.exp(-t * decayRate);
                            // Oscillation: heavy items wobble slower, more overshoot = more wobble
                            const oscFreq = Math.PI * (1.5 + 0.5 / Math.max(0.3, swMOI));
                            const oscillation = Math.sin(t * oscFreq) * overshootDist * decay;
                            
                            // Arc swing continuation: continue the swing arc past the target
                            // This creates a more natural follow-through that continues the swing motion
                            const swingArcAngle = arm._ikSwingArcAngle || Math.PI * 0.5;
                            const arcContinuation = overshootMul > 0.5 ? Math.sin(t * Math.PI * 0.5) * swingArcAngle * 0.3 * overshootMul : 0;
                            const arcAngle = attackAngle + arcContinuation * arm.side;

                            // Blend from follow-start toward natural rest, with oscillation
                            const startX = arm._ikFollowStartX;
                            const startY = arm._ikFollowStartY;
                            const eased = t * t * (3 - 2 * t); // smoothstep

                            // Oscillation direction: along the attack angle (overshoot forward/back)
                            // Plus arc continuation to sweep past the target
                            const oscDirX = Math.cos(arcAngle) * oscillation;
                            const oscDirY = Math.sin(arcAngle) * oscillation;

                            targetWorldX = startX + (naturalRestX - startX) * eased + oscDirX;
                            targetWorldY = startY + (naturalRestY - startY) * eased + oscDirY;

                            // === BACKSWING HIT DETECTION ===
                            // During followthrough, check for hits at reduced damage
                            // Only check if we haven't already done backswing hit check for this swing
                            if (!arm._backswingHitChecked && t >= 0.2 && t <= 0.6 && arm.heldItem) {
                                arm._backswingHitChecked = true;
                                const itemLength = arm.heldItem.itemLength || 30;
                                // Use arm reach for backswing cone (maxArmReach is available in scope)
                                const backswingRadius = maxArmReach + itemLength;
                                // Backswing arc is roughly opposite direction
                                const backswingAngle = Math.atan2(targetWorldY - swBaseY, targetWorldX - swBaseX);
                                const backswingSpread = Math.PI * 0.3; // Narrower than main swing
                                this._checkBackswingHitsCone(arm, swBaseX, swBaseY, backswingAngle, backswingAngle - backswingSpread, backswingAngle + backswingSpread, backswingRadius, i);
                            }

                            arm.punchPower = 0;

                            // Decay angular velocity smoothly for item rotation lag
                            arm._swingAngularVelocity = (arm._swingAngularVelocity || 0) * (1.0 - t * 0.8);
                            arm._swingPrevAngle = Math.atan2(targetWorldY - swBaseY, targetWorldX - swBaseX);
                        }

                    } else {
                        // === LINEAR PUNCH (bare fists) ===
                        // Recompute positions each frame from current body state so the
                        // punch tracks the creature's movement and rotation.
                        const punchDuration = 1.0 / this.punchSpeed;
                        const windupTime = punchDuration * 0.3;
                        const strikeTime = punchDuration * 0.4;
                        const returnTime = punchDuration * 0.3;

                        // Track body rotation since punch started
                        const punchBodyDelta = bodyAngle - (arm._punchInitialBodyAngle || bodyAngle);
                        const curPunchAngle = arm._punchAngle + punchBodyDelta;

                        // Recompute windup and reach positions from current base + rotated punch angle
                        let windupX, windupY, reachX, reachY;

                        if (arm._punchCrossBody) {
                            // Cross-body style
                            const windupSideAngle = curPunchAngle + arm._punchWindupAngleOffset;
                            windupX = punchBaseX + Math.cos(windupSideAngle) * arm._punchWindupDist;
                            windupY = punchBaseY + Math.sin(windupSideAngle) * arm._punchWindupDist;

                            const crossAngle = curPunchAngle + arm._punchCrossAngleOffset;
                            reachX = head.worldPos.x + Math.cos(crossAngle) * (arm._punchReachDist * 0.5) + Math.cos(curPunchAngle) * arm._punchReachDist;
                            reachY = head.worldPos.y + Math.sin(crossAngle) * (arm._punchReachDist * 0.5) + Math.sin(curPunchAngle) * arm._punchReachDist;
                        } else {
                            // Straight punch
                            windupX = punchBaseX + Math.cos(curPunchAngle + Math.PI) * arm._punchWindupDist;
                            windupY = punchBaseY + Math.sin(curPunchAngle + Math.PI) * arm._punchWindupDist;
                            reachX = punchBaseX + Math.cos(curPunchAngle) * arm._punchReachDist;
                            reachY = punchBaseY + Math.sin(curPunchAngle) * arm._punchReachDist;
                        }

                        // For gun recoil (_isFiring), use custom timing and no arc
                        const isGunRecoil = arm._isFiring && arm.heldItem && arm.heldItem.itemType === 'gun';
                        const actualWindupTime = isGunRecoil ? (arm._swingWindupTime || 0) : windupTime;
                        const actualStrikeTime = isGunRecoil ? (arm._swingSlashTime || 0.03) : strikeTime;
                        const actualReturnTime = isGunRecoil ? (arm._swingFollowTime || 0.08) : returnTime;

                        if (arm.stateTime < actualWindupTime) {
                            const t = actualWindupTime > 0 ? arm.stateTime / actualWindupTime : 1;
                            const eased = t * t;
                            // Blend from current hand position toward windup
                            // On first frame stateStartPos is used; recompute start relative to current base
                            targetWorldX = punchBaseX + (windupX - punchBaseX) * eased;
                            targetWorldY = punchBaseY + (windupY - punchBaseY) * eased;
                            arm.punchPower = 0;
                        } else if (arm.stateTime < actualWindupTime + actualStrikeTime) {
                            const t = actualStrikeTime > 0 ? (arm.stateTime - actualWindupTime) / actualStrikeTime : 1;
                            const eased = 1 - Math.pow(1 - t, 3);

                            const prevT = Math.max(0, actualStrikeTime > 0 ? (arm.stateTime - deltaTime - actualWindupTime) / actualStrikeTime : 0);
                            const speed = (eased - prevT) / Math.max(deltaTime, 0.001);
                            arm.punchPower = speed * this.armLength * this.punchSpeed;

                            const lerpX = windupX + (reachX - windupX) * eased;
                            const lerpY = windupY + (reachY - windupY) * eased;

                            // Skip arc offset for gun recoil - just push straight back
                            if (isGunRecoil) {
                                targetWorldX = lerpX;
                                targetWorldY = lerpY;
                            } else {
                                const arcOffset = Math.sin(t * Math.PI) * (this.punchArcAmount * arm.side);
                                const perpAngle = curPunchAngle + Math.PI / 2;

                                targetWorldX = lerpX + Math.cos(perpAngle) * arcOffset;
                                targetWorldY = lerpY + Math.sin(perpAngle) * arcOffset;
                            }

                            // === BARE-FIST HIT DETECTION ===
                            // If no weapon is held, check if the fist hits any creature
                            if (!arm.heldItem && this.punchDamage > 0 && arm.punchPower > 0.5) {
                                this._checkPunchHits(arm, targetWorldX, targetWorldY, i);
                            }
                        } else {
                            const t = actualReturnTime > 0 ? (arm.stateTime - actualWindupTime - actualStrikeTime) / actualReturnTime : 1;
                            if (t >= 1) {
                                arm.state = arm.heldItem ? 'holdingItem' : 'idle';
                                arm.stateTime = 0;
                                arm.punchPower = 0;
                                arm._lastPunchEndTime = performance.now() / 1000;
                                // For gun auto-fire: the item's loop() handles continuous firing
                                // via _triggerHeld. We just need to return to holdingItem so
                                // the gun arm aiming IK takes over again between shots.
                                if (arm._isFiring && arm.heldItem && arm.heldItem.itemType === 'gun') {
                                    arm._isFiring = false; // Reset per-shot flag
                                }
                            } else {
                                const eased = t * t;
                                targetWorldX = reachX + (naturalRestX - reachX) * eased;
                                targetWorldY = reachY + (naturalRestY - reachY) * eased;
                                arm.punchPower = 0;
                            }
                        }
                    }
                    break;

                case 'grabbing':
                    // Move toward grab target
                    const grabReachTime = 1.0 / this.grabSpeed;

                    if (arm.stateTime < grabReachTime) {
                        const t = arm.stateTime / grabReachTime;
                        const eased = 1 - Math.pow(1 - t, 2); // Ease out
                        targetWorldX = arm.stateStartPos.x + (arm.grabTargetPos.x - arm.stateStartPos.x) * eased;
                        targetWorldY = arm.stateStartPos.y + (arm.grabTargetPos.y - arm.stateStartPos.y) * eased;
                    } else {
                        // Reached target - check if there's an item to pick up
                        if (arm._pendingItem && !arm._pendingItem.isHeld) {
                            this.pickUpItem(i, arm._pendingItem);
                            arm._pendingItem = null;
                            // state is now 'holdingItem', handled below
                        } else if (arm._emptyGrab) {
                            // Nothing to grab - skip hold phase, return hand immediately
                            arm._pendingItem = null;
                            arm._emptyGrab = false;
                            arm.state = 'returning';
                            arm.stateTime = 0;
                            arm.stateStartPos.x = arm.currentHandPos.x;
                            arm.stateStartPos.y = arm.currentHandPos.y;
                        } else {
                            arm._pendingItem = null;
                            // Switch to holding (timed)
                            arm.state = 'holding';
                            arm.stateTime = 0;
                            arm.grabHoldTimer = 0;
                        }
                    }
                    break;

                case 'holding':
                    // Hold at grab position
                    targetWorldX = arm.grabTargetPos.x;
                    targetWorldY = arm.grabTargetPos.y;

                    arm.grabHoldTimer += deltaTime;
                    if (arm.grabHoldTimer >= this.grabHoldTime) {
                        // Start returning
                        arm.state = 'returning';
                        arm.stateTime = 0;

                        arm.stateStartPos.x = arm.currentHandPos.x;
                        arm.stateStartPos.y = arm.currentHandPos.y;
                    }
                    break;

                case 'returning':
                    // Return to rest position
                    const returnDuration = 1.0 / this.grabSpeed;

                    if (arm.stateTime < returnDuration) {
                        const t = arm.stateTime / returnDuration;
                        const eased = t * t; // Ease in
                        targetWorldX = arm.stateStartPos.x + (naturalRestX - arm.stateStartPos.x) * eased;
                        targetWorldY = arm.stateStartPos.y + (naturalRestY - arm.stateStartPos.y) * eased;
                    } else {
                        // Finished returning
                        arm.state = 'idle';
                        arm.stateTime = 0;
                    }
                    break;

                case 'holdingItem':
                    // Arm is holding an item - keep hand at natural rest position
                    // The item will follow the hand position
                    if (arm.heldItem) {
                        // Check if gun is reloading - apply reload animation
                        if (arm._reloadingGun && arm._reloadProgress !== undefined) {
                            // Reload animation: pull arm back toward body, then return
                            // Use a sine wave for smooth in-out motion
                            const reloadProg = arm._reloadProgress;
                            
                            // Phase 1 (0-0.5): Pull gun back toward body/shoulder
                            // Phase 2 (0.5-1): Return gun to forward position
                            let reloadOffset;
                            if (reloadProg < 0.5) {
                                // Pulling back - ease in
                                const t = reloadProg * 2; // 0 to 1
                                reloadOffset = Math.sin(t * Math.PI * 0.5); // 0 to 1
                            } else {
                                // Returning forward - ease out
                                const t = (reloadProg - 0.5) * 2; // 0 to 1
                                reloadOffset = Math.cos(t * Math.PI * 0.5); // 1 to 0
                            }
                            
                            // Calculate pullback direction (toward shoulder/body)
                            const toBaseX = arm.baseWorldX - targetWorldX;
                            const toBaseY = arm.baseWorldY - targetWorldY;
                            const pullbackDist = this.armLength * 0.6 * reloadOffset; // Increased from 0.4 to 0.6
                            const pullbackLen = Math.sqrt(toBaseX * toBaseX + toBaseY * toBaseY);
                            
                            if (pullbackLen > 0) {
                                targetWorldX += (toBaseX / pullbackLen) * pullbackDist;
                                targetWorldY += (toBaseY / pullbackLen) * pullbackDist;
                                
                                // Also add a slight downward motion for realism
                                targetWorldY += reloadOffset * 20; // Increased from 15 to 20
                                
                                // Add slight inward rotation (toward body center)
                                targetWorldX += reloadOffset * 10 * -arm.side;
                            }
                        }
                        
                        // Calculate arm direction angle (base→hand) so item is hand-relative
                        const armDirAngle = Math.atan2(
                            arm.currentHandPos.y - arm.baseWorldY,
                            arm.currentHandPos.x - arm.baseWorldX
                        );
                        arm.heldItem.updateHeldPosition(
                            arm.currentHandPos.x,
                            arm.currentHandPos.y,
                            armDirAngle,
                            arm.side
                        );
                    } else if (arm._foregripTarget) {
                        // This arm is supporting a foregrip - use foregrip position as target
                        targetWorldX = arm._foregripTarget.x;
                        targetWorldY = arm._foregripTarget.y;
                    } else if (arm._twoHandedTarget) {
                        // This arm is supporting a two-handed weapon - use second grip as target
                        targetWorldX = arm._twoHandedTarget.x;
                        targetWorldY = arm._twoHandedTarget.y;
                    } else {
                        // Not holding anything and not supporting another weapon - go idle
                        arm.state = 'idle';
                        arm.stateTime = 0;
                    }
                    // If arm has foregrip or two-handed target, stay in holdingItem state
                    // The foregrip/two-handed code below will drive the hand position
                    break;

                case 'throwing':
                    // Throwing animation: windup (pull back) -> release (throw forward)
                    // Similar to punching but releases the item during the forward swing
                    if (!arm.heldItem) {
                        // No item to throw, return to idle
                        arm.state = 'idle';
                        arm.stateTime = 0;
                        break;
                    }

                    const throwDuration = 1.0 / this.punchSpeed; // Use punch speed for consistency
                    const throwWindupTime = throwDuration * 0.35;  // Longer windup for throw
                    const throwReleaseTime = throwDuration * 0.25; // Quick release
                    const throwFollowTime = throwDuration * 0.4;   // Follow-through

                    // Track body rotation since throw started
                    const throwBodyDelta = bodyAngle - (arm._throwInitialBodyAngle || bodyAngle);
                    const curThrowAngle = arm._throwAngle + throwBodyDelta;

                    // Calculate base position (matches punch logic)
                    const throwPerp = bodyAngle + (Math.PI / 2) * arm.side;
                    const throwBaseRadius = this.enable25DMode ? this.headSize * 0.3 : this.headSize * 0.4;
                    const throwBaseX = head.worldPos.x + Math.cos(throwPerp) * throwBaseRadius;
                    const throwBaseY = head.worldPos.y + Math.sin(throwPerp) * throwBaseRadius + heightOffset;
                    arm.baseWorldX = throwBaseX;
                    arm.baseWorldY = throwBaseY;

                    // Windup pulls back (like punch windup)
                    const throwWindupDist = this.armLength * (this.punchWindupDistance + 0.1); // Extra windup for throw
                    const throwReachDist = this.armLength * this.punchReachDistance;

                    // Calculate windup and release positions
                    const throwWindupAngle = curThrowAngle + Math.PI; // Behind
                    const throwWindupX = throwBaseX + Math.cos(throwWindupAngle) * throwWindupDist;
                    const throwWindupY = throwBaseY + Math.sin(throwWindupAngle) * throwWindupDist;
                    const throwReachX = throwBaseX + Math.cos(curThrowAngle) * throwReachDist;
                    const throwReachY = throwBaseY + Math.sin(curThrowAngle) * throwReachDist;

                    if (arm.stateTime < throwWindupTime) {
                        // Windup phase: pull arm back
                        const t = arm.stateTime / throwWindupTime;
                        const eased = t * t; // Ease in
                        targetWorldX = throwBaseX + (throwWindupX - throwBaseX) * eased;
                        targetWorldY = throwBaseY + (throwWindupY - throwBaseY) * eased;
                    } else if (arm.stateTime < throwWindupTime + throwReleaseTime) {
                        // Release phase: swing forward and release item
                        const t = (arm.stateTime - throwWindupTime) / throwReleaseTime;
                        const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic for fast release

                        // Interpolate from windup to reach
                        targetWorldX = throwWindupX + (throwReachX - throwWindupX) * eased;
                        targetWorldY = throwWindupY + (throwReachY - throwWindupY) * eased;

                        // Release item at the peak of the throw (around 50-70% through release phase)
                        if (t >= 0.5 && arm.heldItem && !arm._throwReleased) {
                            arm._throwReleased = true;
                            
                            // Calculate throw velocity based on arm strength, item weight, and base throw speed
                            const item = arm.heldItem;
                            const baseThrowSpeed = arm._throwSpeed || 300;
                            
                            // Ensure we have valid weight and strength values
                            const itemWeight = Math.max(0.1, item.weight || 1.0);
                            const armStrength = Math.max(0.1, this.getEffectiveArmStrength(i));
                            
                            // Light items fly faster, heavy items slower (inverse relationship)
                            // Use inverse sqrt so: weight 0.1 → 3.16x, weight 1.0 → 1x, weight 5.0 → 0.45x
                            const weightFactor = 1.0 / Math.sqrt(itemWeight);
                            
                            // Stronger arms throw faster (direct relationship)
                            // sqrt so: strength 0.5 → 0.71x, strength 1.0 → 1x, strength 2.0 → 1.41x
                            const strengthFactor = Math.sqrt(armStrength);
                            
                            // Combine factors and clamp to reasonable range
                            const speedMultiplier = Math.max(0.5, Math.min(3.0, weightFactor * strengthFactor));
                            const finalThrowSpeed = baseThrowSpeed * speedMultiplier;
                            
                            // Calculate spin based on item weight and arm side
                            // Heavier items spin slower (inverse sqrt relationship)
                            const baseSpin = 720 * arm.side; // Degrees per second
                            const spinSpeed = baseSpin / Math.max(0.5, Math.sqrt(itemWeight));
                            
                            // Throw direction (forward)
                            const throwDirX = arm._throwDirX || Math.cos(curThrowAngle);
                            const throwDirY = arm._throwDirY || Math.sin(curThrowAngle);
                            
                            // Apply forward offset to item's position so it doesn't hit the thrower
                            const forwardOffset = arm._throwForwardOffset || 0;
                            if (forwardOffset > 0 && item.gameObject && item.gameObject.position) {
                                item.gameObject.position.x += throwDirX * forwardOffset;
                                item.gameObject.position.y += throwDirY * forwardOffset;
                            }
                            
                            // Call onThrown on the item, passing thrower ID so it won't damage the thrower
                            if (typeof item.onThrown === 'function') {
                                const throwerId = this.gameObject._id || this.gameObject.id;
                                item.onThrown(throwDirX * finalThrowSpeed, throwDirY * finalThrowSpeed, spinSpeed, throwerId);
                            } else {
                                item.onDropped();
                            }
                            
                            // Clear the held item
                            arm.heldItem = null;
                        }
                    } else {
                        // Follow-through phase: arm returns to rest
                        const t = (arm.stateTime - throwWindupTime - throwReleaseTime) / throwFollowTime;
                        if (t >= 1) {
                            arm.state = 'idle';
                            arm.stateTime = 0;
                            arm._throwReleased = false;
                        } else {
                            const eased = t * t;
                            targetWorldX = throwReachX + (naturalRestX - throwReachX) * eased;
                            targetWorldY = throwReachY + (naturalRestY - throwReachY) * eased;
                        }
                    }
                    break;
            }

            // Update held item position even during non-holdingItem states (e.g. punching with item)
            // During arc swings, add weight-based rotational lag so heavy tip-weighted items
            // visually trail behind the arm rotation and overshoot during deceleration
            if (arm.heldItem && arm.state !== 'holdingItem') {
                let armDirAngle2 = Math.atan2(
                    arm.currentHandPos.y - arm.baseWorldY,
                    arm.currentHandPos.x - arm.baseWorldX
                );
                // Apply weight-based rotational lag during arc swings
                if (arm._isSwinging && arm._swingAngularVelocity !== undefined) {
                    const lagWeight = (arm._swingItemWeight || 1.0);
                    const lagBalance = (arm._swingItemBalance || 0.5);
                    const lagStrength = Math.max(0.1, this.getEffectiveArmStrength(i));
                    // Lag factor: heavier tip-weighted items trail a few degrees behind arm rotation
                    // _swingAngularVelocity is in rad/s, so scale down heavily to get a subtle offset
                    const lagFactor = lagWeight * (0.2 + lagBalance * 0.6) * 0.003 / lagStrength;
                    // Clamp the lag to at most ~15 degrees (0.26 rad) so it never spins wildly
                    const lagOffset = arm._swingAngularVelocity * lagFactor;
                    armDirAngle2 -= Math.max(-0.26, Math.min(0.26, lagOffset));
                }
                arm.heldItem.updateHeldPosition(
                    arm.currentHandPos.x,
                    arm.currentHandPos.y,
                    armDirAngle2,
                    arm.side
                );
            }

            // === FOREGRIP: If this arm's held item has a foregrip, pull the off-hand to it ===
            if (arm.heldItem && arm.heldItem.gunForegripEnabled && arm.heldItem.isHeld) {
                const foregripPos = arm.heldItem.getForegripWorldPosition();
                if (foregripPos) {
                    // Only the opposing paired arm can grip the foregrip
                    const opposingIndex = this.getOpposingArmIndex(i);
                    if (opposingIndex >= 0) {
                        const otherArm = this._arms[opposingIndex];
                        // If this arm is already assigned to grip THIS gun's foregrip, keep it tracking
                        const alreadyAssigned = (otherArm._foregripSourceArm === i);
                        const canAssign = alreadyAssigned || (
                            !otherArm.heldItem &&
                            otherArm.state !== 'punching' && 
                            otherArm.state !== 'grabbing' &&
                            !otherArm._foregripTarget &&
                            !otherArm._twoHandedTarget
                        );
                        if (canAssign) {
                            // Drive this arm's target to the foregrip position
                            otherArm.state = 'holdingItem';
                            otherArm._foregripTarget = foregripPos;
                            otherArm._foregripSourceArm = i; // track which arm holds the gun
                            otherArm.targetHandPos.x = foregripPos.x;
                            otherArm.targetHandPos.y = foregripPos.y;
                            // Smoothly move hand toward foregrip — use higher speed for gun stability
                            const fgDx = foregripPos.x - otherArm.currentHandPos.x;
                            const fgDy = foregripPos.y - otherArm.currentHandPos.y;
                            const fgDist = Math.sqrt(fgDx * fgDx + fgDy * fgDy);
                            if (fgDist > 0.5) {
                                // Faster tracking for two-handed grip (stiff IK feel)
                                const speed = 20 * deltaTime;
                                const factor = Math.min(1, speed / fgDist);
                                otherArm.currentHandPos.x += fgDx * factor;
                                otherArm.currentHandPos.y += fgDy * factor;
                            } else {
                                // Lock directly to foregrip when close enough
                                otherArm.currentHandPos.x = foregripPos.x;
                                otherArm.currentHandPos.y = foregripPos.y;
                            }
                        }
                    }
                }
            }

            // === TWO-HANDED ITEMS: If this arm's held item is twoHanded, pull the off-hand to it ===
            if (arm.heldItem && arm.heldItem.twoHanded && arm.heldItem.isHeld && !arm.heldItem.gunForegripEnabled) {
                const secondHandPos = arm.heldItem.getSecondHandWorldPosition();
                if (secondHandPos) {
                    // Only the opposing paired arm can support two-handed grip
                    const opposingIndex = this.getOpposingArmIndex(i);
                    if (opposingIndex >= 0) {
                        const otherArm = this._arms[opposingIndex];
                        // If this arm is already assigned to grip THIS two-handed weapon, keep it tracking
                        const alreadyAssigned = (otherArm._twoHandedSourceArm === i);
                        const canAssign = alreadyAssigned || (
                            !otherArm.heldItem &&
                            otherArm.state !== 'punching' && 
                            otherArm.state !== 'grabbing' &&
                            !otherArm._foregripTarget &&
                            !otherArm._twoHandedTarget
                        );
                        if (canAssign) {
                            // Drive this arm's target to the second grip position
                            otherArm.state = 'holdingItem';
                            otherArm._twoHandedTarget = secondHandPos;
                            otherArm._twoHandedSourceArm = i; // track which arm holds the main item
                            otherArm.targetHandPos.x = secondHandPos.x;
                            otherArm.targetHandPos.y = secondHandPos.y;
                            // Smoothly move hand toward second grip
                            const thDx = secondHandPos.x - otherArm.currentHandPos.x;
                            const thDy = secondHandPos.y - otherArm.currentHandPos.y;
                            const thDist = Math.sqrt(thDx * thDx + thDy * thDy);
                            if (thDist > 0.5) {
                                // Faster tracking for two-handed grip (stiff IK feel)
                                const speed = 18 * deltaTime;
                                const factor = Math.min(1, speed / thDist);
                                otherArm.currentHandPos.x += thDx * factor;
                                otherArm.currentHandPos.y += thDy * factor;
                            } else {
                                // Lock directly to second grip when close enough
                                otherArm.currentHandPos.x = secondHandPos.x;
                                otherArm.currentHandPos.y = secondHandPos.y;
                            }
                        }
                    }
                }
            }

            // === AUTOMATIC FIRE RECOIL DETECTION ===
            // For automatic weapons, detect when the gun fires and trigger a recoil animation
            // This ensures each shot has visible arm recoil, not just the gun's _recoilCurrent offset
            if (arm.heldItem && arm.heldItem.itemType === 'gun' && 
                arm.heldItem.fireMode === 'automatic' && arm.heldItem._triggerHeld &&
                arm.state !== 'punching') {
                // Check if gun just fired (recoilCurrent was just set high)
                // We track last known cooldown to detect when a new shot occurs
                const item = arm.heldItem;
                const shotInterval = 1.0 / (item.fireRate || 5);
                
                // If _recoilCurrent is high (just fired) and we're not already animating recoil
                if (item._recoilCurrent > item.recoilAmount * 0.8) {
                    // Check if enough time passed since last auto-recoil animation
                    const now = performance.now() / 1000;
                    if (!arm._lastAutoRecoilTime || (now - arm._lastAutoRecoilTime) > shotInterval * 0.5) {
                        arm._lastAutoRecoilTime = now;
                        
                        // Trigger quick recoil animation
                        arm.state = 'punching';
                        arm.stateTime = 0;
                        arm._isSwinging = false;
                        arm._isFiring = true;
                        // Clamp recoil to a small straight-back nudge — gun visual already handles most of it
                        const maxArmRecoil = this.armLength * 0.08; // Never more than 8% of arm length
                        const rawRecoil = (item.recoilAmount || 8) * (item.recoilArmKickback || 0.3) * 0.25;
                        arm._punchWindupDist = 0;
                        arm._punchReachDist = 0; // fireProjectile() already physically moved the hand; don't add more
                        arm._swingWindupTime = 0;
                        arm._swingSlashTime = 0;
                        arm._swingFollowTime = 0;
                        
                        // Store punch angle for animation (aim direction)
                        if (arm._pointTarget) {
                            arm._punchAngle = Math.atan2(
                                arm._pointTarget.y - arm.baseWorldY,
                                arm._pointTarget.x - arm.baseWorldX
                            );
                        } else {
                            arm._punchAngle = bodyAngle;
                        }
                        arm._punchInitialBodyAngle = bodyAngle;
                    }
                }
            }

            // === GUN ARM AIMING: override target to aim gun toward mouse, point target, targeting target, or forward ===
            // Priority: 1) handPointTo target  2) autonomous targeting target  3) faceMouse  4) body forward
            if (this.gunArmAiming && arm.heldItem && arm.heldItem.itemType === 'gun' &&
                (arm.state === 'holdingItem' || arm.state === 'idle')) {
                let aimAngle = null;

                // Priority 1: External point-to target (set via handPointTo from controller)
                if (arm._pointTarget) {
                    aimAngle = Math.atan2(
                        arm._pointTarget.y - arm.baseWorldY,
                        arm._pointTarget.x - arm.baseWorldX
                    );
                }
                // Priority 2: Autonomous targeting target (AI creatures)
                else if (this._targetingTarget && this._targetingTarget.position && this.targetingEnabled) {
                    // Get target position
                    let targetX = this._targetingTarget.position.x;
                    let targetY = this._targetingTarget.position.y;
                    
                    // Apply lead prediction if gunAccuracy > 0
                    // Accounts for BOTH target velocity AND our own velocity for proper ballistic calculation
                    if (this.gunAccuracy > 0 && arm.heldItem && arm.heldItem.projectileSpeed) {
                        // Get target velocity (try multiple sources)
                        let targetVelX = 0;
                        let targetVelY = 0;
                        
                        // Check for ProceduralCreature module with velocity tracking
                        const targetCreature = this._targetingTarget.getModule ? 
                            this._targetingTarget.getModule('ProceduralCreature') : null;
                        if (targetCreature && targetCreature._velocity) {
                            targetVelX = targetCreature._velocity.x || 0;
                            targetVelY = targetCreature._velocity.y || 0;
                        }
                        // Fallback: check gameObject velocity
                        else if (this._targetingTarget.velocity) {
                            targetVelX = this._targetingTarget.velocity.x || 0;
                            targetVelY = this._targetingTarget.velocity.y || 0;
                        }
                        
                        // Get our own velocity for proper relative velocity calculation
                        let myVelX = 0;
                        let myVelY = 0;
                        if (this._velocity) {
                            myVelX = this._velocity.x || 0;
                            myVelY = this._velocity.y || 0;
                        }
                        
                        // Calculate RELATIVE velocity (target velocity minus our velocity)
                        // This accounts for the fact that if we're both moving the same direction,
                        // less lead is needed; if moving toward each other, more lead
                        const relVelX = targetVelX - myVelX;
                        const relVelY = targetVelY - myVelY;
                        
                        // Only calculate lead if there's significant relative motion
                        const relSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
                        if (relSpeed > 5) { // Minimum movement threshold
                            // Calculate distance to target
                            const dx = targetX - arm.baseWorldX;
                            const dy = targetY - arm.baseWorldY;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Calculate time for bullet to reach target's current position
                            // This is an approximation - true solution requires solving quadratic
                            const bulletSpeed = arm.heldItem.projectileSpeed;
                            
                            // Use iterative approximation for better accuracy:
                            // First estimate: simple time = distance / bullet speed
                            let timeToTarget = distance / bulletSpeed;
                            
                            // Refine estimate accounting for target movement
                            // (2 iterations is usually enough for good accuracy)
                            for (let i = 0; i < 2; i++) {
                                const predictedX = targetX + relVelX * timeToTarget;
                                const predictedY = targetY + relVelY * timeToTarget;
                                const newDx = predictedX - arm.baseWorldX;
                                const newDy = predictedY - arm.baseWorldY;
                                const newDist = Math.sqrt(newDx * newDx + newDy * newDy);
                                timeToTarget = newDist / bulletSpeed;
                            }
                            
                            // Predict where target will be when bullet arrives
                            // Apply gunAccuracy as interpolation factor (0 = no lead, 1 = perfect lead)
                            const leadX = relVelX * timeToTarget * this.gunAccuracy;
                            const leadY = relVelY * timeToTarget * this.gunAccuracy;
                            
                            // Aim at predicted position
                            targetX += leadX;
                            targetY += leadY;
                        }
                    }
                    
                    aimAngle = Math.atan2(
                        targetY - arm.baseWorldY,
                        targetX - arm.baseWorldX
                    );
                }
                // Priority 3: FaceMouse is active (NOT lock-on targeting)
                else if (this._controllerFaceMouse) {
                    const _eng = this.gameObject._engine;
                    let mx, my;
                    if (_eng && _eng.inputManager) {
                        mx = _eng.inputManager.mouseX;
                        my = _eng.inputManager.mouseY;
                    }
                    if (mx !== undefined && my !== undefined) {
                        aimAngle = Math.atan2(my - arm.baseWorldY, mx - arm.baseWorldX);
                    }
                }

                if (aimAngle === null) {
                    // No target and no mouse — aim forward along body angle
                    aimAngle = bodyAngle;
                }

                // Clamp aim angle to arm limits (prevent aiming behind the creature)
                let relativeAim = aimAngle - bodyAngle;
                while (relativeAim > Math.PI) relativeAim -= Math.PI * 2;
                while (relativeAim < -Math.PI) relativeAim += Math.PI * 2;
                
                // Apply per-arm angle limits
                // arm.side: -1 = left arm, 1 = right arm
                // Left arm (side=-1): can aim more to the left (negative angles), limited aiming right (positive = cross-body)
                // Right arm (side=1): can aim more to the right (positive angles), limited aiming left (negative = cross-body)
                const maxAimAngle = this.gunAimMaxAngle * Math.PI / 180;
                const crossBodyLimit = this.gunCrossBodyAngleLimit * Math.PI / 180;
                
                let minAngle, maxAngle;
                if (arm.side === -1) {
                    // Left arm: can aim freely to the left, limited crossing to right
                    minAngle = -maxAimAngle; // Full range to the left
                    maxAngle = crossBodyLimit; // Limited crossing to the right (cross-body)
                } else {
                    // Right arm: can aim freely to the right, limited crossing to left
                    minAngle = -crossBodyLimit; // Limited crossing to the left (cross-body)
                    maxAngle = maxAimAngle; // Full range to the right
                }
                
                relativeAim = Math.max(minAngle, Math.min(maxAngle, relativeAim));
                aimAngle = bodyAngle + relativeAim;

                // Extend the arm straighter for aiming: use a higher forward distance
                // so the gun arm looks outstretched and pointing
                const gunAimExtend = Math.min(0.95, this.armRestForwardDistance + 0.25);
                const aimDist = this.armLength * gunAimExtend;
                targetWorldX = arm.baseWorldX + Math.cos(aimAngle) * aimDist;
                targetWorldY = arm.baseWorldY + Math.sin(aimAngle) * aimDist;

                // Apply current recoil offset to the target (arm bounces back then recovers)
                if (arm.heldItem._recoilCurrent > 0) {
                    const recoilPush = arm.heldItem._recoilCurrent * arm.heldItem.recoilArmKickback;
                    targetWorldX -= Math.cos(aimAngle) * recoilPush;
                    targetWorldY -= Math.sin(aimAngle) * recoilPush;
                }
            }

            // Store target position
            arm.targetHandPos.x = targetWorldX;
            arm.targetHandPos.y = targetWorldY;

            // === HANDLE PERSISTENT SOLID CONTACT ===
            // If arm was in contact with solid last frame, constrain spring behavior
            // to prevent vibration (fighting in/out of the solid each frame).
            const isAttackingForContact = arm._isSwinging || arm._isStabbing || arm.state === 'punching' || arm.state === 'grabbing';
            
            if (arm._weaponSolidContactLastFrame && arm._weaponSolidNormalLastFrame && !isAttackingForContact) {
                // Project the target onto the surface plane (can slide along, not through)
                // Vector from current hand to target
                const toTarget_x = arm.targetHandPos.x - arm.currentHandPos.x;
                const toTarget_y = arm.targetHandPos.y - arm.currentHandPos.y;
                const dotNormal = toTarget_x * arm._weaponSolidNormalLastFrame.x + toTarget_y * arm._weaponSolidNormalLastFrame.y;
                
                // If target is on the solid side (negative dot = moving into solid), slide along surface
                if (dotNormal < 0) {
                    arm.targetHandPos.x -= arm._weaponSolidNormalLastFrame.x * dotNormal;
                    arm.targetHandPos.y -= arm._weaponSolidNormalLastFrame.y * dotNormal;
                }
            }

            // Initialize hand position if needed
            if (!arm.initialized) {
                arm.currentHandPos.x = targetWorldX;
                arm.currentHandPos.y = targetWorldY;
                arm.handVelocity.x = 0;
                arm.handVelocity.y = 0;
                arm.initialized = true;
            }

            // Spring physics for smooth movement (stronger during states)
            const dx = arm.targetHandPos.x - arm.currentHandPos.x;
            const dy = arm.targetHandPos.y - arm.currentHandPos.y;

            // Increase stiffness during active states for more responsive movement
            let stiffnessMultiplier = (arm.state === 'punching' || arm.state === 'grabbing') ? 2.5 : 1.0;
            let dampingValue = this.armSpringDamping;
            
            // For foregrip/two-handed support arms, use very high stiffness and low damping
            // to make them snap tightly to the grip position without lag or oscillation
            if (arm._foregripTarget || arm._twoHandedTarget) {
                stiffnessMultiplier = 4.0; // Very stiff spring for tight tracking
                dampingValue = 0.1; // Low damping = high friction = less oscillation
                // Also kill any residual velocity to prevent fighting the grip
                arm.handVelocity.x *= 0.5;
                arm.handVelocity.y *= 0.5;
            }

            // Weight influence from held items (top-down: no gravity, only inertia)
            // Heavy items resist direction changes, overshoot on stops, and sway more.
            // Tip-heavy items (weightBalance→1) amplify these effects via torque.
            // armStrength counters these effects — strong arms handle heavy items better.
            // Two-handed items double the effective arm strength.
            if (arm.heldItem && arm.heldItem.weight !== undefined) {
                const itemWeight = arm.heldItem.weight || 1.0;
                const torque = (typeof arm.heldItem.getTorqueFactor === 'function') ? arm.heldItem.getTorqueFactor() : 1.0;
                const strengthFactor = Math.max(0.1, this.getEffectiveArmStrength(i));

                // Inertia factor: heavy tip-heavy items feel sluggish to move
                // weight 1 = normal, 5 = noticeably heavy, 10 = very sluggish
                // armStrength reduces effective inertia (strong arms handle heavy items)
                const inertia = 1.0 + (itemWeight - 1.0) * 0.2 * (1.0 + torque) / strengthFactor;

                // Reduce stiffness by inertia → arm lags behind target more
                stiffnessMultiplier /= inertia;

                // INCREASE damping (toward 1.0) → velocity is retained more → overshoot & oscillation
                // dampingValue ~0.2 means 80% velocity lost. Moving it toward 1.0 = less friction = momentum carry.
                // Heavy + tip-heavy items carry more momentum through direction changes.
                // armStrength reduces momentum carry — strong arms stop heavy items faster.
                const dampingBoost = Math.min(0.6, (itemWeight - 1.0) * 0.06 * (1.0 + torque * 0.5) / strengthFactor);
                dampingValue = Math.min(0.95, dampingValue + dampingBoost);
            }

            const springForceX = dx * this.armSpringStiffness * stiffnessMultiplier;
            const springForceY = dy * this.armSpringStiffness * stiffnessMultiplier;

            arm.handVelocity.x *= dampingValue;
            arm.handVelocity.y *= dampingValue;

            arm.handVelocity.x += springForceX * deltaTime;
            arm.handVelocity.y += springForceY * deltaTime;

            arm.currentHandPos.x += arm.handVelocity.x * deltaTime;
            arm.currentHandPos.y += arm.handVelocity.y * deltaTime;

            // === ENFORCE SOLID CONTACT CONSTRAINTS ===
            // Handle per-frame solid contact: kill velocity into solid, apply extra friction
            if (arm._weaponSolidContactLastFrame && arm._weaponSolidNormalLastFrame) {
                // Check if the spring moved us back toward the solid
                const velIntoSolid = arm.handVelocity.x * arm._weaponSolidNormalLastFrame.x + arm.handVelocity.y * arm._weaponSolidNormalLastFrame.y;
                if (velIntoSolid < 0) {
                    // Remove the component going into the solid
                    arm.handVelocity.x -= arm._weaponSolidNormalLastFrame.x * velIntoSolid;
                    arm.handVelocity.y -= arm._weaponSolidNormalLastFrame.y * velIntoSolid;
                }
                // Strong damping when sliding against surface to prevent vibration
                arm.handVelocity.x *= 0.5;
                arm.handVelocity.y *= 0.5;
            }

            // Clamp hand position to arm reach (except during punch extend)
            const handDX = arm.currentHandPos.x - baseWorldX;
            const handDY = arm.currentHandPos.y - baseWorldY;
            const handDist = Math.sqrt(handDX * handDX + handDY * handDY);
            const maxReach = arm.state === 'punching' ? this.armLength * this.punchReachDistance : this.armLength * 0.95;

            if (handDist > maxReach) {
                arm.currentHandPos.x = baseWorldX + (handDX / handDist) * maxReach;
                arm.currentHandPos.y = baseWorldY + (handDY / handDist) * maxReach;
                const velocityInDirection = (arm.handVelocity.x * handDX + arm.handVelocity.y * handDY) / handDist;
                if (velocityInDirection > 0) {
                    arm.handVelocity.x -= (handDX / handDist) * velocityInDirection;
                    arm.handVelocity.y -= (handDY / handDist) * velocityInDirection;
                }
            }
        }
    }

    // ==================== WEAPON COLLISION SYSTEM ====================

    /**
     * Check and resolve collisions between held weapons (or bare hands) and solid colliders
     * (BoxCollider, CircleCollider, PolygonCollider), and between held weapons of different creatures.
     * Called after arm IK so the item/hand positions are up to date.
     * @param {number} deltaTime
     */
    _updateWeaponCollisions(deltaTime) {
        if (!this.weaponSolidCollision && !this.weaponWeaponCollision) return;
        if (this.isDead) return;

        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        const myPos = this.gameObject.getWorldPosition();
        const searchRadiusSq = this.weaponCollisionSearchRadius * this.weaponCollisionSearchRadius;

        // Get head segment for arm base calculations
        const head = this._segments[0];
        if (!head) return;
        const bodyAngle = head.angle;

        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            const hasItem = arm.heldItem && arm.heldItem.isHeld;
            const item = hasItem ? arm.heldItem : null;

            // Get collision shape data - either from held item or from hand position
            let itemCorners = null;
            let itemAxes = null;
            let handRadius = 0;
            let handCenter = null;

            if (hasItem) {
                // Get item's OBB data
                itemCorners = item.getWorldCorners();
                itemAxes = item.getOBBAxes();
            } else {
                // Use hand as a circle collider when no item is held
                handRadius = this.armThickness * this.armTipSize * 0.5;
                handCenter = { x: arm.currentHandPos.x, y: arm.currentHandPos.y };
            }

            // === WEAPON/HAND vs SOLID COLLIDERS (BoxCollider, CircleCollider, PolygonCollider) ===
            if (this.weaponSolidCollision) {
                for (const obj of _instances) {
                    if (obj === this.gameObject) continue;
                    if (hasItem && obj === item.gameObject) continue;

                    // Quick distance check
                    const dx = obj.position.x - myPos.x;
                    const dy = obj.position.y - myPos.y;
                    if (dx * dx + dy * dy > searchRadiusSq) continue;

                    // Get any collider on this object
                    const boxCollider = obj.getModule ? obj.getModule('BoxCollider') : null;
                    const circleCollider = obj.getModule ? obj.getModule('CircleCollider') : null;
                    const polygonCollider = obj.getModule ? obj.getModule('PolygonCollider') : null;

                    // Check tag match for whatever collider is found
                    const tag = this.weaponCollisionSolidTag;
                    let collision = null;

                    // === CHECK BoxCollider ===
                    if (boxCollider && !boxCollider.isTrigger) {
                        if (!tag || obj.tag === tag || boxCollider.tag === tag) {
                            if (hasItem) {
                                // Use collider's OBB collision method for accurate contact point
                                const result = boxCollider.getOBBCollisionInfo ? 
                                    boxCollider.getOBBCollisionInfo(itemCorners, itemAxes) :
                                    this._checkItemBoxCollision(itemCorners, itemAxes, obj, boxCollider);
                                if (result) {
                                    collision = {
                                        normal: result.normal,
                                        depth: result.depth,
                                        contactPoint: result.point || result.contactPoint
                                    };
                                }
                            } else {
                                collision = this._checkCircleBoxCollision(handCenter, handRadius, obj, boxCollider);
                            }
                        }
                    }

                    // === CHECK CircleCollider (SphereCollider) ===
                    if (!collision && circleCollider && !circleCollider.isTrigger) {
                        if (!tag || obj.tag === tag || circleCollider.tag === tag) {
                            if (hasItem) {
                                // Use collider's OBB collision method for accurate contact point
                                const result = circleCollider.getOBBCollisionInfo ?
                                    circleCollider.getOBBCollisionInfo(itemCorners, itemAxes) :
                                    this._checkItemCircleCollision(itemCorners, itemAxes, circleCollider);
                                if (result) {
                                    collision = {
                                        normal: result.normal,
                                        depth: result.depth,
                                        contactPoint: result.point || result.contactPoint
                                    };
                                }
                            } else {
                                collision = this._checkCircleCircleCollision(handCenter, handRadius, circleCollider);
                            }
                        }
                    }

                    // === CHECK PolygonCollider ===
                    if (!collision && polygonCollider && !polygonCollider.isTrigger) {
                        if (!tag || obj.tag === tag || polygonCollider.tag === tag) {
                            if (hasItem) {
                                // Use collider's OBB collision method for accurate contact point
                                const result = polygonCollider.getOBBCollisionInfo ?
                                    polygonCollider.getOBBCollisionInfo(itemCorners, itemAxes) :
                                    this._checkItemPolygonCollision(itemCorners, itemAxes, polygonCollider);
                                if (result) {
                                    collision = {
                                        normal: result.normal,
                                        depth: result.depth,
                                        contactPoint: result.point || result.contactPoint
                                    };
                                }
                            } else {
                                collision = this._checkCirclePolygonCollision(handCenter, handRadius, polygonCollider);
                            }
                        }
                    }

                    if (collision) {
                        this._resolveWeaponSolidCollision(arm, i, item, collision, deltaTime, bodyAngle);
                    }
                }
            }

            // === WEAPON vs OTHER CREATURES' WEAPONS (only when both have items) ===
            if (this.weaponWeaponCollision && hasItem) {
                for (const obj of _instances) {
                    if (obj === this.gameObject) continue;

                    // Quick distance check
                    const dx = obj.position.x - myPos.x;
                    const dy = obj.position.y - myPos.y;
                    if (dx * dx + dy * dy > searchRadiusSq) continue;

                    const otherCreature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
                    if (!otherCreature || otherCreature.isDead) continue;
                    if (!otherCreature._arms) continue;

                    for (let j = 0; j < otherCreature._arms.length; j++) {
                        const otherArm = otherCreature._arms[j];
                        if (!otherArm.heldItem || !otherArm.heldItem.isHeld) continue;
                        if (otherArm.heldItem === item) continue; // Same item check

                        const otherItem = otherArm.heldItem;
                        const otherCorners = otherItem.getWorldCorners();
                        const otherAxes = otherItem.getOBBAxes();

                        // SAT collision between two item OBBs
                        const collision = this._checkOBBvsOBB(itemCorners, itemAxes, otherCorners, otherAxes);
                        if (collision) {
                            this._resolveWeaponWeaponCollision(arm, i, item, otherCreature, otherArm, j, otherItem, collision, deltaTime);
                        }
                    }
                }
            }

        }
    }

    /**
     * SAT collision check between an item OBB and a BoxCollider.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkItemBoxCollision(itemCorners, itemAxes, boxObj, boxCollider) {
        // Get box world corners and axes
        const boxCorners = boxCollider.getWorldPoints();
        const boxAxes = boxCollider.getAxes();

        // Combine all axes (2 from item + 2 from box = 4 SAT axes)
        const allAxes = [...itemAxes, ...boxAxes];

        let minOverlap = Infinity;
        let minAxis = null;

        // Item center
        let itemCx = 0, itemCy = 0;
        for (const c of itemCorners) { itemCx += c.x; itemCy += c.y; }
        itemCx /= 4; itemCy /= 4;

        // Box center
        let boxCx = 0, boxCy = 0;
        for (const c of boxCorners) { boxCx += c.x; boxCy += c.y; }
        boxCx /= 4; boxCy /= 4;

        for (const axis of allAxes) {
            // Project item corners
            let iMin = Infinity, iMax = -Infinity;
            for (const c of itemCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < iMin) iMin = proj;
                if (proj > iMax) iMax = proj;
            }

            // Project box corners
            let bMin = Infinity, bMax = -Infinity;
            for (const c of boxCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < bMin) bMin = proj;
                if (proj > bMax) bMax = proj;
            }

            const overlap = Math.min(iMax, bMax) - Math.max(iMin, bMin);
            if (overlap <= 0) return null; // Separating axis found

            if (overlap < minOverlap) {
                minOverlap = overlap;
                // Normal should push item away from box
                const dirX = itemCx - boxCx;
                const dirY = itemCy - boxCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }

        // Calculate contact point: find the item corner(s) closest to the box
        // and use that as the contact point (where the weapon tip hits)
        let contactX = 0, contactY = 0;
        let minDist = Infinity;
        
        // Find the item corner that's deepest inside the box (toward box center)
        for (const corner of itemCorners) {
            const dx = corner.x - boxCx;
            const dy = corner.y - boxCy;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                contactX = corner.x;
                contactY = corner.y;
            }
        }
        
        // Offset contact point toward the box surface along the normal
        // Normal points outward from box, so moving along normal moves toward the surface
        contactX += minAxis.x * minOverlap * 0.5;
        contactY += minAxis.y * minOverlap * 0.5;

        return {
            normal: minAxis,
            depth: minOverlap,
            contactPoint: {
                x: contactX,
                y: contactY
            }
        };
    }

    /**
     * SAT collision check between two item OBBs.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkOBBvsOBB(cornersA, axesA, cornersB, axesB) {
        const allAxes = [...axesA, ...axesB];

        let minOverlap = Infinity;
        let minAxis = null;

        // Centers
        let aCx = 0, aCy = 0;
        for (const c of cornersA) { aCx += c.x; aCy += c.y; }
        aCx /= 4; aCy /= 4;

        let bCx = 0, bCy = 0;
        for (const c of cornersB) { bCx += c.x; bCy += c.y; }
        bCx /= 4; bCy /= 4;

        for (const axis of allAxes) {
            let aMin = Infinity, aMax = -Infinity;
            for (const c of cornersA) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < aMin) aMin = proj;
                if (proj > aMax) aMax = proj;
            }

            let bMin = Infinity, bMax = -Infinity;
            for (const c of cornersB) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < bMin) bMin = proj;
                if (proj > bMax) bMax = proj;
            }

            const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
            if (overlap <= 0) return null;

            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = aCx - bCx;
                const dirY = aCy - bCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }

        return {
            normal: minAxis,
            depth: minOverlap,
            contactPoint: {
                x: (aCx + bCx) * 0.5,
                y: (aCy + bCy) * 0.5
            }
        };
    }

    /**
     * Collision check between an item OBB and a CircleCollider.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkItemCircleCollision(itemCorners, itemAxes, circleCollider) {
        const circleCenter = circleCollider.getCenter();
        const circleRadius = circleCollider.getScaledRadius();

        // Item center
        let itemCx = 0, itemCy = 0;
        for (const c of itemCorners) { itemCx += c.x; itemCy += c.y; }
        itemCx /= 4; itemCy /= 4;

        // Find closest point on OBB to circle center
        // Project circle center onto each edge and find nearest point
        let closestX = itemCx, closestY = itemCy;
        let minDistSq = Infinity;

        for (let i = 0; i < itemCorners.length; i++) {
            const p1 = itemCorners[i];
            const p2 = itemCorners[(i + 1) % itemCorners.length];

            // Project circle center onto edge
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLenSq = edgeX * edgeX + edgeY * edgeY;
            if (edgeLenSq === 0) continue;

            const t = Math.max(0, Math.min(1, 
                ((circleCenter.x - p1.x) * edgeX + (circleCenter.y - p1.y) * edgeY) / edgeLenSq
            ));

            const projX = p1.x + t * edgeX;
            const projY = p1.y + t * edgeY;
            const distSq = (circleCenter.x - projX) ** 2 + (circleCenter.y - projY) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestX = projX;
                closestY = projY;
            }
        }

        // Check if circle center is inside OBB
        const centerInside = this._pointInOBB(circleCenter.x, circleCenter.y, itemCorners);

        const dist = Math.sqrt(minDistSq);
        
        if (centerInside) {
            // Circle center inside OBB - push out
            const depth = circleRadius + dist;
            const normalX = dist > 0.001 ? (closestX - circleCenter.x) / dist : 1;
            const normalY = dist > 0.001 ? (closestY - circleCenter.y) / dist : 0;
            return {
                normal: { x: -normalX, y: -normalY },
                depth: depth,
                contactPoint: { x: closestX, y: closestY }
            };
        } else if (dist < circleRadius) {
            // Circle overlaps OBB edge
            const depth = circleRadius - dist;
            const normalX = dist > 0.001 ? (circleCenter.x - closestX) / dist : 1;
            const normalY = dist > 0.001 ? (circleCenter.y - closestY) / dist : 0;
            return {
                normal: { x: normalX, y: normalY },
                depth: depth,
                contactPoint: { x: closestX, y: closestY }
            };
        }

        return null;
    }

    /**
     * Check if a point is inside an OBB defined by 4 corners.
     * Uses cross product method.
     */
    _pointInOBB(px, py, corners) {
        // Check if point is on the same side of all edges
        let sign = 0;
        for (let i = 0; i < corners.length; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % corners.length];
            const cross = (p2.x - p1.x) * (py - p1.y) - (p2.y - p1.y) * (px - p1.x);
            if (cross !== 0) {
                if (sign === 0) sign = cross > 0 ? 1 : -1;
                else if ((cross > 0 ? 1 : -1) !== sign) return false;
            }
        }
        return true;
    }

    /**
     * Collision check between an item OBB and a PolygonCollider.
     * Uses Separating Axis Theorem.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkItemPolygonCollision(itemCorners, itemAxes, polygonCollider) {
        const polyPoints = polygonCollider.getWorldPoints();
        if (!polyPoints || polyPoints.length < 3) return null;

        const polyAxes = polygonCollider.getAxes();

        // Combine all axes
        const allAxes = [...itemAxes, ...polyAxes];

        let minOverlap = Infinity;
        let minAxis = null;

        // Item center
        let itemCx = 0, itemCy = 0;
        for (const c of itemCorners) { itemCx += c.x; itemCy += c.y; }
        itemCx /= 4; itemCy /= 4;

        // Polygon center
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;

        for (const axis of allAxes) {
            // Project item corners
            let iMin = Infinity, iMax = -Infinity;
            for (const c of itemCorners) {
                const proj = c.x * axis.x + c.y * axis.y;
                if (proj < iMin) iMin = proj;
                if (proj > iMax) iMax = proj;
            }

            // Project polygon points
            let pMin = Infinity, pMax = -Infinity;
            for (const p of polyPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                if (proj < pMin) pMin = proj;
                if (proj > pMax) pMax = proj;
            }

            const overlap = Math.min(iMax, pMax) - Math.max(iMin, pMin);
            if (overlap <= 0) return null;

            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = itemCx - polyCx;
                const dirY = itemCy - polyCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = {
                    x: dot >= 0 ? axis.x : -axis.x,
                    y: dot >= 0 ? axis.y : -axis.y
                };
            }
        }

        // Calculate contact point: find the item corner closest to polygon center
        let contactX = 0, contactY = 0;
        let minDist = Infinity;
        
        for (const corner of itemCorners) {
            const dx = corner.x - polyCx;
            const dy = corner.y - polyCy;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                contactX = corner.x;
                contactY = corner.y;
            }
        }
        
        // Offset contact point toward the polygon surface
        // Normal points outward from polygon, so moving along normal moves toward the surface
        contactX += minAxis.x * minOverlap * 0.5;
        contactY += minAxis.y * minOverlap * 0.5;

        return {
            normal: minAxis,
            depth: minOverlap,
            contactPoint: {
                x: contactX,
                y: contactY
            }
        };
    }

    /**
     * Collision check between a circle (hand) and a BoxCollider.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkCircleBoxCollision(circleCenter, circleRadius, boxObj, boxCollider) {
        const boxCorners = boxCollider.getWorldPoints();
        const bounds = boxCollider.getBounds();

        // Find closest point on box to circle center
        const closestX = Math.max(bounds.left, Math.min(circleCenter.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(circleCenter.y, bounds.bottom));

        const dx = circleCenter.x - closestX;
        const dy = circleCenter.y - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= circleRadius * circleRadius) return null;

        const dist = Math.sqrt(distSq);
        let normalX, normalY;

        if (dist === 0) {
            // Circle center is inside box - find shortest way out
            const toLeft = circleCenter.x - bounds.left;
            const toRight = bounds.right - circleCenter.x;
            const toTop = circleCenter.y - bounds.top;
            const toBottom = bounds.bottom - circleCenter.y;
            const minDist = Math.min(toLeft, toRight, toTop, toBottom);

            if (minDist === toLeft) { normalX = -1; normalY = 0; }
            else if (minDist === toRight) { normalX = 1; normalY = 0; }
            else if (minDist === toTop) { normalX = 0; normalY = -1; }
            else { normalX = 0; normalY = 1; }
        } else {
            normalX = dx / dist;
            normalY = dy / dist;
        }

        const depth = circleRadius - dist;

        return {
            normal: { x: normalX, y: normalY },
            depth: depth,
            contactPoint: { x: closestX, y: closestY }
        };
    }

    /**
     * Collision check between two circles (hand vs CircleCollider).
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkCircleCircleCollision(handCenter, handRadius, circleCollider) {
        const otherCenter = circleCollider.getCenter();
        const otherRadius = circleCollider.getScaledRadius();

        const dx = handCenter.x - otherCenter.x;
        const dy = handCenter.y - otherCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const combinedRadius = handRadius + otherRadius;

        if (dist >= combinedRadius) return null;

        let normalX, normalY;
        if (dist === 0) {
            normalX = 1;
            normalY = 0;
        } else {
            normalX = dx / dist;
            normalY = dy / dist;
        }

        const depth = combinedRadius - dist;

        return {
            normal: { x: normalX, y: normalY },
            depth: depth,
            contactPoint: {
                x: otherCenter.x + normalX * otherRadius,
                y: otherCenter.y + normalY * otherRadius
            }
        };
    }

    /**
     * Collision check between a circle (hand) and a PolygonCollider.
     * @returns {Object|null} {normal: {x,y}, depth: number, contactPoint: {x,y}} or null
     */
    _checkCirclePolygonCollision(circleCenter, circleRadius, polygonCollider) {
        const polyPoints = polygonCollider.getWorldPoints();
        if (!polyPoints || polyPoints.length < 3) return null;

        // Find closest point on polygon to circle center
        let minDistSq = Infinity;
        let closestX = 0, closestY = 0;
        let closestEdgeNormalX = 0, closestEdgeNormalY = 0;

        for (let i = 0; i < polyPoints.length; i++) {
            const p1 = polyPoints[i];
            const p2 = polyPoints[(i + 1) % polyPoints.length];

            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLenSq = edgeX * edgeX + edgeY * edgeY;

            if (edgeLenSq === 0) continue;

            const t = Math.max(0, Math.min(1,
                ((circleCenter.x - p1.x) * edgeX + (circleCenter.y - p1.y) * edgeY) / edgeLenSq
            ));

            const projX = p1.x + t * edgeX;
            const projY = p1.y + t * edgeY;
            const distSq = (circleCenter.x - projX) ** 2 + (circleCenter.y - projY) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestX = projX;
                closestY = projY;

                // Edge normal (perpendicular)
                const edgeLen = Math.sqrt(edgeLenSq);
                closestEdgeNormalX = -edgeY / edgeLen;
                closestEdgeNormalY = edgeX / edgeLen;
            }
        }

        const dist = Math.sqrt(minDistSq);

        // Check if circle center is inside polygon
        const centerInside = polygonCollider.containsPoint(circleCenter.x, circleCenter.y);

        if (centerInside) {
            // Circle center inside polygon - push out along closest edge normal
            // Make sure normal points outward from polygon
            const polyBounds = polygonCollider.getBounds();
            const toCenterX = circleCenter.x - polyBounds.centerX;
            const toCenterY = circleCenter.y - polyBounds.centerY;
            const dot = toCenterX * closestEdgeNormalX + toCenterY * closestEdgeNormalY;
            if (dot < 0) {
                closestEdgeNormalX = -closestEdgeNormalX;
                closestEdgeNormalY = -closestEdgeNormalY;
            }

            const depth = circleRadius + dist;
            return {
                normal: { x: closestEdgeNormalX, y: closestEdgeNormalY },
                depth: depth,
                contactPoint: { x: closestX, y: closestY }
            };
        } else if (dist < circleRadius) {
            // Circle overlaps polygon edge
            const normalX = dist > 0.001 ? (circleCenter.x - closestX) / dist : closestEdgeNormalX;
            const normalY = dist > 0.001 ? (circleCenter.y - closestY) / dist : closestEdgeNormalY;
            const depth = circleRadius - dist;

            return {
                normal: { x: normalX, y: normalY },
                depth: depth,
                contactPoint: { x: closestX, y: closestY }
            };
        }

        return null;
    }

    /**
     * Resolve a weapon or bare hand colliding with a solid collider.
     * The arm is pushed back based on arm strength, item weight, and bounce factor.
     * During swings/attacks, a hit causes the arm to bounce back (interrupt the swing).
     * Applies arm angle limits to keep the hand within valid range.
     * @param {Object} arm - The arm object
     * @param {number} armIndex - Index of the arm
     * @param {Object|null} item - The held item (null for bare hand)
     * @param {Object} collision - Collision data {normal, depth, contactPoint}
     * @param {number} deltaTime - Time step
     * @param {number} bodyAngle - Current body angle in radians
     */
    _resolveWeaponSolidCollision(arm, armIndex, item, collision, deltaTime, bodyAngle) {
        const strength = Math.max(0.1, this.getEffectiveArmStrength(armIndex));
        const weight = item ? (item.weight || 1.0) : 0.5; // Bare hands are lighter
        
        // Capture incoming velocity BEFORE collision response modifies it (for sparks)
        const incomingVelocity = Math.sqrt(arm.handVelocity.x * arm.handVelocity.x + arm.handVelocity.y * arm.handVelocity.y);
        
        // Determine if attacking (swinging, punching, etc.)
        const isAttacking = arm._isSwinging || arm._isStabbing || arm.state === 'punching';

        // === GET ARM BASE POSITION FOR ANGLE CALCULATIONS ===
        const head = this._segments[0];
        const shoulderOffset = this.headSize * 0.5;
        const shoulderAngle = bodyAngle + (Math.PI / 2) * arm.side;
        const baseWorldX = head.worldPos.x + Math.cos(shoulderAngle) * shoulderOffset;
        const baseWorldY = head.worldPos.y + Math.sin(shoulderAngle) * shoulderOffset;

        // === DIFFERENT BEHAVIOR FOR ATTACKING vs IDLE ===
        if (isAttacking) {
            // === ATTACKING: REBOUND BEHAVIOR ===
            const bounce = this.weaponCollisionBounce;

            // Push hand completely outside the solid with buffer
            const buffer = 2.0;
            const pushOut = collision.depth + buffer;
            arm.currentHandPos.x += collision.normal.x * pushOut;
            arm.currentHandPos.y += collision.normal.y * pushOut;

            // Apply arm angle limits
            arm.currentHandPos = this._clampHandToArmLimits(
                arm.currentHandPos.x, arm.currentHandPos.y,
                baseWorldX, baseWorldY, bodyAngle, arm.side
            );

            // Velocity: remove inward component and apply bounce impulse
            const velDotNormal = arm.handVelocity.x * collision.normal.x + arm.handVelocity.y * collision.normal.y;
            if (velDotNormal < 0) {
                arm.handVelocity.x -= collision.normal.x * velDotNormal;
                arm.handVelocity.y -= collision.normal.y * velDotNormal;
                const speed = Math.sqrt(arm.handVelocity.x ** 2 + arm.handVelocity.y ** 2 + velDotNormal * velDotNormal);
                const bounceImpulse = Math.abs(velDotNormal) * bounce + Math.min(speed * bounce * 0.3, 150);
                arm.handVelocity.x += collision.normal.x * bounceImpulse;
                arm.handVelocity.y += collision.normal.y * bounceImpulse;
            }

            // Mark swing collision
            if (arm._isSwinging) {
                arm._swingHitSolid = true;
                if (arm._ikPhase === 'followthrough') {
                    arm._backswingColliding = true;
                }
            }

            // Interrupt punch
            if (arm.state === 'punching') {
                arm.state = 'returning';
                arm.stateTime = 0;
                arm.stateStartPos.x = arm.currentHandPos.x;
                arm.stateStartPos.y = arm.currentHandPos.y;
            }

        } else {
            // === IDLE/WALKING: SOLID CONTACT BEHAVIOR ===
            // Push hand to surface and kill velocity into solid.
            // The key to preventing vibration is that we also save this state
            // so next frame's spring physics can constrain the target to slide along the surface.
            
            // Check if this is a NEW contact (wasn't in contact last frame)
            const isNewContact = !arm._weaponSolidContactLastFrame;

            // Calculate the contact position (hand pushed to just outside the surface)
            const buffer = 2.0;
            const contactPosX = arm.currentHandPos.x + collision.normal.x * (collision.depth + buffer);
            const contactPosY = arm.currentHandPos.y + collision.normal.y * (collision.depth + buffer);

            // Clamp to arm limits
            const clampedContact = this._clampHandToArmLimits(
                contactPosX, contactPosY,
                baseWorldX, baseWorldY, bodyAngle, arm.side
            );

            // Set hand to the contact position
            arm.currentHandPos.x = clampedContact.x;
            arm.currentHandPos.y = clampedContact.y;

            // Kill all velocity components, not just into solid - full stop on contact
            arm.handVelocity.x *= 0.1;
            arm.handVelocity.y *= 0.1;

            // Also snap target to contact position so spring doesn't fight
            arm.targetHandPos.x = clampedContact.x;
            arm.targetHandPos.y = clampedContact.y;

            // === SPAWN INITIAL CONTACT SPARK ===
            // On NEW contact, spawn a spark even at lower velocities
            if (isNewContact && item && item.sparkOnCollision) {
                const now = performance.now() / 1000;
                const timeSinceLastSpark = now - (item._lastSparkTime || 0);
                // Lower velocity threshold for initial contact spark (walking speed is enough)
                const initialContactVelocityThreshold = 1;
                if (incomingVelocity >= initialContactVelocityThreshold && timeSinceLastSpark >= 0.15) {
                    item._lastSparkTime = now;
                    // Spawn fewer sparks for low-velocity contact
                    const velocityForSparks = Math.max(incomingVelocity, 50);
                    this._spawnSparkParticles(collision.contactPoint, collision.normal, item, velocityForSparks);
                }
            }
        }

        // Mark that this arm is actively colliding with a solid this frame
        arm._weaponSolidContact = true;
        arm._weaponSolidNormal = { x: collision.normal.x, y: collision.normal.y };

        // === SPAWN SPARK PARTICLES for high-velocity collisions (attacking or not) ===
        if (item && item.sparkOnCollision && isAttacking) {
            const now = performance.now() / 1000;
            const timeSinceLastSpark = now - (item._lastSparkTime || 0);
            if (incomingVelocity >= item.sparkMinVelocity && timeSinceLastSpark >= item.sparkCooldown) {
                item._lastSparkTime = now;
                this._spawnSparkParticles(collision.contactPoint, collision.normal, item, incomingVelocity);
            }
        }
    }

    /**
     * Clamp a hand position to the arm's valid range of motion.
     * Enforces both reach distance limits and angular limits relative to body.
     * @param {number} handX - Current hand X position
     * @param {number} handY - Current hand Y position
     * @param {number} baseX - Arm base (shoulder) X position
     * @param {number} baseY - Arm base (shoulder) Y position
     * @param {number} bodyAngle - Body facing angle in radians
     * @param {number} side - Arm side (-1 = left, 1 = right)
     * @returns {{x: number, y: number}} Clamped hand position
     */
    _clampHandToArmLimits(handX, handY, baseX, baseY, bodyAngle, side) {
        const dx = handX - baseX;
        const dy = handY - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max arm reach
        const maxReach = this.armLength * 0.98;
        let clampedX = handX;
        let clampedY = handY;
        let clampedDist = dist;

        if (dist > maxReach) {
            const scale = maxReach / dist;
            clampedX = baseX + dx * scale;
            clampedY = baseY + dy * scale;
            clampedDist = maxReach;
        }

        // Apply angular limits
        // Arm can reach about 150 degrees in the forward hemisphere,
        // but limited crossing behind the body (cross-body limit applies)
        if (clampedDist > 1) {
            let armAngle = Math.atan2(clampedY - baseY, clampedX - baseX);
            let relativeAngle = armAngle - bodyAngle;

            // Normalize to -PI to PI
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

            // Define angular limits
            // Forward is 0, left side arm favors negative angles, right side favors positive
            const maxForward = Math.PI * 0.85; // ~153 degrees forward arc
            const crossBodyLimit = this.gunCrossBodyAngleLimit * Math.PI / 180;

            let minAngle, maxAngle;
            if (side === -1) {
                // Left arm: favors left side (negative angles)
                minAngle = -maxForward;
                maxAngle = crossBodyLimit;
            } else {
                // Right arm: favors right side (positive angles)
                minAngle = -crossBodyLimit;
                maxAngle = maxForward;
            }

            // Clamp the angle
            const clampedRelAngle = Math.max(minAngle, Math.min(maxAngle, relativeAngle));

            if (clampedRelAngle !== relativeAngle) {
                // Angle was clamped - recalculate position
                const newAngle = bodyAngle + clampedRelAngle;
                clampedX = baseX + Math.cos(newAngle) * clampedDist;
                clampedY = baseY + Math.sin(newAngle) * clampedDist;
            }
        }

        return { x: clampedX, y: clampedY };
    }

    /**
     * Resolve two held weapons from different creatures colliding (sword fight).
     * Both arms are pushed apart. Heavier weapons with stronger arms win the clash.
     */
    _resolveWeaponWeaponCollision(myArm, myArmIndex, myItem, otherCreature, otherArm, otherArmIndex, otherItem, collision, deltaTime) {
        const myStrength = Math.max(0.1, this.getEffectiveArmStrength(myArmIndex));
        const myWeight = myItem.weight || 1.0;
        const otherStrength = Math.max(0.1, otherCreature.getEffectiveArmStrength(otherArmIndex));
        const otherWeight = otherItem.weight || 1.0;

        // Force ratio: stronger arm + heavier weapon pushes the other more
        const myForce = myStrength * (1 + myWeight * 0.3);
        const otherForce = otherStrength * (1 + otherWeight * 0.3);
        const totalForce = myForce + otherForce;

        // How much each side gets pushed (inversely proportional to their force)
        const myPushRatio = otherForce / totalForce;
        const otherPushRatio = myForce / totalForce;

        const bounce = this.weaponCollisionBounce;
        const pushDepth = collision.depth * 0.5;

        // Push my arm
        myArm.currentHandPos.x += collision.normal.x * pushDepth * myPushRatio;
        myArm.currentHandPos.y += collision.normal.y * pushDepth * myPushRatio;

        // Push other arm (opposite direction)
        otherArm.currentHandPos.x -= collision.normal.x * pushDepth * otherPushRatio;
        otherArm.currentHandPos.y -= collision.normal.y * pushDepth * otherPushRatio;

        // Velocity bounces
        const myVelDot = myArm.handVelocity.x * collision.normal.x + myArm.handVelocity.y * collision.normal.y;
        const otherVelDot = otherArm.handVelocity.x * collision.normal.x + otherArm.handVelocity.y * collision.normal.y;

        if (myVelDot < 0) {
            const reflect = bounce * myPushRatio;
            myArm.handVelocity.x -= collision.normal.x * myVelDot * (1 + reflect);
            myArm.handVelocity.y -= collision.normal.y * myVelDot * (1 + reflect);
        }

        if (otherVelDot > 0) {
            const reflect = bounce * otherPushRatio;
            otherArm.handVelocity.x -= collision.normal.x * otherVelDot * (1 + reflect);
            otherArm.handVelocity.y -= collision.normal.y * otherVelDot * (1 + reflect);
        }

        // If either arm is in a swing and gets outmatched, interrupt the swing
        if (myArm._isSwinging && myArm._ikPhase === 'strike' && myPushRatio > 0.6) {
            myArm._ikPhase = 'followthrough';
            myArm._ikPhaseTime = 0;
            myArm._ikFollowStartX = myArm.currentHandPos.x;
            myArm._ikFollowStartY = myArm.currentHandPos.y;
        }
        if (otherArm._isSwinging && otherArm._ikPhase === 'strike' && otherPushRatio > 0.6) {
            otherArm._ikPhase = 'followthrough';
            otherArm._ikPhaseTime = 0;
            otherArm._ikFollowStartX = otherArm.currentHandPos.x;
            otherArm._ikFollowStartY = otherArm.currentHandPos.y;
        }
    }

    // ==================== SPARK PARTICLE SYSTEM ====================

    /**
     * Spawn spark particles at a collision point
     * @param {Object} contactPoint - {x, y} collision contact point in world space
     * @param {Object} normal - {x, y} collision normal (pointing away from solid)
     * @param {Object} item - The ProceduralCreatureItem that has spark settings
     * @param {number} velocity - Current item velocity magnitude
     */
    _spawnSparkParticles(contactPoint, normal, item, velocity) {
        if (!contactPoint || !normal || !item) return;

        const count = item.sparkParticleCount || 5;
        const baseSpeed = item.sparkParticleSpeed || 150;
        const speedVariance = item.sparkParticleSpeedVariance || 80;
        const baseLifetime = item.sparkParticleLifetime || 0.2;
        const lifetimeVariance = item.sparkParticleLifetimeVariance || 0.1;
        const spreadAngle = (item.sparkParticleSpreadAngle || 120) * Math.PI / 180;

        // Base angle is the collision normal direction (sparks fly away from solid)
        const normalAngle = Math.atan2(normal.y, normal.x);

        // Velocity factor - faster impacts create more/faster sparks
        const velocityFactor = Math.min(2.0, velocity / 100);

        for (let i = 0; i < count; i++) {
            // Random angle within spread cone centered on normal
            const angleOffset = (Math.random() - 0.5) * spreadAngle;
            const particleAngle = normalAngle + angleOffset;

            // Random speed with velocity boost
            const speed = (baseSpeed + Math.random() * speedVariance) * (0.7 + velocityFactor * 0.3);

            // Random lifetime
            const lifetime = baseLifetime + Math.random() * lifetimeVariance;

            // Calculate velocity components
            const vx = Math.cos(particleAngle) * speed;
            const vy = Math.sin(particleAngle) * speed;

            this._sparkParticles.push({
                x: contactPoint.x + (Math.random() - 0.5) * 4, // Small random offset
                y: contactPoint.y + (Math.random() - 0.5) * 4,
                vx: vx,
                vy: vy,
                life: lifetime,
                maxLife: lifetime,
                sizeStart: item.sparkParticleSizeStart || 3,
                sizeEnd: item.sparkParticleSizeEnd || 1,
                colorStart: item.sparkParticleColorStart || '#ffdd44',
                colorEnd: item.sparkParticleColorEnd || '#ff6600',
                gravity: item.sparkParticleGravity || 200,
                fadeOut: item.sparkParticleFadeOut !== false
            });
        }
    }

    /**
     * Update all active spark particles
     * @param {number} deltaTime - Time step in seconds
     */
    _updateSparkParticles(deltaTime) {
        for (let i = this._sparkParticles.length - 1; i >= 0; i--) {
            const p = this._sparkParticles[i];
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this._sparkParticles.splice(i, 1);
                continue;
            }

            // Update position
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            // Apply gravity (sparks fall down)
            p.vy += p.gravity * deltaTime;

            // Air resistance (sparks slow down)
            p.vx *= Math.pow(0.95, deltaTime * 60);
            p.vy *= Math.pow(0.98, deltaTime * 60);
        }
    }

    /**
     * Draw all active spark particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context (assumed in world space)
     */
    _drawSparkParticles(ctx) {
        if (this._sparkParticles.length === 0) return;

        ctx.save();
        for (const p of this._sparkParticles) {
            const t = 1.0 - (p.life / p.maxLife); // 0 → 1 over lifetime
            const size = p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
            const alpha = p.fadeOut ? (1.0 - t) : 1.0;
            const color = this._blendSparkColors(p.colorStart, p.colorEnd, t);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;

            // Draw spark as elongated ellipse in direction of motion
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 20) {
                // Elongated spark shape for fast-moving particles
                const angle = Math.atan2(p.vy, p.vx);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 2.5, size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Round spark for slow particles
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    /**
     * Blend two colors for spark particle interpolation
     * @param {string} colorStart - Start color (hex)
     * @param {string} colorEnd - End color (hex)
     * @param {number} t - Interpolation factor 0-1
     * @returns {string} Blended color as hex string
     */
    _blendSparkColors(colorStart, colorEnd, t) {
        // Parse hex colors
        const parseHex = (hex) => {
            hex = hex.replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16)
            };
        };

        const start = parseHex(colorStart);
        const end = parseHex(colorEnd);

        const r = Math.round(start.r + (end.r - start.r) * t);
        const g = Math.round(start.g + (end.g - start.g) * t);
        const b = Math.round(start.b + (end.b - start.b) * t);

        return '#' + [r, g, b].map(v => {
            const h = Math.max(0, Math.min(255, v)).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    _updateBodySegments(deltaTime) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
    
        // Head follows the game object in world space
        this._segments[0].worldPos.x = worldPos.x;
        this._segments[0].worldPos.y = worldPos.y;
        this._segments[0].angle = bodyAngle;
    
        if (this.legSegments === 0 || this.enableSnakeWave) {
            this._updateSnakeMovement(deltaTime);
        } else {
            for (let i = 1; i < this._segments.length; i++) {
                const prev = this._segments[i - 1];
                const curr = this._segments[i];
    
                // Target position: hang off the BASE of the previous segment
                // (tip-to-base chaining: prev's base is behind it by segmentLength)
                const baseX = prev.worldPos.x - Math.cos(prev.angle) * this.segmentLength;
                const baseY = prev.worldPos.y - Math.sin(prev.angle) * this.segmentLength;
    
                // World-space direction from curr toward that base point
                const dx = baseX - curr.worldPos.x;
                const dy = baseY - curr.worldPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
    
                if (dist > 0.1) {
                    // Absolute angle pointing from curr tip toward prev base
                    let targetAngle = Math.atan2(dy, dx);
    
                    if (this.bodyMaxTurnAngle > 0) {
                        const segRatio = i / (this._segments.length - 1);
                        const taper = Math.pow(this.bodyTurnTaper, segRatio);
                        const maxRad = (this.bodyMaxTurnAngle * Math.PI / 180) * taper;
    
                        // Clamp relative to PARENT's world angle (not prev.angle of prior logic)
                        let diff = targetAngle - prev.angle;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        diff = Math.max(-maxRad, Math.min(maxRad, diff));
                        targetAngle = prev.angle + diff;
                    }
    
                    curr.angle = targetAngle;
    
                    // Actually: place curr so its CENTER is half a segment behind prev's base
                    // Tip of curr = base of prev, so center = base - (segmentLength/2) along curr.angle
                    curr.worldPos.x = baseX - Math.cos(curr.angle) * (this.segmentLength * 0.5) * (this.creatureScale || 1.0);
                    curr.worldPos.y = baseY - Math.sin(curr.angle) * (this.segmentLength * 0.5) * (this.creatureScale || 1.0);
                }
            }
        }
    }

    _updateSnakeMovement(deltaTime) {
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Get movement speed to determine if we should animate the wave
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // Only animate the wave when moving - threshold to avoid jitter
        const isMoving = velocityMag > 5;

        // Update wave phase only when moving
        if (isMoving) {
            this._snakeWavePhase += this.snakeWaveSpeed * deltaTime;
            // Keep phase bounded to prevent numerical issues
            if (this._snakeWavePhase > Math.PI * 100) {
                this._snakeWavePhase -= Math.PI * 100;
            }
        }

        // Scale wave intensity by movement speed (no wave when still)
        const speedRatio = Math.min(1, velocityMag / Math.max(this.moveSpeed, 1));

        // Convert amplitude from degrees to radians
        const baseAngleRad = (this.snakeWaveAmplitude * Math.PI / 180);
        const totalSegs = this._segments.length - 1;

        // ---- Forward-kinematics chain following + subtle wave overlay ----
        // Two-pass approach:
        //   Pass 1: Hard distance constraint (chain follow) — keeps spacing correct
        //   Pass 2: Gentle lateral wave overlay — adds slither without bunching
        // A final distance re-constraint ensures wave displacement doesn't
        // pull segments closer to the head.

        // === Pass 1: Chain follow (distance + angle) ===
        for (let i = 1; i < this._segments.length; i++) {
            const prev = this._segments[i - 1];
            const curr = this._segments[i];

            let dx = prev.worldPos.x - curr.worldPos.x;
            let dy = prev.worldPos.y - curr.worldPos.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                curr.worldPos.x = prev.worldPos.x - nx * this.segmentLength * (this.creatureScale || 1.0);
                curr.worldPos.y = prev.worldPos.y - ny * this.segmentLength * (this.creatureScale || 1.0);

                const chainAngle = Math.atan2(ny, nx);
                let angleDiff = chainAngle - curr.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                const angleBlend = isMoving ? 0.25 : 0.1;
                curr.angle += angleDiff * angleBlend;
            }
        }

        // === Pass 2: Lateral wave overlay + re-constraint ===
        if (isMoving) {
            for (let i = 1; i < this._segments.length; i++) {
                const prev = this._segments[i - 1];
                const curr = this._segments[i];
                const segRatio = i / totalSegs;

                const wavePhase = this._snakeWavePhase - segRatio * this.snakeWaveFrequency * Math.PI * 2;

                // Taper: quiet at head, peak in middle, fade at tip
                const taperFactor = Math.sin(segRatio * Math.PI * 0.85);
                // Gradual head dampen — first ~40% of body ramps up slowly
                const headDampen = Math.min(1, segRatio * 2);

                // Lateral displacement (perpendicular to spine)
                const lateralAmount = Math.sin(wavePhase) * this.snakeWaveAmplitude * 0.2
                                      * speedRatio * taperFactor * headDampen;

                const perpX = -Math.sin(curr.angle);
                const perpY =  Math.cos(curr.angle);

                curr.worldPos.x += perpX * lateralAmount;
                curr.worldPos.y += perpY * lateralAmount;

                // Small angular offset for visual curvature
                const angularWave = Math.sin(wavePhase) * baseAngleRad * 0.12
                                    * speedRatio * taperFactor * headDampen;
                curr.angle += angularWave;

                // --- Re-enforce distance constraint after wave displacement ---
                // This prevents lateral push from shortening the visible gap
                let dx2 = prev.worldPos.x - curr.worldPos.x;
                let dy2 = prev.worldPos.y - curr.worldPos.y;
                let dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                if (dist2 > 0.001 && Math.abs(dist2 - this.segmentLength * (this.creatureScale || 1.0)) > 0.5) {
                    const nx2 = dx2 / dist2;
                    const ny2 = dy2 / dist2;
                    curr.worldPos.x = prev.worldPos.x - nx2 * this.segmentLength * (this.creatureScale || 1.0);
                    curr.worldPos.y = prev.worldPos.y - ny2 * this.segmentLength * (this.creatureScale || 1.0);
                }
            }
        }

        // === Angle clamping ===
        if (this.bodyMaxTurnAngle > 0) {
            for (let i = 1; i < this._segments.length; i++) {
                const prev = this._segments[i - 1];
                const curr = this._segments[i];
                const segRatio = i / totalSegs;
                const taper = Math.pow(this.bodyTurnTaper, segRatio);
                const maxRad = (this.bodyMaxTurnAngle * Math.PI / 180) * taper;
                let diff = curr.angle - prev.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) > maxRad) {
                    diff = Math.max(-maxRad, Math.min(maxRad, diff));
                    curr.angle = prev.angle + diff;
                }
            }
        }
    }

    _updateLegIK(deltaTime) {
        // Increment foot collision frame counter for caching
        this._footFrameCount = (this._footFrameCount || 0) + 1;

        // Skip leg IK if there are no leg segments (snake mode)
        if (this.legSegments === 0 || this._legs.length === 0) {
            return;
        }

        const isometricRad = this.isometricAngle * Math.PI / 180;
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngleRad = this.gameObject.angle * Math.PI / 180;

        // Get movement velocity
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // Speed ratio for scaling step parameters with movement speed
        // At moveSpeed, ratio = 1. At higher speeds, steps scale up.
        const speedRatio = this.moveSpeed > 1 ? velocityMag / this.moveSpeed : 0;

        // Rotation detected by comparing angle at beginLoop vs endLoop
        const isRotating = this._isRotating || false;

        // Determine if creature is standing still
        // Consider rotation as "movement" for footing purposes - if rotating, feet should find new positions
        const isStanding = velocityMag < 1 && !isRotating;

        for (let leg of this._legs) {
            const segment = this._segments[leg.segmentIndex];
            const segmentWorldAngle = segment.angle;

            // Track segment movement for this leg
            if (!leg.lastSegmentPos) {
                leg.lastSegmentPos = { x: segment.worldPos.x, y: segment.worldPos.y };
            }
            const segmentDX = segment.worldPos.x - leg.lastSegmentPos.x;
            const segmentDY = segment.worldPos.y - leg.lastSegmentPos.y;
            const segmentMovement = Math.sqrt(segmentDX * segmentDX + segmentDY * segmentDY);
            leg.lastSegmentPos.x = segment.worldPos.x;
            leg.lastSegmentPos.y = segment.worldPos.y;

            // Calculate height offset for this segment based on bodyHeight
            const segmentHeightOffset = -Math.sin(isometricRad) * this.bodyHeight;

            // Calculate attachment point on the segment
            const segmentWorldX = segment.worldPos.x;
            const segmentWorldY = segment.worldPos.y;

            // For single-segment bodies, offset the attachment point along the body
            // This distributes legs from front to back of the body
            let attachX = segmentWorldX;
            let attachY = segmentWorldY;
            
            if (this.bodySegments === 1 && leg.bodyPositionOffset !== undefined) {
                // Offset along the body's forward direction
                // bodyPositionOffset is -0.4 to 0.4 (front to back)
                const bodyLength = this.segmentLength * this.bodyScaleX;
                const forwardOffset = leg.bodyPositionOffset * bodyLength;
                attachX += Math.cos(segmentWorldAngle) * forwardOffset;
                attachY += Math.sin(segmentWorldAngle) * forwardOffset;
            }

            // Calculate base position perpendicular to segment
            // legHipInset controls how close to center (0 = at body edge, 1 = at center)
            const perpAngle = segmentWorldAngle + Math.PI / 2;
            const hipInsetFactor = 1 - (this.legHipInset || 0.5);
            const baseX = attachX + Math.cos(perpAngle) * this.bodyWidth * 0.5 * hipInsetFactor * leg.side;
            const baseY = attachY + Math.sin(perpAngle) * this.bodyWidth * 0.5 * hipInsetFactor * leg.side + segmentHeightOffset;

            // Store base position for drawing (always update for rendering)
            leg.baseX = baseX;
            leg.baseY = baseY;

            const effectiveLegLength = this.legLength;
            // Spread angle only used for IK solver hint, not rest position
            const effectiveLegAngle = segmentWorldAngle + (this.legSpread * Math.PI / 180) * leg.side + (leg.angleOffset * Math.PI / 180);

            // Forward offset: how far fore/aft the foot rests (negative = behind body)
            const rawForwardOffset = (this.legForwardOffset || 0) * effectiveLegLength;
            const forwardOffset = rawForwardOffset; // No clamping — allow negative for rearward placement

            let naturalRestX, naturalRestY;

            if (isStanding) {
                // When standing, feet go to neutral position (straight down from base)
                // Apply forward offset for natural stance
                // Perpendicular rest: leg extends sideways from body, forward offset shifts fore/aft
                const spreadAngle = segmentWorldAngle + (Math.PI / 2) * leg.side + (leg.angleOffset * Math.PI / 180);
                naturalRestX = baseX + Math.cos(spreadAngle) * effectiveLegLength + Math.cos(segmentWorldAngle) * forwardOffset;
                naturalRestY = baseY + Math.sin(spreadAngle) * effectiveLegLength + Math.sin(segmentWorldAngle) * forwardOffset;

                // FOOT GLUING: When standing, keep feet firmly planted
                // Don't continuously drift rest position - only update when needed
                const footGlue = this.footGluingStrength !== undefined ? this.footGluingStrength : 0.95;
                
                // Check if foot is NOT currently glued to a valid position
                // A foot is "unglued" if it's too far from where it should be relative to the body
                const footToRestDX = leg.currentPos.x - naturalRestX;
                const footToRestDY = leg.currentPos.y - naturalRestY;
                const footToRestDist = Math.sqrt(footToRestDX * footToRestDX + footToRestDY * footToRestDY);
                const footingSearchThreshold = this.legLength * 0.6; // Search for footing if foot is this far from ideal
                const isFootUnglued = footToRestDist > footingSearchThreshold;
                
                if (this.keepFeetOnStop && !isFootUnglued) {
                    // Feet stay exactly where they are - strong gluing
                    // Only update rest position very slowly to prevent sudden snapping
                    const glueFactor = 0.02 * (1 - footGlue);
                    leg.restPos.x += (naturalRestX - leg.restPos.x) * glueFactor;
                    leg.restPos.y += (naturalRestY - leg.restPos.y) * glueFactor;
                } else {
                    // Foot is unglued or keepFeetOnStop is disabled - actively seek footing
                    // Allow feet to follow body but with resistance
                    const groundingFactor = this.legGroundingStrength || 0.5;
                    // When unglued, use faster smoothing to find footing quickly
                    const restSmoothness = isFootUnglued ? 0.15 : (0.03 * (1 - groundingFactor * footGlue));
                    leg.restPos.x += (naturalRestX - leg.restPos.x) * restSmoothness;
                    leg.restPos.y += (naturalRestY - leg.restPos.y) * restSmoothness;
                }
            } else {
                // When moving: feet stay PLANTED on the ground.
                // We only compute the neutral anchor point (where the foot "belongs"
                // relative to the body) for distance comparison and step targeting.
                // The foot's currentPos does NOT move until a step is triggered.

                // Neutral anchor = the natural resting spot for this foot relative to current body position
                // Apply forward offset for natural walking position
                // Perpendicular rest: leg extends sideways from body, forward offset shifts fore/aft
                const spreadAngle = segmentWorldAngle + (Math.PI / 2) * leg.side + (leg.angleOffset * Math.PI / 180);
                naturalRestX = baseX + Math.cos(spreadAngle) * effectiveLegLength + Math.cos(segmentWorldAngle) * forwardOffset;
                naturalRestY = baseY + Math.sin(spreadAngle) * effectiveLegLength + Math.sin(segmentWorldAngle) * forwardOffset;

                // Leg Anticipation: when a leg is about to step (getting close to threshold),
                // slightly shift the target forward to create a "reaching" motion
                if (this.legAnticipation && !leg.isMoving) {
                    const toRestDX = leg.restPos.x - leg.currentPos.x;
                    const toRestDY = leg.restPos.y - leg.currentPos.y;
                    const toRestDist = Math.sqrt(toRestDX * toRestDX + toRestDY * toRestDY);
                    const approachingStep = toRestDist > (this.stepDistance * 0.3);
                    if (approachingStep && velocityMag > 5) {
                        // Foot is approaching step threshold - add anticipation reach
                        const anticipationAmount = Math.min(0.3, (toRestDist / this.stepDistance) * 0.2);
                        const velDirX = velocityMag > 0 ? velocityX / velocityMag : 0;
                        const velDirY = velocityMag > 0 ? velocityY / velocityMag : 0;
                        naturalRestX += velDirX * effectiveLegLength * anticipationAmount;
                        naturalRestY += velDirY * effectiveLegLength * anticipationAmount;
                    }
                }

                // Store neutral anchor for step target computation (used below)
                leg._neutralAnchorX = naturalRestX;
                leg._neutralAnchorY = naturalRestY;

                // restPos tracks the neutral anchor so step trigger can measure
                // how far the planted foot has drifted behind the body
                leg.restPos.x = naturalRestX;
                leg.restPos.y = naturalRestY;

                // If mid-step, update target to track direction changes.
                // Use the CURRENT interpolated foot position (not stale startPos)
                // so that during turns the target follows the new movement direction.
                if (leg.isMoving) {
                    // Mirror the current foot's offset from anchor to get ahead target
                    const curBehindDX = leg.currentPos.x - naturalRestX;
                    const curBehindDY = leg.currentPos.y - naturalRestY;
                    let aheadX = naturalRestX - curBehindDX;
                    let aheadY = naturalRestY - curBehindDY;

                    // Clamp target to max reachable distance from base
                    const maxReach = effectiveLegLength * 1.3;
                    const tgtDX = aheadX - baseX;
                    const tgtDY = aheadY - baseY;
                    const tgtDist = Math.sqrt(tgtDX * tgtDX + tgtDY * tgtDY);
                    if (tgtDist > maxReach) {
                        const scale = maxReach / tgtDist;
                        aheadX = baseX + tgtDX * scale;
                        aheadY = baseY + tgtDY * scale;
                    }

                    // Faster tracking at higher speeds for responsiveness
                    const trackRate = 0.15 + Math.min(0.35, speedRatio * 0.15);
                    leg.targetPos.x += (aheadX - leg.targetPos.x) * trackRate;
                    leg.targetPos.y += (aheadY - leg.targetPos.y) * trackRate;
                }
            }

            // Initialize leg position if needed
            // For bipeds/quadrupeds, use phaseOffset to stagger initial positions
            // This ensures legs don't start at the same position and step simultaneously
            if (!leg.initialized) {
                // For creatures with few legs, stagger initial foot positions based on phaseOffset
                // phaseOffset is 0 for left legs, 0.5 for right legs
                // This puts one foot ahead and one foot behind the neutral position
                if (this.legPairs <= 2 && this.alternateLegs) {
                    // Stagger amount: one leg starts forward, one starts back
                    const staggerAmount = this.stepDistance * 0.3;
                    const staggerDir = (leg.phaseOffset > 0.25) ? 1 : -1; // 0 = back, 0.5 = forward
                    const staggerX = Math.cos(segmentWorldAngle) * staggerAmount * staggerDir;
                    const staggerY = Math.sin(segmentWorldAngle) * staggerAmount * staggerDir;
                    leg.currentPos.x = naturalRestX + staggerX;
                    leg.currentPos.y = naturalRestY + staggerY;
                } else {
                    leg.currentPos.x = naturalRestX;
                    leg.currentPos.y = naturalRestY;
                }
                leg.restPos.x = naturalRestX;
                leg.restPos.y = naturalRestY;
                leg.initialized = true;
            }

            // Check if leg needs to step (only when not already moving)
            if (!leg.isMoving) {
                const dx = leg.restPos.x - leg.currentPos.x;
                const dy = leg.restPos.y - leg.currentPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // When standing, handle feet based on keepFeetOnStop setting
                if (isStanding) {
                    // Check if this foot is unglued and needs to find footing
                    const footToNaturalDX = leg.currentPos.x - naturalRestX;
                    const footToNaturalDY = leg.currentPos.y - naturalRestY;
                    const footToNaturalDist = Math.sqrt(footToNaturalDX * footToNaturalDX + footToNaturalDY * footToNaturalDY);
                    const footingSearchThreshold = this.legLength * 0.5;
                    const needsFooting = footToNaturalDist > footingSearchThreshold;
                    
                    if (this.keepFeetOnStop && !needsFooting) {
                        // GLUED FEET: Keep feet firmly planted where they are
                        // Only force a step if the foot is stretched beyond physical limits
                        const maxStretch = this.legLength * 0.4;
                        
                        if (dist > maxStretch) {
                            // Foot is stretched too far - do a quick repositioning step
                            leg.isMoving = true;
                            leg.moveProgress = 0;
                            leg.startPos.x = leg.currentPos.x;
                            leg.startPos.y = leg.currentPos.y;
                            leg.targetPos.x = naturalRestX;
                            leg.targetPos.y = naturalRestY;
                            
                            // Calculate step perpendicular for arc (required to avoid NaN)
                            const stepDX = leg.targetPos.x - leg.startPos.x;
                            const stepDY = leg.targetPos.y - leg.startPos.y;
                            const stepDist = Math.sqrt(stepDX * stepDX + stepDY * stepDY);
                            if (stepDist > 2) {
                                leg.stepPerpX = -stepDY / stepDist;
                                leg.stepPerpY = stepDX / stepDist;
                            } else {
                                // For very short steps, use body perpendicular for a consistent arc
                                leg.stepPerpX = -Math.sin(segmentWorldAngle) * leg.side;
                                leg.stepPerpY =  Math.cos(segmentWorldAngle) * leg.side;
                            }
                        }
                        // No micro-drift when feet are glued - they stay EXACTLY where they are
                    } else if (needsFooting) {
                        // Foot is unglued - actively step to find footing
                        // Check if we should step (alternating leg logic still applies)
                        let shouldStep = true;
                        
                        if (this.alternateLegs && this.legPairs <= 2) {
                            // For bipeds/quadrupeds, don't step if opposite leg is mid-step
                            const oppositeLeg = this._legs.find(l =>
                                l.pairIndex === leg.pairIndex && l.side !== leg.side
                            );
                            if (oppositeLeg && oppositeLeg.isMoving && oppositeLeg.moveProgress < 0.6) {
                                shouldStep = false;
                            }
                        }
                        
                        if (shouldStep && dist > this.stepDistance * 0.3) {
                            leg.isMoving = true;
                            leg.moveProgress = 0;
                            leg.startPos.x = leg.currentPos.x;
                            leg.startPos.y = leg.currentPos.y;
                            leg.targetPos.x = naturalRestX;
                            leg.targetPos.y = naturalRestY;
                            
                            const stepDX = leg.targetPos.x - leg.startPos.x;
                            const stepDY = leg.targetPos.y - leg.startPos.y;
                            const stepDist = Math.sqrt(stepDX * stepDX + stepDY * stepDY);
                            if (stepDist > 0.1) {
                                leg.stepPerpX = -stepDY / stepDist;
                                leg.stepPerpY = stepDX / stepDist;
                            } else {
                                leg.stepPerpX = 0;
                                leg.stepPerpY = -1;
                            }
                        }
                    } else {
                        // Step to rest position if too far (like normal stepping, but with lower threshold)
                        const restStepThreshold = this.stepDistance * 0.5;
                        if (dist > restStepThreshold) {
                            // Start a step to rest position
                            leg.isMoving = true;
                            leg.moveProgress = 0;
                            leg.startPos.x = leg.currentPos.x;
                            leg.startPos.y = leg.currentPos.y;
                            leg.targetPos.x = leg.restPos.x;
                            leg.targetPos.y = leg.restPos.y;
                            
                            // Calculate step perpendicular for arc
                            const stepDX = leg.targetPos.x - leg.startPos.x;
                            const stepDY = leg.targetPos.y - leg.startPos.y;
                            const stepDist = Math.sqrt(stepDX * stepDX + stepDY * stepDY);
                            if (stepDist > 0.1) {
                                leg.stepPerpX = -stepDY / stepDist;
                                leg.stepPerpY = stepDX / stepDist;
                            } else {
                                leg.stepPerpX = 0;
                                leg.stepPerpY = -1;
                            }
                        }
                    }
                } else {
                    // TOP-DOWN IK: Foot stays planted. Measure how far the planted
                    // foot (currentPos) has drifted from the body's neutral anchor.
                    // Step triggers at HALF the step distance, and the foot swings
                    // to the same distance AHEAD of the anchor (mirror position).
                    const movementThreshold = 0.5;
                    const isSegmentMoving = segmentMovement > movementThreshold || isRotating;

                    // Scale step distance with speed
                    const stepDistScale = 1.0 + Math.max(0, speedRatio - 0.5) * 0.4;
                    const effectiveStepDistance = this.stepDistance * stepDistScale * (0.85 + leg.phaseOffset * 0.15);

                    // Trigger at HALF step distance — foot is half-way behind
                    const halfStepThreshold = effectiveStepDistance * 0.5;

                    if (dist > halfStepThreshold && isSegmentMoving) {
                        let shouldStep = true;

                        // At high speed or large overshoot, relax alternation to prevent
                        // both legs getting stuck while the body races ahead
                        const urgency = dist / effectiveStepDistance; // >0.5 = triggered, >1 = overdue
                        const relaxAlternation = urgency > 0.9; // near full step distance = urgent

                        if (this.alternateLegs) {
                            if (!relaxAlternation) {
                                const adjacentPairRange = 1;

                                for (let otherLeg of this._legs) {
                                    if (otherLeg === leg) continue;

                                    if (otherLeg.side === leg.side &&
                                        Math.abs(otherLeg.pairIndex - leg.pairIndex) <= adjacentPairRange &&
                                        otherLeg.isMoving) {
                                        shouldStep = false;
                                        break;
                                    }
                                }

                                if (shouldStep) {
                                    const oppositeLeg = this._legs.find(l =>
                                        l.pairIndex === leg.pairIndex && l.side !== leg.side
                                    );

                                    if (oppositeLeg && oppositeLeg.isMoving && oppositeLeg.moveProgress < 0.7) {
                                        shouldStep = false;
                                    }
                                }
                            }

                            // For bipeds/quadrupeds (≤2 leg pairs), ALWAYS enforce
                            // opposite-leg alternation regardless of urgency.
                            // This prevents both legs in the same pair from stepping
                            // in unison. Only the emergency override (1.8x) can force it.
                            if (shouldStep && this.legPairs <= 2) {
                                const oppositeLeg = this._legs.find(l =>
                                    l.pairIndex === leg.pairIndex && l.side !== leg.side
                                );
                                if (oppositeLeg && oppositeLeg.isMoving) {
                                    shouldStep = false;
                                }
                            }
                        }

                        // Emergency: foot is way too far behind — force step immediately
                        const emergencyDistance = this.stepDistance * 1.8;
                        if (dist > emergencyDistance) {
                            shouldStep = true;
                        }

                        if (shouldStep) {
                            leg.isMoving = true;
                            leg.moveProgress = 0;
                            leg.startPos.x = leg.currentPos.x;
                            leg.startPos.y = leg.currentPos.y;

                            // MIRROR TARGET: The foot is currently behind the neutral
                            // anchor. Compute how far behind, then place the target
                            // the same distance AHEAD. This creates a symmetric stride
                            // where the foot swings from behind to ahead of the body.
                            const anchorX = leg._neutralAnchorX !== undefined ? leg._neutralAnchorX : leg.restPos.x;
                            const anchorY = leg._neutralAnchorY !== undefined ? leg._neutralAnchorY : leg.restPos.y;

                            // Vector from anchor to planted foot (the "behind" offset)
                            const behindDX = leg.currentPos.x - anchorX;
                            const behindDY = leg.currentPos.y - anchorY;

                            // Mirror: target = anchor - behindOffset (same distance ahead)
                            let mirrorX = anchorX - behindDX;
                            let mirrorY = anchorY - behindDY;

                            // CLAMP: Don't let the target exceed the leg's physical reach
                            // This prevents wildly overshooting steps at high speed
                            const maxReach = effectiveLegLength * 1.3;
                            const mirrorFromBaseDX = mirrorX - baseX;
                            const mirrorFromBaseDY = mirrorY - baseY;
                            const mirrorDist = Math.sqrt(mirrorFromBaseDX * mirrorFromBaseDX + mirrorFromBaseDY * mirrorFromBaseDY);
                            if (mirrorDist > maxReach) {
                                const clampScale = maxReach / mirrorDist;
                                mirrorX = baseX + mirrorFromBaseDX * clampScale;
                                mirrorY = baseY + mirrorFromBaseDY * clampScale;
                            }

                            leg.targetPos.x = mirrorX;
                            leg.targetPos.y = mirrorY;

                            const stepDX = leg.targetPos.x - leg.startPos.x;
                            const stepDY = leg.targetPos.y - leg.startPos.y;
                            const stepDist = Math.sqrt(stepDX * stepDX + stepDY * stepDY);

                            if (stepDist > 0.1) {
                                leg.stepPerpX = -stepDY / stepDist;
                                leg.stepPerpY = stepDX / stepDist;
                            } else {
                                leg.stepPerpX = Math.cos(segmentWorldAngle + Math.PI / 2);
                                leg.stepPerpY = Math.sin(segmentWorldAngle + Math.PI / 2);
                            }
                        }
                    }
                }
            }

            // Animate stepping (only when moving, not standing)
            if (leg.isMoving) {
                const dx = leg.targetPos.x - leg.startPos.x;
                const dy = leg.targetPos.y - leg.startPos.y;
                const stepDist = Math.sqrt(dx * dx + dy * dy);
                const distMultiplier = Math.min(2, Math.max(0.8, stepDist / this.stepDistance));
                // Scale step animation speed more aggressively with creature speed
                // At higher speeds, steps MUST complete faster to prevent floating/glitching
                const moveSpeedMultiplier = 1.0 + Math.max(0, speedRatio - 0.2) * 1.5;

                leg.moveProgress += deltaTime * this.stepSpeed * distMultiplier * moveSpeedMultiplier;

                // Safety: if the target has drifted very far from where the foot
                // currently is (e.g. sudden direction change), snap to finish
                const footToTargetDX = leg.targetPos.x - leg.currentPos.x;
                const footToTargetDY = leg.targetPos.y - leg.currentPos.y;
                const footToTargetDist = Math.sqrt(footToTargetDX * footToTargetDX + footToTargetDY * footToTargetDY);
                const maxAllowedStepDist = this.legLength * 2.5;
                if (footToTargetDist > maxAllowedStepDist) {
                    // Foot is absurdly far from target — snap to anchor to recover
                    leg.moveProgress = 1;
                }

                if (leg.moveProgress >= 1) {
                    leg.moveProgress = 1;
                    leg.isMoving = false;
                    leg.currentPos.x = leg.targetPos.x;
                    leg.currentPos.y = leg.targetPos.y;
                } else {
                    const t = leg.moveProgress;
                    
                    // Use smoothstep for natural, organic motion without spring artifacts
                    // smoothstep(t) = 3t² - 2t³ provides smooth acceleration and deceleration
                    // This eliminates the abrupt transitions that cause the "spring" glitch
                    const smoothstep = (x) => x * x * (3 - 2 * x);
                    
                    // Even smoother: smootherstep = 6t⁵ - 15t⁴ + 10t³
                    // Has zero 1st and 2nd derivative at endpoints for ultra-smooth motion
                    const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);
                    
                    // Blend smoothstep with slight asymmetry: quicker lift, gentler landing
                    // This mimics natural walking where legs lift quickly but set down gently
                    let eased;
                    if (t < 0.45) {
                        // Lift phase - slightly faster initial lift
                        const t2 = t / 0.45;
                        eased = smoothstep(t2) * 0.45;
                    } else {
                        // Land phase - gentler, more controlled landing
                        const t2 = (t - 0.45) / 0.55;
                        eased = 0.45 + smootherstep(t2) * 0.55;
                    }

                    let arcOffsetX = 0;
                    let arcOffsetY = 0;

                    if (this.stepHeight > 0) {
                        // Use a smooth bell curve for arc height - no sudden changes
                        // Peak at 35% through the step for natural forward-reaching motion
                        // Using smoothed sine with gentle transitions at endpoints
                        const peakPoint = 0.35;
                        let arcT;
                        if (t < peakPoint) {
                            // Rising: smooth acceleration to peak
                            arcT = smoothstep(t / peakPoint);
                        } else {
                            // Falling: smooth deceleration from peak  
                            arcT = smoothstep(1 - (t - peakPoint) / (1 - peakPoint));
                        }
                        // Use sine for the actual height curve (naturally smooth)
                        const arcHeight = Math.sin(arcT * Math.PI * 0.5) * this.stepHeight;

                        // Arc goes perpendicular to step direction (outward from body)
                        arcOffsetX = leg.stepPerpX * arcHeight * leg.side;
                        arcOffsetY = leg.stepPerpY * arcHeight * leg.side;
                    }

                    leg.currentPos.x = leg.startPos.x + dx * eased + arcOffsetX;
                    leg.currentPos.y = leg.startPos.y + dy * eased + arcOffsetY;
                }
            }
        }
        
        // ===== FOOT CONTAINMENT: Prevent feet from overlapping solid colliders =====
        if (this.constrainFeet) {
            for (let leg of this._legs) {
                const corrected = this._constrainFootPosition(
                    leg.currentPos.x, leg.currentPos.y,
                    leg.baseX, leg.baseY
                );
                if (corrected) {
                    leg.currentPos.x = corrected.x;
                    leg.currentPos.y = corrected.y;
                    
                    // Also update the rest/target positions so the foot doesn't
                    // immediately try to step back into the wall
                    if (!leg.isMoving) {
                        leg.restPos.x = corrected.x;
                        leg.restPos.y = corrected.y;
                    } else {
                        // If mid-step, update the target so it lands in a valid spot
                        const targetCorrected = this._constrainFootPosition(
                            leg.targetPos.x, leg.targetPos.y,
                            leg.baseX, leg.baseY
                        );
                        if (targetCorrected) {
                            leg.targetPos.x = targetCorrected.x;
                            leg.targetPos.y = targetCorrected.y;
                        }
                    }
                }
            }
        }
    }

    // ==================== KNOCKBACK COLLISION SYSTEM ====================

    /**
     * Check if knockback would push the creature into a wall/collider.
     * Returns multipliers to reduce knockback in blocked directions.
     * @param {number} knockbackX - Knockback velocity X to apply
     * @param {number} knockbackY - Knockback velocity Y to apply
     * @returns {{multiplierX: number, multiplierY: number}|null} Multipliers (0-1) for each axis, or null if no collision
     */
    _checkKnockbackCollision(knockbackX, knockbackY) {
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return null;

        const myPos = this.gameObject.getWorldPosition();
        const creatureRadius = (this.headSize || 20) * (this.creatureScale || 1.0);
        
        // Calculate how far knockback would push us (estimate based on velocity decay)
        const knockbackMag = Math.sqrt(knockbackX * knockbackX + knockbackY * knockbackY);
        if (knockbackMag < 1) return null;
        
        // Estimate total knockback distance (velocity decays with friction ~0.85-0.95)
        // Approximate with 3-5 frames of movement
        const estimatedDistance = knockbackMag * 0.2; // ~0.2 seconds of knockback travel
        
        // Check position we'd end up at
        const targetX = myPos.x + knockbackX * 0.15;
        const targetY = myPos.y + knockbackY * 0.15;
        
        // Search for colliders that might block knockback
        const searchRadius = estimatedDistance + creatureRadius + 50;
        const searchRadiusSq = searchRadius * searchRadius;
        const tag = this.footCollisionSolidTag; // Reuse foot collision tag for consistency
        
        let blockedX = false;
        let blockedY = false;
        
        for (const obj of _instances) {
            if (obj === this.gameObject) continue;
            
            // Quick distance check
            const dx = obj.position.x - myPos.x;
            const dy = obj.position.y - myPos.y;
            if (dx * dx + dy * dy > searchRadiusSq) continue;
            
            // Check BoxCollider
            const boxCollider = obj.getModule ? obj.getModule('BoxCollider') : null;
            if (boxCollider && !boxCollider.isTrigger) {
                if (!tag || obj.tag === tag || boxCollider.tag === tag) {
                    const bounds = boxCollider.getBounds();
                    if (bounds) {
                        // Check if knockback direction would push us into this box
                        const collision = this._checkPointBoxKnockback(
                            myPos.x, myPos.y, targetX, targetY, 
                            creatureRadius, bounds
                        );
                        if (collision.blockedX) blockedX = true;
                        if (collision.blockedY) blockedY = true;
                    }
                }
            }
            
            // Check CircleCollider / SphereCollider
            const circleCollider = obj.getModule ? obj.getModule('CircleCollider') || obj.getModule('SphereCollider') : null;
            if (circleCollider && !circleCollider.isTrigger) {
                if (!tag || obj.tag === tag || circleCollider.tag === tag) {
                    const collision = this._checkPointCircleKnockback(
                        myPos.x, myPos.y, targetX, targetY,
                        creatureRadius, obj.position.x, obj.position.y, circleCollider.radius || 20
                    );
                    if (collision.blockedX) blockedX = true;
                    if (collision.blockedY) blockedY = true;
                }
            }
            
            // Check PolygonCollider (simplified - treat as bounds)
            const polyCollider = obj.getModule ? obj.getModule('PolygonCollider') : null;
            if (polyCollider && !polyCollider.isTrigger) {
                if (!tag || obj.tag === tag || polyCollider.tag === tag) {
                    const bounds = polyCollider.getBounds ? polyCollider.getBounds() : null;
                    if (bounds) {
                        const collision = this._checkPointBoxKnockback(
                            myPos.x, myPos.y, targetX, targetY,
                            creatureRadius, bounds
                        );
                        if (collision.blockedX) blockedX = true;
                        if (collision.blockedY) blockedY = true;
                    }
                }
            }
        }
        
        if (blockedX || blockedY) {
            return {
                multiplierX: blockedX ? 0 : 1,
                multiplierY: blockedY ? 0 : 1
            };
        }
        
        return null;
    }

    /**
     * Check if knockback path intersects a box collider bounds.
     * @private
     */
    _checkPointBoxKnockback(startX, startY, endX, endY, radius, bounds) {
        const result = { blockedX: false, blockedY: false };
        
        // Expand bounds by creature radius
        const expandedMinX = bounds.minX - radius;
        const expandedMaxX = bounds.maxX + radius;
        const expandedMinY = bounds.minY - radius;
        const expandedMaxY = bounds.maxY + radius;
        
        // Check if we're already inside or would end up inside
        const wouldBeInsideX = endX >= expandedMinX && endX <= expandedMaxX &&
                              startY >= expandedMinY && startY <= expandedMaxY;
        const wouldBeInsideY = startX >= expandedMinX && startX <= expandedMaxX &&
                              endY >= expandedMinY && endY <= expandedMaxY;
        
        // Check X direction knockback
        if (endX !== startX) {
            const movingRight = endX > startX;
            if (movingRight) {
                // Would we cross into the box from the left?
                if (startX < expandedMinX && endX >= expandedMinX && 
                    startY >= expandedMinY && startY <= expandedMaxY) {
                    result.blockedX = true;
                }
            } else {
                // Would we cross into the box from the right?
                if (startX > expandedMaxX && endX <= expandedMaxX &&
                    startY >= expandedMinY && startY <= expandedMaxY) {
                    result.blockedX = true;
                }
            }
        }
        
        // Check Y direction knockback
        if (endY !== startY) {
            const movingDown = endY > startY;
            if (movingDown) {
                // Would we cross into the box from above?
                if (startY < expandedMinY && endY >= expandedMinY &&
                    startX >= expandedMinX && startX <= expandedMaxX) {
                    result.blockedY = true;
                }
            } else {
                // Would we cross into the box from below?
                if (startY > expandedMaxY && endY <= expandedMaxY &&
                    startX >= expandedMinX && startX <= expandedMaxX) {
                    result.blockedY = true;
                }
            }
        }
        
        return result;
    }

    /**
     * Check if knockback path intersects a circle collider.
     * @private
     */
    _checkPointCircleKnockback(startX, startY, endX, endY, creatureRadius, circleX, circleY, circleRadius) {
        const result = { blockedX: false, blockedY: false };
        const combinedRadius = creatureRadius + circleRadius;
        
        // Check if end position would be inside the circle
        const dxEnd = endX - circleX;
        const dyEnd = endY - circleY;
        const distEndSq = dxEnd * dxEnd + dyEnd * dyEnd;
        
        if (distEndSq < combinedRadius * combinedRadius) {
            // Would end up inside - determine which axis is more blocked
            const dxStart = startX - circleX;
            const dyStart = startY - circleY;
            
            // Check X movement
            const dxEndOnlyX = (endX - circleX);
            const distXOnlySq = dxEndOnlyX * dxEndOnlyX + dyStart * dyStart;
            if (distXOnlySq < combinedRadius * combinedRadius && Math.abs(endX - startX) > 1) {
                result.blockedX = true;
            }
            
            // Check Y movement  
            const dyEndOnlyY = (endY - circleY);
            const distYOnlySq = dxStart * dxStart + dyEndOnlyY * dyEndOnlyY;
            if (distYOnlySq < combinedRadius * combinedRadius && Math.abs(endY - startY) > 1) {
                result.blockedY = true;
            }
        }
        
        return result;
    }

    // ==================== FOOT COLLISION SYSTEM ====================

    /**
     * Get all solid objects within foot collision search radius.
     * @returns {Array<{obj, collider, type}>} Array of solid object descriptors
     */
    _getFootSolidObjects() {
        const CACHE_FRAMES = 6; // rebuild every 6 frames (~100ms at 60fps)
        if (this._footSolidCache &&
            (this._footFrameCount - (this._footSolidCacheFrame || 0)) < CACHE_FRAMES) {
            return this._footSolidCache;
        }
    
        const solids = [];
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) { this._footSolidCache = solids; return solids; }
    
        const myPos = this.gameObject.position;
        const searchRadiusSq = this.footCollisionSearchRadius * this.footCollisionSearchRadius;
        const tag = this.footCollisionSolidTag;
    
        for (const obj of _instances) {
            if (obj === this.gameObject) continue;
            const dx = obj.position.x - myPos.x;
            const dy = obj.position.y - myPos.y;
            if (dx * dx + dy * dy > searchRadiusSq) continue;
            const boxCollider = obj.getModule ? obj.getModule('BoxCollider') : null;
            if (boxCollider) {
                if (!tag || obj.tag === tag || boxCollider.tag === tag) {
                    solids.push({ obj, collider: boxCollider, type: 'box' });
                }
            }
            const polyCollider = obj.getModule ? obj.getModule('PolygonCollider') : null;
            if (polyCollider) {
                if (!tag || obj.tag === tag || polyCollider.tag === tag) {
                    solids.push({ obj, collider: polyCollider, type: 'polygon' });
                }
            }
            const sphereCollider = obj.getModule ? obj.getModule('SphereCollider') : null;
            if (sphereCollider) {
                if (!tag || obj.tag === tag || sphereCollider.tag === tag) {
                    solids.push({ obj, collider: sphereCollider, type: 'sphere' });
                }
            }
        }
    
        this._footSolidCache = solids;
        this._footSolidCacheFrame = this._footFrameCount;
        return solids;
    }

    /**
     * Check if a foot position collides with any solid object.
     * Also checks if the line from body to foot crosses through a wall (thin wall fix).
     * @param {number} footX - Foot world X
     * @param {number} footY - Foot world Y
     * @param {number} baseX - Leg base (hip) world X
     * @param {number} baseY - Leg base (hip) world Y
     * @returns {{x: number, y: number}|null} Corrected foot position, or null if no collision
     */
    _constrainFootPosition(footX, footY, baseX, baseY) {
        // Cache solid objects once per frame
        if (!this._footCachedSolids || this._footCachedSolidsFrame !== this._footFrameCount) {
            this._footCachedSolids = this._getFootSolidObjects();
            this._footCachedSolidsFrame = this._footFrameCount;
        }

        const solids = this._footCachedSolids;
        if (solids.length === 0) return null;

        const footRadius = this.footCollisionRadius || 4;

        // FIRST: Check if the line from body to foot crosses through any solid.
        // This prevents feet from appearing on the other side of thin walls.
        const bodyPos = this.gameObject.position;
        const lineResult = this._checkFootLineCrossesSolid(bodyPos.x, bodyPos.y, footX, footY, solids, footRadius);
        if (lineResult) {
            return lineResult;
        }

        // SECOND: Check if foot directly overlaps any solid
        for (const { obj, collider, type } of solids) {
            let collision = null;

            if (type === 'sphere') {
                collision = this._checkFootCircleSphere(footX, footY, footRadius, obj, collider);
            } else if (type === 'polygon') {
                collision = this._checkFootCirclePolygon(footX, footY, footRadius, collider);
            } else {
                const scale = obj.scale || { x: 1, y: 1 };
                const hasScale = Math.abs(scale.x - 1) > 0.01 || Math.abs(scale.y - 1) > 0.01;
                const boxAngle = obj.angle || 0;
                const hasRotation = Math.abs(boxAngle) > 0.01;

                if (hasScale || hasRotation) {
                    collision = this._checkFootCircleRotatedBox(footX, footY, footRadius, obj, collider);
                } else {
                    collision = this._checkFootCircleAABB(footX, footY, footRadius, obj, collider);
                }
            }

            if (collision) {
                // Push foot out of the solid along the collision normal
                const pushDist = (collision.penetration || 1) + 1;
                let newX = footX + collision.pushDirection.x * pushDist;
                let newY = footY + collision.pushDirection.y * pushDist;

                // Ensure the pushed-out foot is on the body's side
                const lineCheck = this._checkFootLineCrossesSolid(bodyPos.x, bodyPos.y, newX, newY, solids, footRadius);
                if (lineCheck) {
                    return lineCheck;
                }

                return { x: newX, y: newY };
            }
        }

        return null;
    }

    /**
     * Check if a line from point A to point B crosses through any solid.
     * Returns the last clear position before penetrating the solid.
     * Prevents feet from appearing on the other side of thin walls.
     */
    _checkFootLineCrossesSolid(fromX, fromY, toX, toY, solids, radius) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return null;

        const stepSize = Math.max(radius * 0.75, 2);
        const steps = Math.ceil(dist / stepSize);

        let wasInside = false;
        let entryPoint = null;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const sampleX = fromX + dx * t;
            const sampleY = fromY + dy * t;

            const collision = this._checkFootCollisionAt(sampleX, sampleY, radius, solids);

            if (collision && !wasInside) {
                const prevT = Math.max(0, (i - 1) / steps);
                entryPoint = {
                    x: fromX + dx * prevT,
                    y: fromY + dy * prevT
                };
                wasInside = true;
            } else if (!collision && wasInside) {
                return entryPoint;
            }
        }

        if (wasInside && entryPoint) {
            const finalCollision = this._checkFootCollisionAt(toX, toY, radius, solids);
            if (finalCollision) {
                return entryPoint;
            } else {
                return entryPoint;
            }
        }

        return null;
    }

    /**
     * Check if a point collides with any solid object (for foot collision).
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} radius - Collision radius
     * @param {Array} solidObjects - Array of solid object descriptors
     * @returns {Object|null} Collision info or null
     */
    _checkFootCollisionAt(x, y, radius, solidObjects) {
        for (const { obj, collider, type } of solidObjects) {
            let collision = null;

            if (type === 'sphere') {
                collision = this._checkFootCircleSphere(x, y, radius, obj, collider);
            } else if (type === 'polygon') {
                collision = this._checkFootCirclePolygon(x, y, radius, collider);
            } else {
                const scale = obj.scale || { x: 1, y: 1 };
                const hasScale = Math.abs(scale.x - 1) > 0.01 || Math.abs(scale.y - 1) > 0.01;
                const boxAngle = obj.angle || 0;
                const hasRotation = Math.abs(boxAngle) > 0.01;

                if (hasScale || hasRotation) {
                    collision = this._checkFootCircleRotatedBox(x, y, radius, obj, collider);
                } else {
                    collision = this._checkFootCircleAABB(x, y, radius, obj, collider);
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
     * Circle-to-AABB collision for foot (non-rotated boxes)
     */
    _checkFootCircleAABB(x, y, radius, obj, collider) {
        let bounds;
        if (typeof collider.getBounds === 'function') {
            bounds = collider.getBounds();
        } else {
            const boxX = obj.position.x + (collider.offsetX || 0);
            const boxY = obj.position.y + (collider.offsetY || 0);
            const boxW = collider.width || 32;
            const boxH = collider.height || 32;
            bounds = {
                left: boxX - boxW / 2,
                right: boxX + boxW / 2,
                top: boxY - boxH / 2,
                bottom: boxY + boxH / 2,
                centerX: boxX,
                centerY: boxY
            };
        }

        const closestX = Math.max(bounds.left, Math.min(x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(y, bounds.bottom));

        const dx = x - closestX;
        const dy = y - closestY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius * radius;

        if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const penetration = radius - dist;

            let pushX, pushY;
            if (dist > 0.1) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
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

            return {
                pushDirection: { x: pushX, y: pushY },
                penetration: penetration
            };
        }

        return null;
    }

    /**
     * Circle-to-rotated-box collision for foot (OBB approach)
     */
    _checkFootCircleRotatedBox(x, y, radius, obj, collider) {
        // Use getWorldPoints() which properly handles scale and rotation
        if (typeof collider.getWorldPoints === 'function') {
            const worldPoints = collider.getWorldPoints();
            if (worldPoints && worldPoints.length === 4) {
                return this._checkFootCircleOBB(x, y, radius, worldPoints);
            }
        }

        // Fallback: manual calculation
        let boxCenterX, boxCenterY, halfW, halfH, angle;

        if (typeof collider.getBounds === 'function') {
            const bounds = collider.getBounds();
            boxCenterX = bounds.centerX;
            boxCenterY = bounds.centerY;
            halfW = bounds.width / 2;
            halfH = bounds.height / 2;
        } else {
            const scale = obj.scale || { x: 1, y: 1 };
            boxCenterX = obj.position.x + (collider.offsetX || 0);
            boxCenterY = obj.position.y + (collider.offsetY || 0);
            halfW = ((collider.width || 32) * Math.abs(scale.x)) / 2;
            halfH = ((collider.height || 32) * Math.abs(scale.y)) / 2;
        }

        angle = (obj.angle || 0) * Math.PI / 180;

        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const relX = x - boxCenterX;
        const relY = y - boxCenterY;
        const localX = relX * cos - relY * sin;
        const localY = relX * sin + relY * cos;

        const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
        const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));

        const localDx = localX - closestLocalX;
        const localDy = localY - closestLocalY;
        const distSq = localDx * localDx + localDy * localDy;
        const radiusSq = radius * radius;

        if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const penetration = radius - dist;

            const cos2 = Math.cos(angle);
            const sin2 = Math.sin(angle);
            let pushLocalX, pushLocalY;

            if (dist > 0.1) {
                pushLocalX = localDx / dist;
                pushLocalY = localDy / dist;
            } else {
                const distToLeft = localX - (-halfW);
                const distToRight = halfW - localX;
                const distToTop = localY - (-halfH);
                const distToBottom = halfH - localY;
                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                if (minDist === distToLeft) {
                    pushLocalX = -1; pushLocalY = 0;
                } else if (minDist === distToRight) {
                    pushLocalX = 1; pushLocalY = 0;
                } else if (minDist === distToTop) {
                    pushLocalX = 0; pushLocalY = -1;
                } else {
                    pushLocalX = 0; pushLocalY = 1;
                }
            }

            const worldPushX = pushLocalX * cos2 - pushLocalY * sin2;
            const worldPushY = pushLocalX * sin2 + pushLocalY * cos2;

            return {
                pushDirection: { x: worldPushX, y: worldPushY },
                penetration: penetration
            };
        }

        return null;
    }

    /**
     * Circle-to-OBB collision for foot using world points
     */
    _checkFootCircleOBB(x, y, radius, worldPoints) {
        let centerX = 0, centerY = 0;
        for (const p of worldPoints) {
            centerX += p.x;
            centerY += p.y;
        }
        centerX /= 4;
        centerY /= 4;

        const edge1X = worldPoints[1].x - worldPoints[0].x;
        const edge1Y = worldPoints[1].y - worldPoints[0].y;
        const edge2X = worldPoints[3].x - worldPoints[0].x;
        const edge2Y = worldPoints[3].y - worldPoints[0].y;

        const halfW = Math.sqrt(edge1X * edge1X + edge1Y * edge1Y) / 2;
        const halfH = Math.sqrt(edge2X * edge2X + edge2Y * edge2Y) / 2;

        const axis1X = halfW > 0.001 ? edge1X / (halfW * 2) : 1;
        const axis1Y = halfW > 0.001 ? edge1Y / (halfW * 2) : 0;
        const axis2X = halfH > 0.001 ? edge2X / (halfH * 2) : 0;
        const axis2Y = halfH > 0.001 ? edge2Y / (halfH * 2) : 1;

        const relX = x - centerX;
        const relY = y - centerY;
        const localX = relX * axis1X + relY * axis1Y;
        const localY = relX * axis2X + relY * axis2Y;

        const closestLocalX = Math.max(-halfW, Math.min(localX, halfW));
        const closestLocalY = Math.max(-halfH, Math.min(localY, halfH));

        const closestWorldX = centerX + closestLocalX * axis1X + closestLocalY * axis2X;
        const closestWorldY = centerY + closestLocalX * axis1Y + closestLocalY * axis2Y;

        const dx = x - closestWorldX;
        const dy = y - closestWorldY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius * radius;

        if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const penetration = radius - dist;

            let pushX, pushY;
            if (dist > 0.1) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
                const distToLeft = localX - (-halfW);
                const distToRight = halfW - localX;
                const distToTop = localY - (-halfH);
                const distToBottom = halfH - localY;
                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                let localPushX = 0, localPushY = 0;
                if (minDist === distToLeft) {
                    localPushX = -1;
                } else if (minDist === distToRight) {
                    localPushX = 1;
                } else if (minDist === distToTop) {
                    localPushY = -1;
                } else {
                    localPushY = 1;
                }

                pushX = localPushX * axis1X + localPushY * axis2X;
                pushY = localPushX * axis1Y + localPushY * axis2Y;
                const pushLen = Math.sqrt(pushX * pushX + pushY * pushY);
                if (pushLen > 0.001) {
                    pushX /= pushLen;
                    pushY /= pushLen;
                } else {
                    pushX = 0;
                    pushY = -1;
                }
            }

            return {
                pushDirection: { x: pushX, y: pushY },
                penetration: penetration
            };
        }

        return null;
    }

    /**
     * Circle-to-SphereCollider collision for foot
     */
    _checkFootCircleSphere(x, y, radius, obj, sphereCollider) {
        const center = sphereCollider.getCenter();
        const otherRadius = sphereCollider.getScaledRadius();

        const dx = x - center.x;
        const dy = y - center.y;
        const distSq = dx * dx + dy * dy;
        const combinedRadius = radius + otherRadius;

        if (distSq < combinedRadius * combinedRadius) {
            const dist = Math.sqrt(distSq);
            const penetration = combinedRadius - dist;

            let pushX, pushY;
            if (dist > 0.1) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
                pushX = 0;
                pushY = -1;
            }

            return {
                pushDirection: { x: pushX, y: pushY },
                penetration: penetration
            };
        }

        return null;
    }

    /**
     * Circle-to-polygon collision for foot
     */
    _checkFootCirclePolygon(x, y, radius, polygonCollider) {
        const worldPoints = polygonCollider.getWorldPoints();
        if (!worldPoints || worldPoints.length < 3) return null;

        // Check if circle center is inside the polygon
        if (this._footPointInPolygon(x, y, worldPoints)) {
            const closestEdge = this._footClosestPointOnPolygonEdges(x, y, worldPoints);
            const dx = x - closestEdge.x;
            const dy = y - closestEdge.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const edgeNormal = this._footGetEdgeNormal(worldPoints, closestEdge.edgeIndex);
            const penetration = radius + dist;

            return {
                pushDirection: edgeNormal,
                penetration: penetration
            };
        }

        // Circle is outside - check if it overlaps any edge
        const closest = this._footClosestPointOnPolygonEdges(x, y, worldPoints);
        const dx = x - closest.x;
        const dy = y - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
            const penetration = radius - dist;
            return {
                pushDirection: dist > 0.1 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 },
                penetration: penetration
            };
        }

        return null;
    }

    /** Point-in-polygon test (ray casting) for foot collision */
    _footPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    /** Find closest point on polygon edges for foot collision */
    _footClosestPointOnPolygonEdges(x, y, points) {
        let closestDist = Infinity;
        let closest = { x: 0, y: 0, edgeIndex: 0 };

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            const point = this._footClosestPointOnSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            const dx = x - point.x;
            const dy = y - point.y;
            const dist = dx * dx + dy * dy;

            if (dist < closestDist) {
                closestDist = dist;
                closest = { x: point.x, y: point.y, edgeIndex: i };
            }
        }

        return closest;
    }

    /** Closest point on a line segment for foot collision */
    _footClosestPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq === 0) return { x: x1, y: y1 };
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
        return { x: x1 + t * dx, y: y1 + t * dy };
    }

    /** Get outward normal of a polygon edge for foot collision */
    _footGetEdgeNormal(points, edgeIndex) {
        const p1 = points[edgeIndex];
        const p2 = points[(edgeIndex + 1) % points.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return { x: 0, y: -1 };
        return { x: dy / len, y: -dx / len };
    }

    _generateRandomColorScheme() {
        // Generate a base hue (0-360)
        const baseHue = Math.floor(Math.random() * 360);

        // Choose a color scheme type
        const schemeTypes = ['monochromatic', 'analogous', 'complementary', 'triadic'];
        const schemeType = schemeTypes[Math.floor(Math.random() * schemeTypes.length)];

        let hues = [];

        switch (schemeType) {
            case 'monochromatic':
                // Same hue, different saturations and lightness
                hues = [baseHue, baseHue, baseHue, baseHue, baseHue, baseHue, baseHue, baseHue];
                break;
            case 'analogous':
                // Hues within 30 degrees of each other
                hues = [
                    baseHue,
                    (baseHue + 20) % 360,
                    (baseHue + 40) % 360,
                    (baseHue - 20 + 360) % 360,
                    baseHue,
                    (baseHue + 30) % 360,
                    (baseHue + 15) % 360,
                    (baseHue + 10) % 360
                ];
                break;
            case 'complementary':
                // Base hue and its complement (180 degrees opposite)
                const complementHue = (baseHue + 180) % 360;
                hues = [
                    baseHue,
                    baseHue,
                    complementHue,
                    baseHue,
                    complementHue,
                    baseHue,
                    complementHue,
                    baseHue
                ];
                break;
            case 'triadic':
                // Three hues evenly spaced (120 degrees apart)
                const triadic1 = (baseHue + 120) % 360;
                const triadic2 = (baseHue + 240) % 360;
                hues = [
                    baseHue,
                    baseHue,
                    triadic1,
                    baseHue,
                    triadic2,
                    triadic1,
                    baseHue,
                    triadic2
                ];
                break;
        }

        // Convert HSL to hex for each color
        const colors = hues.map((hue, index) => {
            // Vary saturation and lightness for depth
            const saturation = 40 + Math.random() * 40; // 40-80%
            let lightness;

            // Assign roles based on index
            if (index === 0) { // body color - medium
                lightness = 30 + Math.random() * 20;
            } else if (index === 1 || index === 2) { // leg/arm colors - darker
                lightness = 20 + Math.random() * 20;
            } else if (index === 3) { // accent color - lighter or more saturated
                lightness = 40 + Math.random() * 25;
            } else if (index === 4) { // eye color - bright
                lightness = 60 + Math.random() * 30;
            } else { // other accent colors
                lightness = 35 + Math.random() * 25;
            }

            return this._hslToHex(hue, saturation, lightness);
        });

        return {
            bodyColor: colors[0],
            legColor: colors[1],
            armColor: colors[2],
            accentColor: colors[3],
            eyeColor: colors[4],
            antennaColor: colors[5],
            mandibleColor: colors[6],
            spineColor: colors[7]
        };
    }

    _hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        const toHex = (val) => {
            const hex = Math.round((val + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    _randomizeAllProperties() {
        // ═══════════════════════════════════════════════════════════════
        // Helper utilities
        // ═══════════════════════════════════════════════════════════════
        const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
        const randFloat = (min, max) => min + Math.random() * (max - min);
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const chance = (pct) => Math.random() < pct;
        const biasLow = (min, max) => min + Math.pow(Math.random(), 2) * (max - min); // biased toward min
        const biasHigh = (min, max) => max - Math.pow(Math.random(), 2) * (max - min); // biased toward max

        // ═══════════════════════════════════════════════════════════════
        // Pick a creature archetype for coherent randomization
        // ═══════════════════════════════════════════════════════════════
        const archetype = pick([
            'insectoid',   // many legs, small, fast, antennae
            'arachnid',    // 4 leg pairs, wide, angular
            'reptilian',   // 2 leg pairs, tail, scales
            'humanoid',    // 1 leg pair, arms, hair
            'serpentine',  // no legs, long body, snake wave
            'crustacean',  // wide body, claws, stalked eyes
            'beast',       // 2 leg pairs, tail, fur
            'eldritch',    // weird proportions, many eyes, tentacle-like
            'avian',       // 1 leg pair, small body, feathery
            'aquatic',     // tentacles, flowing movement
        ]);

        // ═══════════════════════════════════════════════════════════════
        // BODY STRUCTURE
        // ═══════════════════════════════════════════════════════════════
        switch (archetype) {
            case 'serpentine':
                this.bodySegments = randInt(8, 18);
                this.segmentLength = randFloat(8, 16);
                this.headSize = randFloat(12, 22);
                this.bodyWidth = randFloat(6, 14);
                this.tailTaper = randFloat(0.5, 0.9);
                break;
            case 'insectoid':
                this.bodySegments = randInt(2, 5);
                this.segmentLength = randFloat(8, 18);
                this.headSize = randFloat(10, 20);
                this.bodyWidth = randFloat(6, 16);
                this.tailTaper = randFloat(0.1, 0.5);
                break;
            case 'arachnid':
                this.bodySegments = randInt(1, 2);
                this.segmentLength = randFloat(15, 35);
                this.headSize = randFloat(18, 35);
                this.bodyWidth = randFloat(20, 40);
                this.tailTaper = randFloat(0, 0.3);
                break;
            case 'humanoid':
                this.bodySegments = randInt(1, 2);
                this.segmentLength = randFloat(15, 25);
                this.headSize = randFloat(14, 22);
                this.bodyWidth = randFloat(12, 20);
                this.tailTaper = randFloat(0, 0.2);
                break;
            case 'eldritch':
                this.bodySegments = randInt(3, 12);
                this.segmentLength = randFloat(10, 30);
                this.headSize = randFloat(20, 60);
                this.bodyWidth = randFloat(10, 35);
                this.tailTaper = randFloat(0, 1);
                break;
            case 'aquatic':
                this.bodySegments = randInt(2, 6);
                this.segmentLength = randFloat(12, 25);
                this.headSize = randFloat(20, 40);
                this.bodyWidth = randFloat(15, 30);
                this.tailTaper = randFloat(0.2, 0.6);
                break;
            default: // reptilian, beast, crustacean, avian
                this.bodySegments = randInt(2, 6);
                this.segmentLength = randFloat(12, 30);
                this.headSize = randFloat(12, 30);
                this.bodyWidth = randFloat(8, 25);
                this.tailTaper = randFloat(0.2, 0.8);
                break;
        }

        this.segmentSmoothing = randFloat(0.05, 0.5);

        // Body shape
        this.bodyShape = pick(["ellipse", "ellipse", "circle", "rectangle", "triangle"]); // bias ellipse
        this.bodyScaleX = randFloat(0.7, 1.5);
        this.bodyScaleY = randFloat(0.7, 1.5);

        // Spine decorations
        this.spinePattern = pick(["none", "none", "spikes", "plates", "fur"]);
        if (this.spinePattern !== "none") {
            this.spineCount = randInt(3, 12);
            this.spineSize = randFloat(2, 15);
        } else {
            this.spineCount = 0;
            this.spineSize = 5;
        }

        // Snake wave (more likely for serpentine, possible for others)
        if (archetype === 'serpentine') {
            this.enableSnakeWave = true;
            this.snakeWaveAmplitude = randFloat(8, 22);
            this.snakeWaveFrequency = randFloat(1.5, 3.0);
            this.snakeWaveSpeed = randFloat(2, 5);
        } else {
            this.enableSnakeWave = chance(0.15);
            this.snakeWaveAmplitude = randFloat(4, 16);
            this.snakeWaveFrequency = randFloat(1, 3);
            this.snakeWaveSpeed = randFloat(1, 4);
        }

        // ═══════════════════════════════════════════════════════════════
        // LEGS & LOCOMOTION
        // ═══════════════════════════════════════════════════════════════
        switch (archetype) {
            case 'serpentine':
                this.legPairs = 0;
                break;
            case 'insectoid':
                this.legPairs = randInt(3, 8);
                break;
            case 'arachnid':
                this.legPairs = randInt(3, 5);
                break;
            case 'humanoid':
            case 'avian':
                this.legPairs = 1;
                break;
            case 'reptilian':
            case 'beast':
                this.legPairs = 2;
                break;
            case 'crustacean':
                this.legPairs = randInt(3, 6);
                break;
            case 'aquatic':
                this.legPairs = chance(0.4) ? randInt(0, 3) : 0;
                break;
            case 'eldritch':
                this.legPairs = randInt(0, 10);
                break;
            default:
                this.legPairs = randInt(1, 6);
                break;
        }

        if (this.legPairs > 0) {
            this.legSegments = randInt(1, 4);
            this.legLength = randFloat(15, 70);
            this.legThickness = randFloat(1.5, 8);
            this.legSpread = randFloat(20, 80);
            this.legForwardOffset = randFloat(-0.3, 0.6);
            this.legRandomness = randFloat(0, 0.3);
            this.legJointStyle = pick(["smooth", "angular", "organic"]);
            this.legTipShape = pick(["circle", "claw", "pad", "hoof", "spike", "webbed", "suction", "pincer", "talon", "boot"]);
            this.legOffsetVariation = randFloat(0, 0.4);
            this.legBendStrength = randFloat(0.6, 1.8);
            this.legGroundingStrength = randFloat(0.3, 0.9);
            this.legAnticipation = chance(0.65);
            this.keepFeetOnStop = chance(0.7);
            this.footGluingStrength = randFloat(0.7, 0.98);
        }

        // IK stepping
        this.stepDistance = randFloat(15, 60);
        this.stepHeight = randFloat(2, 15);
        this.stepSpeed = randFloat(3, 12);
        this.alternateLegs = chance(0.8);

        // ═══════════════════════════════════════════════════════════════
        // ARMS
        // ═══════════════════════════════════════════════════════════════
        switch (archetype) {
            case 'humanoid':
                this.armCount = 2;
                break;
            case 'crustacean':
                this.armCount = chance(0.8) ? 2 : randInt(2, 4);
                break;
            case 'aquatic':
            case 'eldritch':
                this.armCount = randInt(0, 8);
                break;
            case 'serpentine':
                this.armCount = 0;
                break;
            default:
                this.armCount = chance(0.3) ? randInt(0, 4) : 0;
                break;
        }

        if (this.armCount > 0) {
            // Make armCount even for symmetry
            if (this.armCount % 2 !== 0) this.armCount = Math.max(2, this.armCount + 1);
            this.armSegments = randInt(1, 3);
            this.armLength = randFloat(15, 55);
            this.armThickness = randFloat(2, 8);
            this.armReachRange = randFloat(40, 150);
            this.armReachSpeed = randFloat(2, 8);
            // Spring stiffness centered around default 500 so arms stay near body
            this.armSpringStiffness = randFloat(300, 800);
            this.armSpringDamping = randFloat(0.1, 0.4);
            this.armRestForwardDistance = randFloat(0.5, 0.9);
            this.armRestOutwardAngle = randFloat(10, 45);

            // Arm tips
            this.armTipShape = pick(["circle", "claw", "hand", "fist", "tentacle", "hook", "blade", "paw", "mitten", "sucker", "pincer", "stump", "spike", "webbed", "bone", "flame", "crystal"]);
            this.armTipSize = randFloat(0.8, 2.5);
            this.clawLength = randFloat(4, 15);
            this.fingerCount = randInt(2, 5);
            this.fingerSpread = randFloat(15, 50);

            // Arm swing animation
            this.armSwingEnabled = chance(0.7);
            this.armSwingSpeed = randFloat(1.5, 5);
            this.armSwingAmount = randFloat(8, 30);

            // Punch & grab
            this.punchSpeed = randFloat(4, 14);
            this.punchWindupDistance = randFloat(0.1, 0.5);
            this.punchReachDistance = randFloat(0.9, 1.5);
            this.punchArcAmount = randFloat(10, 40);
            this.punchCrossBody = chance(0.5);
            this.punchCrossAmount = randFloat(0.3, 0.8);
            this.grabSpeed = randFloat(3, 10);
            this.grabHoldTime = randFloat(0.2, 1.5);
            this.punchCooldown = randFloat(0.05, 0.3);
        } else {
            this.armSwingEnabled = false;
        }

        // ═══════════════════════════════════════════════════════════════
        // HEAD & FACE
        // ═══════════════════════════════════════════════════════════════
        this.headShape = pick(["ellipse", "ellipse", "triangle", "rectangle", "diamond"]);
        this.showEyes = chance(0.9);
        this.eyeCount = this.showEyes ? (archetype === 'arachnid' ? randInt(4, 8) :
                         archetype === 'eldritch' ? randInt(1, 8) : randInt(1, 4)) : 0;
        this.eyeSize = randFloat(0.6, 1.6);
        this.eyeStyle = pick(["round", "round", "oval", "slit", "compound", "glowing", "dot", "angry", "cute"]);
        this.showPupil = chance(0.85);
        this.pupilSize = randFloat(0.25, 0.65);
        this.pupilColor = pick(["#111111", "#222222", "#001100", "#110000", "#000011", "#333300"]);
        this.eyeExtrudeDistance = (archetype === 'crustacean' || chance(0.15)) ? randFloat(5, 25) : 0;
        this.eyeExtrudeThickness = randFloat(1.5, 5);

        // Antennae
        this.antennaCount = (archetype === 'insectoid' || archetype === 'crustacean') ? randInt(1, 4) :
                            chance(0.2) ? randInt(1, 3) : 0;
        this.antennaLength = randFloat(8, 35);

        // Mandibles
        this.mandibles = (archetype === 'insectoid' || archetype === 'arachnid') ? chance(0.7) : chance(0.15);

        // Head look - disable for random creatures (behavioral, not visual)
        this.headLookEnabled = false;

        // ═══════════════════════════════════════════════════════════════
        // HAIR & ACCESSORIES
        // ═══════════════════════════════════════════════════════════════
        if (archetype === 'humanoid') {
            this.hairStyle = pick(["none", "spiky", "ponytail", "mohawk", "long", "curly"]);
        } else {
            this.hairStyle = chance(0.15) ? pick(["spiky", "ponytail", "mohawk", "long", "curly"]) : "none";
        }

        if (this.hairStyle !== "none") {
            this.hairCount = randInt(3, 12);
            this.hairLength = randFloat(8, 50);
            this.hairThickness = randFloat(1.5, 6);
        }

        // Ponytail specific physics
        if (this.hairStyle === "ponytail") {
            this.ponytailLength = randFloat(15, 80);
            this.ponytailBounce = true;
            this.ponytailSegments = randInt(3, 10);
            this.ponytailThickness = randFloat(2, 10);
            this.ponytailTaper = randFloat(0.4, 0.95);
            this.ponytailSpring = randFloat(6, 20);
            this.ponytailDrag = randFloat(0.82, 0.96);
            this.ponytailInertia = randFloat(40, 150);
        }

        // Head accessory
        if (archetype === 'beast' || archetype === 'reptilian') {
            this.headAccessory = pick(["none", "horns", "ears", "tusks", "crest", "frills", "fangs", "snout", "spikes"]);
        } else if (archetype === 'humanoid') {
            this.headAccessory = pick(["none", "none", "horns", "ears", "crown", "whiskers", "crest"]);
        } else {
            this.headAccessory = chance(0.15) ? pick(["horns", "ears", "crown", "tusks", "crest", "frills", "fangs", "snout", "beak", "whiskers", "spikes"]) : "none";
        }
        if (this.headAccessory !== "none") {
            this.accessorySize = randFloat(8, 30);
        }

        // ═══════════════════════════════════════════════════════════════
        // TAIL
        // ═══════════════════════════════════════════════════════════════
        const shouldHaveTail = (archetype === 'reptilian' || archetype === 'beast') ? chance(0.85) :
                               (archetype === 'serpentine') ? false :
                               (archetype === 'avian') ? chance(0.4) :
                               chance(0.35);

        this.tailEnabled = shouldHaveTail;
        if (this.tailEnabled) {
            this.tailSegments = randInt(3, 12);
            this.tailLength = randFloat(20, 100);
            this.tailThickness = randFloat(3, Math.max(4, this.bodyWidth * 0.6));
            this.tailTaperAmount = randFloat(0.5, 0.95);
            this.tailSpring = randFloat(18, 32);
            this.tailDamping = randFloat(0.65, 0.8);
            this.tailElasticity = randFloat(0.5, 0.85);
            this.tailInertia = randFloat(100, 220);
            this.tailStiffness = randFloat(0.05, 0.45);

            // Tail waving (more likely for beast/reptilian)
            this.tailWaveEnabled = (archetype === 'beast') ? chance(0.7) : chance(0.4);
            if (this.tailWaveEnabled) {
                this.tailWaveSpeed = randFloat(1, 8);
                this.tailWaveAmplitude = randFloat(10, 50);
                this.tailWaveSpeedVariation = randFloat(0, 0.5);
                this.tailWaveCascade = chance(0.75);
                this.tailWaveCascadeDelay = randFloat(0.05, 0.25);
                this.tailWaveIdleOnly = chance(0.4);
            }

            // Tail leg redistribution (push legs forward if creature has tail)
            if (this.legPairs > 1) {
                this.tailBodyPercent = randFloat(0, 60);
            } else {
                this.tailBodyPercent = 0;
            }
        } else {
            this.tailBodyPercent = 0;
        }

        // NOTE: Movement & AI properties (movementStyle, moveSpeed, turnSpeed,
        // acceleration, wanderRadius, etc.) are NOT randomized — they are behavioral,
        // not visual. Only appearance properties are changed by the randomizer.

        // ═══════════════════════════════════════════════════════════════
        // COLORS (harmonious scheme)
        // ═══════════════════════════════════════════════════════════════
        const colors = this._generateRandomColorScheme();
        this.bodyColor = colors.bodyColor;
        this.legColor = colors.legColor;
        this.armColor = colors.armColor;
        this.accentColor = colors.accentColor;
        this.eyeColor = colors.eyeColor;
        this.antennaColor = colors.antennaColor;
        this.mandibleColor = colors.mandibleColor;
        this.spineColor = colors.spineColor;
        this.hairColor = chance(0.5) ? colors.spineColor : colors.accentColor;
        this.accessoryColor = colors.antennaColor;

        // Tail colors derived from body
        if (this.tailEnabled) {
            this.tailColor = colors.bodyColor;
            this.tailTipColor = chance(0.4) ? colors.accentColor : "";
        }

        // Ponytail accent color
        if (this.hairStyle === "ponytail") {
            this.ponytailAccentColor = chance(0.6) ? colors.accentColor : this.hairColor;
        }

        // ═══════════════════════════════════════════════════════════════
        // BREATHING
        // ═══════════════════════════════════════════════════════════════
        this.breathingEnabled = chance(0.8);
        this.breathingSpeed = randFloat(0.8, 3);
        this.breathingAmount = randFloat(0.03, 0.15);
        this.breathingAsync = chance(0.6);

        // ═══════════════════════════════════════════════════════════════
        // SCALE & POSITIONING
        // ═══════════════════════════════════════════════════════════════
        //this.creatureScale = randFloat(0.5, 2.0);
        this.grabRange = randFloat(30, 100);

        // Reset all position-affecting properties to avoid offset
        this.enable25DMode = false;
        this.bodyElevation = 30;
        this.bodyHeight = 0;
        this.isometricAngle = 0;
        this.ignoreGameObjectTransform = false;

        // Shadow (reset to defaults so it doesn't carry over)
        this.showShadow = true;
        this.shadowOpacity = randFloat(0.2, 0.4);
        this.shadowBlur = randFloat(8, 18);
        this.shadowOffsetX = 0;
        this.shadowOffsetY = 0;

        // ═══════════════════════════════════════════════════════════════
        // FINALIZE
        // ═══════════════════════════════════════════════════════════════

        // Reinitialize creature with new properties
        this._initializeCreature();

        // Mark scene as dirty for serialization
        if (this.gameObject && this.gameObject.scene) {
            this.gameObject.scene.dirty = true;
            if (typeof this.gameObject.scene.markDirty === 'function') {
                this.gameObject.scene.markDirty();
            }
        }

        // Refresh canvas to show changes
        if (window.editor && window.editor.refreshCanvas) {
            window.editor.refreshCanvas();
        }

        // Refresh the inspector to show the new values
        this.refreshInspector();
    }

    // ==================== TARGETING SYSTEM ====================

    /**
     * Autonomous targeting: finds nearest enemy and turns body + head to face it.
     * Only used when movementStyle is NOT 'controlled' (controller handles its own lock-on).
     */
    _updateTargeting(deltaTime) {
        if (!this.targetingEnabled) {
            // Clear reticle on previous target when targeting disabled
            if (this._targetingTarget) {
                const prevCreature = this._targetingTarget.getModule?.('ProceduralCreature');
                if (prevCreature && prevCreature._targetingCreature === this) {
                    prevCreature.setTargetedBy(null);
                }
            }
            this._targetingTarget = null;
            return;
        }

        // Throttle target search to every ~0.2s for performance
        this._targetingSearchTimer -= deltaTime;
        if (this._targetingSearchTimer <= 0 || !this._targetingTarget) {
            this._targetingSearchTimer = 0.2;
            const previousTarget = this._targetingTarget;
            this._targetingTarget = this._findTargetingTarget();
            
            // Update target reticles when target changes
            if (previousTarget !== this._targetingTarget) {
                // Clear old target's reticle
                if (previousTarget) {
                    const prevCreature = previousTarget.getModule?.('ProceduralCreature');
                    if (prevCreature && prevCreature._targetingCreature === this) {
                        prevCreature.setTargetedBy(null);
                    }
                }
                // Set new target's reticle
                if (this._targetingTarget) {
                    const newCreature = this._targetingTarget.getModule?.('ProceduralCreature');
                    if (newCreature) {
                        newCreature.setTargetedBy(this);
                    }
                }
            }
        }

        // Validate current target still exists & is alive
        if (this._targetingTarget) {
            if (!this._isTargetValid(this._targetingTarget)) {
                // Clear reticle on invalid target
                const targetCreature = this._targetingTarget.getModule?.('ProceduralCreature');
                if (targetCreature && targetCreature._targetingCreature === this) {
                    targetCreature.setTargetedBy(null);
                }
                this._targetingTarget = null;
                return;
            }

            const pos = this.gameObject.position;
            const tx = this._targetingTarget.position.x - pos.x;
            const ty = this._targetingTarget.position.y - pos.y;
            const dist = Math.sqrt(tx * tx + ty * ty);

            if (dist < 1) return;

            // Turn body toward target
            if (this.targetingFacebody) {
                const targetAngleDeg = Math.atan2(ty, tx) * 180 / Math.PI;
                let angleDiff = targetAngleDeg - this.gameObject.angle;
                while (angleDiff > 180) angleDiff -= 360;
                while (angleDiff < -180) angleDiff += 360;

                const maxTurn = this.targetingTurnSpeed * deltaTime;
                const turnAmount = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
                this.gameObject.angle += turnAmount;
            }

            // Head looks at target
            if (this.targetingHeadLook) {
                const bodyAngleRad = this.gameObject.angle * Math.PI / 180;
                const targetAngleRad = Math.atan2(ty, tx);
                let relAngle = targetAngleRad - bodyAngleRad;
                while (relAngle > Math.PI) relAngle -= Math.PI * 2;
                while (relAngle < -Math.PI) relAngle += Math.PI * 2;

                const maxHeadRot = ((this.headMaxTurnAngle || 72) * Math.PI / 180);
                relAngle = Math.max(-maxHeadRot, Math.min(maxHeadRot, relAngle));

                this._headTargetAngle = relAngle;
                this._controllerDrivesHead = true; // Prevent _updateHeadLook from overriding
            }
        }
    }

    /**
     * Find nearest enemy for autonomous targeting
     */
    _findTargetingTarget() {
        const engine = this.gameObject._engine;
        const instances = engine ? engine.instances : null;
        if (!instances) return null;

        const myPos = this.gameObject.getWorldPosition();
        const rangeSq = this.targetingRange * this.targetingRange;

        // Parse tags
        const enemyTags = this.targetingEnemyTag ? this.targetingEnemyTag.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
        const friendlyTags = this.targetingFriendlyTag ? this.targetingFriendlyTag.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

        let nearest = null;
        let nearestDistSq = Infinity;

        for (const obj of instances) {
            if (obj === this.gameObject) continue;

            // Must be a creature
            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature) continue;
            if (creature.isDead) continue;

            // Distance check
            const dx = obj.position.x - myPos.x;
            const dy = obj.position.y - myPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > rangeSq || distSq >= nearestDistSq) continue;

            // Tag filtering
            let isEnemy = false;
            let isFriendly = false;

            if (obj.hasTag) {
                for (const tag of enemyTags) {
                    if (obj.hasTag(tag)) { isEnemy = true; break; }
                }
                for (const tag of friendlyTags) {
                    if (obj.hasTag(tag)) { isFriendly = true; break; }
                }
            }

            // If no enemy tags set, target anything that isn't friendly
            if (enemyTags.length === 0) {
                isEnemy = !isFriendly;
            }

            if (isFriendly) continue; // Never target friendlies
            if (!isEnemy) continue;

            nearestDistSq = distSq;
            nearest = obj;
        }

        return nearest;
    }

    /**
     * Check if a targeting target is still valid
     */
    _isTargetValid(obj) {
        if (!obj || !obj.position) return false;
        const engine = this.gameObject._engine;
        const instances = engine ? engine.instances : null;
        if (!instances || !instances.includes(obj)) return false;
        const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
        if (creature && creature.isDead) return false;
        // Check range (with 20% hysteresis to avoid flicker)
        const dx = obj.position.x - this.gameObject.position.x;
        const dy = obj.position.y - this.gameObject.position.y;
        const unlockRange = this.targetingRange * 1.2;
        if (dx * dx + dy * dy > unlockRange * unlockRange) return false;
        return true;
    }

    /**
     * Get the current targeting target (for external use / AI scripts)
     * @returns {GameObject|null}
     */
    getTarget() {
        return this._targetingTarget;
    }

    /**
     * Manually set a targeting target
     * @param {GameObject} obj
     */
    setTarget(obj) {
        // Clear previous target's reticle
        if (this._targetingTarget && this._targetingTarget !== obj) {
            const prevCreature = this._targetingTarget.getModule?.('ProceduralCreature');
            if (prevCreature && prevCreature._targetingCreature === this) {
                prevCreature.setTargetedBy(null);
            }
        }
        
        this._targetingTarget = obj;
        
        // Set new target's reticle
        if (obj) {
            const targetCreature = obj.getModule?.('ProceduralCreature');
            if (targetCreature) {
                targetCreature.setTargetedBy(this);
            }
        }
    }

    /**
     * Point a specific hand/arm toward a world position.
     * The arm will smoothly aim (within angle limits) so a held gun points at (x,y).
     * Call every frame to maintain aiming; call handClearPointTarget() to release.
     * @param {number} handIndex - Index of the arm (0-based)
     * @param {number} x - World X position to point toward
     * @param {number} y - World Y position to point toward
     */
    handPointTo(handIndex, x, y) {
        if (handIndex < 0 || handIndex >= this._arms.length) return;
        this._arms[handIndex]._pointTarget = { x: x, y: y };
    }

    /**
     * Clear the point-to target for a specific hand/arm, returning it to natural rest.
     * @param {number} handIndex - Index of the arm (0-based)
     */
    handClearPointTarget(handIndex) {
        if (handIndex < 0 || handIndex >= this._arms.length) return;
        this._arms[handIndex]._pointTarget = null;
    }

    /**
     * Clear all hand point-to targets.
     */
    handClearAllPointTargets() {
        for (let i = 0; i < this._arms.length; i++) {
            this._arms[i]._pointTarget = null;
        }
    }

    _updateHeadLook(deltaTime) {
        if (!this.headLookEnabled) {
            this._headTargetAngle = 0;
            this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
            return;
        }
        if (this._controllerDrivesHead) {
            this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
            this._controllerDrivesHead = false;
            this._controllerFaceMouse = false;
            return;
        }
    
        // Throttle head-look search to every 3 frames
        this._headLookFrameSkip = ((this._headLookFrameSkip || 0) + 1) % 3;
        if (this._headLookFrameSkip !== 0) {
            // Still smooth toward cached target
            this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
            return;
        }
    
        const worldPos = this.gameObject.getWorldPosition();
        let closestTarget = null;
        let closestDistSq = this.headLookRange * this.headLookRange;
    
        if (this.headLookObject && this.headLookObject.length > 0) {
            if (this._headLookTagsSource !== this.headLookObject) {
                this._headLookTagsSource = this.headLookObject;
                this._headLookTags = this.headLookObject.split(',').map(t => t.trim()).filter(t => t.length > 0);
            }
            const tags = this._headLookTags;
            if (tags.length > 0) {
                const engine = this.gameObject._engine;
                const instances = engine ? engine.instances : null;
                if (instances) {
                    const wx = worldPos.x, wy = worldPos.y;
                    for (let i = 0, len = instances.length; i < len; i++) {
                        const obj = instances[i];
                        if (obj === this.gameObject) continue;
                        const dx = obj.position.x - wx;
                        const dy = obj.position.y - wy;
                        const distSq = dx * dx + dy * dy;
                        if (distSq >= closestDistSq) continue;
                        let hasMatchingTag = false;
                        if (obj.hasTag) {
                            for (let t = 0; t < tags.length; t++) {
                                if (obj.hasTag(tags[t])) { hasMatchingTag = true; break; }
                            }
                        }
                        if (!hasMatchingTag) continue;
                        closestTarget = obj;
                        closestDistSq = distSq;
                    }
                }
            }
        }
    
        if (closestTarget) {
            const dx = closestTarget.position.x - worldPos.x;
            const dy = closestTarget.position.y - worldPos.y;
            const targetAngle = Math.atan2(dy, dx);
            const bodyAngle = this.gameObject.angle * Math.PI / 180;
            let relativeAngle = targetAngle - bodyAngle;
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
            const maxHeadRotation = (this.headMaxTurnAngle || 72) * Math.PI / 180;
            relativeAngle = Math.max(-maxHeadRotation, Math.min(maxHeadRotation, relativeAngle));
            this._headTargetAngle = relativeAngle;
        } else {
            this._headTargetAngle = 0;
        }
        this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
    }

    /**
     * Calculate the 2.5D elevation offset in local (rotated) coordinates
     * This makes the elevation always point "up" in world space regardless of game object rotation
     * @param {number} elevation - The world-space upward elevation amount
     * @returns {{x: number, y: number}} - The offset in local coordinates
     */
    _get25DElevationOffset(elevation) {
        if (!this.enable25DMode || elevation <= 0) {
            return { x: 0, y: 0 };
        }
        
        // In world space, "up" is negative Y (0, -elevation)
        // But the canvas is rotated by bodyAngle, so we need to counter-rotate
        // to make the offset appear as world-up
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        
        // Counter-rotate the world "up" vector into local space
        // World up is (0, -1), rotated by -bodyAngle gives us local up
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        
        // World offset is (0, -elevation), transform to local
        const localX = 0 * cos - (-elevation) * sin; // = elevation * sin(bodyAngle)
        const localY = 0 * sin + (-elevation) * cos; // = -elevation * cos(bodyAngle)
        
        return { x: localX, y: localY };
    }

    /**
     * Calculate depth-based parallax offset for fake 3D effect
     * Similar to ProceduralTree's depth offset - parts higher up shift based on camera position
     * @param {number} layerHeight - Height factor (0 = grounded, 1 = highest)
     * @returns {{x: number, y: number}} Offset to apply
     */
    _getDepthOffset(layerHeight) {
        if (!this.depthEnabled || layerHeight <= 0) {
            return { x: 0, y: 0 };
        }

        // Get creature's world position
        const worldPos = this.gameObject.getWorldPosition();
        const creatureX = worldPos.x;
        const creatureY = worldPos.y;

        // Get camera/viewport center
        let cameraX = 0, cameraY = 0;
        if (typeof cameraGetPosition === 'function') {
            const camPos = cameraGetPosition();
            cameraX = camPos.x;
            cameraY = camPos.y;
        } else if (typeof getViewport === 'function') {
            const vp = getViewport();
            cameraX = vp.x + vp.width / 2;
            cameraY = vp.y + vp.height / 2;
        }

        // Calculate direction from camera center to creature (AWAY from camera for top-down 3D effect)
        // Higher parts appear to shift away from viewport center when viewed from above
        const dx = creatureX - cameraX;
        const dy = creatureY - cameraY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            return { x: 0, y: 0 };
        }

        // Normalize and apply depth factor
        const factor = layerHeight * this.depthIntensity * dist;
        const clampedFactor = Math.min(factor, this.maxDepthOffset);

        // Direction away from camera (for top-down parallax)
        const dirX = dx / dist;
        const dirY = dy / dist;

        // World-space offset
        const worldOffsetX = dirX * clampedFactor;
        const worldOffsetY = dirY * clampedFactor;

        // Transform to local space (counter-rotate by body angle)
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        const localX = worldOffsetX * cos - worldOffsetY * sin;
        const localY = worldOffsetX * sin + worldOffsetY * cos;

        return { x: localX, y: localY };
    }

    // ═══════════════════════════════════════════════════════════════
    // OFFSCREEN CANVAS CACHING
    // ═══════════════════════════════════════════════════════════════

    /** Compute a string key from all visual properties that affect cached shapes */
    _computeCacheKey() {
        return [
            this.bodyColor, this.accentColor, this.eyeColor, this.bodyShape,
            this.bodyScaleX, this.bodyScaleY, this.segmentLength, this.bodyWidth,
            this.headSize, this.headShape, this.tailTaper, this.bodySegments,
            this.spinePattern, this.spineCount, this.spineSize, this.spineColor,
            this.showEyes, this.eyeCount, this.eyeExtrudeDistance, this.eyeExtrudeThickness,
            this.antennaCount, this.antennaLength, this.antennaColor,
            this.mandibles, this.mandibleColor,
            this.hairStyle, this.hairCount, this.hairLength, this.hairThickness, this.hairColor,
            this.headAccessory, this.accessorySize, this.accessoryColor
        ].join('|');
    }

    /** Build (or rebuild) offscreen canvas caches for head and body segments */
    _buildCaches() {
        const newKey = this._computeCacheKey();
        if (newKey === this._cacheKey &&
            this._headCache && this._headCache.canvas &&
            this._segmentCaches.length === this.bodySegments) {
            return; // nothing changed — skip rebuild entirely
        }
        // original logic follows unchanged...
        this._cacheKey = newKey;
    
        const headExtent = this.headSize + (this.eyeExtrudeDistance || 0) +
            Math.max(this.antennaLength || 0, this.accessorySize || 0, this.hairLength || 0) + 10;
        const headW = Math.ceil(headExtent * 2);
        const headH = Math.ceil(headExtent * 2);
    
        if (!this._headCache || !this._headCache.canvas ||
            this._headCache.width !== headW || this._headCache.height !== headH) {
            const canvas = (typeof OffscreenCanvas !== 'undefined')
                ? new OffscreenCanvas(headW, headH)
                : document.createElement('canvas');
            canvas.width = headW;
            canvas.height = headH;
            this._headCache = { canvas, width: headW, height: headH, originX: headW / 2, originY: headH / 2 };
        }
        const hCtx = this._headCache.canvas.getContext('2d');
        hCtx.clearRect(0, 0, headW, headH);
        hCtx.save();
        hCtx.translate(this._headCache.originX, this._headCache.originY);
        this._drawHeadDirect(hCtx);
        hCtx.restore();
    
        this._segmentCaches = [];
        for (let i = 0; i < this.bodySegments; i++) {
            const taperFactor = 1 - (i / this.bodySegments) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;
            const spineExtra = (this.spinePattern !== 'none') ? (this.spineSize || 5) + 4 : 0;
            const segW = Math.ceil((this.segmentLength * this.bodyScaleX + width + spineExtra) * 2) + 8;
            const segH = Math.ceil((width * this.bodyScaleY + spineExtra) * 2) + 8;
            const canvas = (typeof OffscreenCanvas !== 'undefined')
                ? new OffscreenCanvas(segW, segH)
                : document.createElement('canvas');
            canvas.width = segW;
            canvas.height = segH;
            const sCtx = canvas.getContext('2d');
            sCtx.save();
            sCtx.translate(segW / 2, segH / 2);
            this._drawSegmentDirect(sCtx, width);
            sCtx.restore();
            this._segmentCaches.push({ canvas, width: segW, height: segH, originX: segW / 2, originY: segH / 2 });
        }
    }

    /** Force cache rebuild on next draw (call when visual properties change) */
    _invalidateCaches() {
        this._cacheKey = '';
        this._headCache = null;
        this._segmentCaches = [];
    }

    /** Cleanup when the creature is destroyed */
    onDestroy() {
        // Clear held items first (release references to other game objects)
        if (this._arms && this._arms.length > 0) {
            for (const arm of this._arms) {
                if (arm && arm.heldItem) {
                    arm.heldItem = null;
                }
            }
        }

        // Clear targeting state - release any creature we're targeting
        if (this._targetingTarget) {
            const targetCreature = this._targetingTarget.getModule?.('ProceduralCreature');
            if (targetCreature && targetCreature._targetingCreature === this) {
                targetCreature.setTargetedBy(null);
            }
            this._targetingTarget = null;
        }
        
        // Clear being-targeted state - if something was targeting us, clear its reference
        if (this._targetingCreature) {
            this._targetingCreature = null;
        }
        this._isBeingTargeted = false;

        // Dispose offscreen canvas caches
        this._headCache = null;
        this._segmentCaches = [];
        this._cacheKey = '';

        // Clear physics chains
        this._tailChain = [];
        this._ponytailChain = [];
        this._mouthTentacleChains = [];

        // Clear body structure arrays
        this._segments = [];
        this._legs = [];
        this._arms = [];
        this._sparkParticles = [];

        // Clear sets
        if (this._swingHitTargets) {
            this._swingHitTargets.clear();
            this._swingHitTargets = null;
        }
        if (this._punchHitTargets) {
            this._punchHitTargets.clear();
            this._punchHitTargets = null;
        }

        // Clear death snapshots
        this.deathPositions = null;
        this.deathAngles = null;
        this._deathWorldPos = null;
        this._deathAngle = undefined;

        // Clear cached head look tags
        this._headLookTags = null;
        this._headLookTagsSource = null;

        // Clear wander target
        this._wanderTarget = null;

        // Clear velocity
        this._velocity = null;
    }

    draw(ctx) {
        // TDTD billboard rendering: render creature to offscreen canvas, then draw as billboard
        if (this.tdtdEnabled && window.gameEngine && window.gameEngine.TDTD) {
            this.drawUntethered(ctx);
            this._drawTDTDBillboard(ctx);
            this.drawTethered(ctx);
            return;
        }

        // Rebuild offscreen caches if visual properties changed
        this._buildCaches();

        ctx.save();
        this.drawUntethered(ctx);

        if (this.isDead) {
            // After drawUntethered(), we're in WORLD space (viewport transform only, no object transform)
            // Translate to the gameObject's world position so local offsets draw correctly
            const objWorldPos = this.gameObject.getWorldPosition();
            ctx.translate(objWorldPos.x, objWorldPos.y);
        }

        // Apply creature scale around the creature's local origin
        const scale = this.creatureScale * this.gameObject.scale.x || 1.0;
        const absScale = Math.abs(scale);
        const isFlipped = scale < 0;
        
        if (isFlipped) {
            // For negative scale (flipping), we need to:
            // 1. Apply the absolute scale value for sizing
            // 2. Flip horizontally using scale(-1, 1) to maintain proper centering
            // Using scale(negative, negative) causes a 180° rotation which breaks centering
            ctx.scale(-absScale, absScale);
        } else if (Math.abs(absScale - 1.0) > 0.001) {
            ctx.scale(absScale, absScale);
        }

        if (this.showShadow) {
            this._drawShadow(ctx);
        }

        // Draw target reticle (behind everything when being targeted)
        if (this.showTargetReticle && this._isBeingTargeted) {
            this._drawTargetReticle(ctx);
        }

        // Draw directional arrow (behind everything, above shadow and target)
        if (this.showDirectionalArrow) {
            this._drawDirectionalArrow(ctx);
        }

        // Draw legs (behind everything else - feet on ground)
        for (let leg of this._legs) {
            this._drawLeg(ctx, leg);
        }

        // Draw tail (above legs, behind body)
        if (this.tailEnabled) {
            this._drawTail(ctx);
        }

        // Draw arms (in front of body, behind head)
        for (let arm of this._arms) {
            this._drawArm(ctx, arm);
        }

        // Draw body segments (spline or individual)
        if (this.splineBody) {
            this._drawSplineBody(ctx);
        } else {
            for (let i = this._segments.length - 1; i >= 0; i--) {
                this._drawSegment(ctx, i);
            }
        }

        // Draw head (includes squid tentacles if enabled)
        this._drawHead(ctx);

        if (this.wormDigEnabled) {
            this._drawWormUndergroundIndicator(ctx);
        }

        this.drawTethered(ctx);
        ctx.restore();

        // Draw spark particles in world space (after creature transform is restored)
        if (this._sparkParticles && this._sparkParticles.length > 0) {
            this._drawSparkParticles(ctx);
        }

        if (this.wormDigEnabled && this._wormDirtParticles && this._wormDirtParticles.length > 0) {
            this._drawWormDirtParticles(ctx);
        }
    }

    /**
     * Render the creature to an offscreen canvas, then draw as a TDTD billboard.
     * The creature's creatureScale is used as the base scale (treated as 1.0),
     * and the TDTD system's projection scale adjusts size based on Z height.
     */
    _drawTDTDBillboard(ctx) {
        const engine = window.gameEngine;
        const tdtd = engine.TDTD;
        if (!tdtd) return;

        // Rebuild offscreen caches if visual properties changed
        this._buildCaches();

        // Estimate the creature's bounding size for the offscreen canvas
        const baseScale = Math.abs(this.creatureScale || 1.0);
        const headSize = this.headSize || 25;
        const bodySegs = this.bodySegments || 3;
        const segLen = this.segmentLength || 20;
        const legLen = this.legLength || 35;

        // Generous estimate of creature extent from center
        const bodyExtent = headSize + bodySegs * segLen + legLen;
        const canvasSize = Math.ceil(bodyExtent * baseScale * 2.5);
        const halfCanvas = canvasSize / 2;

        // Create or resize offscreen canvas
        if (!this._tdtdCanvas || this._tdtdCanvas.width !== canvasSize || this._tdtdCanvas.height !== canvasSize) {
            this._tdtdCanvas = document.createElement('canvas');
            this._tdtdCanvas.width = canvasSize;
            this._tdtdCanvas.height = canvasSize;
            this._tdtdCtx = this._tdtdCanvas.getContext('2d');
        }

        const offCtx = this._tdtdCtx;
        offCtx.clearRect(0, 0, canvasSize, canvasSize);

        // Draw the creature at the center of the offscreen canvas
        offCtx.save();
        offCtx.translate(halfCanvas, halfCanvas);

        // Apply game object rotation so creature faces the correct direction
        const angle = this.gameObject.angle || 0;
        if (angle !== 0) {
            offCtx.rotate(angle * Math.PI / 180);
        }

        // Apply creature scale
        const isFlipped = (this.creatureScale || 1.0) < 0;
        if (isFlipped) {
            offCtx.scale(-baseScale, baseScale);
        } else if (Math.abs(baseScale - 1.0) > 0.001) {
            offCtx.scale(baseScale, baseScale);
        }

        // We need to render relative to the creature's position
        // The creature draws relative to (0,0) after drawUntethered translates
        // Since we're rendering to an offscreen canvas at center, just draw directly

        if (this.showShadow) {
            this._drawShadow(offCtx);
        }

        if (this.showTargetReticle && this._isBeingTargeted) {
            this._drawTargetReticle(offCtx);
        }

        if (this.showDirectionalArrow) {
            this._drawDirectionalArrow(offCtx);
        }

        for (let leg of this._legs) {
            this._drawLeg(offCtx, leg);
        }

        if (this.tailEnabled) {
            this._drawTail(offCtx);
        }

        for (let arm of this._arms) {
            this._drawArm(offCtx, arm);
        }

        for (let i = this._segments.length - 1; i >= 0; i--) {
            this._drawSegment(offCtx, i);
        }

        this._drawHead(offCtx);

        offCtx.restore();

        // Ensure TDTD batch mode is active so this billboard is depth-sorted
        // together with grid cells and other TDTD objects
        if (!tdtd._batchMode) {
            tdtd.beginBatch();
        }
        tdtd._needsFlush = true;

        // Now draw the offscreen canvas as a TDTD billboard
        const worldPos = this.gameObject.getWorldPosition();
        tdtd.drawBillboard(this._tdtdCanvas, worldPos.x, worldPos.y, this.tdtdZ, {
            anchorX: 0.5,
            anchorY: this.tdtdAnchorY
        }, ctx);
    }

    _drawTail(ctx) {
        if (!this.tailEnabled || !this._tailChain || this._tailChain.length === 0) return;
        if (!this._segments || this._segments.length === 0) return;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        const lastSeg = this._segments[this._segments.length - 1];
        const segCount = this._tailChain.length;
        const baseThick = this.tailThickness || 6;
        const taper = this.tailTaperAmount || 0.85;
        const tailColor = this.tailColor || this.bodyColor;
        const tipColor = this.tailTipColor || tailColor;

        // Calculate depth offset for tail root (match last body segment's depth height)
        // Last body segment height factor mirrors _drawSegment logic
        const lastSegIndex = this._segments.length - 1;
        const lastSegHeightFactor = this.bodyHeightDepth * (1 - (lastSegIndex / Math.max(1, this._segments.length)) * 0.4);

        // Root position in local space (back of last body segment)
        const rootAngle = lastSeg.angle + Math.PI;
        const rootWorldX = lastSeg.worldPos.x + Math.cos(rootAngle) * this.segmentLength * 0.3;
        const rootWorldY = lastSeg.worldPos.y + Math.sin(rootAngle) * this.segmentLength * 0.3;
        const rootDx = rootWorldX - worldPos.x;
        const rootDy = rootWorldY - worldPos.y;
        const rootDepthOffset = this._getDepthOffset(lastSegHeightFactor);
        const rootLocalX = rootDx * cos - rootDy * sin + rootDepthOffset.x;
        const rootLocalY = rootDx * sin + rootDy * cos + rootDepthOffset.y;

        // Convert chain to local-space positions with depth offset tapering to ground
        const localPositions = [{ x: rootLocalX, y: rootLocalY }];
        for (let i = 0; i < segCount; i++) {
            const dx = this._tailChain[i].x - worldPos.x;
            const dy = this._tailChain[i].y - worldPos.y;
            // Tail height tapers from last body segment height down to leg height (grounded)
            const t = (i + 1) / segCount; // 0 at root, 1 at tip
            const tailSegHeight = lastSegHeightFactor * (1 - t) + this.legHeightDepth * t;
            const segDepthOffset = this._getDepthOffset(tailSegHeight);
            localPositions.push({
                x: dx * cos - dy * sin + segDepthOffset.x,
                y: dx * sin + dy * cos + segDepthOffset.y
            });
        }

        // Draw tapered segments from thick (root) to thin (tip)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < segCount; i++) {
            const t = i / segCount; // 0 at root, approaches 1 at tip
            const thickness = baseThick * (1 - t * taper);

            // Lerp color from tailColor to tipColor along length
            const colorT = i / (segCount - 1 || 1);
            if (tipColor && tipColor !== tailColor && tipColor.length > 0) {
                ctx.strokeStyle = this._lerpColor(tailColor, tipColor, colorT);
            } else {
                ctx.strokeStyle = tailColor;
            }
            ctx.lineWidth = Math.max(1, thickness);

            ctx.beginPath();
            ctx.moveTo(localPositions[i].x, localPositions[i].y);
            ctx.lineTo(localPositions[i + 1].x, localPositions[i + 1].y);
            ctx.stroke();
        }

        // Tip dot
        const tipPos = localPositions[localPositions.length - 1];
        const tipThick = baseThick * (1 - taper) * 0.6;
        ctx.fillStyle = tipColor || tailColor;
        ctx.beginPath();
        ctx.arc(tipPos.x, tipPos.y, Math.max(0.5, tipThick), 0, Math.PI * 2);
        ctx.fill();
    }

    _lerpColor(colorA, colorB, t) {
        // Simple hex color lerp
        if (!colorA || !colorB) return colorA || colorB || '#000000';
        const a = colorA.replace('#', '');
        const b = colorB.replace('#', '');
        if (a.length !== 6 || b.length !== 6) return colorA;
        const rA = parseInt(a.substring(0, 2), 16);
        const gA = parseInt(a.substring(2, 4), 16);
        const bA = parseInt(a.substring(4, 6), 16);
        const rB = parseInt(b.substring(0, 2), 16);
        const gB = parseInt(b.substring(2, 4), 16);
        const bB = parseInt(b.substring(4, 6), 16);
        const r = Math.round(rA + (rB - rA) * t);
        const g = Math.round(gA + (gB - gA) * t);
        const bl = Math.round(bA + (bB - bA) * t);
        return '#' + [r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    _drawShadow(ctx) {
        if (!this.showShadow) return;
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localShadowOffsetX = this.shadowOffsetX * cos - this.shadowOffsetY * sin;
        const localShadowOffsetY = this.shadowOffsetX * sin + this.shadowOffsetY * cos;
    
        ctx.save();
        ctx.globalAlpha = this.shadowOpacity;
    
        // Single merged shadow ellipse centred on body — much cheaper than per-segment gradients
        let sumX = 0, sumY = 0;
        for (let i = 0; i < this._segments.length; i++) {
            const s = this._segments[i];
            const dx = s.worldPos.x - worldPos.x;
            const dy = s.worldPos.y - worldPos.y;
            sumX += dx * cos - dy * sin;
            sumY += dx * sin + dy * cos;
        }
        const cx = sumX / this._segments.length + localShadowOffsetX;
        const cy = sumY / this._segments.length + localShadowOffsetY;
        const rx = (this.segmentLength * this._segments.length * 0.35 + this.bodyWidth * 0.5 + this.shadowBlur) * 0.7;
        const ry = (this.bodyWidth * 0.5 + this.shadowBlur * 0.5) * 0.8;
    
        try {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
            grad.addColorStop(0, this.shadowColor);
            grad.addColorStop(0.55, this.shadowColor);
            grad.addColorStop(1, this.shadowColor + '00');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, this._segments[0].angle - bodyAngle, 0, Math.PI * 2);
            ctx.fill();
        } catch (e) {

        }
        ctx.restore();
    }

    /**
     * Draw an RTS-style directional indicator showing the creature's facing direction
     * Features a circle around the creature with a smoothed arrow extruding from it
     */
    _drawDirectionalArrow(ctx) {
        if (!this.showDirectionalArrow || !this._segments || this._segments.length === 0) return;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const head = this._segments[0];

        // Calculate the center - use creature center, not head
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Head angle in local space (relative to body) - this determines arrow direction
        const headLocalAngle = head.angle - bodyAngle;

        // Base radius for the circle - based on creature size
        const baseRadius = Math.max(this.headSize, this.bodyWidth) * 1.2 * this.directionalArrowSize;
        const circleRadius = baseRadius + this.directionalArrowOffset;
        
        // Determine colors - either static or health-based
        let circleColor = this.directionalArrowColor;
        let arrowColor = this.directionalArrowColor;
        
        if (this.directionalArrowHealthColor) {
            // Health-based coloring: green (full) -> dark red (0)
            const healthPercent = Math.max(0, Math.min(1, this.health / Math.max(1, this.maxHealth)));
            
            // Interpolate from dark red (#8B0000) at 0 health to nice green (#22CC44) at full health
            const r = Math.round(139 + (34 - 139) * healthPercent); // 139 -> 34
            const g = Math.round(0 + (204 - 0) * healthPercent);    // 0 -> 204
            const b = Math.round(0 + (68 - 0) * healthPercent);     // 0 -> 68
            const healthColor = `rgb(${r}, ${g}, ${b})`;
            
            circleColor = healthColor;
            arrowColor = healthColor;
            
            // Check if creature has a gun - arrow color shows ammo consumption (orange gradient)
            let hasGun = false;
            let ammoPercent = 1;
            let isReloading = false;
            if (this._arms && this._arms.length > 0) {
                for (const arm of this._arms) {
                    if (arm._reloadingGun && arm._reloadProgress !== undefined) {
                        isReloading = true;
                    }
                    // Check if holding a gun with ammo tracking
                    if (arm.heldItem && arm.heldItem.itemType === 'gun') {
                        hasGun = true;
                        // Get ammo percentage from the gun
                        if (arm.heldItem.maxAmmo && arm.heldItem.maxAmmo > 0) {
                            const currentAmmo = arm.heldItem.currentAmmo !== undefined ? arm.heldItem.currentAmmo : arm.heldItem.maxAmmo;
                            ammoPercent = Math.min(ammoPercent, currentAmmo / arm.heldItem.maxAmmo);
                        }
                    }
                }
            }
            
            if (hasGun) {
                // Arrow color shows ammo consumption: green (full) -> orange (low) -> red (empty)
                // Interpolate from health color at full ammo to orange at empty
                const ammoR = Math.round(r + (255 - r) * (1 - ammoPercent)); // toward orange/red
                const ammoG = Math.round(g * ammoPercent + 140 * (1 - ammoPercent)); // toward orange
                const ammoB = Math.round(b * ammoPercent); // toward 0
                arrowColor = `rgb(${ammoR}, ${ammoG}, ${ammoB})`;
            }
            
            if (isReloading) {
                arrowColor = '#FF8C00'; // Dark orange while reloading
            }
        }
        
        // Arrow dimensions
        const arrowLength = baseRadius * 0.8;
        const arrowWidth = baseRadius * 0.5;
        const lineThickness = Math.max(2, baseRadius * 0.12);

        ctx.save();
        ctx.globalAlpha = this.directionalArrowOpacity;

        // Draw the base circle (dashed for RTS feel)
        ctx.beginPath();
        ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
        
        // Outline for the circle
        if (this.directionalArrowOutlineWidth > 0) {
            ctx.strokeStyle = this.directionalArrowOutlineColor;
            ctx.lineWidth = lineThickness + this.directionalArrowOutlineWidth * 2;
            ctx.stroke();
        }
        
        // Main circle stroke
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = lineThickness;
        ctx.stroke();

        // Calculate arrow position (extruding from circle edge)
        const arrowStartX = Math.cos(headLocalAngle) * circleRadius;
        const arrowStartY = Math.sin(headLocalAngle) * circleRadius;
        const arrowTipX = Math.cos(headLocalAngle) * (circleRadius + arrowLength);
        const arrowTipY = Math.sin(headLocalAngle) * (circleRadius + arrowLength);

        // Draw the extruding arrow with smooth connection to circle
        ctx.save();
        ctx.translate(arrowStartX, arrowStartY);
        ctx.rotate(headLocalAngle);

        // Arrow shape - smooth teardrop/chevron extruding outward
        ctx.beginPath();
        
        // Start from connection points on the circle (wider base)
        const baseHalfWidth = arrowWidth * 0.6;
        const tipOffset = arrowLength;
        
        // Left base (on circle)
        ctx.moveTo(0, -baseHalfWidth);
        
        // Curve to tip
        ctx.bezierCurveTo(
            tipOffset * 0.4, -baseHalfWidth * 0.8,  // Control point 1
            tipOffset * 0.7, -arrowWidth * 0.2,      // Control point 2
            tipOffset, 0                              // Tip
        );
        
        // Curve back to right base
        ctx.bezierCurveTo(
            tipOffset * 0.7, arrowWidth * 0.2,       // Control point 1
            tipOffset * 0.4, baseHalfWidth * 0.8,   // Control point 2
            0, baseHalfWidth                         // Right base
        );
        
        // Close with arc segment matching the circle
        ctx.closePath();

        // Draw outline
        if (this.directionalArrowOutlineWidth > 0) {
            ctx.strokeStyle = this.directionalArrowOutlineColor;
            ctx.lineWidth = this.directionalArrowOutlineWidth * 2;
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        // Fill arrow
        ctx.fillStyle = arrowColor;
        ctx.fill();

        // Inner highlight stroke
        if (this.directionalArrowOutlineWidth > 0) {
            ctx.strokeStyle = this.directionalArrowOutlineColor;
            ctx.lineWidth = this.directionalArrowOutlineWidth * 0.5;
            ctx.stroke();
        }

        ctx.restore();

        // Add subtle inner glow to the circle
        // Convert circleColor to hex if it's rgb format for gradient transparency
        let glowColorHex = circleColor;
        if (circleColor.startsWith('rgb')) {
            const match = circleColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                const toHex = (n) => parseInt(n).toString(16).padStart(2, '0');
                glowColorHex = '#' + toHex(match[1]) + toHex(match[2]) + toHex(match[3]);
            }
        }
        const gradient = ctx.createRadialGradient(0, 0, circleRadius * 0.7, 0, 0, circleRadius * 1.1);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.8, glowColorHex + '22');
        gradient.addColorStop(1, glowColorHex + '44');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw a target reticle under this creature when it is being targeted
     * Features spinning segments and pulsing scale animation
     */
    _drawTargetReticle(ctx) {
        if (!this.showTargetReticle || !this._isBeingTargeted) return;

        const time = performance.now() / 1000;
        
        // Calculate spin rotation
        const spinAngle = (time * this.targetReticleSpinSpeed * Math.PI / 180);
        
        // Calculate pulse scale
        const pulsePhase = time * this.targetReticlePulseSpeed * Math.PI * 2;
        const pulseScale = 1 + Math.sin(pulsePhase) * this.targetReticlePulseAmount;
        
        // Base size for reticle
        const baseRadius = Math.max(this.headSize, this.bodyWidth) * 1.5 * this.targetReticleSize * pulseScale;
        const innerRadius = baseRadius * 0.6;
        const lineThickness = Math.max(2, baseRadius * 0.08);
        
        // Number of segments
        const segments = Math.max(2, this.targetReticleSegments);
        const gapAngle = Math.PI * 0.15; // Gap between segments
        const segmentAngle = (Math.PI * 2 / segments) - gapAngle;

        ctx.save();
        ctx.globalAlpha = this.targetReticleOpacity;

        // Draw outer segmented ring
        for (let i = 0; i < segments; i++) {
            const startAngle = spinAngle + (i / segments) * Math.PI * 2;
            const endAngle = startAngle + segmentAngle;

            ctx.beginPath();
            ctx.arc(0, 0, baseRadius, startAngle, endAngle);
            
            // Outline
            if (this.targetReticleOutlineWidth > 0) {
                ctx.strokeStyle = this.targetReticleOutlineColor;
                ctx.lineWidth = lineThickness + this.targetReticleOutlineWidth * 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            // Main color
            ctx.strokeStyle = this.targetReticleColor;
            ctx.lineWidth = lineThickness;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Draw inner segmented ring (counter-rotating)
        const innerSegments = Math.max(2, segments);
        const innerSegmentAngle = (Math.PI * 2 / innerSegments) - gapAngle * 1.5;
        
        for (let i = 0; i < innerSegments; i++) {
            const startAngle = -spinAngle * 1.5 + (i / innerSegments) * Math.PI * 2 + Math.PI / innerSegments;
            const endAngle = startAngle + innerSegmentAngle;

            ctx.beginPath();
            ctx.arc(0, 0, innerRadius, startAngle, endAngle);
            
            // Outline
            if (this.targetReticleOutlineWidth > 0) {
                ctx.strokeStyle = this.targetReticleOutlineColor;
                ctx.lineWidth = lineThickness * 0.7 + this.targetReticleOutlineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            // Main color
            ctx.strokeStyle = this.targetReticleColor;
            ctx.lineWidth = lineThickness * 0.7;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Draw corner brackets / crosshairs
        const bracketSize = baseRadius * 0.25;
        const bracketOffset = baseRadius * 0.85;
        const bracketThickness = lineThickness * 0.8;
        
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        
        for (let i = 0; i < 4; i++) {
            const angle = spinAngle * 0.5 + (i / 4) * Math.PI * 2;
            const bx = Math.cos(angle) * bracketOffset;
            const by = Math.sin(angle) * bracketOffset;
            
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle + Math.PI * 0.75);
            
            // L-shaped bracket
            ctx.beginPath();
            ctx.moveTo(-bracketSize * 0.5, 0);
            ctx.lineTo(0, 0);
            ctx.lineTo(0, bracketSize * 0.5);
            
            // Outline
            if (this.targetReticleOutlineWidth > 0) {
                ctx.strokeStyle = this.targetReticleOutlineColor;
                ctx.lineWidth = bracketThickness + this.targetReticleOutlineWidth * 2;
                ctx.stroke();
            }
            
            // Main color
            ctx.strokeStyle = this.targetReticleColor;
            ctx.lineWidth = bracketThickness;
            ctx.stroke();
            
            ctx.restore();
        }

        // Center dot with pulse
        const dotRadius = lineThickness * 1.2 * (1 + Math.sin(pulsePhase * 2) * 0.2);
        ctx.beginPath();
        ctx.arc(0, 0, dotRadius, 0, Math.PI * 2);
        
        if (this.targetReticleOutlineWidth > 0) {
            ctx.strokeStyle = this.targetReticleOutlineColor;
            ctx.lineWidth = this.targetReticleOutlineWidth;
            ctx.stroke();
        }
        
        ctx.fillStyle = this.targetReticleColor;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Set this creature as being targeted by another creature
     * @param {ProceduralCreature|null} targetingCreature - The creature targeting this one, or null to clear
     */
    setTargetedBy(targetingCreature) {
        this._isBeingTargeted = (targetingCreature !== null);
        this._targetingCreature = targetingCreature;
    }

    /**
     * Check if this creature is currently being targeted
     * @returns {boolean}
     */
    isBeingTargeted() {
        return this._isBeingTargeted;
    }

    _drawArm(ctx, arm) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Worm dig — hide arms when underground
        if (this.wormDigEnabled && this._wormSegmentVisibility && this._wormSegmentVisibility.length > 0) {
            const headVis = this._wormSegmentVisibility[0];
            if (headVis < 0.01) return;
        }

        // Transform world coordinates to local space
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Base position in local space
        const baseDX = arm.baseWorldX - worldPos.x;
        const baseDY = arm.baseWorldY - worldPos.y;
        let localBaseX = baseDX * cos - baseDY * sin;
        let localBaseY = baseDX * sin + baseDY * cos;

        // Hand position in local space
        const handDX = arm.currentHandPos.x - worldPos.x;
        const handDY = arm.currentHandPos.y - worldPos.y;
        let localHandX = handDX * cos - handDY * sin;
        let localHandY = handDX * sin + handDY * cos;
        
        // In 2.5D mode, elevate the arm base in WORLD space (always up)
        if (this.enable25DMode && this.bodyElevation > 0) {
            // Get world-relative elevation offset (arms slightly lower than body center)
            const elevationOffset = this._get25DElevationOffset(this.bodyElevation * 0.9);
            localBaseX += elevationOffset.x;
            localBaseY += elevationOffset.y;
        }

        // Add depth parallax offset for arms (shoulder gets body-level parallax)
        // Hands use handHeightDepth, with multiple arms getting distributed heights
        if (this.depthEnabled) {
            const armDepthOffset = this._getDepthOffset(this.armHeightDepth);
            localBaseX += armDepthOffset.x;
            localBaseY += armDepthOffset.y;
            
            // Calculate per-arm hand height based on arm index
            // First pair of arms get handHeightDepth, additional arms get progressively lower
            const armPairIndex = Math.floor(arm.index / 2); // 0, 0, 1, 1, 2, 2...
            const totalArmPairs = Math.ceil(this.armCount / 2);
            let handHeight = this.handHeightDepth;
            if (totalArmPairs > 1) {
                // Distribute hand heights from handHeightDepth down toward legHeightDepth
                const t = armPairIndex / (totalArmPairs - 1); // 0 to 1
                handHeight = this.handHeightDepth * (1 - t * 0.6); // Reduce by up to 60% for rear arms
            }
            
            const handDepthOffset = this._getDepthOffset(handHeight);
            localHandX += handDepthOffset.x;
            localHandY += handDepthOffset.y;
        }

        // Calculate 2-point IK (shoulder to elbow to hand)
        const totalDist = Math.sqrt(
            (localHandX - localBaseX) ** 2 +
            (localHandY - localBaseY) ** 2
        );

        const segmentLength = this.armLength / this.armSegments;
        const totalArmLength = segmentLength * this.armSegments;

        // 2-point IK for elbow position
        let elbowX, elbowY;

        if (this.armSegments === 2) {
            // Classic 2-point IK (shoulder-elbow-hand)
            const upperArmLength = segmentLength;
            const lowerArmLength = segmentLength;

            if (totalDist >= totalArmLength - 0.1) {
                // Arm is fully extended - straighten it
                const dirX = (localHandX - localBaseX) / totalDist;
                const dirY = (localHandY - localBaseY) / totalDist;
                elbowX = localBaseX + dirX * upperArmLength;
                elbowY = localBaseY + dirY * upperArmLength;
            } else {
                // Calculate elbow position using law of cosines
                const a = upperArmLength;
                const b = lowerArmLength;
                const c = totalDist;

                // Angle at shoulder
                const cosAngleA = (a * a + c * c - b * b) / (2 * a * c);
                const angleA = Math.acos(Math.max(-1, Math.min(1, cosAngleA)));

                // Direction from shoulder to hand
                const baseToHandAngle = Math.atan2(localHandY - localBaseY, localHandX - localBaseX);

                // Elbow angle - bend INWARD and DOWNWARD (toward creature center and forward)
                // In 2.5D mode, bend primarily outward (X direction)
                const elbowBendDirection = arm.side;
                const elbowAngle = baseToHandAngle + angleA * elbowBendDirection;

                elbowX = localBaseX + Math.cos(elbowAngle) * upperArmLength;
                elbowY = localBaseY + Math.sin(elbowAngle) * upperArmLength;
            }
        } else {
            // Multiple segments - simplified chaining
            const dirX = totalDist > 0 ? (localHandX - localBaseX) / totalDist : 0;
            const dirY = totalDist > 0 ? (localHandY - localBaseY) / totalDist : 0;
            elbowX = localBaseX + dirX * segmentLength;
            elbowY = localBaseY + dirY * segmentLength;
        }

        // Draw arm
        ctx.save();
        ctx.strokeStyle = this.armColor;
        ctx.lineWidth = this.armThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw upper arm (shoulder to elbow)
        ctx.beginPath();
        ctx.moveTo(localBaseX, localBaseY);
        ctx.lineTo(elbowX, elbowY);
        ctx.stroke();

        // Draw lower arm (elbow to hand)
        ctx.beginPath();
        ctx.moveTo(elbowX, elbowY);
        ctx.lineTo(localHandX, localHandY);
        ctx.stroke();

        // Draw joints
        if (this.showJoints) {
            ctx.fillStyle = this.accentColor;

            // Shoulder joint (slightly larger than arm thickness)
            ctx.beginPath();
            ctx.arc(localBaseX, localBaseY, this.armThickness * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // Elbow joint (slightly larger than arm thickness)
            ctx.beginPath();
            ctx.arc(elbowX, elbowY, this.armThickness * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Hand
            //ctx.beginPath();
            //ctx.arc(localHandX, localHandY, this.armThickness * 1.5, 0, Math.PI * 2);
            //ctx.fill();

            // If reaching for something, draw indicator
            /*if (arm.reachingTarget) {
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(localHandX, localHandY, this.armThickness * 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }*/

        }

        // Draw hand/claw based on armTipShape
        this._drawArmTip(ctx, localHandX, localHandY, arm);

        // Draw reload indicator (spinning curved arrow) if arm is reloading
        if (arm._reloadingGun && arm._reloadProgress !== undefined) {
            this._drawReloadIndicator(ctx, localHandX, localHandY, arm);
        }

        ctx.restore();
    }

    /**
     * Draw a spinning curved arrow to indicate reloading
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} handX - Local hand X position
     * @param {number} handY - Local hand Y position
     * @param {object} arm - The arm object
     */
    _drawReloadIndicator(ctx, handX, handY, arm) {
        const reloadProgress = arm._reloadProgress || 0;
        
        // Try to position at gun muzzle tip if we have a gun
        let offsetX = handX;
        let offsetY = handY;
        
        if (arm.heldItem && typeof arm.heldItem.getMuzzleWorldPosition === 'function') {
            // Get muzzle world position and convert to local space
            const muzzle = arm.heldItem.getMuzzleWorldPosition();
            const worldPos = this.gameObject.getWorldPosition();
            const bodyAngle = this.gameObject.angle * Math.PI / 180;
            const cos = Math.cos(-bodyAngle);
            const sin = Math.sin(-bodyAngle);
            
            const dx = muzzle.x - worldPos.x;
            const dy = muzzle.y - worldPos.y;
            offsetX = dx * cos - dy * sin;
            offsetY = dx * sin + dy * cos;
        } else {
            // Fallback: position to the side of the hand
            const offsetDist = 20 + this.armThickness;
            offsetX = handX + offsetDist * arm.side;
        }
        
        // Arrow size
        const arrowRadius = 8;
        const arrowThickness = 2.5;
        
        // Spin the arrow based on time (not just progress, for continuous spin effect)
        const spinSpeed = 4; // Rotations per second
        const spinAngle = (performance.now() / 1000) * spinSpeed * Math.PI * 2;
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.rotate(spinAngle);
        
        // Draw curved arrow (partial circle with arrow head)
        const arcStart = 0;
        const arcEnd = Math.PI * 1.5; // 270 degrees of arc
        
        ctx.strokeStyle = '#FF8C00'; // Orange color for reload
        ctx.lineWidth = arrowThickness;
        ctx.lineCap = 'round';
        
        // Draw the curved part
        ctx.beginPath();
        ctx.arc(0, 0, arrowRadius, arcStart, arcEnd);
        ctx.stroke();
        
        // Draw arrow head at the end of the arc
        const arrowHeadSize = 5;
        const endAngle = arcEnd;
        const endX = Math.cos(endAngle) * arrowRadius;
        const endY = Math.sin(endAngle) * arrowRadius;
        
        // Arrow head points in tangent direction (perpendicular to radius at end point)
        const tangentAngle = endAngle + Math.PI / 2; // Tangent direction
        
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX + Math.cos(tangentAngle - 2.5) * arrowHeadSize,
            endY + Math.sin(tangentAngle - 2.5) * arrowHeadSize
        );
        ctx.lineTo(
            endX + Math.cos(tangentAngle + 2.5) * arrowHeadSize,
            endY + Math.sin(tangentAngle + 2.5) * arrowHeadSize
        );
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    _drawArmTip(ctx, x, y, arm) {
        const thickness = this.armThickness * this.armTipSize;

        // Calculate arm direction for oriented tips
        const head = this._segments[0];
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        const baseDX = arm.baseWorldX - worldPos.x;
        const baseDY = arm.baseWorldY - worldPos.y;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localBaseX = baseDX * cos - baseDY * sin;
        const localBaseY = baseDX * sin + baseDY * cos;

        const armAngle = Math.atan2(y - localBaseY, x - localBaseX);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(armAngle);

        ctx.fillStyle = this.armColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 1.5;

        // Determine if hand should be closed (holding/grabbing/holdingItem or punching bare-fisted)
        const isHandClosed = (arm.state === 'holding' || arm.state === 'grabbing' || arm.state === 'holdingItem' || arm.heldItem != null || (arm.state === 'punching' && !arm.heldItem));
        // Mirror factor: right arm (side=1) draws normally, left arm (side=-1) flips Y
        const mirrorY = arm.side || 1;

        switch (this.armTipShape) {
            case "claw": {
                // Realistic crab/lobster claw: two curved pincers with serrated inner edges
                const cl = this.clawLength;
                const outerR = cl * 1.0;   // Outer half-circle radius
                const innerR = cl * 0.6;   // Inner half-circle radius (smaller)
                const spikeCount = 4;       // Number of serration spikes per pincer

                ctx.fillStyle = this.accentColor;
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1.5;

                // === TOP PINCER ===
                ctx.save();
                ctx.beginPath();
                // Outer arc (top of pincer)
                ctx.arc(cl * 0.3, -thickness * 0.15, outerR, -Math.PI * 0.5, Math.PI * 0.08);
                // Inner arc back (smaller, forms the gripping surface)
                ctx.arc(cl * 0.3, -thickness * 0.15, innerR, Math.PI * 0.08, -Math.PI * 0.5, true);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Serration spikes on inner edge of top pincer
                ctx.fillStyle = this.armColor;
                for (let i = 0; i < spikeCount; i++) {
                    const t = (i + 0.5) / spikeCount;
                    const spikeAngle = -Math.PI * 0.5 + t * (Math.PI * 0.58);
                    const sx = cl * 0.3 + Math.cos(spikeAngle) * innerR;
                    const sy = -thickness * 0.15 + Math.sin(spikeAngle) * innerR;
                    const tipX = cl * 0.3 + Math.cos(spikeAngle) * (innerR * 0.6);
                    const tipY = -thickness * 0.15 + Math.sin(spikeAngle) * (innerR * 0.6);
                    const perpAngle = spikeAngle + Math.PI / 2;
                    const hw = cl * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(sx + Math.cos(perpAngle) * hw, sy + Math.sin(perpAngle) * hw);
                    ctx.lineTo(tipX, tipY);
                    ctx.lineTo(sx - Math.cos(perpAngle) * hw, sy - Math.sin(perpAngle) * hw);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // === BOTTOM PINCER ===
                ctx.save();
                ctx.fillStyle = this.accentColor;
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                // Outer arc (bottom of pincer)
                ctx.arc(cl * 0.3, thickness * 0.15, outerR, -Math.PI * 0.08, Math.PI * 0.5);
                // Inner arc back (smaller)
                ctx.arc(cl * 0.3, thickness * 0.15, innerR, Math.PI * 0.5, -Math.PI * 0.08, true);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Serration spikes on inner edge of bottom pincer
                ctx.fillStyle = this.armColor;
                for (let i = 0; i < spikeCount; i++) {
                    const t = (i + 0.5) / spikeCount;
                    const spikeAngle = -Math.PI * 0.08 + t * (Math.PI * 0.58);
                    const sx = cl * 0.3 + Math.cos(spikeAngle) * innerR;
                    const sy = thickness * 0.15 + Math.sin(spikeAngle) * innerR;
                    const tipX = cl * 0.3 + Math.cos(spikeAngle) * (innerR * 0.6);
                    const tipY = thickness * 0.15 + Math.sin(spikeAngle) * (innerR * 0.6);
                    const perpAngle = spikeAngle - Math.PI / 2;
                    const hw = cl * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(sx + Math.cos(perpAngle) * hw, sy + Math.sin(perpAngle) * hw);
                    ctx.lineTo(tipX, tipY);
                    ctx.lineTo(sx - Math.cos(perpAngle) * hw, sy - Math.sin(perpAngle) * hw);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // Base knuckle joint connecting to arm
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.stroke();
                break;
            }

            case "hand": {
                // Draw hand - open when idle, closed fist when holding/grabbing
                if (isHandClosed) {
                    // === CLOSED FIST ===
                    ctx.fillStyle = this.armColor;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, thickness * 1.3, thickness * 1.1, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Knuckle bumps on top
                    ctx.strokeStyle = this.accentColor;
                    ctx.lineWidth = 1;
                    for (let i = 0; i < 4; i++) {
                        const offset = (i - 1.5) * thickness * 0.35;
                        ctx.beginPath();
                        ctx.arc(thickness * 0.3, offset, thickness * 0.2, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    // Thumb wrap
                    const thumbSide = mirrorY;
                    ctx.strokeStyle = this.armColor;
                    ctx.lineWidth = thickness * 0.5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(-thickness * 0.4, thumbSide * thickness * 0.6);
                    ctx.quadraticCurveTo(thickness * 0.3, thumbSide * thickness * 0.8, thickness * 0.5, thumbSide * thickness * 0.2);
                    ctx.stroke();
                } else {
                    // === OPEN HAND ===
                    const palmWidth = thickness * 1.8;
                    const palmHeight = thickness * 1.4;
                    const fingerLen = thickness * 2.5;
                    const fingerThickness = thickness * 0.5;
                    const thumbLen = thickness * 1.8;
                    
                    // Palm
                    ctx.fillStyle = this.armColor;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, palmWidth * 0.6, palmHeight * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Fingers
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    const fingerAngles = [];
                    const fingerSpreadRad = (this.fingerSpread * Math.PI / 180);
                    const totalSpread = fingerSpreadRad;
                    const startAngleF = -totalSpread / 2;
                    
                    for (let i = 0; i < this.fingerCount; i++) {
                        const t = this.fingerCount > 1 ? i / (this.fingerCount - 1) : 0.5;
                        fingerAngles.push(startAngleF + t * totalSpread);
                    }
                    
                    for (let i = 0; i < this.fingerCount; i++) {
                        const angle = fingerAngles[i];
                        const fingerStartX = Math.cos(angle) * palmWidth * 0.4;
                        const fingerStartY = Math.sin(angle) * palmHeight * 0.3;
                        const fingerEndX = fingerStartX + Math.cos(angle) * fingerLen;
                        const fingerEndY = fingerStartY + Math.sin(angle) * fingerLen;
                        const midX = fingerStartX + Math.cos(angle) * fingerLen * 0.5;
                        const midY = fingerStartY + Math.sin(angle) * fingerLen * 0.5;
                        
                        ctx.strokeStyle = this.armColor;
                        ctx.lineWidth = fingerThickness;
                        ctx.beginPath();
                        ctx.moveTo(fingerStartX, fingerStartY);
                        ctx.lineTo(midX, midY);
                        ctx.stroke();
                        
                        ctx.lineWidth = fingerThickness * 0.8;
                        ctx.beginPath();
                        ctx.moveTo(midX, midY);
                        ctx.lineTo(fingerEndX, fingerEndY);
                        ctx.stroke();
                        
                        ctx.fillStyle = this.accentColor;
                        ctx.beginPath();
                        ctx.arc(midX, midY, fingerThickness * 0.4, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.beginPath();
                        ctx.arc(fingerEndX, fingerEndY, fingerThickness * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Thumb - mirrored based on arm side so both thumbs point inward
                    const thumbBaseAngle = -Math.PI * 0.4 - fingerSpreadRad * 0.3;
                    const thumbAngle = thumbBaseAngle * mirrorY;
                    const thumbStartX = Math.cos(thumbAngle) * palmWidth * 0.3;
                    const thumbStartY = Math.sin(thumbAngle) * palmHeight * 0.4 - mirrorY * palmHeight * 0.2;
                    const thumbCurlAngle = thumbAngle - 0.3 * mirrorY;
                    const thumbEndX = thumbStartX + Math.cos(thumbCurlAngle) * thumbLen;
                    const thumbEndY = thumbStartY + Math.sin(thumbCurlAngle) * thumbLen;
                    
                    ctx.strokeStyle = this.armColor;
                    ctx.lineWidth = fingerThickness * 1.1;
                    ctx.beginPath();
                    ctx.moveTo(thumbStartX, thumbStartY);
                    ctx.lineTo(thumbEndX, thumbEndY);
                    ctx.stroke();
                    
                    ctx.fillStyle = this.accentColor;
                    ctx.beginPath();
                    ctx.arc(thumbEndX, thumbEndY, fingerThickness * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case "fist":
                // Closed fist shape
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, thickness * 1.3, thickness * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Knuckle lines
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const offset = (i - 1) * thickness * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-thickness * 0.3, offset);
                    ctx.lineTo(thickness * 0.3, offset);
                    ctx.stroke();
                }
                break;

            case "tentacle": {
                // Wavy tentacle tip with suckers
                const tentLen = this.clawLength * 1.5;
                const waveAmp = thickness * 0.6;
                const segments = 6;
                const mirrorT = arm.side || 1;

                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = thickness * 0.8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const px = t * tentLen;
                    const py = Math.sin(t * Math.PI * 2.5) * waveAmp * (1 - t * 0.5) * mirrorT;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();

                // Taper the end
                ctx.lineWidth = thickness * 0.3;
                const tipX = tentLen;
                const tipY = Math.sin(Math.PI * 2.5) * waveAmp * 0.5 * mirrorT;
                ctx.beginPath();
                ctx.moveTo(tentLen * 0.8, Math.sin(0.8 * Math.PI * 2.5) * waveAmp * 0.6 * mirrorT);
                ctx.lineTo(tipX * 1.1, tipY * 0.8);
                ctx.stroke();

                // Small suckers along the underside
                ctx.fillStyle = this.accentColor;
                for (let i = 1; i <= 4; i++) {
                    const t = i / 5;
                    const sx = t * tentLen;
                    const sy = Math.sin(t * Math.PI * 2.5) * waveAmp * (1 - t * 0.5) * mirrorT;
                    const suckerSize = thickness * 0.25 * (1 - t * 0.3);
                    ctx.beginPath();
                    ctx.arc(sx, sy + mirrorT * suckerSize * 1.5, suckerSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Base knuckle
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 0.9, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "hook": {
                // Curved pirate-style hook
                const hookLen = this.clawLength * 1.2;
                const hookCurve = hookLen * 0.7;
                const mirrorH = arm.side || 1;

                // Hook shaft
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = thickness * 0.7;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(hookLen * 0.6, 0);
                ctx.stroke();

                // Curved hook
                ctx.lineWidth = thickness * 0.6;
                ctx.beginPath();
                ctx.moveTo(hookLen * 0.6, 0);
                ctx.quadraticCurveTo(
                    hookLen, -mirrorH * hookCurve * 0.3,
                    hookLen * 0.8, -mirrorH * hookCurve * 0.6
                );
                ctx.quadraticCurveTo(
                    hookLen * 0.5, -mirrorH * hookCurve * 0.7,
                    hookLen * 0.35, -mirrorH * hookCurve * 0.4
                );
                ctx.stroke();

                // Sharp tip
                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.arc(hookLen * 0.35, -mirrorH * hookCurve * 0.4, thickness * 0.25, 0, Math.PI * 2);
                ctx.fill();

                // Base collar
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 1.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            }

            case "blade": {
                // Bladed hand/arm blade
                const bladeLen = this.clawLength * 1.8;
                const bladeWidth = thickness * 1.2;

                // Blade body
                ctx.fillStyle = this.accentColor;
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, 0);
                ctx.lineTo(thickness * 0.2, -bladeWidth * 0.5);
                ctx.lineTo(bladeLen * 0.7, -bladeWidth * 0.3);
                ctx.lineTo(bladeLen, 0);
                ctx.lineTo(bladeLen * 0.7, bladeWidth * 0.3);
                ctx.lineTo(thickness * 0.2, bladeWidth * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Center ridge
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(thickness * 0.2, 0);
                ctx.lineTo(bladeLen * 0.85, 0);
                ctx.stroke();

                // Edge highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(thickness * 0.2, -bladeWidth * 0.5);
                ctx.lineTo(bladeLen * 0.7, -bladeWidth * 0.3);
                ctx.lineTo(bladeLen, 0);
                ctx.stroke();

                // Base guard
                ctx.fillStyle = this.armColor;
                ctx.fillRect(-thickness * 0.5, -bladeWidth * 0.6, thickness * 0.7, bladeWidth * 1.2);
                break;
            }

            case "paw": {
                // Animal paw with toe pads
                const pawW = thickness * 1.6;
                const pawH = thickness * 1.4;
                const toeCount = 4;
                const toeSize = thickness * 0.4;
                const mirrorP = arm.side || 1;

                // Main pad
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, pawW * 0.55, pawH * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Central pad (darker)
                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.ellipse(thickness * 0.1, 0, pawW * 0.3, pawH * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();

                // Toe pads
                for (let i = 0; i < toeCount; i++) {
                    const t = toeCount > 1 ? i / (toeCount - 1) : 0.5;
                    const angle = (t - 0.5) * Math.PI * 0.7;
                    const tx = pawW * 0.5 + Math.cos(angle) * toeSize * 0.5;
                    const ty = Math.sin(angle) * pawH * 0.45;

                    ctx.fillStyle = this.accentColor;
                    ctx.beginPath();
                    ctx.arc(tx, ty, toeSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Tiny claw
                    ctx.strokeStyle = this.armColor;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tx + toeSize * 0.8, ty);
                    ctx.lineTo(tx + toeSize * 1.8, ty + Math.sin(angle) * toeSize * 0.5);
                    ctx.stroke();
                }
                break;
            }

            case "mitten": {
                // Rounded mitten shape (simplified hand)
                const mitW = thickness * 1.5;
                const mitH = thickness * 1.3;
                const mirrorM = arm.side || 1;

                // Mitten body
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.ellipse(thickness * 0.2, 0, mitW * 0.6, mitH * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Thumb nub
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.ellipse(-thickness * 0.1, mirrorM * mitH * 0.4, mitW * 0.2, mitH * 0.25, mirrorM * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Stitch line
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 0.8;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, 0);
                ctx.lineTo(thickness * 0.6, 0);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            }

            case "sucker": {
                // Suction cup (octopus-style)
                const suckerR = thickness * 1.3;

                // Outer ring
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, suckerR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Inner concentric rings
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, suckerR * 0.7, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, 0, suckerR * 0.4, 0, Math.PI * 2);
                ctx.stroke();

                // Center dot
                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.arc(0, 0, suckerR * 0.15, 0, Math.PI * 2);
                ctx.fill();

                // Rim detail - small radial lines
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 0.8;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * suckerR * 0.7, Math.sin(a) * suckerR * 0.7);
                    ctx.lineTo(Math.cos(a) * suckerR * 0.9, Math.sin(a) * suckerR * 0.9);
                    ctx.stroke();
                }
                break;
            }

            case "pincer": {
                // Crab-like pincer arm tip
                const pincerLen = this.clawLength * 1.2;
                const pincerW = thickness * 0.8;
                const mirrorPincer = arm.side || 1;

                // Base joint
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 0.9, 0, Math.PI * 2);
                ctx.fill();

                // Upper pincer arm
                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.moveTo(thickness * 0.3, -pincerW * 0.3);
                ctx.quadraticCurveTo(pincerLen * 0.5, -pincerW * 1.2, pincerLen, -pincerW * 0.4);
                ctx.quadraticCurveTo(pincerLen * 0.8, -pincerW * 0.1, pincerLen * 0.5, pincerW * 0.1);
                ctx.lineTo(thickness * 0.3, pincerW * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Lower pincer arm
                ctx.beginPath();
                ctx.moveTo(thickness * 0.3, pincerW * 0.3);
                ctx.quadraticCurveTo(pincerLen * 0.5, pincerW * 1.2, pincerLen, pincerW * 0.4);
                ctx.quadraticCurveTo(pincerLen * 0.8, pincerW * 0.1, pincerLen * 0.5, -pincerW * 0.1);
                ctx.lineTo(thickness * 0.3, -pincerW * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }

            case "stump": {
                // Rounded stump/nub (amputated or simple arm)
                const stumpR = thickness * 1.4;

                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(0, 0, stumpR, -Math.PI * 0.5, Math.PI * 0.5);
                ctx.lineTo(0, stumpR);
                ctx.lineTo(0, -stumpR);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Scarred/bandaged look
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, -stumpR * 0.5);
                ctx.lineTo(thickness * 0.3, -stumpR * 0.3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, stumpR * 0.3);
                ctx.lineTo(thickness * 0.5, stumpR * 0.5);
                ctx.stroke();
                break;
            }

            case "spike": {
                // Sharp pointed spike arm
                const spikeLen = this.clawLength * 2;

                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.5, -thickness * 0.6);
                ctx.lineTo(spikeLen, 0);
                ctx.lineTo(-thickness * 0.5, thickness * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Sharp glint
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -thickness * 0.2);
                ctx.lineTo(spikeLen * 0.7, 0);
                ctx.stroke();

                // Base joint
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.arc(-thickness * 0.3, 0, thickness * 0.7, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "webbed": {
                // Webbed hand (aquatic creature)
                const palmW = thickness * 1.5;
                const fingerLen = thickness * 2;
                const fingerCount = this.fingerCount || 4;
                const fingerSpreadRad = (this.fingerSpread || 45) * Math.PI / 180;

                // Palm
                ctx.fillStyle = this.armColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, palmW * 0.5, thickness * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw webbing between fingers (behind fingers)
                const fingerAngles = [];
                for (let i = 0; i < fingerCount; i++) {
                    const t = fingerCount > 1 ? i / (fingerCount - 1) : 0.5;
                    fingerAngles.push((t - 0.5) * fingerSpreadRad);
                }

                // Webbing membrane
                ctx.fillStyle = this._adjustColorAlpha ? this._adjustColorAlpha(this.accentColor, 0.5) : this.accentColor;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let i = 0; i < fingerCount; i++) {
                    const angle = fingerAngles[i];
                    const fx = Math.cos(angle) * fingerLen * 0.9;
                    const fy = Math.sin(angle) * fingerLen * 0.9;
                    ctx.lineTo(fx, fy);
                }
                ctx.closePath();
                ctx.fill();

                // Fingers
                ctx.strokeStyle = this.armColor;
                ctx.lineWidth = thickness * 0.4;
                ctx.lineCap = 'round';
                for (let i = 0; i < fingerCount; i++) {
                    const angle = fingerAngles[i];
                    const fx = Math.cos(angle) * fingerLen;
                    const fy = Math.sin(angle) * fingerLen;
                    ctx.beginPath();
                    ctx.moveTo(palmW * 0.3, 0);
                    ctx.lineTo(fx, fy);
                    ctx.stroke();

                    // Fingertip
                    ctx.fillStyle = this.accentColor;
                    ctx.beginPath();
                    ctx.arc(fx, fy, thickness * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case "bone": {
                // Skeletal bone hand
                const boneLen = this.clawLength * 1.5;
                const boneW = thickness * 0.5;

                // Bone shaft
                ctx.fillStyle = '#e8e0d0';
                ctx.strokeStyle = '#a09080';
                ctx.lineWidth = 1;

                // Main bone
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, -boneW);
                ctx.lineTo(boneLen * 0.7, -boneW * 0.7);
                ctx.quadraticCurveTo(boneLen, 0, boneLen * 0.7, boneW * 0.7);
                ctx.lineTo(-thickness * 0.3, boneW);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Knuckle joints
                ctx.beginPath();
                ctx.arc(-thickness * 0.1, 0, boneW * 1.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(boneLen * 0.4, 0, boneW * 1.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Finger bones
                for (let i = -1; i <= 1; i++) {
                    const angle = i * 0.4;
                    const startX = boneLen * 0.7;
                    const endX = startX + Math.cos(angle) * boneLen * 0.4;
                    const endY = Math.sin(angle) * boneLen * 0.4;
                    ctx.strokeStyle = '#e8e0d0';
                    ctx.lineWidth = boneW * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(startX, 0);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                break;
            }

            case "flame": {
                // Flaming hand/fire elemental
                const flameLen = this.clawLength * 1.5;
                const flameW = thickness * 1.2;

                // Core glow
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 0.8, 0, Math.PI * 2);
                ctx.fill();

                // Flame tongues
                ctx.fillStyle = '#ff6600';
                const tongueCount = 5;
                for (let i = 0; i < tongueCount; i++) {
                    const angle = (i / tongueCount - 0.5) * Math.PI * 0.8;
                    const len = flameLen * (0.6 + Math.random() * 0.4);
                    const wobble = (Math.random() - 0.5) * flameW * 0.3;

                    ctx.beginPath();
                    ctx.moveTo(thickness * 0.3, wobble);
                    ctx.quadraticCurveTo(
                        len * 0.5, Math.sin(angle) * flameW + wobble,
                        len, Math.sin(angle) * flameW * 0.5
                    );
                    ctx.quadraticCurveTo(
                        len * 0.7, Math.sin(angle) * flameW * 0.3,
                        thickness * 0.3, wobble * 0.5
                    );
                    ctx.closePath();
                    ctx.fill();
                }

                // Inner bright core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(thickness * 0.2, 0, thickness * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "crystal": {
                // Crystal/gem hand
                const crystalLen = this.clawLength * 1.3;
                const crystalW = thickness * 1.0;

                // Main crystal body
                ctx.fillStyle = this.accentColor;
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 0.5;

                // Central crystal shard
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, 0);
                ctx.lineTo(thickness * 0.2, -crystalW);
                ctx.lineTo(crystalLen, -crystalW * 0.3);
                ctx.lineTo(crystalLen * 1.1, 0);
                ctx.lineTo(crystalLen, crystalW * 0.3);
                ctx.lineTo(thickness * 0.2, crystalW);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Side crystal shards
                ctx.fillStyle = this._adjustColorBrightness ? this._adjustColorBrightness(this.accentColor, -20) : this.accentColor;
                ctx.beginPath();
                ctx.moveTo(0, -crystalW * 0.5);
                ctx.lineTo(crystalLen * 0.5, -crystalW * 1.3);
                ctx.lineTo(crystalLen * 0.6, -crystalW * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, crystalW * 0.5);
                ctx.lineTo(crystalLen * 0.4, crystalW * 1.2);
                ctx.lineTo(crystalLen * 0.5, crystalW * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Shine highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.moveTo(thickness * 0.3, -crystalW * 0.3);
                ctx.lineTo(crystalLen * 0.5, -crystalW * 0.5);
                ctx.lineTo(crystalLen * 0.5, -crystalW * 0.2);
                ctx.closePath();
                ctx.fill();
                break;
            }

            default: // circle
                ctx.fillStyle = this.accentColor;
                ctx.beginPath();
                ctx.arc(0, 0, thickness, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }

        ctx.restore();
    }

    _drawLeg(ctx, leg) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Worm dig — hide legs based on their segment's visibility
        if (this.wormDigEnabled && this._wormSegmentVisibility && this._wormSegmentVisibility.length > leg.segmentIndex) {
            const segVis = this._wormSegmentVisibility[leg.segmentIndex];
            if (segVis < 0.01) return;
        }

        // Get base and foot positions
        let baseX = leg.baseX;
        let baseY = leg.baseY;

        // Transform world coordinates to local space relative to body
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Correct rotation transform for base position
        const baseDX = baseX - worldPos.x;
        const baseDY = baseY - worldPos.y;
        let localBaseX = baseDX * cos - baseDY * sin;
        let localBaseY = baseDX * sin + baseDY * cos;

        // Correct rotation transform for foot position
        const footDX = leg.currentPos.x - worldPos.x;
        const footDY = leg.currentPos.y - worldPos.y;
        let localFootX = footDX * cos - footDY * sin;
        let localFootY = footDX * sin + footDY * cos;
        
        // In 2.5D mode, elevate the base (hip) position in WORLD space (always up)
        // The foot stays on the ground, base is elevated by bodyElevation
        if (this.enable25DMode && this.bodyElevation > 0) {
            // Get world-relative elevation offset
            const elevationOffset = this._get25DElevationOffset(this.bodyElevation);
            localBaseX += elevationOffset.x;
            localBaseY += elevationOffset.y;
        }

        // Add depth parallax offset to leg base (hip) - feet stay grounded
        // Hip gets body-level parallax, foot stays at ground level (legHeightDepth = 0)
        let hipDepthOffset = { x: 0, y: 0 };
        if (this.depthEnabled) {
            hipDepthOffset = this._getDepthOffset(this.bodyHeightDepth * 0.8);
            localBaseX += hipDepthOffset.x;
            localBaseY += hipDepthOffset.y;
            // FEET NEVER GET PARALLAX - they are planted on the ground
            // This ensures foot tips stay perfectly stable regardless of camera position
            // (legHeightDepth is intentionally NOT applied to localFootX/localFootY)
        }

        // IK solve for leg segments - pass joint style so solver can emit appropriate joint positions
        // bendDirection: legs bend outward from body (left legs bend left, right legs bend right)
        // In 2.5D mode, we pass the elevation info so joints can be distributed properly
        const joints = this._solveLegIK(
            localBaseX, localBaseY,
            localFootX, localFootY,
            this.legSegments,
            this.legJointStyle,
            this.legLength * leg.lengthMultiplier,
            leg.side, // Use leg side for bend direction (outward from body)
            this.legBendStrength || 1.0, // Bend strength multiplier
            this.enable25DMode // Pass 2.5D mode flag
        );

        // Apply interpolated depth offset to each joint (hip to foot gradient)
        // Knee joints get intermediate parallax between hip and foot
        // Uses cubic falloff so joints near the foot have near-zero depth,
        // preventing visual "wobble" at the foot end when camera moves
        if (this.depthEnabled && joints.length > 0) {
            const numJoints = joints.length;
            for (let i = 0; i < numJoints; i++) {
                // Interpolate: joint 0 is closest to hip, last joint is closest to foot
                const t = (i + 1) / (numJoints + 1); // 0 = hip, 1 = foot
                // Cubic falloff: (1-t)^3 keeps joints near foot very grounded
                const falloff = (1 - t) * (1 - t) * (1 - t);
                const jointHeightFactor = this.bodyHeightDepth * 0.8 * falloff;
                const jointDepthOffset = this._getDepthOffset(jointHeightFactor);
                joints[i].x += jointDepthOffset.x;
                joints[i].y += jointDepthOffset.y;
            }
        }

        // Draw leg segments based on style
        const effectiveThickness = this.legThickness * leg.thicknessMultiplier;

        // Draw foot based on legTipShape
        this._drawLegTip(ctx, localFootX, localFootY, effectiveThickness, leg);

        ctx.strokeStyle = this.legColor;
        ctx.lineWidth = effectiveThickness;

        if (this.legJointStyle === "angular") {
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
        } else {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        ctx.beginPath();
        ctx.moveTo(localBaseX, localBaseY);
        for (let joint of joints) {
            ctx.lineTo(joint.x, joint.y);
        }
        ctx.lineTo(localFootX, localFootY);
        ctx.stroke();

        // Draw joints based on style (slightly larger than leg thickness)
        if (this.showJoints) {
            ctx.fillStyle = this.accentColor;

            if (this.legJointStyle === "organic") {
                // Organic: soft rounded joints
                for (let joint of joints) {
                    ctx.beginPath();
                    ctx.arc(joint.x, joint.y, effectiveThickness * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (this.legJointStyle === "angular") {
                // Angular: square joints
                for (let joint of joints) {
                    const size = effectiveThickness * 0.7;
                    ctx.fillRect(joint.x - size / 2, joint.y - size / 2, size, size);
                }
            } else {
                // Smooth: default circular joints
                for (let joint of joints) {
                    ctx.beginPath();
                    ctx.arc(joint.x, joint.y, effectiveThickness * 0.55, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    _drawLegTip(ctx, x, y, thickness, leg) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
    
        // Feet face forward along the body direction, with outward splay
        // footAngleOffset: positive = more outward splay (default 15 degrees)
        const footSplayDeg = (this.footAngleOffset !== undefined ? this.footAngleOffset : 15);
        const footSplayRad = footSplayDeg * Math.PI / 180;
        // Left legs (side=-1) splay left (negative), right legs (side=1) splay right (positive)
        const footAngle = this.gameObject.angle * Math.PI / 180 + footSplayRad * leg.side;
    
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(footSplayRad * leg.side);

        // Use footColor if set, otherwise fall back to accentColor
        const footColor = this.footColor && this.footColor.length > 0 ? this.footColor : this.accentColor;
        ctx.fillStyle = footColor;

        switch (this.legTipShape) {
            case "claw":
                // Three-pronged claw
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(thickness * 2, -thickness);
                ctx.lineTo(thickness * 1.5, 0);
                ctx.lineTo(thickness * 2, thickness);
                ctx.closePath();
                ctx.fill();
                break;

            case "pad":
                // Oval pad (like animal paw pad)
                ctx.beginPath();
                ctx.ellipse(thickness * 0.5, 0, thickness * 1.5, thickness, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "hoof":
                // Horse/deer hoof - rounded rectangular shape
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, -thickness * 0.8);
                ctx.lineTo(thickness * 1.5, -thickness * 0.6);
                ctx.quadraticCurveTo(thickness * 2, 0, thickness * 1.5, thickness * 0.6);
                ctx.lineTo(-thickness * 0.3, thickness * 0.8);
                ctx.quadraticCurveTo(-thickness * 0.5, 0, -thickness * 0.3, -thickness * 0.8);
                ctx.closePath();
                ctx.fill();
                // Hoof highlight
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.ellipse(thickness * 0.8, -thickness * 0.2, thickness * 0.5, thickness * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "spike":
                // Sharp pointed spike/thorn
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.5, -thickness * 0.5);
                ctx.lineTo(thickness * 2.5, 0);
                ctx.lineTo(-thickness * 0.5, thickness * 0.5);
                ctx.closePath();
                ctx.fill();
                break;

            case "webbed":
                // Webbed foot (like duck/frog)
                // Draw three toes with webbing between
                ctx.beginPath();
                // Main pad
                ctx.arc(0, 0, thickness * 0.8, 0, Math.PI * 2);
                ctx.fill();
                // Webbed toes
                ctx.fillStyle = footColor;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(thickness * 2, -thickness * 1.2);
                ctx.lineTo(thickness * 2.2, 0);
                ctx.lineTo(thickness * 2, thickness * 1.2);
                ctx.closePath();
                ctx.fill();
                // Webbing membrane (slightly transparent)
                ctx.fillStyle = this._adjustColorAlpha(footColor, 0.5);
                ctx.beginPath();
                ctx.moveTo(thickness * 0.5, 0);
                ctx.lineTo(thickness * 1.8, -thickness * 0.8);
                ctx.lineTo(thickness * 1.8, thickness * 0.8);
                ctx.closePath();
                ctx.fill();
                break;

            case "suction":
                // Suction cup (like octopus/gecko)
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 1.3, 0, Math.PI * 2);
                ctx.fill();
                // Inner suction ring
                ctx.strokeStyle = this._adjustColorBrightness(footColor, -30);
                ctx.lineWidth = thickness * 0.3;
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case "pincer":
                // Crab/scorpion pincer foot
                ctx.beginPath();
                // Upper claw
                ctx.moveTo(-thickness * 0.3, -thickness * 0.3);
                ctx.quadraticCurveTo(thickness * 1.5, -thickness * 0.8, thickness * 2, -thickness * 0.2);
                ctx.quadraticCurveTo(thickness * 1.8, 0, thickness * 1.2, 0);
                // Lower claw
                ctx.quadraticCurveTo(thickness * 1.8, 0, thickness * 2, thickness * 0.2);
                ctx.quadraticCurveTo(thickness * 1.5, thickness * 0.8, -thickness * 0.3, thickness * 0.3);
                ctx.closePath();
                ctx.fill();
                break;

            case "talon":
                // Bird talon - long curved claw
                const talonLen = thickness * 2.5;
                ctx.beginPath();
                ctx.moveTo(-thickness * 0.3, 0);
                // Main curved talon
                ctx.quadraticCurveTo(thickness * 0.5, -thickness * 0.8, talonLen, -thickness * 0.3);
                ctx.quadraticCurveTo(talonLen + thickness * 0.3, 0, talonLen, thickness * 0.3);
                ctx.quadraticCurveTo(thickness * 0.5, thickness * 0.8, -thickness * 0.3, 0);
                ctx.fill();
                // Sharp tip highlight
                ctx.fillStyle = this._adjustColorBrightness(footColor, 30);
                ctx.beginPath();
                ctx.arc(talonLen * 0.9, 0, thickness * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "boot":
                // Cartoon boot/shoe foot
                ctx.beginPath();
                // Sole
                ctx.moveTo(-thickness * 0.5, thickness * 0.6);
                ctx.lineTo(thickness * 2, thickness * 0.6);
                ctx.quadraticCurveTo(thickness * 2.3, 0, thickness * 2, -thickness * 0.3);
                // Top of boot
                ctx.lineTo(-thickness * 0.5, -thickness * 0.3);
                ctx.lineTo(-thickness * 0.5, thickness * 0.6);
                ctx.closePath();
                ctx.fill();
                // Boot sole (darker)
                ctx.fillStyle = this._adjustColorBrightness(footColor, -40);
                ctx.beginPath();
                ctx.rect(-thickness * 0.5, thickness * 0.3, thickness * 2.5, thickness * 0.4);
                ctx.fill();
                break;

            default: // "circle"
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 1.2, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }

    // Helper to adjust color brightness
    _adjustColorBrightness(color, amount) {
        if (!color || color.length < 4) return color;
        // Parse hex color
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            }
        } else {
            return color;
        }
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        return `rgb(${r},${g},${b})`;
    }

    // Helper to adjust color alpha
    _adjustColorAlpha(color, alpha) {
        if (!color || color.length < 4) return color;
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            }
        } else {
            return color;
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    _solveLegIK(startX, startY, endX, endY, segmentCount, style = "smooth", nominalLength = 0, bendDirection = 1, bendStrength = 1.0, is25DMode = false) {
        const joints = [];

        if (segmentCount <= 1) {
            return joints;
        }

        // Straight-line distance
        const totalDist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

        // Helper: unit direction from A to B
        const dirX = totalDist > 0 ? (endX - startX) / totalDist : 1;
        const dirY = totalDist > 0 ? (endY - startY) / totalDist : 0;

        // Perpendicular (to introduce bends) - always bend outward from body
        // In 2.5D mode, perpendicular should primarily be horizontal (X axis)
        let perpX, perpY;
        if (is25DMode) {
            // In 2.5D mode, bend primarily in the X direction (horizontal)
            // This makes legs bend outward from the body horizontally
            perpX = bendDirection;
            perpY = 0;
        } else {
            perpX = -dirY * bendDirection;
            perpY = dirX * bendDirection;
        }

        // Calculate how much the leg is stretched (0 = fully compressed, 1 = fully extended)
        const maxReach = nominalLength > 0 ? nominalLength : totalDist;
        const stretchRatio = Math.min(1, totalDist / maxReach);
        
        // More bend when leg is compressed, less when extended
        // This creates natural-looking leg motion
        // Apply bend strength multiplier
        const compressionBend = (1 - stretchRatio) * bendStrength;

        if (style === "angular") {
            // Arthropod-style legs: distinct bend at each joint
            // First joint (hip) bends outward, second joint (knee) bends back
            const baseBendAmount = Math.min(Math.max(nominalLength * 0.3, 8), 50);
            
            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                
                // In 2.5D mode, use different interpolation for more natural leg poses
                let baseX, baseY;
                if (is25DMode) {
                    // For 2.5D, use quadratic easing - joints closer to body at top
                    // First joint high, later joints progress down toward foot
                    const tEased = t * t; // Quadratic ease - more spacing near foot
                    baseX = startX + (endX - startX) * t; // Linear X interpolation
                    baseY = startY + (endY - startY) * tEased; // Eased Y - stays high longer
                } else {
                    baseX = startX + dirX * totalDist * t;
                    baseY = startY + dirY * totalDist * t;
                }

                // Alternate bend direction for each joint to create zigzag pattern
                // First joint bends strongly outward, subsequent joints bend less
                let bendMultiplier;
                if (i === 1) {
                    // First joint (hip) - strong outward bend
                    bendMultiplier = 1.0;
                } else if (i === 2) {
                    // Second joint (knee) - bend back slightly
                    bendMultiplier = -0.3;
                } else {
                    // Additional joints - small alternating bends
                    bendMultiplier = (i % 2 === 0 ? -0.2 : 0.2);
                }
                
                // More bend when compressed
                const dynamicBend = baseBendAmount * (0.3 + compressionBend * 0.7);
                const offset = dynamicBend * bendMultiplier;

                joints.push({
                    x: baseX + perpX * offset,
                    y: baseY + perpY * offset
                });
            }
        } else if (style === "organic") {
            // Smooth curved legs like insect/spider legs
            // Creates a natural arc that increases with compression
            const baseBendAmount = Math.min(nominalLength * 0.2, 30);
            
            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                
                let baseX, baseY;
                if (is25DMode) {
                    // For 2.5D organic style, smooth curve from body down to foot
                    const tt = t * t * (3 - 2 * t); // Smooth step for Y
                    baseX = startX + (endX - startX) * t;
                    baseY = startY + (endY - startY) * tt;
                } else {
                    // Use smooth interpolation
                    const tt = t * t * (3 - 2 * t);
                    baseX = startX + dirX * totalDist * tt;
                    baseY = startY + dirY * totalDist * tt;
                }

                // Sine curve creates natural arc - peaks in the middle
                const arcFactor = Math.sin(Math.PI * t);
                // Stronger bend when compressed
                const dynamicBend = baseBendAmount * (0.4 + compressionBend * 0.6);
                const offset = dynamicBend * arcFactor;

                joints.push({
                    x: baseX + perpX * offset,
                    y: baseY + perpY * offset
                });
            }
        } else {
            // "smooth" (default) - natural looking with subtle bend
            // Creates a slight outward curve that looks natural for walking creatures
            const baseBendAmount = Math.min(nominalLength * 0.15, 20);
            
            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                
                let baseX, baseY;
                if (is25DMode) {
                    // For 2.5D smooth style, gentle curve down to foot
                    const tEased = t * (2 - t); // Quadratic ease out - faster at start
                    baseX = startX + (endX - startX) * t;
                    baseY = startY + (endY - startY) * tEased;
                } else {
                    baseX = startX + dirX * totalDist * t;
                    baseY = startY + dirY * totalDist * t;
                }

                // Subtle arc - strongest in middle of leg
                const arcFactor = Math.sin(Math.PI * t);
                const dynamicBend = baseBendAmount * (0.2 + compressionBend * 0.8);
                const offset = dynamicBend * arcFactor;

                joints.push({
                    x: baseX + perpX * offset,
                    y: baseY + perpY * offset
                });
            }
        }

        return joints;
    }

    _drawSegment(ctx, index) {
        const segment = this._segments[index];
        const taperFactor = 1 - (index / this._segments.length) * this.tailTaper;
        let width = this.bodyWidth * taperFactor;

        // Calculate breathing scale modifier
        let breathingScale = 1.0;
        if (this.breathingEnabled && !this.isDead) {
            const segmentPhaseOffset = this.breathingAsync ? (index / this._segments.length) * Math.PI * 0.5 : 0;
            breathingScale = 1.0 + Math.sin(this._breathingPhase + segmentPhaseOffset) * this.breathingAmount;
        }

        // Calculate height offset for isometric view (this stays local)
        const isometricRad = this.isometricAngle * Math.PI / 180;
        let isoHeightOffset = -Math.sin(isometricRad) * this.bodyHeight;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Convert world position to local space
        const dx = segment.worldPos.x - worldPos.x;
        const dy = segment.worldPos.y - worldPos.y;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Get world-relative 2.5D elevation offset
        const elevationOffset = this._get25DElevationOffset(this.bodyElevation);

        // Get depth parallax offset (body segments decrease in height toward tail)
        // First segment (head) has highest depth, last segment is lower
        const segmentHeightFactor = this.bodyHeightDepth * (1 - (index / Math.max(1, this._segments.length)) * 0.4);
        const depthOffset = this._getDepthOffset(segmentHeightFactor);

        ctx.save();
        ctx.translate(
            localX + elevationOffset.x + depthOffset.x, 
            localY + isoHeightOffset + elevationOffset.y + depthOffset.y
        );
        ctx.rotate(segment.angle - bodyAngle);

        // Worm dig visibility — fade this segment in/out
        let wormAlpha = 1;
        if (this.wormDigEnabled && this._wormSegmentVisibility && index < this._wormSegmentVisibility.length) {
            wormAlpha = this._wormSegmentVisibility[index];
            if (wormAlpha < 0.01) { ctx.restore(); return; }
            if (wormAlpha < 0.99) ctx.globalAlpha = wormAlpha;
        }

        if (breathingScale !== 1.0) {
            ctx.scale(breathingScale, breathingScale);
        }

        // Use cached segment canvas if available
        const cache = this._segmentCaches[index];
        if (cache && cache.canvas) {
            ctx.drawImage(cache.canvas, -cache.originX, -cache.originY);
        } else {
            // Fallback: draw directly (should rarely happen)
            this._drawSegmentDirect(ctx, width);
        }

        ctx.restore();
    }

    /** Draw segment shape + spines directly to a context (used for caching and fallback) */
    _drawSegmentDirect(ctx, width) {
        const taperFactor = width / this.bodyWidth;

        ctx.fillStyle = this.bodyColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;

        switch (this.bodyShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(0, 0, width * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case "rectangle":
                ctx.fillRect(-this.segmentLength * 0.4, -width * 0.5, this.segmentLength * 0.8, width);
                ctx.strokeRect(-this.segmentLength * 0.4, -width * 0.5, this.segmentLength * 0.8, width);
                break;
            case "triangle":
                ctx.beginPath();
                ctx.moveTo(this.segmentLength * 0.4, 0);
                ctx.lineTo(-this.segmentLength * 0.4, -width * 0.5);
                ctx.lineTo(-this.segmentLength * 0.4, width * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            default: // ellipse
                ctx.beginPath();
                ctx.ellipse(0, 0, this.segmentLength * 0.6 * this.bodyScaleX,
                    width * 0.5 * this.bodyScaleY, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }

        this._drawSpinePattern(ctx, width, taperFactor);
    }

    _drawSpinePattern(ctx, width, taperFactor) {
        if (this.spinePattern === "none") return;

        const spineSize = this.spineSize * taperFactor;
        ctx.fillStyle = this.spineColor;

        switch (this.spinePattern) {
            case "spikes":
                for (let i = 0; i < this.spineCount; i++) {
                    const normalizedPos = i / this.spineCount;
                    let x, yTop, yBottom;

                    // Position spikes based on body shape
                    switch (this.bodyShape) {
                        case "circle":
                            const circleAngle = normalizedPos * Math.PI * 2;
                            const radius = width * 0.5;
                            x = Math.cos(circleAngle) * radius * 0.7;
                            yTop = -Math.sin(circleAngle) * radius;
                            yBottom = Math.sin(circleAngle) * radius;
                            break;

                        case "triangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5 * (1 - normalizedPos * 0.5);
                            yBottom = width * 0.5 * (1 - normalizedPos * 0.5);
                            break;

                        case "rectangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5;
                            yBottom = width * 0.5;
                            break;

                        default: // ellipse
                            x = (normalizedPos - 0.5) * this.segmentLength * this.bodyScaleX;
                            const ellipseY = Math.sqrt(Math.max(0, 1 - (x / (this.segmentLength * 0.6 * this.bodyScaleX)) ** 2));
                            yTop = -ellipseY * width * 0.5 * this.bodyScaleY;
                            yBottom = ellipseY * width * 0.5 * this.bodyScaleY;
                    }

                    // Top spike
                    ctx.beginPath();
                    ctx.moveTo(x, yTop);
                    ctx.lineTo(x - spineSize * 0.15, yTop - spineSize);
                    ctx.lineTo(x + spineSize * 0.15, yTop - spineSize * 0.8);
                    ctx.closePath();
                    ctx.fill();

                    // Bottom spike
                    ctx.beginPath();
                    ctx.moveTo(x, yBottom);
                    ctx.lineTo(x - spineSize * 0.15, yBottom + spineSize);
                    ctx.lineTo(x + spineSize * 0.15, yBottom + spineSize * 0.8);
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case "plates":
                for (let i = 0; i < this.spineCount; i++) {
                    const normalizedPos = i / this.spineCount;
                    let x, yTop, yBottom;

                    // Position plates based on body shape
                    switch (this.bodyShape) {
                        case "circle":
                            const circleAngle = normalizedPos * Math.PI * 2;
                            const radius = width * 0.5;
                            x = Math.cos(circleAngle) * radius * 0.7;
                            yTop = -Math.sin(circleAngle) * radius;
                            yBottom = Math.sin(circleAngle) * radius;
                            break;

                        case "triangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5 * (1 - normalizedPos * 0.5);
                            yBottom = width * 0.5 * (1 - normalizedPos * 0.5);
                            break;

                        case "rectangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5;
                            yBottom = width * 0.5;
                            break;

                        default: // ellipse
                            x = (normalizedPos - 0.5) * this.segmentLength * this.bodyScaleX;
                            const ellipseY = Math.sqrt(Math.max(0, 1 - (x / (this.segmentLength * 0.6 * this.bodyScaleX)) ** 2));
                            yTop = -ellipseY * width * 0.5 * this.bodyScaleY;
                            yBottom = ellipseY * width * 0.5 * this.bodyScaleY;
                    }

                    // Top plate
                    ctx.beginPath();
                    ctx.ellipse(x, yTop - spineSize * 0.3, spineSize * 0.5, spineSize * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Bottom plate
                    ctx.beginPath();
                    ctx.ellipse(x, yBottom + spineSize * 0.3, spineSize * 0.5, spineSize * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    }

    _drawHead(ctx) {
        const head = this._segments[0];

        // Calculate height offset for isometric view (stays local)
        const isometricRad = this.isometricAngle * Math.PI / 180;
        let isoHeightOffset = -Math.sin(isometricRad) * this.bodyHeight;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Apply headbutt offset if headbutting
        let headbuttOffsetX = 0;
        let headbuttOffsetY = 0;
        if (this._isHeadbutting && this._headbuttOffset) {
            headbuttOffsetX = Math.cos(this._headbuttAngle) * this._headbuttOffset;
            headbuttOffsetY = Math.sin(this._headbuttAngle) * this._headbuttOffset;
        }

        // Convert world position to local space
        const dx = head.worldPos.x + headbuttOffsetX - worldPos.x;
        const dy = head.worldPos.y + headbuttOffsetY - worldPos.y;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Get world-relative 2.5D elevation offset
        const elevationOffset = this._get25DElevationOffset(this.bodyElevation);

        // Get depth parallax offset (head is highest - most offset)
        const depthOffset = this._getDepthOffset(this.headHeight);

        ctx.save();
        ctx.translate(
            localX + elevationOffset.x + depthOffset.x, 
            localY + isoHeightOffset + elevationOffset.y + depthOffset.y
        );
        ctx.rotate(head.angle - bodyAngle + this._headAngle);

        // Worm dig — head visibility
        let wormHeadAlpha = 1;
        if (this.wormDigEnabled && this._wormSegmentVisibility && this._wormSegmentVisibility.length > 0) {
            wormHeadAlpha = this._wormSegmentVisibility[0];
            if (wormHeadAlpha < 0.01) { ctx.restore(); return; }
            if (wormHeadAlpha < 0.99) ctx.globalAlpha = wormHeadAlpha;
        }

        // Ponytail / long hair are DYNAMIC (physics-driven) — always draw live
        if (this.hairStyle === "ponytail" || this.hairStyle === "long") {
            this._drawHairStyle(ctx);
        }

        // Squid tentacles are DYNAMIC (physics-driven) — draw in head-local space
        if (this.mouthStyle === "squidTentacles") {
            this._drawMouthTentacles(ctx);
        }

        // Use cached head canvas for all static parts
        const cache = this._headCache;
        if (cache && cache.canvas) {
            ctx.drawImage(cache.canvas, -cache.originX, -cache.originY);
        } else {
            // Fallback: draw directly
            this._drawHeadDirect(ctx);
        }

        ctx.restore();
    }

    /** Draw all static head parts directly to a context (used for caching and fallback) */
    _drawHeadDirect(ctx) {
        // Draw antennae behind head
        if (this.antennaCount > 0) {
            this._drawAntennae(ctx);
        }

        // Draw mandibles behind head (legacy option)
        if (this.mandibles) {
            this._drawMandibles(ctx);
        }

        // Draw advanced mouth styles (non-physics-driven ones)
        // Note: squidTentacles are drawn separately in world space
        if (this.mouthStyle !== "none" && this.mouthStyle !== "squidTentacles") {
            this._drawMouth(ctx);
        }

        // Head shape
        ctx.fillStyle = this.bodyColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        switch (this.headShape) {
            case "triangle":
                ctx.moveTo(this.headSize * 0.8, 0);
                ctx.lineTo(-this.headSize * 0.4, -this.headSize * 0.5);
                ctx.lineTo(-this.headSize * 0.4, this.headSize * 0.5);
                ctx.closePath();
                break;

            case "rectangle":
                ctx.rect(-this.headSize * 0.5, -this.headSize * 0.4, this.headSize, this.headSize * 0.8);
                break;

            case "diamond":
                ctx.moveTo(this.headSize * 0.6, 0);
                ctx.lineTo(0, -this.headSize * 0.5);
                ctx.lineTo(-this.headSize * 0.6, 0);
                ctx.lineTo(0, this.headSize * 0.5);
                ctx.closePath();
                break;

            case "human":
                // Human head: front is narrower, back is ~25% wider (teardrop-ish but more rounded)
                // Top-down view: front is +X direction, back is -X
                {
                    const frontW = this.headSize * 0.4;  // Narrower front (chin area)
                    const backW = this.headSize * 0.5;   // Wider back (back of skull)
                    const len = this.headSize * 0.7;     // Length from front to back
                    
                    ctx.moveTo(len * 0.8, 0); // Front point (slightly pointed chin)
                    // Right side curve (top in screen space, -Y)
                    ctx.bezierCurveTo(
                        len * 0.5, -frontW,      // Control near front
                        -len * 0.2, -backW,      // Control near back
                        -len * 0.6, -backW * 0.6 // Back corner
                    );
                    // Back curve (rounded back of head)
                    ctx.bezierCurveTo(
                        -len * 0.8, -backW * 0.3,
                        -len * 0.8, backW * 0.3,
                        -len * 0.6, backW * 0.6
                    );
                    // Left side curve (bottom in screen space, +Y)
                    ctx.bezierCurveTo(
                        -len * 0.2, backW,
                        len * 0.5, frontW,
                        len * 0.8, 0
                    );
                    ctx.closePath();
                }
                break;

            case "alien":
                // Alien head: small face, very large bulbous cranium at back (big brain look)
                // Top-down view: front is +X direction
                {
                    const faceW = this.headSize * 0.3;   // Narrow face
                    const brainW = this.headSize * 0.65; // Very wide brain
                    const faceLen = this.headSize * 0.4; // Short face length
                    const brainLen = this.headSize * 0.8; // Long brain bulge
                    
                    ctx.moveTo(faceLen * 0.9, 0); // Pointy chin
                    // Right side - face to brain transition (-Y side)
                    ctx.bezierCurveTo(
                        faceLen * 0.6, -faceW * 0.8,   // Face curve
                        faceLen * 0.1, -faceW * 1.2,   // Transition
                        -faceLen * 0.3, -brainW * 0.9  // Brain start
                    );
                    // Large brain bulge on right
                    ctx.bezierCurveTo(
                        -brainLen * 0.6, -brainW * 1.1,  // Brain peak
                        -brainLen * 0.9, -brainW * 0.7,  // Back of brain
                        -brainLen * 0.85, 0              // Center back
                    );
                    // Large brain bulge on left (+Y side)
                    ctx.bezierCurveTo(
                        -brainLen * 0.9, brainW * 0.7,
                        -brainLen * 0.6, brainW * 1.1,
                        -faceLen * 0.3, brainW * 0.9
                    );
                    // Left side - brain to face transition
                    ctx.bezierCurveTo(
                        faceLen * 0.1, faceW * 1.2,
                        faceLen * 0.6, faceW * 0.8,
                        faceLen * 0.9, 0
                    );
                    ctx.closePath();
                }
                break;

            case "bulbous":
                // Bulbous head: large rounded head with a gentle point at the back
                // Think of a cartoon alien or big-brained creature from the side
                // Top-down view: front is +X direction, back tapers to a rounded point
                {
                    const frontW = this.headSize * 0.55;  // Wide front/sides
                    const backPointW = this.headSize * 0.15; // Narrow back point
                    const len = this.headSize * 0.8;      // Length from front to back
                    
                    ctx.moveTo(len * 0.6, 0); // Front center (slightly forward)
                    // Right side bulge (-Y side) - big rounded curve
                    ctx.bezierCurveTo(
                        len * 0.5, -frontW * 0.9,     // Wide front curve
                        len * 0.1, -frontW * 1.0,    // Maximum width point
                        -len * 0.3, -frontW * 0.7    // Start narrowing
                    );
                    // Transition to back point on right
                    ctx.bezierCurveTo(
                        -len * 0.6, -frontW * 0.4,   // Narrowing
                        -len * 0.85, -backPointW * 0.8, // Near the point
                        -len * 0.9, 0                 // Back point center
                    );
                    // Left side (+Y side) - mirror of right
                    ctx.bezierCurveTo(
                        -len * 0.85, backPointW * 0.8,
                        -len * 0.6, frontW * 0.4,
                        -len * 0.3, frontW * 0.7
                    );
                    // Back to front on left side
                    ctx.bezierCurveTo(
                        len * 0.1, frontW * 1.0,
                        len * 0.5, frontW * 0.9,
                        len * 0.6, 0
                    );
                    ctx.closePath();
                }
                break;

            case "custom":
                // Custom adjustable head shape
                // User can control front/back width and curve independently
                {
                    const frontW = this.headSize * this.customHeadFrontWidth;
                    const backW = this.headSize * this.customHeadBackWidth;
                    const len = this.headSize * 0.7 * this.customHeadLength; // Apply length multiplier
                    const frontCurve = this.customHeadFrontCurve; // 0 = pointed, 1 = rounded
                    const backCurve = this.customHeadBackCurve; // 0 = pointed, 1 = rounded
                    
                    // Front point position stays relatively fixed (base headSize)
                    const baseFrontLen = this.headSize * 0.7;
                    const frontExtend = baseFrontLen * (0.9 - frontCurve * 0.3);
                    // Back point position extends based on length multiplier
                    const backExtend = len * (0.7 - backCurve * 0.3);
                    
                    ctx.moveTo(frontExtend, 0); // Front tip
                    
                    // Right side (-Y) - front to back
                    // Control point offset determines curve tightness
                    const frontCtrlOffset = frontW * (0.3 + frontCurve * 0.7);
                    const backCtrlOffset = backW * (0.3 + backCurve * 0.7);
                    
                    ctx.bezierCurveTo(
                        frontExtend * 0.6, -frontCtrlOffset,   // Front curve control
                        -backExtend * 0.3, -backW,             // Mid control
                        -backExtend * 0.6, -backW * 0.8        // Approach back
                    );
                    
                    // Back curve (smoothness determines roundness)
                    const backRound = backCurve * 0.4;
                    ctx.bezierCurveTo(
                        -backExtend * (0.8 + backRound), -backW * (0.5 - backRound * 0.3),
                        -backExtend * (0.8 + backRound), backW * (0.5 - backRound * 0.3),
                        -backExtend * 0.6, backW * 0.8
                    );
                    
                    // Left side (+Y) - back to front
                    ctx.bezierCurveTo(
                        -backExtend * 0.3, backW,
                        frontExtend * 0.6, frontCtrlOffset,
                        frontExtend, 0
                    );
                    ctx.closePath();
                }
                break;

            case "circle":
                // Perfect circle head (same radius in all directions)
                ctx.arc(0, 0, this.headSize * 0.5, 0, Math.PI * 2);
                break;

            default: // ellipse
                ctx.ellipse(0, 0, this.headSize * 0.7, this.headSize * 0.5, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Eyes (with optional stalks/extrusion)
        if (this.showEyes && this.eyeCount > 0) {
            const baseEyeSize = this.headSize * 0.15 * (this.eyeSize || 1.0);
            const extrudeDist = this.eyeExtrudeDistance || 0;
            const extrudeThick = this.eyeExtrudeThickness || 2;
            const eyeStyle = this.eyeStyle || "round";
            const showPupil = this.showPupil !== false; // Default true
            const pupilSizeRatio = this.pupilSize || 0.45;
            const pupilColor = this.pupilColor || "#111111";

            const eyePositions = [];
            if (this.eyeCount === 1) {
                eyePositions.push({ x: this.headSize * 0.3, y: 0 });
            } else if (this.eyeCount === 2) {
                const eyeSpacing = this.headSize * 0.3;
                eyePositions.push({ x: this.headSize * 0.3, y: -eyeSpacing * 0.5 });
                eyePositions.push({ x: this.headSize * 0.3, y: eyeSpacing * 0.5 });
            } else {
                for (let i = 0; i < this.eyeCount; i++) {
                    const angle = (i / (this.eyeCount - 1) - 0.5) * Math.PI * 0.8;
                    eyePositions.push({
                        x: this.headSize * 0.4 * Math.cos(angle),
                        y: this.headSize * 0.4 * Math.sin(angle)
                    });
                }
            }

            for (const ep of eyePositions) {
                const dirLen = Math.sqrt(ep.x * ep.x + ep.y * ep.y);
                const dirX = dirLen > 0.01 ? ep.x / dirLen : 1;
                const dirY = dirLen > 0.01 ? ep.y / dirLen : 0;

                const finalEyeX = ep.x + dirX * extrudeDist;
                const finalEyeY = ep.y + dirY * extrudeDist;
                const sz = this.eyeCount <= 2 ? baseEyeSize : baseEyeSize * 0.8;

                // Draw eye stalk if extruded
                if (extrudeDist > 0) {
                    ctx.strokeStyle = this.bodyColor;
                    ctx.lineWidth = extrudeThick;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(ep.x, ep.y);
                    ctx.lineTo(finalEyeX, finalEyeY);
                    ctx.stroke();

                    ctx.fillStyle = this.bodyColor;
                    ctx.beginPath();
                    ctx.arc(finalEyeX, finalEyeY, sz * 1.3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw eye based on style
                ctx.fillStyle = this.eyeColor;
                
                switch (eyeStyle) {
                    case "oval":
                        // Vertical oval eye
                        ctx.beginPath();
                        ctx.ellipse(finalEyeX, finalEyeY, sz * 0.7, sz, 0, 0, Math.PI * 2);
                        ctx.fill();
                        break;

                    case "slit":
                        // Reptilian slit eye
                        ctx.beginPath();
                        ctx.ellipse(finalEyeX, finalEyeY, sz, sz * 0.6, 0, 0, Math.PI * 2);
                        ctx.fill();
                        // Slit pupil is always shown for this style
                        ctx.fillStyle = pupilColor;
                        ctx.beginPath();
                        ctx.ellipse(finalEyeX + sz * 0.1, finalEyeY, sz * 0.15, sz * 0.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        continue; // Skip normal pupil

                    case "compound":
                        // Insect compound eye (cluster of small hexagons)
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz, 0, Math.PI * 2);
                        ctx.fill();
                        // Draw facets
                        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                        ctx.lineWidth = 0.5;
                        const facetSize = sz * 0.35;
                        for (let fx = -1; fx <= 1; fx++) {
                            for (let fy = -1; fy <= 1; fy++) {
                                if (fx * fx + fy * fy > 1.5) continue;
                                ctx.beginPath();
                                ctx.arc(finalEyeX + fx * facetSize, finalEyeY + fy * facetSize, facetSize * 0.5, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                        }
                        continue; // No pupil for compound eyes

                    case "glowing":
                        // Glowing eye with outer glow
                        ctx.shadowColor = this.eyeColor;
                        ctx.shadowBlur = sz * 0.8;
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        // Inner bright core
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                        continue; // No separate pupil

                    case "dot":
                        // Simple dot eye (no sclera, just pupil)
                        ctx.fillStyle = pupilColor;
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                        continue; // It IS the pupil

                    case "angry":
                        // Angry eye with angled top
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz, 0, Math.PI * 2);
                        ctx.fill();
                        // Draw angry brow/lid
                        ctx.fillStyle = this.bodyColor;
                        ctx.beginPath();
                        ctx.moveTo(finalEyeX - sz * 1.2, finalEyeY - sz * 0.3);
                        ctx.lineTo(finalEyeX + sz * 0.8, finalEyeY - sz * 1.0);
                        ctx.lineTo(finalEyeX + sz * 1.2, finalEyeY - sz * 0.5);
                        ctx.lineTo(finalEyeX - sz * 0.8, finalEyeY + sz * 0.2);
                        ctx.closePath();
                        ctx.fill();
                        break;

                    case "cute":
                        // Large cute eye with highlight
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz * 1.2, 0, Math.PI * 2);
                        ctx.fill();
                        // Large pupil
                        if (showPupil) {
                            ctx.fillStyle = pupilColor;
                            ctx.beginPath();
                            ctx.arc(finalEyeX + sz * 0.15, finalEyeY, sz * 0.7, 0, Math.PI * 2);
                            ctx.fill();
                            // Highlight
                            ctx.fillStyle = '#ffffff';
                            ctx.beginPath();
                            ctx.arc(finalEyeX + sz * 0.4, finalEyeY - sz * 0.3, sz * 0.25, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        continue;

                    default: // "round"
                        ctx.beginPath();
                        ctx.arc(finalEyeX, finalEyeY, sz, 0, Math.PI * 2);
                        ctx.fill();
                }

                // Draw pupil (for styles that use it)
                if (showPupil) {
                    ctx.fillStyle = pupilColor;
                    ctx.beginPath();
                    ctx.arc(finalEyeX + sz * 0.2, finalEyeY, sz * pupilSizeRatio, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw hair styles that go on top/front (non-ponytail, non-long)
        if (this.hairStyle !== "ponytail" && this.hairStyle !== "long" && this.hairStyle !== "none") {
            this._drawHairStyle(ctx);
        }

        // Draw head accessories on top
        this._drawHeadAccessory(ctx);
    }

    _drawHairStyle(ctx) {
        if (this.hairStyle === "none") return;

        ctx.strokeStyle = this.hairColor;
        ctx.fillStyle = this.hairColor;
        ctx.lineWidth = this.hairThickness;
        ctx.lineCap = 'round';

        switch (this.hairStyle) {
            case "spiky":
                // Multiple spiky hair strands radiating from back of head (top-down view)
                for (let i = 0; i < this.hairCount; i++) {
                    // Spread spikes around the back of the head (Math.PI is back direction)
                    const angle = Math.PI - Math.PI / 4 + (i / (this.hairCount - 1)) * (Math.PI / 2);
                    const baseRadius = this.headSize * 0.4;
                    const baseX = Math.cos(angle) * baseRadius;
                    const baseY = Math.sin(angle) * baseRadius;

                    // Spikes point outward from the base position
                    const endX = baseX + Math.cos(angle) * this.hairLength;
                    const endY = baseY + Math.sin(angle) * this.hairLength;

                    ctx.beginPath();
                    ctx.moveTo(baseX, baseY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                break;

            case "ponytail": {
                // Draw ponytail using per-segment physics chain (world space → local space)
                const chain = this._ponytailChain;
                if (!chain || chain.length === 0) break;

                const head = this._segments[0];
                const worldPos = this.gameObject.getWorldPosition();
                const bodyAngle = this.gameObject.angle * Math.PI / 180;
                const headWorldAngle = head.angle + this._headAngle;

                // We're inside ctx already translated/rotated for the head.
                // We need to convert chain world positions into the head-local coordinate system.
                // Head local transform: translate to head worldPos, rotate by headWorldAngle.
                // So to convert world → head-local: subtract headWorldPos, un-rotate by headWorldAngle.
                const headWorldX = head.worldPos.x;
                const headWorldY = head.worldPos.y;
                const cosH = Math.cos(-headWorldAngle);
                const sinH = Math.sin(-headWorldAngle);

                const segCount = chain.length;
                const baseThick = this.ponytailThickness || 4;
                const taper = this.ponytailTaper || 0.7;
                const accentColor = this.ponytailAccentColor || this.hairColor;

                // Root position in local space (back of head)
                const rootLocalX = -this.headSize * 0.5;
                const rootLocalY = 0;

                // Convert chain to local-space positions
                const localPositions = [{ x: rootLocalX, y: rootLocalY }];
                for (let i = 0; i < segCount; i++) {
                    const dx = chain[i].x - headWorldX;
                    const dy = chain[i].y - headWorldY;
                    localPositions.push({
                        x: dx * cosH - dy * sinH,
                        y: dx * sinH + dy * cosH
                    });
                }

                // Draw tapered segments from thick (root) to thin (tip)
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                for (let i = 0; i < segCount; i++) {
                    const t = i / segCount; // 0 at root, approaches 1 at tip
                    const thickness = baseThick * (1 - t * taper);
                    const useAccent = (i % 2 === 1);

                    ctx.strokeStyle = useAccent ? accentColor : this.hairColor;
                    ctx.lineWidth = Math.max(1, thickness);

                    ctx.beginPath();
                    ctx.moveTo(localPositions[i].x, localPositions[i].y);
                    ctx.lineTo(localPositions[i + 1].x, localPositions[i + 1].y);
                    ctx.stroke();
                }

                // Tip dot
                const tipPos = localPositions[localPositions.length - 1];
                const tipThick = baseThick * (1 - taper) * 0.8;
                ctx.fillStyle = this.hairColor;
                ctx.beginPath();
                ctx.arc(tipPos.x, tipPos.y, Math.max(1, tipThick * 0.5), 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "mohawk":
                // Center row of spikes along the top of the head (perpendicular to facing direction)
                // In top-down view, spikes should point upward in screen space (negative Y)
                for (let i = 0; i < this.hairCount; i++) {
                    const t = i / (this.hairCount - 1);
                    // Position along the head from back to front (X axis)
                    const xPos = (t - 0.5) * this.headSize;
                    const yPos = 0; // Center line of head

                    const spikeHeight = this.hairLength * (1 - Math.abs(t - 0.5) * 0.5);

                    ctx.beginPath();
                    ctx.moveTo(xPos, yPos);
                    // Spikes point perpendicular to the body (sideways in top-down)
                    ctx.lineTo(xPos, yPos - spikeHeight);
                    ctx.stroke();
                }
                break;

            case "long":
                // Long flowing hair on sides (in top-down view, sides are +/- Y direction)
                const backX = -this.headSize * 0.3; // Slightly toward back of head
                const topSideY = -this.headSize * 0.4; // One side
                const bottomSideY = this.headSize * 0.4; // Other side

                // Top side (negative Y in top-down)
                for (let i = 0; i < this.hairCount / 2; i++) {
                    const offsetX = (i / (this.hairCount / 2)) * this.headSize * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(backX + offsetX, topSideY);
                    ctx.quadraticCurveTo(
                        backX + offsetX - this.hairLength * 0.2, topSideY - this.hairLength * 0.5,
                        backX + offsetX - this.hairLength * 0.3, topSideY - this.hairLength * 0.8
                    );
                    ctx.stroke();
                }

                // Bottom side (positive Y in top-down)
                for (let i = 0; i < this.hairCount / 2; i++) {
                    const offsetX = (i / (this.hairCount / 2)) * this.headSize * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(backX + offsetX, bottomSideY);
                    ctx.quadraticCurveTo(
                        backX + offsetX - this.hairLength * 0.2, bottomSideY + this.hairLength * 0.5,
                        backX + offsetX - this.hairLength * 0.3, bottomSideY + this.hairLength * 0.8
                    );
                    ctx.stroke();
                }
                break;

            case "curly":
                // Curly/wavy hair around back of head (top-down view)
                for (let i = 0; i < this.hairCount; i++) {
                    // Spread curls around the back half of the head (centered on Math.PI)
                    const angle = Math.PI - Math.PI / 3 + (i / (this.hairCount - 1)) * (Math.PI * 2 / 3);
                    const baseRadius = this.headSize * 0.4;
                    const baseX = Math.cos(angle) * baseRadius;
                    const baseY = Math.sin(angle) * baseRadius;

                    const curlSegments = 4;
                    const curlRadius = this.hairLength / curlSegments / 2;

                    ctx.beginPath();
                    ctx.moveTo(baseX, baseY);

                    let currentX = baseX;
                    let currentY = baseY;

                    for (let j = 0; j < curlSegments; j++) {
                        const direction = j % 2 === 0 ? 1 : -1;
                        const controlAngle = angle + Math.PI / 2 * direction;
                        const controlX = currentX + Math.cos(controlAngle) * curlRadius + Math.cos(angle) * curlRadius;
                        const controlY = currentY + Math.sin(controlAngle) * curlRadius + Math.sin(angle) * curlRadius;

                        const endX = currentX + Math.cos(angle) * curlRadius * 2;
                        const endY = currentY + Math.sin(angle) * curlRadius * 2;

                        ctx.quadraticCurveTo(controlX, controlY, endX, endY);

                        currentX = endX;
                        currentY = endY;
                    }
                    ctx.stroke();
                }
                break;

            case "buzz":
                // Buzz cut - very short stubble covering the head (top-down view)
                {
                    const stubbleCount = 40;
                    const stubbleLen = Math.min(this.hairLength * 0.3, 4);
                    ctx.strokeStyle = this.hairColor;
                    ctx.lineWidth = this.hairThickness * 0.5;
                    ctx.lineCap = 'round';
                    
                    // Random seed based on head size for consistent stubble pattern
                    const seed = this.headSize * 1000;
                    for (let i = 0; i < stubbleCount; i++) {
                        // Pseudo-random positioning on head surface
                        const angle = ((i * 137.508) % 360) * Math.PI / 180; // Golden angle distribution
                        const dist = (0.2 + (((i * 31 + seed) % 100) / 100) * 0.6) * this.headSize * 0.5;
                        const baseX = Math.cos(angle) * dist;
                        const baseY = Math.sin(angle) * dist;
                        
                        // Short stubble pointing outward
                        const endX = baseX + Math.cos(angle) * stubbleLen;
                        const endY = baseY + Math.sin(angle) * stubbleLen;
                        
                        ctx.beginPath();
                        ctx.moveTo(baseX, baseY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                    }
                }
                break;

            case "afro":
                // Afro - large rounded puffy hair (top-down view: circular cloud around head)
                {
                    const afroSize = this.hairLength * 0.8;
                    const puffCount = 12;
                    
                    ctx.fillStyle = this.hairColor;
                    ctx.strokeStyle = this.hairColor;
                    ctx.lineWidth = 1;
                    
                    // Draw puffy circles around the head
                    for (let i = 0; i < puffCount; i++) {
                        const angle = (i / puffCount) * Math.PI * 2;
                        const dist = this.headSize * 0.45 + afroSize * 0.3;
                        const puffX = Math.cos(angle) * dist;
                        const puffY = Math.sin(angle) * dist;
                        const puffSize = afroSize * (0.4 + Math.sin(i * 2.3) * 0.15);
                        
                        ctx.beginPath();
                        ctx.arc(puffX, puffY, puffSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Fill center
                    ctx.beginPath();
                    ctx.arc(0, 0, this.headSize * 0.35 + afroSize * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case "slicked":
                // Slicked back hair - smooth lines going backward (top-down view)
                {
                    ctx.strokeStyle = this.hairColor;
                    ctx.lineWidth = this.hairThickness;
                    ctx.lineCap = 'round';
                    
                    const lineCount = Math.max(5, this.hairCount);
                    for (let i = 0; i < lineCount; i++) {
                        const t = i / (lineCount - 1);
                        // Start from front of head, spread across width
                        const startY = (t - 0.5) * this.headSize * 0.6;
                        const startX = this.headSize * 0.4;
                        
                        // Curve back and slightly outward
                        const endX = -this.headSize * 0.5 - this.hairLength * 0.3;
                        const endY = startY * 1.3;
                        
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.quadraticCurveTo(
                            0, startY * 0.8,
                            endX, endY
                        );
                        ctx.stroke();
                    }
                }
                break;

            case "short":
                // Short hair - small tufts around the head (top-down view)
                {
                    ctx.strokeStyle = this.hairColor;
                    ctx.lineWidth = this.hairThickness;
                    ctx.lineCap = 'round';
                    
                    const tuftCount = this.hairCount;
                    for (let i = 0; i < tuftCount; i++) {
                        // Spread around the head, more toward back
                        const angle = Math.PI * 0.3 + (i / (tuftCount - 1)) * Math.PI * 1.4;
                        const baseRadius = this.headSize * 0.4;
                        const baseX = Math.cos(angle) * baseRadius;
                        const baseY = Math.sin(angle) * baseRadius;
                        
                        // Short tufts pointing outward with slight variation
                        const variation = ((i * 17) % 10 - 5) * 0.05;
                        const tuftLen = this.hairLength * 0.4;
                        const endX = baseX + Math.cos(angle + variation) * tuftLen;
                        const endY = baseY + Math.sin(angle + variation) * tuftLen;
                        
                        ctx.beginPath();
                        ctx.moveTo(baseX, baseY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                    }
                }
                break;

            case "bald_top":
                // Bald on top with hair on sides (top-down view: ring of hair around edges)
                {
                    ctx.strokeStyle = this.hairColor;
                    ctx.lineWidth = this.hairThickness;
                    ctx.lineCap = 'round';
                    
                    const strandCount = 16;
                    // Only draw hair on the sides (not front or back-center)
                    for (let i = 0; i < strandCount; i++) {
                        const t = i / strandCount;
                        // Skip the front and back areas (where bald spot shows)
                        const angle = t * Math.PI * 2;
                        const angleDeg = (angle * 180 / Math.PI) % 360;
                        
                        // Skip roughly the top/front quadrant
                        if (angleDeg > 300 || angleDeg < 60) continue;
                        
                        const baseRadius = this.headSize * 0.42;
                        const baseX = Math.cos(angle) * baseRadius;
                        const baseY = Math.sin(angle) * baseRadius;
                        
                        // Hair going outward and slightly back
                        const hairLen = this.hairLength * 0.5;
                        const endX = baseX + Math.cos(angle) * hairLen;
                        const endY = baseY + Math.sin(angle) * hairLen;
                        
                        ctx.beginPath();
                        ctx.moveTo(baseX, baseY);
                        ctx.quadraticCurveTo(
                            baseX + Math.cos(angle) * hairLen * 0.5,
                            baseY + Math.sin(angle) * hairLen * 0.5 + 2,
                            endX, endY
                        );
                        ctx.stroke();
                    }
                    
                    // Draw a subtle bald spot indication (slightly different head color)
                    ctx.fillStyle = 'rgba(255, 220, 180, 0.15)';
                    ctx.beginPath();
                    ctx.ellipse(this.headSize * 0.1, 0, this.headSize * 0.25, this.headSize * 0.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    }

    _drawHeadAccessory(ctx) {
        if (this.headAccessory === "none") return;

        ctx.strokeStyle = this.accessoryColor;
        ctx.fillStyle = this.accessoryColor;
        ctx.lineWidth = 2;

        switch (this.headAccessory) {
            case "horns":
                // Two curved horns on sides of head (top-down view: sides are +/- Y)
                const hornBaseX = 0; // Center of head
                const hornBaseTop = -this.headSize * 0.35; // Top side
                const hornBaseBottom = this.headSize * 0.35; // Bottom side

                // Top horn (negative Y side)
                ctx.beginPath();
                ctx.moveTo(hornBaseX, hornBaseTop);
                ctx.quadraticCurveTo(
                    hornBaseX - this.accessorySize * 0.3, hornBaseTop - this.accessorySize * 0.7,
                    hornBaseX - this.accessorySize * 0.1, hornBaseTop - this.accessorySize
                );
                ctx.stroke();

                // Bottom horn (positive Y side)
                ctx.beginPath();
                ctx.moveTo(hornBaseX, hornBaseBottom);
                ctx.quadraticCurveTo(
                    hornBaseX - this.accessorySize * 0.3, hornBaseBottom + this.accessorySize * 0.7,
                    hornBaseX - this.accessorySize * 0.1, hornBaseBottom + this.accessorySize
                );
                ctx.stroke();

                // Horn tips
                ctx.fillStyle = this.accessoryColor;
                ctx.beginPath();
                ctx.arc(hornBaseX - this.accessorySize * 0.1, hornBaseTop - this.accessorySize, 3, 0, Math.PI * 2);
                ctx.arc(hornBaseX - this.accessorySize * 0.1, hornBaseBottom + this.accessorySize, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "ears":
                // Pointed ears on sides of head (top-down view: sides are +/- Y)
                const earX = -this.headSize * 0.1; // Slightly toward back
                const earTopY = -this.headSize * 0.45; // Top side
                const earBottomY = this.headSize * 0.45; // Bottom side

                // Top ear (negative Y side, points outward/up in screen space)
                ctx.beginPath();
                ctx.moveTo(earX + this.accessorySize * 0.3, earTopY);
                ctx.lineTo(earX, earTopY - this.accessorySize * 0.6);
                ctx.lineTo(earX - this.accessorySize * 0.3, earTopY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Bottom ear (positive Y side, points outward/down in screen space)
                ctx.beginPath();
                ctx.moveTo(earX + this.accessorySize * 0.3, earBottomY);
                ctx.lineTo(earX, earBottomY + this.accessorySize * 0.6);
                ctx.lineTo(earX - this.accessorySize * 0.3, earBottomY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case "crown":
                // Crown on top of head (in top-down view, displayed above/behind the head center)
                // Crown wraps around the back-top of the head
                const crownX = -this.headSize * 0.3; // Toward back of head
                const crownHeight = this.headSize * 0.6;
                const crownDepth = this.accessorySize;

                ctx.beginPath();
                // Crown spans across the width (Y axis in top-down)
                ctx.moveTo(crownX, -crownHeight / 2);
                ctx.lineTo(crownX - crownDepth * 0.4, -crownHeight / 2);
                ctx.lineTo(crownX - crownDepth * 0.6, -crownHeight / 4);
                ctx.lineTo(crownX - crownDepth, 0);
                ctx.lineTo(crownX - crownDepth * 0.6, crownHeight / 4);
                ctx.lineTo(crownX - crownDepth * 0.4, crownHeight / 2);
                ctx.lineTo(crownX, crownHeight / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Crown jewel
                ctx.fillStyle = this.eyeColor; // Use eye color for jewels
                ctx.beginPath();
                ctx.arc(crownX - crownDepth * 0.8, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "tusks": {
                // Two tusks protruding from the front of the head
                const tuskLen = this.accessorySize * 0.9;
                const tuskThick = this.accessorySize * 0.15;
                const tuskBaseX = this.headSize * 0.4;
                const tuskSpacing = this.headSize * 0.25;

                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = tuskThick;
                ctx.lineCap = 'round';

                // Top tusk (curves outward then forward)
                ctx.beginPath();
                ctx.moveTo(tuskBaseX, -tuskSpacing);
                ctx.quadraticCurveTo(
                    tuskBaseX + tuskLen * 0.4, -tuskSpacing - tuskLen * 0.3,
                    tuskBaseX + tuskLen, -tuskSpacing - tuskLen * 0.1
                );
                ctx.stroke();

                // Bottom tusk
                ctx.beginPath();
                ctx.moveTo(tuskBaseX, tuskSpacing);
                ctx.quadraticCurveTo(
                    tuskBaseX + tuskLen * 0.4, tuskSpacing + tuskLen * 0.3,
                    tuskBaseX + tuskLen, tuskSpacing + tuskLen * 0.1
                );
                ctx.stroke();

                // Tusk tips (ivory dots)
                ctx.fillStyle = this.accessoryColor;
                ctx.beginPath();
                ctx.arc(tuskBaseX + tuskLen, -tuskSpacing - tuskLen * 0.1, tuskThick * 0.6, 0, Math.PI * 2);
                ctx.arc(tuskBaseX + tuskLen, tuskSpacing + tuskLen * 0.1, tuskThick * 0.6, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "crest": {
                // Ridge/crest running along the top center of the head
                const crestLen = this.headSize * 0.8;
                const crestH = this.accessorySize * 0.5;
                const crestPoints = 5;

                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;

                // Draw crest as a series of connected ridges along center
                ctx.beginPath();
                ctx.moveTo(-crestLen * 0.4, 0);
                for (let i = 0; i < crestPoints; i++) {
                    const t = i / (crestPoints - 1);
                    const px = -crestLen * 0.4 + t * crestLen;
                    // Crest height peaks in the middle
                    const heightScale = Math.sin(t * Math.PI);
                    const peakY = -crestH * heightScale;
                    ctx.lineTo(px, peakY);
                }
                ctx.lineTo(crestLen * 0.4, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }

            case "frills": {
                // Frill-like protrusions on the sides (like a frilled lizard)
                const frillCount = 4;
                const frillLen = this.accessorySize * 0.5;
                const frillBaseSpread = this.headSize * 0.4;

                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;

                for (let side = -1; side <= 1; side += 2) {
                    for (let i = 0; i < frillCount; i++) {
                        const t = i / (frillCount - 1);
                        const baseX = -this.headSize * 0.3 + t * this.headSize * 0.5;
                        const baseY = side * frillBaseSpread;
                        const tipY = baseY + side * frillLen * (0.6 + t * 0.4);
                        const tipX = baseX - frillLen * 0.2;

                        ctx.beginPath();
                        ctx.moveTo(baseX + frillLen * 0.15, baseY);
                        ctx.quadraticCurveTo(baseX + frillLen * 0.1, tipY * 0.7 + baseY * 0.3, tipX, tipY);
                        ctx.quadraticCurveTo(baseX - frillLen * 0.2, tipY * 0.5 + baseY * 0.5, baseX - frillLen * 0.15, baseY);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                }
                break;
            }

            case "fangs": {
                // Downward-pointing fangs from the front of the head (top-down: forward-pointing)
                const fangLen = this.accessorySize * 0.7;
                const fangThick = this.accessorySize * 0.12;
                const fangBaseX = this.headSize * 0.5;
                const fangSpacing = this.headSize * 0.2;

                ctx.strokeStyle = this.accessoryColor;
                ctx.fillStyle = this.accessoryColor;
                ctx.lineWidth = fangThick;
                ctx.lineCap = 'round';

                // Top fang (curves slightly inward)
                ctx.beginPath();
                ctx.moveTo(fangBaseX, -fangSpacing);
                ctx.quadraticCurveTo(
                    fangBaseX + fangLen * 0.6, -fangSpacing * 0.6,
                    fangBaseX + fangLen, -fangSpacing * 0.3
                );
                ctx.stroke();

                // Bottom fang
                ctx.beginPath();
                ctx.moveTo(fangBaseX, fangSpacing);
                ctx.quadraticCurveTo(
                    fangBaseX + fangLen * 0.6, fangSpacing * 0.6,
                    fangBaseX + fangLen, fangSpacing * 0.3
                );
                ctx.stroke();

                // Sharp tips
                ctx.beginPath();
                ctx.arc(fangBaseX + fangLen, -fangSpacing * 0.3, fangThick * 0.4, 0, Math.PI * 2);
                ctx.arc(fangBaseX + fangLen, fangSpacing * 0.3, fangThick * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "snout": {
                // Protruding snout/muzzle extending from the front of the head
                const snoutLen = this.accessorySize * 0.8;
                const snoutW = this.headSize * 0.35;
                const snoutBaseX = this.headSize * 0.4;

                // Snout shape
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(snoutBaseX, -snoutW * 0.5);
                ctx.quadraticCurveTo(snoutBaseX + snoutLen * 0.5, -snoutW * 0.45, snoutBaseX + snoutLen, -snoutW * 0.15);
                ctx.lineTo(snoutBaseX + snoutLen, snoutW * 0.15);
                ctx.quadraticCurveTo(snoutBaseX + snoutLen * 0.5, snoutW * 0.45, snoutBaseX, snoutW * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Nose tip
                ctx.fillStyle = this.armColor || '#222';
                ctx.beginPath();
                ctx.ellipse(snoutBaseX + snoutLen * 0.95, 0, snoutW * 0.12, snoutW * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();

                // Nostrils
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(snoutBaseX + snoutLen * 0.85, -snoutW * 0.08, 1.5, 0, Math.PI * 2);
                ctx.arc(snoutBaseX + snoutLen * 0.85, snoutW * 0.08, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "beak": {
                // Pointed beak shape extending from the front
                const beakLen = this.accessorySize * 0.9;
                const beakW = this.headSize * 0.28;
                const beakBaseX = this.headSize * 0.4;

                // Upper beak (slightly larger)
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(beakBaseX, -beakW * 0.1);
                ctx.quadraticCurveTo(beakBaseX + beakLen * 0.6, -beakW * 0.4, beakBaseX + beakLen, 0);
                ctx.lineTo(beakBaseX, beakW * 0.05);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Lower beak (smaller)
                ctx.beginPath();
                ctx.moveTo(beakBaseX, beakW * 0.1);
                ctx.quadraticCurveTo(beakBaseX + beakLen * 0.5, beakW * 0.3, beakBaseX + beakLen, 0);
                ctx.lineTo(beakBaseX, -beakW * 0.05);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Beak line (separation between upper and lower)
                ctx.strokeStyle = this.armColor || '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(beakBaseX + beakLen * 0.1, 0);
                ctx.lineTo(beakBaseX + beakLen, 0);
                ctx.stroke();

                // Nostril on upper beak
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(beakBaseX + beakLen * 0.35, -beakW * 0.12, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "whiskers": {
                // Cat/rodent-style whiskers on the sides of the head
                const whiskerLen = this.accessorySize * 1.0;
                const whiskerCount = 3;
                const whiskerBaseX = this.headSize * 0.25;

                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.2;
                ctx.lineCap = 'round';

                for (let side = -1; side <= 1; side += 2) {
                    for (let i = 0; i < whiskerCount; i++) {
                        const t = i / (whiskerCount - 1);
                        const baseY = side * this.headSize * (0.15 + t * 0.2);
                        const angle = (t - 0.5) * 0.4; // Slight fan spread
                        const droop = (t - 0.5) * 0.15 * side; // Outer whiskers droop slightly

                        ctx.beginPath();
                        ctx.moveTo(whiskerBaseX, baseY);
                        ctx.quadraticCurveTo(
                            whiskerBaseX + whiskerLen * 0.5, baseY + side * whiskerLen * (0.3 + angle) + droop * whiskerLen,
                            whiskerBaseX + whiskerLen * 0.3, baseY + side * whiskerLen * (0.5 + angle * 0.5)
                        );
                        ctx.stroke();
                    }
                }
                break;
            }

            case "spikes": {
                // Multiple spikes radiating from back/sides of the head
                const spikeCount = 5;
                const spikeLen = this.accessorySize * 0.6;
                const spikeThick = this.accessorySize * 0.12;

                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1;

                for (let i = 0; i < spikeCount; i++) {
                    const t = i / (spikeCount - 1);
                    // Spread from back-top to back-bottom (around Math.PI)
                    const angle = Math.PI * 0.6 + t * Math.PI * 0.8;
                    const baseRadius = this.headSize * 0.4;
                    const baseX = Math.cos(angle) * baseRadius;
                    const baseY = Math.sin(angle) * baseRadius;

                    // Spike length varies (center is longest)
                    const lengthScale = 0.6 + Math.sin(t * Math.PI) * 0.4;
                    const tipX = baseX + Math.cos(angle) * spikeLen * lengthScale;
                    const tipY = baseY + Math.sin(angle) * spikeLen * lengthScale;

                    // Draw spike as triangle
                    const perpX = -Math.sin(angle) * spikeThick;
                    const perpY = Math.cos(angle) * spikeThick;
                    ctx.beginPath();
                    ctx.moveTo(baseX + perpX, baseY + perpY);
                    ctx.lineTo(tipX, tipY);
                    ctx.lineTo(baseX - perpX, baseY - perpY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                break;
            }

            case "army_hat": {
                // Military/army cap - flat top with short brim (top-down view)
                const hatSize = this.accessorySize * 0.8;
                const hatW = this.headSize * 0.55;
                
                // Hat body (covers top of head)
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                
                // Flat-topped cap shape
                ctx.beginPath();
                ctx.moveTo(this.headSize * 0.3, -hatW);
                ctx.lineTo(-this.headSize * 0.5, -hatW);
                ctx.lineTo(-this.headSize * 0.5, hatW);
                ctx.lineTo(this.headSize * 0.3, hatW);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Short brim at front
                ctx.fillStyle = this.accessoryColor;
                ctx.beginPath();
                ctx.moveTo(this.headSize * 0.3, -hatW * 0.7);
                ctx.lineTo(this.headSize * 0.5 + hatSize * 0.3, -hatW * 0.5);
                ctx.lineTo(this.headSize * 0.5 + hatSize * 0.3, hatW * 0.5);
                ctx.lineTo(this.headSize * 0.3, hatW * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Insignia/badge on front
                ctx.fillStyle = '#c0a030';
                ctx.beginPath();
                ctx.arc(this.headSize * 0.15, 0, hatSize * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "cowboy_hat": {
                // Cowboy hat - wide brim all around (top-down view)
                const brimSize = this.accessorySize * 1.2;
                const crownW = this.headSize * 0.4;
                
                // Wide brim (ellipse around head)
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.5 + brimSize, this.headSize * 0.4 + brimSize * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Crown (inner part on head) - slightly darker
                const darkerColor = this._darkenColor(this.accessoryColor, 0.2);
                ctx.fillStyle = darkerColor;
                ctx.strokeStyle = darkerColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, crownW, crownW * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Crown crease (indentation on top)
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.35);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-crownW * 0.6, 0);
                ctx.lineTo(crownW * 0.6, 0);
                ctx.stroke();
                break;
            }

            case "baseball_cap": {
                // Baseball cap - rounded with curved brim (top-down view)
                const capSize = this.accessorySize * 0.7;
                const capW = this.headSize * 0.5;
                
                // Cap dome
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(-this.headSize * 0.1, 0, capW, Math.PI * 0.5, Math.PI * 1.5, false);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Curved brim extending forward
                ctx.beginPath();
                ctx.moveTo(this.headSize * 0.2, -capW * 0.6);
                ctx.quadraticCurveTo(this.headSize * 0.6 + capSize * 0.5, 0, this.headSize * 0.2, capW * 0.6);
                ctx.lineTo(this.headSize * 0.1, capW * 0.5);
                ctx.quadraticCurveTo(this.headSize * 0.4, 0, this.headSize * 0.1, -capW * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Cap button on top
                ctx.fillStyle = this._darkenColor(this.accessoryColor, 0.3);
                ctx.beginPath();
                ctx.arc(-this.headSize * 0.15, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "beret": {
                // Beret - soft round cap tilted to one side (top-down view)
                const beretSize = this.accessorySize * 0.9;
                
                // Main beret shape (slightly off-center, drooping to one side)
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(-this.headSize * 0.1, -this.headSize * 0.1, 
                           this.headSize * 0.5 + beretSize * 0.3, 
                           this.headSize * 0.45 + beretSize * 0.2, 
                           -0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Beret stem/pip on top
                ctx.fillStyle = this._darkenColor(this.accessoryColor, 0.3);
                ctx.beginPath();
                ctx.arc(-this.headSize * 0.2, -this.headSize * 0.15, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "helmet": {
                // Military/combat helmet (top-down view)
                const helmetSize = this.accessorySize * 0.8;
                const helmetW = this.headSize * 0.6;
                
                // Helmet dome
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.2);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.55 + helmetSize * 0.3, helmetW + helmetSize * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Inner band/padding
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.35);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.4, helmetW * 0.7, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                // Helmet rim detail at front
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.15);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.headSize * 0.3, 0, helmetW * 0.4, -Math.PI * 0.4, Math.PI * 0.4);
                ctx.stroke();
                break;
            }

            case "bandana": {
                // Bandana/headband wrapped around head (top-down view)
                const bandW = this.accessorySize * 0.25;
                
                // Main band around head
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = bandW;
                ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.45, this.headSize * 0.4, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                // Knot at back with trailing ends
                ctx.fillStyle = this.accessoryColor;
                ctx.beginPath();
                ctx.arc(-this.headSize * 0.45, 0, bandW * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Trailing ends
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = bandW * 0.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-this.headSize * 0.5, -bandW * 0.3);
                ctx.quadraticCurveTo(-this.headSize * 0.7, -bandW, -this.headSize * 0.6 - this.accessorySize * 0.4, -bandW * 0.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-this.headSize * 0.5, bandW * 0.3);
                ctx.quadraticCurveTo(-this.headSize * 0.7, bandW * 1.2, -this.headSize * 0.65 - this.accessorySize * 0.3, bandW * 0.8);
                ctx.stroke();
                break;
            }

            case "headphones": {
                // Over-ear headphones (top-down view)
                const padSize = this.accessorySize * 0.4;
                const bandW = this.accessorySize * 0.15;
                
                // Headband across top of head
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = bandW;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, this.headSize * 0.45, -Math.PI * 0.8, Math.PI * 0.8);
                ctx.stroke();
                
                // Left ear cup
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.25);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, -this.headSize * 0.5 - padSize * 0.3, padSize, padSize * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Right ear cup
                ctx.beginPath();
                ctx.ellipse(0, this.headSize * 0.5 + padSize * 0.3, padSize, padSize * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Ear cup cushion detail
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.ellipse(0, -this.headSize * 0.5 - padSize * 0.3, padSize * 0.5, padSize * 0.35, 0, 0, Math.PI * 2);
                ctx.ellipse(0, this.headSize * 0.5 + padSize * 0.3, padSize * 0.5, padSize * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case "goggles": {
                // Goggles pushed up on forehead or worn (top-down view: strap around head, lenses at front)
                const lensSize = this.accessorySize * 0.3;
                const strapW = this.accessorySize * 0.12;
                
                // Strap around head
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.3);
                ctx.lineWidth = strapW;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.42, this.headSize * 0.38, 0, Math.PI * 0.3, Math.PI * 1.7);
                ctx.stroke();
                
                // Goggle frame at front
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.2);
                ctx.lineWidth = 2;
                
                // Left lens housing
                ctx.beginPath();
                ctx.ellipse(this.headSize * 0.35, -this.headSize * 0.18, lensSize, lensSize * 0.8, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Right lens housing
                ctx.beginPath();
                ctx.ellipse(this.headSize * 0.35, this.headSize * 0.18, lensSize, lensSize * 0.8, -0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Lens glass (tinted)
                ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
                ctx.beginPath();
                ctx.ellipse(this.headSize * 0.35, -this.headSize * 0.18, lensSize * 0.7, lensSize * 0.55, 0.2, 0, Math.PI * 2);
                ctx.ellipse(this.headSize * 0.35, this.headSize * 0.18, lensSize * 0.7, lensSize * 0.55, -0.2, 0, Math.PI * 2);
                ctx.fill();
                
                // Bridge connecting lenses
                ctx.strokeStyle = this.accessoryColor;
                ctx.lineWidth = strapW * 0.8;
                ctx.beginPath();
                ctx.moveTo(this.headSize * 0.35, -this.headSize * 0.05);
                ctx.lineTo(this.headSize * 0.35, this.headSize * 0.05);
                ctx.stroke();
                break;
            }

            case "top_hat": {
                // Top hat - tall cylindrical hat (top-down view: see the top/brim)
                const hatHeight = this.accessorySize * 0.5;
                const brimSize = this.accessorySize * 0.4;
                const crownW = this.headSize * 0.35;
                
                // Wide brim
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.2);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.4 + brimSize, this.headSize * 0.35 + brimSize * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Tall crown (top of hat, slightly lighter)
                ctx.fillStyle = this._lightenColor(this.accessoryColor, 0.1);
                ctx.beginPath();
                ctx.ellipse(0, 0, crownW, crownW * 0.75, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Hat band
                ctx.strokeStyle = '#aa2222';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, 0, crownW + 2, crownW * 0.75 + 1.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }

            case "wizard_hat": {
                // Wizard/witch hat - pointed cone (top-down view: see circular brim with point offset to back)
                const brimSize = this.accessorySize * 0.5;
                const coneLen = this.accessorySize * 0.8;
                
                // Wide brim
                ctx.fillStyle = this.accessoryColor;
                ctx.strokeStyle = this._darkenColor(this.accessoryColor, 0.2);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.headSize * 0.45 + brimSize, this.headSize * 0.4 + brimSize * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Cone pointing backward and up (appears as elongated shape going back)
                ctx.fillStyle = this._darkenColor(this.accessoryColor, 0.1);
                ctx.beginPath();
                ctx.moveTo(this.headSize * 0.2, -this.headSize * 0.25);
                ctx.quadraticCurveTo(-this.headSize * 0.3, -this.headSize * 0.3, -this.headSize * 0.5 - coneLen, 0);
                ctx.quadraticCurveTo(-this.headSize * 0.3, this.headSize * 0.3, this.headSize * 0.2, this.headSize * 0.25);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Star decoration
                ctx.fillStyle = '#ffdd44';
                ctx.beginPath();
                const starX = -this.headSize * 0.15;
                const starSize = this.accessorySize * 0.15;
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
                    const r = i % 2 === 0 ? starSize : starSize * 0.4;
                    const sx = starX + Math.cos(angle) * r;
                    const sy = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }
        }
    }

    /**
     * Draw the entire body as a single smooth spline shape.
     * Replaces per-segment drawing when splineBody is true.
     * Computes left/right edge points per segment, fits a bezier spline,
     * then draws the outline as one filled closed path.
     */
    _drawSplineBody(ctx) {
        if (!this._segments || this._segments.length === 0) return;
    
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
    
        const tension = this.splineBodyTension ?? 0.4;
        const segCount = this._segments.length;
        const isometricRad = this.isometricAngle * Math.PI / 180;
        const isoH = -Math.sin(isometricRad) * this.bodyHeight;
    
        // Helper: world point → local canvas space
        const toLocal = (wx, wy) => {
            const dx = wx - worldPos.x;
            const dy = wy - worldPos.y;
            return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
        };
    
        // Helper: get combined offset for a segment index
        const getOffsets = (i) => {
            const segHeightFactor = this.bodyHeightDepth * (1 - (i / Math.max(1, segCount)) * 0.4);
            const depthOff = this._getDepthOffset(segHeightFactor);
            const elevOff = this._get25DElevationOffset(this.bodyElevation);
            return { x: elevOff.x + depthOff.x, y: isoH + elevOff.y + depthOff.y };
        };
    
        // --- Compute spine forward vectors in LOCAL space ---
        // We derive the forward direction from neighbour segment positions (not raw .angle)
        // to ensure perpendiculars are stable and never flip.
        const spineLocalPts = [];
        for (let i = 0; i < segCount; i++) {
            const off = getOffsets(i);
            const lc = toLocal(this._segments[i].worldPos.x, this._segments[i].worldPos.y);
            spineLocalPts.push({ x: lc.x + off.x, y: lc.y + off.y });
        }
    
        // Forward direction for segment i: from previous spine point toward next spine point.
        // At the ends we use the nearest available neighbour pair.
        const spineForward = [];
        for (let i = 0; i < segCount; i++) {
            const prev = spineLocalPts[Math.max(0, i - 1)];
            const next = spineLocalPts[Math.min(segCount - 1, i + 1)];
            let fx = next.x - prev.x;
            let fy = next.y - prev.y;
            const len = Math.sqrt(fx * fx + fy * fy);
            if (len > 0.001) { fx /= len; fy /= len; }
            else { fx = 1; fy = 0; }
            spineForward.push({ x: fx, y: fy });
        }
    
        // --- Build edge points ---
        // Right side perp = rotate forward +90°  →  (fy, -fx)  — consistent side
        // Left  side perp = rotate forward -90°  →  (-fy, fx)
        const leftPts = [];
        const rightPts = [];
    
        for (let i = 0; i < segCount; i++) {
            const taperFactor = 1 - (i / segCount) * this.tailTaper;
            let halfW = this.bodyWidth * taperFactor * 0.5 * this.bodyScaleY;
    
            if (this.breathingEnabled && !this.isDead) {
                const phaseOff = this.breathingAsync ? (i / segCount) * Math.PI * 0.5 : 0;
                halfW *= 1.0 + Math.sin(this._breathingPhase + phaseOff) * this.breathingAmount;
            }
    
            const c = spineLocalPts[i];
            const f = spineForward[i];
            // Right perp (+90° from forward): (fy, -fx)
            const rpx =  f.y * halfW;
            const rpy = -f.x * halfW;
            // Left perp (-90° from forward): (-fy, fx)
            const lpx = -f.y * halfW;
            const lpy =  f.x * halfW;
    
            rightPts.push({ x: c.x + rpx, y: c.y + rpy });
            leftPts.push({  x: c.x + lpx, y: c.y + lpy });
        }
    
        // --- Head tip and tail tip ---
        const headSeg = this._segments[0];
        const headOff = getOffsets(0);
        const headLocal = toLocal(headSeg.worldPos.x, headSeg.worldPos.y);
        const headC = { x: headLocal.x + headOff.x, y: headLocal.y + headOff.y };
        const hf = spineForward[0];
        const headForward = this._getHeadFrontOffset() * this.headSize;
        const headTip = { x: headC.x + hf.x * headForward, y: headC.y + hf.y * headForward };

        const tailSeg = this._segments[segCount - 1];
        const tailOff = getOffsets(segCount - 1);
        const tailLocal = toLocal(tailSeg.worldPos.x, tailSeg.worldPos.y);
        const tailC = { x: tailLocal.x + tailOff.x, y: tailLocal.y + tailOff.y };
        const tf = spineForward[segCount - 1];
        const tailBack = this.segmentLength * 0.5;
        const tailTip = { x: tailC.x - tf.x * tailBack, y: tailC.y - tf.y * tailBack };

        // --- Draw using separate curves for each side + rounded caps ---
        ctx.save();
        ctx.fillStyle = this.bodyColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;

        ctx.beginPath();

        // Helper: catmull-rom segment
        const catmullSeg = (p0, p1, p2, p3, t) => ({
            cp1x: p1.x + (p2.x - p0.x) * t / 6,
            cp1y: p1.y + (p2.y - p0.y) * t / 6,
            cp2x: p2.x - (p3.x - p1.x) * t / 6,
            cp2y: p2.y - (p3.y - p1.y) * t / 6,
        });

        const T = tension * 6;

        // Draw right side front -> back
        ctx.moveTo(rightPts[0].x, rightPts[0].y);
        for (let i = 0; i < segCount - 1; i++) {
            const p0 = i === 0 ? rightPts[0] : rightPts[i - 1];
            const p1 = rightPts[i];
            const p2 = rightPts[i + 1];
            const p3 = i + 2 < segCount ? rightPts[i + 2] : rightPts[segCount - 1];
            const h = catmullSeg(p0, p1, p2, p3, T);
            ctx.bezierCurveTo(h.cp1x, h.cp1y, h.cp2x, h.cp2y, p2.x, p2.y);
        }

        // Rounded tail cap: curve from last right point -> tailTip -> last left point
        const trRight = rightPts[segCount - 1];
        const trLeft = leftPts[segCount - 1];
        // Control points push outward past the tail tip
        const tailCapCtrl1x = trRight.x + tf.x * tailBack * 1.5 + (tailTip.x - trRight.x) * 0.5;
        const tailCapCtrl1y = trRight.y + tf.y * tailBack * 1.5 + (tailTip.y - trRight.y) * 0.5;
        const tailCapCtrl2x = trLeft.x + tf.x * tailBack * 1.5 + (tailTip.x - trLeft.x) * 0.5;
        const tailCapCtrl2y = trLeft.y + tf.y * tailBack * 1.5 + (tailTip.y - trLeft.y) * 0.5;
        ctx.bezierCurveTo(tailCapCtrl1x, tailCapCtrl1y, tailCapCtrl2x, tailCapCtrl2y, trLeft.x, trLeft.y);

        // Draw left side back -> front
        for (let i = segCount - 1; i > 0; i--) {
            const p0 = i === segCount - 1 ? leftPts[segCount - 1] : leftPts[i + 1];
            const p1 = leftPts[i];
            const p2 = leftPts[i - 1];
            const p3 = i - 2 >= 0 ? leftPts[i - 2] : leftPts[0];
            const h = catmullSeg(p0, p1, p2, p3, T);
            ctx.bezierCurveTo(h.cp1x, h.cp1y, h.cp2x, h.cp2y, p2.x, p2.y);
        }

        // Rounded head cap: curve from first left point around headTip to first right point
        const hdRight = rightPts[0];
        const hdLeft = leftPts[0];
        // Control points sit directly at the tip position, pushed further forward
        // This guarantees the curve bows outward past the tip rather than caving in
        const headCapCtrl1x = headTip.x - hf.x * headForward * 0.5;
        const headCapCtrl1y = headTip.y - hf.y * headForward * 0.5;
        const headCapCtrl2x = headTip.x - hf.x * headForward * 0.5;
        const headCapCtrl2y = headTip.y - hf.y * headForward * 0.5;
        ctx.bezierCurveTo(headCapCtrl1x, headCapCtrl1y, headCapCtrl2x, headCapCtrl2y, hdRight.x, hdRight.y);

        ctx.closePath();
        ctx.fill();

        // Damage flash overlay
        if (this._damageFlashTimer > 0) {
            const flashAlpha = Math.min(0.7, this._damageFlashTimer / 0.15);
            ctx.fillStyle = `rgba(255, 100, 100, ${flashAlpha})`;
            ctx.fill();
        }

        ctx.stroke();

        // --- Spine decorations ---
        if (this.spinePattern !== 'none') {
            for (let i = 0; i < segCount; i++) {
                const taperFactor = 1 - (i / segCount) * this.tailTaper;
                const width = this.bodyWidth * taperFactor;
                const c = spineLocalPts[i];
                const f = spineForward[i];
                const fwdAngle = Math.atan2(f.y, f.x);
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(fwdAngle);
                this._drawSpinePattern(ctx, width, taperFactor);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // Helper function to darken a color
    _darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    // Helper function to lighten a color
    _lightenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + (255 - parseInt(hex.substr(0, 2), 16)) * amount);
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + (255 - parseInt(hex.substr(2, 2), 16)) * amount);
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + (255 - parseInt(hex.substr(4, 2), 16)) * amount);
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    _drawAntennae(ctx) {
        ctx.strokeStyle = this.antennaColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < this.antennaCount; i++) {
            // Distribute antennae symmetrically around the back of the head (top-down view)
            // In top-down view, back of head is Math.PI direction (-X), sides are +/- Y
            let angle;
            if (this.antennaCount === 1) {
                // Single antenna points straight back
                angle = Math.PI; // Back direction in top-down view
            } else {
                // Multiple antennae spread symmetrically around the back
                // Spread from back-top to back-bottom (around Math.PI)
                const spreadAngle = Math.PI * 0.5; // 90 degree total spread
                const normalizedPos = i / (this.antennaCount - 1); // 0 to 1
                angle = Math.PI + (normalizedPos - 0.5) * spreadAngle;
            }

            // Base position on the head (at the back)
            const baseRadius = this.headSize * 0.3;
            const baseX = Math.cos(angle) * baseRadius;
            const baseY = Math.sin(angle) * baseRadius;

            // Curved antenna extending outward from head
            const controlLength = this.antennaLength * 0.5;
            const controlX = baseX + Math.cos(angle) * controlLength;
            const controlY = baseY + Math.sin(angle) * controlLength;

            const endLength = this.antennaLength * 0.8;
            const endX = baseX + Math.cos(angle) * endLength;
            const endY = baseY + Math.sin(angle) * endLength;

            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            ctx.stroke();

            // Antenna tip
            ctx.fillStyle = this.antennaColor;
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMandibles(ctx) {
        ctx.strokeStyle = this.mandibleColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        const mandibleLength = this.headSize * 0.6;

        // Left mandible
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.3, -this.headSize * 0.2);
        ctx.lineTo(this.headSize * 0.5 + mandibleLength * 0.3, -this.headSize * 0.4);
        ctx.lineTo(this.headSize * 0.4 + mandibleLength * 0.5, -this.headSize * 0.35);
        ctx.stroke();

        // Right mandible
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.3, this.headSize * 0.2);
        ctx.lineTo(this.headSize * 0.5 + mandibleLength * 0.3, this.headSize * 0.4);
        ctx.lineTo(this.headSize * 0.4 + mandibleLength * 0.5, this.headSize * 0.35);
        ctx.stroke();

        // Mandible tips
        ctx.fillStyle = this.mandibleColor;
        ctx.beginPath();
        ctx.arc(this.headSize * 0.4 + mandibleLength * 0.5, -this.headSize * 0.35, 3, 0, Math.PI * 2);
        ctx.arc(this.headSize * 0.4 + mandibleLength * 0.5, this.headSize * 0.35, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw mouth based on mouthStyle property
     * Called from _drawHeadDirect and also for dynamic parts (tentacles)
     */
    _drawMouth(ctx) {
        switch (this.mouthStyle) {
            case "beak":
                this._drawBeakMouth(ctx);
                break;
            case "proboscis":
                this._drawProboscisMouth(ctx);
                break;
            case "lamprey":
                this._drawLampreyMouth(ctx);
                break;
            case "pinchers":
                this._drawPinchersMouth(ctx);
                break;
            // squidTentacles are drawn separately in world space (physics-driven)
        }
    }

    /**
     * Draw squid tentacles - physics-driven mouth appendages
     * Drawn in head-local space (like ponytail)
     */
    _drawMouthTentacles(ctx) {
        if (this.mouthStyle !== "squidTentacles") return;
        if (!this._segments || this._segments.length === 0) return;

        const head = this._segments[0];
        if (!head || !head.worldPos) return;

        const tentacleCount = Math.max(1, Math.min(8, this.mouthTentacleCount || 4));
        const segCount = Math.max(3, Math.min(12, this.mouthTentacleSegments || 6));
        const headSize = this.headSize || 25;
        const headWorldAngle = head.angle + (this._headAngle || 0);
        
        // Get head-shape-aware front offset for physics, but use smaller offset for visual root
        const headFrontOffset = this._getHeadFrontOffset();
        // Visual root is more inside the head (mouth area) for better attachment appearance
        const visualRootOffset = headFrontOffset * 0.6;
        
        // Initialize chains if physics hasn't run yet (fallback for first frame)
        if (!this._mouthTentacleChains || !Array.isArray(this._mouthTentacleChains) || this._mouthTentacleChains.length !== tentacleCount) {
            const totalLength = this.mouthTentacleLength || 25;
            const segLen = totalLength / segCount;
            const spread = (this.mouthTentacleSpread || 60) * Math.PI / 180;
            
            this._mouthTentacleChains = [];
            for (let t = 0; t < tentacleCount; t++) {
                const angleOffset = tentacleCount === 1 
                    ? 0 
                    : ((t / (tentacleCount - 1)) - 0.5) * spread;
                const tentacleAngle = headWorldAngle + angleOffset;
                
                const rootX = head.worldPos.x + Math.cos(headWorldAngle) * headSize * headFrontOffset;
                const rootY = head.worldPos.y + Math.sin(headWorldAngle) * headSize * headFrontOffset;
                
                const chain = [];
                for (let i = 0; i < segCount; i++) {
                    chain.push({
                        x: rootX + Math.cos(tentacleAngle) * segLen * (i + 1),
                        y: rootY + Math.sin(tentacleAngle) * segLen * (i + 1),
                        angle: tentacleAngle,
                        velX: 0,
                        velY: 0,
                        baseLength: segLen
                    });
                }
                this._mouthTentacleChains.push({
                    segments: chain,
                    baseAngleOffset: angleOffset
                });
            }
        }
        
        if (this._mouthTentacleChains.length === 0) return;

        // We're in head-local space (context already translated/rotated by _drawHead)
        // Convert chain world positions to head-local coordinates
        const headWorldX = head.worldPos.x;
        const headWorldY = head.worldPos.y;
        const cosH = Math.cos(-headWorldAngle);
        const sinH = Math.sin(-headWorldAngle);

        const thickness = this.mouthTentacleThickness || 4;
        const taper = this.mouthTentacleTaper || 0.7;
        const color = this.mouthColor || "#6b5a7d";
        const accentColor = this.mouthTentacleAccentColor || "";
        const showSuckers = this.mouthTentacleSuckers;

        // Visual root position (inside head at mouth area)
        const rootLocalX = headSize * visualRootOffset;
        const rootLocalY = 0;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw each tentacle chain
        for (let t = 0; t < this._mouthTentacleChains.length; t++) {
            const chainData = this._mouthTentacleChains[t];
            if (!chainData || !chainData.segments || !Array.isArray(chainData.segments)) continue;
            
            const chain = chainData.segments;
            const chainSegCount = chain.length;
            if (chainSegCount === 0) continue;

            // Convert chain world positions to head-local space
            const localPositions = [{ x: rootLocalX, y: rootLocalY }];
            for (let i = 0; i < chainSegCount; i++) {
                const seg = chain[i];
                if (!seg) continue;
                const dx = (seg.x || 0) - headWorldX;
                const dy = (seg.y || 0) - headWorldY;
                localPositions.push({
                    x: dx * cosH - dy * sinH,
                    y: dx * sinH + dy * cosH
                });
            }

            // Draw tapered segments (ponytail style)
            for (let i = 0; i < chainSegCount; i++) {
                if (i + 1 >= localPositions.length) break;
                const prevPos = localPositions[i];
                const currPos = localPositions[i + 1];
                
                // Taper from thick at root to thin at tip
                const taperT = i / chainSegCount;
                const segThickness = thickness * (1 - taperT * taper);

                // Alternate color
                const useAccent = accentColor && (i % 2 === 1);
                ctx.strokeStyle = useAccent ? accentColor : color;
                ctx.lineWidth = Math.max(1, segThickness);

                ctx.beginPath();
                ctx.moveTo(prevPos.x, prevPos.y);
                ctx.lineTo(currPos.x, currPos.y);
                ctx.stroke();

                // Suckers (optional)
                if (showSuckers && segThickness > 2 && i % 2 === 0) {
                    const suckerSize = segThickness * 0.25;
                    const midX = (prevPos.x + currPos.x) / 2;
                    const midY = (prevPos.y + currPos.y) / 2;

                    ctx.fillStyle = this._lightenColor(color, 0.2);
                    ctx.beginPath();
                    ctx.arc(midX, midY, suckerSize, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = this._darkenColor(color, 0.15);
                    ctx.beginPath();
                    ctx.arc(midX, midY, suckerSize * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Tip dot
            if (localPositions.length > 1) {
                const tipPos = localPositions[localPositions.length - 1];
                const tipThick = thickness * (1 - taper) * 0.8;
                ctx.fillStyle = accentColor || color;
                ctx.beginPath();
                ctx.arc(tipPos.x, tipPos.y, Math.max(1, tipThick * 0.5), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Draw a beak mouth (bird/octopus style)
     */
    _drawBeakMouth(ctx) {
        const length = this.beakLength || 15;
        const width = this.beakWidth || 10;
        const curve = this.beakCurve || 0.3;
        const color = this.mouthColor || "#6b5a7d";

        ctx.fillStyle = color;
        ctx.strokeStyle = this._darkenColor(color, 0.3);
        ctx.lineWidth = 1.5;

        // Upper beak
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.5, 0);
        ctx.quadraticCurveTo(
            this.headSize * 0.5 + length * 0.6, -width * 0.3 * curve,
            this.headSize * 0.5 + length, -width * 0.1
        );
        ctx.quadraticCurveTo(
            this.headSize * 0.5 + length * 0.8, -width * 0.05,
            this.headSize * 0.5 + length * 0.7, 0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower beak
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.5, 0);
        ctx.quadraticCurveTo(
            this.headSize * 0.5 + length * 0.5, width * 0.2,
            this.headSize * 0.5 + length * 0.65, width * 0.1
        );
        ctx.quadraticCurveTo(
            this.headSize * 0.5 + length * 0.7, width * 0.05,
            this.headSize * 0.5 + length * 0.7, 0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draw a proboscis mouth (mosquito/butterfly tube)
     */
    _drawProboscisMouth(ctx) {
        const length = this.proboscisLength || 30;
        const thickness = this.proboscisThickness || 2;
        const curl = this.proboscisCurl || 0;
        const color = this.mouthColor || "#6b5a7d";

        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';

        const startX = this.headSize * 0.5;
        const startY = 0;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        if (curl > 0) {
            // Draw curled proboscis (like a butterfly)
            const segments = 10;
            const curlAmount = curl * Math.PI * 2;
            let x = startX;
            let y = startY;
            
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const angle = curlAmount * t;
                const radius = length * (1 - t * 0.8) / (segments * 0.5);
                x += Math.cos(angle) * radius;
                y += Math.sin(angle) * radius;
                ctx.lineTo(x, y);
            }
        } else {
            // Straight proboscis
            ctx.lineTo(startX + length, startY);
        }
        ctx.stroke();

        // Tip
        ctx.fillStyle = this._darkenColor(color, 0.2);
        if (curl > 0) {
            // Tip is at the curl end
        } else {
            ctx.beginPath();
            ctx.arc(startX + length, startY, thickness * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw a lamprey mouth (circular with teeth rings)
     */
    _drawLampreyMouth(ctx) {
        const radius = this.lampreyRadius || 12;
        const teethRings = this.lampreyTeethRings || 2;
        const teethPerRing = this.lampreyTeethCount || 8;
        const color = this.mouthColor || "#6b5a7d";

        const centerX = this.headSize * 0.6;
        const centerY = 0;

        // Outer mouth circle
        ctx.fillStyle = this._darkenColor(color, 0.4);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner mouth (darker)
        ctx.fillStyle = this._darkenColor(color, 0.7);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw teeth rings
        ctx.fillStyle = this._lightenColor(color, 0.5);
        ctx.strokeStyle = this._darkenColor(color, 0.2);
        ctx.lineWidth = 0.5;

        for (let ring = 0; ring < teethRings; ring++) {
            const ringRadius = radius * (0.4 + ring * 0.25);
            const teethCount = teethPerRing + ring * 2;
            const toothLength = radius * 0.2;
            const toothWidth = radius * 0.08;

            for (let i = 0; i < teethCount; i++) {
                const angle = (i / teethCount) * Math.PI * 2;
                const toothX = centerX + Math.cos(angle) * ringRadius;
                const toothY = centerY + Math.sin(angle) * ringRadius;

                ctx.save();
                ctx.translate(toothX, toothY);
                ctx.rotate(angle + Math.PI / 2);

                // Draw tooth pointing inward
                ctx.beginPath();
                ctx.moveTo(-toothWidth, 0);
                ctx.lineTo(0, -toothLength);
                ctx.lineTo(toothWidth, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        }

        // Mouth rim
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw pincher mouth (ant/beetle style)
     */
    _drawPinchersMouth(ctx) {
        const length = this.pincherLength || 12;
        const curve = this.pincherCurve || 0.4;
        const gap = this.pincherGap || 8;
        const color = this.mouthColor || "#6b5a7d";

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        const startX = this.headSize * 0.4;

        // Left pincher
        ctx.beginPath();
        ctx.moveTo(startX, -gap / 2);
        ctx.quadraticCurveTo(
            startX + length * 0.6, -gap / 2 - length * curve * 0.5,
            startX + length, -gap * 0.2
        );
        ctx.stroke();

        // Left pincher tip
        ctx.beginPath();
        ctx.arc(startX + length, -gap * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Right pincher
        ctx.beginPath();
        ctx.moveTo(startX, gap / 2);
        ctx.quadraticCurveTo(
            startX + length * 0.6, gap / 2 + length * curve * 0.5,
            startX + length, gap * 0.2
        );
        ctx.stroke();

        // Right pincher tip
        ctx.beginPath();
        ctx.arc(startX + length, gap * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner serrations (small teeth on inner edge)
        const serrations = 3;
        ctx.lineWidth = 1;
        for (let i = 1; i <= serrations; i++) {
            const t = i / (serrations + 1);
            const sX = startX + length * t * 0.8;
            
            // Top pincher serration
            const topY = -gap / 2 - length * curve * 0.3 * Math.sin(t * Math.PI);
            ctx.beginPath();
            ctx.moveTo(sX, topY);
            ctx.lineTo(sX + 2, topY + 3);
            ctx.stroke();

            // Bottom pincher serration
            const botY = gap / 2 + length * curve * 0.3 * Math.sin(t * Math.PI);
            ctx.beginPath();
            ctx.moveTo(sX, botY);
            ctx.lineTo(sX + 2, botY - 3);
            ctx.stroke();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // WORM DIG MODE — PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start burrowing underground.
     * @param {boolean} [manual=true] - If true, suppresses auto-surface timer until resurface() is called
     */
    burrow(manual = true) {
        if (!this.wormDigEnabled) return;
        if (this._wormState === 'burrowing' || this._wormState === 'underground') return;
        this._wormState = 'burrowing';
        this._wormManualControl = manual;
        this._spawnWormDirtParticles(this._segments[0].worldPos.x, this._segments[0].worldPos.y, 'burrow');
    }

    /**
     * Surface from underground.
     */
    resurface() {
        if (!this.wormDigEnabled) return;
        if (this._wormState === 'surfacing' || this._wormState === 'above') return;
        this._wormState = 'surfacing';
        this._wormManualControl = false;
        this._wormHoldTimer = 0;
        // Spawn surface-burst particles at the head's last underground position
        if (this._segments.length > 0) {
            this._spawnWormDirtParticles(this._segments[0].worldPos.x, this._segments[0].worldPos.y, 'surface');
        }
    }

    /**
     * Returns true if the creature's head is currently underground (protected).
     */
    isUnderground() {
        if (!this.wormDigEnabled) return false;
        return this._wormState === 'underground' || this._wormState === 'burrowing';
    }

    /**
     * Returns true if the head segment is fully visible / above ground.
     */
    isAboveGround() {
        if (!this.wormDigEnabled) return true;
        return this._wormState === 'above';
    }

    /**
     * Returns true if the creature is mid-transition (surfacing or burrowing).
     */
    isBurrowing() {
        return this._wormState === 'burrowing';
    }

    isSurfacing() {
        return this._wormState === 'surfacing';
    }

    /**
     * Returns 0–1 visibility of a specific segment (1 = fully above ground).
     * @param {number} segIndex
     */
    getSegmentVisibility(segIndex) {
        if (!this.wormDigEnabled) return 1;
        if (!this._wormSegmentVisibility || segIndex >= this._wormSegmentVisibility.length) return 1;
        return this._wormSegmentVisibility[segIndex];
    }

    /**
     * Returns the current worm dig state string: 'above' | 'burrowing' | 'underground' | 'surfacing'
     */
    getWormState() {
        return this._wormState;
    }

    /**
     * Returns 0–1 representing how much of the creature is above ground.
     * 1 = fully above, 0 = fully buried.
     */
    getWormSurfacePercent() {
        if (!this.wormDigEnabled || !this._wormSegmentVisibility || this._wormSegmentVisibility.length === 0) return 1;
        const total = this._wormSegmentVisibility.reduce((s, v) => s + v, 0);
        return total / this._wormSegmentVisibility.length;
    }

    // ═══════════════════════════════════════════════════════════════
    // WORM DIG MODE — INTERNAL UPDATE
    // ═══════════════════════════════════════════════════════════════

    _updateWormDig(deltaTime) {
        if (!this.wormDigEnabled || this.isDead) return;

        const segCount = this._segments.length;

        // Initialise per-segment visibility array
        if (!this._wormSegmentVisibility || this._wormSegmentVisibility.length !== segCount) {
            this._wormSegmentVisibility = new Array(segCount).fill(1);
        }

        // ── Advance ripple animation phase ──────────────────────────
        this._wormIndicatorPhase = ((this._wormIndicatorPhase || 0) + deltaTime * 2.5) % (Math.PI * 2);

        // ── State machine ────────────────────────────────────────────
        const speed = Math.max(0.1, this.wormBurrowSpeed);
        const visStep = speed * deltaTime;   // Visibility change per frame

        switch (this._wormState) {

            case 'above': {
                // Ensure all segments visible
                for (let i = 0; i < segCount; i++) {
                    this._wormSegmentVisibility[i] = 1;
                }
                this._wormIsProtected = false;

                // Hold timer — after surfacing we wait before burrowing again
                if (!this._wormManualControl) {
                    this._wormHoldTimer += deltaTime;
                    if (this._wormHoldTimer >= this.wormSurfaceHoldTime) {
                        this._wormHoldTimer = 0;
                        this.burrow(false);
                    }
                }
                break;
            }

            case 'burrowing': {
                // Hide segments from head (index 0) toward tail progressively
                // _wormSurfacePercent drives overall progress: 1→0
                let allBuried = true;
                for (let i = 0; i < segCount; i++) {
                    // Head buries first; tail buries last
                    // Each segment starts hiding `i * 0.25` seconds after the head
                    const segDelay = i / segCount; // 0 for head, ~1 for tail
                    const targetVis = 0;
                    // Slide toward 0, but only after the leading wave reaches this segment
                    const currentVis = this._wormSegmentVisibility[i];
                    // Wave front: head (seg 0) hides immediately, rear segments follow
                    const waveProgress = Math.max(0, 1 - segDelay * 1.4); // 1 at head, 0 at tail initially
                    const effectiveTarget = (1 - this._getWormBurrowFrontPosition()) > segDelay ? 0 : 1;

                    if (currentVis > effectiveTarget) {
                        this._wormSegmentVisibility[i] = Math.max(effectiveTarget, currentVis - visStep * 1.5);
                    }
                    if (this._wormSegmentVisibility[i] > 0.01) allBuried = false;
                }

                // Head protection kicks in as soon as head is mostly buried
                this._wormIsProtected = this._wormSegmentVisibility[0] < 0.3;

                // Advance the internal burrow front
                if (!this._wormBurrowFront) this._wormBurrowFront = 0;
                this._wormBurrowFront = Math.min(1, this._wormBurrowFront + visStep * 0.5);

                // Spawn ongoing dirt trickle at transition point
                if (Math.random() < deltaTime * 4) {
                    const frontSeg = Math.floor(this._wormBurrowFront * (segCount - 1));
                    const seg = this._segments[Math.min(frontSeg, segCount - 1)];
                    this._spawnWormDirtParticles(seg.worldPos.x, seg.worldPos.y, 'trickle');
                }

                if (allBuried) {
                    this._wormState = 'underground';
                    this._wormBurrowFront = 1;
                    this._wormIsProtected = true;
                    // Schedule next auto-surface
                    this._scheduleNextSurface();
                }
                break;
            }

            case 'underground': {
                // All segments hidden
                for (let i = 0; i < segCount; i++) {
                    this._wormSegmentVisibility[i] = 0;
                }
                this._wormIsProtected = true;

                // Underground indicator ripple
                if (this.wormShowUndergroundIndicator) {
                    // Ripple is drawn in draw(), nothing to update here except phase (done above)
                }

                // Spawn occasional underground dirt puff at body center
                if (Math.random() < deltaTime * 1.5) {
                    const midSeg = this._segments[Math.floor(segCount / 2)];
                    this._spawnWormDirtParticles(midSeg.worldPos.x, midSeg.worldPos.y, 'underground');
                }

                // Auto-surface timer
                if (!this._wormManualControl) {
                    this._wormNextSurfaceTimer -= deltaTime;
                    if (this._wormNextSurfaceTimer <= 0) {
                        this.resurface();
                    }
                }
                break;
            }

            case 'surfacing': {
                // Reveal segments from head outward
                let allRevealed = true;

                if (!this._wormSurfaceFront) this._wormSurfaceFront = 0;
                this._wormSurfaceFront = Math.min(1, this._wormSurfaceFront + visStep * 0.6);

                for (let i = 0; i < segCount; i++) {
                    const segDelay = i / segCount;
                    const effectiveTarget = this._wormSurfaceFront > segDelay ? 1 : 0;
                    const currentVis = this._wormSegmentVisibility[i];

                    if (currentVis < effectiveTarget) {
                        const newVis = Math.min(1, currentVis + visStep * 2.5);
                        this._wormSegmentVisibility[i] = newVis;

                        // Spawn burst particles when this segment first emerges
                        if (currentVis < 0.15 && newVis >= 0.15) {
                            const seg = this._segments[i];
                            this._spawnWormDirtParticles(seg.worldPos.x, seg.worldPos.y, i === 0 ? 'surface' : 'trickle');
                        }
                    }
                    if (this._wormSegmentVisibility[i] < 0.99) allRevealed = false;
                }

                // Head exposed — no longer protected
                this._wormIsProtected = this._wormSegmentVisibility[0] < 0.5;

                // Auto-attack when head emerges
                if (this.wormAttackOnSurface && this._wormSegmentVisibility[0] > 0.5 && !this._wormAttackedThisSurface) {
                    this._wormAttackedThisSurface = true;
                    this._wormDoSurfaceAttack();
                }

                if (allRevealed) {
                    this._wormState = 'above';
                    this._wormSurfaceFront = 0;
                    this._wormBurrowFront = 0;
                    this._wormHoldTimer = 0;
                    this._wormAttackedThisSurface = false;
                    this._wormIsProtected = false;
                    for (let i = 0; i < segCount; i++) {
                        this._wormSegmentVisibility[i] = 1;
                    }
                }
                break;
            }
        }

        // Update dirt particles
        this._updateWormDirtParticles(deltaTime);

        // Sync invulnerability with burrow protection
        // (Only override isInvulnerable if worm dig is enabled)
        if (this.wormDigEnabled) {
            this._wormOriginalInvulnerable = this._wormOriginalInvulnerable ?? this.isInvulnerable;
            if (this._wormIsProtected) {
                this.isInvulnerable = true;
            } else {
                this.isInvulnerable = this._wormOriginalInvulnerable;
            }
        }
    }

    _getWormBurrowFrontPosition() {
        return this._wormBurrowFront || 0;
    }

    _scheduleNextSurface() {
        const [min, max] = Array.isArray(this.wormAutoSurfaceInterval) ? this.wormAutoSurfaceInterval : [4, 10];
        this._wormNextSurfaceTimer = min + Math.random() * (max - min);
        this._wormAttackedThisSurface = false;
    }

    _wormDoSurfaceAttack() {
        // Try to attack the nearest enemy
        const engine = this.gameObject._engine;
        const instances = engine ? engine.instances : null;
        if (!instances) return;

        const myPos = this.gameObject.getWorldPosition();
        const enemyTags = this.targetingEnemyTag ? this.targetingEnemyTag.split(',').map(t => t.trim()) : [];
        const friendlyTags = this.targetingFriendlyTag ? this.targetingFriendlyTag.split(',').map(t => t.trim()) : [];

        let nearest = null;
        let nearestDist = this.targetingRange * 1.5 || 400;

        for (const obj of instances) {
            if (obj === this.gameObject) continue;
            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature || creature.isDead) continue;

            // Skip friendlies
            let isFriendly = false;
            if (obj.hasTag) {
                for (const t of friendlyTags) { if (obj.hasTag(t)) { isFriendly = true; break; } }
            }
            if (isFriendly) continue;

            // Must match enemy tag if specified
            let isEnemy = enemyTags.length === 0;
            if (obj.hasTag) {
                for (const t of enemyTags) { if (obj.hasTag(t)) { isEnemy = true; break; } }
            }
            if (!isEnemy) continue;

            const dx = obj.position.x - myPos.x;
            const dy = obj.position.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = obj;
            }
        }

        if (nearest) {
            this.punchAlternate(nearest.position.x, nearest.position.y);
        } else {
            this.headbutt();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // WORM DIG MODE — DIRT PARTICLES
    // ═══════════════════════════════════════════════════════════════

    _spawnWormDirtParticles(worldX, worldY, type = 'burrow') {
        const count = type === 'trickle' ? Math.ceil(this.wormParticleCount * 0.3) :
                    type === 'underground' ? Math.ceil(this.wormParticleCount * 0.2) :
                    this.wormParticleCount;

        const spreadRad = (this.wormParticleSpread || 140) * Math.PI / 180;
        // Surface bursts go upward, burrow bursts go sideways
        const baseAngle = type === 'surface' ? -Math.PI / 2 : // upward
                        type === 'burrow'  ? -Math.PI / 2 :  // also upward (entering ground)
                        Math.random() * Math.PI * 2;          // random for underground puffs

        const speed = this.wormParticleSpeed || 60;
        const life = this.wormParticleLifetime || 0.6;
        const size = this.wormParticleSize || 5;
        const gravity = type === 'underground' ? 0 : 120;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spreadRad;
            const particleSpeed = speed * (0.4 + Math.random() * 0.8);
            const useAccent = Math.random() > 0.5;

            this._wormDirtParticles.push({
                x: worldX + (Math.random() - 0.5) * 8,
                y: worldY + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                life: life * (0.6 + Math.random() * 0.6),
                maxLife: life,
                size: size * (0.4 + Math.random() * 0.8),
                color: useAccent ? this.wormParticleAccentColor : this.wormParticleColor,
                gravity: gravity,
                type: type
            });
        }
    }

    _updateWormDirtParticles(deltaTime) {
        for (let i = this._wormDirtParticles.length - 1; i >= 0; i--) {
            const p = this._wormDirtParticles[i];
            p.life -= deltaTime;
            if (p.life <= 0) { this._wormDirtParticles.splice(i, 1); continue; }
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += p.gravity * deltaTime;
            p.vx *= Math.pow(0.88, deltaTime * 60);
            p.vy *= Math.pow(0.94, deltaTime * 60);
        }
    }

    _drawWormDirtParticles(ctx) {
        if (this._wormDirtParticles.length === 0) return;
        ctx.save();
        for (const p of this._wormDirtParticles) {
            const t = 1 - (p.life / p.maxLife);
            const alpha = 1 - t * t; // Fade out
            const radius = p.size * (1 - t * 0.4);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawWormUndergroundIndicator(ctx) {
        if (!this.wormDigEnabled) return;
        if (!this.wormShowUndergroundIndicator) return;
        if (this._wormState !== 'underground' && this._wormState !== 'burrowing') return;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Determine how buried we are (0=above, 1=fully underground)
        const buriedAmount = this._wormState === 'underground' ? 1 :
            1 - (this._wormSegmentVisibility ? (this._wormSegmentVisibility.reduce((s, v) => s + v, 0) / Math.max(1, this._wormSegmentVisibility.length)) : 1);

        const opacity = this.wormIndicatorOpacity * Math.min(1, buriedAmount * 2);
        if (opacity < 0.01) return;

        const phase = this._wormIndicatorPhase || 0;
        const scale = this.wormIndicatorSize || 1;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Draw a soft elongated ripple for each segment position
        const segCount = this._segments.length;
        for (let i = 0; i < segCount; i++) {
            const seg = this._segments[i];
            const segVis = this._wormSegmentVisibility ? this._wormSegmentVisibility[i] : 0;
            if (segVis > 0.5) continue; // Skip visible segments

            const dx = seg.worldPos.x - worldPos.x;
            const dy = seg.worldPos.y - worldPos.y;
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const taperFactor = 1 - (i / segCount) * this.tailTaper;
            const baseRadius = this.bodyWidth * taperFactor * 0.5 * scale;

            // Animated ripple rings
            const ringPhase = (phase + i * 0.4) % (Math.PI * 2);
            const rippleScale = 1 + Math.sin(ringPhase) * 0.25;
            const rippleAlpha = (1 - (i / segCount) * 0.5) * (1 - segVis);

            ctx.globalAlpha = opacity * rippleAlpha;
            ctx.strokeStyle = this.wormIndicatorColor;
            ctx.lineWidth = Math.max(1, baseRadius * 0.35);

            // Outer ripple ring
            ctx.beginPath();
            ctx.ellipse(localX, localY, baseRadius * rippleScale * 1.3, baseRadius * rippleScale * 0.6, seg.angle - bodyAngle, 0, Math.PI * 2);
            ctx.stroke();

            // Inner fill dot
            ctx.globalAlpha = opacity * rippleAlpha * 0.3;
            ctx.fillStyle = this.wormIndicatorColor;
            ctx.beginPath();
            ctx.ellipse(localX, localY, baseRadius * 0.9, baseRadius * 0.4, seg.angle - bodyAngle, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Helper: Darken a hex color
     */
    _darkenColor(hex, amount) {
        const rgb = this._hexToRgb(hex);
        if (!rgb) return hex;
        const factor = 1 - amount;
        return this._rgbToHex(
            Math.round(rgb.r * factor),
            Math.round(rgb.g * factor),
            Math.round(rgb.b * factor)
        );
    }

    /**
     * Helper: Lighten a hex color
     */
    _lightenColor(hex, amount) {
        const rgb = this._hexToRgb(hex);
        if (!rgb) return hex;
        return this._rgbToHex(
            Math.round(rgb.r + (255 - rgb.r) * amount),
            Math.round(rgb.g + (255 - rgb.g) * amount),
            Math.round(rgb.b + (255 - rgb.b) * amount)
        );
    }

    /**
     * Helper: Hex to RGB
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Helper: RGB to Hex
     */
    _rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = Math.max(0, Math.min(255, x)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // PUBLIC API METHODS

    /**
     * Check if a world point is inside any body segment
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object|null} - {segmentIndex, localX, localY, distance} or null if not hit
     */
    isPointInBody(worldX, worldY) {
        for (let i = 0; i < this._segments.length; i++) {
            const segment = this._segments[i];
            const taperFactor = 1 - (i / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;

            // Transform point to segment local space
            const dx = worldX - segment.worldPos.x;
            const dy = worldY - segment.worldPos.y;
            const cos = Math.cos(-segment.angle);
            const sin = Math.sin(-segment.angle);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            let isInside = false;
            const distance = Math.sqrt(localX * localX + localY * localY);

            // Check based on body shape
            switch (this.bodyShape) {
                case "circle":
                    isInside = distance <= (width * 0.5);
                    break;
                case "rectangle":
                    isInside = Math.abs(localX) <= this.segmentLength * 0.4 &&
                        Math.abs(localY) <= width * 0.5;
                    break;
                case "triangle":
                    if (localX <= this.segmentLength * 0.4 && localX >= -this.segmentLength * 0.4) {
                        const maxY = width * 0.5;
                        isInside = Math.abs(localY) <= maxY;
                    }
                    break;
                default: // ellipse
                    const rx = this.segmentLength * 0.6 * this.bodyScaleX;
                    const ry = width * 0.5 * this.bodyScaleY;
                    isInside = ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry)) <= 1;
            }

            if (isInside) {
                return {
                    segmentIndex: i,
                    localX: localX,
                    localY: localY,
                    distance: distance,
                    worldPos: { x: segment.worldPos.x, y: segment.worldPos.y },
                    angle: segment.angle
                };
            }
        }
        return null;
    }

    /**
     * Get world position of a specific body segment
     * @param {number} segmentIndex - Index of the segment (0 = head)
     * @returns {Object|null} - {x, y, angle} or null if invalid index
     */
    getSegmentWorldPosition(segmentIndex) {
        if (segmentIndex < 0 || segmentIndex >= this._segments.length) {
            return null;
        }
        const segment = this._segments[segmentIndex];
        return {
            x: segment.worldPos.x,
            y: segment.worldPos.y,
            angle: segment.angle
        };
    }

    /**
     * Get the closest point on any body segment to a world point
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - {segmentIndex, worldX, worldY, distance}
     */
    getClosestPointOnBody(worldX, worldY) {
        let closestSegment = 0;
        let closestDist = Infinity;
        let closestPoint = { x: 0, y: 0 };

        for (let i = 0; i < this._segments.length; i++) {
            const segment = this._segments[i];
            const dx = worldX - segment.worldPos.x;
            const dy = worldY - segment.worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestDist = dist;
                closestSegment = i;
                closestPoint.x = segment.worldPos.x;
                closestPoint.y = segment.worldPos.y;
            }
        }

        return {
            segmentIndex: closestSegment,
            worldX: closestPoint.x,
            worldY: closestPoint.y,
            distance: closestDist
        };
    }

    /**
     * Get total number of body segments
     * @returns {number}
     */
    getSegmentCount() {
        return this._segments.length;
    }

    /**
     * Get array of all segment world positions
     * @returns {Array<Object>} - Array of {x, y, angle, width}
     */
    getAllSegmentPositions() {
        return this._segments.map((segment, i) => {
            const taperFactor = 1 - (i / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;
            return {
                x: segment.worldPos.x,
                y: segment.worldPos.y,
                angle: segment.angle,
                width: width
            };
        });
    }

    /**
     * Get world position of a specific hand
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @returns {Object|null} - {x, y, isReaching, target} or null if invalid index
     */
    getHandPosition(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        const arm = this._arms[armIndex];
        return {
            x: arm.currentHandPos.x,
            y: arm.currentHandPos.y,
            isReaching: arm.reachingTarget !== null,
            target: arm.reachingTarget
        };
    }

    /**
     * Get all hand positions
     * @returns {Array<Object>} - Array of {x, y, isReaching, target}
     */
    getAllHandPositions() {
        return this._arms.map((arm, index) => ({
            index: index,
            x: arm.currentHandPos.x,
            y: arm.currentHandPos.y,
            isReaching: arm.reachingTarget !== null,
            target: arm.reachingTarget
        }));
    }

    /**
     * Set target position for a specific hand (overrides automatic reaching)
     * @param {number} armIndex - Index of the arm
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    setHandTarget(armIndex, worldX, worldY, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const arm = this._arms[armIndex];
        arm.targetHandPos.x = worldX;
        arm.targetHandPos.y = worldY;
        arm.manualControl = !temporary;
        return true;
    }

    /**
     * Release manual control of a hand, returning it to automatic behavior
     * @param {number} armIndex - Index of the arm
     */
    releaseHandControl(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        this._arms[armIndex].manualControl = false;
        return true;
    }

    /**
     * Check if a hand is currently reaching for an object
     * @param {number} armIndex - Index of the arm
     * @returns {Object|null} - The target object or null
     */
    getHandTarget(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        return this._arms[armIndex].reachingTarget;
    }

    /**
     * Point a specific hand toward a position relative to the creature's position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} relativeX - X offset from creature position
     * @param {number} relativeY - Y offset from creature position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtRelative(armIndex, relativeX, relativeY, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const worldPos = this.gameObject.getWorldPosition();
        const worldX = worldPos.x + relativeX;
        const worldY = worldPos.y + relativeY;
        return this.setHandTarget(armIndex, worldX, worldY, temporary);
    }

    /**
     * Point a specific hand toward an absolute world position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtWorld(armIndex, worldX, worldY, temporary = false) {
        return this.setHandTarget(armIndex, worldX, worldY, temporary);
    }

    /**
     * Point a specific hand toward the mouse position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtMouse(armIndex, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        // Get mouse position - check for InputManager
        let mouseX, mouseY;

        const _enginePH = this.gameObject._engine;
        if (_enginePH && _enginePH.inputManager) {
            // Use InputManager if available
            mouseX = _enginePH.inputManager.mouseX;
            mouseY = _enginePH.inputManager.mouseY;
        } else if (_enginePH && _enginePH.canvas) {
            // Fallback: try to get mouse position from canvas events
            const canvas = _enginePH.canvas;
            const rect = canvas.getBoundingClientRect();

            // These might not be set yet, so we'll need to track them
            if (!this._mouseX || !this._mouseY) {
                // Add mouse move listener if not already added
                if (!this._mouseListenerAdded) {
                    canvas.addEventListener('mousemove', (e) => {
                        this._mouseX = e.clientX - rect.left;
                        this._mouseY = e.clientY - rect.top;
                    });
                    this._mouseListenerAdded = true;
                }
                return false; // Mouse position not available yet
            }
            mouseX = this._mouseX;
            mouseY = this._mouseY;
        } else {
            return false; // No way to get mouse position
        }

        return this.setHandTarget(armIndex, mouseX, mouseY, temporary);
    }

    /**
     * Point all hands toward a relative position
     * @param {number} relativeX - X offset from creature position
     * @param {number} relativeY - Y offset from creature position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtRelative(relativeX, relativeY, temporary = false) {
        const worldPos = this.gameObject.getWorldPosition();
        const worldX = worldPos.x + relativeX;
        const worldY = worldPos.y + relativeY;

        for (let i = 0; i < this._arms.length; i++) {
            this.setHandTarget(i, worldX, worldY, temporary);
        }
    }

    /**
     * Point all hands toward an absolute world position
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtWorld(worldX, worldY, temporary = false) {
        for (let i = 0; i < this._arms.length; i++) {
            this.setHandTarget(i, worldX, worldY, temporary);
        }
    }

    /**
     * Point all hands toward the mouse position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtMouse(temporary = false) {
        for (let i = 0; i < this._arms.length; i++) {
            this.pointHandAtMouse(i, temporary);
        }
    }

    /**
     * Point the right hand toward a position (uses first right-side arm)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointRightHandAt(worldX, worldY, temporary = false) {
        // Find first right-side arm (side === 1)
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.setHandTarget(rightArmIndex, worldX, worldY, temporary);
    }

    /**
     * Point the left hand toward a position (uses first left-side arm)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointLeftHandAt(worldX, worldY, temporary = false) {
        // Find first left-side arm (side === -1)
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.setHandTarget(leftArmIndex, worldX, worldY, temporary);
    }

    /**
     * Make an arm perform a punch animation (Punch-Out!! style)
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} targetWorldX - Optional target X (defaults to forward direction)
     * @param {number} targetWorldY - Optional target Y (defaults to forward direction)
     * @returns {boolean} - Success status
     */
    punchWithArm(armIndex, targetWorldX = null, targetWorldY = null) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        const arm = this._arms[armIndex];

        // Don't interrupt an active punch
        if (arm.state === 'punching') {
            return false;
        }

        // Don't interrupt grab states (but holdingItem is allowed - swing the weapon!)
        if (arm.state === 'grabbing' || arm.state === 'holding') {
            return false;
        }

        // Enforce cooldown: check if ANY arm finished punching too recently
        if (this.punchCooldown > 0) {
            const now = performance.now() / 1000;
            for (let a = 0; a < this._arms.length; a++) {
                if (a === armIndex) continue; // don't block on self
                const otherArm = this._arms[a];
                if (now - otherArm._lastPunchEndTime < this.punchCooldown) {
                    return false;
                }
            }
            // Also check if THIS arm finished too recently
            if (now - arm._lastPunchEndTime < this.punchCooldown) {
                return false;
            }
        }

        const head = this._segments[0];
        const bodyFacingAngle = head.angle; // Body facing direction (without head-look offset)
        const headWorldAngle = head.angle + this._headAngle; // Includes head-look (used only for visual reference)

        // Calculate base position using body angle (not head-look), so arm base is consistent
        const perpendicularAngle = bodyFacingAngle + (Math.PI / 2) * arm.side;
        const baseRadius = this.headSize * 0.4;
        const baseWorldX = head.worldPos.x + Math.cos(perpendicularAngle) * baseRadius;
        const baseWorldY = head.worldPos.y + Math.sin(perpendicularAngle) * baseRadius;

        // Calculate punch direction using body facing angle for consistency
        // Both keyboard (no target) and mouse (with target) now share the same body-relative frame
        let punchAngle;
        if (targetWorldX !== null && targetWorldY !== null) {
            punchAngle = Math.atan2(targetWorldY - baseWorldY, targetWorldX - baseWorldX);
        } else {
            // Default: punch forward in the creature's body facing direction (NOT head-look direction)
            punchAngle = bodyFacingAngle;
        }

        arm.state = 'punching';
        arm.stateTime = 0;
        arm.stateStartPos.x = arm.currentHandPos.x;
        arm.stateStartPos.y = arm.currentHandPos.y;

        // If this arm was supporting a two-handed weapon, release the grip
        if (arm._twoHandedTarget) {
            arm._twoHandedTarget = null;
            arm._twoHandedSourceArm = -1;
        }
        // If this arm was supporting a foregrip, release the grip
        if (arm._foregripTarget) {
            arm._foregripTarget = null;
            arm._foregripSourceArm = -1;
        }

        // Store the initial body angle so both arc swing and bare-fist punch
        // can track body rotation during the animation (creature-relative animation)
        arm._punchInitialBodyAngle = bodyFacingAngle;
        arm._punchAngle = punchAngle; // The direction of the punch (body-relative when no target)

        // If holding an item, use arc swing instead of linear punch
        if (arm.heldItem) {
            const item = arm.heldItem;

            // === GUN ITEM: fire projectile instead of swinging ===
            if (item.itemType === 'gun' && typeof item.fireProjectile === 'function') {
                arm._isSwinging = false;
                arm._isFiring = true;

                // Use the trigger system: pressTrigger handles single vs auto mode
                if (typeof item.pressTrigger === 'function') {
                    item.pressTrigger();
                } else {
                    item.fireProjectile();
                }

                // Brief recoil animation: push arm back then spring-recover
                // The recoil amount and arm kickback come from the item properties
                const recoilDist = (item.recoilAmount || 8) * (item.recoilArmKickback || 0.3);
                const recoilAngle = punchAngle + Math.PI; // opposite direction

                arm.state = 'punching';
                arm.stateTime = 0;
                arm._punchWindupDist = 0;
                arm._punchReachDist = -recoilDist; // negative = push backward
                arm._punchCrossBody = false;
                arm._isSwinging = false;

                // Quick recoil timing — scales with fire rate for automatic weapons
                const isAuto = item.fireMode === 'automatic';
                const shotInterval = 1.0 / (item.fireRate || 5);
                arm._swingWindupTime = 0;
                arm._swingSlashTime = isAuto ? Math.min(0.03, shotInterval * 0.3) : 0.04;
                arm._swingFollowTime = isAuto ? Math.min(0.08, shotInterval * 0.6) : 0.12;

                this._lastPunchTime = performance.now() / 1000;
                return true;
            }

            const itemWeight = item.weight || 1.0;
            const itemBalance = item.weightBalance || 0.5;
            const swingSpd = item.swingSpeed || 1.0;
            const strength = Math.max(0.1, this.getEffectiveArmStrength(armIndex));

            // Get item geometry: how far from the hand is the weight point and tip
            const gripToWeight = (typeof item.getGripToWeightDistance === 'function')
                ? item.getGripToWeightDistance() : (item.itemLength || 30) * itemBalance;
            const gripToTip = (typeof item.getGripToTipDistance === 'function')
                ? item.getGripToTipDistance() : (item.itemLength || 30) * 0.5;
            const itemEffectiveLength = Math.max(gripToTip, gripToWeight, 5);

            // Moment of inertia: heavier + tip-heavy = slower swing, armStrength resists
            // Two-handed items are easier to swing due to doubled effective arm strength
            const momentOfInertia = 0.5 + (itemWeight - 1.0) * 0.15 + itemBalance * itemWeight * 0.12;
            const speedFactor = swingSpd * Math.sqrt(strength) / momentOfInertia;

            // === IK TARGET-BASED ATTACK SYSTEM ===
            // Instead of pre-calculated arcs, we set a target point in front of the creature
            // at attack range distance. The arm IK will try to drive the item's weight offset
            // point to hit that target, respecting joint limits and physics.

            arm._isSwinging = true;
            arm._isStabbing = false;
            arm._ikAttack = true; // Flag: use new IK target system

            // The target hit point: in front of the creature at the item's attack range
            const attackRange = (typeof item.getAttackRange === 'function')
                ? item.getAttackRange() : (item.itemLength || 30);
            // Total reach = arm length + distance from grip to the weight impact point
            const totalHitDist = this.armLength * 0.85 + gripToWeight;

            // Set the target point the weight-offset of the item needs to reach
            arm._ikTargetX = head.worldPos.x + Math.cos(punchAngle) * totalHitDist;
            arm._ikTargetY = head.worldPos.y + Math.sin(punchAngle) * totalHitDist;
            arm._ikAttackAngle = punchAngle;
            arm._ikItemLength = itemEffectiveLength;
            arm._ikGripToWeight = gripToWeight;
            arm._ikGripToTip = gripToTip;

            // Arm joint limits (natural range of motion)
            // Shoulder can swing ~150 degrees from center, elbow can bend ~150 degrees
            arm._ikShoulderMaxAngle = Math.PI * 0.83; // ~150 degrees from forward
            arm._ikElbowMinAngle = Math.PI * 0.15;    // Can't fold arm completely flat
            arm._ikElbowMaxAngle = Math.PI * 0.92;    // ~165 degrees (nearly straight)

            // Physics state
            arm._ikPhase = 'windup'; // windup -> strike -> followthrough
            arm._ikPhaseTime = 0;

            // Windup: open arm away from body and pull back
            // Stronger arms can coil more, heavier items resist being pulled back
            const muscleCoil = Math.min(1.5, strength * 0.7 / Math.max(0.3, momentOfInertia));
            
            // Use item's swingAngleOffset to determine how far back to pull (in radians)
            // swingAngleOffset is in degrees - convert to radians
            // Default to 90 degrees if not set, allowing coverage of full front arc
            const itemSwingAngle = (item.swingAngleOffset !== undefined ? item.swingAngleOffset : 90) * Math.PI / 180;
            
            // Negate arm.side so left arm winds up to the right and vice versa
            // (natural swing: right arm swings left-to-right, left arm swings right-to-left)
            // Use itemSwingAngle to scale how far outward the arm goes - larger angle = wider swing
            const swingScaleFactor = Math.min(itemSwingAngle / (Math.PI * 0.5), 2.0); // Scale relative to 90 degrees
            const windupOutwardAngle = -arm.side * (Math.PI * 0.25 + swingScaleFactor * Math.PI * 0.35 + muscleCoil * Math.PI * 0.1);
            const windupBackAngle = -Math.PI * 0.2 * muscleCoil * swingScaleFactor;
            arm._ikWindupAngle = punchAngle + Math.PI + windupOutwardAngle + windupBackAngle;
            arm._ikWindupDist = this.armLength * (0.5 + muscleCoil * 0.3);
            
            // Store swing angle for strike phase to determine arc coverage
            arm._ikSwingArcAngle = itemSwingAngle;

            // Store initial state
            arm._ikStartHandX = arm.currentHandPos.x;
            arm._ikStartHandY = arm.currentHandPos.y;
            arm._swingBaseX = baseWorldX;
            arm._swingBaseY = baseWorldY;
            arm._swingItemWeight = itemWeight;
            arm._swingItemBalance = itemBalance;
            arm._swingMomentOfInertia = momentOfInertia;
            arm._swingAngularVelocity = 0;
            arm._swingPrevAngle = Math.atan2(
                arm.currentHandPos.y - baseWorldY,
                arm.currentHandPos.x - baseWorldX
            );

            // Clear hit tracking for this new swing
            this._swingHitTargets.clear();

            // Calculate phase timings based on weight vs strength
            const baseDuration = 1.0 / this.punchSpeed;
            const weightedDuration = baseDuration / speedFactor;
            // Heavier items = longer windup (harder to pull back), faster strike (momentum)
            // Stronger arms = shorter windup, snappier strike
            const heaviness = itemWeight * (0.3 + itemBalance * 0.7) / strength;
            const windupMul = 0.30 + Math.min(heaviness * 0.1, 0.2);
            const strikeMul = 0.25 - Math.min(heaviness * 0.03, 0.08);
            const followMul = 1.0 - windupMul - strikeMul;
            arm._ikWindupTime = weightedDuration * windupMul;
            arm._ikStrikeTime = weightedDuration * Math.max(0.12, strikeMul);
            arm._ikFollowTime = weightedDuration * followMul;

            // Store velocity tracking for angular lag
            arm._ikPrevHandAngle = arm._swingPrevAngle;

        } else {
            arm._isSwinging = false;
            // Clear punch hit tracking for bare-fist punches
            this._punchHitTargets.clear();

            // Store punch geometry as body-relative offsets so the animation
            // tracks the creature's position and rotation every frame.
            // These are angular offsets relative to punchAngle, stored as distances.
            const windupDist = this.armLength * this.punchWindupDistance;
            const reachDist = this.armLength * this.punchReachDistance;

            if (this.punchCrossBody) {
                // Cross-body: windup pulls to the arm's side, reach crosses to opposite side
                // Store as angle offsets relative to body facing
                arm._punchWindupAngleOffset = (Math.PI / 2) * arm.side; // side angle for windup
                arm._punchWindupDist = windupDist;
                arm._punchCrossAngleOffset = (Math.PI / 2) * (-arm.side) * this.punchCrossAmount;
                arm._punchReachDist = reachDist;
                arm._punchCrossBody = true;
            } else {
                // Straight punch: windup pulls back, reach extends forward
                arm._punchWindupDist = windupDist;
                arm._punchReachDist = reachDist;
                arm._punchCrossBody = false;
            }
        }

        // Update combo tracking
        this._lastPunchTime = performance.now() / 1000;

        return true;
    }

    /**
     * Release the trigger on any gun held by the specified arm (or all arms).
     * Call this on mouse-up / action-release to stop automatic fire.
     * @param {number} [armIndex=-1] - Arm index, or -1 for all arms
     */
    stopFiring(armIndex = -1) {
        const armsToRelease = armIndex >= 0 ? [this._arms[armIndex]] : this._arms;
        for (const arm of armsToRelease) {
            if (!arm || !arm.heldItem) continue;
            if (arm.heldItem.itemType === 'gun' && typeof arm.heldItem.releaseTrigger === 'function') {
                arm.heldItem.releaseTrigger();
            }
            if (arm._isFiring) {
                arm._isFiring = false;
                // If the arm was in the brief recoil 'punching' state from firing,
                // return it to holdingItem so the aim-IK takes over again
                if (arm.state === 'punching') {
                    arm.state = 'holdingItem';
                    arm.stateTime = 0;
                }
            }
        }
    }

    /**
     * Perform a combo punch - automatically cycles through arms
     * Call this repeatedly to chain punches with alternating arms
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchCombo(targetWorldX = null, targetWorldY = null) {
        if (this._arms.length === 0) return false;

        const currentTime = performance.now() / 1000;
        const timeSinceLastPunch = currentTime - this._lastPunchTime;

        // Reset combo if too much time has passed
        if (timeSinceLastPunch > this._comboWindow * 2) {
            this._comboArmIndex = 0;
        }

        // Try to find an arm that's not currently punching
        let attempts = 0;
        while (attempts < this._arms.length) {
            const arm = this._arms[this._comboArmIndex];
            
            if (arm.state !== 'punching') {
                const success = this.punchWithArm(this._comboArmIndex, targetWorldX, targetWorldY);
                if (success) {
                    // Advance to next arm for combo
                    this._comboArmIndex = (this._comboArmIndex + 1) % this._arms.length;
                    return true;
                }
            }
            
            // Try next arm
            this._comboArmIndex = (this._comboArmIndex + 1) % this._arms.length;
            attempts++;
        }

        return false;
    }

    /**
     * Punch with alternating left/right arms (Punch-Out!! style)
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchAlternate(targetWorldX = null, targetWorldY = null) {
        // If no arms, use headbutt attack instead
        if (this._arms.length === 0) {
            return this.headbutt(targetWorldX, targetWorldY);
        }

        // Check if any arms are holding items - if so, only use those arms (as weapons)
        const armsWithItems = this._arms.filter(arm => arm.heldItem);
        const armsToUse = armsWithItems.length > 0 ? armsWithItems : this._arms;
        
        if (armsToUse.length === 0) return false;

        // Cycle through ALL available arms sequentially
        // Wrap the combo index to the available arms count
        const startIndex = this._comboArmIndex % armsToUse.length;
        
        // Try each arm starting from current combo position
        for (let attempt = 0; attempt < armsToUse.length; attempt++) {
            const armArrayIndex = (startIndex + attempt) % armsToUse.length;
            const arm = armsToUse[armArrayIndex];
            const globalArmIndex = this._arms.indexOf(arm);
            
            // Arms holding items CAN punch (swing weapon!) - only skip if actively punching or grabbing
            if (arm.state !== 'punching' && arm.state !== 'grabbing') {
                if (this.punchWithArm(globalArmIndex, targetWorldX, targetWorldY)) {
                    this._comboArmIndex = armArrayIndex + 1;
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Make the right hand punch
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchRight(targetWorldX = null, targetWorldY = null) {
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.punchWithArm(rightArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Make the left hand punch
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchLeft(targetWorldX = null, targetWorldY = null) {
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.punchWithArm(leftArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Headbutt/bite attack for creatures without arms.
     * Uses the same punch properties (punchDamage, punchKnockback, punchSpeed, punchCooldown).
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    headbutt(targetWorldX = null, targetWorldY = null) {
        // Check cooldown
        const now = performance.now() / 1000;
        if (now - this._lastHeadbuttTime < this.punchCooldown) {
            return false;
        }
        
        // Don't headbutt if already headbutting
        if (this._isHeadbutting) {
            return false;
        }
        
        const head = this._segments[0];
        if (!head) return false;
        
        // Calculate headbutt direction
        let headbuttAngle;
        if (targetWorldX !== null && targetWorldY !== null) {
            headbuttAngle = Math.atan2(targetWorldY - head.worldPos.y, targetWorldX - head.worldPos.x);
        } else {
            // Default: headbutt forward in creature's facing direction
            headbuttAngle = head.angle;
        }
        
        // Start headbutt animation
        this._isHeadbutting = true;
        this._headbuttTime = 0;
        this._headbuttAngle = headbuttAngle;
        this._headbuttPhase = 'windup'; // windup -> strike -> recover
        this._headbuttHitTargets = new Set();
        this._lastHeadbuttTime = now;
        
        return true;
    }
    
    /**
     * Update headbutt animation and collision detection.
     * Called from the main loop.
     * @param {number} deltaTime - Time since last frame
     */
    _updateHeadbutt(deltaTime) {
        if (!this._isHeadbutting) return;
        
        this._headbuttTime += deltaTime * this.punchSpeed;
        const head = this._segments[0];
        if (!head) {
            this._isHeadbutting = false;
            return;
        }
        
        const windupDuration = 0.3;
        const strikeDuration = 0.2;
        const recoverDuration = 0.4;
        
        let headOffset = 0;
        
        if (this._headbuttPhase === 'windup') {
            // Pull head back
            const t = Math.min(1, this._headbuttTime / windupDuration);
            headOffset = -this.headSize * 0.3 * Math.sin(t * Math.PI * 0.5);
            
            if (this._headbuttTime >= windupDuration) {
                this._headbuttPhase = 'strike';
                this._headbuttTime = 0;
            }
        } else if (this._headbuttPhase === 'strike') {
            // Thrust head forward
            const t = Math.min(1, this._headbuttTime / strikeDuration);
            headOffset = this.headSize * 0.6 * Math.sin(t * Math.PI);
            
            // Check for hits during strike phase
            if (t > 0.2 && t < 0.8) {
                this._checkHeadbuttCollisions();
            }
            
            if (this._headbuttTime >= strikeDuration) {
                this._headbuttPhase = 'recover';
                this._headbuttTime = 0;
            }
        } else if (this._headbuttPhase === 'recover') {
            // Return to normal
            const t = Math.min(1, this._headbuttTime / recoverDuration);
            headOffset = this.headSize * 0.2 * (1 - t);
            
            if (this._headbuttTime >= recoverDuration) {
                this._isHeadbutting = false;
                this._headbuttPhase = null;
            }
        }
        
        // Store offset for rendering
        this._headbuttOffset = headOffset;
    }
    
    /**
     * Check for headbutt collisions with other creatures
     */
    _checkHeadbuttCollisions() {
        const head = this._segments[0];
        if (!head) return;
        
        // Calculate head collision position (offset by headbutt)
        const headX = head.worldPos.x + Math.cos(this._headbuttAngle) * (this._headbuttOffset || 0);
        const headY = head.worldPos.y + Math.sin(this._headbuttAngle) * (this._headbuttOffset || 0);
        const hitRadius = this.headSize * 1.2;
        
        const engine = this.gameObject._engine;
        const instances = engine ? engine.instances : null;
        if (!instances) return;
        
        for (const obj of instances) {
            if (obj === this.gameObject) continue;
            if (this._headbuttHitTargets.has(obj)) continue;
            
            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature) continue;
            if (creature.isDead) continue;
            
            // Check friendly fire
            if (!this.friendlyFire && this.gameObject.tag && obj.tag === this.gameObject.tag) continue;
            
            // Distance check
            const dx = obj.position.x - headX;
            const dy = obj.position.y - headY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetRadius = creature.headSize || 15;
            
            if (dist < hitRadius + targetRadius) {
                // Hit!
                this._headbuttHitTargets.add(obj);
                
                // Apply damage using punch properties
                if (typeof creature.takeDamage === 'function') {
                    creature.takeDamage(this.punchDamage, this.gameObject);
                }
                
                // Apply knockback using punch knockback
                if (this.punchKnockback > 0 && dist > 0.1) {
                    const knockbackX = (dx / dist) * this.punchKnockback;
                    const knockbackY = (dy / dist) * this.punchKnockback;
                    
                    // Use _knockbackVelocity for controlled creatures to avoid feedback loop
                    if (creature.movementStyle === 'controlled') {
                        if (!creature._knockbackVelocity) creature._knockbackVelocity = { x: 0, y: 0 };
                        creature._knockbackVelocity.x += knockbackX;
                        creature._knockbackVelocity.y += knockbackY;
                    } else if (creature._velocity) {
                        creature._velocity.x += knockbackX;
                        creature._velocity.y += knockbackY;
                    }
                    
                    // Apply instant knockback with wall collision check
                    const instantKnockbackX = knockbackX * 0.1;
                    const instantKnockbackY = knockbackY * 0.1;
                    const knockbackCollision = creature._checkKnockbackCollision ? 
                        creature._checkKnockbackCollision(instantKnockbackX * 10, instantKnockbackY * 10) : null;
                    if (knockbackCollision) {
                        obj.position.x += instantKnockbackX * knockbackCollision.multiplierX;
                        obj.position.y += instantKnockbackY * knockbackCollision.multiplierY;
                    } else {
                        obj.position.x += instantKnockbackX;
                        obj.position.y += instantKnockbackY;
                    }
                }
            }
        }
    }

    /**
     * Check if an arm is currently punching
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - True if punching
     */
    isArmPunching(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        return this._arms[armIndex].state === 'punching';
    }

    /**
     * Get the current punch power/speed of an arm
     * @param {number} armIndex - Index of the arm
     * @returns {number} - Punch power (0 if not punching)
     */
    getArmPunchPower(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return 0;
        }
        return this._arms[armIndex].punchPower;
    }

    /**
     * Make an arm grab at a position
     * @param {number} armIndex - Index of the arm
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabWithArm(armIndex, targetWorldX, targetWorldY) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        const arm = this._arms[armIndex];

        // Don't interrupt active grab or punch
        if (arm.state === 'grabbing' || arm.state === 'holding' || arm.state === 'punching') {
            return false;
        }

        // Clamp grab target to within arm reach of the arm base
        // This prevents the arm from flying off-screen when grabbing at distant empty space
        const head = this._segments[0];
        if (head && head.worldPos) {
            const maxGrabDist = this.armLength * 0.9;
            const dx = targetWorldX - head.worldPos.x;
            const dy = targetWorldY - head.worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxGrabDist) {
                const scale = maxGrabDist / dist;
                targetWorldX = head.worldPos.x + dx * scale;
                targetWorldY = head.worldPos.y + dy * scale;
            }
        }

        arm.state = 'grabbing';
        arm.stateTime = 0;
        arm.stateStartPos.x = arm.currentHandPos.x;
        arm.stateStartPos.y = arm.currentHandPos.y;
        arm.grabTargetPos.x = targetWorldX;
        arm.grabTargetPos.y = targetWorldY;
        arm.grabHoldTimer = 0;

        return true;
    }

    /**
     * Make the right hand grab at a position
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabRight(targetWorldX, targetWorldY) {
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.grabWithArm(rightArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Make the left hand grab at a position
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabLeft(targetWorldX, targetWorldY) {
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.grabWithArm(leftArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Check if an arm is currently grabbing or holding
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - True if grabbing/holding
     */
    isArmGrabbing(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const state = this._arms[armIndex].state;
        return state === 'grabbing' || state === 'holding';
    }

    /**
     * Get the current state of an arm
     * @param {number} armIndex - Index of the arm
     * @returns {string} - State: 'idle', 'punching', 'grabbing', 'holding', 'returning'
     */
    getArmState(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        return this._arms[armIndex].state;
    }

    /**
     * Force an arm to return to idle state
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - Success status
     */
    resetArmState(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        // Drop held item if any
        if (this._arms[armIndex].heldItem) {
            this.dropItem(armIndex);
        }
        this._arms[armIndex].state = 'idle';
        this._arms[armIndex].stateTime = 0;
        this._arms[armIndex].punchPower = 0;
        return true;
    }

    /**
     * Grab forward - reaches forward to grab items within range.
     * If a ProceduralCreatureItem is nearby, picks it up.
     * @param {number} targetWorldX - Target world X (e.g. mouse position)
     * @param {number} targetWorldY - Target world Y
     * @returns {boolean} Success
     */
    grabForward(targetWorldX, targetWorldY) {
        if (this._arms.length === 0) return false;

        const head = this._segments[0];
        const headWorldAngle = head.angle + this._headAngle;

        // Find nearby ProceduralCreatureItems
        const nearbyItem = this._findNearestItem(targetWorldX, targetWorldY);

        if (nearbyItem) {
            // For two-handed items, find an arm whose opposing arm is also free
            const itemModule = nearbyItem;
            const isTwoHanded = itemModule.twoHanded || itemModule.gunForegripEnabled;
            const bestArmIndex = isTwoHanded ? this.getNextEmptyArmForTwoHanded() : this.getNextEmptyArm();
            if (bestArmIndex === -1) return false;
            const bestArm = this._arms[bestArmIndex];

            // Grab the item - reach toward its handle position
            const handlePos = itemModule.getHandleWorldPosition();

            bestArm.state = 'grabbing';
            bestArm.stateTime = 0;
            bestArm.stateStartPos.x = bestArm.currentHandPos.x;
            bestArm.stateStartPos.y = bestArm.currentHandPos.y;
            bestArm.grabTargetPos.x = handlePos.x;
            bestArm.grabTargetPos.y = handlePos.y;
            bestArm.grabHoldTimer = 0;
            bestArm._pendingItem = itemModule; // Will be picked up when grab completes
            return true;
        } else {
            // No item nearby - do a short reach forward then return
            // Find any empty hand for an empty grab
            const emptyArmIndex = this.getNextEmptyArm();
            if (emptyArmIndex === -1) return false;
            const emptyArm = this._arms[emptyArmIndex];

            const bodyFacingAngle = head.angle; // body direction (no head-look offset)
            const reachDist = this.armLength * 0.6; // shorter reach than a full grab
            const reachX = head.worldPos.x + Math.cos(bodyFacingAngle) * reachDist;
            const reachY = head.worldPos.y + Math.sin(bodyFacingAngle) * reachDist;

            emptyArm.state = 'grabbing';
            emptyArm.stateTime = 0;
            emptyArm.stateStartPos.x = emptyArm.currentHandPos.x;
            emptyArm.stateStartPos.y = emptyArm.currentHandPos.y;
            emptyArm.grabTargetPos.x = reachX;
            emptyArm.grabTargetPos.y = reachY;
            emptyArm.grabHoldTimer = 0;
            emptyArm._pendingItem = null;
            emptyArm._emptyGrab = true; // flag: skip hold phase, return immediately
            return true;
        }
    }

    /**
     * Find the nearest ProceduralCreatureItem within grab range of the target position
     */
    _findNearestItem(targetWorldX, targetWorldY) {
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return null;

        const head = this._segments[0];
        const grabRange = this.grabRange || 60;
        let bestItem = null;
        let bestDist = grabRange * grabRange;

        for (const obj of _instances) {
            if (obj === this.gameObject) continue;
            const itemModule = obj.getModule ? obj.getModule('ProceduralCreatureItem') : null;
            if (!itemModule || itemModule.isHeld) continue;

            // Distance from creature head to item
            const dx = obj.position.x - head.worldPos.x;
            const dy = obj.position.y - head.worldPos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < bestDist) {
                bestDist = distSq;
                bestItem = itemModule;
            }
        }

        return bestItem;
    }

    /**
     * Get the index of the opposing arm in the same pair.
     * For a 4-arm creature: arms 0,1 are left side, arms 2,3 are right side.
     * Pair 0: arm 0 (left) pairs with arm 2 (right)
     * Pair 1: arm 1 (left) pairs with arm 3 (right)
     * @param {number} armIndex - The arm to find the pair for
     * @returns {number} Index of the opposing arm, or -1 if no pair exists
     */
    getOpposingArmIndex(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) return -1;
        
        const armsPerSide = Math.floor(this.armCount / 2);
        if (armsPerSide === 0) return -1; // No pairs possible with < 2 arms
        
        const arm = this._arms[armIndex];
        const isLeftSide = arm.side === -1;
        
        // Calculate position within this side (0, 1, 2, etc.)
        const pairIndex = isLeftSide ? armIndex : armIndex - armsPerSide;
        
        // Find the opposing arm on the other side at the same pair position
        const opposingIndex = isLeftSide ? (armsPerSide + pairIndex) : pairIndex;
        
        // Validate the opposing index exists
        if (opposingIndex < 0 || opposingIndex >= this._arms.length) return -1;
        if (opposingIndex === armIndex) return -1; // Shouldn't happen, but safety check
        
        return opposingIndex;
    }

    /**
     * Check if the opposing paired arm is available for two-handed grip.
     * @param {number} armIndex - The arm that would hold the item
     * @returns {boolean} True if opposing arm exists and is free
     */
    isOpposingArmFree(armIndex) {
        const opposingIndex = this.getOpposingArmIndex(armIndex);
        if (opposingIndex < 0) return false;
        
        const opposingArm = this._arms[opposingIndex];
        // Arm is free if: not holding an item, not punching/grabbing, and not already supporting something
        return !opposingArm.heldItem && 
               opposingArm.state !== 'punching' && 
               opposingArm.state !== 'grabbing' &&
               !opposingArm._foregripTarget &&
               !opposingArm._twoHandedTarget;
    }

    /**
     * Pick up a ProceduralCreatureItem with a specific arm
     * @param {number} armIndex - Arm to hold the item with
     * @param {Object} itemModule - The ProceduralCreatureItem module
     */
    pickUpItem(armIndex, itemModule) {
        if (armIndex < 0 || armIndex >= this._arms.length) return false;
        const arm = this._arms[armIndex];

        // For two-handed items (including guns with foregrips), require the opposing paired arm to be free
        const isTwoHandedItem = itemModule.twoHanded || itemModule.gunForegripEnabled;
        if (isTwoHandedItem) {
            if (!this.isOpposingArmFree(armIndex)) {
                // Can't pick up 2-handed item without a free opposing arm
                return false;
            }
        }

        // Drop any currently held item
        if (arm.heldItem) {
            this.dropItem(armIndex);
        }

        // If this arm was supporting a two-handed weapon, release that grip
        // (creature can pick up another item but loses the two-handed strength bonus)
        if (arm._twoHandedTarget || arm._twoHandedSourceArm >= 0) {
            arm._twoHandedTarget = null;
            arm._twoHandedSourceArm = -1;
        }

        // If this arm was on a foregrip, release that too
        if (arm._foregripTarget || arm._foregripSourceArm >= 0) {
            arm._foregripTarget = null;
            arm._foregripSourceArm = -1;
        }

        arm.heldItem = itemModule;
        arm.state = 'holdingItem';
        itemModule.onPickedUp(this, armIndex);
        return true;
    }

    /**
     * Drop the item held by a specific arm
     * @param {number} armIndex - Arm holding the item
     */
    dropItem(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) return false;
        const arm = this._arms[armIndex];
        if (!arm.heldItem) return false;

        // Calculate depth arc drop velocity if depth/parallax is enabled
        // This gives a fake 3D "toss" effect as if the item falls from hand height to ground
        let dropVelX = 0, dropVelY = 0;
        if (this.depthEnabled && this.handHeightDepth > 0) {
            // Calculate per-arm hand height (matches _drawArm logic)
            let handHeight = this.handHeightDepth || 0.25;
            const armPairIndex = Math.floor(armIndex / 2);
            const totalArmPairs = Math.ceil((this.armCount || 2) / 2);
            if (totalArmPairs > 1) {
                const t = armPairIndex / (totalArmPairs - 1);
                handHeight = handHeight * (1 - t * 0.6);
            }

            // Get the depth offset direction (away from camera)
            const depthOffset = this._getDepthOffset(handHeight);
            if (depthOffset.x !== 0 || depthOffset.y !== 0) {
                // Convert local offset back to world direction
                const bodyAngle = this.gameObject.angle * Math.PI / 180;
                const cos = Math.cos(bodyAngle);
                const sin = Math.sin(bodyAngle);
                const worldOffsetX = depthOffset.x * cos - depthOffset.y * sin;
                const worldOffsetY = depthOffset.x * sin + depthOffset.y * cos;

                // Create a small arc velocity in the depth direction
                // Higher hand height = more arc distance to travel
                const arcSpeed = 80 * handHeight * this.depthIntensity * 10;
                const offsetMag = Math.sqrt(worldOffsetX * worldOffsetX + worldOffsetY * worldOffsetY);
                if (offsetMag > 0.01) {
                    dropVelX = (worldOffsetX / offsetMag) * arcSpeed;
                    dropVelY = (worldOffsetY / offsetMag) * arcSpeed;
                }
            }
        }

        // If the dropped item had a foregrip, release the off-hand
        if (arm.heldItem.gunForegripEnabled) {
            for (let j = 0; j < this._arms.length; j++) {
                if (j === armIndex) continue;
                const otherArm = this._arms[j];
                if (otherArm._foregripTarget) {
                    otherArm._foregripTarget = null;
                    otherArm._foregripSourceArm = -1;
                    if (!otherArm.heldItem) {
                        otherArm.state = 'idle';
                        otherArm.stateTime = 0;
                    }
                }
            }
        }

        // If the dropped item was two-handed, release the support hand
        if (arm.heldItem.twoHanded) {
            for (let j = 0; j < this._arms.length; j++) {
                if (j === armIndex) continue;
                const otherArm = this._arms[j];
                if (otherArm._twoHandedSourceArm === armIndex) {
                    otherArm._twoHandedTarget = null;
                    otherArm._twoHandedSourceArm = -1;
                    if (!otherArm.heldItem) {
                        otherArm.state = 'idle';
                        otherArm.stateTime = 0;
                    }
                }
            }
        }

        // Release trigger if it was a gun
        if (arm.heldItem.itemType === 'gun' && typeof arm.heldItem.releaseTrigger === 'function') {
            arm.heldItem.releaseTrigger();
        }
        arm._isFiring = false;

        // Apply drop arc if depth is enabled (gives fake 3D falling effect)
        if (dropVelX !== 0 || dropVelY !== 0) {
            // Use onThrown with a gentle arc velocity and slight spin
            if (typeof arm.heldItem.onThrown === 'function') {
                const spinSpeed = 60 * arm.side; // Gentle spin based on which hand dropped it
                arm.heldItem.onThrown(dropVelX, dropVelY, spinSpeed);
            } else {
                arm.heldItem.onDropped();
            }
        } else {
            arm.heldItem.onDropped();
        }
        arm.heldItem = null;
        arm.state = 'idle';
        arm.stateTime = 0;
        return true;
    }

    /**
     * Drop all held items
     */
    dropAllItems() {
        for (let i = 0; i < this._arms.length; i++) {
            if (this._arms[i].heldItem) {
                this.dropItem(i);
            }
        }
    }

    /**
     * Get the item held by a specific arm
     * @param {number} armIndex
     * @returns {Object|null}
     */
    getHeldItem(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) return null;
        return this._arms[armIndex].heldItem;
    }

    /**
     * Get the effective arm strength for a specific arm, accounting for two-handed holding.
     * Two-handed items double the arm strength, making heavy items easier to swing.
     * If holding a two-handed item with only one hand (other hand is busy), strength is normal.
     * @param {number} armIndex - The arm to check
     * @returns {number} Effective arm strength (base armStrength * 2 if two-handed)
     */
    getEffectiveArmStrength(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) return this.armStrength;
        const arm = this._arms[armIndex];
        const item = arm.heldItem;
        
        // If not holding a two-handed item, use base strength
        if (!item || !item.twoHanded) {
            return this.armStrength;
        }
        
        // Check if another arm is supporting this item
        for (let j = 0; j < this._arms.length; j++) {
            if (j === armIndex) continue;
            const otherArm = this._arms[j];
            if (otherArm._twoHandedSourceArm === armIndex) {
                // Both hands on item - double the strength
                return this.armStrength * 2;
            }
        }
        
        // Two-handed item held with only one hand - use base strength
        return this.armStrength;
    }

    /**
     * Check if a two-handed item is being gripped with both hands.
     * Returns true only if the arm holds a two-handed item AND another arm is supporting it.
     * @param {number} armIndex - The arm holding the two-handed item
     * @returns {boolean} True if both hands are on the weapon
     */
    isTwoHandedGripActive(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) return false;
        const arm = this._arms[armIndex];
        const item = arm.heldItem;
        
        if (!item || !item.twoHanded) return false;
        
        // Check if another arm is supporting this item
        for (let j = 0; j < this._arms.length; j++) {
            if (j === armIndex) continue;
            if (this._arms[j]._twoHandedSourceArm === armIndex) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if any arm is holding an item
     * @returns {boolean}
     */
    isHoldingItem() {
        return this._arms.some(arm => arm.heldItem !== null);
    }

    /**
     * Get the index of the next empty arm (first arm not holding an item, in order)
     * Pickup fills hands in order: 0, 1, 2, ...
     * Arms supporting a two-handed weapon are NOT available (they are busy gripping)
     * @returns {number} Arm index, or -1 if all arms are full/busy
     */
    getNextEmptyArm() {
        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            // Arm is NOT available if it's holding an item, punching, grabbing,
            // or supporting a two-handed weapon / foregrip
            if (arm.heldItem) continue;
            if (arm.state === 'punching' || arm.state === 'grabbing') continue;
            if (arm._twoHandedSourceArm >= 0 || arm._twoHandedTarget) continue;
            if (arm._foregripSourceArm >= 0 || arm._foregripTarget) continue;
            return i;
        }
        return -1;
    }

    /**
     * Get the index of the next empty arm that can hold a two-handed item.
     * Requires both the arm AND its opposing paired arm to be free.
     * @returns {number} Arm index, or -1 if no suitable arm pair is available
     */
    getNextEmptyArmForTwoHanded() {
        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            // Arm must be free
            if (arm.heldItem) continue;
            if (arm.state === 'punching' || arm.state === 'grabbing') continue;
            if (arm._twoHandedSourceArm >= 0 || arm._twoHandedTarget) continue;
            if (arm._foregripSourceArm >= 0 || arm._foregripTarget) continue;
            // Opposing arm must also be free
            if (!this.isOpposingArmFree(i)) continue;
            return i;
        }
        return -1;
    }

    /**
     * Get the index of the last filled arm (last arm holding an item, in reverse order)
     * Drop/throw removes items in reverse order: ..., 2, 1, 0
     * @returns {number} Arm index, or -1 if no arms are holding items
     */
    getLastFilledArm() {
        for (let i = this._arms.length - 1; i >= 0; i--) {
            if (this._arms[i].heldItem) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get count of items currently held
     * @returns {number}
     */
    getHeldItemCount() {
        let count = 0;
        for (const arm of this._arms) {
            if (arm.heldItem) count++;
        }
        return count;
    }

    /**
     * Throw the item held by a specific arm with windup animation.
     * The arm will pull back (like a punch windup) then release the item
     * during the forward swing phase.
     * @param {number} armIndex - Arm holding the item
     * @param {number} throwSpeed - Base speed of the throw (modified by arm strength and item weight)
     * @param {number} [directionX] - Throw direction X (defaults to creature facing)
     * @param {number} [directionY] - Throw direction Y (defaults to creature facing)
     * @param {number} [forwardOffset] - Forward offset to apply so item doesn't hit thrower
     * @returns {boolean} Success
     */
    throwItem(armIndex, throwSpeed, directionX, directionY, forwardOffset) {
        if (armIndex < 0 || armIndex >= this._arms.length) return false;
        const arm = this._arms[armIndex];
        if (!arm.heldItem) return false;
        
        // Don't throw if arm is busy with another action
        if (arm.state === 'punching' || arm.state === 'throwing' || arm.state === 'grabbing') {
            return false;
        }

        // Calculate throw direction - default to creature facing direction
        let dx, dy;
        if (directionX !== undefined && directionY !== undefined) {
            const mag = Math.sqrt(directionX * directionX + directionY * directionY);
            if (mag > 0.01) {
                dx = directionX / mag;
                dy = directionY / mag;
            } else {
                const head = this._segments[0];
                const angle = head.angle + this._headAngle;
                dx = Math.cos(angle);
                dy = Math.sin(angle);
            }
        } else {
            const head = this._segments[0];
            const angle = head.angle + this._headAngle;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        }

        // Store throw parameters for the throwing state to use
        arm._throwSpeed = throwSpeed || 300;
        arm._throwDirX = dx;
        arm._throwDirY = dy;
        arm._throwAngle = Math.atan2(dy, dx);
        arm._throwInitialBodyAngle = this._segments[0].angle;
        arm._throwReleased = false;
        arm._throwForwardOffset = forwardOffset || 0;

        // Transition to throwing state
        arm.state = 'throwing';
        arm.stateTime = 0;
        
        return true;
    }

    /**
     * Drop the item from the last filled hand
     * @returns {boolean} Success
     */
    dropLastItem() {
        const armIndex = this.getLastFilledArm();
        if (armIndex === -1) return false;
        return this.dropItem(armIndex);
    }

    /**
     * Throw the item from the last filled hand
     * @param {number} throwSpeed - Speed of the throw
     * @param {number} [directionX] - Throw direction X
     * @param {number} [directionY] - Throw direction Y
     * @param {number} [forwardOffset] - Forward offset to apply so item doesn't hit thrower
     * @returns {boolean} Success
     */
    throwLastItem(throwSpeed, directionX, directionY, forwardOffset) {
        const armIndex = this.getLastFilledArm();
        if (armIndex === -1) return false;
        return this.throwItem(armIndex, throwSpeed, directionX, directionY, forwardOffset);
    }

    // ==================== HEALTH & COMBAT API ====================

    /**
     * Deal damage to this creature
     * @param {number} amount - Raw damage amount
     * @param {object} [source] - The gameObject or creature that dealt damage
     * @param {number} [knockbackX] - Knockback force X
     * @param {number} [knockbackY] - Knockback force Y
     * @returns {number} Actual damage dealt after armor
     */
    takeDamage(amount, source = null, knockbackX = 0, knockbackY = 0) {
        if (this.isDead || this.isInvulnerable) return 0;  // ← this already blocks damage when burrowed

        const actualDamage = Math.max(0, amount - this.armor);
        this.health -= actualDamage;
        this._damageFlashTimer = 0.15;
        this._lastDamageSource = source;
        this._lastDamageTime = performance.now() / 1000;
        
        if (!this.tdEnemyRef) {
            this.tdEnemyRef = this.getModule('TDEnemy');
        }
        
        if (this.tdEnemyRef) {
            if (this.tdEnemyRef._health - actualDamage <= 0) {
                this.die(source);
                const brain = source.getModule('ProceduralCreatureBrain');
                const cr = source.getModule('ProceduralCreature');
                if (brain) brain._chaseTarget = null;
                if (cr) cr._targetingTarget = null;
            }
            this.tdEnemyRef.takeDamage(actualDamage);
        }

        // Apply knockback to velocity, scaled inversely by creature mass
        // Larger/heavier creatures resist knockback more
        // Check for colliders in knockback direction to prevent pushing through walls
        if (knockbackX !== 0 || knockbackY !== 0) {
            const creatureMass = (this.creatureScale || 1.0) * (this.bodySegments || 1) * 0.5 + 0.5;
            const knockbackResist = 1.0 / Math.max(0.5, creatureMass);
            let finalKnockbackX = knockbackX * knockbackResist;
            let finalKnockbackY = knockbackY * knockbackResist;
            
            // Check for wall collision in knockback direction
            const knockbackCollision = this._checkKnockbackCollision(finalKnockbackX, finalKnockbackY);
            if (knockbackCollision) {
                // Reduce or eliminate knockback based on collision
                finalKnockbackX *= knockbackCollision.multiplierX;
                finalKnockbackY *= knockbackCollision.multiplierY;
            }
            
            // For controlled creatures (with Brain), use separate knockback velocity
            // to avoid feedback loop with position-derived _velocity
            if (this.movementStyle === 'controlled') {
                if (!this._knockbackVelocity) this._knockbackVelocity = new Vector2(0, 0);
                this._knockbackVelocity.x += finalKnockbackX;
                this._knockbackVelocity.y += finalKnockbackY;
            } else {
                this._velocity.x += finalKnockbackX;
                this._velocity.y += finalKnockbackY;
            }
        }

        // Spawn blood prefab at creature position
        if (actualDamage > 0 && this.bloodPrefab && typeof instanceCreate === 'function') {
            const pos = this.gameObject.getWorldPosition();
            instanceCreate(this.bloodPrefab, pos.x, pos.y);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.die(source);
        }

        return actualDamage;
    }

    /**
     * Heal the creature
     * @param {number} amount - Amount to heal
     * @returns {number} Actual amount healed
     */
    heal(amount) {
        if (this.isDead) return 0;
        const before = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - before;
    }

    // die() is defined further below with full death snapshot logic

    /**
     * Check if a punch/item swing from this creature hits a target creature
     * @param {ProceduralCreature} target - Target creature to check
     * @returns {{hit: boolean, damage: number, armIndex: number}} Hit result
     */
    checkHitAgainst(target) {
        if (!target || target.isDead || target === this) {
            return { hit: false, damage: 0, armIndex: -1 };
        }

        const targetPos = target.gameObject.getWorldPosition();

        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            if (arm.state !== 'punching' || arm.punchPower <= 0) continue;

            const handX = arm.currentHandPos.x;
            const handY = arm.currentHandPos.y;

            if (arm.heldItem) {
                // OBB collision for held items
                const itemCorners = arm.heldItem.getWorldCorners();
                const itemAxes = arm.heldItem.getOBBAxes();

                // Build target body OBB
                const targetScale = target.creatureScale || 1;
                const targetHalfW = (target.headSize || 10) * targetScale;
                const targetHalfH = (target.bodyWidth || 10) * targetScale * 0.8;
                const targetAngle = target._segments && target._segments.length > 0
                    ? target._segments[0].angle : 0;
                const tCos = Math.cos(targetAngle);
                const tSin = Math.sin(targetAngle);

                const targetCorners = [
                    { x: targetPos.x + (-targetHalfW * tCos - (-targetHalfH) * tSin), y: targetPos.y + (-targetHalfW * tSin + (-targetHalfH) * tCos) },
                    { x: targetPos.x + (targetHalfW * tCos - (-targetHalfH) * tSin), y: targetPos.y + (targetHalfW * tSin + (-targetHalfH) * tCos) },
                    { x: targetPos.x + (targetHalfW * tCos - targetHalfH * tSin), y: targetPos.y + (targetHalfW * tSin + targetHalfH * tCos) },
                    { x: targetPos.x + (-targetHalfW * tCos - targetHalfH * tSin), y: targetPos.y + (-targetHalfW * tSin + targetHalfH * tCos) }
                ];
                const targetAxes = [
                    { x: tCos, y: tSin },
                    { x: -tSin, y: tCos }
                ];

                const collision = this._checkOBBvsOBB(itemCorners, itemAxes, targetCorners, targetAxes);
                if (collision) {
                    const damage = arm.heldItem.damage || 10;
                    const tip = arm.heldItem.getTipWorldPosition();
                    return { hit: true, damage: damage, armIndex: i, hitX: tip.x, hitY: tip.y };
                }
            } else {
                // Bare fist — simple radius check
                const hitRadius = this.armThickness * 2;
                const damage = arm.punchPower * 0.1;
                const targetRadius = (target.headSize || 10) * (target.creatureScale || 1);

                const dx = handX - targetPos.x;
                const dy = handY - targetPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < targetRadius + hitRadius) {
                    return { hit: true, damage: damage, armIndex: i, hitX: handX, hitY: handY };
                }
            }
        }

        return { hit: false, damage: 0, armIndex: -1 };
    }

    /**
     * Check for swing hits during the slash phase of an arc swing.
     * Called each frame while the weapon is in the slash portion of the swing.
     * Detects if the blade/tip area of the held item collides with another ProceduralCreature.
     * @param {object} arm - The arm data object
     * @param {number} baseX - Swing base X position
     * @param {number} baseY - Swing base Y position
     * @param {number} currentAngle - Current swing angle in radians
     * @param {number} swingRadius - Radius of the swing arc
     * @param {number} armIndex - Index of the swinging arm
     */
    _checkSwingHits(arm, baseX, baseY, currentAngle, swingRadius, armIndex) {
        if (!arm.heldItem) return;

        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        // Get the weapon's OBB for precise collision
        const itemCorners = arm.heldItem.getWorldCorners();
        const itemAxes = arm.heldItem.getOBBAxes();

        const damage = arm.heldItem.damage || 10;
        const knockback = arm.heldItem.knockback || 50;
        const myTags = this.gameObject.tags || [];

        for (const inst of _instances) {
            if (inst === this.gameObject) continue; // Don't hit self

            // Check for ProceduralCreature or BasicTarget
            const targetCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
            const targetBasic = !targetCreature && inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            const target = targetCreature || targetBasic;
            if (!target || target.isDead) continue;

            // Skip already-hit targets in this swing
            if (this._swingHitTargets.has(inst.id)) continue;

            // Friendly fire check: if friendlyFire is false, skip targets that share tags
            if (!this.friendlyFire) {
                const targetTags = inst.tags || [];
                const sharesTag = myTags.some(t => targetTags.includes(t));
                if (sharesTag) continue;
            }

            // Build a target OBB from the creature's body or BasicTarget bounds
            const targetPos = inst.getWorldPosition();
            let targetHalfW, targetHalfH, targetAngle;
            if (targetCreature) {
                const targetScale = targetCreature.creatureScale || 1;
                targetHalfW = (targetCreature.headSize || 10) * targetScale;
                targetHalfH = (targetCreature.bodyWidth || 10) * targetScale * 0.8;
                targetAngle = targetCreature._segments && targetCreature._segments.length > 0
                    ? targetCreature._segments[0].angle : 0;
            } else {
                // BasicTarget - use instance bounds
                targetHalfW = (inst.width || 20) * 0.5 * (inst.scale?.x || 1);
                targetHalfH = (inst.height || 20) * 0.5 * (inst.scale?.y || 1);
                targetAngle = inst.rotation || 0;
            }
            const tCos = Math.cos(targetAngle);
            const tSin = Math.sin(targetAngle);

            const targetCorners = [
                { x: targetPos.x + (-targetHalfW * tCos - (-targetHalfH) * tSin), y: targetPos.y + (-targetHalfW * tSin + (-targetHalfH) * tCos) },
                { x: targetPos.x + (targetHalfW * tCos - (-targetHalfH) * tSin), y: targetPos.y + (targetHalfW * tSin + (-targetHalfH) * tCos) },
                { x: targetPos.x + (targetHalfW * tCos - targetHalfH * tSin), y: targetPos.y + (targetHalfW * tSin + targetHalfH * tCos) },
                { x: targetPos.x + (-targetHalfW * tCos - targetHalfH * tSin), y: targetPos.y + (-targetHalfW * tSin + targetHalfH * tCos) }
            ];
            const targetAxes = [
                { x: tCos, y: tSin },
                { x: -tSin, y: tCos }
            ];

            // SAT collision between weapon OBB and target body OBB
            const collision = this._checkOBBvsOBB(itemCorners, itemAxes, targetCorners, targetAxes);

            if (collision) {
                // Mark as hit so we don't hit again this swing
                this._swingHitTargets.add(inst.id);

                // Calculate knockback direction from swing center toward target
                const kbAngle = Math.atan2(targetPos.y - baseY, targetPos.x - baseX);

                // Revamped knockback: scale by weapon weight, swing speed, and arm strength
                // Two-handed items get doubled effective arm strength
                const itemWeight = arm.heldItem.weight || 1.0;
                const swingSpeed = Math.max(1, arm.punchPower || 1);
                const armStr = Math.max(0.1, this.getEffectiveArmStrength(armIndex));
                // Heavy weapons + fast swings + strong arms = more knockback
                // Increased base multiplier from 1.0 to 3.0 for more impactful knockback
                const kbMultiplier = 3.0 * (1.0 + itemWeight * 0.5) * Math.min(2.5, swingSpeed * 0.015) * (0.8 + armStr * 0.4);
                const finalKnockback = knockback * kbMultiplier;

                const kbX = Math.cos(kbAngle) * finalKnockback;
                const kbY = Math.sin(kbAngle) * finalKnockback;

                // ProceduralCreature takes knockback, BasicTarget doesn't
                if (targetCreature) {
                    targetCreature.takeDamage(damage, this.gameObject, kbX, kbY);
                } else {
                    targetBasic.takeDamage(damage, this.gameObject);
                }
            }
        }
    }

    /**
     * Cone-based swing hit detection - checks all creatures within a cone at swing midpoint.
     * More reliable than per-frame OBB collision, ensures hits register consistently.
     * @param {object} arm - The arm data object
     * @param {number} baseX - Swing base X position (shoulder/hand origin)
     * @param {number} baseY - Swing base Y position
     * @param {number} centerAngle - Center angle of the swing (attack direction)
     * @param {number} startAngle - Start angle of the cone (radians)
     * @param {number} endAngle - End angle of the cone (radians)
     * @param {number} coneRadius - Maximum reach of the swing (arm + weapon length)
     * @param {number} armIndex - Index of the swinging arm
     */
    _checkSwingHitsCone(arm, baseX, baseY, centerAngle, startAngle, endAngle, coneRadius, armIndex) {
        if (!arm.heldItem) return;

        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        const damage = arm.heldItem.damage || 10;
        const knockback = arm.heldItem.knockback || 50;
        const myTags = this.gameObject.tags || [];

        // Normalize the cone angles to ensure startAngle < endAngle
        let coneStart = startAngle;
        let coneEnd = endAngle;
        if (coneStart > coneEnd) {
            const temp = coneStart;
            coneStart = coneEnd;
            coneEnd = temp;
        }
        const coneHalfAngle = (coneEnd - coneStart) / 2;
        const coneCenterAngle = (coneStart + coneEnd) / 2;

        for (const inst of _instances) {
            if (inst === this.gameObject) continue; // Don't hit self

            // Check for ProceduralCreature or BasicTarget
            const targetCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
            const targetBasic = !targetCreature && inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            const target = targetCreature || targetBasic;
            if (!target || target.isDead) continue;

            // Skip already-hit targets in this swing
            if (this._swingHitTargets.has(inst.id)) continue;

            // Friendly fire check
            if (!this.friendlyFire) {
                const targetTags = inst.tags || [];
                const sharesTag = myTags.some(t => targetTags.includes(t));
                if (sharesTag) continue;
            }

            // Get target position and size
            const targetPos = inst.getWorldPosition();
            let targetRadius;
            if (targetCreature) {
                const targetScale = targetCreature.creatureScale || 1;
                targetRadius = Math.max(
                    (targetCreature.headSize || 10) * targetScale,
                    (targetCreature.bodyWidth || 10) * targetScale
                );
            } else {
                // BasicTarget - use instance bounds
                const w = (inst.width || 20) * (inst.scale?.x || 1);
                const h = (inst.height || 20) * (inst.scale?.y || 1);
                targetRadius = Math.max(w, h) * 0.5;
            }

            // Check if target is within cone
            const dx = targetPos.x - baseX;
            const dy = targetPos.y - baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Distance check (with target radius as buffer)
            if (dist > coneRadius + targetRadius) continue;

            // Angle check - is target within the cone arc?
            const angleToTarget = Math.atan2(dy, dx);
            let angleDiff = angleToTarget - coneCenterAngle;
            // Normalize to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Allow some extra angle tolerance based on target size
            const angleToleranceFromSize = Math.atan2(targetRadius, Math.max(dist, 1));
            const effectiveHalfAngle = coneHalfAngle + angleToleranceFromSize;

            if (Math.abs(angleDiff) > effectiveHalfAngle) continue;

            // HIT! Mark as hit so we don't hit again this swing
            this._swingHitTargets.add(inst.id);

            // Calculate knockback direction from attacker toward target
            const kbAngle = Math.atan2(dy, dx);

            // Strong knockback calculation
            const itemWeight = arm.heldItem.weight || 1.0;
            const swingSpeed = Math.max(1, arm.punchPower || 1);
            const armStr = Math.max(0.1, this.getEffectiveArmStrength(armIndex));
            const kbMultiplier = 3.0 * (1.0 + itemWeight * 0.5) * Math.min(2.5, swingSpeed * 0.015) * (0.8 + armStr * 0.4);
            const finalKnockback = knockback * kbMultiplier;

            const kbX = Math.cos(kbAngle) * finalKnockback;
            const kbY = Math.sin(kbAngle) * finalKnockback;

            // ProceduralCreature takes knockback, BasicTarget doesn't
            if (targetCreature) {
                targetCreature.takeDamage(damage, this.gameObject, kbX, kbY);
            } else {
                targetBasic.takeDamage(damage, this.gameObject);
            }
        }
    }

    /**
     * Check for backswing (followthrough) hits at reduced damage.
     * Similar to _checkSwingHitsCone but applies backswingDamageMultiplier.
     * @param {object} arm - The arm data object
     * @param {number} baseX - Base X position (shoulder/hip)
     * @param {number} baseY - Base Y position
     * @param {number} centerAngle - Center angle of the swing cone
     * @param {number} startAngle - Start angle of the cone
     * @param {number} endAngle - End angle of the cone
     * @param {number} coneRadius - Radius of the cone
     * @param {number} armIndex - Index of the arm
     */
    _checkBackswingHitsCone(arm, baseX, baseY, centerAngle, startAngle, endAngle, coneRadius, armIndex) {
        if (!arm.heldItem) return;

        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        // Apply backswing damage multiplier to base damage
        const baseDamage = arm.heldItem.damage || 10;
        const damage = Math.floor(baseDamage * (this.backswingDamageMultiplier || 0.4));
        const knockback = (arm.heldItem.knockback || 50) * 0.5; // Also reduced knockback
        const myTags = this.gameObject.tags || [];

        // Normalize the cone angles
        let coneStart = startAngle;
        let coneEnd = endAngle;
        if (coneStart > coneEnd) {
            const temp = coneStart;
            coneStart = coneEnd;
            coneEnd = temp;
        }
        const coneHalfAngle = (coneEnd - coneStart) / 2;
        const coneCenterAngle = (coneStart + coneEnd) / 2;

        for (const inst of _instances) {
            if (inst === this.gameObject) continue;

            const targetCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
            const targetBasic = !targetCreature && inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            const target = targetCreature || targetBasic;
            if (!target || target.isDead) continue;

            // Skip already-hit targets in this swing (including main swing hits)
            if (this._swingHitTargets.has(inst.id)) continue;

            // Friendly fire check
            if (!this.friendlyFire) {
                const targetTags = inst.tags || [];
                const sharesTag = myTags.some(t => targetTags.includes(t));
                if (sharesTag) continue;
            }

            // Get target position and size
            const targetPos = inst.getWorldPosition();
            let targetRadius;
            if (targetCreature) {
                const targetScale = targetCreature.creatureScale || 1;
                targetRadius = Math.max(
                    (targetCreature.headSize || 10) * targetScale,
                    (targetCreature.bodyWidth || 10) * targetScale
                );
            } else {
                const w = (inst.width || 20) * (inst.scale?.x || 1);
                const h = (inst.height || 20) * (inst.scale?.y || 1);
                targetRadius = Math.max(w, h) * 0.5;
            }

            // Check if target is within cone
            const dx = targetPos.x - baseX;
            const dy = targetPos.y - baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > coneRadius + targetRadius) continue;

            const angleToTarget = Math.atan2(dy, dx);
            let angleDiff = angleToTarget - coneCenterAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            const angleToleranceFromSize = Math.atan2(targetRadius, Math.max(dist, 1));
            const effectiveHalfAngle = coneHalfAngle + angleToleranceFromSize;

            if (Math.abs(angleDiff) > effectiveHalfAngle) continue;

            // HIT! Mark as hit
            this._swingHitTargets.add(inst.id);

            const kbAngle = Math.atan2(dy, dx);
            const kbX = Math.cos(kbAngle) * knockback;
            const kbY = Math.sin(kbAngle) * knockback;

            if (targetCreature) {
                targetCreature.takeDamage(damage, this.gameObject, kbX, kbY);
            } else {
                targetBasic.takeDamage(damage, this.gameObject);
            }
        }
    }

    /**
     * Check for bare-fist punch hits during the strike phase.
     * Uses a simple radius check from the fist position.
     * @param {object} arm - The arm data object
     * @param {number} fistX - Fist world X position
     * @param {number} fistY - Fist world Y position
     * @param {number} armIndex - Index of the punching arm
     */
    _checkPunchHits(arm, fistX, fistY, armIndex) {
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        const fistRadius = (this.headSize || 10) * (this.creatureScale || 1) * 0.4; // Fist ~40% of head size
        const myTags = this.gameObject.tags || [];

        for (const inst of _instances) {
            if (inst === this.gameObject) continue;

            // Check for ProceduralCreature or BasicTarget
            const targetCreature = inst.getModule ? inst.getModule('ProceduralCreature') : null;
            const targetBasic = !targetCreature && inst.getModule ? inst.getModule('ProceduralCreatureBasicTarget') : null;
            const target = targetCreature || targetBasic;
            if (!target || target.isDead) continue;

            // Skip already-hit targets in this punch
            if (this._punchHitTargets.has(inst.id)) continue;

            // Friendly fire check
            if (!this.friendlyFire) {
                const targetTags = inst.tags || [];
                const sharesTag = myTags.some(t => targetTags.includes(t));
                if (sharesTag) continue;
            }

            const targetPos = inst.getWorldPosition();
            let targetRadius;
            if (targetCreature) {
                const targetScale = targetCreature.creatureScale || 1;
                targetRadius = (targetCreature.headSize || 10) * targetScale;
            } else {
                // BasicTarget - use instance bounds
                const w = (inst.width || 20) * (inst.scale?.x || 1);
                const h = (inst.height || 20) * (inst.scale?.y || 1);
                targetRadius = Math.max(w, h) * 0.5;
            }

            const dx = fistX - targetPos.x;
            const dy = fistY - targetPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < fistRadius + targetRadius) {
                this._punchHitTargets.add(inst.id);

                // Knockback direction from creature toward target
                const myPos = this.gameObject.getWorldPosition();
                const kbAngle = Math.atan2(targetPos.y - myPos.y, targetPos.x - myPos.x);

                // Punch knockback scales with arm strength and punch speed
                const armStr = Math.max(0.1, this.armStrength);
                const speedMul = Math.min(2.0, (arm.punchPower || 1) * 0.02);
                const finalKb = this.punchKnockback * (0.5 + armStr * 0.5) * (0.5 + speedMul * 0.5);

                const kbX = Math.cos(kbAngle) * finalKb;
                const kbY = Math.sin(kbAngle) * finalKb;

                // ProceduralCreature takes knockback, BasicTarget doesn't
                if (targetCreature) {
                    targetCreature.takeDamage(this.punchDamage, this.gameObject, kbX, kbY);
                } else {
                    targetBasic.takeDamage(this.punchDamage, this.gameObject);
                }
            }
        }
    }

    /**
     * Check for collisions with thrown items and apply damage/knockback.
     * Thrown items have _throwVelocity set when they are being thrown.
     * @param {number} deltaTime
     */
    _checkThrownItemCollisions(deltaTime) {
        if (this.isInvulnerable || this.isDead) return;

        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        const myPos = this.gameObject.getWorldPosition();
        const myScale = this.creatureScale || 1.0;
        // Use head + body segments to determine hit radius
        const hitRadius = (this.headSize + this.bodyWidth) * 0.5 * myScale;
        
        // Track items we've already been hit by this frame (prevent multi-hits)
        if (!this._thrownItemHitTracker) {
            this._thrownItemHitTracker = {};
        }

        // Clean up old entries (items no longer being thrown)
        const now = performance.now();
        for (const id in this._thrownItemHitTracker) {
            if (now - this._thrownItemHitTracker[id] > 500) {
                delete this._thrownItemHitTracker[id];
            }
        }

        for (const inst of _instances) {
            if (inst === this.gameObject) continue;

            // Check if this object has a ProceduralCreatureItem module that's being thrown
            const item = inst.getModule ? inst.getModule('ProceduralCreatureItem') : null;
            if (!item) continue;
            if (!item._throwVelocity) continue; // Not currently being thrown
            if (item.isHeld) continue; // Still being held (shouldn't happen but safety check)

            // Check if item is moving fast enough to cause damage
            // Threshold of 100 prevents gentle drops from causing damage
            const vel = item._throwVelocity;
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
            if (speed < 100) continue; // Too slow to cause damage

            // Check if we've already been hit by this item recently
            if (this._thrownItemHitTracker[inst.id]) continue;

            // Get item position and check distance
            const itemPos = inst.position;
            const dx = itemPos.x - myPos.x;
            const dy = itemPos.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Item hit radius based on its length
            const itemRadius = (item.itemLength || 30) * 0.5;

            if (dist < hitRadius + itemRadius) {
                // Skip if this creature threw the item (don't damage self)
                const myId = this.gameObject._id || this.gameObject.id;
                if (item._thrownById && item._thrownById === myId) {
                    continue;
                }

                // Hit! Mark this item so we don't get hit again
                this._thrownItemHitTracker[inst.id] = now;

                // Calculate damage based on item weight and velocity
                const itemWeight = item.weight || 1.0;
                const baseDamage = item.thrownDamage ?? item.damage ?? 10; // Use thrownDamage if available
                
                // Damage scales with velocity and weight
                // Fast + heavy = more damage
                const speedFactor = Math.min(2.0, speed / 200); // Normalize to ~1 at 200 px/s
                const weightFactor = Math.min(2.0, Math.sqrt(itemWeight)); // Square root to prevent crazy scaling
                const damage = Math.round(baseDamage * speedFactor * weightFactor);

                // Knockback in direction of item travel
                const velMag = Math.max(1, speed);
                const knockbackDir = { x: vel.x / velMag, y: vel.y / velMag };
                const baseKnockback = item.knockback || 50;
                const knockbackAmount = baseKnockback * speedFactor * weightFactor;
                const kbX = knockbackDir.x * knockbackAmount;
                const kbY = knockbackDir.y * knockbackAmount;

                // Apply damage and knockback
                this.takeDamage(damage, inst, kbX, kbY);

                // Stop the item (it hit something)
                item._throwVelocity.x *= 0.2;
                item._throwVelocity.y *= 0.2;
                item._throwSpin *= 0.3;
            }
        }
    }

    /**
     * Get the head world position (for AI targeting)
     * @returns {{x: number, y: number}}
     */
    getHeadPosition() {
        if (this._segments && this._segments.length > 0) {
            return { x: this._segments[0].worldPos.x, y: this._segments[0].worldPos.y };
        }
        const pos = this.gameObject.getWorldPosition();
        return { x: pos.x, y: pos.y };
    }

    /**
     * Get facing angle in radians
     * @returns {number}
     */
    getFacingAngle() {
        if (this._segments && this._segments.length > 0) {
            return this._segments[0].angle + this._headAngle;
        }
        return (this.gameObject.angle || 0) * Math.PI / 180;
    }

    /**
     * Check if a world position is within field of view
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} fovDegrees - Field of view in degrees
     * @returns {boolean}
     */
    isInFieldOfView(x, y, fovDegrees = 120) {
        const head = this.getHeadPosition();
        const facing = this.getFacingAngle();
        const angleToTarget = Math.atan2(y - head.y, x - head.x);
        let diff = angleToTarget - facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return Math.abs(diff) < (fovDegrees * Math.PI / 360);
    }

    // ==================== EXTERNAL AI CONTROL API ====================

    /**
     * Move towards a target position (for AI control)
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {number} stopDistance - Distance at which to stop (default uses arrivalThreshold)
     * @returns {boolean} True if reached the target
     */
    moveTowards(targetX, targetY, stopDistance = null) {
        const threshold = stopDistance !== null ? stopDistance : this.arrivalThreshold;
        const pos = this.gameObject.position;
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= threshold) {
            this._wanderTarget = null;
            this._isWaiting = true;
            return true;
        }
        
        this._wanderTarget = { x: targetX, y: targetY };
        this._isWaiting = false;
        return false;
    }

    /**
     * Set input direction for movement (for AI control)
     * @param {number} x - X direction (-1 to 1)
     * @param {number} y - Y direction (-1 to 1)
     */
    setInput(x, y) {
        // Convert input to a target position in front of creature
        const pos = this.gameObject.position;
        const distance = this.moveSpeed * 2; // Target some distance ahead
        
        if (x === 0 && y === 0) {
            this._wanderTarget = null;
            this._isWaiting = true;
        } else {
            const angle = Math.atan2(y, x);
            this._wanderTarget = {
                x: pos.x + Math.cos(angle) * distance,
                y: pos.y + Math.sin(angle) * distance
            };
            this._isWaiting = false;
        }
    }

    /**
     * Stop all movement
     */
    stop() {
        this._wanderTarget = null;
        this._isWaiting = true;
        this._velocity.x = 0;
        this._velocity.y = 0;
    }

    /**
     * Get current velocity
     * @returns {Object} {x, y} velocity
     */
    getVelocity() {
        return { x: this._velocity.x, y: this._velocity.y };
    }

    /**
     * Check if the creature is currently moving
     * @returns {boolean}
     */
    isMoving() {
        return Math.abs(this._velocity.x) > 1 || Math.abs(this._velocity.y) > 1;
    }

    // ==================== LEG API METHODS ====================

    /**
     * Get the number of legs
     * @returns {number}
     */
    getLegCount() {
        return this._legs ? this._legs.length : 0;
    }

    /**
     * Get world position of a specific leg foot
     * @param {number} legIndex - Index of the leg
     * @returns {{x: number, y: number, isMoving: boolean}|null}
     */
    getLegPosition(legIndex) {
        if (!this._legs || legIndex < 0 || legIndex >= this._legs.length) {
            return null;
        }
        const leg = this._legs[legIndex];
        return {
            x: leg.currentPos.x,
            y: leg.currentPos.y,
            isMoving: leg.isMoving,
            side: leg.side,
            pairIndex: leg.pairIndex
        };
    }

    /**
     * Get all leg positions
     * @returns {Array<{x: number, y: number, isMoving: boolean, side: number}>}
     */
    getAllLegPositions() {
        if (!this._legs) return [];
        return this._legs.map((leg, index) => ({
            index: index,
            x: leg.currentPos.x,
            y: leg.currentPos.y,
            baseX: leg.baseX,
            baseY: leg.baseY,
            isMoving: leg.isMoving,
            side: leg.side,
            pairIndex: leg.pairIndex
        }));
    }

    /**
     * Check if any leg is currently stepping
     * @returns {boolean}
     */
    isAnyStepping() {
        if (!this._legs) return false;
        return this._legs.some(leg => leg.isMoving);
    }

    /**
     * Get the center of mass (average of all segment positions)
     * @returns {{x: number, y: number}}
     */
    getCenterOfMass() {
        if (!this._segments || this._segments.length === 0) {
            return { x: this.gameObject.position.x, y: this.gameObject.position.y };
        }
        let sumX = 0, sumY = 0;
        for (const seg of this._segments) {
            sumX += seg.worldPos.x;
            sumY += seg.worldPos.y;
        }
        return {
            x: sumX / this._segments.length,
            y: sumY / this._segments.length
        };
    }

    /**
     * Get the bounding box of the entire creature
     * @returns {{minX: number, minY: number, maxX: number, maxY: number, width: number, height: number}}
     */
    getBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // Include body segments
        for (const seg of this._segments) {
            const taperIndex = this._segments.indexOf(seg);
            const taperFactor = 1 - (taperIndex / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;
            
            minX = Math.min(minX, seg.worldPos.x - width);
            maxX = Math.max(maxX, seg.worldPos.x + width);
            minY = Math.min(minY, seg.worldPos.y - width);
            maxY = Math.max(maxY, seg.worldPos.y + width);
        }

        // Include leg positions
        if (this._legs) {
            for (const leg of this._legs) {
                minX = Math.min(minX, leg.currentPos.x);
                maxX = Math.max(maxX, leg.currentPos.x);
                minY = Math.min(minY, leg.currentPos.y);
                maxY = Math.max(maxY, leg.currentPos.y);
            }
        }

        // Include arm positions
        if (this._arms) {
            for (const arm of this._arms) {
                minX = Math.min(minX, arm.currentHandPos.x);
                maxX = Math.max(maxX, arm.currentHandPos.x);
                minY = Math.min(minY, arm.currentHandPos.y);
                maxY = Math.max(maxY, arm.currentHandPos.y);
            }
        }

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    /**
     * Get the head position and angle
     * @returns {{x: number, y: number, angle: number}}
     */
    getHeadPosition() {
        if (!this._segments || this._segments.length === 0) {
            return { x: this.gameObject.position.x, y: this.gameObject.position.y, angle: 0 };
        }
        const head = this._segments[0];
        return {
            x: head.worldPos.x,
            y: head.worldPos.y,
            angle: head.angle,
            lookAngle: this._headAngle
        };
    }

    /**
     * Get the tail position (last segment)
     * @returns {{x: number, y: number, angle: number}}
     */
    getTailPosition() {
        if (!this._segments || this._segments.length === 0) {
            return { x: this.gameObject.position.x, y: this.gameObject.position.y, angle: 0 };
        }
        const tail = this._segments[this._segments.length - 1];
        return {
            x: tail.worldPos.x,
            y: tail.worldPos.y,
            angle: tail.angle
        };
    }

    /**
     * Get distance from creature head to a point
     * @param {number} x - World X
     * @param {number} y - World Y
     * @returns {number}
     */
    getDistanceToPoint(x, y) {
        const head = this.getHeadPosition();
        const dx = x - head.x;
        const dy = y - head.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if a point is within detection range
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} range - Detection range
     * @returns {boolean}
     */
    isPointInRange(x, y, range) {
        return this.getDistanceToPoint(x, y) <= range;
    }

    /**
     * Get the angle from the head to a point
     * @param {number} x - World X
     * @param {number} y - World Y
     * @returns {number} Angle in radians
     */
    getAngleToPoint(x, y) {
        const head = this.getHeadPosition();
        return Math.atan2(y - head.y, x - head.x);
    }

    /**
     * Check if a point is in front of the creature
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} fovDegrees - Field of view in degrees (default 90)
     * @returns {boolean}
     */
    isPointInFront(x, y, fovDegrees = 90) {
        const head = this.getHeadPosition();
        const angleToPoint = Math.atan2(y - head.y, x - head.x);
        let angleDiff = angleToPoint - head.angle;
        
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const halfFov = (fovDegrees / 2) * Math.PI / 180;
        return Math.abs(angleDiff) <= halfFov;
    }

    /**
     * Get the creature's current color scheme
     * @returns {Object}
     */
    getColors() {
        return {
            body: this.bodyColor,
            leg: this.legColor,
            arm: this.armColor,
            accent: this.accentColor,
            eye: this.eyeColor,
            hair: this.hairColor,
            spine: this.spineColor,
            antenna: this.antennaColor,
            mandible: this.mandibleColor
        };
    }

    /**
     * Set the creature's color scheme
     * @param {Object} colors - Color properties to set
     */
    setColors(colors) {
        if (colors.body) this.bodyColor = colors.body;
        if (colors.leg) this.legColor = colors.leg;
        if (colors.arm) this.armColor = colors.arm;
        if (colors.accent) this.accentColor = colors.accent;
        if (colors.eye) this.eyeColor = colors.eye;
        if (colors.hair) this.hairColor = colors.hair;
        if (colors.spine) this.spineColor = colors.spine;
        if (colors.antenna) this.antennaColor = colors.antenna;
        if (colors.mandible) this.mandibleColor = colors.mandible;
    }

    /**
     * Apply a preset by name
     * @param {string} presetName - Name of the preset (human, spider, centipede, etc.)
     * @returns {boolean} Success status
     */
    applyPreset(presetName) {
        const methodName = 'applyPreset' + presetName.charAt(0).toUpperCase() + presetName.slice(1).toLowerCase();
        if (typeof this[methodName] === 'function') {
            this[methodName]();
            return true;
        }
        return false;
    }

    /**
     * Get list of available preset names
     * @returns {string[]}
     */
    getAvailablePresets() {
        return ['human', 'spider', 'centipede', 'lizard', 'ant', 'crab', 'snake', 'octopus', 'dog', 'cat', 'scorpion', 'bird', 'worm', 'beetle', 'jellyfish', 'dragon'];
    }

    /**
     * Randomize the creature's appearance
     */
    randomize() {
        this._randomizeAllProperties();
    }

    /**
     * Get the facing angle of the head in degrees
     * @returns {number} Angle in degrees
     */
    getFacingAngleDegrees() {
        if (this._segments && this._segments.length > 0) {
            return this._segments[0].angle * 180 / Math.PI;
        }
        return this.gameObject.angle || 0;
    }

    /**
     * Set movement speed
     * @param {number} speed - New movement speed
     */
    setMoveSpeed(speed) {
        this.moveSpeed = speed;
    }

    die(killer = null) {
        if (this.isDead) return;

        this.isDead = true;
        this.decayTimer = 0;
        this.originalScale = this.gameObject.scale || 1.0;
        this._lastDamageSource = killer;

        // Clear this creature's own targeting (stop targeting others)
        if (this._targetingTarget) {
            const targetCreature = this._targetingTarget.getModule?.('ProceduralCreature');
            if (targetCreature && targetCreature._targetingCreature === this) {
                targetCreature.setTargetedBy(null);
            }
            this._targetingTarget = null;
        }

        // Clear targeting from any creature that was targeting this one
        // The _targetingCreature field tracks who is targeting us
        if (this._targetingCreature) {
            // The targeting creature should clear their target
            if (this._targetingCreature._targetingTarget === this.gameObject) {
                this._targetingCreature._targetingTarget = null;
            }
            this._targetingCreature = null;
        }
        this._isBeingTargeted = false;

        // Store original colors at death so we can darken them consistently
        this.deathBodyColor = this.bodyColor;
        this.deathHeadColor = this.headColor || this.bodyColor;
        this.deathEyeColor = this.eyeColor;

        // Drop all held items
        for (let i = 0; i < this._arms.length; i++) {
            if (this._arms[i].heldItem) {
                this.dropItem(i);
            }
        }

        // Set depth to background
        if (this.gameObject) {
            this.gameObject.depth = 1000000;
        }

        // Stop all movement
        this._wanderTarget = null;
        this._targetX = null;
        this._targetY = null;
        this._velocity.x = 0;
        this._velocity.y = 0;

        //console.log("Creature died and will decay over " + this.decayMaxTime + " seconds");
    }

    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON();
        json.type = 'ProceduralCreature';
        json.ignoreGameObjectTransform = this.ignoreGameObjectTransform;
        json.bodySegments = this.bodySegments;
        json.segmentLength = this.segmentLength;
        json.headSize = this.headSize;
        json.bodyWidth = this.bodyWidth;
        json.tailTaper = this.tailTaper;
        json.segmentSmoothing = this.segmentSmoothing;
        json.legPairs = this.legPairs;
        json.legSegments = this.legSegments;
        json.legLength = this.legLength;
        json.legThickness = this.legThickness;
        json.legSpread = this.legSpread;
        json.legForwardOffset = this.legForwardOffset;
        json.legRandomness = this.legRandomness;
        json.stepDistance = this.stepDistance;
        json.stepHeight = this.stepHeight;
        json.stepSpeed = this.stepSpeed;
        json.alternateLegs = this.alternateLegs;
        json.keepFeetOnStop = this.keepFeetOnStop;
        json.footGluingStrength = this.footGluingStrength;
        json.bodyColor = this.bodyColor;
        json.legColor = this.legColor;
        json.footColor = this.footColor;
        json.accentColor = this.accentColor;
        json.showEyes = this.showEyes;
        json.eyeCount = this.eyeCount;
        json.eyeSize = this.eyeSize;
        json.eyeStyle = this.eyeStyle;
        json.showPupil = this.showPupil;
        json.pupilSize = this.pupilSize;
        json.pupilColor = this.pupilColor;
        json.eyeExtrudeDistance = this.eyeExtrudeDistance;
        json.eyeExtrudeThickness = this.eyeExtrudeThickness;
        json.showJoints = this.showJoints;
        json.isometricAngle = this.isometricAngle;
        json.bodyHeight = this.bodyHeight;
        json.enable25DMode = this.enable25DMode;
        json.bodyElevation = this.bodyElevation;
        json.moveSpeed = this.moveSpeed;
        json.targetObject = this.targetObject;
        json.wanderRadius = this.wanderRadius;
        json.wanderWaitTime = this.wanderWaitTime;
        json.arrivalThreshold = this.arrivalThreshold;
        json.headLookEnabled = this.headLookEnabled;
        json.headLookRange = this.headLookRange;
        json.headLookSpeed = this.headLookSpeed;
        json.headLookObject = this.headLookObject;
        json.headMaxTurnAngle = this.headMaxTurnAngle;
        json.bodyMaxTurnAngle = this.bodyMaxTurnAngle;
        json.bodyTurnTaper = this.bodyTurnTaper;
        json.bodyShape = this.bodyShape;
        json.bodyScaleX = this.bodyScaleX;
        json.bodyScaleY = this.bodyScaleY;
        json.spinePattern = this.spinePattern;
        json.spineSize = this.spineSize;
        json.spineCount = this.spineCount;
        json.snakeWaveAmplitude = this.snakeWaveAmplitude;
        json.snakeWaveFrequency = this.snakeWaveFrequency;
        json.snakeWaveSpeed = this.snakeWaveSpeed;
        json.enableSnakeWave = this.enableSnakeWave;
        json.legJointStyle = this.legJointStyle;
        json.legTipShape = this.legTipShape;
        json.legOffsetVariation = this.legOffsetVariation;
        json.legBendStrength = this.legBendStrength;
        json.legGroundingStrength = this.legGroundingStrength;
        json.legAnticipation = this.legAnticipation;
        json.headShape = this.headShape;
        json.customHeadBackWidth = this.customHeadBackWidth;
        json.customHeadFrontWidth = this.customHeadFrontWidth;
        json.customHeadBackCurve = this.customHeadBackCurve;
        json.customHeadFrontCurve = this.customHeadFrontCurve;
        json.customHeadLength = this.customHeadLength;
        json.antennaCount = this.antennaCount;
        json.antennaLength = this.antennaLength;
        json.mandibles = this.mandibles;
        json.armTipShape = this.armTipShape;
        json.armTipSize = this.armTipSize;
        json.clawLength = this.clawLength;
        json.fingerCount = this.fingerCount;
        json.fingerSpread = this.fingerSpread;
        json.hairStyle = this.hairStyle;
        json.hairLength = this.hairLength;
        json.hairThickness = this.hairThickness;
        json.hairColor = this.hairColor;
        json.hairCount = this.hairCount;
        json.ponytailLength = this.ponytailLength;
        json.ponytailBounce = this.ponytailBounce;
        json.ponytailSegments = this.ponytailSegments;
        json.ponytailDrag = this.ponytailDrag;
        json.ponytailSpring = this.ponytailSpring;
        json.ponytailInertia = this.ponytailInertia;
        json.ponytailThickness = this.ponytailThickness;
        json.ponytailTaper = this.ponytailTaper;
        json.ponytailAccentColor = this.ponytailAccentColor;
        json.headAccessory = this.headAccessory;
        json.accessorySize = this.accessorySize;
        json.accessoryColor = this.accessoryColor;
        json.armCount = this.armCount;
        json.armLength = this.armLength;
        json.armThickness = this.armThickness;
        json.armSegments = this.armSegments;
        json.armReachRange = this.armReachRange;
        json.armReachSpeed = this.armReachSpeed;
        json.armColor = this.armColor;
        json.armSpringStiffness = this.armSpringStiffness;
        json.armSpringDamping = this.armSpringDamping;
        json.armRestForwardDistance = this.armRestForwardDistance;
        json.armRestOutwardAngle = this.armRestOutwardAngle;
        json.punchSpeed = this.punchSpeed;
        json.punchWindupDistance = this.punchWindupDistance;
        json.punchReachDistance = this.punchReachDistance;
        json.punchArcAmount = this.punchArcAmount;
        json.grabSpeed = this.grabSpeed;
        json.grabHoldTime = this.grabHoldTime;
        json.punchCooldown = this.punchCooldown;
        json.gunArmAiming = this.gunArmAiming;
        json.punchCrossBody = this.punchCrossBody;
        json.punchCrossAmount = this.punchCrossAmount;
        json.swingOvershootAmount = this.swingOvershootAmount;
        json.armSwingSpeed = this.armSwingSpeed;
        json.armSwingAmount = this.armSwingAmount;
        json.armSwingEnabled = this.armSwingEnabled;
        json.movementStyle = this.movementStyle;
        json.turnSpeed = this.turnSpeed;
        json.acceleration = this.acceleration;
        json.accentColor = this.accentColor;
        json.eyeColor = this.eyeColor;
        json.antennaColor = this.antennaColor;
        json.mandibleColor = this.mandibleColor;
        json.spineColor = this.spineColor;
        json.showEyes = this.showEyes;
        json.showShadow = this.showShadow;
        json.shadowOpacity = this.shadowOpacity;
        json.shadowBlur = this.shadowBlur;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowColor = this.shadowColor;
        json.maxHealth = this.maxHealth;
        json.health = this.health;
        json.armor = this.armor;
        json.isInvulnerable = this.isInvulnerable;
        json.friendlyFire = this.friendlyFire;
        json.bloodPrefab = this.bloodPrefab;
        json.punchDamage = this.punchDamage;
        json.punchKnockback = this.punchKnockback;
        json.weaponSolidCollision = this.weaponSolidCollision;
        json.weaponWeaponCollision = this.weaponWeaponCollision;
        json.weaponCollisionSolidTag = this.weaponCollisionSolidTag;
        json.weaponCollisionSearchRadius = this.weaponCollisionSearchRadius;
        json.weaponCollisionBounce = this.weaponCollisionBounce;
        json.backswingDamageMultiplier = this.backswingDamageMultiplier;
        json.constrainFeet = this.constrainFeet;
        json.footCollisionRadius = this.footCollisionRadius;
        json.footCollisionSolidTag = this.footCollisionSolidTag;
        json.footCollisionSearchRadius = this.footCollisionSearchRadius;
        json.targetingEnabled = this.targetingEnabled;
        json.targetingEnemyTag = this.targetingEnemyTag;
        json.targetingFriendlyTag = this.targetingFriendlyTag;
        json.targetingRange = this.targetingRange;
        json.targetingTurnSpeed = this.targetingTurnSpeed;
        json.targetingHeadLook = this.targetingHeadLook;
        json.targetingFacebody = this.targetingFacebody;
        json.gunAccuracy = this.gunAccuracy;
        json.isDead = this.isDead;
        json.decayTimer = this.decayTimer;
        json.decayMaxTime = this.decayMaxTime;
        json.deathPositions = this.deathPositions;
        json.deathAngles = this.deathAngles;
        json.originalScale = this.originalScale;
        json.generateRandomCreatureBoolean = this.generateRandomCreatureBoolean;
        json.bodySegments = this.bodySegments;
        json.snakeWaveAmplitude = this.snakeWaveAmplitude;
        json.snakeWaveFrequency = this.snakeWaveFrequency;
        json.snakeWaveSpeed = this.snakeWaveSpeed;
        json.segmentLength = this.segmentLength;
        json.headSize = this.headSize;
        json.bodyWidth = this.bodyWidth;
        json.tailTaper = this.tailTaper;
        json.legPairs = this.legPairs;
        json.legSegments = this.legSegments;
        json.legLength = this.legLength;
        json.legThickness = this.legThickness;
        json.legSpread = this.legSpread;
        json.legHipInset = this.legHipInset;
        json.legForwardOffset = this.legForwardOffset;
        json.legRandomness = this.legRandomness;
        json.generateRandomCreatureBoolean = this.generateRandomCreatureBoolean;
        json.stepDistance = this.stepDistance;
        json.stepHeight = this.stepHeight;
        json.stepSpeed = this.stepSpeed;
        json.armCount = this.armCount;
        json.armLength = this.armLength;
        json.armThickness = this.armThickness;
        json.armSegments = this.armSegments;
        json.armReachRange = this.armReachRange;
        json.armReachSpeed = this.armReachSpeed;
        json.armColor = this.armColor;
        json.armSpringStiffness = this.armSpringStiffness;
        json.armSpringDamping = this.armSpringDamping;
        json.armRestForwardDistance = this.armRestForwardDistance;
        json.armRestOutwardAngle = this.armRestOutwardAngle;
        json.armSwingEnabled = this.armSwingEnabled;
        json.armSwingSpeed = this.armSwingSpeed;
        json.armSwingAmount = this.armSwingAmount;
        json.armSwingEnabled = this.armSwingEnabled;
        json.armStrength = this.armStrength;
        json.punchSpeed = this.punchSpeed;
        json.punchWindupDistance = this.punchWindupDistance;
        json.punchReachDistance = this.punchReachDistance;
        json.punchArcAmount = this.punchArcAmount;
        json.swingOvershootAmount = this.swingOvershootAmount;
        json.grabSpeed = this.grabSpeed;
        json.grabHoldTime = this.grabHoldTime;
        json.bodyColor = this.bodyColor;
        json.legColor = this.legColor;
        json.footColor = this.footColor;
        json.accentColor = this.accentColor;
        json.eyeColor = this.eyeColor;
        json.antennaColor = this.antennaColor;
        json.mandibleColor = this.mandibleColor;
        json.spineColor = this.spineColor;
        json.showShadow = this.showShadow;
        json.shadowOpacity = this.shadowOpacity;
        json.shadowBlur = this.shadowBlur;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowColor = this.shadowColor;

        json.splineBody = this.splineBody;
        json.splineBodyTension = this.splineBodyTension;

        json.footAngleOffset = this.footAngleOffset;
        
        // Directional arrow properties
        json.showDirectionalArrow = this.showDirectionalArrow;
        json.directionalArrowColor = this.directionalArrowColor;
        json.directionalArrowHealthColor = this.directionalArrowHealthColor;
        json.directionalArrowOutlineColor = this.directionalArrowOutlineColor;
        json.directionalArrowOutlineWidth = this.directionalArrowOutlineWidth;
        json.directionalArrowOpacity = this.directionalArrowOpacity;
        json.directionalArrowSize = this.directionalArrowSize;
        json.directionalArrowOffset = this.directionalArrowOffset;
        
        // Target reticle properties
        json.showTargetReticle = this.showTargetReticle;
        json.targetReticleColor = this.targetReticleColor;
        json.targetReticleOutlineColor = this.targetReticleOutlineColor;
        json.targetReticleOutlineWidth = this.targetReticleOutlineWidth;
        json.targetReticleOpacity = this.targetReticleOpacity;
        json.targetReticleSize = this.targetReticleSize;
        json.targetReticleSpinSpeed = this.targetReticleSpinSpeed;
        json.targetReticlePulseSpeed = this.targetReticlePulseSpeed;
        json.targetReticlePulseAmount = this.targetReticlePulseAmount;
        json.targetReticleSegments = this.targetReticleSegments;
        
        json.isometricAngle = this.isometricAngle;
        json.enable25DMode = this.enable25DMode;
        json.bodyElevation = this.bodyElevation;
        json.bodyHeight = this.bodyHeight;
        json.moveSpeed = this.moveSpeed;
        json.targetObject = this.targetObject;
        json.wanderRadius = this.wanderRadius;
        json.wanderWaitTime = this.wanderWaitTime;
        json.headLookEnabled = this.headLookEnabled;
        json.headLookRange = this.headLookRange;
        json.headLookObject = this.headLookObject;
        json.headMaxTurnAngle = this.headMaxTurnAngle;
        json.bodyMaxTurnAngle = this.bodyMaxTurnAngle;
        json.bodyTurnTaper = this.bodyTurnTaper;
        json.segmentSmoothing = this.segmentSmoothing;
        json.alternateLegs = this.alternateLegs;
        json.keepFeetOnStop = this.keepFeetOnStop;
        json.showEyes = this.showEyes;
        json.eyeCount = this.eyeCount;
        json.eyeSize = this.eyeSize;
        json.eyeStyle = this.eyeStyle;
        json.showPupil = this.showPupil;
        json.pupilSize = this.pupilSize;
        json.pupilColor = this.pupilColor;
        json.eyeExtrudeDistance = this.eyeExtrudeDistance;
        json.eyeExtrudeThickness = this.eyeExtrudeThickness;
        json.showJoints = this.showJoints;
        json.arrivalThreshold = this.arrivalThreshold;
        json.headLookSpeed = this.headLookSpeed;
        json.bodyShape = this.bodyShape;
        json.bodyScaleX = this.bodyScaleX;
        json.bodyScaleY = this.bodyScaleY;
        json.spinePattern = this.spinePattern;
        json.spineSize = this.spineSize;
        json.spineCount = this.spineCount;
        json.legJointStyle = this.legJointStyle;
        json.legTipShape = this.legTipShape;
        json.legOffsetVariation = this.legOffsetVariation;
        json.headShape = this.headShape;
        json.customHeadBackWidth = this.customHeadBackWidth;
        json.customHeadFrontWidth = this.customHeadFrontWidth;
        json.customHeadBackCurve = this.customHeadBackCurve;
        json.customHeadFrontCurve = this.customHeadFrontCurve;
        json.customHeadLength = this.customHeadLength;
        json.antennaCount = this.antennaCount;
        json.antennaLength = this.antennaLength;
        json.mandibles = this.mandibles;
        json.movementStyle = this.movementStyle;
        json.turnSpeed = this.turnSpeed;
        json.acceleration = this.acceleration;
        json.decayMaxTime = this.decayMaxTime;
        json.isDead = this.isDead;
        // Breathing animation
        json.breathingEnabled = this.breathingEnabled;
        json.breathingSpeed = this.breathingSpeed;
        json.breathingAmount = this.breathingAmount;
        json.breathingAsync = this.breathingAsync;
        json.creatureScale = this.creatureScale;
        json.grabRange = this.grabRange;

        // Tail properties
        json.tailEnabled = this.tailEnabled;
        json.tailSegments = this.tailSegments;
        json.tailLength = this.tailLength;
        json.tailThickness = this.tailThickness;
        json.tailTaperAmount = this.tailTaperAmount;
        json.tailColor = this.tailColor;
        json.tailTipColor = this.tailTipColor;
        json.tailSpring = this.tailSpring;
        json.tailDamping = this.tailDamping;
        json.tailElasticity = this.tailElasticity;
        json.tailInertia = this.tailInertia;
        json.tailStiffness = this.tailStiffness;
        json.tailWaveEnabled = this.tailWaveEnabled;
        json.tailWaveSpeed = this.tailWaveSpeed;
        json.tailWaveAmplitude = this.tailWaveAmplitude;
        json.tailWaveSpeedVariation = this.tailWaveSpeedVariation;
        json.tailWaveCascade = this.tailWaveCascade;
        json.tailWaveCascadeDelay = this.tailWaveCascadeDelay;
        json.tailWaveIdleOnly = this.tailWaveIdleOnly;
        json.tailBodyPercent = this.tailBodyPercent;

        // Depth parallax properties
        json.depthEnabled = this.depthEnabled;
        json.depthIntensity = this.depthIntensity;
        json.maxDepthOffset = this.maxDepthOffset;
        json.headHeightDepth = this.headHeightDepth;
        json.bodyHeightDepth = this.bodyHeightDepth;
        json.armHeightDepth = this.armHeightDepth;
        json.handHeightDepth = this.handHeightDepth;
        json.legHeightDepth = this.legHeightDepth;

        json.wormDigEnabled = this.wormDigEnabled;
        json.wormBurrowSpeed = this.wormBurrowSpeed;
        json.wormSurfaceHoldTime = this.wormSurfaceHoldTime;
        json.wormAutoSurface = this.wormAutoSurface;
        json.wormAutoSurfaceInterval = this.wormAutoSurfaceInterval;
        json.wormAttackOnSurface = this.wormAttackOnSurface;
        json.wormParticleColor = this.wormParticleColor;
        json.wormParticleAccentColor = this.wormParticleAccentColor;
        json.wormParticleCount = this.wormParticleCount;
        json.wormParticleSize = this.wormParticleSize;
        json.wormParticleSpeed = this.wormParticleSpeed;
        json.wormParticleLifetime = this.wormParticleLifetime;
        json.wormParticleSpread = this.wormParticleSpread;
        json.wormShowUndergroundIndicator = this.wormShowUndergroundIndicator;
        json.wormIndicatorColor = this.wormIndicatorColor;
        json.wormIndicatorOpacity = this.wormIndicatorOpacity;
        json.wormIndicatorSize = this.wormIndicatorSize;
        
        json.gunAimMaxAngle = this.gunAimMaxAngle; // Maximum degrees arms can aim from forward direction
        json.gunCrossBodyAngleLimit = this.gunCrossBodyAngleLimit; // Maximum degrees arm can aim across body (prevents unrealistic cross-aiming)

        // Mouth style properties
        json.mouthStyle = this.mouthStyle;
        json.mouthColor = this.mouthColor;
        json.mouthTentacleCount = this.mouthTentacleCount;
        json.mouthTentacleLength = this.mouthTentacleLength;
        json.mouthTentacleThickness = this.mouthTentacleThickness;
        json.mouthTentacleTaper = this.mouthTentacleTaper;
        json.mouthTentacleSegments = this.mouthTentacleSegments;
        json.mouthTentacleSpread = this.mouthTentacleSpread;
        json.mouthTentacleStiffness = this.mouthTentacleStiffness;
        json.mouthTentacleSpring = this.mouthTentacleSpring;
        json.mouthTentacleDrag = this.mouthTentacleDrag;
        json.mouthTentacleInertia = this.mouthTentacleInertia;
        json.mouthTentacleCollision = this.mouthTentacleCollision;
        json.mouthTentacleAccentColor = this.mouthTentacleAccentColor;
        json.mouthTentacleSuckers = this.mouthTentacleSuckers;
        json.beakLength = this.beakLength;
        json.beakWidth = this.beakWidth;
        json.beakCurve = this.beakCurve;
        json.proboscisLength = this.proboscisLength;
        json.proboscisThickness = this.proboscisThickness;
        json.proboscisSegments = this.proboscisSegments;
        json.proboscisCoiled = this.proboscisCoiled;
        json.lampreyTeethRings = this.lampreyTeethRings;
        json.lampreyTeethPerRing = this.lampreyTeethPerRing;
        json.lampreyRingSpacing = this.lampreyRingSpacing;
        json.pincherLength = this.pincherLength;
        json.pincherWidth = this.pincherWidth;
        json.pincherOpening = this.pincherOpening;

        // TDTD
        json.tdtdEnabled = this.tdtdEnabled;
        json.tdtdZ = this.tdtdZ;
        json.tdtdAnchorY = this.tdtdAnchorY;

        return json;
    }

    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {ProceduralCreature} New instance
     */

    static fromJSON(json) {
        const module = new ProceduralCreature();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.ignoreGameObjectTransform = json.ignoreGameObjectTransform ?? false;
        module.bodySegments = json.bodySegments ?? 3;
        module.segmentLength = json.segmentLength ?? 20;
        module.headSize = json.headSize ?? 25;
        module.bodyWidth = json.bodyWidth ?? 18;
        module.tailTaper = json.tailTaper ?? 0.6;
        module.segmentSmoothing = json.segmentSmoothing ?? 0.15;
        module.legPairs = json.legPairs ?? 4;
        module.legSegments = json.legSegments ?? 2;
        module.legLength = json.legLength ?? 35;
        module.legThickness = json.legThickness ?? 4;
        module.legSpread = json.legSpread ?? 45;
        module.legHipInset = json.legHipInset ?? 0.5;
        module.legForwardOffset = json.legForwardOffset ?? 0.3;
        module.legRandomness = json.legRandomness ?? 0.15;
        module.stepDistance = json.stepDistance ?? 40;
        module.stepHeight = json.stepHeight ?? 8;
        module.stepSpeed = json.stepSpeed ?? 6;
        module.alternateLegs = json.alternateLegs ?? true;
        module.keepFeetOnStop = json.keepFeetOnStop ?? true;
        module.footGluingStrength = json.footGluingStrength ?? 0.95;
        module.bodyColor = json.bodyColor ?? "#3a2f4a";
        module.legColor = json.legColor ?? "#2d2436";
        module.footColor = json.footColor ?? "";
        module.accentColor = json.accentColor ?? "#6b5a7d";
        module.showEyes = json.showEyes ?? true;
        module.eyeCount = json.eyeCount ?? 2;
        module.eyeSize = json.eyeSize ?? 1.0;
        module.eyeStyle = json.eyeStyle ?? "round";
        module.showPupil = json.showPupil ?? true;
        module.pupilSize = json.pupilSize ?? 0.45;
        module.pupilColor = json.pupilColor ?? "#111111";
        module.eyeExtrudeDistance = json.eyeExtrudeDistance ?? 0;
        module.eyeExtrudeThickness = json.eyeExtrudeThickness ?? 2;
        module.showJoints = json.showJoints ?? true;
        module.isometricAngle = json.isometricAngle ?? 0;
        module.enable25DMode = json.enable25DMode ?? false;
        module.bodyElevation = json.bodyElevation ?? 30;
        module.bodyHeight = json.bodyHeight ?? 0;
        module.moveSpeed = json.moveSpeed ?? 80;
        module.targetObject = json.targetObject ?? "";
        module.wanderRadius = json.wanderRadius ?? 200;
        module.wanderWaitTime = json.wanderWaitTime ?? 2;
        module.arrivalThreshold = json.arrivalThreshold ?? 20;
        module.headLookEnabled = json.headLookEnabled ?? true;
        module.headLookRange = json.headLookRange ?? 150;
        module.headLookSpeed = json.headLookSpeed ?? 3;
        module.headLookObject = json.headLookObject ?? "interesting";
        module.headMaxTurnAngle = json.headMaxTurnAngle ?? 72;
        module.bodyMaxTurnAngle = json.bodyMaxTurnAngle ?? 0;
        module.bodyTurnTaper = json.bodyTurnTaper ?? 1.0;
        module.bodyShape = json.bodyShape ?? "ellipse";
        module.bodyScaleX = json.bodyScaleX ?? 1.0;
        module.bodyScaleY = json.bodyScaleY ?? 1.0;
        module.spinePattern = json.spinePattern ?? "none";
        module.spineSize = json.spineSize ?? 5;
        module.spineCount = json.spineCount ?? 6;
        module.snakeWaveAmplitude = json.snakeWaveAmplitude ?? 20;
        module.snakeWaveFrequency = json.snakeWaveFrequency ?? 2.0;
        module.snakeWaveSpeed = json.snakeWaveSpeed ?? 3.0;
        module.enableSnakeWave = json.enableSnakeWave ?? false;
        module.legJointStyle = json.legJointStyle ?? "smooth";
        module.legTipShape = json.legTipShape ?? "circle";
        module.legOffsetVariation = json.legOffsetVariation ?? 0.2;
        module.legBendStrength = json.legBendStrength ?? 1.0;
        module.legGroundingStrength = json.legGroundingStrength ?? 0.5;
        module.legAnticipation = json.legAnticipation ?? true;
        module.headShape = json.headShape ?? "ellipse";
        module.customHeadBackWidth = json.customHeadBackWidth ?? 0.5;
        module.customHeadFrontWidth = json.customHeadFrontWidth ?? 0.4;
        module.customHeadBackCurve = json.customHeadBackCurve ?? 0.5;
        module.customHeadFrontCurve = json.customHeadFrontCurve ?? 0.5;
        module.customHeadLength = json.customHeadLength ?? 1.0;
        module.antennaCount = json.antennaCount ?? 0;
        module.antennaLength = json.antennaLength ?? 15;
        module.mandibles = json.mandibles ?? false;
        module.armTipShape = json.armTipShape ?? "circle";
        module.armTipSize = json.armTipSize ?? 1.5;
        module.clawLength = json.clawLength ?? 8;
        module.fingerCount = json.fingerCount ?? 3;
        module.fingerSpread = json.fingerSpread ?? 30;
        module.hairStyle = json.hairStyle ?? "none";
        module.hairLength = json.hairLength ?? 20;
        module.hairThickness = json.hairThickness ?? 2;
        module.hairColor = json.hairColor ?? "#6b5a7d";
        module.hairCount = json.hairCount ?? 5;
        module.ponytailLength = json.ponytailLength ?? 30;
        module.ponytailBounce = json.ponytailBounce ?? true;
        module.ponytailSegments = json.ponytailSegments ?? 5;
        module.ponytailDrag = json.ponytailDrag ?? 0.92;
        module.ponytailSpring = json.ponytailSpring ?? 12;
        module.ponytailInertia = json.ponytailInertia ?? 80;
        module.ponytailThickness = json.ponytailThickness ?? 4;
        module.ponytailTaper = json.ponytailTaper ?? 0.7;
        module.ponytailAccentColor = json.ponytailAccentColor ?? "#8b7a9d";
        module.headAccessory = json.headAccessory ?? "none";
        module.accessorySize = json.accessorySize ?? 15;
        module.accessoryColor = json.accessoryColor ?? "#6b5a7d";
        module.armCount = json.armCount ?? 2;
        module.armLength = json.armLength ?? 30;
        module.armThickness = json.armThickness ?? 3;
        module.armSegments = json.armSegments ?? 2;
        module.armReachRange = json.armReachRange ?? 100;
        module.armReachSpeed = json.armReachSpeed ?? 4;
        module.armColor = json.armColor ?? "#2d2436";
        module.armSpringStiffness = json.armSpringStiffness ?? 8;
        module.armSpringDamping = json.armSpringDamping ?? 0.7;
        module.armRestForwardDistance = json.armRestForwardDistance ?? 0.8;
        module.armRestOutwardAngle = json.armRestOutwardAngle ?? 17;
        module.armStrength = json.armStrength ?? 1.0;
        module.punchSpeed = json.punchSpeed ?? 8;
        module.punchWindupDistance = json.punchWindupDistance ?? 0.3;
        module.punchReachDistance = json.punchReachDistance ?? 1.2;
        module.punchArcAmount = json.punchArcAmount ?? 25;
        module.swingOvershootAmount = json.swingOvershootAmount ?? 1.0;
        module.grabSpeed = json.grabSpeed ?? 5;
        module.grabHoldTime = json.grabHoldTime ?? 0.5;
        module.punchCooldown = json.punchCooldown ?? 0.15;
        module.gunArmAiming = json.gunArmAiming ?? true;
        module.punchCrossBody = json.punchCrossBody ?? true;
        module.punchCrossAmount = json.punchCrossAmount ?? 0.6;
        module.armSwingSpeed = json.armSwingSpeed ?? 2.5;
        module.armSwingAmount = json.armSwingAmount ?? 15;
        module.armSwingEnabled = json.armSwingEnabled ?? true;
        module.movementStyle = json.movementStyle ?? "wander";
        module.turnSpeed = json.turnSpeed ?? 180;
        module.acceleration = json.acceleration ?? 300;
        module.accentColor = json.accentColor ?? "#6b5a7d";
        module.eyeColor = json.eyeColor ?? "#ffffff";
        module.antennaColor = json.antennaColor ?? "#6b5a7d";
        module.mandibleColor = json.mandibleColor ?? "#6b5a7d";
        module.spineColor = json.spineColor ?? "#6b5a7d";
        module.showEyes = json.showEyes ?? true;
        module.showShadow = json.showShadow ?? true;
        module.shadowOpacity = json.shadowOpacity ?? 0.3;
        module.shadowBlur = json.shadowBlur ?? 15;
        module.shadowOffsetX = json.shadowOffsetX ?? 3;
        module.shadowOffsetY = json.shadowOffsetY ?? 5;
        module.shadowColor = json.shadowColor ?? "#000000";

        module.splineBody = json.splineBody ?? false;
        module.splineBodyTension = json.splineBodyTension ?? 0.4;

        module.footAngleOffset = json.footAngleOffset ?? 15;
        
        // Directional arrow properties
        module.showDirectionalArrow = json.showDirectionalArrow ?? false;
        module.directionalArrowColor = json.directionalArrowColor ?? "#4a90d9";
        module.directionalArrowHealthColor = json.directionalArrowHealthColor ?? false;
        module.directionalArrowOutlineColor = json.directionalArrowOutlineColor ?? "#ffffff";
        module.directionalArrowOutlineWidth = json.directionalArrowOutlineWidth ?? 2;
        module.directionalArrowOpacity = json.directionalArrowOpacity ?? 0.6;
        module.directionalArrowSize = json.directionalArrowSize ?? 1.0;
        module.directionalArrowOffset = json.directionalArrowOffset ?? 0;
        
        // Target reticle properties
        module.showTargetReticle = json.showTargetReticle ?? true;
        module.targetReticleColor = json.targetReticleColor ?? "#ff4444";
        module.targetReticleOutlineColor = json.targetReticleOutlineColor ?? "#ffffff";
        module.targetReticleOutlineWidth = json.targetReticleOutlineWidth ?? 2;
        module.targetReticleOpacity = json.targetReticleOpacity ?? 0.7;
        module.targetReticleSize = json.targetReticleSize ?? 1.0;
        module.targetReticleSpinSpeed = json.targetReticleSpinSpeed ?? 90;
        module.targetReticlePulseSpeed = json.targetReticlePulseSpeed ?? 2.0;
        module.targetReticlePulseAmount = json.targetReticlePulseAmount ?? 0.15;
        module.targetReticleSegments = json.targetReticleSegments ?? 4;

        module.wormDigEnabled = json.wormDigEnabled ?? false;
        module.wormBurrowSpeed = json.wormBurrowSpeed ?? 2.5;
        module.wormSurfaceHoldTime = json.wormSurfaceHoldTime ?? 3.5;
        module.wormAutoSurface = json.wormAutoSurface ?? true;
        module.wormAutoSurfaceInterval = json.wormAutoSurfaceInterval ?? [4, 10];
        module.wormAttackOnSurface = json.wormAttackOnSurface ?? true;
        module.wormParticleColor = json.wormParticleColor ?? "#8B6914";
        module.wormParticleAccentColor = json.wormParticleAccentColor ?? "#5a4010";
        module.wormParticleCount = json.wormParticleCount ?? 8;
        module.wormParticleSize = json.wormParticleSize ?? 5;
        module.wormParticleSpeed = json.wormParticleSpeed ?? 60;
        module.wormParticleLifetime = json.wormParticleLifetime ?? 0.6;
        module.wormParticleSpread = json.wormParticleSpread ?? 140;
        module.wormShowUndergroundIndicator = json.wormShowUndergroundIndicator ?? true;
        module.wormIndicatorColor = json.wormIndicatorColor ?? "#6B4F10";
        module.wormIndicatorOpacity = json.wormIndicatorOpacity ?? 0.45;
        module.wormIndicatorSize = json.wormIndicatorSize ?? 1.0;
        
        module.maxHealth = json.maxHealth ?? 100;
        module.health = json.health ?? 100;
        module.armor = json.armor ?? 0;
        module.isInvulnerable = json.isInvulnerable ?? false;
        module.isDead = json.isDead ?? false;
        module.friendlyFire = json.friendlyFire ?? false;
        module.bloodPrefab = json.bloodPrefab ?? '';
        module.punchDamage = json.punchDamage ?? 4;
        module.punchKnockback = json.punchKnockback ?? 30;
        module.weaponSolidCollision = json.weaponSolidCollision ?? true;
        module.weaponWeaponCollision = json.weaponWeaponCollision ?? true;
        module.weaponCollisionSolidTag = json.weaponCollisionSolidTag ?? 'solid';
        module.weaponCollisionSearchRadius = json.weaponCollisionSearchRadius ?? 200;
        module.weaponCollisionBounce = json.weaponCollisionBounce ?? 0.6;
        module.backswingDamageMultiplier = json.backswingDamageMultiplier ?? 0.4;
        module.constrainFeet = json.constrainFeet ?? true;
        module.footCollisionRadius = json.footCollisionRadius ?? 4;
        module.footCollisionSolidTag = json.footCollisionSolidTag ?? 'solid';
        module.footCollisionSearchRadius = json.footCollisionSearchRadius ?? 200;
        module.targetingEnabled = json.targetingEnabled ?? false;
        module.targetingEnemyTag = json.targetingEnemyTag ?? 'enemy';
        module.targetingFriendlyTag = json.targetingFriendlyTag ?? 'friendly';
        module.targetingRange = json.targetingRange ?? 250;
        module.targetingTurnSpeed = json.targetingTurnSpeed ?? 120;
        module.targetingHeadLook = json.targetingHeadLook ?? true;
        module.targetingFacebody = json.targetingFacebody ?? true;
        module.gunAccuracy = json.gunAccuracy ?? 0;
        module.decayTimer = json.decayTimer ?? 0;
        module.decayMaxTime = json.decayMaxTime ?? 30.0;
        module.deathPositions = json.deathPositions !== undefined ? json.deathPositions : null;
        module.deathAngles = json.deathAngles !== undefined ? json.deathAngles : null;
        module.originalScale = json.originalScale ?? 1.0;
        module.generateRandomCreatureBoolean = json.generateRandomCreatureBoolean ?? false;
        module.bodySegments = json.bodySegments !== undefined ? json.bodySegments : Math.floor(val);
        module.snakeWaveAmplitude = json.snakeWaveAmplitude !== undefined ? json.snakeWaveAmplitude : val;
        module.snakeWaveFrequency = json.snakeWaveFrequency !== undefined ? json.snakeWaveFrequency : val;
        module.snakeWaveSpeed = json.snakeWaveSpeed !== undefined ? json.snakeWaveSpeed : val;
        module.segmentLength = json.segmentLength !== undefined ? json.segmentLength : val;
        module.headSize = json.headSize !== undefined ? json.headSize : val;
        module.bodyWidth = json.bodyWidth !== undefined ? json.bodyWidth : val;
        module.tailTaper = json.tailTaper !== undefined ? json.tailTaper : val;
        module.legPairs = json.legPairs !== undefined ? json.legPairs : Math.floor(val);
        module.legSegments = json.legSegments !== undefined ? json.legSegments : Math.floor(val);
        module.legLength = json.legLength !== undefined ? json.legLength : val;
        module.legThickness = json.legThickness !== undefined ? json.legThickness : val;
        module.legSpread = json.legSpread !== undefined ? json.legSpread : val;
        module.legHipInset = json.legHipInset !== undefined ? json.legHipInset : 0.5;
        module.legForwardOffset = json.legForwardOffset !== undefined ? json.legForwardOffset : val;
        module.legRandomness = json.legRandomness !== undefined ? json.legRandomness : val;
        module.generateRandomCreatureBoolean = json.generateRandomCreatureBoolean !== undefined ? json.generateRandomCreatureBoolean : val;
        module.stepDistance = json.stepDistance !== undefined ? json.stepDistance : val;
        module.stepHeight = json.stepHeight !== undefined ? json.stepHeight : val;
        module.stepSpeed = json.stepSpeed !== undefined ? json.stepSpeed : val;
        module.armCount = json.armCount !== undefined ? json.armCount : Math.floor(val);
        module.armLength = json.armLength !== undefined ? json.armLength : val;
        module.armThickness = json.armThickness !== undefined ? json.armThickness : val;
        module.armSegments = json.armSegments !== undefined ? json.armSegments : Math.floor(val);
        module.armReachRange = json.armReachRange !== undefined ? json.armReachRange : val;
        module.armReachSpeed = json.armReachSpeed !== undefined ? json.armReachSpeed : val;
        module.armColor = json.armColor !== undefined ? json.armColor : val;
        module.armSpringStiffness = json.armSpringStiffness !== undefined ? json.armSpringStiffness : val;
        module.armSpringDamping = json.armSpringDamping !== undefined ? json.armSpringDamping : val;
        module.armRestForwardDistance = json.armRestForwardDistance !== undefined ? json.armRestForwardDistance : val;
        module.armRestOutwardAngle = json.armRestOutwardAngle !== undefined ? json.armRestOutwardAngle : val;
        module.armSwingEnabled = json.armSwingEnabled !== undefined ? json.armSwingEnabled : val;
        module.armSwingSpeed = json.armSwingSpeed !== undefined ? json.armSwingSpeed : val;
        module.armSwingAmount = json.armSwingAmount !== undefined ? json.armSwingAmount : val;
        module.armSwingEnabled = json.armSwingEnabled !== undefined ? json.armSwingEnabled : val;
        module.punchSpeed = json.punchSpeed !== undefined ? json.punchSpeed : val;
        module.punchWindupDistance = json.punchWindupDistance !== undefined ? json.punchWindupDistance : val;
        module.punchReachDistance = json.punchReachDistance !== undefined ? json.punchReachDistance : val;
        module.punchArcAmount = json.punchArcAmount !== undefined ? json.punchArcAmount : val;
        module.swingOvershootAmount = json.swingOvershootAmount !== undefined ? json.swingOvershootAmount : 1.0;
        module.grabSpeed = json.grabSpeed !== undefined ? json.grabSpeed : val;
        module.grabHoldTime = json.grabHoldTime !== undefined ? json.grabHoldTime : val;
        module.bodyColor = json.bodyColor !== undefined ? json.bodyColor : val;
        module.legColor = json.legColor !== undefined ? json.legColor : val;
        module.footColor = json.footColor !== undefined ? json.footColor : "";
        module.accentColor = json.accentColor !== undefined ? json.accentColor : val;
        module.eyeColor = json.eyeColor !== undefined ? json.eyeColor : val;
        module.antennaColor = json.antennaColor !== undefined ? json.antennaColor : val;
        module.mandibleColor = json.mandibleColor !== undefined ? json.mandibleColor : val;
        module.spineColor = json.spineColor !== undefined ? json.spineColor : val;
        module.showShadow = json.showShadow !== undefined ? json.showShadow : val;
        module.shadowOpacity = json.shadowOpacity !== undefined ? json.shadowOpacity : val;
        module.shadowBlur = json.shadowBlur !== undefined ? json.shadowBlur : val;
        module.shadowOffsetX = json.shadowOffsetX !== undefined ? json.shadowOffsetX : val;
        module.shadowOffsetY = json.shadowOffsetY !== undefined ? json.shadowOffsetY : val;
        module.shadowColor = json.shadowColor !== undefined ? json.shadowColor : val;
        module.isometricAngle = json.isometricAngle !== undefined ? json.isometricAngle : val;
        module.enable25DMode = json.enable25DMode !== undefined ? json.enable25DMode : val;
        module.bodyElevation = json.bodyElevation !== undefined ? json.bodyElevation : val;
        module.bodyHeight = json.bodyHeight !== undefined ? json.bodyHeight : val;
        module.moveSpeed = json.moveSpeed !== undefined ? json.moveSpeed : val;
        module.targetObject = json.targetObject !== undefined ? json.targetObject : val;
        module.wanderRadius = json.wanderRadius !== undefined ? json.wanderRadius : val;
        module.wanderWaitTime = json.wanderWaitTime !== undefined ? json.wanderWaitTime : val;
        module.headLookEnabled = json.headLookEnabled !== undefined ? json.headLookEnabled : val;
        module.headLookRange = json.headLookRange !== undefined ? json.headLookRange : val;
        module.headLookObject = json.headLookObject !== undefined ? json.headLookObject : val;
        module.headMaxTurnAngle = json.headMaxTurnAngle !== undefined ? json.headMaxTurnAngle : 72;
        module.bodyMaxTurnAngle = json.bodyMaxTurnAngle !== undefined ? json.bodyMaxTurnAngle : 0;
        module.bodyTurnTaper = json.bodyTurnTaper !== undefined ? json.bodyTurnTaper : 1.0;
        module.segmentSmoothing = json.segmentSmoothing !== undefined ? json.segmentSmoothing : val;
        module.alternateLegs = json.alternateLegs !== undefined ? json.alternateLegs : val;
        module.keepFeetOnStop = json.keepFeetOnStop !== undefined ? json.keepFeetOnStop : val;
        module.showEyes = json.showEyes !== undefined ? json.showEyes : val;
        module.eyeCount = json.eyeCount !== undefined ? json.eyeCount : val;
        module.eyeSize = json.eyeSize !== undefined ? json.eyeSize : 1.0;
        module.eyeStyle = json.eyeStyle !== undefined ? json.eyeStyle : "round";
        module.showPupil = json.showPupil !== undefined ? json.showPupil : true;
        module.pupilSize = json.pupilSize !== undefined ? json.pupilSize : 0.45;
        module.pupilColor = json.pupilColor !== undefined ? json.pupilColor : "#111111";
        module.eyeExtrudeDistance = json.eyeExtrudeDistance !== undefined ? json.eyeExtrudeDistance : 0;
        module.eyeExtrudeThickness = json.eyeExtrudeThickness !== undefined ? json.eyeExtrudeThickness : 2;
        module.showJoints = json.showJoints !== undefined ? json.showJoints : val;
        module.arrivalThreshold = json.arrivalThreshold !== undefined ? json.arrivalThreshold : val;
        module.headLookSpeed = json.headLookSpeed !== undefined ? json.headLookSpeed : val;
        module.bodyShape = json.bodyShape !== undefined ? json.bodyShape : val;
        module.bodyScaleX = json.bodyScaleX !== undefined ? json.bodyScaleX : val;
        module.bodyScaleY = json.bodyScaleY !== undefined ? json.bodyScaleY : val;
        module.spinePattern = json.spinePattern !== undefined ? json.spinePattern : val;
        module.spineSize = json.spineSize !== undefined ? json.spineSize : val;
        module.spineCount = json.spineCount !== undefined ? json.spineCount : val;
        module.legJointStyle = json.legJointStyle !== undefined ? json.legJointStyle : val;
        module.legTipShape = json.legTipShape !== undefined ? json.legTipShape : val;
        module.legOffsetVariation = json.legOffsetVariation !== undefined ? json.legOffsetVariation : val;
        module.headShape = json.headShape !== undefined ? json.headShape : val;
        module.customHeadBackWidth = json.customHeadBackWidth !== undefined ? json.customHeadBackWidth : 0.5;
        module.customHeadFrontWidth = json.customHeadFrontWidth !== undefined ? json.customHeadFrontWidth : 0.4;
        module.customHeadBackCurve = json.customHeadBackCurve !== undefined ? json.customHeadBackCurve : 0.5;
        module.customHeadFrontCurve = json.customHeadFrontCurve !== undefined ? json.customHeadFrontCurve : 0.5;
        module.customHeadLength = json.customHeadLength !== undefined ? json.customHeadLength : 1.0;
        module.antennaCount = json.antennaCount !== undefined ? json.antennaCount : val;
        module.antennaLength = json.antennaLength !== undefined ? json.antennaLength : val;
        module.mandibles = json.mandibles !== undefined ? json.mandibles : val;
        module.movementStyle = json.movementStyle !== undefined ? json.movementStyle : val;
        module.turnSpeed = json.turnSpeed !== undefined ? json.turnSpeed : val;
        module.acceleration = json.acceleration !== undefined ? json.acceleration : val;
        module.decayMaxTime = json.decayMaxTime !== undefined ? json.decayMaxTime : val;
        module.isDead = json.isDead !== undefined ? json.isDead : val;
        // Breathing animation
        module.breathingEnabled = json.breathingEnabled ?? true;
        module.breathingSpeed = json.breathingSpeed ?? 1.5;
        module.breathingAmount = json.breathingAmount ?? 0.08;
        module.breathingAsync = json.breathingAsync ?? true;
        module.creatureScale = json.creatureScale ?? 1.0;
        module.grabRange = json.grabRange ?? 60;

        // Tail properties
        module.tailEnabled = json.tailEnabled ?? false;
        module.tailSegments = json.tailSegments ?? 5;
        module.tailLength = json.tailLength ?? 40;
        module.tailThickness = json.tailThickness ?? 6;
        module.tailTaperAmount = json.tailTaperAmount ?? 0.85;
        module.tailColor = json.tailColor ?? "#3a2f4a";
        module.tailTipColor = json.tailTipColor ?? "";
        module.tailSpring = json.tailSpring ?? 12;
        module.tailDamping = json.tailDamping ?? 0.88;
        module.tailElasticity = json.tailElasticity ?? 0.6;
        module.tailInertia = json.tailInertia ?? 80;
        module.tailStiffness = json.tailStiffness ?? 0.3;
        module.tailWaveEnabled = json.tailWaveEnabled ?? false;
        module.tailWaveSpeed = json.tailWaveSpeed ?? 3.0;
        module.tailWaveAmplitude = json.tailWaveAmplitude ?? 25;
        module.tailWaveSpeedVariation = json.tailWaveSpeedVariation ?? 0.3;
        module.tailWaveCascade = json.tailWaveCascade ?? true;
        module.tailWaveCascadeDelay = json.tailWaveCascadeDelay ?? 0.15;
        module.tailWaveIdleOnly = json.tailWaveIdleOnly ?? false;
        module.tailBodyPercent = json.tailBodyPercent ?? 0;

        // Depth parallax properties
        module.depthEnabled = json.depthEnabled ?? false;
        module.depthIntensity = json.depthIntensity ?? 0.015;
        module.maxDepthOffset = json.maxDepthOffset ?? 20;
        module.headHeightDepth = json.headHeightDepth ?? 1.0;
        module.bodyHeightDepth = json.bodyHeightDepth ?? 0.7;
        module.armHeightDepth = json.armHeightDepth ?? 0.5;
        module.handHeightDepth = json.handHeightDepth ?? 0.25;
        module.legHeightDepth = json.legHeightDepth ?? 0.0;

        module.gunAimMaxAngle = json.gunAimMaxAngle ?? 90;
        module.gunCrossBodyAngleLimit = json.gunCrossBodyAngleLimit ?? 45;

        // Mouth style properties
        module.mouthStyle = json.mouthStyle ?? 'none';
        module.mouthColor = json.mouthColor ?? '#6b5a7d';
        module.mouthTentacleCount = json.mouthTentacleCount ?? 4;
        module.mouthTentacleLength = json.mouthTentacleLength ?? 25;
        module.mouthTentacleThickness = json.mouthTentacleThickness ?? 4;
        module.mouthTentacleTaper = json.mouthTentacleTaper ?? 0.7;
        module.mouthTentacleSegments = json.mouthTentacleSegments ?? 6;
        module.mouthTentacleSpread = json.mouthTentacleSpread ?? 60;
        module.mouthTentacleStiffness = json.mouthTentacleStiffness ?? 0.4;
        module.mouthTentacleSpring = json.mouthTentacleSpring ?? 12;
        module.mouthTentacleDrag = json.mouthTentacleDrag ?? 0.92;
        module.mouthTentacleInertia = json.mouthTentacleInertia ?? 80;
        module.mouthTentacleCollision = json.mouthTentacleCollision ?? true;
        module.mouthTentacleAccentColor = json.mouthTentacleAccentColor ?? '';
        module.mouthTentacleSuckers = json.mouthTentacleSuckers ?? false;
        module.beakLength = json.beakLength ?? 15;
        module.beakWidth = json.beakWidth ?? 10;
        module.beakCurve = json.beakCurve ?? 0.3;
        module.proboscisLength = json.proboscisLength ?? 30;
        module.proboscisThickness = json.proboscisThickness ?? 3;
        module.proboscisSegments = json.proboscisSegments ?? 8;
        module.proboscisCoiled = json.proboscisCoiled ?? false;
        module.lampreyTeethRings = json.lampreyTeethRings ?? 3;
        module.lampreyTeethPerRing = json.lampreyTeethPerRing ?? 8;
        module.lampreyRingSpacing = json.lampreyRingSpacing ?? 5;
        module.pincherLength = json.pincherLength ?? 12;
        module.pincherWidth = json.pincherWidth ?? 6;
        module.pincherOpening = json.pincherOpening ?? 0.4;

        // TDTD
        module.tdtdEnabled = json.tdtdEnabled ?? false;
        module.tdtdZ = json.tdtdZ ?? 0;
        module.tdtdAnchorY = json.tdtdAnchorY ?? 1.0;

        return module;
    }

    /**
     * Clone the module
     * @returns {ProceduralCreature} Cloned module
     */
    clone() {
        return ProceduralCreature.fromJSON(this.toJSON());
    }

    static documentation = {
        "Overview": `
            <h2>🐉 ProceduralCreature Overview</h2>
            <p>The <strong>ProceduralCreature</strong> module generates fully animated top-down creatures with IK locomotion, physics-based tails/hair, arms, and combat systems. Attach it to a GameObject and control it from other modules via its public API.</p>
            <ul>
                <li><strong>Body & Locomotion</strong> — Segmented body with IK legs, snake wave, and 2.5D support</li>
                <li><strong>Arms & Combat</strong> — Punch, grab, swing weapons, pick up and throw items</li>
                <li><strong>Health System</strong> — Take damage, heal, die, and decay</li>
                <li><strong>Targeting</strong> — Autonomous enemy targeting with head-look and body-turn</li>
                <li><strong>Movement Control</strong> — Drive movement externally via <code>movementStyle = 'controlled'</code></li>
            </ul>
            <div class="tip">Set <code>movementStyle = 'controlled'</code> on the creature before driving it from an external module (e.g. a Brain or Controller). This disables the built-in wander/patrol AI and lets your code own position and rotation.</div>
        `,
    
        "Movement Control": `
            <h2>🎮 Movement Control</h2>
            <p>To drive a creature externally, set <code>creature.movementStyle = 'controlled'</code>. The creature's IK, physics, and animations all still run — only the autonomous movement is disabled.</p>
    
            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>moveTowards(targetX, targetY, stopDistance?)</code></td><td>Move toward a world position. Returns <code>true</code> when arrived. Uses internal wander logic.</td></tr>
                <tr><td><code>setInput(x, y)</code></td><td>Set a normalized movement direction (-1 to 1). The creature accelerates in that direction.</td></tr>
                <tr><td><code>stop()</code></td><td>Immediately zero velocity and halt all movement.</td></tr>
                <tr><td><code>getVelocity()</code></td><td>Returns <code>{x, y}</code> current velocity in pixels/second.</td></tr>
                <tr><td><code>isMoving()</code></td><td>Returns <code>true</code> if the creature's velocity exceeds 1 px/s.</td></tr>
            </table>
    
            <h3>Example — external controller</h3>
            <pre><code>class EnemyBrain extends Module {
        start() {
            this._creature = this.gameObject.getModule('ProceduralCreature');
            this._creature.movementStyle = 'controlled';
        }
    
        loop(deltaTime) {
            const player = findObject('Player');
            if (!player) return;
    
            // Rotate body toward player
            const dx = player.position.x - this.gameObject.position.x;
            const dy = player.position.y - this.gameObject.position.y;
            const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            let diff = targetAngle - this.gameObject.angle;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            this.gameObject.angle += Math.sign(diff) * Math.min(Math.abs(diff), 180 * deltaTime);
    
            // Move forward
            const speed = this._creature.moveSpeed;
            const rad = this.gameObject.angle * Math.PI / 180;
            this.gameObject.position.x += Math.cos(rad) * speed * deltaTime;
            this.gameObject.position.y += Math.sin(rad) * speed * deltaTime;
        }
    }</code></pre>
        `,
    
        "Body & Segment Queries": `
            <h2>🦴 Body & Segment Queries</h2>
            <p>Inspect the creature's physical layout at runtime.</p>
    
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getSegmentCount()</code></td><td>Total number of body segments.</td></tr>
                <tr><td><code>getSegmentWorldPosition(index)</code></td><td>Returns <code>{x, y, angle}</code> for segment at <code>index</code> (0 = head). Returns <code>null</code> if out of range.</td></tr>
                <tr><td><code>getAllSegmentPositions()</code></td><td>Returns an array of <code>{x, y, angle, width}</code> for every segment.</td></tr>
                <tr><td><code>getHeadPosition()</code></td><td>Returns <code>{x, y, angle, lookAngle}</code> for the head segment including head-look offset.</td></tr>
                <tr><td><code>getTailPosition()</code></td><td>Returns <code>{x, y, angle}</code> for the last body segment.</td></tr>
                <tr><td><code>getCenterOfMass()</code></td><td>Returns <code>{x, y}</code> average of all segment positions.</td></tr>
                <tr><td><code>getBounds()</code></td><td>Returns <code>{minX, minY, maxX, maxY, width, height, centerX, centerY}</code> encompassing the entire creature including legs and arms.</td></tr>
                <tr><td><code>isPointInBody(worldX, worldY)</code></td><td>Returns hit info <code>{segmentIndex, localX, localY, distance, worldPos, angle}</code> or <code>null</code>.</td></tr>
                <tr><td><code>getClosestPointOnBody(worldX, worldY)</code></td><td>Returns <code>{segmentIndex, worldX, worldY, distance}</code> for the nearest segment center.</td></tr>
            </table>
        `,
    
        "Leg Queries": `
            <h2>🦵 Leg Queries</h2>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getLegCount()</code></td><td>Total number of individual legs (leg pairs × 2).</td></tr>
                <tr><td><code>getLegPosition(legIndex)</code></td><td>Returns <code>{x, y, isMoving, side, pairIndex}</code> for the foot of a specific leg. Returns <code>null</code> if out of range.</td></tr>
                <tr><td><code>getAllLegPositions()</code></td><td>Returns an array of all leg foot positions with base positions and movement state.</td></tr>
                <tr><td><code>isAnyStepping()</code></td><td>Returns <code>true</code> if any leg is currently mid-step.</td></tr>
            </table>
        `,
    
        "Directional & FOV Queries": `
            <h2>🧭 Directional & FOV Queries</h2>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getFacingAngle()</code></td><td>Returns the head's facing angle in radians (includes head-look offset).</td></tr>
                <tr><td><code>getFacingAngleDegrees()</code></td><td>Same as above but in degrees.</td></tr>
                <tr><td><code>getDistanceToPoint(x, y)</code></td><td>Distance from the head to a world point.</td></tr>
                <tr><td><code>getAngleToPoint(x, y)</code></td><td>Angle in radians from the head toward a world point.</td></tr>
                <tr><td><code>isPointInRange(x, y, range)</code></td><td>Returns <code>true</code> if the world point is within <code>range</code> pixels of the head.</td></tr>
                <tr><td><code>isPointInFront(x, y, fovDegrees?)</code></td><td>Returns <code>true</code> if the world point is within the forward field of view. Default FOV is 90°.</td></tr>
                <tr><td><code>isInFieldOfView(x, y, fovDegrees?)</code></td><td>Alias for <code>isPointInFront</code>. Default FOV is 120°.</td></tr>
            </table>
        `,
    
        "Hand & Arm Control": `
            <h2>✋ Hand & Arm Control</h2>
            <p>Arms are indexed 0–N. Left-side arms have <code>side === -1</code>, right-side arms have <code>side === 1</code>.</p>
    
            <h3>Reading hand state</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getHandPosition(armIndex)</code></td><td>Returns <code>{x, y, isReaching, target}</code> world position of the hand.</td></tr>
                <tr><td><code>getAllHandPositions()</code></td><td>Returns an array of hand positions for all arms.</td></tr>
                <tr><td><code>getArmState(armIndex)</code></td><td>Returns state string: <code>'idle'</code>, <code>'punching'</code>, <code>'grabbing'</code>, <code>'holding'</code>, <code>'returning'</code>, <code>'holdingItem'</code>, <code>'throwing'</code>.</td></tr>
                <tr><td><code>isArmPunching(armIndex)</code></td><td>Returns <code>true</code> if the arm is in the punching state.</td></tr>
                <tr><td><code>isArmGrabbing(armIndex)</code></td><td>Returns <code>true</code> if the arm is grabbing or holding.</td></tr>
                <tr><td><code>getArmPunchPower(armIndex)</code></td><td>Returns current punch power (0 when not swinging).</td></tr>
                <tr><td><code>resetArmState(armIndex)</code></td><td>Force the arm back to idle, dropping any held item.</td></tr>
            </table>
    
            <h3>Pointing hands</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>handPointTo(armIndex, x, y)</code></td><td>Aim the arm's gun toward a world position. Call every frame to maintain aim; used primarily for gun aiming.</td></tr>
                <tr><td><code>handClearPointTarget(armIndex)</code></td><td>Release the point-to target for one arm.</td></tr>
                <tr><td><code>handClearAllPointTargets()</code></td><td>Release all arm point-to targets.</td></tr>
                <tr><td><code>setHandTarget(armIndex, worldX, worldY, temporary?)</code></td><td>Drive a hand to a world position. Set <code>temporary = true</code> to return to auto after reaching.</td></tr>
                <tr><td><code>releaseHandControl(armIndex)</code></td><td>Return an arm to automatic behavior.</td></tr>
                <tr><td><code>pointHandAtWorld(armIndex, worldX, worldY, temporary?)</code></td><td>Alias for <code>setHandTarget</code>.</td></tr>
                <tr><td><code>pointHandAtRelative(armIndex, relX, relY, temporary?)</code></td><td>Point hand at an offset relative to the creature's position.</td></tr>
                <tr><td><code>pointHandAtMouse(armIndex, temporary?)</code></td><td>Point hand toward the current mouse position.</td></tr>
                <tr><td><code>pointRightHandAt(worldX, worldY, temporary?)</code></td><td>Point the first right-side arm at a world position.</td></tr>
                <tr><td><code>pointLeftHandAt(worldX, worldY, temporary?)</code></td><td>Point the first left-side arm at a world position.</td></tr>
                <tr><td><code>pointAllHandsAtWorld(worldX, worldY, temporary?)</code></td><td>Point all arms at the same world position.</td></tr>
                <tr><td><code>pointAllHandsAtRelative(relX, relY, temporary?)</code></td><td>Point all arms at the same relative offset.</td></tr>
                <tr><td><code>pointAllHandsAtMouse(temporary?)</code></td><td>Point all arms at the mouse.</td></tr>
            </table>
    
            <h3>Example — aim right hand at mouse</h3>
            <pre><code>loop(deltaTime) {
        const creature = this.gameObject.getModule('ProceduralCreature');
        const engine = this.gameObject._engine;
        const mx = engine.inputManager.mouseX;
        const my = engine.inputManager.mouseY;
        creature.pointRightHandAt(mx, my);
    }</code></pre>
        `,
    
        "Combat — Punch & Grab": `
            <h2>👊 Combat — Punch & Grab</h2>
    
            <h3>Punching</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>punchWithArm(armIndex, targetX?, targetY?)</code></td><td>Trigger a punch or weapon swing on the specified arm. If the arm holds a weapon, performs an arc swing; if a gun, fires it. Returns <code>false</code> if on cooldown or already punching.</td></tr>
                <tr><td><code>punchAlternate(targetX?, targetY?)</code></td><td>Punch with the next available arm in sequence — the primary combo driver for controllers. Automatically cycles through all arms.</td></tr>
                <tr><td><code>punchCombo(targetX?, targetY?)</code></td><td>Chain punches with alternating arms, respecting the combo window timing.</td></tr>
                <tr><td><code>punchRight(targetX?, targetY?)</code></td><td>Punch with the first right-side arm.</td></tr>
                <tr><td><code>punchLeft(targetX?, targetY?)</code></td><td>Punch with the first left-side arm.</td></tr>
                <tr><td><code>headbutt(targetX?, targetY?)</code></td><td>For creatures without arms — performs a head-lunge attack using <code>punchDamage</code> and <code>punchKnockback</code>.</td></tr>
                <tr><td><code>stopFiring(armIndex?)</code></td><td>Release the trigger on any held gun. Pass <code>-1</code> (default) to release all arms.</td></tr>
            </table>
    
            <h3>Grabbing</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>grabWithArm(armIndex, targetX, targetY)</code></td><td>Make an arm reach out to grab at a world position.</td></tr>
                <tr><td><code>grabRight(targetX, targetY)</code></td><td>Grab with the first right-side arm.</td></tr>
                <tr><td><code>grabLeft(targetX, targetY)</code></td><td>Grab with the first left-side arm.</td></tr>
                <tr><td><code>grabForward(targetX, targetY)</code></td><td>Reach toward a position; picks up any <code>ProceduralCreatureItem</code> within grab range. Does a short empty reach if nothing is nearby.</td></tr>
            </table>
    
            <h3>Checking hits</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>checkHitAgainst(targetCreature)</code></td><td>Returns <code>{hit, damage, armIndex, hitX, hitY}</code> — checks if any active punch/swing is currently intersecting the target creature.</td></tr>
            </table>
        `,
    
        "Items — Pick Up, Hold, Drop, Throw": `
            <h2>🗡️ Items — Pick Up, Hold, Drop, Throw</h2>
            <p>Items are <code>ProceduralCreatureItem</code> modules on separate GameObjects.</p>
    
            <h3>Picking up</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>pickUpItem(armIndex, itemModule)</code></td><td>Attach a <code>ProceduralCreatureItem</code> to the specified arm. Calls <code>item.onPickedUp()</code>. Returns <code>false</code> if the arm is unavailable or a two-handed item can't find a free opposing arm.</td></tr>
                <tr><td><code>getNextEmptyArm()</code></td><td>Returns the index of the first arm not holding an item. Returns <code>-1</code> if all arms are full.</td></tr>
                <tr><td><code>getNextEmptyArmForTwoHanded()</code></td><td>Returns the index of the first arm that has a free opposing arm for two-handed grip. Returns <code>-1</code> if none available.</td></tr>
            </table>
    
            <h3>Inspecting held items</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getHeldItem(armIndex)</code></td><td>Returns the <code>ProceduralCreatureItem</code> held by the arm, or <code>null</code>.</td></tr>
                <tr><td><code>isHoldingItem()</code></td><td>Returns <code>true</code> if any arm is holding an item.</td></tr>
                <tr><td><code>getHeldItemCount()</code></td><td>Returns the number of arms currently holding items.</td></tr>
                <tr><td><code>getLastFilledArm()</code></td><td>Returns the index of the last arm that is holding an item (reverse order).</td></tr>
                <tr><td><code>getEffectiveArmStrength(armIndex)</code></td><td>Returns arm strength, doubled if the arm holds a two-handed item with both hands actively gripping.</td></tr>
                <tr><td><code>isTwoHandedGripActive(armIndex)</code></td><td>Returns <code>true</code> if a two-handed item is held and the opposing arm is actively supporting it.</td></tr>
                <tr><td><code>getOpposingArmIndex(armIndex)</code></td><td>Returns the index of the paired opposing arm, or <code>-1</code> if no pair exists.</td></tr>
                <tr><td><code>isOpposingArmFree(armIndex)</code></td><td>Returns <code>true</code> if the opposing paired arm exists and is not busy.</td></tr>
            </table>
    
            <h3>Dropping & throwing</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>dropItem(armIndex)</code></td><td>Drop the item from a specific arm. Calls <code>item.onDropped()</code>.</td></tr>
                <tr><td><code>dropLastItem()</code></td><td>Drop the item from the last filled arm.</td></tr>
                <tr><td><code>dropAllItems()</code></td><td>Drop items from all arms.</td></tr>
                <tr><td><code>throwItem(armIndex, throwSpeed, dirX?, dirY?, forwardOffset?)</code></td><td>Throw the item held by the arm with a windup animation. Speed is modified by arm strength and item weight.</td></tr>
                <tr><td><code>throwLastItem(throwSpeed, dirX?, dirY?, forwardOffset?)</code></td><td>Throw from the last filled arm.</td></tr>
            </table>
    
            <h3>Example — pick up and throw</h3>
            <pre><code>// Pick up the nearest item
    creature.grabForward(targetX, targetY); // arm reaches and picks up automatically
    
    // Or manually find and pick up:
    const item = nearbyObject.getModule('ProceduralCreatureItem');
    const armIdx = creature.getNextEmptyArm();
    if (armIdx !== -1) creature.pickUpItem(armIdx, item);
    
    // Throw it toward a target
    const dir = { x: targetX - creature.gameObject.position.x,
                  y: targetY - creature.gameObject.position.y };
    const len = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
    creature.throwLastItem(400, dir.x / len, dir.y / len, 30);</code></pre>
        `,
    
        "Health & Combat": `
            <h2>❤️ Health & Combat</h2>
    
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>takeDamage(amount, source?, knockbackX?, knockbackY?)</code></td><td>Deal damage after armor reduction. Triggers damage flash, spawns blood prefab, applies knockback, and calls <code>die()</code> if health reaches 0. Returns actual damage dealt.</td></tr>
                <tr><td><code>heal(amount)</code></td><td>Restore health up to <code>maxHealth</code>. Returns actual amount healed.</td></tr>
                <tr><td><code>die(killer?)</code></td><td>Trigger death: drops items, stops movement, begins decay. Does nothing if already dead.</td></tr>
            </table>
    
            <h3>Key properties</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>health</code></td><td>Current hit points.</td></tr>
                <tr><td><code>maxHealth</code></td><td>Maximum hit points.</td></tr>
                <tr><td><code>armor</code></td><td>Flat damage reduction applied before <code>health</code> loss.</td></tr>
                <tr><td><code>isInvulnerable</code></td><td>When <code>true</code>, <code>takeDamage</code> has no effect.</td></tr>
                <tr><td><code>isDead</code></td><td>Read-only flag set by <code>die()</code>.</td></tr>
                <tr><td><code>friendlyFire</code></td><td>When <code>true</code>, this creature's attacks can hit creatures sharing the same tag.</td></tr>
                <tr><td><code>punchDamage</code></td><td>Damage dealt by bare-fist punches and headbutts.</td></tr>
                <tr><td><code>punchKnockback</code></td><td>Knockback force for bare-fist punches and headbutts.</td></tr>
            </table>
    
            <h3>Example</h3>
            <pre><code>const creature = enemy.getModule('ProceduralCreature');
    
    // Deal 25 damage with knockback away from attacker
    const dx = enemy.position.x - attacker.position.x;
    const dy = enemy.position.y - attacker.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    creature.takeDamage(25, attacker, (dx/dist)*200, (dy/dist)*200);
    
    // Check alive
    if (!creature.isDead) {
        creature.heal(10);
    }</code></pre>
        `,
    
        "Targeting System": `
            <h2>🎯 Targeting System</h2>
            <p>The autonomous targeting system finds and faces the nearest enemy. Enable it with <code>targetingEnabled = true</code> and set <code>targetingEnemyTag</code>.</p>
    
            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getTarget()</code></td><td>Returns the current targeting target GameObject, or <code>null</code>.</td></tr>
                <tr><td><code>setTarget(obj)</code></td><td>Manually override the targeting target. Pass <code>null</code> to clear. Handles reticle updates automatically.</td></tr>
                <tr><td><code>setTargetedBy(creature)</code></td><td>Called by other creatures to show the target reticle on this creature. Pass <code>null</code> to clear.</td></tr>
                <tr><td><code>isBeingTargeted()</code></td><td>Returns <code>true</code> if another creature is currently targeting this one.</td></tr>
            </table>
    
            <h3>Key properties</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>targetingEnabled</code></td><td>Master toggle for autonomous targeting.</td></tr>
                <tr><td><code>targetingEnemyTag</code></td><td>Comma-separated tags considered hostile.</td></tr>
                <tr><td><code>targetingFriendlyTag</code></td><td>Comma-separated tags to exclude from targeting.</td></tr>
                <tr><td><code>targetingRange</code></td><td>Detection radius in pixels.</td></tr>
                <tr><td><code>targetingTurnSpeed</code></td><td>Degrees per second to face the target.</td></tr>
                <tr><td><code>targetingFacebody</code></td><td>Whether the body turns to face the target.</td></tr>
                <tr><td><code>targetingHeadLook</code></td><td>Whether the head tracks the target.</td></tr>
                <tr><td><code>gunAccuracy</code></td><td>Lead prediction for guns: 0 = no lead, 1 = perfect prediction accounting for both target and self velocity.</td></tr>
            </table>
        `,
    
        "Visual & Appearance": `
            <h2>🎨 Visual & Appearance</h2>
    
            <h3>Colors</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>getColors()</code></td><td>Returns an object with all color properties: <code>{body, leg, arm, accent, eye, hair, spine, antenna, mandible}</code>.</td></tr>
                <tr><td><code>setColors(colorsObj)</code></td><td>Set multiple colors at once. Pass only the keys you want to change.</td></tr>
            </table>
    
            <h3>Presets & Randomization</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>applyPreset(presetName)</code></td><td>Apply a named preset: <code>'human'</code>, <code>'spider'</code>, <code>'centipede'</code>, <code>'lizard'</code>, <code>'ant'</code>, <code>'crab'</code>, <code>'snake'</code>, <code>'octopus'</code>, <code>'dog'</code>, <code>'cat'</code>, <code>'scorpion'</code>, <code>'bird'</code>, <code>'worm'</code>, <code>'beetle'</code>, <code>'jellyfish'</code>, <code>'dragon'</code>, <code>'frog'</code>, <code>'mantis'</code>, <code>'wolf'</code>, <code>'turtle'</code>, <code>'mosquito'</code>, <code>'crocodile'</code>, <code>'lobster'</code>. Returns <code>true</code> on success.</td></tr>
                <tr><td><code>getAvailablePresets()</code></td><td>Returns an array of all preset name strings.</td></tr>
                <tr><td><code>randomize()</code></td><td>Fully randomize the creature's appearance using a coherent archetype-based scheme.</td></tr>
            </table>
    
            <h3>Scale</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>creatureScale</code></td><td>Uniform scale multiplier applied to all creature dimensions. Negative values flip horizontally.</td></tr>
            </table>
        `,
    
        "Runtime Grid Modification": `
            <h2>⚙️ Runtime Modification</h2>
            <p>These methods let you change creature properties and rebuild internal state at runtime.</p>
    
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>setMoveSpeed(speed)</code></td><td>Change the creature's movement speed.</td></tr>
                <tr><td><code>refreshInspector()</code></td><td>Force the inspector UI to reload this module's properties. Call after bulk property changes in the editor.</td></tr>
            </table>
    
            <p>To rebuild the creature's legs and arms after changing structural properties (e.g. <code>legPairs</code>, <code>armCount</code>), call the internal method:</p>
            <pre><code>creature._initializeCreature(); // Rebuilds legs, arms, tail chain, segments</code></pre>
    
            <div class="tip">Always call <code>_initializeCreature()</code> after changing <code>bodySegments</code>, <code>legPairs</code>, <code>armCount</code>, <code>tailEnabled</code>, or any structural property at runtime.</div>
        `,
    
        "Full Controller Example": `
            <h2>📋 Full Controller Example</h2>
            <p>A complete pattern for a player-controlled creature with WASD movement, mouse aim, and attack:</p>
    
            <pre><code>class PlayerCreatureController extends Module {
        start() {
            this._c = this.gameObject.getModule('ProceduralCreature');
            this._c.movementStyle = 'controlled';
            this._input = this.gameObject._engine.inputManager;
        }
    
        loop(deltaTime) {
            const c = this._c;
            const speed = c.moveSpeed;
    
            // --- Movement (WASD) ---
            let mx = 0, my = 0;
            if (this._input.isKeyDown('KeyW') || this._input.isKeyDown('ArrowUp'))    my -= 1;
            if (this._input.isKeyDown('KeyS') || this._input.isKeyDown('ArrowDown'))  my += 1;
            if (this._input.isKeyDown('KeyA') || this._input.isKeyDown('ArrowLeft'))  mx -= 1;
            if (this._input.isKeyDown('KeyD') || this._input.isKeyDown('ArrowRight')) mx += 1;
    
            if (mx !== 0 || my !== 0) {
                const len = Math.sqrt(mx*mx + my*my);
                this.gameObject.position.x += (mx/len) * speed * deltaTime;
                this.gameObject.position.y += (my/len) * speed * deltaTime;
    
                // Face movement direction
                const targetAngle = Math.atan2(my, mx) * 180 / Math.PI;
                let diff = targetAngle - this.gameObject.angle;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                this.gameObject.angle += diff * Math.min(1, c.turnSpeed * deltaTime / 180);
            }
    
            // --- Aim right hand at mouse ---
            c.handPointTo(
                c._arms.findIndex(a => a.side === 1),
                this._input.mouseX,
                this._input.mouseY
            );
    
            // --- Attack on left mouse button ---
            if (this._input.isMouseButtonDown(0)) {
                c.punchAlternate(this._input.mouseX, this._input.mouseY);
            }
    
            // --- Grab on right mouse button ---
            if (this._input.isMouseButtonPressed(2)) {
                c.grabForward(this._input.mouseX, this._input.mouseY);
            }
    
            // --- Throw on E key ---
            if (this._input.isKeyPressed('KeyE') && c.isHoldingItem()) {
                const dx = this._input.mouseX - this.gameObject.position.x;
                const dy = this._input.mouseY - this.gameObject.position.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                c.throwLastItem(500, dx/len, dy/len, 40);
            }
        }
    }</code></pre>
        `
    };
}

window.ProceduralCreature = ProceduralCreature;
