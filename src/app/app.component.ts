import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UswagonCoreService } from 'uswagon-core';
import { environment } from '../environment/environment';
import { SnackbarComponent } from './shared/snackbar/snackbar.component';
import { UswagonAuthService } from 'uswagon-auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SnackbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'VSUQSM';
  constructor(
    private auth:UswagonAuthService,
    private API:UswagonCoreService){
    this.API.initialize({
      ...environment,
      loaderDelay: 500,
    })
    this.auth.initialize({
      api:environment.api, apiKey: environment.apiKey, loginTable:['administrators'],
      app:environment.app,
        redirect:{
          'desk_attendants': '/desk-attendant',
          'superadmin': '/admin/dashboard',
          'registrar': '/admin/dashboard',
          'accountant': '/admin/dashboard',
          'cashier': '/admin/dashboard',
          'admin': '/admin/dashboard',
        }

    });
  }
}
