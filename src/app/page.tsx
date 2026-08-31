import { ExamWorkspace } from "@/components/exam-workspace";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          <Intro />
          <ExamWorkspace />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Intro() {
  return (
    <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Orthoptie · Ophtalmologie
        </p>
        <h1 className="font-heading mt-2 text-3xl tracking-tight sm:text-4xl">
          Angle lambda photographique
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ouvrez le site, importez une photo monoculaire, marquez LN, LT,
          LS, LI, puis PN, PT et P1. λh et λv partent du milieu de PN–PT.
          Les photos restent dans le navigateur. Aucun compte.
        </p>
      </div>
      <details
        id="protocole"
        className="w-full max-w-md rounded-2xl border border-border bg-card px-4 py-3 text-sm scroll-mt-24"
      >
        <summary className="cursor-pointer font-medium">
          Protocole photo (monoculaire)
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Occluez l’œil controlatéral. Patient de face, regard sur
            l’objectif, limbe entier, JPEG ou PNG net.
          </li>
          <li>
            Le premier reflet de Purkinje doit être franc, sur la cornée.
          </li>
          <li>
            Marquez limbe nasal et temporal, puis limbe supérieur et
            inférieur (deux clics, comme LN et LT). Posez PN et PT,
            puis le reflet. λh et λv partent du milieu de PN–PT. WtW
            et DAC si connus, sinon 11,71 mm et 3,4 mm.
          </li>
        </ol>
      </details>
    </section>
  );
}
