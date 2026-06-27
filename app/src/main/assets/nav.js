let bRouteLine=null;
let bRouteBox=null;
let bMode='car';

function bGetLatLngFromMarker(m){
  if(!m)return null;
  try{const p=m.getLatLng();return {lat:p.lat,lon:p.lng};}catch(e){return null;}
}
function bStartPoint(){const p=bGetLatLngFromMarker(meMarker);if(p)return p;if(typeof HOME!=='undefined'&&HOME&&HOME.lat)return {lat:HOME.lat,lon:HOME.lon};return null;}
function bDestination(){const p=bGetLatLngFromMarker(marker);if(p)return p;return null;}

function bMakeRouteUI(){
  const panel=document.querySelector('.panel');
  if(!panel)return;
  const modes=document.createElement('div');
  modes.style.marginTop='10px';modes.style.display='flex';modes.style.gap='6px';modes.style.flexWrap='wrap';
  modes.innerHTML='<button data-mode="car">🚗 Car</button><button data-mode="motorcycle">🏍️ Motorcycle</button><button data-mode="walk">🚶 Walk</button><button data-mode="bike">🚲 Bike</button><button data-mode="bus">🚌 Bus</button><button data-mode="subway">🚇 Subway</button>';
  panel.appendChild(modes);
  Array.from(modes.querySelectorAll('button')).forEach(btn=>{btn.style.border='0';btn.style.borderRadius='999px';btn.style.padding='8px 10px';btn.style.background='rgba(255,255,255,.13)';btn.style.color='white';btn.style.fontWeight='800';btn.onclick=()=>{bMode=btn.dataset.mode;Array.from(modes.querySelectorAll('button')).forEach(b=>b.style.background='rgba(255,255,255,.13)');btn.style.background='#0b84ff';title.textContent='Mode: '+btn.textContent;info.textContent='Choose destination, then tap Navigate.';};});
  modes.querySelector('[data-mode="car"]').style.background='#0b84ff';
  const row=document.createElement('div');row.style.marginTop='10px';
  row.innerHTML='<button id="bNavigateBtn" style="border:0;border-radius:999px;padding:10px 14px;background:#0b84ff;color:white;font-weight:800;margin-right:8px">Navigate</button><button id="bClearRouteBtn" style="border:0;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.14);color:white;font-weight:800">Clear route</button>';
  panel.appendChild(row);
  bRouteBox=document.createElement('div');bRouteBox.style.display='none';bRouteBox.style.marginTop='10px';bRouteBox.style.maxHeight='180px';bRouteBox.style.overflow='auto';panel.appendChild(bRouteBox);
  document.getElementById('bNavigateBtn').onclick=bNavigate;document.getElementById('bClearRouteBtn').onclick=bClearRoute;
}
function bStepText(step){const m=step.maneuver||{};let text=(m.type||'continue')+' '+(m.modifier||'');if(step.name)text+=' on '+step.name;return text.replace(/_/g,' ').trim();}
function bNoRoute(label){if(bRouteLine){map.removeLayer(bRouteLine);bRouteLine=null;}title.textContent=label+' unavailable';info.textContent='No real route found. Move the pin onto a nearby street or path.';bRouteBox.innerHTML='<div style="font-weight:800;margin-bottom:6px">No fake straight line</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">This app will not draw a line through buildings.</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">Move the destination pin onto a road, sidewalk, entrance, or station area.</div><div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">Then tap Navigate again.</div>';bRouteBox.style.display='block';}
async function bNavigate(){const start=bStartPoint();const end=bDestination();if(!end){title.textContent='Choose destination';info.textContent='Search or tap a place first.';return;}if(!start){title.textContent='No start location';info.textContent='Tap location first, or manually set Home first.';return;}if(bMode==='bus'){bNoRoute('Bus route');return;}if(bMode==='subway'){bNoRoute('Subway route');return;}const label=bMode==='motorcycle'?'Motorcycle route':bMode==='walk'?'Walking route':bMode==='bike'?'Bike route':'Car route';title.textContent='Routing...';info.textContent='Calculating real route only.';try{const url='https://router.project-osrm.org/route/v1/driving/'+start.lon+','+start.lat+';'+end.lon+','+end.lat+'?overview=full&geometries=geojson&steps=true&radiuses=100;100';const res=await fetch(url);const data=await res.json();if(!data.routes||!data.routes.length)throw new Error('no route');const route=data.routes[0];const points=route.geometry.coordinates.map(c=>[c[1],c[0]]);if(bRouteLine)map.removeLayer(bRouteLine);bRouteLine=L.polyline(points,{weight:6,opacity:.95,color:'#0b84ff'}).addTo(map);map.fitBounds(bRouteLine.getBounds(),{padding:[40,40]});const miles=(route.distance/1609.34).toFixed(1);const mins=Math.round(route.duration/60);title.textContent=label;info.textContent=miles+' miles · about '+mins+' min';const routeSteps=route.legs[0].steps.slice(0,12);let html='<div style="font-weight:800;margin-bottom:6px">Route steps</div>';for(let i=0;i<routeSteps.length;i++){html+='<div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#dcefff">'+(i+1)+'. '+bStepText(routeSteps[i])+' · '+(routeSteps[i].distance/1609.34).toFixed(1)+' mi</div>';}bRouteBox.innerHTML=html;bRouteBox.style.display='block';}catch(e){bNoRoute(label);}}
function bClearRoute(){if(bRouteLine){map.removeLayer(bRouteLine);bRouteLine=null;}if(bRouteBox){bRouteBox.style.display='none';bRouteBox.innerHTML='';}title.textContent='Route cleared';info.textContent='Search or tap a destination to navigate again.';}
window.addEventListener('load',bMakeRouteUI);
