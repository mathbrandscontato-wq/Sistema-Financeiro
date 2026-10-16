// Template v1 is immutable. Future designs must add a version rather than edit v1.
import {prepareDocument as prepareV1} from './templates/v1/document.mjs';
export const CURRENT_TEMPLATE_VERSION='mathbrands-v1';
export function prepareDocument(quote,loader){const version=quote.templateVersion||CURRENT_TEMPLATE_VERSION;if(version!==CURRENT_TEMPLATE_VERSION)throw Error('Versão de template não suportada.');const documentQuote={...quote,rows:quote.rows.map(row=>({...row,description:row.name?.trim()?[row.name.trim(),row.description].filter(Boolean).join('\n'):row.description}))};return prepareV1(documentQuote,loader);}
