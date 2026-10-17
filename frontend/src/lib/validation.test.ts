import { describe, expect, it } from 'vitest';
import { loginSchema, profileSchema, registerSchema, supportedTimezones } from './validation';

const validUser = {
    email: 'ada@example.com',
    password: 'sup3r-secret-pass',
    display_name: 'Ada Lovelace',
};

describe('registerSchema', () => {
    it('accepts a valid payload', () => {
        expect(registerSchema.safeParse(validUser).success).toBe(true);
    });

    it('rejects a bad email, a short password and an empty name in one pass', () => {
        const result = registerSchema.safeParse({
            email: 'not-an-email',
            password: 'short',
            display_name: '   ',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(Object.keys(result.error.flatten().fieldErrors).sort()).toEqual([
                'display_name',
                'email',
                'password',
            ]);
        }
    });

    it('rejects a display name over 60 characters', () => {
        const result = registerSchema.safeParse({ ...validUser, display_name: 'x'.repeat(61) });
        expect(result.success).toBe(false);
    });
});

describe('loginSchema', () => {
    it('accepts a valid payload', () => {
        expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'anything' }).success).toBe(true);
    });

    it('rejects an empty password', () => {
        const result = loginSchema.safeParse({ email: 'ada@example.com', password: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.password).toHaveLength(1);
        }
    });
});

describe('profileSchema', () => {
    const tz = supportedTimezones[0] ?? 'UTC';

    it('accepts a valid profile', () => {
        const result = profileSchema.safeParse({
            display_name: 'Ada',
            avatar_url: 'https://avatars.example.com/ada.png',
            timezone: tz,
        });
        expect(result.success).toBe(true);
    });

    it('accepts an empty avatar_url (means "clear the avatar")', () => {
        const result = profileSchema.safeParse({ display_name: 'Ada', avatar_url: '', timezone: tz });
        expect(result.success).toBe(true);
    });

    it('rejects a non-URL avatar', () => {
        const result = profileSchema.safeParse({
            display_name: 'Ada',
            avatar_url: 'not a url',
            timezone: tz,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.avatar_url).toHaveLength(1);
        }
    });

    it('rejects an unknown IANA timezone', () => {
        const result = profileSchema.safeParse({
            display_name: 'Ada',
            avatar_url: '',
            timezone: 'Mars/OlympusMons',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.timezone).toHaveLength(1);
        }
    });
});
