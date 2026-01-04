export interface Supplier {
  id?: string;
  name: string;
  cifNif: string;
  address?: string | null;
  phoneNumber?: string | null;
  commercialName?: string | null;
  commercialEmail?: string | null;
  commercialPhoneNumber?: string | null;
  orderDays?: string | null;
  deliveryDays?: string | null;
  minPriceDelivery?: number | null;
  sanitaryRegistrationNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierDto {
  name: string;
  cifNif: string;
  address?: string;
  phoneNumber?: string;
  commercialName?: string;
  commercialEmail?: string;
  commercialPhoneNumber?: string;
  orderDays?: string;
  deliveryDays?: string;
  minPriceDelivery?: number;
  sanitaryRegistrationNumber?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  cifNif?: string;
  address?: string;
  phoneNumber?: string;
  commercialName?: string;
  commercialEmail?: string;
  commercialPhoneNumber?: string;
  orderDays?: string;
  deliveryDays?: string;
  minPriceDelivery?: number;
  sanitaryRegistrationNumber?: string;
}
