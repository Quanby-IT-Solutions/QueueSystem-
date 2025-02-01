export interface Format {
    id?:string;
    name:string;
    division_id?:string;
    prefix:string;
    description?:string;
    details?:string;
    counter_call?:string;
    color?:string;
    kiosk?:string;
}

export interface Division{
    id:string;
    name:string;
    description?:string;
}