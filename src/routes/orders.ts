import { Hono } from 'hono';
import type { Env, CreateOrderRequest, Order, ApiResponse } from '../types';

const orders = new Hono<{ Bindings: Env }>();

// Generate a unique order ID
function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

// POST /api/orders - Create a new order
orders.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateOrderRequest>();

    // Validate required fields
    if (!body.cart || !body.customer || !body.shippingAddress) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: cart, customer, shippingAddress',
      }, 400);
    }

    if (!body.customer.email || !body.customer.name || !body.customer.phone) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing customer fields: email, name, phone',
      }, 400);
    }

    const orderId = generateOrderId();

    // Parse amounts (convert from string to integer cents/XOF)
    const subtotalAmount = Math.round(parseFloat(body.cart.cost.subtotalAmount.amount) * 1);
    const taxAmount = Math.round(parseFloat(body.cart.cost.totalTaxAmount.amount) * 1);
    const totalAmount = Math.round(parseFloat(body.cart.cost.totalAmount.amount) * 1);

    // Insert order into D1
    await c.env.DB.prepare(`
      INSERT INTO orders (
        id, shopify_cart_id, customer_email, customer_name, customer_phone,
        shipping_address, subtotal_amount, tax_amount, total_amount,
        currency_code, line_items, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    `).bind(
      orderId,
      body.cart.id,
      body.customer.email,
      body.customer.name,
      body.customer.phone,
      JSON.stringify(body.shippingAddress),
      subtotalAmount,
      taxAmount,
      totalAmount,
      body.cart.cost.totalAmount.currencyCode || 'XOF',
      JSON.stringify(body.cart.lines),
    ).run();

    return c.json<ApiResponse<{ order: Partial<Order> }>>({
      success: true,
      data: {
        order: {
          id: orderId,
          status: 'pending',
          payment_status: 'pending',
          total_amount: totalAmount,
          currency_code: body.cart.cost.totalAmount.currencyCode || 'XOF',
        },
      },
    }, 201);
  } catch (error) {
    console.error('Create order error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to create order',
    }, 500);
  }
});

// GET /api/orders/:id - Get order details
orders.get('/:id', async (c) => {
  try {
    const orderId = c.req.param('id');

    const result = await c.env.DB.prepare(`
      SELECT * FROM orders WHERE id = ?
    `).bind(orderId).first<Order>();

    if (!result) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Order not found',
      }, 404);
    }

    // Parse JSON fields for response
    const order = {
      ...result,
      shipping_address: JSON.parse(result.shipping_address),
      line_items: JSON.parse(result.line_items),
    };

    return c.json<ApiResponse<{ order: typeof order }>>({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch order',
    }, 500);
  }
});

// GET /api/orders - List orders (with optional filters)
orders.get('/', async (c) => {
  try {
    const email = c.req.query('email');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: (string | number)[] = [];

    if (email) {
      query += ' AND customer_email = ?';
      params.push(email);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...params).all<Order>();

    const orders = result.results.map(order => ({
      ...order,
      shipping_address: JSON.parse(order.shipping_address),
      line_items: JSON.parse(order.line_items),
    }));

    return c.json<ApiResponse<{ orders: typeof orders; total: number }>>({
      success: true,
      data: {
        orders,
        total: orders.length,
      },
    });
  } catch (error) {
    console.error('List orders error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch orders',
    }, 500);
  }
});

export default orders;
