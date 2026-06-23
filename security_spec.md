# Security Specification & Threat Model (TDD Specs)

This document establishes the security invariants for Firestore collections in Project Lifeline. These rules are designed to prevent malicious users from altering other users' tasks, habits, or goals, or escalating privileges.

## 1. Data Invariants

- **User Isolation**: A user can only read and write their own documents under `users/{userId}/...`. They are forbidden from reading or writing other users' data.
- **Identity Integrity**: All documents under `users/{userId}/...` must be verified such that `request.auth.uid == userId`.
- **Verified Email Requirement**: Users must have a verified email token (`request.auth.token.email_verified == true`) to write data, protecting our database from unverified spoofing or bot registrations.
- **Size Enforcements**: To prevent "Denial of Wallet" resource exhaustion attacks, all string inputs like task/habit/goal titles and descriptions are strictly capped (e.g., titles under 256 characters, descriptions under 2048 characters).
- **Immutability**: Field values like `createdAt` must be immutable, and standard fields cannot be corrupted with arbitrary keys.

---

## 2. The "Dirty Dozen" Threat Payloads

Here are 12 specific payloads or actions designed to break Identity, Integrity, and State:

1. **Identity Spoofing (Cross-Tenant Create)**: Authenticated user `attacker_123` attempts to write a task under `/users/victim_456/tasks/task_1` setting `ownerId: "victim_456"`.
2. **PII Data Read Violation**: User `attacker_123` tries to list all documents under `/users/victim_456/tasks`.
3. **Ghost Field Injection (Shadow Update)**: User attempts to write a task with a "Ghost field" like `isSystemAdmin: true` or `bypassBilling: true`.
4. **Huge String Attack (Denial of Wallet)**: Injecting a 2MB string as a task title to bloat database size and costs.
5. **Path ID Poisoning**: Specifying an extremely long document ID `/users/victim_456/tasks/extremely_long_junk_id_over_128_chars...` to crash or exhaust index resources.
6. **Email Spoofing Bypass**: Attempting a write using an auth token where `email_verified` is `false`, bypassing our security standards.
7. **Invalid Type Poisoning**: Sending an integer where a string is expected (e.g., setting `title` to `42`).
8. **Invalid Enum Poisoning**: Setting task urgency to `"crucial"` instead of `"high"` or `"low"`.
9. **Progress Boundary Overstep**: Setting task `progress` to `150` or `-10`.
10. **Immutable Field Alteration**: Modifying `createdAt` field on update of a task.
11. **Orphaned Sub-Resource Creation**: Trying to create steps in a task without the task itself existing, or under an invalid task ID path.
12. **Self-assigned Admin Promotion**: Trying to create an admin entry under `/admins/attacker_123` to gain superuser permissions.

---

## 3. Threat Matrix & Hardened Verification

All of the above attempts must return a strict `PERMISSION_DENIED` response from the Firestore security rules. We will implement these assertions in the `firestore.rules` configuration file and deploy them.
