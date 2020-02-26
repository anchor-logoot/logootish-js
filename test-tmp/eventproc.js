const {
  ListDocumentModel,
  LogootPosition,
  LogootInt,
  EventState
} = require('../dist/logootish-js.js')

const namespace = 'net.kb1rd.logootish-0'
const insert_event = namespace + '.ins'
const remove_event = namespace + '.rem'

const namespace_lg1 = 'net.kb1rd.logootish-1'

/**
 * A mapping of MXIDs and custom-branches (NYI) to symbols for the algo
 */
class MatrixSymbolTable {
  mxid_table = {}
  br_mxid_table = {}
  symbol_table = {}

  lookupById(mxid, branch) {
    if (this.branch) {
      if (!this.br_mxid_table[branch]) {
        this.br_mxid_table[branch] = {}
      }
      if (!this.br_mxid_table[branch][mxid]) {
        this.br_mxid_table[branch][mxid] = Symbol(`BRANCH/${branch}/${mxid}`)
        this.symbol_table[this.br_mxid_table[branch][mxid]] = { mxid, branch }
      }
      return this.br_mxid_table[branch][mxid]
    } else {
      if (!this.mxid_table[mxid]) {
        this.mxid_table[mxid] = Symbol(`BRANCH/${mxid}`)
        this.symbol_table[this.mxid_table[mxid]] = { mxid }
      }
      return this.mxid_table[mxid]
    }
  }

  lookupBySymbol(symbol) {
    return this.symbol_table[symbol]
  }
}

class InsertionEvent {
  state = EventState.PENDING
  constructor(body, start, rclk) {
    this.body = body
    this.start = start
    this.rclk = rclk
  }

  get end() {
    return this.start.offsetLowest(this.body.length)
  }

  toJSON() {
    return {
      start: this.start.toJSON(),
      rclk: this.rclk.toJSON(),
      body: this.body
    }
  }
}
InsertionEvent.JSON = {}
InsertionEvent.JSON.Schema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
    start: LogootPosition.JSON.Schema,
    rclk: LogootInt.JSON.Schema
  },
  required: ['body', 'start', 'rclk']
}

class RemovalEvent {
  state = EventState.PENDING
  constructor(removals, rclk) {
    this.removals = removals
    this.rclk = rclk
  }

  toJSON() {
    return {
      removals: this.removals.map(({ start, length }) => ({
        start: start.toJSON(),
        length
      })),
      rclk: this.rclk.toJSON()
    }
  }
}
RemovalEvent.JSON = {}
RemovalEvent.JSON.Schema = {
  type: 'object',
  properties: {
    removals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start: LogootPosition.JSON.Schema,
          length: { type: 'number' }
        },
        required: ['start', 'length']
      }
    },
    rclk: LogootInt.JSON.Schema
  },
  required: ['removals', 'rclk']
}

/**
 * Handles all event-defined behavior. This is the MITM that acts as the front
 * end for the algorithm. No other code calls functions on the algo.
 */
class EventAbstractionLayer {
  operation_listeners = []

  event_queue = []

  constructor(mxid) {
    this.sytbl = new MatrixSymbolTable()
    this.listdoc = new ListDocumentModel(this.sytbl.lookupById(mxid))
    this.operation_listeners.push((ops) => ops.forEach((op) => console.log('op', op)))
  }
  onOperation(fn) {
    this.operation_listeners.push(fn)
  }

  async sendEvent(event, send, tryMerge) {
    this.event_queue.push(event)

    const preExitCleanup = () => {
      event.state = EventState.COMPLETE
      this.event_queue.splice(this.event_queue.indexOf(event), 1)
    }

    try {
      let delay
      event.state = EventState.SENDING
      while ((delay = await send(event)) > 0) {
        event.state = EventState.PENDING

        for (let i = 0; i < this.event_queue.length; i++) {
          const ev = this.event_queue[i]
          if (tryMerge(event, ev)) {
            return
          }
        }

        await new Promise((resolve) => {
          setTimeout(resolve, delay)
        })
        event.state = EventState.SENDING
      }
    } finally {
      preExitCleanup()
    }
  }

  createInsertionEvent(pos, body, send) {
    const { start, rclk } = this.listdoc.insertLocal(pos, body.length)
    const event = new InsertionEvent(body, start, rclk)

    return this.sendEvent(event, send, (event, into) => {
      if (
        into !== event &&
        into instanceof InsertionEvent &&
        into.state === EventState.PENDING &&
        into.rclk.cmp(event.rclk) === 0
      ) {
        if (event.start.cmp(into.end) === 0) {
          debug.info('Merged insertion event to end of other')
          into.body += event.body
          return true
        } else if (event.end.cmp(into.start) === 0) {
          debug.info('Merged insertion event to start of other')
          into.body = event.body + into.body
          into.start = into.start.inverseOffsetLowest(event.body.length)
          return true
        }
      }
      return false
    })
  }
  createRemovalEvent(pos, len, send) {
    const { removals } = this.listdoc.removeLocal(pos, len)
    // Note: Technically, I shouldn't grab the lamport clock out of the list doc
    // like this, but this retains compatibility with older versions
    const event = new RemovalEvent(removals, this.listdoc.clock)

    return this.sendEvent(event, send, (event, into) => {
      if (
        into !== event &&
        into instanceof RemovalEvent &&
        into.state === EventState.PENDING &&
        into.rclk.cmp(event.rclk) === 0
      ) {
        debug.info('Merged removal events')
        into.removals.push(...event.removals)
        return true
      }
      return false
    })
  }

  processEvent({ id, type, content, sender }) {
    const operations = []
    let body
    if (type === insert_event) {
      const { rclk, start } = content
      const br = this.sytbl.lookupById(sender)
      body = content.body

      operations.push(
        ...this.listdoc.insertLogoot(
          br,
          LogootPosition.fromJSON(start),
          body.length,
          LogootInt.fromJSON(rclk)
        )
      )
    } else if (type === remove_event) {
      const { removals, rclk } = content
      const br = this.sytbl.lookupById(sender)

      removals.forEach(({ start, length }) => {
        console.log('REM', start, length)
        operations.push(
          ...this.listdoc.removeLogoot(
            br,
            LogootPosition.fromJSON(start),
            length,
            LogootInt.fromJSON(rclk)
          )
        )
        try {
          this.listdoc.selfTest()
        } catch (e) {
          console.log(this.listdoc.ldoc_bst.toString())
          throw e
        }
      })
    } else if (type === namespace_lg1) {
      // Coming soon ;)
      debug.warn('New event type. NYI')
    }

    if (operations.length) {
      // Fill in the text based on the offset and length returned by the algo
      operations.forEach((op) => {
        if (op.type === 'i') {
          if (!body) {
            throw new Error(
              'Algorithm returned insertion operation, but an insertion was not performed.'
            )
          }
          op.body = body.slice(op.offset, op.offset + op.length)
          delete op.offset
          delete op.length
        }
      })
      // Inform listeners of new operations
      this.operation_listeners.forEach((l) => l(operations))
    }
  }
}

module.exports = { EventAbstractionLayer }
