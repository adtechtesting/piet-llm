// app/page.tsx
import { Chatbot } from "@/compoents/chatbot";
import React from "react";
 // adjust the path if different

export default function Page() {
  return (
    <main className="min-h-screen">
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Welcome to PIET</h1>
        <p className="text-gray-600 mt-2">
          Ask the PIET Assistant about admissions, notices, events, departments, or facilities.
        </p>
      </section>

      {/* Client component lives inside server component */}
      <Chatbot />
    </main>
  );
}
