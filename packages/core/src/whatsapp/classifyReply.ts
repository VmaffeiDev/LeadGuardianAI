import Anthropic from "@anthropic-ai/sdk";
import { LeadTemperature } from "@leadguardian/db";

export interface TranscriptMessage {
  direction: "OUT" | "IN";
  body: string;
}

export interface ClassifyReplyResult {
  temperature: LeadTemperature;
  reasoning: string;
}

const SYSTEM_PROMPT = `Você é um assistente que classifica o nível de interesse de um lead automotivo com base na conversa de WhatsApp com uma concessionária.

Classifique como:
- QUENTE: demonstra interesse claro, urgência, pede mais informações de forma engajada, quer agendar visita/test-drive, pergunta sobre preço/condições.
- MORNO: responde de forma educada mas neutra/hesitante ("vou pensar", "me manda depois"), sem urgência clara.
- FRIO: sem interesse, pede pra não ser mais contatado, número errado, resposta hostil, ou mensagem genérica de desinteresse.

Responda APENAS com um JSON, sem markdown, no formato exato:
{"temperature": "QUENTE" | "MORNO" | "FRIO", "reasoning": "explicação em uma frase, em português"}`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurado");
    client = new Anthropic({ apiKey });
  }
  return client;
}

function extractJson(text: string): string {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced?.[1] ?? text).trim();
}

/**
 * Classifies a lead's WhatsApp conversation into quente/morno/frio using
 * Claude. `transcript` is the conversation so far, oldest message first.
 */
export async function classifyReply(transcript: TranscriptMessage[]): Promise<ClassifyReplyResult> {
  const conversationText = transcript
    .map((m) => `${m.direction === "OUT" ? "Concessionária" : "Lead"}: ${m.body}`)
    .join("\n");

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: conversationText }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA sem conteúdo de texto");
  }

  const parsed = JSON.parse(extractJson(textBlock.text)) as {
    temperature: string;
    reasoning: string;
  };

  if (!Object.values(LeadTemperature).includes(parsed.temperature as LeadTemperature)) {
    throw new Error(`Temperatura inválida retornada pela IA: ${parsed.temperature}`);
  }

  return { temperature: parsed.temperature as LeadTemperature, reasoning: parsed.reasoning };
}
