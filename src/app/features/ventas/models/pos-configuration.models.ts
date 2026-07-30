import { DecimalString, FiscalMode, PosDeviceStatus, PosDeviceType } from './pos.models';

export interface EnterpriseScopedFilters {
  enterpriseId?: string;
}

export interface ActiveListFilters extends EnterpriseScopedFilters {
  active?: boolean;
}

export interface UpdatePosSettingsDto extends EnterpriseScopedFilters {
  enabled?: boolean;
  currency?: string;
  timezone?: string;
  pricesIncludeTax?: boolean;
  allowNegativeStock?: boolean;
  receiptFooter?: string;
  fiscalMode?: FiscalMode;
  issuerLegalName?: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  fiscalSeriesPrefix?: string;
}

export interface ListPosDevicesFilters extends EnterpriseScopedFilters {
  type?: PosDeviceType;
  status?: PosDeviceStatus;
}

export interface CreatePosDeviceDto extends EnterpriseScopedFilters {
  name: string;
  code: string;
  type: PosDeviceType;
  appVersion?: string;
}

export type UpdatePosDeviceDto = Partial<Omit<CreatePosDeviceDto, 'code'>>;

export interface RevokePosDeviceDto {
  reason: string;
  confirm: 'REVOKE';
  expectedStatus: 'ACTIVE';
}

export interface CreatePosAreaDto extends EnterpriseScopedFilters {
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export type UpdatePosAreaDto = Partial<CreatePosAreaDto>;

export interface ListPosTablesFilters extends ActiveListFilters {
  areaId?: string;
}

export interface CreatePosTableDto extends EnterpriseScopedFilters {
  areaId: string;
  name: string;
  capacity: number;
  sortOrder?: number;
  active?: boolean;
}

export type UpdatePosTableDto = Partial<CreatePosTableDto>;

export interface CreatePosMenuCategoryDto extends EnterpriseScopedFilters {
  name: string;
  color?: string;
  sortOrder?: number;
  active?: boolean;
}

export type UpdatePosMenuCategoryDto = Partial<CreatePosMenuCategoryDto>;

export interface ListPosMenuItemsFilters extends ActiveListFilters {
  categoryId?: string;
  search?: string;
}

export interface CreatePosMenuItemDto extends EnterpriseScopedFilters {
  categoryId: string;
  name: string;
  sku?: string;
  description?: string;
  imageUrl?: string;
  foodPreparationId?: string;
  kitchenStationId?: string | null;
  modifierGroupIds?: string[];
  priceGross: DecimalString;
  taxRate: DecimalString;
  trackStock: boolean;
  sortOrder?: number;
  active?: boolean;
}

export type UpdatePosMenuItemDto = Omit<Partial<CreatePosMenuItemDto>, 'foodPreparationId'> & {
  foodPreparationId?: string | null;
};

export interface CreateKitchenStationDto extends EnterpriseScopedFilters {
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export type UpdateKitchenStationDto = Partial<CreateKitchenStationDto>;

export interface ModifierOptionCreateDto {
  name: string;
  priceDeltaGross: DecimalString;
  active?: boolean;
  sortOrder?: number;
}

export interface ModifierOptionUpdateDto extends ModifierOptionCreateDto {
  id?: string;
}

export interface CreateModifierGroupDto extends EnterpriseScopedFilters {
  name: string;
  minSelections?: number;
  maxSelections: number;
  required?: boolean;
  options: ModifierOptionCreateDto[];
}

export type UpdateModifierGroupDto = Omit<Partial<CreateModifierGroupDto>, 'options'> & {
  options?: ModifierOptionUpdateDto[];
};
