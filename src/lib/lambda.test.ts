import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_PARAMS,
  computeAngleLambda,
  measureEye,
} from "./lambda.ts";

test("formule provisoire : arctan(δ / R) en degrés", () => {
  const result = computeAngleLambda({
    eye: "OD",
    displacementNasalMm: 0.45,
    displacementVerticalMm: 0,
    radialMm: 0.45,
    cornealRadiusMm: 7.8,
    hvidMm: 11.7,
  });
  assert.equal(result.degrees.toFixed(3), ((Math.atan(0.45 / 7.8) * 180) / Math.PI).toFixed(3));
});

test("OD : reflet à droite du centre pupillaire = nasal positif", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 334, y: 200 },
      pupilCenter: { x: 217, y: 200 },
      cornealReflex: { x: 226, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.laterality, "nasal");
  assert.ok(measurement.angleLambdaDeg > 0);
});

test("OS : reflet à gauche du centre pupillaire = nasal positif", () => {
  const measurement = measureEye(
    "OS",
    {
      limbusTemporal: { x: 334, y: 200 },
      limbusNasal: { x: 100, y: 200 },
      pupilCenter: { x: 217, y: 200 },
      cornealReflex: { x: 208, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "ok");
  if (measurement.status !== "ok") return;
  assert.equal(measurement.laterality, "nasal");
  assert.ok(measurement.angleLambdaDeg > 0);
});

test("mesure incomplète tant que le reflet manque", () => {
  const measurement = measureEye(
    "OD",
    {
      limbusTemporal: { x: 100, y: 200 },
      limbusNasal: { x: 300, y: 200 },
      pupilCenter: { x: 200, y: 200 },
    },
    DEFAULT_PARAMS,
  );
  assert.equal(measurement.status, "incomplete");
  if (measurement.status !== "incomplete") return;
  assert.deepEqual(measurement.missing, ["cornealReflex"]);
});
