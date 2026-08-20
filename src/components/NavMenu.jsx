import { Link } from 'react-router-dom'
import { BUY_URL, EXTERNAL_LINK, ORIGIN_URL } from '../lib/links.js'
import '../styles/buttons.css'
import './NavMenu.css'

export default function NavMenu() {
  return (
    <nav className="nav-menu">
      <a className="btn" href={ORIGIN_URL} {...EXTERNAL_LINK}>
        Origin
      </a>
      <Link className="btn btn--meme" to="/meme-maker">
        Meme Maker
      </Link>
      <a className="btn btn--primary" href={BUY_URL} {...EXTERNAL_LINK}>
        Buy now
      </a>
    </nav>
  )
}
