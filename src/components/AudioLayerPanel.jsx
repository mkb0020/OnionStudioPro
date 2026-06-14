// COMPONENTS/AUDIOLAYERPANEL.JSX
//
// PROPERTY PANEL FOR AUDIO LAYERS.
// Rendered by PropertyPanel when layer.type === "audio".
//
// Props:
//   layer          — the audio layer object
//   onUpdate       — (newConfig) => void
//   cues           — scene cues array (for cue selector dropdown)
//   audioLayerRef  — ref to the live AudioLayer engine instance (for preview play)

import { useRef } from "react";
import { BUILT_IN_SOUNDS } from "../engine/audio/AudioLayer.js";

// ── shared slider (mirrors the one in EffectsPanel) ───────────────────────────
function SliderRow({ label, value, onChange, min, max, step = 0.01 }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <label style={{ margin: 0, fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
          {label}
        </label>
        <span style={{ fontSize: 10, fontFamily: "var(--font-code)", color: "var(--accent)", minWidth: 32, textAlign: "right" }}>
          {value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }} />
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "var(--text2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Sound library grid ────────────────────────────────────────────────────────
function SoundLibrary({ selected, onSelect }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "var(--text2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
        Built-in Sounds
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {BUILT_IN_SOUNDS.map((s) => {
          const isSel = selected === s.src;
          return (
            <div
              key={s.src}
              onClick={() => onSelect(s.src)}
              style={{
                padding: "5px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "var(--font-ui)",
                color: isSel ? "var(--accent)" : "var(--text2)",
                background: isSel ? "rgba(165,90,255,.18)" : "var(--bg3)",
                border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(165,90,255,.08)"; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "var(--bg3)"; }}
            >
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function AudioLayerPanel({ layer, onUpdate, cues = [], audioLayerRef }) {
  const cfg = layer.config;
  const fileInputRef = useRef(null);

  const set = (key, val) => onUpdate({ ...cfg, [key]: val });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdate({ ...cfg, src: url, _uploadedName: file.name });
  };

  const handlePreviewPlay = () => {
    audioLayerRef?.current?.play();
  };

  const selectedIsBuiltIn = BUILT_IN_SOUNDS.some((s) => s.src === cfg.src);
  const displaySrc = cfg._uploadedName
    ? `📁 ${cfg._uploadedName}`
    : selectedIsBuiltIn
      ? BUILT_IN_SOUNDS.find((s) => s.src === cfg.src)?.label ?? cfg.src
      : cfg.src || "None selected";

  return (
    <div className="app-scrollable" style={{ padding: "10px 10px 24px 10px", overflow: "auto", height: "100%", flex: 1, minHeight: 0 }}>

      {/* Layer type label */}
      <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
        🔊 Audio Layer — {layer.name}
      </div>

      {/* Sound source */}
      <SoundLibrary
        selected={cfg.src}
        onSelect={(src) => onUpdate({ ...cfg, src, _uploadedName: undefined })}
      />

      {/* Upload custom */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          or upload your own:
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 3, cursor: "pointer",
              fontFamily: "var(--font-ui)", letterSpacing: 0.5,
              background: "transparent", border: "1px solid var(--border2)",
              color: "var(--text2)",
            }}
          >
            Browse…
          </button>
          <span style={{ fontSize: 10, color: "var(--text3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displaySrc}
          </span>
          {cfg.src && (
            <button
              onClick={handlePreviewPlay}
              title="Preview sound"
              style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 3, cursor: "pointer",
                fontFamily: "var(--font-ui)", background: "rgba(103,254,189,.12)",
                border: "1px solid var(--accent2)", color: "var(--accent2)", flexShrink: 0,
              }}
            >
              ▶ Preview
            </button>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />

      {/* Cue selector */}
      <Row label="Trigger Cue">
        {cues.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
            No cues defined yet. Add cues in the{" "}
            <span style={{ color: "var(--text2)" }}>Cue Editor</span> to trigger this sound.
          </div>
        ) : (
          <select value={cfg.cueId ?? ""} onChange={(e) => set("cueId", e.target.value)}>
            <option value="">— No trigger (manual only) —</option>
            {cues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || c.id}
              </option>
            ))}
          </select>
        )}
      </Row>

      {/* Volume */}
      <SliderRow
        label="Volume"
        value={cfg.volume ?? 0.8}
        min={0} max={1} step={0.01}
        onChange={(v) => set("volume", v)}
      />

      {/* Playback rate */}
      <SliderRow
        label="Playback Rate"
        value={cfg.playbackRate ?? 1.0}
        min={0.5} max={4} step={0.05}
        onChange={(v) => set("playbackRate", v)}
      />

      {/* Pool size */}
      <SliderRow
        label="Max Simultaneous"
        value={cfg.poolSize ?? 3}
        min={1} max={8} step={1}
        onChange={(v) => set("poolSize", v)}
      />

      {/* Loop toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
          Loop
        </label>
        <button
          onClick={() => set("loop", !(cfg.loop ?? false))}
          style={{
            fontSize: 10, padding: "2px 10px", borderRadius: 3, cursor: "pointer",
            fontFamily: "var(--font-ui)", letterSpacing: 0.5,
            background: (cfg.loop ?? false) ? "rgba(103,254,189,.15)" : "transparent",
            border: `1px solid ${(cfg.loop ?? false) ? "var(--accent2)" : "var(--border)"}`,
            color: (cfg.loop ?? false) ? "var(--accent2)" : "var(--text3)",
          }}
        >
          {(cfg.loop ?? false) ? "ON" : "OFF"}
        </button>
      </div>

      {(cfg.loop ?? false) && (
        <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.5, marginBottom: 8 }}>
          Loop ignores Max Simultaneous — a single element is reused.
        </div>
      )}

    </div>
  );
}