/** Red dot indicating unresolved issues. */
export function IssueIndicator({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full bg-issue ${className}`}
      title="Unresolved issues"
    />
  );
}
