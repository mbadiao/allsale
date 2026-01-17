import { Hono } from 'hono';
import type {
  Env,
  ApiResponse,
  Cart,
  CartItem,
  CartRow,
  CartItemRow,
  VariantRow,
  ProductRow,
  ImageRow,
} from '../types';

const cart = new Hono<{ Bindings: Env }>();

// Generate unique IDs
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// Helper: Build full cart object from DB
async function buildCart(db: D1Database, cartId: string, frontendUrl: string): Promise<Cart | null> {
  const cartRow = await db
    .prepare('SELECT * FROM carts WHERE id = ?')
    .bind(cartId)
    .first<CartRow>();

  if (!cartRow) return null;

  // Get cart items with variant and product info
  const itemsResult = await db
    .prepare(`
      SELECT
        ci.id, ci.quantity, ci.variant_id,
        v.title as variant_title, v.price_amount, v.price_currency, v.selected_options,
        p.id as product_id, p.handle as product_handle, p.title as product_title
      FROM cart_items ci
      INNER JOIN product_variants v ON ci.variant_id = v.id
      INNER JOIN products p ON v.product_id = p.id
      WHERE ci.cart_id = ?
    `)
    .bind(cartId)
    .all<{
      id: string;
      quantity: number;
      variant_id: string;
      variant_title: string;
      price_amount: string;
      price_currency: string;
      selected_options: string | null;
      product_id: string;
      product_handle: string;
      product_title: string;
    }>();

  const items = itemsResult.results || [];

  // Get featured images for products
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const imagesMap: Record<string, { url: string; altText: string | null }> = {};

  for (const productId of productIds) {
    const image = await db
      .prepare('SELECT url, alt_text FROM product_images WHERE product_id = ? ORDER BY position LIMIT 1')
      .bind(productId)
      .first<{ url: string; alt_text: string | null }>();
    if (image) {
      imagesMap[productId] = { url: image.url, altText: image.alt_text };
    }
  }

  // Calculate totals
  let subtotal = 0;
  let totalQuantity = 0;

  const lines: CartItem[] = items.map((item) => {
    const price = parseFloat(item.price_amount);
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;
    totalQuantity += item.quantity;

    return {
      id: item.id,
      quantity: item.quantity,
      cost: {
        totalAmount: {
          amount: lineTotal.toString(),
          currencyCode: item.price_currency,
        },
      },
      merchandise: {
        id: item.variant_id,
        title: item.variant_title,
        selectedOptions: item.selected_options ? JSON.parse(item.selected_options) : [],
        product: {
          id: item.product_id,
          handle: item.product_handle,
          title: item.product_title,
          featuredImage: imagesMap[item.product_id]
            ? {
                url: imagesMap[item.product_id].url,
                altText: imagesMap[item.product_id].altText,
                width: null,
                height: null,
              }
            : null,
        },
      },
    };
  });

  const currency = items[0]?.price_currency || 'XOF';

  return {
    id: cartId,
    lines,
    totalQuantity,
    cost: {
      subtotalAmount: { amount: subtotal.toString(), currencyCode: currency },
      totalAmount: { amount: subtotal.toString(), currencyCode: currency },
      totalTaxAmount: { amount: '0', currencyCode: currency },
    },
    checkoutUrl: `${frontendUrl}/checkout`,
  };
}

// POST /api/cart - Create new cart
cart.post('/', async (c) => {
  try {
    const cartId = generateId('cart');

    await c.env.DB.prepare('INSERT INTO carts (id) VALUES (?)').bind(cartId).run();

    const newCart = await buildCart(c.env.DB, cartId, c.env.FRONTEND_URL);

    return c.json<ApiResponse<{ cart: Cart }>>({
      success: true,
      data: { cart: newCart! },
    }, 201);
  } catch (error) {
    console.error('Create cart error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create cart' }, 500);
  }
});

// GET /api/cart/:id - Get cart
cart.get('/:id', async (c) => {
  try {
    const cartId = c.req.param('id');
    const cartData = await buildCart(c.env.DB, cartId, c.env.FRONTEND_URL);

    if (!cartData) {
      return c.json<ApiResponse>({ success: false, error: 'Cart not found' }, 404);
    }

    return c.json<ApiResponse<{ cart: Cart }>>({
      success: true,
      data: { cart: cartData },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to fetch cart' }, 500);
  }
});

// POST /api/cart/:id/items - Add item to cart
cart.post('/:id/items', async (c) => {
  try {
    const cartId = c.req.param('id');
    const { variantId, quantity = 1 } = await c.req.json<{
      variantId: string;
      quantity?: number;
    }>();

    if (!variantId) {
      return c.json<ApiResponse>({ success: false, error: 'variantId is required' }, 400);
    }

    // Check if cart exists
    const cartExists = await c.env.DB.prepare('SELECT id FROM carts WHERE id = ?')
      .bind(cartId)
      .first();

    if (!cartExists) {
      return c.json<ApiResponse>({ success: false, error: 'Cart not found' }, 404);
    }

    // Check if variant exists
    const variant = await c.env.DB.prepare('SELECT id FROM product_variants WHERE id = ?')
      .bind(variantId)
      .first();

    if (!variant) {
      return c.json<ApiResponse>({ success: false, error: 'Variant not found' }, 404);
    }

    // Check if item already in cart
    const existingItem = await c.env.DB.prepare(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?'
    )
      .bind(cartId, variantId)
      .first<{ id: string; quantity: number }>();

    if (existingItem) {
      // Update quantity
      await c.env.DB.prepare(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?'
      )
        .bind(quantity, existingItem.id)
        .run();
    } else {
      // Add new item
      const itemId = generateId('item');
      await c.env.DB.prepare(
        'INSERT INTO cart_items (id, cart_id, variant_id, quantity) VALUES (?, ?, ?, ?)'
      )
        .bind(itemId, cartId, variantId, quantity)
        .run();
    }

    // Update cart timestamp
    await c.env.DB.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?")
      .bind(cartId)
      .run();

    const cart = await buildCart(c.env.DB, cartId, c.env.FRONTEND_URL);

    return c.json<ApiResponse<{ cart: Cart }>>({
      success: true,
      data: { cart: cart! },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to add item to cart' }, 500);
  }
});

// PUT /api/cart/:id/items - Update item quantity
cart.put('/:id/items', async (c) => {
  try {
    const cartId = c.req.param('id');
    const { itemId, quantity } = await c.req.json<{
      itemId: string;
      quantity: number;
    }>();

    if (!itemId || quantity === undefined) {
      return c.json<ApiResponse>(
        { success: false, error: 'itemId and quantity are required' },
        400
      );
    }

    if (quantity <= 0) {
      // Remove item
      await c.env.DB.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?')
        .bind(itemId, cartId)
        .run();
    } else {
      // Update quantity
      await c.env.DB.prepare(
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?'
      )
        .bind(quantity, itemId, cartId)
        .run();
    }

    // Update cart timestamp
    await c.env.DB.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?")
      .bind(cartId)
      .run();

    const cart = await buildCart(c.env.DB, cartId, c.env.FRONTEND_URL);

    return c.json<ApiResponse<{ cart: Cart }>>({
      success: true,
      data: { cart: cart! },
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update cart item' }, 500);
  }
});

// DELETE /api/cart/:id/items/:itemId - Remove item from cart
cart.delete('/:id/items/:itemId', async (c) => {
  try {
    const cartId = c.req.param('id');
    const itemId = c.req.param('itemId');

    await c.env.DB.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?')
      .bind(itemId, cartId)
      .run();

    // Update cart timestamp
    await c.env.DB.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?")
      .bind(cartId)
      .run();

    const cart = await buildCart(c.env.DB, cartId, c.env.FRONTEND_URL);

    return c.json<ApiResponse<{ cart: Cart }>>({
      success: true,
      data: { cart: cart! },
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to remove cart item' }, 500);
  }
});

export default cart;
