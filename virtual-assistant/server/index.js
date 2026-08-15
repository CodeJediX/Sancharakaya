const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const {PORT,ALLOWED_ORIGIN,GEMINI_API_KEY}=require("./config");
const {runAgent,resolveModel}=require("./agent");
const {searchPlaces,getPlace,buildItinerary,budgetFromUserInput,places}=require("./kb");
const {getWeather,enrichPlacesWithImages}=require("./integrations");

const ROOT=path.resolve(__dirname,".."),MAX_BODY=1_000_000;
function cors(){return{"access-control-allow-origin":ALLOWED_ORIGIN,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","cache-control":"no-store"}}
function sendJson(res,status,payload){res.writeHead(status,{...cors(),"content-type":"application/json; charset=utf-8"});res.end(JSON.stringify(payload))}
function readBody(req){return new Promise((resolve,reject)=>{let body="";req.setEncoding("utf8");req.on("data",chunk=>{body+=chunk;if(body.length>MAX_BODY){reject(new Error("Request body too large."));req.destroy()}});req.on("end",()=>resolve(body));req.on("error",reject)})}
function safePath(urlPath){
  const clean=decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const rel=clean||"index.html";
  const allowed=rel==="index.html"||rel==="manifest.webmanifest"||rel==="sw.js"||
    rel.startsWith("css/")||rel.startsWith("js/")||rel.startsWith("assets/");
  if(!allowed||rel.includes(".."))return null;
  const full=path.resolve(ROOT,rel);
  return full===ROOT||full.startsWith(ROOT+path.sep)?full:null;
}
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".webmanifest":"application/manifest+json"};
function serveStatic(req,res){const file=safePath(req.url);if(!file||!fs.existsSync(file)||fs.statSync(file).isDirectory()){const fallback=path.join(ROOT,"index.html");res.writeHead(200,{"content-type":MIME[".html"],"cache-control":"no-cache"});fs.createReadStream(fallback).pipe(res);return}const ext=path.extname(file).toLowerCase();const noCache=ext===".html"||ext===".js"||path.basename(file)==="sw.js";res.writeHead(200,{"content-type":MIME[ext]||"application/octet-stream","cache-control":noCache?"no-store":"public, max-age=3600"});fs.createReadStream(file).pipe(res)}

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){res.writeHead(204,cors());res.end();return}
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  try{
    if(req.method==="GET"&&url.pathname==="/api/health"){
      const model=GEMINI_API_KEY?await resolveModel():null;
      sendJson(res,200,{ok:true,service:"Sancharakaya Full AI Agent",ai_configured:Boolean(GEMINI_API_KEY),provider:"Google Gemini",model,knowledge_base_places:places.length,
        features:["agent-tools","session-memory","grounded-place-retrieval","itinerary","weather","wikimedia-images","nearby-food-stays","maps","train-handoff","ride-handoff","budget-envelope","multilingual","hidden-gems","trip-share-export"]});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/places"){
      const result=searchPlaces({query:url.searchParams.get("q")||"",interests:(url.searchParams.get("interests")||"").split(",").filter(Boolean),region:url.searchParams.get("region")||"",hidden_gems:url.searchParams.get("hidden")==="true",limit:12});
      result.matches=await enrichPlacesWithImages(result.matches,8);sendJson(res,200,result);return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/api/place/")){
      const id=url.pathname.split("/").pop(),place=getPlace(id);if(!place){sendJson(res,404,{error:"Place not found."});return}
      const [enriched]=await enrichPlacesWithImages([place],1);sendJson(res,200,enriched);return;
    }
    if(req.method==="GET"&&url.pathname==="/api/weather"){
      const ref=url.searchParams.get("place");if(!ref){sendJson(res,400,{error:"Missing place parameter."});return}
      const result=await getWeather(ref);sendJson(res,result.error?404:200,result);return;
    }
    if(req.method==="POST"&&url.pathname==="/api/itinerary"){sendJson(res,200,buildItinerary(JSON.parse((await readBody(req))||"{}")));return}
    if(req.method==="POST"&&url.pathname==="/api/budget"){sendJson(res,200,budgetFromUserInput(JSON.parse((await readBody(req))||"{}")));return}
    if(req.method==="POST"&&url.pathname==="/api/agent/chat"){
      const body=JSON.parse((await readBody(req))||"{}"),result=await runAgent({messages:Array.isArray(body.messages)?body.messages:[],memory:body.memory||{}});
      const status=result.error?(result.retryable?503:500):200;sendJson(res,status,result);return;
    }
    if(req.method==="GET"&&url.pathname.startsWith("/api/")){sendJson(res,404,{error:"API route not found."});return}
    if(req.method==="GET"){serveStatic(req,res);return}
    sendJson(res,404,{error:"Not found."});
  }catch(error){sendJson(res,500,{error:error.message})}
});
server.listen(PORT,()=>{console.log(`Sancharakaya Full AI Agent running at http://localhost:${PORT}`);console.log(`AI configured: ${GEMINI_API_KEY?"yes — Google Gemini":"no — add GEMINI_API_KEY to .env"}`)});
