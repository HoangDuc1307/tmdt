import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language.service';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true
})
export class TranslatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(key: string): string {
    return this.languageService.translate(key);
  }
}
