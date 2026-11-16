"use client";

import { useEffect, useState } from "react";
import {
  Webhook as WebhookIcon,
  PlusCircle,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Webhook, WebhookDelivery } from "@/types";

const ALL_EVENTS = [
  { id: "workflow.created", label: "workflow.created", desc: "Triggered when a new workflow is generated or saved" },
  { id: "run.started", label: "run.started", desc: "Triggered when a workflow execution run begins" },
  { id: "run.completed", label: "run.completed", desc: "Triggered when all steps finish successfully" },
  { id: "run.failed", label: "run.failed", desc: "Triggered if any step fails or times out" },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "run.completed",
    "run.failed",
  ]);
  const [registering, setRegistering] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test trigger state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/v1/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (selectedEvents.length === 0) {
      setError("Please select at least one webhook event.");
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: selectedEvents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to register webhook");
      }

      setCreatedSecret(data.secret);
      setUrl("");
      fetchWebhooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook destination?")) return;

    try {
      const res = await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch {
      alert("Failed to delete webhook");
    }
  };

  const handleSendTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/v1/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult({
        id,
        success: data.success,
        message: data.message || "Test event finished",
      });
      fetchWebhooks();
    } catch (err: unknown) {
      setTestResult({
        id,
        success: false,
        message: err instanceof Error ? err.message : "Test request failed",
      });
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <WebhookIcon className="w-6 h-6 text-indigo-400" />
          <span>Webhook Subscriptions</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Receive real-time HTTP POST notifications when workflows are created and execution runs change status.
          Requests are signed with HMAC-SHA256 (<code className="text-indigo-300 font-mono text-xs">X-Webhook-Signature</code>).
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* Secret Display on Registration */}
      {createdSecret && (
        <div className="p-6 rounded-xl bg-indigo-950/40 border border-indigo-800/80 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-indigo-200">
              Webhook Secret Key (Save Now)
            </h3>
          </div>
          <p className="text-xs text-indigo-300/80">
            Use this shared secret to verify the <code className="font-mono">X-Webhook-Signature</code> header in your endpoint.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={createdSecret}
              className="flex-1 p-2.5 bg-slate-950 border border-indigo-800/60 rounded-lg text-xs font-mono text-indigo-300 select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdSecret);
                setCopiedSecret(true);
                setTimeout(() => setCopiedSecret(false), 3000);
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
            >
              {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
            </button>
            <button
              onClick={() => setCreatedSecret(null)}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Register Webhook Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          Register New Webhook Endpoint
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Destination URL (HTTP / HTTPS)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-api.com/webhooks or http://localhost:4000/webhook"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Events to Subscribe
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_EVENTS.map((ev) => {
                const checked = selectedEvents.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    onClick={() => toggleEvent(ev.id)}
                    className={`cursor-pointer p-3 rounded-lg border text-xs flex items-start space-x-3 transition ${
                      checked
                        ? "bg-indigo-950/40 border-indigo-700/80 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-mono font-semibold text-indigo-300">{ev.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{ev.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={registering}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{registering ? "Registering..." : "Register Webhook"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Subscribed Webhooks List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Subscribed Webhooks ({webhooks.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
            Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
            No webhooks registered yet. Add a destination URL above to test automated notifications.
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-white break-all">
                        {wh.url}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleSendTest(wh.id)}
                      disabled={testingId === wh.id}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                    >
                      <Send className={`w-3.5 h-3.5 ${testingId === wh.id ? "animate-pulse" : ""}`} />
                      <span>{testingId === wh.id ? "Pinging..." : "Send Test Ping"}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/60 text-rose-400 transition"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {testResult && testResult.id === wh.id && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                      testResult.success
                        ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                        : "bg-rose-950/60 border border-rose-800 text-rose-300"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
