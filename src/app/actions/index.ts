"use server";

import { prisma } from "@/lib/prisma";
import axios from "axios";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// --- 1. KEY ROTATION SETUP ---
const RAW_KEYS = process.env.RAPID_API_KEYS || process.env.RAPID_API_KEY || "";
const API_KEYS = RAW_KEYS.split(",").map((k) => k.trim()).filter((k) => k.length > 0);

// Fallback to your specific host if not in env
const HOST = process.env.RAPID_API_HOST || "temp-gmail-api.p.rapidapi.com";

/**
 * Helper: Try request with first key, rotate if 429 (Too Many Requests).
 */
async function fetchWithRotation<T>(
  requestFn: (key: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;

  for (const key of API_KEYS) {
    try {
      return await requestFn(key);
    } catch (error: any) {
      lastError = error;
      // If 429 Rate Limit, log and try next key
      if (error.response && error.response.status === 429) {
        console.warn(`[API Limit] Key ...${key.slice(-4)} exhausted. Switching...`);
        continue; 
      }
      // If other error, throw immediately
      throw error; 
    }
  }
  throw lastError || new Error("All API keys exhausted.");
}

// --- 2. HELPER: Normalize Email ---
function getParentEmail(email: string): string {
  if (!email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  
  // Remove everything after '+' and remove all dots
  const noPlus = localPart.split("+")[0];
  const noDots = noPlus.replace(/\./g, "");
  
  return `${noDots}@${domain}`.toLowerCase();
}

// --- 3. GENERATE EMAIL (Rotation + Parent Check) ---
export async function generateEmail(type: "dot" | "plus") {
  const cookieStore = await cookies(); // Ensure request context
  const endpoint = type === "dot" ? "/get-email-dot" : "/get-email-plus";
  const url = `https://${HOST}${endpoint}`;

  try {
    // A. Fetch from API with Rotation
    const response = await fetchWithRotation(async (key) => {
      return await axios.get(url, {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": HOST,
        },
      });
    });

    const email = response.data.email;
    if (!email) return null;

    // B. Check for Duplicates using Parent Email
    const parentEmail = getParentEmail(email);
    
    const existing = await prisma.usedEmail.findFirst({
      where: { parentEmail: parentEmail },
    });

    // If fresh, save it to DB so we can track it
    if (!existing) {
      await prisma.usedEmail.create({
        data: {
          email,
          parentEmail, // Save parent for future checks
          status: "GENERATED",
        }
      });
      revalidatePath("/"); // Update UI
    }

    return { 
      email, 
      isDuplicate: !!existing, 
      previousStatus: existing ? existing.status : null 
    };

  } catch (error) {
    console.error("API Error in generateEmail:", error);
    return null;
  }
}

// --- 4. CHECK INBOX (Rotation) ---
export async function checkInbox(email: string) {
  const url = `https://${HOST}/get-mails`;
  
  try {
    const response = await fetchWithRotation(async (key) => {
      return await axios.post(url, 
        {
          email: email,
          count: 20
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": HOST,
          },
        }
      );
    });
    
    return response.data || [];
    
  } catch (error) {
    console.error("Inbox Error:", error);
    return [];
  }
}

// --- 5. MARK STATUS (Parent Logic) ---
export async function markEmailStatus(email: string, status: string) {
  try {
    const parentEmail = getParentEmail(email);
    
    // We use upsert to ensure it exists, though generateEmail usually creates it first
    await prisma.usedEmail.upsert({
      where: { email },
      update: { status, parentEmail },
      create: { 
        email, 
        status, 
        parentEmail,
      },
    });
    
    revalidatePath("/");
    return true;
  } catch (error) {
    console.error("DB Error:", error);
    return false;
  }
}

// --- 6. GET STATS ---
export async function getStats() {
  try {
    const total = await prisma.usedEmail.count();
    const success = await prisma.usedEmail.count({ where: { status: "SUCCESS" } });
    return { total, success };
  } catch (error) {
    return { total: 0, success: 0 };
  }
}

// --- 7. GET HISTORY (Pagination) ---
export async function getHistory(page: number = 1, limit: number = 15) {
  try {
    const skip = (page - 1) * limit;

    const [history, total] = await prisma.$transaction([
      prisma.usedEmail.findMany({
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
      }),
      prisma.usedEmail.count(),
    ]);

    return { 
      history, 
      total,
      totalPages: Math.ceil(total / limit) 
    };
  } catch (error) {
    console.error("History Error:", error);
    return { history: [], total: 0, totalPages: 0 };
  }
}

// --- 8. GET SYSTEM STATS (Rotation) ---
export async function getSystemStats() {
  const url = `https://${HOST}/stats`;
  
  try {
    const response = await fetchWithRotation(async (key) => {
      return await axios.get(url, {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": HOST,
        },
        timeout: 5000, 
      });
    });

    return { 
      isOnline: true, 
      stats: response.data 
    };
  } catch (error) {
    console.error("API Status Check Failed:", error);
    return { 
      isOnline: false, 
      stats: null 
    };
  }
}