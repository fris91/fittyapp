import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/theme";

type Screen = "login" | "onboarding" | "dashboard" | "health" | "recommendations" | "nutrition" | "notifications" | "profile";

const metrics = [
  ["Score", "82"],
  ["Sleep", "7.4h"],
  ["Steps", "8,420"]
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.caption}>Fitty mobile</Text>
          <Text style={styles.title}>{titleFor(screen)}</Text>
        </View>
        {screen === "login" && <Login onNext={() => setScreen("onboarding")} />}
        {screen === "onboarding" && <Onboarding onNext={() => setScreen("dashboard")} />}
        {screen === "dashboard" && <Dashboard />}
        {screen === "health" && <HealthEntry />}
        {screen === "recommendations" && <Recommendations />}
        {screen === "nutrition" && <Nutrition />}
        {screen === "notifications" && <Notifications />}
        {screen === "profile" && <Profile />}
      </ScrollView>
      <View style={styles.tabs}>
        {(["dashboard", "health", "recommendations", "nutrition", "profile"] as Screen[]).map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, screen === item && styles.tabActive]} onPress={() => setScreen(item)}>
            <Text style={styles.tabText}>{shortTitle(item)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Login({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Welcome back</Text>
      <TextInput style={styles.input} placeholder="Email" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      <View style={styles.row}>
        <TouchableOpacity style={styles.primary} onPress={onNext}><Text style={styles.primaryText}>Log in</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary}><Text style={styles.secondaryText}>Google</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Onboarding({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.card}>
      {["Personal info", "Health goals", "Fitness level", "Nutrition", "Wearables", "Privacy"].map((step, index) => (
        <Text key={step} style={styles.step}>{index + 1}. {step}</Text>
      ))}
      <TouchableOpacity style={styles.primary} onPress={onNext}><Text style={styles.primaryText}>Finish setup</Text></TouchableOpacity>
    </View>
  );
}

function Dashboard() {
  return (
    <View>
      <View style={styles.metricGrid}>{metrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</View>
      <Recommendation title="Prioritize recovery tonight" />
    </View>
  );
}

function HealthEntry() {
  return <View style={styles.card}>{["Weight", "Height", "Blood pressure", "Heart rate", "Sleep hours", "Steps", "Notes"].map((field) => <TextInput key={field} style={styles.input} placeholder={field} />)}<TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Save snapshot</Text></TouchableOpacity></View>;
}

function Recommendations() {
  return <View><Recommendation title="Add protein to lunch" /><Recommendation title="Take a gentle walk after dinner" /><Text style={styles.disclaimer}>Fitty does not provide medical diagnosis. Consult a specialist when risk indicators are present.</Text></View>;
}

function Nutrition() {
  return <View>{["Mint yogurt bowl", "Coral lentil salad", "Lavender berry oats"].map((meal) => <View style={styles.card} key={meal}><Text style={styles.cardTitle}>{meal}</Text><Text style={styles.caption}>Balanced sample meal</Text></View>)}</View>;
}

function Notifications() {
  return <View>{["Recommendation ready", "Health data saved"].map((item) => <View style={styles.card} key={item}><Text style={styles.cardTitle}>{item}</Text><Text style={styles.caption}>Unread local notification</Text></View>)}</View>;
}

function Profile() {
  return <View style={styles.card}><TextInput style={styles.input} placeholder="Name" /><TextInput style={styles.input} placeholder="Goal" /><TextInput style={styles.input} placeholder="Connected provider" /><TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Save settings</Text></TouchableOpacity></View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.caption}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function Recommendation({ title }: { title: string }) {
  return <View style={styles.card}><Text style={styles.badge}>recovery · normal</Text><Text style={styles.cardTitle}>{title}</Text><Text style={styles.caption}>A gentle, practical suggestion generated by the starter rule engine.</Text></View>;
}

function titleFor(screen: Screen) {
  return screen === "login" ? "Fitty" : screen.charAt(0).toUpperCase() + screen.slice(1);
}

function shortTitle(screen: Screen) {
  const map: Record<Screen, string> = { login: "Login", onboarding: "Start", dashboard: "Home", health: "Health", recommendations: "AI", nutrition: "Meals", notifications: "Alerts", profile: "Me" };
  return map[screen];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingBottom: 110 },
  header: { marginBottom: 18 },
  caption: { color: theme.colors.muted, fontSize: 14 },
  title: { color: theme.colors.text, fontSize: 38, fontWeight: "800" },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderWidth: 1, borderRadius: theme.radius.lg, padding: 18, marginBottom: 14 },
  cardTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  input: { minHeight: 48, backgroundColor: "#fff", borderColor: theme.colors.line, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 12, marginBottom: 12 },
  row: { flexDirection: "row", gap: 10 },
  primary: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.full, minHeight: 46, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { backgroundColor: "#e9fbf6", borderRadius: theme.radius.full, minHeight: 46, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  secondaryText: { color: "#207f6d", fontWeight: "800" },
  step: { paddingVertical: 10, color: theme.colors.text, fontWeight: "700" },
  metricGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  metric: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 14, borderColor: theme.colors.line, borderWidth: 1 },
  metricValue: { color: theme.colors.text, fontSize: 24, fontWeight: "900", marginTop: 8 },
  badge: { alignSelf: "flex-start", backgroundColor: "#f6f2ff", color: "#6657d6", borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, overflow: "hidden" },
  disclaimer: { backgroundColor: "#fff6dc", color: "#7a5a12", borderRadius: theme.radius.md, padding: 14 },
  tabs: { position: "absolute", left: 12, right: 12, bottom: 12, backgroundColor: "#fff", borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.line, padding: 8, flexDirection: "row", gap: 4 },
  tab: { flex: 1, minHeight: 52, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#fff0ea" },
  tabText: { color: theme.colors.text, fontSize: 12, fontWeight: "700" }
});
