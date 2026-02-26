import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import api from '../api'

type Placar = {
  nome: string
  pontuacao: number
}
export default function Jogo() {
  const navigate = useNavigate()
  const { usuario, sala, ws, rodadaAtual, setRodadaAtual } = useStore()

  const [palpite, setPalpite] = useState('')
  const [feedback, setFeedback] = useState<'certo' | 'errado' | null>(null)
  const [placar, setPlacar] = useState<Placar[]>([])
  const [fimDeJogo, setFimDeJogo] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(30)
  const [carregando, setCarregando] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!usuario || !sala || !ws) {
      navigate('/')
      return
    }

    // copia local do ref para uso no cleanup
    const audio = audioRef.current

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.tipo === 'rodada_iniciada') {
        setRodadaAtual(msg.numero)
        setPalpite('')
        setFeedback(null)
        setTempoRestante(30)
        iniciarTimer()

        if (audioRef.current) {
          audioRef.current.src = msg.musica.preview_url
          audioRef.current.play()
        }
      }

      if (msg.tipo === 'resultado_palpite') {
        setFeedback(msg.correto ? 'certo' : 'errado')
      }

      if (msg.tipo === 'placar') {
        setPlacar(msg.placar)
      }

      if (msg.tipo === 'fim_de_jogo') {
        setPlacar(msg.placar)
        setFimDeJogo(true)
        audioRef.current?.pause()
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      audio?.pause()
    }
  }, [navigate, sala, usuario, ws, setRodadaAtual])

  function iniciarTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTempoRestante(30)

    timerRef.current = setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  async function handlePalpite(e: React.FormEvent) {
    e.preventDefault()
    if (!palpite.trim() || carregando) return

    setCarregando(true)
    try {
      await api.post('/palpites', {
        sala_codigo: sala?.codigo,
        usuario_id: usuario?.id,
        rodada: rodadaAtual,
        palpite: palpite.trim(),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  // Tela de fim de jogo
  if (fimDeJogo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-5xl font-black text-purple-400 mb-2">🏆 FIM DE JOGO!</h1>
          <p className="text-gray-400 mb-8">Resultado final</p>

          <div className="bg-gray-900 rounded-2xl p-6 border border-purple-900 mb-6">
            {placar.map((p, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
                  i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </span>
                  <span className="text-white font-bold">{p.nome}</span>
                </div>
                <span className={`font-black text-lg ${i === 0 ? 'text-yellow-400' : 'text-purple-400'}`}>
                  {p.pontuacao} pts
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/lobby')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl text-xl transition-all"
          >
            🎮 Jogar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Tela do jogo
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-purple-400">🎵 TAIAÇU</h1>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Rodada</span>
            <span className="text-white font-black text-xl">{rodadaAtual}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-purple-900">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Tempo restante</span>
            <span className={`font-black text-xl ${tempoRestante <= 10 ? 'text-red-400' : 'text-green-400'}`}>
              {tempoRestante}s
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${
                tempoRestante <= 10 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${(tempoRestante / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Player de áudio */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4 border border-purple-900 text-center">
          <div className="text-6xl mb-4 animate-pulse">🎵</div>
          <p className="text-gray-400 text-sm">Ouça e adivinhe a música!</p>
          <audio ref={audioRef} className="w-full mt-4" controls />
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-2xl p-4 mb-4 text-center font-black text-xl ${
            feedback === 'certo'
              ? 'bg-green-500/20 border border-green-500 text-green-400'
              : 'bg-red-500/20 border border-red-500 text-red-400'
          }`}>
            {feedback === 'certo' ? '✅ ACERTOU! +100 pontos!' : '❌ Errou! Tente novamente!'}
          </div>
        )}

        {/* Input de palpite */}
        <form onSubmit={handlePalpite} className="flex gap-2">
          <input
            type="text"
            placeholder="Digite o nome da música ou artista..."
            value={palpite}
            onChange={(e) => setPalpite(e.target.value)}
            disabled={feedback === 'certo' || tempoRestante === 0}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={carregando || feedback === 'certo' || tempoRestante === 0}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-6 rounded-xl transition-all"
          >
            {carregando ? '⏳' : '🎯'}
          </button>
        </form>

        {/* Placar parcial */}
        {placar.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 mt-4 border border-purple-900">
            <h3 className="text-white font-bold mb-3">📊 Placar</h3>
            {placar.map((p, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <span className="text-gray-300">{p.nome}</span>
                <span className="text-purple-400 font-bold">{p.pontuacao} pts</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}