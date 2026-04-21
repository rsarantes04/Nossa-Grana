import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, lang: string = 'pt'): string {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number, lang: string = 'pt'): string {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
  }).format(value);
}

export function formatDate(date: Date | string, lang: string = 'pt'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pattern = lang === 'en' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
  return dateFnsFormat(d, pattern);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
