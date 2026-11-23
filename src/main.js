/**
 * 《潮汐之外》主狀態機與完整單機鍵盤／滑鼠協調引擎（P0/P1 全項精修版）
 */

import { PALETTES, ACT_TEMPLATES } from './palettes.js';
import { SeaShaderRenderer } from './shader-sea.js';
import { AtmosphereLayer } from './atmosphere-layer.js';
import { GameStorage } from './storage.js';
import { paintSceneThumbnail } from './save-art.js';
import { SaveArchiveView, SettingsView, CreditsController, PrologueController } from './ui-views.js';

const KEY_HINT_MAP = {
  title: [
    ['↑↓', '選擇'],
    ['ENTER', '確認']
  ],
  saves: [
    ['↑↓', '切換槽位'],
    ['ENTER', '開啟或新建'],
    ['ESC', '返回潮岸']
  ],
  settings: [
    ['↑↓', '切換項目'],
    ['←→', '調整數值'],
    ['ESC', '封存並返回']
  ],
  credits: [
    ['SPACE', '暫停／繼續'],
    ['↑↓', '調整捲速'],
    ['ESC', '返回潮岸']
  ],
  prologue: [
    ['ENTER', '下一句'],
    ['ESC', '返回潮岸']
  ],
  act1: [
    ['←→', '選擇'],
    ['ENTER', '確認'],
    ['ESC', '返回潮岸']
  ],
  'exit-confirm': [
    ['←→', '選擇'],
    ['ENTER', '確認'],
    ['ESC', '留在霧港']
  ]
};

class BeyondTheTideApp {
  constructor() {
    this.storage = new GameStorage();
    this.view = 'title';
    this.menuIndex = 0;
    this.exitChoice = 0;
    this.actChoice = 0;
    this.currentActSceneKey = 'act1';

    this.dom = this._cacheDom();
    const initPal = PALETTES[this.storage.settings.palette] || PALETTES.mist;
    this.sea = new SeaShaderRenderer(this.dom.glCanvas, initPal);
    this.atmo = new AtmosphereLayer(this.dom.overlayCanvas);

    this.camShift = 0;
    this.targetCamShift = 0;
    this.dimFactor = 0;
    this.targetDim = 0;
    this.fogBoost = 0;
    this.targetFogBoost = 0;
    this.pointer = { tx: 0, ty: 0, x: 0, y: 0 };

    this.savesView = new SaveArchiveView(this.dom.saveList, this.dom.saveToast, this.storage, {
      onLoadSlot: (slot) => this._openActCard(slot, `已自 No.0${slot.slotId} 讀取記憶`),
      onSlotsChanged: () => this._refreshContinueMeta()
    });

    this.settingsView = new SettingsView(this.dom.settingsBody, this.dom.settingsToast, this.storage, () => {
      this._applySettingsToDom();
    });

    this.creditsCtrl = new CreditsController(this.dom.creditsViewport, this.dom.creditsTrack, this.dom.creditsLetter);
    this.prologueCtrl = new PrologueController(this.dom.prologueLines, this.dom.prologuePrompt, () => {
      const saved = this.storage.writeNewJourney(null, 'act1');
      this._refreshContinueMeta();
      const note = saved ? `新篇記憶已自動封存至 No.0${saved.slotId}` : '記憶已寫入臨時信箋';
      this._openActCard(saved || ACT_TEMPLATES.act1, note);
    });

    this._applySettingsToDom();
    this._refreshContinueMeta();
    this._bindEvents();
    this._resize();
    this._setView('title');

    this.lastTime = performance.now();
    this.startTime = this.lastTime;
    window.addEventListener('resize', () => this._resize());
    requestAnimationFrame((t) => this._loop(t));
  }

  _cacheDom() {
    return {
      rootHtml: document.documentElement,
      stage: document.getElementById('stage-root'),
      glCanvas: document.getElementById('scene-gl'),
      overlayCanvas: document.getElementById('scene-overlay'),
      subtitleCol: document.getElementById('subtitle-col'),
      continueMeta: document.getElementById('continue-meta'),
      menuBtns: Array.from(document.querySelectorAll('.menu-btn')),

      panelSaves: document.getElementById('panel-saves'),
      saveList: document.getElementById('save-slots-list'),
      saveToast: document.getElementById('save-toast'),

      panelSettings: document.getElementById('panel-settings'),
      settingsBody: document.getElementById('settings-body'),
      settingsToast: document.getElementById('settings-toast'),
      btnResetSettings: document.getElementById('btn-reset-settings'),

      panelCredits: document.getElementById('panel-credits'),
      creditsViewport: document.getElementById('credits-viewport'),
      creditsTrack: document.getElementById('credits-track'),
      creditsLetter: document.getElementById('credits-letter'),

      panelPrologue: document.getElementById('panel-prologue'),
      prologueStage: document.getElementById('prologue-stage'),
      prologueLines: document.getElementById('prologue-lines'),
      prologuePrompt: document.getElementById('prologue-prompt'),
      actCard: document.getElementById('act-card'),
      actThumbCanvas: document.getElementById('act-thumb-canvas'),
      actPostmark: document.getElementById('act-postmark'),
      actEn: document.getElementById('act-en'),
      actTitle: document.getElementById('act-title'),
      actLocation: document.getElementById('act-location'),
      actExcerpt: document.getElementById('act-excerpt'),
      actSavedNote: document.getElementById('act-saved-note'),
      actVerticalStamp: document.getElementById('act-vertical-stamp'),
      actBtns: Array.from(document.querySelectorAll('[data-act-choice]')),

      panelExit: document.getElementById('panel-exit'),
      exitBtns: Array.from(document.querySelectorAll('[data-exit-choice]')),
      btnReopenDoor: document.getElementById('btn-reopen-door'),
      farewellBox: document.getElementById('farewell-box'),

      keyHints: document.getElementById('key-hints'),
      localeStamp: document.getElementById('locale-stamp')
    };
  }

  _applySettingsToDom() {
    const s = this.storage.settings;
    const pal = PALETTES[s.palette] || PALETTES.mist;

    this.dom.rootHtml.dataset.palette = pal.id;
    this.dom.rootHtml.style.setProperty('--font-scale', s.fontScale === 'generous' ? '1.12' : '1');
    this.dom.rootHtml.style.setProperty('--grain-opacity', String((s.paperGrain * 0.38).toFixed(2)));
    this.dom.subtitleCol.classList.toggle('is-hidden', !s.showSubtitle);
    this.dom.localeStamp.textContent = `${pal.label}　${pal.coords}`;
    this.sea.setTargetPalette(pal);
  }

  _refreshContinueMeta() {
    const latest = this.storage.getLatestSlot();
    const contBtn = this.dom.menuBtns[0];
    if (latest) {
      contBtn.classList.remove('is-disabled');
      contBtn.disabled = false;
      this.dom.continueMeta.textContent = `${latest.chapter}・${latest.savedAt}`;
    } else {
      contBtn.classList.add('is-disabled');
      contBtn.disabled = true;
      this.dom.continueMeta.textContent = '尚無封存的記憶';
      if (this.menuIndex === 0) this.menuIndex = 1;
    }
    this._syncMenuFocus();
  }

  _syncMenuFocus() {
    this.dom.menuBtns.forEach((btn, idx) => {
      btn.classList.toggle('is-focused', idx === this.menuIndex && !btn.disabled);
    });
  }

  _syncExitFocus() {
    this.dom.exitBtns.forEach((btn, idx) => {
      btn.classList.toggle('is-focused', idx === this.exitChoice);
    });
  }

  _syncActFocus() {
    this.dom.actBtns.forEach((btn, idx) => {
      btn.classList.toggle('is-focused', idx === this.actChoice);
    });
  }

  _setView(nextView) {
    this.view = nextView;
    this.dom.stage.dataset.view = nextView;

    this.dom.panelSaves.setAttribute('aria-hidden', String(nextView !== 'saves'));
    this.dom.panelSettings.setAttribute('aria-hidden', String(nextView !== 'settings'));
    this.dom.panelCredits.setAttribute('aria-hidden', String(nextView !== 'credits'));
    this.dom.panelPrologue.setAttribute('aria-hidden', String(nextView !== 'prologue' && nextView !== 'act1'));
    this.dom.actCard.setAttribute('aria-hidden', String(nextView !== 'act1'));
    this.dom.panelExit.setAttribute('aria-hidden', String(nextView !== 'exit-confirm' && nextView !== 'farewell'));
    this.dom.farewellBox.setAttribute('aria-hidden', String(nextView !== 'farewell'));

    if (nextView === 'saves') {
      this.targetCamShift = 0.115;
      this.targetFogBoost = 0.04;
      this.targetDim = 0;
      this.savesView.confirmState = null;
      this.savesView.render();
    } else if (nextView === 'settings') {
      this.targetCamShift = -0.115;
      this.targetFogBoost = 0;
      this.targetDim = 0;
      this.settingsView.render();
    } else if (nextView === 'credits') {
      this.targetCamShift = 0;
      this.targetFogBoost = 0.16;
      this.targetDim = 0.12;
      this.creditsCtrl.reset();
    } else if (nextView === 'prologue') {
      this.targetCamShift = 0;
      this.targetFogBoost = 0.24;
      this.targetDim = 0;
      this.prologueCtrl.start();
    } else if (nextView === 'act1') {
      this.actChoice = 0;
      this._syncActFocus();
      this.targetCamShift = 0;
      this.targetFogBoost = 0.24;
      this.targetDim = 0;
    } else if (nextView === 'exit-confirm') {
      this.exitChoice = 0;
      this._syncExitFocus();
      this.targetCamShift = 0;
      this.targetFogBoost = 0.12;
      this.targetDim = 0.24;
    } else if (nextView === 'farewell') {
      this.targetCamShift = 0;
      this.targetFogBoost = -0.10;
      this.targetDim = 0.94;
    } else {
      this.prologueCtrl.stop();
      this.targetCamShift = 0;
      this.targetFogBoost = 0;
      this.targetDim = 0;
      this._refreshContinueMeta();
    }

    this._renderKeyHints(nextView);
  }

  _renderKeyHints(view) {
    const list = KEY_HINT_MAP[view] || KEY_HINT_MAP.title;
    this.dom.keyHints.innerHTML = list
      .map(([k, desc]) => `<span class="key-hint"><kbd>${k}</kbd> ${desc}</span>`)
      .join('');
  }

  _paintActCanvasBalanced(sceneKey) {
    const cv = this.dom.actThumbCanvas;
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(640, Math.round((rect.width || 664) * dpr));
    const h = Math.max(220, Math.round((rect.height || 228) * dpr));
    cv.width = w;
    cv.height = h;
    paintSceneThumbnail(cv, sceneKey);
  }

  _openActCard(slot, savedNote) {
    this.currentActSceneKey = slot.sceneKey || 'act1';
    this.dom.actPostmark.textContent = `${slot.actCode || 'ACT I'}・25°07'N`;
    this.dom.actEn.textContent = slot.actEn || ACT_TEMPLATES.act1.actEn;
    this.dom.actTitle.textContent = slot.chapter;
    this.dom.actLocation.textContent = slot.location;
    this.dom.actExcerpt.textContent = slot.excerpt;
    this.dom.actSavedNote.textContent = savedNote;
    this.dom.actVerticalStamp.textContent = slot.actZh || '第一幕';
    this._setView('act1');
    this._paintActCanvasBalanced(this.currentActSceneKey);
  }

  _triggerMenuAction(action) {
    if (action === 'continue') {
      const latest = this.storage.getLatestSlot();
      if (!latest) return;
      this.storage.touchSlot(latest.slotId);
      this._openActCard(latest, `已接續 No.0${latest.slotId} 的潮岸旅途`);
    } else if (action === 'newgame') {
      this._setView('prologue');
    } else if (action === 'saves') {
      this._setView('saves');
    } else if (action === 'settings') {
      this._setView('settings');
    } else if (action === 'credits') {
      this._setView('credits');
    } else if (action === 'exit') {
      this._setView('exit-confirm');
    }
  }

  _bindEvents() {
    this.dom.menuBtns.forEach((btn, idx) => {
      btn.addEventListener('pointerenter', () => {
        if (btn.disabled) return;
        this.menuIndex = idx;
        this._syncMenuFocus();
      });
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this._triggerMenuAction(btn.dataset.action);
      });
    });

    document.querySelectorAll('[data-close-panel]').forEach((btn) => {
      btn.addEventListener('click', () => this._setView('title'));
    });

    this.dom.btnResetSettings.addEventListener('click', () => {
      this.storage.resetSettings();
      this._applySettingsToDom();
      this.settingsView.render();
      this.settingsView.showToast('已還原至最初的潮岸光景');
    });

    this.dom.prologueStage.addEventListener('click', () => {
      if (this.view === 'prologue') this.prologueCtrl.advance();
    });

    this.dom.actBtns.forEach((btn, idx) => {
      btn.addEventListener('pointerenter', () => {
        this.actChoice = idx;
        this._syncActFocus();
      });
      btn.addEventListener('click', () => {
        if (idx === 0) this._setView('title');
        else this._setView('saves');
      });
    });

    this.dom.exitBtns.forEach((btn, idx) => {
      btn.addEventListener('pointerenter', () => {
        this.exitChoice = idx;
        this._syncExitFocus();
      });
      btn.addEventListener('click', () => {
        if (idx === 0) this._setView('title');
        else this._setView('farewell');
      });
    });
    this.dom.btnReopenDoor.addEventListener('click', () => this._setView('title'));

    window.addEventListener('pointermove', (e) => {
      this.pointer.tx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      this.pointer.ty = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    });
    window.addEventListener('pointerleave', () => {
      this.pointer.tx = 0;
      this.pointer.ty = 0;
    });

    window.addEventListener('keydown', (e) => this._handleKeydown(e));
  }

  _handleKeydown(e) {
    if (this.view === 'title') {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this._moveTitleCursor(1);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this._moveTitleCursor(-1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const btn = this.dom.menuBtns[this.menuIndex];
        if (btn && !btn.disabled) this._triggerMenuAction(btn.dataset.action);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.view === 'saves' && this.savesView.confirmState) {
        this.savesView.confirmState = null;
        this.savesView.render();
      } else if (this.view !== 'farewell') {
        this._setView('title');
      }
      return;
    }

    if (this.view === 'saves') {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.savesView.moveFocus(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.savesView.moveFocus(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.savesView.activateFocused(); }
    } else if (this.view === 'settings') {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.settingsView.moveFocus(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.settingsView.moveFocus(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.settingsView.adjustFocused(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.settingsView.adjustFocused(-1); }
    } else if (this.view === 'credits') {
      if (e.code === 'Space') { e.preventDefault(); this.creditsCtrl.togglePause(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.creditsCtrl.adjustSpeed(20); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.creditsCtrl.adjustSpeed(-20); }
    } else if (this.view === 'prologue') {
      if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); this.prologueCtrl.advance(); }
    } else if (this.view === 'act1') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.actChoice = 1 - this.actChoice;
        this._syncActFocus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.actChoice === 0) this._setView('title');
        else this._setView('saves');
      }
    } else if (this.view === 'exit-confirm') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.exitChoice = 1 - this.exitChoice;
        this._syncExitFocus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.exitChoice === 0) this._setView('title');
        else this._setView('farewell');
      }
    } else if (this.view === 'farewell' && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      this._setView('title');
    }
  }

  _moveTitleCursor(delta) {
    const total = this.dom.menuBtns.length;
    for (let step = 0; step < total; step++) {
      this.menuIndex = (this.menuIndex + delta + total) % total;
      if (!this.dom.menuBtns[this.menuIndex].disabled) break;
    }
    this._syncMenuFocus();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(window.innerWidth * dpr));
    const h = Math.max(2, Math.round(window.innerHeight * dpr));
    this.sea.resize(w, h);
    this.atmo.resize(w, h, dpr);
    if (this.view === 'act1') {
      this._paintActCanvasBalanced(this.currentActSceneKey);
    }
  }

  _loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const elapsed = (now - this.startTime) / 1000;

    const ease = 1 - Math.exp(-3.8 * dt);
    this.camShift += (this.targetCamShift - this.camShift) * ease;
    this.dimFactor += (this.targetDim - this.dimFactor) * (1 - Math.exp(-2.4 * dt));
    this.fogBoost += (this.targetFogBoost - this.fogBoost) * ease;

    const parallaxOn = this.storage.settings.parallax;
    const tx = parallaxOn ? this.pointer.tx : 0;
    const ty = parallaxOn ? this.pointer.ty : 0;
    const pEase = 1 - Math.exp(-4.2 * dt);
    this.pointer.x += (tx - this.pointer.x) * pEase;
    this.pointer.y += (ty - this.pointer.y) * pEase;

    const s = this.storage.settings;
    const pal = PALETTES[s.palette] || PALETTES.mist;
    const effectiveFog = Math.max(0.05, Math.min(1.0, s.fogDensity + this.fogBoost));

    this.sea.render(dt, elapsed, {
      fog: effectiveFog,
      grain: s.paperGrain,
      camShift: this.camShift,
      parallaxX: this.pointer.x,
      parallaxY: this.pointer.y,
      dim: this.dimFactor
    });

    this.atmo.stepAndRender(dt, elapsed, {
      camShift: this.camShift,
      parallaxX: this.pointer.x,
      parallaxY: this.pointer.y,
      dim: this.dimFactor,
      inkHex: pal.inkHex,
      rainTarget: pal.rainIntensity
    });

    if (this.view === 'credits') {
      this.creditsCtrl.step(dt);
    }

    requestAnimationFrame((t) => this._loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BeyondTheTideApp();
});
