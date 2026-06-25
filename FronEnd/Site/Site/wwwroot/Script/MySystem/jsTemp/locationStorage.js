class locationDB {
    constructor(dbName = "locationDB", version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("cachedb")) {
                    const store = db.createObjectStore("cachedb", {
                        keyPath: "key"
                    });
                    store.createIndex("lastModified", "lastModified", { unique: false });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async set(key, data,lastmodified) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("cachedb", "readwrite");
            const store = tx.objectStore("cachedb");
            store.put({
                key: key,
                data: data,
                lastModified: lastmodified
            });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async get(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("cachedb", "readonly");
            const store = tx.objectStore("cachedb");
            const req = store.get(key);
            req.onsuccess = () => {
                if (!req.result) {
                    resolve(null);
                } else {
                    resolve(req.result.data); 
                }
            };
            req.onerror = () => reject(req.error);
        });
    }
    async getWithMeta(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("cachedb", "readonly");
            const store = tx.objectStore("cachedb");
            const req = store.get(key);

            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }
    async remove(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("cachedb", "readwrite");
            const store = tx.objectStore("cachedb");

            store.delete(key);

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }
}