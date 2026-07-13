/**
 * ZyncPDF - Workspace Manager
 * Manages workspaces, tabs, layouts, and session persistence
 */

import { Workspace, DocumentTab, PDFDocument, ToolMode, WorkspaceLayout } from '../types/index.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { StorageManager } from '../storage/storage-manager.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

const STORAGE_KEY = 'zyncpdf-workspace';

export class WorkspaceManager extends EventEmitter {
  private app: any;
  private storage: StorageManager;
  private currentWorkspace: Workspace | null = null;
  private workspaces: Map<string, Workspace> = new Map();
  private tabs: Map<string, DocumentTab> = new Map();
  private activeTabId: string | null = null;
  private isInitialized = false;

  constructor(app: any) {
    super();
    this.app = app;
    this.storage = app.storage;
  }

async initialize(): Promise<void> {
     await this.loadWorkspaces();
     await this.restoreSession();
     this.isInitialized = true;
   }

  // ============================================
  // WORKSPACE MANAGEMENT
  // ============================================

  async createWorkspace(name: string, layout: WorkspaceLayout['mode'] = 'single'): Promise<Workspace> {
    const workspace: Workspace = {
      id: this.generateId(),
      name,
      documents: [],
      activeDocumentId: null,
      layout: { mode: layout },
      sidebarOpen: true,
      sidebarTab: 'thumbnails',
      sidebarWidth: 280,
      panelOpen: true,
      panelTab: 'properties',
      panelWidth: 320,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.workspaces.set(workspace.id, workspace);
    await this.saveWorkspaces();
    
    this.emit('workspace:create', workspace);
    return workspace;
  }

  async setActiveWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    // Save current workspace state
    if (this.currentWorkspace) {
      this.saveCurrentWorkspaceState();
    }

    // Switch to new workspace
    this.currentWorkspace = workspace;
    
    // Close all current tabs
    await this.closeAllTabs();
    
    // Restore workspace tabs
    await this.restoreWorkspaceTabs(workspace);
    
    workspace.updatedAt = Date.now();
    await this.saveWorkspaces();
    
    this.emit('workspace:activate', workspace);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    if (this.workspaces.size <= 1) {
      throw new Error('Cannot delete the last workspace');
    }

    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    // Close all tabs in workspace
    for (const tabId of workspace.documents) {
      await this.closeTab(tabId);
    }

    this.workspaces.delete(workspaceId);
    
    if (this.currentWorkspace?.id === workspaceId) {
      // Switch to another workspace
      const nextWorkspace = this.workspaces.values().next().value;
      if (nextWorkspace) {
        await this.setActiveWorkspace(nextWorkspace.id);
      }
    }

    await this.saveWorkspaces();
    this.emit('workspace:delete', workspaceId);
  }

  getWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getCurrentWorkspace(): Workspace | null {
    return this.currentWorkspace;
  }

  // ============================================
  // TAB MANAGEMENT
  // ============================================

  async addTab(document: any): Promise<DocumentTab> {
    const tab: DocumentTab = {
      id: this.generateId(),
      documentId: document.id,
      title: document.name,
      icon: 'file',
      isActive: true,
      isPinned: false,
      isModified: document.isModified,
      scrollPosition: { x: 0, y: 0 },
      zoom: 1,
      pageNumber: 1,
      viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
    };

    // Deactivate other tabs
    this.tabs.forEach(tab => tab.isActive = false);
    tab.isActive = true;

    this.tabs.set(tab.id, tab);
    this.activeTabId = tab.id;

    if (this.currentWorkspace) {
      this.currentWorkspace.documents.push(tab.id);
      this.currentWorkspace.activeDocumentId = tab.id;
      this.currentWorkspace.updatedAt = Date.now();
      await this.saveWorkspaces();
    }

    this.emit('tab:add', tab);
    return tab;
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const doc = this.app.documentManager.documents.get(tab.documentId);
    if (doc?.isModified) {
      const save = confirm(`Save changes to "${tab.title}" before closing?`);
      if (save && doc) {
        await this.app.documentManager.saveDocument(doc);
      }
    }

    // Remove from workspace
    if (this.currentWorkspace) {
      this.currentWorkspace.documents = this.currentWorkspace.documents.filter(id => id !== tab.id);
      if (this.currentWorkspace.activeDocumentId === tab.id) {
        this.currentWorkspace.activeDocumentId = null;
      }
    }

    // Remove tab
    const wasActive = this.activeTabId === tab.id;
    this.tabs.delete(tabId);

    if (wasActive) {
      const remaining = Array.from(this.tabs.values());
      if (remaining.length > 0) {
        this.activateTab(remaining[remaining.length - 1].id);
      } else {
        this.activeTabId = null;
      }
    }

    this.emit('tab:close', tab.id);
    await this.saveWorkspaces();
  }

  async closeAllTabs(): Promise<void> {
    const tabIds = Array.from(this.tabs.keys());
    for (const tabId of tabIds) {
      await this.closeTab(tabId);
    }
  }

  async activateTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Deactivate current
    this.tabs.forEach(t => t.isActive = false);
    tab.isActive = true;
    this.activeTabId = tab.id;

    // Switch document
    const doc = this.app.documentManager.documents.get(tab.documentId);
    if (doc) {
      await this.app.documentManager.goToPage(tab.pageNumber);
      this.app.documentManager.setZoom(tab.zoom);
      this.app.documentManager.setViewport(tab.viewport);
    }

    this.app.tabBar.activateTab(tab.id);
    this.emit('tab:activate', tab);
    this.emit('activeDocument:change', doc);
    await this.saveWorkspaces();
  }

  setActiveDocument(doc: PDFDocument | null): void {
    this.emit('activeDocument:change', doc);
  }

  getActiveTab(): DocumentTab | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  getTabs(): DocumentTab[] {
    return Array.from(this.tabs.values());
  }

  getTab(tabId: string): DocumentTab | undefined {
    return this.tabs.get(tabId);
  }

  updateTab(tabId: string, updates: Partial<DocumentTab>): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      Object.assign(tab, updates);
      this.app.tabBar.setTabModified(tab.id, tab.isModified);
      this.app.tabBar.setTabTitle(tab.id, tab.title);
      this.emit('tab:update', tab);
    }
  }

  setTabPinned(tabId: string, pinned: boolean): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isPinned = pinned;
      this.emit('tab:pin', { tabId, pinned });
      this.saveWorkspaces();
    }
  }

  async reorderTabs(tabIds: string[]): Promise<void> {
    // Reorder tabs in workspace
    if (this.currentWorkspace) {
      this.currentWorkspace.documents = tabIds;
      this.currentWorkspace.updatedAt = Date.now();
      await this.saveWorkspaces();
    }
  }

  // ============================================
  // SESSION PERSISTENCE
  // ============================================

  async saveSession(): Promise<void> {
    const session = {
      currentWorkspaceId: this.currentWorkspace?.id,
      tabs: Array.from(this.tabs.entries()),
      timestamp: Date.now(),
    };
    
    await this.storage.set('zyncpdf-session', session);
  }

public async restoreSession(): Promise<void> {
     try {
       const session = await this.storage.get('zyncpdf-session');
       if (session && session.tabs) {
         // Restore tabs
         for (const [tabId, tab] of session.tabs) {
           this.tabs.set(tabId, tab as DocumentTab);
         }
         
         // Restore active workspace
         if (session.currentWorkspaceId) {
           await this.setActiveWorkspace(session.currentWorkspaceId);
         }
       }
     } catch (e) {
       console.warn('[WorkspaceManager] Failed to load session:', e);
     }
   }

  private saveCurrentWorkspaceState(): void {
    if (!this.currentWorkspace) return;
    
    this.currentWorkspace.documents = Array.from(this.tabs.keys());
    this.currentWorkspace.activeDocumentId = this.activeTabId;
    this.currentWorkspace.sidebarOpen = this.app.sidebar.isOpen();
    this.currentWorkspace.sidebarTab = this.app.sidebar.getActiveTab();
    this.currentWorkspace.sidebarWidth = this.app.sidebar.getWidth();
    this.currentWorkspace.panelOpen = this.app.panel.isOpen();
    this.currentWorkspace.panelTab = this.app.panel.getActiveTab();
    this.currentWorkspace.panelWidth = this.app.panel.getWidth();
    this.currentWorkspace.layout = this.app.documentManager.getLayout();
    this.currentWorkspace.updatedAt = Date.now();
  }

  private async restoreWorkspaceTabs(workspace: Workspace): Promise<void> {
    // Close current tabs
    await this.closeAllTabs();

    // Restore tabs from workspace
    for (const tabId of workspace.documents) {
      // In a real app, we'd restore the actual document
      // For now, just create tab entries
    }
  }

  async loadWorkspaces(): Promise<void> {
    try {
      const data = await this.storage.get('zyncpdf-workspaces');
      if (data && data.workspaces) {
        for (const ws of data.workspaces) {
          this.workspaces.set(ws.id, ws);
        }
        
        // Set default workspace
        if (this.workspaces.size === 0) {
          await this.createWorkspace('Default');
        } else {
          const defaultWs = data.workspaces.find((w: any) => w.isDefault) || data.workspaces[0];
          this.currentWorkspace = this.workspaces.get(defaultWs.id);
        }
      } else {
        await this.createWorkspace('Default');
      }
    } catch (e) {
      console.warn('[WorkspaceManager] Failed to load workspaces:', e);
      await this.createWorkspace('Default');
    }
  }

  private async saveWorkspaces(): Promise<void> {
    await this.storage.set('zyncpdf-workspaces', {
      workspaces: Array.from(this.workspaces.values()),
    });
  }

  // ============================================
  // LAYOUT MANAGEMENT
  // ============================================

  setLayout(layout: WorkspaceLayout): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.layout = layout;
      this.currentWorkspace.updatedAt = Date.now();
      this.emit('layout:change', layout);
      this.saveWorkspaces();
    }
  }

  getLayout(): WorkspaceLayout {
    return this.currentWorkspace?.layout || { mode: 'single' };
  }

  toggleSidebar(): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.sidebarOpen = !this.currentWorkspace.sidebarOpen;
      this.emit('sidebar:toggle', this.currentWorkspace.sidebarOpen);
      this.saveWorkspaces();
    }
  }

  togglePanel(): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.panelOpen = !this.currentWorkspace.panelOpen;
      this.emit('panel:toggle', this.currentWorkspace.panelOpen);
      this.saveWorkspaces();
    }
  }

  setSidebarTab(tab: string): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.sidebarTab = tab as any;
      this.saveWorkspaces();
    }
  }

  setPanelTab(tab: string): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.panelTab = tab as any;
      this.saveWorkspaces();
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async destroy(): Promise<void> {
    await this.saveSession();
    this.workspaces.clear();
    this.tabs.clear();
  }
}