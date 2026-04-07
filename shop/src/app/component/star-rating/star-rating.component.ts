import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/** Chuẩn hóa điểm API (string, null) về khoảng 0–5 */
function clampScore(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.css'],
})
export class StarRatingComponent implements OnChanges {
  /** Điểm gán từ ngoài (có thể lẻ, ví dụ điểm TB) */
  @Input() rating: number = 0;
  @Input() readonly: boolean = false;
  @Output() ratingChange = new EventEmitter<number>();

  readonly stars: number[] = [1, 2, 3, 4, 5];

  /** Hover preview khi đang chọn sao (chỉ khi !readonly) */
  hoverRating: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rating']) {
      this.hoverRating = null;
    }
  }

  /** Điểm đã clamp 0–5 để hiển thị / so sánh */
  get clamped(): number {
    return clampScore(this.rating);
  }

  /** Giá trị dùng để tô sao: hover (nếu có) hoặc điểm thật */
  private activeDisplayScore(): number {
    if (this.readonly) {
      return this.clamped;
    }
    if (this.hoverRating !== null) {
      return clampScore(this.hoverRating);
    }
    return this.clamped;
  }

  /** Mỗi sao nguyên: tô nếu <= điểm làm tròn (phù hợp điểm TB và chọn 1–5) */
  isFilled(star: number): boolean {
    return star <= Math.round(this.activeDisplayScore());
  }

  onStarEnter(star: number): void {
    if (!this.readonly) {
      this.hoverRating = star;
    }
  }

  onStarLeave(): void {
    this.hoverRating = null;
  }

  setRating(star: number): void {
    if (this.readonly) return;
    const v = Math.max(1, Math.min(5, Math.round(star)));
    this.rating = v;
    this.ratingChange.emit(v);
    this.hoverRating = null;
  }
}
