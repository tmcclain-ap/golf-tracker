export interface HoleScore {
  hole_number: number
  score: number | null
  putts: number | null
  fairway_hit: boolean | null
  gir: boolean | null
  up_and_down_attempt: boolean | null
  up_and_down_made: boolean | null
}

export interface Round {
  id: string
  tee_box_id: string
  played_date: string
  notes: string | null
  custom_course_name: string | null
  course_par: number | null
  created_at: string
  tee_boxes: { name: string }
  hole_scores: HoleScore[]
}
