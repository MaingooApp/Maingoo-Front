export interface Gestor {
  id: string;
  enterpriseId: string;
  name: string;
  business?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGestorDto {
  name: string;
  business?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
}

export interface UpdateGestorDto {
  name?: string;
  business?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
}
