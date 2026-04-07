import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../api/language.service';
import { TranslatePipe } from '../../../api/translate.pipe';

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.css']
})
export class LanguageComponent {
  languages = [
    { code: 'vi', name: 'Tiếng Việt', icon: '🇻🇳' },
    { code: 'en', name: 'English', icon: '🇬🇧' }
  ];

  constructor(public languageService: LanguageService) {}

  setLanguage(code: string) {
    this.languageService.setLanguage(code);
  }
}
