import { Component } from '@angular/core';
import { CreateServiceComponent } from './modals/create-service/create-service.component';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Division, Service, SubService } from './types/service.types';
import { DivisionService } from '../../../services/division.service';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { ServiceService } from '../../../services/service.service';
import { CreateSubServiceComponent } from './modals/create-sub-service/create-sub-service.component';
import { SetNextStepComponent } from "./modals/set-next-step/set-next-step.component";
import { ServiceTerminalComponent } from './modals/service-terminal/service-terminal.component';
import { TerminalService } from '../../../services/terminal.service';
import { Terminal } from '../terminal-management/types/terminal.types';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LottieAnimationComponent, ConfirmationComponent, CreateServiceComponent, CreateSubServiceComponent, SetNextStepComponent, ServiceTerminalComponent],
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.css'
})
export class ServiceManagementComponent {
  
  
  divisions:Division[]=[];
  selectedDivision?:string;

  services: Service[]=[];
  terminals: Terminal[]=[];
  subServices: SubService[]=[];
  allSubServices: SubService[]=[];

  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedService?:Service;
  selectedSubService?:SubService;
  

  

  modalType?:'maintenance'|'delete'|'step'|'create'|'create-sub'|'terminals';

  openServiceModal:boolean = false;
  openSubServiceModal:boolean = false;

  // Injecting ChangeDetectorRef to trigger manual change detection
  constructor(
    private divisionService:DivisionService,
    private terminalService:TerminalService,
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private serviceService:ServiceService) {}
  ngOnInit(): void {
    this.loadContent();
  }


  getSubServiceName(id?:string){
    if(id){
      const sub = this.allSubServices.find(s=>s.id == id);
      return sub?.name;
    }else{
      return null;
    }
  }

  getServiceTerminals(terminal_ids:string){
    if(terminal_ids){
      return this.terminals.filter(t=>terminal_ids.includes(t.id)).map(t=> `Terminal ${t.number}`).join(', ');
    }else{
      return null;
    }
  }


  
  
  getSubServiceDetails(service?:SubService){
    if(!service)return{};
    if(service.description){
      try{
        return JSON.parse(service.description);
      }catch(e){
        return {}
      }
    }else{
      return {};
    }
  }


  async closeNextStep(reload:boolean){
    this.modalType = undefined;
    if(!reload) return;
    this.API.setLoading(true);
    this.services = (await this.serviceService.getAllServices(this.selectedDivision!));
    this.subServices = (await this.serviceService.getSubServices(this.serviceOpen?.id!));
    this.API.sendFeedback('success', 'Service forward to has updated!',5000);
    this.API.setLoading(false);
  }
  async closeServiceTerminals(reload:boolean){
    this.modalType = undefined;
    if(!reload) return;
    this.API.setLoading(true);
    this.services = (await this.serviceService.getAllServices(this.selectedDivision!));
    this.subServices = (await this.serviceService.getSubServices(this.serviceOpen?.id!));
    this.API.sendFeedback('success', 'Service terminals to has updated!',5000);
    this.API.setLoading(false);
  }

  async loadContent(){
    this.API.setLoading(true);
    this.selectedDivision =(await this.divisionService.getDivision())?.id;
    this.divisions =(this.divisionService.divisions) as Division[];
    this.allSubServices = await this.serviceService.getAllSubServices();
    this.services = (await this.serviceService.getAllServices(this.selectedDivision!));
    this.terminals = (await this.terminalService.getAllTerminals())
    this.API.setLoading(false);    
  }

  async selectDivision(division:Division){
    this.selectedDivision = division.id;
    this.divisionService.setDivision(division)
    this.API.setLoading(true);
    this.serviceOpen = undefined;
    this.services = (await this.serviceService.getAllServices(division.id));
    this.terminals = (await this.terminalService.getAllTerminals())
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
  

  addService(){
    this.selectedService = {
      name:'',
    };
    this.openDialog('create')
  }
  addSubService(){
    this.selectedSubService = {
      name:'',
      service_id: this.serviceOpen?.id
    };
    this.openDialog('create-sub')
  
  }

  updateService(event: MouseEvent,service:Service){
    event.stopPropagation();
    this.selectedService = service;
    this.openServiceModal = true;
  }
  updateSubService(service:SubService){
    this.selectedSubService = service;
    this.openSubServiceModal = true;
  }

  async deleteService(){
    this.API.setLoading(true);
    try{
      if(this.selectedService){
        await this.serviceService.deleteService(this.selectedService?.id!);
      }else{
        await this.serviceService.deleteSubService(this.selectedSubService?.id!);
      }
      await this.closeDialog(true);
    }catch(e:any){
      this.API.sendFeedback('error', e.message,5000);
    }
  }

  serviceOpen?:Service;

  async openService(service:Service){
    this.API.setLoading(true);
    this.serviceOpen = service;
    this.subServices = await this.serviceService.getSubServices(service.id!);
    this.API.setLoading(false);
  }

  closeService(){
    this.serviceOpen = undefined;
    this.subServices = [];
  }


  selectService(event:MouseEvent,item:Service){
    event.stopPropagation();
    this.selectedService = item;
    this.openDialog('delete');
  }
  selectSubService(item:SubService){
    this.selectedSubService = item;
  }

  

  openDialog(type:'maintenance'|'delete'|'step'|'create'|'create-sub'|'terminals'){
    this.modalType = type;
  }
  async closeDialog(shouldRefresh:boolean){
    const fromService = this.selectedService != undefined;
    const fromSubService = this.selectedSubService != undefined
    const fromCreate = this.selectedService?.id != undefined || this.selectedSubService?.id != undefined;
    const modalType = this.modalType;
    this.selectedService = undefined;
    this.selectedSubService = undefined;
    this.modalType = undefined;
    if(shouldRefresh){
      this.API.setLoading(true);
      if(fromService){
        this.services = (await this.serviceService.getAllServices(this.selectedDivision!));
        if(modalType != 'delete'){
          if(fromCreate ){
            this.API.sendFeedback('success', 'Category has been updated!',5000);
          }else{
            this.API.sendFeedback('success', 'New category has been added!',5000);
          }
        }else{
          this.API.sendFeedback('success', 'Category has been deleted!',5000);
        }
      }
      if(fromSubService){
        this.subServices = (await this.serviceService.getSubServices(this.serviceOpen?.id!));
        if(modalType != 'delete'){
          if(fromCreate){
            this.API.sendFeedback('success', 'Service has been updated!',5000);
          }else{
            this.API.sendFeedback('success', 'New service has been added!',5000);
          }
        }else{
          this.API.sendFeedback('success', 'Service has been deleted!',5000);
        }
      }
      this.API.setLoading(false);
    }

  }
}
