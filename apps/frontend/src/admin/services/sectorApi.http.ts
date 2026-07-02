import { authRequest } from '../../services/apiClient';
import type { Sector, SectorFormData } from '../types/sector';

const BASE = '/api/v1/sectors';

export async function fetchSectors(includeInactive = true): Promise<Sector[]> {
  const query = includeInactive ? '?all=true' : '';
  return authRequest<Sector[]>(`${BASE}${query}`);
}

export async function fetchSectorById(id: string): Promise<Sector> {
  return authRequest<Sector>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createSector(data: SectorFormData): Promise<Sector> {
  return authRequest<Sector>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSector(id: string, data: SectorFormData): Promise<Sector> {
  return authRequest<Sector>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSector(id: string): Promise<void> {
  await authRequest<void>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
