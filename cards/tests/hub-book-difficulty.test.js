"use strict";
const test=require("node:test"),a=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const books=require("../../story/english/books.js"),reading=require("../../assets/study/english-reading.js");
const root=path.resolve(__dirname,"../.."),html=fs.readFileSync(path.join(root,"game/index.html"),"utf8").replace(/\r/g,"");
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
test("the hub no longer reads picture-book pages; old saved book progress is left untouched",()=>{
  a.doesNotMatch(html,/story\/english\/books\.js|BOOK_PAGES|bookCursor|storySeed|advanceBook|EnglishBooks/);
  a.doesNotMatch(html,/setItem\('hub2_book_cursor'|removeItem\('hub2_book_cursor'/);
  a.doesNotMatch(html,/id="bookReadingMode"/);
});
test("the listening-only picture book loads the book helper; VS has a constrained, centered grid track",()=>{
  const standalone=fs.readFileSync(path.join(root,"story/english/index.html"),"utf8");
  a.match(standalone,/books\.js\?v=7/);a.match(standalone,/playNarration\(page\.audio, text, listen, meaning/);
  const css=fs.readFileSync(path.join(root,"cards/styles.css"),"utf8"),block=css.match(/\.battle-center \{([^}]+)\}/)[1];
  a.match(block,/min-width:\s*0/);a.match(block,/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
