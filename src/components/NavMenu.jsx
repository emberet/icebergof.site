import { Link } from 'react-router-dom'
import '../styles/buttons.css'
import './NavMenu.css'

export default function NavMenu() {
  return (
    <nav className="nav-menu">
      <a
        className="btn"
        href="https://knowyourmeme.com/memes/iceberg-charts"
        target="_blank"
        rel="noopener noreferrer"
      >
        Origin
      </a>
      <Link className="btn btn--meme" to="/meme-maker">
        Meme Maker
      </Link>
      <button className="btn btn--primary" type="button">
        Buy now
      </button>
    </nav>
  )
}
