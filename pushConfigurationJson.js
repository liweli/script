var request = require('request').defaults({
	rejectUnauthorized: false,
  });
var fs = require("fs");

//设置tb服务的ip与用户信息
var ip="https://10.0.1.217";
var user={
	username: "tenant@thingsboard.org",
	password: "tenant"
}

var flag=false;
var fileMap = new Map();
fileMap.set("RuleChainJson",[]);
fileMap.set("DashboardJson",[]);
fileMap.set("DeviceProfileJson",[]);
fileMap.set("EdgeRuleChainJson",[]);
fileMap.set("RuleChainJson",[]);
fileMap.set("WidgetsBundleJson",[]);
if(fs.existsSync("./tbJson")){
	flag=true;
}else{
	console.log("文件不存在，无法上传")	
}

async function pushJson(flag){
    if(flag){
        var folders=fs.readdirSync("./tbJson");
        folders.forEach(folder => {
        fs.readdirSync("./tbJson"+"/"+folder).forEach(file =>{
                fileMap.get(folder).push("./tbJson"+"/"+folder+"/"+file)
            })
        });
        var token = await sendRequest(ip+"/api/auth/login","POST",null,user);

        fileMap.get("RuleChainJson").forEach(async fileName=>{
            let content=await readFileContent(fileName);
 
            pushRuleChain(content,token.token);

        })

        fileMap.get("WidgetsBundleJson").forEach(async fileName=>{
            let content=await readFileContent(fileName);
 
            pushWidgetsBundle(content,token.token);

        })

    }
}

pushJson(flag);

//获取文件中的配置内容
function readFileContent(fileName){
    return new Promise(function(resolve,reject){
        fs.readFile(fileName,"utf8",function(err,data){
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

function sendRequest(url,method,headers,json={}){
    return new Promise(function(resolve, reject){
        request({
			url: url,
			method: method,
			headers,
			json: json,
			} , function(error,response,body){
            	if(error){
                	reject(error);
            	}else{
                	resolve(body);
            	}
        });
    });
}

async function pushRuleChain(content,token){
    var json=JSON.parse(content);

	var respon=await sendRequest(ip+"/api/ruleChain","POST",{
        "X-Authorization": "Bearer "+token,
    },json.ruleChain);


    json.metadata.ruleChainId={
        entityType:"RULE_CHAIN",
        id:respon.id.id,
    }

    var respon = await sendRequest(ip+"/api/ruleChain/metadata","POST",{
        "X-Authorization": "Bearer "+token,
    },json.metadata);


}
async function pushWidgetsBundle(content,token){
    var json=JSON.parse(content);

	await sendRequest(ip+"/api/widgetsBundle","POST",{
        "X-Authorization": "Bearer "+token,
    },json.widgetsBundle);

    json.widgetTypes.forEach(async element=>{
        element.bundleAlias=json.widgetsBundle.alias;
        var respon=await sendRequest(ip+"/api/widgetType","POST",{
            "X-Authorization": "Bearer "+token,
        },element);
    })

}

async function pushDashboardJson(content,token){
    var json=JSON.parse(content);

    await sendRequest(ip+"/api/dashboard","POST",{
        "X-Authorization": "Bearer "+token,
    },json)
}
