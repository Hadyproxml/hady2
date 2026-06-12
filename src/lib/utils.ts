import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
}

export function generateNumericBarcode(length = 12): string {
  let barcode = '';
  for (let i = 0; i < length; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }
  return barcode;
}
