const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.1.192:30080";
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";

export type ApiState<T> = {
  status: "empty" | "loading" | "error" | "ready";
  data?: T;
  error?: string;
};

export type TodaySummary = {
  firstName?: string;
  focus: string;
  rings: {
    move: number;
    meals: number;
    body: number;
  };
  streakDays: number;
  coachLine: string;
  disclaimer?: string;
};

export type ProgressSummary = {
  wellnessScore: number;
  weightTrend: number[];
};

export type CoachRecommendation = {
  id: string;
  title: string;
  category: "nutrition" | "training" | "recovery" | "body-composition" | "risk" | "general";
  priority: "low" | "normal" | "high";
  why: string;
  medicalBoundary?: string;
};

export type IdentityRegisterPayload = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  locale?: string;
  subscriptionPlan?: "FREE" | "BRONZE" | "SILVER" | "GOLD";
  goals?: string[];
  bodyBasics?: {
    sex?: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
  };
  activityProfile?: {
    activityLevel?: string;
    trainingDaysPerWeek?: number;
    connectedProvider?: string;
  };
  consent?: {
    wellnessDataProcessing?: boolean;
    medicalBoundaryAccepted?: boolean;
    marketing?: boolean;
  };
  socialIdentity?: {
    provider?: "google" | "facebook" | "apple";
    providerSubject?: string;
    emailVerified?: boolean;
    rawProfileJson?: string;
  };
};

export type IdentityToken = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

export type IdentityResponse = {
  keycloakUserId: string;
  appUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionPlan: string;
  token?: IdentityToken;
};

export async function registerIdentity(payload: IdentityRegisterPayload): Promise<IdentityResponse> {
  if (USE_MOCKS) {
    return {
      keycloakUserId: `mock-user-${Date.now()}`,
      appUserId: `mock-user-${Date.now()}`,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      subscriptionPlan: payload.subscriptionPlan ?? "FREE",
      token: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 300,
        tokenType: "Bearer"
      }
    };
  }
  return request<IdentityResponse>("/api/v1/identity/register", undefined, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginIdentity(email: string, password: string): Promise<IdentityToken> {
  if (USE_MOCKS) {
    return {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresIn: 300,
      tokenType: "Bearer"
    };
  }
  return request<IdentityToken>("/api/v1/identity/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getTodaySummary(token?: string): Promise<TodaySummary> {
  if (USE_MOCKS) {
    return {
      firstName: "Friend",
      focus: "Start with a 15-minute walk today",
      rings: { move: 5, meals: 0, body: 0 },
      streakDays: 2,
      coachLine: "Log your first meal to start your streak.",
      disclaimer: "Wellness guidance, not medical advice."
    };
  }
  return request<TodaySummary>("/api/v1/mobile/today", token);
}

export async function getProgressSummary(token?: string): Promise<ProgressSummary> {
  if (USE_MOCKS) {
    return {
      wellnessScore: 72,
      weightTrend: [72, 64, 69, 58, 54, 49, 45]
    };
  }
  return request<ProgressSummary>("/api/v1/mobile/progress", token);
}

export async function getCoachRecommendations(token?: string): Promise<CoachRecommendation[]> {
  if (USE_MOCKS) {
    return [
      {
        id: "protein-lunch",
        title: "Add protein to lunch",
        category: "nutrition",
        priority: "normal",
        why: "This helps stabilize afternoon energy when meal data is still sparse."
      },
      {
        id: "gentle-walk",
        title: "Take a gentle walk after dinner",
        category: "training",
        priority: "low",
        why: "Light movement is a safe first habit for your selected activity level."
      }
    ];
  }
  return request<CoachRecommendation[]>("/api/v1/recommendations", token);
}

export async function saveMealLog(token: string | undefined, payload: unknown) {
  if (USE_MOCKS) {
    return { id: `mock-meal-${Date.now()}`, approximate: true, payload };
  }
  return request("/api/v1/meal-service", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function saveHealthSnapshot(token: string | undefined, payload: unknown) {
  if (USE_MOCKS) {
    return { id: `mock-health-${Date.now()}`, payload };
  }
  return request("/api/v1/health-data", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

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
  waistCm?: number;
  chestCm?: number;
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  [key: string]: unknown;
};

export async function getHealthHistory(token: string | undefined, type?: MeasurementType): Promise<HealthSnapshot[]> {
  if (USE_MOCKS) {
    return [];
  }
  const query = type ? `?type=${type}` : "";
  return request<HealthSnapshot[]>(`/api/v1/health-data/history${query}`, token);
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`Fitty API returned ${response.status}`);
  }
  return response.json();
}
