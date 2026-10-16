import type {ApiError} from './ui-types';
// Typed response boundary for the application's own authenticated JSON endpoints.
export async function fetchJson<T extends ApiError>(url:string,fallback=''){
  const response=await fetch(url,{cache:'no-store'});
  const data=await response.json() as T;
  if(!response.ok)throw Error(data.error||fallback);
  return data;
}
