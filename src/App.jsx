import { Route, Routes } from 'react-router-dom'
import SoundProvider from './components/SoundProvider.jsx'
import Home from './pages/Home.jsx'
import MemeMaker from './pages/MemeMaker.jsx'

export default function App() {
  return (
    // Provider sits above Routes so the audio element survives navigation.
    <SoundProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meme-maker" element={<MemeMaker />} />
      </Routes>
    </SoundProvider>
  )
}
