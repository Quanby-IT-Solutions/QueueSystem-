import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';

@Injectable({
  providedIn: 'root'
})
export class LogsService {

  constructor(private API:UswagonCoreService, private auth:UswagonAuthService) { }

  async pushLog(event:string,log:string){
    const now = new Date();
    const response = await  this.API.create({
      tables:'logs',
      values:{
        id: this.API.createUniqueID32(),
        event:event,
        division_id: this.auth.getUser().division_id,
        log: `${this.auth.getUser().fullname} ${log}`,
        timestamp:new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
      }
    })
    if(!response.success){

      throw new Error('');
    }
  }

 async  getAllLogs(){

    const isSuperAdmin = this.auth.accountLoggedIn() == 'superadmin';

    const division = this.auth.getUser().division_id;

    if(isSuperAdmin){
      const response = await this.API.read({
        selectors: ['*'],
        tables:'logs',
        conditions: `WHERE CAST(timestamp as DATE) >= DATEADD(day, -30, GETDATE()) ORDER BY timestamp DESC`
      })

      if(!response.success){
        throw new Error();
      }
      return response.output
    }else{
      const response = await this.API.read({
        selectors: ['*'],
        tables:'logs',
        conditions: `WHERE division_id = '${division}'  AND CAST(timestamp as DATE) >= DATEADD(day, -30, GETDATE()) ORDER BY timestamp DESC `
      })

      if(!response.success){
        alert(response.output);
        throw new Error();
      }
      return response.output;
    }

  }


}
