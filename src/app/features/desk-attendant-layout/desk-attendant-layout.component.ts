import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { LottieAnimationComponent } from '../../shared/components/lottie-animation/lottie-animation.component';
import { CommonModule } from '@angular/common';
import { UswagonCoreService } from 'uswagon-core';
import { Subscription } from 'rxjs';
import { SnackbarComponent } from '../../shared/snackbar/snackbar.component';
import { UswagonAuthService } from 'uswagon-auth';
import { LogsService } from '../../services/logs.service';

@Component({
  selector: 'app-desk-attendant-layout',
  standalone: true,
  imports: [SidebarComponent,RouterOutlet,HeaderComponent, LottieAnimationComponent,CommonModule,SnackbarComponent],
  templateUrl: './desk-attendant-layout.component.html',
  styleUrl: './desk-attendant-layout.component.css'
})
export class DeskAttendantLayoutComponent {
  constructor(private route: ActivatedRoute, 
    private auth:UswagonAuthService,
    private logService:LogsService,
    private API:UswagonCoreService,private cdr: ChangeDetectorRef){}
  role = this.route.snapshot.data['requiredRole'];
  isLoading:boolean= false;
  loading$?:Subscription;
  ngOnInit(): void {
    this.logService.pushLog('da-visit', `visited desk portal.`)
     this.loading$ = this.API.isLoading$.subscribe(loading=>{
      this.isLoading=loading;
      this.cdr.detectChanges();
    })
    this.API.sendFeedback('success',`Hi, ${this.auth.getUser().fullname} 👋`,5000)
    this.API.addSocketListener('get-out', (message)=>{
      if(message.event =='get-out'){
        this.API.sendFeedback('error','You have been logged out by another user of this account.');
        this.auth.logout();
      }      
    });
    this.API.socketSend({
      event: 'get-out',
      id: this.auth.getUser().id
    });
  }

  showUploadProgress(){
    return this.API.uploadProgress;
  }

  ngOnDestroy(): void {
    this.loading$!.unsubscribe();
  }

}
