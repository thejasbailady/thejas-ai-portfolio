import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

const portfolioPath = path.join(process.cwd(), "app", "portfolio.txt")
const portfolio = fs.readFileSync(portfolioPath, "utf8")

function getClient() {
  const apiKey = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) return null

  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  })
}

type ChatRequestBody = {
  message?: unknown
}

export async function POST(req: NextRequest) {
  const client = getClient()
  if (!client) {
    return NextResponse.json(
      {
        reply:
          "Server configuration error: missing GROQ_API_KEY (or OPENAI_API_KEY).",
      },
      { status: 500 }
    )
  }

  const model = (process.env.GROQ_MODEL ?? "llama-3.1-8b-instant").trim()

  let body: ChatRequestBody | null = null
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    // Non-JSON body
  }

  const message =
    body && typeof body.message === "string"
      ? body.message
      : typeof body?.message === "number"
        ? String(body.message)
        : ""

  if (!message.trim()) {
    return NextResponse.json(
      { reply: "Please send a non-empty text message in the `message` field." },
      { status: 400 }
    )
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `
You are Thejas AI, an assistant that answers questions about Thejas Bailady.

IMPORTANT RULES:
- Only use the information provided in the portfolio below.
- Do NOT invent skills, technologies, or projects.
- If information is not present in the portfolio, say:
  "That information is not available in Thejas's portfolio."

Portfolio:
${portfolio}
`
        },
        {
          role: "user",
          content: message,
        },
      ],
    })

    const reply = completion.choices[0]?.message?.content ?? ""

    return NextResponse.json({
      reply: reply || "I couldn’t generate a response just now. Please try again.",
    })
  } catch (error) {
    console.error("Error generating AI reply:", error)
    return NextResponse.json(
      {
        reply:
          "There was an error while generating a response. Please try again shortly.",
      },
      { status: 500 }
    )
  }
}