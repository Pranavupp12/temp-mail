// src/components/email-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Define the shape of the email object
interface InboxItem {
  sender: string;
  subject?: string;
  title?: string;
  body: string;
  date: string;
  snippet?: string;
}

interface EmailModalProps {
  email: InboxItem | null;
  onClose: () => void;
}

export function EmailModal({ email, onClose }: EmailModalProps) {
  // Helper to clean HTML for display
  const cleanHtml = (text: string) => {
    if (!text) return "No content.";
    let cleaned = text.replace(/<[^>]*>?/gm, " ");
    cleaned = cleaned
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    return cleaned;
  };

  return (
    <Dialog open={!!email} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="space-y-1 pr-4">
            <DialogTitle className="text-xl font-bold text-slate-800 break-words">
              {email?.subject || email?.title || "(No Subject)"}
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span className="font-semibold text-slate-700">
                From: {email?.sender}
              </span>
              <span className="text-xs text-slate-500">
                Received: {email?.date ? new Date(email.date).toLocaleString() : ""}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="bg-slate-50 p-4 rounded-md border text-sm font-mono whitespace-pre-wrap break-words text-slate-800">
            {email ? cleanHtml(email.body || email.snippet || "") : ""}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}