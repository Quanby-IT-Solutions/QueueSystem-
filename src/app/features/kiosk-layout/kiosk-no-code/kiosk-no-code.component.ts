import { ChangeDetectorRef, Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { Division } from '../types/kiosk-layout.types';
import { DivisionService } from '../../../services/division.service';
import { ContentService } from '../../../services/content.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UswagonCoreService } from 'uswagon-core';
import { KioskService } from '../../../services/kiosk.service';
import { environment } from '../../../../environment/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kiosk-no-code',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kiosk-no-code.component.html',
  styleUrl: './kiosk-no-code.component.css'
})
export class KioskNoCodeComponent {
  content: any;
  isLoading: boolean = true;
  loading$?: Subscription;
  contentIndex: number = 0;
  divisions: Division[] = [];
  selectedDivision?: string;

  constructor(
    private divisionService: DivisionService,
    private contentService: ContentService,
    private API:UswagonCoreService,
    private route: ActivatedRoute,
    private kioskService:KioskService,
    private cdr:ChangeDetectorRef,
    private router:Router
  ) {}

  ngOnInit(): void {

    this.loading$ = this.API.isLoading$.subscribe(loading => {
      this.isLoading = loading;
      this.cdr.detectChanges();
    });

    this.contentIndex = this.route.snapshot.queryParams['reset'];

    if (this.contentIndex != null) {
      localStorage.removeItem('kiosk');
    }

    this.loadContents();

    // Listen for updates
    this.API.addSocketListener('content-changes', (data: any) => {
      if (data.event !== 'content-changes') return;
      this.loadContents();
    });
  }

  ngOnDestroy(): void {
    this.loading$?.unsubscribe();
  }

  async selectDivision(division_id: string) {

    if(division_id == environment.accountant){
      await this.kioskService.kioskLogin('accounting');
      this.router.navigate(['/kiosk/forms']);
    }
    if(division_id == environment.registrar){
      await this.kioskService.kioskLogin('registrar');
      this.router.navigate(['/kiosk/forms']); 
    }
    
    if(division_id == environment.cashier){
      await this.kioskService.kioskLogin('cashier');
      this.router.navigate(['/kiosk/forms']);
    }
  
  }

  contentMap: any = {};

  async loadContents(): Promise<void> {
  
    this.API.setLoading(true);
    this.divisions = await this.divisionService.getDivisions();
    const contents = await this.contentService.getContentSettings();

    this.contentMap = contents.reduce((prev: any, item: any) => {
      return { ...prev, [item.division_id]: item };
    }, {});

    if (this.selectedDivision) {
      this.content = this.contentMap[this.selectedDivision];
    }
    this.API.setLoading(false);
  }

}
