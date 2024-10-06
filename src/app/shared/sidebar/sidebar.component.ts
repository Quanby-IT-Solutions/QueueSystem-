import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UswagonAuthModule } from 'uswagon-auth';

interface MenuItem {
  title: string;
  route: string;
  active: boolean;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule,UswagonAuthModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  appTitle = 'Visayas State University';
  isExpanded = true;
  isMobile = false;

  private router = inject(Router);
  
  menuItems: MenuItem[] = [
    { title: 'Dashboard', route: '/admin/dashboard', active: true, icon: 'dashboard' },
    { title: 'Content Management', route: '/admin/content-management', active: false, icon: 'content_paste' },
    { title: 'User Management', route: '/admin/user-management', active: false, icon: 'people' },
    { title: 'Terminal', route: '/admin/terminal', active: false, icon: 'computer' },
    { title: 'Kiosk Management', route: '/admin/kiosk-management', active: false, icon: 'touch_app' }
  ];

  ngOnInit() {
    this.checkScreenSize();
    this.updateActiveItem();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveItem();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.isExpanded = !this.isMobile;
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }

  setActiveItem(index: number): void {
    this.menuItems.forEach(item => item.active = false);
    this.menuItems[index].active = true;
    this.router.navigate([this.menuItems[index].route]);
    if (this.isMobile) {
      this.isExpanded = false;
    }
  }

  private updateActiveItem(): void {
    const currentRoute = this.router.url;
    this.menuItems.forEach(item => {
      item.active = this.router.isActive(item.route, {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      });
    });
  }

  logout(): void {
    // Implement your logout logic here
    this.router.navigate(['/login']);
  }
}