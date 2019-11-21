import { DualCompareFunction, MemberPtr } from './utils.ts'

class BstNode<T> {
  data: T
  left: BstNode<T> | undefined
  right: BstNode<T> | undefined
  constructor(data: T) {
    this.data = data
  }
}

type BstNodePtr<T> =
  | MemberPtr<BstNode<T>, 'left'>
  | MemberPtr<BstNode<T>, 'right'>
  // eslint-disable-next-line
  | MemberPtr<Bst<T, any>, 'bst_root'>
type NodeOp<T> = (node: BstNode<T>) => void

class Bst<T extends S, S = T> {
  bst_root: BstNode<T> | undefined = undefined
  cmp: DualCompareFunction<S>

  constructor(cmp: DualCompareFunction<S>) {
    this.cmp = cmp
  }

  gteqcmp(a: S, b: S): boolean {
    return this.cmp(a, b) >= 0
  }
  gtcmp(a: S, b: S): boolean {
    return this.cmp(a, b) > 0
  }
  eqcmp(a: S, b: S): boolean {
    return this.cmp(a, b) === 0
  }

  add(object: T, node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')): void {
    if (!node.value) {
      node.value = new BstNode(object)
    } else if (this.gteqcmp(node.value.data, object)) {
      this.add(object, new MemberPtr(node.value, 'left'))
    } else {
      this.add(object, new MemberPtr(node.value, 'right'))
    }
  }

  _getInorderSuccessor(
    object: S,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): { ptr: BstNodePtr<T>; data: T } | undefined {
    type SuccessorType = { ptr: BstNodePtr<T>; data: T } | undefined
    let successor: SuccessorType
    const setSuccessor = (s: SuccessorType): void => {
      if (!successor || (s && this.gtcmp(successor.data, s.data))) {
        successor = s
      }
    }
    if (node.value) {
      if (this.gteqcmp(node.value.data, object)) {
        if (!this.eqcmp(node.value.data, object)) {
          setSuccessor({ ptr: node, data: node.value.data })
        }
        setSuccessor(
          this._getInorderSuccessor(object, new MemberPtr(node.value, 'left'))
        )
      }
      setSuccessor(
        this._getInorderSuccessor(object, new MemberPtr(node.value, 'right'))
      )
    }
    return successor
  }
  remove(
    object: S,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      const result = this.cmp(node.value.data, object)
      if (result > 0) {
        this.remove(object, new MemberPtr(node.value, 'left'))
      } else if (result < 0) {
        this.remove(object, new MemberPtr(node.value, 'right'))
      } else if (node.value.left && node.value.right) {
        const successor = this._getInorderSuccessor(node.value.data, node)

        this.remove(successor.data, successor.ptr)
        node.value.data = successor.data
      } else {
        node.value = node.value.left || node.value.right
      }
    }
  }

  operateOnAllRange(
    start: S,
    endm1: S,
    operation: NodeOp<T>,
    node = this.bst_root,
    undef = false
  ): void {
    if (node && !undef) {
      if (this.gteqcmp(node.data, start)) {
        if (this.gteqcmp(endm1, node.data)) {
          this.operateOnAllRange(start, endm1, operation, node.left, !node.left)
          this.operateOnAllRange(
            start,
            endm1,
            operation,
            node.right,
            !node.right
          )
          operation(node)
        } else {
          this.operateOnAllRange(start, endm1, operation, node.left, !node.left)
        }
      } else {
        this.operateOnAllRange(start, endm1, operation, node.right, !node.right)
      }
    }
  }
  operateOnAllGteq(
    value: S,
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(node.value.data, value)) {
        operation(node.value)
        this.operateOnAllGteq(
          value,
          operation,
          new MemberPtr(node.value, 'left')
        )
      }
      this.operateOnAllGteq(
        value,
        operation,
        new MemberPtr(node.value, 'right')
      )
    }
  }
  operateOnAllLteq(
    value: S,
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(value, node.value.data)) {
        operation(node.value)
        this.operateOnAllLteq(
          value,
          operation,
          new MemberPtr(node.value, 'right')
        )
      }
      this.operateOnAllLteq(value, operation, new MemberPtr(node.value, 'left'))
    }
  }

  operateOnAll(
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      this.operateOnAll(operation, new MemberPtr(node.value, 'left'))
      operation(node.value)
      this.operateOnAll(operation, new MemberPtr(node.value, 'right'))
    }
  }

  getRange(start: S, endm1: S): (BstNode<T> | undefined)[] {
    const nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllRange(start, endm1, (n) => nodes.push(n))

    return nodes
  }
  getGteq(value: S): (BstNode<T> | undefined)[] {
    let nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllGteq(value, (n) => {
      if (!nodes[0] || this.gtcmp(nodes[0].data, n.data)) {
        nodes = [n]
      } else if (this.eqcmp(nodes[0].data, n.data)) {
        nodes.push(n)
      }
    })

    return nodes
  }
  getLteq(value: S): (BstNode<T> | undefined)[] {
    let nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllLteq(value, (n) => {
      if (!nodes[0] || this.gtcmp(n.data, nodes[0].data)) {
        nodes = [n]
      } else if (this.eqcmp(nodes[0].data, n.data)) {
        nodes.push(n)
      }
    })

    return nodes
  }

  toString(): string {
    let str = 'BST [\n'
    this.operateOnAll(({ data }) => {
      str += '  ' + data.toString() + '\n'
    })
    str += ']'
    return str
  }
}

export { Bst, BstNode }
