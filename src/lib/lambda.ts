export type EyeSide = "OD" | "OS";

export type LandmarkId =
  | "limbusNasal"
  | "limbusTemporal"
  | "limbusSuperior"
  | "limbusInferior"
  | "pupilNasal"
  | "pupilTemporal"
  | "pupilSuperior"
  | "pupilInferior"
  | "cornealReflex";

export type Point = { x: number; y: number };

export type EyeLandmarks = Partial<Record<LandmarkId, Point>>;

export type FormulaParams = {
  /** WtW saisi par le clinicien, en mm. Null si inconnu → valeur de référence. */
  wtwMm: number | null;
  /** DAC saisie par le clinicien, en mm. Null si inconnue → valeur de référence. */
  dacMm: number | null;
};

/** Diamètre cornéen de référence si le clinicien n’a pas la biométrie. */
export const REFERENCE_WTW_MM = 11.71;
/** DAC de référence si le clinicien n’a pas la biométrie. */
export const REFERENCE_DAC_MM = 3.4;

export const DEFAULT_PARAMS: FormulaParams = {
  wtwMm: null,
  dacMm: null,
};

export type ResolvedScale = {
  wtwMm: number;
  dacMm: number;
  wtwFromReference: boolean;
  dacFromReference: boolean;
};

export function resolveScale(params: FormulaParams): ResolvedScale {
  const wtwFromReference = params.wtwMm == null || !(params.wtwMm > 0);
  const dacFromReference = params.dacMm == null || !(params.dacMm > 0);
  return {
    wtwMm: wtwFromReference ? REFERENCE_WTW_MM : params.wtwMm!,
    dacMm: dacFromReference ? REFERENCE_DAC_MM : params.dacMm!,
    wtwFromReference,
    dacFromReference,
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
  "limbusSuperior",
  "limbusInferior",
  "pupilNasal",
  "pupilTemporal",
  "pupilSuperior",
  "pupilInferior",
  "cornealReflex",
];

export const HORIZONTAL_REQUIRED: LandmarkId[] = [
  "limbusNasal",
  "limbusTemporal",
  "pupilNasal",
  "pupilTemporal",
  "cornealReflex",
];

export const VERTICAL_REQUIRED: LandmarkId[] = [
  "limbusSuperior",
  "limbusInferior",
  "pupilSuperior",
  "pupilInferior",
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
    hint: "Bord interne de l’iris, côté nez — même hauteur que LT",
    color: "#0369a1",
  },
  limbusTemporal: {
    label: "Limbe temporal",
    short: "LT",
    hint: "Bord externe de l’iris, côté tempe — même hauteur que LN",
    color: "#0f766e",
  },
  limbusSuperior: {
    label: "Limbe supérieur",
    short: "LS",
    hint: "Bord supérieur de l’iris — ajuste l’ellipse du limbe",
    color: "#7c3aed",
  },
  limbusInferior: {
    label: "Limbe inférieur",
    short: "LI",
    hint: "Bord inférieur de l’iris — ajuste l’ellipse du limbe",
    color: "#6d28d9",
  },
  pupilNasal: {
    label: "Bord pupillaire nasal",
    short: "PN",
    hint: "Marge pupillaire côté nez — pose libre",
    color: "#d97706",
  },
  pupilTemporal: {
    label: "Bord pupillaire temporal",
    short: "PT",
    hint: "Marge pupillaire côté tempe — pose libre",
    color: "#c2410c",
  },
  pupilSuperior: {
    label: "Bord pupillaire supérieur",
    short: "PS",
    hint: "Marge pupillaire en haut — pose libre, la pupille n’est pas forcément ronde",
    color: "#db2777",
  },
  pupilInferior: {
    label: "Bord pupillaire inférieur",
    short: "PI",
    hint: "Marge pupillaire en bas — pose libre, indépendant de PS",
    color: "#9f1239",
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
    "WtW : diamètre cornéen saisi par le clinicien, sinon 11,71 mm ; sur la photo il correspond à limbe nasal – limbe temporal. DAC : saisie clinicien, sinon 3,4 mm. Øp = 0,86 × WtW × (pupille N–T / cornée N–T). ratioλ = NPPI / pupille N–T. Correctopie : excentration du centre pupillaire par rapport au centre cornéen.",
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

export type Laterality =
  | "nasal"
  | "temporal"
  | "superior"
  | "inferior"
  | "centred";

export type AxisMeasurement = {
  angleLambdaDeg: number;
  angleLambdaAbsDeg: number;
  angleLambdaMm: number;
  pupilDiameterMm: number;
  correctopieMm: number;
  ratioLambda: number;
  reflexOffsetMm: number;
  laterality: Laterality;
  correctopieLaterality: Laterality;
  physiological: boolean;
  prismDiopters: number;
  warnings: string[];
};

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
      wtwFromReference: boolean;
      dacFromReference: boolean;
      horizontal: AxisMeasurement;
      vertical: AxisMeasurement | null;
      oblique: {
        angleLambdaDeg: number;
        angleLambdaMm: number;
        elevationDeg: number;
        physiological: boolean;
      } | null;
      pupilDiameterMm: number;
      correctopieMm: number;
      ratioLambda: number;
      reflexOffsetMm: number;
      laterality: Laterality;
      correctopieLaterality: Laterality;
      physiological: boolean;
      angleLambdaDeg: number;
      angleLambdaAbsDeg: number;
      angleLambdaMm: number;
      prismDiopters: number;
      formulaId: string;
      formulaExpression: string;
      warnings: string[];
    };

export function elevationFromHorizontal(
  horizontalDeg: number,
  verticalDeg: number,
): number {
  return (Math.atan2(verticalDeg, Math.abs(horizontalDeg)) * 180) / Math.PI;
}

export function obliqueLambda(
  horizontal: AxisMeasurement,
  vertical: AxisMeasurement,
): {
  angleLambdaDeg: number;
  angleLambdaMm: number;
  elevationDeg: number;
  physiological: boolean;
} {
  return {
    angleLambdaDeg: Math.hypot(
      horizontal.angleLambdaDeg,
      vertical.angleLambdaDeg,
    ),
    angleLambdaMm: Math.hypot(horizontal.angleLambdaMm, vertical.angleLambdaMm),
    elevationDeg: elevationFromHorizontal(
      horizontal.angleLambdaDeg,
      vertical.angleLambdaDeg,
    ),
    physiological: horizontal.physiological && vertical.physiological,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function isLimbusLandmark(
  id: LandmarkId,
): id is "limbusNasal" | "limbusTemporal" {
  return id === "limbusNasal" || id === "limbusTemporal";
}

export function otherLimbus(
  id: "limbusNasal" | "limbusTemporal",
): "limbusNasal" | "limbusTemporal" {
  return id === "limbusNasal" ? "limbusTemporal" : "limbusNasal";
}

export type LimbusEllipse = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export function limbusEllipse(landmarks: EyeLandmarks): LimbusEllipse | null {
  const nasal = landmarks.limbusNasal;
  const temporal = landmarks.limbusTemporal;
  if (!nasal || !temporal) return null;
  const cx = (nasal.x + temporal.x) / 2;
  const cy = (nasal.y + temporal.y) / 2;
  const rx = distance(nasal, temporal) / 2;
  const superior = landmarks.limbusSuperior;
  const inferior = landmarks.limbusInferior;
  const ry =
    superior && inferior ? Math.abs(inferior.y - superior.y) / 2 : rx;
  return { cx, cy, rx, ry };
}

export type EllipseHandleId =
  | "limbusNasal"
  | "limbusTemporal"
  | "limbusSuperior"
  | "limbusInferior"
  | "center";

export function limbusEllipseHandles(
  landmarks: EyeLandmarks,
): { id: Exclude<EllipseHandleId, "center">; point: Point }[] {
  const ellipse = limbusEllipse(landmarks);
  const nasal = landmarks.limbusNasal;
  const temporal = landmarks.limbusTemporal;
  if (!ellipse || !nasal || !temporal) return [];
  const leftId = nasal.x <= temporal.x ? "limbusNasal" : "limbusTemporal";
  const rightId = leftId === "limbusNasal" ? "limbusTemporal" : "limbusNasal";
  return [
    { id: leftId, point: { x: ellipse.cx - ellipse.rx, y: ellipse.cy } },
    { id: rightId, point: { x: ellipse.cx + ellipse.rx, y: ellipse.cy } },
    {
      id: "limbusSuperior",
      point: { x: ellipse.cx, y: ellipse.cy - ellipse.ry },
    },
    {
      id: "limbusInferior",
      point: { x: ellipse.cx, y: ellipse.cy + ellipse.ry },
    },
  ];
}

export function nearestEllipseHandle(
  point: Point,
  landmarks: EyeLandmarks,
  maxDistance = Number.POSITIVE_INFINITY,
): Exclude<EllipseHandleId, "center"> | null {
  const handles = limbusEllipseHandles(landmarks);
  if (handles.length === 0) return null;
  let best = handles[0];
  let bestDist = distance(point, best.point);
  for (const handle of handles.slice(1)) {
    const dist = distance(point, handle.point);
    if (dist < bestDist) {
      best = handle;
      bestDist = dist;
    }
  }
  return bestDist <= maxDistance ? best.id : null;
}

export function distanceToEllipse(
  point: Point,
  ellipse: LimbusEllipse,
): number {
  if (ellipse.rx < 1 || ellipse.ry < 1) return Number.POSITIVE_INFINITY;
  const nx = (point.x - ellipse.cx) / ellipse.rx;
  const ny = (point.y - ellipse.cy) / ellipse.ry;
  const r = Math.hypot(nx, ny);
  if (r < 1e-6) return Math.min(ellipse.rx, ellipse.ry);
  const theta = Math.atan2(ny, nx);
  const ex = ellipse.cx + ellipse.rx * Math.cos(theta);
  const ey = ellipse.cy + ellipse.ry * Math.sin(theta);
  return distance(point, { x: ex, y: ey });
}

export function translateCornea(
  landmarks: EyeLandmarks,
  dx: number,
  dy: number,
): EyeLandmarks {
  const ids: LandmarkId[] = [
    "limbusNasal",
    "limbusTemporal",
    "limbusSuperior",
    "limbusInferior",
  ];
  const next: EyeLandmarks = { ...landmarks };
  for (const id of ids) {
    const point = next[id];
    if (!point) continue;
    next[id] = { x: point.x + dx, y: point.y + dy };
  }
  return next;
}

export function ghostHandles(
  landmarks: EyeLandmarks,
): Partial<Record<LandmarkId, Point>> {
  const ghosts: Partial<Record<LandmarkId, Point>> = {};
  const cornea = limbusEllipse(landmarks);
  if (cornea) {
    if (!landmarks.limbusSuperior) {
      ghosts.limbusSuperior = { x: cornea.cx, y: cornea.cy - cornea.ry };
    }
    if (!landmarks.limbusInferior) {
      ghosts.limbusInferior = { x: cornea.cx, y: cornea.cy + cornea.ry };
    }
  }
  return ghosts;
}

export function displayedPoint(
  landmarks: EyeLandmarks,
  id: LandmarkId,
): Point | null {
  return landmarks[id] ?? ghostHandles(landmarks)[id] ?? null;
}

/**
 * Les deux limbes cornéens restent à la même hauteur (axe nasal–temporal).
 * Premier limbe : pose libre. Second : Y du premier. Déplacement : les deux Y suivent.
 */
export function withAlignedLimbus(
  landmarks: EyeLandmarks,
  id: LandmarkId,
  point: Point,
  mode: "place" | "drag",
): EyeLandmarks {
  return applyLandmarkConstraints(landmarks, id, point, mode);
}

export function applyLandmarkConstraints(
  landmarks: EyeLandmarks,
  id: LandmarkId,
  point: Point,
  mode: "place" | "drag",
): EyeLandmarks {
  if (id === "limbusNasal" || id === "limbusTemporal") {
    const aligned = alignPair(landmarks, id, "limbusNasal", "limbusTemporal", "y", point, mode);
    return syncVerticalLimbusToCornea(aligned);
  }
  if (id === "limbusSuperior" || id === "limbusInferior") {
    return alignVerticalPair(
      landmarks,
      id,
      "limbusSuperior",
      "limbusInferior",
      point,
      corneaCenter(landmarks),
    );
  }
  return { ...landmarks, [id]: point };
}

function alignPair(
  landmarks: EyeLandmarks,
  id: LandmarkId,
  a: LandmarkId,
  b: LandmarkId,
  lock: "x" | "y",
  point: Point,
  mode: "place" | "drag",
): EyeLandmarks {
  const otherId = id === a ? b : a;
  const other = landmarks[otherId];
  if (!other) {
    return { ...landmarks, [id]: point };
  }
  if (mode === "place") {
    const snapped =
      lock === "y" ? { x: point.x, y: other.y } : { x: other.x, y: point.y };
    return { ...landmarks, [id]: snapped };
  }
  const moved =
    lock === "y" ? { x: point.x, y: point.y } : { x: point.x, y: point.y };
  const otherMoved =
    lock === "y" ? { x: other.x, y: point.y } : { x: point.x, y: other.y };
  return { ...landmarks, [id]: moved, [otherId]: otherMoved };
}

function corneaCenter(landmarks: EyeLandmarks): Point | null {
  if (!landmarks.limbusNasal || !landmarks.limbusTemporal) return null;
  return midpoint(landmarks.limbusNasal, landmarks.limbusTemporal);
}

function alignVerticalPair(
  landmarks: EyeLandmarks,
  id: LandmarkId,
  superiorId: LandmarkId,
  inferiorId: LandmarkId,
  point: Point,
  center: Point | null,
): EyeLandmarks {
  const otherId = id === superiorId ? inferiorId : superiorId;
  if (center) {
    const y = point.y;
    return {
      ...landmarks,
      [superiorId]: { x: center.x, y: id === superiorId ? y : 2 * center.y - y },
      [inferiorId]: { x: center.x, y: id === inferiorId ? y : 2 * center.y - y },
    };
  }
  const other = landmarks[otherId];
  if (!other) {
    return { ...landmarks, [id]: point };
  }
  return {
    ...landmarks,
    [id]: { x: other.x, y: point.y },
  };
}

function syncVerticalLimbusToCornea(landmarks: EyeLandmarks): EyeLandmarks {
  const center = corneaCenter(landmarks);
  if (!center) return landmarks;
  const next = { ...landmarks };
  if (next.limbusSuperior) {
    next.limbusSuperior = { x: center.x, y: next.limbusSuperior.y };
  }
  if (next.limbusInferior) {
    next.limbusInferior = { x: center.x, y: next.limbusInferior.y };
  }
  if (next.limbusSuperior && next.limbusInferior) {
    const ry = Math.abs(next.limbusInferior.y - next.limbusSuperior.y) / 2;
    next.limbusSuperior = { x: center.x, y: center.y - ry };
    next.limbusInferior = { x: center.x, y: center.y + ry };
  }
  return next;
}

/** Centre pupillaire : croisement des axes N–T et S–I s’ils existent. */
export function derivedPupilCenter(landmarks: EyeLandmarks): Point | null {
  const horizontal =
    landmarks.pupilNasal && landmarks.pupilTemporal
      ? midpoint(landmarks.pupilNasal, landmarks.pupilTemporal)
      : null;
  const vertical =
    landmarks.pupilSuperior && landmarks.pupilInferior
      ? midpoint(landmarks.pupilSuperior, landmarks.pupilInferior)
      : null;
  if (horizontal && vertical) {
    return { x: vertical.x, y: horizontal.y };
  }
  return horizontal ?? vertical;
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

export function extractVerticalPixels(landmarks: EyeLandmarks): KappaViewPixels | null {
  const limbusSuperior = landmarks.limbusSuperior;
  const limbusInferior = landmarks.limbusInferior;
  const pupilSuperior = landmarks.pupilSuperior;
  const pupilInferior = landmarks.pupilInferior;
  const reflex = landmarks.cornealReflex;
  if (
    !limbusSuperior ||
    !limbusInferior ||
    !pupilSuperior ||
    !pupilInferior ||
    !reflex
  ) {
    return null;
  }

  return {
    corneeNltl: distance(limbusSuperior, limbusInferior),
    pupilNptp: projectedAlong(
      pupilSuperior,
      pupilInferior,
      limbusSuperior,
      limbusInferior,
    ),
    nppi: projectedAlong(pupilSuperior, reflex, limbusSuperior, limbusInferior),
    irisNasal: projectedAlong(
      limbusSuperior,
      pupilSuperior,
      limbusSuperior,
      limbusInferior,
    ),
  };
}

function axisFromComputation(
  computation: KappaViewResult,
  scale: { wtwMm: number; dacMm: number },
  pixels: KappaViewPixels,
  orientation: "horizontal" | "vertical",
): AxisMeasurement | { status: "invalid"; reason: string } {
  if (pixels.corneeNltl < 8) {
    return {
      status: "invalid",
      reason:
        orientation === "horizontal"
          ? "Les points limbiques nasaux et temporaux sont trop proches."
          : "Les points limbiques supérieur et inférieur sont trop proches.",
    };
  }
  if (pixels.pupilNptp < 4) {
    return {
      status: "invalid",
      reason:
        orientation === "horizontal"
          ? "Les bords pupillaires nasal et temporal sont trop proches, ou inversés."
          : "Les bords pupillaires supérieur et inférieur sont trop proches, ou inversés.",
    };
  }

  const centredThresholdMm = 0.04;
  const positive = orientation === "horizontal" ? "nasal" : "superior";
  const negative = orientation === "horizontal" ? "temporal" : "inferior";
  const laterality: Laterality =
    Math.abs(computation.reflexOffsetMm) < centredThresholdMm
      ? "centred"
      : computation.reflexOffsetMm > 0
        ? positive
        : negative;
  const correctopieLaterality: Laterality =
    Math.abs(computation.correctopieMm) < centredThresholdMm
      ? "centred"
      : computation.correctopieMm > 0
        ? positive
        : negative;

  const warnings: string[] = [];
  if (pixels.irisNasal < 0) {
    warnings.push(
      orientation === "horizontal"
        ? "L’iris nasal est négatif : le bord pupillaire nasal n’est pas entre les limbes, côté nez."
        : "L’iris supérieur est négatif : le bord pupillaire supérieur n’est pas entre les limbes, en haut.",
    );
  }
  if (computation.ratioLambda < 0 || computation.ratioLambda > 1) {
    warnings.push(
      orientation === "horizontal"
        ? "Le reflet de Purkinje est en dehors de la pupille (axe horizontal). Vérifiez PN, PT et P1."
        : "Le reflet de Purkinje est en dehors de la pupille (axe vertical). Vérifiez PS, PI et P1.",
    );
  }
  if (computation.pupilDiameterMm >= scale.wtwMm) {
    warnings.push(
      orientation === "horizontal"
        ? "Le diamètre pupillaire horizontal dépasse le diamètre cornéen."
        : "Le diamètre pupillaire vertical dépasse le diamètre cornéen.",
    );
  }

  const rad = (computation.angleLambdaDeg * Math.PI) / 180;
  return {
    angleLambdaDeg: computation.angleLambdaDeg,
    angleLambdaAbsDeg: Math.abs(computation.angleLambdaDeg),
    angleLambdaMm: scale.dacMm * Math.tan(rad),
    pupilDiameterMm: computation.pupilDiameterMm,
    correctopieMm: computation.correctopieMm,
    ratioLambda: computation.ratioLambda,
    reflexOffsetMm: computation.reflexOffsetMm,
    laterality,
    correctopieLaterality,
    physiological: isPhysiologicalAngle(laterality, computation.angleLambdaDeg),
    prismDiopters: 100 * Math.tan(rad),
    warnings,
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

  const scale = resolveScale(params);
  if (scale.wtwMm <= 0 || scale.dacMm <= 0) {
    return { status: "invalid", reason: "Paramètres d’échelle invalides." };
  }

  const hPixels = extractKappaViewPixels(landmarks);
  const vPixels = extractVerticalPixels(landmarks);

  let horizontal: AxisMeasurement | null = null;
  let vertical: AxisMeasurement | null = null;
  let invalidReason: string | null = null;

  if (hPixels) {
    const result = axisFromComputation(
      computeAngleLambda(hPixels, scale),
      scale,
      hPixels,
      "horizontal",
    );
    if ("status" in result && result.status === "invalid") {
      invalidReason = result.reason;
    } else {
      horizontal = result as AxisMeasurement;
    }
  }
  if (vPixels) {
    const result = axisFromComputation(
      computeAngleLambda(vPixels, scale),
      scale,
      vPixels,
      "vertical",
    );
    if (!("status" in result && result.status === "invalid")) {
      vertical = result as AxisMeasurement;
    } else if (!invalidReason) {
      invalidReason = result.reason;
    }
  }

  if (!horizontal && !vertical) {
    const missingH = HORIZONTAL_REQUIRED.filter((id) => landmarks[id] == null);
    if (missingH.length > 0) {
      return { status: "incomplete", missing: missingH };
    }
    const missingV = VERTICAL_REQUIRED.filter((id) => landmarks[id] == null);
    if (missingV.length > 0) {
      return { status: "incomplete", missing: missingV };
    }
    return {
      status: "invalid",
      reason: invalidReason ?? "Mesure impossible. Vérifiez les curseurs.",
    };
  }

  if (!horizontal) {
    return {
      status: "invalid",
      reason: invalidReason ?? "Mesure horizontale impossible.",
    };
  }

  const pxPerMm = hPixels
    ? hPixels.corneeNltl / scale.wtwMm
    : vPixels
      ? vPixels.corneeNltl / scale.wtwMm
      : 1;
  const warnings = [
    ...horizontal.warnings,
    ...(vertical?.warnings ?? []),
  ];

  return {
    status: "ok",
    eye,
    pxPerMm,
    wtwMm: scale.wtwMm,
    dacMm: scale.dacMm,
    wtwFromReference: scale.wtwFromReference,
    dacFromReference: scale.dacFromReference,
    horizontal,
    vertical,
    oblique: vertical ? obliqueLambda(horizontal, vertical) : null,
    pupilDiameterMm: horizontal.pupilDiameterMm,
    correctopieMm: horizontal.correctopieMm,
    ratioLambda: horizontal.ratioLambda,
    reflexOffsetMm: horizontal.reflexOffsetMm,
    laterality: horizontal.laterality,
    correctopieLaterality: horizontal.correctopieLaterality,
    physiological: horizontal.physiological,
    angleLambdaDeg: horizontal.angleLambdaDeg,
    angleLambdaAbsDeg: horizontal.angleLambdaAbsDeg,
    angleLambdaMm: horizontal.angleLambdaMm,
    prismDiopters: horizontal.prismDiopters,
    formulaId: FORMULA.id,
    formulaExpression: FORMULA.expression,
    warnings,
  };
}

export function formatMm(value: number, signed = false): string {
  if (!signed) {
    return `${value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} mm`;
  }
  const abs = Math.abs(value);
  const body = abs.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (Math.abs(value) < 0.005) return `${body} mm`;
  return `${value > 0 ? "+" : "−"}${body} mm`;
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

/** Intervalle physiologique de λ nasal, en degrés. */
export const PHYSIOLOGICAL_NASAL_MAX_DEG = 3;
/** Seuil physiologique de λ pour temporal, supérieur et inférieur, en degrés. */
export const PHYSIOLOGICAL_OTHER_MAX_DEG = 0.6;

export function isPhysiologicalAngle(
  laterality: Laterality,
  angleDeg: number,
): boolean {
  if (laterality === "centred") return true;
  if (laterality === "nasal") {
    return angleDeg >= 0 && angleDeg <= PHYSIOLOGICAL_NASAL_MAX_DEG;
  }
  return Math.abs(angleDeg) <= PHYSIOLOGICAL_OTHER_MAX_DEG;
}

export function physiologicalLabel(physiological: boolean): string {
  return physiological ? "physiologique" : "hors norme";
}

export function lateralityLabel(laterality: Laterality): string {
  if (laterality === "centred") return "centré";
  if (laterality === "nasal") return "nasal";
  if (laterality === "temporal") return "temporal";
  if (laterality === "superior") return "supérieur";
  return "inférieur";
}

export function obliqueLateralityLabel(
  horizontal: Laterality,
  vertical: Laterality,
): string {
  const parts: string[] = [];
  if (horizontal !== "centred") parts.push(lateralityLabel(horizontal));
  if (vertical !== "centred") parts.push(lateralityLabel(vertical));
  return parts.length > 0 ? parts.join(" · ") : "centré";
}

export function eyeLabel(eye: EyeSide): string {
  return eye === "OD" ? "Œil droit (OD)" : "Œil gauche (OS)";
}

export function nextLandmark(landmarks: EyeLandmarks): LandmarkId {
  return (
    LANDMARK_ORDER.find((id) => landmarks[id] == null) ?? "cornealReflex"
  );
}
