let bRouteLine=null;
let bRouteBox=null;
let bMode='car';

function bGetLatLngFromMarker(m){
  if(!m)return null;
  try{const p=m.getLatLng();return {lat:p.lat,lon:p.lng};}catch(e){return null;}
}
function bStartPoint(){const p=bGetLatLngFromMarker(meMarker);if(p)return p;if(typeof HOME!=='undefined')return {lat:HOME.lat,lon:HOME.lon};return null;}
function bDestination(){const p=bGetLatLngFromMarker(marker);if(p)return p;return null;}
function bMiles(a,b){const R=3958.8;const dLat=(b.lat-a.lat)*Math.PI/180;const dLon=(b.lon-a.lon)*Math.PI/180;const lat1=a.lat*Math.PI/180;const lat2=b.lat*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

function bMakeRouteUI(){
  const panel=document.querySelector('.panel');
  if(!panel)return;
  const modes=document.createElement('div');
  modes.style.marginTop='10px';
  modes.style.display='flex';
  modes.style.gap='6px';
  modes.style.flexWrap='wrap';
  modes.innerHTML='<button data-mode="car">🚗 Car</button><button data-mode="walk">🚶 Walk</button><button data-mode="bike">🚲 Bike</button><button data-mode="bus">🚌 Bus</button><button data-mode="subway">🚇 Subway</button>';
  panel.appendChild(modes);
  Array.from(modes.querySelectorAll('button')).forEach(btn=>{btn.style.border='0';btn.style.borderRadius='999px';btn.style.padding='8px 10px';btn.style.background='rgba(255,255,255,.13)';btn.style.color='white';btn.style.fontWeight='800';btn.onclick=()=>{bMode=btn.dataset.mode;Array.from(modes.querySelectorAll('button')).forEach(b=>b.style.background='rgba(255,255,255,.13)');btn.style.background='#0b84ff';title.textContent='Mode: '+btn.textContent;info.textContent='Choose destination, then tap Navigate.';};});
  modes.querySelector('[data-mode="car"]').style.background='#0b84ff';
  const row=document.createElement('div');
  row.style.marginTop='10px';
  row.innerHTML='<button id="bNavigateBtn" style="border:0;border-radius:999px;padding:10px 14px;background:#0b84ff;color:white;font-weight:800;margin-right:8px">Navigate</button><button id="bClearRouteBtn" style="border:0;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.14);color:white;font-weight:800">Clear route</button>';
  panel.appendChild(row);
  bRouteBox=document.createElement('div');bRouteBox.style.display='none';bRouteBox.style.marginTop='10px';bRouteBox.style.maxHeight='180px';bRouteBox.style.overflow='auto';panel.appendChild(bRouteBox);
  document.getElementById('bNavigateBtn').onclick=bNavigate;
  document.getElementById('bClearRouteBtn').onclick=bClearRoute;
}
function bStepText(step){const m=step.maneuver||{};let text=(m.type||'continue')+' '+(m.modifier||'');if(step.name)text+=' on '+step.name;return text.replace(/_/g,' ').trim();}
function bFallback(start,end,label){const miles=bMiles(start,end);const mins=bMode==='walk'?Math.max(1,Math.round(miles/3*60)):bMode==='bike'?Math.max(1,Math.round(miles/10*60)):Math.max(2,Math.round(miles/12*60));if(bRouteLine)map.removeLayer(bRouteLine);bRouteLine=L.polyline([[start.lat,start.lon],[end.lat,end.lon]],{weight:5,opacity:.9,color:'#35d0ff',dashArray:'8,10'}).addTo(map);map.fitBounds(bRouteLine.getBounds(),{padding:[45,45]});title.textContent=label;info.textContent=miles.toFixed(2)+' miles · about '+mins+' min';bRouteBox.innerHTML='<div style="font-weight:800;margin-bottom:6px">'+label+'</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">1. Follow the blue dashed line toward the destination.</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">2. For buildings, campuses, bus stops, and subway exits, exact driving routes may not exist.</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">3. Bus/subway mode needs live transit data; this version shows nearby guidance only.</div>';bRouteBox.style.display='block';}
async function bNavigate(){const start=bStartPoint();const end=bDestination();if(!end){title.textContent='Choose destination';info.textContent='Search or tap a place first.';return;}if(!start){title.textContent='No start location';info.textContent='Tap location first, or use Home as fallback.';return;}if(bMode==='walk'){bFallback(start,end,'Walking route');return;}if(bMode==='bike'){bFallback(start,end,'Bike route');return;}if(bMode==='bus'){bFallback(start,end,'Bus guidance');return;}if(bMode==='subway'){bFallback(start,end,'Subway guidance');return;}title.textContent='Routing...';info.textContent='Calculating car route.';try{const url='https://router.project-osrm.org/route/v1/driving/'+start.lon+','+start.lat+';'+end.lon+','+end.lat+'?overview=full&geometries=geojson&steps=true';const res=await fetch(url);const data=await res.json();if(!data.routes||!data.routes.length)throw new Error('no route');const route=data.routes[0];const points=route.geometry.coordinates.map(c=>[c[1],c[0]]);if(bRouteLine)map.removeLayer(bRouteLine);bRouteLine=L.polyline(points,{weight:6,opacity:.95,color:'#0b84ff'}).addTo(map);map.fitBounds(bRouteLine.getBounds(),{padding:[40,40]});const miles=(route.distance/1609.34).toFixed(1);const mins=Math.round(route.duration/60);title.textContent='Car route';info.textContent=miles+' miles · about '+mins+' min';const steps=route.legs[0].steps.slice(0,12);let html='<div style="font-weight:800;margin-bottom:6px">Steps</div>';for(let i=0;i<steps.length;i++){html+='<div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">'+(i+1)+'. '+bStepText(steps[i])+' · '+(steps[i].distance/1609.34).toFixed(1)+' mi</div>';}bRouteBox.innerHTML=html;bRouteBox.style.display='block';}catch(e){bFallback(start,end,'Nearby guidance');}}
function bClearRoute(){if(bRouteLine){map.removeLayer(bRouteLine);bRouteLine=null;}if(bRouteBox){bRouteBox.style.display='none';bRouteBox.innerHTML='';}title.textContent='Route cleared';info.textContent='Search or tap a destination to navigate again.';}
window.addEventListener('load',bMakeRouteUI);
