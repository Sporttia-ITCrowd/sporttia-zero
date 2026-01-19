export interface SportsCenter {
  id: string;
  conversationId: string;
  sporttiaId: number;
  name: string;
  city: string;
  language: string;
  adminEmail: string;
  adminName: string;
  facilitiesCount: number;
  createdAt: Date;
}

export interface Facility {
  name: string;
  sportId: number;
  sportName: string;
  schedules: Schedule[];
}

export interface Schedule {
  weekdays: number[];
  startTime: string;
  endTime: string;
  duration: number;
  rate: number;
}

export interface Sport {
  id: number;
  name: string;
}

export interface CollectedSportsCenterData {
  name: string;
  city: string;
  language: string;
  adminName: string;
  adminEmail: string;
  facilities: Facility[];
}
