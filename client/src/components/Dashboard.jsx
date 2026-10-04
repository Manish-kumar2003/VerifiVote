import { useEffect, useState } from "react";
import {
    LogOut,
    RefreshCw,
    Vote,
    ShieldCheck,
    Plus,
    X,
} from "lucide-react";
import api from "../api";

export default function Dashboard({ user, onLogout }) {
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const [candidates, setCandidates] = useState([
        { name: "", party: "", symbol: "" },
        { name: "", party: "", symbol: "" },
    ]);

    const [resultsByElection, setResultsByElection] = useState({});
    const [actionLoading, setActionLoading] = useState("");

    async function loadElections() {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/elections");
            const data = response.data;
            const list = Array.isArray(data)
                ? data
                : data.elections || data.data || [];
            setElections(list);

        } catch(err) {
            setError(
                err.response?.data?.message ||
                "Unable to load elections."
            );

        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadElections();
    }, []);

    function updateCandidate(index, field, value) {
        setCandidates((previous) =>
            previous.map((candidate, i) =>
                i === index
                    ? { ...candidate, [field]: value }
                    : candidate
            )
        );
    }

    function addCandidate() {
        setCandidates((previous) => [
            ...previous,
            { name: "", party: "", symbol: "" },
        ]);
    }

    function removeCandidate(index) {
        setCandidates((previous) =>
            previous.filter((_, i) => i !== index)
        );
    }

    async function handleCreateElection(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const validCandidates = candidates.filter(
            (candidate) =>
                candidate.name.trim() &&
                candidate.party.trim() &&
                candidate.symbol.trim()
        );

        if(validCandidates.length < 2) {
            setError("Please provide at least two complete candidates.");
            return;
        }

        if(new Date(startTime) >= new Date(endTime)) {
            setError("End time must be later than start time.");
            return;
        }

        setCreating(true);

        try {
            await api.post("/elections", {
                title,
                description,
                candidates: validCandidates,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
            });

            setSuccess("Election created successfully.");

            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");
            setCandidates([
                { name: "", party: "", symbol: "" },
                { name: "", party: "", symbol: "" },
            ]);

            setShowForm(false);

            await loadElections();

        } catch(err) {
            setError(
                err.response?.data?.message ||
                "Unable to create election. Check admin permissions and API."
            );

        } finally {
            setCreating(false);
        }
    }

    async function updateElectionStatus(electionId, status) {
        setError("");
        setSuccess("");
        setActionLoading(electionId);

        try {
            await api.patch(`/elections/${electionId}/status`, {
                status,
            });
            setSuccess(`Election status changed to ${status}.`);
            await loadElections();

        } catch(err) {
            setError(
                err.response?.data?.message ||
                "Unable to update election status."
            );
        } finally {
            setActionLoading("");
        }
    }

    async function loadResults(electionId) {
        setError("");

        try {
            const response = await api.get(
                `/voting/results/${electionId}`
            );

            setResultsByElection((previous) => ({
                ...previous,
                [electionId]: response.data,
            }));
            
        } catch(err) {
            setError(
                err.response?.data?.message ||
                "Unable to fetch election results."
            );
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">

            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-brand-600 p-2 text-white">
                            <Vote size={22} />
                        </div>

                        <span className="text-xl font-bold">
                            VerifiVote
                        </span>
                    </div>

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-10">

                <div className="rounded-2xl bg-brand-900 p-8 text-white">
                    <p className="text-sm text-indigo-200">
                        VerifiVote Workspace
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        Welcome, {user.name}
                    </h1>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                        <ShieldCheck size={16} />
                        Role: {user.role}
                    </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">
                            Elections
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Elections retrieved from MongoDB.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={loadElections}
                            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>

                        {user.role === "admin" && (
                            <button
                                onClick={() => {
                                    setShowForm(!showForm);
                                    setError("");
                                    setSuccess("");
                                }}
                                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                            >
                                {showForm ? <X size={17} /> : <Plus size={17} />}
                                {showForm ? "Close" : "Create Election"}
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                        {success}
                    </div>
                )}

                {showForm && user.role === "admin" && (
                    <form
                        onSubmit={handleCreateElection}
                        className="mt-8 space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
                    >
                        <h3 className="text-xl font-bold">
                            Create New Election
                        </h3>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Election title
                            </label>

                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full rounded-lg border px-4 py-3"
                                placeholder="Student Council Election 2026"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Description
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={3}
                                className="w-full rounded-lg border px-4 py-3"
                                placeholder="Election details..."
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Start time
                                </label>

                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    End time
                                </label>

                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold">
                                    Candidates
                                </h4>

                                <button
                                    type="button"
                                    onClick={addCandidate}
                                    className="text-sm font-semibold text-brand-600 hover:underline"
                                >
                                    + Add candidate
                                </button>
                            </div>

                            <div className="space-y-4">
                                {candidates.map((candidate, index) => (
                                    <div
                                        key={index}
                                        className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3"
                                    >
                                        <input
                                            value={candidate.name}
                                            onChange={(e) =>
                                                updateCandidate(index, "name", e.target.value)
                                            }
                                            required
                                            placeholder="Candidate name"
                                            className="rounded-lg border bg-white px-3 py-3"
                                        />

                                        <input
                                            value={candidate.party}
                                            onChange={(e) =>
                                                updateCandidate(index, "party", e.target.value)
                                            }
                                            required
                                            placeholder="Party / Group"
                                            className="rounded-lg border bg-white px-3 py-3"
                                        />

                                        <div className="flex gap-2">
                                            <input
                                                value={candidate.symbol}
                                                onChange={(e) =>
                                                    updateCandidate(index, "symbol", e.target.value)
                                                }
                                                required
                                                placeholder="Symbol"
                                                className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-3"
                                            />

                                            {candidates.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCandidate(index)}
                                                    className="rounded-lg px-3 text-red-600 hover:bg-red-50"
                                                    aria-label="Remove candidate"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                            {creating ? "Creating..." : "Create Election"}
                        </button>
                    </form>
                )}

                {loading && (
                    <p className="mt-8 text-slate-500">
                        Loading elections...
                    </p>
                )}

                {!loading && !error && elections.length === 0 && (
                    <div className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center">
                        <Vote className="mx-auto text-slate-400" size={35} />

                        <h3 className="mt-4 font-semibold">
                            No elections available
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {user.role === "admin"
                                ? "Use Create Election to add your first election."
                                : "There are currently no elections."}
                        </p>
                    </div>
                )}

                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {elections.map((election) => (
                        <article
                            key={election._id}
                            className="rounded-2xl border bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="text-lg font-bold">
                                    {election.title}
                                </h3>

                                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">
                                    {election.status}
                                </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                {election.description}
                            </p>

                            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
                                <p>
                                    <span className="font-medium">Candidates:</span>{" "}
                                    {election.candidates?.length || 0}
                                </p>

                                <p className="text-slate-500">
                                    Starts: {new Date(election.startTime).toLocaleString()}
                                </p>

                                <p className="text-slate-500">
                                    Ends: {new Date(election.endTime).toLocaleString()}
                                </p>
                            </div>
                            <div className="mt-5 border-t pt-4">
                                {user.role === "admin" && (
                                    <div className="flex flex-wrap gap-2">

                                        {election.status === "upcoming" && (
                                            <button
                                                disabled={actionLoading === election._id}
                                                onClick={() =>
                                                    updateElectionStatus(election._id, "active")
                                                }
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                            >
                                                Activate
                                            </button>
                                        )}

                                        {election.status === "active" && (
                                            <button
                                                disabled={actionLoading === election._id}
                                                onClick={() =>
                                                    updateElectionStatus(election._id, "closed")
                                                }
                                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                            >
                                                Close Election
                                            </button>
                                        )}

                                        <button
                                            onClick={() => loadResults(election._id)}
                                            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                                        >
                                            View Results
                                        </button>
                                    </div>
                                )}

                                {user.role === "voter" && election.status === "active" && (
                                    <p className="mt-3 text-sm font-medium text-emerald-700">
                                        Election is active. Voting workflow will be enabled next.
                                    </p>
                                )}

                                {election.status === "closed" && (
                                    <button
                                        onClick={() => loadResults(election._id)}
                                        className="mt-3 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                                    >
                                        View Results
                                    </button>
                                )}

                                {resultsByElection[election._id] && (
                                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                        <h4 className="mb-3 font-semibold">
                                            Election Results
                                        </h4>

                                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                                            {JSON.stringify(
                                                resultsByElection[election._id],
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </main>
        </div>
    );
}