import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

import { useRoomStore } from '../store/roomStore';

import type { FormEvent } from 'react';

const CHAT_MESSAGE_MAX_LENGTH = 150;

interface WaitingRoomChatProps {
  onSendMessage: (message: string) => void;
}

export function WaitingRoomChat({ onSendMessage }: WaitingRoomChatProps) {
  const chatMessages = useRoomStore((s) => s.chatMessages);
  const [chatDraft, setChatDraft] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages]);

  const handleSendChat = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      const message = chatDraft.trim();
      if (!message) {
        setClientError('메시지를 입력해주세요.');
        return;
      }

      if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
        setClientError('메시지가 너무 깁니다.');
        return;
      }

      setClientError(null);
      onSendMessage(message);
      setChatDraft('');
    },
    [chatDraft, onSendMessage]
  );

  return (
    <div className="flex flex-1 flex-col border-t border-[#c8dfd0]">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-700 bg-[#1a1a1a] px-3 py-1">
        <span className="font-mono text-md font-bold uppercase tracking-wider text-green-400">
          CHAT_TERMINAL
        </span>
        {clientError && <span className="ml-auto text-xs text-red-400">{clientError}</span>}
      </div>
      <div className="flex-1 overflow-y-auto bg-[#0d0d0d] px-3 py-2 font-mono text-md">
        <p className="text-[#217346]">[SYSTEM] 대기실에 입장했습니다.</p>
        <p className="text-gray-500">[SYSTEM] 방 코드를 공유하여 친구를 초대하세요.</p>
        {chatMessages.map((chat, index) => (
          <p key={`${chat.playerId}-${chat.sentAt}-${index}`} className="break-all text-green-300">
            <span className="text-gray-500">[{new Date(chat.sentAt).toLocaleTimeString()}]</span>{' '}
            <span className="text-[#7ee787]">{chat.nickname}</span>
            <span className="text-gray-500">: </span>
            <span>{chat.message}</span>
          </p>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form
        onSubmit={handleSendChat}
        className="flex shrink-0 items-center border-t border-gray-700 bg-[#1a1a1a] px-2 py-1"
      >
        <span className="mr-1 font-mono text-md text-green-400">{'>'}</span>
        <input
          type="text"
          value={chatDraft}
          onChange={(event) => {
            setChatDraft(event.target.value);
            if (clientError) setClientError(null);
          }}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          className="flex-1 bg-transparent font-mono text-md text-green-400 outline-none placeholder:text-gray-600"
          placeholder="채팅 입력..."
          aria-label="채팅 메시지"
        />
        <button
          type="submit"
          className="ml-2 flex h-6 w-6 items-center justify-center rounded border border-gray-700 text-green-400 hover:border-green-500 hover:bg-green-500/10"
          aria-label="채팅 보내기"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
