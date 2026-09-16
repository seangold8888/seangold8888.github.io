// Lyria 3.5로 게임 배경음악을 만든다. 사용법: node lyria.cjs <출력이름> "<프롬프트>"
const fs=require("fs");
const [,,name,prompt]=process.argv;
if(!name||!prompt){console.error("사용법: node lyria.cjs <이름> \"<프롬프트>\"");process.exit(1);}
const key=process.env.GEMINI_API_KEY;
if(!key){console.error("GEMINI_API_KEY 없음");process.exit(1);}
(async()=>{
  const res=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{
    method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},
    body:JSON.stringify({model:"lyria-3.5",input:prompt})});
  if(!res.ok){console.error(name,"실패",res.status,(await res.text()).slice(0,200));process.exit(1);}
  const j=await res.json();
  let audio=null;
  const walk=o=>{if(!o||typeof o!=="object")return;if(o.type==="audio"&&o.data){audio=o;return;}Object.values(o).forEach(walk);};
  walk(j);
  if(!audio){console.error(name,"오디오 없음");process.exit(1);}
  const ext=audio.mime_type==="audio/wav"?"wav":"mp3";
  const file=`${name}.${ext}`;
  fs.writeFileSync(file,Buffer.from(audio.data,"base64"));
  console.log(name,"저장",(fs.statSync(file).size/1024/1024).toFixed(2),"MB");
})();
