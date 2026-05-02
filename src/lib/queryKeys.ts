export const queryKeys = {
  all: ['property-management'] as const,
  // Properties
  properties: {
    all: () => [...queryKeys.all, 'properties'] as const,
    list: (filters?: any) => [...queryKeys.properties.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.properties.all(), 'detail', id] as const,
  },
  // Units
  units: {
    all: () => [...queryKeys.all, 'units'] as const,
    list: (propertyId?: string, filters?: any) => [...queryKeys.units.all(), 'list', { propertyId, ...filters }] as const,
    detail: (id: string) => [...queryKeys.units.all(), 'detail', id] as const,
  },
  // Tenants
  tenants: {
    all: () => [...queryKeys.all, 'tenants'] as const,
    list: (filters?: any) => [...queryKeys.tenants.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.tenants.all(), 'detail', id] as const,
  },
  // Contracts
  contracts: {
    all: () => [...queryKeys.all, 'contracts'] as const,
    list: (filters?: any) => [...queryKeys.contracts.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.contracts.all(), 'detail', id] as const,
  },
  // Payments
  payments: {
    all: () => [...queryKeys.all, 'payments'] as const,
    list: (contractId?: string, filters?: any) => [...queryKeys.payments.all(), 'list', { contractId, ...filters }] as const,
  },
  // Maintenance
  maintenance: {
    all: () => [...queryKeys.all, 'maintenance'] as const,
    list: (propertyId?: string, filters?: any) => [...queryKeys.maintenance.all(), 'list', { propertyId, ...filters }] as const,
  },
};
