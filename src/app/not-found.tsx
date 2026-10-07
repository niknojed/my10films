import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose-page">
      <h1 className="h-hero">No such page</h1>
      <p>This link does not match a page or a shared list. The list may have been removed.</p>
      <p>
        <Link href="/" className="btn btn-primary">
          Make a poster
        </Link>
      </p>
    </div>
  );
}
