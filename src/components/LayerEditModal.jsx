// components/LayerEditModal.jsx
//
// FULL-SCREEN-ISH MODAL FOR EDITING TRACKS, EFFECTS, OR PHYSICS ON A LAYER.
// THE THREE PANELS (TRACKEDITOR, EFFECTSPANEL, PHYSICSPANEL) RENDER INSIDE
// WITH MORE BREATHING ROOM. CHANGES ARE LIVE — DONE JUST CLOSES.

import { useEffect } from "react";
import { TrackEditor }  from "./TrackEditor";
import { EffectsPanel } from "./EffectsPanel";
import { PhysicsPanel } from "./PhysicsPanel";

const PANEL_META = {
  tracks: {
    label: "Animation Tracks",
    icon:  "◈",
    color: "var(--accent2)",
    hint:  "Changes apply live to the preview. Drag tracks to reorder.",
  },
  effects: {
    label: "Visual Effects",
    icon:  "✦",
    color: "var(--accent3)",
    hint:  "Effects stack in order. Changes apply live.",
  },
  physics: {
    label: "Motion / Physics",
    icon:  "⟳",
    color: "var(--accent4)",
    hint:  "Motions accumulate additively. Changes apply live.",
  },
};

export function LayerEditModal({ layer, panel, onClose, onUpdate, onUpdateEffects, onUpdatePhysics }) {
  const meta = PANEL_META[panel];

  // ESC to close — but not click-outside (sliders can drift)
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200,
    }}>
      <div style={{
        background: "var(--bg2)",
        border: `1px solid ${meta.color}44`,
        borderRadius: 10,
        width: 860,
        maxHeight: "82vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 0 60px ${meta.color}22, 0 8px 40px rgba(0,0,0,.6)`,
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px",
          borderBottom: `1px solid ${meta.color}33`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 22, color: meta.color }}>{meta.icon}</span>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 18, color: meta.color, letterSpacing: 1 }}>
              {meta.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>
              {layer.name}
            </div>
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: "var(--text3)", marginRight: 12, fontStyle: "italic" }}>
            {meta.hint}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: `1px solid ${meta.color}55`,
              color: meta.color, borderRadius: 4, padding: "6px 22px",
              fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 600,
              letterSpacing: 0.5, cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>

        {/* ── Content ── */}
        <div className="app-scrollable" style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px",
        }}>
          {panel === "tracks" && (
            <TrackEditor layer={layer} onUpdate={onUpdate} />
          )}
          {panel === "effects" && (
            <EffectsPanel
              layer={layer}
              onUpdateEffects={(newEffects) => onUpdateEffects(layer.id, newEffects)}
              expanded
            />
          )}
          {panel === "physics" && (
            <PhysicsPanel
              layer={layer}
              onUpdatePhysics={onUpdatePhysics}
              expanded
            />
          )}
        </div>

      </div>
    </div>
  );
}