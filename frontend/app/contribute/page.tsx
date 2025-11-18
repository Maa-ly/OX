"use client";

import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useZkLogin } from "@/lib/hooks/useZkLogin";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { signContribution, createContribution } from "@/lib/utils/signing";
import { storeContribution } from "@/lib/utils/walrus";
import { getIPTokens, type IPToken } from "@/lib/utils/api";
import { CustomSelect } from "@/components/ui/custom-select";
import { StarRating } from "@/components/ui/star-rating";
import { Header } from "@/components/shared/header";

type ContributionType = "rating" | "prediction" | "meme" | "review" | "stake";

function ContributeContent() {
  const { wallet, isConnected, address: walletAddress } = useWalletAuth();
  const { address: zkLoginAddress } = useZkLogin();
  const { isAuthenticated, address } = useAuthStore();
  const [tokens, setTokens] = useState<IPToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ContributionType>("rating");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Get current address
  const currentAddress = address || walletAddress || zkLoginAddress;

  // Form fields
  const [rating, setRating] = useState<number>(5);
  const [prediction, setPrediction] = useState("");
  const [review, setReview] = useState("");
  const [stake, setStake] = useState<number>(0);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      // Load tokens from backend API (real contract data)
      const data = await getIPTokens(true);
      setTokens(data);
      if (data.length > 0) {
        setSelectedToken(data[0].id);
      } else {
        // No tokens found - show message
        console.warn(
          "No IP tokens found. Admin needs to create tokens first at /admin/create-token"
        );
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
      // If API fails, tokens array will be empty and user will see no options
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !currentAddress || !selectedToken) return;

    setSubmitting(true);
    try {
      const token = tokens.find((t) => t.id === selectedToken);
      if (!token) return;

      // Create contribution object
      const contribution = createContribution({
        ip_token_id: selectedToken,
        engagement_type: selectedType,
        user_wallet: currentAddress,
        rating: selectedType === "rating" ? rating : undefined,
        prediction: selectedType === "prediction" ? prediction : undefined,
        review: selectedType === "review" ? review : undefined,
        stake: selectedType === "stake" ? stake : undefined,
      });

      // Sign contribution with wallet (if wallet connected, otherwise skip signing for zkLogin)
      let signature = '';
      if (wallet.connected && wallet.account) {
        signature = await signContribution(contribution, wallet);
      }

      // Add signature to contribution
      const signedContribution = {
        ...contribution,
        signature,
      };

      // Submit to backend API - this will store on Walrus
      const result = await storeContribution(signedContribution);

      // Reset form
      setRating(5);
      setPrediction("");
      setReview("");
      setStake(0);

      // Show success message with Walrus CID
      const walrusCid =
        result.contribution?.walrus_cid ||
        result.contribution?.walrus_blob_id ||
        result.contribution?.blobId ||
        "N/A";
      alert(
        `Contribution submitted successfully!\n\nWalrus Blob ID: ${walrusCid}\n\nYour contribution has been stored on Walrus decentralized storage and will be indexed by the oracle.`
      );
    } catch (error) {
      console.error("Failed to submit contribution:", error);
      alert("Failed to submit contribution. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated && !currentAddress) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p className="text-zinc-400 mb-6">
            Please connect your wallet or sign in to contribute
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Header 
        showWallet={true}
        showDashboard={true}
        showMarketplace={true}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Contribute to IP Tokens
          </h1>
          <p className="text-zinc-400">
            Share your engagement and help shape the value of your favorite IPs
          </p>
        </div>

        {/* Contribution Type Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            ["rating", "prediction", "review", "stake"] as ContributionType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                selectedType === type
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400"
                  : "bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6"
        >
          {/* IP Token Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select IP Token
            </label>
            {loading ? (
              <div className="text-zinc-400">Loading tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-yellow-400 text-sm">
                  No IP tokens found. An admin needs to create tokens first.
                </p>
                <Link
                  href="/admin/create-token"
                  className="mt-2 inline-block text-sm text-cyan-400 hover:text-cyan-300 underline"
                >
                  Create IP Token (Admin Only)
                </Link>
              </div>
            ) : (
              <CustomSelect
                value={selectedToken}
                onChange={(value) => setSelectedToken(value)}
                options={tokens.map((token) => ({
                  value: token.id,
                  label: `${token.name} (${token.symbol})`,
                }))}
                placeholder="Select a token"
                className="w-full"
              />
            )}
          </div>

          {/* Rating Form */}
          {selectedType === "rating" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-4">
                Rating (1-10)
              </label>
              <StarRating
                value={rating}
                onChange={setRating}
                maxStars={10}
              />
            </div>
          )}

          {/* Prediction Form */}
          {selectedType === "prediction" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Your Prediction
              </label>
              <textarea
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                placeholder="e.g., Will reach top 3 in popularity next week"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                rows={3}
                required
              />
            </div>
          )}

          {/* Review Form */}
          {selectedType === "review" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Your Review
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts about this IP..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                rows={5}
                required
              />
            </div>
          )}

          {/* Stake Form */}
          {selectedType === "stake" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Stake Amount (SUI)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                placeholder="0.0"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !selectedToken}
            className="w-full rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Contribution"}
          </button>

          <p className="mt-4 text-xs text-zinc-500 text-center">
            Your contribution will be signed with your wallet and stored on
            Walrus decentralized storage
          </p>
        </form>
      </div>
    </div>
  );
}

export default function Contribute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
            <p className="mt-4 text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ContributeContent />
    </Suspense>
  );
}
