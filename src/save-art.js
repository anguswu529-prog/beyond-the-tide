/**
 * 記憶存檔與第一幕定場畫框專屬：等比濕水彩小品繪製器（P0-2 與 P1-2 精修版）
 * 全數物件皆依真實畫布短邊與實際比例繪製（嚴禁跨比例拉伸），
 * 以多層柔霧海天縫合、濕潤石階墨韻、斜射燈塔微光與錯落水色筆觸取代硬邊幾何與格線。
 */

export function paintSceneThumbnail(canvas, sceneKey) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);

  if (sceneKey === 'empty') {
    _paintEmptyEnvelope(ctx, w, h);
    return;
  }

  const themes = {
    act1: {
      skyTop: '#718A91', skyMid: '#B9CAC9', horizon: '#E7ECE8',
      waterTop: '#AABEC1', waterBot: '#8FA4AA', ink: '#2E4048', inkSoft: 'rgba(46,64,72,0.42)', glow: '#FCF6E6'
    },
    act2: {
      skyTop: '#7E6C75', skyMid: '#C4B2B6', horizon: '#ECE2DD',
      waterTop: '#B9AAB0', waterBot: '#9F8E95', ink: '#3B2F36', inkSoft: 'rgba(59,47,54,0.42)', glow: '#FBF1DD'
    },
    act3: {
      skyTop: '#77818B', skyMid: '#C0C7CD', horizon: '#E6E9EC',
      waterTop: '#B3BBC2', waterBot: '#98A1A9', ink: '#2A323A', inkSoft: 'rgba(42,50,58,0.40)', glow: '#F7F5EE'
    }
  };
  const c = themes[sceneKey] || themes.act1;
  const horY = h * 0.57;

  // 1. 濕水彩天幕漸層與雲暈
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horY);
  skyGrad.addColorStop(0, c.skyTop);
  skyGrad.addColorStop(0.60, c.skyMid);
  skyGrad.addColorStop(1, c.horizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horY + 2);

  // 柔和水彩雲團濃淡（以圓形基準半徑避免扁平變形）
  const cloudR = Math.min(w, h) * 0.82;
  const cloud = ctx.createRadialGradient(w * 0.68, horY * 0.45, cloudR * 0.06, w * 0.68, horY * 0.45, cloudR);
  cloud.addColorStop(0, 'rgba(252,248,240,0.34)');
  cloud.addColorStop(0.65, 'rgba(252,248,240,0.10)');
  cloud.addColorStop(1, 'rgba(252,248,240,0)');
  ctx.fillStyle = cloud;
  ctx.fillRect(0, 0, w, horY + 2);

  // 左側極淡遠山霧影
  ctx.save();
  ctx.fillStyle = c.inkSoft;
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.moveTo(0, horY);
  ctx.quadraticCurveTo(w * 0.18, horY - h * 0.08, w * 0.44, horY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. 淺灘水體底層
  const seaGrad = ctx.createLinearGradient(0, horY, 0, h);
  seaGrad.addColorStop(0, c.waterTop);
  seaGrad.addColorStop(1, c.waterBot);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, horY, w, h - horY);

  // 3. 各幕專屬水彩構圖（全採等比短邊尺度，絕不水平拉伸變形）
  const focusX = sceneKey === 'act1' ? w * 0.70 : (sceneKey === 'act2' ? w * 0.74 : w * 0.72);

  if (sceneKey === 'act1') {
    // 第一幕：多層濕墨石階浸入晨霧潮線 + 右岸纖細等比燈塔與斜射柔光束
    _drawWatercolorSteps(ctx, w, h, horY, c);
    _drawBalancedLighthouse(ctx, focusX, horY, h * 0.23, c, -1);
  } else if (sceneKey === 'act2') {
    // 第二幕：柔墨長堤、等比舊驗潮亭、遠燈塔與濕水彩橫刷倒影
    const jettyStart = w * 0.44;
    const jettyGrad = ctx.createLinearGradient(jettyStart, horY, w, horY);
    jettyGrad.addColorStop(0, 'rgba(59,47,54,0.52)');
    jettyGrad.addColorStop(0.35, 'rgba(59,47,54,0.78)');
    jettyGrad.addColorStop(1, 'rgba(59,47,54,0.72)');
    ctx.fillStyle = jettyGrad;
    ctx.fillRect(jettyStart, horY - h * 0.024, w - jettyStart, h * 0.028);

    // 等比舊驗潮亭（寬度與高度綁定 h，不隨寬屏變肥）
    const hutH = h * 0.085;
    const hutW = hutH * 1.15;
    const hutX = w * 0.54;
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.74;
    ctx.fillRect(hutX, horY - h * 0.024 - hutH, hutW, hutH);
    ctx.beginPath();
    ctx.moveTo(hutX - hutW * 0.14, horY - h * 0.024 - hutH);
    ctx.lineTo(hutX + hutW * 0.5, horY - h * 0.024 - hutH * 1.55);
    ctx.lineTo(hutX + hutW * 1.14, horY - h * 0.024 - hutH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    _drawBalancedLighthouse(ctx, focusX, horY - h * 0.018, h * 0.21, c, -1);
    _drawSoftReflectionStrokes(ctx, hutX + hutW * 0.5, horY + h * 0.02, hutW * 1.1, hutH * 1.1, c.ink);
  } else {
    // 第三幕：外港雨霧渡輪碼頭、三點柔和微燈倒影與雙層銀灰斜雨絲
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.66;
    ctx.fillRect(w * 0.52, horY - h * 0.022, w * 0.48, h * 0.026);
    ctx.globalAlpha = 1;

    for (const lx of [0.58, 0.71, 0.85]) {
      const lampR = h * 0.095;
      const g = ctx.createRadialGradient(w * lx, horY - h * 0.055, 1, w * lx, horY - h * 0.055, lampR);
      g.addColorStop(0, c.glow);
      g.addColorStop(0.4, 'rgba(247,245,238,0.28)');
      g.addColorStop(1, 'rgba(247,245,238,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w * lx, horY - h * 0.055, lampR, 0, Math.PI * 2);
      ctx.fill();
      _drawSoftReflectionStrokes(ctx, w * lx, horY + h * 0.025, h * 0.06, h * 0.22, c.glow, 0.22);
    }

    // 雙層斜雨絲（冷鉛影＋亮銀絲）
    ctx.lineWidth = Math.max(0.8, h * 0.004);
    for (let i = 0; i < 36; i++) {
      const rx = ((i * 37 + 11) % 100) / 100 * w;
      const ry = ((i * 53 + 7) % 88) / 100 * h;
      const len = h * (0.08 + (i % 3) * 0.04);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(248,250,252,0.34)' : 'rgba(42,50,58,0.16)';
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - len * 0.16, ry + len);
      ctx.stroke();
    }
  }

  // 4. 地平線柔霧縫合帶（徹底消滅海天一刀切硬線）
  const seamH = h * 0.14;
  const seam = ctx.createLinearGradient(0, horY - seamH * 0.65, 0, horY + seamH * 0.55);
  seam.addColorStop(0, 'rgba(236,240,238,0)');
  seam.addColorStop(0.52, 'rgba(238,241,238,0.48)');
  seam.addColorStop(1, 'rgba(236,240,238,0)');
  ctx.fillStyle = seam;
  ctx.fillRect(0, horY - seamH * 0.65, w, seamH * 1.2);

  // 5. P1-2：集中於光影軸線下方之長短錯落水波高光（取代五條筆記本橫線）
  ctx.save();
  ctx.strokeStyle = c.glow;
  ctx.lineWidth = Math.max(0.8, h * 0.0045);
  for (let i = 0; i < 14; i++) {
    const frac = (i + 0.6) / 15;
    const wy = horY + (h - horY) * Math.pow(frac, 1.15);
    const jitter = Math.sin(i * 4.7) * h * 0.12;
    const halfLen = h * (0.05 + frac * 0.18) * (0.65 + 0.35 * Math.cos(i * 2.9));
    ctx.globalAlpha = (1 - frac * 0.55) * 0.34;
    ctx.beginPath();
    ctx.moveTo(focusX + jitter - halfLen, wy);
    ctx.lineTo(focusX + jitter + halfLen, wy);
    ctx.stroke();
  }
  ctx.restore();
}

function _drawWatercolorSteps(ctx, w, h, horY, c) {
  // 多層濕墨石階：踏面微亮受光、立面濃墨，右端自然浸沒於潮霧之中
  const stepCount = 3;
  const baseW = Math.min(w * 0.34, h * 0.72);
  ctx.save();
  for (let i = 0; i < stepCount; i++) {
    const sx = 0;
    const sw = baseW * (0.46 + i * 0.27);
    const sy = horY + h * (0.09 + i * 0.095);
    const sh = h - sy;
    const g = ctx.createLinearGradient(sx, sy, sw, sy);
    g.addColorStop(0, c.ink);
    g.addColorStop(0.75, 'rgba(46,64,72,0.58)');
    g.addColorStop(1, 'rgba(46,64,72,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, sw, sh);

    // 濕潤踏面極細高光邊
    ctx.fillStyle = 'rgba(235,240,238,0.34)';
    ctx.fillRect(sx, sy, sw * 0.94, Math.max(1, h * 0.009));
  }
  ctx.restore();
}

function _drawBalancedLighthouse(ctx, x, baseY, towerH, c, beamDirSign) {
  ctx.save();
  const topY = baseY - towerH;

  // 低矮短堤
  ctx.fillStyle = c.ink;
  ctx.globalAlpha = 0.62;
  ctx.fillRect(x - towerH * 0.45, baseY - towerH * 0.06, towerH * 2.6, towerH * 0.075);

  // 斜射柔和燈塔光束（半透明圓錐柔暈）
  const beamLen = towerH * 3.1;
  const beamGrad = ctx.createLinearGradient(x, topY, x + beamDirSign * beamLen, topY - towerH * 0.18);
  beamGrad.addColorStop(0, 'rgba(252,246,230,0.62)');
  beamGrad.addColorStop(0.45, 'rgba(252,246,230,0.22)');
  beamGrad.addColorStop(1, 'rgba(252,246,230,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(x, topY - towerH * 0.02);
  ctx.lineTo(x + beamDirSign * beamLen, topY - towerH * 0.46);
  ctx.lineTo(x + beamDirSign * beamLen, topY + towerH * 0.18);
  ctx.closePath();
  ctx.fill();

  // 圓形正圓微暈（絕不壓扁）
  const haloR = towerH * 0.85;
  const halo = ctx.createRadialGradient(x, topY, 1, x, topY, haloR);
  halo.addColorStop(0, c.glow);
  halo.addColorStop(0.32, 'rgba(252,246,230,0.28)');
  halo.addColorStop(1, 'rgba(252,246,230,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, topY, haloR, 0, Math.PI * 2);
  ctx.fill();

  // 纖細等比塔身（寬高嚴格與 towerH 綁定）
  ctx.fillStyle = c.ink;
  ctx.globalAlpha = 0.80;
  ctx.beginPath();
  ctx.moveTo(x - towerH * 0.095, baseY);
  ctx.lineTo(x - towerH * 0.048, topY + towerH * 0.08);
  ctx.lineTo(x + towerH * 0.048, topY + towerH * 0.08);
  ctx.lineTo(x + towerH * 0.095, baseY);
  ctx.closePath();
  ctx.fill();

  // 觀海迴廊與尖頂小圓帽
  ctx.fillRect(x - towerH * 0.082, topY + towerH * 0.06, towerH * 0.164, towerH * 0.032);
  ctx.beginPath();
  ctx.moveTo(x - towerH * 0.056, topY - towerH * 0.03);
  ctx.lineTo(x, topY - towerH * 0.14);
  ctx.lineTo(x + towerH * 0.056, topY - towerH * 0.03);
  ctx.closePath();
  ctx.fill();

  // 燈室暖光點
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = c.glow;
  ctx.fillRect(x - towerH * 0.034, topY - towerH * 0.025, towerH * 0.068, towerH * 0.082);

  // 濕水彩橫刷水面倒影
  _drawSoftReflectionStrokes(ctx, x, baseY + towerH * 0.06, towerH * 0.22, towerH * 0.85, c.ink, 0.24);
  ctx.restore();
}

function _drawSoftReflectionStrokes(ctx, cx, startY, width, length, color, maxAlpha = 0.22) {
  ctx.save();
  ctx.fillStyle = color;
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    const f = i / bands;
    const y = startY + f * length;
    const bw = width * (0.72 + f * 0.65) * (0.75 + 0.25 * Math.sin(i * 3.1));
    const jitter = Math.sin(i * 2.7) * width * 0.18;
    ctx.globalAlpha = maxAlpha * (1 - f) * (1 - f * 0.4);
    ctx.fillRect(cx + jitter - bw * 0.5, y, bw, Math.max(1.2, (length / bands) * 0.72));
  }
  ctx.restore();
}

function _paintEmptyEnvelope(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#F1EEE7');
  bg.addColorStop(1, '#E6E2D9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(28, 42, 48, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.92, Math.min(w, h) * 0.54, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.30);
  ctx.lineTo(w * 0.50, h * 0.54);
  ctx.lineTo(w * 0.78, h * 0.30);
  ctx.stroke();
}
