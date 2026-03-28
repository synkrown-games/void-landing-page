/**
 * ParticleSystem Module
 * Creates and manages particle effects
 */

class ParticleSystem extends Module {
    constructor() {
        super();
        
        // Editable properties
        this.emissionRate = 10;        // Particles per second
        this.particleLifetime = 2;     // Particle lifetime in seconds
        this.startSpeed = 100;         // Initial particle speed
        this.startSize = 5;            // Initial particle size
        this.endSize = 1;              // Final particle size
        this.startColor = '#ffffff';   // Start color
        this.endColor = '#000000';     // End color
        this.gravity = 0;              // Gravity affecting particles
        this.spread = 360;             // Emission spread in degrees
        this.emissionAngle = -90;      // Base emission direction (degrees, -90 = up)
        this.maxParticles = 100;       // Maximum particle count
        this.autoPlay = true;          // Start emitting on start
        this.looping = true;           // Loop emission (renamed from 'loop' to avoid method conflict)
        this.burst = false;            // Emit all at once
        this.burstCount = 10;          // Number of particles in burst mode
        this.shape = 'circle';         // Particle shape: 'circle', 'square', 'image', 'gradientCircle', 'gradientSquare'
        this.imagePath = '';           // Image for 'image' shape type
        this.fadeOut = true;           // Fade alpha over lifetime
        
        // Gradient properties (for gradientCircle, gradientSquare shapes)
        this.gradientInnerColor = '#ffffff';  // Inner/center color for gradients
        this.gradientOuterColor = '#000000';  // Outer/edge color for gradients
        this.gradientType = 'radial';         // 'radial' or 'linear' (for gradientSquare)
        
        // Blend mode for particles
        this.blendMode = 'source-over';       // Canvas blend mode: 'source-over', 'lighter', 'multiply', 'screen', etc.
        
        this.scaleOverLifetime = true; // Scale from startSize to endSize
        this.rotateParticles = false;  // Rotate particles over lifetime
        this.rotationSpeed = 180;      // Rotation speed in degrees per second
        this.randomRotation = true;    // Random initial rotation
        this.speedVariation = 0.2;     // Speed variation (0-1)
        this.lifetimeVariation = 0.2;  // Lifetime variation (0-1)
        this.emitterWidth = 0;         // Emitter area width (0 = point)
        this.emitterHeight = 0;        // Emitter area height (0 = point)
        
        // Image-specific properties (only used when shape = 'image')
        this.imageWidth = 32;          // Start width for image particles
        this.imageHeight = 32;         // Start height for image particles
        this.endImageWidth = 8;        // End width for image particles
        this.endImageHeight = 8;       // End height for image particles
        this.scaleImageOverLifetime = true; // Scale image dimensions over lifetime
        
        this.useYDepth = true;
        
        // Text-specific properties (only used when shape = 'text')
        this.particleText = '$';       // Characters to use (randomly picks one per particle)
        this.fontSize = 16;            // Font size in pixels
        this.fontFamily = 'Arial, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; // Font family with emoji support
        this.fontWeight = 'bold';      // Font weight
        
        // Wind properties
        this.enableWind = false;                // Enable wind affecting particles
        this.useEnvironmentWind = false;        // React to engine weather wind system
        this.windStrength = 50;                 // Wind force strength (0-100)
        this.windDirection = 0;                 // Wind direction in degrees (0=right, 90=down)
        this.windTurbulence = 0.3;              // Wind turbulence/chaos (0-1)
        this.windResistance = 0.5;              // Particle resistance to wind (0-1, 0=easily blown, 1=heavy)
        
        // Positioning mode
        this.relativePositioning = false; // If true, particles draw relative to game object; if false, particles use world coordinates
        
        // Collision properties
        this.enableCollision = false;     // Enable particle collision with colliders
        this.collisionRadius = 0.2;       // Radius for particle collision detection
        this.collideWithTags = 'solid';   // Comma-separated list of collider tags to check
        this.collisionBounciness = 0.5;   // How much velocity is retained on bounce (0-1)
        this.collisionFriction = 0.1;     // Friction applied on collision (0-1)
        this.destroyOnCollision = false;  // Kill particle on collision
        this.collisionDamping = 0.98;     // Velocity damping after collision (0-1)
        this.colliderCacheInterval = 0.25; // Seconds between collider cache refreshes
        
        // === Advanced Physics ===
        // Force points: attractors & deflectors (positions relative to game object)
        this.enableForcePoints = false;   // Master toggle for force point system
        this.forcePoints = [];            // Array of { x, y, strength, radius, type, falloff }
        
        // Particle drag (air resistance)
        this.drag = 0;                    // Velocity drag coefficient (0 = none, 1 = heavy drag)
        
        // Velocity limits
        this.maxVelocity = 0;             // Max particle speed (0 = unlimited)
        
        // Orbital motion around the emitter origin
        this.orbitalSpeed = 0;            // Angular velocity in degrees/sec around emitter
        
        // Noise-based turbulence (Perlin-like, independent of wind)
        this.enableNoiseTurbulence = false;
        this.noiseStrength = 30;          // Turbulence force strength
        this.noiseScale = 0.01;           // Spatial frequency (smaller = larger swirls)
        this.noiseSpeed = 1;              // How fast the noise field evolves
        
        // Vortex (global rotational force)
        this.vortexStrength = 0;          // Rotational force around emitter (+ = CCW, - = CW)
        
        // GPU Processing & Batching
        this.useGPUProcessing = false;  // Render via GPU shader (WebGL2 instanced drawing, 1 draw call)
        this.enableBatching = true;     // Batch particles into single draw calls
        this.batchSize = 1000;          // Max particles per batch draw call
        
        // Internal state for wind
        this._windTime = 0;
        this._particleWindPhaseOffset = Math.random() * Math.PI * 2; // Random phase for unique wind patterns
        this._noiseTime = 0; // Internal clock for noise turbulence
        
        // Cached color values (avoid parsing hex every frame)
        this._cachedStartRgb = null;
        this._cachedEndRgb = null;
        this._cachedStartColor = '';
        this._cachedEndColor = '';
        
        // Cached gradient colors (avoid parsing hex per-particle)
        this._cachedGradientInnerRgb = null;
        this._cachedGradientOuterRgb = null;
        this._cachedGradientInnerColor = '';
        this._cachedGradientOuterColor = '';
        
        // Pre-rendered gradient texture canvas (avoids createRadialGradient per particle)
        this._gradientCanvas = null;
        this._gradientCtx = null;
        this._gradientCacheKey = '';
        
        // Pre-rendered text character cache (avoids ctx.font + fillText per particle)
        this._textCharCache = new Map();  // char → { canvas, width, height, isEmoji }
        this._textCacheKey = '';           // Invalidation key: fontSize_fontFamily_fontWeight
        this._textTintCanvas = null;       // Shared tinting canvas for coloring non-emoji text
        this._textTintCtx = null;
        this._textChars = null;            // Parsed character array (handles multi-codepoint emoji)
        
        // Internal state
        this._particles = [];
        this._isPlaying = false;
        this._emissionTimer = 0;
        this._cachedImage = null;
        
        // Cached colliders for collision detection
        this._cachedColliders = [];
        this._colliderCacheTime = 999; // Start high to force immediate cache on first check
        // _colliderCacheInterval is now exposed as this.colliderCacheInterval
        
        // GPU Instanced Rendering state (WebGL2 shader-based)
        this._gpuInitialized = false;
        this._gpuGL = null;
        this._gpuProgram = null;
        this._gpuLocations = null;
        this._gpuQuadBuffer = null;
        this._gpuInstanceBuffer = null;
        this._gpuVAO = null;
        this._gpuInstanceData = null;
        this._gpuCallbackId = null;
        this._gpuParticleCount = 0;
        this._gpuCachedShape = null;
        this._gpuCachedShapeId = 0;
        
        // Batched rendering state
        this._batchCanvas = null;
        this._batchCtx = null;
        
        // GPU Compute state (Transform Feedback particle physics)
        this._gpuComputeInitialized = false;
        this._gpuSimProgram = null;
        this._gpuSimLocations = null;
        this._gpuStateBuffers = [null, null];     // ping-pong state buffers
        this._gpuSimVAOs = [null, null];           // simulation input VAOs
        this._gpuComputeRenderProgram = null;      // render shader that reads state buffer
        this._gpuComputeRenderLocations = null;
        this._gpuComputeRenderVAOs = [null, null]; // render VAOs per state buffer
        this._gpuTF = null;                        // transform feedback object
        this._gpuCurrentBuf = 0;                   // which state buffer is current (0 or 1)
        this._gpuFreeSlots = [];                   // free slot indices for particle allocation
        this._gpuSlotAlive = null;                 // Uint8Array[maxParticles] alive tracking
        this._gpuSlotAge = null;                   // Float32Array[maxParticles] CPU-side age tracking
        this._gpuSlotLifetime = null;              // Float32Array[maxParticles] lifetime per slot
        this._gpuUploadBuf = new Float32Array(8);  // temp buffer for single particle upload
        this._gpuAliveCount = 0;                   // number of alive particles on GPU
        this._gpuFPPosStr = new Float32Array(32);  // pre-allocated force point uniforms (8 × vec4)
        this._gpuFPParams = new Float32Array(16);  // pre-allocated force point params (8 × vec2)
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'Effects';
    
    static getIcon() {
        return '✨';
    }
    
    static getDescription() {
        return 'Creates customizable particle effects with shapes and images';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
        
    // ==================== PRESET METHODS ====================
    
    applyPresetFire() {
        this._resetAdvancedPhysics();
        this.emissionRate = 30;
        this.maxParticles = 150;
        this.particleLifetime = 0.8;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 80;
        this.speedVariation = 0.4;
        this.emissionAngle = -90;
        this.spread = 30;
        this.gravity = -50;
        this.startSize = 12;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ff6600';
        this.endColor = '#ff0000';
        this.fadeOut = true;
        this.emitterWidth = 20;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetSmoke() {
        this._resetAdvancedPhysics();
        this.emissionRate = 15;
        this.maxParticles = 100;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 30;
        this.speedVariation = 0.3;
        this.emissionAngle = -90;
        this.spread = 25;
        this.gravity = -20;
        this.startSize = 8;
        this.endSize = 30;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#666666';
        this.endColor = '#222222';
        this.fadeOut = true;
        this.emitterWidth = 15;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 30;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 20;
        this.windDirection = 0;
        this.windTurbulence = 0.5;
        this.windResistance = 0.3;
    }
    
    applyPresetSparks() {
        this._resetAdvancedPhysics();
        this.emissionRate = 25;
        this.maxParticles = 80;
        this.particleLifetime = 0.6;
        this.lifetimeVariation = 0.5;
        this.startSpeed = 200;
        this.speedVariation = 0.6;
        this.emissionAngle = -90;
        this.spread = 60;
        this.gravity = 300;
        this.startSize = 3;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffff00';
        this.endColor = '#ff6600';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetExplosion() {
        this._resetAdvancedPhysics();
        this.emissionRate = 100;
        this.maxParticles = 200;
        this.particleLifetime = 0.5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 400;
        this.speedVariation = 0.5;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 200;
        this.startSize = 10;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffaa00';
        this.endColor = '#ff0000';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = true;
        this.burstCount = 50;
        this.looping = false;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetConfetti() {
        this._resetAdvancedPhysics();
        this.emissionRate = 40;
        this.maxParticles = 200;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 150;
        this.speedVariation = 0.5;
        this.emissionAngle = -90;
        this.spread = 60;
        this.gravity = 100;
        this.startSize = 8;
        this.endSize = 6;
        this.scaleOverLifetime = false;
        this.shape = 'square';
        this.startColor = '#ff00ff';
        this.endColor = '#00ffff';
        this.fadeOut = false;
        this.emitterWidth = 100;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 360;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 30;
        this.windDirection = 45;
        this.windTurbulence = 0.7;
        this.windResistance = 0.2;
    }
    
    applyPresetRain() {
        this._resetAdvancedPhysics();
        this.emissionRate = 80;
        this.maxParticles = 500;
        this.particleLifetime = 1;
        this.lifetimeVariation = 0.2;
        this.startSpeed = 600;
        this.speedVariation = 0.1;
        this.emissionAngle = 100;
        this.spread = 5;
        this.gravity = 200;
        this.startSize = 2;
        this.endSize = 2;
        this.scaleOverLifetime = false;
        this.shape = 'circle';
        this.startColor = '#aaddff';
        this.endColor = '#6699cc';
        this.fadeOut = false;
        this.emitterWidth = 800;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 15;
        this.windDirection = 20;
        this.windTurbulence = 0.1;
        this.windResistance = 0.9;
    }
    
    applyPresetSnow() {
        this._resetAdvancedPhysics();
        this.emissionRate = 30;
        this.maxParticles = 300;
        this.particleLifetime = 5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 30;
        this.speedVariation = 0.5;
        this.emissionAngle = 90;
        this.spread = 30;
        this.gravity = 20;
        this.startSize = 4;
        this.endSize = 3;
        this.scaleOverLifetime = false;
        this.shape = 'circle';
        this.startColor = '#ffffff';
        this.endColor = '#ddddff';
        this.fadeOut = true;
        this.emitterWidth = 600;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 60;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 25;
        this.windDirection = 30;
        this.windTurbulence = 0.6;
        this.windResistance = 0.1;
    }
    
    applyPresetBubbles() {
        this._resetAdvancedPhysics();
        this.emissionRate = 8;
        this.maxParticles = 50;
        this.particleLifetime = 4;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 40;
        this.speedVariation = 0.3;
        this.emissionAngle = -90;
        this.spread = 20;
        this.gravity = -30;
        this.startSize = 8;
        this.endSize = 15;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#aaddff';
        this.endColor = '#ffffff';
        this.fadeOut = true;
        this.emitterWidth = 50;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 15;
        this.windDirection = 0;
        this.windTurbulence = 0.8;
        this.windResistance = 0.2;
    }
    
    applyPresetMagic() {
        this._resetAdvancedPhysics();
        this.emissionRate = 20;
        this.maxParticles = 100;
        this.particleLifetime = 1.5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 60;
        this.speedVariation = 0.4;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = -20;
        this.startSize = 6;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'star';
        this.startColor = '#ffff00';
        this.endColor = '#ff00ff';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 180;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetLeaves() {
        this._resetAdvancedPhysics();
        this.emissionRate = 10;
        this.maxParticles = 80;
        this.particleLifetime = 4;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 20;
        this.speedVariation = 0.5;
        this.emissionAngle = 90;
        this.spread = 40;
        this.gravity = 30;
        this.startSize = 10;
        this.endSize = 8;
        this.scaleOverLifetime = false;
        this.shape = 'triangle';
        this.startColor = '#cc6600';
        this.endColor = '#996633';
        this.fadeOut = true;
        this.emitterWidth = 400;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 120;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 40;
        this.windDirection = 30;
        this.windTurbulence = 0.8;
        this.windResistance = 0.1;
    }
    
    applyPresetCoins() {
        this._resetAdvancedPhysics();
        this.emissionRate = 50;
        this.maxParticles = 30;
        this.particleLifetime = 1;
        this.lifetimeVariation = 0.2;
        this.startSpeed = 150;
        this.speedVariation = 0.3;
        this.emissionAngle = -90;
        this.spread = 45;
        this.gravity = 400;
        this.startSize = 12;
        this.endSize = 10;
        this.scaleOverLifetime = false;
        this.shape = 'text';
        this.particleText = '💰🪙✨';
        this.fontSize = 20;
        this.startColor = '#ffdd00';
        this.endColor = '#ffaa00';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 360;
        this.randomRotation = true;
        this.burst = true;
        this.burstCount = 15;
        this.looping = false;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetDust() {
        this._resetAdvancedPhysics();
        this.emissionRate = 15;
        this.maxParticles = 100;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.5;
        this.startSpeed = 10;
        this.speedVariation = 0.8;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 2;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ccaa88';
        this.endColor = '#998866';
        this.fadeOut = true;
        this.emitterWidth = 100;
        this.emitterHeight = 100;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 10;
        this.windDirection = 45;
        this.windTurbulence = 0.9;
        this.windResistance = 0.1;
    }
    
    applyPresetBlood() {
        this._resetAdvancedPhysics();
        this.emissionRate = 60;
        this.maxParticles = 100;
        this.particleLifetime = 0.5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 200;
        this.speedVariation = 0.5;
        this.emissionAngle = -60;
        this.spread = 40;
        this.gravity = 500;
        this.startSize = 5;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#cc0000';
        this.endColor = '#660000';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = true;
        this.burstCount = 20;
        this.looping = false;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetWaterSplash() {
        this._resetAdvancedPhysics();
        this.emissionRate = 80;
        this.maxParticles = 150;
        this.particleLifetime = 0.6;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 250;
        this.speedVariation = 0.4;
        this.emissionAngle = -90;
        this.spread = 120;
        this.gravity = 400;
        this.startSize = 6;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#66ccff';
        this.endColor = '#3399cc';
        this.fadeOut = true;
        this.emitterWidth = 20;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = true;
        this.burstCount = 30;
        this.looping = false;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetElectric() {
        this._resetAdvancedPhysics();
        this.emissionRate = 40;
        this.maxParticles = 60;
        this.particleLifetime = 0.2;
        this.lifetimeVariation = 0.5;
        this.startSpeed = 300;
        this.speedVariation = 0.8;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 4;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffffff';
        this.endColor = '#00ffff';
        this.fadeOut = true;
        this.emitterWidth = 10;
        this.emitterHeight = 10;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetPetals() {
        this._resetAdvancedPhysics();
        this.emissionRate = 8;
        this.maxParticles = 60;
        this.particleLifetime = 5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 25;
        this.speedVariation = 0.4;
        this.emissionAngle = 90;
        this.spread = 30;
        this.gravity = 15;
        this.startSize = 8;
        this.endSize = 6;
        this.scaleOverLifetime = false;
        this.shape = 'text';
        this.particleText = '🌸🌺🌷💮';
        this.fontSize = 16;
        this.startColor = '#ffaacc';
        this.endColor = '#ff88aa';
        this.fadeOut = true;
        this.emitterWidth = 300;
        this.emitterHeight = 0;
        this.rotateParticles = true;
        this.rotationSpeed = 90;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = true;
        this.windStrength = 35;
        this.windDirection = 20;
        this.windTurbulence = 0.7;
        this.windResistance = 0.15;
    }
    
    applyPresetMeteor() {
        this._resetAdvancedPhysics();
        this.emissionRate = 50;
        this.maxParticles = 150;
        this.particleLifetime = 0.4;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 20;
        this.speedVariation = 0.3;
        this.emissionAngle = 135;
        this.spread = 10;
        this.gravity = 0;
        this.startSize = 8;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffaa00';
        this.endColor = '#ff4400';
        this.fadeOut = true;
        this.emitterWidth = 0;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetHeal() {
        this._resetAdvancedPhysics();
        this.emissionRate = 15;
        this.maxParticles = 80;
        this.particleLifetime = 1.5;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 50;
        this.speedVariation = 0.3;
        this.emissionAngle = -90;
        this.spread = 30;
        this.gravity = -30;
        this.startSize = 8;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'text';
        this.particleText = '✨💚✚❤️‍🩹';
        this.fontSize = 14;
        this.startColor = '#00ff88';
        this.endColor = '#88ffaa';
        this.fadeOut = true;
        this.emitterWidth = 30;
        this.emitterHeight = 30;
        this.rotateParticles = false;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetPoison() {
        this._resetAdvancedPhysics();
        this.emissionRate = 12;
        this.maxParticles = 60;
        this.particleLifetime = 1.5;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 30;
        this.speedVariation = 0.5;
        this.emissionAngle = -90;
        this.spread = 40;
        this.gravity = 50;
        this.startSize = 6;
        this.endSize = 3;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#88ff00';
        this.endColor = '#448800';
        this.fadeOut = true;
        this.emitterWidth = 20;
        this.emitterHeight = 0;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    applyPresetPortal() {
        this._resetAdvancedPhysics();
        this.emissionRate = 30;
        this.maxParticles = 120;
        this.particleLifetime = 1;
        this.lifetimeVariation = 0.2;
        this.startSpeed = 100;
        this.speedVariation = 0.2;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 5;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#aa00ff';
        this.endColor = '#0066ff';
        this.fadeOut = true;
        this.emitterWidth = 40;
        this.emitterHeight = 40;
        this.rotateParticles = true;
        this.rotationSpeed = 360;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
    }
    
    // Helper: reset all advanced physics to defaults (call from every preset)
    _resetAdvancedPhysics() {
        this.enableForcePoints = false;
        this.forcePoints = [];
        this.drag = 0;
        this.maxVelocity = 0;
        this.orbitalSpeed = 0;
        this.enableNoiseTurbulence = false;
        this.noiseStrength = 30;
        this.noiseScale = 0.01;
        this.noiseSpeed = 1;
        this.vortexStrength = 0;
    }
    
    // ==================== ADVANCED PHYSICS PRESETS ====================
    
    applyPresetBlackHole() {
        this._resetAdvancedPhysics();
        this.emissionRate = 60;
        this.maxParticles = 300;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 80;
        this.speedVariation = 0.4;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 4;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#aa44ff';
        this.endColor = '#000000';
        this.fadeOut = true;
        this.emitterWidth = 120;
        this.emitterHeight = 120;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 400, radius: 200, type: 'attract', falloff: 'inverse' }
        ];
        this.vortexStrength = 150;
        this.orbitalSpeed = 120;
        this.drag = 0.15;
        this.maxVelocity = 250;
    }
    
    applyPresetGalaxy() {
        this._resetAdvancedPhysics();
        this.emissionRate = 40;
        this.maxParticles = 400;
        this.particleLifetime = 6;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 20;
        this.speedVariation = 0.6;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 3;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#aaccff';
        this.endColor = '#6633cc';
        this.fadeOut = true;
        this.emitterWidth = 80;
        this.emitterHeight = 80;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 60, radius: 250, type: 'attract', falloff: 'linear' },
            { x: 80, y: 0, strength: 30, radius: 100, type: 'attract', falloff: 'inverse' },
            { x: -80, y: 0, strength: 30, radius: 100, type: 'attract', falloff: 'inverse' }
        ];
        this.orbitalSpeed = 45;
        this.vortexStrength = 20;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 15;
        this.noiseScale = 0.005;
        this.noiseSpeed = 0.3;
        this.drag = 0.05;
    }
    
    applyPresetTornado() {
        this._resetAdvancedPhysics();
        this.emissionRate = 50;
        this.maxParticles = 250;
        this.particleLifetime = 2.5;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 40;
        this.speedVariation = 0.5;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = -80;
        this.startSize = 5;
        this.endSize = 8;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#998877';
        this.endColor = '#666655';
        this.fadeOut = true;
        this.emitterWidth = 60;
        this.emitterHeight = 10;
        this.rotateParticles = true;
        this.rotationSpeed = 270;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        // Advanced physics
        this.vortexStrength = 250;
        this.orbitalSpeed = 200;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 40;
        this.noiseScale = 0.008;
        this.noiseSpeed = 1.5;
        this.drag = 0.08;
    }
    
    applyPresetGravityWell() {
        this._resetAdvancedPhysics();
        this.emissionRate = 35;
        this.maxParticles = 200;
        this.particleLifetime = 4;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 120;
        this.speedVariation = 0.3;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 4;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#00ffcc';
        this.endColor = '#003366';
        this.fadeOut = true;
        this.emitterWidth = 150;
        this.emitterHeight = 150;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 300, radius: 250, type: 'attract', falloff: 'inverse' }
        ];
        this.drag = 0.1;
        this.maxVelocity = 200;
    }
    
    applyPresetPlasmaBall() {
        this._resetAdvancedPhysics();
        this.emissionRate = 50;
        this.maxParticles = 150;
        this.particleLifetime = 0.6;
        this.lifetimeVariation = 0.5;
        this.startSpeed = 200;
        this.speedVariation = 0.7;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 3;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffffff';
        this.endColor = '#8800ff';
        this.fadeOut = true;
        this.emitterWidth = 10;
        this.emitterHeight = 10;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — multiple attract/repel create chaotic arcs
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 350, radius: 120, type: 'attract', falloff: 'inverse' },
            { x: 40, y: 0, strength: 200, radius: 60, type: 'repel', falloff: 'constant' },
            { x: -40, y: 0, strength: 200, radius: 60, type: 'repel', falloff: 'constant' },
            { x: 0, y: 40, strength: 200, radius: 60, type: 'repel', falloff: 'constant' }
        ];
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 80;
        this.noiseScale = 0.02;
        this.noiseSpeed = 3;
        this.maxVelocity = 350;
    }
    
    applyPresetNebula() {
        this._resetAdvancedPhysics();
        this.emissionRate = 15;
        this.maxParticles = 200;
        this.particleLifetime = 8;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 8;
        this.speedVariation = 0.6;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 20;
        this.endSize = 30;
        this.scaleOverLifetime = true;
        this.shape = 'gradientCircle';
        this.gradientInnerColor = '#ff66aa';
        this.gradientOuterColor = '#000000';
        this.startColor = '#cc44ff';
        this.endColor = '#2244aa';
        this.fadeOut = true;
        this.emitterWidth = 200;
        this.emitterHeight = 150;
        this.rotateParticles = true;
        this.rotationSpeed = 15;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics
        this.orbitalSpeed = 8;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 12;
        this.noiseScale = 0.003;
        this.noiseSpeed = 0.2;
        this.drag = 0.02;
        this.vortexStrength = 5;
    }
    
    applyPresetFireflies() {
        this._resetAdvancedPhysics();
        this.emissionRate = 5;
        this.maxParticles = 40;
        this.particleLifetime = 6;
        this.lifetimeVariation = 0.5;
        this.startSpeed = 10;
        this.speedVariation = 0.8;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 4;
        this.endSize = 2;
        this.scaleOverLifetime = false;
        this.shape = 'gradientCircle';
        this.gradientInnerColor = '#ffff66';
        this.gradientOuterColor = '#000000';
        this.startColor = '#ccff44';
        this.endColor = '#668800';
        this.fadeOut = true;
        this.emitterWidth = 250;
        this.emitterHeight = 200;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — noise for organic meandering
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 25;
        this.noiseScale = 0.006;
        this.noiseSpeed = 0.5;
        this.drag = 0.1;
        this.maxVelocity = 40;
    }
    
    applyPresetWhirlpool() {
        this._resetAdvancedPhysics();
        this.emissionRate = 45;
        this.maxParticles = 250;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 60;
        this.speedVariation = 0.3;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 4;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#66ddff';
        this.endColor = '#003366';
        this.fadeOut = true;
        this.emitterWidth = 100;
        this.emitterHeight = 100;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        // Advanced physics — vortex + attractor = spiral inward
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 180, radius: 200, type: 'attract', falloff: 'linear' }
        ];
        this.vortexStrength = 200;
        this.orbitalSpeed = 90;
        this.drag = 0.12;
    }
    
    applyPresetSolarFlare() {
        this._resetAdvancedPhysics();
        this.emissionRate = 60;
        this.maxParticles = 200;
        this.particleLifetime = 1.5;
        this.lifetimeVariation = 0.4;
        this.startSpeed = 250;
        this.speedVariation = 0.5;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 6;
        this.endSize = 2;
        this.scaleOverLifetime = true;
        this.shape = 'circle';
        this.startColor = '#ffff88';
        this.endColor = '#ff4400';
        this.fadeOut = true;
        this.emitterWidth = 20;
        this.emitterHeight = 20;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — repeller flings particles outward, drag arcs them back
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 200, radius: 180, type: 'attract', falloff: 'inverse' }
        ];
        this.vortexStrength = 80;
        this.drag = 0.2;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 50;
        this.noiseScale = 0.015;
        this.noiseSpeed = 2;
    }
    
    applyPresetAtomic() {
        this._resetAdvancedPhysics();
        this.emissionRate = 25;
        this.maxParticles = 80;
        this.particleLifetime = 10;
        this.lifetimeVariation = 0.1;
        this.startSpeed = 5;
        this.speedVariation = 0.2;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 3;
        this.endSize = 3;
        this.scaleOverLifetime = false;
        this.shape = 'circle';
        this.startColor = '#00ffff';
        this.endColor = '#0088ff';
        this.fadeOut = false;
        this.emitterWidth = 60;
        this.emitterHeight = 60;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — orbital motion creates electron-like orbits
        this.orbitalSpeed = 180;
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 100, radius: 120, type: 'attract', falloff: 'linear' }
        ];
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 8;
        this.noiseScale = 0.01;
        this.noiseSpeed = 0.5;
    }
    
    applyPresetCosmicPortal() {
        this._resetAdvancedPhysics();
        this.emissionRate = 50;
        this.maxParticles = 250;
        this.particleLifetime = 2;
        this.lifetimeVariation = 0.3;
        this.startSpeed = 100;
        this.speedVariation = 0.4;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 5;
        this.endSize = 1;
        this.scaleOverLifetime = true;
        this.shape = 'star';
        this.startColor = '#ff44ff';
        this.endColor = '#4400ff';
        this.fadeOut = true;
        this.emitterWidth = 60;
        this.emitterHeight = 60;
        this.rotateParticles = true;
        this.rotationSpeed = 360;
        this.randomRotation = true;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — vortex + dual force points for swirling portal
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 250, radius: 150, type: 'attract', falloff: 'inverse' },
            { x: 0, y: 0, strength: 120, radius: 40, type: 'repel', falloff: 'constant' }
        ];
        this.vortexStrength = 180;
        this.orbitalSpeed = 150;
        this.drag = 0.08;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 20;
        this.noiseScale = 0.01;
        this.noiseSpeed = 1;
    }
    
    applyPresetEnergyShield() {
        this._resetAdvancedPhysics();
        this.emissionRate = 40;
        this.maxParticles = 200;
        this.particleLifetime = 3;
        this.lifetimeVariation = 0.2;
        this.startSpeed = 30;
        this.speedVariation = 0.3;
        this.emissionAngle = 0;
        this.spread = 360;
        this.gravity = 0;
        this.startSize = 3;
        this.endSize = 2;
        this.scaleOverLifetime = false;
        this.shape = 'circle';
        this.startColor = '#44ddff';
        this.endColor = '#0066ff';
        this.fadeOut = true;
        this.emitterWidth = 80;
        this.emitterHeight = 80;
        this.rotateParticles = false;
        this.randomRotation = false;
        this.burst = false;
        this.looping = true;
        this.autoPlay = true;
        this.enableWind = false;
        this.blendMode = 'lighter';
        // Advanced physics — repeller keeps particles on a shell, orbital rotates them
        this.enableForcePoints = true;
        this.forcePoints = [
            { x: 0, y: 0, strength: 80, radius: 100, type: 'attract', falloff: 'linear' },
            { x: 0, y: 0, strength: 60, radius: 30, type: 'repel', falloff: 'constant' }
        ];
        this.orbitalSpeed = 60;
        this.drag = 0.15;
        this.maxVelocity = 80;
        this.enableNoiseTurbulence = true;
        this.noiseStrength = 10;
        this.noiseScale = 0.008;
        this.noiseSpeed = 0.8;
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        if (this.autoPlay) {
            this.play();
        }
        
        // GPU instanced rendering - renders all particles in 1 draw call via WebGL2 shader
        if (this.useGPUProcessing) {
            this._initGPURendering();
        }
        
        // Pre-allocate particle pool for better performance
        this._particlePool = [];
        this._poolSize = Math.min(this.maxParticles, 500);
        for (let i = 0; i < this._poolSize; i++) {
            this._particlePool.push(this._createParticleObject());
        }

        // Update collision cache immediately if enabled
        if (this.enableCollision) {
            this._refreshColliderCache();
        }
    }
    
    /**
     * Create a reusable particle object
     * @private
     */
    _createParticleObject() {
        return {
            x: 0, y: 0,
            velocityX: 0, velocityY: 0,
            age: 0, lifetime: 0,
            size: 0, alpha: 1,
            rotation: 0,
            textChar: '',
            phaseOffset: 0,
            active: false
        };
    }
    
    /**
     * Get a particle from the pool or create new one
     * @private
     */
    _getParticleFromPool() {
        // Try to get from pool
        if (this._particlePool && this._particlePool.length > 0) {
            return this._particlePool.pop();
        }
        // Create new if pool empty
        return this._createParticleObject();
    }
    
    /**
     * Return a particle to the pool
     * @private
     */
    _returnToPool(particle) {
        if (this._particlePool && this._particlePool.length < this._poolSize) {
            particle.active = false;
            this._particlePool.push(particle);
        }
    }
    
    // ==================== GPU INSTANCED RENDERING ====================
    
    /**
     * Initialize WebGL2 instanced rendering for particles.
     * Creates a custom shader program, VAO, and instance buffer.
     * Registers a shader callback with the engine so all particles
     * are rendered in a single instanced draw call per frame.
     * @private
     */
    _initGPURendering() {
        const engine = this.gameObject?._engine;
        if (!engine || !engine.gpuRenderer || !engine.gpuRenderer.surface) {
            console.info('ParticleSystem: GPU renderer not available, using CPU rendering.');
            this._gpuInitialized = false;
            return;
        }
        
        const surface = engine.gpuRenderer.surface;
        const gl = surface.gl;
        if (!gl || surface._fallbackMode) {
            console.info('ParticleSystem: WebGL2 not available, using CPU rendering.');
            this._gpuInitialized = false;
            return;
        }
        
        // ---- Vertex Shader (instanced quads) ----
        const vertSrc = `#version 300 es
precision highp float;

// Per-vertex (quad geometry)
in vec2 a_quadPos; // -0.5 to 0.5

// Per-instance
in vec2  a_position;  // world position
in float a_size;      // particle diameter
in vec4  a_color;     // rgba (0-1)
in float a_rotation;  // radians

uniform vec2  u_viewOffset;   // viewport x,y
uniform float u_viewZoom;     // viewport zoom
uniform vec2  u_resolution;   // render width, height
uniform vec2  u_objectOffset; // game object world position (for relative mode)
uniform float u_useRelative;  // 1.0 = relative positioning, 0.0 = world

out vec4 v_color;
out vec2 v_quadPos;

void main() {
    // Rotate quad vertex around center
    float c = cos(a_rotation);
    float s = sin(a_rotation);
    vec2 rotated = vec2(
        a_quadPos.x * c - a_quadPos.y * s,
        a_quadPos.x * s + a_quadPos.y * c
    );
    
    // Scale by particle size, offset to particle position
    vec2 localPos = a_position + rotated * a_size;
    
    // Add game object offset for relative positioning
    vec2 worldPos = localPos + u_objectOffset * u_useRelative;
    
    // Apply viewport transform: world -> render space
    vec2 renderPos = (worldPos - u_viewOffset) * u_viewZoom;
    
    // Convert to clip space (-1 to 1), flip Y for WebGL
    vec2 clipPos = (renderPos / u_resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;
    
    gl_Position = vec4(clipPos, 0.0, 1.0);
    v_color = a_color;
    v_quadPos = a_quadPos;
}
`;
        
        // ---- Fragment Shader (shape rendering) ----
        const fragSrc = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_quadPos;

// 0=circle, 1=square, 2=triangle, 3=star, 4=gradientCircle, 5=gradientSquare
uniform int u_shape;
uniform vec3 u_gradientInner; // inner gradient color (rgb 0-1)
uniform vec3 u_gradientOuter; // outer gradient color (rgb 0-1)

out vec4 outColor;

void main() {
    float alpha = v_color.a;
    vec3 color = v_color.rgb;
    
    if (u_shape == 0) {
        // Circle with smooth edge
        float dist = length(v_quadPos);
        if (dist > 0.5) discard;
        alpha *= smoothstep(0.5, 0.42, dist);
    } else if (u_shape == 2) {
        // Triangle (pointing up)
        vec2 p = v_quadPos;
        // Equilateral triangle inscribed in the quad
        float edge1 = p.y + 0.5;  // bottom edge
        float edge2 = 0.5 - p.y - abs(p.x) * 1.732; // two side edges
        if (edge1 < 0.0 || edge2 < 0.0) discard;
    } else if (u_shape == 3) {
        // Star (5-point) approximation via distance field
        vec2 p = v_quadPos;
        float angle = atan(p.y, p.x);
        float r = length(p);
        float star = cos(floor(0.5 + angle * 5.0 / 6.28318) * 6.28318 / 5.0 - angle) * r;
        if (star > 0.35) discard;
        alpha *= smoothstep(0.35, 0.28, star);
    } else if (u_shape == 4) {
        // Gradient circle (radial gradient)
        float dist = length(v_quadPos);
        if (dist > 0.5) discard;
        float t = dist / 0.5; // 0 at center, 1 at edge
        color = mix(u_gradientInner, u_gradientOuter, t);
        alpha *= smoothstep(0.5, 0.42, dist) * mix(1.0, 0.3, t);
    } else if (u_shape == 5) {
        // Gradient square (radial gradient on square)
        float dist = max(abs(v_quadPos.x), abs(v_quadPos.y));
        float t = dist / 0.5;
        color = mix(u_gradientInner, u_gradientOuter, t);
        alpha *= mix(1.0, 0.3, t);
    }
    // u_shape == 1 (square): use full quad as-is, no discard
    
    outColor = vec4(color * alpha, alpha); // premultiplied alpha for proper blending
}
`;
        
        // ---- Compile shader program ----
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU: Vertex shader error:', gl.getShaderInfoLog(vs));
            gl.deleteShader(vs);
            this._gpuInitialized = false;
            return;
        }
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU: Fragment shader error:', gl.getShaderInfoLog(fs));
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            this._gpuInitialized = false;
            return;
        }
        
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('ParticleSystem GPU: Program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            this._gpuInitialized = false;
            return;
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        
        this._gpuProgram = program;
        
        // ---- Cache attribute/uniform locations ----
        this._gpuLocations = {
            a_quadPos:     gl.getAttribLocation(program, 'a_quadPos'),
            a_position:    gl.getAttribLocation(program, 'a_position'),
            a_size:        gl.getAttribLocation(program, 'a_size'),
            a_color:       gl.getAttribLocation(program, 'a_color'),
            a_rotation:    gl.getAttribLocation(program, 'a_rotation'),
            u_viewOffset:  gl.getUniformLocation(program, 'u_viewOffset'),
            u_viewZoom:    gl.getUniformLocation(program, 'u_viewZoom'),
            u_resolution:  gl.getUniformLocation(program, 'u_resolution'),
            u_objectOffset:gl.getUniformLocation(program, 'u_objectOffset'),
            u_useRelative: gl.getUniformLocation(program, 'u_useRelative'),
            u_shape:       gl.getUniformLocation(program, 'u_shape'),
            u_gradientInner: gl.getUniformLocation(program, 'u_gradientInner'),
            u_gradientOuter: gl.getUniformLocation(program, 'u_gradientOuter'),
        };
        
        // ---- Create quad geometry (2 triangles, per-vertex) ----
        const quadVerts = new Float32Array([
            -0.5, -0.5,   0.5, -0.5,   0.5,  0.5,
            -0.5, -0.5,   0.5,  0.5,  -0.5,  0.5,
        ]);
        this._gpuQuadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuQuadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
        
        // ---- Create instance data buffer (updated every frame) ----
        // Layout per instance: x, y, size, r, g, b, a, rotation = 8 floats
        this._gpuInstanceBuffer = gl.createBuffer();
        this._gpuInstanceData = new Float32Array(this.maxParticles * 8);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._gpuInstanceData.byteLength, gl.DYNAMIC_DRAW);
        
        // ---- Create VAO with instanced attributes ----
        this._gpuVAO = gl.createVertexArray();
        gl.bindVertexArray(this._gpuVAO);
        
        const loc = this._gpuLocations;
        
        // Per-vertex: a_quadPos (from quad geometry buffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuQuadBuffer);
        gl.enableVertexAttribArray(loc.a_quadPos);
        gl.vertexAttribPointer(loc.a_quadPos, 2, gl.FLOAT, false, 0, 0);
        
        // Per-instance attributes (from instance data buffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuInstanceBuffer);
        const stride = 8 * 4; // 8 floats * 4 bytes = 32 bytes per instance
        
        // a_position (x, y) - offset 0
        gl.enableVertexAttribArray(loc.a_position);
        gl.vertexAttribPointer(loc.a_position, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribDivisor(loc.a_position, 1);
        
        // a_size - offset 8
        gl.enableVertexAttribArray(loc.a_size);
        gl.vertexAttribPointer(loc.a_size, 1, gl.FLOAT, false, stride, 8);
        gl.vertexAttribDivisor(loc.a_size, 1);
        
        // a_color (r, g, b, a) - offset 12
        gl.enableVertexAttribArray(loc.a_color);
        gl.vertexAttribPointer(loc.a_color, 4, gl.FLOAT, false, stride, 12);
        gl.vertexAttribDivisor(loc.a_color, 1);
        
        // a_rotation - offset 28
        gl.enableVertexAttribArray(loc.a_rotation);
        gl.vertexAttribPointer(loc.a_rotation, 1, gl.FLOAT, false, stride, 28);
        gl.vertexAttribDivisor(loc.a_rotation, 1);
        
        gl.bindVertexArray(null);
        
        // ---- Register shader callback with engine ----
        const callbackId = `particle_gpu_${this.gameObject?.id || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this._gpuCallbackId = callbackId;
        engine.registerShaderCallback(callbackId, (renderCtx, dt, eng) => {
            this._renderGPUParticles(renderCtx, dt, eng);
        }, 10); // priority 10 so it runs after normal scene draws
        
        this._gpuGL = gl;
        this._gpuInitialized = true;
        console.log(`ParticleSystem: GPU instanced rendering initialized (max ${this.maxParticles} particles, 1 draw call)`);
        
        // Initialize GPU Compute (Transform Feedback) for physics
        this._initGPUCompute();
    }
    
    /**
     * Destroy GPU rendering resources and unregister the shader callback.
     * @private
     */
    _destroyGPURendering() {
        if (!this._gpuInitialized) return;
        
        // Destroy GPU compute resources first
        this._destroyGPUCompute();
        
        const engine = this.gameObject?._engine;
        if (engine && this._gpuCallbackId) {
            engine.unregisterShaderCallback(this._gpuCallbackId);
        }
        
        const gl = this._gpuGL;
        if (gl) {
            if (this._gpuVAO) gl.deleteVertexArray(this._gpuVAO);
            if (this._gpuQuadBuffer) gl.deleteBuffer(this._gpuQuadBuffer);
            if (this._gpuInstanceBuffer) gl.deleteBuffer(this._gpuInstanceBuffer);
            if (this._gpuProgram) gl.deleteProgram(this._gpuProgram);
        }
        
        this._gpuVAO = null;
        this._gpuQuadBuffer = null;
        this._gpuInstanceBuffer = null;
        this._gpuProgram = null;
        this._gpuLocations = null;
        this._gpuInstanceData = null;
        this._gpuGL = null;
        this._gpuCallbackId = null;
        this._gpuInitialized = false;
    }
    
    // ==================== GPU COMPUTE (Transform Feedback Physics) ====================
    
    /**
     * Initialize GPU Compute via WebGL2 Transform Feedback.
     * Moves all per-particle physics (gravity, force points, vortex, orbital,
     * noise turbulence, drag, max velocity) to a vertex shader that runs in
     * parallel on the GPU. Uses ping-pong state buffers so there is zero
     * CPU readback — rendering reads directly from the GPU output buffer.
     * @private
     */
    _initGPUCompute() {
        const gl = this._gpuGL;
        if (!gl) return;
        
        // ---- Simulation Vertex Shader (Transform Feedback) ----
        const simVertSrc = `#version 300 es
precision highp float;

// Input particle state
in vec2 a_pos;
in vec2 a_vel;
in float a_age;
in float a_lifetime;
in float a_rotation;
in float a_reserved;

// Output particle state (transform feedback varyings)
out vec2 v_pos;
out vec2 v_vel;
out float v_age;
out float v_lifetime;
out float v_rotation;
out float v_reserved;

// Physics uniforms
uniform float u_dt;
uniform float u_gravity;
uniform float u_drag;
uniform float u_maxVelocity;
uniform float u_maxVelocitySq;
uniform float u_orbitalCos;
uniform float u_orbitalSin;
uniform float u_vortexStrength;
uniform vec2  u_emitterPos;
uniform float u_rotSpeedRad;
uniform float u_noiseStrength;
uniform float u_noiseScale;
uniform float u_noiseTime;

// Enable flags (0.0 or 1.0)
uniform float u_enableDrag;
uniform float u_enableMaxVel;
uniform float u_enableOrbital;
uniform float u_enableVortex;
uniform float u_enableNoise;
uniform float u_enableRotation;
uniform float u_useRelative;

// Force points (max 8)
#define MAX_FP 8
uniform int  u_numForcePoints;
uniform vec4 u_fpPosStr[MAX_FP];  // x, y, strength, radius
uniform vec2 u_fpParams[MAX_FP];  // type(0=attract,1=repel), falloff(0=linear,1=inverse,2=constant)

void main() {
    float age = a_age + u_dt;
    
    // Dead or uninitialized particles — pass through
    if (a_lifetime <= 0.0 || age >= a_lifetime) {
        v_pos = a_pos;
        v_vel = vec2(0.0);
        v_age = age;
        v_lifetime = a_lifetime;
        v_rotation = a_rotation;
        v_reserved = 0.0;
        return;
    }
    
    vec2 vel = a_vel;
    vec2 pos = a_pos;
    
    // --- Gravity ---
    vel.y += u_gravity * u_dt;
    
    // --- Position update ---
    pos += vel * u_dt;
    
    // --- Force Points ---
    for (int i = 0; i < MAX_FP; i++) {
        if (i >= u_numForcePoints) break;
        vec4 fp = u_fpPosStr[i];
        vec2 fpp = u_fpParams[i];
        
        vec2 fpWorld = u_emitterPos + fp.xy;
        vec2 pWorld = pos + u_emitterPos * u_useRelative;
        vec2 diff = fpWorld - pWorld;
        float distSq = dot(diff, diff);
        float radius = fp.w;
        
        if (distSq > radius * radius || distSq < 0.01) continue;
        
        float dist = sqrt(distSq);
        vec2 dir = diff / dist;
        float force = fp.z;
        
        // Falloff: 0=linear, 1=inverse, 2=constant
        if (fpp.y < 0.5) {
            force *= (1.0 - dist / radius);
        } else if (fpp.y < 1.5) {
            force *= (radius / (dist + 1.0));
        }
        
        float sign = (fpp.x > 0.5) ? -1.0 : 1.0;
        vel += dir * force * sign * u_dt;
    }
    
    // --- Vortex ---
    if (u_enableVortex > 0.5) {
        vec2 d = mix(pos - u_emitterPos, pos, u_useRelative);
        float dist = length(d);
        if (dist > 0.01) {
            vec2 tangent = vec2(-d.y, d.x) / dist;
            vel += tangent * u_vortexStrength * u_dt;
        }
    }
    
    // --- Orbital Motion ---
    if (u_enableOrbital > 0.5) {
        vec2 d = mix(pos - u_emitterPos, pos, u_useRelative);
        vec2 np = vec2(d.x * u_orbitalCos - d.y * u_orbitalSin,
                       d.x * u_orbitalSin + d.y * u_orbitalCos);
        pos = mix(u_emitterPos + np, np, u_useRelative);
        vec2 nv = vec2(vel.x * u_orbitalCos - vel.y * u_orbitalSin,
                       vel.x * u_orbitalSin + vel.y * u_orbitalCos);
        vel = nv;
    }
    
    // --- Noise Turbulence ---
    if (u_enableNoise > 0.5) {
        float px = pos.x * u_noiseScale;
        float py = pos.y * u_noiseScale;
        float t = u_noiseTime;
        float n1 = sin(px * 127.1 + py * 311.7 + t * 1.3) * 43758.5453;
        float n2 = sin(px * 269.5 + py * 183.3 + t * 2.1) * 43758.5453;
        float noiseX = fract(n1) * 2.0 - 1.0;
        float noiseY = fract(n2) * 2.0 - 1.0;
        vel += vec2(noiseX, noiseY) * u_noiseStrength * u_dt;
    }
    
    // --- Drag ---
    if (u_enableDrag > 0.5) {
        vel *= 1.0 - u_drag * u_dt;
    }
    
    // --- Max Velocity ---
    if (u_enableMaxVel > 0.5) {
        float speedSq = dot(vel, vel);
        if (speedSq > u_maxVelocitySq) {
            vel *= u_maxVelocity / sqrt(speedSq);
        }
    }
    
    // --- Rotation ---
    float rot = a_rotation + u_rotSpeedRad * u_enableRotation;
    
    v_pos = pos;
    v_vel = vel;
    v_age = age;
    v_lifetime = a_lifetime;
    v_rotation = rot;
    v_reserved = 0.0;
}
`;
        
        // Simulation fragment shader (rasterization is disabled via RASTERIZER_DISCARD)
        const simFragSrc = `#version 300 es
precision lowp float;
out vec4 _unused;
void main() { _unused = vec4(0.0); }
`;
        
        // ---- Compile simulation program with Transform Feedback ----
        const simVS = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(simVS, simVertSrc);
        gl.compileShader(simVS);
        if (!gl.getShaderParameter(simVS, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU Compute: Simulation VS error:', gl.getShaderInfoLog(simVS));
            gl.deleteShader(simVS);
            return;
        }
        
        const simFS = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(simFS, simFragSrc);
        gl.compileShader(simFS);
        if (!gl.getShaderParameter(simFS, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU Compute: Simulation FS error:', gl.getShaderInfoLog(simFS));
            gl.deleteShader(simVS);
            gl.deleteShader(simFS);
            return;
        }
        
        const simProgram = gl.createProgram();
        gl.attachShader(simProgram, simVS);
        gl.attachShader(simProgram, simFS);
        
        // Must set transform feedback varyings BEFORE linking
        gl.transformFeedbackVaryings(simProgram,
            ['v_pos', 'v_vel', 'v_age', 'v_lifetime', 'v_rotation', 'v_reserved'],
            gl.INTERLEAVED_ATTRIBS
        );
        
        gl.linkProgram(simProgram);
        if (!gl.getProgramParameter(simProgram, gl.LINK_STATUS)) {
            console.error('ParticleSystem GPU Compute: Simulation link error:', gl.getProgramInfoLog(simProgram));
            gl.deleteProgram(simProgram);
            gl.deleteShader(simVS);
            gl.deleteShader(simFS);
            return;
        }
        gl.deleteShader(simVS);
        gl.deleteShader(simFS);
        
        this._gpuSimProgram = simProgram;
        
        // Cache simulation uniform locations
        this._gpuSimLocations = {
            u_dt:             gl.getUniformLocation(simProgram, 'u_dt'),
            u_gravity:        gl.getUniformLocation(simProgram, 'u_gravity'),
            u_drag:           gl.getUniformLocation(simProgram, 'u_drag'),
            u_maxVelocity:    gl.getUniformLocation(simProgram, 'u_maxVelocity'),
            u_maxVelocitySq:  gl.getUniformLocation(simProgram, 'u_maxVelocitySq'),
            u_orbitalCos:     gl.getUniformLocation(simProgram, 'u_orbitalCos'),
            u_orbitalSin:     gl.getUniformLocation(simProgram, 'u_orbitalSin'),
            u_vortexStrength: gl.getUniformLocation(simProgram, 'u_vortexStrength'),
            u_emitterPos:     gl.getUniformLocation(simProgram, 'u_emitterPos'),
            u_rotSpeedRad:    gl.getUniformLocation(simProgram, 'u_rotSpeedRad'),
            u_noiseStrength:  gl.getUniformLocation(simProgram, 'u_noiseStrength'),
            u_noiseScale:     gl.getUniformLocation(simProgram, 'u_noiseScale'),
            u_noiseTime:      gl.getUniformLocation(simProgram, 'u_noiseTime'),
            u_enableDrag:     gl.getUniformLocation(simProgram, 'u_enableDrag'),
            u_enableMaxVel:   gl.getUniformLocation(simProgram, 'u_enableMaxVel'),
            u_enableOrbital:  gl.getUniformLocation(simProgram, 'u_enableOrbital'),
            u_enableVortex:   gl.getUniformLocation(simProgram, 'u_enableVortex'),
            u_enableNoise:    gl.getUniformLocation(simProgram, 'u_enableNoise'),
            u_enableRotation: gl.getUniformLocation(simProgram, 'u_enableRotation'),
            u_useRelative:    gl.getUniformLocation(simProgram, 'u_useRelative'),
            u_numForcePoints: gl.getUniformLocation(simProgram, 'u_numForcePoints'),
            u_fpPosStr:       gl.getUniformLocation(simProgram, 'u_fpPosStr'),
            u_fpParams:       gl.getUniformLocation(simProgram, 'u_fpParams'),
        };
        
        // Simulation attribute locations
        const simAttr = {
            a_pos:      gl.getAttribLocation(simProgram, 'a_pos'),
            a_vel:      gl.getAttribLocation(simProgram, 'a_vel'),
            a_age:      gl.getAttribLocation(simProgram, 'a_age'),
            a_lifetime: gl.getAttribLocation(simProgram, 'a_lifetime'),
            a_rotation: gl.getAttribLocation(simProgram, 'a_rotation'),
            a_reserved: gl.getAttribLocation(simProgram, 'a_reserved'),
        };
        
        // ---- Create state buffers (ping-pong) ----
        const maxP = this.maxParticles;
        const stride = 8 * 4; // 8 floats × 4 bytes = 32 bytes per particle
        const initialData = new Float32Array(maxP * 8); // all zeros = dead particles
        
        for (let b = 0; b < 2; b++) {
            this._gpuStateBuffers[b] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuStateBuffers[b]);
            gl.bufferData(gl.ARRAY_BUFFER, initialData, gl.DYNAMIC_COPY);
        }
        
        // ---- Create simulation VAOs (one per ping-pong direction) ----
        for (let b = 0; b < 2; b++) {
            this._gpuSimVAOs[b] = gl.createVertexArray();
            gl.bindVertexArray(this._gpuSimVAOs[b]);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuStateBuffers[b]);
            
            gl.enableVertexAttribArray(simAttr.a_pos);
            gl.vertexAttribPointer(simAttr.a_pos, 2, gl.FLOAT, false, stride, 0);
            
            gl.enableVertexAttribArray(simAttr.a_vel);
            gl.vertexAttribPointer(simAttr.a_vel, 2, gl.FLOAT, false, stride, 8);
            
            gl.enableVertexAttribArray(simAttr.a_age);
            gl.vertexAttribPointer(simAttr.a_age, 1, gl.FLOAT, false, stride, 16);
            
            gl.enableVertexAttribArray(simAttr.a_lifetime);
            gl.vertexAttribPointer(simAttr.a_lifetime, 1, gl.FLOAT, false, stride, 20);
            
            gl.enableVertexAttribArray(simAttr.a_rotation);
            gl.vertexAttribPointer(simAttr.a_rotation, 1, gl.FLOAT, false, stride, 24);
            
            gl.enableVertexAttribArray(simAttr.a_reserved);
            gl.vertexAttribPointer(simAttr.a_reserved, 1, gl.FLOAT, false, stride, 28);
            
            gl.bindVertexArray(null);
        }
        
        // ---- Create transform feedback object ----
        this._gpuTF = gl.createTransformFeedback();
        
        // ---- Compute-mode Render Shader ----
        // Vertex shader reads directly from state buffer (no CPU packing)
        const renderVertSrc = `#version 300 es
precision highp float;

// Per-vertex (quad geometry)
in vec2 a_quadPos;

// Per-instance (from GPU state buffer, stride 32)
in vec2  a_pos;
in float a_age;
in float a_lifetime;
in float a_rotation;

uniform vec2  u_viewOffset;
uniform float u_viewZoom;
uniform vec2  u_resolution;
uniform vec2  u_objectOffset;
uniform float u_useRelative;
uniform float u_startSize;
uniform float u_endSize;
uniform float u_scaleOverLifetime;
uniform vec3  u_startColor;
uniform vec3  u_endColor;
uniform float u_fadeOut;

out vec4 v_color;
out vec2 v_quadPos;

void main() {
    // Dead / uninitialized: move off-screen
    if (a_lifetime <= 0.0 || a_age >= a_lifetime) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        v_color = vec4(0.0);
        v_quadPos = vec2(0.0);
        return;
    }
    
    float t = a_age / a_lifetime;
    float size = u_scaleOverLifetime > 0.5 ? mix(u_startSize, u_endSize, t) : u_startSize;
    float alpha = u_fadeOut > 0.5 ? 1.0 - t : 1.0;
    vec3 color = mix(u_startColor, u_endColor, t);
    
    float c = cos(a_rotation);
    float s = sin(a_rotation);
    vec2 rotated = vec2(a_quadPos.x * c - a_quadPos.y * s,
                        a_quadPos.x * s + a_quadPos.y * c);
    
    vec2 localPos = a_pos + rotated * size;
    vec2 worldPos = localPos + u_objectOffset * u_useRelative;
    vec2 renderPos = (worldPos - u_viewOffset) * u_viewZoom;
    vec2 clipPos = (renderPos / u_resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;
    
    gl_Position = vec4(clipPos, 0.0, 1.0);
    v_color = vec4(color * alpha, alpha);
    v_quadPos = a_quadPos;
}
`;
        
        // Fragment shader (identical to the standard GPU render path)
        const renderFragSrc = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_quadPos;

uniform int u_shape;
uniform vec3 u_gradientInner;
uniform vec3 u_gradientOuter;

out vec4 outColor;

void main() {
    float alpha = v_color.a;
    vec3 color = v_color.rgb;
    
    if (u_shape == 0) {
        float dist = length(v_quadPos);
        if (dist > 0.5) discard;
        alpha *= smoothstep(0.5, 0.42, dist);
    } else if (u_shape == 2) {
        vec2 p = v_quadPos;
        float edge1 = p.y + 0.5;
        float edge2 = 0.5 - p.y - abs(p.x) * 1.732;
        if (edge1 < 0.0 || edge2 < 0.0) discard;
    } else if (u_shape == 3) {
        vec2 p = v_quadPos;
        float angle = atan(p.y, p.x);
        float r = length(p);
        float star = cos(floor(0.5 + angle * 5.0 / 6.28318) * 6.28318 / 5.0 - angle) * r;
        if (star > 0.35) discard;
        alpha *= smoothstep(0.35, 0.28, star);
    } else if (u_shape == 4) {
        float dist = length(v_quadPos);
        if (dist > 0.5) discard;
        float t = dist / 0.5;
        color = mix(u_gradientInner, u_gradientOuter, t);
        alpha *= smoothstep(0.5, 0.42, dist) * mix(1.0, 0.3, t);
    } else if (u_shape == 5) {
        float dist = max(abs(v_quadPos.x), abs(v_quadPos.y));
        float t = dist / 0.5;
        color = mix(u_gradientInner, u_gradientOuter, t);
        alpha *= mix(1.0, 0.3, t);
    }
    
    outColor = vec4(color * alpha, alpha);
}
`;
        
        // ---- Compile compute render program ----
        const rVS = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(rVS, renderVertSrc);
        gl.compileShader(rVS);
        if (!gl.getShaderParameter(rVS, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU Compute: Render VS error:', gl.getShaderInfoLog(rVS));
            gl.deleteShader(rVS);
            return;
        }
        
        const rFS = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(rFS, renderFragSrc);
        gl.compileShader(rFS);
        if (!gl.getShaderParameter(rFS, gl.COMPILE_STATUS)) {
            console.error('ParticleSystem GPU Compute: Render FS error:', gl.getShaderInfoLog(rFS));
            gl.deleteShader(rVS);
            gl.deleteShader(rFS);
            return;
        }
        
        const renderProg = gl.createProgram();
        gl.attachShader(renderProg, rVS);
        gl.attachShader(renderProg, rFS);
        gl.linkProgram(renderProg);
        if (!gl.getProgramParameter(renderProg, gl.LINK_STATUS)) {
            console.error('ParticleSystem GPU Compute: Render link error:', gl.getProgramInfoLog(renderProg));
            gl.deleteProgram(renderProg);
            gl.deleteShader(rVS);
            gl.deleteShader(rFS);
            return;
        }
        gl.deleteShader(rVS);
        gl.deleteShader(rFS);
        
        this._gpuComputeRenderProgram = renderProg;
        
        // Cache render uniform + attribute locations
        this._gpuComputeRenderLocations = {
            // Vertex uniforms
            u_viewOffset:       gl.getUniformLocation(renderProg, 'u_viewOffset'),
            u_viewZoom:         gl.getUniformLocation(renderProg, 'u_viewZoom'),
            u_resolution:       gl.getUniformLocation(renderProg, 'u_resolution'),
            u_objectOffset:     gl.getUniformLocation(renderProg, 'u_objectOffset'),
            u_useRelative:      gl.getUniformLocation(renderProg, 'u_useRelative'),
            u_startSize:        gl.getUniformLocation(renderProg, 'u_startSize'),
            u_endSize:          gl.getUniformLocation(renderProg, 'u_endSize'),
            u_scaleOverLifetime:gl.getUniformLocation(renderProg, 'u_scaleOverLifetime'),
            u_startColor:       gl.getUniformLocation(renderProg, 'u_startColor'),
            u_endColor:         gl.getUniformLocation(renderProg, 'u_endColor'),
            u_fadeOut:           gl.getUniformLocation(renderProg, 'u_fadeOut'),
            // Fragment uniforms
            u_shape:            gl.getUniformLocation(renderProg, 'u_shape'),
            u_gradientInner:    gl.getUniformLocation(renderProg, 'u_gradientInner'),
            u_gradientOuter:    gl.getUniformLocation(renderProg, 'u_gradientOuter'),
            // Attributes
            a_quadPos:          gl.getAttribLocation(renderProg, 'a_quadPos'),
            a_pos:              gl.getAttribLocation(renderProg, 'a_pos'),
            a_age:              gl.getAttribLocation(renderProg, 'a_age'),
            a_lifetime:         gl.getAttribLocation(renderProg, 'a_lifetime'),
            a_rotation:         gl.getAttribLocation(renderProg, 'a_rotation'),
        };
        
        // ---- Create render VAOs (one per state buffer, bound to quad + state) ----
        const rloc = this._gpuComputeRenderLocations;
        for (let b = 0; b < 2; b++) {
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            
            // Per-vertex: quad geometry
            gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuQuadBuffer);
            gl.enableVertexAttribArray(rloc.a_quadPos);
            gl.vertexAttribPointer(rloc.a_quadPos, 2, gl.FLOAT, false, 0, 0);
            
            // Per-instance: state buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuStateBuffers[b]);
            
            gl.enableVertexAttribArray(rloc.a_pos);
            gl.vertexAttribPointer(rloc.a_pos, 2, gl.FLOAT, false, stride, 0);
            gl.vertexAttribDivisor(rloc.a_pos, 1);
            
            gl.enableVertexAttribArray(rloc.a_age);
            gl.vertexAttribPointer(rloc.a_age, 1, gl.FLOAT, false, stride, 16);
            gl.vertexAttribDivisor(rloc.a_age, 1);
            
            gl.enableVertexAttribArray(rloc.a_lifetime);
            gl.vertexAttribPointer(rloc.a_lifetime, 1, gl.FLOAT, false, stride, 20);
            gl.vertexAttribDivisor(rloc.a_lifetime, 1);
            
            gl.enableVertexAttribArray(rloc.a_rotation);
            gl.vertexAttribPointer(rloc.a_rotation, 1, gl.FLOAT, false, stride, 24);
            gl.vertexAttribDivisor(rloc.a_rotation, 1);
            
            gl.bindVertexArray(null);
            this._gpuComputeRenderVAOs[b] = vao;
        }
        
        // ---- Initialize slot tracking ----
        this._gpuFreeSlots = [];
        for (let i = maxP - 1; i >= 0; i--) {
            this._gpuFreeSlots.push(i); // reverse order so pop() gives lowest first
        }
        this._gpuSlotAlive = new Uint8Array(maxP);
        this._gpuSlotAge = new Float32Array(maxP);
        this._gpuSlotLifetime = new Float32Array(maxP);
        this._gpuAliveCount = 0;
        this._gpuCurrentBuf = 0;
        
        this._gpuComputeInitialized = true;
        console.log(`ParticleSystem: GPU Compute (Transform Feedback) initialized — physics runs on GPU`);
    }
    
    /**
     * Destroy GPU compute resources.
     * @private
     */
    _destroyGPUCompute() {
        if (!this._gpuComputeInitialized) return;
        const gl = this._gpuGL;
        if (!gl) return;
        
        for (let b = 0; b < 2; b++) {
            if (this._gpuSimVAOs[b]) gl.deleteVertexArray(this._gpuSimVAOs[b]);
            if (this._gpuComputeRenderVAOs[b]) gl.deleteVertexArray(this._gpuComputeRenderVAOs[b]);
            if (this._gpuStateBuffers[b]) gl.deleteBuffer(this._gpuStateBuffers[b]);
            this._gpuSimVAOs[b] = null;
            this._gpuComputeRenderVAOs[b] = null;
            this._gpuStateBuffers[b] = null;
        }
        if (this._gpuTF) gl.deleteTransformFeedback(this._gpuTF);
        if (this._gpuSimProgram) gl.deleteProgram(this._gpuSimProgram);
        if (this._gpuComputeRenderProgram) gl.deleteProgram(this._gpuComputeRenderProgram);
        
        this._gpuTF = null;
        this._gpuSimProgram = null;
        this._gpuSimLocations = null;
        this._gpuComputeRenderProgram = null;
        this._gpuComputeRenderLocations = null;
        this._gpuFreeSlots = [];
        this._gpuSlotAlive = null;
        this._gpuSlotAge = null;
        this._gpuSlotLifetime = null;
        this._gpuAliveCount = 0;
        this._gpuComputeInitialized = false;
    }
    
    /**
     * Transfer a CPU-emitted particle to a free GPU buffer slot.
     * @private
     * @param {Object} p - Particle object from _emitParticle()
     */
    _uploadParticleToGPU(p) {
        if (this._gpuFreeSlots.length === 0) return; // no free slots
        
        const slot = this._gpuFreeSlots.pop();
        const gl = this._gpuGL;
        const buf = this._gpuUploadBuf;
        
        buf[0] = p.x;
        buf[1] = p.y;
        buf[2] = p.velocityX;
        buf[3] = p.velocityY;
        buf[4] = 0; // age = 0 (fresh)
        buf[5] = p.lifetime;
        buf[6] = p.rotation;
        buf[7] = 0; // reserved
        
        // Write to the CURRENT (input) state buffer at the slot offset
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuStateBuffers[this._gpuCurrentBuf]);
        gl.bufferSubData(gl.ARRAY_BUFFER, slot * 32, buf); // 32 = 8 floats × 4 bytes
        
        // Track on CPU side
        this._gpuSlotAlive[slot] = 1;
        this._gpuSlotAge[slot] = 0;
        this._gpuSlotLifetime[slot] = p.lifetime;
        this._gpuAliveCount++;
        
        // Return particle object to pool
        this._returnToPool(p);
    }
    
    /**
     * CPU-side age tracking — advance ages and release dead slots.
     * This is very cheap (just N float additions) compared to full physics.
     * @private
     */
    _gpuComputeUpdateAges(dt) {
        const alive = this._gpuSlotAlive;
        const ages = this._gpuSlotAge;
        const lifetimes = this._gpuSlotLifetime;
        const maxP = this.maxParticles;
        
        for (let i = 0; i < maxP; i++) {
            if (alive[i]) {
                ages[i] += dt;
                if (ages[i] >= lifetimes[i]) {
                    alive[i] = 0;
                    this._gpuFreeSlots.push(i);
                    this._gpuAliveCount--;
                }
            }
        }
    }
    
    /**
     * Clear all GPU compute slots (used by stop/clear).
     * @private
     */
    _gpuClearAllSlots() {
        const gl = this._gpuGL;
        if (!gl) return;
        const zeros = new Float32Array(this.maxParticles * 8);
        for (let b = 0; b < 2; b++) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuStateBuffers[b]);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, zeros);
        }
        this._gpuSlotAlive.fill(0);
        this._gpuSlotAge.fill(0);
        this._gpuSlotLifetime.fill(0);
        this._gpuFreeSlots = [];
        for (let i = this.maxParticles - 1; i >= 0; i--) {
            this._gpuFreeSlots.push(i);
        }
        this._gpuAliveCount = 0;
    }
    
    /**
     * Run GPU physics simulation via Transform Feedback.
     * Reads from current state buffer, writes updated state to the other buffer,
     * then swaps the ping-pong index.
     * @private
     */
    _runGPUPhysics(dt) {
        const gl = this._gpuGL;
        if (!gl || this._gpuAliveCount === 0) return;
        
        const surface = this.gameObject?._engine?.gpuRenderer?.surface;
        if (surface) surface.flush();
        
        gl.useProgram(this._gpuSimProgram);
        
        // ---- Set simulation uniforms ----
        const loc = this._gpuSimLocations;
        gl.uniform1f(loc.u_dt, dt);
        gl.uniform1f(loc.u_gravity, this.gravity);
        gl.uniform1f(loc.u_drag, this.drag);
        gl.uniform1f(loc.u_maxVelocity, this.maxVelocity);
        gl.uniform1f(loc.u_maxVelocitySq, this.maxVelocity * this.maxVelocity);
        
        const orbitalRad = this.orbitalSpeed * (Math.PI / 180) * dt;
        gl.uniform1f(loc.u_orbitalCos, Math.cos(orbitalRad));
        gl.uniform1f(loc.u_orbitalSin, Math.sin(orbitalRad));
        gl.uniform1f(loc.u_vortexStrength, this.vortexStrength);
        
        const emitterPos = this.gameObject?.position || { x: 0, y: 0 };
        gl.uniform2f(loc.u_emitterPos, emitterPos.x, emitterPos.y);
        
        const rotSpeedRad = this.rotateParticles ? this.rotationSpeed * dt * (Math.PI / 180) : 0;
        gl.uniform1f(loc.u_rotSpeedRad, rotSpeedRad);
        gl.uniform1f(loc.u_noiseStrength, this.noiseStrength);
        gl.uniform1f(loc.u_noiseScale, this.noiseScale);
        
        if (this.enableNoiseTurbulence) {
            this._noiseTime += dt * this.noiseSpeed;
        }
        gl.uniform1f(loc.u_noiseTime, this._noiseTime);
        
        // Enable flags
        gl.uniform1f(loc.u_enableDrag, this.drag > 0 ? 1.0 : 0.0);
        gl.uniform1f(loc.u_enableMaxVel, this.maxVelocity > 0 ? 1.0 : 0.0);
        gl.uniform1f(loc.u_enableOrbital, this.orbitalSpeed !== 0 ? 1.0 : 0.0);
        gl.uniform1f(loc.u_enableVortex, this.vortexStrength !== 0 ? 1.0 : 0.0);
        gl.uniform1f(loc.u_enableNoise, this.enableNoiseTurbulence ? 1.0 : 0.0);
        gl.uniform1f(loc.u_enableRotation, this.rotateParticles ? 1.0 : 0.0);
        gl.uniform1f(loc.u_useRelative, this.relativePositioning ? 1.0 : 0.0);
        
        // Force points (max 8)
        const fps = this.enableForcePoints ? this.forcePoints : [];
        const numFP = Math.min(fps.length, 8);
        gl.uniform1i(loc.u_numForcePoints, numFP);
        
        if (numFP > 0) {
            const fpPosStr = this._gpuFPPosStr;
            const fpParams = this._gpuFPParams;
            fpPosStr.fill(0);
            fpParams.fill(0);
            for (let i = 0; i < numFP; i++) {
                const fp = fps[i];
                fpPosStr[i * 4]     = fp.x || 0;
                fpPosStr[i * 4 + 1] = fp.y || 0;
                fpPosStr[i * 4 + 2] = fp.strength || 0;
                fpPosStr[i * 4 + 3] = fp.radius || 200;
                fpParams[i * 2]     = fp.type === 'repel' ? 1.0 : 0.0;
                fpParams[i * 2 + 1] = fp.falloff === 'inverse' ? 1.0 : (fp.falloff === 'constant' ? 2.0 : 0.0);
            }
            gl.uniform4fv(loc.u_fpPosStr, fpPosStr);
            gl.uniform2fv(loc.u_fpParams, fpParams);
        }
        
        // ---- Bind simulation VAO (reads from current state buffer) ----
        gl.bindVertexArray(this._gpuSimVAOs[this._gpuCurrentBuf]);
        
        // ---- Bind transform feedback target (writes to other buffer) ----
        const outputBuf = 1 - this._gpuCurrentBuf;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this._gpuTF);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this._gpuStateBuffers[outputBuf]);
        
        // Disable rasterization (we only want the TF output)
        gl.enable(gl.RASTERIZER_DISCARD);
        
        // Run simulation
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, this.maxParticles);
        gl.endTransformFeedback();
        
        // Re-enable rasterization
        gl.disable(gl.RASTERIZER_DISCARD);
        
        // Unbind transform feedback
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        
        // Swap ping-pong: output becomes current
        this._gpuCurrentBuf = outputBuf;
        
        // Restore engine GL state
        gl.bindVertexArray(null);
        if (surface) {
            gl.bindVertexArray(surface._batchVAO);
            gl.useProgram(surface._shaderProgram);
        }
    }
    
    /**
     * Render particles in GPU Compute mode.
     * Reads directly from the TF output state buffer — zero CPU data packing.
     * @private
     */
    _renderGPUComputeParticles(renderCtx, dt, engine) {
        const surface = renderCtx.surface;
        if (!surface || !surface.gl) return;
        
        const gl = this._gpuGL;
        const loc = this._gpuComputeRenderLocations;
        
        // Cache colors
        if (this._cachedStartColor !== this.startColor) {
            this._cachedStartColor = this.startColor;
            this._cachedStartRgb = this._hexToRgb(this.startColor);
        }
        if (this._cachedEndColor !== this.endColor) {
            this._cachedEndColor = this.endColor;
            this._cachedEndRgb = this._hexToRgb(this.endColor);
        }
        
        // Flush any pending GPURenderer batch
        surface.flush();
        
        gl.useProgram(this._gpuComputeRenderProgram);
        gl.bindVertexArray(this._gpuComputeRenderVAOs[this._gpuCurrentBuf]);
        
        // ---- Set uniforms ----
        const viewport = engine.viewport;
        gl.uniform2f(loc.u_viewOffset, viewport.x, viewport.y);
        gl.uniform1f(loc.u_viewZoom, viewport.zoom);
        gl.uniform2f(loc.u_resolution, engine.renderWidth, engine.renderHeight);
        
        if (this.relativePositioning && this.gameObject) {
            const pos = this.gameObject.position;
            gl.uniform2f(loc.u_objectOffset, pos.x, pos.y);
            gl.uniform1f(loc.u_useRelative, 1.0);
        } else {
            gl.uniform2f(loc.u_objectOffset, 0.0, 0.0);
            gl.uniform1f(loc.u_useRelative, 0.0);
        }
        
        gl.uniform1f(loc.u_startSize, this.startSize);
        gl.uniform1f(loc.u_endSize, this.endSize);
        gl.uniform1f(loc.u_scaleOverLifetime, this.scaleOverLifetime ? 1.0 : 0.0);
        gl.uniform1f(loc.u_fadeOut, this.fadeOut ? 1.0 : 0.0);
        
        const sr = this._cachedStartRgb;
        const er = this._cachedEndRgb;
        gl.uniform3f(loc.u_startColor, sr.r / 255, sr.g / 255, sr.b / 255);
        gl.uniform3f(loc.u_endColor, er.r / 255, er.g / 255, er.b / 255);
        
        // Shape
        if (this._gpuCachedShape !== this.shape) {
            this._gpuCachedShape = this.shape;
            this._gpuCachedShapeId = this._getGPUShapeId();
        }
        gl.uniform1i(loc.u_shape, this._gpuCachedShapeId);
        
        if (this._gpuCachedShapeId >= 4) {
            const gc = this._getCachedGradientColors();
            gl.uniform3f(loc.u_gradientInner, gc.inner.r / 255, gc.inner.g / 255, gc.inner.b / 255);
            gl.uniform3f(loc.u_gradientOuter, gc.outer.r / 255, gc.outer.g / 255, gc.outer.b / 255);
        }
        
        // Blend mode
        this._setGPUBlendMode(gl, this.blendMode);
        
        // Draw all maxParticles instances — dead particles are discarded by vertex shader
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.maxParticles);
        
        // Restore GPUSurface state
        gl.bindVertexArray(surface._batchVAO);
        gl.useProgram(surface._shaderProgram);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, surface._currentTexture || surface._whitePixelTex);
    }
    
    /**
     * Map the ParticleSystem shape property to a shader shape ID.
     * @private
     * @returns {number} Shape ID for the fragment shader
     */
    _getGPUShapeId() {
        switch (this.shape) {
            case 'circle':         return 0;
            case 'square':         return 1;
            case 'triangle':       return 2;
            case 'star':           return 3;
            case 'gradientCircle': return 4;
            case 'gradientSquare': return 5;
            default:               return 0; // fallback to circle
        }
    }
    
    /**
     * Map Canvas2D blend mode string to WebGL2 blend function params.
     * @private
     * @param {WebGL2RenderingContext} gl
     * @param {string} mode - Canvas2D globalCompositeOperation value
     */
    _setGPUBlendMode(gl, mode) {
        gl.enable(gl.BLEND);
        switch (mode) {
            case 'lighter':     // additive blending (great for fire, glow)
                gl.blendFunc(gl.ONE, gl.ONE);
                break;
            case 'multiply':
                gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
                break;
            case 'screen':
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
                break;
            default:            // 'source-over' and others: standard alpha blending
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
                break;
        }
    }
    
    /**
     * GPU shader callback - renders all particles via WebGL2 instanced drawing.
     * Called by the engine's shader callback system each frame.
     * @private
     * @param {*} renderCtx - The GPURenderer (or Canvas2D ctx if GPU disabled)
     * @param {number} dt - Delta time
     * @param {Engine} engine - The engine instance
     */
    _renderGPUParticles(renderCtx, dt, engine) {
        // Guard: only render when we have valid GPU state
        if (!this._gpuInitialized) return;
        if (!this.enabled || !this.gameObject || this.gameObject._pendingDestroy) return;
        
        // GPU Compute path: render directly from TF state buffer
        if (this._gpuComputeInitialized) {
            if (this._gpuAliveCount === 0) return;
            this._renderGPUComputeParticles(renderCtx, dt, engine);
            return;
        }
        
        // Standard GPU instanced path: pack from CPU particles
        if (this._particles.length === 0) return;
        
        // Ensure renderCtx is a GPURenderer (not Canvas2D fallback)
        const surface = renderCtx.surface;
        if (!surface || !surface.gl) return;
        
        const gl = this._gpuGL;
        const particles = this._particles;
        const count = particles.length;
        
        // Pre-calculate interpolated colors (cached, no allocation)
        if (this._cachedStartColor !== this.startColor) {
            this._cachedStartColor = this.startColor;
            this._cachedStartRgb = this._hexToRgb(this.startColor);
        }
        if (this._cachedEndColor !== this.endColor) {
            this._cachedEndColor = this.endColor;
            this._cachedEndRgb = this._hexToRgb(this.endColor);
        }
        const sr = this._cachedStartRgb.r * 0.00392156863; // / 255
        const sg = this._cachedStartRgb.g * 0.00392156863;
        const sb = this._cachedStartRgb.b * 0.00392156863;
        const er = this._cachedEndRgb.r * 0.00392156863;
        const eg = this._cachedEndRgb.g * 0.00392156863;
        const eb = this._cachedEndRgb.b * 0.00392156863;
        
        // ---- Pack particle data into instance buffer ----
        // Reallocate only if needed
        if (!this._gpuInstanceData || this._gpuInstanceData.length < count * 8) {
            this._gpuInstanceData = new Float32Array(Math.max(count, this.maxParticles) * 8);
        }
        
        const data = this._gpuInstanceData;
        const scaleOverLifetime = this.scaleOverLifetime;
        const fadeOut = this.fadeOut;
        const startSize = this.startSize;
        const sizeDelta = this.endSize - startSize;
        const rotateParticles = this.rotateParticles;
        // Pre-compute accumulated rotation speed (approx using last known dt)
        // Rotation is accumulated frame-by-frame, so for GPU mode we track it per-particle
        const rotSpeedRad = this.rotationSpeed * (Math.PI / 180);
        
        for (let i = 0, off = 0; i < count; i++, off += 8) {
            const p = particles[i];
            const t = p.age / p.lifetime;
            
            // Compute size/alpha/rotation inline (skipped in CPU loop for GPU mode)
            const size = scaleOverLifetime ? startSize + sizeDelta * t : startSize;
            const alpha = fadeOut ? 1 - t : 1;
            
            data[off]     = p.x;
            data[off + 1] = p.y;
            data[off + 2] = size;
            data[off + 3] = sr + (er - sr) * t;
            data[off + 4] = sg + (eg - sg) * t;
            data[off + 5] = sb + (eb - sb) * t;
            data[off + 6] = alpha;
            data[off + 7] = p.rotation;
        }
        
        // ---- Flush GPURenderer's pending batch ----
        surface.flush();
        
        // ---- Switch to our program + VAO (no gl.getParameter - just restore known state after) ----
        gl.useProgram(this._gpuProgram);
        gl.bindVertexArray(this._gpuVAO);
        
        // ---- Upload instance data (avoid subarray allocation by using offset+length) ----
        gl.bindBuffer(gl.ARRAY_BUFFER, this._gpuInstanceBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 8);
        
        // ---- Set uniforms ----
        const loc = this._gpuLocations;
        const viewport = engine.viewport;
        
        gl.uniform2f(loc.u_viewOffset, viewport.x, viewport.y);
        gl.uniform1f(loc.u_viewZoom, viewport.zoom);
        gl.uniform2f(loc.u_resolution, engine.renderWidth, engine.renderHeight);
        
        // Object offset for relative positioning
        if (this.relativePositioning && this.gameObject) {
            const pos = this.gameObject.position;
            gl.uniform2f(loc.u_objectOffset, pos.x, pos.y);
            gl.uniform1f(loc.u_useRelative, 1.0);
        } else {
            gl.uniform2f(loc.u_objectOffset, 0.0, 0.0);
            gl.uniform1f(loc.u_useRelative, 0.0);
        }
        
        // Shape (cache to avoid switch every frame)
        if (this._gpuCachedShape !== this.shape) {
            this._gpuCachedShape = this.shape;
            this._gpuCachedShapeId = this._getGPUShapeId();
        }
        gl.uniform1i(loc.u_shape, this._gpuCachedShapeId);
        
        // Gradient colors (only when needed, use cached RGB)
        if (this._gpuCachedShapeId >= 4) {
            const gc = this._getCachedGradientColors();
            gl.uniform3f(loc.u_gradientInner, gc.inner.r * 0.00392156863, gc.inner.g * 0.00392156863, gc.inner.b * 0.00392156863);
            gl.uniform3f(loc.u_gradientOuter, gc.outer.r * 0.00392156863, gc.outer.g * 0.00392156863, gc.outer.b * 0.00392156863);
        }
        
        // ---- Set blend mode ----
        this._setGPUBlendMode(gl, this.blendMode);
        
        // ---- Draw instanced: 6 vertices per quad * count instances ----
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
        this._gpuParticleCount = count;
        
        // ---- Restore GPUSurface state (known state, no gl.getParameter needed) ----
        gl.bindVertexArray(surface._batchVAO);
        gl.useProgram(surface._shaderProgram);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Re-bind the surface's current texture so next batch continues normally
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, surface._currentTexture || surface._whitePixelTex);
    }
    
    /**
     * Check if GPU rendering is available and active for this particle system.
     * @returns {boolean} True if particles are being rendered via GPU shader
     */
    isGPUActive() {
        return this._gpuInitialized;
    }
   
    beginLoop(deltaTime) {
        if (this.useYDepth) {
            // Update Y-depth based on world Y position (for correct layering in top-down view)
            this.gameObject.depth = -this.y;
        }
    }
    
    loop(deltaTime) {
        const gpuCompute = this._gpuComputeInitialized;
        if (!this._isPlaying && this._particles.length === 0 && (!gpuCompute || this._gpuAliveCount === 0)) return;
        
        const dt = deltaTime;
        
        // Emit particles
        if (this._isPlaying) {
            if (this.burst) {
                // Emit all particles at once
                for (let i = 0; i < this.burstCount; i++) {
                    this._emitParticle();
                }
                if (!this.looping) {
                    this._isPlaying = false;
                }
            } else {
                this._emissionTimer += dt;
                
                if (this._emissionTimer >= 1 / this.emissionRate) {
                    const particlesToEmit = Math.floor(this._emissionTimer * this.emissionRate);
                    for (let i = 0; i < particlesToEmit; i++) {
                        this._emitParticle();
                    }
                    this._emissionTimer = this._emissionTimer % (1 / this.emissionRate);
                }
            }
        }
        
        // ---- GPU Compute path: transfer emitted particles to GPU, run TF physics ----
        if (gpuCompute) {
            // Transfer any CPU-emitted particles to GPU state buffer
            while (this._particles.length > 0) {
                this._uploadParticleToGPU(this._particles.pop());
            }
            // Advance CPU-side ages and release dead slots
            this._gpuComputeUpdateAges(dt);
            // Run physics on GPU via Transform Feedback
            this._runGPUPhysics(dt);
            // Advance wind clock (noise clock is advanced inside _runGPUPhysics)
            if (this.enableWind) this._windTime += dt;
            return;
        }
        
        // Update particles (optimized CPU path)
        const particles = this._particles;
        const gravity = this.gravity;
        const enableWind = this.enableWind;
        const gpuMode = this._gpuInitialized;
        const fadeOut = this.fadeOut;
        const scaleOverLifetime = this.scaleOverLifetime;
        const startSize = this.startSize;
        const endSize = this.endSize;
        const rotateParticles = this.rotateParticles;
        const rotationSpeedRad = this.rotateParticles ? this.rotationSpeed * dt * (Math.PI / 180) : 0;
        const checkCollision = this.enableCollision && !gpuMode; // skip collision in GPU mode
        
        // Pre-cache advanced physics flags once per frame
        const applyForcePoints = this.enableForcePoints && this.forcePoints.length > 0 && !gpuMode;
        const applyDrag = this.drag > 0;
        const applyMaxVelocity = this.maxVelocity > 0;
        const applyOrbital = this.orbitalSpeed !== 0;
        const orbitalRad = applyOrbital ? this.orbitalSpeed * (Math.PI / 180) * dt : 0;
        const applyNoise = this.enableNoiseTurbulence && !gpuMode;
        const applyVortex = this.vortexStrength !== 0;
        
        // Emitter world position (needed by force points, orbital, vortex)
        const emitterPos = this.gameObject?.position || { x: 0, y: 0 };
        
        // Advance noise clock
        if (applyNoise) {
            this._noiseTime += dt * this.noiseSpeed;
        }
        
        // Refresh collider cache once per frame (not per particle)
        if (checkCollision) {
            this._colliderCacheTime += dt;
            if (this._colliderCacheTime >= this.colliderCacheInterval) {
                this._colliderCacheTime = 0;
                this._refreshColliderCache();
            }
        }
        
        // Pre-compute wind direction trig once per frame (not per particle)
        if (enableWind) {
            const windAngleRad = this.windDirection * Math.PI / 180;
            this._cachedWindCos = Math.cos(windAngleRad);
            this._cachedWindSin = Math.sin(windAngleRad);
        }
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            p.age += dt;
            
            // Remove dead particles (swap-and-pop: O(1) instead of splice O(n))
            if (p.age >= p.lifetime) {
                this._returnToPool(p);
                const last = particles.length - 1;
                if (i !== last) particles[i] = particles[last];
                particles.length = last;
                continue;
            }
            
            // Update velocity and position
            p.velocityY += gravity * dt;
            p.x += p.velocityX * dt;
            p.y += p.velocityY * dt;
            
            // === Advanced Physics ===
            
            // Force points (attractors / deflectors)
            if (applyForcePoints) {
                this._applyForcePoints(p, dt, emitterPos);
            }
            
            // Vortex (global rotational force around emitter)
            if (applyVortex) {
                this._applyVortex(p, dt, emitterPos);
            }
            
            // Orbital motion (rotate position around emitter)
            if (applyOrbital) {
                this._applyOrbitalMotion(p, orbitalRad, emitterPos);
            }
            
            // Noise-based turbulence
            if (applyNoise) {
                this._applyNoiseTurbulence(p, dt);
            }
            
            // Drag (air resistance — applied after all forces)
            if (applyDrag) {
                const dragFactor = 1 - this.drag * dt;
                p.velocityX *= dragFactor;
                p.velocityY *= dragFactor;
            }
            
            // Max velocity clamp
            if (applyMaxVelocity) {
                const speedSq = p.velocityX * p.velocityX + p.velocityY * p.velocityY;
                const maxV = this.maxVelocity;
                if (speedSq > maxV * maxV) {
                    const scale = maxV / Math.sqrt(speedSq);
                    p.velocityX *= scale;
                    p.velocityY *= scale;
                }
            }
            
            // Apply wind
            if (enableWind) {
                this._applyWindToParticle(p, dt);
            }
            
            // Apply collision detection (CPU-only, skip in GPU mode)
            if (checkCollision) {
                const collisionResult = this._checkParticleCollision(p, dt);
                if (collisionResult.hit) {
                    if (this.destroyOnCollision) {
                        this._returnToPool(p);
                        const last = particles.length - 1;
                        if (i !== last) particles[i] = particles[last];
                        particles.length = last;
                        continue;
                    }
                }
            }
            
            // Rotation is cumulative (velocity-based) so it must always update on CPU.
            if (rotateParticles) {
                p.rotation += rotationSpeedRad;
            }
            
            // In GPU mode, skip size/alpha updates here — 
            // they are computed inline during the GPU instance buffer packing
            // (derivable from age/lifetime). This avoids redundant per-particle writes.
            if (!gpuMode) {
                const progress = p.age / p.lifetime;
                if (scaleOverLifetime) {
                    p.size = startSize + (endSize - startSize) * progress;
                }
                if (fadeOut) {
                    p.alpha = 1 - progress;
                }
            }
        }
        
        // Update wind time for turbulence
        if (enableWind) {
            this._windTime += dt;
        }
    }
    
    /**
     * Apply wind forces to a particle
     * @param {Object} p - The particle object
     * @param {number} dt - Delta time in seconds
     */
    _applyWindToParticle(p, dt) {
        // Get effective wind settings (from environment or custom)
        let windDirection = this.windDirection;
        let windStrength = this.windStrength;
        let windTurbulence = this.windTurbulence;
        // Use pre-computed trig from loop() (avoids per-particle cos/sin)
        let windX = this._cachedWindCos;
        let windY = this._cachedWindSin;
        let needsRecalcTrig = false;
        
        // Get particle world position for wind zone detection
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        let particleWorldX, particleWorldY;
        if (this.relativePositioning) {
            particleWorldX = worldPos.x + p.x;
            particleWorldY = worldPos.y + p.y;
        } else {
            particleWorldX = p.x;
            particleWorldY = p.y;
        }
        
        // Use blended wind if available (includes environment + wind zones)
        if (this.useEnvironmentWind && typeof getBlendedWindAtPoint === 'function') {
            const blendedWind = getBlendedWindAtPoint(particleWorldX, particleWorldY, true);
            windDirection = blendedWind.direction;
            windStrength = blendedWind.strength;
            windTurbulence = blendedWind.turbulence;
            needsRecalcTrig = true;
        } else if (this.useEnvironmentWind) {
            // Fallback to just environment wind
            const windData = weatherGetWind();
            if (windData) {
                windDirection = windData.direction;
                windStrength = windData.strength;
                windTurbulence = windData.turbulence;
                needsRecalcTrig = true;
            }
        } else {
            // Check if any wind zones affect this particle (only if not using custom wind)
            if (typeof getBlendedWindAtPoint === 'function') {
                const zoneWind = getBlendedWindAtPoint(particleWorldX, particleWorldY, false);
                if (zoneWind.strength > 0) {
                    // Blend custom wind with zone wind
                    const customWeight = windStrength;
                    const zoneWeight = zoneWind.strength;
                    const totalWeight = customWeight + zoneWeight;
                    
                    if (totalWeight > 0) {
                        const customX = this._cachedWindCos * windStrength;
                        const customY = this._cachedWindSin * windStrength;
                        
                        const blendedX = (customX * customWeight + zoneWind.x * zoneWeight) / totalWeight;
                        const blendedY = (customY * customWeight + zoneWind.y * zoneWeight) / totalWeight;
                        
                        windStrength = Math.sqrt(blendedX * blendedX + blendedY * blendedY);
                        windDirection = Math.atan2(blendedY, blendedX) * 180 / Math.PI;
                        windTurbulence = (windTurbulence * customWeight + zoneWind.turbulence * zoneWeight) / totalWeight;
                        needsRecalcTrig = true;
                    }
                }
            }
        }
        
        // Only recalculate trig if wind direction was overridden by environment/zones
        if (needsRecalcTrig) {
            const windAngleRad = windDirection * Math.PI / 180;
            windX = Math.cos(windAngleRad);
            windY = Math.sin(windAngleRad);
        }
        
        // Add turbulence variation
        const particlePhase = this._windTime + (p.phaseOffset || 0);
        const turbX = windTurbulence * (
            Math.sin(particlePhase * 3.7 + p.x * 0.01) * 0.5 +
            Math.sin(particlePhase * 2.3 + p.y * 0.01) * 0.3
        ) * windStrength * 0.5;
        const turbY = windTurbulence * (
            Math.sin(particlePhase * 2.9 + p.y * 0.01) * 0.5 +
            Math.sin(particlePhase * 4.1 + p.x * 0.01) * 0.3
        ) * windStrength * 0.3;
        
        // Calculate force (resistance reduces effect)
        const forceMagnitude = windStrength * (1 - this.windResistance) * 0.5;
        
        // Apply force to particle velocity
        p.velocityX += (windX * forceMagnitude + turbX) * dt;
        p.velocityY += (windY * forceMagnitude + turbY) * dt;
    }
    
    // ==================== ADVANCED PHYSICS ====================
    
    /**
     * Apply force points (attractors / deflectors) to a particle.
     * Each force point has { x, y, strength, radius, type, falloff }.
     *   - type 'attract': pulls particles toward the point
     *   - type 'repel':   pushes particles away from the point
     *   - falloff: 'linear' (default), 'inverse', 'constant'
     * Positions are relative to the game object.
     * @private
     */
    _applyForcePoints(p, dt, emitterPos) {
        const fps = this.forcePoints;
        const isRelative = this.relativePositioning;
        
        for (let fi = 0; fi < fps.length; fi++) {
            const fp = fps[fi];
            if (!fp || fp.strength === 0) continue;
            
            // Force point world position
            const fpWorldX = emitterPos.x + (fp.x || 0);
            const fpWorldY = emitterPos.y + (fp.y || 0);
            
            // Particle world position
            let pwx, pwy;
            if (isRelative) {
                pwx = emitterPos.x + p.x;
                pwy = emitterPos.y + p.y;
            } else {
                pwx = p.x;
                pwy = p.y;
            }
            
            const dx = fpWorldX - pwx;
            const dy = fpWorldY - pwy;
            const distSq = dx * dx + dy * dy;
            const radius = fp.radius || 200;
            
            if (distSq > radius * radius || distSq < 0.01) continue;
            
            const dist = Math.sqrt(distSq);
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Calculate force magnitude based on falloff
            let force = fp.strength;
            const falloff = fp.falloff || 'linear';
            if (falloff === 'linear') {
                force *= (1 - dist / radius);
            } else if (falloff === 'inverse') {
                force *= (radius / (dist + 1));
            }
            // 'constant' = no attenuation
            
            // Negative = attract, positive direction toward point
            const sign = (fp.type === 'repel') ? -1 : 1;
            
            p.velocityX += dirX * force * sign * dt;
            p.velocityY += dirY * force * sign * dt;
        }
    }
    
    /**
     * Apply vortex force — a rotational force around the emitter origin.
     * Positive = counter-clockwise, negative = clockwise.
     * @private
     */
    _applyVortex(p, dt, emitterPos) {
        const isRelative = this.relativePositioning;
        let dx, dy;
        if (isRelative) {
            dx = p.x;
            dy = p.y;
        } else {
            dx = p.x - emitterPos.x;
            dy = p.y - emitterPos.y;
        }
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return;
        
        // Tangent direction (perpendicular to radial)
        const tangentX = -dy / dist;
        const tangentY = dx / dist;
        
        const force = this.vortexStrength;
        p.velocityX += tangentX * force * dt;
        p.velocityY += tangentY * force * dt;
    }
    
    /**
     * Apply orbital motion — rotates the particle's position around the emitter.
     * This is distinct from vortex: orbital moves the position, vortex adds velocity.
     * @private
     */
    _applyOrbitalMotion(p, orbitalRad, emitterPos) {
        let dx, dy;
        if (this.relativePositioning) {
            dx = p.x;
            dy = p.y;
        } else {
            dx = p.x - emitterPos.x;
            dy = p.y - emitterPos.y;
        }
        
        const cos = Math.cos(orbitalRad);
        const sin = Math.sin(orbitalRad);
        const nx = dx * cos - dy * sin;
        const ny = dx * sin + dy * cos;
        
        if (this.relativePositioning) {
            p.x = nx;
            p.y = ny;
        } else {
            p.x = emitterPos.x + nx;
            p.y = emitterPos.y + ny;
        }
        
        // Also rotate velocity to match the orbit
        const vx = p.velocityX * cos - p.velocityY * sin;
        const vy = p.velocityX * sin + p.velocityY * cos;
        p.velocityX = vx;
        p.velocityY = vy;
    }
    
    /**
     * Apply noise-based turbulence to a particle.
     * Uses a simple hash-based coherent noise (cheaper than Perlin)
     * to create smooth, swirling motion independent of the wind system.
     * @private
     */
    _applyNoiseTurbulence(p, dt) {
        const scale = this.noiseScale;
        const t = this._noiseTime;
        const px = p.x * scale;
        const py = p.y * scale;
        
        // Simple 2D coherent noise via sine hashing (fast, no lookup tables)
        const n1 = Math.sin(px * 127.1 + py * 311.7 + t * 1.3) * 43758.5453;
        const n2 = Math.sin(px * 269.5 + py * 183.3 + t * 2.1) * 43758.5453;
        const noiseX = (n1 - Math.floor(n1)) * 2 - 1;  // -1 to 1
        const noiseY = (n2 - Math.floor(n2)) * 2 - 1;
        
        const strength = this.noiseStrength;
        p.velocityX += noiseX * strength * dt;
        p.velocityY += noiseY * strength * dt;
    }
    
    /**
     * Refresh the cached list of colliders in the scene
     * @private
     */
    _refreshColliderCache() {
        this._cachedColliders = [];
        const engine = this.gameObject?._engine;
        if (!engine) return;
        
        const tagList = this.collideWithTags.split(',').map(t => t.trim().toLowerCase());
        
        // Get all active instances in the scene (engine.instances holds runtime objects)
        const allObjects = engine.instances || engine.currentScene?.instances || [];
        
        for (let oi = 0; oi < allObjects.length; oi++) {
            const obj = allObjects[oi];
            if (!obj || obj === this.gameObject || !obj.getModule) continue;
            
            // Check for BoxCollider
            const boxCollider = obj.getModule('BoxCollider');
            if (boxCollider && boxCollider.enabled !== false) {
                const colliderTag = (boxCollider.tag || 'solid').toLowerCase();
                if (tagList.includes(colliderTag)) {
                    this._cachedColliders.push({ type: 'box', collider: boxCollider, gameObject: obj });
                }
            }
            
            // Check for SphereCollider
            const sphereCollider = obj.getModule('SphereCollider');
            if (sphereCollider && sphereCollider.enabled !== false) {
                const colliderTag = (sphereCollider.tag || 'solid').toLowerCase();
                if (tagList.includes(colliderTag)) {
                    this._cachedColliders.push({ type: 'sphere', collider: sphereCollider, gameObject: obj });
                }
            }
            
            // Check for PolygonCollider
            const polyCollider = obj.getModule('PolygonCollider');
            if (polyCollider && polyCollider.enabled !== false) {
                const colliderTag = (polyCollider.tag || 'solid').toLowerCase();
                if (tagList.includes(colliderTag)) {
                    this._cachedColliders.push({ type: 'polygon', collider: polyCollider, gameObject: obj });
                }
            }
        }
    }
    
    /**
     * Check particle collision with all cached colliders
     * @param {Object} p - The particle
     * @param {number} dt - Delta time
     * @returns {Object} Collision result { hit: boolean, normal: {x, y} }
     * @private
     */
    _checkParticleCollision(p, dt) {
        // Cache refresh is now handled once per frame in loop(),
        // not per-particle here (which over-accumulated dt).
        
        // Get particle world position
        const worldPos = this.gameObject.position || { x: 0, y: 0 };
        let particleWorldX, particleWorldY;
        if (this.relativePositioning) {
            particleWorldX = worldPos.x + p.x;
            particleWorldY = worldPos.y + p.y;
        } else {
            particleWorldX = p.x;
            particleWorldY = p.y;
        }
        
        const particleRadius = (p.size || this.startSize) * this.collisionRadius * 0.5;
        
        for (const cached of this._cachedColliders) {
            let hit = false;
            let normal = { x: 0, y: -1 }; // Default normal pointing up
            
            if (cached.type === 'box') {
                const result = this._checkBoxCollision(particleWorldX, particleWorldY, particleRadius, cached.collider);
                if (result.hit) {
                    hit = true;
                    normal = result.normal;
                }
            } else if (cached.type === 'sphere') {
                const result = this._checkSphereCollision(particleWorldX, particleWorldY, particleRadius, cached.collider);
                if (result.hit) {
                    hit = true;
                    normal = result.normal;
                }
            } else if (cached.type === 'polygon') {
                const result = this._checkPolygonCollision(particleWorldX, particleWorldY, particleRadius, cached.collider);
                if (result.hit) {
                    hit = true;
                    normal = result.normal;
                }
            }
            
            if (hit) {
                // Apply collision response
                this._applyCollisionResponse(p, normal, particleWorldX, particleWorldY, cached);
                return { hit: true, normal: normal };
            }
        }
        
        return { hit: false, normal: null };
    }
    
    /**
     * Check collision with a BoxCollider
     * Handles both axis-aligned and rotated boxes correctly.
     * Rotated boxes use getWorldPoints() so the collision normal
     * follows the actual surface angle, allowing particles to slide
     * smoothly along angled edges.
     * @private
     */
    _checkBoxCollision(px, py, radius, boxCollider) {
        // If box is rotated, delegate to polygon-style check using its world points
        // so that collision normals follow the actual rotated edges
        if (boxCollider.getWorldPoints && !boxCollider.isAxisAligned()) {
            const points = boxCollider.getWorldPoints();
            if (points && points.length >= 3) {
                return this._checkPolygonCollision(px, py, radius, { getWorldPoints: () => points });
            }
        }

        // Axis-aligned fast path (no rotation)
        const bounds = boxCollider.getBounds();
        if (!bounds) return { hit: false };
        
        // Find closest point on box to particle
        const closestX = Math.max(bounds.left, Math.min(px, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(py, bounds.bottom));
        
        // Distance from particle to closest point
        const dx = px - closestX;
        const dy = py - closestY;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < radius * radius) {
            // Calculate collision normal
            let normalX = dx;
            let normalY = dy;
            const dist = Math.sqrt(distSq);
            
            if (dist > 0.0001) {
                normalX /= dist;
                normalY /= dist;
            } else {
                // Particle is inside box, find closest edge
                const distLeft = px - bounds.left;
                const distRight = bounds.right - px;
                const distTop = py - bounds.top;
                const distBottom = bounds.bottom - py;
                
                const minDist = Math.min(distLeft, distRight, distTop, distBottom);
                if (minDist === distLeft) { normalX = -1; normalY = 0; }
                else if (minDist === distRight) { normalX = 1; normalY = 0; }
                else if (minDist === distTop) { normalX = 0; normalY = -1; }
                else { normalX = 0; normalY = 1; }
            }
            
            return { hit: true, normal: { x: normalX, y: normalY } };
        }
        
        return { hit: false };
    }
    
    /**
     * Check collision with a SphereCollider
     * @private
     */
    _checkSphereCollision(px, py, radius, sphereCollider) {
        const center = sphereCollider.getCenter();
        if (!center) return { hit: false };
        
        const worldScale = sphereCollider.gameObject.getWorldScale();
        const sphereRadius = sphereCollider.radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y));
        
        const dx = px - center.x;
        const dy = py - center.y;
        const distSq = dx * dx + dy * dy;
        const combinedRadius = radius + sphereRadius;
        
        if (distSq < combinedRadius * combinedRadius) {
            const dist = Math.sqrt(distSq);
            let normalX = dx;
            let normalY = dy;
            
            if (dist > 0.0001) {
                normalX /= dist;
                normalY /= dist;
            } else {
                // Default normal if perfectly overlapping
                normalX = 0;
                normalY = -1;
            }
            
            return { hit: true, normal: { x: normalX, y: normalY } };
        }
        
        return { hit: false };
    }
    
    /**
     * Check collision with a PolygonCollider (or any shape providing getWorldPoints()).
     * Edge normals are always oriented outward from the collider so that
     * _applyCollisionResponse can correctly strip the into-surface velocity
     * component and let the particle slide along the surface.
     * @private
     */
    _checkPolygonCollision(px, py, radius, polyCollider) {
        const points = polyCollider.getWorldPoints ? polyCollider.getWorldPoints() : null;
        if (!points || points.length < 3) return { hit: false };
        
        // Check if point is inside polygon using ray casting
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        // Also check distance to edges (for particle radius)
        let minDistSq = Infinity;
        let closestNormal = { x: 0, y: -1 };
        let closestDx = 0, closestDy = 0;
        
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            // Find closest point on edge segment
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const edgeLenSq = edgeX * edgeX + edgeY * edgeY;
            
            if (edgeLenSq < 0.0001) continue;
            
            let t = ((px - p1.x) * edgeX + (py - p1.y) * edgeY) / edgeLenSq;
            t = Math.max(0, Math.min(1, t));
            
            const closestX = p1.x + t * edgeX;
            const closestY = p1.y + t * edgeY;
            
            const dx = px - closestX;
            const dy = py - closestY;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestDx = dx;
                closestDy = dy;
                // Edge normal (perpendicular to edge)
                const edgeLen = Math.sqrt(edgeLenSq);
                closestNormal = { x: -edgeY / edgeLen, y: edgeX / edgeLen };
            }
        }
        
        // Hit if inside polygon or close enough to edge
        if (inside || minDistSq < radius * radius) {
            // Ensure normal points OUTWARD from the collider surface.
            // When outside: outward = toward particle → same direction as (closestDx, closestDy)
            // When inside:  outward = toward nearest surface exit → opposite to (closestDx, closestDy)
            const dotNP = closestNormal.x * closestDx + closestNormal.y * closestDy;
            if (!inside && dotNP < 0) {
                closestNormal.x = -closestNormal.x;
                closestNormal.y = -closestNormal.y;
            } else if (inside && dotNP > 0) {
                closestNormal.x = -closestNormal.x;
                closestNormal.y = -closestNormal.y;
            }
            return { hit: true, normal: closestNormal };
        }
        
        return { hit: false };
    }
    
    /**
     * Apply collision response - slides particle along the collider surface.
     * Simply strips the into-surface velocity component so the particle
     * continues along the surface tangent at its current speed.
     * @private
     */
    _applyCollisionResponse(p, normal, worldX, worldY, cached) {
        // How much velocity is going INTO the surface
        const velDotNormal = p.velocityX * normal.x + p.velocityY * normal.y;
        
        // Only respond if moving towards the surface
        if (velDotNormal < 0) {
            // Remove ONLY the normal component (the part going into the surface).
            // What remains is the tangent component — the slide direction.
            p.velocityX -= velDotNormal * normal.x;
            p.velocityY -= velDotNormal * normal.y;
            
            // Nudge particle just outside the collider so it doesn't re-trigger
            p.x += normal.x * 1.5;
            p.y += normal.y * 1.5;
        }
    }
    
    /**
     * Get cached start/end RGB colors (avoids parsing hex every frame)
     */
    _getCachedColors() {
        if (this._cachedStartColor !== this.startColor) {
            this._cachedStartColor = this.startColor;
            this._cachedStartRgb = this._hexToRgb(this.startColor);
        }
        if (this._cachedEndColor !== this.endColor) {
            this._cachedEndColor = this.endColor;
            this._cachedEndRgb = this._hexToRgb(this.endColor);
        }
        return { start: this._cachedStartRgb, end: this._cachedEndRgb };
    }
    
    /**
     * Get cached gradient inner/outer RGB colors
     * @private
     */
    _getCachedGradientColors() {
        if (this._cachedGradientInnerColor !== this.gradientInnerColor) {
            this._cachedGradientInnerColor = this.gradientInnerColor;
            this._cachedGradientInnerRgb = this._hexToRgb(this.gradientInnerColor);
        }
        if (this._cachedGradientOuterColor !== this.gradientOuterColor) {
            this._cachedGradientOuterColor = this.gradientOuterColor;
            this._cachedGradientOuterRgb = this._hexToRgb(this.gradientOuterColor);
        }
        return { inner: this._cachedGradientInnerRgb, outer: this._cachedGradientOuterRgb };
    }
    
    /**
     * Get or create a cached offscreen gradient texture.
     * Only re-renders when gradient colors, type, or shape change.
     * Returns a canvas that can be stamped with drawImage() per particle.
     * @private
     * @param {string} shape - 'gradientCircle' or 'gradientSquare'
     * @returns {HTMLCanvasElement} Cached gradient texture canvas
     */
    _getGradientTexture(shape) {
        const texSize = 64; // Resolution of cached gradient texture
        const cacheKey = `${shape}_${this.gradientInnerColor}_${this.gradientOuterColor}_${this.gradientType}`;
        
        if (this._gradientCacheKey === cacheKey && this._gradientCanvas) {
            return this._gradientCanvas;
        }
        
        // Create or resize offscreen canvas
        if (!this._gradientCanvas) {
            this._gradientCanvas = document.createElement('canvas');
            this._gradientCtx = this._gradientCanvas.getContext('2d');
        }
        this._gradientCanvas.width = texSize;
        this._gradientCanvas.height = texSize;
        
        const gCtx = this._gradientCtx;
        const half = texSize / 2;
        const innerRgb = this._getCachedGradientColors().inner;
        const outerRgb = this._getCachedGradientColors().outer;
        
        gCtx.clearRect(0, 0, texSize, texSize);
        
        if (shape === 'gradientCircle') {
            const gradient = gCtx.createRadialGradient(half, half, 0, half, half, half);
            gradient.addColorStop(0, `rgba(${innerRgb.r}, ${innerRgb.g}, ${innerRgb.b}, 1)`);
            gradient.addColorStop(1, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 0.3)`);
            gCtx.fillStyle = gradient;
            gCtx.beginPath();
            gCtx.arc(half, half, half, 0, Math.PI * 2);
            gCtx.fill();
        } else if (shape === 'gradientSquare') {
            let gradient;
            if (this.gradientType === 'radial') {
                gradient = gCtx.createRadialGradient(half, half, 0, half, half, half * 1.414);
                gradient.addColorStop(0, `rgba(${innerRgb.r}, ${innerRgb.g}, ${innerRgb.b}, 1)`);
                gradient.addColorStop(1, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 0.3)`);
            } else {
                gradient = gCtx.createLinearGradient(0, 0, texSize, texSize);
                gradient.addColorStop(0, `rgba(${innerRgb.r}, ${innerRgb.g}, ${innerRgb.b}, 1)`);
                gradient.addColorStop(1, `rgba(${outerRgb.r}, ${outerRgb.g}, ${outerRgb.b}, 1)`);
            }
            gCtx.fillStyle = gradient;
            gCtx.fillRect(0, 0, texSize, texSize);
        }
        
        this._gradientCacheKey = cacheKey;
        return this._gradientCanvas;
    }
    
    /**
     * Get or create a cached offscreen canvas for a text character.
     * Each unique character is rasterised once at the base fontSize;
     * at draw time it's stamped with drawImage() instead of the
     * extremely expensive ctx.font + ctx.fillText path.
     * Non-emoji characters are rendered in white so they can be
     * colour-tinted at draw time via a composite blit.
     * @private
     * @param {string} char - The character / emoji to cache
     * @returns {{ canvas: HTMLCanvasElement, width: number, height: number, isEmoji: boolean }}
     */
    _getTextCharCanvas(char) {
        // Invalidate cache if font settings changed
        const cacheKey = `${this.fontSize}_${this.fontFamily}_${this.fontWeight}`;
        if (cacheKey !== this._textCacheKey) {
            this._textCharCache.clear();
            this._textCacheKey = cacheKey;
        }
        
        let cached = this._textCharCache.get(char);
        if (cached) return cached;
        
        // Detect emoji (cache the result per character)
        const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1FA00}-\u{1FA9F}]/u.test(char);
        
        // Render at base fontSize with padding to prevent clipping
        const padding = Math.ceil(this.fontSize * 0.3);
        const size = this.fontSize + padding * 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const charCtx = canvas.getContext('2d');
        
        charCtx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        charCtx.textAlign = 'center';
        charCtx.textBaseline = 'middle';
        charCtx.fillStyle = 'white'; // White for tintable non-emoji; neutral for emoji
        charCtx.fillText(char, size / 2, size / 2);
        
        cached = { canvas, width: size, height: size, isEmoji };
        this._textCharCache.set(char, cached);
        return cached;
    }
    
    /**
     * Parse particleText into an array of grapheme clusters,
     * handling multi-codepoint emoji correctly.
     * Cached until particleText changes.
     * @private
     * @returns {string[]}
     */
    _getTextChars() {
        if (this._textChars && this._textCharsSource === this.particleText) {
            return this._textChars;
        }
        this._textCharsSource = this.particleText;
        // Use Intl.Segmenter for proper grapheme cluster splitting when available
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
            this._textChars = [...segmenter.segment(this.particleText)].map(s => s.segment);
        } else {
            // Fallback: spread splits on code points (handles most emoji except ZWJ sequences)
            this._textChars = [...this.particleText];
        }
        return this._textChars;
    }
    
    draw(ctx) {
        // Skip Canvas2D rendering when GPU instanced rendering is active
        // (particles are drawn via the shader callback instead)
        if (this._gpuInitialized) return;
        
        // Get image if shape is 'image' (same approach as SpriteRenderer)
        let particleImage = null;
        if (this.shape === 'image' && this.imagePath) {
            const engine = this.gameObject._engine;
            if (engine && engine.assets) {
                // Extract just the filename from the path (in case full path was provided)
                const fileName = this.imagePath.split('/').pop().split('\\').pop();
                particleImage = engine.assets.getImage(fileName);
            }
        }
        
        // Use untethered drawing for world-space particles
        if (!this.relativePositioning) {
            this.drawUntethered(ctx);
        }
        
        // Pre-calculate colors once per frame
        const colors = this._getCachedColors();
        const startRgb = colors.start;
        const endRgb = colors.end;
        
        // Use batched rendering for simple shapes (circles/squares) when enabled
        if (this.enableBatching && (this.shape === 'circle' || this.shape === 'square') && !this.rotateParticles && !this.randomRotation) {
            this._drawBatched(ctx, startRgb, endRgb);
        } else {
            // Standard per-particle rendering
            this._drawStandard(ctx, startRgb, endRgb, particleImage);
        }
        
        // Restore tethered drawing if we switched to untethered
        if (!this.relativePositioning) {
            this.drawTethered(ctx);
        }
    }
    
    /**
     * Batched particle rendering - reduces draw calls by grouping particles
     * @private
     */
    _drawBatched(ctx, startRgb, endRgb) {
        if (this._particles.length === 0) return;
        
        // Save context state for blend mode
        const previousBlendMode = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = this.blendMode;
        
        // Group particles by color bucket (quantize to reduce unique colors)
        const colorBuckets = new Map();
        const bucketSize = 32; // Color quantization factor (larger = fewer batches)
        
        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            const progress = p.age / p.lifetime;
            
            // Calculate and quantize color
            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
            
            // Bucket by quantized color and alpha
            const rBucket = Math.floor(r / bucketSize) * bucketSize;
            const gBucket = Math.floor(g / bucketSize) * bucketSize;
            const bBucket = Math.floor(b / bucketSize) * bucketSize;
            const alphaBucket = Math.floor(p.alpha * 4) / 4; // Quantize alpha to 4 levels
            
            const key = `${rBucket},${gBucket},${bBucket},${alphaBucket}`;
            
            if (!colorBuckets.has(key)) {
                colorBuckets.set(key, {
                    r: rBucket, g: gBucket, b: bBucket, alpha: alphaBucket,
                    particles: []
                });
            }
            colorBuckets.get(key).particles.push(p);
        }
        
        // Draw each color bucket - reduce state changes by grouping
        for (const [, bucket] of colorBuckets) {
            ctx.globalAlpha = bucket.alpha;
            ctx.fillStyle = `rgb(${bucket.r}, ${bucket.g}, ${bucket.b})`;
            
            if (this.shape === 'circle') {
                // Draw circles - each as separate subpath to avoid connecting lines
                for (const p of bucket.particles) {
                    const halfSize = p.size / 2;
                    // Skip particles that are too small (prevents rendering artifacts)
                    if (halfSize < 0.5) continue;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, halfSize, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (this.shape === 'square') {
                // Batch squares - fillRect doesn't connect
                for (const p of bucket.particles) {
                    // Skip particles that are too small
                    if (p.size < 1) continue;
                    const halfSize = p.size / 2;
                    ctx.fillRect(p.x - halfSize, p.y - halfSize, p.size, p.size);
                }
            }
        }
        
        // Reset alpha and blend mode
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previousBlendMode;
    }
    
    /**
     * Standard per-particle rendering (used when batching not possible)
     * @private
     */
    _drawStandard(ctx, startRgb, endRgb, particleImage) {
        // Render particles using for loop (avoids forEach overhead)
        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            
            // Skip particles that are too small (prevents rendering artifacts and lines)
            if (p.size < 1 && this.shape !== 'text') continue;
            
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.globalCompositeOperation = this.blendMode;
            
            // Interpolate color
            const progress = p.age / p.lifetime;
            
            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            // Apply rotation
            ctx.translate(p.x, p.y);
            if (this.rotateParticles || this.randomRotation) {
                ctx.rotate(p.rotation);
            }
            
            const halfSize = p.size / 2;
            
            if (this.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            } else if (this.shape === 'square') {
                ctx.fillRect(-halfSize, -halfSize, p.size, p.size);
            } else if (this.shape === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(0, -halfSize);
                ctx.lineTo(halfSize, halfSize);
                ctx.lineTo(-halfSize, halfSize);
                ctx.closePath();
                ctx.fill();
            } else if (this.shape === 'star') {
                this._drawStar(ctx, 0, 0, 5, halfSize, halfSize / 2);
                ctx.fill();
            } else if (this.shape === 'image') {
                if (particleImage) {
                    // Calculate image dimensions based on particle progress
                    let imgWidth, imgHeight;
                    if (this.scaleImageOverLifetime) {
                        imgWidth = this.imageWidth + (this.endImageWidth - this.imageWidth) * progress;
                        imgHeight = this.imageHeight + (this.endImageHeight - this.imageHeight) * progress;
                    } else {
                        imgWidth = this.imageWidth;
                        imgHeight = this.imageHeight;
                    }
                    // Draw the particle image centered
                    ctx.drawImage(particleImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                } else {
                    // Fallback to circle if image not loaded
                    ctx.beginPath();
                    ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (this.shape === 'text') {
                // Use pre-rendered character canvas — avoids ctx.font parsing
                // and fillText glyph rasterisation per particle (major perf win).
                const char = p.textChar || this.particleText[0] || '$';
                const charData = this._getTextCharCanvas(char);
                const scaleRatio = this.scaleOverLifetime ? (p.size / this.startSize) : 1;
                const drawSize = charData.width * scaleRatio;
                const halfDraw = drawSize / 2;
                
                if (charData.isEmoji) {
                    // Emoji: draw cached canvas directly (retains native colours)
                    ctx.drawImage(charData.canvas, -halfDraw, -halfDraw, drawSize, drawSize);
                } else {
                    // Non-emoji: tint the white cached glyph with the particle colour.
                    // Uses a small shared canvas + source-in composite to apply colour.
                    if (!this._textTintCanvas) {
                        this._textTintCanvas = document.createElement('canvas');
                        this._textTintCtx = this._textTintCanvas.getContext('2d');
                    }
                    const baseSize = charData.width;
                    if (this._textTintCanvas.width !== baseSize || this._textTintCanvas.height !== baseSize) {
                        this._textTintCanvas.width = baseSize;
                        this._textTintCanvas.height = baseSize;
                    }
                    const tc = this._textTintCtx;
                    tc.clearRect(0, 0, baseSize, baseSize);
                    tc.globalCompositeOperation = 'source-over';
                    tc.drawImage(charData.canvas, 0, 0);
                    tc.globalCompositeOperation = 'source-in';
                    tc.fillStyle = ctx.fillStyle; // Re-use the already-computed particle colour
                    tc.fillRect(0, 0, baseSize, baseSize);
                    tc.globalCompositeOperation = 'source-over';
                    ctx.drawImage(this._textTintCanvas, -halfDraw, -halfDraw, drawSize, drawSize);
                }
            } else if (this.shape === 'gradientCircle' || this.shape === 'gradientSquare') {
                // Use pre-rendered gradient texture — avoids creating a new
                // CanvasGradient object per particle per frame (major perf win).
                const gradTex = this._getGradientTexture(this.shape);
                ctx.drawImage(gradTex, -halfSize, -halfSize, p.size, p.size);
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Draw particles using PixiJS for hardware-accelerated rendering
     * Called by the engine when in PixiJS mode
     * @param {PixiJSManager} pixiManager - The PixiJS manager instance
     */
    drawPixi(pixiManager) {
        if (!this._isPlaying && this._particles.length === 0) return;
        if (!pixiManager || !pixiManager.isInitialized) return;
        
        // Get the PIXI namespace
        const PIXI = window.PIXI;
        if (!PIXI) return;
        
        // Initialize PixiJS container if needed
        if (!this._pixiContainer) {
            this._pixiContainer = new PIXI.Container();
            this._pixiContainer.sortableChildren = true;
            // Note: Container will be added to parent by Module.drawPixi infrastructure
        }
        
        // Initialize graphics object for shape-based particles
        if (!this._pixiGraphics) {
            this._pixiGraphics = new PIXI.Graphics();
            this._pixiContainer.addChild(this._pixiGraphics);
        }
        
        // Load particle image sprite texture if needed
        if (this.shape === 'image' && this.imagePath && !this._pixiTexture && !this._loadingPixiTexture) {
            this._loadingPixiTexture = true;
            const engine = this.gameObject?._engine;
            if (engine && engine.assets) {
                const fileName = this.imagePath.split('/').pop().split('\\').pop();
                const img = engine.assets.getImage(fileName);
                if (img) {
                    this._pixiTexture = PIXI.Texture.from(img);
                }
            }
            this._loadingPixiTexture = false;
        }
        
        // Calculate world position for particle rendering
        let offsetX = 0, offsetY = 0;
        if (this.relativePositioning && this.gameObject) {
            const pos = this.worldPosition;
            offsetX = pos.x;
            offsetY = pos.y;
        }
        
        const graphics = this._pixiGraphics;
        graphics.clear();
        
        // Pre-calculate colors
        const startRgb = this._hexToRgb(this.startColor);
        const endRgb = this._hexToRgb(this.endColor);
        
        // Create/update sprite pool for image particles
        if (this.shape === 'image' && this._pixiTexture) {
            // Ensure we have enough sprites
            if (!this._pixiSprites) this._pixiSprites = [];
            
            while (this._pixiSprites.length < this._particles.length) {
                const sprite = new PIXI.Sprite(this._pixiTexture);
                sprite.anchor.set(0.5, 0.5);
                this._pixiContainer.addChild(sprite);
                this._pixiSprites.push(sprite);
            }
            
            // Remove excess sprites if pool grew too large (prevent memory leak)
            const maxPoolSize = Math.max(this.maxParticles, this._particles.length) + 10;
            while (this._pixiSprites.length > maxPoolSize) {
                const sprite = this._pixiSprites.pop();
                if (sprite.parent) sprite.parent.removeChild(sprite);
                sprite.destroy();
            }
            
            // Hide unused sprites
            for (let i = this._particles.length; i < this._pixiSprites.length; i++) {
                this._pixiSprites[i].visible = false;
            }
            
            // Update visible sprites
            for (let i = 0; i < this._particles.length; i++) {
                const p = this._particles[i];
                const sprite = this._pixiSprites[i];
                const progress = p.age / p.lifetime;
                
                sprite.visible = true;
                sprite.x = p.x + offsetX;
                sprite.y = p.y + offsetY;
                sprite.alpha = p.alpha;
                sprite.rotation = p.rotation;
                
                // Calculate size
                let imgWidth, imgHeight;
                if (this.scaleImageOverLifetime) {
                    imgWidth = this.imageWidth + (this.endImageWidth - this.imageWidth) * progress;
                    imgHeight = this.imageHeight + (this.endImageHeight - this.imageHeight) * progress;
                } else {
                    imgWidth = this.imageWidth;
                    imgHeight = this.imageHeight;
                }
                sprite.width = imgWidth;
                sprite.height = imgHeight;
                
                // Interpolate color tint
                const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
                const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
                const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
                sprite.tint = (r << 16) | (g << 8) | b;
            }
        } else {
            // Hide any existing image sprites when not using image shape
            if (this._pixiSprites) {
                for (const sprite of this._pixiSprites) {
                    sprite.visible = false;
                }
            }
            
            // ── Text particles: use sprite pool from cached character canvases ──
            if (this.shape === 'text') {
                if (!this._pixiTextSprites) this._pixiTextSprites = [];
                if (!this._pixiTextTextures) this._pixiTextTextures = new Map();
                
                // Ensure enough sprites in the pool
                while (this._pixiTextSprites.length < this._particles.length) {
                    const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
                    sprite.anchor.set(0.5, 0.5);
                    this._pixiContainer.addChild(sprite);
                    this._pixiTextSprites.push(sprite);
                }
                // Trim excess
                const maxPool = Math.max(this.maxParticles, this._particles.length) + 10;
                while (this._pixiTextSprites.length > maxPool) {
                    const sprite = this._pixiTextSprites.pop();
                    if (sprite.parent) sprite.parent.removeChild(sprite);
                    sprite.destroy();
                }
                // Hide unused
                for (let i = this._particles.length; i < this._pixiTextSprites.length; i++) {
                    this._pixiTextSprites[i].visible = false;
                }
                
                for (let i = 0; i < this._particles.length; i++) {
                    const p = this._particles[i];
                    const sprite = this._pixiTextSprites[i];
                    const progress = p.age / p.lifetime;
                    const char = p.textChar || this.particleText[0] || '$';
                    
                    // Get or create PIXI texture from cached character canvas
                    let tex = this._pixiTextTextures.get(char);
                    if (!tex) {
                        const charData = this._getTextCharCanvas(char);
                        tex = PIXI.Texture.from(charData.canvas);
                        this._pixiTextTextures.set(char, tex);
                    }
                    sprite.texture = tex;
                    sprite.visible = true;
                    sprite.x = p.x + offsetX;
                    sprite.y = p.y + offsetY;
                    sprite.alpha = p.alpha;
                    sprite.rotation = p.rotation;
                    
                    const scaleRatio = this.scaleOverLifetime ? (p.size / this.startSize) : 1;
                    sprite.scale.set(scaleRatio, scaleRatio);
                    
                    // Tint non-emoji characters
                    const charData = this._getTextCharCanvas(char);
                    if (!charData.isEmoji) {
                        const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
                        const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
                        const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
                        sprite.tint = (r << 16) | (g << 8) | b;
                    } else {
                        sprite.tint = 0xFFFFFF;
                    }
                }
            } else {
                // Hide text sprites if shape switched away from text
                if (this._pixiTextSprites) {
                    for (const sprite of this._pixiTextSprites) {
                        sprite.visible = false;
                    }
                }
            }
            
            // Draw shapes using graphics (non-text shapes)
            if (this.shape !== 'text') {
            for (const p of this._particles) {
                const progress = p.age / p.lifetime;
                
                // Interpolate color
                const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
                const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
                const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
                const color = (r << 16) | (g << 8) | b;
                
                const px = p.x + offsetX;
                const py = p.y + offsetY;
                const halfSize = p.size / 2;
                
                graphics.beginFill(color, p.alpha);
                
                if (this.shape === 'circle') {
                    graphics.drawCircle(px, py, halfSize);
                } else if (this.shape === 'square') {
                    // Apply rotation by drawing rotated rectangle
                    if (this.rotateParticles || this.randomRotation) {
                        graphics.endFill();
                        graphics.beginFill(color, p.alpha);
                        // Rotate around particle center
                        const cos = Math.cos(p.rotation);
                        const sin = Math.sin(p.rotation);
                        const hw = halfSize, hh = halfSize;
                        // Calculate rotated corners
                        const x1 = px + (-hw * cos - (-hh) * sin);
                        const y1 = py + (-hw * sin + (-hh) * cos);
                        const x2 = px + (hw * cos - (-hh) * sin);
                        const y2 = py + (hw * sin + (-hh) * cos);
                        const x3 = px + (hw * cos - hh * sin);
                        const y3 = py + (hw * sin + hh * cos);
                        const x4 = px + (-hw * cos - hh * sin);
                        const y4 = py + (-hw * sin + hh * cos);
                        graphics.moveTo(x1, y1);
                        graphics.lineTo(x2, y2);
                        graphics.lineTo(x3, y3);
                        graphics.lineTo(x4, y4);
                        graphics.closePath();
                    } else {
                        graphics.drawRect(px - halfSize, py - halfSize, p.size, p.size);
                    }
                } else if (this.shape === 'triangle') {
                    const cos = Math.cos(p.rotation);
                    const sin = Math.sin(p.rotation);
                    // Triangle points (pointing up)
                    const p1x = 0, p1y = -halfSize;
                    const p2x = halfSize, p2y = halfSize;
                    const p3x = -halfSize, p3y = halfSize;
                    // Rotate and translate
                    const rx1 = px + p1x * cos - p1y * sin;
                    const ry1 = py + p1x * sin + p1y * cos;
                    const rx2 = px + p2x * cos - p2y * sin;
                    const ry2 = py + p2x * sin + p2y * cos;
                    const rx3 = px + p3x * cos - p3y * sin;
                    const ry3 = py + p3x * sin + p3y * cos;
                    graphics.moveTo(rx1, ry1);
                    graphics.lineTo(rx2, ry2);
                    graphics.lineTo(rx3, ry3);
                    graphics.closePath();
                } else if (this.shape === 'star') {
                    // Draw 5-point star
                    this._drawPixiStar(graphics, px, py, 5, halfSize, halfSize / 2, p.rotation);
                }
                
                graphics.endFill();
            }
            } // end if (this.shape !== 'text')
        }
        
        // Return container for parent to add to stage
        return this._pixiContainer;
    }
    
    /**
     * Draw a star shape in PixiJS graphics
     * @private
     */
    _drawPixiStar(graphics, cx, cy, spikes, outerRadius, innerRadius, rotation = 0) {
        let rot = -Math.PI / 2 + rotation;
        const step = Math.PI / spikes;
        
        graphics.moveTo(
            cx + Math.cos(rot) * outerRadius,
            cy + Math.sin(rot) * outerRadius
        );
        
        for (let i = 0; i < spikes; i++) {
            graphics.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            graphics.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        
        graphics.closePath();
    }
    
    /**
     * Clean up PixiJS resources
     */
    disposePixi() {
        if (this._pixiSprites) {
            for (const sprite of this._pixiSprites) {
                if (sprite.parent) sprite.parent.removeChild(sprite);
                sprite.destroy();
            }
            this._pixiSprites = null;
        }
        if (this._pixiGraphics) {
            if (this._pixiGraphics.parent) this._pixiGraphics.parent.removeChild(this._pixiGraphics);
            this._pixiGraphics.destroy();
            this._pixiGraphics = null;
        }
        if (this._pixiContainer) {
            if (this._pixiContainer.parent) this._pixiContainer.parent.removeChild(this._pixiContainer);
            this._pixiContainer.destroy();
            this._pixiContainer = null;
        }
        if (this._pixiTexture) {
            // Don't destroy texture as it may be shared
            this._pixiTexture = null;
        }
    }
    
    /**
     * Called when the module is destroyed - clean up resources
     */
    onDestroy() {
        // Clean up GPU instanced rendering resources
        this._destroyGPURendering();
        
        this.disposePixi();
        
        // Clear particles array
        this._particles = [];
        
        // Clear particle pool
        this._particlePool = null;
        
        // Clear cached image
        if (this._cachedImage) {
            this._cachedImage.src = '';
            this._cachedImage = null;
        }
        
        // Clear batch canvas
        if (this._batchCanvas) {
            this._batchCanvas.width = 0;
            this._batchCanvas.height = 0;
            this._batchCanvas = null;
            this._batchCtx = null;
        }
        
        // Clear cached gradient texture
        if (this._gradientCanvas) {
            this._gradientCanvas.width = 0;
            this._gradientCanvas.height = 0;
            this._gradientCanvas = null;
            this._gradientCtx = null;
            this._gradientCacheKey = '';
        }
        
        // Clear text character canvases (each holds an HTMLCanvasElement)
        if (this._textCharCache) {
            for (const entry of this._textCharCache.values()) {
                if (entry && entry.canvas) {
                    entry.canvas.width = 0;
                    entry.canvas.height = 0;
                }
            }
            this._textCharCache.clear();
            this._textCharCache = null;
        }
        
        // Clear text tint canvas
        if (this._textTintCanvas) {
            this._textTintCanvas.width = 0;
            this._textTintCanvas.height = 0;
            this._textTintCanvas = null;
            this._textTintCtx = null;
        }
        
        // Clear collider cache
        this._cachedColliders = [];
    }
    
    // ==================== PRIVATE METHODS ====================
    
    _emitParticle() {
        // In GPU compute mode, check GPU alive count + pending CPU particles
        if (this._gpuComputeInitialized) {
            if (this._gpuAliveCount + this._particles.length >= this.maxParticles) return;
        } else {
            if (this._particles.length >= this.maxParticles) return;
        }
        
        // Calculate emission position
        let emitX = (Math.random() - 0.5) * this.emitterWidth;
        let emitY = (Math.random() - 0.5) * this.emitterHeight;
        
        // If not using relative positioning, convert to world coordinates
        if (!this.relativePositioning && this.gameObject) {
            const worldPos = this.worldPosition;
            emitX += worldPos.x;
            emitY += worldPos.y;
        }
        
        // Calculate emission angle with spread
        const baseAngle = this.emissionAngle * (Math.PI / 180);
        const spreadRad = this.spread * (Math.PI / 180);
        const angle = baseAngle + (Math.random() - 0.5) * spreadRad;
        
        // Calculate speed with variation
        const speedVar = 1 + (Math.random() - 0.5) * this.speedVariation * 2;
        const speed = this.startSpeed * speedVar;
        
        // Calculate lifetime with variation
        const lifetimeVar = 1 + (Math.random() - 0.5) * this.lifetimeVariation * 2;
        const lifetime = this.particleLifetime * lifetimeVar;
        
        // Initial rotation
        const initialRotation = this.randomRotation ? Math.random() * Math.PI * 2 : 0;
        
        // For text particles, pick a random character from the text string
        // Uses _getTextChars() which properly splits multi-codepoint emoji
        let textChar = '';
        if (this.shape === 'text' && this.particleText && this.particleText.length > 0) {
            const chars = this._getTextChars();
            textChar = chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Reuse pooled particle object instead of allocating a new one
        const p = this._getParticleFromPool();
        p.x = emitX;
        p.y = emitY;
        p.velocityX = Math.cos(angle) * speed;
        p.velocityY = Math.sin(angle) * speed;
        p.age = 0;
        p.lifetime = lifetime;
        p.size = this.startSize;
        p.alpha = 1;
        p.rotation = initialRotation;
        p.textChar = textChar;
        p.phaseOffset = Math.random() * Math.PI * 2;
        p.active = true;
        this._particles.push(p);
    }
    
    _hexToRgb(hex) {
        // Handle shorthand hex (#fff)
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }
    
    // ==================== PUBLIC METHODS ====================
    
    play() {
        this._isPlaying = true;
        this._emissionTimer = 0;
    }
    
    pause() {
        this._isPlaying = false;
    }
    
    stop() {
        this._isPlaying = false;
        this._particles = [];
        this._emissionTimer = 0;
        if (this._gpuComputeInitialized) this._gpuClearAllSlots();
    }
    
    clear() {
        this._particles = [];
        if (this._gpuComputeInitialized) this._gpuClearAllSlots();
    }
    
    emit(count = 1) {
        for (let i = 0; i < count; i++) {
            this._emitParticle();
        }
    }
    
    /**
     * Set the particle image
     * @param {string} path - Image path/name
     */
    setImage(path) {
        this.imagePath = path;
        this.shape = 'image';
    }
    
    /**
     * Check if the particle system is currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this._isPlaying;
    }
    
    /**
     * Get current particle count
     * @returns {number}
     */
    getParticleCount() {
        if (this._gpuComputeInitialized) return this._gpuAliveCount;
        return this._particles.length;
    }
    
    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>✨ ParticleSystem Overview</h2>
            <p>The <strong>ParticleSystem</strong> module creates and manages particle effects for fire, smoke, explosions, rain, snow, magic, and more. It supports multiple shapes, wind physics, collision, force points, and GPU-accelerated rendering.</p>
            <ul>
                <li><strong>Shapes</strong> — circle, square, star, triangle, image, text, gradient circle/square</li>
                <li><strong>Emission modes</strong> — continuous, burst, looping or one-shot</li>
                <li><strong>Wind &amp; turbulence</strong> — environmental wind, noise-based turbulence, vortex forces</li>
                <li><strong>Collision</strong> — particles can bounce off colliders</li>
                <li><strong>Force points</strong> — attractors and deflectors for advanced physics</li>
                <li><strong>GPU rendering</strong> — WebGL2 instanced drawing for thousands of particles</li>
                <li><strong>Built-in presets</strong> — fire, smoke, sparks, explosion, confetti, rain, snow, bubbles, magic, leaves</li>
            </ul>
            <div class="tip">Start with a preset using <code>applyPresetFire()</code> etc., then tweak properties to customize the effect.</div>
        `,

        "Basic Setup": `
            <h2>⚡ Basic Setup</h2>
            <p>To create a particle effect:</p>

            <h3>In the Prefab Editor</h3>
            <ol>
                <li>Add a <strong>ParticleSystem</strong> module to your GameObject</li>
                <li>Choose a particle <strong>Shape</strong> (circle, square, image, text, etc.)</li>
                <li>Set <strong>Emission Rate</strong>, <strong>Lifetime</strong>, and <strong>Speed</strong></li>
                <li>Pick <strong>Start Color</strong> and <strong>End Color</strong> for color transitions</li>
                <li>Enable <strong>Auto Play</strong> to start emitting when the scene loads</li>
            </ol>

            <h3>Minimal Code Example</h3>
            <pre><code>start() {
    const ps = this.getModule('ParticleSystem');
    ps.emissionRate = 20;
    ps.particleLifetime = 1.5;
    ps.startSpeed = 100;
    ps.startSize = 8;
    ps.endSize = 2;
    ps.startColor = '#ffaa00';
    ps.endColor = '#ff0000';
    ps.gravity = -50;
    ps.spread = 45;
    ps.emissionAngle = -90; // Emit upward
    ps.play();
}</code></pre>

            <div class="tip">Set <code>autoPlay = true</code> (default) and <code>looping = true</code> for continuous effects that start automatically.</div>
        `,

        "Presets": `
            <h2>🎨 Built-in Presets</h2>
            <p>Quickly apply pre-configured particle effects:</p>

            <pre><code>const ps = this.getModule('ParticleSystem');

// Apply a preset
ps.applyPresetFire();       // Flames rising up
ps.applyPresetSmoke();      // Drifting smoke clouds
ps.applyPresetSparks();     // Falling sparks
ps.applyPresetExplosion();  // One-shot burst explosion
ps.applyPresetConfetti();   // Colorful falling confetti
ps.applyPresetRain();       // Rainfall
ps.applyPresetSnow();       // Gentle snowfall
ps.applyPresetBubbles();    // Rising bubbles
ps.applyPresetMagic();      // Magical sparkles
ps.applyPresetLeaves();     // Falling leaves</code></pre>

            <h3>Customize After Applying</h3>
            <pre><code>ps.applyPresetFire();
ps.startColor = '#0088ff';  // Blue fire
ps.endColor = '#00ffff';
ps.emissionRate = 50;       // More particles
ps.gravity = -80;           // Rise faster</code></pre>

            <div class="tip">Presets reset all advanced physics settings. Apply a preset first, then customize individual properties.</div>
        `,

        "Playback Control": `
            <h2>▶️ Playback Control</h2>
            <p>Control when particles emit:</p>

            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>play()</code></td><td>Start/resume emitting particles</td></tr>
                <tr><td><code>pause()</code></td><td>Pause emission (existing particles continue)</td></tr>
                <tr><td><code>stop()</code></td><td>Stop emission and clear all particles</td></tr>
                <tr><td><code>clear()</code></td><td>Remove all particles without stopping emission</td></tr>
                <tr><td><code>emit(count)</code></td><td>Manually emit a specific number of particles</td></tr>
                <tr><td><code>isPlaying()</code></td><td>Check if currently emitting</td></tr>
                <tr><td><code>getParticleCount()</code></td><td>Get current number of live particles</td></tr>
            </table>

            <h3>One-Shot Burst</h3>
            <pre><code>start() {
    const ps = this.getModule('ParticleSystem');
    ps.burst = true;
    ps.burstCount = 30;
    ps.looping = false;
    ps.autoPlay = false; // Control when it fires
}

// Fire the burst on demand
onHit() {
    const ps = this.getModule('ParticleSystem');
    ps.play();
}

// Or emit particles manually
onCollect() {
    const ps = this.getModule('ParticleSystem');
    ps.emit(15); // Emit exactly 15 particles
}</code></pre>
        `,

        "Shapes & Visuals": `
            <h2>🔷 Shapes &amp; Visuals</h2>
            <p>Configure how particles look:</p>

            <h3>Available Shapes</h3>
            <table>
                <tr><th>Shape</th><th>Description</th></tr>
                <tr><td><code>'circle'</code></td><td>Filled circle (default)</td></tr>
                <tr><td><code>'square'</code></td><td>Filled square</td></tr>
                <tr><td><code>'star'</code></td><td>Star shape</td></tr>
                <tr><td><code>'triangle'</code></td><td>Triangle shape</td></tr>
                <tr><td><code>'image'</code></td><td>Custom image/sprite per particle</td></tr>
                <tr><td><code>'text'</code></td><td>Text characters (supports emoji)</td></tr>
                <tr><td><code>'gradientCircle'</code></td><td>Circle with radial gradient</td></tr>
                <tr><td><code>'gradientSquare'</code></td><td>Square with gradient fill</td></tr>
            </table>

            <h3>Image Particles</h3>
            <pre><code>ps.shape = 'image';
ps.imagePath = 'spark.png';
ps.imageWidth = 32;
ps.imageHeight = 32;
ps.endImageWidth = 8;        // Shrink over lifetime
ps.endImageHeight = 8;
ps.scaleImageOverLifetime = true;</code></pre>

            <h3>Text/Emoji Particles</h3>
            <pre><code>ps.shape = 'text';
ps.particleText = '💰🪙✨';  // Randomly picks one per particle
ps.fontSize = 24;
ps.fontWeight = 'bold';</code></pre>

            <h3>Gradient Particles</h3>
            <pre><code>ps.shape = 'gradientCircle';
ps.gradientInnerColor = '#ffffff';
ps.gradientOuterColor = '#ff6600';
ps.gradientType = 'radial';</code></pre>

            <h3>Color &amp; Size Over Lifetime</h3>
            <pre><code>ps.startColor = '#ffff00';    // Yellow at birth
ps.endColor = '#ff0000';      // Red at death
ps.startSize = 12;            // Large at birth
ps.endSize = 1;               // Tiny at death
ps.scaleOverLifetime = true;  // Smooth size interpolation
ps.fadeOut = true;             // Fade alpha to 0
ps.blendMode = 'lighter';     // Additive blending for glow</code></pre>
        `,

        "Wind & Physics": `
            <h2>🌬️ Wind &amp; Physics</h2>
            <p>Add environmental forces to particles:</p>

            <h3>Basic Wind</h3>
            <pre><code>ps.enableWind = true;
ps.windStrength = 50;        // Force strength (0-100)
ps.windDirection = 0;        // Degrees (0=right, 90=down)
ps.windTurbulence = 0.3;     // Chaos factor (0-1)
ps.windResistance = 0.5;     // Particle weight (0=light, 1=heavy)</code></pre>

            <h3>Environment Wind</h3>
            <pre><code>// React to the engine's global weather wind system
ps.useEnvironmentWind = true;</code></pre>

            <h3>Advanced Physics</h3>
            <pre><code>ps.gravity = 200;             // Downward gravity

ps.drag = 0.3;               // Air resistance (0-1)
ps.maxVelocity = 500;        // Speed cap (0=unlimited)

// Orbital motion around emitter
ps.orbitalSpeed = 90;        // Degrees/second

// Noise turbulence (independent of wind)
ps.enableNoiseTurbulence = true;
ps.noiseStrength = 30;
ps.noiseScale = 0.01;        // Smaller = larger swirls
ps.noiseSpeed = 1;

// Vortex rotation
ps.vortexStrength = 50;      // + = CCW, - = CW</code></pre>
        `,

        "Force Points": `
            <h2>🧲 Force Points</h2>
            <p>Add attractors and deflectors that pull or push particles:</p>

            <pre><code>ps.enableForcePoints = true;

// Add an attractor (pulls particles toward it)
ps.forcePoints.push({
    x: 100, y: 0,        // Position relative to emitter
    strength: 200,         // Force strength
    radius: 150,           // Effect radius
    type: 'attract',       // 'attract' or 'deflect'
    falloff: 'linear'      // 'linear', 'quadratic', or 'none'
});

// Add a deflector (pushes particles away)
ps.forcePoints.push({
    x: -50, y: 50,
    strength: 150,
    radius: 100,
    type: 'deflect',
    falloff: 'quadratic'
});</code></pre>

            <div class="tip">Force point positions are relative to the particle system's GameObject position.</div>
        `,

        "Particle Collision": `
            <h2>💥 Particle Collision</h2>
            <p>Make particles interact with colliders in the scene:</p>

            <pre><code>ps.enableCollision = true;
ps.collisionRadius = 3;          // Per-particle collision size
ps.collideWithTags = 'solid,ground'; // Comma-separated collider tags
ps.collisionBounciness = 0.5;    // Bounce strength (0-1)
ps.collisionFriction = 0.1;      // Surface friction (0-1)
ps.collisionDamping = 0.98;      // Velocity retained after bounce
ps.destroyOnCollision = false;   // Kill particle on impact
ps.colliderCacheInterval = 0.25; // Cache refresh rate (seconds)</code></pre>

            <div class="tip">Particle collision checks are optimized with a collider cache that refreshes at the <code>colliderCacheInterval</code> rate.</div>

            <div class="warning">Enabling collision on high-particle-count systems can impact performance. Keep <code>maxParticles</code> reasonable.</div>
        `,

        "GPU Rendering": `
            <h2>🚀 GPU Rendering</h2>
            <p>For high particle counts, enable GPU-accelerated rendering:</p>

            <h3>Instanced Rendering</h3>
            <pre><code>ps.useGPUProcessing = true;  // WebGL2 instanced drawing
ps.maxParticles = 5000;      // Can handle thousands</code></pre>

            <h3>Batched Rendering</h3>
            <pre><code>ps.enableBatching = true;    // Enabled by default
ps.batchSize = 1000;         // Particles per batch draw call</code></pre>

            <div class="tip">GPU processing uses WebGL2 Transform Feedback for particle physics on the GPU, with instanced drawing for rendering — all in a single draw call.</div>
        `,

        "Full Example Module": `
            <h2>📝 Full Example: Torch Effect</h2>
            <p>A complete module that creates a flickering torch with fire and smoke:</p>

            <pre><code>class TorchEffect extends Module {
    constructor() {
        super();
        this.flickerSpeed = 3;
    }

    start() {
        this.fire = this.getModule('ParticleSystem');
        
        // Configure fire
        this.fire.emissionRate = 25;
        this.fire.maxParticles = 100;
        this.fire.particleLifetime = 0.8;
        this.fire.startSpeed = 60;
        this.fire.speedVariation = 0.4;
        this.fire.emissionAngle = -90;
        this.fire.spread = 25;
        this.fire.gravity = -40;
        this.fire.startSize = 10;
        this.fire.endSize = 2;
        this.fire.startColor = '#ff8800';
        this.fire.endColor = '#ff2200';
        this.fire.fadeOut = true;
        this.fire.scaleOverLifetime = true;
        this.fire.emitterWidth = 8;
        this.fire.blendMode = 'lighter';
        this.fire.play();
    }

    loop(dt) {
        // Flicker the emission rate
        const flicker = Math.sin(Date.now() * 0.001 * this.flickerSpeed) * 0.3 + 0.7;
        this.fire.emissionRate = 25 * flicker;
    }
}</code></pre>

            <div class="tip">Use <code>blendMode = 'lighter'</code> for additive blending, which creates a glowing effect perfect for fire, magic, and energy effects.</div>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>

            <h3>Emission</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>emissionRate</code></td><td>number</td><td>10</td><td>Particles emitted per second</td></tr>
                <tr><td><code>maxParticles</code></td><td>number</td><td>100</td><td>Maximum live particles</td></tr>
                <tr><td><code>particleLifetime</code></td><td>number</td><td>2</td><td>Particle lifetime in seconds</td></tr>
                <tr><td><code>autoPlay</code></td><td>boolean</td><td>true</td><td>Start emitting on scene load</td></tr>
                <tr><td><code>looping</code></td><td>boolean</td><td>true</td><td>Loop emission continuously</td></tr>
                <tr><td><code>burst</code></td><td>boolean</td><td>false</td><td>Emit all particles at once</td></tr>
                <tr><td><code>burstCount</code></td><td>number</td><td>10</td><td>Particle count in burst mode</td></tr>
            </table>

            <h3>Movement</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>startSpeed</code></td><td>number</td><td>100</td><td>Initial particle speed</td></tr>
                <tr><td><code>speedVariation</code></td><td>number</td><td>0.2</td><td>Speed randomness (0-1)</td></tr>
                <tr><td><code>emissionAngle</code></td><td>number</td><td>-90</td><td>Base emission direction (degrees, -90=up)</td></tr>
                <tr><td><code>spread</code></td><td>number</td><td>360</td><td>Emission cone angle (degrees)</td></tr>
                <tr><td><code>gravity</code></td><td>number</td><td>0</td><td>Gravity force on particles</td></tr>
                <tr><td><code>drag</code></td><td>number</td><td>0</td><td>Air resistance (0-1)</td></tr>
                <tr><td><code>maxVelocity</code></td><td>number</td><td>0</td><td>Speed cap (0=unlimited)</td></tr>
            </table>

            <h3>Appearance</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>shape</code></td><td>string</td><td>'circle'</td><td>Particle shape type</td></tr>
                <tr><td><code>startSize</code></td><td>number</td><td>5</td><td>Initial particle size</td></tr>
                <tr><td><code>endSize</code></td><td>number</td><td>1</td><td>Final particle size</td></tr>
                <tr><td><code>startColor</code></td><td>string</td><td>'#ffffff'</td><td>Color at birth</td></tr>
                <tr><td><code>endColor</code></td><td>string</td><td>'#000000'</td><td>Color at death</td></tr>
                <tr><td><code>fadeOut</code></td><td>boolean</td><td>true</td><td>Fade alpha to 0 over lifetime</td></tr>
                <tr><td><code>scaleOverLifetime</code></td><td>boolean</td><td>true</td><td>Interpolate size over lifetime</td></tr>
                <tr><td><code>blendMode</code></td><td>string</td><td>'source-over'</td><td>Canvas blend mode</td></tr>
            </table>

            <h3>Rotation</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>rotateParticles</code></td><td>boolean</td><td>false</td><td>Rotate particles over lifetime</td></tr>
                <tr><td><code>rotationSpeed</code></td><td>number</td><td>180</td><td>Rotation speed (degrees/sec)</td></tr>
                <tr><td><code>randomRotation</code></td><td>boolean</td><td>true</td><td>Randomize initial rotation</td></tr>
            </table>

            <h3>Emitter Area</h3>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>emitterWidth</code></td><td>number</td><td>0</td><td>Emitter area width (0=point)</td></tr>
                <tr><td><code>emitterHeight</code></td><td>number</td><td>0</td><td>Emitter area height (0=point)</td></tr>
                <tr><td><code>relativePositioning</code></td><td>boolean</td><td>false</td><td>Draw relative to object (vs world)</td></tr>
            </table>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Returns</th><th>Description</th></tr>
                <tr><td><code>play()</code></td><td>void</td><td>Start/resume particle emission</td></tr>
                <tr><td><code>pause()</code></td><td>void</td><td>Pause emission</td></tr>
                <tr><td><code>stop()</code></td><td>void</td><td>Stop emission and clear particles</td></tr>
                <tr><td><code>clear()</code></td><td>void</td><td>Remove all particles</td></tr>
                <tr><td><code>emit(count)</code></td><td>void</td><td>Manually emit N particles</td></tr>
                <tr><td><code>isPlaying()</code></td><td>boolean</td><td>Check if emitting</td></tr>
                <tr><td><code>getParticleCount()</code></td><td>number</td><td>Current live particle count</td></tr>
                <tr><td><code>setImage(path)</code></td><td>void</td><td>Set image and switch to image shape</td></tr>
                <tr><td><code>applyPresetFire()</code></td><td>void</td><td>Apply fire preset</td></tr>
                <tr><td><code>applyPresetSmoke()</code></td><td>void</td><td>Apply smoke preset</td></tr>
                <tr><td><code>applyPresetSparks()</code></td><td>void</td><td>Apply sparks preset</td></tr>
                <tr><td><code>applyPresetExplosion()</code></td><td>void</td><td>Apply explosion preset</td></tr>
                <tr><td><code>applyPresetConfetti()</code></td><td>void</td><td>Apply confetti preset</td></tr>
                <tr><td><code>applyPresetRain()</code></td><td>void</td><td>Apply rain preset</td></tr>
                <tr><td><code>applyPresetSnow()</code></td><td>void</td><td>Apply snow preset</td></tr>
                <tr><td><code>applyPresetBubbles()</code></td><td>void</td><td>Apply bubbles preset</td></tr>
                <tr><td><code>applyPresetMagic()</code></td><td>void</td><td>Apply magic preset</td></tr>
                <tr><td><code>applyPresetLeaves()</code></td><td>void</td><td>Apply falling leaves preset</td></tr>
            </table>
        `
    };

    // ==================== SERIALIZATION ====================
    
        
        
    
    /**
     * Property metadata for the inspector
     * @returns {Array} Property definitions
     */
    getPropertyMetadata() {
        return [
            // === PRESETS ===
            { type: 'groupStart', label: '🎨 Quick Presets' },
                { type: 'hint', label: 'Click a preset to instantly configure the particle system' },
                { type: 'button', buttonText: '🔥 Fire', buttonStyle: 'primary', icon: '🔥', tooltip: 'Flickering fire effect', action: 'applyPresetFire' },
                { type: 'button', buttonText: '💨 Smoke', buttonStyle: 'primary', icon: '💨', tooltip: 'Rising smoke effect', action: 'applyPresetSmoke' },
                { type: 'button', buttonText: '✨ Sparks', buttonStyle: 'primary', icon: '✨', tooltip: 'Flying sparks effect', action: 'applyPresetSparks' },
                { type: 'button', buttonText: '💥 Explosion', buttonStyle: 'danger', icon: '💥', tooltip: 'Burst explosion effect', action: 'applyPresetExplosion' },
                { type: 'button', buttonText: '🎊 Confetti', buttonStyle: 'success', icon: '🎊', tooltip: 'Celebration confetti', action: 'applyPresetConfetti' },
                { type: 'button', buttonText: '🌧️ Rain', buttonStyle: 'primary', icon: '🌧️', tooltip: 'Falling rain drops', action: 'applyPresetRain' },
                { type: 'button', buttonText: '❄️ Snow', buttonStyle: 'primary', icon: '❄️', tooltip: 'Gentle snowfall', action: 'applyPresetSnow' },
                { type: 'button', buttonText: '🫧 Bubbles', buttonStyle: 'primary', icon: '🫧', tooltip: 'Rising bubbles', action: 'applyPresetBubbles' },
                { type: 'button', buttonText: '⭐ Magic', buttonStyle: 'success', icon: '⭐', tooltip: 'Magical sparkle trail', action: 'applyPresetMagic' },
                { type: 'button', buttonText: '🍂 Leaves', buttonStyle: 'primary', icon: '🍂', tooltip: 'Falling autumn leaves', action: 'applyPresetLeaves' },
                { type: 'button', buttonText: '💰 Coins', buttonStyle: 'success', icon: '💰', tooltip: 'Coin pickup effect', action: 'applyPresetCoins' },
                { type: 'button', buttonText: '💫 Dust', buttonStyle: 'primary', icon: '💫', tooltip: 'Floating dust particles', action: 'applyPresetDust' },
                { type: 'button', buttonText: '🩸 Blood', buttonStyle: 'danger', icon: '🩸', tooltip: 'Blood splatter effect', action: 'applyPresetBlood' },
                { type: 'button', buttonText: '💧 Water Splash', buttonStyle: 'primary', icon: '💧', tooltip: 'Water splash effect', action: 'applyPresetWaterSplash' },
                { type: 'button', buttonText: '⚡ Electric', buttonStyle: 'primary', icon: '⚡', tooltip: 'Electric sparks', action: 'applyPresetElectric' },
                { type: 'button', buttonText: '🌸 Petals', buttonStyle: 'success', icon: '🌸', tooltip: 'Floating flower petals', action: 'applyPresetPetals' },
                { type: 'button', buttonText: '☄️ Meteor Trail', buttonStyle: 'danger', icon: '☄️', tooltip: 'Comet/meteor trail', action: 'applyPresetMeteor' },
                { type: 'button', buttonText: '🌟 Heal', buttonStyle: 'success', icon: '🌟', tooltip: 'Healing sparkle effect', action: 'applyPresetHeal' },
                { type: 'button', buttonText: '☠️ Poison', buttonStyle: 'danger', icon: '☠️', tooltip: 'Toxic poison drips', action: 'applyPresetPoison' },
                { type: 'button', buttonText: '🔮 Portal', buttonStyle: 'primary', icon: '🔮', tooltip: 'Swirling portal effect', action: 'applyPresetPortal' },
            { type: 'groupEnd' },
            { type: 'groupStart', label: '🌌 Advanced Physics Presets' },
                { type: 'hint', label: 'These presets use force points, vortex, orbital & noise physics' },
                { type: 'button', buttonText: '🕳️ Black Hole', buttonStyle: 'danger', icon: '🕳️', tooltip: 'Particles spiral into a singularity', action: 'applyPresetBlackHole' },
                { type: 'button', buttonText: '🌌 Galaxy', buttonStyle: 'primary', icon: '🌌', tooltip: 'Spiraling galaxy arms', action: 'applyPresetGalaxy' },
                { type: 'button', buttonText: '🌪️ Tornado', buttonStyle: 'primary', icon: '🌪️', tooltip: 'Violent swirling funnel', action: 'applyPresetTornado' },
                { type: 'button', buttonText: '⚫ Gravity Well', buttonStyle: 'danger', icon: '⚫', tooltip: 'Particles pulled to center', action: 'applyPresetGravityWell' },
                { type: 'button', buttonText: '⚡ Plasma Ball', buttonStyle: 'primary', icon: '⚡', tooltip: 'Chaotic electric plasma arcs', action: 'applyPresetPlasmaBall' },
                { type: 'button', buttonText: '🌫️ Nebula', buttonStyle: 'success', icon: '🌫️', tooltip: 'Slow drifting cosmic cloud', action: 'applyPresetNebula' },
                { type: 'button', buttonText: '🪲 Fireflies', buttonStyle: 'success', icon: '🪲', tooltip: 'Organic glowing fireflies', action: 'applyPresetFireflies' },
                { type: 'button', buttonText: '🌊 Whirlpool', buttonStyle: 'primary', icon: '🌊', tooltip: 'Water vortex spiral inward', action: 'applyPresetWhirlpool' },
                { type: 'button', buttonText: '☀️ Solar Flare', buttonStyle: 'danger', icon: '☀️', tooltip: 'Erupting solar plasma', action: 'applyPresetSolarFlare' },
                { type: 'button', buttonText: '⚛️ Atomic', buttonStyle: 'primary', icon: '⚛️', tooltip: 'Electron-like orbiting particles', action: 'applyPresetAtomic' },
                { type: 'button', buttonText: '🌀 Cosmic Portal', buttonStyle: 'success', icon: '🌀', tooltip: 'Advanced swirling dimensional rift', action: 'applyPresetCosmicPortal' },
                { type: 'button', buttonText: '🛡️ Energy Shield', buttonStyle: 'primary', icon: '🛡️', tooltip: 'Orbiting energy barrier', action: 'applyPresetEnergyShield' },
            { type: 'groupEnd' },
            // === EMISSION ===
            { type: 'groupStart', label: '💨 Emission' },
                { key: 'emissionRate', label: 'Emission Rate', type: 'number', default: 10, min: 1, max: 500, step: 1 },
                { type: 'hint', label: 'Particles emitted per second' },
                { key: 'maxParticles', label: 'Max Particles', type: 'number', default: 100, min: 1, max: 2000, step: 1 },
                { key: 'autoPlay', label: 'Auto Play', type: 'boolean', default: true },
                { key: 'looping', label: 'Loop', type: 'boolean', default: true },
                { type: 'groupStart', label: '💥 Burst Mode' },
                    { key: 'burst', label: 'Enable Burst', type: 'boolean', default: false },
                    { key: 'burstCount', label: 'Burst Count', type: 'number', default: 10, min: 1, max: 500, step: 1, showIf: { burst: true } },
                    { type: 'hint', label: 'Emit all particles at once', showIf: { burst: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            // === EMITTER SHAPE ===
            { type: 'groupStart', label: '📐 Emitter Shape' },
                { key: 'emitterWidth', label: 'Width', type: 'number', default: 0, min: 0, max: 1000, step: 1 },
                { key: 'emitterHeight', label: 'Height', type: 'number', default: 0, min: 0, max: 1000, step: 1 },
                { type: 'hint', label: '0 = point emitter, larger values = area emitter' },
                { type: 'hint', label: 'If disabled, particles use world coordinates' },
            { type: 'groupEnd' },
            // === PARTICLE LIFETIME ===
            { type: 'groupStart', label: '⏱️ Lifetime' },
                { key: 'particleLifetime', label: 'Lifetime (seconds)', type: 'number', default: 2, min: 0.1, max: 30, step: 0.1 },
                { key: 'lifetimeVariation', label: 'Variation', type: 'slider', default: 0.2, min: 0, max: 1, step: 0.05 },
                { type: 'hint', label: 'Random variation in particle lifetime (0-1)' },
            { type: 'groupEnd' },
            // === MOVEMENT ===
            { type: 'groupStart', label: '🚀 Movement' },
                { key: 'startSpeed', label: 'Start Speed', type: 'number', default: 100, min: 0, max: 2000, step: 1 },
                { key: 'speedVariation', label: 'Speed Variation', type: 'slider', default: 0.2, min: 0, max: 1, step: 0.05 },
                { key: 'emissionAngle', label: 'Emission Angle', type: 'number', default: -90, min: -180, max: 180, step: 1 },
                { type: 'hint', label: '-90 = up, 0 = right, 90 = down, 180 = left' },
                { key: 'spread', label: 'Spread (degrees)', type: 'number', default: 360, min: 0, max: 360, step: 1 },
                { key: 'gravity', label: 'Gravity', type: 'number', default: 0, min: -1000, max: 1000, step: 1 },
            { type: 'groupEnd' },
            // === SIZE ===
            { type: 'groupStart', label: '📏 Size' },
                { key: 'startSize', label: 'Start Size', type: 'number', default: 5, min: 1, max: 200, step: 1 },
                { key: 'endSize', label: 'End Size', type: 'number', default: 1, min: 0, max: 200, step: 1 },
                { key: 'scaleOverLifetime', label: 'Scale Over Lifetime', type: 'boolean', default: true },
            { type: 'groupEnd' },
            // === APPEARANCE ===
            { type: 'groupStart', label: '🎨 Appearance' },
                { key: 'shape', label: 'Shape', type: 'select', default: 'circle', options: ['circle', 'square', 'triangle', 'star', 'image', 'text', 'gradientCircle', 'gradientSquare'] },
                { key: 'relativePositioning', label: 'Relative Positioning', type: 'boolean', default: true },
                { key: 'useYDepth', label: 'Use Y Depth', type: 'boolean' },
                // Image shape options
                { type: 'groupStart', label: '🖼️ Image Settings' },
                    { key: 'imagePath', label: 'Particle Image', type: 'image', default: '', showIf: { shape: 'image' } },
                    { key: 'imageWidth', label: 'Start Width', type: 'number', default: 32, min: 1, max: 512, step: 1, showIf: { shape: 'image' } },
                    { key: 'imageHeight', label: 'Start Height', type: 'number', default: 32, min: 1, max: 512, step: 1, showIf: { shape: 'image' } },
                    { key: 'endImageWidth', label: 'End Width', type: 'number', default: 8, min: 0, max: 512, step: 1, showIf: { shape: 'image' } },
                    { key: 'endImageHeight', label: 'End Height', type: 'number', default: 8, min: 0, max: 512, step: 1, showIf: { shape: 'image' } },
                    { key: 'scaleImageOverLifetime', label: 'Scale Over Lifetime', type: 'boolean', default: true, showIf: { shape: 'image' } },
                { type: 'groupEnd' },
                // Text shape options
                { type: 'groupStart', label: '🔤 Text Settings' },
                    { key: 'particleText', label: 'Characters', type: 'text', default: '$', showIf: { shape: 'text' } },
                    { type: 'hint', label: 'Random character picked per particle', showIf: { shape: 'text' } },
                    { key: 'fontSize', label: 'Font Size', type: 'number', default: 16, min: 4, max: 128, step: 1, showIf: { shape: 'text' } },
                    { key: 'fontFamily', label: 'Font Family', type: 'text', default: 'Arial', showIf: { shape: 'text' } },
                    { key: 'fontWeight', label: 'Font Weight', type: 'select', default: 'bold', options: ['normal', 'bold', 'lighter', 'bolder'], showIf: { shape: 'text' } },
                { type: 'groupEnd' },
                // Gradient shape options
                { type: 'groupStart', label: '🌈 Gradient Settings' },
                    { key: 'gradientInnerColor', label: 'Inner Color', type: 'color', default: '#ffffff', showIf: (m) => m.shape === 'gradientCircle' || m.shape === 'gradientSquare' },
                    { key: 'gradientOuterColor', label: 'Outer Color', type: 'color', default: '#000000', showIf: (m) => m.shape === 'gradientCircle' || m.shape === 'gradientSquare' },
                    { key: 'gradientType', label: 'Gradient Type', type: 'select', default: 'radial', options: ['radial', 'linear'], showIf: { shape: 'gradientSquare' } },
                    { type: 'hint', label: 'Gradient shapes create soft, glowing particles', showIf: (m) => m.shape === 'gradientCircle' || m.shape === 'gradientSquare' },
                { type: 'groupEnd' },
                // Colors
                { type: 'groupStart', label: '🌈 Colors' },
                    { key: 'startColor', label: 'Start Color', type: 'color', default: '#ffffff' },
                    { key: 'endColor', label: 'End Color', type: 'color', default: '#000000' },
                    { key: 'fadeOut', label: 'Fade Out', type: 'boolean', default: true },
                { type: 'groupEnd' },
                // Blend Mode
                { type: 'groupStart', label: '✨ Blend Mode' },
                    { key: 'blendMode', label: 'Blend Mode', type: 'select', default: 'source-over', 
                      options: ['source-over', 'lighter', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'] },
                    { type: 'hint', label: 'source-over: Normal | lighter: Additive (glow) | multiply: Darken | screen: Lighten' },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            // === ROTATION ===
            { type: 'groupStart', label: '🔄 Rotation' },
                { key: 'rotateParticles', label: 'Rotate Over Lifetime', type: 'boolean', default: false },
                { key: 'rotationSpeed', label: 'Rotation Speed (°/s)', type: 'number', default: 180, min: -720, max: 720, step: 1, showIf: { rotateParticles: true } },
                { key: 'randomRotation', label: 'Random Initial Rotation', type: 'boolean', default: true },
            { type: 'groupEnd' },
            // === WIND ===
            { type: 'groupStart', label: '🌬️ Wind' },
                { key: 'enableWind', label: 'Enable Wind', type: 'boolean', default: false },
                { type: 'groupStart', label: '🌍 Environment Wind' },
                    { key: 'useEnvironmentWind', label: 'Use Environment Wind', type: 'boolean', default: false, showIf: { enableWind: true } },
                    { type: 'hint', label: 'React to engine weather wind system', showIf: { enableWind: true } },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '🎛️ Custom Wind' },
                    { key: 'windStrength', label: 'Strength', type: 'number', default: 50, min: 0, max: 100, step: 1, showIf: { enableWind: true, useEnvironmentWind: false } },
                    { key: 'windDirection', label: 'Direction (°)', type: 'number', default: 0, min: -180, max: 180, step: 5, showIf: { enableWind: true, useEnvironmentWind: false } },
                    { type: 'hint', label: '0=right, 90=down, 180=left, -90=up', showIf: { enableWind: true, useEnvironmentWind: false } },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '🌊 Wind Physics' },
                    { key: 'windTurbulence', label: 'Turbulence', type: 'slider', default: 0.3, min: 0, max: 1, step: 0.05, showIf: { enableWind: true } },
                    { type: 'hint', label: '0=steady, 1=gusty/chaotic', showIf: { enableWind: true } },
                    { key: 'windResistance', label: 'Resistance', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05, showIf: { enableWind: true } },
                    { type: 'hint', label: '0=easily blown, 1=heavy', showIf: { enableWind: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            // === COLLISION ===
            { type: 'groupStart', label: '💥 Collision' },
                { key: 'enableCollision', label: 'Enable Collision', type: 'boolean', default: false },
                { type: 'hint', label: 'Particles will collide with BoxCollider, SphereCollider, and PolygonCollider' },
                { key: 'collisionRadius', label: 'Collision Radius Multiplier', type: 'slider', default: 2, min: 0, max: 1, step: 0.05, showIf: { enableCollision: true } },
                { type: 'groupStart', label: '🎯 Collision Settings' },
                    { key: 'collideWithTags', label: 'Collider Tags', type: 'text', default: 'solid', showIf: { enableCollision: true } },
                    { type: 'hint', label: 'Comma-separated tags (e.g., solid, wall, floor)', showIf: { enableCollision: true } },
                    { key: 'destroyOnCollision', label: 'Destroy On Collision', type: 'boolean', default: false, showIf: { enableCollision: true } },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '⚡ Physics Response' },
                    { key: 'collisionBounciness', label: 'Bounciness', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05, showIf: { enableCollision: true } },
                    { type: 'hint', label: '0 = no bounce, 1 = full bounce', showIf: { enableCollision: true } },
                    { key: 'collisionFriction', label: 'Friction', type: 'slider', default: 0.1, min: 0, max: 1, step: 0.05, showIf: { enableCollision: true } },
                    { key: 'collisionDamping', label: 'Damping', type: 'slider', default: 0.98, min: 0.5, max: 1, step: 0.01, showIf: { enableCollision: true } },
                    { key: 'colliderCacheInterval', label: 'Cache Refresh (s)', type: 'slider', default: 0.25, min: 0.05, max: 2, step: 0.05, showIf: { enableCollision: true } },
                    { type: 'hint', label: 'How often to re-scan for colliders (lower = more accurate, higher = faster)', showIf: { enableCollision: true } },
                    { type: 'hint', label: 'Velocity retained after collision', showIf: { enableCollision: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            // === ADVANCED PHYSICS ===
            { type: 'groupStart', label: '🌀 Advanced Physics' },
                // --- Force Points ---
                { type: 'groupStart', label: '🧲 Force Points' },
                    { key: 'enableForcePoints', label: 'Enable Force Points', type: 'boolean', default: false },
                    { type: 'hint', label: 'Attractors pull particles inward, deflectors push outward. Positions are relative to the game object.' },
                    {
                        key: 'forcePoints',
                        label: '📍 Force Points',
                        type: 'arrayGroup',
                        itemLabel: 'Force Point',
                        minItems: 0,
                        showIf: { enableForcePoints: true },
                        itemProperties: [
                            { key: 'type', label: 'Type', type: 'select', options: ['attract', 'repel'], default: 'attract' },
                            { key: 'x', label: 'Offset X', type: 'number', default: 0, step: 1 },
                            { key: 'y', label: 'Offset Y', type: 'number', default: 0, step: 1 },
                            { key: 'strength', label: 'Strength', type: 'number', default: 200, min: 0, max: 2000, step: 10 },
                            { key: 'radius', label: 'Radius', type: 'number', default: 200, min: 1, max: 2000, step: 10 },
                            { key: 'falloff', label: 'Falloff', type: 'select', options: ['linear', 'inverse', 'constant'], default: 'linear' },
                        ]
                    },
                { type: 'groupEnd' },
                // --- Vortex ---
                { type: 'groupStart', label: '🌪️ Vortex' },
                    { key: 'vortexStrength', label: 'Vortex Strength', type: 'number', default: 0, min: -500, max: 500, step: 5 },
                    { type: 'hint', label: 'Rotational force around emitter origin (+CCW / −CW). 0 = off.' },
                { type: 'groupEnd' },
                // --- Orbital ---
                { type: 'groupStart', label: '🪐 Orbital Motion' },
                    { key: 'orbitalSpeed', label: 'Orbital Speed (°/s)', type: 'number', default: 0, min: -720, max: 720, step: 5 },
                    { type: 'hint', label: 'Rotates particle positions around the emitter. 0 = off.' },
                { type: 'groupEnd' },
                // --- Drag ---
                { type: 'groupStart', label: '🌫️ Drag & Limits' },
                    { key: 'drag', label: 'Drag (Air Resistance)', type: 'slider', default: 0, min: 0, max: 10, step: 0.1 },
                    { type: 'hint', label: '0 = no drag, higher = particles slow down faster' },
                    { key: 'maxVelocity', label: 'Max Velocity', type: 'number', default: 0, min: 0, max: 5000, step: 10 },
                    { type: 'hint', label: 'Speed limit. 0 = unlimited.' },
                { type: 'groupEnd' },
                // --- Noise Turbulence ---
                { type: 'groupStart', label: '🎲 Noise Turbulence' },
                    { key: 'enableNoiseTurbulence', label: 'Enable Noise', type: 'boolean', default: false },
                    { type: 'hint', label: 'Smooth, swirling motion independent of wind. Great for organic-looking movement.' },
                    { key: 'noiseStrength', label: 'Strength', type: 'number', default: 30, min: 0, max: 500, step: 5, showIf: { enableNoiseTurbulence: true } },
                    { key: 'noiseScale', label: 'Scale', type: 'slider', default: 0.01, min: 0.001, max: 0.1, step: 0.001, showIf: { enableNoiseTurbulence: true } },
                    { type: 'hint', label: 'Smaller = larger swirls, bigger = fine grain', showIf: { enableNoiseTurbulence: true } },
                    { key: 'noiseSpeed', label: 'Speed', type: 'slider', default: 1, min: 0, max: 5, step: 0.1, showIf: { enableNoiseTurbulence: true } },
                    { type: 'hint', label: 'How fast the noise field evolves over time', showIf: { enableNoiseTurbulence: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' },
            // === PERFORMANCE ===
            { type: 'groupStart', label: '⚡ Performance' },
                { type: 'groupStart', label: '🖥️ GPU Processing' },
                    { key: 'useGPUProcessing', label: 'Use GPU Processing', type: 'boolean', default: false },
                    { type: 'hint', label: 'Render particles via GPU shader (WebGL2 instanced drawing)' },
                    { type: 'hint', label: 'All particles drawn in 1 GPU call. Supports circle, square, triangle, star, gradient shapes. Text/image fall back to CPU.' },
                { type: 'groupEnd' },
                { type: 'groupStart', label: '📦 Batching' },
                    { key: 'enableBatching', label: 'Enable Batching', type: 'boolean', default: true },
                    { type: 'hint', label: 'Group particles by color to reduce draw calls' },
                    { key: 'batchSize', label: 'Batch Size', type: 'number', default: 1000, min: 100, max: 10000, step: 100, showIf: { enableBatching: true } },
                    { type: 'hint', label: 'Max particles per batch (for memory management)', showIf: { enableBatching: true } },
                { type: 'groupEnd' },
            { type: 'groupEnd' }
        ];
    }

    /**
     * Serialize module to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = super.toJSON();
        json.type = 'ParticleSystem';
        json.emissionRate = this.emissionRate;
        json.particleLifetime = this.particleLifetime;
        json.startSpeed = this.startSpeed;
        json.startSize = this.startSize;
        json.endSize = this.endSize;
        json.startColor = this.startColor;
        json.endColor = this.endColor;
        json.gravity = this.gravity;
        json.spread = this.spread;
        json.emissionAngle = this.emissionAngle;
        json.maxParticles = this.maxParticles;
        json.autoPlay = this.autoPlay;
        json.looping = this.looping;
        json.burst = this.burst;
        json.burstCount = this.burstCount;
        json.shape = this.shape;
        json.imagePath = this.imagePath;
        json.fadeOut = this.fadeOut;
        json.scaleOverLifetime = this.scaleOverLifetime;
        json.rotateParticles = this.rotateParticles;
        json.rotationSpeed = this.rotationSpeed;
        json.randomRotation = this.randomRotation;
        json.speedVariation = this.speedVariation;
        json.lifetimeVariation = this.lifetimeVariation;
        json.emitterWidth = this.emitterWidth;
        json.emitterHeight = this.emitterHeight;
        json.imageWidth = this.imageWidth;
        json.imageHeight = this.imageHeight;
        json.endImageWidth = this.endImageWidth;
        json.endImageHeight = this.endImageHeight;
        json.scaleImageOverLifetime = this.scaleImageOverLifetime;
        json.useYDepth = this.useYDepth;
        json.particleText = this.particleText;
        json.fontSize = this.fontSize;
        json.fontFamily = this.fontFamily;
        json.fontWeight = this.fontWeight;
        json.enableWind = this.enableWind;
        json.useEnvironmentWind = this.useEnvironmentWind;
        json.windStrength = this.windStrength;
        json.windDirection = this.windDirection;
        json.windTurbulence = this.windTurbulence;
        json.windResistance = this.windResistance;
        json.relativePositioning = this.relativePositioning;
        json.useGPUProcessing = this.useGPUProcessing;
        json.enableBatching = this.enableBatching;
        json.batchSize = this.batchSize;
        // Gradient properties
        json.gradientInnerColor = this.gradientInnerColor;
        json.gradientOuterColor = this.gradientOuterColor;
        json.gradientType = this.gradientType;
        // Blend mode
        json.blendMode = this.blendMode;
        // Collision properties
        json.enableCollision = this.enableCollision;
        json.collideWithTags = this.collideWithTags;
        json.collisionBounciness = this.collisionBounciness;
        json.collisionFriction = this.collisionFriction;
        json.destroyOnCollision = this.destroyOnCollision;
        json.collisionDamping = this.collisionDamping;
        json.collisionRadius = this.collisionRadius;
        // Advanced physics
        json.enableForcePoints = this.enableForcePoints;
        json.forcePoints = JSON.parse(JSON.stringify(this.forcePoints)); // deep copy
        json.drag = this.drag;
        json.maxVelocity = this.maxVelocity;
        json.orbitalSpeed = this.orbitalSpeed;
        json.enableNoiseTurbulence = this.enableNoiseTurbulence;
        json.noiseStrength = this.noiseStrength;
        json.noiseScale = this.noiseScale;
        json.noiseSpeed = this.noiseSpeed;
        json.vortexStrength = this.vortexStrength;
        json.colliderCacheInterval = this.colliderCacheInterval;
        return json;
    }

    /**
     * Deserialize module from JSON
     * @param {Object} json - JSON data
     * @returns {ParticleSystem} New instance
     */
    static fromJSON(json) {
        const module = new ParticleSystem();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.emissionRate = json.emissionRate ?? 10;
        module.particleLifetime = json.particleLifetime ?? 2;
        module.startSpeed = json.startSpeed ?? 100;
        module.startSize = json.startSize ?? 5;
        module.endSize = json.endSize ?? 1;
        module.startColor = json.startColor ?? '#ffffff';
        module.endColor = json.endColor ?? '#000000';
        module.gravity = json.gravity ?? 0;
        module.spread = json.spread ?? 360;
        module.emissionAngle = json.emissionAngle ?? -90;
        module.maxParticles = json.maxParticles ?? 100;
        module.autoPlay = json.autoPlay ?? true;
        module.looping = json.looping ?? true;
        module.burst = json.burst ?? false;
        module.burstCount = json.burstCount ?? 10;
        module.shape = json.shape ?? 'circle';
        module.imagePath = json.imagePath ?? '';
        module.fadeOut = json.fadeOut ?? true;
        module.scaleOverLifetime = json.scaleOverLifetime ?? true;
        module.rotateParticles = json.rotateParticles ?? false;
        module.rotationSpeed = json.rotationSpeed ?? 180;
        module.randomRotation = json.randomRotation ?? true;
        module.speedVariation = json.speedVariation ?? 0.2;
        module.lifetimeVariation = json.lifetimeVariation ?? 0.2;
        module.emitterWidth = json.emitterWidth ?? 0;
        module.emitterHeight = json.emitterHeight ?? 0;
        module.imageWidth = json.imageWidth ?? 32;
        module.imageHeight = json.imageHeight ?? 32;
        module.endImageWidth = json.endImageWidth ?? 8;
        module.endImageHeight = json.endImageHeight ?? 8;
        module.scaleImageOverLifetime = json.scaleImageOverLifetime ?? true;
        module.useYDepth = json.useYDepth ?? true;
        module.particleText = json.particleText ?? '$';
        module.fontSize = json.fontSize ?? 16;
        module.fontFamily = json.fontFamily ?? 'Arial, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        module.fontWeight = json.fontWeight ?? 'bold';
        module.enableWind = json.enableWind ?? false;
        module.useEnvironmentWind = json.useEnvironmentWind ?? false;
        module.windStrength = json.windStrength ?? 50;
        module.windDirection = json.windDirection ?? 0;
        module.windTurbulence = json.windTurbulence ?? 0.3;
        module.windResistance = json.windResistance ?? 0.5;
        module.relativePositioning = json.relativePositioning ?? true;
        module.useGPUProcessing = json.useGPUProcessing ?? false;
        module.enableBatching = json.enableBatching ?? true;
        module.batchSize = json.batchSize ?? 1000;
        // Gradient properties
        module.gradientInnerColor = json.gradientInnerColor ?? '#ffffff';
        module.gradientOuterColor = json.gradientOuterColor ?? '#000000';
        module.gradientType = json.gradientType ?? 'radial';
        // Blend mode
        module.blendMode = json.blendMode ?? 'source-over';
        // Collision properties
        module.enableCollision = json.enableCollision ?? false;
        module.collideWithTags = json.collideWithTags ?? 'solid';
        module.collisionBounciness = json.collisionBounciness ?? 0.5;
        module.collisionFriction = json.collisionFriction ?? 0.1;
        module.destroyOnCollision = json.destroyOnCollision ?? false;
        module.collisionDamping = json.collisionDamping ?? 0.98;
        module.collisionRadius = json.collisionRadius ?? 5;
        // Advanced physics
        module.enableForcePoints = json.enableForcePoints ?? false;
        module.forcePoints = Array.isArray(json.forcePoints) ? JSON.parse(JSON.stringify(json.forcePoints)) : [];
        module.drag = json.drag ?? 0;
        module.maxVelocity = json.maxVelocity ?? 0;
        module.orbitalSpeed = json.orbitalSpeed ?? 0;
        module.enableNoiseTurbulence = json.enableNoiseTurbulence ?? false;
        module.noiseStrength = json.noiseStrength ?? 30;
        module.noiseScale = json.noiseScale ?? 0.01;
        module.noiseSpeed = json.noiseSpeed ?? 1;
        module.vortexStrength = json.vortexStrength ?? 0;
        module.colliderCacheInterval = json.colliderCacheInterval ?? 0.25;
        return module;
    }

    /**
     * Clone the module
     * @returns {ParticleSystem} Cloned module
     */
    clone() {
        return ParticleSystem.fromJSON(this.toJSON());
    }
}

// Register module globally
if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
}
