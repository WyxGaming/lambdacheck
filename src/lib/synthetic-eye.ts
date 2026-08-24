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
    imageUrl: `/exemple-${eye.toLowerCase()}.jpg`,
    landmarks: geo.landmarks,
    expectedDegrees: measured.status === "ok" ? measured.angleLambdaDeg : 0,
  };
}
