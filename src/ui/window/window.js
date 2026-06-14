/**
 * ============================================================
 * PRETTY KIT — src/ui/window/window.js
 * Cyberpunk Glassmorphism Desktop Window Framework
 * Tauri 2 Compatible
 * ============================================================
 */

function IS_TAURI() {
  return typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window
  );
}

/**
 * Invoke a custom Tauri command via window.__TAURI__.core.invoke.
 * Requires withGlobalTauri:true in tauri.conf.json.
 * Commands must be registered in lib.rs via invoke_handler.
 */
async function _invoke(cmd, args = {}) {
  if (!IS_TAURI()) return;
  try {
    if (window.__TAURI__?.core?.invoke) {
      await window.__TAURI__.core.invoke(cmd, args);
    } else {
      console.warn('[PrettyKit] __TAURI__.core.invoke not available');
    }
  } catch (e) {
    console.warn(`[PrettyKit] invoke '${cmd}' failed:`, e);
  }
}

// ── Internal state ──────────────────────────────────────────
const _state = {
  title:       'Pretty Kit',
  icon:        '',
  accentColor: null,
  isMaximized: false,
  statusText:  'READY',
  version:     'v1.0.0',
};

const $ = (id) => document.getElementById(id);
let _els = {};

function _resolveEls() {
  _els = {
    window:      $('pretty-window'),
    titlebar:    $('pretty-titlebar'),
    icon:        $('pretty-icon'),
    title:       $('pretty-title'),
    controls:    $('pretty-controls'),
    content:     $('pretty-content'),
    statusbar:   $('pretty-statusbar'),
    statusText:  $('pk-status-text'),
    statusVer:   $('pk-status-version'),
    btnMin:      $('pk-minimize'),
    btnMax:      $('pk-maximize'),
    btnClose:    $('pk-close'),
    maxIcon:     $('pk-max-icon'),
    restoreIcon: $('pk-restore-icon'),
  };
}

// ═════════════════════════════════════════════════════════════
//  PUBLIC API
// ═════════════════════════════════════════════════════════════

function createPrettyWindow(options = {}) {
  const {
    title       = 'Pretty Kit',
    icon        = '',
    accentColor = 'aqua',
    version     = 'v1.0.0',
    statusText  = 'READY',
    showStatus  = true,
  } = options;

  setTitle(title);
  setIcon(icon);
  setAccentColor(accentColor);
  setVersion(version);
  setStatusText(statusText);

  if (!showStatus && _els.statusbar) {
    _els.statusbar.style.display = 'none';
  }

  return _instance;
}

function setTitle(title) {
  _state.title = title;
  if (_els.title) _els.title.textContent = title;
  document.title = title;
}

function setIcon(icon) {
  _state.icon = icon;
  if (!_els.icon) return;
  const el = _els.icon;
  if (!icon) { el.style.display = 'none'; return; }
  if ([...icon].length <= 2 && isNaN(Number(icon))) {
    el.tagName === 'IMG' && el.replaceWith(_makeSpanIcon(icon));
    return;
  }
  el.src = icon;
  el.style.display = '';
}

function setAccentColor(color) {
  _state.accentColor = color;
  if (!_els.window) return;
  const namedPresets = new Set(['aqua', 'pink', 'violet', 'green', 'orange']);
  const el = _els.window;
  el.removeAttribute('data-accent');
  if (!color) return;
  if (namedPresets.has(color)) {
    if (color !== 'aqua') el.setAttribute('data-accent', color);
  } else {
    el.style.setProperty('--accent',             color);
    el.style.setProperty('--accent-glow',        _hexToGlow(color, 0.40));
    el.style.setProperty('--accent-dim',         _hexToGlow(color, 0.12));
    el.style.setProperty('--holo-border',        _hexToGlow(color, 0.30));
    el.style.setProperty('--holo-border-hover',  _hexToGlow(color, 0.75));
  }
}

function setStatusText(text) {
  _state.statusText = text;
  if (_els.statusText) _els.statusText.textContent = text.toUpperCase();
}

function setVersion(ver) {
  _state.version = ver;
  if (_els.statusVer) _els.statusVer.textContent = ver;
}

async function minimize() {
  await _invoke('minimize_window');
}

async function toggleMaximize() {
  await _invoke('toggle_maximize_window');
  _setMaximizedState(!_state.isMaximized);
}

async function closeWindow() {
  await _invoke('close_window');
}

// ═════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════

function _setMaximizedState(isMaximized) {
  _state.isMaximized = isMaximized;
  if (!_els.btnMax) return;
  _els.btnMax.classList.toggle('is-maximized', isMaximized);
  _els.btnMax.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
  _els.btnMax.title = isMaximized ? 'Restore' : 'Maximize';
  if (_els.maxIcon)     _els.maxIcon.style.display     = isMaximized ? 'none' : '';
  if (_els.restoreIcon) _els.restoreIcon.style.display = isMaximized ? ''     : 'none';
  if (_els.window) _els.window.style.borderRadius = isMaximized ? '0' : '';
}

function _hexToGlow(hex, alpha = 0.4) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,255,255,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function _makeSpanIcon(emoji) {
  const span = document.createElement('span');
  span.id = 'pretty-icon';
  span.className = 'icon-placeholder';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = emoji;
  span.style.cssText = 'font-size:18px;line-height:1;width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  return span;
}

function _bindControls() {
  _els.btnMin?.addEventListener('click', (e) => {
    e.stopPropagation();
    minimize();
  });
  _els.btnMax?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMaximize();
  });
  _els.btnClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow();
  });
  _els.titlebar?.addEventListener('dblclick', () => toggleMaximize());
}

// ═════════════════════════════════════════════════════════════
//  INIT
// ═════════════════════════════════════════════════════════════

function _init() {
  _resolveEls();
  _bindControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

// ═════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════

const _instance = {
  createPrettyWindow,
  setTitle, setIcon, setAccentColor, setStatusText, setVersion,
  minimize, toggleMaximize,
  close: closeWindow,
  get state() { return { ..._state }; },
  get content() { return _els.content ?? null; },
};

export default _instance;
export {
  createPrettyWindow,
  setTitle, setIcon, setAccentColor, setStatusText, setVersion,
  minimize, toggleMaximize,
  closeWindow as close,
};