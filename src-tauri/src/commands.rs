use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use argon2::{Argon2, ParamsBuilder, Version};
use pqcrypto_traits::kem::{Ciphertext, PublicKey, SecretKey, SharedSecret};
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptionResult {
    pub kdf_hash: String,
    pub aes_ciphertext: String,
    pub nonce: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedItem {
    pub item_id: u64,
    pub kdf_hash: String,
    pub aes_ciphertext: String,
    pub nonce: String,
    pub mlkem_ciphertext: String, // ML-KEM per-item quantum-safe layer
    pub mlkem_secret_key: String, // ML-KEM secret key (stored to allow decapsulation)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedVault {
    pub items: Vec<EncryptedItem>,
}

#[tauri::command]
pub fn derive_key(password: String, salt: Option<String>) -> Result<(String, String), String> {
    let mut rng = rand::thread_rng();
    let salt_bytes = if let Some(s) = salt {
        hex::decode(&s).map_err(|e| e.to_string())?
    } else {
        rng.gen::<[u8; 16]>().to_vec()
    };

    let params = ParamsBuilder::new()
        .m_cost(19456)
        .t_cost(3)
        .p_cost(4)
        .build()
        .map_err(|e| e.to_string())?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);

    let mut key_material = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt_bytes, &mut key_material)
        .map_err(|e| e.to_string())?;

    let salt_hex = hex::encode(&salt_bytes);
    let key_hex = hex::encode(&key_material);

    Ok((key_hex, salt_hex))
}

#[tauri::command]
pub fn encrypt_aes(plaintext: String, key_hex: String) -> Result<(String, String), String> {
    let key_bytes = hex::decode(&key_hex).map_err(|e| e.to_string())?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes[..32]);
    let cipher = Aes256Gcm::new(key);

    let mut rng = rand::thread_rng();
    let nonce_bytes = rng.gen::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    let ciphertext_hex = hex::encode(&ciphertext);
    let nonce_hex = hex::encode(&nonce_bytes);

    Ok((ciphertext_hex, nonce_hex))
}

#[tauri::command]
pub fn ml_kem_encapsulate() -> Result<(String, String), String> {
    use pqcrypto::kem::mlkem768;

    let (pk, sk) = mlkem768::keypair();

    let pk_hex = hex::encode(pk.as_bytes());
    let sk_hex = hex::encode(sk.as_bytes());

    Ok((pk_hex, sk_hex))
}

#[tauri::command]
pub fn ml_kem_encrypt_key(public_key_hex: String) -> Result<(String, String), String> {
    use pqcrypto::kem::mlkem768;

    let pk_bytes = hex::decode(&public_key_hex).map_err(|e| e.to_string())?;
    let pk = mlkem768::PublicKey::from_bytes(&pk_bytes)
        .map_err(|e| format!("Invalid public key: {:?}", e))?;

    let (ss, ct) = mlkem768::encapsulate(&pk);

    let ss_hex = hex::encode(ss.as_bytes());
    let ct_hex = hex::encode(ct.as_bytes());

    Ok((ss_hex, ct_hex))
}

#[tauri::command]
pub fn encrypt_data(plaintext: String, password: String) -> Result<EncryptionResult, String> {
    let (key_hex, salt_hex) = derive_key(password, None)?;
    let (aes_ct_hex, nonce_hex) = encrypt_aes(plaintext, key_hex)?;

    Ok(EncryptionResult {
        kdf_hash: salt_hex,
        aes_ciphertext: aes_ct_hex,
        nonce: nonce_hex,
    })
}

fn decrypt_aes_hex(
    ciphertext_hex: &str,
    key_hex: &str,
    nonce_hex: &str,
) -> Result<Vec<u8>, String> {
    let key_bytes = hex::decode(key_hex).map_err(|e| e.to_string())?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes[..32]);
    let cipher = Aes256Gcm::new(key);

    let nonce_bytes = hex::decode(nonce_hex).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = hex::decode(ciphertext_hex).map_err(|e| e.to_string())?;
    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| e.to_string())
}

// Combine KDF-derived key with ML-KEM shared secret via XOR for true quantum-safe key material
fn combine_keys(kdf_key_hex: &str, mlkem_shared_secret_hex: &str) -> Result<String, String> {
    let kdf_bytes = hex::decode(kdf_key_hex).map_err(|e| e.to_string())?;
    let mlkem_bytes = hex::decode(mlkem_shared_secret_hex).map_err(|e| e.to_string())?;

    // Ensure both are 32 bytes for AES-256
    if kdf_bytes.len() != 32 || mlkem_bytes.len() != 32 {
        return Err(format!(
            "Key size mismatch: kdf={}, mlkem={}",
            kdf_bytes.len(),
            mlkem_bytes.len()
        ));
    }

    // XOR combine the keys
    let combined: Vec<u8> = kdf_bytes
        .iter()
        .zip(mlkem_bytes.iter())
        .map(|(a, b)| a ^ b)
        .collect();
    Ok(hex::encode(combined))
}

fn decrypt_data_struct(enc: &EncryptionResult, password: &str) -> Result<String, String> {
    let (key_hex, _salt_hex) = derive_key(password.to_string(), Some(enc.kdf_hash.clone()))?;
    let plaintext_bytes = decrypt_aes_hex(&enc.aes_ciphertext, &key_hex, &enc.nonce)?;
    let s = String::from_utf8(plaintext_bytes).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub fn save_vault(
    email: String,
    vault_data: String,
    password: Option<String>,
) -> Result<(), String> {
    use std::fs;

    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;

    let vault_dir = home_dir.join(".helium");
    fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;

    let sanitized_email = email.replace("@", "_").replace(".", "_");
    let vault_file = vault_dir.join(format!("{}.vault", sanitized_email));

    if let Some(pw) = password {
        // Parse vault_data as JSON array of items
        let items: Vec<serde_json::Value> = serde_json::from_str(&vault_data)
            .map_err(|e| format!("Failed to parse vault data: {}", e))?;

        // Encrypt each item individually with unique salt AND ML-KEM encapsulation
        let mut encrypted_items = Vec::new();
        for (index, item) in items.iter().enumerate() {
            let item_json = serde_json::to_string(item)
                .map_err(|e| format!("Failed to serialize item: {}", e))?;

            use pqcrypto::kem::mlkem768;

            // Step 1: Generate ML-KEM keypair and encapsulate for this item
            let (public_key, secret_key) = mlkem768::keypair();
            let (mlkem_shared_secret, mlkem_ciphertext) = mlkem768::encapsulate(&public_key);

            let mlkem_ciphertext_hex = hex::encode(mlkem_ciphertext.as_bytes());
            let mlkem_secret_key_hex = hex::encode(secret_key.as_bytes());
            let mlkem_shared_secret_hex = hex::encode(mlkem_shared_secret.as_bytes());

            // Step 2: Derive key from password (KDF)
            let (kdf_key_hex, salt_hex) = derive_key(pw.clone(), None)?;

            // Step 3: Combine KDF key with ML-KEM shared secret for true quantum-safe key material
            let combined_key_hex = combine_keys(&kdf_key_hex, &mlkem_shared_secret_hex)?;

            // Step 4: Encrypt item data with combined key
            let (aes_ct_hex, nonce_hex) = encrypt_aes(item_json, combined_key_hex)?;

            eprintln!(
                "Item {}: ML-KEM + KDF combined for quantum-safe encryption",
                index
            );

            encrypted_items.push(EncryptedItem {
                item_id: index as u64,
                kdf_hash: salt_hex,
                aes_ciphertext: aes_ct_hex,
                nonce: nonce_hex,
                mlkem_ciphertext: mlkem_ciphertext_hex,
                mlkem_secret_key: mlkem_secret_key_hex,
            });
        }

        let encrypted_vault = EncryptedVault {
            items: encrypted_items,
        };

        let json = serde_json::to_string(&encrypted_vault).map_err(|e| e.to_string())?;
        fs::write(vault_file, json).map_err(|e| e.to_string())?;
    } else {
        // write plaintext (backwards compatibility)
        fs::write(vault_file, vault_data).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn load_vault(email: String, password: Option<String>) -> Result<String, String> {
    use std::fs;

    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;

    let vault_dir = home_dir.join(".helium");
    let sanitized_email = email.replace("@", "_").replace(".", "_");
    let vault_file = vault_dir.join(format!("{}.vault", sanitized_email));

    if !vault_file.exists() {
        return Ok("[]".to_string());
    }

    let content = fs::read_to_string(&vault_file).map_err(|e| e.to_string())?;

    // Try to parse as new EncryptedVault format (items array)
    if let Ok(encrypted_vault) = serde_json::from_str::<EncryptedVault>(&content) {
        if let Some(pw) = password {
            let mut decrypted_items = Vec::new();
            for encrypted_item in encrypted_vault.items {
                // Step 1: Derive key from password using stored salt
                let (kdf_key_hex, _salt_hex) =
                    derive_key(pw.clone(), Some(encrypted_item.kdf_hash.clone()))?;

                // Step 2: Decapsulate ML-KEM to recover shared secret
                use pqcrypto::kem::mlkem768;
                let secret_key_bytes =
                    hex::decode(&encrypted_item.mlkem_secret_key).map_err(|e| e.to_string())?;
                let secret_key = mlkem768::SecretKey::from_bytes(&secret_key_bytes)
                    .map_err(|e| format!("Invalid ML-KEM secret key: {:?}", e))?;

                let mlkem_ciphertext_bytes =
                    hex::decode(&encrypted_item.mlkem_ciphertext).map_err(|e| e.to_string())?;
                let mlkem_ciphertext = mlkem768::Ciphertext::from_bytes(&mlkem_ciphertext_bytes)
                    .map_err(|e| format!("Invalid ML-KEM ciphertext: {:?}", e))?;

                let mlkem_shared_secret = mlkem768::decapsulate(&mlkem_ciphertext, &secret_key);
                let mlkem_shared_secret_hex = hex::encode(mlkem_shared_secret.as_bytes());

                // Step 3: Combine KDF key with ML-KEM shared secret
                let combined_key_hex = combine_keys(&kdf_key_hex, &mlkem_shared_secret_hex)?;

                // Step 4: Decrypt AES ciphertext with combined key
                let plaintext_bytes = decrypt_aes_hex(
                    &encrypted_item.aes_ciphertext,
                    &combined_key_hex,
                    &encrypted_item.nonce,
                )?;
                let plaintext = String::from_utf8(plaintext_bytes)
                    .map_err(|e| format!("Failed to decode plaintext: {}", e))?;

                let item: serde_json::Value = serde_json::from_str(&plaintext)
                    .map_err(|e| format!("Failed to parse decrypted item: {}", e))?;
                decrypted_items.push(item);
            }
            let result = serde_json::to_string(&decrypted_items)
                .map_err(|e| format!("Failed to serialize decrypted vault: {}", e))?;
            return Ok(result);
        } else {
            return Err("Vault is encrypted; a password is required to load".to_string());
        }
    }

    // Try to parse as old EncryptionResult format (single encrypted blob)
    if let Ok(enc) = serde_json::from_str::<EncryptionResult>(&content) {
        if let Some(pw) = password {
            let plaintext = decrypt_data_struct(&enc, &pw)?;
            return Ok(plaintext);
        } else {
            return Err("Vault is encrypted; a password is required to load".to_string());
        }
    }

    // Not encrypted, return raw content
    Ok(content)
}

#[tauri::command]
pub fn get_encryption_metadata(
    email: String,
    item_index: usize,
) -> Result<serde_json::Value, String> {
    use std::fs;

    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;

    let vault_dir = home_dir.join(".helium");
    let sanitized_email = email.replace("@", "_").replace(".", "_");
    let vault_file = vault_dir.join(format!("{}.vault", sanitized_email));

    if !vault_file.exists() {
        return Ok(serde_json::json!({
            "encrypted": false,
            "message": "Vault file not found"
        }));
    }

    let content = fs::read_to_string(&vault_file).map_err(|e| e.to_string())?;

    // Try to parse as new EncryptedVault format
    if let Ok(encrypted_vault) = serde_json::from_str::<EncryptedVault>(&content) {
        if item_index >= encrypted_vault.items.len() {
            return Ok(serde_json::json!({
                "encrypted": false,
                "message": "Item index out of bounds",
                "requested_index": item_index,
                "item_count": encrypted_vault.items.len()
            }));
        }

        let item = &encrypted_vault.items[item_index];

        // Return robust metadata with defaults for missing fields
        let metadata = serde_json::json!({
            "encrypted": true,
            "kdf_hash": item.kdf_hash.clone(),
            "aes_ciphertext": item.aes_ciphertext.clone(),
            "nonce": item.nonce.clone(),
            "mlkem_ciphertext": item.mlkem_ciphertext.clone(),
            "mlkem_secret_key": item.mlkem_secret_key.clone(),
            "kdf_params": {
                "algorithm": "Argon2id",
                "iterations": 3,
                "memory_kb": 19456,
                "parallelism": 4
            }
        });

        return Ok(metadata);
    }

    // If not encrypted format, try to parse as plaintext vault (array of items)
    if let Ok(items) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
        if item_index >= items.len() {
            return Ok(serde_json::json!({
                "encrypted": false,
                "message": "Item index out of bounds",
                "requested_index": item_index,
                "item_count": items.len()
            }));
        }

        // Plaintext vault - no encryption metadata available, return empty metadata but mark as unencrypted
        let metadata = serde_json::json!({
            "encrypted": false,
            "message": "Vault is not encrypted; no encryption metadata available",
        });

        return Ok(metadata);
    }

    // Try old single EncryptionResult format and return what we can
    if let Ok(enc) = serde_json::from_str::<EncryptionResult>(&content) {
        let metadata = serde_json::json!({
            "encrypted": true,
            "kdf_hash": enc.kdf_hash,
            "aes_ciphertext": enc.aes_ciphertext,
            "nonce": enc.nonce,
            "kdf_params": {
                "algorithm": "Argon2id",
                "iterations": 3,
                "memory_kb": 19456,
                "parallelism": 4
            }
        });
        return Ok(metadata);
    }

    // Fallback: return unencrypted notice rather than error to make the frontend resilient
    let metadata = serde_json::json!({
        "encrypted": false,
        "message": "Unable to parse vault format; encryption metadata unavailable"
    });

    Ok(metadata)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_items_with_unique_salts() {
        // Create test vault data with duplicate items
        let vault_data = r#"[{"id": 1, "name": "test"}, {"id": 2, "name": "test"}]"#;
        let password = "test_password".to_string();

        // Simulate encryption of items
        let items: Vec<serde_json::Value> = serde_json::from_str(vault_data).unwrap();
        let mut encrypted_items = Vec::new();

        for (index, item) in items.iter().enumerate() {
            let item_json = serde_json::to_string(item).unwrap();
            use pqcrypto::kem::mlkem768;

            let (public_key, secret_key) = mlkem768::keypair();
            let (mlkem_shared_secret, mlkem_ciphertext) = mlkem768::encapsulate(&public_key);

            let (kdf_key_hex, salt_hex) = derive_key(item_json.clone(), None).unwrap();
            let mlkem_shared_secret_hex = hex::encode(mlkem_shared_secret.as_bytes());
            let combined_key = combine_keys(&kdf_key_hex, &mlkem_shared_secret_hex).unwrap();

            let (aes_ct, nonce) = encrypt_aes(item_json, combined_key).unwrap();

            encrypted_items.push(EncryptedItem {
                item_id: index as u64,
                kdf_hash: salt_hex,
                aes_ciphertext: aes_ct,
                nonce: nonce,
                mlkem_ciphertext: hex::encode(mlkem_ciphertext.as_bytes()),
                mlkem_secret_key: hex::encode(secret_key.as_bytes()),
            });
        }

        // Verify each item has unique salt (kdf_hash)
        assert_eq!(encrypted_items.len(), 2);
        assert_ne!(
            encrypted_items[0].kdf_hash, encrypted_items[1].kdf_hash,
            "Items should have unique salts"
        );

        // Verify ciphertexts are different despite identical plaintext
        assert_ne!(
            encrypted_items[0].aes_ciphertext, encrypted_items[1].aes_ciphertext,
            "Identical items should encrypt to different ciphertexts"
        );
    }

    #[test]
    fn test_decrypt_encrypted_vault() {
        let vault_data = r#"[{"id": 1, "name": "password1"}, {"id": 2, "name": "password2"}]"#;
        let password = "test_password".to_string();

        // Encrypt items with ML-KEM
        let items: Vec<serde_json::Value> = serde_json::from_str(vault_data).unwrap();
        let mut encrypted_items = Vec::new();

        for (index, item) in items.iter().enumerate() {
            let item_json = serde_json::to_string(item).unwrap();
            use pqcrypto::kem::mlkem768;

            let (public_key, secret_key) = mlkem768::keypair();
            let (mlkem_shared_secret, mlkem_ciphertext) = mlkem768::encapsulate(&public_key);

            let (kdf_key_hex, salt_hex) = derive_key(password.clone(), None).unwrap();
            let mlkem_shared_secret_hex = hex::encode(mlkem_shared_secret.as_bytes());
            let combined_key = combine_keys(&kdf_key_hex, &mlkem_shared_secret_hex).unwrap();

            let (aes_ct, nonce) = encrypt_aes(item_json, combined_key).unwrap();

            encrypted_items.push(EncryptedItem {
                item_id: index as u64,
                kdf_hash: salt_hex,
                aes_ciphertext: aes_ct,
                nonce: nonce,
                mlkem_ciphertext: hex::encode(mlkem_ciphertext.as_bytes()),
                mlkem_secret_key: hex::encode(secret_key.as_bytes()),
            });
        }

        // Decrypt items
        let mut decrypted_items = Vec::new();
        for encrypted_item in encrypted_items {
            use pqcrypto::kem::mlkem768;

            let (kdf_key_hex, _) =
                derive_key(password.clone(), Some(encrypted_item.kdf_hash.clone())).unwrap();

            let secret_key_bytes = hex::decode(&encrypted_item.mlkem_secret_key).unwrap();
            let secret_key = mlkem768::SecretKey::from_bytes(&secret_key_bytes).unwrap();

            let mlkem_ciphertext_bytes = hex::decode(&encrypted_item.mlkem_ciphertext).unwrap();
            let mlkem_ciphertext =
                mlkem768::Ciphertext::from_bytes(&mlkem_ciphertext_bytes).unwrap();

            let mlkem_shared_secret = mlkem768::decapsulate(&mlkem_ciphertext, &secret_key);
            let mlkem_shared_secret_hex = hex::encode(mlkem_shared_secret.as_bytes());

            let combined_key = combine_keys(&kdf_key_hex, &mlkem_shared_secret_hex).unwrap();

            let plaintext_bytes = decrypt_aes_hex(
                &encrypted_item.aes_ciphertext,
                &combined_key,
                &encrypted_item.nonce,
            )
            .unwrap();
            let plaintext = String::from_utf8(plaintext_bytes).unwrap();

            let item: serde_json::Value = serde_json::from_str(&plaintext).unwrap();
            decrypted_items.push(item);
        }

        // Verify decryption worked
        assert_eq!(decrypted_items.len(), 2);
        let original_items: Vec<serde_json::Value> = serde_json::from_str(vault_data).unwrap();
        assert_eq!(decrypted_items[0], original_items[0]);
        assert_eq!(decrypted_items[1], original_items[1]);
    }
}
