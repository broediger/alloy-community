// ─────────────────────────────────────────────
// Enums matching Prisma schema
// ─────────────────────────────────────────────

export type DataType =
  | 'STRING'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'ENUM'
  | 'OBJECT'
  | 'ARRAY'

export type SystemType = 'REST' | 'SOAP' | 'EVENT' | 'FLAT_FILE' | 'OTHER'

export type RelationshipType = 'LOOKUP' | 'PARENT' | 'ONE_TO_MANY' | 'MANY_TO_MANY'

export type TransformationRuleType =
  | 'RENAME'
  | 'TYPE_CAST'
  | 'VALUE_MAP'
  | 'CONDITIONAL'
  | 'FORMULA'
  | 'COMPOSE'
  | 'DECOMPOSE'

export type PropagationStepType = 'CONVERSION' | 'LOOKUP'

export type InterfaceDirection = 'REQUEST_RESPONSE' | 'EVENT'

export type InterfaceFieldStatus = 'MANDATORY' | 'OPTIONAL' | 'EXCLUDED'

// ─────────────────────────────────────────────
// API response wrappers
// ─────────────────────────────────────────────

export interface ListResponse<T> {
  items: T[]
  total: number
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: Array<{ type?: string; count?: number; field?: string; message?: string }>
  }
}

// ─────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceListItem extends Workspace {
  canonicalFieldCount: number
  systemCount: number
  interfaceCount: number
}

export interface CreateWorkspaceInput {
  name: string
  slug: string
}

export interface UpdateWorkspaceInput {
  name?: string
  slug?: string
  settings?: Record<string, unknown>
}

// ─────────────────────────────────────────────
// Canonical Entity
// ─────────────────────────────────────────────

export interface CanonicalEntity {
  id: string
  workspaceId: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CanonicalEntityListItem extends CanonicalEntity {
  fieldCount: number
  mappedFieldCount: number
}

export interface CreateCanonicalEntityInput {
  name: string
  slug: string
  description?: string
}

export interface UpdateCanonicalEntityInput {
  name?: string
  slug?: string
  description?: string
}

// ─────────────────────────────────────────────
// Canonical Field
// ─────────────────────────────────────────────

export interface CanonicalField {
  id: string
  workspaceId: string
  entityId: string
  name: string
  displayName: string
  description: string | null
  dataType: DataType
  format: string | null
  nullable: boolean
  minValue: string | null
  maxValue: string | null
  isComposite: boolean
  compositionPattern: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CanonicalFieldListItem extends CanonicalField {
  mappingCount: number
}

export interface CanonicalFieldDetail extends CanonicalField {
  mappingCount: number
  subfields: CanonicalSubfield[]
  examples: CanonicalFieldExample[]
  enumValues: CanonicalEnumValue[]
}

export interface CreateCanonicalFieldInput {
  entityId: string
  name: string
  displayName: string
  description?: string
  dataType: DataType
  format?: string
  nullable?: boolean
  minValue?: string
  maxValue?: string
  isComposite?: boolean
  compositionPattern?: string
  tags?: string[]
}

export interface UpdateCanonicalFieldInput {
  name?: string
  displayName?: string
  description?: string
  dataType?: DataType
  format?: string
  nullable?: boolean
  minValue?: string
  maxValue?: string
  isComposite?: boolean
  compositionPattern?: string
  tags?: string[]
}

export interface CanonicalFieldFilters {
  entityId?: string
  dataType?: DataType
  tags?: string
  mapped?: string
  search?: string
}

// ─────────────────────────────────────────────
// Canonical Subfield
// ─────────────────────────────────────────────

export interface CanonicalSubfield {
  id: string
  workspaceId: string
  parentFieldId: string
  name: string
  displayName: string
  description: string | null
  dataType: DataType
  format: string | null
  nullable: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateCanonicalSubfieldInput {
  name: string
  displayName: string
  description?: string
  dataType: DataType
  format?: string
  nullable?: boolean
}

export interface UpdateCanonicalSubfieldInput {
  name?: string
  displayName?: string
  description?: string
  dataType?: DataType
  format?: string
  nullable?: boolean
}

// ─────────────────────────────────────────────
// Canonical Field Example
// ─────────────────────────────────────────────

export interface CanonicalFieldExample {
  id: string
  canonicalFieldId: string
  value: string
  createdAt: string
}

// ─────────────────────────────────────────────
// Canonical Enum Value
// ─────────────────────────────────────────────

export interface CanonicalEnumValue {
  id: string
  canonicalFieldId: string
  code: string
  label: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateCanonicalEnumValueInput {
  code: string
  label: string
}

export interface UpdateCanonicalEnumValueInput {
  code?: string
  label?: string
}

// ─────────────────────────────────────────────
// System
// ─────────────────────────────────────────────

export interface SystemRecord {
  id: string
  workspaceId: string
  name: string
  description: string | null
  systemType: SystemType
  baseUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SystemListItem extends SystemRecord {
  canonicalFieldCount: number
  mappedFieldCount: number
}

export interface SystemDetail extends SystemRecord {
  entities: SystemEntitySummary[]
}

export interface SystemEntitySummary {
  id: string
  name: string
  slug: string
  fieldCount: number
  mappedFieldCount: number
}

export interface CreateSystemInput {
  name: string
  description?: string
  systemType: SystemType
  baseUrl?: string
  notes?: string
}

export interface UpdateSystemInput {
  name?: string
  description?: string
  systemType?: SystemType
  baseUrl?: string
  notes?: string
}

// ─────────────────────────────────────────────
// System Entity
// ─────────────────────────────────────────────

export interface SystemEntity {
  id: string
  workspaceId: string
  systemId: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface SystemEntityListItem extends SystemEntity {
  fieldCount: number
  mappedFieldCount: number
}

export interface SystemEntityDetail extends SystemEntity {
  fields: SystemFieldWithMapping[]
}

export interface CreateSystemEntityInput {
  name: string
  slug: string
  description?: string
}

export interface UpdateSystemEntityInput {
  name?: string
  slug?: string
  description?: string
}

// ─────────────────────────────────────────────
// System Field
// ─────────────────────────────────────────────

export interface SystemField {
  id: string
  workspaceId: string
  entityId: string
  name: string
  path: string | null
  dataType: string
  format: string | null
  nullable: boolean
  required: boolean
  createdAt: string
  updatedAt: string
}

export interface SystemFieldWithMapping extends SystemField {
  mappedTo: { canonicalFieldId: string; canonicalFieldName: string } | null
}

export interface SystemFieldDetail extends SystemField {
  mapping: {
    id: string
    canonicalFieldId: string
    canonicalFieldName: string
    deprecated: boolean
    transformationRule: { type: TransformationRuleType } | null
  } | null
}

export interface CreateSystemFieldInput {
  entityId: string
  name: string
  path?: string
  dataType: string
  format?: string
  nullable?: boolean
  required?: boolean
}

export interface UpdateSystemFieldInput {
  name?: string
  path?: string
  dataType?: string
  format?: string
  nullable?: boolean
  required?: boolean
}

export interface SystemFieldFilters {
  entityId?: string
  systemId?: string
  mapped?: string
  search?: string
}

// ─────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────

export interface Mapping {
  id: string
  workspaceId: string
  canonicalFieldId: string | null
  canonicalSubfieldId: string | null
  systemFieldId: string | null
  notes: string | null
  deprecated: boolean
  createdAt: string
  updatedAt: string
  systemField?: {
    id: string
    name: string
    entityId: string
    entity?: {
      id: string
      name: string
      systemId: string
      system?: { id: string; name: string }
    }
  } | null
  transformationRule?: TransformationRule | null
}

export interface MappingDetail extends Mapping {
  transformationRule: TransformationRule | null
}

export interface CreateMappingInput {
  canonicalFieldId?: string
  canonicalSubfieldId?: string
  systemFieldId?: string
  ruleType?: TransformationRuleType
  notes?: string
}

export interface UpdateMappingInput {
  notes?: string
  deprecated?: boolean
}

export interface MappingFilters {
  canonicalFieldId?: string
  systemId?: string
  entityId?: string
  deprecated?: string
}

// ─────────────────────────────────────────────
// Transformation Rule
// ─────────────────────────────────────────────

export interface TransformationRule {
  id: string
  mappingId: string
  type: TransformationRuleType
  config: Record<string, unknown> | null
  valueMapEntries?: ValueMapEntry[]
  composeRuleFields?: ComposeRuleField[]
  decomposeRuleFields?: DecomposeRuleField[]
  createdAt: string
  updatedAt: string
}

export interface ValueMapEntry {
  id: string
  ruleId: string
  fromValue: string
  toValue: string
  bidirectional: boolean
  createdAt: string
  updatedAt: string
}

export interface ComposeRuleField {
  id: string
  ruleId: string
  systemFieldId: string
  subfieldId: string
  position: number
  createdAt: string
}

export interface DecomposeRuleField {
  id: string
  ruleId: string
  subfieldId: string
  systemFieldId: string
  position: number
  createdAt: string
}

export interface PutTransformationRuleInput {
  type: TransformationRuleType
  config?: Record<string, unknown>
  entries?: Array<{ fromValue: string; toValue: string; bidirectional?: boolean }>
  fields?: Array<{ systemFieldId: string; subfieldId: string; position: number }>
}

// ─────────────────────────────────────────────
// Propagation Chain
// ─────────────────────────────────────────────

export interface PropagationChain {
  id: string
  workspaceId: string
  canonicalFieldId: string
  systemId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface PropagationChainDetail extends PropagationChain {
  steps: PropagationChainStep[]
}

export interface PropagationChainStep {
  id: string
  chainId: string
  systemFieldId: string
  position: number
  stepType: PropagationStepType
  notes: string | null
  createdAt: string
  updatedAt: string
  systemFieldName?: string
  entityName?: string
}

export interface CreatePropagationChainInput {
  canonicalFieldId: string
  systemId: string
  name: string
  description?: string
}

export interface CreatePropagationChainStepInput {
  systemFieldId: string
  stepType: PropagationStepType
  notes?: string
}

// ─────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────

export interface InterfaceRecord {
  id: string
  workspaceId: string
  name: string
  description: string | null
  sourceSystemId: string
  targetSystemId: string
  direction: InterfaceDirection
  createdAt: string
  updatedAt: string
}

export interface InterfaceListItem extends InterfaceRecord {
  sourceSystem?: { id: string; name: string }
  targetSystem?: { id: string; name: string }
  sourceEntities: Array<{ id: string; name: string }>
  targetEntities: Array<{ id: string; name: string }>
}

export interface InterfaceDetail extends InterfaceRecord {
  sourceSystem?: { id: string; name: string }
  targetSystem?: { id: string; name: string }
  sourceEntities: Array<{ id: string; name: string }>
  targetEntities: Array<{ id: string; name: string }>
  fields: InterfaceFieldResolved[]
}

export interface InterfaceFieldResolved {
  id: string
  interfaceId: string
  canonicalFieldId: string | null
  canonicalField?: { id: string; name: string; displayName: string; dataType: string } | null
  // Inline metadata for unlinked fields
  name: string | null
  displayName: string | null
  dataType: DataType | null
  description: string | null
  nullable: boolean
  maxLength: number | null
  status: InterfaceFieldStatus
  sourceMapping: {
    systemFieldId: string
    systemFieldName: string
    systemFieldPath: string | null
    entityName: string | null
    deprecated: boolean
    transformationRule: {
      type: TransformationRuleType
      config: Record<string, unknown> | null
      valueMapEntries: Array<{ fromValue: string; toValue: string; bidirectional: boolean }>
      composeRuleFields: Array<{ systemFieldId: string; subfieldId: string; position: number }>
      decomposeRuleFields: Array<{ subfieldId: string; systemFieldId: string; position: number }>
    } | null
  } | null
  targetMapping: {
    systemFieldId: string
    systemFieldName: string
    systemFieldPath: string | null
    entityName: string | null
    deprecated: boolean
    transformationRule: {
      type: TransformationRuleType
      config: Record<string, unknown> | null
      valueMapEntries: Array<{ fromValue: string; toValue: string; bidirectional: boolean }>
      composeRuleFields: Array<{ systemFieldId: string; subfieldId: string; position: number }>
      decomposeRuleFields: Array<{ subfieldId: string; systemFieldId: string; position: number }>
    } | null
  } | null
  createdAt: string
  updatedAt: string
}

export interface CreateInterfaceInput {
  name: string
  description?: string
  sourceSystemId: string
  targetSystemId: string
  sourceEntityIds?: string[]
  targetEntityIds?: string[]
  direction: InterfaceDirection
}

export interface UpdateInterfaceInput {
  name?: string
  description?: string
  sourceEntityIds?: string[]
  targetEntityIds?: string[]
}

export interface CreateInterfaceFieldInput {
  canonicalFieldId?: string
  name?: string
  displayName?: string
  dataType?: DataType
  description?: string
  nullable?: boolean
  maxLength?: number
  status?: InterfaceFieldStatus
}

export interface UpdateInterfaceFieldInput {
  status?: InterfaceFieldStatus
  name?: string
  displayName?: string
  dataType?: DataType
  description?: string
  nullable?: boolean
  maxLength?: number | null
}

// ─────────────────────────────────────────────
// Trace
// ─────────────────────────────────────────────

export interface TraceResponse {
  canonicalField: {
    id: string
    name: string
    displayName: string
    dataType: DataType
    entityId: string
    entityName: string
  }
  systems: TraceSystem[]
  interfaces: TraceInterface[]
  propagationChains: TracePropagationChain[]
  conflicts: TraceConflict[]
}

export interface TraceSystem {
  systemId: string
  systemName: string
  systemType: SystemType
  mappings: TraceMapping[]
}

export interface TraceMapping {
  mappingId: string
  systemFieldId: string | null
  systemFieldName: string | null
  systemFieldPath: string | null
  entityId: string
  entityName: string
  dataType: string | null
  deprecated: boolean
  transformationRule: { type: TransformationRuleType } | null
}

export interface TraceInterface {
  interfaceId: string
  interfaceName: string
  sourceSystemId: string
  sourceSystemName: string
  targetSystemId: string
  targetSystemName: string
  status: InterfaceFieldStatus
}

export interface TracePropagationChain {
  chainId: string
  chainName: string
  systemId: string
  systemName: string
  steps: TracePropagationStep[]
}

export interface TracePropagationStep {
  stepId: string
  systemFieldId: string
  systemFieldName: string
  entityName: string
  position: number
  stepType: PropagationStepType
}

export interface TraceConflict {
  type: string
  description: string
  systems: Array<{
    systemId: string
    systemName: string
    dataType: string
  }>
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

export interface ExportOpenApiInput {
  systemId: string
  format: 'yaml' | 'json'
  includeEntityIds?: string[]
}

export interface ExportJsonSchemaInput {
  scope: 'entity' | 'interface'
  scopeId: string
  format: 'json'
}
