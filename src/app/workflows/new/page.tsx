"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  Layers,
  ArrowRight,
  Code,
  LayoutList,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Zap,
} from "lucide-react";
import { WORKFLOW_TEMPLATES, TemplateDefinition } from "@/lib/constants";
import { WorkflowStep, StepType } from "@/types";

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const handleApplyTemplate = (tpl: TemplateDefinition) => {
    setPrompt(tpl.prompt);
    setName(tpl.name);
    setDescription(tpl.description);
    setSteps(tpl.steps);
    setJsonText(JSON.stringify(tpl.steps, null, 2));
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe your business process in the prompt box.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, save: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to generate workflow with Gemini");
      }

      setName(data.name || "Generated Workflow");
      setDescription(data.description || "");
      setSteps(data.steps || []);
      setJsonText(JSON.stringify(data.steps || [], null, 2));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        setSteps(parsed);
        setError(null);
      }
    } catch {
      // Allow user to finish typing invalid JSON before showing error
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please specify a workflow name.");
      return;
    }
    if (steps.length === 0) {
      setError("Workflow must contain at least one step.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          prompt: prompt || name,
          steps,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save workflow");
      }

      router.push(`/workflows/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <span>Create Business Process Workflow</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Describe your business logic in plain language or select an industry template.
          Gemini will synthesize it into executable structured steps.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Template Picker */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Or Pick a Ready-to-Use Template (1-Click)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="text-left p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-xs mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{tpl.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-300">
                <span>{tpl.steps.length} steps</span>
                <span className="font-medium text-xs">&rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Plain Language Prompt Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Describe the Business Process in Plain English
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. When a customer emails a complaint, classify its category and sentiment, assess urgency priority, extract customer order details, draft an empathetic response email, and decide if it needs manager escalation..."
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Allowed step types: classify, summarize, extract, draft_email, prioritize, decision, transform</span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? "Synthesizing with Gemini..." : "Generate Workflow"}</span>
          </button>
        </div>
      </div>

      {/* Generated Steps & Preview */}
      {steps.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workflow Name..."
                className="w-full text-lg font-bold bg-transparent text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition py-1"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workflow Description..."
                className="w-full text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition py-0.5"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setJsonMode(false)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium ${
                    !jsonMode
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJsonMode(true)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium ${
                    jsonMode
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Workflow"}</span>
              </button>
            </div>
          </div>

          {/* Cards View */}
          {!jsonMode ? (
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-sm">
                          {step.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getStepTypeColor(
                            step.type
                          )}`}
                        >
                          {step.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{step.instruction}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                        <span>
                          Input: <code className="text-slate-400">{step.input_from}</code>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Output key:{" "}
                          <code className="text-indigo-300 font-mono">
                            {step.output_key}
                          </code>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Editable Workflow Steps JSON
              </label>
              <textarea
                rows={12}
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
