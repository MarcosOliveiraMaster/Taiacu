# 🐗 TAIAÇU

> Jogo social de música em tempo real. Descubra quem escolheu cada música!

## 🎮 Como Jogar

1. Crie uma conta ou faça login
2. Crie uma sala ou entre com um código de 5 letras
3. Escolha suas músicas (busca pelo YouTube)
4. Tente adivinhar quem escolheu cada música que tocar!
5. Ganhe pontos acertando — e tente disfarçar as suas músicas!

## 🕹️ Modos de Jogo

- **Sussegado** — 1 ponto por acerto, sem pressão de tempo
- **Arretado** — pontuação por velocidade, quanto mais rápido, mais pontos!

## 🛠️ Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Cloudflare Workers + Hono.js
- **Tempo Real:** Cloudflare Durable Objects + WebSocket
- **Banco de Dados:** Cloudflare D1 (SQLite)
- **Cache:** Cloudflare KV
- **Deploy:** Cloudflare Pages + Workers

## 📁 Estrutura

```
Taiacu/
├── frontend/   # React SPA
└── backend/    # Cloudflare Workers + Durable Objects
```

## 🚀 Rodando Localmente

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev
```