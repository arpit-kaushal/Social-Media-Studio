import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API status · Social Media Studio",
  description: "Verify Gemini, Groq, Pexels, Unsplash, and Pollinations connectivity.",
  robots: { index: false, follow: false },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
