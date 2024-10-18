import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalService } from '../../../services/terminal.service';
import { ContentService } from '../../../services/content.service';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';

// Interface defining the structure of a Counter object


interface Terminal{
  id:string;
  division_id:string;
  number:string;
  status:string;  
  start_time?:string;
  end_time?:string;
  attendant?:string;
}

interface Division{
  id:string;
  name:string;
}

@Component({
  selector: 'app-terminal-management',  // Component selector used in templates
  templateUrl: './terminal-management.component.html',  // HTML template for the component
  styleUrls: ['./terminal-management.component.css'],  // CSS for the component
  standalone: true,  // Allows the component to be used without being declared in a module
  imports: [CommonModule,LottieAnimationComponent, ConfirmationComponent]  // Importing CommonModule to use Angular common directives
})
export class TerminalManagementComponent implements OnInit {



  divisions:Division[]=[];
  selectedDivision?:string;

  terminals: Terminal[]=[];


  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedTerminal?:Terminal;

  // Injecting ChangeDetectorRef to trigger manual change detection
  constructor(private cdr: ChangeDetectorRef, 
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private terminalService:TerminalService, private contentService:ContentService) {}
  ngOnInit(): void {
    this.loadContent();
  }

  async loadContent(){
    this.API.setLoading(true);
    this.divisions =(await this.contentService.getDivisions()) as Division[];
    if(this.isSuperAdmin){
      this.selectedDivision = this.divisions[0].id;
    }else{
      this.selectedDivision = this.auth.getUser().division_id;
    }
    this.terminals = (await this.terminalService.getAllTerminals(this.selectedDivision!));
    this.API.setLoading(false);    
  }

  async selectDivision(id:string){
    this.selectedDivision = id;
    this.API.setLoading(true);
    this.terminals = (await this.terminalService.getAllTerminals(id));
    this.API.setLoading(false);
  }

  statusMap:any = {
    'available' : 'bg-orange-500',
    'maintenance' : 'bg-red-500',
    'active' : 'bg-green-500',
  }

  capitalizeFirstLetters(input: string): string {
    return input
      .split(' ') // Split the string into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' '); // Join the words back into a single string
  }
  

  async addTerminal(){
    this.API.setLoading(true);
    await this.terminalService.addTerminal(this.selectedDivision!);
    this.terminals = (await this.terminalService.getAllTerminals(this.selectedDivision!));
    this.API.setLoading(false);
  }

  async toggleMaintenance(terminal:Terminal){
    this.closeDialog();
    this.API.setLoading(true);
    await this.terminalService.updateTerminalStatus(terminal.id,terminal.status == 'available' ? 'maintenance' : 'available');
    this.terminals = (await this.terminalService.getAllTerminals(this.selectedDivision!));
    this.API.setLoading(false);
  }
  async deleteTerminal(terminal:Terminal){
    this.closeDialog();
    this.API.setLoading(true);
    await this.terminalService.deleteTerminal(terminal.id);
    this.terminals = (await this.terminalService.getAllTerminals(this.selectedDivision!));
    this.API.setLoading(false);
  }

  selectTerminal(terminal:Terminal){
    this.selectedTerminal = terminal;
  }

  modalType?:'maintenance'|'delete';

  openDialog(type:'maintenance'|'delete'){
    this.modalType = type;
  }
  closeDialog(){
    this.modalType = undefined;
  }

  

  
}
