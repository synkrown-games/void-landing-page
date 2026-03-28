/**
 * TDWaveManager Module
 * Tower Defense wave spawning system
 * Namespace: TowerDefense
 * 
 * Features:
 * - Progressive difficulty with enemy arrays
 * - Configurable wave patterns
 * - Spawn delays and intervals
 * - Multiple enemy types per wave with percentage-based spawning
 * - Automatic wave progression
 * - Enemies unlock progressively as waves increase
 */

class TDWaveManager extends Module {
    constructor() {
        super();
        
        // Wave Settings
        this.totalWaves = 10;
        this.autoStartWaves = false;
        this.waveStartDelay = 3; // Seconds before first enemy spawns
        this.enemySpawnInterval = 1; // Seconds between enemies
        this.maxEnemiesAtOnce = 15;
        
        // Progressive Difficulty
        this.baseEnemyCount = 5;
        this.enemiesPerWaveIncrease = 2;
        this.healthMultiplierPerWave = 1.1; // Each wave increases health by 10%
        this.speedMultiplierPerWave = 1.02; // Each wave increases speed by 2%
        
        // Enemy Prefabs Array (order matters - enemies unlock progressively)
        // First enemy available from wave 1, second from wave based on wavesBetweenNewEnemy, etc.
        this.enemyPrefabs = ['BasicEnemy'];
        this.wavesBetweenNewEnemy = 3; // How many waves before next enemy type is introduced
        
        // Enemy Mix Settings (how much newer enemies appear)
        this.newerEnemyBias = 0.6; // 0 = equal chance, 1 = heavily favor newer enemies
        this.mixIntensityPerWave = 0.1; // How much the mix intensifies per wave (0-1)
        
        // Spawn Position
        this.usePathStart = true; // If true, spawn at path start
        this.spawnX = 0;
        this.spawnY = 0;
        
        // Visual
        this.showWavePreview = true;
        
        // Start Wave Button
        this.showStartButton = true;
        this.buttonText = 'Start Wave';
        this.buttonNextWaveText = 'Next Wave';
        this.buttonWidth = 140;
        this.buttonHeight = 45;
        this.buttonPositionMode = 'topRight'; // 'topRight', 'custom'
        this.buttonX = 0.5; // 0-1, percentage of screen width (only used if positionMode is 'custom')
        this.buttonY = 0.85; // 0-1, percentage of screen height (only used if positionMode is 'custom')
        this.buttonFontSize = 16;
        this.buttonColor = '#4CAF50';
        this.buttonHoverColor = '#66BB6A';
        this.buttonPressedColor = '#388E3C';
        this.buttonTextColor = '#ffffff';
        this.buttonBorderRadius = 12;
        this.buttonShadow = true;
        
        // Internal state
        this._currentWave = 0;
        this._buttonHovered = false;
        this._buttonPressed = false;
        this._enemiesRemainingInWave = 0;
        this._spawnTimer = 0;
        this._waveStartTimer = 0;
        this._isSpawning = false;
        this._waveInProgress = false;
        this._gameManager = null;
        this._path = null;
        this._enemiesSpawnedThisWave = 0;
        this._totalEnemiesToSpawn = 0;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 80;
    
    static getIcon() {
        return '🌊';
    }
    
    static getDescription() {
        return 'Manages enemy wave spawning with progressive difficulty';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === WAVE SETTINGS ===
            _header_waves: { type: 'header', label: '🌊 Wave Settings' },
            totalWaves: { 
                type: 'number', 
                label: 'Total Waves', 
                default: 10, 
                min: 1, 
                max: 999,
                hint: 'Number of waves to complete for victory'
            },
            autoStartWaves: { 
                type: 'boolean', 
                label: 'Auto-Start Waves', 
                default: false,
                hint: 'Automatically start next wave when enemies cleared'
            },
            waveStartDelay: { 
                type: 'slider', 
                label: 'Wave Start Delay', 
                default: 3, 
                min: 0, 
                max: 15,
                hint: 'Seconds before enemies begin spawning'
            },
            enemySpawnInterval: { 
                type: 'number', 
                label: 'Spawn Interval', 
                default: 1, 
                min: 0.1, 
                max: 5, 
                step: 0.1,
                hint: 'Seconds between enemy spawns'
            },
            maxEnemiesAtOnce: {
                type: 'slider',
                label: 'Max Enemies at Once',
                default: 15,
                min: 1,
                max: 50,
                hint: 'Pause spawning when this many enemies are alive (performance limit)'
            },
            
            // === ENEMY COUNT ===
            _header_count: { type: 'header', label: '👾 Enemy Scaling' },
            baseEnemyCount: { 
                type: 'slider', 
                label: 'Base Enemy Count', 
                default: 5, 
                min: 1, 
                max: 30,
                hint: 'Enemies in wave 1'
            },
            enemiesPerWaveIncrease: { 
                type: 'slider', 
                label: 'Enemies Per Wave +', 
                default: 2, 
                min: 0, 
                max: 10,
                hint: 'Additional enemies each wave'
            },
            
            // === DIFFICULTY SCALING ===
            _header_difficulty: { type: 'header', label: '📈 Difficulty Scaling' },
            healthMultiplierPerWave: { 
                type: 'number', 
                label: 'Health Multiplier', 
                default: 1.1, 
                min: 1, 
                max: 2, 
                step: 0.05,
                hint: 'Enemy health increase per wave (1.1 = +10%)'
            },
            speedMultiplierPerWave: { 
                type: 'number', 
                label: 'Speed Multiplier', 
                default: 1.02, 
                min: 1, 
                max: 1.5, 
                step: 0.01,
                hint: 'Enemy speed increase per wave (1.02 = +2%)'
            },
            
            // === ENEMY PREFABS ===
            _header_enemies: { type: 'header', label: '👹 Enemy Types' },
            _hint_enemies: { 
                type: 'hint', 
                label: 'Enemies unlock progressively. First enemy spawns from wave 1, others unlock based on "Waves Per New Type".'
            },
            enemyPrefabs: {
                type: 'array',
                label: 'Enemy Prefabs',
                elementType: 'prefab',
                minItems: 1,
                hint: 'List of enemy prefabs (order = unlock order)'
            },
            wavesBetweenNewEnemy: { 
                type: 'slider', 
                label: 'Waves Per New Type', 
                default: 3, 
                min: 1, 
                max: 10,
                hint: 'Waves before unlocking next enemy type'
            },
            
            // === ENEMY MIX ===
            _header_mix: { type: 'header', label: '🎲 Enemy Mix' },
            newerEnemyBias: {
                type: 'slider',
                label: 'Newer Enemy Bias',
                default: 0.6,
                min: 0,
                max: 1,
                step: 0.1,
                hint: '0 = equal chance, 1 = heavily favor newer (harder) enemies'
            },
            mixIntensityPerWave: {
                type: 'slider',
                label: 'Mix Intensity Growth',
                default: 0.1,
                min: 0,
                max: 0.5,
                step: 0.05,
                hint: 'How much the enemy mix intensifies per wave'
            },
            
            // === SPAWN LOCATION ===
            _header_spawn: { type: 'header', label: '📍 Spawn Location' },
            usePathStart: { 
                type: 'boolean', 
                label: 'Spawn at Path Start', 
                default: true,
                hint: 'Spawn enemies at the beginning of the path'
            },
            spawnX: { 
                type: 'number', 
                label: 'Spawn X', 
                default: 0,
                hint: 'Custom spawn X (when not using path)'
            },
            spawnY: { 
                type: 'number', 
                label: 'Spawn Y', 
                default: 0,
                hint: 'Custom spawn Y (when not using path)'
            },
            
            // === VISUAL ===
            _header_visual: { type: 'header', label: '🖼️ Visual' },
            showWavePreview: { 
                type: 'boolean', 
                label: 'Show Wave Preview', 
                default: true,
                hint: 'Display countdown and spawn progress'
            },
            
            // === START BUTTON ===
            _header_button: { type: 'header', label: '🔘 Start Wave Button' },
            showStartButton: {
                type: 'boolean',
                label: 'Show Start Button',
                default: true,
                hint: 'Display a clickable button to start waves'
            },
            buttonText: {
                type: 'text',
                label: 'Button Text (First Wave)',
                default: 'Start Wave',
                showIf: { showStartButton: true }
            },
            buttonNextWaveText: {
                type: 'text',
                label: 'Button Text (Next Wave)',
                default: 'Next Wave',
                showIf: { showStartButton: true }
            },
            buttonPositionMode: {
                type: 'select',
                label: 'Button Position',
                default: 'topRight',
                options: ['topRight', 'custom'],
                hint: 'Where to place the start button',
                showIf: { showStartButton: true }
            },
            buttonWidth: {
                type: 'slider',
                label: 'Button Width',
                default: 140,
                min: 80,
                max: 300,
                showIf: { showStartButton: true }
            },
            buttonHeight: {
                type: 'slider',
                label: 'Button Height',
                default: 45,
                min: 30,
                max: 80,
                showIf: { showStartButton: true }
            },
            buttonX: {
                type: 'slider',
                label: 'Button X Position',
                default: 0.5,
                min: 0,
                max: 1,
                step: 0.05,
                hint: '0 = left, 0.5 = center, 1 = right',
                showIf: { buttonPositionMode: 'custom' }
            },
            buttonY: {
                type: 'slider',
                label: 'Button Y Position',
                default: 0.85,
                min: 0,
                max: 1,
                step: 0.05,
                hint: '0 = top, 1 = bottom',
                showIf: { buttonPositionMode: 'custom' }
            },
            buttonFontSize: {
                type: 'slider',
                label: 'Button Font Size',
                default: 20,
                min: 12,
                max: 32,
                showIf: { showStartButton: true }
            },
            buttonColor: {
                type: 'color',
                label: 'Button Color',
                default: '#4CAF50',
                showIf: { showStartButton: true }
            },
            buttonHoverColor: {
                type: 'color',
                label: 'Button Hover Color',
                default: '#66BB6A',
                showIf: { showStartButton: true }
            },
            buttonTextColor: {
                type: 'color',
                label: 'Button Text Color',
                default: '#ffffff',
                showIf: { showStartButton: true }
            },
            buttonBorderRadius: {
                type: 'slider',
                label: 'Button Border Radius',
                default: 12,
                min: 0,
                max: 25,
                showIf: { showStartButton: true }
            },
            buttonShadow: {
                type: 'boolean',
                label: 'Button Shadow',
                default: true,
                showIf: { showStartButton: true }
            }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._currentWave = 0;
        this._enemiesRemainingInWave = 0;
        this._spawnTimer = 0;
        this._waveStartTimer = 0;
        this._isSpawning = false;
        this._waveInProgress = false;
        this._enemiesSpawnedThisWave = 0;
        this._totalEnemiesToSpawn = 0;
        this._buttonHovered = false;
        this._buttonPressed = false;
        this._cachedButtonBounds = null; // Store button bounds from last drawGUI call
        
        // Find game manager
        this._gameManager = TDGameManager.findManager();
        if (this._gameManager) {
            this._gameManager.registerWaveManager(this);
        }
        
        // Find path
        this.findPath();
        
        //console.log('🌊 WaveManager initialized with', this.totalWaves, 'waves');
    }
    
    findPath() {
        if (this._gameManager) {
            this._path = this._gameManager.getFirstPath();
        }
        
        if (!this._path) {
            if (typeof findByModule === 'function') {
                const pathObjs = findByModule('TDPath');
                if (pathObjs.length > 0) {
                    this._path = pathObjs[0].getModule('TDPath');
                }
            }
        }
    }
    
    loop(deltaTime) {
        // Always handle button interactions (including during gameover/victory for restart)
        this.handleButtonInput();
        
        // Check if game is paused - but allow 'waiting' state for first wave start
        if (this._gameManager) {
            const state = this._gameManager.getState();
            if (state === 'paused' || state === 'gameover' || state === 'victory') return;
        }
        
        // Handle wave start delay
        if (this._waveInProgress && this._waveStartTimer > 0) {
            this._waveStartTimer -= deltaTime;
            if (this._waveStartTimer <= 0) {
                this._isSpawning = true;
            }
            return;
        }
        
        // Handle enemy spawning
        const currentEnemyCount = this._gameManager ? this._gameManager.getEnemiesAlive() : 0;
        if (this._isSpawning && this._enemiesSpawnedThisWave < this._totalEnemiesToSpawn && currentEnemyCount < this.maxEnemiesAtOnce) {
            this._spawnTimer -= deltaTime;
            
            if (this._spawnTimer <= 0) {
                this.spawnEnemy();
                this._spawnTimer = this.enemySpawnInterval;
            }
        }
        
        // Check for auto-start next wave
        if (this.autoStartWaves && !this._waveInProgress) {
            const enemiesAlive = this._gameManager ? this._gameManager.getEnemiesAlive() : 0;
            // For first wave, start immediately if no enemies
            // For subsequent waves, wait for all enemies to be cleared
            if (this._currentWave === 0 || (this._currentWave < this.totalWaves && enemiesAlive === 0)) {
                this.startNextWave();
            }
        }
    }
    
    // ==================== BUTTON HANDLING ====================
    
    /**
     * Check if game is in restart state (game over or victory)
     */
    isRestartState() {
        if (!this._gameManager) return false;
        const state = this._gameManager.getState();
        return state === 'gameover' || state === 'victory';
    }
    
    /**
     * Check if button should be visible
     */
    shouldShowButton() {
        if (!this.showStartButton) return false;
        
        // Show restart button during game over or victory
        if (this.isRestartState()) return true;
        
        // Show button when waiting for first wave
        if (this._currentWave === 0 && !this._waveInProgress) return true;
        
        // Show button between waves if autoStartWaves is disabled
        if (!this.autoStartWaves && !this._waveInProgress && this._currentWave < this.totalWaves) {
            // Check if all enemies are dead
            const enemiesAlive = this._gameManager ? this._gameManager.getEnemiesAlive() : 0;
            if (enemiesAlive === 0) return true;
        }
        
        return false;
    }
    
    /**
     * Get button bounds based on canvas size
     */
    getButtonBounds(canvas) {
        let btnX, btnY;
        
        // During restart state, center the button on screen
        if (this.isRestartState()) {
            btnX = canvas.width / 2 - this.buttonWidth / 2;
            btnY = canvas.height / 2 + 100; // Below the game over/victory text
        } else if (this.buttonPositionMode === 'topRight') {
            // Position to the right of the top GUI bar
            // Get padding from game manager if available, otherwise use default
            const padding = this._gameManager?.uiPadding ?? 15;
            btnX = canvas.width - padding - this.buttonWidth;
            btnY = padding;
        } else {
            // Custom position mode
            btnX = canvas.width * this.buttonX - this.buttonWidth / 2;
            btnY = canvas.height * this.buttonY - this.buttonHeight / 2;
        }
        
        return {
            x: btnX,
            y: btnY,
            width: this.buttonWidth,
            height: this.buttonHeight
        };
    }
    
    /**
     * Check if a point is inside the button
     */
    isPointInButton(px, py, bounds) {
        return px >= bounds.x && px <= bounds.x + bounds.width &&
               py >= bounds.y && py <= bounds.y + bounds.height;
    }
    
    /**
     * Handle mouse and touch input for button
     */
    handleButtonInput() {
        if (!this.shouldShowButton()) {
            this._buttonHovered = false;
            this._buttonPressed = false;
            return;
        }
        
        // Use cached bounds from the last drawGUI call for accurate hit detection
        const bounds = this._cachedButtonBounds;
        if (!bounds) {
            this._buttonHovered = false;
            return;
        }
        
        let wasClicked = false;
        
        // Handle mouse input
        if (typeof mousePositionScreen === 'function') {
            const mousePos = mousePositionScreen();
            this._buttonHovered = this.isPointInButton(mousePos.x, mousePos.y, bounds);
            
            // Check for mouse click
            if (this._buttonHovered && typeof guiMousePressed === 'function' && guiMousePressed(0)) {
                wasClicked = true;
            }
        }
        
        // Handle touch input
        if (typeof touchStarted === 'function' && touchStarted()) {
            const touches = typeof touchGetAll === 'function' ? touchGetAll() : [];
            for (const touch of touches) {
                if (this.isPointInButton(touch.x, touch.y, bounds)) {
                    wasClicked = true;
                    this._buttonPressed = true;
                    break;
                }
            }
        }
        
        // Reset pressed state when touch ends
        if (typeof touchEnded === 'function' && touchEnded()) {
            this._buttonPressed = false;
        }
        
        // Handle button click - either start wave or restart game
        if (wasClicked) {
            if (this.isRestartState()) {
                // Restart the game
                if (this._gameManager) {
                    this._gameManager.restartGame();
                }
            } else {
                // Start next wave
                this.startNextWave();
            }
        }
    }
    
    /**
     * Get the canvas element
     */
    getCanvas() {
        // Try to get canvas from various sources
        if (typeof getCanvasContext === 'function') {
            const ctx = getCanvasContext();
            if (ctx && ctx.canvas) return ctx.canvas;
        }
        // Fallback to document query
        return document.querySelector('canvas');
    }
    
    /**
     * Draw the start wave button
     */
    drawStartButton(ctx, canvas) {
        if (!this.shouldShowButton()) {
            this._cachedButtonBounds = null;
            return;
        }
        
        const bounds = this.getButtonBounds(canvas);
        // Cache the bounds for click detection in handleButtonInput
        this._cachedButtonBounds = bounds;
        const isRestart = this.isRestartState();
        
        ctx.save();
        
        // Define restart button colors (blue theme)
        const restartColor = '#2196F3';
        const restartHoverColor = '#42A5F5';
        const restartPressedColor = '#1976D2';
        
        // Determine button color based on state
        let bgColor;
        if (isRestart) {
            // Blue colors for restart button
            if (this._buttonPressed) {
                bgColor = restartPressedColor;
            } else if (this._buttonHovered) {
                bgColor = restartHoverColor;
            } else {
                bgColor = restartColor;
            }
        } else {
            // Normal colors for start/next wave button
            if (this._buttonPressed) {
                bgColor = this.buttonPressedColor;
            } else if (this._buttonHovered) {
                bgColor = this.buttonHoverColor;
            } else {
                bgColor = this.buttonColor;
            }
        }
        
        // Draw shadow
        if (this.buttonShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
        }
        
        // Draw button background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, this.buttonBorderRadius);
        ctx.fill();
        
        // Reset shadow for text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw border/highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Determine button text
        let displayText;
        if (isRestart) {
            displayText = '🔄 Restart';
        } else if (this._currentWave === 0) {
            displayText = this.buttonText;
        } else {
            displayText = `${this.buttonNextWaveText} ${this._currentWave + 1}`;
        }
        
        ctx.fillStyle = this.buttonTextColor;
        ctx.font = `bold ${this.buttonFontSize}px 'Segoe UI', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        
        // Draw subtle inner highlight
        const gradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, this.buttonBorderRadius);
        ctx.fill();
        
        ctx.restore();
    }
    
    // ==================== WAVE MANAGEMENT ====================
    
    /**
     * Message handler for wave start from TDGameManager
     */
    onWaveStart(data) {
        if (data && data.wave !== undefined) {
            this._currentWave = data.wave;
            this.beginWave(this._currentWave);
        }
    }
    
    /**
     * Start the next wave
     */
    startNextWave() {
        // Check if we've completed all waves
        if (this._currentWave >= this.totalWaves) {
            // All waves complete - victory!
            if (this._gameManager) {
                this._gameManager.victory();
            }
            return;
        }
        
        // Notify game manager - it will call beginWave() with the correct wave number
        if (this._gameManager) {
            this._gameManager.startNextWave();
        } else {
            // No game manager - handle locally
            this._currentWave++;
            this.beginWave(this._currentWave);
        }
    }
    
    /**
     * Begin spawning for a wave
     */
    beginWave(waveNumber) {
        this._currentWave = waveNumber; // Track current wave
        this._waveInProgress = true;
        this._waveStartTimer = this.waveStartDelay;
        this._isSpawning = false;
        this._spawnTimer = 0;
        this._enemiesSpawnedThisWave = 0;
        
        // Calculate enemies for this wave
        this._totalEnemiesToSpawn = this.getEnemyCountForWave(waveNumber);
        
        // Get available enemy types for this wave
        const availableTypes = this.getAvailableEnemyTypes(waveNumber);
        
        //console.log(`🌊 Wave ${waveNumber} starting in ${this.waveStartDelay}s`);
        //console.log(`   - Enemies to spawn: ${this._totalEnemiesToSpawn}`);
        //console.log(`   - Base count: ${this.baseEnemyCount}, +${this.enemiesPerWaveIncrease}/wave`);
        //console.log(`   - Available enemy types: ${availableTypes.join(', ')}`);
        //console.log(`   - Waves between new enemy: ${this.wavesBetweenNewEnemy}`);
    }
    
    /**
     * Get number of enemies for a specific wave
     */
    getEnemyCountForWave(wave) {
        return this.baseEnemyCount + (wave - 1) * this.enemiesPerWaveIncrease;
    }
    
    /**
     * Get available enemy types for a wave
     */
    getAvailableEnemyTypes(wave) {
        // Progressive enemy type unlock
        const maxTypes = Math.min(
            this.enemyPrefabs.length,
            Math.floor((wave - 1) / this.wavesBetweenNewEnemy) + 1
        );
        
        return this.enemyPrefabs.slice(0, maxTypes);
    }
    
    /**
     * Calculate spawn percentage for each enemy type at a given wave
     * Returns array of { prefab, percentage } objects
     */
    getEnemySpawnDistribution(wave) {
        const availableTypes = this.getAvailableEnemyTypes(wave);
        if (availableTypes.length === 0) return [];
        if (availableTypes.length === 1) return [{ prefab: availableTypes[0], percentage: 1.0 }];
        
        // Calculate wave intensity (0 at wave 1, increases each wave)
        const intensity = Math.min(1, (wave - 1) * this.mixIntensityPerWave);
        
        // Calculate weights - newer enemies get higher weights based on bias and intensity
        const weights = availableTypes.map((prefab, index) => {
            // Base weight (all start equal)
            let weight = 1;
            
            // Apply bias towards newer enemies
            // index 0 = oldest, higher index = newer
            const normalizedIndex = index / (availableTypes.length - 1); // 0 to 1
            
            // Newer enemies get exponentially higher weight based on bias
            weight = 1 + (normalizedIndex * this.newerEnemyBias * (1 + intensity));
            
            // Also boost based on how recently the enemy was unlocked
            const unlockWave = index * this.wavesBetweenNewEnemy + 1;
            const wavesSinceUnlock = wave - unlockWave;
            if (wavesSinceUnlock < this.wavesBetweenNewEnemy && index > 0) {
                // Recently unlocked enemies get a spawn boost
                weight *= 1.5;
            }
            
            return { prefab, weight };
        });
        
        // Normalize to percentages
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        return weights.map(w => ({
            prefab: w.prefab,
            percentage: w.weight / totalWeight
        }));
    }
    
    /**
     * Select which enemy type to spawn based on distribution
     */
    selectEnemyType(wave) {
        const distribution = this.getEnemySpawnDistribution(wave);
        
        if (distribution.length === 0) {
            return this.enemyPrefabs[0] || 'BasicEnemy';
        }
        
        // Weighted random selection
        const random = Math.random();
        let cumulative = 0;
        
        for (const entry of distribution) {
            cumulative += entry.percentage;
            if (random <= cumulative) {
                return entry.prefab;
            }
        }
        
        // Fallback to last entry
        return distribution[distribution.length - 1].prefab;
    }
    
    // ==================== ENEMY SPAWNING ====================
    
    spawnEnemy() {
        // Get spawn position
        let spawnX = this.spawnX;
        let spawnY = this.spawnY;
        
        if (this.usePathStart && this._path) {
            const startPos = this._path.getStartPoint();
            spawnX = startPos.x;
            spawnY = startPos.y;
        }
        
        // Select enemy type
        const enemyType = this.selectEnemyType(this._currentWave);
        
        // Calculate modifiers for this wave
        const healthMod = Math.pow(this.healthMultiplierPerWave, this._currentWave - 1);
        const speedMod = Math.pow(this.speedMultiplierPerWave, this._currentWave - 1);
        
        // Create enemy instance
        let enemy = null;
        
        if (typeof instanceCreate === 'function') {
            enemy = instanceCreate(enemyType, spawnX, spawnY);
        }
        
        // Apply wave modifiers to enemy
        if (enemy) {
            const enemyModule = enemy.getModule ? enemy.getModule('TDEnemy') : null;
            if (enemyModule) {
                enemyModule.maxHealth = Math.round(enemyModule.maxHealth * healthMod);
                enemyModule._health = enemyModule.maxHealth;
                enemyModule.speed = Math.round(enemyModule.speed * speedMod);
            }
        }
        
        this._enemiesSpawnedThisWave++;
        
        // Notify game manager
        if (this._gameManager) {
            this._gameManager.onEnemySpawned({ type: enemyType, wave: this._currentWave });
        }
        
        // Check if wave spawning complete
        if (this._enemiesSpawnedThisWave >= this._totalEnemiesToSpawn) {
            this._isSpawning = false;
            //console.log(`🌊 Wave ${this._currentWave} - All enemies spawned`);
        }
    }
    
    // ==================== WAVE COMPLETE HANDLER ====================
    
    onWaveComplete(data) {
        this._waveInProgress = false;
        this._isSpawning = false;
        
        // Check for victory
        if (this._currentWave >= this.totalWaves) {
            if (this._gameManager) {
                this._gameManager.victory();
            }
        }
    }
    
    // ==================== UTILITY ====================
    
    getCurrentWave() { return this._currentWave; }
    getTotalWaves() { return this.totalWaves; }
    isWaveInProgress() { return this._waveInProgress; }
    isSpawningComplete() { 
        // Spawning is complete when we've spawned all enemies for this wave
        return this._enemiesSpawnedThisWave >= this._totalEnemiesToSpawn; 
    }
    getSpawnProgress() {
        if (this._totalEnemiesToSpawn === 0) return 1;
        return this._enemiesSpawnedThisWave / this._totalEnemiesToSpawn;
    }
    
    // ==================== GUI ====================
    
    drawGUI(ctx) {
        const canvas = ctx.canvas;
        
        // Draw start wave button
        this.drawStartButton(ctx, canvas);
        
        if (!this.showWavePreview) return;
        
        // Show wave start countdown
        if (this._waveInProgress && this._waveStartTimer > 0) {
            ctx.save();
            
            const countdown = Math.ceil(this._waveStartTimer);
            
            // Background circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
            ctx.fill();
            
            // Progress ring
            const progress = 1 - (this._waveStartTimer / this.waveStartDelay);
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 70, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.stroke();
            
            // Wave number
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`WAVE ${this._currentWave}`, canvas.width / 2, canvas.height / 2 - 20);
            
            // Countdown number
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 48px "Segoe UI", Arial';
            ctx.fillText(countdown, canvas.width / 2, canvas.height / 2 + 15);
            
            ctx.restore();
        }
        
        // Show spawn progress bar during wave
        if (this._isSpawning && this._totalEnemiesToSpawn > 0) {
            const barWidth = 220;
            const barHeight = 8;
            const barX = canvas.width / 2 - barWidth / 2;
            const barY = 75;
            const progress = this._enemiesSpawnedThisWave / this._totalEnemiesToSpawn;
            
            ctx.save();
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(barX - 5, barY - 5, barWidth + 10, barHeight + 25, 8);
            ctx.fill();
            
            // Bar background
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 4);
            ctx.fill();
            
            // Progress gradient
            const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
            progressGradient.addColorStop(0, '#ff6600');
            progressGradient.addColorStop(1, '#ffaa00');
            ctx.fillStyle = progressGradient;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
            ctx.fill();
            
            // Glow effect
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Spawning ${this._enemiesSpawnedThisWave}/${this._totalEnemiesToSpawn}`, canvas.width / 2, barY + barHeight + 15);
            
            ctx.restore();
        }
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDWaveManager';
        json.totalWaves = this.totalWaves;
        json.autoStartWaves = this.autoStartWaves;
        json.waveStartDelay = this.waveStartDelay;
        json.enemySpawnInterval = this.enemySpawnInterval;
        json.baseEnemyCount = this.baseEnemyCount;
        json.enemiesPerWaveIncrease = this.enemiesPerWaveIncrease;
        json.healthMultiplierPerWave = this.healthMultiplierPerWave;
        json.speedMultiplierPerWave = this.speedMultiplierPerWave;
        json.enemyPrefabs = [...this.enemyPrefabs];
        json.wavesBetweenNewEnemy = this.wavesBetweenNewEnemy;
        json.newerEnemyBias = this.newerEnemyBias;
        json.mixIntensityPerWave = this.mixIntensityPerWave;
        json.usePathStart = this.usePathStart;
        json.spawnX = this.spawnX;
        json.spawnY = this.spawnY;
        json.showWavePreview = this.showWavePreview;
        // Button settings
        json.showStartButton = this.showStartButton;
        json.buttonText = this.buttonText;
        json.buttonNextWaveText = this.buttonNextWaveText;
        json.buttonPositionMode = this.buttonPositionMode;
        json.buttonWidth = this.buttonWidth;
        json.buttonHeight = this.buttonHeight;
        json.buttonX = this.buttonX;
        json.buttonY = this.buttonY;
        json.buttonFontSize = this.buttonFontSize;
        json.buttonColor = this.buttonColor;
        json.buttonHoverColor = this.buttonHoverColor;
        json.buttonPressedColor = this.buttonPressedColor;
        json.buttonTextColor = this.buttonTextColor;
        json.buttonBorderRadius = this.buttonBorderRadius;
        json.buttonShadow = this.buttonShadow;
        json.maxEnemiesAtOnce = this.maxEnemiesAtOnce;
        return json;
    }
    
    static fromJSON(json) {
        const module = new TDWaveManager();
        module.totalWaves = json.totalWaves ?? 10;
        module.autoStartWaves = json.autoStartWaves ?? false;
        module.waveStartDelay = json.waveStartDelay ?? 3;
        module.enemySpawnInterval = json.enemySpawnInterval ?? 1;
        module.baseEnemyCount = json.baseEnemyCount ?? 5;
        module.enemiesPerWaveIncrease = json.enemiesPerWaveIncrease ?? 2;
        module.healthMultiplierPerWave = json.healthMultiplierPerWave ?? 1.1;
        module.speedMultiplierPerWave = json.speedMultiplierPerWave ?? 1.02;
        module.enemyPrefabs = json.enemyPrefabs ? [...json.enemyPrefabs] : ['BasicEnemy'];
        module.wavesBetweenNewEnemy = json.wavesBetweenNewEnemy ?? 3;
        module.newerEnemyBias = json.newerEnemyBias ?? 0.6;
        module.mixIntensityPerWave = json.mixIntensityPerWave ?? 0.1;
        module.usePathStart = json.usePathStart ?? true;
        module.spawnX = json.spawnX ?? 0;
        module.spawnY = json.spawnY ?? 0;
        module.showWavePreview = json.showWavePreview ?? true;
        // Button settings
        module.showStartButton = json.showStartButton ?? true;
        module.buttonText = json.buttonText ?? 'Start Wave';
        module.buttonNextWaveText = json.buttonNextWaveText ?? 'Next Wave';
        module.buttonPositionMode = json.buttonPositionMode ?? 'topRight';
        module.buttonWidth = json.buttonWidth ?? 140;
        module.buttonHeight = json.buttonHeight ?? 45;
        module.buttonX = json.buttonX ?? 0.5;
        module.buttonY = json.buttonY ?? 0.85;
        module.buttonFontSize = json.buttonFontSize ?? 20;
        module.buttonColor = json.buttonColor ?? '#4CAF50';
        module.buttonHoverColor = json.buttonHoverColor ?? '#66BB6A';
        module.buttonPressedColor = json.buttonPressedColor ?? '#388E3C';
        module.buttonTextColor = json.buttonTextColor ?? '#ffffff';
        module.buttonBorderRadius = json.buttonBorderRadius ?? 12;
        module.buttonShadow = json.buttonShadow ?? true;
        module.maxEnemiesAtOnce = json.maxEnemiesAtOnce ?? 15;
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new TDWaveManager();
        cloned.totalWaves = this.totalWaves;
        cloned.autoStartWaves = this.autoStartWaves;
        cloned.waveStartDelay = this.waveStartDelay;
        cloned.enemySpawnInterval = this.enemySpawnInterval;
        cloned.baseEnemyCount = this.baseEnemyCount;
        cloned.enemiesPerWaveIncrease = this.enemiesPerWaveIncrease;
        cloned.healthMultiplierPerWave = this.healthMultiplierPerWave;
        cloned.speedMultiplierPerWave = this.speedMultiplierPerWave;
        cloned.enemyPrefabs = [...this.enemyPrefabs];
        cloned.wavesBetweenNewEnemy = this.wavesBetweenNewEnemy;
        cloned.newerEnemyBias = this.newerEnemyBias;
        cloned.mixIntensityPerWave = this.mixIntensityPerWave;
        cloned.usePathStart = this.usePathStart;
        cloned.spawnX = this.spawnX;
        cloned.spawnY = this.spawnY;
        cloned.showWavePreview = this.showWavePreview;
        // Button settings
        cloned.showStartButton = this.showStartButton;
        cloned.buttonText = this.buttonText;
        cloned.buttonNextWaveText = this.buttonNextWaveText;
        cloned.buttonPositionMode = this.buttonPositionMode;
        cloned.buttonWidth = this.buttonWidth;
        cloned.buttonHeight = this.buttonHeight;
        cloned.buttonX = this.buttonX;
        cloned.buttonY = this.buttonY;
        cloned.buttonFontSize = this.buttonFontSize;
        cloned.buttonColor = this.buttonColor;
        cloned.buttonHoverColor = this.buttonHoverColor;
        cloned.buttonPressedColor = this.buttonPressedColor;
        cloned.buttonTextColor = this.buttonTextColor;
        cloned.buttonBorderRadius = this.buttonBorderRadius;
        cloned.buttonShadow = this.buttonShadow;
        cloned.enabled = this.enabled;
        cloned.maxEnemiesAtOnce = this.maxEnemiesAtOnce;
        return cloned;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDWaveManager = TDWaveManager;
}

if (typeof Module !== 'undefined') {
    Module.register('TDWaveManager', TDWaveManager);
}
