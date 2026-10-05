/**
 * Ballot.jsx
 *
 * Full blind-signature voting flow for a voter on an active election.
 *
 * Flow:
 *   STEP 1: Select candidate
 *   STEP 2: Review selection + request anonymous authorization
 *   STEP 3: (automatic) Blind token → authorize → unblind
 *   STEP 4: Cast anonymous vote
 *   STEP 5: Success / error display
 *
 * Privacy note:
 *   - The JWT Authorization header is NOT sent with the /voting/cast request.
 *   - The server never sees the raw token (only the blinded message).
 *   - The Vote document in the database contains no voterId.
 */

import { useState } from "react";
import {
    X,
    ShieldCheck,
    Vote,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ChevronRight,
    User2,
    Building2
} from "lucide-react";
import api from "../api";
import {
    generateToken,
    jwkParamToBigInt,
    blindToken,
    unblindSignature
} from "../services/crypto/blindSignature";

// Step identifiers
const STEPS = {
    SELECT:      "select",
    REVIEW:      "review",
    AUTHORIZING: "authorizing",
    CASTING:     "casting",
    SUCCESS:     "success",
    ERROR:       "error"
};

export default function Ballot({ election, onClose, onVoteSuccess }) {
    const [step,              setStep]              = useState(STEPS.SELECT);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [errorMsg,          setErrorMsg]          = useState("");

    // -----------------------------------------------------------------
    // Full blind-signature voting flow
    // -----------------------------------------------------------------
    async function runVotingFlow() {
        setErrorMsg("");
        setStep(STEPS.AUTHORIZING);

        try {
            // ---- 1. Fetch public RSA key (only kty, n, e) ---------------
            const pkRes = await api.get("/voting/public-key");
            const { n: nB64, e: eB64 } = pkRes.data.publicKey;

            // Convert base64url JWK params to BigInt
            const n = jwkParamToBigInt(nB64);
            const e = jwkParamToBigInt(eB64);

            // ---- 2. Generate a fresh random voting token -----------------
            const token = generateToken();

            // ---- 3. Blind the token with the public key -----------------
            const { blindedMessage, blindingFactor } = await blindToken(token, n, e);

            // ---- 4. Request authorization (voter JWT required here) ------
            //    The server signs the blinded message without seeing the token.
            const authRes = await api.post("/voting/authorize", {
                electionId:    election._id,
                blindedMessage // server sees only this, not the raw token
            });
            const { blindedSignature } = authRes.data;

            // ---- 5. Unblind the signature locally -----------------------
            //    sig = blindedSignature * r^-1 mod n
            const signature = unblindSignature(blindedSignature, blindingFactor, n);

            // ---- 6. Cast the anonymous vote ------------------------------
            //    No JWT sent here — voter identity is detached from the ballot.
            setStep(STEPS.CASTING);

            await api.post(
                "/voting/cast",
                {
                    electionId:  election._id,
                    candidateId: selectedCandidate._id,
                    token,      // raw token (server hashes it → tokenHash)
                    signature   // unblinded signature (server verifies with public key)
                },
                {
                    // Explicitly remove Authorization header for this request
                    // so the anonymous vote is not linked to the voter's JWT.
                    headers: { Authorization: "" }
                }
            );

            setStep(STEPS.SUCCESS);
            if (onVoteSuccess) onVoteSuccess();

        } catch (err) {
            const msg = err.response?.data?.message || err.message || "An unexpected error occurred.";
            setErrorMsg(msg);
            setStep(STEPS.ERROR);
        }
    }

    // -----------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------

    const StatusBadge = ({ status }) => {
        const colors = {
            active:   "bg-emerald-100 text-emerald-700",
            upcoming: "bg-amber-100 text-amber-700",
            closed:   "bg-slate-100 text-slate-600"
        };
        return (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status] || colors.closed}`}>
                {status}
            </span>
        );
    };

    // -----------------------------------------------------------------
    // Step: Select candidate
    // -----------------------------------------------------------------
    const renderSelect = () => (
        <>
            <p className="mb-5 text-sm text-slate-500">
                Select the candidate you wish to vote for.
            </p>
            <div className="space-y-3">
                {election.candidates.map((candidate) => (
                    <button
                        key={candidate._id}
                        onClick={() => setSelectedCandidate(candidate)}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                            selectedCandidate?._id === candidate._id
                                ? "border-brand-600 bg-brand-50"
                                : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                                selectedCandidate?._id === candidate._id
                                    ? "bg-brand-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                            }`}>
                                {candidate.symbol || candidate.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{candidate.name}</p>
                                <p className="flex items-center gap-1 text-sm text-slate-500">
                                    <Building2 size={12} />
                                    {candidate.party || "Independent"}
                                </p>
                            </div>
                            {selectedCandidate?._id === candidate._id && (
                                <CheckCircle2 size={20} className="shrink-0 text-brand-600" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <button
                disabled={!selectedCandidate}
                onClick={() => setStep(STEPS.REVIEW)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Review Selection
                <ChevronRight size={18} />
            </button>
        </>
    );

    // -----------------------------------------------------------------
    // Step: Review + initiate blind signature flow
    // -----------------------------------------------------------------
    const renderReview = () => (
        <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm">
                <h4 className="mb-3 font-semibold text-slate-700">Your Selection</h4>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Election</span>
                        <span className="font-medium text-right max-w-[60%]">{election.title}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Candidate</span>
                        <span className="font-medium">{selectedCandidate?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Party</span>
                        <span className="font-medium">{selectedCandidate?.party || "Independent"}</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-700">
                <p className="font-semibold mb-1">🔐 Blind Signature Protocol</p>
                <p>
                    Clicking the button below will generate a random voting token,
                    cryptographically blind it, and send only the blinded value to the
                    election authority. Your identity cannot be linked to your ballot.
                </p>
            </div>

            <div className="mt-5 flex gap-3">
                <button
                    onClick={() => setStep(STEPS.SELECT)}
                    className="flex-1 rounded-xl border py-3 text-sm font-medium hover:bg-slate-50"
                >
                    Back
                </button>
                <button
                    onClick={runVotingFlow}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                    <ShieldCheck size={16} />
                    Request Anonymous Authorization
                </button>
            </div>
        </>
    );

    // -----------------------------------------------------------------
    // Step: Authorizing (blind signing in progress)
    // -----------------------------------------------------------------
    const renderAuthorizing = () => (
        <div className="py-6 text-center">
            <Loader2 size={40} className="mx-auto animate-spin text-brand-600" />
            <p className="mt-4 font-semibold">Obtaining Anonymous Authorization…</p>
            <div className="mt-4 space-y-2 text-left text-xs text-slate-500">
                <p className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Generating cryptographically secure token
                </p>
                <p className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Blinding token with RSA public key
                </p>
                <p className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-brand-500" />
                    Sending blinded message to election authority…
                </p>
            </div>
        </div>
    );

    // -----------------------------------------------------------------
    // Step: Casting (unblinding done, submitting anonymous ballot)
    // -----------------------------------------------------------------
    const renderCasting = () => (
        <div className="py-6 text-center">
            <Loader2 size={40} className="mx-auto animate-spin text-brand-600" />
            <p className="mt-4 font-semibold">Submitting Anonymous Ballot…</p>
            <div className="mt-4 space-y-2 text-left text-xs text-slate-500">
                <p className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Authorization received from authority
                </p>
                <p className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Signature unblinded locally
                </p>
                <p className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-brand-500" />
                    Casting anonymous ballot (no identity attached)…
                </p>
            </div>
        </div>
    );

    // -----------------------------------------------------------------
    // Step: Success
    // -----------------------------------------------------------------
    const renderSuccess = () => (
        <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-emerald-700">Vote Cast Successfully</h3>
            <p className="mt-2 text-sm text-slate-600">
                Your anonymous ballot has been recorded.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 text-left space-y-1">
                <p>✓ Your identity is not linked to your ballot</p>
                <p>✓ The vote cannot be traced back to you</p>
                <p>✓ The signature was verified by the server</p>
                <p>✓ Double-voting is prevented by the server</p>
            </div>
            <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
            >
                Close
            </button>
        </div>
    );

    // -----------------------------------------------------------------
    // Step: Error
    // -----------------------------------------------------------------
    const renderError = () => (
        <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertCircle size={30} className="text-red-600" />
            </div>
            <p className="mt-4 font-semibold text-red-700">Voting Failed</p>
            <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">{errorMsg}</p>

            {errorMsg?.includes("already") ? (
                // Already voted — permanent state
                <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    You have already voted in this election. Each voter may cast one ballot.
                </div>
            ) : (
                // Retriable error
                <button
                    onClick={() => setStep(STEPS.REVIEW)}
                    className="mt-5 w-full rounded-xl border py-3 text-sm font-medium hover:bg-slate-50"
                >
                    Try Again
                </button>
            )}

            <button
                onClick={onClose}
                className="mt-3 w-full rounded-xl bg-slate-100 py-3 text-sm font-medium hover:bg-slate-200"
            >
                Close
            </button>
        </div>
    );

    // -----------------------------------------------------------------
    // Main render
    // -----------------------------------------------------------------
    const stepContent = {
        [STEPS.SELECT]:      renderSelect,
        [STEPS.REVIEW]:      renderReview,
        [STEPS.AUTHORIZING]: renderAuthorizing,
        [STEPS.CASTING]:     renderCasting,
        [STEPS.SUCCESS]:     renderSuccess,
        [STEPS.ERROR]:       renderError
    };

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                // Close on backdrop click only if not in the middle of voting
                if (
                    e.target === e.currentTarget &&
                    step !== STEPS.AUTHORIZING &&
                    step !== STEPS.CASTING
                ) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Vote size={20} className="text-brand-600" />
                        <div>
                            <h2 className="font-bold leading-tight">Ballot</h2>
                            <p className="text-xs text-slate-500 truncate max-w-[240px]">
                                {election.title}
                            </p>
                        </div>
                    </div>
                    {step !== STEPS.AUTHORIZING && step !== STEPS.CASTING && (
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close ballot"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Step progress indicator */}
                {step === STEPS.SELECT || step === STEPS.REVIEW ? (
                    <div className="flex border-b">
                        {["Select", "Review"].map((label, i) => {
                            const isActive =
                                (i === 0 && step === STEPS.SELECT) ||
                                (i === 1 && step === STEPS.REVIEW);
                            const isDone =
                                (i === 0 && step === STEPS.REVIEW);
                            return (
                                <div
                                    key={label}
                                    className={`flex-1 py-2 text-center text-xs font-medium ${
                                        isActive
                                            ? "border-b-2 border-brand-600 text-brand-600"
                                            : isDone
                                                ? "text-emerald-600"
                                                : "text-slate-400"
                                    }`}
                                >
                                    {isDone ? "✓ " : ""}{i + 1}. {label}
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    {(stepContent[step] || (() => null))()}
                </div>
            </div>
        </div>
    );
}
