#!/usr/bin/env node
/**
 * Script to create all 10 anime tokens after deployment
 * Usage: node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromB64 } = require('@mysten/sui/utils');

// Get arguments
const [,, packageId, adminCapId, tokenRegistryId] = process.argv;

if (!packageId || !adminCapId || !tokenRegistryId) {
    console.error('Usage: node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>');
    console.error('');
    console.error('Example:');
    console.error('  node create_tokens.js 0x123... 0x456... 0x789...');
    process.exit(1);
}

// Get private key from environment or use default
const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error('Error: SUI_PRIVATE_KEY or ADMIN_PRIVATE_KEY environment variable not set');
    console.error('Set it with: export SUI_PRIVATE_KEY="your_base64_private_key"');
    process.exit(1);
}

// Initialize client and keypair
const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Handle both hex and base64 format private keys
let privateKeyBytes;
if (PRIVATE_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(PRIVATE_KEY)) {
    // Hex format (64 hex characters = 32 bytes)
    privateKeyBytes = Buffer.from(PRIVATE_KEY, 'hex');
} else {
    // Assume base64 format
    try {
        privateKeyBytes = fromB64(PRIVATE_KEY);
    } catch (b64Error) {
        // If base64 fails, try hex anyway
        privateKeyBytes = Buffer.from(PRIVATE_KEY, 'hex');
    }
}

const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);

// Token data: name, symbol, description, category (0=anime)
const TOKENS = [
    {
        name: "One Piece",
        symbol: "OP",
        description: "Follows Monkey D. Luffy and his pirate crew as they sail the Grand Line searching for the world's greatest treasure, the One Piece.",
        category: 0
    },
    {
        name: "Naruto / Naruto Shippuden",
        symbol: "NRT",
        description: "Naruto Uzumaki, a determined young ninja, trains to become Hokage while battling dark forces that threaten his village.",
        category: 0
    },
    {
        name: "Bleach",
        symbol: "BCH",
        description: "Ichigo Kurosaki gains the powers of a Soul Reaper and protects humans from Hollows while uncovering hidden truths across multiple spiritual realms.",
        category: 0
    },
    {
        name: "Dragon Ball / DBZ / Super",
        symbol: "DBZ",
        description: "Goku and his friends defend Earth from powerful enemies while pushing their limits through intense training and legendary transformations.",
        category: 0
    },
    {
        name: "Attack on Titan",
        symbol: "AOT",
        description: "Humanity is trapped behind massive walls to survive against Titan giants, but dark secrets about their world slowly unravel.",
        category: 0
    },
    {
        name: "My Hero Academia",
        symbol: "MHA",
        description: "In a world where most people have superpowers called Quirks, Izuku Midoriya trains at U.A. High School to become a top hero.",
        category: 0
    },
    {
        name: "Demon Slayer (Kimetsu no Yaiba)",
        symbol: "DS",
        description: "Tanjiro Kamado joins the Demon Slayer Corps to fight demons and find a cure for his sister Nezuko, who was turned into a demon.",
        category: 0
    },
    {
        name: "Jujutsu Kaisen",
        symbol: "JJK",
        description: "Yuji Itadori becomes a Jujutsu sorcerer after consuming a cursed object, battling dangerous spirits alongside his new allies.",
        category: 0
    },
    {
        name: "Hunter x Hunter",
        symbol: "HxH",
        description: "Gon Freecss embarks on a journey to become a Hunter while exploring a vast world full of danger, adventure, and powerful Nen abilities.",
        category: 0
    },
    {
        name: "Fullmetal Alchemist: Brotherhood",
        symbol: "FMAB",
        description: "Brothers Edward and Alphonse Elric search for the Philosopher's Stone after a failed forbidden alchemy ritual that cost them their bodies.",
        category: 0
    }
];

const RESERVE_POOL_SIZE = 5000;

async function createToken(token, index) {
    try {
        console.log(`[${index + 1}/10] Creating token: ${token.name} (${token.symbol})...`);
        
        const tx = new Transaction();
        
        tx.moveCall({
            target: `${packageId}::token::create_ip_token`,
            arguments: [
                tx.object(adminCapId),
                tx.object(tokenRegistryId),
                tx.pure.string(token.name),
                tx.pure.string(token.symbol),
                tx.pure.string(token.description),
                tx.pure.u8(token.category),
                tx.pure.u64(BigInt(RESERVE_POOL_SIZE)),
            ],
        });
        
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true,
            },
        });
        
        // Extract token ID from object changes
        const createdToken = result.objectChanges?.find(
            (change) => change.type === 'created' && change.objectType?.includes('IPToken')
        );
        
        if (createdToken?.objectId) {
            console.log(`  ✓ Created: ${createdToken.objectId}`);
            console.log(`  Transaction: ${result.digest}`);
            return { success: true, tokenId: createdToken.objectId, digest: result.digest };
        } else {
            console.log(`  ✓ Created (Transaction: ${result.digest})`);
            return { success: true, digest: result.digest };
        }
    } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('=========================================');
    console.log('Creating Anime Tokens');
    console.log('=========================================');
    console.log(`Package ID: ${packageId}`);
    console.log(`AdminCap ID: ${adminCapId}`);
    console.log(`TokenRegistry ID: ${tokenRegistryId}`);
    console.log(`Reserve Pool Size: ${RESERVE_POOL_SIZE}`);
    console.log('');
    
    const results = [];
    
    for (let i = 0; i < TOKENS.length; i++) {
        const result = await createToken(TOKENS[i], i);
        results.push({ token: TOKENS[i], ...result });
        
        // Small delay between transactions
        if (i < TOKENS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('');
    console.log('=========================================');
    console.log('Summary');
    console.log('=========================================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total: ${TOKENS.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log('');
    
    if (successful > 0) {
        console.log('Successfully created tokens:');
        results.filter(r => r.success).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.token.name} (${r.token.symbol})${r.tokenId ? ` - ${r.tokenId}` : ''}`);
        });
    }
    
    if (failed > 0) {
        console.log('');
        console.log('Failed tokens:');
        results.filter(r => !r.success).forEach((r) => {
            console.log(`  - ${r.token.name} (${r.token.symbol}): ${r.error}`);
        });
    }
    
    console.log('');
}

main().catch(console.error);


