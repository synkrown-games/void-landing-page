/**
 * GPUSurface - High-performance GPU-accelerated rendering surface (WebGL2)
 * 
 * Architecture:
 *  - Unified vertex format: [x, y, u, v, r, g, b, a] per vertex (32 bytes)
 *  - Single shader handles both colored and textured geometry via tex * color
 *  - 1×1 white pixel texture for solid-color fills (texture * color = color)
 *  - Triangle-based batching (TRIANGLES mode): rects=6 verts, lines=6 verts
 *  - Auto-flush on texture change, blend mode change, or buffer full
 *  - 16K vertex batch = ~2700 quads per draw call
 *  - Texture management: create, cache, bind, delete
 *  - 17 built-in post-processing effect shaders (bloom, blur, CRT, etc.)
 * 
 * Performance vs old point-per-pixel approach:
 *  - 100×100 rect: 10,000 verts → 6 verts (1667× fewer)
 *  - Circle r=50: ~7,800 verts → ~192 verts (40× fewer)
 *  - Line 200px: ~600 verts → 6 verts (100× fewer)
 *  - Image: CPU getImageData→putImageData → direct GPU textured quad
 */

class GPUSurface {
    /**
     * @param {number} width - Surface width in pixels
     * @param {number} height - Surface height in pixels
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._freed = false;

        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
            antialias: false,
            depth: false,
            stencil: false
        });

        if (!this.gl) {
            console.warn('GPUSurface: WebGL2 not available, falling back to Canvas2D');
            this._fallbackMode = true;
            this.ctx = this.canvas.getContext('2d');
            this._currentBlendMode = 'source-over';
            this._globalAlpha = 1.0;
            this._currentColor = { r: 1, g: 1, b: 1, a: 1 };
            this._lineWidth = 1;
            this._font = '16px sans-serif';
            this._textAlign = 'left';
            this._textBaseline = 'alphabetic';
            this._smoothing = false;
            this._shadowColor = 'transparent';
            this._shadowBlur = 0;
            this._shadowOffsetX = 0;
            this._shadowOffsetY = 0;
            this._stateStack = [];
            return;
        }

        this._fallbackMode = false;
        this._initGL();
    }

    // =======================================================================
    //  GL INITIALIZATION
    // =======================================================================

    _initGL() {
        const gl = this.gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, this.width, this.height);

        // --- Unified batch shader (handles both colored & textured) ---
        this._createUnifiedShader();

        // --- 1×1 white pixel texture (for solid-color geometry) ---
        this._createWhitePixelTexture();

        // --- Batch buffer (TRIANGLES) ---
        this._maxBatchSize = 16384; // must be multiple of 3
        this._batchVertices = new Float32Array(this._maxBatchSize * 8);
        this._batchCount = 0;

        this._vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._batchVertices.byteLength, gl.DYNAMIC_DRAW);

        // VAO for batch rendering
        this._batchVAO = gl.createVertexArray();
        gl.bindVertexArray(this._batchVAO);

        const stride = 32; // 8 floats × 4 bytes
        const posLoc = gl.getAttribLocation(this._shaderProgram, 'a_position');
        const uvLoc  = gl.getAttribLocation(this._shaderProgram, 'a_texCoord');
        const colLoc = gl.getAttribLocation(this._shaderProgram, 'a_color');

        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, stride, 16);

        gl.bindVertexArray(null);

        // --- Current state ---
        this._currentTexture = this._whitePixelTex;
        this._currentBlendMode = 'source-over';
        this._globalAlpha = 1.0;
        this._currentColor = { r: 1, g: 1, b: 1, a: 1 };
        this._lineWidth = 1;
        this._font = '16px sans-serif';
        this._textAlign = 'left';
        this._textBaseline = 'alphabetic';
        this._smoothing = false;
        this._shadowColor = 'transparent';
        this._shadowBlur = 0;
        this._shadowOffsetX = 0;
        this._shadowOffsetY = 0;
        this._stateStack = [];

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._whitePixelTex);

        // --- Framebuffer texture (for copyTexImage in effects) ---
        this._framebuffer = gl.createFramebuffer();
        this._texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // --- Fullscreen texture shader (for effects & putImageData) ---
        this._quadVAO = null;
        this._quadBuffer = null;
        this._textureShaderProgram = null;
        this._createTextureShader();
        this._createPositionedTextureShader();

        // --- Effect system ---
        this._effectFBO1 = null;
        this._effectFBO2 = null;
        this._effectTex1 = null;
        this._effectTex2 = null;
        this._effectShaders = {};
        this._initEffectSystem();

        // --- Texture cache (for external images used as textures) ---
        this._managedTextures = [];

        // Restore white pixel binding after all setup
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._whitePixelTex);
    }

    // =======================================================================
    //  UNIFIED SHADER (colored + textured geometry in one program)
    // =======================================================================

    _createUnifiedShader() {
        const vertSrc = `#version 300 es
            in vec2 a_position;
            in vec2 a_texCoord;
            in vec4 a_color;
            uniform vec2 u_resolution;
            out vec2 v_texCoord;
            out vec4 v_color;
            void main() {
                vec2 cs = (a_position / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(cs.x, -cs.y, 0.0, 1.0);
                v_texCoord = a_texCoord;
                v_color = a_color;
            }
        `;
        const fragSrc = `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texCoord;
            in vec4 v_color;
            out vec4 outColor;
            void main() {
                outColor = texture(u_texture, v_texCoord) * v_color;
            }
        `;
        this._shaderProgram = this._compileShaderProgram(vertSrc, fragSrc);
        this._resolutionLoc = this.gl.getUniformLocation(this._shaderProgram, 'u_resolution');
        this._textureLoc = this.gl.getUniformLocation(this._shaderProgram, 'u_texture');
    }

    // =======================================================================
    //  WHITE PIXEL TEXTURE
    // =======================================================================

    _createWhitePixelTexture() {
        const gl = this.gl;
        this._whitePixelTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._whitePixelTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    // =======================================================================
    //  TEXTURE SHADER (fullscreen quad for effects)
    // =======================================================================

    _createTextureShader() {
        const gl = this.gl;
        const vertSrc = `#version 300 es
            layout(location = 0) in vec2 a_position;
            layout(location = 1) in vec2 a_texCoord;
            out vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        const fragSrc = `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                outColor = texture(u_texture, v_texCoord);
            }
        `;
        this._textureShaderProgram = this._compileShaderProgram(vertSrc, fragSrc);

        this._quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,  1,1, 1,1
        ]), gl.STATIC_DRAW);

        this._quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this._quadVAO);
        const posLoc = gl.getAttribLocation(this._textureShaderProgram, 'a_position');
        const texLoc = gl.getAttribLocation(this._textureShaderProgram, 'a_texCoord');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
        gl.bindVertexArray(null);

        this._createPositionedTextureShader();
    }

    // =======================================================================
    //  POSITIONED TEXTURE SHADER (for putImageData)
    // =======================================================================

    _createPositionedTextureShader() {
        const gl = this.gl;
        const vertSrc = `#version 300 es
            in vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_destPos;
            uniform vec2 u_destSize;
            out vec2 v_texCoord;
            void main() {
                vec2 pixelPos = u_destPos + a_position * u_destSize;
                vec2 clipSpace = (pixelPos / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_position;
            }
        `;
        const fragSrc = `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                outColor = texture(u_texture, v_texCoord);
            }
        `;
        this._positionedTexShader = this._compileShaderProgram(vertSrc, fragSrc);
        this._posTexResolutionLoc = gl.getUniformLocation(this._positionedTexShader, 'u_resolution');
        this._posTexDestPosLoc = gl.getUniformLocation(this._positionedTexShader, 'u_destPos');
        this._posTexDestSizeLoc = gl.getUniformLocation(this._positionedTexShader, 'u_destSize');

        this._posQuadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._posQuadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);

        this._posQuadVAO = gl.createVertexArray();
        gl.bindVertexArray(this._posQuadVAO);
        const posLoc = gl.getAttribLocation(this._positionedTexShader, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
    }

    // =======================================================================
    //  EFFECT SYSTEM
    // =======================================================================

    _initEffectSystem() {
        const gl = this.gl;
        this._effectFBO1 = gl.createFramebuffer();
        this._effectTex1 = this._createEffectTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO1);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._effectTex1, 0);

        this._effectFBO2 = gl.createFramebuffer();
        this._effectTex2 = this._createEffectTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO2);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._effectTex2, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this._createEffectShaders();
    }

    _createEffectTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    // =======================================================================
    //  EFFECT SHADERS (17 built-in post-process effects)
    // =======================================================================

    _createEffectShaders() {
        const V = `#version 300 es
            layout(location = 0) in vec2 a_position;
            out vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
                v_texCoord = a_position * 0.5 + 0.5;
            }
        `;

        // Chromatic Aberration
        this._effectShaders.chromatic = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_amount;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 offset = vec2(u_amount / u_resolution.x, 0.0);
                float r = texture(u_texture, v_texCoord - offset).r;
                float g = texture(u_texture, v_texCoord).g;
                float b = texture(u_texture, v_texCoord + offset).b;
                float a = texture(u_texture, v_texCoord).a;
                outColor = vec4(r, g, b, a);
            }
        `);

        // CRT Barrel Distortion
        this._effectShaders.crt = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_amount;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 uv = v_texCoord * 2.0 - 1.0;
                float r2 = dot(uv, uv);
                uv *= 1.0 + u_amount * r2;
                uv = uv * 0.5 + 0.5;
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
                    outColor = vec4(0.0, 0.0, 0.0, 1.0);
                else
                    outColor = texture(u_texture, uv);
            }
        `);

        // Posterize
        this._effectShaders.posterize = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_levels;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                float lvl = max(2.0, u_levels);
                c.rgb = floor(c.rgb * lvl + 0.5) / lvl;
                outColor = c;
            }
        `);

        // Thermal
        this._effectShaders.thermal = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                vec3 heat;
                if (lum < 0.2) heat = mix(vec3(0.0), vec3(0.0, 0.0, 0.5), lum * 5.0);
                else if (lum < 0.4) heat = mix(vec3(0.0, 0.0, 0.5), vec3(0.5, 0.0, 0.5), (lum - 0.2) * 5.0);
                else if (lum < 0.6) heat = mix(vec3(0.5, 0.0, 0.5), vec3(1.0, 0.0, 0.0), (lum - 0.4) * 5.0);
                else if (lum < 0.8) heat = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (lum - 0.6) * 5.0);
                else heat = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (lum - 0.8) * 5.0);
                outColor = vec4(heat, c.a);
            }
        `);

        // Gradient Map
        this._effectShaders.gradientMap = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec3 u_colorA;
            uniform vec3 u_colorB;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                outColor = vec4(mix(u_colorA, u_colorB, lum), c.a);
            }
        `);

        // Noise
        this._effectShaders.noise = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_amount;
            uniform float u_time;
            uniform float u_mono;
            in vec2 v_texCoord;
            out vec4 outColor;
            float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                vec2 seed = v_texCoord + vec2(u_time);
                if (u_mono > 0.5) {
                    float n = (rand(seed) - 0.5) * u_amount;
                    c.rgb += n;
                } else {
                    c.r += (rand(seed) - 0.5) * u_amount;
                    c.g += (rand(seed + 0.1) - 0.5) * u_amount;
                    c.b += (rand(seed + 0.2) - 0.5) * u_amount;
                }
                outColor = clamp(c, 0.0, 1.0);
            }
        `);

        // Channel Shift
        this._effectShaders.channelShift = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform vec2 u_shift;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 offset = u_shift / u_resolution;
                float r = texture(u_texture, v_texCoord + offset).r;
                float g = texture(u_texture, v_texCoord).g;
                float b = texture(u_texture, v_texCoord - offset).b;
                float a = texture(u_texture, v_texCoord).a;
                outColor = vec4(r, g, b, a);
            }
        `);

        // Sharpen
        this._effectShaders.sharpen = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_amount;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 px = 1.0 / u_resolution;
                vec4 c = texture(u_texture, v_texCoord);
                vec4 blur = (
                    texture(u_texture, v_texCoord + vec2(-px.x, 0)) +
                    texture(u_texture, v_texCoord + vec2(px.x, 0)) +
                    texture(u_texture, v_texCoord + vec2(0, -px.y)) +
                    texture(u_texture, v_texCoord + vec2(0, px.y))
                ) * 0.25;
                outColor = c + (c - blur) * u_amount;
            }
        `);

        // Edge Detect (Sobel)
        this._effectShaders.edgeDetect = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_threshold;
            uniform vec3 u_edgeColor;
            uniform vec3 u_bgColor;
            in vec2 v_texCoord;
            out vec4 outColor;
            float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
            void main() {
                vec2 px = 1.0 / u_resolution;
                float tl = lum(texture(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb);
                float t  = lum(texture(u_texture, v_texCoord + vec2(0, -px.y)).rgb);
                float tr = lum(texture(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb);
                float l  = lum(texture(u_texture, v_texCoord + vec2(-px.x, 0)).rgb);
                float r  = lum(texture(u_texture, v_texCoord + vec2(px.x, 0)).rgb);
                float bl = lum(texture(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb);
                float b  = lum(texture(u_texture, v_texCoord + vec2(0, px.y)).rgb);
                float br = lum(texture(u_texture, v_texCoord + vec2(px.x, px.y)).rgb);
                float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
                float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
                float mag = length(vec2(gx, gy)) * 255.0;
                outColor = vec4(mag > u_threshold ? u_edgeColor : u_bgColor, 1.0);
            }
        `);

        // Dither
        this._effectShaders.dither = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_levels;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                float bayer[16] = float[16](
                    0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
                    12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
                    3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
                    15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
                );
                ivec2 pos = ivec2(gl_FragCoord.xy);
                int idx = (pos.y & 3) * 4 + (pos.x & 3);
                float thresh = (bayer[idx] - 0.5) / u_levels;
                c.rgb = floor((c.rgb + thresh) * u_levels + 0.5) / u_levels;
                outColor = clamp(c, 0.0, 1.0);
            }
        `);

        // Pixelate
        this._effectShaders.pixelate = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_blockSize;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 ps = vec2(u_blockSize) / u_resolution;
                vec2 coord = ps * floor(v_texCoord / ps) + ps * 0.5;
                outColor = texture(u_texture, coord);
            }
        `);

        // Blur (Kawase)
        this._effectShaders.blur = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_offset;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec2 px = vec2(u_offset) / u_resolution;
                vec4 c = texture(u_texture, v_texCoord);
                c += texture(u_texture, v_texCoord + vec2(-px.x, -px.y));
                c += texture(u_texture, v_texCoord + vec2(px.x, -px.y));
                c += texture(u_texture, v_texCoord + vec2(-px.x, px.y));
                c += texture(u_texture, v_texCoord + vec2(px.x, px.y));
                outColor = c / 5.0;
            }
        `);

        // Bloom Extract
        this._effectShaders.bloomExtract = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_threshold;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)) * 255.0;
                outColor = lum > u_threshold ? c : vec4(0.0);
            }
        `);

        // Bloom Combine
        this._effectShaders.bloomCombine = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform sampler2D u_bloomTexture;
            uniform float u_intensity;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                vec4 bloom = texture(u_bloomTexture, v_texCoord);
                outColor = c + bloom * u_intensity;
            }
        `);

        // Glitch
        this._effectShaders.glitch = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_intensity;
            in vec2 v_texCoord;
            out vec4 outColor;
            float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                vec2 uv = v_texCoord;
                float t = floor(u_time * 10.0);
                float sliceY = floor(uv.y * 20.0) / 20.0;
                float offset = (rand(vec2(sliceY, t)) - 0.5) * 2.0 * u_intensity * 0.1;
                if (rand(vec2(sliceY + 0.1, t)) > 0.7) uv.x += offset;
                outColor = texture(u_texture, uv);
            }
        `);

        // Copy
        this._effectShaders.copy = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() { outColor = texture(u_texture, v_texCoord); }
        `);

        // Color Grade
        this._effectShaders.colorGrade = this._compileShaderProgram(V, `#version 300 es
            precision mediump float;
            uniform sampler2D u_texture;
            uniform float u_brightness;
            uniform float u_contrast;
            uniform float u_saturation;
            uniform float u_grayscaleAmt;
            uniform float u_sepiaAmt;
            uniform float u_invertAmt;
            in vec2 v_texCoord;
            out vec4 outColor;
            void main() {
                vec4 c = texture(u_texture, v_texCoord);
                c.rgb += u_brightness;
                c.rgb = (c.rgb - 0.5) * u_contrast + 0.5;
                float gray = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
                c.rgb = mix(vec3(gray), c.rgb, u_saturation);
                c.rgb = mix(c.rgb, vec3(gray), u_grayscaleAmt);
                vec3 sepia = vec3(
                    dot(c.rgb, vec3(0.393, 0.769, 0.189)),
                    dot(c.rgb, vec3(0.349, 0.686, 0.168)),
                    dot(c.rgb, vec3(0.272, 0.534, 0.131))
                );
                c.rgb = mix(c.rgb, sepia, u_sepiaAmt);
                c.rgb = mix(c.rgb, 1.0 - c.rgb, u_invertAmt);
                outColor = clamp(c, 0.0, 1.0);
            }
        `);
    }

    // =======================================================================
    //  SHADER COMPILATION
    // =======================================================================

    _compileShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('GPUSurface vertex shader:', gl.getShaderInfoLog(vs));
            gl.deleteShader(vs);
            return null;
        }
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('GPUSurface fragment shader:', gl.getShaderInfoLog(fs));
            gl.deleteShader(vs); gl.deleteShader(fs);
            return null;
        }
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('GPUSurface link:', gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
            return null;
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return prog;
    }

    // =======================================================================
    //  COLOR PARSING
    // =======================================================================

    _parseColor(color) {
        if (typeof color === 'object' && color !== null && color.r !== undefined) {
            return {
                r: color.r / 255, g: color.g / 255, b: color.b / 255,
                a: color.a !== undefined ? color.a / 255 : 1
            };
        }
        if (typeof color !== 'string') return { r: 1, g: 1, b: 1, a: 1 };

        if (color.startsWith('#')) {
            const h = color.slice(1);
            if (h.length === 3) return {
                r: parseInt(h[0]+h[0],16)/255, g: parseInt(h[1]+h[1],16)/255,
                b: parseInt(h[2]+h[2],16)/255, a: 1
            };
            if (h.length === 6) return {
                r: parseInt(h.substring(0,2),16)/255, g: parseInt(h.substring(2,4),16)/255,
                b: parseInt(h.substring(4,6),16)/255, a: 1
            };
            if (h.length === 8) return {
                r: parseInt(h.substring(0,2),16)/255, g: parseInt(h.substring(2,4),16)/255,
                b: parseInt(h.substring(4,6),16)/255, a: parseInt(h.substring(6,8),16)/255
            };
        }

        const m = color.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (m) return {
            r: parseFloat(m[1])/255, g: parseFloat(m[2])/255,
            b: parseFloat(m[3])/255, a: m[4] !== undefined ? parseFloat(m[4]) : 1
        };

        const named = {
            'white':{r:1,g:1,b:1,a:1}, 'black':{r:0,g:0,b:0,a:1},
            'red':{r:1,g:0,b:0,a:1}, 'green':{r:0,g:0.502,b:0,a:1},
            'blue':{r:0,g:0,b:1,a:1}, 'yellow':{r:1,g:1,b:0,a:1},
            'cyan':{r:0,g:1,b:1,a:1}, 'magenta':{r:1,g:0,b:1,a:1},
            'orange':{r:1,g:0.647,b:0,a:1}, 'purple':{r:0.502,g:0,b:0.502,a:1},
            'gray':{r:0.502,g:0.502,b:0.502,a:1}, 'grey':{r:0.502,g:0.502,b:0.502,a:1},
            'transparent':{r:0,g:0,b:0,a:0}
        };
        return named[color.toLowerCase()] || { r: 1, g: 1, b: 1, a: 1 };
    }

    // =======================================================================
    //  TEXTURE MANAGEMENT
    // =======================================================================

    /**
     * Create a WebGL texture from an image, canvas, or video element.
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} source
     * @param {boolean} [smooth=false] - Use LINEAR filtering (true) or NEAREST (false)
     * @returns {WebGLTexture|null}
     */
    createTextureFromSource(source, smooth = false) {
        if (!this.gl || this._fallbackMode) return null;
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const filter = smooth ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        // Restore current batch texture
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
        this._managedTextures.push(tex);
        return tex;
    }

    /**
     * Re-upload data to an existing texture (e.g. canvas content changed).
     * @param {WebGLTexture} texture
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} source
     */
    updateTexture(texture, source) {
        if (!this.gl || this._fallbackMode) return;
        this.flush();
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
    }

    /**
     * Delete a WebGL texture and free its GPU memory.
     * @param {WebGLTexture} texture
     */
    deleteTexture(texture) {
        if (!this.gl || !texture) return;
        this.gl.deleteTexture(texture);
        const idx = this._managedTextures.indexOf(texture);
        if (idx >= 0) this._managedTextures.splice(idx, 1);
    }

    // =======================================================================
    //  TEXTURE & BLEND STATE
    // =======================================================================

    /** Bind a texture for upcoming batch vertices. Flushes if texture changes. */
    _bindTexture(texture) {
        if (this._currentTexture !== texture) {
            this.flush();
            this._currentTexture = texture;
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        }
    }

    /** Ensure the white pixel texture is bound (for solid-color geometry). */
    _useColorMode() {
        this._bindTexture(this._whitePixelTex);
    }

    // =======================================================================
    //  BATCH: ADD VERTEX & FLUSH
    // =======================================================================

    /** Add one vertex to the current batch. Auto-flushes when full. */
    _addVertex(x, y, u, v, r, g, b, a) {
        if (this._batchCount >= this._maxBatchSize) {
            this.flush();
        }
        const i = this._batchCount * 8;
        this._batchVertices[i]     = x;
        this._batchVertices[i + 1] = y;
        this._batchVertices[i + 2] = u;
        this._batchVertices[i + 3] = v;
        this._batchVertices[i + 4] = r;
        this._batchVertices[i + 5] = g;
        this._batchVertices[i + 6] = b;
        this._batchVertices[i + 7] = a;
        this._batchCount++;
    }

    /** Flush the current batch to the GPU as TRIANGLES. */
    flush() {
        if (this._fallbackMode || this._batchCount === 0) return;
        const gl = this.gl;

        gl.useProgram(this._shaderProgram);
        gl.uniform2f(this._resolutionLoc, this.width, this.height);
        gl.uniform1i(this._textureLoc, 0);

        gl.bindVertexArray(this._batchVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._batchVertices.subarray(0, this._batchCount * 8));

        gl.drawArrays(gl.TRIANGLES, 0, this._batchCount);

        gl.bindVertexArray(null);
        this._batchCount = 0;
    }

    // =======================================================================
    //  PUBLIC BATCH HELPERS (used by GPURenderer)
    // =======================================================================

    /**
     * Add a solid-color triangle to the batch.
     * Automatically binds the white pixel texture.
     */
    addColoredTriangle(x0, y0, x1, y1, x2, y2, r, g, b, a) {
        this._useColorMode();
        this._addVertex(x0, y0, 0.5, 0.5, r, g, b, a);
        this._addVertex(x1, y1, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2, y2, 0.5, 0.5, r, g, b, a);
    }

    /**
     * Add a solid-color quad (2 triangles) to the batch.
     * Vertices should be in order: top-left, top-right, bottom-right, bottom-left.
     */
    addColoredQuad(x0, y0, x1, y1, x2, y2, x3, y3, r, g, b, a) {
        this._useColorMode();
        this._addVertex(x0, y0, 0.5, 0.5, r, g, b, a);
        this._addVertex(x1, y1, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2, y2, 0.5, 0.5, r, g, b, a);
        this._addVertex(x0, y0, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2, y2, 0.5, 0.5, r, g, b, a);
        this._addVertex(x3, y3, 0.5, 0.5, r, g, b, a);
    }

    /**
     * Add a textured quad (2 triangles) to the batch.
     * Binds the given texture (flushes if different from current).
     * @param {WebGLTexture} texture - WebGL texture handle
     * @param {number} texW - Full texture width in pixels
     * @param {number} texH - Full texture height in pixels
     * @param {number} sx - Source rect X
     * @param {number} sy - Source rect Y
     * @param {number} sw - Source rect width
     * @param {number} sh - Source rect height
     * @param {number} x0..y3 - Transformed destination quad corners (TL, TR, BR, BL)
     * @param {number} r,g,b,a - Tint color (1,1,1,alpha for no tint)
     */
    drawTexturedQuad(texture, texW, texH, sx, sy, sw, sh,
                     x0, y0, x1, y1, x2, y2, x3, y3,
                     r, g, b, a) {
        this._bindTexture(texture);
        const u0 = sx / texW;
        const v0 = sy / texH;
        const u1 = (sx + sw) / texW;
        const v1 = (sy + sh) / texH;
        // Tri 1: TL, TR, BR
        this._addVertex(x0, y0, u0, v0, r, g, b, a);
        this._addVertex(x1, y1, u1, v0, r, g, b, a);
        this._addVertex(x2, y2, u1, v1, r, g, b, a);
        // Tri 2: TL, BR, BL
        this._addVertex(x0, y0, u0, v0, r, g, b, a);
        this._addVertex(x2, y2, u1, v1, r, g, b, a);
        this._addVertex(x3, y3, u0, v1, r, g, b, a);
    }

    /**
     * Add a textured triangle to the batch.
     * Binds the given texture (flushes if different from current).
     * @param {WebGLTexture} texture - WebGL texture handle
     * @param {number} x0,y0 - Vertex 0 position
     * @param {number} u0,v0 - Vertex 0 UV
     * @param {number} x1,y1 - Vertex 1 position
     * @param {number} u1,v1 - Vertex 1 UV
     * @param {number} x2,y2 - Vertex 2 position
     * @param {number} u2,v2 - Vertex 2 UV
     * @param {number} r,g,b,a - Tint color (1,1,1,alpha for no tint)
     */
    drawTexturedTriangle(texture, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2, r, g, b, a) {
        this._bindTexture(texture);
        this._addVertex(x0, y0, u0, v0, r, g, b, a);
        this._addVertex(x1, y1, u1, v1, r, g, b, a);
        this._addVertex(x2, y2, u2, v2, r, g, b, a);
    }

    /**
     * Draw a line as a quad (2 triangles). Handles width correctly.
     * @param {number} x1,y1 - Start
     * @param {number} x2,y2 - End
     * @param {number} r,g,b,a - Color components (0-1)
     * @param {number} width - Line width in pixels
     */
    addLineQuad(x1, y1, x2, y2, r, g, b, a, width) {
        this._useColorMode();
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) return;
        const hw = Math.max(width, 1) * 0.5;
        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;
        // 4 corners of the line quad
        this._addVertex(x1 + nx, y1 + ny, 0.5, 0.5, r, g, b, a);
        this._addVertex(x1 - nx, y1 - ny, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2 - nx, y2 - ny, 0.5, 0.5, r, g, b, a);
        this._addVertex(x1 + nx, y1 + ny, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2 - nx, y2 - ny, 0.5, 0.5, r, g, b, a);
        this._addVertex(x2 + nx, y2 + ny, 0.5, 0.5, r, g, b, a);
    }

    // =======================================================================
    //  DRAWING COMMANDS (backward-compatible API, now triangle-based)
    // =======================================================================

    /** Clear the entire surface (or fill with a color). */
    clear(color = null) {
        if (this._fallbackMode) {
            if (color) { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, this.width, this.height); }
            else this.ctx.clearRect(0, 0, this.width, this.height);
            return;
        }
        this.flush();
        const gl = this.gl;
        if (color) {
            const c = this._parseColor(color);
            gl.clearColor(c.r, c.g, c.b, c.a);
        } else {
            gl.clearColor(0, 0, 0, 0);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /** Fill the entire surface with a color. */
    fill(color) { this.clear(color); }

    /** Draw a single pixel as a tiny quad. */
    drawPixel(x, y, color = '#ffffff') {
        if (this._fallbackMode) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
            return;
        }
        const c = this._parseColor(color);
        const px = Math.floor(x), py = Math.floor(y);
        const a = c.a * this._globalAlpha;
        this._useColorMode();
        // 1×1 quad = 2 triangles
        this._addVertex(px, py, 0.5, 0.5, c.r, c.g, c.b, a);
        this._addVertex(px+1, py, 0.5, 0.5, c.r, c.g, c.b, a);
        this._addVertex(px+1, py+1, 0.5, 0.5, c.r, c.g, c.b, a);
        this._addVertex(px, py, 0.5, 0.5, c.r, c.g, c.b, a);
        this._addVertex(px+1, py+1, 0.5, 0.5, c.r, c.g, c.b, a);
        this._addVertex(px, py+1, 0.5, 0.5, c.r, c.g, c.b, a);
    }

    /** Draw multiple pixels at once. */
    drawPixels(pixels) {
        if (this._fallbackMode) {
            for (const p of pixels) {
                this.ctx.fillStyle = p.color || `rgba(${p.r},${p.g},${p.b},${p.a||1})`;
                this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
            }
            return;
        }
        this._useColorMode();
        for (const p of pixels) {
            let r, g, b, a;
            if (p.color) {
                const c = this._parseColor(p.color);
                r = c.r; g = c.g; b = c.b; a = c.a;
            } else {
                r = (p.r||0)/255; g = (p.g||0)/255; b = (p.b||0)/255;
                a = p.a !== undefined ? p.a/255 : 1;
            }
            a *= this._globalAlpha;
            const px = Math.floor(p.x), py = Math.floor(p.y);
            this._addVertex(px, py, 0.5, 0.5, r, g, b, a);
            this._addVertex(px+1, py, 0.5, 0.5, r, g, b, a);
            this._addVertex(px+1, py+1, 0.5, 0.5, r, g, b, a);
            this._addVertex(px, py, 0.5, 0.5, r, g, b, a);
            this._addVertex(px+1, py+1, 0.5, 0.5, r, g, b, a);
            this._addVertex(px, py+1, 0.5, 0.5, r, g, b, a);
        }
    }

    /** Draw a line as a quad (proper thick-line rendering). */
    drawLine(x1, y1, x2, y2, color = '#ffffff', width = 1) {
        if (this._fallbackMode) {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            return;
        }
        const c = this._parseColor(color);
        const a = c.a * this._globalAlpha;
        this.addLineQuad(x1, y1, x2, y2, c.r, c.g, c.b, a, width);
    }

    /** Draw a filled and/or stroked rectangle. */
    drawRect(x, y, w, h, fillColor = null, strokeColor = null, strokeWidth = 1) {
        if (this._fallbackMode) {
            if (fillColor) { this.ctx.fillStyle = fillColor; this.ctx.fillRect(x, y, w, h); }
            if (strokeColor) { this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = strokeWidth; this.ctx.strokeRect(x, y, w, h); }
            return;
        }
        if (fillColor) {
            const c = this._parseColor(fillColor);
            const a = c.a * this._globalAlpha;
            this.addColoredQuad(x, y, x+w, y, x+w, y+h, x, y+h, c.r, c.g, c.b, a);
        }
        if (strokeColor) {
            const c = this._parseColor(strokeColor);
            const a = c.a * this._globalAlpha;
            const sw = strokeWidth;
            this.addLineQuad(x, y, x+w, y, c.r, c.g, c.b, a, sw);
            this.addLineQuad(x+w, y, x+w, y+h, c.r, c.g, c.b, a, sw);
            this.addLineQuad(x+w, y+h, x, y+h, c.r, c.g, c.b, a, sw);
            this.addLineQuad(x, y+h, x, y, c.r, c.g, c.b, a, sw);
        }
    }

    /** Draw a rectangle centered on a point. */
    drawRectCentered(x, y, w, h, fillColor = null, strokeColor = null, strokeWidth = 1) {
        this.drawRect(x - w/2, y - h/2, w, h, fillColor, strokeColor, strokeWidth);
    }

    /** Draw a circle using triangle fan (fill) and annulus quads (stroke). */
    drawCircle(cx, cy, radius, fillColor = null, strokeColor = null, strokeWidth = 1) {
        if (this._fallbackMode) {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            if (fillColor) { this.ctx.fillStyle = fillColor; this.ctx.fill(); }
            if (strokeColor) { this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = strokeWidth; this.ctx.stroke(); }
            return;
        }
        const segs = Math.max(16, Math.min(128, Math.ceil(radius * 1.5)));
        const step = (Math.PI * 2) / segs;

        if (fillColor) {
            const c = this._parseColor(fillColor);
            const a = c.a * this._globalAlpha;
            this._useColorMode();
            for (let i = 0; i < segs; i++) {
                const a0 = i * step, a1 = (i + 1) * step;
                this._addVertex(cx, cy, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx + Math.cos(a0)*radius, cy + Math.sin(a0)*radius, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx + Math.cos(a1)*radius, cy + Math.sin(a1)*radius, 0.5, 0.5, c.r, c.g, c.b, a);
            }
        }

        if (strokeColor) {
            const c = this._parseColor(strokeColor);
            const a = c.a * this._globalAlpha;
            const hw = strokeWidth / 2;
            const ir = Math.max(0, radius - hw), or = radius + hw;
            this._useColorMode();
            for (let i = 0; i < segs; i++) {
                const a0 = i * step, a1 = (i + 1) * step;
                const c0 = Math.cos(a0), s0 = Math.sin(a0);
                const c1 = Math.cos(a1), s1 = Math.sin(a1);
                this._addVertex(cx+c0*ir, cy+s0*ir, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+c0*or, cy+s0*or, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+c1*or, cy+s1*or, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+c0*ir, cy+s0*ir, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+c1*or, cy+s1*or, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+c1*ir, cy+s1*ir, 0.5, 0.5, c.r, c.g, c.b, a);
            }
        }
    }

    /** Draw an ellipse using triangle fan. */
    drawEllipse(cx, cy, radiusX, radiusY, fillColor = null, strokeColor = null, strokeWidth = 1) {
        if (this._fallbackMode) {
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
            if (fillColor) { this.ctx.fillStyle = fillColor; this.ctx.fill(); }
            if (strokeColor) { this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = strokeWidth; this.ctx.stroke(); }
            return;
        }
        const segs = Math.max(16, Math.min(128, Math.ceil(Math.max(radiusX, radiusY) * 1.5)));
        const step = (Math.PI * 2) / segs;

        if (fillColor) {
            const c = this._parseColor(fillColor);
            const a = c.a * this._globalAlpha;
            this._useColorMode();
            for (let i = 0; i < segs; i++) {
                const a0 = i * step, a1 = (i + 1) * step;
                this._addVertex(cx, cy, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+Math.cos(a0)*radiusX, cy+Math.sin(a0)*radiusY, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+Math.cos(a1)*radiusX, cy+Math.sin(a1)*radiusY, 0.5, 0.5, c.r, c.g, c.b, a);
            }
        }

        if (strokeColor) {
            const c = this._parseColor(strokeColor);
            const a = c.a * this._globalAlpha;
            const hw = strokeWidth / 2;
            this._useColorMode();
            for (let i = 0; i < segs; i++) {
                const a0 = i * step, a1 = (i + 1) * step;
                const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
                const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
                const irx = Math.max(0, radiusX - hw), iry = Math.max(0, radiusY - hw);
                const orx = radiusX + hw, ory = radiusY + hw;
                this._addVertex(cx+cos0*irx, cy+sin0*iry, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+cos0*orx, cy+sin0*ory, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+cos1*orx, cy+sin1*ory, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+cos0*irx, cy+sin0*iry, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+cos1*orx, cy+sin1*ory, 0.5, 0.5, c.r, c.g, c.b, a);
                this._addVertex(cx+cos1*irx, cy+sin1*iry, 0.5, 0.5, c.r, c.g, c.b, a);
            }
        }
    }

    /** Draw a triangle (fill and/or stroke). */
    drawTriangle(x1, y1, x2, y2, x3, y3, fillColor = null, strokeColor = null, strokeWidth = 1) {
        if (this._fallbackMode) {
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.lineTo(x3, y3);
            this.ctx.closePath();
            if (fillColor) { this.ctx.fillStyle = fillColor; this.ctx.fill(); }
            if (strokeColor) { this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = strokeWidth; this.ctx.stroke(); }
            return;
        }
        if (fillColor) {
            const c = this._parseColor(fillColor);
            const a = c.a * this._globalAlpha;
            this.addColoredTriangle(x1, y1, x2, y2, x3, y3, c.r, c.g, c.b, a);
        }
        if (strokeColor) {
            const c = this._parseColor(strokeColor);
            const a = c.a * this._globalAlpha;
            this.addLineQuad(x1, y1, x2, y2, c.r, c.g, c.b, a, strokeWidth);
            this.addLineQuad(x2, y2, x3, y3, c.r, c.g, c.b, a, strokeWidth);
            this.addLineQuad(x3, y3, x1, y1, c.r, c.g, c.b, a, strokeWidth);
        }
    }

    // =======================================================================
    //  PIXEL MANIPULATION
    // =======================================================================

    /** Get pixel at (x, y) → {r, g, b, a} (0-255). */
    getPixel(x, y) {
        if (this._fallbackMode) {
            const d = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            return { r: d[0], g: d[1], b: d[2], a: d[3] };
        }
        this.flush();
        const gl = this.gl;
        const px = new Uint8Array(4);
        gl.readPixels(Math.floor(x), this.height - Math.floor(y) - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return { r: px[0], g: px[1], b: px[2], a: px[3] };
    }

    /** Create a blank ImageData for this surface's dimensions (or custom size). */
    createImageData(w = this.width, h = this.height) {
        if (this._fallbackMode) return this.ctx.createImageData(w, h);
        return new ImageData(w, h);
    }

    /** Get ImageData for a region. */
    getImageData(x = 0, y = 0, w = this.width, h = this.height) {
        if (this._fallbackMode) return this.ctx.getImageData(x, y, w, h);
        this.flush();
        const gl = this.gl;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(x, this.height - y - h, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const flipped = new Uint8ClampedArray(w * h * 4);
        for (let row = 0; row < h; row++) {
            const src = (h - 1 - row) * w * 4;
            const dst = row * w * 4;
            flipped.set(pixels.subarray(src, src + w * 4), dst);
        }
        return new ImageData(flipped, w, h);
    }

    /** Put ImageData onto the surface. */
    putImageData(imageData, x = 0, y = 0) {
        if (this._fallbackMode) { this.ctx.putImageData(imageData, x, y); return; }
        this.flush();
        const gl = this.gl;
        const w = imageData.width, h = imageData.height;
        const tempTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tempTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);

        gl.useProgram(this._positionedTexShader);
        gl.uniform2f(this._posTexResolutionLoc, this.width, this.height);
        gl.uniform2f(this._posTexDestPosLoc, x, y);
        gl.uniform2f(this._posTexDestSizeLoc, w, h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tempTex);
        gl.bindVertexArray(this._posQuadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
        gl.deleteTexture(tempTex);

        // Restore batch texture binding
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
    }

    // =======================================================================
    //  EFFECT APPLICATION
    // =======================================================================

    hasGPUEffects() {
        return !this._fallbackMode && this._effectShaders && Object.keys(this._effectShaders).length > 0;
    }

    applyEffect(effectName, uniforms = {}) {
        if (this._fallbackMode || !this._effectShaders[effectName]) {
            console.warn(`GPUSurface: Effect '${effectName}' not available`);
            return;
        }
        this.flush();
        const gl = this.gl;
        const shader = this._effectShaders[effectName];

        // Copy current framebuffer contents to effect texture
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);

        // Ensure we're drawing to the default framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        
        // Disable blending for effect pass - fullscreen quad overwrites everything
        gl.disable(gl.BLEND);

        gl.useProgram(shader);
        const resLoc = gl.getUniformLocation(shader, 'u_resolution');
        if (resLoc) gl.uniform2f(resLoc, this.width, this.height);
        const texLoc = gl.getUniformLocation(shader, 'u_texture');
        if (texLoc) gl.uniform1i(texLoc, 0);

        for (const [name, value] of Object.entries(uniforms)) {
            const loc = gl.getUniformLocation(shader, 'u_' + name);
            if (!loc) continue;
            if (typeof value === 'number') gl.uniform1f(loc, value);
            else if (Array.isArray(value)) {
                if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
                else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
                else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
            }
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.bindVertexArray(this._quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        // Restore state
        gl.enable(gl.BLEND);
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
    }

    applyChromatic(amount) { this.applyEffect('chromatic', { amount }); }
    applyCRT(amount) { this.applyEffect('crt', { amount }); }
    applyPosterize(levels) { this.applyEffect('posterize', { levels }); }
    applyThermal() { this.applyEffect('thermal', {}); }
    applyGradientMap(colorA, colorB) { this.applyEffect('gradientMap', { colorA, colorB }); }
    applyNoise(amount, mono = true, time = 0) { this.applyEffect('noise', { amount, mono: mono ? 1 : 0, time }); }
    applyChannelShift(shiftX, shiftY) { this.applyEffect('channelShift', { shift: [shiftX, shiftY] }); }
    applySharpen(amount) { this.applyEffect('sharpen', { amount }); }
    applyEdgeDetect(threshold, edgeColor, bgColor) { this.applyEffect('edgeDetect', { threshold, edgeColor, bgColor }); }
    applyDither(levels) { this.applyEffect('dither', { levels }); }
    applyPixelate(blockSize) { this.applyEffect('pixelate', { blockSize }); }
    applyBlurPass(offset) { this.applyEffect('blur', { offset }); }
    applyBlur(passes) { for (let i = 0; i < passes; i++) this.applyBlurPass(i + 0.5); }
    applyGlitch(intensity, time) { this.applyEffect('glitch', { intensity, time }); }

    applyColorGrade(options = {}) {
        this.applyEffect('colorGrade', {
            brightness: options.brightness || 0,
            contrast: options.contrast !== undefined ? options.contrast : 1,
            saturation: options.saturation !== undefined ? options.saturation : 1,
            grayscaleAmt: options.grayscale || 0,
            sepiaAmt: options.sepia || 0,
            invertAmt: options.invert || 0
        });
    }

    applyBloom(threshold, intensity, blurPasses) {
        if (this._fallbackMode) return;
        this.flush();
        const gl = this.gl;

        // Copy current canvas → tex1 (original)
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);

        // Extract bright pixels → FBO2
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO2);
        gl.viewport(0, 0, this.width, this.height);
        const ext = this._effectShaders.bloomExtract;
        gl.useProgram(ext);
        gl.uniform1i(gl.getUniformLocation(ext, 'u_texture'), 0);
        gl.uniform1f(gl.getUniformLocation(ext, 'u_threshold'), threshold);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.bindVertexArray(this._quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Blur bright pixels (ping-pong FBO1 ↔ FBO2)
        const blurS = this._effectShaders.blur;
        gl.useProgram(blurS);
        const bResLoc = gl.getUniformLocation(blurS, 'u_resolution');
        const bOffLoc = gl.getUniformLocation(blurS, 'u_offset');
        gl.uniform2f(bResLoc, this.width, this.height);

        for (let i = 0; i < blurPasses; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO1);
            gl.bindTexture(gl.TEXTURE_2D, this._effectTex2);
            gl.uniform1f(bOffLoc, i + 0.5);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO2);
            gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
            gl.uniform1f(bOffLoc, i + 1.0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Combine: original (tex1) + bloom (tex2) → canvas
        // Re-copy original since tex1 was used during blur
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._effectFBO1);
        gl.viewport(0, 0, this.width, this.height);
        const copyS = this._effectShaders.copy;
        gl.useProgram(copyS);
        gl.uniform1i(gl.getUniformLocation(copyS, 'u_texture'), 0);
        // We need to read from the canvas (original) - copy it again
        // First render canvas to a temp read via copyTexImage on effectTex1
        // Actually: we saved original in tex1 initially, but blur overwrote it
        // Solution: copy canvas to tex1 again before combine
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);

        // Now combine
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        const combS = this._effectShaders.bloomCombine;
        gl.useProgram(combS);
        gl.uniform1i(gl.getUniformLocation(combS, 'u_texture'), 0);
        gl.uniform1i(gl.getUniformLocation(combS, 'u_bloomTexture'), 1);
        gl.uniform1f(gl.getUniformLocation(combS, 'u_intensity'), intensity);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._effectTex2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        // Reset state
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
    }

    applyEffectChain(effects) {
        if (this._fallbackMode || effects.length === 0) return;
        for (const effect of effects) {
            if (effect.name === 'bloom') {
                this.applyBloom(effect.uniforms.threshold || 200, effect.uniforms.intensity || 0.6, effect.uniforms.blurPasses || 4);
            } else if (effect.name === 'blur' && effect.uniforms.passes) {
                this.applyBlur(effect.uniforms.passes);
            } else {
                this.applyEffect(effect.name, effect.uniforms);
            }
        }
    }

    // =======================================================================
    //  STATE
    // =======================================================================

    setAlpha(alpha) {
        this._globalAlpha = Math.max(0, Math.min(1, alpha));
        if (this._fallbackMode) this.ctx.globalAlpha = this._globalAlpha;
    }

    resetAlpha() {
        this._globalAlpha = 1.0;
        if (this._fallbackMode) this.ctx.globalAlpha = 1;
    }

    setColor(color) {
        this._currentColor = this._parseColor(color);
        if (this._fallbackMode) { this.ctx.fillStyle = color; this.ctx.strokeStyle = color; }
    }

    /** Set blend mode (GameMaker-style, maps to WebGL blend functions) */
    setBlendMode(mode) {
        if (this._currentBlendMode === mode) return;
        this.flush();
        this._currentBlendMode = mode;
        const gl = this.gl;
        if (!gl) {
            if (this._fallbackMode && this.ctx) this.ctx.globalCompositeOperation = mode;
            return;
        }
        switch (mode) {
            case 'source-over':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); break;
            case 'lighter':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE); break;
            case 'multiply':
                gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); break;
            case 'screen':
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR); break;
            case 'destination-over':
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE); break;
            case 'destination-in':
                gl.blendFunc(gl.ZERO, gl.SRC_ALPHA); break;
            case 'destination-out':
                gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); break;
            case 'source-atop':
                gl.blendFunc(gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA); break;
            case 'destination-atop':
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.SRC_ALPHA); break;
            case 'xor':
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA); break;
            case 'copy':
                gl.blendFunc(gl.ONE, gl.ZERO); break;
            default:
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); break;
        }
    }

    /** Reset blend mode to normal */
    resetBlendMode() {
        this.setBlendMode('source-over');
    }

    /** Set line width for stroke operations */
    setLineWidth(width) {
        this._lineWidth = width;
        if (this._fallbackMode) this.ctx.lineWidth = width;
    }

    /** Set font for text rendering */
    setFont(font) {
        this._font = font;
        if (this._fallbackMode) this.ctx.font = font;
    }

    /** Set text alignment */
    setTextAlign(align) {
        this._textAlign = align;
        if (this._fallbackMode) this.ctx.textAlign = align;
    }

    /** Set text baseline */
    setTextBaseline(baseline) {
        this._textBaseline = baseline;
        if (this._fallbackMode) this.ctx.textBaseline = baseline;
    }

    /** Set image smoothing (anti-aliasing for scaled images) */
    setSmoothing(enabled) {
        this._smoothing = enabled;
        if (this._fallbackMode) this.ctx.imageSmoothingEnabled = enabled;
    }

    /** Set shadow */
    setShadow(color, blur, offsetX = 0, offsetY = 0) {
        this._shadowColor = color;
        this._shadowBlur = blur;
        this._shadowOffsetX = offsetX;
        this._shadowOffsetY = offsetY;
        if (this._fallbackMode) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = blur;
            this.ctx.shadowOffsetX = offsetX;
            this.ctx.shadowOffsetY = offsetY;
        }
    }

    /** Clear shadow */
    clearShadow() {
        this._shadowColor = 'transparent';
        this._shadowBlur = 0;
        this._shadowOffsetX = 0;
        this._shadowOffsetY = 0;
        if (this._fallbackMode) {
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }
    }

    /** Save state (for fallback mode and state tracking) */
    save() {
        this._stateStack = this._stateStack || [];
        this._stateStack.push({
            globalAlpha: this._globalAlpha,
            blendMode: this._currentBlendMode,
            lineWidth: this._lineWidth,
            font: this._font,
            textAlign: this._textAlign,
            textBaseline: this._textBaseline,
            smoothing: this._smoothing
        });
        if (this._fallbackMode) this.ctx.save();
    }

    /** Restore state */
    restore() {
        if (!this._stateStack || this._stateStack.length === 0) return;
        const s = this._stateStack.pop();
        this._globalAlpha = s.globalAlpha;
        if (s.blendMode !== this._currentBlendMode) this.setBlendMode(s.blendMode);
        this._lineWidth = s.lineWidth;
        this._font = s.font;
        this._textAlign = s.textAlign;
        this._textBaseline = s.textBaseline;
        this._smoothing = s.smoothing;
        if (this._fallbackMode) this.ctx.restore();
    }

    /** Translate (fallback mode only - GPU mode ignores transforms, uses absolute coords) */
    translate(x, y) {
        if (this._fallbackMode) this.ctx.translate(x, y);
    }

    /** Rotate (fallback mode only) */
    rotate(angle) {
        if (this._fallbackMode) this.ctx.rotate(angle);
    }

    /** Scale (fallback mode only) */
    scale(sx, sy) {
        if (this._fallbackMode) this.ctx.scale(sx, sy !== undefined ? sy : sx);
    }

    /** Reset transform */
    resetTransform() {
        if (this._fallbackMode) this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /** Draw text onto the surface */
    drawText(text, x, y, color = '#ffffff', font = '16px sans-serif', align = 'left') {
        if (this._fallbackMode) {
            this.ctx.fillStyle = color;
            this.ctx.font = font;
            this.ctx.textAlign = align;
            this.ctx.fillText(text, x, y);
            return;
        }
        // GPU mode: render text via temporary canvas + texture upload
        this.flush();
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = font;
        const metrics = tempCtx.measureText(text);
        const fontSize = parseInt(font, 10) || 16;
        const textW = Math.ceil(metrics.width) + 4;
        const textH = fontSize * 2;
        tempCanvas.width = textW;
        tempCanvas.height = textH;
        tempCtx.font = font;
        tempCtx.textAlign = 'left';
        tempCtx.textBaseline = 'top';
        tempCtx.fillStyle = color;
        tempCtx.fillText(text, 2, 2);

        // Alignment offset
        let alignOffsetX = 0;
        if (align === 'center') alignOffsetX = -textW / 2;
        else if (align === 'right' || align === 'end') alignOffsetX = -textW;

        const imageData = tempCtx.getImageData(0, 0, textW, textH);
        this.putImageData(imageData, Math.floor(x + alignOffsetX), Math.floor(y - fontSize));
    }

    /** Draw a rounded rectangle (fill and/or stroke) */
    drawRoundRect(x, y, w, h, radius, fillColor = null, strokeColor = null, strokeWidth = 1) {
        if (this._fallbackMode) {
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, w, h, radius);
            if (fillColor) { this.ctx.fillStyle = fillColor; this.ctx.fill(); }
            if (strokeColor) { this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = strokeWidth; this.ctx.stroke(); }
            return;
        }
        // Approximate rounded rect as regular rect + corner arcs via triangle fan
        const r = Math.min(radius, w / 2, h / 2);
        if (fillColor) {
            const c = this._parseColor(fillColor);
            const a = c.a * this._globalAlpha;
            // Center rect
            this.addColoredQuad(x + r, y, x + w - r, y, x + w - r, y + h, x + r, y + h, c.r, c.g, c.b, a);
            // Left rect
            this.addColoredQuad(x, y + r, x + r, y + r, x + r, y + h - r, x, y + h - r, c.r, c.g, c.b, a);
            // Right rect
            this.addColoredQuad(x + w - r, y + r, x + w, y + r, x + w, y + h - r, x + w - r, y + h - r, c.r, c.g, c.b, a);
            // 4 corner arcs (triangle fan)
            const segs = Math.max(4, Math.ceil(r * 0.8));
            const corners = [
                { cx: x + w - r, cy: y + r, start: -Math.PI / 2, end: 0 },
                { cx: x + w - r, cy: y + h - r, start: 0, end: Math.PI / 2 },
                { cx: x + r, cy: y + h - r, start: Math.PI / 2, end: Math.PI },
                { cx: x + r, cy: y + r, start: Math.PI, end: Math.PI * 1.5 }
            ];
            this._useColorMode();
            for (const corner of corners) {
                const step = (corner.end - corner.start) / segs;
                for (let i = 0; i < segs; i++) {
                    const a0 = corner.start + i * step;
                    const a1 = corner.start + (i + 1) * step;
                    this._addVertex(corner.cx, corner.cy, 0.5, 0.5, c.r, c.g, c.b, a);
                    this._addVertex(corner.cx + Math.cos(a0) * r, corner.cy + Math.sin(a0) * r, 0.5, 0.5, c.r, c.g, c.b, a);
                    this._addVertex(corner.cx + Math.cos(a1) * r, corner.cy + Math.sin(a1) * r, 0.5, 0.5, c.r, c.g, c.b, a);
                }
            }
        }
        if (strokeColor) {
            const c = this._parseColor(strokeColor);
            const a = c.a * this._globalAlpha;
            // Stroke the straight edges
            this.addLineQuad(x + r, y, x + w - r, y, c.r, c.g, c.b, a, strokeWidth);
            this.addLineQuad(x + w, y + r, x + w, y + h - r, c.r, c.g, c.b, a, strokeWidth);
            this.addLineQuad(x + w - r, y + h, x + r, y + h, c.r, c.g, c.b, a, strokeWidth);
            this.addLineQuad(x, y + h - r, x, y + r, c.r, c.g, c.b, a, strokeWidth);
            // Stroke corner arcs
            const segs = Math.max(4, Math.ceil(r * 0.8));
            const corners = [
                { cx: x + w - r, cy: y + r, start: -Math.PI / 2, end: 0 },
                { cx: x + w - r, cy: y + h - r, start: 0, end: Math.PI / 2 },
                { cx: x + r, cy: y + h - r, start: Math.PI / 2, end: Math.PI },
                { cx: x + r, cy: y + r, start: Math.PI, end: Math.PI * 1.5 }
            ];
            for (const corner of corners) {
                const step = (corner.end - corner.start) / segs;
                for (let i = 0; i < segs; i++) {
                    const a0 = corner.start + i * step;
                    const a1 = corner.start + (i + 1) * step;
                    this.addLineQuad(
                        corner.cx + Math.cos(a0) * r, corner.cy + Math.sin(a0) * r,
                        corner.cx + Math.cos(a1) * r, corner.cy + Math.sin(a1) * r,
                        c.r, c.g, c.b, a, strokeWidth
                    );
                }
            }
        }
    }

    // =======================================================================
    //  SURFACE OPERATIONS
    // =======================================================================

    resize(width, height) {
        if (this._freed) return;
        this.flush();
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        if (this._fallbackMode) return;
        const gl = this.gl;
        gl.viewport(0, 0, width, height);
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        if (this._effectTex1) {
            gl.bindTexture(gl.TEXTURE_2D, this._effectTex1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        if (this._effectTex2) {
            gl.bindTexture(gl.TEXTURE_2D, this._effectTex2);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        gl.bindTexture(gl.TEXTURE_2D, this._currentTexture);
    }

    getWidth() { return this.width; }
    getHeight() { return this.height; }

    toDataURL(type = 'image/png', quality = 1.0) {
        this.flush();
        return this.canvas.toDataURL(type, quality);
    }

    toImage() {
        const img = new Image();
        img.src = this.toDataURL();
        return img;
    }

    drawSurface(source, x, y, width = null, height = null) {
        if (this._fallbackMode) {
            const sc = source.canvas || source;
            this.ctx.drawImage(sc, x, y, width || sc.width, height || sc.height);
            return;
        }
        const sc = source.canvas || source;
        const w = width || sc.width;
        const h = height || sc.height;

        // Use texture upload for GPU
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sc, 0, 0, sc.width, sc.height, 0, 0, w, h);
        const imageData = tempCtx.getImageData(0, 0, w, h);
        this.putImageData(imageData, x, y);
    }

    drawSprite(image, x, y, width = null, height = null, angle = 0) {
        if (this._fallbackMode) {
            const img = typeof image === 'string' ? (window._currentEngine?.assets.getImage(image)) : image;
            if (!img) return;
            this.ctx.save();
            this.ctx.translate(x, y);
            if (angle) this.ctx.rotate(angle);
            const w = width || img.width || img.naturalWidth;
            const h = height || img.height || img.naturalHeight;
            this.ctx.drawImage(img, -w/2, -h/2, w, h);
            this.ctx.restore();
            return;
        }
        let img;
        if (typeof image === 'string') img = window._currentEngine?.assets.getImage(image);
        else img = image;
        if (!img) return;
        const w = width || img.width || img.naturalWidth;
        const h = height || img.height || img.naturalHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.save();
        tempCtx.translate(w/2, h/2);
        if (angle) tempCtx.rotate(angle);
        tempCtx.drawImage(img, -w/2, -h/2, w, h);
        tempCtx.restore();
        const imageData = tempCtx.getImageData(0, 0, w, h);
        this.putImageData(imageData, x - w/2, y - h/2);
    }

    // =======================================================================
    //  CLEANUP
    // =======================================================================

    free() {
        if (this._freed) return;
        this._freed = true;
        if (this._fallbackMode) {
            this.canvas.width = 0; this.canvas.height = 0; this.ctx = null;
            return;
        }
        const gl = this.gl;

        // Batch resources
        if (this._vertexBuffer) { gl.deleteBuffer(this._vertexBuffer); this._vertexBuffer = null; }
        if (this._batchVAO) { gl.deleteVertexArray(this._batchVAO); this._batchVAO = null; }
        if (this._shaderProgram) { gl.deleteProgram(this._shaderProgram); this._shaderProgram = null; }
        if (this._whitePixelTex) { gl.deleteTexture(this._whitePixelTex); this._whitePixelTex = null; }

        // Texture shader resources
        if (this._quadBuffer) { gl.deleteBuffer(this._quadBuffer); this._quadBuffer = null; }
        if (this._quadVAO) { gl.deleteVertexArray(this._quadVAO); this._quadVAO = null; }
        if (this._textureShaderProgram) { gl.deleteProgram(this._textureShaderProgram); this._textureShaderProgram = null; }

        // Positioned texture shader resources
        if (this._posQuadBuffer) { gl.deleteBuffer(this._posQuadBuffer); this._posQuadBuffer = null; }
        if (this._posQuadVAO) { gl.deleteVertexArray(this._posQuadVAO); this._posQuadVAO = null; }
        if (this._positionedTexShader) { gl.deleteProgram(this._positionedTexShader); this._positionedTexShader = null; }

        // Framebuffer
        if (this._texture) { gl.deleteTexture(this._texture); this._texture = null; }
        if (this._framebuffer) { gl.deleteFramebuffer(this._framebuffer); this._framebuffer = null; }

        // Effect resources
        if (this._effectFBO1) { gl.deleteFramebuffer(this._effectFBO1); this._effectFBO1 = null; }
        if (this._effectFBO2) { gl.deleteFramebuffer(this._effectFBO2); this._effectFBO2 = null; }
        if (this._effectTex1) { gl.deleteTexture(this._effectTex1); this._effectTex1 = null; }
        if (this._effectTex2) { gl.deleteTexture(this._effectTex2); this._effectTex2 = null; }
        if (this._effectShaders) {
            for (const s of Object.values(this._effectShaders)) { if (s) gl.deleteProgram(s); }
            this._effectShaders = {};
        }

        // Managed textures
        if (this._managedTextures) {
            for (const t of this._managedTextures) gl.deleteTexture(t);
            this._managedTextures = [];
        }

        this._batchVertices = null;
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.gl = null;
    }

    exists() { return !this._freed && this.canvas.width > 0 && this.canvas.height > 0; }
    isGPUAccelerated() { return !this._fallbackMode; }
}

// =======================================================================
//  GLOBAL HELPER FUNCTIONS
// =======================================================================

function gpuSurfaceCreate(width, height) { return new GPUSurface(width, height); }

function gpuSurfaceDraw(ctx, surface, x, y, width, height) {
    if (!surface || !surface.exists()) return;
    surface.flush();
    const w = width !== undefined ? width : surface.width;
    const h = height !== undefined ? height : surface.height;
    ctx.drawImage(surface.canvas, x, y, w, h);
    if (surface._fallbackMode) {
        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('GPU Not Active', x + w/2, y + h - 8);
        ctx.restore();
    }
}

function gpuSurfaceDrawPart(ctx, surface, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (!surface || !surface.exists()) return;
    surface.flush();
    ctx.drawImage(surface.canvas, sx, sy, sw, sh, dx, dy, dw, dh);
}

function gpuSurfaceFree(surface) { if (surface) surface.free(); }
function gpuSurfaceExists(surface) { return surface != null && surface.exists(); }

function gpuSurfaceCopy(source, destination, x = 0, y = 0) {
    if (!source || !destination) return;
    source.flush();
    destination.drawSurface(source, x, y);
}

// =======================================================================
//  GLOBAL EXPORTS
// =======================================================================

window.GPUSurface = GPUSurface;
window.gpuSurfaceCreate = gpuSurfaceCreate;
window.gpuSurfaceDraw = gpuSurfaceDraw;
window.gpuSurfaceDrawPart = gpuSurfaceDrawPart;
window.gpuSurfaceFree = gpuSurfaceFree;
window.gpuSurfaceExists = gpuSurfaceExists;
window.gpuSurfaceCopy = gpuSurfaceCopy;
