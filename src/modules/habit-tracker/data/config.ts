export const DB_NAME = "HabitTrackerDB";
export const DB_VERSION = 3;

export const STORES = {
  HABITS: "habits",
  RECORDS: "records",
  TIME_HABITS: "timeHabits",
  TIME_RECORDS: "timeRecords",
} as const;

export const INDEX_NAMES = {
  HABITS: {
    CREATED_AT: "createdAt",
    START_DATE: "startDate",
  },
  RECORDS: {
    HABIT_ID: "habitId",
    DATE: "date",
    HABIT_ID_DATE: "habitId_date",
  },
  TIME_HABITS: {
    CREATED_AT: "createdAt",
    START_DATE: "startDate",
  },
  TIME_RECORDS: {
    HABIT_ID: "habitId",
    DATE: "date",
    HABIT_ID_DATE: "habitId_date",
  },
} as const;

export const INDEX_KEY_PATHS = {
  HABITS: {
    CREATED_AT: "createdAt",
    START_DATE: "startDate",
  },
  RECORDS: {
    HABIT_ID: "habitId",
    DATE: "date",
    HABIT_ID_DATE: ["habitId", "date"],
  },
  TIME_HABITS: {
    CREATED_AT: "createdAt",
    START_DATE: "startDate",
  },
  TIME_RECORDS: {
    HABIT_ID: "habitId",
    DATE: "date",
    HABIT_ID_DATE: ["habitId", "date"],
  },
} as const;

export const DB_CONFIG = {
  NAME: DB_NAME,
  VERSION: DB_VERSION,
  STORES,
  INDEX_NAMES,
  INDEX_KEY_PATHS,
};
