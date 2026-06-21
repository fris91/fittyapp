import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/theme";
import {
  getHealthHistory,
  getTodaySummary,
  loginIdentity,
  registerIdentity,
  saveHealthSnapshot,
  saveMealLog,
  type HealthSnapshot,
  type TodaySummary
} from "./src/api";
import { clearSession, FittySession, loadSession, saveSession, sessionFromIdentity, sessionFromLogin } from "./src/session";
import { BodyCompositionModal, PhysicalMeasurementModal } from "./src/BodyDataScreens";

type Tab = "today" | "progress" | "plans" | "coach";
type PlansView = "overview" | "training" | "nutrition" | "recipes";
type OnboardingStep = "welcome" | "login" | "goal" | "body" | "activity" | "connect" | "account" | "building" | "done";
type AsyncState = "empty" | "loading" | "error" | "ready";
type LogType = "meal" | "workout" | "body" | "water";

type Onboarding = {
  goal: string;
  sex: string;
  age: number;
  height: number;
  weight: number;
  activity: string;
  connectedProvider: string;
  consent: boolean;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const initialOnboarding: Onboarding = {
  goal: "Feel healthier",
  sex: "F",
  age: 29,
  height: 168,
  weight: 64,
  activity: "Lightly active",
  connectedProvider: "",
  consent: false,
  firstName: "",
  lastName: "",
  email: "",
  password: ""
};

const integrationState: AsyncState = "empty";

export default function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [tab, setTab] = useState<Tab>("today");
  const [plansView, setPlansView] = useState<PlansView>("overview");
  const [trainingView, setTrainingView] = useState<"plan" | "exercise" | "progress">("plan");
  const [nutritionView, setNutritionView] = useState<"today" | "plan">("today");
  const [coachState, setCoachState] = useState<AsyncState>("ready");
  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState<LogType>("meal");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authState, setAuthState] = useState<AsyncState>("empty");
  const [authError, setAuthError] = useState("");
  const [session, setSession] = useState<FittySession | null>(null);
  const [bootState, setBootState] = useState<AsyncState>("loading");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const hasCompletedOnboarding = Boolean(session) || onboardingStep === "done";

  useEffect(() => {
    loadSession()
      .then((storedSession) => {
        setSession(storedSession);
        setBootState("ready");
      })
      .catch(() => setBootState("ready"));
  }, []);

  function nextStep() {
    const order: OnboardingStep[] = ["welcome", "goal", "body", "activity", "connect", "account", "building", "done"];
    const currentIndex = order.indexOf(onboardingStep);
    setOnboardingStep(order[Math.min(currentIndex + 1, order.length - 1)]);
  }

  async function registerFromOnboarding() {
    setAuthState("loading");
    setAuthError("");
    try {
      const response = await registerIdentity({
        email: onboarding.email.trim(),
        password: onboarding.password,
        firstName: onboarding.firstName.trim(),
        lastName: onboarding.lastName.trim(),
        locale: "it-IT",
        subscriptionPlan: "FREE",
        goals: [onboarding.goal],
        bodyBasics: {
          sex: onboarding.sex,
          age: onboarding.age,
          heightCm: onboarding.height,
          weightKg: onboarding.weight
        },
        activityProfile: {
          activityLevel: onboarding.activity,
          connectedProvider: onboarding.connectedProvider || undefined
        },
        consent: {
          wellnessDataProcessing: onboarding.consent,
          medicalBoundaryAccepted: onboarding.consent,
          marketing: false
        }
      });
      const nextSession = sessionFromIdentity(response);
      if (nextSession) {
        await saveSession(nextSession);
        setSession(nextSession);
      }
      setAuthState("ready");
      setOnboardingStep("building");
    } catch (error) {
      setAuthState("error");
      setAuthError(error instanceof Error ? error.message : "Registration failed");
    }
  }

  async function loginWithPassword() {
    setAuthState("loading");
    setAuthError("");
    try {
      const token = await loginIdentity(loginEmail.trim(), loginPassword);
      const nextSession = sessionFromLogin(token, loginEmail.trim());
      if (!nextSession) {
        throw new Error("Login did not return a usable access token");
      }
      await saveSession(nextSession);
      setSession(nextSession);
      setAuthState("ready");
    } catch (error) {
      setAuthState("error");
      setAuthError(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function logout() {
    await clearSession();
    setSession(null);
    setOnboardingStep("welcome");
    setAuthState("empty");
    setLoginPassword("");
  }

  if (bootState === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.onboardingCenter}>
          <ProgressRing label="..." progress={55} color={theme.colors.accent} size={92} />
          <Text style={styles.heroTitle}>Opening Fitty</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        {onboardingStep === "login" ? (
          <LoginScreen
            email={loginEmail}
            password={loginPassword}
            authState={authState}
            authError={authError}
            onEmail={setLoginEmail}
            onPassword={setLoginPassword}
            onLogin={loginWithPassword}
            onBack={() => setOnboardingStep("welcome")}
          />
        ) : (
          <OnboardingScreen
            step={onboardingStep}
            data={onboarding}
            onChange={setOnboarding}
            onNext={nextStep}
            onLogin={() => setOnboardingStep("login")}
            onRegister={registerFromOnboarding}
            authState={authState}
            authError={authError}
            onDone={() => setOnboardingStep("done")}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <Header name={session?.firstName || onboarding.firstName || "Fitty"} onSettings={() => setSettingsOpen(true)} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === "today" && <TodayScreen token={session?.token.accessToken} onLog={() => setLogOpen(true)} />}
          {tab === "progress" && <ProgressScreen token={session?.token.accessToken} />}
          {tab === "plans" && (
            <PlansScreen
              view={plansView}
              onView={setPlansView}
              trainingView={trainingView}
              onTrainingView={setTrainingView}
              nutritionView={nutritionView}
              onNutritionView={setNutritionView}
            />
          )}
          {tab === "coach" && <CoachScreen state={coachState} />}
        </ScrollView>
        <BottomNav tab={tab} onTab={setTab} onLog={() => setLogOpen(true)} />
      </View>
      <QuickLogSheet
        visible={logOpen}
        type={logType}
        onType={setLogType}
        token={session?.token.accessToken}
        onClose={() => setLogOpen(false)}
      />
      <SettingsSheet
        visible={settingsOpen}
        onboarding={onboarding}
        session={session}
        onLogout={logout}
        onClose={() => setSettingsOpen(false)}
      />
    </SafeAreaView>
  );
}

function OnboardingScreen({
  step,
  data,
  onChange,
  onNext,
  onLogin,
  onRegister,
  authState,
  authError,
  onDone
}: {
  step: OnboardingStep;
  data: Onboarding;
  onChange: (next: Onboarding) => void;
  onNext: () => void;
  onLogin: () => void;
  onRegister: () => void;
  authState: AsyncState;
  authError: string;
  onDone: () => void;
}) {
  const stepNumber = ["goal", "body", "activity", "connect", "account"].indexOf(step) + 1;
  const progress = step === "welcome" ? 0 : Math.max(20, stepNumber * 20);

  if (step === "welcome") {
    return (
      <View style={styles.onboardingCenter}>
        <View style={styles.heroOrb}><Text style={styles.heroOrbText}>F</Text></View>
        <Text style={styles.heroTitle}>Hi, I am Fitty</Text>
        <Text style={styles.lead}>Your friendly wellness companion. Let us set you up in a minute.</Text>
        <View style={styles.dots}><View style={styles.dotActive} /><View style={styles.dot} /><View style={styles.dot} /></View>
        <Button label="Get started" onPress={onNext} />
        <Pressable style={styles.textButton} onPress={onLogin}><Text style={styles.textButtonText}>I already have an account</Text></Pressable>
      </View>
    );
  }

  if (step === "building") {
    return (
      <View style={styles.onboardingCenter}>
        <ProgressRing label="70%" progress={70} color={theme.colors.accent} size={112} />
        <Text style={styles.heroTitle}>Building your plan...</Text>
        <View style={styles.stack}>
          <StatusRow done text="Read your goal" />
          <StatusRow done text="Set your targets" />
          <StatusRow text="Picking first moves..." />
        </View>
        <Button label="Show my first home" onPress={onDone} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.caption}>Step {stepNumber} of 5</Text>
        {step !== "account" && <Pressable onPress={onNext}><Text style={styles.caption}>Skip</Text></Pressable>}
      </View>
      <ProgressBar progress={progress} />
      {step === "goal" && (
        <OnboardingCard title="What brings you here?">
          {["Lose weight", "Build muscle", "Eat better", "Feel healthier", "Sleep and recover"].map((goal) => (
            <Choice
              key={goal}
              label={goal}
              selected={data.goal === goal}
              onPress={() => onChange({ ...data, goal })}
            />
          ))}
          <Button label="Continue" onPress={onNext} />
        </OnboardingCard>
      )}
      {step === "body" && (
        <OnboardingCard title="A bit about you">
          <View style={styles.gridTwo}>
            <MetricAdjust label="Age" value={data.age} onMinus={() => onChange({ ...data, age: data.age - 1 })} onPlus={() => onChange({ ...data, age: data.age + 1 })} />
            <View style={styles.miniCard}>
              <Text style={styles.caption}>Sex</Text>
              <View style={styles.segment}>
                {["F", "M"].map((sex) => (
                  <Pressable key={sex} onPress={() => onChange({ ...data, sex })} style={[styles.segmentItem, data.sex === sex && styles.segmentActive]}>
                    <Text style={[styles.segmentText, data.sex === sex && styles.segmentTextActive]}>{sex}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <MetricAdjust label="Height" suffix="cm" value={data.height} onMinus={() => onChange({ ...data, height: data.height - 1 })} onPlus={() => onChange({ ...data, height: data.height + 1 })} />
          <MetricAdjust label="Weight" suffix="kg" value={data.weight} onMinus={() => onChange({ ...data, weight: data.weight - 1 })} onPlus={() => onChange({ ...data, weight: data.weight + 1 })} />
          <Button label="Continue" onPress={onNext} />
        </OnboardingCard>
      )}
      {step === "activity" && (
        <OnboardingCard title="How active are you?">
          {["Mostly resting", "Lightly active", "Very active"].map((activity) => (
            <Choice
              key={activity}
              label={activity}
              helper={activity === "Lightly active" ? "1-2 times / week" : activity === "Very active" ? "4+ times / week" : "little exercise"}
              selected={data.activity === activity}
              onPress={() => onChange({ ...data, activity })}
            />
          ))}
          <Button label="Continue" onPress={onNext} />
        </OnboardingCard>
      )}
      {step === "connect" && (
        <OnboardingCard title="Sync your data?">
          <Text style={styles.leadSmall}>Connect a source so steps, sleep and weight fill in automatically.</Text>
          {["Google Fit", "Apple Health", "Health Connect"].map((provider) => (
            <Choice
              key={provider}
              label={provider}
              helper={provider === "Google Fit" ? "Placeholder integration" : "Coming soon"}
              selected={data.connectedProvider === provider}
              onPress={() => onChange({ ...data, connectedProvider: provider })}
            />
          ))}
          <Button label={data.connectedProvider ? "Continue" : "Maybe later"} onPress={onNext} variant={data.connectedProvider ? "primary" : "ghost"} />
        </OnboardingCard>
      )}
      {step === "account" && (
        <OnboardingCard title="Save your plan">
          <Button label="Continue with Google" onPress={() => {}} variant="ghost" />
          <Button label="Continue with Facebook" onPress={() => {}} variant="ghost" />
          <TextInput style={styles.input} placeholder="First name" placeholderTextColor={theme.colors.muted} value={data.firstName} onChangeText={(firstName) => onChange({ ...data, firstName })} returnKeyType="next" />
          <TextInput style={styles.input} placeholder="Last name" placeholderTextColor={theme.colors.muted} value={data.lastName} onChangeText={(lastName) => onChange({ ...data, lastName })} returnKeyType="next" />
          <TextInput style={styles.input} placeholder="email@you.com" placeholderTextColor={theme.colors.muted} value={data.email} onChangeText={(email) => onChange({ ...data, email })} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
          <TextInput style={styles.input} placeholder="password" placeholderTextColor={theme.colors.muted} value={data.password} onChangeText={(password) => onChange({ ...data, password })} secureTextEntry returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
          <Pressable style={styles.consentRow} onPress={() => onChange({ ...data, consent: !data.consent })}>
            <View style={[styles.checkbox, data.consent && styles.checkboxOn]} />
            <Text style={styles.consentText}>I agree to wellness use and privacy. Wellness guidance, not medical advice.</Text>
          </Pressable>
          {authState === "error" && <Text style={styles.errorText}>{authError}</Text>}
          <Button label={authState === "loading" ? "Creating..." : "Create my plan"} onPress={onRegister} disabled={!data.consent || !data.email || !data.password || !data.firstName || !data.lastName || authState === "loading"} />
        </OnboardingCard>
      )}
    </ScrollView>
  );
}

function LoginScreen({
  email,
  password,
  authState,
  authError,
  onEmail,
  onPassword,
  onLogin,
  onBack
}: {
  email: string;
  password: string;
  authState: AsyncState;
  authError: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.stack}>
        <Pressable style={styles.textButton} onPress={onBack}><Text style={styles.textButtonText}>Back</Text></Pressable>
        <Text style={styles.heroTitle}>Welcome back</Text>
        <Text style={styles.leadSmall}>Sign in with your Fitty account. Your token is stored locally and used for protected API calls.</Text>
        <TextInput style={styles.input} placeholder="email@you.com" placeholderTextColor={theme.colors.muted} value={email} onChangeText={onEmail} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
        <TextInput style={styles.input} placeholder="password" placeholderTextColor={theme.colors.muted} value={password} onChangeText={onPassword} secureTextEntry returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
        {authState === "error" && <Text style={styles.errorText}>{authError}</Text>}
        <Button label={authState === "loading" ? "Signing in..." : "Sign in"} onPress={onLogin} disabled={!email || !password || authState === "loading"} />
      </View>
    </ScrollView>
  );
}

function Header({ name, onSettings }: { name: string; onSettings: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.caption}>Good morning,</Text>
        <Text style={styles.title}>{name}</Text>
      </View>
      <Pressable style={styles.avatar} onPress={onSettings} accessibilityLabel="Open profile settings">
        <Text style={styles.avatarText}>{name[0]}</Text>
      </Pressable>
    </View>
  );
}

function TodayScreen({ token, onLog }: { token?: string; onLog: () => void }) {
  const [state, setState] = useState<AsyncState>("loading");
  const [data, setData] = useState<TodaySummary | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setError("");
    getTodaySummary(token)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load Today");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  if (state === "loading") {
    return <SkeletonStack />;
  }

  if (state === "error" || !data) {
    return (
      <View style={styles.stack}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today needs a refresh</Text>
          <Text style={styles.cardText}>{error || "We could not load your day. Your data is safe."}</Text>
          <Pressable style={styles.chip} onPress={() => setReloadKey((key) => key + 1)}>
            <Text style={styles.chipText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const streak = Math.max(0, Math.min(7, data.streakDays ?? 0));

  return (
    <View style={styles.stack}>
      <View style={[styles.card, styles.focusCard]}>
        <Text style={styles.cardKicker}>Your focus</Text>
        <Text style={styles.cardTitle}>{data.focus}</Text>
        <Text style={styles.cardText}>A small, doable move keeps momentum without making the day feel heavy.</Text>
        <View style={styles.row}>
          <Button label="Do it" onPress={onLog} compact />
          <Pressable style={styles.chip}><Text style={styles.chipText}>Why this?</Text></Pressable>
        </View>
      </View>
      <View style={styles.ringGrid}>
        <RingCard label="Move" value={`${data.rings.move}%`} progress={data.rings.move} color={theme.colors.primary} />
        <RingCard label="Meals" value={`${data.rings.meals}%`} progress={data.rings.meals} color={theme.colors.secondary} />
        <RingCard label="Body" value={`${data.rings.body}%`} progress={data.rings.body} color={theme.colors.accent} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardKicker}>Weekly streak</Text>
        <View style={styles.streakRow}>
          {dayLetters.map((day, index) => (
            <View key={`${day}-${index}`} style={[styles.streakDot, index < streak && styles.streakDone]}>
              <Text style={[styles.streakText, index < streak && styles.streakTextDone]}>{day}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardText}>
          {streak === 0
            ? "No logs yet this week. The first one is the hardest, then it gets light."
            : `${streak} gentle ${streak === 1 ? "win" : "wins"} this week. Keep it light and consistent.`}
        </Text>
      </View>
      <View style={[styles.card, styles.aiCard]}>
        <Text style={styles.cardKicker}>Coach</Text>
        <Text style={styles.cardTitle}>{data.coachLine}</Text>
        <Text style={styles.cardText}>You will get encouraging feedback right away, never a scorecard.</Text>
        {data.disclaimer && <Text style={styles.disclaimer}>{data.disclaimer}</Text>}
      </View>
    </View>
  );
}

function ProgressScreen({ token }: { token?: string }) {
  const [physical, setPhysical] = useState<HealthSnapshot[]>([]);
  const [composition, setComposition] = useState<HealthSnapshot[]>([]);
  const [state, setState] = useState<AsyncState>("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<"physical" | "composition" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setError("");
    Promise.all([getHealthHistory(token, "PHYSICAL_MEASUREMENT"), getHealthHistory(token, "BODY_COMPOSITION")])
      .then(([phys, comp]) => {
        if (cancelled) return;
        setPhysical(phys);
        setComposition(comp);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load progress");
        setState("error");
      });
    return () => { cancelled = true; };
  }, [token, reloadKey]);

  const handleSaved = () => { setModal(null); setReloadKey((k) => k + 1); };
  const weightTrend = composition.concat(physical)
    .filter((s) => typeof s.weightKg === "number")
    .slice(0, 8)
    .reverse()
    .map((s) => s.weightKg as number);
  const latestWeight = weightTrend.length ? weightTrend[weightTrend.length - 1] : undefined;
  const latestComposition = composition[0];

  return (
    <View style={styles.stack}>
      <View style={styles.ringGrid}>
        <Pressable style={[styles.logType, styles.logTypeActive, { flex: 1 }]} onPress={() => setModal("physical")}>
          <Text style={styles.logTypeTextActive}>+ Physical measurements</Text>
        </Pressable>
        <Pressable style={[styles.logType, styles.logTypeActive, { flex: 1 }]} onPress={() => setModal("composition")}>
          <Text style={styles.logTypeTextActive}>+ Body composition</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>Latest body data</Text>
        <View style={styles.macroRow}>
          <MacroPill label="Weight" value={latestWeight != null ? `${latestWeight} kg` : "—"} />
          <MacroPill label="Body fat" value={latestComposition?.bodyFatPercentage != null ? `${latestComposition.bodyFatPercentage}%` : "—"} />
          <MacroPill label="Muscle" value={latestComposition?.muscleMassPercentage != null ? `${latestComposition.muscleMassPercentage}%` : "—"} />
        </View>
      </View>

      {state === "loading" && <SkeletonStack />}
      {state === "error" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress needs a refresh</Text>
          <Text style={styles.cardText}>{error || "We could not load your history."}</Text>
          <Pressable style={styles.chip} onPress={() => setReloadKey((k) => k + 1)}><Text style={styles.chipText}>Retry</Text></Pressable>
        </View>
      )}

      {state === "ready" && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardKicker}>Weight trend</Text>
            {weightTrend.length > 1 ? (
              <View style={styles.chart}>
                {normalizeBars(weightTrend).map((height, index) => <View key={index} style={[styles.bar, { height }]} />)}
              </View>
            ) : (
              <Text style={styles.cardText}>Log at least two entries to see your weight trend.</Text>
            )}
          </View>

          <BodyHistoryCard title="Physical measurements" rows={physical}
            empty="No tape measurements yet. Tap “+ Physical measurements”."
            line={(s) => `${val(s.weightKg, "kg")}${s.waistCm ? ` · waist ${val(s.waistCm, "cm")}` : ""}`} />
          <BodyHistoryCard title="Body composition" rows={composition}
            empty="No smart-scale entries yet. Tap “+ Body composition”."
            line={(s) => `${val(s.weightKg, "kg")}${s.bodyFatPercentage != null ? ` · fat ${s.bodyFatPercentage}%` : ""}`} />
        </>
      )}

      {modal === "physical" && <PhysicalMeasurementModal token={token} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {modal === "composition" && <BodyCompositionModal token={token} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </View>
  );
}

function BodyHistoryCard({ title, rows, empty, line }: { title: string; rows: HealthSnapshot[]; empty: string; line: (s: HealthSnapshot) => string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardKicker}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.cardText}>{empty}</Text>
      ) : (
        <View style={styles.stackSmall}>
          {rows.slice(0, 6).map((s) => (
            <View key={s.id} style={styles.exerciseRow}>
              <View>
                <Text style={styles.exerciseName}>{line(s)}</Text>
                <Text style={styles.caption}>{s.source ?? "manual"}</Text>
              </View>
              <Text style={styles.caption}>{formatDate(s.recordedAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function normalizeBars(values: number[]): number[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return values.map(() => 70);
  return values.map((v) => 36 + ((v - min) / (max - min)) * 64);
}

function val(value: number | undefined, unit: string) { return value != null ? `${value} ${unit}` : "—"; }
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(); } catch { return ""; }
}

function TrainingScreen({ view, onView }: { view: "plan" | "exercise" | "progress"; onView: (view: "plan" | "exercise" | "progress") => void }) {
  return (
    <View style={styles.stack}>
      <SegmentedControl
        items={[
          ["plan", "Plan"],
          ["exercise", "Exercise"],
          ["progress", "Strength"]
        ]}
        value={view}
        onChange={(next) => onView(next as "plan" | "exercise" | "progress")}
      />
      {view === "plan" && (
        <>
          <View style={[styles.card, styles.focusCard]}>
            <Text style={styles.cardKicker}>Today training</Text>
            <Text style={styles.cardTitle}>Full body foundation</Text>
            <Text style={styles.cardText}>3 exercises, light volume, focused on learning execution before chasing load.</Text>
            <View style={styles.exerciseList}>
              <ExerciseRow name="Goblet squat" sets="3 x 8" load="12 kg" />
              <ExerciseRow name="Dumbbell row" sets="3 x 10" load="8 kg" />
              <ExerciseRow name="Incline push-up" sets="3 x 8" load="body" />
            </View>
          </View>
          <StateCard title="Generated plans stay editable" text="Before AI generation Fitty will ask days per week, injuries, equipment and difficulty." action="Prepare workout plan" />
        </>
      )}
      {view === "exercise" && (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>Execution</Text>
          <Text style={styles.cardTitle}>Goblet squat</Text>
          <Text style={styles.cardText}>Keep chest tall, knees tracking toes, and stop with two comfortable reps left.</Text>
          <View style={styles.gridTwo}>
            <Dial label="Set" value="1 / 3" />
            <Dial label="Weight" value="12 kg" />
            <Dial label="Reps" value="8" />
            <Dial label="RPE" value="7" />
          </View>
          <Text style={styles.positiveLine}>Estimated burn: 42 kcal. Strength trend will update after saving.</Text>
        </View>
      )}
      {view === "progress" && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardKicker}>Strength progress</Text>
            <Text style={styles.cardTitle}>Goblet squat +2 kg in 2 weeks</Text>
            <View style={styles.chart}>
              {[36, 44, 52, 58, 66, 72, 80].map((height, index) => <View key={index} style={[styles.bar, { height, backgroundColor: theme.colors.primary }]} />)}
            </View>
            <Text style={styles.cardText}>Fitty tracks load, reps, estimated volume and perceived effort.</Text>
          </View>
          <StateCard title="Resistance history" text="Endurance and force trends will become more accurate as you log sessions." action="View details" soft />
        </>
      )}
    </View>
  );
}

function NutritionScreen({ view, onView }: { view: "today" | "plan"; onView: (view: "today" | "plan") => void }) {
  return (
    <View style={styles.stack}>
      <SegmentedControl
        items={[
          ["today", "Today"],
          ["plan", "Plan"]
        ]}
        value={view}
        onChange={(next) => onView(next as "today" | "plan")}
      />
      {view === "today" && (
        <>
          <View style={[styles.card, styles.focusCard]}>
            <Text style={styles.cardKicker}>Meal momentum</Text>
            <Text style={styles.cardTitle}>120 kcal under goal</Text>
            <Text style={styles.cardText}>Nice room for a balanced snack later. No pressure, just a useful signal.</Text>
            <View style={styles.macroRow}>
              <MacroPill label="Protein" value="42 g" />
              <MacroPill label="Carbs" value="116 g" />
              <MacroPill label="Fat" value="38 g" />
            </View>
          </View>
          <StateCard title="No meal photo yet" text="Plate recognition will return approximate calories and macros, clearly labelled as an estimate." action="Scan meal" />
        </>
      )}
      {view === "plan" && (
        <>
          <StateCard title="No nutrition plan yet" text="Fitty will use goals, body composition, preferences and subscription before generating." action="Prepare nutrition plan" />
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.cardKicker}>AI boundary</Text>
            <Text style={styles.cardText}>Generated nutrition is editable wellness guidance, not medical advice.</Text>
          </View>
        </>
      )}
    </View>
  );
}

function RecipesPanel() {
  return (
    <View style={styles.stack}>
      <RecipeCard title="Mint yogurt bowl" meta="28g protein - 420 kcal" />
      <RecipeCard title="Coral lentil salad" meta="24g protein - 510 kcal" />
      <RecipeCard title="Lavender berry oats" meta="18g protein - 460 kcal" />
    </View>
  );
}

function PlansScreen({
  view,
  onView,
  trainingView,
  onTrainingView,
  nutritionView,
  onNutritionView
}: {
  view: PlansView;
  onView: (view: PlansView) => void;
  trainingView: "plan" | "exercise" | "progress";
  onTrainingView: (view: "plan" | "exercise" | "progress") => void;
  nutritionView: "today" | "plan";
  onNutritionView: (view: "today" | "plan") => void;
}) {
  return (
    <View style={styles.stack}>
      <SegmentedControl
        items={[
          ["overview", "Plans"],
          ["training", "Training"],
          ["nutrition", "Nutrition"],
          ["recipes", "Recipes"]
        ]}
        value={view}
        onChange={(next) => onView(next as PlansView)}
      />
      {view === "overview" && <PlansOverview />}
      {view === "training" && <TrainingScreen view={trainingView} onView={onTrainingView} />}
      {view === "nutrition" && <NutritionScreen view={nutritionView} onView={onNutritionView} />}
      {view === "recipes" && <RecipesPanel />}
    </View>
  );
}

function PlansOverview() {
  return (
    <View style={styles.stack}>
      <StateCard title="No nutrition plan yet" text="Fitty will ask a few missing inputs, then generate an editable plan." action="Prepare nutrition plan" />
      <StateCard title="No workout plan yet" text="Tell Fitty days per week, injuries and equipment before generating." action="Prepare workout plan" />
      <View style={[styles.card, styles.warningCard]}>
        <Text style={styles.cardKicker}>AI boundary</Text>
        <Text style={styles.cardText}>Generated plans are editable wellness guidance, not medical advice.</Text>
      </View>
    </View>
  );
}

function CoachScreen({ state }: { state: AsyncState }) {
  if (state === "loading") return <SkeletonStack />;
  if (state === "error") return <StateCard title="Coach is taking a breath" text="Recommendations could not load. Your data is safe." action="Retry" />;
  if (state === "empty") return <StateCard title="No recommendations yet" text="Log a meal, body entry or activity to help Fitty respond personally." action="Log something" />;

  return (
    <View style={styles.stack}>
      <View style={[styles.card, styles.aiCard]}>
        <Text style={styles.cardKicker}>Coach thread</Text>
        <Text style={styles.cardTitle}>Want a simple day-one plan?</Text>
        <Text style={styles.cardText}>I can start with one meal idea, one walk and a water goal. We will adjust as you log.</Text>
        <Text style={styles.disclaimer}>Wellness guidance, not medical advice.</Text>
      </View>
      <CoachItem title="Add protein to lunch" category="nutrition" priority="normal" why="This helps stabilize afternoon energy when meal data is still sparse." />
      <CoachItem title="Take a gentle walk after dinner" category="training" priority="low" why="Light movement is a safe first habit for your selected activity level." />
    </View>
  );
}

function QuickLogSheet({
  visible,
  type,
  onType,
  token,
  onClose
}: {
  visible: boolean;
  type: LogType;
  onType: (type: LogType) => void;
  token?: string;
  onClose: () => void;
}) {
  const [saveState, setSaveState] = useState<AsyncState>("empty");
  const [saveError, setSaveError] = useState("");

  async function saveLog() {
    setSaveState("loading");
    setSaveError("");
    try {
      if (type === "meal") {
        await saveMealLog(token, {
          name: "Quick meal",
          calories: 0,
          approximate: true,
          loggedAt: new Date().toISOString()
        });
      }
      if (type === "body") {
        await saveHealthSnapshot(token, {
          source: "manual",
          weightKg: null,
          sleepHours: null,
          measurementTimestamp: new Date().toISOString()
        });
      }
      setSaveState("ready");
      onClose();
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save this log");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Quick log</Text>
        <View style={styles.logTypeGrid}>
          {[
            ["meal", "Meal"],
            ["workout", "Workout"],
            ["body", "Body data"],
            ["water", "Water/Mood"]
          ].map(([value, label]) => (
            <Pressable key={value} style={[styles.logType, type === value && styles.logTypeActive]} onPress={() => onType(value as LogType)}>
              <Text style={[styles.logTypeText, type === value && styles.logTypeTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {type === "meal" && <MealLog />}
        {type === "body" && <BodyLog />}
        {type === "workout" && <WorkoutLog />}
        {type === "water" && <WaterLog />}
        {saveState === "error" && <Text style={styles.errorText}>{saveError}</Text>}
        <Button label="Done editing" onPress={() => Keyboard.dismiss()} variant="ghost" />
        <Button label={saveState === "loading" ? "Saving..." : "Save log"} onPress={saveLog} disabled={saveState === "loading"} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MealLog() {
  return (
    <View style={styles.stackSmall}>
      <Text style={styles.positiveLine}>Nice start. Add what you ate and we will estimate gently.</Text>
      <TextInput style={styles.input} placeholder="Meal name" placeholderTextColor={theme.colors.muted} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
      <TextInput style={styles.input} placeholder="Estimated calories" placeholderTextColor={theme.colors.muted} keyboardType="numeric" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
      <Text style={styles.cardText}>Plate recognition is a placeholder for now. Estimates will be clearly marked approximate.</Text>
    </View>
  );
}

function BodyLog() {
  return (
    <View style={styles.gridTwo}>
      <Dial label="Weight" value="64 kg" />
      <Dial label="Waist" value="-" />
      <Dial label="Body fat" value="-" />
      <Dial label="Sleep" value="7 h" />
    </View>
  );
}

function WorkoutLog() {
  return (
    <View style={styles.stackSmall}>
      <TextInput style={styles.input} placeholder="Workout name" placeholderTextColor={theme.colors.muted} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
      <TextInput style={styles.input} placeholder="Duration minutes" placeholderTextColor={theme.colors.muted} keyboardType="numeric" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
    </View>
  );
}

function WaterLog() {
  return (
    <View style={styles.gridTwo}>
      <Dial label="Water" value="0.5 L" />
      <Dial label="Mood" value="Calm" />
    </View>
  );
}

function SettingsSheet({
  visible,
  onboarding,
  session,
  onLogout,
  onClose
}: {
  visible: boolean;
  onboarding: Onboarding;
  session: FittySession | null;
  onLogout: () => void;
  onClose: () => void;
}) {
  const [connected, setConnected] = useState(Boolean(onboarding.connectedProvider));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Profile and settings</Text>
        <View style={styles.cardFlat}>
          <Text style={styles.cardKicker}>Subscription</Text>
          <Text style={styles.cardTitle}>{session?.subscriptionPlan || "FREE"}</Text>
          <Text style={styles.cardText}>Plan status is read-only in this MVP.</Text>
        </View>
        <View style={styles.cardFlat}>
          <Text style={styles.cardKicker}>Account</Text>
          <Text style={styles.cardTitle}>{session ? `${session.firstName} ${session.lastName}`.trim() : onboarding.email || "Local user"}</Text>
          <Text style={styles.cardText}>{session?.email || "No active secure session"}</Text>
        </View>
        <View style={styles.cardFlat}>
          <Text style={styles.cardKicker}>Google Fit placeholder</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.cardText}>{connected ? "Connected locally. Last sync pending." : "Not connected yet."}</Text>
            <Switch value={connected} onValueChange={setConnected} />
          </View>
          <Text style={styles.cardText}>{integrationState === "empty" ? "Reconnect and disconnect states are ready for the real provider flow." : ""}</Text>
        </View>
        <Button label="Log out" onPress={onLogout} variant="ghost" />
        <Button label="Close" onPress={onClose} variant="ghost" />
      </View>
    </Modal>
  );
}

function BottomNav({ tab, onTab, onLog }: { tab: Tab; onTab: (tab: Tab) => void; onLog: () => void }) {
  return (
    <View style={styles.bottomNav}>
      <NavItem label="Today" active={tab === "today"} onPress={() => onTab("today")} />
      <NavItem label="Progress" active={tab === "progress"} onPress={() => onTab("progress")} />
      <Pressable style={styles.fab} onPress={onLog} accessibilityLabel="Open quick log">
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <NavItem label="Plans" active={tab === "plans"} onPress={() => onTab("plans")} />
      <NavItem label="Coach" active={tab === "coach"} onPress={() => onTab("coach")} />
    </View>
  );
}

function NavItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <View style={[styles.navIcon, active && styles.navIconActive]} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SegmentedControl({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmentedWide}>
      {items.map(([itemValue, label]) => (
        <Pressable key={itemValue} style={[styles.segmentWideItem, value === itemValue && styles.segmentWideActive]} onPress={() => onChange(itemValue)}>
          <Text style={[styles.segmentWideText, value === itemValue && styles.segmentWideTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ExerciseRow({ name, sets, load }: { name: string; sets: string; load: string }) {
  return (
    <View style={styles.exerciseRow}>
      <View>
        <Text style={styles.exerciseName}>{name}</Text>
        <Text style={styles.caption}>{sets}</Text>
      </View>
      <Text style={styles.exerciseLoad}>{load}</Text>
    </View>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
}

function RecipeCard({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{meta}</Text>
      <Pressable style={styles.chip}><Text style={styles.chipText}>View recipe</Text></Pressable>
    </View>
  );
}

function OnboardingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.heroTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Choice({ label, helper, selected, onPress }: { label: string; helper?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <View>
        <Text style={styles.choiceText}>{label}</Text>
        {helper && <Text style={styles.caption}>{helper}</Text>}
      </View>
      <Text style={styles.choiceArrow}>{selected ? "Selected" : "Select"}</Text>
    </Pressable>
  );
}

function MetricAdjust({ label, value, suffix = "", onMinus, onPlus }: { label: string; value: number; suffix?: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.caption}>{label}</Text>
      <View style={styles.rowBetween}>
        <Pressable style={styles.roundButton} onPress={onMinus}><Text style={styles.roundButtonText}>-</Text></Pressable>
        <Text style={styles.adjustValue}>{value}{suffix ? ` ${suffix}` : ""}</Text>
        <Pressable style={styles.roundButton} onPress={onPlus}><Text style={styles.roundButtonText}>+</Text></Pressable>
      </View>
    </View>
  );
}

function Button({ label, onPress, variant = "primary", compact = false, disabled = false }: { label: string; onPress: () => void; variant?: "primary" | "ghost"; compact?: boolean; disabled?: boolean }) {
  return (
    <Pressable style={[styles.button, variant === "ghost" && styles.buttonGhost, compact && styles.buttonCompact, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.buttonText, variant === "ghost" && styles.buttonGhostText]}>{label}</Text>
    </Pressable>
  );
}

function RingCard({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <View style={styles.ringCard}>
      <ProgressRing label={value} progress={progress} color={color} size={58} />
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

function ProgressRing({ label, progress, color, size }: { label: string; progress: number; color: string; size: number }) {
  const ringStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: Math.max(6, size * 0.1),
    borderColor: theme.colors.line,
    borderTopColor: color,
    borderRightColor: progress > 35 ? color : theme.colors.line,
    borderBottomColor: progress > 70 ? color : theme.colors.line
  }), [color, progress, size]);
  return (
    <View style={[styles.progressRing, ringStyle]}>
      <Text style={styles.progressRingText}>{label}</Text>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>;
}

function StatusRow({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <View style={[styles.statusRow, done && styles.statusDone]}>
      <Text style={styles.statusMark}>{done ? "OK" : "..."}</Text>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

function StateCard({ title, text, action, soft = false }: { title: string; text: string; action: string; soft?: boolean }) {
  return (
    <View style={[styles.card, soft && styles.softCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
      <Pressable style={styles.chip}><Text style={styles.chipText}>{action}</Text></Pressable>
    </View>
  );
}

function CoachItem({ title, category, priority, why }: { title: string; category: string; priority: string; why: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.aiBadge}>{category} - {priority}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>Why this? {why}</Text>
    </View>
  );
}

function Dial({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dial}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.dialValue}>{value}</Text>
      <View style={styles.row}>
        <Pressable style={styles.roundButton}><Text style={styles.roundButtonText}>-</Text></Pressable>
        <Pressable style={styles.roundButton}><Text style={styles.roundButtonText}>+</Text></Pressable>
      </View>
    </View>
  );
}

function SkeletonStack() {
  return (
    <View style={styles.stack}>
      <View style={styles.skeletonTall} />
      <View style={styles.skeleton} />
      <View style={styles.skeleton} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  shell: { flex: 1 },
  content: { padding: 20, paddingBottom: 118 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caption: { color: theme.colors.muted, fontSize: 13, fontWeight: "600" },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: "800" },
  heroTitle: { color: theme.colors.text, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: 0 },
  lead: { color: theme.colors.muted, fontSize: 18, lineHeight: 27, textAlign: "center", maxWidth: 300 },
  leadSmall: { color: theme.colors.muted, fontSize: 16, lineHeight: 23 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.text, fontWeight: "800" },
  onboardingCenter: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 18 },
  heroOrb: { width: 124, height: 124, borderRadius: 62, backgroundColor: "#fff0ea", alignItems: "center", justifyContent: "center", shadowColor: "#c95f50", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 14 } },
  heroOrbText: { color: theme.colors.primary, fontSize: 48, fontWeight: "900" },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dotActive: { width: 24, height: 7, borderRadius: 99, backgroundColor: theme.colors.primary },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: theme.colors.line },
  textButton: { minHeight: 44, justifyContent: "center" },
  textButtonText: { color: theme.colors.muted, fontWeight: "700" },
  stack: { gap: 14 },
  stackSmall: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  gridTwo: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, padding: 18, shadowColor: "#6f4b38", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  cardFlat: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, padding: 16, gap: 8 },
  focusCard: { backgroundColor: "#fff0ea", borderColor: "#ffd8cf" },
  aiCard: { backgroundColor: "#f6f2ff", borderColor: "#e4ddff" },
  warningCard: { backgroundColor: "#fff6dc", borderColor: "#f6df9d" },
  softCard: { backgroundColor: theme.colors.background, borderStyle: "dashed" },
  cardKicker: { color: theme.colors.primary, fontSize: 12, textTransform: "uppercase", fontWeight: "800", letterSpacing: 0 },
  cardTitle: { color: theme.colors.text, fontSize: 20, lineHeight: 26, fontWeight: "800", marginTop: 4 },
  cardText: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  ringGrid: { flexDirection: "row", gap: 10 },
  ringCard: { flex: 1, minHeight: 116, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, alignItems: "center", justifyContent: "center", gap: 8, padding: 10 },
  progressRing: { alignItems: "center", justifyContent: "center", transform: [{ rotate: "28deg" }] },
  progressRingText: { color: theme.colors.text, fontSize: 13, fontWeight: "900", transform: [{ rotate: "-28deg" }] },
  streakRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  streakDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.line },
  streakDone: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  streakText: { color: theme.colors.muted, fontWeight: "800" },
  streakTextDone: { color: "#ffffff" },
  progressTrack: { height: 9, borderRadius: 99, backgroundColor: theme.colors.line, overflow: "hidden", marginVertical: 14 },
  progressFill: { height: 9, borderRadius: 99, backgroundColor: theme.colors.primary },
  choice: { minHeight: 70, padding: 16, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  choiceSelected: { backgroundColor: "#fff0ea", borderColor: theme.colors.primary },
  choiceText: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  choiceArrow: { color: theme.colors.muted, fontWeight: "800", fontSize: 12 },
  miniCard: { flexGrow: 1, flexBasis: "47%", backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, padding: 16, gap: 12 },
  adjustValue: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  roundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff0ea", alignItems: "center", justifyContent: "center" },
  roundButtonText: { color: theme.colors.primary, fontSize: 22, fontWeight: "900" },
  segment: { flexDirection: "row", backgroundColor: theme.colors.background, borderRadius: theme.radius.full, padding: 4 },
  segmentItem: { flex: 1, minHeight: 38, borderRadius: theme.radius.full, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: theme.colors.primary },
  segmentText: { color: theme.colors.muted, fontWeight: "800" },
  segmentTextActive: { color: "#ffffff" },
  segmentedWide: { flexDirection: "row", backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.line, padding: 5, gap: 4 },
  segmentWideItem: { flex: 1, minHeight: 44, borderRadius: theme.radius.full, alignItems: "center", justifyContent: "center" },
  segmentWideActive: { backgroundColor: theme.colors.text },
  segmentWideText: { color: theme.colors.muted, fontSize: 13, fontWeight: "900" },
  segmentWideTextActive: { color: "#ffffff" },
  button: { minHeight: 52, borderRadius: theme.radius.full, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  buttonCompact: { minHeight: 44 },
  buttonGhost: { backgroundColor: "#e9fbf6", borderWidth: 1, borderColor: "#c9f2e8" },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  buttonGhostText: { color: "#207f6d" },
  chip: { alignSelf: "flex-start", minHeight: 36, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  chipText: { color: theme.colors.text, fontWeight: "800", fontSize: 13 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 13, borderRadius: theme.radius.md, backgroundColor: "#f6f2ff" },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.accent, backgroundColor: theme.colors.surface },
  checkboxOn: { backgroundColor: theme.colors.accent },
  consentText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  input: { minHeight: 50, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface, paddingHorizontal: 14, color: theme.colors.text },
  errorText: { color: theme.colors.error, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  bottomNav: { position: "absolute", left: 12, right: 12, bottom: 12, minHeight: 76, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8, shadowColor: "#6f4b38", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  navItem: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 5 },
  navIcon: { width: 20, height: 4, borderRadius: 99, backgroundColor: theme.colors.line },
  navIconActive: { backgroundColor: theme.colors.primary },
  navText: { color: theme.colors.muted, fontSize: 11, fontWeight: "800" },
  navTextActive: { color: theme.colors.text },
  fab: { width: 62, height: 62, borderRadius: 31, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 32, shadowColor: theme.colors.primary, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  fabText: { color: "#ffffff", fontSize: 34, lineHeight: 38, fontWeight: "800" },
  scrim: { flex: 1, backgroundColor: "rgba(32,49,63,0.28)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: 20, paddingBottom: 28, gap: 14 },
  sheetHandle: { alignSelf: "center", width: 48, height: 5, borderRadius: 99, backgroundColor: theme.colors.line },
  sheetTitle: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  logTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  logType: { minHeight: 44, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 12, justifyContent: "center" },
  logTypeActive: { backgroundColor: "#fff0ea", borderColor: theme.colors.primary },
  logTypeText: { color: theme.colors.muted, fontWeight: "800" },
  logTypeTextActive: { color: theme.colors.primary },
  exerciseList: { gap: 10, marginTop: 14 },
  exerciseRow: { minHeight: 62, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exerciseName: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
  exerciseLoad: { color: theme.colors.primary, fontSize: 16, fontWeight: "900" },
  macroRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  macroPill: { flex: 1, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, padding: 10 },
  macroValue: { color: theme.colors.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
  positiveLine: { color: "#207f6d", fontWeight: "800", backgroundColor: "#e9fbf6", borderRadius: theme.radius.md, padding: 12 },
  dial: { flexGrow: 1, flexBasis: "47%", backgroundColor: theme.colors.background, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.line, padding: 16, gap: 10 },
  dialValue: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  scoreCopy: { flex: 1 },
  chart: { minHeight: 110, flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 18 },
  bar: { flex: 1, borderRadius: 99, backgroundColor: theme.colors.secondary },
  aiBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f6f2ff", color: "#6657d6", fontWeight: "800", fontSize: 12 },
  disclaimer: { color: "#7a5a12", backgroundColor: "#fff6dc", borderRadius: theme.radius.md, padding: 12, marginTop: 12, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
  statusDone: { backgroundColor: "#e9fbf6", borderColor: "#c9f2e8" },
  statusMark: { color: theme.colors.secondary, fontWeight: "900" },
  statusText: { color: theme.colors.text, fontWeight: "700" },
  skeleton: { height: 82, borderRadius: theme.radius.lg, backgroundColor: "#f5eee7" },
  skeletonTall: { height: 170, borderRadius: theme.radius.lg, backgroundColor: "#f5eee7" }
});
