import { LinkedList, ILinkedListNode } from "./LinkedList";

interface ILRUCacheItem<T> {
    key:number;
    size:number;
    value:T;
}

export class LRUCache<T> {
    private _items:LinkedList<ILRUCacheItem<T>> = new LinkedList<ILRUCacheItem<T>>();
    private _map:{[key:number]:ILinkedListNode<ILRUCacheItem<T>>} = {};
    private _maxSize: number;
    private _currentSize: number = 0;
    private _nextKey:number = 0;
    private _releaseCallback:(item:T)=>void;

    constructor(maxSize:number, releaseCallback:(item:T)=>void) {
        this._maxSize = maxSize;
        this._releaseCallback = releaseCallback
    }

    get(key:number):T {
        let cacheItem = this._map[key];
        if(!cacheItem) {
            return;
        }

        this._items.remove(cacheItem);
        this._items.addFirst(cacheItem);

        return cacheItem.value.value;
    }

    remove(key:number) {
        let cacheItem = this._map[key];
        if(!cacheItem) {
            return;
        }

        this._items.remove(cacheItem);
        delete this._map[key];
        this._releaseCallback && this._releaseCallback(cacheItem.value.value);
    }

    add(value:T, size:number):number {
        var key = ++this._nextKey;
        let node = this._items.createNode({key, value, size})
        this._items.addFirst(node);
        this._map[key] = node;
        this._currentSize += size;

        while(this._currentSize > this._maxSize) {
            var last = this._items.tail;
            if(!last) {
                return;
            }

            this._currentSize -= last.value.size;
            this._items.removeLast();
            this._releaseCallback && this._releaseCallback(last.value.value);
            delete this._map[last.value.key];
        }

        return key;
    }
}