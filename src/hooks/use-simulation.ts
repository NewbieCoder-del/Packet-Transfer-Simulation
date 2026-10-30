import { useRef, useCallback } from 'react';
import { useStore } from '../store';
import { processEvent } from '../engine/simulator';
import { findDirectEdge } from '../engine/routing';
import { generateId } from '../utils/mac';
import type { AnimatedPacket } from '../types/network';

const ANIMATION_DURATION = 1200; // ms per packet hop

export function useSimulation() {
  const rafRef = useRef<number>(0);

  const step = useCallback(() => {
    const store = useStore.getState();
    const { eventQueue, nodes, edges } = store;

    if (eventQueue.length === 0 && store.activePackets.length === 0) {
      store.setSimState('idle');
      return;
    }

    // Only process next event if no animations are in flight
    if (store.activePackets.length === 0 && eventQueue.length > 0) {
      const event = store.dequeueEvent();
      if (!event) return;

      const result = processEvent(event, nodes, edges);

      // Apply ARP mutations
      for (const mut of result.arpMutations) {
        useStore.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === mut.nodeId
              ? { ...n, arpTable: { ...n.arpTable, [mut.arpEntry.ip]: mut.arpEntry.mac } }
              : n
          ),
        }));
      }

      // Apply TCP mutations
      for (const mut of result.tcpMutations) {
        useStore.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === mut.nodeId ? { ...n, tcpState: mut.tcpState } : n
          ),
        }));
      }

      // Enqueue new events
      for (const newEvent of result.newEvents) {
        store.enqueueEvent(newEvent);
      }

      // Add logs
      for (const log of result.logs) {
        store.addLog(event.time, log);
      }

      // Create animations
      const now = performance.now();
      for (const anim of result.animations) {
        const edgeId = findDirectEdge(anim.fromNodeId, anim.toNodeId, edges);
        if (!edgeId) continue;

        const animatedPacket: AnimatedPacket = {
          id: generateId(),
          packet: anim.packet,
          fromNodeId: anim.fromNodeId,
          toNodeId: anim.toNodeId,
          edgeId,
          progress: 0,
          startTime: now,
          duration: ANIMATION_DURATION / store.speed,
        };
        store.addActivePacket(animatedPacket);
      }
    }
  }, []);

  const animate = useCallback((timestamp: number) => {
    const store = useStore.getState();
    if (store.simState !== 'running' && store.simState !== 'stepping') return;

    const activePackets = store.activePackets;
    let allDone = true;

    for (const pkt of activePackets) {
      const elapsed = timestamp - pkt.startTime;
      const progress = Math.min(elapsed / pkt.duration, 1);
      store.updatePacketProgress(pkt.id, progress);

      if (progress >= 1) {
        store.removeActivePacket(pkt.id);
      } else {
        allDone = false;
      }
    }

    if (allDone && activePackets.length > 0) {
      // All animations done, process next event
      if (store.simState === 'stepping') {
        store.setSimState('paused');
      } else {
        // Small delay before next event
        setTimeout(() => step(), 200);
      }
    }

    if (store.simState === 'running' || store.activePackets.length > 0) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [step]);

  const start = useCallback(() => {
    const store = useStore.getState();
    if (store.eventQueue.length === 0 && store.activePackets.length === 0) return;
    store.setSimState('running');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const pause = useCallback(() => {
    useStore.getState().setSimState('paused');
    cancelAnimationFrame(rafRef.current);
  }, []);

  const resume = useCallback(() => {
    const store = useStore.getState();
    store.setSimState('running');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const stepOnce = useCallback(() => {
    const store = useStore.getState();
    store.setSimState('stepping');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const store = useStore.getState();
    store.resetSimulation();
    store.clearLogs();
    // Reset TCP states
    useStore.setState((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, tcpState: undefined, arpTable: {} })),
    }));
  }, []);

  return { start, pause, resume, stepOnce, reset };
}
