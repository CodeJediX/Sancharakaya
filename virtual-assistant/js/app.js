(() => {
  const API=(window.SANCHARAKAYA_CONFIG?.API_BASE_URL||"").replace(/\/+$/,"");
  const GOOGLE_CLIENT_ID=window.SANCHARAKAYA_CONFIG?.GOOGLE_CLIENT_ID||"";
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let chatHistory=[],lastItinerary=null,map=null,markers=[],mapCurrentItems=[],mapFilter="popular",currentUser=null,currentChatId=null;
  const popularPlaceIds=["sigiriya","kandy","ella","galle-fort","mirissa","yala","nuwara-eliya","anuradhapura","polonnaruwa","dambulla","colombo","trincomalee","arugam-bay","adams-peak","peradeniya","unawatuna"];
  const defaults={starting_location:"",days:5,group_type:"",group_size:2,language:"English",interests:[],hidden_gems:false};
  function loadJSON(k,f){try{return JSON.parse(localStorage.getItem(k)||"")||f}catch{return f}}
  function saveJSON(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function userKey(suffix){return currentUser?.email?`sancharakaya_${currentUser.email}_${suffix}`:`sancharakaya_guest_${suffix}`}
  function chatSessions(){return loadJSON(userKey("chatSessions"),[])}
  function saveChatSessions(sessions){saveJSON(userKey("chatSessions"),sessions)}
  let memory={...defaults,...loadJSON(userKey("memory"),{})},savedPlaces=loadJSON(userKey("savedPlaces"),[]);
  function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function fmt(v){return esc(v).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/^### (.+)$/gm,"<strong>$1</strong>").replace(/\n/g,"<br>")}

  function makeChatTitle(text="New chat"){const clean=String(text||"New chat").replace(/\s+/g," ").trim();return clean.length>36?clean.slice(0,36)+"...":clean}
  function renderChatSessions(){const select=$("#chatSessionSelect");if(!select)return;const sessions=chatSessions();select.innerHTML=sessions.map(s=>`<option value="${esc(s.id)}" ${s.id===currentChatId?"selected":""}>${esc(s.title||"Untitled chat")}</option>`).join("")||"<option>No previous chats</option>";select.disabled=!currentUser||!sessions.length;$("#deleteChatBtn").disabled=!currentUser||!sessions.length;$("#newChatBtn").disabled=!currentUser}
  function persistActiveChat(){if(!currentUser||!currentChatId)return;const sessions=chatSessions();const i=sessions.findIndex(s=>s.id===currentChatId);if(i<0)return;const firstUser=chatHistory.find(m=>m.role==="user")?.content;const autoTitle=["New Sri Lanka trip","First Sri Lanka trip","New chat"].includes(sessions[i].title);sessions[i]={...sessions[i],title:autoTitle?makeChatTitle(firstUser||sessions[i].title):sessions[i].title,messages:chatHistory,updatedAt:Date.now(),memory:{...memory}};saveChatSessions(sessions);renderChatSessions();renderProfile()}
  function createChat(seed="New Sri Lanka trip"){if(!currentUser)return;const sessions=chatSessions();const session={id:String(Date.now()),title:makeChatTitle(seed),createdAt:Date.now(),updatedAt:Date.now(),messages:[],memory:{...memory}};sessions.unshift(session);saveChatSessions(sessions);currentChatId=session.id;saveJSON(userKey("currentChatId"),currentChatId);chatHistory=[];$("#chatLog").innerHTML="";addMessage("bot","New chat started. Tell me what kind of Sri Lanka trip you want.");renderChatSessions();renderProfile()}
  function loadChat(id){const session=chatSessions().find(s=>s.id===id);if(!session)return;currentChatId=id;saveJSON(userKey("currentChatId"),id);chatHistory=session.messages||[];memory={...defaults,...(session.memory||memory)};fillProfile();$("#chatLog").innerHTML="";restoreChat();renderChatSessions();renderProfile()}
  function deleteCurrentChat(){if(!currentUser||!currentChatId)return;const sessions=chatSessions().filter(s=>s.id!==currentChatId);saveChatSessions(sessions);currentChatId=sessions[0]?.id||null;if(currentChatId)loadChat(currentChatId);else createChat("New Sri Lanka trip")}
  function decodeJwt(token){try{const payload=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(decodeURIComponent(atob(payload).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")))}catch{return null}}
  window.handleGoogleCredential=response=>{const profile=decodeJwt(response.credential);if(!profile?.email)return;currentUser={name:profile.name||"Traveler",email:profile.email,picture:profile.picture||""};saveJSON("sancharakayaCurrentUser",currentUser);afterSignIn()}
  function initAuth(tries=0){currentUser=loadJSON("sancharakayaCurrentUser",null);if(GOOGLE_CLIENT_ID&&window.google?.accounts?.id){google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:window.handleGoogleCredential});google.accounts.id.renderButton($("#googleSignInButton"),{theme:"outline",size:"large",text:"signin_with",shape:"pill"})}else if(GOOGLE_CLIENT_ID&&tries<20){setTimeout(()=>initAuth(tries+1),150);return}else{$("#googleSetupNotice")?.classList.remove("hidden")}currentUser?afterSignIn():(renderAuthState(),renderProfile())}
  function afterSignIn(){memory={...defaults,...loadJSON(userKey("memory"),{})};savedPlaces=loadJSON(userKey("savedPlaces"),savedPlaces);currentChatId=loadJSON(userKey("currentChatId"),null);const sessions=chatSessions();if(!sessions.length)createChat("First Sri Lanka trip");else loadChat(currentChatId||sessions[0].id);renderAuthState();renderProfile();renderSaved();renderDefaultMap()}
  function signOut(){currentUser=null;currentChatId=null;chatHistory=[];localStorage.removeItem("sancharakayaCurrentUser");$("#chatLog").innerHTML="";addMessage("bot","Please sign in with Google to use the AI travel assistant.");renderAuthState();renderProfile();renderChatSessions()}
  function renderAuthState(){const signed=!!currentUser;document.querySelector(".chat-panel")?.classList.toggle("chat-locked",!signed);$("#chatGate")?.classList.toggle("unlocked",signed);const mini=$("#authMiniCard");if(mini){mini.classList.toggle("signed-in",signed);mini.innerHTML=signed?`<strong>${esc(currentUser.name)}</strong><span>AI chat unlocked. Chats save to this browser profile.</span>`:`<strong>Sign in required</strong><span>Use Google Sign-In to unlock the AI guide and save chats.</span>`}$("#sendBtn").disabled=!signed;renderChatSessions()}
  function earnedBadges(){const sessions=chatSessions(),messages=sessions.flatMap(s=>s.messages||[]),interests=memory.interests||[];return [{icon:"AI",name:"AI Explorer",desc:"Start your first assistant chat.",earned:sessions.length>0&&messages.length>0},{icon:"MAP",name:"Route Builder",desc:"Generate or save an itinerary.",earned:!!lastItinerary?.plan?.length||!!loadJSON(userKey("itinerary"),null)?.plan?.length},{icon:"SAVE",name:"Place Collector",desc:"Save three or more destinations.",earned:savedPlaces.length>=3},{icon:"SAFE",name:"Safety Aware",desc:"Ask about safety, scams, or emergency help.",earned:messages.some(m=>/safe|scam|emergency|police|ambulance/i.test(m.content||""))},{icon:"FOOD",name:"Taste Seeker",desc:"Show interest in food or local meals.",earned:interests.includes("food")||messages.some(m=>/food|meal|curry|restaurant/i.test(m.content||""))},{icon:"ECO",name:"Responsible Traveler",desc:"Choose hidden gems or sustainable travel prompts.",earned:memory.hidden_gems||messages.some(m=>/sustainable|community|eco|local/i.test(m.content||""))}]}
  function renderProfile(){const badges=earnedBadges(),earned=badges.filter(b=>b.earned);if($("#profileName"))$("#profileName").textContent=currentUser?.name||"Guest traveler";if($("#profileEmail"))$("#profileEmail").textContent=currentUser?.email||"Sign in with Google to save your travel workspace.";const avatar=$("#profileAvatar");if(avatar)avatar.innerHTML=currentUser?.picture?`<img src="${esc(currentUser.picture)}" alt="">`:(currentUser?.name||"SK").slice(0,2).toUpperCase();if($("#profileChatCount"))$("#profileChatCount").textContent=chatSessions().length;if($("#profileSavedCount"))$("#profileSavedCount").textContent=savedPlaces.length;if($("#profileBadgeCount"))$("#profileBadgeCount").textContent=earned.length;const pills=$("#profileStatusPills");if(pills)pills.innerHTML=[currentUser?"Signed in":"Guest",`${memory.days||5} days`,...(memory.interests||[]).slice(0,3)].map(x=>`<span>${esc(x)}</span>`).join("");const grid=$("#badgeGrid");if(grid)grid.innerHTML=badges.map(b=>`<article class="badge-card ${b.earned?"":"locked"}"><div class="badge-icon">${esc(b.icon)}</div><strong>${esc(b.name)}</strong><p>${esc(b.desc)}</p><small>${b.earned?"Earned":"Locked"}</small></article>`).join("")}

  async function apiFetch(path,options={},timeoutMs=18000){
    if(!API)throw new Error("BACKEND_NOT_CONFIGURED");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(`${API}${path}`,{...options,signal:controller.signal});
      const text=await r.text();
      let data={};
      if(text){try{data=JSON.parse(text)}catch{data={error:text.slice(0,240)}}}
      if(!r.ok){const err=new Error(data.error||`HTTP ${r.status}`);err.status=r.status;err.code=data.code;throw err}
      return data;
    }catch(error){
      if(error.name==="AbortError")throw new Error("REQUEST_TIMEOUT");
      throw error;
    }finally{clearTimeout(timer)}
  }
  async function loadStaticPlaces(){
    if(window.__sancharakayaStaticPlaces)return window.__sancharakayaStaticPlaces;
    try{
      const r=await fetch("data/places.json",{cache:"force-cache"});
      window.__sancharakayaStaticPlaces=r.ok?await r.json():[];
    }catch{window.__sancharakayaStaticPlaces=[]}
    return window.__sancharakayaStaticPlaces;
  }
  function localPlaceMatches(places,query=""){
    const q=String(query||"").toLowerCase().trim(),interests=memory.interests||[];
    return places.filter(p=>{
      const hay=[p.name,p.region,p.district,p.summary,p.heritage_culture,...(p.categories||[]),...(p.vibes||[])].join(" ").toLowerCase();
      const queryOk=!q||hay.includes(q);
      const interestOk=!interests.length||interests.some(i=>hay.includes(String(i).toLowerCase()));
      const hiddenOk=!memory.hidden_gems||p.hidden_gem;
      return queryOk&&interestOk&&hiddenOk;
    }).slice(0,12);
  }
  function mapFilteredPlaces(places){
    const all=(places||[]).filter(p=>p.coordinates);
    if(mapFilter==="saved")return savedPlaces.filter(p=>p.coordinates);
    if(mapFilter==="popular")return popularPlaceIds.map(id=>all.find(p=>p.id===id)).filter(Boolean);
    return all.filter(p=>{
      const hay=[...(p.categories||[]),...(p.vibes||[]),p.region,p.summary].join(" ").toLowerCase();
      return hay.includes(mapFilter);
    }).slice(0,18);
  }
  async function staticAssistantReply(prompt){
    const places=await loadStaticPlaces(),matches=localPlaceMatches(places,prompt).slice(0,3);
    const lower=String(prompt||"").toLowerCase();
    if(/emergency|police|ambulance|help|scam|safe|safety/.test(lower)){
      return "Offline travel guide mode: for urgent help in Sri Lanka call Police 119, Suwa Seriya ambulance 1990, Tourism Hotline 1912, or Tourist Police 011 242 1052. For scams, avoid pressure sales, confirm prices before rides or tours, use official ticket counters, and keep your hotel or trusted contact updated.";
    }
    if(/weather|rain|forecast/.test(lower)){
      return "Offline travel guide mode: live weather needs the Gemini backend. For planning, check the current local forecast before travel, avoid exposed hikes during heavy rain or lightning, and keep flexible backup stops for hill-country and coastal routes.";
    }
    if(matches.length){
      return `Offline travel guide mode: here are good matches from the built-in Sri Lanka guide:\n\n${matches.map(p=>`**${p.name}** (${p.region}) - ${p.summary}`).join("\n\n")}\n\nLive AI itinerary changes, weather, and nearby discovery will activate after the production backend URL is connected.`;
    }
    return "Offline travel guide mode: I can still help with Sri Lanka routes, safety basics, fair-price awareness, etiquette, and saved destinations from the built-in guide. For live Gemini answers, deploy the backend and set the production API URL.";
  }
  function setTheme(theme,notifyParent=true){const isDark=theme==="dark";document.documentElement.classList.toggle("dark",isDark);localStorage.setItem("sancharakayaTheme",isDark?"dark":"light");const b=$("#themeBtn");if(b){b.textContent=isDark?"Light":"Dark";b.setAttribute("aria-label",isDark?"Switch to light mode":"Switch to dark mode")}if(notifyParent&&window.parent!==window)window.parent.postMessage({type:"sancharakaya-theme-change",theme:isDark?"dark":"light"},window.location.origin)}
  function initTheme(){setTheme(localStorage.getItem("sancharakayaTheme")==="dark"?"dark":"light",false);$("#themeBtn").onclick=()=>setTheme(document.documentElement.classList.contains("dark")?"light":"dark");window.addEventListener("message",event=>{if(event.origin!==window.location.origin)return;const theme=event.data?.theme;if(event.data?.type==="sancharakaya-theme"&&(theme==="dark"||theme==="light"))setTheme(theme,false);if(event.data?.type==="sancharakaya-send-prompt"&&event.data.prompt)sendChat(event.data.prompt)})}
  function openTab(id){$$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));$$(".page").forEach(x=>x.classList.toggle("active",x.id===id));if(id==="saved")renderSaved();if(id==="profile")renderProfile();if(id==="explore"&&!$("#exploreGrid").children.length)explore("");if(id==="itinerary")renderItinerary(lastItinerary||loadJSON(userKey("itinerary"),null));setTimeout(()=>map?.invalidateSize(),80)}
  function initTabs(){$$(".tab").forEach(x=>x.onclick=()=>openTab(x.dataset.tab))}
  function fillProfile(){
    $("#profileStart").value=memory.starting_location||"";$("#profileDays").value=memory.days||5;$("#profileGroup").value=memory.group_type||"";
    $("#profileGroupSize").value=memory.group_size||2;$("#profileLanguage").value=memory.language||"English";$("#profileBudget").value=memory.daily_budget_lkr||"";
    $("#profileHidden").checked=!!memory.hidden_gems;$$(".interest").forEach(x=>x.checked=(memory.interests||[]).includes(x.value));renderMemory();
  }
  function readProfile(){
    memory={...memory,starting_location:$("#profileStart").value.trim(),days:Number($("#profileDays").value||5),group_type:$("#profileGroup").value,
      group_size:Number($("#profileGroupSize").value||1),language:$("#profileLanguage").value,daily_budget_lkr:Number($("#profileBudget").value||0)||undefined,
      interests:$$(".interest:checked").map(x=>x.value),hidden_gems:$("#profileHidden").checked};
    Object.keys(memory).forEach(k=>memory[k]===undefined&&delete memory[k]);saveJSON(userKey("memory"),memory);renderMemory();persistActiveChat();
  }
  function bindProfile(){
    ["profileStart","profileDays","profileGroup","profileGroupSize","profileLanguage","profileBudget","profileHidden"].forEach(id=>$("#"+id).addEventListener("change",readProfile));
    $$(".interest").forEach(x=>x.addEventListener("change",readProfile));
    $("#clearMemoryBtn").onclick=()=>{memory={...defaults};chatHistory=[];saveJSON(userKey("memory"),memory);fillProfile();$("#chatLog").innerHTML="";addMessage("bot","Memory cleared. Tell me what kind of Sri Lanka trip you want.");persistActiveChat()};
  }
  function renderMemory(){const p=[];if(memory.starting_location)p.push(`From ${memory.starting_location}`);if(memory.days)p.push(`${memory.days} days`);if(memory.group_type)p.push(memory.group_type);if(memory.daily_budget_lkr)p.push(`LKR ${Number(memory.daily_budget_lkr).toLocaleString()}/day`);if(memory.interests?.length)p.push(...memory.interests.slice(0,4));if(memory.hidden_gems)p.push("hidden gems");$("#memoryPills").innerHTML=p.map(x=>`<span>${esc(x)}</span>`).join("")}
  async function checkBackend(){const b=$("#backendBadge");if(!API){const places=await loadStaticPlaces();b.className="status-badge ok";b.textContent=`Offline guide ready · ${places.length||34} places`;return}try{const d=await apiFetch("/api/health",{},10000);b.className=`status-badge ${d.ai_configured?"ok":"error"}`;b.textContent=d.ai_configured?`Assistant ready · ${d.knowledge_base_places} places`:"Travel tools ready"}catch{const places=await loadStaticPlaces();b.className="status-badge ok";b.textContent=`Offline guide ready · ${places.length||34} places`}}
  function addMessage(sender,text){const n=document.createElement("div");n.className=`msg ${sender}`;n.innerHTML=sender==="bot"?fmt(text):esc(text);$("#chatLog").appendChild(n);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;return n}
  function typing(){const n=document.createElement("div");n.className="msg bot";n.id="typingMessage";n.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';$("#chatLog").appendChild(n);$("#chatLog").scrollTop=$("#chatLog").scrollHeight}
  function stopTyping(){$("#typingMessage")?.remove()}
  async function sendChat(text){
    if(!currentUser){addMessage("bot","Please sign in with Google before using the AI assistant.");openTab("profile");return}
    const prompt=String(text||"").trim();if(!prompt)return;readProfile();addMessage("user",prompt);chatHistory.push({role:"user",content:prompt});if(chatHistory.length>18)chatHistory=chatHistory.slice(-18);persistActiveChat();typing();$("#sendBtn").disabled=true;
    if(!API){
      try{const reply=await staticAssistantReply(prompt);stopTyping();addMessage("bot",reply);chatHistory.push({role:"assistant",content:reply});persistActiveChat()}
      finally{$("#sendBtn").disabled=false}
      return;
    }
    try{
      const d=await apiFetch("/api/agent/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:chatHistory,memory})},45000);stopTyping();memory={...memory,...(d.memory||{})};saveJSON(userKey("memory"),memory);fillProfile();addMessage("bot",d.text||"No response.");chatHistory.push({role:"assistant",content:d.text||""});persistActiveChat();renderDeck(d);
      if(d.itinerary){lastItinerary=d.itinerary;saveJSON(userKey("itinerary"),d.itinerary)}if(d.budget)saveJSON(userKey("budget"),d.budget);
    }catch(e){stopTyping();const msg=String(e.message||e);const busy=/high demand|temporarily|503|unavailable|REQUEST_TIMEOUT/i.test(msg);const config=/BACKEND_NOT_CONFIGURED|AI_NOT_CONFIGURED|GEMINI_API_KEY|API key not valid|API_KEY_INVALID|not configured/i.test(msg);addMessage("bot",config?`Sancharakaya AI is not connected to a production backend yet. Saved destinations, maps, and the offline guide still work; deploy the Node/Gemini backend and set PRODUCTION_API_BASE_URL for GitHub Pages.`:busy?`Sancharakaya AI is temporarily unavailable. You can continue using the offline Sri Lanka travel guide and saved trip tools.`:`I could not complete that request right now. Your saved trip information remains available.`)}finally{$("#sendBtn").disabled=false}
  }
  function renderDeck(d){renderWeather(d.weather||[]);renderPlaces(d.places||[],$("#placeDeck"));renderNearby(d.nearby||[]);renderActions(d.actions||[]);const pts=[];(d.places||[]).forEach(p=>p.coordinates&&pts.push(p));(d.itinerary?.plan||[]).forEach(x=>x.coordinates&&pts.push({name:x.name,coordinates:x.coordinates}));updateMap(pts)}
  function renderWeather(items){$("#weatherDeck").innerHTML=items.map(x=>`<article class="weather-card"><strong>${esc(x.place)}</strong><div class="weather-now"><div><div class="weather-temp">${x.current?.temperature_c??"—"}°C</div><small>${esc(x.current?.conditions||"")}</small></div><small>Feels ${x.current?.apparent_temperature_c??"—"}°C<br>Wind ${x.current?.wind_kmh??"—"} km/h</small></div><small>Source: Open-Meteo · 5-day forecast available</small></article>`).join("")}
  function sourceLink(p){const s=p.sources?.[0];return s?`<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener">Source: ${esc(s.label)}</a>`:""}
  function renderPlaces(items,container){
    container.innerHTML=items.map(p=>{const image=p.image?.url?`<img class="place-image" src="${esc(p.image.url)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="place-fallback">${esc(p.name.split(" ")[0])}</div>`;const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+", Sri Lanka")}`;const saved=savedPlaces.some(x=>x.id===p.id);return `<article class="place-card">${image}<div class="place-body"><div class="place-meta"><span class="chip">${esc(p.region)}</span>${p.hidden_gem?'<span class="chip">Hidden gem</span>':""}<span class="chip">${esc(p.visit_duration_hours)}h</span></div><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p><p><strong>Culture:</strong> ${esc(p.heritage_culture)}</p>${sourceLink(p)}<div class="place-actions"><button data-focus-map="${esc(p.id||p.name)}">Show on map</button><button data-weather="${esc(p.name)}">Weather</button><a href="${mapUrl}" target="_blank" rel="noopener">Map</a><button data-save="${esc(p.id)}">${saved?"Saved ✓":"Save"}</button></div></div></article>`}).join("");
    container.querySelectorAll("[data-focus-map]").forEach(b=>b.onclick=()=>focusMapPlace(b.dataset.focusMap));
    container.querySelectorAll("[data-weather]").forEach(b=>b.onclick=()=>sendChat(`Show me the current weather and next few days for ${b.dataset.weather}.`));
    container.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const p=items.find(x=>x.id===b.dataset.save);if(!p)return;toggleSave(p);b.textContent=savedPlaces.some(x=>x.id===p.id)?"Saved ✓":"Save";if(mapFilter==="saved")renderDefaultMap()});
  }
  function toggleSave(p){const i=savedPlaces.findIndex(x=>x.id===p.id);i>=0?savedPlaces.splice(i,1):savedPlaces.push(p);saveJSON(userKey("savedPlaces"),savedPlaces);renderProfile()}
  function renderNearby(blocks){$("#nearbyDeck").innerHTML=blocks.map(b=>`<div class="nearby-block"><strong>${esc(b.kind||"Nearby")} near ${esc(b.place||"")}</strong><div class="nearby-list">${(b.results||[]).slice(0,8).map(x=>`<div class="nearby-item"><strong>${esc(x.name)}</strong><br><span>${esc(x.cuisine||x.kind||"")}</span></div>`).join("")||"<span>No named results returned.</span>"}</div>${b.search_url?`<a class="source-link" href="${esc(b.search_url)}" target="_blank" rel="noopener">Open live map search →</a>`:""}</div>`).join("")}
  function renderActions(actions){const btn=[];for(const a of actions){if(a.type==="train"&&a.url)btn.push(["Train schedules",a.url]);if(a.type==="ride"){if(a.uber_web_url)btn.push(["Open Uber",a.uber_web_url]);if(a.uber_app_url)btn.push(["Open Uber App",a.uber_app_url]);if(a.maps_directions_url)btn.push(["View Route",a.maps_directions_url])}if(a.type==="transport"){if(a.directions?.driving)btn.push(["Driving route",a.directions.driving]);if(a.directions?.transit)btn.push(["Transit route",a.directions.transit]);if(a.train_schedule)btn.push(["Train schedules",a.train_schedule])}}$("#actionDeck").innerHTML=btn.map(([l,u])=>`<a class="action-btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} →</a>`).join("")}
  function markerIcon(index,type="popular"){return L.divIcon({className:"",html:`<div class="map-marker ${type}"><span>${index}</span></div>`,iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-25]})}
  function mapPopup(p,index){const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+", Sri Lanka")}`;return `<div class="map-popup"><h3>${index}. ${esc(p.name)}</h3><p>${esc(p.region||"Sri Lanka")} · ${esc(p.best_time_of_day||"Plan with local timing")}</p><p>${esc(p.summary||"Popular Sri Lanka travel stop.")}</p><a href="${mapUrl}" target="_blank" rel="noopener">Open map</a><button type="button" data-popup-weather="${esc(p.name)}">Weather</button></div>`}
  function renderMapList(items){const el=$("#mapPlaceList");if(!el)return;el.innerHTML=items.slice(0,16).map((p,i)=>`<button class="map-place-item" data-map-place="${esc(p.id||p.name)}" type="button"><span class="map-rank">${i+1}</span><span><strong>${esc(p.name)}</strong><span>${esc(p.region||"Sri Lanka")}</span></span><small>${p.hidden_gem?"Hidden":"Popular"}</small></button>`).join("");el.querySelectorAll("[data-map-place]").forEach(b=>b.onclick=()=>focusMapPlace(b.dataset.mapPlace))}
  function focusMapPlace(id){const item=mapCurrentItems.find(p=>(p.id||p.name)===id);if(!map||!item?.coordinates)return;map.setView([item.coordinates.lat,item.coordinates.lng],11,{animate:true});const marker=markers.find(m=>m.options.placeId===id);marker?.openPopup()}
  function updateMap(items,type="route"){if(!map)return;markers.forEach(m=>m.remove());markers=[];const bounds=[],unique=[...new Map((items||[]).filter(x=>x.coordinates).map(x=>[`${x.coordinates.lat},${x.coordinates.lng}`,x])).values()];mapCurrentItems=unique;unique.forEach((x,i)=>{const{lat,lng}=x.coordinates,m=L.marker([lat,lng],{icon:markerIcon(i+1,type),placeId:x.id||x.name}).addTo(map).bindPopup(mapPopup(x,i+1));m.on("popupopen",e=>setTimeout(()=>e.popup.getElement()?.querySelector("[data-popup-weather]")?.addEventListener("click",()=>sendChat(`Show me the current weather and next few days for ${x.name}.`)),0));markers.push(m);bounds.push([lat,lng])});renderMapList(unique);if(!unique.length){$("#mapEmpty").style.display="block";$("#mapEmpty").textContent=mapFilter==="saved"?"Save places to see them here.":"No places match this map filter.";map.setView([7.8731,80.7718],7);return}bounds.length===1?map.setView(bounds[0],11):map.fitBounds(bounds,{padding:[25,25]});$("#mapEmpty").style.display="none"}
  async function renderDefaultMap(){updateMap(mapFilteredPlaces(await loadStaticPlaces()),mapFilter==="popular"?"popular":"route")}
  function initMap(){if(!window.L)return;map=L.map("map",{zoomControl:true,scrollWheelZoom:false}).setView([7.8731,80.7718],7);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);$(".map-tools")?.querySelectorAll("[data-map-filter]").forEach(b=>b.onclick=()=>{mapFilter=b.dataset.mapFilter;$$(".map-tools button").forEach(x=>x.classList.toggle("active",x===b));renderDefaultMap()});renderDefaultMap()}
  async function explore(q){$("#exploreGrid").innerHTML='<div class="empty-state">Searching grounded destination records...</div>';try{if(!API){renderPlaces(localPlaceMatches(await loadStaticPlaces(),q),$("#exploreGrid"));return}const p=new URLSearchParams({q:q||""});if(memory.hidden_gems)p.set("hidden","true");if(memory.interests?.length)p.set("interests",memory.interests.join(","));const d=await apiFetch(`/api/places?${p}`,{},18000);renderPlaces(d.matches||[],$("#exploreGrid"))}catch(e){$("#exploreGrid").innerHTML=`<div class="empty-state">Destination search is unavailable right now. Saved places and the main planner still work.</div>`}}
  function renderSaved(){savedPlaces.length?renderPlaces(savedPlaces,$("#savedGrid")):$("#savedGrid").innerHTML='<div class="empty-state"><h3>No saved places</h3><p>Save destination cards from AI Guide or Explore.</p></div>'}
  function renderItinerary(plan){lastItinerary=plan||lastItinerary;const view=$("#itineraryView"),empty=$("#itineraryEmpty");if(!lastItinerary?.plan?.length){empty.classList.remove("hidden");view.innerHTML="";return}empty.classList.add("hidden");view.innerHTML=lastItinerary.plan.map(d=>`<article class="day-card"><div class="day-number">D${d.day}</div><div><h3>${esc(d.name)}</h3><p>${esc(d.region)} · ${esc(d.best_time_of_day)} · ${esc(d.suggested_visit_duration)}</p><p>${esc(d.why_it_fits)}</p><div class="day-tags">${(d.focus||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div></div><div class="day-actions"><a class="secondary-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name+", Sri Lanka")}">Map</a></div></article>`).join("");updateMap(lastItinerary.plan.map(d=>({name:d.name,coordinates:d.coordinates})));renderBudget(loadJSON(userKey("budget"),null));renderProfile()}
  function renderBudget(b){const c=$("#budgetCard");if(!b?.available){c.classList.add("hidden");return}c.classList.remove("hidden");c.innerHTML=`<span class="eyebrow">USER BUDGET ENVELOPE</span><h3>LKR ${Number(b.trip_budget_envelope).toLocaleString()} total</h3><p>This allocates the budget you supplied; it is not live market pricing.</p><div class="budget-grid">${Object.entries(b.suggested_allocation||{}).map(([k,v])=>`<div><strong>${esc(k)}</strong><span>LKR ${Number(v).toLocaleString()}</span></div>`).join("")}</div>`}
  async function generatePlan(){readProfile();const ints=memory.interests?.length?memory.interests.join(", "):"a balanced mix",budget=memory.daily_budget_lkr?` My daily budget per person is LKR ${memory.daily_budget_lkr}.`:"";const p=`Build a ${memory.days||5}-day Sri Lanka itinerary starting from ${memory.starting_location||"Colombo"}. Interests: ${ints}. Group: ${memory.group_type||"traveler"} (${memory.group_size||1} people). Hidden gems: ${memory.hidden_gems?"yes":"no"}.${budget}`;openTab("guide");await sendChat(p);setTimeout(()=>openTab("itinerary"),250)}
  function shareTrip(){const trip=lastItinerary||loadJSON(userKey("itinerary"),null);if(!trip)return alert("Generate an itinerary first.");const payload=btoa(unescape(encodeURIComponent(JSON.stringify(trip)))),url=`${location.origin}${location.pathname}#trip=${payload}`;navigator.clipboard?.writeText(url).then(()=>alert("Share link copied."))}
  function loadShared(){if(!location.hash.startsWith("#trip="))return;try{lastItinerary=JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(6)))));saveJSON(userKey("itinerary"),lastItinerary)}catch{}}
  function bindUI(){
    $("#newChatBtn").onclick=()=>createChat("New Sri Lanka trip");$("#deleteChatBtn").onclick=deleteCurrentChat;$("#chatSessionSelect").onchange=e=>loadChat(e.target.value);$("#signOutBtn").onclick=signOut;
    $("#chatForm").onsubmit=e=>{e.preventDefault();const i=$("#chatInput"),t=i.value.trim();i.value="";sendChat(t)};
    $$(".quick-prompts [data-prompt]").forEach(b=>b.onclick=()=>sendChat(b.dataset.prompt));
    $("#exploreBtn").onclick=()=>explore($("#exploreInput").value.trim());$("#exploreInput").onkeydown=e=>e.key==="Enter"&&explore(e.currentTarget.value.trim());
    $("#generatePlanBtn").onclick=generatePlan;$("#shareTripBtn").onclick=shareTrip;$("#printTripBtn").onclick=()=>window.print();
    $("#clearSavedBtn").onclick=()=>{savedPlaces=[];saveJSON(userKey("savedPlaces"),savedPlaces);renderSaved();renderProfile()};
  }
  function restoreChat(){if(!currentUser){addMessage("bot","Please sign in with Google to use the AI travel assistant.");return}if(chatHistory.length)chatHistory.slice(-8).forEach(x=>addMessage(x.role==="user"?"user":"bot",x.content));else addMessage("bot","Ayubowan! I’m Sancharakaya. Tell me what kind of Sri Lanka trip you want — I’ll remember your preferences and use grounded tools when I need facts or live data.")}
  function serviceWorker(){if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{})}
  async function init(){initTheme();initTabs();bindProfile();fillProfile();bindUI();loadShared();initMap();serviceWorker();initAuth();await checkBackend();setTimeout(()=>$("#preloader").classList.add("hide"),450)}
  init();
})();
