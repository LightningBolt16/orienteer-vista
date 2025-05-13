
import { nanoid } from 'nanoid';

// Types for the event system
export interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station' | 'timed-start' | 'mandatory-crossing';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  controls: Control[];
  length?: number; // in kilometers
  climb?: number; // in meters
  scale?: string; // e.g., '10000' for 1:10000
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  organizer: string;
  mapId: string;
  mapType: 'sprint' | 'forest';
  mapScale: string;
  courses: Course[];
}

export interface MapInfo {
  id: string;
  name: string;
  imageUrl: string;
  type: 'sprint' | 'forest';
  scale: string;
}

export function generateNewEventId(): string {
  return `event-${nanoid()}`;
}

export function generateNewCourseId(): string {
  return `course-${nanoid()}`;
}

export function generateNewControlId(): string {
  return `control-${nanoid()}`;
}
