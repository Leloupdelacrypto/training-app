"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTools } from "@/components/DataTools";
import { GuidedSession } from "@/components/GuidedSession";
import { recommanderCharge } from "@/lib/progression";
import { chargerDonnees, getDonneesInitiales, sauvegarderDonnees } from "@/lib/storage";
import { DonneesApp, JourProgramme, SessionEnregistree } from "@/lib/types";

type Onglet = "accueil" | "seance" | "programme" | "historique" | "progression" | "mesures" | "reglages";

const navigation: { id: Onglet; label: string }[] = [
  { id: "accueil", label: "Accueil" },
  { id: "seance", label: "Séance du jour" },
  { id: "programme", label: "Programme" },
  { id: "historique", label: "Historique" },
  { id: "progression", label: "Progression" },
  { id: "mesures", label: "Mesures" },
  { id: "reglages", label: "Réglages" }
];

export default function Page() {
  const [data, setData] = useState<DonneesApp>(getDonneesInitiales());
  const [jourId, setJourId] = useState(data.programme.jours[0]?.id ?? "");
  const [onglet, setOnglet] = useState<Onglet>("accueil");

  useEffect(() => {
    const loaded = chargerDonnees();
    setData(loaded);
    if (!jourId && loaded.programme.jours[0]) {
      setJourId(loaded.programme.jours[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sauvegarderDonnees(data);
  }, [data]);

  const jour = useMemo(
    () => data.programme.jours.find((j) => j.id === jourId) ?? data.programme.jours[0],
    [data.programme.jours, jourId]
  );

  const derniereSession = data.historique[0];

  const prochaineSeance = useMemo(() => {
    const offset = data.historique.length % data.programme.jours.length;
    return data.programme.jours[offset];
  }, [data.historique.length, data.programme.jours]);

  const exercicesAugmenter = useMemo(() => {
    if (!jour) return [];
    return jour.exercices
      .map((exercice) => {
        const reco = recommanderCharge(exercice, {
          exerciceId: exercice.id,
          repsRealisees: exercice.repsCible,
          intensite: "facile"
        });
        return { nom: exercice.nom, base: exercice.chargeKg, recommandee: reco };
      })
      .filter((item) => item.recommandee > item.base)
      .slice(0, 3);
  }, [jour]);

  const recordsRecents = useMemo(() => {
    if (!derniereSession || !jour) return [];
    return derniereSession.resultats
      .map((r) => {
        const ex = data.programme.jours
          .flatMap((j) => j.exercices)
          .find((item) => item.id === r.exerciceId);
        if (!ex) return null;
        const repsNum = Number.parseInt(r.repsRealisees, 10);
        if (Number.isNaN(repsNum)) return null;
        return { nom: ex.nom, score: repsNum * ex.chargeKg };
      })
      .filter((item): item is { nom: string; score: number } => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [data.programme.jours, derniereSession, jour]);

  function onSessionDone(session: SessionEnregistree) {
    setData((prev) => ({ ...prev, historique: [session, ...prev.historique] }));
    setOnglet("accueil");
  }

  function renderAccueil() {
    return (
      <section className="dashboardGrid">
        <article className="panel premiumCard">
          <p className="eyebrow">Prochaine séance recommandée</p>
          <h2>{prochaineSeance?.titre}</h2>
          <p className="mutedText">Focus : {prochaineSeance?.focus}</p>
          <button type="button" className="primaryButton" onClick={() => { setJourId(prochaineSeance.id); setOnglet("seance"); }}>
            Démarrer la séance
          </button>
        </article>

        <article className="panel">
          <p className="eyebrow">Dernière séance</p>
          {derniereSession ? (
            <>
              <h3>{data.programme.jours.find((j) => j.id === derniereSession.jourId)?.titre ?? derniereSession.jourId}</h3>
              <p className="mutedText">{new Date(derniereSession.dateISO).toLocaleDateString("fr-FR")} · {Math.round(derniereSession.dureeSec / 60)} min</p>
            </>
          ) : (
            <p className="mutedText">Aucune séance enregistrée pour le moment.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Exercices à augmenter</p>
          <ul className="cleanList">
            {exercicesAugmenter.map((item) => (
              <li key={item.nom}>
                <strong>{item.nom}</strong>
                <span>{item.base} → {item.recommandee} kg</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Records récents</p>
          <ul className="cleanList">
            {recordsRecents.length === 0 ? (
              <li><span className="mutedText">Les records apparaîtront après ta première séance.</span></li>
            ) : recordsRecents.map((r) => (
              <li key={r.nom}>
                <strong>{r.nom}</strong>
                <span>{r.score} points charge × reps</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Résumé mesures</p>
          <div className="metricRow">
            <div>
              <span>Poids</span>
              <strong>{data.mesures.poidsKg ? `${data.mesures.poidsKg} kg` : "Non renseigné"}</strong>
            </div>
            <div>
              <span>Tour de taille</span>
              <strong>{data.mesures.tourTailleCm ? `${data.mesures.tourTailleCm} cm` : "Non renseigné"}</strong>
            </div>
          </div>
        </article>
      </section>
    );
  }

  function renderProgramme() {
    return (
      <section className="panel">
        <h2>{data.programme.nom}</h2>
        <p className="mutedText">Sélectionne un jour pour suivre la séance guidée.</p>
        <div className="chipRow">
          {data.programme.jours.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`chipButton ${j.id === jour?.id ? "active" : ""}`}
              onClick={() => setJourId(j.id)}
            >
              {j.titre.replace("Jour ", "J")}
            </button>
          ))}
        </div>

        <div className="stackCards">
          {jour?.exercices.map((e) => (
            <article className="exerciseLine" key={e.id}>
              <strong>{e.nom}</strong>
              <p>{e.series} séries · {e.repsCible}</p>
              <span>{e.chargeKg} kg</span>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderHistorique() {
    return (
      <section className="panel">
        <h2>Historique</h2>
        {data.historique.length === 0 ? (
          <p className="mutedText">Aucune séance enregistrée.</p>
        ) : (
          <div className="stackCards">
            {data.historique.map((session) => {
              const jourTrouve = data.programme.jours.find((j) => j.id === session.jourId);
              return (
                <article className="exerciseLine" key={session.id}>
                  <strong>{jourTrouve?.titre ?? session.jourId}</strong>
                  <p>{new Date(session.dateISO).toLocaleDateString("fr-FR")}</p>
                  <span>{Math.round(session.dureeSec / 60)} min</span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderProgression() {
    const derniere = data.historique[0];
    if (!derniere) {
      return (
        <section className="panel">
          <h2>Progression</h2>
          <p className="mutedText">Termine une séance pour afficher les recommandations de charge.</p>
        </section>
      );
    }

    return (
      <section className="panel">
        <h2>Progression suggérée</h2>
        <div className="stackCards">
          {derniere.resultats.map((resultat) => {
            const ex = data.programme.jours.flatMap((j) => j.exercices).find((item) => item.id === resultat.exerciceId);
            if (!ex) return null;
            const suggestion = recommanderCharge(ex, resultat);
            return (
              <article className="exerciseLine" key={resultat.exerciceId}>
                <strong>{ex.nom}</strong>
                <p>RPE: {resultat.intensite}</p>
                <span>{ex.chargeKg} → {suggestion} kg</span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMesures() {
    return (
      <section className="panel">
        <h2>Mesures</h2>
        <p className="mutedText">Mets à jour tes mesures pour suivre ton évolution.</p>
        <label>
          Poids (kg)
          <input
            type="number"
            value={data.mesures.poidsKg ?? ""}
            onChange={(e) => setData((prev) => ({
              ...prev,
              mesures: {
                ...prev.mesures,
                poidsKg: e.target.value ? Number(e.target.value) : undefined,
                dateISO: new Date().toISOString()
              }
            }))}
          />
        </label>

        <label>
          Tour de taille (cm)
          <input
            type="number"
            value={data.mesures.tourTailleCm ?? ""}
            onChange={(e) => setData((prev) => ({
              ...prev,
              mesures: {
                ...prev.mesures,
                tourTailleCm: e.target.value ? Number(e.target.value) : undefined,
                dateISO: new Date().toISOString()
              }
            }))}
          />
        </label>
      </section>
    );
  }

  function renderSeance(jourSeance: JourProgramme | undefined) {
    if (!jourSeance) return null;
    return <GuidedSession jour={jourSeance} onSessionDone={onSessionDone} />;
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <h1>Training App</h1>
        <p>Suivi d&apos;entraînement intelligent, sans backend.</p>
      </header>

      <nav className="tabBar" aria-label="Navigation principale">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tabButton ${onglet === item.id ? "active" : ""}`}
            onClick={() => setOnglet(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="contentArea">
        {onglet === "accueil" && renderAccueil()}
        {onglet === "seance" && renderSeance(jour)}
        {onglet === "programme" && renderProgramme()}
        {onglet === "historique" && renderHistorique()}
        {onglet === "progression" && renderProgression()}
        {onglet === "mesures" && renderMesures()}
        {onglet === "reglages" && <DataTools data={data} onImport={setData} />}
      </section>
    </main>
  );
}
