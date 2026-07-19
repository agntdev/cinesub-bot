# Movie Subscription Manager — Bot specification

**Archetype:** commerce

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that manages paid movie subscription services, allowing users to subscribe, manage their plans, and receive notifications about new releases and billing. The bot handles payment processing, subscription management, and transactional notifications without hosting or streaming content.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- General public
- Movie enthusiasts
- Subscription service users

## Success criteria

- Users can successfully subscribe and manage their plans
- Payment processing works reliably with receipts and reminders
- Users receive timely notifications about new content and billing
- Admin receives alerts for failed payments and support requests

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu
- **Subscribe** (button, actor: user, callback: subscribe:start) — Show available subscription plans and start the subscription process
- **My Subscription** (button, actor: user, callback: subscription:my) — View subscription status, next billing date, and plan details
- **Change Plan** (button, actor: user, callback: subscription:change) — Change to a different subscription plan with proration info
- **Cancel Subscription** (button, actor: user, callback: subscription:cancel) — Cancel the current subscription
- **Payment History** (button, actor: user, callback: payment:history) — View payment records and transaction details
- **Contact Support** (button, actor: user, callback: support:start) — Open a support form to send a message to the admin

## Flows

### Onboarding
_Trigger:_ /start

1. Greet user and explain subscription plans
2. Show Subscribe button for each plan
3. Optionally show trial offer if configured

_Data touched:_ User

### Subscription Purchase
_Trigger:_ subscribe:start

1. User selects a plan
2. Collect minimal required information (email optional)
3. Show payment summary and Pay button
4. Process payment through gateway
5. Confirm subscription and send receipt
6. Record next billing date

_Data touched:_ User, Subscription Plan, Payment Record

### Manage Subscription
_Trigger:_ subscription:my

1. Show subscription status, next billing date, and plan details
2. Offer options to change plan or cancel subscription

_Data touched:_ User, Subscription Plan

### Change Plan
_Trigger:_ subscription:change

1. Show available plans
2. Display proration info for immediate switch
3. Confirm plan change
4. Update subscription and payment records

_Data touched:_ User, Subscription Plan, Payment Record

### Cancel Subscription
_Trigger:_ subscription:cancel

1. Confirm cancellation
2. Update subscription status
3. Send confirmation message

_Data touched:_ User, Subscription Plan

### Payment History
_Trigger:_ payment:history

1. Display payment records with transaction details
2. Allow filtering by date or plan

_Data touched:_ Payment Record

### Support
_Trigger:_ support:start

1. Open support form
2. Collect user inquiry
3. Forward to admin chat
4. Store support thread
5. Allow admin to reply in user's Telegram

_Data touched:_ Support Message

### Admin Notifications
_Trigger:_ new_subscription

1. Send notification to admin chat about new subscription
2. Include user details and plan information

_Data touched:_ User, Subscription Plan

### Payment Failure Alert
_Trigger:_ failed_payment

1. Send alert to admin chat about failed payment
2. Include transaction details and user information

_Data touched:_ Payment Record, User

### Notification Delivery
_Trigger:_ new_event

1. Send notification to user based on event type (new release, promotion, billing reminder, payment receipt)
2. Include title, body, link, and timestamp

_Data touched:_ Notification/Event, User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user account with subscription and payment information
  - fields: Telegram account, Name, Email (optional), Subscription status, Subscription plan, Payment record, Notification preferences
- **Subscription Plan** _(retention: persistent)_ — Available subscription plans with pricing and features
  - fields: Plan ID, Name, Price, Billing interval, Trial period (optional), Features/limits
- **Payment Record** _(retention: persistent)_ — Transaction records for subscriptions and one-off payments
  - fields: Transaction ID, Amount, Currency, Status, Date, Gateway reference
- **Notification/Event** _(retention: session)_ — Types of notifications sent to users
  - fields: Type, Title, Body, Link, Timestamp
- **Support Message** _(retention: persistent)_ — User inquiries and admin replies
  - fields: User inquiry, Timestamp, Status (open/closed)

## Integrations

- **Telegram** (required) — Bot API messaging for user interactions and notifications
- **Payment Gateway** (required) — Handle one-time and recurring payments and send payment confirmations
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure admin Telegram chat ID for notifications
- Set up and manage subscription plans with pricing and trial periods
- Configure notification preferences and opt-in/opt-out settings
- Monitor payment failures and respond to support requests

## Notifications

- Subscription confirmation
- Billing receipt
- New release notification
- Promotion notification
- Billing reminder
- Payment failure notice
- Support message alerts for admin

## Permissions & privacy

- Collect only necessary user data (name, optional email)
- Allow users to opt in/out of promotional notifications
- Secure payment processing through a trusted gateway
- Comply with GDPR/region-specific data retention policies

## Edge cases

- Failed payment retries and admin alerts
- User cancels subscription mid-billing cycle
- User changes plan with proration calculation
- User opts out of promotional notifications but still receives mandatory transactional messages
- Admin chat ID configuration and validation

## Required tests

- End-to-end subscription purchase flow with payment confirmation
- Subscription management (change plan, cancel) with proration handling
- Notification delivery for new releases, promotions, and billing reminders
- Support message flow from user to admin and back
- Admin alerts for failed payments and new subscriptions

## Assumptions

- Payment gateway will handle recurring billing and send webhooks for status updates
- Admin notifications will be delivered to a single configurable Telegram chat ID
- Email is optional and collected only if the user opts in
- Trial periods are optional per plan and configured by the owner
- Proration for plan changes is simple and clear for users
- Mandatory transactional notifications are always sent, while promotional ones require opt-in
