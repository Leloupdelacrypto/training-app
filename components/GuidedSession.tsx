"use client";

import { useEffect, useMemo, useState } from "react";
import { intensiteDepuisRpe, recommanderObjectif } from "@/lib/progression";
import { Exercice, JourProgramme, ResultatExercice, SessionEnregistree } from "@/lib/types";

interface GuidedSessionProps {
  jour: JourProgramme;
  onSessionDone: (session: SessionEnregistree) => void;
}

const EMPTY_SERIES: SerieSaisie[] = [];

interface SerieSaisie {
  reps: number;
  rpe: number;
}

function repsParDefaut(repsCible: string): number {
  const first = repsCible.match(/\d+/)?.[0];
  return first ? Number(first) : 10;
}

export function GuidedSession({ jour, onSessionDone }: GuidedSessionProps) {
  const [indexExercice, setIndexExercice] = useState(0);
  const [seriesParExercice, setSeriesParExercice] = useState<Record<string, SerieSaisie[]>>({});
  const [repsDraft, setRepsDraft] = useState(() => repsParDefaut(jour.exercices[0]?.repsCible ?? "10"));
  const [rpeDraft, setRpeDraft] = useState(8);
  const [reposRestant, setReposRestant] = useState(0);
  const [start] = useState(Date.now());
  const [isCompleteView, setIsCompleteView] = useState(false);

  const exerciceCourant: Exercice = jour.exercices[indexExercice];
  const seriesFaites = seriesParExercice[exerciceCourant.id] ?? EMPTY_SERIES;
  const serieActuelleIndex = seriesFaites.length;
  const objectif = useMemo(() => {
    const repMoyenne = seriesFaites.length > 0
      ? Math.round(seriesFaites.reduce((acc, s) => acc + s.reps, 0) / seriesFaites.length)
      : repsParDefaut(exerciceCourant.repsCible);
    return recommanderObjectif(exerciceCourant, {
      exerciceId: exerciceCourant.id,
      repsRealisees: String(repMoyenne),
      intensite: intensiteDepuisRpe(rpeDraft),
      commentaire: `RPE ${rpeDraft}`
    });
  }, [exerciceCourant, rpeDraft, seriesFaites]);

  const totalSeries = jour.exercices.reduce((acc, exercice) => acc + exercice.series, 0);
  const seriesValidees = Object.values(seriesParExercice).reduce((acc, values) => acc + values.length, 0);
  const progression = totalSeries > 0 ? Math.round((seriesValidees / totalSeries) * 100) : 0;

  useEffect(() => {
    if (reposRestant <= 0) return;
    const timer = window.setInterval(() => {
      setReposRestant((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [reposRestant]);

  useEffect(() => {
    setRepsDraft(repsParDefaut(exerciceCourant.repsCible));
    setRpeDraft(8);
  }, [exerciceCourant.id, exerciceCourant.repsCible]);

  function validerSerie() {
    if (reposRestant > 0) return;
    setSeriesParExercice((prev) => {
      const current = prev[exerciceCourant.id] ?? [];
      if (current.length >= exerciceCourant.series) return prev;
      return {
        ...prev,
        [exerciceCourant.id]: [...current, { reps: repsDraft, rpe: rpeDraft }]
      };
    });
    setReposRestant(exerciceCourant.reposSec);
  }

  function exerciceSuivant() {
    setReposRestant(0);
    if (indexExercice >= jour.exercices.length - 1) {
      setIsCompleteView(true);
      return;
    }
    setIndexExercice((v) => v + 1);
  }

  function finaliserSeance() {
    const resultats = jour.exercices
      .map((exercice) => {
        const series = seriesParExercice[exercice.id] ?? [];
        if (series.length === 0) return null;
        const reps = series.map((serie) => serie.reps).join("/");
        const moyenneRpe = Math.round(series.reduce((acc, serie) => acc + serie.rpe, 0) / series.length);
        return {
          exerciceId: exercice.id,
          repsRealisees: reps,
          intensite: intensiteDepuisRpe(moyenneRpe),
          commentaire: `RPE ${moyenneRpe}`
        } satisfies ResultatExercice;
      })
      .filter(Boolean) as ResultatExercice[];

    if (resultats.length === 0) return;

    onSessionDone({
      id: crypto.randomUUID(),
      jourId: jour.id,
      dateISO: new Date().toISOString(),
      dureeSec: Math.max(60, Math.round((Date.now() - start) / 1000)),
      resultats
    });

    setIndexExercice(0);
    setSeriesParExercice({});
    setReposRestant(0);
    setIsCompleteView(false);
  }

  if (isCompleteView) {
    const minutes = Math.max(1, Math.round((Date.now() - start) / 1000 / 60));
    return (
      <section className="panel sessionCompleteCard">
        <p className="eyebrow">Séance terminée</p>
        <h2>Excellent travail 🔥</h2>
        <p className="mutedText">{seriesValidees}/{totalSeries} séries validées en {minutes} min.</p>
        <div className="timelineCards">
          {jour.exercices.map((exercice) => {
            const series = seriesParExercice[exercice.id] ?? [];
            return (
              <article className="timelineCard" key={exercice.id}>
                <strong>{exercice.nom}</strong>
                <p>{series.length}/{exercice.series} séries · {series.map((s) => s.reps).join(" /") || "-"} reps</p>
              </article>
            );
          })}
        </div>
        <button type="button" className="primaryButton" onClick={finaliserSeance}>Enregistrer et continuer</button>
      </section>
    );
  }

  const reposActif = reposRestant > 0;

  return (
    <section className="guidedFullscreen">
      <header className="guidedHeader">
        <p className="eyebrow">{jour.titre}</p>
        <strong>Exercice {indexExercice + 1}/{jour.exercices.length}</strong>
        <div className="progressTrack" aria-hidden="true">
          <div className="progressBar" style={{ width: `${progression}%` }} />
        </div>
        <small className="mutedText">Progression séance: {progression}%</small>
      </header>

      <article className="guidedExerciseCard">
        <div className="exerciseIllustration large" aria-hidden="true">✷</div>
        <h2>{exerciceCourant.nom}</h2>
        <p className="mutedText">Série {Math.min(serieActuelleIndex + 1, exerciceCourant.series)}/{exerciceCourant.series} · cible {exerciceCourant.repsCible}</p>

        <div className="metricRow">
          <div>
            <span>Charge conseillée</span>
            <strong>{objectif.chargeCibleKg} kg</strong>
          </div>
          <div>
            <span>Objectif du jour</span>
            <strong>{objectif.repsCible}</strong>
          </div>
        </div>

        <div className="quickAdjustRow">
          <button type="button" className="stepButton" onClick={() => setRepsDraft((v) => Math.max(1, v - 1))}>−</button>
          <div className="repValue">{repsDraft} reps</div>
          <button type="button" className="stepButton" onClick={() => setRepsDraft((v) => v + 1)}>+</button>
        </div>

        <div>
          <p className="fieldLabel">RPE ressenti</p>
          <div className="rpeRow">
            {[6, 7, 8, 9, 10].map((rpe) => (
              <button
                key={rpe}
                type="button"
                className={`choiceButton ${rpeDraft === rpe ? "active" : ""}`}
                onClick={() => setRpeDraft(rpe)}
              >
                {rpe}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="primaryButton" onClick={validerSerie} disabled={reposActif || serieActuelleIndex >= exerciceCourant.series}>
          Valider la série
        </button>
      </article>

      <article className="restPremiumCard">
        <p className="eyebrow">Chrono repos</p>
        <strong>{String(Math.floor(reposRestant / 60)).padStart(2, "0")}:{String(reposRestant % 60).padStart(2, "0")}</strong>
        <div className="inlineActions twoCols">
          <button type="button" onClick={() => setReposRestant((v) => v + 30)}>+30 s</button>
          <button type="button" onClick={() => setReposRestant(0)}>Passer repos</button>
          <button type="button" onClick={exerciceSuivant}>Exercice suivant</button>
          <button type="button" className="ghostButton" onClick={() => setIsCompleteView(true)}>Résumé séance</button>
        </div>
      </article>
    </section>
  );
}
