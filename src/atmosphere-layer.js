/**
 * 高 DPI 詩意表層渲染器（Canvas2D）
 * 嚴格恪守克制原則：
 * - 18–22 粒極細懸浮微光塵（半徑 0.8–2.0px，低透明緩慢呼吸）
 * - 3 張緩慢翻飄之半透明空白信箋，落入 y >= 0.58H 水面時柔散並激起同心橢圓微漣漪
 * - 極淡幾何潮汐弧線（如獨立版畫藏書票飾線）
 * - 「銀灰靜雨」濾鏡下自動漸顯極纖細斜雨絲與水面微圈
 */

export class AtmosphereLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1;
    this.h = 1;
    this.dpr = 1;

    this.motes = this._initMotes(20);
    this.letters = this._initLetters(3);
    this.ripples = [];
    this.rainDrops = this._initRain(54);
    this.rainMix = 0;
  }

  _initMotes(count) {
    return Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random() * 0.62,
      r: 0.8 + Math.random() * 1.15,
      vx: (Math.random() - 0.5) * 0.0055,
      vy: -0.002 - Math.random() * 0.004,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.55
    }));
  }

  _initLetters(count) {
    return Array.from({ length: count }, (_, i) => this._spawnLetter(i / count));
  }

  _spawnLetter(startYFrac = -0.04) {
    return {
      x: 0.22 + Math.random() * 0.52,
      y: startYFrac < 0 ? -0.04 - Math.random() * 0.12 : startYFrac * 0.52,
      targetWaterY: 0.60 + Math.random() * 0.22,
      vy: 0.013 + Math.random() * 0.007,
      swayAmp: 0.018 + Math.random() * 0.022,
      swayFreq: 0.65 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      rot: (Math.random() - 0.5) * 0.7,
      rotSpeed: (Math.random() - 0.5) * 0.28,
      scale: 0.78 + Math.random() * 0.32,
      dissolve: 0 // 0 = 飄落中, 0..1 = 觸水柔散中
    };
  }

  _initRain(count) {
    return Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: 22 + Math.random() * 16,
      speed: 0.44 + Math.random() * 0.24,
      bright: Math.random() > 0.45
    }));
  }

  resize(widthPx, heightPx, dpr) {
    this.w = widthPx;
    this.h = heightPx;
    this.dpr = dpr;
    if (this.canvas.width !== widthPx || this.canvas.height !== heightPx) {
      this.canvas.width = widthPx;
      this.canvas.height = heightPx;
    }
  }

  _spawnRipple(nx, ny, maxR = 44) {
    this.ripples.push({
      x: nx,
      y: ny,
      r: 3,
      maxR,
      alpha: 0.34,
      speed: 14 + Math.random() * 6
    });
  }

  stepAndRender(dt, elapsed, params) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const dpr = this.dpr;
    if (!w || !h) return;

    const shiftPx = params.camShift * w - params.parallaxX * 16 * dpr;
    const shiftPy = -params.parallaxY * 9 * dpr;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // 1. 極淡幾何潮汐弧線（環繞 66% 燈塔天頂，如藏書票版畫細線）
    const lhX = w * 0.66 + shiftPx;
    const lhY = h * 0.462 + shiftPy;
    const arcR = Math.min(w, h) * 0.285;
    ctx.save();
    ctx.strokeStyle = params.inkHex;
    ctx.globalAlpha = 0.075 * (1 - params.dim * 0.7);
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.arc(lhX, lhY, arcR, -Math.PI * 0.88, -Math.PI * 0.14);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lhX, lhY, arcR * 1.18, -Math.PI * 0.72, -Math.PI * 0.26);
    ctx.setLineDash([4 * dpr, 8 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2. 懸浮微光塵（20 粒，緩慢呼吸漂移，零散景光球污染）
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y < -0.02) { m.y = 0.60; m.x = Math.random(); }
      if (m.x < -0.02) m.x = 1.02;
      if (m.x > 1.02) m.x = -0.02;

      const breath = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * m.speed + m.phase));
      const px = m.x * w + shiftPx * 0.65;
      const py = m.y * h + shiftPy * 0.65;

      ctx.beginPath();
      ctx.arc(px, py, m.r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(252, 249, 240, ${(0.34 * breath * (1 - params.dim * 0.65)).toFixed(3)})`;
      ctx.fill();
    }

    // 3. 飄墜空白信箋（3 張，觸及水面柔散並激起同心橢圓漣漪）
    for (const lt of this.letters) {
      if (lt.dissolve === 0) {
        lt.y += lt.vy * dt;
        lt.rot += lt.rotSpeed * dt;
        if (lt.y >= lt.targetWaterY) {
          lt.dissolve = 0.01;
          const swayX = lt.x + Math.sin(elapsed * lt.swayFreq + lt.phase) * lt.swayAmp;
          this._spawnRipple(swayX, lt.targetWaterY, 46 * dpr);
        }
      } else {
        lt.dissolve += dt * 0.9;
        if (lt.dissolve >= 1.0) {
          Object.assign(lt, this._spawnLetter(-0.06));
          continue;
        }
      }

      const swayX = lt.x + Math.sin(elapsed * lt.swayFreq + lt.phase) * lt.swayAmp;
      const px = swayX * w + shiftPx * 0.85;
      const py = lt.y * h + shiftPy * 0.85;
      const fadeIn = Math.min(1, Math.max(0, (lt.y + 0.03) / 0.12));
      const alpha = fadeIn * (1 - lt.dissolve) * 0.56 * (1 - params.dim * 0.6);

      if (alpha > 0.01) {
        ctx.save();
        ctx.translate(px, py);
        const tilt = lt.rot + Math.sin(elapsed * lt.swayFreq * 1.2 + lt.phase) * 0.35;
        ctx.rotate(tilt);
        const lw = 14 * lt.scale * dpr;
        const lh = 9.5 * lt.scale * dpr;
        const flutter = 0.62 + 0.38 * Math.cos(elapsed * 1.4 + lt.phase);
        ctx.scale(1, flutter);

        // 宣紙摺疊信箋剪影與微細信封摺線
        ctx.fillStyle = `rgba(250, 247, 240, ${alpha.toFixed(3)})`;
        ctx.fillRect(-lw * 0.5, -lh * 0.5, lw, lh);
        ctx.strokeStyle = `rgba(46, 64, 72, ${(alpha * 0.38).toFixed(3)})`;
        ctx.lineWidth = 0.8 * dpr;
        ctx.strokeRect(-lw * 0.5, -lh * 0.5, lw, lh);
        ctx.beginPath();
        ctx.moveTo(-lw * 0.5, -lh * 0.5);
        ctx.lineTo(0, lh * 0.1);
        ctx.lineTo(lw * 0.5, -lh * 0.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. P1-3 銀灰靜雨專屬：雙層冷鉛墨影＋亮銀高光細雨絲與落水微圈
    this.rainMix += (params.rainTarget - this.rainMix) * (1 - Math.exp(-3.2 * dt));
    if (this.rainMix > 0.01) {
      ctx.save();
      ctx.lineWidth = 0.9 * dpr;

      const shadowPath = new Path2D();
      const glintPath = new Path2D();

      for (const rd of this.rainDrops) {
        rd.y += rd.speed * dt;
        rd.x -= rd.speed * 0.14 * dt;
        if (rd.y > 0.60 && Math.random() < 0.048 * this.rainMix && this.ripples.length < 22) {
          this._spawnRipple(rd.x, 0.59 + Math.random() * 0.36, 20 * dpr);
        }
        if (rd.y > 1.02 || rd.x < -0.04) {
          rd.y = -0.05;
          rd.x = Math.random() * 1.08;
        }
        const rx = rd.x * w;
        const ry = rd.y * h;
        const dx = -rd.len * 0.14 * dpr;
        const dy = rd.len * dpr;
        if (rd.bright) {
          glintPath.moveTo(rx, ry);
          glintPath.lineTo(rx + dx, ry + dy);
        } else {
          shadowPath.moveTo(rx, ry);
          shadowPath.lineTo(rx + dx, ry + dy);
        }
      }

      ctx.strokeStyle = `rgba(42, 54, 66, ${(0.18 * this.rainMix * (1 - params.dim * 0.6)).toFixed(3)})`;
      ctx.stroke(shadowPath);
      ctx.strokeStyle = `rgba(250, 252, 255, ${(0.34 * this.rainMix * (1 - params.dim * 0.6)).toFixed(3)})`;
      ctx.stroke(glintPath);
      ctx.restore();
    }

    // 5. 水面擴散同心橢圓細漣漪
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += rp.speed * dt * dpr;
      const prog = rp.r / rp.maxR;
      if (prog >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }
      const a = rp.alpha * (1 - prog) * (1 - prog);
      const rx = rp.x * w + shiftPx * 0.85;
      const ry = rp.y * h + shiftPy * 0.85;

      ctx.strokeStyle = `rgba(250, 248, 242, ${a.toFixed(3)})`;
      ctx.lineWidth = 0.9 * dpr;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rp.r, rp.r * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (rp.r > 10 * dpr) {
        ctx.beginPath();
        ctx.ellipse(rx, ry, rp.r * 0.62, rp.r * 0.62 * 0.24, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(250, 248, 242, ${(a * 0.55).toFixed(3)})`;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
