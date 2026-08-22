import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "animate.css"
import Lenis from "lenis"
import App from "./App"

function Root() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  return (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById("root")!).render(<Root />)
