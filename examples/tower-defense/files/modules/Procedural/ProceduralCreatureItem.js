/**
 * ProceduralCreatureItem Module
 * Represents an item that can be picked up and held by a ProceduralCreature.
 * The item's forward direction is along the positive X axis by default.
 * When held, the creature's hand grips the item at its handle offset,
 * and the item rotates with the hand/arm direction + holdingAngleOffset.
 * 
 * Swing model: The item always stays at its relative angle to the hand.
 * During attacks, the HAND sweeps through an arc (controlled by swingAngleOffset),
 * and the item follows naturally. The item's weight and weightBalance affect how
 * much the arm is pulled during and after the swing, while the creature's
 * armStrength property provides resistance.
 * 
 * Supports seed-based procedural item generation for weapons, tools, shields, and misc items.
 */

class ProceduralCreatureItem extends Module {
    static namespace = "Procedural";
    static allowMultiple = false;
    static color = "#4a3f2fff";

    static getIcon() {
        return '🗡️';
    }

    static getDescription() {
        return 'An item that ProceduralCreatures can pick up and hold (swords, tools, etc.)';
    }

    constructor() {
        super();

        // Item identity
        this.itemName = "Item";
        this.itemType = "weapon"; // weapon, tool, shield, gun, generic, misc

        // Handle offset - where the creature grips the item
        this.handleOffsetX = 0;
        this.handleOffsetY = 0;
        this.autoOffsetToGrip = true; // Automatically set handle offset to grip position

        // Holding angle offset - how the item is rotated when held
        this.holdingAngleOffset = 0;

        // Swing angle offset - how far the hand arc sweeps during attack
        this.swingAngleOffset = 90; // Degrees the HAND sweeps through when attacking (0 = stab motion)
        this.swingSpeed = 1.0; // Base swing speed (weight and armStrength modify this)

        // Two-handed holding
        this.twoHanded = false; // If true, creature will hold with both hands (doubles arm strength)

        // Depth position when held
        this.itemDepthPosition = 'below'; // 'below' or 'above' - whether item renders below or above creature
        this._defaultDepth = 0; // Stores the item's original depth before being picked up

        // Weight system
        this.weight = 1.0; // Overall weight of the item (0.1 = feather, 10 = heavy)
        this.weightBalance = 0.5; // 0 = weight at handle, 1 = weight at tip

        // Visual properties
        this.itemWidth = 6;
        this.itemLength = 30;
        this.itemColor = "#888888";
        this.handleColor = "#5a4030";
        this.handleLength = 10;
        this.showHandle = true;

        // Procedural generation
        this.drawGeneratedItem = true;
        this.generationSeed = 12345;
        this.generationStyle = "standard"; // standard, ornate, rusted, ancient, crystal, dark, nature, bone

        // Generation sub-type (depends on itemType)
        this.generationSubType = "sword";

        // Gun generation sub-type
        this.gunSubType = "pistol"; // pistol, rifle, shotgun, smg, sniper, revolver, launcher

        // Advanced generation
        this.genBladeDetail = 0.5;
        this.genCurvature = 0.0;
        this.genSerration = 0.0;
        this.genPommelSize = 0.5;
        this.genGuardWidth = 0.5;
        this.genAccentColor = "#c0a040";
        this.genGemColor = "#ff2040";
        this.genShowGem = false;
        this.genPatternType = "none"; // none, lines, dots, runes, engravings, scales

        // Random variation (applies variation without changing seed)
        this.enableRandomVariation = false;
        this.variationAmount = 0.3; // 0-1, how much random variation to apply
        this.variationColorShift = 0.1; // 0-1, color hue/saturation variation
        this.variationSizeScale = 0.15; // 0-1, size variation range
        this.variationDetailShift = 0.2; // 0-1, detail level variation

        // Gun-specific variation (for more nuanced gun randomization)
        this.gunVariationBarrel = 0.2; // 0-1, barrel length/thickness variation
        this.gunVariationParts = 0.15; // 0-1, grips/stock/magazine variation
        this.gunVariationCombat = 0.1; // 0-1, damage/fire rate/recoil variation

        // Spear customization
        this.spearTipSize = 0.5; // 0-1, size of spear tip
        this.spearTipStyle = "diamond"; // diamond, leaf, barbed, broad, narrow
        this.spearShaftTaper = 0.0; // 0-1, shaft tapering toward tip
        this.spearBindingCount = 1; // 0-3, decorative bindings

        // Axe customization
        this.axeHeadSize = 0.5; // 0-1, size of axe head
        this.axeHeadStyle = "single"; // single, double, bearded, crescent
        this.axeHeadCurve = 0.5; // 0-1, curve of the blade edge
        this.axeSpike = false; // spike on back of axe

        // Mace customization
        this.maceHeadSize = 0.5; // 0-1, size of mace head
        this.maceFlangeCount = 6; // 4-12, number of flanges/spikes
        this.maceFlangeLength = 0.5; // 0-1, length of flanges
        this.maceHeadStyle = "flanged"; // flanged, spiked, ball, crown

        // Dagger customization
        this.daggerBladeStyle = "straight"; // straight, curved, wavy, tanto
        this.daggerCrossguard = true;
        this.daggerFullerWidth = 0.3; // 0-1, width of fuller groove

        // Hammer customization
        this.hammerHeadLength = 0.5; // 0-1, length of hammer head
        this.hammerHeadStyle = "flat"; // flat, rounded, war, sledge
        this.hammerSpike = false; // spike on back

        // Shield customization
        this.shieldBossSize = 0.3; // 0-1, central boss size
        this.shieldRimWidth = 0.1; // 0-1, rim thickness
        this.shieldEmblem = "none"; // none, cross, chevron, circle, diamond

        // Misc item customization
        this.torchFlameSize = 0.5; // 0-1
        this.potionFillLevel = 0.8; // 0-1
        this.potionBubbles = true;
        this.keyTeethCount = 3; // 1-5
        this.gemFacets = 6; // 4-12

        // Pickup settings
        this.canBePickedUp = true;
        this.autoPickup = false;
        this.pickupRange = 30;

        // Combat properties
        this.damage = 10;
        this.thrownDamage = 5; // Damage when item hits a creature after being thrown
        this.knockback = 50;
        this.attackRange = 0;

        // ==================== SPARK COLLISION EFFECTS ====================
        this.sparkOnCollision = false; // Enable spark particles when colliding with solids
        this.sparkParticleCount = 5; // Number of sparks per collision frame
        this.sparkParticleSpeed = 150; // Base speed (px/sec)
        this.sparkParticleSpeedVariance = 80; // Random speed added
        this.sparkParticleLifetime = 0.2; // Seconds each spark lives
        this.sparkParticleLifetimeVariance = 0.1;
        this.sparkParticleSpreadAngle = 120; // Degrees of spread from collision normal
        this.sparkParticleSizeStart = 3; // Start size in pixels
        this.sparkParticleSizeEnd = 1; // End size (shrinks over life)
        this.sparkParticleColorStart = '#ffdd44'; // Starting color (bright yellow)
        this.sparkParticleColorEnd = '#ff6600'; // Ending color (orange-red)
        this.sparkParticleGravity = 200; // Downward pull (px/sec^2) for falling sparks
        this.sparkParticleFadeOut = true; // Fade alpha to 0 over lifetime
        this.sparkMinVelocity = 50; // Minimum item velocity to trigger sparks
        this.sparkCooldown = 0.03; // Minimum time between spark bursts (seconds)
        this._lastSparkTime = 0; // Internal: track last spark spawn time

        // State
        this.isHeld = false;
        this._holder = null;
        this._holdingArmIndex = -1;
        this._originalDepth = 0;

        this._generatedPath = null;
        this._lastSeed = -1;

        // ==================== GUN PROPERTIES ====================

        // Gun body/frame
        this.gunBodyLength = 30; // Overall gun body length
        this.gunBodyHeight = 8; // Height of the receiver/body
        this.gunFrameColor = "#333333";
        this.gunFrameStyle = "angular"; // angular, rounded, bullpup, futuristic, classic

        // Barrel
        this.gunBarrelLength = 20; // Length extending from body
        this.gunBarrelThickness = 3;
        this.gunBarrelColor = "#444444";
        this.gunBarrelStyle = "standard"; // standard, heavy, fluted, ported, suppressed
        this.gunBarrelTaper = 0.0; // 0=uniform, 1=tapers to muzzle

        // Stock
        this.gunStockEnabled = false;
        this.gunStockLength = 18;
        this.gunStockStyle = "fixed"; // fixed, folding, skeletal, thumbhole, pistolGrip
        this.gunStockColor = "#5a4030";
        this.gunStockDrop = 3; // How much the stock drops below the body

        // Trigger grip (main hand)
        this.gunGripStyle = "standard"; // standard, ergonomic, angled, target, wrap
        this.gunGripLength = 8;
        this.gunGripAngle = 15; // degrees from vertical
        this.gunGripColor = "#3a3030";
        this.gunGripPosition = 0.45; // 0-1 along body, where trigger grip sits

        // Foregrip / second grip (off-hand for two-handed)
        this.gunForegripEnabled = false; // Two-handed gun
        this.gunForegripStyle = "vertical"; // vertical, angled, stubby, handguard, bipod
        this.gunForegripPosition = 0.15; // 0-1 along body from muzzle end
        this.gunForegripColor = "#3a3030";

        // Magazine
        this.gunMagazineStyle = "box"; // box, curved, drum, tube, internal
        this.gunMagazinePosition = 0.5; // 0-1 along body
        this.gunMagazineSize = 0.5; // 0-1 visual scale
        this.gunMagazineColor = "#2a2a2a";

        // Scope / Sight
        this.gunScopeEnabled = false;
        this.gunScopeStyle = "ironsight"; // ironsight, reddot, acog, sniper, holographic
        this.gunScopeSize = 0.5;
        this.gunScopeColor = "#222222";

        // Muzzle device
        this.gunMuzzleDevice = "none"; // none, flash_hider, compensator, brake, suppressor
        this.gunMuzzleColor = "#555555";

        // Cosmetics
        this.gunRailEnabled = false; // Picatinny rail on top
        this.gunCamoPattern = "none"; // none, stripes, digital, woodland, dots, hex
        this.gunCamoColor = "#556b2f";
        this.gunWearAmount = 0.0; // 0-1, scratches and wear
        this.gunDecalColor = "#cc2222"; // Accent color for markings/stripes
        this.gunDecalEnabled = false;
        this.gunGlowEnabled = false; // Sci-fi glow effect
        this.gunGlowColor = "#00aaff";

        // Flash effect
        this.gunMuzzleFlashSize = 1.0;
        this.gunMuzzleFlashColor = "#ffaa22";

        // ==================== PROJECTILE & RECOIL ====================

        this.projectilePrefab = ""; // Name of the prefab to instanceCreate on fire
        this.projectileSpeed = 400; // Initial speed of projectile
        this.projectileSpawnOffset = 0; // Extra offset from muzzle tip
        this.fireRate = 5; // Shots per second
        this.recoilAmount = 8; // Pixels the arm pushes back
        this.recoilRecoverySpeed = 12; // How fast arm recovers from recoil
        this.recoilRotation = 5; // Degrees of upward kick
        this.recoilArmKickback = 0.3; // How much arm angle kicks back on fire (0-1)

        // Fire mode
        this.fireMode = 'single'; // 'single' or 'automatic'
        this.projectileInstantHit = false; // If true, instantly hit target instead of spawning projectile (hitscan)
        this.instantHitRange = 1000; // Maximum range for instant hit raycast
        this._triggerHeld = false; // Whether trigger is currently held
        this._hasFiredThisTrigger = false; // For single mode: only fire once per trigger press

        // ==================== AMMO & RELOAD ====================
        this.maxAmmo = 30; // Maximum ammo per magazine (0 = unlimited)
        this.reloadTime = 2.0; // Seconds to reload
        this.currentAmmo = 30; // Current ammo count
        this._isReloading = false; // Currently reloading
        this._reloadTimer = 0; // Timer for reload progress

        // ==================== MUZZLE FLASH PARTICLES ====================
        this.muzzleParticlesEnabled = true;
        this.muzzleParticleCount = 6; // Particles per shot
        this.muzzleParticleSpeed = 120; // Base speed (px/sec)
        this.muzzleParticleSpeedVariance = 60; // Random speed added
        this.muzzleParticleLifetime = 0.15; // Seconds each particle lives
        this.muzzleParticleLifetimeVariance = 0.08;
        this.muzzleParticleSpreadAngle = 30; // Degrees of spread cone
        this.muzzleParticleSizeStart = 3; // Start size in pixels
        this.muzzleParticleSizeEnd = 1; // End size (shrinks over life)
        this.muzzleParticleColorStart = '#ffdd44'; // Starting color
        this.muzzleParticleColorEnd = '#ff4400'; // Ending color (fades to)
        this.muzzleParticleGravity = 0; // Downward pull (px/sec^2) - 0 for top-down
        this.muzzleParticleFadeOut = true; // Fade alpha to 0 over lifetime
        this.muzzleParticleShape = 'circle'; // 'circle', 'spark', 'smoke'
        this.muzzleParticleSmokeEnabled = false; // Emit slower smoke particles too
        this.muzzleParticleSmokeColor = '#888888';
        this.muzzleParticleSmokeCount = 3;
        this.muzzleParticleSmokeSize = 5;
        this.muzzleParticleSmokeLifetime = 0.4;

        this._recoilTimer = 0;
        this._recoilCurrent = 0; // Current recoil offset
        this._recoilAngleCurrent = 0;
        this._fireCooldown = 0;
        this._muzzleFlashTimer = 0;
        this._muzzleParticles = []; // Active muzzle flash particles
        this._isFiring = false; // Currently firing (for auto mode tracking)

        // ==================== OFFSCREEN CANVAS CACHE ====================
        this._cachedCanvas = null; // Offscreen canvas for non-held / side view
        this._cachedCanvasHeld = null; // Offscreen canvas for held / top-down view (guns only)
        this._cacheKey = ''; // Key to detect when regeneration needed
    }

    getPropertyMetadata() {
        return [
            // Item Identity
            { type: 'groupStart', label: '🏷️ Item Identity' },
            { key: 'itemName', label: 'Item Name', type: 'text', hint: 'Display name of the item' },
            { key: 'itemType', label: 'Item Type', type: 'select', options: ['weapon', 'tool', 'shield', 'gun', 'generic', 'misc'] },
            { key: 'itemDepthPosition', label: 'Depth Position', type: 'select', options: ['below', 'above'], hint: 'Whether item renders below or above the creature when held' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🎯 PRESET BUTTONS - Quick configuration presets
            // ═══════════════════════════════════════════════════════════════

            // Sword Presets
            { type: 'groupStart', label: '⚔️ Sword Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'hint', hint: 'Click a preset to configure the item quickly.' },
            { type: 'button', label: '', buttonText: '🗡️ Longsword', buttonStyle: 'primary', action: 'presetLongsword', tooltip: 'Two-handed longsword' },
            { type: 'button', label: '', buttonText: '⚔️ Shortsword', buttonStyle: 'primary', action: 'presetShortsword', tooltip: 'One-handed shortsword' },
            { type: 'button', label: '', buttonText: '🔪 Katana', buttonStyle: 'primary', action: 'presetKatana', tooltip: 'Curved samurai sword' },
            { type: 'button', label: '', buttonText: '🌙 Scimitar', buttonStyle: 'primary', action: 'presetScimitar', tooltip: 'Curved slashing blade' },
            { type: 'groupEnd' },

            // Dagger Presets
            { type: 'groupStart', label: '🗡️ Dagger Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'button', label: '', buttonText: '🗡️ Dagger', buttonStyle: 'primary', action: 'presetDagger', tooltip: 'Standard dagger' },
            { type: 'button', label: '', buttonText: '🔪 Knife', buttonStyle: 'primary', action: 'presetKnife', tooltip: 'Small curved knife' },
            { type: 'button', label: '', buttonText: '📍 Stiletto', buttonStyle: 'primary', action: 'presetStiletto', tooltip: 'Thin piercing dagger' },
            { type: 'groupEnd' },

            // Spear Presets
            { type: 'groupStart', label: '🔱 Spear Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'button', label: '', buttonText: '🔱 War Spear', buttonStyle: 'primary', action: 'presetWarSpear', tooltip: 'Heavy war spear' },
            { type: 'button', label: '', buttonText: '🎯 Hunting Spear', buttonStyle: 'primary', action: 'presetHuntingSpear', tooltip: 'Lightweight hunting spear' },
            { type: 'button', label: '', buttonText: '🏹 Javelin', buttonStyle: 'primary', action: 'presetJavelin', tooltip: 'Throwable javelin' },
            { type: 'button', label: '', buttonText: '🔱 Trident', buttonStyle: 'primary', action: 'presetTrident', tooltip: 'Three-pronged trident' },
            { type: 'groupEnd' },

            // Axe Presets
            { type: 'groupStart', label: '🪓 Axe Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'button', label: '', buttonText: '🪓 Battle Axe', buttonStyle: 'primary', action: 'presetBattleAxe', tooltip: 'Two-handed battle axe' },
            { type: 'button', label: '', buttonText: '🔨 Hatchet', buttonStyle: 'primary', action: 'presetHatchet', tooltip: 'Small one-handed hatchet' },
            { type: 'button', label: '', buttonText: '⚔️ Greataxe', buttonStyle: 'primary', action: 'presetGreataxe', tooltip: 'Massive double-headed axe' },
            { type: 'button', label: '', buttonText: '🪓 Bearded Axe', buttonStyle: 'primary', action: 'presetBeardedAxe', tooltip: 'Viking-style bearded axe' },
            { type: 'groupEnd' },

            // Mace Presets
            { type: 'groupStart', label: '🏏 Mace Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'button', label: '', buttonText: '🏏 War Mace', buttonStyle: 'primary', action: 'presetWarMace', tooltip: 'Flanged war mace' },
            { type: 'button', label: '', buttonText: '⭐ Morning Star', buttonStyle: 'primary', action: 'presetMorningStar', tooltip: 'Spiked morning star' },
            { type: 'button', label: '', buttonText: '🪵 Cudgel', buttonStyle: 'primary', action: 'presetCudgel', tooltip: 'Simple club' },
            { type: 'groupEnd' },

            // Hammer Presets
            { type: 'groupStart', label: '🔨 Hammer Presets', showIf: (m) => m.itemType === 'weapon' },
            { type: 'button', label: '', buttonText: '🔨 War Hammer', buttonStyle: 'primary', action: 'presetWarHammer', tooltip: 'Two-handed war hammer' },
            { type: 'button', label: '', buttonText: '⚒️ Sledgehammer', buttonStyle: 'primary', action: 'presetSledgehammer', tooltip: 'Heavy sledgehammer' },
            { type: 'button', label: '', buttonText: '🔧 Claw Hammer', buttonStyle: 'primary', action: 'presetClaw', tooltip: 'Claw hammer with spike' },
            { type: 'groupEnd' },

            // Shield Presets
            { type: 'groupStart', label: '🛡️ Shield Presets', showIf: (m) => m.itemType === 'shield' },
            { type: 'hint', hint: 'Click a preset to configure the shield quickly.' },
            { type: 'button', label: '', buttonText: '⭕ Round Shield', buttonStyle: 'primary', action: 'presetRoundShield', tooltip: 'Classic round shield' },
            { type: 'button', label: '', buttonText: '🛡️ Kite Shield', buttonStyle: 'primary', action: 'presetKiteShield', tooltip: 'Medieval kite shield' },
            { type: 'button', label: '', buttonText: '🚪 Tower Shield', buttonStyle: 'primary', action: 'presetTowerShield', tooltip: 'Large tower shield' },
            { type: 'button', label: '', buttonText: '🔘 Buckler', buttonStyle: 'primary', action: 'presetBuckler', tooltip: 'Small parrying buckler' },
            { type: 'groupEnd' },

            // Gun Presets
            { type: 'groupStart', label: '🔫 Gun Presets', showIf: (m) => m.itemType === 'gun' },
            { type: 'hint', hint: 'Click a preset to configure the gun quickly.' },
            { type: 'button', label: '', buttonText: '🔫 Pistol', buttonStyle: 'primary', action: 'presetPistol', tooltip: 'Standard semi-auto pistol' },
            { type: 'button', label: '', buttonText: '🎯 Revolver', buttonStyle: 'primary', action: 'presetRevolver', tooltip: 'Classic revolver' },
            { type: 'button', label: '', buttonText: '🔫 Assault Rifle', buttonStyle: 'primary', action: 'presetAssaultRifle', tooltip: 'Modern assault rifle' },
            { type: 'button', label: '', buttonText: '🎯 Sniper Rifle', buttonStyle: 'primary', action: 'presetSniperRifle', tooltip: 'Long-range sniper rifle' },
            { type: 'button', label: '', buttonText: '💥 Shotgun', buttonStyle: 'primary', action: 'presetShotgun', tooltip: 'Pump-action shotgun' },
            { type: 'button', label: '', buttonText: '⚡ SMG', buttonStyle: 'primary', action: 'presetSMG', tooltip: 'Sub-machine gun' },
            { type: 'button', label: '', buttonText: '🚀 Rocket Launcher', buttonStyle: 'primary', action: 'presetRocketLauncher', tooltip: 'Heavy rocket launcher' },
            { type: 'groupEnd' },

            // Tool Presets
            { type: 'groupStart', label: '🛠️ Tool Presets', showIf: (m) => m.itemType === 'tool' },
            { type: 'hint', hint: 'Click a preset to configure the tool quickly.' },
            { type: 'button', label: '', buttonText: '⛏️ Pickaxe', buttonStyle: 'primary', action: 'presetPickaxe', tooltip: 'Mining pickaxe' },
            { type: 'button', label: '', buttonText: '🪠 Shovel', buttonStyle: 'primary', action: 'presetShovel', tooltip: 'Digging shovel' },
            { type: 'button', label: '', buttonText: '🌾 Sickle', buttonStyle: 'primary', action: 'presetSickle', tooltip: 'Harvesting sickle' },
            { type: 'groupEnd' },

            // Misc Presets
            { type: 'groupStart', label: '✨ Misc Presets', showIf: (m) => m.itemType === 'misc' },
            { type: 'button', label: '', buttonText: '🔥 Torch', buttonStyle: 'primary', action: 'presetTorch', tooltip: 'Burning torch' },
            { type: 'groupEnd' },

            // Handle & Grip (hidden for guns — guns use their own grip settings)
            { type: 'groupStart', label: '✊ Handle & Grip', showIf: (m) => m.itemType !== 'gun' },
            { type: 'hint', hint: 'Handle offset determines where the creature grips the item. Item forward is +X axis.' },
            { key: 'autoOffsetToGrip', label: 'Auto Offset to Grip', type: 'boolean', hint: 'Automatically calculate grip position from handle' },
            { key: 'handleOffsetX', label: 'Handle Offset X', type: 'number', min: -50, max: 50, showIf: { autoOffsetToGrip: false }, hint: 'Along item length' },
            { key: 'handleOffsetY', label: 'Handle Offset Y', type: 'number', min: -50, max: 50, showIf: { autoOffsetToGrip: false }, hint: 'Perpendicular to item length' },
            { key: 'holdingAngleOffset', label: 'Holding Angle', type: 'number', min: -180, max: 180, hint: 'Rotation offset when held (degrees)' },
            { key: 'swingAngleOffset', label: 'Swing Angle', type: 'number', min: 0, max: 360, hint: 'Degrees the hand sweeps through during attack (item follows naturally)' },
            { key: 'swingSpeed', label: 'Swing Speed', type: 'slider', min: 0.1, max: 5.0, step: 0.1, hint: 'Base swing speed (weight & armStrength modify this)' },
            { key: 'twoHanded', label: 'Two-Handed', type: 'boolean', hint: 'Hold with both hands (doubles arm strength, easier to swing heavy items)' },
            { type: 'groupEnd' },

            // Weight (hidden for guns)
            { type: 'groupStart', label: '⚖️ Weight', showIf: (m) => m.itemType !== 'gun' },
            { key: 'weight', label: 'Weight', type: 'slider', min: 0.1, max: 10, step: 0.1, hint: 'How heavy the item is (affects arm physics)' },
            { key: 'weightBalance', label: 'Weight Balance', type: 'slider', min: 0, max: 1, step: 0.01, hint: '0 = handle-heavy, 1 = tip-heavy' },
            { type: 'groupEnd' },

            // Visual (hidden for guns — guns use procedural generation)
            { type: 'groupStart', label: '🎨 Visual', showIf: (m) => m.itemType !== 'gun' },
            { key: 'itemLength', label: 'Item Length', type: 'number', min: 5, max: 200 },
            { key: 'itemWidth', label: 'Item Width', type: 'number', min: 1, max: 60 },
            { key: 'itemColor', label: 'Item Color', type: 'color' },
            { key: 'showHandle', label: 'Show Handle', type: 'boolean' },
            { key: 'handleLength', label: 'Handle Length', type: 'number', min: 2, max: 80, showIf: { showHandle: true } },
            { key: 'handleColor', label: 'Handle Color', type: 'color', showIf: { showHandle: true } },
            { type: 'groupEnd' },

            // Procedural Generation
            { type: 'groupStart', label: '🔧 Procedural Generation' },
            { key: 'drawGeneratedItem', label: 'Draw Generated Item', type: 'boolean', hint: 'Use seed-based procedural generation to draw the item' },
            { key: 'generationSeed', label: 'Seed', type: 'number', min: 0, max: 999999, showIf: { drawGeneratedItem: true } },
            { key: 'generationStyle', label: 'Style', type: 'select', options: ['standard', 'ornate', 'rusted', 'ancient', 'crystal', 'dark', 'nature', 'bone'], showIf: { drawGeneratedItem: true } },
            { key: 'generationSubType', label: 'Sub-Type', type: 'select', options: ['sword', 'axe', 'mace', 'spear', 'dagger', 'katana', 'scimitar', 'hammer', 'flail', 'pickaxe', 'shovel', 'wrench', 'sickle', 'hoe', 'fishing_rod', 'round', 'kite', 'tower', 'buckler', 'torch', 'key', 'potion', 'scroll', 'gem', 'bone', 'feather', 'mushroom', 'lantern'], showIf: { drawGeneratedItem: true } },
            { type: 'groupEnd' },

            // Advanced Generation (weapon/tool/shield only — hidden for guns)
            { type: 'groupStart', label: '🎛️ Advanced Generation', showIf: (m) => m.drawGeneratedItem && m.itemType !== 'gun' },
            { key: 'genBladeDetail', label: 'Detail Level', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'genCurvature', label: 'Curvature', type: 'slider', min: -1, max: 1, step: 0.01, showIf: (m) => ['sword','dagger','katana','scimitar','sickle'].includes(m.generationSubType) },
            { key: 'genSerration', label: 'Serration', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => ['sword','dagger','scimitar'].includes(m.generationSubType) },
            { key: 'genPommelSize', label: 'Pommel Size', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => ['sword','dagger','katana','scimitar','axe','mace','spear','hammer','flail'].includes(m.generationSubType) },
            { key: 'genGuardWidth', label: 'Guard Width', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => ['sword','dagger','katana','scimitar'].includes(m.generationSubType) },
            { key: 'genAccentColor', label: 'Accent Color', type: 'color' },
            { key: 'genGemColor', label: 'Gem Color', type: 'color' },
            { key: 'genShowGem', label: 'Show Gem', type: 'boolean' },
            { key: 'genPatternType', label: 'Pattern', type: 'select', options: ['none', 'lines', 'dots', 'runes', 'engravings', 'scales'] },
            { type: 'groupEnd' },

            // Random Variation
            { type: 'groupStart', label: '🎲 Random Variation', showIf: (m) => m.drawGeneratedItem },
            { type: 'hint', hint: 'Apply random variation while keeping the basic shape. Good for generating similar items.' },
            { key: 'enableRandomVariation', label: 'Enable Variation', type: 'boolean' },
            { key: 'variationAmount', label: 'Variation Amount', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType !== 'gun' },
            { key: 'variationColorShift', label: 'Color Shift', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType !== 'gun' },
            { key: 'variationSizeScale', label: 'Size Variation', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType !== 'gun' },
            { key: 'variationDetailShift', label: 'Detail Variation', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType !== 'gun' },
            // Gun-specific variation controls
            { key: 'gunVariationBarrel', label: 'Barrel Variation', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType === 'gun', hint: 'Barrel length/thickness randomization' },
            { key: 'gunVariationParts', label: 'Parts Variation', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType === 'gun', hint: 'Grips, stock, magazine randomization' },
            { key: 'gunVariationCombat', label: 'Combat Variation', type: 'slider', min: 0, max: 1, step: 0.01, showIf: (m) => m.enableRandomVariation && m.itemType === 'gun', hint: 'Damage, fire rate, recoil randomization' },
            { type: 'groupEnd' },

            // Spear Options
            { type: 'groupStart', label: '🔱 Spear Options', showIf: (m) => m.drawGeneratedItem && m.generationSubType === 'spear' },
            { key: 'spearTipSize', label: 'Tip Size', type: 'slider', min: 0.2, max: 1.5, step: 0.01 },
            { key: 'spearTipStyle', label: 'Tip Style', type: 'select', options: ['diamond', 'leaf', 'barbed', 'broad', 'narrow'] },
            { key: 'spearShaftTaper', label: 'Shaft Taper', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'spearBindingCount', label: 'Bindings', type: 'number', min: 0, max: 3 },
            { type: 'groupEnd' },

            // Axe Options
            { type: 'groupStart', label: '🪓 Axe Options', showIf: (m) => m.drawGeneratedItem && m.generationSubType === 'axe' },
            { key: 'axeHeadSize', label: 'Head Size', type: 'slider', min: 0.3, max: 1.5, step: 0.01 },
            { key: 'axeHeadStyle', label: 'Head Style', type: 'select', options: ['single', 'double', 'bearded', 'crescent'] },
            { key: 'axeHeadCurve', label: 'Edge Curve', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'axeSpike', label: 'Back Spike', type: 'boolean' },
            { type: 'groupEnd' },

            // Mace Options
            { type: 'groupStart', label: '🏏 Mace Options', showIf: (m) => m.drawGeneratedItem && m.generationSubType === 'mace' },
            { key: 'maceHeadSize', label: 'Head Size', type: 'slider', min: 0.3, max: 1.5, step: 0.01 },
            { key: 'maceHeadStyle', label: 'Head Style', type: 'select', options: ['flanged', 'spiked', 'ball', 'crown'] },
            { key: 'maceFlangeCount', label: 'Flange Count', type: 'number', min: 4, max: 12 },
            { key: 'maceFlangeLength', label: 'Flange Length', type: 'slider', min: 0.2, max: 1, step: 0.01 },
            { type: 'groupEnd' },

            // Dagger Options
            { type: 'groupStart', label: '🗡️ Dagger Options', showIf: (m) => m.drawGeneratedItem && m.generationSubType === 'dagger' },
            { key: 'daggerBladeStyle', label: 'Blade Style', type: 'select', options: ['straight', 'curved', 'wavy', 'tanto'] },
            { key: 'daggerCrossguard', label: 'Crossguard', type: 'boolean' },
            { key: 'daggerFullerWidth', label: 'Fuller Width', type: 'slider', min: 0, max: 1, step: 0.01 },
            { type: 'groupEnd' },

            // Hammer Options
            { type: 'groupStart', label: '🔨 Hammer Options', showIf: (m) => m.drawGeneratedItem && m.generationSubType === 'hammer' },
            { key: 'hammerHeadLength', label: 'Head Length', type: 'slider', min: 0.3, max: 1.5, step: 0.01 },
            { key: 'hammerHeadStyle', label: 'Head Style', type: 'select', options: ['flat', 'rounded', 'war', 'sledge'] },
            { key: 'hammerSpike', label: 'Back Spike', type: 'boolean' },
            { type: 'groupEnd' },

            // Shield Options
            { type: 'groupStart', label: '🛡️ Shield Options', showIf: (m) => m.drawGeneratedItem && ['round','kite','tower','buckler'].includes(m.generationSubType) },
            { key: 'shieldBossSize', label: 'Boss Size', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'shieldRimWidth', label: 'Rim Width', type: 'slider', min: 0, max: 0.3, step: 0.01 },
            { key: 'shieldEmblem', label: 'Emblem', type: 'select', options: ['none', 'cross', 'chevron', 'circle', 'diamond'] },
            { type: 'groupEnd' },

            // Misc Item Options
            { type: 'groupStart', label: '✨ Misc Options', showIf: (m) => m.drawGeneratedItem && ['torch','potion','key','gem'].includes(m.generationSubType) },
            { key: 'torchFlameSize', label: 'Flame Size', type: 'slider', min: 0.2, max: 1.5, step: 0.01, showIf: (m) => m.generationSubType === 'torch' },
            { key: 'potionFillLevel', label: 'Fill Level', type: 'slider', min: 0.1, max: 1, step: 0.01, showIf: (m) => m.generationSubType === 'potion' },
            { key: 'potionBubbles', label: 'Bubbles', type: 'boolean', showIf: (m) => m.generationSubType === 'potion' },
            { key: 'keyTeethCount', label: 'Teeth Count', type: 'number', min: 1, max: 5, showIf: (m) => m.generationSubType === 'key' },
            { key: 'gemFacets', label: 'Facets', type: 'number', min: 4, max: 12, showIf: (m) => m.generationSubType === 'gem' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 🔫 GUN SETTINGS (master group wrapping all gun sub-sections)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🔫 Gun Settings', showIf: (m) => m.itemType === 'gun' },

            { key: 'drawGeneratedItem', label: 'Draw Generated Gun', type: 'boolean', hint: 'Use seed-based procedural generation to draw the gun', showIf: (m) => m.itemType === 'gun' },
            { key: 'generationSeed', label: 'Seed', type: 'number', min: 0, max: 999999, showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'generationStyle', label: 'Style', type: 'select', options: ['standard', 'ornate', 'rusted', 'ancient', 'crystal', 'dark', 'nature', 'bone'], showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunSubType', label: 'Gun Type', type: 'select', options: ['pistol', 'rifle', 'shotgun', 'smg', 'sniper', 'revolver', 'launcher'], showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },

            { type: 'groupStart', label: '🔫 Frame & Body', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunBodyLength', label: 'Body Length', type: 'number', min: 10, max: 80 },
            { key: 'gunBodyHeight', label: 'Body Height', type: 'number', min: 3, max: 20 },
            { key: 'gunFrameColor', label: 'Frame Color', type: 'color' },
            { key: 'gunFrameStyle', label: 'Frame Style', type: 'select', options: ['angular', 'rounded', 'bullpup', 'futuristic', 'classic'] },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Barrel', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunBarrelLength', label: 'Barrel Length', type: 'number', min: 5, max: 60 },
            { key: 'gunBarrelThickness', label: 'Barrel Thickness', type: 'number', min: 1, max: 8 },
            { key: 'gunBarrelColor', label: 'Barrel Color', type: 'color' },
            { key: 'gunBarrelStyle', label: 'Barrel Style', type: 'select', options: ['standard', 'heavy', 'fluted', 'ported', 'suppressed'] },
            { key: 'gunBarrelTaper', label: 'Barrel Taper', type: 'slider', min: 0, max: 1, step: 0.01 },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Stock', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunStockEnabled', label: 'Has Stock', type: 'boolean' },
            { key: 'gunStockLength', label: 'Stock Length', type: 'number', min: 5, max: 40, showIf: { gunStockEnabled: true } },
            { key: 'gunStockStyle', label: 'Stock Style', type: 'select', options: ['fixed', 'folding', 'skeletal', 'thumbhole', 'pistolGrip'], showIf: { gunStockEnabled: true } },
            { key: 'gunStockColor', label: 'Stock Color', type: 'color', showIf: { gunStockEnabled: true } },
            { key: 'gunStockDrop', label: 'Stock Drop', type: 'number', min: 0, max: 10, showIf: { gunStockEnabled: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Grips', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunGripStyle', label: 'Grip Style', type: 'select', options: ['standard', 'ergonomic', 'angled', 'target', 'wrap'] },
            { key: 'gunGripLength', label: 'Grip Length', type: 'number', min: 3, max: 20 },
            { key: 'gunGripAngle', label: 'Grip Angle', type: 'number', min: 0, max: 45 },
            { key: 'gunGripColor', label: 'Grip Color', type: 'color' },
            { key: 'gunGripPosition', label: 'Grip Position', type: 'slider', min: 0.1, max: 0.9, step: 0.01, hint: 'Position along body (0=front, 1=back)' },
            { type: 'hint', hint: 'Enable foregrip for two-handed guns. Creature will use off-hand if available.' },
            { key: 'gunForegripEnabled', label: 'Foregrip (Two-Hand)', type: 'boolean' },
            { key: 'gunForegripStyle', label: 'Foregrip Style', type: 'select', options: ['vertical', 'angled', 'stubby', 'handguard', 'bipod'], showIf: { gunForegripEnabled: true } },
            { key: 'gunForegripPosition', label: 'Foregrip Position', type: 'slider', min: 0.0, max: 0.5, step: 0.01, showIf: { gunForegripEnabled: true }, hint: 'Position from muzzle end' },
            { key: 'gunForegripColor', label: 'Foregrip Color', type: 'color', showIf: { gunForegripEnabled: true } },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Magazine', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunMagazineStyle', label: 'Magazine Style', type: 'select', options: ['box', 'curved', 'drum', 'tube', 'internal'] },
            { key: 'gunMagazinePosition', label: 'Magazine Position', type: 'slider', min: 0.1, max: 0.9, step: 0.01 },
            { key: 'gunMagazineSize', label: 'Magazine Size', type: 'slider', min: 0.1, max: 1.0, step: 0.01 },
            { key: 'gunMagazineColor', label: 'Magazine Color', type: 'color' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Optics & Muzzle', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunScopeEnabled', label: 'Has Optic', type: 'boolean' },
            { key: 'gunScopeStyle', label: 'Optic Style', type: 'select', options: ['ironsight', 'reddot', 'acog', 'sniper', 'holographic'], showIf: { gunScopeEnabled: true } },
            { key: 'gunScopeSize', label: 'Optic Size', type: 'slider', min: 0.2, max: 1.0, step: 0.01, showIf: { gunScopeEnabled: true } },
            { key: 'gunScopeColor', label: 'Optic Color', type: 'color', showIf: { gunScopeEnabled: true } },
            { key: 'gunMuzzleDevice', label: 'Muzzle Device', type: 'select', options: ['none', 'flash_hider', 'compensator', 'brake', 'suppressor'] },
            { key: 'gunMuzzleColor', label: 'Muzzle Color', type: 'color', showIf: (m) => m.gunMuzzleDevice !== 'none' },
            { key: 'gunRailEnabled', label: 'Top Rail', type: 'boolean' },
            { type: 'groupEnd' },

            { type: 'groupStart', label: '🔫 Cosmetics', showIf: (m) => m.itemType === 'gun' && m.drawGeneratedItem },
            { key: 'gunCamoPattern', label: 'Camo Pattern', type: 'select', options: ['none', 'stripes', 'digital', 'woodland', 'dots', 'hex'] },
            { key: 'gunCamoColor', label: 'Camo Color', type: 'color', showIf: (m) => m.gunCamoPattern !== 'none' },
            { key: 'gunWearAmount', label: 'Wear/Scratches', type: 'slider', min: 0, max: 1, step: 0.01 },
            { key: 'gunDecalEnabled', label: 'Show Decal', type: 'boolean' },
            { key: 'gunDecalColor', label: 'Decal Color', type: 'color', showIf: { gunDecalEnabled: true } },
            { key: 'gunGlowEnabled', label: 'Sci-Fi Glow', type: 'boolean' },
            { key: 'gunGlowColor', label: 'Glow Color', type: 'color', showIf: { gunGlowEnabled: true } },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // 💥 FIRE MODE & PROJECTILE (inside gun settings)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💥 Fire Mode & Projectile', showIf: (m) => m.itemType === 'gun' },
            { key: 'fireMode', label: 'Fire Mode', type: 'select', options: ['single', 'automatic'], hint: 'Single: one shot per click. Automatic: hold to keep firing' },
            { key: 'projectileInstantHit', label: 'Instant Hit (Hitscan)', type: 'boolean', hint: 'If enabled, instantly hits target instead of spawning a projectile' },
            { key: 'instantHitRange', label: 'Instant Hit Range', type: 'number', min: 100, max: 5000, showIf: { projectileInstantHit: true }, hint: 'Maximum range for instant hit raycast' },
            { key: 'projectilePrefab', label: 'Projectile Prefab', type: 'prefab', showIf: { projectileInstantHit: false }, hint: 'Prefab to instanceCreate when firing' },
            { key: 'projectileSpeed', label: 'Projectile Speed', type: 'number', min: 50, max: 2000, showIf: { projectileInstantHit: false }, hint: 'Initial speed of spawned projectile' },
            { key: 'projectileSpawnOffset', label: 'Spawn Offset', type: 'number', min: 0, max: 50, showIf: { projectileInstantHit: false }, hint: 'Extra offset from muzzle tip' },
            { key: 'fireRate', label: 'Fire Rate', type: 'number', min: 0.5, max: 30, step: 0.5, hint: 'Shots per second (cooldown between shots)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // � AMMO & RELOAD (inside gun settings)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '🔋 Ammo & Reload', showIf: (m) => m.itemType === 'gun' },
            { key: 'maxAmmo', label: 'Magazine Size', type: 'number', min: 0, max: 500, hint: 'Maximum ammo per magazine (0 = unlimited)' },
            { key: 'currentAmmo', label: 'Current Ammo', type: 'number', min: 0, max: 500, hint: 'Starting ammo count' },
            { key: 'reloadTime', label: 'Reload Time (s)', type: 'slider', min: 0.5, max: 10, step: 0.1, hint: 'Seconds to complete reload' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // �💨 RECOIL (inside gun settings)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '💨 Recoil', showIf: (m) => m.itemType === 'gun' },
            { key: 'recoilAmount', label: 'Recoil Push', type: 'slider', min: 0, max: 30, step: 0.5, hint: 'Pixels the gun/arm pushes back on fire' },
            { key: 'recoilRecoverySpeed', label: 'Recoil Recovery', type: 'number', min: 1, max: 30, hint: 'How fast arm recovers from recoil' },
            { key: 'recoilRotation', label: 'Recoil Kick', type: 'slider', min: 0, max: 30, step: 0.5, hint: 'Degrees of rotational kick per shot' },
            { key: 'recoilArmKickback', label: 'Arm Kickback', type: 'slider', min: 0, max: 1, step: 0.05, hint: 'How much the arm itself moves backward on fire (0=none, 1=max)' },
            { type: 'groupEnd' },

            // ═══════════════════════════════════════════════════════════════
            // ✨ MUZZLE FLASH & PARTICLES (inside gun settings)
            // ═══════════════════════════════════════════════════════════════
            { type: 'groupStart', label: '✨ Muzzle Flash & Particles', showIf: (m) => m.itemType === 'gun' },
            { key: 'gunMuzzleFlashSize', label: 'Flash Size', type: 'slider', min: 0, max: 3, step: 0.1 },
            { key: 'gunMuzzleFlashColor', label: 'Flash Color', type: 'color' },
            { type: 'hint', hint: 'Particle effects emitted from the muzzle on each shot.' },
            { key: 'muzzleParticlesEnabled', label: 'Particles Enabled', type: 'boolean' },
            { key: 'muzzleParticleCount', label: 'Particle Count', type: 'number', min: 1, max: 30, showIf: { muzzleParticlesEnabled: true }, hint: 'Number of particles per shot' },
            { key: 'muzzleParticleSpeed', label: 'Particle Speed', type: 'number', min: 10, max: 500, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleSpeedVariance', label: 'Speed Variance', type: 'number', min: 0, max: 300, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleLifetime', label: 'Lifetime (s)', type: 'slider', min: 0.02, max: 1.0, step: 0.01, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleLifetimeVariance', label: 'Lifetime Variance', type: 'slider', min: 0, max: 0.5, step: 0.01, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleSpreadAngle', label: 'Spread Angle (°)', type: 'number', min: 0, max: 180, showIf: { muzzleParticlesEnabled: true }, hint: 'Total cone angle of particle spread' },
            { key: 'muzzleParticleSizeStart', label: 'Start Size', type: 'slider', min: 0.5, max: 10, step: 0.5, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleSizeEnd', label: 'End Size', type: 'slider', min: 0, max: 10, step: 0.5, showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleColorStart', label: 'Start Color', type: 'color', showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleColorEnd', label: 'End Color', type: 'color', showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleGravity', label: 'Gravity', type: 'number', min: -200, max: 200, showIf: { muzzleParticlesEnabled: true }, hint: 'Downward pull on particles (0 for top-down games)' },
            { key: 'muzzleParticleFadeOut', label: 'Fade Out', type: 'boolean', showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleShape', label: 'Shape', type: 'select', options: ['circle', 'spark', 'smoke'], showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleSmokeEnabled', label: 'Emit Smoke', type: 'boolean', showIf: { muzzleParticlesEnabled: true } },
            { key: 'muzzleParticleSmokeColor', label: 'Smoke Color', type: 'color', showIf: (m) => m.muzzleParticlesEnabled && m.muzzleParticleSmokeEnabled },
            { key: 'muzzleParticleSmokeCount', label: 'Smoke Count', type: 'number', min: 1, max: 10, showIf: (m) => m.muzzleParticlesEnabled && m.muzzleParticleSmokeEnabled },
            { key: 'muzzleParticleSmokeSize', label: 'Smoke Size', type: 'slider', min: 1, max: 15, step: 0.5, showIf: (m) => m.muzzleParticlesEnabled && m.muzzleParticleSmokeEnabled },
            { key: 'muzzleParticleSmokeLifetime', label: 'Smoke Lifetime', type: 'slider', min: 0.1, max: 2.0, step: 0.05, showIf: (m) => m.muzzleParticlesEnabled && m.muzzleParticleSmokeEnabled },
            { type: 'groupEnd' },

            { type: 'groupEnd' }, // End of 🔫 Gun Settings master group

            // Pickup
            { type: 'groupStart', label: '🤲 Pickup' },
            { key: 'canBePickedUp', label: 'Can Be Picked Up', type: 'boolean' },
            { key: 'autoPickup', label: 'Auto Pickup', type: 'boolean', hint: 'Picked up on contact with creature' },
            { key: 'pickupRange', label: 'Pickup Range', type: 'number', min: 5, max: 100, showIf: { autoPickup: true } },
            { type: 'groupEnd' },

            // Combat
            { type: 'groupStart', label: '⚔️ Combat' },
            { key: 'damage', label: 'Damage', type: 'number', min: 0, max: 1000 },
            { key: 'thrownDamage', label: 'Thrown Damage', type: 'number', min: 0, max: 500, hint: 'Damage when item hits after being thrown' },
            { key: 'knockback', label: 'Knockback', type: 'number', min: 0, max: 500 },
            { key: 'attackRange', label: 'Extra Attack Range', type: 'number', min: 0, max: 100, hint: '0 = use item length' },
            { type: 'groupEnd' },

            // Spark Effects
            { type: 'groupStart', label: '✨ Spark Effects' },
            { key: 'sparkOnCollision', label: 'Enable Sparks', type: 'boolean', hint: 'Create sparks when item collides with solid surfaces' },
            { key: 'sparkParticleCount', label: 'Particle Count', type: 'number', min: 1, max: 20, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleSpeed', label: 'Speed', type: 'number', min: 20, max: 400, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleSpeedVariance', label: 'Speed Variance', type: 'number', min: 0, max: 200, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleLifetime', label: 'Lifetime', type: 'number', min: 0.05, max: 1.0, step: 0.05, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleSpreadAngle', label: 'Spread Angle', type: 'number', min: 10, max: 180, showIf: { sparkOnCollision: true }, hint: 'Degrees of spread from collision normal' },
            { key: 'sparkParticleSizeStart', label: 'Start Size', type: 'number', min: 1, max: 10, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleSizeEnd', label: 'End Size', type: 'number', min: 0.5, max: 8, showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleColorStart', label: 'Start Color', type: 'color', showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleColorEnd', label: 'End Color', type: 'color', showIf: { sparkOnCollision: true } },
            { key: 'sparkParticleGravity', label: 'Gravity', type: 'number', min: 0, max: 500, showIf: { sparkOnCollision: true }, hint: 'Downward pull on sparks' },
            { key: 'sparkParticleFadeOut', label: 'Fade Out', type: 'boolean', showIf: { sparkOnCollision: true } },
            { key: 'sparkMinVelocity', label: 'Min Velocity', type: 'number', min: 0, max: 200, showIf: { sparkOnCollision: true }, hint: 'Minimum item speed to trigger sparks' },
            { key: 'sparkCooldown', label: 'Cooldown', type: 'number', min: 0, max: 0.5, step: 0.01, showIf: { sparkOnCollision: true }, hint: 'Time between spark bursts' },
            { type: 'groupEnd' },
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRESET METHODS - Apply common configurations with one click
    // ═══════════════════════════════════════════════════════════════════════

    // ─── SWORD PRESETS ───
    presetLongsword() {
        this.itemType = 'weapon';
        this.generationSubType = 'sword';
        this.itemLength = 60;
        this.itemWidth = 8;
        this.genBladeDetail = 0.6;
        this.genCurvature = 0.0;
        this.genGuardWidth = 0.6;
        this.genPommelSize = 0.5;
        this.twoHanded = true;
        this.weight = 3.5;
        this.damage = 25;
        this._rebuildCache();
    }

    presetShortsword() {
        this.itemType = 'weapon';
        this.generationSubType = 'sword';
        this.itemLength = 35;
        this.itemWidth = 6;
        this.genBladeDetail = 0.5;
        this.genCurvature = 0.0;
        this.genGuardWidth = 0.4;
        this.genPommelSize = 0.4;
        this.twoHanded = false;
        this.weight = 1.5;
        this.damage = 15;
        this._rebuildCache();
    }

    presetKatana() {
        this.itemType = 'weapon';
        this.generationSubType = 'katana';
        this.itemLength = 55;
        this.itemWidth = 5;
        this.genBladeDetail = 0.7;
        this.genCurvature = 0.3;
        this.genGuardWidth = 0.3;
        this.genPommelSize = 0.2;
        this.twoHanded = true;
        this.weight = 2.0;
        this.damage = 22;
        this._rebuildCache();
    }

    presetScimitar() {
        this.itemType = 'weapon';
        this.generationSubType = 'scimitar';
        this.itemLength = 45;
        this.itemWidth = 7;
        this.genBladeDetail = 0.5;
        this.genCurvature = 0.6;
        this.genGuardWidth = 0.3;
        this.genPommelSize = 0.3;
        this.twoHanded = false;
        this.weight = 2.0;
        this.damage = 18;
        this._rebuildCache();
    }

    // ─── DAGGER PRESETS ───
    presetDagger() {
        this.itemType = 'weapon';
        this.generationSubType = 'dagger';
        this.itemLength = 20;
        this.itemWidth = 4;
        this.daggerBladeStyle = 'straight';
        this.daggerCrossguard = true;
        this.daggerFullerWidth = 0.3;
        this.twoHanded = false;
        this.weight = 0.5;
        this.damage = 8;
        this._rebuildCache();
    }

    presetKnife() {
        this.itemType = 'weapon';
        this.generationSubType = 'dagger';
        this.itemLength = 15;
        this.itemWidth = 3;
        this.daggerBladeStyle = 'curved';
        this.daggerCrossguard = false;
        this.daggerFullerWidth = 0.0;
        this.twoHanded = false;
        this.weight = 0.3;
        this.damage = 6;
        this._rebuildCache();
    }

    presetStiletto() {
        this.itemType = 'weapon';
        this.generationSubType = 'dagger';
        this.itemLength = 22;
        this.itemWidth = 2;
        this.daggerBladeStyle = 'straight';
        this.daggerCrossguard = true;
        this.daggerFullerWidth = 0.0;
        this.twoHanded = false;
        this.weight = 0.4;
        this.damage = 10;
        this._rebuildCache();
    }

    // ─── SPEAR PRESETS ───
    presetWarSpear() {
        this.itemType = 'weapon';
        this.generationSubType = 'spear';
        this.itemLength = 90;
        this.itemWidth = 4;
        this.spearTipSize = 0.7;
        this.spearTipStyle = 'broad';
        this.spearShaftTaper = 0.1;
        this.spearBindingCount = 2;
        this.twoHanded = true;
        this.weight = 4.0;
        this.damage = 28;
        this._rebuildCache();
    }

    presetHuntingSpear() {
        this.itemType = 'weapon';
        this.generationSubType = 'spear';
        this.itemLength = 70;
        this.itemWidth = 3;
        this.spearTipSize = 0.5;
        this.spearTipStyle = 'leaf';
        this.spearShaftTaper = 0.0;
        this.spearBindingCount = 1;
        this.twoHanded = true;
        this.weight = 2.5;
        this.damage = 20;
        this._rebuildCache();
    }

    presetJavelin() {
        this.itemType = 'weapon';
        this.generationSubType = 'spear';
        this.itemLength = 55;
        this.itemWidth = 2;
        this.spearTipSize = 0.4;
        this.spearTipStyle = 'narrow';
        this.spearShaftTaper = 0.2;
        this.spearBindingCount = 0;
        this.twoHanded = false;
        this.weight = 1.2;
        this.damage = 16;
        this._rebuildCache();
    }

    presetTrident() {
        this.itemType = 'weapon';
        this.generationSubType = 'spear';
        this.itemLength = 80;
        this.itemWidth = 4;
        this.spearTipSize = 1.0;
        this.spearTipStyle = 'barbed';
        this.spearShaftTaper = 0.0;
        this.spearBindingCount = 1;
        this.twoHanded = true;
        this.weight = 3.5;
        this.damage = 24;
        this._rebuildCache();
    }

    // ─── AXE PRESETS ───
    presetBattleAxe() {
        this.itemType = 'weapon';
        this.generationSubType = 'axe';
        this.itemLength = 50;
        this.itemWidth = 10;
        this.axeHeadSize = 0.8;
        this.axeHeadStyle = 'single';
        this.axeHeadCurve = 0.5;
        this.axeSpike = false;
        this.twoHanded = true;
        this.weight = 5.0;
        this.damage = 30;
        this._rebuildCache();
    }

    presetHatchet() {
        this.itemType = 'weapon';
        this.generationSubType = 'axe';
        this.itemLength = 30;
        this.itemWidth = 6;
        this.axeHeadSize = 0.5;
        this.axeHeadStyle = 'single';
        this.axeHeadCurve = 0.3;
        this.axeSpike = false;
        this.twoHanded = false;
        this.weight = 1.8;
        this.damage = 14;
        this._rebuildCache();
    }

    presetGreataxe() {
        this.itemType = 'weapon';
        this.generationSubType = 'axe';
        this.itemLength = 70;
        this.itemWidth = 14;
        this.axeHeadSize = 1.2;
        this.axeHeadStyle = 'double';
        this.axeHeadCurve = 0.6;
        this.axeSpike = false;
        this.twoHanded = true;
        this.weight = 7.0;
        this.damage = 40;
        this._rebuildCache();
    }

    presetBeardedAxe() {
        this.itemType = 'weapon';
        this.generationSubType = 'axe';
        this.itemLength = 45;
        this.itemWidth = 8;
        this.axeHeadSize = 0.7;
        this.axeHeadStyle = 'bearded';
        this.axeHeadCurve = 0.7;
        this.axeSpike = true;
        this.twoHanded = false;
        this.weight = 3.0;
        this.damage = 22;
        this._rebuildCache();
    }

    // ─── MACE PRESETS ───
    presetWarMace() {
        this.itemType = 'weapon';
        this.generationSubType = 'mace';
        this.itemLength = 45;
        this.itemWidth = 8;
        this.maceHeadSize = 0.7;
        this.maceHeadStyle = 'flanged';
        this.maceFlangeCount = 6;
        this.maceFlangeLength = 0.5;
        this.twoHanded = false;
        this.weight = 4.0;
        this.damage = 26;
        this._rebuildCache();
    }

    presetMorningStar() {
        this.itemType = 'weapon';
        this.generationSubType = 'mace';
        this.itemLength = 50;
        this.itemWidth = 10;
        this.maceHeadSize = 0.8;
        this.maceHeadStyle = 'spiked';
        this.maceFlangeCount = 10;
        this.maceFlangeLength = 0.7;
        this.twoHanded = false;
        this.weight = 4.5;
        this.damage = 28;
        this._rebuildCache();
    }

    presetCudgel() {
        this.itemType = 'weapon';
        this.generationSubType = 'mace';
        this.itemLength = 35;
        this.itemWidth = 6;
        this.maceHeadSize = 0.5;
        this.maceHeadStyle = 'ball';
        this.maceFlangeCount = 4;
        this.maceFlangeLength = 0.2;
        this.twoHanded = false;
        this.weight = 2.0;
        this.damage = 12;
        this._rebuildCache();
    }

    // ─── HAMMER PRESETS ───
    presetWarHammer() {
        this.itemType = 'weapon';
        this.generationSubType = 'hammer';
        this.itemLength = 55;
        this.itemWidth = 10;
        this.hammerHeadLength = 0.7;
        this.hammerHeadStyle = 'war';
        this.hammerSpike = true;
        this.twoHanded = true;
        this.weight = 5.5;
        this.damage = 32;
        this._rebuildCache();
    }

    presetSledgehammer() {
        this.itemType = 'weapon';
        this.generationSubType = 'hammer';
        this.itemLength = 65;
        this.itemWidth = 12;
        this.hammerHeadLength = 1.0;
        this.hammerHeadStyle = 'sledge';
        this.hammerSpike = false;
        this.twoHanded = true;
        this.weight = 8.0;
        this.damage = 45;
        this._rebuildCache();
    }

    presetClaw() {
        this.itemType = 'weapon';
        this.generationSubType = 'hammer';
        this.itemLength = 35;
        this.itemWidth = 6;
        this.hammerHeadLength = 0.5;
        this.hammerHeadStyle = 'flat';
        this.hammerSpike = true;
        this.twoHanded = false;
        this.weight = 2.0;
        this.damage = 14;
        this._rebuildCache();
    }

    // ─── SHIELD PRESETS ───
    presetRoundShield() {
        this.itemType = 'shield';
        this.generationSubType = 'round';
        this.itemLength = 40;
        this.itemWidth = 40;
        this.shieldBossSize = 0.4;
        this.shieldRimWidth = 0.1;
        this.shieldEmblem = 'circle';
        this.twoHanded = false;
        this.weight = 3.0;
        this._rebuildCache();
    }

    presetKiteShield() {
        this.itemType = 'shield';
        this.generationSubType = 'kite';
        this.itemLength = 55;
        this.itemWidth = 35;
        this.shieldBossSize = 0.3;
        this.shieldRimWidth = 0.15;
        this.shieldEmblem = 'chevron';
        this.twoHanded = false;
        this.weight = 4.0;
        this._rebuildCache();
    }

    presetTowerShield() {
        this.itemType = 'shield';
        this.generationSubType = 'tower';
        this.itemLength = 70;
        this.itemWidth = 40;
        this.shieldBossSize = 0.2;
        this.shieldRimWidth = 0.2;
        this.shieldEmblem = 'cross';
        this.twoHanded = true;
        this.weight = 7.0;
        this._rebuildCache();
    }

    presetBuckler() {
        this.itemType = 'shield';
        this.generationSubType = 'buckler';
        this.itemLength = 25;
        this.itemWidth = 25;
        this.shieldBossSize = 0.5;
        this.shieldRimWidth = 0.05;
        this.shieldEmblem = 'none';
        this.twoHanded = false;
        this.weight = 1.0;
        this._rebuildCache();
    }

    // ─── GUN PRESETS ───
    presetPistol() {
        this.itemType = 'gun';
        this.gunSubType = 'pistol';
        this.gunBodyLength = 20;
        this.gunBodyHeight = 6;
        this.gunBarrelLength = 12;
        this.gunBarrelThickness = 2;
        this.gunStockEnabled = false;
        this.gunForegripEnabled = false;
        this.gunMagazineStyle = 'box';
        this.gunMagazineSize = 0.4;
        this.gunScopeEnabled = false;
        this.gunMuzzleDevice = 'none';
        this.damage = 12;
        this.fireRate = 3;
        this.recoilAmount = 6;
        this._rebuildCache();
    }

    presetRevolver() {
        this.itemType = 'gun';
        this.gunSubType = 'revolver';
        this.gunBodyLength = 22;
        this.gunBodyHeight = 8;
        this.gunBarrelLength = 14;
        this.gunBarrelThickness = 2;
        this.gunStockEnabled = false;
        this.gunForegripEnabled = false;
        this.gunMagazineStyle = 'internal';
        this.gunScopeEnabled = false;
        this.gunMuzzleDevice = 'none';
        this.damage = 18;
        this.fireRate = 1.5;
        this.recoilAmount = 10;
        this._rebuildCache();
    }

    presetAssaultRifle() {
        this.itemType = 'gun';
        this.gunSubType = 'rifle';
        this.gunBodyLength = 35;
        this.gunBodyHeight = 8;
        this.gunBarrelLength = 22;
        this.gunBarrelThickness = 3;
        this.gunStockEnabled = true;
        this.gunStockStyle = 'fixed';
        this.gunStockLength = 18;
        this.gunForegripEnabled = true;
        this.gunForegripStyle = 'vertical';
        this.gunMagazineStyle = 'curved';
        this.gunMagazineSize = 0.6;
        this.gunScopeEnabled = true;
        this.gunScopeStyle = 'reddot';
        this.gunMuzzleDevice = 'flash_hider';
        this.gunRailEnabled = true;
        this.damage = 20;
        this.fireRate = 8;
        this.recoilAmount = 8;
        this._rebuildCache();
    }

    presetSniperRifle() {
        this.itemType = 'gun';
        this.gunSubType = 'sniper';
        this.gunBodyLength = 40;
        this.gunBodyHeight = 7;
        this.gunBarrelLength = 35;
        this.gunBarrelThickness = 3;
        this.gunBarrelStyle = 'heavy';
        this.gunStockEnabled = true;
        this.gunStockStyle = 'thumbhole';
        this.gunStockLength = 22;
        this.gunForegripEnabled = true;
        this.gunForegripStyle = 'bipod';
        this.gunMagazineStyle = 'box';
        this.gunMagazineSize = 0.4;
        this.gunScopeEnabled = true;
        this.gunScopeStyle = 'sniper';
        this.gunScopeSize = 0.8;
        this.gunMuzzleDevice = 'suppressor';
        this.damage = 50;
        this.fireRate = 0.8;
        this.recoilAmount = 15;
        this._rebuildCache();
    }

    presetShotgun() {
        this.itemType = 'gun';
        this.gunSubType = 'shotgun';
        this.gunBodyLength = 30;
        this.gunBodyHeight = 8;
        this.gunBarrelLength = 25;
        this.gunBarrelThickness = 4;
        this.gunBarrelStyle = 'heavy';
        this.gunStockEnabled = true;
        this.gunStockStyle = 'fixed';
        this.gunStockLength = 16;
        this.gunForegripEnabled = true;
        this.gunForegripStyle = 'handguard';
        this.gunMagazineStyle = 'tube';
        this.gunScopeEnabled = false;
        this.gunMuzzleDevice = 'brake';
        this.damage = 35;
        this.fireRate = 1.2;
        this.recoilAmount = 18;
        this._rebuildCache();
    }

    presetSMG() {
        this.itemType = 'gun';
        this.gunSubType = 'smg';
        this.gunBodyLength = 25;
        this.gunBodyHeight = 7;
        this.gunBarrelLength = 15;
        this.gunBarrelThickness = 2;
        this.gunStockEnabled = true;
        this.gunStockStyle = 'folding';
        this.gunStockLength = 12;
        this.gunForegripEnabled = true;
        this.gunForegripStyle = 'stubby';
        this.gunMagazineStyle = 'box';
        this.gunMagazineSize = 0.5;
        this.gunScopeEnabled = false;
        this.gunMuzzleDevice = 'compensator';
        this.damage = 10;
        this.fireRate = 12;
        this.recoilAmount = 5;
        this._rebuildCache();
    }

    presetRocketLauncher() {
        this.itemType = 'gun';
        this.gunSubType = 'launcher';
        this.gunBodyLength = 45;
        this.gunBodyHeight = 12;
        this.gunBarrelLength = 40;
        this.gunBarrelThickness = 6;
        this.gunBarrelStyle = 'heavy';
        this.gunStockEnabled = false;
        this.gunForegripEnabled = true;
        this.gunForegripStyle = 'vertical';
        this.gunMagazineStyle = 'internal';
        this.gunScopeEnabled = true;
        this.gunScopeStyle = 'acog';
        this.gunMuzzleDevice = 'none';
        this.damage = 100;
        this.fireRate = 0.3;
        this.recoilAmount = 25;
        this._rebuildCache();
    }

    // ─── TOOL PRESETS ───
    presetPickaxe() {
        this.itemType = 'tool';
        this.generationSubType = 'pickaxe';
        this.itemLength = 50;
        this.itemWidth = 8;
        this.twoHanded = true;
        this.weight = 3.5;
        this.damage = 12;
        this._rebuildCache();
    }

    presetShovel() {
        this.itemType = 'tool';
        this.generationSubType = 'shovel';
        this.itemLength = 55;
        this.itemWidth = 6;
        this.twoHanded = true;
        this.weight = 2.5;
        this.damage = 8;
        this._rebuildCache();
    }

    presetSickle() {
        this.itemType = 'tool';
        this.generationSubType = 'sickle';
        this.itemLength = 30;
        this.itemWidth = 5;
        this.genCurvature = 0.7;
        this.twoHanded = false;
        this.weight = 1.0;
        this.damage = 10;
        this._rebuildCache();
    }

    presetTorch() {
        this.itemType = 'misc';
        this.generationSubType = 'torch';
        this.itemLength = 25;
        this.itemWidth = 4;
        this.torchFlameSize = 0.6;
        this.twoHanded = false;
        this.weight = 0.5;
        this.damage = 5;
        this._rebuildCache();
    }

    start() {
        this._originalDepth = this.gameObject.depth || 0;
        if (this.drawGeneratedItem) {
            this._generateItemData();
        }
        this._rebuildCache();
    }

    loop(deltaTime) {
        // Handle thrown item physics
        if (this._throwVelocity && !this.isHeld) {
            const vel = this._throwVelocity;
            this.gameObject.position.x += vel.x * deltaTime;
            this.gameObject.position.y += vel.y * deltaTime;

            if (this._throwSpin) {
                this.gameObject.angle += this._throwSpin * deltaTime;
            }

            vel.x *= Math.pow(this._throwFriction, deltaTime * 60);
            vel.y *= Math.pow(this._throwFriction, deltaTime * 60);
            if (this._throwSpin) {
                this._throwSpin *= Math.pow(this._throwFriction, deltaTime * 60);
            }

            if (Math.abs(vel.x) < 0.5 && Math.abs(vel.y) < 0.5) {
                this._throwVelocity = null;
                this._throwSpin = 0;
            }
        }

        // Auto-pickup check
        if (this.autoPickup && this.canBePickedUp && !this.isHeld) {
            this._checkAutoPickup();
        }

        // Gun recoil recovery
        if (this.itemType === 'gun') {
            if (this._recoilCurrent > 0) {
                this._recoilCurrent -= this.recoilRecoverySpeed * deltaTime * this._recoilCurrent * 3;
                if (this._recoilCurrent < 0.1) this._recoilCurrent = 0;
            }
            if (this._recoilAngleCurrent > 0) {
                this._recoilAngleCurrent -= this.recoilRecoverySpeed * deltaTime * this._recoilAngleCurrent * 3;
                if (this._recoilAngleCurrent < 0.1) this._recoilAngleCurrent = 0;
            }
            if (this._fireCooldown > 0) {
                this._fireCooldown -= deltaTime;
            }
            if (this._muzzleFlashTimer > 0) {
                this._muzzleFlashTimer -= deltaTime;
            }

            // Handle reload timer
            if (this._isReloading) {
                this._reloadTimer -= deltaTime;
                
                // Update arm reload animation
                if (this.isHeld && this._holder && this._holdingArmIndex >= 0) {
                    const holder = this._holder;
                    if (holder._arms && holder._arms[this._holdingArmIndex]) {
                        const arm = holder._arms[this._holdingArmIndex];
                        arm._reloadProgress = this.getReloadProgress();
                    }
                }
                
                if (this._reloadTimer <= 0) {
                    this.finishReload();
                }
            }

            // Automatic fire mode: keep firing while trigger is held
            if (this.fireMode === 'automatic' && this._triggerHeld && this.isHeld) {
                if (this._fireCooldown <= 0 && !this._isReloading) {
                    this.fireProjectile();
                }
            }
        }

        // Update muzzle flash particles
        this._updateMuzzleParticles(deltaTime);
    }

    // ==================== TRIGGER CONTROL ====================

    /**
     * Called when the trigger is pressed (mouse down / action start)
     * For single mode: fires once. For automatic: starts continuous fire.
     */
    pressTrigger() {
        if (this.itemType !== 'gun') return;
        this._triggerHeld = true;
        this._hasFiredThisTrigger = false;

        // Single mode: fire immediately on press
        if (this.fireMode === 'single' && !this._hasFiredThisTrigger) {
            if (this._fireCooldown <= 0) {
                this.fireProjectile();
                this._hasFiredThisTrigger = true;
            }
        }
        // Automatic: fire immediately on press too, then loop() handles continuation
        if (this.fireMode === 'automatic') {
            if (this._fireCooldown <= 0) {
                this.fireProjectile();
            }
        }
    }

    /**
     * Called when the trigger is released (mouse up / action end)
     */
    releaseTrigger() {
        this._triggerHeld = false;
        this._hasFiredThisTrigger = false;
    }

    // ==================== MUZZLE FLASH PARTICLES ====================

    /**
     * Spawn muzzle flash particles at the muzzle position
     */
    _spawnMuzzleParticles() {
        if (!this.muzzleParticlesEnabled) return;

        const muzzle = this.getMuzzleWorldPosition();
        const gunAngle = (this.gameObject.angle || 0) * Math.PI / 180;
        const halfSpread = (this.muzzleParticleSpreadAngle / 2) * Math.PI / 180;

        // Fire particles
        for (let i = 0; i < this.muzzleParticleCount; i++) {
            const spreadAngle = gunAngle + (Math.random() * 2 - 1) * halfSpread;
            const speed = this.muzzleParticleSpeed + (Math.random() * this.muzzleParticleSpeedVariance);
            const lifetime = this.muzzleParticleLifetime + (Math.random() * this.muzzleParticleLifetimeVariance);

            this._muzzleParticles.push({
                x: muzzle.x,
                y: muzzle.y,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed,
                life: lifetime,
                maxLife: lifetime,
                sizeStart: this.muzzleParticleSizeStart,
                sizeEnd: this.muzzleParticleSizeEnd,
                colorStart: this.muzzleParticleColorStart,
                colorEnd: this.muzzleParticleColorEnd,
                shape: this.muzzleParticleShape,
                isSmoke: false
            });
        }

        // Smoke particles (slower, bigger, longer-lived)
        if (this.muzzleParticleSmokeEnabled) {
            for (let i = 0; i < this.muzzleParticleSmokeCount; i++) {
                const spreadAngle = gunAngle + (Math.random() * 2 - 1) * halfSpread * 0.7;
                const speed = 15 + Math.random() * 25; // Much slower
                const lifetime = this.muzzleParticleSmokeLifetime + Math.random() * 0.2;

                this._muzzleParticles.push({
                    x: muzzle.x,
                    y: muzzle.y,
                    vx: Math.cos(spreadAngle) * speed,
                    vy: Math.sin(spreadAngle) * speed,
                    life: lifetime,
                    maxLife: lifetime,
                    sizeStart: this.muzzleParticleSmokeSize * 0.5,
                    sizeEnd: this.muzzleParticleSmokeSize * 1.5,
                    colorStart: this.muzzleParticleSmokeColor,
                    colorEnd: this.muzzleParticleSmokeColor,
                    shape: 'smoke',
                    isSmoke: true
                });
            }
        }
    }

    /**
     * Update all active muzzle particles
     */
    _updateMuzzleParticles(deltaTime) {
        for (let i = this._muzzleParticles.length - 1; i >= 0; i--) {
            const p = this._muzzleParticles[i];
            p.life -= deltaTime;
            if (p.life <= 0) {
                this._muzzleParticles.splice(i, 1);
                continue;
            }
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += this.muzzleParticleGravity * deltaTime;

            // Slow down smoke
            if (p.isSmoke) {
                p.vx *= Math.pow(0.92, deltaTime * 60);
                p.vy *= Math.pow(0.92, deltaTime * 60);
            }
        }
    }

    /**
     * Draw all active muzzle particles (called from draw, in world space)
     */
    _drawMuzzleParticles(ctx) {
        if (this._muzzleParticles.length === 0) return;

        ctx.save();
        for (const p of this._muzzleParticles) {
            const t = 1.0 - (p.life / p.maxLife); // 0 → 1 over lifetime
            const size = p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
            const alpha = this.muzzleParticleFadeOut ? (1.0 - t) : 1.0;
            const color = this._blendColors(p.colorStart, p.colorEnd, t);

            ctx.globalAlpha = alpha * (p.isSmoke ? 0.4 : 1.0);
            ctx.fillStyle = color;

            if (p.shape === 'circle' || p.shape === 'smoke') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'spark') {
                // Elongated spark in velocity direction
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 1) {
                    const angle = Math.atan2(p.vy, p.vx);
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, size * 2, size * 0.4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    // ==================== GRIP HELPERS ====================

    /**
     * Get the effective handle offset, auto-calculated if autoOffsetToGrip is on
     */
    _getEffectiveHandleOffset() {
        if (this.autoOffsetToGrip) {
            const halfLen = this.itemLength / 2;
            const gripX = -halfLen + this.handleLength * 0.5;
            return { x: gripX, y: 0 };
        }
        return { x: this.handleOffsetX, y: this.handleOffsetY };
    }

    /**
     * Get the weight's center of gravity position in local space (along X axis)
     * @returns {number} Local X position of center of gravity
     */
    getWeightCenterOfGravity() {
        const halfLen = this.itemLength / 2;
        return -halfLen + this.weightBalance * this.itemLength;
    }

    /**
     * Get the torque factor - how much the item's weight wants to rotate the arm
     * @returns {number} Torque factor (0 = easy, higher = harder to hold)
     */
    getTorqueFactor() {
        const grip = this._getEffectiveHandleOffset();
        const cog = this.getWeightCenterOfGravity();
        const leverArm = Math.abs(cog - grip.x);
        return this.weight * leverArm / this.itemLength;
    }

    // ==================== WORLD POSITION HELPERS ====================

    /**
     * Get the handle position in world space
     * @returns {{x: number, y: number}}
     */
    getHandleWorldPosition() {
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const grip = this._getEffectiveHandleOffset();

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const worldHandleX = pos.x + grip.x * cos - grip.y * sin;
        const worldHandleY = pos.y + grip.x * sin + grip.y * cos;

        return { x: worldHandleX, y: worldHandleY };
    }

    /**
     * Get the second hand grip position for two-handed items (local space)
     * This is positioned along the item shaft, between the primary grip and the blade/tip
     * @returns {{x: number, y: number}|null}
     */
    getSecondHandLocalOffset() {
        if (!this.twoHanded) return null;
        const grip = this._getEffectiveHandleOffset();
        // Position second hand further up the shaft (toward the blade/tip)
        // About 40% of the way from grip to item center
        const offsetX = grip.x + this.itemLength * 0.25;
        return { x: offsetX, y: 0 };
    }

    /**
     * Get second hand grip position in world space for two-handed items
     * @returns {{x: number, y: number}|null}
     */
    getSecondHandWorldPosition() {
        if (!this.twoHanded || !this.isHeld) return null;
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const local = this.getSecondHandLocalOffset();
        if (!local) return null;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: pos.x + local.x * cos - local.y * sin,
            y: pos.y + local.x * sin + local.y * cos
        };
    }

    /**
     * Check if this item is being held with both hands
     * @returns {boolean}
     */
    isHeldTwoHanded() {
        if (!this.twoHanded || !this.isHeld || !this._holder) return false;
        // Check if any other arm is supporting this item
        const arms = this._holder._arms;
        if (!arms) return false;
        for (let i = 0; i < arms.length; i++) {
            if (i === this._holdingArmIndex) continue;
            if (arms[i]._twoHandedSourceArm === this._holdingArmIndex) {
                return true;
            }
        }
        return false;
    }

    /**
     * Called when a creature picks up this item
     * @param {ProceduralCreature} creature - The creature picking up
     * @param {number} armIndex - Which arm is holding it
     */
    onPickedUp(creature, armIndex) {
        this.isHeld = true;
        this._holder = creature;
        this._holdingArmIndex = armIndex;
        // Store the item's original depth before being held
        this._defaultDepth = this.gameObject.depth || 0;
        if (creature.gameObject) {
            // Set depth based on itemDepthPosition: below = behind creature, above = in front
            if (this.itemDepthPosition === 'above') {
                this.gameObject.depth = creature.gameObject.depth - 1; // Lower depth = drawn on top
            } else {
                this.gameObject.depth = creature.gameObject.depth + 1; // Higher depth = drawn behind
            }
        }
    }

    /**
     * Called when the creature drops this item
     */
    onDropped() {
        this.isHeld = false;
        this._holder = null;
        this._holdingArmIndex = -1;
        this.gameObject.depth = this._defaultDepth;
        this._throwVelocity = null;
        this._isSwinging = false;
        this._swingProgress = 0;
        this._triggerHeld = false;
        this._hasFiredThisTrigger = false;
        this._isFiring = false;
        if (this.gameObject.scale) {
            this.gameObject.scale.y = Math.abs(this.gameObject.scale.y || 1);
        }
    }

    /**
     * Called when the creature throws this item
     * @param {number} velX - Throw velocity X
     * @param {number} velY - Throw velocity Y
     * @param {number} spinSpeed - Rotational speed in degrees/sec
     * @param {string} [throwerId] - The gameObject._id of the creature that threw this item
     */
    onThrown(velX, velY, spinSpeed, throwerId) {
        this.onDropped();
        this._throwVelocity = { x: velX, y: velY };
        this._throwSpin = spinSpeed || 0;
        this._throwFriction = 0.96;
        this._thrownById = throwerId || null; // Track who threw this item
    }

    // ==================== HELD POSITION UPDATE ====================

    /**
     * Update the item's position/rotation when held by a creature hand.
     * @param {number} handX - Hand world X
     * @param {number} handY - Hand world Y
     * @param {number} creatureAngle - Creature's head world angle (radians)
     * @param {number} armSide - Which side the arm is on: -1 = left, 1 = right
     */
    updateHeldPosition(handX, handY, armAngle, armSide) {
        if (!this.isHeld) return;

        const isLeftHand = (armSide || 1) < 0;
        const mirrorFactor = isLeftHand ? -1 : 1;

        const grip = this._getEffectiveHandleOffset();
        const effectiveAngleOffset = this.holdingAngleOffset * mirrorFactor;
        const effectiveHandleY = grip.y * mirrorFactor;

        // armAngle is the arm direction (base→hand) in radians
        // holdingAngleOffset is in degrees, converted to radians
        const itemAngle = armAngle + (effectiveAngleOffset * Math.PI / 180);

        const cos = Math.cos(itemAngle);
        const sin = Math.sin(itemAngle);
        const handleWorldX = grip.x * cos - effectiveHandleY * sin;
        const handleWorldY = grip.x * sin + effectiveHandleY * cos;

        let finalX = handX - handleWorldX;
        let finalY = handY - handleWorldY;

        // Adjust position for parallax/depth offset if the holder creature has depth enabled
        if (this._holder && this._holder.depthEnabled) {
            // _getDepthOffset returns offsets in LOCAL space (counter-rotated by body angle)
            // We need to rotate them back to WORLD space since item position is in world coords
            const holderBodyAngle = (this._holder.gameObject.angle || 0) * Math.PI / 180;

            // Calculate per-arm hand height (matches _drawArm logic for multi-arm creatures)
            let handHeight = this._holder.handHeightDepth || 0.25;
            if (this._holdingArmIndex >= 0 && this._holder._arms) {
                const armPairIndex = Math.floor(this._holdingArmIndex / 2);
                const totalArmPairs = Math.ceil((this._holder.armCount || 2) / 2);
                if (totalArmPairs > 1) {
                    const t = armPairIndex / (totalArmPairs - 1);
                    handHeight = handHeight * (1 - t * 0.6);
                }
            }

            const localOffset = this._holder._getDepthOffset(handHeight);
            if (localOffset.x !== 0 || localOffset.y !== 0) {
                // Rotate local-space offset back to world-space
                const bCos = Math.cos(holderBodyAngle);
                const bSin = Math.sin(holderBodyAngle);
                finalX += localOffset.x * bCos - localOffset.y * bSin;
                finalY += localOffset.x * bSin + localOffset.y * bCos;
            }

            // Update the item's render depth to stay relative to the creature
            if (this._holder.gameObject) {
                if (this.itemDepthPosition === 'above') {
                    this.gameObject.depth = this._holder.gameObject.depth - 1;
                } else {
                    this.gameObject.depth = this._holder.gameObject.depth + 1;
                }
            }
        }

        this.gameObject.position.x = finalX;
        this.gameObject.position.y = finalY;
        this.gameObject.angle = itemAngle * 180 / Math.PI;

        if (isLeftHand) {
            this.gameObject.scale = this.gameObject.scale || { x: 1, y: 1 };
            this.gameObject.scale.y = -Math.abs(this.gameObject.scale.y || 1);
        } else {
            if (this.gameObject.scale) {
                this.gameObject.scale.y = Math.abs(this.gameObject.scale.y || 1);
            }
        }
    }

    /**
     * Get the tip (forward end) of the item in world space
     * @returns {{x: number, y: number}}
     */
    getTipWorldPosition() {
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const tipLocalX = this.itemLength / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: pos.x + tipLocalX * cos,
            y: pos.y + tipLocalX * sin
        };
    }

    /**
     * Get the weight center-of-gravity point in world space.
     * This is the point along the item where most of the mass is concentrated,
     * determined by weightBalance (0 = handle end, 1 = tip end).
     * @returns {{x: number, y: number}}
     */
    getWeightPointWorldPosition() {
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const cogLocalX = this.getWeightCenterOfGravity(); // local X along item axis
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: pos.x + cogLocalX * cos,
            y: pos.y + cogLocalX * sin
        };
    }

    /**
     * Get the distance from the grip/handle to the weight point (center of gravity).
     * Used by the creature's IK attack system to know how far from the hand the
     * heavy part of the item is.
     * @returns {number} Distance in pixels from grip to center of gravity
     */
    getGripToWeightDistance() {
        const grip = this._getEffectiveHandleOffset();
        const cog = this.getWeightCenterOfGravity();
        return Math.abs(cog - grip.x);
    }

    /**
     * Get the distance from the grip/handle to the tip of the item.
     * Used by the creature's IK attack system to determine effective reach.
     * @returns {number} Distance in pixels from grip to tip
     */
    getGripToTipDistance() {
        const grip = this._getEffectiveHandleOffset();
        const tipX = this.itemLength / 2;
        return Math.abs(tipX - grip.x);
    }

    /**
     * Get effective attack range (item length + extra range)
     * @returns {number}
     */
    getAttackRange() {
        return this.attackRange > 0 ? this.attackRange : this.itemLength;
    }

    /**
     * Get the four corners of the item in world space as an OBB (oriented bounding box).
     * Accounts for position, rotation, and scale. Useful for collision detection.
     * @returns {Array<{x: number, y: number}>} Four corner points [topLeft, topRight, bottomRight, bottomLeft]
     */
    getWorldCorners() {
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const scaleX = this.gameObject.scale ? Math.abs(this.gameObject.scale.x || 1) : 1;
        const scaleY = this.gameObject.scale ? Math.abs(this.gameObject.scale.y || 1) : 1;
        const halfLen = (this.itemLength * scaleX) / 2;
        const halfW = (this.itemWidth * scaleY) / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Local corners relative to item center
        const corners = [
            { x: -halfLen, y: -halfW },
            { x: halfLen, y: -halfW },
            { x: halfLen, y: halfW },
            { x: -halfLen, y: halfW }
        ];

        // Rotate and translate to world space
        return corners.map(c => ({
            x: pos.x + c.x * cos - c.y * sin,
            y: pos.y + c.x * sin + c.y * cos
        }));
    }

    /**
     * Get the OBB axes (edge normals) for SAT collision testing.
     * @returns {Array<{x: number, y: number}>} Two perpendicular axes
     */
    getOBBAxes() {
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            { x: cos, y: sin },   // Along item length
            { x: -sin, y: cos }   // Along item width
        ];
    }

    /**
     * Project this item's world corners onto an axis for SAT.
     * @param {Object} axis - {x, y} normalized axis
     * @returns {{min: number, max: number}}
     */
    projectOntoAxis(axis) {
        const corners = this.getWorldCorners();
        let min = corners[0].x * axis.x + corners[0].y * axis.y;
        let max = min;
        for (let i = 1; i < corners.length; i++) {
            const proj = corners[i].x * axis.x + corners[i].y * axis.y;
            if (proj < min) min = proj;
            if (proj > max) max = proj;
        }
        return { min, max };
    }

    // ==================== AUTO PICKUP ====================

    /**
     * Check for nearby creatures for auto-pickup
     */
    _checkAutoPickup() {
        const _engine = this.gameObject._engine;
        const _instances = _engine ? _engine.instances : null;
        if (!_instances) return;

        const pos = this.gameObject.position;
        const rangeSq = this.pickupRange * this.pickupRange;

        for (const obj of _instances) {
            if (obj === this.gameObject) continue;
            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature || creature.isDead) continue;

            const dx = obj.position.x - pos.x;
            const dy = obj.position.y - pos.y;
            if (dx * dx + dy * dy < rangeSq) {
                // Find a free arm on this creature
                for (let i = 0; i < creature._arms.length; i++) {
                    const arm = creature._arms[i];
                    if (!arm.heldItem && arm.state === 'idle') {
                        creature.pickUpItem(i, this);
                        return;
                    }
                }
            }
        }
    }

    /**
     * Draw the item (from cached offscreen canvas)
     */
    draw(ctx) {
        if (typeof this.drawUntethered === 'function') this.drawUntethered(ctx);

        // Regenerate if seed changed or cache is stale
        const newKey = this._buildCacheKey();
        if (newKey !== this._cacheKey) {
            if (this.drawGeneratedItem) {
                this._generateItemData();
            }
            this._rebuildCache();
        }

        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const scaleY = (this.gameObject.scale && this.gameObject.scale.y) || 1;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.scale(1, scaleY);

        // Apply gun recoil offset (position only, no rotation)
        if (this.itemType === 'gun' && this._recoilCurrent > 0) {
            ctx.translate(-this._recoilCurrent, 0);
        }

        // Draw from cache (pixel-crisp)
        ctx.imageSmoothingEnabled = false;
        const isGun = this.itemType === 'gun' && this.drawGeneratedItem;
        const cache = isGun && this.isHeld ? this._cachedCanvasHeld : this._cachedCanvas;

        if (cache && cache.canvas) {
            ctx.drawImage(cache.canvas, -cache.originX, -cache.originY);
        } else if (this.drawGeneratedItem && this._generatedPath) {
            this._drawGeneratedItem(ctx);
        } else {
            this._drawDefaultItem(ctx);
        }

        // Muzzle flash (drawn live, not cached since it's transient)
        if (isGun && this._muzzleFlashTimer > 0 && this.gunMuzzleFlashSize > 0) {
            this._drawMuzzleFlash(ctx);
        }

        // Draw handle offset indicator (only in editor mode)
        if (this.gameObject._engine && this.gameObject._engine.isEditor) {
            const grip = this._getEffectiveHandleOffset();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(grip.x, grip.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Show foregrip position for two-handed guns
            if (isGun && this.gunForegripEnabled) {
                const fg = this.getForegripWorldOffset();
                ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(fg.x, fg.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        // Draw muzzle particles in world space (outside item transform)
        if (this.itemType === 'gun' && this._muzzleParticles.length > 0) {
            this._drawMuzzleParticles(ctx);
        }

        if (typeof this.drawTethered === 'function') this.drawTethered(ctx);
    }

    _drawDefaultItem(ctx) {
        const halfLen = this.itemLength / 2;
        const halfWidth = this.itemWidth / 2;

        ctx.fillStyle = this.itemColor;
        ctx.strokeStyle = this._darkenColor(this.itemColor, 0.7);
        ctx.lineWidth = 1;

        const bladeStart = this.showHandle ? -halfLen + this.handleLength : -halfLen;
        const bladeEnd = halfLen;
        const r = Math.min(halfWidth * 0.5, 3);

        ctx.beginPath();
        ctx.moveTo(bladeStart + r, -halfWidth);
        ctx.lineTo(bladeEnd - r, -halfWidth);
        ctx.quadraticCurveTo(bladeEnd, -halfWidth, bladeEnd, -halfWidth + r);
        ctx.lineTo(bladeEnd, halfWidth - r);
        ctx.quadraticCurveTo(bladeEnd, halfWidth, bladeEnd - r, halfWidth);
        ctx.lineTo(bladeStart + r, halfWidth);
        ctx.quadraticCurveTo(bladeStart, halfWidth, bladeStart, halfWidth - r);
        ctx.lineTo(bladeStart, -halfWidth + r);
        ctx.quadraticCurveTo(bladeStart, -halfWidth, bladeStart + r, -halfWidth);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (this.showHandle && this.handleLength > 0) {
            ctx.fillStyle = this.handleColor;
            ctx.strokeStyle = this._darkenColor(this.handleColor, 0.7);
            const handleStart = -halfLen;
            const handleHalfWidth = halfWidth * 0.7;
            ctx.beginPath();
            ctx.rect(handleStart, -handleHalfWidth, this.handleLength, handleHalfWidth * 2);
            ctx.fill();
            ctx.stroke();

            const handleEnd = -halfLen + this.handleLength;
            ctx.fillStyle = this._darkenColor(this.itemColor, 0.85);
            ctx.beginPath();
            ctx.rect(handleEnd - 1, -halfWidth - 1, 2, (halfWidth + 1) * 2);
            ctx.fill();
        }
    }

    // ==================== SEEDED RNG ====================

    _seededRng(seed) {
        let s = seed;
        return function() {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    // ==================== RANDOM VARIATION SYSTEM ====================

    /**
     * Apply random variation to a value based on variation settings
     */
    _applyVariation(baseValue, rng, variationType = 'size') {
        if (!this.enableRandomVariation) return baseValue;
        const amt = this.variationAmount;
        let range = 0;
        switch (variationType) {
            case 'size': range = this.variationSizeScale * amt; break;
            case 'detail': range = this.variationDetailShift * amt; break;
            case 'color': range = this.variationColorShift * amt; break;
            default: range = amt * 0.2;
        }
        const variation = (rng() * 2 - 1) * range;
        return baseValue * (1 + variation);
    }

    /**
     * Apply color variation
     */
    _applyColorVariation(color, rng) {
        if (!this.enableRandomVariation || this.variationColorShift <= 0) return color;
        const shift = this.variationColorShift * this.variationAmount;
        const hex = color.replace('#', '');
        if (hex.length !== 6) return color;
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        r = Math.max(0, Math.min(255, r + Math.floor((rng() * 2 - 1) * shift * 60)));
        g = Math.max(0, Math.min(255, g + Math.floor((rng() * 2 - 1) * shift * 60)));
        b = Math.max(0, Math.min(255, b + Math.floor((rng() * 2 - 1) * shift * 60)));
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // ==================== PROCEDURAL GENERATION ====================

    _generateItemData() {
        const rng = this._seededRng(this.generationSeed);
        // Additional RNG for variation (uses timestamp if variation enabled, seed otherwise)
        const varRng = this.enableRandomVariation 
            ? this._seededRng(Date.now() % 1000000 + Math.floor(Math.random() * 10000))
            : rng;
        const sub = this.generationSubType;
        const style = this.generationStyle;
        const data = { parts: [], style: style, subType: sub };

        // Gun items use their own generator
        if (this.itemType === 'gun') {
            // Apply style colors to guns too (unless standard)
            const gunStyleColors = this._getStyleColors(style, rng, varRng);
            this._generateGunSideView(data, rng, varRng, style, gunStyleColors);
            this._generatedPath = data;
            // Also generate top-down (held) view
            const rng2 = this._seededRng(this.generationSeed);
            const dataHeld = { parts: [], style: style, subType: this.gunSubType };
            this._generateGunTopDown(dataHeld, rng2, style, gunStyleColors);
            this._generatedPathHeld = dataHeld;
            this._lastSeed = this.generationSeed;
            return;
        }

        const styleColors = this._getStyleColors(style, rng, varRng);

        if (['sword','axe','mace','spear','dagger','katana','scimitar','hammer','flail'].includes(sub)) {
            this._generateWeapon(data, sub, rng, styleColors, varRng);
        } else if (['pickaxe','shovel','wrench','sickle','hoe','fishing_rod'].includes(sub)) {
            this._generateTool(data, sub, rng, styleColors, varRng);
        } else if (['round','kite','tower','buckler'].includes(sub)) {
            this._generateShield(data, sub, rng, styleColors, varRng);
        } else {
            this._generateMisc(data, sub, rng, styleColors, varRng);
        }

        this._generatedPath = data;
        this._lastSeed = this.generationSeed;
    }

    _getStyleColors(style, rng, varRng) {
        const base = {
            metal: this._applyColorVariation(this.itemColor, varRng || rng),
            handle: this._applyColorVariation(this.handleColor, varRng || rng),
            accent: this._applyColorVariation(this.genAccentColor, varRng || rng),
            gem: this.genGemColor,
            dark: '#1a1a2e',
            glow: '#88ccff'
        };
        switch (style) {
            case 'ornate':
                base.accent = this._lightenColor(this.genAccentColor, 1.3);
                break;
            case 'rusted':
                base.metal = this._blendColors(this.itemColor, '#8b4513', 0.4);
                base.accent = '#6b3a0a';
                break;
            case 'ancient':
                base.metal = this._blendColors(this.itemColor, '#556b2f', 0.3);
                base.accent = '#8b7d3c';
                break;
            case 'crystal':
                base.metal = this._blendColors(this.itemColor, '#aaddff', 0.4);
                base.glow = this.genGemColor;
                break;
            case 'dark':
                base.metal = this._blendColors(this.itemColor, '#1a1a2e', 0.5);
                base.accent = '#5a1a5e';
                base.glow = '#aa44ff';
                break;
            case 'nature':
                base.metal = this._blendColors(this.itemColor, '#2d5a1e', 0.3);
                base.handle = '#3a2a15';
                base.accent = '#4a8a2a';
                break;
            case 'bone':
                base.metal = '#d4c8a8';
                base.handle = '#8a7a5a';
                base.accent = '#c0b090';
                break;
        }
        return base;
    }

    // ==================== WEAPON GENERATION ====================

    _generateWeapon(data, sub, rng, colors, varRng) {
        const vr = varRng || rng;
        const L = this._applyVariation(this.itemLength, vr, 'size');
        const W = this._applyVariation(this.itemWidth, vr, 'size');
        const hL = this.handleLength;
        const halfL = L / 2;
        const halfW = W / 2;
        const detail = this._applyVariation(this.genBladeDetail, vr, 'detail');
        const curve = this.genCurvature;
        const serr = this.genSerration;
        const pommel = this._applyVariation(this.genPommelSize, vr, 'size');
        const guard = this._applyVariation(this.genGuardWidth, vr, 'size');

        switch (sub) {
            case 'dagger':
                this._genDagger(data, rng, colors, L, W, hL, halfL, halfW, detail, curve, serr, pommel, guard, vr);
                break;
            case 'katana':
                this._genKatana(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, guard);
                break;
            case 'scimitar':
                this._genScimitar(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, guard);
                break;
            case 'axe':
                this._genAxe(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr);
                break;
            case 'mace':
                this._genMace(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr);
                break;
            case 'spear':
                this._genSpear(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr);
                break;
            case 'hammer':
                this._genHammer(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr);
                break;
            case 'flail':
                this._genFlail(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel);
                break;
            case 'sword':
            default:
                this._genSword(data, rng, colors, L, W, hL, halfL, halfW, detail, curve, serr, pommel, guard);
                break;
        }
    }

    _genSword(data, rng, colors, L, W, hL, halfL, halfW, detail, curve, serr, pommel, guard) {
        // Pommel
        if (pommel > 0.1) {
            const pR = halfW * (0.6 + pommel * 0.8);
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: pR, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
            if (this.genShowGem && pommel > 0.4) {
                data.parts.push({ type: 'circle', x: -halfL, y: 0, r: pR * 0.5, fill: colors.gem, stroke: this._darkenColor(colors.gem, 0.6), lineWidth: 0.5, glow: colors.gem });
            }
        }

        // Handle
        const hStart = -halfL;
        const hEnd = -halfL + hL;
        const hW = halfW * 0.65;
        data.parts.push({ type: 'rect', x: hStart, y: -hW, w: hL, h: hW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        if (detail > 0.3) {
            const wraps = Math.floor(3 + detail * 5);
            for (let i = 0; i < wraps; i++) {
                const wx = hStart + (hL / (wraps + 1)) * (i + 1);
                data.parts.push({ type: 'line', x1: wx, y1: -hW, x2: wx, y2: hW, stroke: this._darkenColor(colors.handle, 0.5), lineWidth: 0.8 });
            }
        }

        // Guard
        if (guard > 0.1) {
            const gW = halfW * (1.0 + guard * 1.5);
            const gThick = Math.max(2, 1 + guard * 4);
            data.parts.push({ type: 'rect', x: hEnd - gThick / 2, y: -gW, w: gThick, h: gW * 2, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1, rounded: 1 });
            if (detail > 0.5) {
                data.parts.push({ type: 'circle', x: hEnd, y: -gW, r: gThick * 0.4, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.5 });
                data.parts.push({ type: 'circle', x: hEnd, y: gW, r: gThick * 0.4, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.5 });
            }
        }

        // Blade
        const bladeLen = halfL - (hL - halfL);
        const tipTaper = 0.15 + rng() * 0.2;
        const bladePoints = this._buildBladePath(hEnd, halfL, halfW, curve, serr, tipTaper, rng, 'pointed');
        data.parts.push({ type: 'polygon', points: bladePoints, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.55), lineWidth: 1.2 });

        // Fuller
        if (detail > 0.2) {
            const fullerStart = hEnd + 3;
            const fullerEnd = halfL - bladeLen * (0.3 + tipTaper);
            data.parts.push({ type: 'line', x1: fullerStart, y1: 0, x2: fullerEnd, y2: curve * halfW * 0.3, stroke: this._darkenColor(colors.metal, 0.75), lineWidth: Math.max(1, halfW * 0.3) });
        }

        // Edge highlight
        data.parts.push({ type: 'polyline', points: bladePoints.slice(0, Math.ceil(bladePoints.length / 2) + 1), stroke: this._lightenColor(colors.metal, 1.4), lineWidth: 0.5 });

        // Pattern
        this._addPattern(data, hEnd + 5, -halfW * 0.4, halfL - bladeLen * 0.4, halfW * 0.4, rng, colors);

        // Gem on guard
        if (this.genShowGem && guard > 0.3) {
            data.parts.push({ type: 'circle', x: hEnd, y: 0, r: Math.max(2, guard * 3), fill: colors.gem, stroke: this._darkenColor(colors.gem, 0.5), lineWidth: 0.5, glow: colors.gem });
        }
    }

    _genDagger(data, rng, colors, L, W, hL, halfL, halfW, detail, curve, serr, pommel, guard, vr) {
        const bladeStyle = this.daggerBladeStyle || 'straight';
        const hasCrossguard = this.daggerCrossguard !== false;
        const fullerW = this.daggerFullerWidth || 0.3;

        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: halfW * (0.5 + pommel * 0.5), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
        const hStart = -halfL;
        data.parts.push({ type: 'rect', x: hStart, y: -halfW * 0.5, w: hL, h: halfW, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        const hEnd = -halfL + hL;
        if (hasCrossguard && guard > 0.1) {
            const gW = halfW * (0.8 + guard);
            data.parts.push({ type: 'rect', x: hEnd - 1.5, y: -gW, w: 3, h: gW * 2, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
        }

        // Build blade based on style
        let bladeCurve = curve;
        let tipTaper = 0.35;
        if (bladeStyle === 'curved') bladeCurve = 0.3;
        else if (bladeStyle === 'wavy') bladeCurve = 0;
        else if (bladeStyle === 'tanto') { bladeCurve = 0; tipTaper = 0.15; }

        const bladePoints = this._buildBladePath(hEnd, halfL, halfW, bladeCurve, serr, tipTaper, rng, bladeStyle === 'tanto' ? 'tanto' : 'pointed');
        
        // Wavy blade modification
        if (bladeStyle === 'wavy') {
            for (let i = 0; i < bladePoints.length; i++) {
                const t = (bladePoints[i].x - hEnd) / (halfL - hEnd);
                bladePoints[i].y += Math.sin(t * Math.PI * 3) * halfW * 0.2;
            }
        }

        data.parts.push({ type: 'polygon', points: bladePoints, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.55), lineWidth: 1 });
        
        // Fuller
        if (fullerW > 0) {
            data.parts.push({ type: 'line', x1: hEnd + 2, y1: 0, x2: halfL - L * 0.15, y2: 0, stroke: this._darkenColor(colors.metal, 0.75), lineWidth: halfW * fullerW });
        }
    }

    _genKatana(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, guard) {
        const hStart = -halfL;
        const hEnd = -halfL + hL;
        const hW = halfW * 0.5;
        data.parts.push({ type: 'rect', x: hStart, y: -hW, w: hL, h: hW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.5), lineWidth: 1 });
        if (detail > 0.2) {
            for (let i = 0; i < 6; i++) {
                const wx = hStart + (hL / 7) * (i + 1);
                data.parts.push({ type: 'line', x1: wx - 1, y1: -hW, x2: wx + 1, y2: hW, stroke: this._lightenColor(colors.handle, 1.2), lineWidth: 0.6 });
                data.parts.push({ type: 'line', x1: wx + 1, y1: -hW, x2: wx - 1, y2: hW, stroke: this._lightenColor(colors.handle, 1.2), lineWidth: 0.6 });
            }
        }
        if (guard > 0.1) {
            const gR = halfW * (0.8 + guard * 0.8);
            data.parts.push({ type: 'circle', x: hEnd, y: 0, r: gR, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
        }
        if (pommel > 0.1) {
            data.parts.push({ type: 'ellipse', x: -halfL, y: 0, rx: 2 + pommel * 2, ry: hW + pommel * 1, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
        const bladePoints = this._buildBladePath(hEnd, halfL, halfW, 0.3 + this.genCurvature * 0.4, 0, 0.12, rng, 'katana');
        data.parts.push({ type: 'polygon', points: bladePoints, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.55), lineWidth: 1.2 });
        if (detail > 0.3) {
            const bladeLen = halfL - hEnd;
            const hamonPts = [];
            for (let i = 0; i <= 12; i++) {
                const t = i / 12;
                const x = hEnd + t * bladeLen;
                const yBase = halfW * 0.3 * (1 - t * 0.5);
                const wave = Math.sin(t * Math.PI * 4 + rng() * 2) * halfW * 0.12;
                hamonPts.push({ x, y: yBase + wave });
            }
            data.parts.push({ type: 'polyline', points: hamonPts, stroke: this._lightenColor(colors.metal, 1.5), lineWidth: 0.8 });
        }
    }

    _genScimitar(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, guard) {
        const hStart = -halfL;
        const hEnd = -halfL + hL;
        const hW = halfW * 0.55;
        data.parts.push({ type: 'rect', x: hStart, y: -hW, w: hL, h: hW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        if (guard > 0.1) {
            const gW = halfW * (1 + guard);
            data.parts.push({ type: 'rect', x: hEnd - 1.5, y: -gW, w: 3, h: gW * 2, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
        }
        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: hW * (0.5 + pommel * 0.8), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
        const bladePoints = this._buildBladePath(hEnd, halfL, halfW, 0.5 + this.genCurvature * 0.3, 0, 0.08, rng, 'scimitar');
        data.parts.push({ type: 'polygon', points: bladePoints, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.55), lineWidth: 1.2 });
        data.parts.push({ type: 'polyline', points: bladePoints.slice(0, Math.ceil(bladePoints.length / 2) + 1), stroke: this._lightenColor(colors.metal, 1.3), lineWidth: 0.5 });
    }

    _genAxe(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr) {
        const headSize = this.axeHeadSize || 0.5;
        const headStyle = this.axeHeadStyle || 'single';
        const headCurve = this.axeHeadCurve || 0.5;
        const hasSpike = this.axeSpike || false;

        const shaftW = halfW * 0.3;
        data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: L, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        if (detail > 0.3) {
            for (let i = 0; i < 5; i++) {
                const gx = -halfL + (L / 6) * (i + 1);
                data.parts.push({ type: 'line', x1: gx, y1: -shaftW, x2: gx, y2: shaftW, stroke: this._darkenColor(colors.handle, 0.8), lineWidth: 0.5 });
            }
        }

        const headStart = halfL - W * 2.5 * headSize;
        const headH = halfW * 2.2 * headSize;
        const curveAmt = headCurve;

        // Generate axe head based on style
        const pts = [];
        if (headStyle === 'double') {
            // Double-headed axe
            pts.push({ x: headStart, y: -shaftW * 0.5 });
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI) * headH * curveAmt;
                pts.push({ x, y: -(shaftW + bulge * (0.5 + t * 0.5)) });
            }
            pts.push({ x: halfL + 2, y: 0 });
            for (let i = 8; i >= 0; i--) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI) * headH * curveAmt;
                pts.push({ x, y: shaftW + bulge * (0.5 + t * 0.5) });
            }
            pts.push({ x: headStart, y: shaftW * 0.5 });
        } else if (headStyle === 'bearded') {
            // Bearded axe - blade curves down
            pts.push({ x: headStart, y: -shaftW * 0.5 });
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI * 0.8) * headH * curveAmt * 0.4;
                pts.push({ x, y: -(shaftW + bulge) });
            }
            pts.push({ x: halfL + 2, y: shaftW * 0.5 });
            // Bottom beard curve
            for (let i = 8; i >= 0; i--) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI) * headH * curveAmt * 1.2;
                pts.push({ x, y: shaftW + bulge * (0.3 + t * 0.7) });
            }
            pts.push({ x: headStart, y: shaftW * 0.5 });
        } else if (headStyle === 'crescent') {
            // Crescent moon shaped
            const cx = halfL - headH * 0.5;
            for (let i = 0; i <= 12; i++) {
                const angle = -Math.PI * 0.4 + (i / 12) * Math.PI * 0.8;
                const r = headH * (0.8 + curveAmt * 0.4);
                pts.push({ x: cx + Math.cos(angle) * r, y: Math.sin(angle) * r });
            }
            for (let i = 12; i >= 0; i--) {
                const angle = -Math.PI * 0.4 + (i / 12) * Math.PI * 0.8;
                const r = headH * 0.4;
                pts.push({ x: cx + Math.cos(angle) * r, y: Math.sin(angle) * r });
            }
        } else {
            // Single (default)
            pts.push({ x: headStart, y: -shaftW * 0.5 });
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI) * headH * curveAmt;
                pts.push({ x, y: -(shaftW + bulge * (0.5 + t * 0.5)) });
            }
            pts.push({ x: halfL + 2, y: 0 });
            for (let i = 8; i >= 0; i--) {
                const t = i / 8;
                const x = headStart + t * (halfL - headStart);
                const bulge = Math.sin(t * Math.PI) * headH * 0.4 * curveAmt;
                pts.push({ x, y: shaftW + bulge * (0.3 + t * 0.5) });
            }
            pts.push({ x: headStart, y: shaftW * 0.5 });
        }

        data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
        data.parts.push({ type: 'polyline', points: pts.slice(1, 10), stroke: this._lightenColor(colors.metal, 1.4), lineWidth: 0.7 });
        data.parts.push({ type: 'rect', x: headStart - 1, y: -shaftW * 1.5, w: 4, h: shaftW * 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });
        
        // Back spike
        if (hasSpike && headStyle !== 'double') {
            const spikeLen = headH * 0.6;
            data.parts.push({ type: 'polygon', points: [
                { x: headStart + 2, y: shaftW * 0.3 },
                { x: headStart - spikeLen * 0.3, y: headH * 0.5 },
                { x: headStart + 4, y: shaftW * 0.3 }
            ], fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
        }

        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: shaftW * (1 + pommel), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
    }

    _genMace(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr) {
        const headSize = this.maceHeadSize || 0.5;
        const headStyle = this.maceHeadStyle || 'flanged';
        const flangeCount = this.maceFlangeCount || 6;
        const flangeLen = this.maceFlangeLength || 0.5;

        const shaftW = halfW * 0.3;
        data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: L * 0.7, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        
        const headR = halfW * 1.5 * headSize;
        const headX = halfL - headR;

        if (headStyle === 'ball') {
            // Simple ball mace
            data.parts.push({ type: 'circle', x: headX, y: 0, r: headR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
            // Highlight
            data.parts.push({ type: 'circle', x: headX - headR * 0.3, y: -headR * 0.3, r: headR * 0.2, fill: this._lightenColor(colors.metal, 1.4), stroke: 'none', lineWidth: 0 });
        } else if (headStyle === 'crown') {
            // Crown shaped mace head
            data.parts.push({ type: 'circle', x: headX, y: 0, r: headR * 0.8, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
            for (let i = 0; i < flangeCount; i++) {
                const angle = (i / flangeCount) * Math.PI * 2;
                const pts = [
                    { x: headX + Math.cos(angle) * headR * 0.6, y: Math.sin(angle) * headR * 0.6 },
                    { x: headX + Math.cos(angle - 0.15) * headR * (1 + flangeLen * 0.5), y: Math.sin(angle - 0.15) * headR * (1 + flangeLen * 0.5) },
                    { x: headX + Math.cos(angle) * headR * (1.2 + flangeLen * 0.8), y: Math.sin(angle) * headR * (1.2 + flangeLen * 0.8) },
                    { x: headX + Math.cos(angle + 0.15) * headR * (1 + flangeLen * 0.5), y: Math.sin(angle + 0.15) * headR * (1 + flangeLen * 0.5) }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
            }
        } else if (headStyle === 'spiked') {
            // Morning star / spiked ball
            data.parts.push({ type: 'circle', x: headX, y: 0, r: headR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
            for (let i = 0; i < flangeCount; i++) {
                const angle = (i / flangeCount) * Math.PI * 2 + rng() * 0.2;
                const spikeL = headR * (0.5 + flangeLen * 0.8 + rng() * 0.2);
                data.parts.push({ type: 'polygon', points: [
                    { x: headX + Math.cos(angle - 0.1) * headR * 0.9, y: Math.sin(angle - 0.1) * headR * 0.9 },
                    { x: headX + Math.cos(angle) * (headR + spikeL), y: Math.sin(angle) * (headR + spikeL) },
                    { x: headX + Math.cos(angle + 0.1) * headR * 0.9, y: Math.sin(angle + 0.1) * headR * 0.9 }
                ], fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 0.8 });
            }
        } else {
            // Flanged (default)
            data.parts.push({ type: 'circle', x: headX, y: 0, r: headR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
            for (let i = 0; i < flangeCount; i++) {
                const angle = (i / flangeCount) * Math.PI * 2;
                const spikeLen2 = headR * (0.4 + flangeLen * 0.6 + rng() * 0.2);
                const sx = headX + Math.cos(angle) * headR;
                const sy = Math.sin(angle) * headR;
                const ex = headX + Math.cos(angle) * (headR + spikeLen2);
                const ey = Math.sin(angle) * (headR + spikeLen2);
                data.parts.push({ type: 'line', x1: sx, y1: sy, x2: ex, y2: ey, stroke: colors.metal, lineWidth: 2 + detail });
            }
        }

        if (detail > 0.3) {
            data.parts.push({ type: 'circle', x: headX, y: 0, r: headR * 0.5, fill: 'none', stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
        }
        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: shaftW * (1 + pommel), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
    }

    _genSpear(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr) {
        const tipSize = this.spearTipSize || 0.5;
        const tipStyle = this.spearTipStyle || 'diamond';
        const shaftTaper = this.spearShaftTaper || 0;
        const bindingCount = this.spearBindingCount || 1;

        const shaftW = halfW * 0.25;
        const taperEndW = shaftW * (1 - shaftTaper * 0.5);

        // Shaft with optional taper
        if (shaftTaper > 0) {
            data.parts.push({ type: 'polygon', points: [
                { x: -halfL, y: -shaftW },
                { x: halfL - L * 0.25, y: -taperEndW },
                { x: halfL - L * 0.25, y: taperEndW },
                { x: -halfL, y: shaftW }
            ], fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        } else {
            data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: L * 0.75, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        }

        const tipStart = halfL - L * 0.25 * tipSize;
        const tipEnd = halfL;
        const tipW = halfW * 1.2 * tipSize;
        let spearPts = [];

        // Generate tip based on style
        switch (tipStyle) {
            case 'leaf':
                // Leaf-shaped tip
                spearPts = [];
                for (let i = 0; i <= 10; i++) {
                    const t = i / 10;
                    const x = tipStart + t * (tipEnd - tipStart);
                    const w = Math.sin(t * Math.PI) * tipW * (1 - t * 0.3);
                    spearPts.push({ x, y: -w });
                }
                spearPts.push({ x: tipEnd, y: 0 });
                for (let i = 10; i >= 0; i--) {
                    const t = i / 10;
                    const x = tipStart + t * (tipEnd - tipStart);
                    const w = Math.sin(t * Math.PI) * tipW * (1 - t * 0.3);
                    spearPts.push({ x, y: w });
                }
                break;
            case 'barbed':
                // Barbed tip with backward hooks
                spearPts = [
                    { x: tipStart, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.2, y: -tipW * 0.8 },
                    { x: tipStart + (tipEnd - tipStart) * 0.15, y: -tipW * 0.4 },
                    { x: tipStart + (tipEnd - tipStart) * 0.35, y: -tipW },
                    { x: tipEnd, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.35, y: tipW },
                    { x: tipStart + (tipEnd - tipStart) * 0.15, y: tipW * 0.4 },
                    { x: tipStart + (tipEnd - tipStart) * 0.2, y: tipW * 0.8 }
                ];
                break;
            case 'broad':
                // Wide broadhead
                spearPts = [
                    { x: tipStart, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.25, y: -tipW * 1.3 },
                    { x: tipStart + (tipEnd - tipStart) * 0.5, y: -tipW * 1.2 },
                    { x: tipEnd, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.5, y: tipW * 1.2 },
                    { x: tipStart + (tipEnd - tipStart) * 0.25, y: tipW * 1.3 }
                ];
                break;
            case 'narrow':
                // Narrow stiletto-like tip
                spearPts = [
                    { x: tipStart, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.4, y: -tipW * 0.4 },
                    { x: tipEnd, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.4, y: tipW * 0.4 }
                ];
                break;
            default: // diamond
                spearPts = [
                    { x: tipStart, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.35, y: -tipW },
                    { x: tipEnd, y: 0 },
                    { x: tipStart + (tipEnd - tipStart) * 0.35, y: tipW }
                ];
        }

        data.parts.push({ type: 'polygon', points: spearPts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.2 });
        
        // Central ridge on tip
        if (detail > 0.2) {
            data.parts.push({ type: 'line', x1: tipStart, y1: 0, x2: tipEnd, y2: 0, stroke: this._lightenColor(colors.metal, 1.4), lineWidth: 0.8 });
        }

        // Collar/binding at tip base
        data.parts.push({ type: 'rect', x: tipStart - 2, y: -shaftW * 1.5, w: 4, h: shaftW * 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });

        // Additional bindings along shaft
        for (let i = 0; i < bindingCount; i++) {
            const bx = -halfL + L * (0.2 + i * 0.2);
            data.parts.push({ type: 'rect', x: bx, y: -shaftW - 0.5, w: 3, h: shaftW * 2 + 1, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 0.5 });
        }

        // Pommel/butt cap
        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: shaftW * (0.8 + pommel), fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
        }
    }

    _genHammer(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel, vr) {
        const headLength = this.hammerHeadLength || 0.5;
        const headStyle = this.hammerHeadStyle || 'flat';
        const hasSpike = this.hammerSpike || false;

        const shaftW = halfW * 0.3;
        data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: L * 0.7, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        
        const headW = halfW * 2 * headLength;
        const headH = W * 1.5 * headLength;
        const headX = halfL - headW;

        if (headStyle === 'rounded') {
            // Rounded head (like a ball-peen)
            data.parts.push({ type: 'ellipse', x: headX + headW * 0.5, y: 0, rx: headW * 0.6, ry: headH * 0.4, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
        } else if (headStyle === 'war') {
            // War hammer - rectangular with beak
            data.parts.push({ type: 'rect', x: headX, y: -headH / 2, w: headW * 0.7, h: headH, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5, rounded: 1 });
            // Beak/spike on front
            data.parts.push({ type: 'polygon', points: [
                { x: headX + headW * 0.65, y: -headH * 0.2 },
                { x: halfL + headW * 0.3, y: 0 },
                { x: headX + headW * 0.65, y: headH * 0.2 }
            ], fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
        } else if (headStyle === 'sledge') {
            // Large sledgehammer head
            data.parts.push({ type: 'rect', x: headX - headW * 0.2, y: -headH / 2, w: headW * 1.4, h: headH, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5, rounded: 2 });
        } else {
            // Flat (default)
            data.parts.push({ type: 'rect', x: headX, y: -headH / 2, w: headW, h: headH, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5, rounded: 2 });
            if (detail > 0.3) {
                data.parts.push({ type: 'rect', x: halfL - 3, y: -headH / 2 + 2, w: 3, h: headH - 4, fill: this._darkenColor(colors.metal, 0.8), stroke: 'none', lineWidth: 0 });
            }
        }

        // Back spike (for war hammer or if enabled)
        if (hasSpike && headStyle !== 'sledge') {
            const spikeLen = headH * 0.7;
            data.parts.push({ type: 'polygon', points: [
                { x: headX + 2, y: -headH * 0.15 },
                { x: headX - spikeLen, y: 0 },
                { x: headX + 2, y: headH * 0.15 }
            ], fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
        }

        data.parts.push({ type: 'rect', x: headX - 1, y: -shaftW * 1.5, w: 3, h: shaftW * 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });
        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: shaftW * (1 + pommel), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
    }

    _genFlail(data, rng, colors, L, W, hL, halfL, halfW, detail, pommel) {
        const shaftW = halfW * 0.3;
        const shaftLen = L * 0.5;
        data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: shaftLen, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        const chainStart = -halfL + shaftLen;
        const chainEnd = halfL - W;
        const linkCount = 4 + Math.floor(detail * 3);
        for (let i = 0; i <= linkCount; i++) {
            const t = i / linkCount;
            const cx = chainStart + t * (chainEnd - chainStart);
            const cy = Math.sin(t * Math.PI * 2 + rng()) * 1.5;
            data.parts.push({ type: 'circle', x: cx, y: cy, r: 1.5, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.5 });
        }
        const ballR = halfW * 1.8;
        const ballX = halfL - ballR * 0.5;
        data.parts.push({ type: 'circle', x: ballX, y: 0, r: ballR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
        const spikeCount = 8 + Math.floor(detail * 4);
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + rng() * 0.3;
            const spikeLen = ballR * (0.5 + rng() * 0.3);
            data.parts.push({ type: 'line', x1: ballX + Math.cos(angle) * ballR * 0.8, y1: Math.sin(angle) * ballR * 0.8, x2: ballX + Math.cos(angle) * (ballR + spikeLen), y2: Math.sin(angle) * (ballR + spikeLen), stroke: colors.metal, lineWidth: 1.5 });
        }
        if (pommel > 0.1) {
            data.parts.push({ type: 'circle', x: -halfL, y: 0, r: shaftW * (1 + pommel), fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 1 });
        }
    }

    // ==================== TOOL GENERATION ====================

    _generateTool(data, sub, rng, colors, varRng) {
        const L = this.itemLength;
        const W = this.itemWidth;
        const halfL = L / 2;
        const halfW = W / 2;
        const shaftW = halfW * 0.25;
        const detail = this.genBladeDetail;

        data.parts.push({ type: 'rect', x: -halfL, y: -shaftW, w: L * 0.75, h: shaftW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
        if (detail > 0.3) {
            for (let i = 0; i < 4; i++) {
                const gx = -halfL + L * 0.1 + (L * 0.55 / 5) * (i + 1);
                data.parts.push({ type: 'line', x1: gx, y1: -shaftW * 0.8, x2: gx, y2: shaftW * 0.8, stroke: this._darkenColor(colors.handle, 0.85), lineWidth: 0.4 });
            }
        }

        switch (sub) {
            case 'pickaxe': {
                const headLen = L * 0.35;
                const headStart = halfL - headLen;
                const pickPts = [];
                for (let i = 0; i <= 10; i++) {
                    const t = i / 10;
                    const x = headStart + t * headLen;
                    const curveUp = Math.sin(t * Math.PI * 0.8) * halfW * 1.5;
                    pickPts.push({ x, y: -(shaftW + curveUp * (0.3 + t * 0.7)) });
                }
                pickPts.push({ x: halfL + 2, y: -shaftW * 0.5 });
                pickPts.push({ x: headStart, y: -shaftW });
                data.parts.push({ type: 'polygon', points: pickPts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.2 });
                const chiselPts = [
                    { x: headStart, y: shaftW },
                    { x: headStart + headLen * 0.5, y: shaftW + halfW * 0.8 },
                    { x: headStart + headLen * 0.5, y: shaftW },
                ];
                data.parts.push({ type: 'polygon', points: chiselPts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
                break;
            }
            case 'shovel': {
                const headStart = halfL - L * 0.35;
                const headW = halfW * 2;
                const pts = [];
                pts.push({ x: headStart, y: -shaftW });
                pts.push({ x: headStart + 2, y: -headW });
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    const x = headStart + 2 + t * (halfL - headStart - 2);
                    const curveVal = Math.max(0, 1 - Math.pow(t - 0.8, 2) / 0.64);
                    const cvs = Math.sqrt(curveVal) * headW;
                    pts.push({ x, y: -cvs });
                }
                pts.push({ x: halfL, y: 0 });
                for (let i = 8; i >= 0; i--) {
                    const t = i / 8;
                    const x = headStart + 2 + t * (halfL - headStart - 2);
                    const curveVal = Math.max(0, 1 - Math.pow(t - 0.8, 2) / 0.64);
                    const cvs = Math.sqrt(curveVal) * headW * 0.9;
                    pts.push({ x, y: cvs });
                }
                pts.push({ x: headStart + 2, y: headW * 0.9 });
                pts.push({ x: headStart, y: shaftW });
                data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.2 });
                data.parts.push({ type: 'rect', x: headStart - 1, y: -shaftW * 1.5, w: 3, h: shaftW * 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });
                break;
            }
            case 'wrench': {
                const jawStart = halfL - L * 0.25;
                const jawW = halfW * 1.8;
                const pts = [
                    { x: jawStart, y: -shaftW }, { x: jawStart, y: -jawW },
                    { x: halfL - 3, y: -jawW }, { x: halfL, y: -jawW + 3 },
                    { x: halfL, y: -shaftW * 2 },
                    { x: halfL, y: shaftW * 2 },
                    { x: halfL, y: jawW - 3 }, { x: halfL - 3, y: jawW },
                    { x: jawStart, y: jawW }, { x: jawStart, y: shaftW }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.2 });
                break;
            }
            case 'sickle': {
                const curveStart = halfL - L * 0.4;
                const pts = [{ x: curveStart, y: -shaftW }];
                for (let i = 0; i <= 12; i++) {
                    const t = i / 12;
                    const a2 = t * Math.PI * 0.7;
                    const r2 = L * 0.2 + t * L * 0.05;
                    pts.push({ x: curveStart + Math.cos(a2) * r2, y: -Math.sin(a2) * r2 - shaftW });
                }
                for (let i = 12; i >= 0; i--) {
                    const t = i / 12;
                    const a2 = t * Math.PI * 0.7;
                    const r2 = L * 0.15 + t * L * 0.03;
                    pts.push({ x: curveStart + Math.cos(a2) * r2, y: -Math.sin(a2) * r2 - shaftW });
                }
                pts.push({ x: curveStart, y: shaftW });
                data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1 });
                data.parts.push({ type: 'rect', x: curveStart - 1, y: -shaftW * 1.5, w: 3, h: shaftW * 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });
                break;
            }
            case 'hoe': {
                const headStart = halfL - L * 0.2;
                const headW = halfW * 1.8;
                data.parts.push({ type: 'rect', x: headStart, y: -headW, w: 3, h: headW * 2, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.2 });
                data.parts.push({ type: 'rect', x: headStart - 2, y: -shaftW * 1.2, w: 5, h: shaftW * 2.4, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.8 });
                break;
            }
            case 'fishing_rod':
            default: {
                data.parts.push({ type: 'line', x1: -halfL + L * 0.75, y1: 0, x2: halfL, y2: -halfW * 0.5, stroke: colors.handle, lineWidth: shaftW * 0.8 });
                data.parts.push({ type: 'circle', x: -halfL + L * 0.3, y: shaftW + 3, r: 3, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.6), lineWidth: 0.8 });
                data.parts.push({ type: 'line', x1: halfL, y1: -halfW * 0.5, x2: halfL + 5, y2: halfW, stroke: '#aaaacc', lineWidth: 0.5 });
                data.parts.push({ type: 'circle', x: halfL + 5, y: halfW + 2, r: 2, fill: 'none', stroke: colors.metal, lineWidth: 0.8 });
                break;
            }
        }
    }

    // ==================== SHIELD GENERATION ====================

    _generateShield(data, sub, rng, colors, varRng) {
        const L = this.itemLength;
        const W = this.itemWidth;
        const halfL = L / 2;
        const halfW = W / 2;
        const detail = this.genBladeDetail;
        const bossSize = this.shieldBossSize || 0.3;
        const rimWidth = this.shieldRimWidth || 0.1;
        const emblem = this.shieldEmblem || 'none';

        switch (sub) {
            case 'round': {
                const r = Math.min(halfL, halfW) * 1.2;
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 2 });
                // Rim
                if (rimWidth > 0) {
                    data.parts.push({ type: 'circle', x: 0, y: 0, r: r * (1 - rimWidth * 0.3), fill: 'none', stroke: colors.accent, lineWidth: 1.5 + rimWidth * 3 });
                }
                // Boss
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r * bossSize, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1.2 });
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r * bossSize * 0.5, fill: this._lightenColor(colors.accent, 1.3), stroke: 'none', lineWidth: 0 });
                // Emblem
                this._drawShieldEmblem(data, emblem, 0, 0, r * 0.5, colors);
                // Detail spokes
                if (detail > 0.3) {
                    for (let i = 0; i < 4; i++) {
                        const a2 = (i / 4) * Math.PI * 2 + Math.PI / 4;
                        data.parts.push({ type: 'line', x1: Math.cos(a2) * r * bossSize * 1.2, y1: Math.sin(a2) * r * bossSize * 1.2, x2: Math.cos(a2) * r * 0.88, y2: Math.sin(a2) * r * 0.88, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
                    }
                }
                if (detail > 0.5) {
                    for (let i = 0; i < 8; i++) {
                        const a2 = (i / 8) * Math.PI * 2;
                        data.parts.push({ type: 'circle', x: Math.cos(a2) * r * 0.8, y: Math.sin(a2) * r * 0.8, r: 1.5, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.5), lineWidth: 0.5 });
                    }
                }
                if (this.genShowGem) {
                    data.parts.push({ type: 'circle', x: 0, y: 0, r: r * 0.08, fill: colors.gem, stroke: this._darkenColor(colors.gem, 0.5), lineWidth: 0.5, glow: colors.gem });
                }
                break;
            }
            case 'kite': {
                const pts = [
                    { x: 0, y: -halfW * 1.3 }, { x: halfL * 0.7, y: -halfW * 0.8 },
                    { x: halfL * 1.1, y: 0 }, { x: halfL * 0.7, y: halfW * 0.8 },
                    { x: 0, y: halfW * 1.3 }, { x: -halfL * 0.5, y: halfW * 0.6 },
                    { x: -halfL * 0.5, y: -halfW * 0.6 }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 2 });
                // Rim border
                if (rimWidth > 0) {
                    data.parts.push({ type: 'polyline', points: [...pts, pts[0]], stroke: colors.accent, lineWidth: 1 + rimWidth * 4 });
                }
                // Cross design
                data.parts.push({ type: 'line', x1: -halfL * 0.4, y1: 0, x2: halfL * 1, y2: 0, stroke: colors.accent, lineWidth: 2 });
                data.parts.push({ type: 'line', x1: 0, y1: -halfW * 1.2, x2: 0, y2: halfW * 1.2, stroke: colors.accent, lineWidth: 1 });
                // Boss
                data.parts.push({ type: 'circle', x: 0, y: 0, r: halfW * bossSize, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                // Emblem
                this._drawShieldEmblem(data, emblem, halfL * 0.3, 0, halfW * 0.4, colors);
                break;
            }
            case 'tower': {
                const sW = halfL * 0.9;
                const sH = halfW * 1.5;
                data.parts.push({ type: 'rect', x: -sW, y: -sH, w: sW * 2, h: sH * 2, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 2, rounded: 3 });
                // Rim
                if (rimWidth > 0) {
                    const inset = sW * rimWidth * 0.3;
                    data.parts.push({ type: 'rect', x: -sW + inset, y: -sH + inset, w: (sW - inset) * 2, h: (sH - inset) * 2, fill: 'none', stroke: colors.accent, lineWidth: 1 + rimWidth * 3, rounded: 2 });
                }
                // Cross design
                data.parts.push({ type: 'rect', x: -1.5, y: -sH * 0.9, w: 3, h: sH * 1.8, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                data.parts.push({ type: 'rect', x: -sW * 0.8, y: -1.5, w: sW * 1.6, h: 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                // Boss
                data.parts.push({ type: 'circle', x: 0, y: 0, r: sW * bossSize, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                // Emblem
                this._drawShieldEmblem(data, emblem, 0, -sH * 0.5, sW * 0.35, colors);
                if (detail > 0.4) {
                    const corners = [[-sW * 0.85, -sH * 0.85], [sW * 0.85, -sH * 0.85], [-sW * 0.85, sH * 0.85], [sW * 0.85, sH * 0.85]];
                    for (const [rx, ry] of corners) {
                        data.parts.push({ type: 'circle', x: rx, y: ry, r: 1.5, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.5), lineWidth: 0.5 });
                    }
                }
                break;
            }
            case 'buckler':
            default: {
                const r = Math.min(halfL, halfW) * 0.8;
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.5), lineWidth: 1.5 });
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r * (1 - rimWidth * 0.4), fill: 'none', stroke: colors.accent, lineWidth: 1 });
                data.parts.push({ type: 'circle', x: 0, y: 0, r: r * bossSize, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                break;
            }
        }
        data.parts.push({ type: 'rect', x: -4, y: -halfW * 0.3, w: 8, h: halfW * 0.6, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 0.8 });
    }

    /**
     * Draw a shield emblem
     */
    _drawShieldEmblem(data, emblem, cx, cy, size, colors) {
        if (emblem === 'none') return;
        const s = size;
        switch (emblem) {
            case 'cross':
                data.parts.push({ type: 'rect', x: cx - s * 0.15, y: cy - s * 0.6, w: s * 0.3, h: s * 1.2, fill: colors.accent, stroke: 'none', lineWidth: 0 });
                data.parts.push({ type: 'rect', x: cx - s * 0.5, y: cy - s * 0.15, w: s, h: s * 0.3, fill: colors.accent, stroke: 'none', lineWidth: 0 });
                break;
            case 'chevron':
                data.parts.push({ type: 'polyline', points: [
                    { x: cx - s * 0.5, y: cy + s * 0.3 },
                    { x: cx, y: cy - s * 0.3 },
                    { x: cx + s * 0.5, y: cy + s * 0.3 }
                ], stroke: colors.accent, lineWidth: s * 0.15 });
                break;
            case 'circle':
                data.parts.push({ type: 'circle', x: cx, y: cy, r: s * 0.4, fill: 'none', stroke: colors.accent, lineWidth: s * 0.1 });
                break;
            case 'diamond':
                data.parts.push({ type: 'polygon', points: [
                    { x: cx, y: cy - s * 0.5 },
                    { x: cx + s * 0.35, y: cy },
                    { x: cx, y: cy + s * 0.5 },
                    { x: cx - s * 0.35, y: cy }
                ], fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.7), lineWidth: 0.5 });
                break;
        }
    }

    // ==================== MISC ITEM GENERATION ====================

    _generateMisc(data, sub, rng, colors, varRng) {
        const L = this.itemLength;
        const W = this.itemWidth;
        const halfL = L / 2;
        const halfW = W / 2;
        const flameSize = this.torchFlameSize || 1.0;
        const fillLevel = this.potionFillLevel || 1.0;
        const bubbles = this.potionBubbles || 3;
        const teethCount = this.keyTeethCount || 3;
        const facetCount = this.gemFacets || 6;

        switch (sub) {
            case 'torch': {
                const stickW = halfW * 0.3;
                data.parts.push({ type: 'rect', x: -halfL, y: -stickW, w: L * 0.7, h: stickW * 2, fill: colors.handle, stroke: this._darkenColor(colors.handle, 0.6), lineWidth: 1 });
                const wrapX = halfL - L * 0.35;
                data.parts.push({ type: 'rect', x: wrapX, y: -stickW * 1.5, w: L * 0.1, h: stickW * 3, fill: '#8b6b4a', stroke: this._darkenColor('#8b6b4a', 0.7), lineWidth: 0.8 });
                const flameX = halfL - L * 0.15;
                const flameR = halfW * 1.5 * flameSize;
                // Outer flame
                data.parts.push({ type: 'ellipse', x: flameX, y: 0, rx: flameR * 0.8, ry: flameR, fill: '#ff6622', stroke: 'none', lineWidth: 0, glow: '#ff4400' });
                // Middle flame
                data.parts.push({ type: 'ellipse', x: flameX + 1, y: 0, rx: flameR * 0.4, ry: flameR * 0.6, fill: '#ffcc22', stroke: 'none', lineWidth: 0 });
                // Inner flame core
                data.parts.push({ type: 'ellipse', x: flameX + 2, y: 0, rx: flameR * 0.15, ry: flameR * 0.3, fill: '#ffffff', stroke: 'none', lineWidth: 0 });
                // Flame flickers with variation
                if (flameSize > 0.8 && varRng) {
                    for (let i = 0; i < 3; i++) {
                        const flickX = flameX + (varRng() - 0.5) * flameR * 0.4;
                        const flickY = (varRng() - 0.5) * flameR * 0.6;
                        data.parts.push({ type: 'ellipse', x: flickX, y: flickY, rx: flameR * 0.12, ry: flameR * 0.2, fill: '#ff8844', stroke: 'none', lineWidth: 0 });
                    }
                }
                break;
            }
            case 'key': {
                const shaftW2 = halfW * 0.2;
                data.parts.push({ type: 'rect', x: -halfL * 0.3, y: -shaftW2, w: L * 0.65, h: shaftW2 * 2, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                const bowR = halfW * 0.8;
                data.parts.push({ type: 'circle', x: -halfL * 0.4, y: 0, r: bowR, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.5), lineWidth: 1.5 });
                data.parts.push({ type: 'circle', x: -halfL * 0.4, y: 0, r: bowR * 0.5, fill: this._darkenColor(colors.accent, 0.3), stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                // Variable teeth count
                const teethStart = halfL * 0.5;
                const teethSpacing = 4 + (5 - teethCount) * 0.5;
                for (let i = 0; i < teethCount; i++) {
                    const tx = teethStart + i * teethSpacing;
                    const th = shaftW2 + 2 + rng() * 3;
                    data.parts.push({ type: 'rect', x: tx, y: shaftW2, w: 2, h: th, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 0.5 });
                }
                break;
            }
            case 'potion': {
                const bodyR = halfW * 1.2;
                const fillH = bodyR * 2 * fillLevel;
                // Glass bottle outline
                data.parts.push({ type: 'circle', x: halfL * 0.2, y: 0, r: bodyR, fill: 'rgba(200,220,255,0.3)', stroke: this._darkenColor(colors.gem, 0.5), lineWidth: 1.5 });
                // Fill level (clipped visually with lower circle)
                if (fillLevel > 0) {
                    data.parts.push({ type: 'circle', x: halfL * 0.2, y: bodyR * (1 - fillLevel), r: bodyR * fillLevel, fill: colors.gem, stroke: 'none', lineWidth: 0 });
                }
                // Highlight
                data.parts.push({ type: 'circle', x: halfL * 0.2 - bodyR * 0.3, y: -bodyR * 0.3, r: bodyR * 0.2, fill: this._lightenColor(colors.gem, 1.6), stroke: 'none', lineWidth: 0 });
                // Bubbles
                for (let i = 0; i < bubbles; i++) {
                    const bx = halfL * 0.2 + (rng() - 0.5) * bodyR * 0.8;
                    const by = (rng() - 0.5) * bodyR * 0.8 * fillLevel;
                    data.parts.push({ type: 'circle', x: bx, y: by, r: 1.5 + rng() * 1.5, fill: this._lightenColor(colors.gem, 1.4), stroke: 'none', lineWidth: 0 });
                }
                // Neck and cork
                const neckW = halfW * 0.3;
                data.parts.push({ type: 'rect', x: halfL * 0.2 - neckW, y: -bodyR - 3, w: neckW * 2, h: 5, fill: this._lightenColor(colors.gem, 1.1), stroke: this._darkenColor(colors.gem, 0.5), lineWidth: 0.8 });
                data.parts.push({ type: 'rect', x: halfL * 0.2 - neckW * 0.8, y: -bodyR - 6, w: neckW * 1.6, h: 4, fill: '#8b6b4a', stroke: this._darkenColor('#8b6b4a', 0.7), lineWidth: 0.8 });
                break;
            }
            case 'scroll': {
                const scrollH = halfW * 1.5;
                data.parts.push({ type: 'rect', x: -halfL * 0.6, y: -scrollH, w: L * 0.8, h: scrollH * 2, fill: '#e8d8b0', stroke: '#b0a080', lineWidth: 1, rounded: 2 });
                data.parts.push({ type: 'ellipse', x: -halfL * 0.6, y: 0, rx: 3, ry: scrollH, fill: '#d0c090', stroke: '#b0a070', lineWidth: 1 });
                data.parts.push({ type: 'ellipse', x: -halfL * 0.6 + L * 0.8, y: 0, rx: 3, ry: scrollH, fill: '#d0c090', stroke: '#b0a070', lineWidth: 1 });
                for (let i = 0; i < 4; i++) {
                    const ly = -scrollH * 0.6 + i * scrollH * 0.35;
                    const lw = L * 0.5 * (0.6 + rng() * 0.4);
                    data.parts.push({ type: 'line', x1: -halfL * 0.3, y1: ly, x2: -halfL * 0.3 + lw, y2: ly, stroke: '#8a7a5a', lineWidth: 0.8 });
                }
                data.parts.push({ type: 'circle', x: 0, y: scrollH + 2, r: 3, fill: '#cc2222', stroke: '#881111', lineWidth: 0.8 });
                break;
            }
            case 'gem': {
                const gemR = Math.min(halfL, halfW) * 0.9;
                const facets = facetCount;
                const outerPts = [];
                for (let i = 0; i < facets; i++) {
                    const a2 = (i / facets) * Math.PI * 2 - Math.PI / 2;
                    outerPts.push({ x: Math.cos(a2) * gemR, y: Math.sin(a2) * gemR });
                }
                data.parts.push({ type: 'polygon', points: outerPts, fill: colors.gem, stroke: this._darkenColor(colors.gem, 0.5), lineWidth: 1.5 });
                const innerPts = [];
                for (let i = 0; i < facets; i++) {
                    const a2 = (i / facets) * Math.PI * 2 - Math.PI / 2 + Math.PI / facets;
                    innerPts.push({ x: Math.cos(a2) * gemR * 0.5, y: Math.sin(a2) * gemR * 0.5 });
                }
                data.parts.push({ type: 'polygon', points: innerPts, fill: this._lightenColor(colors.gem, 1.3), stroke: this._lightenColor(colors.gem, 1.1), lineWidth: 0.5 });
                for (let i = 0; i < facets; i++) {
                    data.parts.push({ type: 'line', x1: outerPts[i].x, y1: outerPts[i].y, x2: innerPts[i].x, y2: innerPts[i].y, stroke: this._darkenColor(colors.gem, 0.7), lineWidth: 0.5 });
                }
                data.parts.push({ type: 'circle', x: -gemR * 0.25, y: -gemR * 0.25, r: gemR * 0.15, fill: this._lightenColor(colors.gem, 2.0), stroke: 'none', lineWidth: 0 });
                break;
            }
            case 'bone': {
                const boneW = halfW * 0.4;
                data.parts.push({ type: 'rect', x: -halfL * 0.6, y: -boneW, w: L * 0.6, h: boneW * 2, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1, rounded: boneW * 0.5 });
                const knobR = boneW * 1.5;
                data.parts.push({ type: 'circle', x: -halfL * 0.6, y: -boneW * 0.8, r: knobR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
                data.parts.push({ type: 'circle', x: -halfL * 0.6, y: boneW * 0.8, r: knobR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
                data.parts.push({ type: 'circle', x: halfL * 0.6 - L * 0.05, y: -boneW * 0.8, r: knobR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
                data.parts.push({ type: 'circle', x: halfL * 0.6 - L * 0.05, y: boneW * 0.8, r: knobR, fill: colors.metal, stroke: this._darkenColor(colors.metal, 0.7), lineWidth: 1 });
                break;
            }
            case 'feather': {
                const quillW = halfW * 0.08;
                data.parts.push({ type: 'line', x1: -halfL, y1: halfW * 0.3, x2: halfL, y2: -halfW * 0.1, stroke: '#e8e0d0', lineWidth: quillW * 2 + 1 });
                for (let i = 0; i < 12; i++) {
                    const t = i / 12;
                    const x = -halfL * 0.5 + t * L * 0.8;
                    const baseY = halfW * 0.3 - t * halfW * 0.4;
                    const barb = halfW * (0.6 + Math.sin(t * Math.PI) * 0.4);
                    data.parts.push({ type: 'line', x1: x, y1: baseY, x2: x + 3, y2: baseY - barb, stroke: colors.metal, lineWidth: 1 + (1 - t) * 0.5 });
                }
                for (let i = 0; i < 12; i++) {
                    const t = i / 12;
                    const x = -halfL * 0.5 + t * L * 0.8;
                    const baseY = halfW * 0.3 - t * halfW * 0.4;
                    const barb = halfW * (0.3 + Math.sin(t * Math.PI) * 0.2);
                    data.parts.push({ type: 'line', x1: x, y1: baseY, x2: x + 2, y2: baseY + barb, stroke: this._darkenColor(colors.metal, 0.85), lineWidth: 0.8 + (1 - t) * 0.4 });
                }
                break;
            }
            case 'mushroom': {
                const stemW = halfW * 0.35;
                data.parts.push({ type: 'rect', x: -stemW, y: -halfW * 0.2, w: stemW * 2, h: halfW * 1.2, fill: '#e8dcc8', stroke: '#c0b098', lineWidth: 1, rounded: stemW * 0.3 });
                const capW = halfW * 1.3;
                const capH = halfW * 0.9;
                data.parts.push({ type: 'ellipse', x: 0, y: -halfW * 0.3, rx: capW, ry: capH, fill: colors.gem, stroke: this._darkenColor(colors.gem, 0.6), lineWidth: 1.5 });
                for (let i = 0; i < 4; i++) {
                    const sx = (rng() - 0.5) * capW * 1.2;
                    const sy = -halfW * 0.3 + (rng() - 0.5) * capH * 0.8;
                    data.parts.push({ type: 'circle', x: sx, y: sy, r: capW * 0.12 + rng() * capW * 0.08, fill: this._lightenColor(colors.gem, 1.5), stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'lantern':
            default: {
                const frameW = halfW * 0.8;
                const frameH = halfW * 1.2;
                data.parts.push({ type: 'rect', x: -frameW, y: -frameH, w: frameW * 2, h: frameH * 2, fill: 'none', stroke: colors.accent, lineWidth: 1.5, rounded: 2 });
                data.parts.push({ type: 'rect', x: -frameW * 1.1, y: -frameH - 2, w: frameW * 2.2, h: 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                data.parts.push({ type: 'rect', x: -frameW * 1.1, y: frameH - 1, w: frameW * 2.2, h: 3, fill: colors.accent, stroke: this._darkenColor(colors.accent, 0.6), lineWidth: 1 });
                data.parts.push({ type: 'circle', x: 0, y: -frameH - 5, r: 3, fill: 'none', stroke: colors.accent, lineWidth: 1.5 });
                data.parts.push({ type: 'rect', x: -frameW + 1, y: -frameH + 1, w: frameW * 2 - 2, h: frameH * 2 - 2, fill: '#ffdd66', stroke: 'none', lineWidth: 0, glow: '#ffaa22' });
                data.parts.push({ type: 'ellipse', x: 0, y: 0, rx: frameW * 0.3, ry: frameH * 0.4, fill: '#ffcc22', stroke: 'none', lineWidth: 0 });
                break;
            }
        }
    }

    // ==================== BLADE PATH BUILDER ====================

    _buildBladePath(startX, endX, halfW, curve, serration, tipTaper, rng, style) {
        const pts = [];
        const bladeLen = endX - startX;
        const steps = 12;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = startX + t * bladeLen;
            let w = halfW;
            if (t > 1 - tipTaper) {
                const taperT = (t - (1 - tipTaper)) / tipTaper;
                w *= 1 - taperT;
            }
            if (style === 'scimitar') w *= 0.7 + 0.5 * Math.pow(t, 0.6);
            const curveOffset = Math.sin(t * Math.PI) * curve * halfW;
            let serrOffset = 0;
            if (serration > 0 && t > 0.05 && t < 1 - tipTaper) {
                serrOffset = Math.sin(t * bladeLen * 0.8) * serration * halfW * 0.3;
            }
            pts.push({ x, y: -(w + curveOffset + serrOffset) });
        }

        for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const x = startX + t * bladeLen;
            let w = halfW;
            if (t > 1 - tipTaper) {
                const taperT = (t - (1 - tipTaper)) / tipTaper;
                w *= 1 - taperT;
            }
            if (style === 'scimitar') w *= 0.6 + 0.3 * t;
            if (style === 'katana') w *= 0.7;
            const curveOffset = Math.sin(t * Math.PI) * curve * halfW * 0.3;
            let serrOffset = 0;
            if (serration > 0 && t > 0.05 && t < 1 - tipTaper && style !== 'katana') {
                serrOffset = Math.sin(t * bladeLen * 0.8 + 1.5) * serration * halfW * 0.3;
            }
            pts.push({ x, y: w + curveOffset + serrOffset });
        }

        return pts;
    }

    // ==================== PATTERN ====================

    _addPattern(data, x1, y1, x2, y2, rng, colors) {
        const patW = x2 - x1;
        const patH = y2 - y1;
        switch (this.genPatternType) {
            case 'lines':
                for (let i = 0; i < 4; i++) {
                    const lx = x1 + patW * (0.2 + i * 0.2);
                    data.parts.push({ type: 'line', x1: lx, y1: y1, x2: lx, y2: y2, stroke: this._darkenColor(colors.metal, 0.8), lineWidth: 0.5 });
                }
                break;
            case 'dots':
                for (let i = 0; i < 6; i++) {
                    const dx2 = x1 + rng() * patW;
                    const dy2 = y1 + rng() * patH;
                    data.parts.push({ type: 'circle', x: dx2, y: dy2, r: 0.8, fill: colors.accent, stroke: 'none', lineWidth: 0 });
                }
                break;
            case 'runes': {
                for (let i = 0; i < 3; i++) {
                    const rx = x1 + patW * (0.15 + i * 0.3);
                    const rh = Math.abs(patH) * 0.6;
                    const ry = (y1 + y2) / 2;
                    const r1 = rng(), r2 = rng();
                    data.parts.push({ type: 'line', x1: rx, y1: ry - rh / 2, x2: rx + 2, y2: ry + rh / 2, stroke: colors.accent, lineWidth: 0.6 });
                    data.parts.push({ type: 'line', x1: rx - 1, y1: ry - rh * r1 * 0.3, x2: rx + 3, y2: ry + rh * r2 * 0.3, stroke: colors.accent, lineWidth: 0.6 });
                }
                break;
            }
            case 'engravings':
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    const ex = x1 + t * patW;
                    const ey = (y1 + y2) / 2 + Math.sin(t * Math.PI * 3) * Math.abs(patH) * 0.3;
                    if (i > 0) {
                        const px = x1 + (i - 1) / 8 * patW;
                        const py = (y1 + y2) / 2 + Math.sin((i - 1) / 8 * Math.PI * 3) * Math.abs(patH) * 0.3;
                        data.parts.push({ type: 'line', x1: px, y1: py, x2: ex, y2: ey, stroke: this._darkenColor(colors.metal, 0.75), lineWidth: 0.6 });
                    }
                }
                break;
            case 'scales':
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 5; col++) {
                        const sx = x1 + col * patW * 0.22 + (row % 2) * patW * 0.11;
                        const sy = y1 + row * Math.abs(patH) * 0.5;
                        data.parts.push({ type: 'circle', x: sx, y: sy, r: patW * 0.08, fill: 'none', stroke: this._darkenColor(colors.metal, 0.8), lineWidth: 0.4 });
                    }
                }
                break;
        }
    }

    // ==================== GENERATED ITEM RENDERER ====================

    _drawGeneratedItem(ctx, overrideData) {
        const data = overrideData || this._generatedPath;
        if (!data || !data.parts) return;

        for (const part of data.parts) {
            ctx.save();

            if (part.glow) {
                ctx.shadowColor = part.glow;
                ctx.shadowBlur = 6;
            }

            switch (part.type) {
                case 'rect':
                    if (part.fill && part.fill !== 'none') {
                        ctx.fillStyle = part.fill;
                        if (part.rounded) {
                            this._roundedRect(ctx, part.x, part.y, part.w, part.h, part.rounded);
                            ctx.fill();
                        } else {
                            ctx.fillRect(part.x, part.y, part.w, part.h);
                        }
                    }
                    if (part.stroke && part.stroke !== 'none' && part.lineWidth > 0) {
                        ctx.strokeStyle = part.stroke;
                        ctx.lineWidth = part.lineWidth;
                        if (part.rounded) {
                            this._roundedRect(ctx, part.x, part.y, part.w, part.h, part.rounded);
                            ctx.stroke();
                        } else {
                            ctx.strokeRect(part.x, part.y, part.w, part.h);
                        }
                    }
                    break;

                case 'circle':
                    ctx.beginPath();
                    ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
                    if (part.fill && part.fill !== 'none') {
                        ctx.fillStyle = part.fill;
                        ctx.fill();
                    }
                    if (part.stroke && part.stroke !== 'none' && part.lineWidth > 0) {
                        ctx.strokeStyle = part.stroke;
                        ctx.lineWidth = part.lineWidth;
                        ctx.stroke();
                    }
                    break;

                case 'ellipse':
                    ctx.beginPath();
                    ctx.ellipse(part.x, part.y, Math.max(0.1, part.rx), Math.max(0.1, part.ry), 0, 0, Math.PI * 2);
                    if (part.fill && part.fill !== 'none') {
                        ctx.fillStyle = part.fill;
                        ctx.fill();
                    }
                    if (part.stroke && part.stroke !== 'none' && part.lineWidth > 0) {
                        ctx.strokeStyle = part.stroke;
                        ctx.lineWidth = part.lineWidth;
                        ctx.stroke();
                    }
                    break;

                case 'polygon':
                    if (part.points && part.points.length > 2) {
                        ctx.beginPath();
                        ctx.moveTo(part.points[0].x, part.points[0].y);
                        for (let i = 1; i < part.points.length; i++) {
                            ctx.lineTo(part.points[i].x, part.points[i].y);
                        }
                        ctx.closePath();
                        if (part.fill && part.fill !== 'none') {
                            ctx.fillStyle = part.fill;
                            ctx.fill();
                        }
                        if (part.stroke && part.stroke !== 'none' && part.lineWidth > 0) {
                            ctx.strokeStyle = part.stroke;
                            ctx.lineWidth = part.lineWidth;
                            ctx.stroke();
                        }
                    }
                    break;

                case 'polyline':
                    if (part.points && part.points.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(part.points[0].x, part.points[0].y);
                        for (let i = 1; i < part.points.length; i++) {
                            ctx.lineTo(part.points[i].x, part.points[i].y);
                        }
                        if (part.stroke && part.stroke !== 'none') {
                            ctx.strokeStyle = part.stroke;
                            ctx.lineWidth = part.lineWidth || 1;
                            ctx.stroke();
                        }
                    }
                    break;

                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(part.x1, part.y1);
                    ctx.lineTo(part.x2, part.y2);
                    ctx.strokeStyle = part.stroke || '#000';
                    ctx.lineWidth = part.lineWidth || 1;
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        }
    }

    _roundedRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ==================== OFFSCREEN CANVAS CACHE ====================

    _buildCacheKey() {
        // Build a key from all visual properties to detect when to regenerate
        if (this.itemType === 'gun' && this.drawGeneratedItem) {
            return `gun_${this.generationSeed}_${this.generationStyle}_${this.gunSubType}_${this.gunBodyLength}_${this.gunBodyHeight}_${this.gunFrameColor}_${this.gunFrameStyle}_${this.gunBarrelLength}_${this.gunBarrelThickness}_${this.gunBarrelColor}_${this.gunBarrelStyle}_${this.gunBarrelTaper}_${this.gunStockEnabled}_${this.gunStockLength}_${this.gunStockStyle}_${this.gunStockColor}_${this.gunStockDrop}_${this.gunGripStyle}_${this.gunGripLength}_${this.gunGripAngle}_${this.gunGripColor}_${this.gunGripPosition}_${this.gunForegripEnabled}_${this.gunForegripStyle}_${this.gunForegripPosition}_${this.gunForegripColor}_${this.gunMagazineStyle}_${this.gunMagazinePosition}_${this.gunMagazineSize}_${this.gunMagazineColor}_${this.gunScopeEnabled}_${this.gunScopeStyle}_${this.gunScopeSize}_${this.gunScopeColor}_${this.gunMuzzleDevice}_${this.gunMuzzleColor}_${this.gunRailEnabled}_${this.gunCamoPattern}_${this.gunCamoColor}_${this.gunWearAmount}_${this.gunDecalEnabled}_${this.gunDecalColor}_${this.gunGlowEnabled}_${this.gunGlowColor}_${this.enableRandomVariation}_${this.variationAmount}_${this.gunVariationBarrel}_${this.gunVariationParts}_${this.gunVariationCombat}_${this.itemColor}_${this.handleColor}_${this.genAccentColor}_${this.isHeld}`;
        }
        // Include all customization properties for proper cache invalidation
        const baseKey = `${this.drawGeneratedItem}_${this.generationSeed}_${this.generationSubType}_${this.generationStyle}_${this.itemLength}_${this.itemWidth}_${this.itemColor}_${this.handleColor}_${this.handleLength}_${this.showHandle}_${this.genBladeDetail}_${this.genCurvature}_${this.genSerration}_${this.genPommelSize}_${this.genGuardWidth}_${this.genAccentColor}_${this.genGemColor}_${this.genShowGem}_${this.genPatternType}`;
        // Variation settings
        const varKey = `_${this.enableRandomVariation}_${this.variationAmount}_${this.variationColorShift}_${this.variationSizeScale}_${this.variationDetailShift}`;
        // Weapon-specific options
        const weaponKey = `_${this.spearTipSize}_${this.spearTipStyle}_${this.spearShaftTaper}_${this.spearBindingCount}_${this.axeHeadSize}_${this.axeHeadStyle}_${this.axeHeadCurve}_${this.axeSpike}_${this.maceHeadSize}_${this.maceHeadStyle}_${this.maceFlangeCount}_${this.maceFlangeLength}_${this.daggerBladeStyle}_${this.daggerCrossguard}_${this.daggerFullerWidth}_${this.hammerHeadLength}_${this.hammerHeadStyle}_${this.hammerSpike}`;
        // Shield options
        const shieldKey = `_${this.shieldBossSize}_${this.shieldRimWidth}_${this.shieldEmblem}`;
        // Misc item options
        const miscKey = `_${this.torchFlameSize}_${this.potionFillLevel}_${this.potionBubbles}_${this.keyTeethCount}_${this.gemFacets}`;
        return baseKey + varKey + weaponKey + shieldKey + miscKey;
    }

    _rebuildCache() {
        this._cacheKey = this._buildCacheKey();

        if (this.itemType === 'gun' && this.drawGeneratedItem) {
            // Cache side view (not held - gun on its side)
            this._cachedCanvas = this._renderToOffscreen(false);
            // Cache top-down view (held)
            this._cachedCanvasHeld = this._renderToOffscreen(true);
        } else {
            // Cache standard item view
            this._cachedCanvas = this._renderToOffscreen(false);
            this._cachedCanvasHeld = null;
        }
    }

    _renderToOffscreen(isHeldView) {
        // Determine bounds with generous padding
        const padding = 20;
        let w, h;

        if (this.itemType === 'gun' && this.drawGeneratedItem) {
            // Gun dimensions: total length = stock + body + barrel + muzzle device
            const totalLen = (this.gunStockEnabled ? this.gunStockLength : 0) + this.gunBodyLength + this.gunBarrelLength + (this.gunMuzzleDevice !== 'none' ? 10 : 0);
            const totalH = Math.max(this.gunBodyHeight * 3, this.gunGripLength + this.gunBodyHeight + 10);
            w = totalLen + padding * 2;
            h = totalH + padding * 2;
        } else {
            w = this.itemLength + padding * 2;
            h = Math.max(this.itemWidth * 4, 30) + padding * 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(w);
        canvas.height = Math.ceil(h);
        const ctx = canvas.getContext('2d');
        // Crisp pixel rendering — no smoothing
        ctx.imageSmoothingEnabled = false;
        const originX = w / 2;
        const originY = h / 2;

        ctx.save();
        ctx.translate(originX, originY);

        if (this.itemType === 'gun' && this.drawGeneratedItem) {
            const data = isHeldView ? this._generatedPathHeld : this._generatedPath;
            if (data) this._drawGeneratedItem(ctx, data);
        } else if (this.drawGeneratedItem && this._generatedPath) {
            this._drawGeneratedItem(ctx);
        } else {
            this._drawDefaultItem(ctx);
        }

        ctx.restore();

        return { canvas, width: w, height: h, originX, originY };
    }

    // ==================== GUN GENERATION (SIDE VIEW - on ground) ====================

    /**
     * Get gun-type-specific default modifiers
     * Each gun type has characteristic proportions and features
     */
    _getGunTypeModifiers(gunType) {
        const mods = {
            // Base defaults
            bodyLengthMult: 1.0, bodyHeightMult: 1.0,
            barrelLengthMult: 1.0, barrelThickMult: 1.0,
            gripLengthMult: 1.0, gripAngleMod: 0,
            stockLengthMult: 1.0, stockDropMod: 0,
            magSizeMult: 1.0, scopeSizeMult: 1.0,
            preferredBarrelStyle: null,
            preferredMagStyle: null,
            preferredFrameStyle: null,
            preferredMuzzle: null,
            // Combat stat modifiers for variation
            damageMult: 1.0, fireRateMult: 1.0, recoilMult: 1.0
        };

        switch (gunType) {
            case 'pistol':
                mods.bodyLengthMult = 0.85;
                mods.bodyHeightMult = 0.9;
                mods.barrelLengthMult = 0.7;
                mods.barrelThickMult = 0.8;
                mods.gripLengthMult = 1.1;
                mods.gripAngleMod = 5;
                mods.magSizeMult = 0.7;
                mods.preferredMagStyle = 'box';
                mods.damageMult = 0.8;
                mods.fireRateMult = 0.9;
                mods.recoilMult = 0.7;
                break;
            case 'revolver':
                mods.bodyLengthMult = 0.9;
                mods.bodyHeightMult = 1.2;
                mods.barrelLengthMult = 0.8;
                mods.barrelThickMult = 0.9;
                mods.gripLengthMult = 1.0;
                mods.gripAngleMod = -5;
                mods.preferredMagStyle = 'internal';
                mods.preferredFrameStyle = 'classic';
                mods.damageMult = 1.2;
                mods.fireRateMult = 0.5;
                mods.recoilMult = 1.3;
                break;
            case 'rifle':
                mods.bodyLengthMult = 1.2;
                mods.barrelLengthMult = 1.3;
                mods.barrelThickMult = 1.1;
                mods.stockLengthMult = 1.1;
                mods.magSizeMult = 1.2;
                mods.scopeSizeMult = 0.8;
                mods.preferredMagStyle = 'curved';
                mods.preferredMuzzle = 'flash_hider';
                mods.damageMult = 1.3;
                mods.fireRateMult = 1.2;
                mods.recoilMult = 1.0;
                break;
            case 'shotgun':
                mods.bodyLengthMult = 1.1;
                mods.bodyHeightMult = 1.15;
                mods.barrelLengthMult = 1.2;
                mods.barrelThickMult = 1.5;
                mods.stockLengthMult = 0.95;
                mods.stockDropMod = 2;
                mods.preferredBarrelStyle = 'heavy';
                mods.preferredMagStyle = 'tube';
                mods.preferredMuzzle = 'brake';
                mods.damageMult = 1.8;
                mods.fireRateMult = 0.4;
                mods.recoilMult = 1.8;
                break;
            case 'smg':
                mods.bodyLengthMult = 0.9;
                mods.bodyHeightMult = 0.95;
                mods.barrelLengthMult = 0.75;
                mods.barrelThickMult = 0.85;
                mods.stockLengthMult = 0.8;
                mods.magSizeMult = 0.9;
                mods.preferredMagStyle = 'box';
                mods.preferredMuzzle = 'compensator';
                mods.preferredFrameStyle = 'rounded';
                mods.damageMult = 0.6;
                mods.fireRateMult = 2.0;
                mods.recoilMult = 0.5;
                break;
            case 'sniper':
                mods.bodyLengthMult = 1.3;
                mods.bodyHeightMult = 0.9;
                mods.barrelLengthMult = 1.6;
                mods.barrelThickMult = 1.2;
                mods.stockLengthMult = 1.3;
                mods.stockDropMod = -1;
                mods.scopeSizeMult = 1.5;
                mods.preferredBarrelStyle = 'heavy';
                mods.preferredMuzzle = 'suppressor';
                mods.damageMult = 2.5;
                mods.fireRateMult = 0.2;
                mods.recoilMult = 1.5;
                break;
            case 'launcher':
                mods.bodyLengthMult = 1.4;
                mods.bodyHeightMult = 1.5;
                mods.barrelLengthMult = 1.8;
                mods.barrelThickMult = 2.5;
                mods.gripLengthMult = 1.2;
                mods.preferredBarrelStyle = 'heavy';
                mods.preferredMagStyle = 'internal';
                mods.preferredFrameStyle = 'angular';
                mods.damageMult = 5.0;
                mods.fireRateMult = 0.1;
                mods.recoilMult = 2.5;
                break;
        }
        return mods;
    }

    /**
     * Apply gun-specific variation to a value
     */
    _applyGunVariation(baseValue, varRng, variationType = 'barrel') {
        if (!this.enableRandomVariation) return baseValue;
        const amt = this.variationAmount;
        let range;
        switch (variationType) {
            case 'barrel': range = this.gunVariationBarrel * amt; break;
            case 'parts': range = this.gunVariationParts * amt; break;
            case 'combat': range = this.gunVariationCombat * amt; break;
            case 'color': range = this.variationColorShift * amt; break;
            default: range = amt * 0.15;
        }
        const variation = (varRng() * 2 - 1) * range;
        return baseValue * (1 + variation);
    }

    _generateGunSideView(data, rng, varRng, genStyle, styleColors) {
        // Get gun-type-specific modifiers
        const typeMods = this._getGunTypeModifiers(this.gunSubType);
        
        // Apply gun type modifiers and random variation to dimensions
        const bL = this._applyGunVariation(this.gunBodyLength * typeMods.bodyLengthMult, varRng, 'parts');
        const bH = this._applyGunVariation(this.gunBodyHeight * typeMods.bodyHeightMult, varRng, 'parts');
        const barL = this._applyGunVariation(this.gunBarrelLength * typeMods.barrelLengthMult, varRng, 'barrel');
        const barT = this._applyGunVariation(this.gunBarrelThickness * typeMods.barrelThickMult, varRng, 'barrel');
        const halfBL = bL / 2;
        const halfBH = bH / 2;
        
        // Store effective dimensions for use by other parts
        data.effectiveDimensions = { bL, bH, barL, barT, halfBL, halfBH };
        
        // Apply style colors if not standard
        const useStyleColors = genStyle && genStyle !== 'standard' && styleColors;
        const frameCol = useStyleColors ? this._blendColors(this._applyColorVariation(this.gunFrameColor, varRng), styleColors.metal, 0.5) : this._applyColorVariation(this.gunFrameColor, varRng);
        const barrelCol = useStyleColors ? this._blendColors(this._applyColorVariation(this.gunBarrelColor, varRng), styleColors.metal, 0.4) : this._applyColorVariation(this.gunBarrelColor, varRng);
        const gripCol = useStyleColors ? this._blendColors(this._applyColorVariation(this.gunGripColor, varRng), styleColors.handle, 0.5) : this._applyColorVariation(this.gunGripColor, varRng);
        const stockCol = useStyleColors ? this._blendColors(this._applyColorVariation(this.gunStockColor, varRng), styleColors.handle, 0.4) : this._applyColorVariation(this.gunStockColor, varRng);
        const accentCol = useStyleColors ? styleColors.accent : this._applyColorVariation(this.gunMuzzleColor, varRng);
        const glowCol = useStyleColors ? styleColors.glow : this._applyColorVariation(this.gunGlowColor, varRng);
        
        const dark = this._darkenColor(frameCol, 0.6);
        // Gun type can influence frame style
        const style = typeMods.preferredFrameStyle || this.gunFrameStyle;

        // The gun is drawn on its side (profile view)
        // X axis = length (muzzle right, stock left)
        // Y axis = height (grip down, scope up)

        // === STOCK === (varies by gun type)
        if (this.gunStockEnabled) {
            const sL = this._applyGunVariation(this.gunStockLength * typeMods.stockLengthMult, varRng, 'parts');
            const drop = this._applyGunVariation(this.gunStockDrop + typeMods.stockDropMod, varRng, 'parts');
            const sx = -halfBL - sL;
            switch (this.gunStockStyle) {
                case 'skeletal': {
                    // Open frame stock - reduces weight, tactical look
                    const tubeThickness = 1.5 + bH * 0.08;
                    data.parts.push({ type: 'line', x1: -halfBL, y1: -halfBH * 0.3, x2: sx, y2: -halfBH * 0.3 + drop * 0.5, stroke: stockCol, lineWidth: tubeThickness });
                    data.parts.push({ type: 'line', x1: -halfBL, y1: halfBH * 0.3, x2: sx, y2: halfBH + drop, stroke: stockCol, lineWidth: tubeThickness });
                    data.parts.push({ type: 'line', x1: sx, y1: -halfBH * 0.3 + drop * 0.5, x2: sx, y2: halfBH + drop, stroke: stockCol, lineWidth: tubeThickness + 0.5 });
                    // Buttpad - absorbs recoil
                    const padHeight = halfBH + drop - (-halfBH * 0.3 + drop * 0.5) + 2;
                    data.parts.push({ type: 'rect', x: sx - 2.5, y: -halfBH * 0.3 + drop * 0.5 - 1, w: 3.5, h: padHeight, fill: this._darkenColor(stockCol, 0.7), stroke: this._darkenColor(stockCol, 0.5), lineWidth: 0.5, rounded: 1 });
                    // QD sling mount
                    data.parts.push({ type: 'circle', x: sx + sL * 0.3, y: halfBH * 0.1 + drop * 0.3, r: 1.5, fill: 'none', stroke: this._darkenColor(frameCol, 0.5), lineWidth: 0.8 });
                    break;
                }
                case 'thumbhole': {
                    // Ergonomic stock - better accuracy
                    const pts = [
                        { x: -halfBL, y: -halfBH }, { x: sx, y: -halfBH + drop * 0.3 },
                        { x: sx - 1, y: halfBH + drop }, { x: sx + sL * 0.4, y: halfBH + drop * 0.5 },
                        { x: sx + sL * 0.6, y: halfBH * 0.3 }, { x: -halfBL, y: halfBH * 0.5 }
                    ];
                    data.parts.push({ type: 'polygon', points: pts, fill: stockCol, stroke: this._darkenColor(stockCol, 0.6), lineWidth: 1 });
                    // Thumbhole cutout - ergonomic grip
                    const holeRX = sL * 0.15;
                    const holeRY = halfBH * 0.4;
                    data.parts.push({ type: 'ellipse', x: sx + sL * 0.45, y: halfBH * 0.2 + drop * 0.2, rx: holeRX, ry: holeRY, fill: '#00000000', stroke: this._darkenColor(stockCol, 0.5), lineWidth: 1 });
                    // Cheek rest adjustment slots
                    for (let i = 0; i < 3; i++) {
                        const slotX = sx + sL * 0.15 + i * 3;
                        data.parts.push({ type: 'rect', x: slotX, y: -halfBH + drop * 0.4, w: 1.5, h: 2, fill: this._darkenColor(stockCol, 0.4), stroke: 'none', lineWidth: 0 });
                    }
                    break;
                }
                case 'folding': {
                    // Compact stock - portability
                    const wireThickness = 2 + bH * 0.05;
                    data.parts.push({ type: 'line', x1: -halfBL, y1: 0, x2: sx + sL * 0.3, y2: drop * 0.5, stroke: frameCol, lineWidth: wireThickness });
                    data.parts.push({ type: 'line', x1: sx + sL * 0.3, y1: drop * 0.5, x2: sx, y2: drop, stroke: frameCol, lineWidth: wireThickness });
                    // Hinge mechanism
                    data.parts.push({ type: 'circle', x: -halfBL - 1, y: 0, r: 2, fill: this._darkenColor(frameCol, 0.6), stroke: this._darkenColor(frameCol, 0.4), lineWidth: 0.5 });
                    // Buttpad
                    data.parts.push({ type: 'rect', x: sx - 1.5, y: drop - 3, w: 4, h: 6, fill: this._darkenColor(frameCol, 0.7), stroke: 'none', lineWidth: 0, rounded: 1 });
                    break;
                }
                case 'pistolGrip': {
                    // AR-style buffer tube + separate grip - modular
                    const tubeH = halfBH * 0.7;
                    data.parts.push({ type: 'rect', x: -halfBL - sL, y: -tubeH / 2, w: sL, h: tubeH, fill: stockCol, stroke: this._darkenColor(stockCol, 0.6), lineWidth: 1, rounded: tubeH * 0.3 });
                    // Buffer tube threads
                    for (let i = 0; i < Math.floor(sL / 3); i++) {
                        const threadX = -halfBL - sL + 2 + i * 3;
                        data.parts.push({ type: 'line', x1: threadX, y1: -tubeH / 2 + 1, x2: threadX, y2: tubeH / 2 - 1, stroke: this._darkenColor(stockCol, 0.75), lineWidth: 0.3 });
                    }
                    // Cheek riser
                    data.parts.push({ type: 'rect', x: -halfBL - sL * 0.6, y: -tubeH / 2 - 2, w: sL * 0.4, h: 2, fill: stockCol, stroke: this._darkenColor(stockCol, 0.6), lineWidth: 0.5 });
                    break;
                }
                default: { // fixed - traditional, stable
                    const pts = [
                        { x: -halfBL, y: -halfBH }, { x: sx, y: -halfBH + drop * 0.5 },
                        { x: sx, y: halfBH + drop }, { x: -halfBL, y: halfBH }
                    ];
                    data.parts.push({ type: 'polygon', points: pts, fill: stockCol, stroke: this._darkenColor(stockCol, 0.6), lineWidth: 1 });
                    // Buttpad - rubber recoil absorber
                    const padH = bH + drop * 0.5;
                    data.parts.push({ type: 'rect', x: sx - 1.5, y: -halfBH + drop * 0.5, w: 3, h: padH, fill: this._darkenColor(stockCol, 0.5), stroke: this._darkenColor(stockCol, 0.4), lineWidth: 0.5 });
                    // Sling swivel mount
                    data.parts.push({ type: 'circle', x: sx + sL * 0.2, y: halfBH + drop - 2, r: 1.2, fill: 'none', stroke: this._darkenColor(frameCol, 0.5), lineWidth: 0.6 });
                    // Stock texture lines
                    for (let i = 0; i < 3; i++) {
                        const lineY = -halfBH + drop * 0.5 + padH * 0.3 + i * padH * 0.15;
                        data.parts.push({ type: 'line', x1: sx + 2, y1: lineY, x2: sx + sL * 0.5, y2: lineY, stroke: this._darkenColor(stockCol, 0.75), lineWidth: 0.3 });
                    }
                }
            }
        }

        // === RECEIVER / BODY === (varies visually by frame style)
        switch (style) {
            case 'rounded': {
                // Rounded receiver - ergonomic feel
                data.parts.push({ type: 'rect', x: -halfBL, y: -halfBH, w: bL, h: bH, fill: frameCol, stroke: dark, lineWidth: 1.2, rounded: Math.min(halfBH * 0.5, 4) });
                // Side panel detail
                data.parts.push({ type: 'rect', x: -halfBL + bL * 0.1, y: -halfBH * 0.5, w: bL * 0.25, h: bH * 0.5, fill: this._darkenColor(frameCol, 0.85), stroke: 'none', lineWidth: 0, rounded: 2 });
                break;
            }
            case 'bullpup': {
                // Bullpup design - compact, magazine behind grip
                data.parts.push({ type: 'rect', x: -halfBL, y: -halfBH, w: bL, h: bH, fill: frameCol, stroke: dark, lineWidth: 1.2, rounded: 2 });
                // Bullpup ejection port - brass ejects here
                data.parts.push({ type: 'rect', x: -halfBL * 0.5, y: -halfBH - 1.5, w: 5, h: 2.5, fill: this._darkenColor(frameCol, 0.35), stroke: this._darkenColor(frameCol, 0.5), lineWidth: 0.5 });
                // Bullpup carrying handle integrated
                data.parts.push({ type: 'line', x1: -halfBL * 0.3, y1: -halfBH - 2, x2: halfBL * 0.5, y2: -halfBH - 2, stroke: frameCol, lineWidth: 2 });
                data.parts.push({ type: 'line', x1: -halfBL * 0.3, y1: -halfBH - 2, x2: -halfBL * 0.3, y2: -halfBH, stroke: frameCol, lineWidth: 2 });
                data.parts.push({ type: 'line', x1: halfBL * 0.5, y1: -halfBH - 2, x2: halfBL * 0.5, y2: -halfBH, stroke: frameCol, lineWidth: 2 });
                break;
            }
            case 'futuristic': {
                // Futuristic angular design - sci-fi look
                const pts = [
                    { x: -halfBL, y: -halfBH * 0.8 }, { x: -halfBL + bL * 0.1, y: -halfBH },
                    { x: halfBL - bL * 0.05, y: -halfBH * 0.9 }, { x: halfBL, y: -halfBH * 0.5 },
                    { x: halfBL, y: halfBH * 0.5 }, { x: halfBL - bL * 0.05, y: halfBH * 0.9 },
                    { x: -halfBL + bL * 0.1, y: halfBH }, { x: -halfBL, y: halfBH * 0.8 }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: frameCol, stroke: dark, lineWidth: 1.2 });
                // Panel lines - futuristic details
                data.parts.push({ type: 'line', x1: -halfBL * 0.6, y1: -halfBH * 0.3, x2: halfBL * 0.8, y2: -halfBH * 0.3, stroke: this._darkenColor(frameCol, 0.75), lineWidth: 0.5 });
                data.parts.push({ type: 'line', x1: -halfBL * 0.4, y1: halfBH * 0.3, x2: halfBL * 0.6, y2: halfBH * 0.3, stroke: this._darkenColor(frameCol, 0.75), lineWidth: 0.5 });
                // Ventilation ports
                for (let i = 0; i < 3; i++) {
                    data.parts.push({ type: 'rect', x: halfBL * 0.2 + i * 4, y: halfBH * 0.5, w: 2, h: halfBH * 0.3, fill: this._darkenColor(frameCol, 0.4), stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'classic': {
                // Classic receiver - traditional look
                data.parts.push({ type: 'rect', x: -halfBL, y: -halfBH, w: bL, h: bH, fill: frameCol, stroke: dark, lineWidth: 1.2, rounded: 3 });
                // Receiver detail lines
                data.parts.push({ type: 'line', x1: -halfBL + 3, y1: -halfBH * 0.6, x2: halfBL - 3, y2: -halfBH * 0.6, stroke: this._darkenColor(frameCol, 0.8), lineWidth: 0.5 });
                data.parts.push({ type: 'line', x1: -halfBL + 3, y1: halfBH * 0.6, x2: halfBL - 3, y2: halfBH * 0.6, stroke: this._darkenColor(frameCol, 0.8), lineWidth: 0.5 });
                break;
            }
            default: { // angular
                data.parts.push({ type: 'rect', x: -halfBL, y: -halfBH, w: bL, h: bH, fill: frameCol, stroke: dark, lineWidth: 1.2 });
                // Simple angular details
                data.parts.push({ type: 'line', x1: -halfBL + 2, y1: -halfBH * 0.6, x2: halfBL - 2, y2: -halfBH * 0.6, stroke: this._darkenColor(frameCol, 0.8), lineWidth: 0.4 });
            }
        }

        // Ejection port - where shells eject
        const epX = -halfBL + bL * 0.6;
        const epW = Math.max(bL * 0.12, 3);
        const epH = Math.max(2, bH * 0.25);
        data.parts.push({ type: 'rect', x: epX, y: -halfBH - 0.5, w: epW, h: epH, fill: this._darkenColor(frameCol, 0.3), stroke: this._darkenColor(frameCol, 0.5), lineWidth: 0.3 });
        // Ejection port detail
        data.parts.push({ type: 'rect', x: epX + 0.5, y: -halfBH + 0.5, w: epW - 1, h: 1, fill: this._darkenColor(frameCol, 0.2), stroke: 'none', lineWidth: 0 });

        // === BARREL === (varies by gun type via barrel style)
        const barrelStart = halfBL;
        const barrelEnd = halfBL + barL;
        const halfBar = barT / 2;
        const taperAmt = this._applyGunVariation(this.gunBarrelTaper, varRng, 'barrel');
        const taperEnd = halfBar * (1 - taperAmt * 0.6);
        
        // Gun type may override barrel style
        const effectiveBarrelStyle = typeMods.preferredBarrelStyle || this.gunBarrelStyle;

        switch (effectiveBarrelStyle) {
            case 'heavy': {
                // Heavy barrel - better accuracy, heat dissipation
                const heavyT = barT * 1.4;
                data.parts.push({ type: 'polygon', points: [
                    { x: barrelStart, y: -heavyT / 2 }, { x: barrelEnd, y: -taperEnd * 1.3 },
                    { x: barrelEnd, y: taperEnd * 1.3 }, { x: barrelStart, y: heavyT / 2 }
                ], fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 1 });
                // Heavy barrel cooling fins
                const finCount = Math.floor(barL / 5);
                for (let i = 0; i < finCount; i++) {
                    const fx = barrelStart + (i + 0.5) * (barL / finCount);
                    data.parts.push({ type: 'line', x1: fx, y1: -heavyT / 2 - 0.5, x2: fx, y2: heavyT / 2 + 0.5, stroke: this._darkenColor(barrelCol, 0.75), lineWidth: 0.3 });
                }
                break;
            }
            case 'fluted': {
                // Fluted barrel - lighter weight, better cooling
                data.parts.push({ type: 'polygon', points: [
                    { x: barrelStart, y: -halfBar }, { x: barrelEnd, y: -taperEnd },
                    { x: barrelEnd, y: taperEnd }, { x: barrelStart, y: halfBar }
                ], fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 1 });
                // Fluting grooves - reduce weight
                const grooves = Math.max(3, Math.floor(barL / 6));
                for (let i = 0; i < grooves; i++) {
                    const t = (i + 1) / (grooves + 1);
                    const gx = barrelStart + t * barL;
                    const grooveDepth = halfBar * 0.3;
                    data.parts.push({ type: 'line', x1: gx, y1: -halfBar + grooveDepth, x2: gx, y2: halfBar - grooveDepth, stroke: this._darkenColor(barrelCol, 0.7), lineWidth: 0.6 });
                }
                break;
            }
            case 'ported': {
                // Ported barrel - reduces muzzle rise
                data.parts.push({ type: 'polygon', points: [
                    { x: barrelStart, y: -halfBar }, { x: barrelEnd, y: -taperEnd },
                    { x: barrelEnd, y: taperEnd }, { x: barrelStart, y: halfBar }
                ], fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 1 });
                // Porting holes - vent gas to reduce recoil
                const portCount = Math.max(2, Math.floor(barL / 8));
                for (let i = 0; i < portCount; i++) {
                    const px = barrelEnd - 2 - i * 3;
                    const portR = Math.max(0.6, halfBar * 0.25);
                    data.parts.push({ type: 'circle', x: px, y: -halfBar * 0.4, r: portR, fill: this._darkenColor(barrelCol, 0.3), stroke: 'none', lineWidth: 0 });
                    data.parts.push({ type: 'circle', x: px, y: halfBar * 0.4, r: portR, fill: this._darkenColor(barrelCol, 0.3), stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'suppressed': {
                // Suppressed - quiet operation
                // Thin inner barrel
                data.parts.push({ type: 'rect', x: barrelStart, y: -halfBar * 0.6, w: barL * 0.4, h: barT * 0.6, fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 0.8 });
                // Suppressor body - sound dampening
                const supStart = barrelStart + barL * 0.35;
                const supW = barT * 2.5;
                data.parts.push({ type: 'rect', x: supStart, y: -supW / 2, w: barL * 0.65, h: supW, fill: this._darkenColor(barrelCol, 0.85), stroke: this._darkenColor(barrelCol, 0.5), lineWidth: 1, rounded: supW * 0.3 });
                // Suppressor baffles - trap expanding gas
                const baffleCount = Math.max(2, Math.floor(barL * 0.65 / 6));
                for (let i = 0; i < baffleCount; i++) {
                    const bx = supStart + (barL * 0.65 / (baffleCount + 1)) * (i + 1);
                    data.parts.push({ type: 'line', x1: bx, y1: -supW / 2 + 1, x2: bx, y2: supW / 2 - 1, stroke: this._darkenColor(barrelCol, 0.65), lineWidth: 0.5 });
                }
                // End cap
                data.parts.push({ type: 'rect', x: supStart + barL * 0.65 - 2, y: -supW / 2 + 0.5, w: 2, h: supW - 1, fill: this._darkenColor(barrelCol, 0.7), stroke: 'none', lineWidth: 0 });
                break;
            }
            default: { // standard - balanced performance
                data.parts.push({ type: 'polygon', points: [
                    { x: barrelStart, y: -halfBar }, { x: barrelEnd, y: -taperEnd },
                    { x: barrelEnd, y: taperEnd }, { x: barrelStart, y: halfBar }
                ], fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 1 });
                // Standard barrel lug
                data.parts.push({ type: 'rect', x: barrelStart + 2, y: halfBar, w: 3, h: 1.5, fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 0.3 });
            }
        }

        // Barrel bore (dark circle at muzzle end)
        const muzzleTip = effectiveBarrelStyle === 'suppressed' ? barrelStart + barL : barrelEnd;
        const boreSize = Math.max(0.8, taperEnd * 0.5);
        data.parts.push({ type: 'circle', x: muzzleTip, y: 0, r: boreSize, fill: '#111111', stroke: '#000000', lineWidth: 0.3 });

        // === MUZZLE DEVICE === (affects recoil/flash)
        const effectiveMuzzle = typeMods.preferredMuzzle || this.gunMuzzleDevice;
        if (effectiveMuzzle !== 'none') {
            const mC = this._applyColorVariation(this.gunMuzzleColor, varRng);
            const mdStart = muzzleTip;
            switch (effectiveMuzzle) {
                case 'flash_hider': {
                    // Flash hider - reduces visible flash
                    const fhL = 5 + barT * 0.3;
                    const fhW = barT * 1.3;
                    data.parts.push({ type: 'rect', x: mdStart, y: -fhW / 2, w: fhL, h: fhW, fill: mC, stroke: this._darkenColor(mC, 0.6), lineWidth: 0.8 });
                    // Prongs - disperse flash
                    data.parts.push({ type: 'line', x1: mdStart + fhL, y1: -fhW / 2, x2: mdStart + fhL + 2, y2: -fhW / 2 - 1, stroke: mC, lineWidth: 1 });
                    data.parts.push({ type: 'line', x1: mdStart + fhL, y1: 0, x2: mdStart + fhL + 3, y2: 0, stroke: mC, lineWidth: 0.8 });
                    data.parts.push({ type: 'line', x1: mdStart + fhL, y1: fhW / 2, x2: mdStart + fhL + 2, y2: fhW / 2 + 1, stroke: mC, lineWidth: 1 });
                    // Vents
                    data.parts.push({ type: 'rect', x: mdStart + fhL * 0.3, y: -fhW / 2 - 0.5, w: 1.5, h: 1, fill: this._darkenColor(mC, 0.3), stroke: 'none', lineWidth: 0 });
                    break;
                }
                case 'compensator': {
                    // Compensator - reduces muzzle climb
                    const cL = 4 + barT * 0.2;
                    const cW = barT * 1.5;
                    data.parts.push({ type: 'rect', x: mdStart, y: -cW / 2, w: cL, h: cW, fill: mC, stroke: this._darkenColor(mC, 0.6), lineWidth: 0.8 });
                    // Comp ports (top) - vent gas upward
                    const portCount = Math.max(2, Math.floor(cL / 2));
                    for (let i = 0; i < portCount; i++) {
                        data.parts.push({ type: 'rect', x: mdStart + 0.8 + i * 1.8, y: -cW / 2 - 1.5, w: 1, h: 1.5, fill: this._darkenColor(mC, 0.3), stroke: 'none', lineWidth: 0 });
                    }
                    break;
                }
                case 'brake': {
                    const bkL = 6;
                    const bkW = barT * 1.8;
                    data.parts.push({ type: 'rect', x: mdStart, y: -bkW / 2, w: bkL, h: bkW, fill: mC, stroke: this._darkenColor(mC, 0.6), lineWidth: 0.8 });
                    // Side ports
                    for (let i = 0; i < 3; i++) {
                        const px = mdStart + 1 + i * 2;
                        data.parts.push({ type: 'line', x1: px, y1: -bkW / 2, x2: px, y2: -bkW / 2 - 2, stroke: this._darkenColor(mC, 0.4), lineWidth: 0.8 });
                        data.parts.push({ type: 'line', x1: px, y1: bkW / 2, x2: px, y2: bkW / 2 + 2, stroke: this._darkenColor(mC, 0.4), lineWidth: 0.8 });
                    }
                    break;
                }
                case 'suppressor': {
                    const sL = 12;
                    const sW = barT * 2.5;
                    data.parts.push({ type: 'rect', x: mdStart, y: -sW / 2, w: sL, h: sW, fill: this._darkenColor(mC, 0.9), stroke: this._darkenColor(mC, 0.5), lineWidth: 1, rounded: sW * 0.3 });
                    for (let i = 0; i < 4; i++) {
                        const bx = mdStart + (sL / 5) * (i + 1);
                        data.parts.push({ type: 'line', x1: bx, y1: -sW / 2 + 1, x2: bx, y2: sW / 2 - 1, stroke: this._darkenColor(mC, 0.65), lineWidth: 0.4 });
                    }
                    break;
                }
            }
        }

        // === TRIGGER GRIP === (main hand grip - affects control/comfort)
        const gripPos = this._applyGunVariation(this.gunGripPosition, varRng, 'parts');
        const gripX = -halfBL + bL * gripPos;
        const baseGripAngle = this.gunGripAngle + typeMods.gripAngleMod;
        const gripAng = this._applyGunVariation(baseGripAngle, varRng, 'parts') * Math.PI / 180;
        const gripLen = this._applyGunVariation(this.gunGripLength * typeMods.gripLengthMult, varRng, 'parts');
        const gripW = Math.max(2, bH * 0.4);

        switch (this.gunGripStyle) {
            case 'ergonomic': {
                // Ergonomic grip - better comfort, reduced fatigue
                const pts = [
                    { x: gripX - gripW / 2, y: halfBH },
                    { x: gripX - gripW / 2 - Math.sin(gripAng) * gripLen * 0.3, y: halfBH + gripLen * 0.5 },
                    { x: gripX + Math.sin(gripAng) * gripLen * 0.2 - gripW * 0.3, y: halfBH + gripLen },
                    { x: gripX + Math.sin(gripAng) * gripLen * 0.2 + gripW * 0.3, y: halfBH + gripLen },
                    { x: gripX + gripW / 2 - Math.sin(gripAng) * gripLen * 0.1, y: halfBH + gripLen * 0.4 },
                    { x: gripX + gripW / 2, y: halfBH }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 1 });
                // Finger grooves
                for (let i = 0; i < 3; i++) {
                    const gy = halfBH + gripLen * 0.35 + i * gripLen * 0.2;
                    data.parts.push({ type: 'line', x1: gripX - gripW * 0.4, y1: gy, x2: gripX + gripW * 0.2, y2: gy, stroke: this._darkenColor(gripCol, 0.5), lineWidth: 0.5 });
                }
                break;
            }
            case 'angled': {
                // Angled grip - natural wrist position
                const endX = gripX + Math.sin(gripAng) * gripLen;
                const endY = halfBH + Math.cos(gripAng) * gripLen;
                const pts = [
                    { x: gripX - gripW / 2, y: halfBH },
                    { x: endX - gripW / 2, y: endY },
                    { x: endX + gripW / 2, y: endY },
                    { x: gripX + gripW / 2, y: halfBH }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 1 });
                // Beaver tail
                data.parts.push({ type: 'polygon', points: [
                    { x: gripX - gripW * 0.3, y: halfBH - 0.5 },
                    { x: gripX + gripW * 0.5, y: halfBH - 0.5 },
                    { x: gripX + gripW * 0.3, y: halfBH - 2 }
                ], fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 0.5 });
                break;
            }
            case 'target': {
                // Target grip - precision shooting, palm shelf
                const pts = [
                    { x: gripX - gripW * 0.6, y: halfBH },
                    { x: gripX - gripW * 0.8, y: halfBH + gripLen * 0.7 },
                    { x: gripX - gripW * 0.3, y: halfBH + gripLen },
                    { x: gripX + gripW * 0.3, y: halfBH + gripLen },
                    { x: gripX + gripW * 0.8, y: halfBH + gripLen * 0.5 },
                    { x: gripX + gripW * 0.6, y: halfBH }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 1 });
                // Thumb shelf - stable thumb rest
                data.parts.push({ type: 'line', x1: gripX - gripW * 0.7, y1: halfBH + gripLen * 0.4, x2: gripX - gripW * 0.3, y2: halfBH + gripLen * 0.3, stroke: this._darkenColor(gripCol, 0.5), lineWidth: 1.2 });
                // Palm swell
                data.parts.push({ type: 'ellipse', x: gripX + gripW * 0.3, y: halfBH + gripLen * 0.5, rx: gripW * 0.35, ry: gripLen * 0.2, fill: this._lightenColor(gripCol, 1.05), stroke: 'none', lineWidth: 0 });
                break;
            }
            case 'wrap': {
                // Wrapped grip - tactical, secure hold
                const pts = [
                    { x: gripX - gripW / 2, y: halfBH },
                    { x: gripX - gripW / 2 + Math.sin(gripAng) * gripLen * 0.1, y: halfBH + gripLen },
                    { x: gripX + gripW / 2 + Math.sin(gripAng) * gripLen * 0.1, y: halfBH + gripLen },
                    { x: gripX + gripW / 2, y: halfBH }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 1 });
                // Wrap lines - paracord/tape texture
                const wrapCount = Math.max(3, Math.floor(gripLen / 2.5));
                for (let i = 0; i < wrapCount; i++) {
                    const t = (i + 1) / (wrapCount + 1);
                    const ly = halfBH + t * gripLen;
                    data.parts.push({ type: 'line', x1: gripX - gripW / 2 + 0.5, y1: ly, x2: gripX + gripW / 2 - 0.5, y2: ly - 1, stroke: this._darkenColor(gripCol, 0.75), lineWidth: 0.5 });
                }
                break;
            }
            default: { // standard - basic functional grip
                const pts = [
                    { x: gripX - gripW / 2, y: halfBH },
                    { x: gripX + Math.sin(gripAng) * gripLen - gripW / 2, y: halfBH + gripLen },
                    { x: gripX + Math.sin(gripAng) * gripLen + gripW / 2, y: halfBH + gripLen },
                    { x: gripX + gripW / 2, y: halfBH }
                ];
                data.parts.push({ type: 'polygon', points: pts, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 1 });
            }
        }

        // Trigger
        const trigX = gripX + gripW * 0.3;
        const trigY = halfBH + 1;
        data.parts.push({ type: 'line', x1: trigX, y1: trigY, x2: trigX - 1, y2: trigY + gripLen * 0.35, stroke: this._darkenColor(frameCol, 0.5), lineWidth: 1 });
        // Trigger guard
        data.parts.push({ type: 'polyline', points: [
            { x: gripX - gripW, y: halfBH },
            { x: gripX - gripW, y: halfBH + gripLen * 0.4 },
            { x: gripX + gripW * 0.5, y: halfBH + gripLen * 0.4 },
            { x: gripX + gripW * 0.5, y: halfBH }
        ], stroke: frameCol, lineWidth: 1 });

        // === FOREGRIP === (off-hand grip for two-handed weapons - improves stability)
        if (this.gunForegripEnabled) {
            const fgPos = this._applyGunVariation(this.gunForegripPosition, varRng, 'parts');
            const fgX = halfBL - bL * fgPos;
            const fgCol = this._applyColorVariation(this.gunForegripColor, varRng);
            switch (this.gunForegripStyle) {
                case 'angled': {
                    // Angled foregrip - natural grip angle, C-clamp hold
                    const fgH = 6 + bH * 0.3;
                    const pts = [
                        { x: fgX - 2, y: halfBH }, { x: fgX - 3.5, y: halfBH + fgH },
                        { x: fgX + 0.5, y: halfBH + fgH + 1 }, { x: fgX + 2, y: halfBH }
                    ];
                    data.parts.push({ type: 'polygon', points: pts, fill: fgCol, stroke: this._darkenColor(fgCol, 0.6), lineWidth: 0.8 });
                    // Grip texture
                    for (let i = 0; i < 3; i++) {
                        const ty = halfBH + fgH * 0.3 + i * 2;
                        data.parts.push({ type: 'line', x1: fgX - 2.5 + i * 0.3, y1: ty, x2: fgX + 0.5 + i * 0.2, y2: ty, stroke: this._darkenColor(fgCol, 0.75), lineWidth: 0.3 });
                    }
                    break;
                }
                case 'stubby': {
                    // Stubby grip - compact, prevents hand slip
                    const stubH = 4 + bH * 0.2;
                    data.parts.push({ type: 'rect', x: fgX - 2, y: halfBH, w: 4, h: stubH, fill: fgCol, stroke: this._darkenColor(fgCol, 0.6), lineWidth: 0.8, rounded: 1.5 });
                    // Rubber bottom
                    data.parts.push({ type: 'rect', x: fgX - 2, y: halfBH + stubH - 1.5, w: 4, h: 1.5, fill: this._darkenColor(fgCol, 0.7), stroke: 'none', lineWidth: 0, rounded: 1 });
                    break;
                }
                case 'handguard': {
                    // Handguard - heat protection, barrel stability
                    const hgW = bL * 0.3;
                    const hgH = 3 + bH * 0.15;
                    data.parts.push({ type: 'rect', x: fgX - hgW / 2, y: halfBH, w: hgW, h: hgH, fill: fgCol, stroke: this._darkenColor(fgCol, 0.6), lineWidth: 0.8, rounded: 1 });
                    // Heat vents - dissipate barrel heat
                    const ventCount = Math.max(2, Math.floor(hgW / 4));
                    for (let i = 0; i < ventCount; i++) {
                        const vx = fgX - hgW / 2 + hgW * (i + 0.5) / ventCount;
                        data.parts.push({ type: 'circle', x: vx, y: halfBH + hgH * 0.45, r: 0.8, fill: this._darkenColor(fgCol, 0.3), stroke: 'none', lineWidth: 0 });
                    }
                    // M-LOK slots
                    data.parts.push({ type: 'rect', x: fgX - hgW * 0.25, y: halfBH + hgH - 1, w: hgW * 0.5, h: 0.8, fill: this._darkenColor(fgCol, 0.4), stroke: 'none', lineWidth: 0 });
                    break;
                }
                case 'bipod': {
                    // Bipod - resting support, reduces sway
                    const legSpread = 3 + bH * 0.15;
                    const legLen = 10 + barL * 0.1;
                    data.parts.push({ type: 'line', x1: fgX - legSpread, y1: halfBH, x2: fgX - legSpread * 1.3, y2: halfBH + legLen, stroke: frameCol, lineWidth: 1.5 });
                    data.parts.push({ type: 'line', x1: fgX + legSpread, y1: halfBH, x2: fgX + legSpread * 1.3, y2: halfBH + legLen, stroke: frameCol, lineWidth: 1.5 });
                    // Mounting block
                    data.parts.push({ type: 'rect', x: fgX - legSpread - 1, y: halfBH - 1, w: legSpread * 2 + 2, h: 2, fill: this._darkenColor(frameCol, 0.7), stroke: 'none', lineWidth: 0, rounded: 0.5 });
                    // Rubber feet
                    data.parts.push({ type: 'circle', x: fgX - legSpread * 1.3, y: halfBH + legLen, r: 1.2, fill: '#222222', stroke: 'none', lineWidth: 0 });
                    data.parts.push({ type: 'circle', x: fgX + legSpread * 1.3, y: halfBH + legLen, r: 1.2, fill: '#222222', stroke: 'none', lineWidth: 0 });
                    break;
                }
                default: { // vertical - standard, quick target acquisition
                    const vgH = 7 + bH * 0.25;
                    data.parts.push({ type: 'rect', x: fgX - 2, y: halfBH, w: 4, h: vgH, fill: fgCol, stroke: this._darkenColor(fgCol, 0.6), lineWidth: 0.8, rounded: 1.5 });
                    // Grip texture lines
                    for (let i = 0; i < 4; i++) {
                        const ty = halfBH + vgH * 0.25 + i * (vgH * 0.15);
                        data.parts.push({ type: 'line', x1: fgX - 1.5, y1: ty, x2: fgX + 1.5, y2: ty, stroke: this._darkenColor(fgCol, 0.75), lineWidth: 0.3 });
                    }
                }
            }
        }

        // === MAGAZINE === (ammo capacity varies by gun type)
        const effectiveMagStyle = typeMods.preferredMagStyle || this.gunMagazineStyle;
        const magPos = this._applyGunVariation(this.gunMagazinePosition, varRng, 'parts');
        const magX = -halfBL + bL * magPos;
        const magSize = this._applyGunVariation(this.gunMagazineSize * typeMods.magSizeMult, varRng, 'parts');
        const magCol = this._applyColorVariation(this.gunMagazineColor, varRng);
        
        if (effectiveMagStyle !== 'internal') {
            switch (effectiveMagStyle) {
                case 'curved': {
                    // Curved magazine - follows cartridge shape (AK style)
                    const magH = 6 + magSize * 10;
                    const curveStrength = magSize * 4;
                    const pts = [];
                    for (let i = 0; i <= 6; i++) {
                        const t = i / 6;
                        const curveX = Math.sin(t * 0.6) * curveStrength;
                        pts.push({ x: magX - 2 + curveX, y: halfBH + t * magH });
                    }
                    for (let i = 6; i >= 0; i--) {
                        const t = i / 6;
                        const curveX = Math.sin(t * 0.6) * curveStrength;
                        pts.push({ x: magX + 2 + curveX, y: halfBH + t * magH });
                    }
                    data.parts.push({ type: 'polygon', points: pts, fill: magCol, stroke: this._darkenColor(magCol, 0.6), lineWidth: 0.8 });
                    // Round witness holes
                    for (let i = 0; i < 3; i++) {
                        const hy = halfBH + magH * 0.3 + i * magH * 0.2;
                        const hx = magX + 2.5 + Math.sin((hy - halfBH) / magH * 0.6) * curveStrength;
                        data.parts.push({ type: 'circle', x: hx, y: hy, r: 0.5, fill: this._darkenColor(magCol, 0.4), stroke: 'none', lineWidth: 0 });
                    }
                    break;
                }
                case 'drum': {
                    // Drum magazine - high capacity
                    const drumR = 4 + magSize * 6;
                    data.parts.push({ type: 'circle', x: magX, y: halfBH + drumR, r: drumR, fill: magCol, stroke: this._darkenColor(magCol, 0.5), lineWidth: 1 });
                    // Feed tower
                    data.parts.push({ type: 'rect', x: magX - 2.5, y: halfBH, w: 5, h: drumR * 0.5, fill: magCol, stroke: this._darkenColor(magCol, 0.6), lineWidth: 0.5 });
                    // Drum center cap
                    data.parts.push({ type: 'circle', x: magX, y: halfBH + drumR, r: drumR * 0.4, fill: this._darkenColor(magCol, 0.8), stroke: this._darkenColor(magCol, 0.5), lineWidth: 0.5 });
                    // Winding key
                    data.parts.push({ type: 'rect', x: magX - 1, y: halfBH + drumR * 1.8 - 1, w: 2, h: 2, fill: this._darkenColor(magCol, 0.6), stroke: 'none', lineWidth: 0 });
                    break;
                }
                case 'tube': {
                    // Tubular magazine - under barrel (shotgun style)
                    const tubeLen = barL * 0.7;
                    const tubeH = 2.5 + barT * 0.3;
                    data.parts.push({ type: 'rect', x: halfBL - tubeLen - 2, y: halfBar + 1, w: tubeLen, h: tubeH, fill: magCol, stroke: this._darkenColor(magCol, 0.6), lineWidth: 0.5, rounded: tubeH * 0.4 });
                    // Tube cap
                    data.parts.push({ type: 'circle', x: halfBL - 2, y: halfBar + 1 + tubeH / 2, r: tubeH * 0.6, fill: this._darkenColor(magCol, 0.7), stroke: this._darkenColor(magCol, 0.5), lineWidth: 0.4 });
                    // Loading port indicator
                    data.parts.push({ type: 'rect', x: halfBL - tubeLen * 0.5, y: halfBar + 1, w: 3, h: 1, fill: this._darkenColor(magCol, 0.4), stroke: 'none', lineWidth: 0 });
                    break;
                }
                default: { // box - standard detachable magazine
                    const magH = 5 + magSize * 8;
                    const magW = 4 + magSize * 1;
                    data.parts.push({ type: 'rect', x: magX - magW / 2, y: halfBH, w: magW, h: magH, fill: magCol, stroke: this._darkenColor(magCol, 0.6), lineWidth: 0.8, rounded: 0.5 });
                    // Witness holes (see remaining ammo)
                    const holeCount = Math.max(2, Math.floor(magH / 4));
                    for (let i = 0; i < holeCount; i++) {
                        const hy = halfBH + magH * 0.25 + i * (magH * 0.6 / holeCount);
                        data.parts.push({ type: 'circle', x: magX + magW / 2 - 0.8, y: hy, r: 0.5, fill: this._darkenColor(magCol, 0.4), stroke: 'none', lineWidth: 0 });
                    }
                    // Baseplate
                    data.parts.push({ type: 'rect', x: magX - magW / 2 - 0.3, y: halfBH + magH - 1.5, w: magW + 0.6, h: 1.5, fill: this._darkenColor(magCol, 0.7), stroke: 'none', lineWidth: 0, rounded: 0.3 });
                }
            }
        }

        // === SCOPE / SIGHT === (affects aim speed/accuracy)
        if (this.gunScopeEnabled) {
            const scCol = this._applyColorVariation(this.gunScopeColor, varRng);
            const scSize = this._applyGunVariation(this.gunScopeSize * typeMods.scopeSizeMult, varRng, 'parts');
            const scopeY = -halfBH;

            switch (this.gunScopeStyle) {
                case 'reddot': {
                    // Red dot sight - fast target acquisition
                    const rdH = 3 + scSize * 4;
                    const rdW = 4 + scSize * 3;
                    data.parts.push({ type: 'rect', x: -rdW / 2, y: scopeY - rdH, w: rdW, h: rdH, fill: scCol, stroke: this._darkenColor(scCol, 0.6), lineWidth: 0.8, rounded: 1 });
                    // Lens - coated glass
                    data.parts.push({ type: 'circle', x: rdW / 2 - 1.5, y: scopeY - rdH / 2, r: rdH * 0.35, fill: '#113344', stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.5 });
                    // Brightness adjustment dial
                    data.parts.push({ type: 'circle', x: -rdW / 2 + 1.5, y: scopeY - rdH / 2, r: 1, fill: this._darkenColor(scCol, 0.7), stroke: 'none', lineWidth: 0 });
                    break;
                }
                case 'acog': {
                    // ACOG - magnified combat optic
                    const acL = 6 + scSize * 6;
                    const acH = 2.5 + scSize * 3;
                    data.parts.push({ type: 'polygon', points: [
                        { x: -acL / 2, y: scopeY - acH * 0.8 }, { x: acL / 2, y: scopeY - acH },
                        { x: acL / 2, y: scopeY }, { x: -acL / 2, y: scopeY }
                    ], fill: scCol, stroke: this._darkenColor(scCol, 0.6), lineWidth: 0.8 });
                    // Lens circles
                    data.parts.push({ type: 'circle', x: acL / 2, y: scopeY - acH / 2, r: acH * 0.35, fill: '#113344', stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.5 });
                    // Fiber optic for illumination
                    data.parts.push({ type: 'line', x1: -acL / 2, y1: scopeY - acH * 0.4, x2: -acL / 2 - 2, y2: scopeY - acH * 0.4, stroke: '#ff3333', lineWidth: 0.8 });
                    break;
                }
                case 'sniper': {
                    // Sniper scope - long range precision
                    const snL = 10 + scSize * 10;
                    const snR = 2 + scSize * 2;
                    data.parts.push({ type: 'rect', x: -snL / 2, y: scopeY - snR, w: snL, h: snR * 2, fill: scCol, stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.8, rounded: snR });
                    // Objective lens (front) - larger
                    data.parts.push({ type: 'circle', x: snL / 2, y: scopeY, r: snR * 1.2, fill: '#113344', stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.8 });
                    // Ocular lens (rear) - smaller
                    data.parts.push({ type: 'circle', x: -snL / 2, y: scopeY, r: snR * 0.8, fill: '#113344', stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.5 });
                    // Elevation turret - vertical adjustment
                    data.parts.push({ type: 'rect', x: -2, y: scopeY - snR - 3, w: 4, h: 3.5, fill: this._darkenColor(scCol, 0.8), stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.5 });
                    // Turret markings
                    data.parts.push({ type: 'line', x1: -1, y1: scopeY - snR - 2.5, x2: 1, y2: scopeY - snR - 2.5, stroke: this._lightenColor(scCol, 1.3), lineWidth: 0.3 });
                    // Windage turret - horizontal adjustment  
                    data.parts.push({ type: 'rect', x: 1, y: scopeY - snR * 0.3, w: 2.5, h: snR * 0.6, fill: this._darkenColor(scCol, 0.8), stroke: 'none', lineWidth: 0 });
                    // Focus ring
                    data.parts.push({ type: 'rect', x: snL / 2 - 3, y: scopeY - snR * 1.1, w: 2, h: snR * 2.2, fill: this._darkenColor(scCol, 0.7), stroke: 'none', lineWidth: 0, rounded: 0.5 });
                    break;
                }
                case 'holographic': {
                    // Holographic sight - wide view, fast acquisition
                    const hoW = 5 + scSize * 4;
                    const hoH = 4 + scSize * 4;
                    data.parts.push({ type: 'rect', x: -hoW / 2, y: scopeY - hoH, w: hoW, h: hoH, fill: scCol, stroke: this._darkenColor(scCol, 0.6), lineWidth: 0.8 });
                    // Window - anti-reflective
                    data.parts.push({ type: 'rect', x: -hoW / 2 + 1, y: scopeY - hoH + 1, w: hoW - 2, h: hoH - 2, fill: '#1a2a3a', stroke: 'none', lineWidth: 0 });
                    // Side buttons
                    data.parts.push({ type: 'circle', x: -hoW / 2 - 0.8, y: scopeY - hoH * 0.5, r: 0.8, fill: this._darkenColor(scCol, 0.5), stroke: 'none', lineWidth: 0 });
                    data.parts.push({ type: 'circle', x: -hoW / 2 - 0.8, y: scopeY - hoH * 0.75, r: 0.8, fill: this._darkenColor(scCol, 0.5), stroke: 'none', lineWidth: 0 });
                    break;
                }
                default: { // ironsight - basic, reliable
                    // Front sight post
                    const fsH = 3 + bH * 0.1;
                    data.parts.push({ type: 'rect', x: halfBL - 3, y: scopeY - fsH, w: 1.8, h: fsH, fill: frameCol, stroke: this._darkenColor(frameCol, 0.6), lineWidth: 0.3 });
                    // Front sight base
                    data.parts.push({ type: 'rect', x: halfBL - 4, y: scopeY - 1, w: 3.5, h: 1.2, fill: frameCol, stroke: 'none', lineWidth: 0 });
                    // Rear sight - aperture style
                    const rsX = -halfBL + bL * 0.3;
                    data.parts.push({ type: 'rect', x: rsX - 1.2, y: scopeY - 3, w: 1.2, h: 3, fill: frameCol, stroke: 'none', lineWidth: 0 });
                    data.parts.push({ type: 'rect', x: rsX + 2, y: scopeY - 3, w: 1.2, h: 3, fill: frameCol, stroke: 'none', lineWidth: 0 });
                    // Rear sight notch
                    data.parts.push({ type: 'rect', x: rsX - 0.5, y: scopeY - 2.5, w: 3, h: 0.8, fill: frameCol, stroke: 'none', lineWidth: 0 });
                }
            }
        }

        // === TOP RAIL === (Picatinny/Weaver for attachments)
        if (this.gunRailEnabled) {
            const railStart = -halfBL + bL * 0.15;
            const railEnd = halfBL - bL * 0.05;
            const railY = -halfBH - 0.5;
            const railH = 1.5;
            // Rail base
            data.parts.push({ type: 'rect', x: railStart, y: railY - railH, w: railEnd - railStart, h: railH, fill: this._darkenColor(frameCol, 0.85), stroke: 'none', lineWidth: 0 });
            // Picatinny rail notches - standardized spacing
            const notchSpacing = 2.5;
            const notches = Math.floor((railEnd - railStart) / notchSpacing);
            for (let i = 0; i < notches; i++) {
                const nx = railStart + i * notchSpacing + 0.5;
                data.parts.push({ type: 'rect', x: nx, y: railY - railH - 0.3, w: 1.5, h: railH + 0.3, fill: this._darkenColor(frameCol, 0.7), stroke: 'none', lineWidth: 0 });
            }
        }

        // === CAMO PATTERN === (concealment)
        if (this.gunCamoPattern !== 'none') {
            this._applyCamoPattern(data, -halfBL, -halfBH, bL, bH, rng);
        }

        // === WEAR / SCRATCHES === (battle-worn appearance)
        if (this.gunWearAmount > 0.1) {
            const wearAmt = this._applyGunVariation(this.gunWearAmount, varRng, 'parts');
            const scratches = Math.floor(wearAmt * 10);
            for (let i = 0; i < scratches; i++) {
                const sx = -halfBL + rng() * bL;
                const sy = -halfBH + rng() * bH;
                const sLen = 1.5 + rng() * 4;
                const sAngle = rng() * 0.5 - 0.25;
                data.parts.push({ type: 'line', x1: sx, y1: sy, x2: sx + sLen, y2: sy + sLen * sAngle, stroke: this._lightenColor(frameCol, 1.3 + rng() * 0.3), lineWidth: 0.25 + rng() * 0.35 });
            }
            // Worn edges
            if (wearAmt > 0.5) {
                data.parts.push({ type: 'line', x1: -halfBL, y1: -halfBH, x2: -halfBL + bL * 0.1, y2: -halfBH, stroke: this._lightenColor(frameCol, 1.4), lineWidth: 0.4 });
                data.parts.push({ type: 'line', x1: halfBL - bL * 0.1, y1: halfBH, x2: halfBL, y2: halfBH, stroke: this._lightenColor(frameCol, 1.4), lineWidth: 0.4 });
            }
        }

        // === DECAL === (custom markings)
        if (this.gunDecalEnabled) {
            const decX = -halfBL + bL * 0.3;
            const decalColor = useStyleColors ? accentCol : this._applyColorVariation(this.gunDecalColor, varRng);
            // Primary stripe
            data.parts.push({ type: 'line', x1: decX, y1: -halfBH * 0.5, x2: decX + bL * 0.15, y2: -halfBH * 0.5, stroke: decalColor, lineWidth: 1.8 });
            // Secondary accent
            data.parts.push({ type: 'line', x1: decX + bL * 0.02, y1: halfBH * 0.3, x2: decX + bL * 0.12, y2: halfBH * 0.3, stroke: decalColor, lineWidth: 1 });
            // Small detail marks
            data.parts.push({ type: 'circle', x: decX + bL * 0.18, y: -halfBH * 0.5, r: 1, fill: 'none', stroke: decalColor, lineWidth: 0.6 });
        }

        // === SCI-FI GLOW ===
        if (this.gunGlowEnabled || (useStyleColors && (genStyle === 'crystal' || genStyle === 'dark'))) {
            const activeGlow = useStyleColors ? glowCol : this.gunGlowColor;
            // Glow line along receiver
            data.parts.push({ type: 'line', x1: -halfBL + 2, y1: 0, x2: halfBL - 2, y2: 0, stroke: activeGlow, lineWidth: 1, glow: activeGlow });
            // Glow at muzzle
            data.parts.push({ type: 'circle', x: muzzleTip, y: 0, r: barT * 0.8, fill: 'none', stroke: activeGlow, lineWidth: 0.5, glow: activeGlow });
        }

        // === STYLE-SPECIFIC EFFECTS (constrained within item bounds) ===
        if (useStyleColors) {
            // Safe margin to prevent overhang
            const margin = 2;
            const safeMinX = -halfBL + margin;
            const safeMaxX = halfBL - margin;
            const safeMinY = -halfBH + margin;
            const safeMaxY = halfBH - margin;
            
            switch (genStyle) {
                case 'ornate':
                    // Add decorative engravings (well within body)
                    data.parts.push({ type: 'line', x1: safeMinX, y1: -halfBH * 0.4, x2: safeMaxX * 0.6, y2: -halfBH * 0.4, stroke: this._lightenColor(accentCol, 1.2), lineWidth: 0.6 });
                    data.parts.push({ type: 'line', x1: safeMinX, y1: halfBH * 0.4, x2: safeMaxX * 0.6, y2: halfBH * 0.4, stroke: this._lightenColor(accentCol, 1.2), lineWidth: 0.6 });
                    break;
                case 'rusted':
                    // Add rust spots (radius-aware positioning)
                    for (let i = 0; i < 5; i++) {
                        const spotRadius = 1 + rng() * 1.5;
                        // Ensure spot + radius stays within bounds
                        const rx = safeMinX + spotRadius + rng() * (bL - margin * 2 - spotRadius * 2);
                        const ry = safeMinY + spotRadius + rng() * (bH - margin * 2 - spotRadius * 2);
                        data.parts.push({ type: 'circle', x: rx, y: ry, r: spotRadius, fill: '#6b3a0a', stroke: 'none', lineWidth: 0 });
                    }
                    break;
                case 'ancient':
                    // Add patina effect lines (within safe bounds)
                    data.parts.push({ type: 'line', x1: safeMinX, y1: safeMinY * 0.6, x2: safeMaxX, y2: safeMinY * 0.5, stroke: '#556b2f', lineWidth: 0.4 });
                    break;
                case 'nature':
                    // Add vine-like decorations (constrained within body)
                    data.parts.push({ type: 'polyline', points: [
                        { x: -halfBL * 0.4, y: safeMinY * 0.8 },
                        { x: -halfBL * 0.2, y: safeMinY * 0.5 },
                        { x: 0, y: safeMinY * 0.7 },
                        { x: halfBL * 0.25, y: safeMinY * 0.4 }
                    ], stroke: '#4a8a2a', lineWidth: 0.8 });
                    break;
                case 'bone':
                    // Add bone texture lines (within bounds)
                    for (let i = 0; i < 3; i++) {
                        const bx = safeMinX + (i + 0.5) * (bL - margin * 2) * 0.25;
                        data.parts.push({ type: 'line', x1: bx, y1: safeMinY * 0.5, x2: bx + 2, y2: safeMaxY * 0.5, stroke: '#a09878', lineWidth: 0.5 });
                    }
                    break;
            }
        }
    }

    // ==================== GUN GENERATION (TOP-DOWN VIEW - held) ====================

    _generateGunTopDown(data, rng, genStyle, styleColors) {
        // Top-down: X = forward (barrel direction), Y = width
        // We see the top of the gun: barrel is a thin line, body is a rectangle, etc.
        const bL = this.gunBodyLength;
        const bH = this.gunBodyHeight;
        const barL = this.gunBarrelLength;
        const barT = this.gunBarrelThickness;
        const halfBL = bL / 2;
        const bodyTopW = bH * 0.6; // How wide the body looks from top
        
        // Apply style colors if not standard
        const useStyleColors = genStyle && genStyle !== 'standard' && styleColors;
        const frameCol = useStyleColors ? this._blendColors(this.gunFrameColor, styleColors.metal, 0.5) : this.gunFrameColor;
        const barrelCol = useStyleColors ? this._blendColors(this.gunBarrelColor, styleColors.metal, 0.4) : this.gunBarrelColor;
        const gripCol = useStyleColors ? this._blendColors(this.gunGripColor, styleColors.handle, 0.5) : this.gunGripColor;
        const stockCol = useStyleColors ? this._blendColors(this.gunStockColor, styleColors.handle, 0.4) : this.gunStockColor;
        const glowCol = useStyleColors ? styleColors.glow : this.gunGlowColor;
        
        const dark = this._darkenColor(frameCol, 0.6);

        // Stock from top
        if (this.gunStockEnabled) {
            const sL = this.gunStockLength;
            const stockW = bodyTopW * 0.8;
            data.parts.push({ type: 'rect', x: -halfBL - sL, y: -stockW / 2, w: sL, h: stockW, fill: stockCol, stroke: this._darkenColor(stockCol, 0.6), lineWidth: 0.8, rounded: 1 });
        }

        // Body from top
        const topW = bodyTopW;
        data.parts.push({ type: 'rect', x: -halfBL, y: -topW / 2, w: bL, h: topW, fill: frameCol, stroke: dark, lineWidth: 1, rounded: 1 });

        // Rail from top (visible as raised ridge)
        if (this.gunRailEnabled) {
            data.parts.push({ type: 'rect', x: -halfBL + bL * 0.1, y: -topW * 0.12, w: bL * 0.8, h: topW * 0.24, fill: this._darkenColor(frameCol, 0.8), stroke: 'none', lineWidth: 0 });
        }

        // Scope from top
        if (this.gunScopeEnabled) {
            const scSize = this.gunScopeSize;
            const scCol = useStyleColors ? this._blendColors(this.gunScopeColor, styleColors.metal, 0.3) : this.gunScopeColor;
            const scL = 4 + scSize * 8;
            const scW = 2 + scSize * 2;
            data.parts.push({ type: 'rect', x: -scL / 2, y: -scW / 2, w: scL, h: scW, fill: scCol, stroke: this._darkenColor(scCol, 0.5), lineWidth: 0.6, rounded: scW * 0.3 });
        }

        // Barrel from top
        const barrelW = barT * 0.7;
        const barrelEnd = halfBL + barL;
        data.parts.push({ type: 'rect', x: halfBL, y: -barrelW / 2, w: barL, h: barrelW, fill: barrelCol, stroke: this._darkenColor(barrelCol, 0.6), lineWidth: 0.6 });

        // Muzzle device from top
        if (this.gunMuzzleDevice !== 'none') {
            const mC = useStyleColors ? this._blendColors(this.gunMuzzleColor, styleColors.metal, 0.3) : this.gunMuzzleColor;
            const mdW = barrelW * 1.5;
            let mdL = 4;
            if (this.gunMuzzleDevice === 'suppressor') mdL = 12;
            data.parts.push({ type: 'rect', x: barrelEnd, y: -mdW / 2, w: mdL, h: mdW, fill: mC, stroke: this._darkenColor(mC, 0.6), lineWidth: 0.6, rounded: 1 });
        }

        // Grip from top (just a small rectangle sticking out sideways)
        const gripX = -halfBL + bL * this.gunGripPosition;
        data.parts.push({ type: 'rect', x: gripX - 1.5, y: topW / 2, w: 3, h: 2, fill: gripCol, stroke: this._darkenColor(gripCol, 0.6), lineWidth: 0.5 });

        // Foregrip from top
        if (this.gunForegripEnabled) {
            const fgX = halfBL - bL * this.gunForegripPosition;
            const fgCol = useStyleColors ? this._blendColors(this.gunForegripColor, styleColors.handle, 0.4) : this.gunForegripColor;
            data.parts.push({ type: 'rect', x: fgX - 1, y: topW / 2, w: 2, h: 2, fill: fgCol, stroke: this._darkenColor(fgCol, 0.5), lineWidth: 0.4 });
        }

        // Magazine from top
        if (this.gunMagazineStyle !== 'internal' && this.gunMagazineStyle !== 'tube') {
            const magX = -halfBL + bL * this.gunMagazinePosition;
            const magW = 2 + this.gunMagazineSize * 3;
            const magCol = useStyleColors ? this._blendColors(this.gunMagazineColor, styleColors.metal, 0.3) : this.gunMagazineColor;
            if (this.gunMagazineStyle === 'drum') {
                data.parts.push({ type: 'circle', x: magX, y: topW / 2 + magW, r: magW, fill: magCol, stroke: this._darkenColor(magCol, 0.5), lineWidth: 0.6 });
            } else {
                data.parts.push({ type: 'rect', x: magX - 1.5, y: topW / 2, w: 3, h: magW, fill: magCol, stroke: this._darkenColor(magCol, 0.5), lineWidth: 0.5 });
            }
        }

        // Glow from top
        if (this.gunGlowEnabled || (useStyleColors && (genStyle === 'crystal' || genStyle === 'dark'))) {
            data.parts.push({ type: 'line', x1: -halfBL + 2, y1: 0, x2: halfBL - 2, y2: 0, stroke: glowCol, lineWidth: 0.8, glow: glowCol });
        }

        // Bore at muzzle
        const tip = this.gunMuzzleDevice !== 'none' ? barrelEnd + (this.gunMuzzleDevice === 'suppressor' ? 12 : 4) : barrelEnd;
        data.parts.push({ type: 'circle', x: tip, y: 0, r: barrelW * 0.4, fill: '#111111', stroke: 'none', lineWidth: 0 });
    }

    // ==================== CAMO PATTERN HELPER ====================

    _applyCamoPattern(data, x, y, w, h, rng) {
        const cc = this.gunCamoColor;
        const cc2 = this._darkenColor(cc, 0.7);
        switch (this.gunCamoPattern) {
            case 'stripes': {
                for (let i = 0; i < 4; i++) {
                    const sy = y + h * 0.15 + i * h * 0.2;
                    const sw = w * (0.3 + rng() * 0.4);
                    const sx = x + rng() * (w - sw);
                    data.parts.push({ type: 'rect', x: sx, y: sy, w: sw, h: h * 0.12, fill: cc, stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'digital': {
                const cellSize = 2;
                for (let i = 0; i < 12; i++) {
                    const cx = x + rng() * w;
                    const cy = y + rng() * h;
                    data.parts.push({ type: 'rect', x: cx, y: cy, w: cellSize, h: cellSize, fill: rng() > 0.5 ? cc : cc2, stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'woodland': {
                for (let i = 0; i < 6; i++) {
                    const blobX = x + rng() * w;
                    const blobY = y + rng() * h;
                    const blobR = 1.5 + rng() * 2.5;
                    data.parts.push({ type: 'ellipse', x: blobX, y: blobY, rx: blobR * (1 + rng()), ry: blobR, fill: rng() > 0.5 ? cc : cc2, stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'dots': {
                for (let i = 0; i < 10; i++) {
                    data.parts.push({ type: 'circle', x: x + rng() * w, y: y + rng() * h, r: 0.5 + rng(), fill: rng() > 0.5 ? cc : cc2, stroke: 'none', lineWidth: 0 });
                }
                break;
            }
            case 'hex': {
                for (let i = 0; i < 8; i++) {
                    const hx = x + rng() * w;
                    const hy = y + rng() * h;
                    const hr = 1.5 + rng();
                    const pts = [];
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2;
                        pts.push({ x: hx + Math.cos(a) * hr, y: hy + Math.sin(a) * hr });
                    }
                    data.parts.push({ type: 'polygon', points: pts, fill: rng() > 0.5 ? cc : cc2, stroke: 'none', lineWidth: 0 });
                }
                break;
            }
        }
    }

    // ==================== FOREGRIP POSITION HELPERS ====================

    /**
     * Get foregrip offset in local item space
     * @returns {{x: number, y: number}}
     */
    getForegripLocalOffset() {
        if (!this.gunForegripEnabled) return null;
        const halfBL = this.gunBodyLength / 2;
        const fgX = halfBL - this.gunBodyLength * this.gunForegripPosition;
        return { x: fgX, y: 0 };
    }

    /**
     * Get foregrip position in world space (relative to item origin, before world transform)
     * Used by ProceduralCreature to position the off-hand
     * @returns {{x: number, y: number}}
     */
    getForegripWorldOffset() {
        const local = this.getForegripLocalOffset();
        if (!local) return null;
        return local; // In item-local space; creature transforms to world
    }

    /**
     * Get foregrip position in world space
     * @returns {{x: number, y: number}|null}
     */
    getForegripWorldPosition() {
        if (!this.gunForegripEnabled || !this.isHeld) return null;
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const local = this.getForegripLocalOffset();
        if (!local) return null;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: pos.x + local.x * cos - local.y * sin,
            y: pos.y + local.x * sin + local.y * cos
        };
    }

    // ==================== MUZZLE POSITION ====================

    /**
     * Get the muzzle tip position in world space
     * @returns {{x: number, y: number}}
     */
    getMuzzleWorldPosition() {
        const pos = this.gameObject.position;
        const angle = (this.gameObject.angle || 0) * Math.PI / 180;
        const halfBL = this.gunBodyLength / 2;
        let muzzleLocalX = halfBL + this.gunBarrelLength + this.projectileSpawnOffset;
        if (this.gunMuzzleDevice === 'suppressor') muzzleLocalX += 12;
        else if (this.gunMuzzleDevice !== 'none') muzzleLocalX += 4;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: pos.x + muzzleLocalX * cos,
            y: pos.y + muzzleLocalX * sin
        };
    }

    // ==================== PROJECTILE FIRING ====================

    /**
     * Fire a projectile from this gun.
     * Creates an instance of projectilePrefab at the muzzle position,
     * sets its angle to match the gun, and applies recoil to the holding arm.
     * If projectileInstantHit is true, performs hitscan raycast instead.
     * @returns {Object|null} The created projectile instance, or null (for instant hit: returns hit target or true)
     */
    fireProjectile() {
        if (this.itemType !== 'gun') return null;
        if (this._fireCooldown > 0) return null;
        if (this._isReloading) return null;

        // Check ammo (0 = unlimited)
        if (this.maxAmmo > 0) {
            if (this.currentAmmo <= 0) {
                // Out of ammo - start reload
                this.startReload();
                return null;
            }
            // Consume ammo
            this.currentAmmo--;
        }

        const _engine = this.gameObject._engine;
        if (!_engine) return null;

        // Get muzzle position and angle
        const muzzle = this.getMuzzleWorldPosition();
        const angle = (this.gameObject.angle || 0);
        const angleRad = angle * Math.PI / 180;

        let result = null;

        // === INSTANT HIT (HITSCAN) MODE ===
        if (this.projectileInstantHit) {
            result = this._fireInstantHit(muzzle, angleRad, _engine);
        }
        // === PROJECTILE MODE ===
        else {
            if (!this.projectilePrefab) return null;
            result = this._fireProjectileSpawn(muzzle, angle, angleRad, _engine);
        }

        // Apply recoil
        this._recoilCurrent = this.recoilAmount;
        this._recoilAngleCurrent = this.recoilRotation;
        this._fireCooldown = 1.0 / this.fireRate;
        this._muzzleFlashTimer = 0.06; // Brief flash

        // Spawn muzzle flash particles
        this._spawnMuzzleParticles();

        // Push holding arm back (recoil force on the arm itself)
        if (this.isHeld && this._holder && this._holdingArmIndex >= 0) {
            const holder = this._holder;
            if (holder._arms && holder._arms[this._holdingArmIndex]) {
                const arm = holder._arms[this._holdingArmIndex];
                const recoilAngle = ((this.gameObject.angle || 0) + 180) * Math.PI / 180;
                // armKickback: how much the arm physically moves backward
                const kickbackAmount = this.recoilAmount * this.recoilArmKickback;
                if (arm.currentHandPos) {
                    arm.currentHandPos.x += Math.cos(recoilAngle) * kickbackAmount;
                    arm.currentHandPos.y += Math.sin(recoilAngle) * kickbackAmount;
                }
                // Also add velocity impulse so the spring physics carries the recoil
                if (arm.handVelocity) {
                    arm.handVelocity.x += Math.cos(recoilAngle) * this.recoilAmount * 2;
                    arm.handVelocity.y += Math.sin(recoilAngle) * this.recoilAmount * 2;
                }
            }
        }

        // Auto-reload when magazine is empty (for automatic weapons)
        if (this.maxAmmo > 0 && this.currentAmmo <= 0) {
            this.startReload();
        }

        return result;
    }

    /**
     * Start the reload process
     */
    startReload() {
        if (this._isReloading) return;
        if (this.maxAmmo <= 0) return; // Unlimited ammo, no reload needed
        if (this.currentAmmo >= this.maxAmmo) return; // Already at full ammo
        
        this._isReloading = true;
        this._reloadTimer = this.reloadTime;
        this._triggerHeld = false; // Release trigger during reload
        
        // Trigger arm reload animation if held by a creature
        if (this.isHeld && this._holder && this._holdingArmIndex >= 0) {
            const holder = this._holder;
            if (holder._arms && holder._arms[this._holdingArmIndex]) {
                const arm = holder._arms[this._holdingArmIndex];
                // Set arm to a reload state - pull arm back toward body
                arm._reloadingGun = true;
                arm._reloadProgress = 0;
            }
        }
    }

    /**
     * Complete the reload - refill ammo
     */
    finishReload() {
        this._isReloading = false;
        this._reloadTimer = 0;
        this.currentAmmo = this.maxAmmo;
        
        // End arm reload animation
        if (this.isHeld && this._holder && this._holdingArmIndex >= 0) {
            const holder = this._holder;
            if (holder._arms && holder._arms[this._holdingArmIndex]) {
                const arm = holder._arms[this._holdingArmIndex];
                arm._reloadingGun = false;
                arm._reloadProgress = 0;
            }
        }
    }

    /**
     * Check if currently reloading
     * @returns {boolean}
     */
    isReloading() {
        return this._isReloading;
    }

    /**
     * Get reload progress (0 to 1)
     * @returns {number}
     */
    getReloadProgress() {
        if (!this._isReloading || this.reloadTime <= 0) return 0;
        return 1 - (this._reloadTimer / this.reloadTime);
    }

    /**
     * Fire instant hit (hitscan) - raycast from muzzle to find target
     * @private
     */
    _fireInstantHit(muzzle, angleRad, _engine) {
        const dirX = Math.cos(angleRad);
        const dirY = Math.sin(angleRad);
        const maxRange = this.instantHitRange || 1000;

        // Get the holder's targeting system to find the intended target
        const holder = this._holder;
        let intendedTarget = null;
        
        // Check if holder has a targeting target (AI creatures)
        if (holder && holder._targetingTarget) {
            intendedTarget = holder._targetingTarget;
        }
        // Check if holder has point target for the arm (player controller)
        else if (holder && holder._arms && this._holdingArmIndex >= 0) {
            const arm = holder._arms[this._holdingArmIndex];
            if (arm && arm._pointTarget) {
                // Find creature at that point
                intendedTarget = this._findCreatureAtPoint(arm._pointTarget.x, arm._pointTarget.y, _engine);
            }
        }

        // If we have an intended target, check if it's in range and in the firing line
        if (intendedTarget && intendedTarget.position) {
            const targetPos = intendedTarget.getWorldPosition ? intendedTarget.getWorldPosition() : intendedTarget.position;
            const dx = targetPos.x - muzzle.x;
            const dy = targetPos.y - muzzle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= maxRange) {
                // Check if target is roughly in the direction we're firing (within ~30 degrees)
                const toTargetAngle = Math.atan2(dy, dx);
                let angleDiff = toTargetAngle - angleRad;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) < Math.PI / 6) { // ~30 degrees tolerance
                    // Check if there's a collider blocking the shot to this target
                    if (!this._isLineOfSightBlocked(muzzle, dist, dirX, dirY)) {
                        // Line of sight clear - hit the target!
                        return this._applyInstantHitDamage(intendedTarget, muzzle, dirX, dirY, dist);
                    }
                    // Else: shot blocked by collider, fall through to general raycast
                }
            }
        }

        // Raycast to find any ProceduralCreature in the line of fire
        const hitTarget = this._raycastForCreature(muzzle, dirX, dirY, maxRange, _engine);
        if (hitTarget) {
            const targetPos = hitTarget.obj.getWorldPosition ? hitTarget.obj.getWorldPosition() : hitTarget.obj.position;
            return this._applyInstantHitDamage(hitTarget.obj, muzzle, dirX, dirY, hitTarget.dist);
        }

        return true; // Fired but missed
    }

    /**
     * Check if line of sight is blocked by a collider
     * @param {Object} origin - {x, y} starting point
     * @param {number} targetDist - Distance to target
     * @param {number} dirX - Normalized direction X
     * @param {number} dirY - Normalized direction Y
     * @returns {boolean} true if blocked by a collider
     * @private
     */
    _isLineOfSightBlocked(origin, targetDist, dirX, dirY) {
        if (typeof Raycaster === 'undefined') return false;
        
        const raycaster = new Raycaster();
        raycaster.ignoreTriggers = true;
        raycaster.includeMatter = false;
        
        const holderObj = this._holder?.gameObject;
        
        // Cast ray up to the target distance
        const hits = raycaster.castAllDir(origin.x, origin.y, dirX, dirY, targetDist, '');
        
        for (let i = 0; i < hits.length; i++) {
            const hit = hits[i];
            if (!hit.gameObject) continue;
            if (hit.gameObject === this.gameObject) continue;
            if (hit.gameObject === holderObj) continue;
            if (hit.collider && hit.collider.isTrigger) continue;
            
            // Found a blocking collider before the target
            return true;
        }
        
        return false;
    }

    /**
     * Find a creature at or near the given point
     * @private
     */
    _findCreatureAtPoint(x, y, _engine) {
        const instances = _engine.instances;
        if (!instances) return null;

        let nearest = null;
        let nearestDistSq = 50 * 50; // 50 pixel tolerance

        for (const obj of instances) {
            if (obj === this.gameObject) continue;
            if (obj === this._holder?.gameObject) continue;

            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature || creature.isDead) continue;

            const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            if (!pos) continue;

            const dx = pos.x - x;
            const dy = pos.y - y;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = obj;
            }
        }

        return nearest;
    }

    /**
     * Raycast from origin in direction to find first creature hit.
     * Also checks for BoxCollider, SphereCollider, PolygonCollider and other creatures blocking the shot.
     * Uses the engine's Raycaster for efficient collision detection with AABB broadphase.
     * @private
     */
    _raycastForCreature(origin, dirX, dirY, maxRange, _engine) {
        const instances = _engine.instances;
        if (!instances) return null;

        let closestCreature = null;
        let closestDist = maxRange;
        
        // Get the holder's gameObject to exclude from collision checks
        const holderObj = this._holder?.gameObject;
        
        // === STEP 1: Check for colliders blocking the shot using Raycaster (efficient) ===
        let colliderBlockDist = maxRange;
        if (typeof Raycaster !== 'undefined') {
            const raycaster = new Raycaster();
            raycaster.ignoreTriggers = true; // Don't block on triggers
            raycaster.includeMatter = false; // Skip Matter.js for speed (optional)
            
            // Cast ray to find all collider hits sorted by distance
            const colliderHits = raycaster.castAllDir(origin.x, origin.y, dirX, dirY, maxRange, '');
            
            // Find the closest blocking collider (not the holder or the gun itself)
            for (let i = 0; i < colliderHits.length; i++) {
                const hit = colliderHits[i];
                if (!hit.gameObject) continue;
                
                // Skip the gun itself and the holder
                if (hit.gameObject === this.gameObject) continue;
                if (hit.gameObject === holderObj) continue;
                
                // Skip triggers (should already be filtered but double-check)
                if (hit.collider && hit.collider.isTrigger) continue;
                
                // Found a blocking collider
                colliderBlockDist = hit.distance;
                break; // First non-excluded hit is the closest
            }
        }

        // === STEP 2: Check for creatures in the line of fire ===
        for (const obj of instances) {
            if (obj === this.gameObject) continue;
            if (obj === holderObj) continue;

            const creature = obj.getModule ? obj.getModule('ProceduralCreature') : null;
            if (!creature || creature.isDead) continue;

            const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            if (!pos) continue;

            // Calculate closest point on ray to this creature
            const dx = pos.x - origin.x;
            const dy = pos.y - origin.y;

            // Project creature position onto ray
            const dot = dx * dirX + dy * dirY;
            if (dot < 0 || dot > maxRange) continue; // Behind or too far

            // Find closest point on ray to creature center
            const closestOnRayX = origin.x + dirX * dot;
            const closestOnRayY = origin.y + dirY * dot;

            // Distance from ray to creature center
            const perpDx = pos.x - closestOnRayX;
            const perpDy = pos.y - closestOnRayY;
            const perpDist = Math.sqrt(perpDx * perpDx + perpDy * perpDy);

            // Hit radius - use creature's head size as approximate hitbox
            const hitRadius = (creature.headSize || 20) * (creature.creatureScale || 1);

            if (perpDist <= hitRadius && dot < closestDist) {
                closestDist = dot;
                closestCreature = { obj: obj, dist: dot, creature: creature };
            }
        }

        // === STEP 3: Determine if shot is blocked by a collider before reaching creature ===
        if (closestCreature) {
            // If a collider is closer than the creature, the shot is blocked
            if (colliderBlockDist < closestCreature.dist) {
                // Shot blocked by collider - return null (miss)
                return null;
            }
            return closestCreature;
        }

        return null;
    }

    /**
     * Apply instant hit damage to a target
     * @private
     */
    _applyInstantHitDamage(targetObj, muzzle, dirX, dirY, dist) {
        const creature = targetObj.getModule ? targetObj.getModule('ProceduralCreature') : null;
        if (!creature) return null;

        // Apply damage
        if (typeof creature.takeDamage === 'function') {
            creature.takeDamage(this.damage, this._holder?.gameObject || this.gameObject);
        } else if (typeof creature.health !== 'undefined') {
            creature.health -= this.damage;
            creature._lastDamageSource = this._holder?.gameObject || this.gameObject;
            creature._lastDamageTime = performance.now() / 1000;
        }

        // Apply knockback with wall collision check
        if (this.knockback > 0 && targetObj.position) {
            const knockbackX = dirX * this.knockback * 0.3;
            const knockbackY = dirY * this.knockback * 0.3;
            
            // Check for wall collisions before applying knockback
            const knockbackCollision = creature._checkKnockbackCollision ? 
                creature._checkKnockbackCollision(knockbackX * 3, knockbackY * 3) : null;
            if (knockbackCollision) {
                targetObj.position.x += knockbackX * knockbackCollision.multiplierX;
                targetObj.position.y += knockbackY * knockbackCollision.multiplierY;
            } else {
                targetObj.position.x += knockbackX;
                targetObj.position.y += knockbackY;
            }
        }

        // Log hit for debugging
        console.log(`[Gun] Instant hit: ${targetObj.name || 'target'} at ${Math.round(dist)}px for ${this.damage} damage`);

        return targetObj;
    }

    /**
     * Fire projectile (spawn prefab) - original projectile behavior
     * @private
     */
    _fireProjectileSpawn(muzzle, angle, angleRad, _engine) {
        // Create projectile instance
        let projectile = null;
        if (typeof _engine.instanceCreate === 'function') {
            projectile = _engine.instanceCreate(this.projectilePrefab, muzzle.x, muzzle.y);
        } else if (typeof window.instanceCreate === 'function') {
            projectile = window.instanceCreate(this.projectilePrefab, muzzle.x, muzzle.y);
        }

        if (projectile) {
            // Set projectile angle to match gun
            projectile.angle = angle;

            // Check for an existing Projectile or Bullet module
            let projMod = null;
            if (projectile.getModule) {
                projMod = projectile.getModule('Projectile') || projectile.getModule('Bullet');
            }

            // If no Projectile module found, auto-add one
            if (!projMod && typeof Projectile !== 'undefined' && projectile.addModule) {
                projMod = new Projectile();
                projectile.addModule(projMod);
            }

            // Configure the projectile module
            if (projMod) {
                if (typeof projMod.speed !== 'undefined') projMod.speed = this.projectileSpeed;
                if (typeof projMod.angle !== 'undefined') projMod.angle = angle;
                if (typeof projMod.direction !== 'undefined') {
                    projMod.direction = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
                }
                // Start it if the engine is running and it wasn't started yet
                if (projMod.gameObject && projMod.gameObject._engine && projMod.gameObject._engine.isRunning && !projMod._started) {
                    projMod.start();
                    projMod._started = true;
                }
            }

            // Fallback: set velocity directly on gameObject if available
            if (projectile.velocity) {
                projectile.velocity.x = Math.cos(angleRad) * this.projectileSpeed;
                projectile.velocity.y = Math.sin(angleRad) * this.projectileSpeed;
            }
        }

        return projectile;
    }

    // ==================== MUZZLE FLASH ====================

    _drawMuzzleFlash(ctx) {
        const halfBL = this.gunBodyLength / 2;
        let muzzleX = halfBL + this.gunBarrelLength;
        if (this.gunMuzzleDevice === 'suppressor') muzzleX += 12;
        else if (this.gunMuzzleDevice !== 'none') muzzleX += 4;

        const flashSize = this.gunMuzzleFlashSize * 6;
        const t = this._muzzleFlashTimer / 0.06; // 0-1, fading
        const alpha = t * 0.9;
        const flashCol = this.gunMuzzleFlashColor;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer glow
        ctx.fillStyle = flashCol;
        ctx.shadowColor = flashCol;
        ctx.shadowBlur = flashSize * 2;
        ctx.beginPath();
        ctx.ellipse(muzzleX + flashSize * 0.3, 0, flashSize * 1.2, flashSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner white core
        ctx.fillStyle = '#ffffcc';
        ctx.shadowBlur = flashSize;
        ctx.beginPath();
        ctx.ellipse(muzzleX + flashSize * 0.1, 0, flashSize * 0.5, flashSize * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ==================== COLOR UTILITIES ====================

    _darkenColor(color, factor) {
        if (!color || typeof color !== 'string') return '#000000';
        const hex = color.replace('#', '');
        if (hex.length !== 6) return color;
        const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
        const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
        return '#' + [r, g, b].map(v => {
            const h = Math.max(0, Math.min(255, v)).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    _lightenColor(color, factor) {
        if (!color || typeof color !== 'string') return '#ffffff';
        const hex = color.replace('#', '');
        if (hex.length !== 6) return color;
        const r = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * factor));
        const g = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * factor));
        const b = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * factor));
        return '#' + [r, g, b].map(v => {
            const h = Math.max(0, Math.min(255, v)).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    _blendColors(c1, c2, t) {
        const hex1 = c1.replace('#', '');
        const hex2 = c2.replace('#', '');
        if (hex1.length !== 6 || hex2.length !== 6) return c1;
        const r = Math.round(parseInt(hex1.substring(0, 2), 16) * (1 - t) + parseInt(hex2.substring(0, 2), 16) * t);
        const g = Math.round(parseInt(hex1.substring(2, 4), 16) * (1 - t) + parseInt(hex2.substring(2, 4), 16) * t);
        const b = Math.round(parseInt(hex1.substring(4, 6), 16) * (1 - t) + parseInt(hex2.substring(4, 6), 16) * t);
        return '#' + [r, g, b].map(v => {
            const h = Math.max(0, Math.min(255, v)).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    // ==================== SERIALIZATION ====================

    toJSON() {
        const json = super.toJSON();
        json.type = 'ProceduralCreatureItem';
        json.enabled = this.enabled;
        json.itemName = this.itemName;
        json.itemType = this.itemType;
        json.handleOffsetX = this.handleOffsetX;
        json.handleOffsetY = this.handleOffsetY;
        json.autoOffsetToGrip = this.autoOffsetToGrip;
        json.holdingAngleOffset = this.holdingAngleOffset;
        json.swingAngleOffset = this.swingAngleOffset;
        json.swingSpeed = this.swingSpeed;
        json.itemDepthPosition = this.itemDepthPosition;
        json.weight = this.weight;
        json.weightBalance = this.weightBalance;
        json.itemWidth = this.itemWidth;
        json.itemLength = this.itemLength;
        json.itemColor = this.itemColor;
        json.handleColor = this.handleColor;
        json.handleLength = this.handleLength;
        json.showHandle = this.showHandle;
        json.drawGeneratedItem = this.drawGeneratedItem;
        json.generationSeed = this.generationSeed;
        json.generationStyle = this.generationStyle;
        json.generationSubType = this.generationSubType;
        json.genBladeDetail = this.genBladeDetail;
        json.genCurvature = this.genCurvature;
        json.genSerration = this.genSerration;
        json.genPommelSize = this.genPommelSize;
        json.genGuardWidth = this.genGuardWidth;
        json.genAccentColor = this.genAccentColor;
        json.genGemColor = this.genGemColor;
        json.genShowGem = this.genShowGem;
        json.genPatternType = this.genPatternType;
        json.canBePickedUp = this.canBePickedUp;
        json.autoPickup = this.autoPickup;
        json.pickupRange = this.pickupRange;
        json.damage = this.damage;
        json.thrownDamage = this.thrownDamage;
        json.knockback = this.knockback;
        json.attackRange = this.attackRange;
        json.twoHanded = this.twoHanded;

        // Spark collision effects
        json.sparkOnCollision = this.sparkOnCollision;
        json.sparkParticleCount = this.sparkParticleCount;
        json.sparkParticleSpeed = this.sparkParticleSpeed;
        json.sparkParticleSpeedVariance = this.sparkParticleSpeedVariance;
        json.sparkParticleLifetime = this.sparkParticleLifetime;
        json.sparkParticleLifetimeVariance = this.sparkParticleLifetimeVariance;
        json.sparkParticleSpreadAngle = this.sparkParticleSpreadAngle;
        json.sparkParticleSizeStart = this.sparkParticleSizeStart;
        json.sparkParticleSizeEnd = this.sparkParticleSizeEnd;
        json.sparkParticleColorStart = this.sparkParticleColorStart;
        json.sparkParticleColorEnd = this.sparkParticleColorEnd;
        json.sparkParticleGravity = this.sparkParticleGravity;
        json.sparkParticleFadeOut = this.sparkParticleFadeOut;
        json.sparkMinVelocity = this.sparkMinVelocity;
        json.sparkCooldown = this.sparkCooldown;

        // Gun properties
        json.gunSubType = this.gunSubType;
        json.gunBodyLength = this.gunBodyLength;
        json.gunBodyHeight = this.gunBodyHeight;
        json.gunFrameColor = this.gunFrameColor;
        json.gunFrameStyle = this.gunFrameStyle;
        json.gunBarrelLength = this.gunBarrelLength;
        json.gunBarrelThickness = this.gunBarrelThickness;
        json.gunBarrelColor = this.gunBarrelColor;
        json.gunBarrelStyle = this.gunBarrelStyle;
        json.gunBarrelTaper = this.gunBarrelTaper;
        json.gunStockEnabled = this.gunStockEnabled;
        json.gunStockLength = this.gunStockLength;
        json.gunStockStyle = this.gunStockStyle;
        json.gunStockColor = this.gunStockColor;
        json.gunStockDrop = this.gunStockDrop;
        json.gunGripStyle = this.gunGripStyle;
        json.gunGripLength = this.gunGripLength;
        json.gunGripAngle = this.gunGripAngle;
        json.gunGripColor = this.gunGripColor;
        json.gunGripPosition = this.gunGripPosition;
        json.gunForegripEnabled = this.gunForegripEnabled;
        json.gunForegripStyle = this.gunForegripStyle;
        json.gunForegripPosition = this.gunForegripPosition;
        json.gunForegripColor = this.gunForegripColor;
        json.gunMagazineStyle = this.gunMagazineStyle;
        json.gunMagazinePosition = this.gunMagazinePosition;
        json.gunMagazineSize = this.gunMagazineSize;
        json.gunMagazineColor = this.gunMagazineColor;
        json.gunScopeEnabled = this.gunScopeEnabled;
        json.gunScopeStyle = this.gunScopeStyle;
        json.gunScopeSize = this.gunScopeSize;
        json.gunScopeColor = this.gunScopeColor;
        json.gunMuzzleDevice = this.gunMuzzleDevice;
        json.gunMuzzleColor = this.gunMuzzleColor;
        json.gunRailEnabled = this.gunRailEnabled;
        json.gunCamoPattern = this.gunCamoPattern;
        json.gunCamoColor = this.gunCamoColor;
        json.gunWearAmount = this.gunWearAmount;
        json.gunDecalColor = this.gunDecalColor;
        json.gunDecalEnabled = this.gunDecalEnabled;
        json.gunGlowEnabled = this.gunGlowEnabled;
        json.gunGlowColor = this.gunGlowColor;
        json.gunMuzzleFlashSize = this.gunMuzzleFlashSize;
        json.gunMuzzleFlashColor = this.gunMuzzleFlashColor;

        // Projectile & Recoil
        json.projectilePrefab = this.projectilePrefab;
        json.projectileSpeed = this.projectileSpeed;
        json.projectileSpawnOffset = this.projectileSpawnOffset;
        json.fireRate = this.fireRate;
        json.recoilAmount = this.recoilAmount;
        json.recoilRecoverySpeed = this.recoilRecoverySpeed;
        json.recoilRotation = this.recoilRotation;
        json.recoilArmKickback = this.recoilArmKickback;

        // Ammo & Reload
        json.maxAmmo = this.maxAmmo;
        json.reloadTime = this.reloadTime;
        json.currentAmmo = this.currentAmmo;

        // Fire mode
        json.fireMode = this.fireMode;

        // Muzzle particles
        json.muzzleParticlesEnabled = this.muzzleParticlesEnabled;
        json.muzzleParticleCount = this.muzzleParticleCount;
        json.muzzleParticleSpeed = this.muzzleParticleSpeed;
        json.muzzleParticleSpeedVariance = this.muzzleParticleSpeedVariance;
        json.muzzleParticleLifetime = this.muzzleParticleLifetime;
        json.muzzleParticleLifetimeVariance = this.muzzleParticleLifetimeVariance;
        json.muzzleParticleSpreadAngle = this.muzzleParticleSpreadAngle;
        json.muzzleParticleSizeStart = this.muzzleParticleSizeStart;
        json.muzzleParticleSizeEnd = this.muzzleParticleSizeEnd;
        json.muzzleParticleColorStart = this.muzzleParticleColorStart;
        json.muzzleParticleColorEnd = this.muzzleParticleColorEnd;
        json.muzzleParticleGravity = this.muzzleParticleGravity;
        json.muzzleParticleFadeOut = this.muzzleParticleFadeOut;
        json.muzzleParticleShape = this.muzzleParticleShape;
        json.muzzleParticleSmokeEnabled = this.muzzleParticleSmokeEnabled;
        json.muzzleParticleSmokeColor = this.muzzleParticleSmokeColor;
        json.muzzleParticleSmokeCount = this.muzzleParticleSmokeCount;
        json.muzzleParticleSmokeSize = this.muzzleParticleSmokeSize;
        json.muzzleParticleSmokeLifetime = this.muzzleParticleSmokeLifetime;

        // Random variation settings
        json.enableRandomVariation = this.enableRandomVariation;
        json.variationAmount = this.variationAmount;
        json.variationColorShift = this.variationColorShift;
        json.variationSizeScale = this.variationSizeScale;
        json.variationDetailShift = this.variationDetailShift;
        
        // Gun-specific variation
        json.gunVariationBarrel = this.gunVariationBarrel;
        json.gunVariationParts = this.gunVariationParts;
        json.gunVariationCombat = this.gunVariationCombat;

        // Weapon-specific customization
        json.spearTipSize = this.spearTipSize;
        json.spearTipStyle = this.spearTipStyle;
        json.spearShaftTaper = this.spearShaftTaper;
        json.spearBindingCount = this.spearBindingCount;
        json.axeHeadSize = this.axeHeadSize;
        json.axeHeadStyle = this.axeHeadStyle;
        json.axeHeadCurve = this.axeHeadCurve;
        json.axeSpike = this.axeSpike;
        json.maceHeadSize = this.maceHeadSize;
        json.maceHeadStyle = this.maceHeadStyle;
        json.maceFlangeCount = this.maceFlangeCount;
        json.maceFlangeLength = this.maceFlangeLength;
        json.daggerBladeStyle = this.daggerBladeStyle;
        json.daggerCrossguard = this.daggerCrossguard;
        json.daggerFullerWidth = this.daggerFullerWidth;
        json.hammerHeadLength = this.hammerHeadLength;
        json.hammerHeadStyle = this.hammerHeadStyle;
        json.hammerSpike = this.hammerSpike;

        // Shield customization
        json.shieldBossSize = this.shieldBossSize;
        json.shieldRimWidth = this.shieldRimWidth;
        json.shieldEmblem = this.shieldEmblem;

        // Misc item customization
        json.torchFlameSize = this.torchFlameSize;
        json.potionFillLevel = this.potionFillLevel;
        json.potionBubbles = this.potionBubbles;
        json.keyTeethCount = this.keyTeethCount;
        json.gemFacets = this.gemFacets;
        json.projectileInstantHit = this.projectileInstantHit;
        json.instantHitRange = this.instantHitRange;

        return json;
    }

    static fromJSON(json) {
        const module = new ProceduralCreatureItem();
        module.enabled = json.enabled ?? true;
        module.itemName = json.itemName ?? "Item";
        module.itemType = json.itemType ?? "weapon";
        module.handleOffsetX = json.handleOffsetX ?? 0;
        module.handleOffsetY = json.handleOffsetY ?? 0;
        module.autoOffsetToGrip = json.autoOffsetToGrip ?? true;
        module.holdingAngleOffset = json.holdingAngleOffset ?? 0;
        module.swingAngleOffset = json.swingAngleOffset ?? 90;
        module.swingSpeed = json.swingSpeed ?? 1.0;
        module.itemDepthPosition = json.itemDepthPosition ?? 'below';
        module.weight = json.weight ?? 1.0;
        module.weightBalance = json.weightBalance ?? 0.5;
        module.itemWidth = json.itemWidth ?? 6;
        module.itemLength = json.itemLength ?? 30;
        module.itemColor = json.itemColor ?? "#888888";
        module.handleColor = json.handleColor ?? "#5a4030";
        module.handleLength = json.handleLength ?? 10;
        module.showHandle = json.showHandle ?? true;
        module.drawGeneratedItem = json.drawGeneratedItem ?? false;
        module.generationSeed = json.generationSeed ?? 12345;
        module.generationStyle = json.generationStyle ?? "standard";
        module.generationSubType = json.generationSubType ?? "sword";
        module.genBladeDetail = json.genBladeDetail ?? 0.5;
        module.genCurvature = json.genCurvature ?? 0.0;
        module.genSerration = json.genSerration ?? 0.0;
        module.genPommelSize = json.genPommelSize ?? 0.5;
        module.genGuardWidth = json.genGuardWidth ?? 0.5;
        module.genAccentColor = json.genAccentColor ?? "#c0a040";
        module.genGemColor = json.genGemColor ?? "#ff2040";
        module.genShowGem = json.genShowGem ?? false;
        module.genPatternType = json.genPatternType ?? "none";
        module.canBePickedUp = json.canBePickedUp ?? true;
        module.autoPickup = json.autoPickup ?? false;
        module.pickupRange = json.pickupRange ?? 30;
        module.damage = json.damage ?? 10;
        module.thrownDamage = json.thrownDamage ?? 5;
        module.knockback = json.knockback ?? 50;
        module.attackRange = json.attackRange ?? 0;
        module.twoHanded = json.twoHanded ?? false;

        // Spark collision effects
        module.sparkOnCollision = json.sparkOnCollision ?? false;
        module.sparkParticleCount = json.sparkParticleCount ?? 5;
        module.sparkParticleSpeed = json.sparkParticleSpeed ?? 150;
        module.sparkParticleSpeedVariance = json.sparkParticleSpeedVariance ?? 80;
        module.sparkParticleLifetime = json.sparkParticleLifetime ?? 0.2;
        module.sparkParticleLifetimeVariance = json.sparkParticleLifetimeVariance ?? 0.1;
        module.sparkParticleSpreadAngle = json.sparkParticleSpreadAngle ?? 120;
        module.sparkParticleSizeStart = json.sparkParticleSizeStart ?? 3;
        module.sparkParticleSizeEnd = json.sparkParticleSizeEnd ?? 1;
        module.sparkParticleColorStart = json.sparkParticleColorStart ?? '#ffdd44';
        module.sparkParticleColorEnd = json.sparkParticleColorEnd ?? '#ff6600';
        module.sparkParticleGravity = json.sparkParticleGravity ?? 200;
        module.sparkParticleFadeOut = json.sparkParticleFadeOut ?? true;
        module.sparkMinVelocity = json.sparkMinVelocity ?? 50;
        module.sparkCooldown = json.sparkCooldown ?? 0.03;

        // Gun properties
        module.gunSubType = json.gunSubType ?? "pistol";
        module.gunBodyLength = json.gunBodyLength ?? 30;
        module.gunBodyHeight = json.gunBodyHeight ?? 8;
        module.gunFrameColor = json.gunFrameColor ?? "#333333";
        module.gunFrameStyle = json.gunFrameStyle ?? "angular";
        module.gunBarrelLength = json.gunBarrelLength ?? 20;
        module.gunBarrelThickness = json.gunBarrelThickness ?? 3;
        module.gunBarrelColor = json.gunBarrelColor ?? "#444444";
        module.gunBarrelStyle = json.gunBarrelStyle ?? "standard";
        module.gunBarrelTaper = json.gunBarrelTaper ?? 0.0;
        module.gunStockEnabled = json.gunStockEnabled ?? false;
        module.gunStockLength = json.gunStockLength ?? 18;
        module.gunStockStyle = json.gunStockStyle ?? "fixed";
        module.gunStockColor = json.gunStockColor ?? "#5a4030";
        module.gunStockDrop = json.gunStockDrop ?? 3;
        module.gunGripStyle = json.gunGripStyle ?? "standard";
        module.gunGripLength = json.gunGripLength ?? 8;
        module.gunGripAngle = json.gunGripAngle ?? 15;
        module.gunGripColor = json.gunGripColor ?? "#3a3030";
        module.gunGripPosition = json.gunGripPosition ?? 0.45;
        module.gunForegripEnabled = json.gunForegripEnabled ?? false;
        module.gunForegripStyle = json.gunForegripStyle ?? "vertical";
        module.gunForegripPosition = json.gunForegripPosition ?? 0.15;
        module.gunForegripColor = json.gunForegripColor ?? "#3a3030";
        module.gunMagazineStyle = json.gunMagazineStyle ?? "box";
        module.gunMagazinePosition = json.gunMagazinePosition ?? 0.5;
        module.gunMagazineSize = json.gunMagazineSize ?? 0.5;
        module.gunMagazineColor = json.gunMagazineColor ?? "#2a2a2a";
        module.gunScopeEnabled = json.gunScopeEnabled ?? false;
        module.gunScopeStyle = json.gunScopeStyle ?? "ironsight";
        module.gunScopeSize = json.gunScopeSize ?? 0.5;
        module.gunScopeColor = json.gunScopeColor ?? "#222222";
        module.gunMuzzleDevice = json.gunMuzzleDevice ?? "none";
        module.gunMuzzleColor = json.gunMuzzleColor ?? "#555555";
        module.gunRailEnabled = json.gunRailEnabled ?? false;
        module.gunCamoPattern = json.gunCamoPattern ?? "none";
        module.gunCamoColor = json.gunCamoColor ?? "#556b2f";
        module.gunWearAmount = json.gunWearAmount ?? 0.0;
        module.gunDecalColor = json.gunDecalColor ?? "#cc2222";
        module.gunDecalEnabled = json.gunDecalEnabled ?? false;
        module.gunGlowEnabled = json.gunGlowEnabled ?? false;
        module.gunGlowColor = json.gunGlowColor ?? "#00aaff";
        module.gunMuzzleFlashSize = json.gunMuzzleFlashSize ?? 1.0;
        module.gunMuzzleFlashColor = json.gunMuzzleFlashColor ?? "#ffaa22";

        // Projectile & Recoil
        module.projectilePrefab = json.projectilePrefab ?? "";
        module.projectileSpeed = json.projectileSpeed ?? 400;
        module.projectileSpawnOffset = json.projectileSpawnOffset ?? 0;
        module.fireRate = json.fireRate ?? 5;
        module.recoilAmount = json.recoilAmount ?? 8;
        module.recoilRecoverySpeed = json.recoilRecoverySpeed ?? 12;
        module.recoilRotation = json.recoilRotation ?? 5;
        module.recoilArmKickback = json.recoilArmKickback ?? 0.3;

        // Ammo & Reload
        module.maxAmmo = json.maxAmmo ?? 30;
        module.reloadTime = json.reloadTime ?? 2.0;
        module.currentAmmo = json.currentAmmo ?? (json.maxAmmo ?? 30);

        // Fire mode
        module.fireMode = json.fireMode ?? 'single';

        // Muzzle particles
        module.muzzleParticlesEnabled = json.muzzleParticlesEnabled ?? true;
        module.muzzleParticleCount = json.muzzleParticleCount ?? 6;
        module.muzzleParticleSpeed = json.muzzleParticleSpeed ?? 120;
        module.muzzleParticleSpeedVariance = json.muzzleParticleSpeedVariance ?? 60;
        module.muzzleParticleLifetime = json.muzzleParticleLifetime ?? 0.15;
        module.muzzleParticleLifetimeVariance = json.muzzleParticleLifetimeVariance ?? 0.08;
        module.muzzleParticleSpreadAngle = json.muzzleParticleSpreadAngle ?? 30;
        module.muzzleParticleSizeStart = json.muzzleParticleSizeStart ?? 3;
        module.muzzleParticleSizeEnd = json.muzzleParticleSizeEnd ?? 1;
        module.muzzleParticleColorStart = json.muzzleParticleColorStart ?? '#ffdd44';
        module.muzzleParticleColorEnd = json.muzzleParticleColorEnd ?? '#ff4400';
        module.muzzleParticleGravity = json.muzzleParticleGravity ?? 0;
        module.muzzleParticleFadeOut = json.muzzleParticleFadeOut ?? true;
        module.muzzleParticleShape = json.muzzleParticleShape ?? 'circle';
        module.muzzleParticleSmokeEnabled = json.muzzleParticleSmokeEnabled ?? false;
        module.muzzleParticleSmokeColor = json.muzzleParticleSmokeColor ?? '#888888';
        module.muzzleParticleSmokeCount = json.muzzleParticleSmokeCount ?? 3;
        module.muzzleParticleSmokeSize = json.muzzleParticleSmokeSize ?? 5;
        module.muzzleParticleSmokeLifetime = json.muzzleParticleSmokeLifetime ?? 0.4;

        // Random variation settings
        module.enableRandomVariation = json.enableRandomVariation ?? false;
        module.variationAmount = json.variationAmount ?? 0.2;
        module.variationColorShift = json.variationColorShift ?? 0.1;
        module.variationSizeScale = json.variationSizeScale ?? 0.1;
        module.variationDetailShift = json.variationDetailShift ?? 0.1;
        
        // Gun-specific variation
        module.gunVariationBarrel = json.gunVariationBarrel ?? 0.2;
        module.gunVariationParts = json.gunVariationParts ?? 0.15;
        module.gunVariationCombat = json.gunVariationCombat ?? 0.1;

        // Weapon-specific customization
        module.spearTipSize = json.spearTipSize ?? 1.0;
        module.spearTipStyle = json.spearTipStyle ?? 'diamond';
        module.spearShaftTaper = json.spearShaftTaper ?? 0.0;
        module.spearBindingCount = json.spearBindingCount ?? 2;
        module.axeHeadSize = json.axeHeadSize ?? 1.0;
        module.axeHeadStyle = json.axeHeadStyle ?? 'single';
        module.axeHeadCurve = json.axeHeadCurve ?? 0.3;
        module.axeSpike = json.axeSpike ?? false;
        module.maceHeadSize = json.maceHeadSize ?? 1.0;
        module.maceHeadStyle = json.maceHeadStyle ?? 'flanged';
        module.maceFlangeCount = json.maceFlangeCount ?? 6;
        module.maceFlangeLength = json.maceFlangeLength ?? 0.5;
        module.daggerBladeStyle = json.daggerBladeStyle ?? 'straight';
        module.daggerCrossguard = json.daggerCrossguard ?? true;
        module.daggerFullerWidth = json.daggerFullerWidth ?? 0.3;
        module.hammerHeadLength = json.hammerHeadLength ?? 1.0;
        module.hammerHeadStyle = json.hammerHeadStyle ?? 'flat';
        module.hammerSpike = json.hammerSpike ?? false;

        // Shield customization
        module.shieldBossSize = json.shieldBossSize ?? 0.3;
        module.shieldRimWidth = json.shieldRimWidth ?? 0.1;
        module.shieldEmblem = json.shieldEmblem ?? 'none';

        // Misc item customization
        module.torchFlameSize = json.torchFlameSize ?? 1.0;
        module.potionFillLevel = json.potionFillLevel ?? 1.0;
        module.potionBubbles = json.potionBubbles ?? 3;
        module.keyTeethCount = json.keyTeethCount ?? 3;
        module.gemFacets = json.gemFacets ?? 6;

        module.projectileInstantHit = json.projectileInstantHit ?? false;
        module.instantHitRange = json.instantHitRange ?? 1000;

        return module;
    }

    clone() {
        return ProceduralCreatureItem.fromJSON(this.toJSON());
    }
}

window.ProceduralCreatureItem = ProceduralCreatureItem;
