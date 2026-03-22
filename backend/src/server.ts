import { buildApp } from './app.js'

const port = parseInt(process.env.BACKEND_PORT ?? '3000', 10)
const host = '0.0.0.0'

const app = buildApp()

app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
