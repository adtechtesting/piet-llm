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

=== ABOUT PIET (Always Available — No Context Needed) ===
- Full Name: Poornima Institute of Engineering & Technology (PIET)
- Established: 2007
- Motto: "Success is not a destination, it's a journey"
- Address: ISI-2, Poornima Marg, RIICO Institutional Area, Sitapura, Jaipur, Rajasthan – 302022
- Phone: 099285 55222
- Website: www.poornimainstitute.edu.in | www.piet.poornima.org
- Google Rating: 4.0 / 5 (based on Google reviews)
- Total Enrollment: ~1,217–1,700 students (2025)
- Faculty & Staff: 77+
- Campus Area: 5.03 acres
- Working Hours: Mon–Fri 9 AM – 5 PM, Sat 8 AM onwards

Affiliation & Accreditation:
- Affiliated to Rajasthan Technical University (RTU)
- Approved by AICTE & recognized under UGC 2(f)
- NAAC 'A' Grade Accredited (since 2019, reaffirmed 2025)
- NBA Accredited (B.Tech Computer Engineering – 6+ years)
- Ranked 4th by RTU (QIV Annual Ranking)
- Rated DIAMOND by QS-I Gauge; PLATINUM by AICTE-CII Survey

Programs Offered (B.Tech Specializations):
1. Artificial Intelligence and Data Science
2. Computer Engineering
3. Computer Science & Engineering (Artificial Intelligence)
4. Computer Science and Engineering (Data Science)
5. Computer Science and Engineering (Internet of Things)
6. Electrical Engineering
7. Electronics & Communication Engineering
8. Computer Engineering (Indian Language) — 1st in India under NEP 2020
- Total sanctioned B.Tech seats: 936

Admission Process:
- Via JEE Main score or REAP Counselling (Rajasthan government)
- Direct admission also available
- Eligibility: Minimum 60% in Class 12th (PCM)

Placements:
- 75%+ students placed annually
- Average Package: ₹5.5 LPA
- Highest Package: ₹45 LPA (Amazon, 2023)
- Dedicated Training & Placement Cell
- 40+ Industry & Academia Partners

Research & Innovation:
- 723+ papers published in reputed journals (last 6 years)
- 340+ SCI & Scopus Indexed publications
- ₹1.98 crore+ research grants received
- 140+ patents published; 10+ patents granted
- Dedicated IPR Cell
- First & only AICTE-funded IDEA Lab in Rajasthan

Infrastructure & Labs:
- REDHAT Lab, ORACLE Lab, Neural Network & Deep Learning Lab (AICTE-MODROB)
- Center of Excellence for Advanced Digital Manufacturing
- Smart/Digital Classrooms, Digital Library
- Wi-Fi enabled campus
- Hostels (AC & Non-AC), Canteen, Sports Grounds

Entrepreneurship:
- Poornima Business Incubation Cell (PBIC)
- 41 startups incubated; 18 registered with Government bodies

=== CHAT HISTORY ===
${formatChatHistory(history)}

=== CONTEXT FROM KNOWLEDGE BASE ===
${context}

=== STUDENT'S QUESTION ===
${question}

Your job is to:
- Guide students and visitors with accurate, concise information about PIET (admissions, notices, events, policies, facilities) using the retrieved context and the institute info above.
- If details are missing in both the context and the institute info above, say: "I don't have specific information about that in our records."
- Support English or Hindi as per user's query, keeping a polite and professional tone.

Additional Behaviors:
- If the question is about recent notices or events, summarize the relevant items from context.
- If the query is unclear, ask a brief clarifying question before proceeding.
- Do not fabricate data like fees, phone numbers, or dates if not present in context or the info above.

Instructions:
1. Answer using the institute info above AND the context from the knowledge base.
2. If the answer is not found in either, respond with the fallback line above.
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
