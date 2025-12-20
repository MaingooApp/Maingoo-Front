import { DocumentType } from '../enums/documents.enum';

export interface Product {
  id: string;
  name: string;
  eanCode: string;
  description: string | null;
  categoryId: string;
  unit: string;
  category: ProductCategory;
  allergens: ProductAllergen[];
  createdAt: string;
  updatedAt: string;
  stock: number;
  idealStock?: number | null;
  storageType?: 'seco' | 'fresco' | 'congelado' | null;
  productType?: 'simple' | 'elaborado' | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductAllergen {
  id: string;
  name: string;
  code: string;
  description: string;
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
