// COMPONENTS/PHYSICSPANEL.JSX
//
// PER-LAYER MOTION/PHYSICS UI. RENDERED INSIDE PROPERTYPANEL BELOW LAYER CONTROLS.
// SUPPORTS BOB, DRIFT, AND ORBIT MOTIONS — MULTIPLE CAN BE STACKED.

import { useState } from "react";

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <label style={{ fontSize: 10, color: "var(--text2)", display: "block", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, step = 1 }) {
  const [inputVal, setInputVal] = useState(String(value));
  const isFloat = step < 1;

  const commit = (raw) => {
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw);
    if (isNaN(parsed)) { setInputVal(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, parsed));
    setInputVal(isFloat ? String(clamped) : String(clamped));
    onChange(clamped);
  };

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <label style={{ margin: 0, fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>{label}</label>
        <input type="number" min={min} max={max} step={step} value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value); }}
          style={{ width: 54, textAlign: "right", fontSize: 10, padding: "1px 4px", fontFamily: "var(--font-code)", color: "var(--accent)", background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: 3 }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => { const v = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value); setInputVal(String(v)); onChange(v); }}
        style={{ width: "100%", accentColor: "var(--accent)" }} />
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <label style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>{label}</label>
      <button onClick={() => onChange(!value)} style={{
        fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "var(--font-ui)",
        background: value ? "rgba(165,90,255,.15)" : "transparent",
        border: `1px solid ${value ? "var(--accent)" : "var(--border)"}`,
        color: value ? "var(--accent)" : "var(--text3)",
      }}>{value ? "ON" : "OFF"}</button>
    </div>
  );
}

// ─── PER-MOTION CONTROL UIS ───────────────────────────────────────────────────

function BobControls({ motion, onUpdate }) {
  const up = (k, v) => onUpdate({ ...motion, [k]: v });
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SliderRow label="Amp X (px)"  value={motion.amplitudeX  ?? 0}   onChange={(v) => up("amplitudeX",  v)} min={0}    max={400} />
        </div>
        <div style={{ flex: 1 }}>
          <SliderRow label="Amp Y (px)"  value={motion.amplitudeY  ?? 20}  onChange={(v) => up("amplitudeY",  v)} min={0}    max={400} />
        </div>
      </div>
      <SliderRow label="Frequency (Hz)" value={motion.frequency   ?? 1}   onChange={(v) => up("frequency",   v)} min={0.05} max={10}  step={0.05} />
      <SliderRow label="Scale Oscillation" value={motion.scaleAmount ?? 0} onChange={(v) => up("scaleAmount", v)} min={0}    max={1}   step={0.01} />
      <SliderRow label="Rotation Oscillation (°)" value={motion.rotAmount ?? 0} onChange={(v) => up("rotAmount", v)} min={0} max={180} />
      <SliderRow label="Phase Offset"   value={motion.phase        ?? 0}  onChange={(v) => up("phase",        v)} min={0}    max={6.28} step={0.01} />
    </div>
  );
}

function DriftControls({ motion, onUpdate }) {
  const up = (k, v) => onUpdate({ ...motion, [k]: v });
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SliderRow label="Speed X (px/s)" value={motion.speedX ?? 0}   onChange={(v) => up("speedX", v)} min={-500} max={500} />
        </div>
        <div style={{ flex: 1 }}>
          <SliderRow label="Speed Y (px/s)" value={motion.speedY ?? -30} onChange={(v) => up("speedY", v)} min={-500} max={500} />
        </div>
      </div>
      <ToggleRow label="Wrap Around Edges" value={motion.wrap ?? true} onChange={(v) => up("wrap", v)} />
    </div>
  );
}

function OrbitControls({ motion, onUpdate }) {
  const up = (k, v) => onUpdate({ ...motion, [k]: v });
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SliderRow label="Radius X (px)" value={motion.radiusX ?? 60} onChange={(v) => up("radiusX", v)} min={0} max={960} />
        </div>
        <div style={{ flex: 1 }}>
          <SliderRow label="Radius Y (px)" value={motion.radiusY ?? 60} onChange={(v) => up("radiusY", v)} min={0} max={540} />
        </div>
      </div>
      <SliderRow label="Speed (rev/s)" value={motion.speed ?? 0.5} onChange={(v) => up("speed", v)} min={-5} max={5} step={0.05} />
      <SliderRow label="Phase Offset"  value={motion.phase ?? 0}   onChange={(v) => up("phase", v)} min={0}  max={6.28} step={0.01} />
      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2 }}>
        NEGATIVE SPEED = CLOCKWISE. DIFFERENT X/Y RADII = ELLIPSE.
      </div>
    </div>
  );
}

// ─── REGISTRY ─────────────────────────────────────────────────────────────────

const MOTION_CONTROLS = {
  bob:   BobControls,
  drift: DriftControls,
  orbit: OrbitControls,
};

const MOTION_OPTIONS = [
  { value: "bob",   label: "〜 Bob / Sine Wave" },
  { value: "drift", label: "→ Drift" },
  { value: "orbit", label: "◎ Orbit" },
];

const MOTION_DEFAULTS = {
  bob:   { type: "bob",   amplitudeX: 0, amplitudeY: 20, frequency: 1, scaleAmount: 0, rotAmount: 0, phase: 0 },
  drift: { type: "drift", speedX: 0, speedY: -30, wrap: true },
  orbit: { type: "orbit", radiusX: 60, radiusY: 60, speed: 0.5, phase: 0 },
};

// ─── PHYSICSPANEL ─────────────────────────────────────────────────────────────

export function PhysicsPanel({ layer, onUpdatePhysics }) {
  const motions = layer.physics?.motions || [];
  const activeTypes = new Set(motions.map((m) => m.type));
  const [expanded, setExpanded] = useState({});

  const setMotions = (newMotions) => {
    onUpdatePhysics(layer.id, { ...layer.physics, motions: newMotions });
  };

  const addMotion = (type) => {
    if (activeTypes.has(type)) return;
    setMotions([...motions, { ...MOTION_DEFAULTS[type] }]);
    setExpanded((p) => ({ ...p, [type]: true }));
  };

  const removeMotion = (type) => {
    setMotions(motions.filter((m) => m.type !== type));
  };

  const updateMotion = (type, updated) => {
    setMotions(motions.map((m) => (m.type === type ? updated : m)));
  };

  const available = MOTION_OPTIONS.filter((o) => !activeTypes.has(o.value));

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--accent4)", letterSpacing: 1, textTransform: "uppercase" }}>
          ⟳ Motion / Physics
        </span>
        {available.length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) addMotion(e.target.value); }}
            style={{ fontSize: 10, padding: "1px 4px", background: "var(--bg3)", border: "1px solid var(--accent4)", color: "var(--accent4)", borderRadius: 3, cursor: "pointer" }}>
            <option value="">+ Motion</option>
            {available.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {motions.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text3)", padding: "4px 0" }}>
          NO MOTION. CLICK + MOTION TO ADD ONE.
        </div>
      )}

      {motions.map((motion) => {
        const Controls = MOTION_CONTROLS[motion.type];
        const label = MOTION_OPTIONS.find((o) => o.value === motion.type)?.label ?? motion.type;
        const isOpen = expanded[motion.type] !== false;

        return (
          <div key={motion.type} style={{ marginBottom: 6, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {/* MOTION HEADER */}
            <div onClick={() => setExpanded((p) => ({ ...p, [motion.type]: !isOpen }))}
              style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "var(--bg3)", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 9, color: "var(--accent4)", marginRight: 6 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--text)", letterSpacing: 0.5 }}>{label}</span>
              <button onClick={(e) => { e.stopPropagation(); removeMotion(motion.type); }}
                style={{ fontSize: 10, color: "#ff6666", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)" }}>✕</button>
            </div>
            {/* MOTION CONTROLS */}
            {isOpen && Controls && (
              <div style={{ padding: "8px 10px", background: "var(--bg2)" }}>
                <Controls motion={motion} onUpdate={(updated) => updateMotion(motion.type, updated)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}