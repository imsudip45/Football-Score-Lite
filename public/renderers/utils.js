// ============================================
// GRAPHICS UTILITIES
// Clean, reusable utilities for PIXI.js v8 graphics
// ============================================

import * as PIXI from 'pixi.js'

// Canvas dimensions
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

// ============================================
// EASING FUNCTIONS
// ============================================

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export const easeOutBack = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const easeInOutCubic = (t) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export const easeInOutQuart = (t) => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

// ============================================
// COLOR UTILITIES
// ============================================

export const hexToNumber = (hex) => {
  if (!hex) return 0x000000
  const cleaned = hex.replace('#', '')
  const parsed = parseInt(cleaned, 16)
  return isNaN(parsed) ? 0x000000 : parsed
}

// ============================================
// PIXI INITIALIZATION
// ============================================

/**
 * Initialize PIXI application with broadcast settings
 */
export const initPixiApp = async (container) => {
  console.log('[Utils] Initializing PIXI app, container:', container)
  const app = new PIXI.Application()
  
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: 0x111827,
    backgroundAlpha: 1,
    antialias: true,
    resolution: 2,
    powerPreference: 'high-performance',
  })

  console.log('[Utils] PIXI app initialized, canvas:', app.canvas)

  // Clear container
  if (container.firstChild) {
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
  }

  // Ensure container has proper styles
  if (!container.style.width || container.style.width === '') {
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.position = 'relative'
    container.style.overflow = 'hidden'
  }

  // Append canvas with proper styles
  if (app.canvas) {
    container.appendChild(app.canvas)
    Object.assign(app.canvas.style, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
    })
    console.log('[Utils] Canvas appended and styled:', {
      width: app.canvas.width,
      height: app.canvas.height,
      styleWidth: app.canvas.style.width,
      styleHeight: app.canvas.style.height
    })
  } else {
    console.error('[Utils] Canvas not available!')
  }

  // Setup responsive scaling
  const setupResize = () => {
    const resize = () => {
      if (!container || !app.renderer) return
      const parent = container
      const scale = Math.min(parent.clientWidth / CANVAS_WIDTH, parent.clientHeight / CANVAS_HEIGHT)
      const offsetX = (parent.clientWidth - CANVAS_WIDTH * scale) / 2
      const offsetY = (parent.clientHeight - CANVAS_HEIGHT * scale) / 2
      app.stage.scale.set(scale)
      app.stage.position.set(offsetX, offsetY)
    }
    resize()
    window.addEventListener('resize', resize)
    return resize
  }

  const resizeHandler = setupResize()

  return { app, resizeHandler }
}

// ============================================
// ANIMATION UTILITIES
// ============================================

/**
 * Animate container show/hide with fade and slide
 */
export const animateShowHide = (app, container, shouldShow, options = {}) => {
  const {
    duration = 0.5,
    slideDirection = 'down',
    startAlpha = 0,
    endAlpha = 1,
    startScale = 0.8,
    endScale = 1,
    easing = easeOutCubic,
  } = options

  if (!container || container.destroyed) return () => {}

  const startY = container.y
  const startX = container.x
  const slideDistance = 30

  let progress = 0
  const speed = 1 / (duration * 60)

  const animate = (ticker) => {
    if (container.destroyed) {
      app.ticker.remove(animate)
      return
    }

    progress += speed * (ticker.deltaTime / 16.67)
    const t = Math.min(progress, 1)
    const easedT = easing(t)

    if (shouldShow) {
      container.alpha = startAlpha + (endAlpha - startAlpha) * easedT
      container.scale.set(startScale + (endScale - startScale) * easedT)

      if (slideDirection === 'down') {
        container.y = startY - slideDistance + (slideDistance * easedT)
      } else if (slideDirection === 'up') {
        container.y = startY + slideDistance - (slideDistance * easedT)
      } else if (slideDirection === 'left') {
        container.x = startX + slideDistance - (slideDistance * easedT)
      } else if (slideDirection === 'right') {
        container.x = startX - slideDistance + (slideDistance * easedT)
      }
    } else {
      const reverseT = 1 - easedT
      container.alpha = endAlpha - (endAlpha - startAlpha) * reverseT
      container.scale.set(endScale - (endScale - startScale) * reverseT)

      if (slideDirection === 'down') {
        container.y = startY - (slideDistance * reverseT)
      } else if (slideDirection === 'up') {
        container.y = startY + (slideDistance * reverseT)
      } else if (slideDirection === 'left') {
        container.x = startX + (slideDistance * reverseT)
      } else if (slideDirection === 'right') {
        container.x = startX - (slideDistance * reverseT)
      }
    }

    if (t >= 1) {
      app.ticker.remove(animate)
      if (!shouldShow) {
        container.alpha = 0
        container.visible = false
      } else {
        container.alpha = endAlpha
        container.scale.set(endScale)
        container.visible = true
      }
    }
  }

  container.visible = true
  app.ticker.add(animate)

  return () => {
    try {
      app.ticker.remove(animate)
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Animate text change with fade
 */
export const animateTextChange = (app, text, newText) => {
  if (!text || text.destroyed) return () => {}

  let progress = 0
  const speed = 0.05

  const animate = (ticker) => {
    if (text.destroyed) {
      app.ticker.remove(animate)
      return
    }

    progress += speed * (ticker.deltaTime / 16.67)
    const t = Math.min(progress, 1)

    if (t < 0.5) {
      text.alpha = 1 - (t * 2)
    } else {
      if (Math.floor(t * 20) !== Math.floor((t - speed) * 20)) {
        text.text = newText
      }
      text.alpha = (t - 0.5) * 2
    }

    if (t >= 1) {
      text.alpha = 1
      app.ticker.remove(animate)
    }
  }

  app.ticker.add(animate)

  return () => {
    try {
      app.ticker.remove(animate)
    } catch (e) {
      // Ignore errors
    }
  }
}
