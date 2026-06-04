import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── Analyze shelf photo with Claude Vision ───────────────────────────────────

export interface ShelfAnalysisResult {
  stockEstimate: number
  condition: 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL'
  unitsSoldEstimate: number
  restockUrgency: 'LOW' | 'MEDIUM' | 'HIGH'
  observations: string[]
  recommendation: string
  report: string
}

export async function analyzeShelfPhoto(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  context: {
    productName: string
    shelfLocation: string
    previousStock?: number
  }
): Promise<ShelfAnalysisResult> {
  const prompt = `You are an expert shelf analyst for Shelfy, a shelf space marketplace in Tanzania.

Analyze this shelf photo and provide a detailed report. The shelf contains: ${context.productName}
Location: ${context.shelfLocation}
${context.previousStock ? `Previous stock count: ${context.previousStock} units` : ''}

Respond with a JSON object with these exact fields:
{
  "stockEstimate": <number of units visible>,
  "condition": "GOOD" | "NEEDS_ATTENTION" | "CRITICAL",
  "unitsSoldEstimate": <estimated units sold since last visit if previousStock given, else 0>,
  "restockUrgency": "LOW" | "MEDIUM" | "HIGH",
  "observations": [<array of specific observations about the shelf>],
  "recommendation": "<one clear action the vendor should take>",
  "report": "<professional 2-3 sentence report to send to the vendor>"
}

Be specific and practical. Consider: stock levels, product arrangement, shelf cleanliness, visibility.`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI response did not contain valid JSON')
  return JSON.parse(jsonMatch[0]) as ShelfAnalysisResult
}

// ── Generate vendor insights ─────────────────────────────────────────────────

export async function generateVendorInsights(data: {
  vendorName: string
  bookings: Array<{ shelfName: string; city: string; reports: Array<{ unitsSold: number; visitDate: string }> }>
}): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a business advisor for ${data.vendorName}, a vendor on Shelfy Tanzania.

Based on this sales data across their shelves:
${JSON.stringify(data.bookings, null, 2)}

Write a short, friendly WhatsApp-style message (max 150 words) summarizing:
1. Their best performing shelf
2. Total units sold this month
3. One specific recommendation to grow sales

Be encouraging and practical. Use simple English suitable for a Tanzanian business owner.`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── Generate restock alert ───────────────────────────────────────────────────

export async function generateRestockAlert(data: {
  vendorName: string
  productName: string
  shelfLocation: string
  unitsLeft: number
  dailySalesRate: number
}): Promise<string> {
  const daysLeft = Math.floor(data.unitsLeft / data.dailySalesRate)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Write a short WhatsApp restock alert for a vendor in Tanzania.

Vendor: ${data.vendorName}
Product: ${data.productName}
Location: ${data.shelfLocation}
Units remaining: ${data.unitsLeft}
Days until empty: ~${daysLeft} days

Keep it under 80 words. Friendly, clear, actionable. Include the exact shelf location.`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── ShelfMatch — recommend best shelves for a product ───────────────────────

export async function matchShelves(input: {
  productType: string
  targetCustomer: string
  budget: number
  city: string
  shelves: Array<{ id: string; name: string; category: string; area: string; price: number; rating: number }>
}): Promise<Array<{ shelfId: string; score: number; reason: string }>> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are ShelfMatch, an AI that recommends the best shelf locations for vendors in Tanzania.

Product: ${input.productType}
Target customer: ${input.targetCustomer}
Budget: TZS ${input.budget}/month
City: ${input.city}

Available shelves:
${JSON.stringify(input.shelves, null, 2)}

Return a JSON array of the top 3 shelf recommendations:
[{ "shelfId": "...", "score": <1-100>, "reason": "<one sentence why this shelf is ideal>" }]

Sort by score descending. Only include shelves within budget.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  return JSON.parse(jsonMatch[0])
}
