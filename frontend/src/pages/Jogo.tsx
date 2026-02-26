import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { wsManager } from '../wsManager'

type Placar = { nome: string; pontuacao: number }
type ResultadoRodada = {
  dono_id: string
  dono_nome: string
  votos: Record<string, string>
}

export default function Jogo() {
  const navigate = useNavigate()
  const { usuario, sala, rodadaAtual, totalRodadas, setRodadaAtual, setTotalRodadas, jogadores, setJogadores } = useStore()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [tempoRestante, setTempoRestante] = useState(30)
  const [votou, setVotou] = useState<string | null>(null)
  const [fase, setFase] = useState<'aguardando' | 'jogo' | 'resultado' | 'fim'>('aguardando')
  const [resultado, setResultado] = useState<ResultadoRodada | null>(null)
  const [placarFinal, setPlacarFinal] = useState<Placar[]>([])
  const [contagemResultado, setContagemResultado] = useState(5)
  const [audioLiberado, setAudioLiberado] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [erroAudio, setErroAudio] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultadoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewPendente = useRef<string | null>(null)

  const pararTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    audio.preload = 'auto'
    audio.volume = 1.0
    audio.onplay = () => setTocando(true)
    audio.onpause = () => setTocando(false)
    audio.onended = () => setTocando(false)
    audio.onerror = () => { setErroAudio(true); setTocando(false) }
    return () => { audio.pause(); audio.src = '' }
  }, [])

  function tocarPreview(url: string) {
    const audio = audioRef.current
    setErroAudio(false)
    audio.src = url
    audio.load()
    audio.play()
      .then(() => { setAudioLiberado(true); setTocando(true) })
      .catch(() => { previewPendente.current = url })
  }

  function liberarAudio() {
    setAudioLiberado(true)
    if (previewPendente.current) {
      tocarPreview(previewPendente.current)
      previewPendente.current = null
    }
  }

  function iniciarTimer() {
    pararTimer()
    setTempoRestante(30)
    timerRef.current = setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) { pararTimer(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (!usuario || !sala) { navigate('/'); return }

    const off1 = wsManager.on('jogadores', (msg) => {
      setJogadores((msg.jogadores as { id: string; nome: string; pontuacao: number }[]) ?? [])
    })

    const off2 = wsManager.on('rodada_iniciada', (msg) => {
      const musica = msg.musica as { preview_url: string; cover_url: string }
      setRodadaAtual(msg.numero as number)
      setTotalRodadas(msg.total as number)
      setPreviewUrl(musica.preview_url)
      setVotou(null)
      setFase('jogo')
      setErroAudio(false)
      tocarPreview(musica.preview_url)
      iniciarTimer()
    })

    const off3 = wsManager.on('resultado_rodada', (msg) => {
      pararTimer()
      audioRef.current.pause()
      setTocando(false)
      setResultado(msg.resultado as ResultadoRodada)
      setFase('resultado')
      setContagemResultado(5)
      if (msg.jogadores) setJogadores(msg.jogadores as { id: string; nome: string; pontuacao: number }[])

      if (resultadoTimerRef.current) clearInterval(resultadoTimerRef.current)
      resultadoTimerRef.current = setInterval(() => {
        setContagemResultado((t) => {
          if (t <= 1) { clearInterval(resultadoTimerRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    })

    const off4 = wsManager.on('fim_de_jogo', (msg) => {
      pararTimer()
      audioRef.current.pause()
      setPlacarFinal(msg.placar as Placar[])
      setFase('fim')
    })

    return () => {
      off1(); off2(); off3(); off4()
      pararTimer()
      if (resultadoTimerRef.current) clearInterval(resultadoTimerRef.current)
    }
  }, [navigate, sala, usuario, setRodadaAtual, setTotalRodadas, setJogadores, pararTimer])

  function votar(jogadorId: string) {
    if (votou || fase !== 'jogo') return
    setVotou(jogadorId)
    wsManager.send({
      tipo: 'voto',
      votante_id: usuario?.id,
      votado_id: jogadorId,
      tempo_ms: (30 - tempoRestante) * 1000,
    })
  }

  // FIM DE JOGO
  if (fase === 'fim') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-5xl font-black text-purple-400 mb-2">🏆 FIM DE JOGO!</h1>
          <p className="text-gray-400 mb-8">Resultado final</p>
          <div className="bg-gray-900 rounded-2xl p-6 border border-purple-900 mb-6">
            {placarFinal.map((p, i) => (
              <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
                i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-gray-800'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</span>
                  <span className="text-white font-bold">{p.nome}</span>
                </div>
                <span className={`font-black text-lg ${i === 0 ? 'text-yellow-400' : 'text-purple-400'}`}>
                  {p.pontuacao} pts
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/lobby')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl text-xl">
            🎮 Jogar Novamente
          </button>
        </div>
      </div>
    )
  }

  // RESULTADO DA RODADA
  if (fase === 'resultado' && resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm">Rodada {rodadaAtual} de {totalRodadas}</p>
            <h2 className="text-2xl font-black text-white mt-1">
              🎵 Era de <span className="text-purple-400">{resultado.dono_nome}</span>!
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Próxima rodada em <span className="text-white font-bold">{contagemResultado}s</span>
            </p>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 max-w-xs mx-auto">
              <div className="h-1.5 rounded-full bg-purple-500 transition-all duration-1000"
                style={{ width: `${(contagemResultado / 5) * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {jogadores.map((j) => {
              const eoDono = j.id === resultado.dono_id
              const meuVoto = resultado.votos[usuario?.id ?? ''] === j.id
              let bgClass = 'bg-gray-800 border-gray-700'
              if (eoDono && meuVoto) bgClass = 'bg-green-600 border-green-400'
              else if (eoDono) bgClass = 'bg-green-900/60 border-green-500'
              else if (meuVoto) bgClass = 'bg-red-900/60 border-red-500'

              return (
                <div key={j.id} className={`rounded-2xl border-2 p-4 text-center ${bgClass}`}>
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-black mx-auto mb-2">
                    {j.nome.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-white font-bold text-sm">{j.nome}</p>
                  {eoDono && <p className="text-xs text-green-300 mt-1">🎵 escolheu</p>}
                  {meuVoto && eoDono && <p className="text-xs text-green-200 mt-0.5">✅ você acertou!</p>}
                  {meuVoto && !eoDono && <p className="text-xs text-red-300 mt-1">❌ seu voto</p>}
                  <div className="mt-2 flex justify-center flex-wrap gap-1">
                    {Object.entries(resultado.votos).filter(([, vid]) => vid === j.id).map(([vId]) => {
                      const v = jogadores.find((x) => x.id === vId)
                      return <span key={vId} className="text-xs bg-black/30 rounded-full px-2 py-0.5 text-gray-300">{v?.nome ?? '?'}</span>
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gray-900 rounded-2xl p-4 border border-purple-900">
            <h3 className="text-white font-bold mb-3">📊 Placar</h3>
            {[...jogadores].sort((a, b) => b.pontuacao - a.pontuacao).map((j, i) => (
              <div key={j.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-5">{i + 1}º</span>
                  <span className={`font-medium ${j.id === usuario?.id ? 'text-purple-400' : 'text-gray-300'}`}>{j.nome}</span>
                </div>
                <span className="text-purple-400 font-bold">{j.pontuacao} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // TELA DE JOGO
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Modal autoplay */}
        {!audioLiberado && previewUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 rounded-2xl p-8 text-center border border-purple-500 max-w-sm w-full">
              <div className="text-5xl mb-4">🎵</div>
              <h2 className="text-white font-black text-xl mb-2">Música pronta!</h2>
              <p className="text-gray-400 text-sm mb-6">Toque para começar a ouvir e adivinhar!</p>
              <button onClick={liberarAudio}
                className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black py-4 rounded-2xl text-xl transition-all">
                ▶️ Tocar Música
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-black text-purple-400">🎵 TAIAÇU</h1>
          <span className="text-gray-400 text-sm">
            Rodada <span className="text-white font-bold">{rodadaAtual}</span> de <span className="text-white font-bold">{totalRodadas}</span>
          </span>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-purple-900">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              ⏱ Tempo restante
              {tocando && (
                <span className="flex gap-0.5 items-end h-4">
                  {[60, 100, 40, 80, 55].map((h, i) => (
                    <span key={i} className="w-1 bg-purple-400 rounded-full animate-bounce"
                      style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                  ))}
                </span>
              )}
            </span>
            <span className={`font-black text-2xl ${tempoRestante <= 10 ? 'text-red-400' : 'text-green-400'}`}>
              {tempoRestante}s
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-1000 ${tempoRestante <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${(tempoRestante / 30) * 100}%` }} />
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-purple-900 text-center">
          {fase === 'aguardando' ? (
            <><div className="text-4xl mb-3">⏳</div><p className="text-gray-400">Aguardando a próxima música...</p></>
          ) : erroAudio ? (
            <><div className="text-4xl mb-3">⚠️</div>
              <p className="text-red-400 text-sm mb-3">Erro ao carregar o áudio</p>
              <button onClick={() => previewUrl && tocarPreview(previewUrl)}
                className="bg-purple-600 text-white font-bold px-6 py-2 rounded-xl text-sm">🔄 Tentar novamente</button></>
          ) : tocando ? (
            <><div className="flex justify-center gap-1 mb-3 items-end h-10">
              {[40, 70, 55, 90, 45, 75, 60].map((h, i) => (
                <div key={i} className="w-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ height: `${h}%`, animationDelay: `${i * 80}ms`, animationDuration: '600ms' }} />
              ))}
            </div>
              <p className="text-purple-400 font-bold">🎵 Tocando...</p>
              <p className="text-gray-400 text-sm mt-1">Quem escolheu essa música?</p></>
          ) : (
            <><div className="text-4xl mb-3">🎵</div><p className="text-gray-400 text-sm">Quem escolheu essa música?</p></>
          )}
          {votou && <p className="text-green-400 text-sm mt-3 font-bold">✅ Voto registrado! Aguardando os outros...</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {jogadores.filter((j) => j.id !== usuario?.id).map((j) => (
            <button key={j.id} onClick={() => votar(j.id)}
              disabled={!!votou || tempoRestante === 0 || fase !== 'jogo'}
              className={`rounded-2xl border-2 p-5 text-center transition-all
                ${votou === j.id
                  ? 'bg-purple-600 border-purple-400 scale-105 shadow-lg shadow-purple-900/50'
                  : votou || tempoRestante === 0
                  ? 'bg-gray-800 border-gray-700 opacity-40 cursor-not-allowed'
                  : 'bg-gray-800 border-gray-700 hover:border-purple-500 hover:bg-purple-900/20 active:scale-95 cursor-pointer'
                }`}>
              <div className="w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center text-2xl font-black mx-auto mb-3 text-white">
                {j.nome.charAt(0).toUpperCase()}
              </div>
              <p className="text-white font-bold text-lg">{j.nome}</p>
              {votou === j.id && <p className="text-purple-200 text-xs mt-1">Seu voto ✓</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}