// COMPONENTS/EFFECTSPANEL.JSX
//
// RENDERS THE EFFECTS SECTION INSIDE PROPERTYPANEL FOR A SELECTED LAYER.
// EACH EFFECT TYPE HAS ITS OWN CONTROL BLOCK. EFFECTS ARE STORED AS AN ARRAY
// ON THE LAYER OBJECT: LAYER.EFFECTS = [{ TYPE, ...PARAMS }]
//
// NOTE: Layer-level effects only apply to particle layers.
//       Sprite layers apply effects at the track level via TrackEditor.
//       Pass layerType="sprite" to suppress this panel for sprite layers.

import { useState } from "react";

// ─── SHARED SUB-PRIMITIVES
function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ marginBottom: 3, fontSize: 11, color: "var(--text2)", display: "block", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, step = 0.01 }) {
  const [inputVal, setInputVal] = useState(String(value));

  const commit = (raw) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) { setInputVal(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, parsed));
    setInputVal(String(clamped));
    onChange(clamped);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <label style={{ margin: 0, fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
          {label}
        </label>
        <input
          type="number" min={min} max={max} step={step}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value); }}
          style={{ width: 54, textAlign: "right", fontSize: 10, padding: "1px 4px", fontFamily: "var(--font-code)", color: "var(--accent)", background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: 3, flexShrink: 0 }}
        />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); setInputVal(String(v)); onChange(v); }}
        style={{ width: "100%", accentColor: "var(--accent)" }} />
    </div>
  );
}

// ─── PER-EFFECT CONFIG UIS ────────────────────────────────────────────────────

function GlitchControls({ effect, onUpdate }) {
  return (
    <div>
      <SliderRow label="Intensity" value={effect.intensity ?? 0.5} min={0} max={1} step={0.01}
        onChange={(v) => onUpdate({ ...effect, intensity: v })} />
      <SliderRow label="Speed" value={effect.speed ?? 0.5} min={0} max={1} step={0.01}
        onChange={(v) => onUpdate({ ...effect, speed: v })} />
    </div>
  );
}

function HueShiftControls({ effect, onUpdate }) {
  return (
    <div>
      <SliderRow label="Hue Rotation" value={effect.hue ?? 0} min={0} max={360} step={1}
        onChange={(v) => onUpdate({ ...effect, hue: v })} />
      <SliderRow label="Saturation" value={effect.saturation ?? 1} min={0} max={2} step={0.01}
        onChange={(v) => onUpdate({ ...effect, saturation: v })} />
      <SliderRow label="Brightness" value={effect.brightness ?? 1} min={0} max={2} step={0.01}
        onChange={(v) => onUpdate({ ...effect, brightness: v })} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
          Auto-cycle
        </label>
        <button
          onClick={() => onUpdate({ ...effect, animate: !(effect.animate ?? false) })}
          style={{
            fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer",
            fontFamily: "var(--font-ui)", letterSpacing: 0.5,
            background: (effect.animate ?? false) ? "rgba(103,254,189,.15)" : "transparent",
            border: `1px solid ${(effect.animate ?? false) ? "var(--accent2)" : "var(--border)"}`,
            color: (effect.animate ?? false) ? "var(--accent2)" : "var(--text3)",
          }}
        >
          {(effect.animate ?? false) ? "ON" : "OFF"}
        </button>
      </div>
      {(effect.animate ?? false) && (
        <SliderRow label="Cycle Speed" value={effect.speed ?? 0.5} min={0} max={1} step={0.01}
          onChange={(v) => onUpdate({ ...effect, speed: v })} />
      )}
    </div>
  );
}

function InvertControls({ effect, onUpdate }) {
  return (
    <div>
      <SliderRow label="Amount" value={effect.amount ?? 1} min={0} max={1} step={0.01}
        onChange={(v) => onUpdate({ ...effect, amount: v })} />
      <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5, marginTop: 2 }}>
        0 = original &nbsp;·&nbsp; 0.5 = greyed &nbsp;·&nbsp; 1 = full invert
      </div>
    </div>
  );
}

// REGISTRY — ADD NEW EFFECT CONTROL UIS HERE AS THEY'RE BUILT
const EFFECT_CONTROLS = {
  glitch:   GlitchControls,
  hueShift: HueShiftControls,
  invert:   InvertControls,
};

const EFFECT_OPTIONS = [
  { value: "glitch",   label: "⚡ Glitch" },
  { value: "hueShift", label: "🌈 Hue Shift" },
  { value: "invert",   label: "◑ Invert" },
];

const EFFECT_DEFAULTS = {
  glitch:   { type: "glitch",   intensity: 0.5, speed: 0.5 },
  hueShift: { type: "hueShift", hue: 0, animate: false, speed: 0.3, saturation: 1.0, brightness: 1.0 },
  invert:   { type: "invert",   amount: 1.0 },
};

// ─── MAIN EFFECTSPANEL ────────────────────────────────────────────────────────
// layerType: "particle" | "sprite" | undefined
// Sprite layers manage effects per-track inside TrackEditor — suppress here.

export function EffectsPanel({ layer, onUpdateEffects, layerType }) {
  const effects = layer.effects || [];
  const activeTypes = new Set(effects.map((e) => e.type));
  const [expanded, setExpanded] = useState({});

  // Sprite layers: effects live on tracks, not the layer itself.
  // Show an informational note instead of the full panel.
  if (layerType === "sprite") {
    return (
      <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "var(--accent3)", letterSpacing: 1, textTransform: "uppercase" }}>
            ✦ Visual Effects
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, padding: "4px 0" }}>
          Effects for sprite layers are applied per-track.
          <br />
          Open the <span style={{ color: "var(--text2)" }}>Layer Editor</span> to configure track effects.
        </div>
      </div>
    );
  }

  const addEffect = (type) => {
    if (activeTypes.has(type)) return;
    onUpdateEffects([...effects, { ...EFFECT_DEFAULTS[type] }]);
    setExpanded((prev) => ({ ...prev, [type]: true }));
  };

  const removeEffect = (type) => {
    onUpdateEffects(effects.filter((e) => e.type !== type));
  };

  const updateEffect = (type, newCfg) => {
    onUpdateEffects(effects.map((e) => (e.type === type ? newCfg : e)));
  };

  const toggleExpanded = (type) => {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const availableToAdd = EFFECT_OPTIONS.filter((o) => !activeTypes.has(o.value));

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
      {/* SECTION HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--accent3)", letterSpacing: 1, textTransform: "uppercase" }}>
          ✦ Visual Effects
        </span>
        {availableToAdd.length > 0 && (
          <AddEffectDropdown options={availableToAdd} onAdd={addEffect} />
        )}
      </div>

      {/* ACTIVE EFFECTS */}
      {effects.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text3)", padding: "6px 0" }}>
          No effects. Click + to add one.
        </div>
      )}

      {effects.map((effect) => {
        const Controls = EFFECT_CONTROLS[effect.type];
        const isExpanded = expanded[effect.type] !== false; // DEFAULT EXPANDED
        return (
          <div key={effect.type} style={{ marginBottom: 8, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {/* EFFECT HEADER ROW */}
            <div
              onClick={() => toggleExpanded(effect.type)}
              style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "var(--bg3)", cursor: "pointer", userSelect: "none" }}
            >
              <span style={{ fontSize: 10, color: "var(--accent3)", marginRight: 6 }}>
                {isExpanded ? "▾" : "▸"}
              </span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--text)", letterSpacing: 0.5 }}>
                {EFFECT_OPTIONS.find((o) => o.value === effect.type)?.label ?? effect.type}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeEffect(effect.type); }}
                style={{ fontSize: 10, color: "#ff6666", background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontFamily: "var(--font-ui)" }}
              >
                ✕
              </button>
            </div>

            {/* EFFECT CONTROLS */}
            {isExpanded && Controls && (
              <div style={{ padding: "8px 10px", background: "var(--bg2)" }}>
                <Controls
                  effect={effect}
                  onUpdate={(newCfg) => updateEffect(effect.type, newCfg)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ADD EFFECT DROPDOWN ──────────────────────────────────────────────────────

function AddEffectDropdown({ options, onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 11, color: "var(--accent3)", background: "none", border: "1px solid var(--accent3)", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontFamily: "var(--font-ui)", opacity: 0.85 }}
      >
        + Effect
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 4, zIndex: 50, minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onAdd(o.value); setOpen(false); }}
              style={{ padding: "7px 12px", fontSize: 11, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font-ui)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(165,90,255,.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}