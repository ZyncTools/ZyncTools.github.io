const fs=require('fs'),vm=require('vm');
const ctx={window:{},document:{createElement:()=>({style:{},appendChild(){},getContext:()=>({drawImage(){},fillRect(){},fillStyle:''},width:0,height:0,toBlob:()=>{}}),head:{appendChild(){}},querySelector:()=>null,addEventListener(){}},Blob:function(){},URL:{createObjectURL:()=>'blob:x'},Math,JSON,Object,Array,String,Number,parseInt,parseFloat,isFinite,Date,TextEncoder,Uint8Array,Uint32Array,DataView,FileReader:function(){},crypto:{subtle:{digest:()=>Promise.resolve(new Uint8Array(32))},randomUUID:()=>'uuid',getRandomValues:()=>{}},btoa:s=>Buffer.from(s,'utf8').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('utf8'),fetch:()=>Promise.reject('x'),setTimeout};
ctx.window.addEventListener=()=>{};vm.createContext(ctx);
const modules=['text-logic.js','unit-logic.js','seo-logic.js','image-light-logic.js','image-effects-logic.js','security-logic.js','pdf-light-logic.js','media-batch-logic.js','generators-logic.js','extra-text-security-logic.js','tools-batch-logic.js'];
for(const m of modules){vm.runInContext(fs.readFileSync('assets/js/tools/'+m,'utf8'),ctx);}
const d=JSON.parse(fs.readFileSync('tools-database-cleaned.json','utf8'));
const cs=d.tools.filter(t=>t.status==='coming-soon');
console.log('Still coming-soon:',cs.length);
const bycat={};
cs.forEach(t=>{bycat[t.category]=(bycat[t.category]||0)+1;});
console.log('By category:',JSON.stringify(bycat,null,2));