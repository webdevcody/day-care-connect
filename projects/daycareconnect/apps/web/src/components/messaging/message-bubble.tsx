interface MessageBubbleProps {
  content: string;
  senderName: string;
  createdAt: Date;
  isOwn: boolean;
}

export function MessageBubble({
  content,
  senderName,
  createdAt,
  isOwn,
}: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 ${
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {!isOwn && (
          <p className="mb-1 text-xs font-medium opacity-70">{senderName}</p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        <p
          className={`mt-1 text-xs ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
