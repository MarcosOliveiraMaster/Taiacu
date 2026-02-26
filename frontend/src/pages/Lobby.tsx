import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store'

export default function Lobby() {
  const navigate = useNavigate()
  const { usuario, setSala } = useStore()

  const [modo, setModo] = useState<'criar' | 'entrar'>('criar')
  const [nomeSala, setNomeSala] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const res = await api.post('/salas', {
        nome: nomeSala,
        criador_id: usuario?.id,
      })
      setSala(res.data.sala)
      navigate('/sala')
    } catch (err) {
      const axiosErr = err as { response?: { data?: { erro?: string } } }
      setErro(axiosErr.response?.data?.erro ?? 'Erro ao criar sala')
    } finally {
      setCarregando(false)
    }
  }

    async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const res = await api.post(`/salas/${codigo.toUpperCase()}/entrar`, { // ✅ CORRIGIDO
        usuario_id: usuario?.id,
      })
      setSala(res.data.sala)
      navigate('/sala')
    } catch (err) {
      const axiosErr = err as { response?: { data?: { erro?: string } } }
      setErro(axiosErr.response?.data?.erro ?? 'Erro ao entrar na sala')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-purple-400 tracking-widest">
            🎵 TAIAÇU
          </h1>
          <p className="text-gray-400 mt-2">
            Olá, <span className="text-purple-400 font-bold">{usuario?.nome}</span>! 👋
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-purple-900">

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setModo('criar')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                modo === 'criar'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Criar Sala
            </button>
            <button
              onClick={() => setModo('entrar')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                modo === 'entrar'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar na Sala
            </button>
          </div>

          {/* Criar Sala */}
          {modo === 'criar' && (
            <form onSubmit={handleCriar} className="space-y-4">
              <input
                type="text"
                placeholder="Nome da sala"
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />

              {erro && (
                <p className="text-red-400 text-sm text-center">{erro}</p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
              >
                {carregando ? '⏳ Criando...' : '🏠 Criar Sala'}
              </button>
            </form>
          )}

          {/* Entrar na Sala */}
          {modo === 'entrar' && (
            <form onSubmit={handleEntrar} className="space-y-4">
              <input
                type="text"
                placeholder="Código da sala (ex: ABC123)"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase tracking-widest"
                maxLength={6}
                required
              />

              {erro && (
                <p className="text-red-400 text-sm text-center">{erro}</p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
              >
                {carregando ? '⏳ Entrando...' : '🎮 Entrar na Sala'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}