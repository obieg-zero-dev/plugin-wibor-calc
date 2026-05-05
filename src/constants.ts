import type { TableColumn } from '@obieg-zero/sdk'

export const WIBOR_TENORS = [
  { value: '3M', label: 'WIBOR 3M' },
  { value: '6M', label: 'WIBOR 6M' },
  { value: '1M', label: 'WIBOR 1M' },
]

export const REPAYMENT_TYPES = [
  { value: 'annuity', label: 'Raty równe' },
  { value: 'decreasing', label: 'Raty malejące' },
]

export const scheduleColumns: TableColumn[] = [
  { key: 'number', header: '#' },
  { key: 'date', header: 'Data' },
  { key: 'installment', header: 'Rata', align: 'right' },
  { key: 'principal', header: 'Kapitał', align: 'right' },
  { key: 'interest', header: 'Odsetki', align: 'right' },
  { key: 'wibor', header: 'WIBOR%', align: 'right' },
  { key: 'balance', header: 'Saldo', align: 'right' },
]

export const resultTabs = [
  { id: 'summary', label: 'Podsumowanie' },
  { id: 'schedule', label: 'Harmonogram' },
  { id: 'compare', label: 'Porównanie' },
  { id: 'benefit', label: 'Korzyść klienta' },
  { id: 'calc', label: 'Obliczenia' },
  { id: 'report', label: 'Raport' },
]

export const WIBOR_BASE = 'https://raw.githubusercontent.com/obieg-zero-dev/wibor/main'

export const WIBOR_FILES: Record<string, string> = {
  '1M': 'wibor-1m.json',
  '3M': 'wibor-3m.json',
  '6M': 'wibor-6m.json',
}
