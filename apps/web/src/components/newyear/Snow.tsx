import { useEffect, useRef } from 'react'

/**
 * Падающий снег на фоне страницы (canvas за содержимым).
 * Цвет снежинок берётся из CSS-переменной --snow ("r, g, b"), поэтому он подстраивается под тему.
 * При «уменьшении движения» снег рисуется один раз и не двигается.
 */
interface Flake {
  x: number
  y: number
  r: number
  vy: number
  vx: number
  phase: number
  sway: number
  a: number
  star: boolean
}

export function Snow() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let flakes: Flake[] = []
    let raf = 0
    let last = performance.now()

    const color = () => getComputedStyle(document.documentElement).getPropertyValue('--snow').trim() || '255, 255, 255'
    let rgb = color()

    const spawn = (anyY: boolean): Flake => {
      const r = Math.random() < 0.12 ? 2.6 + Math.random() * 2.2 : 0.8 + Math.random() * 1.8
      return {
        x: Math.random() * w,
        y: anyY ? Math.random() * h : -10,
        r,
        vy: 14 + r * 11 + Math.random() * 10, // px/с — крупные падают быстрее
        vx: -4 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.9,
        a: 0.45 + Math.random() * 0.5,
        star: r > 2.6,
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.min(170, Math.round((w * h) / 9000))
      while (flakes.length < target) flakes.push(spawn(true))
      flakes = flakes.slice(0, target)
    }

    const drawStar = (f: Flake) => {
      // маленькая снежинка-звёздочка из трёх линий
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.phase)
      ctx.strokeStyle = `rgba(${rgb}, ${f.a})`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI) / 3
        ctx.moveTo(Math.cos(ang) * f.r * 1.6, Math.sin(ang) * f.r * 1.6)
        ctx.lineTo(-Math.cos(ang) * f.r * 1.6, -Math.sin(ang) * f.r * 1.6)
      }
      ctx.stroke()
      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const f of flakes) {
        if (f.star) drawStar(f)
        else {
          ctx.fillStyle = `rgba(${rgb}, ${f.a})`
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      for (const f of flakes) {
        f.phase += dt * f.sway
        f.y += f.vy * dt
        f.x += (f.vx + Math.sin(f.phase * 2) * 12) * dt
        if (f.y > h + 10 || f.x < -20 || f.x > w + 20) Object.assign(f, spawn(false))
      }
      draw()
      raf = requestAnimationFrame(tick)
    }

    resize()
    if (reduce) draw()
    else raf = requestAnimationFrame(tick)

    // цвет снега меняется вместе с темой
    const mo = new MutationObserver(() => {
      rgb = color()
      if (reduce) draw()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-variant'] })
    window.addEventListener('resize', resize)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="ny-snow" aria-hidden="true" />
}
