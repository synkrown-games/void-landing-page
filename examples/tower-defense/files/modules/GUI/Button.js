/**
 * Button Module
 * GUI clickable button with customizable appearance
 * Namespace: GUI
 * 
 * Features:
 * - Customizable text, colors, and size
 * - Hover and click states
 * - Script execution on click (safe execution)
 * - Multiple button styles (solid, outline, gradient)
 * - Icon support
 */

class Button extends Module {
    constructor() {
        super();
        
        // Render Mode
        this.renderMode = 'gui'; // 'gui' = screen space (drawGUI), 'world' = world space (draw)
        this.anchor = 'custom'; // Anchor point: 'custom', 'top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'
        this.guiX = 512; // X offset from anchor (or absolute X if anchor is 'custom')
        this.guiY = 384; // Y offset from anchor (or absolute Y if anchor is 'custom')
        
        // Button Text
        this.text = 'Button';
        this.fontSize = 20;
        this.fontFamily = 'Arial, sans-serif';
        this.fontWeight = 'bold';
        this.textAlign = 'center';
        
        // Button Size
        this.width = 200;
        this.height = 50;
        this.cornerRadius = 8;
        
        // Colors - Normal State
        this.backgroundColor = '#4488ff';
        this.textColor = '#ffffff';
        this.borderColor = '#2266cc';
        this.borderWidth = 2;
        
        // Colors - Hover State
        this.hoverBackgroundColor = '#66aaff';
        this.hoverTextColor = '#ffffff';
        this.hoverBorderColor = '#4488ff';
        
        // Colors - Pressed State
        this.pressedBackgroundColor = '#2266cc';
        this.pressedTextColor = '#ffffff';
        this.pressedBorderColor = '#114488';
        
        // Colors - Disabled State
        this.disabledBackgroundColor = '#666666';
        this.disabledTextColor = '#999999';
        this.disabledBorderColor = '#555555';
        
        // Button Style
        this.buttonStyle = 'solid'; // 'solid', 'outline', 'gradient', 'glass'
        this.gradientDirection = 'vertical'; // 'vertical', 'horizontal', 'diagonal'
        this.gradientEndColor = '#2266cc';
        
        // Icon (optional)
        this.icon = ''; // Emoji or text icon
        this.iconPosition = 'left'; // 'left', 'right', 'top', 'bottom'
        this.iconSize = 24;
        this.iconSpacing = 8;
        
        // Shadow
        this.showShadow = true;
        this.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.shadowOffsetX = 2;
        this.shadowOffsetY = 4;
        this.shadowBlur = 8;
        
        // Interaction
        this.isEnabled = true;
        this.clickScript = ''; // Script code to execute on click
        this.hoverScale = 1.05; // Scale on hover (1.0 = no scale)
        this.clickScale = 0.95; // Scale on click
        this.animationSpeed = 10; // Animation speed multiplier
        
        // Audio
        this.hoverSound = '';
        this.clickSound = '';
        
        // Tooltip
        this.tooltip = '';
        this.tooltipDelay = 0.5; // Seconds before showing tooltip
        
        // Internal state
        this._isHovered = false;
        this._isPressed = false;
        this._currentScale = 1;
        this._targetScale = 1;
        this._tooltipTimer = 0;
        this._showTooltip = false;
        this._wasHovered = false;
    }
    
    // ==================== MODULE METADATA ====================
    static namespace = 'GUI,Drawing,Rendering';
    static priority = 100; // Draw on top
    
    static getIcon() {
        return '🔘';
    }
    
    static getDescription() {
        return 'Clickable button with customizable appearance and script execution';
    }
    
    // ==================== PROPERTY METADATA ====================
    getPropertyMetadata() {
        return [
            // ═══════════════════════════════════════
            // RENDER MODE SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🖥️ Render Mode' },
            { 
                type: 'hint', 
                label: 'Choose where the button renders: GUI (fixed on screen) or World (in game space)' 
            },
            { 
                key: 'renderMode', 
                label: '🎯 Mode', 
                type: 'select',
                options: {
                    'gui': 'GUI (Screen Space)',
                    'world': 'World (Game Space)'
                },
                hint: 'GUI: Fixed position on screen. World: Moves with camera, uses GameObject position'
            },
            { 
                key: 'anchor', 
                label: '⚓ Anchor', 
                type: 'select',
                options: {
                    'custom': 'Custom (Absolute)',
                    'top-left': 'Top Left',
                    'top': 'Top Center',
                    'top-right': 'Top Right',
                    'left': 'Middle Left',
                    'center': 'Center',
                    'right': 'Middle Right',
                    'bottom-left': 'Bottom Left',
                    'bottom': 'Bottom Center',
                    'bottom-right': 'Bottom Right'
                },
                hint: 'Screen anchor point. X/Y become offsets from this anchor.',
                showIf: { renderMode: 'gui' }
            },
            { 
                key: 'guiX', 
                label: '↔️ X Offset', 
                type: 'number',
                step: 1,
                hint: 'X position/offset from anchor',
                showIf: { renderMode: 'gui' }
            },
            { 
                key: 'guiY', 
                label: '↕️ Y Offset', 
                type: 'number',
                step: 1,
                hint: 'Y position/offset from anchor',
                showIf: { renderMode: 'gui' }
            },
            
            // ═══════════════════════════════════════
            // TEXT SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '📝 Button Text' },
            { 
                type: 'hint', 
                label: 'Configure the text displayed on the button' 
            },
            { 
                key: 'text', 
                label: '✏️ Text', 
                type: 'text',
                hint: 'Text displayed on the button'
            },
            { 
                key: 'fontSize', 
                label: '🔤 Font Size', 
                type: 'slider', 
                min: 8, 
                max: 72,
                step: 1,
                hint: 'Size of the button text in pixels'
            },
            { 
                key: 'fontFamily', 
                label: '🖋️ Font Family', 
                type: 'text',
                hint: 'CSS font family (e.g., Arial, sans-serif)'
            },
            { 
                key: 'fontWeight', 
                label: '💪 Font Weight', 
                type: 'select',
                options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']
            },
            
            // ═══════════════════════════════════════
            // SIZE & SHAPE SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '📐 Size & Shape' },
            { 
                key: 'width', 
                label: '↔️ Width', 
                type: 'slider', 
                min: 50, 
                max: 600,
                step: 5,
                hint: 'Button width in pixels'
            },
            { 
                key: 'height', 
                label: '↕️ Height', 
                type: 'slider', 
                min: 20, 
                max: 200,
                step: 5,
                hint: 'Button height in pixels'
            },
            { 
                key: 'cornerRadius', 
                label: '◐ Corner Radius', 
                type: 'slider', 
                min: 0, 
                max: 50,
                step: 1,
                hint: 'Rounded corner radius (0 = square)'
            },
            
            // ═══════════════════════════════════════
            // STYLE SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🎨 Button Style' },
            { 
                key: 'buttonStyle', 
                label: '🖌️ Style', 
                type: 'select',
                options: {
                    'solid': 'Solid Fill',
                    'outline': 'Outline Only',
                    'gradient': 'Gradient',
                    'glass': 'Glass Effect'
                },
                hint: 'Visual style of the button'
            },
            { 
                key: 'gradientDirection', 
                label: '📐 Gradient Direction', 
                type: 'select',
                options: ['vertical', 'horizontal', 'diagonal'],
                showIf: { buttonStyle: 'gradient' }
            },
            { 
                key: 'gradientEndColor', 
                label: '🎨 Gradient End', 
                type: 'color',
                showIf: { buttonStyle: 'gradient' },
                hint: 'Second color for gradient (starts from background color)'
            },
            
            // ═══════════════════════════════════════
            // NORMAL STATE COLORS
            // ═══════════════════════════════════════
            { type: 'header', label: '🎨 Normal State Colors' },
            { 
                type: 'hint', 
                label: 'Default appearance when not interacting' 
            },
            { 
                key: 'backgroundColor', 
                label: '🟦 Background', 
                type: 'color'
            },
            { 
                key: 'textColor', 
                label: '📝 Text', 
                type: 'color'
            },
            { 
                key: 'borderColor', 
                label: '🔲 Border', 
                type: 'color'
            },
            { 
                key: 'borderWidth', 
                label: '📏 Border Width', 
                type: 'slider', 
                min: 0, 
                max: 10,
                step: 1
            },
            
            // ═══════════════════════════════════════
            // HOVER STATE COLORS
            // ═══════════════════════════════════════
            { type: 'header', label: '✨ Hover State Colors' },
            { 
                type: 'hint', 
                label: 'Appearance when mouse hovers over button' 
            },
            { 
                key: 'hoverBackgroundColor', 
                label: '🟦 Background', 
                type: 'color'
            },
            { 
                key: 'hoverTextColor', 
                label: '📝 Text', 
                type: 'color'
            },
            { 
                key: 'hoverBorderColor', 
                label: '🔲 Border', 
                type: 'color'
            },
            
            // ═══════════════════════════════════════
            // PRESSED STATE COLORS
            // ═══════════════════════════════════════
            { type: 'header', label: '👆 Pressed State Colors' },
            { 
                type: 'hint', 
                label: 'Appearance when button is clicked/held' 
            },
            { 
                key: 'pressedBackgroundColor', 
                label: '🟦 Background', 
                type: 'color'
            },
            { 
                key: 'pressedTextColor', 
                label: '📝 Text', 
                type: 'color'
            },
            { 
                key: 'pressedBorderColor', 
                label: '🔲 Border', 
                type: 'color'
            },
            
            // ═══════════════════════════════════════
            // DISABLED STATE COLORS
            // ═══════════════════════════════════════
            { type: 'header', label: '🚫 Disabled State Colors' },
            { 
                type: 'hint', 
                label: 'Appearance when button is disabled' 
            },
            { 
                key: 'disabledBackgroundColor', 
                label: '🟦 Background', 
                type: 'color'
            },
            { 
                key: 'disabledTextColor', 
                label: '📝 Text', 
                type: 'color'
            },
            { 
                key: 'disabledBorderColor', 
                label: '🔲 Border', 
                type: 'color'
            },
            
            // ═══════════════════════════════════════
            // ICON SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🖼️ Icon' },
            { 
                type: 'hint', 
                label: 'Optional icon/emoji displayed with text' 
            },
            { 
                key: 'icon', 
                label: '🎯 Icon', 
                type: 'text',
                hint: 'Emoji or symbol (e.g., ▶️ 🎮 ⚙️ 🔊)'
            },
            { 
                key: 'iconPosition', 
                label: '📍 Position', 
                type: 'select',
                options: {
                    'left': 'Left of Text',
                    'right': 'Right of Text',
                    'top': 'Above Text',
                    'bottom': 'Below Text'
                },
                showIf: (module) => module.icon && module.icon.trim() !== ''
            },
            { 
                key: 'iconSize', 
                label: '📏 Icon Size', 
                type: 'slider', 
                min: 8, 
                max: 64,
                step: 1,
                showIf: (module) => module.icon && module.icon.trim() !== ''
            },
            { 
                key: 'iconSpacing', 
                label: '↔️ Spacing', 
                type: 'slider', 
                min: 0, 
                max: 32,
                step: 1,
                hint: 'Space between icon and text',
                showIf: (module) => module.icon && module.icon.trim() !== ''
            },
            
            // ═══════════════════════════════════════
            // SHADOW SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🌑 Shadow' },
            { 
                key: 'showShadow', 
                label: '👁️ Show Shadow', 
                type: 'boolean'
            },
            { 
                key: 'shadowColor', 
                label: '🎨 Color', 
                type: 'color',
                showIf: { showShadow: true }
            },
            { 
                key: 'shadowOffsetX', 
                label: '↔️ Offset X', 
                type: 'slider', 
                min: -20, 
                max: 20,
                step: 1,
                showIf: { showShadow: true }
            },
            { 
                key: 'shadowOffsetY', 
                label: '↕️ Offset Y', 
                type: 'slider', 
                min: -20, 
                max: 20,
                step: 1,
                showIf: { showShadow: true }
            },
            { 
                key: 'shadowBlur', 
                label: '💨 Blur', 
                type: 'slider', 
                min: 0, 
                max: 30,
                step: 1,
                showIf: { showShadow: true }
            },
            
            // ═══════════════════════════════════════
            // INTERACTION SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🎯 Interaction' },
            { 
                type: 'hint', 
                label: 'Configure button behavior and click actions' 
            },
            { 
                key: 'isEnabled', 
                label: '✅ Enabled', 
                type: 'boolean',
                hint: 'Whether the button can be clicked'
            },
            { 
                key: 'clickScript', 
                label: '📜 On Click Script', 
                type: 'script',
                hint: 'JavaScript code executed when clicked. Use game API functions like sceneLoad("SceneName"), audioPlay("sound.mp3"), instanceCreate("Prefab", x, y)'
            },
            { 
                key: 'hoverScale', 
                label: '📈 Hover Scale', 
                type: 'slider', 
                min: 1, 
                max: 1.3,
                step: 0.01,
                hint: 'Button scale when hovered (1.0 = no change)'
            },
            { 
                key: 'clickScale', 
                label: '📉 Click Scale', 
                type: 'slider', 
                min: 0.8, 
                max: 1,
                step: 0.01,
                hint: 'Button scale when pressed'
            },
            { 
                key: 'animationSpeed', 
                label: '⚡ Animation Speed', 
                type: 'slider', 
                min: 1, 
                max: 30,
                step: 1,
                hint: 'How fast scale animations play'
            },
            
            // ═══════════════════════════════════════
            // AUDIO SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '🔊 Audio Feedback' },
            { 
                key: 'hoverSound', 
                label: '🔈 Hover Sound', 
                type: 'audio',
                hint: 'Sound played when mouse enters button'
            },
            { 
                key: 'clickSound', 
                label: '🔊 Click Sound', 
                type: 'audio',
                hint: 'Sound played when button is clicked'
            },
            
            // ═══════════════════════════════════════
            // TOOLTIP SECTION
            // ═══════════════════════════════════════
            { type: 'header', label: '💬 Tooltip' },
            { 
                key: 'tooltip', 
                label: '📝 Tooltip Text', 
                type: 'text',
                hint: 'Text shown when hovering (leave empty for none)'
            },
            { 
                key: 'tooltipDelay', 
                label: '⏱️ Delay', 
                type: 'slider', 
                min: 0, 
                max: 2,
                step: 0.1,
                hint: 'Seconds before tooltip appears',
                showIf: (module) => module.tooltip && module.tooltip.trim() !== ''
            }
        ];
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        // Get parent properties if available
        const json = super.toJSON ? super.toJSON() : {};
        
        return Object.assign(json, {
            type: this.constructor.name,
            enabled: this.enabled,
            // Render Mode
            renderMode: this.renderMode,
            anchor: this.anchor,
            guiX: this.guiX,
            guiY: this.guiY,
            // Text
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            textAlign: this.textAlign,
            // Size
            width: this.width,
            height: this.height,
            cornerRadius: this.cornerRadius,
            // Normal Colors
            backgroundColor: this.backgroundColor,
            textColor: this.textColor,
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            // Hover Colors
            hoverBackgroundColor: this.hoverBackgroundColor,
            hoverTextColor: this.hoverTextColor,
            hoverBorderColor: this.hoverBorderColor,
            // Pressed Colors
            pressedBackgroundColor: this.pressedBackgroundColor,
            pressedTextColor: this.pressedTextColor,
            pressedBorderColor: this.pressedBorderColor,
            // Disabled Colors
            disabledBackgroundColor: this.disabledBackgroundColor,
            disabledTextColor: this.disabledTextColor,
            disabledBorderColor: this.disabledBorderColor,
            // Style
            buttonStyle: this.buttonStyle,
            gradientDirection: this.gradientDirection,
            gradientEndColor: this.gradientEndColor,
            // Icon
            icon: this.icon,
            iconPosition: this.iconPosition,
            iconSize: this.iconSize,
            iconSpacing: this.iconSpacing,
            // Shadow
            showShadow: this.showShadow,
            shadowColor: this.shadowColor,
            shadowOffsetX: this.shadowOffsetX,
            shadowOffsetY: this.shadowOffsetY,
            shadowBlur: this.shadowBlur,
            // Interaction
            isEnabled: this.isEnabled,
            clickScript: this.clickScript,
            hoverScale: this.hoverScale,
            clickScale: this.clickScale,
            animationSpeed: this.animationSpeed,
            // Audio
            hoverSound: this.hoverSound,
            clickSound: this.clickSound,
            // Tooltip
            tooltip: this.tooltip,
            tooltipDelay: this.tooltipDelay
        });
    }
    
    static fromJSON(json) {
        const button = new Button();
        
        // Base properties
        button.enabled = json.enabled !== undefined ? json.enabled : true;
        
        // Render Mode
        if (json.renderMode !== undefined) button.renderMode = json.renderMode;
        if (json.anchor !== undefined) button.anchor = json.anchor;
        if (json.guiX !== undefined) button.guiX = json.guiX;
        if (json.guiY !== undefined) button.guiY = json.guiY;
        
        // Text
        if (json.text !== undefined) button.text = json.text;
        if (json.fontSize !== undefined) button.fontSize = json.fontSize;
        if (json.fontFamily !== undefined) button.fontFamily = json.fontFamily;
        if (json.fontWeight !== undefined) button.fontWeight = json.fontWeight;
        if (json.textAlign !== undefined) button.textAlign = json.textAlign;
        
        // Size
        if (json.width !== undefined) button.width = json.width;
        if (json.height !== undefined) button.height = json.height;
        if (json.cornerRadius !== undefined) button.cornerRadius = json.cornerRadius;
        
        // Normal Colors
        if (json.backgroundColor !== undefined) button.backgroundColor = json.backgroundColor;
        if (json.textColor !== undefined) button.textColor = json.textColor;
        if (json.borderColor !== undefined) button.borderColor = json.borderColor;
        if (json.borderWidth !== undefined) button.borderWidth = json.borderWidth;
        
        // Hover Colors
        if (json.hoverBackgroundColor !== undefined) button.hoverBackgroundColor = json.hoverBackgroundColor;
        if (json.hoverTextColor !== undefined) button.hoverTextColor = json.hoverTextColor;
        if (json.hoverBorderColor !== undefined) button.hoverBorderColor = json.hoverBorderColor;
        
        // Pressed Colors
        if (json.pressedBackgroundColor !== undefined) button.pressedBackgroundColor = json.pressedBackgroundColor;
        if (json.pressedTextColor !== undefined) button.pressedTextColor = json.pressedTextColor;
        if (json.pressedBorderColor !== undefined) button.pressedBorderColor = json.pressedBorderColor;
        
        // Disabled Colors
        if (json.disabledBackgroundColor !== undefined) button.disabledBackgroundColor = json.disabledBackgroundColor;
        if (json.disabledTextColor !== undefined) button.disabledTextColor = json.disabledTextColor;
        if (json.disabledBorderColor !== undefined) button.disabledBorderColor = json.disabledBorderColor;
        
        // Style
        if (json.buttonStyle !== undefined) button.buttonStyle = json.buttonStyle;
        if (json.gradientDirection !== undefined) button.gradientDirection = json.gradientDirection;
        if (json.gradientEndColor !== undefined) button.gradientEndColor = json.gradientEndColor;
        
        // Icon
        if (json.icon !== undefined) button.icon = json.icon;
        if (json.iconPosition !== undefined) button.iconPosition = json.iconPosition;
        if (json.iconSize !== undefined) button.iconSize = json.iconSize;
        if (json.iconSpacing !== undefined) button.iconSpacing = json.iconSpacing;
        
        // Shadow
        if (json.showShadow !== undefined) button.showShadow = json.showShadow;
        if (json.shadowColor !== undefined) button.shadowColor = json.shadowColor;
        if (json.shadowOffsetX !== undefined) button.shadowOffsetX = json.shadowOffsetX;
        if (json.shadowOffsetY !== undefined) button.shadowOffsetY = json.shadowOffsetY;
        if (json.shadowBlur !== undefined) button.shadowBlur = json.shadowBlur;
        
        // Interaction
        if (json.isEnabled !== undefined) button.isEnabled = json.isEnabled;
        if (json.clickScript !== undefined) button.clickScript = json.clickScript;
        if (json.hoverScale !== undefined) button.hoverScale = json.hoverScale;
        if (json.clickScale !== undefined) button.clickScale = json.clickScale;
        if (json.animationSpeed !== undefined) button.animationSpeed = json.animationSpeed;
        
        // Audio
        if (json.hoverSound !== undefined) button.hoverSound = json.hoverSound;
        if (json.clickSound !== undefined) button.clickSound = json.clickSound;
        
        // Tooltip
        if (json.tooltip !== undefined) button.tooltip = json.tooltip;
        if (json.tooltipDelay !== undefined) button.tooltipDelay = json.tooltipDelay;
        
        return button;
    }
    
    clone() {
        const cloned = Button.fromJSON(this.toJSON());
        // Reset runtime state
        cloned._isHovered = false;
        cloned._isPressed = false;
        cloned._currentScale = 1;
        cloned._targetScale = 1;
        cloned._tooltipTimer = 0;
        cloned._showTooltip = false;
        cloned._wasHovered = false;
        return cloned;
    }
    
    // ==================== LIFECYCLE ====================
    
    /**
     * Calculate screen position based on anchor and offset
     */
    _getAnchoredPosition() {
        // Get screen dimensions
        const engine = this.gameObject ? this.gameObject._engine : null;
        const screenWidth = engine ? engine.width : 1024;
        const screenHeight = engine ? engine.height : 768;
        
        let anchorX = 0, anchorY = 0;
        
        switch (this.anchor) {
            case 'top-left':
                anchorX = 0; anchorY = 0;
                break;
            case 'top':
                anchorX = screenWidth / 2; anchorY = 0;
                break;
            case 'top-right':
                anchorX = screenWidth; anchorY = 0;
                break;
            case 'left':
                anchorX = 0; anchorY = screenHeight / 2;
                break;
            case 'center':
                anchorX = screenWidth / 2; anchorY = screenHeight / 2;
                break;
            case 'right':
                anchorX = screenWidth; anchorY = screenHeight / 2;
                break;
            case 'bottom-left':
                anchorX = 0; anchorY = screenHeight;
                break;
            case 'bottom':
                anchorX = screenWidth / 2; anchorY = screenHeight;
                break;
            case 'bottom-right':
                anchorX = screenWidth; anchorY = screenHeight;
                break;
            case 'custom':
            default:
                // Custom means guiX/guiY are absolute positions
                return { x: this.guiX, y: this.guiY };
        }
        
        return { 
            x: anchorX + this.guiX, 
            y: anchorY + this.guiY 
        };
    }
    
    start() {
        this._currentScale = 1;
        this._targetScale = 1;
    }
    
    loop(deltaTime) {
        if (!this.gameObject) return;
        
        // Get mouse position based on render mode
        let mouseX, mouseY, isMouseDown;
        let buttonX, buttonY;
        
        if (this.renderMode === 'gui') {
            // GUI mode: use screen coordinates with anchor
            const anchoredPos = this._getAnchoredPosition();
            buttonX = anchoredPos.x;
            buttonY = anchoredPos.y;
            
            if (typeof mousePositionScreen === 'function') {
                const screenPos = mousePositionScreen();
                mouseX = screenPos.x;
                mouseY = screenPos.y;
            } else {
                // Fallback to engine
                const engine = this.gameObject._engine;
                mouseX = engine ? engine.mouseX : 0;
                mouseY = engine ? engine.mouseY : 0;
            }
            // Use GUI mouse functions for screen-space buttons
            isMouseDown = typeof guiMouseDown === 'function' ? guiMouseDown(0) : 
                (this.gameObject._engine ? this.gameObject._engine.mouseButton[0] : false);
        } else {
            // World mode: use world coordinates (respects camera)
            // For world-space buttons, we need to compare mouse world position with button world position
            const engine = this.gameObject._engine;
            
            if (typeof mousePosition === 'function') {
                const worldPos = mousePosition();
                mouseX = worldPos.x;
                mouseY = worldPos.y;
            } else if (engine && engine.screenToWorld) {
                // Fallback: Use engine's screenToWorld if mousePosition not available
                const screenPos = window.Input ? window.Input.getMousePosition() : { x: 0, y: 0 };
                const worldPos = engine.screenToWorld(screenPos.x, screenPos.y);
                mouseX = worldPos.x;
                mouseY = worldPos.y;
            } else {
                // Last resort fallback (no camera transform)
                mouseX = engine ? engine.mouseX : 0;
                mouseY = engine ? engine.mouseY : 0;
            }
            
            // Use the gameObject's actual position for world-space buttons
            // The position is set by the scene when the instance is placed
            buttonX = this.gameObject.position ? this.gameObject.position.x : this.gameObject.x;
            buttonY = this.gameObject.position ? this.gameObject.position.y : this.gameObject.y;
            
            // Use regular mouse functions for world-space buttons
            isMouseDown = typeof mouseDown === 'function' ? mouseDown(0) : 
                (engine ? engine.mouseButton[0] : false);
        }
        
        // Calculate button bounds (centered on button position)
        const x = buttonX - (this.width / 2);
        const y = buttonY - (this.height / 2);
        
        // Check if mouse is over button
        const wasHovered = this._isHovered;
        this._isHovered = this.isEnabled && 
            mouseX >= x && mouseX <= x + this.width &&
            mouseY >= y && mouseY <= y + this.height;
        
        // Play hover sound on first hover
        if (this._isHovered && !wasHovered && this.hoverSound) {
            if (typeof audioPlay === 'function') {
                audioPlay(this.hoverSound);
            }
        }
        
        // Handle tooltip
        if (this._isHovered && this.tooltip) {
            this._tooltipTimer += deltaTime;
            if (this._tooltipTimer >= this.tooltipDelay) {
                this._showTooltip = true;
            }
        } else {
            this._tooltipTimer = 0;
            this._showTooltip = false;
        }
        
        // Check for click
        const wasPressed = this._isPressed;
        this._isPressed = this._isHovered && isMouseDown;
        
        // Handle click release (fire on release while still hovering)
        if (wasPressed && !this._isPressed && this._isHovered) {
            this._onClick();
        }
        
        // Update target scale for animation
        if (!this.isEnabled) {
            this._targetScale = 1;
        } else if (this._isPressed) {
            this._targetScale = this.clickScale;
        } else if (this._isHovered) {
            this._targetScale = this.hoverScale;
        } else {
            this._targetScale = 1;
        }
        
        // Animate scale
        const scaleDiff = this._targetScale - this._currentScale;
        this._currentScale += scaleDiff * this.animationSpeed * deltaTime;
    }
    
    _onClick() {
        // Play click sound
        if (this.clickSound) {
            if (typeof audioPlay === 'function') {
                audioPlay(this.clickSound);
            }
        }
        
        // Execute click script if provided
        if (this.clickScript && this.clickScript.trim()) {
            const result = execute(this.clickScript);
            if (result && result.error) {
                console.warn('Button click script error:', result.error);
            }
        }
        
        // Broadcast click event
        if (typeof broadcastMessage === 'function') {
            broadcastMessage(`buttonClick_${this.gameObject.name}`, 0.1);
        }
    }
    
    // ==================== DRAWING ====================
    
    /**
     * Draw in world space (uses gameObject.x/y, affected by camera)
     * Only renders when renderMode is 'world'
     */
    draw(ctx) {
        if (!ctx || !this.gameObject) return;
        if (this.renderMode !== 'world') return;
        
        this._renderButton(ctx, this.gameObject.x, this.gameObject.y);
    }
    
    /**
     * Draw in screen space (uses anchor + guiX/guiY offsets, fixed on screen)
     * Only renders when renderMode is 'gui'
     */
    drawGUI(ctx) {
        if (!ctx || !this.gameObject) return;
        if (this.renderMode !== 'gui') return;
        
        const pos = this._getAnchoredPosition();
        this._renderButton(ctx, pos.x, pos.y);
    }
    
    /**
     * Internal method to render the button at a given position
     */
    _renderButton(ctx, x, y) {
        const scale = this._currentScale;
        const w = this.width * scale;
        const h = this.height * scale;
        
        ctx.save();
        ctx.translate(x, y);
        
        // Get current colors based on state
        let bgColor, txtColor, borderCol;
        if (!this.isEnabled) {
            bgColor = this.disabledBackgroundColor;
            txtColor = this.disabledTextColor;
            borderCol = this.disabledBorderColor;
        } else if (this._isPressed) {
            bgColor = this.pressedBackgroundColor;
            txtColor = this.pressedTextColor;
            borderCol = this.pressedBorderColor;
        } else if (this._isHovered) {
            bgColor = this.hoverBackgroundColor;
            txtColor = this.hoverTextColor;
            borderCol = this.hoverBorderColor;
        } else {
            bgColor = this.backgroundColor;
            txtColor = this.textColor;
            borderCol = this.borderColor;
        }
        
        // Draw shadow
        if (this.showShadow && this.isEnabled) {
            ctx.shadowColor = this.shadowColor;
            ctx.shadowOffsetX = this.shadowOffsetX * scale;
            ctx.shadowOffsetY = this.shadowOffsetY * scale;
            ctx.shadowBlur = this.shadowBlur * scale;
        }
        
        // Draw button background
        ctx.beginPath();
        this._roundRect(ctx, -w/2, -h/2, w, h, this.cornerRadius * scale);
        
        if (this.buttonStyle === 'gradient') {
            const gradient = this._createGradient(ctx, w, h, bgColor);
            ctx.fillStyle = gradient;
        } else if (this.buttonStyle === 'glass') {
            ctx.fillStyle = bgColor;
            ctx.fill();
            // Add glass effect
            ctx.shadowColor = 'transparent';
            const glassGradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
            glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            glassGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
            glassGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
            ctx.fillStyle = glassGradient;
        } else if (this.buttonStyle === 'outline') {
            ctx.fillStyle = 'transparent';
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fill();
        
        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        
        // Draw border
        if (this.borderWidth > 0) {
            ctx.strokeStyle = borderCol;
            ctx.lineWidth = this.borderWidth * scale;
            ctx.stroke();
        }
        
        // Calculate text/icon positioning
        const hasIcon = this.icon && this.icon.trim();
        const iconSize = this.iconSize * scale;
        const spacing = this.iconSpacing * scale;
        const fontSize = this.fontSize * scale;
        
        ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text
        const textMetrics = ctx.measureText(this.text);
        const textWidth = textMetrics.width;
        
        // Draw icon and text based on position
        if (hasIcon) {
            if (this.iconPosition === 'left') {
                const totalWidth = iconSize + spacing + textWidth;
                const startX = -totalWidth / 2;
                // Draw icon
                ctx.font = `${iconSize}px sans-serif`;
                ctx.fillStyle = txtColor;
                ctx.fillText(this.icon, startX + iconSize/2, 0);
                // Draw text
                ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
                ctx.fillText(this.text, startX + iconSize + spacing + textWidth/2, 0);
            } else if (this.iconPosition === 'right') {
                const totalWidth = textWidth + spacing + iconSize;
                const startX = -totalWidth / 2;
                // Draw text
                ctx.fillStyle = txtColor;
                ctx.fillText(this.text, startX + textWidth/2, 0);
                // Draw icon
                ctx.font = `${iconSize}px sans-serif`;
                ctx.fillText(this.icon, startX + textWidth + spacing + iconSize/2, 0);
            } else if (this.iconPosition === 'top') {
                const totalHeight = iconSize + spacing + fontSize;
                const startY = -totalHeight / 2;
                // Draw icon
                ctx.font = `${iconSize}px sans-serif`;
                ctx.fillStyle = txtColor;
                ctx.fillText(this.icon, 0, startY + iconSize/2);
                // Draw text
                ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
                ctx.fillText(this.text, 0, startY + iconSize + spacing + fontSize/2);
            } else if (this.iconPosition === 'bottom') {
                const totalHeight = fontSize + spacing + iconSize;
                const startY = -totalHeight / 2;
                // Draw text
                ctx.fillStyle = txtColor;
                ctx.fillText(this.text, 0, startY + fontSize/2);
                // Draw icon
                ctx.font = `${iconSize}px sans-serif`;
                ctx.fillText(this.icon, 0, startY + fontSize + spacing + iconSize/2);
            }
        } else {
            // Just text
            ctx.fillStyle = txtColor;
            ctx.fillText(this.text, 0, 0);
        }
        
        ctx.restore();
        
        // Draw tooltip if showing
        if (this._showTooltip && this.tooltip) {
            this._drawTooltip(ctx, x, y - h/2 - 10);
        }
    }
    
    _createGradient(ctx, w, h, baseColor) {
        let gradient;
        if (this.gradientDirection === 'vertical') {
            gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
        } else if (this.gradientDirection === 'horizontal') {
            gradient = ctx.createLinearGradient(-w/2, 0, w/2, 0);
        } else {
            gradient = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        }
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, this.gradientEndColor);
        return gradient;
    }
    
    _roundRect(ctx, x, y, width, height, radius) {
        if (radius > 0) {
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + width, y, x + width, y + height, radius);
            ctx.arcTo(x + width, y + height, x, y + height, radius);
            ctx.arcTo(x, y + height, x, y, radius);
            ctx.arcTo(x, y, x + width, y, radius);
        } else {
            ctx.rect(x, y, width, height);
        }
        ctx.closePath();
    }
    
    _drawTooltip(ctx, x, y) {
        ctx.save();
        
        const padding = 8;
        const fontSize = 14;
        ctx.font = `${fontSize}px Arial, sans-serif`;
        const textWidth = ctx.measureText(this.tooltip).width;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = fontSize + padding * 2;
        
        // Tooltip background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        this._roundRect(ctx, x - tooltipWidth/2, y - tooltipHeight, tooltipWidth, tooltipHeight, 4);
        ctx.fill();
        
        // Tooltip text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.tooltip, x, y - tooltipHeight/2);
        
        // Tooltip arrow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 1);
        ctx.lineTo(x + 6, y - 1);
        ctx.lineTo(x, y + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

window.Button = Button;

// Register the module
Module.register('Button', Button);
