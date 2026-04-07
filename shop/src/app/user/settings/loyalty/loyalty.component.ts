import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loyalty.component.html',
  styleUrls: ['./loyalty.component.css']
})
export class LoyaltyComponent implements OnInit {
  account: any = null;
  history: any[] = [];
  loading = false;
  
  private apiUrl = 'http://127.0.0.1:8000/api/v1/loyalty';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }

  ngOnInit() {
    this.loadLoyaltyData();
  }

  loadLoyaltyData() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/account/`, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.account = data;
        this.loadHistory();
      },
      error: () => this.loading = false
    });
  }

  loadHistory() {
    this.http.get<any[]>(`${this.apiUrl}/history/`, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
