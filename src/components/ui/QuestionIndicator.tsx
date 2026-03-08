/** Orange circle with "?" indicating unanswered questions. */
export function QuestionIndicator({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-question text-[9px] font-bold text-white ${className}`}
      title="Unanswered questions"
    >
      ?
    </span>
  );
}
