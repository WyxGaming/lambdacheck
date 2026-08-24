"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LANDMARK_META,
  LANDMARK_ORDER,
  type EyeLandmarks,
  type EyeSide,
  type LandmarkId,
  type Point,
  derivedPupilCenter,
  displayedPoint,
  distance,
  ghostHandles,
  limbusEllipse,
  nasalDirectionX,
  nextLandmark,
  applyLandmarkConstraints,
} from "@/lib/lambda";
import { cn } from "@/lib/utils";

type PhotoAnnotatorProps = {
  eye: EyeSide;
  imageUrl: string | null;
  landmarks: EyeLandmarks;
  activeLandmark: LandmarkId;
  onLandmarksChange: (landmarks: EyeLandmarks) => void;
  onActiveLandmarkChange: (id: LandmarkId) => void;
};

type Layout = {
  scale: number;
  ox: number;
  oy: number;
};

type View = {
  zoom: number;
  panX: number;
  panY: number;
};

const HIT_RADIUS_CSS = 14;
const LOUPE_SIZE = 148;
const LOUPE_ZOOM = 2.8;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const IDENTITY_VIEW: View = { zoom: 1, panX: 0, panY: 0 };

export function PhotoAnnotator({
  eye,
  imageUrl,
  landmarks,
  activeLandmark,
  onLandmarksChange,
  onActiveLandmarkChange,
}: PhotoAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const landmarksRef = useRef(landmarks);
  const activeRef = useRef(activeLandmark);
  const dragRef = useRef<LandmarkId | null>(null);
  const panDragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pointerRef = useRef<Point | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{
    dist: number;
    mid: Point;
    view: View;
  } | null>(null);
  const viewRef = useRef<View>(IDENTITY_VIEW);
  const [view, setView] = useState<View>(IDENTITY_VIEW);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageStatus = !imageUrl
    ? "empty"
    : failedUrl === imageUrl
      ? "error"
      : loadedUrl === imageUrl
        ? "ready"
        : "loading";

  const commitView = useCallback((next: View) => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const clamped =
      img && canvas
        ? clampView(next, img, canvas.clientWidth, canvas.clientHeight)
        : next.zoom <= 1
          ? IDENTITY_VIEW
          : next;
    viewRef.current = clamped;
    setView(clamped);
  }, []);

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

  useEffect(() => {
    activeRef.current = activeLandmark;
  }, [activeLandmark]);

  useEffect(() => {
    viewRef.current = IDENTITY_VIEW;
    setView(IDENTITY_VIEW);
    imageRef.current = null;
    if (!imageUrl) return;

    let cancelled = false;
    const img = new Image();
    const markReady = () => {
      if (cancelled) return;
      if (img.naturalWidth < 1) return;
      imageRef.current = img;
      setLoadedUrl(imageUrl);
      setImageVersion((version) => version + 1);
    };
    img.onload = markReady;
    img.onerror = () => {
      if (cancelled) return;
      imageRef.current = null;
      setFailedUrl(imageUrl);
      setImageVersion((version) => version + 1);
    };
    img.src = imageUrl;
    void img.decode().then(markReady).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const currentLayout = useCallback((): Layout | null => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || canvas.clientWidth === 0) return null;
    return layoutFor(
      img,
      canvas.clientWidth,
      canvas.clientHeight,
      viewRef.current,
    );
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    if (cssW === 0 || cssH === 0) return;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#0b1211";
    ctx.fillRect(0, 0, cssW, cssH);

    if (!img) return;

    const layout = layoutFor(img, cssW, cssH, viewRef.current);
    ctx.drawImage(
      img,
      layout.ox,
      layout.oy,
      img.width * layout.scale,
      img.height * layout.scale,
    );

    drawGuides(ctx, layout, landmarksRef.current, eye, img.width);
    drawLandmarks(ctx, layout, landmarksRef.current, activeRef.current);

    const pointer = pointerRef.current;
    if (pointer && !dragRef.current && !panDragRef.current && !pinchRef.current) {
      drawLoupe(ctx, img, layout, pointer, cssW);
    }
  }, [eye]);

  useEffect(() => {
    redraw();
  }, [redraw, landmarks, activeLandmark, imageVersion, cursor, view]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const zoomAt = useCallback(
    (focalCss: Point, nextZoom: number) => {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      if (!img || !canvas) return;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      commitView(zoomTo(nextZoom, focalCss, viewRef.current, img, cssW, cssH));
    },
    [commitView],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!imageRef.current) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const focal = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(focal, viewRef.current.zoom * factor);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const eventToCss = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const eventToImage = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): Point | null => {
    const img = imageRef.current;
    const layout = currentLayout();
    if (!img || !layout) return null;
    return cssToImage(eventToCss(event), layout, img);
  };

  const hitTest = (cssPoint: Point): LandmarkId | null => {
    const layout = currentLayout();
    if (!layout) return null;
    let best: { id: LandmarkId; dist: number } | null = null;
    for (const id of LANDMARK_ORDER) {
      const point = displayedPoint(landmarksRef.current, id);
      if (!point) continue;
      const screen = imageToCss(point, layout);
      const dist = distance(cssPoint, screen);
      if (dist <= HIT_RADIUS_CSS && (!best || dist < best.dist)) {
        best = { id, dist };
      }
    }
    return best?.id ?? null;
  };

  const beginPinch = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    pinchRef.current = {
      dist: Math.max(distance(pts[0], pts[1]), 1),
      mid: midpoint(pts[0], pts[1]),
      view: { ...viewRef.current },
    };
    dragRef.current = null;
    panDragRef.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageRef.current) return;
    const css = eventToCss(event);
    pointersRef.current.set(event.pointerId, css);

    if (pointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    if (event.shiftKey && viewRef.current.zoom > 1) {
      panDragRef.current = {
        x: css.x,
        y: css.y,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const imagePoint = eventToImage(event);
    const hit = hitTest(css);
    const ghosts = ghostHandles(landmarksRef.current);
    const hitGhost = Boolean(hit && ghosts[hit] && !landmarksRef.current[hit]);

    if (hitGhost && hit) {
      const ghostPoint = imagePoint ?? ghosts[hit]!;
      dragRef.current = hit;
      onActiveLandmarkChange(hit);
      onLandmarksChange(
        applyLandmarkConstraints(landmarksRef.current, hit, ghostPoint, "place"),
      );
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const activePlaced = Boolean(landmarksRef.current[activeRef.current]);
    // Un curseur pas encore posé ne doit pas être volé par un voisin trop proche.
    const canDragHit = Boolean(
      hit && (hit === activeRef.current || activePlaced),
    );

    if (canDragHit && hit) {
      dragRef.current = hit;
      onActiveLandmarkChange(hit);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (!imagePoint) {
      if (viewRef.current.zoom > 1) {
        panDragRef.current = {
          x: css.x,
          y: css.y,
          panX: viewRef.current.panX,
          panY: viewRef.current.panY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }

    const next = applyLandmarkConstraints(
      landmarksRef.current,
      activeRef.current,
      imagePoint,
      "place",
    );
    onLandmarksChange(next);
    onActiveLandmarkChange(nextLandmark(next));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const css = eventToCss(event);
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, css);
    }

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.max(distance(pts[0], pts[1]), 1);
      const mid = midpoint(pts[0], pts[1]);
      const start = pinchRef.current;
      const img = imageRef.current;
      const canvas = canvasRef.current;
      if (img && canvas) {
        const zoomed = zoomTo(
          start.view.zoom * (dist / start.dist),
          mid,
          start.view,
          img,
          canvas.clientWidth,
          canvas.clientHeight,
        );
        commitView({
          ...zoomed,
          panX: zoomed.panX + (mid.x - start.mid.x),
          panY: zoomed.panY + (mid.y - start.mid.y),
        });
      }
      pointerRef.current = null;
      setCursor(null);
      return;
    }

    pointerRef.current = css;
    setCursor(css);

    const panDrag = panDragRef.current;
    if (panDrag) {
      commitView({
        ...viewRef.current,
        panX: panDrag.panX + (css.x - panDrag.x),
        panY: panDrag.panY + (css.y - panDrag.y),
      });
      return;
    }

    const dragId = dragRef.current;
    if (!dragId) return;
    const imagePoint = eventToImage(event);
    if (!imagePoint) return;
    onLandmarksChange(
      applyLandmarkConstraints(landmarksRef.current, dragId, imagePoint, "drag"),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current = null;
    panDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pinchRef.current || dragRef.current || panDragRef.current) return;
    pointersRef.current.delete(event.pointerId);
    pointerRef.current = null;
    setCursor(null);
    redraw();
  };

  const zoomByButton = (direction: 1 | -1) => {
    const canvas = canvasRef.current;
    const focal = canvas
      ? { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }
      : { x: 0, y: 0 };
    zoomAt(focal, viewRef.current.zoom * (direction > 0 ? 1.35 : 1 / 1.35));
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#0b1211] ring-1 ring-foreground/10"
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full w-full touch-none",
            imageUrl ? "cursor-crosshair" : "cursor-default",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
        {imageUrl && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/55 p-1 text-white backdrop-blur-sm">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => zoomByButton(-1)}
              disabled={view.zoom <= MIN_ZOOM}
              aria-label="Dézoomer"
            >
              <Minus />
            </Button>
            <button
              type="button"
              className="min-w-12 px-1 text-center text-[11px] font-medium tabular-nums"
              onClick={() => commitView(IDENTITY_VIEW)}
              title="Revenir à 100 %"
            >
              {Math.round(view.zoom * 100)} %
            </button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => zoomByButton(1)}
              disabled={view.zoom >= MAX_ZOOM}
              aria-label="Zoomer"
            >
              <Plus />
            </Button>
          </div>
        )}
        {!imageUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="max-w-sm text-sm text-white/70">
              Déposez ou importez une photo monoculaire de{" "}
              {eye === "OD" ? "l’œil droit" : "l’œil gauche"} — limbe entier,
              reflet cornéen net.
            </p>
          </div>
        )}
        {imageStatus === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-sm text-white/70">Chargement de la photographie…</p>
          </div>
        )}
        {imageStatus === "error" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="max-w-sm text-sm text-rose-200">
              Impossible d’afficher cette image. Réessayez avec un JPEG ou un PNG.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function layoutFor(
  img: HTMLImageElement,
  cssW: number,
  cssH: number,
  view: View,
): Layout {
  const fit = Math.min(cssW / img.width, cssH / img.height);
  const scale = fit * view.zoom;
  return {
    scale,
    ox: (cssW - img.width * scale) / 2 + view.panX,
    oy: (cssH - img.height * scale) / 2 + view.panY,
  };
}

function clampView(
  view: View,
  img: HTMLImageElement,
  cssW: number,
  cssH: number,
): View {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  if (zoom <= 1.001) return IDENTITY_VIEW;
  const fit = Math.min(cssW / img.width, cssH / img.height);
  const imgW = img.width * fit * zoom;
  const imgH = img.height * fit * zoom;
  const maxX = Math.max(0, (imgW - cssW) / 2 + 32);
  const maxY = Math.max(0, (imgH - cssH) / 2 + 32);
  return {
    zoom,
    panX: clamp(view.panX, -maxX, maxX),
    panY: clamp(view.panY, -maxY, maxY),
  };
}

function zoomTo(
  nextZoom: number,
  focalCss: Point,
  current: View,
  img: HTMLImageElement,
  cssW: number,
  cssH: number,
): View {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  if (zoom <= 1.001) return IDENTITY_VIEW;
  const before = layoutFor(img, cssW, cssH, current);
  const imgX = (focalCss.x - before.ox) / before.scale;
  const imgY = (focalCss.y - before.oy) / before.scale;
  const fit = Math.min(cssW / img.width, cssH / img.height);
  const scale = fit * zoom;
  return {
    zoom,
    panX: focalCss.x - imgX * scale - (cssW - img.width * scale) / 2,
    panY: focalCss.y - imgY * scale - (cssH - img.height * scale) / 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function cssToImage(
  css: Point,
  layout: Layout,
  img: HTMLImageElement,
): Point | null {
  const x = (css.x - layout.ox) / layout.scale;
  const y = (css.y - layout.oy) / layout.scale;
  if (x < 0 || y < 0 || x > img.width || y > img.height) return null;
  return { x, y };
}

function imageToCss(point: Point, layout: Layout): Point {
  return {
    x: layout.ox + point.x * layout.scale,
    y: layout.oy + point.y * layout.scale,
  };
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  landmarks: EyeLandmarks,
  eye: EyeSide,
  imageWidth: number,
) {
  const temporal = landmarks.limbusTemporal;
  const nasal = landmarks.limbusNasal;
  const pupilNasal = landmarks.pupilNasal;
  const pupilTemporal = landmarks.pupilTemporal;
  const pupil = derivedPupilCenter(landmarks);
  const reflex = landmarks.cornealReflex;
  const limbusY = nasal?.y ?? temporal?.y;
  const ellipse = limbusEllipse(landmarks);

  if (limbusY != null) {
    const left = imageToCss({ x: 0, y: limbusY }, layout);
    const right = imageToCss({ x: imageWidth, y: limbusY }, layout);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.strokeStyle = "rgba(125, 211, 252, 0.55)";
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (ellipse) {
    const center = imageToCss({ x: ellipse.cx, y: ellipse.cy }, layout);
    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      ellipse.rx * layout.scale,
      ellipse.ry * layout.scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";
    ctx.setLineDash(landmarks.limbusSuperior && landmarks.limbusInferior ? [] : [6, 5]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    const top = imageToCss({ x: ellipse.cx, y: ellipse.cy - ellipse.ry }, layout);
    const bottom = imageToCss({ x: ellipse.cx, y: ellipse.cy + ellipse.ry }, layout);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.strokeStyle = "rgba(167, 139, 250, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (temporal && nasal) {
    const a = imageToCss(temporal, layout);
    const b = imageToCss(nasal, layout);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "rgba(125, 211, 252, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (pupilNasal && pupilTemporal) {
    const a = imageToCss(pupilNasal, layout);
    const b = imageToCss(pupilTemporal, layout);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (landmarks.pupilSuperior && landmarks.pupilInferior) {
    const a = imageToCss(landmarks.pupilSuperior, layout);
    const b = imageToCss(landmarks.pupilInferior, layout);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "rgba(244, 114, 182, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (pupil) {
    const p = imageToCss(pupil, layout);
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y);
    ctx.lineTo(p.x + 8, p.y);
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(p.x, p.y + 8);
    ctx.strokeStyle = "rgba(253, 230, 138, 0.95)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
    ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("centre", p.x + 10, p.y + 12);

    if (reflex) {
      const r = imageToCss(reflex, layout);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(r.x, r.y);
      ctx.strokeStyle = "rgba(251, 113, 133, 0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const nasalX = nasalDirectionX(eye);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + nasalX * 28, p.y);
    ctx.strokeStyle = "rgba(45, 212, 191, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(45, 212, 191, 0.95)";
    ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = nasalX > 0 ? "left" : "right";
    ctx.fillText("nasal", p.x + nasalX * 32, p.y - 6);

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 28);
    ctx.strokeStyle = "rgba(167, 139, 250, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(167, 139, 250, 0.95)";
    ctx.textAlign = "center";
    ctx.fillText("sup.", p.x, p.y - 32);
  }
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  landmarks: EyeLandmarks,
  active: LandmarkId,
) {
  const ghosts = ghostHandles(landmarks);
  for (const id of LANDMARK_ORDER) {
    const point = landmarks[id] ?? ghosts[id];
    if (!point) continue;
    const screen = imageToCss(point, layout);
    const meta = LANDMARK_META[id];
    const isActive = id === active;
    const isGhost = !landmarks[id];

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, isActive ? 11 : 9, 0, Math.PI * 2);
    ctx.fillStyle = isGhost ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, isActive ? 8 : 6.5, 0, Math.PI * 2);
    ctx.fillStyle = isGhost ? "rgba(255,255,255,0.2)" : meta.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = isGhost ? 1 : 1.5;
    ctx.setLineDash(isGhost ? [3, 2] : []);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!isGhost) {
      ctx.beginPath();
      ctx.moveTo(screen.x - 12, screen.y);
      ctx.lineTo(screen.x + 12, screen.y);
      ctx.moveTo(screen.x, screen.y - 12);
      ctx.lineTo(screen.x, screen.y + 12);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(meta.short, screen.x + 11, screen.y - 10);
    ctx.fillStyle = isGhost ? "rgba(255,255,255,0.7)" : "#fff";
    ctx.fillText(meta.short, screen.x + 10, screen.y - 11);
  }
}

function drawLoupe(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layout: Layout,
  pointer: Point,
  cssW: number,
) {
  const imagePoint = cssToImage(pointer, layout, img);
  if (!imagePoint) return;

  const radius = LOUPE_SIZE / 2;
  let lx = pointer.x + 28;
  let ly = pointer.y - LOUPE_SIZE - 16;
  if (lx + LOUPE_SIZE > cssW - 8) lx = pointer.x - LOUPE_SIZE - 28;
  if (ly < 8) ly = pointer.y + 24;
  const cx = lx + radius;
  const cy = ly + radius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#000";
  ctx.fillRect(lx, ly, LOUPE_SIZE, LOUPE_SIZE);

  const source = LOUPE_SIZE / (layout.scale * LOUPE_ZOOM);
  ctx.drawImage(
    img,
    imagePoint.x - source / 2,
    imagePoint.y - source / 2,
    source,
    source,
    lx,
    ly,
    LOUPE_SIZE,
    LOUPE_SIZE,
  );

  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy + 10);
  ctx.strokeStyle = "rgba(251, 113, 133, 0.95)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
}
