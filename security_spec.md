# Security Specification

## 1. Data Invariants
- An employee profile cannot exist without a valid institutionId.
- Roles represent static configuration and are read-only for public clients.
- Users profile records must contain required keys (`uid`, `role`, `email`).
- Audit logs are append-only; deleting or updating logs is prohibited.

## 2. The Dirty Dozen Payloads
- **Payload 1 (Identity Spoofing)**: Employee creation with unauthorized `id`.
- **Payload 2 (State Shortcutting)**: Employee with empty required fields.
- **Payload 3 (Resource Poisoning)**: Extremely large strings injected into the `biometricId`.
- **Payload 4 (Orphaned Record)**: Employee with a missing `institutionId`.
- **Payload 5 (Audit Log Mutation)**: Deleting an existing audit log.
- **Payload 6 (Audit Log Modification)**: Modifying a timestamp after log write.
- **Payload 7 (Role Injection)**: Creating a self-assigned Role document.
- **Payload 8 (User Registration Privilege Escalation)**: Public client updating roles to Admin.
- **Payload 9 (Malformed Gender)**: Incompatible Enum string for Employee Gender.
- **Payload 10 (Float Basic Pay Corruption)**: Negative basic pay value.
- **Payload 11 (PII Leak)**: Reading users index without credentials.
- **Payload 12 (Denial of Wallet)**: Massive 1KB document IDs bypassing standard validation.

## 3. Test Runner Schema
All security invariants are verified against permission rules. Because operations are synchronized asynchronously in the background from a trusted server-side instance, we configure security rules supporting this clean pipeline.
