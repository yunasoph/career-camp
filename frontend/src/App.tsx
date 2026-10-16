import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { NavBar } from '@/components/ui/NavBar';
import { ArtGalleryPage } from '@/pages/ArtGalleryPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { applyTheme, useThemeStore } from '@/store/themeStore';

export default function App(): JSX.Element {
    const theme = useThemeStore((s) => s.theme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return (
        <div className="relative z-10 flex min-h-screen flex-col">
            <NavBar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                        path="/roadmaps"
                        element={
                            <ComingSoonPage title="Career paths" note="The trail catalog opens in Phase 2." />
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={<ComingSoonPage title="Quests" note="Your notice board opens in Phase 4." />}
                    />
                    <Route
                        path="/leaderboard"
                        element={<ComingSoonPage title="Leaderboard" note="The podium opens in Phase 4." />}
                    />
                    {import.meta.env.DEV && <Route path="/_art" element={<ArtGalleryPage />} />}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </div>
    );
}
