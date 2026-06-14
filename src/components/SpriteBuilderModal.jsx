// components/SpriteBuilderModal.jsx
// ACOUSTIC KITTY SPRITE TOOLS BUILT INTO ONION STUDIO PRO.
// TABS: BUILD SHEET | RECOLOR | RESIZE
// "EXPORT TO LAYER" SENDS THE FINISHED CANVAS STRAIGHT INTO THE SCENE.

import { useState, useRef, useCallback, useEffect } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Utilities ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace("#", "").toUpperCase();
  if (hex.length === 3) hex = hex.split("").map((h) => h + h).join("");
  return [
    parseInt(hex.substr(0, 2), 16),
    parseInt(hex.substr(2, 2), 16),
    parseInt(hex.substr(4, 2), 16),
  ];
}

function recolorCanvas(srcCanvas, masterColors, newColors) {
  const canvas = document.createElement("canvas");
  canvas.width = srcCanvas.width;
  canvas.height = srcCanvas.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const masterRGB = masterColors.map(hexToRgb);
  const newRGB = newColors.map(hexToRgb);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let m = 0; m < masterRGB.length; m++) {
      const [mr, mg, mb] = masterRGB[m];
      if (data[i] === mr && data[i + 1] === mg && data[i + 2] === mb) {
        const [nr, ng, nb] = newRGB[m];
        data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
        break;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function buildSheet(frames, cols, padding) {
  if (!frames.length) throw new Error("No frames");
  const bitmaps = await Promise.all(frames.map((f) => createImageBitmap(f.file)));
  const frameW = bitmaps[0].width;
  const frameH = bitmaps[0].height;
  const rows = Math.ceil(bitmaps.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = frameW * cols + padding * (cols - 1);
  canvas.height = frameH * rows + padding * (rows - 1);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  bitmaps.forEach((bmp, i) => {
    ctx.drawImage(bmp, (i % cols) * (frameW + padding), Math.floor(i / cols) * (frameH + padding));
  });
  return canvas;
}

async function resizeSingle(file, targetW) {
  const img = await createImageBitmap(file);
  const h = Math.round(targetW * (img.height / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = targetW; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, targetW, h);
  return { canvas, h };
}

function canvasToDataUrl(canvas) { return canvas.toDataURL("image/png"); }

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Label({ children }) {
  return <label style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>{children}</label>;
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 10 }}><Label>{label}</Label>{children}</div>;
}

function Btn({ children, onClick, accent, green, disabled, style = {} }) {
  const color = green ? "var(--accent2)" : accent ? "var(--accent)" : "var(--text2)";
  const bg = green ? "rgba(103,254,189,.12)" : accent ? "rgba(165,90,255,.12)" : "transparent";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 16px", border: `1px solid ${disabled ? "var(--border)" : color}`,
      color: disabled ? "var(--text3)" : color, borderRadius: 3, fontSize: 13,
      fontFamily: "var(--font-ui)", fontWeight: 600, letterSpacing: 0.5,
      background: disabled ? "transparent" : bg, cursor: disabled ? "default" : "pointer",
      transition: "all .15s", ...style,
    }}>{children}</button>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 20px", background: "none", border: "none", cursor: "pointer",
      fontFamily: "var(--font-ui)", fontSize: 14, letterSpacing: 0.5, fontWeight: 600,
      color: active ? "var(--accent)" : "var(--text3)",
      borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    }}>{label}</button>
  );
}

// Mini canvas preview
function CanvasPreview({ canvas, maxW = 500, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !canvas) return;
    const scale = Math.min(1, maxW / canvas.width);
    ref.current.width = canvas.width * scale;
    ref.current.height = canvas.height * scale;
    ref.current.getContext("2d").drawImage(canvas, 0, 0, ref.current.width, ref.current.height);
  }, [canvas]);
  if (!canvas) return null;
  return (
    <div style={{ marginTop: 12 }}>
      {label && <Label>{label}</Label>}
      <canvas ref={ref} style={{ border: "1px solid var(--border)", borderRadius: 3, display: "block", background: "#111", imageRendering: "pixelated" }} />
      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 4 }}>{canvas.width}×{canvas.height}px</div>
    </div>
  );
}

// ─── Tab 1: Build Sprite Sheet ────────────────────────────────────────────────

function BuildTab({ onExport }) {
  const [frames, setFrames] = useState([]); // [{id, file, url}]
  const [cols, setCols] = useState(1);
  const [padding, setPadding] = useState(0);
  const [result, setResult] = useState(null);
  const [building, setBuilding] = useState(false);
  const [dragOver, setDragOver] = useState(null); // id being dragged over
  const dragSrc = useRef(null);

  const addFiles = (fileList) => {
    const newFrames = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }));
    setFrames((prev) => [...prev, ...newFrames]);
    setResult(null);
  };

  const removeFrame = (id) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
  };

  // Drag-to-reorder handlers
  const onDragStart = (id) => { dragSrc.current = id; };
  const onDragOver = (e, id) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragSrc.current || dragSrc.current === targetId) return;
    setFrames((prev) => {
      const arr = [...prev];
      const srcIdx = arr.findIndex((f) => f.id === dragSrc.current);
      const dstIdx = arr.findIndex((f) => f.id === targetId);
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
      return arr;
    });
    setResult(null);
  };
  const onDragEnd = () => setDragOver(null);

  const moveFrame = (id, dir) => {
    setFrames((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((f) => f.id === id);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
    setResult(null);
  };

  const build = async () => {
    if (!frames.length) return;
    setBuilding(true);
    try {
      const canvas = await buildSheet(frames, Math.max(1, cols), Math.max(0, padding));
      setResult(canvas);
    } catch (e) {
      console.error(e);
    }
    setBuilding(false);
  };

  const frameW = frames[0] ? undefined : 64; // resolved at build time

  return (
    <div>
      {/* File drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        style={{ border: "2px dashed var(--border2)", borderRadius: 6, padding: "16px", textAlign: "center", marginBottom: 12, cursor: "pointer", color: "var(--text3)", fontSize: 12 }}
        onClick={() => document.getElementById("ak-file-input").click()}
      >
        Drop PNG frames here or click to upload
        <input id="ak-file-input" type="file" multiple accept="image/*" style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)} />
      </div>

      {/* Frame list with drag reorder */}
      {frames.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Label>Frames ({frames.length}) — drag to reorder</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, background: "var(--bg3)", borderRadius: 4, border: "1px solid var(--border)" }}>
            {frames.map((f, i) => (
              <div key={f.id}
                draggable
                onDragStart={() => onDragStart(f.id)}
                onDragOver={(e) => onDragOver(e, f.id)}
                onDrop={(e) => onDrop(e, f.id)}
                onDragEnd={onDragEnd}
                style={{
                  position: "relative", cursor: "grab", userSelect: "none",
                  border: `2px solid ${dragOver === f.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 4, overflow: "hidden", transition: "border-color .1s",
                  opacity: dragSrc.current === f.id ? 0.5 : 1,
                }}
              >
                <img src={f.url} style={{ display: "block", width: 56, height: 56, objectFit: "contain", background: "#000", imageRendering: "pixelated" }} />
                <div style={{ position: "absolute", top: 1, left: 2, fontSize: 8, color: "rgba(255,255,255,.7)", fontFamily: "var(--font-code)" }}>{i}</div>
                {/* Controls overlay */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,.6)", padding: "1px 2px" }}>
                  <button onClick={() => moveFrame(f.id, -1)} style={{ fontSize: 9, background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: "0 2px" }}>◀</button>
                  <button onClick={() => removeFrame(f.id)} style={{ fontSize: 9, background: "none", border: "none", color: "#ff6666", cursor: "pointer", padding: "0 2px" }}>✕</button>
                  <button onClick={() => moveFrame(f.id, 1)} style={{ fontSize: 9, background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: "0 2px" }}>▶</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Field label="Columns">
          <input type="number" min={1} max={32} value={cols} onChange={(e) => { setCols(+e.target.value); setResult(null); }}
            style={{ width: 70, fontSize: 11 }} />
        </Field>
        <Field label="Padding (px)">
          <input type="number" min={0} max={64} value={padding} onChange={(e) => { setPadding(+e.target.value); setResult(null); }}
            style={{ width: 70, fontSize: 11 }} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn accent onClick={build} disabled={!frames.length || building}>
          {building ? "Building…" : "Build Sheet"}
        </Btn>
        {result && <>
          <Btn onClick={() => downloadDataUrl(canvasToDataUrl(result), "SpriteSheet.png")}>↓ Save PNG</Btn>
          <Btn green onClick={() => onExport(result, "Sprite Sheet", frames[0]?.file?.name || "sprite.png")}>
            → Export to Layer
          </Btn>
        </>}
      </div>

      <CanvasPreview canvas={result} label="Preview" />
    </div>
  );
}

// ─── Tab 2: Recolor ───────────────────────────────────────────────────────────

const EMPTY_COLOR_ROW = { master: "#000000", new: "#000000", active: false };

function RecolorTab({ onExport }) {
  const [srcCanvas, setSrcCanvas] = useState(null);
  const [srcName, setSrcName] = useState("sprite.png");
  const [colorRows, setColorRows] = useState(
    Array.from({ length: 5 }, () => ({ ...EMPTY_COLOR_ROW }))
  );
  const [result, setResult] = useState(null);

  const loadFile = (file) => {
    if (!file) return;
    setSrcName(file.name);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      setSrcCanvas(c);
      setResult(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const updateRow = (i, field, val) => {
    setColorRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    setResult(null);
  };

  const applyRecolor = () => {
    if (!srcCanvas) return;
    const active = colorRows.filter((r) => r.active);
    if (!active.length) { alert("Enable at least one color swap row."); return; }
    setResult(recolorCanvas(srcCanvas, active.map((r) => r.master), active.map((r) => r.new)));
  };

  return (
    <div>
      <Field label="Sprite Sheet">
        <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files[0])}
          style={{ fontSize: 11, padding: 4 }} />
      </Field>

      {srcCanvas && (
        <>
          <Label>Color Swaps (enable rows you want to use)</Label>
          <div style={{ marginBottom: 10 }}>
            {colorRows.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, opacity: row.active ? 1 : 0.45 }}>
                <input type="checkbox" checked={row.active} onChange={(e) => updateRow(i, "active", e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="color" value={row.master} onChange={(e) => updateRow(i, "master", e.target.value)}
                    style={{ width: 32, height: 24, border: "1px solid var(--border)", borderRadius: 2, padding: 1, cursor: "pointer" }} />
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>→</span>
                  <input type="color" value={row.new} onChange={(e) => updateRow(i, "new", e.target.value)}
                    style={{ width: 32, height: 24, border: "1px solid var(--border)", borderRadius: 2, padding: 1, cursor: "pointer" }} />
                </div>
                <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-code)" }}>
                  {row.master.toUpperCase()} → {row.new.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn accent onClick={applyRecolor}>Apply Recolor</Btn>
            {result && <>
              <Btn onClick={() => downloadDataUrl(canvasToDataUrl(result), "Recolored.png")}>↓ Save PNG</Btn>
              <Btn green onClick={() => onExport(result, "Recolored Sprite", srcName)}>→ Export to Layer</Btn>
            </>}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <CanvasPreview canvas={srcCanvas} maxW={220} label="Original" />
            <CanvasPreview canvas={result}    maxW={220} label="Recolored" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Resize ────────────────────────────────────────────────────────────

function ResizeTab({ onExport }) {
  const [file, setFile] = useState(null);
  const [srcCanvas, setSrcCanvas] = useState(null);
  const [targetW, setTargetW] = useState(256);
  const [result, setResult] = useState(null);
  const [resizing, setResizing] = useState(false);

  const loadFile = (f) => {
    if (!f) return;
    setFile(f);
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      setSrcCanvas(c); setResult(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const doResize = async () => {
    if (!file) return;
    setResizing(true);
    try {
      const { canvas } = await resizeSingle(file, targetW);
      setResult(canvas);
    } catch (e) { console.error(e); }
    setResizing(false);
  };

  return (
    <div>
      <Field label="Image / Sprite Sheet">
        <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files[0])}
          style={{ fontSize: 11, padding: 4 }} />
      </Field>

      {srcCanvas && (
        <>
          <Field label="Target Width (px)">
            <input type="number" min={1} max={8192} value={targetW}
              onChange={(e) => { setTargetW(+e.target.value); setResult(null); }}
              style={{ width: 100, fontSize: 11 }} />
          </Field>
          <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 10 }}>
            Original: {srcCanvas.width}×{srcCanvas.height}px → New height will scale proportionally.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn accent onClick={doResize} disabled={resizing}>{resizing ? "Resizing…" : "Resize"}</Btn>
            {result && <>
              <Btn onClick={() => downloadDataUrl(canvasToDataUrl(result), "Resized.png")}>↓ Save PNG</Btn>
              <Btn green onClick={() => onExport(result, "Resized Sprite", file?.name || "sprite.png")}>→ Export to Layer</Btn>
            </>}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <CanvasPreview canvas={srcCanvas} maxW={220} label="Original" />
            <CanvasPreview canvas={result}    maxW={220} label="Resized" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function SpriteBuilderModal({ onClose, onExportToLayer }) {
  const [tab, setTab] = useState("build");

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Called by any tab when the user hits "Export to Layer"
  // canvas: the finished canvas element
  // layerName: suggested name
  // srcName: original filename (used as path hint in code export)
  const handleExport = useCallback((canvas, layerName, srcName) => {
    const dataUrl = canvasToDataUrl(canvas);
    onExportToLayer({
      name: layerName,
      src: dataUrl,
      srcName: srcName,
      frameW: canvas.width,
      frameH: canvas.height,
    });
    onClose();
  }, [onExportToLayer, onClose]);

  const TABS = [
    { id: "build",   label: "🗂 Build Sheet" },
    { id: "recolor", label: "🎨 Recolor" },
    { id: "resize",  label: "⇲ Resize" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8,
        width: 760, maxHeight: "88vh", display: "flex", flexDirection: "column",
        boxShadow: "0 0 60px rgba(165,90,255,.25)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 18, color: "var(--accent)", letterSpacing: 2 }}>
            🐱 SPRITE BUILDER
          </span>
          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 10 }}>powered by Acoustic Kitty</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: "var(--text3)", background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {TABS.map((t) => <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>

        {/* Content */}
        <div className="app-scrollable" style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {tab === "build"   && <BuildTab   onExport={handleExport} />}
          {tab === "recolor" && <RecolorTab onExport={handleExport} />}
          {tab === "resize"  && <ResizeTab  onExport={handleExport} />}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>
          → Export to Layer sends the result directly into the scene as a new Sprite layer. ESC to close.
        </div>
      </div>
    </div>
  );
}