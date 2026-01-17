import { Hono } from 'hono';
import type { Env, ApiResponse, Menu, MenuRow, Page, PageRow } from '../types';

const menus = new Hono<{ Bindings: Env }>();

// GET /api/menus/:handle - Get menu by handle
menus.get('/:handle', async (c) => {
  try {
    const handle = c.req.param('handle');

    const menuRow = await c.env.DB.prepare('SELECT * FROM menus WHERE handle = ?')
      .bind(handle)
      .first<MenuRow>();

    if (!menuRow) {
      // Return empty menu if not found
      return c.json<ApiResponse<{ menu: Menu[] }>>({
        success: true,
        data: { menu: [] },
      });
    }

    const items: Menu[] = JSON.parse(menuRow.items);

    return c.json<ApiResponse<{ menu: Menu[] }>>({
      success: true,
      data: { menu: items },
    });
  } catch (error) {
    console.error('Get menu error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to fetch menu' }, 500);
  }
});

// GET /api/pages - List all pages
menus.get('/pages', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM pages ORDER BY title'
    ).all<PageRow>();

    const pages: Page[] = (result.results || []).map((row) => ({
      id: row.id,
      title: row.title,
      handle: row.handle,
      body: row.body || '',
      bodySummary: (row.body || '').substring(0, 150) + '...',
      seo: {
        title: row.seo_title || row.title,
        description: row.seo_description || null,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return c.json<ApiResponse<{ pages: Page[] }>>({
      success: true,
      data: { pages },
    });
  } catch (error) {
    console.error('Get pages error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to fetch pages' }, 500);
  }
});

// GET /api/pages/:handle - Get page by handle
menus.get('/pages/:handle', async (c) => {
  try {
    const handle = c.req.param('handle');

    const pageRow = await c.env.DB.prepare('SELECT * FROM pages WHERE handle = ?')
      .bind(handle)
      .first<PageRow>();

    if (!pageRow) {
      return c.json<ApiResponse>({ success: false, error: 'Page not found' }, 404);
    }

    const page: Page = {
      id: pageRow.id,
      title: pageRow.title,
      handle: pageRow.handle,
      body: pageRow.body_html || pageRow.body || '',
      bodySummary: (pageRow.body || '').substring(0, 150) + '...',
      seo: {
        title: pageRow.seo_title || pageRow.title,
        description: pageRow.seo_description || null,
      },
      createdAt: pageRow.created_at,
      updatedAt: pageRow.updated_at,
    };

    return c.json<ApiResponse<{ page: Page }>>({
      success: true,
      data: { page },
    });
  } catch (error) {
    console.error('Get page error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to fetch page' }, 500);
  }
});

export default menus;
