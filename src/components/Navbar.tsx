"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Workflow,
  PlusCircle,
  Key,
  Webhook,
  BookOpen,
  LogOut,
  LogIn,
  Layers,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(data.authenticated))
      .catch(() => setIsAuthenticated(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: Layers },
    { label: "Create Workflow", href: "/workflows/new", icon: PlusCircle },
    { label: "API Keys", href: "/keys", icon: Key },
    { label: "Webhooks", href: "/webhooks", icon: Webhook },
    { label: "API Docs", href: "/docs", icon: BookOpen },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Workflow className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Workflow<span className="text-indigo-400">GenAI</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-indigo-400 border border-slate-700/60"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            {isAuthenticated === true ? (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-md bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900/60 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
