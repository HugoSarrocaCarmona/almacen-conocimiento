import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import * as storage from './storage.js';
import { sanitizeResource } from '../lib/model.js';

const make = (id, title) => sanitizeResource({ id, title });

beforeEach(async () => {
  await storage.replaceAllResources([]);
});

describe('almacenamiento IndexedDB', () => {
  it('crea, lee, actualiza y elimina', async () => {
    await storage.putResource(make('1', 'Uno'));
    await storage.putResource(make('2', 'Dos'));
    expect((await storage.getAllResources()).map((r) => r.title).sort()).toEqual(['Dos', 'Uno']);

    await storage.putResource({ ...make('1', 'Uno editado') });
    const all = await storage.getAllResources();
    expect(all.find((r) => r.id === '1').title).toBe('Uno editado');
    expect(all).toHaveLength(2);

    await storage.deleteResource('2');
    expect((await storage.getAllResources()).map((r) => r.id)).toEqual(['1']);
  });

  it('los datos siguen ahí tras cerrar y reabrir la base de datos', async () => {
    await storage.putResource(make('p', 'Persistente'));
    await storage._closeForTests();
    const all = await storage.getAllResources();
    expect(all.map((r) => r.title)).toEqual(['Persistente']);
  });

  it('guarda varios a la vez y sustituye todo', async () => {
    await storage.putResources([make('a', 'A'), make('b', 'B')]);
    expect(await storage.getAllResources()).toHaveLength(2);
    await storage.replaceAllResources([make('c', 'C')]);
    expect((await storage.getAllResources()).map((r) => r.id)).toEqual(['c']);
  });

  it('guarda metadatos (fecha de la última copia)', async () => {
    await storage.setMeta('lastExport', '2026-10-16T10:00:00.000Z');
    expect(await storage.getMeta('lastExport')).toBe('2026-10-16T10:00:00.000Z');
    expect(await storage.getMeta('nada')).toBeNull();
  });

  it('convierte los errores en mensajes comprensibles', async () => {
    await expect(storage.putResource({ sinId: true })).rejects.toBeInstanceOf(storage.StorageError);
  });
});
