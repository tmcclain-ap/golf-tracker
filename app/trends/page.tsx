'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Round } from '@/lib/types'
import { HOLE_PARS, PAR_3_HOLES } from '@/lib/constants'

type Filter = 'all' | 'last10' | 'last5'

interface RoundStat {
  date: string
  score: number | null
  vsPar: number | null
  girPct: number | null
  fwPct: number | null
  puttsPerGIR: number | null
  udPct: number | null
  totalPutts: number | null
}

function computeRoundStat(round: Round): RoundStat {
  const holes = round.hole_scores || []
  const scored = holes.filter(h => h.score !== null)
  const total = scored.length > 0 ? scored.reduce((s, h) => s + h.score!, 0) : null
  const par = round.course_par || scored.reduce((s, h) => s + HOLE_PARS[h.hole_number - 1], 0)

  const girTracked = holes.filter(h => h.gir !== null)
  const girMade = holes.filter(h => h.gir === true).length

  const fwTracked = holes.filter(h => h.fairway_hit !== null && !PAR_3_HOLES.has(h.hole_number))
  const fwMade = holes.filter(h => h.fairway_hit === true && !PAR_3_HOLES.has(h.hole_number)).length

  const girHoles = holes.filter(h => h.gir === true && h.putts !== null)
  const puttsPerGIR = girHoles.length > 0
    ? girHoles.reduce((s, h) => s + h.putts!, 0) / girHoles.length
    : null

  const udAttempts = holes.filter(h => h.up_and_down_attempt === true).length
  const udMade = holes.filter(h => h.up_and_down_made === true).length
  const totalPutts = holes.reduce((s, h) => h.putts ? s + h.putts : s, 0)

  return {
    date: new Date(round.played_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: total,
    vsPar: total ? total - par : null,
    girPct: girTracked.length > 0 ? Math.round(girMade / girTracked.length * 100) : null,
    fwPct: fwTracked.length > 0 ? Math.round(fwMade / fwTracked.length * 100) : null,
    puttsPerGIR: puttsPerGIR ? Math.round(puttsPerGIR * 100) / 100 : null,
    udPct: udAttempts > 0 ? Math.round(udMade / udAttempts * 100) : null,
    totalPutts: totalPutts > 0 ? totalPutts : null,
  }
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : null
}

function TrendArrow({ current, previous, lowerIsBetter = false }: {
  current: number | null
  previous: number | null
  lowerIsBetter?: boolean
}) {
  if (current === null || previous === null) return <span className="text-gray-300">—</span>
  const diff = current - previous
  if (Math.abs(diff) < 0.5) return <span className="text-gray-400">→</span>
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  return <span className={improved ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>{improved ? '↑' : '↓'}</span>
}

function StatChart({ data, dataKey, label, color, formatter }: {
  data: RoundStat[]
  dataKey: keyof RoundStat
  label: string
  color: string
  formatter?: (v: number) => string
}) {
  const chartData = data
    .filter(d => d[dataKey] !== null)
    .map(d => ({ date: d.date, value: d[dataKey] as number }))

  if (chartData.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
        <p className="text-xs text-gray-400 py-8 text-center">Need at least 2 rounds with this stat tracked</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{label}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatter} />
          <Tooltip formatter={(v: number) => [formatter ? formatter(v) : v, label]} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Trends() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/rounds')
      .then(r => r.json())
      .then(data => { setRounds(data); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>
  if (rounds.length === 0) return <div className="text-center py-16 text-gray-400">No rounds yet to show trends.</div>

  // Chronological order for charts (oldest first)
  const allStats = [...rounds].reverse().map(computeRoundStat)
  const filtered = filter === 'last5' ? allStats.slice(-5) : filter === 'last10' ? allStats.slice(-10) : allStats

  // Comparison groups
  const last5 = allStats.slice(-5)
  const prev5 = allStats.slice(-10, -5)

  const comparisons: { label: string; key: keyof RoundStat; decimals: number; suffix?: string; lowerIsBetter: boolean }[] = [
    { label: 'Scoring Avg', key: 'score', decimals: 1, lowerIsBetter: true },
    { label: 'vs Par Avg', key: 'vsPar', decimals: 1, lowerIsBetter: true },
    { label: 'GIR %', key: 'girPct', decimals: 0, suffix: '%', lowerIsBetter: false },
    { label: 'Fairway %', key: 'fwPct', decimals: 0, suffix: '%', lowerIsBetter: false },
    { label: 'Putts / GIR', key: 'puttsPerGIR', decimals: 2, lowerIsBetter: true },
    { label: 'Up & Down %', key: 'udPct', decimals: 0, suffix: '%', lowerIsBetter: false },
    { label: 'Total Putts', key: 'totalPutts', decimals: 0, lowerIsBetter: true },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Trends</h1>
        <div className="flex gap-2">
          {([['all', 'All Rounds'], ['last10', 'Last 10'], ['last5', 'Last 5']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                filter === val
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatChart data={filtered} dataKey="score" label="Score per Round" color="#15803d" />
        <StatChart data={filtered} dataKey="vsPar" label="Score vs Par" color="#b45309" formatter={v => v > 0 ? `+${v}` : `${v}`} />
        <StatChart data={filtered} dataKey="girPct" label="GIR %" color="#0369a1" formatter={v => `${v}%`} />
        <StatChart data={filtered} dataKey="fwPct" label="Fairway %" color="#7c3aed" formatter={v => `${v}%`} />
        <StatChart data={filtered} dataKey="puttsPerGIR" label="Putts per GIR" color="#dc2626" formatter={v => v.toFixed(2)} />
        <StatChart data={filtered} dataKey="udPct" label="Up & Down %" color="#d97706" formatter={v => `${v}%`} />
      </div>

      {/* Comparison Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Round Comparison</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stat</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Last 5</th>
                  {prev5.length > 0 && <th className="text-right px-4 py-3 font-medium text-gray-600">Prev 5</th>}
                  <th className="text-right px-4 py-3 font-medium text-gray-600">All Time</th>
                  {prev5.length > 0 && <th className="text-right px-4 py-3 font-medium text-gray-600">Trend</th>}
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => {
                  const l5val = avg(last5.map(s => s[c.key] as number | null))
                  const p5val = prev5.length > 0 ? avg(prev5.map(s => s[c.key] as number | null)) : null
                  const atval = avg(allStats.map(s => s[c.key] as number | null))
                  const suffix = c.suffix || ''
                  const fmt = (v: number | null) => v !== null ? `${v.toFixed(c.decimals)}${suffix}` : '—'
                  return (
                    <tr key={c.key} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-700">{c.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(l5val)}</td>
                      {prev5.length > 0 && <td className="px-4 py-3 text-right text-gray-500">{fmt(p5val)}</td>}
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(atval)}</td>
                      {prev5.length > 0 && (
                        <td className="px-4 py-3 text-right">
                          <TrendArrow current={l5val} previous={p5val} lowerIsBetter={c.lowerIsBetter} />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        {prev5.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Log at least 10 rounds to see Last 5 vs Previous 5 comparison.</p>
        )}
        {prev5.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">Trend compares Last 5 rounds vs Previous 5. ↑ = improving, ↓ = declining.</p>
        )}
      </div>
    </div>
  )
}
