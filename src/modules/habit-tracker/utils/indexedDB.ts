import { BaseIndexedDB } from "@/utils/BaseIndexedDB";
import { DB_CONFIG } from "@/modules/habit-tracker/data/config";

class HabitTrackerDB extends BaseIndexedDB {
  constructor() {
    super(DB_CONFIG.NAME, DB_CONFIG.VERSION);
  }

  protected onUpgrade(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.HABITS)) {
      const habitsStore = db.createObjectStore(DB_CONFIG.STORES.HABITS, { keyPath: "id" });
      habitsStore.createIndex(DB_CONFIG.INDEX_NAMES.HABITS.CREATED_AT, DB_CONFIG.INDEX_KEY_PATHS.HABITS.CREATED_AT, { unique: false });
      habitsStore.createIndex(DB_CONFIG.INDEX_NAMES.HABITS.START_DATE, DB_CONFIG.INDEX_KEY_PATHS.HABITS.START_DATE, { unique: false });
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.RECORDS)) {
      const recordsStore = db.createObjectStore(DB_CONFIG.STORES.RECORDS, { keyPath: "id" });
      recordsStore.createIndex(DB_CONFIG.INDEX_NAMES.RECORDS.HABIT_ID, DB_CONFIG.INDEX_KEY_PATHS.RECORDS.HABIT_ID, { unique: false });
      recordsStore.createIndex(DB_CONFIG.INDEX_NAMES.RECORDS.DATE, DB_CONFIG.INDEX_KEY_PATHS.RECORDS.DATE, { unique: false });
      recordsStore.createIndex(DB_CONFIG.INDEX_NAMES.RECORDS.HABIT_ID_DATE, DB_CONFIG.INDEX_KEY_PATHS.RECORDS.HABIT_ID_DATE, { unique: true });
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.TIME_HABITS)) {
      const timeHabitsStore = db.createObjectStore(DB_CONFIG.STORES.TIME_HABITS, { keyPath: "id" });
      timeHabitsStore.createIndex(DB_CONFIG.INDEX_NAMES.TIME_HABITS.CREATED_AT, DB_CONFIG.INDEX_KEY_PATHS.TIME_HABITS.CREATED_AT, { unique: false });
      timeHabitsStore.createIndex(DB_CONFIG.INDEX_NAMES.TIME_HABITS.START_DATE, DB_CONFIG.INDEX_KEY_PATHS.TIME_HABITS.START_DATE, { unique: false });
    }

    if (!db.objectStoreNames.contains(DB_CONFIG.STORES.TIME_RECORDS)) {
      const timeRecordsStore = db.createObjectStore(DB_CONFIG.STORES.TIME_RECORDS, { keyPath: "id" });
      timeRecordsStore.createIndex(DB_CONFIG.INDEX_NAMES.TIME_RECORDS.HABIT_ID, DB_CONFIG.INDEX_KEY_PATHS.TIME_RECORDS.HABIT_ID, { unique: false });
      timeRecordsStore.createIndex(DB_CONFIG.INDEX_NAMES.TIME_RECORDS.DATE, DB_CONFIG.INDEX_KEY_PATHS.TIME_RECORDS.DATE, { unique: false });
      timeRecordsStore.createIndex(DB_CONFIG.INDEX_NAMES.TIME_RECORDS.HABIT_ID_DATE, DB_CONFIG.INDEX_KEY_PATHS.TIME_RECORDS.HABIT_ID_DATE, { unique: false });
    }
  }

  async addHabit(habit: HabitTracker.Habit): Promise<void> {
    await this.addRecord<HabitTracker.Habit>(DB_CONFIG.STORES.HABITS, habit);
  }

  async updateHabit(habit: HabitTracker.Habit): Promise<void> {
    await this.updateRecord<HabitTracker.Habit>(DB_CONFIG.STORES.HABITS, habit);
  }

  async deleteHabit(habitId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.HABITS, DB_CONFIG.STORES.RECORDS], "readwrite");
      const habitsStore = transaction.objectStore(DB_CONFIG.STORES.HABITS);
      const recordsStore = transaction.objectStore(DB_CONFIG.STORES.RECORDS);

      habitsStore.delete(habitId);
      
      const index = recordsStore.index(DB_CONFIG.INDEX_NAMES.RECORDS.HABIT_ID);
      const recordsRequest = index.openCursor(IDBKeyRange.only(habitId));
      
      recordsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllHabits(): Promise<HabitTracker.Habit[]> {
    return this.getAllRecords<HabitTracker.Habit>(DB_CONFIG.STORES.HABITS);
  }

  async getHabit(habitId: string): Promise<HabitTracker.Habit | null> {
    const habit = await this.getRecord<HabitTracker.Habit>(DB_CONFIG.STORES.HABITS, habitId);
    return habit || null;
  }

  async addHabitRecord(record: HabitTracker.HabitRecord): Promise<void> {
    await this.updateRecord<HabitTracker.HabitRecord>(DB_CONFIG.STORES.RECORDS, record);
  }

  async deleteHabitRecord(recordId: string): Promise<void> {
    await this.deleteRecord(DB_CONFIG.STORES.RECORDS, recordId);
  }

  async getHabitRecordsByHabit(habitId: string): Promise<HabitTracker.HabitRecord[]> {
    return this.getRecordsByIndex<HabitTracker.HabitRecord>(DB_CONFIG.STORES.RECORDS, DB_CONFIG.INDEX_NAMES.RECORDS.HABIT_ID, habitId);
  }

  async getHabitRecordsByDate(date: string): Promise<HabitTracker.HabitRecord[]> {
    return this.getRecordsByIndex<HabitTracker.HabitRecord>(DB_CONFIG.STORES.RECORDS, DB_CONFIG.INDEX_NAMES.RECORDS.DATE, date);
  }

  async getAllHabitRecords(): Promise<HabitTracker.HabitRecord[]> {
    return this.getAllRecords<HabitTracker.HabitRecord>(DB_CONFIG.STORES.RECORDS);
  }

  async addTimeHabit(habit: HabitTracker.TimeHabit): Promise<void> {
    await this.addRecord<HabitTracker.TimeHabit>(DB_CONFIG.STORES.TIME_HABITS, habit);
  }

  async updateTimeHabit(habit: HabitTracker.TimeHabit): Promise<void> {
    await this.updateRecord<HabitTracker.TimeHabit>(DB_CONFIG.STORES.TIME_HABITS, habit);
  }

  async deleteTimeHabit(habitId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.TIME_HABITS, DB_CONFIG.STORES.TIME_RECORDS], "readwrite");
      const habitsStore = transaction.objectStore(DB_CONFIG.STORES.TIME_HABITS);
      const recordsStore = transaction.objectStore(DB_CONFIG.STORES.TIME_RECORDS);

      habitsStore.delete(habitId);
      
      const index = recordsStore.index(DB_CONFIG.INDEX_NAMES.TIME_RECORDS.HABIT_ID);
      const recordsRequest = index.openCursor(IDBKeyRange.only(habitId));
      
      recordsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllTimeHabits(): Promise<HabitTracker.TimeHabit[]> {
    return this.getAllRecords<HabitTracker.TimeHabit>(DB_CONFIG.STORES.TIME_HABITS);
  }

  async getTimeHabit(habitId: string): Promise<HabitTracker.TimeHabit | null> {
    const habit = await this.getRecord<HabitTracker.TimeHabit>(DB_CONFIG.STORES.TIME_HABITS, habitId);
    return habit || null;
  }

  async addTimeHabitRecord(record: HabitTracker.TimeHabitRecord): Promise<void> {
    await this.updateRecord<HabitTracker.TimeHabitRecord>(DB_CONFIG.STORES.TIME_RECORDS, record);
  }

  async deleteTimeHabitRecord(recordId: string): Promise<void> {
    await this.deleteRecord(DB_CONFIG.STORES.TIME_RECORDS, recordId);
  }

  async getTimeHabitRecordsByHabit(habitId: string): Promise<HabitTracker.TimeHabitRecord[]> {
    return this.getRecordsByIndex<HabitTracker.TimeHabitRecord>(DB_CONFIG.STORES.TIME_RECORDS, DB_CONFIG.INDEX_NAMES.TIME_RECORDS.HABIT_ID, habitId);
  }

  async getTimeHabitRecordsByDate(date: string): Promise<HabitTracker.TimeHabitRecord[]> {
    return this.getRecordsByIndex<HabitTracker.TimeHabitRecord>(DB_CONFIG.STORES.TIME_RECORDS, DB_CONFIG.INDEX_NAMES.TIME_RECORDS.DATE, date);
  }

  async getAllTimeHabitRecords(): Promise<HabitTracker.TimeHabitRecord[]> {
    return this.getAllRecords<HabitTracker.TimeHabitRecord>(DB_CONFIG.STORES.TIME_RECORDS);
  }

  async exportData(): Promise<HabitTracker.ExportData> {
    const habits = await this.getAllHabits();
    const records = await this.getAllHabitRecords();
    const timeHabits = await this.getAllTimeHabits();
    const timeHabitRecords = await this.getAllTimeHabitRecords();
    return {
      habits,
      records,
      timeHabits,
      timeHabitRecords,
      exportDate: Date.now(),
    };
  }

  async importData(data: HabitTracker.ExportData): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.HABITS, DB_CONFIG.STORES.RECORDS, DB_CONFIG.STORES.TIME_HABITS, DB_CONFIG.STORES.TIME_RECORDS], "readwrite");
      const habitsStore = transaction.objectStore(DB_CONFIG.STORES.HABITS);
      const recordsStore = transaction.objectStore(DB_CONFIG.STORES.RECORDS);
      const timeHabitsStore = transaction.objectStore(DB_CONFIG.STORES.TIME_HABITS);
      const timeRecordsStore = transaction.objectStore(DB_CONFIG.STORES.TIME_RECORDS);

      data.habits.forEach((habit) => {
        habitsStore.put(habit);
      });

      data.records.forEach((record) => {
        recordsStore.put(record);
      });

      if (data.timeHabits) {
        data.timeHabits.forEach((habit) => {
          timeHabitsStore.put(habit);
        });
      }

      if (data.timeHabitRecords) {
        data.timeHabitRecords.forEach((record) => {
          timeRecordsStore.put(record);
        });
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.clearStore(DB_CONFIG.STORES.HABITS);
    await this.clearStore(DB_CONFIG.STORES.RECORDS);
    await this.clearStore(DB_CONFIG.STORES.TIME_HABITS);
    await this.clearStore(DB_CONFIG.STORES.TIME_RECORDS);
  }
}

export const dbManager = new HabitTrackerDB();