const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

/**
 * In-memory resilient Firestore fallback store
 */
const fallbackStore = new Map();

class MemoryDocRef {
  constructor(collectionPath, id, store) {
    this.path = collectionPath;
    this.id = id;
    this.store = store;
  }

  async set(data, options = {}) {
    const key = `${this.path}/${this.id}`;
    if (options && options.merge) {
      const existing = this.store.get(key) || {};
      this.store.set(key, { ...existing, ...data });
    } else {
      this.store.set(key, { ...data });
    }
    return { writeTime: new Date() };
  }

  async get() {
    const key = `${this.path}/${this.id}`;
    const data = this.store.get(key);
    return {
      exists: data !== undefined,
      id: this.id,
      data: () => (data ? { ...data } : undefined),
    };
  }

  async update(updates) {
    const key = `${this.path}/${this.id}`;
    const current = this.store.get(key) || {};
    this.store.set(key, { ...current, ...updates });
    return { writeTime: new Date() };
  }

  async delete() {
    const key = `${this.path}/${this.id}`;
    this.store.delete(key);
    return { writeTime: new Date() };
  }

  collection(subName) {
    return new MemoryCollectionRef(`${this.path}/${this.id}/${subName}`, this.store);
  }
}

class MemoryCollectionRef {
  constructor(path, store) {
    this.path = path;
    this.store = store;
    this._filters = [];
    this._limit = null;
  }

  doc(id) {
    const docId = id || uuidv4();
    return new MemoryDocRef(this.path, docId, this.store);
  }

  async add(data) {
    const id = uuidv4();
    const docRef = this.doc(id);
    await docRef.set(data);
    return docRef;
  }

  where(field, op, val) {
    const clone = new MemoryCollectionRef(this.path, this.store);
    clone._filters = [...this._filters, { field, op, val }];
    clone._limit = this._limit;
    return clone;
  }

  orderBy() {
    return this;
  }

  limit(n) {
    const clone = new MemoryCollectionRef(this.path, this.store);
    clone._filters = [...this._filters];
    clone._limit = n;
    return clone;
  }

  async get() {
    const prefix = `${this.path}/`;
    let docs = [];
    for (const [key, val] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        const sub = key.slice(prefix.length);
        if (!sub.includes('/')) {
          const id = sub;
          docs.push({
            id,
            data: () => ({ ...val }),
          });
        }
      }
    }
    for (const f of this._filters) {
      docs = docs.filter(d => {
        const data = d.data();
        if (f.op === '==' || f.op === '===') return data[f.field] === f.val;
        if (f.op === '>=') return data[f.field] >= f.val;
        if (f.op === '<=') return data[f.field] <= f.val;
        if (f.op === '>') return data[f.field] > f.val;
        if (f.op === '<') return data[f.field] < f.val;
        return true;
      });
    }
    if (this._limit && this._limit > 0) {
      docs = docs.slice(0, this._limit);
    }
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

class ResilientFirestoreProxy {
  constructor(realDb) {
    this.realDb = realDb;
    this.useFallback = !realDb;
  }

  collection(name) {
    if (this.useFallback) {
      return new MemoryCollectionRef(name, fallbackStore);
    }

    const realCol = this.realDb.collection(name);
    return this._wrapCollection(realCol, name);
  }

  _wrapCollection(realCol, path) {
    const self = this;
    const memCol = new MemoryCollectionRef(path, fallbackStore);

    return {
      doc(id) {
        const realDoc = realCol.doc(id);
        const memDoc = memCol.doc(id);

        return {
          id: realDoc.id,
          collection(subName) {
            return self._wrapCollection(realDoc.collection(subName), `${path}/${realDoc.id}/${subName}`);
          },
          async set(data, options) {
            try {
              if (self.useFallback) throw new Error('Using fallback mode');
              const res = await realDoc.set(data, options);
              memDoc.set(data, options); // keep mirror in sync
              return res;
            } catch (err) {
              console.warn(`[FirestoreProxy] set() failed on ${path}/${id}, falling back:`, err.message);
              self.useFallback = true;
              return memDoc.set(data, options);
            }
          },
          async get() {
            try {
              if (self.useFallback) throw new Error('Using fallback mode');
              const res = await realDoc.get();
              if (res.exists) {
                memDoc.set(res.data());
                return res;
              }
              // If not found in realDb, check memory
              const memRes = await memDoc.get();
              return memRes.exists ? memRes : res;
            } catch (err) {
              console.warn(`[FirestoreProxy] get() failed on ${path}/${id}, falling back:`, err.message);
              self.useFallback = true;
              return memDoc.get();
            }
          },
          async update(updates) {
            try {
              if (self.useFallback) throw new Error('Using fallback mode');
              const res = await realDoc.update(updates);
              memDoc.update(updates);
              return res;
            } catch (err) {
              console.warn(`[FirestoreProxy] update() failed on ${path}/${id}, falling back:`, err.message);
              self.useFallback = true;
              return memDoc.update(updates);
            }
          },
          async delete() {
            try {
              if (self.useFallback) throw new Error('Using fallback mode');
              const res = await realDoc.delete();
              memDoc.delete();
              return res;
            } catch (err) {
              console.warn(`[FirestoreProxy] delete() failed on ${path}/${id}, falling back:`, err.message);
              self.useFallback = true;
              return memDoc.delete();
            }
          },
        };
      },

      where(field, op, val) {
        try {
          const realFiltered = realCol.where(field, op, val);
          return self._wrapQuery(realFiltered, memCol.where(field, op, val));
        } catch (e) {
          return memCol.where(field, op, val);
        }
      },

      orderBy(field, dir) {
        try {
          const realOrdered = realCol.orderBy(field, dir);
          return self._wrapQuery(realOrdered, memCol);
        } catch (e) {
          return memCol;
        }
      },

      limit(n) {
        try {
          const realLimited = realCol.limit(n);
          return self._wrapQuery(realLimited, memCol.limit(n));
        } catch (e) {
          return memCol.limit(n);
        }
      },

      async get() {
        try {
          if (self.useFallback) throw new Error('Using fallback mode');
          return await realCol.get();
        } catch (err) {
          console.warn(`[FirestoreProxy] get() failed on collection ${path}, falling back:`, err.message);
          self.useFallback = true;
          return await memCol.get();
        }
      },

      async add(data) {
        try {
          if (self.useFallback) throw new Error('Using fallback mode');
          const realRes = await realCol.add(data);
          memCol.doc(realRes.id).set(data);
          return realRes;
        } catch (err) {
          console.warn(`[FirestoreProxy] add() failed on collection ${path}, falling back:`, err.message);
          self.useFallback = true;
          return await memCol.add(data);
        }
      },
    };
  }

  _wrapQuery(realQuery, memQuery) {
    const self = this;
    return {
      where(field, op, val) {
        try {
          return self._wrapQuery(realQuery.where(field, op, val), memQuery.where(field, op, val));
        } catch (e) {
          return memQuery.where(field, op, val);
        }
      },
      orderBy(field, dir) {
        try {
          return self._wrapQuery(realQuery.orderBy(field, dir), memQuery);
        } catch (e) {
          return memQuery;
        }
      },
      limit(n) {
        try {
          return self._wrapQuery(realQuery.limit(n), memQuery.limit(n));
        } catch (e) {
          return memQuery.limit(n);
        }
      },
      async get() {
        try {
          if (self.useFallback) throw new Error('Using fallback mode');
          return await realQuery.get();
        } catch (err) {
          self.useFallback = true;
          return await memQuery.get();
        }
      },
    };
  }
}

// ── Initialize Firebase Admin ──────────────────────────────────────────────────
let realDb = null;

try {
  let projectId = (process.env.FIREBASE_PROJECT_ID || '').trim().replace(/['"]/g, '');
  let clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/['"]/g, '');
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log(`[FirebaseAdmin] Initialized with Service Account for: ${projectId}`);
    } else {
      admin.initializeApp();
      console.log('[FirebaseAdmin] Initialized with Default Credentials');
    }
  }

  realDb = admin.firestore();
  realDb.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.warn('[FirebaseAdmin] Could not initialize real Firestore, fallback active:', err.message);
}

const db = new ResilientFirestoreProxy(realDb);

module.exports = {
  admin,
  db,
  fallbackStore,
};
