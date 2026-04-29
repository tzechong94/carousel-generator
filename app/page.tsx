"use client";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-[#7e7e83] text-sm">
      Loading…
    </div>
  ),
});

export default function Page() {
  return <Editor />;
}
