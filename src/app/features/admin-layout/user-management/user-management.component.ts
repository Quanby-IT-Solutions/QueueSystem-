import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { CreateAccountModalComponent } from "./create-account-modal/create-account-modal.component";
import { UswagonAuthService } from 'uswagon-auth';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { environment } from '../../../../environment/environment';

interface User {
  role: string;
  id: string;
  username: string;
  fullname: string;
  division_id: string;
  division: string;
  is_online: boolean;
  number: string;
  profile?: string;
  password?: string;
}

interface Divisions { 
  id: string;
  name: string;
}

interface PerformanceMetrics {
  totalCheckIns: number;
  averageCheckInTime: number;
  totalCheckInsToday: number;
  totalCheckInsThisWeek: number;
  averageTimeService: string;
  rating: number;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CreateAccountModalComponent, LottieAnimationComponent],
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  searchQuery = '';
    performanceMetrics: PerformanceMetrics = {
    totalCheckIns: 0,
    averageCheckInTime: 0,
    totalCheckInsToday: 0,
    totalCheckInsThisWeek: 0,
    averageTimeService: 'Not Available',
    rating: 4
  };
  currentUser: User | null = null;
  showModal = false;
  selectedUser: User | null = null;
  isSuperAdmin: boolean = this.auth.accountLoggedIn() === 'superadmin';

  divisions: Divisions[] = [];

  constructor(private API: UswagonCoreService, private auth: UswagonAuthService) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.API.setLoading(true);
    const [users, divisions] = await Promise.all([this.fetchUsers(), this.fetchDivisions()]);
    this.users = users;
    this.filteredUsers = [...this.users];
    this.updatePagination();
    if (this.users.length > 0) {
      this.setCurrentUser(this.users[0]);
    }
    this.API.setLoading(false);
  }
  

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    this.paginatedUsers = this.filteredUsers.slice(
      (this.currentPage - 1) * this.pageSize,
      this.currentPage * this.pageSize
    );
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  searchUsers() {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.username.toLowerCase().includes(query) ||
      user.fullname.toLowerCase().includes(query) ||
      user.division.toLowerCase().includes(query)
    );
    this.currentPage = 1; 
    this.updatePagination();
  }

  async fetchDivisions() {
    const data = await this.API.read({
      selectors: ['*'],
      tables: 'divisions',
      conditions: `WHERE id != '${environment.administrators}'`
    });

    if (data.success) {
      this.divisions = data.output as Divisions[];
      if (!this.isSuperAdmin) {
        this.divisions = this.divisions.filter(
          division => division.id === this.auth.getUser().division_id
        );
      }
    } else {
      throw new Error('Failed to fetch divisions');
    }

    return this.divisions;
  }

  async fetchUsers(): Promise<User[]> {
    const conditions = this.isSuperAdmin
      ? 'WHERE divisions.id = desk_attendants.division_id'
      : `WHERE divisions.id = desk_attendants.division_id AND divisions.id = '${this.auth.getUser().division_id}'`;

    const [deskAttendantData, adminData] = await Promise.all([
      this.API.read({
        selectors: ['desk_attendants.*, divisions.name as division'],
        tables: 'desk_attendants, divisions',
        conditions: conditions
      }),
      this.API.read({
        selectors: ['administrators.*, divisions.name as division'],
        tables: 'administrators, divisions',
        conditions: conditions.replace('desk_attendants', 'administrators')
      })
    ]);

    let users: User[] = [];

    if (deskAttendantData.success) {
      const deskAttendants = deskAttendantData.output.map((user: any) => this.processUser(user, 'Desk attendant'));
      users.push(...await Promise.all(deskAttendants));
    }

    if (adminData.success) {
      const admins = adminData.output.map((user: any) => this.processUser(user, user.role || 'Administrator'));
      users.push(...await Promise.all(admins));
    }

    console.log('Users fetched:', users);
    return users;
  }

  async processUser(user: any, role: string): Promise<User> {
    const decryptedPassword = await this.API.decrypt(user.password);
    return {
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      profile: this.getImageURL(user.profile),
      password: decryptedPassword,
      division_id: user.division_id,
      division: user.division || 'Not Available',
      is_online: user.is_online,
      role: role,
      number: user.number || '' 
    };
  }

  

  getImageURL(file: string): string | undefined {
    return this.API.getFileURL(file);
  }

 

  setCurrentUser(user: User) {
    this.currentUser = user;
    if (user) {
      this.fetchTerminalSessions(user.id);
    } else {
      this.resetMetrics();
    }
  }
  

  createNewAccount() {
    this.selectedUser = null;
    this.showModal = true;
  }

  async deleteUser(user: User) {
    const confirmed = confirm(`Are you sure you want to delete ${user.fullname}?`);
    if (!confirmed) return;

    try {
      const response = await this.API.delete({
        tables: user.role === 'Desk attendant' ? 'desk_attendants' : 'administrators',
        conditions: `WHERE id = '${user.id}'`
      });

      if (response && response.success) {
        this.users = this.users.filter(u => u.id !== user.id);
        this.filteredUsers = this.filteredUsers.filter(u => u.id !== user.id);
        this.API.sendFeedback('success', 'User has been deleted!', 5000);
        console.log('User deleted successfully:', user.fullname);
      } else {
        alert(`Failed to delete user: ${response.output || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error occurred during user deletion:', error);
    }
  }

  viewUserDetails(user: User) {
    this.setCurrentUser(user);
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  async onAccountCreated(partialUser: Partial<User>) {
    try {
      await this.loadData();
  
      this.API.sendFeedback('success', this.selectedUser ? 'User has been updated!' : 'New user has been added!', 5000);
    } catch (error) {
      console.error('Error while refreshing user list:', error);
      this.API.sendFeedback('error', 'An error occurred while refreshing the user list.', 5000);
    } finally {
      this.closeModal();
    }
  }
  

  editUser(user: User) {
    this.selectedUser = user;
    this.showModal = true;
  }


  async fetchTerminalSessions(userId: string) {
    try {
      const response = await this.API.read({
        selectors: ['*'],
        tables: 'terminal_sessions',
        conditions: `WHERE attendant_id = '${userId}'`,
      });
  
      if (response.success && response.output.length > 0) {
        const sessions = response.output;
        this.performanceMetrics = this.calculateMetrics(sessions);
      } else {
        this.resetMetrics(); 
        console.error('No terminal sessions found for this user:', response.output);
      }
    } catch (error) {
      console.error('Error fetching terminal sessions for user:', error);
    }
  }

  formatTime(minutes: number): string {
    if (!minutes || isNaN(minutes)) {
      return '0';
    }
  
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; 
  
    return `${formattedHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }
  

 
  calculateMetrics(sessions: any[]): PerformanceMetrics {
    const totalCheckIns = sessions.length;
    const checkInTimesByDate: Record<string, number[]> = {};

    sessions.forEach((session) => {
      const startTime = new Date(session.start_time);
      const dateKey = startTime.toISOString().split('T')[0]; 
      const checkInTimeInMinutes = startTime.getHours() * 60 + startTime.getMinutes(); 
  
      if (!checkInTimesByDate[dateKey]) {
        checkInTimesByDate[dateKey] = [];
      }
      checkInTimesByDate[dateKey].push(checkInTimeInMinutes);
    });
  
    const dailyAverages: number[] = Object.values(checkInTimesByDate).map((times) => {
      const totalMinutes = times.reduce((sum, time) => sum + time, 0);
      return totalMinutes / times.length;
    });
  
    const overallAverageCheckInTimeInMinutes =
      dailyAverages.reduce((sum, avg) => sum + avg, 0) / dailyAverages.length;
  
    const totalDuration = sessions.reduce((acc, session) => {
      const startTime = new Date(session.start_time).getTime();
      const lastActive = new Date(session.last_active).getTime();
      const sessionDuration = lastActive - startTime; 
      return acc + sessionDuration;
    }, 0);
  
    const averageDurationMs = totalDuration / totalCheckIns;
    const averageServiceMinutes = Math.floor(averageDurationMs / 60000);
    const averageServiceSeconds = Math.floor((averageDurationMs % 60000) / 1000);
    const averageTimeService = `${averageServiceMinutes}:${averageServiceSeconds.toString().padStart(2, '0')} mins`;
  
    const totalCheckInsToday = sessions.filter(session =>
      new Date(session.start_time).toDateString() === new Date().toDateString()).length;
  
    const totalCheckInsThisWeek = sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      const currentDate = new Date();
      const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    }).length;
  
    return {
      totalCheckIns,
      averageCheckInTime: overallAverageCheckInTimeInMinutes, 
      totalCheckInsToday,
      totalCheckInsThisWeek,
      averageTimeService,
      rating: 4,
    };
  }
  
  resetMetrics() {
    this.performanceMetrics = {
      totalCheckIns: 0,
      averageCheckInTime: 0,
      totalCheckInsToday: 0,
      totalCheckInsThisWeek: 0,
      averageTimeService: '0',
      rating: 0,
    };
  }

}