import { DurableObject } from 'cloudflare:workers'

export class SalaDurableObject extends DurableObject {
  private jogadores: Map<string, WebSocket> = new Map()

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Upgrade para WebSocket
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      this.ctx.acceptWebSocket(server)

      const jogadorId = url.searchParams.get('jogadorId') ?? 'anonimo'
      this.jogadores.set(jogadorId, server)

      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('TAIAÇU Sala Online', { status: 200 })
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    // Broadcast para todos os jogadores da sala
    const dados = JSON.parse(message)
    this.jogadores.forEach((jogador) => {
      if (jogador !== ws && jogador.readyState === WebSocket.READY_STATE_OPEN) {
        jogador.send(JSON.stringify(dados))
      }
    })
  }

  async webSocketClose(ws: WebSocket) {
    this.jogadores.forEach((jogador, id) => {
      if (jogador === ws) this.jogadores.delete(id)
    })
  }
}