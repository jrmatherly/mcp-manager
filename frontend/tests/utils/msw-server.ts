/**
 * Mock Service Worker (MSW) Server Configuration
 *
 * Provides API mocking for tests using MSW.
 * This file sets up mock handlers for API endpoints used in tests.
 */

import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Define mock handlers for API endpoints
const handlers = [
  // Health check endpoint
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  }),

  // MCP server endpoints
  http.get("/api/mcp/servers", () => {
    return HttpResponse.json({
      servers: [
        {
          id: "test-server-1",
          name: "Test Server 1",
          status: "active",
          health_status: "healthy",
          endpoint_url: "http://test1.example.com",
          transport_type: "http",
        },
      ],
    });
  }),

  // Analytics endpoints
  http.get("/api/analytics/server-health", () => {
    return HttpResponse.json({
      total_servers: 5,
      healthy_servers: 4,
      unhealthy_servers: 1,
      degraded_servers: 0,
      avg_response_time: 250.5,
    });
  }),

  // Authentication endpoints
  http.post("/api/auth/login", () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: "test-user-1",
        email: "test@example.com",
        tenant_id: "test-tenant-1",
      },
      token: "mock-jwt-token",
    });
  }),

  // Error endpoints for testing error handling
  http.get("/api/error/500", () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get("/api/error/404", () => {
    return new HttpResponse(null, { status: 404 });
  }),
];

// Setup MSW server with handlers
export const server = setupServer(...handlers);
