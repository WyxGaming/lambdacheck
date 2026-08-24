export type EyeSide = "OD" | "OS";

export type LandmarkId =
  | "limbusTemporal"
  | "limbusNasal"
  | "pupilCenter"
  | "cornealReflex";

export type Point = { x: number; y: number };

export type EyeLandmarks = Partial<Record<LandmarkId, Point>>;

export type FormulaParams = {
  /** Diamètre irien horizontal visible (HVID) servant d’échelle, en mm. */
  hvidMm: number;
  /** Rayon de courbure cornéen antérieur, en mm. */
  cornealRadiusMm: number;
};

export const DEFAULT_PARAMS: FormulaParams = {
  hvidMm: 11.7,
  cornealRadiusMm: 7.8,
};

export const LANDMARK_ORDER: LandmarkId[] = [
  "limbusTemporal",
  "limbusNasal",
  "pupilCenter",
  "cornealReflex",
];

export const LANDMARK_META: Record<
  LandmarkId,
  { label: string; short: string; hint: string; color: string }
> = {
  limbusTemporal: {
    label: "Limbe temporal",
    short: "T",
    hint: "Bord externe de l’iris, côté tempe",
    color: "#0f766e",
  },
  limbusNasal: {
    label: "Limbe nasal",
    short: "N",
    hint: "Bord interne de l’iris, côté nez",
    color: "#0369a1",
  },
  pupilCenter: {
    label: "Centre pupillaire",
    short: "P",
    hint: "Centre géométrique de la pupille",
    color: "#d97706",
  },
  cornealReflex: {
    label: "Reflet cornéen",
    short: "R",
    hint: "Premier reflet de Purkinje (glint)",
    color: "#e11d48",
  },
};

/**
 * Métadonnées de la formule active.
 * Remplacer `computeAngleLambda` et ce bloc lorsque la formule clinique sera fournie.
 */
export const FORMULA = {
  id: "provisional-atan-delta-over-R",
  version: "0.1-provisoire",
  title: "Formule provisoire",
  expression: "λ = arctan(δ / R)",
  status: "provisional" as const,
  notes:
    "δ est le déplacement horizontal du 1er reflet de Purkinje par rapport au centre pupillaire (mm), positif vers le nasal. R est le rayon de courbure cornéen antérieur (mm). Cette expression est un substitut photographique classique (type Hirschberg / Brodie) en attendant la formule validée.",
};

export type GeometricInputs = {
  eye: EyeSide;
  /** Déplacement horizontal, mm, positif vers le nasal. */
  displacementNasalMm: number;
  /** Déplacement vertical, mm, positif vers le bas de l’image. */
  displacementVerticalMm: number;
  radialMm: number;
  cornealRadiusMm: number;
  hvidMm: number;
};

export type LambdaComputation = {
  degrees: number;
  details: {
    deltaMm: number;
    cornealRadiusMm: number;
  };
};

/**
 * Point unique à remplacer lorsque la formule définitive sera fournie.
 *
 * Entrées disponibles : déplacement nasal (mm), composante verticale (mm),
 * déplacement radial (mm), rayon cornéen R (mm), HVID (mm), côté (OD/OS).
 */
export function computeAngleLambda(inputs: GeometricInputs): LambdaComputation {
  const { displacementNasalMm, cornealRadiusMm } = inputs;
  const degrees =
    (Math.atan(displacementNasalMm / cornealRadiusMm) * 180) / Math.PI;
  return {
    degrees,
    details: {
      deltaMm: displacementNasalMm,
      cornealRadiusMm,
    },
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
      displacementNasalMm: number;
      displacementVerticalMm: number;
      radialMm: number;
      laterality: "nasal" | "temporal" | "centred";
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

export function missingLandmarks(landmarks: EyeLandmarks): LandmarkId[] {
  return LANDMARK_ORDER.filter((id) => landmarks[id] == null);
}

/**
 * Convention d’image : patient de face, photo non mirroir.
 * OD : le nasal est à droite de l’image (+x).
 * OS : le nasal est à gauche de l’image (−x).
 */
export function nasalDirectionX(eye: EyeSide): 1 | -1 {
  return eye === "OD" ? 1 : -1;
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

  const temporal = landmarks.limbusTemporal!;
  const nasal = landmarks.limbusNasal!;
  const pupil = landmarks.pupilCenter!;
  const reflex = landmarks.cornealReflex!;

  if (params.hvidMm <= 0 || params.cornealRadiusMm <= 0) {
    return { status: "invalid", reason: "Paramètres d’échelle invalides." };
  }

  const limbusPx = distance(temporal, nasal);
  if (limbusPx < 8) {
    return {
      status: "invalid",
      reason:
        "Les points limbiques sont trop proches. Replacez le limbe temporal et le limbe nasal aux bords opposés de l’iris.",
    };
  }

  const pxPerMm = limbusPx / params.hvidMm;
  const dxPx = reflex.x - pupil.x;
  const dyPx = reflex.y - pupil.y;
  const displacementNasalMm = (dxPx / pxPerMm) * nasalDirectionX(eye);
  const displacementVerticalMm = dyPx / pxPerMm;
  const radialMm = Math.hypot(displacementNasalMm, displacementVerticalMm);

  const centredThresholdMm = 0.04;
  const laterality =
    Math.abs(displacementNasalMm) < centredThresholdMm
      ? "centred"
      : displacementNasalMm > 0
        ? "nasal"
        : "temporal";

  const computation = computeAngleLambda({
    eye,
    displacementNasalMm,
    displacementVerticalMm,
    radialMm,
    cornealRadiusMm: params.cornealRadiusMm,
    hvidMm: params.hvidMm,
  });

  const warnings: string[] = [];
  if (Math.abs(displacementVerticalMm) > 0.35) {
    warnings.push(
      "Décalage vertical marqué du reflet : vérifiez que le patient fixe bien la source lumineuse.",
    );
  }
  if (radialMm > 2.5) {
    warnings.push(
      "Déplacement du reflet inhabituellement grand. Contrôlez le marquage et l’occlusion monoculaire.",
    );
  }

  const rad = (computation.degrees * Math.PI) / 180;

  return {
    status: "ok",
    eye,
    pxPerMm,
    displacementNasalMm,
    displacementVerticalMm,
    radialMm,
    laterality,
    angleLambdaDeg: computation.degrees,
    angleLambdaAbsDeg: Math.abs(computation.degrees),
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
