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
