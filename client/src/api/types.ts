export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  _count?: { products: number; purchaseOrders: number };
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockQty: number;
  reorderLevel: number;
  active: boolean;
  categoryId?: number | null;
  category?: Category | null;
  supplierId?: number | null;
  supplier?: Supplier | null;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string | null;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  outstanding?: number;
  sales?: Sale[];
}

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "CREDIT";

export interface SaleItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerId?: number | null;
  customer?: Customer | null;
  userId?: number | null;
  user?: User | null;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  createdAt: string;
}

export type POStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplier?: Supplier;
  status: POStatus;
  orderDate: string;
  expectedDate?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  total: number;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export interface DashboardData {
  todayRevenue: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthSalesCount: number;
  totalProducts: number;
  lowStockCount: number;
  inventoryValue: number;
  customerCount: number;
  recentSales: Sale[];
  lowStockItems: Product[];
}
