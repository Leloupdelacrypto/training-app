import { DonneesApp, MesureEntry } from "./types";
import { programmeInitial } from "./programme";

const STORAGE_KEY = "training-app-v1";

export function getDonneesInitiales(): DonneesApp {
  return {
    programme: programmeInitial,
    historique: [],
    mesures: {},
    mesuresHistorique: [],
    derniereMiseAJourISO: new Date().toISOString()
  };
}

function normaliserMesuresHistorique(mesuresHistorique: MesureEntry[] | undefined, fallback: DonneesApp["mesures"]): MesureEntry[] {
  if (mesuresHistorique && mesuresHistorique.length > 0) {
    return mesuresHistorique.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  }

  if (fallback.dateISO || fallback.poidsKg || fallback.tourTailleCm) {
    return [{
      dateISO: fallback.dateISO ?? new Date().toISOString(),
      poidsKg: fallback.poidsKg,
      tourTailleCm: fallback.tourTailleCm
    }];
  }

  return [];
}

export function chargerDonnees(): DonneesApp {
  if (typeof window === "undefined") {
    return getDonneesInitiales();
  }

  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    if (!brut) return getDonneesInitiales();
    const parsed = JSON.parse(brut) as Partial<DonneesApp>;
    const base = getDonneesInitiales();
    const mesures = parsed.mesures ?? {};

    return {
      ...base,
      ...parsed,
      mesures,
      mesuresHistorique: normaliserMesuresHistorique(parsed.mesuresHistorique, mesures)
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
