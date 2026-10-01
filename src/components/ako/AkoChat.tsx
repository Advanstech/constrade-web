"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { request } from "@/lib/apiClient";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  action?: { key: string; label: string } | null;
  sources?: Array<{ key: string; label: string; asOf: string }>;
};

type AkoResponse = {
  answer: string;
  action: { key: string; label: string } | null;
  sources: Array<{ key: string; label: string; asOf: string }>;
  requiresAccountContext: boolean;
};

const SUGGESTIONS = [
  "What does a Treasury bill yield mean?",
  "How does the order process work?",
  "What is diversification?",
  "Show my KYC status",
];

export function AkoChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [includeAccountContext, setIncludeAccountContext] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const response = await request<AkoResponse>("POST", "ako/chat", {
        message: text,
        history,
        includeAccountContext,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.answer,
          action: response.action,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Ako is unavailable right now. Please try again shortly.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function followAction(key: string) {
    const routes: Record<string, string> = {
      kyc: "/app/profile?kyc=true",
      wallet: "/app/funding",
      orders: "/app/orders",
      portfolio: "/app/portfolio",
      markets: "/app/markets",
    };
    const route = routes[key];
    if (route) router.push(route);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Card className="border-brand-orange/20 bg-brand-orange/5 p-4 text-sm text-muted-foreground">
        Ako provides general information, not personal investment advice. Don’t share passwords, PINs, Ghana Card numbers, bank details, or verification codes. Your message is processed by our AI provider; account summaries are shared only when you enable the option below.
      </Card>
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-brand-orange" />
            <h1 className="text-2xl font-semibold">How can Ako help?</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ask about account steps, order statuses, or investment concepts.</p>
            <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal py-3"
                  disabled={sending}
                  onClick={() => void sendMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm sm:max-w-[80%] ${message.role === "user" ? "bg-brand-orange text-white" : "bg-muted"}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.sources?.map((source, sourceIndex) => (
                <p key={`${source.key}-${sourceIndex}`} className="mt-2 text-xs opacity-75">
                  {source.label}{source.asOf ? ` · ${new Date(source.asOf).toLocaleString()}` : ""}
                </p>
              ))}
              {message.action && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => followAction(message.action!.key)}
                >
                  {message.action.label}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Ako is thinking…</div>}
      </div>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 accent-brand-orange"
          checked={includeAccountContext}
          disabled={sending}
          onChange={(event) => setIncludeAccountContext(event.target.checked)}
        />
        <span><span className="font-medium text-foreground">Use my account context.</span> Only the relevant, read-only summary is sent for account questions.</span>
      </label>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={1500}
          disabled={sending}
          placeholder="Ask Ako a question"
          aria-label="Ask Ako a question"
          className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        <Button type="submit" disabled={sending || !input.trim()} className="bg-brand-orange text-white hover:bg-brand-orange/90">
          <Send className="h-4 w-4" /><span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
