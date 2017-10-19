import { LinkedList, ILinkedListNode } from "./LinkedList";

interface ILRUCacheItem<T> {
    size:number;
    value:T;
}

interface ICacheNode<T> extends ILinkedListNode<ILRUCacheItem<T>> {

}

export class LRUCache<T> {
    private _items:LinkedList<ILRUCacheItem<T>> = new LinkedList<ILRUCacheItem<T>>();

    private _maxSize: number;
    private _currentSize: number = 0;

    constructor(maxSize:number) {
        this._maxSize = maxSize;
    }

    use(cacheItem:ICacheNode<T>):void {
        this._items.remove(cacheItem);
        this._items.addFirst(cacheItem);
    }

    remove(cacheItem:ICacheNode<T>) {
        if(cacheItem.value) {
            this._currentSize -= cacheItem.value.size;
            this._items.remove(cacheItem);
            cacheItem.value.value = null;
            cacheItem.value = null;
        }
    }

    add(cacheItem:ILRUCacheItem<T>):ICacheNode<T> {
        var node = this._items.createNode(cacheItem);
        this._items.addFirst(node);

        this._currentSize += cacheItem.size;

        while(this._currentSize > this._maxSize) {
            var last = this._items.tail;
            if(!last) {
                return;
            }

            this._currentSize -= last.value.size;
            this._items.removeLast();
            last.value.value = null;
            last.value = null;
        }

        return node;
    }
}