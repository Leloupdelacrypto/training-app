import { DonneesApp, ResultatExercice, SessionEnregistree } from "./types";

export type CoachBadge = "Progression" | "Fatigue" | "Volume" | "Mesures" | "Priorité haute";

export interface CoachInsight {
  id: string;
  titre: string;
  conseil: string;
  badges: CoachBadge[];
}

interface SessionScore {
  session: SessionEnregistree;
  performance: number;
  intensiteDure: number;
  volume: number;
}

function moyenne(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function extraireReps(resultat: ResultatExercice): number[] {
  return (resultat.repsRealisees.match(/\d+/g) ?? []).map(Number).filter((v) => !Number.isNaN(v));
}

function intensiteScore(resultat: ResultatExercice): number {
  if (resultat.intensite === "dur") return 1.08;
  if (resultat.intensite === "facile") return 0.96;
  return 1;
}

function scoreSession(session: SessionEnregistree): SessionScore {
  const performance = session.resultats.reduce((acc, resultat) => {
    const reps = extraireReps(resultat);
    const repsMoy = reps.length > 0 ? moyenne(reps) : 0;
    return acc + repsMoy * intensiteScore(resultat);
  }, 0);

  const intensiteDure = session.resultats.filter((r) => r.intensite === "dur").length / Math.max(1, session.resultats.length);

  return {
    session,
    performance,
    intensiteDure,
    volume: session.resultats.length
  };
}

function trierParDate<T extends { dateISO: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

function pctDelta(base: number, next: number): number {
  if (base <= 0) return 0;
  return ((next - base) / base) * 100;
}

export function analyserCoachLocal(data: DonneesApp, nowDate = new Date()): CoachInsight[] {
  const minDate = new Date(nowDate);
  minDate.setDate(nowDate.getDate() - 14);

  const recentes = data.historique
    .filter((session) => new Date(session.dateISO) >= minDate)
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  const recentScores = recentes.map(scoreSession);

  const insights: CoachInsight[] = [];

  if (recentes.length === 0) {
    return [{
      id: "coach-demarrage",
      titre: "Démarrage du coach local",
      conseil: "Enregistre 2 séances cette semaine pour débloquer l'analyse des 14 derniers jours.",
      badges: ["Priorité haute"]
    }];
  }

  const splitIndex = Math.max(1, Math.floor(recentScores.length / 2));
  const periodeA = recentScores.slice(0, splitIndex);
  const periodeB = recentScores.slice(splitIndex);
  const perfA = moyenne(periodeA.map((s) => s.performance));
  const perfB = moyenne(periodeB.map((s) => s.performance));
  const perfDelta = pctDelta(perfA, perfB);

  if (perfDelta >= 8) {
    insights.push({
      id: "progression",
      titre: "Progression nette observée",
      conseil: "Garde la même structure et ajoute +1 rep sur 1 exercice clé au prochain entraînement.",
      badges: ["Progression"]
    });
  }

  if (recentScores.length >= 3 && Math.abs(perfDelta) < 4) {
    insights.push({
      id: "stagnation",
      titre: "Stagnation détectée",
      conseil: "Conserve la charge, rallonge le repos de 30 s et vise une exécution plus lente pendant 7 jours.",
      badges: ["Progression", "Priorité haute"]
    });
  }

  const tauxIntense = moyenne(recentScores.map((s) => s.intensiteDure));
  const densite = recentes.length;
  if (tauxIntense >= 0.45 && densite >= 4) {
    insights.push({
      id: "fatigue",
      titre: "Signaux de fatigue",
      conseil: "Planifie une séance allégée (RPE 7-8) et dors 30-45 min de plus les 2 prochaines nuits.",
      badges: ["Fatigue", "Priorité haute"]
    });
  }

  const volumeA = moyenne(periodeA.map((s) => s.volume));
  const volumeB = moyenne(periodeB.map((s) => s.volume));
  if (pctDelta(volumeA, volumeB) >= 25) {
    insights.push({
      id: "volume-eleve",
      titre: "Volume élevé récent",
      conseil: "Maintiens ce volume 1 semaine max puis prévois une semaine de deload (-20%).",
      badges: ["Volume"]
    });
  }

  if (perfDelta <= -8) {
    insights.push({
      id: "baisse-performance",
      titre: "Baisse de performance",
      conseil: "Réduis la charge de 5% sur les mouvements principaux et priorise la technique pendant 3 séances.",
      badges: ["Fatigue", "Priorité haute"]
    });
  }

  const mesures14 = trierParDate(data.mesuresHistorique.filter((m) => new Date(m.dateISO) >= minDate));
  if (mesures14.length >= 2) {
    const first = mesures14[0];
    const last = mesures14[mesures14.length - 1];
    const deltaPoids = (last.poidsKg ?? 0) - (first.poidsKg ?? 0);
    const deltaTaille = (last.tourTailleCm ?? 0) - (first.tourTailleCm ?? 0);

    if (last.poidsKg !== undefined && first.poidsKg !== undefined) {
      const axe = deltaPoids > 0.6 ? "Poids en hausse rapide" : deltaPoids < -0.6 ? "Poids en baisse rapide" : "Poids stable";
      const action = deltaPoids > 0.6
        ? "Limite les collations liquides et ajoute 15 min de marche post-repas."
        : deltaPoids < -0.6
          ? "Ajoute une portion protéinée au dîner pour sécuriser la récupération."
          : "Continue le rythme actuel, ta tendance est régulière.";

      insights.push({
        id: "mesure-poids",
        titre: axe,
        conseil: action,
        badges: ["Mesures"]
      });
    }

    if (last.tourTailleCm !== undefined && first.tourTailleCm !== undefined && Math.abs(deltaTaille) >= 1) {
      insights.push({
        id: "mesure-taille",
        titre: deltaTaille < 0 ? "Tour de taille en baisse" : "Tour de taille en hausse",
        conseil: deltaTaille < 0
          ? "Très bon signal: conserve l'apport protéines + hydratation."
          : "Réduis les aliments ultra-transformés le soir pendant 1 semaine.",
        badges: ["Mesures"]
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "coach-ras",
      titre: "Rythme bien maîtrisé",
      conseil: "Pas d'alerte forte: continue le plan et vise +1 rep propre sur un exercice d'ici la fin de semaine.",
      badges: ["Progression"]
    });
  }

  return insights.slice(0, 6);
}
