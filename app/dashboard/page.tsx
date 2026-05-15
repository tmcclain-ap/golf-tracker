'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Round } from '@/lib/types'
import { HOLE_PARS, PAR_3_HOLES } from '@/lib/constants'

interface Stats {
  roundsCount: number
  scoringAvg: number
  girPct: number
  fwPct: number
  puttsPerGIR: number
  udPct: number
}

interface HoleAnalysis {
  hole: number
  par: number
  avgScore: number
  avgVsPar: number
  rounds: number
}

function computeStats(rounds: Round[]): Stats {
  let totalScore = 0
  let scoredRounds = 0
  let girCount = 0, girTotal = 0
  let fwCount = 0, fwTotal = 0
  let puttsOnGIR = 0, puttsOnGIRCount = 0
  let udMade = 0, udAttempts = 0

  for (const round of rounds) {
    const holeScores = round.hole_scores || []
    const roundTotal = holeScores.reduce((sum, h) => h.score ? sum + h.score : sum, 0)
    const completedHoles = holeScores.filter(h => h.score !== null).length
    if (completedHoles >= 9) {
      totalScore += roundTotal
      scoredRounds++
    }

    for (const h of holeScores) {
      if (h.gir !== null) { girTotal++; if (h.gir) girCount++ }
      if (h.fairway_hit !== null && !PAR_3_HOLES.has(h.hole_number)) {
        fwTotal++; if (h.fairway_hit) fwCount++
      }
      if (h.gir && h.putts !== null) { puttsOnGIR += h.putts; puttsOnGIRCount++ }
      if (h.up_and_down_attempt) { udAttempts++; if (h.up_and_down_made) udMade++ }
    }
  }

  return {
    roundsCount: rounds.length,
    scoringAvg: scoredRounds > 0 ? totalScore / scoredRounds : 0,
    girPct: girTotal > 0 ? (girCount / girTotal) * 100 : 0,
    fwPct: fwTotal > 0 ? (fwCount / fwTotal) * 100 : 0,
    puttsPerGIR: puttsOnGIRCount > 0 ? puttsOnGIR / puttsOnGIRCount : 0,
    udPct: udAttempts > 0 ? (udMade / udAttempts) * 100 : 0,
  }
}

function computeHoleAnalysis(rounds: Round[]): HoleAnalysis[] {
  const holeData: Record<number, { total: number; count: number }> = {}
  for (let i = 1; i <= 18; i++) holeData[i] = { total: 0, count: 0 }

  for (const round of rounds) {
    for (const h of round.hole_scores || []) {
      if (h.score !== null) {
        holeData[h.hole_number].total += h.score
        holeData[h.hole_number].count++
      }
    }
  }

  return Array.from({ length: 18 }, (_, i) => {
    const hole = i + 1
    const par = HOLE_PARS[i]
    const { total, count } = holeData[hole]
    const avgScore = count > 0 ? total / count : 0
    return { hole, par, avgScore, avgVsPar: avgScore - par, rounds: count }
  })
}

function getRoundTotal(round: Round): number {
  return (round.hole_scores || []).reduce((sum, h) => h.score ? sum + h.score : sum, 0)
}

function getRoundVsPar(round: Round): number {
  const total = getRoundTotal(round)
  if (round.course_par) return total - round.course_par
  const holes = round.hole_scores || []
  const par = holes.filter(h => h.score !== null).reduce((sum, h) => sum + HOLE_PARS[h.hole_number - 1], 0)
  return total - par
}

function getCourseName(round: Round): string {
  if (round.custom_course_name) return round.custom_course_name
  return `Turner Hill — ${round.tee_boxes?.name || '—'}`
}

function formatVsPar(v: number): string {
  if (v === 0) return 'E'
  return v > 0 ? `+${v}` : `${v}`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
      <div className="text-2xl font-bold text-green-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function loadRounds() {
    fetch('/api/rounds')
      .then(r => r.json())
      .then(data => { setRounds(data); setLoading(false) })
      .catch(() => { setError('Failed to load rounds'); setLoading(false) })
  }

  useEffect(() => { loadRounds() }, [])

  async function deleteRound(id: string) {
    if (!confirm('Delete this round?')) return
    await fetch(`/api/rounds/${id}`, { method: 'DELETE' })
    loadRounds()
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>
  if (error) return <div className="text-center py-16 text-red-500">{error}</div>

  if (rounds.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">No rounds yet. Start tracking!</p>
        <Link href="/rounds/new" className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 transition-colors">
          Log Your First Round
        </Link>
      </div>
    )
  }

  const stats = computeStats(rounds)
  const holeAnalysis = computeHoleAnalysis(rounds)
  const hardestHoles = [...holeAnalysis]
    .filter(h => h.rounds > 0)
    .sort((a, b) => b.avgVsPar - a.avgVsPar)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Overview ({stats.roundsCount} rounds)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatCard label="Scoring Avg" value={stats.scoringAvg > 0 ? stats.scoringAvg.toFixed(1) : '—'} />
          <StatCard label="GIR %" value={stats.girPct > 0 ? `${stats.girPct.toFixed(0)}%` : '—'} />
          <StatCard label="Fairway %" value={stats.fwPct > 0 ? `${stats.fwPct.toFixed(0)}%` : '—'} />
          <StatCard label="Putts/GIR" value={stats.puttsPerGIR > 0 ? stats.puttsPerGIR.toFixed(2) : '—'} />
          <StatCard label="U&D %" value={stats.udPct > 0 ? `${stats.udPct.toFixed(0)}%` : '—'} />
          <div className="bg-green-700 text-white rounded-lg shadow-sm p-4 text-center flex items-center justify-center">
            <Link href="/rounds/new" className="text-sm font-semibold">+ New Round</Link>
          </div>
        </div>
      </div>

      {/* Recent Rounds */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Rounds</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Course</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Score</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">vs Par</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">GIR</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">FW</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Putts</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rounds.slice(0, 15).map((round, i) => {
                  const total = getRoundTotal(round)
                  const vsPar = getRoundVsPar(round)
                  const holes = round.hole_scores || []
                  const gir = holes.filter(h => h.gir === true).length
                  const fw = holes.filter(h => h.fairway_hit === true).length
                  const putts = holes.reduce((sum, h) => h.putts ? sum + h.putts : sum, 0)
                  return (
                    <tr key={round.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 text-gray-800">
                        {new Date(round.played_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{getCourseName(round)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{total || '—'}</td>
                      <td className={`px-4 py-3 text-right font-medium ${vsPar < 0 ? 'text-green-600' : vsPar > 0 ? 'text-red-500' : 'text-gray-600'}`}>
                        {total ? formatVsPar(vsPar) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{gir > 0 ? `${gir}/18` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fw > 0 ? `${fw}/14` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{putts > 0 ? putts : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/rounds/${round.id}/edit`} className="text-gray-300 hover:text-blue-400 text-xs transition-colors">Edit</a>
                          <button onClick={() => deleteRound(round.id)} className="text-gray-300 hover:text-red-400 text-xs transition-colors">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hole Analysis */}
      {hardestHoles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Hardest Holes (avg vs par)</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hole</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Par</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Avg Score</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Avg vs Par</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {hardestHoles.map((h, i) => (
                  <tr key={h.hole} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">Hole {h.hole}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{h.par}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{h.avgScore.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">+{h.avgVsPar.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{h.rounds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Hole Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">All Holes Breakdown</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Hole</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Par</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Avg</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">vs Par</th>
                </tr>
              </thead>
              <tbody>
                {holeAnalysis.map((h, i) => (
                  <tr key={h.hole} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2 text-gray-800">
                      {h.hole <= 9 ? 'F' : 'B'}{h.hole} {h.hole === 9 ? '(OUT)' : h.hole === 18 ? '(IN)' : ''}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{h.par}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{h.rounds > 0 ? h.avgScore.toFixed(2) : '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${h.avgVsPar > 0.5 ? 'text-red-500' : h.avgVsPar < -0.1 ? 'text-green-600' : 'text-gray-600'}`}>
                      {h.rounds > 0 ? formatVsPar(Math.round(h.avgVsPar * 100) / 100) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
