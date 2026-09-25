require('dotenv').config();
const fs=require('fs');
const fsp=require('fs/promises');
const path=require('path');

const uploadsRoot=path.resolve(process.env.UPLOADS_DIR||path.join(__dirname,'..','..','uploads'));
const supabaseUrl=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const bucket=process.env.SUPABASE_STORAGE_BUCKET||'edunex-files';
const MIME={'.pdf':'application/pdf','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};

async function walk(dir){
  const out=[];
  if(!fs.existsSync(dir))return out;
  for(const e of await fsp.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())out.push(...await walk(p));
    else if(e.isFile()&&MIME[path.extname(e.name).toLowerCase()])out.push(p);
  }
  return out;
}

async function upload(file){
  const key=path.relative(uploadsRoot,file).replace(/\\/g,'/');
  const type=MIME[path.extname(file).toLowerCase()];
  const body=await fsp.readFile(file);
  const url=`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${supabaseKey}`,apikey:supabaseKey,'Content-Type':type,'x-upsert':'true'},body});
  if(!r.ok)throw new Error(`Upload failed for ${key} (${r.status}): ${(await r.text()).slice(0,500)}`);
  return[key,body.length];
}

(async()=>{
  try{
    if(!supabaseUrl||!supabaseKey)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    console.log('EduNex local uploads -> Supabase Storage');
    console.log(`Source: ${uploadsRoot}`);
    console.log(`Bucket: ${bucket}`);
    const files=await walk(uploadsRoot);
    if(!files.length){
      console.log('No supported local upload files found.');
      return;
    }
    let n=0;
    for(const file of files){
      const[key,size]=await upload(file);
      console.log(`COPIED ${key}: ${size} bytes`);
      n++;
    }
    console.log(`Storage migration completed successfully: ${n} files.`);
    console.log('Database /uploads/... paths remain valid because object keys preserve the same relative paths.');
  }catch(err){
    console.error('Storage migration failed:',err.message);
    process.exitCode=1;
  }
})();