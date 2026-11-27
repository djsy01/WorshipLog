import { useCallback, useMemo, useState } from "react";
import type { Organization } from "@/lib/api";

export function useTeamOrder(orgs: Organization[]) {
  const [orgOrder, setOrgOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('teamOrgOrder') ?? '[]'); } catch { return []; }
  });
  const [roomOrders, setRoomOrders] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('teamRoomOrders') ?? '{}'); } catch { return {}; }
  });

  const orderedOrgs = useMemo(() => {
    const orderMap = new Map(orgOrder.map((id, i) => [id, i]));
    return [...orgs]
      .sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999))
      .map((org) => {
        const roomOrder = roomOrders[org.id];
        if (!roomOrder) return org;
        const roomMap = new Map(roomOrder.map((id, i) => [id, i]));
        return { ...org, rooms: [...org.rooms].sort((a, b) => (roomMap.get(a.id) ?? 9999) - (roomMap.get(b.id) ?? 9999)) };
      });
  }, [orgs, orgOrder, roomOrders]);

  const moveOrg = useCallback((orgId: string, direction: 'up' | 'down') => {
    setOrgOrder((prev) => {
      const base = prev.length > 0 ? prev : orgs.map((o) => o.id);
      const idx = base.indexOf(orgId);
      if (idx === -1) return base;
      const next = [...base];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return next;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      localStorage.setItem('teamOrgOrder', JSON.stringify(next));
      return next;
    });
  }, [orgs]);

  const moveRoom = useCallback((orgId: string, roomId: string, direction: 'up' | 'down') => {
    setRoomOrders((prev) => {
      const org = orgs.find((o) => o.id === orgId);
      const base = prev[orgId] ?? org?.rooms.map((r) => r.id) ?? [];
      const idx = base.indexOf(roomId);
      if (idx === -1) return prev;
      const next = [...base];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      const updated = { ...prev, [orgId]: next };
      localStorage.setItem('teamRoomOrders', JSON.stringify(updated));
      return updated;
    });
  }, [orgs]);

  return { orderedOrgs, moveOrg, moveRoom };
}
