This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Push Notifications

Browser/device notifications depend on Web Push and require VAPID credentials.

1. Generate keys by running `node scripts/generate-vapid.js`.
2. Add the keys to your environment (for local development use `.env.local`):
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=PASTE_PUBLIC_KEY_HERE
   VAPID_PRIVATE_KEY=PASTE_PRIVATE_KEY_HERE
   ```
   (If you prefer, you can use `VAPID_PUBLIC_KEY` in place of `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; the server will expose the correct public key to the client.)
3. Restart the dev server so the new values are picked up.

Once configured, approving the in-app permission prompt will register the device and push notifications will be delivered through `/push-sw.js`.
