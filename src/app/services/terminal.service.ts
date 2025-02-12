import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from './division.service';
import { BehaviorSubject } from 'rxjs';
import { QueueService } from './queue.service';
import { LogsService } from './logs.service';


interface Terminal {
  id: string;
  division_id: string;
  number: string;
  get status(): string;
  _status: string;
  last_active?: string;
  attendant?: string;
  specific?: string;
}
@Injectable({
  providedIn: 'root'
})
export class TerminalService {

  constructor(
    private logService: LogsService,
    private queueService: QueueService,
    private API: UswagonCoreService, private auth: UswagonAuthService, private divisionService: DivisionService) { }

  // private terminalsSubject = new BehaviorSubject<Terminal[]>([]);
  // public terminals$ = this.terminalsSubject.asObservable();

  private serverTimeDifference?: number;

  private async getServerTime() {
    if (this.serverTimeDifference == undefined) {
      const serverTimeString = await this.API.serverTime();
      const serverTime = new Date(serverTimeString);
      const localTime = new Date();
      this.serverTimeDifference = serverTime.getTime() - localTime.getTime();
    }

    return new Date(new Date().getTime() + this.serverTimeDifference);
  }


  listenToTerminalUpdates() {
    this.API.addSocketListener('live-terminal-listener', (message) => {
      if (message.division != this.divisionService.selectedDivision?.id) return;
    });
  }

  updateMaintenance() {
    this.API.socketSend({
      event: 'terminal-maintenance',
      division: this.divisionService.selectedDivision?.id
    })
  }

  async addTerminal(division_id: string) {
    const id = this.API.createUniqueID32();
    const response = await this.API.create({
      tables: 'terminals',
      values: {
        id: id,
        division_id: division_id,
        status: 'available'
      }
    });

    if (!response.success) {
      throw new Error(response.output);
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'terminal-events' })
    this.API.socketSend({ event: 'admin-dashboard-events' })
    this.logService.pushLog('new-terminal', 'added a terminal');
  }

  async updateTerminalStatus(id: string, status: 'available' | 'maintenance') {
    const response = await this.API.update({
      tables: 'terminals',
      values: {
        status: status
      },
      conditions: `WHERE id = '${id}'`
    });

    if (!response.success) {
      throw new Error('Unable to add terminal');
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'terminal-events' })
    this.API.socketSend({ event: 'admin-dashboard-events' })
    this.logService.pushLog('update-terminal', 'updated a terminal');
  }

  async setTerminalClient(id: string, clientType?: string) {
    const response = await this.API.update({
      tables: 'terminals',
      values: {
        specific: clientType
      },
      conditions: `WHERE id = '${id}'`
    });

    if (!response.success) {
      throw new Error('Unable to set terminal client');
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'terminal-events' })
    this.API.socketSend({ event: 'admin-dashboard-events' })
    this.logService.pushLog('set-client-terminal', 'set client to a terminal');
  }

  async deleteTerminal(id: string) {

    const response = await this.API.delete({
      tables: 'terminals',
      conditions: `WHERE id = '${id}'`
    });

    if (!response.success) {
      throw new Error('Unable to delete terminal');
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'terminal-events' })
    this.API.socketSend({ event: 'admin-dashboard-events' })
    this.logService.pushLog('delete-terminal', 'deleted a terminal');

  }

  async getAllTerminals(): Promise<Terminal[]> {
    const response = await this.API.read({
      selectors: ['divisions.name as division,latest_session.last_active as last_active ,latest_session.status as session_status, desk_attendants.fullname as attendant, terminals.*'],
      tables: 'terminals',
      conditions: `
      LEFT JOIN divisions ON divisions.id = terminals.division_id
      LEFT JOIN terminal_sessions ON terminal_sessions.terminal_id = terminals.id 
     LEFT JOIN (
          SELECT id, status, last_active, 
                ROW_NUMBER() OVER (PARTITION BY terminal_id ORDER BY last_active DESC) AS [index] 
          FROM terminal_sessions
      ) AS latest_session ON terminal_sessions.id = latest_session.id 
      LEFT JOIN desk_attendants ON terminal_sessions.attendant_id = desk_attendants.id
      WHERE terminals.division_id = '${this.divisionService.selectedDivision?.id}' 
      AND (latest_session.[index] = 1 OR latest_session.[index] IS NULL)
      GROUP BY 
      terminals.id, 
      terminals.division_id, 
      terminals.number, 
      terminals.status, 
      terminals.specific, 
      divisions.name, 
      terminal_sessions.terminal_id,
      desk_attendants.fullname, 
      latest_session.last_active, 
      latest_session.status
      ORDER BY terminals.number ASC 
      `});

    if (response.success) {

      const seen = new Set<any>();
      response.output = response.output.filter((item: any) => {
        if (seen.has(item.id)) {
          return false; // Skip duplicate
        }
        seen.add(item.id); // Mark as seen
        return true; // Keep first occurrence
      });
      for (let i = 0; i < response.output.length; i++) {
        response.output[i]._status = response.output[i].status;
        const now = await this.getServerTime()
        response.output[i] = {
          ...response.output[i],
          get status(): string {
            const lastActive = new Date(this.last_active);
            const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000;

            if (this._status !== 'maintenance' && this.session_status !== 'closed') {
              return 'online';
            } else {
              return this._status; // Return the default status if not online
            }
          }
        }
        response.output[i].number = i + 1;
      }
      return response.output;
    } else {

      throw new Error('Unable to load terminals');
    }
  }


  async startTerminalSession(terminal_id: string) {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    const responseActiveTickets = await this.API.read({
      selectors: ['DISTINCT terminal_sessions.id'],
      tables: 'terminal_sessions,attended_queue',
      conditions: `WHERE (terminal_sessions.terminal_id = '${terminal_id}' OR terminal_sessions.attendant_id ='${this.auth.getUser().id}')  AND terminal_sessions.id = attended_queue.desk_id AND attended_queue.status = 'ongoing'
      `
    });

    if (!responseActiveTickets.success) {
      throw new Error('Unable to get active tickets');
    }

    for (let ticket of responseActiveTickets.output) {
      const closeResponse = await this.API.update({
        tables: 'attended_queue',
        values: {
          status: 'skipped'
        },
        conditions: `WHERE desk_id = '${ticket.id}' AND status = 'ongoing'`
      });

      if (!closeResponse.success) {
        throw new Error('Unable to update ticket session');
      }
    }

    const lastSession = await this.getActiveSession();
    if (lastSession) {
      const closeResponse = await this.API.update({
        tables: 'terminal_sessions',
        values: {
          status: 'closed'
        },
        conditions: `WHERE (attendant_id = '${this.auth.getUser().id}' OR terminal_id = '${terminal_id}') AND status != 'closed'`
      });

      if (!closeResponse.success) {
        throw new Error('Unable to update terminal session');
      }
    }

    const now = await this.getServerTime()
    const id = this.API.createUniqueID32();
    const response = await this.API.create({
      tables: 'terminal_sessions',
      values: {
        id: id,
        terminal_id: terminal_id,
        attendant_id: this.auth.getUser().id,
        start_time: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
        last_active: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
      }
    });


    if (!response.success) {
      throw new Error('Unable to start terminal session');
    } else {
      this.logService.pushLog('opened-terminal', `started a terminal session.`)
      this.API.socketSend({ event: 'queue-events' })
      this.API.socketSend({ event: 'terminal-events' })
      this.API.socketSend({ event: 'admin-dashboard-events' })
      return id;
    }
  }

  async getActiveSession() {
    const response = await this.API.read({
      selectors: ['terminal_sessions.*'],
      tables: 'terminal_sessions',
      conditions: `WHERE terminal_sessions.attendant_id = '${this.auth.getUser().id}' 
        ORDER BY last_active DESC
      `
    });

    if (!response.success) {
      throw new Error('Unable to get terminal session');
    }

    if (response.output.length <= 0) {
      return null;
    } else {
      // alert(JSON.stringify(response.output[0]))
      const lastSession = response.output[0];
      const now = await this.getServerTime();
      const lastActive = new Date(lastSession.last_active);
      const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000;
      if (lastSession.status != 'closed' && lastSession.last_active) {
        return lastSession;
      } else {
        return null;
      }
    }
  }

  async getActiveSessionsOnTerminal(terminal_id: string) {
    const response = await this.API.read({
      selectors: ['terminal_sessions.*'],
      tables: 'terminal_sessions',
      conditions: `WHERE terminal_id = '${terminal_id}' AND status != 'closed' 
        ORDER BY last_active DESC
      `
    });

    if (!response.success) {
      throw new Error('Unable to get terminal session');
    }

    if (response.output.length <= 0) {
      return [];
    } else {
      return response.output
    }
  }

  async getActiveUsers(): Promise<string[]> {
    const response = await this.API.read({
      selectors: ['attendant_id,last_active, status'],
      tables: 'terminal_sessions',
      conditions: `WHERE terminal_sessions.status != 'closed' 
        ORDER BY last_active DESC
      `
    });

    if (!response.success) {
      throw new Error('Unable to get terminal session');
    }


    if (response.output.length <= 0) {
      return [];
    } else {
      const activeUsers = [];
      for (let i = 0; i < response.output.length; i++) {
        const lastSession = response.output[i];
        const now = await this.getServerTime();
        const lastActive = new Date(lastSession.last_active);

        const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000;
        if (lastSession.status != 'closed' && lastSession.last_active) {
          activeUsers.push(response.output[i].attendant_id);
        }
      }
      return activeUsers;
    }
  }
  statusInterval: any;

  async refreshTerminalStatus(terminal_session: string) {
    const now = await this.getServerTime()
    const response = await this.API.update({
      tables: 'terminal_sessions',
      values: {
        last_active: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
      },
      conditions: `WHERE id = '${terminal_session}' AND status != 'closed'`
    });

    if (!response.success) {
      throw new Error('Unable to update terminal session');
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'terminal-events' })

    this.statusInterval = setInterval(async () => {
      const now = await this.getServerTime()
      const response = await this.API.update({
        tables: 'terminal_sessions',
        values: {
          last_active: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
        },
        conditions: `WHERE id = '${terminal_session}'`
      });

      if (!response.success) {
        throw new Error('Unable to update terminal session');
      }
      this.API.socketSend({ event: 'queue-events' })
      this.API.socketSend({ event: 'terminal-events' })
      // this.API.socketSend({event:'admin-dashboard-events'})
    }, 1000 * 40)
  }

  async terminateTerminalSession() {
    const lastSession = await this.getActiveSession();
    if (lastSession) {
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
      }
      const cleanAttended = await this.API.update({
        tables: 'attended_queue',
        values: {
          status: 'skipped'
        },
        conditions: `WHERE desk_id = '${lastSession.id}' AND status = 'ongoing'`
      });
      if (!cleanAttended.success) {
        throw new Error('Unable to update terminal session');
      }
      const closeResponse = await this.API.update({
        tables: 'terminal_sessions',
        values: {
          status: 'closed'
        },
        conditions: `WHERE (attendant_id = '${lastSession.attendant_id}' OR terminal_id = '${lastSession.terminal_id}') AND status != 'closed'`
      });
      // alert(lastSession.id);
      if (!closeResponse.success) {
        throw new Error('Unable to update terminal session');
      }
      this.logService.pushLog('closed-terminal', `terminated a terminal session.`)
      this.queueService.resolveAttendedQueue('return');
      this.API.socketSend({ event: 'admin-dashboard-events' })
      this.API.socketSend({ event: 'queue-events' })
      this.API.socketSend({ event: 'terminal-events' })
    }

  }

  async kickOutTerminalSession(terminal_id: string) {
    // if(lastSession){
    const sessions = await this.getActiveSessionsOnTerminal(terminal_id)
    for (let session of sessions) {
      this.API.socketSend({
        event: 'get-out',
        id: session.attendant_id
      });
    }

    const responseActiveTickets = await this.API.read({
      selectors: ['DISTINCT terminal_sessions.id'],
      tables: 'terminal_sessions,attended_queue',
      conditions: `WHERE terminal_sessions.terminal_id = '${terminal_id}'  AND terminal_sessions.id = attended_queue.desk_id AND attended_queue.status = 'ongoing'
        `
    });

    if (!responseActiveTickets.success) {
      throw new Error('Unable to get active tickets');
    }

    for (let ticket of responseActiveTickets.output) {
      const closeResponse = await this.API.update({
        tables: 'attended_queue',
        values: {
          status: 'skipped'
        },
        conditions: `WHERE desk_id = '${ticket.id}' AND status = 'ongoing'`
      });

      if (!closeResponse.success) {
        throw new Error('Unable to update ticket session');
      }
    }


    const closeResponse = await this.API.update({
      tables: 'terminal_sessions',
      values: {
        status: 'closed'
      },
      conditions: `WHERE terminal_id = '${terminal_id}'`
    });
    // alert(lastSession.id);
    if (!closeResponse.success) {
      throw new Error('Unable to update terminal session');
    }
    this.API.socketSend({ event: 'queue-events' })
    this.API.socketSend({ event: 'kiosk-events' })
    this.API.socketSend({ event: 'terminal-events' })
    this.logService.pushLog('kicked-terminal', `kicked out attendant from a terminal session.`)
    // }
    // clearInterval(this.statusInterval);
  }
}
