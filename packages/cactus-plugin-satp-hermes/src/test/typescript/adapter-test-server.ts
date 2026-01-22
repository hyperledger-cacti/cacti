/**
 * Simple Express test server for adapter E2E testing with real webhooks.
 *
 * This server runs on localhost with a dynamically allocated port and provides endpoints to:
 * - Mirror POST requests (echo back the body)
 * - Simulate inbound webhook responses (InboundWebhookDecisionRequest)
 * - Simulate outbound webhook targets (receive OutboundWebhookPayload)
 * - Trigger webhooks to other URLs
 *
 * Usage:
 *   import { startAdapterTestServer, stopAdapterTestServer } from "./adapter-test-utils";
 *   const serverInfo = await startAdapterTestServer();
 *   // ... run tests using serverInfo.baseUrl ...
 *   await stopAdapterTestServer(serverInfo);
 */

import express, { Request, Response, Express } from "express";
import http from "http";
import net from "net";
import type {
  InboundWebhookDecisionRequest,
  OutboundWebhookPayload,
} from "../../main/typescript/adapters/adapter-config";

const HOST = "127.0.0.1";

/**
 * Information about a running test server instance.
 */
export interface TestServerInfo {
  server: http.Server;
  port: number;
  host: string;
  baseUrl: string;
}

/**
 * Find an available port by binding to port 0.
 */
async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, HOST, () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const port = address.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("Could not get port")));
      }
    });
    srv.on("error", reject);
  });
}

/**
 * Creates and configures the Express app with all test endpoints.
 * Includes shutdown endpoint for graceful termination.
 * No logging - keeps test output clean.
 */
export function createTestApp(): {
  app: Express;
  setServer: (server: http.Server) => void;
} {
  const app = express();
  app.use(express.json());
  let serverRef: http.Server | null = null;

  const setServer = (server: http.Server) => {
    serverRef = server;
  };

  // GET / - Simple health check, returns 200 "ok"
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  // GET /help - List all available endpoints
  app.get("/help", (_req: Request, res: Response) => {
    res.status(200).json({
      endpoints: [
        { method: "GET", path: "/", description: "Health check" },
        { method: "GET", path: "/help", description: "List all endpoints" },
        { method: "POST", path: "/mirror", description: "Echo request body" },
        {
          method: "POST",
          path: "/webhook/trigger",
          description: "Trigger webhook to another URL",
        },
        {
          method: "POST",
          path: "/webhook/inbound",
          description: "Receive inbound webhook decision",
        },
        {
          method: "GET",
          path: "/webhook/outbound",
          description: "Outbound webhook target (GET)",
        },
        {
          method: "POST",
          path: "/webhook/outbound",
          description: "Receive outbound webhook payload",
        },
        {
          method: "POST",
          path: "/webhook/outbound/approve",
          description: "Always approve (continue: true)",
        },
        {
          method: "POST",
          path: "/webhook/outbound/reject",
          description: "Always reject (continue: false)",
        },
        {
          method: "POST",
          path: "/webhook/outbound/delay/:ms",
          description: "Delayed response",
        },
        {
          method: "POST",
          path: "/webhook/outbound/error/:code",
          description: "Return specific HTTP error",
        },
        {
          method: "POST",
          path: "/shutdown",
          description: "Gracefully shutdown server",
        },
        {
          method: "GET",
          path: "/shutdown",
          description: "Gracefully shutdown server (GET)",
        },
      ],
    });
  });

  // POST /mirror - Echo back whatever was sent in the body
  app.post("/mirror", (req: Request, res: Response) => {
    res.status(200).json(req.body);
  });

  // POST /webhook/trigger - Call another URL with a payload (proxy/trigger)
  // Body: { url: string, payload: unknown }
  app.post("/webhook/trigger", async (req: Request, res: Response) => {
    const { url, payload } = req.body;

    if (!url) {
      res.status(400).json({ error: "Missing 'url' in body" });
      return;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      const responseBody = await response.text();
      res.status(200).json({
        triggered: true,
        targetUrl: url,
        statusCode: response.status,
        response: responseBody,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // POST /webhook/inbound - Simulate receiving an inbound webhook decision
  // Body should be InboundWebhookDecisionRequest
  // Returns the decision back with confirmation
  app.post("/webhook/inbound", (req: Request, res: Response) => {
    const decision = req.body as InboundWebhookDecisionRequest;

    // Validate required fields
    if (typeof decision.continue !== "boolean") {
      res.status(400).json({
        error:
          "Invalid InboundWebhookDecisionResponse: 'continue' must be boolean",
      });
      return;
    }

    // Echo back the decision with server acknowledgment
    res.status(200).json({
      received: true,
      decision: {
        adapterId: decision.adapterId,
        continue: decision.continue,
        reason: decision.reason,
        data: decision.data,
      },
      processedAt: new Date().toISOString(),
    });
  });

  // GET /webhook/outbound - Simple endpoint for outbound webhook target (GET)
  // Returns simple ok response
  app.get("/webhook/outbound", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // POST /webhook/outbound - Receive outbound webhook payload
  // Body should be OutboundWebhookPayload from SATP gateway
  app.post("/webhook/outbound", (req: Request, res: Response) => {
    const payload = req.body as OutboundWebhookPayload | undefined;

    // Handle empty or undefined payload gracefully
    if (!payload) {
      res.status(200).json({
        received: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Return acknowledgment - outbound webhooks just need to know we received it
    res.status(200).json({
      received: true,
      eventType: payload.eventType,
      sessionId: payload.sessionId,
      timestamp: new Date().toISOString(),
    });
  });

  // POST /webhook/outbound/approve - Outbound target that always approves
  // Useful for testing adapters that check response for continue: true
  app.post("/webhook/outbound/approve", (req: Request, res: Response) => {
    res.status(200).json({
      continue: true,
      reason: "Auto-approved by test server",
      receivedPayload: req.body,
    });
  });

  // POST /webhook/outbound/reject - Outbound target that always rejects
  // Useful for testing adapters that check response for continue: false
  app.post("/webhook/outbound/reject", (req: Request, res: Response) => {
    res.status(200).json({
      continue: false,
      reason: "Auto-rejected by test server",
      receivedPayload: req.body,
    });
  });

  // POST /webhook/outbound/delay/:ms - Outbound target with configurable delay
  // Useful for testing timeout scenarios
  app.post("/webhook/outbound/delay/:ms", (req: Request, res: Response) => {
    const delayMs = parseInt(req.params.ms as string, 10) || 1000;

    setTimeout(() => {
      res.status(200).json({
        delayed: true,
        delayMs,
        timestamp: new Date().toISOString(),
      });
    }, delayMs);
  });

  // POST /webhook/outbound/error/:code - Return specific HTTP error code
  // Useful for testing error handling
  app.post("/webhook/outbound/error/:code", (req: Request, res: Response) => {
    const errorCode = parseInt(req.params.code as string, 10) || 500;
    res.status(errorCode).json({
      error: true,
      code: errorCode,
      message: `Test error ${errorCode}`,
    });
  });

  // POST /shutdown - Gracefully shutdown the server
  // Useful for make targets and automated cleanup
  app.post("/shutdown", (_req: Request, res: Response) => {
    res.status(200).json({
      message: "Server shutting down...",
      timestamp: new Date().toISOString(),
    });

    // Give time for response to be sent
    setTimeout(() => {
      console.log("Shutdown requested via /shutdown endpoint");
      if (serverRef) {
        serverRef.closeAllConnections?.();
        serverRef.close(() => {
          console.log("Server closed gracefully");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    }, 100);
  });

  // GET /shutdown - Also allow GET for easy curl testing
  app.get("/shutdown", (_req: Request, res: Response) => {
    res.status(200).json({
      message: "Server shutting down...",
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => {
      console.log("Shutdown requested via /shutdown endpoint (GET)");
      if (serverRef) {
        serverRef.closeAllConnections?.();
        serverRef.close(() => {
          console.log("Server closed gracefully");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    }, 100);
  });

  return { app, setServer };
}

/**
 * Starts the test server on a random available port.
 * Returns TestServerInfo with the server instance and connection details.
 */
export async function startTestServer(): Promise<TestServerInfo> {
  const { app, setServer } = createTestApp();
  const port = await findAvailablePort();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, HOST, () => {
      setServer(server);
      const baseUrl = `http://${HOST}:${port}`;
      resolve({ server, port, host: HOST, baseUrl });
    });
    server.on("error", reject);
  });
}

/**
 * Stops the test server gracefully with timeout fallback.
 * Destroys all active connections to ensure clean shutdown.
 */
export async function stopTestServer(info: TestServerInfo): Promise<void> {
  return new Promise((resolve) => {
    // Close all active connections first
    info.server.closeAllConnections?.();

    // Set a timeout to force resolve if graceful shutdown takes too long
    const forceCloseTimeout = setTimeout(() => {
      resolve();
    }, 2000);

    info.server.close(() => {
      clearTimeout(forceCloseTimeout);
      resolve();
    });
  });
}

// Export constants for backward compatibility
export const TEST_SERVER_HOST = HOST;

// If run directly, start the server on default port 9223 with shutdown support
if (require.main === module) {
  const DEFAULT_PORT = parseInt(process.env.WEBHOOK_SERVER_PORT || "9223", 10);
  const { app, setServer } = createTestApp();

  const server = app.listen(DEFAULT_PORT, HOST, () => {
    setServer(server);
    console.log(`Test server running at http://${HOST}:${DEFAULT_PORT}`);
    console.log("Endpoints:");
    console.log(`  GET  /                           - Health check`);
    console.log(`  GET  /help                       - List all endpoints`);
    console.log(`  POST /mirror                     - Echo request body`);
    console.log(
      `  POST /webhook/outbound           - Receive outbound webhook`,
    );
    console.log(`  POST /webhook/outbound/approve   - Always approve`);
    console.log(`  POST /webhook/outbound/reject    - Always reject`);
    console.log(`  POST /webhook/outbound/delay/:ms - Delayed response`);
    console.log(`  POST /webhook/outbound/error/:code - Return error code`);
    console.log(`  POST /shutdown                   - Shutdown server`);
    console.log(`  GET  /shutdown                   - Shutdown server (GET)`);
    console.log("");
    console.log("Press Ctrl+C to stop, or POST/GET to /shutdown");
  });

  // Handle SIGTERM/SIGINT for graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.closeAllConnections?.();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
