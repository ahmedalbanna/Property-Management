# Firestore Security Specification

## Data Invariants
1. **Ownership**: Every document (Property, Unit, Tenant, Contract, Payment, Maintenance) MUST have an `ownerId` that matches the authenticated user's UID.
2. **Relational Integrity**:
    - Units MUST point to a valid Property owned by the user.
    - Contracts MUST point to a valid Unit and Tenant owned by the user.
    - Payments MUST point to a valid Contract owned by the user.
    - Maintenance records MUST point to a valid Property owned by the user.
3. **Immutability**: `ownerId`, `createdAt`, and primary relational links (e.g., `propertyId` in a Unit) MUST NOT change after creation.
4. **Temporal Integrity**: `createdAt` and `updatedAt` MUST match `request.time`.
5. **State Transitions**: Contracts in terminal states (`terminated`, `expired`) MUST NOT be updated.

## The Dirty Dozen Payloads (Red Team Attack Vectors)

### 1. The ID Spoof (Identity)
**Target:** `properties`
**Payload:** `{ "name": "Evil Corp", "ownerId": "victim_uid", "address": "...", "type": "commercial" }`
**Goal:** Create a document for another user.

### 2. The Ghost Field (Integrity)
**Target:** `tenants`
**Payload:** `{ "name": "John", "phone": "123", "ownerId": "my_uid", "isVerifiedAdmin": true }`
**Goal:** Inject unauthorized fields into the schema.

### 3. The Relational Hijack (Integrity)
**Target:** `units`
**Payload:** `{ "propertyId": "someone_elses_prop_id", "unitNumber": "A1", "status": "vacant", "ownerId": "my_uid" }`
**Goal:** Associate a resource with a parent document not owned by the user.

### 4. The Denial of Wallet (Resource Exhaustion)
**Target:** `properties`
**Payload:** `{ "name": "A".repeat(1000000), "ownerId": "my_uid", ... }`
**Goal:** Store massive strings to bloat storage costs.

### 5. The Time Traveler (Temporal)
**Target:** `payments`
**Payload:** `{ "paymentDate": "2099-01-01T00:00:00Z", ... }`
**Goal:** Bypass logging and auditing by setting future/past timestamps.

### 6. The State Shortcut (Business Logic)
**Target:** `contracts`
**Action:** Update status from `active` to `terminated` while also changing the `baseRent`.
**Goal:** Perform unauthorized price changes during status transitions.

### 7. The Post-Mortem Edit (Business Logic)
**Target:** `contracts`
**Status:** `terminated`
**Attempt:** Update the `endDate`.
**Goal:** Modify records that should be locked.

### 8. The Metadata Eraser (Immutability)
**Target:** `units`
**Attempt:** Update `propertyId` to move a unit between buildings.
**Goal:** Break relational consistency.

### 9. The Unverified Entry (Auth)
**Target:** Any collection.
**Condition:** `email_verified: false`
**Goal:** Bypass account verification requirements.

### 10. The Query Scraper (Privacy)
**Target:** `properties`
**Attempt:** `getDocs(collection(db, 'properties'))` without a `where` clause.
**Goal:** Attempt to read all properties in the database.

### 11. The Orphan Write (Atomicity)
**Target:** `contracts`
**Attempt:** Create a contract pointing to a non-existent `unitId`.
**Goal:** Create dangling references.

### 12. The Multi-Tenant Leak (Privacy)
**Target:** `payments`
**Attempt:** `getDoc(doc(db, 'payments', 'victim_payment_id'))`
**Goal:** Direct access to another user's financial record.
