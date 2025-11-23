"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Markets",
      href: "/markets",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
    {
      name: "Trade",
      href: "/trade",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      name: "Predictions",
      href: "/predictions",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/40 backdrop-blur-xl border-t border-white/10 shadow-lg">
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all duration-300 ${
              pathname === item.href
                ? "bg-linear-to-br from-cyan-500/20 to-blue-500/10 text-cyan-400 scale-105"
                : "text-zinc-500 hover:text-zinc-300 active:scale-95"
            }`}
          >
            <div
              className={`transition-transform ${
                pathname === item.href ? "scale-110" : ""
              }`}
            >
              {item.icon}
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide ${
                pathname === item.href ? "text-cyan-400" : ""
              }`}
            >
              {item.name}
            </span>
          </Link>
        ))}
      </div>
      {/* Bottom safe area for iOS */}
      <div className="h-safe-bottom bg-transparent"></div>
    </div>
  );
}

export function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const sidebarItems = [
    { name: "Portfolio", href: "/portfolio" },
    { name: "Discover", href: "/discover" },
    { name: "Contribute", href: "/contribute" },
    { name: "Create Token", href: "/admin/create-token" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 bg-[#0a0a0f] border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="text-lg font-bold">Menu</div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800">
            <Link
              href="/"
              className="block text-center text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
