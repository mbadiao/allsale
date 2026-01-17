import type { Env, PayDunyaInvoiceResponse, PayDunyaStatusResponse } from '../types';

interface CreateInvoiceParams {
  orderId: string;
  totalAmount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export class PayDunyaService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(private env: Env) {
    this.baseUrl = env.PAYDUNYA_MODE === 'live'
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';

    this.headers = {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': env.PAYDUNYA_MASTER_KEY,
      'PAYDUNYA-PRIVATE-KEY': env.PAYDUNYA_PRIVATE_KEY,
      'PAYDUNYA-TOKEN': env.PAYDUNYA_TOKEN,
    };
  }

  async createInvoice(params: CreateInvoiceParams): Promise<{
    success: boolean;
    token?: string;
    invoiceUrl?: string;
    error?: string;
  }> {
    try {
      const payload = {
        invoice: {
          total_amount: params.totalAmount,
          description: params.description,
        },
        store: {
          name: 'AllSale',
          tagline: 'Votre marketplace au Sénégal',
          phone: '+221000000000',
          postal_address: 'Dakar, Sénégal',
          website_url: this.env.FRONTEND_URL,
        },
        custom_data: {
          order_id: params.orderId,
        },
        actions: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          callback_url: params.callbackUrl,
        },
        customer: {
          name: params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
        },
      };

      // Add items if provided
      if (params.items && params.items.length > 0) {
        const items: Record<string, { name: string; quantity: number; unit_price: number; total_price: number }> = {};
        params.items.forEach((item, index) => {
          items[`item_${index}`] = {
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
          };
        });
        Object.assign(payload.invoice, { items });
      }

      const response = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json() as PayDunyaInvoiceResponse;

      if (data.response_code === '00') {
        return {
          success: true,
          token: data.token,
          invoiceUrl: data.invoice_url,
        };
      }

      return {
        success: false,
        error: data.response_text || 'Failed to create invoice',
      };
    } catch (error) {
      console.error('PayDunya createInvoice error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkStatus(token: string): Promise<{
    success: boolean;
    status?: string;
    orderId?: string;
    totalAmount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout-invoice/confirm/${token}`, {
        method: 'GET',
        headers: this.headers,
      });

      const data = await response.json() as PayDunyaStatusResponse;

      if (data.response_code === '00') {
        return {
          success: true,
          status: data.invoice?.status,
          orderId: data.custom_data?.order_id,
          totalAmount: data.invoice?.total_amount,
        };
      }

      return {
        success: false,
        error: data.response_text || 'Failed to check status',
      };
    } catch (error) {
      console.error('PayDunya checkStatus error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyWebhookSignature(receivedMasterKey: string): boolean {
    return receivedMasterKey === this.env.PAYDUNYA_MASTER_KEY;
  }
}
