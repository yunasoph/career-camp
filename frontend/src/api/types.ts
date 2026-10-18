/** API contract types (spec §7). JSON field names are snake_case. */

export type Role = 'learner' | 'admin';

export interface User {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    role: Role;
    timezone: string;
    total_xp: number;
    level: number;
    xp_to_next: number;
    title: string;
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
}

/** Body of POST /auth/register, /auth/login and /auth/refresh. */
export interface AuthResponse {
    user: User;
    access_token: string;
}

/** Body of GET /me and PATCH /me. */
export interface MeResponse {
    user: User;
}

/** Uniform error envelope (spec §7). */
export interface ApiErrorEnvelope {
    error: {
        code: string;
        message: string;
        /** field → messages, present on 422 validation_failed. */
        details?: Record<string, string[]>;
    };
}

/** Difficulty of a roadmap (content API, spec §7). */
export type RoadmapDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** Free-form styling hints, e.g. {"tint":"ember","landmarks":["workshop","tower"]}. */
export interface RoadmapTheme {
    tint?: string;
    landmarks?: string[];
}

/** One published roadmap — list shape (GET /roadmaps). */
export interface RoadmapSummary {
    id: string;
    slug: string;
    title: string;
    summary: string;
    icon: string | null;
    difficulty: RoadmapDifficulty;
    est_hours: number | null;
    node_count: number;
    task_count: number;
    theme: RoadmapTheme;
}

/** Body of GET /roadmaps. */
export interface RoadmapListResponse {
    roadmaps: RoadmapSummary[];
}

/** Computed node state (spec §4). Guests receive `null` (neutral preview). */
export type NodeState = 'locked' | 'available' | 'in_progress' | 'completed';

/** Task kinds in the seeded content. */
export type TaskType = 'reading' | 'video' | 'practice' | 'quiz' | 'project';

/** Client-safe quiz question — correct_index/explanation are stripped server-side (spec §6.1). */
export interface QuizQuestion {
    id: string;
    prompt: string;
    options: string[];
}

/** One task (spec §7) — from GET /nodes/{id}. */
export interface TaskDto {
    id: string;
    type: TaskType;
    title: string;
    description: string;
    resource_url: string | null;
    xp: number;
    is_required: boolean;
    sort_order: number;
    est_minutes: number;
    completed: boolean;
    quiz?: { questions: QuizQuestion[] };
}

/** Trail-map node (from GET /roadmaps/{slug}). */
export interface RoadmapNode {
    id: string;
    slug: string;
    title: string;
    description: string;
    landmark: string | null;
    pos_x: number;
    pos_y: number;
    sort_order: number;
    state: NodeState | null;
    completed_tasks: number;
    total_tasks: number;
}

/** Trail-map edge: prerequisite_id → node_id. */
export interface RoadmapEdge {
    node_id: string;
    prerequisite_id: string;
}

/** Roadmap head in the trail-map response (no node/task counts). */
export interface RoadmapHead {
    id: string;
    slug: string;
    title: string;
    summary: string;
    icon: string | null;
    difficulty: RoadmapDifficulty;
    est_hours: number | null;
    theme: RoadmapTheme;
}

/** Body of GET /roadmaps/{slug} — public, personalised when authed. */
export interface RoadmapDetail {
    roadmap: RoadmapHead;
    nodes: RoadmapNode[];
    edges: RoadmapEdge[];
    /** Present only when an authenticated user is attached. */
    enrolled?: boolean;
    percent_complete?: number;
}

/** Node head from GET /nodes/{id} — adds prerequisite ids. */
export interface NodeDetail extends RoadmapNode {
    roadmap_slug: string;
    prerequisite_ids: string[];
}

/** Body of GET /nodes/{id}. */
export interface NodeDetailResponse {
    node: NodeDetail;
    tasks: TaskDto[];
}
