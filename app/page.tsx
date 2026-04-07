/**
 * @file app/page.tsx — Root route redirect
 *
 * Immediately redirects the root URL (/) to the dashboard.
 * This is a server component — no HTML is rendered.
 */
import { redirect } from 'next/navigation';

/** Redirects / to /dashboard. */
export default function Home() {
  redirect('/dashboard');
}
