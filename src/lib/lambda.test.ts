import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PARAMS,
  LAMBDA_GAIN,
  LAMBDA_OFFSET,
  PUPIL_APPARENT_FACTOR,
  REFERENCE_DAC_MM,
  REFERENCE_WTW_MM,
  computeAngleLambda,
  distanceToEllipse,
  extractKappaViewPixels,
  ghostHandles,
  limbusEllipse,
  limbusEllipseHandles,
  measureEye,
  nearestEllipseHandle,
  applyLandmarkConstraints,
  resolveScale,
  translateCornea,
  withAlignedLimbus,
} from "./lambda.ts";

test("KappaView : λ, Ø pupillaire et correctopie identiques au script Python", () => {
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
  const correctopie = (400 / 2 - (150 / 2 + 125)) * (11.71 / 400);
  const expectedAngle =
    ((Math.atan((diam / 2 - ratio * diam) / 3.4) * 180) / Math.PI) * LAMBDA_GAIN +
    LAMBDA_OFFSET;

  assert.equal(result.ratioLambda, ratio);
  assert.equal(result.pupilDiameterMm.toFixed(6), diam.toFixed(6));
  assert.equal(result.correctopieMm.toFixed(6), correctopie.toFixed(6));
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

test("Purkinje au centre géométrique : ratio λ = 0,5 et correctopie nulle si pupille centrée", () => {
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
  assert.equal(measurement.correctopieMm.toFixed(4), "0.0000");
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
});

test("poignées cardinales de l’ellipse du limbe", () => {
  const landmarks = {
    limbusNasal: { x: 300, y: 200 },
    limbusTemporal: { x: 100, y: 200 },
  };
  const handles = limbusEllipseHandles(landmarks);
  assert.equal(handles.length, 4);
  assert.equal(nearestEllipseHandle({ x: 200, y: 80 }, landmarks), "limbusSuperior");
  assert.equal(nearestEllipseHandle({ x: 200, y: 320 }, landmarks), "limbusInferior");
  assert.equal(nearestEllipseHandle({ x: 320, y: 200 }, landmarks), "limbusNasal");
  assert.equal(nearestEllipseHandle({ x: 80, y: 200 }, landmarks), "limbusTemporal");
  assert.equal(nearestEllipseHandle({ x: 200, y: 200 }, landmarks, 10), null);

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
