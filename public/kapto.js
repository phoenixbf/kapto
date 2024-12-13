/*
	Kapto client component
    author: Bruno Fanini (CNR ISPC)

===============================================*/

/**
Kapto
@namespace Kapto
*/
let Kapto = {};
window.Kapto = Kapto;

Kapto.T_INT      = 400; //400;
Kapto.CHUNK_SIZE = 30

Kapto._addr = undefined;

Kapto.onFrame     = undefined;
Kapto.onSessionID = undefined;

Kapto.init = ()=>{
/*
    let path = window.location.href.split('?')[0];
    var i = path.lastIndexOf('/');
    if (i !== -1) path = path.substring( 0, i+1 );
*/
    // Defaults to local server, this is not the typical case and you generally tell where is remote hub via setHubServer()
    Kapto._addr = window.location.origin+"/";
    
    Kapto._id    = undefined;
    Kapto._gid   = undefined;
    Kapto._aname = undefined;
    
    Kapto._bFirstRow = true;
    Kapto._bSendingChunk = false;
    Kapto._bReqSes = false;
    
    Kapto._resetDataChunk();
    Kapto._bRec = false;
    
    Kapto._uf = undefined;
};

/**
 is Kapto recording
 */
Kapto.isRecording = ()=>{
    return Kapto._bRec;
};

/**
 Set Kapto server
 @param {String} addr - address (IP or domain)
 */
Kapto.setHubServer = (addr)=>{
    Kapto._addr = addr;
    console.log("Kapto: " + Kapto._addr);
    
    return Kapto;
};

/**
 Set Kapto server
 @return {String} addr - Hub address
 */
Kapto.getHubServer = ()=>{
    return Kapto._addr;
};

/**
Start recording using ticking
@param {Number} interval - Time interval (milliseconds)
*/
Kapto.start = (interval)=>{
    if (Kapto._bRec) return Kapto; // Already recording

    if (Kapto._uf) return Kapto;
    if (!Kapto._addr) return Kapto;

    let dt = interval? interval : Kapto.T_INT;

    Kapto._uf = window.setInterval(Kapto._tick, dt);

    Kapto._bRec = true;

    return Kapto;
};

/**
Set Datachunk size: how large is the packet sent to the Hub
@param {Number} size - Number of frames per packet
*/
Kapto.setDataChunkSize = (size)=>{
    if (size < 1) return Kapto;

    Kapto.CHUNK_SIZE = size;
    return Kapto;
};


Kapto.requestNewSession = (fields)=>{
    Kapto._id = undefined;
    
    //let gid = Kapto._gid;
    //console.log(gid)

    Kapto._bReqSes = true;

    fetch(Kapto._addr+"api/session", {
        method: "POST",
        body: JSON.stringify({
            fields: fields,
            groupid: Kapto._gid,
            actor: Kapto._aname
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then((response) => response.json())
    .then((json) => {
        console.log(json)

        Kapto._id  = json.id;
        Kapto._gid = json.groupid;

        Kapto._bReqSes = false;

        if (Kapto.onSessionID) Kapto.onSessionID(Kapto._id);
    });

    return Kapto;
};

/**
Stop current session
*/
Kapto.stop = ()=>{
    if (!Kapto._bRec) return Kapto; // Already stopped

    Kapto._sendDataChunk();
    
    Kapto._bRec = false;
    Kapto._bFirstRow = true;
    Kapto._uf = undefined;

    console.log("STOP");
    return Kapto;
};

/**
Set onFrame routine
@param {Function} of - onFrame routine producing a state (object) each tick
@example
Kapto.setOnFrame(()=>{
    return {
        x: <my_sample_xvalue>,
        y: <my_sample_yvalue>
    }
});
*/
Kapto.setOnFrame = (of)=>{
    Kapto.onFrame = of;
    return Kapto;
};

/**
Set group ID
@param {String} gid - group ID (e.g.: "experiment1", "scene3")
*/
Kapto.setGroupID = (gid)=>{
    Kapto._gid = gid;
    return Kapto;
};

/**
Set actor name
@param {String} actor - friendly name for object we are currently tracking
*/
Kapto.setActorName = (aname)=>{
    Kapto._aname = aname;
    return Kapto;
};


Kapto._resetDataChunk = ()=>{
    Kapto._chunk  = [];
    Kapto._rcount = 0;
};

Kapto._sendDataChunk = ()=>{
    if (Kapto._bSendingChunk) return;

    Kapto._bSendingChunk = true;

    let sdata = Kapto._chunk.join("\n");

    fetch(Kapto._addr+"api/session", {
        method: "PUT",
        body: JSON.stringify({
            id: Kapto._id,
            groupid: Kapto._gid,
            data: sdata
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then((response) => response.json())
    .then((json) => {
        Kapto._resetDataChunk();
        Kapto._bSendingChunk = false;
        //console.log("Chunk sent: "+sdata);
        console.log("Datachunk sent");
    });
};

Kapto._tick = ()=>{
    if (!Kapto._bRec) return;
    if (!Kapto.onFrame) return;

    let S = Kapto.onFrame();

    Kapto.frame( S );
};

/**
Record a given frame. Should be used in event-driven scenarios (not using onFrame ticking)
@param {Object} S - State
@example
Kapto.frame({
    time: <myclock>, 
    x: <my_sample_xvalue>, 
    y: <my_sample_yvalue>
});
*/
Kapto.frame = (S)=>{
    if (!S) return Kapto;
    if (!Kapto._addr) return Kapto;
    if (Kapto._bReqSes) return Kapto;

    if (Kapto._bFirstRow){
        let fields = [];
        for (let a in S) fields.push(a);

        Kapto.requestNewSession(fields);
        Kapto._bFirstRow = false;
        return Kapto;
    }

    if (!Kapto._id){
        //Kapto._bFirstRow = true;
        //console.log("ERROR: no valid session ID");
        return Kapto;
    }

    let row = [];
    for (let a in S) row.push(S[a]);

    let srow = row.join(",");

    Kapto._chunk.push(srow);
    Kapto._rcount++;

    if (Kapto._rcount >= Kapto.CHUNK_SIZE) Kapto._sendDataChunk();
    return Kapto;
};

Kapto.init();