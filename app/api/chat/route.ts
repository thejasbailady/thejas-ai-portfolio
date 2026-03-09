import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

const portfolioPath = path.join(process.cwd(), "app", "portfolio.txt")

function getPortfolio(): string {
  return fs.readFileSync(portfolioPath, "utf8")
}

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
    const portfolio = getPortfolio()
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `
You are Thejas AI, an assistant that answers questions about Thejas Bailady.

You must follow these rules exactly:

1. Use ONLY the information provided in the portfolio text below as your source of truth about Thejas.
2. Do NOT guess, infer, or invent any details that are not explicitly stated in the portfolio.
   This includes (but is not limited to) dates, companies, technologies, certifications, hobbies,
   salary, personal opinions, or future plans that are not written in the portfolio.
3. When you mention dates or date ranges, you must copy them EXACTLY as they appear in the portfolio
   (for example: "Sept 2025 – Present" must not be changed to "Dec 2025 – Present" or reformatted).
4. Do NOT calculate or state total years/months of experience (e.g. "2 years and 4 months").
   Only describe the experience using the explicit dates and text from the portfolio.
5. If the user asks for anything that is not clearly supported by the portfolio, reply with exactly:
   "That information is not available in Thejas's portfolio."
6. If a question mixes known and unknown information, answer only the known parts and clearly say
   which parts are not available in the portfolio (using the exact sentence above for those parts).
7. Keep answers concise and focus only on information about Thejas from the portfolio.
8. If the question is not about Thejas or the content of the portfolio, explain that you can only
   answer questions about Thejas based on the portfolio.

Portfolio (verbatim, do not reinterpret beyond what is written):
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