import { Exercice } from "@/lib/types";

export type MuscleGroup = "pecs" | "dos" | "epaules" | "biceps" | "triceps" | "jambes" | "abdos" | "full";

export interface MuscleMeta {
  id: MuscleGroup;
  label: string;
  short: string;
  accentClass: string;
  color: string;
}

const MUSCLE_META: Record<MuscleGroup, MuscleMeta> = {
  pecs: { id: "pecs", label: "Pectoraux", short: "PE", accentClass: "accent-pecs", color: "#ff9a5f" },
  dos: { id: "dos", label: "Dos", short: "DO", accentClass: "accent-dos", color: "#4cc7a4" },
  epaules: { id: "epaules", label: "Épaules", short: "EP", accentClass: "accent-epaules", color: "#5f8dff" },
  biceps: { id: "biceps", label: "Biceps", short: "BI", accentClass: "accent-biceps", color: "#7ea25f" },
  triceps: { id: "triceps", label: "Triceps", short: "TR", accentClass: "accent-triceps", color: "#9c7bff" },
  jambes: { id: "jambes", label: "Jambes", short: "JA", accentClass: "accent-jambes", color: "#3ba9ff" },
  abdos: { id: "abdos", label: "Abdos", short: "AB", accentClass: "accent-abdos", color: "#ff6f7d" },
  full: { id: "full", label: "Full body", short: "FB", accentClass: "accent-full", color: "#5d78d8" }
};

export function inferMuscleGroup(exercice: Exercice): MuscleGroup {
  const nom = exercice.nom.toLowerCase();
  if (["curl", "marteau"].some((k) => nom.includes(k))) return "biceps";
  if (["triceps", "extension"].some((k) => nom.includes(k))) return "triceps";
  if (["développé couché", "incliné", "écartés", "pector"].some((k) => nom.includes(k))) return "pecs";
  if (["rowing", "dos", "menton"].some((k) => nom.includes(k))) return "dos";
  if (["militaire", "élévations", "oiseau", "thruster"].some((k) => nom.includes(k))) return "epaules";
  if (["squat", "fentes", "roumain", "hip", "jambe"].some((k) => nom.includes(k))) return "jambes";
  if (["crunch", "gainage", "farmer", "abdo"].some((k) => nom.includes(k))) return "abdos";
  return "full";
}

export function getMuscleMeta(group: MuscleGroup): MuscleMeta {
  return MUSCLE_META[group];
}
