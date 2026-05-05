import type { PluginDeps } from '@obieg-zero/sdk'
import type { RateEntry } from './types'
import { daysBetween } from './calc'
import { parseStooqCSV } from './calc'
import { formatPct } from './format'
import { WIBOR_BASE, WIBOR_FILES } from './constants'

export function createWiborService({ React, store, ui, sdk }: PluginDeps) {
  const { useState } = React

  function getAutoFetch(): boolean {
    const configs = store.getPosts('wibor-config')
    return configs.length > 0 && !!configs[0].data.autoFetch
  }

  function setAutoFetch(val: boolean) {
    const configs = store.getPosts('wibor-config')
    if (configs.length > 0) {
      store.update(configs[0].id, { autoFetch: val })
    } else {
      store.add('wibor-config', { autoFetch: val })
    }
  }

  function useAutoFetch(): boolean {
    const configs = store.usePosts('wibor-config')
    return configs.length > 0 && !!configs[0].data.autoFetch
  }

  function useRatesForTenor(tenor: string): RateEntry[] {
    const sets = store.usePosts('wibor-rate-set')
    const tenorId = `wibor-${tenor.toLowerCase()}`
    return sets.find((s: any) => s.data.tenorId === tenorId)?.data?.entries || []
  }

  function useRateStatus(tenor: string) {
    const sets = store.usePosts('wibor-rate-set')
    const tenorId = `wibor-${tenor.toLowerCase()}`
    const rateSet = sets.find((s: any) => s.data.tenorId === tenorId)
    const entries = (rateSet?.data?.entries || []) as RateEntry[]
    if (!entries.length) return { count: 0, lastDate: null, fresh: false, lastRate: 0 }
    const lastDate = entries[entries.length - 1].date
    const fresh = daysBetween(new Date(lastDate), new Date()) < 14
    return { count: entries.length, lastDate, fresh, lastRate: entries[entries.length - 1].rate }
  }

  function saveTenorData(tenor: string, entries: RateEntry[]) {
    const tenorId = `wibor-${tenor.toLowerCase()}`
    const sets = store.getPosts('wibor-rate-set')
    for (const s of sets) { if (s.data?.tenorId === tenorId) store.remove(s.id) }
    store.add('wibor-rate-set', { tenorId, entries })
    sdk.log(`WIBOR ${tenor}: wczytano ${entries.length} stawek`, 'ok')
  }

  async function fetchTenor(tenor: string) {
    sdk.log(`Pobieram WIBOR ${tenor}…`, 'info')
    try {
      const url = `${WIBOR_BASE}/${WIBOR_FILES[tenor]}`
      const res = await (window as any).fetch(url)
      if (!res.ok) throw new Error(res.statusText)
      const raw = await res.json() as { d: string; r: number }[]
      const entries = raw.map(e => ({ date: e.d, rate: e.r }))
      if (!entries.length) { sdk.log('Brak danych', 'error'); return }
      saveTenorData(tenor, entries)
    } catch (e: any) { sdk.log(`Błąd pobierania: ${e.message}`, 'error') }
  }

  async function fetchAllTenors() {
    for (const t of ['1M', '3M', '6M']) await fetchTenor(t)
  }

  function detectTenorFromFilename(filename: string): string | null {
    const fn = filename.toLowerCase()
    if (fn.includes('wibor1m') || fn.includes('wibor_1m') || fn.includes('wibor-1m') || fn.includes('plopln1m')) return '1M'
    if (fn.includes('wibor3m') || fn.includes('wibor_3m') || fn.includes('wibor-3m') || fn.includes('plopln3m')) return '3M'
    if (fn.includes('wibor6m') || fn.includes('wibor_6m') || fn.includes('wibor-6m') || fn.includes('plopln6m')) return '6M'
    return null
  }

  async function importTenorFile(tenor: string) {
    const file = await sdk.openFileDialog('.csv,.json')
    if (!file) return
    const detected = detectTenorFromFilename(file.name)
    if (detected && detected !== tenor) {
      sdk.log(`Plik "${file.name}" zawiera dane WIBOR ${detected}, a nie ${tenor}`, 'error')
      return
    }
    const text = await file.text()
    let entries: RateEntry[]
    if (file.name.endsWith('.json')) {
      const raw = JSON.parse(text) as { d: string; r: number }[]
      entries = raw.map(e => ({ date: e.d, rate: e.r }))
    } else {
      entries = parseStooqCSV(text)
    }
    if (!entries.length) { sdk.log('Brak danych w pliku', 'error'); return }
    saveTenorData(tenor, entries)
  }

  function initAutoFetch() {
    if (!getAutoFetch()) return
    const stale = ['1M', '3M', '6M'].some(t => {
      const sets = store.getPosts('wibor-rate-set')
      const tenorId = `wibor-${t.toLowerCase()}`
      const rateSet = sets.find((s: any) => s.data.tenorId === tenorId)
      const entries = (rateSet?.data?.entries || []) as RateEntry[]
      if (!entries.length) return true
      const lastDate = entries[entries.length - 1].date
      return daysBetween(new Date(lastDate), new Date()) >= 14
    })
    if (stale) {
      sdk.log('Auto-aktualizacja stawek WIBOR…', 'info')
      fetchAllTenors()
    }
  }

  function WiborDataPanel() {
    const autoFetch = useAutoFetch()
    return (
      <ui.Stack gap="md">
        <ui.Card>
          <ui.Stack>
            <ui.Text muted>Historyczne stawki WIBOR potrzebne do obliczeń. Pobierz aktualne dane jednym kliknięciem lub zaimportuj własny plik.</ui.Text>
            <ui.Row justify="between" align="center">
              <ui.Checkbox checked={autoFetch} onChange={v => setAutoFetch(v)} label="Auto-aktualizacja" />
              <ui.Button size="xs" color="primary" onClick={fetchAllTenors}>Pobierz wszystkie</ui.Button>
            </ui.Row>
          </ui.Stack>
        </ui.Card>
        {['1M', '3M', '6M'].map((t, i, arr) => {
          const s = useRateStatus(t)
          return <ui.Stack key={t}>
            <ui.Text muted>{`WIBOR ${t}`}</ui.Text>
            <ui.Text muted size="2xs">{s.count > 0 ? `${s.count} stawek · do ${s.lastDate} · ostatnia ${formatPct(s.lastRate)}` : 'brak danych'}</ui.Text>
            <ui.Row>
              <ui.Button size="xs" color="primary" onClick={() => fetchTenor(t)}>Pobierz</ui.Button>
              <ui.Button size="xs" color="ghost" onClick={() => importTenorFile(t)}>Importuj z pliku</ui.Button>
            </ui.Row>
            {i < arr.length - 1 && <ui.Divider />}
          </ui.Stack>
        })}
      </ui.Stack>
    )
  }

  function TemplatesPanel({ onApply }: { onApply?: (data: Record<string, unknown>) => void }) {
    const [selectedOpp, setSelectedOpp] = useState('')
    const opponents = store.usePosts('opponent')
    const templates = store.usePosts('opponent-template')

    if (!opponents.length) return <ui.Placeholder text="Brak banków w bazie" />

    const options = [{ value: '', label: '— wszystkie banki —' }, ...opponents.map((o: any) => ({ value: o.id, label: o.data.name }))]
    const filtered = selectedOpp ? opponents.filter((o: any) => o.id === selectedOpp) : opponents

    const KV = (label: string, value: string) =>
      <ui.Row justify="between"><ui.Text muted>{label}</ui.Text><ui.Value size="sm">{value}</ui.Value></ui.Row>

    const applyTemplate = (t: any) => {
      const data: Record<string, unknown> = {}
      if (t.data.margin) data.margin = Number(t.data.margin)
      if (t.data.bridgeMargin) data.bridgeMargin = Number(t.data.bridgeMargin)
      if (t.data.wiborType) data.wiborTenor = t.data.wiborType
      if (t.data.interestMethod) data.interestMethod = t.data.interestMethod
      onApply?.(data)
      sdk.log(`Zastosowano szablon: ${t.data.name}`, 'ok')
    }

    return (
      <ui.Stack gap="md">
        <ui.Card>
          <ui.Text muted>Szablony umów z danymi banków. Wybierz bank i zastosuj szablon aby wypełnić parametry kalkulatora.</ui.Text>
        </ui.Card>
        <ui.Select value={selectedOpp} options={options} onChange={(e: any) => setSelectedOpp(e.target.value)} />
        {filtered.map((opp: any) => {
          const tpls = templates.filter((t: any) => t.parentId === opp.id)
          if (!tpls.length) return null
          return <ui.Stack key={opp.id}>
            <ui.Text muted>{opp.data.name}</ui.Text>
            {tpls.map((t: any) => (
              <ui.Card key={t.id}>
                <ui.Stack>
                  <ui.Text muted size="2xs">{t.data.name}</ui.Text>
                  {t.data.margin && KV('Marża', formatPct(Number(t.data.margin)))}
                  {t.data.bridgeMargin && KV('Pomostowa', formatPct(Number(t.data.bridgeMargin)))}
                  {t.data.wiborType && KV('WIBOR', t.data.wiborType)}
                  {t.data.commission && KV('Prowizja', formatPct(Number(t.data.commission)))}
                  {t.data.interestMethod && KV('Naliczanie', t.data.interestMethod === '365' ? '365 dni' : '360 dni')}
                  <ui.Row justify="end"><ui.Button size="xs" color="primary" onClick={() => applyTemplate(t)}>Zastosuj</ui.Button></ui.Row>
                </ui.Stack>
              </ui.Card>
            ))}
          </ui.Stack>
        })}
      </ui.Stack>
    )
  }

  return { useRatesForTenor, WiborDataPanel, TemplatesPanel, initAutoFetch }
}
