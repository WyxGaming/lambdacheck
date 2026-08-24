export type EyeSide = "OD" | "OS";

export type LandmarkId =
  | "limbusNasal"
  | "limbusTemporal"
  | "pupilNasal"
  | "pupilTemporal"
  | "cornealReflex";

export type Point = { x: number; y: number };

export type EyeLandmarks = Partial<Record<LandmarkId, Point>>;

export type FormulaParams = {
  /** DAC saisie par le clinicien, en mm. Null si inconnue → valeur de référence. */
  dacMm: number | null;
};

/** Échelle millimétrique du WtW mesuré sur la photo (limbe N–T). */
export const REFERENCE_WTW_MM = 11.71;
/** DAC de référence si le clinicien n’a pas la biométrie. */
export const REFERENCE_DAC_MM = 3.4;

export const DEFAULT_PARAMS: FormulaParams = {
  dacMm: null,
};

export type ResolvedScale = {
  wtwMm: number;
  dacMm: number;
  dacFromReference: boolean;
};

export function resolveScale(params: FormulaParams): ResolvedScale {
  if (params.dacMm != null && params.dacMm > 0) {
    return {
      wtwMm: REFERENCE_WTW_MM,
      dacMm: params.dacMm,
      dacFromReference: false,
    };
  }
  return {
    wtwMm: REFERENCE_WTW_MM,
    dacMm: REFERENCE_DAC_MM,
    dacFromReference: true,
  };
}

/** Facteur d’apparence pupillaire de KappaView. */
export const PUPIL_APPARENT_FACTOR = 0.86;
/** Gain empirique appliqué à arctan(…) en degrés. */
export const LAMBDA_GAIN = 1.0455;
/** Constante empirique, en degrés. */
export const LAMBDA_OFFSET = -0.0329;

export const LANDMARK_ORDER: LandmarkId[] = [
  "limbusNasal",
  "limbusTemporal",
  "pupilNasal",
  "pupilTemporal",
  "cornealReflex",
];

export const FIRST_LANDMARK: LandmarkId = "limbusNasal";

export const LANDMARK_META: Record<
  LandmarkId,
  { label: string; short: string; hint: string; color: string }
> = {
  limbusNasal: {
    label: "Limbe nasal",
    short: "LN",
    hint: "Bord interne de l’iris, côté nez",
    color: "#0369a1",
  },
  limbusTemporal: {
    label: "Limbe temporal",
    short: "LT",
    hint: "Bord externe de l’iris, côté tempe",
    color: "#0f766e",
  },
  pupilNasal: {
    label: "Bord pupillaire nasal",
    short: "PN",
    hint: "Marge pupillaire côté nez",
    color: "#d97706",
  },
  pupilTemporal: {
    label: "Bord pupillaire temporal",
    short: "PT",
    hint: "Marge pupillaire côté tempe",
    color: "#c2410c",
  },
  cornealReflex: {
    label: "Reflet de Purkinje",
    short: "P1",
    hint: "Premier reflet de Purkinje (glint)",
    color: "#e11d48",
  },
};

export const FORMULA = {
  id: "kappaview4-necker",
  version: "KappaView4",
  title: "KappaView — Necker-Enfants malades",
  expression: "λ = 1,0455 × atan((Øp/2 − ratioλ × Øp) / DAC) − 0,0329",
  status: "kappaview" as const,
  notes:
    "Le WtW est la distance limbe nasal – limbe temporal mesurée sur la photo, ramenée à 11,71 mm. Øp = 0,86 × WtW × (pupille N–T / cornée N–T). ratioλ = NPPI / pupille N–T (bord pupillaire nasal → Purkinje). DAC : saisie clinicien, sinon 3,4 mm. Correctopie : excentration du centre pupillaire par rapport au centre cornéen.",
};

export type KappaViewPixels = {
  /** Cornée limbe nasal → limbe temporal, px. */
  corneeNltl: number;
  /** Pupille bord nasal → bord temporal, px. */
  pupilNptp: number;
  /** Bord pupillaire nasal → reflet de Purkinje, px. */
  nppi: number;
  /** Largeur d’iris nasal (limbe nasal → bord pupillaire nasal), px. */
  irisNasal: number;
};

export type KappaViewResult = {
  angleLambdaDeg: number;
  pupilDiameterMm: number;
  correctopieMm: number;
  ratioLambda: number;
  reflexOffsetMm: number;
};

/**
 * Formule KappaView4 (Necker-Enfants malades).
 *
 * ratio_lambda = NPPI / pupil_NPTP
 * diam_pupil   = (WtW * pupil_NPTP / cornee_NLTL) * 0.86
 * correctopie  = ((cornee_NLTL/2) - (pupil_NPTP/2 + taille_iris_nasal)) * (WtW / cornee_NLTL)
 * angle_lambda = degrees(atan(((diam_pupil/2) - ratio_lambda * diam_pupil) / DAC)) * 1.0455 - 0.0329
 */
export function computeAngleLambda(
  pixels: KappaViewPixels,
  scale: { wtwMm: number; dacMm: number },
): KappaViewResult {
  const ratioLambda = pixels.nppi / pixels.pupilNptp;
  const pupilDiameterMm =
    ((scale.wtwMm * pixels.pupilNptp) / pixels.corneeNltl) *
    PUPIL_APPARENT_FACTOR;
  const correctopieMm =
    (pixels.corneeNltl / 2 - (pixels.pupilNptp / 2 + pixels.irisNasal)) *
    (scale.wtwMm / pixels.corneeNltl);
  const reflexOffsetMm = pupilDiameterMm / 2 - ratioLambda * pupilDiameterMm;
  const angleLambdaDeg =
    ((Math.atan(reflexOffsetMm / scale.dacMm) * 180) / Math.PI) * LAMBDA_GAIN +
    LAMBDA_OFFSET;

  return {
    angleLambdaDeg,
    pupilDiameterMm,
    correctopieMm,
    ratioLambda,
    reflexOffsetMm,
  };
}

export type EyeMeasurement =
  | { status: "empty" }
  | { status: "incomplete"; missing: LandmarkId[] }
  | { status: "invalid"; reason: string }
  | {
      status: "ok";
      eye: EyeSide;
      pxPerMm: number;
      wtwMm: number;
      dacMm: number;
      dacFromReference: boolean;
      pupilDiameterMm: number;
      correctopieMm: number;
      ratioLambda: number;
      reflexOffsetMm: number;
      laterality: "nasal" | "temporal" | "centred";
      correctopieLaterality: "nasal" | "temporal" | "centred";
      angleLambdaDeg: number;
      angleLambdaAbsDeg: number;
      prismDiopters: number;
      formulaId: string;
      formulaExpression: string;
      warnings: string[];
    };

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Centre pupillaire estimé : milieu des bords nasal et temporal. */
export function derivedPupilCenter(landmarks: EyeLandmarks): Point | null {
  if (!landmarks.pupilNasal || !landmarks.pupilTemporal) return null;
  return midpoint(landmarks.pupilNasal, landmarks.pupilTemporal);
}

export function missingLandmarks(landmarks: EyeLandmarks): LandmarkId[] {
  return LANDMARK_ORDER.filter((id) => landmarks[id] == null);
}

/**
 * Convention d’image : patient de face, photo non miroir.
 * OD : le nasal est à droite de l’image (+x).
 * OS : le nasal est à gauche de l’image (−x).
 */
export function nasalDirectionX(eye: EyeSide): 1 | -1 {
  return eye === "OD" ? 1 : -1;
}

/** Projection signée de origin→point sur l’axe axisFrom→axisTo. */
export function projectedAlong(
  origin: Point,
  point: Point,
  axisFrom: Point,
  axisTo: Point,
): number {
  const axisX = axisTo.x - axisFrom.x;
  const axisY = axisTo.y - axisFrom.y;
  const length = Math.hypot(axisX, axisY);
  if (length < 1e-9) return 0;
  return (
    ((point.x - origin.x) * axisX + (point.y - origin.y) * axisY) / length
  );
}

export function extractKappaViewPixels(landmarks: EyeLandmarks): KappaViewPixels | null {
  const limbusNasal = landmarks.limbusNasal;
  const limbusTemporal = landmarks.limbusTemporal;
  const pupilNasal = landmarks.pupilNasal;
  const pupilTemporal = landmarks.pupilTemporal;
  const reflex = landmarks.cornealReflex;
  if (!limbusNasal || !limbusTemporal || !pupilNasal || !pupilTemporal || !reflex) {
    return null;
  }

  return {
    corneeNltl: distance(limbusNasal, limbusTemporal),
    pupilNptp: projectedAlong(pupilNasal, pupilTemporal, limbusNasal, limbusTemporal),
    nppi: projectedAlong(pupilNasal, reflex, limbusNasal, limbusTemporal),
    irisNasal: projectedAlong(limbusNasal, pupilNasal, limbusNasal, limbusTemporal),
  };
}

export function measureEye(
  eye: EyeSide,
  landmarks: EyeLandmarks,
  params: FormulaParams,
): EyeMeasurement {
  if (Object.keys(landmarks).length === 0) {
    return { status: "empty" };
  }

  const missing = missingLandmarks(landmarks);
  if (missing.length > 0) {
    return { status: "incomplete", missing };
  }

  const scale = resolveScale(params);
  if (scale.dacMm <= 0) {
    return { status: "invalid", reason: "Paramètres d’échelle invalides." };
  }

  const pixels = extractKappaViewPixels(landmarks);
  if (!pixels) {
    return { status: "incomplete", missing: missingLandmarks(landmarks) };
  }

  if (pixels.corneeNltl < 8) {
    return {
      status: "invalid",
      reason:
        "Les points limbiques sont trop proches. Replacez le limbe nasal et le limbe temporal aux bords opposés de l’iris.",
    };
  }

  if (pixels.pupilNptp < 4) {
    return {
      status: "invalid",
      reason:
        "Les bords pupillaires sont trop proches, ou nasal et temporal sont inversés. Vérifiez PN et PT.",
    };
  }

  const computation = computeAngleLambda(pixels, scale);
  const pxPerMm = pixels.corneeNltl / scale.wtwMm;

  const centredThresholdMm = 0.04;
  const laterality =
    Math.abs(computation.reflexOffsetMm) < centredThresholdMm
      ? "centred"
      : computation.reflexOffsetMm > 0
        ? "nasal"
        : "temporal";
  const correctopieLaterality =
    Math.abs(computation.correctopieMm) < centredThresholdMm
      ? "centred"
      : computation.correctopieMm > 0
        ? "nasal"
        : "temporal";

  const warnings: string[] = [];
  if (pixels.irisNasal < 0) {
    warnings.push(
      "L’iris nasal est négatif : le bord pupillaire nasal n’est pas entre les limbes, côté nez.",
    );
  }
  if (computation.ratioLambda < 0 || computation.ratioLambda > 1) {
    warnings.push(
      "Le reflet de Purkinje est en dehors de la pupille. Vérifiez PN, PT et P1.",
    );
  }
  if (computation.pupilDiameterMm >= scale.wtwMm) {
    warnings.push(
      "Le diamètre pupillaire dépasse le diamètre cornéen : vérifiez les curseurs.",
    );
  }

  const rad = (computation.angleLambdaDeg * Math.PI) / 180;

  return {
    status: "ok",
    eye,
    pxPerMm,
    wtwMm: scale.wtwMm,
    dacMm: scale.dacMm,
    dacFromReference: scale.dacFromReference,
    pupilDiameterMm: computation.pupilDiameterMm,
    correctopieMm: computation.correctopieMm,
    ratioLambda: computation.ratioLambda,
    reflexOffsetMm: computation.reflexOffsetMm,
    laterality,
    correctopieLaterality,
    angleLambdaDeg: computation.angleLambdaDeg,
    angleLambdaAbsDeg: Math.abs(computation.angleLambdaDeg),
    prismDiopters: 100 * Math.tan(rad),
    formulaId: FORMULA.id,
    formulaExpression: FORMULA.expression,
    warnings,
  };
}

export function formatMm(value: number): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} mm`;
}

export function formatDeg(value: number, signed = false): string {
  const abs = Math.abs(value);
  const body = abs.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!signed) return `${body}°`;
  if (Math.abs(value) < 0.005) return `${body}°`;
  return `${value > 0 ? "+" : "−"}${body}°`;
}

export function lateralityLabel(
  laterality: "nasal" | "temporal" | "centred",
): string {
  if (laterality === "centred") return "centré";
  if (laterality === "nasal") return "nasal";
  return "temporal";
}

export function eyeLabel(eye: EyeSide): string {
  return eye === "OD" ? "Œil droit (OD)" : "Œil gauche (OS)";
}

export function nextLandmark(landmarks: EyeLandmarks): LandmarkId {
  return (
    LANDMARK_ORDER.find((id) => landmarks[id] == null) ?? "cornealReflex"
  );
}
