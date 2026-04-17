"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";


interface Message {
  role: "user" | "assistant";
  content: string;
  buttons?: { label: string; payload: string }[];
}

const TypingIndicator = () => (
  <div className="mb-4 flex justify-start animate-in slide-in-from-bottom-2 duration-300">
    <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 shadow-lg flex space-x-2 items-center">
      <div className="flex space-x-1">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-100" />
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-200" />
      </div>
      <span className="text-xs text-gray-500 ml-2">Thinking...</span>
    </div>
  </div>
);

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const response = await fetch(`/api/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "INIT_CHAT",
            history: [],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setMessages([
            {
              role: "assistant",
              content: data.text,
              buttons: data.buttons,
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      }
    };

    initializeChat();

    const timeout = setTimeout(() => {
      setIsOpen(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        chatbotRef.current &&
        !chatbotRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest("[data-chatbot-toggle]")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    if (input === text) setInput("");

    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text || "Sorry, I couldn't get a response.",
        buttons: data.buttons,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleButtonClick = (payload: string) => {
    sendMessage(payload);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        data-chatbot-toggle
        className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-700 shadow-lg text-white text-xl flex items-center justify-center hover:cursor-pointer"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X size={24} /> : "💬"}
      </Button>

      <div className="hidden sm:flex">
    
      </div>

      <div
        className={`fixed bottom-20 right-4 md:right-24 w-[95%] sm:w-[90%] md:max-w-md lg:w-96 h-[72vh] z-40 transition-all duration-500 ease-out transform ${
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          ref={chatbotRef}
          className="h-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-blue-100/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <Bot className="text-blue-600" />
              <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                PIET Assistant
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-white/50 transition-all duration-200 flex items-center justify-center group"
            >
              <X
                size={18}
                className="text-gray-600 group-hover:text-gray-800 hover:cursor-pointer"
              />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-6 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-10 text-sm animate-in fade-in-50 duration-1000 flex flex-col items-center justify-center gap-4">
                <div className="p-5 bg-blue-50 rounded-full shadow-lg animate-in zoom-in-75">
                  <Bot size={40} className="text-blue-600" />
                </div>
                <p className="text-md">
                  Ask about admissions, notices, events, departments, or facilities at PIET. I’ll answer using verified campus info.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-6 flex flex-col animate-in slide-in-from-bottom-2 duration-500 ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div
                  className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed break-words shadow-md ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-600/30"
                      : "bg-white text-gray-900 border border-gray-100 shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                {message.buttons && message.buttons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.buttons.map((button, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => handleButtonClick(button.payload)}
                        disabled={isLoading}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gray-100/50 bg-white/50 backdrop-blur-sm rounded-b-2xl">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question about PIET..."
                  className="text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md pr-12"
                  disabled={isLoading}
                />
                {input && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 rounded-xl px-4 py-2 text-white shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl disabled:hover:scale-100 group"
              >
                <Send
                  size={16}
                  className={`transition-transform duration-300 ${
                    isLoading ? "animate-pulse" : "group-hover:translate-x-0.5"
                  }`}
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
