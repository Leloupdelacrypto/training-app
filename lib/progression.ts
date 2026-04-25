import { Exercice, Intensite, ResultatExercice } from "./types";

const progressionParIntensite: Record<Intensite, number> = {
  facile: 0.05,
  ok: 0.025,
  dur: 0
};

const decrementParIntensite: Record<Intensite, number> = {
  facile: 0,
  ok: 0,
  dur: -0.025
};

export function recommanderCharge(exercice: Exercice, resultat?: ResultatExercice): number {
  if (!resultat) return exercice.chargeKg;
  const facteur = progressionParIntensite[resultat.intensite] + decrementParIntensite[resultat.intensite];
  const charge = exercice.chargeKg * (1 + facteur);
  return Math.max(2, Math.round(charge * 2) / 2);
}
