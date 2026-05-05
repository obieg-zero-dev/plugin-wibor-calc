export interface RateEntry {
  date: string
  rate: number
}

export interface LoanInput {
  loanAmount: number
  margin: number
  loanPeriodMonths: number
  startDate: Date
  paymentDay: number
  bridgeMargin: number
  bridgeEndDate: Date | null
  wiborTenor: string
  wiborData: RateEntry[]
  interestBase: number
  repaymentType: string
}

export interface ScheduleEntry {
  number: number
  date: Date
  days: number
  wiborRate: number
  installment: number
  principal: number
  interestTotal: number
  interestWibor: number
  interestMargin: number
  interestBridge: number
  remainingBalance: number
  isPast: boolean
}

export interface LoanResult {
  schedule: ScheduleEntry[]
  repaymentType: 'annuity' | 'decreasing'
  pastTotalPaid: number
  pastPrincipalPaid: number
  pastInterestTotal: number
  pastInterestWibor: number
  pastInterestMargin: number
  pastInterestBridge: number
  pastInstallmentsCount: number
  futureTotalToPay: number
  futureInterestTotal: number
  futureInterestWibor: number
  futureInterestMargin: number
  futureInstallmentsCount: number
  pastTotalPaidNoWibor: number
  pastInterestNoWibor: number
  pastPrincipalNoWibor: number
  futureTotalNoWibor: number
  futureInterestNoWibor: number
  overpaidInterest: number
  futureSavings: number
  currentInstallment: number
  installmentNoWibor: number
  pastTotalPaidNoRate: number
  futureTotalNoRate: number
  installmentNoRate: number
  overpaidWithMargin: number
  futureSavingsWithMargin: number
}
