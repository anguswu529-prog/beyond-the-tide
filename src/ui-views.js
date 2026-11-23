/**
 * 《潮汐之外》子介面渲染與互動控制器（P0-4 完整系統設定鍵盤導航 + P0-7 道地台灣用語版）
 */

import { PALETTES, PROLOGUE_LINES, CREDITS_SECTIONS } from './palettes.js';
import { paintSceneThumbnail } from './save-art.js';

const PALETTE_ORDER = ['mist', 'rose', 'rain'];
const SLOT_TEMPLATE_MAP = { 1: 'act1', 2: 'act2', 3: 'act3' };

export class SaveArchiveView {
  constructor(listEl, toastEl, storage, callbacks) {
    this.listEl = listEl;
    this.toastEl = toastEl;
    this.storage = storage;
    this.cb = callbacks;
    this.focusedIndex = 0;
    this.confirmState = null;
    this.toastTimer = 0;
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.textContent = '';
    }, 3200);
  }

  render() {
    this.listEl.innerHTML = '';
    this.storage.slots.forEach((slot, idx) => {
      const card = document.createElement('article');
      card.className = `save-card${slot.empty ? ' is-empty' : ''}${idx === this.focusedIndex ? ' is-focused' : ''}`;
      card.dataset.slotIdx = String(idx);

      const thumbBox = document.createElement('div');
      thumbBox.className = 'save-thumb-box';
      const canvas = document.createElement('canvas');
      canvas.className = 'save-thumb-canvas';
      // 嚴格對齊 .save-thumb-box (142×92) 之 2x 精準等比解析度
      canvas.width = 284;
      canvas.height = 184;
      paintSceneThumbnail(canvas, slot.sceneKey);
      const postmark = document.createElement('span');
      postmark.className = 'save-postmark';
      postmark.textContent = `No.0${slot.slotId}`;
      thumbBox.append(canvas, postmark);

      const info = document.createElement('div');
      info.className = 'save-info';

      if (slot.empty) {
        info.innerHTML = `
          <div class="save-top-row">
            <h3 class="save-chapter">${slot.chapter}</h3>
            <span class="save-time">BLANK</span>
          </div>
          <p class="save-excerpt">${slot.location}</p>
          <div class="save-actions">
            <button type="button" class="slot-btn is-primary" data-slot-act="create" data-slot-id="${slot.slotId}">於此落筆新章</button>
          </div>
        `;
      } else {
        info.innerHTML = `
          <div class="save-top-row">
            <h3 class="save-chapter">${slot.chapter}</h3>
            <span class="save-time">${slot.savedAt}</span>
          </div>
          <div class="save-sub-row">
            <span>${slot.location}</span>
            <span>・</span>
            <span class="tabular">${slot.playtime}</span>
          </div>
          <p class="save-excerpt">${slot.excerpt}</p>
          <div class="save-actions">
            <button type="button" class="slot-btn is-primary" data-slot-act="load" data-slot-id="${slot.slotId}">重返此頁</button>
            <button type="button" class="slot-btn" data-slot-act="ask-overwrite" data-slot-id="${slot.slotId}">以新篇覆寫</button>
            <button type="button" class="slot-btn is-danger" data-slot-act="ask-erase" data-slot-id="${slot.slotId}">抹去記憶</button>
          </div>
        `;
      }

      card.append(thumbBox, info);

      if (this.confirmState && this.confirmState.slotId === slot.slotId) {
        const ov = document.createElement('div');
        ov.className = 'slot-confirm-overlay';
        const isErase = this.confirmState.mode === 'erase';
        ov.innerHTML = `
          <p class="slot-confirm-msg">${isErase ? `要抹去 No.0${slot.slotId} 的這頁記憶嗎？此舉無法復原。` : `要以「第一幕：霧港寄信人」覆寫 No.0${slot.slotId} 嗎？`}</p>
          <div class="slot-confirm-btns">
            <button type="button" class="slot-btn" data-slot-act="cancel-confirm">保留原頁</button>
            <button type="button" class="slot-btn is-primary" data-slot-act="${isErase ? 'confirm-erase' : 'confirm-overwrite'}" data-slot-id="${slot.slotId}">${isErase ? '確認抹去' : '確認覆寫'}</button>
          </div>
        `;
        card.append(ov);
      }

      card.addEventListener('pointerenter', () => {
        if (this.focusedIndex !== idx) {
          this.focusedIndex = idx;
          this._syncFocusClass();
        }
      });

      this.listEl.append(card);
    });

    this.listEl.querySelectorAll('[data-slot-act]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleAction(btn.dataset.slotAct, Number(btn.dataset.slotId));
      });
    });
  }

  _syncFocusClass() {
    this.listEl.querySelectorAll('.save-card').forEach((el, i) => {
      el.classList.toggle('is-focused', i === this.focusedIndex);
    });
  }

  _handleAction(action, slotId) {
    if (action === 'load') {
      const slot = this.storage.touchSlot(slotId);
      if (slot) this.cb.onLoadSlot(slot);
    } else if (action === 'create') {
      const tplKey = SLOT_TEMPLATE_MAP[slotId] || 'act1';
      const created = this.storage.writeNewJourney(slotId, tplKey);
      this.confirmState = null;
      this.render();
      this.cb.onSlotsChanged();
      if (created) this.showToast(`新章紀錄已封存至 No.0${slotId}`);
    } else if (action === 'ask-erase') {
      this.confirmState = { slotId, mode: 'erase' };
      this.render();
    } else if (action === 'ask-overwrite') {
      this.confirmState = { slotId, mode: 'overwrite' };
      this.render();
    } else if (action === 'cancel-confirm') {
      this.confirmState = null;
      this.render();
    } else if (action === 'confirm-erase') {
      this.storage.eraseSlot(slotId);
      this.confirmState = null;
      this.render();
      this.cb.onSlotsChanged();
      this.showToast(`已抹去 No.0${slotId} 的記憶`);
    } else if (action === 'confirm-overwrite') {
      this.storage.writeNewJourney(slotId, 'act1');
      this.confirmState = null;
      this.render();
      this.cb.onSlotsChanged();
      this.showToast(`已覆寫 No.0${slotId} 並封存`);
    }
  }

  moveFocus(delta) {
    this.confirmState = null;
    this.focusedIndex = (this.focusedIndex + delta + 3) % 3;
    this._syncFocusClass();
  }

  activateFocused() {
    const slot = this.storage.slots[this.focusedIndex];
    if (!slot) return;
    if (slot.empty) {
      this._handleAction('create', slot.slotId);
    } else {
      this._handleAction('load', slot.slotId);
    }
  }
}

export class SettingsView {
  constructor(bodyEl, toastEl, storage, onChange) {
    this.bodyEl = bodyEl;
    this.toastEl = toastEl;
    this.storage = storage;
    this.onChange = onChange;
    this.focusedRow = 0;
    this.rowAdjusters = [];
    this.toastTimer = 0;
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.textContent = '';
    }, 3000);
  }

  render() {
    const s = this.storage.settings;
    this.bodyEl.innerHTML = '';
    this.rowAdjusters = [];

    // 1. 畫面與水色
    const gVisual = this._makeGroup('畫面與水色', 'VISUAL');

    const palRow = this._registerRow((dir) => {
      const idx = PALETTE_ORDER.indexOf(this.storage.settings.palette);
      const nextId = PALETTE_ORDER[(idx + dir + PALETTE_ORDER.length) % PALETTE_ORDER.length];
      this.storage.updateSetting('palette', nextId);
      this.onChange('palette', nextId);
      this.render();
    });
    palRow.innerHTML = `<span class="setting-label">色調濾鏡</span>`;
    const palChoices = document.createElement('div');
    palChoices.className = 'palette-choices';
    Object.values(PALETTES).forEach((pal) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `seal-choice-btn${s.palette === pal.id ? ' is-active' : ''}`;
      btn.dataset.paletteChoice = pal.id;
      btn.innerHTML = `<span class="swatch-dot" style="background:${pal.swatch}"></span>${pal.label}`;
      btn.addEventListener('click', () => {
        this.storage.updateSetting('palette', pal.id);
        this.onChange('palette', pal.id);
        this.render();
      });
      palChoices.append(btn);
    });
    palRow.append(palChoices);
    gVisual.append(palRow);

    gVisual.append(
      this._makeSliderRow('海霧濃度', Math.round(s.fogDensity * 100), 10, 100, (v) => {
        this.storage.updateSetting('fogDensity', v / 100);
        this.onChange('fogDensity', v / 100);
      }),
      this._makeSliderRow('紙紋與微粒', Math.round(s.paperGrain * 100), 0, 100, (v) => {
        this.storage.updateSetting('paperGrain', v / 100);
        this.onChange('paperGrain', v / 100);
      }),
      this._makeToggleRow('動態視差', s.parallax, '開啟', '關閉', (on) => {
        this.storage.updateSetting('parallax', on);
        this.onChange('parallax', on);
        this.render();
      })
    );

    // 2. 閱讀與排印（P0-7：字體尺寸自然由左至右為「標準 / 寬裕」）
    const gType = this._makeGroup('閱讀與排印', 'TYPOGRAPHY');
    gType.append(
      this._makeToggleRow('字體尺寸', s.fontScale === 'standard', '標準', '寬裕', (isStd) => {
        const val = isStd ? 'standard' : 'generous';
        this.storage.updateSetting('fontScale', val);
        this.onChange('fontScale', val);
        this.render();
      }),
      this._makeToggleRow('英文副標', s.showSubtitle, '顯示', '隱藏', (show) => {
        this.storage.updateSetting('showSubtitle', show);
        this.onChange('showSubtitle', show);
        this.render();
      })
    );

    // 3. 靜謐音場偏好
    const gAudio = this._makeGroup('靜謐音場偏好', 'SILENT PRESET');
    const note = document.createElement('p');
    note.className = 'silent-note';
    note.textContent = '目前為純視覺靜謐展示模式，不產生任何聲音輸出；以下參數將寫入本機設定檔以供完整版繼承。';
    gAudio.append(
      note,
      this._makeSliderRow('主音量', s.masterVol, 0, 100, (v) => this.storage.updateSetting('masterVol', v)),
      this._makeSliderRow('鋼琴配樂', s.bgmVol, 0, 100, (v) => this.storage.updateSetting('bgmVol', v)),
      this._makeSliderRow('潮岸環境', s.ambienceVol, 0, 100, (v) => this.storage.updateSetting('ambienceVol', v))
    );

    this.bodyEl.append(gVisual, gType, gAudio);
    this._syncRowFocus();
  }

  _registerRow(adjustFn) {
    const idx = this.rowAdjusters.length;
    this.rowAdjusters.push(adjustFn);
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.dataset.rowIdx = String(idx);
    row.addEventListener('pointerenter', () => {
      if (this.focusedRow !== idx) {
        this.focusedRow = idx;
        this._syncRowFocus();
      }
    });
    return row;
  }

  _syncRowFocus() {
    this.bodyEl.querySelectorAll('.setting-row').forEach((el, i) => {
      el.classList.toggle('is-focused', i === this.focusedRow);
    });
  }

  moveFocus(delta) {
    const total = this.rowAdjusters.length;
    if (!total) return;
    this.focusedRow = (this.focusedRow + delta + total) % total;
    this._syncRowFocus();
    const rowEl = this.bodyEl.querySelector(`.setting-row[data-row-idx="${this.focusedRow}"]`);
    if (rowEl) rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  adjustFocused(delta) {
    const fn = this.rowAdjusters[this.focusedRow];
    if (fn) fn(delta);
  }

  _makeGroup(title, tag) {
    const sec = document.createElement('section');
    sec.className = 'settings-group';
    sec.innerHTML = `<div class="group-head"><h3 class="group-title">${title}</h3><span class="group-tag">${tag}</span></div>`;
    return sec;
  }

  _makeSliderRow(label, value, min, max, onInput) {
    let curVal = value;
    let applyValRef = null;
    const row = this._registerRow((dir) => {
      if (applyValRef) applyValRef(curVal + dir * 5);
    });
    row.innerHTML = `<span class="setting-label">${label}</span>`;

    const wrap = document.createElement('div');
    wrap.className = 'ink-slider-wrap';

    const slider = document.createElement('div');
    slider.className = 'ink-slider';
    slider.tabIndex = 0;
    slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-label', label);
    slider.setAttribute('aria-valuemin', String(min));
    slider.setAttribute('aria-valuemax', String(max));
    slider.setAttribute('aria-valuenow', String(value));

    const pct = ((value - min) / (max - min)) * 100;
    slider.innerHTML = `
      <div class="ink-slider-track">
        <div class="ink-slider-fill" style="width:${pct}%"></div>
        <div class="ink-slider-thumb" style="left:${pct}%"></div>
      </div>
    `;
    const valEl = document.createElement('span');
    valEl.className = 'ink-slider-val';
    valEl.textContent = `${value}%`;

    const applyVal = (next) => {
      curVal = Math.max(min, Math.min(max, Math.round(next)));
      const p = ((curVal - min) / (max - min)) * 100;
      slider.setAttribute('aria-valuenow', String(curVal));
      slider.querySelector('.ink-slider-fill').style.width = `${p}%`;
      slider.querySelector('.ink-slider-thumb').style.left = `${p}%`;
      valEl.textContent = `${curVal}%`;
      onInput(curVal);
    };
    applyValRef = applyVal;

    const setFromPointer = (clientX) => {
      const rect = slider.getBoundingClientRect();
      const ratio = (clientX - rect.left) / Math.max(1, rect.width);
      applyVal(min + ratio * (max - min));
    };

    let dragging = false;
    slider.addEventListener('pointerdown', (e) => {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      setFromPointer(e.clientX);
    });
    slider.addEventListener('pointermove', (e) => {
      if (dragging) setFromPointer(e.clientX);
    });
    slider.addEventListener('pointerup', () => { dragging = false; });
    slider.addEventListener('pointercancel', () => { dragging = false; });

    wrap.append(slider, valEl);
    row.append(wrap);
    return row;
  }

  _makeToggleRow(label, isFirstActive, firstText, secondText, onSelect) {
    const row = this._registerRow(() => onSelect(!isFirstActive));
    row.innerHTML = `<span class="setting-label">${label}</span>`;

    const box = document.createElement('div');
    box.className = 'seal-toggle';
    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.className = `toggle-opt${isFirstActive ? ' is-active' : ''}`;
    b1.textContent = firstText;
    b1.addEventListener('click', () => onSelect(true));

    const sep = document.createElement('span');
    sep.textContent = '/';
    sep.style.color = 'var(--line-subtle)';

    const b2 = document.createElement('button');
    b2.type = 'button';
    b2.className = `toggle-opt${!isFirstActive ? ' is-active' : ''}`;
    b2.textContent = secondText;
    b2.addEventListener('click', () => onSelect(false));

    box.append(b1, sep, b2);
    row.append(box);
    return row;
  }
}

export class CreditsController {
  constructor(viewportEl, trackEl, letterEl) {
    this.viewportEl = viewportEl;
    this.trackEl = trackEl;
    this.letterEl = letterEl;
    this.offsetY = 0;
    this.speed = 34;
    this.paused = false;
    this.finished = false;
    this._buildDom();
  }

  _buildDom() {
    this.trackEl.innerHTML = `
      <div class="credit-block">
        <div class="credit-title-main">潮汐之外</div>
        <div class="credit-sub-en">BEYOND THE TIDE</div>
      </div>
      ${CREDITS_SECTIONS.map((sec) => `
        <div class="credit-block">
          <div class="credit-role">${sec.role}</div>
          <div class="credit-name">${sec.names.join('<br>')}</div>
        </div>
      `).join('')}
    `;
  }

  reset() {
    const vh = this.viewportEl.clientHeight || 560;
    this.offsetY = vh * 0.72;
    this.speed = 34;
    this.paused = false;
    this.finished = false;
    this.letterEl.classList.remove('is-visible');
    this.letterEl.setAttribute('aria-hidden', 'true');
    this.trackEl.style.transform = `translateY(${this.offsetY}px)`;
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
  }

  adjustSpeed(delta) {
    this.speed = Math.max(18, Math.min(140, this.speed + delta));
  }

  step(dt) {
    if (this.paused || this.finished) return;
    this.offsetY -= this.speed * dt;
    this.trackEl.style.transform = `translateY(${this.offsetY.toFixed(1)}px)`;
    const totalH = this.trackEl.offsetHeight || 720;
    if (this.offsetY < -totalH - 20) {
      this.finished = true;
      this.letterEl.classList.add('is-visible');
      this.letterEl.setAttribute('aria-hidden', 'false');
    }
  }
}

export class PrologueController {
  constructor(linesEl, promptEl, onFinish) {
    this.linesEl = linesEl;
    this.promptEl = promptEl;
    this.onFinish = onFinish;
    this.shownCount = 0;
    this.timer = 0;
  }

  start() {
    clearTimeout(this.timer);
    this.shownCount = 0;
    this.linesEl.innerHTML = PROLOGUE_LINES.map((text) => `<p class="prologue-line">${text}</p>`).join('');
    this.promptEl.textContent = '按下 ENTER 或輕觸畫面推進序章';
    this._revealNext();
  }

  _revealNext() {
    const nodes = this.linesEl.querySelectorAll('.prologue-line');
    if (this.shownCount < nodes.length) {
      nodes[this.shownCount].classList.add('is-shown');
      this.shownCount++;
      if (this.shownCount === nodes.length) {
        this.promptEl.textContent = '按下 ENTER 或輕觸畫面進入第一幕';
      } else {
        this.timer = setTimeout(() => this._revealNext(), 1750);
      }
    }
  }

  advance() {
    clearTimeout(this.timer);
    if (this.shownCount < PROLOGUE_LINES.length) {
      this._revealNext();
    } else {
      this.onFinish();
    }
  }

  stop() {
    clearTimeout(this.timer);
  }
}
