import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav aria-label="Page navigation" *ngIf="totalItems > pageSize">
      <ul class="pagination pagination-rounded justify-content-center mb-0">
        <li class="page-item" [class.disabled]="currentPage === 1">
          <a class="page-link cursor-pointer" (click)="onPageChange(currentPage - 1)">
            <i class="fas fa-chevron-left"></i>
          </a>
        </li>
        
        <li class="page-item" *ngFor="let page of pages" [class.active]="page === currentPage">
          <a class="page-link cursor-pointer" (click)="onPageChange(page)">{{ page }}</a>
        </li>

        <li class="page-item" [class.disabled]="currentPage === totalPages">
          <a class="page-link cursor-pointer" (click)="onPageChange(currentPage + 1)">
            <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .pagination-rounded .page-link {
      border-radius: 50%;
      margin: 0 3px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #dee2e6;
      color: #718096;
    }
    .pagination-rounded .page-item.active .page-link {
      background-color: #3182ce;
      border-color: #3182ce;
      color: #fff;
    }
    .pagination-rounded .page-item.disabled .page-link {
      color: #cbd5e0;
      pointer-events: none;
    }
  `]
})
export class PaginationComponent {
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 1;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
