import { api } from '../lib/api'

export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  decimals: number
}

export interface ExchangeRateResult {
  rate: string
  source: string
  fetchedAt: string
  fresh: boolean
}

export interface ConvertResult {
  amount: number
  originalAmount: number
  currency: string
  baseAmount: number
  baseCurrency: string
  exchangeRate: string
  rateSource: string
}

export const currencyService = {
  getCurrencies: () => api.get<CurrencyInfo[]>('/currencies'),
  getRate: (from: string, to: string) =>
    api.get<ExchangeRateResult>('/currencies/rate', { from, to }),
  convert: (amount: number, from: string, to: string) =>
    api.post<ConvertResult>('/currencies/convert', { amount, from, to }),
}
