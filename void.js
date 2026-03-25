/**
 * ============================================================
 *  VOID ENGINE — Landing Page Script  (void.js)
 *
 *  HOW TO EDIT:
 *  1. Nav sections    → SECTIONS array
 *  2. Features        → FEATURES array  (use Font Awesome class names for icon)
 *  3. Downloads       → DOWNLOADS array
 *  4. Example games   → EXAMPLE_GAMES array
 *  5. Update log      → UPDATE_LOG array  (newest entry FIRST)
 *  6. Roadmap         → ROADMAP array
 *  7. About text      → ABOUT_PARAGRAPHS array
 *  8. Editor link     → EDITOR_URL string
 *  9. Background FX   → SHADER_CONFIG object
 * 10. Pixel particles → PARTICLE_CONFIG object
 * ============================================================
 */

'use strict';

/* ============================================================
   CONFIGURATION — EDIT YOUR CONTENT HERE
   ============================================================ */

const SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'screenshots', label: 'Gallery' },
  { id: 'videos',      label: 'Videos'  },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'games', label: 'Examples' },
  { id: 'updates', label: 'Updates' },
  { id: 'download', label: 'Download' },
];

/**
 * icon → Font Awesome 6 class string, e.g. 'fa-solid fa-bolt'
 * Full icon list: https://fontawesome.com/icons
 */
const FEATURES = [
  { icon: 'fa-solid fa-bolt', title: 'Desktop Inspired Environment', desc: 'Built to resemble a familiar interface so you can navigate with ease!' },
  { icon: 'fa-solid fa-display', title: 'Online Editor', desc: 'Use Scene Editor, Prefab Editor, Audio DAW for sound creation, Animation tool and much much more, straight in the browser!' },
  { icon: 'fa-solid fa-earth-americas', title: 'Export Capabilities', desc: 'Deploy to Web, Desktop, and Mobile from one codebase!' },
  { icon: 'fa-solid fa-paint-roller', title: 'Built-in Modules', desc: 'Using a Modular based Game Object behavior system, with many built-in modules to get you started~' },
  { icon: 'fa-solid fa-volume-high', title: 'Spatial Audio', desc: 'Web Audio API integration with 2D positional audio sources, with accurate panning!' },
  { icon: 'fa-solid fa-puzzle-piece', title: 'Asset Management', desc: 'Being a desktop like environment, file browser can export/import asset packs(or individual files) to share/sell/reuse' },
  { icon: 'fa-solid fa-box-open', title: 'ThreeJS and PixiJS Support (WIP)', desc: 'ThreeJS and PixiJS are implemented but still in testing.' },
  { icon: 'fa-solid fa-code-branch', title: 'GitHub Version Control', desc: 'Use your own API key to use GitHub inside the editor to push/pull projects at will!' },
];

const DOWNLOADS = [
  { label: 'Download for Windows(COMING SOON)', href: '#', primary: true, note: 'v0.1.0-alpha · 64-bit' },
  { label: 'Download for macOS(COMING SOON)', href: '#', primary: false, note: 'v0.1.0-alpha · Universal' },
  { label: 'Download for Linux(COMING SOON)', href: '#', primary: false, note: 'v0.1.0-alpha · AppImage' },
  //{ label: 'View on GitHub',       href: '#', primary: false, note: 'Source code'              },
];

const EXAMPLE_GAMES = [
  { title: 'Platformer', desc: 'Platform game with procedural day/night system background.', thumb: '', url: '#' },
  { title: 'Creature Battleground', desc: 'Set up your creature battleground and watch them fight!', thumb: '', url: '#' },
  { title: 'Tower Defense', desc: "Simple tower defense game with 100 waves.", thumb: '', url: '#' },
  { title: 'Vehicle Controller', desc: 'Top-down vehicle controller with tire marks and gear changes.', thumb: '', url: '#' },
];

const SCREENSHOTS = [
  { src: 'screenshots/gta.png', caption: 'Top-Down Vehicle Physics' },
  { src: 'screenshots/platformer.png', caption: 'Platformer with Procedural Background' },
  { src: 'screenshots/tower-defense.png', caption: 'Tower Defense game play' },
  { src: 'screenshots/scene-editor.png', caption: 'Scene Editor: Where all the magic happens' },
  { src: 'screenshots/prefab-editor.png', caption: 'Prefab Editor: What is a Game Object without behavior Modules?' },
  { src: 'screenshots/module-selector.png', caption: 'Module Selector: Choose your modules with ease' },
  { src: 'screenshots/script-editor.png', caption: 'Script Editor: Gotta be able to code in a game engine' },
  { src: 'screenshots/animation-tool-1.png', caption: 'Animation Tool: With skeletal animation capabilities' },
  { src: 'screenshots/animation-tool-2.png', caption: 'Animation Tool: Generate particle animations' },
  { src: 'screenshots/animation-tool-3.png', caption: 'Animation Tool: Save as sprite sheet' },
  { src: 'screenshots/asset-manager.png', caption: 'Asset Manager: Have some Modules or Prefabs you wish to reuse in another project?' },
  { src: 'screenshots/audio-editor.png', caption: 'Audio Editor: Trim, use advanced effects and transform your audio files right in VOID' },
  { src: 'screenshots/audio-daw.png', caption: 'Audio DAW: Digital Audio Workstation for generating music or sound effects using a node-graph system' },
  { src: 'screenshots/github-control.png', caption: 'GitHub Version Control: Push and Pull your project repos inside VOID' },
  { src: 'screenshots/themes.png', caption: 'Theme Selector: Set the theme to a color that inspires you the most' },
  { src: 'screenshots/documentation.png', caption: 'Documentation: All the information you may need for the VOID API, right at your finger tips' },
  { src: 'screenshots/node-module-builder.png', caption: 'Node Module Builder: Create Modules using the extensive VOID API, without having to code' },
  // Add more: { src: 'path/to/image.png', caption: 'Your caption' },
];

const VIDEOS = [
  { id: 'PX2V1kBLpSQ', title: 'Void Showcase', desc: 'A quick intro to the editor' },
  { id: 'FB-jk0wkVBc', title: 'Scene Editor', desc: 'A short tutorial showing off the Scene Editor' },
  { id: 'I-bSEe_dcLg', title: 'V-Puppet Animator', desc: 'Showing the skeletal VPuppet Animator in action' },
  { id: 'MCwZAFrxVqg', title: 'Text Based Story Adventure', desc: '1 Module to create a Text Based Story' },
  { id: 'uC2keXJjug0', title: 'Minimap', desc: 'Showing how to implement a Minimap into your game' },
  { id: 'HbHb-6D5aLc', title: 'Intro Text Scroller', desc: 'Add intro text scrolling to the start of your game, or in between scenes. Tell a story!' },
  { id: 'QfT-1CklVnk', title: 'Tower Defense', desc: 'A tutorial for editing the Tower Defense template to make a Tower Defense game' },
  { id: 'umeabL10mZo', title: 'GitHub Version Control', desc: 'Push and Pull your project to/from GitHub at will using your own API key' },
  { id: 'oG9d6UqXkgQ', title: 'GTA 2 Type Vehicle Physics', desc: 'Top-Down vehicle physics with tire marks and gear changes, inspired by GTA 2' },
  // Add more: { id: 'YOUTUBE_VIDEO_ID', title: 'Title', desc: 'Description' },
  // The id is the part after ?v= in the YouTube URL
];

/* Add new entries at the TOP (newest first) */
const UPDATE_LOG = [
  {
    date: 'March 2026', version: 'v0.1.0-alpha',
    entries: [
      'Initial public alpha release.',
      'Online editor live at https://voidengine.wasmer.app/',
    ],
  },
  {
    date: 'February 2026', version: 'v0.0.9-dev',
    entries: [
      'Added node-graph based DAW for creating game sounds or music.',
      'Added VehicleController for top-down Vehcile physics.',
      'Fix memory leak in ProceduralCreature Module.',
    ],
  }
];

const ROADMAP = [
  {
    phase: 'Q1 2026', title: 'Alpha Launch', status: 'done',
    items: ['Public alpha release', 'Core ECS engine', 'Online editor beta', 'Basic renderer'],
  },
  {
    phase: 'Q2 2026', title: 'Editor Maturity', status: 'planned',
    items: ['Animation timeline', 'Collaborative editing', 'Asset marketplace'],
  },
  {
    phase: 'Q3 2026', title: 'Platform Expansion', status: 'planned',
    items: ['Mobile export (iOS / Android)', 'Console target research', 'Advanced physics (soft-body)', 'AI navigation mesh'],
  },
  {
    phase: 'Q4 2026', title: 'Beta Release', status: 'planned',
    items: ['Stable public beta', 'Full documentation site', 'Video tutorial series', 'Community showcase launch'],
  },
];

const EDITOR_URL = 'https://voidengine.wasmer.app/'; // ← replace with your real URL

const ABOUT_PARAGRAPHS = [
  'VOID is an easy to use, very powerful game engine built for the web. Lightweight by design, powerful in practice — write once, run everywhere.',
  'Born from frustration with bloated toolchains and closed ecosystems, VOID puts the source of truth in a single JS module you can read, fork, and understand. The online editor means your whole team can prototype in a browser tab, no setup required.',
  'Currently in public alpha. Expect rough edges, bold ideas, and relentless iteration.',
];

/* ============================================================
   SHADER CONFIG
   ============================================================ */
const SHADER_CONFIG = {
  baseSpeed: 0.08,   /* overall animation speed                        */
  scrollInfluence: 0.154,  /* lerp rate for scroll drift                     */
  mouseInfluence: 0.89,   /* how strongly the mouse warps the fluid (0–1)   */
  mouseLerp: 0.06,   /* how quickly the shader mouse tracks the cursor */
  colorA: [0.01, 0.00, 0.05],
  colorB: [0.20, 0.03, 0.52],
  colorC: [0.46, 0.10, 0.92],
};

/* ============================================================
   PARTICLE CONFIG — pixel box particles trailing the cursor
   ============================================================ */
const PARTICLE_CONFIG = {
  enabled: false,
  maxParticles: 180,      /* hard pool cap                                  */
  spawnRate: 1,        /* particles spawned per frame while mouse moves  */
  pixelSize: 4,        /* base size in CSS px (snapped to integer grid)  */
  pixelSizeVar: 3,        /* random ± added to pixelSize                   */
  lifetime: 2.4,      /* seconds until fully faded                      */
  gravity: 240,       /* downward acceleration  px/s²                   */
  spread: 120,       /* initial horizontal velocity spread px/s        */
  upwardBurst: 120,       /* initial upward kick px/s                       */
  colorPalette: [         /* colours sampled at random per particle         */
    'rgba(180, 80, 255,',
    'rgba(120, 40, 220,',
    'rgba(220,120, 255,',
    'rgba( 80, 20, 180,',
    'rgba(255,200, 255,',
  ],
};

const AUDIO_CONFIG = {
  enabled:       false,
  baseFreq:      55,        /* Hz — deep bass fundamental (A1)       */
  subFreq:       27.5,      /* Hz — sub-octave layer                  */
  pulseRate:     0.4,       /* Hz — throb speed (cycles per second)   */
  pulseDepth:    0.55,      /* 0–1 — how deep the volume dips         */
  masterVolume:  0.18,      /* 0–1 — overall loudness                 */
  filterFreq:    160,       /* Hz — low-pass cutoff for warmth        */
  filterQ:       6.5,       /* resonance on the low-pass filter       */
  harmonics: [              /* [frequency multiplier, relative gain]  */
    [1.0,  1.00],
    [1.5,  0.30],           /* power chord fifth                      */
    [2.0,  0.15],           /* octave                                 */
    [3.0,  0.06],           /* faint third harmonic rumble            */
  ],
};

const SPARKLE_CONFIG = {
  enabled:       false,
  minVelocity:   0.04,   /* mouse speed threshold before any sound         */
  maxVelocity:   0.48,   /* speed at which volume is capped                */
  baseVolume:    0.03,   /* max gain of a single tinkle hit                */
  minInterval:   100,     /* ms — minimum gap between spawned tinkles       */
  reverbTime:    4.2,    /* seconds — impulse reverb tail length           */
  reverbWet:     0.70,   /* 0–1 dry/wet mix                                */
  delayTime:     0.20,   /* seconds — echo delay                           */
  delayFeedback: 0.38,   /* 0–1 — how much echo repeats                    */
  delayWet:      0.40,
  /* Pentatonic scale frequencies (Hz) — all sound good together */
  notes: [2047, 2175, 2319, 2568, 2760, 3093, 3349, 3637],
};

const MUSIC_CONFIG = {
  fftSize:          2048,
  smoothingTime:    0.80,
  bassRange:        [0, 8],
  midRange:         [8, 64],
  highRange:        [64, 180],
  shaderSpeedMult:  1.5,
  shaderWarpMult:   1.2,
  particleBurstMult:6,
  beatThreshold:    0.18,
  beatCooldown:     180,
  volume:           0.85,
};

/* ============================================================
   MUSIC VISUALIZER STATE
   ============================================================ */
let musicCtx        = null;
let musicSource     = null;   /* AudioBufferSourceNode                    */
let musicAnalyser   = null;   /* AnalyserNode                             */
let musicGain       = null;   /* GainNode for volume                      */
let musicBuffer     = null;   /* decoded AudioBuffer                      */
let musicData       = null;   /* Uint8Array — analyser freq data          */
let musicPlaying    = false;
let musicEnabled    = false;
let lastBeatTime    = 0;

/* Live audio metrics — written each frame, read by renderLoop */
let audioBass       = 0;
let audioMid        = 0;
let audioHigh       = 0;
let audioBeat       = false;

/* ============================================================
   MACHINE HUM AUDIO SYSTEM
   ============================================================ */
let audioCtx       = null;
let audioMaster    = null;   /* master GainNode                         */
let audioFilter    = null;   /* low-pass for warmth                     */
let audioOscNodes  = [];     /* { osc, gain } pairs per harmonic        */
let audioLfoNode   = null;   /* LFO oscillator driving the pulse        */
let audioLfoGain   = null;   /* LFO depth control                      */
let audioStarted   = false;
let audioEnabled   = AUDIO_CONFIG.enabled;
let audioFadeGain  = null;

function initAudio() {
  if (audioStarted || !audioEnabled) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    /* 
      Signal chain:
      oscillators → audioFilter → audioFadeGain → audioMaster → destination
      LFO → audioLfoGain → audioFadeGain.gain   (modulates fade node, not master)
    */

    /* Final output — fixed at 1.0, never touched after init */
    audioMaster = audioCtx.createGain();
    audioMaster.gain.value = 1.0;
    audioMaster.connect(audioCtx.destination);

    /* This is the node we ramp for fade in/out */
    audioFadeGain = audioCtx.createGain();
    audioFadeGain.gain.setValueAtTime(0, audioCtx.currentTime);
    audioFadeGain.connect(audioMaster);

    /* Low-pass filter for warmth */
    audioFilter = audioCtx.createBiquadFilter();
    audioFilter.type            = 'lowpass';
    audioFilter.frequency.value = AUDIO_CONFIG.filterFreq;
    audioFilter.Q.value         = AUDIO_CONFIG.filterQ;
    audioFilter.connect(audioFadeGain);

    /* Sub-bass layer */
    const subOsc  = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type            = 'sine';
    subOsc.frequency.value = AUDIO_CONFIG.subFreq;
    subGain.gain.value     = 0.55;
    subOsc.connect(subGain);
    subGain.connect(audioFilter);
    subOsc.start();
    audioOscNodes.push({ osc: subOsc, gain: subGain });

    /* Harmonic layers */
    AUDIO_CONFIG.harmonics.forEach(([mult, relGain], i) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type            = i === 0 ? 'sawtooth' : (i % 2 === 0 ? 'square' : 'sawtooth');
      osc.frequency.value = AUDIO_CONFIG.baseFreq * mult;
      gain.gain.value     = relGain;
      osc.connect(gain);
      gain.connect(audioFilter);
      osc.start();
      audioOscNodes.push({ osc, gain });
    });

    /* LFO → modulates audioFadeGain.gain around its DC value */
    audioLfoNode = audioCtx.createOscillator();
    audioLfoGain = audioCtx.createGain();
    audioLfoNode.type            = 'sine';
    audioLfoNode.frequency.value = AUDIO_CONFIG.pulseRate;

    const depth = AUDIO_CONFIG.pulseDepth * 0.5 * AUDIO_CONFIG.masterVolume;
    audioLfoGain.gain.value = depth;
    audioLfoNode.connect(audioLfoGain);
    audioLfoGain.connect(audioFadeGain.gain);  /* ← modulate fade node, not master */

    audioLfoNode.start();
    audioStarted = true;

    /* Fade in over 3s — ramp the DC offset of audioFadeGain */
    const dcTarget = AUDIO_CONFIG.masterVolume * (1 - AUDIO_CONFIG.pulseDepth * 0.5);
    audioFadeGain.gain.linearRampToValueAtTime(dcTarget, audioCtx.currentTime + 3.0);

    /* Boot sparkle on same context */
    initSparkle(audioCtx);

  } catch (e) {
    console.warn('VOID: Web Audio unavailable.', e);
    audioEnabled = false;
  }
}

function destroyAudio() {
  if (!audioCtx) return;
  audioOscNodes.forEach(({ osc }) => { try { osc.stop(); } catch {} });
  audioOscNodes = [];
  try { audioLfoNode?.stop(); } catch {}
  audioCtx.close();
  audioCtx    = null;
  audioMaster = null;
  audioFilter = null;
  audioLfoNode= null;
  audioLfoGain= null;
  audioStarted= false;
  audioFadeGain = null;
  destroySparkle();
}

function toggleAudio() {
  if (!audioStarted) {
    initAudio();
    return;
  }
  audioEnabled = !audioEnabled;
  updateAudioBtn();

  if (!audioCtx) return;
  const now     = audioCtx.currentTime;
  const dcTarget = AUDIO_CONFIG.masterVolume * (1 - AUDIO_CONFIG.pulseDepth * 0.5);

  audioFadeGain.gain.cancelScheduledValues(now);
  audioFadeGain.gain.setValueAtTime(audioFadeGain.gain.value, now);

  if (audioEnabled) {
    audioFadeGain.gain.linearRampToValueAtTime(dcTarget, now + 1.8);
    sparkleEnabled = SPARKLE_CONFIG.enabled;
    if (sparkleMaster) {
      sparkleMaster.gain.cancelScheduledValues(now);
      sparkleMaster.gain.setValueAtTime(sparkleMaster.gain.value, now);
      sparkleMaster.gain.linearRampToValueAtTime(1.0, now + 1.8);
    }
  } else {
    audioFadeGain.gain.linearRampToValueAtTime(0.0, now + 1.8);
    if (sparkleMaster) {
      sparkleMaster.gain.cancelScheduledValues(now);
      sparkleMaster.gain.setValueAtTime(sparkleMaster.gain.value, now);
      sparkleMaster.gain.linearRampToValueAtTime(0.0, now + 1.8);
    }
    setTimeout(() => { sparkleEnabled = false; }, 1800);
  }
}

function updateAudioBtn() {
  const btn = document.getElementById('toggle-audio-btn');
  if (!btn) return;
  btn.textContent = audioEnabled ? 'HUM: ON' : 'HUM: OFF';
  btn.classList.toggle('active', audioEnabled);
}

/* ============================================================
   SPARKLE TINKLE SYSTEM
   ============================================================ */
let sparkleCtx        = null;
let sparkleMaster     = null;
let sparkleReverb     = null;
let sparkleDelay      = null;
let sparkleDelayFB    = null;
let sparkleDelayWet   = null;
let sparkleReverbWet  = null;
let sparkleDry        = null;
let sparkleReady      = false;
let sparkleEnabled    = SPARKLE_CONFIG.enabled;
let lastSparkleTime   = 0;

/* Build a simple reverb impulse response from noise */
function buildImpulse(ctx, duration, decay) {
  const rate    = ctx.sampleRate;
  const length  = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function initSparkle(ctx) {
  /* Reuse the main AudioContext passed in from initAudio */
  sparkleCtx = ctx;

  /* Master out for sparkle chain */
  sparkleMaster = ctx.createGain();
  sparkleMaster.gain.value = 1.0;

  /* Dry path */
  sparkleDry = ctx.createGain();
  sparkleDry.gain.value = 1.0 - SPARKLE_CONFIG.reverbWet;
  sparkleDry.connect(ctx.destination);

  /* ---- Delay ---- */
  const delayNode      = ctx.createDelay(1.0);
  delayNode.delayTime.value = SPARKLE_CONFIG.delayTime;

  sparkleDelayFB = ctx.createGain();
  sparkleDelayFB.gain.value = SPARKLE_CONFIG.delayFeedback;

  sparkleDelayWet = ctx.createGain();
  sparkleDelayWet.gain.value = SPARKLE_CONFIG.delayWet;

  delayNode.connect(sparkleDelayFB);
  sparkleDelayFB.connect(delayNode);          /* feedback loop */
  sparkleMaster.connect(delayNode);
  delayNode.connect(sparkleDelayWet);
  sparkleDelayWet.connect(ctx.destination);

  /* ---- Convolution reverb ---- */
  sparkleReverb = ctx.createConvolver();
  sparkleReverb.buffer = buildImpulse(ctx, SPARKLE_CONFIG.reverbTime, 3.2);

  sparkleReverbWet = ctx.createGain();
  sparkleReverbWet.gain.value = SPARKLE_CONFIG.reverbWet;

  sparkleMaster.connect(sparkleReverb);
  sparkleReverb.connect(sparkleReverbWet);
  sparkleReverbWet.connect(ctx.destination);

  /* Dry signal */
  sparkleMaster.connect(sparkleDry);

  sparkleReady = true;
}

/**
 * Fire a single tinkle hit.
 * velocity: 0.0–1.0 normalised mouse speed
 */
function fireTinkle(velocity) {
  if (!sparkleReady || !sparkleCtx || !sparkleEnabled) return;

  const cfg  = SPARKLE_CONFIG;
  const now  = sparkleCtx.currentTime;

  /* Pick a random note from pentatonic scale */
  const freq = cfg.notes[Math.random() * cfg.notes.length | 0];

  /* Volume scales with mouse speed */
  const vol  = cfg.baseVolume * Math.pow(velocity, 0.7);

  /* ---- Oscillator: sine with a tiny detune for shimmer ---- */
  const osc  = sparkleCtx.createOscillator();
  osc.type   = 'sine';
  osc.frequency.value  = freq;
  osc.detune.value     = (Math.random() - 0.5) * 14; /* ±7 cents shimmer */

  /* ---- Gain envelope: sharp attack, fast exponential decay ---- */
  const env = sparkleCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(vol, now + 0.006);   /* 6ms attack      */
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.55); /* decay tail */

  /* ---- High-pass so it sits above the bass drone ---- */
  const hp  = sparkleCtx.createBiquadFilter();
  hp.type   = 'highpass';
  hp.frequency.value = 900;
  hp.Q.value         = 0.8;

  osc.connect(hp);
  hp.connect(env);
  env.connect(sparkleMaster);

  osc.start(now);
  osc.stop(now + 0.6);   /* auto-GC after envelope ends */
}

function tickSparkle(mouseVel) {
  if (!sparkleEnabled || !sparkleReady) return;

  const cfg = SPARKLE_CONFIG;
  if (mouseVel < cfg.minVelocity) return;

  const now = performance.now();
  if (now - lastSparkleTime < cfg.minInterval) return;
  lastSparkleTime = now;

  /* Normalise velocity to 0–1 range */
  const normVel = Math.min(1, (mouseVel - cfg.minVelocity) / (cfg.maxVelocity - cfg.minVelocity));

  /* Occasionally fire a second note for fast flicks */
  fireTinkle(normVel);
  if (normVel > 0.65 && Math.random() < 0.45) {
    setTimeout(() => fireTinkle(normVel * 0.6), 28);
  }
}

function destroySparkle() {
  sparkleReady  = false;
  sparkleCtx    = null;
  sparkleMaster = null;
  sparkleReverb = null;
}

/* ============================================================
   MUSIC VISUALIZER SYSTEM
   ============================================================ */

/** Bootstrap the AudioContext + analyser chain. */
function initMusicContext() {
  if (musicCtx) return true;
  try {
    musicCtx      = new (window.AudioContext || window.webkitAudioContext)();
    musicAnalyser = musicCtx.createAnalyser();
    musicAnalyser.fftSize               = MUSIC_CONFIG.fftSize;
    musicAnalyser.smoothingTimeConstant = MUSIC_CONFIG.smoothingTime;
    musicGain               = musicCtx.createGain();
    musicGain.gain.value    = MUSIC_CONFIG.volume;
    musicData               = new Uint8Array(musicAnalyser.frequencyBinCount);

    /* Chain: source → gain → analyser → destination */
    musicGain.connect(musicAnalyser);
    musicAnalyser.connect(musicCtx.destination);
    return true;
  } catch(e) {
    console.warn('VOID: Could not init music AudioContext.', e);
    return false;
  }
}

/** Load an ArrayBuffer of audio data and start looping playback. */
async function loadAndPlayMusic(arrayBuffer) {
  if (!initMusicContext()) return;
  if (musicCtx.state === 'suspended') await musicCtx.resume();
  stopMusic();

  try {
    musicBuffer = await musicCtx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('VOID: Could not decode audio file.', e);
    updateMusicBtn('MUSIC: ERR');
    return;
  }

  musicSource        = musicCtx.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop   = true;
  musicSource.connect(musicGain);  /* source → gain (gain is already chained to analyser → destination) */
  musicSource.start(0);
  musicPlaying = true;
  musicEnabled = true;
  updateMusicBtn('MUSIC: ON');
}

async function loadMusicFromURL(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    await loadAndPlayMusic(ab);
    const label = document.getElementById('music-file-label');
    if (label) label.textContent = url.split('/').pop(); /* show filename */
  } catch(e) {
    console.warn('VOID: Could not load music from URL.', e);
    updateMusicBtn('MUSIC: ERR');
  }
}

function stopMusic() {
  if (musicSource) {
    try { musicSource.stop(); } catch {}
    musicSource.disconnect();
    musicSource = null;
  }
  musicPlaying = false;
}

function toggleMusic() {
  if (!musicBuffer) return; /* nothing loaded yet */
  if (musicPlaying) {
    stopMusic();
    musicEnabled = false;
    updateMusicBtn('MUSIC: OFF');
  } else {
    /* Re-create source from existing buffer */
    if (!musicCtx) return;
    musicSource        = musicCtx.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop   = true;
    musicSource.connect(musicGain);
    musicSource.start(0);
    musicPlaying = true;
    musicEnabled = true;
    updateMusicBtn('MUSIC: ON');
  }
}

function updateMusicBtn(label) {
  const btn = document.getElementById('music-toggle-btn');
  if (btn) {
    btn.textContent = label;
    btn.classList.toggle('active', musicPlaying);
  }
}

/**
 * Sample the analyser and write normalised energy values into
 * audioBass / audioMid / audioHigh / audioBeat.
 * Call once per frame from renderLoop.
 */
function tickMusicAnalyser() {
  if (!musicAnalyser || !musicPlaying || !musicData) {
    audioBass = 0; audioMid = 0; audioHigh = 0; audioBeat = false;
    return;
  }

  musicAnalyser.getByteFrequencyData(musicData);

  const avg = (lo, hi) => {
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += musicData[i];
    return sum / ((hi - lo) * 255); /* normalise 0–1 */
  };

  audioBass  = avg(...MUSIC_CONFIG.bassRange);
  audioMid   = avg(...MUSIC_CONFIG.midRange);
  audioHigh  = avg(...MUSIC_CONFIG.highRange);

  /* Beat detection — simple threshold on bass */
  const now = performance.now();
  if (audioBass > MUSIC_CONFIG.beatThreshold && (now - lastBeatTime) > MUSIC_CONFIG.beatCooldown) {
    audioBeat   = true;
    lastBeatTime = now;
  } else {
    audioBeat = false;
  }
}

/** Build the music controls UI and add them to the fx-controls nav li. */
function buildMusicControls() {
  const fxLi = document.querySelector('.fx-controls');
  if (!fxLi) return;

  /* Hidden file input */
  const fileInput = document.createElement('input');
  fileInput.type   = 'file';
  fileInput.accept = 'audio/*';
  fileInput.id     = 'music-file-input';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    await loadAndPlayMusic(ab);
    /* Update the label to show the filename (truncated) */
    const label = document.getElementById('music-file-label');
    if (label) label.textContent = file.name.length > 18
      ? file.name.slice(0, 15) + '…'
      : file.name;
  });

  /* "Load Music" button — triggers the file picker */
  const loadBtn = document.createElement('button');
  loadBtn.id        = 'music-load-btn';
  loadBtn.textContent = '♪ LOAD';
  loadBtn.setAttribute('aria-label', 'Load music file');
  loadBtn.style.cssText = navBtnStyle();
  loadBtn.addEventListener('click', () => fileInput.click());

  /* Auto-load a bundled track — comment out if you want manual-only */
  const AUTO_TRACK = 'your-track.mp3'; /* ← set to your actual filename */

  /* Load on first user interaction to satisfy browser autoplay policy */
 /* const autoLoad = () => {
    loadMusicFromURL(AUTO_TRACK);
    document.removeEventListener('click',     autoLoad);
    document.removeEventListener('keydown',   autoLoad);
    document.removeEventListener('touchstart',autoLoad);
  };
  document.addEventListener('click',      autoLoad, { once: true });
  document.addEventListener('keydown',    autoLoad, { once: true });
  document.addEventListener('touchstart', autoLoad, { once: true });*/

  /* Play/pause toggle */
  const toggleBtn = document.createElement('button');
  toggleBtn.id          = 'music-toggle-btn';
  toggleBtn.textContent = 'MUSIC: –';
  toggleBtn.setAttribute('aria-label', 'Toggle music playback');
  toggleBtn.style.cssText = navBtnStyle();
  toggleBtn.addEventListener('click', toggleMusic);

  /* Filename display */
  const label = document.createElement('span');
  label.id = 'music-file-label';
  label.style.cssText = [
    'font-family:var(--font-mono)',
    'font-size:0.55rem',
    'color:var(--accent)',
    'opacity:0.7',
    'white-space:nowrap',
    'max-width:110px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'flex-shrink:0',
  ].join(';');
  label.textContent = 'no file';

  fxLi.appendChild(fileInput);
  fxLi.appendChild(loadBtn);
  fxLi.appendChild(toggleBtn);
  fxLi.appendChild(label);
}

/* Shared inline style string for nav control buttons */
function navBtnStyle() {
  return [
    'font-family:var(--font-mono)',
    'font-size:0.65rem',
    'text-transform:uppercase',
    'letter-spacing:0.1em',
    'color:var(--accent)',
    'background:transparent',
    'border:1px solid var(--accent)',
    'padding:4px 9px',
    'border-radius:var(--radius)',
    'cursor:pointer',
    'white-space:nowrap',
    'flex-shrink:0',
  ].join(';');
}

function destroyMusic() {
  stopMusic();
  if (musicCtx) { musicCtx.close(); musicCtx = null; }
  musicAnalyser = null;
  musicGain     = null;
  musicBuffer   = null;
  musicData     = null;
  musicEnabled  = false;
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
let _lightboxItems = [];   /* { src, caption } — full list          */
let _lightboxIndex = 0;    /* currently shown index                 */

function buildLightbox() {
  if (document.getElementById('lightbox')) return;

  const el = document.createElement('div');
  el.id = 'lightbox';
  el.innerHTML = `
    <div class="lightbox-overlay"></div>
    <div class="lightbox-box">
      <div class="lightbox-img-wrap">
        <button class="lightbox-close" aria-label="Close">&times;</button>
        <button class="lightbox-arrow prev" aria-label="Previous">&#8249;</button>
        <a id="lightbox-full-link" href="" target="_blank" rel="noopener" title="Open full resolution in new tab">
          <img id="lightbox-img" src="" alt="" />
        </a>
        <button class="lightbox-arrow next" aria-label="Next">&#8250;</button>
      </div>
      <div class="lightbox-footer">
        <span class="lightbox-caption" id="lightbox-caption"></span>
        <a id="lightbox-full-link-label" href="" target="_blank" rel="noopener" class="lightbox-fullres-hint">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Full resolution
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);
  el.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  el.querySelector('.lightbox-arrow.prev').addEventListener('click', () => stepLightbox(-1));
  el.querySelector('.lightbox-arrow.next').addEventListener('click', () => stepLightbox(1));

  document.addEventListener('keydown', e => {
    if (!el.classList.contains('visible')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
}

function openLightbox(items, index) {
  _lightboxItems = items;
  _lightboxIndex = index;
  renderLightbox();
  document.getElementById('lightbox').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('visible');
  document.body.style.overflow = '';
}

function stepLightbox(dir) {
  _lightboxIndex = (_lightboxIndex + dir + _lightboxItems.length) % _lightboxItems.length;
  renderLightbox();
}

function renderLightbox() {
  const { src, caption } = _lightboxItems[_lightboxIndex];
  const img     = document.getElementById('lightbox-img');
  const cap     = document.getElementById('lightbox-caption');
  const arrows  = document.querySelectorAll('.lightbox-arrow');
  const link    = document.getElementById('lightbox-full-link');
  const linkLabel = document.getElementById('lightbox-full-link-label');

  img.src = src;
  img.alt = caption;
  cap.textContent = caption;
  if (link)      link.href = src;
  if (linkLabel) linkLabel.href = src;

  arrows.forEach(a => a.style.display = _lightboxItems.length < 2 ? 'none' : '');
}

/* ============================================================
   SCREENSHOTS
   ============================================================ */
const INITIAL_SCREENSHOTS = 6;

function buildScreenshots() {
  const grid = document.getElementById('screenshots-grid');
  if (!grid) return;

  buildLightbox();

  const items = SCREENSHOTS; /* full array for lightbox navigation */

  SCREENSHOTS.forEach(({ src, caption }, i) => {
    const card = document.createElement('div');
    card.classList.add('screenshot-card');
    if (i >= INITIAL_SCREENSHOTS) card.style.display = 'none';
    card.innerHTML = `
      <img src="${src}" alt="${caption}" loading="lazy" />
      <div class="screenshot-caption">${caption}</div>
    `;
    card.addEventListener('click', () => openLightbox(items, i));
    grid.appendChild(card);
  });

  /* Only render the button if there's something to show */
  if (SCREENSHOTS.length <= INITIAL_SCREENSHOTS) return;

  const wrap = document.createElement('div');
  wrap.classList.add('show-more-wrap');

  const btn = document.createElement('button');
  btn.classList.add('show-more-btn');
  btn.innerHTML = `Show More <i class="fa-solid fa-chevron-down"></i>`;

  let expanded = false;
  btn.addEventListener('click', () => {
    expanded = !expanded;
    const cards = grid.querySelectorAll('.screenshot-card');
    cards.forEach((c, i) => {
      if (i >= INITIAL_SCREENSHOTS) c.style.display = expanded ? '' : 'none';
    });
    btn.innerHTML = expanded
      ? `Show Less <i class="fa-solid fa-chevron-down"></i>`
      : `Show More <i class="fa-solid fa-chevron-down"></i>`;
    btn.classList.toggle('expanded', expanded);
  
    /* Scroll back to section top when collapsing */
    if (!expanded) {
      document.getElementById('screenshots')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  wrap.appendChild(btn);
  grid.insertAdjacentElement('afterend', wrap);
}

/* ============================================================
   VIDEO LIGHTBOX
   ============================================================ */
function buildVideoLightbox() {
  if (document.getElementById('video-lightbox')) return;

  const el = document.createElement('div');
  el.id = 'video-lightbox';
  el.innerHTML = `
  <div class="vlb-overlay"></div>
  <div class="vlb-box">
    <div class="vlb-iframe-wrap">
      <iframe
        id="vlb-iframe"
        src=""
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
    <div class="vlb-info">
      <div>
        <div class="vlb-title" id="vlb-title"></div>
        <div class="vlb-desc"  id="vlb-desc"></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <a id="vlb-yt-link" href="" target="_blank" rel="noopener" class="vlb-yt-btn">
          <i class="fa-brands fa-youtube"></i> Watch on YouTube
        </a>
        <button class="vlb-close" id="vlb-close">✕ Close</button>
      </div>
    </div>
  </div>
`;
  document.body.appendChild(el);

  el.querySelector('.vlb-overlay').addEventListener('click', closeVideoLightbox);
  el.querySelector('#vlb-close').addEventListener('click', closeVideoLightbox);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && el.classList.contains('visible')) closeVideoLightbox();
  });
}

function openVideoLightbox(id, title, desc) {
  const el     = document.getElementById('video-lightbox');
  const iframe = document.getElementById('vlb-iframe');
  const tEl    = document.getElementById('vlb-title');
  const dEl    = document.getElementById('vlb-desc');

  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  tEl.textContent = title;
  dEl.textContent = desc || '';

  /* If the iframe fires an error, fall back to opening in a new tab */
  iframe.onerror = () => {
    closeVideoLightbox();
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener');
  };

  const ytLink = document.getElementById('vlb-yt-link');
  if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${id}`;

  el.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeVideoLightbox() {
  const el     = document.getElementById('video-lightbox');
  const iframe = document.getElementById('vlb-iframe');

  /* Wipe the src so the video actually stops — just hiding the modal
     leaves the audio playing in the background */
  iframe.src = '';

  el.classList.remove('visible');
  document.body.style.overflow = '';
}

/* ============================================================
   VIDEOS
   ============================================================ */
const INITIAL_VIDEOS = 6;

function buildVideos() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  buildVideoLightbox();

  VIDEOS.forEach(({ id, title, desc }, i) => {
    const card = document.createElement('div');
    card.classList.add('video-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Watch ${title}`);
    if (i >= INITIAL_VIDEOS) card.style.display = 'none';

    /* Thumbnail from YouTube — no iframe needed until clicked */
    card.innerHTML = `
      <div class="video-thumb-wrap">
        <img
          src="https://img.youtube.com/vi/${id}/hqdefault.jpg"
          alt="${title}"
          loading="lazy"
          onerror="this.src=''; this.closest('.video-thumb-wrap').classList.add('thumb-missing')"
        />
        <div class="video-play-btn" aria-hidden="true">
          <i class="fa-solid fa-play"></i>
        </div>
      </div>
      <div class="video-info">
        <h3>${title}</h3>
        ${desc ? `<p>${desc}</p>` : ''}
      </div>
    `;

    const open = () => openVideoLightbox(id, title, desc);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });

    grid.appendChild(card);
  });

  if (VIDEOS.length <= INITIAL_VIDEOS) return;

  const wrap = document.createElement('div');
  wrap.classList.add('show-more-wrap');

  const btn = document.createElement('button');
  btn.classList.add('show-more-btn');
  btn.innerHTML = `Show More <i class="fa-solid fa-chevron-down"></i>`;

  let expanded = false;
  btn.addEventListener('click', () => {
    expanded = !expanded;
    grid.querySelectorAll('.video-card').forEach((c, i) => {
      if (i >= INITIAL_VIDEOS) c.style.display = expanded ? '' : 'none';
    });
    btn.innerHTML = expanded
      ? `Show Less <i class="fa-solid fa-chevron-down"></i>`
      : `Show More <i class="fa-solid fa-chevron-down"></i>`;
    btn.classList.toggle('expanded', expanded);
    if (!expanded) {
      document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  wrap.appendChild(btn);
  grid.insertAdjacentElement('afterend', wrap);
}

/* ============================================================
   SHADERS
   ============================================================ */
const VERT = `
  void main() { gl_Position = vec4(position, 1.0); }
`;

/**
 * Nebula + water-physics shader.
 *
 * Mouse position drives a pair of radial disturbance waves that
 * warp the domain-warped FBM field, giving a fluid/water ripple
 * feel as the cursor moves.  The mouse velocity (uMouseVel) adds
 * an extra high-frequency splash at the cursor tip.
 */
const FRAG = `
  precision highp float;

  uniform float uTime;
  uniform float uScroll;
  uniform vec2  uRes;
  uniform vec2  uMouse;      /* normalised 0-1, aspect-corrected in shader */
  uniform float uMouseVel;   /* scalar speed of cursor movement            */
  uniform float uMouseInfl;  /* SHADER_CONFIG.mouseInfluence               */
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;

  /* ---- Noise ---- */
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),           hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v=0.0, a=0.50, f=1.0;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f); a*=0.50; f*=2.07;
    v+=a*smoothNoise(p*f);
    return v;
  }

  /* Domain-warped nebula */
  float nebula(vec2 p) {
    vec2 q = vec2(fbm(p), fbm(p+vec2(6.2,1.3)));
    vec2 r = vec2(fbm(p+4.0*q+vec2(1.7,9.2)), fbm(p+4.0*q+vec2(8.3,2.8)));
    return fbm(p + 4.8*r);
  }

  /* ---- Water disturbance centred at cursor ---- */
  vec2 waterRipple(vec2 uv, vec2 mouseUV, float t, float strength) {
    vec2  delta = uv - mouseUV;
    float dist  = length(delta);

    /* Two concentric ripple rings that expand outward over time */
    float ring1 = sin(dist * 28.0 - t * 5.5) * exp(-dist * 6.0);
    float ring2 = sin(dist * 14.0 - t * 3.8) * exp(-dist * 3.5);

    /* Displacement along normal from cursor */
    vec2  norm  = dist > 0.001 ? delta / dist : vec2(0.0);
    float disp  = (ring1 * 0.55 + ring2 * 0.35) * strength;

    /* Extra velocity splash at the cursor tip */
    float splash = exp(-dist * 22.0) * uMouseVel * 0.6 * strength;

    return norm * (disp + splash);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float t = uTime;
    float scrollDrift = -uScroll * 0.00028;

    /* Mouse in same aspect-corrected space as p */
    vec2 mouseP = (uMouse - 0.5) * vec2(aspect, 1.0);

    /* Water ripple displacement from cursor */
    vec2 ripple = waterRipple(p, mouseP, t, uMouseInfl * 0.18);

    /* Nebula layers with ripple warp baked in */
    vec2 p1 = p * 1.5 + ripple + vec2(sin(t*0.11)*0.07, t*0.025+scrollDrift);
    float n1 = nebula(p1);

    vec2 p2 = p * 2.6 + ripple * 1.4 + vec2(cos(t*0.08+1.1)*0.05, t*0.055+scrollDrift*1.6);
    float n2 = nebula(p2);

    float n = n1 * 0.60 + n2 * 0.40;

    /* Radial vignette */
    float vignette = 1.0 - smoothstep(0.28, 1.05, length(p));
    n *= vignette * 1.35;

    /* Cursor proximity glow — bright halo where mouse is */
    float cursorDist  = length(p - mouseP);
    float cursorGlow  = exp(-cursorDist * 9.0) * uMouseInfl * 0.45;
    n = min(1.0, n + cursorGlow);

    /* Pulsing internal colour */
    float glow = sin(t*0.19 + n*6.28) * 0.5 + 0.5;

    vec3 col = mix(uColorA, uColorB, smoothstep(0.00, 0.52, n));
    col       = mix(col,    uColorC, smoothstep(0.46, 0.82, n) * (0.55 + glow * 0.45));

    /* Blue-violet shimmer on bright blobs */
    float shine = smoothstep(0.65, 0.90, n2) * 0.22;
    col += vec3(shine*0.35, shine*0.08, shine);

    /* Cursor-local colour tint — warmer violet at cursor */
    col += uColorC * cursorGlow * 0.6;

    col = pow(max(col, vec3(0.0)), vec3(0.87));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ============================================================
   THREE.JS STATE
   ============================================================ */
let threeEnabled = true;
let renderer, scene, camera, planeMesh, clock;
let animFrameId = null;   /* ← cancelAnimationFrame handle                */

let scrollTarget = 0.0;
let scrollSmooth = 0.0;

/* Mouse tracking */
let mouseNorm = { x: 0.5, y: 0.5 };   /* normalised 0-1             */
let mouseSmooth = { x: 0.5, y: 0.5 };   /* lerped value fed to shader */
let mouseVelRaw = 0.0;                   /* instantaneous speed        */
let mouseVelSmooth = 0.0;                   /* smoothed speed for shader  */
let lastMousePos = { x: 0, y: 0 };
let lastMouseTime = performance.now();

/* Intensity (opacity) — 0.0 – 1.0 */
let bgIntensity = getSavedPref('void_intensity', '0.5');
bgIntensity = parseFloat(bgIntensity);

/* ============================================================
   SAFE LOCAL STORAGE HELPER
   ============================================================ */
function getSavedPref(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

function setSavedPref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ============================================================
   PIXEL PARTICLE SYSTEM
   ============================================================ */

/**
 * Each particle is a plain object (no DOM, no canvas element).
 * They are all drawn onto a single shared 2D canvas overlay.
 *
 * Particle pool: we recycle dead entries rather than allocating
 * new objects constantly, keeping GC pressure near zero.
 */
let particleCanvas = null;
let particleCtx = null;
let particlePool = [];   /* fixed-size pool                               */
let particleActive = 0;    /* count of live particles in pool[0..active-1] */
let particleEnabled = PARTICLE_CONFIG.enabled;
let lastParticleTime = performance.now();

/* Pre-built colour cache: append alpha value when drawing */
const _palette = PARTICLE_CONFIG.colorPalette;

function _randPaletteBase() {
  return _palette[Math.random() * _palette.length | 0];
}

/**
 * Initialise the 2D canvas overlay that sits above the WebGL canvas
 * but below page content (pointer-events: none).
 */
function initParticleCanvas() {
  particleCanvas = document.createElement('canvas');
  particleCanvas.id = 'particle-canvas';
  particleCanvas.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:1',         /* above bg-canvas (z-index:0), below page content */
  ].join(';');

  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;

  /* Insert right after the WebGL canvas */
  const bgCanvas = document.getElementById('bg-canvas');
  bgCanvas ? bgCanvas.after(particleCanvas) : document.body.prepend(particleCanvas);

  particleCtx = particleCanvas.getContext('2d');

  /* Pre-fill the pool with dead particle objects */
  for (let i = 0; i < PARTICLE_CONFIG.maxParticles; i++) {
    particlePool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, size: 0, age: 0, lifetime: 0, colorBase: '' });
  }
}

/** Resize particle canvas to match window */
function resizeParticleCanvas() {
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

/**
 * Spawn up to `count` new particles at screen position (sx, sy).
 * Recycles the oldest dead slot; drops silently if pool is full.
 */
function spawnParticles(sx, sy, count) {
  if (!particleEnabled || !particleCtx) return;
  const cfg = PARTICLE_CONFIG;

  for (let i = 0; i < count; i++) {
    /* Find a dead slot — scan from end for cache friendliness */
    let slot = -1;
    for (let j = particlePool.length - 1; j >= 0; j--) {
      if (!particlePool[j].alive) { slot = j; break; }
    }
    if (slot === -1) return; /* pool exhausted */

    const p = particlePool[slot];
    const baseSize = cfg.pixelSize + (Math.random() * 2 - 1) * cfg.pixelSizeVar;

    /* Snap to pixel grid for that crunchy pixel look */
    p.x = Math.round(sx / 2) * 2;
    p.y = Math.round(sy / 2) * 2;
    p.vx = (Math.random() - 0.5) * cfg.spread * 2;
    p.vy = -(cfg.upwardBurst + Math.random() * cfg.upwardBurst);
    p.size = Math.max(2, Math.round(baseSize / 2) * 2); /* even px */
    p.age = 0;
    p.lifetime = cfg.lifetime * (0.75 + Math.random() * 0.5);
    p.colorBase = _randPaletteBase();
    p.alive = true;

    /* Swap into active region */
    if (slot >= particleActive) {
      /* swap with the first dead entry inside active range if any,
         otherwise just extend active count */
      particleActive = Math.max(particleActive, slot + 1);
    }
  }
}

/**
 * Update + draw all live particles.
 * Called from the main render loop so it stays in sync with rAF.
 */
function tickParticles(dtSec) {
  if (!particleCtx || !particleCanvas) return;

  const cfg = PARTICLE_CONFIG;
  const W = particleCanvas.width;
  const H = particleCanvas.height;

  /* Clear only — cheaper than fillRect on transparent canvas */
  particleCtx.clearRect(0, 0, W, H);

  if (!particleEnabled) return;

  let newActive = 0;

  for (let i = 0; i < particleActive; i++) {
    const p = particlePool[i];
    if (!p.alive) continue;

    p.age += dtSec;
    if (p.age >= p.lifetime) {
      p.alive = false;
      continue;
    }

    /* Physics */
    p.vy += cfg.gravity * dtSec;
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;

    /* Off-screen culling */
    if (p.x < -p.size || p.x > W + p.size || p.y > H + p.size) {
      p.alive = false;
      continue;
    }

    /* Alpha — smooth cubic ease-out fade */
    const t = p.age / p.lifetime;           /* 0 → 1               */
    const alpha = (1 - t) * (1 - t) * (1 - t); /* cubic ease-out      */

    /* Draw as a crisp pixel rectangle */
    particleCtx.fillStyle = `${p.colorBase}${alpha.toFixed(3)})`;
    particleCtx.fillRect(
      Math.round(p.x - p.size * 0.5),
      Math.round(p.y - p.size * 0.5),
      p.size,
      p.size,
    );

    newActive = i + 1;
  }

  /* Compact active count so we don't iterate dead tail every frame */
  particleActive = newActive;
}

/** Fully tear down the particle system — removes canvas, clears pool. */
function destroyParticles() {
  if (particleCanvas) {
    particleCanvas.remove();
    particleCanvas = null;
    particleCtx = null;
  }
  particlePool = [];
  particleActive = 0;
}

/* ============================================================
   INIT THREE
   ============================================================ */
function initThree() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0.0 },
        uScroll: { value: 0.0 },
        uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseVel: { value: 0.0 },
        uMouseInfl: { value: SHADER_CONFIG.mouseInfluence },
        uColorA: { value: new THREE.Vector3(...SHADER_CONFIG.colorA) },
        uColorB: { value: new THREE.Vector3(...SHADER_CONFIG.colorB) },
        uColorC: { value: new THREE.Vector3(...SHADER_CONFIG.colorC) },
      },
    });

    planeMesh = new THREE.Mesh(geo, mat);
    scene.add(planeMesh);
    clock = new THREE.Clock();

    /* Apply saved intensity */
    canvas.style.opacity = threeEnabled ? bgIntensity : '0';
    canvas.style.transition = 'opacity 1.4s ease';
    requestAnimationFrame(() => {
      if (threeEnabled) canvas.style.opacity = bgIntensity;
    });

    renderLoop();

  } catch (err) {
    console.warn('VOID: WebGL unavailable, CSS fallback active.', err);
    threeEnabled = false;
    showFallbackBg();
  }
}

/* ============================================================
   THREE.JS DISPOSAL
   ============================================================ */
function disposeThree() {
  /* Cancel the animation loop first so nothing fires mid-teardown */
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  if (planeMesh) {
    planeMesh.geometry.dispose();
    planeMesh.material.dispose();
    scene.remove(planeMesh);
    planeMesh = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss(); /* release GPU context immediately */
    renderer = null;
  }

  scene = null;
  camera = null;
  clock = null;
}

/* ============================================================
   RENDER LOOP
   ============================================================ */
let _lastFrameTime = performance.now();

function renderLoop() {
  animFrameId = requestAnimationFrame(renderLoop);

  const now = performance.now();
  const dtSec = Math.min((now - _lastFrameTime) / 1000, 0.1); /* clamp to 100ms */
  _lastFrameTime = now;

  /* --- Mouse smoothing (only lerp if there's meaningful difference) --- */
  const lerpRate = SHADER_CONFIG.mouseLerp;
  const dxMouse = mouseNorm.x - mouseSmooth.x;
  const dyMouse = mouseNorm.y - mouseSmooth.y;
  const EPS = 0.0001;

  if (Math.abs(dxMouse) > EPS || Math.abs(dyMouse) > EPS) {
    mouseSmooth.x += dxMouse * lerpRate;
    mouseSmooth.y += dyMouse * lerpRate;
  }

  mouseVelSmooth += (mouseVelRaw - mouseVelSmooth) * 0.08;
  mouseVelRaw *= 0.88; /* decay */

  tickSparkle(mouseVelSmooth);

  /* --- Music analyser tick --- */
  tickMusicAnalyser();

  /* --- Music → shader reactivity --- */
  if (musicPlaying && planeMesh) {
    const u = planeMesh.material.uniforms;
    /* Bass boosts animation speed */
    const speedBoost = 1.0 + audioBass * MUSIC_CONFIG.shaderSpeedMult;
    u.uTime.value = clock.getElapsedTime() * SHADER_CONFIG.baseSpeed / 0.18 * speedBoost;
    /* Mids boost warp intensity */
    u.uMouseInfl.value = SHADER_CONFIG.mouseInfluence + audioMid * MUSIC_CONFIG.shaderWarpMult;
  }

  /* --- Beat → particle burst --- */
  if (audioBeat && particleEnabled) {
    /* Fire particles from random positions across the screen on the beat */
    const cx = window.innerWidth  * (0.3 + Math.random() * 0.4);
    const cy = window.innerHeight * (0.3 + Math.random() * 0.4);
    spawnParticles(cx, cy, Math.ceil(audioBass * MUSIC_CONFIG.particleBurstMult * 10));
  }

  /* --- Scroll smoothing (only lerp if there's meaningful difference) --- */
  const dScroll = scrollTarget - scrollSmooth;
  if (Math.abs(dScroll) > 0.5) {
    scrollSmooth += dScroll * SHADER_CONFIG.scrollInfluence;
  }

  /* --- Particle tick --- */
  tickParticles(dtSec);

  /* --- Three.js render --- */
  if (!threeEnabled || !renderer) return;

  const u = planeMesh.material.uniforms;
  if (!musicPlaying) {
    u.uTime.value    = clock.getElapsedTime() * SHADER_CONFIG.baseSpeed / 0.18;
    u.uMouseInfl.value = SHADER_CONFIG.mouseInfluence;
  }
  u.uScroll.value = scrollSmooth;
  u.uMouse.value.set(mouseSmooth.x, mouseSmooth.y);
  u.uMouseVel.value = mouseVelSmooth + audioBass * 0.6; /* bass also fakes cursor velocity */

  renderer.render(scene, camera);
}

/* ============================================================
   MOUSE TRACKING
   ============================================================ */
function onMouseMove(e) {
  const now = performance.now();
  const dt = Math.max(1, now - lastMouseTime);

  const nx = e.clientX / window.innerWidth;
  const ny = 1.0 - (e.clientY / window.innerHeight); /* flip Y for GL */

  const dx = (nx - lastMousePos.x) * window.innerWidth;
  const dy = (ny - (1.0 - lastMousePos.y / window.innerHeight)) * window.innerHeight;
  mouseVelRaw = Math.min(Math.sqrt(dx * dx + dy * dy) / dt * 10, 1.0);

  mouseNorm.x = nx;
  mouseNorm.y = ny;

  /* Spawn particles at raw screen position (not flipped — canvas is CSS coords) */
  if (mouseVelRaw > 0.02) {
    spawnParticles(e.clientX, e.clientY, PARTICLE_CONFIG.spawnRate);
  }

  lastMousePos = { x: e.clientX, y: e.clientY };
  lastMouseTime = now;
}

/* Touch support — treat first touch as mouse */
function onTouchMove(e) {
  if (e.touches.length > 0) {
    onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }
}

function resizeThree() {
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (planeMesh) planeMesh.material.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
  }
  resizeParticleCanvas();
}

function showFallbackBg() {
  document.body.classList.add('no-webgl');
}

/* ============================================================
   TOGGLE BACKGROUND
   ============================================================ */
function toggleBackground() {
  threeEnabled = !threeEnabled;
  const canvas = document.getElementById('bg-canvas');
  const btn = document.getElementById('toggle-bg-btn');

  canvas.style.transition = 'opacity 0.6s ease';
  canvas.style.opacity = threeEnabled ? bgIntensity : '0';
  btn.textContent = threeEnabled ? 'FX: ON' : 'FX: OFF';
  btn.classList.toggle('active', threeEnabled);

  /* Also hide particles when FX is off */
  particleEnabled = threeEnabled && PARTICLE_CONFIG.enabled;
  if (particleCanvas) particleCanvas.style.opacity = threeEnabled ? '1' : '0';

  setSavedPref('void_bg', threeEnabled ? '1' : '0');
}

/* ============================================================
   INTENSITY SLIDER
   ============================================================ */
function setIntensity(val) {
  bgIntensity = parseFloat(val);
  setSavedPref('void_intensity', bgIntensity);
  const canvas = document.getElementById('bg-canvas');
  if (canvas && threeEnabled) canvas.style.opacity = bgIntensity;
}

/* ============================================================
   SCROLL HANDLER
   ============================================================ */
function onScroll() {
  scrollTarget = window.scrollY;
  updateNavHighlight();
  updateNavBg();
}

/* ============================================================
   LOADING MODAL
   ============================================================ */
function buildLoadingModal() {
  const el = document.createElement('div');
  el.id = 'loading-modal';
  el.innerHTML = `
    <div class="loader-ring-wrap">
      <div class="loader-ring ring-o3"></div>
      <div class="loader-ring ring-o2"></div>
      <div class="loader-ring ring-o1"></div>
      <div class="loader-ring ring-i3"></div>
      <div class="loader-ring ring-i2"></div>
      <div class="loader-ring ring-i1"></div>
      <div class="loader-center-dot"></div>
    </div>
    <span class="loader-text">Initializing&hellip;</span>
  `;
  document.body.prepend(el);
  return el;
}

function dismissLoadingModal(el, cb) {
  el.classList.add('fade-out');
  el.addEventListener('transitionend', () => { el.remove(); cb && cb(); }, { once: true });
}

/* ============================================================
   HINT MODAL
   ============================================================ */
const HINT_STORAGE_KEY = 'void_hint_seen';

function buildHintModal() {
  const el = document.createElement('div');
  el.id = 'hint-modal';
  el.innerHTML = `
    <div class="hint-overlay"></div>
    <div class="hint-box">
      <p class="hint-title">Welcome to VOID</p>
      <p class="hint-body">
        You can toggle the <strong style="color:var(--text)">background animation</strong> and
        <strong style="color:var(--text)">ambient machine hum</strong> at any time using the
        controls in the top-right corner of the navigation bar.
      </p>
      <div class="hint-footer">
        <label class="hint-check-label">
          <input type="checkbox" id="hint-dont-show" checked />
          Do not show on startup
        </label>
        <button class="hint-close-btn" id="hint-close-btn">Got It</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  /* Highlight the FX + audio buttons */
  const highlightTargets = () => {
    ['toggle-bg-btn', 'toggle-audio-btn', 'fx-intensity'].forEach(id => {
      document.getElementById(id)?.classList.add('nav-btn-highlight');
    });
  };

  const clearHighlights = () => {
    ['toggle-bg-btn', 'toggle-audio-btn', 'fx-intensity'].forEach(id => {
      document.getElementById(id)?.classList.remove('nav-btn-highlight');
    });
  };

  /* Show after a brief delay */
  setTimeout(() => {
    el.classList.add('visible');
    highlightTargets();
  }, 60);

  document.getElementById('hint-close-btn').addEventListener('click', () => {
    const dontShow = document.getElementById('hint-dont-show')?.checked;
    if (dontShow) setSavedPref(HINT_STORAGE_KEY, '1');
    clearHighlights();
    el.classList.remove('visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  });

  /* Close on overlay click */
  el.querySelector('.hint-overlay').addEventListener('click', () => {
    clearHighlights();
    el.classList.remove('visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  });
}

/* ============================================================
   NAV BAR
   ============================================================ */
function buildNav() {
  const ul = document.getElementById('nav-links');
  if (!ul) return;

  SECTIONS.forEach(({ id, label }) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = label;
    a.dataset.section = id;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      closeMobileMenu();
    });
    li.appendChild(a);
    ul.appendChild(li);
  });

  /* Editor link */
  const edLi = document.createElement('li');
  const edA = document.createElement('a');
  edA.href = EDITOR_URL;
  edA.textContent = 'Editor ↗';
  edA.target = '_blank';
  edA.rel = 'noopener';
  edA.classList.add('nav-editor-link');
  
  edLi.appendChild(edA);
  ul.appendChild(edLi);

  /* FX controls group */
  //const fxLi = document.createElement('li');
  //fxLi.classList.add('fx-controls');

  /* Toggle button */
  /*const fxBtn = document.createElement('button');
  fxBtn.id = 'toggle-bg-btn';
  fxBtn.textContent = 'FX: ON';
  fxBtn.classList.add('active');
  fxBtn.setAttribute('aria-label', 'Toggle background animation');
  fxBtn.addEventListener('click', toggleBackground);

  // Intensity slider 
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'fx-intensity';
  slider.min = '0.05';
  slider.max = '1.0';
  slider.step = '0.01';
  slider.value = bgIntensity;
  slider.setAttribute('aria-label', 'Background intensity');
  slider.addEventListener('input', () => setIntensity(slider.value));

  fxLi.appendChild(fxBtn);
  fxLi.appendChild(slider);*/

  /* Audio toggle button */
  /*const audioBtn = document.createElement('button');
  audioBtn.id          = 'toggle-audio-btn';
  audioBtn.textContent = 'HUM: OFF';
  audioBtn.classList.add('active');
  audioBtn.setAttribute('aria-label', 'Toggle machine hum audio');
  audioBtn.style.cssText = [
    'font-family:var(--font-mono)',
    'font-size:0.65rem',
    'text-transform:uppercase',
    'letter-spacing:0.1em',
    'color:var(--accent)',
    'background:transparent',
    'border:1px solid var(--accent)',
    'padding:4px 9px',
    'border-radius:var(--radius)',
    'cursor:pointer',
    'white-space:nowrap',
    'flex-shrink:0',
  ].join(';');
  audioBtn.addEventListener('click', toggleAudio);
  fxLi.appendChild(audioBtn);*/

  //ul.appendChild(fxLi);
}

function updateNavHighlight() {
  const mid = window.scrollY + window.innerHeight * 0.35;
  let current = SECTIONS[0].id;
  SECTIONS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= mid) current = id;
  });
  document.querySelectorAll('#nav-links a[data-section]').forEach(a => {
    a.classList.toggle('active', a.dataset.section === current);
  });
}

function updateNavBg() {
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
}

function buildHamburger() {
  const btn = document.getElementById('hamburger');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const menu = document.getElementById('nav-links');
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('open', open);
  });
}

function closeMobileMenu() {
  const menu = document.getElementById('nav-links');
  const btn = document.getElementById('hamburger');
  if (!menu) return;
  menu.classList.remove('open');
  btn?.classList.remove('open');
  btn?.setAttribute('aria-expanded', 'false');
}

/* ============================================================
   CONTENT BUILDERS
   ============================================================ */

function buildFeatures() {
  const grid = document.getElementById('features-grid');
  if (!grid) return;
  FEATURES.forEach(({ icon, title, desc }) => {
    const card = document.createElement('div');
    card.classList.add('feature-card');
    card.innerHTML = `
      <span class="feature-icon" aria-hidden="true"><i class="${icon}"></i></span>
      <h3>${title}</h3>
      <p>${desc}</p>
    `;
    grid.appendChild(card);
  });
}

function buildDownloads() {
  const container = document.getElementById('download-buttons');
  if (!container) return;
  DOWNLOADS.forEach(({ label, href, primary, note }) => {
    const wrap = document.createElement('div');
    wrap.classList.add('dl-wrap');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.classList.add('dl-btn');
    if (primary) a.classList.add('primary');
    wrap.appendChild(a);
    if (note) {
      const small = document.createElement('span');
      small.classList.add('dl-note');
      small.textContent = note;
      wrap.appendChild(small);
    }
    container.appendChild(wrap);
  });
}

function buildExampleGames() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;
  EXAMPLE_GAMES.forEach(({ title, desc, thumb, url }) => {
    const card = document.createElement('div');
    card.classList.add('game-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Play ${title}`);
    const open = () => window.open(url, '_blank', 'noopener');
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    card.innerHTML = `
      <div class="game-thumb"${thumb ? ` style="background-image:url('${thumb}')"` : ''}>
        ${!thumb ? '<span class="thumb-placeholder"><i class="fa-solid fa-play"></i></span>' : ''}
      </div>
      <div class="game-info">
        <h3>${title}</h3>
        <p>${desc}</p>
        <span class="play-tag">Play →</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function buildUpdateLog() {
  const container = document.getElementById('update-log');
  if (!container) return;
  UPDATE_LOG.forEach(({ date, version, entries }) => {
    const entry = document.createElement('div');
    entry.classList.add('log-entry');
    entry.innerHTML = `
      <div class="log-header">
        <span class="log-version">${version}</span>
        <span class="log-date">${date}</span>
      </div>
      <ul class="log-items">
        ${entries.map(e => `<li>${e}</li>`).join('')}
      </ul>
    `;
    container.appendChild(entry);
  });
}

function buildRoadmap() {
  /*const track = document.getElementById('roadmap-track');
  if (!track) return;
  ROADMAP.forEach(({ phase, title, status, items }) => {
    const node = document.createElement('div');
    node.classList.add('roadmap-node', `status-${status}`);
    node.innerHTML = `
      <div class="rm-dot"></div>
      <div class="rm-card">
        <span class="rm-phase">${phase}</span>
        <h3 class="rm-title">${title}</h3>
        <span class="rm-status">${statusLabel(status)}</span>
        <ul class="rm-items">${items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
    `;
    track.appendChild(node);
  });*/
}

function statusLabel(s) {
  return { done: '✓ Complete', active: '⚡ In Progress', planned: '○ Planned' }[s] || s;
}

function buildAbout() {
  const c = document.getElementById('about-text');
  if (!c) return;
  ABOUT_PARAGRAPHS.forEach(text => {
    const p = document.createElement('p');
    p.textContent = text;
    c.appendChild(p);
  });
}

/* ============================================================
   SCROLL-REVEAL
   ============================================================ */
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

/* ============================================================
   RESTORE PREFS
   ============================================================ */
function restorePrefs() {
  if (getSavedPref('void_bg', '1') === '0') {
    threeEnabled = false;
    particleEnabled = false;
    const canvas = document.getElementById('bg-canvas');
    if (canvas) { canvas.style.transition = 'none'; canvas.style.opacity = '0'; }
    if (particleCanvas) particleCanvas.style.opacity = '0';
    const btn = document.getElementById('toggle-bg-btn');
    if (btn) { btn.textContent = 'FX: OFF'; btn.classList.remove('active'); }
  }
  const slider = document.getElementById('fx-intensity');
  if (slider) slider.value = bgIntensity;
}

/* ============================================================
   TEARDOWN  (call if you ever hot-replace this module in a SPA)
   ============================================================ */
function teardown() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', resizeThree);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);

  disposeThree();
  destroyAudio();
  destroyParticles();
  destroyMusic();
}

/* Expose for SPA / HMR use */
if (typeof window !== 'undefined') window.__voidTeardown = teardown;

/* ============================================================
   INIT
   ============================================================ */
   function init() {
    buildNav();
    buildHamburger();
    buildFeatures();
    buildScreenshots();
    buildVideos();
    buildDownloads();
    buildExampleGames();
    buildUpdateLog();
    buildRoadmap();
    buildAbout();
  
    //initParticleCanvas();
    restorePrefs();
    
    //buildMusicControls();
  
    scrollTarget = window.scrollY;
    scrollSmooth = window.scrollY;
  
    //if (typeof THREE !== 'undefined') {
      //initThree();
    //} else {
      showFallbackBg();
      const btn = document.getElementById('toggle-bg-btn');
      if (btn) { btn.textContent = 'FX: N/A'; btn.disabled = true; }
      const slider = document.getElementById('fx-intensity');
      if (slider) slider.disabled = true;
  
      _lastFrameTime = performance.now();
      /*(function particleOnlyLoop() {
        animFrameId = requestAnimationFrame(particleOnlyLoop);
        const now   = performance.now();
        const dt    = Math.min((now - _lastFrameTime) / 1000, 0.1);
        _lastFrameTime = now;
        tickParticles(dt);
      })();*/
    //}
  
    window.addEventListener('scroll',    onScroll,    { passive: true });
    window.addEventListener('resize',    resizeThree, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
  
    document.querySelectorAll('.editor-cta').forEach(el => { el.href = EDITOR_URL; });
  
    /* Audio starts on first interaction */
    //document.addEventListener('click',     initAudio, { once: true });
    //document.addEventListener('keydown',   initAudio, { once: true });
    //document.addEventListener('touchstart',initAudio, { once: true });
  
    /* ---- Modals ---- */
    const loadingEl = buildLoadingModal(); 
  
    /* Wait for fonts + 1 rAF to ensure page is painted, then dismiss loader */
    document.fonts.ready.then(() => {
      /* Min display time of 1.6s so the spinner isn't just a flash */
      const minDisplay = 1000;
      const elapsed    = performance.now();
      const remaining  = Math.max(0, minDisplay - elapsed);
  
      setTimeout(() => {
        dismissLoadingModal(loadingEl, () => {
          /* Show hint modal after loader is gone, unless suppressed */
          setTimeout(initReveal, 80);
          //if (getSavedPref(HINT_STORAGE_KEY, '0') !== '1') {
          //  buildHintModal();
          //}
        });
      }, remaining);
    });
  }

document.addEventListener('DOMContentLoaded', init, { once: true });