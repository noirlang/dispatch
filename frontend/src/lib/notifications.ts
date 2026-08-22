// Play a clean, subtle 2-tone notification sound using Web Audio API
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    // Tone 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.25)

    // Tone 2 (higher harmonious note)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.1)
    osc2.stop(ctx.currentTime + 0.4)
  } catch {
    // Audio autoplay restrictions gracefully handled
  }
}

// Trigger mobile haptic feedback vibration
export function triggerHapticVibration() {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([120, 60, 120])
    }
  } catch {
    // Vibration not supported
  }
}

// Request Notification Permission for Desktop & Mobile Browsers
export async function requestNotificationPermission(): Promise<boolean> {
  // Also register service worker if available
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js")
    } catch (e) {
      console.warn("SW register:", e)
    }
  }

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

// Send Native / PWA Push Notification with Sound + Vibration
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  // 1. Play sound
  playNotificationSound()

  // 2. Vibrate mobile device
  triggerHapticVibration()

  // 3. Dispatch system notification
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        const notifOptions: any = {
          icon: "/dispatch.png",
          badge: "/dispatch.png",
          vibrate: [120, 60, 120],
          ...options,
        }
        reg.showNotification(title, notifOptions)
      })
    } else {
      const n = new Notification(title, {
        icon: "/dispatch.png",
        badge: "/dispatch.png",
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
