export const metrics = [
  { label: "Punteggio benessere", value: "82", tone: "primary" },
  { label: "Sonno", value: "7,4h", tone: "accent" },
  { label: "Passi", value: "8.420", tone: "secondary" },
  { label: "Battito", value: "72", tone: "warning" }
];

export const recommendations = [
  {
    title: "Priorita al recupero stasera",
    category: "recupero",
    priority: "normale",
    message: "Cena leggera, idratazione e una finestra di sonno costante."
  },
  {
    title: "Aggiungi proteine a pranzo",
    category: "nutrizione",
    priority: "normale",
    message: "Una fonte proteica bilanciata aiuta a stabilizzare l'energia del pomeriggio."
  }
];

export const meals = [
  { name: "Bowl yogurt e menta", macros: "28g proteine - 52g carboidrati - 14g grassi" },
  { name: "Insalata di lenticchie corallo", macros: "24g proteine - 64g carboidrati - 18g grassi" },
  { name: "Avena lavanda e frutti rossi", macros: "18g proteine - 70g carboidrati - 12g grassi" }
];

export const notifications = [
  { title: "Consiglio pronto", message: "Il suggerimento di recupero e disponibile.", unread: true },
  { title: "Profilo aggiornato", message: "Le preferenze nutrizionali sono state salvate.", unread: false }
];
