import { Hono } from 'hono';
import type {
  Env,
  ApiResponse,
  Collection,
  CollectionRow,
  Product,
  ProductRow,
} from '../types';
import { getProductWithRelations } from './products';

const collections = new Hono<{ Bindings: Env }>();

// Helper: Transform DB row to Collection
function transformCollection(row: CollectionRow): Collection {
  return {
    handle: row.handle,
    title: row.title,
    description: row.description,
    image: row.image_url
      ? { url: row.image_url, altText: row.title, width: null, height: null }
      : null,
    seo: {
      title: row.seo_title || row.title,
      description: row.seo_description || row.description,
    },
    path: `/search/${row.handle}`,
    updatedAt: row.updated_at,
  };
}

// GET /api/collections - List all collections
collections.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM collections ORDER BY title'
    ).all<CollectionRow>();

    const collectionRows = result.results || [];

    // Always include "All" collection at the start
    const allCollection: Collection = {
      handle: '',
      title: 'All',
      description: 'All products',
      image: null,
      seo: { title: 'All', description: 'All products' },
      path: '/search',
      updatedAt: new Date().toISOString(),
    };

    const collectionsData = [
      allCollection,
      ...collectionRows
        .filter((c) => !c.handle.startsWith('hidden'))
        .map(transformCollection),
    ];

    return c.json<ApiResponse<{ collections: Collection[] }>>({
      success: true,
      data: { collections: collectionsData },
    });
  } catch (error) {
    console.error('Get collections error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch collections' },
      500
    );
  }
});

// GET /api/collections/:handle - Get single collection
collections.get('/:handle', async (c) => {
  try {
    const handle = c.req.param('handle');

    const collectionRow = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE handle = ?'
    )
      .bind(handle)
      .first<CollectionRow>();

    if (!collectionRow) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    return c.json<ApiResponse<{ collection: Collection }>>({
      success: true,
      data: { collection: transformCollection(collectionRow) },
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch collection' },
      500
    );
  }
});

// GET /api/collections/:handle/products - Get products in collection
collections.get('/:handle/products', async (c) => {
  try {
    const handle = c.req.param('handle');
    const sortKey = c.req.query('sortKey') || 'CREATED_AT';
    const reverse = c.req.query('reverse') === 'true';

    // Get collection
    const collection = await c.env.DB.prepare(
      'SELECT id FROM collections WHERE handle = ?'
    )
      .bind(handle)
      .first<{ id: string }>();

    if (!collection) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    // Sorting
    const sortColumn =
      sortKey === 'PRICE'
        ? 'p.title'
        : sortKey === 'BEST_SELLING'
          ? 'p.title'
          : sortKey === 'TITLE'
            ? 'p.title'
            : 'p.created_at';

    // Get products in collection
    const result = await c.env.DB.prepare(`
      SELECT p.* FROM products p
      INNER JOIN product_collections pc ON p.id = pc.product_id
      WHERE pc.collection_id = ? AND p.available_for_sale = 1
      ORDER BY ${sortColumn} ${reverse ? 'DESC' : 'ASC'}
    `)
      .bind(collection.id)
      .all<ProductRow>();

    const productRows = result.results || [];
    const products = await Promise.all(
      productRows.map((row) => getProductWithRelations(c.env.DB, row))
    );

    return c.json<ApiResponse<{ products: Product[] }>>({
      success: true,
      data: { products },
    });
  } catch (error) {
    console.error('Get collection products error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to fetch collection products' },
      500
    );
  }
});

export default collections;
