// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use crate::common::{to_signed_response, IntentScope, ProcessDataRequest, ProcessedDataResponse};
use crate::common::IntentMessage;
use crate::AppState;
use crate::EnclaveError;
use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use lazy_static::lazy_static;
use std::collections::HashMap;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MyMetrics {
    pub title: String,
    pub external_average_rating: f64,
    pub external_popularity_rank: i64,
    pub external_member_count: i64,
    pub queried_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MyAnimeRequest {
    pub name: String,
}

const CACHE_TTL_SECS: u64 = 300; // 5 minutes

lazy_static! {
    static ref CACHE: Mutex<HashMap<String, (u64, serde_json::Value)>> = Mutex::new(HashMap::new());
}

pub async fn process_data(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ProcessDataRequest<MyAnimeRequest>>,
) -> Result<Json<ProcessedDataResponse<IntentMessage<MyMetrics>>>, EnclaveError> {
    let name = request.payload.name.trim().to_string();
    if name.is_empty() {
        return Err(EnclaveError::GenericError("name required".to_string()));
    }

    let cache_key = format!("mal:{}", name.to_lowercase());
    // check cache
    if let Some((ts, cached)) = {
        let c = CACHE.lock().await;
        c.get(&cache_key).cloned()
    } {
        if current_secs() < ts + CACHE_TTL_SECS {
            // Convert cached attested response back to ProcessedDataResponse shape
            let pd: ProcessedDataResponse<IntentMessage<MyMetrics>> = serde_json::from_value(cached)
                .map_err(|e| EnclaveError::GenericError(format!("cache deserialize failed: {e}")))?;
            return Ok(Json(pd));
        }
    }

    let mal_api = std::env::var("MAL_API_URL").unwrap_or_else(|_| "https://api.myanimelist.net/v2".to_string());
    let client_id = std::env::var("MAL_CLIENT_ID").ok();
    let bearer = std::env::var("MAL_BEARER_TOKEN").ok();

    let mut url = match reqwest::Url::parse(&format!("{}/anime", mal_api)) {
        Ok(u) => u,
        Err(e) => return Err(EnclaveError::GenericError(format!("invalid MAL_API_URL: {e}"))),
    };
    url.query_pairs_mut()
        .append_pair("q", &name)
        .append_pair("limit", "1")
        .append_pair("fields", "mean,popularity,num_list_users");

    let client = reqwest::Client::new();
    let mut req_builder = client.get(url);
    if let Some(cid) = client_id {
        req_builder = req_builder.header("X-MAL-Client-ID", cid);
    } else if let Some(token) = bearer {
        req_builder = req_builder.bearer_auth(token);
    }

    let resp = req_builder
        .send()
        .await
        .map_err(|e| EnclaveError::GenericError(format!("Failed to request MAL: {e}")))?;

    if !resp.status().is_success() {
        return Err(EnclaveError::GenericError(format!("MAL returned status {}", resp.status())));
    }

    let json_body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| EnclaveError::GenericError(format!("Failed to parse MAL JSON: {e}")))?;

    let data0 = json_body
        .get("data")
        .and_then(|d| d.get(0))
        .and_then(|n| n.get("node"))
        .cloned()
        .unwrap_or_default();

    let mean = data0.get("mean").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let popularity = data0.get("popularity").and_then(|v| v.as_i64()).unwrap_or(0);
    let num_list_users = data0.get("num_list_users").and_then(|v| v.as_i64()).unwrap_or(0);
    let title = data0.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();

    let metrics = MyMetrics {
        title: title.clone(),
        external_average_rating: mean,
        external_popularity_rank: popularity,
        external_member_count: num_list_users,
        queried_name: name.clone(),
    };

    let timestamp_ms = current_millis() as u64;
    let signed = to_signed_response(&state.eph_kp, metrics.clone(), timestamp_ms, IntentScope::ProcessData);

    // cache the serialized signed response
    let serialized = serde_json::to_value(&signed).map_err(|e| EnclaveError::GenericError(format!("serialize failed: {e}")))?;
    {
        let mut c = CACHE.lock().await;
        c.insert(cache_key, (current_secs(), serialized.clone()));
    }

    Ok(Json(signed))
}

fn current_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

fn current_millis() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AppState;
    use fastcrypto::ed25519::Ed25519KeyPair;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_signature_roundtrip() {
        let state = Arc::new(AppState {
            eph_kp: Ed25519KeyPair::generate(&mut rand::thread_rng()),
            api_key: "".to_string(),
        });

        let req = ProcessDataRequest { payload: MyAnimeRequest { name: "Test".to_string() } };
        // We won't call MAL in unit test; instead create metrics and sign directly to ensure no panic.
        let metrics = MyMetrics {
            title: "Test".to_string(),
            external_average_rating: 8.5,
            external_popularity_rank: 123,
            external_member_count: 1000,
            queried_name: "test".to_string(),
        };
        let signed = to_signed_response(&state.eph_kp, metrics, current_millis() as u64, IntentScope::ProcessData);
        assert!(!signed.signature.is_empty());
    }
}
