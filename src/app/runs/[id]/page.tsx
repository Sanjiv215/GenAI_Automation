"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Terminal,
  Activity,
} from "lucide-react";
import { Run, StepResult } from "@/types";

export default function RunInspectorPage() {
  const params = useParams();
  const id = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/runs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Run not found");
        return res.json();
      })
      .then((data) => setRun(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Loading run execution traces...
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Execution Run Not Found</h2>
        <p className="text-xs text-slate-400">{error || "Could not retrieve the run."}</p>
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

  const durationMs =
    run.started_at && run.finished_at
      ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            href={`/workflows/${run.workflow_id}`}
            className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workflow</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              Run: {run.id}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                run.status === "completed"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : run.status === "failed"
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : "bg-blue-950 text-blue-400 border border-blue-800"
              }`}
            >
              {run.status}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 space-y-1 md:text-right">
          <div>Created: {new Date(run.created_at).toLocaleString()}</div>
          {durationMs !== null && <div>Total Duration: {durationMs} ms</div>}
        </div>
      </div>

      {run.error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
          <strong className="block mb-1 text-rose-300">Run Failed with Error:</strong>
          <pre className="font-mono whitespace-pre-wrap">{run.error}</pre>
        </div>
      )}

      {/* Input Data Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Run Input Data</span>
        </h3>
        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(run.input, null, 2)}
        </pre>
      </div>

      {/* Step by Step Execution Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Step-by-Step Execution Sequence ({run.step_results?.length || 0})</span>
        </h3>

        <div className="space-y-4">
          {run.step_results?.map((res: StepResult, idx: number) => (
            <div
              key={res.step_id || idx}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-white text-xs">{res.step_title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                    {res.step_type}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span>{res.duration_ms}ms</span>
                  {res.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Step Output
                </label>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 whitespace-pre-wrap overflow-x-auto">
                  {typeof res.output === "object"
                    ? JSON.stringify(res.output, null, 2)
                    : String(res.output)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Consolidated Output */}
      {run.output && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Final Workflow Output Object</span>
          </h3>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
