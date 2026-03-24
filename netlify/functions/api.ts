import serverless from "serverless-http";
import { createServer } from "../../server";

let server: any;

export const handler = async (event: any, context: any) => {
  if (!server) {
    server = await createServer();
  }
  const handler = serverless(server);
  return handler(event, context);
};
