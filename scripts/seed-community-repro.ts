/**
 * Community Repro: E-Commerce Integration
 *
 * A universally understandable demo workspace showing how Interface Manager
 * maps fields across three systems in a typical e-commerce setup:
 *
 *   Shopify (storefront) ↔ Stripe (payments) ↔ Warehouse API (fulfilment)
 *
 * Demonstrates:
 *   - Canonical model with 2 entities (Customer, Order)
 *   - 3 systems with multiple entities each
 *   - RENAME + VALUE_MAP transformation rules
 *   - Enum fields with value maps
 *   - Composite field (fullName → firstName + lastName via COMPOSE)
 *   - 2 interfaces (Shopify→Stripe, Shopify→Warehouse)
 *   - Propagation chain (order status flow within Warehouse)
 *   - Example values and enum definitions
 *
 * Run against a running instance:
 *   npx -w backend tsx scripts/seed-community-repro.ts
 *
 * Expects the backend at http://localhost:3099 (Docker) or http://localhost:3000 (dev).
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';

// ── API helpers ──────────────────────────────────────────

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

const post = <T = any>(path: string, body: unknown) => api<T>('POST', path, body);
const put = <T = any>(path: string, body: unknown) => api<T>('PUT', path, body);

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════

async function main() {
  console.log('🛒 Seeding Community Repro: E-Commerce Integration\n');

  // ── Workspace ──────────────────────────────────────────

  const workspace = await post<{ id: string }>('/workspaces', {
    name: 'E-Commerce Integration',
    slug: 'ecommerce-demo',
    settings: {
      description: 'Demo workspace: Shopify ↔ Stripe ↔ Warehouse fulfilment integration',
    },
  });
  const WS = workspace.id;
  const ws = (p: string) => `/workspaces/${WS}${p}`;
  console.log(`Created workspace: E-Commerce Integration (${WS})`);

  // ── Canonical Entities ──────────────────────────────────

  const customerEntity = await post<{ id: string }>(ws('/canonical-entities'), {
    name: 'Customer',
    slug: 'customer',
    description: 'A person or organisation that purchases goods',
  });

  const orderEntity = await post<{ id: string }>(ws('/canonical-entities'), {
    name: 'Order',
    slug: 'order',
    description: 'A purchase transaction containing one or more line items',
  });

  console.log('Created canonical entities: Customer, Order');

  // ── Canonical Fields — Customer ─────────────────────────

  type CF = { id: string };

  const cfCustomerId = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'customerId',
    displayName: 'Customer ID',
    description: 'Unique identifier for the customer across all systems',
    dataType: 'STRING',
    nullable: false,
    tags: ['identity'],
  });

  const cfEmail = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'email',
    displayName: 'Email',
    description: 'Primary email address',
    dataType: 'STRING',
    format: 'email',
    nullable: false,
    tags: ['contact'],
  });

  const cfFirstName = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'firstName',
    displayName: 'First Name',
    description: 'Given name',
    dataType: 'STRING',
    tags: ['name'],
  });

  const cfLastName = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'lastName',
    displayName: 'Last Name',
    description: 'Family name',
    dataType: 'STRING',
    tags: ['name'],
  });

  // Composite field: fullName = firstName + lastName
  const cfFullName = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'fullName',
    displayName: 'Full Name',
    description: 'Combined first and last name (composite)',
    dataType: 'STRING',
    isComposite: true,
    compositionPattern: '{firstName} {lastName}',
    tags: ['name'],
  });

  // Create subfields for fullName
  await post(ws(`/canonical-fields/${cfFullName.id}/subfields`), {
    name: 'firstName',
    dataType: 'STRING',
    position: 0,
  });
  await post(ws(`/canonical-fields/${cfFullName.id}/subfields`), {
    name: 'lastName',
    dataType: 'STRING',
    position: 1,
  });

  const cfPhone = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'phone',
    displayName: 'Phone',
    description: 'Primary phone number',
    dataType: 'STRING',
    format: 'phone',
    tags: ['contact'],
  });

  const cfStreet = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'streetAddress',
    displayName: 'Street Address',
    description: 'Street address line 1',
    dataType: 'STRING',
    tags: ['address'],
  });

  const cfCity = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'city',
    displayName: 'City',
    description: 'City name',
    dataType: 'STRING',
    tags: ['address'],
  });

  const cfPostalCode = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'postalCode',
    displayName: 'Postal Code',
    description: 'ZIP or postal code',
    dataType: 'STRING',
    tags: ['address'],
  });

  const cfCountry = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'country',
    displayName: 'Country',
    description: 'ISO 3166-1 alpha-2 country code',
    dataType: 'STRING',
    maxValue: '2',
    tags: ['address'],
  });

  const cfCustomerType = await post<CF>(ws('/canonical-fields'), {
    entityId: customerEntity.id,
    name: 'customerType',
    displayName: 'Customer Type',
    description: 'Classification of the customer',
    dataType: 'ENUM',
    nullable: false,
    tags: ['classification'],
  });

  console.log('Created canonical fields: Customer (11 fields incl. composite)');

  // ── Canonical Fields — Order ────────────────────────────

  const cfOrderId = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'orderId',
    displayName: 'Order ID',
    description: 'Unique order identifier',
    dataType: 'STRING',
    nullable: false,
    tags: ['identity'],
  });

  const cfOrderDate = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'orderDate',
    displayName: 'Order Date',
    description: 'Timestamp when the order was placed',
    dataType: 'DATETIME',
    nullable: false,
    tags: ['timing'],
  });

  const cfOrderStatus = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'orderStatus',
    displayName: 'Order Status',
    description: 'Current status of the order',
    dataType: 'ENUM',
    nullable: false,
    tags: ['status'],
  });

  const cfTotalAmount = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'totalAmount',
    displayName: 'Total Amount',
    description: 'Total order amount in the smallest currency unit (cents)',
    dataType: 'INTEGER',
    nullable: false,
    tags: ['financial'],
  });

  const cfCurrency = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'currency',
    displayName: 'Currency',
    description: 'ISO 4217 currency code',
    dataType: 'STRING',
    maxValue: '3',
    nullable: false,
    tags: ['financial'],
  });

  const cfShippingMethod = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'shippingMethod',
    displayName: 'Shipping Method',
    description: 'Selected shipping method',
    dataType: 'ENUM',
    tags: ['fulfilment'],
  });

  const cfTrackingNumber = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'trackingNumber',
    displayName: 'Tracking Number',
    description: 'Shipment tracking number',
    dataType: 'STRING',
    tags: ['fulfilment'],
  });

  const cfOrderCustomerId = await post<CF>(ws('/canonical-fields'), {
    entityId: orderEntity.id,
    name: 'orderCustomerId',
    displayName: 'Customer Reference',
    description: 'Reference to the customer who placed the order',
    dataType: 'STRING',
    nullable: false,
    tags: ['identity'],
  });

  console.log('Created canonical fields: Order (8 fields)');

  // ── Enum Values ─────────────────────────────────────────

  // customerType
  for (const [i, { code, label }] of ([
    { code: 'INDIVIDUAL', label: 'Individual' },
    { code: 'BUSINESS', label: 'Business' },
    { code: 'VIP', label: 'VIP Customer' },
    { code: 'WHOLESALE', label: 'Wholesale' },
  ] as const).entries()) {
    await post(ws(`/canonical-fields/${cfCustomerType.id}/enum-values`), {
      code, label, position: i,
    });
  }

  // orderStatus
  for (const [i, { code, label }] of ([
    { code: 'PENDING', label: 'Pending' },
    { code: 'CONFIRMED', label: 'Confirmed' },
    { code: 'PROCESSING', label: 'Processing' },
    { code: 'SHIPPED', label: 'Shipped' },
    { code: 'DELIVERED', label: 'Delivered' },
    { code: 'CANCELLED', label: 'Cancelled' },
    { code: 'REFUNDED', label: 'Refunded' },
  ] as const).entries()) {
    await post(ws(`/canonical-fields/${cfOrderStatus.id}/enum-values`), {
      code, label, position: i,
    });
  }

  // shippingMethod
  for (const [i, { code, label }] of ([
    { code: 'STANDARD', label: 'Standard (5-7 days)' },
    { code: 'EXPRESS', label: 'Express (2-3 days)' },
    { code: 'OVERNIGHT', label: 'Overnight' },
    { code: 'PICKUP', label: 'In-Store Pickup' },
  ] as const).entries()) {
    await post(ws(`/canonical-fields/${cfShippingMethod.id}/enum-values`), {
      code, label, position: i,
    });
  }

  console.log('Created enum values for customerType, orderStatus, shippingMethod');

  // ── Example Values ──────────────────────────────────────

  const examples = [
    { fieldId: cfCustomerId.id, value: 'cust_4f8a2b1c' },
    { fieldId: cfEmail.id, value: 'jane.doe@example.com' },
    { fieldId: cfFirstName.id, value: 'Jane' },
    { fieldId: cfLastName.id, value: 'Doe' },
    { fieldId: cfPhone.id, value: '+1-555-0123' },
    { fieldId: cfStreet.id, value: '742 Evergreen Terrace' },
    { fieldId: cfCity.id, value: 'Springfield' },
    { fieldId: cfPostalCode.id, value: '62704' },
    { fieldId: cfCountry.id, value: 'US' },
    { fieldId: cfOrderId.id, value: 'ord_9x7k3m2p' },
    { fieldId: cfTotalAmount.id, value: '4999' },
    { fieldId: cfCurrency.id, value: 'USD' },
    { fieldId: cfTrackingNumber.id, value: '1Z999AA10123456784' },
  ];
  for (const ex of examples) {
    await post(ws(`/canonical-fields/${ex.fieldId}/examples`), { value: ex.value });
  }

  console.log('Created example values');

  // ── Systems ─────────────────────────────────────────────

  const shopify = await post<{ id: string }>(ws('/systems'), {
    name: 'Shopify',
    systemType: 'REST',
    description: 'Shopify storefront — source of customer and order data',
    baseUrl: 'https://mystore.myshopify.com/admin/api/2024-01',
    notes: 'GraphQL Admin API, webhooks for order events',
  });

  const stripe = await post<{ id: string }>(ws('/systems'), {
    name: 'Stripe',
    systemType: 'REST',
    description: 'Stripe payment processing platform',
    baseUrl: 'https://api.stripe.com/v1',
    notes: 'REST API, webhook events for payment lifecycle',
  });

  const warehouse = await post<{ id: string }>(ws('/systems'), {
    name: 'Warehouse API',
    systemType: 'REST',
    description: 'Internal warehouse management and fulfilment system',
    baseUrl: 'https://wms.internal.example.com/api/v2',
    notes: 'Internal REST API, async order processing via message queue',
  });

  console.log('Created systems: Shopify, Stripe, Warehouse API');

  // ── System Entities ─────────────────────────────────────

  const shopifyCustomer = await post<{ id: string }>(ws(`/systems/${shopify.id}/entities`), {
    name: 'Customer',
    slug: 'customer',
    description: 'Shopify Customer resource',
  });

  const shopifyOrder = await post<{ id: string }>(ws(`/systems/${shopify.id}/entities`), {
    name: 'Order',
    slug: 'order',
    description: 'Shopify Order resource',
  });

  const stripeCustomer = await post<{ id: string }>(ws(`/systems/${stripe.id}/entities`), {
    name: 'Customer',
    slug: 'customer',
    description: 'Stripe Customer object',
  });

  const stripePaymentIntent = await post<{ id: string }>(ws(`/systems/${stripe.id}/entities`), {
    name: 'PaymentIntent',
    slug: 'payment-intent',
    description: 'Stripe PaymentIntent representing a payment',
  });

  const whOrder = await post<{ id: string }>(ws(`/systems/${warehouse.id}/entities`), {
    name: 'FulfilmentOrder',
    slug: 'fulfilment-order',
    description: 'Warehouse fulfilment order',
  });

  const whShipment = await post<{ id: string }>(ws(`/systems/${warehouse.id}/entities`), {
    name: 'Shipment',
    slug: 'shipment',
    description: 'Warehouse shipment record with tracking',
  });

  console.log('Created system entities: 6 total across 3 systems');

  // ── System Entity Relationships ─────────────────────────

  await post(ws(`/systems/${shopify.id}/relationships`), {
    sourceEntityId: shopifyOrder.id,
    targetEntityId: shopifyCustomer.id,
    relationshipType: 'LOOKUP',
    description: 'Order references the customer who placed it',
  });

  await post(ws(`/systems/${warehouse.id}/relationships`), {
    sourceEntityId: whOrder.id,
    targetEntityId: whShipment.id,
    relationshipType: 'ONE_TO_MANY',
    description: 'A fulfilment order can produce multiple shipments',
  });

  console.log('Created entity relationships');

  // ── System Fields ───────────────────────────────────────

  // Helper to create a system field and return its ID
  async function sf(entityId: string, name: string, dataType: string, opts?: {
    path?: string; nullable?: boolean; required?: boolean;
  }): Promise<string> {
    const r = await post<{ id: string }>(ws('/system-fields'), {
      entityId, name, dataType,
      path: opts?.path,
      nullable: opts?.nullable,
      required: opts?.required,
    });
    return r.id;
  }

  // ── Shopify Customer fields
  const shCustId = await sf(shopifyCustomer.id, 'id', 'integer', { required: true });
  const shCustEmail = await sf(shopifyCustomer.id, 'email', 'string', { required: true });
  const shCustFirstName = await sf(shopifyCustomer.id, 'first_name', 'string');
  const shCustLastName = await sf(shopifyCustomer.id, 'last_name', 'string');
  const shCustPhone = await sf(shopifyCustomer.id, 'phone', 'string');
  const shCustAddr1 = await sf(shopifyCustomer.id, 'default_address.address1', 'string', { path: 'default_address.address1' });
  const shCustCity = await sf(shopifyCustomer.id, 'default_address.city', 'string', { path: 'default_address.city' });
  const shCustZip = await sf(shopifyCustomer.id, 'default_address.zip', 'string', { path: 'default_address.zip' });
  const shCustCountry = await sf(shopifyCustomer.id, 'default_address.country_code', 'string', { path: 'default_address.country_code' });
  const shCustTags = await sf(shopifyCustomer.id, 'tags', 'string');

  // ── Shopify Order fields
  const shOrdId = await sf(shopifyOrder.id, 'id', 'integer', { required: true });
  const shOrdCreatedAt = await sf(shopifyOrder.id, 'created_at', 'string', { required: true });
  const shOrdFinancialStatus = await sf(shopifyOrder.id, 'financial_status', 'string');
  const shOrdTotalPrice = await sf(shopifyOrder.id, 'total_price', 'string');
  const shOrdCurrency = await sf(shopifyOrder.id, 'currency', 'string');
  const shOrdCustId = await sf(shopifyOrder.id, 'customer.id', 'integer', { path: 'customer.id' });
  const shOrdShippingLines = await sf(shopifyOrder.id, 'shipping_lines[0].code', 'string', { path: 'shipping_lines[0].code' });

  // ── Stripe Customer fields
  const stCustId = await sf(stripeCustomer.id, 'id', 'string', { required: true });
  const stCustEmail = await sf(stripeCustomer.id, 'email', 'string');
  const stCustName = await sf(stripeCustomer.id, 'name', 'string');
  const stCustPhone = await sf(stripeCustomer.id, 'phone', 'string');
  const stCustAddr1 = await sf(stripeCustomer.id, 'address.line1', 'string', { path: 'address.line1' });
  const stCustAddrCity = await sf(stripeCustomer.id, 'address.city', 'string', { path: 'address.city' });
  const stCustAddrPostal = await sf(stripeCustomer.id, 'address.postal_code', 'string', { path: 'address.postal_code' });
  const stCustAddrCountry = await sf(stripeCustomer.id, 'address.country', 'string', { path: 'address.country' });

  // ── Stripe PaymentIntent fields
  const stPiId = await sf(stripePaymentIntent.id, 'id', 'string', { required: true });
  const stPiAmount = await sf(stripePaymentIntent.id, 'amount', 'integer', { required: true });
  const stPiCurrency = await sf(stripePaymentIntent.id, 'currency', 'string', { required: true });
  const stPiStatus = await sf(stripePaymentIntent.id, 'status', 'string');
  const stPiCustId = await sf(stripePaymentIntent.id, 'customer', 'string');
  const stPiCreated = await sf(stripePaymentIntent.id, 'created', 'integer');

  // ── Warehouse FulfilmentOrder fields
  const whOrdId = await sf(whOrder.id, 'order_ref', 'string', { required: true });
  const whOrdStatus = await sf(whOrder.id, 'status', 'string', { required: true });
  const whOrdReceivedAt = await sf(whOrder.id, 'received_at', 'string');
  const whOrdShipMethod = await sf(whOrder.id, 'shipping_method', 'string');
  const whOrdCustEmail = await sf(whOrder.id, 'customer_email', 'string');
  const whOrdCustName = await sf(whOrder.id, 'customer_name', 'string');
  const whOrdAddr1 = await sf(whOrder.id, 'ship_to.street', 'string', { path: 'ship_to.street' });
  const whOrdCity = await sf(whOrder.id, 'ship_to.city', 'string', { path: 'ship_to.city' });
  const whOrdPostal = await sf(whOrder.id, 'ship_to.postal_code', 'string', { path: 'ship_to.postal_code' });
  const whOrdCountry = await sf(whOrder.id, 'ship_to.country', 'string', { path: 'ship_to.country' });

  // ── Warehouse Shipment fields
  const whShipId = await sf(whShipment.id, 'shipment_id', 'string', { required: true });
  const whShipOrderRef = await sf(whShipment.id, 'order_ref', 'string');
  const whShipTrackingNum = await sf(whShipment.id, 'tracking_number', 'string');
  const whShipStatus = await sf(whShipment.id, 'status', 'string');
  const whShipCarrier = await sf(whShipment.id, 'carrier', 'string');

  console.log('Created system fields: 45 total');

  // ── Mappings ────────────────────────────────────────────

  // Helper: create mapping + RENAME rule
  async function mapRename(canonicalFieldId: string, systemFieldId: string, notes?: string) {
    const m = await post<{ id: string }>(ws('/mappings'), {
      canonicalFieldId, systemFieldId, ruleType: 'RENAME', notes,
    });
    await put(ws(`/mappings/${m.id}/rule`), { type: 'RENAME' });
  }

  // Helper: create mapping + VALUE_MAP rule with entries
  async function mapValueMap(
    canonicalFieldId: string,
    systemFieldId: string,
    entries: Array<{ from: string; to: string; bidirectional?: boolean }>,
    notes?: string,
  ) {
    const m = await post<{ id: string }>(ws('/mappings'), {
      canonicalFieldId, systemFieldId, ruleType: 'VALUE_MAP', notes,
    });
    await put(ws(`/mappings/${m.id}/rule`), {
      type: 'VALUE_MAP',
      entries: entries.map(e => ({
        fromValue: e.from,
        toValue: e.to,
        bidirectional: e.bidirectional ?? false,
      })),
    });
  }

  // ── Shopify Customer → Canonical Customer
  await mapRename(cfCustomerId.id, shCustId, 'Shopify customer ID (integer → string)');
  await mapRename(cfEmail.id, shCustEmail, 'Shopify email');
  await mapRename(cfFirstName.id, shCustFirstName, 'Shopify first_name');
  await mapRename(cfLastName.id, shCustLastName, 'Shopify last_name');
  await mapRename(cfPhone.id, shCustPhone, 'Shopify phone');
  await mapRename(cfStreet.id, shCustAddr1, 'Shopify default_address.address1');
  await mapRename(cfCity.id, shCustCity, 'Shopify default_address.city');
  await mapRename(cfPostalCode.id, shCustZip, 'Shopify default_address.zip');
  await mapRename(cfCountry.id, shCustCountry, 'Shopify default_address.country_code');

  // ── Shopify Order → Canonical Order
  await mapRename(cfOrderId.id, shOrdId, 'Shopify order ID');
  await mapRename(cfOrderDate.id, shOrdCreatedAt, 'Shopify created_at');
  await mapRename(cfTotalAmount.id, shOrdTotalPrice, 'Shopify total_price (string cents)');
  await mapRename(cfCurrency.id, shOrdCurrency, 'Shopify currency');
  await mapRename(cfOrderCustomerId.id, shOrdCustId, 'Shopify customer.id');

  // ── Stripe Customer → Canonical Customer
  await mapRename(cfCustomerId.id, stCustId, 'Stripe customer ID (cus_xxx)');
  await mapRename(cfEmail.id, stCustEmail, 'Stripe email');
  await mapRename(cfPhone.id, stCustPhone, 'Stripe phone');
  await mapRename(cfStreet.id, stCustAddr1, 'Stripe address.line1');
  await mapRename(cfCity.id, stCustAddrCity, 'Stripe address.city');
  await mapRename(cfPostalCode.id, stCustAddrPostal, 'Stripe address.postal_code');
  await mapRename(cfCountry.id, stCustAddrCountry, 'Stripe address.country');

  // Stripe uses a single "name" field → map to fullName (composite)
  await mapRename(cfFullName.id, stCustName, 'Stripe name (single field → composite)');

  // ── Stripe PaymentIntent → Canonical Order
  await mapRename(cfTotalAmount.id, stPiAmount, 'Stripe amount (integer, smallest unit)');
  await mapRename(cfCurrency.id, stPiCurrency, 'Stripe currency (lowercase)');
  await mapRename(cfOrderCustomerId.id, stPiCustId, 'Stripe customer reference');

  // ── Warehouse FulfilmentOrder → Canonical Order
  await mapRename(cfOrderId.id, whOrdId, 'Warehouse order_ref');
  await mapRename(cfOrderDate.id, whOrdReceivedAt, 'Warehouse received_at');
  await mapRename(cfEmail.id, whOrdCustEmail, 'Warehouse customer_email');
  await mapRename(cfStreet.id, whOrdAddr1, 'Warehouse ship_to.street');
  await mapRename(cfCity.id, whOrdCity, 'Warehouse ship_to.city');
  await mapRename(cfPostalCode.id, whOrdPostal, 'Warehouse ship_to.postal_code');
  await mapRename(cfCountry.id, whOrdCountry, 'Warehouse ship_to.country');

  // ── Warehouse Shipment → Canonical Order
  await mapRename(cfTrackingNumber.id, whShipTrackingNum, 'Warehouse tracking_number');

  // VALUE_MAP: Shopify order status → canonical orderStatus
  await mapValueMap(cfOrderStatus.id, shOrdFinancialStatus, [
    { from: 'pending', to: 'PENDING', bidirectional: true },
    { from: 'authorized', to: 'CONFIRMED', bidirectional: true },
    { from: 'paid', to: 'PROCESSING', bidirectional: true },
    { from: 'refunded', to: 'REFUNDED', bidirectional: true },
    { from: 'voided', to: 'CANCELLED', bidirectional: true },
  ], 'Shopify financial_status → canonical orderStatus');

  // VALUE_MAP: Warehouse status → canonical orderStatus
  await mapValueMap(cfOrderStatus.id, whOrdStatus, [
    { from: 'received', to: 'CONFIRMED' },
    { from: 'picking', to: 'PROCESSING' },
    { from: 'packed', to: 'PROCESSING' },
    { from: 'shipped', to: 'SHIPPED' },
    { from: 'delivered', to: 'DELIVERED' },
    { from: 'cancelled', to: 'CANCELLED' },
  ], 'Warehouse status → canonical orderStatus');

  // VALUE_MAP: Shopify shipping → canonical shippingMethod
  await mapValueMap(cfShippingMethod.id, shOrdShippingLines, [
    { from: 'standard', to: 'STANDARD' },
    { from: 'express', to: 'EXPRESS' },
    { from: 'overnight', to: 'OVERNIGHT' },
    { from: 'pickup', to: 'PICKUP' },
  ], 'Shopify shipping_lines[0].code → canonical shippingMethod');

  // VALUE_MAP: Warehouse shipping method
  await mapValueMap(cfShippingMethod.id, whOrdShipMethod, [
    { from: 'STD', to: 'STANDARD' },
    { from: 'EXP', to: 'EXPRESS' },
    { from: 'ON', to: 'OVERNIGHT' },
    { from: 'PU', to: 'PICKUP' },
  ], 'Warehouse shipping_method codes → canonical shippingMethod');

  // VALUE_MAP: Shopify tags → canonical customerType
  await mapValueMap(cfCustomerType.id, shCustTags, [
    { from: 'individual', to: 'INDIVIDUAL' },
    { from: 'business', to: 'BUSINESS' },
    { from: 'vip', to: 'VIP' },
    { from: 'wholesale', to: 'WHOLESALE' },
  ], 'Shopify tags → canonical customerType');

  console.log('Created mappings: 35+ with RENAME and VALUE_MAP rules');

  // ── Interfaces ──────────────────────────────────────────

  const ifShopifyToStripe = await post<{ id: string }>(ws('/interfaces'), {
    name: 'Shopify → Stripe Customer Sync',
    description: 'Synchronises customer data from Shopify storefront to Stripe for payment processing. Triggered on Shopify customer create/update webhook.',
    sourceSystemId: shopify.id,
    targetSystemId: stripe.id,
    direction: 'EVENT',
  });

  // Add interface fields
  for (const { fieldId, status } of [
    { fieldId: cfCustomerId.id, status: 'MANDATORY' },
    { fieldId: cfEmail.id, status: 'MANDATORY' },
    { fieldId: cfFirstName.id, status: 'OPTIONAL' },
    { fieldId: cfLastName.id, status: 'OPTIONAL' },
    { fieldId: cfFullName.id, status: 'MANDATORY' },
    { fieldId: cfPhone.id, status: 'OPTIONAL' },
    { fieldId: cfStreet.id, status: 'OPTIONAL' },
    { fieldId: cfCity.id, status: 'OPTIONAL' },
    { fieldId: cfPostalCode.id, status: 'OPTIONAL' },
    { fieldId: cfCountry.id, status: 'OPTIONAL' },
  ]) {
    await post(ws(`/interfaces/${ifShopifyToStripe.id}/fields`), {
      canonicalFieldId: fieldId, status,
    });
  }

  const ifShopifyToWarehouse = await post<{ id: string }>(ws('/interfaces'), {
    name: 'Shopify → Warehouse Fulfilment',
    description: 'Sends confirmed orders from Shopify to the warehouse for picking, packing, and shipping. Triggered on Shopify order.paid webhook.',
    sourceSystemId: shopify.id,
    targetSystemId: warehouse.id,
    direction: 'EVENT',
  });

  for (const { fieldId, status } of [
    { fieldId: cfOrderId.id, status: 'MANDATORY' },
    { fieldId: cfOrderDate.id, status: 'MANDATORY' },
    { fieldId: cfOrderStatus.id, status: 'MANDATORY' },
    { fieldId: cfTotalAmount.id, status: 'MANDATORY' },
    { fieldId: cfCurrency.id, status: 'MANDATORY' },
    { fieldId: cfShippingMethod.id, status: 'MANDATORY' },
    { fieldId: cfOrderCustomerId.id, status: 'MANDATORY' },
    { fieldId: cfEmail.id, status: 'MANDATORY' },
    { fieldId: cfFullName.id, status: 'OPTIONAL' },
    { fieldId: cfStreet.id, status: 'MANDATORY' },
    { fieldId: cfCity.id, status: 'MANDATORY' },
    { fieldId: cfPostalCode.id, status: 'MANDATORY' },
    { fieldId: cfCountry.id, status: 'MANDATORY' },
    { fieldId: cfTrackingNumber.id, status: 'OPTIONAL' },
  ]) {
    await post(ws(`/interfaces/${ifShopifyToWarehouse.id}/fields`), {
      canonicalFieldId: fieldId, status,
    });
  }

  console.log('Created interfaces: Shopify→Stripe, Shopify→Warehouse');

  // ── Propagation Chain ───────────────────────────────────
  // Order status flow within the Warehouse system:
  // FulfilmentOrder.status → Shipment.status

  const chain = await post<{ id: string }>(ws('/propagation-chains'), {
    canonicalFieldId: cfOrderStatus.id,
    systemId: warehouse.id,
    name: 'Order Status → Shipment Status',
    description: 'When a fulfilment order status changes, it propagates to the shipment status',
  });

  await post(ws(`/propagation-chains/${chain.id}/steps`), {
    systemFieldId: whOrdStatus,
    stepType: 'CONVERSION',
    notes: 'Order status is set first (received, picking, packed, shipped)',
  });

  await post(ws(`/propagation-chains/${chain.id}/steps`), {
    systemFieldId: whShipStatus,
    stepType: 'LOOKUP',
    notes: 'Shipment status is derived from order status (created, in_transit, delivered)',
  });

  console.log('Created propagation chain: Order Status → Shipment Status');

  // ── Done ────────────────────────────────────────────────

  console.log('\n✅ Community repro seeded successfully!');
  console.log(`   Workspace: ${WS}`);
  console.log('   2 canonical entities, 19 canonical fields');
  console.log('   3 systems, 6 system entities, 45 system fields');
  console.log('   35+ mappings with RENAME and VALUE_MAP rules');
  console.log('   2 interfaces, 1 propagation chain');
  console.log('   3 enum types, 13 example values');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
