"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface Post {
  id: string;
  author: string;
  authorAddress: string;
  content: string;
  mediaType: "image" | "video" | "text";
  mediaUrl?: string;
  likes: number;
  comments: number;
  timestamp: string;
  tags: string[];
}

export default function DiscoverPage() {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "images" | "videos" | "discussions"
  >("all");
  const [newPost, setNewPost] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Mock posts data
  const posts: Post[] = [
    {
      id: "1",
      author: "AnimeKing",
      authorAddress: "0x1234...5678",
      content: "Just discovered this amazing scene from Naruto! 🔥",
      mediaType: "image",
      mediaUrl:
        "https://i.etsystatic.com/23049683/r/il/9ac57d/7243100890/il_600x600.7243100890_k1oh.jpg",
      likes: 234,
      comments: 45,
      timestamp: "2 hours ago",
      tags: ["Naruto", "Epic", "Anime"],
    },
    {
      id: "2",
      author: "MangaFan2024",
      authorAddress: "0xabcd...efgh",
      content:
        "Thoughts on the latest One Piece chapter? That ending was insane!",
      mediaType: "text",
      likes: 128,
      comments: 67,
      timestamp: "4 hours ago",
      tags: ["OnePiece", "Manga", "Discussion"],
    },
    {
      id: "3",
      author: "OtakuLife",
      authorAddress: "0x9876...5432",
      content: "My top 10 anime moments compilation",
      mediaType: "video",
      mediaUrl:
        "https://i.etsystatic.com/17284209/r/il/05e52e/5432621207/il_600x600.5432621207_cnuf.jpg",
      likes: 567,
      comments: 89,
      timestamp: "6 hours ago",
      tags: ["Compilation", "TopTen", "Anime"],
    },
  ];

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "images") return post.mediaType === "image";
    if (activeFilter === "videos") return post.mediaType === "video";
    if (activeFilter === "discussions") return post.mediaType === "text";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
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
                className="text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
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
            <h1 className="text-4xl font-bold mb-2">Discover</h1>
            <p className="text-zinc-400">
              Share memes, videos, and engage with the community
            </p>
          </div>
          <button
            onClick={() => setShowCreatePost(!showCreatePost)}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            Create Post
          </button>
        </div>

        {/* Create Post Form */}
        {showCreatePost && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Create a New Post</h3>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts, memes, or content..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 min-h-32 focus:outline-none focus:border-cyan-500 resize-none"
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Upload Image"
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Upload Video"
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors">
                  Post to Walrus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          {[
            { key: "all", label: "All Posts" },
            { key: "images", label: "Images" },
            { key: "videos", label: "Videos" },
            { key: "discussions", label: "Discussions" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() =>
                setActiveFilter(
                  filter.key as "all" | "images" | "videos" | "discussions"
                )
              }
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
            >
              {/* Media */}
              {post.mediaUrl && (
                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                  <Image
                    src={post.mediaUrl}
                    alt={post.content}
                    fill
                    className="object-cover"
                  />
                  {post.mediaType === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <svg
                          className="w-8 h-8"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold">
                    {post.author[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{post.author}</div>
                    <div className="text-xs text-zinc-500">
                      {post.timestamp}
                    </div>
                  </div>
                </div>

                <p className="text-sm mb-3">{post.content}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-zinc-800 rounded-full text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <button className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
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
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {post.likes}
                  </button>
                  <button className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {post.comments}
                  </button>
                  <button className="ml-auto hover:text-cyan-400 transition-colors">
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
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
