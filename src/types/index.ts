export type PropertyType = 'commercial' | 'residential' | 'office';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';
export type ContractStatus = 'active' | 'expired' | 'terminated';
export type Currency = 'USD' | 'SAR' | 'YER';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  ownerId: string;
  createdAt: any;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  status: UnitStatus;
  area: number;
  baseMonthlyRent: number;
  currency: Currency;
  ownerId: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber?: string;
  ownerId: string;
  createdAt: any;
}

export interface Message {
  id: string;
  contractId: string;
  tenantId: string;
  senderId: string;
  content: string;
  timestamp: any;
  ownerId: string;
}

export interface MaintenanceRecord {
  id: string;
  propertyId: string;
  description: string;
  cost: number;
  currency: Currency;
  date: any;
  ownerId: string;
}

export interface ExchangeRate {
  id: string;
  base: Currency;
  rates: { [key in Currency]?: number };
  lastUpdated: any; // Firestore Timestamp
}

export interface Contract {
  id: string;
  unitId: string;
  tenantId?: string; // New field to link to Tenant entity
  tenantName: string;
  tenantPhone: string;
  startDate: any;
  endDate: any;
  baseRent: number;
  baseCurrency: Currency;
  conversionRate: number;
  escalationPercentage: number;
  status: ContractStatus;
  ownerId: string;
}

export interface Payment {
  id: string;
  contractId: string;
  amountPaidBase: number;
  amountPaidLocal: number;
  exchangeRateAtPayment: number;
  paymentDate: any;
  monthCovered: string; // YYYY-MM
  ownerId: string;
}
