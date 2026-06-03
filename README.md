# Helium Password Manager

A privacy-first desktop password manager built with React, Rust, and Tauri.

Helium stores your passwords locally on your device and encrypts them using multiple layers of modern cryptography, including post-quantum security technologies. No cloud storage. No remote servers. No subscriptions. Your vault stays under your control.

## Features

- Local-first password storage
- Strong master password protection using Argon2id
- Post-quantum encryption using ML-KEM-768
- AES-256-GCM authenticated encryption
- Password generator
- AutoType support
- Password strength analysis
- Search and organization tools
- Cross-platform desktop application
- Windows, macOS, and Linux support

## Why Helium?

Most password managers rely on cloud infrastructure and remote servers. Helium takes a different approach.

Your encrypted vault is stored entirely on your computer. Nothing is uploaded to a company server, and no third party can access your data remotely.

You only need to remember one master password. Helium securely stores the rest.

## Security Architecture

### 1. Argon2id Key Derivation

Your master password is transformed into a cryptographic key using Argon2id, a memory-hard algorithm designed to resist brute-force attacks.

Current parameters:

- Iterations: 3
- Memory: 19,456 KB
- Parallelism: 4

### 2. ML-KEM-768 Post-Quantum Security

Helium uses ML-KEM-768 (formerly Kyber) to generate a quantum-resistant shared secret.

This layer is designed to remain secure even against future quantum computing attacks.

### 3. AES-256-GCM Encryption

The final encryption key is used to protect your vault data with AES-256-GCM, providing both confidentiality and integrity protection.

## Technology Stack

### Frontend

- React
- Vite
- JavaScript

### Backend

- Rust

### Desktop Framework

- Tauri

### Cryptography

- Argon2id
- ML-KEM-768
- AES-256-GCM

## Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/helium.git
cd helium
```

### Install dependencies

```bash
npm install
```

### Start development mode

```bash
npm run tauri dev
```

## Building

```bash
npm run tauri build
```

## Vault Storage

Vault files are stored locally inside a hidden `.helium` directory in the user's home folder.

### Windows

```text
C:\Users\Username\.helium\
```

### macOS

```text
/Users/Username/.helium/
```

### Linux

```text
/home/Username/.helium/
```

## AutoType

Helium includes an AutoType engine that can automatically enter usernames and passwords into login forms.

Supported commands:

```text
USERNAME
PASSWORD
TAB
ENTER
SLEEP 500
```

Example sequence:

```text
USERNAME TAB PASSWORD ENTER
```

## Backup Recommendations

Regularly back up your `.helium` directory.

Without a backup, a lost vault file cannot be recovered.

## Important Notes

- Helium does not sync data to the cloud.
- Helium cannot recover forgotten master passwords.
- All encryption and decryption happen locally.
- You are responsible for backing up your vault file.

## Development

```bash
# Frontend
npm run dev

# Desktop app
npm run tauri dev
```

## License

MIT License

See the LICENSE file for details.
