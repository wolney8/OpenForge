"use client";

import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

type ReplayRegistration = { replay: () => void };
type MotionReplayContextValue = { register: (registration: ReplayRegistration) => () => void };
const MotionReplayContext = createContext<MotionReplayContextValue | null>(null);
const replayHandledKey = Symbol("motion-replay-handled");

type ReplayGroupChildProps = {
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function MotionReplayGroup({ children }: { children: ReactElement<ReplayGroupChildProps> }) {
  const [members] = useState(() => new Set<ReplayRegistration>());
  const register = useCallback((registration: ReplayRegistration) => {
    members.add(registration);
    return () => { members.delete(registration); };
  }, [members]);
  const replayAll = useCallback((event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) => {
    const nativeEvent = event.nativeEvent as Event & { [replayHandledKey]?: boolean };
    if (nativeEvent[replayHandledKey]) return;
    nativeEvent[replayHandledKey] = true;
    members.forEach((member) => member.replay());
  }, [members]);
  const onlyChild = Children.only(children);

  return (
    <MotionReplayContext.Provider value={{ register }}>
      {cloneElement(onlyChild, {
        onClick: (event) => {
          onlyChild.props.onClick?.(event);
          if (!event.defaultPrevented) replayAll(event);
        },
        onPointerEnter: (event) => {
          onlyChild.props.onPointerEnter?.(event);
          if (!event.defaultPrevented) replayAll(event);
        },
      })}
    </MotionReplayContext.Provider>
  );
}

export function useMotionReplayRegistration(replay: () => void) {
  const group = useContext(MotionReplayContext);
  useEffect(() => group?.register({ replay }), [group, replay]);
  return group !== null;
}
