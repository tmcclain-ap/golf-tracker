import { supabase } from '@/lib/supabase'
import { TURNER_HILL_COURSE_ID } from '@/lib/constants'

export async function GET() {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      id, tee_box_id, played_date, notes, created_at,
      tee_boxes(name),
      hole_scores(hole_number, score, putts, fairway_hit, gir, up_and_down_attempt, up_and_down_made)
    `)
    .order('played_date', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { date, teeBoxId, notes, holes } = body

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      course_id: TURNER_HILL_COURSE_ID,
      tee_box_id: teeBoxId,
      played_date: date,
      notes: notes || null,
    })
    .select()
    .single()

  if (roundError) {
    return Response.json({ error: roundError.message }, { status: 500 })
  }

  const holeScores = holes.map((h: {
    hole_number: number
    score: number | null
    putts: number | null
    fairway_hit: boolean | null
    gir: boolean | null
    up_and_down_attempt: boolean | null
    up_and_down_made: boolean | null
  }) => ({
    round_id: round.id,
    hole_number: h.hole_number,
    score: h.score,
    putts: h.putts,
    fairway_hit: h.fairway_hit,
    gir: h.gir,
    up_and_down_attempt: h.up_and_down_attempt,
    up_and_down_made: h.up_and_down_made,
  }))

  const { error: holesError } = await supabase
    .from('hole_scores')
    .insert(holeScores)

  if (holesError) {
    return Response.json({ error: holesError.message }, { status: 500 })
  }

  return Response.json({ id: round.id })
}
