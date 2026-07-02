import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { seedEmployees } from '../data/mockEmployees';
import { Employee, EmployeeFormData } from '../types/employee';
import { loadEmployees, saveEmployees } from '../utils/storage';

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
}

interface EmployeeContextValue {
  employees: Employee[];
  stats: EmployeeStats;
  getEmployeeById: (id: string) => Employee | undefined;
  createEmployee: (data: EmployeeFormData) => { success: boolean; error?: string };
  updateEmployee: (id: string, data: EmployeeFormData) => { success: boolean; error?: string };
  deleteEmployee: (id: string) => void;
  searchEmployees: (query: string) => Employee[];
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

function initEmployees(): Employee[] {
  const stored = loadEmployees<Employee[]>();
  if (stored && stored.length > 0) return stored;
  saveEmployees(seedEmployees);
  return seedEmployees;
}

function validateForm(data: EmployeeFormData, employees: Employee[], excludeId?: string): string | null {
  if (!data.name.trim()) return 'Nome é obrigatório.';
  if (!data.email.trim()) return 'E-mail é obrigatório.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return 'E-mail inválido.';

  const emailTaken = employees.some(
    (e) => e.email.toLowerCase() === data.email.trim().toLowerCase() && e.id !== excludeId,
  );
  if (emailTaken) return 'Este e-mail já está em uso.';

  if (!excludeId && !data.password?.trim()) return 'Senha é obrigatória na criação.';
  return null;
}

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(initEmployees);

  const persist = useCallback((next: Employee[]) => {
    setEmployees(next);
    saveEmployees(next);
  }, []);

  const stats = useMemo<EmployeeStats>(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      inactive: employees.filter((e) => e.status === 'inactive').length,
      admins: employees.filter((e) => e.role === 'admin').length,
    }),
    [employees],
  );

  const getEmployeeById = useCallback(
    (id: string) => employees.find((e) => e.id === id),
    [employees],
  );

  const createEmployee = useCallback(
    (data: EmployeeFormData) => {
      const error = validateForm(data, employees);
      if (error) return { success: false, error };

      const now = new Date().toISOString();
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || undefined,
        department: data.department?.trim() || undefined,
        role: data.role,
        status: data.status,
        password: data.password?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      persist([...employees, newEmployee]);
      return { success: true };
    },
    [employees, persist],
  );

  const updateEmployee = useCallback(
    (id: string, data: EmployeeFormData) => {
      const error = validateForm(data, employees, id);
      if (error) return { success: false, error };

      const existing = employees.find((e) => e.id === id);
      if (!existing) return { success: false, error: 'Funcionário não encontrado.' };

      const updated: Employee = {
        ...existing,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || undefined,
        department: data.department?.trim() || undefined,
        role: data.role,
        status: data.status,
        password: data.password?.trim() ? data.password.trim() : existing.password,
        updatedAt: new Date().toISOString(),
      };

      persist(employees.map((e) => (e.id === id ? updated : e)));
      return { success: true };
    },
    [employees, persist],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      persist(employees.filter((e) => e.id !== id));
    },
    [employees, persist],
  );

  const searchEmployees = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return employees;
      return employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q),
      );
    },
    [employees],
  );

  const value = useMemo(
    () => ({
      employees,
      stats,
      getEmployeeById,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      searchEmployees,
    }),
    [employees, stats, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, searchEmployees],
  );

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
};

export const useEmployees = (): EmployeeContextValue => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within EmployeeProvider');
  }
  return context;
};
