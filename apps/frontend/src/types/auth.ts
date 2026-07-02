import { EmployeeRole } from '../admin/types/employee';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: EmployeeRole;
  loggedInAt: string;
}

export type AuthRole = EmployeeRole;
