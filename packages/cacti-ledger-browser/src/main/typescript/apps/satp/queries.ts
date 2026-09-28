import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  AuditResponse,
  HealthCheckResponse,
  StatusResponse,
  SupportedLedgersResponse,
} from "./types";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function fetchSessionIds(gatewayUrl: string): Promise<string[]> {
  const baseUrl = normalizeBaseUrl(gatewayUrl);
  const targetUrl = `${baseUrl}/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/get-sessions-ids`;
  const response = await axios.get<string[]>(targetUrl, { timeout: 10000 });
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchSessionStatus(
  gatewayUrl: string,
  sessionId: string,
): Promise<StatusResponse> {
  const baseUrl = normalizeBaseUrl(gatewayUrl);
  const targetUrl = `${baseUrl}/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/status?SessionID=${encodeURIComponent(
    sessionId,
  )}`;
  const response = await axios.get<StatusResponse>(targetUrl, {
    timeout: 10000,
  });
  return response.data;
}

export async function fetchAuditTrail(
  gatewayUrl: string,
  startTimestamp?: string,
  endTimestamp?: string,
): Promise<AuditResponse> {
  const baseUrl = normalizeBaseUrl(gatewayUrl);
  const start = startTimestamp || new Date(0).toISOString();
  const end = endTimestamp || new Date().toISOString();
  const targetUrl = `${baseUrl}/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/audit?startTimestamp=${encodeURIComponent(
    start,
  )}&endTimestamp=${encodeURIComponent(end)}`;
  const response = await axios.get<AuditResponse>(targetUrl, {
    timeout: 15000,
  });
  return response.data;
}

export async function fetchGatewayHealth(
  gatewayUrl: string,
): Promise<HealthCheckResponse> {
  const baseUrl = normalizeBaseUrl(gatewayUrl);
  const targetUrl = `${baseUrl}/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck`;
  const response = await axios.get<HealthCheckResponse>(targetUrl, {
    timeout: 5000,
  });
  return response.data;
}

export async function fetchSupportedLedgers(
  gatewayUrl: string,
): Promise<SupportedLedgersResponse> {
  const baseUrl = normalizeBaseUrl(gatewayUrl);
  const targetUrl = `${baseUrl}/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/supported-ledgers`;
  const response = await axios.get<SupportedLedgersResponse>(targetUrl, {
    timeout: 5000,
  });
  return response.data;
}

export function useSatpSessionIds(gatewayUrl: string, refetchInterval = 5000) {
  return useQuery({
    queryKey: ["satpSessionIds", gatewayUrl],
    queryFn: () => fetchSessionIds(gatewayUrl),
    refetchInterval,
    retry: 1,
  });
}

export function useSatpSessionStatus(
  gatewayUrl: string,
  sessionId: string | undefined,
  refetchInterval = 5000,
) {
  return useQuery({
    queryKey: ["satpSessionStatus", gatewayUrl, sessionId],
    queryFn: () =>
      sessionId ? fetchSessionStatus(gatewayUrl, sessionId) : null,
    enabled: Boolean(sessionId),
    refetchInterval,
    retry: 1,
  });
}

export function useSatpAuditTrail(
  gatewayUrl: string,
  startTimestamp?: string,
  endTimestamp?: string,
  refetchInterval = 5000,
) {
  return useQuery({
    queryKey: ["satpAuditTrail", gatewayUrl, startTimestamp, endTimestamp],
    queryFn: () => fetchAuditTrail(gatewayUrl, startTimestamp, endTimestamp),
    refetchInterval,
    retry: 1,
  });
}

export function useSatpGatewayHealth(
  gatewayUrl: string,
  refetchInterval = 10000,
) {
  return useQuery({
    queryKey: ["satpGatewayHealth", gatewayUrl],
    queryFn: () => fetchGatewayHealth(gatewayUrl),
    refetchInterval,
    retry: 1,
  });
}

export function useSatpSupportedLedgers(gatewayUrl: string) {
  return useQuery({
    queryKey: ["satpSupportedLedgers", gatewayUrl],
    queryFn: () => fetchSupportedLedgers(gatewayUrl),
    staleTime: 60000,
    retry: 1,
  });
}
