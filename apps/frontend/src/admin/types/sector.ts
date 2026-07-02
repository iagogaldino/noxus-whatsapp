export type SectorStatus = 'active' | 'inactive';

export interface Sector {
  id: string;
  name: string;
  description: string;
  status: SectorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SectorFormData {
  name: string;
  description: string;
  status: SectorStatus;
}
