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
  const mode = motion.edgeMode ?? "wrap"; // "wrap" | "bounce" | "none"

  const ModeBtn = ({ id, label }) => (
    <button
      onClick={() => up("edgeMode", id)}
      style={{
        flex: 1, fontSize: 10, padding: "3px 0", borderRadius: 3, cursor: "pointer",
        fontFamily: "var(--font-ui)", letterSpacing: 0.4, textTransform: "uppercase",
        background: mode === id ? "rgba(165,90,255,.18)" : "transparent",
        border: `1px solid ${mode === id ? "var(--accent)" : "var(--border)"}`,
        color: mode === id ? "var(--accent)" : "var(--text3)",
        transition: "all .15s",
      }}
    >{label}</button>
  );

  return (
    <div>
      {/* SPEED — bipolar for wrap/none, absolute (positive) for bounce */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SliderRow
            label={mode === "bounce" ? "Speed X (px/s)" : "Speed X (px/s)"}
            value={mode === "bounce" ? Math.abs(motion.speedX ?? 0) : (motion.speedX ?? 0)}
            onChange={(v) => up("speedX", mode === "bounce" ? Math.abs(v) : v)}
            min={mode === "bounce" ? 0 : -500}
            max={500}
          />
        </div>
        <div style={{ flex: 1 }}>
          <SliderRow
            label="Speed Y (px/s)"
            value={mode === "bounce" ? Math.abs(motion.speedY ?? 30) : (motion.speedY ?? -30)}
            onChange={(v) => up("speedY", mode === "bounce" ? Math.abs(v) : v)}
            min={mode === "bounce" ? 0 : -500}
            max={500}
          />
        </div>
      </div>
      {mode === "bounce" && (
        <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 6, letterSpacing: 0.4 }}>
          BOUNCE SPEED IS ALWAYS POSITIVE — DIRECTION IS HANDLED AUTOMATICALLY.
        </div>
      )}

      {/* EDGE BEHAVIOUR — 3-WAY TOGGLE */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Edge Behaviour
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <ModeBtn id="wrap"   label="⇌ Wrap"   />
          <ModeBtn id="bounce" label="⟵⟶ Bounce" />
          <ModeBtn id="none"   label="∞ None"   />
        </div>
      </div>

      {/* BOUNCE BOUNDARY EDITORS — only shown in bounce mode */}
      {mode === "bounce" && (
        <div style={{ marginTop: 2 }}>
          {/* MINI DIAGRAM */}
          <BouncePreview motion={motion} />

          <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 6, letterSpacing: 0.4 }}>
            SPRITE REFLECTS OFF THESE EDGES (PX FROM CANVAS ORIGIN).
          </div>

          {/* HORIZONTAL BOUNDS */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <SliderRow label="Left Edge"  value={motion.bounceLeft  ?? 0}    onChange={(v) => up("bounceLeft",  v)} min={-1920} max={1920} />
            </div>
            <div style={{ flex: 1 }}>
              <SliderRow label="Right Edge" value={motion.bounceRight ?? 1920} onChange={(v) => up("bounceRight", v)} min={-1920} max={1920} />
            </div>
          </div>

          {/* VERTICAL BOUNDS */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <SliderRow label="Top Edge"    value={motion.bounceTop    ?? 0}    onChange={(v) => up("bounceTop",    v)} min={-1080} max={1080} />
            </div>
            <div style={{ flex: 1 }}>
              <SliderRow label="Bottom Edge" value={motion.bounceBottom ?? 1080} onChange={(v) => up("bounceBottom", v)} min={-1080} max={1080} />
            </div>
          </div>

          <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2, letterSpacing: 0.4 }}>
            TIP: SET SPEED TO 0 ON AN AXIS TO DISABLE BOUNCING ON THAT AXIS.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOUNCE PREVIEW DIAGRAM ───────────────────────────────────────────────────
// Tiny canvas-space visual showing the bounce corridor relative to a 1920×1080 grid.

function BouncePreview({ motion }) {
  const CW = 180, CH = 90; // diagram dimensions
  const CX = 1920, CY = 1080; // canvas space

  const left   = motion.bounceLeft   ?? 0;
  const right  = motion.bounceRight  ?? 1920;
  const top    = motion.bounceTop    ?? 0;
  const bottom = motion.bounceBottom ?? 1080;

  // Map canvas coords → diagram coords
  const mx = (x) => (x / CX) * CW;
  const my = (y) => (y / CY) * CH;

  const rx = mx(left);
  const ry = my(top);
  const rw = Math.max(0, mx(right) - mx(left));
  const rh = Math.max(0, my(bottom) - my(top));

  // Bounce arrow paths — horizontal and vertical chevrons inside the box
  const midY = ry + rh / 2;
  const midX = rx + rw / 2;
  const hasX = (motion.speedX ?? 0) !== 0;
  const hasY = (motion.speedY ?? 0) !== 0;

  return (
    <svg width={CW} height={CH} style={{ display: "block", margin: "0 auto 8px", borderRadius: 3, border: "1px solid var(--border)" }}
      viewBox={`0 0 ${CW} ${CH}`}>
      {/* Canvas background */}
      <rect width={CW} height={CH} fill="var(--bg4)" />
      {/* Full canvas outline */}
      <rect x={0.5} y={0.5} width={CW - 1} height={CH - 1} fill="none" stroke="var(--border)" strokeWidth={0.5} />
      {/* Bounce zone */}
      <rect x={rx} y={ry} width={rw} height={rh}
        fill="rgba(165,90,255,0.07)" stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" />
      {/* Horizontal bounce arrows */}
      {hasX && rw > 10 && (
        <>
          <line x1={rx + 4} y1={midY} x2={rx + rw - 4} y2={midY} stroke="#667eea" strokeWidth={1} markerEnd="none" />
          <polygon points={`${rx+4},${midY-2} ${rx+4},${midY+2} ${rx+10},${midY}`} fill="#667eea" />
          <polygon points={`${rx+rw-4},${midY-2} ${rx+rw-4},${midY+2} ${rx+rw-10},${midY}`} fill="#667eea" />
        </>
      )}
      {/* Vertical bounce arrows */}
      {hasY && rh > 10 && (
        <>
          <line x1={midX} y1={ry + 4} x2={midX} y2={ry + rh - 4} stroke="#dc4ce8" strokeWidth={1} />
          <polygon points={`${midX-2},${ry+4} ${midX+2},${ry+4} ${midX},${ry+10}`} fill="#dc4ce8" />
          <polygon points={`${midX-2},${ry+rh-4} ${midX+2},${ry+rh-4} ${midX},${ry+rh-10}`} fill="#dc4ce8" />
        </>
      )}
      {/* Labels */}
      <text x={rx + 2} y={ry + 7} fontSize={5} fill="var(--text3)" fontFamily="monospace">L:{left}</text>
      <text x={rx + rw - 2} y={ry + 7} fontSize={5} fill="var(--text3)" fontFamily="monospace" textAnchor="end">R:{right}</text>
      <text x={rx + 2} y={ry + rh - 2} fontSize={5} fill="var(--text3)" fontFamily="monospace">T:{top}</text>
      <text x={rx + 2} y={ry + rh + 6} fontSize={5} fill="var(--text3)" fontFamily="monospace">B:{bottom}</text>
    </svg>
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
  drift: { type: "drift", speedX: 0, speedY: -30, edgeMode: "wrap", bounceLeft: 0, bounceRight: 1920, bounceTop: 0, bounceBottom: 1080 },
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