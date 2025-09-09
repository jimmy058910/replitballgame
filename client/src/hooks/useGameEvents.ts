// React hooks for game event bus integration
import { useEffect, useRef, useState } from 'react';
import { gameEventBus, AllGameEvents, GameEvent } from '../../../shared/gameEventBus';

/**
 * Hook to subscribe to specific game events
 */
export function useGameEvent<T extends AllGameEvents>(
  eventType: T['type'],
  handler: (event: T) => void,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (event: T) => {
      handlerRef.current(event);
    };

    gameEventBus.on(eventType, wrappedHandler);

    return () => {
      gameEventBus.off(eventType, wrappedHandler);
    };
  }, [eventType, ...deps]);
}

/**
 * Hook to get event history
 */
export function useEventHistory(
  eventType?: string,
  limit?: number
): GameEvent[] {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const updateEvents = () => {
      setEvents(gameEventBus.getEventHistory(eventType, limit));
    };

    // Initial load
    updateEvents();

    // Update on new events
    const handleNewEvent = () => {
      updateEvents();
    };

    gameEventBus.on('game.event', handleNewEvent);

    return () => {
      gameEventBus.off('game.event', handleNewEvent);
    };
  }, [eventType, limit]);

  return events;
}

/**
 * Hook to get player-specific events
 */
export function usePlayerEvents(
  playerId: number,
  limit?: number
): GameEvent[] {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const updateEvents = () => {
      setEvents(gameEventBus.getPlayerEvents(playerId, limit));
    };

    // Initial load
    updateEvents();

    // Update on new events
    const handleNewEvent = () => {
      updateEvents();
    };

    gameEventBus.on('game.event', handleNewEvent);

    return () => {
      gameEventBus.off('game.event', handleNewEvent);
    };
  }, [playerId, limit]);

  return events;
}

/**
 * Hook to get match-specific events
 */
export function useMatchEvents(
  matchId: number,
  limit?: number
): GameEvent[] {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const updateEvents = () => {
      setEvents(gameEventBus.getMatchEvents(matchId, limit));
    };

    // Initial load
    updateEvents();

    // Update on new events
    const handleNewEvent = () => {
      updateEvents();
    };

    gameEventBus.on('game.event', handleNewEvent);

    return () => {
      gameEventBus.off('game.event', handleNewEvent);
    };
  }, [matchId, limit]);

  return events;
}

/**
 * Hook to emit events easily from components
 */
export function useGameEventEmitter() {
  return {
    emitEvent: <T extends AllGameEvents>(event: T) => {
      gameEventBus.emitGameEvent(event);
    },
    createInjuryEvent: gameEventBus.constructor.createInjuryEvent,
    createScoreEvent: gameEventBus.constructor.createScoreEvent,
    createProgressionEvent: gameEventBus.constructor.createProgressionEvent,
    createEconomicEvent: gameEventBus.constructor.createEconomicEvent
  };
}

/**
 * Hook for real-time event notifications
 */
export function useEventNotifications() {
  const [notifications, setNotifications] = useState<GameEvent[]>([]);

  useEffect(() => {
    const handleEvent = (event: GameEvent) => {
      setNotifications(prev => [...prev, event].slice(-5)); // Keep last 5 events
    };

    gameEventBus.on('game.event', handleEvent);

    return () => {
      gameEventBus.off('game.event', handleEvent);
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotifications
  };
}