import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent {
  savedCards = [
    { type: 'Visa', last4: '4242', expiry: '12/26', isDefault: true },
    { type: 'Mastercard', last4: '5555', expiry: '08/25', isDefault: false }
  ];

  linkedWallets = [
    { name: 'VNPay', status: 'connected', account: '090****123' },
    { name: 'MoMo', status: 'not-connected', account: '' }
  ];

  removeCard(card: any) {
    if(confirm('Bạn có chắc muốn xóa thẻ này?')) {
      this.savedCards = this.savedCards.filter(c => c !== card);
    }
  }

  setDefault(card: any) {
    this.savedCards.forEach(c => c.isDefault = false);
    card.isDefault = true;
  }
}
