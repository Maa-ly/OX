"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { getIPTokens, type IPToken } from "@/lib/utils/api";
import { storePost, getPosts, likePost, commentOnPost, type Post } from "@/lib/utils/walrus";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useZkLogin } from "@/lib/hooks/useZkLogin";
import { useAuthStore } from "@/lib/stores/auth-store";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

export default function DiscoverPage() {
  const { wallet, isConnected, address: walletAddress } = useWalletAuth();
  const { address: zkLoginAddress } = useZkLogin();
  const { isAuthenticated, address } = useAuthStore();
  const currentAddress = address || walletAddress || zkLoginAddress;

  const [activeFilter, setActiveFilter] = useState<
    "all" | "images" | "videos" | "discussions"
  >("all");
  const [newPost, setNewPost] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [commentingPosts, setCommentingPosts] = useState<Set<string>>(new Set());
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // Post creation state
  const [selectedIPTokens, setSelectedIPTokens] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("text");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [tokens, setTokens] = useState<IPToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load IP tokens and posts
  useEffect(() => {
    loadTokens();
    loadPosts();
  }, []);

  // Real-time updates: Poll for new posts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts(true); // Silent update
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadPosts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Map filter to mediaType
      let mediaType: 'image' | 'video' | 'text' | undefined;
      if (activeFilter === 'images') mediaType = 'image';
      else if (activeFilter === 'videos') mediaType = 'video';
      else if (activeFilter === 'discussions') mediaType = 'text';
      
      const result = await getPosts({
        mediaType: mediaType,
      });
      setPosts(result.posts.map(post => ({
        ...post,
        timestamp: typeof post.timestamp === 'number' 
          ? formatTimestamp(post.timestamp) 
          : post.timestamp,
      })));
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadTokens = async () => {
    setLoadingTokens(true);
    try {
      const data = await getIPTokens(true);
      setTokens(data);
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setMediaType("image");
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select an image or video file");
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType("text");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleIPTokenToggle = (tokenId: string) => {
    setSelectedIPTokens((prev) =>
      prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const handleSubmitPost = async () => {
    if (!newPost.trim()) {
      alert("Please enter some content");
      return;
    }

    if (selectedIPTokens.length === 0) {
      alert("Please select at least one IP token this post is about");
      return;
    }

    if (!currentAddress) {
      alert("Please connect your wallet to create a post");
      return;
    }

    setSubmitting(true);
    try {
      // Create post object
      const postData = {
        content: newPost,
        mediaType: mediaType,
        ipTokenIds: selectedIPTokens,
        author: currentAddress.slice(0, 6) + "..." + currentAddress.slice(-4),
        authorAddress: currentAddress,
        timestamp: Date.now(),
        tags: [], // Can be extracted from content or added later
      };

      // Store post on Walrus (with media file if present)
      const result = await storePost(postData, mediaFile || undefined);

      // Reload posts to get the latest
      await loadPosts();

      // Reset form
      setNewPost("");
      setSelectedIPTokens([]);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType("text");
      setShowCreatePost(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert("Post created successfully! Stored on Walrus.");
    } catch (error) {
      console.error("Failed to create post:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async (post: Post) => {
    if (!currentAddress) {
      alert("Please connect your wallet to like posts");
      return;
    }

    if (likingPosts.has(post.blobId)) return; // Prevent double-clicking

    setLikingPosts((prev) => new Set(prev).add(post.blobId));

    try {
      const result = await likePost(post.blobId, currentAddress);
      
      // Update post in local state
      setPosts((prev) =>
        prev.map((p) =>
          p.blobId === post.blobId
            ? { ...p, likes: result.likes }
            : p
        )
      );
    } catch (error) {
      console.error("Failed to like post:", error);
      alert("Failed to like post. Please try again.");
    } finally {
      setLikingPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(post.blobId);
        return newSet;
      });
    }
  };

  const handleCommentPost = async (post: Post) => {
    if (!currentAddress) {
      alert("Please connect your wallet to comment");
      return;
    }

    if (!commentText.trim()) {
      alert("Please enter a comment");
      return;
    }

    if (commentingPosts.has(post.blobId)) return;

    setCommentingPosts((prev) => new Set(prev).add(post.blobId));

    try {
      const result = await commentOnPost(
        post.blobId,
        currentAddress,
        commentText,
        currentAddress.slice(0, 6) + "..." + currentAddress.slice(-4)
      );

      // Update post in local state
      setPosts((prev) =>
        prev.map((p) =>
          p.blobId === post.blobId
            ? { ...p, comments: result.comments }
            : p
        )
      );

      setCommentText("");
      setShowCommentModal(null);
    } catch (error) {
      console.error("Failed to comment on post:", error);
      alert("Failed to comment. Please try again.");
    } finally {
      setCommentingPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(post.blobId);
        return newSet;
      });
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "images") return post.mediaType === "image";
    if (activeFilter === "videos") return post.mediaType === "video";
    if (activeFilter === "discussions") return post.mediaType === "text";
    return true;
  });

  const formatTimestamp = (timestamp: string | number) => {
    if (typeof timestamp === "number") {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return "Just now";
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    return timestamp;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Open menu"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
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
                <div className="hidden sm:block">
                  <div className="text-lg font-bold tracking-tight">ODX</div>
                  <div className="text-xs text-zinc-400">
                    Otaku Data Exchange
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/markets"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Trade
              </Link>
              <Link
                href="/portfolio"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/discover"
                className="hidden md:block text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
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
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Discover</h1>
            <p className="text-zinc-400">
              Share memes, videos, and engage with the community
            </p>
          </div>
          <button
            onClick={() => setShowCreatePost(!showCreatePost)}
            className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            Create Post
          </button>
        </div>

        {/* Create Post Form */}
        {showCreatePost && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Create a New Post</h3>
            
            {/* IP Token Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Select IP Tokens (required) - This post is about:
              </label>
              {loadingTokens ? (
                <div className="text-zinc-400 text-sm">Loading tokens...</div>
              ) : tokens.length === 0 ? (
                <div className="text-yellow-400 text-sm">
                  No IP tokens available. Please create tokens first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-700">
                  {tokens.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => handleIPTokenToggle(token.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedIPTokens.includes(token.id)
                          ? "bg-cyan-500 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {token.name} ({token.symbol})
                    </button>
                  ))}
                </div>
              )}
              {selectedIPTokens.length > 0 && (
                <div className="mt-2 text-xs text-zinc-400">
                  Selected: {selectedIPTokens.length} token(s)
                </div>
              )}
            </div>

            {/* Content Textarea */}
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts, memes, or content..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 min-h-32 focus:outline-none focus:border-cyan-500 resize-none"
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="mt-4 relative">
                {mediaType === "image" ? (
                  <Image
                    src={mediaPreview}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="max-w-full h-auto rounded-lg"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="max-w-full h-auto rounded-lg"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Upload Image or Video"
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
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePost(false);
                    setNewPost("");
                    setSelectedIPTokens([]);
                    setMediaFile(null);
                    setMediaPreview(null);
                    setMediaType("text");
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPost}
                  disabled={submitting || !newPost.trim() || selectedIPTokens.length === 0}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {submitting ? "Posting..." : "Post to Walrus"}
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
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            No posts yet. Be the first to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const postTokens = tokens.filter((t) =>
                post.ipTokenIds?.includes(t.id)
              );
              return (
                <div
                  key={post.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
                >
                  {/* Media */}
                  {(post.mediaUrl || post.mediaBlobId) && (
                    <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                      {post.mediaType === "image" ? (
                        <Image
                          src={post.mediaBlobId 
                            ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/walrus/read/${post.mediaBlobId}?format=raw`
                            : post.mediaUrl || ''
                          }
                          alt={post.content}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <video
                          src={post.mediaBlobId 
                            ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/walrus/read/${post.mediaBlobId}?format=raw`
                            : post.mediaUrl || ''
                          }
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold">
                        {post.author[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{post.author}</div>
                        <div className="text-xs text-zinc-500">
                          {formatTimestamp(post.timestamp)}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm mb-3">{post.content}</p>

                    {/* IP Tokens */}
                    {postTokens.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-zinc-400 mb-1">About:</div>
                        <div className="flex flex-wrap gap-1">
                          {postTokens.map((token) => (
                            <span
                              key={token.id}
                              className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30"
                            >
                              {token.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
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
                    )}

                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <button
                        onClick={() => handleLikePost(post)}
                        disabled={likingPosts.has(post.blobId) || !currentAddress}
                        className="flex items-center gap-1 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        {post.likes || 0}
                      </button>
                      <button
                        onClick={() => setShowCommentModal(post.blobId)}
                        disabled={commentingPosts.has(post.blobId) || !currentAddress}
                        className="flex items-center gap-1 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        {post.comments || 0}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add a Comment</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 min-h-24 focus:outline-none focus:border-cyan-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCommentModal(null);
                  setCommentText("");
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const post = posts.find((p) => p.blobId === showCommentModal);
                  if (post) handleCommentPost(post);
                }}
                disabled={!commentText.trim() || commentingPosts.has(showCommentModal || "")}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {commentingPosts.has(showCommentModal || "") ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <MobileBottomNav />
    </div>
  );
}
