export const metrics = [
  { label: "Wellness score", value: "82", tone: "primary" },
  { label: "Sleep", value: "7.4h", tone: "accent" },
  { label: "Steps", value: "8,420", tone: "secondary" },
  { label: "Heart rate", value: "72", tone: "warning" }
];

export const recommendations = [
  {
    title: "Prioritize recovery tonight",
    category: "recovery",
    priority: "normal",
    message: "Keep dinner light, hydrate, and target a consistent sleep window."
  },
  {
    title: "Add protein to lunch",
    category: "nutrition",
    priority: "normal",
    message: "A balanced protein source can help stabilize energy during the afternoon."
  }
];

export const meals = [
  { name: "Mint yogurt bowl", macros: "28g protein · 52g carbs · 14g fat" },
  { name: "Coral lentil salad", macros: "24g protein · 64g carbs · 18g fat" },
  { name: "Lavender berry oats", macros: "18g protein · 70g carbs · 12g fat" }
];

export const notifications = [
  { title: "Recommendation ready", message: "Your recovery suggestion is available.", unread: true },
  { title: "Profile updated", message: "Nutrition preferences were saved.", unread: false }
];
