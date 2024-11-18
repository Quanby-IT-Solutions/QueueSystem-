import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { UswagonAuthService } from 'uswagon-auth';

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
  imports: [CommonModule, FormsModule],
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
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
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
        selectors: ['*'],
        tables: 'terminal_sessions',
        conditions: `WHERE attendant_id = '${attendantId}' ${dateFilter}`,
      });

      if (response.success && response.output.length) {
        const sessions = response.output as {
          start_time: string;
          last_active: string;
          status: string;
        }[];

        // Calculate Metrics and Graph Data from the same sessions
        this.calculateMetrics(sessions);
        this.serviceTimeDistribution = this.calculateServiceTimeDistribution(sessions);
        this.dailyCustomerServed = this.calculateGraphData(sessions);
      }
    } catch (error) {
      console.error('Error fetching terminal sessions:', error);
    }
  }

  calculateMetrics(sessions: { start_time: string; last_active: string; status: string }[]) {
    // Total Customers Served
    const totalCustomers = sessions.length;

    // Average Service Time
    const totalServiceTime = sessions.reduce((total: number, session) => {
      const start = new Date(session.start_time).getTime();
      const end = new Date(session.last_active).getTime();
      return total + (end - start);
    }, 0);
    const avgServiceTime = totalServiceTime / (totalCustomers * 60000); // Convert milliseconds to minutes

    // Queue Efficiency
    const closedCount = sessions.filter((s) => s.status === 'closed').length;
    const queueEfficiency = Math.round((closedCount / totalCustomers) * 100);

    this.metrics = [
      { label: 'Total Customers Served', value: totalCustomers.toString() },
      { label: 'Average Service Time (mins)', value: avgServiceTime.toFixed(1) },
      { label: 'Queue Efficiency', value: queueEfficiency + '%' },
    ];
  }

  calculateServiceTimeDistribution(sessions: { start_time: string; last_active: string }[]): ServiceTime[] {
    const ranges = { '5-10 mins': 0, '10-15 mins': 0, '15-20 mins': 0, '20+ mins': 0 };
    sessions.forEach((session) => {
      const duration = (new Date(session.last_active).getTime() - new Date(session.start_time).getTime()) / 60000;
      if (duration <= 10) ranges['5-10 mins']++;
      else if (duration <= 15) ranges['10-15 mins']++;
      else if (duration <= 20) ranges['15-20 mins']++;
      else ranges['20+ mins']++;
    });

    const total = sessions.length;
    return Object.entries(ranges).map(([range, count]) => ({
      range,
      percentage: (count / total) * 100,
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
