import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Lobby from './pages/Lobby'
import Sala from './pages/Sala'
import Jogo from './pages/Jogo'
import { useStore } from './store'

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const usuario = useStore((s) => s.usuario)
  return usuario ? <>{children}</> : <Navigate to="/" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/lobby" element={
          <RotaProtegida><Lobby /></RotaProtegida>
        } />
        <Route path="/sala" element={
          <RotaProtegida><Sala /></RotaProtegida>
        } />
        <Route path="/jogo" element={
          <RotaProtegida><Jogo /></RotaProtegida>
        } />
      </Routes>
    </BrowserRouter>
  )
}