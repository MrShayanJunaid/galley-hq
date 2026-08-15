# Galley HQ

We are building a SaaS product for marketing agencies.

The product will eventually help agencies manage the full social content workflow in one place: understand a client's brand, generate content ideas, generate creatives, create captions, review content, get client approval, and prepare/publish content across multiple social platforms.

However, DO NOT build those features yet.

For this step, only build the core production-quality foundation of the SaaS.

1. Project foundation

Inspect the current project first.

If this is a new project, establish a clean, scalable architecture suitable for a SaaS product.

Keep the code modular so future features can be added without rewriting the foundation.

Do not over-engineer the MVP.

Use clean naming conventions and reusable components.

2. Supabase

Use Supabase as the backend:

Supabase Authentication

PostgreSQL database

Row Level Security (RLS)

Supabase Storage only where required

Do not hardcode credentials or secrets.
Use environment variables.

3. Authentication

Build:

Sign up

Login

Logout

Forgot/reset password

Protected application routes

Persistent authenticated sessions

After login, the user should enter the application dashboard.

Do not build social-media authentication yet.

4. SaaS user structure

The database must NOT be designed as a single-user prototype.

Create a proper SaaS-ready structure where a user belongs to an account/workspace.

The architecture should support:

User
→ Workspace
→ Workspace members
→ Subscription/Plan
→ Future clients
→ Future content/projects

A user should be able to belong to a workspace, and the data must be isolated between workspaces.

5. Plans and subscriptions

Create the database structure needed to support plans such as:

Free

Pro

Agency

Do NOT integrate Stripe yet.

However, the database should already support:

plan

subscription status

subscription start/end dates

billing provider

external customer ID

external subscription ID

This should allow Stripe or another payment provider to be connected later without redesigning the database.

6. Database security

Implement proper RLS policies.

Users must NEVER be able to access another workspace's private data by changing an ID in the URL or request.

All workspace-level data must be protected by workspace membership.

Do not use insecure client-side checks as the primary security mechanism.

7. Initial database entities

Create only the foundation tables required at this stage, such as:

profiles

workspaces

workspace_members

plans

subscriptions

Use proper:

UUID primary keys

foreign keys

timestamps

created_at / updated_at

appropriate indexes

unique constraints where necessary

Do not create unnecessary tables for future features yet.

8. Dashboard shell

After authentication, create a clean SaaS dashboard shell with:

Sidebar

Dashboard

Workspace/account area

Settings

Logout

For now, the dashboard can contain placeholder sections for future modules, but DO NOT implement the actual content-generation workflow yet.

9. Important architecture rule

This is an MVP, but NOT a throwaway prototype.

The MVP should be simple in scope while the underlying authentication, database, permissions, and data structure should be reliable enough to build the next phases on top of.

Do not build unnecessary enterprise infrastructure or premature scaling systems.

10. Before coding

First inspect the existing project and briefly explain:

Current structure

What you will change

Database schema you propose

Authentication approach

Then implement ONLY this Step 1.

Do not move to content generation, AI, image generation, social media APIs, approvals, analytics, white-labeling, or other product features until this foundation is complete and verified.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca1a6671-8da3-4cf9-8e00-e53e6b95cc73).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
