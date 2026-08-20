import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import seaWaves from '../assets/sea-waves.mp3'

const SoundContext = createContext(null)

export function useSound() {
  return useContext(SoundContext)
}

/**
 * Owns the single <audio> element. Lives above the router so playback is not
 * cut short by navigation, while the button itself can sit in the footer.
 */
export default function SoundProvider({ children }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = 0.35

    const sync = () => setPlaying(!audio.paused)
    audio.addEventListener('play', sync)
    audio.addEventListener('pause', sync)
    return () => {
      audio.removeEventListener('play', sync)
      audio.removeEventListener('pause', sync)
    }
  }, [])

  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        // Autoplay policy or decode failure — keep the button showing "off".
        setPlaying(false)
      }
    } else {
      audio.pause()
    }
  }, [])

  const value = useMemo(() => ({ playing, toggle }), [playing, toggle])

  return (
    <SoundContext.Provider value={value}>
      <audio ref={audioRef} src={seaWaves} loop preload="auto" />
      {children}
    </SoundContext.Provider>
  )
}
