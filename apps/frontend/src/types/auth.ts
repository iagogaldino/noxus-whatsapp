import { EmployeeRole } from '../admin/types/employee';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: EmployeeRole;
  department?: string;
  sectorId?: string | null;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface AuthSession {
  token: string;
  userId: string;
  phone: string;
  name: string;
  role: EmployeeRole;
  department?: string;
  sectorId?: string | null;
  loggedInAt: string;
}

export type AuthRole = EmployeeRole;
