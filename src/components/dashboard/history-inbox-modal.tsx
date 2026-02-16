"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Calendar } from "lucide-react";

// Reuse your existing type
export type InboxItem = {
  sender: string;
  subject?: string;
  title?: string;
  body: string;
  date: string;
  snippet?: string;
};

interface HistoryInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  messages: InboxItem[];
}

export function HistoryInboxModal({ isOpen, onClose, email, messages }: HistoryInboxModalProps) {
  const [selectedMessage, setSelectedMessage] = useState<InboxItem | null>(null);

  // Reset selection when modal closes
  const handleClose = () => {
    setSelectedMessage(null);
    onClose();
  };

  // Helper to clean HTML
  const cleanHtml = (text: string) => {
    if (!text) return "No content.";
    let cleaned = text.replace(/<[^>]*>?/gm, " ");
    return cleaned
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex items-center gap-2">
            {selectedMessage && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(null)} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {selectedMessage ? "Message Details" : "Inbox History"}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs mt-1 bg-slate-100 px-2 py-1 rounded w-fit">
                {email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {selectedMessage ? (
            // --- VIEW 2: FULL MESSAGE DETAIL ---
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                <div className="border-b pb-4 space-y-2">
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedMessage.subject || selectedMessage.title || "(No Subject)"}
                  </h2>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <span className="font-medium text-slate-700">From: {selectedMessage.sender}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : "Unknown date"}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-mono whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
                  {cleanHtml(selectedMessage.body || selectedMessage.snippet || "")}
                </div>
              </div>
            </div>
          ) : (
            // --- VIEW 1: MESSAGE LIST ---
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                  <div className="bg-slate-100 p-4 rounded-full mb-3">
                    <Mail className="h-8 w-8 opacity-20" />
                  </div>
                  <p>No emails found for this address.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedMessage(msg)}
                    className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-sm">{msg.sender}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {msg.date ? new Date(msg.date).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <h4 className="font-medium text-blue-600 text-sm mb-1 group-hover:underline truncate">
                      {msg.subject || msg.title || "(No Subject)"}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 font-mono">
                      {cleanHtml(msg.body || msg.snippet || "")}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex justify-end shrink-0">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}