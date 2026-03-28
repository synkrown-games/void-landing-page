/**
 * Rigidbody Module
 * Provides physics simulation (velocity, acceleration, gravity)
 * Integrates with BoxCollider/SphereCollider/PolygonCollider for collision detection and response
 * Includes an event system for defining trigger->response pairs via arrayGroup
 */

class Rigidbody extends Module {
    constructor() {
        super();
        
        // Editable properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 0;
        this.drag = 0.98;
        this.angularVelocity = 0;
        this.angularDrag = 0.98;
        this.useGravity = false;
        this.gravityScale = 1.0;
        this.mass = 1.0;
        this.isKinematic = false;
        this.bounciness = 0.0;
        this.friction = 0.1;
        this.maxSpeed = 0;
        this.realisticPhysics = false;
        
        // Collision settings
        this.detectCollisions = true;
        this.collisionRadius = 200;
        this.solidTags = ['solid', 'ground', 'wall'];
        this.triggerTags = ['trigger'];
        this.continuousCollision = false;
        this.useCollisionWorker = false;  // Offload narrowphase to Web Worker
        
        // Collision state
        this.isGrounded = false;
        this.groundNormal = { x: 0, y: -1 };
        this.touchingLeft = false;
        this.touchingRight = false;
        this.touchingCeiling = false;
        this.currentCollisions = [];
        this.lastFrameCollisions = [];
        
        // Physics constants
        this.gravity = 980;
        
        // Collision callbacks
        this.onCollisionEnter = null;
        this.onCollisionStay = null;
        this.onCollisionExit = null;
        this.onTriggerEnter = null;
        this.onTriggerStay = null;
        this.onTriggerExit = null;
        
        // Event system
        this.events = [];
        this._eventTimers = [];
        
        // Worker state
        this._workerRbId = Rigidbody._nextWorkerRbId++;
        this._workerPendingResults = null;
        this._workerNearbyCache = null;  // cached nearby colliders for applying worker results
    }
    
    static _nextWorkerRbId = 1;
    static namespace = 'Physics';
    
    static getIcon() { return '⚙️'; }
    
    static getDescription() {
        return 'Physics simulation with velocity, gravity, forces, and an event system';
    }
    
    getPropertyMetadata() {
        return [
            { type: 'groupStart', label: '🚀 Velocity' },
            { type: 'hint', label: 'Current movement speed in pixels per second' },
            { key: 'velocityX', type: 'number', label: 'Velocity X', default: 0 },
            { key: 'velocityY', type: 'number', label: 'Velocity Y', default: 0 },
            { key: 'acceleration', type: 'number', label: 'Acceleration', default: 0, min: 0 },
            { key: 'drag', type: 'slider', label: 'Drag', default: 0.98, min: 0, max: 1, step: 0.01 },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '🔄 Rotation' },
            { key: 'angularVelocity', type: 'number', label: 'Angular Velocity', default: 0 },
            { key: 'angularDrag', type: 'slider', label: 'Angular Drag', default: 0.98, min: 0, max: 1, step: 0.01 },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '🌍 Gravity' },
            { key: 'useGravity', type: 'boolean', label: 'Use Gravity', default: false },
            { key: 'gravityScale', type: 'number', label: 'Gravity Scale', default: 1.0, step: 0.1, showIf: { useGravity: true } },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '⚖️ Physics Properties' },
            { key: 'mass', type: 'number', label: 'Mass', default: 1.0, min: 0.01, step: 0.1 },
            { key: 'bounciness', type: 'slider', label: 'Bounciness', default: 0, min: 0, max: 1, step: 0.1 },
            { key: 'friction', type: 'slider', label: 'Friction', default: 0.1, min: 0, max: 1, step: 0.05 },
            { key: 'maxSpeed', type: 'number', label: 'Max Speed', default: 0, min: 0, step: 10 },
            { type: 'hint', label: 'Maximum speed in pixels/sec (0 = unlimited)' },
            { key: 'isKinematic', type: 'boolean', label: 'Is Kinematic', default: false },
            { type: 'hint', label: 'Kinematic objects are not affected by forces or collisions' },
            { key: 'realisticPhysics', type: 'boolean', label: 'Realistic Physics', default: false },
            { type: 'hint', label: 'Enables rotation from off-center collisions (boxes tip off edges)' },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '💥 Collision Detection' },
            { key: 'detectCollisions', type: 'boolean', label: 'Detect Collisions', default: true },
            { key: 'collisionRadius', type: 'number', label: 'Check Radius', default: 200, min: 50, showIf: { detectCollisions: true } },
            { key: 'continuousCollision', type: 'boolean', label: 'Continuous (CCD)', default: false, showIf: { detectCollisions: true } },
            { type: 'hint', label: 'CCD prevents fast objects from passing through thin walls' },
            { key: 'useCollisionWorker', type: 'boolean', label: '🧵 Web Worker', default: false, showIf: { detectCollisions: true } },
            { type: 'hint', label: 'Offload collision math to a Web Worker thread (reduces main-thread load for many objects)' },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '🏷️ Collision Tags' },
            { type: 'hint', label: 'Define which tags this rigidbody interacts with' },
            { key: 'solidTags', type: 'array', label: 'Solid Tags', elementType: 'text', defaultValue: 'solid' },
            { key: 'triggerTags', type: 'array', label: 'Trigger Tags', elementType: 'text', defaultValue: 'trigger' },
            { type: 'groupEnd' },
            
            { type: 'groupStart', label: '⚡ Event System' },
            { type: 'hint', label: 'Define trigger→response pairs. Events fire automatically during gameplay.' },
            {
                key: 'events',
                label: '📋 Events',
                type: 'arrayGroup',
                itemLabel: 'Event',
                minItems: 0,
                itemProperties: [
                    { key: 'name', label: 'Name', type: 'text', default: 'New Event' },
                    { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
                    { key: 'trigger', label: '🎯 Trigger', type: 'select', default: 'keyDown', options: {
                        'keyDown': '⌨️ Key Down (held)',
                        'keyPressed': '⌨️ Key Pressed (just pressed)',
                        'keyReleased': '⌨️ Key Released',
                        'mouseDown': '🖱️ Mouse Down',
                        'mousePressed': '🖱️ Mouse Pressed',
                        'mouseReleased': '🖱️ Mouse Released',
                        'tickTimer': '⏱️ Tick Timer',
                        'onStart': '▶️ On Start',
                        'onCollisionEnter': '💥 On Collision Enter',
                        'onCollisionExit': '💨 On Collision Exit',
                        'onTriggerEnter': '🚪 On Trigger Enter',
                        'onTriggerExit': '🚪 On Trigger Exit',
                        'onGrounded': '🦶 On Grounded',
                        'onAirborne': '🕊️ On Airborne',
                        'broadcastReceived': '📡 Broadcast Received',
                        'everyFrame': '🔄 Every Frame',
                        'velocityThreshold': '💨 Velocity Threshold',
                        'gamepadButton': '🎮 Gamepad Button'
                    }},
                    { key: 'triggerKey', label: '⌨️ Key', type: 'key', default: 'Space', showIf: { trigger: ['keyDown', 'keyPressed', 'keyReleased'] } },
                    { key: 'triggerMouseButton', label: '🖱️ Button', type: 'select', default: '0', options: { '0': 'Left', '1': 'Middle', '2': 'Right' }, showIf: { trigger: ['mouseDown', 'mousePressed', 'mouseReleased'] } },
                    { key: 'triggerInterval', label: '⏱️ Interval (s)', type: 'number', default: 1, min: 0.01, step: 0.1, showIf: { trigger: 'tickTimer' } },
                    { key: 'triggerBroadcast', label: '📡 Message', type: 'text', default: '', showIf: { trigger: 'broadcastReceived' } },
                    { key: 'triggerCollisionTag', label: '🏷️ Tag Filter', type: 'text', default: '', showIf: { trigger: ['onCollisionEnter', 'onCollisionExit', 'onTriggerEnter', 'onTriggerExit'] }, hint: 'Leave empty to match any tag' },
                    { key: 'triggerVelocityMin', label: 'Min Speed', type: 'number', default: 100, min: 0, showIf: { trigger: 'velocityThreshold' } },
                    { key: 'triggerGamepadButton', label: '🎮 Button', type: 'select', default: '0', options: { '0': 'A', '1': 'B', '2': 'X', '3': 'Y', '12': 'D-Up', '13': 'D-Down', '14': 'D-Left', '15': 'D-Right' }, showIf: { trigger: 'gamepadButton' } },
                    { key: 'response', label: '⚡ Response', type: 'select', default: 'setVelocity', options: {
                        'setVelocity': '🚀 Set Velocity',
                        'addImpulse': '💥 Add Impulse',
                        'addForce': '🏋️ Add Force',
                        'thrustForward': '🚀 Thrust Forward',
                        'thrustBackward': '🚀 Thrust Backward',
                        'addImpulseForward': '💥 Impulse Forward',
                        'setVelocityForward': '🚀 Set Velocity Forward',
                        'addForceAtAngle': '🏋️ Force At Angle',
                        'rotateLeft': '↩️ Rotate Left',
                        'rotateRight': '↪️ Rotate Right',
                        'setVelocityX': '➡️ Set Velocity X',
                        'setVelocityY': '⬆️ Set Velocity Y',
                        'stop': '🛑 Stop All Movement',
                        'stopX': '🛑 Stop X',
                        'stopY': '🛑 Stop Y',
                        'bounce': '🏀 Bounce',
                        'teleport': '🌀 Teleport',
                        'moveTowards': '🧭 Move Towards Point',
                        'addTorque': '🔄 Add Torque',
                        'setDrag': '💨 Set Drag',
                        'enableGravity': '🌍 Enable Gravity',
                        'disableGravity': '❌ Disable Gravity',
                        'playAudio': '🔊 Play Audio',
                        'spawnPrefab': '🎯 Spawn Prefab',
                        'destroySelf': '💀 Destroy Self',
                        'broadcastMessage': '📡 Broadcast Message',
                        'loadScene': '🎬 Load Scene',
                        'runScript': '📜 Run Script',
                        'cameraShake': '📷 Camera Shake'
                    }},
                    { key: 'responseVelocityX', label: 'Velocity X', type: 'number', default: 0, showIf: { response: ['setVelocity', 'addImpulse', 'addForce'] } },
                    { key: 'responseVelocityY', label: 'Velocity Y', type: 'number', default: -300, showIf: { response: ['setVelocity', 'addImpulse', 'addForce'] } },
                    { key: 'responseForwardForce', label: '🚀 Force', type: 'number', default: 300, showIf: { response: ['thrustForward', 'thrustBackward', 'addImpulseForward', 'setVelocityForward', 'addForceAtAngle'] }, hint: 'Magnitude of force/velocity in the forward direction' },
                    { key: 'responseAngle', label: '🧭 Angle (°)', type: 'number', default: 0, showIf: { response: 'addForceAtAngle' }, hint: 'Angle in degrees (0 = right, 90 = down). Added to object\'s current angle.' },
                    { key: 'responseAngleRelative', label: 'Relative To Object', type: 'boolean', default: true, showIf: { response: 'addForceAtAngle' }, hint: 'If true, angle is added to object angle. If false, angle is absolute.' },
                    { key: 'responseRotateSpeed', label: '🔄 Rotate Speed (°/s)', type: 'number', default: 180, showIf: { response: ['rotateLeft', 'rotateRight'] }, hint: 'Rotation speed in degrees per second' },
                    { key: 'responseValueX', label: 'Value', type: 'number', default: 0, showIf: { response: ['setVelocityX', 'setVelocityY', 'addTorque', 'setDrag', 'cameraShake'] } },
                    { key: 'responseTeleportX', label: 'Teleport X', type: 'number', default: 0, showIf: { response: 'teleport' } },
                    { key: 'responseTeleportY', label: 'Teleport Y', type: 'number', default: 0, showIf: { response: 'teleport' } },
                    { key: 'responseMoveX', label: 'Target X', type: 'number', default: 0, showIf: { response: 'moveTowards' } },
                    { key: 'responseMoveY', label: 'Target Y', type: 'number', default: 0, showIf: { response: 'moveTowards' } },
                    { key: 'responseMoveSpeed', label: 'Speed', type: 'number', default: 100, min: 0, showIf: { response: 'moveTowards' } },
                    { key: 'responseAudio', label: '🔊 Audio', type: 'audio', default: '', showIf: { response: 'playAudio' } },
                    { key: 'responseAudioLoop', label: 'Loop', type: 'boolean', default: false, showIf: { response: 'playAudio' } },
                    { key: 'responsePrefab', label: '🎯 Prefab', type: 'prefab', default: '', showIf: { response: 'spawnPrefab' } },
                    { key: 'responseSpawnOffsetX', label: 'Offset X', type: 'number', default: 0, showIf: { response: 'spawnPrefab' } },
                    { key: 'responseSpawnOffsetY', label: 'Offset Y', type: 'number', default: 0, showIf: { response: 'spawnPrefab' } },
                    { key: 'responseBroadcast', label: '📡 Message', type: 'text', default: '', showIf: { response: 'broadcastMessage' } },
                    { key: 'responseBroadcastDuration', label: 'Duration (s)', type: 'number', default: 1, min: 0, showIf: { response: 'broadcastMessage' } },
                    { key: 'responseScene', label: '🎬 Scene', type: 'scene', default: '', showIf: { response: 'loadScene' } },
                    { key: 'responseScript', label: '📜 Script', type: 'script', default: '', showIf: { response: 'runScript' } },
                    { key: 'responseBounceForce', label: 'Bounce Force', type: 'number', default: -300, showIf: { response: 'bounce' } },
                    
                    // --- CONDITION ---
                    { key: 'conditionType', label: '🔒 Condition', type: 'select', default: 'none', options: {
                        'none':           '— None —',
                        'requireGrounded': '🦶 Require Grounded',
                        'requireAirborne': '🕊️ Require Airborne',
                        'speedAbove':     '💨 Speed Above',
                        'speedBelow':     '💨 Speed Below',
                        'variableCheck':  '📊 Variable Check',
                        'script':         '📜 Script Condition'
                    }},
                    { key: 'conditionSpeedThreshold', label: 'Speed', type: 'number', default: 100, min: 0,
                      showIf: { conditionType: ['speedAbove', 'speedBelow'] } },
                    { key: 'conditionVariable', label: '📊 Variable', type: 'text', default: '',
                      showIf: { conditionType: 'variableCheck' } },
                    { key: 'conditionOperator', label: 'Operator', type: 'select', default: '==',
                      options: { '==': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' },
                      showIf: { conditionType: 'variableCheck' } },
                    { key: 'conditionValue', label: 'Value', type: 'text', default: '',
                      showIf: { conditionType: 'variableCheck' },
                      hint: 'Supports: numbers, "strings", true/false' },
                    { key: 'conditionScript', label: '📜 Condition Script', type: 'script',
                      default: '// Return true to allow response\n// self = this rigidbody, gameObject = this.gameObject\nreturn true;',
                      showIf: { conditionType: 'script' },
                      hint: 'Has access to: self, gameObject' }
                ]
            },
            { type: 'groupEnd' }
        ];
    }
    
    // ==================== LIFECYCLE METHODS ====================
    
    start() {
        this.currentCollisions = [];
        this.lastFrameCollisions = [];
        this.isGrounded = false;
        this.touchingLeft = false;
        this.touchingRight = false;
        this.touchingCeiling = false;
        this._eventTimers = this.events.map(() => 0);
        this._lastGrounded = false;
        this._fireEvents('onStart');
    }
    
    loop(deltaTime) {
        this._deltaTime = deltaTime;
        if (this.isKinematic) {
            this._processFrameEvents(deltaTime);
            return;
        }
        
        if (this.useGravity) {
            this.velocityY += this.gravity * this.gravityScale * deltaTime;
        }
        
        this.velocityX *= this.drag;
        this.velocityY *= this.drag;
        this.angularVelocity *= this.angularDrag;
        
        // Clamp to max speed
        if (this.maxSpeed > 0) {
            const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            if (speed > this.maxSpeed) {
                const scale = this.maxSpeed / speed;
                this.velocityX *= scale;
                this.velocityY *= scale;
            }
        }
        
        if (this.detectCollisions) {
            this.handleCollisions(deltaTime);
        } else {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
        }
        
        this.gameObject.angle += this.angularVelocity * deltaTime;
        
        this._processFrameEvents(deltaTime);
        
        if (this.isGrounded && !this._lastGrounded) {
            this._fireEvents('onGrounded');
        } else if (!this.isGrounded && this._lastGrounded) {
            this._fireEvents('onAirborne');
        }
        this._lastGrounded = this.isGrounded;
    }
    
    // ==================== EVENT SYSTEM ====================
    
    _processFrameEvents(deltaTime) {
        if (!this.events || this.events.length === 0) return;
        
        for (let i = 0; i < this.events.length; i++) {
            const evt = this.events[i];
            if (!evt || !evt.enabled) continue;
            if (!this._checkEventCondition(evt)) continue;
            
            let shouldFire = false;
            
            switch (evt.trigger) {
                case 'keyDown':
                    shouldFire = typeof keyboardDown === 'function' && keyboardDown(evt.triggerKey);
                    break;
                case 'keyPressed':
                    shouldFire = typeof keyboardPressed === 'function' && keyboardPressed(evt.triggerKey);
                    break;
                case 'keyReleased':
                    shouldFire = typeof keyboardReleased === 'function' && keyboardReleased(evt.triggerKey);
                    break;
                case 'mouseDown':
                    shouldFire = typeof mouseDown === 'function' && mouseDown(parseInt(evt.triggerMouseButton || 0));
                    break;
                case 'mousePressed':
                    shouldFire = typeof mousePressed === 'function' && mousePressed(parseInt(evt.triggerMouseButton || 0));
                    break;
                case 'mouseReleased':
                    shouldFire = typeof mouseReleased === 'function' && mouseReleased(parseInt(evt.triggerMouseButton || 0));
                    break;
                case 'tickTimer': {
                    if (!this._eventTimers[i]) this._eventTimers[i] = 0;
                    this._eventTimers[i] += deltaTime;
                    const interval = evt.triggerInterval || 1;
                    if (this._eventTimers[i] >= interval) {
                        this._eventTimers[i] -= interval;
                        shouldFire = true;
                    }
                    break;
                }
                case 'everyFrame':
                    shouldFire = true;
                    break;
                case 'broadcastReceived':
                    shouldFire = typeof isBroadcasting === 'function' && isBroadcasting(evt.triggerBroadcast);
                    break;
                case 'velocityThreshold':
                    shouldFire = this.getSpeed() >= (evt.triggerVelocityMin || 100);
                    break;
                case 'gamepadButton':
                    shouldFire = typeof gamepadButtonDown === 'function' && gamepadButtonDown(parseInt(evt.triggerGamepadButton || 0), 0);
                    break;
                default:
                    break;
            }
            
            if (shouldFire) this._executeResponse(evt);
        }
    }
    
    _fireEvents(triggerType, context) {
        if (!this.events || this.events.length === 0) return;
        
        for (const evt of this.events) {
            if (!evt || !evt.enabled || evt.trigger !== triggerType) continue;
            if (!this._checkEventCondition(evt)) continue;
            
            if (context && evt.triggerCollisionTag) {
                const tag = context.collider ? context.collider.tag : '';
                if (tag !== evt.triggerCollisionTag) continue;
            }
            
            this._executeResponse(evt, context);
        }
    }
    
    /**
     * Check if an event's condition gate is satisfied
     */
    _checkEventCondition(evt) {
        const type = evt.conditionType || 'none';
        
        // Legacy support: if no conditionType but requireGrounded is set
        if (type === 'none' && evt.requireGrounded) return this.isGrounded;
        
        switch (type) {
            case 'none': return true;
            case 'requireGrounded': return this.isGrounded;
            case 'requireAirborne': return !this.isGrounded;
            case 'speedAbove': return this.getSpeed() >= (evt.conditionSpeedThreshold || 100);
            case 'speedBelow': return this.getSpeed() < (evt.conditionSpeedThreshold || 100);
            case 'variableCheck': {
                if (!evt.conditionVariable || typeof getGlobal !== 'function') return false;
                const current = getGlobal(evt.conditionVariable);
                const target = this._parseConditionValue(evt.conditionValue);
                switch (evt.conditionOperator || '==') {
                    case '==':  return current == target;
                    case '!=':  return current != target;
                    case '>':   return current > target;
                    case '<':   return current < target;
                    case '>=':  return current >= target;
                    case '<=':  return current <= target;
                    default:    return true;
                }
            }
            case 'script': {
                if (!evt.conditionScript) return true;
                try {
                    const fn = new Function('self', 'gameObject', evt.conditionScript);
                    return !!fn(this, this.gameObject);
                } catch (e) {
                    return false;
                }
            }
            default: return true;
        }
    }
    
    /**
     * Parse a condition value string into a typed value
     */
    _parseConditionValue(str) {
        if (str === undefined || str === null) return null;
        str = String(str).trim();
        if (str === 'true') return true;
        if (str === 'false') return false;
        if (str === 'null') return null;
        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) return str.slice(1, -1);
        const num = Number(str);
        if (!isNaN(num) && str !== '') return num;
        return str;
    }
    
    _executeResponse(evt, context) {
        try {
            switch (evt.response) {
                case 'setVelocity':
                    this.velocityX = evt.responseVelocityX || 0;
                    this.velocityY = evt.responseVelocityY || 0;
                    break;
                case 'addImpulse':
                    this.addImpulse(evt.responseVelocityX || 0, evt.responseVelocityY || 0);
                    break;
                case 'addForce':
                    this.addForce(evt.responseVelocityX || 0, evt.responseVelocityY || 0);
                    break;
                case 'thrustForward': {
                    const rad = (this.gameObject.angle || 0) * Math.PI / 180;
                    const force = evt.responseForwardForce || 300;
                    this.addForce(Math.cos(rad) * force, Math.sin(rad) * force);
                    break;
                }
                case 'thrustBackward': {
                    const rad = (this.gameObject.angle || 0) * Math.PI / 180;
                    const force = evt.responseForwardForce || 300;
                    this.addForce(-Math.cos(rad) * force, -Math.sin(rad) * force);
                    break;
                }
                case 'addImpulseForward': {
                    const rad = (this.gameObject.angle || 0) * Math.PI / 180;
                    const mag = evt.responseForwardForce || 300;
                    this.addImpulse(Math.cos(rad) * mag, Math.sin(rad) * mag);
                    break;
                }
                case 'setVelocityForward': {
                    const rad = (this.gameObject.angle || 0) * Math.PI / 180;
                    const spd = evt.responseForwardForce || 300;
                    this.velocityX = Math.cos(rad) * spd;
                    this.velocityY = Math.sin(rad) * spd;
                    break;
                }
                case 'addForceAtAngle': {
                    const deg = evt.responseAngle || 0;
                    const baseAngle = evt.responseAngleRelative !== false ? (this.gameObject.angle || 0) : 0;
                    const rad = (baseAngle + deg) * Math.PI / 180;
                    const force = evt.responseForwardForce || 300;
                    this.addForce(Math.cos(rad) * force, Math.sin(rad) * force);
                    break;
                }
                case 'rotateLeft':
                    this.gameObject.angle -= (evt.responseRotateSpeed || 180) * (this._deltaTime || 1/60);
                    break;
                case 'rotateRight':
                    this.gameObject.angle += (evt.responseRotateSpeed || 180) * (this._deltaTime || 1/60);
                    break;
                case 'setVelocityX':
                    this.velocityX = evt.responseValueX || 0;
                    break;
                case 'setVelocityY':
                    this.velocityY = evt.responseValueX || 0;
                    break;
                case 'stop':
                    this.stop();
                    break;
                case 'stopX':
                    this.velocityX = 0;
                    break;
                case 'stopY':
                    this.velocityY = 0;
                    break;
                case 'bounce':
                    this.velocityY = evt.responseBounceForce || -300;
                    break;
                case 'teleport':
                    this.gameObject.position.x = evt.responseTeleportX || 0;
                    this.gameObject.position.y = evt.responseTeleportY || 0;
                    break;
                case 'moveTowards': {
                    const tx = evt.responseMoveX || 0;
                    const ty = evt.responseMoveY || 0;
                    const speed = evt.responseMoveSpeed || 100;
                    const dx = tx - this.gameObject.position.x;
                    const dy = ty - this.gameObject.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 1) {
                        this.velocityX = (dx / dist) * speed;
                        this.velocityY = (dy / dist) * speed;
                    }
                    break;
                }
                case 'addTorque':
                    this.addTorque(evt.responseValueX || 0);
                    break;
                case 'setDrag':
                    this.drag = Math.max(0, Math.min(1, evt.responseValueX || 0.98));
                    break;
                case 'enableGravity':
                    this.useGravity = true;
                    break;
                case 'disableGravity':
                    this.useGravity = false;
                    break;
                case 'playAudio':
                    if (evt.responseAudio && typeof audioPlay === 'function')
                        audioPlay(evt.responseAudio, evt.responseAudioLoop || false);
                    break;
                case 'spawnPrefab':
                    if (evt.responsePrefab && typeof instanceCreate === 'function') {
                        const sx = this.gameObject.position.x + (evt.responseSpawnOffsetX || 0);
                        const sy = this.gameObject.position.y + (evt.responseSpawnOffsetY || 0);
                        instanceCreate(evt.responsePrefab, sx, sy);
                    }
                    break;
                case 'destroySelf':
                    if (typeof instanceDestroy === 'function')
                        instanceDestroy(this.gameObject);
                    break;
                case 'broadcastMessage':
                    if (evt.responseBroadcast && typeof broadcastMessage === 'function')
                        broadcastMessage(evt.responseBroadcast, evt.responseBroadcastDuration || 1);
                    break;
                case 'loadScene':
                    if (evt.responseScene && typeof sceneLoad === 'function')
                        sceneLoad(evt.responseScene);
                    break;
                case 'runScript':
                    if (evt.responseScript) {
                        try {
                            const scriptFn = new Function('self', 'rb', 'gameObject', 'context', evt.responseScript);
                            scriptFn(this, this, this.gameObject, context);
                        } catch (e) {
                            console.warn('[Rigidbody Event] Script error in "' + evt.name + '":', e);
                        }
                    }
                    break;
                case 'cameraShake':
                    if (typeof cameraShake === 'function')
                        cameraShake(evt.responseValueX || 5);
                    break;
            }
        } catch (e) {
            console.warn('[Rigidbody Event] Error executing "' + evt.name + '":', e);
        }
    }
    
    // ==================== COLLISION DETECTION ====================
    
    getCollider() {
        if (this.gameObject.getModule) {
            return this.gameObject.getModule('BoxCollider') || 
                   this.gameObject.getModule('SphereCollider') || 
                   this.gameObject.getModule('PolygonCollider');
        }
        return null;
    }
    
    getNearbyObjects(radius) {
        const searchRadius = radius || this.collisionRadius;
        const pos = this.gameObject.position;
        
        if (typeof instancesInRadius === 'function') {
            return instancesInRadius(pos.x, pos.y, searchRadius);
        }
        
        const engine = window.gameEngine;
        if (!engine) return [];
        
        return engine.instances.filter(inst => {
            if (inst === this.gameObject) return false;
            const dx = inst.position.x - pos.x;
            const dy = inst.position.y - pos.y;
            return (dx * dx + dy * dy) <= searchRadius * searchRadius;
        });
    }
    
    getNearbyColliders() {
        const nearbyObjects = this.getNearbyObjects();
        const result = [];
        
        for (const obj of nearbyObjects) {
            if (obj === this.gameObject) continue;
            
            // Use cached modules if available, otherwise fetch once and cache
            let collider = obj._cachedCollider;
            if (collider === undefined) {
                if (obj.getModule) {
                    collider = obj.getModule('BoxCollider') || 
                               obj.getModule('SphereCollider') ||
                               obj.getModule('PolygonCollider');
                }
                obj._cachedCollider = collider || null;
            }
            
            if (!collider) continue;
            
            // Skip disabled colliders
            if (collider.enabled === false) continue;
            
            const tag = collider.tag || '';
            const isTrigger = collider.isTrigger || this.triggerTags.includes(tag);
            // Treat non-trigger colliders as solid if tag matches solidTags, or if tag is empty/unset (default solid)
            const isSolid = !isTrigger && (this.solidTags.includes(tag) || !tag);
            
            // Cache rigidbody and vehicleController for later use in collision resolution
            let rigidbody = obj._cachedRigidbody;
            if (rigidbody === undefined) {
                rigidbody = obj.getModule ? obj.getModule('Rigidbody') : null;
                obj._cachedRigidbody = rigidbody || null;
            }
            
            let vehicleController = obj._cachedVehicleController;
            if (vehicleController === undefined) {
                vehicleController = obj.getModule ? obj.getModule('VehicleController') : null;
                obj._cachedVehicleController = vehicleController || null;
            }
            
            result.push({ object: obj, collider, isTrigger, isSolid, rigidbody, vehicleController });
        }
        
        return result;
    }
    
    handleCollisions(deltaTime) {
        const myCollider = this.getCollider();
        if (!myCollider) {
            this.gameObject.position.x += this.velocityX * deltaTime;
            this.gameObject.position.y += this.velocityY * deltaTime;
            return;
        }
        
        // Store velocity before collision resolution for impact calculation
        this._preCollisionVelX = this.velocityX;
        this._preCollisionVelY = this.velocityY;
        
        this.lastFrameCollisions = [...this.currentCollisions];
        this.currentCollisions = [];
        this.isGrounded = false;
        this.touchingLeft = false;
        this.touchingRight = false;
        this.touchingCeiling = false;
        
        const deltaX = this.velocityX * deltaTime;
        const deltaY = this.velocityY * deltaTime;
        const nearbyColliders = this.getNearbyColliders();
        
        // Web Worker path: offload narrowphase to worker thread
        if (this.useCollisionWorker && typeof CollisionWorkerManager !== 'undefined' && CollisionWorkerManager.isAvailable()) {
            this._handleCollisionsWithWorker(deltaX, deltaY, myCollider, nearbyColliders);
            this.processCollisionCallbacks();
            return;
        }
        
        if (this.continuousCollision) {
            this.handleContinuousCollision(deltaX, deltaY, myCollider, nearbyColliders);
        } else {
            this.handleDiscreteCollision(deltaX, deltaY, myCollider, nearbyColliders);
        }
        
        this.processCollisionCallbacks();
    }
    
    // ==================== WEB WORKER COLLISION PATH ====================
    
    /**
     * Worker-based collision using double-buffer pattern:
     * 1. Apply LAST frame's worker results (1-frame latency for narrowphase)
     * 2. Move position by delta
     * 3. Serialize current colliders and send to worker for NEXT frame
     * 
     * This means the narrowphase math runs on the worker thread in parallel
     * with the next frame's game logic, while we use the previous frame's
     * collision results (which are nearly identical for smooth movement).
     */
    _handleCollisionsWithWorker(deltaX, deltaY, myCollider, nearbyColliders) {
        // Step 1: Apply previous frame's worker results
        const lastResults = CollisionWorkerManager.getLastResults(this._workerRbId);
        const lastNearby = this._workerNearbyCache;
        
        // Move position
        this.gameObject.position.x += deltaX;
        this.gameObject.position.y += deltaY;
        
        if (lastResults && lastNearby && lastResults.length > 0) {
            // Apply each collision result from last frame
            for (const result of lastResults) {
                // Map result index back to current nearby colliders by object identity
                const cachedEntry = lastNearby[result.index];
                if (!cachedEntry) continue;
                
                // Find the matching object in this frame's nearby colliders
                const match = nearbyColliders.find(nc => nc.object === cachedEntry.object);
                if (!match) continue; // Object no longer nearby
                
                const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } = match;
                
                if (result.isTrigger) {
                    if (!this.currentCollisions.find(c => c.object === object)) {
                        this.currentCollisions.push({ object, collider, type: 'trigger' });
                    }
                    continue;
                }
                
                if (result.isSolid && result.info) {
                    const info = {
                        normal: { x: result.info.nx, y: result.info.ny },
                        depth: result.info.depth,
                        point: result.info.hasContactPoint ? { x: result.info.px, y: result.info.py } : null
                    };
                    
                    // Calculate impact data
                    const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                    
                    if (!this.currentCollisions.find(c => c.object === object)) {
                        this.currentCollisions.push({
                            object, collider, type: 'solid',
                            rigidbody, vehicleController,
                            ...impactData
                        });
                    }
                    
                    // Apply collision resolution (same as main-thread path)
                    this.resolveCollision(info, collider, rigidbody);
                }
            }
        } else if (!lastResults) {
            // No worker results yet (first frame) - fall back to main-thread detection
            for (const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } of nearbyColliders) {
                if (!this.collidersOverlap(myCollider, collider)) continue;
                if (isTrigger) {
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'trigger' });
                    continue;
                }
                if (isSolid) {
                    const info = this.getCollisionInfo(myCollider, collider);
                    const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'solid', rigidbody, vehicleController, ...impactData });
                    if (info) this.resolveCollision(info, collider, rigidbody);
                }
            }
        }
        
        // Step 2: Serialize current state and send to worker for NEXT frame
        this._workerNearbyCache = nearbyColliders;
        
        const myColData = CollisionWorkerManager.serializeCollider(myCollider);
        if (!myColData) return;
        
        const nearbyData = [];
        for (let i = 0; i < nearbyColliders.length; i++) {
            const nc = nearbyColliders[i];
            const colData = CollisionWorkerManager.serializeCollider(nc.collider, i, nc.isSolid, nc.isTrigger);
            if (colData) nearbyData.push(colData);
        }
        
        CollisionWorkerManager.requestCollisionsSync(this._workerRbId, myColData, nearbyData);
    }
    
    handleDiscreteCollision(deltaX, deltaY, myCollider, nearbyColliders) {
        // Unified pass: required for realistic physics AND polygon colliders.
        // Polygon colliders produce diagonal SAT normals that break the split H/V approach.
        const isPoly = myCollider && myCollider.constructor && myCollider.constructor.name === 'PolygonCollider';
        
        // Also check if ANY nearby solid collider is a polygon - need unified pass for those too
        let hasPolygonCollision = isPoly;
        if (!hasPolygonCollision && !this.realisticPhysics) {
            for (const { collider, isSolid } of nearbyColliders) {
                if (isSolid && collider && collider.constructor && collider.constructor.name === 'PolygonCollider') {
                    hasPolygonCollision = true;
                    break;
                }
            }
        }
        
        if (this.realisticPhysics || hasPolygonCollision) {
            this.gameObject.position.x += deltaX;
            this.gameObject.position.y += deltaY;
            for (const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } of nearbyColliders) {
                if (!this.collidersOverlap(myCollider, collider)) continue;
                if (isTrigger) {
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'trigger' });
                    continue;
                }
                if (isSolid) {
                    // Get collision info first (for contact point and normal)
                    const info = this.getCollisionInfo(myCollider, collider);
                    
                    // Calculate impact data for this collision (pass cached modules)
                    const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                    
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ 
                            object, 
                            collider, 
                            type: 'solid',
                            rigidbody,
                            vehicleController,
                            ...impactData
                        });
                    
                    // SYMMETRIC COLLISION: Each body handles its OWN response.
                    // This fixes timing issues where one body's loop runs before the other.
                    // Both bodies will independently apply their share of position/velocity response.
                    if (info) this.resolveCollision(info, collider, rigidbody);
                }
            }
            return;
        }
        if (deltaX !== 0) {
            this.gameObject.position.x += deltaX;
            for (const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } of nearbyColliders) {
                if (!this.collidersOverlap(myCollider, collider)) continue;
                if (isTrigger) {
                    this.currentCollisions.push({ object, collider, type: 'trigger' });
                    continue;
                }
                if (isSolid) {
                    const info = this.getCollisionInfo(myCollider, collider);
                    const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                    this.currentCollisions.push({ object, collider, type: 'solid', rigidbody, vehicleController, ...impactData });
                    this.resolveHorizontalCollision(myCollider, collider, deltaX);
                }
            }
        }
        
        if (deltaY !== 0) {
            this.gameObject.position.y += deltaY;
            for (const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } of nearbyColliders) {
                if (!this.collidersOverlap(myCollider, collider)) continue;
                if (isTrigger) {
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'trigger' });
                    continue;
                }
                if (isSolid) {
                    if (!this.currentCollisions.find(c => c.object === object)) {
                        const info = this.getCollisionInfo(myCollider, collider);
                        const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                        this.currentCollisions.push({ object, collider, type: 'solid', rigidbody, vehicleController, ...impactData });
                    }
                    this.resolveVerticalCollision(myCollider, collider, deltaY);
                }
            }
        }
    }
    
    handleContinuousCollision(deltaX, deltaY, myCollider, nearbyColliders) {
        const steps = Math.max(1, Math.ceil(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 2));
        const stepX = deltaX / steps;
        const stepY = deltaY / steps;
        
        for (let i = 0; i < steps; i++) {
            this.gameObject.position.x += stepX;
            this.gameObject.position.y += stepY;
            
            for (const { object, collider, isTrigger, isSolid, rigidbody, vehicleController } of nearbyColliders) {
                if (!this.collidersOverlap(myCollider, collider)) continue;
                if (isTrigger) {
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'trigger' });
                    continue;
                }
                if (isSolid) {
                    const info = this.getCollisionInfo(myCollider, collider);
                    
                    // Calculate impact data for collision record (use cached modules)
                    const impactData = this._calculateImpactData(object, collider, info, rigidbody, vehicleController);
                    
                    if (!this.currentCollisions.find(c => c.object === object))
                        this.currentCollisions.push({ object, collider, type: 'solid', rigidbody, vehicleController, ...impactData });
                    
                    // SYMMETRIC COLLISION: Each body handles its OWN response.
                    // This fixes timing issues where one body's loop runs before the other.
                    
                    if (info) this.resolveCollision(info, collider, rigidbody);
                }
            }
        }
    }
    
    collidersOverlap(collider1, collider2) {
        if (collider1.overlaps) return collider1.overlaps(collider2);
        return false;
    }
    
    getCollisionInfo(myCollider, otherCollider) {
        const isBox = (c) => c && c.constructor && c.constructor.name === 'BoxCollider';
        const isSphere = (c) => c && c.constructor && c.constructor.name === 'SphereCollider';
        const isPoly = (c) => c && c.constructor && c.constructor.name === 'PolygonCollider';
        
        if (isBox(myCollider) && isBox(otherCollider)) {
            return myCollider.getBoxCollisionInfo ? myCollider.getBoxCollisionInfo(otherCollider) : this._getBoxBoxCollisionInfo(myCollider, otherCollider);
        }
        if (isBox(myCollider) && isSphere(otherCollider)) {
            const info = myCollider.getSphereCollisionInfo ? myCollider.getSphereCollisionInfo(otherCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isSphere(myCollider) && isBox(otherCollider)) {
            return myCollider.getBoxCollisionInfo ? myCollider.getBoxCollisionInfo(otherCollider) : null;
        }
        if (isSphere(myCollider) && isSphere(otherCollider)) {
            return myCollider.getSphereCollisionInfo ? myCollider.getSphereCollisionInfo(otherCollider) : null;
        }
        if (isBox(myCollider) && isPoly(otherCollider)) {
            if (myCollider.isAxisAligned && !myCollider.isAxisAligned()) {
                const obbCorners = myCollider.getWorldPoints();
                const obbAxes = myCollider.getAxes();
                const info = otherCollider.getOBBCollisionInfo ? otherCollider.getOBBCollisionInfo(obbCorners, obbAxes) : null;
                if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
                return info;
            }
            // Use consistent SAT implementation (same quality as _getPolygonBoxCollisionInfo)
            return this._getBoxPolygonCollisionInfo(myCollider, otherCollider);
        }
        if (isPoly(myCollider) && isBox(otherCollider)) {
            if (otherCollider.isAxisAligned && !otherCollider.isAxisAligned()) {
                const obbCorners = otherCollider.getWorldPoints();
                const obbAxes = otherCollider.getAxes();
                // getOBBCollisionInfo returns normal pointing toward OBB (wall)
                // We need it pointing away from OBB (toward this body), so flip it
                const info = myCollider.getOBBCollisionInfo ? myCollider.getOBBCollisionInfo(obbCorners, obbAxes) : null;
                if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
                return info;
            }
            return this._getPolygonBoxCollisionInfo(myCollider, otherCollider);
        }
        if (isSphere(myCollider) && isPoly(otherCollider)) {
            // SphereCollider.getPolygonCollisionInfo returns normal pointing toward polygon
            // We need it pointing away from polygon (toward this body), so flip it
            const info = myCollider.getPolygonCollisionInfo ? myCollider.getPolygonCollisionInfo(otherCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isPoly(myCollider) && isSphere(otherCollider)) {
            const info = otherCollider.getPolygonCollisionInfo ? otherCollider.getPolygonCollisionInfo(myCollider) : null;
            if (info) { info.normal.x = -info.normal.x; info.normal.y = -info.normal.y; }
            return info;
        }
        if (isPoly(myCollider) && isPoly(otherCollider)) {
            return this._getPolygonPolygonCollisionInfo(myCollider, otherCollider);
        }
        return null;
    }
    
    _getBoxBoxCollisionInfo(box1, box2) {
        const bounds1 = box1.getBounds();
        const bounds2 = box2.getBounds();
        const overlapX = Math.min(bounds1.right, bounds2.right) - Math.max(bounds1.left, bounds2.left);
        const overlapY = Math.min(bounds1.bottom, bounds2.bottom) - Math.max(bounds1.top, bounds2.top);
        if (overlapX <= 0 || overlapY <= 0) return null;
        let normal, depth;
        if (overlapX < overlapY) {
            depth = overlapX;
            normal = { x: bounds1.centerX < bounds2.centerX ? -1 : 1, y: 0 };
        } else {
            depth = overlapY;
            normal = { x: 0, y: bounds1.centerY < bounds2.centerY ? -1 : 1 };
        }
        return { normal, depth };
    }
    
    _getBoxPolygonCollisionInfo(box, polygon) {
        const polyPoints = polygon.getWorldPoints();
        const polyAxes = polygon.getAxes();
        let boxPoints, boxAxes;
        if (box.getWorldPoints && box.getAxes) {
            boxPoints = box.getWorldPoints();
            boxAxes = box.getAxes();
        } else {
            const bounds = box.getBounds();
            boxPoints = [
                { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
                { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
            ];
            boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        }
        const allAxes = [...polyAxes, ...boxAxes];
        let minOverlap = Infinity, minAxis = null;
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;
        let boxCx = 0, boxCy = 0;
        for (const p of boxPoints) { boxCx += p.x; boxCy += p.y; }
        boxCx /= boxPoints.length; boxCy /= boxPoints.length;
        for (const axis of allAxes) {
            const proj1 = polygon.projectOntoAxis(axis);
            let pMin = Infinity, pMax = -Infinity;
            for (const p of boxPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
            }
            const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                // Normal points toward box (this body) = away from polygon
                const dirX = polyCx - boxCx, dirY = polyCy - boxCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Contact point: find polygon vertex that is actually penetrating the box
        // Search in -minAxis direction (toward the box) for the deepest penetrating point
        // We want the polygon point closest to (and preferably inside) the box
        let contactPoint = null;
        let bestScore = -Infinity;
        for (const pp of polyPoints) {
            // Score = projection in -normal direction (toward box center)
            // Higher score = deeper into box along collision normal
            const score = -(pp.x * minAxis.x + pp.y * minAxis.y);
            if (score > bestScore) {
                bestScore = score;
                contactPoint = { x: pp.x, y: pp.y };
            }
        }
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    _getPolygonBoxCollisionInfo(polygon, box) {
        const polyPoints = polygon.getWorldPoints();
        const polyAxes = polygon.getAxes();
        let boxPoints, boxAxes;
        if (box.getWorldPoints && box.getAxes) {
            boxPoints = box.getWorldPoints();
            boxAxes = box.getAxes();
        } else {
            const bounds = box.getBounds();
            boxPoints = [
                { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
                { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
            ];
            boxAxes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
        }
        const allAxes = [...polyAxes, ...boxAxes];
        let minOverlap = Infinity, minAxis = null;
        let polyCx = 0, polyCy = 0;
        for (const p of polyPoints) { polyCx += p.x; polyCy += p.y; }
        polyCx /= polyPoints.length; polyCy /= polyPoints.length;
        let boxCx = 0, boxCy = 0;
        for (const p of boxPoints) { boxCx += p.x; boxCy += p.y; }
        boxCx /= boxPoints.length; boxCy /= boxPoints.length;
        for (const axis of allAxes) {
            const proj1 = polygon.projectOntoAxis(axis);
            let pMin = Infinity, pMax = -Infinity;
            for (const p of boxPoints) {
                const proj = p.x * axis.x + p.y * axis.y;
                pMin = Math.min(pMin, proj); pMax = Math.max(pMax, proj);
            }
            const overlap = Math.min(proj1.max, pMax) - Math.max(proj1.min, pMin);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                // Normal points toward polygon (this body) = away from box
                const dirX = boxCx - polyCx, dirY = boxCy - polyCy;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Contact point: find box vertex that is actually penetrating the polygon
        // Search in -minAxis direction (toward polygon) for the deepest penetrating point
        let contactPoint = null;
        let bestScore = -Infinity;
        for (const bp of boxPoints) {
            // Score = projection in -normal direction (toward polygon center)
            // Higher score = deeper into polygon along collision normal
            const score = -(bp.x * minAxis.x + bp.y * minAxis.y);
            if (score > bestScore) {
                bestScore = score;
                contactPoint = { x: bp.x, y: bp.y };
            }
        }
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    _getPolygonPolygonCollisionInfo(poly1, poly2) {
        const points1 = poly1.getWorldPoints();
        const points2 = poly2.getWorldPoints();
        const allAxes = [...poly1.getAxes(), ...poly2.getAxes()];
        let minOverlap = Infinity, minAxis = null;
        let c1x = 0, c1y = 0;
        for (const p of points1) { c1x += p.x; c1y += p.y; }
        c1x /= points1.length; c1y /= points1.length;
        let c2x = 0, c2y = 0;
        for (const p of points2) { c2x += p.x; c2y += p.y; }
        c2x /= points2.length; c2y /= points2.length;
        for (const axis of allAxes) {
            const proj1 = poly1.projectOntoAxis(axis);
            const proj2 = poly2.projectOntoAxis(axis);
            const overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if (overlap <= 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                const dirX = c2x - c1x, dirY = c2y - c1y;
                const dot = dirX * axis.x + dirY * axis.y;
                minAxis = { x: dot >= 0 ? -axis.x : axis.x, y: dot >= 0 ? -axis.y : axis.y };
            }
        }
        // Contact point: check BOTH polygons' vertices for actual penetration.
        // A vertex-to-edge collision can come from either side.
        const pointInConvexPoly = (px, py, polyPts) => {
            let sign = 0;
            for (let i = 0; i < polyPts.length; i++) {
                const p1 = polyPts[i];
                const p2 = polyPts[(i + 1) % polyPts.length];
                const cross = (p2.x - p1.x) * (py - p1.y) - (p2.y - p1.y) * (px - p1.x);
                if (cross === 0) continue;
                if (sign === 0) sign = cross > 0 ? 1 : -1;
                else if ((cross > 0 ? 1 : -1) !== sign) return false;
            }
            return true;
        };
        
        let contactPoint = null;
        let bestInsideScore = -Infinity;
        
        // Check poly1 vertices inside poly2 (our corner poking into them)
        for (const p of points1) {
            if (pointInConvexPoly(p.x, p.y, points2)) {
                const score = -(p.x * minAxis.x + p.y * minAxis.y);
                if (score > bestInsideScore) {
                    bestInsideScore = score;
                    contactPoint = { x: p.x, y: p.y };
                }
            }
        }
        
        // Check poly2 vertices inside poly1 (their corner poking into us)
        for (const p of points2) {
            if (pointInConvexPoly(p.x, p.y, points1)) {
                const score = -(p.x * minAxis.x + p.y * minAxis.y);
                if (score > bestInsideScore) {
                    bestInsideScore = score;
                    contactPoint = { x: p.x, y: p.y };
                }
            }
        }
        
        // Fallback: if no vertex is inside either polygon (edge-to-edge), use support point
        if (!contactPoint) {
            let maxPen = -Infinity;
            for (const p of points2) {
                const pen = p.x * minAxis.x + p.y * minAxis.y;
                if (pen > maxPen) {
                    maxPen = pen;
                    contactPoint = { x: p.x, y: p.y };
                }
            }
        }
        
        return { normal: minAxis, depth: minOverlap, point: contactPoint };
    }
    
    resolveHorizontalCollision(myCollider, otherCollider, deltaX) {
        const impactSpeed = Math.abs(this.velocityX);
        const info = this.getCollisionInfo(myCollider, otherCollider);
        let nx, ny;
        if (info) {
            nx = info.normal.x; ny = info.normal.y;
            this._applyCollisionTorque(otherCollider, nx, ny, impactSpeed, info.point || null);
            this.gameObject.position.x += nx * info.depth;
            if (deltaX > 0) this.touchingRight = true;
            else this.touchingLeft = true;
        } else {
            nx = deltaX > 0 ? -1 : 1; ny = 0;
            this._applyCollisionTorque(otherCollider, nx, ny, impactSpeed, null);
            const myBounds = myCollider.getBounds();
            const otherBounds = otherCollider.getBounds();
            if (deltaX > 0) {
                this.gameObject.position.x = otherBounds.left - myBounds.width / 2 - (myCollider.offsetX || 0);
                this.touchingRight = true;
            } else {
                this.gameObject.position.x = otherBounds.right + myBounds.width / 2 - (myCollider.offsetX || 0);
                this.touchingLeft = true;
            }
        }
        if (!this._applyTwoBodyResponse(otherCollider, nx, ny, info ? info.point : null)) {
            this.velocityX = -this.velocityX * this.bounciness;
        }
    }
    
    resolveVerticalCollision(myCollider, otherCollider, deltaY) {
        const impactSpeed = Math.abs(this.velocityY);
        const info = this.getCollisionInfo(myCollider, otherCollider);
        let nx, ny;
        if (info) {
            nx = info.normal.x; ny = info.normal.y;
            this._applyCollisionTorque(otherCollider, nx, ny, impactSpeed, info.point || null);
            this.gameObject.position.y += ny * info.depth;
            if (deltaY > 0) {
                this.isGrounded = true;
                this.groundNormal = { x: nx, y: ny };
            } else {
                this.touchingCeiling = true;
            }
        } else {
            nx = 0; ny = deltaY > 0 ? -1 : 1;
            this._applyCollisionTorque(otherCollider, nx, ny, impactSpeed, null);
            const myBounds = myCollider.getBounds();
            const otherBounds = otherCollider.getBounds();
            if (deltaY > 0) {
                this.gameObject.position.y = otherBounds.top - myBounds.height / 2 - (myCollider.offsetY || 0);
                this.isGrounded = true;
                this.groundNormal = { x: 0, y: -1 };
            } else {
                this.gameObject.position.y = otherBounds.bottom + myBounds.height / 2 - (myCollider.offsetY || 0);
                this.touchingCeiling = true;
            }
        }
        if (!this._applyTwoBodyResponse(otherCollider, nx, ny, info ? info.point : null)) {
            this.velocityY = -this.velocityY * this.bounciness;
        }
        if (this.isGrounded) this.velocityX *= (1 - this.friction);
    }
    
    resolveCollision(info, otherCollider, cachedOtherRb) {
        const { normal, depth } = info;
        const contactPoint = info.point || null;
        const vn = this.velocityX * normal.x + this.velocityY * normal.y;
        
        if (vn < 0) {
            this._applyCollisionTorque(otherCollider, normal.x, normal.y, -vn, contactPoint);
        }
        
        // Clamp separation to prevent tunneling through to other side
        const maxSeparation = 64;
        const clampedDepth = Math.min(depth, maxSeparation);
        
        // Position correction - SYMMETRIC: each body only moves ITSELF
        const otherObj = otherCollider.gameObject;
        let otherRb = null;
        let otherMC2D = null;
        if (this.realisticPhysics && otherObj) {
            // Use cached rigidbody if provided, otherwise fetch (and cache for future)
            if (cachedOtherRb !== undefined) {
                otherRb = cachedOtherRb;
            } else if (otherObj._cachedRigidbody !== undefined) {
                otherRb = otherObj._cachedRigidbody;
            } else if (otherObj.getModule) {
                otherRb = otherObj.getModule('Rigidbody');
                otherObj._cachedRigidbody = otherRb || null;
            }
            if (otherRb && otherRb.isKinematic) otherRb = null;
            
            // Check if other has MovementController2D - use cache
            if (otherObj._cachedMC2D !== undefined) {
                otherMC2D = otherObj._cachedMC2D;
            } else if (otherObj.getModule) {
                otherMC2D = otherObj.getModule('MovementController2D');
                otherObj._cachedMC2D = otherMC2D || null;
            }
        }
        
        if (otherRb) {
            // SYMMETRIC: Each body moves itself by its proportional share.
            // ratio = how much THIS body should move (inverse of mass ratio)
            // Heavier objects move less, lighter objects move more.
            const totalMass = this.mass + otherRb.mass;
            const myRatio = otherRb.mass / totalMass;  // lighter self = move more
            const buffer = 0.25;
            
            // Only move ourselves - the other body will handle its own share
            this.gameObject.position.x += normal.x * (clampedDepth + buffer) * myRatio;
            this.gameObject.position.y += normal.y * (clampedDepth + buffer) * myRatio;
        } else if (otherMC2D) {
            // Other has MC2D (handles its own collision) but no dynamic rigidbody
            // We move ourselves fully since they're handling their own position
            this.gameObject.position.x += normal.x * (clampedDepth + 0.5);
            this.gameObject.position.y += normal.y * (clampedDepth + 0.5);
        } else {
            // Static object - we move ourselves fully
            this.gameObject.position.x += normal.x * (clampedDepth + 0.5);
            this.gameObject.position.y += normal.y * (clampedDepth + 0.5);
        }
        
        // Surface state detection
        if (normal.y < -0.5) { this.isGrounded = true; this.groundNormal = normal; }
        else if (normal.y > 0.5) this.touchingCeiling = true;
        if (normal.x < -0.5) this.touchingRight = true;
        if (normal.x > 0.5) this.touchingLeft = true;
        
        if (vn < 0) {
            // Two-body impulse exchange if other has dynamic rigidbody
            if (otherRb) {
                this._applyTwoBodyResponse(otherCollider, normal.x, normal.y, contactPoint);
            } else if (this.realisticPhysics) {
                // Realistic single-body vs static: velocity-proportional response
                // Compute the total speed along collision normal (how hard we're hitting)
                const impactSpeed = -vn; // positive value = how fast we're approaching
                const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                
                // Decompose velocity into normal and tangential components
                const vnX = vn * normal.x;
                const vnY = vn * normal.y;
                const vtX = this.velocityX - vnX;
                const vtY = this.velocityY - vnY;
                
                // Higher impact speed = stronger bounce response (energy-proportional)
                // Scale bounciness by impact ratio: fast collisions bounce harder
                const speedFactor = Math.min(impactSpeed / Math.max(speed, 1), 1);
                const effectiveBounce = this.bounciness + (1 - this.bounciness) * speedFactor * 0.3;
                
                // Friction reduces tangential (sliding) velocity
                // More force into the surface = more friction applied
                let ftX = vtX, ftY = vtY;
                const vtLen = Math.sqrt(vtX * vtX + vtY * vtY);
                if (vtLen > 0.1) {
                    // Coulomb-style: friction proportional to normal force (impact speed)
                    const frictionImpulse = impactSpeed * this.friction;
                    const reduction = Math.min(frictionImpulse / vtLen, 1);
                    ftX *= (1 - reduction);
                    ftY *= (1 - reduction);
                }
                
                // Reflected normal + friction-reduced tangent
                this.velocityX = ftX - effectiveBounce * vnX;
                this.velocityY = ftY - effectiveBounce * vnY;
                
                // Apply ground friction damping when grounded (realistic mode)
                if (this.isGrounded) {
                    // Stronger friction when pressing into ground
                    const groundPressure = Math.max(-vn, 0);
                    const groundFriction = Math.min(this.friction * (1 + groundPressure * 0.002), 0.99);
                    this.velocityX *= (1 - groundFriction);
                }
            } else {
                // Simple reflection (non-realistic fallback)
                this.velocityX -= (1 + this.bounciness) * vn * normal.x;
                this.velocityY -= (1 + this.bounciness) * vn * normal.y;
            }
        }
        
        if (this.isGrounded && !this.realisticPhysics) this.velocityX *= (1 - this.friction);
    }
    
    processCollisionCallbacks() {
        for (const collision of this.currentCollisions) {
            const wasColliding = this.lastFrameCollisions.find(c => c.object === collision.object);
            if (!wasColliding) {
                if (collision.type === 'trigger') {
                    // Pass full collision data as third parameter for backwards compatibility
                    if (this.onTriggerEnter) this.onTriggerEnter(collision.object, collision.collider, collision);
                    this._fireEvents('onTriggerEnter', collision);
                } else {
                    // Pass full collision data as third parameter for backwards compatibility
                    if (this.onCollisionEnter) this.onCollisionEnter(collision.object, collision.collider, collision);
                    this._fireEvents('onCollisionEnter', collision);
                }
            } else {
                if (collision.type === 'trigger') {
                    if (this.onTriggerStay) this.onTriggerStay(collision.object, collision.collider, collision);
                } else {
                    if (this.onCollisionStay) this.onCollisionStay(collision.object, collision.collider, collision);
                }
            }
        }
        for (const lastCollision of this.lastFrameCollisions) {
            const stillColliding = this.currentCollisions.find(c => c.object === lastCollision.object);
            if (!stillColliding) {
                if (lastCollision.type === 'trigger') {
                    if (this.onTriggerExit) this.onTriggerExit(lastCollision.object, lastCollision.collider, lastCollision);
                    this._fireEvents('onTriggerExit', lastCollision);
                } else {
                    if (this.onCollisionExit) this.onCollisionExit(lastCollision.object, lastCollision.collider, lastCollision);
                    this._fireEvents('onCollisionExit', lastCollision);
                }
            }
        }
    }
    
    // ==================== COLLISION IMPACT DATA ====================
    
    /**
     * Calculate rich impact data for a collision.
     * This data is stored in currentCollisions and passed to callbacks.
     * Other modules (VehicleController, VehicleControllerRenderer) can use this
     * instead of doing their own collision detection.
     * @param {Object} otherObject - The other game object
     * @param {Object} otherCollider - The other collider
     * @param {Object} collisionInfo - SAT collision info
     * @param {Rigidbody} [cachedRb] - Cached rigidbody (optional, avoids getModule call)
     * @param {VehicleController} [cachedVC] - Cached vehicle controller (optional)
     */
    _calculateImpactData(otherObject, otherCollider, collisionInfo, cachedRb, cachedVC) {
        // Use cached modules if provided, otherwise fall back to getModule
        const otherVC = cachedVC !== undefined ? cachedVC : (otherObject.getModule ? otherObject.getModule('VehicleController') : null);
        const otherRb = cachedRb !== undefined ? cachedRb : (otherObject.getModule ? otherObject.getModule('Rigidbody') : null);
        
        let otherVelX = 0, otherVelY = 0;
        if (otherVC) {
            otherVelX = otherVC._velX || 0;
            otherVelY = otherVC._velY || 0;
        } else if (otherRb) {
            otherVelX = otherRb.velocityX || 0;
            otherVelY = otherRb.velocityY || 0;
        }
        
        // Use pre-collision velocity for accurate impact calculation
        const myVelX = this._preCollisionVelX || this.velocityX;
        const myVelY = this._preCollisionVelY || this.velocityY;
        
        // Calculate speeds
        const mySpeed = Math.sqrt(myVelX * myVelX + myVelY * myVelY);
        const otherSpeed = Math.sqrt(otherVelX * otherVelX + otherVelY * otherVelY);
        
        // Relative velocity (how fast we're closing)
        const relVelX = myVelX - otherVelX;
        const relVelY = myVelY - otherVelY;
        const relativeSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
        
        // Contact point (from collision info or calculated)
        let contactPoint = null;
        let normal = null;
        
        if (collisionInfo) {
            contactPoint = collisionInfo.point || null;
            normal = collisionInfo.normal || null;
        }
        
        // If no contact point from SAT, calculate from direction
        if (!contactPoint) {
            const myPos = this.gameObject.position;
            const otherPos = otherObject.position;
            const dx = otherPos.x - myPos.x;
            const dy = otherPos.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Estimate contact point as midpoint biased toward other
            contactPoint = {
                x: myPos.x + dx * 0.5,
                y: myPos.y + dy * 0.5
            };
            
            if (!normal) {
                normal = { x: dx / dist, y: dy / dist };
            }
        }
        
        // Calculate closing speed along collision normal
        let closingSpeed = 0;
        if (normal) {
            closingSpeed = Math.abs(relVelX * normal.x + relVelY * normal.y);
        } else {
            closingSpeed = relativeSpeed;
        }
        
        // Calculate impact energy (considers mass)
        const otherMass = otherRb ? (otherRb.mass || 1) : 1;
        const combinedMass = this.mass + otherMass;
        const impactEnergy = closingSpeed * Math.sqrt(combinedMass / 2);
        
        return {
            // Velocities at time of impact
            myVelocity: { x: myVelX, y: myVelY },
            otherVelocity: { x: otherVelX, y: otherVelY },
            relativeVelocity: { x: relVelX, y: relVelY },
            
            // Speeds (pre-calculated for convenience)
            mySpeed,
            otherSpeed,
            relativeSpeed,
            closingSpeed,
            
            // Impact data
            impactEnergy,
            contactPoint,
            normal,
            
            // Mass info
            myMass: this.mass,
            otherMass
        };
    }
    
    /**
     * Get all current collisions with full impact data.
     * Use this from other modules instead of doing your own collision detection.
     */
    getCollisionsWithImpactData() {
        return this.currentCollisions.filter(c => c.type === 'solid');
    }
    
    /**
     * Check if currently colliding with a specific object
     */
    isCollidingWith(object) {
        return this.currentCollisions.some(c => c.object === object);
    }
    
    /**
     * Get collision data for a specific object (if currently colliding)
     */
    getCollisionDataWith(object) {
        return this.currentCollisions.find(c => c.object === object) || null;
    }
    
    // ==================== REALISTIC PHYSICS (OFF-CENTER TORQUE) ====================
    
    _getContactPoint(myCollider, otherCollider) {
        const b1 = myCollider.getBounds ? myCollider.getBounds() : null;
        const b2 = otherCollider.getBounds ? otherCollider.getBounds() : null;
        if (!b1 || !b2) return null;
        const left = Math.max(b1.left, b2.left);
        const right = Math.min(b1.right, b2.right);
        const top = Math.max(b1.top, b2.top);
        const bottom = Math.min(b1.bottom, b2.bottom);
        if (left >= right || top >= bottom) return null;
        return { x: (left + right) / 2, y: (top + bottom) / 2 };
    }
    
    _applyCollisionTorque(otherCollider, normalX, normalY, impactSpeed, contactOverride) {
        if (!this.realisticPhysics || impactSpeed < 1) return;
        const myCollider = this.getCollider();
        if (!myCollider) return;
        // Prefer explicit contact point (e.g. from SAT); fall back to AABB overlap center
        const contact = contactOverride || this._getContactPoint(myCollider, otherCollider);
        if (!contact) return;
        const armX = contact.x - this.gameObject.position.x;
        const armY = contact.y - this.gameObject.position.y;
        // Dead zone - skip if contact is nearly centered
        if (Math.abs(armX) < 1 && Math.abs(armY) < 1) return;
        // 2D cross product: torque = arm × (normal * impactSpeed)
        const torque = (armX * normalY - armY * normalX) * impactSpeed;
        // Moment of inertia for rectangle: I = m(w² + h²) / 12
        const bounds = myCollider.getBounds();
        if (!bounds) return;
        const w = bounds.width || 1;
        const h = bounds.height || 1;
        const inertia = (this.mass * (w * w + h * h)) / 12;
        this.angularVelocity += torque / Math.max(inertia, 0.01);
    }
    
    _applyTwoBodyResponse(otherCollider, normalX, normalY, contactOverride) {
        if (!this.realisticPhysics) return false;
        const otherObj = otherCollider.gameObject;
        if (!otherObj || !otherObj.getModule) return false;
        const otherRb = otherObj.getModule('Rigidbody');
        if (!otherRb || otherRb.isKinematic) return false;
        
        // Relative velocity along collision normal
        const relVx = this.velocityX - otherRb.velocityX;
        const relVy = this.velocityY - otherRb.velocityY;
        const relVelN = relVx * normalX + relVy * normalY;
        
        // Already separating - skip
        if (relVelN >= 0) return true;
        
        // Impact speed determines reactivity - higher velocity = bigger response
        const impactSpeed = -relVelN;
        const speed1 = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const speed2 = Math.sqrt(otherRb.velocityX * otherRb.velocityX + otherRb.velocityY * otherRb.velocityY);
        
        // Use combined bounciness scaled by how directly the collision is (head-on vs glancing)
        const combinedSpeed = speed1 + speed2;
        const directness = combinedSpeed > 0.1 ? impactSpeed / combinedSpeed : 0.5;
        const e = Math.min(this.bounciness, otherRb.bounciness);
        // More direct collisions = more reactive bounce
        const effectiveE = e + (1 - e) * directness * 0.2;
        
        const invM1 = 1 / this.mass;
        const invM2 = 1 / otherRb.mass;
        const invMassSum = invM1 + invM2;
        
        // Normal impulse magnitude - velocity-proportional
        const j = -(1 + effectiveE) * relVelN / invMassSum;
        
        // Calculate mass ratio for extreme mass difference handling
        const massRatio = this.mass / otherRb.mass;
        const extremeThreshold = 3.0;
        
        // Asymmetric impulse scaling for extreme mass differences
        let selfImpulseScale = 1.0;
        if (massRatio < 1 / extremeThreshold) {
            // This object is much lighter - it bounces more
            // No change needed - lighter objects naturally get more impulse from invM1
        } else if (massRatio > extremeThreshold) {
            // This object is much heavier - reduce our response so we don't move much
            const extremeFactor = Math.min(1.0, (otherRb.mass / this.mass) * extremeThreshold);
            selfImpulseScale = extremeFactor * extremeFactor;
        }
        
        // SYMMETRIC: Only apply impulse to THIS body - the other body handles its own
        this.velocityX += (j * invM1 * selfImpulseScale) * normalX;
        this.velocityY += (j * invM1 * selfImpulseScale) * normalY;
        
        // Tangential friction impulse - proportional to normal force
        const tVx = relVx - relVelN * normalX;
        const tVy = relVy - relVelN * normalY;
        const tLen = Math.sqrt(tVx * tVx + tVy * tVy);
        if (tLen > 0.1) {
            const tx = tVx / tLen;
            const ty = tVy / tLen;
            const mu = (this.friction + otherRb.friction) * 0.5;
            // Friction impulse scales with impact force (Coulomb model)
            let jt = -tLen / invMassSum;
            // Coulomb friction cone: clamp tangential impulse to normal impulse * mu
            const maxFriction = j * mu;
            if (Math.abs(jt) > maxFriction) jt = Math.sign(jt) * maxFriction;
            // Only apply to self
            this.velocityX += (jt * invM1 * selfImpulseScale) * tx;
            this.velocityY += (jt * invM1 * selfImpulseScale) * ty;
        }
        
        // Torque on THIS body only from off-center impact
        const myCollider = this.getCollider();
        if (myCollider) {
            const contact = contactOverride || this._getContactPoint(myCollider, otherCollider);
            if (contact) {
                const selfArmX = contact.x - this.gameObject.position.x;
                const selfArmY = contact.y - this.gameObject.position.y;
                if (Math.abs(selfArmX) > 1 || Math.abs(selfArmY) > 1) {
                    const selfImpX = j * normalX * selfImpulseScale;
                    const selfImpY = j * normalY * selfImpulseScale;
                    const selfTorque = selfArmX * selfImpY - selfArmY * selfImpX;
                    const sb = myCollider.getBounds ? myCollider.getBounds() : null;
                    if (sb) {
                        const sw = sb.width || 1, sh = sb.height || 1;
                        const selfInertia = (this.mass * (sw * sw + sh * sh)) / 12;
                        this.angularVelocity += selfTorque / Math.max(selfInertia, 0.01);
                    }
                }
            }
        }
        
        return true;
    }
    
    // ==================== PHYSICS METHODS ====================
    
    addForce(forceX, forceY) {
        if (this.isKinematic) return;
        this.velocityX += (forceX / this.mass);
        this.velocityY += (forceY / this.mass);
    }
    
    addImpulse(impulseX, impulseY) {
        if (this.isKinematic) return;
        this.velocityX += impulseX;
        this.velocityY += impulseY;
    }

    applyForce(angle, magnitude) {
        if (this.isKinematic) return;
        const forceX = Math.cos(angle) * magnitude;
        const forceY = Math.sin(angle) * magnitude;
        this.addForce(forceX, forceY);
    }

    applyImpulse(angle, magnitude) {
        if (this.isKinematic) return;
        const impulseX = Math.cos(angle) * magnitude;
        const impulseY = Math.sin(angle) * magnitude;
        this.addImpulse(impulseX, impulseY);
    }
    
    setVelocity(x, y) { this.velocityX = x; this.velocityY = y; }
    
    addTorque(torque) {
        if (this.isKinematic) return;
        this.angularVelocity += torque / this.mass;
    }
    
    stop() { this.velocityX = 0; this.velocityY = 0; this.angularVelocity = 0; }
    
    getSpeed() { return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY); }
    
    getVelocityAngle() { return Math.atan2(this.velocityY, this.velocityX); }
    
    isCollidingWithTag(tag) { return this.currentCollisions.some(c => c.collider && c.collider.tag === tag); }
    
    getCollidingObjects() { return this.currentCollisions.map(c => c.object); }
    
    getCollisionWith(object) { return this.currentCollisions.find(c => c.object === object) || null; }
    
    moveWithCollision(deltaX, deltaY) {
        const result = { actualX: deltaX, actualY: deltaY, hitX: false, hitY: false, grounded: false };
        const myCollider = this.getCollider();
        if (!myCollider) {
            this.gameObject.position.x += deltaX;
            this.gameObject.position.y += deltaY;
            return result;
        }
        const nearbyColliders = this.getNearbyColliders();
        if (deltaX !== 0) {
            this.gameObject.position.x += deltaX;
            for (const { object, collider, isSolid } of nearbyColliders) {
                if (!isSolid) continue;
                if (!this.collidersOverlap(myCollider, collider)) continue;
                const info = this.getCollisionInfo(myCollider, collider);
                if (info) {
                    this.gameObject.position.x += info.normal.x * info.depth;
                } else {
                    const myBounds = myCollider.getBounds();
                    const otherBounds = collider.getBounds();
                    if (deltaX > 0) this.gameObject.position.x = otherBounds.left - myBounds.width / 2 - (myCollider.offsetX || 0);
                    else this.gameObject.position.x = otherBounds.right + myBounds.width / 2 - (myCollider.offsetX || 0);
                }
                result.hitX = true;
                result.actualX = 0;
                break;
            }
        }
        if (deltaY !== 0) {
            this.gameObject.position.y += deltaY;
            for (const { object, collider, isSolid } of nearbyColliders) {
                if (!isSolid) continue;
                if (!this.collidersOverlap(myCollider, collider)) continue;
                const info = this.getCollisionInfo(myCollider, collider);
                if (info) {
                    this.gameObject.position.y += info.normal.y * info.depth;
                    if (deltaY > 0) result.grounded = true;
                } else {
                    const myBounds = myCollider.getBounds();
                    const otherBounds = collider.getBounds();
                    if (deltaY > 0) { this.gameObject.position.y = otherBounds.top - myBounds.height / 2 - (myCollider.offsetY || 0); result.grounded = true; }
                    else this.gameObject.position.y = otherBounds.bottom + myBounds.height / 2 - (myCollider.offsetY || 0);
                }
                result.hitY = true;
                result.actualY = 0;
                break;
            }
        }
        return result;
    }
    
    // ==================== SERIALIZATION ====================
    
    toJSON() {
        const json = super.toJSON();
        json.type = 'Rigidbody';
        json.velocityX = this.velocityX;
        json.velocityY = this.velocityY;
        json.acceleration = this.acceleration;
        json.drag = this.drag;
        json.angularVelocity = this.angularVelocity;
        json.angularDrag = this.angularDrag;
        json.useGravity = this.useGravity;
        json.gravityScale = this.gravityScale;
        json.mass = this.mass;
        json.isKinematic = this.isKinematic;
        json.bounciness = this.bounciness;
        json.friction = this.friction;
        json.detectCollisions = this.detectCollisions;
        json.collisionRadius = this.collisionRadius;
        json.solidTags = this.solidTags;
        json.triggerTags = this.triggerTags;
        json.continuousCollision = this.continuousCollision;
        json.useCollisionWorker = this.useCollisionWorker;
        json.realisticPhysics = this.realisticPhysics;
        json.events = (this.events || []).map(evt => ({ ...evt }));
        return json;
    }
    
    static fromJSON(json) {
        const module = new Rigidbody();
        module.enabled = json.enabled !== undefined ? json.enabled : true;
        module.velocityX = json.velocityX || 0;
        module.velocityY = json.velocityY || 0;
        module.acceleration = json.acceleration || 0;
        module.drag = json.drag !== undefined ? json.drag : 0.98;
        module.angularVelocity = json.angularVelocity || 0;
        module.angularDrag = json.angularDrag !== undefined ? json.angularDrag : 0.98;
        module.useGravity = json.useGravity || false;
        module.gravityScale = json.gravityScale !== undefined ? json.gravityScale : 1.0;
        module.mass = json.mass !== undefined ? json.mass : 1.0;
        module.isKinematic = json.isKinematic || false;
        module.bounciness = json.bounciness !== undefined ? json.bounciness : 0;
        module.friction = json.friction !== undefined ? json.friction : 0.1;
        module.detectCollisions = json.detectCollisions !== undefined ? json.detectCollisions : true;
        module.collisionRadius = json.collisionRadius !== undefined ? json.collisionRadius : 200;
        module.solidTags = json.solidTags || ['solid', 'ground', 'wall'];
        module.triggerTags = json.triggerTags || ['trigger'];
        module.continuousCollision = json.continuousCollision || false;
        module.useCollisionWorker = json.useCollisionWorker || false;
        module.realisticPhysics = json.realisticPhysics || false;
        module.events = (json.events || []).map(evt => ({ ...evt }));
        return module;
    }
    
    clone() {
        const cloned = new Rigidbody();
        cloned.velocityX = this.velocityX;
        cloned.velocityY = this.velocityY;
        cloned.acceleration = this.acceleration;
        cloned.drag = this.drag;
        cloned.angularVelocity = this.angularVelocity;
        cloned.angularDrag = this.angularDrag;
        cloned.useGravity = this.useGravity;
        cloned.gravityScale = this.gravityScale;
        cloned.mass = this.mass;
        cloned.isKinematic = this.isKinematic;
        cloned.bounciness = this.bounciness;
        cloned.friction = this.friction;
        cloned.detectCollisions = this.detectCollisions;
        cloned.collisionRadius = this.collisionRadius;
        cloned.solidTags = [...this.solidTags];
        cloned.triggerTags = [...this.triggerTags];
        cloned.continuousCollision = this.continuousCollision;
        cloned.useCollisionWorker = this.useCollisionWorker;
        cloned.realisticPhysics = this.realisticPhysics;
        cloned.enabled = this.enabled;
        cloned.events = (this.events || []).map(evt => ({ ...evt }));
        return cloned;
    }

    // ==================== STATIC DOCUMENTATION ====================

    static documentation = {
        "Overview": `
            <h2>⚡ Rigidbody Overview</h2>
            <p>The <strong>Rigidbody</strong> module adds physics simulation to a GameObject — velocity, gravity, drag, forces, collisions, and trigger events. It is the core physics component used by movement controllers, projectiles, and interactive objects.</p>
            <ul>
                <li><strong>Dynamic</strong> — Responds to forces, gravity, and collisions (default)</li>
                <li><strong>Kinematic</strong> — Moved by code only, not affected by forces, but still detects collisions</li>
            </ul>
            <p>Rigidbody handles both <strong>solid collisions</strong> (physical blocking) and <strong>trigger collisions</strong> (overlap detection without blocking) based on tag-based filtering.</p>

            <div class="tip">Most movement modules (MovementController2D, VehicleController) require a Rigidbody on the same GameObject to function.</div>
        `,

        "Forces & Velocity": `
            <h2>💨 Forces & Velocity</h2>
            <p>Apply forces and impulses to move objects physically:</p>

            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>addForce(forceX, forceY)</code></td><td>Apply continuous force (divided by mass). Use in <code>loop()</code> for sustained push.</td></tr>
                <tr><td><code>addImpulse(impulseX, impulseY)</code></td><td>Instant velocity change (ignores mass). Great for knockback, explosions.</td></tr>
                <tr><td><code>setVelocity(x, y)</code></td><td>Directly set velocity</td></tr>
                <tr><td><code>addTorque(torque)</code></td><td>Add rotational force</td></tr>
                <tr><td><code>stop()</code></td><td>Zero all velocity and angular velocity</td></tr>
            </table>

            <pre><code>const rb = this.getModule('Rigidbody');

// Constant thrust (in loop)
rb.addForce(0, -500);  // Push upward

// Explosion knockback (one-time)
rb.addImpulse(200, -300);

// Direct velocity set
rb.setVelocity(100, 0);  // Move right at 100 px/s

// Stop everything
rb.stop();</code></pre>

            <h3>Key Properties</h3>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>velocityX / velocityY</code></td><td>0</td><td>Current velocity in px/s</td></tr>
                <tr><td><code>drag</code></td><td>0</td><td>Linear drag (0 = no drag, 1 = max drag). Slows velocity over time.</td></tr>
                <tr><td><code>angularVelocity</code></td><td>0</td><td>Rotation speed in degrees/s</td></tr>
                <tr><td><code>angularDrag</code></td><td>0</td><td>Rotational drag</td></tr>
                <tr><td><code>mass</code></td><td>1</td><td>Affects force calculations (higher mass = less acceleration)</td></tr>
            </table>

            <div class="warning">Use <code>addForce</code> for gradual pushes in <code>loop()</code>. Use <code>addImpulse</code> for instant one-time hits. Don't confuse them — applying <code>addImpulse</code> every frame will cause extreme speeds!</div>
        `,

        "Gravity & Drag": `
            <h2>🌍 Gravity & Drag</h2>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>useGravity</code></td><td>true</td><td>Enable gravity</td></tr>
                <tr><td><code>gravityScale</code></td><td>1.0</td><td>Multiply gravity strength (0 = no gravity, 2 = double gravity)</td></tr>
                <tr><td><code>drag</code></td><td>0</td><td>Linear drag coefficient (0-1)</td></tr>
                <tr><td><code>angularDrag</code></td><td>0</td><td>Angular drag coefficient (0-1)</td></tr>
            </table>

            <pre><code>const rb = this.getModule('Rigidbody');

// Floaty space physics
rb.useGravity = false;
rb.drag = 0.02;

// Heavy object
rb.gravityScale = 2.0;
rb.mass = 5;

// Featherfall / slow descent
rb.gravityScale = 0.3;
rb.drag = 0.5;</code></pre>
        `,

        "Collisions": `
            <h2>💥 Collisions</h2>
            <p>Rigidbody uses tag-based collision filtering. There are two types:</p>

            <h3>Solid Collisions</h3>
            <p>Objects with tags matching <code>solidTags</code> will physically block this object:</p>
            <pre><code>const rb = this.getModule('Rigidbody');
rb.solidTags = ['wall', 'ground', 'platform'];
// This object will be blocked by anything tagged "wall", "ground", or "platform"</code></pre>

            <h3>Trigger Collisions</h3>
            <p>Objects with tags matching <code>triggerTags</code> will fire overlap events without blocking:</p>
            <pre><code>rb.triggerTags = ['coin', 'powerup', 'checkpoint'];
// Overlap detection only — no physical blocking</code></pre>

            <h3>Collision Properties</h3>
            <table>
                <tr><th>Property</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>detectCollisions</code></td><td>true</td><td>Enable collision detection</td></tr>
                <tr><td><code>collisionRadius</code></td><td>200</td><td>Radius to search for nearby colliders</td></tr>
                <tr><td><code>continuousCollision</code></td><td>false</td><td>Use CCD to prevent tunneling through thin objects at high speed</td></tr>
                <tr><td><code>bounciness</code></td><td>0</td><td>How much to bounce on collision (0 = no bounce, 1 = full bounce)</td></tr>
                <tr><td><code>friction</code></td><td>0.2</td><td>Surface friction (0-1)</td></tr>
                <tr><td><code>isKinematic</code></td><td>false</td><td>If true, not affected by forces but still detects collisions</td></tr>
            </table>

            <div class="tip">Enable <code>continuousCollision</code> for fast-moving objects like bullets to prevent them from passing through walls.</div>
        `,

        "Collision Callbacks": `
            <h2>📢 Collision Callbacks</h2>
            <p>Assign functions to these callbacks to respond to collision events:</p>

            <h3>Solid Callbacks</h3>
            <table>
                <tr><th>Callback</th><th>When It Fires</th></tr>
                <tr><td><code>onCollisionEnter</code></td><td>First frame two solid objects touch</td></tr>
                <tr><td><code>onCollisionStay</code></td><td>Every frame while still touching</td></tr>
                <tr><td><code>onCollisionExit</code></td><td>First frame after objects separate</td></tr>
            </table>

            <h3>Trigger Callbacks</h3>
            <table>
                <tr><th>Callback</th><th>When It Fires</th></tr>
                <tr><td><code>onTriggerEnter</code></td><td>First frame of overlap with a trigger-tagged object</td></tr>
                <tr><td><code>onTriggerStay</code></td><td>Every frame while overlapping</td></tr>
                <tr><td><code>onTriggerExit</code></td><td>First frame after overlap ends</td></tr>
            </table>

            <pre><code>start() {
    const rb = this.getModule('Rigidbody');
    
    rb.onCollisionEnter = (other) => {
        console.log('Hit:', other.gameObject.name);
        // Damage, bounce, destroy, etc.
    };
    
    rb.onTriggerEnter = (other) => {
        if (other.gameObject.tag === 'coin') {
            other.gameObject.destroy();
            this.score += 10;
        }
    };
    
    rb.onTriggerExit = (other) => {
        console.log('Left trigger zone:', other.gameObject.name);
    };
}</code></pre>
        `,

        "API Reference": `
            <h2>📖 API Reference</h2>
            <h3>Methods</h3>
            <table>
                <tr><th>Method</th><th>Description</th></tr>
                <tr><td><code>addForce(forceX, forceY)</code></td><td>Apply force (divided by mass)</td></tr>
                <tr><td><code>addImpulse(impulseX, impulseY)</code></td><td>Apply instant velocity change</td></tr>
                <tr><td><code>setVelocity(x, y)</code></td><td>Set velocity directly</td></tr>
                <tr><td><code>addTorque(torque)</code></td><td>Add rotational force</td></tr>
                <tr><td><code>stop()</code></td><td>Zero all velocity</td></tr>
                <tr><td><code>getSpeed()</code></td><td>Returns current speed magnitude</td></tr>
                <tr><td><code>getVelocityAngle()</code></td><td>Returns velocity direction in radians</td></tr>
                <tr><td><code>isCollidingWithTag(tag)</code></td><td>Check if currently touching a tagged object</td></tr>
                <tr><td><code>getCollidingObjects()</code></td><td>Get all objects in current collisions</td></tr>
                <tr><td><code>getCollisionWith(object)</code></td><td>Get collision entry for a specific object</td></tr>
                <tr><td><code>moveWithCollision(dx, dy)</code></td><td>Move with collision response, returns <code>{ actualX, actualY, hitX, hitY, grounded }</code></td></tr>
                <tr><td><code>getCollider()</code></td><td>Get the attached collider component</td></tr>
                <tr><td><code>getNearbyObjects(radius?)</code></td><td>Get objects within a radius</td></tr>
            </table>

            <h3>Querying Collisions</h3>
            <pre><code>const rb = this.getModule('Rigidbody');

// Check if touching ground
if (rb.isCollidingWithTag('ground')) {
    // On the ground
}

// Get all current collisions
const collisions = rb.getCollidingObjects();
for (const obj of collisions) {
    console.log('Touching:', obj.name);
}

// Move with collision (useful for kinematic objects)
const result = rb.moveWithCollision(5, 0);
if (result.hitX) console.log('Blocked horizontally');</code></pre>
        `,

        "Properties Reference": `
            <h2>📋 Properties Reference</h2>
            <table>
                <tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>
                <tr><td><code>velocityX</code></td><td>number</td><td>0</td><td>Horizontal velocity (px/s)</td></tr>
                <tr><td><code>velocityY</code></td><td>number</td><td>0</td><td>Vertical velocity (px/s)</td></tr>
                <tr><td><code>drag</code></td><td>slider</td><td>0</td><td>Linear drag (0-1)</td></tr>
                <tr><td><code>angularVelocity</code></td><td>number</td><td>0</td><td>Rotation speed (deg/s)</td></tr>
                <tr><td><code>angularDrag</code></td><td>slider</td><td>0</td><td>Rotational drag (0-1)</td></tr>
                <tr><td><code>useGravity</code></td><td>boolean</td><td>true</td><td>Enable gravity</td></tr>
                <tr><td><code>gravityScale</code></td><td>number</td><td>1</td><td>Gravity multiplier</td></tr>
                <tr><td><code>mass</code></td><td>number</td><td>1</td><td>Object mass</td></tr>
                <tr><td><code>bounciness</code></td><td>slider</td><td>0</td><td>Bounce factor (0-1)</td></tr>
                <tr><td><code>friction</code></td><td>slider</td><td>0.2</td><td>Surface friction (0-1)</td></tr>
                <tr><td><code>isKinematic</code></td><td>boolean</td><td>false</td><td>Code-driven only (no forces)</td></tr>
                <tr><td><code>detectCollisions</code></td><td>boolean</td><td>true</td><td>Enable collision detection</td></tr>
                <tr><td><code>collisionRadius</code></td><td>number</td><td>200</td><td>Collision check radius</td></tr>
                <tr><td><code>continuousCollision</code></td><td>boolean</td><td>false</td><td>CCD for fast objects</td></tr>
                <tr><td><code>solidTags</code></td><td>array</td><td>[]</td><td>Tags that block this object</td></tr>
                <tr><td><code>triggerTags</code></td><td>array</td><td>[]</td><td>Tags that trigger overlap events</td></tr>
                <tr><td><code>realisticPhysics</code></td><td>boolean</td><td>false</td><td>Enable SAT-based realistic collisions</td></tr>
            </table>
        `
    };
}

// Register module globally
if (typeof window !== 'undefined') {
    window.Rigidbody = Rigidbody;
}
