export type EmployeeRole = 'employee' | 'admin';
export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  password?: string;
}
