import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the postgres.js tagged-template `sql` ─────────────────────────────
// Each `sql\`...\`` call in trace-engine.ts consumes the next queued response
// in the order the engine issues them. Tests push responses onto the queue
// before invoking the engine.

type Row = Record<string, unknown>
let sqlResponses: Row[][] = []
let sqlCallCount = 0

vi.mock('../../lib/sql.js', () => ({
  sql: (..._args: unknown[]) => {
    const next = sqlResponses[sqlCallCount++] ?? []
    return Promise.resolve(next)
  },
}))

import { traceCanonicalField } from './trace-engine.js'

const FIELD_ROW = {
  id: 'cf-1',
  name: 'email',
  displayName: 'Email',
  dataType: 'STRING',
  entityId: 'ent-1',
  entityName: 'Customer',
}

function queue(...responses: Row[][]) {
  sqlResponses = responses
  sqlCallCount = 0
}

beforeEach(() => {
  sqlResponses = []
  sqlCallCount = 0
})

describe('traceCanonicalField', () => {
  it('returns null when the canonical field does not exist', async () => {
    queue([]) // fieldRows empty
    const result = await traceCanonicalField('ws-1', 'missing')
    expect(result).toBeNull()
  })

  it('returns a result with grouped system mappings when the field exists', async () => {
    queue(
      [FIELD_ROW],
      [
        {
          id: 'm-1',
          systemFieldId: 'sf-1',
          deprecated: false,
          systemFieldName: 'email_addr',
          systemFieldPath: '$.email',
          systemEntityId: 'se-1',
          systemFieldDataType: 'string',
          systemEntityName: 'Account',
          systemId: 's-sf',
          systemName: 'Salesforce',
          systemType: 'REST',
          ruleType: 'RENAME',
        },
      ],
      [], // chainRows
      [], // interfaceRows
      [], // ifFieldRows
    )

    const result = await traceCanonicalField('ws-1', 'cf-1')
    expect(result).not.toBeNull()
    expect(result!.canonicalField.name).toBe('email')
    expect(result!.systems).toHaveLength(1)
    expect(result!.systems[0].systemName).toBe('Salesforce')
    expect(result!.systems[0].mappings[0].transformationRule).toEqual({ type: 'RENAME' })
    expect(result!.propagationChains).toEqual([])
    expect(result!.interfaces).toEqual([])
    expect(result!.conflicts).toEqual([])
  })

  it('flags a TYPE_CONFLICT when two systems map incompatible data types', async () => {
    queue(
      [FIELD_ROW],
      [
        {
          id: 'm-1', systemFieldId: 'sf-1', deprecated: false,
          systemFieldName: 'email_addr', systemFieldPath: null,
          systemEntityId: 'se-1', systemFieldDataType: 'string',
          systemEntityName: 'Account', systemId: 's-sf',
          systemName: 'Salesforce', systemType: 'REST', ruleType: null,
        },
        {
          id: 'm-2', systemFieldId: 'sf-2', deprecated: false,
          systemFieldName: 'Email', systemFieldPath: null,
          systemEntityId: 'se-2', systemFieldDataType: 'integer',
          systemEntityName: 'Contact', systemId: 's-hs',
          systemName: 'HubSpot', systemType: 'REST', ruleType: null,
        },
      ],
      [], [], [],
    )

    const result = await traceCanonicalField('ws-1', 'cf-1')
    expect(result!.conflicts).toHaveLength(1)
    expect(result!.conflicts[0].type).toBe('TYPE_CONFLICT')
    const systemNames = result!.conflicts[0].systems.map((s) => s.systemName).sort()
    expect(systemNames).toEqual(['HubSpot', 'Salesforce'])
  })

  it('does not flag a conflict when both systems agree on the data type', async () => {
    queue(
      [FIELD_ROW],
      [
        {
          id: 'm-1', systemFieldId: 'sf-1', deprecated: false,
          systemFieldName: 'a', systemFieldPath: null,
          systemEntityId: 'se-1', systemFieldDataType: 'string',
          systemEntityName: 'A', systemId: 's-1',
          systemName: 'One', systemType: 'REST', ruleType: null,
        },
        {
          id: 'm-2', systemFieldId: 'sf-2', deprecated: false,
          systemFieldName: 'b', systemFieldPath: null,
          systemEntityId: 'se-2', systemFieldDataType: 'string',
          systemEntityName: 'B', systemId: 's-2',
          systemName: 'Two', systemType: 'REST', ruleType: null,
        },
      ],
      [], [], [],
    )

    const result = await traceCanonicalField('ws-1', 'cf-1')
    expect(result!.conflicts).toEqual([])
  })

  it('includes propagation chains with their ordered steps', async () => {
    queue(
      [FIELD_ROW],
      [], // no system mappings
      [
        { id: 'chain-1', name: 'Customer chain', systemId: 's-1', systemName: 'Salesforce' },
      ],
      [
        // chain-1 steps (loaded inside the chain map)
        {
          id: 'step-1', position: 0, stepType: 'CONVERSION',
          systemFieldId: 'sf-1', notes: null,
          systemFieldName: 'lead_email', entityId: 'se-1', entityName: 'Lead',
        },
        {
          id: 'step-2', position: 1, stepType: 'LOOKUP',
          systemFieldId: 'sf-2', notes: null,
          systemFieldName: 'contact_email', entityId: 'se-2', entityName: 'Contact',
        },
      ],
      [], // interfaceRows
      [], // ifFieldRows
    )

    const result = await traceCanonicalField('ws-1', 'cf-1')
    expect(result!.propagationChains).toHaveLength(1)
    expect(result!.propagationChains[0].steps).toHaveLength(2)
    expect(result!.propagationChains[0].steps[0].systemFieldName).toBe('lead_email')
    expect(result!.propagationChains[0].steps[1].stepType).toBe('LOOKUP')
  })

  it('includes interfaces with their field status', async () => {
    queue(
      [FIELD_ROW],
      [],
      [], // chainRows
      [
        {
          id: 'iface-1', name: 'Customer Sync', direction: 'REQUEST_RESPONSE',
          sourceSystemId: 's-1', sourceSystemName: 'Salesforce',
          targetSystemId: 's-2', targetSystemName: 'HubSpot',
        },
      ],
      [
        { interfaceId: 'iface-1', status: 'MANDATORY' },
      ],
    )

    const result = await traceCanonicalField('ws-1', 'cf-1')
    expect(result!.interfaces).toHaveLength(1)
    expect(result!.interfaces[0].status).toBe('MANDATORY')
  })
})
