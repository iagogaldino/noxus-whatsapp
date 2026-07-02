import { authRequest } from '../../services/apiClient';
import type { Employee, EmployeeFormData } from '../types/employee';

const BASE = '/api/v1/users';

export async function fetchUsers(): Promise<Employee[]> {
  return authRequest<Employee[]>(BASE);
}

export async function fetchUserById(id: string): Promise<Employee> {
  return authRequest<Employee>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createUser(data: EmployeeFormData): Promise<Employee> {
  return authRequest<Employee>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: EmployeeFormData): Promise<Employee> {
  return authRequest<Employee>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await authRequest<void>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
