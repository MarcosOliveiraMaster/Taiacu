import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function Sala() {
  const navigate = useNavigate()
  const { usuario, sala, jogadores, setJogadores, setWs, setRodadaAtual } = useStore()
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!usuario || !sala) {
      navigate('/')
      return
    }

    // Conectar WebSocket
    const socket = new WebSocket(
      `wss://taiacu-backend.marcoslucas-dev.workers.dev/ws/${sala.codigo}?usuario_id=${usuario.id}&nome=${usuario.nome}`
    )

    socket.onopen = () => {
      console.log('✅ WebSocket conectado!')
    }

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.tipo === 'jogadores') {
        setJogadores(msg.jogadores)
      }

      if (msg.tipo === 'rodada_iniciada') {
        setRodadaAtual(msg.numero)
        navigate('/jogo')
      }
    }

    socket.onclose = () => {
      console.log('❌ WebSocket desconectado!')
    }

    socketRef.current = socket
    setWs(socket)

    return () => {
      socket.close()
    }
  }, [navigate, sala, usuario, setJogadores, setRodadaAtual, setWs])

  const souCriador = usuario?.id === sala?.criador_id

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-purple-400 tracking-widest">
            🎵 TAIAÇU
          </h1>
          <p className="text-gray-400 mt-2">Sala: <span className="text-white font-bold">{sala?.nome}</span></p>
        </div>

        {/* Código da sala */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4 border border-purple-900 text-center">
          <p className="text-gray-400 text-sm mb-2">Código da sala</p>
          <p className="text-4xl font-black text-purple-400 tracking-widest">{sala?.codigo}</p>
          <p className="text-gray-500 text-xs mt-2">Compartilhe com seus amigos!</p>
        </div>

        {/* Jogadores */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4 border border-purple-900">
          <h2 className="text-white font-bold mb-4">
            👥 Jogadores ({jogadores.length})
          </h2>
          <div className="space-y-2">
            {jogadores.length === 0 && (
              <p className="text-gray-500 text-sm text-center">Aguardando jogadores...</p>
            )}
            {jogadores.map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm">
                  {j.nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium">{j.nome}</span>
                {j.id === sala?.criador_id && (
                  <span className="ml-auto text-yellow-400 text-xs font-bold">👑 Criador</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botão iniciar */}
        {souCriador && (
          <button
            onClick={() => {
              socketRef.current?.send(JSON.stringify({ tipo: 'iniciar_jogo' }))
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xl transition-all"
          >
            🚀 Iniciar Jogo
          </button>
        )}

        {!souCriador && (
          <div className="text-center text-gray-500 text-sm">
            ⏳ Aguardando o criador iniciar o jogo...
          </div>
        )}

      </div>
    </div>
  )
}