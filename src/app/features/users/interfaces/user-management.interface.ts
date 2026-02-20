export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  permissions: string[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

/** Agrupación visual de permisos por módulo */
export interface PermissionGroup {
  module: string;
  label: string;
  permissions: Permission[];
}
