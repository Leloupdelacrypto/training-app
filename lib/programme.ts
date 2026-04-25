import { Programme } from "./types";

export const programmeInitial: Programme = {
  version: 1,
  nom: "Programme 5 jours - Haltères + Banc",
  jours: [
    {
      id: "j1",
      titre: "Jour 1 - Pectoraux / Triceps",
      focus: "Poussée horizontale",
      exercices: [
        { id: "j1e1", nom: "Développé couché haltères", series: 4, repsCible: "8-12", reposSec: 90, chargeKg: 20 },
        { id: "j1e2", nom: "Développé incliné haltères", series: 3, repsCible: "10-12", reposSec: 90, chargeKg: 16 },
        { id: "j1e3", nom: "Écartés haltères banc plat", series: 3, repsCible: "12-15", reposSec: 75, chargeKg: 10 },
        { id: "j1e4", nom: "Extensions triceps assis", series: 3, repsCible: "10-12", reposSec: 75, chargeKg: 12 }
      ]
    },
    {
      id: "j2",
      titre: "Jour 2 - Dos / Biceps",
      focus: "Tirage + bras",
      exercices: [
        { id: "j2e1", nom: "Rowing haltères unilatéral", series: 4, repsCible: "8-12", reposSec: 90, chargeKg: 22 },
        { id: "j2e2", nom: "Rowing poitrine sur banc incliné", series: 3, repsCible: "10-12", reposSec: 90, chargeKg: 16 },
        { id: "j2e3", nom: "Curl incliné haltères", series: 3, repsCible: "10-12", reposSec: 75, chargeKg: 10 },
        { id: "j2e4", nom: "Curl marteau alterné", series: 3, repsCible: "12-15", reposSec: 75, chargeKg: 12 }
      ]
    },
    {
      id: "j3",
      titre: "Jour 3 - Jambes",
      focus: "Quadriceps / Ischios / Fessiers",
      exercices: [
        { id: "j3e1", nom: "Goblet squat", series: 4, repsCible: "10-15", reposSec: 90, chargeKg: 24 },
        { id: "j3e2", nom: "Fentes bulgares haltères", series: 3, repsCible: "10-12 / jambe", reposSec: 90, chargeKg: 14 },
        { id: "j3e3", nom: "Soulevé de terre roumain haltères", series: 4, repsCible: "8-12", reposSec: 90, chargeKg: 22 },
        { id: "j3e4", nom: "Hip thrust haltère sur banc", series: 3, repsCible: "12-15", reposSec: 75, chargeKg: 26 }
      ]
    },
    {
      id: "j4",
      titre: "Jour 4 - Épaules / Core",
      focus: "Stabilité + poussée verticale",
      exercices: [
        { id: "j4e1", nom: "Développé militaire haltères assis", series: 4, repsCible: "8-12", reposSec: 90, chargeKg: 14 },
        { id: "j4e2", nom: "Élévations latérales", series: 3, repsCible: "12-15", reposSec: 60, chargeKg: 8 },
        { id: "j4e3", nom: "Oiseau buste penché", series: 3, repsCible: "12-15", reposSec: 60, chargeKg: 8 },
        { id: "j4e4", nom: "Crunch haltère sur banc", series: 3, repsCible: "15-20", reposSec: 45, chargeKg: 8 }
      ]
    },
    {
      id: "j5",
      titre: "Jour 5 - Full body & rappel",
      focus: "Densité + points faibles",
      exercices: [
        { id: "j5e1", nom: "Thruster haltères", series: 3, repsCible: "10-12", reposSec: 90, chargeKg: 12 },
        { id: "j5e2", nom: "Rowing menton haltères", series: 3, repsCible: "10-12", reposSec: 75, chargeKg: 12 },
        { id: "j5e3", nom: "Développé couché prise neutre", series: 3, repsCible: "8-12", reposSec: 90, chargeKg: 18 },
        { id: "j5e4", nom: "Farmer walk sur place", series: 4, repsCible: "45 sec", reposSec: 60, chargeKg: 20 }
      ]
    }
  ]
};
