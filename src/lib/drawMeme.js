export const CANVAS_W = 1080
export const CANVAS_H = 1350
export const RAIL_W = 260

/** Total export width — the rail is additive, so the artwork never shrinks. */
export function canvasWidth(sideRail) {
  return sideRail ? CANVAS_W + RAIL_W : CANVAS_W
}

const INK = '#01152b'
const ICE = '#f2fbff'
const PAD = 52
const GAP = 16

export const DISPLAY_FONT = '"Luckiest Guy", system-ui, sans-serif'

/** Load the display font before drawing — canvas silently falls back otherwise. */
export function loadDisplayFont() {
  if (!document.fonts) return Promise.resolve()
  return document.fonts.load(`400 48px "Luckiest Guy"`).catch(() => {})
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Cartoon label: heavy ink outline behind an ice-white fill. */
function drawOutlinedText(ctx, text, x, y, fontSize) {
  ctx.font = `400 ${fontSize}px ${DISPLAY_FONT}`
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(6, fontSize * 0.18)
  ctx.strokeStyle = INK
  ctx.strokeText(text, x, y)
  ctx.fillStyle = ICE
  ctx.fillText(text, x, y)
}

function drawCover(ctx, image, w, h) {
  const scale = Math.max(w / image.width, h / image.height)
  const dw = image.width * scale
  const dh = image.height * scale

  // Cover overflows by design, so clip it — otherwise it bleeds into the rail.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh)
  ctx.restore()
}

/** One placed image, clipped to a rounded card with an ink border. */
function drawImageCard(ctx, image, x, y, w, h) {
  const radius = Math.min(18, w * 0.12, h * 0.12)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
  const scale = Math.max(w / image.width, h / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()

  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.lineWidth = 5
  ctx.strokeStyle = INK
  ctx.stroke()
}

/** Lays a tier's images out as one centred row that fits the space given. */
function drawTierImages(ctx, images, top, height, areaWidth) {
  const count = images.length
  const available = areaWidth - PAD * 2 - GAP * (count - 1)
  const maxItemW = available / count

  const sized = images.map((image) => {
    const scale = Math.min(maxItemW / image.width, height / image.height)
    return { image, w: image.width * scale, h: image.height * scale }
  })

  const totalW = sized.reduce((sum, item) => sum + item.w, 0) + GAP * (count - 1)
  let x = (areaWidth - totalW) / 2

  for (const item of sized) {
    drawImageCard(ctx, item.image, x, top + (height - item.h) / 2, item.w, item.h)
    x += item.w + GAP
  }
}

/** A tier's single slot in the side rail — one image, filling it edge to edge. */
function drawRailSlot(ctx, image, x, top, w, h) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, top, w, h)
  ctx.clip()
  const scale = Math.max(w / image.width, h / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  ctx.drawImage(image, x + (w - dw) / 2, top + (h - dh) / 2, dw, dh)
  ctx.restore()
}

function drawStickerBox(ctx, text, x, y, fontSize, fill) {
  ctx.font = `400 ${fontSize}px ${DISPLAY_FONT}`
  const padX = fontSize * 0.5
  const padY = fontSize * 0.34
  const boxW = ctx.measureText(text).width + padX * 2
  const boxH = fontSize + padY * 2

  ctx.beginPath()
  ctx.roundRect(x, y, boxW, boxH, fontSize * 0.45)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = Math.max(4, fontSize * 0.11)
  ctx.strokeStyle = INK
  ctx.stroke()

  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + padX, y + boxH / 2 + fontSize * 0.06)

  return { width: boxW, height: boxH }
}

/**
 * Renders the whole meme. Everything is drawn at CANVAS_W x CANVAS_H so the
 * exported PNG matches the on-screen preview exactly.
 *
 * `tiers` is [{ label, images: [HTMLImageElement] }] — the background stays put
 * and uploads are placed into individual tiers.
 */
export function drawMeme(ctx, { background, tiers, showBranding, handle, sideRail }) {
  const w = CANVAS_W
  const h = CANVAS_H
  const totalW = canvasWidth(sideRail)

  ctx.clearRect(0, 0, totalW, h)
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, totalW, h)

  if (background) drawCover(ctx, background, w, h)

  const count = Math.max(tiers.length, 1)
  const bandH = h / count

  tiers.forEach((tier, i) => {
    const top = i * bandH

    // Deeper bands get darker — the whole point of an iceberg chart.
    const depth = count === 1 ? 0 : i / (count - 1)
    ctx.fillStyle = `rgba(1, 21, 43, ${0.1 + depth * 0.62})`
    ctx.fillRect(0, top, w, bandH)

    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(0, top)
      ctx.lineTo(totalW, top)
      ctx.lineWidth = 6
      ctx.strokeStyle = INK
      ctx.stroke()
    }

    // Band and rail hold their own images — the rail no longer steals them.
    if (sideRail && tier.railImage) {
      drawRailSlot(ctx, tier.railImage, w, top, RAIL_W, bandH)
    }

    const images = tier.images ?? []
    const text = (tier.label ?? '').trim()
    const fontSize = count > 6 ? 36 : 46

    // With images present the label sits at the top of the band so the two
    // never overlap; on its own it stays centred.
    let labelBottom = top
    if (text) {
      ctx.font = `400 ${fontSize}px ${DISPLAY_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const lines = wrapLines(ctx, text, w - PAD * 2)
      const lineH = fontSize * 1.15
      const blockH = lines.length * lineH
      const startY = images.length
        ? top + GAP + lineH / 2
        : top + bandH / 2 - ((lines.length - 1) * lineH) / 2

      lines.forEach((line, li) => {
        drawOutlinedText(ctx, line, w / 2, startY + li * lineH, fontSize)
      })

      labelBottom = images.length ? top + GAP + blockH : top
    }

    if (images.length) {
      const areaTop = text ? labelBottom + GAP : top + GAP
      // The handle badge is drawn last and would sit on top of the bottom
      // tier's images, so keep that strip clear.
      const reserve = i === count - 1 && showBranding && handle ? 96 : 0
      const areaH = top + bandH - areaTop - GAP - reserve
      if (areaH > 20) drawTierImages(ctx, images, areaTop, areaH, w)
    }
  })

  if (sideRail) {
    ctx.beginPath()
    ctx.moveTo(w, 0)
    ctx.lineTo(w, h)
    ctx.lineWidth = 6
    ctx.strokeStyle = INK
    ctx.stroke()
  }

  if (showBranding) {
    drawStickerBox(ctx, 'ICEBERG', PAD, PAD, 46, ICE)

    if (handle) {
      ctx.font = `400 34px ${DISPLAY_FONT}`
      const handleW = ctx.measureText(handle).width + 34
      drawStickerBox(ctx, handle, w - PAD - handleW, h - PAD - 62, 34, '#ffd93d')
    }
  }
}
