"use client";

import { useWallet } from "@suiet/wallet-kit";
import { useState } from "react";
import Link from "next/link";
import { createIPToken } from "@/lib/utils/contract";
import { CustomSelect } from "@/components/ui/custom-select";

export default function CreateTokenPage() {
  const wallet = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    tokenId?: string;
  } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<number>(0); // 0=anime, 1=manga, 2=manhwa
  const [reservePoolSize, setReservePoolSize] = useState<number>(50000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.connected || !wallet.account?.address) {
      setResult({
        success: false,
        message: "Please connect your wallet first",
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const result = await createIPToken(
        {
          name,
          symbol,
          description,
          category,
          reservePoolSize,
        },
        wallet
      );

      setResult({
        success: true,
        message: `Token created successfully! Transaction: ${result.digest}`,
        tokenId: result.tokenId,
      });

      // Reset form
      setName("");
      setSymbol("");
      setDescription("");
      setCategory(0);
      setReservePoolSize(50000);
    } catch (error: any) {
      console.error("Failed to create token:", error);
      const errorMessage =
        error.message || "Failed to create token. Make sure you have AdminCap.";
      setResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-zinc-400 mb-6">
            Please connect your admin wallet to create IP tokens
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500 to-blue-600">
                <span className="text-xl font-bold">O</span>
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/marketplace"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Marketplace
              </Link>
              <div className="text-sm font-medium text-cyan-400">
                Admin: {wallet.account?.address.slice(0, 6)}...
                {wallet.account?.address.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Create IP Token
          </h1>
          <p className="text-zinc-400">
            Create a new IP token for an anime, manga, or manhwa.{" "}
            <strong>Admin only</strong> - requires AdminCap.
          </p>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              result.success
                ? "border-green-500/50 bg-green-500/10 text-green-400"
                : "border-red-500/50 bg-red-500/10 text-red-400"
            }`}
          >
            <div className="font-semibold mb-1">
              {result.success ? "Success!" : "Error"}
            </div>
            <div className="text-sm">{result.message}</div>
            {result.tokenId && (
              <div className="mt-2 text-sm">
                <strong>Token ID:</strong> {result.tokenId}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6"
        >
          {/* Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Token Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chainsaw Man"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Symbol */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Token Symbol <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., CSM"
              maxLength={10}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the IP (anime, manga, or manhwa)..."
              rows={4}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              value={String(category)}
              onChange={(value) => setCategory(Number(value))}
              options={[
                { value: "0", label: "Anime" },
                { value: "1", label: "Manga" },
                { value: "2", label: "Manhwa" },
              ]}
              className="w-full"
            />
          </div>

          {/* Reserve Pool Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Reserve Pool Size <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={reservePoolSize}
              onChange={(e) => setReservePoolSize(Number(e.target.value))}
              placeholder="50000"
              min={1}
              max={199999}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              Amount of tokens reserved for contributor rewards (must be &lt;
              200,000)
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Token..." : "Create IP Token"}
          </button>

          <p className="mt-4 text-xs text-zinc-500 text-center">
            This will create a transaction that requires your wallet signature.
            Make sure you have AdminCap.
          </p>
        </form>

        {/* Info Box */}
        <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
          <h3 className="font-semibold text-cyan-400 mb-2">
            About IP Token Creation
          </h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>• Only wallets with AdminCap can create IP tokens</li>
            <li>
              • The token will be registered on-chain and available for
              contributions
            </li>
            <li>• Reserve pool tokens are used to reward early contributors</li>
            <li>• Total supply is fixed at 200,000 tokens per IP</li>
            <li>
              • After creation, users can contribute engagement data for this IP
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
