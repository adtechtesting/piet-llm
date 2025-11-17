import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. The application cannot start.`);
  }
  return value;
};

const GOOGLE_API_KEY = getEnv("GOOGLE_API_KEY");
const PINECONE_API_KEY = getEnv("PINECONE_API_KEY");
const PINECONE_INDEX_NAME = getEnv("PINECONE_INDEX_NAME");

const model = new ChatGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
});

const embeddings = new HuggingFaceTransformersEmbeddings({
  modelName: "Xenova/all-MiniLM-L6-v2",
});

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

function formatChatHistory(history: Array<{ role: string; content: string }>) {
  if (!history || history.length === 0) return "No previous conversation.";
  return history
    .map((msg) => {
      const role = msg.role === "user" ? "Student" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n");
}

const promptTemplate = (
  context: string,
  question: string,
  history: Array<{ role: string; content: string }>
) => `You are a warm, helpful, and friendly AI assistant for Poornima Institute of Engineering & Technology (PIET), Jaipur.

Chat History:
${formatChatHistory(history)}

Context Information:
${context}

Question:
${question}

Your job is to:
• Guide students and visitors with accurate, concise information about PIET (admissions, notices, events, policies, facilities) using the retrieved context.
• If details are missing in the context, say: "I don't have specific information about that in our records."
• Support English or Hindi as per user's query, keeping a polite and professional tone.

Additional Behaviors:
• If the question is about recent notices or events, summarize the relevant items from context.
• If the query is unclear, ask a brief clarifying question before proceeding.
• Do not fabricate data like fees, phone numbers, or dates if not present in context.

Instructions:
1. Answer using ONLY the information in the context above.
2. If the answer is not in context, respond with the fallback line above.
3. Keep answers concise and helpful.
4. Remember the chat history when responding.

Answer:`;

const ragChainPromise = (async () => {
  const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: "piet-info",
  });

  const retriever = vectorStore.asRetriever({ searchType: "similarity", k: 3 });

  return RunnableSequence.from([
    async (input: { question: string; history?: Array<{ role: string; content: string }> }) => {
      const context = await retriever
        .getRelevantDocuments(input.question)
        .then(formatDocumentsAsString);
      return {
        context,
        question: input.question,
        history: input.history || [],
      };
    },
    (input: {
      context: string;
      question: string;
      history: Array<{ role: string; content: string }>;
    }) => promptTemplate(input.context, input.question, input.history),
    model,
    new StringOutputParser(),
  ]);
})();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, history } = body;

    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    const questionStr = String(question);
    const chatHistory = Array.isArray(history) ? history : [];

    const ragChain = await ragChainPromise;
    const answer = await ragChain.invoke({
      question: questionStr,
      history: chatHistory,
    });

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("=== ERROR ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);

    return NextResponse.json(
      {
        error: "An internal server error occurred.",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
