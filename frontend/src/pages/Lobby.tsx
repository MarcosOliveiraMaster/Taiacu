import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store'

export default function Lobby() {
  const navigate = useNavigate()
  const { usuario, setSala } = useStore()

  const [modo, setModo] = useState<'criar' | 'entrar'>('criar')
  const [nomeSala, setNomeSala] = useState('')
  const [modoJogo, setModoJogo] = useState<'sussegado' | 'arretado'>('sussegado')
  const [maxJogadores, setMaxJogadores] = useState(4)
  const [musicasPorJogador, setMusicasPorJogador] = useState(2)
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
        modo_jogo: modoJogo,
        max_jogadores: maxJogadores,
        musicas_por_jogador: musicasPorJogador,
      })
      setSala(res.data.sala)
      navigate('/sala')
    } catch (err) {
      const e = err as { response?: { data?: { erro?: string } } }
      setErro(e.response?.data?.erro ?? 'Erro ao criar sala')
    } finally {
      setCarregando(false)
    }
  }

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const res = await api.post(`/salas/${codigo.toUpperCase()}/entrar`, {
        usuario_id: usuario?.id,
      })
      setSala(res.data.sala)
      navigate('/sala')
    } catch (err) {
      const e = err as { response?: { data?: { erro?: string } } }
      setErro(e.response?.data?.erro ?? 'Erro ao entrar na sala')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col px-5 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🎵</div>
        <h1 className="text-4xl font-black text-purple-400 tracking-widest">TAIAÇU</h1>
        <p className="text-gray-400 mt-2 text-base">
          Olá, <span className="text-purple-300 font-bold">{usuario?.nome}</span>! 👋
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-2xl p-1 gap-1 mb-6">
        <button
          onClick={() => { setModo('criar'); setErro('') }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            modo === 'criar'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏠 Criar Sala
        </button>
        <button
          onClick={() => { setModo('entrar'); setErro('') }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            modo === 'entrar'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎮 Entrar
        </button>
      </div>

      {/* Criar Sala */}
      {modo === 'criar' && (
        <form onSubmit={handleCriar} className="flex flex-col gap-5">

          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Nome da sala
            </label>
            <input
              type="text"
              placeholder="Ex: Pagode do Zé"
              value={nomeSala}
              onChange={(e) => setNomeSala(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              required
            />
          </div>

          {/* Modo de jogo */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 block">
              Modo de Jogo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoJogo('sussegado')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  modoJogo === 'sussegado'
                    ? 'border-purple-500 bg-purple-900/40 shadow-lg shadow-purple-900/30'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                <p className="text-2xl mb-1">😌</p>
                <p className="text-white font-black text-sm">Sussegado</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  Acertou: +1pt<br/>
                  Não descoberto: +3pts
                </p>
              </button>
              <button
                type="button"
                onClick={() => setModoJogo('arretado')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${
                  modoJogo === 'arretado'
                    ? 'border-orange-500 bg-orange-900/20 shadow-lg shadow-orange-900/20'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                <p className="text-2xl mb-1">🔥</p>
                <p className="text-white font-black text-sm">Arretado</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  Acertou: 30/tempo<br/>
                  Não descoberto: +40pts
                </p>
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex flex-col gap-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-gray-400 text-sm font-semibold">Máx. jogadores</label>
                <span className="text-white font-black text-lg bg-purple-900/50 px-3 py-0.5 rounded-xl">{maxJogadores}</span>
              </div>
              <input
                type="range" min={2} max={10} value={maxJogadores}
                onChange={(e) => setMaxJogadores(Number(e.target.value))}
                className="w-full accent-purple-500 h-2"
              />
              <div className="flex justify-between text-gray-600 text-xs mt-2">
                {[2,4,6,8,10].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>

            <div className="border-t border-gray-800 pt-5">
              <div className="flex justify-between items-center mb-3">
                <label className="text-gray-400 text-sm font-semibold">Músicas por jogador</label>
                <span className="text-white font-black text-lg bg-purple-900/50 px-3 py-0.5 rounded-xl">{musicasPorJogador}</span>
              </div>
              <input
                type="range" min={1} max={5} value={musicasPorJogador}
                onChange={(e) => setMusicasPorJogador(Number(e.target.value))}
                className="w-full accent-purple-500 h-2"
              />
              <div className="flex justify-between text-gray-600 text-xs mt-2">
                {[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-black py-5 rounded-2xl text-lg transition-all shadow-lg shadow-purple-900/40"
          >
            {carregando ? '⏳ Criando...' : '🏠 Criar Sala'}
          </button>
        </form>
      )}

      {/* Entrar na Sala */}
      {modo === 'entrar' && (
        <form onSubmit={handleEntrar} className="flex flex-col gap-5">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Código da sala
            </label>
            <input
              type="text"
              placeholder="ABC123"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-5 text-white text-3xl font-black text-center placeholder-gray-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 tracking-widest transition-all uppercase"
              maxLength={6}
              required
            />
            <p className="text-gray-600 text-xs text-center mt-2">Peça o código para quem criou a sala</p>
          </div>

          {erro && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando || codigo.length < 4}
            className="w-full bg-green-600 hover:bg-green-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-lg transition-all shadow-lg shadow-green-900/40"
          >
            {carregando ? '⏳ Entrando...' : '🎮 Entrar na Sala'}
          </button>
        </form>
      )}
    </div>
  )
}