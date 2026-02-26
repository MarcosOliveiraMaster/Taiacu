import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { wsManager } from '../wsManager'

type ResultadoDeezer = {
  id: number
  title: string
  artist: { name: string }
  album: { cover_medium: string }
  preview: string
}

type MusicaSelecionada = {
  deezer_id: string
  titulo: string
  artista: string
  preview_url: string
  cover_url: string
  dono_id: string
  dono_nome: string
}

type ProgressoJogador = {
  id: string
  nome: string
  musicas_count: number
  confirmou: boolean
  limite: number
}

export default function Selecao() {
  const navigate = useNavigate()
  const { usuario, sala, jogadores, setFase, setMusicasSelecionadas } = useStore()

  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ResultadoDeezer[]>([])
  const [selecionadas, setSelecionadas] = useState<MusicaSelecionada[]>([])
  const [buscando, setBuscando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [confirmados, setConfirmados] = useState<string[]>([])
  const [progresso, setProgresso] = useState<ProgressoJogador[]>([])
  const [totalMusicas, setTotalMusicas] = useState(0)
  const [previewTocando, setPreviewTocando] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const limite = sala?.musicas_por_jogador ?? 2
  const totalJogadores = progresso.length > 0 ? progresso.length : jogadores.length
  const totalEsperado = totalJogadores * limite
  const progressoPct = totalEsperado > 0 ? Math.min((totalMusicas / totalEsperado) * 100, 100) : 0

  useEffect(() => {
    if (!usuario || !sala) { navigate('/'); return }

    const off1 = wsManager.on('selecao_progresso', (msg) => {
      setProgresso((msg.jogadores_progresso as ProgressoJogador[]) ?? [])
      setTotalMusicas((msg.total_musicas as number) ?? 0)
      setConfirmados((msg.confirmados as string[]) ?? [])
    })

    const off2 = wsManager.on('jogo_iniciando', () => {
      audioRef.current?.pause()
      setFase('jogo')
      navigate('/jogo')
    })

    return () => { off1(); off2() }
  }, [navigate, sala, usuario, setFase])

  // Busca Deezer com debounce
  useEffect(() => {
    if (busca.trim().length < 2) { setResultados([]); return }
    if (buscaTimer.current) clearTimeout(buscaTimer.current)
    buscaTimer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(
          `https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(busca)}&limit=12`
        )
        const data = await res.json()
        setResultados(data.data ?? [])
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 500)
  }, [busca])

  function togglePreview(url: string) {
    if (previewTocando === url) {
      audioRef.current?.pause()
      setPreviewTocando(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = url
        audioRef.current.play().catch(() => {})
      }
      setPreviewTocando(url)
    }
  }

  function adicionarMusica(m: ResultadoDeezer) {
    if (confirmado || selecionadas.length >= limite) return
    if (selecionadas.find((s) => s.deezer_id === String(m.id))) return

    setSelecionadas((prev) => [...prev, {
      deezer_id: String(m.id),
      titulo: m.title,
      artista: m.artist.name,
      preview_url: m.preview,
      cover_url: m.album.cover_medium,
      dono_id: usuario!.id,
      dono_nome: usuario!.nome,
    }])

    wsManager.send({ tipo: 'musica_adicionada', usuario_id: usuario?.id })
  }

  function removerMusica(id: string) {
    if (confirmado) return
    setSelecionadas((prev) => prev.filter((m) => m.deezer_id !== id))
    wsManager.send({ tipo: 'musica_removida', usuario_id: usuario?.id })
  }

  function confirmarSelecao() {
    if (selecionadas.length < limite || confirmado) return
    setMusicasSelecionadas(selecionadas)
    setConfirmado(true)
    audioRef.current?.pause()
    wsManager.send({
      tipo: 'musicas_selecionadas',
      usuario_id: usuario?.id,
      musicas: selecionadas,
    })
  }

  const jogadoresExibidos = progresso.length > 0
    ? progresso
    : jogadores.map((j) => ({ id: j.id, nome: j.nome, musicas_count: 0, confirmou: false, limite }))

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      <audio ref={audioRef} onEnded={() => setPreviewTocando(null)} />

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-purple-400">🎵 Escolha suas músicas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Selecione <span className="text-white font-bold">{limite}</span> músicas — os outros tentarão adivinhar que foram suas!
        </p>
      </div>

      {/* Barra de progresso global */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-purple-900">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">🎵 Progresso da sala</span>
          <span className="text-white text-sm font-bold">{totalMusicas} / {totalEsperado}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
          <div
            className="h-3 rounded-full bg-purple-500 transition-all duration-500"
            style={{ width: `${progressoPct}%` }}
          />
        </div>
        <div className="space-y-2">
          {jogadoresExibidos.map((j) => (
            <div key={j.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                {j.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-medium ${j.id === usuario?.id ? 'text-purple-400' : 'text-gray-300'}`}>
                    {j.nome}{j.id === usuario?.id ? ' (você)' : ''}
                  </span>
                  <span className={`text-xs font-bold ${j.confirmou ? 'text-green-400' : 'text-gray-400'}`}>
                    {j.confirmou ? '✅' : `${j.musicas_count}/${j.limite}`}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${j.confirmou ? 'bg-green-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min((j.musicas_count / j.limite) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progresso pessoal */}
      <div className="bg-gray-900 rounded-2xl p-3 mb-4 border border-purple-900 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Suas músicas</span>
        <div className="flex gap-2">
          {Array.from({ length: limite }).map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded-full border-2 transition-all ${
              i < selecionadas.length ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
            }`} />
          ))}
        </div>
      </div>

      {/* Músicas selecionadas */}
      {selecionadas.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-green-900">
          <h3 className="text-green-400 font-bold mb-3 text-sm">✅ Suas músicas</h3>
          <div className="space-y-2">
            {selecionadas.map((m) => (
              <div key={m.deezer_id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2">
                <img src={m.cover_url} alt={m.titulo} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{m.titulo}</p>
                  <p className="text-gray-400 text-xs truncate">{m.artista}</p>
                </div>
                <button onClick={() => togglePreview(m.preview_url)}
                  className={`text-lg ${previewTocando === m.preview_url ? 'text-purple-400' : 'text-gray-500'}`}>
                  {previewTocando === m.preview_url ? '⏸' : '▶️'}
                </button>
                {!confirmado && (
                  <button onClick={() => removerMusica(m.deezer_id)} className="text-red-400 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Busca */}
      {!confirmado && (
        <>
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="🔍 Buscar música ou artista no Deezer..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              disabled={selecionadas.length >= limite}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-40"
            />
            {buscando && <span className="absolute right-4 top-3.5 text-gray-400 text-sm">⏳</span>}
          </div>

          {resultados.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-purple-900 overflow-hidden mb-4">
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
                {resultados.map((m) => {
                  const jaSelecionada = selecionadas.find((s) => s.deezer_id === String(m.id))
                  const desabilitada = !jaSelecionada && selecionadas.length >= limite
                  return (
                    <div key={m.id} className={`flex items-center gap-3 px-4 py-3 transition-all
                      ${jaSelecionada ? 'bg-purple-900/30' : ''}
                      ${desabilitada ? 'opacity-40' : 'hover:bg-gray-800 cursor-pointer'}`}>
                      <img src={m.album.cover_medium} alt={m.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0" onClick={() => !desabilitada && adicionarMusica(m)}>
                        <p className="text-white font-medium text-sm truncate">{m.title}</p>
                        <p className="text-gray-400 text-xs truncate">{m.artist.name}</p>
                      </div>
                      <button onClick={() => togglePreview(m.preview)}
                        className={`text-lg flex-shrink-0 ${previewTocando === m.preview ? 'text-purple-400' : 'text-gray-500'}`}>
                        {previewTocando === m.preview ? '⏸' : '▶️'}
                      </button>
                      {!desabilitada && !jaSelecionada && (
                        <button onClick={() => adicionarMusica(m)}
                          className="text-purple-400 font-bold text-lg flex-shrink-0">+</button>
                      )}
                      {jaSelecionada && <span className="text-purple-400 flex-shrink-0">✓</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmar / aguardando */}
      {!confirmado ? (
        <button onClick={confirmarSelecao} disabled={selecionadas.length < limite}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-xl transition-all mt-auto">
          ✅ Confirmar Seleção ({selecionadas.length}/{limite})
        </button>
      ) : (
        <div className="text-center bg-gray-900 rounded-2xl p-6 border border-green-900 mt-auto">
          <p className="text-green-400 font-black text-xl mb-2">✅ Confirmado!</p>
          <p className="text-gray-400 text-sm mb-3">
            Aguardando jogadores...
            <span className="text-white font-bold ml-1">({confirmados.length}/{totalJogadores})</span>
          </p>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${(confirmados.length / Math.max(totalJogadores, 1)) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}