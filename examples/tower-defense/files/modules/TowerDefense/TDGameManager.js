/**
 * TDGameManager Module
 * Tower Defense game state manager - Central controller for all TD modules
 * Namespace: TowerDefense
 * 
 * Manages:
 * - Game state (playing, paused, gameover, victory)
 * - Player resources (lives, money)
 * - Wave tracking
 * - Fully customizable GUI/HUD
 * - Global game events and communication between TD modules
 */

class TDGameManager extends Module {
    constructor() {
        super();
        
        // Game Settings
        this.startingLives = 20;
        this.startingMoney = 400;
        this.moneyPerKill = 10;
        this.moneyPerWave = 50;
        
        // UI Visibility
        this.showUI = true;
        this.showLives = true;
        this.showMoney = true;
        this.showWave = true;
        this.showEnemies = true;
        this.showKills = true;
        this.showGameMessages = true;
        
        // UI Layout
        this.uiStyle = 'modern'; // 'modern', 'classic', 'minimal', 'fantasy', 'custom'
        this.uiPosition = 'top'; // 'top', 'bottom'
        this.uiAlignment = 'spread'; // 'spread', 'left', 'center', 'right'
        this.uiFontSize = 18;
        this.uiPadding = 32;
        this.uiBorderRadius = 10;
        
        // UI Colors
        this.uiBackgroundColor = 'rgba(20, 25, 35, 0.9)';
        this.uiTextColor = '#ffffff';
        this.uiAccentColor = '#ffcc00';
        this.uiDangerColor = '#ff4444';
        this.uiSuccessColor = '#44ff44';
        this.uiBorderColor = 'rgba(100, 150, 255, 0.3)';
        
        // Custom Icons (emoji or text)
        this.livesIcon = '❤️';
        this.moneyIcon = '💰';
        this.waveIcon = '🌊';
        this.enemiesIcon = '👾';
        this.killsIcon = '💠';
        
        // Custom Labels
        this.livesLabel = '';
        this.moneyLabel = '$';
        this.waveLabel = 'Wave ';
        this.enemiesLabel = '';
        this.killsLabel = '';
        
        // Overlay/Message Settings
        this.overlayBackgroundOpacity = 0.8;
        this.gameOverTitle = 'GAME OVER';
        this.victoryTitle = 'VICTORY!';
        this.pausedTitle = 'PAUSED';
        this.startMessage = ''; // Hidden by default - use Start Wave button instead
        this.nextWaveMessage = ''; // Hidden by default - use Next Wave button instead
        this.restartHint = 'Tap to restart';
        
        // Game Over Animation Settings
        this.gameOverPulseSpeed = 1.5; // How fast the title pulses (cycles per second)
        this.gameOverPulseAmount = 0.15; // How much the title scales (0.15 = 15% bigger/smaller)
        this.gameOverBobSpeed = 2.25; // Y-axis bob speed (pulseSpeed * 1.5)
        this.gameOverBobAmount = 10; // How many pixels up/down
        this.subtitlePulseSpeed = 2.0; // Subtitle pulse speed
        this.subtitlePulseAmount = 0.08; // Subtitle scale amount
        this.subtitleRotateSpeed = 1.2; // Subtitle rotation speed
        this.subtitleRotateAmount = 3; // Max rotation in degrees
        
        // Internal state
        this._lives = 20;
        this._money = 100;
        this._wave = 0;
        this._enemiesAlive = 0;
        this._totalEnemiesKilled = 0;
        this._gameState = 'waiting'; // 'waiting', 'playing', 'paused', 'gameover', 'victory'
        this._waveInProgress = false;
        this._registeredModules = {
            paths: [],
            turrets: [],
            enemies: [],
            waveManagers: [],
            bases: []
        };
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'TowerDefense';
    static priority = 100; // Run first
    
    static getIcon() {
        return '🏰';
    }
    
    static getDescription() {
        return 'Central game manager for Tower Defense - handles lives, money, waves, and game state';
    }
    
    // ==================== EDITABLE PROPERTIES ====================
    static getEditableProperties() {
        return {
            // === GAME SETTINGS ===
            _header_game: { type: 'header', label: '🎮 Game Settings' },
            startingLives: { 
                type: 'slider', 
                label: 'Starting Lives', 
                default: 20, 
                min: 1, 
                max: 100,
                hint: 'Lives at game start'
            },
            startingMoney: { 
                type: 'number', 
                label: 'Starting Money', 
                default: 400, 
                min: 0, 
                max: 10000,
                hint: 'Initial funds for placing turrets'
            },
            
            // === ECONOMY ===
            _header_economy: { type: 'header', label: '💰 Economy' },
            moneyPerKill: { 
                type: 'number', 
                label: 'Kill Reward', 
                default: 10, 
                min: 0, 
                max: 500,
                hint: 'Base money per enemy killed'
            },
            moneyPerWave: { 
                type: 'number', 
                label: 'Wave Bonus', 
                default: 50, 
                min: 0, 
                max: 1000,
                hint: 'Bonus money for completing a wave'
            },
            
            // === UI VISIBILITY ===
            _header_visibility: { type: 'header', label: '👁️ UI Visibility' },
            showUI: { 
                type: 'boolean', 
                label: 'Show HUD', 
                default: true,
                hint: 'Master toggle for game UI'
            },
            showLives: { 
                type: 'boolean', 
                label: 'Show Lives', 
                default: true,
                showIf: { showUI: true }
            },
            showMoney: { 
                type: 'boolean', 
                label: 'Show Money', 
                default: true,
                showIf: { showUI: true }
            },
            showWave: { 
                type: 'boolean', 
                label: 'Show Wave', 
                default: true,
                showIf: { showUI: true }
            },
            showEnemies: { 
                type: 'boolean', 
                label: 'Show Enemies Alive', 
                default: true,
                showIf: { showUI: true }
            },
            showKills: { 
                type: 'boolean', 
                label: 'Show Total Kills', 
                default: true,
                showIf: { showUI: true }
            },
            showGameMessages: { 
                type: 'boolean', 
                label: 'Show Game Messages', 
                default: true,
                hint: 'Start/pause/victory messages'
            },
            
            // === UI LAYOUT ===
            _header_layout: { type: 'header', label: '📐 UI Layout' },
            uiStyle: {
                type: 'select',
                label: 'UI Style',
                default: 'modern',
                options: ['modern', 'classic', 'minimal', 'fantasy', 'custom'],
                hint: 'Visual style of the game UI'
            },
            uiPosition: {
                type: 'select',
                label: 'UI Position',
                default: 'top',
                options: ['top', 'bottom'],
                hint: 'Where to display the HUD'
            },
            uiAlignment: {
                type: 'select',
                label: 'UI Alignment',
                default: 'spread',
                options: ['spread', 'left', 'center', 'right'],
                hint: 'How to align HUD elements'
            },
            uiFontSize: { 
                type: 'slider', 
                label: 'Font Size', 
                default: 18, 
                min: 12, 
                max: 32,
                hint: 'UI text size'
            },
            uiPadding: { 
                type: 'slider', 
                label: 'UI Padding', 
                default: 15, 
                min: 5, 
                max: 40 
            },
            uiBorderRadius: { 
                type: 'slider', 
                label: 'Border Radius', 
                default: 10, 
                min: 0, 
                max: 30 
            },
            
            // === UI COLORS ===
            _header_colors: { type: 'header', label: '🎨 UI Colors' },
            uiBackgroundColor: { 
                type: 'color', 
                label: 'Background', 
                default: 'rgba(20,25,35,0.9)' 
            },
            uiTextColor: { 
                type: 'color', 
                label: 'Text Color', 
                default: '#ffffff' 
            },
            uiAccentColor: { 
                type: 'color', 
                label: 'Accent Color', 
                default: '#ffcc00',
                hint: 'Used for highlights and money'
            },
            uiDangerColor: {
                type: 'color',
                label: 'Danger Color',
                default: '#ff4444',
                hint: 'Used for lives and warnings'
            },
            uiSuccessColor: {
                type: 'color',
                label: 'Success Color',
                default: '#44ff44',
                hint: 'Used for kills and positive feedback'
            },
            uiBorderColor: {
                type: 'color',
                label: 'Border Color',
                default: 'rgba(100, 150, 255, 0.3)'
            },
            
            // === CUSTOM ICONS ===
            _header_icons: { type: 'header', label: '🔣 Custom Icons' },
            livesIcon: { 
                type: 'text', 
                label: 'Lives Icon', 
                default: '❤️'
            },
            moneyIcon: { 
                type: 'text', 
                label: 'Money Icon', 
                default: '💰'
            },
            waveIcon: { 
                type: 'text', 
                label: 'Wave Icon', 
                default: '🌊'
            },
            enemiesIcon: { 
                type: 'text', 
                label: 'Enemies Icon', 
                default: '👾'
            },
            killsIcon: { 
                type: 'text', 
                label: 'Kills Icon', 
                default: '💠'
            },
            
            // === CUSTOM LABELS ===
            _header_labels: { type: 'header', label: '🏷️ Custom Labels' },
            livesLabel: { 
                type: 'text', 
                label: 'Lives Label', 
                default: '',
                hint: 'Text after icon (leave empty for just number)'
            },
            moneyLabel: { 
                type: 'text', 
                label: 'Money Prefix', 
                default: '$'
            },
            waveLabel: { 
                type: 'text', 
                label: 'Wave Label', 
                default: 'Wave '
            },
            enemiesLabel: { 
                type: 'text', 
                label: 'Enemies Label', 
                default: ''
            },
            killsLabel: { 
                type: 'text', 
                label: 'Kills Label', 
                default: ''
            },
            
            // === GAME MESSAGES ===
            _header_messages: { type: 'header', label: '💬 Game Messages' },
            startMessage: { 
                type: 'text', 
                label: 'Start Message', 
                default: 'Press SPACE to start Wave 1'
            },
            nextWaveMessage: { 
                type: 'text', 
                label: 'Next Wave Message', 
                default: 'Press SPACE for next wave'
            },
            gameOverTitle: { 
                type: 'text', 
                label: 'Game Over Title', 
                default: 'GAME OVER'
            },
            victoryTitle: { 
                type: 'text', 
                label: 'Victory Title', 
                default: 'VICTORY!'
            },
            pausedTitle: { 
                type: 'text', 
                label: 'Paused Title', 
                default: 'PAUSED'
            },
            restartHint: { 
                type: 'text', 
                label: 'Restart Hint', 
                default: 'Press R to restart'
            },
            overlayBackgroundOpacity: {
                type: 'slider',
                label: 'Overlay Opacity',
                default: 0.8,
                min: 0,
                max: 1,
                step: 0.1
            }
        };
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this._lives = this.startingLives;
        this._money = this.startingMoney;
        this._wave = 0;
        this._enemiesAlive = 0;
        this._totalEnemiesKilled = 0;
        this._gameState = 'waiting';
        this._waveInProgress = false;
        
        // Clear registered modules
        this._registeredModules = {
            paths: [],
            turrets: [],
            enemies: [],
            waveManagers: [],
            bases: []
        };
        
        //console.log('🏰 TDGameManager initialized - Tower Defense Ready!');
    }
    
    loop(deltaTime) {
        // Check for touch input
        const touchTapped = typeof touchStarted === 'function' && touchStarted();
        
        // Check for game restart (keyboard or touch anywhere during game over/victory)
        if (this._gameState === 'gameover' || this._gameState === 'victory') {
            if (keyPressed('KeyR') || touchTapped) {
                this.restartGame();
            }
        }
        
        // Check for start wave (Space to start next wave when not in progress)
        // Note: Touch handled by TDWaveManager button, keyboard here
        if (this._gameState === 'waiting' || (this._gameState === 'playing' && !this._waveInProgress)) {
            if (keyPressed('Space')) {
                this.startNextWave();
            }
        }
        
        // Pause toggle (keyboard only, or could add UI button later)
        if (keyPressed('KeyP') && (this._gameState === 'playing' || this._gameState === 'paused')) {
            this.togglePause();
        }
        
        // Unpause with touch during pause state
        if (this._gameState === 'paused' && touchTapped) {
            this.togglePause();
        }
    }
    
    drawGUI(ctx) {
        if (!this.showUI) return;
        
        const canvas = ctx.canvas;
        const padding = this.uiPadding;
        const fontSize = this.uiFontSize;
        
        ctx.save();
        
        // Draw based on style
        switch (this.uiStyle) {
            case 'minimal':
                this.drawMinimalUI(ctx, canvas, padding, fontSize);
                break;
            case 'classic':
                this.drawClassicUI(ctx, canvas, padding, fontSize);
                break;
            case 'fantasy':
                this.drawFantasyUI(ctx, canvas, padding, fontSize);
                break;
            case 'custom':
                this.drawCustomUI(ctx, canvas, padding, fontSize);
                break;
            case 'modern':
            default:
                this.drawModernUI(ctx, canvas, padding, fontSize);
        }
        
        // Game state messages (shared)
        if (this.showGameMessages) {
            this.drawGameStateMessages(ctx, canvas);
        }
        
        ctx.restore();
    }
    
    drawModernUI(ctx, canvas, padding, fontSize) {
        // Modern sleek UI with rounded panels
        const panelHeight = fontSize * 2.5;
        const yPos = this.uiPosition === 'bottom' ? canvas.height - panelHeight - padding : padding;
        
        // Reserve space for start wave button on the right (button width + gap)
        const buttonReservedWidth = 160;
        const barWidth = canvas.width - padding * 2 - buttonReservedWidth;
        
        // Top bar background with gradient
        const bgGradient = ctx.createLinearGradient(0, yPos, 0, yPos + panelHeight);
        bgGradient.addColorStop(0, 'rgba(30, 35, 50, 0.95)');
        bgGradient.addColorStop(1, 'rgba(20, 25, 35, 0.9)');
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.roundRect(padding, yPos, barWidth, panelHeight, this.uiBorderRadius);
        ctx.fill();
        
        // Border glow
        ctx.strokeStyle = this.uiBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        const centerY = yPos + panelHeight / 2;
        ctx.textBaseline = 'middle';
        
        // Calculate available width for stats
        const barEndX = padding + barWidth;
        const statSpacing = 110; // Reduced spacing to fit
        
        // Build stat panels based on visibility - left side
        let xOffset = padding + 15;
        
        if (this.showLives) {
            this.drawStatPanel(ctx, xOffset, centerY, this.livesIcon, this._lives + this.livesLabel, this.uiDangerColor, fontSize);
            xOffset += statSpacing;
        }
        
        if (this.showMoney) {
            this.drawStatPanel(ctx, xOffset, centerY, this.moneyIcon, this.moneyLabel + this._money, this.uiAccentColor, fontSize);
            xOffset += statSpacing;
        }
        
        // Wave (center of the bar, not canvas)
        if (this.showWave) {
            const barCenterX = padding + barWidth / 2;
            ctx.fillStyle = this.uiTextColor;
            ctx.font = `bold ${fontSize}px 'Segoe UI', Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${this.waveLabel}${this._wave}`, barCenterX, centerY);
        }
        
        // Right side stats (position relative to bar end, not canvas)
        let rightOffset = barEndX - 15;
        
        if (this.showKills) {
            this.drawStatPanel(ctx, rightOffset - 60, centerY, this.killsIcon, this._totalEnemiesKilled + this.killsLabel, this.uiSuccessColor, fontSize, 'left');
            rightOffset -= statSpacing;
        }
        
        if (this.showEnemies) {
            this.drawStatPanel(ctx, rightOffset - 60, centerY, this.enemiesIcon, this._enemiesAlive + this.enemiesLabel, '#ff9999', fontSize, 'left');
        }
    }
    
    drawCustomUI(ctx, canvas, padding, fontSize) {
        // Fully custom UI using all customization options
        const panelHeight = fontSize * 2.5;
        const yPos = this.uiPosition === 'bottom' ? canvas.height - panelHeight - padding : padding;
        
        // Custom background
        ctx.fillStyle = this.uiBackgroundColor;
        ctx.beginPath();
        ctx.roundRect(padding, yPos, canvas.width - padding * 2, panelHeight, this.uiBorderRadius);
        ctx.fill();
        
        // Custom border
        ctx.strokeStyle = this.uiBorderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const centerY = yPos + panelHeight / 2;
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px 'Segoe UI', Arial`;
        
        // Calculate positions based on alignment
        const stats = [];
        if (this.showLives) stats.push({ icon: this.livesIcon, value: this._lives + this.livesLabel, color: this.uiDangerColor });
        if (this.showMoney) stats.push({ icon: this.moneyIcon, value: this.moneyLabel + this._money, color: this.uiAccentColor });
        if (this.showWave) stats.push({ icon: this.waveIcon, value: this.waveLabel + this._wave, color: this.uiTextColor });
        if (this.showEnemies) stats.push({ icon: this.enemiesIcon, value: this._enemiesAlive + this.enemiesLabel, color: '#ff9999' });
        if (this.showKills) stats.push({ icon: this.killsIcon, value: this._totalEnemiesKilled + this.killsLabel, color: this.uiSuccessColor });
        
        const totalWidth = canvas.width - padding * 4;
        const itemWidth = stats.length > 0 ? totalWidth / stats.length : 0;
        
        stats.forEach((stat, i) => {
            let xPos;
            switch (this.uiAlignment) {
                case 'left':
                    xPos = padding * 2 + i * 120;
                    break;
                case 'center':
                    xPos = canvas.width / 2 - (stats.length * 60) + i * 120;
                    break;
                case 'right':
                    xPos = canvas.width - padding * 2 - (stats.length - i) * 120;
                    break;
                case 'spread':
                default:
                    xPos = padding * 2 + i * itemWidth + itemWidth / 2 - 40;
            }
            
            this.drawStatPanel(ctx, xPos, centerY, stat.icon, stat.value, stat.color, fontSize, 'left');
        });
    }
    
    drawStatPanel(ctx, x, y, icon, value, color, fontSize, align = 'left') {
        ctx.font = `${fontSize}px 'Segoe UI', Arial`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        
        // Icon
        ctx.fillText(icon, x, y);
        
        // Value with color
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px 'Segoe UI', Arial`;
        ctx.fillText(String(value), x + fontSize + 5, y);
    }
    
    drawMinimalUI(ctx, canvas, padding, fontSize) {
        ctx.font = `${fontSize}px 'Segoe UI', Arial`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        
        // Simple text with shadows
        const drawShadowText = (text, x, y, color) => {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(text, x + 1, y + 1);
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        };
        
        drawShadowText(`❤️ ${this._lives}`, padding, padding, this.uiDangerColor);
        drawShadowText(`💰 $${this._money}`, padding + 100, padding, this.uiAccentColor);
        drawShadowText(`Wave ${this._wave}`, canvas.width / 2 - 40, padding, this.uiTextColor);
        drawShadowText(`👾 ${this._enemiesAlive}`, canvas.width - padding - 80, padding, '#ff9999');
    }
    
    drawClassicUI(ctx, canvas, padding, fontSize) {
        // Classic arcade-style UI
        const barHeight = fontSize + padding;
        
        ctx.fillStyle = this.uiBackgroundColor;
        ctx.fillRect(0, 0, canvas.width, barHeight);
        
        ctx.strokeStyle = this.uiAccentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, barHeight);
        ctx.lineTo(canvas.width, barHeight);
        ctx.stroke();
        
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.textBaseline = 'middle';
        const y = barHeight / 2;
        
        ctx.fillStyle = this.uiDangerColor;
        ctx.textAlign = 'left';
        ctx.fillText(`LIVES: ${this._lives}`, padding, y);
        
        ctx.fillStyle = this.uiAccentColor;
        ctx.fillText(`GOLD: ${this._money}`, padding + 150, y);
        
        ctx.fillStyle = this.uiTextColor;
        ctx.textAlign = 'center';
        ctx.fillText(`WAVE ${this._wave}`, canvas.width / 2, y);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = '#99ff99';
        ctx.fillText(`KILLS: ${this._totalEnemiesKilled}`, canvas.width - padding, y);
    }
    
    drawFantasyUI(ctx, canvas, padding, fontSize) {
        // Fantasy RPG style UI
        const panelHeight = fontSize * 3;
        
        // Ornate frame
        ctx.fillStyle = 'rgba(60, 40, 20, 0.9)';
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(padding, padding, canvas.width - padding * 2, panelHeight, 5);
        ctx.fill();
        ctx.stroke();
        
        // Inner border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(padding + 4, padding + 4, canvas.width - padding * 2 - 8, panelHeight - 8, 3);
        ctx.stroke();
        
        const y = padding + panelHeight / 2;
        ctx.font = `${fontSize}px 'Times New Roman', serif`;
        ctx.textBaseline = 'middle';
        
        // Lives with heart icon
        ctx.fillStyle = '#ff6666';
        ctx.textAlign = 'left';
        ctx.fillText(`❤ ${this._lives} Lives`, padding + 20, y);
        
        // Gold
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`⭐ ${this._money} Gold`, padding + 160, y);
        
        // Wave
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'center';
        ctx.font = `bold ${fontSize + 2}px 'Times New Roman', serif`;
        ctx.fillText(`~ Wave ${this._wave} ~`, canvas.width / 2, y);
        
        // Enemies
        ctx.font = `${fontSize}px 'Times New Roman', serif`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#98fb98';
        ctx.fillText(`Slain: ${this._totalEnemiesKilled}`, canvas.width - padding - 20, y);
    }
    
    drawGameStateMessages(ctx, canvas) {
        const fontSize = this.uiFontSize;
        
        if (this._gameState === 'waiting' && this.startMessage) {
            // Replace {wave} placeholder in start message
            const msg = this.startMessage.replace('{wave}', this._wave);
            this.drawCenterMessage(ctx, msg, this.uiAccentColor);
        } else if (this._gameState === 'playing' && !this._waveInProgress && this.nextWaveMessage) {
            // Replace {wave} placeholder in next wave message
            const msg = this.nextWaveMessage.replace('{wave}', this._wave);
            this.drawCenterMessage(ctx, msg, '#00ff00');
        } else if (this._gameState === 'paused') {
            this.drawOverlay(ctx, this.pausedTitle, this.pausedTitleColor, this.resumeHint, false);
        } else if (this._gameState === 'gameover') {
            // Replace {wave} in game over subtitle - no restart hint, button handles it
            const subtitle = this.gameOverSubtitle.replace('{wave}', this._wave);
            this.drawOverlay(ctx, this.gameOverTitle, this.gameOverTitleColor, subtitle, true);
        } else if (this._gameState === 'victory') {
            this.drawOverlay(ctx, this.victoryTitle, this.victoryTitleColor, this.victorySubtitle, true);
        }
    }
    
    drawCenterMessage(ctx, text, color) {
        const canvas = ctx.canvas;
        ctx.fillStyle = color;
        ctx.font = `bold ${this.uiFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height - this.uiFontSize * 2);
    }
    
    drawOverlay(ctx, title, titleColor, subtitle, animate = false) {
        const canvas = ctx.canvas;
        const time = Date.now() / 1000; // Current time in seconds
        
        // Semi-transparent background with vignette
        const alpha = this.overlayBackgroundOpacity;
        const alphaEnd = Math.min(1, alpha + 0.25);
        const vignetteGradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        vignetteGradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
        vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${alphaEnd})`);
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate animations for game over/victory
        let titleScale = 1;
        let titleYOffset = 0;
        let subtitleScale = 1;
        let subtitleRotation = 0;
        
        if (animate) {
            // Title pulse (scale) animation
            const pulsePhase = time * this.gameOverPulseSpeed * Math.PI * 2;
            titleScale = 1 + Math.sin(pulsePhase) * this.gameOverPulseAmount;
            
            // Title bob (Y position) animation - runs at 1.5x the pulse speed
            const bobPhase = time * this.gameOverBobSpeed * Math.PI * 2;
            titleYOffset = Math.sin(bobPhase) * this.gameOverBobAmount;
            
            // Subtitle pulse animation (different speed)
            const subtitlePulsePhase = time * this.subtitlePulseSpeed * Math.PI * 2;
            subtitleScale = 1 + Math.sin(subtitlePulsePhase) * this.subtitlePulseAmount;
            
            // Subtitle rotation animation (rotate left and right)
            const rotatePhase = time * this.subtitleRotateSpeed * Math.PI * 2;
            subtitleRotation = Math.sin(rotatePhase) * this.subtitleRotateAmount * (Math.PI / 180);
        }
        
        // Title with glow effect and animations
        ctx.save();
        ctx.shadowColor = titleColor;
        ctx.shadowBlur = this.overlayTitleGlow;
        ctx.fillStyle = titleColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Apply title transformations
        const titleX = canvas.width / 2;
        const titleY = canvas.height / 2 - 40 + titleYOffset;
        ctx.translate(titleX, titleY);
        ctx.scale(titleScale, titleScale);
        ctx.font = `bold ${this.overlayTitleSize}px 'Segoe UI', Arial`;
        ctx.fillText(title, 0, 0);
        ctx.restore();
        
        // Subtitle with rotation animation
        ctx.save();
        ctx.fillStyle = this.uiTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Apply subtitle transformations
        const subtitleX = canvas.width / 2;
        const subtitleY = canvas.height / 2 + 50;
        ctx.translate(subtitleX, subtitleY);
        ctx.rotate(subtitleRotation);
        ctx.scale(subtitleScale, subtitleScale);
        ctx.font = `${this.uiFontSize + 2}px 'Segoe UI', Arial`;
        ctx.fillText(subtitle, 0, 0);
        ctx.restore();
        
        // Decorative line (no animation)
        if (this.overlayShowDecorativeLine) {
            const lineWidth = this.overlayLineWidth;
            ctx.strokeStyle = titleColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - lineWidth, canvas.height / 2 + 10);
            ctx.lineTo(canvas.width / 2 + lineWidth, canvas.height / 2 + 10);
            ctx.stroke();
        }
    }
    
    // ==================== MODULE REGISTRATION ====================
    
    registerPath(pathModule) {
        if (!this._registeredModules.paths.includes(pathModule)) {
            this._registeredModules.paths.push(pathModule);
            //console.log('🛤️ Path registered with TDGameManager');
        }
    }
    
    registerTurret(turretModule) {
        if (!this._registeredModules.turrets.includes(turretModule)) {
            this._registeredModules.turrets.push(turretModule);
            //console.log('🔫 Turret registered with TDGameManager');
        }
    }
    
    registerEnemy(enemyModule) {
        if (!this._registeredModules.enemies.includes(enemyModule)) {
            this._registeredModules.enemies.push(enemyModule);
            // Note: Don't increment _enemiesAlive here - it's handled by onEnemySpawned
            // to avoid double-counting when WaveManager spawns enemies
            //console.log('👾 Enemy registered with TDGameManager');
        }
    }
    
    registerWaveManager(waveManager) {
        if (!this._registeredModules.waveManagers.includes(waveManager)) {
            this._registeredModules.waveManagers.push(waveManager);
            //console.log('🌊 WaveManager registered with TDGameManager');
        }
    }
    
    registerBase(baseModule) {
        if (!this._registeredModules.bases.includes(baseModule)) {
            this._registeredModules.bases.push(baseModule);
            //console.log('🏠 Base registered with TDGameManager');
        }
    }
    
    unregisterEnemy(enemyModule) {
        const index = this._registeredModules.enemies.indexOf(enemyModule);
        if (index > -1) {
            this._registeredModules.enemies.splice(index, 1);
            this._enemiesAlive = Math.max(0, this._enemiesAlive - 1);
            
            // Check if wave is complete (all enemies dead AND spawning finished)
            if (this._waveInProgress && this._enemiesAlive <= 0) {
                // Check if all wave managers have finished spawning
                let allSpawningComplete = true;
                for (const wm of this._registeredModules.waveManagers) {
                    if (wm && typeof wm.isSpawningComplete === 'function') {
                        if (!wm.isSpawningComplete()) {
                            allSpawningComplete = false;
                            break;
                        }
                    }
                }
                
                if (allSpawningComplete) {
                    this.waveComplete();
                }
            }
        }
    }
    
    // ==================== RESOURCE MANAGEMENT ====================
    
    getLives() { return this._lives; }
    getMoney() { return this._money; }
    getWave() { return this._wave; }
    getEnemiesAlive() { return this._enemiesAlive; }
    getState() { return this._gameState; }
    isPlaying() { return this._gameState === 'playing'; }
    isWaveInProgress() { return this._waveInProgress; }
    
    addMoney(amount) {
        this._money += amount;
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onMoneyChanged', { money: this._money, change: amount });
        }
    }
    
    spendMoney(amount) {
        if (this._money >= amount) {
            this._money -= amount;
            if (typeof broadcastMessage === 'function') {
                broadcastMessage('onMoneyChanged', { money: this._money, change: -amount });
            }
            return true;
        }
        return false;
    }
    
    canAfford(amount) {
        return this._money >= amount;
    }
    
    loseLife(amount = 1) {
        this._lives -= amount;
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onLivesChanged', { lives: this._lives, change: -amount });
        }
        
        if (this._lives <= 0) {
            this._lives = 0;
            this.gameOver();
        }
    }
    
    // ==================== WAVE MANAGEMENT ====================
    
    startNextWave() {
        if (this._waveInProgress) return;
        
        this._wave++;
        this._waveInProgress = true;
        this._gameState = 'playing';
        
        //console.log(`🌊 Starting Wave ${this._wave}!`);
        
        // Notify registered wave managers to begin spawning
        for (const waveManager of this._registeredModules.waveManagers) {
            if (waveManager && typeof waveManager.beginWave === 'function') {
                waveManager.beginWave(this._wave);
            }
        }
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onWaveStart', { wave: this._wave });
        }
    }
    
    waveComplete() {
        this._waveInProgress = false;
        this._money += this.moneyPerWave;
        
        //console.log(`✅ Wave ${this._wave} Complete! Bonus: $${this.moneyPerWave}`);
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onWaveComplete', { wave: this._wave, bonus: this.moneyPerWave });
        }
        
        // Notify all registered wave managers
        const waveManagers = this._registeredModules.waveManagers || [];
        for (const wm of waveManagers) {
            if (wm && typeof wm.onWaveComplete === 'function') {
                wm.onWaveComplete({ wave: this._wave, bonus: this.moneyPerWave });
            }
        }
    }
    
    // ==================== ENEMY EVENTS ====================
    
    onEnemyKilled(data = {}) {
        this._totalEnemiesKilled++;
        // Note: Don't decrement _enemiesAlive here - unregisterEnemy() handles it
        
        const reward = data.reward || this.moneyPerKill;
        this.addMoney(reward);
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onEnemyDeath', { ...data, moneyEarned: reward });
        }
        
        // Wave completion check is now handled by unregisterEnemy
    }
    
    onEnemyReachedEnd(data = {}) {
        const damage = data.damage || 1;
        this.loseLife(damage);
        // Note: Don't decrement _enemiesAlive here - unregisterEnemy() handles it
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onEnemyReachedBase', data);
        }
        
        // Check if wave is complete (after unregisterEnemy is called by the enemy)
        // This check is now handled by unregisterEnemy calling checkWaveComplete
    }
    
    onEnemySpawned(data = {}) {
        this._enemiesAlive++;
    }
    
    // ==================== GAME STATE ====================
    
    togglePause() {
        if (this._gameState === 'playing') {
            this._gameState = 'paused';
            //console.log('⏸️ Game Paused');
        } else if (this._gameState === 'paused') {
            this._gameState = 'playing';
            //console.log('▶️ Game Resumed');
        }
    }
    
    gameOver() {
        this._gameState = 'gameover';
        //console.log('💀 Game Over! Survived', this._wave, 'waves');
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onGameOver', { 
                wave: this._wave, 
                kills: this._totalEnemiesKilled 
            });
        }
    }
    
    victory() {
        this._gameState = 'victory';
        //console.log('🎉 Victory! All waves completed!');
        
        if (typeof broadcastMessage === 'function') {
            broadcastMessage('onVictory', { 
                wave: this._wave, 
                kills: this._totalEnemiesKilled 
            });
        }
    }
    
    restartGame() {
        //console.log('🔄 Restarting game...');
        gameRestart();
    }
    
    // ==================== HELPER METHODS ====================
    
    getPaths() { return this._registeredModules.paths; }
    getTurrets() { return this._registeredModules.turrets; }
    getEnemies() { return this._registeredModules.enemies; }
    getBases() { return this._registeredModules.bases; }
    
    getFirstPath() {
        return this._registeredModules.paths.length > 0 ? this._registeredModules.paths[0] : null;
    }
    
    // Find the game manager from any module
    static findManager() {
        if (typeof findByModule === 'function') {
            const managers = findByModule('TDGameManager');
            return managers.length > 0 ? managers[0].getModule('TDGameManager') : null;
        }
        return null;
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON ? super.toJSON() : {};
        json.type = 'TDGameManager';
        
        // Core gameplay settings
        json.startingLives = this.startingLives;
        json.startingMoney = this.startingMoney;
        json.moneyPerKill = this.moneyPerKill;
        json.moneyPerWave = this.moneyPerWave;
        
        // UI visibility settings
        json.showUI = this.showUI;
        json.showLives = this.showLives;
        json.showMoney = this.showMoney;
        json.showWave = this.showWave;
        json.showKills = this.showKills;
        json.showEnemies = this.showEnemies;
        json.showGameMessages = this.showGameMessages;
        
        // UI layout settings
        json.uiStyle = this.uiStyle;
        json.uiPosition = this.uiPosition;
        json.uiAlignment = this.uiAlignment;
        json.uiFontSize = this.uiFontSize;
        json.uiPadding = this.uiPadding;
        json.uiBorderRadius = this.uiBorderRadius;
        
        // UI color settings
        json.uiBackgroundColor = this.uiBackgroundColor;
        json.uiTextColor = this.uiTextColor;
        json.uiAccentColor = this.uiAccentColor;
        json.uiBorderColor = this.uiBorderColor;
        json.uiDangerColor = this.uiDangerColor;
        json.uiSuccessColor = this.uiSuccessColor;
        
        // UI icons/labels
        json.livesIcon = this.livesIcon;
        json.livesLabel = this.livesLabel;
        json.moneyIcon = this.moneyIcon;
        json.moneyLabel = this.moneyLabel;
        json.waveIcon = this.waveIcon;
        json.waveLabel = this.waveLabel;
        json.enemiesIcon = this.enemiesIcon;
        json.enemiesLabel = this.enemiesLabel;
        json.killsIcon = this.killsIcon;
        json.killsLabel = this.killsLabel;
        
        // Game state messages
        json.startMessage = this.startMessage;
        json.nextWaveMessage = this.nextWaveMessage;
        json.pausedTitle = this.pausedTitle;
        json.pausedTitleColor = this.pausedTitleColor;
        json.resumeHint = this.resumeHint;
        json.gameOverTitle = this.gameOverTitle;
        json.gameOverTitleColor = this.gameOverTitleColor;
        json.gameOverSubtitle = this.gameOverSubtitle;
        json.victoryTitle = this.victoryTitle;
        json.victoryTitleColor = this.victoryTitleColor;
        json.victorySubtitle = this.victorySubtitle;
        json.restartHint = this.restartHint;
        
        // Overlay settings
        json.overlayBackgroundOpacity = this.overlayBackgroundOpacity;
        json.overlayTitleSize = this.overlayTitleSize;
        json.overlayTitleGlow = this.overlayTitleGlow;
        json.overlayShowDecorativeLine = this.overlayShowDecorativeLine;
        json.overlayLineWidth = this.overlayLineWidth;
        
        // Animation settings
        json.gameOverPulseSpeed = this.gameOverPulseSpeed;
        json.gameOverPulseAmount = this.gameOverPulseAmount;
        json.gameOverBobSpeed = this.gameOverBobSpeed;
        json.gameOverBobAmount = this.gameOverBobAmount;
        json.subtitlePulseSpeed = this.subtitlePulseSpeed;
        json.subtitlePulseAmount = this.subtitlePulseAmount;
        json.subtitleRotateSpeed = this.subtitleRotateSpeed;
        json.subtitleRotateAmount = this.subtitleRotateAmount;
        
        // Internal state (for game save/load)
        json._lives = this._lives;
        json._money = this._money;
        json._wave = this._wave;
        json._enemiesAlive = this._enemiesAlive;
        json._totalEnemiesKilled = this._totalEnemiesKilled;
        json._gameState = this._gameState;
        json._waveInProgress = this._waveInProgress;
        
        return json;
    }
    
    static fromJSON(json) {
        const module = new TDGameManager();
        
        // Core gameplay settings
        module.startingLives = json.startingLives ?? 20;
        module.startingMoney = json.startingMoney ?? 100;
        module.moneyPerKill = json.moneyPerKill ?? 10;
        module.moneyPerWave = json.moneyPerWave ?? 50;
        
        // UI visibility settings
        module.showUI = json.showUI ?? true;
        module.showLives = json.showLives ?? true;
        module.showMoney = json.showMoney ?? true;
        module.showWave = json.showWave ?? true;
        module.showKills = json.showKills ?? true;
        module.showEnemies = json.showEnemies ?? true;
        module.showGameMessages = json.showGameMessages ?? true;
        
        // UI layout settings
        module.uiStyle = json.uiStyle ?? 'modern';
        module.uiPosition = json.uiPosition ?? 'top';
        module.uiAlignment = json.uiAlignment ?? 'spread';
        module.uiFontSize = json.uiFontSize ?? 20;
        module.uiPadding = json.uiPadding ?? 20;
        module.uiBorderRadius = json.uiBorderRadius ?? 10;
        
        // UI color settings
        module.uiBackgroundColor = json.uiBackgroundColor ?? 'rgba(0,0,0,0.7)';
        module.uiTextColor = json.uiTextColor ?? '#ffffff';
        module.uiAccentColor = json.uiAccentColor ?? '#ffcc00';
        module.uiBorderColor = json.uiBorderColor ?? 'rgba(255,255,255,0.2)';
        module.uiDangerColor = json.uiDangerColor ?? '#ff6b6b';
        module.uiSuccessColor = json.uiSuccessColor ?? '#51cf66';
        
        // UI icons/labels
        module.livesIcon = json.livesIcon ?? '❤️';
        module.livesLabel = json.livesLabel ?? '';
        module.moneyIcon = json.moneyIcon ?? '💰';
        module.moneyLabel = json.moneyLabel ?? '$';
        module.waveIcon = json.waveIcon ?? '🌊';
        module.waveLabel = json.waveLabel ?? 'Wave ';
        module.enemiesIcon = json.enemiesIcon ?? '👾';
        module.enemiesLabel = json.enemiesLabel ?? ' alive';
        module.killsIcon = json.killsIcon ?? '💀';
        module.killsLabel = json.killsLabel ?? ' kills';
        
        // Game state messages
        module.startMessage = json.startMessage ?? 'Press SPACE to start Wave {wave}';
        module.nextWaveMessage = json.nextWaveMessage ?? 'Wave {wave} Complete! Press SPACE for next wave';
        module.pausedTitle = json.pausedTitle ?? 'PAUSED';
        module.pausedTitleColor = json.pausedTitleColor ?? '#ffff00';
        module.resumeHint = json.resumeHint ?? 'Press P to resume';
        module.gameOverTitle = json.gameOverTitle ?? 'GAME OVER';
        module.gameOverTitleColor = json.gameOverTitleColor ?? '#ff0000';
        module.gameOverSubtitle = json.gameOverSubtitle ?? 'Survived {wave} waves';
        module.victoryTitle = json.victoryTitle ?? 'VICTORY!';
        module.victoryTitleColor = json.victoryTitleColor ?? '#00ff00';
        module.victorySubtitle = json.victorySubtitle ?? 'All waves completed!';
        module.restartHint = json.restartHint ?? 'Press R to restart';
        
        // Overlay settings
        module.overlayBackgroundOpacity = json.overlayBackgroundOpacity ?? 0.7;
        module.overlayTitleSize = json.overlayTitleSize ?? 64;
        module.overlayTitleGlow = json.overlayTitleGlow ?? 30;
        module.overlayShowDecorativeLine = json.overlayShowDecorativeLine ?? true;
        module.overlayLineWidth = json.overlayLineWidth ?? 200;
        
        // Animation settings
        module.gameOverPulseSpeed = json.gameOverPulseSpeed ?? 1.5;
        module.gameOverPulseAmount = json.gameOverPulseAmount ?? 0.15;
        module.gameOverBobSpeed = json.gameOverBobSpeed ?? 2.25;
        module.gameOverBobAmount = json.gameOverBobAmount ?? 10;
        module.subtitlePulseSpeed = json.subtitlePulseSpeed ?? 2.0;
        module.subtitlePulseAmount = json.subtitlePulseAmount ?? 0.08;
        module.subtitleRotateSpeed = json.subtitleRotateSpeed ?? 1.2;
        module.subtitleRotateAmount = json.subtitleRotateAmount ?? 3;
        
        // Internal state (for game save/load)
        // Use saved state if available, otherwise fall back to starting values
        module._lives = json._lives ?? module.startingLives;
        module._money = json._money ?? module.startingMoney;
        module._wave = json._wave ?? 0;
        module._enemiesAlive = json._enemiesAlive ?? 0;
        module._totalEnemiesKilled = json._totalEnemiesKilled ?? 0;
        module._gameState = json._gameState ?? 'waiting';
        module._waveInProgress = json._waveInProgress ?? false;
        
        if (json.enabled !== undefined) module.enabled = json.enabled;
        return module;
    }
    
    clone() {
        const cloned = new TDGameManager();
        
        // Core gameplay settings
        cloned.startingLives = this.startingLives;
        cloned.startingMoney = this.startingMoney;
        cloned.moneyPerKill = this.moneyPerKill;
        cloned.moneyPerWave = this.moneyPerWave;
        
        // UI visibility settings
        cloned.showUI = this.showUI;
        cloned.showLives = this.showLives;
        cloned.showMoney = this.showMoney;
        cloned.showWave = this.showWave;
        cloned.showKills = this.showKills;
        cloned.showEnemies = this.showEnemies;
        cloned.showGameMessages = this.showGameMessages;
        
        // UI layout settings
        cloned.uiStyle = this.uiStyle;
        cloned.uiPosition = this.uiPosition;
        cloned.uiAlignment = this.uiAlignment;
        cloned.uiFontSize = this.uiFontSize;
        cloned.uiPadding = this.uiPadding;
        cloned.uiBorderRadius = this.uiBorderRadius;
        
        // UI color settings
        cloned.uiBackgroundColor = this.uiBackgroundColor;
        cloned.uiTextColor = this.uiTextColor;
        cloned.uiAccentColor = this.uiAccentColor;
        cloned.uiBorderColor = this.uiBorderColor;
        cloned.uiDangerColor = this.uiDangerColor;
        cloned.uiSuccessColor = this.uiSuccessColor;
        
        // UI icons/labels
        cloned.livesIcon = this.livesIcon;
        cloned.livesLabel = this.livesLabel;
        cloned.moneyIcon = this.moneyIcon;
        cloned.moneyLabel = this.moneyLabel;
        cloned.waveIcon = this.waveIcon;
        cloned.waveLabel = this.waveLabel;
        cloned.enemiesIcon = this.enemiesIcon;
        cloned.enemiesLabel = this.enemiesLabel;
        cloned.killsIcon = this.killsIcon;
        cloned.killsLabel = this.killsLabel;
        
        // Game state messages
        cloned.startMessage = this.startMessage;
        cloned.nextWaveMessage = this.nextWaveMessage;
        cloned.pausedTitle = this.pausedTitle;
        cloned.pausedTitleColor = this.pausedTitleColor;
        cloned.resumeHint = this.resumeHint;
        cloned.gameOverTitle = this.gameOverTitle;
        cloned.gameOverTitleColor = this.gameOverTitleColor;
        cloned.gameOverSubtitle = this.gameOverSubtitle;
        cloned.victoryTitle = this.victoryTitle;
        cloned.victoryTitleColor = this.victoryTitleColor;
        cloned.victorySubtitle = this.victorySubtitle;
        cloned.restartHint = this.restartHint;
        
        // Overlay settings
        cloned.overlayBackgroundOpacity = this.overlayBackgroundOpacity;
        cloned.overlayTitleSize = this.overlayTitleSize;
        cloned.overlayTitleGlow = this.overlayTitleGlow;
        cloned.overlayShowDecorativeLine = this.overlayShowDecorativeLine;
        cloned.overlayLineWidth = this.overlayLineWidth;
        
        // Animation settings
        cloned.gameOverPulseSpeed = this.gameOverPulseSpeed;
        cloned.gameOverPulseAmount = this.gameOverPulseAmount;
        cloned.gameOverBobSpeed = this.gameOverBobSpeed;
        cloned.gameOverBobAmount = this.gameOverBobAmount;
        cloned.subtitlePulseSpeed = this.subtitlePulseSpeed;
        cloned.subtitlePulseAmount = this.subtitlePulseAmount;
        cloned.subtitleRotateSpeed = this.subtitleRotateSpeed;
        cloned.subtitleRotateAmount = this.subtitleRotateAmount;
        
        // Internal state (for game save/load)
        cloned._lives = this._lives;
        cloned._money = this._money;
        cloned._wave = this._wave;
        cloned._enemiesAlive = this._enemiesAlive;
        cloned._totalEnemiesKilled = this._totalEnemiesKilled;
        cloned._gameState = this._gameState;
        cloned._waveInProgress = this._waveInProgress;
        
        cloned.enabled = this.enabled;
        return cloned;
    }
}

// Register the module
if (typeof window !== 'undefined') {
    window.TDGameManager = TDGameManager;
}

if (typeof Module !== 'undefined') {
    Module.register('TDGameManager', TDGameManager);
}
