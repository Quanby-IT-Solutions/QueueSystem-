import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KioskService } from '../services/kiosk.service';

export const kioskGuard: CanActivateFn = (route, state) => {
  
  const kioskService = inject(KioskService);
  const router = inject(Router);

  if( route.queryParamMap.get('reset')){
    sessionStorage.removeItem('kiosk');
  }

  const kiosk = sessionStorage.getItem('kiosk');
  if(kiosk){
    kioskService.kiosk = JSON.parse(kiosk) as any;
  }
  if(route.url.toString().includes('selection')){
    if(kiosk){
      router.navigate(['/kiosk/forms'],{ queryParams: { department: kioskService.kiosk!.division } });

    }
  }
  
  if(route.url.toString().includes('forms')){
    if(!kiosk){
      router.navigate(['/kiosk/selection']);
    }
  }

  

  return true;
};
