"use client";

import { useEffect, useState } from "react";
import {
  Key,
  PlusCircle,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { ApiKey } from "@/types";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedRawKey, setNewlyCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/v1/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create API key");
      }

      setNewlyCreatedRawKey(data.raw_key);
      setNewKeyName("");
      fetchKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Key creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      alert("Failed to revoke API key");
    }
  };

  const handleCopy = () => {
    if (!newlyCreatedRawKey) return;
    navigator.clipboard.writeText(newlyCreatedRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Key className="w-6 h-6 text-indigo-400" />
          <span>API Key Management</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Authenticate external systems and programmatic API requests. Keys are hashed with SHA-256 before storage.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* Raw Key Display Modal/Alert (Shown ONCE) */}
      {newlyCreatedRawKey && (
        <div className="p-6 rounded-xl bg-amber-950/40 border border-amber-800/80 space-y-4 shadow-xl">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-200">
                Copy Your New API Key Now
              </h3>
              <p className="text-xs text-amber-300/80">
                This is the <strong>only time</strong> the unhashed key will ever be displayed. Store it securely in your environment variables.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={newlyCreatedRawKey}
              className="flex-1 p-2.5 bg-slate-950 border border-amber-800/60 rounded-lg text-xs font-mono text-amber-300 select-all"
            />
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Key"}</span>
            </button>
            <button
              onClick={() => setNewlyCreatedRawKey(null)}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          Generate New API Key
        </h2>
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Production Webhook Runner, CLI Script, Staging AE..."
            className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{creating ? "Generating..." : "Generate Key"}</span>
          </button>
        </form>
      </div>

      {/* Keys Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Configured Keys ({keys.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
            No API keys created yet. Generate one above to access the REST API programmatically.
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Key Prefix</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-white">{k.name}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300">
                        {k.key_prefix}...
                      </td>
                      <td className="py-3 px-4">
                        {k.is_active ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Revoked</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {k.is_active && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-rose-400 hover:text-rose-300 font-medium text-xs px-2.5 py-1 rounded bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/60 transition"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
