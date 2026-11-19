# RestaurantOS

Multi-tenant restaurant operations and QR ordering SaaS built with Next.js 16, React 19, TypeScript, Tailwind CSS 4 and Supabase.

## Current modules
- Authentication and restaurant onboarding
- Tenant-scoped workspace and role-aware management actions
- Restaurant dashboard and order overview
- Menu categories and products (create, edit, visibility, archive)
- Floor and table management (create, edit, seating status, safe delete)
- Secure table QR generation and rotation
- Public QR menu and customer order placement
- Order status workflow and kitchen display board
- 30-day sales overview and order ledger
- Restaurant profile, timezone, tax and service-charge settings

## Safety
- Products are archived rather than physically deleted to preserve historical order items.
- Categories and floors can only be deleted when they have no dependent records.
- Tables with order history cannot be deleted.
- Order history is retained and status changes are written to the order status history.
- Payment gateway settlement, automated subscription billing, staff invitations, inventory, and realtime kitchen push are not enabled until their integrations and workflows are completed.

## Development
Copy .env.example to .env.local, configure the Supabase URL and publishable key, then run npm install and npm run dev.
