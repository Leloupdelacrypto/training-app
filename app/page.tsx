"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTools } from "@/components/DataTools";
import { GuidedSession } from "@/components/GuidedSession";
import { chargerDonnees, getDonneesInitiales, sauvegarderDonnees } from "@/lib/storage";
import { DonneesApp, SessionEnregistree } from "@/lib/types";

export default function Page() {
  const [data, setData] = useState<DonneesApp>(getDonneesInitiales());
  const [jourId, setJourId] = useState(data.programme.jours[0]?.id ?? "");

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

  function onSessionDone(session: SessionEnregistree) {
    setData((prev) => ({ ...prev, historique: [session, ...prev.historique] }));
  }

  return (
    <main className="container">
      <header className="hero panel">
        <h1>Training App V1</h1>
        <p>Suivi d&apos;entraînement intelligent en français, sans backend, orienté mobile.</p>
      </header>

      <section className="panel">
        <h2>Programme intégré</h2>
        <p>{data.programme.nom}</p>
        <label>
          Choisir le jour
          <select value={jour?.id} onChange={(e) => setJourId(e.target.value)}>
            {data.programme.jours.map((j) => (
              <option key={j.id} value={j.id}>{j.titre}</option>
            ))}
          </select>
        </label>
        <ul>
          {jour?.exercices.map((e) => (
            <li key={e.id}>
              <strong>{e.nom}</strong> · {e.series}x{e.repsCible} · {e.chargeKg}kg
            </li>
          ))}
        </ul>
      </section>

      {jour && <GuidedSession jour={jour} onSessionDone={onSessionDone} />}

      <section className="panel">
        <h2>Historique</h2>
        {data.historique.length === 0 ? (
          <p>Aucune séance enregistrée pour le moment.</p>
        ) : (
          <ul>
            {data.historique.slice(0, 8).map((s) => (
              <li key={s.id}>
                {new Date(s.dateISO).toLocaleDateString("fr-FR")} · {s.jourId} · {Math.round(s.dureeSec / 60)} min
              </li>
            ))}
          </ul>
        )}
      </section>

      <DataTools data={data} onImport={setData} />
    </main>
  );
}
