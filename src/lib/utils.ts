import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dateFnsFormat } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number, lang: string = 'pt'): string {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  const decimalValue = fromCents(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: lang === 'en' ? 'USD' : 'BRL',
  }).format(decimalValue);
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

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function prepareFinanceValue(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return fromCents(toCents(Math.max(0, value)));
}

// Manter roundCurrency e sanitizeCurrency para nã quebrar código existente, mas fazer apontar para a nova função
export function roundCurrency(value: number): number {
  return prepareFinanceValue(value);
}

export function sanitizeCurrency(value: number | undefined | null): number {
  return prepareFinanceValue(value);
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validateValue(value: number): boolean {
  return value > 0;
}

export function getToday(): string {
  return dateFnsFormat(new Date(), 'dd-MM-yyyy');
}

export function getCurrentDateString(): string {
  return dateFnsFormat(new Date(), 'dd-MM-yyyy');
}
