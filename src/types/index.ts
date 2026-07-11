/**
 * ZyncPDF - Professional PDF Workspace
 * Type definitions for the entire application
 */

// ============================================
// CORE TYPES
// ============================================

export type Theme = 'light' | 'dark' | 'system';
export type ToolMode = 'select' | 'pan' | 'text' | 'highlight' | 'underline' | 'strikethrough' | 'sticky-note' | 'text-box' | 'freehand' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'signature' | 'image' | 'eraser';
export type SidebarTab = 'thumbnails' | 'bookmarks' | 'annotations' | 'search' | 'layers';
export type PanelTab = 'properties' | 'styles' | 'layers' | 'comments';

// ============================================
// DOCUMENT TYPES
// ============================================

export interface PDFDocument {
  id: string;
  name: string;
  originalName: string;
  file: File;
  url: string;
  pageCount: number;
  pages: PDFPage[];
  annotations: Annotation[];
  textLayers: TextLayer[];
  metadata: DocumentMetadata;
  createdAt: number;
  updatedAt: number;
  isModified: boolean;
  viewport: DocumentViewport;
}

export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  canvas?: HTMLCanvasElement;
  thumbnail?: HTMLCanvasElement;
  textItems: TextItem[];
  annotations: Annotation[];
  viewport: PageViewport;
}

export interface PageViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export interface DocumentViewport {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  fileSize: number;
  isEncrypted: boolean;
  pdfVersion: string;
}

export interface TextItem {
  str: string;
  transform: number[];
  fontName: string;
  fontSize: number;
  color: number[];
  width: number;
  height: number;
  x: number;
  y: number;
  pageNumber: number;
  bbox: [number, number, number, number];
}

export interface TextLayer {
  pageNumber: number;
  divs: HTMLElement[];
}

// ============================================
// ANNOTATION TYPES
// ============================================

export type AnnotationType = 
  | 'highlight' 
  | 'underline' 
  | 'strikethrough' 
  | 'sticky-note' 
  | 'text-box' 
  | 'freehand' 
  | 'rectangle' 
  | 'ellipse' 
  | 'line' 
  | 'arrow' 
  | 'signature' 
  | 'image' 
  | 'stamp';

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  rect: Rect;
  color: string;
  opacity: number;
  lineWidth: number;
  author: string;
  createdAt: number;
  updatedAt: number;
  data: AnnotationData;
  selected: boolean;
  locked: boolean;
  layer: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface AnnotationData {
  // Highlight/Underline/Strikethrough
  quadrilaterals?: Point[][];
  text?: string;
  
  // Sticky Note
  note?: string;
  icon?: 'note' | 'comment' | 'help' | 'insert' | 'key' | 'newparagraph' | 'paragraph';
  open?: boolean;
  
  // Text Box
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  padding?: number;
  
  // Freehand
  points?: Point[];
  pressure?: number[];
  
  // Shapes
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  startArrow?: boolean;
  endArrow?: boolean;
  radius?: number;
  
  // Signature
  signatureData?: string;
  signatureType?: 'drawn' | 'typed' | 'image';
  
  // Image
  imageData?: string;
  imageWidth?: number;
  imageHeight?: number;
  maintainAspectRatio?: boolean;
  
  // Stamp
  stampType?: 'approved' | 'rejected' | 'confidential' | 'draft' | 'final' | 'custom';
  stampText?: string;
}

// ============================================
// TOOL TYPES
// ============================================

export interface Tool {
  id: ToolMode;
  name: string;
  icon: string;
  shortcut?: string;
  cursor: string;
  category: 'navigation' | 'annotation' | 'content' | 'measure';
  requiresSelection: boolean;
  options: ToolOptions;
}

export interface ToolOptions {
  color?: string;
  opacity?: number;
  lineWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fillColor?: string;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  startArrow?: boolean;
  endArrow?: boolean;
  stampType?: string;
  signatureType?: 'drawn' | 'typed' | 'image';
}

export interface ToolState {
  currentTool: ToolMode;
  previousTool: ToolMode;
  options: ToolOptions;
  isDrawing: boolean;
  startPoint?: Point;
  currentPoint?: Point;
  previewAnnotation?: Annotation;
}

// ============================================
// SELECTION TYPES
// ============================================

export interface Selection {
  id: string;
  annotationIds: string[];
  bounds: Rect;
  handles: SelectionHandle[];
}

export interface SelectionHandle {
  id: string;
  position: 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br' | 'rotate';
  cursor: string;
  point: Point;
}

// ============================================
// WORKSPACE TYPES
// ============================================

export interface Workspace {
  id: string;
  name: string;
  documents: string[]; // document IDs
  activeDocumentId: string | null;
  layout: WorkspaceLayout;
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  panelOpen: boolean;
  panelTab: PanelTab;
  panelWidth: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceLayout {
  mode: 'single' | 'split-horizontal' | 'split-vertical' | 'grid';
  splitRatio?: number;
}

// ============================================
// TAB TYPES
// ============================================

export interface DocumentTab {
  id: string;
  documentId: string;
  title: string;
  icon?: string;
  isActive: boolean;
  isPinned: boolean;
  isModified: boolean;
  scrollPosition: { x: number; y: number };
  zoom: number;
  pageNumber: number;
  viewport: DocumentViewport;
}

// ============================================
// COMMAND PALETTE TYPES
// ============================================

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category: string;
  keywords: string[];
  action: () => void | Promise<void>;
  when?: string; // context when command is available
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface AppSettings {
  theme: Theme;
  language: string;
  autoSave: boolean;
  autoSaveInterval: number;
  showRulers: boolean;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  defaultZoom: number;
  zoomStep: number;
  minZoom: number;
  maxZoom: number;
  smoothScrolling: boolean;
  hardwareAcceleration: boolean;
  renderQuality: 'low' | 'medium' | 'high';
  textSelectionColor: string;
  annotationColors: string[];
  recentFilesLimit: number;
  keyboardShortcuts: Record<string, string>;
  toolbarPosition: 'top' | 'left' | 'right' | 'bottom';
  sidebarPosition: 'left' | 'right';
  panelPosition: 'left' | 'right';
  autoHideSidebar: boolean;
  autoHidePanel: boolean;
  showPageBorders: boolean;
  showPageShadows: boolean;
  pageGap: number;
  backgroundColor: string;
  backgroundPattern: 'none' | 'dots' | 'grid' | 'lines';
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
  category: string;
  when?: string;
}

// ============================================
// EVENT TYPES
// ============================================

export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export type EventType = 
  | 'document:open'
  | 'document:close'
  | 'document:save'
  | 'document:modified'
  | 'page:change'
  | 'zoom:change'
  | 'tool:change'
  | 'selection:change'
  | 'annotation:create'
  | 'annotation:update'
  | 'annotation:delete'
  | 'annotation:select'
  | 'sidebar:toggle'
  | 'panel:toggle'
  | 'tab:create'
  | 'tab:close'
  | 'tab:activate'
  | 'theme:change'
  | 'settings:change'
  | 'command:execute'
  | 'search:query'
  | 'find:next'
  | 'find:previous'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'delete';

// ============================================
// HISTORY TYPES
// ============================================

export interface HistoryEntry {
  id: string;
  type: 'annotation' | 'document' | 'selection' | 'viewport' | 'text';
  action: 'create' | 'update' | 'delete' | 'move' | 'resize' | 'rotate' | 'style' | 'reorder';
  timestamp: number;
  documentId: string;
  data: any;
  previousData: any;
  canUndo: boolean;
  canRedo: boolean;
}

// ============================================
// EXPORT/IMPORT TYPES
// ============================================

export interface ExportOptions {
  format: 'pdf' | 'pdf-a' | 'image' | 'txt' | 'json';
  pages?: number[];
  includeAnnotations: boolean;
  includeForms: boolean;
  includeMetadata: boolean;
  compression: 'none' | 'low' | 'medium' | 'high';
  imageFormat?: 'png' | 'jpeg' | 'webp';
  imageQuality?: number;
  imageDPI?: number;
  flatten: boolean;
  password?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
}

export interface ImportOptions {
  merge?: boolean;
  mergeMode?: 'append' | 'prepend' | 'interleave';
  password?: string;
}

// ============================================
// WORKER TYPES
// ============================================

export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  transferables?: Transferable[];
}

export interface WorkerResponse<T = any> {
  id: string;
  success: boolean;
  payload?: T;
  error?: string;
}

// ============================================
// PLUGIN TYPES
// ============================================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  tools: Tool[];
  commands: Command[];
  settings: any;
  initialize: (api: PluginAPI) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface PluginAPI {
  documents: {
    getAll: () => PDFDocument[];
    getActive: () => PDFDocument | null;
    open: (file: File) => Promise<PDFDocument>;
    close: (id: string) => Promise<void>;
    save: (id: string, options?: ExportOptions) => Promise<void>;
  };
  annotations: {
    create: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Annotation>;
    update: (id: string, data: Partial<Annotation>) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getByPage: (pageNumber: number) => Annotation[];
  };
  ui: {
    showToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    showModal: (options: ModalOptions) => Promise<any>;
    addCommand: (command: Command) => void;
    removeCommand: (id: string) => void;
    registerTool: (tool: Tool) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  events: {
    on: (type: EventType, handler: (event: AppEvent) => void) => () => void;
    emit: (type: EventType, payload: any) => void;
  };
}

export interface ModalOptions {
  title: string;
  content: string | HTMLElement;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  actions?: ModalAction[];
  closable?: boolean;
}

export interface ModalAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  action: () => void | Promise<void>;
  closeOnClick?: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

export type NonNullableKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends T[K] ? K : never;
}[keyof T];