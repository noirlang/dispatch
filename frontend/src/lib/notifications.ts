export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false
  }
  if (Notification.permission === "granted") {
    return true
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }
  return false
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          ...options,
        })
      })
    } else {
      const n = new Notification(title, {
        icon: "/favicon.svg",
        ...options,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    }
  } catch (err) {
    console.warn("Browser notification could not be sent:", err)
  }
}
