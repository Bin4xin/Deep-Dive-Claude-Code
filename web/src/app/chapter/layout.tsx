import { Sidebar } from "@/components/layout/sidebar";

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
