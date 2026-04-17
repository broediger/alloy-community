/**
 * Seed script: CRM2ISU - GP_Erstellung (Business Partner Creation)
 *
 * Populates the Interface Manager with the example interface contract
 * from examples/CRM2ISU - GP_Erstellung - InterfaceContract_Version1.3.xlsx
 *
 * Run: npx -w backend tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Workspace ──────────────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      name: 'EVN CRM-ISU Integration',
      slug: 'evn-crm-isu',
      settings: {
        description: 'Integration workspace for Dynamics 365 CRM ↔ SAP ISU interfaces',
        version: '1.8',
      },
    },
  });
  const ws = workspace.id;
  console.log(`Created workspace: ${workspace.name} (${ws})`);

  // ── Canonical Entity ───────────────────────────────────
  const entity = await prisma.canonicalEntity.create({
    data: {
      workspaceId: ws,
      name: 'Geschaeftspartner',
      slug: 'geschaeftspartner',
      description:
        'Business Partner — canonical representation covering both natural persons and organisations',
    },
  });
  console.log(`Created canonical entity: ${entity.name}`);

  // ── Helper: create canonical field ─────────────────────
  type FieldDef = {
    name: string;
    displayName: string;
    description?: string;
    dataType: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'ENUM' | 'OBJECT' | 'ARRAY';
    format?: string;
    nullable?: boolean;
    maxValue?: string;
    tags: string[];
  };

  async function createField(def: FieldDef) {
    return prisma.canonicalField.create({
      data: {
        workspaceId: ws,
        entityId: entity.id,
        name: def.name,
        displayName: def.displayName,
        description: def.description,
        dataType: def.dataType,
        format: def.format,
        nullable: def.nullable ?? true,
        maxValue: def.maxValue,
        tags: def.tags,
      },
    });
  }

  // ── Canonical Fields ───────────────────────────────────
  // Meta section
  const fCrmGuid = await createField({
    name: 'crmGuid',
    displayName: 'CRM GUID',
    description: 'Unique identifier from CRM system',
    dataType: 'STRING',
    format: 'uuid',
    maxValue: '36',
    tags: ['meta', 'person', 'organisation'],
  });

  const fGeschaeftspartnertyp = await createField({
    name: 'geschaeftspartnertyp',
    displayName: 'Geschäftspartnertyp',
    description: 'Business partner category (1=Person, 2=Organisation)',
    dataType: 'ENUM',
    nullable: false,
    maxValue: '1',
    tags: ['meta', 'person', 'organisation'],
  });

  const fNatuerlichePerson = await createField({
    name: 'natuerlichePerson',
    displayName: 'Natürliche Person',
    description: 'Whether the partner is a natural person',
    dataType: 'BOOLEAN',
    tags: ['meta', 'person', 'organisation'],
  });

  const fGeschaeftspartnerart = await createField({
    name: 'geschaeftspartnerart',
    displayName: 'Geschäftspartnerart',
    description: 'Business partner type (HH, GEW, IND, etc.)',
    dataType: 'ENUM',
    nullable: false,
    maxValue: '4',
    tags: ['meta', 'person', 'organisation'],
  });

  const fBerechtigungsgruppe = await createField({
    name: 'berechtigungsgruppe',
    displayName: 'Berechtigungsgruppe',
    description: 'Authorization group',
    dataType: 'ENUM',
    nullable: false,
    maxValue: '4',
    tags: ['meta', 'person', 'organisation'],
  });

  const fInsolvenz = await createField({
    name: 'insolvenz',
    displayName: 'Insolvenz',
    description: 'Whether the business partner is bankrupt',
    dataType: 'BOOLEAN',
    tags: ['meta', 'person', 'organisation'],
  });

  const fKlassifikation = await createField({
    name: 'klassifikation',
    displayName: 'Klassifikation',
    description: 'Classification code',
    dataType: 'ENUM',
    maxValue: '4',
    tags: ['meta', 'person', 'organisation'],
  });

  // Namen section
  const fAnrede = await createField({
    name: 'anrede',
    displayName: 'Anrede',
    description: 'Form of address (Herr, Frau, Firma, Divers)',
    dataType: 'ENUM',
    maxValue: '4',
    tags: ['namen', 'person', 'organisation'],
  });

  const fTitelvor = await createField({
    name: 'titelvor',
    displayName: 'Titel vor dem Namen',
    description: 'Academic title before name (e.g. Dr.)',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'person'],
  });

  const fTitelnach = await createField({
    name: 'titelnach',
    displayName: 'Titel nach dem Namen',
    description: 'Academic title after name (e.g. BA, MSc)',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'person'],
  });

  const fVorname = await createField({
    name: 'vorname',
    displayName: 'Vorname',
    description: 'First name',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'person'],
  });

  const fNachname = await createField({
    name: 'nachname',
    displayName: 'Nachname',
    description: 'Last name',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'person'],
  });

  const fName1 = await createField({
    name: 'name1',
    displayName: 'Name 1',
    description: 'Organisation name line 1',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'organisation'],
  });

  const fName2 = await createField({
    name: 'name2',
    displayName: 'Name 2',
    description: 'Organisation name line 2',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'organisation'],
  });

  const fName3 = await createField({
    name: 'name3',
    displayName: 'Name 3',
    description: 'Organisation name line 3',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'organisation'],
  });

  const fName4 = await createField({
    name: 'name4',
    displayName: 'Name 4',
    description: 'Organisation name line 4',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['namen', 'organisation'],
  });

  // Adresse section
  const fStrasse = await createField({
    name: 'strasse',
    displayName: 'Straße',
    description: 'Street name',
    dataType: 'STRING',
    nullable: false,
    maxValue: '35',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fHausnummer = await createField({
    name: 'hausnummer',
    displayName: 'Hausnummer',
    description: 'House number',
    dataType: 'STRING',
    maxValue: '10',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fHausnummerergaenzung = await createField({
    name: 'hausnummerergaenzung',
    displayName: 'Hausnummerergänzung',
    description: 'House number supplement',
    dataType: 'STRING',
    maxValue: '10',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fPostleitzahl = await createField({
    name: 'postleitzahl',
    displayName: 'Postleitzahl',
    description: 'Postal code',
    dataType: 'STRING',
    nullable: false,
    maxValue: '10',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fOrt = await createField({
    name: 'ort',
    displayName: 'Ort',
    description: 'City',
    dataType: 'STRING',
    nullable: false,
    maxValue: '35',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fOrtsteil = await createField({
    name: 'ortsteil',
    displayName: 'Ortsteil',
    description: 'District / home city name',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fRegion = await createField({
    name: 'region',
    displayName: 'Region',
    description: 'Region code',
    dataType: 'STRING',
    maxValue: '3',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fRegionalstrukturgruppe = await createField({
    name: 'regionalstrukturgruppe',
    displayName: 'Regionalstrukturgruppe',
    description: 'Regional structure group',
    dataType: 'STRING',
    maxValue: '8',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fLand = await createField({
    name: 'land',
    displayName: 'Land',
    description: 'Country code (ISO 3166)',
    dataType: 'STRING',
    nullable: false,
    maxValue: '3',
    tags: ['adresse', 'person', 'organisation'],
  });

  const fAdresseVerwendung = await createField({
    name: 'adresseVerwendung',
    displayName: 'Adresse Verwendung',
    description: 'Address usage type (always XXDEFAULT)',
    dataType: 'STRING',
    nullable: false,
    tags: ['adresse', 'person', 'organisation'],
  });

  // Postfach section
  const fPostfachOrt = await createField({
    name: 'postfachOrt',
    displayName: 'Postfach Ort',
    description: 'PO Box city name',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['postfach', 'person', 'organisation'],
  });

  const fPlzPostfach = await createField({
    name: 'plzPostfach',
    displayName: 'PLZ Postfach',
    description: 'PO Box postal code',
    dataType: 'STRING',
    maxValue: '10',
    tags: ['postfach', 'person', 'organisation'],
  });

  const fPostfach = await createField({
    name: 'postfach',
    displayName: 'Postfach',
    description: 'PO Box number',
    dataType: 'STRING',
    maxValue: '10',
    tags: ['postfach', 'person', 'organisation'],
  });

  const fLandDesPostfachs = await createField({
    name: 'landDesPostfachs',
    displayName: 'Land des Postfachs',
    description: 'PO Box country',
    dataType: 'STRING',
    maxValue: '3',
    tags: ['postfach', 'person', 'organisation'],
  });

  const fRegionDesPostfachs = await createField({
    name: 'regionDesPostfachs',
    displayName: 'Region des Postfachs',
    description: 'PO Box region',
    dataType: 'STRING',
    maxValue: '3',
    tags: ['postfach', 'person', 'organisation'],
  });

  // Communication section
  const fEmail = await createField({
    name: 'email',
    displayName: 'E-Mail',
    description: 'Email address',
    dataType: 'STRING',
    format: 'email',
    tags: ['communication', 'person', 'organisation'],
  });

  const fPhoneNumber = await createField({
    name: 'phoneNumber',
    displayName: 'Telefonnummer',
    description: 'Phone number',
    dataType: 'STRING',
    format: 'phone',
    tags: ['communication', 'person', 'organisation'],
  });

  const fMobileNumber = await createField({
    name: 'mobileNumber',
    displayName: 'Mobiltelefonnummer',
    description: 'Mobile phone number',
    dataType: 'STRING',
    format: 'phone',
    tags: ['communication', 'person', 'organisation'],
  });

  // Identifikationsmerkmale section
  const fIdentifikationsart = await createField({
    name: 'identifikationsart',
    displayName: 'Identifikationsart',
    description: 'Identification type',
    dataType: 'ENUM',
    maxValue: '6',
    tags: ['identifikation', 'person', 'organisation'],
  });

  const fIdentifikationsnummer = await createField({
    name: 'identifikationsnummer',
    displayName: 'Identifikationsnummer',
    description: 'Identification number',
    dataType: 'STRING',
    maxValue: '60',
    tags: ['identifikation', 'person', 'organisation'],
  });

  const fCompanyRegistrationNumber = await createField({
    name: 'companyRegistrationNumber',
    displayName: 'Firmenbuchnummer',
    description: 'Company registration number',
    dataType: 'STRING',
    tags: ['identifikation', 'organisation'],
  });

  const fSteuernummerntyp = await createField({
    name: 'steuernummerntyp',
    displayName: 'Steuernummerntyp',
    description: 'Tax number type (e.g. AT0)',
    dataType: 'STRING',
    maxValue: '4',
    tags: ['identifikation', 'person', 'organisation'],
  });

  const fUid = await createField({
    name: 'uid',
    displayName: 'UID-Nummer',
    description: 'VAT identification number',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['identifikation', 'person', 'organisation'],
  });

  const fGeburtsdatum = await createField({
    name: 'geburtsdatum',
    displayName: 'Geburtsdatum',
    description: 'Date of birth',
    dataType: 'DATE',
    nullable: false,
    tags: ['identifikation', 'person'],
  });

  const fGruendungsdatum = await createField({
    name: 'gruendungsdatum',
    displayName: 'Gründungsdatum',
    description: 'Organisation foundation date',
    dataType: 'DATE',
    tags: ['identifikation', 'organisation'],
  });

  const fBranche = await createField({
    name: 'branche',
    displayName: 'Branche',
    description: 'Industry sector',
    dataType: 'STRING',
    maxValue: '10',
    tags: ['identifikation', 'organisation'],
  });

  const fBranchensystem = await createField({
    name: 'branchensystem',
    displayName: 'Branchensystem',
    description: 'Industry system type (Z001 = ÖNACE)',
    dataType: 'STRING',
    maxValue: '4',
    tags: ['identifikation', 'organisation'],
  });

  // Bank section
  const fBankkontoId = await createField({
    name: 'bankkontoId',
    displayName: 'Bankkonto ID',
    description: 'Bank account identification number',
    dataType: 'STRING',
    maxValue: '4',
    tags: ['bank', 'person', 'organisation'],
  });

  const fLaenderRegionenschluesselBank = await createField({
    name: 'laenderRegionenschluesselBank',
    displayName: 'Länder-/Regionenschlüssel der Bank',
    description: 'Bank country/region key',
    dataType: 'STRING',
    maxValue: '3',
    tags: ['bank', 'person', 'organisation'],
  });

  const fBankschluessel = await createField({
    name: 'bankschluessel',
    displayName: 'Bankschlüssel',
    description: 'Bank number / sort code (BLZ)',
    dataType: 'STRING',
    maxValue: '15',
    tags: ['bank', 'person', 'organisation'],
  });

  const fKontoinhaber = await createField({
    name: 'kontoinhaber',
    displayName: 'Kontoinhaber',
    description: 'Bank account holder name',
    dataType: 'STRING',
    maxValue: '60',
    tags: ['bank', 'person', 'organisation'],
  });

  const fKontobezeichnung = await createField({
    name: 'kontobezeichnung',
    displayName: 'Kontobezeichnung',
    description: 'Bank account name/description',
    dataType: 'STRING',
    maxValue: '40',
    tags: ['bank', 'person', 'organisation'],
  });

  const fBankkontoGueltigAb = await createField({
    name: 'bankkontoGueltigAb',
    displayName: 'Bankkonto gültig ab',
    description: 'Bank account validity start date',
    dataType: 'DATE',
    tags: ['bank', 'person', 'organisation'],
  });

  const fBankkontoGueltigBis = await createField({
    name: 'bankkontoGueltigBis',
    displayName: 'Bankkonto gültig bis',
    description: 'Bank account validity end date',
    dataType: 'DATE',
    tags: ['bank', 'person', 'organisation'],
  });

  const fIban = await createField({
    name: 'iban',
    displayName: 'IBAN',
    description: 'International Bank Account Number',
    dataType: 'STRING',
    maxValue: '34',
    tags: ['bank', 'person', 'organisation'],
  });

  const fBic = await createField({
    name: 'bic',
    displayName: 'BIC',
    description: 'SWIFT/BIC code',
    dataType: 'STRING',
    tags: ['bank', 'person', 'organisation'],
  });

  console.log('Created all canonical fields');

  // ── Enum Values ────────────────────────────────────────
  // Geschaeftspartnertyp
  for (const [i, { code, label }] of [
    { code: '1', label: 'Person' },
    { code: '2', label: 'Organisation' },
  ].entries()) {
    await prisma.canonicalEnumValue.create({
      data: { canonicalFieldId: fGeschaeftspartnertyp.id, code, label, position: i },
    });
  }

  // Geschaeftspartnerart
  for (const [i, { code, label }] of [
    { code: 'GMDE', label: 'Gemeinde' },
    { code: 'GW', label: 'Gewerbe' },
    { code: 'GWGK', label: 'Gewerbe-Großkunden' },
    { code: 'HH', label: 'Haushalt' },
    { code: 'IND', label: 'Industrie' },
    { code: 'KETT', label: 'Kettenkunden' },
    { code: 'LAND', label: 'Land' },
    { code: 'LW', label: 'Landwirtschaft' },
    { code: 'LWGK', label: 'Landwirtschaft-Großkunden' },
    { code: 'WV', label: 'Weiterverteiler' },
    { code: 'WOWI', label: 'Wohnwirtschaft' },
    { code: 'KONZ', label: 'Konzern' },
  ].entries()) {
    await prisma.canonicalEnumValue.create({
      data: { canonicalFieldId: fGeschaeftspartnerart.id, code, label, position: i },
    });
  }

  // Berechtigungsgruppe
  for (const [i, { code, label }] of [
    { code: 'KG', label: 'EVN Energievertrieb GmbH' },
    { code: 'KONZ', label: 'EVN Energieservices GmbH' },
  ].entries()) {
    await prisma.canonicalEnumValue.create({
      data: { canonicalFieldId: fBerechtigungsgruppe.id, code, label, position: i },
    });
  }

  // Anrede
  for (const [i, { code, label }] of [
    { code: '0001', label: 'Frau' },
    { code: '0002', label: 'Herr' },
    { code: '0005', label: 'Divers' },
    { code: '0003', label: 'Firma' },
    { code: '0007', label: 'Verlassenschaft Nach' },
  ].entries()) {
    await prisma.canonicalEnumValue.create({
      data: { canonicalFieldId: fAnrede.id, code, label, position: i },
    });
  }

  console.log('Created enum values');

  // ── Example Values ─────────────────────────────────────
  const examples: Array<{ fieldId: string; value: string }> = [
    { fieldId: fCrmGuid.id, value: '1d471f69-969d-ee11-be37-6045bda1c84f' },
    { fieldId: fVorname.id, value: 'Peter' },
    { fieldId: fNachname.id, value: 'Tosh' },
    { fieldId: fName1.id, value: 'Peters' },
    { fieldId: fName2.id, value: 'Brunnenbau' },
    { fieldId: fStrasse.id, value: 'Langestr' },
    { fieldId: fHausnummer.id, value: '7' },
    { fieldId: fPostleitzahl.id, value: '123456' },
    { fieldId: fOrt.id, value: 'Kingstown' },
    { fieldId: fLand.id, value: 'AT' },
    { fieldId: fEmail.id, value: 'max@mustermann.at' },
    { fieldId: fPhoneNumber.id, value: '+435525123456' },
    { fieldId: fMobileNumber.id, value: '+43676333222' },
    { fieldId: fIban.id, value: 'AT023302700000XXXXXX' },
    { fieldId: fUid.id, value: 'ATU123213812' },
  ];
  for (const ex of examples) {
    await prisma.canonicalFieldExample.create({
      data: { canonicalFieldId: ex.fieldId, value: ex.value },
    });
  }
  console.log('Created example values');

  // ── Systems ────────────────────────────────────────────
  const crm = await prisma.system.create({
    data: {
      workspaceId: ws,
      name: 'Dynamics 365 CRM',
      systemType: 'REST',
      description: 'Microsoft Dynamics 365 Customer Engagement (CRM)',
      notes: 'Source system for business partner data',
    },
  });

  const isu = await prisma.system.create({
    data: {
      workspaceId: ws,
      name: 'SAP ISU',
      systemType: 'REST',
      description: 'SAP Industry Solution for Utilities (ISU) — OData API',
      baseUrl: 'https://apim-test.evn.at/crmesint/essapisu/v1',
      notes: 'Target system, accessed via Azure API Management gateway',
    },
  });
  console.log('Created systems: CRM + ISU');

  // ── System Entities ────────────────────────────────────
  const crmAccount = await prisma.systemEntity.create({
    data: {
      workspaceId: ws,
      systemId: crm.id,
      name: 'Account',
      slug: 'account',
      description: 'D365 Account entity — source for business partner fields',
    },
  });

  const isuBp = await prisma.systemEntity.create({
    data: {
      workspaceId: ws,
      systemId: isu.id,
      name: 'BusinessPartner',
      slug: 'business-partner',
      description: 'SAP ISU Business Partner (A_BusinessPartner OData entity)',
    },
  });
  console.log('Created system entities');

  // ── System Fields + Mappings ───────────────────────────
  // Each row from the Excel mapping sheet creates:
  //   1. A D365 system field (source, from col O)
  //   2. An ISU system field (target, from col H)
  //   3. A mapping from canonical field → D365 system field
  //   4. A mapping from canonical field → ISU system field

  type MappingRow = {
    canonicalField: { id: string };
    d365FieldName: string;
    d365Path?: string;
    isuFieldName?: string;
    isuPath?: string;
    isuDataElement?: string;
    d365RuleType: 'RENAME' | 'VALUE_MAP' | 'TYPE_CAST' | 'FORMULA';
    d365RuleNote?: string;
    d365Required?: boolean;
  };

  const mappingRows: MappingRow[] = [
    // Meta
    {
      canonicalField: fCrmGuid,
      d365FieldName: 'accountid',
      isuFieldName: 'ZCrmGuid',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fGeschaeftspartnertyp,
      d365FieldName: 'evn_geschaeftspartnertypcode',
      isuFieldName: 'BusinessPartnerCategory',
      isuDataElement: 'BU_TYPE',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_geschaeftspartnertypcode',
      d365Required: true,
    },
    {
      canonicalField: fNatuerlichePerson,
      d365FieldName: 'evn_natuerlichepersonflag',
      isuFieldName: 'IsNaturalPerson',
      isuDataElement: 'BU_NATURAL_PERSON',
      d365RuleType: 'TYPE_CAST',
      d365RuleNote: 'Boolean → CHAR (X / empty)',
    },
    {
      canonicalField: fGeschaeftspartnerart,
      d365FieldName: 'evn_geschaeftspartnerartcode',
      isuFieldName: 'BusinessPartnerType',
      isuDataElement: 'BU_BPKIND',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_geschaeftspartnerartcode',
      d365Required: true,
    },
    {
      canonicalField: fBerechtigungsgruppe,
      d365FieldName: 'evn_authorisationsgruppecode',
      isuFieldName: 'AuthorizationGroup',
      isuDataElement: 'BU_AUGRP',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_authorisationsgruppecode',
      d365Required: true,
    },
    {
      canonicalField: fInsolvenz,
      d365FieldName: 'evn_insolvenzflag',
      isuFieldName: 'to_BPCreditWorthiness-BusinessPartnerIsBankrupt',
      d365RuleType: 'TYPE_CAST',
      d365RuleNote: 'Write true or false',
    },
    {
      canonicalField: fKlassifikation,
      d365FieldName: 'evn_klassifzierungcode',
      isuFieldName: 'ZClassification',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_klassifzierungcode',
    },
    // Namen
    {
      canonicalField: fAnrede,
      d365FieldName: 'evn_anredecode',
      isuFieldName: 'FormOfAddress',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_anredecode',
    },
    {
      canonicalField: fTitelvor,
      d365FieldName: 'evn_akademischertitelvorname',
      isuFieldName: 'AcademicTitle',
      d365RuleType: 'RENAME',
      d365RuleNote: 'Send with External Value (free text)',
    },
    {
      canonicalField: fTitelnach,
      d365FieldName: 'evn_akademischertitelnachname',
      isuFieldName: 'ZPostfixedAcademicTitle',
      d365RuleType: 'RENAME',
      d365RuleNote: 'Send with External Value (free text)',
    },
    {
      canonicalField: fVorname,
      d365FieldName: 'evn_vorname',
      isuFieldName: 'FirstName',
      isuDataElement: 'BU_NAMEP_F',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fNachname,
      d365FieldName: 'evn_nachname',
      isuFieldName: 'LastName',
      isuDataElement: 'BU_NAMEP_L',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fName1,
      d365FieldName: 'evn_name1',
      isuFieldName: 'OrganizationBPName1',
      isuDataElement: 'BU_NAMEOR1',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fName2,
      d365FieldName: 'evn_name2',
      isuFieldName: 'OrganizationBPName2',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fName3,
      d365FieldName: 'evn_name3',
      isuFieldName: 'OrganizationBPName3',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fName4,
      d365FieldName: 'evn_name4',
      isuFieldName: 'OrganizationBPName4',
      d365RuleType: 'RENAME',
    },
    // Adresse
    {
      canonicalField: fStrasse,
      d365FieldName: 'address1_line1',
      isuFieldName: 'to_BusinessPartnerAddress-StreetName',
      isuDataElement: 'AD_STREET',
      d365RuleType: 'RENAME',
      d365Required: true,
    },
    {
      canonicalField: fHausnummer,
      d365FieldName: 'evn_hausnummer',
      isuFieldName: 'to_BusinessPartnerAddress-HouseNumber',
      isuDataElement: 'AD_HSNM1',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fHausnummerergaenzung,
      d365FieldName: 'evn_hausnummerergaenzung',
      isuFieldName: 'to_BusinessPartnerAddress-HouseNumberSupplementText',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fPostleitzahl,
      d365FieldName: 'address1_postalcode',
      isuFieldName: 'to_BusinessPartnerAddress-PostalCode',
      isuDataElement: 'PSTLZ',
      d365RuleType: 'RENAME',
      d365Required: true,
    },
    {
      canonicalField: fOrt,
      d365FieldName: 'address1_city',
      isuFieldName: 'to_BusinessPartnerAddress-CityName',
      isuDataElement: 'AD_CITY1',
      d365RuleType: 'RENAME',
      d365Required: true,
    },
    {
      canonicalField: fOrtsteil,
      d365FieldName: 'evn_ortsteil',
      isuFieldName: 'to_BusinessPartnerAddress-HomeCityName',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fRegion,
      d365FieldName: 'evn_region',
      isuFieldName: 'to_BusinessPartnerAddress-Region',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fRegionalstrukturgruppe,
      d365FieldName: 'evn_regionalstrukturgruppe',
      isuFieldName: 'ZRegioGroup',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fLand,
      d365FieldName: 'evn_landcode',
      isuFieldName: 'to_BusinessPartnerAddress-Country',
      isuDataElement: 'LAND1_GP',
      d365RuleType: 'RENAME',
      d365Required: true,
    },
    {
      canonicalField: fAdresseVerwendung,
      d365FieldName: '_hardcoded_xxdefault',
      isuFieldName: 'to_BusinessPartnerAddress-toAddressUsage-AddressUsage',
      d365RuleType: 'FORMULA',
      d365RuleNote: 'Hard coded to "XXDEFAULT"',
      d365Required: true,
    },
    // Postfach
    {
      canonicalField: fPostfachOrt,
      d365FieldName: 'evn_postfachort',
      isuFieldName: 'to_BusinessPartnerAddress-POBoxDeviatingCityName',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fPlzPostfach,
      d365FieldName: 'evn_postfachplz',
      isuFieldName: 'to_BusinessPartnerAddress-POBoxPostalCode',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fPostfach,
      d365FieldName: 'evn_postfach',
      isuFieldName: 'to_BusinessPartnerAddress-POBox',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fLandDesPostfachs,
      d365FieldName: 'evn_postfachlandcode',
      isuFieldName: 'to_BusinessPartnerAddress-POBoxDeviatingCountry',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fRegionDesPostfachs,
      d365FieldName: 'evn_postfachregion',
      isuFieldName: 'to_BusinessPartnerAddress-POBoxDeviatingRegion',
      d365RuleType: 'RENAME',
    },
    // Communication
    {
      canonicalField: fEmail,
      d365FieldName: 'emailaddress1',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fPhoneNumber,
      d365FieldName: 'telephone1',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fMobileNumber,
      d365FieldName: 'evn_mobiltelefonnummer',
      d365RuleType: 'RENAME',
    },
    // Identifikationsmerkmale
    {
      canonicalField: fIdentifikationsart,
      d365FieldName: 'evn_identifikationsartcode',
      isuFieldName: 'IdentificationType',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_identifikationsartcode',
    },
    {
      canonicalField: fIdentifikationsnummer,
      d365FieldName: 'evn_identifikationsnummer',
      isuFieldName: 'IdentificationNumber',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fCompanyRegistrationNumber,
      d365FieldName: 'evn_firmenbuchnummer',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fSteuernummerntyp,
      d365FieldName: 'evn_steuernummerntypcode',
      isuFieldName: 'to_BusinessPartnerTax-BPTaxType',
      isuDataElement: 'BPTAXTYPE',
      d365RuleType: 'VALUE_MAP',
      d365RuleNote: 'Write External Value of evn_steuernummerntypcode',
    },
    {
      canonicalField: fUid,
      d365FieldName: 'evn_uidnummer',
      isuFieldName: 'to_BusinessPartnerTax-TaxNumber',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fGeburtsdatum,
      d365FieldName: 'evn_geburtsdatum',
      isuFieldName: 'BirthDate',
      isuDataElement: 'BU_BIRTHDT',
      d365RuleType: 'RENAME',
      d365Required: true,
    },
    {
      canonicalField: fGruendungsdatum,
      d365FieldName: 'evn_gruendungsdatum',
      isuFieldName: 'OrganizationFoundationDate',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fBranche,
      d365FieldName: 'evn_branche',
      d365Path: 'evn_branche',
      isuFieldName: 'to_BuPaIndustry-IndustrySector',
      d365RuleType: 'FORMULA',
      d365RuleNote: 'Get lowest Branche and write name in payload',
    },
    {
      canonicalField: fBranchensystem,
      d365FieldName: 'evn_branchensystem',
      isuFieldName: 'to_BuPaIndustry-IndustrySystemType',
      d365RuleType: 'FORMULA',
      d365RuleNote: 'If Branche is filled, write "Z001" (ÖNACE)',
    },
    // Bank
    {
      canonicalField: fBankkontoId,
      d365FieldName: 'evn_bankkontoidjegp',
      d365Path: 'BANKKONTO.evn_bankkontoidjegp',
      isuFieldName: 'BankIdentification',
      isuDataElement: 'BU_BKVID',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fLaenderRegionenschluesselBank,
      d365FieldName: 'evn_banklandcode',
      isuFieldName: 'to_BusinessPartnerBank-BankCountryKey',
      isuDataElement: 'BU_BANKS',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fBankschluessel,
      d365FieldName: 'evn_bankschluessel',
      isuFieldName: 'to_BusinessPartnerBank-BankNumber',
      isuDataElement: 'BU_BANKK',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fKontoinhaber,
      d365FieldName: 'evn_kontoinhaber',
      isuFieldName: 'to_BusinessPartnerBank-BankAccountHolderName',
      isuDataElement: 'BU_KOINH',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fKontobezeichnung,
      d365FieldName: 'evn_kontobezeichnung',
      isuFieldName: 'to_BusinessPartnerBank-BankAccountName',
      isuDataElement: 'BU_BANKACCNAME',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fBankkontoGueltigAb,
      d365FieldName: 'evn_bankkontoGueltigAb',
      isuFieldName: 'to_BusinessPartnerBank-ValidityStartDate',
      isuDataElement: 'BU_BK_VALID_FROM_STR',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fBankkontoGueltigBis,
      d365FieldName: 'evn_bankkontoGueltigBis',
      isuFieldName: 'to_BusinessPartnerBank-ValidityEndDate',
      isuDataElement: 'BU_BK_VALID_TO_STR',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fIban,
      d365FieldName: 'evn_iban',
      isuFieldName: 'to_BusinessPartnerBank-IBAN',
      isuDataElement: 'BU_IBAN',
      d365RuleType: 'RENAME',
    },
    {
      canonicalField: fBic,
      d365FieldName: 'evn_bic',
      isuFieldName: 'to_BusinessPartnerBank-SWIFT',
      d365RuleType: 'RENAME',
      d365RuleNote: 'SWIFT-Code wird in SAP automatisch gesetzt',
    },
  ];

  // Value map entries for VALUE_MAP transformation rules
  const valueMapData: Record<string, Array<{ from: string; to: string }>> = {
    geschaeftspartnertyp: [
      { from: 'Person', to: '1' },
      { from: 'Organisation', to: '2' },
    ],
    geschaeftspartnerart: [
      { from: 'GEMEINDE', to: 'GMDE' },
      { from: 'GEW', to: 'GW' },
      { from: 'GEW-GK', to: 'GWGK' },
      { from: 'HH', to: 'HH' },
      { from: 'IND', to: 'IND' },
      { from: 'KETTE', to: 'KETT' },
      { from: 'LAND', to: 'LAND' },
      { from: 'LW', to: 'LW' },
      { from: 'LW-IND', to: 'LWGK' },
      { from: 'WV', to: 'WV' },
      { from: 'WOWI', to: 'WOWI' },
      { from: 'KONZ', to: 'KONZ' },
    ],
    berechtigungsgruppe: [
      { from: 'KG', to: 'KG' },
      { from: 'KONZ', to: 'KONZ' },
    ],
    anrede: [
      { from: 'Frau', to: '0001' },
      { from: 'Herr', to: '0002' },
      { from: 'Divers', to: '0005' },
      { from: 'Firma', to: '0003' },
      { from: 'Verlassenschaft Nach', to: '0007' },
    ],
  };

  for (const row of mappingRows) {
    // Create D365 system field
    const d365Field = await prisma.systemField.create({
      data: {
        workspaceId: ws,
        entityId: crmAccount.id,
        name: row.d365FieldName,
        path: row.d365Path,
        dataType: 'string',
        nullable: !row.d365Required,
        required: row.d365Required ?? false,
      },
    });

    // Create mapping: canonical → D365
    const d365Mapping = await prisma.mapping.create({
      data: {
        workspaceId: ws,
        canonicalFieldId: row.canonicalField.id,
        systemFieldId: d365Field.id,
        notes: row.d365RuleNote,
      },
    });

    // Create transformation rule for D365 mapping
    const d365Rule = await prisma.transformationRule.create({
      data: {
        mappingId: d365Mapping.id,
        type: row.d365RuleType,
        config:
          row.d365RuleType === 'FORMULA'
            ? { expression: row.d365RuleNote }
            : row.d365RuleType === 'TYPE_CAST'
              ? { sourceType: 'boolean', targetType: 'string' }
              : null,
      },
    });

    // Create value map entries if applicable
    const valueMapLookup: Record<string, string> = {
      [fGeschaeftspartnertyp.id]: 'geschaeftspartnertyp',
      [fGeschaeftspartnerart.id]: 'geschaeftspartnerart',
      [fBerechtigungsgruppe.id]: 'berechtigungsgruppe',
      [fAnrede.id]: 'anrede',
    };
    const vmKey = valueMapLookup[row.canonicalField.id];

    if (vmKey && row.d365RuleType === 'VALUE_MAP' && valueMapData[vmKey]) {
      for (const entry of valueMapData[vmKey]) {
        await prisma.valueMapEntry.create({
          data: {
            ruleId: d365Rule.id,
            fromValue: entry.from,
            toValue: entry.to,
            bidirectional: true,
          },
        });
      }
    }

    // Create ISU system field + mapping (if ISU field exists)
    if (row.isuFieldName) {
      const isuField = await prisma.systemField.create({
        data: {
          workspaceId: ws,
          entityId: isuBp.id,
          name: row.isuFieldName,
          path: row.isuDataElement,
          dataType: 'string',
          nullable: !row.d365Required,
          required: row.d365Required ?? false,
        },
      });

      const isuMapping = await prisma.mapping.create({
        data: {
          workspaceId: ws,
          canonicalFieldId: row.canonicalField.id,
          systemFieldId: isuField.id,
          notes: row.isuDataElement ? `SAP data element: ${row.isuDataElement}` : undefined,
        },
      });

      await prisma.transformationRule.create({
        data: {
          mappingId: isuMapping.id,
          type: 'RENAME',
        },
      });
    }
  }
  console.log('Created all system fields and mappings');

  // ── Interface ──────────────────────────────────────────
  const iface = await prisma.interface.create({
    data: {
      workspaceId: ws,
      name: 'CRM2ISU - GP_Erstellung',
      description:
        'Dynamics 365 → SAP ISU: Geschäftspartner Neuanlage (Business Partner Creation). ' +
        'Triggered via Azure Service Bus topic sbt-crmesint-essapisuinterfaces. ' +
        'Version 1.8.',
      sourceSystemId: crm.id,
      targetSystemId: isu.id,
      direction: 'EVENT',
    },
  });

  // Add all canonical fields to the interface with correct status
  const allFields = [
    // 1..1 = MANDATORY, 0..1 = OPTIONAL
    { field: fCrmGuid, status: 'OPTIONAL' as const },
    { field: fGeschaeftspartnertyp, status: 'MANDATORY' as const },
    { field: fNatuerlichePerson, status: 'OPTIONAL' as const },
    { field: fGeschaeftspartnerart, status: 'MANDATORY' as const },
    { field: fBerechtigungsgruppe, status: 'MANDATORY' as const },
    { field: fInsolvenz, status: 'OPTIONAL' as const },
    { field: fKlassifikation, status: 'OPTIONAL' as const },
    { field: fAnrede, status: 'OPTIONAL' as const },
    { field: fTitelvor, status: 'OPTIONAL' as const },
    { field: fTitelnach, status: 'OPTIONAL' as const },
    { field: fVorname, status: 'OPTIONAL' as const },
    { field: fNachname, status: 'OPTIONAL' as const },
    { field: fName1, status: 'OPTIONAL' as const },
    { field: fName2, status: 'OPTIONAL' as const },
    { field: fName3, status: 'OPTIONAL' as const },
    { field: fName4, status: 'OPTIONAL' as const },
    { field: fStrasse, status: 'MANDATORY' as const },
    { field: fHausnummer, status: 'OPTIONAL' as const },
    { field: fHausnummerergaenzung, status: 'OPTIONAL' as const },
    { field: fPostleitzahl, status: 'MANDATORY' as const },
    { field: fOrt, status: 'MANDATORY' as const },
    { field: fOrtsteil, status: 'OPTIONAL' as const },
    { field: fRegion, status: 'OPTIONAL' as const },
    { field: fRegionalstrukturgruppe, status: 'OPTIONAL' as const },
    { field: fLand, status: 'MANDATORY' as const },
    { field: fAdresseVerwendung, status: 'MANDATORY' as const },
    { field: fPostfachOrt, status: 'OPTIONAL' as const },
    { field: fPlzPostfach, status: 'OPTIONAL' as const },
    { field: fPostfach, status: 'OPTIONAL' as const },
    { field: fLandDesPostfachs, status: 'OPTIONAL' as const },
    { field: fRegionDesPostfachs, status: 'OPTIONAL' as const },
    { field: fEmail, status: 'OPTIONAL' as const },
    { field: fPhoneNumber, status: 'OPTIONAL' as const },
    { field: fMobileNumber, status: 'OPTIONAL' as const },
    { field: fIdentifikationsart, status: 'OPTIONAL' as const },
    { field: fIdentifikationsnummer, status: 'OPTIONAL' as const },
    { field: fCompanyRegistrationNumber, status: 'OPTIONAL' as const },
    { field: fSteuernummerntyp, status: 'OPTIONAL' as const },
    { field: fUid, status: 'OPTIONAL' as const },
    { field: fGeburtsdatum, status: 'MANDATORY' as const },
    { field: fGruendungsdatum, status: 'OPTIONAL' as const },
    { field: fBranche, status: 'OPTIONAL' as const },
    { field: fBranchensystem, status: 'OPTIONAL' as const },
    { field: fBankkontoId, status: 'OPTIONAL' as const },
    { field: fLaenderRegionenschluesselBank, status: 'OPTIONAL' as const },
    { field: fBankschluessel, status: 'OPTIONAL' as const },
    { field: fKontoinhaber, status: 'OPTIONAL' as const },
    { field: fKontobezeichnung, status: 'OPTIONAL' as const },
    { field: fBankkontoGueltigAb, status: 'OPTIONAL' as const },
    { field: fBankkontoGueltigBis, status: 'OPTIONAL' as const },
    { field: fIban, status: 'OPTIONAL' as const },
    { field: fBic, status: 'OPTIONAL' as const },
  ];

  for (const { field, status } of allFields) {
    await prisma.interfaceField.create({
      data: {
        interfaceId: iface.id,
        canonicalFieldId: field.id,
        status,
      },
    });
  }
  console.log(`Created interface: ${iface.name} with ${allFields.length} fields`);

  // ── Summary ────────────────────────────────────────────
  const counts = {
    canonicalFields: allFields.length,
    d365SystemFields: mappingRows.length,
    isuSystemFields: mappingRows.filter((r) => r.isuFieldName).length,
    mappings: mappingRows.length + mappingRows.filter((r) => r.isuFieldName).length,
    enumValues: await prisma.canonicalEnumValue.count({ where: { canonicalField: { workspaceId: ws } } }),
    examples: examples.length,
  };
  console.log('\n✓ Seed complete!');
  console.log(`  Workspace:        ${workspace.name}`);
  console.log(`  Canonical fields: ${counts.canonicalFields}`);
  console.log(`  D365 fields:      ${counts.d365SystemFields}`);
  console.log(`  ISU fields:       ${counts.isuSystemFields}`);
  console.log(`  Mappings:         ${counts.mappings}`);
  console.log(`  Enum values:      ${counts.enumValues}`);
  console.log(`  Example values:   ${counts.examples}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
