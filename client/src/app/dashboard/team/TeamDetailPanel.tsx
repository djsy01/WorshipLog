import type { Message, OrgRoom, Organization } from '@/lib/api';
import { TeamChatTab } from './TeamChatTab';
import { TeamContiTab } from './TeamContiTab';

type Tab = 'chat' | 'conti';

interface Props {
  org: Organization;
  room: OrgRoom;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  messages: Message[];
  loadingMessages: boolean;
  myUserId: string;
  token: string;
  onNewMessage: (msg: Message) => void;
  onDeleteMessage: (msgId: string) => void;
  roomContis: any[];
  loadingContis: boolean;
}

export function TeamDetailPanel({ org, room, tab, onTabChange, messages, loadingMessages, myUserId, token, onNewMessage, onDeleteMessage, roomContis, loadingContis }: Props) {
  const tabCls = (active: boolean) =>
    `px-4 py-2 font-medium transition ${active ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`;

  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
        <span>{org.name}</span>
        <span>/</span>
        <span className="font-medium text-gray-600 dark:text-gray-300"># {room.name}</span>
      </div>
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => onTabChange('chat')} className={tabCls(tab === 'chat')}>채팅</button>
        <button onClick={() => onTabChange('conti')} className={tabCls(tab === 'conti')}>콘티 공유</button>
      </div>
      {tab === 'chat' && (
        <TeamChatTab
          roomId={room.id}
          token={token}
          messages={messages}
          loading={loadingMessages}
          myUserId={myUserId}
          onNewMessage={onNewMessage}
          onDeleteMessage={onDeleteMessage}
        />
      )}
      {tab === 'conti' && <TeamContiTab contis={roomContis} loading={loadingContis} />}
    </div>
  );
}
