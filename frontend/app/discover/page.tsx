"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { getIPTokens, type IPToken } from "@/lib/utils/api";
import { storePost, getPosts, getPostsByAddress, likePost, commentOnPost, type Post } from "@/lib/utils/walrus";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useZkLogin } from "@/lib/hooks/useZkLogin";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ErrorModal, SuccessModal } from "@/components/shared/modal";
import { getUserProfile, getDisplayName, getProfilesForAddresses, type UserProfile } from "@/lib/utils/user-profile";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

function DiscoverPageContent() {
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

  // Multi-step Walrus flow state (for separate user interactions)
  const [postFlow, setPostFlow] = useState<any>(null);
  const [mediaFlow, setMediaFlow] = useState<any>(null);
  const [postFlowStep, setPostFlowStep] = useState<'idle' | 'encoded' | 'registered' | 'uploaded' | 'certified' | 'complete'>('idle');
  const [mediaFlowStep, setMediaFlowStep] = useState<'idle' | 'encoded' | 'registered' | 'uploaded' | 'certified' | 'complete'>('idle');
  const [registering, setRegistering] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [mediaRegistering, setMediaRegistering] = useState(false);
  const [mediaCertifying, setMediaCertifying] = useState(false);
  
  // Modal states
  const [errorModal, setErrorModal] = useState<{ 
    open: boolean; 
    message: string; 
    details?: string;
  }>({
    open: false,
    message: '',
  });
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  

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
      
      console.log('[loadPosts] Fetching posts...', { mediaType, limit: 1000, walletAddress });
      
      // Fetch all blobs from the contract
      let contractBlobs: Array<{ blobId: string; text: string | null; timestamp: number }> = [];
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE}/api/contract/blobs`);
        if (response.ok) {
          const data = await response.json();
          contractBlobs = data.blobs || [];
          console.log('[loadPosts] Fetched blobs from contract:', contractBlobs.length);
        } else {
          console.warn('[loadPosts] Failed to fetch blobs from contract:', response.statusText);
        }
      } catch (error) {
        console.warn('[loadPosts] Error fetching blobs from contract:', error);
      }
      
      // Process contract blobs - use blobId to create Walrus aggregator URL (like test user)
      const postsFromStorage: Post[] = [];
      const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
      
      for (const contractBlob of contractBlobs) {
        try {
          // Create the blob URL using the blobId (same pattern as test user)
          // Browser will handle content type sniffing (image, video, text, etc.)
          const blobUrl = `${aggregatorUrl}/v1/blobs/${contractBlob.blobId}`;
          
          // New strategy: 
          // - If contract has text: blobId is media (image/video), text is caption
          // - If contract has no text: blobId might be text-only post, fetch and check
          let postData: any = {};
          let isMediaPost = false;
          
          if (contractBlob.text) {
            // Contract has text → blobId is media, text is caption
            isMediaPost = true;
            postData.mediaUrl = blobUrl;
            postData.mediaType = 'image'; // Browser will handle content type (image/video)
            console.log(`[loadPosts] Contract blob ${contractBlob.blobId} has text, treating as media post with caption`);
          } else {
            // No text from contract → might be text-only post, try to fetch
            try {
              const { readBlobFromWalrus } = await import('@/lib/utils/walrus');
              const blobData = await readBlobFromWalrus(contractBlob.blobId, false);
              
              // Check if it's JSON post data (legacy format)
              if (typeof blobData === 'object' && blobData !== null && blobData.content) {
                // Check if content is binary/image data BEFORE trying to parse
                const contentStr = typeof blobData.content === 'string' ? blobData.content : String(blobData.content);
                const isBinaryImage = contentStr.startsWith('RIFF') || 
                                      contentStr.startsWith('\x89PNG') || 
                                      contentStr.startsWith('GIF') || 
                                      contentStr.startsWith('ÿØÿà') ||
                                      contentStr.startsWith('\xFF\xD8\xFF') ||
                                      contentStr.includes('\x00') || // Null bytes indicate binary
                                      (contentStr.length > 100 && contentStr.match(/[^\x20-\x7E\n\r\t]/)); // Non-printable chars
                
                if (isBinaryImage) {
                  // It's binary image data - treat as media
                  isMediaPost = true;
                  postData.mediaUrl = blobUrl;
                  postData.mediaType = 'image';
                  postData.content = ''; // Don't set binary data as content
                  console.log(`[loadPosts] Detected binary image data in blob ${contractBlob.blobId}`);
                } else {
                  // Try to parse as JSON
                  try {
                    postData = JSON.parse(contentStr);
                    // If JSON post has a mediaBlobId, use that for the media URL
                    if (postData.mediaBlobId) {
                      postData.mediaUrl = `${aggregatorUrl}/v1/blobs/${postData.mediaBlobId}`;
                      postData.mediaType = postData.mediaType || 'image';
                      isMediaPost = true;
                    } else {
                      // Text-only JSON post
                      postData.content = postData.content || '';
                    }
                  } catch {
                    // Not JSON - use as plain text (but only if it's not binary)
                    postData.content = contentStr;
                  }
                }
              } else if (typeof blobData === 'object' && blobData !== null) {
                // Already parsed JSON
                postData = blobData;
                if (postData.mediaBlobId) {
                  postData.mediaUrl = `${aggregatorUrl}/v1/blobs/${postData.mediaBlobId}`;
                  postData.mediaType = postData.mediaType || 'image';
                  isMediaPost = true;
                }
              } else {
                // Plain text - check if it's binary first
                const dataStr = String(blobData);
                const isBinaryImage = dataStr.startsWith('RIFF') || 
                                      dataStr.startsWith('\x89PNG') || 
                                      dataStr.startsWith('GIF') || 
                                      dataStr.startsWith('ÿØÿà') ||
                                      dataStr.startsWith('\xFF\xD8\xFF') ||
                                      dataStr.includes('\x00') ||
                                      (dataStr.length > 100 && dataStr.match(/[^\x20-\x7E\n\r\t]/));
                
                if (isBinaryImage) {
                  // It's binary - treat as media
                  isMediaPost = true;
                  postData.mediaUrl = blobUrl;
                  postData.mediaType = 'image';
                  postData.content = ''; // Don't set binary data as content
                } else {
                  postData.content = dataStr;
                }
              }
            } catch (fetchError) {
              // If we can't fetch, assume it's media (browser will handle it)
              console.log(`[loadPosts] Could not fetch blob ${contractBlob.blobId}, assuming media`);
              isMediaPost = true;
              postData.mediaUrl = blobUrl;
              postData.mediaType = 'image';
            }
          }
          
          // Create post object
          // Priority: contract text > postData content > empty
          // Make sure we never set binary data as content
          let finalContent = contractBlob.text || postData.content || '';
          
          // Double-check: if content looks like binary data, clear it
          if (finalContent && typeof finalContent === 'string' && finalContent.length > 0) {
            const mightBeBinary = finalContent.includes('\x00') || 
                                  (finalContent.length > 100 && finalContent.match(/[^\x20-\x7E\n\r\t]/));
            if (mightBeBinary && !contractBlob.text) {
              // Only clear if it's not from contract (contract text is safe)
              console.warn(`[loadPosts] Detected potential binary data in content for blob ${contractBlob.blobId}, clearing it`);
              finalContent = '';
            }
          }
          
          const post: Post = {
            id: contractBlob.blobId,
            blobId: contractBlob.blobId,
            author: postData.author || 'Unknown',
            authorAddress: postData.authorAddress || '0x0000000000000000000000000000000000000000',
            content: finalContent,
            mediaUrl: postData.mediaUrl,
            mediaBlobId: postData.mediaBlobId || postData.media_blob_id,
            mediaType: postData.mediaType || postData.media_type || (isMediaPost ? 'image' : undefined),
            timestamp: contractBlob.timestamp || postData.timestamp || Date.now(),
            ipTokenIds: postData.ipTokenIds || [],
            likes: postData.likes || 0,
            comments: postData.comments || 0,
            tags: postData.tags || [],
          };
          
          // Always show the post if we have content or media
          if (post.content || post.mediaUrl) {
            postsFromStorage.push(post);
            console.log(`[loadPosts] Added post from contract blob ${contractBlob.blobId}:`, {
              hasText: !!post.content,
              hasMedia: !!post.mediaUrl,
              mediaType: post.mediaType,
              isMediaPost,
            });
          }
        } catch (error) {
          console.warn(`[loadPosts] Failed to process contract blob ${contractBlob.blobId}:`, error);
        }
      }
      
      console.log('[loadPosts] Posts from contract:', postsFromStorage.length);
      
      // Fetch post metadata (likes/comments) for each post from Walrus
      // This ensures we have the latest engagement data
      const postsWithMetadata = await Promise.all(
        postsFromStorage.map(async (post) => {
          try {
            // Try to fetch the full post data from Walrus to get likes/comments
            const { readBlobFromWalrus } = await import('@/lib/utils/walrus');
            const blobData = await readBlobFromWalrus(post.blobId, false);
            
            if (typeof blobData === 'object' && blobData !== null) {
              // Update likes/comments from Walrus data if available
              if (typeof blobData.likes === 'number') {
                post.likes = blobData.likes;
              }
              if (typeof blobData.comments === 'number') {
                post.comments = blobData.comments;
              }
            }
          } catch (error) {
            // If we can't fetch metadata, keep the default values (0)
            console.log(`[loadPosts] Could not fetch metadata for post ${post.blobId}, using defaults`);
          }
          return post;
        })
      );
      
      // Replace posts with metadata-enriched posts
      postsFromStorage.length = 0;
      postsFromStorage.push(...postsWithMetadata);
      
      let result;
      
      // If wallet is connected, try to get posts by address first (more reliable)
      if (walletAddress) {
        try {
          console.log('[loadPosts] Fetching posts by wallet address:', walletAddress);
          result = await getPostsByAddress(walletAddress);
          console.log('[loadPosts] Posts fetched by address:', { 
            total: result.total, 
            postsCount: result.posts.length,
          });
          
          // Merge with posts from storage (avoid duplicates)
          const existingIds = new Set(result.posts.map(p => p.blobId || p.id));
          const newPosts = postsFromStorage.filter(p => !existingIds.has(p.blobId || p.id));
          result.posts = [...result.posts, ...newPosts];
          result.total = result.posts.length;
          
          // If we got posts, filter by mediaType if needed
          if (result.posts.length > 0 && mediaType) {
            result.posts = result.posts.filter(p => p.mediaType === mediaType);
            result.total = result.posts.length;
          }
        } catch (addressError) {
          console.warn('[loadPosts] Failed to fetch by address, using stored blob IDs:', addressError);
          // Use posts from storage
          result = {
            posts: postsFromStorage,
            total: postsFromStorage.length,
          };
          
          // Filter by mediaType if needed
          if (mediaType) {
            result.posts = result.posts.filter(p => p.mediaType === mediaType);
            result.total = result.posts.length;
          }
        }
      } else {
        // No wallet connected, use stored blob IDs
        result = {
          posts: postsFromStorage,
          total: postsFromStorage.length,
        };
        
        // Filter by mediaType if needed
        if (mediaType) {
          result.posts = result.posts.filter(p => p.mediaType === mediaType);
          result.total = result.posts.length;
        }
      }
      
      console.log('[loadPosts] Posts fetched:', { 
        total: result.total, 
        postsCount: result.posts.length,
        posts: result.posts.map(p => ({ id: p.id, blobId: p.blobId, content: p.content?.substring(0, 50) }))
      });
      
      // Fetch user profiles for all post authors
      const authorAddresses = new Set<string>();
      result.posts.forEach(post => {
        if (post.authorAddress && post.authorAddress !== '0x0000000000000000000000000000000000000000') {
          authorAddresses.add(post.authorAddress);
        }
      });
      
      console.log('[loadPosts] Fetching profiles for', authorAddresses.size, 'authors');
      const profiles = await getProfilesForAddresses(Array.from(authorAddresses));
      
      // Update posts with profile information
      result.posts = result.posts.map(post => {
        const profile = profiles.get(post.authorAddress || '');
        if (profile) {
          // Use username if available, otherwise use formatted address
          const displayName = getDisplayName(profile, post.authorAddress || '');
          return {
            ...post,
            author: displayName,
            // Store profile for later use in display
            profile: profile,
          };
        }
        return post;
      });
      
      // HARDCODED TEST: Try to fetch a specific blob ID for testing
      const testBlobId = 'M6goiHCUvhG6ExVffW69jhxVbFMBFZix4iFIA3alaag';
      try {
        console.log('[loadPosts] Testing hardcoded blob ID:', testBlobId);
        const { readBlobFromWalrus } = await import('@/lib/utils/walrus');
        const testBlobData = await readBlobFromWalrus(testBlobId, false);
        console.log('[loadPosts] Hardcoded blob fetched successfully:', testBlobData);
        
        // Parse the blob data if it's JSON
        let testPost: any = null;
        if (typeof testBlobData === 'object' && testBlobData !== null) {
          if (testBlobData.content && typeof testBlobData.content === 'string') {
            // Check if content is binary/image data (starts with RIFF, PNG, etc.)
            const contentStr = testBlobData.content;
            if (contentStr.startsWith('RIFF') || contentStr.startsWith('\x89PNG') || contentStr.startsWith('GIF') || contentStr.startsWith('ÿØÿà')) {
              // It's binary image data - create a post object with image URL
              const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
              const imageUrl = `${aggregatorUrl}/v1/blobs/${testBlobId}`;
              testPost = {
                content: '',
                mediaUrl: imageUrl,
                mediaType: 'image',
                author: 'Test User',
                authorAddress: '0x0000000000000000000000000000000000000000',
                timestamp: Date.now(),
              };
            } else {
              // Try to parse as JSON
              try {
                testPost = JSON.parse(testBlobData.content);
              } catch {
                testPost = { content: testBlobData.content };
              }
            }
          } else {
            testPost = testBlobData;
          }
        } else {
          testPost = { content: testBlobData };
        }
        
        // Ensure required fields exist
        if (testPost) {
          const formattedTestPost = {
            id: testBlobId,
            blobId: testBlobId,
            author: testPost.author || 'Unknown',
            authorAddress: testPost.authorAddress || '0x0000000000000000000000000000000000000000',
            content: testPost.content || '',
            mediaUrl: testPost.mediaUrl || testPost.media_url,
            mediaType: testPost.mediaType || testPost.media_type || 'image',
            timestamp: testPost.timestamp || Date.now(),
            ...testPost,
          };
          result.posts.unshift(formattedTestPost); // Add to beginning
          result.total += 1;
          console.log('[loadPosts] Added hardcoded test post:', formattedTestPost);
        }
      } catch (testError) {
        console.error('[loadPosts] Failed to fetch hardcoded blob:', testError);
      }
      
      setPosts(result.posts.map(post => ({
        ...post,
        timestamp: typeof post.timestamp === 'number' 
          ? formatTimestamp(post.timestamp) 
          : post.timestamp,
      })));
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error("[loadPosts] Failed to load posts:", error);
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
      setErrorModal({ open: true, message: "Please select an image or video file" });
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

  // Step 1: Initialize and encode the post (called when user clicks "Create Post")
  const handleSubmitPost = async () => {
    if (!newPost.trim()) {
      setErrorModal({ open: true, message: 'Please enter some content' });
      return;
    }

    if (selectedIPTokens.length === 0) {
      setErrorModal({ open: true, message: 'Please select at least one IP token this post is about' });
      return;
    }

    if (!currentAddress) {
      setErrorModal({ open: true, message: 'Please connect your wallet to create a post' });
      return;
    }

    // Check if we have a connection (either wallet-kit or zkLogin)
    if (!isConnected && !zkLoginAddress) {
      setErrorModal({ open: true, message: 'Please connect your wallet to post' });
      return;
    }

    // For wallet transactions, we need the wallet object
    // If using zkLogin, we don't need wallet.connected, but for wallet transactions we do
    // Check this when we actually need to execute the transaction
    if (!zkLoginAddress && (!wallet || !wallet.connected)) {
      // Wallet-kit might not have reconnected yet, but store has connection
      // Try to proceed - the transaction will fail with a better error if wallet isn't ready
      console.warn('[handleSubmitPost] Wallet-kit not connected but store has connection. Proceeding - transaction may fail if wallet not ready.');
    }


    setSubmitting(true);
    try {
      // Use HTTP API method (bypasses coin selection issues)
      // This method uploads directly to Walrus without requiring transaction building
      const { storeBlobWithHttpApi } = await import('@/lib/utils/walrus-sdk');

      let blobId: string;
      let finalMediaBlobId: string | null = null;

      // Strategy: 
      // - If there's media: Store ONLY the media on Walrus, use text parameter in storeBlob for caption
      // - If there's no media: Store text on Walrus, use text parameter in storeBlob
      
      if (mediaFile) {
        // Post has media (image/video) - store ONLY the media on Walrus
        console.log('[handleSubmitPost] Uploading media via HTTP API...');
        const mediaResult = await storeBlobWithHttpApi(mediaFile, currentAddress, {
          epochs: 5,
        });
        blobId = mediaResult.blobId;
        finalMediaBlobId = mediaResult.blobId;
        console.log('[handleSubmitPost] Media uploaded:', blobId);
        console.log('[handleSubmitPost] Will store on-chain with media blobId and text caption');
      } else if (newPost.trim()) {
        // Post is text-only - store text on Walrus
        console.log('[handleSubmitPost] Uploading text post via HTTP API...');
        const textResult = await storeBlobWithHttpApi(newPost, currentAddress, {
          epochs: 5,
        });
        blobId = textResult.blobId;
        console.log('[handleSubmitPost] Text post uploaded:', blobId);
        console.log('[handleSubmitPost] Will store on-chain with text blobId and text');
      } else {
        throw new Error('Post must have either text or media');
      }

      // Store blob ID on-chain in the smart contract
      // For media posts: blobId = media blobId, text = caption
      // For text posts: blobId = text blobId, text = text content
      if (wallet && wallet.connected) {
        try {
          const { storeBlob } = await import('@/lib/utils/contract');
          console.log('[handleSubmitPost] Storing blob ID on-chain...', { 
            blobId: blobId, 
            hasText: !!newPost,
            isMedia: !!mediaFile
          });
          
          await storeBlob(
            {
              blobId: blobId,
              text: newPost || undefined, // Store text as caption (for media) or content (for text posts)
            },
            wallet
          );
          console.log('[handleSubmitPost] Blob ID stored on-chain successfully');
        } catch (contractError: any) {
          console.error('[handleSubmitPost] Error storing blob on-chain:', contractError);
          // Don't fail the entire upload if contract call fails - blob is still stored on Walrus
        }
      } else {
        console.warn('[handleSubmitPost] Wallet not connected - skipping on-chain blob storage. Post will still be available via backend indexing.');
      }
      
      console.log('[handleSubmitPost] Stored blob for user:', { 
        userAddress: currentAddress, 
        blobId: blobId,
        hasText: !!newPost,
        hasMedia: !!mediaFile
      });

      // Fetch current user's profile to get username
      let userProfile: UserProfile | null = null;
      try {
        userProfile = await getUserProfile(currentAddress);
      } catch (error) {
        console.warn('[handleSubmitPost] Failed to fetch user profile:', error);
      }
      
      // Use username if available, otherwise use formatted address
      const authorName = userProfile 
        ? getDisplayName(userProfile, currentAddress)
        : (currentAddress.slice(0, 6) + "..." + currentAddress.slice(-4));

      // Create post object for backend indexing
      const postData = {
        content: newPost,
        mediaType: mediaType,
        mediaBlobId: finalMediaBlobId, // Only set if there's media
        ipTokenIds: selectedIPTokens,
        author: authorName,
        authorAddress: currentAddress,
        timestamp: Date.now(),
        tags: [],
      };

      // Index the post on backend so it can be fetched
      // Use API_BASE_URL from constants (handles both NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_API_URL)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
                          process.env.NEXT_PUBLIC_API_URL || 
                          (typeof window !== 'undefined' && window.location.origin.includes('vercel.app') 
                            ? 'https://ox-backend.vercel.app' // Production backend URL
                            : 'http://localhost:3001'); // Backend runs on port 3001
      try {
        console.log('[handleSubmitPost] Indexing post on backend...', { 
          API_BASE_URL, 
          env: {
            API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
            API_URL: process.env.NEXT_PUBLIC_API_URL,
          }
        });
        const indexResponse = await fetch(`${API_BASE_URL}/api/posts/index`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blobId: blobId, // Use the actual blobId (media or text)
            post: {
              post_type: 'discover_post',
              engagement_type: 'post',
              ...postData,
              likes: 0,
              comments: 0,
              likesList: [],
              commentsList: [],
            },
            walrusResponse: undefined, // We don't store the full response anymore
          }),
      });

      if (!indexResponse.ok) {
        const errorText = await indexResponse.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || `HTTP ${indexResponse.status}: ${indexResponse.statusText}` };
        }
        console.error('[handleSubmitPost] Backend indexing failed:', {
          status: indexResponse.status,
          statusText: indexResponse.statusText,
          error,
          url: `${API_BASE_URL}/api/posts/index`,
        });
        // Don't throw - post was uploaded successfully, just indexing failed
      } else {
        const result = await indexResponse.json();
        console.log('[handleSubmitPost] Post indexed successfully:', result);
      }
    } catch (indexError: any) {
      console.error('[handleSubmitPost] Error indexing post:', {
        error: indexError,
        message: indexError?.message,
        name: indexError?.name,
        cause: indexError?.cause,
        API_BASE_URL,
        blobId: blobId,
        note: 'Post was uploaded to Walrus successfully, but backend indexing failed. The post can be manually indexed later.',
      });
      // Don't throw - post was uploaded successfully, just indexing failed
      // The post is still on Walrus and can be manually indexed later
    }

    // Reload posts to show the new post
    await loadPosts();

    // HTTP API handles registration automatically, so we're done!
    setSuccessModal({ 
      open: true, 
      message: "Post uploaded successfully!" 
    });
    
    // Reset form
    setNewPost('');
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('text');
    setSelectedIPTokens([]);
    setShowCreatePost(false);
    } catch (error: any) {
      console.error("Failed to prepare post:", error);
      setErrorModal({ 
        open: true, 
        message: error?.message || "Unknown error occurred",
        details: `Failed to prepare post: ${error?.message || "Unknown error"}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Register the blob (separate user interaction - triggered by button click)
  const handleRegister = async (isMedia: boolean = false) => {
    const flow = isMedia ? mediaFlow : postFlow;
    if (!flow) {
      setErrorModal({ open: true, message: "Please prepare the post first" });
      return;
    }

    if (isMedia) {
      setMediaRegistering(true);
    } else {
      setRegistering(true);
    }

    try {
      const registerTx = flow.register();
      const result = await flow.signAndExecute(registerTx);
      
      // Upload happens automatically after register
      await flow.upload(result.digest);
      
      if (isMedia) {
        setMediaFlowStep('uploaded');
      } else {
        setPostFlowStep('uploaded');
      }

      setSuccessModal({ 
        open: true, 
        message: isMedia ? "Media registered! Click 'Certify' to continue." : "Post registered! Click 'Certify' to complete." 
      });
    } catch (error: any) {
      console.error("Failed to register:", error);
      const errorMessage = error?.message || "Unknown error";
      
      setErrorModal({ 
        open: true, 
        message: errorMessage,
        details: `Failed to register: ${errorMessage}`,
      });
    } finally {
      if (isMedia) {
        setMediaRegistering(false);
      } else {
        setRegistering(false);
      }
    }
  };

  // Step 3: Certify the blob (separate user interaction - triggered by button click)
  const handleCertify = async (isMedia: boolean = false) => {
    const flow = isMedia ? mediaFlow : postFlow;
    if (!flow) {
      setErrorModal({ open: true, message: "Please register first" });
      return;
    }

    if (isMedia) {
      setMediaCertifying(true);
    } else {
      setCertifying(true);
    }

    try {
      const certifyTx = flow.certify();
      await flow.signAndExecute(certifyTx);
      
      const files = await flow.listFiles();
      const blobId = files[0]?.blobId;

      if (!blobId) {
        throw new Error("No blob ID returned");
      }

      if (isMedia) {
        setMediaFlowStep('complete');
        // After media is complete, if post is also complete, finish the process
        if (postFlowStep === 'complete') {
          await finishPostCreation();
        }
      } else {
        setPostFlowStep('complete');
        // After post is complete, if media is also complete (or no media), finish the process
        if (!mediaFile || mediaFlowStep === 'complete') {
          await finishPostCreation();
        }
      }
    } catch (error: any) {
      console.error("Failed to certify:", error);
      const errorMessage = error?.message || "Unknown error";
      
      setErrorModal({ 
        open: true, 
        message: errorMessage,
        details: `Failed to certify: ${errorMessage}`,
      });
    } finally {
      if (isMedia) {
        setMediaCertifying(false);
      } else {
        setCertifying(false);
      }
    }
  };

  // Final step: Complete post creation and index
  const finishPostCreation = async () => {
    if (!currentAddress) {
      alert("Wallet address not available");
      return;
    }

    try {
      // Get blob IDs from flows
      const postFiles = await postFlow.listFiles();
      const postBlobId = postFiles[0]?.blobId;
      
      let mediaBlobId: string | undefined;
      if (mediaFile && mediaFlow) {
        const mediaFiles = await mediaFlow.listFiles();
        mediaBlobId = mediaFiles[0]?.blobId;
      }

      // Create post data for indexing
      const postData = {
        post_type: 'discover_post',
        engagement_type: 'post',
        content: newPost,
        mediaType: mediaType,
        mediaBlobId: mediaBlobId,
        ipTokenIds: selectedIPTokens,
        author: currentAddress.slice(0, 6) + "..." + currentAddress.slice(-4),
        authorAddress: currentAddress,
        timestamp: Date.now(),
        tags: [],
        likes: 0,
        comments: 0,
        likesList: [],
        commentsList: [],
      };

      // Index the post on backend
      // Backend runs on port 3001 to avoid conflict with Next.js frontend (port 3000)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
                          process.env.NEXT_PUBLIC_API_URL || 
                          'http://localhost:3001';
      await fetch(`${API_BASE_URL}/api/posts/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobId: postBlobId, post: postData }),
      });

      // Reload posts
      await loadPosts();

      // Reset everything
      setNewPost("");
      setSelectedIPTokens([]);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType("text");
      setShowCreatePost(false);
      setPostFlow(null);
      setMediaFlow(null);
      setPostFlowStep('idle');
      setMediaFlowStep('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessModal({ open: true, message: "Post created successfully! Stored on Walrus." });
    } catch (error: any) {
      console.error("Failed to complete post:", error);
      const errorMessage = error?.message || "Unknown error";
      setErrorModal({ 
        open: true, 
        message: errorMessage,
        details: `Failed to complete post: ${errorMessage}`,
      });
    }
  };

  const handleLikePost = async (post: Post) => {
    if (!currentAddress) {
      setErrorModal({ open: true, message: "Please connect your wallet to like posts" });
      return;
    }

    if (likingPosts.has(post.blobId)) return; // Prevent double-clicking

    setLikingPosts((prev) => new Set(prev).add(post.blobId));

    try {
      const result = await likePost(post.blobId, currentAddress);
      
      // Update post in local state
      // Note: blobId might change if the post was updated on Walrus
      setPosts((prev) =>
        prev.map((p) => {
          if (p.blobId === post.blobId || p.id === post.blobId) {
            return {
              ...p,
              likes: result.likes,
              // Update blobId if it changed
              blobId: result.blobId || p.blobId,
              id: result.blobId || p.id,
            };
          }
          return p;
        })
      );
    } catch (error: any) {
      console.error("Failed to like post:", error);
      setErrorModal({ open: true, message: "Failed to like post. Please try again." });
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
      setErrorModal({ open: true, message: "Please connect your wallet to comment" });
      return;
    }

    if (!commentText.trim()) {
      setErrorModal({ open: true, message: "Please enter a comment" });
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
      // Note: blobId might change if the post was updated on Walrus
      setPosts((prev) =>
        prev.map((p) => {
          if (p.blobId === post.blobId || p.id === post.blobId) {
            return {
              ...p,
              comments: result.comments,
              // Update blobId if it changed
              blobId: result.blobId || p.blobId,
              id: result.blobId || p.id,
            };
          }
          return p;
        })
      );

      setCommentText("");
      setShowCommentModal(null);
    } catch (error: any) {
      console.error("Failed to comment on post:", error);
      setErrorModal({ open: true, message: "Failed to comment. Please try again." });
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
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (seconds < 60) return "Just now";
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
      if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
      if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
      return `${years} year${years > 1 ? "s" : ""} ago`;
    }
    return timestamp;
  };

  const formatAddress = (address: string | undefined | null): string => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'Unknown';
    }
    // Format: 0x6df2...9c71
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
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
              onChange={(e) => {
                setNewPost(e.target.value);
              }}
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
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-zinc-300">Add Media</span>
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {/* Multi-step flow buttons */}
                {postFlowStep === 'idle' && (
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
                        setPostFlow(null);
                        setMediaFlow(null);
                        setPostFlowStep('idle');
                        setMediaFlowStep('idle');
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
                      {submitting ? "Preparing..." : "Prepare Post"}
                    </button>
                  </div>
                )}

                {/* Step 2: Register (separate user interaction) */}
                {postFlowStep === 'encoded' && (
                  <div className="space-y-2">
                    {mediaFile && mediaFlowStep === 'encoded' && (
                      <div className="mb-2 p-3 bg-zinc-800 rounded-lg">
                        <p className="text-sm text-zinc-300 mb-2">Media ready. Register media first:</p>
                        <button
                          type="button"
                          onClick={() => handleRegister(true)}
                          disabled={mediaRegistering}
                          className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                          {mediaRegistering ? "Registering Media..." : "Register Media (Wallet Popup)"}
                        </button>
                      </div>
                    )}
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-sm text-zinc-300 mb-2">
                        Post prepared! Click below to register on-chain. This will open your wallet to sign.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRegister(false)}
                        disabled={registering || (!!mediaFile && mediaFlowStep !== 'uploaded' && mediaFlowStep !== 'complete')}
                        className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      >
                        {registering ? "Registering..." : "Register Post (Wallet Popup)"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Certify (separate user interaction) */}
                {postFlowStep === 'uploaded' && (
                  <div className="space-y-2">
                    {mediaFile && mediaFlowStep === 'uploaded' && (
                      <div className="mb-2 p-3 bg-zinc-800 rounded-lg">
                        <p className="text-sm text-zinc-300 mb-2">Media uploaded. Certify media:</p>
                        <button
                          type="button"
                          onClick={() => handleCertify(true)}
                          disabled={mediaCertifying}
                          className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                          {mediaCertifying ? "Certifying Media..." : "Certify Media (Wallet Popup)"}
                        </button>
                      </div>
                    )}
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-sm text-zinc-300 mb-2">
                        Post uploaded! Click below to certify on-chain. This will open your wallet to sign.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCertify(false)}
                        disabled={certifying || (!!mediaFile && mediaFlowStep !== 'complete')}
                        className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      >
                        {certifying ? "Certifying..." : "Certify Post (Wallet Popup)"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Complete */}
                {(postFlowStep === 'complete' || (postFlowStep === 'uploaded' && !mediaFile)) && (
                  <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                    <p className="text-sm text-green-300">
                      {postFlowStep === 'complete' ? "Post created successfully!" : "Processing..."}
                    </p>
                  </div>
                )}
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
                    <div className="bg-zinc-950 w-full flex items-center justify-center">
                      {post.mediaType === "image" ? (
                        <img
                          src={post.mediaUrl || (post.mediaBlobId 
                            ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${post.mediaBlobId}`
                            : '')
                          }
                          alt={post.content || 'Post image'}
                          className="w-full h-auto max-h-[80vh] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <video
                          src={post.mediaUrl || (post.mediaBlobId 
                            ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${post.mediaBlobId}`
                            : '')
                          }
                          controls
                          className="w-full h-auto max-h-[80vh] object-contain"
                        />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {(() => {
                        const profile = (post as any).profile as UserProfile | undefined;
                        const profilePictureUrl = profile?.profilePicture 
                          ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${profile.profilePicture}`
                          : null;
                        
                        if (profilePictureUrl) {
                          return (
                            <img
                              src={profilePictureUrl}
                              alt={post.author || 'User'}
                              className="w-10 h-10 rounded-full object-cover border border-cyan-500/30"
                              onError={(e) => {
                                // Hide image and show avatar on error
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          );
                        }
                        return (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white">
                            {post.author?.[0]?.toUpperCase() || (post.authorAddress 
                              ? (post.authorAddress.slice(2, 3).toUpperCase() || '?')
                              : '?')}
                          </div>
                        );
                      })()}
                      <div className="flex-1">
                        <div className="font-semibold">
                          {post.author || (post.authorAddress ? formatAddress(post.authorAddress) : 'Unknown')}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatTimestamp(post.timestamp)}
                        </div>
                      </div>
                    </div>

                    {post.content && post.content.trim() && (
                      <p className="text-sm mb-3">{post.content}</p>
                    )}

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

      {/* Error Modal */}
      <ErrorModal
        open={errorModal.open}
        onClose={() => setErrorModal({ open: false, message: '' })}
        message={errorModal.message}
        details={errorModal.details}
      />

      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false, message: '' })}
        message={successModal.message}
      />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
