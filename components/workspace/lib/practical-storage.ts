import type { ProjectFloorPlan } from './floor-data'
import type { SceneConfig } from './scene-config'

export type LocalCheckpoint = { id: string; projectKey: string; label: string; savedAt: number; plan: ProjectFloorPlan; config: SceneConfig }

function database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('roomsketch-practical', 1)
        request.onupgradeneeded = () => {
            request.result.createObjectStore('checkpoints', { keyPath: 'id' }).createIndex('projectKey', 'projectKey')
            request.result.createObjectStore('images')
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function transaction<T>(store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await database()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const request = run(tx.objectStore(store))
        tx.oncomplete = () => { db.close(); resolve(request.result) }
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Local storage operation failed.')) }
        tx.onerror = () => { db.close(); reject(tx.error) }
    })
}

export async function checkpoints(projectKey: string): Promise<LocalCheckpoint[]> {
    const entries = await transaction('checkpoints', 'readonly', store => store.index('projectKey').getAll(projectKey))
    return (entries as LocalCheckpoint[]).sort((a, b) => b.savedAt - a.savedAt)
}

export async function saveCheckpoint(entry: LocalCheckpoint) {
    await transaction('checkpoints', 'readwrite', store => store.put(entry))
    const entries = await checkpoints(entry.projectKey)
    const expired = [...entries.filter(item => !item.id.startsWith('recovery:')).slice(20),
        ...entries.filter(item => item.id.startsWith('recovery:')).slice(5)]
    for (const old of expired) {
        await transaction('checkpoints', 'readwrite', store => store.delete(old.id))
    }
}

export const saveTracingImage = (id: string, image: Blob) => transaction('images', 'readwrite', store => store.put(image, id))
export const loadTracingImage = (id: string): Promise<Blob | undefined> => transaction('images', 'readonly', store => store.get(id))
