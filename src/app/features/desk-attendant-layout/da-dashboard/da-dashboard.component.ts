import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { UswagonAuthService } from 'uswagon-auth';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

interface Metric {
  label: string;
  value: string;
}

interface ServiceTime {
  range: string;
  percentage: number;
}

interface CustomerServedData {
  date: string;
  count: number;
}

@Component({
  selector: 'app-da-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LottieComponent],
  templateUrl: './da-dashboard.component.html',
  styleUrls: ['./da-dashboard.component.css'],
})
export class DaDashboardComponent implements OnInit, OnDestroy {
  userName: string = '';
  divisionId: string = '';
  divisionName: string = '';
  selectedTimeRange: string = 'day';
  metrics: Metric[] = [];
  serviceTimeDistribution: ServiceTime[] = [];
  dailyCustomerServed: CustomerServedData[] = [];
  maxCustomerCount: number = 0;
  minCustomerCount: number = 0;
  graphWidth: number = 600;
  graphHeight: number = 200;
  private updateInterval: any;

  constructor(private API: UswagonCoreService, private auth: UswagonAuthService) {}

  async ngOnInit() {
    await this.loadUserData();
    await this.fetchTerminalSessions();
    this.updateInterval = setInterval(() => this.fetchTerminalSessions(), 5000);

    this.getRandomQuote();
    this.quoteInterval = setInterval(() => this.getRandomQuote(), 3000);
    
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.quoteInterval) {
      clearInterval(this.quoteInterval);
    }
  }

  lottieOptions: AnimationOptions = {
    path: '/assets/animations/quote.json', 
    autoplay: true,
    loop: true,
  }

  inspirationalQuote: string = '';
  quoteInterval: any;

  quotes: string[] = [
    '"Believe in yourself and all that you are!"',
    '"Hard work beats talent when talent doesn’t work hard."',
    '"Stay positive, work hard, and make it happen."',
    '"The best way to predict the future is to create it."',
    '"Success comes from consistency, not occasional effort."'
  ];

  getRandomQuote(): void {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.inspirationalQuote = this.quotes[randomIndex];
  }

  async loadUserData() {
    const userId = this.auth.getUser()?.id || '';
    const userRole = this.auth.getUser()?.role || 'desk_attendant';
    const targetTable = ['admin', 'cashier'].includes(userRole) ? 'administrators' : 'desk_attendants';

    try {
      const response = await this.API.read({
        selectors: [`${targetTable}.*, divisions.name AS division_name, divisions.id AS division_id`],
        tables: `${targetTable}, divisions`,
        conditions: `WHERE ${targetTable}.id = '${userId}' AND ${targetTable}.division_id = divisions.id`,
      });

      if (response.success && response.output.length) {
        const user = response.output[0];
        this.userName = user.fullname || 'User';
        this.divisionId = user.division_id || 'N/A';
        this.divisionName = user.division_name || 'Unknown Division';
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }
  async fetchTerminalSessions() {
    const attendantId = this.auth.getUser()?.id || '';
    const dateFilter = this.getDateFilter();
  
    try {
      const response = await this.API.read({
        selectors: [
          'terminal_sessions.*',
          'attended_queue.finished_on',
          'attended_queue.attended_on as start_time'
        ],
        tables: 'terminal_sessions LEFT JOIN attended_queue ON terminal_sessions.id = attended_queue.desk_id',
        conditions: `WHERE terminal_sessions.attendant_id = '${attendantId}' ${dateFilter} `
      });
      // AND (attended_queue.status='finished' )

      if (response.success && response.output.length) {
        const sessions = response.output;
        this.calculateMetrics(sessions);
        this.serviceTimeDistribution = this.calculateServiceTimeDistribution(sessions);
      }
    } catch (error) {
      console.error('Error fetching terminal sessions:', error);
    }
  }

  calculateMetrics(sessions: { start_time: string; last_active: string; status: string; finished_on?: string }[]) {
    // Only count completed sessions (those with finished_on timestamp)
    const completedSessions = sessions.filter(session => session.finished_on);
    const totalCustomers = completedSessions.length;
  
    if (totalCustomers === 0) {
      this.metrics = [
        { label: 'Total Customers Served', value: '0' },
        { label: 'Average Service Time', value: '0 min 0 sec' },  // Updated format
        { label: 'Queue Efficiency', value: '0%' }
      ];
      return;
    }
  
    let totalSeconds = 0;
    const serviceTimes = completedSessions.map(session => {
      const start = new Date(session.start_time).getTime();
      const end = new Date(session.finished_on!).getTime();
      const durationSeconds = Math.floor((end - start) / 1000);
      totalSeconds += durationSeconds;
      return {
        minutes: Math.floor(durationSeconds / 60),
        seconds: durationSeconds % 60,
        totalSeconds: durationSeconds
      };
    });
  
  
    // Calculate average in seconds
    const averageSeconds = Math.round(totalSeconds / totalCustomers);
    const minutes = Math.floor(averageSeconds / 60);
    const seconds = averageSeconds % 60;
  
    // Queue Efficiency calculation
    const queueEfficiency = Math.round((completedSessions.length / (sessions.length || 1)) * 100);
  
    this.metrics = [
      { 
        label: 'Total Customers Served',
        value: totalCustomers.toString()
      },
      { 
       label: 'Average Service Time', 
      value: `${minutes} min ${seconds} sec`
      },
      { 
        label: 'Queue Efficiency',
        value: `${queueEfficiency}%`
      }
    ];
  
    // Debug logging
    console.log('Individual service times:', serviceTimes);
    console.log('Calculation details:', {
      totalSeconds,
      totalCustomers,
      averageSeconds,
      minutes,
      seconds,
      serviceTimes: serviceTimes.map((t, index) => {
        const session = completedSessions[index];
        return {
          duration: `${t.minutes}:${t.seconds} (${t.totalSeconds}s)`,
          start: new Date(session.start_time).toLocaleString(),
          finish: new Date(session.finished_on!).toLocaleString()
        };
      })
    });
  }

 calculateServiceTimeDistribution(sessions: { start_time: string; finished_on?: string }[]): ServiceTime[] {
  const completedSessions = sessions.filter(session => session.finished_on);
  const ranges = { '5-10m': 0, '10-15m': 0, '15-20m': 0, '20m+': 0 };
  
  completedSessions.forEach((session) => {
    const duration = (new Date(session.finished_on!).getTime() - new Date(session.start_time).getTime()) / 60000;
    if (duration <= 10) ranges['5-10m']++;
    else if (duration <= 15) ranges['10-15m']++;
    else if (duration <= 20) ranges['15-20m']++;
    else ranges['20m+']++;
  });

  const total = completedSessions.length;
  return Object.entries(ranges).map(([range, count]) => ({
    range,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

  calculateGraphData(sessions: { start_time: string }[]): CustomerServedData[] {
    const groupBy: { [key: string]: number } = {};
    const dateFormat = this.getGraphDateFormat();

    sessions.forEach((session) => {
      const date = new Date(session.start_time).toISOString().slice(0, dateFormat);
      groupBy[date] = (groupBy[date] || 0) + 1;
    });

    return Object.keys(groupBy).map((date) => ({
      date,
      count: groupBy[date],
    }));
  }

  getGraphDateFormat(): number {
    if (this.selectedTimeRange === 'day') return 10; // 'YYYY-MM-DD'
    if (this.selectedTimeRange === 'month') return 7; // 'YYYY-MM'
    return 4; // 'YYYY'
  }

  getPointsForLineGraph(): string {
    const xStep = this.graphWidth / (this.dailyCustomerServed.length - 1);
    return this.dailyCustomerServed
      .map((data, index) => {
        const x = index * xStep;
        const y =
          this.graphHeight -
          ((data.count - this.minCustomerCount) / (this.maxCustomerCount - this.minCustomerCount)) * this.graphHeight;
        return `${x},${y}`;
      })
      .join(' ');
  }

  getDateFilter(): string {
    const now = new Date();
    const filterStart = new Date();

    if (this.selectedTimeRange === 'day') {
      filterStart.setHours(0, 0, 0, 0);
    } else if (this.selectedTimeRange === 'month') {
      filterStart.setDate(1);
      filterStart.setHours(0, 0, 0, 0);
    } else if (this.selectedTimeRange === 'year') {
      filterStart.setMonth(0, 1);
      filterStart.setHours(0, 0, 0, 0);
    }

    return `AND start_time >= '${filterStart.toISOString()}'`;
  }

  onTimeRangeChange() {
    this.fetchTerminalSessions(); // Refresh data based on the selected time range
  }
}
