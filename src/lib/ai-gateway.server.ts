import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return res;
  };
}

/** Friendly, user-safe error raised for any AI failure. */
export class AiError extends Error {}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const apiErr = APICallError.isInstance(err)
    ? err
    : APICallError.isInstance((err as { cause?: unknown })?.cause)
      ? ((err as { cause: unknown }).cause as APICallError)
      : null;
  const status = apiErr?.statusCode;
  if (status === 429) return new AiError("The AI is busy right now (rate limited). Please wait a minute and try again.");
  if (status === 402) return new AiError("AI credits are used up for this workspace. Add credits and try again.");
  if (status === 403) return new AiError("AI access was denied for this request.");
  if (status === 401) return new AiError("The AI service is not configured correctly.");
  if (status && status >= 500) return new AiError("The AI service had a temporary problem. Please try again shortly.");
  console.error("AI call failed", err);
  return new AiError("Could not reach the AI service. Please try again.");
}

/** Streams a Responses call server-side and returns the final text. */
export async function generateText(system: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("The AI service is not configured (missing key).");

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createRunIdFetch(),
  });

  let streamError: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    system,
    prompt,
    maxRetries: 0,
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const text = await result.text;
    if (streamError) throw streamError;
    const finish = await result.finishReason;
    if (finish === "content-filter") throw new AiError("The AI declined to generate this plan.");
    if (!text.trim()) throw new AiError("The AI returned an empty response. Please try again.");
    return text;
  } catch (err) {
    throw toAiError(streamError ?? err);
  }
}
