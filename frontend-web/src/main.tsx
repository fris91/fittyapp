import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Dumbbell,
  Home,
  LineChart,
  Lock,
  LogOut,
  Mail,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  Utensils,
  Users
} from "lucide-react";
import "./styles.css";

type Role = "FITTY_USER" | "FITTY_ADMIN";
type Page =
  | "today"
  | "progress"
  | "coach"
  | "goals"
  | "workout"
  | "nutrition"
  | "recipes"
  | "notifications"
  | "settings"
  | "admin-users";

type Session = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name: string;
    roles: Role[];
    subscriptionPlan: string;
  };
};

type FittyData = {
  today: {
    focus: string;
    focusReason: string;
    rings: { move: number; meals: number; body: number };
    streakDays: number;
    coachLine: string;
  };
  progress: {
    weightKg: number;
    bmi: number;
    bodyFat: number;
    muscle: number;
    wellnessScore: number;
    trend: number[];
  };
  recommendations: { title: string; text: string; tone: "lav" | "mint" | "plain" }[];
  notifications: { title: string; text: string; time: string; tone: "coral" | "mint" | "lav" | "amber" | "plain" }[];
};

// Config resolution order: runtime (window.__FITTY_ENV__, injected by the container at start) ->
// build-time Vite env -> safe fallback. Runtime wins so a single image works across environments
// without rebuilding, and a stale localhost default can never silently break login.
const runtimeEnv: Record<string, string | undefined> =
  (typeof window !== "undefined" && (window as unknown as { __FITTY_ENV__?: Record<string, string> }).__FITTY_ENV__) || {};

function readConfig(key: string, fallback: string): string {
  const runtimeValue = runtimeEnv[key];
  if (runtimeValue && !runtimeValue.startsWith("__")) return runtimeValue;
  const buildValue = (import.meta.env as Record<string, string | undefined>)[key];
  if (buildValue) return buildValue;
  return fallback;
}

const API_BASE_URL = readConfig("VITE_API_BASE_URL", "http://fitty-cp-01:30080");
const KEYCLOAK_URL = readConfig("VITE_KEYCLOAK_URL", "http://fitty-cp-01:30081");
const KEYCLOAK_REALM = readConfig("VITE_KEYCLOAK_REALM", "fitty");
const KEYCLOAK_CLIENT_ID = readConfig("VITE_KEYCLOAK_CLIENT_ID", "fitty-web");
const REDIRECT_URI = window.location.origin + window.location.pathname;
const TOKEN_KEY = "fitty.session";
const VERIFIER_KEY = "fitty.pkce.verifier";

const emptyData: FittyData = {
  today: {
    focus: "Registra il primo dato per costruire il tuo piano",
    focusReason: "Fitty mostrerà progressi e suggerimenti solo quando arriveranno dati reali dal tuo profilo.",
    rings: { move: 0, meals: 0, body: 0 },
    streakDays: 0,
    coachLine: "Nessun suggerimento ancora: aggiungi un pasto, un dato corpo o un allenamento."
  },
  progress: {
    weightKg: 0,
    bmi: 0,
    bodyFat: 0,
    muscle: 0,
    wellnessScore: 0,
    trend: [0, 0, 0, 0, 0, 0, 0]
  },
  recommendations: [],
  notifications: []
};

const pageMeta: Record<Page, { title: string; subtitle: string }> = {
  today: { title: "Oggi", subtitle: "Martedì, 28 maggio - giorno 12 della tua serie" },
  progress: { title: "Progressi e corpo", subtitle: "Le tue metriche nel tempo" },
  coach: { title: "Coach", subtitle: "Consigli e assistente Fitty" },
  goals: { title: "Obiettivi", subtitle: "Cosa stai costruendo" },
  workout: { title: "Piano allenamento", subtitle: "Piano attivo e generazione guidata" },
  nutrition: { title: "Nutrizione e pasti", subtitle: "Pasti di oggi e piano nutrizionale" },
  recipes: { title: "Ricette", subtitle: "Personalizzate per te" },
  notifications: { title: "Notifiche", subtitle: "Promemoria, risultati e avvisi" },
  settings: { title: "Impostazioni", subtitle: "Account, integrazioni e privacy" },
  "admin-users": { title: "Utenti", subtitle: "Gestione profili e abbonamenti" }
};

const navGroups: { title: string; items: { page: Page; label: string; icon: React.ReactNode; badge?: number }[] }[] = [
  {
    title: "Giorno",
    items: [
      { page: "today", label: "Oggi", icon: <Home /> },
      { page: "progress", label: "Progressi e corpo", icon: <LineChart /> },
      { page: "coach", label: "Coach", icon: <Sparkles />, badge: 2 },
      { page: "goals", label: "Obiettivi", icon: <Target /> }
    ]
  },
  {
    title: "Piani",
    items: [
      { page: "workout", label: "Piano allenamento", icon: <CalendarDays /> },
      { page: "nutrition", label: "Nutrizione e pasti", icon: <Utensils /> },
      { page: "recipes", label: "Ricette", icon: <BookOpen /> }
    ]
  },
  {
    title: "Account",
    items: [
      { page: "notifications", label: "Notifiche", icon: <Bell />, badge: 5 },
      { page: "settings", label: "Impostazioni", icon: <Settings /> }
    ]
  }
];

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<Page>("today");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { data, reload } = useFittyData(session);
  const isAdmin = session?.user.roles.includes("FITTY_ADMIN") ?? false;
  const meta = pageMeta[page];

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    completeLogin().then((nextSession) => {
      if (nextSession) {
        setSession(nextSession);
        window.history.replaceState({}, document.title, REDIRECT_URI);
      }
    });
  }, []);

  if (!session) {
    return (
      <AnonymousHome
        onSession={setSession}
        theme={theme}
        onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="side">
        <button className="side-brand" onClick={() => setPage("today")}>
          <LogoMark />
      <span><b>Fitty</b><small>APP WEB</small></span>
        </button>

        {isAdmin && (
          <>
            <span className="side-cap">Admin</span>
            <NavItem active={page === "admin-users"} label="Utenti" icon={<Users />} onClick={() => setPage("admin-users")} />
          </>
        )}

        {navGroups.map((group) => (
          <React.Fragment key={group.title}>
            <span className="side-cap">{group.title}</span>
            {group.items.map((item) => (
              <NavItem
                key={item.page}
                active={page === item.page}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                onClick={() => setPage(item.page)}
              />
            ))}
          </React.Fragment>
        ))}

        <div className="side-foot">
          <div className="side-user">
            <span className="avatar-mini">{initials(session.user.name)}</span>
            <span><b>{session.user.name}</b><small>{planLabel(session.user.subscriptionPlan)}</small></span>
          </div>
          <button className="side-logout" onClick={() => logout(session)}><LogOut size={16} /> Esci</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="app-topbar">
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="searchbar"><Search size={15} /><span>Cerca alimenti, ricette, esercizi...</span></div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Cambia tema" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span className="plan-pill">{planLabel(session.user.subscriptionPlan)}</span>
            <span className="avatar-mini">{initials(session.user.name)}</span>
          </div>
        </header>

        <div className="content">
          {page === "admin-users" && <AdminUsers token={session.accessToken} />}
          {page === "today" && <TodayScreen data={data} onWorkout={() => setPage("workout")} />}
          {page === "progress" && <ProgressScreen data={data} token={session.accessToken} onSaved={reload} />}
          {page === "coach" && <CoachScreen data={data} />}
          {page === "goals" && <GoalsScreen />}
          {page === "workout" && <WorkoutScreen />}
          {page === "nutrition" && <NutritionScreen />}
          {page === "recipes" && <RecipesScreen />}
          {page === "notifications" && <NotificationsScreen data={data} />}
          {page === "settings" && <SettingsScreen session={session} />}
        </div>
      </main>
    </div>
  );
}

type RegisterStep = "account" | "body" | "goal" | "plan";
type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  sex: "M" | "F" | "OTHER";
  age: string;
  heightCm: string;
  weightKg: string;
  goal: string;
  activityLevel: string;
  subscriptionPlan: "FREE" | "PREMIUM";
  wellnessConsent: boolean;
  medicalConsent: boolean;
  marketingConsent: boolean;
};

const emptyRegisterForm: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  sex: "M",
  age: "",
  heightCm: "",
  weightKg: "",
  goal: "Sentirmi meglio",
  activityLevel: "Leggermente attivo",
  subscriptionPlan: "FREE",
  wellnessConsent: false,
  medicalConsent: false,
  marketingConsent: false
};

const registerSteps: { id: RegisterStep; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "body", label: "Corpo" },
  { id: "goal", label: "Obiettivo" },
  { id: "plan", label: "Piano" }
];

function AnonymousHome({ onSession, theme, onTheme }: { onSession: (session: Session) => void; theme: string; onTheme: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [registerForm, setRegisterForm] = useState<RegisterForm>(emptyRegisterForm);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const fieldErrors: { email?: string; password?: string } = {};
    if (!email.trim()) fieldErrors.email = "Inserisci email o username.";
    if (!password) fieldErrors.password = "Inserisci la password.";
    setLoginErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/identity/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? "Email o password non validi." : "Accesso non riuscito. Riprova tra poco.");
      }
      const token = await response.json();
      const session = sessionFromTokenResponse(token);
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      onSession(session);
    } catch (err) {
      setError(err instanceof TypeError ? "Impossibile contattare il server. Controlla la connessione e riprova." : err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitPasswordReset(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/identity/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });
      if (!response.ok) throw new Error("Non sono riuscito a inviare il link di reset");
      setResetMessage("Se l'email esiste, riceverai un link per impostare una nuova password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset password non riuscito");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const errors = validateRegistration(registerForm);
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) {
      setRegisterStep(firstErrorStep(errors));
      setError("Controlla i campi evidenziati per continuare.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/identity/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          locale: "it-IT",
          subscriptionPlan: registerForm.subscriptionPlan === "PREMIUM" ? "FREE" : registerForm.subscriptionPlan,
          goals: [registerForm.goal],
          bodyBasics: {
            sex: registerForm.sex,
            age: Number(registerForm.age),
            heightCm: Number(registerForm.heightCm),
            weightKg: Number(registerForm.weightKg)
          },
          activityProfile: {
            activityLevel: registerForm.activityLevel
          },
          consent: {
            wellnessDataProcessing: registerForm.wellnessConsent,
            medicalBoundaryAccepted: registerForm.medicalConsent,
            marketing: registerForm.marketingConsent
          }
        })
      });
      if (!response.ok) {
        if (response.status === 409) {
          setRegisterStep("account");
          setRegisterErrors((current) => ({ ...current, email: "Esiste già un account con questa email." }));
          throw new Error("Esiste già un account con questa email.");
        }
        const body = await response.text().catch(() => "");
        if (body.toLowerCase().includes("password")) {
          setRegisterStep("account");
          setRegisterErrors((current) => ({ ...current, password: "La password non rispetta i requisiti richiesti." }));
          throw new Error("La password non rispetta i requisiti richiesti.");
        }
        throw new Error("Registrazione non riuscita. Riprova tra poco.");
      }
      const identity = await response.json();
      if (!identity.token || !identity.token.access_token && !identity.token.accessToken) {
        // No token returned (e.g. email verification required): send the user to login.
        setMode("login");
        setError("Account creato. Accedi con le tue credenziali.");
        return;
      }
      const session = sessionFromTokenResponse(identity.token);
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      onSession(session);
    } catch (err) {
      setError(err instanceof TypeError ? "Impossibile contattare il server. Controlla la connessione e riprova." : err instanceof Error ? err.message : "Registrazione non riuscita");
    } finally {
      setIsLoading(false);
    }
  }

  function updateRegister<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="auth-page">
      <aside className="auth-brand-panel">
        <div className="auth-brand-top">
          <LogoMark />
          <b>Fitty<span>App</span></b>
        </div>
        <div className="auth-brand-copy">
          <h1>{mode === "register" ? "Inizia il tuo piano in pochi minuti." : mode === "forgot" ? "Nessun problema." : "Bentornato nel tuo benessere."}</h1>
          <p>
            {mode === "register"
              ? "Crea l'account, raccontaci obiettivo e dati corporei, poi Fitty prepara la tua prima esperienza."
              : mode === "forgot"
                ? "Ti inviamo un link sicuro per impostare una nuova password e tornare al tuo percorso."
                : "Piani, progressi e coach restano dove li hai lasciati, protetti dal tuo account Fitty."}
          </p>
          <div className="auth-brand-list">
            <span><b>1</b> Piani allenamento e nutrizione personalizzati</span>
            <span><b>2</b> Una vista calma della giornata</span>
            <span><b>3</b> Coach AI con limiti wellness chiari</span>
          </div>
        </div>
        <div className="auth-brand-foot">Supporto wellness, non parere medico.</div>
      </aside>

      <section className="auth-form-side">
        <button className="icon-btn auth-theme" aria-label="Cambia tema" onClick={onTheme}>
          {theme === "light" ? <Moon /> : <Sun />}
        </button>

        <div className={mode === "register" ? "panel auth-card wide" : "panel auth-card"}>
          {mode === "login" && (
            <>
              <div>
                <h2 className="auth-title">Accedi</h2>
                <p className="auth-subtitle">Bentornato, riprendiamo dal tuo ultimo progresso.</p>
              </div>
              <div className="oauth-stack">
                <button className="oauth-button" onClick={() => startLogin("google")}><span className="google-mark">G</span> Continua con Google</button>
                <button className="oauth-button" onClick={() => startLogin("facebook")}><span className="facebook-mark">f</span> Continua con Facebook</button>
              </div>
              <div className="divider"><span>oppure</span></div>
              <form className="auth-form" onSubmit={submitLogin} noValidate>
                <label>Email o username<span className={loginErrors.email ? "auth-field invalid" : "auth-field"}><Mail size={18} /><input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.it" /></span><FieldError msg={loginErrors.email} /></label>
                <label>
                  <span className="password-row">Password <button type="button" onClick={() => { setMode("forgot"); setError(""); setResetEmail(email); }}>Password dimenticata?</button></span>
                  <span className={loginErrors.password ? "auth-field invalid" : "auth-field"}><Lock size={18} /><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="La tua password" /></span>
                  <FieldError msg={loginErrors.password} />
                </label>
                {error && <div className="alert">{error}</div>}
                <button className="btn cta full" disabled={isLoading}>{isLoading ? "Accesso in corso..." : "Accedi"} <ArrowRight size={18} /></button>
              </form>
              <p className="auth-swap">Nuovo su Fitty? <button onClick={() => { setMode("register"); setError(""); }}>Crea un account</button></p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div>
                <h2 className="auth-title">Reimposta password</h2>
                <p className="auth-subtitle">Inserisci la tua email: ti inviamo un link sicuro di reset.</p>
              </div>
              <form className="auth-form" onSubmit={submitPasswordReset}>
                <label>Email<span className="auth-field"><Mail size={18} /><input type="email" autoComplete="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="nome@email.it" /></span></label>
                {error && <div className="alert">{error}</div>}
                {resetMessage && <div className="alert success">{resetMessage}</div>}
                <button className="btn cta full" disabled={isLoading}>{isLoading ? "Invio..." : "Invia link di reset"}</button>
              </form>
              <p className="auth-swap"><button onClick={() => { setMode("login"); setError(""); }}>Torna all'accesso</button></p>
            </>
          )}

          {mode === "register" && (
            <>
              <div>
                <h2 className="auth-title">Crea il tuo account</h2>
                <p className="auth-subtitle">Prima l'account, poi personalizziamo dati corporei, obiettivo e piano.</p>
              </div>
              {registerStep === "account" && (
                <>
                  <div className="oauth-stack">
                    <button className="oauth-button" onClick={() => startLogin("google")}><span className="google-mark">G</span> Registrati con Google</button>
                    <button className="oauth-button" onClick={() => startLogin("facebook")}><span className="facebook-mark">f</span> Registrati con Facebook</button>
                  </div>
                  <div className="divider"><span>oppure</span></div>
                </>
              )}
              <div className="step-tabs">
                {registerSteps.map((step) => <button key={step.id} className={registerStep === step.id ? "on" : ""} onClick={() => setRegisterStep(step.id)}>{step.label}</button>)}
              </div>
              <form className="auth-form" onSubmit={submitRegister}>
                {registerStep === "account" && (
                  <div className="register-grid">
                    <label>Nome<input className={registerErrors.firstName ? "invalid" : ""} value={registerForm.firstName} onChange={(e) => updateRegister("firstName", e.target.value)} autoComplete="given-name" /><FieldError msg={registerErrors.firstName} /></label>
                    <label>Cognome<input className={registerErrors.lastName ? "invalid" : ""} value={registerForm.lastName} onChange={(e) => updateRegister("lastName", e.target.value)} autoComplete="family-name" /><FieldError msg={registerErrors.lastName} /></label>
                    <label className="wide">Email<input type="email" className={registerErrors.email ? "invalid" : ""} value={registerForm.email} onChange={(e) => updateRegister("email", e.target.value)} autoComplete="email" /><FieldError msg={registerErrors.email} /></label>
                    <label>Password<input type="password" className={registerErrors.password ? "invalid" : ""} value={registerForm.password} onChange={(e) => updateRegister("password", e.target.value)} autoComplete="new-password" /><FieldError msg={registerErrors.password} /></label>
                    <label>Conferma password<input type="password" className={registerErrors.confirmPassword ? "invalid" : ""} value={registerForm.confirmPassword} onChange={(e) => updateRegister("confirmPassword", e.target.value)} autoComplete="new-password" /><FieldError msg={registerErrors.confirmPassword} /></label>
                    <p className="hint wide">Minimo 8 caratteri, almeno una maiuscola e un carattere speciale.</p>
                  </div>
                )}
                {registerStep === "body" && (
                  <div className="register-grid">
                    <label>Sesso<select value={registerForm.sex} onChange={(e) => updateRegister("sex", e.target.value as RegisterForm["sex"])}><option value="M">Uomo</option><option value="F">Donna</option><option value="OTHER">Altro / preferisco non dirlo</option></select></label>
                    <label>Età<input type="number" min="13" className={registerErrors.age ? "invalid" : ""} value={registerForm.age} onChange={(e) => updateRegister("age", e.target.value)} /><FieldError msg={registerErrors.age} /></label>
                    <label>Altezza (cm)<input type="number" min="80" className={registerErrors.heightCm ? "invalid" : ""} value={registerForm.heightCm} onChange={(e) => updateRegister("heightCm", e.target.value)} /><FieldError msg={registerErrors.heightCm} /></label>
                    <label>Peso (kg)<input type="number" min="20" className={registerErrors.weightKg ? "invalid" : ""} value={registerForm.weightKg} onChange={(e) => updateRegister("weightKg", e.target.value)} /><FieldError msg={registerErrors.weightKg} /></label>
                  </div>
                )}
                {registerStep === "goal" && (
                  <div>
                    <b>Obiettivo principale</b>
                    <div className="choice-grid">
                      {["Perdere peso", "Aumentare massa", "Mangiare meglio", "Sentirmi meglio", "Dormire e recuperare"].map((goal) => (
                        <button type="button" key={goal} className={registerForm.goal === goal ? "choice-card on" : "choice-card"} onClick={() => updateRegister("goal", goal)}>{goal}</button>
                      ))}
                    </div>
                    <label className="form-line">Livello di attività<select value={registerForm.activityLevel} onChange={(e) => updateRegister("activityLevel", e.target.value)}><option>Sedentario</option><option>Leggermente attivo</option><option>Attivo</option><option>Molto attivo</option></select></label>
                  </div>
                )}
                {registerStep === "plan" && (
                  <div>
                    <b>Scegli il piano</b>
                    <div className="choice-grid">
                      <button type="button" className={registerForm.subscriptionPlan === "FREE" ? "choice-card plan on" : "choice-card plan"} onClick={() => updateRegister("subscriptionPlan", "FREE")}><strong>Free</strong><span>Dashboard, log manuali e consigli base.</span></button>
                      <button type="button" className="choice-card plan disabled" disabled><strong>Premium</strong><span>Pagamenti non ancora attivi: lo abilitiamo dopo.</span></button>
                    </div>
                    <label className="check-row"><input type="checkbox" checked={registerForm.wellnessConsent} onChange={(e) => updateRegister("wellnessConsent", e.target.checked)} /> Autorizzo Fitty a trattare i miei dati wellness per suggerimenti personalizzati.</label>
                    <FieldError msg={registerErrors.wellnessConsent} />
                    <label className="check-row"><input type="checkbox" checked={registerForm.medicalConsent} onChange={(e) => updateRegister("medicalConsent", e.target.checked)} /> Ho letto che Fitty offre supporto wellness e non pareri medici.</label>
                    <FieldError msg={registerErrors.medicalConsent} />
                    <label className="check-row muted-check"><input type="checkbox" checked={registerForm.marketingConsent} onChange={(e) => updateRegister("marketingConsent", e.target.checked)} /> Voglio ricevere email promozionali.</label>
                  </div>
                )}
                {error && <div className="alert">{error}</div>}
                <div className="wizard-actions">
                  {registerStep !== "account" && <button className="btn ghost" type="button" onClick={() => setRegisterStep(previousRegisterStep(registerStep))}>Indietro</button>}
                  {registerStep !== "plan" ? <button className="btn cta" type="button" onClick={() => setRegisterStep(nextRegisterStep(registerStep))}>Continua</button> : <button className="btn cta" disabled={isLoading}>{isLoading ? "Creazione..." : "Crea account"}</button>}
                </div>
              </form>
              <p className="auth-swap">Hai gia un account? <button onClick={() => { setMode("login"); setError(""); }}>Accedi</button></p>
              <p className="legal-copy">Continuando accetti privacy, consenso wellness e confine medico: Fitty non sostituisce un professionista sanitario.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const stepOfField: Record<keyof RegisterForm, RegisterStep> = {
  firstName: "account", lastName: "account", email: "account", password: "account", confirmPassword: "account",
  sex: "body", age: "body", heightCm: "body", weightKg: "body",
  goal: "goal", activityLevel: "goal",
  subscriptionPlan: "plan", wellnessConsent: "plan", medicalConsent: "plan", marketingConsent: "plan"
};

function validateRegistration(form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Il nome è obbligatorio.";
  if (!form.lastName.trim()) errors.lastName = "Il cognome è obbligatorio.";
  if (!form.email.trim()) errors.email = "L'email è obbligatoria.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Inserisci un indirizzo email valido.";
  if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)) errors.password = "Minimo 8 caratteri, una maiuscola e un carattere speciale.";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "Le password non coincidono.";
  if (!form.age) errors.age = "Inserisci l'età.";
  else if (Number(form.age) < 13) errors.age = "Devi avere almeno 13 anni.";
  if (!form.heightCm) errors.heightCm = "Inserisci l'altezza.";
  else if (Number(form.heightCm) < 80) errors.heightCm = "Controlla l'altezza inserita.";
  if (!form.weightKg) errors.weightKg = "Inserisci il peso.";
  else if (Number(form.weightKg) < 20) errors.weightKg = "Controlla il peso inserito.";
  if (!form.wellnessConsent) errors.wellnessConsent = "Consenso necessario per personalizzare i suggerimenti.";
  if (!form.medicalConsent) errors.medicalConsent = "Devi accettare il confine wellness/medico.";
  return errors;
}

function firstErrorStep(errors: RegisterErrors): RegisterStep {
  const order: RegisterStep[] = ["account", "body", "goal", "plan"];
  for (const step of order) {
    if ((Object.keys(errors) as (keyof RegisterForm)[]).some((field) => stepOfField[field] === step)) return step;
  }
  return "account";
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <small className="field-error" role="alert">{msg}</small> : null;
}

function nextRegisterStep(step: RegisterStep): RegisterStep {
  if (step === "account") return "body";
  if (step === "body") return "goal";
  return "plan";
}

function previousRegisterStep(step: RegisterStep): RegisterStep {
  if (step === "plan") return "goal";
  if (step === "goal") return "body";
  return "account";
}

function TodayScreen({ data, onWorkout }: { data: FittyData; onWorkout: () => void }) {
  return (
    <section className="screen">
      <div className="grid g-32">
        <div className="grid">
          <div className="panel lg tint-coral focus-card">
            <span className="cap coral">Focus di oggi</span>
            <div>
              <h2>{data.today.focus}</h2>
              <p>{data.today.focusReason}</p>
            </div>
            <div className="actions"><button className="btn cta" onClick={onWorkout}>Inizia camminata</button><button className="btn ghost">Perché?</button></div>
          </div>
          <div className="grid g-3">
            <RingCard tone="coral" value={data.today.rings.move} label="Movimento" detail="Minuti attivi" />
            <RingCard tone="mint" value={data.today.rings.meals} label="Pasti" detail="Pasti registrati" />
            <RingCard tone="lav" value={data.today.rings.body} label="Dati corpo" detail="Aggiornamento di oggi" />
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Questa settimana</h3>{data.today.streakDays > 0 ? <span className="badge amber">serie di {data.today.streakDays} giorni</span> : <span className="badge gray">nessuna serie attiva</span>}</div>
            <div className="week-row">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
                <div key={day}>
                  <div className="mini-ring empty" />
                  <span>{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid rail">
          <div className="panel tint-lav">
            <div className="panel-head"><span className="dot-ic">✨</span><h3>Coach</h3></div>
            <p className="lead">{data.today.coachLine}</p>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Statistiche rapide</h3></div>
            <div className="empty">Collega un'integrazione o registra dati per vedere passi, sonno e frequenza cardiaca.</div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Attività recente</h3></div>
            <div className="empty">Nessuna attività registrata di recente.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressScreen({ data, token, onSaved }: { data: FittyData; token: string; onSaved: () => void }) {
  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  const hasTrend = data.progress.trend.some((value) => value > 0);

  return (
    <section className="screen">
      <PageHead title="Progressi e corpo" text="Qui vive l'analisi completa: la home resta calma, i dettagli stanno qui." action={<><div className="seg"><button className="on">Settimana</button><button>Mese</button><button>Anno</button></div><button className="btn cta" onClick={() => setIsBodyModalOpen(true)}>+ Aggiungi dati corpo</button></>} />
      <div className="grid g-4">
        <Stat icon="⚖" label="Peso" value={data.progress.weightKg > 0 ? `${data.progress.weightKg.toFixed(1)} kg` : "—"} meta="Ultimo valore registrato" />
        <Stat icon="📊" label="BMI" value={data.progress.bmi > 0 ? data.progress.bmi.toFixed(1) : "—"} meta="Calcolato da peso e altezza" />
        <Stat icon="🔥" label="Massa grassa" value={data.progress.bodyFat > 0 ? `${data.progress.bodyFat}%` : "—"} meta="Ultimo valore registrato" />
        <Stat icon="💪" label="Muscolo" value={data.progress.muscle > 0 ? `${data.progress.muscle}%` : "—"} meta="Ultimo valore registrato" />
      </div>
      <div className="grid g-32 margin-top">
        <div className="panel lg">
          <div className="panel-head"><h3>Andamento peso</h3></div>
          {hasTrend ? (
            <div className="bar-chart">
              {data.progress.trend.map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{index === data.progress.trend.length - 1 ? "Ora" : `S${index + 1}`}</span></div>)}
            </div>
          ) : (
            <div className="empty">Registra almeno due rilevazioni di peso per vedere l'andamento.</div>
          )}
        </div>
        <div className="panel lg tint-mint center">
          <span className="cap mint">Punteggio wellness</span>
          <div className="big-score">{data.progress.wellnessScore > 0 ? data.progress.wellnessScore : "—"}</div>
          <p>Combinazione di attività, sonno, nutrizione e costanza. Appare quando ci sono dati sufficienti.</p>
        </div>
      </div>
      <div className="panel margin-top">
        <div className="panel-head"><h3>Storico dati corpo</h3></div>
        <div className="empty">Nessun dato corpo registrato. Usa “+ Aggiungi dati corpo” per iniziare lo storico.</div>
      </div>
      {isBodyModalOpen && <BodyDataModal token={token} onClose={() => setIsBodyModalOpen(false)} onSaved={() => { setIsBodyModalOpen(false); onSaved(); }} />}
    </section>
  );
}

function BodyDataModal({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void }) {
  const [weightKg, setWeightKg] = useState("64.2");
  const [heightCm, setHeightCm] = useState("170");
  const [bodyFatPercentage, setBodyFatPercentage] = useState("");
  const [muscleMassPercentage, setMuscleMassPercentage] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [steps, setSteps] = useState("");
  const [heartRateBpm, setHeartRateBpm] = useState("");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [mood, setMood] = useState("Bene");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const weight = Number(weightKg);
  const height = Number(heightCm);
  const bmi = weight > 0 && height > 0 ? weight / ((height / 100) * (height / 100)) : 0;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!weightKg) {
      setError("Il peso è obbligatorio.");
      return;
    }
    setIsSaving(true);
    try {
      await apiPost("/api/v1/health-data", token, {
        weightKg: numberOrNull(weightKg),
        heightCm: numberOrNull(heightCm),
        bodyFatPercentage: numberOrNull(bodyFatPercentage),
        muscleMassPercentage: numberOrNull(muscleMassPercentage),
        waistCm: numberOrNull(waistCm),
        sleepHours: numberOrNull(sleepHours),
        steps: integerOrNull(steps),
        heartRateBpm: integerOrNull(heartRateBpm),
        energyLevel,
        mood,
        notes: notes.trim() || null
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Non sono riuscito a salvare i dati. Riprova tra poco.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Aggiungi dati corpo">
      <form className="modal-card body-entry-card" onSubmit={save}>
        <div className="body-entry-top">
          <div><button type="button" className="link-button" onClick={onClose}>‹ Progressi</button><h3>Aggiungi dati corpo</h3><p>Oggi · precompilato dall’ultimo inserimento</p></div>
          <div className="actions"><button type="button" className="btn ghost" onClick={onClose}>Annulla</button><button className="btn cta" disabled={isSaving}>{isSaving ? "Salvataggio..." : "Salva dato"}</button></div>
        </div>

        <div className="body-entry-grid">
          <div className="grid">
            <section className="panel lg tint-coral weight-entry">
              <div className="panel-head"><span className="dot-ic tint-coral">⚖</span><h3>Peso</h3><span className="badge gray">Obbligatorio</span></div>
              <div className="weight-row">
                <strong>{weightKg || "0"}</strong>
                <span className="unit-toggle"><b>kg</b><i>lb</i></span>
                <input type="range" min="30" max="180" step="0.1" value={weightKg || "64.2"} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
              <div className="stepper-row">
                <button type="button" className="btn sm ghost" onClick={() => setWeightKg(stepDecimal(weightKg, -0.1))}>-0,1</button>
                <button type="button" className="btn sm ghost" onClick={() => setWeightKg(stepDecimal(weightKg, 0.1))}>+0,1</button>
                <span>Ultimo: 64,5 kg · 7 giorni fa</span>
              </div>
            </section>

            <section className="panel lg">
              <div className="panel-head"><h3>Altre metriche</h3><span className="sm">Opzionali</span></div>
              <div className="register-grid">
                <label>Altezza<input type="number" min="80" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="cm" /></label>
                <label>Massa grassa %<input type="number" min="0" max="80" step="0.1" value={bodyFatPercentage} onChange={(e) => setBodyFatPercentage(e.target.value)} /></label>
                <label>Massa muscolare %<input type="number" min="0" max="100" step="0.1" value={muscleMassPercentage} onChange={(e) => setMuscleMassPercentage(e.target.value)} /></label>
                <label>Vita<input type="number" min="30" step="0.1" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} placeholder="cm" /></label>
                <label>Frequenza a riposo<input type="number" min="30" max="220" value={heartRateBpm} onChange={(e) => setHeartRateBpm(e.target.value)} placeholder="bpm" /></label>
                <label>Passi<input type="number" min="0" value={steps} onChange={(e) => setSteps(e.target.value)} /></label>
                <label>Sonno<input type="number" min="0" max="24" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="ore" /></label>
              </div>
              <div className="chips compact-chips"><span>+ Fianchi</span><span>+ Torace</span><span>+ Idratazione</span><span>+ Grasso viscerale</span></div>
            </section>

            <section className="panel lg">
              <div className="panel-head"><h3>Come ti senti?</h3><span className="tag">Wellness</span></div>
              <FormChoice label="Energia" items={["Bassa", "Buona", "Ottima"]} active={energyLabel(energyLevel)} />
              <input type="range" min="1" max="5" value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))} />
              <FormChoice label="Umore" items={["Sereno", "Normale", "Stanco", "Stressato"]} active={mood} />
              <div className="chips compact-chips">{["Sereno", "Normale", "Stanco", "Stressato"].map((item) => <span key={item} className={mood === item ? "on" : ""} onClick={() => setMood(item)}>{item}</span>)}</div>
              <label className="form-line">Note opzionali<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="es. ho dormito bene, giornata piena..." /></label>
            </section>
          </div>

          <aside className="grid">
            <section className="panel lg">
              <h3>Anteprima live</h3>
              <div className="preview-grid">
                <div className="panel compact tint-mint"><span className="cap">Peso</span><strong>{weightKg || "0"} kg</strong><small>si aggiorna al salvataggio</small></div>
                <div className="panel compact"><span className="cap">BMI</span><strong>{bmi ? bmi.toFixed(1) : "-"}</strong><small>{bmi ? "calcolato da peso e altezza" : "serve altezza"}</small></div>
              </div>
              <div className="recalc-strip"><i /><i /><i /><i /><i className="hot" /></div>
            </section>
            <section className="panel lg tint-lav"><div className="panel-head"><span className="dot-ic tint-lav">✨</span><h3>Coach</h3></div><p>Ottimo: con dati costanti posso aggiornare andamento, BMI e suggerimenti senza inventare nulla.</p></section>
            <section className="panel lg">
              <h3>Oppure importa</h3>
              <div className="list">
                <InfoRow icon="G" title="Google Fit" text="Sincronizzazione giornaliera" meta="On" tone="mint" />
                <InfoRow icon="CSV" title="Import CSV" text="Caricamento storico" meta="›" tone="plain" />
              </div>
            </section>
          </aside>
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="note">Solo dati corpo e wellness. Per indicatori clinici dedicati useremo una sezione medica separata e ancora più protetta.</div>
      </form>
    </div>
  );
}

function CoachScreen({ data }: { data: FittyData }) {
  return (
    <section className="screen">
      <PageHead title="Coach" text="Consigli e assistente conversazionale, sempre nel perimetro del benessere." />
      <div className="grid g-23">
        <div>
          <h3>Consigli della settimana</h3>
          <div className="grid">
            {data.recommendations.length > 0
              ? data.recommendations.map((item) => <div key={item.title} className={`panel tint-${item.tone === "plain" ? "none" : item.tone}`}><h3>{item.title}</h3><p>{item.text}</p></div>)
              : <div className="panel"><div className="empty">Ancora nessun consiglio. Registra dati corpo, pasti o attività e Fitty preparerà suggerimenti personalizzati.</div></div>}
          </div>
        </div>
        <div className="panel lg">
          <div className="panel-head"><span className="dot-ic">✨</span><h3>Chat con Fitty</h3></div>
          <div className="chat"><p>In base alla tua settimana, vuoi rendere domani una giornata di recupero più leggera?</p><b>Sì, grazie</b><p>Fatto: ho sostituito con mobilità e camminata. Aggiunto a Oggi.</p></div>
          <div className="chips"><span>Pianifica settimana</span><span>Suggerisci pasto</span><span>Spiega punteggio</span></div>
          <div className="chat-input"><input placeholder="Scrivi a Fitty..." /><button className="btn cta">Invia</button></div>
          <p className="disclaimer">Supporto wellness, non un parere medico.</p>
        </div>
      </div>
    </section>
  );
}

function GoalsScreen() {
  return (
    <section className="screen">
      <PageHead title="Obiettivi" text="Guidano tutta l'esperienza Fitty." action={<button className="btn cta">Salva obiettivi</button>} />
      <div className="grid g-2">
        <div className="panel lg">
          <h3>Obiettivo principale</h3>
          <div className="chips"><span className="on">Perdere peso</span><span>Aumentare muscolo</span><span>Mangiare meglio</span><span>Sentirsi meglio</span><span>Sonno e recupero</span></div>
          <label className="form-line">Peso target <b>60 kg</b><span className="bar"><i style={{ width: "65%" }} /></span></label>
          <label className="form-line">Ritmo <span className="seg"><button>Rilassato</button><button className="on">Costante</button><button>Intenso</button></span></label>
          <div className="note">Un obiettivo primario mantiene Fitty focalizzata su home, coach e piani.</div>
        </div>
        <div className="grid">
          <div className="panel"><h3>Target settimanali</h3><div className="list">
            <Line label="Minuti attivi" value="150 / settimana" /><Line label="Allenamenti" value="3 / settimana" /><Line label="Calorie giornaliere" value="1.600 kcal" /><Line label="Proteine" value="120 g / giorno" />
          </div></div>
          <div className="panel tint-mint"><div className="panel-head"><h3>In linea</h3><span className="badge green">82% aderenza</span></div><p>Con questo ritmo raggiungerai 60 kg in circa 9 settimane. Costante e sostenibile.</p></div>
        </div>
      </div>
    </section>
  );
}

function WorkoutScreen() {
  return (
    <section className="screen">
      <PageHead title="Piano allenamento" text="Piano attivo e generazione AI con output modificabile e spiegabile." action={<><button className="btn ghost">Crea manualmente</button><button className="btn cta">Genera con AI</button></>} />
      <div className="grid g-23">
        <div className="panel lg tint-lav">
          <div className="panel-head"><span className="dot-ic">✨</span><h3>Generatore piano AI</h3><span className="tag">Beta</span></div>
          <p>Prima di costruire il piano, servono poche informazioni per renderlo sicuro e utile.</p>
          <FormChoice label="Giorni a settimana" items={["2", "3", "4", "5"]} active="3" />
          <FormChoice label="Infortuni o limiti" items={["Ginocchio", "Lombare", "Spalla", "Nessuno"]} active="Nessuno" />
          <FormChoice label="Attrezzatura" items={["Palestra", "Casa", "Corpo libero"]} active="Palestra" />
          <div className="alert">Guida wellness, non parere medico. Fermati se senti dolore.</div>
          <button className="btn cta full">Genera il mio piano</button>
        </div>
        <div className="panel lg">
          <div className="panel-head"><h3>Full body 3 giorni - 4 settimane</h3><span className="badge green">allineato all'obiettivo</span></div>
          <div className="grid g-3"><SmallPlan day="Giorno 1" title="Lower" text="5 esercizi - 35 min" active /><SmallPlan day="Giorno 2" title="Upper" text="6 esercizi - 40 min" /><SmallPlan day="Giorno 3" title="Full + core" text="5 esercizi - 30 min" /></div>
          <div className="list margin-top"><InfoRow icon="1" title="Goblet squat" text="3 x 10 - recupero 90s" meta="modifica" tone="coral" /><InfoRow icon="2" title="Romanian deadlift" text="3 x 8 - recupero 90s" meta="modifica" tone="coral" /><InfoRow icon="3" title="Walking lunge" text="2 x 12 - recupero 60s" meta="modifica" tone="coral" /></div>
          <div className="panel tint-lav compact"><b>Perché questi?</b> Esercizi composti, a basso impatto e coerenti con 3 giorni in palestra.</div>
          <div className="actions stretch"><button className="btn ghost">Rifiuta</button><button className="btn ghost">Rigenera</button><button className="btn cta">Salva piano</button></div>
        </div>
      </div>
    </section>
  );
}

function NutritionScreen() {
  return (
    <section className="screen">
      <PageHead title="Nutrizione e pasti" text="Pasti di oggi, bilancio macro e piano nutrizionale." action={<><button className="btn ghost">Piano nutrizionale AI</button><button className="btn cta">+ Registra pasto</button></>} />
      <div className="grid g-4"><Macro label="Calorie" value="1.480" target="/ 1.600" pct="88%" tone="coral" /><Macro label="Proteine" value="96" target="/ 120g" pct="78%" tone="mint" /><Macro label="Carboidrati" value="142" target="/ 180g" pct="76%" tone="lav" /><Macro label="Grassi" value="48" target="/ 60g" pct="82%" tone="coral" /></div>
      <div className="grid g-32 margin-top">
        <div className="panel"><div className="panel-head"><h3>Pasti di oggi</h3><span className="badge green">120 kcal sotto obiettivo</span></div><div className="list"><InfoRow icon="🥣" title="Colazione - avena e frutti rossi" text="18P - 70C - 12G - 420 kcal" meta="modifica" tone="lav" /><InfoRow icon="🥗" title="Pranzo - insalata di lenticchie" text="24P - 64C - 18G - 540 kcal" meta="modifica" tone="mint" /><InfoRow icon="🥛" title="Snack - yogurt greco" text="12P - 9C - 4G - 120 kcal" meta="modifica" tone="lav" /></div><button className="dashed">+ Aggiungi cena - cerca o scansiona</button></div>
        <div className="panel tint-mint"><h3>Il tuo piano nutrizionale</h3><p><b>Bilanciato - 1.600 kcal</b><br />Alto in proteine, carboidrati moderati. Creato per una perdita peso costante.</p><Line label="Pasti / giorno" value="3 + 1 snack" /><Line label="Target proteine" value="120 g" /><button className="btn ghost full">Vedi piano completo</button></div>
      </div>
    </section>
  );
}

function RecipesScreen() {
  const cards = [
    ["🥗", "28g proteine", "Bowl yogurt menta", "12 min - 4,8"],
    ["🍲", "24g proteine", "Insalata lenticchie corallo", "18 min - 4,7"],
    ["🫐", "Veloce", "Avena lavanda e frutti rossi", "8 min - 4,9"],
    ["🍳", "Alte proteine", "Uova e verdure", "10 min - 4,6"]
  ];
  return (
    <section className="screen">
      <PageHead title="Ricette" text="Personalizzate sui tuoi obiettivi e su ciò che hai registrato." action={<div className="searchbar small"><Search size={14} />Cerca ricette...</div>} />
      <div className="chips"><span className="on">Per te</span><span>Alte proteine</span><span>Veloce &lt; 15 min</span><span>Vegetariano</span><span>Low carb</span></div>
      <div className="recipe-grid">{cards.map(([icon, badge, title, text]) => <div className="recipe-card" key={title}><div>{icon}</div><span className="badge lav">{badge}</span><h3>{title}</h3><p>{text}</p></div>)}</div>
    </section>
  );
}

function NotificationsScreen({ data }: { data: FittyData }) {
  return (
    <section className="screen">
      <PageHead title="Notifiche" text="Promemoria, risultati e avvisi." action={<button className="btn ghost">Segna tutte come lette</button>} />
      <div className="panel notification-panel"><div className="list">{data.notifications.map((item) => <InfoRow key={item.title} icon="✦" title={item.title} text={item.text} meta={item.time} tone={item.tone} />)}</div></div>
    </section>
  );
}

function SettingsScreen({ session }: { session: Session }) {
  return (
    <section className="screen">
      <PageHead title="Impostazioni" text="Profilo, integrazioni, abbonamento e privacy." />
      <div className="grid g-2">
        <div className="panel lg"><h3>Integrazioni collegate</h3><div className="list"><InfoRow icon="G" title="Google Fit" text="Sincronizzato 2h fa" meta="Connesso" tone="mint" /><InfoRow icon="A" title="Apple Health" text="Riconnessione richiesta" meta="Correggi" tone="coral" /><InfoRow icon="Mi" title="Xiaomi Health" text="Non collegato" meta="Connetti" tone="plain" /></div><button className="dashed">+ Importazione manuale dati (CSV)</button></div>
        <div className="grid">
          <div className="panel tint-coral"><div className="panel-head"><h3>Abbonamento</h3><span className="badge gray">{planLabel(session.user.subscriptionPlan)}</span></div><p>Sblocca piani AI illimitati, insight avanzati e tutte le integrazioni.</p><div className="price">€7,99 <span>/ mese - 7 giorni di prova</span></div><button className="btn cta full">Inizia prova gratuita</button></div>
          <div className="panel"><h3>Privacy e consenso</h3><Line label="Usa i miei dati per suggerimenti AI" value="Attivo" /><Line label="Condividi analitiche anonime" value="Attivo" /><Line label="Email promozionali" value="Disattivo" /><button className="btn ghost full">Scarica i miei dati - Elimina account</button></div>
        </div>
      </div>
    </section>
  );
}

function AdminUsers({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error(`API admin non disponibile: ${response.status}`);
        return response.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [token]);

  async function updateSubscription(userId: string, subscriptionPlan: string) {
    setSavingUserId(userId);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan })
      });
      if (!response.ok) throw new Error(`Aggiornamento abbonamento fallito: ${response.status}`);
      const updated = await response.json() as AdminUser;
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aggiornamento non riuscito");
    } finally {
      setSavingUserId("");
    }
  }

  return (
    <section className="screen">
      <PageHead title="Utenti registrati" text="L'admin vede profilo e abbonamento, non le misurazioni sanitarie sensibili." />
      {error && <div className="alert">{error}</div>}
      <div className="panel">
        {users.length === 0 ? <div className="empty">Nessun profilo applicativo creato.</div> : (
          <table><thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Abbonamento</th></tr></thead><tbody>{users.map((user) => (
            <tr key={user.id}><td>{user.firstName} {user.lastName}</td><td>{user.email}</td><td>{user.role}</td><td><select value={user.subscriptionPlan ?? "FREE"} disabled={savingUserId === user.id} onChange={(e) => updateSubscription(user.id, e.target.value)}>{["FREE", "BRONZE", "SILVER", "GOLD"].map((plan) => <option key={plan}>{plan}</option>)}</select></td></tr>
          ))}</tbody></table>
        )}
      </div>
    </section>
  );
}

function useFittyData(session: Session | null) {
  const [data, setData] = useState<FittyData>(emptyData);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.all([
      apiGet<Partial<{ focus: string; rings: { move: number; meals: number; body: number }; streakDays: number; coachLine: string }>>("/api/v1/mobile/today", session.accessToken),
      apiGet<Partial<{ wellnessScore: number; weightKg: number; bmi: number; bodyFatPercentage: number; muscleMassPercentage: number; weightTrend: number[] }>>("/api/v1/mobile/progress", session.accessToken)
    ]).then(([today, progress]) => {
      if (!active) return;
      setData((current) => ({
        ...current,
        today: {
          ...current.today,
          focus: today.focus || current.today.focus,
          rings: today.rings || current.today.rings,
          streakDays: today.streakDays ?? current.today.streakDays,
          coachLine: today.coachLine || current.today.coachLine
        },
        progress: {
          ...current.progress,
          wellnessScore: progress.wellnessScore ?? current.progress.wellnessScore,
          weightKg: progress.weightKg ?? current.progress.weightKg,
          bmi: progress.bmi ?? current.progress.bmi,
          bodyFat: progress.bodyFatPercentage ?? current.progress.bodyFat,
          muscle: progress.muscleMassPercentage ?? current.progress.muscle,
          trend: progress.weightTrend?.length ? normalizeTrend(progress.weightTrend) : current.progress.trend
        }
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session, refreshKey]);

  return { data, reload: () => setRefreshKey((value) => value + 1) };
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json();
}

async function apiPost<T>(path: string, token: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(stripNulls(payload))
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Salvataggio non riuscito (${response.status})${details ? `: ${details.slice(0, 180)}` : ""}`);
  }
  return response.json();
}

function stripNulls(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null && value !== undefined && value !== ""));
}

function numberOrNull(value: string) {
  return value.trim() ? Number(value) : null;
}

function integerOrNull(value: string) {
  return value.trim() ? Number.parseInt(value, 10) : null;
}

function stepDecimal(value: string, delta: number) {
  const next = (Number(value || "0") + delta).toFixed(1);
  return String(Math.max(20, Number(next)));
}

function energyLabel(value: number) {
  if (value <= 2) return "Bassa";
  if (value >= 4) return "Ottima";
  return "Buona";
}

function normalizeTrend(values: number[]) {
  if (values.length === 0) return emptyData.progress.trend;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return values.map(() => 70);
  return values.map((value) => 40 + ((value - min) / (max - min)) * 55);
}

function NavItem({ active, label, icon, badge, onClick }: { active: boolean; label: string; icon: React.ReactNode; badge?: number; onClick: () => void }) {
  return <button className={active ? "side-item on" : "side-item"} onClick={onClick}>{icon}<span>{label}</span>{badge ? <b>{badge}</b> : null}</button>;
}

function PageHead({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="page-head"><div><h2>{title}</h2><p>{text}</p></div>{action && <div className="actions">{action}</div>}</div>;
}

function RingCard({ value, label, detail, tone, center }: { value: number; label: string; detail: string; tone: "coral" | "mint" | "lav"; center?: string }) {
  return <div className="panel stat center"><div className={`ring ${tone}`} style={{ "--p": `${value}%` } as React.CSSProperties}><span>{center ?? `${value}%`}</span></div><b>{label}</b><p>{detail}</p></div>;
}

function InfoRow({ icon, title, text, meta, tone }: { icon: string; title: string; text: string; meta: string; tone: "coral" | "mint" | "lav" | "amber" | "plain" }) {
  return <div className="row"><span className={`dot-ic ${tone !== "plain" ? `tint-${tone}` : ""}`}>{icon}</span><span className="row-text"><b>{title}</b><small>{text}</small></span><em>{meta}</em></div>;
}

function Stat({ icon, label, value, meta }: { icon: string; label: string; value: string; meta: string }) {
  return <div className="panel stat"><span className="dot-ic tint-mint">{icon}</span><span className="cap">{label}</span><strong>{value}</strong><p>{meta}</p></div>;
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="line"><span>{label}</span><b>{value}</b></div>;
}

function FormChoice({ label, items, active }: { label: string; items: string[]; active: string }) {
  return <div className="form-choice"><b>{label}</b><div className="chips">{items.map((item) => <span key={item} className={item === active ? "on" : ""}>{item}</span>)}</div></div>;
}

function SmallPlan({ day, title, text, active }: { day: string; title: string; text: string; active?: boolean }) {
  return <div className={active ? "panel compact tint-mint" : "panel compact"}><span className="cap">{day}</span><b>{title}</b><small>{text}</small></div>;
}

function Macro({ label, value, target, pct, tone }: { label: string; value: string; target: string; pct: string; tone: "coral" | "mint" | "lav" }) {
  return <div className="panel stat"><span className="cap">{label}</span><strong>{value}<small>{target}</small></strong><span className={`bar ${tone}`}><i style={{ width: pct }} /></span></div>;
}

async function startLogin(identityProvider?: string) {
  const verifier = randomString(64);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await pkceChallenge(verifier);
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email",
    code_challenge_method: "S256",
    code_challenge: challenge
  });
  if (identityProvider) params.set("kc_idp_hint", identityProvider);
  window.location.assign(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${params}`);
}

async function completeLogin() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return null;
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });
  const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error("Login non completato");
  const token = await response.json();
  const session = sessionFromTokenResponse(token);
  // Social login is brokered by Keycloak; the Fitty profile may not exist yet. Ensure it does.
  await ensureProfile(session.accessToken);
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  sessionStorage.removeItem(VERIFIER_KEY);
  return session;
}

async function ensureProfile(accessToken: string) {
  try {
    await fetch(`${API_BASE_URL}/api/v1/identity/sync-profile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    // Non-blocking: the app still loads; profile sync is retried on next login.
  }
}

function sessionFromTokenResponse(token: { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; accessToken?: string; refreshToken?: string; idToken?: string; expiresIn?: number }): Session {
  const accessToken = token.accessToken ?? token.access_token ?? "";
  const claims = parseJwt(accessToken);
  return {
    accessToken,
    refreshToken: token.refreshToken ?? token.refresh_token,
    idToken: token.idToken ?? token.id_token,
    expiresAt: Date.now() + (token.expiresIn ?? token.expires_in ?? 300) * 1000,
    user: {
      id: claims.sub,
      email: claims.email ?? "",
      name: claims.name ?? claims.preferred_username ?? "Utente Fitty",
      roles: ((claims.realm_access?.roles ?? []) as string[]).filter((role) => role.startsWith("FITTY_")) as Role[],
      subscriptionPlan: firstAttribute(claims.subscriptionPlan) ?? "FREE"
    }
  };
}

function logout(session: Session) {
  localStorage.removeItem(TOKEN_KEY);
  const params = new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, post_logout_redirect_uri: REDIRECT_URI });
  if (session.idToken) params.set("id_token_hint", session.idToken);
  window.location.assign(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?${params}`);
}

function loadSession() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  const session = JSON.parse(raw) as Session;
  if (session.expiresAt < Date.now() + 10_000) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return session;
}

function parseJwt(token: string) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(window.atob(payload), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function firstAttribute(value: unknown) {
  if (Array.isArray(value)) return value[0]?.toString();
  return value?.toString();
}

function randomString(length: number) {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => ("0" + (value % 36).toString(36)).slice(-1)).join("");
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function planLabel(plan: string) {
  return plan === "FREE" ? "Piano Free" : plan;
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs><linearGradient id="logoCoral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff8f7e" /><stop offset="1" stopColor="#f4604c" /></linearGradient><linearGradient id="logoMint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#56d8ba" /><stop offset="1" stopColor="#39c6a7" /></linearGradient></defs>
        <rect x="2" y="2" width="96" height="96" rx="27" fill="url(#logoCoral)" />
        <path d="M62 40 C61 27 70 19 84 17 C84 31 76 41 62 40 Z" fill="url(#logoMint)" />
        <path d="M70 34 C74 30 78 28 81 27" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".75" />
        <rect x="33" y="30" width="13.5" height="44" rx="6.7" fill="#fff" /><rect x="33" y="30" width="30" height="13.5" rx="6.7" fill="#fff" /><rect x="33" y="48" width="22" height="12" rx="6" fill="#fff" />
      </svg>
    </span>
  );
}

type AdminUser = { id: string; firstName: string; lastName: string; email: string; role: string; subscriptionPlan: string };

createRoot(document.getElementById("root")!).render(<App />);
