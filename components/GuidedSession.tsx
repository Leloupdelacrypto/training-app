"use client";

import { useEffect, useMemo, useState } from "react";
import { recommanderCharge } from "@/lib/progression";
import { Exercice, Intensite, JourProgramme, ResultatExercice, SessionEnregistree } from "@/lib/types";

interface GuidedSessionProps {
  jour: JourProgramme;
  onSessionDone: (session: SessionEnregistree) => void;
}

const intensites: { value: Intensite; label: string }[] = [
  { value: "facile", label: "Facile" },
  { value: "ok", label: "RPE moyen" },
  { value: "dur", label: "Dur" }
];

export function GuidedSession({ jour, onSessionDone }: GuidedSessionProps) {
  const [index, setIndex] = useState(0);
  const [start] = useState(Date.now());
  const [resultats, setResultats] = useState<Record<string, ResultatExercice>>({});
  const [seriesFaites, setSeriesFaites] = useState<Record<string, number>>({});
  const [reposRestant, setReposRestant] = useState(0);

  const exerciceCourant: Exercice = jour.exercices[index];

  const resultatCourant = resultats[exerciceCourant.id] ?? {
    exerciceId: exerciceCourant.id,
    repsRealisees: exerciceCourant.repsCible,
    intensite: "ok" as Intensite,
    commentaire: ""
  };

  const serieFaite = seriesFaites[exerciceCourant.id] ?? 0;

  const progression = useMemo(
    () => recommanderCharge(exerciceCourant, resultatCourant),
    [exerciceCourant, resultatCourant]
  );

  const finishable = Object.keys(resultats).length > 0;

  useEffect(() => {
    if (reposRestant <= 0) return;
    const timer = window.setInterval(() => {
      setReposRestant((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [reposRestant]);

  function updateResult(partial: Partial<ResultatExercice>) {
    setResultats((prev) => ({
      ...prev,
      [exerciceCourant.id]: { ...resultatCourant, ...partial }
    }));
  }

  function finirSerie() {
    updateResult({});
    setSeriesFaites((prev) => ({
      ...prev,
      [exerciceCourant.id]: Math.min(exerciceCourant.series, (prev[exerciceCourant.id] ?? 0) + 1)
    }));
    setReposRestant(exerciceCourant.reposSec);
  }

  function exerciceSuivant() {
    setReposRestant(0);
    setIndex((v) => Math.min(v + 1, jour.exercices.length - 1));
  }

  function finirSession() {
    if (!finishable) return;
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
    setSeriesFaites({});
    setReposRestant(0);
  }

  return (
    <section className="panel guidedPanel">
      <div className="sectionHead">
        <h2>Séance guidée</h2>
        <p>{jour.titre}</p>
      </div>

      <article className="exerciseCard premiumCard">
        <div className="exerciseTopRow">
          <span className="pill">Exercice {index + 1}/{jour.exercices.length}</span>
          <span className="pill ghost">Séries {serieFaite}/{exerciceCourant.series}</span>
        </div>
        <h3>{exerciceCourant.nom}</h3>
        <p className="mutedText">{exerciceCourant.repsCible} reps · repos {exerciceCourant.reposSec}s</p>

        <div className="chargeBox">
          <span>Charge</span>
          <strong>{exerciceCourant.chargeKg} kg</strong>
          <small>Conseil prochaine séance : {progression} kg</small>
        </div>

        <div className="quickGrid">
          <label>
            Reps réalisées
            <input
              className="bigInput"
              value={resultatCourant.repsRealisees}
              onChange={(e) => updateResult({ repsRealisees: e.target.value })}
            />
          </label>
          <div className="repsQuickActions">
            <button type="button" onClick={() => updateResult({ repsRealisees: "8" })}>8</button>
            <button type="button" onClick={() => updateResult({ repsRealisees: "10" })}>10</button>
            <button type="button" onClick={() => updateResult({ repsRealisees: "12" })}>12</button>
          </div>
        </div>

        <div>
          <p className="fieldLabel">RPE ressenti</p>
          <div className="intensityRow">
            {intensites.map((i) => (
              <button
                key={i.value}
                type="button"
                className={`choiceButton ${resultatCourant.intensite === i.value ? "active" : ""}`}
                onClick={() => updateResult({ intensite: i.value })}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          Note rapide
          <textarea
            value={resultatCourant.commentaire ?? ""}
            onChange={(e) => updateResult({ commentaire: e.target.value })}
            placeholder="Optionnel"
          />
        </label>

        <div className="restBanner">
          <span>Repos automatique</span>
          <strong>{String(Math.floor(reposRestant / 60)).padStart(2, "0")}:{String(reposRestant % 60).padStart(2, "0")}</strong>
        </div>

        <div className="inlineActions twoCols">
          <button type="button" className="primaryButton" onClick={finirSerie}>Série terminée</button>
          <button type="button" onClick={exerciceSuivant} disabled={index >= jour.exercices.length - 1}>Passer à l&apos;exercice suivant</button>
          <button type="button" onClick={() => setIndex((v) => Math.max(0, v - 1))} disabled={index === 0}>Exercice précédent</button>
          <button type="button" className="ghostButton" onClick={finirSession} disabled={!finishable}>Terminer la séance</button>
        </div>
      </article>

      <div className="panel summaryPanel">
        <h3>Résumé instantané</h3>
        <p className="mutedText">Exercices renseignés : {Object.keys(resultats).length}/{jour.exercices.length}</p>
        <p className="mutedText">Séries validées : {Object.values(seriesFaites).reduce((acc, value) => acc + value, 0)}</p>
      </div>
    </section>
  );
}
