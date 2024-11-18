import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { UswagonAuthService } from 'uswagon-auth';
import { ContentService } from '../../../services/content.service';
import { UswagonCoreService } from 'uswagon-core';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { QueueDisplayComponent } from '../../queueing-layout/queue-display/queue-display.component';
import { DivisionService } from '../../../services/division.service';
import { LogsService } from '../../../services/logs.service';

interface ContentColors {
  primary_bg: string,
  secondary_bg: string,
  tertiary_bg: string,
  primary_text: string,
  secondary_text: string,
  tertiary_text: string,
}

interface ContentCollapsables {
  uploads: boolean,
  widgets:boolean,
  colors:boolean,
  announcements:boolean
}

interface ContentToggles {
  announcements: boolean,
  videoURL:boolean,
  time: boolean,
  weather: boolean,
  currency: boolean,
  background:boolean
}
interface ContentFields {
  announcements:string,
  youtubeURL?:string,
  videoUrl?:string,
  backgroundUrl?:string,
  logoUrl?:string,
}
interface ContentFiles {
  logo?:File,
  background?:File,
  video?:File,
}
interface ContentSettings {
  toggles:ContentToggles,
  colors:ContentColors,
  files: ContentFiles,
  inputFields:ContentFields
}
@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [FormsModule,CommonModule, ToggleComponent,ConfirmationComponent, QueueDisplayComponent],
  templateUrl: './content-management.component.html',
  styleUrl: './content-management.component.css'
})
export class ContentManagementComponent implements OnInit {

  constructor(
    private divisionService:DivisionService,
    private auth:UswagonAuthService, 
    private logService:LogsService,
    private contentService:ContentService,   
    private API:UswagonCoreService){}


  isSuperAdmin:boolean = this.auth.getUser().role == 'superadmin';

  showEditSection:boolean = false;

  toggles:ContentToggles= {
    announcements:false,
    time:true,
    weather:true,
    currency:true,
    videoURL: false,
    background:false,
  }

  collapsables:ContentCollapsables = {
    uploads:true,
    widgets:false,
    colors:false,
    announcements:false,
  }

  colors:ContentColors={
    primary_bg: '#2F4A2C',
    secondary_bg: '#FFFFFF',
    tertiary_bg: '#FBDF30',
    primary_text: '#FFFFFF',
    secondary_text: '#000000',
    tertiary_text: '#FBDF30',
  }
  
  files:ContentFiles= {}

  inputFields:ContentFields={
    announcements : '',
  }
  
  factorySettings:ContentSettings = {
    toggles: {... this.toggles},
    colors: {...this.colors},
    files: {...this.files},
    inputFields: {...this.inputFields}
  }

  previousSettings?:ContentSettings;

  contentLoading:boolean = false;
  contents:any[] = [];
  divisions:any[] = [];

  // NG
  ngOnInit(): void {
    this.loadContents();
   
  }

  getLastDirectory(url?:string) {
    if(this.isValidYouTubeUrl(url??'')) return null;
    if(!url){
      return null;
    }
    // Split the URL by '/' and filter out any empty strings
    const parts = url.split('/').filter(part => part.length > 0);
    // Return the last part
    return parts[parts.length - 1];
  }

  getDivisionNames(){
    return this.divisions.reduce((prev:any,curr:any)=>{
      return [...prev, curr.name]
    },[])
  }

  getDivisionName(){
    if(!this.selectedDivision) return '';
    return this.divisions.find((division) => division.id == this.selectedDivision).name;
  }

  getDivision(){
    if(!this.selectedDivision) return undefined;
    return this.divisions.find((division) => division.id == this.selectedDivision);
  }

  selectedDivision?:string;
  selectDivision(division_id:string){
    this.selectedDivision = division_id;
    const content = this.contents.find((_content)=> _content.division_id == division_id);
    if(!content){
      this.previousSettings ={...this.factorySettings};
      this.revertChanges();
      this.contentLoading = false;
      return;
    }
    this.toggles  = {
      announcements: content.announcement_on == 't',
      time: content.time == 't',
      weather:content.weather == 't',
      currency:content.currency == 't',
      background: content.background_on == 't',
      videoURL: this.isValidYouTubeUrl(content.video??''),
    }
    this.colors ={
      primary_bg: content.primary_bg,
      secondary_bg: content.secondary_bg,
      tertiary_bg: content.tertiary_bg,
      primary_text: content.primary_text,
      secondary_text: content.secondary_text,
      tertiary_text: content.tertiary_text
    }
    this.inputFields = {...this.factorySettings.inputFields};
    if(content.logo){
      this.inputFields.logoUrl = content.logo;
    }
    if(content.background){
      this.inputFields.backgroundUrl = content.background;
    }
    if(content.video){
      this.inputFields.videoUrl = content.video;
    }
    if(this.toggles.videoURL){
      this.inputFields.youtubeURL = content.video
    }

    this.inputFields.announcements = content.announcements ?? '';

    this.previousSettings ={
      toggles: {... this.toggles},
      colors: {...this.colors},
      files: {...this.files},
      inputFields: {...this.inputFields}
    }
  }

  async loadContents(){
    this.contentLoading = true;
    this.API.setLoading(true);
    try{
      if(this.isSuperAdmin){
        if(this.divisions.length <=0){
          this.divisions = await this.divisionService.getDivisions();
          this.selectedDivision = this.divisionService.selectedDivision?.id;
        }
        this.contents = await this.contentService.getContentSettings();
        const content = this.contents.find((_content)=> _content.division_id ==this.selectedDivision);
        if(!content){
          this.previousSettings ={
            toggles: {... this.toggles},
            colors: {...this.colors},
            files: {...this.files},
            inputFields: {...this.inputFields}
          }
          this.API.setLoading(false);
          this.contentLoading = false;
          return;
        }
        this.toggles  = {
          announcements: content.announcement_on == 't',
          time: content.time == 't',
          weather:content.weather == 't',
          currency:content.currency == 't',
          background: content.background_on == 't',
          videoURL: this.isValidYouTubeUrl(content.video??''),
        }
        this.colors ={
          primary_bg: content.primary_bg,
          secondary_bg: content.secondary_bg,
          tertiary_bg: content.tertiary_bg,
          primary_text: content.primary_text,
          secondary_text: content.secondary_text,
          tertiary_text: content.tertiary_text
        }
        if(content.logo){
          this.inputFields.logoUrl = content.logo;
        }
        if(content.background){
          this.inputFields.backgroundUrl = content.background;
        }
        if(content.video){
          this.inputFields.videoUrl = content.video;
        }
        if(this.toggles.videoURL){
          this.inputFields.youtubeURL = content.video
        }


        this.inputFields.announcements = content.announcements ?? '';
      
        this.API.setLoading(false);
        this.contentLoading = false;
      }else{
        const userDivision = await this.divisionService.getDivision();
        this.selectedDivision = userDivision?.id;
        this.divisions =[ userDivision];
        const content = await this.contentService.getContentSetting();
        if(!content) {
          this.previousSettings ={
            toggles: {... this.toggles},
            colors: {...this.colors},
            files: {...this.files},
            inputFields: {...this.inputFields}
          }
          this.API.setLoading(false);
          this.contentLoading =false;
          return;
        }
        this.toggles  = {
          announcements: content.announcement_on == 't',
          time: content.time == 't',
          weather:content.weather == 't',
          currency:content.currency == 't',
          background: content.background_on == 't',
          videoURL: this.isValidYouTubeUrl(content.video??''),
        }
        this.colors ={
          primary_bg: content.primary_bg,
          secondary_bg: content.secondary_bg,
          tertiary_bg: content.tertiary_bg,
          primary_text: content.primary_text,
          secondary_text: content.secondary_text,
          tertiary_text: content.tertiary_text
        }
        if(content.logo){
          this.inputFields.logoUrl = content.logo;
        }
        if(content.background){
          this.inputFields.backgroundUrl = content.background;
        }
        if(content.video){
          this.inputFields.videoUrl = content.video;
        }
        if(this.toggles.videoURL){
          this.inputFields.youtubeURL = content.video
        }

        this.inputFields.announcements = content.announcements ?? '';
      }
      this.previousSettings ={
        toggles: {... this.toggles},
        colors: {...this.colors},
        files: {...this.files},
        inputFields: {...this.inputFields}
      }
      this.API.setLoading(false);
      this.contentLoading = false;
    }catch(e:any){
      this.API.setLoading(false);
      this.contentLoading = false;
      this.API.sendFeedback('error',e.message,5000)
    }
  }

  modalType?:'publish'| 'revert';
  
  // UI Functions

  toggleEditor(){
    this.showEditSection = !this.showEditSection;
  }

  toggleCollapse(key:'uploads'|'widgets'|'colors'|'announcements'){
    if(this.collapsables[key] == true) return;
    this.collapsables[key] = !this.collapsables[key];
    if(this.collapsables[key] == true){
      for(let collasable in this.collapsables){
        if(collasable != key){
          this.collapsables[collasable as keyof typeof this.collapsables] =false; 
        }
      }
    } 
  }

  onFileChange(key:'logo'| 'video'|'background', event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.files[key] = file;
      const reader = new FileReader();
      reader.onload = () => {
        if(key == 'logo'){
          this.inputFields.logoUrl = reader.result as string;
        }
        if(key == 'background'){
          this.inputFields.backgroundUrl = reader.result as string;
        }
        if(key == 'video'){
          this.inputFields.videoUrl = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  confirmDialog(type:'publish'| 'revert'){

    this.modalType = type;
  }

  closeDialog(){

    this.modalType = undefined;
  }

  updateChanges(type:'publish'|'revert'){
      if(type == 'publish'){
        this.publishChanges();
      }else{
        this.revertChanges();
        this.API.sendFeedback('success','Changes has been reverted successfully.',5000);
      }
  }

  revertChanges(){
    this.colors = {...this.previousSettings!.colors};
    this.files = {...this.previousSettings!.files};
    this.inputFields = {...this.previousSettings!.inputFields};
    this.toggles = {...this.previousSettings!.toggles};
    this.modalType = undefined;
  }
  private isValidYouTubeUrl(url: string): boolean {
    const regex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    return regex.test(url);
  }

  checkYoutubeUrl(){
    if(!this.isValidYouTubeUrl(this.inputFields.youtubeURL!)){
      this.inputFields.youtubeURL = undefined;
      this.API.sendFeedback('error','Please enter a valid YouTube URL.',5000);
    }else{
      
    }
  }

  async publishChanges(){
    if(this.selectedDivision == undefined) return;
    this.modalType = undefined;
   
    this.API.setLoading(true);
    try{
      await this.contentService.updateContentSettings({
        division_id: this.selectedDivision!,
        selectedFiles: {
          logo: this.files.logo,
          video: this.files.video,
          background:this.files.background
        },
        colors: {...this.colors},
        widgets: {
          time: this.toggles.time,
          weather: this.toggles.weather,
          currency: this.toggles.currency
        },
        videoOption: this.toggles.videoURL ? 'url': 'file',
        videoUrl: this.inputFields.youtubeURL,
        background_on: this.toggles.background,
        announcement_on:this.toggles.announcements,
        announcements: this.toggles.announcements ?  this.inputFields.announcements : undefined,
  
      });
      await this.loadContents();
      this.API.socketSend({
        'event': 'content-changes'
      })
      this.API.setLoading(false);
      this.logService.pushLog('content-change',`published a content change on ${this.getDivisionName()}`);
      this.API.sendFeedback('success','Content has been updated successfully!', 5000)
    }catch(e:any){
      console.log(e.message)
      this.API.sendFeedback('error','Something went wrong.', 5000)
    }
    
  }
}
