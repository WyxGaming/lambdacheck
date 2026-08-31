"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Eraser,
  ImagePlus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { PhotoAnnotator } from "@/components/photo-annotator";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PARAMS,
  FIRST_LANDMARK,
  LANDMARK_META,
  LANDMARK_ORDER,
  type EyeLandmarks,
  type EyeMeasurement,
  type EyeSide,
  type FormulaParams,
  type LandmarkId,
  type Laterality,
  eyeLabel,
  formatDeg,
  formatMm,
  lateralityLabel,
  elevationLaterality,
  measureEye,
  nextLandmark,
  obliqueLateralityLabel,
  physiologicalLabel,
  REFERENCE_DAC_MM,
  REFERENCE_WTW_MM,
  resolveScale,
} from "@/lib/lambda";
import { createSyntheticEye } from "@/lib/synthetic-eye";
import { cn } from "@/lib/utils";

type EyeDraft = {
  imageUrl: string | null;
  fileName: string | null;
  landmarks: EyeLandmarks;
  isDemo: boolean;
  demoTruth: EyeLandmarks | null;
};

const emptyEye = (): EyeDraft => ({
  imageUrl: null,
  fileName: null,
  landmarks: {},
  isDemo: false,
  demoTruth: null,
});

export function ExamWorkspace() {
  const [patientRef, setPatientRef] = useState("");
  const [params, setParams] = useState<FormulaParams>(DEFAULT_PARAMS);
  const [od, setOd] = useState<EyeDraft>(emptyEye);
  const [os, setOs] = useState<EyeDraft>(emptyEye);
  const [activeEye, setActiveEye] = useState<EyeSide>("OD");
  const [activeLandmark, setActiveLandmark] = useState<LandmarkId>(FIRST_LANDMARK);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [demoError, setDemoError] = useState<string | null>(null);

  const odMeasure = useMemo(() => measureEye("OD", od.landmarks, params), [od.landmarks, params]);
  const osMeasure = useMemo(() => measureEye("OS", os.landmarks, params), [os.landmarks, params]);

  const setCurrent = activeEye === "OD" ? setOd : setOs;

  const handleFiles = async (fileList: FileList | null, eye: EyeSide) => {
    const file = fileList?.[0];
    if (!file) return;
    const url = await fileToObjectUrl(file);
    const setter = eye === "OD" ? setOd : setOs;
    setter((prev) => {
      if (prev.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.imageUrl);
      }
      return {
        imageUrl: url,
        fileName: file.name,
        landmarks: {},
        isDemo: false,
        demoTruth: null,
      };
    });
    setActiveEye(eye);
    setActiveLandmark(FIRST_LANDMARK);
  };

  const loadDemo = (eye: EyeSide) => {
    setDemoError(null);
    try {
      const synthetic = createSyntheticEye(eye, params);
      const setter = eye === "OD" ? setOd : setOs;
      setter((prev) => {
        if (prev.imageUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(prev.imageUrl);
        }
        return {
          imageUrl: synthetic.imageUrl,
          fileName: `exemple-${eye.toLowerCase()}.jpg`,
          landmarks: {},
          isDemo: true,
          demoTruth: synthetic.landmarks,
        };
      });
      setActiveEye(eye);
      setActiveLandmark(FIRST_LANDMARK);
    } catch (error) {
      setDemoError(
        error instanceof Error
          ? error.message
          : "Impossible de générer l’exemple pédagogique.",
      );
    }
  };

  const resetLandmarks = () => {
    setCurrent((prev) => ({ ...prev, landmarks: {} }));
    setActiveLandmark(FIRST_LANDMARK);
  };

  const resetEye = () => {
    setCurrent((prev) => {
      if (prev.imageUrl && prev.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.imageUrl);
      }
      return emptyEye();
    });
    setActiveLandmark(FIRST_LANDMARK);
  };

  const handleLandmarksChange = (landmarks: EyeLandmarks) => {
    setCurrent((prev) => ({ ...prev, landmarks }));
  };

  const copyReport = async () => {
    const text = buildReport(patientRef, params, odMeasure, osMeasure);
    await navigator.clipboard.writeText(text);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <section id="mesure" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Mesure
          </p>
          <h2 className="font-heading mt-1 text-3xl tracking-tight">
            Nouvelle mesure
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Importez ou déposez une photo par œil. Posez LN et LT, puis
            LS et LI par deux clics (même axe vertical, hauteurs
            indépendantes). λh et λv sont pris depuis le centre du
            segment PN–PT.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyReport}>
            {copyState === "copied" ? <Check /> : <Copy />}
            {copyState === "copied" ? "Copié" : "Copier le compte-rendu"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Photographies monoculaires</CardTitle>
                <CardDescription>
                Cliquez pour poser le curseur actif. LN puis LT (même
                hauteur), LS puis LI (même axe vertical, hauteurs
                indépendantes). L’ellipse se cale sur ces quatre points.
                PN et PT se posent ensuite un par un, puis P1.
                </CardDescription>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Référence patient</span>
                <Input
                  value={patientRef}
                  onChange={(event) => setPatientRef(event.target.value)}
                  placeholder="Initiales ou n° dossier"
                  className="w-full sm:w-52"
                />
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Tabs
              value={activeEye}
              onValueChange={(value) => {
                if (value !== "OD" && value !== "OS") return;
                setActiveEye(value);
                const draft = value === "OD" ? od : os;
                setActiveLandmark(nextLandmark(draft.landmarks));
              }}
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="OD" className="px-4">
                  Œil droit · OD
                  {odMeasure.status === "ok" && (
                    <span className="ml-1.5 size-1.5 rounded-full bg-teal-600" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="OS" className="px-4">
                  Œil gauche · OS
                  {osMeasure.status === "ok" && (
                    <span className="ml-1.5 size-1.5 rounded-full bg-teal-600" />
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleFiles(event.dataTransfer.files, activeEye);
              }}
              className="space-y-4"
            >
              <EyeToolbar
                eye={activeEye}
                draft={activeEye === "OD" ? od : os}
                onFiles={(files) => void handleFiles(files, activeEye)}
                onDemo={() => loadDemo(activeEye)}
                onResetPoints={resetLandmarks}
                onResetEye={resetEye}
              />
              {demoError && (
                <p className="text-sm text-destructive">{demoError}</p>
              )}
              <LandmarkPicker
                landmarks={
                  activeEye === "OD" ? od.landmarks : os.landmarks
                }
                active={activeLandmark}
                onChange={setActiveLandmark}
              />
              <PhotoAnnotator
                eye={activeEye}
                imageUrl={activeEye === "OD" ? od.imageUrl : os.imageUrl}
                landmarks={
                  activeEye === "OD" ? od.landmarks : os.landmarks
                }
                activeLandmark={activeLandmark}
                onLandmarksChange={handleLandmarksChange}
                onActiveLandmarkChange={setActiveLandmark}
              />
              {(activeEye === "OD" ? od : os).demoTruth && (
                <DemoHint
                  eye={activeEye}
                  params={params}
                  truth={(activeEye === "OD" ? od : os).demoTruth!}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ResultsCard
            patientRef={patientRef}
            od={odMeasure}
            os={osMeasure}
          />
          <ParamsCard params={params} onChange={setParams} />
        </div>
      </div>
    </section>
  );
}

function DemoHint({
  eye,
  params,
  truth,
}: {
  eye: EyeSide;
  params: FormulaParams;
  truth: EyeLandmarks;
}) {
  const expected = measureEye(eye, truth, params);
  if (expected.status !== "ok") return null;
  return (
    <p className="text-xs text-muted-foreground">
      Exemple pédagogique : si le marquage est exact, λh ≈{" "}
      {formatDeg(expected.angleLambdaDeg, true)} /{" "}
      {formatMm(expected.angleLambdaMm, true)} (
      {lateralityLabel(expected.laterality)})
      {expected.vertical
        ? ` · λv ≈ ${formatDeg(expected.vertical.angleLambdaDeg, true)} / ${formatMm(expected.vertical.angleLambdaMm, true)} (${lateralityLabel(expected.vertical.laterality)})`
        : ""}
      {expected.oblique
        ? ` · λoblique ≈ ${formatDeg(expected.oblique.angleLambdaDeg)} / ${formatMm(expected.oblique.angleLambdaMm)}`
        : ""}
      {expected.purkinjeElevationDeg != null
        ? ` · élévation P1 ≈ ${formatDeg(expected.purkinjeElevationDeg, true)}`
        : ""}
      .
    </p>
  );
}

function EyeToolbar({
  eye,
  draft,
  onFiles,
  onDemo,
  onResetPoints,
  onResetEye,
}: {
  eye: EyeSide;
  draft: EyeDraft;
  onFiles: (files: FileList | null) => void;
  onDemo: () => void;
  onResetPoints: () => void;
  onResetEye: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative inline-flex h-8 cursor-pointer">
        <span
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/85",
          )}
        >
          <ImagePlus className="size-4" />
          Importer {eye}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <button
        id="load-demo-eye"
        type="button"
        className={cn(buttonVariants({ variant: "outline" }))}
        onClick={onDemo}
      >
        <Sparkles />
        Exemple pédagogique
      </button>
      <Button type="button" variant="ghost" onClick={onResetPoints} disabled={!draft.imageUrl}>
        <Eraser />
        Effacer les points
      </Button>
      <Button type="button" variant="ghost" onClick={onResetEye} disabled={!draft.imageUrl}>
        <RotateCcw />
        Retirer la photo
      </Button>
      {draft.fileName && (
        <span className="truncate text-xs text-muted-foreground sm:ml-auto">
          {draft.fileName}
        </span>
      )}
    </div>
  );
}

function LandmarkPicker({
  landmarks,
  active,
  onChange,
}: {
  landmarks: EyeLandmarks;
  active: LandmarkId;
  onChange: (id: LandmarkId) => void;
}) {
  const groups: { title: string; ids: LandmarkId[] }[] = [
    {
      title: "Horizontal",
      ids: ["limbusNasal", "limbusTemporal"],
    },
    {
      title: "Vertical",
      ids: ["limbusSuperior", "limbusInferior"],
    },
    { title: "Pupille", ids: ["pupilNasal", "pupilTemporal"] },
    { title: "Reflet", ids: ["cornealReflex"] },
  ];
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {group.title}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {group.ids.map((id) => {
              const meta = LANDMARK_META[id];
              const index = LANDMARK_ORDER.indexOf(id);
              const placed = Boolean(landmarks[id]);
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: meta.color }}
                      />
                      {index + 1}. {meta.short}
                    </span>
                    {placed && <Check className="size-3.5 text-teal-700" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {meta.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsCard({
  patientRef,
  od,
  os,
}: {
  patientRef: string;
  od: EyeMeasurement;
  os: EyeMeasurement;
}) {
  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Angle lambda</CardTitle>
        <CardDescription>
          {patientRef ? `Patient ${patientRef} · ` : null}
          Un œil puis l’autre · λh et λv depuis le centre du segment
          PN–PT, λ oblique et élévation de P1.
          Physiologique : 0 à 3° en nasal, jusqu’à 0,60° ailleurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EyeResult eye="OD" measurement={od} />
        <Separator />
        <EyeResult eye="OS" measurement={os} />
      </CardContent>
    </Card>
  );
}

function EyeResult({
  eye,
  measurement,
}: {
  eye: EyeSide;
  measurement: EyeMeasurement;
}) {
  if (measurement.status === "empty") {
    return (
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyeLabel(eye)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">En attente d’une photographie.</p>
      </div>
    );
  }

  if (measurement.status === "incomplete") {
    return (
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyeLabel(eye)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Points manquants :{" "}
          {measurement.missing.map((id) => LANDMARK_META[id].label).join(", ")}.
        </p>
      </div>
    );
  }

  if (measurement.status === "invalid") {
    return (
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyeLabel(eye)}
        </p>
        <p className="mt-1 text-sm text-destructive">{measurement.reason}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {eyeLabel(eye)}
      </p>
      <div>
        <p className="text-[11px] text-muted-foreground">λ horizontal</p>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-heading text-3xl tracking-tight tabular-nums">
              {formatDeg(measurement.angleLambdaDeg, true)}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatMm(measurement.angleLambdaMm, true)}
            </p>
          </div>
          <AxisStatus
            laterality={measurement.laterality}
            physiological={measurement.physiological}
          />
        </div>
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">λ vertical</p>
        {measurement.vertical ? (
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-heading text-3xl tracking-tight tabular-nums">
                {formatDeg(measurement.vertical.angleLambdaDeg, true)}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatMm(measurement.vertical.angleLambdaMm, true)}
              </p>
            </div>
            <AxisStatus
              laterality={measurement.vertical.laterality}
              physiological={measurement.vertical.physiological}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Posez LS et LI, puis PN, PT et P1. λv part du milieu de PN–PT.
          </p>
        )}
      </div>
      {measurement.oblique && measurement.vertical && (
        <div>
          <p className="text-[11px] text-muted-foreground">λ oblique</p>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-heading text-3xl tracking-tight tabular-nums">
                {formatDeg(measurement.oblique.angleLambdaDeg)}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatMm(measurement.oblique.angleLambdaMm)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary">
                {obliqueLateralityLabel(
                  measurement.laterality,
                  measurement.vertical.laterality,
                )}
              </Badge>
              <Badge
                variant={
                  measurement.oblique.physiological ? "secondary" : "destructive"
                }
              >
                {physiologicalLabel(measurement.oblique.physiological)}
              </Badge>
            </div>
          </div>
        </div>
      )}
      {measurement.purkinjeElevationDeg != null && (
        <div>
          <p className="text-[11px] text-muted-foreground">
            Élévation P1 · reflet / horizontale
          </p>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-heading text-3xl tracking-tight tabular-nums">
              {formatDeg(measurement.purkinjeElevationDeg, true)}
            </p>
            <Badge variant="secondary">
              {lateralityLabel(
                elevationLaterality(measurement.purkinjeElevationDeg),
              )}
            </Badge>
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt>DAC</dt>
          <dd className="text-foreground tabular-nums">
            {formatMm(measurement.dacMm)}
            {measurement.dacFromReference ? " (référence)" : " (saisie)"}
          </dd>
        </div>
        <div>
          <dt>WtW</dt>
          <dd className="text-foreground tabular-nums">
            {formatMm(measurement.wtwMm)}
            {measurement.wtwFromReference ? " (référence)" : " (saisie)"}
          </dd>
        </div>
        <div>
          <dt>Ø pupille H</dt>
          <dd className="text-foreground tabular-nums">
            {formatMm(measurement.pupilDiameterMm)}
          </dd>
        </div>
        <div>
          <dt>Ø pupille V</dt>
          <dd className="text-foreground tabular-nums">
            {measurement.vertical
              ? formatMm(measurement.vertical.pupilDiameterMm)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Pupil shift H</dt>
          <dd className="text-foreground tabular-nums">
            {formatMm(measurement.pupilShiftMm)}{" "}
            <span className="text-muted-foreground">
              ({lateralityLabel(measurement.pupilShiftLaterality)})
            </span>
          </dd>
        </div>
        <div>
          <dt>Pupil shift V</dt>
          <dd className="text-foreground tabular-nums">
            {measurement.vertical ? (
              <>
                {formatMm(measurement.vertical.pupilShiftMm)}{" "}
                <span className="text-muted-foreground">
                  ({lateralityLabel(measurement.vertical.pupilShiftLaterality)})
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      {measurement.warnings.map((warning) => (
        <p key={warning} className="text-xs text-amber-800">
          {warning}
        </p>
      ))}
    </div>
  );
}

function AxisStatus({
  laterality,
  physiological,
}: {
  laterality: Laterality;
  physiological: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant="secondary">{lateralityLabel(laterality)}</Badge>
      <Badge variant={physiological ? "secondary" : "destructive"}>
        {physiologicalLabel(physiological)}
      </Badge>
    </div>
  );
}

function ParamsCard({
  params,
  onChange,
}: {
  params: FormulaParams;
  onChange: (params: FormulaParams) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biométrie</CardTitle>
        <CardDescription>
          Saisissez le diamètre cornéen (WtW) et la profondeur de chambre
          antérieure (DAC) s’ils sont connus. Sinon les valeurs de référence
          sont utilisées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="wtw">WtW — diamètre cornéen (mm)</Label>
          <Input
            id="wtw"
            type="number"
            inputMode="decimal"
            min={9}
            max={14}
            step={0.01}
            placeholder={`${REFERENCE_WTW_MM.toLocaleString("fr-FR")} si inconnu`}
            value={params.wtwMm ?? ""}
            onChange={(event) =>
              onChange({
                ...params,
                wtwMm: parseOptionalMm(event.target.value),
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dac">DAC — profondeur de chambre antérieure (mm)</Label>
          <Input
            id="dac"
            type="number"
            inputMode="decimal"
            min={1.5}
            max={5.5}
            step={0.05}
            placeholder={`${REFERENCE_DAC_MM.toLocaleString("fr-FR")} si inconnue`}
            value={params.dacMm ?? ""}
            onChange={(event) =>
              onChange({
                ...params,
                dacMm: parseOptionalMm(event.target.value),
              })
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Champs vides : WtW = {REFERENCE_WTW_MM.toLocaleString("fr-FR")} mm, DAC ={" "}
          {REFERENCE_DAC_MM.toLocaleString("fr-FR")} mm. Sur la photo, le WtW
          correspond à la distance limbe nasal – limbe temporal.
        </p>
      </CardContent>
    </Card>
  );
}

function buildReport(
  patientRef: string,
  params: FormulaParams,
  od: EyeMeasurement,
  os: EyeMeasurement,
): string {
  const date = new Date().toLocaleString("fr-FR");
  const scale = resolveScale(params);
  const dacLabel = scale.dacFromReference
    ? `${formatMm(scale.dacMm)} (référence)`
    : `${formatMm(scale.dacMm)} (saisie)`;
  const wtwLabel = scale.wtwFromReference
    ? `${formatMm(scale.wtwMm)} (référence)`
    : `${formatMm(scale.wtwMm)} (saisie)`;
  const lines = [
    "LambdaCheck — angle lambda photographique",
    date,
    patientRef ? `Patient : ${patientRef}` : "Patient : non renseigné",
    `WtW ${wtwLabel} · DAC ${dacLabel}`,
    "",
    formatEyeLine("OD", od),
    formatEyeLine("OS", os),
  ];
  return lines.join("\n");
}

function formatEyeLine(eye: EyeSide, measurement: EyeMeasurement): string {
  if (measurement.status !== "ok") {
    return `${eye} : mesure incomplète`;
  }
  const horizontal = `${eye} : λh = ${formatDeg(measurement.angleLambdaDeg, true)} / ${formatMm(measurement.angleLambdaMm, true)} (${lateralityLabel(measurement.laterality)}, ${physiologicalLabel(measurement.physiological)}) · Øh = ${formatMm(measurement.pupilDiameterMm)} · pupil shift H = ${formatMm(measurement.pupilShiftMm)} (${lateralityLabel(measurement.pupilShiftLaterality)})`;
  if (!measurement.vertical || !measurement.oblique) {
    return `${horizontal} · λv : incomplet`;
  }
  return `${horizontal} · λv = ${formatDeg(measurement.vertical.angleLambdaDeg, true)} / ${formatMm(measurement.vertical.angleLambdaMm, true)} (${lateralityLabel(measurement.vertical.laterality)}, ${physiologicalLabel(measurement.vertical.physiological)}) · λoblique = ${formatDeg(measurement.oblique.angleLambdaDeg)} / ${formatMm(measurement.oblique.angleLambdaMm)} (${obliqueLateralityLabel(measurement.laterality, measurement.vertical.laterality)}, ${physiologicalLabel(measurement.oblique.physiological)}) · élévation P1 = ${measurement.purkinjeElevationDeg != null ? `${formatDeg(measurement.purkinjeElevationDeg, true)} (${lateralityLabel(elevationLaterality(measurement.purkinjeElevationDeg))})` : "—"} · Øv = ${formatMm(measurement.vertical.pupilDiameterMm)} · pupil shift V = ${formatMm(measurement.vertical.pupilShiftMm)} (${lateralityLabel(measurement.vertical.pupilShiftLaterality)})`;
}

function parseOptionalMm(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

async function fileToObjectUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        return URL.createObjectURL(file);
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) return URL.createObjectURL(file);
      return URL.createObjectURL(blob);
    } catch {
      return URL.createObjectURL(file);
    }
  }
  return URL.createObjectURL(file);
}
