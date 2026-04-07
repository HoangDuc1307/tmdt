import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderAdminComponent } from '../header-admin/header-admin.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderAdminComponent],
  template: `
    <div class="wrapper dashboard-wrapper">
      <div class="d-flex flex-wrap flex-xl-nowrap">
        <app-sidebar></app-sidebar>
        <div class="page-content">
          <app-headeradmin></app-headeradmin>
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export class AdminShellComponent {}
