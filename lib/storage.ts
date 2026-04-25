import { DonneesApp } from "./types";
import { programmeInitial } from "./programme";

const STORAGE_KEY = "training-app-v1";

export function getDonneesInitiales(): DonneesApp {
  return {
    programme: programmeInitial,
    historique: [],
    mesures: {},
    derniereMiseAJourISO: new Date().toISOString()
  };
}

export function chargerDonnees(): DonneesApp {
  if (typeof window === "undefined") {
    return getDonneesInitiales();
  }

  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    if (!brut) return getDonneesInitiales();
    const parsed = JSON.parse(brut) as Partial<DonneesApp>;
    return {
      ...getDonneesInitiales(),
      ...parsed,
      mesures: parsed.mesures ?? {}
    };
  } catch {
    return getDonneesInitiales();
  }
}

export function sauvegarderDonnees(data: DonneesApp): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, derniereMiseAJourISO: new Date().toISOString() })
  );
}
