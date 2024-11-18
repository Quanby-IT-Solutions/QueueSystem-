import { Component, EventEmitter, Input, Output, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { ConfirmationComponent } from '../../../modals/confirmation/confirmation.component';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationComponent],
  templateUrl: './change-password-modal.component.html'
})
export class ChangePasswordModalComponent {
  @Input() userId!: string;
  @Input() userRole!: string;

  @Output() closeModal = new EventEmitter<void>();
  @Output() passwordChanged = new EventEmitter<{ currentPassword: string; newPassword: string }>();

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  passwordRequirements = {
    minLength: false,
    letterAndNumber: false,
    specialCharacter: false
  };
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  showConfirmation = false;


  constructor(public API: UswagonCoreService, private renderer: Renderer2) {}

  close() {
    this.closeModal.emit();
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

 

  validatePasswordRequirements(password: string) {
    this.passwordRequirements.minLength = password.length >= 8;
    this.passwordRequirements.letterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
    this.passwordRequirements.specialCharacter = /[@$!%*?&]/.test(password);
  }

  async confirmUpdatePassword() {
    this.showConfirmation = false;
    const targetTable = this.userRole === 'desk_attendant' ? 'desk_attendants' : 'administrators';
    
    // 1. Fetch the current hashed password from the database
    const response = await this.API.read({ selectors: ['password'], tables: targetTable, conditions: `WHERE id = '${this.userId}'` });
    const currentPasswordField = document.getElementById('currentPassword');

    if (response.success && response.output && response.output.length > 0) {
        const hashedPassword = response.output[0].password;

        // 2. Verify current password
        const isPasswordValid = await this.API.verifyHash(this.currentPassword, hashedPassword);
        if (!isPasswordValid) {
            this.errorMessage = 'Current password is incorrect';
            this.API.sendFeedback('error', this.errorMessage, 5000);
            this.renderer.setStyle(currentPasswordField, 'borderColor', 'red');
            return;
        } else {
            this.renderer.setStyle(currentPasswordField, 'borderColor', 'green');
        }
    } else {
        this.errorMessage = 'Failed to retrieve current password';
        this.API.sendFeedback('error', this.errorMessage, 5000);
        return;
    }

    // 3. Hash the new password and update it in the database
    const newPasswordHash = await this.API.hash(this.newPassword);
    const updateResponse = await this.API.update({
        tables: targetTable,
        values: { password: newPasswordHash },
        conditions: `WHERE id = '${this.userId}'`
    });

    if (updateResponse.success) {
        this.passwordChanged.emit({ currentPassword: this.currentPassword, newPassword: this.newPassword });
        this.API.sendFeedback('success', 'Password updated successfully', 5000);
        this.close();
    } else {
        this.errorMessage = 'Failed to update password';
        this.API.sendFeedback('error', this.errorMessage, 5000);
    }
}

    async openConfirmation() {
        this.errorMessage = '';

        // Validation checks
        if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
            this.errorMessage = 'All fields are required';
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.errorMessage = 'New passwords do not match';
            return;
        }
        this.validatePasswordRequirements(this.newPassword);
        if (!this.passwordRequirements.minLength || !this.passwordRequirements.letterAndNumber || !this.passwordRequirements.specialCharacter) {
            this.errorMessage = 'Password does not meet the requirements';
            return;
        }

        // Show confirmation modal
        this.showConfirmation = true;
    }


  async submitForm() {
    this.errorMessage = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'All fields are required';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'New passwords do not match';
      return;
    }
    this.validatePasswordRequirements(this.newPassword);
    if (!this.passwordRequirements.minLength || !this.passwordRequirements.letterAndNumber || !this.passwordRequirements.specialCharacter) {
      this.errorMessage = 'Password does not meet the requirements';
      return;
    }
    this.showConfirmation = true;
  }

  // async submitForm() {
    
  //   this.errorMessage = '';

  //   // 1. Check if any fields are empty
  //   if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
  //     this.errorMessage = 'All fields are required';
  //     console.error('Error: All fields are required');
  //     return;
  //   }

  //   // 2. Check if new passwords match
  //   if (this.newPassword !== this.confirmPassword) {
  //     this.errorMessage = 'New passwords do not match';
  //     console.error('Error: New passwords do not match');
  //     return;
  //   }

  //   // 3. Validate password strength and update UI requirements feedback
  //   this.validatePasswordRequirements(this.newPassword);
  //   if (!this.passwordRequirements.minLength || !this.passwordRequirements.letterAndNumber || !this.passwordRequirements.specialCharacter) {
  //     this.errorMessage = 'Password does not meet the requirements';
  //     console.error('Error: Password does not meet the requirements');
  //     return;
  //   }

  //   const targetTable = this.userRole === 'desk_attendant' ? 'desk_attendants' : 'administrators';

  //   try {
  //     // 4. Fetch the current hashed password from the database
  //     const response = await this.API.read({
  //       selectors: ['password'],
  //       tables: targetTable,
  //       conditions: `WHERE id = '${this.userId}'`
  //     });

  //     const currentPasswordField = document.getElementById('currentPassword');

  //     if (response.success && response.output && response.output.length > 0) {
  //       const hashedPassword = response.output[0].password;

  //       // 5. Verify current password by comparing hashes
  //       const isPasswordValid = await this.API.verifyHash(this.currentPassword, hashedPassword);
  //       if (!isPasswordValid) {
  //         this.errorMessage = 'Current password is incorrect';
  //         console.error('Error: Current password is incorrect');
  //         this.renderer.setStyle(currentPasswordField, 'borderColor', 'red');
  //         return;
  //       } else {
  //         this.renderer.setStyle(currentPasswordField, 'borderColor', 'green');
  //       }
  //     } else {
  //       this.errorMessage = 'Failed to retrieve current password';
  //       console.error('Error: Failed to retrieve current password');
  //       return;
  //     }

  //     // 6. Hash the new password and update it in the database
  //     const newPasswordHash = await this.API.hash(this.newPassword);
  //     const updateResponse = await this.API.update({
  //       tables: targetTable,
  //       values: { password: newPasswordHash },
  //       conditions: `WHERE id = '${this.userId}'`
  //     });

  //     if (updateResponse.success) {
  //       this.passwordChanged.emit({
  //         currentPassword: this.currentPassword,
  //         newPassword: this.newPassword
  //       });
  //       console.log('Password updated successfully');
  //       this.close(); // Close the modal on success
  //     } else {
  //       this.errorMessage = 'Failed to update password';
  //       console.error('Error: Failed to update password');
  //     }
  //   } catch (error) {
  //     this.errorMessage = 'An error occurred while updating the password';
  //     console.error('Error:', error);
  //   }
  // }
}
