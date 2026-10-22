const engines = Object.freeze({Google:'https://www.google.com/search',Bing:'https://www.bing.com/search',DuckDuckGo:'https://duckduckgo.com/', 'Internet Archive':'https://archive.org/advancedsearch.php'});
export function searchLinks(query){
 if(typeof query!=='string'||!query.trim())throw Error('Enter a public title, citation, or search phrase.');
 if(query.length>1000)throw Error('Keep the search query below 1,000 characters.');
 return Object.entries(engines).map(([name,base])=>{const url=new URL(base);url.searchParams.set('q',query.trim());return {name,url:url.href};});
}
