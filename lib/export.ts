import { DonneesApp, SessionEnregistree } from "./types";

export function exporterJSON(data: DonneesApp): string {
  return JSON.stringify(data, null, 2);
}

function ligneSession(session: SessionEnregistree): string[] {
  return [session.id, session.jourId, session.dateISO, String(session.dureeSec), String(session.resultats.length)];
}

export function exporterCSV(data: DonneesApp): string {
  const entetes = ["session_id", "jour_id", "date", "duree_sec", "nb_resultats"];
  const lignes = data.historique.map((session) => ligneSession(session).join(","));
  return [entetes.join(","), ...lignes].join("\n");
}

export function importerDepuisJSON(content: string): DonneesApp {
  const parsed = JSON.parse(content) as DonneesApp;
  if (!parsed.programme || !Array.isArray(parsed.historique)) {
    throw new Error("Format JSON invalide");
  }
  return parsed;
}
