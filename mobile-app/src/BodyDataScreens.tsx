import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "./theme";
import { saveHealthSnapshot } from "./api";

// ---------------------------------------------------------------------------------------------
// Mobile counterparts of the web body-data redesign: two focused, mobile-friendly entry screens.
//   - PhysicalMeasurementModal: anthropometric tape measurements (cm / inch)
//   - BodyCompositionModal:     smart-scale / bioimpedance values
// Both POST to /api/v1/health-data with a measurementType discriminator.
// ---------------------------------------------------------------------------------------------

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;
type LengthUnit = "cm" | "inch";
type WeightUnit = "kg" | "lb";
const toCm = (v: number, u: LengthUnit) => (u === "cm" ? v : v * CM_PER_INCH);
const toKg = (v: number, u: WeightUnit) => (u === "kg" ? v : v * KG_PER_LB);
const round = (v: number) => Math.round(v * 10) / 10;
function convert(raw: string, factor: number): string {
  if (!raw.trim()) return raw;
  return (Number(raw) * factor).toFixed(1);
}

type Values = Record<string, string>;
type Field = { key: string; label: string };
type Group = { title: string; fields: Field[] };

const PHYSICAL_GROUPS: Group[] = [
  { title: "Core", fields: [
    { key: "neckCm", label: "Neck" }, { key: "waistCm", label: "Waist" }, { key: "abdomenCm", label: "Navel" },
    { key: "hipsCm", label: "Hips" }, { key: "glutesCm", label: "Glutes" }
  ] },
  { title: "Upper body", fields: [
    { key: "shouldersCm", label: "Shoulders" }, { key: "chestCm", label: "Chest" },
    { key: "upperChestCm", label: "Upper chest" }, { key: "wristCm", label: "Wrist" }
  ] },
  { title: "Arms", fields: [
    { key: "rightArmCm", label: "Right arm" }, { key: "leftArmCm", label: "Left arm" },
    { key: "rightForearmCm", label: "Right forearm" }, { key: "leftForearmCm", label: "Left forearm" }
  ] },
  { title: "Lower body", fields: [
    { key: "rightThighCm", label: "Right thigh" }, { key: "leftThighCm", label: "Left thigh" },
    { key: "rightCalfCm", label: "Right calf" }, { key: "leftCalfCm", label: "Left calf" }, { key: "ankleCm", label: "Ankle" }
  ] }
];

const COMPOSITION_PRIMARY: Field[] = [
  { key: "bodyFatPercentage", label: "Body fat %" }, { key: "muscleMassPercentage", label: "Muscle mass %" },
  { key: "waterPercentage", label: "Water %" }, { key: "visceralFat", label: "Visceral fat" }
];
const COMPOSITION_ADVANCED: Field[] = [
  { key: "skeletalMusclePercentage", label: "Skeletal muscle %" }, { key: "boneMassKg", label: "Bone mass kg" },
  { key: "proteinPercentage", label: "Protein %" }, { key: "basalMetabolicRate", label: "BMR kcal" },
  { key: "metabolicAge", label: "Metabolic age" }, { key: "fatFreeMassKg", label: "Fat-free mass kg" },
  { key: "subcutaneousFatPercentage", label: "Subcutaneous fat %" }
];
const SOURCES = ["smart_scale", "manual", "import", "ai_assistant"];
const SOURCE_LABELS: Record<string, string> = { smart_scale: "Smart scale", manual: "Manual", import: "Import", ai_assistant: "AI assistant" };

// --- shared primitives ------------------------------------------------------------------------

function NumberField({ label, suffix, value, onChange }: { label: string; suffix?: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{suffix ? ` (${suffix})` : ""}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={theme.colors.muted} returnKeyType="done" />
    </View>
  );
}

function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHead} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.chev}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open && <View style={styles.grid}>{children}</View>}
    </View>
  );
}

function Segmented({ value, options, labels, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => (
        <Pressable key={opt} style={[styles.segItem, value === opt && styles.segActive]} onPress={() => onChange(opt)}>
          <Text style={[styles.segText, value === opt && styles.segTextActive]}>{labels?.[opt] ?? opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Shell({ title, subtitle, onClose, onSave, saving, error, children }: {
  title: string; subtitle: string; onClose: () => void; onSave: () => void; saving: boolean; error: string; children: React.ReactNode;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetFull}>
        <View style={styles.sheetHandle} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.note}>Wellness data only — not a clinical interpretation.</Text>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={onSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WeightCard({ weight, onWeight, weightUnit, onUnit }: { weight: string; onWeight: (v: string) => void; weightUnit: WeightUnit; onUnit: (u: WeightUnit) => void }) {
  return (
    <View style={[styles.section, styles.weightCard]}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Weight</Text>
        <Segmented value={weightUnit} options={["kg", "lb"]} onChange={(v) => onUnit(v as WeightUnit)} />
      </View>
      <TextInput style={[styles.input, styles.weightInput]} value={weight} onChangeText={onWeight} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.colors.muted} returnKeyType="done" />
      <Text style={styles.required}>Required</Text>
    </View>
  );
}

const today = () => new Date().toLocaleDateString();

// --- Screen 1: physical measurements ----------------------------------------------------------

export function PhysicalMeasurementModal({ token, onClose, onSaved }: { token?: string; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Values>({});
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  function switchLength(next: LengthUnit) {
    if (next === lengthUnit) return;
    const factor = next === "cm" ? CM_PER_INCH : 1 / CM_PER_INCH;
    setHeight((h) => convert(h, factor));
    setValues((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, convert(val, factor)])));
    setLengthUnit(next);
  }
  function switchWeight(next: WeightUnit) {
    if (next === weightUnit) return;
    setWeight((w) => convert(w, next === "kg" ? KG_PER_LB : 1 / KG_PER_LB));
    setWeightUnit(next);
  }

  const weightKg = weight.trim() ? toKg(Number(weight), weightUnit) : 0;
  const heightCm = height.trim() ? toCm(Number(height), lengthUnit) : 0;
  const bmi = weightKg > 0 && heightCm > 0 ? weightKg / (heightCm / 100) ** 2 : 0;

  async function save() {
    setError("");
    if (!weight.trim()) { setError("Weight is required."); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        measurementType: "PHYSICAL_MEASUREMENT", source: "manual",
        recordedAt: new Date().toISOString(), weightKg: round(weightKg),
      };
      if (heightCm > 0) payload.heightCm = round(heightCm);
      if (notes.trim()) payload.notes = notes.trim();
      for (const group of PHYSICAL_GROUPS) for (const f of group.fields) {
        if (values[f.key]?.trim()) payload[f.key] = round(toCm(Number(values[f.key]), lengthUnit));
      }
      await saveHealthSnapshot(token, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save measurements.");
    } finally { setSaving(false); }
  }

  return (
    <Shell title="Physical measurements" subtitle={`Tape measurements · ${today()}`} onClose={onClose} onSave={save} saving={saving} error={error}>
      <WeightCard weight={weight} onWeight={setWeight} weightUnit={weightUnit} onUnit={switchWeight} />
      <View style={[styles.section, styles.toolbar]}>
        <Text style={styles.sectionTitle}>Length unit</Text>
        <Segmented value={lengthUnit} options={["cm", "inch"]} onChange={(v) => switchLength(v as LengthUnit)} />
      </View>
      <View style={styles.section}>
        <View style={styles.grid}>
          <NumberField label="Height" suffix={lengthUnit} value={height} onChange={setHeight} />
          <View style={styles.field}><Text style={styles.fieldLabel}>BMI</Text><Text style={styles.readonly}>{bmi > 0 ? bmi.toFixed(1) : "—"}</Text></View>
        </View>
      </View>
      {PHYSICAL_GROUPS.map((group, i) => (
        <Collapsible key={group.title} title={group.title} defaultOpen={i === 0}>
          {group.fields.map((f) => <NumberField key={f.key} label={f.label} suffix={lengthUnit} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />)}
        </Collapsible>
      ))}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline placeholder="e.g. measured fasted in the morning" placeholderTextColor={theme.colors.muted} />
      </View>
    </Shell>
  );
}

// --- Screen 2: body composition ---------------------------------------------------------------

export function BodyCompositionModal({ token, onClose, onSaved }: { token?: string; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Values>({});
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("smart_scale");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  function switchWeight(next: WeightUnit) {
    if (next === weightUnit) return;
    setWeight((w) => convert(w, next === "kg" ? KG_PER_LB : 1 / KG_PER_LB));
    setWeightUnit(next);
  }

  const weightKg = weight.trim() ? toKg(Number(weight), weightUnit) : 0;
  const heightCm = height.trim() ? Number(height) : 0;
  const bmi = weightKg > 0 && heightCm > 0 ? weightKg / (heightCm / 100) ** 2 : 0;

  async function save() {
    setError("");
    if (!weight.trim()) { setError("Weight is required."); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        measurementType: "BODY_COMPOSITION", source,
        recordedAt: new Date().toISOString(), weightKg: round(weightKg),
      };
      if (heightCm > 0) payload.heightCm = round(heightCm);
      if (notes.trim()) payload.notes = notes.trim();
      for (const f of [...COMPOSITION_PRIMARY, ...COMPOSITION_ADVANCED]) {
        if (values[f.key]?.trim()) payload[f.key] = Number(values[f.key]);
      }
      await saveHealthSnapshot(token, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save composition.");
    } finally { setSaving(false); }
  }

  return (
    <Shell title="Body composition" subtitle={`Smart-scale values · ${today()}`} onClose={onClose} onSave={save} saving={saving} error={error}>
      <WeightCard weight={weight} onWeight={setWeight} weightUnit={weightUnit} onUnit={switchWeight} />
      <View style={styles.section}>
        <View style={styles.grid}>
          <NumberField label="Height" suffix="cm" value={height} onChange={setHeight} />
          <View style={styles.field}><Text style={styles.fieldLabel}>BMI / IMC</Text><Text style={styles.readonly}>{bmi > 0 ? bmi.toFixed(1) : "—"}</Text></View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key values</Text>
        <View style={styles.grid}>
          {COMPOSITION_PRIMARY.map((f) => <NumberField key={f.key} label={f.label} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />)}
        </View>
      </View>
      <Collapsible title="Advanced values">
        {COMPOSITION_ADVANCED.map((f) => <NumberField key={f.key} label={f.label} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />)}
      </Collapsible>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source</Text>
        <Segmented value={source} options={SOURCES} labels={SOURCE_LABELS} onChange={setSource} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline placeholder="e.g. measured fasted in the morning" placeholderTextColor={theme.colors.muted} />
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(32,49,63,0.28)" },
  sheetFull: { position: "absolute", left: 0, right: 0, bottom: 0, top: 48, backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", width: 48, height: 5, borderRadius: 99, backgroundColor: theme.colors.line },
  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: theme.colors.muted, fontSize: 13, fontWeight: "700", marginTop: 3 },
  cancel: { color: theme.colors.muted, fontWeight: "800", paddingVertical: 4 },
  body: { padding: 20, paddingBottom: 28, gap: 14 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.line, backgroundColor: theme.colors.surface },
  saveButton: { minHeight: 52, borderRadius: theme.radius.full, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  disabled: { opacity: 0.5 },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, padding: 16, gap: 12 },
  weightCard: { backgroundColor: "#fff0ea", borderColor: "#ffd8cf" },
  weightInput: { fontSize: 30, fontWeight: "900", minHeight: 60 },
  required: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "800" },
  chev: { color: theme.colors.muted, fontSize: 22, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { flexGrow: 1, flexBasis: "44%", gap: 6 },
  fieldLabel: { color: theme.colors.muted, fontSize: 12.5, fontWeight: "800" },
  input: { minHeight: 46, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface, paddingHorizontal: 12, color: theme.colors.text, fontWeight: "700" },
  readonly: { minHeight: 46, lineHeight: 46, color: theme.colors.text, fontWeight: "800", fontSize: 16 },
  notesInput: { minHeight: 70, textAlignVertical: "top", paddingTop: 10 },
  segmented: { flexDirection: "row", backgroundColor: theme.colors.background, borderRadius: theme.radius.full, padding: 4, gap: 4, flexShrink: 1, flexWrap: "wrap" },
  segItem: { borderRadius: theme.radius.full, paddingHorizontal: 12, minHeight: 34, alignItems: "center", justifyContent: "center" },
  segActive: { backgroundColor: theme.colors.primary },
  segText: { color: theme.colors.muted, fontWeight: "800", fontSize: 12 },
  segTextActive: { color: "#fff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  error: { color: theme.colors.error, fontWeight: "700", fontSize: 13 },
  note: { color: theme.colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 }
});
