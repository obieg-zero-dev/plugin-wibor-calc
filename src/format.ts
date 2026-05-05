const plnFmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const plnFmt0 = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })
const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatPLN = (v: number, decimals = 2) => (decimals === 0 ? plnFmt0 : plnFmt).format(v)
export const formatPct = (v: number, d = 2) => `${v.toFixed(d)}%`
export const formatDate = (d: Date) => dateFmt.format(d)
