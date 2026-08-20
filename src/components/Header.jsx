import { Link } from 'react-router-dom'
import './Header.css'

export default function Header() {
  return (
    <header className="site-header">
      <Link className="wordmark" to="/">
        ICEBERG
      </Link>
    </header>
  )
}
