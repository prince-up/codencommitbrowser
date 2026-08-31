export enum UserRole { STUDENT = 'STUDENT', PROCTOR = 'PROCTOR', TEACHER = 'TEACHER', INSTITUTION_ADMIN = 'INSTITUTION_ADMIN', SUPER_ADMIN = 'SUPER_ADMIN' }

export interface User {
  id: string;
  email: string;
  role: UserRole;
  institutionId: string;
  createdAt: Date;
  updatedAt: Date;
}
