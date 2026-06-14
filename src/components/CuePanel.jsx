// COMPONENTS/CUEPANEL.JSX
//
// SCENE-LEVEL CUE EDITOR MODAL.
// Allows users to create, edit, and delete cues that can be used
// to trigger AudioLayers, ExplosionLayers, and other future cue consumers.
//
// Props:
//   cues        — scene cues array
//   layers      — all layers (for the spriteFrame layer selector)
//   onUpdate    — (newCues) => void
//   onClose     — () => void

import { useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);

const TRIGGER_TYPES = [
  { value: "spriteFrame",   label: "🎞 Sprite Frame",    desc: "Fires when a sprite layer reaches a specific frame" },
  { value: "time",          label: "⏱ Time",             desc: "Fires once at a set time (ms) after preview starts" },
  { value: "layerFinished", label: "✅ Layer Finished",  desc: "Fires when a non-looping sprite track completes" },
  { value: "manual",        label: "🖱 Manual",          desc: "Only fires when triggered by code or a future button" },
];

const DEFAULT_TRIGGER = {
  spriteFrame:   { type: "spriteFrame",   layerId: "", frame: 0, rearmsOnLoop: true },
  time:          { type: "time",          ms: 1000 },
  layerFinished: { type: "layerFinished", layerId: "" },
  manual:        { type: "manual" },
};

function newCue() {
  return { id: uid(), label: "New Cue", trigger: { ...DEFAULT_TRIGGER.spriteFrame } };
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, color: "var(--text2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "var(--bg4)", border: "1px solid var(--border)",
        borderRadius: 3, color: "var(--text)", fontSize: 11,
        padding: "4px 8px", fontFamily: "var(--font-ui)",
      }}
    />
  );
}

function NumInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      min={min} max={max} step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "var(--bg4)", border: "1px solid var(--border)",
        borderRadius: 3, color: "var(--accent)", fontSize: 11,
        padding: "4px 8px", fontFamily: "var(--font-code)",
      }}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "var(--bg4)", border: "1px solid var(--border)",
        borderRadius: 3, color: "var(--text)", fontSize: 11,
        padding: "4px 8px", fontFamily: "var(--font-ui)",
      }}
    >
      {children}
    </select>
  );
}

// ── Trigger config sub-forms ──────────────────────────────────────────────────
function SpriteFrameTrigger({ trigger, onChange, spriteLayers }) {
  return (
    <>
      <Field label="Sprite Layer">
        {spriteLayers.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text3)" }}>No sprite layers in scene.</div>
        ) : (
          <Select value={trigger.layerId ?? ""} onChange={(v) => onChange({ ...trigger, layerId: v })}>
            <option value="">— Select a layer —</option>
            {spriteLayers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Frame Number">
        <NumInput value={trigger.frame ?? 0} min={0} step={1}
          onChange={(v) => onChange({ ...trigger, frame: Math.floor(v) })} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
          Re-arm on loop
        </label>
        <button
          onClick={() => onChange({ ...trigger, rearmsOnLoop: !(trigger.rearmsOnLoop ?? true) })}
          style={{
            fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer",
            fontFamily: "var(--font-ui)", letterSpacing: 0.5,
            background: (trigger.rearmsOnLoop ?? true) ? "rgba(103,254,189,.15)" : "transparent",
            border: `1px solid ${(trigger.rearmsOnLoop ?? true) ? "var(--accent2)" : "var(--border)"}`,
            color: (trigger.rearmsOnLoop ?? true) ? "var(--accent2)" : "var(--text3)",
          }}
        >
          {(trigger.rearmsOnLoop ?? true) ? "ON" : "OFF"}
        </button>
      </div>
      <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
        {(trigger.rearmsOnLoop ?? true)
          ? "Fires every time the sprite loops through this frame."
          : "Fires once only — even if the sprite loops."}
      </div>
    </>
  );
}

function TimeTrigger({ trigger, onChange }) {
  return (
    <Field label="Elapsed time (ms)">
      <NumInput value={trigger.ms ?? 1000} min={0} step={100}
        onChange={(v) => onChange({ ...trigger, ms: v })} />
      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
        Fires once, {((trigger.ms ?? 1000) / 1000).toFixed(2)}s after preview starts.
      </div>
    </Field>
  );
}

function LayerFinishedTrigger({ trigger, onChange, spriteLayers }) {
  return (
    <>
      <Field label="Sprite Layer">
        {spriteLayers.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text3)" }}>No sprite layers in scene.</div>
        ) : (
          <Select value={trigger.layerId ?? ""} onChange={(v) => onChange({ ...trigger, layerId: v })}>
            <option value="">— Select a layer —</option>
            {spriteLayers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        )}
      </Field>
      <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
        Only works with non-looping tracks. Re-arms automatically when the track restarts.
      </div>
    </>
  );
}

function ManualTrigger() {
  return (
    <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
      This cue won't fire automatically. Use <code style={{ color: "var(--accent)", fontSize: 10 }}>cueTimeline.fire("{'{'}id{'}'}")</code> in code, or a future trigger button.
    </div>
  );
}

// ── Single cue editor card ────────────────────────────────────────────────────
function CueCard({ cue, layers, onChange, onDelete, isSelected, onSelect }) {
  const spriteLayers = layers.filter((l) => l.type === "sprite");
  const triggerMeta  = TRIGGER_TYPES.find((t) => t.value === cue.trigger?.type);

  const setTriggerType = (type) => {
    onChange({ ...cue, trigger: { ...DEFAULT_TRIGGER[type] } });
  };

  const updateTrigger = (newTrigger) => {
    onChange({ ...cue, trigger: newTrigger });
  };

  return (
    <div
      style={{
        marginBottom: 8,
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 5,
        overflow: "hidden",
        background: isSelected ? "rgba(165,90,255,.06)" : "var(--bg2)",
      }}
    >
      {/* Card header */}
      <div
        onClick={onSelect}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px", cursor: "pointer",
          background: isSelected ? "rgba(165,90,255,.1)" : "var(--bg3)",
          borderBottom: isSelected ? "1px solid var(--border)" : "none",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--accent3)" }}>
          {isSelected ? "▾" : "▸"}
        </span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--text)", letterSpacing: 0.5 }}>
          {cue.label || "Unnamed Cue"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-code)" }}>
          {triggerMeta?.label ?? cue.trigger?.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ fontSize: 10, color: "#ff6666", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
        >
          ✕
        </button>
      </div>

      {/* Expanded editor */}
      {isSelected && (
        <div style={{ padding: "10px 12px" }}>
          <Field label="Cue Label">
            <TextInput
              value={cue.label}
              placeholder="e.g. Door Slam"
              onChange={(v) => onChange({ ...cue, label: v })}
            />
          </Field>

          <Field label="Cue ID">
            <div style={{ fontSize: 10, fontFamily: "var(--font-code)", color: "var(--accent)", padding: "3px 0" }}>
              {cue.id}
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>
              Reference this in Audio Layers and future cue consumers.
            </div>
          </Field>

          <Field label="Trigger Type">
            <Select value={cue.trigger?.type ?? "spriteFrame"} onChange={setTriggerType}>
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            {triggerMeta && (
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
                {triggerMeta.desc}
              </div>
            )}
          </Field>

          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 10 }} />

          {cue.trigger?.type === "spriteFrame"   && <SpriteFrameTrigger   trigger={cue.trigger} onChange={updateTrigger} spriteLayers={spriteLayers} />}
          {cue.trigger?.type === "time"           && <TimeTrigger          trigger={cue.trigger} onChange={updateTrigger} />}
          {cue.trigger?.type === "layerFinished"  && <LayerFinishedTrigger trigger={cue.trigger} onChange={updateTrigger} spriteLayers={spriteLayers} />}
          {cue.trigger?.type === "manual"         && <ManualTrigger />}
        </div>
      )}
    </div>
  );
}

// ── Main CuePanel modal ───────────────────────────────────────────────────────
export function CuePanel({ cues, layers, onUpdate, onClose }) {
  const [selectedId, setSelectedId] = useState(cues[0]?.id ?? null);

  const addCue = () => {
    const c = newCue();
    onUpdate([...cues, c]);
    setSelectedId(c.id);
  };

  const deleteCue = (id) => {
    const next = cues.filter((c) => c.id !== id);
    onUpdate(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const updateCue = (id, newCue) => {
    onUpdate(cues.map((c) => (c.id === id ? newCue : c)));
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 480, maxHeight: "80vh",
          background: "var(--bg2)", border: "1px solid var(--border2)",
          borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.7)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: "1px solid var(--border)",
          background: "var(--bg3)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1, textTransform: "uppercase" }}>
            ⚡ Cue Editor
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={addCue}
              style={{
                fontSize: 11, padding: "3px 12px", borderRadius: 3, cursor: "pointer",
                fontFamily: "var(--font-ui)", letterSpacing: 0.5,
                background: "rgba(165,90,255,.15)", border: "1px solid var(--accent)",
                color: "var(--accent)",
              }}
            >
              + Add Cue
            </button>
            <button
              onClick={onClose}
              style={{ fontSize: 13, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cue list */}
        <div className="app-scrollable" style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {cues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)", fontSize: 12, lineHeight: 1.8 }}>
              No cues yet.<br />
              <span style={{ fontSize: 11 }}>
                Cues let you trigger sounds, explosions, and other<br />
                events at specific moments in your animation.
              </span>
              <br /><br />
              <button
                onClick={addCue}
                style={{
                  fontSize: 11, padding: "5px 16px", borderRadius: 3, cursor: "pointer",
                  fontFamily: "var(--font-ui)", background: "rgba(165,90,255,.15)",
                  border: "1px solid var(--accent)", color: "var(--accent)",
                }}
              >
                + Add your first cue
              </button>
            </div>
          ) : (
            cues.map((cue) => (
              <CueCard
                key={cue.id}
                cue={cue}
                layers={layers}
                isSelected={selectedId === cue.id}
                onSelect={() => setSelectedId(selectedId === cue.id ? null : cue.id)}
                onChange={(updated) => updateCue(cue.id, updated)}
                onDelete={() => deleteCue(cue.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}