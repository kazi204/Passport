import serverless from "serverless-http";
import { createServer } from "../../server";

let server: any;

export const handler = async (event: any, context: any) => {
  console.log(`Function invoked: ${event.httpMethod} ${event.path}`);
  
  if (!server) {
    try {
      server = await createServer();
    } catch (err) {
      console.error("Failed to create server:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error during initialization" })
      };
    }
  }
  
  const handler = serverless(server, {
    binary: ['image/*', 'application/pdf', 'multipart/form-data']
  });
  
  return handler(event, context);
};
