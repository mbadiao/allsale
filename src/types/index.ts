// Environment bindings for Cloudflare Workers
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  PAYDUNYA_MASTER_KEY: string;
  PAYDUNYA_PRIVATE_KEY: string;
  PAYDUNYA_PUBLIC_KEY: string;
  PAYDUNYA_TOKEN: string;
  PAYDUNYA_MODE: 'test' | 'live';
  FRONTEND_URL: string;
  R2_PUBLIC_URL: string;
  ADMIN_API_KEY?: string;
}

// =====================
// PRODUCT TYPES
// =====================

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  variants: ProductVariant[];
  options: ProductOption[];
  images: Image[];
  featuredImage: Image | null;
  seo: SEO;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  quantityAvailable: number;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: SelectedOption[];
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface Image {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface SEO {
  title: string | null;
  description: string | null;
}

// DB row types (raw from D1)
export interface ProductRow {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  description_html: string | null;
  vendor: string | null;
  product_type: string | null;
  tags: string | null;
  available_for_sale: number;
  created_at: string;
  updated_at: string;
}

export interface VariantRow {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  price_amount: string;
  price_currency: string;
  compare_at_price: string | null;
  available_for_sale: number;
  quantity_available: number;
  selected_options: string | null;
  created_at: string;
}

export interface OptionRow {
  id: string;
  product_id: string;
  name: string;
  position: number;
  option_values: string;
}

export interface ImageRow {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

// =====================
// COLLECTION TYPES
// =====================

export interface Collection {
  handle: string;
  title: string;
  description: string | null;
  image: Image | null;
  seo: SEO;
  path: string;
  updatedAt: string;
}

export interface CollectionRow {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

// =====================
// CART TYPES
// =====================

export interface Cart {
  id: string;
  lines: CartItem[];
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
  };
  checkoutUrl: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    selectedOptions: SelectedOption[];
    product: {
      id: string;
      handle: string;
      title: string;
      featuredImage: Image | null;
    };
  };
}

export interface CartRow {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
}

// =====================
// MENU TYPES
// =====================

export interface Menu {
  title: string;
  path: string;
}

export interface MenuRow {
  id: string;
  handle: string;
  items: string;
}

// =====================
// PAGE TYPES
// =====================

export interface Page {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  seo: SEO;
  createdAt: string;
  updatedAt: string;
}

export interface PageRow {
  id: string;
  handle: string;
  title: string;
  body: string | null;
  body_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

// =====================
// ORDER TYPES (existing)
// =====================

export interface Order {
  id: string;
  cart_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  subtotal_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency_code: string;
  line_items: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  paydunya_token: string | null;
  paydunya_invoice_url: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'card';

// =====================
// API TYPES
// =====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Admin request types
export interface CreateProductRequest {
  handle: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  variants: Array<{
    title: string;
    sku?: string;
    priceAmount: string;
    priceCurrency?: string;
    compareAtPrice?: string;
    quantityAvailable?: number;
    selectedOptions?: SelectedOption[];
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  images?: Array<{
    url: string;
    altText?: string;
    width?: number;
    height?: number;
  }>;
  collectionIds?: string[];
}

export interface CreateCollectionRequest {
  handle: string;
  title: string;
  description?: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

// PayDunya types
export interface PayDunyaInvoiceResponse {
  response_code: string;
  response_text: string;
  description?: string;
  token?: string;
  invoice_url?: string;
}

export interface PayDunyaStatusResponse {
  response_code: string;
  response_text: string;
  invoice?: {
    token: string;
    status: string;
    total_amount: number;
  };
  custom_data?: {
    order_id: string;
  };
}

export interface PayDunyaWebhookPayload {
  response_code: string;
  response_text: string;
  hash: string;
  invoice: {
    token: string;
    status: string;
    total_amount: number;
  };
  custom_data: {
    order_id: string;
  };
  customer?: {
    name: string;
    phone: string;
    email: string;
  };
  receipt_url?: string;
}
