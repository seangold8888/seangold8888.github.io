/* School-style practice for numbers up to 100, separate from the level ladder. */
(function(root){
"use strict";
const GROUPS={all:"골고루",bundles:"묶음·수 읽기",order:"순서·비교",parity:"짝수·홀수"};
const NAMES=["10개씩 묶음","그림 세기","수와 읽는 말 연결","다르게 나타낸 수","묶음 수 비교","상자에 나누어 담기","묶음과 낱개","수 읽기","1 큰 수·1 작은 수","수의 순서","100의 뜻","어떤 수 찾기","빈칸에 가능한 숫자","숫자 카드로 수 만들기","부등호 비교","생활 속 크기 비교","홀수의 일의 자리","짝수 모두 찾기","짝·홀 구분","홀수끼리 모으기"];
const nativeTens=["","열","스물","서른","마흔","쉰","예순","일흔","여든","아흔"];
const nativeOnes=["","하나","둘","셋","넷","다섯","여섯","일곱","여덟","아홉"];
function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function read(n){return n===100?"백":nativeTens[Math.floor(n/10)]+nativeOnes[n%10];}
function group(type){return type<8?"bundles":type<16?"order":"parity";}
function question(type,seed){
 const r=rng((seed+Math.imul(type+1,2654435761))>>>0),pick=(a,b)=>a+Math.floor(r()*(b-a+1)),q={type,group:group(type),name:NAMES[type],mode:"fields",inputs:[],answers:[],hint:"",explain:"",visual:null};
 const fields=(labels,answers)=>{q.inputs=labels.map(label=>({label}));q.answers=answers.map(String);};
 const choices=(items,correct,multi=false)=>{q.mode=multi?"multi":"single";q.options=shuffle(items,r);q.answers=q.options.flatMap((x,i)=>correct.includes(x)?[String(i)]:[]);};
 let a,b,n,items;
 switch(type){
 case 0:a=pick(5,9);q.text="사탕이 한 봉지에 10개씩 있어요. "+a+"봉지의 사탕은 모두 몇 개인가요?";q.visual={kind:"bundles",tens:a,ones:0};fields(["사탕 수 (개)"],[a*10]);q.hint="봉지마다 10개예요. 10, 20, 30… 묶음으로 세어 보세요.";q.explain="10개씩 "+a+"묶음이므로 "+(a*10)+"개예요.";break;
 case 1:a=pick(5,9);q.text="그림의 구슬은 모두 몇 개인가요?";q.visual={kind:"beads",rows:a};choices([50,60,70,80,90].map(x=>x+"개"),[a*10+"개"]);q.hint="한 줄에 10개씩 있어요. 줄이 몇 개인지 세어 보세요.";q.explain="10개씩 "+a+"줄이므로 "+a*10+"개예요.";break;
 case 2:items=shuffle([40,50,60,70,80,90],r).slice(0,3);q.text="같은 수가 되도록 읽는 말을 골라 연결하세요.";q.inputs=items.map(n=>({label:String(n),options:shuffle(items.map(read),r)}));q.answers=items.map(read);q.hint="예순은 60, 일흔은 70, 여든은 80, 아흔은 90이에요.";q.explain=items.map(n=>n+" = "+read(n)).join(", ");break;
 case 3:a=pick(5,8)*10;b=a+10;q.text="나타내는 수가 나머지와 다른 하나를 고르세요.";choices([String(a),read(a),["","","","","","오십","육십","칠십","팔십"][a/10],read(b)],[read(b)]);q.hint="숫자와 읽는 말을 같은 수로 바꾸어 보세요.";q.explain=read(b)+"은 "+b+"이고, 나머지는 모두 "+a+"을 나타내요.";break;
 case 4:items=shuffle([5,6,7,8,9],r).map(t=>t*10+pick(0,9));q.text="10개씩 묶음이 가장 많은 수를 고르세요.";choices(items.map(String),[String(Math.max(...items))]);q.hint="십의 자리 숫자가 10개씩 묶음의 수예요.";q.explain=Math.max(...items)+"은 10개씩 묶음이 9개로 가장 많아요.";break;
 case 5:n=pick(5,9)*10+pick(1,9);q.text="쿠키 "+n+"개를 한 상자에 10개씩 담으려고 해요. 가득 찬 상자와 남는 쿠키는 각각 얼마인가요?";fields(["가득 찬 상자 (상자)","남는 쿠키 (개)"],[Math.floor(n/10),n%10]);q.reason=true;q.hint="십의 자리는 가득 찬 상자 수, 일의 자리는 남는 쿠키 수예요.";q.explain=n+"은 10개씩 "+Math.floor(n/10)+"묶음과 낱개 "+n%10+"개이므로, "+Math.floor(n/10)+"상자에 담고 "+n%10+"개가 남아요.";break;
 case 6:a=pick(5,9);b=pick(1,9);n=a*10+b;q.text="연필이 10자루씩 묶음 "+a+"개와 낱개 "+b+"자루 있어요. 모두 몇 자루인가요?";q.visual={kind:"bundles",tens:a,ones:b};fields(["연필 수 (자루)"],[n]);q.hint="묶음은 "+a*10+"자루예요. 낱개를 더해 보세요.";q.explain=a*10+" + "+b+" = "+n+"이므로 "+n+"자루예요.";break;
 case 7:a=pick(6,9);b=pick(1,8);n=a*10+b;q.text=n+"을 바르게 읽은 것을 고르세요.";q.visual={kind:"number",value:String(n)};choices([read(n),read(n-10),read(n+1)],[read(n)]);q.hint="십의 자리와 일의 자리를 나누어 읽어 보세요.";q.explain=a*10+"은 "+read(a*10)+", "+b+"은 "+read(b)+"이므로 "+read(n)+"이에요.";break;
 case 8:a=pick(60,98);b=pick(61,99);q.text="빈칸에 알맞은 수를 쓰세요.";fields([a+"보다 1만큼 더 큰 수",b+"보다 1만큼 더 작은 수"],[a+1,b-1]);q.hint="1 큰 수는 바로 다음 수, 1 작은 수는 바로 앞의 수예요.";q.explain=a+" 다음은 "+(a+1)+", "+b+" 바로 앞은 "+(b-1)+"이에요.";break;
 case 9:a=pick(60,91);q.text="수가 1씩 커지도록 늘어놓았어요. ㉠과 ㉡에 들어갈 수를 쓰세요.";q.visual={kind:"sequence",values:Array.from({length:9},(_,i)=>i===2?"㉠":i===5?"㉡":String(a+i))};fields(["㉠","㉡"],[a+2,a+5]);q.hint="왼쪽에서 오른쪽으로 하나씩 세어 보세요.";q.explain="차례로 "+Array.from({length:9},(_,i)=>a+i).join(", ")+"이에요.";break;
 case 10:q.text="100에 대한 설명으로 맞는 것을 모두 고르세요.";items=["99보다 1만큼 큰 수","90보다 1만큼 큰 수","10개씩 묶음이 10개인 수"];choices(items,[items[0],items[2]],true);q.hint="99 다음은 100이에요. 10묶음을 세면 10, 20, …, 100이 되어요.";q.explain="99보다 1 큰 수는 100이고, 10개씩 10묶음도 100이에요. 90보다 1 큰 수는 91이에요.";break;
 case 11:n=pick(6,10)*10;q.text="어떤 수보다 1만큼 더 큰 수가 "+n+"이에요. 어떤 수는 얼마인가요?";fields(["어떤 수"],[n-1]);q.hint="어떤 수에 1을 더했어요. 거꾸로 "+n+"에서 1을 빼 보세요.";q.explain=(n-1)+"에 1을 더하면 "+n+"이므로 어떤 수는 "+(n-1)+"이에요.";break;
 case 12:a=pick(4,8);b=pick(1,8);n=a*10+b;const unit=pick(0,9);const possible=Array.from({length:9},(_,i)=>i+1).filter(d=>d*10+unit<n);q.text="1부터 9까지의 숫자 중 □ 안에 들어갈 수 있는 숫자는 모두 몇 개인가요?";q.visual={kind:"number",value:n+" > □"+unit};fields(["가능한 숫자의 개수"],[possible.length]);q.hint="□에 1부터 9까지 넣어 보고 왼쪽 수보다 작은 수만 찾아보세요.";q.explain="□에는 "+possible.join(", ")+"이 들어갈 수 있어요. 모두 "+possible.length+"개예요.";break;
 case 13:items=shuffle([1,2,3,4,5,6,7,8,9],r).slice(0,4);const sorted=items.slice().sort((a,b)=>b-a);q.text="카드 2장을 골라 가장 큰 두 자리 수를 만드세요. 고른 카드는 한 번씩만 쓸 수 있어요.";q.visual={kind:"cards",values:items.map(String)};fields(["가장 큰 두 자리 수"],[sorted[0]*10+sorted[1]]);q.reason=true;q.hint="가장 큰 숫자를 십의 자리에 놓고, 남은 숫자 중 가장 큰 것을 일의 자리에 놓아 보세요.";q.explain=sorted[0]+"을 십의 자리, "+sorted[1]+"을 일의 자리에 놓으면 "+(sorted[0]*10+sorted[1])+"으로 가장 커요.";break;
 case 14:a=pick(50,88);b=a+pick(1,9);let c=pick(60,89);while(c===a)c=pick(60,89);q.text="두 수의 크기를 바르게 비교한 것을 고르세요.";items=[a+" < "+b,b+" < "+a,c+" > "+(c+1),(c+1)+" < "+c];choices(items,[items[0]]);q.hint="먼저 십의 자리, 같으면 일의 자리를 비교해요. 뾰족한 쪽이 작은 수를 가리켜요.";q.explain=a+"보다 "+b+"이 크므로 "+a+" < "+b+"이 맞아요.";break;
 case 15:a=pick(50,89);b=a+pick(1,9);const swap=r()<.5;const jaei=swap?a:b,taeo=swap?b:a;q.text="재이는 스티커를 "+jaei+"개, 태오는 "+taeo+"개 모았어요. 더 많이 모은 사람은 누구인가요?";choices(["재이","태오"],[jaei>taeo?"재이":"태오"]);q.hint="십의 자리부터 비교하고, 같으면 일의 자리를 비교해요.";q.explain=b+"이 "+a+"보다 크므로 "+(jaei>taeo?"재이":"태오")+"가 더 많이 모았어요.";break;
 case 16:a=pick(2,9);b=pick(0,4)*2;q.text="십의 자리 숫자가 "+a+"인 두 자리 수가 홀수예요. 일의 자리에 들어갈 수 없는 숫자를 고르세요.";choices([1,3,5,7,b].map(String),[String(b)]);q.hint="홀수의 일의 자리는 1, 3, 5, 7, 9 중 하나예요.";q.explain="일의 자리가 "+b+"이면 짝수이므로 홀수가 될 수 없어요.";break;
 case 17:items=[pick(1,4)*10+2,pick(5,8)*10+4,pick(1,3)*10+7,pick(4,6)*10+9,pick(7,9)*10+5];q.text="다음 수 중 짝수를 모두 고르세요.";choices(items.map(String),items.filter(n=>n%2===0).map(String),true);q.hint="두 개씩 짝지어 남는 것이 없으면 짝수예요. 일의 자리가 0, 2, 4, 6, 8인지 살펴보세요.";q.explain=items.filter(n=>n%2===0).join(", ")+"는 일의 자리가 짝수여서 두 개씩 짝지으면 남는 것이 없어요.";break;
 case 18:items=shuffle([pick(1,4)*20+pick(0,4)*2,pick(1,4)*20+pick(0,4)*2+1],r);q.text="짝수는 ‘짝’, 홀수는 ‘홀’을 골라 주세요.";q.inputs=items.map(n=>({label:String(n),options:["짝","홀"]}));q.answers=items.map(n=>n%2?"홀":"짝");q.hint="십의 자리가 아니라 일의 자리를 보세요. 0, 2, 4, 6, 8이면 짝수예요.";q.explain=items.map(n=>n+"은 "+(n%2?"한 개가 남는 홀수":"남는 것이 없는 짝수")).join(", ")+"예요.";break;
 case 19:a=pick(1,3)*10;items=[[a+1,a+13,a+25],[a+3,a+14,a+25],[a+2,a+14,a+26],[a+1,a+12,a+23]].map(row=>row.join(", "));q.text="홀수끼리만 모인 것을 고르세요.";choices(items,[items[0]]);q.hint="세 수 모두 일의 자리가 1, 3, 5, 7, 9 중 하나인지 확인해요.";q.explain=items[0]+"은 모두 일의 자리가 홀수예요. 다른 묶음에는 짝수가 있어요.";break;
 default:throw Error("Unknown school question type");
 }
 return q;
}
function normalized(v){return String(v==null?"":v).trim();}
function grade(q,answer){
 if(!Array.isArray(answer))return false;
 if(q.mode==="multi")return answer.length===q.answers.length&&new Set(answer).size===answer.length&&q.answers.every(x=>answer.includes(x));
 return answer.length===q.answers.length&&answer.every((v,i)=>q.inputs[i]&&!q.inputs[i].options?/^[0-9]+$/.test(normalized(v))&&Number(v)===Number(q.answers[i]):normalized(v)===q.answers[i]);
}
function create(groupName="all",size=5,seed=Date.now()>>>0){
 const types=Array.from({length:20},(_,i)=>i).filter(i=>groupName==="all"||group(i)===groupName);
 if(!types.length)throw Error("Unknown group");
 const order=size===20&&groupName==="all"?types:shuffle(types,rng(seed)).slice(0,Math.min(size,types.length));
 return {version:1,seed,group:groupName,order,index:0,results:[],draft:[],reason:"",attempts:0,help:false,revealed:false,checked:false};
}
const api={GROUPS,NAMES,question,grade,create,group};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.SchoolQuestions=api;
})(typeof window!=="undefined"?window:globalThis);
