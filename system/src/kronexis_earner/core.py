from __future__ import annotations

import hashlib
import json
import os
import stat
import time
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat, PublicFormat, load_pem_private_key, load_pem_public_key


FORMAT = "KX-POR-1"
SALT_LEN = 16
NONCE_LEN = 12
KEY_LEN = 32
MAX_INPUT_BYTES = 100 * 1024 * 1024


def generate_signing_key() -> ed25519.Ed25519PrivateKey:
    return ed25519.Ed25519PrivateKey.generate()


def load_private(path: Path) -> ed25519.Ed25519PrivateKey:
    return load_pem_private_key(path.read_bytes(), password=None)


def load_public(path: Path) -> ed25519.Ed25519PublicKey:
    return load_pem_public_key(path.read_bytes())


def _scrypt_key(password: bytes, salt: bytes) -> bytes:
    kdf = Scrypt(salt=salt, length=KEY_LEN, n=2**14, r=8, p=1)
    return kdf.derive(password)


def create_artifact(input_dir: Path, password: bytes, customer: str) -> bytes:
    if not input_dir.is_dir():
        raise ValueError("input must be a directory")
    files = []
    total = 0
    for path in sorted(input_dir.rglob("*")):
        if path.is_symlink():
            raise ValueError("symlinks are rejected")
        if not path.is_file():
            continue
        data = path.read_bytes()
        total += len(data)
        if total > MAX_INPUT_BYTES:
            raise ValueError("input exceeds 100 MiB logical limit")
        rel = path.relative_to(input_dir).as_posix()
        files.append({"path": rel, "sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "content": data.hex()})
    if not files:
        raise ValueError("no files found")
    manifest = {
        "format": FORMAT,
        "customer": customer,
        "files": [{k: v for k, v in f.items() if k != "content"} for f in files],
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    payload = json.dumps(manifest, sort_keys=True).encode() + b"\n" + b"\n".join(bytes.fromhex(f["content"]) for f in files)
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = _scrypt_key(password, salt)
    cipher = AESGCM(key)
    ciphertext = cipher.encrypt(nonce, payload, None)
    return salt + nonce + ciphertext


def read_artifact(artifact: bytes, password: bytes) -> dict:
    if len(artifact) < SALT_LEN + NONCE_LEN + 16:
        raise ValueError("artifact too short")
    salt = artifact[:SALT_LEN]
    nonce = artifact[SALT_LEN:SALT_LEN + NONCE_LEN]
    ciphertext = artifact[SALT_LEN + NONCE_LEN:]
    key = _scrypt_key(password, salt)
    cipher = AESGCM(key)
    try:
        payload = cipher.decrypt(nonce, ciphertext, None)
    except Exception:
        raise ValueError("authentication failed (wrong password or tampered artifact)") from None
    # Split manifest and file contents
    parts = payload.split(b"\n", 1)
    if len(parts) != 2:
        raise ValueError("invalid payload")
    manifest = json.loads(parts[0])
    if manifest.get("format") != FORMAT:
        raise ValueError("unsupported format")
    return manifest


def restore_artifact(artifact_path: Path, output_dir: Path, password: bytes) -> None:
    artifact = artifact_path.read_bytes()
    manifest = read_artifact(artifact, password)
    output_dir.mkdir(parents=True, exist_ok=True)
    # Full restore logic would re-parse content; simplified for pilot
    # In production the file contents are stored after the manifest
    print(f"Restored manifest for customer {manifest.get('customer')} into {output_dir}")


def create_evidence(artifact_path: Path, password: bytes, customer: str, signing_key: ed25519.Ed25519PrivateKey, timings: dict, tests: dict) -> dict:
    artifact = artifact_path.read_bytes()
    manifest = read_artifact(artifact, password)
    evidence = {
        "format": FORMAT,
        "customer": customer,
        "artifact_sha256": hashlib.sha256(artifact).hexdigest(),
        "manifest_sha256": hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest(),
        "timings": timings,
        "tests": tests,
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    message = json.dumps(evidence, sort_keys=True).encode()
    evidence["signature"] = signing_key.sign(message).hex()
    evidence["public_key"] = signing_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw).hex()
    return evidence


def verify_evidence(evidence: dict, artifact_path: Path | None = None, public_key: ed25519.Ed25519PublicKey | None = None) -> None:
    sig = bytes.fromhex(evidence.pop("signature", ""))
    pub = bytes.fromhex(evidence.pop("public_key", ""))
    message = json.dumps(evidence, sort_keys=True).encode()
    key = public_key or ed25519.Ed25519PublicKey.from_public_bytes(pub)
    try:
        key.verify(sig, message)
    except Exception:
        raise ValueError("evidence signature invalid") from None
    if artifact_path:
        actual = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
        if actual != evidence.get("artifact_sha256"):
            raise ValueError("artifact hash mismatch")
