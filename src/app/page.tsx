import { ExamWorkspace } from "@/components/exam-workspace";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FORMULA } from "@/lib/lambda";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <div className="mx-auto w-full max-w-6xl space-y-20 px-4 py-16 sm:px-6">
          <Protocol />
          <ExamWorkspace />
          <FormulaSection />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-border bg-[radial-gradient(1200px_circle_at_10%_-10%,oklch(0.94_0.04_200),transparent_55%),radial-gradient(900px_circle_at_90%_0%,oklch(0.96_0.03_90),transparent_50%)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Orthoptie · Ophtalmologie
          </p>
          <h1 className="font-heading mt-4 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl">
            Mesurer l’angle lambda à partir des reflets cornéens.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            LambdaCOR convertit une paire de photographies monoculaires — un œil
            puis l’autre, reflet de Purkinje visible — en angle lambda pour
            chaque œil. Le marquage se fait sur la photo ; le calcul suit
            immédiatement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#mesure"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              Commencer une mesure
            </a>
            <a
              href="#protocole"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Voir le protocole photo
            </a>
          </div>
        </div>
        <aside className="rounded-2xl border border-border bg-card/90 p-6 shadow-sm">
          <p className="text-sm font-medium">Ce que l’outil attend</p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Deux photos</span> —
              OD et OS, vision monoculaire, patient de face.
            </li>
            <li>
              <span className="font-medium text-foreground">Quatre points par œil</span>{" "}
              — limbe temporal, limbe nasal, centre pupillaire, reflet cornéen.
            </li>
            <li>
              <span className="font-medium text-foreground">Un résultat signé</span>{" "}
              — λ en degrés, nasal ou temporal, plus l’équivalent en dioptries
              prismatiques.
            </li>
          </ul>
          <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Formule active : {FORMULA.expression} ({FORMULA.version}). Les
            clichés restent locaux.
          </p>
        </aside>
      </div>
    </section>
  );
}

function Protocol() {
  const steps = [
    {
      title: "Photographier en monoculaire",
      body: "Occluez l’œil controlatéral. Le patient fixe l’objectif ou le flash. Cadrez l’œil de près, limbe entier visible, sans miroir. JPEG ou PNG nets.",
    },
    {
      title: "Repérer le 1er Purkinje",
      body: "Le reflet cornéen doit être franc, idéalement proche de l’axe visuel. Répétez la prise si le glint est flou, hors cornée, ou si le regard a dévié.",
    },
    {
      title: "Marquer, puis lire λ",
      body: "Posez les deux bords du limbe (échelle), le centre pupillaire et le reflet. L’angle s’affiche pour OD et OS, avec le sens nasal ou temporal.",
    },
  ];

  return (
    <section id="protocole" className="scroll-mt-24">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
        Protocole
      </p>
      <h2 className="font-heading mt-1 text-3xl tracking-tight">
        Photos exploitables du premier coup
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-xs font-medium text-primary">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="font-heading mt-2 text-xl tracking-tight">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FormulaSection() {
  return (
    <section id="formule" className="scroll-mt-24">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
        Calcul
      </p>
      <h2 className="font-heading mt-1 text-3xl tracking-tight">
        Formule en attente de votre relation clinique
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Expression actuelle</p>
          <p className="font-heading mt-2 text-3xl tracking-tight">
            {FORMULA.expression}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {FORMULA.notes}
          </p>
          <dl className="mt-6 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">δ</dt>
              <dd>
                Distance horizontale reflet → centre pupillaire, convertie en mm
                grâce au HVID, positive vers le nasal.
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Convention d’image</dt>
              <dd>
                Patient de face, photo non retournée. Pour l’OD le nasal est à
                droite ; pour l’OS le nasal est à gauche.
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6">
          <p className="text-sm font-medium">Quand la formule arrivera</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le marquage, l’échelle et le compte-rendu restent en place. Seule la
            fonction <code className="rounded bg-background px-1 py-0.5 text-foreground">computeAngleLambda</code>{" "}
            dans <code className="rounded bg-background px-1 py-0.5 text-foreground">src/lib/lambda.ts</code>{" "}
            sera remplacée. Les grandeurs déjà mesurées (δ nasal, composante
            verticale, déplacement radial, R, HVID, côté) sont prêtes à
            l’emploi.
          </p>
        </div>
      </div>
    </section>
  );
}
