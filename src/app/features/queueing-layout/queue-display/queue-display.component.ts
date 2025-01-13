import { AfterViewInit, Component, OnChanges, OnInit, SimpleChanges, ViewChild, ElementRef, Input, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThirdPartyService } from '../../../services/thirdparty.service';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QueueService } from '../../../services/queue.service';
import { Subscription } from 'rxjs';
import { TerminalService } from '../../../services/terminal.service';
import { DivisionService } from '../../../services/division.service';
import { UswagonCoreService } from 'uswagon-core';
import { Terminal } from '../../admin-layout/terminal-management/types/terminal.types';
import { tick } from '@angular/core/testing';
import { config } from '../../../../environment/config';

interface Counter {
  id:string;
  status:string; 
  number: number;
  terminal?:Terminal;
  ticket?:AttendedQueue;
  ticketNumber?: string;
  personName?: string;
}

interface Queue{
  id:string;
  division_id:string;
  number:number;
  status:string;
  timestamp:string;
  type:string;
  tag?:string;
  metaType?:string;
  fullname:string;
  services:string;
  department_id?:string;
  kiosk_id:string;
  gender:'male'|'female'|'other';
  student_id?:string;
  collision?:string;
}
interface AttendedQueue{
  id:string;
  desk_id:string;
  queue_id:string;
  attended_on:string;
  finished_on?:string;
  status:string;
  terminal_id?:string;
  queue?:Queue;
  number?:number;
}

interface UpNextItem {
  avatar: string;
  ticketNumber: string;
  personName: string;
  type:string;
}

interface WeatherItem {
  time: string;
  temperature: number;
}

interface CurrencyInfo {
  label: string;
  rate: number;
  icon:string;
}

interface Colors {
  primary_bg: string;
  secondary_bg: string;
  tertiary_bg:string;
  primary_text: string;
  secondary_text: string;
  tertiary_text:string;

}

interface Division{
  id:string;
  name:string;
}

@Component({
  standalone: true,
  selector: 'app-queue-display',
  imports: [RouterModule, CommonModule, LottieAnimationComponent],
  templateUrl: './queue-display.component.html',
  styleUrls: ['./queue-display.component.css']
})
export class QueueDisplayComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
 
  // VARIABLES
  
  config = config;
 
  @Input() division?:Division;
 
  @Input() colors:Colors = {
    primary_bg: '#2F4A2C',
    secondary_bg: '#2F4A2C',
    tertiary_bg: '#2F4A2C',
    primary_text: '#2F4A2C',
    secondary_text: '#2F4A2C',
    tertiary_text: '#2F4A2C',
  }

  // Mock data for queue
  counters: Counter[] = [
    { number: 1, ticketNumber: 'P-32', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 2, ticketNumber: 'P-01', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 3, ticketNumber: 'P-02', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 4, ticketNumber: 'P-04', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 5, ticketNumber: 'P-05', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 6, ticketNumber: 'P-07', personName: 'Domeng Valdez',id:'',status:'online' },
    { number : 7, ticketNumber: 'P-10', personName: 'Domeng Valdez',id:'',status:'online' },
  ];
  


  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>; // Access video element
  @ViewChild('iframePlayer') iframePlayer!: ElementRef<HTMLIFrameElement>; // Access video element
  // Variables for user-defined backgrounds
  @Input() isPreview = false;


  @Input() showTime: boolean = true;
  @Input() showWeather: boolean = true;
  @Input() showCurrency: boolean = true;
  @Input() showAnnouncement: boolean = true;
  @Input() showBackground:boolean = true;
  @Input() announcements:string = '';
  @Input() logoUrl?:string;
  @Input() backgroundUrl?:string; 
  @Input() videoUrl?: string; 
  @Input() disableAPI:boolean = false;
  @Input() mute:boolean = false;


  dataLoaded:boolean = false;
  terminalInterval:any;


  currencySwitchTimer:number = 12000;
  weatherSwitchTimer:number = 12000;
  
  switcher:'weather'|'currency' = 'currency';

  weatherCurrencySwitchTimer:number = 6000;
  videoSwitchTimer:number = 8000;

  counterSwitchTimer:number = 5000;
  counterInterval:any ;
  slice = 10;
  offset = 0;

  async terminalStatusInterval(){
    for(let i = 0;  i < this.counters.length; i++) {
      this.counters[i].status = this.checkIfOnline(this.counters[i].terminal!);
      if(this.counters[i].status != 'online' && this.counters[i].ticket){
        await this.queueService.returnUnattendedQueue(this.counters[i].ticket);
      }
    }
  }


  transitionCounters(){
    this.counterInterval = setInterval(()=>{
      if(this.countOnlineCounters() >  this.offset + this.slice){
        this.offset = this.slice + this.offset;
      }else{
        this.offset = 0;
      }
    },this.counterSwitchTimer)
  }

  // Control flags: 1 is "on", 0 is "off"
  upNextItems: UpNextItem[] = [
    { avatar: '/assets/queue-display/Male_2.png', ticketNumber: 'P-217', personName: 'Kristin Watson' ,type:'priority'},
    { avatar: '/assets/queue-display/Male_1.png', ticketNumber: 'P-218', personName: 'Al Francis Salceda',type:'priority' },
    { avatar: '/assets/queue-display/Female_2.png', ticketNumber: 'R-247', personName: 'Joey Bichara' ,type:'regular'},
    { avatar: '/assets/queue-display/female_1.png', ticketNumber: 'R-217', personName: 'Kenneth Felix Belga',type:'regular' },
  ];
  

  getPriorityItems(items:UpNextItem[]){
   return items.filter(next=> next.type == 'priority')
  }
  getRegularItems(items:UpNextItem[]){
   return items.filter(next=> next.type == 'regular')
  }

  attendedQueue:AttendedQueue[]=[];

  weatherItems: WeatherItem[] = [
    { time: '12:00 PM', temperature: 40 },
    { time: '2:00 PM', temperature: 20 },
    { time: '4:00 PM', temperature: 30 }
  ];

  currencies: CurrencyInfo[] = [
    { icon:'$', label: 'USD', rate: 0 }, 
    { icon:'¥', label: 'CNY', rate: 0 },
    { icon:'£',label: 'GBP', rate: 0 },
    { icon:'円',label: 'JPY', rate: 0 }
  ];
  currentCurrencyIndex = 0;
  currentCurrency: CurrencyInfo = this.currencies[this.currentCurrencyIndex];
  timeInfo = { location: 'Manila (GMT +8)', time: '' };
  pesoAmount: number = 1; 
  
  // Video-related variables
  showVideo: boolean = false; 
  
  videoCurrentTime: number = 0; 
  intervalVideo:any;
  intervalTime:any;
  intervalCurrency:any;

  currentWeatherIndex = 0;
  intervalWeather:any;

  intervalSwitchter:any;

  subscription?: Subscription;

  loading:boolean = false;
  

  view:number = 0;
  
  constructor(
    private divisionService:DivisionService,
    private queueService:QueueService,
    private terminalService:TerminalService,
    private thirdPartyService: ThirdPartyService,
    private API:UswagonCoreService,
    private sanitizer: DomSanitizer,
    private route:ActivatedRoute
  ) {}

  // NG FUNCTIONS

  ngAfterViewInit(): void {
    if(!this.isPreview) {
      this.loadQueue();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalCurrency);
    clearInterval(this.intervalTime);
    // clearInterval(this.intervalVideo);
    clearInterval(this.intervalWeather);
    clearInterval(this.intervalSwitchter);
    clearInterval(this.counterInterval);
    clearInterval(this.refreshInterval);
    this.subscription?.unsubscribe();
    this.API.addSocketListener('number-calling',(data)=>{})
    this.API.addSocketListener('queue-events',(data)=>{})
  }

  playNote(frequency:number) {
    const audioCtx = new (window.AudioContext)();
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine'; // You can change to 'square' or 'triangle' for different sounds
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(-0.5, audioCtx.currentTime); // Set volume level
    oscillator.connect(gainNode)
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.6); // Play for 300 ms
  }

   playNotes() {
    // setTimeout(() => this.playNote(783.99), 0); // Play G
    // setTimeout(() => this.playNote(587.33), 600); // Play B after 400 ms
    // setTimeout(() => this.playNote( 587.33), 800); // Play D after 800 ms
    // setTimeout(() => this.playNote(783.99), 1200); // Play G again after 1200 ms
    setTimeout(() => this.playNote(783.99), 0); // Play G again after 1200 ms
    setTimeout(() => this.playNote( 587.33), 500); // Play D after 800 ms
    // setTimeout(() => this.playNote(493.88), 1000); // Play B after 400 ms
    // setTimeout(() => this.playNote(392), 1000); // Play G
  }

  refreshInterval:any;
  
  ngOnInit(): void {
    if(!this.isPreview) {
      this.loadQueue();
      this.refreshInterval = setInterval( async ()=>{
        this.API.socketSend({'refresh':true});
        await this.terminalStatusInterval()
        // await this.loadTerminalData();
        // await this.queueService.getTodayQueues();
      },1000);
    } else{
      this.serverTimeDifference = 0;
    }


    this.view = this.route.snapshot.queryParams['view'];
    // this.playNotes();
    const init = speechSynthesis.getVoices()

    this.transitionCounters();
    
    this.API.addSocketListener('number-calling', (data:any)=>{
      if(data.event == 'number-calling' && data.division == this.division?.id){
        const voices = speechSynthesis.getVoices();
          // Find a female voice (you may need to check which voices are available)
        const femaleVoice = voices.find(voice => voice.name.includes('Zira'));
        const utterance = new SpeechSynthesisUtterance(data.message);
        utterance.volume = 3;
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
        // this.playNotes();
         speechSynthesis.speak(utterance)
      
      }
    });
    this.getSafeYoutubeUrl(this.videoUrl);
    this.updateTime();
    this.intervalTime = setInterval(() => this.updateTime(), 1000);
   
    if(!this.disableAPI){
       // Fetch real-time currency data from CurrencyFreaks
    this.thirdPartyService.getCurrencyData().subscribe({
      next: (data) => {
        console.log(data);
        this.currencies = [
          { icon:'$', label: 'USD', rate: +data.rates.PHP }, 
          { icon:'¥', label: 'CNY', rate: +data.rates.PHP / +data.rates.CNY  },
          { icon:'£',label: 'GBP', rate: +data.rates.PHP / +data.rates.GBP },
          { icon:'円',label: 'JPY', rate: +data.rates.PHP / +data.rates.JPY }
        ];
      },
      error: (error) => {
        console.error('Currency API Error:', error);
        console.log('Detailed Error Response:', error.error);
      }
    });
     this.thirdPartyService.getWeatherData().subscribe({
      next: (data) => {
        let i = 0;
        const now = Math.floor(Date.now() / 1000);
        if(data.forecast.forecastday?.length){
          const hours =  data.forecast.forecastday[0].hour;
          for(let j = 0; j < hours.length; j++){
            if(i == 0){
              if(hours[j].time_epoch < now) continue;
              this.weatherItems[i].time = this.formatUnixTimestamp(hours[j].time_epoch);
              this.weatherItems[i].temperature = hours[j].temp_c
              i++;
              j++;
            }else{
              this.weatherItems[i].time = this.formatUnixTimestamp(hours[j].time_epoch);
              this.weatherItems[i].temperature = hours[j].temp_c;
              i++;
              if(i == 3) break;
              j++;
            }
          }
        }

      },
      error: (error) => {
        console.error('Weather API Error:', error);
        console.log('Detailed Error Response:', error.error);
      }
    });
    }
   

  //  this.intervalVideo = setInterval(() => {
  //     // this.toggleVideoUpNextIFrame();
  //     this.toggleVideoUpNext();
  //   }, this.videoSwitchTimer); 

    this.intervalCurrency =setInterval(() => this.updateCurrency(), this.currencySwitchTimer);
    this.intervalWeather =setInterval(() => this.switchWeather(), this.weatherSwitchTimer);
    this.intervalSwitchter =setInterval(() => {
        if(!this.showCurrency){
          this.switcher = 'weather';
          return;
        }
        if(!this.showWeather){
          this.switcher = 'currency';
          return;
        }
        if(this.switcher == 'currency'){
          this.switcher = 'weather';
        }else{
          this.switcher = 'currency';
        }
    }, this.weatherCurrencySwitchTimer);


  

  }


  // FRONT END FUNCTIONS

  private isValidYouTubeUrl(url: string): boolean {
    const regex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    return regex.test(url);
  }
  private getYouTubeVideoId(url: string): string {
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1];
    }
    const ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
      videoId = videoId.substring(0, ampersandPosition);
    }
    return videoId;
  }

  videoSalt(){
    return `?salt${Date.now()}`;
  }

  safeYoutubeUrl?:SafeResourceUrl;
  safeYoutubeUrlMute?:SafeResourceUrl;

  
  getSafeYoutubeUrl(url?:string) {
    if (this.isValidYouTubeUrl(url ??'')) {
      const videoId = this.getYouTubeVideoId(url!);
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&controls=0&playlist=${videoId}`;
      const embedUrlMute = `https://www.youtube-nocookie.com/embed/${videoId}?mute=1&autoplay=1&loop=1&controls=0&playlist=${videoId}`;
      this.safeYoutubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      this.safeYoutubeUrlMute = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrlMute);
    } else{
      this.safeYoutubeUrlMute = undefined;
      this.safeYoutubeUrl = undefined;
    }
  }

  formatUnixTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    };
    return date.toLocaleString('en-US', options);

   
}


  computeFillers(midpoint:number){
    let count = this.countOnlineCounters();
    
    if(count==1){
      return [];
    }
    if(midpoint == Math.round((count)/2))
      return new Array(5-midpoint);
    return [];
  }

  darkenColor(color: string,intensity:number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - intensity);
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - intensity);
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - intensity);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(!this.isPreview) {
      this.loadQueue();
    }
    this.getSafeYoutubeUrl(this.videoUrl);
    if(this.isPreview){
      this.counters = [
        { number: 1, ticketNumber: `P-32`, personName: 'Domeng Valdez',id:'',status:'online' },
        { number : 2, ticketNumber: `P-31`, personName: 'Maria Clara',id:'',status:'online' },
        { number : 3, ticketNumber: `P-34`, personName: 'Domeng Cruz',id:'',status:'online' },
        { number : 4, ticketNumber: `P-30`, personName: 'Juan Valdez',id:'',status:'online' },
        { number : 5, ticketNumber: `P-49`, personName: 'Marga Madrid',id:'',status:'online' },
        { number : 6, ticketNumber: `P-50`, personName: 'Jo Ann',id:'',status:'online' },
        { number : 7, ticketNumber: `P-20`, personName: 'John Mark',id:'',status:'online' },
      ];
      this.upNextItems =[
        { avatar: '/assets/queue-display/Male_2.png', ticketNumber: `P-217`, personName: 'Kristin Watson', type:'priority'},
        { avatar: '/assets/queue-display/Male_1.png', ticketNumber: `P-218`, personName: 'Al Francis Salceda', type:'priority' },
        { avatar: '/assets/queue-display/Female_2.png', ticketNumber: `R-247`, personName: 'Joey Bichara', type:'regular' },
        { avatar: '/assets/queue-display/female_1.png', ticketNumber: `R-217`, personName: 'Kenneth Felix Belga' , type:'regular'},
      ];
    }
    // if(this.videoPlayer != null)
    // this.videoPlayer.nativeElement.src=this.videoUrl??'assets/queue-display/vsu.mp4';
  
  }

  private serverTimeDifference?:number;

 private  getServerTime(){
    return new Date(new Date().getTime() + this.serverTimeDifference!);
  }


  updateTime(): void {
    const currentDate = this.getServerTime();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    this.timeInfo.time = `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
  }

  updateCurrency(): void {
    this.currentCurrencyIndex = (this.currentCurrencyIndex + 1) % this.currencies.length;
  }
  switchWeather(): void {
    this.currentWeatherIndex = (this.currentWeatherIndex + 1) % this.weatherItems.length;
  }

  toggleVideoUpNext(): void {
    this.showVideo = !this.showVideo;

    if (this.showVideo) {
      // Show video and resume playback
      if (this.videoPlayer && this.videoPlayer.nativeElement.paused) {
        this.videoPlayer.nativeElement.currentTime = this.videoCurrentTime;
        this.videoPlayer.nativeElement.play(); // Resume playing the video
      }
    } else {
      // Switch to "Up Next" and pause the video
      if (this.videoPlayer) {
        this.videoCurrentTime = this.videoPlayer.nativeElement.currentTime;
        this.videoPlayer.nativeElement.pause(); // Pause the video
      }
    }
  }

  toggleVideoUpNextIFrame(): void {
    this.showVideo = !this.showVideo;
  
    if (this.showVideo) {
      // Show video and resume playback
      if (this.videoPlayer) {
        this.iframePlayer.nativeElement.contentWindow!.postMessage('{"event":"command","func":"seekTo","args":[' + this.videoCurrentTime + ', true]}', '*');
        this.iframePlayer.nativeElement.contentWindow!.postMessage('{"event":"command","func":"playVideo","args":""}', '*'); // Resume playing the video
      }
    } else {
      // Switch to "Up Next" and pause the video
      if (this.videoPlayer) {
        this.iframePlayer.nativeElement.contentWindow!.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); // Pause the video
        this.iframePlayer.nativeElement.contentWindow!.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*'); // Get current time and store it
        // You might need to implement a way to handle the response to store `videoCurrentTime`
      }
    }
  }


  // BACKEND FUNCTIONS
  

  async loadQueue(){
  
    if(!this.division){ 
      return;
    }



    this.loading= true;
    if(this.serverTimeDifference == undefined) {
      const serverTimeString = await this.API.serverTime();
      const serverTime = new Date(serverTimeString);
      const localTime = new Date();
      this.serverTimeDifference =  serverTime.getTime() - localTime.getTime();
    }
    this.dataLoaded = false;
    if(this.subscription){
      this.subscription?.unsubscribe();
    }
    if(this.terminalInterval){
      clearInterval(this.terminalInterval)
    }


    this.divisionService.setDivision(this.division);
    
    this.subscription = this.queueService.queue$.subscribe((queueItems: any[]) => {
      this.upNextItems = queueItems.reduce((prev: UpNextItem[], item: any) => {
        return [...prev, {
          avatar: item.gender === 'male' ? '/assets/queue-display/Male_2.png' : item.gender =='female' ? '/assets/queue-display/Female_2.png' :'/assets/default.jpg',
          ticketNumber: `${item.tag}-${item.number.toString().padStart(3, '0')}`,
          personName: item.fullname,
          type : item.type,
        }];

      }, []);
      
    });
     this.queueService.listenToQueue();
     this.API.addSocketListener('listen-queue-display', async (message)=>{
        if(message.event == 'queue-events' ){
          await this.queueService.getTodayQueues();
          await this.loadTerminalData();
        }
     })
   
     await this.queueService.getTodayQueues();
     await this.loadTerminalData();
  
  }

  checkIfOnline(terminal:Terminal){
    if(!terminal) return 'available';
        const lastActive = new Date(terminal.last_active!);
        const diffInMinutes = (this.getServerTime().getTime() - lastActive.getTime()) / 60000; 
    
        if (diffInMinutes < 1.5 && terminal._status !== 'maintenance' && terminal.session_status !== 'closed') {
            return 'online';
        } else {
            return terminal._status; 
        }
    }

  async loadTerminalData(){
    let existingTerminals:string[] = []
        this.attendedQueue = await this.queueService.getActiveAttendedQueues();
        // console.log(this.attendedQueue);
        const updatedTerminals = await this.terminalService.getAllTerminals();
        // Update existing terminals
        for(let updatedTerminal of updatedTerminals){
          existingTerminals.push(updatedTerminal.id);
          const existingTerminal = this.counters.find(t => t.id === updatedTerminal.id);
          const ticket = this.attendedQueue.find(t=> t.terminal_id ==  updatedTerminal.id);
        
          if (existingTerminal) {
            // Update properties of the existing terminal
            Object.assign(existingTerminal, {
              id: updatedTerminal.id,
              status: updatedTerminal.status,
              ticket: ticket,
              terminal: updatedTerminal,
              ticketNumber: ticket ==undefined ? undefined : (ticket.queue!.tag) + '-'+ ticket.number!.toString().padStart(3, '0'),
              personName: updatedTerminal.attendant,
              number:Number(updatedTerminal.number)
            } as Counter);
          } else {
            // Optionally handle new terminals
            this.counters.push({
              id: updatedTerminal.id,
              status: updatedTerminal.status,
              ticket: ticket,
              terminal: updatedTerminal,
              ticketNumber: ticket ==undefined ? undefined : (ticket.queue!.tag) + '-'+ ticket.number!.toString().padStart(3, '0'),
              personName: updatedTerminal.attendant,
              number:Number(updatedTerminal.number)
            });
          }
        };
        this.counters = this.counters.filter((counter)=>existingTerminals.includes(counter.id));  
        if(!this.dataLoaded){
          this.loading = false;
          this.dataLoaded = true;
        }
  }
  
  countOnlineCounters(){
    return this.counters.filter(counter=>counter.status =='online').length;
  }
  getOnlineCounters(){
    return this.counters.filter(counter=>counter.status =='online');
  }


}




