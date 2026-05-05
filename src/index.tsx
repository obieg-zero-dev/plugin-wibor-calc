import type { PluginFactory } from '@obieg-zero/sdk'
import type { LoanResult } from './types'
import { calculateLoan, parseStooqCSV } from './calc'
import { formatPLN, formatPct, formatDate } from './format'
import { WIBOR_TENORS, REPAYMENT_TYPES, resultTabs } from './constants'
import { createWiborService } from './data.tsx'
import { createViews } from './views'

const plugin: PluginFactory = (deps) => {
  const { React, store, ui, icons, sdk } = deps
  const { useState } = React

  const { useRatesForTenor, WiborDataPanel, TemplatesPanel, initAutoFetch } = createWiborService(deps)

  const useCalcStore = sdk.create(() => ({ result: null as LoanResult | null, input: null as any }))
  const setResult = (r: LoanResult, inp?: any) => useCalcStore.setState({ result: r, input: inp || null })
  const useResult = () => useCalcStore(s => s.result)
  const useInput = () => useCalcStore(s => s.input)

  const { Summary, Schedule, Compare, Benefit, Calculations, Report } = createViews(deps, useInput)

  // -- CRM bridge --

  function useCaseDefaults() {
    const caseId = sdk.shared(s => (s as any).crm?.caseId) as string | null
    const cases = store.usePosts('case')
    const opponents = store.usePosts('opponent')
    const templates = store.usePosts('opponent-template')

    if (!caseId) return null
    const cas = cases.find(c => c.id === caseId)
    if (!cas) return null

    const opponentId = cas.data.opponent as string | undefined
    const opponent = opponentId ? opponents.find(o => o.id === opponentId) : null
    const template = opponent ? templates.find(t => t.parentId === opponent.id) : null

    return {
      loanAmount: Number(cas.data.loanAmount) || 300000,
      startDate: cas.data.loanDate || '2018-01-01',
      margin: Number(template?.data.margin) || 2.0,
      bridgeMargin: Number(template?.data.bridgeMargin) || 0,
      wiborTenor: template?.data.wiborType || '3M',
      interestMethod: template?.data.interestMethod || '360',
      opponentName: opponent?.data.name || null,
      caseSubject: cas.data.subject || cas.id.slice(0, 8),
    }
  }

  // -- Left panel --

  function Left() {
    const [leftTab, setLeftTab] = useState('params')
    const crmDefaults = useCaseDefaults()
    const defaults = { loanAmount: 300000, margin: 2.0, loanPeriodMonths: 360, startDate: '2018-01-01', paymentDay: 15, bridgeMargin: 0, bridgeEndDate: '', wiborTenor: '3M', manualRate: '', interestMethod: '360', repaymentType: 'annuity', ...crmDefaults }
    const { form, bind, set } = sdk.useForm(defaults)
    const rates = useRatesForTenor(form.wiborTenor)

    const calculate = () => {
      const wd = rates.length ? rates : form.manualRate ? [{ date: '2000-01-01', rate: Number(form.manualRate) }] : null
      if (!wd) { sdk.log('Podaj stawkę WIBOR ręcznie lub zaimportuj dane', 'error'); return }
      const loanInput = { ...form, startDate: new Date(form.startDate), bridgeEndDate: form.bridgeEndDate ? new Date(form.bridgeEndDate) : null, wiborData: wd, interestBase: Number(form.interestMethod) || 360 }
      const r = calculateLoan(loanInput)
      if (r) setResult(r, loanInput)
    }

    const F = (label: string, key: string, type?: string) =>
      <ui.Field label={label}><ui.Input type={type === 'n' ? 'number' : type === 'd' ? 'date' : undefined} {...bind(key, type === 'n' ? Number : undefined)} /></ui.Field>

    return (
      <ui.Box
        header={<ui.Tabs tabs={[{ id: 'params', label: 'Parametry' }, { id: 'wibor', label: 'Stawki WIBOR' }, { id: 'templates', label: 'Szablony' }]} active={leftTab} onChange={setLeftTab} />}
        body={leftTab === 'wibor' ? <WiborDataPanel /> : leftTab === 'templates' ? <TemplatesPanel onApply={(data) => { set(data); setLeftTab('params') }} /> : <ui.Stack>
          {crmDefaults?.caseSubject && <ui.Card color="info"><ui.Stack><ui.Text muted>Sprawa: {crmDefaults.caseSubject}</ui.Text>{crmDefaults.opponentName && <ui.Text muted size="2xs">Bank: {crmDefaults.opponentName}</ui.Text>}</ui.Stack></ui.Card>}
          {F('Kwota kredytu (PLN)', 'loanAmount', 'n')}{F('Marża (%)', 'margin', 'n')}{F('Okres (miesiące)', 'loanPeriodMonths', 'n')}
          <ui.Field label="WIBOR"><ui.Select {...bind('wiborTenor')} options={WIBOR_TENORS} /></ui.Field>
          <ui.Field label="Rodzaj rat"><ui.Select {...bind('repaymentType')} options={REPAYMENT_TYPES} /></ui.Field>
          {F('Data rozpoczęcia', 'startDate', 'd')}{F('Dzień spłaty', 'paymentDay', 'n')}{F('Marża pomostowa (%)', 'bridgeMargin', 'n')}
          {form.bridgeMargin > 0 && <ui.Field label="Koniec pomostowej"><ui.Input type="date" {...bind('bridgeEndDate')} /></ui.Field>}
          {!rates.length && <>
            <ui.Field label="Stawka WIBOR (%)"><ui.Input type="number" {...bind('manualRate')} placeholder="np. 5.85" /></ui.Field>
            <ui.Card color="warning"><ui.Stack><ui.Text muted>Stała stawka — obliczenie zakłada niezmienną wartość WIBOR przez cały okres kredytu. Aby uwzględnić historyczne zmiany stawek, zaimportuj dane CSV.</ui.Text><ui.Row justify="end"><ui.Button size="xs" color="primary" outline onClick={() => setLeftTab('wibor')}>Stawki WIBOR</ui.Button></ui.Row></ui.Stack></ui.Card>
          </>}
          <ui.Button onClick={calculate} block color="primary">Oblicz</ui.Button>
        </ui.Stack>}
        grow
      />
    )
  }

  // -- Center panel --

  function Center() {
    const result = useResult(), [tab, setTab] = useState('summary')
    if (!result) return <ui.Placeholder text="Wprowadź dane i kliknij Oblicz" />
    return (
      <ui.Page>
        <ui.Tabs tabs={resultTabs} active={tab} onChange={setTab} />
        {tab === 'summary' && <Summary r={result} />}
        {tab === 'schedule' && <Schedule r={result} />}
        {tab === 'compare' && <Compare r={result} />}
        {tab === 'benefit' && <Benefit r={result} />}
        {tab === 'calc' && <Calculations r={result} />}
        {tab === 'report' && <Report r={result} />}
      </ui.Page>
    )
  }

  function Footer() {
    const crmDefaults = useCaseDefaults()
    return <ui.Text muted>{crmDefaults?.opponentName ? `WIBOR · ${crmDefaults.opponentName}` : 'Kalkulator WIBOR'}</ui.Text>
  }

  // -- Registration --

  store.registerType('wibor-config', [
    { key: 'autoFetch', label: 'Auto-aktualizacja' },
  ], 'Ustawienia WIBOR')

  store.registerType('wibor-rate-set', [
    { key: 'tenorId', label: 'Tenor', required: true },
    { key: 'entries', label: 'Stawki' },
  ], 'Stawki WIBOR')

  sdk.registerView('wiborCalc.left', { slot: 'left', component: Left })
  sdk.registerView('wiborCalc.center', { slot: 'center', component: Center })
  sdk.registerView('wiborCalc.footer', { slot: 'footer', component: Footer })

  initAutoFetch()

  sdk.registerParser('wiborCalc.csv', {
    accept: '.csv',
    targetType: 'wibor-rate-set',
    parse: (text: string, filename?: string) => {
      const entries = parseStooqCSV(text)
      if (!entries.length) return []
      const fn = (filename || '').toLowerCase()
      const tenorId = fn.includes('6m') ? 'wibor-6m' : fn.includes('1m') ? 'wibor-1m' : 'wibor-3m'
      return [{ tenorId, entries }]
    },
  })

  return {
    id: 'plugin-wibor-calc',
    label: 'Kalkulator WIBOR',
    description: 'Kalkulator kredytu hipotecznego WIBOR',
    version: '1.0.0',
    icon: icons.DollarSign,
  }
}

export default plugin
