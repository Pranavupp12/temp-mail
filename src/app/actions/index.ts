// src/app/actions/index.ts
"use server";

import { prisma } from "@/lib/prisma";
import axios from "axios";
import { signOut } from "@/auth"; 

// Define the response type for type safety
type EmailResponse = {
  email: string;
  isDuplicate: boolean;
  previousStatus: string | null;
} | null;

// HELPER: Normalize Email (Remove dots and +tags)
function getParentEmail(email: string): string {
  if (!email.includes("@")) return email;
  
  const [localPart, domain] = email.split("@");
  
  // 1. Remove everything after a plus sign
  const noPlus = localPart.split("+")[0];
  
  // 2. Remove all dots
  const noDots = noPlus.replace(/\./g, "");
  
  return `${noDots}@${domain}`.toLowerCase();
}

// ---------------------------------------------------------
// 1. Generate Email (Updated for Variant API)
// ---------------------------------------------------------
export async function generateEmail(type: "dot" | "plus"): Promise<EmailResponse> {
  const endpoint = type === "dot" ? "/get-email-dot" : "/get-email-plus";
  const fullUrl = `https://${process.env.RAPID_API_HOST}${endpoint}`;
  
  try {
    const response = await axios.get(fullUrl, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": process.env.RAPID_API_HOST,
      },
    });

    const email = response.data.email;
    if (!email) return null;

    // --- NEW LOGIC START ---
    
    // 1. Calculate the Parent Email
    const parentEmail = getParentEmail(email);

    // 2. Check if ANY alias belonging to this parent has been used
    const existing = await prisma.usedEmail.findFirst({
      where: { parentEmail: parentEmail }, // Check the parent, not the specific alias
    });

    return { 
      email, 
      isDuplicate: !!existing, 
      // If it's a duplicate, tell us what status the Previous Alias had
      previousStatus: existing ? existing.status : null 
    };
    // --- NEW LOGIC END ---

  } catch (error) {
    console.error("API Error in generateEmail:", error);
    return null;
  }
}

// ---------------------------------------------------------
// 2. Fetch Inbox (Updated for Variant API)
// ---------------------------------------------------------
export async function checkInbox(email: string) {
  // The Variant API uses POST /get-mails
  const fullUrl = `https://${process.env.RAPID_API_HOST}/get-mails`;
  
  try {
    const response = await axios.post(fullUrl, 
      {
        email: email, // The email to check
        count: 20     // How many emails to fetch
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.RAPID_API_KEY,
          "X-RapidAPI-Host": process.env.RAPID_API_HOST,
        },
      }
    );
    
    // The API returns an array of emails
    return response.data || []; 
    
  } catch (error) {
    console.error("Inbox Error:", error);
    return [];
  }
}

// ---------------------------------------------------------
// 3. Mark Status (Same as before)
// ---------------------------------------------------------
// UPDATE: markEmailStatus needs to save the parentEmail too
export async function markEmailStatus(email: string, status: "SUCCESS" | "FAILED" | "USED_BY_OTHERS") {
  try {
    const parentEmail = getParentEmail(email); // Calculate it here too
    
    await prisma.usedEmail.upsert({
      where: { email },
      update: { status, parentEmail },
      create: { email, status, parentEmail },
    });
    return true;
  } catch (error) {
    console.error("DB Error:", error);
    return false;
  }
}

// ---------------------------------------------------------
// 4. Get Stats (Same as before)
// ---------------------------------------------------------
export async function getStats() {
  try {
    const total = await prisma.usedEmail.count();
    const success = await prisma.usedEmail.count({ where: { status: "SUCCESS" } });
    return { total, success };
  } catch (error) {
    return { total: 0, success: 0 };
  }
}

// ---------------------------------------------------------
// 5. Logout Action
// ---------------------------------------------------------
export async function logout() {
  await signOut({ redirectTo: "/login" });
}

// 6. Get History (Updated for Pagination)
export async function getHistory(page: number = 1, limit: number = 15) {
  try {
    const skip = (page - 1) * limit;

    // Run two queries in parallel: one for data, one for total count
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

// 7. Get System Stats (Live API Check)
export async function getSystemStats() {
  const url = `https://${process.env.RAPID_API_HOST}/stats`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": process.env.RAPID_API_HOST,
      },
      timeout: 5000, // Fail fast if offline
    });

    return { 
      isOnline: true, 
      stats: response.data // { total_dot_mails, total_plus_mails, total_mails }
    };
  } catch (error) {
    console.error("API Status Check Failed:", error);
    return { 
      isOnline: false, 
      stats: null 
    };
  }
}