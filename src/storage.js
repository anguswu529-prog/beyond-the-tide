/**
 * 《潮汐之外》本地持久化存檔與系統設定引擎（localStorage）
 * 預置槽位 01（第一幕）與槽位 02（第二幕・最新記錄），槽位 03 留白為尚未落筆的信箋。
 */

import { ACT_TEMPLATES } from './palettes.js';

const STORAGE_KEY = 'beyond_the_tide_state_v1';

export const DEFAULT_SETTINGS = {
  palette: 'mist',
  fogDensity: 0.52,
  paperGrain: 0.48,
  parallax: true,
  fontScale: 'standard', // 'standard' (1.0) | 'generous' (1.12)
  showSubtitle: true,
  masterVol: 72,
  bgmVol: 65,
  ambienceVol: 80
};

function createInitialSlots() {
  return [
    {
      slotId: 1,
      empty: false,
      ...ACT_TEMPLATES.act1,
      savedAt: '2026-11-19 06:14',
      updatedMs: Date.now() - 86400000 * 4
    },
    {
      slotId: 2,
      empty: false,
      ...ACT_TEMPLATES.act2,
      savedAt: '2026-11-23 19:48',
      updatedMs: Date.now() - 3600000 * 2
    },
    {
      slotId: 3,
      empty: true,
      chapter: '尚未落筆的信箋',
      location: '留白處仍在等待下一次漲潮。',
      playtime: '',
      excerpt: '',
      sceneKey: 'empty',
      savedAt: '',
      updatedMs: 0
    }
  ];
}

export function formatNowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export class GameStorage {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.slots = createInitialSlots();
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.settings && typeof parsed.settings === 'object') {
        this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      }
      if (Array.isArray(parsed.slots) && parsed.slots.length === 3) {
        this.slots = parsed.slots;
      }
    } catch {
      // 若無痕模式限制 storage，維持記憶體內正常運作
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        settings: this.settings,
        slots: this.slots
      }));
    } catch {
      // 忽略受限儲存寫入錯誤
    }
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this._persist();
  }

  resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    this._persist();
    return this.settings;
  }

  getLatestSlot() {
    const filled = this.slots.filter((s) => !s.empty);
    if (!filled.length) return null;
    return filled.reduce((a, b) => (b.updatedMs > a.updatedMs ? b : a));
  }

  /**
   * 寫入或覆寫指定槽位；若用於「開啟新篇」自動存檔，優先寫入空白槽位（否則寫入槽位 1）
   */
  writeNewJourney(preferredSlotId = null, templateKey = 'act1') {
    const tpl = ACT_TEMPLATES[templateKey] || ACT_TEMPLATES.act1;
    let target = null;
    if (preferredSlotId) {
      target = this.slots.find((s) => s.slotId === preferredSlotId);
    } else {
      target = this.slots.find((s) => s.empty) || this.slots[0];
    }
    if (!target) return null;

    Object.assign(target, {
      empty: false,
      ...tpl,
      savedAt: formatNowStamp(),
      updatedMs: Date.now()
    });
    this._persist();
    return target;
  }

  touchSlot(slotId) {
    const target = this.slots.find((s) => s.slotId === slotId && !s.empty);
    if (!target) return null;
    target.savedAt = formatNowStamp();
    target.updatedMs = Date.now();
    this._persist();
    return target;
  }

  eraseSlot(slotId) {
    const target = this.slots.find((s) => s.slotId === slotId);
    if (!target) return;
    Object.assign(target, {
      empty: true,
      chapter: '尚未落筆的信箋',
      location: '留白處仍在等待下一次漲潮。',
      playtime: '',
      excerpt: '',
      sceneKey: 'empty',
      savedAt: '',
      updatedMs: 0
    });
    this._persist();
  }
}
