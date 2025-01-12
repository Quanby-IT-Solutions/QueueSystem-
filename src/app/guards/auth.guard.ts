import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';
import { UswagonAuthService } from 'uswagon-auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router, private auth:UswagonAuthService) {}

 async  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Promise<boolean | UrlTree>  {
      
    await this.auth.decodeJWT();
    const currentUser = this.auth.accountLoggedIn();
    const requiredRole = route.data['requiredRole'] ?? 'root' ;
    
    
    if (!currentUser) {
      this.router.navigate(['/login']);
      return false;
    }

    
    if(requiredRole == 'admin'){
      return ['cashier','registrar','accountant','admin','superadmin'].includes(currentUser);
    }

    if (this.checkUserRole(currentUser, requiredRole)) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }

  private checkUserRole(userRole: string, requiredRole?:string): boolean {
    return userRole == requiredRole;
  }
}