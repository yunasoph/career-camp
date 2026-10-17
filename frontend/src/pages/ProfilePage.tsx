import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FLAME, STAR } from '@/art/sprites/icons';
import { PixelSprite } from '@/art/PixelSprite';
import { api, ApiError } from '@/api/client';
import type { MeResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { profileSchema, supportedTimezones, type ProfileValues } from '@/lib/validation';
import { useAuthStore } from '@/store/authStore';

const SELECT_CLASSES =
    'w-full rounded-input border-2 border-transparent bg-paper-2 px-4 py-2.5 text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-marigold focus:ring-offset-2 focus:ring-offset-card';

/**
 * Signed-in account page: the `/me` gamification snapshot plus the editable
 * fields (display name, avatar URL, timezone) via PATCH /me.
 */
export function ProfilePage(): JSX.Element {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const [saved, setSaved] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            display_name: user?.display_name ?? '',
            avatar_url: user?.avatar_url ?? '',
            timezone: user?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
        },
    });

    const onSubmit = async (values: ProfileValues): Promise<void> => {
        setSaved(false);
        setBanner(null);
        try {
            const data = await api<MeResponse>('/api/v1/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    display_name: values.display_name,
                    avatar_url: values.avatar_url === '' ? null : values.avatar_url,
                    timezone: values.timezone,
                }),
            });
            setUser(data.user);
            setSaved(true);
        } catch (err) {
            if (err instanceof ApiError && err.details) {
                for (const [field, messages] of Object.entries(err.details)) {
                    if (field === 'display_name' || field === 'avatar_url' || field === 'timezone') {
                        setError(field, { message: messages[0] });
                    }
                }
                setBanner('Please fix the highlighted fields.');
            } else if (err instanceof Error) {
                setBanner(err.message);
            } else {
                setBanner('Something went wrong. Please try again.');
            }
        }
    };

    return (
        <section className="mx-auto flex max-w-xl flex-col gap-6 py-12">
            {user !== null && (
                <Card rotate={-0.4}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-ink-soft">{user.title}</p>
                            <h1 className="font-display text-3xl font-black tracking-tight">
                                {user.display_name}
                            </h1>
                            <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
                        </div>
                        <Chip
                            icon={<PixelSprite sprite={STAR} scale={2} />}
                            value={user.level}
                            label={`Level ${user.level}, ${user.title}`}
                            tone="accent"
                        />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Chip
                            icon={<PixelSprite sprite={FLAME} scale={1} />}
                            value={user.current_streak}
                            label={`${user.current_streak}-day streak`}
                        />
                        <Chip
                            value={`${user.total_xp} XP`}
                            label={`${user.total_xp} total experience, ${user.xp_to_next} to the next level`}
                        />
                    </div>
                    <p className="mt-3 text-sm text-ink-soft">
                        {user.xp_to_next} XP to level {user.level + 1} · longest streak {user.longest_streak}{' '}
                        days
                    </p>
                </Card>
            )}

            <Card rotate={0.4}>
                <h2 className="font-display text-2xl font-black tracking-tight">Settings</h2>

                {banner !== null && (
                    <p
                        role="alert"
                        className="sticker mt-4 rounded-input bg-paper-2 px-4 py-2.5 text-sm font-semibold text-ink"
                    >
                        {banner}
                    </p>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-4">
                    <div>
                        <label
                            htmlFor="profile-display-name"
                            className="mb-1.5 block text-sm font-bold text-ink"
                        >
                            Display name
                        </label>
                        <Input
                            id="profile-display-name"
                            autoComplete="nickname"
                            error={errors.display_name !== undefined}
                            {...register('display_name')}
                        />
                        {errors.display_name !== undefined && (
                            <p className="mt-1.5 text-sm font-semibold text-ember">
                                {errors.display_name.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="profile-avatar-url"
                            className="mb-1.5 block text-sm font-bold text-ink"
                        >
                            Avatar URL
                        </label>
                        <Input
                            id="profile-avatar-url"
                            type="text"
                            placeholder="https://… (leave empty to remove)"
                            error={errors.avatar_url !== undefined}
                            {...register('avatar_url')}
                        />
                        {errors.avatar_url !== undefined && (
                            <p className="mt-1.5 text-sm font-semibold text-ember">
                                {errors.avatar_url.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="profile-timezone" className="mb-1.5 block text-sm font-bold text-ink">
                            Timezone
                        </label>
                        {supportedTimezones.length > 0 ? (
                            <select
                                id="profile-timezone"
                                aria-invalid={errors.timezone !== undefined || undefined}
                                className={SELECT_CLASSES}
                                {...register('timezone')}
                            >
                                {supportedTimezones.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                id="profile-timezone"
                                type="text"
                                placeholder="e.g. Europe/Berlin"
                                error={errors.timezone !== undefined}
                                {...register('timezone')}
                            />
                        )}
                        {errors.timezone !== undefined && (
                            <p className="mt-1.5 text-sm font-semibold text-ember">
                                {errors.timezone.message}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving…' : 'Save changes'}
                        </Button>
                        {saved && (
                            <span aria-live="polite" className="text-sm font-semibold text-moss">
                                Saved ✓
                            </span>
                        )}
                    </div>
                </form>
            </Card>
        </section>
    );
}
