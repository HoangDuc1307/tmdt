import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private apiUrl = 'http://127.0.0.1:8000/api/v1/addresses/';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }

  getAddresses(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  addAddress(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, { headers: this.getAuthHeaders() });
  }

  updateAddress(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}${id}/`, data, { headers: this.getAuthHeaders() });
  }

  deleteAddress(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${id}/`, { headers: this.getAuthHeaders() });
  }

  setDefault(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}${id}/set-default/`, {}, { headers: this.getAuthHeaders() });
  }
}
