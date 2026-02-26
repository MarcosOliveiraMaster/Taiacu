import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { wsManager } from '../wsManager'

export default function Sala() {
  const navigate = useNavigate()
  const { usuario, sala, jogadores, setJogadores, setWs, setFase } = useStore()
  const [wsStatus, setWsStatus] = useState<'conectando' | 'conectado' | 'erro'>('conectando')

  const souCriador = usuario?.id === sala?.criador_id

  useEffect(() => {
    if (!usuario || !sala) { navigate('/'); return }

    const url =
      `wss://taiacu-backend.marcoslucas-dev.workers.dev/ws/${sala.codigo}` +
      `?usuario_id=${encodeURIComponent(String(usuario.id))}` +
      `&nome=${encodeURIComponent(usuario.nome)}` +
      `&modo_jogo=${sala.modo_jogo ?? 'sussegado'}` +
      `&musicas_por_jogador=${sala.musicas_por_jogador ?? 2}`

    const socket = wsManager.connect(url)
    setWs(socket)

    const off1 = wsManager.on('__connected', () => setWsStatus('conectado'))
    const off2 = wsManager.on('__error', () => setWsStatus('erro'))
    const off3 = wsManager.on('jogadores', (msg) => {
      setJogadores((msg.jogadores as { id: string; nome: string; pontuacao: number }[]) ?? [])
    })
    const off4 = wsManager.on('fase_selecao', () => {
      setFase('selecao')
      navigate('/selecao')
    })

    if (wsManager.isConnected()) setWsStatus('conectado')

    return () => { off1(); off2(); off3(); off4() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function iniciarSelecao() {
    if (!wsManager.isConnected()) return
    wsManager.send({ tipo: 'iniciar_selecao' })
  }

  const modoLabel = sala?.modo_jogo === 'arretado' ? '🔥 Arretado' : '😌 Sussegado'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col px-5 py-8 max-w-md mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🎵</div>
        <h1 className="text-4xl font-black text-purple-400 tracking-widest">TAIAÇU</h1>
        <p className="text-gray-400 mt-1 text-sm">{sala?.nome}</p>
      </div>

      {/* Código da sala */}
      <div className="bg-gray-900 rounded-3xl p-6 mb-4 border border-purple-900/60 text-center">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
          Código da sala
        </p>
        <p className="text-5xl font-black text-purple-400 tracking-widest mb-2">{sala?.codigo}</p>
        <p className="text-gray-600 text-xs">Compartilhe com seus amigos!</p>
      </div>

      {/* Config da sala */}
      <div className="bg-gray-900 rounded-2xl px-5 py-4 mb-4 border border-gray-800">
        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Modo</p>
            <p className="text-white font-black text-sm">{modoLabel}</p>
          </div>
          <div className="w-px bg-gray-800" />
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Músicas</p>
            <p className="text-white font-black text-sm">{sala?.musicas_por_jogador ?? 2} por jogador</p>
          </div>
        </div>
      </div>

      {/* Jogadores */}
      <div className="bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-800 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-black text-base">👥 Jogadores</h2>
          <span className="bg-purple-900/60 text-purple-300 text-xs font-bold px-3 py-1 rounded-full">
            {jogadores.length} / {sala?.max_jogadores ?? '?'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {wsStatus === 'conectando' && jogadores.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3 animate-pulse">📡</div>
              <p className="text-gray-500 text-sm">Conectando à sala...</p>
            </div>
          )}
          {wsStatus === 'erro' && (
            <div className="text-center py-6 bg-red-900/20 rounded-2xl border border-red-900/40">
              <p className="text-red-400 text-sm">❌ Erro de conexão.<br/>Recarregue a página.</p>
            </div>
          )}
          {jogadores.map((j, i) => (
            <div key={j.id} className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base text-white flex-shrink-0 ${
                i === 0 ? 'bg-purple-600' : i === 1 ? 'bg-blue-600' : i === 2 ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                {j.nome.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-semibold text-base flex-1">{j.nome}</span>
              {String(j.id) === String(sala?.criador_id) && (
                <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 px-2 py-1 rounded-lg">
                  👑 Criador
                </span>
              )}
              {String(j.id) === String(usuario?.id) && String(j.id) !== String(sala?.criador_id) && (
                <span className="text-purple-400 text-xs font-bold bg-purple-400/10 px-2 py-1 rounded-lg">
                  Você
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botão iniciar */}
      {souCriador ? (
        <button
          onClick={iniciarSelecao}
          disabled={wsStatus !== 'conectado' || jogadores.length < 2}
          className="w-full bg-green-600 hover:bg-green-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg shadow-green-900/40"
        >
          {wsStatus === 'conectando'
            ? '⏳ Conectando...'
            : jogadores.length < 2
            ? '⏳ Aguardando jogadores...'
            : '🚀 Iniciar — Escolher Músicas'}
        </button>
      ) : (
        <div className="text-center bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="text-2xl mb-2 animate-pulse">⏳</div>
          <p className="text-gray-400 text-sm font-medium">Aguardando o criador iniciar o jogo...</p>
        </div>
      )}

    </div>
  )
}