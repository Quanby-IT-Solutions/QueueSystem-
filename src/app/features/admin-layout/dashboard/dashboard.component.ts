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
// Import section
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { map } from 'rxjs/operators';

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

interface KioskStatus {
  id: string;
  location: string;
  status: string;
  ticketsIssued: number;
  lastMaintenance: string;
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

  constructor(
    private API: UswagonCoreService,
    private divisionService: DivisionService,
    private contentService: ContentService,
    private queueService:QueueService,
    private kioskService: KioskService,
    private terminalService: TerminalService,
    private serviceService: ServiceService,
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

    this.startRealtimeUpdates();
    this.updateLastUpdatedTime();
    this.refreshData();
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
      this.staffPerformance$ = this.getMockStaffPerformance();
      this.kioskStatus$ = this.getMockKioskStatus();
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
      const doc = new jsPDF();
      const margins = 15;

      // Header
      doc.setFontSize(20);
      doc.text('Queue Management System Report', margins, 20);

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margins, 30);

      // Overall Metrics Section
      doc.setFontSize(12);
      doc.text('Overall Metrics', margins, 40);

      // Get all metrics data
      const metrics = await firstValueFrom(this.overallMetrics$);
      const metricsData = [
        // Division metrics
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

      (doc as any).autoTable({
        startY: 45,
        head: [['Metric', 'Value', 'Period']],
        body: metricsData,
        theme: 'striped',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 40 },
          2: { cellWidth: 60 }
        }
      });

      // Rest of your code remains the same...
      // Queue Status
      const queueData = await firstValueFrom(this.queueAnalytics$);
      if (queueData?.length) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Queue Status', margins, 20);

        (doc as any).autoTable({
          startY: 25,
          head: [['Office', 'Current Ticket', 'Waiting', 'Avg Wait Time', 'Status']],
          body: queueData.map(q => [
            q.office,
            q.currentTicket.toString(),
            q.waitingCount.toString(),
            q.avgWaitTime,
            q.status
          ]),
          theme: 'striped',
          styles: {
            fontSize: 10,
            cellPadding: 5,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
          }
        });
      }

      // Staff Performance
      const staffData = await firstValueFrom(this.staffPerformance$);
      if (staffData?.length) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Staff Performance Metrics', margins, 20);

        (doc as any).autoTable({
          startY: 25,
          head: [['Staff Name', 'Office', 'Tickets Served', 'Avg Service Time', 'Rating']],
          body: staffData.map(s => [
            s.name,
            s.office,
            s.ticketsServed.toString(),
            s.avgServiceTime,
            `${s.customerRating}/5`
          ]),
          theme: 'striped',
          styles: {
            fontSize: 10,
            cellPadding: 5,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
          }
        });
      }

      // Kiosk Status
      const kioskData = await firstValueFrom(this.kioskStatus$);
      if (kioskData?.length) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Kiosk Status Overview', margins, 20);

        (doc as any).autoTable({
          startY: 25,
          head: [['ID', 'Location', 'Status', 'Tickets Issued', 'Last Maintenance']],
          body: kioskData.map(k => [
            k.id,
            k.location,
            k.status,
            k.ticketsIssued.toString(),
            k.lastMaintenance
          ]),
          theme: 'striped',
          styles: {
            fontSize: 10,
            cellPadding: 5,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
          }
        });
      }

      // Summary
      doc.addPage();
      doc.setFontSize(12);
      doc.text('System Summary', margins, 20);

      const summaryData = [
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

      (doc as any).autoTable({
        startY: 25,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
        }
      });

      // Save the PDF
      const fileName = `queue-management-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

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
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
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
        // If no specific metric is selected, show all, otherwise only the selected one.
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

  getMockStaffPerformance(): Observable<StaffPerformance[]> {
    return of([
      { name: 'Jon Doe', office: 'Cashier', ticketsServed: 20, avgServiceTime: '10 mins', customerRating: 4.8, status: 'Active', isExpanded: false, dailyPerformance: [] },
      { name: 'Jane Doe', office: 'Registrar', ticketsServed: 25, avgServiceTime: '8 mins', customerRating: 4.9, status: 'Active', isExpanded: false, dailyPerformance: [] },
      { name: 'Alice Smith', office: 'Accounting', ticketsServed: 18, avgServiceTime: '12 mins', customerRating: 4.7, status: 'Active', isExpanded: false, dailyPerformance: [] },
      { name: 'Bob Johnson', office: 'Cashier', ticketsServed: 22, avgServiceTime: '9 mins', customerRating: 4.6, status: 'Active', isExpanded: false, dailyPerformance: [] },
      { name: 'Charlie Brown', office: 'Registrar', ticketsServed: 23, avgServiceTime: '11 mins', customerRating: 4.5, status: 'Active', isExpanded: false, dailyPerformance: [] },
    ]);
  }

  getMockKioskStatus(): Observable<KioskStatus[]> {
    return of([
      { id: 'K01', location: 'Main Hall', status: 'Operational', ticketsIssued: 500, lastMaintenance: '2023-09-20' },
      { id: 'K02', location: 'Branch A', status: 'Low Paper', ticketsIssued: 300, lastMaintenance: '2023-09-25' },
      { id: 'K03', location: 'Branch B', status: 'Out of Service', ticketsIssued: 0, lastMaintenance: '2023-09-10' },
      { id: 'K04', location: 'Branch C', status: 'Operational', ticketsIssued: 700, lastMaintenance: '2023-10-01' },
      { id: 'K05', location: 'Branch D', status: 'Operational', ticketsIssued: 650, lastMaintenance: '2023-10-05' },
      { id: 'K06', location: 'Branch E', status: 'Out of Service', ticketsIssued: 0, lastMaintenance: '2023-10-15' },
      { id: 'K07', location: 'Branch F', status: 'Operational', ticketsIssued: 450, lastMaintenance: '2023-10-20' },
      { id: 'K08', location: 'Branch G', status: 'Low Paper', ticketsIssued: 200, lastMaintenance: '2023-10-22' },
      { id: 'K09', location: 'Branch H', status: 'Operational', ticketsIssued: 550, lastMaintenance: '2023-10-25' },
      { id: 'K10', location: 'Branch I', status: 'Operational', ticketsIssued: 400, lastMaintenance: '2023-10-28' },

    ]);
  }

  // async updateOverallMetrics() {

  //   const metrics =  this.getMockOverallMetrics();
  //   const updatedMetrics = metrics.map((metric) => ({
  //     ...metric,
  //     value: this.calculateMetricValue(metric.data),
  //   }));
  //   this.overallMetrics$ = of(updatedMetrics);
  //   this.overallMetrics$.pipe(take(1)).subscribe((metrics) => {
  //     this.destroyCharts();
  //     this.initializeCharts(metrics);
  //   });
  // }

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
    if(division_id){
      items = items.filter(item=> item.division_id == division_id);
    }
    const countByWeek = [0, 0, 0, 0]; // Initialize an array for the 4 weeks of the month
      const now = new Date();

      items.forEach((item) => {
        const date = new Date(item.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Get the month and pad with zero

        if (year === now.getFullYear() && month === String(now.getMonth() + 1).padStart(2, '0')) {
          // Get the week number of the month (1-4)
          const week = Math.ceil((date.getDate() + 6) / 7) - 1; // Zero-based index for array
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

  // initializeCharts(metrics: any[]) {

  //   this.destroyCharts();

  //   this.canvasElements.forEach((canvasElement, index) => {
  //     const ctx = canvasElement.nativeElement.getContext('2d');
  //     const metric = metrics[index];
  //     const labels = this.getFilteredLabels();

  //     if (!metric || !metric.data) {
  //       console.warn('Metric data is missing:', metric);
  //       return;
  //     }

  //     const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  //     gradient.addColorStop(0, 'rgba(34, 193, 195, 0.3)');
  //     gradient.addColorStop(1, 'rgba(253, 187, 45, 0.1)');

  //     const chart = new Chart(ctx, {
  //       type: 'line',
  //       data: {
  //         labels: labels,
  //         datasets: [{
  //           label: metric.title,
  //           data: this.getFilteredData(metric.data),
  //           fill: true,
  //           backgroundColor: gradient,
  //           borderColor: '#22C1C3',
  //           borderWidth: 3,
  //           pointBackgroundColor: '#22C1C3',
  //           pointRadius: 4,
  //           pointHoverRadius: 6,
  //           tension: 0.4,
  //         }],
  //       },
  //       options: {
  //         responsive: true,
  //         maintainAspectRatio: false,
  //         animation: {
  //           duration: 1000, // Smooth 1-second transition for updates
  //         },
  //         plugins: {
  //           legend: {
  //             display: true,
  //             position: 'top',
  //             labels: {
  //               color: '#333',
  //               font: {
  //                 size: 14,
  //               },
  //             },
  //           },
  //           tooltip: {
  //             backgroundColor: '#f5f5f5',
  //             bodyColor: '#333',
  //             borderColor: '#ddd',
  //             borderWidth: 1,
  //             titleColor: '#666',
  //           },
  //         },
  //         scales: {
  //           x: {
  //             display: true,
  //             ticks: {
  //               color: '#555',
  //               font: {
  //                 size: 12,
  //               },
  //             },
  //             grid: {
  //               color: 'rgba(200, 200, 200, 0.2)',
  //             },
  //           },
  //           y: {
  //             display: true,
  //             ticks: {
  //               color: '#555',
  //               font: {
  //                 size: 12,
  //               },
  //             },
  //             grid: {
  //               color: 'rgba(200, 200, 200, 0.2)',
  //             },
  //           },
  //         },
  //       },
  //     });


  //     this.charts.push(chart);
  //   });
  // }

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
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
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
    this.staffPerformance$ = this.getMockStaffPerformance();
    this.kioskStatus$ = this.getMockKioskStatus();
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
    this.kioskStatus$.pipe(take(1)).subscribe(kioskData => {
      const start = (this.kioskCurrentPage - 1) * 5;
      const end = start + 5;
      this.paginatedKioskStatus = kioskData.slice(start, end);
      this.totalKioskPages = Math.ceil(kioskData.length / 5);
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
