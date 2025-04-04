# Zotari - Discord-Based File Storage System

Zotari is a file storage solution that leverages Discord webhooks to store files of any size by splitting them into manageable chunks. This approach provides essentially unlimited storage using Discord's infrastructure at no cost.

## Features

- **Unlimited Storage**: Store files of any size through automatic chunking
- **Discord Integration**: Uses Discord webhooks as a storage backend
- **Multi-File Upload**: Upload multiple files simultaneously with progress tracking
- **File Management**: Organize, rename, and delete your uploaded files
- **Webhook Management**: Add multiple webhooks for redundancy and faster uploads
- **User Authentication**: Secure access to your files with NextAuth.js
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and Shadcn UI

## How It Works

1. Files are split into 9MB chunks (Discord's attachment limit)
2. Each chunk is uploaded to Discord through webhooks
3. Metadata and chunk URLs are stored in your database
4. When downloading, chunks are reassembled in the correct order

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (or any database supported by Prisma)
- Discord server with webhook creation permissions

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/zotari.git
cd zotari
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Configure environment variables:

Create a `.env` file in the root directory with the following:

```
# Database
# default database is sqlite, change in schema.prisma if you want to use a different database
DATABASE_URL="postgresql://username:password@localhost:5432/zotari"

# Authentication
AUTH_SECRET="=" # Added by `npx auth`. Read more: https://cli.authjs.dev

# Discord Stuff
AUTH_DISCORD_ID=""
AUTH_DISCORD_SECRET=""

# user token not bot token, get it from devtools
DISCORD_TOKEN=""
```

4. Set up the database:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Setting Up Discord Webhooks

1. Open Discord and navigate to your server
2. Right-click on a channel and select "Edit Channel"
3. Go to "Integrations" > "Webhooks"
4. Click "New Webhook" and customize as desired
5. Copy the webhook URL
6. In Zotari, go to the Webhooks page and add the URL

## Deployment

### Deploy to Vercel

The simplest way to deploy Zotari is using Vercel:

1. Push your code to a GitHub repository
2. Visit [Vercel](https://vercel.com/new) and import your repository
3. Configure the environment variables as listed above
4. Deploy!

### Manual Deployment

For other platforms:

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

3. Configure your server to serve the application on your desired domain
4. Make sure to set up proper environment variables

## Tech Stack

- **Frontend**: Next.js App Router with React
- **Backend**: Next.js Server Actions
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS with Shadcn UI components
- **File Processing**: Web Workers for non-blocking chunking

## Project Structure

- `/app` - Next.js App Router pages and layouts
- `/components` - UI components and feature implementations
- `/lib` - Utility functions and shared code
- prisma - Database schema and client
- public - Static assets
- `/hooks` - Custom React hooks, including the file uploader
- `/workers` - Web Worker implementations for file processing

## Configuration Options

### Chunk Size

The default chunk size is 9MB (Discord's maximum attachment size). To change this:

1. Modify the `useDiscordUploader` hook's `uploadFile` function
2. Update the `chunkSize` parameter (not recommended to exceed 8MB for reliability)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
