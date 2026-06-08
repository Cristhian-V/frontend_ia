"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  chunks?: {
    doc_id: string;
    text: string;
    distance: number;
    chapter_title?: string;
    document_filename?: string;
  }[];
}

function ChatInner() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resumeId && !resumeLoaded) {
      api.rag
        .historyItem(resumeId)
        .then((log: any) => {
          setMessages([
            { role: "user", content: log.query },
            { role: "assistant", content: log.answer },
          ]);
          setResumeLoaded(true);
        })
        .catch(() => setResumeLoaded(true));
    }
  }, [resumeId, resumeLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await api.rag.query({ query });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, chunks: res.chunks },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chat RAG</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {resumeId ? "Conversacion reanudada" : "Consulta las normativas aduaneras"}
          </p>
        </div>
        {resumeId && (
          <button
            onClick={() => {
              setMessages([]);
              setResumeLoaded(true);
              window.history.replaceState({}, "", "/dashboard/chat");
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Nueva consulta
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        {resumeId && !resumeLoaded ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            Cargando conversacion...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            Escribe tu primera consulta sobre normativas aduaneras
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.chunks && msg.chunks.length > 0 && (
                <details className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-500 dark:hover:text-zinc-300">
                    {msg.chunks.length} fuentes
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {msg.chunks.map((c, j) => (
                      <li
                        key={j}
                        className="rounded bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-zinc-600 dark:text-zinc-300"
                      >
                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                          [{c.document_filename || c.doc_id?.slice(0, 8)}
                          {c.chapter_title ? ` — ${c.chapter_title}` : ""}]
                        </span>{" "}
                        {c.text?.slice(0, 200)}...
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">
            Consultando normativas...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej: Cuales son los requisitos para importar mercancia?"
          className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-blue-600 dark:bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-zinc-400">
          Cargando...
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
