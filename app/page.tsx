"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTools } from "@/components/DataTools";
import { GuidedSession } from "@/components/GuidedSession";
import { analyserCoachLocal, CoachBadge } from "@/lib/coach";
import { recommanderObjectif, volumeEstime } from "@/lib/progression";
import { chargerDonnees, getDonneesInitiales, sauvegarderDonnees } from "@/lib/storage";
import { DonneesApp, Exercice, JourProgramme, MesureEntry } from "@/lib/types";

type Onglet = "accueil" | "seance" | "programme" | "coach" | "historique" | "progression" | "mesures" | "reglages";

type MuscleGroup = "push" | "pull" | "legs" | "core" | "full";

const navigation: { id: Onglet; label: string; icon: string }[] = [
  { id: "accueil", label: "Accueil", icon: "◉" },
  { id: "seance", label: "Séance", icon: "▶" },
  { id: "programme", label: "Exercices", icon: "◈" },
  { id: "coach", label: "Coach", icon: "✦" },
  { id: "historique", label: "Historique", icon: "◷" },
  { id: "progression", label: "Progress", icon: "▴" },
  { id: "mesures", label: "Mesures", icon: "◎" },
  { id: "reglages", label: "Données", icon: "⚙" }
];

const badgeClassMap: Record<CoachBadge, string> = {
  Progression: "isProgression",
  Fatigue: "isFatigue",
  Volume: "isVolume",
  Mesures: "isMesures",
  "Priorité haute": "isPriority"
};

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

function inferMuscleGroup(exercice: Exercice): MuscleGroup {
  const nom = exercice.nom.toLowerCase();
  if (["squat", "fentes", "roumain", "hip", "jambe"].some((k) => nom.includes(k))) return "legs";
  if (["rowing", "curl", "dos", "menton"].some((k) => nom.includes(k))) return "pull";
  if (["développé", "triceps", "pector", "militaire"].some((k) => nom.includes(k))) return "push";
  if (["crunch", "gainage", "farmer", "abdo"].some((k) => nom.includes(k))) return "core";
  return "full";
}

function visualForGroup(group: MuscleGroup) {
  const map = {
    push: { icon: "⬢", label: "Push", className: "accentPush" },
    pull: { icon: "◬", label: "Pull", className: "accentPull" },
    legs: { icon: "◪", label: "Jambes", className: "accentLegs" },
    core: { icon: "◍", label: "Core", className: "accentCore" },
    full: { icon: "✷", label: "Full", className: "accentFull" }
  } as const;
  return map[group];
}

export default function Page() {
  const [data, setData] = useState<DonneesApp>(getDonneesInitiales());
  const [jourId, setJourId] = useState(data.programme.jours[0]?.id ?? "");
  const [onglet, setOnglet] = useState<Onglet>("accueil");
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    const loaded = chargerDonnees();
    setData(loaded);
    const storedPrenom = window.localStorage.getItem("training-app-prenom") ?? "";
    setPrenom(storedPrenom);
    if (!jourId && loaded.programme.jours[0]) {
      setJourId(loaded.programme.jours[0].id);
    }
  }, [jourId]);

  useEffect(() => {
    sauvegarderDonnees(data);
  }, [data]);

  useEffect(() => {
    window.localStorage.setItem("training-app-prenom", prenom);
  }, [prenom]);

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
  const coachInsights = useMemo(() => analyserCoachLocal(data), [data]);

  const insightDuJour = coachInsights[0]?.conseil ?? "Ton focus du jour : exécution propre et tempo contrôlé sur les séries clés.";

  const statutSemaine = sessionsSemaine >= 4 ? "Excellent rythme" : sessionsSemaine >= 2 ? "Rythme correct" : "Relance conseillée";

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
        <article className="panel heroCard">
          <p className="eyebrow">Dashboard coach</p>
          <h2>{prenom ? `Salut ${prenom}, prêt·e à performer ?` : "Prêt·e pour une séance premium ?"}</h2>
          <p className="mutedText">Séance recommandée: <strong>{prochaineSeance?.titre}</strong> · Focus {prochaineSeance?.focus}</p>
          <div className="heroActions">
            <button type="button" className="primaryButton" onClick={() => { if (prochaineSeance) setJourId(prochaineSeance.id); setOnglet("seance"); }}>
              Démarrer la séance
            </button>
            <button type="button" className="ghostButton" onClick={() => setOnglet("programme")}>Voir les exercices</button>
          </div>
        </article>

        <article className="panel statPanel">
          <p className="eyebrow">Rythme</p>
          <h3>{sessionsSemaine} séances / 7 jours</h3>
          <p className="mutedText">{statutSemaine}</p>
        </article>

        <article className="panel statPanel">
          <p className="eyebrow">Insight du jour</p>
          <h3>Action simple</h3>
          <p>{insightDuJour}</p>
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
          <p className="eyebrow">Records récents</p>
          <div className="timelineCards compactCards">
            {recordsRecents.map((record) => (
              <article className="timelineCard" key={`${record.nom}-${record.date}`}>
                <strong>{record.nom}</strong>
                <p>{Math.round(record.volume)} pts volume</p>
                <small>{new Date(record.date).toLocaleDateString("fr-FR")}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Progression / alerte</p>
          {exercicesAugmenter.length === 0 ? <p className="mutedText">Maintiens le rythme pour débloquer des progressions personnalisées.</p> : exercicesAugmenter.map((item) => (
            <article className="timelineCard" key={item.nom}>
              <strong>{item.nom}</strong>
              <p>{item.actuel} → {item.cible} kg</p>
              <small>{item.raison}</small>
            </article>
          ))}
        </article>
      </section>
    );
  }

  function renderProgramme() {
    return (
      <section className="panel">
        <h2>{data.programme.nom}</h2>
        <p className="mutedText">Programme inchangé, présenté en cartes visuelles par groupe musculaire.</p>
        <div className="chipRow">
          {data.programme.jours.map((j) => (
            <button key={j.id} type="button" className={`chipButton ${j.id === jour?.id ? "active" : ""}`} onClick={() => setJourId(j.id)}>
              {j.titre.replace("Jour ", "J")}
            </button>
          ))}
        </div>

        <div className="timelineCards">
          {jour?.exercices.map((e) => {
            const group = inferMuscleGroup(e);
            const visual = visualForGroup(group);
            const lastResult = data.historique
              .flatMap((session) => session.resultats)
              .find((result) => result.exerciceId === e.id);
            const objectif = recommanderObjectif(e, lastResult);
            const badge = objectif.chargeCibleKg > e.chargeKg ? "progression" : objectif.chargeCibleKg < e.chargeKg ? "fatigue" : "stable";

            return (
              <article className={`timelineCard exercisePremiumCard ${visual.className}`} key={e.id}>
                <div className="exerciseIllustration" aria-hidden="true">{visual.icon}</div>
                <div className="exerciseMain">
                  <div>
                    <strong>{e.nom}</strong>
                    <p className="mutedText">{visual.label} · {e.series} séries · {e.repsCible}</p>
                  </div>
                  <div className="exerciseMetrics">
                    <span>Dernière perf: {lastResult?.repsRealisees ?? "-"}</span>
                    <span>Charge conseillée: {objectif.chargeCibleKg} kg</span>
                    <span>Objectif du jour: {objectif.repsCible}</span>
                  </div>
                </div>
                <span className={`statusBadge ${badge}`}>{badge}</span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderCoach() {
    return (
      <section className="panel">
        <h2>Coach & insights</h2>
        <p className="mutedText">Conseils courts, actionnables, orientés prochaine séance.</p>
        <div className="timelineCards">
          {coachInsights.map((insight) => (
            <article className="timelineCard coachCard" key={insight.id}>
              <div className="coachCardHead">
                <strong>{insight.titre}</strong>
                <div className="badgeRow">
                  {insight.badges.map((badge) => (
                    <span key={`${insight.id}-${badge}`} className={`coachBadge ${badgeClassMap[badge]}`}>
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <p>{insight.conseil}</p>
              <small className="mutedText">À faire aujourd&apos;hui: choisis un exercice prioritaire et applique ce conseil sur toutes les séries.</small>
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
        <div className="timelineCards">
          {data.historique.length === 0 ? <p className="mutedText">Aucune séance enregistrée.</p> : data.historique.map((session) => {
            const jourTrouve = data.programme.jours.find((j) => j.id === session.jourId);
            return (
              <article className="timelineCard" key={session.id}>
                <strong>{jourTrouve?.titre ?? session.jourId}</strong>
                <p>{new Date(session.dateISO).toLocaleDateString("fr-FR")} · {Math.round(session.dureeSec / 60)} min</p>
                <small>{session.resultats.length} exercices validés</small>
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
        <h2>Progression visuelle</h2>
        <div className="timelineCards">
          {ids.length === 0 ? <p className="mutedText">Termine une séance pour débloquer les tendances.</p> : ids.map((id) => {
            const ex = exoMap.get(id);
            if (!ex) return null;
            const resultats = data.historique.flatMap((session) => session.resultats.filter((r) => r.exerciceId === id)).slice(0, 4);
            const objectif = recommanderObjectif(ex, resultats[0], resultats[1]);
            const trend = resultats.length > 1 ? "hausse" : "stable";
            return (
              <article className="timelineCard" key={id}>
                <strong>{ex.nom}</strong>
                <div className="miniTrend" aria-hidden="true"><span /><span /><span className={trend === "hausse" ? "up" : ""} /></div>
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
        <p className="eyebrow">Training App</p>
        <h1>Coach personnel premium</h1>
        <p className="mutedText">Design mobile immersif, progression guidée, stockage 100% local.</p>
      </header>

      <section className="contentArea">
        {onglet === "accueil" && renderAccueil()}
        {onglet === "seance" && renderSeance(jour)}
        {onglet === "programme" && renderProgramme()}
        {onglet === "coach" && renderCoach()}
        {onglet === "historique" && renderHistorique()}
        {onglet === "progression" && renderProgression()}
        {onglet === "mesures" && renderMesures()}
        {onglet === "reglages" && (
          <>
            <section className="panel">
              <h2>Profil</h2>
              <label>
                Prénom (optionnel)
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Alex" />
              </label>
            </section>
            <DataTools data={data} onImport={setData} />
          </>
        )}
      </section>

      <nav className="tabBar" aria-label="Navigation principale">
        {navigation.map((item) => (
          <button key={item.id} type="button" className={`tabButton ${onglet === item.id ? "active" : ""}`} onClick={() => setOnglet(item.id)}>
            <span aria-hidden="true" className="tabIcon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
