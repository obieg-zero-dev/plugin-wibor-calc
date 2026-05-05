import type { LoanInput, LoanResult, RateEntry, ScheduleEntry } from './types'

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86400000)

export const resolveWibor = (d: Date, data: RateEntry[]) => {
  const s = toDateStr(d)
  let b = data[0]?.rate ?? 0
  for (const e of data) {
    if (e.date <= s) b = e.rate
    else break
  }
  return b
}

export const payDate = (start: Date, off: number, day: number) => {
  const m = start.getMonth() + off
  const ty = start.getFullYear() + Math.floor(m / 12)
  const tm = ((m % 12) + 12) % 12
  return new Date(ty, tm, Math.min(day, new Date(ty, tm + 1, 0).getDate()))
}

/** Annuity installment */
export const ann = (b: number, r: number, m: number) => {
  if (r <= 0 || m <= 0) return m > 0 ? b / m : b
  const rm = r / 100 / 12
  const f = Math.pow(1 + rm, m)
  return b * (rm * f) / (f - 1)
}

/** Interest for period */
export const int = (b: number, p: number, d: number, base = 360) =>
  b * (p / 100) * d / base

const TENOR_RESET: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6 }

export function calculateLoan(input: LoanInput): LoanResult | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const wd = input.wiborData || []
  const base = input.interestBase || 360

  if (!wd.length) return null

  const resetMonths = TENOR_RESET[input.wiborTenor] || 3
  const isDecreasing = input.repaymentType === 'decreasing'

  const schedule: ScheduleEntry[] = []
  let bal = input.loanAmount, balNW = input.loanAmount, balNR = input.loanAmount, prev = new Date(input.startDate)
  let wibor = resolveWibor(input.startDate, wd), inst = 0, instNW = 0, reset = 0
  const a = { pastTotal: 0, pastPr: 0, pastInt: 0, pastIntW: 0, pastIntM: 0, pastIntB: 0, pastN: 0, futTotal: 0, futInt: 0, futIntW: 0, futIntM: 0, futN: 0, pastNoWibor: 0, pastIntNW: 0, pastPrNW: 0, futNoWibor: 0, futIntNW: 0, curInst: 0, curNW: 0, pastNoRate: 0, futNoRate: 0, curNR: 0 }

  for (let i = 1; i <= input.loanPeriodMonths; i++) {
    const pd = payDate(input.startDate, i, input.paymentDay)
    const days = daysBetween(prev, pd)
    const rem = input.loanPeriodMonths - i + 1
    const last = i === input.loanPeriodMonths
    const bridge = input.bridgeEndDate && pd <= input.bridgeEndDate ? input.bridgeMargin : 0

    reset++
    if (reset >= resetMonths || i === 1) {
      if (i > 1) wibor = resolveWibor(pd, wd)
      reset = 0
      inst = ann(bal, wibor + input.margin + bridge, rem)
      instNW = ann(balNW, input.margin + bridge, rem)
    }

    const iW = int(bal, wibor, days, base)
    const iM = int(bal, input.margin, days, base)
    const iB = int(bal, bridge, days, base)
    const iT = iW + iM + iB

    let pr = isDecreasing ? bal / rem : Math.max(inst - iT, 0)
    if (last || pr > bal) pr = bal
    const isPast = pd <= today

    schedule.push({ number: i, date: pd, days, wiborRate: wibor, installment: pr + iT, principal: pr, interestTotal: iT, interestWibor: iW, interestMargin: iM, interestBridge: iB, remainingBalance: bal - pr, isPast })
    bal = Math.max(bal - pr, 0)

    const iNW = int(balNW, input.margin + bridge, days, base)
    let pNW = isDecreasing ? balNW / rem : Math.max(instNW - iNW, 0)
    if (last || pNW > balNW) pNW = balNW
    const nwInst = pNW + iNW
    const nrInst = rem > 0 ? balNR / rem : balNR
    const pNR = Math.min(nrInst, balNR)

    if (isPast) {
      a.pastTotal += pr + iT; a.pastPr += pr; a.pastInt += iT; a.pastIntW += iW; a.pastIntM += iM; a.pastIntB += iB; a.pastN++
      a.pastNoWibor += nwInst; a.pastIntNW += iNW; a.pastPrNW += pNW; a.pastNoRate += nrInst
    } else {
      if (a.futN === 0) { a.curInst = pr + iT; a.curNW = nwInst; a.curNR = nrInst }
      a.futTotal += pr + iT; a.futInt += iT; a.futIntW += iW; a.futIntM += iM; a.futN++
      a.futNoWibor += nwInst; a.futIntNW += iNW; a.futNoRate += nrInst
    }
    balNW = Math.max(balNW - pNW, 0)
    balNR = Math.max(balNR - pNR, 0)
    prev = pd
  }

  return {
    schedule,
    repaymentType: isDecreasing ? 'decreasing' : 'annuity',
    pastTotalPaid: a.pastTotal, pastPrincipalPaid: a.pastPr, pastInterestTotal: a.pastInt,
    pastInterestWibor: a.pastIntW, pastInterestMargin: a.pastIntM, pastInterestBridge: a.pastIntB,
    pastInstallmentsCount: a.pastN, futureTotalToPay: a.futTotal, futureInterestTotal: a.futInt,
    futureInterestWibor: a.futIntW, futureInterestMargin: a.futIntM, futureInstallmentsCount: a.futN,
    pastTotalPaidNoWibor: a.pastNoWibor, pastInterestNoWibor: a.pastIntNW, pastPrincipalNoWibor: a.pastPrNW,
    futureTotalNoWibor: a.futNoWibor, futureInterestNoWibor: a.futIntNW,
    overpaidInterest: a.pastInt - a.pastIntNW, futureSavings: a.futTotal - a.futNoWibor,
    currentInstallment: a.curInst, installmentNoWibor: a.curNW,
    pastTotalPaidNoRate: a.pastNoRate, futureTotalNoRate: a.futNoRate, installmentNoRate: a.curNR,
    overpaidWithMargin: a.pastTotal - a.pastNoRate, futureSavingsWithMargin: a.futTotal - a.futNoRate,
  }
}

export function parseStooqCSV(text: string) {
  return text.trim().split('\n').reduce<RateEntry[]>((acc, line) => {
    const p = line.split(',')
    if (p.length < 5) return acc
    let d = p[0].trim()
    if (/^\d{8}$/.test(d)) d = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return acc
    const r = parseFloat(p[4])
    if (!isNaN(r)) acc.push({ date: d, rate: r })
    return acc
  }, []).sort((a, b) => a.date.localeCompare(b.date))
}
