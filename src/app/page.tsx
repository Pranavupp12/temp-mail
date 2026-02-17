"use client";

import { useState, useEffect } from "react";
import { generateEmail, checkInbox, markEmailStatus, getStats, getHistory, getSystemStats } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Signal, Loader2, RefreshCw, Copy, CheckCircle, XCircle, AlertTriangle, Mail, LogOut, History, Eye, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import components (keeping your specific paths)
import { EmailModal } from "@/components/dashboard/email-modal"; 
import { HistoryInboxModal } from "@/components/dashboard/history-inbox-modal";
import { HistoryTableSkeleton } from "@/components/skeletons/history-table-skeleton";
import { signOut } from "next-auth/react";

// Types
export type InboxItem = {
  sender: string;
  subject?: string;
  title?: string;
  body: string;
  date: string;
  snippet?: string;
};

type HistoryItem = {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
};

type ApiSystemStats = {
  total_dot_mails: number;
  total_plus_mails: number;
  total_mails: number;
} | null;

export default function Dashboard() {
  // --- STATE ---
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Logout loader
  const [markingStatus, setMarkingStatus] = useState<string | null>(null);

  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // NEW: API Status State
  const [apiOnline, setApiOnline] = useState<boolean | null>(null); // null = checking
  const [systemStats, setSystemStats] = useState<ApiSystemStats>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  // Modal State
  const [selectedMail, setSelectedMail] = useState<InboxItem | null>(null);

  // History Inbox Modal State
  const [historyInboxOpen, setHistoryInboxOpen] = useState(false);
  const [historyInboxEmail, setHistoryInboxEmail] = useState("");
  const [historyInboxMessages, setHistoryInboxMessages] = useState<InboxItem[]>([]);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => { 
    updateStats(); 
    refreshHistory(1);
    checkApiHealth();
  }, []);

  const updateStats = async () => {
    const s = await getStats();
    if (s) setStats(s);
  };

  // NEW: Check API Health & Stats
  const checkApiHealth = async () => {
    const result = await getSystemStats();
    setApiOnline(result.isOnline);
    if (result.stats) {
      setSystemStats(result.stats);
    }
  };

  const refreshHistory = async (page: number = 1) => {
    setHistoryLoading(true);
    const data = await getHistory(page, 15);
    setHistory(data.history);
    setTotalPages(data.totalPages);
    setCurrentPage(page);
    setHistoryLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      refreshHistory(newPage);
    }
  };

  // --- HANDLERS ---
  const handleGenerate = async (type: "dot" | "plus") => {
    setLoading(true);
    setInbox([]); 
    setDuplicateWarning(null);
    setCurrentEmail(null);
    
    const result = await generateEmail(type);
    
    if (result) {
      setCurrentEmail(result.email);
      if (result.isDuplicate) {
        // warning string format: Used before as "STATUS"
        setDuplicateWarning(`Used before as "${result.previousStatus}"`);
        toast.warning("Duplicate Email", { description: "You have used this alias before." });
      } else {
        toast.success("Email Generated", { description: "Ready to use." });
      }
      refreshHistory(1);
      updateStats();
    } else {
      toast.error("Generation Failed", { description: "Check API quota or connection." });
    }
    setLoading(false);
  };

  const handleCheckInbox = async () => {
    if (!currentEmail) return;
    setInboxLoading(true);
    
    const mails = await checkInbox(currentEmail);
    
    if (mails && mails.length > 0) {
      setInbox(mails);
      toast.success("Inbox Updated", { description: `Found ${mails.length} new emails.` });
    } else {
      setInbox([]);
      toast.info("Inbox Empty", { description: "No new emails found yet." });
    }
    setInboxLoading(false);
  };

  const handleMark = async (status: "SUCCESS" | "FAILED" | "USED_BY_OTHERS") => {
    if (!currentEmail) return;
    setMarkingStatus(status);

    const success = await markEmailStatus(currentEmail, status);
    
    if (success) {
      updateStats();
      refreshHistory(currentPage); 
      toast.success("Status Saved", { description: `Marked as ${status.toLowerCase().replace(/_/g, " ")}.` });
    } else {
      toast.error("Save Failed", { description: "Could not update database." });
    }
    setMarkingStatus(null);
  };

  const handleCopy = () => {
    if (currentEmail) {
      navigator.clipboard.writeText(currentEmail);
      toast.success("Copied!", { description: "Email copied to clipboard." });
    }
  };

  const handleViewHistoryInbox = async (historyItem: HistoryItem) => {
    setLoadingHistoryId(historyItem.id);
    const mails = await checkInbox(historyItem.email);
    setHistoryInboxEmail(historyItem.email);
    setHistoryInboxMessages(mails || []);
    setHistoryInboxOpen(true);
    setLoadingHistoryId(null);
    
    if (mails && mails.length > 0) {
      toast.success("History Retrieved", { description: `Found ${mails.length} emails in archive.` });
    } else {
      toast.info("Archive Empty", { description: "No emails found for this address." });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    // Client-side sign out guarantees the browser clears the cookies
    await signOut({ 
      callbackUrl: "/login", // Where to go after logout
      redirect: true 
    });
  };

  // --- HELPER: Status Explanations ---
  const getStatusExplanation = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return {
          label: "Worked",
          color: "bg-green-50 border-green-200 text-green-900",
          icon: <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />,
          desc: "You marked this as working perfectly. It receives emails correctly."
        };
      case "FAILED":
        return {
          label: "Blocked",
          color: "bg-red-50 border-red-200 text-red-900",
          icon: <XCircle className="h-5 w-5 text-red-600 mt-0.5" />,
          desc: "You marked this as blocked. It likely does not receive emails from the target site."
        };
      case "USED_BY_OTHERS":
        return {
          label: "Taken",
          color: "bg-orange-100 border-orange-200 text-orange-900",
          icon: <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />,
          desc: "You marked this as taken. It is already registered by someone else."
        };
      default:
        return {
          label: status,
          color: "bg-slate-50 border-slate-200 text-slate-900",
          icon: <Info className="h-5 w-5 text-slate-600 mt-0.5" />,
          desc: "This email was used previously."
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS": return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Success</Badge>;
      case "FAILED": return <Badge variant="destructive">Blocked</Badge>;
      case "USED_BY_OTHERS": return <Badge variant="secondary">Taken</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const cleanHtmlPreview = (text: string) => {
    if (!text) return "No content.";
    return text.replace(/<[^>]*>?/gm, " ").substring(0, 150) + "...";
  };

  // Extract previous status from duplicate warning string
  const previousStatus = duplicateWarning ? duplicateWarning.split('"')[1] : null;
  const statusInfo = previousStatus ? getStatusExplanation(previousStatus) : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Mail className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              TempMail <span className="text-slate-400 font-normal">Dashboard</span>
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            disabled={isLoggingOut}
            className="text-slate-500 hover:text-red-600"
          >
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            {isLoggingOut ? "Signing out..." : "Logout"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Generated</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold text-slate-800">{stats.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Success Rate</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(0) : 0}%
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">System Health</CardTitle>
              {apiOnline === true ? (
                 <Signal className="h-4 w-4 text-emerald-500 animate-pulse" />
              ) : apiOnline === false ? (
                 <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                 <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${apiOnline ? "text-slate-800" : "text-slate-400"}`}>
                    {systemStats ? (systemStats.total_mails / 1000).toFixed(0) + "k+" : "..."}
                  </span>
                  {apiOnline === true && <Badge className="bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] h-5">Online</Badge>}
                  {apiOnline === false && <Badge variant="destructive" className="px-2 py-0.5 text-[10px] h-5">Offline</Badge>}
                </div>
                
                {/* Stats Breakdown Tooltip */}
                {systemStats && (
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <p className="text-xs text-slate-500 cursor-help underline decoration-dotted underline-offset-2">
                           Available Aliases
                         </p>
                       </TooltipTrigger>
                       <TooltipContent className="bg-slate-800 text-white text-xs p-3 space-y-1">
                         <p className="font-bold border-b border-slate-600 pb-1 mb-1">System Capacity:</p>
                         <div className="flex justify-between gap-4"><span>Dot Aliases:</span> <span className="font-mono">{systemStats.total_dot_mails.toLocaleString()}</span></div>
                         <div className="flex justify-between gap-4"><span>Plus Aliases:</span> <span className="font-mono">{systemStats.total_plus_mails.toLocaleString()}</span></div>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Generator */}
          <div className="space-y-6">
            <Card className="border-t-4 border-t-blue-600 shadow-md h-full">
              <CardHeader><CardTitle>1. Generate Email</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => handleGenerate("dot")} disabled={loading} className="h-12 text-lg font-medium">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "New Dot Alias"}
                  </Button>
                  <Button onClick={() => handleGenerate("plus")} variant="outline" disabled={loading} className="h-12 text-lg font-medium">
                    New Plus Alias
                  </Button>
                </div>

                {currentEmail ? (
                  <div className={`p-5 rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-2 ${duplicateWarning ? "bg-gray-50 border-gray-200" : "bg-slate-50 border-blue-100"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-white/50 px-2 py-1 rounded">Active Inbox</span>
                      {duplicateWarning && <Badge variant="destructive" className="flex gap-1 items-center"><AlertTriangle size={12} /> Duplicate Detected</Badge>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 bg-white p-4 rounded-lg border border-slate-200 text-lg font-mono font-bold text-slate-800 break-all shadow-sm">{currentEmail}</code>
                      <Button size="icon" className="h-14 w-14 shrink-0" onClick={handleCopy}><Copy size={20} /></Button>
                    </div>
                    {!duplicateWarning && (
                      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Ready to receive emails.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 h-32 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400">Select a button above to start</div>
                )}

                {currentEmail && (
                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    
                    {/* --- CONDITIONAL UI: DUPLICATE VS FRESH --- */}
                    {duplicateWarning && statusInfo ? (
                      <div className={`rounded-lg p-4 border ${statusInfo.color}`}>
                        <div className="flex items-start gap-3">
                          <div className="shrink-0">{statusInfo.icon}</div>
                          <div>
                            <h4 className="font-bold text-sm mb-1">Used before and marked as "{statusInfo.label}"</h4>
                            <p className="text-xs opacity-90 leading-relaxed">{statusInfo.desc}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-700">Did this email work?</p>
                        <div className="grid grid-cols-3 gap-3">
                          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMark("SUCCESS")} disabled={!!markingStatus}>
                            {markingStatus === "SUCCESS" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-2 h-4 w-4" /> Worked</>}
                          </Button>
                          <Button variant="destructive" onClick={() => handleMark("FAILED")} disabled={!!markingStatus}>
                            {markingStatus === "FAILED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="mr-2 h-4 w-4" /> Blocked</>}
                          </Button>
                          <Button variant="secondary" onClick={() => handleMark("USED_BY_OTHERS")} className="bg-slate-200 hover:bg-slate-300" disabled={!!markingStatus}>
                            {markingStatus === "USED_BY_OTHERS" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Taken"}
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                           * worked: receiving emails • blocked: not receiving • taken: registered by others
                        </p>
                      </>
                    )}

                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Inbox with Skeletons */}
          <div className="space-y-6">
            <Card className="h-full border-t-4 border-t-purple-600 shadow-md flex flex-col min-h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <CardTitle>2. Inbox</CardTitle>
                <Button size="sm" variant="outline" onClick={handleCheckInbox} disabled={!currentEmail || inboxLoading} className="border-purple-200 hover:bg-purple-50 text-purple-700">
                  {inboxLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Refresh Inbox
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
                {!currentEmail ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-4">
                    <div className="bg-slate-100 p-4 rounded-full"><Mail size={32} className="opacity-40" /></div>
                    <p>Generate an email first to see the inbox.</p>
                  </div>
                ) : inboxLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between mb-2">
                           <Skeleton className="h-4 w-24" />
                           <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : inbox.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-4">
                    <div className="bg-slate-100 p-4 rounded-full"><RefreshCw size={32} className="opacity-40" /></div>
                    <div><p className="font-medium text-slate-600">Inbox is empty</p><p className="text-xs mt-1">Waiting for emails...</p></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inbox.map((mail, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedMail(mail)} 
                        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-purple-300 transition-all cursor-pointer group hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded truncate max-w-[150px]">{mail.sender || "Unknown Sender"}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">{mail.date ? new Date(mail.date).toLocaleTimeString() : "Just now"}</span>
                        </div>
                        <h4 className="font-semibold text-purple-700 text-sm mb-2 group-hover:underline truncate">{mail.subject || mail.title || "(No Subject)"}</h4>
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 font-mono break-all whitespace-pre-wrap max-h-24 overflow-hidden relative">
                           {cleanHtmlPreview(mail.body || mail.snippet || "")}
                        </div>
                        <div className="text-[10px] text-blue-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity text-right">
                          Click to read full email →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* History Table with Pagination & Skeletons */}
        <Card className="mt-8 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-slate-500" /> History Log</CardTitle>
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1 mr-2 text-sm text-slate-500">
                  <span className="font-medium">{currentPage}</span> / {totalPages}
               </div>
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-8 w-8" 
                 onClick={() => handlePageChange(currentPage - 1)} 
                 disabled={currentPage === 1 || historyLoading}
               >
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-8 w-8" 
                 onClick={() => handlePageChange(currentPage + 1)} 
                 disabled={currentPage >= totalPages || historyLoading}
               >
                 <ChevronRight className="h-4 w-4" />
               </Button>
               <div className="h-4 w-px bg-slate-200 mx-2" />
               <Button variant="ghost" size="sm" onClick={() => refreshHistory(currentPage)}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <HistoryTableSkeleton />
                ) : history.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">No history yet.</TableCell></TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-slate-700">{item.email}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {item.status === "SUCCESS" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleViewHistoryInbox(item)}
                            disabled={loadingHistoryId === item.id}
                          >
                            {loadingHistoryId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 mr-2" />}
                            View Inbox
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modals */}
        <EmailModal email={selectedMail} onClose={() => setSelectedMail(null)} />
        <HistoryInboxModal isOpen={historyInboxOpen} onClose={() => setHistoryInboxOpen(false)} email={historyInboxEmail} messages={historyInboxMessages} />
      </div>
    </div>
  );
}