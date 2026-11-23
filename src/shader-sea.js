/**
 * WebGL2 GLSL 300 es 濕水彩霧海、遠岸孤寂燈塔與淺灘鏡面倒影著色器引擎
 * 嚴守 16:9 寬銀幕構圖：地平線 y = 0.58、孤寂燈塔 x = 0.66、
 * 三維慢速旋轉柔和燈塔光柱、水波折影與三套莫蘭迪色票無縫過渡。
 */

const VERT_SRC = `#version 300 es
precision highp float;
const vec2 POS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uFog;        // 海霧濃度 0.0 .. 1.0
uniform float uGrain;      // 紙張水彩微粒強度 0.0 .. 1.0
uniform float uCamShift;   // 側展頁箋時鏡頭左右平順位移（-0.12 .. +0.12）
uniform vec2 uParallax;    // 游標微視差偏移
uniform float uDim;        // 退潮告別漸熄係數（0 = 常態, 1 = 燈火漸微）

uniform vec3 uSkyUpper;
uniform vec3 uSkyMid;
uniform vec3 uHorizon;
uniform vec3 uWaterFar;
uniform vec3 uWaterNear;
uniform vec3 uShore;
uniform vec3 uBeam;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.04 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// 計算天幕濕水彩暈染、遠岸、孤寂燈塔與三維慢速旋轉光柱（供天空與水面倒影共用）
vec3 evalSkyAndCoast(vec2 p, float aspect, float t, float fog, float dim) {
  float horizonY = 0.58;
  float h = clamp(p.y / horizonY, 0.0, 1.0); // 0 = 天頂, 1 = 地平線

  // 1. 濕水彩天幕底層暈染（上層濃霧雲暈 -> 中段青霧 -> 地平線留白光帶）
  float cloud1 = fbm(vec2(p.x * 2.1 - t * 0.012, p.y * 3.2));
  float cloud2 = fbm(vec2(p.x * 4.4 + t * 0.008, p.y * 5.6 + cloud1 * 0.55));
  // 濕紙水彩邊緣微暈效果
  float wash = smoothstep(0.18, 0.84, cloud1 * 0.66 + cloud2 * 0.34);

  vec3 sky = mix(uSkyUpper, uSkyMid, smoothstep(0.0, 0.72, h));
  sky = mix(sky, uHorizon, smoothstep(0.56, 1.0, h) * (0.72 + 0.28 * fog));

  // 右上方燈塔背後集中一層較濃郁的濕水彩暗雲暈，讓柔和光柱自然顯影
  vec2 cloudPivot = vec2((p.x - 0.66) * aspect, p.y - 0.34);
  float behindTowerWash = exp(-dot(cloudPivot * vec2(1.15, 1.85), cloudPivot * vec2(1.15, 1.85)));
  sky = mix(sky, uSkyUpper * 0.90, behindTowerWash * 0.42 * (1.0 - fog * 0.28));

  // 疊加輕柔水彩雲團濃淡層次
  sky = mix(sky, mix(uSkyUpper, uHorizon, 0.46), (wash - 0.5) * 0.24);

  // 2. 左側極遠岸霧中緩坡剪影（0% .. 52% 淡淡淡墨，保留大面積詩意留白）
  float leftHillY = horizonY - 0.022 * exp(-pow((p.x - 0.14) / 0.22, 2.0))
                             - 0.013 * exp(-pow((p.x - 0.36) / 0.16, 2.0))
                             - 0.006 * noise(vec2(p.x * 16.0, 2.1));
  float hillMask = smoothstep(leftHillY - 0.004, leftHillY + 0.003, p.y) * smoothstep(0.56, 0.26, p.x);
  sky = mix(sky, mix(uShore, uHorizon, 0.70 + 0.18 * fog), hillMask * 0.48);

  // 3. 三維慢速旋轉燈塔光柱（角速度 0.14 rad/s，採柔和 screen 疊加絕無生硬三角雷射）
  vec2 lanternPos = vec2(0.66, horizonY - 0.118);
  vec2 dLantern = vec2((p.x - lanternPos.x) * aspect, p.y - lanternPos.y);
  float distL = length(dLantern);

  float yaw = t * 0.14 + 0.55;
  float sinYaw = sin(yaw);
  float cosYaw = cos(yaw);

  // 主光柱朝向隨三維偏航平滑左右擺動，掃向鏡頭時柔散展寬、背離時收斂細長
  vec2 beamDir = normalize(vec2(sinYaw * 0.98 + 0.001, -0.055 - 0.04 * cosYaw));
  float proj = dot(dLantern, beamDir);
  float perp = abs(dLantern.x * (-beamDir.y) + dLantern.y * beamDir.x);

  float coneSpread = mix(0.065, 0.24, smoothstep(-0.2, 1.0, cosYaw));
  float beamWidth = 0.009 + max(0.0, proj) * coneSpread;
  float radialFade = exp(-max(0.0, proj) * mix(1.45, 2.6, fog * 0.55)) * smoothstep(-0.005, 0.035, proj);
  float angularSoft = exp(-pow(perp / beamWidth, 2.0));
  float mistMod = 0.80 + 0.24 * cloud2;
  float mainBeam = radialFade * angularSoft * mistMod * (0.48 + 0.26 * max(0.0, cosYaw));

  // 極柔反向散射餘光
  float backProj = dot(dLantern, -beamDir);
  float backWidth = 0.011 + max(0.0, backProj) * 0.14;
  float backBeam = exp(-max(0.0, backProj) * 4.2) * smoothstep(0.0, 0.02, backProj)
                 * exp(-pow(perp / backWidth, 2.0)) * 0.16;

  // 燈室中心微暈（告別退潮時仍留一點極柔餘溫）
  float lanternHalo = exp(-distL * 24.0) * mix(0.62, 0.22, dim)
                    + exp(-distL * 78.0) * mix(0.95, 0.45, dim);

  float beamIntensity = clamp((mainBeam + backBeam) * (1.0 - dim * 0.88) + lanternHalo * 0.52, 0.0, 0.86);
  // Screen 柔光合成
  sky = 1.0 - (1.0 - sky) * (1.0 - uBeam * beamIntensity * 0.82);

  // 4. 右側低矮濃淡墨洗防波堤（自右緣 1.0 延伸至 0.618 堤端止筆）
  float jettyEdge = smoothstep(0.612, 0.624, p.x);
  float jettyHeight = 0.0135 + 0.003 * smoothstep(0.62, 0.88, p.x) + 0.0018 * noise(vec2(p.x * 48.0, 4.0));
  float jettyTop = horizonY - jettyHeight * jettyEdge;
  float jettyMask = smoothstep(jettyTop - 0.0022, jettyTop + 0.0018, p.y) * jettyEdge;

  // 5. 纖細孤寂燈塔建築剪影（立於 x = 0.66，塔高 0.118，帶微收窄塔身、陽台環與小尖頂）
  float tx = (p.x - 0.66) * aspect;
  float ty = horizonY - 0.012 - p.y; // 由堤面向上算的高度

  float towerMask = 0.0;
  if (ty >= 0.0 && ty <= 0.132) {
    // 錐形收窄塔身（0.00 .. 0.095）
    float halfW = mix(0.0125, 0.0068, clamp(ty / 0.095, 0.0, 1.0));
    float body = (1.0 - smoothstep(halfW - 0.0012, halfW + 0.0012, abs(tx)))
               * step(ty, 0.096);
    // 觀海迴廊外挑線（0.095 .. 0.100）
    float gallery = (1.0 - smoothstep(0.0102, 0.0114, abs(tx)))
                  * step(0.094, ty) * step(ty, 0.1005);
    // 玻璃燈室細柱（0.100 .. 0.113）
    float lanternWall = (1.0 - smoothstep(0.0062, 0.0072, abs(tx)))
                      * step(0.100, ty) * step(ty, 0.113);
    // 尖頂圓帽與避雷細針（0.113 .. 0.130）
    float roofW = max(0.0, 0.0076 * (1.0 - (ty - 0.1125) / 0.0115));
    float roof = (1.0 - smoothstep(roofW - 0.0008, roofW + 0.0008, abs(tx)))
               * step(0.1125, ty) * step(ty, 0.1245);
    float finial = (1.0 - smoothstep(0.0009, 0.0016, abs(tx)))
                 * step(0.123, ty) * step(ty, 0.131);

    towerMask = clamp(body + gallery + roof + finial, 0.0, 1.0);
    // 燈室內部透出柔和暖霜微光
    float glassCore = (1.0 - smoothstep(0.0044, 0.0054, abs(tx)))
                    * step(0.1015, ty) * step(ty, 0.112);
    towerMask = clamp(towerMask + lanternWall * 0.45, 0.0, 1.0);
    if (glassCore > 0.1) {
      sky = mix(sky, uBeam, glassCore * mix(0.95, 0.42, dim));
      towerMask *= (1.0 - glassCore * 0.85);
    }
  }

  float coastMask = clamp(jettyMask + towerMask, 0.0, 1.0);
  // 濃淡墨洗受海霧距離柔化（近堤端微淡、塔身帶極細海霧包覆）
  vec3 inkWash = mix(uShore, uHorizon, 0.14 + 0.26 * fog);
  // 塔身側緣極微受光水色
  float towerRim = smoothstep(0.002, 0.011, tx) * towerMask * 0.18;
  sky = mix(sky, inkWash + uBeam * towerRim, coastMask);

  // 地平線極柔濕水彩低霧帶（溫柔縫合海岸與水面）
  float lowMist = exp(-pow((horizonY - p.y) / (0.042 + 0.045 * fog), 2.0));
  sky = mix(sky, uHorizon, lowMist * (0.28 + 0.34 * fog));

  return sky;
}

void main() {
  // 統一頂部 y = 0、底部 y = 1 之寬銀幕座標
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float aspect = uRes.x / max(uRes.y, 1.0);
  float horizonY = 0.58;

  // 鏡頭平順平移（側展頁箋讓海景呼吸）+ 細微游標視差
  vec2 p = uv + vec2(-uCamShift, 0.0) + uParallax * vec2(0.016, 0.009);

  vec3 col;
  if (p.y < horizonY) {
    col = evalSkyAndCoast(p, aspect, uTime, uFog, uDim);
  } else {
    // 下方 42%：P0-1 透視壓縮微細橫波 + 3-tap 濕水彩橫向暈散倒影 + P0-5 真實退潮平息演出
    float dy = p.y - horizonY;
    float depth = clamp(dy / (1.0 - horizonY), 0.0, 1.0);
    float calm = 1.0 - uDim * 0.75; // 退潮告別時波紋衰減 75% 漸歸平靜如鏡

    // 非線性透視深度壓縮，讓近地平線波紋極纖細、前景自然展開
    float persp = pow(dy + 0.004, 0.52);
    float microN = fbm(vec2(p.x * 16.0 + uTime * 0.04, persp * 52.0 - uTime * 0.32));
    float fineWave = sin(persp * 260.0 - uTime * 0.78 + microN * 4.2);

    // 嚴控極細水平擾動振幅，徹底根除卡通 S 型蛇身倒影
    float rippleX = ((microN - 0.5) * 0.72 + fineWave * 0.28) * (0.0007 + pow(depth, 1.35) * 0.0034) * calm;
    float rippleY = fineWave * (0.0005 + depth * 0.0016) * calm;

    // 3-tap 水平濕水彩柔散採樣（隨水深橫向暈開、自然融入淺灘，消滅底部斷裂黑鉤）
    float spread = (0.0012 + depth * 0.0046) * (0.65 + 0.35 * calm);
    float reflY = max(0.02, horizonY - dy * 0.90 + rippleY);
    vec3 rC = evalSkyAndCoast(vec2(p.x + rippleX, reflY), aspect, uTime, uFog, uDim);
    vec3 rL = evalSkyAndCoast(vec2(p.x + rippleX - spread, reflY), aspect, uTime, uFog, uDim);
    vec3 rR = evalSkyAndCoast(vec2(p.x + rippleX + spread, reflY), aspect, uTime, uFog, uDim);
    vec3 reflected = rC * 0.50 + (rL + rR) * 0.25;

    // 淺灘水體基底（退潮時水色隨霧氣溫柔褪淡）
    vec3 waterBase = mix(uWaterFar, uWaterNear, pow(depth, 0.78));
    waterBase = mix(waterBase, uHorizon, uDim * 0.28);

    // 水面融合：近地平線倒影柔和，越深處越如水彩墨跡自然化入淺灘
    float reflStrength = mix(0.68, 0.22, pow(depth, 0.65)) * (1.0 - uDim * 0.35);
    col = mix(waterBase, reflected, reflStrength);

    // P0-1 廢除等距斑馬條紋：以多倍頻細碎 fBM 絲光雜訊交乘微細毛細波，呈現不規則潮水微光絲帶
    float yaw = uTime * 0.14 + 0.55;
    float beamX = 0.66 + sin(yaw) * (0.05 + depth * 0.22);
    float shimmerEnv = exp(-pow((p.x - beamX) * aspect / (0.045 + depth * 0.12), 2.0));
    float silkNoise = fbm(vec2(p.x * 22.0 + uTime * 0.06, persp * 48.0 - uTime * 0.42));
    float capillary = smoothstep(0.28, 0.86, silkNoise * 0.72 + (fineWave * 0.5 + 0.5) * 0.28);
    float silkGlint = pow(capillary, 1.55) * (1.0 - depth * 0.32);
    col = mix(col, uBeam, shimmerEnv * silkGlint * (0.24 + 0.16 * max(0.0, cos(yaw))) * (1.0 - uDim * 0.90));

    // 水岸線柔霧縫合帶（P0-5 退潮時潮霧順著淺灘緩緩鋪展開來）
    float shoreMist = exp(-dy / (0.020 + 0.018 * uFog + uDim * 0.14));
    col = mix(col, uHorizon, shoreMist * (0.38 + 0.24 * uFog + uDim * 0.26));
  }

  // 極克制水彩紙張濕潤肌理與細微底片微粒（受系統設定「紙紋與微粒」即時調控）
  float paperMicro = (hash21(floor(gl_FragCoord.xy * 0.9) + fract(uTime * 0.03)) - 0.5) * 0.042;
  float fiber = (noise(uv * vec2(aspect * 180.0, 180.0)) - 0.5) * 0.025;
  col += (paperMicro + fiber) * uGrain;

  // 極溫柔的四邊水彩紙邊微暖韻（絕無重黑暗角）
  vec2 vigUv = (uv - 0.5) * vec2(1.15, 1.0);
  float edgeSoft = smoothstep(0.45, 0.95, length(vigUv));
  col = mix(col, uSkyUpper * 0.92, edgeSoft * 0.09);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export class SeaShaderRenderer {
  constructor(canvas, initialPalette) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.ready = false;

    // 色彩平滑插值狀態
    this.cur = this._cloneColors(initialPalette);
    this.target = this._cloneColors(initialPalette);

    if (this.gl) {
      this._init();
    }
  }

  _cloneColors(pal) {
    return {
      skyUpper: [...pal.skyUpper],
      skyMid: [...pal.skyMid],
      horizon: [...pal.horizon],
      waterFar: [...pal.waterFar],
      waterNear: [...pal.waterNear],
      shore: [...pal.shore],
      beam: [...pal.beam]
    };
  }

  setTargetPalette(pal) {
    this.target = this._cloneColors(pal);
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[BeyondTheTide WebGL2 Error]', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  _init() {
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this._compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[BeyondTheTide Link Error]', gl.getProgramInfoLog(prog));
      return;
    }

    this.program = prog;
    this.vao = gl.createVertexArray();
    const u = (name) => gl.getUniformLocation(prog, name);
    this.loc = {
      res: u('uRes'),
      time: u('uTime'),
      fog: u('uFog'),
      grain: u('uGrain'),
      camShift: u('uCamShift'),
      parallax: u('uParallax'),
      dim: u('uDim'),
      skyUpper: u('uSkyUpper'),
      skyMid: u('uSkyMid'),
      horizon: u('uHorizon'),
      waterFar: u('uWaterFar'),
      waterNear: u('uWaterNear'),
      shore: u('uShore'),
      beam: u('uBeam')
    };
    this.ready = true;
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    if (this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  }

  _lerpVec3(cur, dst, factor) {
    cur[0] += (dst[0] - cur[0]) * factor;
    cur[1] += (dst[1] - cur[1]) * factor;
    cur[2] += (dst[2] - cur[2]) * factor;
  }

  render(dt, elapsedSec, params) {
    if (!this.ready) return;
    const f = 1 - Math.exp(-3.4 * dt);
    for (const key of Object.keys(this.cur)) {
      this._lerpVec3(this.cur[key], this.target[key], f);
    }

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform2f(this.loc.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.loc.time, elapsedSec);
    gl.uniform1f(this.loc.fog, params.fog);
    gl.uniform1f(this.loc.grain, params.grain);
    gl.uniform1f(this.loc.camShift, params.camShift);
    gl.uniform2f(this.loc.parallax, params.parallaxX, params.parallaxY);
    gl.uniform1f(this.loc.dim, params.dim);

    gl.uniform3fv(this.loc.skyUpper, this.cur.skyUpper);
    gl.uniform3fv(this.loc.skyMid, this.cur.skyMid);
    gl.uniform3fv(this.loc.horizon, this.cur.horizon);
    gl.uniform3fv(this.loc.waterFar, this.cur.waterFar);
    gl.uniform3fv(this.loc.waterNear, this.cur.waterNear);
    gl.uniform3fv(this.loc.shore, this.cur.shore);
    gl.uniform3fv(this.loc.beam, this.cur.beam);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
