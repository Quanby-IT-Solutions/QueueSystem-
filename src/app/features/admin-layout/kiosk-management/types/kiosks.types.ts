export interface Kiosk{
    id?:string;
    number?:number;
    division_id?:string;
    printer_ip:string;
    code:string;
    last_online?:string;
    division?:string;
    status?:string;
  }
  
export interface Division{
    id:string;
    name:string;
}
  