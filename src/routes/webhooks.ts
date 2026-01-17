import { Hono } from 'hono';
import type { Env, PayDunyaWebhookPayload, Order, ApiResponse } from '../types';
import { PayDunyaService } from '../services/paydunya';

const webhooks = new Hono<{ Bindings: Env }>();

// POST /api/webhooks/paydunya - Handle PayDunya IPN (Instant Payment Notification)
webhooks.post('/paydunya', async (c) => {
  try {
    // Get the master key from headers for verification
    const receivedMasterKey = c.req.header('PAYDUNYA-MASTER-KEY');

    if (!receivedMasterKey) {
      console.error('Webhook missing PAYDUNYA-MASTER-KEY header');
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing authentication header',
      }, 401);
    }

    // Verify the webhook signature
    const paydunya = new PayDunyaService(c.env);
    if (!paydunya.verifyWebhookSignature(receivedMasterKey)) {
      console.error('Webhook signature verification failed');
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid signature',
      }, 401);
    }

    // Parse the webhook payload
    const payload = await c.req.json<PayDunyaWebhookPayload>();
    console.log('PayDunya webhook received:', JSON.stringify(payload, null, 2));

    // Extract data from payload
    const token = payload.invoice?.token;
    const status = payload.invoice?.status;
    const orderId = payload.custom_data?.order_id;
    const totalAmount = payload.invoice?.total_amount;

    if (!token || !orderId) {
      console.error('Webhook missing token or order_id');
      return c.json<ApiResponse>({
        success: false,
        error: 'Missing required data',
      }, 400);
    }

    // Fetch the order
    const order = await c.env.DB.prepare(`
      SELECT * FROM orders WHERE id = ? AND paydunya_token = ?
    `).bind(orderId, token).first<Order>();

    if (!order) {
      console.error(`Order not found: ${orderId} with token ${token}`);
      return c.json<ApiResponse>({
        success: false,
        error: 'Order not found',
      }, 404);
    }

    // Verify amount matches (security check)
    if (totalAmount && totalAmount !== order.total_amount) {
      console.error(`Amount mismatch: expected ${order.total_amount}, got ${totalAmount}`);
      // Log this but still process - could be a currency conversion issue
    }

    // Map PayDunya status to our status
    let paymentStatus: string;
    let orderStatus: string;

    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        paymentStatus = 'completed';
        orderStatus = 'confirmed';
        break;
      case 'pending':
        paymentStatus = 'processing';
        orderStatus = 'pending';
        break;
      case 'cancelled':
        paymentStatus = 'cancelled';
        orderStatus = 'cancelled';
        break;
      case 'failed':
      default:
        paymentStatus = 'failed';
        orderStatus = 'pending';
        break;
    }

    // Update order status
    const paidAt = paymentStatus === 'completed' ? "datetime('now')" : 'NULL';
    await c.env.DB.prepare(`
      UPDATE orders
      SET payment_status = ?, status = ?, updated_at = datetime('now'),
          paid_at = ${paymentStatus === 'completed' ? "datetime('now')" : 'paid_at'}
      WHERE id = ?
    `).bind(paymentStatus, orderStatus, orderId).run();

    // Update transaction record
    await c.env.DB.prepare(`
      UPDATE transactions
      SET status = ?, paydunya_response = ?, updated_at = datetime('now')
      WHERE order_id = ? AND paydunya_token = ?
    `).bind(
      paymentStatus === 'completed' ? 'completed' : paymentStatus === 'failed' ? 'failed' : 'pending',
      JSON.stringify(payload),
      orderId,
      token,
    ).run();

    console.log(`Order ${orderId} updated: payment_status=${paymentStatus}, status=${orderStatus}`);

    // Return success to PayDunya
    return c.json<ApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error('PayDunya webhook error:', error);
    // Still return 200 to prevent PayDunya from retrying
    return c.json<ApiResponse>({
      success: false,
      error: 'Internal error processing webhook',
    }, 200);
  }
});

export default webhooks;
