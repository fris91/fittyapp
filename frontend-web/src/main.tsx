import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bell,
  Check,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Home,
  LogIn,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Utensils
} from "lucide-react";
import { meals, metrics, notifications, recommendations } from "./mockData";
import "./styles.css";

type Page =
  | "landing"
  | "login"
  | "register"
  | "forgot"
  | "onboarding"
  | "dashboard"
  | "health"
  | "history"
  | "recommendations"
  | "nutrition"
  | "notifications"
  | "profile"
  | "ui-kit"
  | "error";

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: "dashboard", label: "Home", icon: <Home size={19} /> },
  { page: "health", label: "Health", icon: <HeartPulse size={19} /> },
  { page: "recommendations", label: "AI", icon: <Sparkles size={19} /> },
  { page: "nutrition", label: "Meals", icon: <Utensils size={19} /> },
  { page: "profile", label: "Profile", icon: <Settings size={19} /> }
];

function App() {
  const [page, setPage] = useState<Page>("landing");
  const activeTitle = useMemo(() => page.replace("-", " "), [page]);

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("dashboard")}>
          <span className="brand-mark">F</span>
          <span>Fitty</span>
        </button>
        <nav>
          {navItems.map((item) => (
            <button key={item.page} className={page === item.page ? "nav active" : "nav"} onClick={() => setPage(item.page)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <button className="nav" onClick={() => setPage("notifications")}>
            <Bell size={19} />
            <span>Notifications</span>
          </button>
          <button className="nav" onClick={() => setPage("ui-kit")}>
            <ShieldCheck size={19} />
            <span>UI Kit</span>
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="caption">Fitty local</span>
            <h1>{page === "landing" ? "Fitty" : titleCase(activeTitle)}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications" onClick={() => setPage("notifications")}>
              <Bell size={20} />
            </button>
            <button className="avatar" onClick={() => setPage("profile")}>LF</button>
          </div>
        </header>

        {page === "landing" && <Landing onNavigate={setPage} />}
        {page === "login" && <Auth mode="login" onNavigate={setPage} />}
        {page === "register" && <Auth mode="register" onNavigate={setPage} />}
        {page === "forgot" && <Forgot onNavigate={setPage} />}
        {page === "onboarding" && <Onboarding onNavigate={setPage} />}
        {page === "dashboard" && <Dashboard onNavigate={setPage} />}
        {page === "health" && <HealthEntry />}
        {page === "history" && <HealthHistory />}
        {page === "recommendations" && <Recommendations />}
        {page === "nutrition" && <Nutrition />}
        {page === "notifications" && <Notifications />}
        {page === "profile" && <Profile />}
        {page === "ui-kit" && <UiKit />}
        {page === "error" && <SystemStates onNavigate={setPage} />}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button key={item.page} className={page === item.page ? "bottom active" : "bottom"} onClick={() => setPage(item.page)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Landing({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="pill">Wellness, nutrition, movement</span>
        <h2>Fitty</h2>
        <p>One calm place for health signals, meal planning, gentle activity, and AI-powered wellness feedback.</p>
        <div className="actions">
          <button className="primary" onClick={() => onNavigate("register")}>Get started <ChevronRight size={18} /></button>
          <button className="secondary" onClick={() => onNavigate("login")}>Log in</button>
        </div>
      </div>
      <div className="phone-preview">
        <MetricCard label="Wellness score" value="82" tone="primary" />
        <RecommendationCard {...recommendations[0]} />
      </div>
    </section>
  );
}

function Auth({ mode, onNavigate }: { mode: "login" | "register"; onNavigate: (page: Page) => void }) {
  return (
    <section className="auth-grid">
      <div className="panel">
        <h2>{mode === "login" ? "Welcome back" : "Create your Fitty account"}</h2>
        <label>Email<input placeholder="lucas@example.com" /></label>
        <label>Password<input placeholder="••••••••" type="password" /></label>
        {mode === "register" && <label>Display name<input placeholder="Lucas" /></label>}
        <button className="primary" onClick={() => onNavigate("dashboard")}><LogIn size={18} /> {mode === "login" ? "Log in" : "Register"}</button>
        <div className="oauth-row">
          <button className="secondary">Google</button>
          <button className="secondary">Facebook</button>
        </div>
        <button className="ghost" onClick={() => onNavigate(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create account" : "Already have an account"}
        </button>
        <button className="ghost" onClick={() => onNavigate("forgot")}>Forgot password</button>
      </div>
    </section>
  );
}

function Forgot({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return <section className="panel narrow"><h2>Reset password</h2><label>Email<input placeholder="lucas@example.com" /></label><button className="primary" onClick={() => onNavigate("login")}>Send reset link</button></section>;
}

function Onboarding({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const steps = ["Personal info", "Health goals", "Fitness", "Nutrition", "Wearables", "Privacy"];
  return <section className="panel"><h2>Onboarding</h2><div className="stepper">{steps.map((s, i) => <span key={s} className={i < 2 ? "done" : ""}>{i + 1}. {s}</span>)}</div><button className="primary" onClick={() => onNavigate("dashboard")}>Finish setup</button></section>;
}

function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="stack">
      <section className="metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>
      <section className="content-grid">
        <div className="panel">
          <h2>Today</h2>
          <div className="summary-row"><Moon /> Sleep steady at 7.4h</div>
          <div className="summary-row"><Activity /> 8,420 steps logged</div>
          <div className="summary-row"><Dumbbell /> Light mobility recommended</div>
          <button className="secondary" onClick={() => onNavigate("health")}>Add health data</button>
        </div>
        <div className="panel">
          <h2>Latest recommendation</h2>
          <RecommendationCard {...recommendations[0]} />
        </div>
      </section>
    </div>
  );
}

function HealthEntry() {
  return <section className="panel form-grid"><label>Weight<input placeholder="74.2" /></label><label>Height<input placeholder="178" /></label><label>Blood pressure<input placeholder="120/80" /></label><label>Heart rate<input placeholder="72" /></label><label>Sleep hours<input placeholder="7.5" /></label><label>Steps<input placeholder="8400" /></label><label className="wide">Notes<textarea placeholder="Energy, symptoms, context" /></label><button className="primary">Save snapshot</button></section>;
}

function HealthHistory() {
  return <section className="panel"><h2>Health history</h2><div className="tabs"><button className="active">Weight</button><button>Steps</button><button>Sleep</button><button>Heart</button></div><div className="chart">Trend chart placeholder</div><Timeline /></section>;
}

function Recommendations() {
  return <section className="stack">{recommendations.map((item) => <RecommendationCard key={item.title} {...item} />)}<div className="alert">Fitty does not provide medical diagnosis. Consult a specialist when risk indicators are present.</div></section>;
}

function Nutrition() {
  return <section className="stack"><div className="metrics"><MetricCard label="Protein" value="92g" tone="secondary" /><MetricCard label="Carbs" value="210g" tone="accent" /><MetricCard label="Fats" value="64g" tone="warning" /></div>{meals.map((meal) => <div className="panel row" key={meal.name}><Utensils /><div><h3>{meal.name}</h3><p>{meal.macros}</p></div></div>)}</section>;
}

function Notifications() {
  return <section className="stack">{notifications.map((item) => <div className={item.unread ? "panel notification unread" : "panel notification"} key={item.title}><Bell /><div><h3>{item.title}</h3><p>{item.message}</p></div></div>)}</section>;
}

function Profile() {
  return <section className="panel form-grid"><label>Name<input placeholder="Lucas" /></label><label>Goal<select><option>Improve energy</option><option>Better sleep</option></select></label><label>Connected providers<input placeholder="Google Fit placeholder" /></label><label className="wide check"><input type="checkbox" defaultChecked /> I consent to local health data processing</label><button className="primary">Save settings</button></section>;
}

function UiKit() {
  return <section className="stack"><div className="panel"><h2>Buttons</h2><div className="actions"><button className="primary">Primary</button><button className="secondary">Secondary</button><button className="ghost">Ghost</button><button className="icon-button" aria-label="Confirm"><Check /></button></div></div><div className="metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div><RecommendationCard {...recommendations[1]} /><div className="panel"><h2>Controls</h2><div className="form-grid"><label>Input<input placeholder="Readable text" /></label><label>Select<select><option>Option</option></select></label><label className="check"><input type="checkbox" /> Checkbox</label><label className="check"><input type="radio" defaultChecked /> Radio</label><label>Slider<input type="range" /></label></div></div><div className="skeleton" /></section>;
}

function SystemStates({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return <section className="empty"><h2>Page not found</h2><p>The requested area is not available in this local starter.</p><button className="primary" onClick={() => onNavigate("dashboard")}>Back home</button></section>;
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><div className="progress"><i /></div></article>;
}

function RecommendationCard({ title, category, priority, message }: { title: string; category: string; priority: string; message: string }) {
  return <article className="panel recommendation"><div><span className="pill">{category} · {priority}</span><h3>{title}</h3><p>{message}</p></div><Sparkles /></article>;
}

function Timeline() {
  return <div className="timeline"><span>Today · 74.2kg · 8,420 steps</span><span>Yesterday · 74.5kg · 7,980 steps</span><span>Monday · 74.4kg · 9,120 steps</span></div>;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

createRoot(document.getElementById("root")!).render(<App />);
