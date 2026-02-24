export type UserRole = 'B2B' | 'B2C';
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
  pushToken?: string;
  experience?: string;
  isHot?: boolean;
  aiScore?: number;
  address?: string;
  createdAt: Date;
}

export interface SyncUserRequest {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
  experience?: string;
}

export interface UpdatePushTokenRequest {
  pushToken: string;
}

export interface ToggleHotStatusRequest {
  isHot: boolean;
}
EOFcat > src/types/index.ts << 'EOF'
export type UserRole = 'B2B' | 'B2C';
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
  pushToken?: string;
  experience?: string;
  isHot?: boolean;
  aiScore?: number;
  address?: string;
  createdAt: Date;
}

export interface SyncUserRequest {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
  experience?: string;
}

export interface UpdatePushTokenRequest {
  pushToken: string;
}

export interface ToggleHotStatusRequest {
  isHot: boolean;
}
