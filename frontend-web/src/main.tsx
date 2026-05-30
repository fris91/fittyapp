import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Lock,
  LogOut,
  Mail,
  Moon,
  Ruler,
  Settings,
  Sparkles,
  Sun,
  Target,
  Utensils,
  Users
} from "lucide-react";
import "./styles.css";

type Role = "FITTY_USER" | "FITTY_ADMIN";
type Page = "dashboard" | "body" | "measurements" | "recommendations" | "nutrition" | "workout" | "profile" | "admin-users";

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:30081";
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "fitty";
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "fitty-web";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const TOKEN_KEY = "fitty.session";
const VERIFIER_KEY = "fitty.pkce.verifier";

const userNav: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: "dashboard", label: "Dashboard", icon: <Activity size={19} /> },
  { page: "body", label: "Body", icon: <Ruler size={19} /> },
  { page: "measurements", label: "Measurements", icon: <Target size={19} /> },
  { page: "recommendations", label: "Recommendations", icon: <Sparkles size={19} /> },
  { page: "nutrition", label: "Nutrition", icon: <Utensils size={19} /> },
  { page: "workout", label: "Workout", icon: <Activity size={19} /> },
  { page: "profile", label: "Settings", icon: <Settings size={19} /> }
];

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<Page>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isAdmin = session?.user.roles.includes("FITTY_ADMIN") ?? false;

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

  const nav = isAdmin ? [{ page: "admin-users" as Page, label: "Users", icon: <Users size={19} /> }, ...userNav] : userNav;
  const activeTitle = nav.find((item) => item.page === page)?.label ?? "Dashboard";

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage(isAdmin ? "admin-users" : "dashboard")}>
          <LogoMark />
          <span>Fitty</span>
        </button>
        <nav>
          {nav.map((item) => (
            <button key={item.page} className={page === item.page ? "nav active" : "nav"} onClick={() => setPage(item.page)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="caption">{isAdmin ? "Admin workspace" : "Personal workspace"}</span>
            <h1>{activeTitle}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <span className="pill">{session.user.subscriptionPlan}</span>
            <button className="avatar" title={session.user.email}>{initials(session.user.name)}</button>
            <button className="icon-button" aria-label="Logout" onClick={() => logout(session)}>
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {page === "admin-users" && <AdminUsers token={session.accessToken} />}
        {page === "dashboard" && <UserDashboard />}
        {page === "body" && <BodyComposition />}
        {page === "measurements" && <HealthMeasurements />}
        {page === "recommendations" && <Recommendations />}
        {page === "nutrition" && <Nutrition />}
        {page === "workout" && <Workout />}
        {page === "profile" && <Profile session={session} />}
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
        <button className="brand"><LogoMark /><span>Fitty</span></button>
        <button className="icon-button" aria-label="Toggle theme" onClick={onTheme}>{theme === "light" ? <Moon /> : <Sun />}</button>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">Wellness, nutrizione e allenamento</span>
          <h2>Fitty</h2>
          <p>Accedi al tuo spazio personale per seguire progressi, piani, pasti e consigli. I dati restano visibili solo dopo il login.</p>
          <div className="hero-points">
            <span><Activity size={17} /> Progressi</span>
            <span><Utensils size={17} /> Nutrizione</span>
            <span><Dumbbell size={17} /> Allenamento</span>
          </div>
        </div>

        <div className="panel auth-card">
          <div>
            <span className="caption">Bentornato</span>
            <h2>Accedi a Fitty</h2>
            <p>Usa email e password oppure continua con un provider collegato.</p>
          </div>

          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              Email
              <span className="field">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@email.it"
                />
              </span>
            </label>
            <label>
              Password
              <span className="field">
                <Lock size={18} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="La tua password"
                />
              </span>
            </label>
            {error && <div className="alert">{error}</div>}
            <button className="primary wide-button" disabled={isLoading}>
              {isLoading ? "Accesso in corso..." : "Accedi"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="divider"><span>oppure</span></div>
          <div className="social-grid">
            <button className="social-button" onClick={() => startLogin("google")}><span>G</span> Continua con Google</button>
            <button className="social-button" onClick={() => startLogin("facebook")}><span>f</span> Continua con Facebook</button>
          </div>

          <p className="auth-note">La registrazione completa passa dall'onboarding Fitty, dove confermi obiettivi, consenso e dati iniziali.</p>
        </div>
      </section>
    </main>
  );
}

function UserDashboard() {
  return (
    <section className="stack">
      <div className="content-grid">
        <EmptyPanel title="Health overview" text="No measurements have been logged yet." action="Add body or health measurements" />
        <EmptyPanel title="Goals" text="No active goals are configured yet." action="Configure goals" />
        <EmptyPanel title="Recommendations" text="No recommendation has been generated from your real data yet." action="Generate after first data entry" />
        <EmptyPanel title="Dashboard widgets" text="Widget personalization will be enabled after the first profile setup." action="Customize later" />
      </div>
    </section>
  );
}

function BodyComposition() {
  return (
    <section className="panel form-grid">
      <label>Weight kg<input placeholder="Manual entry" /></label>
      <label>Height cm<input placeholder="Manual entry" /></label>
      <label>Body fat %<input placeholder="Optional" /></label>
      <label>Waist cm<input placeholder="Optional" /></label>
      <label>Hips cm<input placeholder="Optional" /></label>
      <label>Chest cm<input placeholder="Optional" /></label>
      <label>Arms cm<input placeholder="Optional" /></label>
      <label>Thighs cm<input placeholder="Optional" /></label>
      <button className="primary">Save composition snapshot</button>
    </section>
  );
}

function HealthMeasurements() {
  return (
    <section className="panel form-grid">
      <label>Blood pressure<input placeholder="120/80" /></label>
      <label>Resting heart rate<input placeholder="Manual entry" /></label>
      <label>Sleep hours<input placeholder="Manual entry" /></label>
      <label>Steps<input placeholder="Manual entry or wearable sync" /></label>
      <label>Hydration liters<input placeholder="Optional" /></label>
      <label className="wide">Notes<textarea placeholder="Symptoms, context, training day, stress level" /></label>
      <button className="primary">Save health measurement</button>
    </section>
  );
}

function Recommendations() {
  return <EmptyPanel title="No recommendations yet" text="Fitty will generate deterministic recommendations after body, meal, activity, sleep and goal data are available." action="Add first measurement" />;
}

function Nutrition() {
  return (
    <section className="stack">
      <EmptyPanel title="No meals logged" text="Manual meal logging and AI plate-estimation placeholders will live here." action="Log meal manually" />
      <EmptyPanel title="No nutrition plan" text="Plans will be generated from goals, body composition, preferences and subscription." action="Generate nutrition plan" />
    </section>
  );
}

function Workout() {
  return <EmptyPanel title="No workout plan" text="Workout plan generation will use goals, fitness level, equipment and progression notes." action="Generate starter plan" />;
}

function Profile({ session }: { session: Session }) {
  return (
    <section className="panel form-grid">
      <label>Name<input value={session.user.name} readOnly /></label>
      <label>Email<input value={session.user.email} readOnly /></label>
      <label>Roles<input value={session.user.roles.join(", ")} readOnly /></label>
      <label>Subscription<input value={session.user.subscriptionPlan} readOnly /></label>
      <label className="wide check"><input type="checkbox" /> I consent to local health data processing</label>
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
        if (!response.ok) throw new Error(`Admin API returned ${response.status}`);
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subscriptionPlan })
      });
      if (!response.ok) throw new Error(`Subscription update returned ${response.status}`);
      const updated = await response.json() as AdminUser;
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update subscription");
    } finally {
      setSavingUserId("");
    }
  }

  if (error) {
    return <EmptyPanel title="Admin API unavailable" text={error} action="Check user-service logs" />;
  }

  return (
    <section className="panel">
      <h2>Registered users</h2>
      <p>Admins can inspect anagraphic fields and subscription plans. Sensitive health metrics are intentionally not exposed here.</p>
      {users.length === 0 ? (
        <div className="empty-state">No application profiles have been created yet.</div>
      ) : (
        <div className="table">
          <b>Name</b><b>Email</b><b>Type</b><b>Subscription</b>
          {users.map((user) => (
            <React.Fragment key={user.id}>
              <span>{user.firstName} {user.lastName}</span>
              <span>{user.email}</span>
              <span>{user.role}</span>
              <select
                value={user.subscriptionPlan ?? "FREE"}
                disabled={savingUserId === user.id}
                onChange={(event) => updateSubscription(user.id, event.target.value)}
              >
                {["FREE", "BRONZE", "SILVER", "GOLD"].map((plan) => <option key={plan}>{plan}</option>)}
              </select>
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyPanel({ title, text, action }: { title: string; text: string; action: string }) {
  return (
    <article className="panel empty-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <span className="pill">{action}</span>
    </article>
  );
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
  if (!response.ok) throw new Error("Could not complete login");
  const token = await response.json();
  const session = sessionFromTokenResponse(token);
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  sessionStorage.removeItem(VERIFIER_KEY);
  return session;
}

function sessionFromTokenResponse(token: {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}): Session {
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
      name: claims.name ?? claims.preferred_username ?? "Fitty user",
      roles: ((claims.realm_access?.roles ?? []) as string[]).filter((role) => role.startsWith("FITTY_")) as Role[],
      subscriptionPlan: firstAttribute(claims.subscriptionPlan) ?? "FREE"
    }
  };
}

function logout(session: Session) {
  localStorage.removeItem(TOKEN_KEY);
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: REDIRECT_URI
  });
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

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="logoCoral" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8f7e" />
            <stop offset="1" stopColor="#f4604c" />
          </linearGradient>
          <linearGradient id="logoMint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#56d8ba" />
            <stop offset="1" stopColor="#39c6a7" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="96" height="96" rx="27" fill="url(#logoCoral)" />
        <path d="M62 40 C61 27 70 19 84 17 C84 31 76 41 62 40 Z" fill="url(#logoMint)" />
        <path d="M70 34 C74 30 78 28 81 27" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".75" />
        <rect x="33" y="30" width="13.5" height="44" rx="6.7" fill="#fff" />
        <rect x="33" y="30" width="30" height="13.5" rx="6.7" fill="#fff" />
        <rect x="33" y="48" width="22" height="12" rx="6" fill="#fff" />
      </svg>
    </span>
  );
}

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  subscriptionPlan: string;
};

createRoot(document.getElementById("root")!).render(<App />);
