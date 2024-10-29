export interface Service{
    id?:string;
    division_id?:string;
    name:string;
    description?:string;
  }
  
export interface SubService{
    id?:string;
    service_id?:string;
    name:string;
    description?:string;
  }
  
export interface Division{ 
    id:string;
    name:string;
}
  