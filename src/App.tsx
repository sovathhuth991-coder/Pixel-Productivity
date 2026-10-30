import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TaskProvider } from './context/TaskContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { CategoryWindowProvider } from './context/CategoryWindowContext'
import { WallpaperProvider } from './context/WallpaperContext'
import { ToastProvider } from './components/ui/Toast'
import { DesignModeProvider } from './context/DesignModeContext'
import { KeyboardShortcutsProvider } from './hooks/useKeyboardShortcuts'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import WeeklyReportReminder from './components/WeeklyReportReminder'
import PixelIcon from './components/ui/PixelIcon'
import './index.css'

/**
 * Every page is loaded on demand.
 *
 * The app was one 1.38 MB (372 KB gzipped) JavaScript bundle that the phone
 * had to download and parse before it could show a single pixel. On a mobile
 * connection that is several seconds of a blank screen. Splitting the routes
 * means the first paint only needs the shell — the layout, the providers and
 * the task store — and the heavy page (the Weekly Report pulls in the chart
 * code, the Bookmarks page pulls in the Scraping helpers) arrives when it is
 * actually opened.
 */
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PomodoroPage = lazy(() => import('./pages/PomodoroPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const BoardPage = lazy(() => import('./pages/BoardPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const WeeklyReportPage = lazy(() => import('./pages/WeeklyReportPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 w-full">
      <PixelIcon name="hourglass" size={32} className="animate-pulse text-accent" />
      <span className="font-pixel text-caption text-muted">LOADING…</span>
    </div>
  )
}

function RootLanding() {
  // When launching a new session with no specific route, land on /home first
  const visited = sessionStorage.getItem('pixel_session_visited')
  if (!visited && (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#')) {
    sessionStorage.setItem('pixel_session_visited', '1')
    return <Navigate to="/home" replace />
  }
  return <DashboardPage />
}

export default function App() {
  return (
    <DesignModeProvider>
      <ToastProvider>
        <TaskProvider>
          <PomodoroProvider>
            <WallpaperProvider>
              <CategoryWindowProvider>
                <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <KeyboardShortcutsProvider>
                  <WeeklyReportReminder />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route
                        path="/home"
                        element={
                          <ErrorBoundary label="Home">
                            <HomePage />
                          </ErrorBoundary>
                        }
                      />
                      <Route path="/" element={<Layout />}>
                        <Route index element={<RootLanding />} />
                        <Route path="tasks" element={<DashboardPage />} />
                        <Route path="board" element={<BoardPage />} />
                        <Route path="bookmarks" element={<BookmarksPage />} />
                        <Route path="pomodoro" element={<PomodoroPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="weekly" element={<WeeklyReportPage />} />
                        <Route path="stats" element={<StatsPage />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </KeyboardShortcutsProvider>
              </HashRouter>
              </CategoryWindowProvider>
            </WallpaperProvider>
          </PomodoroProvider>
        </TaskProvider>
      </ToastProvider>
    </DesignModeProvider>
  )
}
