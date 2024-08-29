import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateAccountModalComponent } from './create-account-modal/create-account-modal.component';

// User interface with a selected property for checkbox functionality
interface User {
  username: string;
  fullName: string;
  location: string;
  type: string;
  status: 'Enabled' | 'Disabled';
  password?: string;
  selected?: boolean; // Property to manage row selection
}

@Component({
  selector: 'app-user-management',
  templateUrl: './a-user-management.component.html',
  styleUrls: ['./a-user-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CreateAccountModalComponent],
})
export class AUserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = []; // Array to store selected users

  searchQuery = '';
  showModal = false;
  selectedUser: User | null = null;

  locations = ['Accounting Office', 'Registrar', 'Cash Division'];
  accountTypes = ['Desk attendant', 'Kiosk', 'Queue Display'];

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  isEditing = false;

  performanceMetrics = {
    totalCheckIns: 43212,
    totalCheckInsToday: 1345,
    averageTimeService: '7:30 mins',
  };

  ngOnInit() {
    this.users = [
      {
        username: 'Carlo',
        fullName: 'Carlo Batumbakal',
        location: 'Cash Division',
        type: 'Desk Attendant',
        status: 'Enabled',
      },
      {
        username: 'Jhielo',
        fullName: 'Jhielo Gonzales',
        location: 'Accounting Office',
        type: 'Kiosk',
        status: 'Enabled',
        password: '111111',
      },
      {
        username: 'Orlan',
        fullName: 'Jan Orlan Cardona',
        location: 'Registrar',
        type: 'Kiosk',
        status: 'Disabled',
        password: '222222',
      },
      {
        username: 'Sean',
        fullName: 'Sean Palacay',
        location: 'Cash Division',
        type: 'Kiosk',
        status: 'Enabled',
        password: '333333',
      },
    ];

    this.filteredUsers = [...this.users];
    this.updatePagination();
  }

  // Filter users based on search query
  searchUsers() {
    this.filteredUsers = this.users.filter(
      (user) =>
        user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.fullName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    this.updatePagination();
  }

  // Open modal for creating a new account
  openModal() {
    this.showModal = true;
    this.isEditing = false;
    this.selectedUser = null;
  }

  // Close modal and reset selections
  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  // Handle account creation or update based on editing status
  onAccountCreated(newAccount: User) {
    if (this.isEditing && this.selectedUser) {
      const index = this.users.findIndex(
        (u) => u.username === this.selectedUser!.username
      );
      if (index !== -1) {
        this.users[index] = newAccount;
      }
    } else {
      this.users.push(newAccount);
    }

    this.filteredUsers = [...this.users];
    this.updatePagination();
    this.closeModal();
  }

  // Open edit mode for the selected user
  editUser(user: User) {
    this.selectedUser = { ...user };
    this.isEditing = true;
    this.showModal = true;
  }

  // Delete a specific user and update lists
  deleteUser(user: User) {
    this.users = this.users.filter((u) => u !== user);
    this.filteredUsers = this.filteredUsers.filter((u) => u !== user);
    this.updatePagination();
  }

  // Update selected users based on checkbox state
  updateSelectedUsers(user: User) {
    if (user.selected) {
      this.selectedUsers.push(user);
    } else {
      this.selectedUsers = this.selectedUsers.filter((u) => u !== user);
    }
  }

  // Toggle select all users based on main checkbox
  toggleSelectAll(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.filteredUsers.forEach((user) => {
      user.selected = isChecked;
      if (isChecked) {
        if (!this.selectedUsers.includes(user)) {
          this.selectedUsers.push(user);
        }
      } else {
        this.selectedUsers = [];
      }
    });
  }

  // Edit the first selected user, assuming only one should be edited at a time
  editSelectedUser() {
    if (this.selectedUsers.length === 1) {
      this.editUser(this.selectedUsers[0]);
    }
  }

  // Delete all selected users
  deleteSelectedUsers() {
    this.selectedUsers.forEach((user) => this.deleteUser(user));
    this.selectedUsers = [];
  }

  // Update pagination based on the filtered list of users
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    this.currentPage = 1;
  }

  // Get the users to be displayed on the current page
  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  // Navigate to the previous page
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Navigate to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Navigate to a specific page number
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Toggle row selection by clicking on the row
  toggleRowSelection(user: User) {
    user.selected = !user.selected;
    this.updateSelectedUsers(user);
  }
}
