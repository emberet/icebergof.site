import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import NavMenu from '../components/NavMenu.jsx'
import './Home.css'

export default function Home() {
  return (
    <main className="home">
      <Header />
      <NavMenu />
      <Footer />
    </main>
  )
}
