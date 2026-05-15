'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { TEE_BOXES, HOLE_PARS, PAR_3_HOLES, YARDAGES } from '@/lib/constants'

interface HoleData {
  hole_number: number
  score: number | null
  putts: number | null
  fairway_hit: boolean | null
  gir: boolean | null
  up_and_down_attempt: boolean | null
  up_and_down_made: boolean | null
}

function initHoles(): HoleData[] {
  return Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    score: null,
    putts: null,
    fairway_hit: null,
    gir: null,
    up_and_down_attempt: null,
    up_and_down_made: null,
  }))
}

function cycleBool(current: boolean | null): boolean | null {
  if (current === null) return true
  if (current === true) return false
  return null
}

function BoolToggle({ value, onChange, disabled = false }: {
  value: boolean | null
  onChange: (v: boolean | null) => void
  disabled?: boolean
}) {
  if (disabled) return <span className="text-gray-300 text-xs px-2">—</span>
  return (
    <button
      type="button"
      onClick={() => onChange(cycleBool(value))}
      className={`w-9 h-7 rounded text-xs font-semibold transition-colors ${
        value === true ? 'bg-green-500 text-white' :
        value === false ? 'bg-red-400 text-white' :
        'bg-gray-100 text-gray-400'
      }`}
    >
      {value === true ? 'Y' : value === false ? 'N' : '—'}
    </button>
  )
}

function NumberInput({ value, onChange, min = 1, max = 15 }: {
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value ?? ''}
      onChange={e => { const v = parseInt(e.target.value); onChange(isNaN(v) ? null : v) }}
      className="w-12 h-8 text-center border border-gray-200 rounded text-sm focus:outline-none focus:border-green-500 bg-white"
    />
  )
}

function HoleRow({ hole, yards, data, onChange }: {
  hole: number
  yards: number
  data: HoleData
  onChange: (updates: Partial<HoleData>) => void
}) {
  const par = HOLE_PARS[hole - 1]
  const isPar3 = PAR_3_HOLES.has(hole)
  return (
    <tr className={`border-b border-gray-100 ${hole % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
      <td className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 w-8">{hole}</td>
      <td className="px-2 py-1.5 text-center text-xs text-gray-500 w-8">{par}</td>
      <td className="px-2 py-1.5 text-center text-xs text-gray-400 w-12 hidden sm:table-cell">{yards}</td>
      <td className="px-2 py-1.5 text-center"><NumberInput value={data.score} onChange={v => onChange({ score: v })} /></td>
      <td className="px-2 py-1.5 text-center"><NumberInput value={data.putts} onChange={v => onChange({ putts: v })} min={0} max={8} /></td>
      <td className="px-2 py-1.5 text-center"><BoolToggle value={data.fairway_hit} onChange={v => onChange({ fairway_hit: v })} disabled={isPar3} /></td>
      <td className="px-2 py-1.5 text-center"><BoolToggle value={data.gir} onChange={v => onChange({ gir: v })} /></td>
      <td className="px-2 py-1.5 text-center">
        <BoolToggle
          value={data.up_and_down_attempt}
          onChange={v => onChange({ up_and_down_attempt: v, up_and_down_made: v === null || v === false ? null : data.up_and_down_made })}
          disabled={data.gir === true}
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <BoolToggle value={data.up_and_down_made} onChange={v => onChange({ up_and_down_made: v })} disabled={!data.up_and_down_attempt} />
      </td>
    </tr>
  )
}

function HoleTable({ holes, startHole, endHole, label, teeBoxId, onChange }: {
  holes: HoleData[]
  startHole: number
  endHole: number
  label: string
  teeBoxId: string
  onChange: (hole: number, updates: Partial<HoleData>) => void
}) {
  const yards = YARDAGES[teeBoxId] || YARDAGES['b0000000-0000-0000-0000-000000000001']
  const slice = holes.slice(startHole - 1, endHole)
  const total = slice.reduce((sum, h) => h.score ? sum + h.score : sum, 0)
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">{label}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm bg-white">
          <thead>
            <tr className="bg-green-900 text-white text-xs">
              <th className="px-2 py-2 text-center w-8">H</th>
              <th className="px-2 py-2 text-center w-8">Par</th>
              <th className="px-2 py-2 text-center w-12 hidden sm:table-cell">Yds</th>
              <th className="px-2 py-2 text-center">Score</th>
              <th className="px-2 py-2 text-center">Putts</th>
              <th className="px-2 py-2 text-center">FW</th>
              <th className="px-2 py-2 text-center">GIR</th>
              <th className="px-2 py-2 text-center">U&D<br/>Att</th>
              <th className="px-2 py-2 text-center">U&D<br/>Md</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(holeData => (
              <HoleRow
                key={holeData.hole_number}
                hole={holeData.hole_number}
                yards={yards[holeData.hole_number - 1]}
                data={holeData}
                onChange={updates => onChange(holeData.hole_number, updates)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 border-t-2 border-green-200">
              <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-gray-600">{label === 'Front 9' ? 'OUT' : 'IN'}</td>
              <td className="px-2 py-2 text-center text-sm font-bold text-green-900">{total > 0 ? total : '—'}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function EditRound() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [isOtherCourse, setIsOtherCourse] = useState(false)
  const [customCourseName, setCustomCourseName] = useState('')
  const [coursePar, setCoursePar] = useState(72)
  const [teeBoxId, setTeeBoxId] = useState(TEE_BOXES[0].id)
  const [roundType, setRoundType] = useState<'18' | 'front9' | 'back9'>('18')
  const [notes, setNotes] = useState('')
  const [holes, setHoles] = useState<HoleData[]>(initHoles())
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/rounds/${id}`)
      .then(r => r.json())
      .then(round => {
        setDate(round.played_date)
        setNotes(round.notes || '')
        if (round.custom_course_name) {
          setIsOtherCourse(true)
          setCustomCourseName(round.custom_course_name)
          setCoursePar(round.course_par || 72)
        } else {
          setTeeBoxId(round.tee_box_id || TEE_BOXES[0].id)
        }
        const scores: HoleData[] = round.hole_scores || []
        const front9 = scores.filter((h: HoleData) => h.hole_number <= 9 && h.score !== null).length
        const back9 = scores.filter((h: HoleData) => h.hole_number > 9 && h.score !== null).length
        if (front9 > 0 && back9 === 0) setRoundType('front9')
        else if (back9 > 0 && front9 === 0) setRoundType('back9')
        setHoles(initHoles().map(h => {
          const existing = scores.find((s: HoleData) => s.hole_number === h.hole_number)
          return existing ? { ...h, ...existing } : h
        }))
        setLoading(false)
      })
  }, [id])

  function updateHole(holeNumber: number, updates: Partial<HoleData>) {
    setHoles(prev => prev.map(h => h.hole_number === holeNumber ? { ...h, ...updates } : h))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParseError(null)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/parse-scorecard', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) { setParseError(data.error || 'Failed to parse scorecard'); return }
      setHoles(prev => prev.map(h => {
        const parsed = data.holes?.find((p: { hole: number; score: number | null; putts: number | null }) => p.hole === h.hole_number)
        if (!parsed) return h
        return { ...h, score: parsed.score ?? h.score, putts: parsed.putts ?? h.putts }
      }))
    } catch { setParseError('Network error — please try again') }
    finally { setParsing(false) }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/rounds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, teeBoxId, notes, holes, customCourseName: isOtherCourse ? customCourseName : null, coursePar: isOtherCourse ? coursePar : null }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setSaveError(data.error || 'Failed to save'); return }
      router.push('/dashboard')
    } catch { setSaveError('Network error — please try again') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>

  const front9Total = holes.slice(0, 9).reduce((s, h) => h.score ? s + h.score : s, 0)
  const back9Total = holes.slice(9, 18).reduce((s, h) => h.score ? s + h.score : s, 0)
  const grandTotal = roundType === 'front9' ? front9Total : roundType === 'back9' ? back9Total : front9Total + back9Total
  const grandPar = roundType === '18' ? 72 : 36

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-xl font-bold text-gray-800">Edit Round</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
            <div className="flex gap-2">
              {(['Turner Hill', 'Other Course'] as const).map(label => (
                <button key={label} type="button" onClick={() => setIsOtherCourse(label === 'Other Course')}
                  className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${(label === 'Other Course') === isOtherCourse ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Holes Played</label>
            <div className="flex gap-2">
              {([['18', '18 Holes'], ['front9', 'Front 9'], ['back9', 'Back 9']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setRoundType(val)}
                  className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${roundType === val ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {!isOtherCourse && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tees</label>
              <div className="flex gap-2">
                {TEE_BOXES.map(t => (
                  <button key={t.id} type="button" onClick={() => setTeeBoxId(t.id)}
                    className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${teeBoxId === t.id ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isOtherCourse && (
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Name</label>
              <input type="text" value={customCourseName} onChange={e => setCustomCourseName(e.target.value)}
                placeholder="e.g. Myopia Hunt Club"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Par</label>
              <input type="number" value={coursePar} onChange={e => setCoursePar(parseInt(e.target.value) || 72)} min={27} max={74}
                className="w-20 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weather, conditions, etc."
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Re-upload Scorecard Photo</h2>
          <span className="text-xs text-gray-400">Optional — overwrites current scores</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50">
          {parsing ? 'Parsing scorecard...' : 'Tap to choose an image'}
        </button>
        {parseError && <p className="text-red-500 text-xs mt-2">{parseError}</p>}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Hole by Hole</h2>
        {roundType !== 'back9' && <HoleTable holes={holes} startHole={1} endHole={9} label="Front 9" teeBoxId={teeBoxId} onChange={updateHole} />}
        {roundType !== 'front9' && <HoleTable holes={holes} startHole={10} endHole={18} label="Back 9" teeBoxId={teeBoxId} onChange={updateHole} />}
        {grandTotal > 0 && (
          <div className="bg-green-900 text-white rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-green-200">{front9Total} + {back9Total}</span>
              <span className="text-xl font-bold">{grandTotal}</span>
              <span className={`text-sm font-medium ${grandTotal - grandPar > 0 ? 'text-red-300' : 'text-green-300'}`}>
                ({grandTotal - grandPar >= 0 ? '+' : ''}{grandTotal - grandPar})
              </span>
            </div>
          </div>
        )}
      </div>

      {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold text-sm hover:bg-green-800 transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Update Round'}
      </button>
    </div>
  )
}
