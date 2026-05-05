import type { PluginDeps } from '@obieg-zero/sdk'
import type { LoanResult, ScheduleEntry } from './types'
import { formatPLN, formatPct, formatDate } from './format'
import { scheduleColumns } from './constants'

export function createViews(deps: PluginDeps, useInput: () => any) {
  const { React, ui, store, sdk } = deps
  const { useState } = React

  const KV = (label: string, value: string, color?: 'primary' | 'accent' | 'error' | 'warning' | 'info' | 'success' | 'muted') =>
    <ui.Row justify="between"><ui.Text muted>{label}</ui.Text><ui.Value size="sm" bold={!!color} color={color}>{value}</ui.Value></ui.Row>

  const KVCard = ({ title, rows }: { title: string; rows: [string, string, any?][] }) =>
    <ui.Card title={title}><ui.Stack>{rows.map(([l, v, c], i) => KV(l, v, c))}</ui.Stack></ui.Card>

  function Summary({ r }: { r: LoanResult }) {
    return (
      <ui.Stack>
        <ui.Stats>
          <ui.Stat title="Korzyść całkowita" value={formatPLN(r.overpaidInterest + r.futureSavings)} color="success" />
          <ui.Stat title="Rata aktualna" value={formatPLN(r.currentInstallment)} />
          <ui.Stat title="Rata bez WIBOR" value={formatPLN(r.installmentNoWibor)} color="info" />
          <ui.Stat title="Rata bez WIBOR i marży" value={formatPLN(r.installmentNoRate)} color="success" />
        </ui.Stats>
        <KVCard title="Dotychczasowe" rows={[['Zapłacono łącznie', formatPLN(r.pastTotalPaid)], ['Kapitał', formatPLN(r.pastPrincipalPaid)], ['Odsetki', formatPLN(r.pastInterestTotal)], ['w tym WIBOR', formatPLN(r.pastInterestWibor), 'warning'], ['w tym marża', formatPLN(r.pastInterestMargin), 'warning'], ['Rat zapłaconych', String(r.pastInstallmentsCount)]]} />
        <KVCard title="Przyszłe" rows={[['Do zapłaty', formatPLN(r.futureTotalToPay)], ['Kapitał do spłaty', formatPLN(r.futureTotalToPay - r.futureInterestTotal)], ['Odsetki przyszłe', formatPLN(r.futureInterestTotal)], ['w tym WIBOR', formatPLN(r.futureInterestWibor), 'warning'], ['w tym marża', formatPLN(r.futureInterestMargin), 'warning'], ['Rat pozostałych', String(r.futureInstallmentsCount)]]} />
      </ui.Stack>
    )
  }

  function Schedule({ r }: { r: LoanResult }) {
    const [filter, setFilter] = useState('all')
    const filtered = filter === 'past' ? r.schedule.filter(x => x.isPast) : filter === 'future' ? r.schedule.filter(x => !x.isPast) : r.schedule
    const tableRows = filtered.map(x => ({ number: x.number, date: formatDate(x.date), installment: formatPLN(x.installment), principal: formatPLN(x.principal), interest: formatPLN(x.interestTotal), wibor: formatPct(x.wiborRate), balance: formatPLN(x.remainingBalance) }))
    const filterTabs = [{ id: 'all', label: `Wszystkie (${r.schedule.length})` }, { id: 'past', label: 'Przeszłe' }, { id: 'future', label: 'Przyszłe' }]
    return (
      <ui.Stack>
        <ui.Tabs tabs={filterTabs} active={filter} onChange={setFilter} variant="lift" />
        <ui.Table columns={scheduleColumns} rows={tableRows} pageSize={24} empty="Brak rat dla wybranego filtra" />
      </ui.Stack>
    )
  }

  function Compare({ r }: { r: LoanResult }) {
    return (
      <ui.Stack>
        <ui.Stats>
          <ui.Stat title="Nadpłacone odsetki" value={formatPLN(r.overpaidInterest)} color="error" />
          <ui.Stat title="Przyszłe oszczędności" value={formatPLN(r.futureSavings)} color="success" />
        </ui.Stats>
        <KVCard title="Przeszłość" rows={[['Zapłacone z WIBOR', formatPLN(r.pastTotalPaid)], ['Zapłacone bez WIBOR', formatPLN(r.pastTotalPaidNoWibor)], ['Nadpłata (WIBOR)', formatPLN(r.overpaidInterest), 'error'], ['Nadpłata (WIBOR + marża)', formatPLN(r.overpaidWithMargin), 'error']]} />
        <KVCard title="Przyszłość" rows={[['Do zapłaty z WIBOR', formatPLN(r.futureTotalToPay)], ['Do zapłaty bez WIBOR', formatPLN(r.futureTotalNoWibor)], ['Oszczędność', formatPLN(r.futureSavings), 'success']]} />
        <KVCard title="Porównanie rat" rows={[['Rata aktualna', formatPLN(r.currentInstallment)], ['Rata bez WIBOR', formatPLN(r.installmentNoWibor), 'info'], ['Rata sam kapitał', formatPLN(r.installmentNoRate), 'success']]} />
      </ui.Stack>
    )
  }

  function Benefit({ r }: { r: LoanResult }) {
    return (
      <ui.Stack>
        <ui.Stats>
          <ui.Stat title="Korzyść łączna (WIBOR)" value={formatPLN(r.overpaidInterest + r.futureSavings)} color="success" />
          <ui.Stat title="Korzyść łączna (WIBOR + marża)" value={formatPLN(r.overpaidWithMargin + r.futureSavingsWithMargin)} color="success" />
        </ui.Stats>
        <KVCard title="Nadpłacone dotychczas" rows={[['Nadpłata z tytułu WIBOR', formatPLN(r.overpaidInterest), 'error'], ['Nadpłata z tytułu WIBOR + marża', formatPLN(r.overpaidWithMargin), 'error']]} />
        <KVCard title="Przyszłe oszczędności" rows={[['Oszczędność (WIBOR)', formatPLN(r.futureSavings), 'success'], ['Oszczędność (WIBOR + marża)', formatPLN(r.futureSavingsWithMargin), 'success']]} />
        <KVCard title="Różnica w racie miesięcznej" rows={[['Rata aktualna', formatPLN(r.currentInstallment)], ['Rata bez WIBOR', formatPLN(r.installmentNoWibor), 'info'], ['Rata bez WIBOR i marży', formatPLN(r.installmentNoRate), 'success'], ['Oszczędność miesięczna (bez WIBOR)', formatPLN(r.currentInstallment - r.installmentNoWibor), 'info'], ['Oszczędność miesięczna (bez WIBOR i marży)', formatPLN(r.currentInstallment - r.installmentNoRate), 'success']]} />
      </ui.Stack>
    )
  }

  function Calculations({ r }: { r: LoanResult }) {
    const inp = useInput()
    const [expanded, setExpanded] = useState<number | null>(1)

    if (!inp) return <ui.Placeholder text="Brak danych wejściowych" />

    const baseDays = inp.interestBase || 360
    const tenor = inp.wiborTenor || '3M'
    const resetMonths = ({ '1M': 1, '3M': 3, '6M': 6 } as any)[tenor] || 3
    const repType = inp.repaymentType === 'decreasing' ? 'malejące' : 'równe (annuitetowe)'
    const toggle = (n: number) => setExpanded(expanded === n ? null : n)

    return (
      <ui.Stack>
        <ui.Card title="Parametry wejściowe">
          <ui.Stack>
            {KV('Kwota kredytu', formatPLN(inp.loanAmount))}
            {KV('Marża banku', formatPct(inp.margin))}
            {KV('Okres', `${inp.loanPeriodMonths} mies.`)}
            {KV('Tenor WIBOR', `WIBOR ${tenor} (reset co ${resetMonths} mies.)`)}
            {KV('Rodzaj rat', repType)}
            {KV('Data rozpoczęcia', formatDate(inp.startDate))}
            {KV('Dzień spłaty', String(inp.paymentDay))}
            {KV('Baza odsetkowa', `${baseDays} dni`)}
            {KV('Marża pomostowa', formatPct(inp.bridgeMargin))}
            {inp.bridgeEndDate && KV('Koniec pomostowej', formatDate(inp.bridgeEndDate))}
          </ui.Stack>
        </ui.Card>

        <ui.Card title="Wzory">
          <ui.Stack>
            <ui.Text muted size="2xs">Odsetki = saldo × (stawka / 100) × dni_w_okresie / {baseDays}</ui.Text>
            <ui.Text muted size="2xs">Rata annuitetowa = saldo × (r × (1+r)^n) / ((1+r)^n − 1), gdzie r = stawka/100/12</ui.Text>
            <ui.Text muted size="2xs">Stawka = WIBOR + marża + marża_pomostowa</ui.Text>
            <ui.Text muted size="2xs">WIBOR: ostatnia znana stawka ≤ data płatności, reset co {resetMonths} mies.</ui.Text>
          </ui.Stack>
        </ui.Card>

        <ui.Card title="Obliczenia krok po kroku">
          <ui.Text muted size="2xs">Kliknij ratę aby rozwinąć szczegóły obliczeń</ui.Text>
        </ui.Card>

        {r.schedule.map((s: ScheduleEntry) => {
          const isOpen = expanded === s.number
          const bridge = s.interestBridge > 0
          const totalRate = s.wiborRate + inp.margin + (bridge ? inp.bridgeMargin : 0)
          const prevDate = s.number === 1 ? inp.startDate : r.schedule[s.number - 2].date

          return (
            <ui.Card key={s.number}>
              <ui.Stack>
                <ui.Row justify="between" onClick={() => toggle(s.number)}>
                  <ui.Text bold size="xs">Rata #{s.number} — {formatDate(s.date)}</ui.Text>
                  <ui.Text muted size="2xs">{formatPLN(s.installment)}</ui.Text>
                </ui.Row>

                {isOpen && <ui.Stack>
                  <ui.Divider />

                  <ui.Text muted size="2xs" bold>1. Okres</ui.Text>
                  <ui.Text muted size="2xs">
                    Od {formatDate(prevDate)} do {formatDate(s.date)} = {s.days} dni
                  </ui.Text>

                  <ui.Text muted size="2xs" bold>2. Stawka WIBOR</ui.Text>
                  <ui.Text muted size="2xs">
                    WIBOR {tenor} na dzień {formatDate(s.date)}: {formatPct(s.wiborRate)}
                  </ui.Text>

                  <ui.Text muted size="2xs" bold>3. Oprocentowanie łączne</ui.Text>
                  <ui.Text muted size="2xs">
                    {formatPct(s.wiborRate)} (WIBOR) + {formatPct(inp.margin)} (marża){bridge ? ` + ${formatPct(inp.bridgeMargin)} (pomostowa)` : ''} = {formatPct(totalRate)}
                  </ui.Text>

                  <ui.Text muted size="2xs" bold>4. Odsetki WIBOR</ui.Text>
                  <ui.Text muted size="2xs">
                    {formatPLN(s.remainingBalance + s.principal)} × {formatPct(s.wiborRate)} × {s.days} / {baseDays} = {formatPLN(s.interestWibor)}
                  </ui.Text>

                  <ui.Text muted size="2xs" bold>5. Odsetki marża</ui.Text>
                  <ui.Text muted size="2xs">
                    {formatPLN(s.remainingBalance + s.principal)} × {formatPct(inp.margin)} × {s.days} / {baseDays} = {formatPLN(s.interestMargin)}
                  </ui.Text>

                  {bridge && <>
                    <ui.Text muted size="2xs" bold>5b. Odsetki pomostowa</ui.Text>
                    <ui.Text muted size="2xs">
                      {formatPLN(s.remainingBalance + s.principal)} × {formatPct(inp.bridgeMargin)} × {s.days} / {baseDays} = {formatPLN(s.interestBridge)}
                    </ui.Text>
                  </>}

                  <ui.Text muted size="2xs" bold>6. Odsetki łącznie</ui.Text>
                  <ui.Text muted size="2xs">
                    {formatPLN(s.interestWibor)} + {formatPLN(s.interestMargin)}{bridge ? ` + ${formatPLN(s.interestBridge)}` : ''} = {formatPLN(s.interestTotal)}
                  </ui.Text>

                  <ui.Text muted size="2xs" bold>7. Rata i kapitał</ui.Text>
                  {inp.repaymentType === 'decreasing' ? (
                    <ui.Text muted size="2xs">
                      Kapitał = saldo / pozostałe raty = {formatPLN(s.remainingBalance + s.principal)} / {inp.loanPeriodMonths - s.number + 1} = {formatPLN(s.principal)}
                    </ui.Text>
                  ) : (
                    <ui.Text muted size="2xs">
                      Rata annuitetowa = ann({formatPLN(s.remainingBalance + s.principal)}, {formatPct(totalRate)}, {inp.loanPeriodMonths - s.number + 1}) = {formatPLN(s.installment)}, kapitał = {formatPLN(s.installment)} − {formatPLN(s.interestTotal)} = {formatPLN(s.principal)}
                    </ui.Text>
                  )}

                  <ui.Text muted size="2xs" bold>8. Saldo po racie</ui.Text>
                  <ui.Text muted size="2xs">
                    {formatPLN(s.remainingBalance + s.principal)} − {formatPLN(s.principal)} = {formatPLN(s.remainingBalance)}
                  </ui.Text>
                </ui.Stack>}
              </ui.Stack>
            </ui.Card>
          )
        })}
      </ui.Stack>
    )
  }

  function Report({ r }: { r: LoanResult }) {
    const inp = useInput()
    if (!inp) return <ui.Placeholder text="Brak danych wejściowych" />

    const caseId = sdk.shared(s => (s as any).crm?.caseId) as string | null
    const nav = sdk.shared(s => (s as any).navigate) as { from: string; label?: string; onReturn?: () => void } | null
    const cas = caseId ? store.usePost(caseId) : null
    const [saved, setSaved] = useState(false)

    const reportData = {
      loanAmount: inp.loanAmount,
      startDate: typeof inp.startDate === 'object' ? inp.startDate.toISOString().slice(0, 10) : inp.startDate,
      loanPeriodMonths: inp.loanPeriodMonths,
      wiborTenor: inp.wiborTenor || '3M',
      margin: inp.margin,
      overpaidInterest: r.overpaidInterest,
      futureSavings: r.futureSavings,
      overpaidWithMargin: r.overpaidWithMargin,
      futureSavingsWithMargin: r.futureSavingsWithMargin,
      currentInstallment: r.currentInstallment,
      installmentNoWibor: r.installmentNoWibor,
      installmentNoRate: r.installmentNoRate,
      totalBenefit: r.overpaidInterest + r.futureSavings,
      totalBenefitWithMargin: r.overpaidWithMargin + r.futureSavingsWithMargin,
    }

    const saveToCase = () => {
      if (!caseId) return
      store.add('event', {
        kind: 'raport-wibor',
        text: `Analiza WIBOR — zwrot: ${formatPLN(r.overpaidInterest)}, korzyść: ${formatPLN(reportData.totalBenefit)}`,
        date: new Date().toISOString().slice(0, 10),
        report: reportData,
      }, { parentId: caseId })
      sdk.log('Raport zapisany w sprawie', 'ok')
      setSaved(true)
    }

    return (
      <ui.Stack>
        <ui.Stats>
          <ui.Stat title="Kwota zwrotu od banku" value={formatPLN(r.overpaidInterest)} color="error" />
          <ui.Stat title="Dodatkowe korzyści" value={formatPLN(r.futureSavings)} color="success" />
          <ui.Stat title="Nowa rata (bez WIBOR)" value={formatPLN(r.installmentNoWibor)} color="info" />
        </ui.Stats>

        <ui.Card title="Analiza prawno-finansowa">
          <ui.Stack>
            {KV('Kwota kredytu', formatPLN(inp.loanAmount))}
            {KV('Okres kredytowania', `${inp.loanPeriodMonths} mies.`)}
            {KV('WIBOR', inp.wiborTenor || '3M')}
            {KV('Marża banku', formatPct(inp.margin))}
            {KV('Korzyść łączna (WIBOR)', formatPLN(reportData.totalBenefit), 'success')}
            {KV('Korzyść łączna (WIBOR + marża)', formatPLN(reportData.totalBenefitWithMargin), 'success')}
            {KV('Rata aktualna', formatPLN(r.currentInstallment))}
            {KV('Rata bez WIBOR', formatPLN(r.installmentNoWibor), 'info')}
            {KV('Rata bez WIBOR i marży', formatPLN(r.installmentNoRate), 'success')}
          </ui.Stack>
        </ui.Card>

        {cas ? (
          <ui.Card title="Sprawa CRM" color={saved ? 'success' : undefined}>
            <ui.Stack>
              <ui.Text muted>{cas.data.subject || cas.id.slice(0, 8)}</ui.Text>
              {saved
                ? <ui.Stack>
                    <ui.Text bold color="success">Raport zapisany w sprawie</ui.Text>
                    {nav && <ui.Button color="primary" block onClick={() => {
                      if (nav.onReturn) nav.onReturn()
                      sdk.shared.setState({ navigate: null })
                      sdk.useHostStore.setState({ activeId: nav.from })
                    }}>← {nav.label || 'Wróć'}</ui.Button>}
                  </ui.Stack>
                : <ui.Button color="primary" block onClick={saveToCase}>Zapisz raport w sprawie</ui.Button>}
            </ui.Stack>
          </ui.Card>
        ) : nav ? (
          <ui.Button color="primary" block onClick={() => {
            if (nav.onReturn) nav.onReturn()
            sdk.shared.setState({ navigate: null })
            sdk.useHostStore.setState({ activeId: nav.from })
          }}>← {nav.label || 'Wróć'}</ui.Button>
        ) : (
          <ui.Card color="warning">
            <ui.Text muted>Brak aktywnej sprawy CRM — wybierz sprawę w module Kancelaria, aby zapisać raport</ui.Text>
          </ui.Card>
        )}
      </ui.Stack>
    )
  }

  return { Summary, Schedule, Compare, Benefit, Calculations, Report }
}
