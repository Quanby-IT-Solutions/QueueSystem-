import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UswagonAuthModule, UswagonAuthService } from 'uswagon-auth';
import { environment } from '../../../../environment/environment';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { config } from '../../../../environment/config';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LogsService } from '../../../services/logs.service';

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [RouterModule, UswagonAuthModule, LottieAnimationComponent, CommonModule,FormsModule],
  templateUrl: './login-layout.component.html',
  styleUrls: ['./login-layout.component.css']
})
export class LoginLayoutComponent implements OnInit, AfterViewInit {
  @ViewChild('youtubePlayer') youtubePlayer!: ElementRef;
  videoUrl: SafeResourceUrl;
  private player: any;
  isMuted = false;

  isVideoLoading = true;
  videoError = false;

[x: string]: any;

  config = config


  rememberMe:boolean = false;

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
    private router: Router, private auth:UswagonAuthService,
    public sanitizer: DomSanitizer) {
  // Set up video URL with high quality parameters
  const videoId = 'QsXz0Lh2WKo';
  const url = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${videoId}&controls=0&vq=hd1080&hd=1&modestbranding=1`;
  this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    ngAfterViewInit() {
      // Load YouTube API
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }

      // Initialize player when API is ready
      (window as any).onYouTubeIframeAPIReady = () => {
        this.player = new (window as any).YT.Player(this.youtubePlayer.nativeElement, {
          height: '100%',
          width: '100%',
          playerVars: {
            'autoplay': 1,
            'controls': 0,
            'loop': 1,
            'playlist': 'Ze_zzC7mu-4',
            'modestbranding': 1,
            'vq': 'hd1080', // Force HD quality
            'hd': 1,        // Enable HD mode
            'enablejsapi': 1
          },
          events: {
            'onReady': (event: any) => {
              // Set quality to highest available
              event.target.setPlaybackQuality('hd1080');
              event.target.setVolume(100); // Set to maximum volume
              event.target.playVideo();
            },
            'onPlaybackQualityChange': (event: any) => {
              // Force highest quality again if it changes
              const qualities = event.target.getAvailableQualityLevels();
              if (qualities.length > 0) {
                event.target.setPlaybackQuality(qualities[0]); // First quality is usually highest
              }
            }
          }
        });
      };
    }

    // Optional: Function to force HD quality
    forceHDQuality() {
      if (this.player) {
        const qualities = this.player.getAvailableQualityLevels();
        if (qualities.length > 0) {
          this.player.setPlaybackQuality(qualities[0]);
        }
      }
    }


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
    // this.selectedRole = 'desk_attendants';
    if(this.selectedRole ==  'desk_attendants'){
      this.auth.initialize({api:environment.api, 
          apiKey: environment.apiKey, loginTable:['desk_attendants'],
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

  openExternalLink(link:string) {
    alert();
    window.open(link, '_blank');
  }

  openExternalMap(){
    const address = 'Visayas State University Visca Baybay City, Leyte';
    const formattedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${formattedAddress}`;
    window.open(url, '_blank');
  }

  async login(){
    this.auth.closeSnackbar();
    if(this.rememberMe){
      this.auth.useLocalStorage();
    }else{
      this.auth.useSessionStorage();
    }
    await this.auth.login();

 
  }

  setTabIndexes(selectedTabIndex: number) {
    this.roles.forEach(role => {
      role.tabindex = role.tabindex === selectedTabIndex ? 0 : -1;
    });
  }

  lightenHexColor(hex: string, percent: number): string {
    // Remove the hash symbol if present
    hex = hex.replace(/^#/, '');

    // Convert the hex to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Lighten each color channel
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    // Convert back to hex
    const newHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    return newHex;
}
}
