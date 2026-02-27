type MessageHandler = (msg: Record<string, unknown>) => void

class WebSocketManager {
  private socket: WebSocket | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private url: string = ''
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect(url: string): WebSocket {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING) &&
      this.url === url
    ) {
      return this.socket
    }

    if (this.socket) {
      this.socket.close()
    }

    this.url = url
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      console.log('✅ WS conectado:', url)
      this.emit('__connected', {})
    }

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.tipo, msg)
        this.emit('*', msg)
      } catch {}
    }

    this.socket.onclose = (e) => {
      console.log('❌ WS desconectado:', e.code)
      this.emit('__disconnected', { code: e.code })
    }

    this.socket.onerror = (e) => {
      console.error('🔴 WS erro:', e)
      this.emit('__error', {})
    }

    return this.socket
  }

  send(data: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.warn('WS não está aberto, mensagem descartada:', data)
    }
  }

  on(tipo: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(tipo)) {
      this.handlers.set(tipo, new Set())
    }
    this.handlers.get(tipo)!.add(handler)
    return () => {
      this.handlers.get(tipo)?.delete(handler)
    }
  }

  private emit(tipo: string, msg: Record<string, unknown>) {
    this.handlers.get(tipo)?.forEach((h) => {
      try { h(msg) } catch {}
    })
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
    this.handlers.clear()
    this.url = ''
  }

  getSocket(): WebSocket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

export const wsManager = new WebSocketManager()