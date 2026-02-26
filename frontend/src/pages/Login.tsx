import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store'

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
      const endpoint = modo === 'login' ? '/auth/entrar' : '/auth/cadastrar' // âœ… CORRIGIDO
      const payload = modo === 'login'
        ? { email, senha }
        : { nome, email, senha }

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-purple-400 tracking-widest">
            ðŸŽµ TAIÃ‡U
          </h1>
          <p className="text-gray-400 mt-2">Adivinhe a mÃºsica mais rÃ¡pido!</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-purple-900">

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setModo('login')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                modo === 'login'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setModo('registro')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                modo === 'registro'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* FormulÃ¡rio */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === 'registro' && (
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
            )}
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
            />
            <input
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
              {carregando ? 'â³ Aguarde...' : modo === 'login' ? 'ðŸŽ® Entrar' : 'ðŸš€ Cadastrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
