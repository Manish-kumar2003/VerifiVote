/**
 * Dashboard.jsx
 *
 * Main authenticated view for both voters and admins.
 *
 * Admin features:
 *   - Create election
 *   - Activate / Close election
 *   - View results (any time)
 *
 * Voter features:
 *   - See all elections with status badges
 *   - Vote on active elections (opens Ballot modal)
 *   - View results for closed elections
 *   - See "Already Voted" state if authorization was already issued
 */

import { useEffect, useState, useCallback } from "react";
import {
    LogOut,
    RefreshCw,
    Vote,
    ShieldCheck,
    Plus,
    X,
    Trophy,
    Clock,
    CheckCircle2,
    Lock
} from "lucide-react";
import api from "../api";
import Ballot from "./Ballot";
import ElectionResults from "./ElectionResults";

// -------------------------------------------------------------------------
// Status badge
// -------------------------------------------------------------------------
function StatusBadge({ status }) {
    const cfg = {
        active:   { cls: "bg-emerald-100 text-emerald-700", label: "Active" },
        upcoming: { cls: "bg-amber-100 text-amber-700",     label: "Upcoming" },
        closed:   { cls: "bg-slate-100 text-slate-600",     label: "Closed" }
    };
    const { cls, label } = cfg[status] || cfg.closed;
    return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
            {label}
        </span>
    );
}

// -------------------------------------------------------------------------
// Election card
// -------------------------------------------------------------------------
function ElectionCard({ election, user, onOpenBallot, onLoadResults, actionLoading, votedElections }) {
    const isAdmin  = user.role === "admin";
    const hasVoted = votedElections.has(election._id);

    return (
        <article className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col">
            {/* Title + status */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold leading-snug">{election.title}</h3>
                <StatusBadge status={election.status} />
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500 flex-1">
                {election.description}
            </p>

            {/* Meta */}
            <div className="mt-4 space-y-1 border-t pt-4 text-xs text-slate-500">
                <p><span className="font-medium text-slate-700">Candidates:</span> {election.candidates?.length || 0}</p>
                <p className="flex items-center gap-1">
                    <Clock size={12} />
                    Starts: {new Date(election.startTime).toLocaleString()}
                </p>
                <p className="flex items-center gap-1">
                    <Clock size={12} />
                    Ends: {new Date(election.endTime).toLocaleString()}
                </p>
            </div>

            {/* Actions */}
            <div className="mt-4 border-t pt-4">
                {isAdmin ? (
                    <AdminActions
                        election={election}
                        onLoadResults={onLoadResults}
                        actionLoading={actionLoading}
                    />
                ) : (
                    <VoterActions
                        election={election}
                        hasVoted={hasVoted}
                        onOpenBallot={() => onOpenBallot(election)}
                        onLoadResults={onLoadResults}
                    />
                )}
            </div>
        </article>
    );
}

// -------------------------------------------------------------------------
// Admin action buttons inside a card
// -------------------------------------------------------------------------
function AdminActions({ election, onLoadResults, actionLoading }) {
    const [updatingStatus, setUpdatingStatus] = useState("");

    async function changeStatus(status) {
        setUpdatingStatus(status);
        try {
            await api.patch(`/elections/${election._id}/status`, { status });
            // Trigger parent refresh via a custom event (simpler than prop drilling)
            window.dispatchEvent(new CustomEvent("verifivote:refreshElections"));
        } catch (err) {
            alert(err.response?.data?.message || "Unable to update status.");
        } finally {
            setUpdatingStatus("");
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {election.status === "upcoming" && (
                <button
                    disabled={!!updatingStatus}
                    onClick={() => changeStatus("active")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-700"
                >
                    {updatingStatus === "active" ? "Activating…" : "Activate"}
                </button>
            )}
            {election.status === "active" && (
                <button
                    disabled={!!updatingStatus}
                    onClick={() => changeStatus("closed")}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-red-700"
                >
                    {updatingStatus === "closed" ? "Closing…" : "Close Election"}
                </button>
            )}
            <button
                onClick={() => onLoadResults(election._id)}
                className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50"
            >
                <Trophy size={13} className="mr-1 inline" />
                View Results
            </button>
        </div>
    );
}

// -------------------------------------------------------------------------
// Voter action buttons inside a card
// -------------------------------------------------------------------------
function VoterActions({ election, hasVoted, onOpenBallot, onLoadResults }) {
    if (election.status === "active") {
        if (hasVoted) {
            return (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    <span className="font-medium">You have voted in this election</span>
                </div>
            );
        }
        return (
            <button
                onClick={onOpenBallot}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
                <Vote size={15} />
                Vote Now
            </button>
        );
    }

    if (election.status === "upcoming") {
        return (
            <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock size={15} />
                <span>Voting opens at {new Date(election.startTime).toLocaleString()}</span>
            </div>
        );
    }

    if (election.status === "closed") {
        return (
            <button
                onClick={() => onLoadResults(election._id)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50"
            >
                <Trophy size={13} />
                View Results
            </button>
        );
    }

    return null;
}

// -------------------------------------------------------------------------
// Create election form (admin only)
// -------------------------------------------------------------------------
function CreateElectionForm({ onSuccess, onCancel }) {
    const [title,       setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [startTime,   setStartTime]   = useState("");
    const [endTime,     setEndTime]     = useState("");
    const [candidates,  setCandidates]  = useState([
        { name: "", party: "", symbol: "" },
        { name: "", party: "", symbol: "" }
    ]);
    const [creating, setCreating] = useState(false);
    const [error,    setError]    = useState("");

    function updateCandidate(i, field, value) {
        setCandidates(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        const valid = candidates.filter(c => c.name.trim() && c.party.trim());
        if (valid.length < 2) {
            setError("Please fill in at least two candidates (name + party).");
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            setError("End time must be after start time.");
            return;
        }

        setCreating(true);
        try {
            await api.post("/elections", {
                title,
                description,
                candidates: valid,
                startTime:  new Date(startTime).toISOString(),
                endTime:    new Date(endTime).toISOString()
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to create election.");
        } finally {
            setCreating(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border bg-white p-6 shadow-sm space-y-5"
        >
            <h3 className="text-xl font-bold">Create New Election</h3>

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
                <label className="mb-1 block text-sm font-medium">Election title</label>
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-brand-500"
                    placeholder="Student Council Election 2026"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-brand-500"
                    placeholder="Brief description of the election…"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium">Start time</label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        required
                        className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-brand-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium">End time</label>
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        required
                        className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-brand-500"
                    />
                </div>
            </div>

            {/* Candidates */}
            <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">Candidates</h4>
                    <button
                        type="button"
                        onClick={() => setCandidates(prev => [...prev, { name: "", party: "", symbol: "" }])}
                        className="text-sm font-semibold text-brand-600 hover:underline"
                    >
                        + Add candidate
                    </button>
                </div>

                <div className="space-y-3">
                    {candidates.map((c, i) => (
                        <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
                            <input
                                value={c.name}
                                onChange={e => updateCandidate(i, "name", e.target.value)}
                                placeholder="Full name"
                                className="rounded-lg border bg-white px-3 py-2 text-sm"
                            />
                            <input
                                value={c.party}
                                onChange={e => updateCandidate(i, "party", e.target.value)}
                                placeholder="Party / Group"
                                className="rounded-lg border bg-white px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                                <input
                                    value={c.symbol}
                                    onChange={e => updateCandidate(i, "symbol", e.target.value)}
                                    placeholder="Symbol / Emoji"
                                    className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
                                />
                                {candidates.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setCandidates(prev => prev.filter((_, idx) => idx !== i))}
                                        className="rounded-lg px-2 text-red-500 hover:bg-red-50"
                                        aria-label="Remove candidate"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-xl border py-3 text-sm font-medium hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                    {creating ? "Creating…" : "Create Election"}
                </button>
            </div>
        </form>
    );
}

// -------------------------------------------------------------------------
// Main Dashboard
// -------------------------------------------------------------------------
export default function Dashboard({ user, onLogout }) {
    const [elections,      setElections]      = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState("");
    const [success,        setSuccess]        = useState("");
    const [showForm,       setShowForm]       = useState(false);

    // Ballot modal state
    const [ballotElection, setBallotElection] = useState(null);

    // Results modal state
    const [resultsData,    setResultsData]    = useState(null);
    const [resultsLoading, setResultsLoading] = useState(false);

    // Track which elections this voter has already voted in (browser session)
    // Populated from Authorization 409 responses on each load
    const [votedElections, setVotedElections] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem("verifivote_voted") || "[]"));
        } catch {
            return new Set();
        }
    });

    // ------------------------------------------------------------------
    // Load elections
    // ------------------------------------------------------------------
    const loadElections = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res  = await api.get("/elections");
            const list = res.data.elections || res.data || [];
            setElections(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load elections.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadElections();
    }, [loadElections]);

    // Listen for refresh events from AdminActions sub-components
    useEffect(() => {
        const handler = () => loadElections();
        window.addEventListener("verifivote:refreshElections", handler);
        return () => window.removeEventListener("verifivote:refreshElections", handler);
    }, [loadElections]);

    // ------------------------------------------------------------------
    // Load results
    // ------------------------------------------------------------------
    async function loadResults(electionId) {
        setResultsLoading(true);
        setError("");
        try {
            const res = await api.get(`/voting/results/${electionId}`);
            setResultsData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to fetch results.");
        } finally {
            setResultsLoading(false);
        }
    }

    // ------------------------------------------------------------------
    // Vote success callback
    // ------------------------------------------------------------------
    function handleVoteSuccess(electionId) {
        // Remember this election was voted in (browser-local UX hint only)
        const next = new Set(votedElections);
        next.add(electionId);
        setVotedElections(next);
        localStorage.setItem("verifivote_voted", JSON.stringify([...next]));

        setSuccess("Your anonymous vote has been recorded successfully.");
        setBallotElection(null);
        loadElections();
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-slate-50">

            {/* Ballot modal */}
            {ballotElection && (
                <Ballot
                    election={ballotElection}
                    onClose={() => setBallotElection(null)}
                    onVoteSuccess={() => handleVoteSuccess(ballotElection._id)}
                />
            )}

            {/* Results modal */}
            {resultsData && (
                <ElectionResults
                    results={resultsData}
                    onClose={() => setResultsData(null)}
                />
            )}

            {/* Header */}
            <header className="border-b bg-white shadow-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-brand-600 p-2 text-white">
                            <Vote size={20} />
                        </div>
                        <div>
                            <span className="text-xl font-bold">VerifiVote</span>
                            <p className="text-xs text-slate-400 leading-none">
                                Anonymous &amp; Verifiable E-Voting
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs capitalize text-slate-500">{user.role}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            <LogOut size={15} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-10">

                {/* Hero banner */}
                <div className="rounded-2xl bg-brand-900 p-8 text-white">
                    <p className="text-sm text-indigo-300">VerifiVote Workspace</p>
                    <h1 className="mt-1 text-3xl font-bold">Welcome, {user.name}</h1>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
                            <ShieldCheck size={15} />
                            Role: {user.role}
                        </span>
                        {user.role === "voter" && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
                                <Lock size={14} />
                                Blind Signature Voting Enabled
                            </span>
                        )}
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {success}
                    </div>
                )}

                {/* Elections section header */}
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Elections</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {user.role === "admin"
                                ? "Manage elections and view results."
                                : "Vote anonymously using blind signatures."}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={loadElections}
                            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            <RefreshCw size={15} />
                            Refresh
                        </button>
                        {user.role === "admin" && (
                            <button
                                onClick={() => { setShowForm(f => !f); setError(""); setSuccess(""); }}
                                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                            >
                                {showForm ? <X size={15} /> : <Plus size={15} />}
                                {showForm ? "Cancel" : "Create Election"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Create election form */}
                {showForm && user.role === "admin" && (
                    <CreateElectionForm
                        onSuccess={() => {
                            setShowForm(false);
                            setSuccess("Election created successfully.");
                            loadElections();
                        }}
                        onCancel={() => setShowForm(false)}
                    />
                )}

                {/* Loading */}
                {loading && (
                    <div className="mt-10 text-center text-slate-500">
                        <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                        Loading elections…
                    </div>
                )}

                {/* Empty state */}
                {!loading && elections.length === 0 && (
                    <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center">
                        <Vote size={36} className="mx-auto text-slate-300" />
                        <h3 className="mt-4 font-semibold">No elections yet</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {user.role === "admin"
                                ? 'Click "Create Election" to get started.'
                                : "Check back later for active elections."}
                        </p>
                    </div>
                )}

                {/* Election cards grid */}
                {!loading && elections.length > 0 && (
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {elections.map(election => (
                            <ElectionCard
                                key={election._id}
                                election={election}
                                user={user}
                                onOpenBallot={setBallotElection}
                                onLoadResults={loadResults}
                                votedElections={votedElections}
                            />
                        ))}
                    </div>
                )}

                {/* Results loading overlay indicator */}
                {resultsLoading && (
                    <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg text-sm">
                        <RefreshCw size={15} className="animate-spin text-brand-600" />
                        Loading results…
                    </div>
                )}

                {/* Footer note */}
                <p className="mt-12 text-center text-xs text-slate-400">
                    VerifiVote is an educational prototype demonstrating blind signature-based anonymous voting.
                    It is not intended for real elections.
                </p>
            </main>
        </div>
    );
}