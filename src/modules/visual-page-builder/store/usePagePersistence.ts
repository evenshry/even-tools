import { BaseIndexedDB } from '@/utils/BaseIndexedDB';
import type { PageNode } from '../types';

/**
 * 已保存的页面结构
 */
export interface SavedPage {
  id: string;
  name: string;
  nodes: Record<string, PageNode>;
  createdAt: number;
  updatedAt: number;
}

/**
 * 可视化页面构建器的 IndexedDB 封装
 * 存储：visual_page_builder / pages
 */
class PageDB extends BaseIndexedDB {
  private static instance: PageDB | null = null;

  private constructor() {
    super('visual_page_builder', 1);
  }

  static getInstance(): PageDB {
    if (!PageDB.instance) {
      PageDB.instance = new PageDB();
    }
    return PageDB.instance;
  }

  protected onUpgrade(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('pages')) {
      const store = db.createObjectStore('pages', { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
  }

  async savePage(page: SavedPage): Promise<void> {
    await this.updateRecord('pages', page);
  }

  async getPage(id: string): Promise<SavedPage | undefined> {
    return this.getRecord<SavedPage>('pages', id);
  }

  async listPages(): Promise<SavedPage[]> {
    const pages = await this.getAllRecords<SavedPage>('pages');
    // 按 updatedAt 倒序
    return pages.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deletePage(id: string): Promise<void> {
    await this.deleteRecord('pages', id);
  }

  async getLatestPage(): Promise<SavedPage | undefined> {
    const pages = await this.listPages();
    return pages[0];
  }
}

export const pageDB = PageDB.getInstance();

/**
 * 默认页面 ID（单页应用，固定一个草稿页）
 * 多页管理在 T1.1 后续迭代中扩展
 */
export const DEFAULT_PAGE_ID = 'draft-page';
export const DEFAULT_PAGE_NAME = '未命名页面';
