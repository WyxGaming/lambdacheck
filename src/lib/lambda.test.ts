import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PARAMS,
  LAMBDA_GAIN,
  LAMBDA_OFFSET,
  PHYSIOLOGICAL_NASAL_MAX_DEG,
  PHYSIOLOGICAL_OTHER_MAX_DEG,
  PUPIL_APPARENT_FACTOR,
  REFERENCE_DAC_MM,
  REFERENCE_WTW_MM,
  applyLandmarkConstraints,
  computeAngleLambda,
  derivedPupilCenter,
  distanceToEllipse,
  elevationFromHorizontal,
  extractKappaViewPixels,
  extractVerticalPixels,
  ghostHandles,
  isPhysiologicalAngle,
  limbusEllipse,
  limbusEllipseHandles,
  measureEye,
  nearestEllipseHandle,
  projectedAlong,
  purkinjeElevationDeg,
  resolveScale,
  translateCornea,
  withAlignedLimbus,
} from "./lambda.ts";

test("KappaView : λ, Ø pupillaire et pupil shift identiques au script Python", () => {
  const pixels = {
    corneeNltl: 400,
    pupilNptp: 150,
    nppi: 60,
    irisNasal: 125,
  };
  const result = computeAngleLambda(pixels, {
    wtwMm: REFERENCE_WTW_MM,
    dacMm: REFERENCE_DAC_MM,
  });

  const ratio = 60 / 150;
  const diam = ((11.71 * 150) / 400) * PUPIL_APPARENT_FACTOR;
  const pupilShift = (400 / 2 - (150 / 2 + 125)) * (11.71 / 400);
  const expectedAngle =
    ((Math.atan((diam / 2 - ratio * diam) / 3.4) * 180) / Math.PI) * LAMBDA_GAIN +
    LAMBDA_OFFSET;

  assert.equal(result.ratioLambda, ratio);
  assert.equal(result.pupilDiameterMm.toFixed(6), diam.toFixed(6));
  assert.equal(result.pupilShiftMm.toFixed(6), pupilShift.toFixed(6));
  assert.equal(result.angleLambdaDeg.toFixed(6), expectedAngle.toFixed(6));
});

test("OD : reflet nasal au centre pupillaire → λ positif", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 334, y: 200 },
      pupilTemporal: { x: 177, y: 200 },
      pupilNasal: { x: 257, y: 200 },
      cornealReflex: { x: 226, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.laterality, "nasal");
  assert.ok(measurement.angleLambdaDeg > 0);
  const expectedMm =
    measurement.dacMm *
    Math.tan((measurement.angleLambdaDeg * Math.PI) / 180);
  assert.equal(measurement.angleLambdaMm.toFixed(6), expectedMm.toFixed(6));
});

test("OS : reflet nasal au centre pupillaire → λ positif", () => {
  const measurement = measureEye(
    "OS",
    {
      limbusTemporal: { x: 334, y: 200 },
      limbusNasal: { x: 100, y: 200 },
      pupilTemporal: { x: 257, y: 200 },
      pupilNasal: { x: 177, y: 200 },
      cornealReflex: { x: 208, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.laterality, "nasal");
  assert.ok(measurement.angleLambdaDeg > 0);
});

test("Purkinje au centre géométrique : ratio λ = 0,5 et pupil shift nul si pupille centrée", () => {
  const landmarks = {
    limbusNasal: { x: 0, y: 100 },
    limbusTemporal: { x: 400, y: 100 },
    pupilNasal: { x: 125, y: 100 },
    pupilTemporal: { x: 275, y: 100 },
    cornealReflex: { x: 200, y: 100 },
  };
  const pixels = extractKappaViewPixels(landmarks);
  assert.ok(pixels);
  assert.equal(pixels!.corneeNltl, 400);
  assert.equal(pixels!.pupilNptp, 150);
  assert.equal(pixels!.nppi, 75);
  assert.equal(pixels!.irisNasal, 125);

  const measurement = measureEye("OD", landmarks, DEFAULT_PARAMS);
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.ratioLambda, 0.5);
  assert.equal(measurement.pupilShiftMm.toFixed(4), "0.0000");
  assert.equal(measurement.laterality, "centred");
  assert.equal(
    measurement.angleLambdaDeg.toFixed(4),
    LAMBDA_OFFSET.toFixed(4),
  );
});

test("mesure incomplète tant que le reflet manque", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 300, y: 200 },
      pupilTemporal: { x: 160, y: 200 },
      pupilNasal: { x: 240, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "incomplete");
  if (measurement.status !== "incomplete") return;
  assert.deepEqual(measurement.missing, ["cornealReflex"]);
});

test("WtW et DAC inconnus → valeurs de référence 11,71 mm et 3,4 mm", () => {
  const scale = resolveScale({ wtwMm: null, dacMm: null });
  assert.equal(scale.wtwMm, REFERENCE_WTW_MM);
  assert.equal(scale.dacMm, REFERENCE_DAC_MM);
  assert.equal(scale.wtwFromReference, true);
  assert.equal(scale.dacFromReference, true);
});

test("WtW et DAC saisis par le clinicien sont utilisés tels quels", () => {
  const scale = resolveScale({ wtwMm: 12, dacMm: 3.1 });
  assert.equal(scale.wtwMm, 12);
  assert.equal(scale.dacMm, 3.1);
  assert.equal(scale.wtwFromReference, false);
  assert.equal(scale.dacFromReference, false);
});

test("le second limbe se cale à la hauteur du premier", () => {
  const first = withAlignedLimbus({}, "limbusNasal", { x: 120, y: 200 }, "place");
  assert.deepEqual(first.limbusNasal, { x: 120, y: 200 });
  const both = withAlignedLimbus(
    first,
    "limbusTemporal",
    { x: 40, y: 310 },
    "place",
  );
  assert.equal(both.limbusNasal?.y, 200);
  assert.deepEqual(both.limbusTemporal, { x: 40, y: 200 });
});

test("déplacer un limbe aligne l’autre à la même hauteur", () => {
  const placed = {
    limbusNasal: { x: 120, y: 200 },
    limbusTemporal: { x: 40, y: 200 },
  };
  const dragged = withAlignedLimbus(
    placed,
    "limbusNasal",
    { x: 130, y: 250 },
    "drag",
  );
  assert.deepEqual(dragged.limbusNasal, { x: 130, y: 250 });
  assert.deepEqual(dragged.limbusTemporal, { x: 40, y: 250 });
});

test("λ vertical : reflet supérieur au centre pupillaire → λv positif", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 334, y: 200 },
      limbusSuperior: { x: 217, y: 83 },
      limbusInferior: { x: 217, y: 317 },
      pupilTemporal: { x: 177, y: 200 },
      pupilNasal: { x: 257, y: 200 },
      pupilSuperior: { x: 217, y: 160 },
      pupilInferior: { x: 217, y: 240 },
      cornealReflex: { x: 217, y: 185 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.ok(measurement.vertical);
  assert.equal(measurement.vertical!.laterality, "superior");
  assert.ok(measurement.vertical!.angleLambdaDeg > 0);
  const expectedVMm =
    measurement.dacMm *
    Math.tan((measurement.vertical!.angleLambdaDeg * Math.PI) / 180);
  assert.equal(
    measurement.vertical!.angleLambdaMm.toFixed(6),
    expectedVMm.toFixed(6),
  );
  assert.ok(measurement.oblique);
  assert.equal(
    measurement.oblique!.angleLambdaDeg.toFixed(6),
    Math.hypot(
      measurement.angleLambdaDeg,
      measurement.vertical!.angleLambdaDeg,
    ).toFixed(6),
  );
  assert.equal(
    measurement.oblique!.angleLambdaMm.toFixed(6),
    Math.hypot(
      measurement.angleLambdaMm,
      measurement.vertical!.angleLambdaMm,
    ).toFixed(6),
  );
  assert.ok(measurement.purkinjeElevationDeg != null);
  assert.equal(
    measurement.purkinjeElevationDeg!.toFixed(6),
    (90).toFixed(6),
  );
  assert.equal(
    measurement.oblique!.elevationDeg.toFixed(6),
    measurement.purkinjeElevationDeg!.toFixed(6),
  );
});

test("mesure horizontale possible avant d’avoir fini le vertical", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 334, y: 200 },
      pupilTemporal: { x: 177, y: 200 },
      pupilNasal: { x: 257, y: 200 },
      cornealReflex: { x: 226, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.laterality, "nasal");
  assert.equal(measurement.vertical, null);
  assert.equal(measurement.oblique, null);
});

test("poignées cardinales de l’ellipse du limbe", () => {
  const landmarks = {
    limbusNasal: { x: 300, y: 200 },
    limbusTemporal: { x: 100, y: 200 },
  };
  const handles = limbusEllipseHandles(landmarks);
  assert.equal(handles.length, 2);
  assert.equal(nearestEllipseHandle({ x: 320, y: 200 }, landmarks), "limbusNasal");
  assert.equal(nearestEllipseHandle({ x: 80, y: 200 }, landmarks), "limbusTemporal");
  assert.equal(nearestEllipseHandle({ x: 200, y: 80 }, landmarks, 10), null);

  const withVertical = {
    ...landmarks,
    limbusSuperior: { x: 200, y: 80 },
    limbusInferior: { x: 200, y: 320 },
  };
  assert.equal(limbusEllipseHandles(withVertical).length, 4);
  assert.equal(nearestEllipseHandle({ x: 200, y: 80 }, withVertical), "limbusSuperior");
  assert.equal(nearestEllipseHandle({ x: 200, y: 320 }, withVertical), "limbusInferior");

  const ellipse = limbusEllipse(landmarks);
  assert.ok(ellipse);
  const onRim = { x: ellipse.cx + ellipse.rx, y: ellipse.cy };
  assert.ok(distanceToEllipse(onRim, ellipse) < 0.5);
  assert.ok(distanceToEllipse({ x: ellipse.cx, y: ellipse.cy }, ellipse) > 50);
});

test("déplacer l’ellipse du limbe translate LN, LT, LS et LI", () => {
  const moved = translateCornea(
    {
      limbusNasal: { x: 300, y: 200 },
      limbusTemporal: { x: 100, y: 200 },
      limbusSuperior: { x: 200, y: 80 },
      limbusInferior: { x: 200, y: 320 },
      pupilNasal: { x: 250, y: 200 },
    },
    10,
    -5,
  );
  assert.deepEqual(moved.limbusNasal, { x: 310, y: 195 });
  assert.deepEqual(moved.limbusTemporal, { x: 110, y: 195 });
  assert.deepEqual(moved.limbusSuperior, { x: 210, y: 75 });
  assert.deepEqual(moved.limbusInferior, { x: 210, y: 315 });
  assert.deepEqual(moved.pupilNasal, { x: 250, y: 200 });
});

test("les bords pupillaires se posent librement, sans ellipse ni miroir", () => {
  const withHorizontal = {
    pupilNasal: { x: 250, y: 205 },
    pupilTemporal: { x: 150, y: 190 },
  };
  assert.equal(ghostHandles(withHorizontal).pupilSuperior, undefined);
  assert.equal(ghostHandles(withHorizontal).pupilInferior, undefined);

  const withSuperior = applyLandmarkConstraints(
    withHorizontal,
    "pupilSuperior",
    { x: 210, y: 140 },
    "place",
  );
  assert.deepEqual(withSuperior.pupilSuperior, { x: 210, y: 140 });
  assert.equal(withSuperior.pupilInferior, undefined);

  const both = applyLandmarkConstraints(
    withSuperior,
    "pupilInferior",
    { x: 185, y: 270 },
    "place",
  );
  assert.deepEqual(both.pupilInferior, { x: 185, y: 270 });
  assert.deepEqual(both.pupilSuperior, { x: 210, y: 140 });

  const dragged = applyLandmarkConstraints(
    both,
    "pupilSuperior",
    { x: 230, y: 120 },
    "drag",
  );
  assert.deepEqual(dragged.pupilSuperior, { x: 230, y: 120 });
  assert.deepEqual(dragged.pupilInferior, { x: 185, y: 270 });
});

test("λ nasal est physiologique de 0° à 3°, les autres directions jusqu’à 0,60°", () => {
  assert.equal(isPhysiologicalAngle("nasal", 0), true);
  assert.equal(isPhysiologicalAngle("nasal", 2.5), true);
  assert.equal(isPhysiologicalAngle("nasal", PHYSIOLOGICAL_NASAL_MAX_DEG), true);
  assert.equal(isPhysiologicalAngle("nasal", 3.01), false);
  assert.equal(isPhysiologicalAngle("centred", 0), true);
  assert.equal(isPhysiologicalAngle("temporal", 0.6), true);
  assert.equal(isPhysiologicalAngle("temporal", PHYSIOLOGICAL_OTHER_MAX_DEG), true);
  assert.equal(isPhysiologicalAngle("temporal", 0.61), false);
  assert.equal(isPhysiologicalAngle("superior", 0.5), true);
  assert.equal(isPhysiologicalAngle("inferior", 0.9), false);
});

test("l’élévation est l’angle de λ oblique par rapport à l’horizontale", () => {
  assert.equal(elevationFromHorizontal(3, 3).toFixed(6), (45).toFixed(6));
  assert.equal(elevationFromHorizontal(4, 0).toFixed(6), (0).toFixed(6));
  assert.equal(elevationFromHorizontal(0, 2).toFixed(6), (90).toFixed(6));
  assert.equal(elevationFromHorizontal(3, -3).toFixed(6), (-45).toFixed(6));
  assert.equal(elevationFromHorizontal(-2, 2).toFixed(6), (45).toFixed(6));
});

test("LS et LI se posent comme LN et LT, sans miroir vertical", () => {
  const withNt = {
    limbusNasal: { x: 300, y: 200 },
    limbusTemporal: { x: 100, y: 200 },
  };
  const first = applyLandmarkConstraints(
    withNt,
    "limbusSuperior",
    { x: 180, y: 70 },
    "place",
  );
  assert.deepEqual(first.limbusSuperior, { x: 200, y: 70 });
  assert.equal(first.limbusInferior, undefined);

  const placed = applyLandmarkConstraints(
    first,
    "limbusInferior",
    { x: 40, y: 400 },
    "place",
  );
  assert.deepEqual(placed.limbusSuperior, { x: 200, y: 70 });
  assert.deepEqual(placed.limbusInferior, { x: 200, y: 400 });

  const dragged = applyLandmarkConstraints(
    placed,
    "limbusSuperior",
    { x: 250, y: 40 },
    "drag",
  );
  assert.deepEqual(dragged.limbusSuperior, { x: 200, y: 40 });
  assert.deepEqual(dragged.limbusInferior, { x: 200, y: 400 });

  const ellipse = limbusEllipse(dragged);
  assert.ok(ellipse);
  assert.equal(ellipse.ryTop, 160);
  assert.equal(ellipse.ryBottom, 200);
});

test("l’élévation de P1 est l’angle photo depuis le centre pupillaire", () => {
  assert.equal(
    purkinjeElevationDeg({ x: 100, y: 100 }, { x: 130, y: 100 }).toFixed(6),
    (0).toFixed(6),
  );
  assert.equal(
    purkinjeElevationDeg({ x: 100, y: 100 }, { x: 100, y: 70 }).toFixed(6),
    (90).toFixed(6),
  );
  assert.equal(
    purkinjeElevationDeg({ x: 100, y: 100 }, { x: 130, y: 130 }).toFixed(6),
    (-45).toFixed(6),
  );
});

test("λ vertical projette P1 sur l’axe pupillaire PS–PI, pas sur la cornée", () => {
  const landmarks = {
    limbusTemporal: { x: 100, y: 200 },
    limbusNasal: { x: 334, y: 200 },
    limbusSuperior: { x: 217, y: 83 },
    limbusInferior: { x: 217, y: 317 },
    pupilTemporal: { x: 177, y: 200 },
    pupilNasal: { x: 257, y: 200 },
    pupilSuperior: { x: 200, y: 150 },
    pupilInferior: { x: 234, y: 250 },
    cornealReflex: { x: 217, y: 180 },
  };
  const alongPupil = extractVerticalPixels(landmarks);
  assert.ok(alongPupil);
  const alongCornea = {
    ...alongPupil!,
    nppi: projectedAlong(
      landmarks.pupilSuperior,
      landmarks.cornealReflex,
      landmarks.limbusSuperior,
      landmarks.limbusInferior,
    ),
    pupilNptp: projectedAlong(
      landmarks.pupilSuperior,
      landmarks.pupilInferior,
      landmarks.limbusSuperior,
      landmarks.limbusInferior,
    ),
  };
  assert.notEqual(alongPupil!.nppi.toFixed(6), alongCornea.nppi.toFixed(6));

  const measurement = measureEye("OD", landmarks, DEFAULT_PARAMS);
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.ok(measurement.vertical);
  const expected = computeAngleLambda(alongPupil!, {
    wtwMm: REFERENCE_WTW_MM,
    dacMm: REFERENCE_DAC_MM,
  });
  assert.equal(
    measurement.vertical!.angleLambdaDeg.toFixed(6),
    expected.angleLambdaDeg.toFixed(6),
  );
});

test("λh et λv sont pris depuis l’intersection PN–PT / PS–PI, pas le milieu des cordes", () => {
  const landmarks = {
    limbusTemporal: { x: 100, y: 200 },
    limbusNasal: { x: 340, y: 200 },
    limbusSuperior: { x: 180, y: 60 },
    limbusInferior: { x: 180, y: 340 },
    pupilTemporal: { x: 140, y: 200 },
    pupilNasal: { x: 300, y: 200 },
    pupilSuperior: { x: 180, y: 100 },
    pupilInferior: { x: 180, y: 260 },
    cornealReflex: { x: 180, y: 200 },
  };
  const center = derivedPupilCenter(landmarks);
  assert.ok(center);
  assert.equal(center!.x.toFixed(3), "180.000");
  assert.equal(center!.y.toFixed(3), "200.000");

  const atCenter = measureEye("OD", landmarks, DEFAULT_PARAMS);
  assert.equal(atCenter.status, "ok");
  if (atCenter.status !== "ok") return;
  assert.equal(atCenter.laterality, "centred");
  assert.ok(atCenter.vertical);
  assert.equal(atCenter.vertical!.laterality, "centred");

  const atHorizontalMid = measureEye(
    "OD",
    { ...landmarks, cornealReflex: { x: 220, y: 200 } },
    DEFAULT_PARAMS,
  );
  assert.equal(atHorizontalMid.status, "ok");
  if (atHorizontalMid.status !== "ok") return;
  assert.equal(atHorizontalMid.laterality, "nasal");
  assert.ok(atHorizontalMid.angleLambdaDeg > 0);
  assert.equal(atHorizontalMid.vertical!.laterality, "centred");

  const atVerticalMid = measureEye(
    "OD",
    { ...landmarks, cornealReflex: { x: 180, y: 180 } },
    DEFAULT_PARAMS,
  );
  assert.equal(atVerticalMid.status, "ok");
  if (atVerticalMid.status !== "ok") return;
  assert.equal(atVerticalMid.laterality, "centred");
  assert.equal(atVerticalMid.vertical!.laterality, "superior");
  assert.ok(atVerticalMid.vertical!.angleLambdaDeg > 0);
});
