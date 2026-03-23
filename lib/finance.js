import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const SESSION_KEY = "expense_app_session";
export const CATEGORY_OPTIONS = ["Food", "Travel", "Shopping", "Bills", "Other"];

function normalizeApiBaseUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export function getApiBaseUrl() {
  const configuredBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

export const API_BASE_URL = getApiBaseUrl();

export async function saveSession(session) {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (_error) {
    // no-op
  }
}

export async function readSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (_error) {
    // no-op
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseExpenseDate(dateText) {
  if (!dateText || typeof dateText !== "string") {
    return null;
  }

  const [day, month, year] = dateText.split("/").map(Number);
  if (!day || !month || !year) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getMonthKeyFromDateText(dateText) {
  const parsed = parseExpenseDate(dateText);
  if (!parsed) {
    return "Unknown";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthLabelFromKey(monthKey) {
  if (!monthKey || monthKey === "ALL" || monthKey === "Unknown") {
    return monthKey;
  }

  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}