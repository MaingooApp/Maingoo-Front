export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  enterpriseId: string;
  phonePrefix: string | null;
  phoneNumber: string | null;
  emailFluvia: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}
