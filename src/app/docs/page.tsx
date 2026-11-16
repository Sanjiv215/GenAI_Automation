"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

export default function DocsPage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamically inject Swagger UI assets
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css";
    document.head.appendChild(link);

    const scriptBundle = document.createElement("script");
    scriptBundle.src = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js";
    scriptBundle.async = true;

    const scriptPreset = document.createElement("script");
    scriptPreset.src = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js";
    scriptPreset.async = true;

    scriptBundle.onload = () => {
      scriptPreset.onload = () => {
        // @ts-expect-error SwaggerUIBundle is loaded on window
        if (window.SwaggerUIBundle) {
          // @ts-expect-error SwaggerUIBundle initialized
          window.SwaggerUIBundle({
            url: "/api/openapi.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            presets: [
              // @ts-expect-error SwaggerUIBundle presets
              window.SwaggerUIBundle.presets.apis,
              // @ts-expect-error SwaggerUIStandalonePreset
              window.SwaggerUIStandalonePreset,
            ],
            layout: "BaseLayout",
          });
          setLoaded(true);
        }
      };
      document.body.appendChild(scriptPreset);
    };
    document.body.appendChild(scriptBundle);

    return () => {
      try {
        document.head.removeChild(link);
        document.body.removeChild(scriptBundle);
        document.body.removeChild(scriptPreset);
      } catch {
        // cleanup safety
      }
    };
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>Interactive OpenAPI Documentation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Swagger UI rendering live API specification from <code className="text-indigo-300 font-mono">/api/openapi.json</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition"
          >
            <span>Raw openapi.json</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-2xl overflow-hidden min-h-[600px]">
        {!loaded && (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading Swagger UI documentation explorer...
          </div>
        )}
        <div id="swagger-ui" />
      </div>
    </div>
  );
}
