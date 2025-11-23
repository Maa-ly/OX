"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useAuthStore } from "@/lib/stores/auth-store";

const NavWalletButton = dynamic(
  () =>
    import("@/components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  { ssr: false }
);

interface Asset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
}

interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
}

interface UserProfile {
  userAddress: string;
  username: string | null;
  profilePicture: string | null;
  displayName: string | null;
  bio: string | null;
}

export default function PortfolioPage() {
  const { address: walletAddress } = useWalletAuth();
  const { address: authAddress } = useAuthStore();
  const currentAddress = authAddress || walletAddress;
  
  const [activeTab, setActiveTab] = useState<
    "assets" | "positions" | "history" | "profile"
  >("assets");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  
  // Load profile when address is available
  useEffect(() => {
    if (currentAddress) {
      loadProfile();
    }
  }, [currentAddress]);
  
  const loadProfile = async () => {
    if (!currentAddress) return;
    setLoadingProfile(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/user/profile/${currentAddress}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          setUsername(data.profile.username || "");
          setDisplayName(data.profile.displayName || "");
          setBio(data.profile.bio || "");
          setProfilePicture(data.profile.profilePicture);
          if (data.profile.profilePicture) {
            // Create preview URL from blob ID
            setProfilePicturePreview(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${data.profile.profilePicture}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };
  
  const checkUsername = async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/user/check-username/${value}`);
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
      }
    } catch (error) {
      console.error('Failed to check username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };
  
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameAvailable(null);
  };
  
  // Debounce username check
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsername(username);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username, profile?.username]);
  
  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith("image/")) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!currentAddress) return;
    
    setSavingProfile(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      // First, upload profile picture if selected using the same HTTP API method that works for posts
      let profilePictureBlobId = profilePicture;
      if (profilePictureFile) {
        const formData = new FormData();
        formData.append('file', profilePictureFile);
        const uploadResponse = await fetch(`${API_BASE}/api/posts/upload-media`, {
          method: 'POST',
          body: formData,
        });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.blobId) {
            profilePictureBlobId = uploadData.blobId;
          }
        } else {
          // If upload fails, try to get error message but continue with profile save
          try {
            const errorData = await uploadResponse.json();
            console.warn('Profile picture upload failed:', errorData.error || 'Unknown error');
          } catch {
            console.warn('Profile picture upload failed:', uploadResponse.statusText);
          }
        }
      }
      
      // Then update profile
      const response = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: currentAddress,
          username: username && username.trim() ? username.trim() : null,
          displayName: displayName && displayName.trim() ? displayName.trim() : null,
          bio: bio && bio.trim() ? bio.trim() : null,
          profilePicture: profilePictureBlobId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfile(data.profile);
          setProfilePictureFile(null); // Clear file after successful save
          alert('Profile saved successfully!');
        } else {
          alert(data.error || 'Failed to save profile');
        }
      } else {
        let errorMessage = 'Failed to save profile';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `Failed to save profile: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      // Safely extract error message
      let errorMessage = 'Unknown error';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = String(error.message);
      } else if (error?.error) {
        errorMessage = String(error.error);
      } else if (error) {
        errorMessage = String(error);
      }
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        alert('Failed to connect to server. Please make sure the backend server is running on port 3001 and restart it to load the new user profile routes.');
      } else {
        alert('Failed to save profile: ' + errorMessage);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Mock data
  const totalValue = 25847.32;
  const dailyPnL = 1234.56;
  const dailyPnLPercent = 5.02;

  const assets: Asset[] = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: 10000,
      value: 10000,
      change24h: 0,
    },
    {
      symbol: "NARUTO",
      name: "Naruto",
      balance: 250,
      value: 9426.5,
      change24h: -0.66,
    },
    {
      symbol: "ONEPIECE",
      name: "One Piece",
      balance: 100,
      value: 5234,
      change24h: 3.21,
    },
    {
      symbol: "AOT",
      name: "Attack on Titan",
      balance: 28,
      value: 1153.04,
      change24h: 5.67,
    },
  ];

  const positions: Position[] = [
    {
      symbol: "NARUTO/USDC",
      side: "long",
      size: 100,
      entryPrice: 37.5,
      currentPrice: 37.706,
      pnl: 20.6,
      pnlPercent: 5.49,
      leverage: 10,
    },
  ];

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
                className="hidden md:block text-sm font-medium text-cyan-400 transition-colors hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/discover"
                className="hidden md:block text-sm font-medium text-zinc-300 transition-colors hover:text-white"
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
          <p className="text-zinc-400">Track your assets and positions</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-linear-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">
              Total Portfolio Value
            </div>
            <div className="text-3xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">24h PnL</div>
            <div className="flex items-baseline gap-2">
              <div
                className={`text-3xl font-bold ${
                  dailyPnL >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ${dailyPnL.toFixed(2)}
              </div>
              <div
                className={`text-lg ${
                  dailyPnL >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ({dailyPnL >= 0 ? "+" : ""}
                {dailyPnLPercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="text-zinc-400 text-sm mb-2">Total Assets</div>
            <div className="text-3xl font-bold">{assets.length}</div>
            <div className="text-sm text-zinc-500 mt-1">
              {positions.length} Active Positions
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 mb-6 flex gap-6">
          <button
            onClick={() => setActiveTab("assets")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "assets"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "positions"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Transaction History
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Profile
          </button>
        </div>

        {/* Assets Table */}
        {activeTab === "assets" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr className="text-left text-sm text-zinc-400">
                  <th className="py-4 px-6 sticky left-0 bg-zinc-900 z-10">
                    Asset
                  </th>
                  <th className="py-4 px-6 text-right">Balance</th>
                  <th className="py-4 px-6 text-right">Value (USDC)</th>
                  <th className="py-4 px-6 text-right">24h Change</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.symbol}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-4 px-6 sticky left-0 bg-zinc-900/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                          {asset.symbol[0]}
                        </div>
                        <div>
                          <div className="font-semibold">{asset.name}</div>
                          <div className="text-xs text-zinc-500">
                            {asset.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      {asset.balance.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      ${asset.value.toLocaleString()}
                    </td>
                    <td
                      className={`py-4 px-6 text-right font-semibold ${
                        asset.change24h >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {asset.change24h === 0
                        ? "-"
                        : `${
                            asset.change24h >= 0 ? "+" : ""
                          }${asset.change24h.toFixed(2)}%`}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        href={`/trade?symbol=${asset.symbol}`}
                        className="inline-block px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Positions Table */}
        {activeTab === "positions" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto">
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-zinc-400">No active positions</div>
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="bg-zinc-900 border-b border-zinc-800">
                  <tr className="text-left text-sm text-zinc-400">
                    <th className="py-4 px-6 sticky left-0 bg-zinc-900 z-10">
                      Symbol
                    </th>
                    <th className="py-4 px-6">Side</th>
                    <th className="py-4 px-6 text-right">Size</th>
                    <th className="py-4 px-6 text-right">Entry Price</th>
                    <th className="py-4 px-6 text-right">Current Price</th>
                    <th className="py-4 px-6 text-center">Leverage</th>
                    <th className="py-4 px-6 text-right">PnL</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-4 px-6 font-semibold sticky left-0 bg-zinc-900/50 backdrop-blur-sm">
                        {position.symbol}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            position.side === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">{position.size}</td>
                      <td className="py-4 px-6 text-right">
                        ${position.entryPrice.toFixed(3)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        ${position.currentPrice.toFixed(3)}
                      </td>
                      <td className="py-4 px-6 text-center text-cyan-400">
                        {position.leverage}x
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div
                          className={
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          ${position.pnl.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs ${
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          ({position.pnl >= 0 ? "+" : ""}
                          {position.pnlPercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors">
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">📜</div>
            <div className="text-zinc-400">No transaction history</div>
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            {!currentAddress ? (
              <div className="text-center py-12">
                <div className="text-zinc-400">Please connect your wallet to manage your profile</div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold mb-6">User Profile</h2>
                
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-cyan-500">
                        {currentAddress.slice(2, 3).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => profilePictureInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-cyan-500 hover:bg-cyan-600 rounded-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      ref={profilePictureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureSelect}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Profile Picture</div>
                    <div className="text-xs text-zinc-500">Click the camera icon to upload</div>
                  </div>
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Wallet Address
                  </label>
                  <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">
                    {currentAddress}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Username <span className="text-zinc-500">(optional, unique)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="username"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                  {checkingUsername && (
                    <div className="mt-1 text-xs text-zinc-500">Checking availability...</div>
                  )}
                  {usernameAvailable === false && username && (
                    <div className="mt-1 text-xs text-red-400">Username is already taken</div>
                  )}
                  {usernameAvailable === true && username && (
                    <div className="mt-1 text-xs text-green-400">Username is available</div>
                  )}
                  {username && username.length > 0 && !/^[a-z0-9_]+$/.test(username.toLowerCase()) && (
                    <div className="mt-1 text-xs text-red-400">Only lowercase letters, numbers, and underscores allowed</div>
                  )}
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Display Name <span className="text-zinc-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Bio <span className="text-zinc-500">(optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <div className="mt-1 text-xs text-zinc-500 text-right">
                    {bio.length}/500
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || (!!username && usernameAvailable === false)}
                  className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <MobileBottomNav />
    </div>
  );
}
