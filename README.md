# GalleyHQ

GalleyHQ is a SaaS platform designed for marketing agencies to streamline their social media content workflow in one place.

The platform is being developed in phases, with the initial MVP focused on establishing a secure, scalable SaaS foundation that can support future content management, AI-assisted workflows, client collaboration, approvals, and multi-platform publishing.

## Current Development Scope

The current phase focuses on the core application foundation:

* User authentication
* Email/password authentication
* Google OAuth
* Protected application routes
* Workspace-based architecture
* Workspace membership
* Subscription and plan structure
* PostgreSQL database
* Row Level Security (RLS)
* Account and workspace management
* Core application dashboard

Advanced product functionality will be introduced progressively in later development phases.

## Technology Stack

* **Frontend:** React / TypeScript
* **Backend:** Supabase
* **Database:** PostgreSQL
* **Authentication:** Supabase Auth
* **Security:** Row Level Security (RLS)
* **Storage:** Supabase Storage
* **Deployment:** Production web environment

## Architecture

GalleyHQ is structured as a multi-tenant SaaS application.

The core relationship is:

```text
User
  ↓
Workspace
  ↓
Workspace Members
  ↓
Plans & Subscriptions
  ↓
Future Clients / Projects / Content
```

Workspace-level data is isolated through database-level security policies.

The architecture is designed so additional product functionality can be introduced without restructuring the core authentication and database systems.

## Authentication

The application supports:

* Email/password signup
* Email/password login
* Email verification
* Password recovery
* Google OAuth
* Persistent authentication sessions
* Protected application routes
* Secure logout

Authentication credentials and service secrets are managed through environment variables and are never committed to the repository.

## Database

The initial database foundation includes:

* `profiles`
* `workspaces`
* `workspace_members`
* `plans`
* `subscriptions`

The database uses:

* UUID primary keys
* Foreign-key relationships
* Timestamps
* Unique constraints
* Appropriate indexes
* Row Level Security policies

The subscription architecture is designed to support multiple plans and future payment providers without requiring a fundamental database redesign.

## Security

Security is enforced at the database level wherever possible.

Users must only be able to access data belonging to workspaces they are authorized to access.

Client-side checks are not treated as the primary security mechanism for protecting private workspace data.

Sensitive credentials, API keys, and service-role credentials must remain server-side and must never be committed to the repository.

## Development Principles

The project follows these principles:

1. **Build in phases**
   Features are introduced incrementally rather than building the entire product at once.

2. **Keep the MVP focused**
   Only functionality required for the current phase should be implemented.

3. **Maintain a reliable foundation**
   Authentication, database structure, permissions, and security should be implemented correctly from the beginning.

4. **Avoid premature complexity**
   Enterprise-level infrastructure and unnecessary scaling systems should not be introduced before they are required.

5. **Keep the architecture extensible**
   Future modules should be able to integrate with the existing foundation without major rewrites.

## Local Development

### Requirements

* Node.js
* npm

### Setup

```bash
git clone <repository-url>
cd <repository-name>
npm install
```

Create the required environment variables in `.env.local` and configure the Supabase project.

Then start the development server:

```bash
npm run dev
```

The application will be available at the local development URL provided by the development server.

## Project Status

**Current phase:** MVP Foundation

The foundation is being developed first. Product-specific modules will be added progressively as their respective development phases begin.
