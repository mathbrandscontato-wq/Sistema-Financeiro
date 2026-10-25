/** @param {unknown} value */
export function errorDetails(value){
  if(!value||typeof value!=='object')return {message:'',status:undefined};
  return {message:'message' in value&&typeof value.message==='string'?value.message:'',
    status:'status' in value&&typeof value.status==='number'?value.status:undefined};
}
