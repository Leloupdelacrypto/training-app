# Training App (Next.js)

Application de suivi d'entraînement **mobile-first** en français, pensée pour un usage local (sans backend) :

- Programme intégré haltères + banc (5 jours)
- Mode séance guidée exercice par exercice
- Chrono de repos intégré
- Progression de charge intelligente selon intensité ressentie
- Sauvegarde locale (localStorage)
- Export/Import JSON + export CSV
- Base PWA installable (manifest + service worker)

## Analyse de l'existant

Le dépôt fourni ne contenait pas le prototype HTML annoncé (seulement un README minimal et un fichier Excel). Cette V1 recrée une base propre et maintenable en Next.js pour lancer l'application rapidement.

## Architecture proposée

- `app/` : shell Next.js (layout + page principale + styles globaux)
- `components/` : UI découplée (`GuidedSession`, `RestTimer`, `DataTools`, `PwaRegister`)
- `lib/` : logique métier pure et testable (`types`, `programme`, `progression`, `storage`, `export`)
- `public/` : fichiers PWA (`manifest.webmanifest`, `sw.js`, icônes)

## Lancer

```bash
npm install
npm run dev
```
