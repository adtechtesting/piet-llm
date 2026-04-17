import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";


const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 300,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});



let vectorStorePromise: Promise<PineconeStore> | null = null;

function getPineconeStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = (async () => {
      try {
        const pinecone = new PineconeClient({
          apiKey: process.env.PINECONE_API_KEY!,
        });
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
        return await PineconeStore.fromExistingIndex(embeddings, {
          pineconeIndex,
          namespace: "piet-poornima-info",
        });
      } catch (error) {
        console.error("Pinecone initialization failed:", error);
        throw error;
      }
    })();
  }
  return vectorStorePromise;
}



async function retrieveContext(query: string): Promise<string> {
  try {
    const store = await getPineconeStore();
    const results = await store.similaritySearch(query, 4);
    if (results.length === 0) return "";
    return results.map(doc => doc.pageContent.trim()).join("\n\n---\n\n");
  } catch (error) {
    console.error("Pinecone retrieval error:", error);
    return "";
  }
}


type Intent =
  | "welcome"
  | "admissions"
  | "notices"
  | "events"
  | "placements"
  | "programs"
  | "facilities"
  | "contact"
  | "general_chat";

function classifyIntent(message: string): Intent {
  if (message === "INIT_CHAT") return "welcome";

  const msg = message.toLowerCase();

  if (msg.includes("admit") || msg.includes("admission") || msg.includes("apply") || msg.includes("eligib") || msg.includes("jee") || msg.includes("reap") || msg.includes("fees") || msg.includes("fee"))
    return "admissions";

  if (msg.includes("notice") || msg.includes("circular") || msg.includes("exam") || msg.includes("schedule") || msg.includes("timetable") || msg.includes("result"))
    return "notices";

  if (msg.includes("event") || msg.includes("fest") || msg.includes("seminar") || msg.includes("marathon") || msg.includes("women") || msg.includes("nss") || msg.includes("blood donation"))
    return "events";

  if (msg.includes("placement") || msg.includes("package") || msg.includes("recruit") || msg.includes("campus") || msg.includes("job") || msg.includes("lpa") || msg.includes("company"))
    return "placements";

  if (msg.includes("course") || msg.includes("program") || msg.includes("branch") || msg.includes("b.tech") || msg.includes("btech") || msg.includes("specializ") || msg.includes("cse") || msg.includes("ai") || msg.includes("iot"))
    return "programs";

  if (msg.includes("lab") || msg.includes("library") || msg.includes("hostel") || msg.includes("campus") || msg.includes("infra") || msg.includes("canteen") || msg.includes("wifi") || msg.includes("facility") || msg.includes("facilities"))
    return "facilities";

  if (msg.includes("contact") || msg.includes("phone") || msg.includes("address") || msg.includes("location") || msg.includes("reach") || msg.includes("where") || msg.includes("number"))
    return "contact";

  return "general_chat";
}


const PIET_INFO = `
You are a helpful AI assistant for Poornima Institute of Engineering & Technology (PIET), Jaipur.

=== PIET CORE INFORMATION (Always trust this) ===

General:
- Full Name: Poornima Institute of Engineering & Technology (PIET)
- Established: 2007
- Motto: "Success is not a destination, it's a journey"
- Affiliation: Rajasthan Technical University (RTU)
- Approvals: AICTE approved, UGC 2(f) recognized
- Accreditation: NAAC 'A' Grade (since 2019, reaffirmed 2025)
- NBA Accredited: B.Tech Computer Engineering (6+ years), Civil Engineering (2019-20)
- Ranking: 4th by RTU (QIV Annual Ranking)
- Rating: DIAMOND by QS-I Gauge | PLATINUM by AICTE-CII Survey

Contact & Location:
- Address: ISI-2, Poornima Marg, RIICO Institutional Area, Sitapura, Jaipur, Rajasthan – 302022
- Phone: 099285 55222
- Website: www.poornimainstitute.edu.in
- Working Hours: Mon–Fri 9 AM – 5 PM | Sat from 8 AM
- Google Rating: 4.0★

B.Tech Programs (8 Specializations):
1. Artificial Intelligence and Data Science
2. Computer Engineering
3. Computer Science & Engineering (Artificial Intelligence)
4. Computer Science and Engineering (Data Science)
5. Computer Science and Engineering (Internet of Things)
6. Electrical Engineering
7. Electronics & Communication Engineering
8. Computer Engineering in Indian Language (1st in India under NEP 2020)
- Total Sanctioned Seats: 936

Admission Process:
- Via JEE Main score or REAP Counselling (Rajasthan Govt.)
- Direct admission also available
- Eligibility: Min. 60% in Class 12th (PCM)

Key Stats:
- ~1,700 students | 77+ faculty & staff
- 40+ Industry & Academia MOU partners
- 75%+ students placed annually
- Average Package: ₹5.5 LPA | Highest Package: ₹45 LPA (Amazon, 2023)
- 723+ research papers (last 6 years) | 340+ SCI/Scopus indexed
- ₹1.98 crore research grants received
- 140+ patents published | 10+ patents granted
- 41 startups incubated via PBIC (18 govt. registered)

Labs & Infrastructure:
- First & only AICTE-funded IDEA Lab in Rajasthan
- Neural Network & Deep Learning Lab (AICTE-MODROB)
- REDHAT Lab | ORACLE Lab
- Center of Excellence: Advanced Digital Manufacturing
- Smart digital classrooms, Digital Library
- Wi-Fi campus | Hostels (AC & Non-AC) | Canteen | Sports Ground

Recent Events:
- International Women's Day – 8th March 2025
- Blood Donation Camp – 10th March 2025
- Poornima Marathon 2025 – held in Jaipur
- Admissions Open for 2025-26 Batch
- AI Seminar – 15th April 2025
- NSS Plantation Drive – 22nd April 2025
`;


function getSystemPrompt(intent: Intent): string {
  const base = `${PIET_INFO}

Personality & Rules:
- Be warm, friendly, helpful, and professional — like a real student counsellor.
- Support English or Hindi based on the user's query language.
- Keep replies concise (2–4 sentences) unless detail is specifically requested.
- Do NOT use markdown, bold (**text**), or bullet symbols in your reply — plain text only.
- Never fabricate fees, dates, phone numbers, or exam details not present in context.
- If information is unavailable, say: "I don't have specific details on that right now. Please contact PIET at 099285 55222 for accurate information."
`;

  const intentGuides: Record<Intent, string> = {
    welcome: `${base}\nGreet the user warmly. Briefly introduce PIET and ask how you can help them today.`,
    admissions: `${base}\nFocus on admission process, eligibility, JEE Main, REAP counselling, and direct admission. Guide them step by step.`,
    notices: `${base}\nHelp the user find relevant notices (exam, anti-ragging, branch change, scholarships, etc.) from the context. Summarize clearly.`,
    events: `${base}\nShare recent events and activities at PIET. Be enthusiastic and encouraging about campus life.`,
    placements: `${base}\nHighlight PIET's strong placement record, average/highest packages, recruiting companies, and the Training & Placement Cell.`,
    programs: `${base}\nExplain B.Tech programs, specializations, and PIET's unique offerings like Indian Language CE under NEP 2020.`,
    facilities: `${base}\nDescribe PIET's labs, infrastructure, library, hostels, canteen, and smart classrooms. Emphasize state-of-the-art facilities.`,
    contact: `${base}\nProvide PIET's address, phone number, working hours, and website clearly. Offer to help with anything else.`,
    general_chat: `${base}\nAnswer the user's question using the context and PIET info above. If unsure, suggest contacting PIET directly.`,
  };

  return intentGuides[intent];
}

// ─── Main Chat Handler ────────────────────────────────────────────────────────

async function handleChat(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<{ type: string; text: string; buttons?: { label: string; payload: string }[] }> {

  // Welcome message
  if (message === "INIT_CHAT") {
    const welcomeText = "Namaste! 🙏 Welcome to PIET – Poornima Institute of Engineering & Technology, Jaipur.\n\nI'm your virtual assistant, here to help you with admissions, programs, placements, notices, and more. How can I help you today?";
    return {
      type: "welcome_card",
      text: welcomeText,
      buttons: [
        { label: "Admissions 2025-26", payload: "How do I apply for admission?" },
        { label: "B.Tech Programs", payload: "What programs does PIET offer?" },
        { label: "Placements", payload: "Tell me about placements at PIET" },
        { label: "Contact & Location", payload: "What is the address and contact of PIET?" },
      ],
    };
  }

  const intent = classifyIntent(message);
  const context = await retrieveContext(message);
  const systemPrompt = getSystemPrompt(intent);

  const formattedHistory = history
    .slice(-8)
    .map(m => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`)
    .join("\n");

  const fullPrompt = `${systemPrompt}

${context ? `=== RETRIEVED CONTEXT ===\n${context}\n` : ""}

=== CONVERSATION HISTORY ===
${formattedHistory}

=== STUDENT'S QUESTION ===
"${message}"

Answer (plain text only, no markdown):`;

  const response = await llm.invoke(fullPrompt);
  const responseText = response.content.toString().replace(/\*\*/g, "").trim();


  const buttonMap: Partial<Record<Intent, { label: string; payload: string }[]>> = {
    admissions: [{ label: "Programs Offered", payload: "What B.Tech programs are available?" }],
    programs: [{ label: "Apply Now", payload: "How do I apply for admission?" }],
    placements: [{ label: "View Programs", payload: "What programs does PIET offer?" }],
    contact: [{ label: "Admissions Info", payload: "How do I apply for admission?" }],
  };

  return {
    type: "text",
    text: responseText,
    ...(buttonMap[intent] && { buttons: buttonMap[intent] }),
  };
}



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, question } = body;

    const userMessage = String(message || question || "").trim();
    if (!userMessage) {
      return NextResponse.json({ type: "text", text: "Please type a message to get started." });
    }

    let chatHistory: Array<{ role: string; content: string }> = [];
    if (Array.isArray(history)) {
      chatHistory = history.map((msg, idx) => ({
        role: idx % 2 === 0 ? "user" : "assistant",
        content: typeof msg === "string" ? msg : msg.content || "",
      }));
    }

    const response = await handleChat(userMessage, chatHistory);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      {
        type: "text",
        text: "I'm having trouble right now. Please contact PIET directly at 099285 55222 or visit www.poornimainstitute.edu.in for assistance.",
      },
      { status: 500 }
    );
  }
}