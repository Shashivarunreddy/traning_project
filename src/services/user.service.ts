import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/model';

const USERS_KEY = 'users';

export const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Customer Support',
  'Product',
  'Executive',
  'Other',
];

@Injectable({ providedIn: 'root' })
export class UserService {
  private users$ = new BehaviorSubject<User[]>(this.readUsers());

  constructor() { }

  private safeRead<T>(key: string): T[] {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.getItem === 'function'
      ) {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }
    } catch { }
    return [];
  }

  private safeWrite<T>(key: string, data: T[]) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.setItem === 'function'
      ) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch { }
  }

  private readUsers(): User[] {
    return this.safeRead<User>(USERS_KEY);
  }

  getAllUsers(): Observable<User[]> {
    return this.users$.asObservable();
  }

  getUserById(id: number): User | undefined {
    return this.users$.value.find((u) => u.userID === id);
  }

  getUsersByRole(role: UserRole): User[] {
    return this.users$.value.filter((u) => u.role === role);
  }

  getUsersByDepartment(department: string): User[] {
    return this.users$.value.filter((u) => u.department === department);
  }

  createUser(partial: Partial<User>): User {
    const users = this.users$.value.slice();
    const nextId = users.length
      ? Math.max(...users.map((u) => u.userID)) + 1
      : 1;

    const newUser: User = {
      userID: nextId,
      name: partial.name || 'Unnamed User',
      email: partial.email || '',
      role: partial.role || UserRole.EMPLOYEE,
      department: partial.department || 'Other',
      status: partial.status || 'Active',
      joinedDate: partial.joinedDate || new Date().toISOString(),
      lastLoginDate: partial.lastLoginDate,
    };

    users.push(newUser);
    this.users$.next(users);
    this.safeWrite<User>(USERS_KEY, users);
    return newUser;
  }

  updateUser(id: number, updates: Partial<User>): void {
    const users = this.users$.value.slice();
    const idx = users.findIndex((u) => u.userID === id);

    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates };
      this.users$.next(users);
      this.safeWrite<User>(USERS_KEY, users);
    }
  }

  deleteUser(id: number): void {
    const users = this.users$.value.filter((u) => u.userID !== id);
    this.users$.next(users);
    this.safeWrite<User>(USERS_KEY, users);
  }

  toggleUserStatus(id: number): void {
    const user = this.getUserById(id);
    if (user) {
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      this.updateUser(id, { status: newStatus });
    }
  }

  updateLastLogin(id: number): void {
    this.updateUser(id, { lastLoginDate: new Date().toISOString() });
  }

  // Check if email already exists (for validation)
  emailExists(email: string, excludeUserID?: number): boolean {
    return this.users$.value.some(
      (u) => u.email === email && u.userID !== excludeUserID
    );
  }
}