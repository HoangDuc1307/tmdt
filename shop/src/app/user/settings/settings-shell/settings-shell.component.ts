import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../api/translate.pipe';

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './settings-shell.component.html',
  styleUrls: ['./settings-shell.component.css']
})
export class SettingsShellComponent {
  menuItems = [
    { path: 'profile', icon: '👤', labelKey: 'SETTINGS.PROFILE' },
    { path: 'address', icon: '📍', labelKey: 'SETTINGS.ADDRESS' },
    { path: 'history', icon: '📦', labelKey: 'SETTINGS.ORDERS' },
    { path: 'payment', icon: '💳', labelKey: 'SETTINGS.PAYMENT' },
    { path: 'notification', icon: '🔔', labelKey: 'SETTINGS.NOTIFICATIONS' },
    { path: 'loyalty', icon: '⭐', labelKey: 'SETTINGS.LOYALTY' },
    { path: 'language', icon: '🌐', labelKey: 'SETTINGS.LANGUAGE' }
  ];
}
