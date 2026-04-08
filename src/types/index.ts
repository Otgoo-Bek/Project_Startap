export type UserRole = 'B2B' | 'B2C';
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateUserDto {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  phone?: string;
  address?: string;
}

export interface CreateShiftDto {
  role: string;
  establishment: string;
  address: string;
  startTime: string;
  pay: number;
  description?: string;
  creatorId: string;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  experience?: string;
  address?: string;
  pushToken?: string;
}