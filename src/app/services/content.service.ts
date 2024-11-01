import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  constructor(private API:UswagonCoreService, private auth:UswagonAuthService) {}


  async getContentSetting(division?:string){
    var _division = division;

    if(_division == undefined){
      _division = this.auth.getUser().division_id;
    }

   try{
    const response = await this.API.read({
      selectors: ['contents.*', 'divisions.name as division'],
      tables: 'contents, divisions',
      conditions: `WHERE contents.division_id = '${_division}' AND divisions.id = contents.division_id`,
    });

    if(response.success){
      if(response.output.length > 0){
        const content = response.output[0];

        if(content.video){
          content.video = this.API.getFileURL(content.video);
        }
        if(content.background){
          content.background = this.API.getFileURL(content.background);
        }
        if(content.logo){
          content.logo = this.API.getFileURL(content.logo);
        }
        
        return content;
      }else{
        return null;
      }
    }else{
      throw new Error('Error getting content.');
    }
  }catch(e:any){
     throw new Error('Something went wrong.');
   }
  }

  async getContentSettings(){
    try{
      const response = await this.API.read({
        selectors: ['contents.*', 'divisions.name as division'],
        tables: 'contents, divisions',
        conditions: `WHERE contents.division_id = divisions.id`,
      });

      if(response.success){
        for(let i = 0; i < response.output.length; i++){
          const content = response.output[i];

          if(content.video){
            content.video = this.API.getFileURL(content.video);
          }
          if(content.background){
            content.background = this.API.getFileURL(content.background);
          }
          if(content.logo){
            content.logo = this.API.getFileURL(content.logo);
          }
          response.output[i]= content;
        }
        return response.output
      }else{
        throw new Error('Error getting content.');
      }
    }catch(e:any){
      throw new Error('Something went wrong');
    }
  }

  // async getDivisions(){
  //   const user = this.auth.getUser();
  //   const response = await this.API.read({
  //     selectors: ['*'],
  //     tables: 'divisions',
  //     conditions: `WHERE id != '${environment.administrators}'`,
  //   });

  //   if(response.success){
  //     return response.output;
  //   }else{
  //     throw new Error('Error getting divisions.');
  //   }
  // }

  // async getDivision(id:string){
  //   const response = await this.API.read({
  //     selectors: ['*'],
  //     tables: 'divisions',
  //     conditions: `WHERE id = '${id}' `,
  //   });

  //   if(response.success){
  //     if(response.output.length <= 0) return null;
  //     return response.output[0];
  //   }else{
  //     throw new Error('Error getting divisions.');
  //   }
  // }

  async updateContentSettings( settings: { priority:string, regular:string, division_id: string ,selectedFiles: { [key: string]: File | undefined  }, colors:{[key:string]:string}, widgets:{weather: boolean,time: boolean,currency: boolean,} , 
    announcement_on:boolean, background_on:boolean,
    videoOption:string, videoUrl?:string, announcements?:string} ){
    const {priority,regular,background_on, announcement_on,division_id,selectedFiles,colors,widgets,videoOption,videoUrl, announcements} = settings
  
    // Process files for upload
    const uploadedFiles:{[key:string]:string} =  {};
    for(const variable in selectedFiles){
      // upload each file
      try{
        
        if(selectedFiles[variable] != undefined){
          const encryptedDivision = await this.API.encrypt(division_id);
          const cleanedDivision = encryptedDivision.replace(/[^a-zA-Z0-9]/g, '');
          const location =  `content/${encodeURIComponent(cleanedDivision)}/${selectedFiles[variable]!.name}`;
          await this.API.uploadFile(selectedFiles[variable]!, location);
          uploadedFiles[variable] = location;
        }
      }catch(e:any){
        for(const variable in uploadedFiles){
           await this.API.disposeFile(uploadedFiles[variable]!);
        }
        throw new Error(e.message);
      }
    }



    const response = await this.API.read({
      selectors: ['*'],
      tables: 'contents',
      conditions: `WHERE division_id = '${division_id}'`
    });

    if(response.success){
      if(response.output.length > 0){
        const url =  videoOption == 'url' ?  {video:videoUrl} : {};
        const updateResponse = await this.API.update({
          tables: 'contents',
          values: {
            ...colors,
            ...uploadedFiles,
            ...widgets,
            ...url,
            ...{
              regular_prefix:regular, priority_prefix:priority,
              announcements: announcements, background_on: background_on, announcement_on: announcement_on}
           
          },
          conditions: `WHERE division_id  = '${division_id}'`
        });
        if(!updateResponse.success){
          throw new Error(updateResponse.output);
        }
      }else{
        const id = this.API.createUniqueID32();
        const url =  videoOption == 'url' ?  {video:videoUrl} : {};
        const createResponse = await this.API.create({
          tables: 'contents',
          values: {
            id: id,
            'division_id': division_id,
            ...colors,
            ...uploadedFiles,
            ...widgets,
            ...url,
            ...{
              regular_prefix:regular, priority_prefix:priority,
              announcements: announcements, background_on: background_on, announcement_on: announcement_on}
          },
        });
        if(!createResponse.success){
          
          throw new Error(createResponse.output);
        }
      }
    }else{
      throw new Error(response.output);
    }
  }

}
