import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { ContentService } from '../../services/content.service';

interface UserData {
  id: string;
  fullname: string;
  profile?: string;
  division_name?: string;
  role: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  divisionLogo?: string;
  isDropdownOpen = false;
  userData: UserData | null = null;
  private documentClickListener: (event: MouseEvent) => void;

  @ViewChild('dropdownMenu') dropdownMenuRef: ElementRef | undefined;

  constructor(
    private router: Router,
    private contentService: ContentService,
    private auth: UswagonAuthService,
    private API: UswagonCoreService
  ) {
    this.documentClickListener = this.handleDocumentClick.bind(this);
  }

  ngOnInit(): void {
    this.loadUserData();
    document.addEventListener('click', this.documentClickListener);
  }

  ngAfterViewInit(): void {
    // Removed gsap animation
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.documentClickListener);
  }

  private handleDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    if (this.isDropdownOpen) {
      const dropdownMenu = this.dropdownMenuRef?.nativeElement;
      const profileButton = document.querySelector('[data-profile-button]');
      if (!dropdownMenu?.contains(targetElement) && !profileButton?.contains(targetElement)) {
        this.closeDropdown();
      }
    }
  }

  getUserProfile() {
    return this.userData?.profile
      ? this.API.getFileURL(this.userData.profile)
      : 'assets/images/noprofile.png';
  }

  getUserName() {
    return this.userData?.fullname ?? 'Unknown User';
  }

  getUserId() {
    return this.auth.getUser().id ?? 'Unknown User ID';
  }

  getUserDivision() {
    const roleDivisionMap: { [key: string]: string } = {
      registrar: 'Registrar Division',
      cashier: 'Cash Division',
      accountant: 'Accounting Division',
      superadmin: 'Administrator Division',
      desk_attendant: 'Desk Attendant Division'
    };
  
    const userRole = this.auth.getUser().role || 'desk_attendant';
    return roleDivisionMap[userRole] || this.userData?.division_name || 'Unknown Division';
  }
  
  async loadUserData() {
    const userId = this.getUserId();
    const userRole = this.auth.getUser().role || 'desk_attendant';
    const targetTable = userRole === 'superadmin' || ['admin', 'cashier', 'accountant', 'registrar'].includes(userRole)
      ? 'administrators'
      : 'desk_attendants';
  
    try {
      const response = await this.API.read({
        selectors: [`${targetTable}.*, divisions.name AS division_name`],
        tables: `${targetTable}, divisions`,
        conditions: `WHERE ${targetTable}.id = '${userId}' AND ${targetTable}.division_id = divisions.id`
      });
  
      console.log('API response:', response);
  
      if (response.success && response.output && response.output.length > 0) {
        this.userData = response.output[0];
        console.log('User data loaded:', this.userData);
  
        // Ensure role is set to 'desk_attendant' if undefined
        if (this.userData && !this.userData.role) {
          this.userData.role = 'desk_attendant';
        }
      } else {
        console.error('Failed to load user data:', response.output);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
  
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  openDropdown() {
    const dropdownElement = this.dropdownMenuRef?.nativeElement;
    // if (dropdownElement) {
    //   dropdownElement.classList.add('open');
    //   gsap.to(dropdownElement, {
    //     opacity: 1,
    //     y: 0,
    //     duration: 0.4,
    //     ease: 'power3.out',
    //     onStart: () => {
    //       dropdownElement.style.zIndex = '100';
    //       dropdownElement.style.pointerEvents = 'auto';
    //       dropdownElement.style.display = 'block';
    //     }
    //   });
    // }
  }

  closeDropdown() {
    const dropdownElement = this.dropdownMenuRef?.nativeElement;
    // if (dropdownElement) {
    //   gsap.to(dropdownElement, {
    //     opacity: 0,
    //     y: -10,
    //     duration: 0.3,
    //     ease: 'power3.in',
    //     onComplete: () => {
    //       dropdownElement.classList.remove('open');
    //       dropdownElement.style.pointerEvents = 'none';
    //       dropdownElement.style.zIndex = '1';
    //       dropdownElement.style.display = 'none';
    //     }
    //   });
    // }
    this.isDropdownOpen = false;
  }

  navigateToProfile(event: Event) {
    event.preventDefault();
  
    if (this.userData?.role === 'desk_attendant') {
      this.router.navigate(['/desk-attendant/profile'])
        .then(() => this.closeDropdown())
        .catch(err => console.error('Navigation Error:', err));
    } else if (this.userData?.role === 'superadmin') {
      this.router.navigate(['/admin/profile'])
        .then(() => this.closeDropdown())
        .catch(err => console.error('Navigation Error:', err));
    } else if (['cashier', 'accountant', 'registrar'].includes(this.userData?.role || '')) {
      this.router.navigate(['/admin/profile'])
        .then(() => this.closeDropdown())
        .catch(err => console.error('Navigation Error:', err));
    } else {
      console.warn('Unknown role, no specific route defined');
    }
  }
}
