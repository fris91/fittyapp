const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/identity/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error("Login failed");
  }
  return response.json();
}

export async function saveHealthData(token: string, payload: unknown) {
  const response = await fetch(`${API_BASE_URL}/api/v1/health-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Could not save health data");
  }
  return response.json();
}
