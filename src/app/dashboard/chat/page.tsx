"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [responseMode, setResponseMode] = useState("simple");
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
      const res = await api.rag.query({ query, response_mode: responseMode });
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
          <h1 className="text-xl font-bold text-faro-textlight">Chat RAG</h1>
          <p className="text-sm text-faro-text">
            {resumeId ? "Conversacion reanudada" : "Consulta las normativas aduaneras"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
            <button
              onClick={() => setResponseMode("simple")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                responseMode === "simple"
                  ? "bg-faro-surface text-faro-textlight shadow-sm"
                  : "text-faro-text hover:text-faro-textlight"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setResponseMode("tecnica")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                responseMode === "tecnica"
                  ? "bg-faro-surface text-faro-textlight shadow-sm"
                  : "text-faro-text hover:text-faro-textlight"
              }`}
            >
              Técnica
            </button>
          </div>
          {resumeId && (
          <button
            onClick={() => {
              setMessages([]);
              setResumeLoaded(true);
              window.history.replaceState({}, "", "/dashboard/chat");
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-faro-text hover:bg-white/[0.04]"
          >
            Nueva consulta
          </button>
        )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-faro-border bg-faro-surface p-4">
        {resumeId && !resumeLoaded ? (
          <div className="flex h-full items-center justify-center text-sm text-faro-text">
            Cargando conversacion...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-faro-text">
            Escribe tu primera consulta sobre normativas aduaneras
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/[0.04] text-faro-textlight"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none text-faro-textlight">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              </div>
              {msg.chunks && msg.chunks.length > 0 && (
                <details className="mt-2 text-xs text-faro-text">
                  <summary className="cursor-pointer hover:text-faro-text">
                    {msg.chunks.length} fuentes
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {msg.chunks.map((c, j) => (
                      <li
                        key={j}
                        className="rounded bg-white/[0.04] px-2 py-1 text-faro-textlight"
                      >
                        <span className="font-medium text-faro-text">
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
          <div className="text-sm text-faro-text animate-pulse">
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
          className="flex-1 resize-none rounded-xl border border-faro-border bg-faro-surface px-4 py-2 text-sm text-faro-textlight placeholder:text-faro-text/60 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
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
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-faro-text">
          Cargando...
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
