// TSO 2.0 account-state Worker.
// D1 persistence is provisioned, but authenticated writes stay OFF until a real
// identity provider is connected. Do not trust the preview's client-side handle.

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    "content-type":"application/json; charset=UTF-8",
    "cache-control":"no-store",
    "access-control-allow-origin":"*",
    "access-control-allow-methods":"GET,OPTIONS",
    "access-control-allow-headers":"content-type,authorization"
  }
});

export default {
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
      "access-control-allow-origin":"*",
      "access-control-allow-methods":"GET,OPTIONS",
      "access-control-allow-headers":"content-type,authorization"
    }});

    const url=new URL(request.url);
    if(request.method!=="GET"){
      return json({
        ok:false,
        error:"AUTH_NOT_CONFIGURED",
        message:"TSO 2.0 account writes are disabled until server-verified authentication is connected."
      },503);
    }

    if(url.pathname!=="/"&&url.pathname!=="/health"&&url.pathname!=="/capabilities"){
      return json({ok:false,error:"NOT_FOUND"},404);
    }

    try{
      const tables=await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_cf_KV' ORDER BY name"
      ).all();

      const tableNames=(tables.results||[]).map(row=>String(row.name));
      return json({
        ok:true,
        service:"tso2-account-state",
        schemaVersion:1,
        database:"tso2-user-state",
        tableCount:tableNames.length,
        tables:tableNames,
        authentication:{
          configured:false,
          writesEnabled:false,
          reason:"Preview identity is client-controlled and is not trusted for persistence."
        },
        capabilities:{
          trackedPicks:"schema-ready",
          settlement:"schema-ready",
          pointsLedger:"schema-ready",
          alertPreferences:"schema-ready",
          pushSubscriptions:"schema-ready",
          persistentNotifications:"schema-ready",
          communityPosts:"schema-ready",
          reactionsComments:"schema-ready",
          follows:"schema-ready",
          roomsMessages:"schema-ready"
        }
      });
    }catch(error){
      return json({ok:false,error:"DATABASE_UNAVAILABLE",message:String(error?.message||error)},500);
    }
  }
};
