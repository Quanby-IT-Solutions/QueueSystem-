import { Injectable } from '@angular/core';

export interface User {
  username: string;
  firstName: string;
  lastName: string;
  department: 'Cash Division' | 'Registrar' | 'Accounting Office' | 'Super Admin'; 
  type: 'Desk Attendant' | 'Kiosk' | 'Admin'; 
  role: 'Admin' | 'Desk Attendant'; 
  status: 'Online' | 'Offline';
  password?: string;
}

export interface KioskUser {
  type: 'Kiosk';
  department: 'Cash Division' | 'Registrar' | 'Accounting Office'; 
  code: string; 
  status: 'Online' | 'Offline'; 
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private currentUser: User | null = null;
  public lastLogin?: string;

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  private users: User[] = [
    {
      username: 'Carlo',
      firstName: 'Carlo',
      lastName: 'Batumbakal',
      department: 'Cash Division',
      type: 'Desk Attendant',
      role: 'Desk Attendant',
      status: 'Online',
      password: 'password',
    },
    {
      username: 'Jhielo',
      firstName: 'Jhielo',
      lastName: 'Gonzales',
      department: 'Accounting Office',
      type: 'Kiosk',
      role: 'Desk Attendant',
      status: 'Online',
      password: '111111',
    },
    {
      username: 'Orlan',
      firstName: 'Jan Orlan',
      lastName: 'Cardona',
      department: 'Registrar',
      type: 'Kiosk',
      role: 'Desk Attendant',
      status: 'Offline',
      password: '222222',
    },
    {
      username: 'Sean',
      firstName: 'Sean',
      lastName: 'Palacay',
      department: 'Cash Division',
      type: 'Kiosk',
      role: 'Desk Attendant',
      status: 'Online',
      password: '333333',
    },
    {
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      department: 'Super Admin',
      type: 'Admin',
      role: 'Admin',
      status: 'Online',
      password: 'password',
    },
    {
      username: 'registraradmin',
      firstName: 'Super',
      lastName: 'Admin',
      department: 'Registrar',
      type: 'Admin',
      role: 'Admin',
      status: 'Online',
      password: 'password',
    },
    {
      username: 'cashadmin',
      firstName: 'Super',
      lastName: 'Admin',
      department: 'Cash Division',
      type: 'Admin',
      role: 'Admin',
      status: 'Online',
      password: 'password',
    },
    {
      username: 'accountingadmin',
      firstName: 'Super',
      lastName: 'Admin',
      department: 'Accounting Office',
      type: 'Admin',
      role: 'Admin',
      status: 'Online',
      password: 'password',
    }
  ];

  // Dummy data for Kiosk users
  private kioskUsers: KioskUser[] = [
    {
      type: 'Kiosk',
      department: 'Accounting Office',
      code: 'KIOSK01',
      status: 'Online',
    },
    {
      type: 'Kiosk',
      department: 'Registrar',
      code: 'KIOSK02',
      status: 'Offline',
    },
    {
      type: 'Kiosk',
      department: 'Cash Division',
      code: 'KIOSK03',
      status: 'Online',
    }
  ];


  getUserByPassword(password: string): User | undefined {
    return this.users.find(user => user.password === password && user.type === 'Kiosk');
  }


  getAllUsers(): User[] {
    return this.users;
  }


  getAllKioskUsers(): KioskUser[] {
    return this.kioskUsers;
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }


  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }
}

