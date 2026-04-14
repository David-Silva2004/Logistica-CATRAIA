export interface SelectOption {
  id: number;
  label: string;
  hint?: string;
  role?: UserRole;
}

export type UserRole = "admin" | "normal";

export interface AuthSession {
  id: number;
  name: string;
  login: string;
  email: string | null;
  role: UserRole;
}

export interface AuthStatusPayload {
  hasUsers: boolean;
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
  crewMemberName: string | null;
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
