import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, startWith, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThirdPartyService {
  private apiUrl = 'https://api.currencyfreaks.com/latest'; // CurrencyFreaks API URL
  private apiKey = '985947789cb5440eb6389fbafdd5beaf'; // Your API key
  private weatherKey = 'b81f04eb139e4ebf952171728241410';
  constructor(private http: HttpClient) {}

  // Fetch currency data every 2 seconds
  getCurrencyData(): Observable<any> {
    return interval(4.32e+7).pipe(
      startWith(null), 
      switchMap(() => this.http.get<any>(`${this.apiUrl}?apikey=${this.apiKey}`))
    );
  }
  getWeatherData(): Observable<any> {
    return interval(2.16e+7).pipe(
      startWith(null), 
      switchMap(() => this.http.get<any>(`http://api.weatherapi.com/v1/forecast.json?key=${this.weatherKey}&q=Manila&days=1`))
    );
  }
}