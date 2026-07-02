import { EmployeeRole } from '../admin/types/employee';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: EmployeeRole;
  department?: string;
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
  loggedInAt: string;
}

export type AuthRole = EmployeeRole;
