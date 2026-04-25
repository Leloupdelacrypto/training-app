"use client";

import { useMemo, useState } from "react";
import { recommanderCharge } from "@/lib/progression";
import { Exercice, Intensite, JourProgramme, ResultatExercice, SessionEnregistree } from "@/lib/types";
import { RestTimer } from "./RestTimer";

interface GuidedSessionProps {
  jour: JourProgramme;
  onSessionDone: (session: SessionEnregistree) => void;
}

const intensites: Intensite[] = ["facile", "ok", "dur"];

export function GuidedSession({ jour, onSessionDone }: GuidedSessionProps) {
  const [index, setIndex] = useState(0);
  const [start] = useState(Date.now());
  const [resultats, setResultats] = useState<Record<string, ResultatExercice>>({});

  const exerciceCourant: Exercice = jour.exercices[index];

  const resultatCourant = resultats[exerciceCourant.id] ?? {
    exerciceId: exerciceCourant.id,
    repsRealisees: exerciceCourant.repsCible,
    intensite: "ok" as Intensite,
    commentaire: ""
  };

  const progression = useMemo(
    () => recommanderCharge(exerciceCourant, resultatCourant),
    [exerciceCourant, resultatCourant]
  );

  function updateResult(partial: Partial<ResultatExercice>) {
    setResultats((prev) => ({
      ...prev,
      [exerciceCourant.id]: { ...resultatCourant, ...partial }
    }));
  }

  function finirSession() {
    const dureeSec = Math.max(60, Math.round((Date.now() - start) / 1000));
    onSessionDone({
      id: crypto.randomUUID(),
      jourId: jour.id,
      dateISO: new Date().toISOString(),
      dureeSec,
      resultats: Object.values(resultats)
    });
    setIndex(0);
    setResultats({});
  }

  return (
    <section className="panel">
      <h2>Mode séance guidée</h2>
      <p>{jour.titre} · Exercice {index + 1}/{jour.exercices.length}</p>
      <article className="exerciseCard">
        <h3>{exerciceCourant.nom}</h3>
        <p>{exerciceCourant.series} séries · {exerciceCourant.repsCible} reps · repos {exerciceCourant.reposSec}s</p>
        <p>Charge conseillée prochaine séance : <strong>{progression} kg</strong></p>

        <label>
          Reps réalisées
          <input
            value={resultatCourant.repsRealisees}
            onChange={(e) => updateResult({ repsRealisees: e.target.value })}
          />
        </label>

        <label>
          Intensité ressentie
          <select
            value={resultatCourant.intensite}
            onChange={(e) => updateResult({ intensite: e.target.value as Intensite })}
          >
            {intensites.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>

        <label>
          Commentaire
          <textarea
            value={resultatCourant.commentaire ?? ""}
            onChange={(e) => updateResult({ commentaire: e.target.value })}
          />
        </label>

        <RestTimer defaultSeconds={exerciceCourant.reposSec} />
      </article>

      <div className="inlineActions">
        <button type="button" disabled={index === 0} onClick={() => setIndex((v) => v - 1)}>
          Précédent
        </button>
        {index < jour.exercices.length - 1 ? (
          <button type="button" onClick={() => setIndex((v) => v + 1)}>Valider & suivant</button>
        ) : (
          <button type="button" onClick={finirSession}>Terminer la séance</button>
        )}
      </div>
    </section>
  );
}
