import { supabase } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('rounds')
    .select(`
      id, tee_box_id, played_date, notes, custom_course_name, course_par, created_at,
      tee_boxes(name),
      hole_scores(hole_number, score, putts, fairway_hit, gir, up_and_down_attempt, up_and_down_made)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { date, teeBoxId, notes, holes, customCourseName, coursePar } = body

  const { error: roundError } = await supabase
    .from('rounds')
    .update({
      tee_box_id: customCourseName ? null : teeBoxId,
      played_date: date,
      notes: notes || null,
      custom_course_name: customCourseName || null,
      course_par: customCourseName ? (coursePar || null) : null,
    })
    .eq('id', id)

  if (roundError) {
    return Response.json({ error: roundError.message }, { status: 500 })
  }

  await supabase.from('hole_scores').delete().eq('round_id', id)

  const holeScores = holes.map((h: {
    hole_number: number
    score: number | null
    putts: number | null
    fairway_hit: boolean | null
    gir: boolean | null
    up_and_down_attempt: boolean | null
    up_and_down_made: boolean | null
  }) => ({
    round_id: id,
    hole_number: h.hole_number,
    score: h.score,
    putts: h.putts,
    fairway_hit: h.fairway_hit,
    gir: h.gir,
    up_and_down_attempt: h.up_and_down_attempt,
    up_and_down_made: h.up_and_down_made,
  }))

  const { error: holesError } = await supabase.from('hole_scores').insert(holeScores)

  if (holesError) {
    return Response.json({ error: holesError.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
