"use client";

import { useState } from "react";

interface CreatePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePredictionModal({
  isOpen,
  onClose,
}: CreatePredictionModalProps) {
  const [predictionType, setPredictionType] = useState<"prediction" | "rating">(
    "prediction"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [anime, setAnime] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [rewardPool, setRewardPool] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement prediction creation logic
    console.log({
      predictionType,
      title,
      description,
      anime,
      options: predictionType === "prediction" ? options : null,
      rewardPool,
      endDate,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 100 }}
    >
      <div className="bg-[#0a0a0f] border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0f] border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Create {predictionType === "prediction" ? "Prediction" : "Rating"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPredictionType("prediction")}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  predictionType === "prediction"
                    ? "bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50"
                    : "bg-zinc-900 text-zinc-400 border-2 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                🎯 Prediction
              </button>
              <button
                type="button"
                onClick={() => setPredictionType("rating")}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  predictionType === "rating"
                    ? "bg-purple-500/20 text-purple-400 border-2 border-purple-500/50"
                    : "bg-zinc-900 text-zinc-400 border-2 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                ⭐ Rating
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                predictionType === "prediction"
                  ? "e.g., Will Luffy defeat Kaido?"
                  : "e.g., Rate the latest episode"
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about your prediction or rating..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 min-h-24 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Anime Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Anime/Manga <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={anime}
              onChange={(e) => setAnime(e.target.value)}
              placeholder="e.g., One Piece, Naruto, Demon Slayer"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Prediction Options */}
          {predictionType === "prediction" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Options <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-3 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Option
              </button>
            </div>
          )}

          {/* Reward Pool */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reward Pool (ODX) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={rewardPool}
              onChange={(e) => setRewardPool(e.target.value)}
              placeholder="e.g., 1000"
              min="0"
              step="1"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
              required
            />
            <p className="mt-2 text-xs text-zinc-500">
              Rewards will be distributed to users with accurate predictions
            </p>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 text-white"
              style={{ colorScheme: "dark" }}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              Create {predictionType === "prediction" ? "Prediction" : "Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
