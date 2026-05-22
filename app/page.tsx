"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTools } from "@/components/DataTools";
import { GuidedSession } from "@/components/GuidedSession";
import { MuscleGlyph } from "@/components/MuscleGlyph";
import { analyserCoachLocal, CoachBadge } from "@/lib/coach";
import { getMuscleMeta, inferMuscleGroup } from "@/lib/muscles";
import { recommanderObjectif, volumeEstime } from "@/lib/progression";
import { chargerDonnees, getDonneesInitiales, sauvegarderDonnees } from "@/lib/storage";
import { DonneesApp, JourProgramme, MesureEntry } from "@/lib/types";

type Onglet = "accueil" | "seance" | "programme" | "coach" | "historique" | "progression" | "mesures" | "investissement" | "reglages";

const navigation: { id: Onglet; label: string; icon: string }[] = [
  { id: "accueil", label: "Accueil", icon: "🏠" },
  { id: "seance", label: "Séance", icon: "🏋️" },
  { id: "programme", label: "Exos", icon: "🧩" },
  { id: "coach", label: "Coach", icon: "🧠" },
  { id: "historique", label: "Timeline", icon: "🕒" },
  { id: "progression", label: "Progress", icon: "📈" },
  { id: "mesures", label: "Mesures", icon: "📏" },
  { id: "investissement", label: "Invest", icon: "💰" },
  { id: "reglages", label: "Données", icon: "⚙️" }
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

function getBadge(proposed: number, current: number, highIntensity: boolean) {
  if (highIntensity) return "fatigue";
  if (proposed > current) return "progression";
  if (proposed < current) return "stable";
  return "record";
}

export default function Page() {
  const [data, setData] = useState<DonneesApp>(getDonneesInitiales());
  const [jourId, setJourId] = useState(data.programme.jours[0]?.id ?? "");
  const [onglet, setOnglet] = useState<Onglet>("accueil");
  const [prenom, setPrenom] = useState("");

  const [invInitial, setInvInitial] = useState(5000);
  const [invMensuel, setInvMensuel] = useState(300);
  const [tauxAnnuel, setTauxAnnuel] = useState(7);
  const [dureeAnnees, setDureeAnnees] = useState(10);

  const projectionInvest = useMemo(() => {
    const moisTotal = Math.max(1, Math.round(dureeAnnees * 12));
    const tauxMensuel = tauxAnnuel / 100 / 12;
    let capital = Math.max(0, invInitial);
    let totalVerse = Math.max(0, invInitial);

    const lignes = Array.from({ length: moisTotal }, (_, index) => {
      const mois = index + 1;
      const contribution = Math.max(0, invMensuel);
      const interets = capital * tauxMensuel;
      capital += interets + contribution;
      totalVerse += contribution;

      return {
        mois,
        annee: Math.ceil(mois / 12),
        contribution,
        interets,
        capital,
        totalVerse,
        totalInterets: capital - totalVerse
      };
    });

    return { lignes, tauxMensuel };
  }, [dureeAnnees, invInitial, invMensuel, tauxAnnuel]);

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
  const coachInsights = useMemo(() => analyserCoachLocal(data), [data]);

  const insightDuJour = coachInsights[0]?.conseil ?? "Ton focus du jour : exécution propre et tempo contrôlé sur les séries clés.";

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
      .slice(0, 4);
  }, [derniereSession, exoMap]);

  const recordsRecents = useMemo(() => {
    return data.historique.slice(0, 8)
      .flatMap((session) => session.resultats.map((r) => ({ r, sessionDate: session.dateISO })))
      .map(({ r, sessionDate }) => {
        const ex = exoMap.get(r.exerciceId);
        if (!ex) return null;
        return { nom: ex.nom, volume: volumeEstime(ex, r), date: sessionDate };
      })
      .filter((item): item is { nom: string; volume: number; date: string } => Boolean(item))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);
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
      <section className="screenStack">
        <article className="heroPremiumCard">
          <div>
            <p className="eyebrow">Plan du jour</p>
            <h2>{prenom ? `Hey ${prenom}, on lance la séance ?` : "Prêt·e pour une vraie séance premium ?"}</h2>
            <p className="mutedText">{prochaineSeance?.titre} · Focus {prochaineSeance?.focus} · Est. 42 min</p>
          </div>
          <button type="button" className="primaryButton jumbo" onClick={() => { if (prochaineSeance) setJourId(prochaineSeance.id); setOnglet("seance"); }}>
            Démarrer
          </button>
          <div className="kpiStrip">
            <div><span>Streak semaine</span><strong>{sessionsSemaine}/4</strong></div>
            <div><span>Régularité</span><strong>{sessionsSemaine >= 4 ? "Excellent" : sessionsSemaine >= 2 ? "Solide" : "À relancer"}</strong></div>
            <div><span>Coach insight</span><strong>{coachInsights.length}</strong></div>
          </div>
          <p className="coachHint">💡 {insightDuJour}</p>
        </article>

        <section className="gridTwoCols">
          <article className="premiumCard">
            <p className="eyebrow">Progression récente</p>
            <div className="trendBars" aria-hidden="true">
              <span /> <span /> <span className="up" /> <span className="up" />
            </div>
            <strong className="bigMetric">{Math.min(99, 12 + data.historique.length * 3)}%</strong>
            <small className="mutedText">Évolution perçue sur 30 jours</small>
          </article>
          <article className="premiumCard">
            <p className="eyebrow">Dernière séance</p>
            <strong className="bigMetric">{derniereSession ? `${Math.round(derniereSession.dureeSec / 60)} min` : "--"}</strong>
            <small className="mutedText">{derniereSession ? new Date(derniereSession.dateISO).toLocaleDateString("fr-FR") : "Aucune séance"}</small>
          </article>
        </section>

        <article className="premiumCard">
          <p className="eyebrow">Records récents</p>
          <div className="chipDeck">
            {recordsRecents.length === 0 ? <small className="mutedText">Débloque tes premiers records.</small> : recordsRecents.map((record) => (
              <article className="chipStat" key={`${record.nom}-${record.date}`}>
                <span className="chipBadge violet">Record</span>
                <strong>{record.nom}</strong>
                <small>{Math.round(record.volume)} pts · {new Date(record.date).toLocaleDateString("fr-FR")}</small>
              </article>
            ))}
          </div>
        </article>
      </section>
    );
  }

  function renderProgramme() {
    return (
      <section className="screenStack">
        <article className="premiumCard">
          <h2>{data.programme.nom}</h2>
          <p className="mutedText">Cards immersives par groupe musculaire, objectifs et charge du jour.</p>
          <div className="chipRow">
            {data.programme.jours.map((j) => (
              <button key={j.id} type="button" className={`chipButton ${j.id === jour?.id ? "active" : ""}`} onClick={() => setJourId(j.id)}>
                {j.titre.replace("Jour ", "J")}
              </button>
            ))}
          </div>
        </article>

        {jour?.exercices.map((e) => {
          const group = inferMuscleGroup(e);
          const meta = getMuscleMeta(group);
          const lastResult = data.historique
            .flatMap((session) => session.resultats)
            .find((result) => result.exerciceId === e.id);
          const objectif = recommanderObjectif(e, lastResult);
          const badge = getBadge(objectif.chargeCibleKg, e.chargeKg, lastResult?.intensite === "dur");

          return (
            <article className={`exercisePremiumCard ${meta.accentClass}`} key={e.id}>
              <div className="exerciseVisual"><MuscleGlyph group={group} /><span>{meta.label}</span></div>
              <div className="exerciseMain">
                <strong>{e.nom}</strong>
                <p className="mutedText">{e.series} séries · objectif {e.repsCible}</p>
                <div className="exerciseMetrics">
                  <span>Dernière perf <b>{lastResult?.repsRealisees ?? "-"}</b></span>
                  <span>Charge conseillée <b>{objectif.chargeCibleKg} kg</b></span>
                  <span>Objectif du jour <b>{objectif.repsCible}</b></span>
                </div>
              </div>
              <div className="cardCtaCol">
                <span className={`statusBadge ${badge}`}>{badge}</span>
                <button type="button" className="ghostButton" onClick={() => { setOnglet("seance"); }}>
                  Lancer
                </button>
              </div>
            </article>
          );
        })}
      </section>
    );
  }

  function renderCoach() {
    return (
      <section className="screenStack">
        <article className="premiumCard coachHero">
          <div className="coachAvatar">🧠</div>
          <div>
            <p className="eyebrow">Coach intelligent</p>
            <h2>Conseil du jour</h2>
            <p>{insightDuJour}</p>
          </div>
        </article>

        {coachInsights.map((insight) => (
          <article className="coachInsightCard" key={insight.id}>
            <div className="coachCardHead">
              <strong>{insight.titre}</strong>
              <div className="badgeRow">
                {insight.badges.map((badge) => (
                  <span key={`${insight.id}-${badge}`} className={`coachBadge ${badgeClassMap[badge]}`}>{badge}</span>
                ))}
              </div>
            </div>
            <p>{insight.conseil}</p>
          </article>
        ))}
      </section>
    );
  }

  function renderHistorique() {
    return (
      <section className="screenStack">
        <article className="premiumCard"><h2>Timeline entraînements</h2></article>
        {data.historique.length === 0 ? <article className="premiumCard"><p className="mutedText">Aucune séance enregistrée.</p></article> : data.historique.map((session) => {
          const jourTrouve = data.programme.jours.find((j) => j.id === session.jourId);
          const principaux = session.resultats.slice(0, 3).map((r) => exoMap.get(r.exerciceId)?.nom ?? r.exerciceId).join(" · ");
          return (
            <article className="timelineItem" key={session.id}>
              <div className="timelineDot" />
              <div className="timelineContent">
                <strong>{jourTrouve?.titre ?? session.jourId}</strong>
                <p>{new Date(session.dateISO).toLocaleDateString("fr-FR")} · {Math.round(session.dureeSec / 60)} min</p>
                <small>{principaux}</small>
              </div>
            </article>
          );
        })}
      </section>
    );
  }

  function renderProgression() {
    const ids = Array.from(new Set(data.historique.flatMap((s) => s.resultats.map((r) => r.exerciceId))));

    return (
      <section className="screenStack">
        <article className="premiumCard"><h2>Progression engageante</h2></article>
        {ids.length === 0 ? <article className="premiumCard"><p className="mutedText">Termine une séance pour débloquer les tendances.</p></article> : ids.map((id) => {
          const ex = exoMap.get(id);
          if (!ex) return null;
          const resultats = data.historique.flatMap((session) => session.resultats.filter((r) => r.exerciceId === id)).slice(0, 4);
          const objectif = recommanderObjectif(ex, resultats[0], resultats[1]);
          const best = Math.max(...resultats.flatMap((r) => r.repsRealisees.match(/\d+/g)?.map(Number) ?? [0]), 0);

          return (
            <article className="progressCard" key={id}>
              <strong>{ex.nom}</strong>
              <div className="trendBars"><span /><span /><span className="up" /><span className="up" /></div>
              <div className="progressStats">
                <span>Dernier <b>{resultats[0]?.repsRealisees ?? "-"}</b></span>
                <span>Best <b>{best}</b></span>
                <span>Objectif <b>{objectif.repsCible}</b></span>
              </div>
              <p>{objectif.recommandation}</p>
              {best >= Number(objectif.repsCible.match(/\d+/)?.[0] ?? "0") ? <span className="chipBadge violet">Record</span> : null}
            </article>
          );
        })}
      </section>
    );
  }

  function renderMesures() {
    const poidsValues = poidsSerie.map((p) => p.value);
    const tailleValues = tailleSerie.map((p) => p.value);

    return (
      <section className="screenStack">
        <article className="premiumCard">
          <h2>Mesures & récupération</h2>
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
        </article>
      </section>
    );
  }


  function renderInvestissement() {
    const derniersMois = projectionInvest.lignes.slice(-12);
    const finalLigne = projectionInvest.lignes[projectionInvest.lignes.length - 1];

    return (
      <section className="screenStack">
        <article className="premiumCard">
          <h2>Tableau d’investissement</h2>
          <p className="mutedText">Simule ton intérêt composé avec investissement initial, versement mensuel et taux annuel.</p>
          <label>
            Investissement initial (€)
            <input type="number" min={0} value={invInitial} onChange={(e) => setInvInitial(Number(e.target.value) || 0)} />
          </label>
          <label>
            Investissement mensuel (€)
            <input type="number" min={0} value={invMensuel} onChange={(e) => setInvMensuel(Number(e.target.value) || 0)} />
          </label>
          <label>
            Taux d’intérêt annuel (%)
            <input type="number" step="0.1" value={tauxAnnuel} onChange={(e) => setTauxAnnuel(Number(e.target.value) || 0)} />
          </label>
          <label>
            Durée (années)
            <input type="number" min={1} value={dureeAnnees} onChange={(e) => setDureeAnnees(Number(e.target.value) || 1)} />
          </label>

          <div className="metricRow">
            <div><span>Rendement mensuel</span><strong>{(projectionInvest.tauxMensuel * 100).toFixed(3)}%</strong></div>
            <div><span>Rendement annuel</span><strong>{tauxAnnuel.toFixed(2)}%</strong></div>
            <div><span>Capital final</span><strong>{finalLigne?.capital.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</strong></div>
          </div>
          <div className="metricRow">
            <div><span>Total investi</span><strong>{finalLigne?.totalVerse.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</strong></div>
            <div><span>Intérêts cumulés</span><strong>{finalLigne?.totalInterets.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</strong></div>
            <div><span>Horizon</span><strong>{dureeAnnees} ans</strong></div>
          </div>
        </article>

        <article className="premiumCard">
          <h3>Calculateur d’intérêt composé (12 derniers mois)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Mois</th><th>Année</th><th>Versement</th><th>Intérêts</th><th>Capital</th>
                </tr>
              </thead>
              <tbody>
                {derniersMois.map((ligne) => (
                  <tr key={ligne.mois}>
                    <td>{ligne.mois}</td>
                    <td>{ligne.annee}</td>
                    <td>{ligne.contribution.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                    <td>{ligne.interets.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                    <td><b>{ligne.capital.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
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
        <h1>Fitness mobile premium</h1>
        <p className="mutedText">Interface immersive, cartes visuelles et guidance séance en un tap.</p>
      </header>

      <section className="contentArea">
        {onglet === "accueil" && renderAccueil()}
        {onglet === "seance" && renderSeance(jour)}
        {onglet === "programme" && renderProgramme()}
        {onglet === "coach" && renderCoach()}
        {onglet === "historique" && renderHistorique()}
        {onglet === "progression" && renderProgression()}
        {onglet === "mesures" && renderMesures()}
        {onglet === "investissement" && renderInvestissement()}
        {onglet === "reglages" && (
          <>
            <section className="premiumCard">
              <h2>Profil</h2>
              <label>
                Prénom (optionnel)
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Alex" />
              </label>
            </section>
            <DataTools data={data} onImport={setData} />
            <section className="premiumCard">
              <h3>Recommandations auto</h3>
              <div className="chipDeck">
                {exercicesAugmenter.length === 0 ? <small className="mutedText">Aucune recommandation immédiate.</small> : exercicesAugmenter.map((item) => (
                  <article key={item.nom} className="chipStat">
                    <strong>{item.nom}</strong>
                    <small>{item.actuel} → {item.cible} kg</small>
                    <small>{item.raison}</small>
                  </article>
                ))}
              </div>
            </section>
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
