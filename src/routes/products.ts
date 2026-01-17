import { Hono } from 'hono';
import type {
  Env,
  ApiResponse,
  Product,
  ProductRow,
  VariantRow,
  OptionRow,
  ImageRow,
  Money,
} from '../types';

const products = new Hono<{ Bindings: Env }>();

// Helper: Transform DB rows to Product object
async function getProductWithRelations(
  db: D1Database,
  productRow: ProductRow
): Promise<Product> {
  // Get variants
  const variantsResult = await db
    .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY created_at')
    .bind(productRow.id)
    .all<VariantRow>();
  const variants = variantsResult.results || [];

  // Get options
  const optionsResult = await db
    .prepare('SELECT * FROM product_options WHERE product_id = ? ORDER BY position')
    .bind(productRow.id)
    .all<OptionRow>();
  const options = optionsResult.results || [];

  // Get images
  const imagesResult = await db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY position')
    .bind(productRow.id)
    .all<ImageRow>();
  const images = imagesResult.results || [];

  // Calculate price range
  const prices = variants.map((v) => parseFloat(v.price_amount));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currency = variants[0]?.price_currency || 'XOF';

  const featuredImage = images[0]
    ? {
        url: images[0].url,
        altText: images[0].alt_text,
        width: images[0].width,
        height: images[0].height,
      }
    : null;

  return {
    id: productRow.id,
    handle: productRow.handle,
    title: productRow.title,
    description: productRow.description,
    descriptionHtml: productRow.description_html,
    vendor: productRow.vendor,
    productType: productRow.product_type,
    tags: productRow.tags ? JSON.parse(productRow.tags) : [],
    availableForSale: productRow.available_for_sale === 1,
    priceRange: {
      minVariantPrice: { amount: minPrice.toString(), currencyCode: currency },
      maxVariantPrice: { amount: maxPrice.toString(), currencyCode: currency },
    },
    variants: variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      availableForSale: v.available_for_sale === 1,
      quantityAvailable: v.quantity_available,
      price: { amount: v.price_amount, currencyCode: v.price_currency },
      compareAtPrice: v.compare_at_price
        ? { amount: v.compare_at_price, currencyCode: v.price_currency }
        : null,
      selectedOptions: v.selected_options ? JSON.parse(v.selected_options) : [],
    })),
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      values: JSON.parse(o.values),
    })),
    images: images.map((i) => ({
      url: i.url,
      altText: i.alt_text,
      width: i.width,
      height: i.height,
    })),
    featuredImage,
    seo: {
      title: productRow.title,
      description: productRow.description,
    },
    createdAt: productRow.created_at,
    updatedAt: productRow.updated_at,
  };
}

// GET /api/products - List all products
products.get('/', async (c) => {
  try {
    const query = c.req.query('query');
    const sortKey = c.req.query('sortKey') || 'CREATED_AT';
    const reverse = c.req.query('reverse') === 'true';
    const limit = parseInt(c.req.query('limit') || '100');

    let sql = 'SELECT * FROM products WHERE available_for_sale = 1';
    const params: (string | number)[] = [];

    // Search filter
    if (query) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    // Sorting
    const sortColumn =
      sortKey === 'PRICE'
        ? 'title' // Will need to join with variants for real price sorting
        : sortKey === 'BEST_SELLING'
          ? 'title'
          : sortKey === 'TITLE'
            ? 'title'
            : 'created_at';

    sql += ` ORDER BY ${sortColumn} ${reverse ? 'DESC' : 'ASC'}`;
    sql += ` LIMIT ?`;
    params.push(limit);

    const result = await c.env.DB.prepare(sql).bind(...params).all<ProductRow>();
    const productRows = result.results || [];

    // Get full product data with relations
    const productsData = await Promise.all(
      productRows.map((row) => getProductWithRelations(c.env.DB, row))
    );

    return c.json<ApiResponse<{ products: Product[] }>>({
      success: true,
      data: { products: productsData },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch products' },
      500
    );
  }
});

// GET /api/products/:handle - Get single product by handle
products.get('/:handle', async (c) => {
  try {
    const handle = c.req.param('handle');

    const productRow = await c.env.DB.prepare(
      'SELECT * FROM products WHERE handle = ?'
    )
      .bind(handle)
      .first<ProductRow>();

    if (!productRow) {
      return c.json<ApiResponse>({ success: false, error: 'Product not found' }, 404);
    }

    const product = await getProductWithRelations(c.env.DB, productRow);

    return c.json<ApiResponse<{ product: Product }>>({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Get product error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch product' },
      500
    );
  }
});

// GET /api/products/:handle/recommendations - Get product recommendations
products.get('/:handle/recommendations', async (c) => {
  try {
    const handle = c.req.param('handle');

    // Get current product
    const currentProduct = await c.env.DB.prepare(
      'SELECT id, product_type, vendor FROM products WHERE handle = ?'
    )
      .bind(handle)
      .first<{ id: string; product_type: string; vendor: string }>();

    if (!currentProduct) {
      return c.json<ApiResponse>({ success: false, error: 'Product not found' }, 404);
    }

    // Get similar products (same type or vendor, excluding current)
    const result = await c.env.DB.prepare(`
      SELECT * FROM products
      WHERE id != ? AND available_for_sale = 1
      AND (product_type = ? OR vendor = ?)
      ORDER BY created_at DESC
      LIMIT 4
    `)
      .bind(currentProduct.id, currentProduct.product_type, currentProduct.vendor)
      .all<ProductRow>();

    const productRows = result.results || [];
    const recommendations = await Promise.all(
      productRows.map((row) => getProductWithRelations(c.env.DB, row))
    );

    return c.json<ApiResponse<{ products: Product[] }>>({
      success: true,
      data: { products: recommendations },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch recommendations' },
      500
    );
  }
});

export default products;
export { getProductWithRelations };
