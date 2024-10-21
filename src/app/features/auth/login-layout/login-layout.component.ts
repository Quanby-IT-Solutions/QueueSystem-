import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UswagonAuthModule, UswagonAuthService } from 'uswagon-auth';
import { environment } from '../../../../environment/environment';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [RouterModule, UswagonAuthModule, LottieAnimationComponent, CommonModule],
  templateUrl: './login-layout.component.html',
  styleUrls: ['./login-layout.component.css']
})
export class LoginLayoutComponent implements OnInit {
  username: string = '';
  password: string = '';
  roles: any[] = [
    { name: 'Admin', route: '/login', role: 'admin', tabindex: 0 },
    { name: 'Kiosk', route: '/kiosk', role: 'kiosk', tabindex: 1 },
    { name: 'Desk Attendant', route: '/login', role: 'desk_attendants', tabindex: 2 },
    { name: 'Queue Display', route: '/queueing-display', role: 'queue_display', tabindex: 3 }
  ];
  selectedRole: any;
  returnUrl: string = '/';

  borderColorMap={
    success: 'border-green-600/40',
    warning:'border-yellow-600/40',
    error:'border-red-600/40',
    neutral: 'border-gray-600/40',
  }
  bgColorMap={
    success: 'bg-green-600',
    warning:'bg-yellow-600',
    error:'bg-red-600',
    neutral: 'bg-black',
  }
  lottieMap={
    success: 'check',
    warning:'yellowWarning',
    error:'warning',
    neutral: 'confirmation'
  }


  getAuthFeedback(){
    return this.auth.snackbarFeedback;
  }

  closeFeedback(){
    this.auth.closeSnackbar();
  }

  constructor(
    private route:ActivatedRoute,
    private router: Router, private auth:UswagonAuthService) {}

  ngOnInit(): void {
    const userole = this.auth.accountLoggedIn();

    if(userole == 'desk_attendants'){
      this.router.navigate(['/desk-attendant/dashboard']);
    }
    if(userole != null){
      this.router.navigate(['/admin/dashboard']);
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.selectedRole = this.route.snapshot.queryParams['role'] || '';
    if(this.selectedRole ==  'desk_attendants'){
      this.auth.initialize({api:environment.api, apiKey: environment.apiKey, loginTable:['desk_attendants'],
        app:environment.app, 
          redirect:  {'desk_attendants': '/desk-attendant',}
  
      });
    }
    if(this.selectedRole == 'admin'){
      this.auth.initialize({api:environment.api, apiKey: environment.apiKey, loginTable:['administrators'],
        app:environment.app, 
          redirect:{
            'superadmin': '/admin/dashboard',
            'registrar': '/admin/dashboard',
            'accountant': '/admin/dashboard',
            'cashier': '/admin/dashboard',
          } 
  
      });
    }
    
  }

  updateRole(roleName: string): void {
    const role = this.roles.find(r => r.name === roleName);
    if (role) {
      this.selectedRole = role;
      this.setTabIndexes(role.tabindex);
      console.log(`Selected Role: ${role.name}`); // Log the role name to the console
      this.router.navigate([role.route], {
        queryParams: { role: role.role } // Ensure the correct role is passed
      });
    }
  }
  

  login(){
    this.auth.login();
  }

  setTabIndexes(selectedTabIndex: number) {
    this.roles.forEach(role => {
      role.tabindex = role.tabindex === selectedTabIndex ? 0 : -1;
    });
  }
}
