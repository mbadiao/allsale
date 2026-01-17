import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'

// Routes
import products from './routes/products'
import collections from './routes/collections'
import cart from './routes/cart'
import menus from './routes/menus'
import orders from './routes/orders'
import payments from './routes/payments'
import webhooks from './routes/webhooks'
import admin from './routes/admin'

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin?.includes('localhost')) return origin
    // Allow your production domain
    if (origin?.includes('allsale')) return origin
    return null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-API-Key'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'allsale-backend' })
})

// Public API routes
app.route('/api/products', products)
app.route('/api/collections', collections)
app.route('/api/cart', cart)
app.route('/api/menus', menus)

// Order & Payment routes
app.route('/api/orders', orders)
app.route('/api/payments', payments)
app.route('/api/webhooks', webhooks)

// Admin routes (protected)
app.route('/api/admin', admin)

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

export default app
