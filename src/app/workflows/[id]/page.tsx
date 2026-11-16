"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Trash2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Zap,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { Workflow, Run, StepResult, StepType } from "@/types";

export default function WorkflowDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const autoRun = searchParams.get("autoRun") === "true";

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Execution state
  const [inputText, setInputText] = useState("");
  const [executing, setExecuting] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);

  const fetchWorkflowAndRuns = useCallback(async () => {
    try {
      const [wfRes, runsRes] = await Promise.all([
        fetch(`/api/v1/workflows/${id}`),
        fetch(`/api/v1/runs?limit=20`),
      ]);

      if (!wfRes.ok) throw new Error("Workflow not found");
      const wfData = await wfRes.json();
      setWorkflow(wfData);

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        const related = (runsData.data || []).filter((r: Run) => r.workflow_id === id);
        setRuns(related);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkflowAndRuns();
  }, [fetchWorkflowAndRuns]);

  // Set default sample input when workflow is loaded
  useEffect(() => {
    if (workflow && !inputText) {
      if (workflow.name.toLowerCase().includes("support") || workflow.prompt.toLowerCase().includes("ticket")) {
        setInputText(
          "Customer: John Doe (Account #49281)\nMessage: My credit card was charged twice ($49.99 x 2) for order #98231 yesterday. This is totally unacceptable, please refund immediately or I will contact my bank!"
        );
      } else if (workflow.name.toLowerCase().includes("hr") || workflow.prompt.toLowerCase().includes("onboarding")) {
        setInputText(
          "New Hire: Alice Smith\nRole: Senior Frontend Engineer\nDepartment: Engineering\nManager: David Miller\nStart Date: Next Monday, Dec 1\nEquipment: MacBook Pro 16-inch M3 Max, 32GB RAM, standard keyboard and monitor."
        );
      } else if (workflow.name.toLowerCase().includes("meeting") || workflow.prompt.toLowerCase().includes("notes")) {
        setInputText(
          "Project Sync Meeting - Nov 16\nAttendees: Sarah, Alex, Brian\nDiscussion: Discussed Q4 API migration. Alex mentioned database indexes are completed. Sarah will finish frontend integration by Thursday. Brian agreed to conduct load testing and sign off by Friday 5 PM."
        );
      } else if (workflow.name.toLowerCase().includes("lead") || workflow.prompt.toLowerCase().includes("sales")) {
        setInputText(
          "Inbound Inquiry from Vertex Labs.\nContact: Mark Davis (VP Technology)\nEmployees: 350\nEstimated Budget: $65,000 / year\nNeed: Looking to automate ticket triage and customer notifications within 30 days."
        );
      } else {
        setInputText(
          "Process input data: Customer requested urgent account audit and email confirmation before end of day."
        );
      }
    }
  }, [workflow, inputText]);

  const handleExecute = async () => {
    if (!workflow) return;
    setExecuting(true);
    setError(null);
    setCurrentRun(null);

    try {
      // Execute run synchronously for immediate UI feedback and streaming display
      const res = await fetch(`/api/v1/workflows/${id}/run?sync=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text: inputText } }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Execution failed");
      }

      setCurrentRun(data);
      fetchWorkflowAndRuns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Run execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      const res = await fetch(`/api/v1/workflows/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      }
    } catch {
      alert("Failed to delete workflow");
    }
  };

  const getStepTypeColor = (type: StepType) => {
    switch (type) {
      case "classify":
        return "bg-purple-950/70 text-purple-300 border-purple-800/60";
      case "extract":
        return "bg-blue-950/70 text-blue-300 border-blue-800/60";
      case "summarize":
        return "bg-cyan-950/70 text-cyan-300 border-cyan-800/60";
      case "prioritize":
        return "bg-amber-950/70 text-amber-300 border-amber-800/60";
      case "decision":
        return "bg-orange-950/70 text-orange-300 border-orange-800/60";
      case "draft_email":
        return "bg-emerald-950/70 text-emerald-300 border-emerald-800/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Loading workflow definition...
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Workflow Not Found</h2>
        <p className="text-xs text-slate-400">{error || "Could not retrieve the requested workflow."}</p>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workflows</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>{workflow.name}</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            {workflow.description || workflow.prompt}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDelete}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 text-xs font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Workflow Steps Visualization */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Workflow Sequence ({workflow.steps.length} Steps)</span>
            </h2>
          </div>

          <div className="space-y-3">
            {workflow.steps.map((step, idx) => (
              <div
                key={step.id || idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white text-xs">{step.title}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getStepTypeColor(
                      step.type
                    )}`}
                  >
                    {step.type}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{step.instruction}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>in: {step.input_from}</span>
                  <span className="text-indigo-400 font-semibold">out: {step.output_key}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Execution Console & Live Progress */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Execution Console</span>
              </h2>
              <span className="text-xs text-slate-400">Gemini 2.5 Flash Engine</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Input Data Payload
              </label>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter input text or JSON to be processed through the workflow..."
                className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Payload size: {inputText.length} chars
              </span>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Steps...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Workflow</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Execution Results Inspector */}
          {currentRun && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">Execution Run Result</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      currentRun.status === "completed"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {currentRun.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {currentRun.id.slice(0, 8)}...
                </span>
              </div>

              {currentRun.error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
                  <strong>Error:</strong> {currentRun.error}
                </div>
              )}

              {/* Step By Step Results */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Step-by-Step Execution Traces
                </h4>
                {currentRun.step_results?.map((res: StepResult, i: number) => (
                  <div
                    key={res.step_id || i}
                    className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-white">{res.step_title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400">{res.duration_ms}ms</span>
                        {res.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    </div>

                    <div className="mt-2 bg-slate-900 p-2.5 rounded border border-slate-800/80 font-mono text-[11px] text-indigo-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {typeof res.output === "object"
                        ? JSON.stringify(res.output, null, 2)
                        : String(res.output)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Runs Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Workflow Run History ({runs.length})
            </h3>
            {runs.length === 0 ? (
              <p className="text-xs text-slate-400">No previous runs recorded for this workflow.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {runs.map((r) => (
                  <div
                    key={r.id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-400">{r.id.slice(0, 8)}...</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.status === "completed"
                            ? "text-emerald-400 bg-emerald-950/60"
                            : r.status === "failed"
                            ? "text-rose-400 bg-rose-950/60"
                            : "text-amber-400 bg-amber-950/60"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-slate-400">
                        {r.step_results?.length || 0} steps completed
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400">
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Link
                        href={`/runs/${r.id}`}
                        className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
