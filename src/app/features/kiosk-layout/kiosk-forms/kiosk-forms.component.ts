//kiosk-forms.component.ts
import { Component, model, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import { UswagonCoreService } from 'uswagon-core';
import { QueueService } from '../../../services/queue.service';
import { KioskService } from '../../../services/kiosk.service';
import { DivisionService } from '../../../services/division.service';
import { FeedbackComponent } from '../../../shared/modals/feedback/feedback.component';
import { ServiceService } from '../../../services/service.service';
import { Department, Division, Service } from '../types/kiosk-layout.types';
import { DepartmentService } from '../../../services/department.service';
import { SnackbarComponent } from '../../../shared/snackbar/snackbar.component';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { config } from '../../../../environment/config';

@Component({
  selector: 'app-kiosk-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, FeedbackComponent,SnackbarComponent,ConfirmationComponent, LottieAnimationComponent],
  templateUrl: './kiosk-forms.component.html',
  styleUrls: ['./kiosk-forms.component.css']
})
export class KioskFormsComponent implements OnInit, OnDestroy {
  [x: string]: any;

  departmentName: string = '';
  currentPeriod: string = 'AM';
  currentTime: Date = new Date();
  currentDate: Date = new Date();
  isChecklistVisible: boolean = false;
  isFormVisible: boolean = false;
  showModal: boolean = false;

  queueNumber: string | null = null;
  selectedServices: Service[] = [];
  selectedType: 'regular' | 'priority' = 'regular';
  customerName: string = '';
  gender: string = '';
  department: string = '';
  studentNumber: string = '';

  services:Service[]= [];
  filteredServiceChecklist:Service[] = [...this.services];
  searchTerm: string = '';
  isDropdownOpen: boolean = false;
  division?:Division;

  departments:Department[] = [];
  divisions:Division[] = [];
  serviceInterval:any;
  successDescription = '';
  priorityDetails = `<div class='flex flex-col leading-none py-2 gap-2'>
    Please ensure that you have VALID ID to be considered as priority. <div class="text-sm px-6  text-red-900/85 ">* Without ID desk attendants are ALLOWED to put you at the bottom of queue.</div>
  </div> `;

  isLoading:boolean = false;

  constructor(private route: ActivatedRoute,
    private queueService: QueueService,
    private kioskService: KioskService,
    private divisionService: DivisionService,
    private serviceService:ServiceService,
    private departmentService:DepartmentService,
    private API: UswagonCoreService) {}

 
  config = config
  modal?:'priority'|'success';

  openFeedback(type:'priority'|'success'){
    this.modal = type;
  }

  closeFeedback(){
    this.modal = undefined;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.filterChecklist(); // Ensure all items are shown when opened
    }
  }


  showServiceNames(){
    return this.selectedServices.map(item=>item.name).join(', ')
  }

  ngOnDestroy(): void {
    if(this.serviceInterval){
      clearInterval(this.serviceInterval)
    }
  }

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.departmentName = params['department'] || 'Department Name';
    });

    if (this.kioskService.kiosk != undefined) {
      this.kioskService.kiosk = await this.kioskService.getKiosk(this.kioskService.kiosk.id!);

      this.division =await  this.divisionService.getDivision(this.kioskService.kiosk.division_id)
      this.divisionService.setDivision(this.division!);
      this.queueService.getTodayQueues(true);
    } else {
      throw new Error('Invalid method');
    }


    this.services = await this.serviceService.getAllServices(this.divisionService.selectedDivision?.id!);
    this.departments = await this.departmentService.getAllDepartments();
    this.divisions = await this.divisionService.getDivisions();
    if(this.serviceInterval){
      clearInterval(this.serviceInterval)
    }
    this.serviceInterval = setInterval(async()=>{
      this.services = await this.serviceService.getAllServices(this.divisionService.selectedDivision?.id!);
      this.departments = await this.departmentService.getAllDepartments();
    },2000)
    this.queueService.listenToQueue();
    this.resetQueueNumberIfNewDay();
  }

  handleButtonClick(type: 'regular' | 'priority'): void {
    this.isChecklistVisible = true;
    this.selectedType = type;
  }

  async toggleSelection(service_id: string) {
    const service = this.services.find(item => item.id === service_id);
    if (service) {

      if (!this.selectedServices.find(item=>item.id == service_id)) {
        this.selectedServices.push(service);
      } else {
        this.selectedServices = this.selectedServices.filter(service => service.id !== service_id);
      }
    }
  }

  filterChecklist() {
    this.filteredServiceChecklist = this.services.filter(item =>
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

  closeModal(): void {
    this.showModal = false;
  }

  confirmPriority(){
    this.modal = 'priority';
  }

  async submitForm() {
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
    throw new Error();
  }

  if(this.customerName.trim() == ''){
    this.API.sendFeedback('error','Fullname is required!',5000);
       this.isLoading =false;
    throw new Error();
  }
  if(this.gender.trim() == ''){
    this.API.sendFeedback('error','Gender is required!',5000);
    this.isLoading =false;
    throw new Error();
  }
   try{
    const number = await this.queueService.addToQueue({
      fullname: this.customerName.trim(),
      type: this.selectedType,
      gender: this.gender.toLowerCase() as 'male' | 'female' | 'other',
      services: this.selectedServices.map(item=>item.id!),
      student_id: this.studentNumber.trim() == '' ? undefined : this.studentNumber.trim(),
      department_id: this.department.trim() == '' ? undefined : this.department.trim(),
    });
    this.API.socketSend({event:'queue-events'})
    this.API.socketSend({event:'admin-dashboard-events'})
    this.successDescription = `Your current position is <span class='font-medium'>${this.selectedType === 'regular' ? 'R' : 'P'}-${number.toString().padStart(3,'0')}</span>`
    await this.printImage(`${this.selectedType === 'regular' ? 'R' : 'P'}-${number.toString().padStart(3,'0')}`);
    // Reset
    this.selectedServices = this.services
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
    this.openFeedback( this.selectedType === 'regular' ? 'success':'priority');
   }catch(e){
    this.isLoading =false;
    this.API.sendFeedback('error','Something went wrong.',5000);
   }


   
  }


  generateQueueNumber(): string {
    const today = new Date().toDateString();
    const queueKey = `${this.departmentName}_${today}`;
    let departmentQueueData = JSON.parse(localStorage.getItem(queueKey) || '{}');

    if (!departmentQueueData.date) {
      departmentQueueData = { date: today, lastRegularQueueNumber: 0, lastPriorityQueueNumber: 0 };
    }

    if (this.selectedType === 'regular') {
      departmentQueueData.lastRegularQueueNumber += 1;
      localStorage.setItem(queueKey, JSON.stringify(departmentQueueData));
      return `R-${departmentQueueData.lastRegularQueueNumber}`;
    } else {
      departmentQueueData.lastPriorityQueueNumber += 1;
      localStorage.setItem(queueKey, JSON.stringify(departmentQueueData));
      return `P-${departmentQueueData.lastPriorityQueueNumber}`;
    }
  }

  resetQueueNumberIfNewDay(): void {
    const today = new Date().toDateString();
    const queueKey = `${this.departmentName}_${today}`;
    let departmentQueueData = JSON.parse(localStorage.getItem(queueKey) || '{}');

    if (departmentQueueData.date !== today) {
      localStorage.setItem(queueKey, JSON.stringify({ date: today, lastRegularQueueNumber: 0, lastPriorityQueueNumber: 0 }));
    }
  }

  async printImage(code: string) {
    const ticketWidth = 500;  // 483 pixels wide
    const ticketHeight = 690; // 371 pixels tall
    const margin = 20; // Add margin in pixels

    // Create a temporary container for the content
    const container = document.createElement('div');
    container.style.width = `${ticketWidth}px`;
    container.style.height = `${ticketHeight}px`;
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';

    document.body.appendChild(container);

    try {
        // Background Logo
        // const logoUrl = './assets/logo/vsu.png';
        // const logoData = await this.getBase64Image(logoUrl);
        // const transparentLogoData = await this.makeImageTransparent(logoData, 0.7);


        // // Drawing content into the canvas
        // const canvas = document.createElement('canvas');
        // const ctx = canvas.getContext('2d');
        // if (ctx) {
        //     canvas.width = ticketWidth;
        //     canvas.height = ticketHeight;

        //     // Set background color
        //     ctx.fillStyle = '#FFFFFF';
        //     ctx.fillRect(0, 0, ticketWidth, ticketHeight);

          

        //     // Header with Queue Number
        //     ctx.fillStyle = 'rgb(95, 141, 78)'; // #5F8D4E
        //     const headerWidth = 450; // Fixed header width
        //     const headerX = (ticketWidth - headerWidth) / 2; // Center the header
        //     // ctx.fillRect(headerX, margin, headerWidth, 50);
        //     ctx.fillStyle = '#000000';
        //     ctx.font = 'bold 82px helvetica';
        //     ctx.textAlign = 'center';
        //     ctx.fillText(code, ticketWidth / 2, margin + 40);

        //     // Welcome text
        //     ctx.fillStyle = '#000000';
        //     ctx.font = '28px helvetica';
        //     ctx.fillText("Welcome! You're currently in the queue", ticketWidth / 2, margin + 80);

        //     // Horizontal line
        //     ctx.strokeStyle = 'rgb(200, 200, 200)';
        //     ctx.beginPath();
        //     ctx.moveTo(margin + 20, margin + 110);
        //     ctx.lineTo(ticketWidth - (margin + 20), margin + 110);
        //     ctx.stroke();

        //     // Customer details
        //     ctx.textAlign ='left';
        //     const contentStartX = margin;


        //     const details = [
        //         { label: 'Name:', value: this.customerName },
        //         { label: 'Gender:', value: this.gender},
        //         { label: 'Student ID:', value: this.studentNumber || 'No ID specified.'},
        //         { label: 'Department:', value: this.department || 'No department selected.'},
        //         { label: 'Date:', value: this.currentDate.toLocaleDateString() },
        //         { label: 'Time:', value: this.currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        //     ];

        //     let yPosition = margin + 140;
            
        //     details.forEach(detail => {
        //         ctx.fillStyle = '#000000';
        //         ctx.font = 'bold 30px helvetica';
        //         ctx.fillText(detail.label, contentStartX, yPosition);
        //         const textWidth = ctx.measureText(detail.label).width;
        //         ctx.font = '30px helvetica';
        //         ctx.fillText(detail.value, contentStartX + 10 + textWidth, yPosition);
        //         yPosition += 35;
        //     });
            
        //     ctx.fillStyle = '#000000';
        //     ctx.font = 'bold 30px helvetica';
        //     ctx.fillText('Services:', contentStartX , yPosition, 200);
        //     yPosition += 35;
        //     ctx.font = '30px helvetica';
        //     for(let service of this.selectedServices){
        //       ctx.fillText( '• '+service.name, contentStartX, yPosition, 200);
        //       yPosition += 30;
        //     }

        //     yPosition += 30;
        //     // Footer text
        //     ctx.textAlign = 'center';
        //     ctx.font = '24px helvetica';
        //     ctx.fillText('Your number will be called shortly.', ticketWidth / 2, yPosition);
        //     yPosition += 30;
        //     const logoWidth = 150;
        //     const logoHeight = 150;
        //     const logoX = (ticketWidth - logoWidth) / 2;
        //     // Draw logo
        //     const logoImg = new Image();
        //     logoImg.src = transparentLogoData;
        //     await new Promise((resolve) => {
        //         logoImg.onload = () => {
        //             ctx.drawImage(logoImg, logoX, yPosition, logoWidth, logoHeight);
        //             resolve(null);
        //         };
        //     });
        // }

        // Convert canvas to Base64
        // const base64Image = canvas.toDataURL('image/png');
        // const base64String = base64Image.split(',')[1];
        this.kioskService.thermalPrint({
          number:code,
          name: this.customerName,
          gender:this.gender,
          id:this.studentNumber.trim() == '' ? undefined : this.studentNumber.trim(),
          location: this.department.trim() == '' ? undefined : this.department.trim(),
          date: this.currentDate.toLocaleDateString(),
          time:this.currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          services: this.selectedServices.map(service=> service.name)
        })
    } catch (error) {
        // alert();
    } finally {
        // Clean up the temporary container
        document.body.removeChild(container);
    }
}
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
