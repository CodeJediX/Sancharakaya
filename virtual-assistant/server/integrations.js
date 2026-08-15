const { ENABLE_NEARBY_OSM } = require("./config");
const { getPlace, normalize } = require("./kb");

function weatherCodeLabel(code) {
  const map = new Map([[0,"Clear sky"],[1,"Mainly clear"],[2,"Partly cloudy"],[3,"Overcast"],[45,"Fog"],[48,"Rime fog"],
    [51,"Light drizzle"],[53,"Drizzle"],[55,"Dense drizzle"],[61,"Light rain"],[63,"Rain"],[65,"Heavy rain"],
    [80,"Rain showers"],[81,"Rain showers"],[82,"Heavy showers"],[95,"Thunderstorm"],[96,"Thunderstorm with hail"],[99,"Thunderstorm with hail"]]);
  return map.get(Number(code)) || "Variable conditions";
}
async function getWeather(placeRef) {
  const place=getPlace(placeRef);
  if(!place) return {error:"Place not found in the grounded knowledge base."};
  const {lat,lng}=place.coordinates;
  const params=new URLSearchParams({
    latitude:String(lat),longitude:String(lng),timezone:"Asia/Colombo",forecast_days:"5",
    current:"temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
  });
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{headers:{"user-agent":"Sancharakaya/1.0"}});
  if(!response.ok) throw new Error(`Weather service HTTP ${response.status}.`);
  const data=await response.json();
  return {
    place_id:place.id,place:place.name,source:"Open-Meteo",source_url:"https://open-meteo.com/",
    current:data.current?{temperature_c:data.current.temperature_2m,apparent_temperature_c:data.current.apparent_temperature,
      precipitation_mm:data.current.precipitation,wind_kmh:data.current.wind_speed_10m,conditions:weatherCodeLabel(data.current.weather_code)}:null,
    daily:(data.daily?.time||[]).map((date,i)=>({date,conditions:weatherCodeLabel(data.daily.weather_code?.[i]),
      max_c:data.daily.temperature_2m_max?.[i],min_c:data.daily.temperature_2m_min?.[i],
      precipitation_probability_max:data.daily.precipitation_probability_max?.[i],
      sunrise:data.daily.sunrise?.[i],sunset:data.daily.sunset?.[i]}))
  };
}
async function getPlaceImage(place) {
  const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:`${place.name} Sri Lanka`,gsrnamespace:"6",
    gsrlimit:"5",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"900",format:"json",origin:"*"});
  try{
    const response=await fetch(`https://commons.wikimedia.org/w/api.php?${params}`,{headers:{"user-agent":"Sancharakaya/1.0"}});
    if(!response.ok) return null;
    const data=await response.json();
    const viable=Object.values(data.query?.pages||{}).map(page=>({page,info:page.imageinfo?.[0]}))
      .filter(item=>item.info?.thumburl&&!/map|logo|icon|flag/i.test(item.page.title||""));
    const item=viable[0]; if(!item) return null;
    const meta=item.info.extmetadata||{};
    return {url:item.info.thumburl,original_url:item.info.url,description_page:item.info.descriptionurl,title:item.page.title,
      license:meta.LicenseShortName?.value||null,artist:String(meta.Artist?.value||"").replace(/<[^>]+>/g,"").trim()||null,source:"Wikimedia Commons"};
  }catch{return null;}
}
async function enrichPlacesWithImages(items,limit=6){
  const unique=[...new Map((items||[]).map(place=>[place.id,place])).values()].slice(0,limit);
  const images=await Promise.all(unique.map(getPlaceImage));
  return unique.map((place,i)=>({...place,image:images[i]}));
}
function googleMapsSearchUrl(query){return `https://www.google.com/maps/search/?${new URLSearchParams({api:"1",query})}`;}
function googleMapsDirectionsUrl(origin,destination,travelmode=""){
  const params=new URLSearchParams({api:"1",origin:origin||"",destination:destination||""}); if(travelmode)params.set("travelmode",travelmode);
  return `https://www.google.com/maps/dir/?${params}`;
}
function trainScheduleAction(from,to){return {type:"train",label:"Open train schedules",url:"https://trainschedule.lk/",from:from||null,to:to||null,
  note:"Verify current schedules, seat availability and booking rules before travel."};}
function rideActions(placeRef, startingLocation = "") {
  const place = getPlace(placeRef);
  if (!place) return { error: "Destination not found." };

  const { lat, lng } = place.coordinates;
  const name = encodeURIComponent(place.name);
  const addr = encodeURIComponent(`${place.name}, Sri Lanka`);

  // Official Uber Sri Lanka ride page. Tracking parameters are intentionally omitted.
  const uberWebUrl = "https://www.uber.com/lk/en/ride/";

  // Mobile deep link: tries to open Uber with the destination pre-filled.
  const uberAppUrl =
    `uber://riderequest?pickup=my_location` +
    `&dropoff[latitude]=${lat}` +
    `&dropoff[longitude]=${lng}` +
    `&dropoff[nickname]=${name}` +
    `&dropoff[formatted_address]=${addr}`;

  return {
    type: "ride",
    destination: place.name,
    starting_location: startingLocation || null,
    uber_web_url: uberWebUrl,
    uber_app_url: uberAppUrl,
    maps_directions_url: googleMapsDirectionsUrl(
      startingLocation,
      `${place.name}, Sri Lanka`
    ),
    note:
      "Continue the ride request on Uber. Verify the pickup location, destination, vehicle and fare inside Uber before confirming. Sancharakaya does not book or charge for the ride."
  };
}
async function findNearby(placeRef,kind="restaurant",radiusM=5000){
  const place=getPlace(placeRef); if(!place)return{error:"Place not found."};
  const isStay=/(hotel|stay|accommodation|hostel|guest)/.test(normalize(kind));
  const fallbackQuery=isStay?`hotels near ${place.name}, Sri Lanka`:`restaurants near ${place.name}, Sri Lanka`;
  if(!ENABLE_NEARBY_OSM)return{place:place.name,kind:isStay?"accommodation":"restaurant",results:[],search_url:googleMapsSearchUrl(fallbackQuery),note:"Nearby OSM lookup disabled."};
  const {lat,lng}=place.coordinates, radius=Math.max(500,Math.min(10000,Number(radiusM||5000)));
  const filter=isStay?'["tourism"~"hotel|guest_house|hostel|motel"]':'["amenity"="restaurant"]';
  const query=`[out:json][timeout:12];nwr(around:${radius},${lat},${lng})${filter};out center tags 25;`;
  try{
    const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","user-agent":"Sancharakaya/1.0"},
      body:new URLSearchParams({data:query})});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const results=(data.elements||[]).filter(item=>item.tags?.name).slice(0,10).map(item=>({
      name:item.tags.name,kind:item.tags.tourism||item.tags.amenity||(isStay?"accommodation":"restaurant"),cuisine:item.tags.cuisine||null,
      website:item.tags.website||item.tags["contact:website"]||null,phone:item.tags.phone||item.tags["contact:phone"]||null,
      coordinates:{lat:item.lat||item.center?.lat||null,lng:item.lon||item.center?.lon||null}}));
    return {place:place.name,kind:isStay?"accommodation":"restaurant",results,source:"OpenStreetMap / Overpass API",
      search_url:googleMapsSearchUrl(fallbackQuery),note:"Discovery results only; not live availability, prices or endorsements."};
  }catch(error){
    return {place:place.name,kind:isStay?"accommodation":"restaurant",results:[],search_url:googleMapsSearchUrl(fallbackQuery),
      note:`Nearby lookup unavailable (${error.message}). Use the live map search link.`};
  }
}
function transportActions(placeRef,startingLocation=""){
  const place=getPlace(placeRef); if(!place)return{error:"Place not found."};
  return {destination:place.name,curated_notes:place.transport_notes,train_access:place.train_access,nearest_station:place.nearest_station,
    directions:{driving:googleMapsDirectionsUrl(startingLocation,`${place.name}, Sri Lanka`,"driving"),
      transit:googleMapsDirectionsUrl(startingLocation,`${place.name}, Sri Lanka`,"transit")},
    train_schedule:place.train_access?"https://trainschedule.lk/":null,
    note:"No current duration or fare is invented. Open live route/schedule services to verify."};
}
module.exports={getWeather,getPlaceImage,enrichPlacesWithImages,findNearby,googleMapsSearchUrl,googleMapsDirectionsUrl,trainScheduleAction,rideActions,transportActions};
