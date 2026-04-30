import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../hooks/useRoom';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ messages, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  }

  return (
    <div className="side-panel chat-panel">
      <div className="side-panel-header">
        <span>Chat</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.fromSelf ? 'chat-msg--self' : ''}`}>
            {!msg.fromSelf && <div className="chat-msg-sender">{msg.senderName}</div>}
            <div className="chat-msg-bubble">{msg.text}</div>
            <div className="chat-msg-time">{formatTime(msg.ts)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
