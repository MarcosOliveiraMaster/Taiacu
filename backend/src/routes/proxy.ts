import { Hono } from 'hono'

const proxy = new Hono()

proxy.get('/deezer', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ erro: 'Query obrigatória' }, 400)
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=12`
  const res = await fetch(url)
  if (!res.ok) return c.json({ erro: 'Erro ao buscar Deezer' }, 500)
  const data = await res.json()
  return c.json(data)
})

export default proxy
