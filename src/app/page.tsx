"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Workflow as WorkflowIcon,
  Play,
  ArrowRight,
  PlusCircle,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Workflow, Run } from "@/types";

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [wfRes, runRes] = await Promise.all([
        fetch("/api/v1/workflows?limit=50"),
        fetch("/api/v1/runs?limit=10"),
      ]);

      if (wfRes.ok) {
        const wfData = await wfRes.json();
        setWorkflows(wfData.data || []);
      }
      if (runRes.ok) {
        const runData = await runRes.json();
        setRuns(runData.data || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Workflow Automation Hub</span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium">
              GenAI Engine
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Convert natural language instructions into multi-step automated workflows with Gemini 2.5 Flash.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/workflows/new"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Workflow</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Workflows</span>
            <WorkflowIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{workflows.length}</div>
          <div className="text-xs text-slate-400 mt-1">Configured processes</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Total Runs</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{runs.length}</div>
          <div className="text-xs text-slate-400 mt-1">Execution requests</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Successful Runs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{completedRuns}</div>
          <div className="text-xs text-slate-400 mt-1">Completed successfully</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Failed Runs</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{failedRuns}</div>
          <div className="text-xs text-slate-400 mt-1">Errors or timeouts</div>
        </div>
      </div>

      {/* Workflows Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white tracking-tight flex items-center space-x-2">
            <span>Active Workflows</span>
            <span className="text-xs text-slate-400 font-normal">({workflows.length})</span>
          </h2>
          <Link
            href="/workflows/new"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>Create new</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-400 text-sm">
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl space-y-3">
            <WorkflowIcon className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-medium text-slate-200">No workflows generated yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Use natural language or pick one of the 4 ready-to-use business templates to generate your first workflow.
            </p>
            <div className="pt-2">
              <Link
                href="/workflows/new"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Workflow</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm line-clamp-1">{wf.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-indigo-300 border border-slate-700/60 whitespace-nowrap">
                      {wf.steps?.length || 0} steps
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {wf.description || wf.prompt}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    {new Date(wf.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/workflows/${wf.id}?autoRun=true`}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white tracking-tight flex items-center space-x-2">
          <span>Recent Execution Runs</span>
          <span className="text-xs text-slate-400 font-normal">({runs.length})</span>
        </h2>

        {runs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
            No execution runs recorded yet. Run a workflow to view real-time traces and step metrics.
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Workflow</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Steps Completed</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {r.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <Link
                          href={`/workflows/${r.workflow_id}`}
                          className="hover:text-indigo-400 transition"
                        >
                          {r.workflow_id.slice(0, 12)}...
                        </Link>
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.step_results?.length || 0} step(s)
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/runs/${r.id}`}
                          className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
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
