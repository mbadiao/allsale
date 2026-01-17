-- AllSale Seed Data
-- Run with: npx wrangler d1 execute allsale --local --file=src/db/seed.sql

-- =====================
-- MENUS
-- =====================

INSERT OR REPLACE INTO menus (id, handle, items) VALUES
('menu-1', 'next-js-frontend-header-menu', '[
  {"title": "Tous les produits", "path": "/search"},
  {"title": "Électronique", "path": "/search/electronique"},
  {"title": "Mode", "path": "/search/mode"},
  {"title": "Maison", "path": "/search/maison"}
]'),
('menu-2', 'next-js-frontend-footer-menu', '[
  {"title": "Accueil", "path": "/"},
  {"title": "À propos", "path": "/about"},
  {"title": "Contact", "path": "/contact"},
  {"title": "Conditions générales", "path": "/terms"},
  {"title": "Politique de confidentialité", "path": "/privacy"}
]');

-- =====================
-- PAGES
-- =====================

INSERT OR REPLACE INTO pages (id, handle, title, body, body_html, seo_title, seo_description) VALUES
('page-1', 'about', 'À propos',
  'AllSale est votre destination e-commerce de confiance au Sénégal. Nous proposons une large gamme de produits de qualité avec livraison rapide et paiement sécurisé via Wave, Orange Money et Free Money.',
  '<p>AllSale est votre destination e-commerce de confiance au Sénégal.</p><p>Nous proposons une large gamme de produits de qualité avec livraison rapide et paiement sécurisé via Wave, Orange Money et Free Money.</p>',
  'À propos - AllSale', 'Découvrez AllSale, votre boutique en ligne au Sénégal'),
('page-2', 'contact', 'Contact',
  'Contactez-nous par email: contact@allsale.sn ou par téléphone: +221 77 000 00 00',
  '<p>Contactez-nous:</p><ul><li>Email: contact@allsale.sn</li><li>Téléphone: +221 77 000 00 00</li></ul>',
  'Contact - AllSale', 'Contactez AllSale'),
('page-3', 'terms', 'Conditions générales',
  'Conditions générales de vente AllSale.',
  '<h2>Conditions générales de vente</h2><p>En utilisant notre site, vous acceptez nos conditions.</p>',
  'CGV - AllSale', 'Conditions générales de vente AllSale'),
('page-4', 'privacy', 'Politique de confidentialité',
  'Nous respectons votre vie privée.',
  '<h2>Politique de confidentialité</h2><p>Nous respectons votre vie privée et protégeons vos données.</p>',
  'Confidentialité - AllSale', 'Politique de confidentialité AllSale');

-- =====================
-- COLLECTIONS
-- =====================

INSERT OR REPLACE INTO collections (id, handle, title, description, seo_title, seo_description) VALUES
('col-1', 'electronique', 'Électronique', 'Smartphones, ordinateurs, accessoires et plus', 'Électronique - AllSale', 'Achetez des produits électroniques au Sénégal'),
('col-2', 'mode', 'Mode', 'Vêtements, chaussures et accessoires', 'Mode - AllSale', 'Mode et vêtements au Sénégal'),
('col-3', 'maison', 'Maison', 'Décoration, électroménager et mobilier', 'Maison - AllSale', 'Produits pour la maison au Sénégal'),
('col-4', 'hidden-homepage-featured-items', 'Featured Items', 'Produits mis en avant sur la page d''accueil', NULL, NULL),
('col-5', 'hidden-homepage-carousel', 'Carousel Items', 'Produits du carousel', NULL, NULL);

-- =====================
-- PRODUCTS
-- =====================

-- Product 1: Smartphone
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-1', 'smartphone-galaxy-a54', 'Samsung Galaxy A54',
  'Smartphone Samsung Galaxy A54 5G avec écran Super AMOLED 6.4", 128GB stockage, 8GB RAM.',
  '<p>Smartphone Samsung Galaxy A54 5G avec écran Super AMOLED 6.4", 128GB stockage, 8GB RAM.</p><ul><li>Écran Super AMOLED 6.4"</li><li>Processeur Exynos 1380</li><li>Caméra triple 50MP</li></ul>',
  'Samsung', 'Smartphone', '["electronique", "smartphone", "samsung"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-1-1', 'prod-1', 'Noir / 128GB', 'GA54-BLK-128', '285000', 'XOF', '320000', 1, 15, '[{"name": "Couleur", "value": "Noir"}, {"name": "Stockage", "value": "128GB"}]'),
('var-1-2', 'prod-1', 'Blanc / 128GB', 'GA54-WHT-128', '285000', 'XOF', '320000', 1, 10, '[{"name": "Couleur", "value": "Blanc"}, {"name": "Stockage", "value": "128GB"}]'),
('var-1-3', 'prod-1', 'Noir / 256GB', 'GA54-BLK-256', '335000', 'XOF', '370000', 1, 8, '[{"name": "Couleur", "value": "Noir"}, {"name": "Stockage", "value": "256GB"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-1-1', 'prod-1', 'Couleur', 0, '["Noir", "Blanc"]'),
('opt-1-2', 'prod-1', 'Stockage', 1, '["128GB", "256GB"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-1-1', 'prod-1', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'Samsung Galaxy A54 Noir', 800, 800, 0);

-- Product 2: Laptop
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-2', 'laptop-hp-pavilion-15', 'HP Pavilion 15',
  'Ordinateur portable HP Pavilion 15 avec processeur Intel Core i5, 8GB RAM, 512GB SSD.',
  '<p>Ordinateur portable HP Pavilion 15</p><ul><li>Intel Core i5-1235U</li><li>8GB DDR4 RAM</li><li>512GB NVMe SSD</li><li>Écran 15.6" Full HD</li></ul>',
  'HP', 'Laptop', '["electronique", "ordinateur", "hp"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-2-1', 'prod-2', 'Argent', 'HP-PAV15-SLV', '450000', 'XOF', '520000', 1, 5, '[{"name": "Couleur", "value": "Argent"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-2-1', 'prod-2', 'Couleur', 0, '["Argent"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-2-1', 'prod-2', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'HP Pavilion 15', 800, 800, 0);

-- Product 3: Écouteurs
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-3', 'ecouteurs-airpods-pro', 'Apple AirPods Pro 2',
  'Écouteurs sans fil Apple AirPods Pro 2ème génération avec réduction de bruit active.',
  '<p>AirPods Pro 2ème génération</p><ul><li>Réduction de bruit active</li><li>Audio spatial personnalisé</li><li>Autonomie 6h (30h avec boîtier)</li></ul>',
  'Apple', 'Écouteurs', '["electronique", "audio", "apple"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-3-1', 'prod-3', 'Blanc', 'APP2-WHT', '175000', 'XOF', '195000', 1, 20, '[{"name": "Couleur", "value": "Blanc"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-3-1', 'prod-3', 'Couleur', 0, '["Blanc"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-3-1', 'prod-3', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800', 'AirPods Pro 2', 800, 800, 0);

-- Product 4: T-shirt
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-4', 'tshirt-coton-premium', 'T-Shirt Coton Premium',
  'T-shirt en coton premium 100% bio, coupe moderne et confortable.',
  '<p>T-shirt premium en coton biologique</p><ul><li>100% coton bio</li><li>Coupe moderne</li><li>Lavable en machine</li></ul>',
  'AllSale Fashion', 'Vêtements', '["mode", "vetements", "tshirt"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-4-1', 'prod-4', 'Noir / S', 'TSH-BLK-S', '12000', 'XOF', NULL, 1, 50, '[{"name": "Couleur", "value": "Noir"}, {"name": "Taille", "value": "S"}]'),
('var-4-2', 'prod-4', 'Noir / M', 'TSH-BLK-M', '12000', 'XOF', NULL, 1, 45, '[{"name": "Couleur", "value": "Noir"}, {"name": "Taille", "value": "M"}]'),
('var-4-3', 'prod-4', 'Noir / L', 'TSH-BLK-L', '12000', 'XOF', NULL, 1, 40, '[{"name": "Couleur", "value": "Noir"}, {"name": "Taille", "value": "L"}]'),
('var-4-4', 'prod-4', 'Blanc / M', 'TSH-WHT-M', '12000', 'XOF', NULL, 1, 35, '[{"name": "Couleur", "value": "Blanc"}, {"name": "Taille", "value": "M"}]'),
('var-4-5', 'prod-4', 'Blanc / L', 'TSH-WHT-L', '12000', 'XOF', NULL, 1, 30, '[{"name": "Couleur", "value": "Blanc"}, {"name": "Taille", "value": "L"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-4-1', 'prod-4', 'Couleur', 0, '["Noir", "Blanc"]'),
('opt-4-2', 'prod-4', 'Taille', 1, '["S", "M", "L", "XL"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-4-1', 'prod-4', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'T-Shirt Noir', 800, 800, 0);

-- Product 5: Sneakers
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-5', 'sneakers-sport-runner', 'Sneakers Sport Runner',
  'Chaussures de sport légères et confortables, parfaites pour le running et le quotidien.',
  '<p>Sneakers Sport Runner</p><ul><li>Semelle amortissante</li><li>Mesh respirant</li><li>Légères et confortables</li></ul>',
  'AllSale Sport', 'Chaussures', '["mode", "chaussures", "sport"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-5-1', 'prod-5', 'Noir / 42', 'SNK-BLK-42', '35000', 'XOF', '42000', 1, 12, '[{"name": "Couleur", "value": "Noir"}, {"name": "Pointure", "value": "42"}]'),
('var-5-2', 'prod-5', 'Noir / 43', 'SNK-BLK-43', '35000', 'XOF', '42000', 1, 10, '[{"name": "Couleur", "value": "Noir"}, {"name": "Pointure", "value": "43"}]'),
('var-5-3', 'prod-5', 'Blanc / 42', 'SNK-WHT-42', '35000', 'XOF', '42000', 1, 8, '[{"name": "Couleur", "value": "Blanc"}, {"name": "Pointure", "value": "42"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-5-1', 'prod-5', 'Couleur', 0, '["Noir", "Blanc"]'),
('opt-5-2', 'prod-5', 'Pointure', 1, '["40", "41", "42", "43", "44", "45"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-5-1', 'prod-5', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'Sneakers Sport', 800, 800, 0);

-- Product 6: Lampe
INSERT OR REPLACE INTO products (id, handle, title, description, description_html, vendor, product_type, tags, available_for_sale) VALUES
('prod-6', 'lampe-bureau-led', 'Lampe de Bureau LED',
  'Lampe de bureau LED moderne avec réglage d''intensité et température de couleur.',
  '<p>Lampe de bureau LED</p><ul><li>3 températures de couleur</li><li>Intensité réglable</li><li>Port USB intégré</li></ul>',
  'AllSale Home', 'Éclairage', '["maison", "bureau", "eclairage"]', 1);

INSERT OR REPLACE INTO product_variants (id, product_id, title, sku, price_amount, price_currency, compare_at_price, available_for_sale, quantity_available, selected_options) VALUES
('var-6-1', 'prod-6', 'Noir', 'LAMP-BLK', '18000', 'XOF', '22000', 1, 25, '[{"name": "Couleur", "value": "Noir"}]'),
('var-6-2', 'prod-6', 'Blanc', 'LAMP-WHT', '18000', 'XOF', '22000', 1, 20, '[{"name": "Couleur", "value": "Blanc"}]');

INSERT OR REPLACE INTO product_options (id, product_id, name, position, option_values) VALUES
('opt-6-1', 'prod-6', 'Couleur', 0, '["Noir", "Blanc"]');

INSERT OR REPLACE INTO product_images (id, product_id, url, alt_text, width, height, position) VALUES
('img-6-1', 'prod-6', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', 'Lampe Bureau LED', 800, 800, 0);

-- =====================
-- PRODUCT-COLLECTION ASSOCIATIONS
-- =====================

INSERT OR REPLACE INTO product_collections (product_id, collection_id, position) VALUES
-- Électronique
('prod-1', 'col-1', 0),
('prod-2', 'col-1', 1),
('prod-3', 'col-1', 2),
-- Mode
('prod-4', 'col-2', 0),
('prod-5', 'col-2', 1),
-- Maison
('prod-6', 'col-3', 0),
-- Homepage Featured (3 items for ThreeItemGrid)
('prod-1', 'col-4', 0),
('prod-2', 'col-4', 1),
('prod-4', 'col-4', 2),
-- Homepage Carousel
('prod-1', 'col-5', 0),
('prod-2', 'col-5', 1),
('prod-3', 'col-5', 2),
('prod-4', 'col-5', 3),
('prod-5', 'col-5', 4),
('prod-6', 'col-5', 5);
