import {
  type EyeLandmarks,
  type EyeSide,
  type FormulaParams,
  computeAngleLambda,
  nasalDirectionX,
} from "@/lib/lambda";

export const DEMO_DISPLACEMENT_MM = 0.45;

export type SyntheticEye = {
  dataUrl: string;
  landmarks: EyeLandmarks;
  expectedDegrees: number;
  displacementNasalMm: number;
};

export function createSyntheticEye(
  eye: EyeSide,
  params: FormulaParams,
): SyntheticEye {
  const size = 900;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponible");
  }

  const cx = size / 2;
  const cy = size / 2;
  const hvidPx = 430;
  const irisR = hvidPx / 2;
  const pupilR = irisR * 0.36;
  const pxPerMm = hvidPx / params.hvidMm;
  const nasalX = nasalDirectionX(eye);
  const reflexX = cx + nasalX * DEMO_DISPLACEMENT_MM * pxPerMm;
  const reflexY = cy - 2;

  drawSclera(ctx, size);
  drawIris(ctx, cx, cy, irisR, pupilR, eye);
  drawPupil(ctx, cx, cy, pupilR);
  drawReflex(ctx, reflexX, reflexY);
  drawCaption(ctx, size, eye);

  const landmarks: EyeLandmarks = {
    limbusTemporal: { x: cx - nasalX * irisR, y: cy },
    limbusNasal: { x: cx + nasalX * irisR, y: cy },
    pupilTemporal: { x: cx - nasalX * pupilR, y: cy },
    pupilNasal: { x: cx + nasalX * pupilR, y: cy },
    cornealReflex: { x: reflexX, y: reflexY },
  };

  const expectedDegrees = computeAngleLambda({
    eye,
    displacementNasalMm: DEMO_DISPLACEMENT_MM,
    displacementVerticalMm: -2 / pxPerMm,
    radialMm: DEMO_DISPLACEMENT_MM,
    pupilDiameterMm: (pupilR * 2) / pxPerMm,
    cornealRadiusMm: params.cornealRadiusMm,
    hvidMm: params.hvidMm,
  }).degrees;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    landmarks,
    expectedDegrees,
    displacementNasalMm: DEMO_DISPLACEMENT_MM,
  };
}

function drawSclera(ctx: CanvasRenderingContext2D, size: number) {
  const gradient = ctx.createRadialGradient(
    size * 0.45,
    size * 0.4,
    40,
    size * 0.5,
    size * 0.5,
    size * 0.7,
  );
  gradient.addColorStop(0, "#f7f1e8");
  gradient.addColorStop(0.7, "#ead9c8");
  gradient.addColorStop(1, "#c9b09a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#b42318";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    const y = 80 + i * 42;
    ctx.moveTo(20, y);
    ctx.bezierCurveTo(180, y - 18, 320, y + 22, 460, y + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(880, y + 10);
    ctx.bezierCurveTo(740, y - 10, 620, y + 16, 500, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIris(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  irisR: number,
  pupilR: number,
  eye: EyeSide,
) {
  const iris = ctx.createRadialGradient(cx - 30, cy - 24, pupilR, cx, cy, irisR);
  iris.addColorStop(0, "#1f4d46");
  iris.addColorStop(0.35, "#2f6f62");
  iris.addColorStop(0.72, "#3d6a4f");
  iris.addColorStop(1, "#1a332c");
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fillStyle = iris;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(236, 253, 245, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 52; i += 1) {
    const a = (i / 52) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (pupilR + 8), cy + Math.sin(a) * (pupilR + 8));
    ctx.lineTo(cx + Math.cos(a) * irisR, cy + Math.sin(a) * irisR);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.strokeStyle = "#14241f";
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(eye === "OD" ? "TEMPORAL" : "NASAL", cx - irisR - 8, cy - irisR - 18);
  ctx.fillText(eye === "OD" ? "NASAL" : "TEMPORAL", cx + irisR + 8, cy - irisR - 18);
}

function drawPupil(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pupilR: number,
) {
  const pupil = ctx.createRadialGradient(cx - 10, cy - 8, 4, cx, cy, pupilR);
  pupil.addColorStop(0, "#1c1917");
  pupil.addColorStop(1, "#050505");
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = pupil;
  ctx.fill();
}

function drawReflex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 22);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.4, "rgba(255,255,255,0.7)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  size: number,
  eye: EyeSide,
) {
  ctx.fillStyle = "rgba(15, 23, 22, 0.72)";
  ctx.fillRect(24, size - 64, 390, 36);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `Exemple pédagogique · ${eye} · regard monoculaire`,
    36,
    size - 40,
  );
}
