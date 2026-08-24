"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LANDMARK_META,
  LANDMARK_ORDER,
  type EyeLandmarks,
  type EyeSide,
  type LandmarkId,
  type Point,
  derivedPupilCenter,
  distance,
  nasalDirectionX,
  nextLandmark,
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

const HIT_RADIUS_CSS = 14;
const LOUPE_SIZE = 148;
const LOUPE_ZOOM = 2.8;

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
  const pointerRef = useRef<Point | null>(null);
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

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

  useEffect(() => {
    activeRef.current = activeLandmark;
  }, [activeLandmark]);

  useEffect(() => {
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

    const layout = fitImage(img, cssW, cssH);
    ctx.drawImage(img, layout.ox, layout.oy, img.width * layout.scale, img.height * layout.scale);

    drawGuides(ctx, layout, landmarksRef.current, eye);
    drawLandmarks(ctx, layout, landmarksRef.current, activeRef.current);

    const pointer = pointerRef.current;
    if (pointer && !dragRef.current) {
      drawLoupe(ctx, img, layout, pointer, cssW);
    }
  }, [eye]);

  useEffect(() => {
    redraw();
  }, [redraw, landmarks, activeLandmark, imageVersion, cursor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  const eventToCss = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const eventToImage = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): Point | null => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return null;
    const css = eventToCss(event);
    const layout = fitImage(img, canvas.clientWidth, canvas.clientHeight);
    return cssToImage(css, layout, img);
  };

  const hitTest = (cssPoint: Point): LandmarkId | null => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return null;
    const layout = fitImage(img, canvas.clientWidth, canvas.clientHeight);
    let best: { id: LandmarkId; dist: number } | null = null;
    for (const id of LANDMARK_ORDER) {
      const point = landmarksRef.current[id];
      if (!point) continue;
      const screen = imageToCss(point, layout);
      const dist = distance(cssPoint, screen);
      if (dist <= HIT_RADIUS_CSS && (!best || dist < best.dist)) {
        best = { id, dist };
      }
    }
    return best?.id ?? null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const css = eventToCss(event);
    const hit = hitTest(css);
    if (hit) {
      dragRef.current = hit;
      onActiveLandmarkChange(hit);
      return;
    }
    const imagePoint = eventToImage(event);
    if (!imagePoint) return;
    const next = {
      ...landmarksRef.current,
      [activeRef.current]: imagePoint,
    };
    onLandmarksChange(next);
    onActiveLandmarkChange(nextLandmark(next));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const css = eventToCss(event);
    pointerRef.current = css;
    setCursor(css);

    const dragId = dragRef.current;
    if (!dragId) return;
    const imagePoint = eventToImage(event);
    if (!imagePoint) return;
    onLandmarksChange({
      ...landmarksRef.current,
      [dragId]: imagePoint,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerLeave = () => {
    pointerRef.current = null;
    setCursor(null);
    redraw();
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
        {!imageUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="max-w-sm text-sm text-white/70">
              Importez une photographie monoculaire de {eye === "OD" ? "l’œil droit" : "l’œil gauche"}
              , limbe entier visible, reflet cornéen net.
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

function fitImage(img: HTMLImageElement, cssW: number, cssH: number): Layout {
  const scale = Math.min(cssW / img.width, cssH / img.height);
  return {
    scale,
    ox: (cssW - img.width * scale) / 2,
    oy: (cssH - img.height * scale) / 2,
  };
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
) {
  const temporal = landmarks.limbusTemporal;
  const nasal = landmarks.limbusNasal;
  const pupilNasal = landmarks.pupilNasal;
  const pupilTemporal = landmarks.pupilTemporal;
  const pupil = derivedPupilCenter(landmarks);
  const reflex = landmarks.cornealReflex;

  if (temporal && nasal) {
    const a = imageToCss(temporal, layout);
    const b = imageToCss(nasal, layout);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const radius = distance(a, b) / 2;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.setLineDash([]);

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
  }
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  landmarks: EyeLandmarks,
  active: LandmarkId,
) {
  for (const id of LANDMARK_ORDER) {
    const point = landmarks[id];
    if (!point) continue;
    const screen = imageToCss(point, layout);
    const meta = LANDMARK_META[id];
    const isActive = id === active;

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, isActive ? 11 : 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, isActive ? 8 : 6.5, 0, Math.PI * 2);
    ctx.fillStyle = meta.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(screen.x - 12, screen.y);
    ctx.lineTo(screen.x + 12, screen.y);
    ctx.moveTo(screen.x, screen.y - 12);
    ctx.lineTo(screen.x, screen.y + 12);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(meta.short, screen.x + 11, screen.y - 10);
    ctx.fillStyle = "#fff";
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
