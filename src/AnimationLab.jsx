import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "../assets/css/styles.css";

import { ParticleSystem } from "./engine/ParticleSystem";
import { SpriteRenderer } from "./engine/SpriteRenderer";
import { PARTICLE_PRESETS, DEFAULT_PARTICLE, DEFAULT_SPRITE } from "./presets/particlePresets.js";
import { generateCode } from "./export/codeGenerator.js";
import { EffectChain, TrackEffectChains } from "./engine/effects/EffectChain.js";
import { PhysicsDriver } from "./engine/physics/PhysicsDriver";
import { PhysicsPanel }  from "./components/PhysicsPanel";
import { EffectsPanel } from "./components/EffectsPanel";
import { TrackEditor } from "./components/TrackEditor";
import { SpriteBuilderModal } from "./components/SpriteBuilderModal";
import { AudioLayerPanel } from "./components/AudioLayerPanel.jsx";
import { AudioLayer, DEFAULT_AUDIO_CONFIG } from "./engine/audio/AudioLayer.js";
import { CuePanel } from "./components/CuePanel.jsx";
import { LayerEditModal }    from "./components/LayerEditModal";
import OpeningAnimation from "./ui/OpeningAnimation";
import { CueTimeline, buildLayerSnapshot } from "./engine/cues/CueTimeline.js";


  
    import { createPrettyWindow, minimize, close } from './ui/window/window.js';
    createPrettyWindow({
      title:       'Onion Studio Pro',
      icon:        '🧅',
      accentColor: 'violet',
      showStatus:  false,
    });

    document.getElementById('pk-maximize')?.remove();

    document.getElementById('pk-minimize')?.addEventListener('click',
      /**
       * Handles minimize button click by invoking the Tauri window minimize command.
       */
      () => {
      window.__TAURI_INTERNALS__?.invoke('plugin:window|minimize', { label: 'main' });
    });

    document.getElementById('pk-close')?.addEventListener('click',
      /**
       * Handles close button click by invoking the Tauri window close command.
       */
      () => {
      window.__TAURI_INTERNALS__?.invoke('plugin:window|close', { label: 'main' });
    });


/**
 * Generates a random identifier string.
 * Returns a string of 7 alphanumeric characters.
 */
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Virtual resolution constants ───────────────────────────────────
const VIRTUAL_W = 1920;
const VIRTUAL_H = 1080;

// ─── Shared UI Primitives (unchanged) ──────────────────────────────
/**
 * Renders a styled button with optional accent shimmer and size variants.
 */
function Btn({ children, onClick, accent, size = "md", style = {}, className = "" }) {
  let btnClass = "holo-btn";
  if (size === "sm") btnClass += " holo-btn--sm";
  if (size === "lg") btnClass += " holo-btn--lg";
  if (accent) btnClass += " holo-btn--shimmer";
  return (
    <button onClick={onClick} className={`${btnClass} ${className}`} style={style}>
      {children}
    </button>
  );
}

/**
 * Renders a small button variant, optionally with red text for destructive actions.
 */
function MiniBtn({ children, onClick, red }) {
  return (
    <button
      onClick={onClick}
      className="holo-btn holo-btn--sm"
      style={red ? { color: '#ff6666' } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Layout wrapper that displays a label above child elements.
 */
function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          marginBottom: 3,
          fontSize: 11,
          color: "var(--text2)",
          display: "block",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Renders a labeled slider with an editable numeric input, synced to a config object.
 */
function SliderRow({ label, id, cfg, onUpdate, min, max, step = 1 }) {
  const val = cfg[id] ?? 0;
  const [inputVal, setInputVal] = useState(String(val));
  const isFloat = step < 1;

  useEffect(
    /**
     * Synchronizes the displayed numeric input with the slider value whenever the config value changes.
     */
    () => {
    setInputVal(
      String(
        typeof val === "number"
          ? isFloat
            ? val.toFixed(step < 0.01 ? 2 : 1)
            : val
          : val
      )
    );
  }, [val, isFloat, step]);

  /**
   * Commits a slider/numeric input value by parsing, clamping, and triggering the onUpdate callback.
   */
  const commit = (raw) => {
    const parsed = isFloat ? parseFloat(raw) : parseInt(raw);
    if (isNaN(parsed)) {
      setInputVal(String(val));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setInputVal(String(clamped));
    onUpdate(id, clamped);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <label
          style={{
            margin: 0,
            fontSize: 11,
            color: "var(--text2)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            flex: 1,
          }}
        >
          {label}
        </label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputVal}
          onChange={
            /**
             * Updates local input state as the user types in the numeric field.
             */
            (e) => setInputVal(e.target.value)
          }
          onBlur={
            /**
             * Commits the value when the numeric input loses focus.
             */
            (e) => commit(e.target.value)
          }
          onKeyDown={
            /**
             * Commits the value when Enter is pressed inside the numeric input.
             */
            (e) => {
            if (e.key === "Enter") commit(e.target.value);
          }}
          style={{
            width: 54,
            textAlign: "right",
            fontSize: 10,
            padding: "1px 4px",
            fontFamily: "var(--font-code)",
            color: "var(--accent)",
            background: "var(--bg4)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={
          /**
           * Updates the slider value, syncs the numeric input, and triggers the onUpdate callback.
           */
          (e) => {
          const v = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
          setInputVal(String(v));
          onUpdate(id, v);
        }}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────
/**
 * Application header bar with logo, background color picker, and action buttons.
 */
function Header({ onAdd, onExport, bgColor, onBgChange, onFullscreen, onSpriteBuilder, onCueEditor }) {
  return (
    <div
      style={{
        height: 36,   // was 42 – made shorter
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 12,      // reduced gap slightly
        flexShrink: 0,
      }}
    > 
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <img
          src="/images/logo.png"
          alt="Logo"
          style={{ width: 18, height: 18, display: "block", objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--accent)",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Onion Studio Pro
        </span>
      </div>
      <span style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ margin: 0, color: "var(--text3)", fontSize: 10 }}>BG</label>
        <input
          type="color"
          value={bgColor}
          onChange={
            /**
             * Updates the global background color.
             */
            (e) => onBgChange(e.target.value)
          }
          style={{
            width: 32,
            height: 22,
            padding: 1,
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "none",
            cursor: "pointer",
          }}
        />
      </div>
      <Btn onClick={onFullscreen} size="sm">
        ⛶ Fullscreen Preview
      </Btn>
      <Btn onClick={onSpriteBuilder} size="sm">
        Sprite Builder
      </Btn>
      <Btn onClick={onCueEditor} size="sm">
        ⚡ Cue Editor
      </Btn>
      <Btn onClick={onAdd} size="sm">
        + Add Layer
      </Btn>
      <Btn onClick={onExport} size="sm">
        ↓ Export HTML
      </Btn>
    </div>
  );
}

// ─── Preview Canvas (virtual resolution) ───────────────────────────
/**
 * Scales the virtual canvas to fit the container while maintaining aspect ratio.
 * Provides a clickable fullscreen button overlay.
 */
function PreviewCanvas({ canvasRef, onFullscreen }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(
    /**
     * Initializes the preview canvas to the virtual resolution.
     */
    () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = VIRTUAL_W;
      canvas.height = VIRTUAL_H;
    }
  }, []);

  useEffect(
    /**
     * Observes container size changes and updates the canvas scale to fit.
     */
    () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(
      /**
       * Calculates and sets the scale to fit the virtual canvas within its container.
       */
      () => {
      const scaleX = wrap.clientWidth / VIRTUAL_W;
      const scaleY = wrap.clientHeight / VIRTUAL_H;
      setScale(Math.min(scaleX, scaleY));
    });
    ro.observe(wrap);
    const scaleX = wrap.clientWidth / VIRTUAL_W;
    const scaleY = wrap.clientHeight / VIRTUAL_H;
    setScale(Math.min(scaleX, scaleY));
    return (
      /**
       * Cleanup: disconnects the ResizeObserver when the component unmounts.
       */
      () => ro.disconnect()
    );
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          position: "absolute",
          top: 0,
          left: 0,
          width: VIRTUAL_W,
          height: VIRTUAL_H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          imageRendering: "crisp-edges",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 8,
          fontSize: 9,
          color: "rgba(255,255,255,.35)",
          letterSpacing: 2,
          fontFamily: "var(--font-ui)",
          textTransform: "uppercase",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        Preview <span style={{ color: "rgba(255,255,255,.15)" }}>{VIRTUAL_W}×{VIRTUAL_H}</span>
      </div>
      <button
        onClick={onFullscreen}
        title="Fullscreen preview"
        className="holo-btn holo-btn--sm"
        style={{ position: "absolute", top: 6, right: 8, zIndex: 2 }}
      >
        ⛶
      </button>
    </div>
  );
}

// ─── Fullscreen Modal ───────────────────────────────────────────────
/**
 * Fullscreen overlay that renders all visible layers on a properly‑sized canvas.
 * Handles particle effects, sprite tracks, physics, and effect chains.
 */
function FullscreenModal({ layers, bgColor, onClose }) {
  const canvasRef = useRef(null);
  const systemsRef        = useRef({});
  const effectChainsRef   = useRef({});
  const trackChainsRef    = useRef({});
  const physicsDriversRef = useRef({});
  const bounceVelRef      = useRef({}); // per-layer { vx, vy, x, y } for bounce drift
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  useEffect(
    /**
     * Sets up the fullscreen rendering loop, initializing per‑layer systems, effect chains, and physics drivers.
     * Returns a cleanup function that cancels the animation frame and clears stored refs.
     */
    () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = VIRTUAL_W;
    canvas.height = VIRTUAL_H;

    layers.forEach((l) => {
      if (l.type === "particle") {
        systemsRef.current[l.id] = new ParticleSystem({ ...l.config, width: VIRTUAL_W, height: VIRTUAL_H });
      } else if (l.type === "sprite") {
        systemsRef.current[l.id] = new SpriteRenderer(l.config);
      }
      effectChainsRef.current[l.id] = new EffectChain(VIRTUAL_W, VIRTUAL_H);
      physicsDriversRef.current[l.id] = new PhysicsDriver();
      if (l.type === "sprite") {
        trackChainsRef.current[l.id] = new TrackEffectChains(VIRTUAL_W, VIRTUAL_H);
        trackChainsRef.current[l.id].sync(l.config.tracks || []);
      }
    });

    const ctx = canvas.getContext("2d");
    // Reset timestamp so first dt isn't the full time since page load
    lastRef.current = 0;
    /**
     * Animation loop that renders all visible layers onto the fullscreen canvas.
     */
    function loop(t) {
      // Skip the first frame to establish a clean timestamp baseline
      if (lastRef.current === 0) { lastRef.current = t; rafRef.current = requestAnimationFrame(loop); return; }
      const dt = t - lastRef.current;
      lastRef.current = t;
      const snapshot = buildLayerSnapshot(layers, systemsRef.current);
      cueTimelineRef.current.tick(dt, snapshot);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      [...layers]
        .sort(
          /**
           * Sorts layers by zIndex for correct draw order.
           */
          (a, b) => a.zIndex - b.zIndex)
        .forEach(
          /**
           * Processes each layer for rendering, handling physics bounce, effects, and type‑specific drawing.
           */
          (l) => {
          if (!l.visible) return;
          if (l.type === "audio") return; // audio layers have no canvas output
          const sys = systemsRef.current[l.id];
          if (!sys) return;

          // ── Bounce drift: manage velocity + position in bounceVelRef ──────
          // SpriteRenderer adds transform.x/y ON TOP OF the sprite's cfg.x/cfg.y,
          // so our offset runs in delta-space (0 = sprite at its configured position).
          // The UI boundary sliders are in absolute canvas coords, so we convert:
          //   offsetMin = canvasBound - basePos
          //   offsetMax = canvasBound - basePos
          // This way bounceRight:1920 always means "right edge of canvas" regardless
          // of where the sprite is configured to sit.
          const driftMotion = l.physics?.motions?.find(
            /**
             * Finds the first drift motion in the physics configuration.
             */
            (m) => m.type === "drift");
          const isBounce = driftMotion?.edgeMode === "bounce";
          let bounceOffset = null;

          if (isBounce && driftMotion) {
            // Sprite's configured base position in canvas space
            const baseX = l.config?.x ?? 0;
            const baseY = l.config?.y ?? 0;

            // Absolute canvas boundaries → offset-space limits
            const left   = (driftMotion.bounceLeft   ?? 0)         - baseX;
            const right  = (driftMotion.bounceRight  ?? VIRTUAL_W) - baseX;
            const top    = (driftMotion.bounceTop    ?? 0)         - baseY;
            const bottom = (driftMotion.bounceBottom ?? VIRTUAL_H) - baseY;


            const configKey = `${left},${right},${top},${bottom},${driftMotion.speedX},${driftMotion.speedY}`;
            const existing = bounceVelRef.current[l.id];
            if (!existing || existing.configKey !== configKey) {
              bounceVelRef.current[l.id] = {
                vx: driftMotion.speedX ?? 0,
                vy: driftMotion.speedY ?? 30,
                x: Math.max(left, Math.min(right,  existing?.x ?? left)),
                y: Math.max(top,  Math.min(bottom, existing?.y ?? top)),
                configKey,
              };
            }
            const bv = bounceVelRef.current[l.id];
            const dtSec = dt / 1000;

            bv.x += bv.vx * dtSec;
            bv.y += bv.vy * dtSec;

            if (bv.vx !== 0) {
              if (bv.x <= left)  { bv.x = left;   bv.vx =  Math.abs(bv.vx); }
              if (bv.x >= right) { bv.x = right;  bv.vx = -Math.abs(bv.vx); }
            }
            if (bv.vy !== 0) {
              if (bv.y <= top)    { bv.y = top;    bv.vy =  Math.abs(bv.vy); }
              if (bv.y >= bottom) { bv.y = bottom; bv.vy = -Math.abs(bv.vy); }
            }

            bounceOffset = { x: bv.x, y: bv.y };
          } else if (bounceVelRef.current[l.id]) {
            delete bounceVelRef.current[l.id];
          }

          const physicsForDriver = isBounce && l.physics
            ? {
                ...l.physics,
                motions: l.physics.motions.map(
                  /**
                   * Neutralizes drift speed for bounce handling when bounce mode is active.
                   */
                  (m) =>
                  m.type === "drift" ? { ...m, speedX: 0, speedY: 0 } : m
                ),
              }
            : l.physics;

          const driver = physicsDriversRef.current[l.id];
          const rawTransform = driver?.update(dt, physicsForDriver) ?? null;

          const transform = rawTransform
            ? {
                ...rawTransform,
                x: (rawTransform.x ?? 0) + (bounceOffset?.x ?? 0),
                y: (rawTransform.y ?? 0) + (bounceOffset?.y ?? 0),
              }
            : bounceOffset
            ? { x: bounceOffset.x, y: bounceOffset.y, scaleX: 1, scaleY: 1, rotation: 0 }
            : null;

          const hasTransform = transform && (
            transform.x !== 0 || transform.y !== 0 ||
            transform.scaleX !== 1 || transform.scaleY !== 1 ||
            transform.rotation !== 0
          );

          if (l.type === "sprite") {
            sys.update(dt);
            const layerChain = effectChainsRef.current[l.id];
            const trackChains = trackChainsRef.current[l.id];
            const tracks = l.config.tracks || [];

            // renderSpriteTracks composites all tracks onto targetCtx.
            // When layer effects exist, EffectChain calls this on its offscreen
            // so the full composited sprite is available as a clean snapshot.
            /**
             * Renders all enabled sprite tracks onto a given canvas context, applying per‑track effects and transforms.
             */
            const renderSpriteTracks = (targetCtx) => {
              tracks.forEach((track) => {
                if (!track.enabled) return;
                const trackEffects = track.effects || [];
                const chain = trackChains?.get(track.id);
                targetCtx.save();
                targetCtx.globalAlpha = track.opacity ?? 1;
                targetCtx.globalCompositeOperation = track.blendMode || "source-over";
                if (chain && trackEffects.length > 0) {
                  chain.apply(targetCtx, canvas, trackEffects, dt, (offCtx) => {
                    hasTransform
                      ? sys.renderTrackWithTransform(offCtx, track, transform)
                      : sys.renderTrack(offCtx, track);
                  });
                } else {
                  hasTransform
                    ? sys.renderTrackWithTransform(targetCtx, track, transform)
                    : sys.renderTrack(targetCtx, track);
                }
                targetCtx.restore();
              });
            };

            // Apply layer-level effects over the fully composited sprite, or render directly
            if (layerChain && l.effects && l.effects.length > 0) {
              layerChain.apply(ctx, canvas, l.effects, dt, renderSpriteTracks);
            } else {
              renderSpriteTracks(ctx);
            }
          } else {
            const chain = effectChainsRef.current[l.id];
            /**
             * Renders the particle system onto a given context, applying physics transform if present.
             */
            const renderParticles = (targetCtx) => {
              if (hasTransform) {
                targetCtx.save();
                targetCtx.translate(VIRTUAL_W / 2 + transform.x, VIRTUAL_H / 2 + transform.y);
                targetCtx.rotate((transform.rotation * Math.PI) / 180);
                targetCtx.scale(transform.scaleX, transform.scaleY);
                targetCtx.translate(-VIRTUAL_W / 2, -VIRTUAL_H / 2);
                sys.update(dt);
                sys.render(targetCtx);
                targetCtx.restore();
              } else {
                sys.update(dt);
                sys.render(targetCtx);
              }
            };
            if (chain && l.effects && l.effects.length > 0) {
              chain.apply(ctx, canvas, l.effects, dt, renderParticles);
            } else {
              renderParticles(ctx);
            }
          }
        });
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return (
      /**
       * Cleanup: cancels the animation frame and clears per‑layer refs when the fullscreen modal closes.
       */
      () => {
      cancelAnimationFrame(rafRef.current);
      systemsRef.current = {};
      effectChainsRef.current = {};
      trackChainsRef.current = {};
      physicsDriversRef.current = {};
      bounceVelRef.current = {};
    });
  }, [layers, bgColor]);

  useEffect(
    /**
     * Adds a keydown listener to close the modal when the Escape key is pressed, and cleans it up on unmount.
     */
    () => {
    /**
     * Closes the fullscreen modal when the Escape key is pressed.
     */
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return (
      /**
       * Removes the keydown listener when the component unmounts or onClose changes.
       */
      () => window.removeEventListener("keydown", onKey)
    );
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/*
        Letterbox: keep the 1920×1080 canvas aspect ratio on any screen.
        max-width / max-height + width/height 100% lets the browser do the
        uniform scaling while CSS flex centers it in the black bars.
      */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          maxWidth: `${VIRTUAL_W}px`,
          maxHeight: `${VIRTUAL_H}px`,
          objectFit: "contain",
          aspectRatio: `${VIRTUAL_W} / ${VIRTUAL_H}`,
        }}
      />
      <button
        onClick={onClose}
        className="holo-btn"
        style={{ position: "absolute", top: 50, right: 16, padding: "6px 14px" }}
      >
        ✕ ESC
      </button>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "rgba(255,255,255,.2)",
          letterSpacing: 2,
          fontFamily: "var(--font-ui)",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        Full Resolution Preview — Press ESC to exit
      </div>
    </div>
  );
}

// ─── Layer Panel ────────────────────────────────────────────────────
/**
 * Panel that lists all layers with selection, toggle visibility, rename, duplicate, move, and delete controls.
 */
function LayerPanel({ layers, selected, onSelect, onDelete, onToggle, onDuplicate, onMove, onRename, onAdd }) {
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  return (
    <div className="app-scrollable" style={{ flex: 1, overflow: "auto", padding: 4 }}>
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 1, textTransform: "uppercase" }}>
          Layers
        </span>
        <button onClick={onAdd} className="holo-btn holo-btn--sm" style={{ fontSize: 16, lineHeight: 1, padding: "2px 6px" }}>
          +
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 4 }}>
        {[...layers]
          .reverse()
          .map(
            /**
             * Renders a single layer row with selection highlight, inline rename, visibility toggle, and action buttons.
             */
            (l) => {
            const isSel = l.id === selected;
            return (
              <div
                key={l.id}
                onClick={
                  /**
                   * Selects the clicked layer.
                   */
                  () => onSelect(l.id)
                }
                style={{
                  padding: "5px 8px",
                  marginBottom: 2,
                  borderRadius: 4,
                  cursor: "pointer",
                  background: isSel ? "rgba(165,90,255,.15)" : "transparent",
                  border: `1px solid ${isSel ? "var(--accent)" : "transparent"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: l.type === "particle" ? "var(--accent)" : l.type === "audio" ? "var(--accent4)" : "var(--accent2)",
                    }}
                  >
                    {l.type === "particle" ? "✦" : l.type === "audio" ? "🔊" : "◈"}
                  </span>
                  {editId === l.id ? (
                    <input
                      autoFocus
                      value={editVal}
                      onChange={
                        /**
                         * Updates the local rename input value as the user types.
                         */
                        (e) => setEditVal(e.target.value)
                      }
                      onBlur={
                        /**
                         * Commits the rename when the input loses focus.
                         */
                        () => {
                        onRename(l.id, editVal || l.name);
                        setEditId(null);
                      }}
                      onKeyDown={
                        /**
                         * Commits the rename when Enter is pressed.
                         */
                        (e) => {
                        if (e.key === "Enter") {
                          onRename(l.id, editVal || l.name);
                          setEditId(null);
                        }
                      }}
                      onClick={
                        /**
                         * Prevents click from propagating to the parent layer selection.
                         */
                        (e) => e.stopPropagation()
                      }
                      style={{ flex: 1, fontSize: 11, padding: "1px 4px" }}
                    />
                  ) : (
                    <span
                      onDoubleClick={
                        /**
                         * Activates inline rename mode for the layer.
                         */
                        (e) => {
                        e.stopPropagation();
                        setEditId(l.id);
                        setEditVal(l.name);
                      }}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 600,
                        color: isSel ? "var(--text)" : "var(--text2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.name}
                    </span>
                  )}
                  <button
                    onClick={
                      /**
                       * Toggles the layer's visibility.
                       */
                      (e) => {
                      e.stopPropagation();
                      onToggle(l.id);
                    }}
                    className="holo-btn holo-btn--sm"
                    style={{
                      color: l.visible ? "var(--text2)" : "var(--text3)",
                      fontSize: 11,
                      background: "transparent",
                      border: "none",
                      padding: "0 4px",
                      margin: 0,
                      width: "auto",
                      cursor: "pointer",
                    }}
                  >
                    {l.visible ? "👁" : "○"}
                  </button>
                </div>
                {isSel && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4, paddingLeft: 16 }}>
                    <MiniBtn
                      onClick={
                        /**
                         * Moves the layer up in the z-order (decreases zIndex).
                         */
                        (e) => {
                        e.stopPropagation();
                        onMove(l.id, -1);
                      }}
                    >
                      ↑
                    </MiniBtn>
                    <MiniBtn
                      onClick={
                        /**
                         * Moves the layer down in the z-order (increases zIndex).
                         */
                        (e) => {
                        e.stopPropagation();
                        onMove(l.id, 1);
                      }}
                    >
                      ↓
                    </MiniBtn>
                    <MiniBtn
                      onClick={
                        /**
                         * Duplicates the layer.
                         */
                        (e) => {
                        e.stopPropagation();
                        onDuplicate(l.id);
                      }}
                    >
                      ⧉
                    </MiniBtn>
                    <MiniBtn
                      red
                      onClick={
                        /**
                         * Deletes the layer.
                         */
                        (e) => {
                        e.stopPropagation();
                        onDelete(l.id);
                      }}
                    >
                      ✕
                    </MiniBtn>
                  </div>
                )}
              </div>
            );
          })}
        {layers.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", padding: "24px 8px" }}>
            No layers.
            <br />
            Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Property Panel ─────────────────────────────────────────────────
/**
 * Renders property controls for a particle layer: color, count, speed, size.
 */
function ParticleProps({ layer, onUpdate }) {
  const c = layer.config;
  /**
   * Shortcut to update a config property on the layer.
   */
  const up = (k, v) => onUpdate(layer.id, k, v);
  return (
    <div>
      <Row label="Color">
        <input type="color" value={c.color || "#A55AFF"} onChange={
          /**
           * Updates the layer's color config.
           */
          (e) => up("color", e.target.value)
        } />
      </Row>
      <SliderRow label="Count" id="count" cfg={c} onUpdate={up} min={1} max={500} />
      <SliderRow label="Speed X" id="speedX" cfg={c} onUpdate={up} min={0} max={5} step={0.1} />
      <SliderRow label="Speed Y" id="speedY" cfg={c} onUpdate={up} min={0} max={10} step={0.1} />
      <SliderRow label="Size" id="size" cfg={c} onUpdate={up} min={0.5} max={20} step={0.5} />
    </div>
  );
}

/**
 * Renders property controls for a sprite layer: image, frame dimensions, position, scale.
 */
function SpriteProps({ layer, onUpdate }) {
  const c = layer.config;
  /**
   * Shortcut to update a config property on the sprite layer.
   */
  const up = (k, v) => onUpdate(layer.id, k, v);
  /**
   * Reads the selected image file and loads it as a data URL into the sprite config.
   */
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload =
      /**
       * Sets the sprite source and source name once the file is read.
       */
      (ev) => {
      up("src", ev.target.result);
      up("srcName", f.name);
    };
    r.readAsDataURL(f);
  };
  return (
    <div>
      <Row label="Sprite Sheet">
        <input type="file" accept="image/*" onChange={handleFile} style={{ fontSize: 10, padding: 4 }} />
        {c.src && <div style={{ marginTop: 4, fontSize: 9, color: "var(--accent2)" }}>✓ {c.srcName || "Image loaded"}</div>}
      </Row>
      <SliderRow label="Frame Width"  id="frameW" cfg={c} onUpdate={up} min={8}   max={1024} />
      <SliderRow label="Frame Height" id="frameH" cfg={c} onUpdate={up} min={8}   max={600}  />
      <SliderRow label="X Position"   id="x"      cfg={c} onUpdate={up} min={0}   max={3840} />
      <SliderRow label="Y Position"   id="y"      cfg={c} onUpdate={up} min={0}   max={2160} />
      <SliderRow label="Scale"        id="scale"  cfg={c} onUpdate={up} min={0.1} max={10}   step={0.1} />
    </div>
  );
}

/**
 * Main property panel that shows layer-specific controls and buttons to open tracks, effects, and motion modals.
 * Audio layers display an inline audio panel instead of the standard controls.
 */
function PropertyPanel({ layer, onUpdate, onUpdateWholeConfig, onUpdateEffects, onUpdatePhysics, cues, audioLayersRef }) {
  const [openPanel, setOpenPanel] = useState(null); // "tracks" | "effects" | "physics" | null

  if (!layer)
    return (
      <div style={{ padding: 16, color: "var(--text3)", fontSize: 12, textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>⬡</div>
        Select a layer to edit its properties
      </div>
    );

  const motionCount  = layer.physics?.motions?.length || 0;
  const effectCount  = layer.effects?.length || 0;
  const trackCount   = layer.config?.tracks?.length || 0;

  /**
   * Renders a panel launch button with icon, label, and active count badge.
   */
  const PanelBtn = ({ id, icon, label, color, count }) => (
    <button
      onClick={
        /**
         * Opens the corresponding modal panel (tracks, effects, or physics).
         */
        () => setOpenPanel(id)
      }
      className="holo-btn"
      style={{
        flex: 1, padding: "10px 8px", borderRadius: 5, cursor: "pointer",
        background: openPanel === id ? `${color}18` : "var(--bg3)",
        border: `1px solid ${color}55`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        transition: "all .15s",
      }}
    >
      <span style={{ fontSize: 16, color }}>{icon}</span>
      <span style={{ fontSize: 10, color, fontFamily: "var(--font-ui)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-code)" }}>
          {count} active
        </span>
      )}
    </button>
  );

  // Audio layers get their own dedicated full-panel UI — no shared wrapper,
  // no divider, no panel-launch buttons. AudioLayerPanel handles its own
  // scrolling (app-scrollable, height: 100%, overflow: auto).
  if (layer.type === "audio") {
    return (
      <AudioLayerPanel
        layer={layer}
        onUpdate={(newConfig) => onUpdateWholeConfig(layer.id, newConfig)}
        cues={cues}
        audioLayerRef={{ current: audioLayersRef?.current?.[layer.id] }}
      />
    );
  }

  return (
    <>
      <div className="app-scrollable" style={{ padding: "10px 10px 24px 10px", overflow: "auto", height: "100%", flex: 1, minHeight: 0 }}>
        {/* Layer type label */}
        <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
          {layer.type === "particle" ? "✦ Particle Layer" : "◈ Sprite Layer"} — {layer.name}
        </div>
        {layer.type === "particle"
          ? <ParticleProps layer={layer} onUpdate={onUpdate} />
          : <SpriteProps   layer={layer} onUpdate={onUpdate} />
        }

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0" }} />

        {/* Panel launch buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: "25px"}}>
          {layer.type === "sprite" && (
            <PanelBtn id="tracks"  icon="◈" label="Tracks"  color="var(--accent2)" count={trackCount}  />
          )}
          <PanelBtn   id="effects" icon="✦" label="Effects" color="var(--accent3)" count={effectCount} />
          <PanelBtn   id="physics" icon="⟳" label="Motion"  color="var(--accent4)" count={motionCount} />
        </div>
      </div>

      {/* Layer edit modal — one at a time */}
      {openPanel && (
        <LayerEditModal
          layer={layer}
          panel={openPanel}
          onClose={
            /**
             * Closes the currently open sub‑panel.
             */
            () => setOpenPanel(null)
          }
          onUpdate={onUpdate}
          onUpdateEffects={onUpdateEffects}
          onUpdatePhysics={onUpdatePhysics}
          layerType={layer.type}
        />
      )}
    </>
  );
}

// ─── Code Panel (syntax highlight) ──────────────────────────────────
/**
 * Applies syntax highlighting to generated code snippets.
 */
function SyntaxCode({ code }) {
  const colored = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\/\/.*/g, (m) => `<span style="color:#5a3a7a">${m}</span>`)
    .replace(
      /\b(const|let|var|function|class|return|if|for|forEach|new|this)\b/g,
      (m) => `<span style="color:#dc4ce8">${m}</span>`
    )
    .replace(/'([^']*)'/g, `<span style="color:#67FEBD">'$1'</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, `<span style="color:#fecd39">$1</span>`);
  return <span dangerouslySetInnerHTML={{ __html: colored }} />;
}

/**
 * Displays generated export code with syntax highlighting and a copy-to-clipboard button.
 */
function CodePanel({ code }) {
  const [copied, setCopied] = useState(false);
  /**
   * Copies the generated code to the clipboard and shows a temporary “Copied” indicator.
   */
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(
      /**
       * Resets the copied indicator after a short delay.
       */
      () => setCopied(false), 2000);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "0 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: "6px 0",
            color: "var(--accent)",
            fontFamily: "var(--font-ui)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            borderBottom: "2px solid var(--accent)",
          }}
        >
          Generated Code
        </span>
        <button onClick={copy} className="holo-btn holo-btn--sm" style={{ fontSize: 10 }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="app-scrollable"
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
          fontSize: 10,
          lineHeight: 1.6,
          fontFamily: "var(--font-code)",
          color: "var(--text2)",
          background: "var(--bg)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          margin: 0,
        }}
      >
        <SyntaxCode code={code} />
      </pre>
    </div>
  );
}

// ─── Add Modal ──────────────────────────────────────────────────────
/**
 * Modal dialog for adding a new layer with type and preset selection.
 */
function AddModal({ onAdd, onClose }) {
  const [type, setType] = useState("particle");
  const [preset, setPreset] = useState("");
  useEffect(
    /**
     * Adds an Escape key listener to close the modal, and removes it on cleanup.
     */
    () => {
    /**
     * Closes the modal when the Escape key is pressed.
     */
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return (
      /**
       * Removes the keydown listener when the component unmounts or onClose changes.
       */
      () => window.removeEventListener("keydown", onKey)
    );
  }, [onClose]);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          borderRadius: 8,
          padding: 32,
          width: 460,
          boxShadow: "0 0 40px rgba(165,90,255,.3)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--accent)", letterSpacing: 1 }}>
          ADD LAYER
        </div>
        <Row label="Layer Type">
          <select
            value={type}
            onChange={
              /**
               * Sets the layer type and resets the preset selection.
               */
              (e) => {
              setType(e.target.value);
              setPreset("");
            }}
          >
            <option value="particle">✦ Canvas Particle Effect</option>
            <option value="sprite">◈ Sprite Sheet Animation</option>
            <option value="audio">🔊 Audio Layer</option>
          </select>
        </Row>
        {type === "particle" && (
          <Row label="Preset">
            <select value={preset} onChange={
              /**
               * Updates the selected particle preset.
               */
              (e) => setPreset(e.target.value)
            }>
              <option value="">— Custom —</option>
              {Object.entries(PARTICLE_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </Row>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={
            /**
             * Creates a new layer of the chosen type and preset, then closes the modal.
             */
            () => onAdd(type, preset ? PARTICLE_PRESETS[preset] : null)
          }>Add Layer</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ───────────────────────────────────────────────────────
/**
 * Root application component for AnimationLab.
 * Manages layers, rendering loop, export, and all sub-panels/modals.
 */
export default function AnimationLab() {
  const [layers, setLayers] = useState([
    {
      id: uid(),
      name: "Stars BG",
      type: "particle",
      zIndex: 0,
      visible: true,
      locked: false,
      config: { ...DEFAULT_PARTICLE, ...PARTICLE_PRESETS.stars.config },
      effects: [],   
      physics: null, 
    },
  ]);
  const [selected, setSelected] = useState(null);
  const [bgColor, setBgColor] = useState("#0a0010");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showSpriteBuilder, setShowSpriteBuilder] = useState(false);
  const [showCueEditor, setShowCueEditor] = useState(false);
  const [cues, setCues] = useState([]);
  const [showOpening, setShowOpening] = useState(true);


  const canvasRef = useRef(null);
  const systemsRef = useRef({});
  const audioLayersRef    = useRef({}); // layerId → AudioLayer instance
  const effectChainsRef   = useRef({});
  const trackChainsRef    = useRef({});
  const physicsDriversRef = useRef({});
  const bounceVelRef      = useRef({}); // per-layer { vx, vy, x, y, configKey } for bounce drift
  const cueTimelineRef    = useRef(new CueTimeline());
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  // Refs so the render loop always reads current values without restarting on every layers/bgColor change
  const layersRef  = useRef(layers);
  const bgColorRef = useRef(bgColor);
  useEffect(
    /**
     * Keeps the layers ref in sync with the current layers state.
     */
    () => { layersRef.current  = layers;  }, [layers]);
  useEffect(
    /**
     * Keeps the background color ref in sync with the current bgColor state.
     */
    () => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(
    /**
     * Passes updated cues array to the cue timeline instance.
     */
    () => { cueTimelineRef.current.setCues(cues); }, [cues]);

  // Sync EffectChain + TrackEffectChain + PhysicsDriver instances with layers
  useEffect(
    /**
     * Creates and cleans up per‑layer EffectChain, TrackEffectChains, and PhysicsDriver instances based on the current layers.
     */
    () => {
    layers.forEach((l) => {
      if (!effectChainsRef.current[l.id]) {
        effectChainsRef.current[l.id] = new EffectChain(VIRTUAL_W, VIRTUAL_H);
      }
      if (l.type === "sprite") {
        if (!trackChainsRef.current[l.id]) {
          trackChainsRef.current[l.id] = new TrackEffectChains(VIRTUAL_W, VIRTUAL_H);
        }
        trackChainsRef.current[l.id].sync(l.config.tracks || []);
      }
      if (!physicsDriversRef.current[l.id]) {
        physicsDriversRef.current[l.id] = new PhysicsDriver();
      }
    });
    Object.keys(effectChainsRef.current).forEach((id) => {
      if (!layers.find((l) => l.id === id)) {
        delete effectChainsRef.current[id];
        delete trackChainsRef.current[id];
        delete physicsDriversRef.current[id];
      }
    });
  }, [layers]);

  useEffect(
    /**
     * Resets selection to the first layer if the currently selected layer no longer exists.
     */
    () => {
    if (!layers.find((l) => l.id === selected)) setSelected(layers[0]?.id || null);
  }, [layers, selected]);

  useEffect(
    /**
     * Creates, updates, and disposes of AudioLayer instances and Particle/Sprite systems for each layer.
     */
    () => {
    // Sync AudioLayer instances
    layers.forEach((l) => {
      if (l.type !== "audio") return;
      if (!audioLayersRef.current[l.id]) {
        audioLayersRef.current[l.id] = new AudioLayer(l.config);
      } else {
        audioLayersRef.current[l.id].updateConfig(l.config);
      }
      audioLayersRef.current[l.id].attachCue(cueTimelineRef.current);
    });
    // Destroy orphaned AudioLayer instances
    Object.keys(audioLayersRef.current).forEach((id) => {
      if (!layers.find((l) => l.id === id)) {
        audioLayersRef.current[id].dispose();
        delete audioLayersRef.current[id];
      }
    });
    layers.forEach((l) => {
      if (l.type === "audio") return; // audio layers use audioLayersRef, not systemsRef
      if (!systemsRef.current[l.id]) {
        systemsRef.current[l.id] =
          l.type === "particle"
            ? new ParticleSystem({ ...l.config, width: VIRTUAL_W, height: VIRTUAL_H })
            : new SpriteRenderer(l.config);
      }
    });
    Object.keys(systemsRef.current).forEach((id) => {
      if (!layers.find((l) => l.id === id)) delete systemsRef.current[id];
    });
  }, [layers]);

  useEffect(
    /**
     * Updates existing system configurations in place when layer configs change, without recreating the instances.
     */
    () => {
    layers.forEach((l) => {
      const sys = systemsRef.current[l.id];
      if (!sys) return;
      if (l.type === "particle") {
        const prevCount = sys.cfg.count;
        Object.assign(sys.cfg, { ...l.config, width: VIRTUAL_W, height: VIRTUAL_H });
        if (prevCount !== l.config.count) sys.init();
      } else {
        const prevSrc = sys.cfg.src;
        // Deep-replace so nested arrays (tracks, effects) are fully updated
        sys.cfg = { ...l.config };
        if (prevSrc !== l.config.src) sys.load();
        // Init state for any newly added tracks without resetting existing ones
        sys._initTrackState();
        // Re-sync track effect chains so added/removed tracks get chains immediately
        if (trackChainsRef.current[l.id]) {
          trackChainsRef.current[l.id].sync(l.config.tracks || []);
        }
      }
    });
  }, [layers]);

  useEffect(
    /**
     * Initializes and runs the preview canvas animation loop, reading layers and bgColor from refs to avoid restarting.
     * Returns a cleanup function that cancels the animation frame.
     */
    () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Reset timestamp so first dt isn't the full time since page load
    lastRef.current = 0;
    /**
     * Main animation frame callback that clears the canvas and renders all visible layers in z‑order.
     */
    function loop(t) {
      // Skip the first frame to establish a clean timestamp baseline
      if (lastRef.current === 0) { lastRef.current = t; rafRef.current = requestAnimationFrame(loop); return; }
      const dt = t - lastRef.current;
      lastRef.current = t;
      const snapshot = buildLayerSnapshot(layersRef.current, systemsRef.current);
      cueTimelineRef.current.tick(dt, snapshot);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Read current values from refs — no stale closure, no loop restart on every change
      const currentLayers  = layersRef.current;
      const currentBgColor = bgColorRef.current;
      ctx.fillStyle = currentBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      [...currentLayers]
        .sort(
          /**
           * Sorts layers by zIndex for proper draw ordering.
           */
          (a, b) => a.zIndex - b.zIndex)
        .forEach(
          /**
           * Renders a single layer, handling visibility, physics bounce, transform, and type‑specific drawing.
           */
          (l) => {
          if (!l.visible) return;
          if (l.type === "audio") return; // audio layers have no canvas output
          const sys = systemsRef.current[l.id];
          if (!sys) return;

          // ── Bounce drift: manage velocity + position in bounceVelRef ──────
          // SpriteRenderer adds transform.x/y ON TOP OF the sprite's cfg.x/cfg.y,
          // so our offset runs in delta-space (0 = sprite at its configured position).
          // Convert absolute canvas boundary coords to offset-space by subtracting baseX/Y.
          const driftMotion = l.physics?.motions?.find(
            /**
             * Finds the first drift motion in the physics configuration.
             */
            (m) => m.type === "drift");
          const isBounce = driftMotion?.edgeMode === "bounce";
          let bounceOffset = null;

          if (isBounce && driftMotion) {
            const baseX = l.config?.x ?? 0;
            const baseY = l.config?.y ?? 0;

            const left   = (driftMotion.bounceLeft   ?? 0)         - baseX;
            const right  = (driftMotion.bounceRight  ?? VIRTUAL_W) - baseX;
            const top    = (driftMotion.bounceTop    ?? 0)         - baseY;
            const bottom = (driftMotion.bounceBottom ?? VIRTUAL_H) - baseY;


            const configKey = `${left},${right},${top},${bottom},${driftMotion.speedX},${driftMotion.speedY}`;
            const existing = bounceVelRef.current[l.id];
            if (!existing || existing.configKey !== configKey) {
              bounceVelRef.current[l.id] = {
                vx: driftMotion.speedX ?? 0,
                vy: driftMotion.speedY ?? 30,
                x: Math.max(left, Math.min(right,  existing?.x ?? left)),
                y: Math.max(top,  Math.min(bottom, existing?.y ?? top)),
                configKey,
              };
            }
            const bv = bounceVelRef.current[l.id];
            const dtSec = dt / 1000;

            bv.x += bv.vx * dtSec;
            bv.y += bv.vy * dtSec;

            if (bv.vx !== 0) {
              if (bv.x <= left)  { bv.x = left;   bv.vx =  Math.abs(bv.vx); }
              if (bv.x >= right) { bv.x = right;  bv.vx = -Math.abs(bv.vx); }
            }
            if (bv.vy !== 0) {
              if (bv.y <= top)    { bv.y = top;    bv.vy =  Math.abs(bv.vy); }
              if (bv.y >= bottom) { bv.y = bottom; bv.vy = -Math.abs(bv.vy); }
            }

            bounceOffset = { x: bv.x, y: bv.y };
          } else if (bounceVelRef.current[l.id]) {
            delete bounceVelRef.current[l.id];
          }

          const physicsForDriver = isBounce && l.physics
            ? {
                ...l.physics,
                motions: l.physics.motions.map(
                  /**
                   * Neutralizes drift speed for bounce handling when bounce mode is active.
                   */
                  (m) =>
                  m.type === "drift" ? { ...m, speedX: 0, speedY: 0 } : m
                ),
              }
            : l.physics;

          const driver = physicsDriversRef.current[l.id];
          const rawTransform = driver?.update(dt, physicsForDriver) ?? null;

          // Merge bounce offset into transform
          const transform = rawTransform
            ? {
                ...rawTransform,
                x: (rawTransform.x ?? 0) + (bounceOffset?.x ?? 0),
                y: (rawTransform.y ?? 0) + (bounceOffset?.y ?? 0),
              }
            : bounceOffset
            ? { x: bounceOffset.x, y: bounceOffset.y, scaleX: 1, scaleY: 1, rotation: 0 }
            : null;

          const hasTransform = transform && (
            transform.x !== 0 || transform.y !== 0 ||
            transform.scaleX !== 1 || transform.scaleY !== 1 ||
            transform.rotation !== 0
          );

          if (l.type === "sprite") {
            sys.update(dt);
            const layerChain = effectChainsRef.current[l.id];
            const trackChains = trackChainsRef.current[l.id];
            const tracks = l.config.tracks || [];

            // renderSpriteTracks composites all tracks onto targetCtx.
            // When layer effects exist, EffectChain calls this on its offscreen
            // so the full composited sprite is available as a clean snapshot.
            /**
             * Renders all enabled sprite tracks onto a given canvas context, applying per‑track effects and transforms.
             */
            const renderSpriteTracks = (targetCtx) => {
              tracks.forEach((track) => {
                if (!track.enabled) return;
                const trackEffects = track.effects || [];
                const chain = trackChains?.get(track.id);
                targetCtx.save();
                targetCtx.globalAlpha = track.opacity ?? 1;
                targetCtx.globalCompositeOperation = track.blendMode || "source-over";
                if (chain && trackEffects.length > 0) {
                  chain.apply(targetCtx, canvas, trackEffects, dt, (offCtx) => {
                    hasTransform
                      ? sys.renderTrackWithTransform(offCtx, track, transform)
                      : sys.renderTrack(offCtx, track);
                  });
                } else {
                  hasTransform
                    ? sys.renderTrackWithTransform(targetCtx, track, transform)
                    : sys.renderTrack(targetCtx, track);
                }
                targetCtx.restore();
              });
            };

            // Apply layer-level effects over the fully composited sprite, or render directly
            if (layerChain && l.effects && l.effects.length > 0) {
              layerChain.apply(ctx, canvas, l.effects, dt, renderSpriteTracks);
            } else {
              renderSpriteTracks(ctx);
            }
          } else {
            // Particle layer
            const chain = effectChainsRef.current[l.id];
            /**
             * Renders the particle system onto a given context, applying physics transform if present.
             */
            const renderParticles = (targetCtx) => {
              if (hasTransform) {
                targetCtx.save();
                targetCtx.translate(VIRTUAL_W / 2 + transform.x, VIRTUAL_H / 2 + transform.y);
                targetCtx.rotate((transform.rotation * Math.PI) / 180);
                targetCtx.scale(transform.scaleX, transform.scaleY);
                targetCtx.translate(-VIRTUAL_W / 2, -VIRTUAL_H / 2);
                sys.update(dt);
                sys.render(targetCtx);
                targetCtx.restore();
              } else {
                sys.update(dt);
                sys.render(targetCtx);
              }
            };
            if (chain && l.effects && l.effects.length > 0) {
              chain.apply(ctx, canvas, l.effects, dt, renderParticles);
            } else {
              renderParticles(ctx);
            }
          }
        });
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return (
      /**
       * Cleanup: cancels the animation frame on unmount.
       */
      () => cancelAnimationFrame(rafRef.current)
    );
  }, []); // intentionally runs once; reads live layers/bgColor via refs

  /**
   * Creates a new layer object of the given type and optional preset, adds it to the layer list, and selects it.
   */
  const addLayer = useCallback(
    (type, preset) => {
      const nl = {
        id: uid(),
        name: preset ? preset.name : type === "sprite" ? "Sprite" : type === "audio" ? "Audio" : "Particles",
        type,
        zIndex: layers.length,
        visible: true,
        locked: false,
        config:
          type === "particle"
            ? { ...DEFAULT_PARTICLE, ...(preset?.config || {}) }
            : type === "audio"
              ? { ...DEFAULT_AUDIO_CONFIG }
              : { ...DEFAULT_SPRITE },
        effects: [],      
        physics: null, 
      };
      setLayers((prev) => [...prev, nl]);
      setSelected(nl.id);
      setShowAddModal(false);
    },
    [layers.length]
  );

  /**
   * Removes a layer by id and cleans up its associated system ref.
   */
  const deleteLayer = useCallback((id) => {
    setLayers((p) => p.filter((l) => l.id !== id));
    delete systemsRef.current[id];
  }, []);

  /**
   * Toggles the visibility flag of the specified layer.
   */
  const toggleVisible = useCallback((id) => {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }, []);

  /**
   * Updates the name of the specified layer.
   */
  const renameLayer = useCallback((id, name) => {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, name } : l)));
  }, []);

  /**
   * Creates a copy of the given layer with a new id and adds it to the list.
   */
  const duplicateLayer = useCallback(
    (id) => {
      const src = layers.find((l) => l.id === id);
      if (!src) return;
      const nl = { ...src, id: uid(), name: src.name + " Copy", zIndex: layers.length };
      setLayers((p) => [...p, nl]);
      setSelected(nl.id);
    },
    [layers]
  );

  /**
   * Swaps the layer's z‑index with the adjacent layer in the given direction.
   */
  const moveLayer = useCallback((id, dir) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((l, i) => ({ ...l, zIndex: i }));
    });
  }, []);

  /**
   * Updates a single config property on a layer.
   */
  const updateConfig = useCallback((id, key, val) => {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, config: { ...l.config, [key]: val } } : l)));
  }, []);

  /**
   * Replaces the entire config object for a layer (used by audio layers).
   */
  const updateWholeConfig = useCallback((id, newConfig) => {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, config: newConfig } : l)));
  }, []);

  /**
   * Replaces the effects array for a layer.
   */
  const updateEffects = useCallback((layerId, newEffects) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, effects: newEffects } : l))
    );
  }, []);

  /**
   * Replaces the physics configuration for a layer.
   */
  const updatePhysics = useCallback((id, newPhysics) => {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, physics: newPhysics } : l)));
  }, []);

  /**
   * Generates export code for the current scene and triggers a file download.
   */
  const exportScene = useCallback(() => {
    const code = generateCode(layers, bgColor);
    const blob = new Blob([code], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "animation-lab-scene.html";
    a.click();
  }, [layers, bgColor]);

  /**
   * Adds a new sprite layer using data exported from the SpriteBuilder modal.
   */
  const exportToLayer = useCallback(({ name, src, srcName, frameW, frameH }) => {
    setLayers((prev) => {
      let finalName = name;
      let counter = 2;
      while (prev.some((l) => l.name.toLowerCase() === finalName.toLowerCase())) {
        finalName = `${name} ${counter++}`;
      }
      const nl = {
        id: uid(),
        name: finalName,
        type: "sprite",
        zIndex: prev.length,
        visible: true,
        locked: false,
        config: {
          src,
          srcName,
          frameW,
          frameH,
          x: 0,
          y: 0,
          scale: 1,
          tracks: [{
            id: uid(),
            name: "Track 1",
            frames: [0],
            fps: 12,
            loop: true,
            opacity: 1,
            blendMode: "source-over",
            enabled: true,
            effects: [],
          }],
        },
        effects: [],
        physics: null,
      };
      return [...prev, nl];
    });
  }, []);

  /**
   * Hides the opening animation and reveals the main interface.
   */
  const handleOpeningComplete = () => {
    setShowOpening(false);
  };


  const selLayer = layers.find((l) => l.id === selected);
  const code = useMemo(() => generateCode(layers, bgColor), [layers, bgColor]);

return (
  <>
    {showOpening && (
      <OpeningAnimation 
        onComplete={handleOpeningComplete}
        logoPath="/images/logo.png"
        explosionPath="/images/explosion.png"
      />
    )}
    
    <div
      style={{
        height: "100%",   // ← Changed from 100vh to 100% to respect parent height (after custom titlebar)
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        fontFamily: "var(--font-ui)",
        overflow: "hidden",
        opacity: showOpening ? 0 : 1,
        transition: "opacity 0.4s ease-out",
        pointerEvents: showOpening ? "none" : "auto",
      }}
    >
      <Header
        onAdd={() => setShowAddModal(true)}
        onExport={exportScene}
        bgColor={bgColor}
        onBgChange={setBgColor}
        onFullscreen={() => setShowFullscreen(true)}
        onSpriteBuilder={() => setShowSpriteBuilder(true)}
        onCueEditor={() => setShowCueEditor(true)}
      />
      {/* GRID CONTAINER WITH FIXED HEIGHT */}
      <div
        style={{
          flex: 1,
          height: "100%",               // ← forces definite height so 1fr rows work
          display: "grid",
          gridTemplateColumns: "var(--panel-w) 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          overflow: "hidden",
          gap: "1px",
          background: "var(--border)",
        }}
      >
        <div
          style={{
            gridRow: "1/3",
            background: "var(--bg2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <LayerPanel
            layers={layers}
            selected={selected}
            onSelect={setSelected}
            onDelete={deleteLayer}
            onToggle={toggleVisible}
            onDuplicate={duplicateLayer}
            onMove={moveLayer}
            onRename={renameLayer}
            onAdd={() => setShowAddModal(true)}
          />
        </div>
        <div style={{ gridColumn: "2", gridRow: "1", background: "#000", position: "relative", overflow: "hidden" }}>
          <PreviewCanvas canvasRef={canvasRef} onFullscreen={() => setShowFullscreen(true)} />
        </div>
        <div
          style={{
            gridColumn: "3",
            gridRow: "1/3",
            background: "var(--bg2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <CodePanel code={code} />
        </div>
        {/* BOTTOM-CENTER CELL — scrollable PropertyPanel */}
        <div
          style={{
            gridColumn: "2",
            gridRow: "2",
            background: "var(--bg2)",
            minHeight: 0,               // ← allows this cell to shrink and scroll
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",         // ← contains content; inner panels handle their own scroll
          }}
        >
          <PropertyPanel layer={selLayer} onUpdate={updateConfig} onUpdateWholeConfig={updateWholeConfig} onUpdateEffects={updateEffects} onUpdatePhysics={updatePhysics} cues={cues} audioLayersRef={audioLayersRef} />
        </div>
      </div>

      {showAddModal && <AddModal onAdd={addLayer} onClose={() => setShowAddModal(false)} />}

      {showSpriteBuilder && (
        <SpriteBuilderModal
          onClose={() => setShowSpriteBuilder(false)}
          onExportToLayer={(layerData) => {
            exportToLayer(layerData);
            setShowSpriteBuilder(false);
          }}
        />
      )}

      {showCueEditor && (
        <CuePanel
          cues={cues}
          layers={layers}
          onUpdate={setCues}
          onClose={() => setShowCueEditor(false)}
        />
      )}
      {showFullscreen && (
        <FullscreenModal layers={layers} bgColor={bgColor} onClose={() => setShowFullscreen(false)} />
      )}
    </div>
  </>
);
}