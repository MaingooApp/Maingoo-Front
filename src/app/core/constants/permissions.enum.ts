export enum AppPermission {
  AdminSuper = 'admin.super',
  AgentUse = 'agent.use',

  UsersRead = 'users.read',
  UsersWrite = 'users.write',
  UsersDelete = 'users.delete',

  PermissionsAssign = 'permissions.assign',
  AuditRead = 'audit.read',

  BillingRead = 'billing.read',
  BillingWrite = 'billing.write',

  InvoicesRead = 'invoices.read',
  InvoicesWrite = 'invoices.write',
  InvoicesDelete = 'invoices.delete',

  SuppliersRead = 'suppliers.read',
  SuppliersWrite = 'suppliers.write',
  SuppliersDelete = 'suppliers.delete',

  EnterprisesRead = 'enterprises.read',
  EnterprisesWrite = 'enterprises.write',
  EnterprisesDelete = 'enterprises.delete',

  DocumentsRead = 'documents.read',
  DocumentsWrite = 'documents.write',

  GestorsRead = 'gestors.read',
  GestorsWrite = 'gestors.write',
  GestorsDelete = 'gestors.delete',

  ProductsRead = 'products.read',
  ProductsWrite = 'products.write',
  ProductsDelete = 'products.delete',

  FoodPreparationsRead = 'food-preparations.read',
  FoodPreparationsWrite = 'food-preparations.write',
  FoodPreparationsDelete = 'food-preparations.delete',

  FoodPreparationTypesRead = 'food-preparation-types.read',

  UtensilsRead = 'utensils.read',
  UtensilsWrite = 'utensils.write',
  UtensilsDelete = 'utensils.delete',

  MachineryRead = 'machinery.read',
  MachineryWrite = 'machinery.write',
  MachineryDelete = 'machinery.delete',

  IotRead = 'iot.read',
  IotWrite = 'iot.write',
  IotDelete = 'iot.delete',

  PosRead = 'pos.read',
  PosSell = 'pos.sell',
  PosVoid = 'pos.void',
  PosRefund = 'pos.refund',
  PosCash = 'pos.cash',
  PosKitchen = 'pos.kitchen',
  PosManage = 'pos.manage',

  CashRegistersRead = 'cash-registers.read',
  CashRegistersWrite = 'cash-registers.write',
  CashRegistersDelete = 'cash-registers.delete',

  InventoryRead = 'inventory.read',
  InventoryWrite = 'inventory.write',

  SalesReportsRead = 'reports.sales.read',
  FiscalRead = 'fiscal.read',
  FiscalWrite = 'fiscal.write'
}
