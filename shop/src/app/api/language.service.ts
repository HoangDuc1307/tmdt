import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<string>('vi');
  translations = signal<any>({});

  constructor(private http: HttpClient) {
    const savedLang = localStorage.getItem('app_lang');
    if (savedLang) {
      this.currentLang.set(savedLang);
    }
    this.loadTranslations(this.currentLang());
  }

  setLanguage(lang: string) {
    this.currentLang.set(lang);
    localStorage.setItem('app_lang', lang);
    this.loadTranslations(lang);
  }

  private loadTranslations(lang: string) {
    this.http.get(`/assets/i18n/${lang}.json`).pipe(
      catchError(() => {
        console.error(`Could not load translations for ${lang}`);
        return of({});
      })
    ).subscribe(data => {
      this.translations.set(data);
    });
  }

  translate(key: string): string {
    const keys = key.split('.');
    let value = this.translations();
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key;
      }
    }
    return value as string;
  }
}
