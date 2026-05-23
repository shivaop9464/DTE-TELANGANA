import { startServer } from "../server.js";

let appPromise: any = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    // startServer initializes the Express app and returns the instance
    appPromise = startServer();
  }
  const app = await appPromise;
  // Let Express handle the request inside Vercel's serverless runtime
  return app(req, res);
}
