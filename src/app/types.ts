export interface SelectOption {
  id: number;
  label: string;
  hint?: string;
}

export interface OperationRecord {
  id: number;
  operatorId: number;
  operatorName: string;
  lanchaId: number;
  lanchaName: string;
  typeName: string;
  statusId: number;
  statusName: string;
  userId: number | null;
  userName: string | null;
  startedAt: string;
  finishedAt: string | null;
  notes: string;
}

export interface BootstrapPayload {
  options: {
    operators: SelectOption[];
    lanchas: SelectOption[];
    statuses: SelectOption[];
    users: SelectOption[];
    types: SelectOption[];
  };
  operations: OperationRecord[];
}
