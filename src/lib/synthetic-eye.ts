import {
  type EyeLandmarks,
  type EyeSide,
  type FormulaParams,
  measureEye,
  nasalDirectionX,
  REFERENCE_WTW_MM,
} from "@/lib/lambda";

export const DEMO_DISPLACEMENT_MM = 0.45;
export const DEMO_IMAGE_SIZE = 900;
export const DEMO_CORNEA_PX = 430;

export type SyntheticEye = {
  imageUrl: string;
  landmarks: EyeLandmarks;
  expectedDegrees: number;
};

export function demoGeometry(eye: EyeSide) {
  const size = DEMO_IMAGE_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const irisR = DEMO_CORNEA_PX / 2;
  const pupilR = irisR * 0.36;
  const pxPerMm = DEMO_CORNEA_PX / REFERENCE_WTW_MM;
  const nasalX = nasalDirectionX(eye);
  const reflexX = cx + nasalX * DEMO_DISPLACEMENT_MM * pxPerMm;
  const reflexY = cy - 2;

  const landmarks: EyeLandmarks = {
    limbusTemporal: { x: cx - nasalX * irisR, y: cy },
    limbusNasal: { x: cx + nasalX * irisR, y: cy },
    limbusSuperior: { x: cx, y: cy - irisR },
    limbusInferior: { x: cx, y: cy + irisR },
    pupilTemporal: { x: cx - nasalX * pupilR, y: cy },
    pupilNasal: { x: cx + nasalX * pupilR, y: cy },
    pupilSuperior: { x: cx, y: cy - pupilR },
    pupilInferior: { x: cx, y: cy + pupilR },
    cornealReflex: { x: reflexX, y: reflexY },
  };

  return { size, cx, cy, irisR, pupilR, nasalX, reflexX, reflexY, landmarks };
}

export function createSyntheticEye(
  eye: EyeSide,
  params: FormulaParams,
): SyntheticEye {
  const geo = demoGeometry(eye);
  const measured = measureEye(eye, geo.landmarks, params);

  return {
    imageUrl: renderDemoPngUrl(eye, geo),
    landmarks: geo.landmarks,
    expectedDegrees: measured.status === "ok" ? measured.angleLambdaDeg : 0,
  };
}

function renderDemoPngUrl(
  eye: EyeSide,
  geo: ReturnType<typeof demoGeometry>,
): string {
  const { size, cx, cy, irisR, pupilR, reflexX, reflexY } = geo;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de dessiner l’exemple pédagogique.");
  }

  const sclera = ctx.createRadialGradient(
    cx * 0.9,
    cy * 0.8,
    30,
    cx,
    cy,
    size * 0.72,
  );
  sclera.addColorStop(0, "#f7f1e8");
  sclera.addColorStop(0.7, "#ead9c8");
  sclera.addColorStop(1, "#c9b09a");
  ctx.fillStyle = sclera;
  ctx.fillRect(0, 0, size, size);

  const iris = ctx.createRadialGradient(
    cx * 0.94,
    cy * 0.94,
    12,
    cx,
    cy,
    irisR,
  );
  iris.addColorStop(0, "#1f4d46");
  iris.addColorStop(0.35, "#2f6f62");
  iris.addColorStop(0.72, "#3d6a4f");
  iris.addColorStop(1, "#1a332c");
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fillStyle = iris;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#14241f";
  ctx.stroke();

  const pupil = ctx.createRadialGradient(
    cx - pupilR * 0.15,
    cy - pupilR * 0.15,
    4,
    cx,
    cy,
    pupilR,
  );
  pupil.addColorStop(0, "#1c1917");
  pupil.addColorStop(1, "#050505");
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = pupil;
  ctx.fill();

  const glint = ctx.createRadialGradient(reflexX, reflexY, 0, reflexX, reflexY, 22);
  glint.addColorStop(0, "rgba(255,255,255,1)");
  glint.addColorStop(0.4, "rgba(255,255,255,0.7)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(reflexX, reflexY, 22, 0, Math.PI * 2);
  ctx.fillStyle = glint;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(reflexX, reflexY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const leftLabel = eye === "OD" ? "TEMPORAL" : "NASAL";
  const rightLabel = eye === "OD" ? "NASAL" : "TEMPORAL";
  ctx.font = "600 18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "center";
  ctx.fillText(leftLabel, cx - irisR, cy - irisR - 18);
  ctx.fillText(rightLabel, cx + irisR, cy - irisR - 18);

  ctx.fillStyle = "rgba(15,23,22,0.72)";
  roundRect(ctx, 24, size - 64, 430, 36, 6);
  ctx.fill();
  ctx.font = "600 16px sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "left";
  ctx.fillText(
    `Exemple pédagogique · ${eye} · regard monoculaire`,
    36,
    size - 40,
  );

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderDemoSvg(
  eye: EyeSide,
  geo: ReturnType<typeof demoGeometry>,
): string {
  const { size, cx, cy, irisR, pupilR, reflexX, reflexY } = geo;
  const leftLabel = eye === "OD" ? "TEMPORAL" : "NASAL";
  const rightLabel = eye === "OD" ? "NASAL" : "TEMPORAL";
  const id = eye.toLowerCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="sclera-${id}" cx="45%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#f7f1e8"/>
      <stop offset="70%" stop-color="#ead9c8"/>
      <stop offset="100%" stop-color="#c9b09a"/>
    </radialGradient>
    <radialGradient id="iris-${id}" cx="44%" cy="44%" r="58%">
      <stop offset="0%" stop-color="#1f4d46"/>
      <stop offset="35%" stop-color="#2f6f62"/>
      <stop offset="72%" stop-color="#3d6a4f"/>
      <stop offset="100%" stop-color="#1a332c"/>
    </radialGradient>
    <radialGradient id="pupil-${id}" cx="42%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <radialGradient id="glint-${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#sclera-${id})"/>
  <circle cx="${cx}" cy="${cy}" r="${irisR}" fill="url(#iris-${id})" stroke="#14241f" stroke-width="7"/>
  <circle cx="${cx}" cy="${cy}" r="${pupilR}" fill="url(#pupil-${id})"/>
  <circle cx="${reflexX}" cy="${reflexY}" r="22" fill="url(#glint-${id})"/>
  <circle cx="${reflexX}" cy="${reflexY}" r="7" fill="#ffffff"/>
  <text x="${cx - irisR}" y="${cy - irisR - 18}" text-anchor="middle" fill="#ffffff" fill-opacity="0.45" font-size="18" font-family="sans-serif" font-weight="600">${leftLabel}</text>
  <text x="${cx + irisR}" y="${cy - irisR - 18}" text-anchor="middle" fill="#ffffff" fill-opacity="0.45" font-size="18" font-family="sans-serif" font-weight="600">${rightLabel}</text>
  <rect x="24" y="${size - 64}" width="430" height="36" rx="6" fill="#0f1716" fill-opacity="0.72"/>
  <text x="36" y="${size - 40}" fill="#f8fafc" font-size="16" font-family="sans-serif" font-weight="600">Exemple pédagogique · ${eye} · regard monoculaire</text>
</svg>`;
}

export function demoSvg(eye: EyeSide): string {
  return renderDemoSvg(eye, demoGeometry(eye));
}
