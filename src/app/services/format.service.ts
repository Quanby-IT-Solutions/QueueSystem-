import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import {CrudService} from './crud.service'

import { Format } from '../features/admin-layout/format-management/types/format.types';

@Injectable({
  providedIn: 'root'
})
export class FormatService extends CrudService<Format>{


  
  constructor(
    private API:UswagonCoreService) {
      super(API);
      super.setTable('formats');
      
  }
  
  override async delete(id:string){
    this.API.delete({
      tables:'queue',
      conditions:`WHERE type = '${id}'`
    })
    await super.delete(id);
  }

  async getFrom(division_id:string){
    super.setFilters(`WHERE division_id = '${division_id}'`);
    return await super.getAll();
  }
}
