import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as sectorApi from '../services/sectorApi.http';
import { Sector, SectorFormData } from '../types/sector';

interface SectorContextValue {
  sectors: Sector[];
  isLoading: boolean;
  error: string | null;
  refreshSectors: () => Promise<void>;
  getSectorById: (id: string) => Sector | undefined;
  createSector: (data: SectorFormData) => Promise<{ success: boolean; error?: string }>;
  updateSector: (id: string, data: SectorFormData) => Promise<{ success: boolean; error?: string }>;
  deleteSector: (id: string) => Promise<{ success: boolean; error?: string }>;
  searchSectors: (query: string) => Sector[];
}

const SectorContext = createContext<SectorContextValue | null>(null);

function validateForm(data: SectorFormData): string | null {
  if (!data.name.trim()) return 'Nome é obrigatório.';
  return null;
}

export const SectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await sectorApi.fetchSectors(true);
      setSectors(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar setores.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSectors();
  }, [refreshSectors]);

  const getSectorById = useCallback(
    (id: string) => sectors.find((sector) => sector.id === id),
    [sectors],
  );

  const createSector = useCallback(
    async (data: SectorFormData) => {
      const validationError = validateForm(data);
      if (validationError) return { success: false, error: validationError };

      try {
        const created = await sectorApi.createSector({
          name: data.name.trim(),
          description: data.description.trim(),
          status: data.status,
        });
        setSectors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Falha ao criar setor.',
        };
      }
    },
    [],
  );

  const updateSector = useCallback(
    async (id: string, data: SectorFormData) => {
      const validationError = validateForm(data);
      if (validationError) return { success: false, error: validationError };

      try {
        const updated = await sectorApi.updateSector(id, {
          name: data.name.trim(),
          description: data.description.trim(),
          status: data.status,
        });
        setSectors((prev) =>
          prev
            .map((sector) => (sector.id === id ? updated : sector))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Falha ao atualizar setor.',
        };
      }
    },
    [],
  );

  const deleteSector = useCallback(async (id: string) => {
    try {
      await sectorApi.deleteSector(id);
      setSectors((prev) => prev.filter((sector) => sector.id !== id));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao excluir setor.',
      };
    }
  }, []);

  const searchSectors = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) return sectors;

      return sectors.filter(
        (sector) =>
          sector.name.toLowerCase().includes(normalized) ||
          sector.description.toLowerCase().includes(normalized),
      );
    },
    [sectors],
  );

  const value = useMemo(
    () => ({
      sectors,
      isLoading,
      error,
      refreshSectors,
      getSectorById,
      createSector,
      updateSector,
      deleteSector,
      searchSectors,
    }),
    [
      sectors,
      isLoading,
      error,
      refreshSectors,
      getSectorById,
      createSector,
      updateSector,
      deleteSector,
      searchSectors,
    ],
  );

  return <SectorContext.Provider value={value}>{children}</SectorContext.Provider>;
};

export function useSectors(): SectorContextValue {
  const ctx = useContext(SectorContext);
  if (!ctx) {
    throw new Error('useSectors must be used within SectorProvider');
  }
  return ctx;
}
