import { ExamWorkspace } from "@/components/exam-workspace";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <div className="mx-auto w-full max-w-6xl space-y-20 px-4 py-16 sm:px-6">
          <Protocol />
          <ExamWorkspace />
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
              <span className="font-medium text-foreground">Cinq curseurs par œil</span>{" "}
              — limbe nasal, limbe temporal, bord pupillaire nasal, bord
              pupillaire temporal, reflet de Purkinje.
            </li>
            <li>
              <span className="font-medium text-foreground">Un résultat</span>{" "}
              — λ, diamètre pupillaire et correctopie (excentration pupillaire).
            </li>
          </ul>
          <p className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Les photographies restent dans le navigateur. Aucun envoi vers un
            serveur.
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
      body: "Posez limbe nasal et temporal, les deux bords pupillaires, puis le reflet de Purkinje. Indiquez le WtW et la DAC s’ils sont connus ; sinon 11,71 mm et 3,4 mm.",
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
