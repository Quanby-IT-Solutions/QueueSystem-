import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { ContentService } from '../../../services/content.service';
import { UswagonAuthService } from 'uswagon-auth';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { KioskService } from '../../../services/kiosk.service';
import { CreateKioskComponent } from './modals/create-kiosk/create-kiosk.component';
import { DivisionService } from '../../../services/division.service';
import { Division, Kiosk } from './types/kiosks.types';


@Component({
  selector: 'app-a-kiosk-management',
  templateUrl: './kiosk-management.component.html',
  styleUrls: ['./kiosk-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, LottieAnimationComponent, ConfirmationComponent,CreateKioskComponent]
})
export class KioskManagementComponent implements OnInit {


  divisions:Division[]=[];
  selectedDivision?:string;

  kiosks: Kiosk[]=[];
  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedKiosk?:Kiosk;

  modalType?:'maintenance'|'delete';

  openKioskModal:boolean = false;

  // Injecting ChangeDetectorRef to trigger manual change detection
  constructor(
    private divisionService:DivisionService,
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private kioskService:KioskService, private contentService:ContentService) {}
  ngOnInit(): void {
    this.loadContent();
  }

  async loadContent(){
    this.API.setLoading(true);
    this.selectedDivision =(await this.divisionService.getDivision())?.id;
    this.divisions =(this.divisionService.divisions) as Division[];

    this.kiosks = (await this.kioskService.getAllKiosks(this.selectedDivision!));
    this.API.setLoading(false);    
  }

  async selectDivision(division:Division){
    this.selectedDivision = division.id;
    this.divisionService.setDivision(division)
    this.API.setLoading(true);
    this.kiosks = (await this.kioskService.getAllKiosks(division.id));
    this.API.setLoading(false);
  }

  statusMap:any = {
    'available' : 'bg-orange-500',
    'maintenance' : 'bg-red-500',
    'online' : 'bg-green-500',
  }

  capitalizeFirstLetters(input: string): string {
    return input
      .split(' ') // Split the string into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' '); // Join the words back into a single string
  }
  

  addKiosk(){
    this.selectedKiosk = undefined;
    this.openKioskModal = true;
  }

  updateKiosk(kiosk:Kiosk){
    this.selectedKiosk = kiosk;
    this.openKioskModal = true;
  }

  async toggleMaintenance(item:Kiosk){
    this.API.setLoading(true);
    await this.kioskService.updateKioskStatus(item.id!,item.status == 'available' ? 'maintenance' : 'available');
    await this.closeDialog(true);
  }
  async deleteKiosk(item:Kiosk){
    this.API.setLoading(true);
    await this.kioskService.deleteKiosk(item.id!);
    await this.closeDialog(true);
  }

  selectKiosk(item:Kiosk){
    this.selectedKiosk = item;
  }

  

  openDialog(type:'maintenance'|'delete'){
    this.modalType = type;
  }
  async closeDialog(shouldRefresh:boolean){
    this.openKioskModal = false;
    this.modalType = undefined;
    if(shouldRefresh){
      this.API.setLoading(true);
      this.kiosks = (await this.kioskService.getAllKiosks(this.selectedDivision!));
      this.API.setLoading(false);
    }
  }

}
