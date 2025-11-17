"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { CreatePredictionModal } from "@/components/predictions/create-prediction-modal";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface Prediction {
  id: string;
  creator: string;
  type: "prediction" | "rating";
  title: string;
  description: string;
  anime: string;
  options?: { label: string; votes: number }[];
  rating?: number;
  totalVotes: number;
  endDate: string;
  status: "active" | "ended";
  reward: number;
}

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<
    "predictions" | "ratings" | "my-predictions"
  >("predictions");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock predictions data
  const predictions: Prediction[] = [
    {
      id: "1",
      creator: "AnimeExpert",
      type: "prediction",
      title: "Will Luffy defeat Kaido in the next 10 chapters?",
      description: "Predict the outcome of the epic battle!",
      anime: "One Piece",
      options: [
        { label: "Yes", votes: 1234 },
        { label: "No", votes: 567 },
        { label: "Draw", votes: 234 },
      ],
      totalVotes: 2035,
      endDate: "2025-11-30",
      status: "active",
      reward: 500,
    },
    {
      id: "2",
      creator: "MangaKing",
      type: "rating",
      title: "Rate the latest Demon Slayer episode",
      description: "How would you rate the animation and story?",
      anime: "Demon Slayer",
      rating: 4.7,
      totalVotes: 892,
      endDate: "2025-11-25",
      status: "active",
      reward: 300,
    },
    {
      id: "3",
      creator: "OtakuPro",
      type: "prediction",
      title: "Which anime will win Anime of the Year?",
      description: "Vote for your favorite!",
      anime: "Multiple",
      options: [
        { label: "Jujutsu Kaisen", votes: 2341 },
        { label: "Demon Slayer", votes: 1876 },
        { label: "Attack on Titan", votes: 1654 },
        { label: "One Piece", votes: 2109 },
      ],
      totalVotes: 7980,
      endDate: "2025-12-31",
      status: "active",
      reward: 1000,
    },
  ];

  const filteredPredictions = predictions.filter((p) => {
    if (activeTab === "predictions") return p.type === "prediction";
    if (activeTab === "ratings") return p.type === "rating";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <CreatePredictionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                <Image
                  src="/favicon.svg"
                  alt="ODX Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/markets"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Trade
              </Link>
              <Link
                href="/portfolio"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/discover"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Predictions
              </Link>
              <NavWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Predictions & Ratings</h1>
            <p className="text-zinc-400">
              Create predictions, rate anime, and earn rewards for accurate
              predictions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            Create Prediction
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-3 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("predictions")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "predictions"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Predictions
          </button>
          <button
            onClick={() => setActiveTab("ratings")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "ratings"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Ratings
          </button>
          <button
            onClick={() => setActiveTab("my-predictions")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "my-predictions"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            My Predictions
          </button>
        </div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPredictions.map((prediction) => (
            <div
              key={prediction.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          prediction.type === "prediction"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {prediction.type.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                        {prediction.anime}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          prediction.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {prediction.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {prediction.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-3">
                      {prediction.description}
                    </p>
                  </div>
                </div>

                {/* Prediction Options */}
                {prediction.type === "prediction" && prediction.options && (
                  <div className="space-y-3 mb-4">
                    {prediction.options.map((option, index) => {
                      const percentage =
                        (option.votes / prediction.totalVotes) * 100;
                      return (
                        <button key={index} className="w-full relative group">
                          <div className="flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-lg transition-colors">
                            <span className="relative z-10 font-medium">
                              {option.label}
                            </span>
                            <span className="relative z-10 text-sm text-zinc-400">
                              {option.votes} votes ({percentage.toFixed(1)}%)
                            </span>
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-cyan-500/10 rounded-lg transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Rating */}
                {prediction.type === "rating" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <div className="text-3xl font-bold text-cyan-400">
                        {prediction.rating}
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.floor(prediction.rating!)
                                  ? "text-cyan-400"
                                  : "text-zinc-700"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Based on {prediction.totalVotes} ratings
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors">
                        Rate Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-sm pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-4 text-zinc-500">
                    <span>By {prediction.creator}</span>
                    <span>•</span>
                    <span>
                      Ends {new Date(prediction.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400 font-medium">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {prediction.reward} ODX Reward
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeTab === "my-predictions" && filteredPredictions.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="text-4xl mb-4">🎯</div>
            <div className="text-zinc-400">No predictions yet</div>
            <div className="text-sm text-zinc-500 mt-2">
              Start making predictions to earn rewards!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
