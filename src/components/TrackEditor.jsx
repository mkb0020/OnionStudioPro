// COMPONENTS/TRACKEDITOR.JSX

// THIS MODULE PROVIDES A COMPLETE UI FOR MANAGING ANIMATION TRACKS WITHIN A LAYER, ALLOWING USERS TO ADD, DELETE, REORDER, AND CONFIGURE TRACKS WITH CUSTOM FRAME RANGES, FPS, OPACITY, BLEND MODES, AND LOOPING BEHAVIOR. IT ALSO INCLUDES A PER-TRACK EFFECTS SYSTEM WITH GLITCH, HUE SHIFT, AND INVERT OPTIONS, EACH WITH THEIR OWN ADJUSTABLE PARAMETERS. THE TRACKEDITOR COMPONENT EXPORTS A FUNCTIONAL INTERFACE FOR UPDATING THE LAYER'S TRACK CONFIGURATION VIA AN ONUPDATE CALLBACK.

import { useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);

const BLEND_MODES = [
  "source-over", "screen", "multiply", "overlay",
  "add", "lighter", "difference", "exclusion",
];

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

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 10, color: "var(--text2)", display: "block", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniBtn({ children, onClick, red }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10, padding: "1px 7px", borderRadius: 2,
      border: `1px solid ${red ? "rgba(204,0,0,.5)" : "var(--border)"}`,
      color: red ? "#ff6666" : "var(--text3)",
      background: "none", cursor: "pointer", fontFamily: "var(--font-ui)", flexShrink: 0,
    }}>{children}</button>
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
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <label style={{ margin: 0, fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>{label}</label>
        <input type="number" min={min} max={max} step={step} value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value); }}
          style={{ width: 50, textAlign: "right", fontSize: 10, padding: "1px 4px", fontFamily: "var(--font-code)", color: "var(--accent)", background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: 3 }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); setInputVal(String(v)); onChange(v); }}
        style={{ width: "100%", accentColor: "var(--accent)" }} />
    </div>
  );
}

// ─── FRAME INPUT ──────────────────────────────────────────────────────────────

function parseFrameInput(str) {
  const results = [];
  for (const part of str.split(",").map((s) => s.trim())) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (!isNaN(a) && !isNaN(b) && b >= a)
        for (let i = a; i <= b; i++) results.push(i);
    } else {
      const n = parseInt(part);
      if (!isNaN(n)) results.push(n);
    }
  }
  return [...new Set(results)].sort((a, b) => a - b);
}

function framesToString(frames) {
  if (!frames || frames.length === 0) return "0";
  if (frames.length === 1) return String(frames[0]);
  const ranges = [];
  let start = frames[0], end = frames[0];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i] === end + 1) { end = frames[i]; }
    else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = frames[i]; }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

function FrameInput({ frames, onChange }) {
  const [val, setVal] = useState(() => framesToString(frames));
  const [error, setError] = useState(false);
  const commit = (str) => {
    const parsed = parseFrameInput(str);
    if (parsed.length === 0) { setError(true); return; }
    setError(false);
    setVal(framesToString(parsed));
    onChange(parsed);
  };
  return (
    <input value={val}
      onChange={(e) => { setVal(e.target.value); setError(false); }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") commit(e.target.value); }}
      placeholder="e.g. 0  or  3-13  or  1,2,5"
      style={{ width: "100%", fontSize: 11, fontFamily: "var(--font-code)", border: `1px solid ${error ? "#cc0000" : "var(--border)"}`, background: "var(--bg3)", color: error ? "#ff6666" : "var(--accent2)", borderRadius: 3, padding: "3px 6px" }} />
  );
}

// ─── PER-EFFECT CONTROLS ──────────────────────────────────────────────────────

function GlitchControls({ effect, onUpdate }) {
  return (
    <>
      <SliderRow label="Intensity" value={effect.intensity ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...effect, intensity: v })} />
      <SliderRow label="Speed"     value={effect.speed ?? 0.5}     min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...effect, speed: v })} />
    </>
  );
}

function HueShiftControls({ effect, onUpdate }) {
  return (
    <>
      <SliderRow label="Hue"        value={effect.hue ?? 0}        min={0} max={360} step={1}    onChange={(v) => onUpdate({ ...effect, hue: v })} />
      <SliderRow label="Saturation" value={effect.saturation ?? 1} min={0} max={2}   step={0.01} onChange={(v) => onUpdate({ ...effect, saturation: v })} />
      <SliderRow label="Brightness" value={effect.brightness ?? 1} min={0} max={2}   step={0.01} onChange={(v) => onUpdate({ ...effect, brightness: v })} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>Auto-cycle</label>
        <button onClick={() => onUpdate({ ...effect, animate: !(effect.animate ?? false) })}
          style={{ fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "var(--font-ui)",
            background: (effect.animate ?? false) ? "rgba(103,254,189,.15)" : "transparent",
            border: `1px solid ${(effect.animate ?? false) ? "var(--accent2)" : "var(--border)"}`,
            color: (effect.animate ?? false) ? "var(--accent2)" : "var(--text3)" }}>
          {(effect.animate ?? false) ? "ON" : "OFF"}
        </button>
      </div>
      {(effect.animate ?? false) && (
        <SliderRow label="Cycle Speed" value={effect.speed ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...effect, speed: v })} />
      )}
    </>
  );
}

function InvertControls({ effect, onUpdate }) {
  return (
    <SliderRow label="Amount" value={effect.amount ?? 1} min={0} max={1} step={0.01}
      onChange={(v) => onUpdate({ ...effect, amount: v })} />
  );
}

const EFFECT_CONTROLS = { glitch: GlitchControls, hueShift: HueShiftControls, invert: InvertControls };

// ─── TRACK EFFECTS MINI-PANEL ─────────────────────────────────────────────────

function TrackEffects({ effects, onUpdate }) {
  const activeTypes = new Set((effects || []).map((e) => e.type));
  const [openEffect, setOpenEffect] = useState(null);

  const addEffect = (type) => {
    onUpdate([...(effects || []), { ...EFFECT_DEFAULTS[type] }]);
    setOpenEffect(type);
  };

  const removeEffect = (type) => {
    onUpdate((effects || []).filter((e) => e.type !== type));
    if (openEffect === type) setOpenEffect(null);
  };

  const updateEffect = (type, cfg) => {
    onUpdate((effects || []).map((e) => (e.type === type ? cfg : e)));
  };

  const available = EFFECT_OPTIONS.filter((o) => !activeTypes.has(o.value));

  return (
    <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "var(--accent3)", letterSpacing: 1, textTransform: "uppercase" }}>✦ Track Effects</span>
        {available.length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) addEffect(e.target.value); }}
            style={{ fontSize: 10, padding: "1px 4px", background: "var(--bg3)", border: "1px solid var(--accent3)", color: "var(--accent3)", borderRadius: 3, cursor: "pointer" }}>
            <option value="">+ Effect</option>
            {available.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {(effects || []).length === 0 && (
        <div style={{ fontSize: 10, color: "var(--text3)" }}>No effects on this track.</div>
      )}

      {(effects || []).map((effect) => {
        const Controls = EFFECT_CONTROLS[effect.type];
        const label = EFFECT_OPTIONS.find((o) => o.value === effect.type)?.label ?? effect.type;
        const isOpen = openEffect === effect.type;
        return (
          <div key={effect.type} style={{ marginBottom: 4, border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <div onClick={() => setOpenEffect(isOpen ? null : effect.type)}
              style={{ display: "flex", alignItems: "center", padding: "3px 7px", background: "var(--bg3)", cursor: "pointer" }}>
              <span style={{ fontSize: 9, color: "var(--accent3)", marginRight: 5 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "var(--text)" }}>{label}</span>
              <button onClick={(e) => { e.stopPropagation(); removeEffect(effect.type); }}
                style={{ fontSize: 9, color: "#ff6666", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            {isOpen && Controls && (
              <div style={{ padding: "6px 10px", background: "var(--bg2)" }}>
                <Controls effect={effect} onUpdate={(cfg) => updateEffect(effect.type, cfg)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TRACK CARD ───────────────────────────────────────────────────────────────

function TrackCard({ track, index, total, onUpdate, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(track.name);
  const up = (key, val) => onUpdate({ ...track, [key]: val });

  return (
    <div style={{ border: `1px solid ${track.enabled ? "var(--border2)" : "var(--border)"}`, borderRadius: 4, marginBottom: 6, overflow: "hidden", opacity: track.enabled ? 1 : 0.5 }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", background: "var(--bg3)", cursor: "pointer" }}>
        <span onClick={() => setExpanded((v) => !v)} style={{ fontSize: 9, color: "var(--text3)", userSelect: "none" }}>
          {expanded ? "▾" : "▸"}
        </span>
        <button onClick={() => up("enabled", !track.enabled)} style={{ fontSize: 10, background: "none", border: "none", cursor: "pointer", color: track.enabled ? "var(--accent2)" : "var(--text3)", padding: 0 }}>
          {track.enabled ? "👁" : "○"}
        </button>
        {editingName ? (
          <input autoFocus value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { up("name", nameVal || track.name); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { up("name", nameVal || track.name); setEditingName(false); } }}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, fontSize: 11, padding: "1px 4px" }} />
        ) : (
          <span onClick={() => setExpanded((v) => !v)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--text)", cursor: "pointer", userSelect: "none" }}>
            {track.name}
            <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 6 }}>
              [{framesToString(track.frames)}]
              {(track.effects || []).length > 0 && <span style={{ color: "var(--accent3)", marginLeft: 4 }}>✦{track.effects.length}</span>}
            </span>
          </span>
        )}
        <MiniBtn onClick={() => onMove(index, -1)}>↑</MiniBtn>
        <MiniBtn onClick={() => onMove(index, 1)}>↓</MiniBtn>
        <MiniBtn red onClick={onDelete}>✕</MiniBtn>
      </div>

      {/* BODY */}
      {expanded && (
        <div style={{ padding: "8px 10px", background: "var(--bg2)" }}>
          <Row label="Frames (e.g. 0  or  3-13  or  1,2,5)">
            <FrameInput frames={track.frames} onChange={(f) => up("frames", f)} />
          </Row>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Row label="FPS">
                <input type="number" min={1} max={120} step={1} value={track.fps ?? 12}
                  onChange={(e) => up("fps", parseInt(e.target.value) || 12)}
                  style={{ fontSize: 11 }} />
              </Row>
            </div>
            <div style={{ flex: 1 }}>
              <Row label="Opacity">
                <input type="number" min={0} max={1} step={0.01} value={track.opacity ?? 1}
                  onChange={(e) => up("opacity", parseFloat(e.target.value))}
                  style={{ fontSize: 11 }} />
              </Row>
            </div>
          </div>
          <Row label="Blend Mode">
            <select value={track.blendMode || "source-over"} onChange={(e) => up("blendMode", e.target.value)}>
              {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Row>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <label style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>Loop</label>
            <button onClick={() => up("loop", !track.loop)} style={{
              fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "var(--font-ui)",
              background: track.loop ? "rgba(165,90,255,.15)" : "transparent",
              border: `1px solid ${track.loop ? "var(--accent)" : "var(--border)"}`,
              color: track.loop ? "var(--accent)" : "var(--text3)",
            }}>{track.loop ? "ON" : "OFF"}</button>
          </div>
          <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 4 }}>
            {track.frames.length} frame{track.frames.length !== 1 ? "s" : ""}
            {track.frames.length <= 1 ? " — static" : ` — ${(track.frames.length / (track.fps || 12)).toFixed(2)}s per cycle`}
          </div>

          {/* PER-TRACK EFFECTS */}
          <TrackEffects
            effects={track.effects || []}
            onUpdate={(newEffects) => up("effects", newEffects)}
          />
        </div>
      )}
    </div>
  );
}

// ─── TRACKEDITOR ──────────────────────────────────────────────────────────────

export function TrackEditor({ layer, onUpdate }) {
  const tracks = layer.config.tracks || [];
  const setTracks = (newTracks) => onUpdate(layer.id, "tracks", newTracks);
  const addTrack = () => {
    setTracks([...tracks, { id: uid(), name: `Track ${tracks.length + 1}`, frames: [0], fps: 12, loop: true, opacity: 1, blendMode: "source-over", enabled: true, effects: [] }]);
  };
  const updateTrack = (i, updated) => { const n = [...tracks]; n[i] = updated; setTracks(n); };
  const deleteTrack = (i) => setTracks(tracks.filter((_, idx) => idx !== i));
  const moveTrack = (i, dir) => {
    const n = [...tracks]; const t = i + dir;
    if (t < 0 || t >= n.length) return;
    [n[i], n[t]] = [n[t], n[i]]; setTracks(n);
  };

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--accent2)", letterSpacing: 1, textTransform: "uppercase" }}>◈ Animation Tracks</span>
        <button onClick={addTrack} style={{ fontSize: 11, color: "var(--accent2)", background: "none", border: "1px solid var(--accent2)", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontFamily: "var(--font-ui)", opacity: 0.85 }}>
          + Track
        </button>
      </div>
      {tracks.length === 0 && <div style={{ fontSize: 11, color: "var(--text3)", padding: "6px 0" }}>No tracks. Click + Track to add one.</div>}
      {tracks.map((track, i) => (
        <TrackCard key={track.id} track={track} index={i} total={tracks.length}
          onUpdate={(updated) => updateTrack(i, updated)}
          onDelete={() => deleteTrack(i)}
          onMove={(_, dir) => moveTrack(i, dir)} />
      ))}
      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 4, lineHeight: 1.5 }}>
        TRACKS RENDER BOTTOM → TOP. DOUBLE-CLICK A NAME TO RENAME.
      </div>
    </div>
  );
}