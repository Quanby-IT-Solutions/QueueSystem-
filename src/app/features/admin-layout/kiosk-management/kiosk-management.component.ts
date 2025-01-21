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

  modalType?:'anonymous'|'maintenance'|'delete'|'test-print';

  openKioskModal:boolean = false;

  actionLoading:boolean = false;

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
    'available' : 'bg-green-500',
    'maintenance' : 'bg-red-500',
    'online' : 'bg-orange-500',
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
    if(this.actionLoading) return ;
    this.actionLoading = true;
    this.API.setLoading(true);
    try{
      await this.kioskService.updateKioskStatus(item.id!,item.status == 'available' ? 'maintenance' : 'available');
      await this.closeDialog(true);
      this.API.sendFeedback('success', 'Kiosk status has been updated!',5000);
    }catch(e:any){
      this.API.sendFeedback('success', e.message,5000);
    }
    this.actionLoading =false;
  }

  async toggleAnonymous(item:Kiosk){
    if(this.actionLoading) return ;
    this.actionLoading = true;
    this.API.setLoading(true);
    try{
      await this.kioskService.updateKioskType(item.id!,item.description == 'anonymous' ? '' : 'anonymous');
      await this.closeDialog(true);
      this.API.sendFeedback('success', 'Kiosk status has been updated!',5000);
    }catch(e:any){
      this.API.sendFeedback('success', e.message,5000);
    }
    this.actionLoading =false;
  }
  async testPrint(item:Kiosk){
    if(!item.printer_ip?.trim()){
      this.API.sendFeedback('error', 'Please set printer IP!',5000);
      return;
    }
    this.kioskService.thermalPrint({
      printer_ip: item.printer_ip,
      number:'TEST PRINT',
      date: new Date().toLocaleDateString(),
      time:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      services: ['Test Print'],
      type:'Sample Client'
    })
    this.API.sendFeedback('success', `Sent test print on ${item.printer_ip}`,5000);
    this.selectedKiosk = undefined;
    this.modalType = undefined;
  }
  async deleteKiosk(item:Kiosk){
    this.API.setLoading(true);
    try{
      await this.kioskService.deleteKiosk(item.id!);
      await this.closeDialog(true);
      this.API.sendFeedback('success', 'Kiosk has been deleted!',5000);
    }catch(e:any){
      this.API.sendFeedback('success', e.message,5000);
    }
  }

  selectKiosk(item:Kiosk){
    this.selectedKiosk = item;
  }

  

  openDialog(type:'maintenance'|'delete'|'anonymous'|'test-print'){
    this.modalType = type;
  }
  async closeDialog(shouldRefresh:boolean){
    const fromKiosk = this.openKioskModal;
    this.openKioskModal = false;
    this.modalType = undefined;
    if(shouldRefresh){
      this.API.setLoading(true);
      this.kiosks = (await this.kioskService.getAllKiosks(this.selectedDivision!));
      this.API.setLoading(false);
    }
    if(fromKiosk && shouldRefresh){
      if(this.selectedKiosk){
        this.API.sendFeedback('success', 'Kiosk has been updated!',5000);
      }else{
        this.API.sendFeedback('success', 'New kiosk has been added!',5000);
      }
    }
  }

}
