import { z } from 'zod';

/**
 * Client-side mirrors of the backend FieldRules (spec §7) so the form fails
 * fast. The API remains the source of truth — its 422 details still render.
 */

const email = z.string().trim().email('Enter a valid email address.');

const displayName = z
    .string()
    .trim()
    .min(1, 'Display name must not be empty.')
    .max(60, 'Display name must be 60 characters or fewer.');

export const registerSchema = z.object({
    email,
    password: z.string().min(10, 'Password must be at least 10 characters.'),
    display_name: displayName,
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1, 'Password must not be empty.'),
});

/**
 * IANA timezones the runtime knows about. `Intl.supportedValuesOf` is an
 * ES2022 API while the lib target is ES2020, hence the guarded access.
 */
const intlWithValuesOf = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };

export const supportedTimezones: readonly string[] =
    typeof intlWithValuesOf.supportedValuesOf === 'function'
        ? intlWithValuesOf.supportedValuesOf('timeZone')
        : [];

export const profileSchema = z.object({
    display_name: displayName,
    /** '' means "clear the avatar" (the PATCH body sends null). */
    avatar_url: z.union([z.literal(''), z.string().trim().url('Enter a valid avatar URL.')]),
    timezone: z
        .string()
        .min(1, 'Select a timezone.')
        .refine((tz) => supportedTimezones.includes(tz), 'Select a valid timezone.'),
});

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
