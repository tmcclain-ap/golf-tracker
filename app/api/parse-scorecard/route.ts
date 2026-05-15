import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File

  if (!file) {
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a golf scorecard from Turner Hill Golf Club. Extract the hole-by-hole scores for all 18 holes. The scores are handwritten in pencil in the player's score row.

Course pars: Hole 1:4, 2:5, 3:4, 4:3, 5:4, 6:3, 7:4, 8:4, 9:5, 10:3, 11:5, 12:4, 13:5, 14:4, 15:4, 16:4, 17:4, 18:3

Also try to extract putts per hole if there is a separate row tracking them.

Return ONLY valid JSON with this exact structure, no other text:
{
  "holes": [
    {"hole": 1, "score": 5, "putts": 2},
    {"hole": 2, "score": 6, "putts": null}
  ]
}

Use null for any score or putts value that is unclear or missing. Include all 18 holes.`,
          },
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    return Response.json({ error: 'Unexpected response from Claude' }, { status: 500 })
  }

  try {
    const text = content.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Failed to parse scorecard', raw: content.text }, { status: 500 })
  }
}
