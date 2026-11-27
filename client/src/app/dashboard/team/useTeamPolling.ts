import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { orgsApi, roomsApi, type Message, type Organization } from "@/lib/api";

interface Options {
  selectedRoomId: string | null;
  orgCount: number;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setOrgs: Dispatch<SetStateAction<Organization[]>>;
  setUnreadCounts: Dispatch<SetStateAction<Record<string, number>>>;
}

export function useTeamPolling({ selectedRoomId, orgCount, setMessages, setOrgs, setUnreadCounts }: Options) {
  const selectedRoomIdRef = useRef(selectedRoomId);
  useEffect(() => { selectedRoomIdRef.current = selectedRoomId; }, [selectedRoomId]);

  // 현재 방 메시지 폴링 (3초) — 새 메시지 자동 반영
  useEffect(() => {
    if (!selectedRoomId) return;
    const roomId = selectedRoomId;
    const poll = async () => {
      const tok = localStorage.getItem('accessToken');
      if (!tok) return;
      try {
        const ordered = [...(await roomsApi.getMessages(tok, roomId))].reverse();
        setMessages((prev) => {
          if (
            prev.length === ordered.length &&
            prev[prev.length - 1]?.id === ordered[ordered.length - 1]?.id
          ) return prev;
          localStorage.setItem(`chatMsgCount_${roomId}`, ordered.length.toString());
          return ordered;
        });
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedRoomId, setMessages]);

  // 팀 목록 폴링 (10초) — 새 방 추가·미열람 뱃지 업데이트
  useEffect(() => {
    if (orgCount === 0) return;
    const poll = async () => {
      const tok = localStorage.getItem('accessToken');
      if (!tok) return;
      try {
        const loaded = await orgsApi.list(tok);
        setOrgs(loaded);
        setUnreadCounts((prev) => {
          const next = { ...prev };
          for (const org of loaded) {
            for (const room of org.rooms) {
              if (room.id === selectedRoomIdRef.current) continue;
              const stored = parseInt(localStorage.getItem(`chatMsgCount_${room.id}`) ?? '0', 10);
              const unread = Math.max(0, room._count.messages - stored);
              if (unread > 0) next[room.id] = unread;
              else delete next[room.id];
            }
          }
          return next;
        });
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [orgCount, setOrgs, setUnreadCounts]);
}
