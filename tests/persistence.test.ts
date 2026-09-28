import { describe, expect, it } from 'vitest';
import { loadDraft, loadOverrides, saveDraft, saveOverrides } from '../src/state/persistence';
import { EMPTY_DRAFT } from '../src/state/state';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

class BrokenStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('SecurityError');
  }
  override setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

describe('persistencia', () => {
  it('guarda y recupera borrador y overrides', () => {
    const storage = new MemoryStorage();
    const draft = { quantities: { a: 2 }, variants: { a: 'exterior' as const }, clientName: 'Ana' };
    saveDraft(storage, draft);
    saveOverrides(storage, { 'a::exterior': 30000 });
    expect(loadDraft(storage)).toEqual(draft);
    expect(loadOverrides(storage)).toEqual({ 'a::exterior': 30000 });
  });

  it('vacío o sin storage devuelve defaults', () => {
    expect(loadDraft(new MemoryStorage())).toEqual(EMPTY_DRAFT);
    expect(loadDraft(null)).toEqual(EMPTY_DRAFT);
    expect(loadOverrides(null)).toEqual({});
  });

  it('si el storage tira errores no rompe', () => {
    const storage = new BrokenStorage();
    expect(() => saveDraft(storage, EMPTY_DRAFT)).not.toThrow();
    expect(loadDraft(storage)).toEqual(EMPTY_DRAFT);
    expect(loadOverrides(storage)).toEqual({});
  });

  it('descarta JSON roto y valores inválidos', () => {
    const storage = new MemoryStorage();
    storage.setItem('presupuestos-elec:v1:overrides', '{roto');
    expect(loadOverrides(storage)).toEqual({});

    storage.setItem(
      'presupuestos-elec:v1:draft',
      JSON.stringify({ quantities: { a: 2, b: -1, c: 'x', d: 1.5 }, variants: { a: 'aereo', b: 'embutido' }, clientName: 3 }),
    );
    expect(loadDraft(storage)).toEqual({ quantities: { a: 2 }, variants: { b: 'embutido' }, clientName: '' });
  });
});
