// Quick OCR is a build-time task. Visitors only download the selected excerpts.
export class ComicReader{
  constructor(pages,random=Math.random){this.pages=pages.filter(p=>typeof p.text==='string'&&p.text.trim());this.random=random;this.previous=[];if(this.pages.length<2)throw Error('Book 2 needs at least two readable excerpts.');}
  static async load(fetcher=fetch){const response=await fetcher('./assets/comic/excerpts.json');if(!response.ok)throw Error('Could not load the Book 2 excerpts.');return new ComicReader((await response.json()).pages);}
  select(){
    let pool=this.pages.filter(page=>!this.previous.includes(page.page));if(pool.length<2)pool=[...this.pages];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const selected=pool.slice(0,2);this.previous=selected.map(p=>p.page);return selected;
  }
}
