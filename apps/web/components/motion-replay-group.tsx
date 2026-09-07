"use client";

import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

import { useFinancialMotionPreference } from "@/components/financial-motion-preference";

type ReplayRegistration = { replay: () => void };
type MotionReplayContextValue = {
  noteReplay: () => void;
  register: (registration: ReplayRegistration) => () => void;
};
const MotionReplayContext = createContext<MotionReplayContextValue | null>(null);
const replayHandledKey = Symbol("motion-replay-handled");

type ReplayGroupChildProps = {
  "data-motion-replay-group"?: string;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function MotionReplayGroup({ children }: { children: ReactElement<ReplayGroupChildProps> }) {
  const { enabled, ready, replayDelayMs } = useFinancialMotionPreference();
  const [members] = useState(() => new Set<ReplayRegistration>());
  const [hoverBlockedUntil, setHoverBlockedUntil] = useState(0);
  const register = useCallback((registration: ReplayRegistration) => {
    members.add(registration);
    return () => { members.delete(registration); };
  }, [members]);
  const noteReplay = useCallback(() => {
    if (ready && enabled) setHoverBlockedUntil(performance.now() + replayDelayMs);
  }, [enabled, ready, replayDelayMs]);
  const replayAll = useCallback((event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>, trigger: "click" | "pointer") => {
    const nativeEvent = event.nativeEvent as Event & { [replayHandledKey]?: boolean };
    if (nativeEvent[replayHandledKey]) return;
    nativeEvent[replayHandledKey] = true;
    if (!ready || !enabled) return;
    const now = performance.now();
    if (trigger === "pointer" && now < hoverBlockedUntil) return;
    noteReplay();
    members.forEach((member) => member.replay());
  }, [enabled, hoverBlockedUntil, members, noteReplay, ready]);
  const contextValue = useMemo(() => ({ noteReplay, register }), [noteReplay, register]);
  const onlyChild = Children.only(children);

  return (
    <MotionReplayContext.Provider value={contextValue}>
      {cloneElement(onlyChild, {
        "data-motion-replay-group": "true",
        onClick: (event) => {
          onlyChild.props.onClick?.(event);
          if (!event.defaultPrevented) replayAll(event, "click");
        },
        onPointerEnter: (event) => {
          onlyChild.props.onPointerEnter?.(event);
          if (!event.defaultPrevented) replayAll(event, "pointer");
        },
      })}
    </MotionReplayContext.Provider>
  );
}

export function useMotionReplayRegistration(replay: () => void, replayCycle = 0) {
  const group = useContext(MotionReplayContext);
  useEffect(() => group?.register({ replay }), [group, replay]);
  useEffect(() => {
    if (replayCycle > 0) group?.noteReplay();
  }, [group, replayCycle]);
  return group !== null;
}
