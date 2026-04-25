export type Intensite = "facile" | "ok" | "dur";

export interface Exercice {
  id: string;
  nom: string;
  series: number;
  repsCible: string;
  reposSec: number;
  chargeKg: number;
  notes?: string;
}

export interface JourProgramme {
  id: string;
  titre: string;
  focus: string;
  exercices: Exercice[];
}

export interface Programme {
  version: number;
  nom: string;
  jours: JourProgramme[];
}

export interface ResultatExercice {
  exerciceId: string;
  repsRealisees: string;
  intensite: Intensite;
  commentaire?: string;
}

export interface SessionEnregistree {
  id: string;
  jourId: string;
  dateISO: string;
  dureeSec: number;
  resultats: ResultatExercice[];
}

export interface DonneesApp {
  programme: Programme;
  historique: SessionEnregistree[];
  derniereMiseAJourISO: string;
}
