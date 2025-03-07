export interface Account {
  id: number;
  userId: number;
  plaidAccountId: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  
  // Additional properties needed by components
  accountType?: string;
  accountNumber?: string;
  institution?: string;
  syncing?: boolean;
}