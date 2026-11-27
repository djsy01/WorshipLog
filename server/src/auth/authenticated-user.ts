export interface AuthenticatedUser {
  sub: string;
  email: string;
  role?: string;
  exp?: number;
  refreshToken?: string;
}
