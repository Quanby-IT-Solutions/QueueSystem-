//kiosk-forms.component.ts
import { AfterViewInit, Component, ElementRef, model, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule,  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import { UswagonCoreService } from 'uswagon-core';
import { QueueService } from '../../../services/queue.service';
import { KioskService } from '../../../services/kiosk.service';
import { DivisionService } from '../../../services/division.service';
import { FeedbackComponent } from '../../../shared/modals/feedback/feedback.component';
import { ServiceService } from '../../../services/service.service';
import { Department, Division, Service, SubService } from '../types/kiosk-layout.types';
import { DepartmentService } from '../../../services/department.service';
import { SnackbarComponent } from '../../../shared/snackbar/snackbar.component';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { config } from '../../../../environment/config';
import { ContentService } from '../../../services/content.service';
import { FormatService } from '../../../services/format.service';
import { Format } from '../../admin-layout/format-management/types/format.types';
import { VirtualKeyboardComponent } from './virtual-keyboard.component';


@Component({
  selector: 'app-kiosk-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, FeedbackComponent,SnackbarComponent,ConfirmationComponent, LottieAnimationComponent,  VirtualKeyboardComponent],
  templateUrl: './kiosk-forms.component.html',
  styleUrls: ['./kiosk-forms.component.css']
})
export class KioskFormsComponent implements OnInit, OnDestroy, AfterViewInit {
  [x: string]: any;

  departmentName: string = '';
  currentPeriod: string = 'AM';
  currentDate: Date = new Date();
  isChecklistVisible: boolean = false;
  isFormVisible: boolean = false;
  showModal: boolean = false;
  showKeyboard = false;
  activeInput: 'name' | 'studentNumber' | null = null;
  queueNumber: string | null = null;
  selectedServices: Service[] = [];
  selectedType: 'regular' | 'priority'|string = 'regular';
  customerName: string = '';
  group: string = '';
  gender: string = '';
  department: string = '';
  studentNumber: string = '';

  services:Service[]= [];
  subServices:SubService[]= [];
  allSubServices:SubService[]=[];
  filteredServiceChecklist:SubService[] = [...this.subServices];
  searchTerm: string = '';
  isDropdownOpen: boolean = false;
  division?:Division;

  formats:Format[]=[];
  departments:Department[] = [];
  divisions:Division[] = [];
  serviceInterval:any;
  timeInterval:any;
  successDescription = '';
  priorityDetails = `<div class='flex flex-col leading-none py-2 gap-2'>
    Please ensure that you have VALID ID to be considered as priority. <div class="text-sm px-6  text-red-900/85 ">* Without ID desk attendants are ALLOWED to put you at the bottom of queue.</div>
  </div> `;

  isLoading:boolean = true;

  refreshInterval:any;

  constructor(private route: ActivatedRoute,
    private queueService: QueueService,
    private kioskService: KioskService,
    private divisionService: DivisionService,
    private serviceService:ServiceService,
    private departmentService:DepartmentService,
    private formatService:FormatService,
    private contentService:ContentService, 
    private router:Router,
    private renderer: Renderer2, private el: ElementRef,
    private API: UswagonCoreService) {}

 
  config = config
  modal?:'priority'|'success'|'error'|string;
  content:any;
  printer?:string;

  openFeedback(type:'priority'|'success'){
    this.modal = type;
  }

  closeFeedback(){
    this.modal = undefined;
    this.goBackSelection();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.filterChecklist(); // Ensure all items are shown when opened
    }
  }

  async updateSubServices(){
    this.subServices = this.allSubServices.filter((subservice)=>subservice.service_id == this.group);
    this.isDropdownOpen = false;
    this.selectedServices = [];

  }


  showServiceNames(){
    return this.selectedServices.map(item=>item.name).join(', ')
  }

  ngOnDestroy(): void {
    if(this.serviceInterval){
      clearInterval(this.serviceInterval)
    }
    if(this.timeInterval){
      clearInterval(this.timeInterval);
    }
    clearInterval(this.refreshInterval);
  }

  ngAfterViewInit(): void {
    const inputElements = this.el.nativeElement.querySelectorAll('input');

    // Loop through all input elements and attach click event to each
    inputElements.forEach((inputElement: HTMLInputElement) => {
      this.renderer.listen(inputElement, 'click', () => {
        inputElement.focus();  // This triggers the touch keyboard on mobile devices
      });
    });
  }

  private serverTimeDifference?:number;

  private  getServerTime(){
      return new Date(new Date().getTime() + this.serverTimeDifference!);
    }


  async ngOnInit() {
    this.printer = this.route.snapshot.params['printer'];

    if(!this.printer){
      alert('No printer found')
    }
    
    this.isLoading =true;
    if(this.serverTimeDifference == undefined) {
      const serverTimeString = await this.API.serverTime();
      const serverTime = new Date(serverTimeString);
      const localTime = new Date();
      this.serverTimeDifference =  serverTime.getTime() - localTime.getTime();
    }
    this.timeInterval = setInterval(()=>{
      this.currentDate = this.getServerTime();
    },1000)
    this.route.queryParams.subscribe(params => {
      this.departmentName = params['department'] || 'Department Name';
    });

    if (this.kioskService.kiosk != undefined) {
      this.kioskService.kiosk = await this.kioskService.getKiosk(this.kioskService.kiosk.id!);

      this.division =await  this.divisionService.getDivision(this.kioskService.kiosk.division_id)
      this.divisionService.setDivision(this.division!);
      this.queueService.getTodayQueues(true);
      
      this.content = await this.contentService.getContentSetting(this.division!.id);
      this.API.setLoading(false);
    } else {
      throw new Error('Invalid method');
    }


    this.services = await this.serviceService.getAllServices(this.divisionService.selectedDivision?.id!);
    this.allSubServices = await this.serviceService.getAllSubServices();
    this.formats = await this.formatService.getFrom(this.divisionService.selectedDivision!.id);
    if(this.formats.length <= 0){
      this.formats = [
        {
          id: 'priority',
          name:'priority',
          prefix:'P'
        },
        {
          id: 'regular',
          name:'regular',
          prefix:'R'
        }
      ]
    }
    this.departments = await this.departmentService.getAllDepartments();
    this.divisions = await this.divisionService.getDivisions();
    if(this.serviceInterval){
      clearInterval(this.serviceInterval)
    }

    this.API.addSocketListener('listen-kiosk-content', async (message)=>{
      if(message.event == 'kiosk-events' ){
        this.kioskService.kiosk = await this.kioskService.getKiosk(this.kioskService.kiosk!.id!);
        this.division =await  this.divisionService.getDivision(this.kioskService.kiosk.division_id)
        this.divisionService.setDivision(this.division!);
        this.services = await this.serviceService.getAllServices(this.divisionService.selectedDivision?.id!);
        if(this.formats.length <= 0){
          this.formats = [
            {
              id: 'priority',
              name:'priority',
              prefix:'P'
            },
            {
              id: 'regular',
              name:'regular',
              prefix:'R'
            }
          ]
        }
      }
   })
    this.queueService.listenToQueue();
    this.isLoading = false;
    this.refreshInterval = setInterval(()=>{
      this.API.socketSend({'refresh':true});
    },1000);
  }
  

  handleButtonClick(type: string): void {
    this.isChecklistVisible = true;
    this.selectedType = type;
  }

  async toggleSelection(service_id: string) {
    const service = this.subServices.find(item => item.id === service_id);
    if (service) {

      if (!this.selectedServices.find(item=>item.id == service_id)) {
        this.selectedServices.push(service);
      } else {
        this.selectedServices = this.selectedServices.filter(service => service.id !== service_id);
      }
    }
  }

  filterChecklist() {
    this.filteredServiceChecklist = this.subServices.filter(item =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  

  async confirmChecklist() {
    try{
      await this.submitForm();
    }catch(e){
      this.API.sendFeedback('error','Something went wrong.', 5000);
    }
  }

  goBack(): void {
    if (this.isFormVisible) {
      this.isFormVisible = false;
      this.isChecklistVisible = true;
    } else if (this.isChecklistVisible) {
      this.isChecklistVisible = false;
    }
    this.showModal = false;
  }
  goBackSelection(): void {
   localStorage.removeItem('kiosk');
   this.router.navigate(['/kiosk/selection', {printer:this.printer}]);
  }

  closeModal(): void {
    this.showModal = false;
  }

  confirmPriority(){
    this.modal = 'priority';
  }

  async submitForm() {
    this.isDropdownOpen = false;
    if(this.isLoading){
      return;
    }
    if (!this.kioskService.kiosk) {
      throw new Error('Invalid method!');
    }
  this.isLoading = true;

  if(this.selectedServices.length <=0){
    this.API.sendFeedback('error','Please select a service!', 5000);
    this.isLoading =false;
    return
  }

  if(this.customerName.trim() == ''){
    this.API.sendFeedback('error','Fullname is required!',5000);
       this.isLoading =false;
    return
  }
  if(this.gender.trim() == ''){
    this.API.sendFeedback('error','Gender is required!',5000);
    this.isLoading =false;
    return
  }
   try{
    const currentQueueCountToday = (await this.queueService.getTodayQueues(true)).length;
    if(currentQueueCountToday > 3){

    }
    const number = await this.queueService.addToQueue({
      fullname: this.customerName.trim(),
      type: this.selectedType,
      tag: this.selectedType[0].toUpperCase(),
      gender: this.gender.toLowerCase() as 'male' | 'female' | 'other',
      services: this.selectedServices.map(item=>item.id!),
      student_id: this.studentNumber.trim() == '' ? undefined : this.studentNumber.trim(),
      department_id: this.department.trim() == '' ? undefined : this.department.trim(),
    });
    this.API.socketSend({event:'queue-events'})
    this.API.socketSend({event:'admin-dashboard-events'})
    this.successDescription = `Your current position is <span class='font-medium'>${this.formats.find((format)=>format.id == this.selectedType)?.prefix}-${number.toString().padStart(3,'0')}</span>`
    const code = `${this.formats.find((format)=>format.id == this.selectedType)?.prefix}-${number.toString().padStart(3,'0')}`;
    this.kioskService.thermalPrintUSB(
      this.printer!,
      {
      number:code,
      name: this.customerName,
      gender:this.gender,
      id:this.studentNumber.trim() == '' ? undefined : this.studentNumber.trim(),
      location: this.department.trim() == '' ? undefined : this.department.trim(),
      date: this.currentDate.toLocaleDateString(),
      time:this.currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      services: this.selectedServices.map(service=> service.name)
    })
    // Reset
    this.selectedServices = this.subServices
    .filter(item => item.selected)
    this.isChecklistVisible = true;
    this.isFormVisible = false;
    this.gender = '';
    this.department = '';
    this.customerName = '';
    this.studentNumber = '';
    // Loading to false
    this.isLoading =false;
    // Send feedback
    this.openFeedback( this.selectedType != 'priority' ? 'success':'priority');
   }catch(e:any){
    this.isLoading =false;
    this.API.sendFeedback('error','Something went wrong.',5000);
   }


   
  }

  showVirtualKeyboard(inputField: 'name' | 'studentNumber') {
    this.activeInput = inputField;
    this.showKeyboard = true;
  }
  
  handleKeyboardInput(value: string) {
    if (this.activeInput === 'name') {
      this.customerName = value;
    } else if (this.activeInput === 'studentNumber') {
      this.studentNumber = value;
    }
  }
  
  closeKeyboard() {
    this.showKeyboard = false;
    this.activeInput = null;
  }


//   async printImage(code: string) {
//     const ticketWidth = 500;  // 483 pixels wide
//     const ticketHeight = 690; // 371 pixels tall
//     const margin = 20; // Add margin in pixels

//     // Create a temporary container for the content
//     const container = document.createElement('div');
//     container.style.width = `${ticketWidth}px`;
//     container.style.height = `${ticketHeight}px`;
//     container.style.position = 'absolute';
//     container.style.visibility = 'hidden';

//     document.body.appendChild(container);

//     try {
//         this.kioskService.thermalPrint({
//           number:code,
//           name: this.customerName,
//           gender:this.gender,
//           id:this.studentNumber.trim() == '' ? undefined : this.studentNumber.trim(),
//           location: this.department.trim() == '' ? undefined : this.department.trim(),
//           date: this.currentDate.toLocaleDateString(),
//           time:this.currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//           services: this.selectedServices.map(service=> service.name)
//         })
//     } catch (error) {
//         // alert();
//     } finally {
//         // Clean up the temporary container
//         document.body.removeChild(container);
//     }
// }
// Helper function to convert image to base64

  private getBase64Image(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private makeImageTransparent(base64Image: string, opacity: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not get 2D context'));
        }
      };
      img.onerror = reject;
      img.src = base64Image;
    });
  }
}
