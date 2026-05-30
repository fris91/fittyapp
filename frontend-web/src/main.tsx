import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:30081";
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "fitty";
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "fitty-web";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const TOKEN_KEY = "fitty.session";
const VERIFIER_KEY = "fitty.pkce.verifier";

const fallbackData: FittyData = {
  today: {
    focus: "Camminata da 15 min + pranzo ricco di proteine",
    focusReason: "Ti mantiene in linea con l'obiettivo di perdere peso senza appesantire una giornata piena.",
    rings: { move: 60, meals: 66, body: 100 },
    streakDays: 12,
    coachLine: "Hai dormito 7,4 ore e sei in buon ritmo. Vuoi rendere domani una giornata di recupero più leggera?"
  },
  progress: {
    weightKg: 64.2,
    bmi: 22.7,
    bodyFat: 24,
    muscle: 41,
    wellnessScore: 82,
    trend: [95, 88, 90, 74, 68, 60, 52]
  },
  recommendations: [
    { title: "Priorità al recupero stasera", text: "Cena leggera, idratazione e una finestra di sonno costante.", tone: "lav" },
    { title: "Aggiungi proteine a pranzo", text: "Stabilizza l'energia del pomeriggio e sostiene il tuo obiettivo.", tone: "mint" },
    { title: "Mancano 3 bicchieri d'acqua", text: "Un promemoria gentile per il resto della giornata.", tone: "plain" }
  ],
  notifications: [
    { title: "Serie di 12 giorni: continua così", text: "Registra oggi per arrivare a 13.", time: "2m", tone: "coral" },
    { title: "Nuovo miglioramento: 0,3 kg questa settimana", text: "Stai andando verso il tuo obiettivo.", time: "1h", tone: "mint" },
    { title: "Il coach ha un consiglio di recupero", text: "Tocca per vedere il piano più leggero di domani.", time: "3h", tone: "lav" },
    { title: "Promemoria idratazione", text: "Mancano 3 bicchieri al tuo obiettivo.", time: "5h", tone: "amber" },
    { title: "Apple Health richiede riconnessione", text: "Sistema da Impostazioni e integrazioni.", time: "1g", tone: "plain" }
  ]
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
  const data = useFittyData(session);
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
          {page === "progress" && <ProgressScreen data={data} />}
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

function AnonymousHome({ onSession, theme, onTheme }: { onSession: (session: Session) => void; theme: string; onTheme: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/identity/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Email o password non validi");
      const token = await response.json();
      const session = sessionFromTokenResponse(token);
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="public-shell">
      <header className="public-header">
        <button className="side-brand"><LogoMark /><span><b>Fitty</b><small>APP WEB</small></span></button>
        <button className="icon-btn" aria-label="Cambia tema" onClick={onTheme}>{theme === "light" ? <Moon /> : <Sun />}</button>
      </header>
      <section className="login-hero">
        <div className="login-copy">
          <span className="tag">Benessere, nutrizione e allenamento</span>
          <h2>Fitty</h2>
          <p>Accedi al tuo spazio personale per seguire progressi, piani, pasti e consigli. I tuoi dati restano protetti e visibili solo dopo il login.</p>
          <div className="hero-points">
            <span><Activity size={17} /> Progressi</span>
            <span><Utensils size={17} /> Nutrizione</span>
            <span><Dumbbell size={17} /> Allenamento</span>
          </div>
        </div>

        <div className="panel auth-card">
          <div>
            <span className="cap">Bentornato</span>
            <h2>Accedi a Fitty</h2>
            <p>Usa email e password oppure continua con un provider collegato.</p>
          </div>
          <form className="auth-form" onSubmit={submitLogin}>
            <label>Email<span className="auth-field"><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.it" /></span></label>
            <label>Password<span className="auth-field"><Lock size={18} /><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="La tua password" /></span></label>
            {error && <div className="alert">{error}</div>}
            <button className="btn cta full" disabled={isLoading}>{isLoading ? "Accesso in corso..." : "Accedi"} <ArrowRight size={18} /></button>
          </form>
          <div className="divider"><span>oppure</span></div>
          <div className="social-grid">
            <button className="social-button" onClick={() => startLogin("google")}><span>G</span> Continua con Google</button>
            <button className="social-button" onClick={() => startLogin("facebook")}><span>f</span> Continua con Facebook</button>
          </div>
        </div>
      </section>
    </main>
  );
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
            <RingCard tone="coral" value={data.today.rings.move} label="Movimento" detail="18 / 30 minuti attivi" />
            <RingCard tone="mint" value={data.today.rings.meals} label="Pasti" detail="1 pasto da registrare" center="2/3" />
            <RingCard tone="lav" value={data.today.rings.body} label="Dati corpo" detail="64,2 kg registrati" center="✓" />
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Questa settimana</h3><span className="badge amber">serie di {data.today.streakDays} giorni</span></div>
            <div className="week-row">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day, index) => (
                <div key={day} className={index > 4 ? "muted-day" : ""}>
                  <div className={index < 2 ? "mini-ring done" : index === 2 ? "mini-ring partial" : "mini-ring empty"}>{index < 2 ? "✓" : index === 2 ? "75" : ""}</div>
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
            <div className="actions"><button className="btn sm dark">Sì, fallo</button><button className="btn sm ghost">Più tardi</button></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Statistiche rapide</h3></div>
            <div className="list">
              <InfoRow icon="👣" title="8.420 passi" text="84% dell'obiettivo" meta="+12%" tone="mint" />
              <InfoRow icon="🌙" title="7,4h sonno" text="buona notte" meta="+0,6h" tone="lav" />
              <InfoRow icon="♥" title="72 bpm a riposo" text="stabile" meta="-" tone="coral" />
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Attività recente</h3><span className="link">Tutte</span></div>
            <div className="list">
              <InfoRow icon="🥗" title="Pranzo registrato" text="Insalata di lenticchie" meta="1h" tone="mint" />
              <InfoRow icon="🏋" title="Allenamento completato" text="Lower body - 35 min" meta="3h" tone="coral" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressScreen({ data }: { data: FittyData }) {
  return (
    <section className="screen">
      <PageHead title="Progressi e corpo" text="Qui vive l'analisi completa: la home resta calma, i dettagli stanno qui." action={<><div className="seg"><button className="on">Settimana</button><button>Mese</button><button>Anno</button></div><button className="btn cta">+ Aggiungi dati corpo</button></>} />
      <div className="grid g-4">
        <Stat icon="⚖" label="Peso" value={`${data.progress.weightKg.toFixed(1)} kg`} meta="-0,3 questa settimana" />
        <Stat icon="📊" label="BMI" value={data.progress.bmi.toString()} meta="intervallo normale" />
        <Stat icon="🔥" label="Massa grassa" value={`${data.progress.bodyFat}%`} meta="-0,5" />
        <Stat icon="💪" label="Muscolo" value={`${data.progress.muscle}%`} meta="stabile" />
      </div>
      <div className="grid g-32 margin-top">
        <div className="panel lg">
          <div className="panel-head"><h3>Andamento peso</h3><span className="badge green">verso l'obiettivo</span></div>
          <div className="bar-chart">
            {data.progress.trend.map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{index === data.progress.trend.length - 1 ? "Ora" : `S${index + 1}`}</span></div>)}
          </div>
        </div>
        <div className="panel lg tint-mint center">
          <span className="cap mint">Punteggio wellness</span>
          <div className="big-score">{data.progress.wellnessScore}</div>
          <span className="delta up">+4 rispetto alla scorsa settimana</span>
          <p>Combinazione di attività, sonno, nutrizione e costanza.</p>
        </div>
      </div>
      <div className="panel margin-top">
        <div className="panel-head"><h3>Storico dati corpo</h3><span className="link">Esporta CSV</span></div>
        <table><thead><tr><th>Data</th><th>Peso</th><th>Massa grassa</th><th>Muscolo</th><th>Fonte</th><th></th></tr></thead><tbody>
          <tr><td>28 Mag</td><td><b>64,2 kg</b></td><td>24,0%</td><td>41%</td><td><span className="badge lav">Manuale</span></td><td>...</td></tr>
          <tr><td>21 Mag</td><td><b>64,5 kg</b></td><td>24,5%</td><td>40,8%</td><td><span className="badge green">Google Fit</span></td><td>...</td></tr>
          <tr><td>14 Mag</td><td><b>65,1 kg</b></td><td>25,0%</td><td>40,5%</td><td><span className="badge green">Google Fit</span></td><td>...</td></tr>
        </tbody></table>
      </div>
    </section>
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
            {data.recommendations.map((item) => <div key={item.title} className={`panel tint-${item.tone === "plain" ? "none" : item.tone}`}><h3>{item.title}</h3><p>{item.text}</p></div>)}
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
  const [data, setData] = useState<FittyData>(fallbackData);

  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.all([
      apiGet<Partial<{ focus: string; rings: { move: number; meals: number; body: number }; streakDays: number; coachLine: string }>>("/api/v1/mobile/today", session.accessToken),
      apiGet<Partial<{ wellnessScore: number; weightTrend: number[] }>>("/api/v1/mobile/progress", session.accessToken)
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
          trend: progress.weightTrend?.length ? normalizeTrend(progress.weightTrend) : current.progress.trend
        }
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  return data;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json();
}

function normalizeTrend(values: number[]) {
  if (values.length === 0) return fallbackData.progress.trend;
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
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  sessionStorage.removeItem(VERIFIER_KEY);
  return session;
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
