import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import type { AuthResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { useAuthStore } from '@/store/authStore';

/**
 * POST /auth/login → session into the store (token in memory, refresh
 * cookie set by the API) → back to the page the user originally wanted.
 */
export function LoginPage(): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    const [banner, setBanner] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

    const onSubmit = async (values: LoginValues): Promise<void> => {
        setBanner(null);
        try {
            const data = await api<AuthResponse>('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify(values),
            });
            useAuthStore.getState().setSession(data.access_token, data.user);
            navigate(from, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.details) {
                for (const [field, messages] of Object.entries(err.details)) {
                    if (field === 'email' || field === 'password') {
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
            <Card rotate={-0.5}>
                <h1 className="font-display text-3xl font-black tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-ink-soft">Sign in to keep your streak alive.</p>

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
                        <label htmlFor="login-email" className="mb-1.5 block text-sm font-bold text-ink">
                            Email
                        </label>
                        <Input
                            id="login-email"
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
                        <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold text-ink">
                            Password
                        </label>
                        <Input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
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
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </Button>
                </form>

                <p className="mt-5 text-center text-sm text-ink-soft">
                    New to the campus?{' '}
                    <Link
                        to="/register"
                        className="font-bold text-ink underline decoration-marigold decoration-2 underline-offset-2"
                    >
                        Create an account
                    </Link>
                </p>
            </Card>
        </section>
    );
}
