import { startServer } from "../server";
import serverless from "serverless-http";

let appPromise: any = null;
let serverlessHandler: any = null;

async function getApp() {
  if (!appPromise) {
    appPromise = startServer();
  }
  return appPromise;
}

export default async function defaultHandler(reqOrEvent: any, resOrContext: any) {
  const app = await getApp();
  // Detect serverless environment type (Netlify, AWS Lambda vs Vercel)
  const isNetlify = !!process.env.NETLIFY || !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isNetlify) {
    if (!serverlessHandler) {
      serverlessHandler = serverless(app);
    }
    return serverlessHandler(reqOrEvent, resOrContext);
  } else {
    return app(reqOrEvent, resOrContext);
  }
}

export const handler = defaultHandler;

