import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import type { AuthResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { registerSchema, type RegisterValues } from '@/lib/validation';
import { useAuthStore } from '@/store/authStore';

/**
 * POST /auth/register → session into the store. The API sets the refresh
 * cookie on register too, so "register → reload → still signed in" holds.
 */
export function RegisterPage(): JSX.Element {
    const navigate = useNavigate();
    const [banner, setBanner] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

    const onSubmit = async (values: RegisterValues): Promise<void> => {
        setBanner(null);
        try {
            const data = await api<AuthResponse>('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify(values),
            });
            useAuthStore.getState().setSession(data.access_token, data.user);
            navigate('/', { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.code === 'email_taken') {
                setError('email', { message: err.message });
            } else if (err instanceof ApiError && err.details) {
                for (const [field, messages] of Object.entries(err.details)) {
                    if (field === 'email' || field === 'password' || field === 'display_name') {
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
        <section className="mx-auto flex max-w-md flex-col py-16">
            <Card rotate={0.5}>
                <h1 className="font-display text-3xl font-black tracking-tight">Join the campus</h1>
                <p className="mt-2 text-sm text-ink-soft">
                    One account keeps your quests, streak and level in sync.
                </p>

                {banner !== null && (
                    <p
                        role="alert"
                        className="sticker mt-4 rounded-input bg-paper-2 px-4 py-2.5 text-sm font-semibold text-ink"
                    >
                        {banner}
                    </p>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
                    <div>
                        <label htmlFor="register-email" className="mb-1.5 block text-sm font-bold text-ink">
                            Email
                        </label>
                        <Input
                            id="register-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@school.edu"
                            error={errors.email !== undefined}
                            {...register('email')}
                        />
                        {errors.email !== undefined && (
                            <p className="mt-1.5 text-sm font-semibold text-ember">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="register-display-name"
                            className="mb-1.5 block text-sm font-bold text-ink"
                        >
                            Display name
                        </label>
                        <Input
                            id="register-display-name"
                            autoComplete="nickname"
                            placeholder="How the class will know you"
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
                            htmlFor="register-password"
                            className="mb-1.5 block text-sm font-bold text-ink"
                        >
                            Password
                        </label>
                        <Input
                            id="register-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="At least 10 characters"
                            error={errors.password !== undefined}
                            {...register('password')}
                        />
                        {errors.password !== undefined && (
                            <p className="mt-1.5 text-sm font-semibold text-ember">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating your badge…' : 'Create account'}
                    </Button>
                </form>

                <p className="mt-5 text-center text-sm text-ink-soft">
                    Already enrolled?{' '}
                    <Link
                        to="/login"
                        className="font-bold text-ink underline decoration-marigold decoration-2 underline-offset-2"
                    >
                        Sign in
                    </Link>
                </p>
            </Card>
        </section>
    );
}
