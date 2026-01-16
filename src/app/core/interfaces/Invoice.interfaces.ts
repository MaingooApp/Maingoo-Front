import { DocumentType } from '../enums/documents.enum';

export interface Product {
  id: string;
  name: string;
  originalName?: string;
  eanCode: string | null;
  description: string | null;
  categoryId?: string;
  subcategoryId?: string; // Kept for backward compat if needed, but likely replaced by categoryId
  unit: string;
  category?: ProductCategory;
  subcategory?: ProductCategory; // Kept for backward compat
  allergens: ProductAllergen[];
  createdAt: string;
  updatedAt: string;
  stock: number;
  idealStock?: number | null;
  storageType?: 'seco' | 'fresco' | 'congelado' | null;
  productType?: 'simple' | 'elaborado' | null;
  unitCount?: number | string;
  lastUnitPrice?: number;
  supplier?: Supplier | { id: string; name: string; cifNif?: string };
  brand?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  depth?: number;
  path?: string;
  parent?: {
    id: string;
    name: string;
    depth?: number;
  };
  category?: ProductCategory; // Legacy: Parent category (backward compat)
}

export interface ProductAllergen {
  id: string;
  name: string;
  code: string;
  description: string;
}

/**
 * Categoría raíz que agrupa productos
 */
export interface RootCategory {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Grupo de productos agrupados por categoría raíz
 * Esta es la nueva estructura devuelta por GET /api/products
 */
export interface ProductGroup {
  rootCategory: RootCategory;
  productCount: number;
  products: Product[];
}

export interface Supplier {
  id: string;
  name: string;
  cifNif: string;
  address: string | null;
  phoneNumber: string | null;
  commercialName: string | null;
  commercialPhoneNumber: string | null;
  deliveryDays: string | null;
  minPriceDelivery: number | null;
  sanitaryRegistrationNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  suppliersProductId: string | null;
  description: string | null;
  quantity: string;
  unitPrice: string;
  price: string | null;
  tax: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  enterpriseId: string;
  supplierId: string;
  type: string | null;
  invoiceNumber: string | null;
  blobName: string | null;
  amount: string;
  date: string;
  createdAt: string;
  hasDeliveryNotes: boolean;
  documentType: DocumentType;
  supplier: Supplier;
  invoiceLines: InvoiceLine[];
}

export interface CreateInvoiceDto {
  enterpriseId: string;
  supplierName: string;
  supplierCifNif: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  lines: InvoiceLine[];
}

export interface DocumentUrlResponse {
  url: string;
  expiresIn: number;
  blobName: string;
}
