const fs         = require('fs');
const path       = require('path');
const makeDir    = require('make-dir');
const fg         = require('fast-glob');
const { nanoid } = require('nanoid');

let Core = {};

Core.CSV_SEP = ",";
Core.DIR_PUBLIC = path.join(__dirname,"/../public/");

Core.conf = {};


Core.init = ()=>{
    Core.recordMaxSize = Core.convertMBToBytes(10); // Max size allowed per CSV (bytes). Default 10 Mb
    Core.dirRecords = path.join(__dirname,"/../records/");

    let configpath = path.join(__dirname,"/../config.json");
    console.log(configpath);

	if (fs.existsSync(configpath)){
		Core.conf = JSON.parse( fs.readFileSync(configpath, 'utf8') );
		console.log("Found custom config " + configpath);

        if (Core.conf.records){
            let R = Core.conf.records;

            if (R.folder)  Core.dirRecords    = R.folder;
            if (R.maxSize) Core.recordMaxSize = Core.convertMBToBytes(R.maxSize);
        }

    }

    if (!fs.existsSync(Core.dirRecords)){
        console.log("Recreating records folder");
        makeDir.sync(Core.dirRecords);
    }

    console.log("- Records folder: "+Core.dirRecords);
};

Core.convertMBToBytes = (v)=>{
    return parseInt(1000000 * v);
};

Core.generateYMD = ( bHM )=>{
    let today = new Date();
    let dd   = String( today.getDate() );
    let mm   = String( today.getMonth()+1 ); 
    let yyyy = String( today.getFullYear() );
    if(dd<10) dd = '0'+dd;
    if(mm<10) mm = '0'+mm;

    let R = yyyy+"-"+mm+"-"+dd;

    if (bHM){
        let hh = String( today.getHours() );
        let mm = String( today.getMinutes() );

        if (hh<10) hh = '0'+hh;
        if (mm<10) mm = '0'+mm;

        R = R + "-"+hh+"-"+mm;
    }

    return R;
};

Core.generateSessionID = ()=>{
    let sesid = nanoid(10);
    sesid = Core.generateYMD(true) + "_" + sesid;
    
    return sesid;
};

Core.getFullPathCSV = (sesid, gid)=>{
    if (gid){
        let fname = gid+"/"+sesid+".csv";
        fname = path.join(Core.dirRecords, fname);
        return fname;
    }

    let fname = sesid+".csv";
    fname = path.join(Core.dirRecords, fname);
    return fname;
};

Core.getFullPathJSON = (sesid, gid)=>{
    if (gid){
        let fname = gid+"/"+sesid+".json";
        fname = path.join(Core.dirRecords, fname);
        return fname;
    }

    let fname = sesid+".json";
    fname = path.join(Core.dirRecords, fname);
    return fname;
};

Core.convertCSVtoJSON = (csvdata)=>{
    let d = csvdata.split("\n");
    let fields = d[0].split(Core.CSV_SEP);
    
    let numf = fields.length;
    if (numf < 1) return undefined;

    let json = [];

    for (let c=1; c<d.length; c++){
        let r = {};
        let values = d[c].split(Core.CSV_SEP);

        for (let f=0; f<numf; f++){
            r[ fields[f] ] = values[f];
        }

        json.push(r);
    }

    return json;
};

Core.requestNewSession = (o)=>{
    let res = {};

    let fields  = o.fields;
    if (!fields){
        
        return;
    }

    let sesid = Core.generateSessionID();
    console.log("New session ID: "+sesid);

    if (o.actor) sesid += "@"+o.actor;

    let groupid = o.groupid;
    let fname = Core.getFullPathCSV(sesid,groupid);

    if (groupid){
        let dirgroup = path.join(Core.dirRecords,groupid);
        if (!fs.existsSync(dirgroup)) makeDir.sync(dirgroup);

        res.groupid = groupid;
    }

    console.log(fname)

    if (fs.existsSync(fname)){
        return;
    }

    let strhead = fields.join(Core.CSV_SEP) + "\n";

    fs.writeFile(fname, strhead, 'utf8', err => {
        if (err) throw err;
        
        console.log("CSV created: "+fname);
    });

    res.id = sesid;
    return res;
};

Core.updateSession = (o)=>{
    if (!o.id) return false;

    let data = o.data + "\n";
    if (!data) return false;

    let fname = Core.getFullPathCSV(o.id, o.groupid);
    if (!fs.existsSync(fname)) return false;

    let stats = fs.statSync(fname);
    //console.log("Size:"+stats.size);

    if (stats.size > Core.recordMaxSize) return false;

    fs.appendFile(fname, data, 'utf8', err => {
        if (err) throw err;
        
        console.log("Chunk added in CSV:"+fname);
    });

    return true;
};

module.exports = Core;