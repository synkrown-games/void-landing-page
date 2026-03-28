/**
 * VehicleController Module
 * Advanced top-down vehicle physics with drift, gears, hover, and full customization.
 * Requires a Rigidbody module on the same object for collision response.
 * Supports: Drift cars, hover vehicles, tanks, boats, arcade racers, realistic sims.
 */

class VehicleController extends Module {
    constructor() {
        super();

        // ── Vehicle Type ──
        this.vehiclePreset = 'sport';

        this.playerControlled = true;   // if false, can be used for AI or stationary vehicles

        // ── Engine ──
        // enginePower is in HP (horsepower). Internally converted to force via:
        //   force = HP × HP_TO_FORCE_SCALE × torqueCurve × gearTorqueFactor
        // Reference: 150hp = economy car, 300hp = sport, 500hp+ = muscle/supercar (will lose traction easily)
        this.enginePower = 300;           // horsepower (HP) — realistic car values
        this.reversePower = 150;
        this.brakePower = 1800;
        this.idleRPM = 800;
        this.maxRPM = 7000;
        this.redlineRPM = 6800;
        this.vehicleWeightKg = 1400;      // vehicle weight in kg — affects traction, acceleration, and braking

        // ── Transmission ──
        this.transmissionType = 'automatic'; // automatic | manual | cvt
        this.gearCount = 5;
        this.gearConfigMode = 'maxSpeed';     // 'ratio' or 'maxSpeed' - how gears are configured
        this.gearRatios = [3.6, 2.4, 1.65, 1.1, 0.8];
        this.gearMaxSpeeds = [60, 100, 150, 200, 280];  // max speed per gear in km/h
        this.reverseGearRatio = 3.2;
        this.reverseMaxSpeed = 40;            // reverse max speed in km/h
        this.finalDriveRatio = 3.5;
        this.shiftUpRPM = 6200;
        this.shiftDownRPM = 2500;
        this.shiftTime = 0.15;
        this.shiftTimePerGear = 0.05;         // additional shift time per gear (higher gears shift slower)
        this.gearShiftAccelLoss = 0.85;    // 0-1: how much acceleration is lost during gear shift (manual feel)
        this.fullThrottleRevTime = 1.0;    // seconds to rev from idle to max RPM at full throttle

        // ── Steering ──
        this.maxSteerAngle = 35;          // degrees
        this.steerSpeed = 3.5;            // how fast wheel turns (radians/s equivalent speed)
        this.steerReturnSpeed = 5.0;      // how fast steering re-centres
        this.counterSteerFactor = 1.5;    // bonus steer speed when counter steering
        this.speedSensitiveSteering = true;
        this.minSteerAtSpeed = 0.3;       // steering multiplier at top speed

        // ── Tyre Grip ──
        this.frontGrip = 1.0;
        this.rearGrip = 1.0;
        this.tyreGripRating = 1.0;         // overall tyre grip quality (0.5 = budget, 1.0 = sport, 1.5 = slicks)
        this.gripFalloffSpeed = 400;      // speed at which grip starts falling off
        this.gripMinMultiplier = 0.5;     // min grip at very high speed

        // ── Drift ──
        this.driftEnabled = true;
        this.driftTrigger = 'handbrake'; // handbrake | oversteer | always
        this.driftGripMultiplier = 0.35;
        this.driftSteerMultiplier = 1.6;
        this.driftCounterSteer = true;
        this.driftBoostEnabled = true;
        this.driftBoostChargeRate = 150;
        this.driftBoostMaxCharge = 500;
        this.driftBoostForce = 2000;
        this.driftBoostDuration = 0.4;

        // ── High-Speed Momentum & Drift Physics ──
        this.highSpeedMomentum = 0.7;           // 0-1: how much vehicle resists direction change at high speed (0 = arcade, 1 = realistic)
        this.momentumSpeedThreshold = 120;      // km/h: speed above which momentum effects kick in
        this.driftMomentumRetention = 0.85;     // 0-1: how much original travel direction is preserved during drift
        this.weightMomentumFactor = 1.0;        // multiplier: heavier vehicles retain more momentum (auto-scaled by weight)
        this.powerOvercomeMomentum = 0.5;       // 0-1: how much engine power helps overcome momentum (high power = redirect faster)
        this.momentumRecoveryRate = 2.0;        // how fast momentum alignment recovers when not drifting (higher = snappier)
        this.momentumSlideFriction = 0.5;       // 0-1: friction applied during momentum sliding (0 = ice/no friction, 1 = heavy friction/quick stop)

        // ── Handbrake ──
        this.handbrakeStrength = 0.3;     // 0-1 multiplier for handbrake braking force
        this.handbrakeSlideFriction = 1.5; // kinetic friction while handbrake is held

        // ── Drag & Resistance ──
        this.linearDrag = 0.5;
        this.angularDrag = 4.0;
        this.rollingResistance = 0.015;
        this.airResistanceCoeff = 0.0005;

        // ── Hover Physics ──
        this.hoverEnabled = false;
        this.hoverHeight = 30;            // visual bob amplitude
        this.hoverFrequency = 2.5;        // bob speed
        this.hoverSlipFactor = 0.6;       // 0 = no lateral grip (ice), 1 = full grip
        this.hoverTiltAmount = 8;         // degrees of visual tilt on steering

        // ── Boat Physics ──
        this.boatMode = false;
        this.waterDrag = 1.2;
        this.waveSway = 3.0;              // degrees of random sway
        this.waveFrequency = 1.0;

        // ── Tank Mode ──
        this.tankSteering = false;        // turn in place, no Ackermann
        this.tankTurnSpeed = 180;         // degrees per second
        this.tankTurnBraking = 0.6;       // slow down while turning

        // ── Top Speed & Limits ──
        this.topSpeed = 280;              // km/h — top speed achievable in highest gear
        this.reverseTopSpeed = 40;        // km/h — max reverse speed
        this.speedUnit = 'km/h';          // display only: km/h, mph, px/s

        // ── Reverse-Acceleration ──
        this.reverseAccelTractionLoss = true;    // lose grip when throttling while reversing
        this.reverseAccelGripMultiplier = 0.5;   // grip multiplier during reverse-accel

        // ── Collision Response ──
        this.vehicleCollisionMode = 'rigidbody'; // 'rigidbody' (use Rigidbody collision) | 'simple' (lightweight vehicle-only collision)
        this.collisionForwardBias = 0.6;         // 0 = equal distribution, 1 = all energy goes forward/back
        this.collisionSpinEnabled = true;         // corner hits cause vehicle to rotate
        this.collisionTireMarks = true;           // all 4 tires leave marks when hit
        this.collisionTireMarkDuration = 0.3;     // how long (seconds) collision tire marks draw after impact
        this.stationaryFriction = 0.6;            // extra resistance when hit while stationary (0=none, 1=nearly immovable)
        this.collisionMomentumLoss = 0.6;           // momentum lost on collision while coasting (no input)
        this.useCollisionWorker = false;            // offload simple-mode collision math to Web Worker

        // ── Physics Scale ──
        this.physicsScale = 1.0;                  // global multiplier for forces & speeds

        // ── Angle Snapping (GTA2-style) ──
        this.angleSnapping = false;       // snap heading to nearest N degrees at speed
        this.angleSnapDivisions = 8;      // 8 = 45° increments, 4 = 90°, 16 = 22.5°
        this.angleSnapSpeed = 60;         // min speed (px/s) before snapping kicks in
        this.angleSnapStrength = 3.0;     // how aggressively it snaps (higher = faster lock)

        // ── Visual ──
        this.rotateToVelocity = true;
        this.bodyRollAmount = 0;          // degrees of lean into turns
        this.exhaustParticles = false;
        this.exhaustColor = '#666666';
        this.exhaustColorEnd = '#222222';
        this.tireMarkEnabled = true;
        this.tireMarkColor = '#333333';
        this.tireMarkAlpha = 0.4;
        this.tireMarkWidth = 3;

        // ── Audio ──
        this.engineSound = '';
        this.brakeSound = '';
        this.driftSound = '';
        this.boostSound = '';
        this.shiftSound = '';

        // ── Generated Audio (Web Audio synthesis) ──
        this.enableGeneratedEngineSound = false;
        this.engineSoundVolume = 0.05;    // master volume for generated engine sound
        this.engineBaseTone = 85;          // Hz — fundamental at idle
        this.enginePitchRange = 3.0;       // Multiplier: how many × base tone at top speed (1=flat, 4=high whine)
        this.engineHarmonics = 4;          // Number of harmonic overtones
        this.engineExhaustNoise = 0.15;    // 0-1 noise mix for exhaust rumble
        this.engineResonance = 800;        // Hz — exhaust resonance frequency
        this.engineVibratoDepth = 3;       // Hz — frequency wobble depth
        this.engineVibratoRate = 6;        // Hz — wobble speed
        // ── Engine Sound Tone Shaping ──
        this.engineWaveformBrightness = 0.4;  // 0 = smooth sine, 1 = harsh sawtooth
        this.engineFilterQ = 0.7;             // Lowpass filter Q (lower = smoother)
        this.engineHarmonicDecay = 1.5;       // Harmonic rolloff rate (higher = smoother)
        this.engineDetuneSpread = 16;         // Cents of random detune per oscillator (chorus/organic feel)
        this.engineSaturation = 1.4;          // Soft-clip saturation (1 = none, 2 = heavy warmth)
        this.engineRPMSmoothing = 0.08;       // How smoothly pitch follows RPM (higher = smoother)
        // ── Engine Sound Effects ──
        this.engineVolumePhaserEnabled = false;   // Enable volume pulsing for lumpy idle
        this.engineVolumePhaserDepth = 0.3;       // How much volume varies (0-1)
        this.engineVolumePhaserRate = 4;          // Hz - pulsing rate (lower = lumpier)
        this.engineDistortionAmount = 0;          // 0 = clean, 1 = heavy distortion (aggressive roar)
        this.engineMufflerEnabled = false;        // Enable muffler effect (deep/boxy sound)
        this.engineMufflerCutoff = 600;           // Hz - lowpass cutoff for muffler (lower = more muffled)
        this.engineMufflerResonance = 2;          // Q factor for muffler character
        this.engineReverbEnabled = false;         // Enable reverb (exhaust echo/tunnel effect)
        this.engineReverbMix = 0.2;               // Wet/dry mix (0 = dry, 1 = full wet)
        this.engineReverbDecay = 0.8;             // Reverb tail length in seconds
        this.enableHandbrakeSound = false;
        this.handbrakeSoundVolume = 0.4;
        this.handbrakeSoundTone = 800;     // Hz — screech center frequency
        this.handbrakeSoundSharpness = 5;  // Q factor for screech filter

        // ── Generated Crash/Impact Sound ──
        this.enableCrashSound = false;
        this.crashSoundVolume = 0.6;
        this.crashLowFrequency = 200;       // Hz — low thump frequency
        this.crashHighFrequency = 300000;    // Hz — high snap/crunch frequency
        this.crashLowHighMix = 0.3;        // 0 = all low thump, 1 = all high snap
        this.crashNoiseAmount = 0.8;       // 0-1 — crunch/debris noise
        this.crashDecayTime = 0.4;         // seconds — how long the impact rings out
        this.crashMinSpeed = 30;           // minimum collision speed for sound to trigger

        // ── Spatial Audio (2D positional) ──
        this.spatialAudioEnabled = true;  // attenuate sound by distance from viewport center
        this.spatialMinDistance = 100;     // within this radius: full volume
        this.spatialMaxDistance = 1200;    // beyond this radius: silent
        this.spatialRolloff = 'linear';    // linear | inverse | exponential

        // ── Clutch ──
        this.clutchEnabled = true;              // enable clutch system
        this.clutchRevBounceAmount = 0.15;      // how much RPM drops as % of range when hitting limiter (0.1-0.3 realistic)
        this.clutchRevBounceDuration = 0.08;    // seconds for rev bounce (faster = snappier limiter)
        this.clutchLaunchPowerThreshold = 250;  // HP above which clutch dump causes wheelspin
        this.clutchDumpTractionLoss = 0.25;     // grip multiplier when dumping clutch at high RPM
        this.clutchDumpDuration = 0.4;          // seconds of traction loss after clutch dump
        this.clutchHighRPMThreshold = 0.85;     // RPM ratio above which clutch dump causes wheelspin
        this.clutchDumpDrift = true;            // trigger drift when dumping clutch at high RPM

        // ── Input Keys ──
        this.keyAccelerate = 'ArrowUp';
        this.keyBrake = 'ArrowDown';
        this.keySteerLeft = 'ArrowLeft';
        this.keySteerRight = 'ArrowRight';
        this.keyHandbrake = 'Space';
        this.keyClutch = 'KeyZ';                // clutch key - hold to rev without driving
        this.keyShiftUp = 'KeyX';
        this.keyShiftDown = 'KeyQ';
        this.keyBoost = 'ShiftLeft';

        // ── Gamepad ──
        this.useGamepad = false;
        this.gamepadIndex = 0;
        this.gamepadAccelAxis = 7;        // RT
        this.gamepadBrakeAxis = 6;        // LT
        this.gamepadSteerAxis = 0;        // left stick X
        this.gamepadHandbrakeBtn = 0;     // A
        this.gamepadBoostBtn = 2;         // X

        // ── Debug ──
        this.debugDraw = false;

        // ── Vehicle Interaction (GTA-Style) ──
        this.vehicleInteractionEnabled = false;  // can be entered by MovementController2D
        this.driverSide = 'left';                // 'left' or 'right' — which side the driver enters/exits
        this.doorOffsetForward = 0;              // forward offset from center to door (local px)
        this.doorOffsetLateral = 25;             // lateral distance from center to door (px, positive = outward)
        this.occupantPrefab = '';                // prefab spawned as driver when vehicle spawns (TilemapWorldGenerator)

        // ═══════ INTERNAL STATE (not serialized as properties) ═══════
        this._currentSteer = 0;
        this._currentSpeed = 0;
        this._currentRPM = 800;
        this._currentGear = 1;
        this._isShifting = false;
        this._shiftTimer = 0;
        this._preShiftRPM = 800;
        this._fromGear = 1;
        this._actualShiftDuration = 0;
        this._isDrifting = false;
        this._wheelspinFactor = 0;
        this._driftAngle = 0;
        this._driftBoostCharge = 0;
        this._isBoosting = false;
        this._boostTimer = 0;
        this._hoverPhase = 0;
        this._lastTire1X = undefined;
        this._lastTire1Y = undefined;
        this._lastTire2X = undefined;
        this._lastTire2Y = undefined;
        this._lastFrontTire1X = undefined;
        this._lastFrontTire1Y = undefined;
        this._lastFrontTire2X = undefined;
        this._lastFrontTire2Y = undefined;
        this._collisionHitTimer = 0;
        this._throttle = 0;
        this._brakeInput = 0;
        this._steerInput = 0;
        this._handbrakeInput = false;
        this._clutchInput = false;
        this._clutchWasHeld = false;
        this._revLimiterBounceTimer = 0;
        this._revLimiterBounceDirection = 0;    // -1 = bouncing down, 0 = normal
        this._clutchDumpTimer = 0;              // time remaining for traction loss after clutch dump
        this._clutchDumpRPM = 0;                // RPM at moment of clutch release
        this._localVelX = 0;
        this._localVelY = 0;
        this._slipAngle = 0;
        this._wavePhase = 0;
        this._velX = 0;
        this._velY = 0;
        this._handbrakeActiveTime = 0;
        this._preDriftVelX = 0;             // velocity X when drift started
        this._preDriftVelY = 0;             // velocity Y when drift started
        this._momentumVelX = 0;             // momentum-preserved velocity X
        this._momentumVelY = 0;             // momentum-preserved velocity Y
        this._wasInHighSpeedDrift = false;  // track if we were drifting at high speed
        this._isHighSpeedTurn = false;      // currently in a high-speed turn (momentum skid)
    }

    static namespace = 'Movement';

    static getIcon() { return '🏎️'; }

    static getDescription() {
        return 'Advanced top-down vehicle controller with drift, gears, hover, boat, and tank modes';
    }

    // ════════════════════════════════════════════════════
    //  PROPERTY METADATA
    // ════════════════════════════════════════════════════

    getPropertyMetadata() {
        return [
            { type: 'groupStart', label: '🚗 Vehicle Controller' },
            { type: 'hint', label: 'Configure the vehicle controller settings' },
            { key: 'playerControlled', label: '👤 Player Controlled', type: 'boolean', default: true, hint: 'If false, can be used for AI or stationary vehicles' },
            { key: 'physicsScale', label: '⚡ Physics Scale', type: 'slider', default: 1.0, min: 0.1, max: 5.0, step: 0.1, hint: 'Global multiplier for all forces and speeds. < 1 = slow/realistic, > 1 = fast/arcadey' },
            { type: 'groupEnd' },
            // ── Presets ──
            { type: 'groupStart', label: '🎮 Vehicle Presets' },
            { type: 'hint', label: 'Quick-apply a preset then fine-tune individual settings below' },
            {
                key: 'vehiclePreset', label: 'Current Preset', type: 'select', default: 'sport',
                options: {
                    'sport': '🏎️ Sport Car',
                    'drift': '🌀 Drift Car',
                    'f1': '🏁 Formula 1',
                    'muscle': '💪 Muscle Car',
                    'supercar': '⚡ Supercar / Hypercar',
                    'offroad': '🏔️ Off-Road / Rally',
                    'pickup': '🛻 Pickup Truck',
                    'buggy': '🏜️ Dune Buggy',
                    'police': '🚔 Police Interceptor',
                    'limo': '🎩 Limousine',
                    'motorcycle': '🏍️ Motorcycle',
                    'hover': '🛸 Hover Car',
                    'boat': '🚤 Speed Boat',
                    'tank': '🪖 Tank',
                    'bus': '🚌 Bus / Truck',
                    'ice': '🧊 Ice Racer',
                    'arcade': '👾 Arcade Racer',
                    'kart': '🎮 Go-Kart',
                    'gta2': '🕹️ GTA2 Classic',
                    'custom': '⚙️ Custom'
                }
            },
            {
                type: 'button', label: 'Apply Preset',
                buttonText: '✨ Apply Preset', buttonStyle: 'primary', icon: '✨',
                tooltip: 'Apply selected preset to all vehicle parameters',
                action: 'applyPreset'
            },
            { type: 'groupEnd' },

            // ── Engine ──
            { type: 'groupStart', label: '🔧 Engine' },
            { type: 'hint', label: 'Engine power in HP (horsepower). 150 = economy, 300 = sport, 500+ = supercar (will lose traction!). Weight affects acceleration and grip.' },
            { key: 'enginePower', label: '🐴 Engine Power (HP)', type: 'number', default: 300, min: 50, max: 2000, step: 10, hint: 'Horsepower. 500+ HP will easily break traction when launching or accelerating hard.' },
            { key: 'reversePower', label: '🔙 Reverse Power (HP)', type: 'number', default: 150, min: 50, max: 1000, step: 10 },
            { key: 'brakePower', label: '🛑 Brake Power', type: 'number', default: 1800, min: 100, max: 50000, step: 50 },
            { key: 'vehicleWeightKg', label: '⚖️ Vehicle Weight (kg)', type: 'number', default: 1400, min: 500, max: 10000, step: 50, hint: 'Heavier = slower acceleration but more traction. Light + high HP = wheelspin city.' },
            { key: 'idleRPM', label: '💤 Idle RPM', type: 'number', default: 800, min: 300, max: 2000, step: 50 },
            { key: 'maxRPM', label: '🔴 Max RPM', type: 'number', default: 7000, min: 3000, max: 15000, step: 100 },
            { key: 'redlineRPM', label: '⚠️ Redline RPM', type: 'number', default: 6800, min: 3000, max: 15000, step: 100 },
            { type: 'groupEnd' },

            // ── Transmission ──
            { type: 'groupStart', label: '⚙️ Transmission' },
            { type: 'hint', label: 'Configure how gears affect vehicle speed and acceleration.' },
            {
                key: 'transmissionType', label: '🔀 Type', type: 'select', default: 'automatic',
                options: { 'automatic': '🅰️ Automatic', 'manual': '🅼 Manual', 'cvt': '♾️ CVT (Continuous)' }
            },
            { key: 'gearCount', label: '🔢 Gear Count', type: 'number', default: 5, min: 1, max: 10, step: 1, showIf: { transmissionType: ['automatic', 'manual'] } },
            {
                key: 'gearConfigMode', label: '🛠️ Gear Config', type: 'select', default: 'maxSpeed',
                options: { 'maxSpeed': '🏁 Max Speed (km/h)', 'ratio': '⚙️ Gear Ratios' },
                showIf: { transmissionType: ['automatic', 'manual'] },
                hint: 'Choose how to define each gear. Max Speed is intuitive, Ratios give fine control.'
            },
            { key: 'gearMaxSpeeds', label: '🏁 Gear Max Speeds (km/h)', type: 'array', elementType: 'number', defaultValue: 100, showIf: { transmissionType: ['automatic', 'manual'], gearConfigMode: 'maxSpeed' }, hint: 'Maximum speed each gear can reach in km/h. Last gear should match or exceed Top Speed.' },
            { key: 'gearRatios', label: '📊 Gear Ratios', type: 'array', elementType: 'number', defaultValue: 1.0, showIf: { transmissionType: ['automatic', 'manual'], gearConfigMode: 'ratio' }, hint: 'Higher ratio = more torque, lower max speed. Lower ratio = less torque, higher max speed.' },
            { key: 'reverseMaxSpeed', label: '🔙 Reverse Max Speed (km/h)', type: 'number', default: 40, min: 10, max: 200, step: 5, showIf: { gearConfigMode: 'maxSpeed' }, hint: 'Maximum reverse speed in km/h.' },
            { key: 'reverseGearRatio', label: '🔙 Reverse Ratio', type: 'number', default: 3.2, min: 0.5, max: 6, step: 0.1, showIf: { gearConfigMode: 'ratio' } },
            { key: 'finalDriveRatio', label: '🏁 Final Drive', type: 'number', default: 3.5, min: 1, max: 8, step: 0.1, showIf: { gearConfigMode: 'ratio' } },
            { key: 'shiftUpRPM', label: '⬆️ Shift Up RPM', type: 'number', default: 6200, min: 2000, max: 15000, step: 100, showIf: { transmissionType: 'automatic' } },
            { key: 'shiftDownRPM', label: '⬇️ Shift Down RPM', type: 'number', default: 2500, min: 500, max: 8000, step: 100, showIf: { transmissionType: 'automatic' } },
            { key: 'shiftTime', label: '⏱️ Base Shift Time (s)', type: 'number', default: 0.15, min: 0, max: 1, step: 0.01, hint: 'Time for gear 1→2 shift. Higher gears add shiftTimePerGear.' },
            { key: 'shiftTimePerGear', label: '⏱️ Shift Time Per Gear (s)', type: 'number', default: 0.05, min: 0, max: 0.3, step: 0.01, hint: 'Additional shift time for each higher gear. Gear 2→3 = shiftTime + this, Gear 3→4 = shiftTime + 2×this, etc.' },
            { key: 'gearShiftAccelLoss', label: '⚡ Shift Accel Loss', type: 'slider', default: 0.85, min: 0, max: 1, step: 0.05, hint: 'Acceleration lost during gear shift (0 = none, 1 = full). Creates manual car feel.' },
            { key: 'fullThrottleRevTime', label: '⏱️ Full Rev Time (s)', type: 'slider', default: 4.0, min: 0.5, max: 15, step: 0.5, hint: 'Seconds to rev from idle to max RPM at full throttle. Higher = slower gear changes.' },
            { type: 'groupEnd' },

            // ── Steering ──
            { type: 'groupStart', label: '🎯 Steering' },
            { key: 'maxSteerAngle', label: '📐 Max Steer Angle', type: 'slider', default: 35, min: 5, max: 90, step: 1 },
            { key: 'steerSpeed', label: '⚡ Steer Speed', type: 'number', default: 3.5, min: 0.5, max: 15, step: 0.1 },
            { key: 'steerReturnSpeed', label: '↩️ Return Speed', type: 'number', default: 5.0, min: 0.5, max: 20, step: 0.1 },
            { key: 'counterSteerFactor', label: '🔄 Counter-Steer Bonus', type: 'number', default: 1.5, min: 1.0, max: 3.0, step: 0.1 },
            { key: 'speedSensitiveSteering', label: '📉 Speed Sensitive', type: 'boolean', default: true },
            { key: 'minSteerAtSpeed', label: '📉 Min Steer at Top Speed', type: 'slider', default: 0.3, min: 0.05, max: 1.0, step: 0.05, showIf: { speedSensitiveSteering: true } },
            { type: 'groupEnd' },

            // ── Tyre Grip ──
            { type: 'groupStart', label: '🛞 Tyre Grip' },
            { type: 'hint', label: 'Grip determines how well the vehicle sticks to its heading. Lower = more sliding.' },
            { key: 'frontGrip', label: '🔵 Front Grip', type: 'slider', default: 1.0, min: 0, max: 2.0, step: 0.05 },
            { key: 'rearGrip', label: '🔴 Rear Grip', type: 'slider', default: 1.0, min: 0, max: 2.0, step: 0.05 },
            { key: 'tyreGripRating', label: '🛞 Tyre Grip Rating', type: 'slider', default: 1.0, min: 0.3, max: 2.0, step: 0.05, hint: 'Overall tyre quality. 0.5 = budget/worn, 1.0 = sport, 1.5 = racing slicks. Affects traction limit.' },
            { key: 'gripFalloffSpeed', label: '📉 Grip Falloff Speed', type: 'number', default: 400, min: 50, max: 2000, step: 10, hint: 'Speed (px/s) where grip begins degrading' },
            { key: 'gripMinMultiplier', label: '📉 Min Grip at Speed', type: 'slider', default: 0.5, min: 0.05, max: 1.0, step: 0.05 },
            { type: 'groupEnd' },

            // ── Drift ──
            { type: 'groupStart', label: '🌀 Drift' },
            { key: 'driftEnabled', label: '✅ Enable Drift', type: 'boolean', default: true },
            {
                key: 'driftTrigger', label: '🎯 Trigger Mode', type: 'select', default: 'handbrake',
                options: { 'handbrake': '🅿️ Handbrake', 'oversteer': '🌊 Oversteer', 'always': '♾️ Always Loose' },
                showIf: { driftEnabled: true }
            },
            { key: 'driftGripMultiplier', label: '🧊 Drift Grip', type: 'slider', default: 0.35, min: 0.0, max: 1.0, step: 0.05, showIf: { driftEnabled: true }, hint: 'Rear grip multiplier while drifting (lower = more slide)' },
            { key: 'driftSteerMultiplier', label: '🎯 Drift Steer Boost', type: 'number', default: 1.6, min: 0.5, max: 3.0, step: 0.1, showIf: { driftEnabled: true } },
            { key: 'driftCounterSteer', label: '↩️ Auto Counter-Steer', type: 'boolean', default: true, showIf: { driftEnabled: true } },

            { type: 'groupStart', label: '🚀 Drift Boost' },
            { key: 'driftBoostEnabled', label: '✅ Enable Drift Boost', type: 'boolean', default: true, showIf: { driftEnabled: true } },
            { key: 'driftBoostChargeRate', label: '⚡ Charge Rate', type: 'number', default: 150, min: 10, max: 1000, step: 10, showIf: { driftEnabled: true, driftBoostEnabled: true } },
            { key: 'driftBoostMaxCharge', label: '🔋 Max Charge', type: 'number', default: 500, min: 50, max: 5000, step: 50, showIf: { driftEnabled: true, driftBoostEnabled: true } },
            { key: 'driftBoostForce', label: '💥 Boost Force', type: 'number', default: 2000, min: 100, max: 30000, step: 100, showIf: { driftEnabled: true, driftBoostEnabled: true } },
            { key: 'driftBoostDuration', label: '⏱️ Boost Duration (s)', type: 'number', default: 0.4, min: 0.05, max: 3.0, step: 0.05, showIf: { driftEnabled: true, driftBoostEnabled: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🏎️ High-Speed Momentum' },
            { type: 'hint', label: 'Controls how vehicles maintain momentum at high speed. Higher values = more realistic drifting where heavy/weak cars slide further.' },
            { key: 'highSpeedMomentum', label: '💨 Momentum Strength', type: 'slider', default: 0.7, min: 0, max: 1.0, step: 0.05, hint: '0 = arcade (instant turns), 1 = realistic (momentum carries through turns)' },
            { key: 'momentumSpeedThreshold', label: '⚡ Speed Threshold (km/h)', type: 'number', default: 120, min: 30, max: 300, step: 10, hint: 'Speed above which momentum effects activate' },
            { key: 'driftMomentumRetention', label: '🌀 Drift Momentum', type: 'slider', default: 0.85, min: 0, max: 1.0, step: 0.05, hint: 'How much original direction is preserved during drift (higher = longer slides)' },
            { key: 'weightMomentumFactor', label: '⚖️ Weight Factor', type: 'slider', default: 1.0, min: 0.5, max: 2.0, step: 0.1, hint: 'How much weight affects momentum (higher = heavier cars drift more)' },
            { key: 'powerOvercomeMomentum', label: '🔥 Power Override', type: 'slider', default: 0.5, min: 0, max: 1.0, step: 0.05, hint: 'How much throttle helps redirect momentum (higher = power overcomes drift)' },
            { key: 'momentumRecoveryRate', label: '↩️ Recovery Rate', type: 'slider', default: 2.0, min: 0.5, max: 5.0, step: 0.1, hint: 'How fast vehicle aligns with heading after drift (higher = snappier recovery)' },
            { key: 'momentumSlideFriction', label: '🧊 Slide Friction', type: 'slider', default: 0.5, min: 0, max: 1.0, step: 0.05, hint: '0 = no friction (ice-like infinite slide), 1 = heavy friction (momentum bleeds off quickly). Controls how fast speed is lost during momentum slides.' },
            { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ── Handbrake ──
            { type: 'groupStart', label: '🅿️ Handbrake' },
            { type: 'hint', label: 'Controls how powerful the handbrake is. Lower values = more gradual slide.' },
            { key: 'handbrakeStrength', label: '💪 Strength', type: 'slider', default: 0.3, min: 0.05, max: 1.0, step: 0.05, hint: 'Braking force multiplier when handbrake is held (fraction of brake power)' },
            { key: 'handbrakeSlideFriction', label: '🧊 Slide Friction', type: 'slider', default: 1.5, min: 0.1, max: 5.0, step: 0.1, hint: 'Kinetic friction that bleeds speed while sliding with handbrake (lower = longer slides)' },
            { type: 'groupEnd' },

            // ── Clutch ──
            { type: 'groupStart', label: '🦶 Clutch System' },
            { type: 'hint', label: 'Hold clutch to rev engine without driving. Release at high RPM for launch (may cause wheelspin).' },
            { key: 'clutchEnabled', label: '✅ Enable Clutch', type: 'boolean', default: true },
            { key: 'clutchHighRPMThreshold', label: '⚠️ High RPM Threshold', type: 'slider', default: 0.85, min: 0.5, max: 0.98, step: 0.01, showIf: { clutchEnabled: true }, hint: 'RPM ratio (0-1) above which clutch dump may cause wheelspin. 0.85 = 85% of max RPM.' },
            { key: 'clutchLaunchPowerThreshold', label: '💪 Power Threshold (HP)', type: 'number', default: 250, min: 50, max: 1500, step: 10, showIf: { clutchEnabled: true }, hint: 'HP above which clutch dump causes wheelspin. 250 = most cars, 150 = even economy cars spin.' },
            { key: 'clutchDumpTractionLoss', label: '🛞 Traction Loss', type: 'slider', default: 0.25, min: 0.05, max: 0.8, step: 0.05, showIf: { clutchEnabled: true }, hint: 'Grip multiplier when dumping clutch at high RPM (lower = more wheelspin).' },
            { key: 'clutchDumpDuration', label: '⏱️ Wheelspin Duration', type: 'slider', default: 0.4, min: 0.1, max: 1.5, step: 0.05, showIf: { clutchEnabled: true }, hint: 'How long (seconds) reduced traction lasts after clutch dump.' },
            { key: 'clutchDumpDrift', label: '🌀 Trigger Drift', type: 'boolean', default: true, showIf: { clutchEnabled: true }, hint: 'Automatically trigger drift when dumping clutch at high RPM (if drift is enabled).' },
            { key: 'clutchRevBounceAmount', label: '🔃 Rev Limiter Bounce', type: 'slider', default: 0.15, min: 0.05, max: 0.4, step: 0.01, showIf: { clutchEnabled: true }, hint: 'How much RPM drops (% of range) when hitting rev limiter. Higher = more aggressive bounce.' },
            { key: 'clutchRevBounceDuration', label: '⏱️ Bounce Duration', type: 'slider', default: 0.08, min: 0.03, max: 0.2, step: 0.01, showIf: { clutchEnabled: true }, hint: 'Time (seconds) for rev limiter bounce. Faster = snappier feel.' },
            { type: 'groupEnd' },

            // ── Drag & Resistance ──
            { type: 'groupStart', label: '💨 Drag & Resistance' },
            { key: 'linearDrag', label: '📉 Linear Drag', type: 'number', default: 0.5, min: 0, max: 10, step: 0.05 },
            { key: 'angularDrag', label: '🔄 Angular Drag', type: 'number', default: 4.0, min: 0, max: 20, step: 0.1 },
            { key: 'rollingResistance', label: '🛞 Rolling Resistance', type: 'number', default: 0.015, min: 0, max: 0.2, step: 0.001 },
            { key: 'airResistanceCoeff', label: '🌬️ Air Resistance', type: 'number', default: 0.0005, min: 0, max: 0.01, step: 0.0001 },
            { type: 'groupEnd' },

            // ── Hover ──
            { type: 'groupStart', label: '🛸 Hover Physics' },
            { type: 'hint', label: 'Enable for hover-car or sci-fi vehicle feel. Reduces lateral grip and adds visual bobbing.' },
            { key: 'hoverEnabled', label: '✅ Enable Hover', type: 'boolean', default: false },
            { key: 'hoverHeight', label: '📏 Bob Height', type: 'number', default: 30, min: 0, max: 100, step: 1, showIf: { hoverEnabled: true } },
            { key: 'hoverFrequency', label: '🔄 Bob Frequency', type: 'number', default: 2.5, min: 0.1, max: 10, step: 0.1, showIf: { hoverEnabled: true } },
            { key: 'hoverSlipFactor', label: '🧊 Lateral Slip', type: 'slider', default: 0.6, min: 0, max: 1, step: 0.05, showIf: { hoverEnabled: true }, hint: '0 = no side grip (like ice), 1 = full grip' },
            { key: 'hoverTiltAmount', label: '↔️ Tilt Degrees', type: 'number', default: 8, min: 0, max: 30, step: 1, showIf: { hoverEnabled: true } },
            { type: 'groupEnd' },

            // ── Boat ──
            { type: 'groupStart', label: '🚤 Boat Mode' },
            { key: 'boatMode', label: '✅ Enable Boat', type: 'boolean', default: false },
            { key: 'waterDrag', label: '🌊 Water Drag', type: 'number', default: 1.2, min: 0, max: 5, step: 0.1, showIf: { boatMode: true } },
            { key: 'waveSway', label: '🌊 Wave Sway (°)', type: 'number', default: 3, min: 0, max: 15, step: 0.5, showIf: { boatMode: true } },
            { key: 'waveFrequency', label: '🌊 Wave Speed', type: 'number', default: 1.0, min: 0.1, max: 5, step: 0.1, showIf: { boatMode: true } },
            { type: 'groupEnd' },

            // ── Tank ──
            { type: 'groupStart', label: '🪖 Tank Steering' },
            { type: 'hint', label: 'Tank mode: vehicle rotates in place instead of Ackermann steering' },
            { key: 'tankSteering', label: '✅ Enable Tank Steering', type: 'boolean', default: false },
            { key: 'tankTurnSpeed', label: '🔄 Turn Speed (°/s)', type: 'number', default: 180, min: 10, max: 720, step: 5, showIf: { tankSteering: true } },
            { key: 'tankTurnBraking', label: '🛑 Turn Braking', type: 'slider', default: 0.6, min: 0, max: 1, step: 0.05, showIf: { tankSteering: true }, hint: 'How much turning slows the vehicle (0 = none, 1 = full stop)' },
            { type: 'groupEnd' },

            // ── Speed Limits ──
            { type: 'groupStart', label: '🏁 Speed Limits' },
            { type: 'hint', label: 'All speeds are in km/h. Internally converted to px/s for physics.' },
            { key: 'topSpeed', label: '🏎️ Top Speed (km/h)', type: 'number', default: 280, min: 30, max: 500, step: 5, hint: 'Maximum achievable speed in top gear in km/h.' },
            { key: 'reverseTopSpeed', label: '🔙 Reverse Top Speed (km/h)', type: 'number', default: 40, min: 10, max: 150, step: 5, hint: 'Max reverse speed in km/h (used in ratio mode).' },
            { key: 'speedUnit', label: '📊 Display Unit', type: 'select', default: 'km/h', options: { 'km/h': 'km/h', 'mph': 'mph', 'px/s': 'px/s' } },
            { type: 'groupEnd' },

            // ── Reverse-Acceleration ──
            { type: 'groupStart', label: '🔄 Reverse-Acceleration' },
            { type: 'hint', label: 'Controls how the vehicle behaves when pressing throttle while still moving in reverse.' },
            { key: 'reverseAccelTractionLoss', label: '🛞 Traction Loss', type: 'boolean', default: true, hint: 'Reduce grip when throttling forward while still moving backward' },
            { key: 'reverseAccelGripMultiplier', label: '📉 Grip Multiplier', type: 'slider', default: 0.5, min: 0.05, max: 1.0, step: 0.05, showIf: { reverseAccelTractionLoss: true }, hint: 'Tyre grip multiplier during reverse-acceleration transition' },
            { type: 'groupEnd' },

            // ── Collision Response ──
            { type: 'groupStart', label: '💥 Collision Response' },
            { type: 'hint', label: 'Fine-tune how the vehicle reacts to collisions with other objects.' },
            { key: 'vehicleCollisionMode', label: '🎯 Collision Mode', type: 'select', default: 'rigidbody',
                options: { 'rigidbody': 'Rigidbody (full physics)', 'simple': 'Simple (lightweight)' },
                hint: 'Rigidbody: Uses Rigidbody collision system. Simple: Lightweight vehicle-only collision (better performance).' },
            { key: 'collisionForwardBias', label: '➡️ Forward Bias', type: 'slider', default: 0.6, min: 0, max: 1.0, step: 0.05, hint: 'How much collision energy goes forward vs sideways (0 = equal, 1 = all forward). Cars roll forward more than they slide sideways.' },
            { key: 'collisionSpinEnabled', label: '🔄 Corner Spin', type: 'boolean', default: true, hint: 'Corner hits cause the vehicle to rotate (requires Rigidbody with realisticPhysics)' },
            { key: 'collisionTireMarks', label: '🛞 Collision Tire Marks', type: 'boolean', default: true, hint: 'All 4 tires leave marks when the vehicle is hit' },
            { key: 'collisionTireMarkDuration', label: '⏱️ Mark Duration', type: 'slider', default: 0.3, min: 0.05, max: 1.5, step: 0.05, showIf: { collisionTireMarks: true }, hint: 'Seconds tire marks keep drawing after impact' },
            { key: 'stationaryFriction', label: '🅿️ Stationary Friction', type: 'slider', default: 0.6, min: 0, max: 1.0, step: 0.05, hint: 'Extra resistance when hit while stationary (0 = none, 1 = nearly immovable)' },
            { key: 'collisionMomentumLoss', label: '📉 Rolling Collision Loss', type: 'slider', default: 0.6, min: 0, max: 1.0, step: 0.05, hint: 'Momentum lost when colliding with no driver input (0 = none, 1 = full stop). Applies to coasting/uncontrolled vehicles.' },
            { key: 'useCollisionWorker', label: '🧵 Web Worker', type: 'boolean', default: false, showIf: { vehicleCollisionMode: 'simple' }, hint: 'Offload simple-mode collision math to a Web Worker (reduces main-thread load with many vehicles)' },
            { type: 'groupEnd' },

            // ── Angle Snapping (GTA2-style) ──
            { type: 'groupStart', label: '🎮 Angle Snapping (GTA2)' },
            { type: 'hint', label: 'Snaps the vehicle heading to fixed angles at speed, like classic GTA2 top-down controls.' },
            { key: 'angleSnapping', label: '✅ Enable', type: 'boolean', default: false },
            { key: 'angleSnapDivisions', label: '🔢 Divisions', type: 'select', default: 8, showIf: { angleSnapping: true },
                options: { 4: '4 (90°)', 8: '8 (45°)', 16: '16 (22.5°)', 12: '12 (30°)' } },
            { key: 'angleSnapSpeed', label: '⚡ Min Speed', type: 'number', default: 60, min: 0, max: 500, step: 5, showIf: { angleSnapping: true }, hint: 'Speed (px/s) before snapping activates' },
            { key: 'angleSnapStrength', label: '💪 Snap Strength', type: 'slider', default: 3.0, min: 0.5, max: 10, step: 0.5, showIf: { angleSnapping: true }, hint: 'Higher = snaps harder to angles' },
            { type: 'groupEnd' },

            // ── Visuals ──
            { type: 'groupStart', label: '🎨 Visual Effects' },
            { key: 'rotateToVelocity', label: '🔄 Rotate to Velocity', type: 'boolean', default: true },
            { key: 'bodyRollAmount', label: '↔️ Body Roll (°)', type: 'number', default: 0, min: 0, max: 20, step: 1, hint: 'Degrees the sprite leans into turns' },
            { key: 'exhaustParticles', label: '💨 Exhaust Particles', type: 'boolean', default: false },
            { key: 'exhaustColor', label: '🎨 Exhaust Color', type: 'color', default: '#666666', showIf: { exhaustParticles: true } },
            { key: 'exhaustColorEnd', label: '🎨 Exhaust Fade', type: 'color', default: '#222222', showIf: { exhaustParticles: true } },

            { type: 'groupStart', label: '🛞 Tire Marks' },
            { key: 'tireMarkEnabled', label: '✅ Enable', type: 'boolean', default: true },
            { key: 'tireMarkColor', label: '🎨 Color', type: 'color', default: '#333333', showIf: { tireMarkEnabled: true } },
            { key: 'tireMarkAlpha', label: '🔲 Opacity', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05, showIf: { tireMarkEnabled: true } },
            { key: 'tireMarkWidth', label: '📏 Width', type: 'number', default: 3, min: 1, max: 12, step: 0.5, showIf: { tireMarkEnabled: true } },
            { type: 'groupEnd' },
            { type: 'groupEnd' },

            // ── Audio ──
            { type: 'groupStart', label: '🔊 Audio' },
            { key: 'engineSound', label: '🔧 Engine Loop', type: 'audio' },
            { key: 'brakeSound', label: '🛑 Brake SFX', type: 'audio' },
            { key: 'driftSound', label: '🌀 Drift SFX', type: 'audio' },
            { key: 'boostSound', label: '🚀 Boost SFX', type: 'audio' },
            { key: 'shiftSound', label: '⚙️ Shift SFX', type: 'audio' },
            { type: 'groupEnd' },

            // ── Generated Audio (procedural synthesis) ──
            { type: 'groupStart', label: '🔈 Generated Sound Synthesis' },
            { type: 'hint', label: 'Procedurally-generated engine, skid & crash sounds using Web Audio — no audio files needed' },

            { type: 'groupStart', label: '🔧 Engine Sound Core' },
            { type: 'hint', label: 'Core engine sound generation settings — fundamental tone, harmonics and volume' },
            { key: 'enableGeneratedEngineSound', label: '✅ Enable Engine Sound', type: 'boolean', default: false },
            { key: 'engineSoundVolume', label: '🔊 Volume', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05, showIf: { enableGeneratedEngineSound: true } },
            { key: 'engineBaseTone', label: '🎵 Base Tone (Hz)', type: 'number', default: 85, min: 30, max: 300, step: 5, showIf: { enableGeneratedEngineSound: true }, hint: 'Fundamental frequency at idle RPM. Lower = deeper rumble.' },
            { key: 'enginePitchRange', label: '🎚️ Pitch Range (×)', type: 'slider', default: 3.0, min: 1.0, max: 6.0, step: 0.25, showIf: { enableGeneratedEngineSound: true }, hint: 'How many times the base tone the pitch rises to at top speed. Higher = more dramatic rev.' },
            { key: 'engineHarmonics', label: '🎶 Harmonics', type: 'number', default: 4, min: 1, max: 8, step: 1, showIf: { enableGeneratedEngineSound: true }, hint: 'Number of overtone layers. More = richer/buzzier.' },
            { key: 'engineExhaustNoise', label: '💨 Exhaust Noise', type: 'slider', default: 0.15, min: 0, max: 0.6, step: 0.01, showIf: { enableGeneratedEngineSound: true }, hint: 'Filtered noise mixed in for exhaust rumble character.' },
            { key: 'engineResonance', label: '📢 Resonance (Hz)', type: 'number', default: 800, min: 200, max: 3000, step: 50, showIf: { enableGeneratedEngineSound: true }, hint: 'Exhaust pipe resonance center frequency.' },
            { key: 'engineVibratoDepth', label: '〰️ Vibrato Depth (Hz)', type: 'number', default: 3, min: 0, max: 20, step: 0.5, showIf: { enableGeneratedEngineSound: true }, hint: 'Frequency wobble depth for engine roughness.' },
            { key: 'engineVibratoRate', label: '〰️ Vibrato Rate (Hz)', type: 'number', default: 6, min: 1, max: 30, step: 1, showIf: { enableGeneratedEngineSound: true }, hint: 'How fast the frequency wobbles.' },
            { type: 'groupEnd' },
            
            // ── Engine Sound Tone Shaping ──
            { type: 'groupStart', label: '🎛️ Tone Shaping' },
            { type: 'hint', label: 'Fine-tune the engine sound character — create smoother or harsher engine tones' },
            { key: 'engineWaveformBrightness', label: '☀️ Brightness', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05, showIf: { enableGeneratedEngineSound: true }, hint: '0 = smooth/mellow (sine-like), 1 = harsh/buzzy (sawtooth-like)' },
            { key: 'engineHarmonicDecay', label: '📉 Harmonic Decay', type: 'slider', default: 1.5, min: 0.5, max: 4, step: 0.1, showIf: { enableGeneratedEngineSound: true }, hint: 'How fast overtones fade. Higher = smoother/rounder tone.' },
            { key: 'engineFilterQ', label: '🔊 Filter Sharpness', type: 'slider', default: 0.7, min: 0.3, max: 3, step: 0.1, showIf: { enableGeneratedEngineSound: true }, hint: 'Lowpass filter Q. Lower = smoother, higher = more resonant edge.' },
            { key: 'engineSaturation', label: '🔥 Warmth/Saturation', type: 'slider', default: 1.4, min: 1, max: 3, step: 0.1, showIf: { enableGeneratedEngineSound: true }, hint: 'Soft-clip saturation for analog warmth. 1 = clean, 3 = heavily saturated.' },
            { key: 'engineDetuneSpread', label: '🎹 Detune Spread', type: 'number', default: 16, min: 0, max: 50, step: 2, showIf: { enableGeneratedEngineSound: true }, hint: 'Random detune in cents. Creates organic chorus effect. 0 = precise/digital.' },
            { key: 'engineRPMSmoothing', label: '⏱️ RPM Smoothing', type: 'slider', default: 0.08, min: 0.02, max: 0.25, step: 0.01, showIf: { enableGeneratedEngineSound: true }, hint: 'How smoothly pitch follows RPM changes. Higher = smoother gear transitions.' },
            { type: 'groupEnd' },

            // ── Engine Sound Effects ──
            { type: 'groupStart', label: '🎸 Effects' },
            { type: 'hint', label: 'Volume phaser for lumpy idle, distortion for aggressive tone, muffler and reverb for character' },
            { key: 'engineVolumePhaserEnabled', label: '🌊 Volume Phaser', type: 'boolean', default: false, showIf: { enableGeneratedEngineSound: true }, hint: 'Enable volume pulsing for lumpy V8-style idle.' },
            { key: 'engineVolumePhaserDepth', label: '📊 Phaser Depth', type: 'slider', default: 0.3, min: 0.05, max: 0.8, step: 0.05, showIf: { enableGeneratedEngineSound: true, engineVolumePhaserEnabled: true }, hint: 'How much volume varies (0.3 = subtle, 0.8 = extreme pump).' },
            { key: 'engineVolumePhaserRate', label: '⏱️ Phaser Rate (Hz)', type: 'slider', default: 4, min: 0.5, max: 15, step: 0.5, showIf: { enableGeneratedEngineSound: true, engineVolumePhaserEnabled: true }, hint: 'Pulsing speed. Lower = lumpier idle, higher = aggressive flutter.' },
            { key: 'engineDistortionAmount', label: '🔊 Distortion', type: 'slider', default: 0, min: 0, max: 1, step: 0.05, showIf: { enableGeneratedEngineSound: true }, hint: '0 = clean, 0.5 = crunchy, 1 = heavy distortion (aggressive roar).' },
            { key: 'engineMufflerEnabled', label: '🔇 Muffler Effect', type: 'boolean', default: false, showIf: { enableGeneratedEngineSound: true }, hint: 'Enable muffler simulation (lowers frequencies, adds boxy resonance).' },
            { key: 'engineMufflerCutoff', label: '📉 Muffler Cutoff (Hz)', type: 'number', default: 600, min: 200, max: 2000, step: 50, showIf: { enableGeneratedEngineSound: true, engineMufflerEnabled: true }, hint: 'Lowpass frequency. Lower = more muffled/boxy.' },
            { key: 'engineMufflerResonance', label: '📢 Muffler Resonance', type: 'slider', default: 2, min: 0.5, max: 8, step: 0.5, showIf: { enableGeneratedEngineSound: true, engineMufflerEnabled: true }, hint: 'Q factor. Higher = more pronounced resonant peak.' },
            { key: 'engineReverbEnabled', label: '🏛️ Reverb', type: 'boolean', default: false, showIf: { enableGeneratedEngineSound: true }, hint: 'Enable reverb (exhaust echo, tunnel effect).' },
            { key: 'engineReverbMix', label: '💧 Reverb Mix', type: 'slider', default: 0.2, min: 0, max: 0.8, step: 0.05, showIf: { enableGeneratedEngineSound: true, engineReverbEnabled: true }, hint: 'Wet/dry balance. 0 = dry, 0.8 = very wet/spacey.' },
            { key: 'engineReverbDecay', label: '⏱️ Reverb Decay', type: 'slider', default: 0.8, min: 0.2, max: 3, step: 0.1, showIf: { enableGeneratedEngineSound: true, engineReverbEnabled: true }, hint: 'Tail length in seconds. Longer = more spacious.' },
            { type: 'groupEnd' },
            { type: 'groupEnd' },  // close Generated Sound Synthesis parent

            { type: 'groupStart', label: '🔈 Generated Skid Sound' },
            { key: 'enableHandbrakeSound', label: '✅ Enable Skid Sound', type: 'boolean', default: false },
            { key: 'handbrakeSoundVolume', label: '🔊 Volume', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05, showIf: { enableHandbrakeSound: true } },
            { key: 'handbrakeSoundTone', label: '🎵 Tone (Hz)', type: 'number', default: 300, min: 100, max: 2000, step: 25, showIf: { enableHandbrakeSound: true }, hint: 'Center frequency for the tyre screech.' },
            { key: 'handbrakeSoundSharpness', label: '📐 Sharpness (Q)', type: 'slider', default: 5, min: 1, max: 15, step: 0.5, showIf: { enableHandbrakeSound: true }, hint: 'Higher = more tonal screech, lower = broader hiss.' },
            { type: 'groupEnd' },

            // ── Generated Crash/Impact Sound ──
            { type: 'groupStart', label: '💥 Generated Crash Sound' },
            { type: 'hint', label: 'Procedural crash/impact sound that scales with collision speed' },
            { key: 'enableCrashSound', label: '✅ Enable Crash Sound', type: 'boolean', default: false },
            { key: 'crashSoundVolume', label: '🔊 Volume', type: 'slider', default: 0.6, min: 0, max: 1, step: 0.05, showIf: { enableCrashSound: true } },
            { key: 'crashLowFrequency', label: '🔉 Low Thump (Hz)', type: 'number', default: 80, min: 30, max: 200, step: 10, showIf: { enableCrashSound: true }, hint: 'Low-frequency thump for impact body.' },
            { key: 'crashHighFrequency', label: '🔊 High Snap (Hz)', type: 'number', default: 2500, min: 500, max: 6000, step: 100, showIf: { enableCrashSound: true }, hint: 'High-frequency snap/crunch for metal impact.' },
            { key: 'crashLowHighMix', label: '⚖️ Low/High Mix', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05, showIf: { enableCrashSound: true }, hint: '0 = deep thump only, 1 = sharp snap only, 0.5 = balanced.' },
            { key: 'crashNoiseAmount', label: '💨 Crunch/Noise', type: 'slider', default: 0.4, min: 0, max: 1, step: 0.05, showIf: { enableCrashSound: true }, hint: 'Amount of noise/crunch texture in the impact.' },
            { key: 'crashDecayTime', label: '⏱️ Decay Time (s)', type: 'slider', default: 0.3, min: 0.05, max: 1, step: 0.05, showIf: { enableCrashSound: true }, hint: 'How long the impact sound rings out.' },
            { key: 'crashMinSpeed', label: '🚗 Min Speed', type: 'number', default: 30, min: 5, max: 200, step: 5, showIf: { enableCrashSound: true }, hint: 'Minimum collision speed to trigger crash sound.' },
            { type: 'groupEnd' },

            // ── Spatial Audio (2D positional) ──
            { type: 'groupStart', label: '🎧 Spatial Audio (2D)' },
            { type: 'hint', label: 'Attenuate all vehicle sounds based on distance from the viewport center — creates spatial awareness' },
            { key: 'spatialAudioEnabled', label: '✅ Enable Spatial Audio', type: 'boolean', default: false },
            { key: 'spatialMinDistance', label: '📏 Min Distance (px)', type: 'number', default: 100, min: 0, max: 5000, step: 10, showIf: { spatialAudioEnabled: true }, hint: 'Full volume within this radius from viewport center.' },
            { key: 'spatialMaxDistance', label: '📏 Max Distance (px)', type: 'number', default: 1200, min: 10, max: 10000, step: 10, showIf: { spatialAudioEnabled: true }, hint: 'Silent beyond this radius.' },
            { key: 'spatialRolloff', label: '📉 Rolloff', type: 'select', default: 'linear', showIf: { spatialAudioEnabled: true },
                options: { 'linear': '📏 Linear', 'inverse': '🔄 Inverse', 'exponential': '📈 Exponential' },
                hint: 'How volume decreases with distance. Linear = steady fade, Inverse = realistic, Exponential = sharp cutoff.' },
            { type: 'groupEnd' },

            // ── Input ──
            { type: 'groupStart', label: '⌨️ Keyboard Input' },
            { key: 'keyAccelerate', label: '⬆️ Accelerate', type: 'key', default: 'ArrowUp' },
            { key: 'keyBrake', label: '⬇️ Brake / Reverse', type: 'key', default: 'ArrowDown' },
            { key: 'keySteerLeft', label: '⬅️ Steer Left', type: 'key', default: 'ArrowLeft' },
            { key: 'keySteerRight', label: '➡️ Steer Right', type: 'key', default: 'ArrowRight' },
            { key: 'keyHandbrake', label: '🅿️ Handbrake', type: 'key', default: 'Space' },
            { key: 'keyClutch', label: '🦶 Clutch', type: 'key', default: 'KeyC', showIf: { clutchEnabled: true } },
            { key: 'keyShiftUp', label: '⬆️ Shift Up', type: 'key', default: 'KeyE', showIf: { transmissionType: 'manual' } },
            { key: 'keyShiftDown', label: '⬇️ Shift Down', type: 'key', default: 'KeyQ', showIf: { transmissionType: 'manual' } },
            { key: 'keyBoost', label: '🚀 Boost', type: 'key', default: 'ShiftLeft' },
            { type: 'groupEnd' },

            // ── Gamepad ──
            { type: 'groupStart', label: '🎮 Gamepad Input' },
            { key: 'useGamepad', label: '✅ Use Gamepad', type: 'boolean', default: false },
            { key: 'gamepadIndex', label: '#️⃣ Gamepad Index', type: 'number', default: 0, min: 0, max: 3, step: 1, showIf: { useGamepad: true } },
            { key: 'gamepadAccelAxis', label: '🏎️ Accel Axis/Btn', type: 'number', default: 7, min: 0, max: 15, step: 1, showIf: { useGamepad: true } },
            { key: 'gamepadBrakeAxis', label: '🛑 Brake Axis/Btn', type: 'number', default: 6, min: 0, max: 15, step: 1, showIf: { useGamepad: true } },
            { key: 'gamepadSteerAxis', label: '🎯 Steer Axis', type: 'number', default: 0, min: 0, max: 5, step: 1, showIf: { useGamepad: true } },
            { key: 'gamepadHandbrakeBtn', label: '🅿️ Handbrake Btn', type: 'number', default: 0, min: 0, max: 15, step: 1, showIf: { useGamepad: true } },
            { key: 'gamepadBoostBtn', label: '🚀 Boost Btn', type: 'number', default: 2, min: 0, max: 15, step: 1, showIf: { useGamepad: true } },
            { type: 'groupEnd' },

            // ── Vehicle Interaction (GTA-Style) ──
            { type: 'groupStart', label: '🚗 Vehicle Interaction (GTA)' },
            { type: 'hint', label: 'Enable to let MovementController2D players enter/exit this vehicle with a key press' },
            { key: 'vehicleInteractionEnabled', label: '✅ Enable Enter/Exit', type: 'boolean', default: false },
            { key: 'driverSide', label: '🚪 Driver Side', type: 'select', default: 'left', showIf: { vehicleInteractionEnabled: true },
                options: { 'left': '⬅️ Left (US/EU)', 'right': '➡️ Right (UK/JP)' },
                hint: 'Which side of the vehicle the driver door is on' },
            { key: 'doorOffsetForward', label: '↕️ Door Fwd Offset', type: 'number', default: 0, min: -60, max: 60, step: 1, showIf: { vehicleInteractionEnabled: true }, hint: 'Forward offset from vehicle center to door (px). Positive = toward front.' },
            { key: 'doorOffsetLateral', label: '↔️ Door Side Offset', type: 'number', default: 25, min: 5, max: 80, step: 1, showIf: { vehicleInteractionEnabled: true }, hint: 'Lateral distance from center to door (px). Always positive — side determined by Driver Side.' },
            { key: 'occupantPrefab', label: '👤 Occupant Prefab', type: 'prefab', default: '', showIf: { vehicleInteractionEnabled: true }, hint: 'Prefab spawned as driver when vehicle is created by TilemapWorldGenerator. Should have MovementController2DBrain.' },
            { type: 'groupEnd' },

            // ── Debug ──
            { type: 'groupStart', label: '🐛 Debug' },
            { key: 'debugDraw', label: '📊 Debug Overlay', type: 'boolean', default: false },
            { type: 'groupEnd' }
        ];
    }

    // ════════════════════════════════════════════════════
    //  PRESETS
    // ════════════════════════════════════════════════════

    applyPreset() {
        const p = this.vehiclePreset;
        const presets = VehicleController.PRESETS;
        if (!presets[p]) return;
        const data = presets[p];
        for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
                this[key] = [...data[key]];
            } else {
                this[key] = data[key];
            }
        }
    }

    static PRESETS = {
        sport: {
            enginePower: 320, reversePower: 160, brakePower: 1800, vehicleWeightKg: 1400, tyreGripRating: 1.1,
            maxRPM: 7000, redlineRPM: 6800, idleRPM: 800,
            gearCount: 6, gearConfigMode: 'ratio', gearRatios: [3.8, 2.5, 1.8, 1.3, 1.0, 0.75], reverseGearRatio: 3.2, finalDriveRatio: 3.5,
            transmissionType: 'automatic', shiftUpRPM: 6200, shiftDownRPM: 2500, shiftTime: 0.12,
            maxSteerAngle: 32, steerSpeed: 3.5, steerReturnSpeed: 5.0,
            frontGrip: 1.0, rearGrip: 0.95, gripFalloffSpeed: 250, gripMinMultiplier: 0.55,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.35, driftSteerMultiplier: 1.6,
            driftBoostEnabled: true, driftBoostChargeRate: 150, driftBoostMaxCharge: 500, driftBoostForce: 2000, driftBoostDuration: 0.4,
            highSpeedMomentum: 0.6, momentumSpeedThreshold: 140, driftMomentumRetention: 0.75, weightMomentumFactor: 1.0, powerOvercomeMomentum: 0.6, momentumRecoveryRate: 2.5, momentumSlideFriction: 0.5,
            linearDrag: 0.5, angularDrag: 4.0, rollingResistance: 0.015, airResistanceCoeff: 0.0005,
            topSpeed: 250, reverseTopSpeed: 40,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 3, exhaustParticles: true
        },
        drift: {
            enginePower: 380, reversePower: 150, brakePower: 1500, vehicleWeightKg: 1300, tyreGripRating: 0.85,
            maxRPM: 7500, redlineRPM: 7200, idleRPM: 900,
            gearCount: 5, gearConfigMode: 'ratio', gearRatios: [3.4, 2.2, 1.6, 1.1, 0.85], reverseGearRatio: 3.0, finalDriveRatio: 4.0,
            transmissionType: 'automatic', shiftUpRPM: 6800, shiftDownRPM: 3000, shiftTime: 0.1,
            maxSteerAngle: 45, steerSpeed: 5.0, steerReturnSpeed: 6.0, counterSteerFactor: 2.0,
            frontGrip: 1.1, rearGrip: 0.55, gripFalloffSpeed: 180, gripMinMultiplier: 0.3,
            driftEnabled: true, driftTrigger: 'oversteer', driftGripMultiplier: 0.2, driftSteerMultiplier: 2.0,
            driftCounterSteer: true,
            driftBoostEnabled: true, driftBoostChargeRate: 250, driftBoostMaxCharge: 600, driftBoostForce: 2500, driftBoostDuration: 0.5,
            highSpeedMomentum: 0.5, momentumSpeedThreshold: 100, driftMomentumRetention: 0.6, weightMomentumFactor: 0.8, powerOvercomeMomentum: 0.7, momentumRecoveryRate: 3.0, momentumSlideFriction: 0.35,
            linearDrag: 0.4, angularDrag: 3.0, rollingResistance: 0.012, airResistanceCoeff: 0.0004,
            topSpeed: 220, reverseTopSpeed: 35,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 5, exhaustParticles: true, tireMarkEnabled: true
        },
        f1: {
            enginePower: 950, reversePower: 120, brakePower: 2800, vehicleWeightKg: 800, tyreGripRating: 1.8,
            maxRPM: 12000, redlineRPM: 11500, idleRPM: 4000,
            gearCount: 8, gearConfigMode: 'ratio', gearRatios: [4.0, 3.0, 2.4, 1.9, 1.55, 1.25, 1.0, 0.8], reverseGearRatio: 3.5, finalDriveRatio: 3.0,
            transmissionType: 'automatic', shiftUpRPM: 11000, shiftDownRPM: 6000, shiftTime: 0.05,
            maxSteerAngle: 20, steerSpeed: 6.0, steerReturnSpeed: 8.0,
            frontGrip: 1.5, rearGrip: 1.4, gripFalloffSpeed: 400, gripMinMultiplier: 0.7,
            driftEnabled: false, driftTrigger: 'handbrake', driftGripMultiplier: 0.5,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.3, momentumSpeedThreshold: 200, driftMomentumRetention: 0.4, weightMomentumFactor: 0.6, powerOvercomeMomentum: 0.9, momentumRecoveryRate: 4.0, momentumSlideFriction: 0.6,
            linearDrag: 0.8, angularDrag: 6.0, rollingResistance: 0.01, airResistanceCoeff: 0.0003,
            topSpeed: 340, reverseTopSpeed: 20,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 1, exhaustParticles: true
        },
        muscle: {
            enginePower: 500, reversePower: 200, brakePower: 1600, vehicleWeightKg: 1800, tyreGripRating: 0.8,
            maxRPM: 6500, redlineRPM: 6200, idleRPM: 700,
            gearCount: 4, gearConfigMode: 'ratio', gearRatios: [3.0, 2.0, 1.4, 1.0], reverseGearRatio: 3.5, finalDriveRatio: 4.0,
            transmissionType: 'automatic', shiftUpRPM: 5800, shiftDownRPM: 2200, shiftTime: 0.2,
            maxSteerAngle: 30, steerSpeed: 3.0, steerReturnSpeed: 4.0,
            frontGrip: 0.9, rearGrip: 0.7, gripFalloffSpeed: 200, gripMinMultiplier: 0.4,
            driftEnabled: true, driftTrigger: 'oversteer', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.4,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.85, momentumSpeedThreshold: 100, driftMomentumRetention: 0.9, weightMomentumFactor: 1.3, powerOvercomeMomentum: 0.4, momentumRecoveryRate: 1.5, momentumSlideFriction: 0.4,
            linearDrag: 0.4, angularDrag: 3.5, rollingResistance: 0.018, airResistanceCoeff: 0.0006,
            topSpeed: 220, reverseTopSpeed: 30,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 4, exhaustParticles: true
        },
        offroad: {
            enginePower: 350, reversePower: 200, brakePower: 1500, vehicleWeightKg: 2000, tyreGripRating: 1.2,
            maxRPM: 6000, redlineRPM: 5800, idleRPM: 750,
            gearCount: 5, gearConfigMode: 'ratio', gearRatios: [4.5, 3.0, 2.0, 1.4, 1.0], reverseGearRatio: 4.0, finalDriveRatio: 4.5,
            transmissionType: 'automatic', shiftUpRPM: 5500, shiftDownRPM: 2200, shiftTime: 0.18,
            maxSteerAngle: 38, steerSpeed: 3.0, steerReturnSpeed: 4.0,
            frontGrip: 1.2, rearGrip: 1.1, gripFalloffSpeed: 180, gripMinMultiplier: 0.6,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.45, driftSteerMultiplier: 1.3,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.75, momentumSpeedThreshold: 80, driftMomentumRetention: 0.8, weightMomentumFactor: 1.4, powerOvercomeMomentum: 0.5, momentumRecoveryRate: 1.8, momentumSlideFriction: 0.45,
            linearDrag: 0.7, angularDrag: 4.5, rollingResistance: 0.025, airResistanceCoeff: 0.0008,
            topSpeed: 180, reverseTopSpeed: 35,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 6, exhaustParticles: true
        },
        hover: {
            enginePower: 400, reversePower: 250, brakePower: 1200, vehicleWeightKg: 1000, tyreGripRating: 0.6,
            maxRPM: 8000, redlineRPM: 7800, idleRPM: 1500,
            gearCount: 1, gearConfigMode: 'ratio', gearRatios: [1.0], reverseGearRatio: 1.0, finalDriveRatio: 1.0,
            transmissionType: 'cvt', shiftTime: 0,
            maxSteerAngle: 40, steerSpeed: 4.0, steerReturnSpeed: 3.5,
            frontGrip: 0.7, rearGrip: 0.5, gripFalloffSpeed: 250, gripMinMultiplier: 0.3,
            driftEnabled: true, driftTrigger: 'always', driftGripMultiplier: 0.25, driftSteerMultiplier: 1.8,
            driftBoostEnabled: true, driftBoostChargeRate: 200, driftBoostMaxCharge: 800, driftBoostForce: 2800, driftBoostDuration: 0.5,
            highSpeedMomentum: 0.8, momentumSpeedThreshold: 100, driftMomentumRetention: 0.9, weightMomentumFactor: 0.7, powerOvercomeMomentum: 0.6, momentumRecoveryRate: 1.2, momentumSlideFriction: 0.2,
            linearDrag: 0.25, angularDrag: 2.5, rollingResistance: 0.005, airResistanceCoeff: 0.0003,
            topSpeed: 250, reverseTopSpeed: 60,
            hoverEnabled: true, hoverHeight: 25, hoverFrequency: 2.5, hoverSlipFactor: 0.4, hoverTiltAmount: 10,
            boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 0, exhaustParticles: true, tireMarkEnabled: false
        },
        boat: {
            enginePower: 280, reversePower: 100, brakePower: 800, vehicleWeightKg: 1200, tyreGripRating: 0.5,
            maxRPM: 6000, redlineRPM: 5800, idleRPM: 700,
            gearCount: 3, gearConfigMode: 'ratio', gearRatios: [3.0, 2.0, 1.2], reverseGearRatio: 2.5, finalDriveRatio: 3.0,
            transmissionType: 'automatic', shiftUpRPM: 5200, shiftDownRPM: 2000, shiftTime: 0.2,
            maxSteerAngle: 50, steerSpeed: 2.0, steerReturnSpeed: 2.5,
            frontGrip: 0.6, rearGrip: 0.4, gripFalloffSpeed: 150, gripMinMultiplier: 0.25,
            driftEnabled: true, driftTrigger: 'always', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.2,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.85, momentumSpeedThreshold: 60, driftMomentumRetention: 0.95, weightMomentumFactor: 1.0, powerOvercomeMomentum: 0.3, momentumRecoveryRate: 1.0, momentumSlideFriction: 0.3,
            linearDrag: 1.2, angularDrag: 3.0, rollingResistance: 0.005, airResistanceCoeff: 0.001,
            topSpeed: 110, reverseTopSpeed: 20,
            hoverEnabled: false, boatMode: true, waterDrag: 1.2, waveSway: 4.0, waveFrequency: 1.0,
            tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 5, exhaustParticles: false, tireMarkEnabled: false
        },
        tank: {
            enginePower: 1500, reversePower: 300, brakePower: 2200, vehicleWeightKg: 50000, tyreGripRating: 1.5,
            maxRPM: 5000, redlineRPM: 4800, idleRPM: 600,
            gearCount: 4, gearConfigMode: 'ratio', gearRatios: [4.5, 3.0, 2.0, 1.5], reverseGearRatio: 4.0, finalDriveRatio: 5.0,
            transmissionType: 'automatic', shiftUpRPM: 4500, shiftDownRPM: 1800, shiftTime: 0.3,
            maxSteerAngle: 0, steerSpeed: 2.0, steerReturnSpeed: 3.0,
            frontGrip: 1.5, rearGrip: 1.5, gripFalloffSpeed: 120, gripMinMultiplier: 0.8,
            driftEnabled: false, driftBoostEnabled: false,
            highSpeedMomentum: 0.95, momentumSpeedThreshold: 30, driftMomentumRetention: 0.98, weightMomentumFactor: 2.0, powerOvercomeMomentum: 0.2, momentumRecoveryRate: 0.5, momentumSlideFriction: 0.55,
            linearDrag: 1.0, angularDrag: 5.0, rollingResistance: 0.03, airResistanceCoeff: 0.001,
            topSpeed: 65, reverseTopSpeed: 20,
            hoverEnabled: false, boatMode: false,
            tankSteering: true, tankTurnSpeed: 120, tankTurnBraking: 0.5,
            angleSnapping: false,
            bodyRollAmount: 0, exhaustParticles: true, tireMarkEnabled: true
        },
        bus: {
            enginePower: 380, reversePower: 150, brakePower: 1600, vehicleWeightKg: 12000, tyreGripRating: 0.9,
            maxRPM: 4500, redlineRPM: 4200, idleRPM: 600,
            gearCount: 6, gearConfigMode: 'ratio', gearRatios: [5.0, 3.5, 2.5, 1.8, 1.3, 1.0], reverseGearRatio: 4.5, finalDriveRatio: 5.0,
            transmissionType: 'automatic', shiftUpRPM: 3800, shiftDownRPM: 1600, shiftTime: 0.3,
            maxSteerAngle: 25, steerSpeed: 1.8, steerReturnSpeed: 2.5,
            frontGrip: 1.0, rearGrip: 1.0, gripFalloffSpeed: 120, gripMinMultiplier: 0.7,
            driftEnabled: false, driftBoostEnabled: false,
            highSpeedMomentum: 0.9, momentumSpeedThreshold: 50, driftMomentumRetention: 0.95, weightMomentumFactor: 1.8, powerOvercomeMomentum: 0.2, momentumRecoveryRate: 0.8, momentumSlideFriction: 0.5,
            linearDrag: 0.8, angularDrag: 5.0, rollingResistance: 0.02, airResistanceCoeff: 0.0012,
            topSpeed: 100, reverseTopSpeed: 15,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 7, exhaustParticles: true, tireMarkEnabled: false
        },
        ice: {
            enginePower: 280, reversePower: 140, brakePower: 900, vehicleWeightKg: 1400, tyreGripRating: 0.3,
            maxRPM: 7000, redlineRPM: 6800, idleRPM: 800,
            gearCount: 5, gearConfigMode: 'ratio', gearRatios: [3.6, 2.4, 1.65, 1.1, 0.8], reverseGearRatio: 3.2, finalDriveRatio: 3.5,
            transmissionType: 'automatic', shiftUpRPM: 6200, shiftDownRPM: 2500, shiftTime: 0.12,
            maxSteerAngle: 35, steerSpeed: 3.5, steerReturnSpeed: 4.0,
            frontGrip: 0.35, rearGrip: 0.25, gripFalloffSpeed: 120, gripMinMultiplier: 0.15,
            driftEnabled: true, driftTrigger: 'always', driftGripMultiplier: 0.1, driftSteerMultiplier: 1.8,
            driftCounterSteer: true, driftBoostEnabled: false,
            highSpeedMomentum: 0.95, momentumSpeedThreshold: 60, driftMomentumRetention: 0.98, weightMomentumFactor: 1.0, powerOvercomeMomentum: 0.2, momentumRecoveryRate: 0.5, momentumSlideFriction: 0.1,
            linearDrag: 0.15, angularDrag: 2.0, rollingResistance: 0.005, airResistanceCoeff: 0.0004,
            topSpeed: 200, reverseTopSpeed: 30,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 2, exhaustParticles: true, tireMarkEnabled: true
        },
        arcade: {
            enginePower: 400, reversePower: 200, brakePower: 2200, vehicleWeightKg: 1200, tyreGripRating: 1.3,
            maxRPM: 7000, redlineRPM: 6800, idleRPM: 800,
            gearCount: 1, gearConfigMode: 'ratio', gearRatios: [1.0], reverseGearRatio: 1.0, finalDriveRatio: 1.0,
            transmissionType: 'cvt', shiftTime: 0,
            maxSteerAngle: 40, steerSpeed: 5.0, steerReturnSpeed: 7.0,
            speedSensitiveSteering: false,
            frontGrip: 1.2, rearGrip: 1.0, gripFalloffSpeed: 300, gripMinMultiplier: 0.6,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.8,
            driftBoostEnabled: true, driftBoostChargeRate: 300, driftBoostMaxCharge: 400, driftBoostForce: 2800, driftBoostDuration: 0.3,
            highSpeedMomentum: 0.2, momentumSpeedThreshold: 180, driftMomentumRetention: 0.3, weightMomentumFactor: 0.5, powerOvercomeMomentum: 0.9, momentumRecoveryRate: 5.0, momentumSlideFriction: 0.6,
            linearDrag: 0.6, angularDrag: 5.0, rollingResistance: 0.01, airResistanceCoeff: 0.0002,
            topSpeed: 240, reverseTopSpeed: 45,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 2, exhaustParticles: true, tireMarkEnabled: true
        },
        kart: {
            enginePower: 30, reversePower: 15, brakePower: 1200, vehicleWeightKg: 250, tyreGripRating: 1.0,
            maxRPM: 8000, redlineRPM: 7800, idleRPM: 1200,
            gearCount: 1, gearConfigMode: 'ratio', gearRatios: [2.5], reverseGearRatio: 2.0, finalDriveRatio: 3.0,
            transmissionType: 'cvt', shiftTime: 0,
            maxSteerAngle: 45, steerSpeed: 6.0, steerReturnSpeed: 8.0,
            speedSensitiveSteering: true, minSteerAtSpeed: 0.5,
            frontGrip: 1.3, rearGrip: 0.9, gripFalloffSpeed: 150, gripMinMultiplier: 0.5,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.25, driftSteerMultiplier: 2.2,
            driftBoostEnabled: true, driftBoostChargeRate: 350, driftBoostMaxCharge: 300, driftBoostForce: 1800, driftBoostDuration: 0.35,
            highSpeedMomentum: 0.4, momentumSpeedThreshold: 80, driftMomentumRetention: 0.5, weightMomentumFactor: 0.3, powerOvercomeMomentum: 0.8, momentumRecoveryRate: 4.0, momentumSlideFriction: 0.55,
            linearDrag: 0.7, angularDrag: 5.5, rollingResistance: 0.02, airResistanceCoeff: 0.0005,
            topSpeed: 120, reverseTopSpeed: 20,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 3, exhaustParticles: true, tireMarkEnabled: true
        },
        gta2: {
            enginePower: 300, reversePower: 140, brakePower: 1600, vehicleWeightKg: 1500, tyreGripRating: 1.0,
            maxRPM: 6000, redlineRPM: 5800, idleRPM: 800,
            gearCount: 4, gearConfigMode: 'ratio', gearRatios: [3.2, 2.1, 1.4, 1.0], reverseGearRatio: 3.0, finalDriveRatio: 3.0,
            transmissionType: 'automatic', shiftUpRPM: 5500, shiftDownRPM: 2200, shiftTime: 0.1,
            maxSteerAngle: 35, steerSpeed: 5.0, steerReturnSpeed: 6.0,
            speedSensitiveSteering: true, minSteerAtSpeed: 0.4,
            frontGrip: 1.0, rearGrip: 0.85, gripFalloffSpeed: 200, gripMinMultiplier: 0.5,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.5,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.5, momentumSpeedThreshold: 100, driftMomentumRetention: 0.6, weightMomentumFactor: 1.0, powerOvercomeMomentum: 0.5, momentumRecoveryRate: 2.5, momentumSlideFriction: 0.5,
            linearDrag: 0.6, angularDrag: 4.0, rollingResistance: 0.015, airResistanceCoeff: 0.0005,
            topSpeed: 200, reverseTopSpeed: 30,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: true, angleSnapDivisions: 8, angleSnapSpeed: 60, angleSnapStrength: 3.0,
            bodyRollAmount: 0, exhaustParticles: true, tireMarkEnabled: true
        },
        supercar: {
            enginePower: 750, reversePower: 180, brakePower: 2500, vehicleWeightKg: 1500, tyreGripRating: 1.5,
            maxRPM: 9000, redlineRPM: 8800, idleRPM: 900,
            gearCount: 7, gearConfigMode: 'ratio', gearRatios: [3.8, 2.8, 2.1, 1.6, 1.2, 0.95, 0.75], reverseGearRatio: 3.2, finalDriveRatio: 3.2,
            transmissionType: 'automatic', shiftUpRPM: 8500, shiftDownRPM: 4500, shiftTime: 0.06,
            maxSteerAngle: 28, steerSpeed: 4.5, steerReturnSpeed: 6.0,
            frontGrip: 1.3, rearGrip: 1.0, gripFalloffSpeed: 350, gripMinMultiplier: 0.6,
            driftEnabled: true, driftTrigger: 'oversteer', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.5,
            driftCounterSteer: true,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.55, momentumSpeedThreshold: 180, driftMomentumRetention: 0.7, weightMomentumFactor: 1.0, powerOvercomeMomentum: 0.75, momentumRecoveryRate: 3.0, momentumSlideFriction: 0.5,
            linearDrag: 0.55, angularDrag: 4.5, rollingResistance: 0.012, airResistanceCoeff: 0.0003,
            topSpeed: 350, reverseTopSpeed: 35,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 2, exhaustParticles: true, tireMarkEnabled: true
        },
        pickup: {
            enginePower: 400, reversePower: 180, brakePower: 1400, vehicleWeightKg: 2400, tyreGripRating: 0.95,
            maxRPM: 5500, redlineRPM: 5200, idleRPM: 650,
            gearCount: 5, gearConfigMode: 'ratio', gearRatios: [4.0, 2.8, 2.0, 1.4, 1.0], reverseGearRatio: 3.8, finalDriveRatio: 4.2,
            transmissionType: 'automatic', shiftUpRPM: 4800, shiftDownRPM: 2000, shiftTime: 0.22,
            maxSteerAngle: 30, steerSpeed: 2.5, steerReturnSpeed: 3.5,
            frontGrip: 1.0, rearGrip: 0.8, gripFalloffSpeed: 160, gripMinMultiplier: 0.5,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.4, driftSteerMultiplier: 1.3,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.8, momentumSpeedThreshold: 80, driftMomentumRetention: 0.85, weightMomentumFactor: 1.5, powerOvercomeMomentum: 0.4, momentumRecoveryRate: 1.5, momentumSlideFriction: 0.45,
            linearDrag: 0.6, angularDrag: 4.0, rollingResistance: 0.022, airResistanceCoeff: 0.0009,
            topSpeed: 160, reverseTopSpeed: 30,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 5, exhaustParticles: true, tireMarkEnabled: true
        },
        buggy: {
            enginePower: 200, reversePower: 100, brakePower: 1200, vehicleWeightKg: 600, tyreGripRating: 1.1,
            maxRPM: 8000, redlineRPM: 7600, idleRPM: 1000,
            gearCount: 4, gearConfigMode: 'ratio', gearRatios: [3.5, 2.2, 1.5, 1.0], reverseGearRatio: 3.0, finalDriveRatio: 4.0,
            transmissionType: 'automatic', shiftUpRPM: 7200, shiftDownRPM: 3000, shiftTime: 0.1,
            maxSteerAngle: 42, steerSpeed: 5.5, steerReturnSpeed: 7.0,
            speedSensitiveSteering: true, minSteerAtSpeed: 0.5,
            frontGrip: 1.1, rearGrip: 0.8, gripFalloffSpeed: 140, gripMinMultiplier: 0.45,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.3, driftSteerMultiplier: 1.8,
            driftCounterSteer: true,
            driftBoostEnabled: true, driftBoostChargeRate: 200, driftBoostMaxCharge: 350, driftBoostForce: 1500, driftBoostDuration: 0.3,
            highSpeedMomentum: 0.5, momentumSpeedThreshold: 70, driftMomentumRetention: 0.55, weightMomentumFactor: 0.4, powerOvercomeMomentum: 0.7, momentumRecoveryRate: 3.5, momentumSlideFriction: 0.4,
            linearDrag: 0.5, angularDrag: 4.0, rollingResistance: 0.02, airResistanceCoeff: 0.0006,
            topSpeed: 140, reverseTopSpeed: 25,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 4, exhaustParticles: true, tireMarkEnabled: true
        },
        police: {
            enginePower: 450, reversePower: 200, brakePower: 2200, vehicleWeightKg: 1800, tyreGripRating: 1.2,
            maxRPM: 6500, redlineRPM: 6200, idleRPM: 700,
            gearCount: 6, gearConfigMode: 'ratio', gearRatios: [3.5, 2.4, 1.75, 1.3, 0.95, 0.75], reverseGearRatio: 3.2, finalDriveRatio: 3.5,
            transmissionType: 'automatic', shiftUpRPM: 5800, shiftDownRPM: 2400, shiftTime: 0.1,
            maxSteerAngle: 33, steerSpeed: 4.0, steerReturnSpeed: 5.5,
            frontGrip: 1.15, rearGrip: 1.05, gripFalloffSpeed: 250, gripMinMultiplier: 0.55,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.35, driftSteerMultiplier: 1.5,
            driftCounterSteer: true,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.65, momentumSpeedThreshold: 130, driftMomentumRetention: 0.7, weightMomentumFactor: 1.2, powerOvercomeMomentum: 0.55, momentumRecoveryRate: 2.5, momentumSlideFriction: 0.5,
            linearDrag: 0.5, angularDrag: 4.0, rollingResistance: 0.016, airResistanceCoeff: 0.0005,
            topSpeed: 260, reverseTopSpeed: 40,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 3, exhaustParticles: true, tireMarkEnabled: true
        },
        limo: {
            enginePower: 350, reversePower: 140, brakePower: 1500, vehicleWeightKg: 2800, tyreGripRating: 0.9,
            maxRPM: 5500, redlineRPM: 5200, idleRPM: 650,
            gearCount: 5, gearConfigMode: 'ratio', gearRatios: [4.0, 2.8, 2.0, 1.4, 1.0], reverseGearRatio: 3.5, finalDriveRatio: 3.8,
            transmissionType: 'automatic', shiftUpRPM: 4800, shiftDownRPM: 2000, shiftTime: 0.25,
            maxSteerAngle: 22, steerSpeed: 2.0, steerReturnSpeed: 2.5,
            frontGrip: 0.9, rearGrip: 0.85, gripFalloffSpeed: 150, gripMinMultiplier: 0.5,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.35, driftSteerMultiplier: 1.2,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.85, momentumSpeedThreshold: 80, driftMomentumRetention: 0.9, weightMomentumFactor: 1.6, powerOvercomeMomentum: 0.3, momentumRecoveryRate: 1.2, momentumSlideFriction: 0.45,
            linearDrag: 0.7, angularDrag: 5.0, rollingResistance: 0.02, airResistanceCoeff: 0.001,
            topSpeed: 180, reverseTopSpeed: 25,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 6, exhaustParticles: true, tireMarkEnabled: false
        },
        motorcycle: {
            enginePower: 180, reversePower: 40, brakePower: 1600, vehicleWeightKg: 220, tyreGripRating: 1.0,
            maxRPM: 13000, redlineRPM: 12500, idleRPM: 1200,
            gearCount: 6, gearConfigMode: 'ratio', gearRatios: [3.2, 2.5, 2.0, 1.6, 1.3, 1.0], reverseGearRatio: 2.0, finalDriveRatio: 3.0,
            transmissionType: 'automatic', shiftUpRPM: 11500, shiftDownRPM: 5000, shiftTime: 0.08,
            maxSteerAngle: 25, steerSpeed: 6.0, steerReturnSpeed: 8.0,
            speedSensitiveSteering: true, minSteerAtSpeed: 0.2,
            frontGrip: 0.9, rearGrip: 0.85, gripFalloffSpeed: 250, gripMinMultiplier: 0.4,
            driftEnabled: true, driftTrigger: 'handbrake', driftGripMultiplier: 0.25, driftSteerMultiplier: 1.8,
            driftCounterSteer: true,
            driftBoostEnabled: false,
            highSpeedMomentum: 0.45, momentumSpeedThreshold: 120, driftMomentumRetention: 0.5, weightMomentumFactor: 0.2, powerOvercomeMomentum: 0.85, momentumRecoveryRate: 4.5, momentumSlideFriction: 0.55,
            linearDrag: 0.35, angularDrag: 3.5, rollingResistance: 0.01, airResistanceCoeff: 0.0004,
            topSpeed: 280, reverseTopSpeed: 15,
            hoverEnabled: false, boatMode: false, tankSteering: false,
            angleSnapping: false,
            bodyRollAmount: 8, exhaustParticles: true, tireMarkEnabled: true
        }
    };

    // ════════════════════════════════════════════════════
    //  LIFECYCLE
    // ════════════════════════════════════════════════════

    start() {
        // Initialize decal layer for permanent tire marks
        if (typeof initDecalLayer === 'function') {
            initDecalLayer();
        }

        this._currentSteer = 0;
        this._currentSpeed = 0;
        this._currentRPM = this.idleRPM;
        this._currentGear = 1;
        this._isShifting = false;
        this._shiftTimer = 0;
        this._preShiftRPM = this.idleRPM;
        this._fromGear = 1;
        this._actualShiftDuration = 0;
        this._isDrifting = false;
        this._driftAngle = 0;
        this._driftBoostCharge = 0;
        this._isBoosting = false;
        this._boostTimer = 0;
        this._hoverPhase = Math.random() * Math.PI * 2;
        this._lastTire1X = undefined;
        this._lastTire1Y = undefined;
        this._lastTire2X = undefined;
        this._lastTire2Y = undefined;
        this._lastFrontTire1X = undefined;
        this._lastFrontTire1Y = undefined;
        this._lastFrontTire2X = undefined;
        this._lastFrontTire2Y = undefined;
        this._collisionHitTimer = 0;
        this._throttle = 0;
        this._brakeInput = 0;
        this._steerInput = 0;
        this._handbrakeInput = false;
        this._clutchInput = false;
        this._clutchWasHeld = false;
        this._revLimiterBounceTimer = 0;
        this._revLimiterBounceDirection = 0;
        this._clutchDumpTimer = 0;
        this._clutchDumpRPM = 0;
        this._localVelX = 0;
        this._localVelY = 0;
        this._slipAngle = 0;
        this._wavePhase = Math.random() * Math.PI * 2;
        this._baseY = this.gameObject.position.y;
        this._velX = 0;
        this._velY = 0;
        this._handbrakeActiveTime = 0;
        this._isReverseAccelerating = false;
        this._preDriftVelX = 0;
        this._preDriftVelY = 0;
        this._momentumVelX = 0;
        this._momentumVelY = 0;
        this._wasInHighSpeedDrift = false;
        this._isHighSpeedTurn = false;
        this._rb = null;
        this._collider = undefined;  // cached collider for simple collision mode
        this._occupant = null;  // reference to MovementController2D occupying this vehicle

        // Generated audio state
        this._audioCtx = null;
        this._audioInitialized = false;
        this._engineOscillators = null;
        this._engineGain = null;
        this._engineOutputGain = null;
        this._masterGain = null;
        this._exhaustNoiseNode = null;
        this._exhaustFilter = null;
        this._exhaustNoiseGain = null;
        this._vibratoOsc = null;
        this._vibratoGain = null;
        this._handbrakeGain = null;
        this._handbrakeNoise = null;
        this._handbrakeFilter = null;
    }

    loop(deltaTime) {
        if (deltaTime <= 0 || deltaTime > 0.1) return;

        // Handle collisions based on mode
        if (this.vehicleCollisionMode === 'simple') {
            // Simple mode: try Web Worker path, fall back to main-thread
            if (this.useCollisionWorker && typeof CollisionWorkerManager !== 'undefined' && CollisionWorkerManager.isAvailable()) {
                this._handleSimpleVehicleCollisionsWorker(deltaTime);
            } else {
                this._handleSimpleVehicleCollisions(deltaTime);
            }
        } else {
            // Rigidbody mode: sync velocity from Rigidbody (picks up collision response corrections)
            this._handleRigidbodyCollisions(deltaTime);
        }

        if (this.playerControlled) {
            this._readInput();
        }
        // When playerControlled = false, AI sets inputs via setThrottle(), setSteering(), etc.
        // Inputs are NOT zeroed here so AI control persists between frames.

        this._updateTransmission(deltaTime);
        this._updateSteering(deltaTime);
        this._applyDriveForces(deltaTime);
        this._applyGrip(deltaTime);
        this._applyDrag(deltaTime);
        this._updateDrift(deltaTime);
        this._updateBoost(deltaTime);
        this._applySustainedContactFriction(deltaTime);
        this._applyMovement(deltaTime);
        this._updateVisualEffects(deltaTime);
        this._updateGeneratedAudio(deltaTime);
    }

    /**
     * Simple lightweight vehicle-to-vehicle collision detection and response.
     * Does NOT require Rigidbody's realisticPhysics - uses simple circle/AABB overlap.
     * Much more efficient for many vehicles.
     * 
     * OPTIMIZED: Uses collision pair cooldowns to prevent continuous collision spam.
     * After two vehicles collide, they cannot collide again for a brief period.
     */
    _handleSimpleVehicleCollisions(deltaTime) {
        const pos = this.gameObject.position;
        const myCollider = this._getCollider();
        if (!myCollider) return;

        // Assign unique ID for collision pair tracking (once per vehicle)
        if (this._vehicleCollisionId === undefined) {
            VehicleController._nextCollisionId = (VehicleController._nextCollisionId || 0) + 1;
            this._vehicleCollisionId = VehicleController._nextCollisionId;
        }

        // Initialize collision cooldown map (persistent across frames)
        if (!VehicleController._collisionCooldowns) {
            VehicleController._collisionCooldowns = new Map();
        }

        // Per-frame set to prevent duplicate processing within same frame
        const engine = window.gameEngine;
        const frameTime = engine ? engine._lastFrameTime : performance.now();
        if (VehicleController._lastCollisionFrame !== frameTime) {
            VehicleController._lastCollisionFrame = frameTime;
            VehicleController._processedPairs = new Set();
            
            // Clean up expired cooldowns periodically (every ~60 frames)
            VehicleController._cooldownCleanupCounter = (VehicleController._cooldownCleanupCounter || 0) + 1;
            if (VehicleController._cooldownCleanupCounter >= 60) {
                VehicleController._cooldownCleanupCounter = 0;
                const now = performance.now();
                for (const [key, expireTime] of VehicleController._collisionCooldowns) {
                    if (now > expireTime) {
                        VehicleController._collisionCooldowns.delete(key);
                    }
                }
            }
        }

        // Get vehicle bounds for collision
        const myBounds = myCollider.getBounds ? myCollider.getBounds() : null;
        if (!myBounds) return;

        const myRadius = Math.max(myBounds.width, myBounds.height) * 0.5;
        const searchRadius = myRadius * 3; // Search nearby vehicles

        // Use spatial query to find nearby objects
        let nearbyObjects;
        if (typeof instancesInRadius === 'function') {
            nearbyObjects = instancesInRadius(pos.x, pos.y, searchRadius);
        } else {
            if (!engine) return;
            nearbyObjects = engine.instances.filter(inst => {
                if (inst === this.gameObject) return false;
                const dx = inst.position.x - pos.x;
                const dy = inst.position.y - pos.y;
                return (dx * dx + dy * dy) <= searchRadius * searchRadius;
            });
        }

        const currentTime = performance.now();
        const collisionCooldownMs = 150; // ms before same pair can collide again

        // Check collisions with other vehicles
        for (const otherObj of nearbyObjects) {
            if (otherObj === this.gameObject) continue;

            // Use cached module lookups
            let otherVC = otherObj._cachedVehicleController;
            if (otherVC === undefined) {
                otherVC = otherObj.getModule ? otherObj.getModule('VehicleController') : null;
                otherObj._cachedVehicleController = otherVC || null;
            }
            if (!otherVC) continue; // Only collide with other vehicles

            // Ensure other vehicle has collision ID
            if (otherVC._vehicleCollisionId === undefined) {
                VehicleController._nextCollisionId = (VehicleController._nextCollisionId || 0) + 1;
                otherVC._vehicleCollisionId = VehicleController._nextCollisionId;
            }

            // Create unique pair key (lower ID first for consistency)
            const myId = this._vehicleCollisionId;
            const otherId = otherVC._vehicleCollisionId;
            const pairKey = myId < otherId ? `${myId}_${otherId}` : `${otherId}_${myId}`;

            // Skip if this pair was already processed this frame
            if (VehicleController._processedPairs.has(pairKey)) continue;
            VehicleController._processedPairs.add(pairKey);

            // Skip if this pair is still on cooldown from recent collision
            const cooldownExpire = VehicleController._collisionCooldowns.get(pairKey);
            if (cooldownExpire && currentTime < cooldownExpire) {
                // Still on cooldown - but do position separation if overlapping
                let otherCollider = otherObj._cachedCollider;
                if (otherCollider === undefined) {
                    if (otherObj.getModule) {
                        otherCollider = otherObj.getModule('BoxCollider') || 
                                       otherObj.getModule('SphereCollider') ||
                                       otherObj.getModule('PolygonCollider');
                    }
                    otherObj._cachedCollider = otherCollider || null;
                }
                if (otherCollider) {
                    const otherBounds = otherCollider.getBounds ? otherCollider.getBounds() : null;
                    if (otherBounds) {
                        const overlap = this._checkAABBOverlap(myBounds, otherBounds);
                        if (overlap) {
                            // Just separate, no impulse (soft push)
                            const dx = otherObj.position.x - pos.x;
                            const dy = otherObj.position.y - pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                            const nx = dx / dist;
                            const ny = dy / dist;
                            
                            const myRb = this._getRigidbody();
                            const myMass = myRb ? (myRb.mass || 1) : 1;
                            let otherRb = otherObj._cachedRigidbody;
                            if (otherRb === undefined) {
                                otherRb = otherObj.getModule ? otherObj.getModule('Rigidbody') : null;
                                otherObj._cachedRigidbody = otherRb || null;
                            }
                            const otherMass = otherRb ? (otherRb.mass || 1) : 1;
                            const totalMass = myMass + otherMass;
                            
                            // Gentle separation only
                            const separation = overlap.depth + 2;
                            const myRatio = otherMass / totalMass;
                            const otherRatio = myMass / totalMass;
                            this.gameObject.position.x -= nx * separation * myRatio;
                            this.gameObject.position.y -= ny * separation * myRatio;
                            otherObj.position.x += nx * separation * otherRatio;
                            otherObj.position.y += ny * separation * otherRatio;
                        }
                    }
                }
                continue;
            }

            // Get other vehicle's collider
            let otherCollider = otherObj._cachedCollider;
            if (otherCollider === undefined) {
                if (otherObj.getModule) {
                    otherCollider = otherObj.getModule('BoxCollider') || 
                                   otherObj.getModule('SphereCollider') ||
                                   otherObj.getModule('PolygonCollider');
                }
                otherObj._cachedCollider = otherCollider || null;
            }
            if (!otherCollider) continue;

            const otherBounds = otherCollider.getBounds ? otherCollider.getBounds() : null;
            if (!otherBounds) continue;

            // Simple AABB overlap check
            const overlap = this._checkAABBOverlap(myBounds, otherBounds);
            if (!overlap) continue;

            // Calculate collision response
            const dx = otherObj.position.x - pos.x;
            const dy = otherObj.position.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;

            // Get velocities
            const myVelX = this._velX;
            const myVelY = this._velY;
            const otherVelX = otherVC._velX || 0;
            const otherVelY = otherVC._velY || 0;

            // Relative velocity along collision normal (closing speed)
            const relVn = (myVelX - otherVelX) * nx + (myVelY - otherVelY) * ny;
            if (relVn >= 0) continue; // Moving apart, no collision

            // Set cooldown for this pair
            VehicleController._collisionCooldowns.set(pairKey, currentTime + collisionCooldownMs);

            // Get masses
            const myRb = this._getRigidbody();
            const myMass = myRb ? (myRb.mass || 1) : 1;
            
            let otherRb = otherObj._cachedRigidbody;
            if (otherRb === undefined) {
                otherRb = otherObj.getModule ? otherObj.getModule('Rigidbody') : null;
                otherObj._cachedRigidbody = otherRb || null;
            }
            const otherMass = otherRb ? (otherRb.mass || 1) : 1;

            // Simple elastic collision impulse
            const restitution = 0.5; // increased bounciness for better separation
            const totalMass = myMass + otherMass;
            const impulse = -(1 + restitution) * relVn / totalMass;

            // Apply impulse to BOTH vehicles (processed once per pair)
            this._velX += impulse * otherMass * nx;
            this._velY += impulse * otherMass * ny;
            otherVC._velX -= impulse * myMass * nx;
            otherVC._velY -= impulse * myMass * ny;

            // Separate both vehicles (increased separation)
            const separation = overlap.depth + 4;
            const myRatio = otherMass / totalMass;
            const otherRatio = myMass / totalMass;
            this.gameObject.position.x -= nx * separation * myRatio;
            this.gameObject.position.y -= ny * separation * myRatio;
            otherObj.position.x += nx * separation * otherRatio;
            otherObj.position.y += ny * separation * otherRatio;

            // Play crash sound (only once per collision)
            const impactSpeed = Math.abs(relVn);
            if (this.enableCrashSound && impactSpeed > this.crashMinSpeed) {
                this._playCrashSound(impactSpeed);
            }

            // Collision tire marks for both vehicles
            if (this.collisionTireMarks && this.tireMarkEnabled) {
                this._collisionHitTimer = this.collisionTireMarkDuration;
            }
            if (otherVC.collisionTireMarks && otherVC.tireMarkEnabled) {
                otherVC._collisionHitTimer = otherVC.collisionTireMarkDuration;
            }

            // Apply collision forward bias (this vehicle)
            if (this.collisionForwardBias > 0) {
                const angleRad = this.gameObject.angle * (Math.PI / 180);
                const fwdX = Math.cos(angleRad);
                const fwdY = Math.sin(angleRad);
                const rightX = -Math.sin(angleRad);
                const rightY = Math.cos(angleRad);

                const impVelX = impulse * otherMass * nx;
                const impVelY = impulse * otherMass * ny;
                const fwdComp = impVelX * fwdX + impVelY * fwdY;
                const latComp = impVelX * rightX + impVelY * rightY;

                const bias = this.collisionForwardBias;
                const adjustFwd = fwdComp * bias * 0.5;
                const adjustLat = -latComp * bias;

                this._velX += fwdX * adjustFwd + rightX * adjustLat;
                this._velY += fwdY * adjustFwd + rightY * adjustLat;
            }

            // Apply collision forward bias (other vehicle)
            if (otherVC.collisionForwardBias > 0) {
                const angleRad = otherObj.angle * (Math.PI / 180);
                const fwdX = Math.cos(angleRad);
                const fwdY = Math.sin(angleRad);
                const rightX = -Math.sin(angleRad);
                const rightY = Math.cos(angleRad);

                const impVelX = -impulse * myMass * nx;
                const impVelY = -impulse * myMass * ny;
                const fwdComp = impVelX * fwdX + impVelY * fwdY;
                const latComp = impVelX * rightX + impVelY * rightY;

                const bias = otherVC.collisionForwardBias;
                const adjustFwd = fwdComp * bias * 0.5;
                const adjustLat = -latComp * bias;

                otherVC._velX += fwdX * adjustFwd + rightX * adjustLat;
                otherVC._velY += fwdY * adjustFwd + rightY * adjustLat;
            }
        }
    }

    /**
     * Check AABB overlap between two bounds
     */
    _checkAABBOverlap(a, b) {
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX <= 0 || overlapY <= 0) return null;
        return {
            depth: Math.min(overlapX, overlapY),
            overlapX,
            overlapY
        };
    }

    /**
     * Web Worker path for simple vehicle-to-vehicle collisions.
     * Gathers all nearby vehicles into a flat data array, sends to worker,
     * and applies collision results. Uses async callback - results arrive
     * within the same frame via the worker's fast AABB+impulse math.
     * 
     * For the first frame (or if worker hasn't responded yet), uses
     * a double-buffer approach with 1-frame latency.
     */
    _handleSimpleVehicleCollisionsWorker(deltaTime) {
        const pos = this.gameObject.position;
        const myCollider = this._getCollider();
        if (!myCollider) return;

        const myBounds = myCollider.getBounds ? myCollider.getBounds() : null;
        if (!myBounds) return;

        const myRadius = Math.max(myBounds.width, myBounds.height) * 0.5;
        const searchRadius = myRadius * 3;

        // Find nearby objects
        let nearbyObjects;
        const engine = window.gameEngine;
        if (typeof instancesInRadius === 'function') {
            nearbyObjects = instancesInRadius(pos.x, pos.y, searchRadius);
        } else {
            if (!engine) return;
            nearbyObjects = engine.instances.filter(inst => {
                if (inst === this.gameObject) return false;
                const dx = inst.position.x - pos.x;
                const dy = inst.position.y - pos.y;
                return (dx * dx + dy * dy) <= searchRadius * searchRadius;
            });
        }

        // Build vehicle data array for worker
        const vehicles = [];
        const vehicleMap = new Map(); // index -> { vc, obj, rb }
        
        // Add self
        const myRb = this._getRigidbody();
        const myMass = myRb ? (myRb.mass || 1) : 1;
        vehicles.push({
            index: 0,
            posX: pos.x, posY: pos.y,
            velX: this._velX, velY: this._velY,
            mass: myMass,
            boundsLeft: myBounds.left, boundsRight: myBounds.right,
            boundsTop: myBounds.top, boundsBottom: myBounds.bottom
        });
        vehicleMap.set(0, { vc: this, obj: this.gameObject, rb: myRb });

        let idx = 1;
        for (const otherObj of nearbyObjects) {
            if (otherObj === this.gameObject) continue;

            let otherVC = otherObj._cachedVehicleController;
            if (otherVC === undefined) {
                otherVC = otherObj.getModule ? otherObj.getModule('VehicleController') : null;
                otherObj._cachedVehicleController = otherVC || null;
            }
            if (!otherVC) continue;

            let otherCollider = otherObj._cachedCollider;
            if (otherCollider === undefined) {
                if (otherObj.getModule) {
                    otherCollider = otherObj.getModule('BoxCollider') || 
                                   otherObj.getModule('SphereCollider') ||
                                   otherObj.getModule('PolygonCollider');
                }
                otherObj._cachedCollider = otherCollider || null;
            }
            if (!otherCollider) continue;

            const otherBounds = otherCollider.getBounds ? otherCollider.getBounds() : null;
            if (!otherBounds) continue;

            let otherRb = otherObj._cachedRigidbody;
            if (otherRb === undefined) {
                otherRb = otherObj.getModule ? otherObj.getModule('Rigidbody') : null;
                otherObj._cachedRigidbody = otherRb || null;
            }
            const otherMass = otherRb ? (otherRb.mass || 1) : 1;

            vehicles.push({
                index: idx,
                posX: otherObj.position.x, posY: otherObj.position.y,
                velX: otherVC._velX || 0, velY: otherVC._velY || 0,
                mass: otherMass,
                boundsLeft: otherBounds.left, boundsRight: otherBounds.right,
                boundsTop: otherBounds.top, boundsBottom: otherBounds.bottom
            });
            vehicleMap.set(idx, { vc: otherVC, obj: otherObj, rb: otherRb });
            idx++;
        }

        if (vehicles.length < 2) return; // Need at least 2 vehicles

        // Send to worker and apply results via callback
        CollisionWorkerManager.requestVehicleCollisionsAsync(vehicles, (collisionPairs) => {
            if (!collisionPairs || collisionPairs.length === 0) return;

            for (const pair of collisionPairs) {
                const v1 = vehicleMap.get(pair.i);
                const v2 = vehicleMap.get(pair.j);
                if (!v1 || !v2) continue;

                const restitution = 0.5;
                const totalMass = v1.rb ? (v1.rb.mass || 1) : 1;
                const otherMass = v2.rb ? (v2.rb.mass || 1) : 1;
                const totalM = totalMass + otherMass;
                const impulse = -(1 + restitution) * pair.relVn / totalM;

                // Apply impulse to both vehicles
                v1.vc._velX += impulse * otherMass * pair.nx;
                v1.vc._velY += impulse * otherMass * pair.ny;
                v2.vc._velX -= impulse * totalMass * pair.nx;
                v2.vc._velY -= impulse * totalMass * pair.ny;

                // Separate both
                const separation = pair.depth + 4;
                const ratio1 = otherMass / totalM;
                const ratio2 = totalMass / totalM;
                v1.obj.position.x -= pair.nx * separation * ratio1;
                v1.obj.position.y -= pair.ny * separation * ratio1;
                v2.obj.position.x += pair.nx * separation * ratio2;
                v2.obj.position.y += pair.ny * separation * ratio2;

                // Crash sound
                const impactSpeed = Math.abs(pair.relVn);
                if (v1.vc.enableCrashSound && impactSpeed > v1.vc.crashMinSpeed) {
                    v1.vc._playCrashSound(impactSpeed);
                }

                // Collision tire marks
                if (v1.vc.collisionTireMarks && v1.vc.tireMarkEnabled) {
                    v1.vc._collisionHitTimer = v1.vc.collisionTireMarkDuration;
                }
                if (v2.vc.collisionTireMarks && v2.vc.tireMarkEnabled) {
                    v2.vc._collisionHitTimer = v2.vc.collisionTireMarkDuration;
                }

                // Forward bias for v1
                if (v1.vc.collisionForwardBias > 0) {
                    const angleRad = v1.obj.angle * (Math.PI / 180);
                    const fwdX = Math.cos(angleRad), fwdY = Math.sin(angleRad);
                    const rightX = -Math.sin(angleRad), rightY = Math.cos(angleRad);
                    const impVelX = impulse * otherMass * pair.nx;
                    const impVelY = impulse * otherMass * pair.ny;
                    const fwdComp = impVelX * fwdX + impVelY * fwdY;
                    const latComp = impVelX * rightX + impVelY * rightY;
                    const bias = v1.vc.collisionForwardBias;
                    v1.vc._velX += fwdX * (fwdComp * bias * 0.5) + rightX * (-latComp * bias);
                    v1.vc._velY += fwdY * (fwdComp * bias * 0.5) + rightY * (-latComp * bias);
                }

                // Forward bias for v2
                if (v2.vc.collisionForwardBias > 0) {
                    const angleRad = v2.obj.angle * (Math.PI / 180);
                    const fwdX = Math.cos(angleRad), fwdY = Math.sin(angleRad);
                    const rightX = -Math.sin(angleRad), rightY = Math.cos(angleRad);
                    const impVelX = -impulse * totalMass * pair.nx;
                    const impVelY = -impulse * totalMass * pair.ny;
                    const fwdComp = impVelX * fwdX + impVelY * fwdY;
                    const latComp = impVelX * rightX + impVelY * rightY;
                    const bias = v2.vc.collisionForwardBias;
                    v2.vc._velX += fwdX * (fwdComp * bias * 0.5) + rightX * (-latComp * bias);
                    v2.vc._velY += fwdY * (fwdComp * bias * 0.5) + rightY * (-latComp * bias);
                }
            }
        });
    }

    /**
     * Get this vehicle's collider (cached)
     */
    _getCollider() {
        if (this._collider !== undefined) return this._collider;
        if (this.gameObject && this.gameObject.getModule) {
            this._collider = this.gameObject.getModule('BoxCollider') || 
                            this.gameObject.getModule('SphereCollider') ||
                            this.gameObject.getModule('PolygonCollider');
        }
        return this._collider || null;
    }

    /**
     * Rigidbody collision mode - syncs with Rigidbody collision system
     */
    _handleRigidbodyCollisions(deltaTime) {
        const rb = this._getRigidbody();
        if (!rb) return;

        const prevVelX = this._velX;
        const prevVelY = this._velY;

        this._velX = rb.velocityX;
        this._velY = rb.velocityY;

        // Detect collision impulse from Rigidbody via velocity delta
        const dvx = this._velX - prevVelX;
        const dvy = this._velY - prevVelY;
        let collisionMagSq = dvx * dvx + dvy * dvy;

        // ── TIMING FIX: Also check rb.currentCollisions for vehicle-to-vehicle collisions ──
        // Due to collision resolution ordering (only higher-ID rigidbody resolves), the 
        // lower-ID vehicle's VehicleController may run BEFORE the collision impulse is applied.
        // Check currentCollisions to ensure both vehicles respond in the SAME frame.
        let collisionFromCurrentFrame = false;
        let collidingVehicleId = null;
        
        if (rb.currentCollisions && rb.currentCollisions.length > 0) {
            for (const col of rb.currentCollisions) {
                if (col.type !== 'solid' || !col.object) continue;
                // Use cached vehicleController from collision record if available
                const otherVehicle = col.vehicleController !== undefined 
                    ? col.vehicleController 
                    : (col.object.getModule ? col.object.getModule('VehicleController') : null);
                const otherRb = col.rigidbody !== undefined
                    ? col.rigidbody
                    : (col.object.getModule ? col.object.getModule('Rigidbody') : null);
                if (otherVehicle && otherRb && !otherRb.isKinematic) {
                    // Get collision pair key for cooldown check
                    if (this._vehicleCollisionId === undefined) {
                        VehicleController._nextCollisionId = (VehicleController._nextCollisionId || 0) + 1;
                        this._vehicleCollisionId = VehicleController._nextCollisionId;
                    }
                    if (otherVehicle._vehicleCollisionId === undefined) {
                        VehicleController._nextCollisionId = (VehicleController._nextCollisionId || 0) + 1;
                        otherVehicle._vehicleCollisionId = VehicleController._nextCollisionId;
                    }
                    
                    const myId = this._vehicleCollisionId;
                    const otherId = otherVehicle._vehicleCollisionId;
                    collidingVehicleId = myId < otherId ? `${myId}_${otherId}` : `${otherId}_${myId}`;
                    
                    // Check cooldown - skip full collision processing if on cooldown
                    if (!VehicleController._collisionCooldowns) {
                        VehicleController._collisionCooldowns = new Map();
                    }
                    const currentTime = performance.now();
                    const cooldownExpire = VehicleController._collisionCooldowns.get(collidingVehicleId);
                    if (cooldownExpire && currentTime < cooldownExpire) {
                        // On cooldown - skip collision effects but keep syncing velocity
                        continue;
                    }
                    
                    collisionFromCurrentFrame = true;
                    // If velocity delta didn't catch it (due to timing), estimate impulse from collision data
                    if (collisionMagSq <= 1) {
                        // Calculate relative velocity at collision
                        const relVx = this._velX - otherRb.velocityX;
                        const relVy = this._velY - otherRb.velocityY;
                        const relSpeedSq = relVx * relVx + relVy * relVy;
                        // Use relative speed as proxy for collision intensity
                        collisionMagSq = relSpeedSq * 0.1; // Scale down to match impulse magnitude
                    }
                    break;
                }
            }
        }

        if (collisionMagSq > 1 || collisionFromCurrentFrame) {
            // Set cooldown for this vehicle pair to prevent effects spam
            if (collidingVehicleId) {
                const currentTime = performance.now();
                const collisionCooldownMs = 150; // ms before same pair triggers effects again
                VehicleController._collisionCooldowns.set(collidingVehicleId, currentTime + collisionCooldownMs);
            }
            
            // ── Play crash sound based on collision intensity ──
            if (this.enableCrashSound && collisionMagSq > 1) {
                // Check if VehicleControllerRenderer is on cooldown (prevents sound spam)
                const vehicleRenderer = this.gameObject.getModule ? this.gameObject.getModule('VehicleControllerRenderer') : null;
                const onCooldown = vehicleRenderer && typeof vehicleRenderer.isDamageOnCooldown === 'function' 
                    ? vehicleRenderer.isDamageOnCooldown() 
                    : false;
                
                if (!onCooldown) {
                    // Convert collision magnitude to approximate speed
                    const impactSpeed = Math.sqrt(collisionMagSq) * 10;
                    this._playCrashSound(impactSpeed);
                }
            }

            // ── Collision forward bias: cars roll forward more than sideways ──
            if (this.collisionForwardBias > 0 && collisionMagSq > 1) {
                const angleRad = this.gameObject.angle * (Math.PI / 180);
                const fwdX = Math.cos(angleRad);
                const fwdY = Math.sin(angleRad);
                const rightX = -Math.sin(angleRad);
                const rightY = Math.cos(angleRad);

                // Project collision impulse onto vehicle axes
                const fwdComp = dvx * fwdX + dvy * fwdY;
                const latComp = dvx * rightX + dvy * rightY;

                const bias = this.collisionForwardBias;
                // Boost forward component, reduce lateral — simulates free-rolling wheels
                const newFwd = fwdComp * (1 + bias * 0.5);
                const newLat = latComp * (1 - bias);

                // Reconstruct biased velocity
                this._velX = prevVelX + fwdX * newFwd + rightX * newLat;
                this._velY = prevVelY + fwdY * newFwd + rightY * newLat;
            }

            // ── Collision tire marks: start drawing all 4 tires ──
            if (this.collisionTireMarks && this.tireMarkEnabled) {
                this._collisionHitTimer = this.collisionTireMarkDuration;
            }

            // ── Stationary friction: parked vehicles resist being pushed ──
            if (this.stationaryFriction > 0) {
                const preSpeed = Math.sqrt(prevVelX * prevVelX + prevVelY * prevVelY);
                const threshold = 20; // speed below which stationary friction kicks in
                if (preSpeed < threshold) {
                    // stillness: 1.0 when fully stopped, 0.0 at threshold speed
                    const stillness = 1.0 - Math.min(preSpeed / threshold, 1.0);
                    const dampFactor = Math.max(0.05, 1.0 - stillness * this.stationaryFriction);
                    const postDvx = this._velX - prevVelX;
                    const postDvy = this._velY - prevVelY;
                    this._velX = prevVelX + postDvx * dampFactor;
                    this._velY = prevVelY + postDvy * dampFactor;
                }
            }

            // ── Rolling collision energy loss ──
            // Vehicles with no active player input lose momentum on impact
            // Non-player-controlled vehicles always lose momentum on collision
            if (this.collisionMomentumLoss > 0) {
                const noInput = !this.playerControlled || (this._throttle === 0 && this._brakeInput === 0 && Math.abs(this._steerInput) < 0.01);
                if (noInput) {
                    const lossFactor = Math.max(0, 1.0 - this.collisionMomentumLoss);
                    this._velX *= lossFactor;
                    this._velY *= lossFactor;
                }
            }
        }

        // ── Mass-based collision with MovementController2D ──
        // If a lighter player collides with this vehicle, push the player instead
        if (rb.currentCollisions) {
            this._handlePlayerVehicleCollision(rb, prevVelX, prevVelY, deltaTime);
        }
    }

    // ════════════════════════════════════════════════════
    //  INPUT
    // ════════════════════════════════════════════════════

    _readInput() {
        this._throttle = 0;
        this._brakeInput = 0;
        this._steerInput = 0;
        this._handbrakeInput = false;
        this._clutchInput = false;
        let boostInput = false;
        let shiftUpInput = false;
        let shiftDownInput = false;

        // Keyboard
        if (typeof keyboardDown === 'function') {
            if (keyboardDown(this.keyAccelerate)) this._throttle = 1;
            if (keyboardDown(this.keyBrake)) this._brakeInput = 1;
            if (keyboardDown(this.keySteerLeft)) this._steerInput -= 1;
            if (keyboardDown(this.keySteerRight)) this._steerInput += 1;
            if (keyboardDown(this.keyHandbrake)) this._handbrakeInput = true;
            if (this.clutchEnabled && keyboardDown(this.keyClutch)) this._clutchInput = true;
            if (keyboardDown(this.keyBoost)) boostInput = true;
        }
        if (typeof keyboardPressed === 'function') {
            if (keyboardPressed(this.keyShiftUp)) shiftUpInput = true;
            if (keyboardPressed(this.keyShiftDown)) shiftDownInput = true;
        }

        // Gamepad
        if (this.useGamepad && typeof gamepadAxis === 'function') {
            const steerAxis = gamepadAxis(this.gamepadSteerAxis, this.gamepadIndex);
            if (Math.abs(steerAxis) > 0.15) this._steerInput = steerAxis;

            // Triggers as axes (RT / LT) — some gamepads report these as axes 6/7
            const accelVal = gamepadAxis(this.gamepadAccelAxis, this.gamepadIndex);
            if (accelVal > 0.1) this._throttle = Math.max(this._throttle, accelVal);
            const brakeVal = gamepadAxis(this.gamepadBrakeAxis, this.gamepadIndex);
            if (brakeVal > 0.1) this._brakeInput = Math.max(this._brakeInput, brakeVal);

            if (typeof gamepadButtonDown === 'function') {
                if (gamepadButtonDown(this.gamepadHandbrakeBtn, this.gamepadIndex)) this._handbrakeInput = true;
                if (gamepadButtonDown(this.gamepadBoostBtn, this.gamepadIndex)) boostInput = true;
                // Gamepad clutch on button 4 (LB) by default
                if (this.clutchEnabled && gamepadButtonDown(4, this.gamepadIndex)) this._clutchInput = true;
            }
        }

        this._boostInput = boostInput;
        this._shiftUpInput = shiftUpInput;
        this._shiftDownInput = shiftDownInput;

        // Clamp steer
        this._steerInput = Math.max(-1, Math.min(1, this._steerInput));
    }

    // ════════════════════════════════════════════════════
    //  TRANSMISSION & RPM
    // ════════════════════════════════════════════════════

    /**
     * Convert km/h to px/s (internal speed unit)
     * Based on _convertSpeed: 1 px/s ≈ 0.36 km/h, so 1 km/h ≈ 2.778 px/s
     */
    _kmhToPxs(kmh) {
        return kmh / 0.36;
    }

    /**
     * Convert HP to internal force units.
     * Uses a physically-inspired model:
     *   Force = HP × 745.7 / referenceSpeed
     * Scaled to game world so that realistic HP values (150-500) produce
     * believable acceleration/traction behavior.
     * 
     * @param {number} hp - Horsepower
     * @returns {number} Force in internal game units
     */
    _hpToForce(hp) {
        // HP_TO_FORCE_SCALE: tuned so 300hp ≈ 900 old-units (backward compatible feel)
        // This means existing presets with enginePower 900 at 300hp behave similarly
        const HP_TO_FORCE_SCALE = 3.0;
        return hp * HP_TO_FORCE_SCALE;
    }

    /**
     * Calculate maximum traction force the tyres can handle.
     * Based on: F_grip = weight(N) × tyreGrip × µ
     * If engine force exceeds this, wheels spin and lose grip.
     * 
     * @returns {number} Maximum force before traction loss
     */
    /**
     * Calculate the HP traction capacity of the tyres.
     * Returns the maximum HP the tyres can put down before losing traction.
     * Independent of gear mode — uses HP directly so both ratio and maxSpeed
     * modes behave consistently.
     *
     * Formula: (weight_tonnes) × tyreGrip × rearGrip × 250
     * e.g. 1400 kg, grip 1.0, rear 1.0 → 350 HP capacity
     */
    _getTractionCapacityHP() {
        const weightTonnes = this.vehicleWeightKg / 1000;
        const tyreGrip = this.tyreGripRating || 1.0;
        const rearBias = this.rearGrip;
        return weightTonnes * tyreGrip * rearBias * 250;
    }

    /**
     * Get the max speed for a gear in px/s
     * In maxSpeed mode: uses gearMaxSpeeds array (km/h converted to px/s)
     * In ratio mode: calculates from gear ratios relative to top speed
     */
    _getGearMaxSpeed(gear) {
        const scale = this.physicsScale;
        
        if (gear === -1) {
            // Reverse gear — both modes use km/h now
            if (this.gearConfigMode === 'maxSpeed') {
                return this._kmhToPxs(this.reverseMaxSpeed) * scale;
            }
            // ratio mode: reverseTopSpeed is now km/h too
            return this._kmhToPxs(this.reverseTopSpeed) * scale;
        }
        if (gear <= 0) return 0;
        
        if (this.gearConfigMode === 'maxSpeed') {
            // Direct max speed mode: use gearMaxSpeeds array (km/h)
            const idx = gear - 1;
            if (idx >= 0 && idx < this.gearMaxSpeeds.length) {
                return this._kmhToPxs(this.gearMaxSpeeds[idx]) * scale;
            }
            // Fallback: topSpeed is km/h
            return this._kmhToPxs(this.topSpeed) * scale;
        } else {
            // Ratio mode: topSpeed is now km/h, calculate gear max from ratios
            const lowestRatio = Math.min(...this.gearRatios);
            const currentRatio = this._getGearRatio(gear);
            return this._kmhToPxs(this.topSpeed) * scale * (lowestRatio / Math.max(0.1, currentRatio));
        }
    }

    _getGearRatio(gear) {
        if (gear === -1) return this.reverseGearRatio;
        if (gear === 0) return 0; // neutral
        const idx = gear - 1;
        if (idx >= 0 && idx < this.gearRatios.length) return this.gearRatios[idx];
        return 1.0;
    }

    _updateTransmission(dt) {
        // ═══════════════════════════════════════════════════════════════════
        // CLUTCH DUMP DETECTION
        // Check if clutch was just released at high RPM for wheelspin effect
        // ═══════════════════════════════════════════════════════════════════
        if (this.clutchEnabled) {
            // Update clutch dump timer
            if (this._clutchDumpTimer > 0) {
                this._clutchDumpTimer -= dt;
            }

            // Detect clutch release (was held, now released)
            if (this._clutchWasHeld && !this._clutchInput) {
                const rpmRatio = this._currentRPM / this.maxRPM;
                
                // Check if releasing clutch at high RPM with powerful engine
                if (rpmRatio >= this.clutchHighRPMThreshold && 
                    this.enginePower >= this.clutchLaunchPowerThreshold &&
                    this._throttle > 0.5) {
                    // Trigger clutch dump wheelspin!
                    // Duration scales with RPM and power - more power/higher RPM = longer wheelspin
                    const powerFactor = Math.min(2.0, this.enginePower / this.clutchLaunchPowerThreshold);
                    const rpmFactor = (rpmRatio - this.clutchHighRPMThreshold) / (1.0 - this.clutchHighRPMThreshold);
                    this._clutchDumpTimer = this.clutchDumpDuration * powerFactor * (0.5 + rpmFactor * 0.5);
                    this._clutchDumpRPM = this._currentRPM;
                    
                    // Trigger drift if enabled - high power clutch dump kicks the rear out
                    if (this.clutchDumpDrift && this.driftEnabled && this._currentSpeed > 5) {
                        this._isDrifting = true;
                    }
                }
            }
            this._clutchWasHeld = this._clutchInput;

            // ═══════════════════════════════════════════════════════════════
            // REV LIMITER BOUNCE
            // When holding clutch at redline, bounce the revs down like a real car
            // ═══════════════════════════════════════════════════════════════
            if (this._revLimiterBounceTimer > 0) {
                this._revLimiterBounceTimer -= dt;
                if (this._revLimiterBounceTimer <= 0) {
                    // Bounce complete, reset direction
                    this._revLimiterBounceDirection = 0;
                }
            }
        }

        // Shift timer
        if (this._isShifting) {
            this._shiftTimer -= dt;
            if (this._shiftTimer <= 0) {
                this._isShifting = false;
                // RPM has been smoothly interpolated during shift — just clamp to valid range
                this._currentRPM = Math.max(this.idleRPM, Math.min(this.maxRPM, this._currentRPM));
            }
        }

        const speed = this._currentSpeed;
        const absSpeed = Math.abs(speed);

        // ═══════════════════════════════════════════════════════════════════
        // DIRECT RPM CONTROL via fullThrottleRevTime
        // Time to rev from shiftDownRPM to shiftUpRPM per gear at full throttle
        // ═══════════════════════════════════════════════════════════════════
        
        // The usable rev range per gear (from post-shift drop to next shift point)
        const gearRPMRange = this.shiftUpRPM - this.shiftDownRPM;
        const revTimeSeconds = Math.max(0.5, this.fullThrottleRevTime);
        const rpmPerSecond = gearRPMRange / revTimeSeconds; // RPM/s at full throttle in each gear

        // ═══════════════════════════════════════════════════════════════════
        // CLUTCH HELD: Free revving - engine disconnected from drivetrain
        // RPM rises based on throttle, independent of vehicle speed
        // ═══════════════════════════════════════════════════════════════════
        if (this.clutchEnabled && this._clutchInput && this._throttle > 0.1 && !this._isShifting) {
            // Clutch is in: engine revs freely (faster than normal, no load)
            const freeRevRate = rpmPerSecond * 1.8 * this._throttle * dt; // 1.8x faster - no drivetrain load
            
            // Check if we're bouncing from rev limiter
            if (this._revLimiterBounceDirection === -1) {
                // Currently bouncing down
                const bounceDropRate = rpmPerSecond * 4.0 * dt; // Fast drop
                this._currentRPM -= bounceDropRate;
                
                // Calculate bounce target (how far to drop)
                const bounceTarget = this.maxRPM * (1.0 - this.clutchRevBounceAmount);
                if (this._currentRPM <= bounceTarget) {
                    this._currentRPM = bounceTarget;
                    this._revLimiterBounceDirection = 0; // Stop bouncing, let it rev back up
                }
            } else {
                // Normal revving toward redline
                this._currentRPM += freeRevRate;
                
                // Hit rev limiter - trigger bounce
                if (this._currentRPM >= this.redlineRPM) {
                    this._currentRPM = this.redlineRPM;
                    this._revLimiterBounceTimer = this.clutchRevBounceDuration;
                    this._revLimiterBounceDirection = -1; // Start bouncing down
                }
            }
            
            // Ensure RPM stays in valid range
            this._currentRPM = Math.max(this.idleRPM, Math.min(this.maxRPM, this._currentRPM));
        } else {
            // Normal RPM control (no clutch held)
            // Reset rev limiter bounce if clutch released
            if (this._revLimiterBounceDirection !== 0 && !this._clutchInput) {
                this._revLimiterBounceDirection = 0;
                this._revLimiterBounceTimer = 0;
            }
            
            // Target RPM depends on throttle input
            // Full throttle aims for redline, no throttle drops toward idle
            let targetRPM;
            if (this._throttle > 0.1) {
                // When on gas, aim for shiftUpRPM (will trigger shift when reached)
                targetRPM = this.shiftUpRPM;
            } else {
                // Off throttle: RPM falls toward idle
                targetRPM = this.idleRPM;
            }
            
            // ═══════════════════════════════════════════════════════════════
            // MANUAL BOGGING RPM SUPPRESSION
            // When in manual mode in a too-high gear for current speed,
            // the engine lugs — RPM can't climb freely. The target RPM is
            // suppressed proportional to how badly the engine is bogging.
            // This gives audio/visual feedback that the player is in the
            // wrong gear and needs to downshift.
            // ═══════════════════════════════════════════════════════════════
            if (this.transmissionType === 'manual' && this._currentGear > 1 && this._throttle > 0.1) {
                const bogSpeed = Math.abs(this._currentSpeed);
                const bogPrevMax = this._getGearMaxSpeed(this._currentGear - 1);
                const bogThreshold = this.gearConfigMode === 'maxSpeed'
                    ? bogPrevMax
                    : bogPrevMax * 0.5;
                if (bogPrevMax > 0 && bogSpeed < bogThreshold) {
                    const bogSpeedRatio = bogSpeed / bogThreshold;
                    const bogGearDiff = this._currentGear - 1;
                    const bogExponent = 0.8 + bogGearDiff * 0.6;
                    const rpmRecovery = Math.pow(Math.max(0, bogSpeedRatio), bogExponent);
                    const lugRPM = this.idleRPM + (this.shiftDownRPM - this.idleRPM) * 0.4;
                    targetRPM = lugRPM + (targetRPM - lugRPM) * rpmRecovery;
                }
            }
            
            // RPM change rate based on throttle
            const revRate = rpmPerSecond * Math.max(0.15, this._throttle) * dt;
            
            // Move current RPM toward target (but don't instantly jump)
            if (!this._isShifting) {
                if (this._currentRPM < targetRPM) {
                    this._currentRPM = Math.min(targetRPM, this._currentRPM + revRate);
                } else {
                    // RPM drops faster when off-throttle
                    const dropRate = rpmPerSecond * 1.2 * dt;
                    this._currentRPM = Math.max(targetRPM, this._currentRPM - dropRate);
                }
            }
            
            // Clamp final RPM  
            this._currentRPM = Math.max(this.idleRPM, Math.min(this.maxRPM, this._currentRPM));
        }

        // During shift, smoothly interpolate RPM from pre-shift value to post-shift value
        // This prevents the double-rev bug caused by the old cumulative dip approach
        if (this._isShifting && this._actualShiftDuration > 0) {
            const shiftProgress = Math.max(0, Math.min(1, 1 - (this._shiftTimer / this._actualShiftDuration)));
            const postShiftRPM = this._calculatePostShiftRPM();
            // Ease-out interpolation: quick initial RPM drop, then smooth settle into new gear
            const eased = 1 - Math.pow(1 - shiftProgress, 2);
            this._currentRPM = this._preShiftRPM + (postShiftRPM - this._preShiftRPM) * eased;
            this._currentRPM = Math.max(this.idleRPM, Math.min(this.maxRPM, this._currentRPM));
        }

        if (this.transmissionType === 'cvt') {
            // CVT: smooth ratio, always optimal RPM
            this._currentGear = 1;
            return;
        }

        // Don't auto-shift while clutch is held
        if (this.clutchEnabled && this._clutchInput) {
            return;
        }

        // Automatic shifting
        if (this.transmissionType === 'automatic' && !this._isShifting) {
            // Reverse logic
            if (this._brakeInput > 0 && speed <= 5 && this._throttle === 0) {
                if (this._currentGear !== -1) {
                    const oldGear = this._currentGear;
                    this._currentGear = -1;
                    this._triggerShift(oldGear);
                }
                return;
            }
            if (this._throttle > 0 && this._currentGear === -1) {
                const oldGear = this._currentGear;
                this._currentGear = 1;
                this._triggerShift(oldGear);
                return;
            }

            // ═══════════════════════════════════════════════════════════════
            // DRIFT-AWARE GEAR LOGIC
            // While drifting, avoid gear hunting from throttle tapping, but still
            // downshift based on speed in maxSpeed mode so the engine doesn't
            // scream at high RPM while moving slowly.
            // ═══════════════════════════════════════════════════════════════
            if (this._isDrifting && this._currentGear > 0) {
                // In maxSpeed mode: still downshift based on actual speed during drift
                // This prevents the engine screaming at redline while crawling
                if (this.gearConfigMode === 'maxSpeed' && this._currentGear > 1) {
                    const prevGearMax = this._getGearMaxSpeed(this._currentGear - 1);
                    // If speed dropped significantly below current gear's range, downshift
                    if (absSpeed < prevGearMax * 0.85) {
                        // Find appropriate gear for current speed
                        let appropriateGear = 1;
                        for (let g = this.gearCount; g >= 1; g--) {
                            const gMax = this._getGearMaxSpeed(g);
                            const gMin = g > 1 ? this._getGearMaxSpeed(g - 1) * 0.85 : 0;
                            if (absSpeed <= gMax && absSpeed >= gMin) {
                                appropriateGear = g;
                                break;
                            }
                            if (absSpeed < gMin) {
                                appropriateGear = Math.max(1, g - 1);
                            }
                        }
                        if (appropriateGear < this._currentGear) {
                            const oldGear = this._currentGear;
                            this._currentGear = appropriateGear;
                            this._triggerShift(oldGear);
                            return;
                        }
                    }
                }
                
                // ── Ratio mode drift: speed-based downshift ──
                // Even while drifting, downshift if speed has dropped below gear range
                if (this.gearConfigMode !== 'maxSpeed' && this._currentGear > 1) {
                    const prevGearMax = this._getGearMaxSpeed(this._currentGear - 1);
                    if (absSpeed < prevGearMax * 0.8) {
                        let appropriateGear = 1;
                        for (let g = this.gearCount; g >= 1; g--) {
                            const gMax = this._getGearMaxSpeed(g);
                            const gMin = g > 1 ? this._getGearMaxSpeed(g - 1) * 0.8 : 0;
                            if (absSpeed <= gMax && absSpeed >= gMin) {
                                appropriateGear = g;
                                break;
                            }
                            if (absSpeed < gMin) {
                                appropriateGear = Math.max(1, g - 1);
                            }
                        }
                        if (appropriateGear < this._currentGear) {
                            const oldGear = this._currentGear;
                            this._currentGear = appropriateGear;
                            this._triggerShift(oldGear);
                            return;
                        }
                    }
                }

                // RPM thresholds: Only downshift if RPM is critically low (near stall)
                if (this._currentGear > 1 && this._currentRPM <= this.idleRPM * 1.3) {
                    const oldGear = this._currentGear;
                    this._currentGear--;
                    this._triggerShift(oldGear);
                }
                // Only upshift if sustained at redline (engine is screaming)
                else if (this._currentGear < this.gearCount && this._currentRPM >= this.redlineRPM) {
                    const oldGear = this._currentGear;
                    this._currentGear++;
                    this._triggerShift(oldGear);
                }
                return; // Skip normal shift logic while drifting
            }

            // ═══════════════════════════════════════════════════════════════
            // SPEED-BASED GEAR MATCHING (maxSpeed mode)
            // Gears shift based on actual speed vs gear max speeds.
            // Upshift when approaching current gear's max speed.
            // Downshift when speed drops below current gear's effective range.
            // This ensures gears always match the vehicle's actual speed.
            // ═══════════════════════════════════════════════════════════════
            if (this.gearConfigMode === 'maxSpeed' && this._currentGear > 0) {
                const currentGearMax = this._getGearMaxSpeed(this._currentGear);
                
                // UPSHIFT: Speed approaching current gear's max (95% threshold)
                if (this._currentGear < this.gearCount && absSpeed >= currentGearMax * 0.95) {
                    const oldGear = this._currentGear;
                    this._currentGear++;
                    this._triggerShift(oldGear);
                    return;
                }
                
                // DOWNSHIFT: Speed dropped below current gear's useful range
                // Find the appropriate gear for current speed
                if (this._currentGear > 1) {
                    // Get the minimum speed for current gear (previous gear's max)
                    const prevGearMax = this._getGearMaxSpeed(this._currentGear - 1);
                    
                    // If speed is below 90% of previous gear's max, we should be in a lower gear
                    if (absSpeed < prevGearMax * 0.9) {
                        // Find the correct gear for current speed
                        let appropriateGear = 1;
                        for (let g = this.gearCount; g >= 1; g--) {
                            const gMax = this._getGearMaxSpeed(g);
                            const gMin = g > 1 ? this._getGearMaxSpeed(g - 1) * 0.9 : 0;
                            // This gear is appropriate if speed is within its range
                            if (absSpeed <= gMax && absSpeed >= gMin) {
                                appropriateGear = g;
                                break;
                            }
                            // If speed is below this gear's min, try lower gear
                            if (absSpeed < gMin) {
                                appropriateGear = Math.max(1, g - 1);
                            }
                        }
                        
                        if (appropriateGear < this._currentGear) {
                            const oldGear = this._currentGear;
                            this._currentGear = appropriateGear;
                            this._triggerShift(oldGear);
                            return;
                        }
                    }
                }
            }

            // RATIO MODE & FALLBACK: RPM + speed-based shifting
            if (this.gearConfigMode !== 'maxSpeed') {
                // ── Speed-based downshift FIRST (priority over RPM) ──
                // When speed drops (braking, coasting, etc.), jump directly to
                // the correct gear for current speed. This prevents the car from
                // sitting in a high gear at low speed waiting for sequential
                // RPM-based downshifts one at a time.
                let speedShifted = false;
                if (this._currentGear > 1) {
                    const prevGearMax = this._getGearMaxSpeed(this._currentGear - 1);
                    if (absSpeed < prevGearMax * 0.85) {
                        // Find the correct gear for current speed
                        let appropriateGear = 1;
                        for (let g = this.gearCount; g >= 1; g--) {
                            const gMax = this._getGearMaxSpeed(g);
                            const gMin = g > 1 ? this._getGearMaxSpeed(g - 1) * 0.85 : 0;
                            if (absSpeed <= gMax && absSpeed >= gMin) {
                                appropriateGear = g;
                                break;
                            }
                            if (absSpeed < gMin) {
                                appropriateGear = Math.max(1, g - 1);
                            }
                        }
                        if (appropriateGear < this._currentGear) {
                            const oldGear = this._currentGear;
                            this._currentGear = appropriateGear;
                            this._triggerShift(oldGear);
                            speedShifted = true;
                        }
                    }
                }

                if (!speedShifted) {
                    // Upshift on RPM
                    if (this._currentGear > 0 && this._currentGear < this.gearCount && this._currentRPM >= this.shiftUpRPM) {
                        const oldGear = this._currentGear;
                        this._currentGear++;
                        this._triggerShift(oldGear);
                    }
                    // RPM-based downshift (single step, for normal deceleration)
                    else if (this._currentGear > 1 && this._currentRPM <= this.shiftDownRPM) {
                        const oldGear = this._currentGear;
                        this._currentGear--;
                        this._triggerShift(oldGear);
                    }
                }
            }
        }

        // Manual shifting
        if (this.transmissionType === 'manual' && !this._isShifting) {
            if (this._shiftUpInput && this._currentGear < this.gearCount) {
                const oldGear = this._currentGear;
                this._currentGear++;
                this._triggerShift(oldGear);
            }
            if (this._shiftDownInput) {
                if (this._currentGear > 1) {
                    const oldGear = this._currentGear;
                    this._currentGear--;
                    this._triggerShift(oldGear);
                } else if (this._currentGear === 1 && speed <= 5) {
                    const oldGear = this._currentGear;
                    this._currentGear = -1;
                    this._triggerShift(oldGear);
                }
            }
        }
    }

    _triggerShift(fromGear) {
        this._isShifting = true;
        this._preShiftRPM = this._currentRPM;
        this._fromGear = fromGear !== undefined ? fromGear : this._currentGear;
        // Progressive shift time: higher gears take longer to shift into
        // Gear 1→2: shiftTime, Gear 2→3: shiftTime + shiftTimePerGear, etc.
        const targetGear = Math.max(1, this._currentGear);
        const progressiveTime = this.shiftTime + (targetGear - 1) * this.shiftTimePerGear;
        this._shiftTimer = progressiveTime;
        this._actualShiftDuration = progressiveTime;
        if (this.shiftSound && typeof audioPlay === 'function') {
            const _svol = this._computeSpatialVolume();
            if (_svol > 0.01) audioPlay(this.shiftSound, false, _svol);
        }
    }

    /**
     * Calculate the RPM the engine should settle at after a gear shift completes.
     * Uses the ratio of gear max speeds (maxSpeed mode) or gear ratios (ratio mode)
     * to determine the proportional RPM drop/rise in the new gear.
     */
    _calculatePostShiftRPM() {
        if (this._currentGear <= 0) return this.idleRPM;

        const fromGear = this._fromGear || this._currentGear;

        if (this.gearConfigMode === 'maxSpeed') {
            // Effective ratio ∝ 1/gearMaxSpeed
            // RPM_new = RPM_old × (oldGearMaxSpeed / newGearMaxSpeed)
            const oldGearMaxSpd = this._getGearMaxSpeed(Math.max(1, Math.min(this.gearCount, fromGear)));
            const newGearMaxSpd = this._getGearMaxSpeed(this._currentGear);
            if (oldGearMaxSpd > 0 && newGearMaxSpd > 0) {
                return Math.max(this.idleRPM, Math.min(this.maxRPM,
                    this._preShiftRPM * (oldGearMaxSpd / newGearMaxSpd)));
            }
        } else {
            // Ratio mode: RPM ∝ speed × gearRatio
            // RPM_new = RPM_old × (newRatio / oldRatio)
            const oldRatio = this._getGearRatio(Math.max(1, Math.min(this.gearCount, fromGear)));
            const newRatio = this._getGearRatio(this._currentGear);
            if (oldRatio > 0 && newRatio > 0) {
                return Math.max(this.idleRPM, Math.min(this.maxRPM,
                    this._preShiftRPM * (newRatio / oldRatio)));
            }
        }
        return this.shiftDownRPM;
    }

    // ════════════════════════════════════════════════════
    //  STEERING
    // ════════════════════════════════════════════════════

    _updateSteering(dt) {
        const steer = this._steerInput;
        let targetSteer = steer;

        // Speed-sensitive steering (use topSpeed as km/h → px/s)
        if (this.speedSensitiveSteering) {
            const topSpeedPxs = this._kmhToPxs(this.topSpeed) * this.physicsScale;
            const speedRatio = Math.min(Math.abs(this._currentSpeed) / topSpeedPxs, 1);
            const steerMult = 1.0 - speedRatio * (1.0 - this.minSteerAtSpeed);
            targetSteer *= steerMult;
        }

        // Drift steer boost
        if (this._isDrifting) {
            targetSteer *= this.driftSteerMultiplier;
        }

        // Determine effective steer speed
        let effectiveSteerSpeed = this.steerSpeed;
        // Counter-steer detection: input opposes current steer direction
        if (this._currentSteer !== 0 && Math.sign(steer) !== Math.sign(this._currentSteer)) {
            effectiveSteerSpeed *= this.counterSteerFactor;
        }

        // Apply steering
        if (Math.abs(steer) > 0.01) {
            this._currentSteer = this._moveTowards(this._currentSteer, targetSteer, effectiveSteerSpeed * dt);
        } else {
            // Return to center
            this._currentSteer = this._moveTowards(this._currentSteer, 0, this.steerReturnSpeed * dt);
        }

        // Clamp
        this._currentSteer = Math.max(-1, Math.min(1, this._currentSteer));
    }

    // ════════════════════════════════════════════════════
    //  DRIVE FORCES
    // ════════════════════════════════════════════════════

    _applyDriveForces(dt) {
        this._isReverseAccelerating = false;
        const rb = this._getRigidbody();
        const mass = (rb && rb.mass) ? rb.mass : 1;

        const angleRad = this.gameObject.angle * (Math.PI / 180);

        // Forward direction
        const forwardX = Math.cos(angleRad);
        const forwardY = Math.sin(angleRad);

        // Project velocity onto forward axis to get signed speed
        this._currentSpeed = this._velX * forwardX + this._velY * forwardY;

        // Total velocity magnitude (needed for handbrake/slide logic)
        const totalSpeed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);

        // Compute local velocity
        const rightX = -Math.sin(angleRad);
        const rightY = Math.cos(angleRad);
        this._localVelX = this._velX * rightX + this._velY * rightY; // lateral
        this._localVelY = this._currentSpeed; // longitudinal (forward)

        // Calculate slip angle
        const speed = Math.abs(this._currentSpeed);
        if (totalSpeed > 5) {
            this._slipAngle = Math.atan2(Math.abs(this._localVelX), Math.abs(this._localVelY)) * (180 / Math.PI);
        } else {
            this._slipAngle = 0;
        }

        // Physics scale multiplier
        const scale = this.physicsScale;

        // Engine force
        let driveForce = 0;
        const gearRatio = this._getGearRatio(this._currentGear);
        const totalRatio = gearRatio * this.finalDriveRatio;

        // Torque curve: peaks around 70% of max RPM, falls off at redline
        const rpmNorm = this._currentRPM / this.maxRPM;
        const torqueCurve = Math.sin(rpmNorm * Math.PI * 0.85);  // approximate bell curve

        // Gear shift acceleration penalty - simulates clutch disengagement
        let shiftMultiplier = 1.0;
        if (this._isShifting && this._actualShiftDuration > 0) {
            // Sine curve for smooth power cut during shift: starts soft, peaks mid-shift, ends soft
            const shiftProgress = Math.max(0, Math.min(1, 1 - (this._shiftTimer / this._actualShiftDuration)));
            const shiftCurveFactor = Math.sin(shiftProgress * Math.PI);
            shiftMultiplier = 1.0 - (this.gearShiftAccelLoss * shiftCurveFactor);
        }

        // ═══════════════════════════════════════════════════════════════════
        // CLUTCH DISENGAGED: No power to wheels
        // When clutch is held, the engine revs freely but doesn't drive
        // ═══════════════════════════════════════════════════════════════════
        const clutchDisengaged = this.clutchEnabled && this._clutchInput;

        if (this._throttle > 0 && !clutchDisengaged) {
            if (this._currentGear > 0) {
                // ═══════════════════════════════════════════════════════════════
                // HP-BASED FORCE MODEL
                // Convert HP to force, apply torque curve and gear multiplication.
                // If force exceeds tyre traction limit → wheelspin/drift.
                // ═══════════════════════════════════════════════════════════════
                const engineForce = this._hpToForce(this.enginePower);
                let maxForce;
                if (this.gearConfigMode === 'maxSpeed') {
                    // ═══════════════════════════════════════════════════════════
                    // maxSpeed MODE: Acceleration-calibrated force model
                    // Each gear must reach its max speed within fullThrottleRevTime.
                    // Force = mass × requiredAcceleration + drag compensation.
                    // This ensures speed and RPM stay in sync.
                    // ═══════════════════════════════════════════════════════════
                    const prevGearMaxSpd = this._currentGear > 1 ? this._getGearMaxSpeed(this._currentGear - 1) : 0;
                    const thisGearMaxSpd = this._getGearMaxSpeed(this._currentGear);
                    const speedRange = Math.max(1, thisGearMaxSpd - prevGearMaxSpd);
                    const revTime = Math.max(0.5, this.fullThrottleRevTime);
                    const requiredAccel = speedRange / revTime;
                    // Estimate drag at average gear speed for compensation
                    const midSpeed = (prevGearMaxSpd + thisGearMaxSpd) / 2;
                    const estDrag = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * midSpeed * midSpeed;
                    maxForce = (requiredAccel + estDrag) * Math.max(mass, 0.1) * scale;
                    // Apply torque curve for realistic feel (stronger mid-range, weaker at extremes)
                    maxForce *= Math.max(0.4, torqueCurve);
                } else {
                    // In ratio mode, use gear ratios for torque multiplication
                    const totalRatio = gearRatio * this.finalDriveRatio;
                    maxForce = engineForce * scale * Math.abs(totalRatio) * torqueCurve;
                }

                // ═══════════════════════════════════════════════════════════
                // MANUAL TRANSMISSION: Engine bogging in wrong gear
                // (applies to BOTH maxSpeed and ratio modes)
                // In manual mode, if speed is below the gear's effective range
                // (previous gear's max speed), the engine can't produce adequate
                // torque — it lugs and bogs. Higher gears = much worse bogging.
                // You can't floor it in 5th gear from standstill like a real car;
                // you need to build speed through the lower gears first.
                //
                // Key behavior:
                // - Starting in gear 5 from standstill: engine nearly stalls,
                //   car barely creeps. You MUST downshift to accelerate.
                // - Starting in gear 3 at low speed: sluggish, but recoverable
                //   once you reach gear 2's speed range.
                // - Speed is capped relative to what the engine can actually
                //   deliver in the wrong gear — no slowly climbing to max.
                // ═══════════════════════════════════════════════════════════
                if (this.transmissionType === 'manual' && this._currentGear > 1) {
                    const currentSpd = Math.abs(this._currentSpeed);
                    const prevGearMaxSpd = this._getGearMaxSpeed(this._currentGear - 1);
                    // maxSpeed mode: bogging applies over the FULL range below prev gear's max,
                    //   because that gear's effective range starts AT prev gear's max.
                    // ratio mode: bogging only below 50% — more forgiving since there are
                    //   no explicit speed boundaries.
                    const bogThreshold = this.gearConfigMode === 'maxSpeed'
                        ? prevGearMaxSpd   // full range
                        : prevGearMaxSpd * 0.5; // half range
                    
                    if (prevGearMaxSpd > 0 && currentSpd < bogThreshold) {
                        // 0 at standstill, 1 at threshold
                        const speedRatio = currentSpd / bogThreshold;
                        const gearDiff = this._currentGear - 1;
                        
                        // Power curve: smooth ramp from floor to full power at threshold
                        const exponent = 1.0 + gearDiff * 0.5 + Math.max(0, gearDiff - 2) * 0.5;
                        const powerCurve = Math.pow(Math.max(0, speedRatio), exponent);
                        
                        // Floor: tiny creep force so you're not 100% stuck
                        const floor = Math.max(0.01, 0.08 / Math.pow(gearDiff, 0.8));
                        const powerMultiplier = floor + (1.0 - floor) * powerCurve;
                        maxForce *= powerMultiplier;
                    }
                }

                driveForce = this._throttle * maxForce * shiftMultiplier;

                // ═══════════════════════════════════════════════════════════════
                // TRACTION LIMIT — HP-based, gear-mode independent
                // Compare engine HP against tyre capacity (weight × grip).
                // Only bites in low gears at low speed (launch traction).
                // Produces wheelspin (lateral grip loss) instead of killing drive.
                // ═══════════════════════════════════════════════════════════════
                const tractionCapHP = this._getTractionCapacityHP();
                const effectiveHP = this.enginePower * this._throttle;
                // Only check traction in gears 1-2 at low speed
                if (effectiveHP > tractionCapHP && this._currentSpeed < this._kmhToPxs(80) * scale && this._currentGear <= 2) {
                    const excessRatio = effectiveHP / tractionCapHP;
                    // Wheelspin factor — used in _applyGrip to reduce lateral grip
                    this._wheelspinFactor = Math.min(0.8, (excessRatio - 1.0) * 0.4);
                    // Slight forward force loss (spinning wheels are less efficient)
                    const forwardEfficiency = Math.max(0.6, 1.0 - this._wheelspinFactor * 0.3);
                    driveForce *= forwardEfficiency;
                    // Auto-trigger drift from wheelspin
                    if (excessRatio > 1.2 && this.driftEnabled && this._throttle > 0.7) {
                        this._isDrifting = true;
                    }
                } else {
                    this._wheelspinFactor = Math.max(0, this._wheelspinFactor - 4.0 * dt);
                }
                
                // Get gear max speed using the unified method (handles both modes)
                const gearMaxSpeed = this._getGearMaxSpeed(this._currentGear);
                
                if (this.gearConfigMode === 'maxSpeed') {
                    // ═══════════════════════════════════════════════════════════
                    // maxSpeed MODE: Asymptotic speed limiter
                    // Instead of cutting force to zero (which causes speed loss),
                    // smoothly reduce toward a maintenance force that counteracts
                    // drag, allowing the car to hold its gear max speed.
                    // ═══════════════════════════════════════════════════════════
                    if (this._currentSpeed > gearMaxSpeed * 0.9) {
                        const excess = Math.min(1, (this._currentSpeed - gearMaxSpeed * 0.9) / (gearMaxSpeed * 0.1));
                        // Calculate maintenance force (enough to counter drag at gear max speed)
                        const dragAtMax = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * gearMaxSpeed * gearMaxSpeed;
                        const maintenanceForce = dragAtMax * Math.max(mass, 0.1) * scale * 1.05;
                        // Blend from full drive force to maintenance force
                        driveForce = driveForce * (1 - excess) + maintenanceForce * this._throttle * excess;
                    }
                    // Hard clamp: don't accelerate past gear max speed
                    if (this._currentSpeed >= gearMaxSpeed) {
                        const dragAtMax = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * gearMaxSpeed * gearMaxSpeed;
                        driveForce = Math.min(driveForce, dragAtMax * Math.max(mass, 0.1) * scale * this._throttle);
                    }
                } else {
                    // Ratio mode: smooth power reduction as approaching gear's max speed
                    if (this._currentSpeed > gearMaxSpeed * 0.85) {
                        const speedOverage = (this._currentSpeed - gearMaxSpeed * 0.85) / (gearMaxSpeed * 0.15);
                        const powerFalloff = Math.max(0.05, 1 - speedOverage);
                        driveForce *= powerFalloff;
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════
                // MANUAL BOGGING SPEED CAP
                // maxSpeed mode: applies below prev gear's max speed (full range).
                // ratio mode: applies below 50% of prev gear's max.
                // ═══════════════════════════════════════════════════════════════
                if (this.transmissionType === 'manual' && this._currentGear > 1) {
                    const currentSpd = Math.abs(this._currentSpeed);
                    const prevGearMaxSpd = this._getGearMaxSpeed(this._currentGear - 1);
                    const bogThreshold = this.gearConfigMode === 'maxSpeed'
                        ? prevGearMaxSpd
                        : prevGearMaxSpd * 0.5;
                    
                    if (prevGearMaxSpd > 0 && currentSpd < bogThreshold) {
                        const gearDiff = this._currentGear - 1;
                        // Speed cap: fraction of the bogging threshold
                        const bogSpeedFraction = Math.max(0.20, 0.7 / Math.pow(gearDiff, 0.7));
                        const bogSpeedCap = bogThreshold * bogSpeedFraction;
                        
                        if (currentSpd > bogSpeedCap * 0.7) {
                            const capExcess = Math.min(1, (currentSpd - bogSpeedCap * 0.7) / (bogSpeedCap * 0.3));
                            const dragAtCap = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * bogSpeedCap * bogSpeedCap;
                            const capMaintForce = dragAtCap * Math.max(mass, 0.1) * scale;
                            driveForce = driveForce * (1 - capExcess) + capMaintForce * this._throttle * capExcess * 0.8;
                        }
                        if (currentSpd >= bogSpeedCap * 1.05) {
                            const dragAtCap = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * bogSpeedCap * bogSpeedCap;
                            driveForce = Math.min(driveForce, dragAtCap * Math.max(mass, 0.1) * scale * this._throttle * 0.3);
                        }
                    }
                }

                // Hard limit at overall top speed
                let absoluteTopSpeed;
                if (this.gearConfigMode === 'maxSpeed' && this.gearMaxSpeeds.length > 0) {
                    const highestGearSpeed = Math.max(...this.gearMaxSpeeds);
                    absoluteTopSpeed = this._kmhToPxs(highestGearSpeed) * scale;
                } else {
                    absoluteTopSpeed = this._kmhToPxs(this.topSpeed) * scale;
                }
                if (this._currentSpeed >= absoluteTopSpeed) driveForce = Math.min(driveForce, 0);
                // ── Reverse-acceleration: fighting backward momentum with throttle ──
                if (this._currentSpeed < -2) {
                    this._isReverseAccelerating = true;
                    // Cap drive force for smooth deceleration of reverse momentum
                    // Uses exponential decay to prevent jarring speed reversal
                    const maxDecelRate = 3.0;
                    const maxCounterAccel = Math.abs(this._currentSpeed) * (1 - Math.exp(-maxDecelRate * dt));
                    const maxCounterForce = maxCounterAccel * Math.max(mass, 0.1) / Math.max(dt, 0.001);
                    driveForce = Math.min(driveForce, maxCounterForce);
                }
            } else if (this._currentGear === -1) {
                // Reverse not from throttle; handled by brake when in reverse gear
            }
        }

        // Reverse via brake input when in reverse gear or when speed ≈ 0 and brake held
        if (this._brakeInput > 0 && this._currentGear === -1) {
            const reverseMaxSpd = this._getGearMaxSpeed(-1);
            let maxRev;
            if (this.gearConfigMode === 'maxSpeed') {
                // ═══════════════════════════════════════════════════════════════
                // maxSpeed MODE: Acceleration-calibrated reverse force
                // Use same model as forward gears — calculate force needed to
                // reach reverseMaxSpeed from 0 within fullThrottleRevTime.
                // ═══════════════════════════════════════════════════════════════
                const revTime = Math.max(0.5, this.fullThrottleRevTime);
                const requiredAccel = reverseMaxSpd / revTime;
                const midSpeed = reverseMaxSpd / 2;
                const estDrag = this.linearDrag + this.rollingResistance * 1000 + this.airResistanceCoeff * midSpeed * midSpeed;
                maxRev = (requiredAccel + estDrag) * Math.max(mass, 0.1) * scale;
                // Apply torque curve for feel, but with minimum floor so reverse is usable
                maxRev *= Math.max(0.5, torqueCurve);
            } else {
                const reverseForce = this._hpToForce(this.reversePower);
                const totalRatio = gearRatio * this.finalDriveRatio;
                maxRev = reverseForce * scale * Math.abs(totalRatio) * torqueCurve;
            }
            driveForce = -this._brakeInput * maxRev * shiftMultiplier;
            // Clamp at reverse speed limit
            if (this._currentSpeed <= -reverseMaxSpd) driveForce = 0;
        }

        // Braking force (when pressing brake while going forward)
        let brakeForce = 0;
        if (this._brakeInput > 0 && this._currentSpeed > 5 && this._currentGear !== -1) {
            brakeForce = this._brakeInput * this.brakePower * scale;
        }

        // Handbrake — uses TOTAL velocity (not just forward component)
        // so it keeps working even when the car is sliding sideways
        if (this._handbrakeInput && totalSpeed > 5) {
            brakeForce += this.brakePower * this.handbrakeStrength * scale;
            // Kill most of the drive force — handbrake shouldn't allow the engine
            // to push the car into its new heading while sliding
            driveForce *= 0.1;
        }

        // Apply drive force along forward direction
        // Also limit drive force when sliding significantly (high slip angle = tires can't grip)
        if (this._slipAngle > 20 && totalSpeed > 10) {
            const slipReduction = Math.max(0.15, 1.0 - (this._slipAngle - 20) / 60);
            driveForce *= slipReduction;
        }

        this._velX += forwardX * driveForce * dt / Math.max(mass, 0.1);
        this._velY += forwardY * driveForce * dt / Math.max(mass, 0.1);

        // Apply braking (reduce speed toward zero, capped so it can't overshoot to 0 in one frame)
        // Use max of forward speed and total speed so braking works during slides
        const brakeSpeed = Math.max(speed, totalSpeed * 0.7);
        if (brakeForce > 0 && brakeSpeed > 0.5) {
            const brakeDecel = brakeForce * dt / Math.max(mass, 0.1);
            const maxDecel = brakeSpeed * 0.7;
            const clampedDecel = Math.min(brakeDecel, maxDecel);
            const brakeFactor = Math.max(0.05, 1 - clampedDecel / brakeSpeed);
            this._velX *= brakeFactor;
            this._velY *= brakeFactor;
        }

        // ── Handbrake slide friction ──
        // Locked rear wheels on asphalt: directly bleed total kinetic energy
        if (this._handbrakeInput && totalSpeed > 2) {
            const slideFriction = Math.max(0.90, 1.0 - this.handbrakeSlideFriction * dt);
            this._velX *= slideFriction;
            this._velY *= slideFriction;

            // Track that we were recently handbraking
            this._handbrakeActiveTime = (this._handbrakeActiveTime || 0) + dt;
        } else if (this._handbrakeActiveTime > 0 && !this._handbrakeInput) {
            // Handbrake just released — if no throttle, bleed remaining momentum
            // so the car doesn't coast forward on stored energy
            if (this._throttle === 0) {
                const bleed = Math.max(0.3, 1.0 - 6.0 * dt);
                this._velX *= bleed;
                this._velY *= bleed;
            }
            this._handbrakeActiveTime = 0;
        }
    }

    // ════════════════════════════════════════════════════
    //  LATERAL GRIP (the core of the vehicle feel)
    // ════════════════════════════════════════════════════

    _applyGrip(dt) {
        const angleRad = this.gameObject.angle * (Math.PI / 180);
        const rightX = -Math.sin(angleRad);
        const rightY = Math.cos(angleRad);

        // Lateral velocity (sideways motion)
        const lateralVel = this._velX * rightX + this._velY * rightY;

        // Calculate effective grip
        let grip = (this.frontGrip + this.rearGrip) / 2;

        // Speed-dependent grip falloff
        const speed = Math.abs(this._currentSpeed);
        const totalSpeed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);
        const topSpeedPxs = this._kmhToPxs(this.topSpeed) * this.physicsScale;
        if (speed > this.gripFalloffSpeed) {
            const falloff = (speed - this.gripFalloffSpeed) / (topSpeedPxs - this.gripFalloffSpeed + 1);
            grip *= Math.max(this.gripMinMultiplier, 1.0 - falloff * (1.0 - this.gripMinMultiplier));
        }

        // ═══════════════════════════════════════════════════════════════════
        // HIGH-SPEED MOMENTUM PHYSICS
        // At high speed, vehicles maintain their travel direction based on
        // weight, engine power, and grip. Heavier/weaker vehicles drift more.
        // Sharp turns at high speed should naturally cause sliding.
        // ═══════════════════════════════════════════════════════════════════
        const momentumThresholdPxs = this._kmhToPxs(this.momentumSpeedThreshold) * this.physicsScale;
        const isHighSpeed = totalSpeed > momentumThresholdPxs;
        
        // Detect sharp steering at high speed - this should cause sliding even without handbrake
        const isSharpSteering = Math.abs(this._steerInput) > 0.4;
        const hasSignificantLateralVel = Math.abs(lateralVel) > totalSpeed * 0.15;
        const isHighSpeedTurn = isHighSpeed && (isSharpSteering || hasSignificantLateralVel);
        
        // Store for drift system to use
        this._isHighSpeedTurn = isHighSpeedTurn;
        
        // Momentum should track when: drifting, using handbrake, OR turning sharply at high speed
        const shouldTrackMomentum = isHighSpeed && (this._isDrifting || this._handbrakeInput || isHighSpeedTurn);
        
        // Track when we enter a high-speed situation — store the original momentum
        if (shouldTrackMomentum && !this._wasInHighSpeedDrift) {
            this._preDriftVelX = this._velX;
            this._preDriftVelY = this._velY;
            this._momentumVelX = this._velX;
            this._momentumVelY = this._velY;
            this._wasInHighSpeedDrift = true;
        } else if (!shouldTrackMomentum && this._wasInHighSpeedDrift) {
            // Exiting high-speed momentum mode — gradually blend momentum back to current velocity
            this._wasInHighSpeedDrift = false;
        }

        // Calculate momentum influence based on weight and power
        let momentumInfluence = 0;
        if (isHighSpeed && this.highSpeedMomentum > 0) {
            // Weight factor: heavier = more momentum resistance (1400kg baseline)
            const weightFactor = (this.vehicleWeightKg / 1400) * this.weightMomentumFactor;
            
            // Power factor: more power = can overcome momentum faster (300HP baseline)
            const powerFactor = Math.max(0.1, 1.0 - (this.enginePower / 600) * this.powerOvercomeMomentum);
            
            // Speed factor: faster = more momentum
            const speedFactor = Math.min(1.0, (totalSpeed - momentumThresholdPxs) / (topSpeedPxs - momentumThresholdPxs + 1));
            
            // Steering intensity factor: sharper turns = more momentum resistance
            const steerIntensity = Math.abs(this._steerInput);
            const steerFactor = 1.0 + steerIntensity * 0.5; // up to 50% more momentum when steering hard
            
            // Combined momentum influence
            momentumInfluence = this.highSpeedMomentum * weightFactor * powerFactor * speedFactor * steerFactor;
            momentumInfluence = Math.min(0.95, momentumInfluence); // cap to prevent total loss of control
            
            // During drift/handbrake, apply stronger momentum retention
            if (this._isDrifting || this._handbrakeInput) {
                momentumInfluence *= (1.0 + this.driftMomentumRetention * 0.5);
                momentumInfluence = Math.min(0.95, momentumInfluence);
            }
            
            // High-speed sharp turns also get boosted momentum (natural skidding)
            if (isHighSpeedTurn && !this._isDrifting && !this._handbrakeInput) {
                const turnBoost = steerIntensity * this.driftMomentumRetention * 0.6;
                momentumInfluence *= (1.0 + turnBoost);
                momentumInfluence = Math.min(0.95, momentumInfluence);
            }
        }

        // Drift reduces rear grip
        if (this._isDrifting) {
            grip *= this.driftGripMultiplier;
        }

        // Hover mode reduces lateral grip
        if (this.hoverEnabled) {
            grip *= this.hoverSlipFactor;
        }

        // Wheelspin from excess HP reduces lateral grip (car slides sideways)
        if (this._wheelspinFactor > 0) {
            grip *= (1.0 - this._wheelspinFactor * 0.6);
        }

        // Handbrake reduces grip further
        if (this._handbrakeInput) {
            grip *= 0.4;
        }

        // Reverse-acceleration traction loss (spinning wheels fighting backward motion)
        if (this._isReverseAccelerating && this.reverseAccelTractionLoss) {
            grip *= this.reverseAccelGripMultiplier;
        }

        // ═══════════════════════════════════════════════════════════════════
        // CLUTCH DUMP WHEELSPIN
        // When releasing clutch at high RPM, the sudden torque delivery
        // overwhelms tire grip, causing wheelspin proportional to engine power
        // ═══════════════════════════════════════════════════════════════════
        if (this.clutchEnabled && this._clutchDumpTimer > 0) {
            // Traction loss is strongest at start, fades as tires regain grip
            const fadeProgress = 1.0 - (this._clutchDumpTimer / this.clutchDumpDuration);
            const fadeEase = 1.0 - Math.pow(1.0 - fadeProgress, 2); // quadratic ease-out
            
            // Interpolate from clutchDumpTractionLoss to full grip
            const tractionLoss = this.clutchDumpTractionLoss + (1.0 - this.clutchDumpTractionLoss) * fadeEase;
            grip *= tractionLoss;
        }

        // ═══════════════════════════════════════════════════════════════════
        // MOMENTUM-BASED VELOCITY BLENDING
        // Instead of instantly correcting lateral velocity, blend between
        // the desired direction and the momentum direction
        // ═══════════════════════════════════════════════════════════════════
        
        // Kill lateral velocity based on grip (reduced by momentum)
        // grip = 1 means 100% correction, 0 means no correction
        const effectiveGrip = grip * (1.0 - momentumInfluence);
        const correctionRate = effectiveGrip * 10.0; // higher = snappier
        const correction = Math.min(Math.abs(lateralVel), correctionRate * dt * Math.abs(lateralVel));
        const correctionDir = lateralVel > 0 ? -1 : 1;

        this._velX += rightX * correction * correctionDir * effectiveGrip;
        this._velY += rightY * correction * correctionDir * effectiveGrip;

        // ═══════════════════════════════════════════════════════════════════
        // MOMENTUM PRESERVATION DURING HIGH-SPEED DRIFT
        // Vehicle maintains original travel direction, gradually aligning
        // with new heading based on grip and engine power
        // ═══════════════════════════════════════════════════════════════════
        if (momentumInfluence > 0 && this._wasInHighSpeedDrift) {
            // Slowly decay momentum velocity toward current velocity
            const decayRate = this.momentumRecoveryRate * (1.0 - this.driftMomentumRetention) * dt;
            
            // Throttle helps overcome momentum (tires pulling car into new direction)
            const throttleRecovery = this._throttle * this.powerOvercomeMomentum * 3.0 * dt;
            const totalRecovery = Math.min(1.0, decayRate + throttleRecovery);
            
            this._momentumVelX = this._momentumVelX + (this._velX - this._momentumVelX) * totalRecovery;
            this._momentumVelY = this._momentumVelY + (this._velY - this._momentumVelY) * totalRecovery;
            
            // Blend current velocity toward momentum direction
            const momentumBlend = momentumInfluence * this.driftMomentumRetention;
            this._velX = this._velX * (1.0 - momentumBlend) + this._momentumVelX * momentumBlend;
            this._velY = this._velY * (1.0 - momentumBlend) + this._momentumVelY * momentumBlend;
        }

        // ── Tire scrub friction ──
        // Sliding sideways dissipates kinetic energy (tires generate heat, not speed).
        // Without this, a handbrake turn preserves full momentum and the car rockets
        // off in the new direction when grip returns.
        // momentumSlideFriction controls how aggressively speed bleeds during slides
        if (totalSpeed > 1) {
            const slipRatio = Math.abs(lateralVel) / totalSpeed; // 0 = driving straight, 1 = fully sideways
            // More scrub when grip is LOW (sliding tires) and slip is HIGH
            // Momentum reduces scrub (heavy fast cars maintain more speed in slides)
            const momentumScrubReduction = 1.0 - (momentumInfluence * 0.5);
            const frictionScale = this.momentumSlideFriction * 2.0; // 0 = no friction, 1 = 2× base (heavy friction)
            const scrubIntensity = slipRatio * (1.0 - Math.min(grip, 1.0)) * 8.0 * momentumScrubReduction * frictionScale;
            const scrubFactor = Math.max(0.70, 1.0 - scrubIntensity * dt);
            this._velX *= scrubFactor;
            this._velY *= scrubFactor;
        }
    }

    // ════════════════════════════════════════════════════
    //  DRAG & RESISTANCE
    // ════════════════════════════════════════════════════

    _applyDrag(dt) {
        const speed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);
        if (speed < 0.01) return;

        // Effective drag
        let effectiveDrag = this.linearDrag;
        if (this.boatMode) effectiveDrag = this.waterDrag;

        // Rolling resistance (constant deceleration)
        const rollDecel = this.rollingResistance * 1000; // convert to reasonable units
        // Air resistance (quadratic drag)
        const airDecel = this.airResistanceCoeff * speed * speed;

        // ── Engine braking: no throttle = extra resistance (foot off gas) ──
        let engineBraking = 0;
        if (this._throttle === 0) {
            // Engine compression slows the car down when coasting
            // Stronger effect when not player-controlled (no driver = no clutch management)
            const engineBrakeBase = 3.0;
            const noDriverBonus = this.playerControlled ? 1.0 : 2.5;
            engineBraking = engineBrakeBase * noDriverBonus;
        }

        const totalDecel = (effectiveDrag + rollDecel + airDecel + engineBraking) * dt;
        const dragFactor = Math.max(0, 1 - totalDecel / Math.max(speed, 1));

        this._velX *= dragFactor;
        this._velY *= dragFactor;

        // Stop at very low speed if no throttle
        // Higher threshold for uncontrolled vehicles so they don't creep forever
        const stopThreshold = this._throttle === 0 && !this.playerControlled ? 10 : 2;
        if (speed < stopThreshold && this._throttle === 0 && this._brakeInput === 0) {
            this._velX = 0;
            this._velY = 0;
        }
    }

    // ════════════════════════════════════════════════════
    //  DRIFT SYSTEM
    // ════════════════════════════════════════════════════

    _updateDrift(dt) {
        if (!this.driftEnabled) {
            this._isDrifting = false;
            return;
        }

        const speed = Math.abs(this._currentSpeed);
        const wasDrifting = this._isDrifting;

        // Determine if we should be drifting
        switch (this.driftTrigger) {
            case 'handbrake':
                if (this._handbrakeInput && speed > 30) {
                    this._isDrifting = true;
                } else if (this._isHighSpeedTurn) {
                    // High-speed momentum turn also triggers drift state
                    this._isDrifting = true;
                } else if (!this._handbrakeInput && this._slipAngle < 10 && !this._isHighSpeedTurn) {
                    this._isDrifting = false;
                }
                break;
            case 'oversteer':
                if (this._slipAngle > 15 && speed > 30) {
                    this._isDrifting = true;
                } else if (this._isHighSpeedTurn) {
                    // High-speed momentum turn also triggers drift state
                    this._isDrifting = true;
                } else if (this._slipAngle < 8 && !this._isHighSpeedTurn) {
                    this._isDrifting = false;
                }
                break;
            case 'always':
                this._isDrifting = speed > 20;
                break;
        }

        // Drift boost charging
        if (this._isDrifting && this.driftBoostEnabled) {
            this._driftBoostCharge = Math.min(
                this.driftBoostMaxCharge,
                this._driftBoostCharge + this.driftBoostChargeRate * dt
            );
        }

        // Release boost when drift ends — only if throttle is held
        if (wasDrifting && !this._isDrifting) {
            if (this._throttle > 0 && this._driftBoostCharge > this.driftBoostMaxCharge * 0.3) {
                this._activateBoost();
            } else {
                // No throttle: discard the boost charge
                this._driftBoostCharge = 0;
            }
        }

        // Sound
        if (this._isDrifting && !wasDrifting && this.driftSound && typeof audioPlay === 'function') {
            const _svol = this._computeSpatialVolume();
            if (_svol > 0.01) audioPlay(this.driftSound, false, _svol);
        }
    }

    _activateBoost() {
        if (!this.driftBoostEnabled) return;
        this._isBoosting = true;
        this._boostTimer = this.driftBoostDuration;
        this._driftBoostCharge = 0;
        if (this.boostSound && typeof audioPlay === 'function') {
            const _svol = this._computeSpatialVolume();
            if (_svol > 0.01) audioPlay(this.boostSound, false, _svol);
        }
    }

    _updateBoost(dt) {
        // Manual boost key
        if (this._boostInput && !this._isBoosting && this._driftBoostCharge >= this.driftBoostMaxCharge * 0.3) {
            this._activateBoost();
        }

        if (!this._isBoosting) return;

        this._boostTimer -= dt;
        if (this._boostTimer <= 0) {
            this._isBoosting = false;
            return;
        }

        const rb = this._getRigidbody();
        const mass = (rb && rb.mass) ? rb.mass : 1;

        const angleRad = this.gameObject.angle * (Math.PI / 180);
        const boostAccel = this.driftBoostForce * this.physicsScale * dt / Math.max(mass, 0.1);
        this._velX += Math.cos(angleRad) * boostAccel;
        this._velY += Math.sin(angleRad) * boostAccel;
    }

    // ════════════════════════════════════════════════════
    //  MOVEMENT APPLICATION
    // ════════════════════════════════════════════════════

    _applyMovement(dt) {
        const rb = this._getRigidbody();
        const speed = Math.abs(this._currentSpeed);
        const totalSpeed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);

        // ═══════════════════════════════════════════════════════════════════
        // HIGH-SPEED TURNING RESISTANCE
        // At high speed, the vehicle's momentum resists instant heading changes.
        // This creates realistic drift behavior where the car slides instead of
        // snapping to the new direction.
        // ═══════════════════════════════════════════════════════════════════
        const topSpeedPxs = this._kmhToPxs(this.topSpeed) * this.physicsScale;
        const momentumThresholdPxs = this._kmhToPxs(this.momentumSpeedThreshold) * this.physicsScale;
        
        let turnRateMultiplier = 1.0;
        if (totalSpeed > momentumThresholdPxs && this.highSpeedMomentum > 0) {
            // Calculate how much momentum resists turning
            const speedFactor = Math.min(1.0, (totalSpeed - momentumThresholdPxs) / (topSpeedPxs - momentumThresholdPxs + 1));
            
            // Weight factor: heavier = harder to turn (1400kg baseline)
            const weightFactor = Math.min(2.0, (this.vehicleWeightKg / 1400) * this.weightMomentumFactor);
            
            // Power factor: more power helps redirect (can steer into slides)
            const powerHelp = Math.min(0.5, (this.enginePower / 600) * this.powerOvercomeMomentum * this._throttle);
            
            // Combined turn resistance
            const turnResistance = this.highSpeedMomentum * speedFactor * weightFactor * (1.0 - powerHelp);
            turnRateMultiplier = Math.max(0.15, 1.0 - turnResistance * 0.7); // never fully prevent turning
            
            // Drifting/handbrake allows more rotation (rear tires are loose)
            if (this._isDrifting || this._handbrakeInput) {
                turnRateMultiplier = Math.min(1.0, turnRateMultiplier * 1.4);
            }
        }

        // ── Turning ──
        if (this.tankSteering) {
            // Tank: rotate in place regardless of steer angle
            if (Math.abs(this._steerInput) > 0.01) {
                const turnAmount = this._steerInput * this.tankTurnSpeed * dt;
                this.gameObject.angle += turnAmount;
                // Slow down while turning
                const brakeMult = 1.0 - Math.abs(this._steerInput) * this.tankTurnBraking * dt;
                this._velX *= Math.max(0.5, brakeMult);
                this._velY *= Math.max(0.5, brakeMult);
            }
        } else {
            // Ackermann-like: turn rate proportional to speed
            if (speed > 2) {
                const steerAngleRad = this._currentSteer * this.maxSteerAngle * (Math.PI / 180);
                // Turning radius = wheelbase / tan(steerAngle)
                // Simplified: angular velocity = speed * tan(steerAngle) / wheelbase
                const wheelbase = 50; // virtual wheelbase, tuning constant
                let angularVel = (this._currentSpeed / wheelbase) * Math.tan(steerAngleRad);
                
                // Apply high-speed turn resistance
                angularVel *= turnRateMultiplier;
                
                this.gameObject.angle += angularVel * (180 / Math.PI) * dt;
            }
        }

        // ── Rotate sprite to movement direction (optional smoothing) ──
        if (this.rotateToVelocity && !this.tankSteering && speed < 2) {
            // At very low speed, don't force rotation
        }

        // Hover bob
        if (this.hoverEnabled) {
            this._hoverPhase += dt * this.hoverFrequency * Math.PI * 2;
            // Use a visual offset stored in a data attribute; doesn't affect physics position
            this._hoverOffsetY = Math.sin(this._hoverPhase) * this.hoverHeight;
        }

        // Boat wave sway
        if (this.boatMode) {
            this._wavePhase += dt * this.waveFrequency * Math.PI * 2;
            const sway = Math.sin(this._wavePhase) * this.waveSway;
            this.gameObject.angle += sway * dt;
        }

        // ── GTA2-style angle snapping ──
        if (this.angleSnapping && speed > this.angleSnapSpeed && Math.abs(this._steerInput) < 0.1) {
            const snapAngle = 360 / this.angleSnapDivisions;
            const currentAngle = ((this.gameObject.angle % 360) + 360) % 360;
            const nearestSnap = Math.round(currentAngle / snapAngle) * snapAngle;
            let angleDiff = nearestSnap - currentAngle;
            // Wrap to shortest path
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;
            // Lerp toward snap — stronger at higher speeds
            const topSpeedPxsSnap = this._kmhToPxs(this.topSpeed) * this.physicsScale;
            const speedFactor = Math.min(1, speed / topSpeedPxsSnap);
            const snapForce = this.angleSnapStrength * speedFactor * dt;
            this.gameObject.angle += angleDiff * Math.min(1, snapForce);
        }

        // ── Move position & sync to Rigidbody ──
        if (rb) {
            // Sync velocity to Rigidbody — it will handle position update & collision detection
            rb.velocityX = this._velX;
            rb.velocityY = this._velY;
            // Disable Rigidbody's internal physics so it doesn't fight us
            rb.drag = 1.0;
            rb.useGravity = false;
            // Collision spin: let angular velocity from collision torque persist and decay
            if (this.collisionSpinEnabled) {
                // Convert vehicle angular drag to frame-rate-independent damping multiplier
                rb.angularDrag = Math.exp(-this.angularDrag * dt);
            } else {
                rb.angularDrag = 1.0;
                rb.angularVelocity = 0;
            }
        } else {
            // No Rigidbody — move position directly
            this.gameObject.position.x += this._velX * dt;
            this.gameObject.position.y += this._velY * dt;
        }
    }

    // ════════════════════════════════════════════════════
    //  VISUAL EFFECTS
    // ════════════════════════════════════════════════════

    _updateVisualEffects(dt) {
        // Decrement collision hit timer
        if (this._collisionHitTimer > 0) {
            this._collisionHitTimer -= dt;
        }

        // Determine which tires should leave marks
        const drawRearTires = this._isDrifting;
        const drawAllTires = this._collisionHitTimer > 0;  // collision = all 4 tires
        const shouldDrawAny = this.tireMarkEnabled && (drawRearTires || drawAllTires);

        if (shouldDrawAny) {
            const pos = this.gameObject.position;
            const angleRad = this.gameObject.angle * (Math.PI / 180);
            const fwdX = Math.cos(angleRad);
            const fwdY = Math.sin(angleRad);
            const perpX = -Math.sin(angleRad);
            const perpY = Math.cos(angleRad);

            const rearOffset = -20;
            const frontOffset = 20;
            const sideOffset = 12;

            // ── Rear tires (drift + collision) ──
            const rx = pos.x + fwdX * rearOffset;
            const ry = pos.y + fwdY * rearOffset;
            const tire1X = rx + perpX * sideOffset;
            const tire1Y = ry + perpY * sideOffset;
            const tire2X = rx - perpX * sideOffset;
            const tire2Y = ry - perpY * sideOffset;

            if (this._lastTire1X !== undefined && typeof drawDecalLine === 'function') {
                const dx1 = tire1X - this._lastTire1X;
                const dy1 = tire1Y - this._lastTire1Y;
                const dx2 = tire2X - this._lastTire2X;
                const dy2 = tire2Y - this._lastTire2Y;
                if (dx1 * dx1 + dy1 * dy1 < 400) {
                    drawDecalLine(this._lastTire1X, this._lastTire1Y, tire1X, tire1Y, this.tireMarkColor, this.tireMarkWidth, this.tireMarkAlpha);
                }
                if (dx2 * dx2 + dy2 * dy2 < 400) {
                    drawDecalLine(this._lastTire2X, this._lastTire2Y, tire2X, tire2Y, this.tireMarkColor, this.tireMarkWidth, this.tireMarkAlpha);
                }
            }
            this._lastTire1X = tire1X;
            this._lastTire1Y = tire1Y;
            this._lastTire2X = tire2X;
            this._lastTire2Y = tire2Y;

            // ── Front tires (collision only) ──
            if (drawAllTires) {
                const fx = pos.x + fwdX * frontOffset;
                const fy = pos.y + fwdY * frontOffset;
                const ft1X = fx + perpX * sideOffset;
                const ft1Y = fy + perpY * sideOffset;
                const ft2X = fx - perpX * sideOffset;
                const ft2Y = fy - perpY * sideOffset;

                if (this._lastFrontTire1X !== undefined && typeof drawDecalLine === 'function') {
                    const dx3 = ft1X - this._lastFrontTire1X;
                    const dy3 = ft1Y - this._lastFrontTire1Y;
                    const dx4 = ft2X - this._lastFrontTire2X;
                    const dy4 = ft2Y - this._lastFrontTire2Y;
                    if (dx3 * dx3 + dy3 * dy3 < 400) {
                        drawDecalLine(this._lastFrontTire1X, this._lastFrontTire1Y, ft1X, ft1Y, this.tireMarkColor, this.tireMarkWidth, this.tireMarkAlpha);
                    }
                    if (dx4 * dx4 + dy4 * dy4 < 400) {
                        drawDecalLine(this._lastFrontTire2X, this._lastFrontTire2Y, ft2X, ft2Y, this.tireMarkColor, this.tireMarkWidth, this.tireMarkAlpha);
                    }
                }
                this._lastFrontTire1X = ft1X;
                this._lastFrontTire1Y = ft1Y;
                this._lastFrontTire2X = ft2X;
                this._lastFrontTire2Y = ft2Y;
            } else {
                // Not colliding — clear front tire tracking so we don't bridge gaps
                this._lastFrontTire1X = undefined;
                this._lastFrontTire1Y = undefined;
                this._lastFrontTire2X = undefined;
                this._lastFrontTire2Y = undefined;
            }
        } else {
            // Nothing active — clear all tire tracking
            this._lastTire1X = undefined;
            this._lastTire1Y = undefined;
            this._lastTire2X = undefined;
            this._lastTire2Y = undefined;
            this._lastFrontTire1X = undefined;
            this._lastFrontTire1Y = undefined;
            this._lastFrontTire2X = undefined;
            this._lastFrontTire2Y = undefined;
        }

        // Exhaust particles — draw directly to decal layer instead of creating 
        // a new GameObject per puff (avoids ~15 GameObject allocations/sec per vehicle)
        if (this.exhaustParticles && this._throttle > 0) {
            if (!this._lastExhaustTime) this._lastExhaustTime = 0;
            const exhaustNow = performance.now();
            if (exhaustNow - this._lastExhaustTime > 66 && Math.random() < this._throttle * 0.5) {
                this._lastExhaustTime = exhaustNow;
                const pos = this.gameObject.position;
                const angleRad = this.gameObject.angle * (Math.PI / 180);
                // Rear of vehicle
                const ex = pos.x - Math.cos(angleRad) * 25;
                const ey = pos.y - Math.sin(angleRad) * 25;
                // Use lightweight decal circle instead of full particleBurst GameObject
                if (typeof drawDecalCircle === 'function') {
                    const puffSize = 2 + this._throttle * 1.5 + Math.random() * 2;
                    drawDecalCircle(
                        ex + (Math.random() - 0.5) * 4,
                        ey + (Math.random() - 0.5) * 4,
                        puffSize,
                        this.exhaustColor,
                        0.15 + this._throttle * 0.1
                    );
                } else if (typeof particleBurst === 'function') {
                    // Fallback to particleBurst if decal layer not available
                    particleBurst(ex, ey, {
                        count: 1,
                        color: this.exhaustColor,
                        colorEnd: this.exhaustColorEnd,
                        size: 3 + this._throttle * 2,
                        sizeEnd: 0,
                        speed: 8 + Math.abs(this._currentSpeed) * 0.04,
                        angle: (this.gameObject.angle + 180) * (Math.PI / 180),
                        spread: 0.3,
                        life: 0.35,
                        fadeOut: true
                    });
                }
            }
        }
    }
    // ════════════════════════════════════════════════════
    //  GENERATED AUDIO (Web Audio procedural synthesis)
    // ════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════
    //  SPATIAL AUDIO — 2D distance-based attenuation
    // ════════════════════════════════════════════════════

    /**
     * Compute a 0-1 volume multiplier based on the vehicle's distance
     * from the center of the viewport.  Uses the configured rolloff model.
     */
    _computeSpatialVolume() {
        if (!this.spatialAudioEnabled) return 1;

        // Grab engine + viewport
        const engine = this.gameObject?._engine || (typeof getEngine === 'function' ? getEngine() : null);
        if (!engine || !engine.viewport) return 1;

        const vp     = engine.viewport;
        const zoom   = vp.zoom || 1;
        const canvas = engine.canvas;

        // Listener = center of the current viewport in world coords
        const listenerX = vp.x + (canvas ? canvas.width  / (2 * zoom) : 0);
        const listenerY = vp.y + (canvas ? canvas.height / (2 * zoom) : 0);

        // Vehicle world position
        const pos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dx  = pos.x - listenerX;
        const dy  = pos.y - listenerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const minD = Math.max(0, this.spatialMinDistance);
        const maxD = Math.max(minD + 1, this.spatialMaxDistance);

        if (dist <= minD) return 1;
        if (dist >= maxD) return 0;

        const range = maxD - minD;
        const t     = (dist - minD) / range;  // 0 → 1 over the falloff zone

        switch (this.spatialRolloff) {
            case 'inverse':
                // 1 / (1 + t * refRatio)  — gentler near, quieter far
                return 1 / (1 + t * (maxD / minD || 10));
            case 'exponential':
                // Quick drop-off: (1 - t)^3
                return (1 - t) * (1 - t) * (1 - t);
            case 'linear':
            default:
                return 1 - t;
        }
    }

    _initGeneratedAudio() {
        if (this._audioCtx) return;
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }

        this._masterGain = this._audioCtx.createGain();
        this._masterGain.gain.value = 0;
        this._masterGain.connect(this._audioCtx.destination);

        if (this.enableGeneratedEngineSound) this._initEngineNodes();
        if (this.enableHandbrakeSound)       this._initHandbrakeNodes();
        this._audioInitialized = true;
    }

    _initEngineNodes() {
        const ctx = this._audioCtx;

        // Master engine gain (will be modulated by volume phaser if enabled)
        this._engineGain = ctx.createGain();
        this._engineGain.gain.value = 0;

        // ═══════════════════════════════════════════════════════════════════
        // DISTORTION EFFECT
        // Hard-clipping waveshaper for aggressive distorted tone
        // ═══════════════════════════════════════════════════════════════════
        this._engineDistortion = ctx.createWaveShaper();
        this._engineDistortion.curve = this._createDistortionCurve(this.engineDistortionAmount);
        this._engineDistortion.oversample = '4x';

        // ═══════════════════════════════════════════════════════════════════
        // MUFFLER EFFECT
        // Low-pass filter for muffled/boxy exhaust sound
        // ═══════════════════════════════════════════════════════════════════
        this._engineMuffler = ctx.createBiquadFilter();
        this._engineMuffler.type = 'lowpass';
        this._engineMuffler.frequency.value = this.engineMufflerEnabled ? this.engineMufflerCutoff : 20000;
        this._engineMuffler.Q.value = this.engineMufflerEnabled ? this.engineMufflerResonance : 0.7;

        // Soft-clip waveshaper for analog warmth (uses engineSaturation property)
        this._engineWaveshaper = ctx.createWaveShaper();
        this._engineWaveshaper.curve = this._createSaturationCurve(this.engineSaturation);
        this._engineWaveshaper.oversample = '2x';

        // Low-pass to round off harsh high harmonics (uses engineFilterQ property)
        this._engineLPF = ctx.createBiquadFilter();
        this._engineLPF.type = 'lowpass';
        this._engineLPF.frequency.value = 2400;
        this._engineLPF.Q.value = this.engineFilterQ;

        // ═══════════════════════════════════════════════════════════════════
        // REVERB EFFECT
        // Convolver-based reverb for exhaust echo/tunnel effect
        // ═══════════════════════════════════════════════════════════════════
        this._engineReverbDry = ctx.createGain();
        this._engineReverbWet = ctx.createGain();
        this._engineConvolver = ctx.createConvolver();
        this._engineConvolver.buffer = this._createReverbImpulse(ctx, this.engineReverbDecay);
        
        const reverbMix = this.engineReverbEnabled ? this.engineReverbMix : 0;
        this._engineReverbDry.gain.value = 1 - reverbMix;
        this._engineReverbWet.gain.value = reverbMix;

        // ═══════════════════════════════════════════════════════════════════
        // LIMITER (DynamicsCompressor as brick-wall limiter)
        // Always active to prevent combined oscillators, exhaust noise,
        // distortion, and saturation from boosting overall volume beyond
        // the user's engineSoundVolume setting.
        // ═══════════════════════════════════════════════════════════════════
        this._engineLimiter = ctx.createDynamicsCompressor();
        this._engineLimiter.threshold.value = -12;   // start limiting at -12 dB (catches most peaks)
        this._engineLimiter.knee.value = 6;          // soft knee for natural sound
        this._engineLimiter.ratio.value = 20;        // near brick-wall limiting
        this._engineLimiter.attack.value = 0.001;    // instant attack
        this._engineLimiter.release.value = 0.05;    // fast release

        // ═══════════════════════════════════════════════════════════════════
        // FINAL OUTPUT GAIN (Volume Cap)
        // This is the FINAL stage before master - applies engineSoundVolume as hard cap.
        // All internal engine sounds (harmonics, exhaust, effects) are normalized
        // internally, then this caps the entire engine output at engineSoundVolume.
        // ═══════════════════════════════════════════════════════════════════
        this._engineOutputGain = ctx.createGain();
        this._engineOutputGain.gain.value = this.engineSoundVolume;
        this._engineOutputGain.connect(this._masterGain);

        // Build the audio chain
        // Oscillators → Gain → Distortion → Limiter → Muffler → LPF → Waveshaper → [Dry + Wet Reverb] → OutputGain → Master
        this._engineGain.connect(this._engineDistortion);
        this._engineDistortion.connect(this._engineLimiter);
        this._engineLimiter.connect(this._engineMuffler);
        this._engineMuffler.connect(this._engineLPF);
        this._engineLPF.connect(this._engineWaveshaper);
        
        // Reverb dry/wet split → final output gain (capped at engineSoundVolume)
        this._engineWaveshaper.connect(this._engineReverbDry);
        this._engineWaveshaper.connect(this._engineConvolver);
        this._engineConvolver.connect(this._engineReverbWet);
        this._engineReverbDry.connect(this._engineOutputGain);
        this._engineReverbWet.connect(this._engineOutputGain);

        // ═══════════════════════════════════════════════════════════════════
        // VOLUME PHASER (Lumpy idle effect)
        // LFO modulating gain for V8-style lumpy idle sound
        // ═══════════════════════════════════════════════════════════════════
        if (this.engineVolumePhaserEnabled) {
            this._enginePhaserLFO = ctx.createOscillator();
            this._enginePhaserLFO.type = 'sine';
            this._enginePhaserLFO.frequency.value = this.engineVolumePhaserRate;
            
            this._enginePhaserGain = ctx.createGain();
            // Depth controls how much the LFO affects the gain
            // We offset to keep positive values (0.5 center ± depth/2)
            this._enginePhaserGain.gain.value = this.engineVolumePhaserDepth * 0.5;
            
            this._enginePhaserLFO.connect(this._enginePhaserGain);
            this._enginePhaserGain.connect(this._engineGain.gain);
            this._enginePhaserLFO.start();
        }

        // Harmonic oscillators with random detuning for organic feel
        this._engineOscillators = [];
        const count = Math.max(1, Math.min(8, this.engineHarmonics));
        const brightness = Math.max(0, Math.min(1, this.engineWaveformBrightness));
        const decay = Math.max(0.5, this.engineHarmonicDecay);
        const detuneSpread = Math.max(0, this.engineDetuneSpread);
        
        // Pre-calculate normalization factor: sum of all harmonic gains
        // This ensures combined oscillators don't exceed 1.0
        let harmonicSum = 0;
        for (let i = 0; i < count; i++) {
            harmonicSum += 1.0 / Math.pow((i + 1), decay);
        }
        const harmonicNormalization = 0.7 / Math.max(1, harmonicSum); // 0.7 leaves headroom for exhaust
        
        for (let i = 0; i < count; i++) {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            // Enhanced harmonic decay using engineHarmonicDecay property
            // Higher decay = faster rolloff = smoother sound
            // Pre-normalized so all harmonics sum to ~0.7 (leaves room for exhaust noise)
            gain.gain.value = (1.0 / Math.pow((i + 1), decay)) * harmonicNormalization;
            
            // Custom periodic wave using engineWaveformBrightness for each layer
            // Lower brightness = more sine-like (smooth), higher = more sawtooth (harsh)
            const layerBrightness = brightness * (1.0 - i * 0.08); // Slightly less harsh for overtones
            osc.setPeriodicWave(this._createWarmWave(ctx, Math.max(0, layerBrightness)));
            
            osc.frequency.value = this.engineBaseTone * (i + 1);
            // Random detuning using engineDetuneSpread for chorus/organic feel
            osc.detune.value = (Math.random() - 0.5) * detuneSpread;
            osc.connect(gain);
            gain.connect(this._engineGain);
            osc.start();
            this._engineOscillators.push({ osc, gain });
        }
        
        // Store normalization for runtime gain updates
        this._harmonicNormalization = harmonicNormalization;

        // Exhaust noise (filtered white noise for rumble)
        this._exhaustNoiseNode = this._createLoopedNoise(ctx);
        this._exhaustFilter = ctx.createBiquadFilter();
        this._exhaustFilter.type = 'bandpass';
        this._exhaustFilter.frequency.value = this.engineResonance;
        this._exhaustFilter.Q.value = 1.8;
        this._exhaustNoiseGain = ctx.createGain();
        this._exhaustNoiseGain.gain.value = this.engineExhaustNoise;
        this._exhaustNoiseNode.connect(this._exhaustFilter);
        this._exhaustFilter.connect(this._exhaustNoiseGain);
        this._exhaustNoiseGain.connect(this._engineGain);

        // Vibrato LFO (frequency wobble for engine roughness)
        this._vibratoOsc = ctx.createOscillator();
        this._vibratoOsc.type = 'sine';
        this._vibratoOsc.frequency.value = this.engineVibratoRate;
        this._vibratoGain = ctx.createGain();
        this._vibratoGain.gain.value = this.engineVibratoDepth;
        this._vibratoOsc.connect(this._vibratoGain);
        for (const { osc } of this._engineOscillators) {
            this._vibratoGain.connect(osc.frequency);
        }
        this._vibratoOsc.start();
    }

    /** Create a hard-clipping distortion curve */
    _createDistortionCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        const k = amount * 100; // Scale amount to useful range
        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1;
            // Mix of soft and hard clipping based on amount
            if (amount <= 0) {
                curve[i] = x; // Clean pass-through
            } else {
                // Polynomial soft-clip with adjustable hardness
                const soft = Math.tanh(x * (1 + k * 0.5));
                const hard = Math.max(-1, Math.min(1, x * (1 + k)));
                curve[i] = soft * (1 - amount * 0.5) + hard * (amount * 0.5);
            }
        }
        return curve;
    }

    /** Create a simple reverb impulse response */
    _createReverbImpulse(ctx, decayTime) {
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * Math.max(0.2, decayTime));
        const buffer = ctx.createBuffer(2, length, sampleRate);
        
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                const t = i / length;
                // Exponential decay with some early reflections
                const envelope = Math.exp(-t * (3 / decayTime));
                // Add some randomness for natural reverb
                const noise = (Math.random() * 2 - 1);
                data[i] = noise * envelope * 0.5;
            }
        }
        return buffer;
    }

    /** Create a smooth saturation curve for the waveshaper */
    _createSaturationCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1;
            curve[i] = Math.tanh(x * amount);
        }
        return curve;
    }

    /** Create a custom PeriodicWave between sine and sawtooth */
    _createWarmWave(ctx, brightness) {
        // brightness 0 = pure sine, 1 = sawtooth-like
        const harmonicCount = 16;
        const real = new Float32Array(harmonicCount);
        const imag = new Float32Array(harmonicCount);
        real[0] = 0;
        imag[0] = 0;
        for (let n = 1; n < harmonicCount; n++) {
            real[n] = 0;
            // Sawtooth harmonic series with adjustable rolloff
            imag[n] = (1.0 / n) * Math.pow(brightness, (n - 1) * 0.3);
        }
        return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    _initHandbrakeNodes() {
        const ctx = this._audioCtx;

        this._handbrakeGain = ctx.createGain();
        this._handbrakeGain.gain.value = 0;
        this._handbrakeGain.connect(this._masterGain);

        // Tyre screech: shaped noise through resonant bandpass
        this._handbrakeNoise = this._createLoopedNoise(ctx);
        this._handbrakeFilter = ctx.createBiquadFilter();
        this._handbrakeFilter.type = 'bandpass';
        this._handbrakeFilter.frequency.value = this.handbrakeSoundTone;
        this._handbrakeFilter.Q.value = this.handbrakeSoundSharpness;

        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 150;
        this._handbrakeHPF = hpf;

        this._handbrakeNoise.connect(this._handbrakeFilter);
        this._handbrakeFilter.connect(hpf);
        hpf.connect(this._handbrakeGain);
    }

    /**
     * Play a procedurally-generated crash/impact sound
     * @param {number} impactSpeed - Speed of collision (determines volume and intensity)
     */
    _playCrashSound(impactSpeed) {
        if (!this.enableCrashSound) return;
        if (impactSpeed < this.crashMinSpeed) return;

        // Throttle crash sounds to prevent audio spam during pile-ups
        const currentTime = performance.now();
        const minCrashInterval = 100; // ms between crash sounds
        if (this._lastCrashSoundTime && (currentTime - this._lastCrashSoundTime) < minCrashInterval) {
            return;
        }
        this._lastCrashSoundTime = currentTime;

        // Ensure audio context exists
        if (!this._audioCtx) {
            this._initGeneratedAudio();
            if (!this._audioCtx) return;
        }

        // Resume suspended context
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume().catch(() => {});
        }

        const ctx = this._audioCtx;
        const now = ctx.currentTime;
        const spatialVol = this._computeSpatialVolume();
        if (spatialVol < 0.01) return; // Too far away to hear

        // Intensity scales with speed: 0 at minSpeed, 1 at minSpeed*4
        const maxSpeed = this.crashMinSpeed * 4;
        const intensity = Math.min(1, (impactSpeed - this.crashMinSpeed) / (maxSpeed - this.crashMinSpeed));
        // Volume scales with intensity² so low-speed bumps are much quieter
        // A gentle bump at intensity 0.2 → volume × 0.04, a big crash at 1.0 → full volume
        const volumeScale = intensity * intensity;
        const baseVol = this.crashSoundVolume * spatialVol * volumeScale;

        // --- Low-frequency thump (body impact) ---
        const lowOsc = ctx.createOscillator();
        const lowGain = ctx.createGain();
        lowOsc.type = 'sine';
        // Lower frequency for heavier impacts
        lowOsc.frequency.value = this.crashLowFrequency * (1 - intensity * 0.3);
        lowGain.gain.value = 0;
        lowOsc.connect(lowGain);
        lowGain.connect(this._masterGain);
        
        const lowVol = baseVol * (1 - this.crashLowHighMix);
        lowGain.gain.setValueAtTime(lowVol, now);
        lowGain.gain.exponentialDecayTo = lowVol * 0.001;
        lowGain.gain.setTargetAtTime(0.001, now, this.crashDecayTime * 0.6);
        
        lowOsc.start(now);
        lowOsc.stop(now + this.crashDecayTime * 2);

        // --- High-frequency snap (metal crunch) ---
        const highOsc = ctx.createOscillator();
        const highGain = ctx.createGain();
        const highFilter = ctx.createBiquadFilter();
        highOsc.type = 'sawtooth';
        highOsc.frequency.value = this.crashHighFrequency * (0.8 + intensity * 0.4);
        highFilter.type = 'bandpass';
        highFilter.frequency.value = this.crashHighFrequency;
        highFilter.Q.value = 2 + intensity * 3;
        highGain.gain.value = 0;
        highOsc.connect(highFilter);
        highFilter.connect(highGain);
        highGain.connect(this._masterGain);
        
        const highVol = baseVol * this.crashLowHighMix;
        highGain.gain.setValueAtTime(highVol, now);
        highGain.gain.setTargetAtTime(0.001, now, this.crashDecayTime * 0.3);
        
        highOsc.start(now);
        highOsc.stop(now + this.crashDecayTime * 1.5);

        // --- Noise burst (crunch/debris) ---
        if (this.crashNoiseAmount > 0) {
            const noiseLen = ctx.sampleRate * this.crashDecayTime;
            const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
            const noiseData = noiseBuf.getChannelData(0);
            for (let i = 0; i < noiseLen; i++) {
                // Shaped noise: starts loud, decays with some graininess
                const t = i / noiseLen;
                const envelope = Math.exp(-t * 6) * (1 - t);
                const grain = Math.random() > 0.7 ? 1.5 : 1; // Random pops
                noiseData[i] = (Math.random() * 2 - 1) * envelope * grain;
            }
            const noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = noiseBuf;
            
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 800 + intensity * 2000;
            noiseFilter.Q.value = 0.5;
            
            const noiseGain = ctx.createGain();
            const noiseVol = baseVol * this.crashNoiseAmount;
            noiseGain.gain.value = noiseVol;
            
            noiseSrc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this._masterGain);
            noiseSrc.start(now);
        }

        // --- Secondary resonance (ringing metal) for harder impacts ---
        if (intensity > 0.4) {
            const ringOsc = ctx.createOscillator();
            const ringGain = ctx.createGain();
            ringOsc.type = 'sine';
            ringOsc.frequency.value = this.crashHighFrequency * 0.4 + Math.random() * 200;
            ringGain.gain.value = baseVol * 0.15 * (intensity - 0.4);
            ringOsc.connect(ringGain);
            ringGain.connect(this._masterGain);
            ringGain.gain.setTargetAtTime(0.001, now, this.crashDecayTime * 1.2);
            ringOsc.start(now);
            ringOsc.stop(now + this.crashDecayTime * 2.5);
        }
    }

    /** Create a looping white-noise AudioBufferSourceNode */
    _createLoopedNoise(ctx) {
        const len = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.start();
        return src;
    }

    _updateGeneratedAudio(dt) {
        if (!this.playerControlled) {
            this._destroyGeneratedAudio(); // Tear down if we switch to non-player control
            return; // Only update audio for player-controlled vehicles
        }
        // If vehicle interaction is enabled, only play engine audio when occupied by a MovementController2D
        if (this.vehicleInteractionEnabled && !this._occupant) {
            this._destroyGeneratedAudio(); // Teardown audio when no driver
            return;
        }
        const wantAudio = this.enableGeneratedEngineSound || this.enableHandbrakeSound || this.enableCrashSound;
        if (!wantAudio) {
            // Tear down if features were disabled at runtime
            if (this._audioInitialized) this._destroyGeneratedAudio();
            return;
        }

        // Lazy-init (needs user gesture before AudioContext works)
        if (!this._audioCtx) {
            this._initGeneratedAudio();
            if (!this._audioCtx) return;
        }

        // Hot-add nodes if a feature was toggled on at runtime
        if (this.enableGeneratedEngineSound && !this._engineGain) this._initEngineNodes();
        if (this.enableHandbrakeSound && !this._handbrakeGain) this._initHandbrakeNodes();

        // Resume suspended context (first interaction)
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume().catch(() => {});
        }

        const now = this._audioCtx.currentTime;

        // ── Spatial attenuation: scale master gain by distance from viewport center ──
        const spatialVol = this._computeSpatialVolume();
        this._masterGain.gain.setTargetAtTime(spatialVol, now, 0.08);

        // ── Engine sound ──
        if (this.enableGeneratedEngineSound && this._engineOscillators) {
            const rpmNorm = Math.max(0, Math.min(1,
                (this._currentRPM - this.idleRPM) / (this.maxRPM - this.idleRPM)
            ));

            // ── RPM-driven pitch model (realistic) ──
            // Pitch is PURELY based on RPM — same RPM = same pitch regardless of gear.
            // When you shift up, RPM drops → pitch drops → revs climb again.
            // This is how real engines sound: redline in 1st sounds the same as redline in 5th.
            let blendedPitch = rpmNorm;

            // Shift transient: brief dip during gear change for audible "shift" feel
            if (this._isShifting && this.shiftTime > 0) {
                const shiftProgress = 1 - (this._shiftTimer / this.shiftTime);
                const dipAmount = Math.sin(shiftProgress * Math.PI) * 0.08;
                blendedPitch = Math.max(0, blendedPitch - dipAmount);
            }

            // Frequency: base tone → base tone × pitchRange at redline
            // Same max pitch in every gear — just like a real engine
            const pitchRange = Math.max(1, this.enginePitchRange);
            const baseFreq = this.engineBaseTone * (1 + blendedPitch * (pitchRange - 1));
            const pitchSmoothing = Math.max(0.02, this.engineRPMSmoothing); // Use configurable smoothing

            for (let i = 0; i < this._engineOscillators.length; i++) {
                const targetF = baseFreq * (i + 1);
                this._engineOscillators[i].osc.frequency.setTargetAtTime(targetF, now, pitchSmoothing);

                // Harmonic gain varies with RPM: higher harmonics louder at high revs
                // Uses engineHarmonicDecay for rolloff calculation and pre-computed normalization
                const decay = Math.max(0.5, this.engineHarmonicDecay);
                const baseGain    = (1.0 / Math.pow((i + 1), decay)) * (this._harmonicNormalization || 0.5);
                const rpmBoost    = i > 0 ? rpmNorm * 0.3 : 0;  // Reduced from 0.4
                const throttleEdge = i > 1 ? this._throttle * 0.15 : 0;  // Reduced from 0.2
                const harmonicGain = baseGain * (1 + rpmBoost + throttleEdge);
                this._engineOscillators[i].gain.gain.setTargetAtTime(harmonicGain, now, 0.06);
            }

            // Open up the low-pass filter as revs rise (brighter at high revs)
            const lpfBase = 800 + this._throttle * 400;
            this._engineLPF.frequency.setTargetAtTime(
                lpfBase + blendedPitch * 3500, now, 0.06
            );

            // Exhaust resonance shifts with pitch
            this._exhaustFilter.frequency.setTargetAtTime(
                this.engineResonance * (0.5 + blendedPitch * 1.5), now, 0.06
            );
            // Exhaust noise: louder on throttle, still rumbles at idle
            // Scaled by 0.3 to leave headroom (exhaust is additive on top of harmonics)
            const exhaustLevel = this.engineExhaustNoise * 0.3 * (0.4 + this._throttle * 0.5 + rpmNorm * 0.1);
            this._exhaustNoiseGain.gain.setTargetAtTime(exhaustLevel, now, 0.08);

            // ═══════════════════════════════════════════════════════════════════
            // VOLUME CONTROL
            // _engineGain controls internal envelope (idle/throttle/rpm dynamics)
            // _engineOutputGain applies final engineSoundVolume cap
            // This ensures ALL engine effects are capped at engineSoundVolume
            // ═══════════════════════════════════════════════════════════════════
            
            // Update the final output cap (in case engineSoundVolume changed at runtime)
            if (this._engineOutputGain) {
                this._engineOutputGain.gain.setTargetAtTime(this.engineSoundVolume, now, 0.08);
            }
            
            // Internal envelope: layered from idle hum, throttle, rev height, and deceleration
            // This is the internal dynamics - NOT multiplied by engineSoundVolume (that's at output)
            let idleVol     = 0.15;
            let throttleVol = this._throttle * 0.4;
            let pitchVol    = blendedPitch * 0.25;
            // Engine braking character: off-throttle at high RPM stays audible
            let decelVol    = (this._throttle < 0.1 && rpmNorm > 0.3) ? rpmNorm * 0.1 : 0;
            
            // Internal envelope capped at 1.0 (final volume cap is at _engineOutputGain)
            let targetVol   = Math.min(1.0, idleVol + throttleVol + pitchVol + decelVol);

            // Shift volume dip — brief power cut for realism
            if (this._isShifting && this.shiftTime > 0) {
                const shiftProgress = 1 - (this._shiftTimer / this.shiftTime);
                const volDip = Math.sin(shiftProgress * Math.PI) * 0.35;
                targetVol *= (1 - volDip);
            }

            // Duck engine during skid/handbrake so the screech cuts through
            // When handbrake is active, reduce engine to ~50% volume for better handbrake audio clarity
            if (this._handbrakeInput) {
                // Direct handbrake ducking - halve the volume when handbrake is held
                targetVol *= 0.5;
            } else if (this.enableHandbrakeSound && this._handbrakeGain) {
                // Additional ducking based on actual handbrake sound volume (for drift/skid sounds)
                const skidVol = this._handbrakeGain.gain.value;
                if (skidVol > 0.01) {
                    targetVol *= Math.max(0.4, 1.0 - skidVol * 1.5);
                }
            }

            this._engineGain.gain.setTargetAtTime(targetVol, now, 0.08);

            // Vibrato: intensity and rate rise with RPM for higher-rev roughness
            const vibratoDepth = this.engineVibratoDepth * (0.3 + rpmNorm * 0.7);
            this._vibratoGain.gain.setTargetAtTime(vibratoDepth, now, 0.08);
            const vibratoRate = this.engineVibratoRate * (0.8 + rpmNorm * 0.4);
            this._vibratoOsc.frequency.setTargetAtTime(vibratoRate, now, 0.1);
        }

        // ── Handbrake / skid sound ──
        if (this.enableHandbrakeSound && this._handbrakeGain) {
            const totalSpeed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);

            // Trigger: handbrake held at speed, OR actively drifting
            const handbrakeActive = this._handbrakeInput && totalSpeed > 20;
            const driftActive     = this._isDrifting && totalSpeed > 15;

            let targetVol = 0;
            if (handbrakeActive || driftActive) {
                // Speed factor: louder at higher speeds, audible even at low slip
                const speedFactor = Math.min(1, totalSpeed / 150);
                // Slip adds extra intensity but isn't required
                const slipBonus = Math.min(0.4, this._slipAngle / 60);
                // Full volume uses handbrakeSoundVolume directly for louder skid
                targetVol = (0.7 + slipBonus) * speedFactor * this.handbrakeSoundVolume * 2.0;
                targetVol = Math.min(targetVol, this.handbrakeSoundVolume * 2.0); // cap at 2x user setting
            }
            // Smooth ease-in / ease-out (longer release to avoid abrupt cut)
            const timeConst = targetVol > this._handbrakeGain.gain.value ? 0.04 : 0.2;
            this._handbrakeGain.gain.setTargetAtTime(targetVol, now, timeConst);

            // Pitch shifts slightly with speed for realism
            const speedShift = this.handbrakeSoundTone + totalSpeed * 0.4;
            this._handbrakeFilter.frequency.setTargetAtTime(speedShift, now, 0.1);
        }
    }

    _destroyGeneratedAudio() {
        if (!this._audioCtx) return;
        const stop = (node) => { try { node.stop(); } catch (_) {} };
        if (this._engineOscillators) {
            for (const { osc } of this._engineOscillators) stop(osc);
            this._engineOscillators = null;
        }
        if (this._vibratoOsc)       stop(this._vibratoOsc);
        if (this._exhaustNoiseNode) stop(this._exhaustNoiseNode);
        if (this._handbrakeNoise)   stop(this._handbrakeNoise);
        // Fade master to zero before closing to avoid click
        try {
            const now = this._audioCtx.currentTime;
            this._masterGain.gain.setTargetAtTime(0, now, 0.02);
        } catch (_) {}
        // Close context after brief fade
        const ctx = this._audioCtx;
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 80);
        this._audioCtx = null;
        this._audioInitialized = false;
        this._engineGain = null;
        this._engineOutputGain = null;
        this._engineWaveshaper = null;
        this._engineLPF = null;
        this._masterGain = null;
        this._exhaustNoiseGain = null;
        this._exhaustFilter = null;
        this._vibratoOsc = null;
        this._vibratoGain = null;
        this._handbrakeGain = null;
        this._handbrakeFilter = null;
    }

    onDestroy() {
        this._destroyGeneratedAudio();
        
        // Release object references to allow GC
        this._occupant = null;
        this._lastWorkerResults = null;
        this._workerPendingResults = null;
    }

    // ════════════════════════════════════════════════════
    //  DRAWING
    // ════════════════════════════════════════════════════

    draw(ctx) {
        // Hover visual offset
        if (this.hoverEnabled && this._hoverOffsetY !== undefined) {
            // Draw a shadow ellipse at base
            const shadowAlpha = 0.2 + (this._hoverOffsetY / this.hoverHeight) * 0.1;
            ctx.globalAlpha = Math.max(0, shadowAlpha);
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(0, 10 - this._hoverOffsetY, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    drawGUI(ctx) {
        if (!this.debugDraw || !this.playerControlled) return;

        const canvas = ctx.canvas;
        const x = 10;
        const y = canvas.height - 195;
        const w = 220;
        const h = 185;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(x, y, w, h);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'left';

        const speed = Math.abs(this._currentSpeed);
        const displaySpeed = this._convertSpeed(speed);
        const clutchStatus = this._clutchInput ? 'IN' : (this._clutchDumpTimer > 0 ? 'SPIN!' : 'out');
        const lines = [
            `Speed: ${displaySpeed.toFixed(0)} ${this.speedUnit}`,
            `RPM: ${this._currentRPM.toFixed(0)}`,
            `Gear: ${this._currentGear === -1 ? 'R' : this._currentGear}`,
            `Steer: ${(this._currentSteer * 100).toFixed(0)}%`,
            `Slip: ${this._slipAngle.toFixed(1)}°`,
            `Drift: ${this._isDrifting ? 'YES' : 'no'}`,
            `Boost: ${this._driftBoostCharge.toFixed(0)} / ${this.driftBoostMaxCharge}`,
            `Boosting: ${this._isBoosting ? 'YES' : 'no'}`,
            `Throttle: ${(this._throttle * 100).toFixed(0)}%`,
            `Brake: ${(this._brakeInput * 100).toFixed(0)}%`,
            `Clutch: ${clutchStatus}${this._revLimiterBounceDirection ? ' BOUNCE' : ''}`
        ];

        lines.forEach((line, i) => {
            ctx.fillText(line, x + 8, y + 16 + i * 16);
        });

        // RPM bar
        const barX = x + 8;
        const barY = y + h - 8;
        const barW = w - 16;
        const rpmFrac = this._currentRPM / this.maxRPM;
        ctx.fillStyle = rpmFrac > this.redlineRPM / this.maxRPM ? '#ff3333' : '#00aaff';
        ctx.fillRect(barX, barY - 6, barW * rpmFrac, 6);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(barX, barY - 6, barW, 6);
    }

    // ════════════════════════════════════════════════════
    //  SUSTAINED CONTACT FRICTION
    // ════════════════════════════════════════════════════

    /**
     * Apply friction and resistance during sustained contact with solid objects.
     * Solves the "frictionless pushing" problem where vehicles slide through
     * each other because per-frame collision impulses are too small to trigger
     * the impulse-magnitude based detection (collisionMagSq > 1).
     *
     * Uses Rigidbody.currentCollisions to detect ongoing contacts and applies:
     * - Normal friction: opposes velocity into the contact surface
     * - Lateral friction: opposes sliding along the contact surface
     * - Mass-weighted: heavier/static objects provide more resistance
     */
    _applySustainedContactFriction(dt) {
        const rb = this._getRigidbody();
        if (!rb || !rb.currentCollisions || rb.currentCollisions.length === 0) return;

        const speed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);
        if (speed < 0.5) return;

        const myMass = rb.mass || 1;

        for (const col of rb.currentCollisions) {
            if (col.type !== 'solid' || !col.object) continue;

            // Direction from us to the other object (approximate contact normal)
            const dx = col.object.position.x - this.gameObject.position.x;
            const dy = col.object.position.y - this.gameObject.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.1) continue;
            const nx = dx / dist;
            const ny = dy / dist;

            // How much of our velocity is directed toward the contact
            const velToward = this._velX * nx + this._velY * ny;
            if (velToward <= 0.5) continue; // Not pushing into it

            // Get other body properties
            const otherRb = col.object.getModule ? col.object.getModule('Rigidbody') : null;
            const otherIsKinematic = otherRb ? otherRb.isKinematic : true;
            const otherMass = (otherRb && !otherIsKinematic) ? (otherRb.mass || 1) : 9999;

            // Other's velocity along contact normal
            let otherVelAlong = 0;
            const otherVC = col.object.getModule ? col.object.getModule('VehicleController') : null;
            if (otherVC) {
                otherVelAlong = (otherVC._velX || 0) * nx + (otherVC._velY || 0) * ny;
            } else if (otherRb) {
                otherVelAlong = (otherRb.velocityX || 0) * nx + (otherRb.velocityY || 0) * ny;
            }

            // Relative closing speed (how fast we're pushing into them)
            const closingSpeed = velToward - otherVelAlong;
            if (closingSpeed <= 0) continue;

            // Mass ratio: 0.5 = equal mass, ~1.0 for very heavy/static objects
            const massRatio = otherMass / (myMass + otherMass);

            // ── Normal friction: opposes pushing into the contact ──
            // Higher mass ratio = more resistance (can't push through a building)
            const normalFriction = massRatio * 0.6;
            const normalReduction = closingSpeed * normalFriction * Math.min(dt * 8, 1.0);
            this._velX -= nx * normalReduction;
            this._velY -= ny * normalReduction;

            // ── Lateral friction: opposes sliding along the contact surface ──
            const tx = -ny;
            const ty = nx;
            const velTangent = this._velX * tx + this._velY * ty;
            if (Math.abs(velTangent) > 0.5) {
                const lateralFriction = Math.abs(velTangent) * massRatio * 0.25 * Math.min(dt * 8, 1.0);
                const latReduction = Math.min(lateralFriction, Math.abs(velTangent) * 0.4);
                this._velX -= tx * latReduction * Math.sign(velTangent);
                this._velY -= ty * latReduction * Math.sign(velTangent);
            }

            // ── Tire marks during sustained contact push ──
            if (this.collisionTireMarks && this.tireMarkEnabled && closingSpeed > 5) {
                this._collisionHitTimer = Math.max(this._collisionHitTimer, 0.05);
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  PLAYER-VEHICLE MASS INTERACTION
    // ════════════════════════════════════════════════════

    /**
     * Handle mass-based collision between this vehicle and MovementController2D players.
     * If the player is lighter than the vehicle, the vehicle pushes the player
     * instead of bouncing off them. If the player has a Rigidbody, its mass is used;
     * otherwise defaults to mass 1.0.
     * 
     * This also compensates for players with dynamic Rigidbodies - the standard
     * two-body response may still impart unwanted impulse to heavy vehicles from
     * light players, so we apply additional compensation here.
     */
    _handlePlayerVehicleCollision(rb, prevVelX, prevVelY, dt) {
        const vehicleMass = (rb.mass) ? rb.mass : 1.0;
        const vehicleSpeed = Math.sqrt(this._velX * this._velX + this._velY * this._velY);

        for (const col of rb.currentCollisions) {
            if (col.type !== 'solid' || !col.object || !col.object.getModule) continue;

            const mc2d = col.object.getModule('MovementController2D');
            if (!mc2d) continue;

            // Determine player mass from their Rigidbody (if present)
            const playerRb = col.object.getModule('Rigidbody');
            const playerMass = (playerRb && playerRb.mass) ? playerRb.mass : 1.0;

            if (playerMass >= vehicleMass) continue; // player is heavier or equal — default behavior is fine

            const massRatio = playerMass / vehicleMass; // 0..1, smaller = lighter player
            
            // ── Reduce the collision impulse the vehicle received from the lighter player ──
            // A light player walking into a heavy vehicle shouldn't push it much
            // This applies REGARDLESS of whether the player has a dynamic Rigidbody
            const dvx = this._velX - prevVelX;
            const dvy = this._velY - prevVelY;
            const impulseMag = Math.sqrt(dvx * dvx + dvy * dvy);

            if (impulseMag > 0.5) {
                // Scale down the impulse by mass ratio (lighter player = less effect on vehicle)
                // For extreme mass differences (player < 1/3 vehicle mass), nearly cancel the impulse
                const extremeThreshold = 3.0;
                let compensationFactor = 1 - massRatio;
                if (massRatio < 1 / extremeThreshold) {
                    // Even stronger compensation for very light players
                    compensationFactor = 1 - (massRatio * massRatio * extremeThreshold * extremeThreshold);
                }
                this._velX -= dvx * compensationFactor;
                this._velY -= dvy * compensationFactor;
            }

            // ── Push the player if the vehicle is moving ──
            // Only apply additional push if player doesn't have a dynamic Rigidbody
            // (players with dynamic Rigidbody get pushed by the standard collision response)
            if (vehicleSpeed > 2 && (!playerRb || playerRb.isKinematic)) {
                const pushStrength = 1 - massRatio; // heavier vehicle = stronger push

                // Add vehicle momentum as impulse (don't overwrite existing velocity)
                mc2d.velocityX += this._velX * pushStrength * 0.5;
                mc2d.velocityY += this._velY * pushStrength * 0.5;
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════

    _getRigidbody() {
        if (this._rb) return this._rb;
        if (this.gameObject && this.gameObject.getModule) {
            this._rb = this.gameObject.getModule('Rigidbody');
        }
        return this._rb || null;
    }

    _moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) return target;
        return current + Math.sign(target - current) * maxDelta;
    }

    _convertSpeed(pxPerSec) {
        switch (this.speedUnit) {
            case 'km/h': return pxPerSec * 0.36;   // rough 1px ≈ 1mm → *3.6 / 10 
            case 'mph': return pxPerSec * 0.2237;
            default: return pxPerSec;
        }
    }

    // Public API methods for scripts

    /** Get current speed in px/s (signed: positive = forward, negative = reverse) */
    getSpeed() { return this._currentSpeed; }

    /** Get absolute speed in px/s */
    getAbsoluteSpeed() { return Math.abs(this._currentSpeed); }

    /** Get speed in the configured display unit */
    getDisplaySpeed() { return this._convertSpeed(Math.abs(this._currentSpeed)); }

    /** Get current gear (-1 = reverse, 1-N = forward gears) */
    getCurrentGear() { return this._currentGear; }

    /** Get current engine RPM */
    getRPM() { return this._currentRPM; }

    /** Is the vehicle currently drifting? */
    isDrifting() { return this._isDrifting; }

    /** Is boost currently active? */
    isBoosting() { return this._isBoosting; }

    /** Get drift boost charge (0 to driftBoostMaxCharge) */
    getBoostCharge() { return this._driftBoostCharge; }

    /** Get current slip angle in degrees */
    getSlipAngle() { return this._slipAngle; }

    /** Is the vehicle grounded? (delegates to Rigidbody) */
    isGrounded() { const rb = this._getRigidbody(); return rb ? rb.isGrounded : true; }

    /** Manually trigger a boost (e.g. from a pickup) */
    triggerBoost(force, duration) {
        this.driftBoostForce = force || this.driftBoostForce;
        this.driftBoostDuration = duration || this.driftBoostDuration;
        this._activateBoost();
    }

    /** Set throttle programmatically (0-1) for AI controllers */
    setThrottle(val) { this._throttle = Math.max(0, Math.min(1, val)); }

    /** Set brake programmatically (0-1) for AI controllers */
    setBrake(val) { this._brakeInput = Math.max(0, Math.min(1, val)); }

    /** Set steering programmatically (-1 to 1) for AI controllers */
    setSteering(val) { this._steerInput = Math.max(-1, Math.min(1, val)); }

    /** Set handbrake programmatically for AI controllers */
    setHandbrake(active) { this._handbrakeInput = !!active; }
    
    // ══════════════════════════════════════════════════════
    //  CONVENIENCE AI CONTROL METHODS
    // ══════════════════════════════════════════════════════
    
    /**
     * Accelerate by a given amount (0-1)
     * @param {number} amount - Throttle amount (0-1), defaults to 1
     */
    accelerate(amount = 1) {
        this.setThrottle(Math.max(0, Math.min(1, amount)));
        this.setBrake(0);
    }
    
    /**
     * Reverse by a given amount (0-1)
     * Note: Vehicle must be nearly stopped to engage reverse
     * @param {number} amount - Reverse throttle amount (0-1), defaults to 1
     */
    reverse(amount = 1) {
        // In the physics system, reverse is handled by negative gear
        // This function applies brake to slow down, then throttle in reverse
        if (Math.abs(this._currentSpeed) < 5) {
            this._currentGear = -1;
            this.setThrottle(Math.max(0, Math.min(1, amount)));
            this.setBrake(0);
        } else {
            // Need to brake first
            this.setThrottle(0);
            this.setBrake(amount);
        }
    }
    
    /**
     * Turn left by a given amount
     * @param {number} amount - Turn amount (0-1), defaults to 1
     */
    turnLeft(amount = 1) {
        this.setSteering(-Math.max(0, Math.min(1, amount)));
    }
    
    /**
     * Turn right by a given amount
     * @param {number} amount - Turn amount (0-1), defaults to 1
     */
    turnRight(amount = 1) {
        this.setSteering(Math.max(0, Math.min(1, amount)));
    }
    
    /**
     * Center the steering
     */
    straighten() {
        this.setSteering(0);
    }
    
    /**
     * Stop the vehicle (apply brakes)
     * @param {number} amount - Brake amount (0-1), defaults to 1
     */
    stopVehicle(amount = 1) {
        this.setThrottle(0);
        this.setBrake(Math.max(0, Math.min(1, amount)));
    }
    
    /**
     * Get the vehicle's current heading angle in radians
     * @returns {number} Heading angle in radians
     */
    getHeadingRadians() {
        return this.gameObject.angle * (Math.PI / 180);
    }
    
    /**
     * Get the vehicle's current heading angle in degrees
     * @returns {number} Heading angle in degrees
     */
    getHeadingDegrees() {
        return this.gameObject.angle;
    }
    
    /**
     * Get the vehicle's velocity vector
     * @returns {{x: number, y: number}} Velocity in pixels per second
     */
    getVelocity() {
        return { x: this._velX, y: this._velY };
    }
    
    /**
     * Get the vehicle's forward direction vector (normalized)
     * @returns {{x: number, y: number}} Forward direction
     */
    getForwardDirection() {
        const angleRad = this.gameObject.angle * (Math.PI / 180);
        return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    }
    
    /**
     * Get the current occupant of the vehicle
     * @returns {Module|null} The occupant (usually a MovementController2D or MovementController2DBrain)
     */
    getOccupant() {
        return this._occupant || null;
    }
    
    /**
     * Set the occupant of the vehicle
     * @param {Module|null} occupant - The occupant module or null to clear
     */
    setOccupant(occupant) {
        this._occupant = occupant;
    }
    
    /**
     * Check if the vehicle can be entered (is not occupied and interaction is enabled)
     * @returns {boolean}
     */
    canBeEntered() {
        return this.vehicleInteractionEnabled && !this._occupant;
    }

    /** Get the driver door position in world coordinates */
    getDriverDoorWorldPosition() {
        const pos = this.gameObject.position;
        const angleRad = this.gameObject.angle * (Math.PI / 180);
        const fwdX = Math.cos(angleRad);
        const fwdY = Math.sin(angleRad);
        const rightX = -Math.sin(angleRad);
        const rightY = Math.cos(angleRad);
        // Left side = negative right, Right side = positive right
        const lateralSign = this.driverSide === 'left' ? -1 : 1;
        return {
            x: pos.x + fwdX * this.doorOffsetForward + rightX * (lateralSign * this.doorOffsetLateral),
            y: pos.y + fwdY * this.doorOffsetForward + rightY * (lateralSign * this.doorOffsetLateral)
        };
    }

    /** 
     * Get the exit position in world coordinates
     * Smart exit: tries driver side first, then passenger side, then front
     * @param {string} [preferredSide] - Force a specific side ('left', 'right', 'front')
     * @returns {{x: number, y: number, side: string}} Exit position and which side was used
     */
    getExitWorldPosition(preferredSide) {
        const pos = this.gameObject.position;
        const angleRad = this.gameObject.angle * (Math.PI / 180);
        const fwdX = Math.cos(angleRad);
        const fwdY = Math.sin(angleRad);
        const rightX = -Math.sin(angleRad);
        const rightY = Math.cos(angleRad);
        const exitDist = this.doorOffsetLateral + 20; // extra clearance
        
        // Calculate all possible exit positions
        const driverSideSign = this.driverSide === 'left' ? -1 : 1;
        const passengerSideSign = -driverSideSign;
        
        const exitPositions = {
            driver: {
                x: pos.x + fwdX * this.doorOffsetForward + rightX * (driverSideSign * exitDist),
                y: pos.y + fwdY * this.doorOffsetForward + rightY * (driverSideSign * exitDist),
                side: this.driverSide
            },
            passenger: {
                x: pos.x + fwdX * this.doorOffsetForward + rightX * (passengerSideSign * exitDist),
                y: pos.y + fwdY * this.doorOffsetForward + rightY * (passengerSideSign * exitDist),
                side: this.driverSide === 'left' ? 'right' : 'left'
            },
            front: {
                x: pos.x + fwdX * (this.doorOffsetForward - exitDist - 10),
                y: pos.y + fwdY * (this.doorOffsetForward - exitDist - 10),
                side: 'front'
            }
        };
        
        // If preferred side specified, return that
        if (preferredSide === 'left') {
            return this.driverSide === 'left' ? exitPositions.driver : exitPositions.passenger;
        } else if (preferredSide === 'right') {
            return this.driverSide === 'right' ? exitPositions.driver : exitPositions.passenger;
        } else if (preferredSide === 'front') {
            return exitPositions.front;
        }
        
        // Smart exit: check each position for collisions
        const checkRadius = 15; // radius to check for blocking colliders
        
        // Try driver side first
        if (!this._isPositionBlocked(exitPositions.driver.x, exitPositions.driver.y, checkRadius)) {
            return exitPositions.driver;
        }
        
        // Try passenger side
        if (!this._isPositionBlocked(exitPositions.passenger.x, exitPositions.passenger.y, checkRadius)) {
            return exitPositions.passenger;
        }
        
        // Try front
        if (!this._isPositionBlocked(exitPositions.front.x, exitPositions.front.y, checkRadius)) {
            return exitPositions.front;
        }
        
        // All blocked - return driver side anyway (player will have to deal with it)
        return exitPositions.driver;
    }
    
    /**
     * Check if a world position is blocked by a solid collider
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} radius - Check radius
     * @returns {boolean} True if blocked
     * @private
     */
    _isPositionBlocked(x, y, radius) {
        // Use raycast or collision check if available
        if (typeof checkCollisionAt === 'function') {
            const hit = checkCollisionAt(x, y, 'solid', this.gameObject);
            if (hit) return true;
        }
        
        // Also check with collidersAtPoint if available
        if (typeof collidersAtPoint === 'function') {
            const hits = collidersAtPoint(x, y, null, this.gameObject);
            if (hits && hits.length > 0) {
                // Check if any have solid tag or are static
                for (const hit of hits) {
                    const rb = hit.getModule ? hit.getModule('Rigidbody') : null;
                    if (rb && rb.bodyType === 'static') return true;
                    const collider = hit.getModule ? hit.getModule('Collider') : null;
                    if (collider && collider.tag === 'solid') return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get the passenger door position in world coordinates (opposite of driver side)
     * @returns {{x: number, y: number}}
     */
    getPassengerDoorWorldPosition() {
        const pos = this.gameObject.position;
        const angleRad = this.gameObject.angle * (Math.PI / 180);
        const fwdX = Math.cos(angleRad);
        const fwdY = Math.sin(angleRad);
        const rightX = -Math.sin(angleRad);
        const rightY = Math.cos(angleRad);
        // Passenger side is opposite of driver side
        const lateralSign = this.driverSide === 'left' ? 1 : -1;
        return {
            x: pos.x + fwdX * this.doorOffsetForward + rightX * (lateralSign * this.doorOffsetLateral),
            y: pos.y + fwdY * this.doorOffsetForward + rightY * (lateralSign * this.doorOffsetLateral)
        };
    }
    
    /**
     * Get the nearest door position to a given world point
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{x: number, y: number, side: string}} Door position and which side ('left' or 'right')
     */
    getNearestDoorPosition(worldX, worldY) {
        const driverDoor = this.getDriverDoorWorldPosition();
        const passengerDoor = this.getPassengerDoorWorldPosition();
        
        const driverDist = Math.sqrt(
            Math.pow(worldX - driverDoor.x, 2) + Math.pow(worldY - driverDoor.y, 2)
        );
        const passengerDist = Math.sqrt(
            Math.pow(worldX - passengerDoor.x, 2) + Math.pow(worldY - passengerDoor.y, 2)
        );
        
        if (driverDist <= passengerDist) {
            return { ...driverDoor, side: this.driverSide };
        } else {
            return { ...passengerDoor, side: this.driverSide === 'left' ? 'right' : 'left' };
        }
    }
    
    /**
     * Trigger door animation on the VehicleControllerRenderer if present
     * @param {'left'|'right'} side - Which door to animate
     */
    triggerDoorAnimation(side = 'left') {
        const renderer = this.getModule('VehicleControllerRenderer');
        if (renderer && renderer.playDoorAnimation) {
            renderer.playDoorAnimation(side);
        }
    }

    /** Is this vehicle currently occupied by a player? */
    isOccupied() { return !!this._occupant; }

    // ════════════════════════════════════════════════════
    //  SERIALIZATION
    // ════════════════════════════════════════════════════

    toJSON() {
        const json = super.toJSON();
        json.type = 'VehicleController';

        // Vehicle preset
        json.vehiclePreset = this.vehiclePreset;

        json.playerControlled = this.playerControlled;

        // Engine
        json.enginePower = this.enginePower;
        json.reversePower = this.reversePower;
        json.brakePower = this.brakePower;
        json.idleRPM = this.idleRPM;
        json.maxRPM = this.maxRPM;
        json.redlineRPM = this.redlineRPM;
        json.vehicleWeightKg = this.vehicleWeightKg;
        json.transmissionType = this.transmissionType;
        json.gearCount = this.gearCount;
        json.gearConfigMode = this.gearConfigMode;
        json.gearRatios = [...this.gearRatios];
        json.gearMaxSpeeds = [...this.gearMaxSpeeds];
        json.reverseGearRatio = this.reverseGearRatio;
        json.reverseMaxSpeed = this.reverseMaxSpeed;
        json.finalDriveRatio = this.finalDriveRatio;
        json.shiftUpRPM = this.shiftUpRPM;
        json.shiftDownRPM = this.shiftDownRPM;
        json.shiftTime = this.shiftTime;
        json.shiftTimePerGear = this.shiftTimePerGear;
        json.gearShiftAccelLoss = this.gearShiftAccelLoss;
        json.fullThrottleRevTime = this.fullThrottleRevTime;

        // Steering
        json.maxSteerAngle = this.maxSteerAngle;
        json.steerSpeed = this.steerSpeed;
        json.steerReturnSpeed = this.steerReturnSpeed;
        json.counterSteerFactor = this.counterSteerFactor;
        json.speedSensitiveSteering = this.speedSensitiveSteering;
        json.minSteerAtSpeed = this.minSteerAtSpeed;

        // Grip
        json.frontGrip = this.frontGrip;
        json.rearGrip = this.rearGrip;
        json.tyreGripRating = this.tyreGripRating;
        json.gripFalloffSpeed = this.gripFalloffSpeed;
        json.gripMinMultiplier = this.gripMinMultiplier;

        // Drift
        json.driftEnabled = this.driftEnabled;
        json.driftTrigger = this.driftTrigger;
        json.driftGripMultiplier = this.driftGripMultiplier;
        json.driftSteerMultiplier = this.driftSteerMultiplier;
        json.driftCounterSteer = this.driftCounterSteer;
        json.driftBoostEnabled = this.driftBoostEnabled;
        json.driftBoostChargeRate = this.driftBoostChargeRate;
        json.driftBoostMaxCharge = this.driftBoostMaxCharge;
        json.driftBoostForce = this.driftBoostForce;
        json.driftBoostDuration = this.driftBoostDuration;

        // High-Speed Momentum
        json.highSpeedMomentum = this.highSpeedMomentum;
        json.momentumSpeedThreshold = this.momentumSpeedThreshold;
        json.driftMomentumRetention = this.driftMomentumRetention;
        json.weightMomentumFactor = this.weightMomentumFactor;
        json.powerOvercomeMomentum = this.powerOvercomeMomentum;
        json.momentumRecoveryRate = this.momentumRecoveryRate;
        json.momentumSlideFriction = this.momentumSlideFriction;

        // Drag
        json.linearDrag = this.linearDrag;
        json.angularDrag = this.angularDrag;
        json.rollingResistance = this.rollingResistance;
        json.airResistanceCoeff = this.airResistanceCoeff;

        // Hover
        json.hoverEnabled = this.hoverEnabled;
        json.hoverHeight = this.hoverHeight;
        json.hoverFrequency = this.hoverFrequency;
        json.hoverSlipFactor = this.hoverSlipFactor;
        json.hoverTiltAmount = this.hoverTiltAmount;

        // Boat
        json.boatMode = this.boatMode;
        json.waterDrag = this.waterDrag;
        json.waveSway = this.waveSway;
        json.waveFrequency = this.waveFrequency;

        // Tank
        json.tankSteering = this.tankSteering;
        json.tankTurnSpeed = this.tankTurnSpeed;
        json.tankTurnBraking = this.tankTurnBraking;

        // Speed limits
        json.topSpeed = this.topSpeed;
        json.reverseTopSpeed = this.reverseTopSpeed;
        json.speedUnit = this.speedUnit;

        // Handbrake
        json.handbrakeStrength = this.handbrakeStrength;
        json.handbrakeSlideFriction = this.handbrakeSlideFriction;

        // Reverse-Acceleration
        json.reverseAccelTractionLoss = this.reverseAccelTractionLoss;
        json.reverseAccelGripMultiplier = this.reverseAccelGripMultiplier;

        // Collision Response
        json.vehicleCollisionMode = this.vehicleCollisionMode;
        json.collisionForwardBias = this.collisionForwardBias;
        json.collisionSpinEnabled = this.collisionSpinEnabled;
        json.collisionTireMarks = this.collisionTireMarks;
        json.collisionTireMarkDuration = this.collisionTireMarkDuration;
        json.stationaryFriction = this.stationaryFriction;
        json.collisionMomentumLoss = this.collisionMomentumLoss;
        json.useCollisionWorker = this.useCollisionWorker;

        // Physics Scale
        json.physicsScale = this.physicsScale;

        // Angle snapping
        json.angleSnapping = this.angleSnapping;
        json.angleSnapDivisions = this.angleSnapDivisions;
        json.angleSnapSpeed = this.angleSnapSpeed;
        json.angleSnapStrength = this.angleSnapStrength;

        // Visual
        json.rotateToVelocity = this.rotateToVelocity;
        json.bodyRollAmount = this.bodyRollAmount;
        json.exhaustParticles = this.exhaustParticles;
        json.exhaustColor = this.exhaustColor;
        json.exhaustColorEnd = this.exhaustColorEnd;
        json.tireMarkEnabled = this.tireMarkEnabled;
        json.tireMarkColor = this.tireMarkColor;
        json.tireMarkAlpha = this.tireMarkAlpha;
        json.tireMarkWidth = this.tireMarkWidth;

        // Audio
        json.engineSound = this.engineSound;
        json.brakeSound = this.brakeSound;
        json.driftSound = this.driftSound;
        json.boostSound = this.boostSound;
        json.shiftSound = this.shiftSound;

        json.spatialMaxDistance = this.spatialMaxDistance;
        json.spatialMinDistance = this.spatialMinDistance;
        json.spatialRolloff = this.spatialRolloff;
        json.spatialAudioEnabled = this.spatialAudioEnabled;

        // Generated Audio
        json.enableGeneratedEngineSound = this.enableGeneratedEngineSound;
        json.engineSoundVolume = this.engineSoundVolume;
        json.engineBaseTone = this.engineBaseTone;
        json.engineHarmonics = this.engineHarmonics;
        json.engineExhaustNoise = this.engineExhaustNoise;
        json.engineResonance = this.engineResonance;
        json.engineVibratoDepth = this.engineVibratoDepth;
        json.engineVibratoRate = this.engineVibratoRate;
        json.enginePitchRange = this.enginePitchRange;
        // Engine Tone Shaping
        json.engineWaveformBrightness = this.engineWaveformBrightness;
        json.engineFilterQ = this.engineFilterQ;
        json.engineHarmonicDecay = this.engineHarmonicDecay;
        json.engineDetuneSpread = this.engineDetuneSpread;
        json.engineSaturation = this.engineSaturation;
        json.engineRPMSmoothing = this.engineRPMSmoothing;
        // Engine Sound Effects
        json.engineVolumePhaserEnabled = this.engineVolumePhaserEnabled;
        json.engineVolumePhaserDepth = this.engineVolumePhaserDepth;
        json.engineVolumePhaserRate = this.engineVolumePhaserRate;
        json.engineDistortionAmount = this.engineDistortionAmount;
        json.engineMufflerEnabled = this.engineMufflerEnabled;
        json.engineMufflerCutoff = this.engineMufflerCutoff;
        json.engineMufflerResonance = this.engineMufflerResonance;
        json.engineReverbEnabled = this.engineReverbEnabled;
        json.engineReverbMix = this.engineReverbMix;
        json.engineReverbDecay = this.engineReverbDecay;
        json.enableHandbrakeSound = this.enableHandbrakeSound;
        json.handbrakeSoundVolume = this.handbrakeSoundVolume;
        json.handbrakeSoundTone = this.handbrakeSoundTone;
        json.handbrakeSoundSharpness = this.handbrakeSoundSharpness;
        // Crash Sound
        json.enableCrashSound = this.enableCrashSound;
        json.crashSoundVolume = this.crashSoundVolume;
        json.crashLowFrequency = this.crashLowFrequency;
        json.crashHighFrequency = this.crashHighFrequency;
        json.crashLowHighMix = this.crashLowHighMix;
        json.crashNoiseAmount = this.crashNoiseAmount;
        json.crashDecayTime = this.crashDecayTime;
        json.crashMinSpeed = this.crashMinSpeed;

        // Input
        json.keyAccelerate = this.keyAccelerate;
        json.keyBrake = this.keyBrake;
        json.keySteerLeft = this.keySteerLeft;
        json.keySteerRight = this.keySteerRight;
        json.keyHandbrake = this.keyHandbrake;
        json.keyClutch = this.keyClutch;
        json.keyShiftUp = this.keyShiftUp;
        json.keyShiftDown = this.keyShiftDown;
        json.keyBoost = this.keyBoost;

        // Clutch
        json.clutchEnabled = this.clutchEnabled;
        json.clutchRevBounceAmount = this.clutchRevBounceAmount;
        json.clutchRevBounceDuration = this.clutchRevBounceDuration;
        json.clutchLaunchPowerThreshold = this.clutchLaunchPowerThreshold;
        json.clutchDumpTractionLoss = this.clutchDumpTractionLoss;
        json.clutchDumpDuration = this.clutchDumpDuration;
        json.clutchHighRPMThreshold = this.clutchHighRPMThreshold;
        json.clutchDumpDrift = this.clutchDumpDrift;

        // Gamepad
        json.useGamepad = this.useGamepad;
        json.gamepadIndex = this.gamepadIndex;
        json.gamepadAccelAxis = this.gamepadAccelAxis;
        json.gamepadBrakeAxis = this.gamepadBrakeAxis;
        json.gamepadSteerAxis = this.gamepadSteerAxis;
        json.gamepadHandbrakeBtn = this.gamepadHandbrakeBtn;
        json.gamepadBoostBtn = this.gamepadBoostBtn;

        // Debug
        json.debugDraw = this.debugDraw;

        // Vehicle Interaction
        json.vehicleInteractionEnabled = this.vehicleInteractionEnabled;
        json.driverSide = this.driverSide;
        json.doorOffsetForward = this.doorOffsetForward;
        json.doorOffsetLateral = this.doorOffsetLateral;
        json.occupantPrefab = this.occupantPrefab;

        return json;
    }

    static fromJSON(json) {
        const m = new VehicleController();
        m.enabled = json.enabled ?? true;

        m.vehiclePreset = json.vehiclePreset || 'sport';
        m.playerControlled = json.playerControlled ?? true;

        // Engine
        m.enginePower = json.enginePower ?? 300;
        m.reversePower = json.reversePower ?? 150;
        m.brakePower = json.brakePower ?? 1800;
        m.idleRPM = json.idleRPM ?? 800;
        m.maxRPM = json.maxRPM ?? 7000;
        m.redlineRPM = json.redlineRPM ?? 6800;
        m.vehicleWeightKg = json.vehicleWeightKg ?? 1400;

        // Transmission
        m.transmissionType = json.transmissionType || 'automatic';
        m.gearCount = json.gearCount ?? 5;
        m.gearConfigMode = json.gearConfigMode || 'maxSpeed';
        m.gearRatios = json.gearRatios ? [...json.gearRatios] : [3.6, 2.4, 1.65, 1.1, 0.8];
        m.gearMaxSpeeds = json.gearMaxSpeeds ? [...json.gearMaxSpeeds] : [60, 100, 150, 200, 280];
        m.reverseGearRatio = json.reverseGearRatio ?? 3.2;
        m.reverseMaxSpeed = json.reverseMaxSpeed ?? 40;
        m.finalDriveRatio = json.finalDriveRatio ?? 3.5;
        m.shiftUpRPM = json.shiftUpRPM ?? 6200;
        m.shiftDownRPM = json.shiftDownRPM ?? 2500;
        m.shiftTime = json.shiftTime ?? 0.15;
        m.shiftTimePerGear = json.shiftTimePerGear ?? 0.05;
        m.gearShiftAccelLoss = json.gearShiftAccelLoss ?? 0.85;
        m.fullThrottleRevTime = json.fullThrottleRevTime ?? 4.0;

        // Steering
        m.maxSteerAngle = json.maxSteerAngle ?? 35;
        m.steerSpeed = json.steerSpeed ?? 3.5;
        m.steerReturnSpeed = json.steerReturnSpeed ?? 5.0;
        m.counterSteerFactor = json.counterSteerFactor ?? 1.5;
        m.speedSensitiveSteering = json.speedSensitiveSteering ?? true;
        m.minSteerAtSpeed = json.minSteerAtSpeed ?? 0.3;

        // Grip
        m.frontGrip = json.frontGrip ?? 1.0;
        m.rearGrip = json.rearGrip ?? 1.0;
        m.tyreGripRating = json.tyreGripRating ?? 1.0;
        m.gripFalloffSpeed = json.gripFalloffSpeed ?? 400;
        m.gripMinMultiplier = json.gripMinMultiplier ?? 0.5;

        // Drift
        m.driftEnabled = json.driftEnabled ?? true;
        m.driftTrigger = json.driftTrigger || 'handbrake';
        m.driftGripMultiplier = json.driftGripMultiplier ?? 0.35;
        m.driftSteerMultiplier = json.driftSteerMultiplier ?? 1.6;
        m.driftCounterSteer = json.driftCounterSteer ?? true;
        m.driftBoostEnabled = json.driftBoostEnabled ?? true;
        m.driftBoostChargeRate = json.driftBoostChargeRate ?? 150;
        m.driftBoostMaxCharge = json.driftBoostMaxCharge ?? 500;
        m.driftBoostForce = json.driftBoostForce ?? 2000;
        m.driftBoostDuration = json.driftBoostDuration ?? 0.4;

        // High-Speed Momentum
        m.highSpeedMomentum = json.highSpeedMomentum ?? 0.7;
        m.momentumSpeedThreshold = json.momentumSpeedThreshold ?? 120;
        m.driftMomentumRetention = json.driftMomentumRetention ?? 0.85;
        m.weightMomentumFactor = json.weightMomentumFactor ?? 1.0;
        m.powerOvercomeMomentum = json.powerOvercomeMomentum ?? 0.5;
        m.momentumRecoveryRate = json.momentumRecoveryRate ?? 2.0;
        m.momentumSlideFriction = json.momentumSlideFriction ?? 0.8;

        // Drag
        m.linearDrag = json.linearDrag ?? 0.5;
        m.angularDrag = json.angularDrag ?? 4.0;
        m.rollingResistance = json.rollingResistance ?? 0.015;
        m.airResistanceCoeff = json.airResistanceCoeff ?? 0.0005;

        // Hover
        m.hoverEnabled = json.hoverEnabled ?? false;
        m.hoverHeight = json.hoverHeight ?? 30;
        m.hoverFrequency = json.hoverFrequency ?? 2.5;
        m.hoverSlipFactor = json.hoverSlipFactor ?? 0.6;
        m.hoverTiltAmount = json.hoverTiltAmount ?? 8;

        // Boat
        m.boatMode = json.boatMode ?? false;
        m.waterDrag = json.waterDrag ?? 1.2;
        m.waveSway = json.waveSway ?? 3.0;
        m.waveFrequency = json.waveFrequency ?? 1.0;

        // Tank
        m.tankSteering = json.tankSteering ?? false;
        m.tankTurnSpeed = json.tankTurnSpeed ?? 180;
        m.tankTurnBraking = json.tankTurnBraking ?? 0.6;

        // Speed
        m.topSpeed = json.topSpeed ?? 280;
        m.reverseTopSpeed = json.reverseTopSpeed ?? 40;
        m.speedUnit = json.speedUnit || 'km/h';

        // Handbrake
        m.handbrakeStrength = json.handbrakeStrength ?? 0.3;
        m.handbrakeSlideFriction = json.handbrakeSlideFriction ?? 1.5;

        // Reverse-Acceleration
        m.reverseAccelTractionLoss = json.reverseAccelTractionLoss ?? true;
        m.reverseAccelGripMultiplier = json.reverseAccelGripMultiplier ?? 0.5;

        // Collision Response
        m.vehicleCollisionMode = json.vehicleCollisionMode ?? 'rigidbody';
        m.collisionForwardBias = json.collisionForwardBias ?? 0.6;
        m.collisionSpinEnabled = json.collisionSpinEnabled ?? true;
        m.collisionTireMarks = json.collisionTireMarks ?? true;
        m.collisionTireMarkDuration = json.collisionTireMarkDuration ?? 0.3;
        m.stationaryFriction = json.stationaryFriction ?? 0.6;
        m.collisionMomentumLoss = json.collisionMomentumLoss ?? 0.6;
        m.useCollisionWorker = json.useCollisionWorker ?? false;

        // Physics Scale
        m.physicsScale = json.physicsScale ?? 1.0;

        // Angle snapping
        m.angleSnapping = json.angleSnapping ?? false;
        m.angleSnapDivisions = json.angleSnapDivisions ?? 8;
        m.angleSnapSpeed = json.angleSnapSpeed ?? 60;
        m.angleSnapStrength = json.angleSnapStrength ?? 3.0;

        // Visual
        m.rotateToVelocity = json.rotateToVelocity ?? true;
        m.bodyRollAmount = json.bodyRollAmount ?? 0;
        m.exhaustParticles = json.exhaustParticles ?? false;
        m.exhaustColor = json.exhaustColor || '#666666';
        m.exhaustColorEnd = json.exhaustColorEnd || '#222222';
        m.tireMarkEnabled = json.tireMarkEnabled ?? true;
        m.tireMarkColor = json.tireMarkColor || '#333333';
        m.tireMarkAlpha = json.tireMarkAlpha ?? 0.4;
        m.tireMarkWidth = json.tireMarkWidth ?? 3;

        // Audio
        m.engineSound = json.engineSound || '';
        m.brakeSound = json.brakeSound || '';
        m.driftSound = json.driftSound || '';
        m.boostSound = json.boostSound || '';
        m.shiftSound = json.shiftSound || '';

        m.spatialAudioEnabled = json.spatialAudioEnabled ?? true;
        m.spatialMaxDistance = json.spatialMaxDistance ?? 500;
        m.spatialMinDistance = json.spatialMinDistance ?? 100;
        m.spatialRolloff = json.spatialRolloff || 'linear';

        // Generated Audio
        m.enableGeneratedEngineSound = json.enableGeneratedEngineSound ?? false;
        m.engineSoundVolume = json.engineSoundVolume ?? 0.5;
        m.engineBaseTone = json.engineBaseTone ?? 85;
        m.engineHarmonics = json.engineHarmonics ?? 4;
        m.engineExhaustNoise = json.engineExhaustNoise ?? 0.15;
        m.engineResonance = json.engineResonance ?? 800;
        m.engineVibratoDepth = json.engineVibratoDepth ?? 3;
        m.engineVibratoRate = json.engineVibratoRate ?? 6;
        m.enginePitchRange = json.enginePitchRange ?? 3.0;
        // Engine Tone Shaping
        m.engineWaveformBrightness = json.engineWaveformBrightness ?? 0.4;
        m.engineFilterQ = json.engineFilterQ ?? 0.7;
        m.engineHarmonicDecay = json.engineHarmonicDecay ?? 1.5;
        m.engineDetuneSpread = json.engineDetuneSpread ?? 16;
        m.engineSaturation = json.engineSaturation ?? 1.4;
        m.engineRPMSmoothing = json.engineRPMSmoothing ?? 0.08;
        // Engine Sound Effects
        m.engineVolumePhaserEnabled = json.engineVolumePhaserEnabled ?? false;
        m.engineVolumePhaserDepth = json.engineVolumePhaserDepth ?? 0.3;
        m.engineVolumePhaserRate = json.engineVolumePhaserRate ?? 4;
        m.engineDistortionAmount = json.engineDistortionAmount ?? 0;
        m.engineMufflerEnabled = json.engineMufflerEnabled ?? false;
        m.engineMufflerCutoff = json.engineMufflerCutoff ?? 600;
        m.engineMufflerResonance = json.engineMufflerResonance ?? 2;
        m.engineReverbEnabled = json.engineReverbEnabled ?? false;
        m.engineReverbMix = json.engineReverbMix ?? 0.2;
        m.engineReverbDecay = json.engineReverbDecay ?? 0.8;
        m.enableHandbrakeSound = json.enableHandbrakeSound ?? false;
        m.handbrakeSoundVolume = json.handbrakeSoundVolume ?? 0.4;
        m.handbrakeSoundTone = json.handbrakeSoundTone ?? 300;
        m.handbrakeSoundSharpness = json.handbrakeSoundSharpness ?? 5;
        // Crash Sound
        m.enableCrashSound = json.enableCrashSound ?? false;
        m.crashSoundVolume = json.crashSoundVolume ?? 0.6;
        m.crashLowFrequency = json.crashLowFrequency ?? 80;
        m.crashHighFrequency = json.crashHighFrequency ?? 2500;
        m.crashLowHighMix = json.crashLowHighMix ?? 0.5;
        m.crashNoiseAmount = json.crashNoiseAmount ?? 0.4;
        m.crashDecayTime = json.crashDecayTime ?? 0.3;
        m.crashMinSpeed = json.crashMinSpeed ?? 30;

        // Input
        m.keyAccelerate = json.keyAccelerate || 'ArrowUp';
        m.keyBrake = json.keyBrake || 'ArrowDown';
        m.keySteerLeft = json.keySteerLeft || 'ArrowLeft';
        m.keySteerRight = json.keySteerRight || 'ArrowRight';
        m.keyHandbrake = json.keyHandbrake || 'Space';
        m.keyClutch = json.keyClutch || 'KeyC';
        m.keyShiftUp = json.keyShiftUp || 'KeyE';
        m.keyShiftDown = json.keyShiftDown || 'KeyQ';
        m.keyBoost = json.keyBoost || 'ShiftLeft';

        // Clutch
        m.clutchEnabled = json.clutchEnabled ?? true;
        m.clutchRevBounceAmount = json.clutchRevBounceAmount ?? 0.15;
        m.clutchRevBounceDuration = json.clutchRevBounceDuration ?? 0.08;
        m.clutchLaunchPowerThreshold = json.clutchLaunchPowerThreshold ?? 250;
        m.clutchDumpTractionLoss = json.clutchDumpTractionLoss ?? 0.25;
        m.clutchDumpDuration = json.clutchDumpDuration ?? 0.4;
        m.clutchHighRPMThreshold = json.clutchHighRPMThreshold ?? 0.85;
        m.clutchDumpDrift = json.clutchDumpDrift ?? true;

        // Gamepad
        m.useGamepad = json.useGamepad ?? false;
        m.gamepadIndex = json.gamepadIndex ?? 0;
        m.gamepadAccelAxis = json.gamepadAccelAxis ?? 7;
        m.gamepadBrakeAxis = json.gamepadBrakeAxis ?? 6;
        m.gamepadSteerAxis = json.gamepadSteerAxis ?? 0;
        m.gamepadHandbrakeBtn = json.gamepadHandbrakeBtn ?? 0;
        m.gamepadBoostBtn = json.gamepadBoostBtn ?? 2;

        // Debug
        m.debugDraw = json.debugDraw ?? false;

        // Vehicle Interaction
        m.vehicleInteractionEnabled = json.vehicleInteractionEnabled ?? false;
        m.driverSide = json.driverSide || 'left';
        m.doorOffsetForward = json.doorOffsetForward ?? 0;
        m.doorOffsetLateral = json.doorOffsetLateral ?? 25;
        m.occupantPrefab = json.occupantPrefab || '';

        return m;
    }

    clone() {
        const c = new VehicleController();
        c.enabled = this.enabled;
        c.vehiclePreset = this.vehiclePreset;
        c.playerControlled = this.playerControlled;

        // Engine
        c.enginePower = this.enginePower;
        c.reversePower = this.reversePower;
        c.brakePower = this.brakePower;
        c.idleRPM = this.idleRPM;
        c.maxRPM = this.maxRPM;
        c.redlineRPM = this.redlineRPM;
        c.vehicleWeightKg = this.vehicleWeightKg;

        // Transmission
        c.transmissionType = this.transmissionType;
        c.gearCount = this.gearCount;
        c.gearConfigMode = this.gearConfigMode;
        c.gearRatios = [...this.gearRatios];
        c.gearMaxSpeeds = [...this.gearMaxSpeeds];
        c.reverseGearRatio = this.reverseGearRatio;
        c.reverseMaxSpeed = this.reverseMaxSpeed;
        c.finalDriveRatio = this.finalDriveRatio;
        c.shiftUpRPM = this.shiftUpRPM;
        c.shiftDownRPM = this.shiftDownRPM;
        c.shiftTime = this.shiftTime;
        c.shiftTimePerGear = this.shiftTimePerGear;
        c.gearShiftAccelLoss = this.gearShiftAccelLoss;
        c.fullThrottleRevTime = this.fullThrottleRevTime;

        // Steering
        c.maxSteerAngle = this.maxSteerAngle;
        c.steerSpeed = this.steerSpeed;
        c.steerReturnSpeed = this.steerReturnSpeed;
        c.counterSteerFactor = this.counterSteerFactor;
        c.speedSensitiveSteering = this.speedSensitiveSteering;
        c.minSteerAtSpeed = this.minSteerAtSpeed;

        // Grip
        c.frontGrip = this.frontGrip;
        c.rearGrip = this.rearGrip;
        c.tyreGripRating = this.tyreGripRating;
        c.gripFalloffSpeed = this.gripFalloffSpeed;
        c.gripMinMultiplier = this.gripMinMultiplier;

        // Drift
        c.driftEnabled = this.driftEnabled;
        c.driftTrigger = this.driftTrigger;
        c.driftGripMultiplier = this.driftGripMultiplier;
        c.driftSteerMultiplier = this.driftSteerMultiplier;
        c.driftCounterSteer = this.driftCounterSteer;
        c.driftBoostEnabled = this.driftBoostEnabled;
        c.driftBoostChargeRate = this.driftBoostChargeRate;
        c.driftBoostMaxCharge = this.driftBoostMaxCharge;
        c.driftBoostForce = this.driftBoostForce;
        c.driftBoostDuration = this.driftBoostDuration;

        // High-Speed Momentum
        c.highSpeedMomentum = this.highSpeedMomentum;
        c.momentumSpeedThreshold = this.momentumSpeedThreshold;
        c.driftMomentumRetention = this.driftMomentumRetention;
        c.weightMomentumFactor = this.weightMomentumFactor;
        c.powerOvercomeMomentum = this.powerOvercomeMomentum;
        c.momentumRecoveryRate = this.momentumRecoveryRate;
        c.momentumSlideFriction = this.momentumSlideFriction;

        // Drag
        c.linearDrag = this.linearDrag;
        c.angularDrag = this.angularDrag;
        c.rollingResistance = this.rollingResistance;
        c.airResistanceCoeff = this.airResistanceCoeff;

        // Hover
        c.hoverEnabled = this.hoverEnabled;
        c.hoverHeight = this.hoverHeight;
        c.hoverFrequency = this.hoverFrequency;
        c.hoverSlipFactor = this.hoverSlipFactor;
        c.hoverTiltAmount = this.hoverTiltAmount;

        // Boat
        c.boatMode = this.boatMode;
        c.waterDrag = this.waterDrag;
        c.waveSway = this.waveSway;
        c.waveFrequency = this.waveFrequency;

        // Tank
        c.tankSteering = this.tankSteering;
        c.tankTurnSpeed = this.tankTurnSpeed;
        c.tankTurnBraking = this.tankTurnBraking;

        // Speed
        c.topSpeed = this.topSpeed;
        c.reverseTopSpeed = this.reverseTopSpeed;
        c.speedUnit = this.speedUnit;

        // Handbrake
        c.handbrakeStrength = this.handbrakeStrength;
        c.handbrakeSlideFriction = this.handbrakeSlideFriction;

        // Reverse-Acceleration
        c.reverseAccelTractionLoss = this.reverseAccelTractionLoss;
        c.reverseAccelGripMultiplier = this.reverseAccelGripMultiplier;

        // Collision Response
        c.vehicleCollisionMode = this.vehicleCollisionMode;
        c.collisionForwardBias = this.collisionForwardBias;
        c.collisionSpinEnabled = this.collisionSpinEnabled;
        c.collisionTireMarks = this.collisionTireMarks;
        c.collisionTireMarkDuration = this.collisionTireMarkDuration;
        c.stationaryFriction = this.stationaryFriction;
        c.collisionMomentumLoss = this.collisionMomentumLoss;
        c.useCollisionWorker = this.useCollisionWorker;

        // Physics Scale
        c.physicsScale = this.physicsScale;

        // Angle snapping
        c.angleSnapping = this.angleSnapping;
        c.angleSnapDivisions = this.angleSnapDivisions;
        c.angleSnapSpeed = this.angleSnapSpeed;
        c.angleSnapStrength = this.angleSnapStrength;

        // Visual
        c.rotateToVelocity = this.rotateToVelocity;
        c.bodyRollAmount = this.bodyRollAmount;
        c.exhaustParticles = this.exhaustParticles;
        c.exhaustColor = this.exhaustColor;
        c.exhaustColorEnd = this.exhaustColorEnd;
        c.tireMarkEnabled = this.tireMarkEnabled;
        c.tireMarkColor = this.tireMarkColor;
        c.tireMarkAlpha = this.tireMarkAlpha;
        c.tireMarkWidth = this.tireMarkWidth;

        // Audio
        c.engineSound = this.engineSound;
        c.brakeSound = this.brakeSound;
        c.driftSound = this.driftSound;
        c.boostSound = this.boostSound;
        c.shiftSound = this.shiftSound;

        c.spatialAudioEnabled = this.spatialAudioEnabled;
        c.spatialMaxDistance = this.spatialMaxDistance;
        c.spatialMinDistance = this.spatialMinDistance;
        c.spatialRolloff = this.spatialRolloff;

        // Generated Audio
        c.enableGeneratedEngineSound = this.enableGeneratedEngineSound;
        c.engineSoundVolume = this.engineSoundVolume;
        c.engineBaseTone = this.engineBaseTone;
        c.engineHarmonics = this.engineHarmonics;
        c.engineExhaustNoise = this.engineExhaustNoise;
        c.engineResonance = this.engineResonance;
        c.engineVibratoDepth = this.engineVibratoDepth;
        c.engineVibratoRate = this.engineVibratoRate;
        c.enginePitchRange = this.enginePitchRange;
        // Engine Tone Shaping
        c.engineWaveformBrightness = this.engineWaveformBrightness;
        c.engineFilterQ = this.engineFilterQ;
        c.engineHarmonicDecay = this.engineHarmonicDecay;
        c.engineDetuneSpread = this.engineDetuneSpread;
        c.engineSaturation = this.engineSaturation;
        c.engineRPMSmoothing = this.engineRPMSmoothing;
        // Engine Sound Effects
        c.engineVolumePhaserEnabled = this.engineVolumePhaserEnabled;
        c.engineVolumePhaserDepth = this.engineVolumePhaserDepth;
        c.engineVolumePhaserRate = this.engineVolumePhaserRate;
        c.engineDistortionAmount = this.engineDistortionAmount;
        c.engineMufflerEnabled = this.engineMufflerEnabled;
        c.engineMufflerCutoff = this.engineMufflerCutoff;
        c.engineMufflerResonance = this.engineMufflerResonance;
        c.engineReverbEnabled = this.engineReverbEnabled;
        c.engineReverbMix = this.engineReverbMix;
        c.engineReverbDecay = this.engineReverbDecay;
        c.enableHandbrakeSound = this.enableHandbrakeSound;
        c.handbrakeSoundVolume = this.handbrakeSoundVolume;
        c.handbrakeSoundTone = this.handbrakeSoundTone;
        c.handbrakeSoundSharpness = this.handbrakeSoundSharpness;
        // Crash Sound
        c.enableCrashSound = this.enableCrashSound;
        c.crashSoundVolume = this.crashSoundVolume;
        c.crashLowFrequency = this.crashLowFrequency;
        c.crashHighFrequency = this.crashHighFrequency;
        c.crashLowHighMix = this.crashLowHighMix;
        c.crashNoiseAmount = this.crashNoiseAmount;
        c.crashDecayTime = this.crashDecayTime;
        c.crashMinSpeed = this.crashMinSpeed;

        // Input
        c.keyAccelerate = this.keyAccelerate;
        c.keyBrake = this.keyBrake;
        c.keySteerLeft = this.keySteerLeft;
        c.keySteerRight = this.keySteerRight;
        c.keyHandbrake = this.keyHandbrake;
        c.keyClutch = this.keyClutch;
        c.keyShiftUp = this.keyShiftUp;
        c.keyShiftDown = this.keyShiftDown;
        c.keyBoost = this.keyBoost;

        // Clutch
        c.clutchEnabled = this.clutchEnabled;
        c.clutchRevBounceAmount = this.clutchRevBounceAmount;
        c.clutchRevBounceDuration = this.clutchRevBounceDuration;
        c.clutchLaunchPowerThreshold = this.clutchLaunchPowerThreshold;
        c.clutchDumpTractionLoss = this.clutchDumpTractionLoss;
        c.clutchDumpDuration = this.clutchDumpDuration;
        c.clutchHighRPMThreshold = this.clutchHighRPMThreshold;
        c.clutchDumpDrift = this.clutchDumpDrift;

        // Gamepad
        c.useGamepad = this.useGamepad;
        c.gamepadIndex = this.gamepadIndex;
        c.gamepadAccelAxis = this.gamepadAccelAxis;
        c.gamepadBrakeAxis = this.gamepadBrakeAxis;
        c.gamepadSteerAxis = this.gamepadSteerAxis;
        c.gamepadHandbrakeBtn = this.gamepadHandbrakeBtn;
        c.gamepadBoostBtn = this.gamepadBoostBtn;

        // Debug
        c.debugDraw = this.debugDraw;

        // Vehicle Interaction
        c.vehicleInteractionEnabled = this.vehicleInteractionEnabled;
        c.driverSide = this.driverSide;
        c.doorOffsetForward = this.doorOffsetForward;
        c.doorOffsetLateral = this.doorOffsetLateral;
        c.occupantPrefab = this.occupantPrefab;

        return c;
    }

    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>🏎️ VehicleController Overview</h2>
            <p>The <strong>VehicleController</strong> module provides advanced top-down vehicle physics with realistic handling. It supports multiple vehicle types and driving modes:</p>
            <ul>
                <li><strong>Presets</strong> — Sport, Drift, F1, Muscle, Off-road, Hover, Boat, Tank, Bus, Ice, Arcade, Kart, GTA2</li>
                <li><strong>Transmission</strong> — Automatic, Manual, or CVT with configurable gear ratios</li>
                <li><strong>Drift System</strong> — Handbrake/oversteer/always drift with boost charging</li>
                <li><strong>Special Modes</strong> — Hover vehicles, boats with wave physics, tank steering</li>
            </ul>
            <p>The controller handles engine RPM, gear shifting, tire grip, drift physics, visual effects (tire marks, exhaust), and supports both keyboard and gamepad input.</p>

            <div class="tip">Start with a preset like <code>'sport'</code> or <code>'arcade'</code> and then fine-tune individual properties. The preset gives you a solid base to work from.</div>
        `,

        "Quick Start": `
            <h2>⚡ Quick Start</h2>
            <p>Get a drivable vehicle running in minutes:</p>
            <ol>
                <li>Create a new Prefab for your vehicle</li>
                <li>Add a <strong>VehicleController</strong> module</li>
                <li>Add a <strong>Rigidbody</strong> module (required for collisions)</li>
                <li>Choose a <strong>Vehicle Preset</strong> from the dropdown</li>
                <li>Set <strong>Player Controlled</strong> to true</li>
            </ol>

            <h3>Minimal Code Setup</h3>
            <pre><code>start() {
    const vc = this.getModule('VehicleController');
    vc.vehiclePreset = 'sport';
    vc.applyPreset();
    vc.playerControlled = true;
}</code></pre>

            <h3>Default Controls</h3>
            <table>
                <tr><th>Key</th><th>Action</th></tr>
                <tr><td>Arrow Up</td><td>Accelerate</td></tr>
                <tr><td>Arrow Down</td><td>Brake / Reverse</td></tr>
                <tr><td>Arrow Left/Right</td><td>Steer</td></tr>
                <tr><td>Space</td><td>Handbrake</td></tr>
                <tr><td>E / Q</td><td>Shift Up / Down (manual)</td></tr>
                <tr><td>Left Shift</td><td>Boost</td></tr>
            </table>
        `,

        "Vehicle Presets": `
            <h2>🚗 Vehicle Presets</h2>
            <p>Use <code>vehiclePreset</code> and call <code>applyPreset()</code> to load a tuning profile:</p>
            <table>
                <tr><th>Preset</th><th>Description</th></tr>
                <tr><td><code>sport</code></td><td>Balanced sports car with good grip and moderate drift</td></tr>
                <tr><td><code>drift</code></td><td>Loose rear grip, easy drifting, great for drift games</td></tr>
                <tr><td><code>f1</code></td><td>High speed, precise handling, minimal drift</td></tr>
                <tr><td><code>muscle</code></td><td>High power, rear-heavy, easy oversteer</td></tr>
                <tr><td><code>offroad</code></td><td>Lower speed, high grip, good for rough terrain</td></tr>
                <tr><td><code>hover</code></td><td>Hovering vehicle with lateral slip and bobbing</td></tr>
                <tr><td><code>boat</code></td><td>Water vehicle with wave sway and water drag</td></tr>
                <tr><td><code>tank</code></td><td>Tank-style steering (left/right treads)</td></tr>
                <tr><td><code>bus</code></td><td>Heavy, slow, wide turning radius</td></tr>
                <tr><td><code>ice</code></td><td>Very low grip, slippery surface simulation</td></tr>
                <tr><td><code>arcade</code></td><td>Responsive, forgiving, fun arcade handling</td></tr>
                <tr><td><code>kart</code></td><td>Mario Kart-style handling with drift boost</td></tr>
                <tr><td><code>gta2</code></td><td>Classic GTA2-style overhead driving feel</td></tr>
            </table>

            <pre><code>const vc = this.getModule('VehicleController');
vc.vehiclePreset = 'kart';
vc.applyPreset();

// Then customize individual values
vc.topSpeed = 400;
vc.driftBoostForce = 3000;</code></pre>

            <div class="tip">After applying a preset, you can still modify any property. The preset just sets sensible defaults for that vehicle type.</div>
        `,

        "Drift & Boost": `
            <h2>🌀 Drift & Boost System</h2>

            <h3>Drift Trigger Modes</h3>
            <table>
                <tr><th>Mode</th><th>Description</th></tr>
                <tr><td><code>handbrake</code></td><td>Drift activates when holding the handbrake key (Space)</td></tr>
                <tr><td><code>oversteer</code></td><td>Drift starts automatically when rear grip is lost</td></tr>
                <tr><td><code>always</code></td><td>Constant drift — loose handling at all times</td></tr>
            </table>

            <h3>Drift Properties</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>driftEnabled</code></td><td>Master toggle for drift system</td></tr>
                <tr><td><code>driftGripMultiplier</code></td><td>Rear grip during drift (lower = more slide)</td></tr>
                <tr><td><code>driftSteerMultiplier</code></td><td>Steering sensitivity during drift</td></tr>
                <tr><td><code>driftCounterSteer</code></td><td>Auto counter-steer to maintain drift angle</td></tr>
            </table>

            <h3>Drift Boost</h3>
            <p>While drifting, a boost charges up. Release the drift to spend it:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>driftBoostEnabled</code></td><td>Enable drift-charged boost</td></tr>
                <tr><td><code>driftBoostChargeRate</code></td><td>How fast boost charges during drift</td></tr>
                <tr><td><code>driftBoostMaxCharge</code></td><td>Maximum boost charge</td></tr>
                <tr><td><code>driftBoostForce</code></td><td>Force applied when boost fires</td></tr>
                <tr><td><code>driftBoostDuration</code></td><td>How long the boost lasts (seconds)</td></tr>
            </table>

            <pre><code>const vc = this.getModule('VehicleController');

// Check drift state
if (vc.isDrifting()) {
    console.log('Slip angle:', vc.getSlipAngle());
    console.log('Boost charge:', vc.getBoostCharge());
}

// Manual boost trigger (e.g., from a powerup)
vc.triggerBoost(5000, 0.5);</code></pre>
        `,

        "Special Modes": `
            <h2>✨ Special Vehicle Modes</h2>

            <h3>Hover Mode</h3>
            <p>Floating vehicle with bobbing motion and lateral slip:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>hoverEnabled</code></td><td>Enable hover physics</td></tr>
                <tr><td><code>hoverHeight</code></td><td>Vertical bob amplitude</td></tr>
                <tr><td><code>hoverFrequency</code></td><td>Bob speed</td></tr>
                <tr><td><code>hoverSlipFactor</code></td><td>Lateral slip (0 = no slip, 1 = ice)</td></tr>
                <tr><td><code>hoverTiltAmount</code></td><td>Visual tilt on turns (degrees)</td></tr>
            </table>

            <h3>Boat Mode</h3>
            <p>Water vehicle with wave physics:</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>boatMode</code></td><td>Enable water physics</td></tr>
                <tr><td><code>waterDrag</code></td><td>Water resistance</td></tr>
                <tr><td><code>waveSway</code></td><td>Wave rocking amplitude (degrees)</td></tr>
                <tr><td><code>waveFrequency</code></td><td>Wave rocking speed</td></tr>
            </table>

            <h3>Tank Steering</h3>
            <p>Pivot-based steering (like a tank with independent treads):</p>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>tankSteering</code></td><td>Enable tank steering mode</td></tr>
                <tr><td><code>tankTurnSpeed</code></td><td>Turn rate in degrees/second</td></tr>
                <tr><td><code>tankTurnBraking</code></td><td>Speed reduction while turning (0-1)</td></tr>
            </table>
        `,

        "AI Control": `
            <h2>🤖 AI Control</h2>
            <p>Set <code>playerControlled = false</code> and drive the vehicle programmatically:</p>
            <pre><code>start() {
    const vc = this.getModule('VehicleController');
    vc.playerControlled = false;
}

loop(dt) {
    const vc = this.getModule('VehicleController');
    
    // Set throttle (0 to 1)
    vc.setThrottle(0.8);
    
    // Set steering (-1 left, 0 center, 1 right)
    vc.setSteering(-0.3);
    
    // Set brake (0 to 1)
    vc.setBrake(0);
    
    // Toggle handbrake
    vc.setHandbrake(false);
}</code></pre>

            <h3>AI Methods</h3>
            <table>
                <tr><th>Method</th><th>Parameters</th><th>Description</th></tr>
                <tr><td><code>setThrottle(val)</code></td><td>0 to 1</td><td>Gas pedal amount</td></tr>
                <tr><td><code>setBrake(val)</code></td><td>0 to 1</td><td>Brake amount</td></tr>
                <tr><td><code>setSteering(val)</code></td><td>-1 to 1</td><td>Steering direction</td></tr>
                <tr><td><code>setHandbrake(active)</code></td><td>boolean</td><td>Handbrake on/off</td></tr>
                <tr><td><code>triggerBoost(force?, dur?)</code></td><td>number, number</td><td>Manually fire boost</td></tr>
            </table>

            <div class="tip">For AI path-following, calculate the angle to the next waypoint and convert that to a steering value between -1 and 1.</div>
        `,

        "API Reference": `
            <h2>📖 API Reference</h2>
            <h3>State Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>getSpeed()</code></td><td>number</td><td>Current signed speed (px/s). Negative = reversing.</td></tr>
                <tr><td><code>getAbsoluteSpeed()</code></td><td>number</td><td>Absolute speed value</td></tr>
                <tr><td><code>getDisplaySpeed()</code></td><td>number</td><td>Speed in the configured display unit (km/h, mph, etc.)</td></tr>
                <tr><td><code>getCurrentGear()</code></td><td>number</td><td>Current gear (-1 = reverse, 1-N = forward)</td></tr>
                <tr><td><code>getRPM()</code></td><td>number</td><td>Current engine RPM</td></tr>
                <tr><td><code>isDrifting()</code></td><td>boolean</td><td>Is the vehicle currently drifting?</td></tr>
                <tr><td><code>isBoosting()</code></td><td>boolean</td><td>Is boost currently active?</td></tr>
                <tr><td><code>getBoostCharge()</code></td><td>number</td><td>Current drift boost charge amount</td></tr>
                <tr><td><code>getSlipAngle()</code></td><td>number</td><td>Current tire slip angle in degrees</td></tr>
                <tr><td><code>isGrounded()</code></td><td>boolean</td><td>Delegates to Rigidbody grounded check</td></tr>
            </table>

            <h3>HUD Example</h3>
            <pre><code>drawGUI(ctx) {
    const vc = this.getModule('VehicleController');
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Speed: ' + Math.round(vc.getDisplaySpeed()) + ' km/h', 10, 30);
    ctx.fillText('Gear: ' + vc.getCurrentGear(), 10, 50);
    ctx.fillText('RPM: ' + Math.round(vc.getRPM()), 10, 70);
    
    if (vc.isDrifting()) {
        ctx.fillStyle = '#ff0';
        ctx.fillText('DRIFTING!', 10, 90);
    }
}</code></pre>
        `,

        "Engine & Transmission": `
            <h2>⚙️ Engine & Transmission</h2>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>enginePower</code></td><td>900</td><td>Engine force applied to wheels</td></tr>
                <tr><td><code>reversePower</code></td><td>450</td><td>Reverse driving force</td></tr>
                <tr><td><code>brakePower</code></td><td>1800</td><td>Braking force</td></tr>
                <tr><td><code>topSpeed</code></td><td>300</td><td>Maximum forward speed (px/s)</td></tr>
                <tr><td><code>reverseTopSpeed</code></td><td>100</td><td>Maximum reverse speed</td></tr>
                <tr><td><code>idleRPM</code></td><td>800</td><td>Engine idle RPM</td></tr>
                <tr><td><code>maxRPM</code></td><td>7000</td><td>Maximum RPM before limiter</td></tr>
                <tr><td><code>redlineRPM</code></td><td>6800</td><td>RPM threshold for shift indicator</td></tr>
            </table>

            <h3>Transmission Types</h3>
            <table>
                <tr><th>Type</th><th>Description</th></tr>
                <tr><td><code>automatic</code></td><td>Shifts gears automatically based on RPM thresholds</td></tr>
                <tr><td><code>manual</code></td><td>Player shifts with Shift Up/Down keys</td></tr>
                <tr><td><code>cvt</code></td><td>Continuously variable — smooth, no discrete gears</td></tr>
            </table>

            <h3>Gear Configuration</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>gearCount</code></td><td>Number of forward gears</td></tr>
                <tr><td><code>gearRatios</code></td><td>Array of ratios per gear (higher = more torque, less top speed)</td></tr>
                <tr><td><code>reverseGearRatio</code></td><td>Reverse gear ratio</td></tr>
                <tr><td><code>finalDriveRatio</code></td><td>Final drive multiplier (affects all gears)</td></tr>
                <tr><td><code>shiftUpRPM</code></td><td>RPM at which auto-transmission shifts up</td></tr>
                <tr><td><code>shiftDownRPM</code></td><td>RPM at which auto-transmission shifts down</td></tr>
                <tr><td><code>shiftTime</code></td><td>Time for a gear shift (seconds — power cut during shift)</td></tr>
            </table>
        `,

        "Visual Effects": `
            <h2>🎨 Visual Effects</h2>
            <h3>Tire Marks</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>tireMarkEnabled</code></td><td>Enable tire mark rendering</td></tr>
                <tr><td><code>tireMarkColor</code></td><td>Tire mark color (default: <code>#333333</code>)</td></tr>
                <tr><td><code>tireMarkAlpha</code></td><td>Tire mark opacity (0-1)</td></tr>
                <tr><td><code>tireMarkWidth</code></td><td>Tire mark line width in pixels</td></tr>
            </table>

            <h3>Exhaust Particles</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>exhaustParticles</code></td><td>Enable exhaust particle effects</td></tr>
                <tr><td><code>exhaustColor</code></td><td>Starting exhaust color</td></tr>
                <tr><td><code>exhaustColorEnd</code></td><td>Exhaust fade color</td></tr>
            </table>

            <h3>Other Visual Properties</h3>
            <table>
                <tr><th>Property</th><th>Description</th></tr>
                <tr><td><code>bodyRollAmount</code></td><td>Visual body roll on turns (degrees)</td></tr>
                <tr><td><code>rotateToVelocity</code></td><td>Sprite rotates to face driving direction</td></tr>
                <tr><td><code>debugDraw</code></td><td>Show debug HUD with speed, RPM, forces, etc.</td></tr>
            </table>
        `
    };
}

// Register module globally
if (typeof window !== 'undefined') {
    window.VehicleController = VehicleController;
}
if (typeof Module !== 'undefined' && Module.register) {
    Module.register('VehicleController', VehicleController);
}
