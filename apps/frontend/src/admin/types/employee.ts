export type EmployeeRole = 'employee' | 'admin';
export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  department?: string;
  sectorId?: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  name: string;
  phone: string;
  department?: string;
  sectorId?: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
}
