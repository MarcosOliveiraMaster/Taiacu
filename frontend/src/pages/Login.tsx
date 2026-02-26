import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store'
import Logo from '../components/Logo'

export default function Login() {
  const navigate = useNavigate()
  const setUsuario = useStore((s) => s.setUsuario)

  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const endpoint = modo === 'login' ? '/auth/entrar' : '/auth/cadastrar'
      const payload = modo === 'login' ? { email, senha } : { nome, email, senha }
      const res = await api.post(endpoint, payload)
      setUsuario(res.data.usuario)
      navigate('/lobby')
    } catch (err) {
      const axiosErr = err as { response?: { data?: { erro?: string } } }
      setErro(axiosErr.response?.data?.erro ?? 'Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5 py-10">

      {/* Logo com imagem */}
      <div className="mb-10">
        <Logo size="lg" />
        <p className="text-gray-400 mt-3 text-base text-center">Adivinhe a música mais rápido!</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-6 shadow-2xl border border-purple-900/60">

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-800 rounded-2xl p-1 gap-1">
          <button
            onClick={() => { setModo('login'); setErro('') }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              modo === 'login' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setModo('registro'); setErro('') }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              modo === 'registro' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {modo === 'registro' && (
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Seu nome</label>
              <input
                type="text" placeholder="Como você quer ser chamado?"
                value={nome} onChange={(e) => setNome(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-4 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
            </div>
          )}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-4 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              required autoComplete="email"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Senha</label>
            <input
              type="password" placeholder="••••••••"
              value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-4 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              required autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {erro && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            type="submit" disabled={carregando}
            className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-lg transition-all mt-2 shadow-lg shadow-purple-900/40"
          >
            {carregando ? '⏳ Aguarde...' : modo === 'login' ? '🎮 Entrar' : '🚀 Cadastrar'}
          </button>
        </form>
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center">Descubra quem escolheu cada música! 🎶</p>
    </div>
  )
}