import { GoogleGenerativeAI } from '@google/generative-ai'

export async function runLLM(prompt: string): Promise<string | undefined> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set')
  }
  const ai = new GoogleGenerativeAI(apiKey)

  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const response = await model.generateContent(prompt)

  return response.response.text()
}
