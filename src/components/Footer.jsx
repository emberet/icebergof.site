import { useSound } from './SoundProvider.jsx'
import './Footer.css'

export default function Footer() {
  const sound = useSound()

  return (
    <footer className="site-footer">
      <a
        className="social-link"
        href="https://x.com/iceberg_off"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ICEBERG on X"
      >
        <svg
          className="social-icon"
          viewBox="0 0 1200 1227"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
        </svg>
        <span className="social-handle">@iceberg_off</span>
      </a>

      {sound && (
        <button
          type="button"
          className={`sound-button ${sound.playing ? 'is-on' : ''}`}
          onClick={sound.toggle}
          aria-pressed={sound.playing}
          aria-label={sound.playing ? 'Mute sea waves' : 'Play sea waves'}
          title={sound.playing ? 'Mute sea waves' : 'Play sea waves'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
            {sound.playing ? (
              <>
                <path d="M15.5 8.5a5 5 0 0 1 0 7" className="wave" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" className="wave" />
              </>
            ) : (
              <path d="m16 9.5 5 5m0-5-5 5" className="wave" />
            )}
          </svg>
        </button>
      )}
    </footer>
  )
}
