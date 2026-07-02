import { EmployeeRole } from '../admin/types/employee';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: EmployeeRole;
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
  email: string;
  name: string;
  role: EmployeeRole;
  loggedInAt: string;
}

export type AuthRole = EmployeeRole;
