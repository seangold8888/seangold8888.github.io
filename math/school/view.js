(function(){
"use strict";
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function answers(q,draft,disabled,box){box.replaceChildren();
 if(q.mode==="fields"){
  const fields=el("div",undefined,"answer-fields");
  q.inputs.forEach((spec,i)=>{const label=el("label",undefined,"answer-field");label.append(el("span",spec.label));let input;
   if(spec.options){input=el("select");const blank=el("option","선택");blank.value="";input.append(blank);spec.options.forEach(x=>{const op=el("option",x);op.value=x;input.append(op);});}
   else{input=el("input");input.type="text";input.inputMode="numeric";input.pattern="[0-9]*";input.maxLength=3;input.autocomplete="off";}
   input.dataset.answer=String(i);input.value=draft[i]||"";input.disabled=disabled;label.append(input);fields.append(label);
  });box.append(fields);
 }else{
  const fs=el("fieldset");fs.append(el("legend",q.mode==="multi"?"맞는 답을 모두 선택하세요.":"답 하나를 선택하세요."));const list=el("div",undefined,"choice-list");
  q.options.forEach((option,i)=>{const label=el("label",undefined,"choice"),input=el("input");input.type=q.mode==="multi"?"checkbox":"radio";input.name="choice";input.value=String(i);input.checked=draft.includes(String(i));input.disabled=disabled;label.append(input,el("span",option));list.append(label);});fs.append(list);box.append(fs);
 }
}
function read(q,box){return q.mode==="fields"?Array.from(box.querySelectorAll("[data-answer]")).map(e=>e.value):Array.from(box.querySelectorAll("input:checked")).map(e=>e.value);}
function answerLabel(q){return q.mode==="fields"?q.answers.map((a,i)=>q.inputs[i].label+": "+a).join(" / "):q.answers.map(i=>q.options[Number(i)]).join(", ");}
function visual(q,box){
 box.replaceChildren();const v=q.visual;if(!v)return;
 if(v.kind==="bundles"){const grid=el("div",undefined,"bundle-grid");for(let i=0;i<v.tens;i++){const bundle=el("span",undefined,"bundle");bundle.append(el("b","10"),el("small","한 묶음"));grid.append(bundle);}box.append(grid);if(v.ones){const units=el("div",undefined,"loose-units");units.setAttribute("aria-label","낱개 "+v.ones+"개");for(let i=0;i<v.ones;i++)units.append(el("i",undefined,"single-dot"));box.append(units);}}
 if(v.kind==="beads"){const rows=el("div",undefined,"bead-rows");rows.setAttribute("role","img");rows.setAttribute("aria-label","한 줄에 10개씩 "+v.rows+"줄의 구슬");for(let i=0;i<v.rows;i++){const row=el("div",undefined,"bead-row");for(let j=0;j<10;j++)row.append(el("i",undefined,"bead"));rows.append(row);}box.append(rows);}
 if(v.kind==="number")box.append(el("div",v.value,"school-number"));
 if(v.kind==="sequence"||v.kind==="cards"){const row=el("div",undefined,v.kind==="cards"?"number-cards":"number-sequence");v.values.forEach(x=>row.append(el("span",x)));box.append(row);}
}
window.SchoolView={el,visual,answers,read,answerLabel};
})();
