import { Component, HostListener, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UswagonAuthModule, UswagonAuthService } from 'uswagon-auth';
import { ConfirmationComponent } from '../modals/confirmation/confirmation.component';
import { TerminalService } from '../../services/terminal.service';
import { config } from '../../../environment/config';
import { LogsService } from '../../services/logs.service';
import { UserService } from '../../services/user.service';

interface MenuItem {
  title: string;
  route: string;
  active: boolean;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule,ConfirmationComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  appTitle =  config.texts.atitle;
  appDescription = 'Queue Management System';
  isExpanded = true;
  logoutOpen = false;
  isMobile = false;

  constructor(private logService:LogsService){}


  @Input() role: string = 'admin';

  private router = inject(Router);

  private auth = inject(UswagonAuthService);

  private user = inject(UserService);

  private terminalService = inject(TerminalService);

  menuItems: MenuItem[] = []

  ngOnInit() {
    this.menuItems = this.role =='admin'? [
      { title: 'Dashboard', route: '/admin/dashboard', active: true, icon: 'dashboard' },
      { title: 'Content Management', route: '/admin/content-management', active: false, icon: 'content_paste' },
      // { title: 'User Management', route: '/admin/user-management', active: false, icon: 'people' },
      // { title: 'Terminal Management', route: '/admin/terminal', active: false, icon: 'computer' },
      // { title: 'Kiosk Management', route: '/admin/kiosk-management', active: false, icon: 'touch_app' },
      // { title: 'Service Management', route: '/admin/service-management', active: false, icon: 'description' },
      // { title: 'Format Management', route: '/admin/format-management', active: false, icon: 'tag' },
    ]: [
      { title: 'Dashboard', route: '/desk-attendant/dashboard', active: true, icon: 'dashboard' },
      { title: 'Terminal', route: '/desk-attendant/terminalmgmt', active: false, icon: 'computer' },
    ];

    if(this.auth.accountLoggedIn()=='superadmin'){
      this.menuItems.push(
         { title: 'Department Management', route: '/admin/branch-management', active: false, icon: 'apartment' }
      )
    }
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

  openLogoutModal(){
    this.logoutOpen = true;
  }

  closeLogoutModal(){
    this.logoutOpen = false;
  }

  logout(){
    this.logService.pushLog('user-logout', 'logged out.');
    this.terminalService.terminateTerminalSession();
    this.user.lastLogin = this.auth.getUser().role;
    this.auth.logout();
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


}
