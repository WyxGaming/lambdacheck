# LambdaCOR

Outil web pour **orthoptistes** et **ophtalmologistes** : calcul de l’**angle lambda** de chaque œil à partir de photographies **monoculaires** avec **reflets cornéens** (premier Purkinje).

Les photos restent dans le navigateur. Rien n’est envoyé à un serveur.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez [http://127.0.0.1:43127](http://127.0.0.1:43127).

```bash
npm test    # vérifie la géométrie et la formule provisoire
npm run build
```

## Mesure

1. Photographiez chaque œil en vision monoculaire (œil controlatéral occlus), patient de face, regard sur l’objectif, limbe entier visible, reflet net.
2. Importez OD puis OS, ou chargez l’exemple pédagogique.
3. Placez quatre points : limbe temporal, limbe nasal, centre pupillaire, reflet cornéen.
4. Lisez λ (degrés, nasal ou temporal) et copiez le compte-rendu.

L’échelle utilise le diamètre irien horizontal (HVID, 11,7 mm par défaut). Le rayon de courbure cornéen R (7,80 mm par défaut) entre dans la formule actuelle.

## Formule

La relation clinique définitive n’est pas encore branchée. En attendant :

```
λ = arctan(δ / R)
```

- `δ` : déplacement horizontal du reflet par rapport au centre pupillaire, en mm, **positif vers le nasal**
- `R` : rayon de courbure cornéen antérieur, en mm

Pour la remplacer, modifier uniquement `computeAngleLambda` dans `src/lib/lambda.ts`. Les grandeurs déjà mesurées (δ nasal, composante verticale, déplacement radial, R, HVID, côté OD/OS) sont passées en entrée.

Convention d’image : patient de face, photo non retournée. Nasal à droite pour l’OD, à gauche pour l’OS.

## Pile

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Tout le traitement d’image est côté client.
