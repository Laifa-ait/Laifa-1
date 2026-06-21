# Security Specification - OLMART

## Data Invariants

1.  **Identity Isolation**: A user can only read/write their own private profile data in the `users` collection.
2.  **Seller Integrity**: A seller can only create and manage products where `sellerId` matches their `uid`.
3.  **Order Privacy**: An order can only be accessed by the buyer who placed it, the sellers whose products are in the order, or an administrator.
4.  **Admin Autocracy**: Certain collections like `internal_notifications`, `audit_logs`, and `settings` are strictly accessible only by verified administrators.
5.  **Status Locking**: Once an order reaches a terminal state (e.g., `DELIVERED`, `CANCELLED`), non-admin users cannot reverse the status.
6.  **Product Moderation**: Sellers can create products with `status: "pending"`, but only admins can change the status to `"active"`.

## The "Dirty Dozen" Payloads (Attack Vectors)

1.  **Identity Theft**: Authenticated User A tries to `update` User B's profile (`users/UserB`) to change their role to `admin`.
2.  **Product Hijack**: Seller A tries to `update` a product owned by Seller B to change the `sellerId` or price.
3.  **Shadow Order Read**: Buyer A tries to `get` Order B (placed by Buyer B) to see private details.
4.  **Fake Notification**: A regular user tries to `addDoc` to `internal_notifications` to trick an admin.
5.  **Illegal Discount**: A buyer tries to create a coupon in `coupons` with 99% discount.
6.  **Withdrawal Interception**: Seller A tries to `get` Seller B's withdrawal request to see CCP/RIB details.
7.  **Order Price Manipulation**: A buyer tries to `update` the `total` field of their own pending order to $1.
8.  **Status Escalation**: A seller tries to `update` their own product from `rejected` to `active` without admin approval.
9.  **Message Impersonation**: User A tries to send a `supportMessage` to Ticket B as if they were a support agent.
10. **Resource Exhaustion**: An attacker tries to push a 1MB string into the `name` field of a product.
11. **ID Poisoning**: An attacker tries to create a document with a junk-character ID like `../../../etc/passwd`.
12. **Role Self-Assignment**: A new user tries to register with `role: "admin"` during initial account creation.

## The Test Runner Plan

We will simulate these payloads against the final `firestore.rules` using the emulator or local rules check logic.

## Conflict Report Logic

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| `users` | Blocked via `request.auth.uid` check | Blocked via `affectedKeys()` on `role` | Blocked via `.size()` checks |
| `products` | Blocked via `sellerId` verification | Blocked via Admin-only status field | Blocked via `.size()` checks |
| `orders` | Blocked via Buyer/Seller ID check | Blocked via Status terminal lock | Blocked via immutable price fields |
| `coupons` | Blocked via Admin master gate | Blocked via Admin validation | Blocked via strict type and `.size()` limits |
| `internal_notifications` | Blocked via `isAdmin()` master gate | N/A | Blocked via Admin gate |
