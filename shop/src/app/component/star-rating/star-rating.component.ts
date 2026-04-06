import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.css']
})
export class StarRatingComponent {
  @Input() rating: number = 0; // Giá trị sao hiện tại
  @Input() readonly: boolean = false; // Chuyển sang chế độ chỉ đọc nếu cần
  @Output() ratingChange = new EventEmitter<number>();
  
  stars: number[] = [1, 2, 3, 4, 5];

  setRating(newRating: number) {
    if (!this.readonly) {
      this.rating = newRating;
      this.ratingChange.emit(this.rating);
    }
  }
}
