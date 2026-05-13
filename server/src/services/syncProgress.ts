import { EventEmitter } from 'events';

export interface SyncProgressEvent {
  type: 'start' | 'log' | 'progress' | 'done' | 'error';
  message: string;
  step?: string;
  progress?: number;
  records?: number;
  errors?: number;
}

class SyncProgress extends EventEmitter {
  public send(event: SyncProgressEvent) {
    this.emit('progress', event);
  }

  public onProgress(handler: (event: SyncProgressEvent) => void) {
    this.on('progress', handler);
    return () => { this.off('progress', handler); };
  }
}

export default new SyncProgress();
