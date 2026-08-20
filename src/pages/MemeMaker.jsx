import { useCallback, useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import defaultImage from '../assets/iceberg.jpg'
import {
  CANVAS_H,
  CANVAS_W as CANVAS_MAIN_W,
  RAIL_W,
  canvasWidth,
  drawMeme,
  loadDisplayFont,
} from '../lib/drawMeme.js'
import { X_HANDLE } from '../lib/links.js'
import useLongPressDrag from '../lib/useLongPressDrag.js'
import '../styles/buttons.css'
import './MemeMaker.css'

const DEFAULT_LABELS = ['Surface', 'Shallow', 'Deep', 'Deeper', 'Abyss']
const MAX_TIERS = 8
const MAX_PER_TIER = 5
const MAX_FILE_BYTES = 12 * 1024 * 1024
const LABELS_KEY = 'iceberg:tiers'
const BRANDING_KEY = 'iceberg:branding'
const RAIL_KEY = 'iceberg:siderail'
const DRAG_TYPE = 'application/x-iceberg-upload'

let uploadCounter = 0

/**
 * Ids must be minted synchronously. Reading a shared counter inside a state
 * updater lets concurrent image loads collide on the same id.
 */
function nextUploadId() {
  uploadCounter += 1
  return `u${uploadCounter}-${Date.now().toString(36)}`
}

/** Only labels persist — object URLs for uploads die with the page. */
function loadSavedTiers() {
  try {
    const saved = JSON.parse(localStorage.getItem(LABELS_KEY))
    if (Array.isArray(saved) && saved.length) {
      return saved.map((label) => ({ label: String(label), items: [], rail: null }))
    }
  } catch {
    // Corrupt or unavailable storage — fall back to defaults.
  }
  return DEFAULT_LABELS.map((label) => ({ label, items: [], rail: null }))
}

// Persisted explicitly: browsers restore checkbox state across reloads on their
// own, which otherwise silently overrides the default and hides the branding.
function loadSavedBranding() {
  return localStorage.getItem(BRANDING_KEY) !== 'false'
}

function loadSavedSideRail() {
  return localStorage.getItem(RAIL_KEY) === 'true'
}

export default function MemeMaker() {
  const canvasRef = useRef(null)
  const [background, setBackground] = useState(null)
  const [uploads, setUploads] = useState([])
  const [tiers, setTiers] = useState(loadSavedTiers)
  const [showBranding, setShowBranding] = useState(loadSavedBranding)
  const [sideRail, setSideRail] = useState(loadSavedSideRail)
  const [picked, setPicked] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [nativeDragging, setNativeDragging] = useState(false)
  const [fontReady, setFontReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDisplayFont().then(() => setFontReady(true))
  }, [])

  // Without this, a file dropped anywhere but a target makes the browser open
  // it and navigate away, losing the whole meme in progress.
  useEffect(() => {
    const swallow = (event) => event.preventDefault()
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => {
      window.removeEventListener('dragover', swallow)
      window.removeEventListener('drop', swallow)
    }
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setBackground(img)
    img.src = defaultImage
  }, [])

  useEffect(() => {
    localStorage.setItem(LABELS_KEY, JSON.stringify(tiers.map((t) => t.label)))
  }, [tiers])

  useEffect(() => {
    localStorage.setItem(BRANDING_KEY, String(showBranding))
  }, [showBranding])

  useEffect(() => {
    localStorage.setItem(RAIL_KEY, String(sideRail))
  }, [sideRail])

  // Object URLs are held for the gallery thumbnails, so release them on unmount.
  const uploadsRef = useRef(uploads)
  uploadsRef.current = uploads
  useEffect(() => {
    return () => uploadsRef.current.forEach((item) => URL.revokeObjectURL(item.url))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const byId = new Map(uploads.map((item) => [item.id, item.image]))
    const resolved = tiers.map((tier) => ({
      label: tier.label,
      images: tier.items.map((id) => byId.get(id)).filter(Boolean),
      railImage: tier.rail ? byId.get(tier.rail) ?? null : null,
    }))

    drawMeme(canvas.getContext('2d'), {
      background,
      tiers: resolved,
      showBranding,
      sideRail,
      handle: `@${X_HANDLE}`,
    })
  }, [background, tiers, uploads, showBranding, sideRail, fontReady])

  const acceptFiles = useCallback((fileList, targetTier = null, dest = 'band') => {
    const files = Array.from(fileList ?? [])
    if (!files.length) return

    const images = files.filter((file) => file.type.startsWith('image/'))
    if (!images.length) {
      setError('Those files are not images.')
      return
    }

    const tooBig = images.filter((file) => file.size > MAX_FILE_BYTES)
    const usable = images.filter((file) => file.size <= MAX_FILE_BYTES)

    setError(
      tooBig.length ? `${tooBig.length} image(s) skipped — over 12MB.` : '',
    )

    usable.forEach((file) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const id = nextUploadId()
        setUploads((current) => [...current, { id, name: file.name, url, image: img }])

        // Dropped straight onto a zone — file goes to the gallery and that spot.
        if (targetTier !== null) {
          setTiers((current) =>
            current.map((tier, i) => {
              if (i !== targetTier) return tier
              if (dest === 'rail') return { ...tier, rail: id }
              return tier.items.length < MAX_PER_TIER
                ? { ...tier, items: [...tier.items, id] }
                : tier
            }),
          )
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        setError(`Could not read ${file.name}.`)
      }
      img.src = url
    })
  }, [])

  /** dest is 'band' (many per tier) or 'rail' (exactly one, replaces). */
  const placeInTier = useCallback((tierIndex, uploadId, dest = 'band') => {
    if (!uploadId) return
    setTiers((current) =>
      current.map((tier, i) => {
        if (i !== tierIndex) return tier
        if (dest === 'rail') return { ...tier, rail: uploadId }
        return tier.items.length < MAX_PER_TIER
          ? { ...tier, items: [...tier.items, uploadId] }
          : tier
      }),
    )
    setPicked(null)
  }, [])

  const handleTouchDrop = useCallback(
    (uploadId, dropKey) => {
      const [index, dest] = String(dropKey).split(':')
      placeInTier(Number(index), uploadId, dest)
    },
    [placeInTier],
  )

  const touchDrag = useLongPressDrag({
    onDrop: handleTouchDrop,
    zoneSelector: '.maker-zone',
  })

  const draggingUpload = touchDrag.dragging
    ? uploads.find((item) => item.id === touchDrag.dragging.id)
    : null

  const removeFromTier = (tierIndex, position) => {
    setTiers((current) =>
      current.map((tier, i) =>
        i === tierIndex
          ? { ...tier, items: tier.items.filter((_, p) => p !== position) }
          : tier,
      ),
    )
  }

  const removeFromRail = (tierIndex) => {
    setTiers((current) =>
      current.map((tier, i) => (i === tierIndex ? { ...tier, rail: null } : tier)),
    )
  }

  const clearTier = (tierIndex) => {
    setTiers((current) =>
      current.map((tier, i) =>
        i === tierIndex ? { ...tier, items: [], rail: null } : tier,
      ),
    )
  }

  const clearAllImages = () => {
    setTiers((current) => current.map((tier) => ({ ...tier, items: [], rail: null })))
    setPicked(null)
  }

  const clearGallery = () => {
    uploads.forEach((item) => URL.revokeObjectURL(item.url))
    setUploads([])
    setTiers((current) => current.map((tier) => ({ ...tier, items: [], rail: null })))
    setPicked(null)
  }

  const deleteUpload = (uploadId) => {
    setUploads((current) => {
      const target = current.find((item) => item.id === uploadId)
      if (target) URL.revokeObjectURL(target.url)
      return current.filter((item) => item.id !== uploadId)
    })
    setTiers((current) =>
      current.map((tier) => ({
        ...tier,
        items: tier.items.filter((id) => id !== uploadId),
        rail: tier.rail === uploadId ? null : tier.rail,
      })),
    )
    setPicked((current) => (current === uploadId ? null : current))
  }

  const updateLabel = (index, value) => {
    setTiers((current) =>
      current.map((tier, i) => (i === index ? { ...tier, label: value } : tier)),
    )
  }

  const addTier = () => {
    setTiers((current) =>
      current.length >= MAX_TIERS
        ? current
        : [...current, { label: '', items: [], rail: null }],
    )
  }

  const removeTier = (index) => {
    setTiers((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    )
  }

  const download = () => {
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'iceberg-meme.png'
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const shareToX = () => {
    const text = 'I made my own ICEBERG 🧊'
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&via=${X_HANDLE}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleZoneDrop = (index, dest) => (event) => {
    event.preventDefault()
    setDropTarget(null)
    // dragend can be missed if the source unmounts on drop — clear it here too.
    setNativeDragging(false)

    // A zone accepts both a gallery thumbnail and a file straight off the desktop.
    if (event.dataTransfer.files?.length) {
      acceptFiles(event.dataTransfer.files, index, dest)
      return
    }
    placeInTier(index, event.dataTransfer.getData(DRAG_TYPE), dest)
  }

  return (
    <main className="maker">
      <Header />

      <div className="maker-body">
        <h1 className="maker-title">Meme Maker</h1>

        <div className="maker-grid">
          <div className="maker-preview">
            <canvas
              ref={canvasRef}
              width={canvasWidth(sideRail)}
              height={CANVAS_H}
              className="maker-canvas"
              aria-label="Your iceberg meme preview"
            />

            {/* Drop zones sit exactly over the canvas bands — one per tier. */}
            <div
              className={`maker-zones ${
                picked || touchDrag.dragging || nativeDragging ? 'is-placing' : ''
              }`}
            >
              {tiers.map((tier, index) => {
                const bandKey = `${index}:band`
                const railKey = `${index}:rail`
                const bandFull = tier.items.length >= MAX_PER_TIER

                return (
                  <div className="maker-zone-row" key={index}>
                    <button
                      type="button"
                      data-drop-key={bandKey}
                      style={{ flexGrow: CANVAS_MAIN_W }}
                      className={`maker-zone ${
                        dropTarget === bandKey || touchDrag.target === bandKey
                          ? 'is-over'
                          : ''
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDropTarget(bandKey)
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={handleZoneDrop(index, 'band')}
                      onClick={() => picked && placeInTier(index, picked, 'band')}
                      disabled={bandFull}
                      aria-label={`Place image on tier ${index + 1}`}
                    >
                      {picked && !bandFull && (
                        <span className="maker-zone-hint">On the tier</span>
                      )}
                    </button>

                    {sideRail && (
                      <button
                        type="button"
                        data-drop-key={railKey}
                        style={{ flexGrow: RAIL_W }}
                        className={`maker-zone maker-zone--rail ${
                          dropTarget === railKey || touchDrag.target === railKey
                            ? 'is-over'
                            : ''
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDropTarget(railKey)
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={handleZoneDrop(index, 'rail')}
                        onClick={() => picked && placeInTier(index, picked, 'rail')}
                        aria-label={`Place image in side column for tier ${index + 1}`}
                      >
                        {picked && (
                          <span className="maker-zone-hint">
                            {tier.rail ? 'Replace' : 'Column'}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="maker-controls">
            <label
              className="maker-drop"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                acceptFiles(event.dataTransfer.files)
              }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="maker-file"
                onChange={(event) => acceptFiles(event.target.files)}
              />
              <span className="maker-drop-main">Tap to add images</span>
              <span className="maker-drop-sub">or drag them in from your desktop</span>
            </label>

            {error && <p className="maker-error">{error}</p>}

            <section className="maker-gallery">
              <div className="maker-gallery-head">
                <h2 className="maker-subhead">
                  Gallery
                  {uploads.length > 0 && <span> · {uploads.length}</span>}
                </h2>

                {uploads.length > 0 && (
                  <button
                    type="button"
                    className="maker-clear-tier"
                    onClick={clearGallery}
                  >
                    Clear gallery
                  </button>
                )}
              </div>

              {uploads.length === 0 ? (
                <p className="maker-empty">
                  Uploaded images land here. Press and hold one, then slide it
                  onto a tier — or tap it and then tap a tier.
                </p>
              ) : (
                <ul className="maker-thumbs">
                  {uploads.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`maker-thumb ${picked === item.id ? 'is-picked' : ''} ${
                          touchDrag.dragging?.id === item.id ? 'is-dragging' : ''
                        }`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DRAG_TYPE, item.id)
                          event.dataTransfer.effectAllowed = 'copy'
                          setNativeDragging(true)
                        }}
                        onDragEnd={() => {
                          setNativeDragging(false)
                          setDropTarget(null)
                        }}
                        onPointerDown={touchDrag.start(item.id)}
                        onClick={() => {
                          // Swallow the click that trails a long-press drag.
                          if (touchDrag.consumeClickSuppression()) return
                          setPicked((current) =>
                            current === item.id ? null : item.id,
                          )
                        }}
                        aria-pressed={picked === item.id}
                        aria-label={`Pick up ${item.name}`}
                      >
                        <img src={item.url} alt="" draggable={false} />
                      </button>
                      <button
                        type="button"
                        className="maker-thumb-remove"
                        onClick={() => deleteUpload(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <fieldset className="maker-tiers">
              <legend>Tiers — top is the surface</legend>
              {tiers.map((tier, index) => (
                <div className="maker-tier" key={index}>
                  <div className="maker-tier-row">
                    <input
                      type="text"
                      value={tier.label}
                      placeholder={`Tier ${index + 1}`}
                      onChange={(event) => updateLabel(index, event.target.value)}
                      aria-label={`Tier ${index + 1} label`}
                    />
                    <button
                      type="button"
                      className="maker-remove"
                      onClick={() => removeTier(index)}
                      disabled={tiers.length <= 1}
                      aria-label={`Remove tier ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>

                  {(tier.items.length > 0 || tier.rail) && (
                    <div className="maker-tier-placed">
                      <ul className="maker-tier-items">
                        {tier.items.map((id, position) => {
                          const item = uploads.find((upload) => upload.id === id)
                          if (!item) return null
                          return (
                            <li key={`${id}-${position}`}>
                              <img src={item.url} alt="" />
                              <button
                                type="button"
                                onClick={() => removeFromTier(index, position)}
                                aria-label={`Remove image from tier ${index + 1}`}
                              >
                                ×
                              </button>
                            </li>
                          )
                        })}

                        {tier.rail &&
                          (() => {
                            const item = uploads.find((u) => u.id === tier.rail)
                            if (!item) return null
                            return (
                              <li className="is-rail" key={`rail-${tier.rail}`}>
                                <img src={item.url} alt="" />
                                <span className="maker-rail-tag">col</span>
                                <button
                                  type="button"
                                  onClick={() => removeFromRail(index)}
                                  aria-label={`Remove side column image from tier ${index + 1}`}
                                >
                                  ×
                                </button>
                              </li>
                            )
                          })()}
                      </ul>

                      <button
                        type="button"
                        className="maker-clear-tier"
                        onClick={() => clearTier(index)}
                        aria-label={`Clear all images from tier ${index + 1}`}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn--sm"
                onClick={addTier}
                disabled={tiers.length >= MAX_TIERS}
              >
                Add tier
              </button>
            </fieldset>

            <div className="maker-toggles">
              <label className="maker-toggle">
                <input
                  type="checkbox"
                  autoComplete="off"
                  checked={sideRail}
                  onChange={(event) => setSideRail(event.target.checked)}
                />
                Images in a side column
              </label>

              <label className="maker-toggle">
                <input
                  type="checkbox"
                  autoComplete="off"
                  checked={showBranding}
                  onChange={(event) => setShowBranding(event.target.checked)}
                />
                Show ICEBERG branding
              </label>
            </div>

            <div className="maker-actions">
              <button type="button" className="btn btn--sm btn--primary" onClick={download}>
                Download PNG
              </button>
              <button type="button" className="btn btn--sm btn--meme" onClick={shareToX}>
                Share on X
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={clearAllImages}
                disabled={!tiers.some((tier) => tier.items.length || tier.rail)}
              >
                Clear images
              </button>
            </div>

            <p className="maker-hint">
              X can’t attach the image for you — download it first, then add it to
              your post. Uploads live in this tab only and clear on refresh.
            </p>
          </div>
        </div>
      </div>

      {/* Follows the finger during a long-press drag. */}
      {draggingUpload && (
        <div
          className="drag-ghost"
          style={{ left: touchDrag.dragging.x, top: touchDrag.dragging.y }}
          aria-hidden="true"
        >
          <img src={draggingUpload.url} alt="" />
        </div>
      )}

      <Footer />
    </main>
  )
}
