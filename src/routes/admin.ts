import { Hono } from 'hono';
import type {
  Env,
  ApiResponse,
  CreateProductRequest,
  CreateCollectionRequest,
  Product,
  Collection,
  ProductRow,
  Order,
} from '../types';
import { getProductWithRelations } from './products';

const admin = new Hono<{ Bindings: Env }>();

// Generate unique IDs
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// Middleware: Check admin API key
admin.use('*', async (c, next) => {
  const apiKey = c.req.header('X-Admin-API-Key');
  if (!c.env.ADMIN_API_KEY || apiKey !== c.env.ADMIN_API_KEY) {
    return c.json<ApiResponse>({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
});

// =====================
// PRODUCTS
// =====================

// POST /api/admin/products - Create product
admin.post('/products', async (c) => {
  try {
    const body = await c.req.json<CreateProductRequest>();

    if (!body.handle || !body.title || !body.variants?.length) {
      return c.json<ApiResponse>(
        { success: false, error: 'handle, title, and variants are required' },
        400
      );
    }

    const productId = generateId('prod');

    // Insert product
    await c.env.DB.prepare(`
      INSERT INTO products (id, handle, title, description, description_html, vendor, product_type, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        productId,
        body.handle,
        body.title,
        body.description || null,
        body.descriptionHtml || null,
        body.vendor || null,
        body.productType || null,
        body.tags ? JSON.stringify(body.tags) : null
      )
      .run();

    // Insert variants
    for (const variant of body.variants) {
      const variantId = generateId('var');
      await c.env.DB.prepare(`
        INSERT INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, quantity_available, selected_options)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          variantId,
          productId,
          variant.title,
          variant.sku || null,
          variant.priceAmount,
          variant.priceCurrency || 'XOF',
          variant.compareAtPrice || null,
          variant.quantityAvailable || 0,
          variant.selectedOptions ? JSON.stringify(variant.selectedOptions) : null
        )
        .run();
    }

    // Insert options
    if (body.options) {
      for (let i = 0; i < body.options.length; i++) {
        const option = body.options[i];
        const optionId = generateId('opt');
        await c.env.DB.prepare(`
          INSERT INTO product_options (id, product_id, name, position, values)
          VALUES (?, ?, ?, ?, ?)
        `)
          .bind(optionId, productId, option.name, i, JSON.stringify(option.values))
          .run();
      }
    }

    // Insert images
    if (body.images) {
      for (let i = 0; i < body.images.length; i++) {
        const image = body.images[i];
        const imageId = generateId('img');
        await c.env.DB.prepare(`
          INSERT INTO product_images (id, product_id, url, alt_text, width, height, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            imageId,
            productId,
            image.url,
            image.altText || null,
            image.width || null,
            image.height || null,
            i
          )
          .run();
      }
    }

    // Add to collections
    if (body.collectionIds) {
      for (const collectionId of body.collectionIds) {
        await c.env.DB.prepare(
          'INSERT INTO product_collections (product_id, collection_id) VALUES (?, ?)'
        )
          .bind(productId, collectionId)
          .run();
      }
    }

    // Fetch and return created product
    const productRow = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId)
      .first<ProductRow>();

    const product = await getProductWithRelations(c.env.DB, productRow!);

    return c.json<ApiResponse<{ product: Product }>>(
      { success: true, data: { product } },
      201
    );
  } catch (error) {
    console.error('Create product error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create product' }, 500);
  }
});

// PUT /api/admin/products/:id - Update product
admin.put('/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json<Partial<CreateProductRequest>>();

    // Check if product exists
    const exists = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?')
      .bind(productId)
      .first();

    if (!exists) {
      return c.json<ApiResponse>({ success: false, error: 'Product not found' }, 404);
    }

    // Update product fields
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.handle !== undefined) {
      updates.push('handle = ?');
      values.push(body.handle);
    }
    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.descriptionHtml !== undefined) {
      updates.push('description_html = ?');
      values.push(body.descriptionHtml);
    }
    if (body.vendor !== undefined) {
      updates.push('vendor = ?');
      values.push(body.vendor);
    }
    if (body.productType !== undefined) {
      updates.push('product_type = ?');
      values.push(body.productType);
    }
    if (body.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(body.tags));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      await c.env.DB.prepare(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...values, productId)
        .run();
    }

    // Update images if provided
    if (body.images) {
      // Delete existing images
      await c.env.DB.prepare('DELETE FROM product_images WHERE product_id = ?')
        .bind(productId)
        .run();

      // Insert new images
      for (let i = 0; i < body.images.length; i++) {
        const image = body.images[i];
        const imageId = generateId('img');
        await c.env.DB.prepare(`
          INSERT INTO product_images (id, product_id, url, alt_text, width, height, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            imageId,
            productId,
            image.url,
            image.altText || null,
            image.width || null,
            image.height || null,
            i
          )
          .run();
      }
    }

    // Fetch and return updated product
    const productRow = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId)
      .first<ProductRow>();

    const product = await getProductWithRelations(c.env.DB, productRow!);

    return c.json<ApiResponse<{ product: Product }>>({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Update product error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update product' }, 500);
  }
});

// DELETE /api/admin/products/:id - Delete product
admin.delete('/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to delete product' }, 500);
  }
});

// =====================
// COLLECTIONS
// =====================

// GET /api/admin/collections - List all collections (admin view)
admin.get('/collections', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM collections ORDER BY title').all();
    return c.json<ApiResponse>({ success: true, data: { collections: result.results } });
  } catch (error) {
    console.error('List collections error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list collections' }, 500);
  }
});

// POST /api/admin/collections - Create collection
admin.post('/collections', async (c) => {
  try {
    const body = await c.req.json<CreateCollectionRequest>();

    if (!body.handle || !body.title) {
      return c.json<ApiResponse>(
        { success: false, error: 'handle and title are required' },
        400
      );
    }

    const collectionId = generateId('col');

    await c.env.DB.prepare(`
      INSERT INTO collections (id, handle, title, description, image_url, seo_title, seo_description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        collectionId,
        body.handle,
        body.title,
        body.description || null,
        body.imageUrl || null,
        body.seoTitle || null,
        body.seoDescription || null
      )
      .run();

    const collection = await c.env.DB.prepare('SELECT * FROM collections WHERE id = ?')
      .bind(collectionId)
      .first();

    return c.json<ApiResponse>({ success: true, data: { collection } }, 201);
  } catch (error) {
    console.error('Create collection error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create collection' }, 500);
  }
});

// DELETE /api/admin/collections/:id - Delete collection
admin.delete('/collections/:id', async (c) => {
  try {
    const collectionId = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId).run();

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to delete collection' }, 500);
  }
});

// =====================
// ORDERS (Read only)
// =====================

// GET /api/admin/orders - List all orders
admin.get('/orders', async (c) => {
  try {
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let sql = 'SELECT * FROM orders';
    const params: (string | number)[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(sql).bind(...params).all<Order>();

    return c.json<ApiResponse>({
      success: true,
      data: { orders: result.results, total: result.results?.length || 0 },
    });
  } catch (error) {
    console.error('List orders error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list orders' }, 500);
  }
});

// PUT /api/admin/orders/:id/status - Update order status
admin.put('/orders/:id/status', async (c) => {
  try {
    const orderId = c.req.param('id');
    const { status } = await c.req.json<{ status: string }>();

    await c.env.DB.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(status, orderId)
      .run();

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update order status' }, 500);
  }
});

// =====================
// UPLOAD (R2)
// =====================

// POST /api/admin/upload - Upload image to R2
admin.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json<ApiResponse>({ success: false, error: 'No file provided' }, 400);
    }

    const extension = file.name.split('.').pop() || 'jpg';
    const key = `${generateId('img')}.${extension}`;

    await c.env.IMAGES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Construct public URL (assuming R2 bucket is public or using custom domain)
    const url = `${c.env.R2_PUBLIC_URL}/${key}`;

    return c.json<ApiResponse<{ url: string; key: string }>>({
      success: true,
      data: { url, key },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to upload file' }, 500);
  }
});

// =====================
// MENUS
// =====================

// GET /api/admin/menus - List menus
admin.get('/menus', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM menus').all();
    return c.json<ApiResponse>({ success: true, data: { menus: result.results } });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'Failed to list menus' }, 500);
  }
});

// POST /api/admin/menus - Create/Update menu
admin.post('/menus', async (c) => {
  try {
    const { handle, items } = await c.req.json<{ handle: string; items: Array<{ title: string; path: string }> }>();

    const existing = await c.env.DB.prepare('SELECT id FROM menus WHERE handle = ?')
      .bind(handle)
      .first();

    if (existing) {
      await c.env.DB.prepare('UPDATE menus SET items = ? WHERE handle = ?')
        .bind(JSON.stringify(items), handle)
        .run();
    } else {
      const menuId = generateId('menu');
      await c.env.DB.prepare('INSERT INTO menus (id, handle, items) VALUES (?, ?, ?)')
        .bind(menuId, handle, JSON.stringify(items))
        .run();
    }

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    return c.json<ApiResponse>({ success: false, error: 'Failed to save menu' }, 500);
  }
});

export default admin;
