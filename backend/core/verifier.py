"""
Document Authenticity Verification Engine
DocuTrace - Separate Verification Module for Certificates & Official Records
"""

from typing import Dict, Any, List
from .preprocessor import inspect_anomalies

# Pre-registered trusted issuer signatures / fingerprints for certificates
TRUSTED_ISSUERS = {
    "docutrace_university": {
        "name": "DocuTrace State University",
        "domain": "docutrace.edu",
        "valid_signature_keys": ["DTU-SECURE-SIG-2025", "DTU-REGISTRAR-VALIDATED"],
        "expected_producer": ["LaTeX with hyperref", "Adobe Acrobat Pro", "DocuTrace Certify Engine"]
    },
    "national_board": {
        "name": "National Board of Higher Education",
        "domain": "nbhe.gov.in",
        "valid_signature_keys": ["NBHE-DIGISIG-KEY-V2"],
        "expected_producer": ["Government Digital Signature Provider", "Adobe Acrobat"]
    }
}


def verify_document_authenticity(
    filename: str,
    raw_text: str,
    metadata: Dict[str, Any],
    file_bytes: bytes = b""
) -> Dict[str, Any]:
    """
    Performs multi-vector authenticity analysis on a document.
    
    Checks:
      1. Digital signature detection (PDF / ByteRange)
      2. Metadata consistency and timestamp sanity
      3. Character evasion / homoglyph injection detection
      4. Issuer verification against trusted authority registry
    """
    findings: List[Dict[str, Any]] = []
    trust_score = 100
    risk_level = "GENUINE"

    # 1. Text Anomaly & Evasion Scanning
    anomalies = inspect_anomalies(raw_text)
    
    if anomalies["zero_width_count"] > 0:
        deduction = min(35, anomalies["zero_width_count"] * 5)
        trust_score -= deduction
        findings.append({
            "code": "ZWSP_EVASION",
            "severity": "CRITICAL",
            "title": "Hidden Zero-Width Characters Detected",
            "detail": f"Found {anomalies['zero_width_count']} invisible characters (e.g., Zero-Width Space). This technique is commonly used to alter document hashes or fool plagiarism engines.",
            "samples": anomalies["zero_width_details"]
        })

    if anomalies["homoglyph_count"] > 0:
        deduction = min(40, anomalies["homoglyph_count"] * 8)
        trust_score -= deduction
        findings.append({
            "code": "HOMOGLYPH_SPOOFING",
            "severity": "CRITICAL",
            "title": "Unicode Homoglyph Spoofing Detected",
            "detail": f"Found {anomalies['homoglyph_count']} Cyrillic or Greek lookalike characters embedded in Latin words.",
            "samples": anomalies["homoglyph_details"]
        })

    # 2. Digital Signature Inspection (PDF byte inspection)
    has_digital_signature = False
    sig_details = "No digital signature dictionary present."
    
    if file_bytes:
        if b"/ByteRange" in file_bytes and (b"/Contents" in file_bytes or b"/Sig" in file_bytes):
            has_digital_signature = True
            sig_details = "Embedded PKCS#7 / Adobe cryptographic signature block detected."
            findings.append({
                "code": "DIGITAL_SIG_PRESENT",
                "severity": "INFO",
                "title": "Cryptographic Digital Signature Found",
                "detail": sig_details
            })

    # 3. Metadata Consistency
    author = metadata.get("author", "Unknown")
    creator = metadata.get("creator", "Unknown")
    created_date = metadata.get("created_date", "")
    modified_date = metadata.get("modified_date", "")

    # Check date anomalies (if both dates are given)
    if created_date and modified_date:
        if modified_date < created_date and created_date != modified_date:
            trust_score -= 25
            findings.append({
                "code": "TIMESTAMP_PARADOX",
                "severity": "WARNING",
                "title": "Metadata Timestamp Inconsistency",
                "detail": f"Document modified date ({modified_date}) is older than creation date ({created_date}). This strongly suggests metadata tampering or backdating."
            })

    # Certificate specific heuristic:
    is_certificate_claimed = any(term in filename.lower() or term in raw_text.lower() for term in ["certificate", "transcript", "diploma", "award", "credentials"])
    
    if is_certificate_claimed:
        if not has_digital_signature:
            trust_score -= 15
            findings.append({
                "code": "CERT_NO_DIGISIG",
                "severity": "WARNING",
                "title": "Certificate Lacks Cryptographic Seal",
                "detail": "Document claims to be a certificate or official credential, but lacks an embedded digital signature or verifiable cryptographic seal."
            })

        # Check for trusted issuer mention in text
        matched_issuer = None
        for key, issuer in TRUSTED_ISSUERS.items():
            if issuer["name"].lower() in raw_text.lower() or issuer["domain"].lower() in raw_text.lower():
                matched_issuer = issuer
                break

        if matched_issuer:
            # Check if producer software matches expected institutional software
            producer = metadata.get("producer", "")
            matches_producer = any(ep.lower() in producer.lower() for ep in matched_issuer["expected_producer"])
            if producer and not matches_producer:
                trust_score -= 20
                findings.append({
                    "code": "ISSUER_PRODUCER_MISMATCH",
                    "severity": "WARNING",
                    "title": "Producer Tool Inconsistency with Claimed Issuer",
                    "detail": f"Claimed issuer '{matched_issuer['name']}' typically produces records via {matched_issuer['expected_producer']}, but document was produced using '{producer}'."
                })
            else:
                findings.append({
                    "code": "KNOWN_ISSUER_RECORD",
                    "severity": "INFO",
                    "title": f"Known Issuer Reference: {matched_issuer['name']}",
                    "detail": "Issuer found in system registry. Signatures and templates can be audited against official schema."
                })

    # Clamp trust score
    trust_score = max(0, min(100, trust_score))

    if trust_score >= 85:
        risk_level = "VERIFIED_GENUINE"
    elif trust_score >= 65:
        risk_level = "PROBABLE_GENUINE"
    elif trust_score >= 40:
        risk_level = "SUSPICIOUS_ANOMALIES"
    else:
        risk_level = "HIGH_RISK_ALTERED"

    return {
        "filename": filename,
        "trust_score": trust_score,
        "risk_level": risk_level,
        "has_digital_signature": has_digital_signature,
        "signature_details": sig_details,
        "anomaly_counts": {
            "zero_width": anomalies["zero_width_count"],
            "homoglyphs": anomalies["homoglyph_count"]
        },
        "findings": findings,
        "metadata_inspected": metadata
    }
