import { fromB64 } from "@mysten/bcs";
import { SuiClient } from "@mysten/sui.js/client";
import { SerializedSignature } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from "@mysten/zklogin";
import axios from "axios";
import { JwtPayload, jwtDecode } from "jwt-decode";

// Storage keys
const KEY_PAIR_SESSION_STORAGE_KEY = "zklogin_ephemeral_key_pair";
const USER_SALT_LOCAL_STORAGE_KEY = "zklogin_user_salt";
const RANDOMNESS_SESSION_STORAGE_KEY = "zklogin_randomness";
const MAX_EPOCH_LOCAL_STORAGE_KEY = "zklogin_max_epoch";
const JWT_STRING_SESSION_STORAGE_KEY = "zklogin_jwt_string";

// Configuration - should come from environment variables
const FULLNODE_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || "https://fullnode.devnet.sui.io";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "";
const SUI_PROVER_DEV_ENDPOINT = process.env.NEXT_PUBLIC_SUI_PROVER_ENDPOINT || "https://prover-dev.mystenlabs.com/v1";

const suiClient = new SuiClient({ url: FULLNODE_URL });

export interface ZkLoginState {
  ephemeralKeyPair: Ed25519Keypair | null;
  randomness: string | null;
  maxEpoch: number;
  userSalt: string | null;
  jwtString: string | null;
  decodedJwt: JwtPayload | null;
  zkLoginUserAddress: string | null;
  extendedEphemeralPublicKey: string | null;
  zkProof: PartialZkLoginSignature | null;
}

export type PartialZkLoginSignature = Omit<
  Parameters<typeof getZkLoginSignature>["0"]["inputs"],
  "addressSeed"
>;

export class ZkLoginService {
  private state: ZkLoginState = {
    ephemeralKeyPair: null,
    randomness: null,
    maxEpoch: 0,
    userSalt: null,
    jwtString: null,
    decodedJwt: null,
    zkLoginUserAddress: null,
    extendedEphemeralPublicKey: null,
    zkProof: null,
  };

  constructor() {
    this.loadStateFromStorage();
  }

  /**
   * Load state from browser storage
   */
  private loadStateFromStorage() {
    if (typeof window === "undefined") return;

    // Load ephemeral key pair
    const privateKey = window.sessionStorage.getItem(KEY_PAIR_SESSION_STORAGE_KEY);
    if (privateKey) {
      try {
        this.state.ephemeralKeyPair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));
      } catch (e) {
        console.error("Failed to load ephemeral key pair:", e);
      }
    }

    // Load randomness
    const randomness = window.sessionStorage.getItem(RANDOMNESS_SESSION_STORAGE_KEY);
    if (randomness) {
      this.state.randomness = randomness;
    }

    // Load user salt
    const userSalt = window.localStorage.getItem(USER_SALT_LOCAL_STORAGE_KEY);
    if (userSalt) {
      this.state.userSalt = userSalt;
    }

    // Load max epoch
    const maxEpoch = window.localStorage.getItem(MAX_EPOCH_LOCAL_STORAGE_KEY);
    if (maxEpoch) {
      this.state.maxEpoch = Number(maxEpoch);
    }

    // Load JWT string
    const jwtString = window.sessionStorage.getItem(JWT_STRING_SESSION_STORAGE_KEY);
    if (jwtString) {
      this.state.jwtString = jwtString;
      try {
        this.state.decodedJwt = jwtDecode(jwtString);
      } catch (e) {
        console.error("Failed to decode JWT:", e);
      }
    }
  }

  /**
   * Initialize zkLogin flow
   * Step 1: Generate ephemeral key pair and randomness
   */
  async initialize(): Promise<void> {
    // Generate ephemeral key pair
    const ephemeralKeyPair = Ed25519Keypair.generate();
    window.sessionStorage.setItem(
      KEY_PAIR_SESSION_STORAGE_KEY,
      ephemeralKeyPair.export().privateKey
    );
    this.state.ephemeralKeyPair = ephemeralKeyPair;

    // Get current epoch
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10;
    window.localStorage.setItem(MAX_EPOCH_LOCAL_STORAGE_KEY, String(maxEpoch));
    this.state.maxEpoch = maxEpoch;

    // Generate randomness
    const randomness = generateRandomness();
    window.sessionStorage.setItem(RANDOMNESS_SESSION_STORAGE_KEY, randomness);
    this.state.randomness = randomness;
  }

  /**
   * Generate nonce and redirect to Google OAuth
   * Step 2: Generate nonce and initiate Google sign-in
   */
  async initiateGoogleSignIn(): Promise<void> {
    if (!this.state.ephemeralKeyPair || !this.state.maxEpoch || !this.state.randomness) {
      await this.initialize();
    }

    if (!this.state.ephemeralKeyPair || !this.state.maxEpoch || !this.state.randomness) {
      throw new Error("Failed to initialize zkLogin state");
    }

    // Generate nonce
    const publicKey = this.state.ephemeralKeyPair.getPublicKey();
    const nonce = generateNonce(
      publicKey as any, // Type compatibility workaround for Ed25519PublicKey
      this.state.maxEpoch,
      this.state.randomness
    );

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "id_token",
      scope: "openid",
      nonce: nonce,
    });

    const loginURL = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    // Redirect to Google
    window.location.href = loginURL;
  }

  /**
   * Handle OAuth callback
   * Step 3: Process JWT from Google OAuth callback
   */
  handleOAuthCallback(idToken: string): void {
    try {
      const decodedJwt = jwtDecode(idToken);
      window.sessionStorage.setItem(JWT_STRING_SESSION_STORAGE_KEY, idToken);
      this.state.jwtString = idToken;
      this.state.decodedJwt = decodedJwt;
    } catch (e) {
      throw new Error(`Failed to decode JWT: ${e}`);
    }
  }

  /**
   * Generate or retrieve user salt
   * Step 4: Generate user salt (if not exists)
   */
  ensureUserSalt(): string {
    if (!this.state.userSalt) {
      const salt = generateRandomness();
      window.localStorage.setItem(USER_SALT_LOCAL_STORAGE_KEY, salt);
      this.state.userSalt = salt;
    }
    return this.state.userSalt;
  }

  /**
   * Generate zkLogin address
   * Step 5: Generate Sui address from JWT and salt
   */
  generateAddress(): string {
    if (!this.state.jwtString || !this.state.userSalt) {
      throw new Error("JWT and user salt are required to generate address");
    }

    const address = jwtToAddress(this.state.jwtString, this.state.userSalt);
    this.state.zkLoginUserAddress = address;
    return address;
  }

  /**
   * Get extended ephemeral public key
   * Step 6: Get extended ephemeral public key for ZK proof
   */
  getExtendedEphemeralPublicKey(): string {
    if (!this.state.ephemeralKeyPair) {
      throw new Error("Ephemeral key pair not initialized");
    }

    const publicKey = this.state.ephemeralKeyPair.getPublicKey();
    const extendedKey = getExtendedEphemeralPublicKey(
      publicKey as any // Type compatibility workaround for Ed25519PublicKey
    );
    this.state.extendedEphemeralPublicKey = extendedKey;
    return extendedKey;
  }

  /**
   * Fetch ZK proof from prover
   * Step 7: Get ZK proof from Sui prover service
   */
  async fetchZKProof(): Promise<PartialZkLoginSignature> {
    if (
      !this.state.jwtString ||
      !this.state.extendedEphemeralPublicKey ||
      !this.state.maxEpoch ||
      !this.state.randomness ||
      !this.state.userSalt
    ) {
      throw new Error("Missing required state for ZK proof");
    }

    try {
      const response = await axios.post(
        SUI_PROVER_DEV_ENDPOINT,
        {
          jwt: this.state.jwtString,
          extendedEphemeralPublicKey: this.state.extendedEphemeralPublicKey,
          maxEpoch: this.state.maxEpoch,
          jwtRandomness: this.state.randomness,
          salt: this.state.userSalt,
          keyClaimName: "sub",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      this.state.zkProof = response.data as PartialZkLoginSignature;
      return this.state.zkProof;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch ZK proof: ${error?.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Sign and execute a transaction
   * Step 8: Sign transaction with zkLogin signature
   */
  async signTransaction(
    txb: TransactionBlock
  ): Promise<{ bytes: Uint8Array; signature: SerializedSignature }> {
    if (
      !this.state.ephemeralKeyPair ||
      !this.state.zkProof ||
      !this.state.decodedJwt ||
      !this.state.userSalt ||
      !this.state.zkLoginUserAddress ||
      !this.state.maxEpoch
    ) {
      throw new Error("Missing required state for transaction signing");
    }

    // Set sender
    txb.setSender(this.state.zkLoginUserAddress);

    // Sign with ephemeral key pair
    const signResult = await txb.sign({
      client: suiClient,
      signer: this.state.ephemeralKeyPair,
    });

    // Ensure bytes is Uint8Array (handle different return types)
    const bytesValue = signResult.bytes as any;
    let bytes: Uint8Array;
    if (bytesValue instanceof Uint8Array) {
      bytes = bytesValue;
    } else if (typeof bytesValue === 'string') {
      // If bytes is a base64 string, convert it
      bytes = new Uint8Array(Buffer.from(bytesValue, 'base64'));
    } else {
      // Fallback: try to convert to Uint8Array
      bytes = new Uint8Array(bytesValue);
    }
    
    const userSignature = signResult.signature;

    // Generate address seed
    if (!this.state.decodedJwt.sub || !this.state.decodedJwt.aud) {
      throw new Error("Invalid JWT payload");
    }

    const addressSeed = genAddressSeed(
      BigInt(this.state.userSalt),
      "sub",
      this.state.decodedJwt.sub,
      typeof this.state.decodedJwt.aud === "string"
        ? this.state.decodedJwt.aud
        : this.state.decodedJwt.aud[0]
    ).toString();

    // Generate zkLogin signature
    const zkLoginSignature = getZkLoginSignature({
      inputs: {
        ...this.state.zkProof,
        addressSeed,
      },
      maxEpoch: this.state.maxEpoch,
      userSignature,
    });

    return {
      bytes,
      signature: zkLoginSignature,
    };
  }

  /**
   * Execute a transaction
   */
  async executeTransaction(txb: TransactionBlock): Promise<string> {
    const { bytes, signature } = await this.signTransaction(txb);
    
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
    });

    return result.digest;
  }

  /**
   * Get current zkLogin address
   */
  getAddress(): string | null {
    return this.state.zkLoginUserAddress;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.state.zkLoginUserAddress && !!this.state.zkProof;
  }

  /**
   * Complete authentication flow
   * This method handles the complete flow from OAuth callback to ready state
   */
  async completeAuthFlow(idToken: string): Promise<string> {
    // Handle OAuth callback
    this.handleOAuthCallback(idToken);

    // Ensure user salt exists
    this.ensureUserSalt();

    // Generate address
    const address = this.generateAddress();

    // Get extended ephemeral public key
    this.getExtendedEphemeralPublicKey();

    // Fetch ZK proof
    await this.fetchZKProof();

    return address;
  }

  /**
   * Clear all stored state
   */
  clearState(): void {
    if (typeof window === "undefined") return;

    window.sessionStorage.removeItem(KEY_PAIR_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(RANDOMNESS_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(JWT_STRING_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(USER_SALT_LOCAL_STORAGE_KEY);
    window.localStorage.removeItem(MAX_EPOCH_LOCAL_STORAGE_KEY);

    this.state = {
      ephemeralKeyPair: null,
      randomness: null,
      maxEpoch: 0,
      userSalt: null,
      jwtString: null,
      decodedJwt: null,
      zkLoginUserAddress: null,
      extendedEphemeralPublicKey: null,
      zkProof: null,
    };
  }
}

// Singleton instance
let zkLoginServiceInstance: ZkLoginService | null = null;

export function getZkLoginService(): ZkLoginService {
  if (!zkLoginServiceInstance) {
    zkLoginServiceInstance = new ZkLoginService();
  }
  return zkLoginServiceInstance;
}

