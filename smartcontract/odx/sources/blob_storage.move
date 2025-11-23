/// ODX - Blob Storage Module
/// 
/// This module handles storage of Walrus blob IDs on-chain.
/// When users upload content to Walrus, they can store the blobId in the contract
/// along with optional text/description. This creates an on-chain mapping from
/// user address to blobId with associated metadata.

#[allow(duplicate_alias)]
module odx::blob_storage;

use sui::object::{Self, UID};
use sui::tx_context::{Self, TxContext};
use sui::table::{Self, Table};
use sui::transfer;
use std::vector;
use std::option::{Self, Option};

/// Blob Record
/// Stores blobId and optional text/description for a user's blob
public struct BlobRecord has copy, store, drop {
    /// Walrus blob ID
    blob_id: vector<u8>,
    /// Optional text/description associated with the blob
    text: Option<vector<u8>>,
    /// Timestamp when blob was stored
    timestamp: u64,
}

/// Blob Storage Registry
/// Maps user addresses to their blob records
/// Each address can have multiple blobs (stored as a vector)
public struct BlobStorageRegistry has key {
    id: UID,
    /// Map of address -> vector of BlobRecord
    /// This allows users to store multiple blobs
    blobs: Table<address, vector<BlobRecord>>,
    /// All blob records stored (for easy retrieval of all blobs)
    all_blobs: vector<BlobRecord>,
}

/// Error codes
const E_BLOB_ID_EMPTY: u64 = 0;
const E_BLOB_NOT_FOUND: u64 = 1;

/// Initialize blob storage registry
fun init(ctx: &mut TxContext) {
    let registry = BlobStorageRegistry {
        id: object::new(ctx),
        blobs: table::new(ctx),
        all_blobs: vector::empty(),
    };
    
    // Share the registry so anyone can read and write
    transfer::share_object(registry);
}

/// Test-only function to initialize blob storage for testing
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    let registry = BlobStorageRegistry {
        id: object::new(ctx),
        blobs: table::new(ctx),
        all_blobs: vector::empty(),
    };
    
    transfer::share_object(registry);
}

/// Store a blob ID with optional text
/// Called by users after uploading to Walrus
/// The user signs the transaction, and their address is mapped to the blobId
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `blob_id`: The Walrus blob ID (as vector<u8>)
/// - `text`: Optional text/description (can be empty vector for no text)
/// - `ctx`: Transaction context
/// 
/// # Returns:
/// - `()`: No return value
public fun store_blob(
    registry: &mut BlobStorageRegistry,
    blob_id: vector<u8>,
    text: vector<u8>,
    ctx: &mut TxContext,
) {
    // Validate blob_id is not empty
    assert!(vector::length(&blob_id) > 0, E_BLOB_ID_EMPTY);
    
    let sender = tx_context::sender(ctx);
    let timestamp = tx_context::epoch_timestamp_ms(ctx);
    
    // Create text option (Some if not empty, None if empty)
    let text_option = if (vector::length(&text) > 0) {
        option::some(text)
    } else {
        option::none()
    };
    
    // Create blob record
    let blob_record = BlobRecord {
        blob_id,
        text: text_option,
        timestamp,
    };
    
    // Check if user already has blobs stored
    if (table::contains(&registry.blobs, sender)) {
        // Add to existing vector
        let user_blobs = table::borrow_mut(&mut registry.blobs, sender);
        vector::push_back(user_blobs, blob_record);
    } else {
        // Create new vector for this user
        let mut new_blobs = vector::empty();
        vector::push_back(&mut new_blobs, blob_record);
        table::add(&mut registry.blobs, sender, new_blobs);
    };
    
    // Also add to all_blobs vector for easy retrieval
    vector::push_back(&mut registry.all_blobs, blob_record);
}

/// Get all blob records for a user address
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `user_address`: The user's address
/// 
/// # Returns:
/// - `vector<BlobRecord>`: Vector of blob records for the user
public fun get_user_blobs(
    registry: &BlobStorageRegistry,
    user_address: address,
): vector<BlobRecord> {
    if (table::contains(&registry.blobs, user_address)) {
        *table::borrow(&registry.blobs, user_address)
    } else {
        vector::empty()
    }
}

/// Get blob record at index for a user
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `user_address`: The user's address
/// - `index`: Index of the blob record (0-based)
/// 
/// # Returns:
/// - `Option<BlobRecord>`: The blob record if found, None otherwise
public fun get_user_blob_at_index(
    registry: &BlobStorageRegistry,
    user_address: address,
    index: u64,
): Option<BlobRecord> {
    if (table::contains(&registry.blobs, user_address)) {
        let blobs = table::borrow(&registry.blobs, user_address);
        let len = vector::length(blobs);
        if (index < len) {
            option::some(*vector::borrow(blobs, index))
        } else {
            option::none()
        }
    } else {
        option::none()
    }
}

/// Get the latest blob record for a user
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `user_address`: The user's address
/// 
/// # Returns:
/// - `Option<BlobRecord>`: The latest blob record if found, None otherwise
public fun get_latest_user_blob(
    registry: &BlobStorageRegistry,
    user_address: address,
): Option<BlobRecord> {
    if (table::contains(&registry.blobs, user_address)) {
        let blobs = table::borrow(&registry.blobs, user_address);
        let len = vector::length(blobs);
        if (len > 0) {
            option::some(*vector::borrow(blobs, len - 1))
        } else {
            option::none()
        }
    } else {
        option::none()
    }
}

/// Get blob count for a user
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `user_address`: The user's address
/// 
/// # Returns:
/// - `u64`: Number of blobs stored by the user
public fun get_user_blob_count(
    registry: &BlobStorageRegistry,
    user_address: address,
): u64 {
    if (table::contains(&registry.blobs, user_address)) {
        vector::length(table::borrow(&registry.blobs, user_address))
    } else {
        0
    }
}

/// Check if user has any blobs stored
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// - `user_address`: The user's address
/// 
/// # Returns:
/// - `bool`: True if user has blobs, false otherwise
public fun user_has_blobs(
    registry: &BlobStorageRegistry,
    user_address: address,
): bool {
    table::contains(&registry.blobs, user_address) && 
    vector::length(table::borrow(&registry.blobs, user_address)) > 0
}

// BlobRecord getter functions
public fun get_blob_record_blob_id(record: &BlobRecord): vector<u8> { record.blob_id }
public fun get_blob_record_text(record: &BlobRecord): Option<vector<u8>> { record.text }
public fun get_blob_record_timestamp(record: &BlobRecord): u64 { record.timestamp }

/// Check if blob record has text
/// 
/// # Arguments:
/// - `record`: The blob record
/// 
/// # Returns:
/// - `bool`: True if text exists, false otherwise
public fun blob_record_has_text(record: &BlobRecord): bool {
    option::is_some(&record.text)
}

/// Get text from blob record (returns empty vector if no text)
/// 
/// # Arguments:
/// - `record`: The blob record
/// 
/// # Returns:
/// - `vector<u8>`: The text content, or empty vector if no text
public fun get_blob_record_text_content(record: &BlobRecord): vector<u8> {
    if (option::is_some(&record.text)) {
        *option::borrow(&record.text)
    } else {
        vector::empty()
    }
}

/// Get all blob records stored in the registry
/// Returns all blobs from all users
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// 
/// # Returns:
/// - `vector<BlobRecord>`: Vector of all blob records
public fun get_all_blobs(
    registry: &BlobStorageRegistry,
): vector<BlobRecord> {
    registry.all_blobs
}

/// Get total count of all blobs stored
/// 
/// # Arguments:
/// - `registry`: The blob storage registry
/// 
/// # Returns:
/// - `u64`: Total number of blobs stored by all users
public fun get_total_blob_count(
    registry: &BlobStorageRegistry,
): u64 {
    vector::length(&registry.all_blobs)
}

