import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "./apiClient";

// ---------------------------------------------------------------------------------------------
// Shared body-data screens. The previous single "Aggiungi dati corpo" modal is split into two
// focused flows that share visual identity with the rest of Fitty:
//   1) PhysicalMeasurementsScreen — anthropometric tape measurements (cm / inch)
//   2) BodyCompositionScreen     — smart-scale / bioimpedance values
// Both POST to the same /api/v1/health-data endpoint with a measurementType discriminator.
// ---------------------------------------------------------------------------------------------

export type MeasurementType = "PHYSICAL_MEASUREMENT" | "BODY_COMPOSITION" | "WELLNESS";

export type HealthSnapshot = {
  id: string;
  measurementType: MeasurementType;
  source?: string;
  recordedAt: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  notes?: string;
  // physical
  neckCm?: number; shouldersCm?: number; chestCm?: number; upperChestCm?: number; waistCm?: number;
  abdomenCm?: number; hipsCm?: number; glutesCm?: number;
  rightArmCm?: number; leftArmCm?: number; rightForearmCm?: number; leftForearmCm?: number;
  rightThighCm?: number; leftThighCm?: number; rightCalfCm?: number; leftCalfCm?: number;
  wristCm?: number; ankleCm?: number;
  // composition
  bodyFatPercentage?: number; muscleMassPercentage?: number; skeletalMusclePercentage?: number;
  waterPercentage?: number; visceralFat?: number; boneMassKg?: number; proteinPercentage?: number;
  basalMetabolicRate?: number; metabolicAge?: number; fatFreeMassKg?: number; subcutaneousFatPercentage?: number;
};

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

type LengthUnit = "cm" | "inch";
type WeightUnit = "kg" | "lb";

function toCm(value: number, unit: LengthUnit) { return unit === "cm" ? value : value * CM_PER_INCH; }
function toKg(value: number, unit: WeightUnit) { return unit === "kg" ? value : value * KG_PER_LB; }
function convertLength(raw: string, from: LengthUnit, to: LengthUnit): string {
  if (!raw.trim() || from === to) return raw;
  const cm = toCm(Number(raw), from);
  return (to === "cm" ? cm : cm / CM_PER_INCH).toFixed(1);
}
function convertWeight(raw: string, from: WeightUnit, to: WeightUnit): string {
  if (!raw.trim() || from === to) return raw;
  const kg = toKg(Number(raw), from);
  return (to === "kg" ? kg : kg / KG_PER_LB).toFixed(1);
}

type Values = Record<string, string>;

// --- small shared building blocks -------------------------------------------------------------

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <span className="unit-toggle">
      {options.map((opt) =>
        opt === value ? <b key={opt}>{opt}</b> : <i key={opt} role="button" onClick={() => onChange(opt)}>{opt}</i>
      )}
    </span>
  );
}

function MeasureField({ label, unit, value, onChange, min, max, step = "0.1" }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: string;
}) {
  return (
    <label className="measure-field">
      <span>{label}<em>{unit}</em></span>
      <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
    </label>
  );
}

function Section({ title, hint, defaultOpen = false, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel lg measure-section">
      <button type="button" className="measure-section-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span><b>{title}</b>{hint && <small>{hint}</small>}</span>
        <i className={open ? "chev open" : "chev"}>›</i>
      </button>
      {open && <div className="measure-grid">{children}</div>}
    </section>
  );
}

function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ModalShell({ kicker, title, subtitle, onClose, onSubmit, saving, error, children, summary }: {
  kicker: string; title: string; subtitle: string; onClose: () => void; onSubmit: () => void; saving: boolean; error: string;
  children: React.ReactNode; summary: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card body-entry-card">
        <div className="body-entry-top">
          <div>
            <button type="button" className="link-button" onClick={onClose}>‹ Progressi</button>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <div className="actions">
            <button type="button" className="btn ghost" onClick={onClose}>Annulla</button>
            <button type="submit" form="body-entry-form" className="btn cta" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</button>
          </div>
        </div>
        <span className="cap coral">{kicker}</span>
        <div className="body-entry-grid">
          <form id="body-entry-form" className="grid" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>{children}</form>
          <aside className="grid">{summary}</aside>
        </div>
        {error && <div className="alert">{error}</div>}
      </div>
    </div>
  );
}

// --- Screen 1: Physical measurements ----------------------------------------------------------

const PHYSICAL_GROUPS: { title: string; hint: string; open?: boolean; fields: { key: string; label: string; min: number; max: number }[] }[] = [
  { title: "Core", hint: "Tronco e centro", open: true, fields: [
    { key: "neckCm", label: "Collo", min: 10, max: 80 },
    { key: "waistCm", label: "Vita", min: 30, max: 250 },
    { key: "abdomenCm", label: "Ombelico", min: 30, max: 250 },
    { key: "hipsCm", label: "Fianchi", min: 40, max: 250 },
    { key: "glutesCm", label: "Glutei", min: 40, max: 250 }
  ] },
  { title: "Parte superiore", hint: "Spalle e torace", fields: [
    { key: "shouldersCm", label: "Spalle", min: 50, max: 200 },
    { key: "chestCm", label: "Torace", min: 40, max: 200 },
    { key: "upperChestCm", label: "Alto torace", min: 40, max: 200 },
    { key: "wristCm", label: "Polso", min: 8, max: 40 }
  ] },
  { title: "Braccia", hint: "Destra e sinistra", fields: [
    { key: "rightArmCm", label: "Braccio dx", min: 15, max: 90 },
    { key: "leftArmCm", label: "Braccio sx", min: 15, max: 90 },
    { key: "rightForearmCm", label: "Avambraccio dx", min: 10, max: 70 },
    { key: "leftForearmCm", label: "Avambraccio sx", min: 10, max: 70 }
  ] },
  { title: "Parte inferiore", hint: "Gambe e caviglie", fields: [
    { key: "rightThighCm", label: "Coscia dx", min: 25, max: 120 },
    { key: "leftThighCm", label: "Coscia sx", min: 25, max: 120 },
    { key: "rightCalfCm", label: "Polpaccio dx", min: 15, max: 90 },
    { key: "leftCalfCm", label: "Polpaccio sx", min: 15, max: 90 },
    { key: "ankleCm", label: "Caviglia", min: 10, max: 50 }
  ] }
];

export function PhysicalMeasurementsScreen({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Values>({});
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  function switchLengthUnit(next: LengthUnit) {
    if (next === lengthUnit) return;
    setHeight((h) => convertLength(h, lengthUnit, next));
    setValues((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, convertLength(val, lengthUnit, next)])));
    setLengthUnit(next);
  }
  function switchWeightUnit(next: WeightUnit) {
    if (next === weightUnit) return;
    setWeight((w) => convertWeight(w, weightUnit, next));
    setWeightUnit(next);
  }

  const weightKg = weight.trim() ? toKg(Number(weight), weightUnit) : 0;
  const heightCm = height.trim() ? toCm(Number(height), lengthUnit) : 0;
  const bmi = weightKg > 0 && heightCm > 0 ? weightKg / ((heightCm / 100) ** 2) : 0;
  const waistCm = values.waistCm ? toCm(Number(values.waistCm), lengthUnit) : 0;
  const hipsCm = values.hipsCm ? toCm(Number(values.hipsCm), lengthUnit) : 0;
  const whr = waistCm > 0 && hipsCm > 0 ? waistCm / hipsCm : 0;
  const filledCount = Object.values(values).filter((v) => v.trim()).length + (height.trim() ? 1 : 0);

  async function save() {
    setError("");
    if (!weight.trim()) { setError("Il peso è obbligatorio."); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        measurementType: "PHYSICAL_MEASUREMENT",
        source: "manual",
        recordedAt: new Date(date).toISOString(),
        weightKg: round(weightKg),
        heightCm: heightCm > 0 ? round(heightCm) : undefined,
        notes: notes.trim() || undefined
      };
      for (const group of PHYSICAL_GROUPS) {
        for (const f of group.fields) {
          if (values[f.key]?.trim()) payload[f.key] = round(toCm(Number(values[f.key]), lengthUnit));
        }
      }
      await apiPost("/api/v1/health-data", token, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Non sono riuscito a salvare le misure.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      kicker="Misure fisiche · metro da sarto"
      title="Aggiungi misure fisiche"
      subtitle="Circonferenze e proporzioni, come le segue un coach."
      onClose={onClose}
      onSubmit={save}
      saving={saving}
      error={error}
      summary={<PhysicalSummary weightKg={weightKg} bmi={bmi} whr={whr} filled={filledCount} />}
    >
      <section className="panel lg tint-coral weight-entry">
        <div className="panel-head"><span className="dot-ic tint-coral">⚖</span><h3>Peso</h3><span className="badge gray">Obbligatorio</span></div>
        <div className="weight-row">
          <strong>{weight || "0"}</strong>
          <UnitToggle value={weightUnit} options={["kg", "lb"]} onChange={switchWeightUnit} />
          <input type="range" min={weightUnit === "kg" ? 30 : 66} max={weightUnit === "kg" ? 180 : 400} step="0.1" value={weight || (weightUnit === "kg" ? "70" : "154")} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="stepper-row">
          <button type="button" className="btn sm ghost" onClick={() => setWeight(step(weight || "70", -0.1))}>-0,1</button>
          <button type="button" className="btn sm ghost" onClick={() => setWeight(step(weight || "70", 0.1))}>+0,1</button>
          <span>Imposta il peso con lo slider o i pulsanti</span>
        </div>
      </section>

      <div className="measure-toolbar">
        <span>Unità lunghezze</span>
        <UnitToggle value={lengthUnit} options={["cm", "inch"]} onChange={switchLengthUnit} />
        <label className="measure-inline">Altezza<input type="number" inputMode="decimal" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={lengthUnit} /></label>
      </div>

      {PHYSICAL_GROUPS.map((group) => (
        <Section key={group.title} title={group.title} hint={group.hint} defaultOpen={group.open}>
          {group.fields.map((f) => (
            <MeasureField key={f.key} label={f.label} unit={lengthUnit} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} min={f.min} max={f.max} />
          ))}
        </Section>
      ))}

      <section className="panel lg">
        <div className="panel-head"><h3>Note e data</h3><span className="sm">Opzionale</span></div>
        <div className="measure-grid">
          <label className="measure-field"><span>Data misurazione</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label className="form-line">Note<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="es. misurato a digiuno la mattina" /></label>
      </section>
    </ModalShell>
  );
}

function PhysicalSummary({ weightKg, bmi, whr, filled }: { weightKg: number; bmi: number; whr: number; filled: number }) {
  return (
    <>
      <section className="panel lg">
        <h3>Anteprima live</h3>
        <div className="preview-grid">
          <div className="panel compact tint-mint"><span className="cap">Peso</span><strong>{weightKg > 0 ? `${weightKg.toFixed(1)} kg` : "—"}</strong><small>salvato in kg</small></div>
          <div className="panel compact"><span className="cap">BMI</span><strong>{bmi > 0 ? bmi.toFixed(1) : "—"}</strong><small>{bmi > 0 ? "da peso e altezza" : "serve altezza"}</small></div>
          <div className="panel compact"><span className="cap">Vita/Fianchi</span><strong>{whr > 0 ? whr.toFixed(2) : "—"}</strong><small>rapporto WHR</small></div>
          <div className="panel compact"><span className="cap">Compilate</span><strong>{filled}</strong><small>misure inserite</small></div>
        </div>
      </section>
      <section className="panel lg tint-lav"><div className="panel-head"><span className="dot-ic tint-lav">✨</span><h3>Coach</h3></div><p>Misura sempre nelle stesse condizioni (mattina, a digiuno) per un confronto onesto nel tempo.</p></section>
      <div className="note">Solo dati corpo e benessere — nessuna interpretazione clinica.</div>
    </>
  );
}

// --- Screen 2: Body composition ---------------------------------------------------------------

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "smart_scale", label: "Bilancia smart" },
  { value: "manual", label: "Manuale" },
  { value: "import", label: "Importato" },
  { value: "ai_assistant", label: "Assistente AI" }
];

const COMPOSITION_PRIMARY: { key: string; label: string; unit: string; min: number; max: number }[] = [
  { key: "bodyFatPercentage", label: "Massa grassa", unit: "%", min: 0, max: 80 },
  { key: "muscleMassPercentage", label: "Massa muscolare", unit: "%", min: 0, max: 100 },
  { key: "waterPercentage", label: "Acqua", unit: "%", min: 0, max: 100 },
  { key: "visceralFat", label: "Grasso viscerale", unit: "idx", min: 0, max: 60 }
];

const COMPOSITION_ADVANCED: { key: string; label: string; unit: string; min: number; max: number; step?: string }[] = [
  { key: "skeletalMusclePercentage", label: "Muscolo scheletrico", unit: "%", min: 0, max: 100 },
  { key: "boneMassKg", label: "Massa ossea", unit: "kg", min: 0, max: 10 },
  { key: "proteinPercentage", label: "Proteine", unit: "%", min: 0, max: 100 },
  { key: "basalMetabolicRate", label: "Metabolismo basale", unit: "kcal", min: 500, max: 5000, step: "1" },
  { key: "metabolicAge", label: "Età metabolica", unit: "anni", min: 5, max: 120, step: "1" },
  { key: "fatFreeMassKg", label: "Massa magra", unit: "kg", min: 0, max: 250 },
  { key: "subcutaneousFatPercentage", label: "Grasso sottocutaneo", unit: "%", min: 0, max: 100 }
];

export function BodyCompositionScreen({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Values>({});
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [source, setSource] = useState("smart_scale");
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  function switchWeightUnit(next: WeightUnit) {
    if (next === weightUnit) return;
    setWeight((w) => convertWeight(w, weightUnit, next));
    setWeightUnit(next);
  }

  const weightKg = weight.trim() ? toKg(Number(weight), weightUnit) : 0;
  const heightCm = height.trim() ? Number(height) : 0;
  const bmi = weightKg > 0 && heightCm > 0 ? weightKg / ((heightCm / 100) ** 2) : 0;

  async function save() {
    setError("");
    if (!weight.trim()) { setError("Il peso è obbligatorio."); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        measurementType: "BODY_COMPOSITION",
        source,
        recordedAt: new Date(date).toISOString(),
        weightKg: round(weightKg),
        heightCm: heightCm > 0 ? round(heightCm) : undefined,
        notes: notes.trim() || undefined
      };
      for (const f of [...COMPOSITION_PRIMARY, ...COMPOSITION_ADVANCED]) {
        if (values[f.key]?.trim()) payload[f.key] = Number(values[f.key]);
      }
      await apiPost("/api/v1/health-data", token, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Non sono riuscito a salvare la composizione.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      kicker="Composizione corporea · bilancia smart"
      title="Aggiungi composizione corporea"
      subtitle="Valori da bilancia bioimpedenziometrica, non misure col metro."
      onClose={onClose}
      onSubmit={save}
      saving={saving}
      error={error}
      summary={<CompositionSummary weightKg={weightKg} bmi={bmi} bodyFat={values.bodyFatPercentage} muscle={values.muscleMassPercentage} />}
    >
      <section className="panel lg tint-coral weight-entry">
        <div className="panel-head"><span className="dot-ic tint-coral">⚖</span><h3>Peso</h3><span className="badge gray">Obbligatorio</span></div>
        <div className="weight-row">
          <strong>{weight || "0"}</strong>
          <UnitToggle value={weightUnit} options={["kg", "lb"]} onChange={switchWeightUnit} />
          <input type="range" min={weightUnit === "kg" ? 30 : 66} max={weightUnit === "kg" ? 180 : 400} step="0.1" value={weight || (weightUnit === "kg" ? "70" : "154")} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="measure-grid" style={{ marginTop: 12 }}>
          <label className="measure-field"><span>Altezza<em>cm</em></span><input type="number" inputMode="decimal" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="per IMC" /></label>
          <label className="measure-field"><span>IMC / BMI</span><input value={bmi > 0 ? bmi.toFixed(1) : ""} readOnly placeholder="auto" /></label>
        </div>
      </section>

      <section className="panel lg">
        <div className="panel-head"><h3>Valori principali</h3><span className="tag">Bioimpedenza</span></div>
        <div className="measure-grid">
          {COMPOSITION_PRIMARY.map((f) => (
            <MeasureField key={f.key} label={f.label} unit={f.unit} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} min={f.min} max={f.max} />
          ))}
        </div>
      </section>

      <Section title="Valori avanzati" hint="Metabolismo, ossa, proteine">
        {COMPOSITION_ADVANCED.map((f) => (
          <MeasureField key={f.key} label={f.label} unit={f.unit} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} min={f.min} max={f.max} step={f.step ?? "0.1"} />
        ))}
      </Section>

      <section className="panel lg">
        <div className="panel-head"><h3>Origine, data e note</h3></div>
        <label className="form-line">Origine del dato
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <div className="measure-grid">
          <label className="measure-field"><span>Data misurazione</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label className="form-line">Note<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="es. misurato la mattina a digiuno" /></label>
      </section>
    </ModalShell>
  );
}

function CompositionSummary({ weightKg, bmi, bodyFat, muscle }: { weightKg: number; bmi: number; bodyFat?: string; muscle?: string }) {
  return (
    <>
      <section className="panel lg">
        <h3>Anteprima live</h3>
        <div className="preview-grid">
          <div className="panel compact tint-mint"><span className="cap">Peso</span><strong>{weightKg > 0 ? `${weightKg.toFixed(1)} kg` : "—"}</strong><small>salvato in kg</small></div>
          <div className="panel compact"><span className="cap">BMI</span><strong>{bmi > 0 ? bmi.toFixed(1) : "—"}</strong><small>{bmi > 0 ? "da peso e altezza" : "serve altezza"}</small></div>
          <div className="panel compact"><span className="cap">Massa grassa</span><strong>{bodyFat?.trim() ? `${bodyFat}%` : "—"}</strong><small>da bilancia</small></div>
          <div className="panel compact"><span className="cap">Massa muscolare</span><strong>{muscle?.trim() ? `${muscle}%` : "—"}</strong><small>da bilancia</small></div>
        </div>
      </section>
      <section className="panel lg tint-lav"><div className="panel-head"><span className="dot-ic tint-lav">✨</span><h3>Coach</h3></div><p>I valori della bilancia variano con idratazione e ora del giorno: misura in condizioni costanti.</p></section>
      <div className="note">Stime di benessere, non valori clinici. Confronta gli andamenti, non il singolo numero.</div>
    </>
  );
}

// --- History timelines (Progressi / Corpo) ----------------------------------------------------

export function BodyHistoryPanels({ token, refreshKey }: { token: string; refreshKey: number }) {
  const physical = useHistory(token, "PHYSICAL_MEASUREMENT", refreshKey);
  const composition = useHistory(token, "BODY_COMPOSITION", refreshKey);
  return (
    <div className="grid g-32 margin-top">
      <HistoryPanel
        title="Storico misure fisiche"
        state={physical}
        empty="Nessuna misura fisica registrata. Usa “Aggiungi misure fisiche”."
        render={(s) => `${fmt(s.weightKg, "kg")}${s.waistCm ? ` · vita ${fmt(s.waistCm, "cm")}` : ""}${s.chestCm ? ` · torace ${fmt(s.chestCm, "cm")}` : ""}`}
      />
      <HistoryPanel
        title="Storico composizione corporea"
        state={composition}
        empty="Nessuna composizione registrata. Usa “Aggiungi composizione corporea”."
        render={(s) => `${fmt(s.weightKg, "kg")}${s.bodyFatPercentage != null ? ` · grasso ${s.bodyFatPercentage}%` : ""}${s.muscleMassPercentage != null ? ` · muscolo ${s.muscleMassPercentage}%` : ""}`}
      />
    </div>
  );
}

type HistoryState = { status: "loading" | "ready" | "error"; rows: HealthSnapshot[]; error?: string };

function useHistory(token: string, type: MeasurementType, refreshKey: number): HistoryState {
  const [state, setState] = useState<HistoryState>({ status: "loading", rows: [] });
  useEffect(() => {
    let active = true;
    setState({ status: "loading", rows: [] });
    apiGet<HealthSnapshot[]>(`/api/v1/health-data/history?type=${type}`, token)
      .then((rows) => active && setState({ status: "ready", rows }))
      .catch((err) => active && setState({ status: "error", rows: [], error: err instanceof Error ? err.message : "Errore" }));
    return () => { active = false; };
  }, [token, type, refreshKey]);
  return state;
}

function HistoryPanel({ title, state, empty, render }: { title: string; state: HistoryState; empty: string; render: (s: HealthSnapshot) => string }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3>{title}</h3>{state.status === "ready" && state.rows.length > 0 && <span className="badge gray">{state.rows.length}</span>}</div>
      {state.status === "loading" && <div className="empty">Caricamento…</div>}
      {state.status === "error" && <div className="alert">{state.error}</div>}
      {state.status === "ready" && (state.rows.length === 0
        ? <div className="empty">{empty}</div>
        : <div className="list">{state.rows.map((s) => (
            <div className="row" key={s.id}>
              <span className="dot-ic tint-mint">📏</span>
              <span className="row-text"><b>{render(s)}</b><small>{s.source ?? "manuale"}</small></span>
              <em>{formatDate(s.recordedAt)}</em>
            </div>
          ))}</div>)}
    </div>
  );
}

// --- helpers ----------------------------------------------------------------------------------

function round(value: number) { return Math.round(value * 10) / 10; }
function step(value: string, delta: number) { return (Math.round((Number(value || "0") + delta) * 10) / 10).toFixed(1); }
function fmt(value: number | undefined, unit: string) { return value != null ? `${value} ${unit}` : "—"; }
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }); } catch { return ""; }
}
