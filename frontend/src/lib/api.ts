const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

function getToken() {
  return localStorage.getItem("dispatch_token")
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error || "Request failed")
  }
  return res.json()
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken()
    return fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(err.error || "Upload failed")
      }
      return res.json()
    })
  }
}
