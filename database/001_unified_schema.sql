-- Omran Trading Company ? Unified SQL Schema v1
-- Scope: schema only. No data migration, authentication, OTP, RLS or runtime wiring.
-- Dialect: PostgreSQL 14+ (compatible with managed PostgreSQL/Supabase later).

BEGIN;

CREATE TABLE categories (
  category_id text PRIMARY KEY,
  name_ar text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_category_id text REFERENCES categories(category_id) ON DELETE SET NULL,
  sort_order integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  product_id text PRIMARY KEY,
  sku text UNIQUE,
  barcode text UNIQUE,
  name text NOT NULL,
  category_id text REFERENCES categories(category_id) ON DELETE SET NULL,
  category_legacy text,
  description text NOT NULL DEFAULT '',
  brand text,
  age_group text,
  tags text[] NOT NULL DEFAULT '{}',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  price numeric(12,2),
  availability text,
  image_url text,
  image_source text,
  source_drive_id text,
  processed_image text,
  product_prompt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT false,
  workflow_status text,
  qa_status text,
  review_reason text,
  sort_order integer,
  legacy_row_index integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_price_nonnegative CHECK (price IS NULL OR price >= 0),
  CONSTRAINT products_workflow_status_check CHECK (
    workflow_status IS NULL OR workflow_status IN ('REVIEW','PUBLISHED','REJECTED','DRAFT','ERROR')
  ),
  CONSTRAINT products_qa_status_check CHECK (
    qa_status IS NULL OR qa_status IN ('PASS','NEEDS_REVIEW','FAIL')
  )
);

COMMENT ON TABLE products IS
  'Canonical product master. Public eligibility remains active=true AND workflow_status=PUBLISHED AND qa_status=PASS.';

CREATE VIEW public_products AS
SELECT *
FROM products
WHERE active = true
  AND workflow_status = 'PUBLISHED'
  AND qa_status = 'PASS';

CREATE TABLE product_media (
  media_id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'IMAGE',
  source_url text,
  processed_url text,
  drive_file_id text,
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_media_type_check CHECK (media_type IN ('IMAGE','VIDEO'))
);

CREATE UNIQUE INDEX product_media_one_primary_image
  ON product_media(product_id)
  WHERE is_primary = true AND media_type = 'IMAGE';

CREATE TABLE product_intake (
  intake_id text PRIMARY KEY,
  proposed_product_id text REFERENCES products(product_id) ON DELETE SET NULL,
  employee_id text,
  source_channel text NOT NULL,
  source_reference text,
  proposed_name text,
  proposed_sku text,
  proposed_barcode text,
  proposed_category text,
  proposed_price numeric(12,2),
  image_source text,
  price_verified boolean NOT NULL DEFAULT false,
  image_verified boolean NOT NULL DEFAULT false,
  identity_verified boolean NOT NULL DEFAULT false,
  duplicate_status text NOT NULL DEFAULT 'CLEAR',
  content_status text NOT NULL DEFAULT 'RAW',
  qa_status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_intake_price_nonnegative CHECK (proposed_price IS NULL OR proposed_price >= 0),
  CONSTRAINT product_intake_duplicate_check CHECK (duplicate_status IN ('CLEAR','POSSIBLE_DUPLICATE','DUPLICATE')),
  CONSTRAINT product_intake_content_check CHECK (content_status IN ('RAW','DRAFTED','READY_FOR_QA')),
  CONSTRAINT product_intake_qa_check CHECK (qa_status IN ('PASS','NEEDS_REVIEW','FAIL'))
);

CREATE TABLE qa_reviews (
  qa_review_id text PRIMARY KEY,
  product_id text REFERENCES products(product_id) ON DELETE CASCADE,
  intake_id text REFERENCES product_intake(intake_id) ON DELETE CASCADE,
  reviewer_employee_id text,
  status text NOT NULL,
  reason text,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qa_reviews_target_check CHECK (product_id IS NOT NULL OR intake_id IS NOT NULL),
  CONSTRAINT qa_reviews_status_check CHECK (status IN ('PASS','NEEDS_REVIEW','FAIL'))
);

CREATE TABLE approvals (
  approval_id text PRIMARY KEY,
  product_id text REFERENCES products(product_id) ON DELETE CASCADE,
  intake_id text REFERENCES product_intake(intake_id) ON DELETE CASCADE,
  approver_employee_id text,
  status text NOT NULL,
  notes text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approvals_target_check CHECK (product_id IS NOT NULL OR intake_id IS NOT NULL),
  CONSTRAINT approvals_status_check CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);

CREATE TABLE inventory (
  product_id text PRIMARY KEY REFERENCES products(product_id) ON DELETE CASCADE,
  sku text,
  on_hand_qty integer,
  reserved_qty integer NOT NULL DEFAULT 0,
  low_stock_threshold integer,
  reorder_qty integer,
  inventory_status text NOT NULL DEFAULT 'UNKNOWN',
  last_counted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_on_hand_nonnegative CHECK (on_hand_qty IS NULL OR on_hand_qty >= 0),
  CONSTRAINT inventory_reserved_nonnegative CHECK (reserved_qty >= 0),
  CONSTRAINT inventory_threshold_nonnegative CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
  CONSTRAINT inventory_reorder_nonnegative CHECK (reorder_qty IS NULL OR reorder_qty >= 0),
  CONSTRAINT inventory_reserved_not_above_stock CHECK (on_hand_qty IS NULL OR reserved_qty <= on_hand_qty),
  CONSTRAINT inventory_status_check CHECK (inventory_status IN ('UNKNOWN','IN_STOCK','LOW_STOCK','OUT_OF_STOCK','DISCONTINUED'))
);

CREATE TABLE stock_movements (
  movement_id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  movement_type text NOT NULL,
  quantity_delta integer NOT NULL,
  quantity_after integer,
  reference_type text,
  reference_id text,
  actor_employee_id text,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_nonzero CHECK (quantity_delta <> 0),
  CONSTRAINT stock_movements_after_nonnegative CHECK (quantity_after IS NULL OR quantity_after >= 0),
  CONSTRAINT stock_movements_type_check CHECK (
    movement_type IN ('OPENING_BALANCE','PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','RESERVATION','RELEASE','DAMAGE')
  )
);

CREATE TABLE price_history (
  price_history_id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  price_type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'EGP',
  source_reference text,
  changed_by_employee_id text,
  effective_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_history_amount_nonnegative CHECK (amount >= 0),
  CONSTRAINT price_history_currency_egp CHECK (currency = 'EGP'),
  CONSTRAINT price_history_type_check CHECK (price_type IN ('RETAIL','WHOLESALE','PURCHASE_COST'))
);

CREATE TABLE suppliers (
  supplier_id text PRIMARY KEY,
  name text NOT NULL,
  mobile text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  purchase_order_id text PRIMARY KEY,
  supplier_id text REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  ordered_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_status_check CHECK (status IN ('DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED'))
);

CREATE TABLE purchase_order_lines (
  purchase_order_line_id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  ordered_qty integer NOT NULL,
  received_qty integer NOT NULL DEFAULT 0,
  unit_cost numeric(12,2),
  CONSTRAINT purchase_order_lines_ordered_positive CHECK (ordered_qty > 0),
  CONSTRAINT purchase_order_lines_received_nonnegative CHECK (received_qty >= 0),
  CONSTRAINT purchase_order_lines_received_lte_ordered CHECK (received_qty <= ordered_qty),
  CONSTRAINT purchase_order_lines_cost_nonnegative CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

CREATE TABLE employees (
  employee_id text PRIMARY KEY,
  full_name text NOT NULL,
  mobile text,
  access_email text UNIQUE,
  role text NOT NULL DEFAULT 'VIEWER',
  status text NOT NULL DEFAULT 'INVITED',
  mobile_verified_at timestamptz,
  invited_by_employee_id text REFERENCES employees(employee_id) ON DELETE SET NULL,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_role_check CHECK (role IN ('OWNER','ADMIN','CATALOG_MANAGER','INVENTORY_STAFF','CONTENT_EDITOR','VIEWER')),
  CONSTRAINT employees_status_check CHECK (status IN ('INVITED','ACTIVE','SUSPENDED','DISABLED'))
);

CREATE UNIQUE INDEX employees_mobile_unique
  ON employees(mobile)
  WHERE mobile IS NOT NULL;

ALTER TABLE product_intake ADD CONSTRAINT product_intake_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE qa_reviews ADD CONSTRAINT qa_reviews_reviewer_fk FOREIGN KEY (reviewer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE approvals ADD CONSTRAINT approvals_approver_fk FOREIGN KEY (approver_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_actor_fk FOREIGN KEY (actor_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE price_history ADD CONSTRAINT price_history_actor_fk FOREIGN KEY (changed_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

CREATE TABLE customers (
  customer_id text PRIMARY KEY,
  mobile text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING_PROFILE',
  mobile_verified_at timestamptz,
  full_name text,
  email text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_status_check CHECK (status IN ('PENDING_PROFILE','ACTIVE','SUSPENDED'))
);

CREATE TABLE customer_addresses (
  address_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  label text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  district text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customer_one_default_address ON customer_addresses(customer_id) WHERE is_default = true;

CREATE TABLE customer_preferences (
  customer_id text PRIMARY KEY REFERENCES customers(customer_id) ON DELETE CASCADE,
  marketing_whatsapp boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'ar',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_preferences_language_check CHECK (language = 'ar')
);

CREATE TABLE analytics_events (
  event_id text PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  event_name text NOT NULL,
  session_id text,
  customer_id text REFERENCES customers(customer_id) ON DELETE SET NULL,
  product_id text REFERENCES products(product_id) ON DELETE SET NULL,
  category_id text REFERENCES categories(category_id) ON DELETE SET NULL,
  page_location text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  audit_id text PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  actor_employee_id text REFERENCES employees(employee_id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_domain text NOT NULL DEFAULT 'EMPLOYEE',
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  target_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_actor_domain_check CHECK (actor_domain = 'EMPLOYEE')
);

CREATE TABLE settings (
  setting_key text PRIMARY KEY,
  value_json jsonb NOT NULL,
  description text,
  updated_by_employee_id text REFERENCES employees(employee_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_publication_idx ON products(active, workflow_status, qa_status);
CREATE INDEX products_updated_at_idx ON products(updated_at DESC);
CREATE INDEX product_intake_qa_idx ON product_intake(qa_status, created_at DESC);
CREATE INDEX stock_movements_product_time_idx ON stock_movements(product_id, occurred_at DESC);
CREATE INDEX price_history_product_time_idx ON price_history(product_id, effective_at DESC);
CREATE INDEX employees_status_role_idx ON employees(status, role);
CREATE INDEX customers_status_idx ON customers(status);
CREATE INDEX analytics_events_name_time_idx ON analytics_events(event_name, occurred_at DESC);
CREATE INDEX analytics_events_product_time_idx ON analytics_events(product_id, occurred_at DESC);
CREATE INDEX audit_log_actor_time_idx ON audit_log(actor_employee_id, occurred_at DESC);
CREATE INDEX audit_log_target_time_idx ON audit_log(target_type, target_id, occurred_at DESC);

COMMIT;
