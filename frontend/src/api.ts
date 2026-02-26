import axios from 'axios'

const api = axios.create({
  baseURL: 'https://taiacu-backend.marcoslucas-dev.workers.dev',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api