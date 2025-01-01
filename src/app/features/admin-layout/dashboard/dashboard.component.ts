import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  ElementRef,
  QueryList,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import { Observable, of, take } from 'rxjs';
import Chart from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QueueDisplayComponent } from '../../queueing-layout/queue-display/queue-display.component';
import { UswagonCoreService } from 'uswagon-core';
import { ContentService } from '../../../services/content.service';
import { UswagonAuthService } from 'uswagon-auth';
import { DivisionService } from '../../../services/division.service';
import { QueueService } from '../../../services/queue.service';
import { KioskService } from '../../../services/kiosk.service';
import { TerminalService } from '../../../services/terminal.service';
import { ServiceService } from '../../../services/service.service';
import { firstValueFrom } from 'rxjs';
import type { WorkBook } from 'xlsx';
// Import section
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { map } from 'rxjs/operators';
import { FormatService } from '../../../services/format.service';

interface Division{
  id:string;
  name:string;
}

type MetricTitle = 'Registrar Division' | 'Cash Division' | 'Accounting Division' | 'Total Transactions';

interface Metric {
  title: MetricTitle;
  data: any; // Adjust this based on your actual data structure
}

interface QueueAnalytics {
  office: string;
  currentTicket: number;
  waitingCount: number;
  avgWaitTime: string;
  status: string;
}

interface StaffPerformance {
  name: string;
  office: string;
  ticketsServed: number;
  avgServiceTime: string;
  customerRating: number;
  status: string;
  isExpanded: boolean;
  dailyPerformance: {
    date: string;
    clientsServed: number;
  }[];
}


interface DeskAttendantPerformanceMetrics {
  fullname: string,
  division_name: string,
  attendantId: string;
  totalCheckIns: number;
  averageCheckInTime: number;
  totalCheckInsToday: number;
  totalCheckInsThisWeek: number;
  averageTimeService: string;
}

interface KioskStatus {
  id: string;
  location: string;
  status: string;
  ticketCount: number;
  type: 'kiosk' | 'terminal';
  kioskName?: string;
  terminalNumber?: string;
}



@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, QueueDisplayComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('canvasElement') canvasElements!: QueryList<ElementRef>;

  queueAnalytics$: Observable<QueueAnalytics[]> = of([]);
  staffPerformance$: Observable<StaffPerformance[]> = of([]);
  kioskStatus$: Observable<KioskStatus[]> = of([]);
  overallMetrics$: Observable<any[]> = of([]);

  paginatedKioskStatus: KioskStatus[] = [];
  kioskCurrentPage: number = 1;
  kioskItemsPerPage: number = 8;
  totalKioskPages: number = 1;

  currentUser!: { firstName: string };
  isSuperAdmin: boolean = this.auth.accountLoggedIn() === 'superadmin';
  contents: any[] = [];
  divisions: Division[] = [];
  charts: Chart[] = [];
  content: any;
  selectedDivision: string = '';
  selectedFilter: string = 'day';
  selectedMetric: Metric | null = null;
  selectedMetricTitle: string | null = null;
  autoRefreshEnabled: boolean = true;

  lastOverallTransaction?:number;
  dataLoaded: boolean = false;
  dashboardInterval:any;

  availableKiosks: number = 0;
  availableTerminals: number = 0;
  totalServices: number = 0;

  staffCurrentPage: number = 1;
  staffItemsPerPage: number = 5;
  staffTotalPages: number = 1;

  lastRefreshTime: number = Date.now();
  lastUpdated: string = '';
  refreshInterval: any;
  updateTimeInterval: any;
  isRefreshing: boolean = false;

  deskAttendantMetrics: DeskAttendantPerformanceMetrics[] = [];
  metricsLoading: boolean = false;

      
  paginatedStaffPerformance: any[] = [];
  deskAttendantCurrentPage: number = 1; 
  deskAttendantTotalPages: number = 1; 



  constructor(
    private API: UswagonCoreService,
    private divisionService: DivisionService,
    private contentService: ContentService,
    private queueService:QueueService,
    private kioskService: KioskService,
    private terminalService: TerminalService,
    private serviceService: ServiceService,
    private formatService:FormatService,
    private auth: UswagonAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
  
    this.currentUser = { firstName: 'User' };
    this.loadContents();
    this.staffPerformance$.subscribe(staff => {
      if (staff) {
        this.staffTotalPages = Math.ceil(staff.length / this.staffItemsPerPage);
      }
    });

    this.loadTerminalsAndKiosks();
    this.loadDeskAttendants();
    this.startRealtimeUpdates();
    this.updateLastUpdatedTime();
    this.refreshData();
  }





private async loadTerminalsAndKiosks() {
  const kioskData = await this.API.read({
      selectors: [
          'k.id',
          'k.number as kioskName',
          'd.name as location',
          'k.status'
      ],
      tables: 'kiosks k LEFT JOIN divisions d ON k.division_id = d.id',
      conditions: ''
  });

  const terminalData = await this.API.read({
      selectors: [
          't.id',
          't.number as terminalNumber',
          'd.name as location',
          't.status'
      ],
      tables: 'terminals t LEFT JOIN divisions d ON t.division_id = d.id',
      conditions: ''
  });

  const kioskTicketCounts = await Promise.all(
      kioskData.output.map(async (kiosk: any, index:number) => {
          const ticketData = await this.API.read({
              selectors: ['COUNT(id) as ticketCount'],
              tables: 'queue',
              conditions: `WHERE kiosk_id = '${kiosk.id}' ORDER BY kioskName`
          });

          const ticketCount = ticketData.success && ticketData.output.length > 0
              ? parseInt(ticketData.output[0].ticketCount, 10)
              : 0;

          return {
              id: kiosk.id,
              location: kiosk.location,
              status: kiosk.status === 'available' ? 'Operational' : 'Out of Service',
              ticketCount,
              type: 'kiosk' as const,
              kioskName: index+ 1
          };
      })
  );

  const terminalTicketCounts = await Promise.all(
      terminalData.output.map(async (terminal: any, index:number) => {
          const sessionData = await this.API.read({
              selectors: ['COUNT(id) as sessionCount'],
              tables: 'terminal_sessions',
              conditions: `WHERE terminal_id = '${terminal.id}' ORDER BY terminalNumber ASC`
          });

          const ticketCount = sessionData.success && sessionData.output.length > 0
              ? parseInt(sessionData.output[0].sessionCount, 10)
              : 0;

          return {
              id: terminal.id,
              location: terminal.location,
              status: terminal.status === 'available' ? 'Operational' : 'Out of Service',
              ticketCount,
              type: 'terminal' as const,
              terminalNumber: index + 1
          };
      })
  );

  const allData: KioskStatus[] = [...kioskTicketCounts, ...terminalTicketCounts];

  this.kioskStatus$ = of(allData);
  this.updateKioskPagination();
}



  

  private async loadDeskAttendants() {
    const deskAttendantData = await this.API.read({
      selectors: [
        'da.id as attendantId',  
        'da.username',           
        'da.fullname',           
        'd.name as division_name' 
      ],
      tables: 'desk_attendants da LEFT JOIN divisions d ON da.division_id = d.id',
      conditions: ''
    });
  
    console.log('API response for desk attendants:', deskAttendantData);
  
    if (deskAttendantData.success && deskAttendantData.output.length > 0) {
      this.staffPerformance$ = of(
        deskAttendantData.output.map((item: any) => ({
          id: item.attendantId,
          name: item.fullname,          
          office: item.division_name,     
          ticketsServed: 0,               
          totalCheckins: 0,               
          avgServiceTime: 'N/A'           
        }))
      );
  
      console.log('Mapped desk attendants:', deskAttendantData.output);
  
      this.staffTotalPages = Math.ceil(deskAttendantData.output.length / 5);
      this.updateDeskAttendantPage();
  
      for (const attendant of deskAttendantData.output) {
        console.log(`Fetching terminal sessions for attendantId: ${attendant.attendantId}`);
        await this.fetchTerminalSessions(attendant.attendantId, attendant.fullname, attendant.division_name);
      }
  
      console.log('Final desk attendant metrics:', this.deskAttendantMetrics);
    } else {
      console.warn('No desk attendants found or API response unsuccessful.');
    }
  }
  
  
  
  
  async fetchTerminalSessions(attendantId: string, fullName: string, division_name: string) {
    try {
      const response = await this.API.read({
        selectors: ['*'],
        tables: 'terminal_sessions',
        conditions: `WHERE attendant_id = '${attendantId}'`,
      });
  
      console.log(`API response for terminal sessions (attendantId: ${attendantId}):`, response);
  
      if (response.success && response.output.length > 0) {
        const sessions = response.output;
        const metrics = this.calculateMetrics(sessions, fullName, division_name, attendantId);
        this.deskAttendantMetrics.push(metrics);
        console.log(`Calculated metrics for attendantId ${attendantId}:`, metrics);
      } else {
        console.warn(`No terminal sessions found for attendantId: ${attendantId}`);
      }
    } catch (error) {
      console.error(`Error fetching terminal sessions for attendantId: ${attendantId}`, error);
    }
  }

  
  calculateMetrics(sessions: any[], fullname: string, division_name: string, attendantId: string): DeskAttendantPerformanceMetrics {
    const totalCheckIns = sessions.length;
    const checkInTimesByDate: Record<string, number[]> = {};
  
    sessions.forEach((session) => {
      const startTime = new Date(session.start_time);
      const dateKey = startTime.toISOString().split('T')[0];
      const checkInTimeInMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  
      if (!checkInTimesByDate[dateKey]) {
        checkInTimesByDate[dateKey] = [];
      }
      checkInTimesByDate[dateKey].push(checkInTimeInMinutes);
    });
  
    const dailyAverages: number[] = Object.values(checkInTimesByDate).map((times) => {
      const totalMinutes = times.reduce((sum, time) => sum + time, 0);
      return totalMinutes / times.length;
    });
  
    const overallAverageCheckInTimeInMinutes =
      dailyAverages.reduce((sum, avg) => sum + avg, 0) / dailyAverages.length;
  
    const totalDuration = sessions.reduce((acc, session) => {
      const startTime = new Date(session.start_time).getTime();
      const lastActive = new Date(session.last_active).getTime();
      return acc + (lastActive - startTime);
    }, 0);
  
    const averageDurationMs = totalDuration / totalCheckIns;
    const averageServiceMinutes = Math.floor(averageDurationMs / 60000);
    const averageServiceSeconds = Math.floor((averageDurationMs % 60000) / 1000);
    const averageTimeService = `${averageServiceMinutes}:${averageServiceSeconds.toString().padStart(2, '0')} mins`;
  
    const totalCheckInsToday = sessions.filter(session =>
      new Date(session.start_time).toDateString() === new Date().toDateString()).length;
  
    const totalCheckInsThisWeek = sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      const currentDate = new Date();
      const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    }).length;
  
    const metrics = {
      attendantId,
      fullname,
      division_name,
      totalCheckIns,
      averageCheckInTime: overallAverageCheckInTimeInMinutes,
      totalCheckInsToday,
      totalCheckInsThisWeek,
      averageTimeService
    };
  
    console.log(`Metrics for attendantId ${attendantId}:`, metrics);
    return metrics;
  }
  
  
  


  updateDeskAttendantPage() {
    this.staffPerformance$.pipe(take(1)).subscribe(staffData => {
      const start = (this.staffCurrentPage - 1) * 5;
      const end = start + 5;
      this.paginatedStaffPerformance = staffData.slice(start, end);
    });
  }
  
  onDeskAttendantPageChange(direction: 'prev' | 'next') {
    if (direction === 'prev' && this.staffCurrentPage > 1) {
      this.deskAttendantCurrentPage--;
    } else if (direction === 'next' && this.deskAttendantCurrentPage < this.deskAttendantTotalPages) {
      this.deskAttendantCurrentPage++;
    }
    this.updateDeskAttendantPage();
  }
  


  ngAfterViewInit() {
    this.updateOverallMetrics();
  }

  ngOnDestroy() {
    this.destroyCharts();
    if(this.dashboardInterval){
      clearInterval(this.dashboardInterval)
    }
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.updateTimeInterval) clearInterval(this.updateTimeInterval);
  }

  private startRealtimeUpdates() {
   this.API.addSocketListener('admin-dashboard-events' ,(data)=>{
      if(data.event == 'admin-dashboard-events' ){
        this.refreshData();
      }
   })
   
  }

  async refreshData() {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    try {
      // Refresh all data sources
      await Promise.all([
        this.queueService.getAllQueues(),
        this.queueService.getAllTodayQueues(),
        this.queueService.geAllAttendedQueues(),
        // Add other necessary data refreshes
      ]);

      // Update all observables and states
      this.queueAnalytics$ = this.getMockQueueAnalytics();
      // this.staffPerformance$ = this.getMockStaffPerformance();
      // this.kioskStatus$ = this.getMockKioskStatus();
      this.updateOverallMetrics();
      this.updateKioskPagination();

      // Update non-super admin data if applicable
      if (!this.isSuperAdmin) {
        const availableKiosks = await this.kioskService.getKiosks('available');
        this.availableKiosks = availableKiosks.length;

        const terminals = await this.terminalService.getAllTerminals();
        this.availableTerminals = terminals.filter(
          (terminal: { status: string }) => terminal.status === 'available'
        ).length;

        const divisionId = this.auth.getUser().division_id;
        const services = await this.serviceService.getAllServices(divisionId);
        this.totalServices = services.length;
      }

      this.lastRefreshTime = Date.now();
      this.showToast('Data refreshed successfully');
    } catch (error) {
      this.showToast('Failed to refresh data', 'error');
      console.error('Refresh error:', error);
    } finally {
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  }



  async downloadReport() {
    try {
      // Import xlsx dynamically to reduce initial bundle size
      const XLSX = await import('xlsx');
      
      // Create workbook
      const wb = XLSX.utils.book_new();

      

      // Todays Queue
      
      let queueRows = this.queueService.allTodayQueue;
      if(!this.isSuperAdmin){
        queueRows = queueRows.filter(queue=>queue.division_id == this.divisionService.selectedDivision!.id);
      }
      const kiosks = await this.kioskService.getAll();
      const services  = await this.serviceService.getAllSubServices();
      let formats = await this.formatService.getAll();
      if(formats.length <=0 ){
        formats = [
          {id:'priority', name:'Priority', prefix:'P'},
          {id:'regular', name:'Regular', prefix:'R'},
        ]
      }
      const queueList = [
       [ 'ID', 'Division', 'Kiosk', 'Client Name','Client Gender' ,'Services Chosen', 'Ticket Number','Client Type'],
       ...queueRows.map(row=>[
          row.id,
          this.divisions.find(division=>division.id == row.division_id)?.name,
         kiosks.find((kiosk:any)=>kiosk.id == row.kiosk_id)!.code,
         row.fullname,
         row.gender,
         row.services.split(', ').map(id=> services.find((service:any)=>service.id == id)?.name).join(','),
         row.number,
         formats.find(format=> format.id == row.type)?.name
       ])
      ];

      const queueDataSheet = XLSX.utils.aoa_to_sheet(queueList);
      XLSX.utils.book_append_sheet(wb, queueDataSheet, 'Today Queue');

      // Overall Metrics Sheet
      const metrics = await firstValueFrom(this.overallMetrics$);
      const metricsData = [
        ['Metric', 'Value', 'Period'],
        ...metrics.map(metric => [
          metric.title,
          metric.value.toString(),
          this.selectedFilter.toUpperCase()
        ]),
        // Additional metrics for non-super admins
        ...((!this.isSuperAdmin) ? [
          ['Available Kiosks', this.availableKiosks.toString(), 'units available'],
          ['Available Terminals', this.availableTerminals.toString(), 'units available'],
          ['Total Services', this.totalServices.toString(), 'active services']
        ] : [])
      ];
      const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(wb, metricsSheet, 'Overall Metrics');
  
      // Queue Status Sheet
      const queueData = await firstValueFrom(this.queueAnalytics$);
      if (queueData?.length) {
        const queueSheet = XLSX.utils.json_to_sheet(queueData.map(q => ({
          'Office': q.office,
          'Current Ticket': q.currentTicket,
          'Waiting': q.waitingCount,
          'Average Wait Time': q.avgWaitTime,
          'Status': q.status
        })));
        XLSX.utils.book_append_sheet(wb, queueSheet, 'Queue Status');
      }
  
      // Staff Performance Sheet
      const staffData = await firstValueFrom(this.staffPerformance$);
      if (staffData?.length) {
        const staffSheet = XLSX.utils.json_to_sheet(staffData.map(s => ({
          'Staff Name': s.name,
          'Office': s.office,
          'Tickets Served': s.ticketsServed,
          'Average Service Time': s.avgServiceTime,
          // 'Rating': `${s.customerRating}/5`
        })));
        XLSX.utils.book_append_sheet(wb, staffSheet, 'Staff Performance');
      }
  
      // Kiosk Status Sheet
      const kioskData = await firstValueFrom(this.kioskStatus$);
      if (kioskData?.length) {
        const kioskSheet = XLSX.utils.json_to_sheet(kioskData.map(k => ({
          'ID': k.id,
          'Location': k.location,
          'Status': k.status,
        
        })));
        XLSX.utils.book_append_sheet(wb, kioskSheet, 'Kiosk Status');
      }
  
      // Summary Sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Report Period', this.selectedFilter.toUpperCase()],
        ['Total Transactions', metrics.find(m => m.title === 'Total Transactions')?.value.toString() || '0'],
        ['Registrar Division', metrics.find(m => m.title === 'Registrar Division')?.value.toString() || '0'],
        ['Cash Division', metrics.find(m => m.title === 'Cash Division')?.value.toString() || '0'],
        ['Accounting Division', metrics.find(m => m.title === 'Accounting Division')?.value.toString() || '0'],
        ['Available Kiosks', this.availableKiosks.toString()],
        ['Available Terminals', this.availableTerminals.toString()],
        ['Total Services', this.totalServices.toString()],
        ['System Status', 'OPERATIONAL'],
        ['Last Updated', this.lastUpdated]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  
      // Generate Excel file
      const fileName = `queue-management-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
  
      this.showToast('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      this.showToast('Failed to download report', 'error');
    }
  }


  toggleAutoRefresh() {
    if (this.autoRefreshEnabled) {
      this.startRealtimeUpdates();
    } else {
      this.API.addSocketListener('admin-dashboard-events', ()=>{});
    }
  }


  private showToast(message: string, type: 'success' | 'error' = 'success') {
    // Implement your toast notification logic here
    console.log(`${type}: ${message}`);
  }






  private updateLastUpdatedTime() {
    this.updateTimeInterval = setInterval(() => {
      const seconds = Math.floor((Date.now() - this.lastRefreshTime) / 1000);

      if (seconds < 60) {
        this.lastUpdated = `${seconds} seconds ago`;
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        this.lastUpdated = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else {
        const hours = Math.floor(seconds / 3600);
        this.lastUpdated = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      }
    }, 1000);
  }





  onMetricCardClick(metric: any) {
    // Toggle selection: if the metric is already selected, clear it; otherwise, set it.
    this.selectedMetric = this.selectedMetric?.title === metric.title ? null : metric;
    this.updateChartWithMetric();
  }

  updateChartWithMetric() {
    if (!this.charts || this.charts.length === 0) return;

    const labels = this.getFilteredLabels();

    // Define colors for each dataset for consistency
    const colors: Record<MetricTitle, string> = {
      'Registrar Division': '#22C1C3', // Teal
      'Cash Division': '#FFA726',      // Orange
      'Accounting Division': '#42A5F5', // Blue
      'Total Transactions': '#66BB6A', // Green
    };

    // Retrieve datasets based on selectedMetric
    const datasets = this.overallMetrics$.pipe(take(1)).subscribe(metrics => {
      const filteredMetrics = metrics.filter((metric) => {
        return this.selectedMetric ? metric.title === this.selectedMetric.title : true;
      });


// Use type assertion when accessing colors
const datasets = filteredMetrics.map((metric) => {
  const data = this.getFilteredData(metric.data);
  const ctx = this.canvasElements.first.nativeElement.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(34, 193, 195, 0.3)');
  gradient.addColorStop(1, 'rgba(253, 187, 45, 0.1)');

  return {
    label: metric.title,
    data: data,
    fill: true,
    backgroundColor: gradient,
    borderColor: colors[metric.title as MetricTitle] || '#66BB6A', // Safe access with assertion
    borderWidth: 3,
    pointBackgroundColor: colors[metric.title as MetricTitle] || '#66BB6A', // Safe access with assertion
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.4,
  };
});

      this.charts.forEach((chart) => {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        chart.update();
      });
    });
  }


  onStaffPageChange(direction: 'prev' | 'next'): void {
    if (direction === 'prev' && this.staffCurrentPage > 1) {
      this.staffCurrentPage--;
    } else if (direction === 'next' && this.staffCurrentPage < this.staffTotalPages) {
      this.staffCurrentPage++;
    }
  }

  getStatus(){
    const waiting = this.queueService.allTodayQueue.length;

    return waiting > 20 ? 'Busy' : waiting > 15 ? 'Moderate' : 'Normal'
  }

  getMockQueueAnalytics(): Observable<QueueAnalytics[]> {
    const perDivision = this.divisions.reduce((prev:any[],item)=>{
      return [...prev,
        {
          office: item.name,
          currentTicket:0,
          waitingCount: this.queueService.allTodayQueue.filter(queue=>queue.division_id == item.id).length,
          avgWaitTime: `${this.calculateWaitingTime(item.id)} minutes`,
          status: this.getStatus()
        }

      ]
    },[])
    return of([
      ...perDivision,
      { office: 'Total', currentTicket: 45, waitingCount: this.queueService.allTodayQueue.length, avgWaitTime: `${this.calculateWaitingTime()} minutes`, status: 'Busy' },
    ]);
  }



  async updateOverallMetrics() {
    const perDivision = this.divisions.map((division) => ({
      title: division.name,
      value: 0,
      data: {
        day: this.countItemsPerDay(division.id),
        week: this.countItemsPerWeek(division.id),
        month: this.countItemsPerMonth(division.id),
        year: this.countItemsPerYear(division.id),
      },
    }));


    const totalTransactions = {
      title: 'Total Transactions',
      value: 0,
      data: {
        day: this.countItemsPerDay(),
        week: this.countItemsPerWeek(),
        month: this.countItemsPerMonth(),
        year: this.countItemsPerYear(),
      },
    };

    const combinedMetrics = [
      ...perDivision,
      totalTransactions,
    ];

    const updatedMetrics = combinedMetrics.map((metric) => ({
      ...metric,
      value: this.calculateMetricValue(metric.data),
    }));

    this.overallMetrics$ = of(updatedMetrics);

    // Initialize charts with all metrics displayed
    this.overallMetrics$.pipe(take(1)).subscribe((metrics) => {
      this.destroyCharts();
      this.initializeCharts(metrics);
    });
  }

  calculateMetricValue(data: any): number {
    const filteredData = this.getFilteredData(data);
    return filteredData.reduce((acc: number, val: number) => acc + val, 0);
  }

  calculateWaitingTime(division_id?:string){
    let totalWaitingTime = 0;

    let items = this.queueService.attendedQueues;

    if(division_id){
      items = this.queueService.attendedQueues.filter(attended=>  attended.queue!.division_id == division_id);
    }

    let ignoredItems = 0;

    for (const record of items) {
        const waitingTime = (new Date(record.attended_on)).getTime() - (new Date(record.queue!.timestamp!)).getTime();
        if(waitingTime < 0){
          ignoredItems += 1;
        }else{
          totalWaitingTime += waitingTime;
        }
    }

    const averageWaitingTime = items.length == 0 ? 0 :totalWaitingTime / items.length - ignoredItems;

    // Convert milliseconds to a more readable format, e.g., minutes
    return (averageWaitingTime / (1000 * 60)).toFixed(2); // average waiting time in minutes
  }



  countItemsPerDay  (division_id?:string) {
    let items = this.queueService.allQueue;
    if(division_id){
      items = items.filter(item=> item.division_id == division_id);
    }
      const now = new Date();
      // Initialize an array with 24 zeros (for each hour)
      const countByHour = Array(24).fill(0);
      items.forEach(item => {
          const date = new Date(item.timestamp);
          const hour = date.getHours(); // Get the hour (0-23)
          // alert(date.toDateString());
          if(date.toDateString() == now.toDateString()){
            countByHour[hour]++;
          }
      });

      return countByHour;
  };

  countItemsPerWeek(division_id?:string) {
    let items = this.queueService.allQueue;
    if(division_id){
      items = items.filter(item=> item.division_id == division_id);
    }

    const today = new Date();
    const startOfPeriod = new Date(today);
    startOfPeriod.setDate(today.getDate() - 6); // Set to 7 days before today

    const countByDay: any = {};

    items.forEach((item: any) => {
      const date = new Date(item.timestamp);

      // Check if the item is within the last 8 days
      if (date >= startOfPeriod && date <= today) {
        const dayKey = date.toISOString().split('T')[0]; // Use ISO string to get YYYY-MM-DD format

        countByDay[dayKey] = (countByDay[dayKey] || 0) + 1; // Increment the count for that day
      }
    });

    // Create an array of days in the correct order
    const result = [];
    for (let i = 6; i >= 0; i--) { // Iterate from 7 days ago to today
      const day = new Date();
      day.setDate(today.getDate() - i);
      const dayKey = day.toISOString().split('T')[0]; // Get YYYY-MM-DD format

      result.push(countByDay[dayKey] || 0); // Push the count or 0 if no items for that day
    }

    return result;
  }

  countItemsPerMonth(division_id?:string) {
      let items = this.queueService.allQueue;

      if (division_id) {
          items = items.filter(item => item.division_id === division_id);
      }

      const countByWeek = [0, 0, 0, 0, 0]; // Initialize an array for the 5 weeks of the month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // getMonth() returns 0-11

      items.forEach((item) => {
          const date = new Date(item.timestamp);
          const year = date.getFullYear();
          const month = date.getMonth(); // 0-11

          if (year === currentYear && month === currentMonth) {
              // Calculate the week number of the month (0-4)
              const week = Math.floor(date.getDate() / 7); // Calculate week (0-4)
              countByWeek[week] += 1; // Increment the count for that week
          }
      });

      return countByWeek;
  }
  countItemsPerYear(division_id?:string) {
    let items = this.queueService.allQueue;
    if(division_id){
      items = items.filter(item=> item.division_id == division_id);
    }

    const countByMonth = new Array(12).fill(0); // Create an array with 12 months initialized to 0
    const now = new Date();
    // Iterate over each item to count occurrences by month
    items.forEach((item) => {
      const date = new Date(item.timestamp);
      const month = date.getMonth(); // Get month (0-11)
      if(date.getFullYear() == now.getFullYear()){
        countByMonth[month] += 1; // Increment the count for that month
      }
    });

    return countByMonth;

  }

  getMockOverallMetrics() {
    const perDivision = this.divisions.reduce((prev:any[],item)=>{
      return [
        ...prev,
        {
          title: item.name,
          value:0,
          data:{
            day: this.countItemsPerDay(item.id),
            week: this.countItemsPerWeek(item.id),
            month:this.countItemsPerMonth(item.id),
            year: this.countItemsPerYear(item.id),
          }

        }
      ];
    },[]);
    return [
      {
        title: 'Total Transactions',
        value: 0,
        data: {
          day: this.countItemsPerDay(),
          week: this.countItemsPerWeek(),
          month:this.countItemsPerMonth(),
          year: this.countItemsPerYear(),
        },
      },
      ...perDivision
    ];
  }

  getFilteredData(data: any): number[] {
    if (this.selectedFilter === 'day') {
      return data.day;
    } else if (this.selectedFilter === 'week') {
      return data.week;
    } else if (this.selectedFilter === 'month') {
      return data.month;
    } else {
      return data.year;
    }
  }



  initializeCharts(metrics: any[]) {
    this.destroyCharts();

    this.canvasElements.forEach((canvasElement) => {
      const ctx = canvasElement.nativeElement.getContext('2d');
      const labels = this.getFilteredLabels();

      // Define colors for each dataset
      const colors = ['#22C1C3', '#FFA726', '#42A5F5', '#66BB6A'];

      const datasets = metrics.map((metric, index) => {
        const data = this.getFilteredData(metric.data);
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(34, 193, 195, 0.3)');
        gradient.addColorStop(1, 'rgba(253, 187, 45, 0.1)');

        return {
          label: metric.title,
          data: data,
          fill: true,
          backgroundColor: gradient,
          borderColor: colors[index % colors.length], // Cycle through the defined colors
          borderWidth: 3,
          pointBackgroundColor: colors[index % colors.length],
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
        };
      });

      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets, // Include all datasets (divisions + total)
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1000,
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#333',
                font: {
                  size: 14,
                },
              },
            },
            tooltip: {
              backgroundColor: '#f5f5f5',
              bodyColor: '#333',
              borderColor: '#ddd',
              borderWidth: 1,
              titleColor: '#666',
            },
          },
          scales: {
            x: {
              ticks: { color: '#555', font: { size: 12 } },
              grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
            y: {
              ticks: { color: '#555', font: { size: 12 } },
              grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
          },
        },
      });

      this.charts.push(chart);
    });
  }


  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }



  getFilteredLabels(): string[] {
    if (this.selectedFilter === 'day') {
      return Array.from({ length: 24 }, (_, i) => `${i}:00`);
    } else if (this.selectedFilter === 'week') {
      return this.getLast7Days();
    } else if (this.selectedFilter === 'month') {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4','Week 5'];
    } else {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
  }


  getLast7Days(): string[] {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return days;
  }



  async loadContents() {
    this.API.setLoading(true);
    if (this.isSuperAdmin) {
      this.selectedDivision = (await this.divisionService.getDivision())!.id;
      this.divisions = this.divisionService.divisions;
      this.contents = await this.contentService.getContentSettings();
      if (this.contents.length > 0) {
        this.content = this.contents.find(content => content.division_id === this.selectedDivision);
      }
    } else {
       // Non-super admin logic:
       this.content = await this.contentService.getContentSetting();

       // Calculate the number of available kiosks:
       const availableKiosks = await this.kioskService.getKiosks('available');
       this.availableKiosks = availableKiosks.length;

       // Calculate the number of available terminalsfme:
       const terminals = await this.terminalService.getAllTerminals();
       this.availableTerminals = terminals.filter(
         (terminal: { status: string }) => terminal.status === 'available'
       ).length;

       // Fetch total services for the user's division:
       const divisionId = this.auth.getUser().division_id;
       const services = await this.serviceService.getAllServices(divisionId);
       this.totalServices = services.length;
     }
    await this.queueService.getAllQueues();
    await this.queueService.getAllTodayQueues();
    await this.queueService.geAllAttendedQueues();
    this.queueAnalytics$ = this.getMockQueueAnalytics();
    // this.staffPerformance$ = this.getMockStaffPerformance();
    // this.kioskStatus$ = this.getMockKioskStatus();
    this.updateOverallMetrics();
    this.updateKioskPagination();
    this.API.setLoading(false);
    if(this.dashboardInterval){
      clearInterval(this.dashboardInterval)
    }
    this.startRealtimeUpdates();
    this.cdr.detectChanges();
  }

  changeContent(division_id: string) {
    this.selectedDivision = division_id;
    this.content = this.contents.find(content => content.division_id === division_id);
    this.cdr.detectChanges();
  }

  destroyCharts() {
    this.charts.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = [];

  }

  onFilterChange() {
    this.updateOverallMetrics();

  }

  updateKioskPagination() {
    this.kioskStatus$.subscribe(kioskData => {
      const start = (this.kioskCurrentPage - 1) * this.kioskItemsPerPage;
      const end = start + this.kioskItemsPerPage;
      this.paginatedKioskStatus = kioskData.slice(start, end);
      this.totalKioskPages = Math.ceil(kioskData.length / this.kioskItemsPerPage);
    });
  }

  onKioskPageChange(direction: 'prev' | 'next') {
    if (direction === 'prev' && this.kioskCurrentPage > 1) {
      this.kioskCurrentPage--;
    } else if (direction === 'next' && this.kioskCurrentPage < this.totalKioskPages) {
      this.kioskCurrentPage++;
    }
    this.updateKioskPagination();
  }
}
