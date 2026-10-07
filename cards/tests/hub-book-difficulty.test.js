"use strict";
const test=require("node:test"),a=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const books=require("../../story/english/books.js"),reading=require("../../assets/study/english-reading.js");
const root=path.resolve(__dirname,"../.."),html=fs.readFileSync(path.join(root,"game/index.html"),"utf8").replace(/\r/g,"");
function fn(name){const start=html.indexOf("  function "+name+"(");a.ok(start>=0,name);return html.slice(start,html.indexOf("\n  }",start)+4);}
function setup(saved={i:0,done:[]}){
  const data=new Map([["hub2_book_cursor",JSON.stringify(saved)]]);
  const ctx={window:{EnglishBooks:books,EnglishReading:reading},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))},STORY_BASE:100000,BOOK_PAGES:[]};
  books.books.forEach((book,bookIndex)=>book.pages.forEach((page,pageIndex)=>ctx.BOOK_PAGES.push({book,bookIndex,pageIndex,pages:book.pages.length,...page})));
  vm.createContext(ctx);
  const start=html.indexOf("  var bookReadingMode ="),end=html.indexOf("  /* 조용 모드",start);
  vm.runInContext(html.slice(start,end)+"\n"+fn("buildBankProblem"),ctx);
  return {ctx,data};
}
test("all 56 story pages have beginner sentences of 3–5 words without discarding originals or audio",()=>{
  let count=0;
  for(const book of books.books)for(const page of book.pages){
    const line=books.practice(page,"easy")[0],n=reading.normalize(line.text).split(" ").length;
    a.ok(n>=3&&n<=5,book.id+": "+line.text);a.ok(line.meaning);a.match(line.text,/[.!?]$/);
    a.ok(page.text);a.ok(page.meaning);a.ok(fs.existsSync(path.join(root,"story/english",page.audio)));
    a.equal(books.practice(page,"page")[0].text,page.text);count++;
  }
  a.equal(count,56);a.equal(books.books[0].pages[0].text,"It is a sunny day. Jay wants a picnic.");
});
test("sentence mode presents one complete sentence at a time, not arbitrary word fragments",()=>{
  for(const book of books.books)for(const page of book.pages){
    const parts=books.practice(page,"sentence");a.ok(parts.length>=1);
    a.equal(parts.map(p=>p.text).join(" "),page.text);
    for(const part of parts){a.match(part.text,/[.!?]$/);a.ok(part.meaning);}
  }
  a.deepEqual(books.practice(books.books[0].pages[0],"sentence").map(p=>p.text),["It is a sunny day.","Jay wants a picnic."]);
});
test("easy is the migration/default; parents can persist all three modes and denied storage stays usable",()=>{
  const data=new Map(),s={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  a.equal(books.readMode(s),"easy");s.setItem(books.MODE_KEY,"invalid");a.equal(books.readMode(s),"easy");
  for(const mode of ["easy","sentence","page"]){a.equal(books.saveMode(s,mode),true);a.equal(books.readMode(s),mode);}
  const blocked={getItem(){throw Error();},setItem(){throw Error();}};
  a.equal(books.readMode(blocked),"easy");a.equal(books.saveMode(blocked,"page"),false);
});
test("existing page/book completion progress survives the shorter default without resetting tickets",()=>{
  const {ctx,data}=setup({i:10,done:["picnic"],extra:"legacy"});
  a.equal(ctx.bookCursor.i,10);a.equal(ctx.bookCursor.part,0);a.deepEqual(Array.from(ctx.bookCursor.done),["picnic"]);
  a.equal(ctx.bookReadingMode,"easy");a.equal(ctx.buildBankProblem("reading",100010).answer,books.books[1].pages[2].easy.text);
  a.equal(ctx.advanceBook(100010),null);a.equal(ctx.bookCursor.i,11);
  a.equal(data.has("hub2_solved"),false);a.equal(data.has("hub2_credit"),false);
});
test("a page advances only after its final sentence and reload restores the unfinished sentence",()=>{
  const {ctx,data}=setup();ctx.bookReadingMode="sentence";
  a.equal(ctx.buildBankProblem("reading",100000).answer,"It is a sunny day.");
  a.equal(ctx.advanceBook(100000),null);a.equal(ctx.bookCursor.i,0);a.equal(ctx.bookCursor.part,1);
  const resume=setup(JSON.parse(data.get("hub2_book_cursor"))).ctx;resume.bookReadingMode="sentence";
  a.equal(resume.buildBankProblem("reading",100000).answer,"Jay wants a picnic.");
  resume.advanceBook(100000);a.equal(resume.bookCursor.i,1);a.equal(resume.bookCursor.part,0);
});
test("book completion is awarded once on the last page, and stale page callbacks do not move progress",()=>{
  const {ctx}=setup({i:7,part:0,done:["momo"]});
  a.equal(ctx.advanceBook(100006),null);a.equal(ctx.bookCursor.i,7);
  a.equal(ctx.advanceBook(100007).id,"picnic");a.deepEqual(Array.from(ctx.bookCursor.done),["momo","picnic"]);
  a.equal(ctx.advanceBook(100007),null);a.equal(ctx.bookCursor.i,8);
});
test("both reading surfaces load the updated book helper; VS has a constrained, centered grid track",()=>{
  const standalone=fs.readFileSync(path.join(root,"story/english/index.html"),"utf8");
  a.match(html,/books\.js\?v=6/);a.match(standalone,/books\.js\?v=6/);
  a.match(html,/id="bookReadingMode"/);a.match(standalone,/전체 이야기 듣기/);
  const css=fs.readFileSync(path.join(root,"cards/styles.css"),"utf8"),block=css.match(/\.battle-center \{([^}]+)\}/)[1];
  a.match(block,/min-width:\s*0/);a.match(block,/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
