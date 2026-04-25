import { Exercice, Intensite, ResultatExercice } from "./types";

export interface ObjectifProgression {
  chargeCibleKg: number;
  repsCible: string;
  recommandation: string;
  stagnationDetectee: boolean;
}

function extraireValeursNumeriques(texte: string): number[] {
  return (texte.match(/\d+/g) ?? []).map((v) => Number(v)).filter((v) => !Number.isNaN(v));
}

function moyenne(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function estMouvementGainage(exercice: Exercice): boolean {
  const nom = exercice.nom.toLowerCase();
  return nom.includes("gainage") || nom.includes("farmer") || exercice.repsCible.toLowerCase().includes("sec");
}

function estMouvementIsolation(exercice: Exercice): boolean {
  const nom = exercice.nom.toLowerCase();
  return ["élévations", "curl", "extension", "oiseau", "crunch", "écartés"].some((mot) => nom.includes(mot));
}

function incrementCharge(exercice: Exercice): number {
  if (estMouvementGainage(exercice)) return 0;
  if (estMouvementIsolation(exercice)) return 1;
  return 2;
}

function chargeMaxAtteinte(exercice: Exercice): boolean {
  if (estMouvementIsolation(exercice)) return exercice.chargeKg >= 18;
  if (estMouvementGainage(exercice)) return exercice.chargeKg >= 30;
  return exercice.chargeKg >= 34;
}

function parserRpe(resultat?: ResultatExercice): number {
  if (!resultat) return 8;
  const inComment = resultat.commentaire?.match(/rpe\s?(\d+)/i)?.[1];
  if (inComment) {
    const value = Number(inComment);
    if (!Number.isNaN(value)) return value;
  }

  if (resultat.intensite === "dur") return 10;
  if (resultat.intensite === "ok") return 8;
  return 7;
}

function meilleurRep(resultat?: ResultatExercice): number {
  if (!resultat) return 0;
  const numeros = extraireValeursNumeriques(resultat.repsRealisees);
  return numeros.length ? Math.max(...numeros) : 0;
}

export function recommanderObjectif(
  exercice: Exercice,
  dernierResultat?: ResultatExercice,
  avantDernierResultat?: ResultatExercice
): ObjectifProgression {
  const cibleRepsValeurs = extraireValeursNumeriques(exercice.repsCible);
  const repMin = cibleRepsValeurs[0] ?? 8;
  const repMax = cibleRepsValeurs[1] ?? cibleRepsValeurs[0] ?? repMin;
  const dernierRpe = parserRpe(dernierResultat);
  const repDerniere = meilleurRep(dernierResultat);
  const repAvant = meilleurRep(avantDernierResultat);
  const stagnation = repDerniere > 0 && repAvant > 0 && repDerniere <= repAvant;

  if (estMouvementGainage(exercice)) {
    const secondes = cibleRepsValeurs[0] ?? 30;
    const next = dernierRpe >= 10 ? secondes : secondes + 5;
    return {
      chargeCibleKg: exercice.chargeKg,
      repsCible: `${next}-${next + 5} sec`,
      recommandation: dernierRpe >= 10 ? "RPE 10 détecté: conserver la charge, stabiliser la respiration et la posture." : "Progression gainage: +5 sec recommandées (jusqu'à +10 si facile).",
      stagnationDetectee: stagnation
    };
  }

  if (chargeMaxAtteinte(exercice)) {
    return {
      chargeCibleKg: exercice.chargeKg,
      repsCible: `${repMax}-${repMax + 2}`,
      recommandation: "Charge maximale atteinte: privilégier plus de reps, un tempo contrôlé (3-1-1) ou une pause en bas.",
      stagnationDetectee: stagnation
    };
  }

  if (dernierRpe >= 10) {
    return {
      chargeCibleKg: exercice.chargeKg,
      repsCible: `${repMin}-${repMax}`,
      recommandation: "RPE 10 détecté: ne pas augmenter la charge à la prochaine séance.",
      stagnationDetectee: stagnation
    };
  }

  if (stagnation) {
    return {
      chargeCibleKg: exercice.chargeKg,
      repsCible: `${Math.max(repMin, repDerniere + 1)}-${Math.max(repMax, repDerniere + 2)}`,
      recommandation: "Stagnation sur 2 séances: conserver la charge et viser un gain net de reps.",
      stagnationDetectee: true
    };
  }

  const increment = incrementCharge(exercice);
  const baseReps = repDerniere > 0 ? repDerniere : repMin;
  return {
    chargeCibleKg: exercice.chargeKg + increment,
    repsCible: `${Math.max(repMin, Math.round(baseReps))}-${Math.max(repMax, Math.round(baseReps) + 2)}`,
    recommandation: increment === 1 ? "Isolation: progression lente +1 kg si exécution propre." : "Mouvement global: +2 kg recommandés si technique stable.",
    stagnationDetectee: false
  };
}

export function recommanderCharge(exercice: Exercice, resultat?: ResultatExercice): number {
  return recommanderObjectif(exercice, resultat).chargeCibleKg;
}

export function intensiteDepuisRpe(rpe: number): Intensite {
  if (rpe >= 9) return "dur";
  if (rpe <= 7) return "facile";
  return "ok";
}

export function moyenneRpe(resultat?: ResultatExercice): number {
  return parserRpe(resultat);
}

export function volumeEstime(exercice: Exercice, resultat: ResultatExercice): number {
  const reps = extraireValeursNumeriques(resultat.repsRealisees);
  return exercice.chargeKg * moyenne(reps);
}
