# Eisenhower Matrix Dashboard

Live Eisenhower matrix that auto-syncs with ClickUp tasks.

## Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard:
   - `CLICKUP_API_TOKEN` - your ClickUp API token
   - `CLICKUP_SPACE_ID` - defaults to `19304335` (E-Commerce space)

## How it works

- Serverless function (`/api/tasks.js`) fetches all active tasks from ClickUp
- Maps ClickUp priority to Eisenhower quadrants:
  - Urgent = Q1 (Do First)
  - High = Q2 (Schedule)
  - Normal = Q3 (Delegate)
  - Low = Q4 (Backlog)
- Frontend auto-refreshes every 5 minutes
- Each task links directly to ClickUp
