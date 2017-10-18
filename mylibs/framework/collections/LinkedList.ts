export interface ILinkedListNode<T> {
    value: T;
    next: ILinkedListNode<T>;
}

export class LinkedList<T> {
    private _root: ILinkedListNode<T> = null;
    private _count: number = 0;
    private _tail: ILinkedListNode<T> = null;

    get count() {
        return this._count;
    }

    get root() {
        return this._root;
    }

    get tail() {
        return this._tail;
    }

    addFirst(node: ILinkedListNode<T>) {
        if (!this._root) {
            this._root = node;
            this._tail = node;
        } else {
            node.next = this._root;
            this._root = node;
        }
        this._count++;
    }

    addLast(node: ILinkedListNode<T>) {
        if (!this._tail) {
            this._root = node;
            this._tail = node;
        } else {
            this._tail.next = node;
            this._tail = node;
        }
        this._count++;
    }

    removeFirst() {
        if (this._root) {
            this._root = this._root.next;
            if (!this._root) {
                this._tail = null;
            }
            this._count--;
        }
    }

    clear() {
        this._root = null;
        this._tail = null;
        this._count = 0;
    }

    removeLast() {
        if (this._root === this._tail) {
            this.clear();
            return;
        }

        var current = this._root;
        while (current && current.next !== this._tail) {
            current = current.next;
        }

        if (current) {
            current.next = null;
            this._tail = current;
            this._count --;
        }
    }

    createNode(value:T):ILinkedListNode<T> {
        return {value, next:null};
    }

    remove(node: ILinkedListNode<T>) {
        var current = this._root;

        if (node === current) {
            this._root = node.next;
            if (!this._root) {
                this.clear();
            }
            this._count--;
        } else {
            while (current && current.next !== node) {
                current = current.next;
            }
            if (current) {
                this._count--;
                current.next = node.next;
                if (!current.next) {
                    this._tail = current;
                }
            }
        }
    }
}
