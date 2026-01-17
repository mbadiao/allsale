import { Hono } from 'hono';
import type { Env, InitPaymentRequest, Order, ApiResponse } from '../types';
import { PayDunyaService } from '../services/paydunya';

const payments = new Hono<{ Bindings: Env }>();

// Generate a unique transaction ID
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${random}`.toUpperCase();
}

// POST /api/payments/init - Initialize a payment
payments.post('/init', async (c) => {
  try {
    const body = await c.req.json<InitPaymentRequest>();

    // Validate required fields
    if (!body.orderId || !body.paymentMethod || !body.returnUrl || !body.cancelUrl) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: orderId, paymentMethod, returnUrl, cancelUrl',
      }, 400);
    }

    // Fetch the order
    const order = await c.env.DB.prepare(`
      SELECT * FROM orders WHERE id = ?
    `).bind(body.orderId).first<Order>();

    if (!order) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Order not found',
      }, 404);
    }

    // Check if order is already paid
    if (order.payment_status === 'completed') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Order is already paid',
      }, 400);
    }

    // Parse line items for invoice
    const lineItems = JSON.parse(order.line_items) as Array<{
      quantity: number;
      cost: { totalAmount: { amount: string } };
      merchandise: { product: { title: string } };
    }>;

    const items = lineItems.map(item => ({
      name: item.merchandise.product.title,
      quantity: item.quantity,
      unitPrice: Math.round(parseFloat(item.cost.totalAmount.amount) / item.quantity),
      totalPrice: Math.round(parseFloat(item.cost.totalAmount.amount)),
    }));

    // Build callback URL for webhook
    const backendUrl = c.req.url.split('/api/')[0];
    const callbackUrl = `${backendUrl}/api/webhooks/paydunya`;

    // Create PayDunya invoice
    const paydunya = new PayDunyaService(c.env);
    const result = await paydunya.createInvoice({
      orderId: order.id,
      totalAmount: order.total_amount,
      description: `Commande ${order.id} - AllSale`,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
      callbackUrl,
      items,
    });

    if (!result.success || !result.token || !result.invoiceUrl) {
      return c.json<ApiResponse>({
        success: false,
        error: result.error || 'Failed to create payment invoice',
      }, 500);
    }

    // Update order with PayDunya token
    await c.env.DB.prepare(`
      UPDATE orders
      SET paydunya_token = ?, paydunya_invoice_url = ?, payment_method = ?,
          payment_status = 'processing', updated_at = datetime('now')
      WHERE id = ?
    `).bind(result.token, result.invoiceUrl, body.paymentMethod, order.id).run();

    // Create transaction record
    const transactionId = generateTransactionId();
    await c.env.DB.prepare(`
      INSERT INTO transactions (
        id, order_id, paydunya_token, amount, currency_code,
        payment_method, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'initiated')
    `).bind(
      transactionId,
      order.id,
      result.token,
      order.total_amount,
      order.currency_code,
      body.paymentMethod,
    ).run();

    return c.json<ApiResponse<{ redirectUrl: string; token: string }>>({
      success: true,
      data: {
        redirectUrl: result.invoiceUrl,
        token: result.token,
      },
    });
  } catch (error) {
    console.error('Init payment error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to initialize payment',
    }, 500);
  }
});

// GET /api/payments/:token/status - Check payment status
payments.get('/:token/status', async (c) => {
  try {
    const token = c.req.param('token');

    // Check status with PayDunya
    const paydunya = new PayDunyaService(c.env);
    const result = await paydunya.checkStatus(token);

    if (!result.success) {
      return c.json<ApiResponse>({
        success: false,
        error: result.error || 'Failed to check payment status',
      }, 500);
    }

    // Fetch order by token
    const order = await c.env.DB.prepare(`
      SELECT id, status, payment_status, total_amount, currency_code
      FROM orders WHERE paydunya_token = ?
    `).bind(token).first<Partial<Order>>();

    return c.json<ApiResponse<{
      paymentStatus: string;
      order: Partial<Order> | null;
    }>>({
      success: true,
      data: {
        paymentStatus: result.status || 'unknown',
        order: order || null,
      },
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Failed to check payment status',
    }, 500);
  }
});

export default payments;
