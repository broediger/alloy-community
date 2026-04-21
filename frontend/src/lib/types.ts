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

export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER'

// ─────────────────────────────────────────────
// Auth / users / sharing
// ─────────────────────────────────────────────

export interface MeResponse {
  id: string
  externalId: string
  email: string
  displayName: string | null
}

export interface MyWorkspaceItem {
  id: string
  name: string
  slug: string
  settings: unknown
  role: MemberRole
  createdAt: string
  updatedAt: string
}

export interface MemberListItem {
  userId: string
  email: string
  displayName: string | null
  role: MemberRole
  joinedAt: string
}

export interface InvitationListItem {
  id: string
  workspaceId: string
  email: string
  role: MemberRole
  token?: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
  invitedBy?: { email: string; displayName: string | null }
}

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

export type FieldCardinality = 'ONE' | 'MANY'

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
  referencedEntityId: string | null
  cardinality: FieldCardinality | null
  itemsDataType: DataType | null
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
  referencedEntityId?: string
  cardinality?: FieldCardinality
  itemsDataType?: DataType
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
  referencedEntityId?: string | null
  cardinality?: FieldCardinality | null
  itemsDataType?: DataType | null
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
  systemEntityId: string | null
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
  systemEntity?: {
    id: string
    name: string
    systemId: string
    system?: { id: string; name: string }
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
  systemEntityId?: string
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
  canonicalField?: {
    id: string
    name: string
    displayName: string
    dataType: string
    referencedEntityId?: string | null
    cardinality?: FieldCardinality | null
    itemsDataType?: DataType | null
    isComposite?: boolean
  } | null
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
  children?: InterfaceFieldResolved[]
  virtual?: boolean
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
  direction?: InterfaceDirection
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
// Interface Versioning
// ─────────────────────────────────────────────

export type InterfaceVersionStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'

export interface InterfaceVersionListItem {
  id: string
  workspaceId: string
  interfaceId: string
  label: string
  description: string | null
  status: InterfaceVersionStatus
  createdAt: string
  createdBy: string | null
  fieldCount: number
}

export interface InterfaceVersionDetail {
  id: string
  workspaceId: string
  interfaceId: string
  label: string
  description: string | null
  status: InterfaceVersionStatus
  createdAt: string
  createdBy: string | null
  snapshot: unknown
}

export interface InterfaceVersionDiff {
  fields: {
    added: Array<{ fieldId: string; name: string; status: string; canonicalFieldId: string | null }>
    removed: Array<{ fieldId: string; name: string; status: string; canonicalFieldId: string | null }>
    changed: Array<{ fieldId: string; name: string; changes: Record<string, { before: unknown; after: unknown }> }>
  }
  entityBindings: {
    added: Array<{ entityId: string; entityName: string; side: string }>
    removed: Array<{ entityId: string; entityName: string; side: string }>
  }
  metadata: Record<string, { before: unknown; after: unknown }>
}

export interface CutInterfaceVersionInput {
  label: string
  description?: string
  createdBy?: string
}

export interface UpdateInterfaceVersionStatusInput {
  status: 'PUBLISHED' | 'DEPRECATED'
}

// ─────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────

export interface ChatPendingAction {
  tool: 'create_github_issue'
  args: { title: string; body: string; type: 'bug' | 'feature' }
}

export interface ChatMessageResult {
  threadId: string
  reply: string
  pendingAction?: ChatPendingAction
}

export interface AgentSuggestion {
  kind: 'entity' | 'field' | 'mapping' | 'rule'
  rationale: string
  confidence: number
  data: Record<string, unknown>
}

export interface HelperRunResult {
  suggestions: AgentSuggestion[]
  rationale: string
}

// ─────────────────────────────────────────────
// Excel Import
// ─────────────────────────────────────────────

export interface ExcelImportResult {
  created: number
  updated: number
  unchanged: number
  warnings: Array<{ row: number; field: string; message: string }>
  errors: Array<{ row: number; field: string; message: string }>
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
