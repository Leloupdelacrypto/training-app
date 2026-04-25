"use client";

import { ChangeEvent } from "react";
import { exporterCSV, exporterJSON, importerDepuisJSON } from "@/lib/export";
import { DonneesApp } from "@/lib/types";

interface DataToolsProps {
  data: DonneesApp;
  onImport: (next: DonneesApp) => void;
}

function telecharger(nom: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTools({ data, onImport }: DataToolsProps) {
  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text()
      .then((text) => onImport(importerDepuisJSON(text)))
      .catch(() => alert("Import impossible : fichier JSON invalide."));
  }

  return (
    <section className="panel">
      <h2>Sauvegarde locale & export</h2>
      <p>Les données sont conservées sur cet appareil (localStorage). Export disponible en JSON et CSV.</p>
      <div className="inlineActions">
        <button type="button" onClick={() => telecharger("training-data.json", exporterJSON(data), "application/json")}>Exporter JSON</button>
        <button type="button" onClick={() => telecharger("training-sessions.csv", exporterCSV(data), "text/csv")}>Exporter CSV</button>
        <label className="fileInputLabel">
          Importer JSON
          <input type="file" accept="application/json" onChange={onFile} />
        </label>
      </div>
    </section>
  );
}
