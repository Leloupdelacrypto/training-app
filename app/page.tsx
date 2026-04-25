"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTools } from "@/components/DataTools";
import { GuidedSession } from "@/components/GuidedSession";
import { recommanderObjectif, volumeEstime } from "@/lib/progression";
import { chargerDonnees, getDonneesInitiales, sauvegarderDonnees } from "@/lib/storage";
import { DonneesApp, JourProgramme, MesureEntry } from "@/lib/types";

type Onglet = "accueil" | "seance" | "programme" | "historique" | "progression" | "mesures" | "reglages";

const navigation: { id: Onglet; label: string }[] = [
  { id: "accueil", label: "Accueil" },
  { id: "seance", label: "Séance" },
  { id: "programme", label: "Programme" },
  { id: "historique", label: "Historique" },
  { id: "progression", label: "Progression" },
  { id: "mesures", label: "Mesures" },
  { id: "reglages", label: "Réglages" }
];

function movingAverage7(values: { dateISO: string; value: number }[]) {
  return values.map((item, index) => {
    const start = Math.max(0, index - 6);
    const window = values.slice(start, index + 1);
    return {
      dateISO: item.dateISO,
      value: window.reduce((acc, current) => acc + current.value, 0) / window.length
    };
  });
}

function tendance(values: number[]): string {
  if (values.length < 2) return "donnée insuffisante";
  const delta = values[values.length - 1] - values[0];
  if (Math.abs(delta) < 0.2) return "stable";
  return delta < 0 ? "en baisse" : "en hausse";
}

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
  }, [jourId]);

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

  const sessionsSemaine = useMemo(() => {
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);
    return data.historique.filter((session) => new Date(session.dateISO) >= last7).length;
  }, [data.historique]);

  const exoMap = useMemo(() => new Map(data.programme.jours.flatMap((j) => j.exercices).map((exo) => [exo.id, exo])), [data.programme.jours]);

  const exercicesAugmenter = useMemo(() => {
    if (!derniereSession) return [];
    return derniereSession.resultats
      .map((resultat) => {
        const ex = exoMap.get(resultat.exerciceId);
        if (!ex) return null;
        const objectif = recommanderObjectif(ex, resultat);
        return { nom: ex.nom, actuel: ex.chargeKg, cible: objectif.chargeCibleKg, raison: objectif.recommandation };
      })
      .filter((item): item is { nom: string; actuel: number; cible: number; raison: string } => item !== null)
      .filter((item) => item.cible > item.actuel)
      .slice(0, 4);
  }, [derniereSession, exoMap]);

  const recordsRecents = useMemo(() => {
    return data.historique.slice(0, 5)
      .flatMap((session) => session.resultats.map((r) => ({ r, sessionDate: session.dateISO })))
      .map(({ r, sessionDate }) => {
        const ex = exoMap.get(r.exerciceId);
        if (!ex) return null;
        return { nom: ex.nom, volume: volumeEstime(ex, r), date: sessionDate };
      })
      .filter((item): item is { nom: string; volume: number; date: string } => Boolean(item))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 4);
  }, [data.historique, exoMap]);

  const poidsSerie = useMemo(() => data.mesuresHistorique.filter((m) => m.poidsKg).map((m) => ({ dateISO: m.dateISO, value: m.poidsKg as number })), [data.mesuresHistorique]);
  const tailleSerie = useMemo(() => data.mesuresHistorique.filter((m) => m.tourTailleCm).map((m) => ({ dateISO: m.dateISO, value: m.tourTailleCm as number })), [data.mesuresHistorique]);
  const poidsMoyenne7 = useMemo(() => movingAverage7(poidsSerie), [poidsSerie]);
  const tailleMoyenne7 = useMemo(() => movingAverage7(tailleSerie), [tailleSerie]);

  function onSessionDone(session: DonneesApp["historique"][number]) {
    setData((prev) => ({ ...prev, historique: [session, ...prev.historique] }));
    setOnglet("accueil");
  }

  function ajouterMesure(partial: Partial<MesureEntry>) {
    const entry: MesureEntry = {
      dateISO: new Date().toISOString(),
      poidsKg: partial.poidsKg ?? data.mesures.poidsKg,
      tourTailleCm: partial.tourTailleCm ?? data.mesures.tourTailleCm
    };

    setData((prev) => ({
      ...prev,
      mesures: {
        poidsKg: entry.poidsKg,
        tourTailleCm: entry.tourTailleCm,
        dateISO: entry.dateISO
      },
      mesuresHistorique: [...prev.mesuresHistorique, entry].slice(-90)
    }));
  }

  function renderAccueil() {
    return (
      <section className="dashboardGrid">
        <article className="panel premiumCard">
          <p className="eyebrow">Coach du jour</p>
          <h2>{prochaineSeance?.titre}</h2>
          <p className="mutedText">Focus: {prochaineSeance?.focus}</p>
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
          ) : <p className="mutedText">Aucune séance enregistrée.</p>}
        </article>

        <article className="panel">
          <p className="eyebrow">Exercices à augmenter</p>
          <div className="timelineCards">
            {exercicesAugmenter.length === 0 ? <p className="mutedText">Continue les séances pour obtenir des recommandations précises.</p> : exercicesAugmenter.map((item) => (
              <article className="timelineCard" key={item.nom}>
                <strong>{item.nom}</strong>
                <p>{item.actuel} → {item.cible} kg</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Records récents</p>
          <div className="timelineCards">
            {recordsRecents.map((record) => (
              <article className="timelineCard" key={`${record.nom}-${record.date}`}>
                <strong>{record.nom}</strong>
                <p>{Math.round(record.volume)} pts volume · {new Date(record.date).toLocaleDateString("fr-FR")}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Activité</p>
          <h3>{sessionsSemaine} séances cette semaine</h3>
          <p className="mutedText">Poids: {data.mesures.poidsKg ? `${data.mesures.poidsKg} kg` : "non renseigné"} · Taille: {data.mesures.tourTailleCm ? `${data.mesures.tourTailleCm} cm` : "non renseignée"}</p>
        </article>
      </section>
    );
  }

  function renderProgramme() {
    return (
      <section className="panel">
        <h2>{data.programme.nom}</h2>
        <p className="mutedText">Programme conservé, affichage premium en cartes.</p>
        <div className="chipRow">
          {data.programme.jours.map((j) => (
            <button key={j.id} type="button" className={`chipButton ${j.id === jour?.id ? "active" : ""}`} onClick={() => setJourId(j.id)}>
              {j.titre.replace("Jour ", "J")}
            </button>
          ))}
        </div>

        <div className="timelineCards">
          {jour?.exercices.map((e) => (
            <article className="timelineCard" key={e.id}>
              <strong>{e.nom}</strong>
              <p>{e.series} séries · {e.repsCible} · {e.chargeKg} kg</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderHistorique() {
    return (
      <section className="panel">
        <h2>Historique & tendances</h2>
        <div className="timelineCards">
          {data.historique.length === 0 ? <p className="mutedText">Aucune séance enregistrée.</p> : data.historique.map((session) => {
            const jourTrouve = data.programme.jours.find((j) => j.id === session.jourId);
            return (
              <article className="timelineCard" key={session.id}>
                <strong>{jourTrouve?.titre ?? session.jourId}</strong>
                <p>{new Date(session.dateISO).toLocaleDateString("fr-FR")} · {Math.round(session.dureeSec / 60)} min · {session.resultats.length} exos</p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderProgression() {
    const ids = Array.from(new Set(data.historique.flatMap((s) => s.resultats.map((r) => r.exerciceId))));

    return (
      <section className="panel">
        <h2>Progression intelligente</h2>
        <div className="timelineCards">
          {ids.length === 0 ? <p className="mutedText">Termine une séance pour débloquer les recommandations.</p> : ids.map((id) => {
            const ex = exoMap.get(id);
            if (!ex) return null;
            const resultats = data.historique.flatMap((session) => session.resultats.filter((r) => r.exerciceId === id)).slice(0, 2);
            const objectif = recommanderObjectif(ex, resultats[0], resultats[1]);
            return (
              <article className="timelineCard" key={id}>
                <strong>{ex.nom}</strong>
                <p>{ex.chargeKg} → {objectif.chargeCibleKg} kg · cible: {objectif.repsCible}</p>
                <span className="mutedText">{objectif.recommandation}</span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMesures() {
    const poidsValues = poidsSerie.map((p) => p.value);
    const tailleValues = tailleSerie.map((p) => p.value);

    return (
      <section className="panel">
        <h2>Mesures & tendance</h2>
        <p className="mutedText">Moyenne mobile 7 jours incluse quand plusieurs entrées existent.</p>
        <label>
          Poids (kg)
          <input
            type="number"
            value={data.mesures.poidsKg ?? ""}
            onChange={(e) => ajouterMesure({ poidsKg: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>

        <label>
          Tour de taille (cm)
          <input
            type="number"
            value={data.mesures.tourTailleCm ?? ""}
            onChange={(e) => ajouterMesure({ tourTailleCm: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>

        <div className="metricRow">
          <div>
            <span>Tendance poids</span>
            <strong>{tendance(poidsValues)}</strong>
            <small>{poidsMoyenne7.length ? `MM7: ${poidsMoyenne7[poidsMoyenne7.length - 1].value.toFixed(1)} kg` : "MM7 indisponible"}</small>
          </div>
          <div>
            <span>Tendance taille</span>
            <strong>{tendance(tailleValues)}</strong>
            <small>{tailleMoyenne7.length ? `MM7: ${tailleMoyenne7[tailleMoyenne7.length - 1].value.toFixed(1)} cm` : "MM7 indisponible"}</small>
          </div>
        </div>
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
        <h1>Training App Premium</h1>
        <p>Carnet d&apos;entraînement mobile-first, utilisable pendant la séance.</p>
      </header>

      <section className="contentArea">
        {onglet === "accueil" && renderAccueil()}
        {onglet === "seance" && renderSeance(jour)}
        {onglet === "programme" && renderProgramme()}
        {onglet === "historique" && renderHistorique()}
        {onglet === "progression" && renderProgression()}
        {onglet === "mesures" && renderMesures()}
        {onglet === "reglages" && <DataTools data={data} onImport={setData} />}
      </section>

      <nav className="tabBar" aria-label="Navigation principale">
        {navigation.map((item) => (
          <button key={item.id} type="button" className={`tabButton ${onglet === item.id ? "active" : ""}`} onClick={() => setOnglet(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
