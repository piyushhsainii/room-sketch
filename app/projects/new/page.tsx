"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { findWorkspaceTemplate, type WorkspaceTemplate } from "@/components/dashboard/workspaceTemplates";
import type { ProjectFloorPlan } from "@/components/workspace/lib/floor-data";
import type { SceneConfig } from "@/components/workspace/lib/scene-config"
import { SavePromptError } from "@/lib/workspace/save-auth-error";
import { planFor } from "@/lib/plan";
import { invalidateCache } from "@/lib/projectCache";

const FloorPlanEditor = dynamic(() => import("@/components/workspace/FloorPlanEditor"), { ssr: false });

type Draft = { projectFloorPlan: ProjectFloorPlan; sceneConfig: SceneConfig };
type Prompt = { kind: "sign-in" } | { kind: "limit"; plan: string };

function readDraft(key: string): Draft | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const draft = JSON.parse(raw) as Draft;
        const plan = draft?.projectFloorPlan;
        if (Array.isArray(plan?.floors) && plan.floors.some(floor => floor.id === plan.activeFloorId) &&
            plan.floors.every(floor => Array.isArray(floor.state?.lineNodes) && Array.isArray(floor.state?.rooms)) &&
            Array.isArray(draft?.sceneConfig?.rooms)) return draft;
    } catch {
        // An invalid or inaccessible draft should not prevent opening the editor.
    }
    return null;
}

export default function NewProjectPage() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get("template");
    const template = findWorkspaceTemplate(templateId);
    const query = new URLSearchParams(searchParams.toString());
    query.set("save", "1");
    const returnTo = `/projects/new?${query}`;
    return <DraftEditor key={template?.id ?? "blank"} template={template} resumeSave={searchParams.get("save") === "1"} loginHref={`/login?${new URLSearchParams({ redirectTo: returnTo })}`} />;
}

function DraftEditor({ template, loginHref, resumeSave }: { template?: WorkspaceTemplate; loginHref: string; resumeSave: boolean }) {
    const router = useRouter();
    const key = `roomsketch:new-project:v1:${template?.id ?? "blank"}`;
    const [templateLayout] = useState(() => template?.create());
    const [initialDraft, setInitialDraft] = useState<Draft | null | undefined>();
    const [storageStatus, setStorageStatus] = useState<"saved" | "unavailable" | null>(null);
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveAccess, setSaveAccess] = useState<"checking" | "guest" | "signed-in">("checking");
    const latest = useRef<Draft | null>(null);
    const initial = useRef<Draft | null>(null);
    const written = useRef<string | null>(null);
    const autosave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const resumedSave = useRef(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const saving = useRef(false);
    const finished = useRef(false);
    const dialog = useRef<HTMLDialogElement>(null);

    const writeDraft = useCallback((snapshot: Draft) => {
        const raw = JSON.stringify(snapshot);
        try {
            if (raw !== written.current) localStorage.setItem(key, raw);
            written.current = raw;
            return true;
        } catch {
            return false;
        }
    }, [key]);

    const flush = useCallback(() => {
        if (finished.current || !latest.current) return true;
        if (!written.current && JSON.stringify(latest.current) === JSON.stringify(initial.current)) return true;
        return writeDraft(latest.current);
    }, [writeDraft]);

    function signInToSave() {
        // Persist even an unchanged template before leaving for authentication.
        if (latest.current && writeDraft(latest.current)) {
            window.location.assign(loginHref);
        } else {
            setStorageStatus("unavailable");
            setPrompt({ kind: "sign-in" });
        }
    }

    useEffect(() => {
        let request: AbortController | undefined;
        async function refreshAccess() {
            request?.abort();
            const current = new AbortController();
            request = current;
            try {
                const response = await fetch("/api/me", { cache: "no-store", signal: current.signal });
                if (!response.ok) throw new Error("Could not check session");
                const { authed } = await response.json();
                if (!current.signal.aborted) setSaveAccess(authed === true ? "signed-in" : "guest");
            } catch {
                if (!current.signal.aborted) setSaveAccess(access => access === "checking" ? "guest" : access);
            }
        }
        void refreshAccess();
        window.addEventListener("focus", refreshAccess);
        return () => {
            request?.abort();
            window.removeEventListener("focus", refreshAccess);
        };
    }, []);

    const onDraftChange = useCallback((projectFloorPlan: ProjectFloorPlan, sceneConfig: SceneConfig) => {
        const snapshot = { projectFloorPlan, sceneConfig };
        if (!initial.current) initial.current = snapshot;
        latest.current = snapshot;
        clearTimeout(autosave.current);
        autosave.current = setTimeout(() => {
            if (finished.current || (!written.current && JSON.stringify(snapshot) === JSON.stringify(initial.current))) return;
            setStorageStatus(flush() ? "saved" : "unavailable");
        }, 500);
    }, [flush]);

    useEffect(() => {
        const draft = readDraft(key);
        if (draft) {
            written.current = JSON.stringify(draft);
            setStorageStatus("saved");
        }
        setInitialDraft(draft);
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!flush()) event.preventDefault();
        };
        window.addEventListener("beforeunload", beforeUnload);
        window.addEventListener("pagehide", flush);
        return () => {
            window.removeEventListener("beforeunload", beforeUnload);
            window.removeEventListener("pagehide", flush);
            clearTimeout(autosave.current);
        };
    }, [key, flush]);

    useEffect(() => {
        if (saveAccess === "signed-in" && prompt?.kind === "sign-in") {
            dialog.current?.close();
            setPrompt(null);
            return;
        }
        if (prompt && !dialog.current?.open) dialog.current?.showModal();
    }, [prompt, saveAccess]);

    function removeWrittenDraft() {
        try {
            if (written.current && localStorage.getItem(key) === written.current) localStorage.removeItem(key);
        } catch {
            // Storage may be disabled or inaccessible.
        }
    }

    function discardDraft() {
        finished.current = true;
        removeWrittenDraft();
    }

    async function saveNewProject(projectFloorPlan: ProjectFloorPlan, sceneConfig: SceneConfig) {
        if (saving.current) throw new SavePromptError();
        saving.current = true;
        setIsSaving(true);
        setSaveError(null);
        const snapshot = { projectFloorPlan, sceneConfig };
        latest.current = snapshot;
        setStorageStatus(writeDraft(snapshot) ? "saved" : "unavailable");

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: template?.label ?? "New Project", state: snapshot }),
            });
            if (response.status === 401) {
                setSaveAccess("guest");
                setPrompt({ kind: "sign-in" });
                throw new SavePromptError();
            }
            const data = await response.json();
            if (response.status === 402 && data.error === "plan_limit") {
                setPrompt({ kind: "limit", plan: data.plan });
                throw new SavePromptError();
            }
            if (!response.ok) throw new Error(data.error ?? "Could not create the project. Try again.");

            invalidateCache();
            // A newer edit can arrive while the request is in flight.
            if (JSON.stringify(latest.current) === JSON.stringify(snapshot)) removeWrittenDraft();
            else flush();
            finished.current = true;
            const projectId = data.project.id as string;
            router.replace(`/projects/${projectId}`);
            return { projectId, revision: data.project.floorplan_editor_state.revision as string };
        } finally {
            saving.current = false;
            setIsSaving(false);
        }
    }

    useEffect(() => {
        if (!resumeSave || resumedSave.current || !initialDraft || saveAccess !== "signed-in") return;
        resumedSave.current = true;
        // Consume the save intent before the request so refreshing cannot repeat it.
        const url = new URL(window.location.href);
        url.searchParams.delete("save");
        window.history.replaceState(window.history.state, "", url.pathname + url.search);
        void saveNewProject(initialDraft.projectFloorPlan, initialDraft.sceneConfig).catch(error => {
            if (!(error instanceof SavePromptError)) {
                setSaveError(error instanceof Error ? error.message : "Could not save the project. Try again.");
            }
        });
        // Resume the persisted snapshot once after authentication, not on subsequent edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeSave, initialDraft, saveAccess]);

    if (initialDraft === undefined) return null;
    const limitPlan = prompt?.kind === "limit" ? planFor(prompt.plan) : null;

    return (
        <>
            <FloorPlanEditor
                initialProjectFloorPlan={initialDraft?.projectFloorPlan ?? templateLayout?.plan}
                initialSceneConfig={initialDraft?.sceneConfig ?? templateLayout?.sceneConfig}
                onDraftChange={onDraftChange}
                onDiscardDraft={discardDraft}
                isSaving={isSaving}
                saveAccess={saveAccess}
                onSignInToSave={signInToSave}
                onSave={saveNewProject}
                onClose={() => { flush(); router.push(saveAccess === "signed-in" ? "/dashboard" : "/"); }}
            />
            {saveError && <p role="alert" className="fixed bottom-16 left-4 z-[110] max-w-md rounded-lg bg-white p-3 text-sm text-red-700 shadow">{saveError}</p>}
            {storageStatus && (
                <p role="status" className="pointer-events-none fixed right-3 bottom-3 z-[110] max-w-32 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 sm:max-w-none">
                    {storageStatus === "saved" ? "Draft saved on this device" : "Local draft storage unavailable"}
                </p>
            )}
            <dialog
                ref={dialog}
                onClose={() => setPrompt(null)}
                aria-labelledby="draft-prompt-title"
                className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/35"
            >
                {prompt && (
                    <>
                        <h2 id="draft-prompt-title" className="text-xl font-semibold tracking-tight">
                            {limitPlan ? "Project limit reached" : "Sign in to save your progress"}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                            {limitPlan
                                ? `Your ${limitPlan.label} plan allows ${limitPlan.projectLimit} saved ${limitPlan.projectLimit === 1 ? "project" : "projects"}. Free a slot in your dashboard${limitPlan.id === "free" ? " or upgrade your plan" : ""}, then retry this save.`
                                : storageStatus === "unavailable"
                                    ? "Sign in in a new tab, then come back here and choose Save Floor Plan."
                                    : "Sign in to save this draft to your account. Your existing projects and plan limit will be checked."}
                        </p>
                        <p className="mt-2 text-sm text-neutral-600">
                            {storageStatus === "saved" ? "Your draft is saved in this browser." : "Keep this tab open to retain your edits."}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {limitPlan || storageStatus === "unavailable" ? (
                                <a href={limitPlan ? "/dashboard" : "/login"} target="_blank" rel="noopener noreferrer" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white">
                                    {limitPlan ? "Manage projects ↗" : "Sign in (new tab) ↗"}
                                </a>
                            ) : (
                                <button type="button" onClick={signInToSave} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white">Sign in</button>
                            )}
                            {limitPlan?.id === "free" && (
                                <a href="/pricing" target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-4 py-2 text-sm">View plans ↗</a>
                            )}
                            <button type="button" onClick={() => dialog.current?.close()} className="rounded-full border border-neutral-300 px-4 py-2 text-sm">Keep editing</button>
                        </div>
                    </>
                )}
            </dialog>
        </>
    );
}
