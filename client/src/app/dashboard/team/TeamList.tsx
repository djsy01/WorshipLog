import { Team } from '@/lib/api';
import { useRef, useMemo, useEffect, useState } from 'react';

interface TeamListProps {
  teams: Team[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  myUserId: string;
  onToggleMembers: (teamId: string) => void;
  expandedTeams: Set<string>;
  teamOrder: string[];
  onTeamOrderChange: (order: string[]) => void;
  onCreateInvite: (teamId: string) => void;
  onLeaveTeam: (teamId: string) => Promise<void>;
}

export function TeamList({
  teams,
  selectedTeamId,
  onSelectTeam,
  myUserId,
  onToggleMembers,
  expandedTeams,
  teamOrder,
  onTeamOrderChange,
  onCreateInvite,
  onLeaveTeam,
}: TeamListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const sortedTeamsRef = useRef<typeof teams>([]);
  const touchDragRef = useRef<string | null>(null);
  const dragOrderRef = useRef<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sortedTeams = useMemo(() => {
    const result =
      teamOrder.length === 0
        ? teams
        : [...teams].sort((a, b) => {
            const ai = teamOrder.indexOf(a.id);
            const bi = teamOrder.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
    sortedTeamsRef.current = result;
    return result;
  }, [teams, teamOrder]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const li = el?.closest('[data-team-id]') as HTMLElement | null;
      const targetId = li?.dataset.teamId ?? null;
      if (targetId && targetId !== touchDragRef.current) {
        const order = [...dragOrderRef.current];
        const fromIdx = order.indexOf(touchDragRef.current);
        const toIdx = order.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, touchDragRef.current);
          dragOrderRef.current = order;
          onTeamOrderChange([...order]);
          setDragOverId(targetId);
        }
      }
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, [onTeamOrderChange]);

  const handleDragStart = (teamId: string) => {
    setDragId(teamId);
    dragOrderRef.current = sortedTeamsRef.current.map((t) => t.id);
  };

  const handleDragOver = (teamId: string) => {
    if (!dragId) return;
    setDragOverId(teamId);
    const order = [...dragOrderRef.current];
    const fromIdx = order.indexOf(dragId);
    const toIdx = order.indexOf(teamId);
    if (fromIdx !== -1 && toIdx !== -1) {
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragId);
      dragOrderRef.current = order;
      onTeamOrderChange([...order]);
    }
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleTouchStart = (teamId: string) => {
    touchDragRef.current = teamId;
    dragOrderRef.current = sortedTeamsRef.current.map((t) => t.id);
  };

  const handleTouchEnd = () => {
    touchDragRef.current = null;
    setDragOverId(null);
  };

  return (
    <ul ref={listRef} className="space-y-2" onDragEnd={handleDragEnd}>
      {sortedTeams.map((team) => (
        <li
          key={team.id}
          data-team-id={team.id}
          draggable
          onDragStart={() => handleDragStart(team.id)}
          onDragOver={() => handleDragOver(team.id)}
          onTouchStart={() => handleTouchStart(team.id)}
          onTouchEnd={handleTouchEnd}
          className={`rounded-lg border-l-4 p-3 transition ${
            selectedTeamId === team.id
              ? 'border-l-violet-600 bg-violet-50 dark:bg-violet-900/20'
              : dragId === team.id
                ? 'border-l-gray-400 bg-gray-100 dark:bg-gray-800 opacity-50'
                : dragOverId === team.id
                  ? 'border-l-violet-400 bg-violet-50 dark:bg-violet-900/10'
                  : 'border-l-gray-300 bg-white dark:bg-gray-900'
          } cursor-move`}
        >
          <button onClick={() => onSelectTeam(team.id)} className="w-full text-left">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                {team.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{team.description}</p>}
              </div>
            </div>
          </button>

          <div className="mt-2 flex flex-wrap gap-1">
            <button
              onClick={() => onToggleMembers(team.id)}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {expandedTeams.has(team.id) ? '멤버 닫기' : `멤버 ${team.members?.length ?? 0}명`}
            </button>
            <button
              onClick={() => onCreateInvite(team.id)}
              className="rounded px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/20"
            >
              초대링크
            </button>
            {team.createdBy === myUserId && (
              <button
                onClick={() => onLeaveTeam(team.id)}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                삭제
              </button>
            )}
          </div>

          {expandedTeams.has(team.id) && team.members && (
            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-xs">
              {team.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
