import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as userApi from '../services/userApi.http';
import { Employee, EmployeeFormData } from '../types/employee';
import { isValidWhatsAppPhone, normalizePhoneInput } from '../../utils/phone';

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
}

interface EmployeeContextValue {
  employees: Employee[];
  stats: EmployeeStats;
  isLoading: boolean;
  error: string | null;
  refreshEmployees: () => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  createEmployee: (data: EmployeeFormData) => Promise<{ success: boolean; error?: string }>;
  updateEmployee: (id: string, data: EmployeeFormData) => Promise<{ success: boolean; error?: string }>;
  deleteEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  searchEmployees: (query: string) => Employee[];
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

function validateForm(data: EmployeeFormData): string | null {
  if (!data.name.trim()) return 'Nome é obrigatório.';
  if (!data.phone.trim()) return 'Telefone é obrigatório.';
  if (!isValidWhatsAppPhone(normalizePhoneInput(data.phone))) {
    return 'Informe um telefone válido com DDD.';
  }
  return null;
}

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await userApi.fetchUsers();
      setEmployees(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar funcionários.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEmployees();
  }, [refreshEmployees]);

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

  const createEmployee = useCallback(async (data: EmployeeFormData) => {
    const validationError = validateForm(data);
    if (validationError) return { success: false, error: validationError };

    try {
      const created = await userApi.createUser({
        ...data,
        phone: normalizePhoneInput(data.phone),
        name: data.name.trim(),
      });
      setEmployees((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao criar funcionário.',
      };
    }
  }, []);

  const updateEmployee = useCallback(async (id: string, data: EmployeeFormData) => {
    const validationError = validateForm(data);
    if (validationError) return { success: false, error: validationError };

    try {
      const updated = await userApi.updateUser(id, {
        ...data,
        phone: normalizePhoneInput(data.phone),
        name: data.name.trim(),
      });
      setEmployees((prev) =>
        prev.map((employee) => (employee.id === id ? updated : employee)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao atualizar funcionário.',
      };
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      await userApi.deleteUser(id);
      setEmployees((prev) => prev.filter((employee) => employee.id !== id));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao excluir funcionário.',
      };
    }
  }, []);

  const searchEmployees = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return employees;
      return employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          normalizePhoneInput(e.phone).includes(q.replace(/\D/g, '')) ||
          e.department?.toLowerCase().includes(q),
      );
    },
    [employees],
  );

  const value = useMemo(
    () => ({
      employees,
      stats,
      isLoading,
      error,
      refreshEmployees,
      getEmployeeById,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      searchEmployees,
    }),
    [
      employees,
      stats,
      isLoading,
      error,
      refreshEmployees,
      getEmployeeById,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      searchEmployees,
    ],
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
