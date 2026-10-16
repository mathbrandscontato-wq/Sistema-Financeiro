// Local component QA only: localhost, synthetic records, intercepted API, no D1/gateway.
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const modulePath=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(modulePath?pathToFileURL(resolve(modulePath,'playwright/index.mjs')).href:'playwright');
const folder=resolve('work/markteam-ui');
await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'index.html'),'<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/work/markteam-ui/harness.tsx"></script></body></html>');
await writeFile(resolve(folder,'harness.tsx'),`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import LeadsPanel from '../../app/leads-panel';import AcquisitionPanel from '../../app/acquisition-panel';import '../../app/globals.css';
const at='2026-10-16T15:00:00Z';
const records={commercial_clients:[{id:'client-test',display_name:'Empresa Fictícia',contact_name:'Contato de QA',email:'qa@example.invalid'}],commercial_opportunities:[{id:'opportunity-test',client_id:'client-test',title:'Projeto fictício',stage:'Proposta enviada',created:at,archived:0}],commercial_history:[{id:'a',opportunity_id:'opportunity-test',created:at,data:JSON.stringify({kind:'opportunity_updated',before:{stage:'Qualificação'},after:{stage:'Proposta enviada'}})}]};
function Harness(){const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);return <div style={{padding:16}}><div role="status" data-testid="feedback">{message}</div><LeadsPanel records={records} busy={busy} onOpen={()=>setMessage('Detalhe solicitado')} onSchedule={(_lead,choice)=>setMessage('Data escolhida: '+choice.date)} onQualify={async()=>{setBusy(true);await new Promise(r=>setTimeout(r,150));setBusy(false);setMessage('409 simulado: revisão preservada');return false;}}/><AcquisitionPanel/></div>};
createRoot(document.getElementById('root')!).render(<Harness/>);`);
let server,browser;
try{
 server=await createServer({configFile:false,root:process.cwd(),plugins:[react()],server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
 const address=server.httpServer.address();browser=await chromium.launch({headless:true});
 for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname==='/api/acquisition')return route.fulfill({status:503,json:{error:'Falha de teste, sem banco conectado.'}});return route.continue();});
  await page.goto('http://127.0.0.1:'+address.port+'/work/markteam-ui/index.html');
  await page.getByRole('button',{name:'Classificar lead'}).waitFor();
  await page.getByRole('button',{name:'Classificar lead'}).click();
  await page.getByRole('textbox',{name:'Justificativa da classificação'}).fill('Necessidade fictícia documentada para teste.');
  await page.getByRole('textbox',{name:'Fonte da evidência'}).fill('Fixture de QA');
  await page.getByRole('button',{name:'Salvar revisão'}).focus();await page.keyboard.press('Enter');
  await page.getByTestId('feedback').filter({hasText:'409 simulado'}).waitFor();
  assert.equal(await page.getByRole('textbox',{name:'Fonte da evidência'}).inputValue(),'Fixture de QA');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Fonte da evidência'}).count(),0);
  const follow=page.getByRole('button',{name:/D\+3/});assert.equal(await follow.count(),1);await follow.click();
  await page.getByTestId('feedback').filter({hasText:'Data escolhida: 2026-10-21'}).waitFor();
  assert.equal(await page.getByRole('alert').textContent(),'Falha de teste, sem banco conectado.Tentar novamente');
  await page.getByRole('button',{name:'Tentar novamente'}).click();await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow at '+width);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS UI '+width+'px: labels, keyboard save, simulated conflict retention, cancel, follow-up date, Analytics retry, no overflow.');
 }
}finally{await browser?.close();await server?.close();await rm(folder,{recursive:true,force:true});}
