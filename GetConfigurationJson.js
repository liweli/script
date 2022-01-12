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

var array = new Array();
if(fs.existsSync("./tbJson")){
	// console.log("存在")
}else{
	// console.log("不存在")
	fs.mkdir("tbJson",function(){
		fs.mkdir("tbJson/DashboardJson",function(){});
		fs.mkdir("tbJson/WidgetsBundleJson",function(){});
		fs.mkdir("tbJson/RuleChainJson",function(){});
		fs.mkdir("tbJson/EdgeRuleChainJson",function(){});
		fs.mkdir("tbJson/DeviceProfileJson",function(){});
	});
	
}
//清空文件夹下的json文件
var folders=fs.readdirSync("./tbJson");
folders.forEach(folder => {
    fs.readdirSync("./tbJson"+"/"+folder).forEach(file =>{
        var stats=fs.statSync("./tbJson"+"/"+folder+"/"+file);
        if(stats.isDirectory()){
           console.log(stats.isDirectory())
        }else{
            fs.unlinkSync("./tbJson"+"/"+folder+"/"+file);
        }
    })
});

function getRespon(url,method,headers,json={}){
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

//获取配置并以json格式保存
async function getJson(ip){

    var token = await getRespon(ip+"/api/auth/login","POST",null,user);

	await getId("/api/tenant/dashboards",token.token);
	array.forEach(element => {
		getDashboardJson(element,token.token);
	});

	await getId("/api/widgetsBundles",token.token);
	array.forEach(element => {
		getwidgetsBundleJson(element,token.token);
	});
	
	await getId("/api/ruleChains",token.token,"&type=EDGE")
	array.forEach(element => {
		getRuleChainJson(element,token.token);
	});

	await getId("/api/ruleChains",token.token,"&type=CORE")
	array.forEach(element => {
		getRuleChainJson(element,token.token);
	});

	await getId("/api/deviceProfiles",token.token)
	array.forEach(element => {
		getDeviceProfilesJson(element,token.token);
	});
}


getJson(ip);



//通过分页查询的接口获取id
async function getId(variety,token,type=""){
	var hasNext=false;
	var page=0;
	array=[];
	do{
		var length=array.length;
		var res = await getRespon(ip+variety+"?pageSize=10&page="+page+"&sortProperty=createdTime&sortOrder=DESC"+type,"GET",{
			"X-Authorization": "Bearer "+token,
		});
		console.log("res.data.length:"+res.data.length)
		for (let index = 0; index < res.data.length; index++) {
			const element = res.data[index].id.id;
			array[index+length]=element;
		}
		hasNext=res.hasNext;
		page++;
	}while(hasNext)
	
}


function getDashboardJson(id,token){
	request({
		url:ip+"/api/dashboard/"+id,
		headers:{
			"x-authorization": "Bearer "+token,
		}
	}, function (error, response, body) {
  		if(!error && response.statusCode == 200){	
		  	body=JSON.parse(body);
		  	var dashboard={
		  		title:body.title,
		  		image:body.image,
		  		mobileHide:body.mobileHide,
				mobileOrder:body.mobileOrder,
		  		configuration:body.configuration,
				name:body.name,
	  		};

			writeFile("./tbJson/DashboardJson/"+dashboard.name.replace(/:/g," ")+".json",JSON.stringify(dashboard, null, 4));
  		}
	})
}

async function getwidgetsBundleJson(id,token){
	var widgetsBundleJson = await getRespon(ip+"/api/widgetsBundle/"+id,"GET",{
		"X-Authorization": "Bearer "+token,
	});

	var widgetTypesJson = await getRespon(ip+"/api/widgetTypesDetails?isSystem=true&bundleAlias="+widgetsBundleJson.alias,"GET",{
		"X-Authorization": "Bearer "+token,
	});
	//如果该部件包不是系统自带的，使用下面的请求获取数据
	if(widgetTypesJson.length == 0){
		var widgetTypesJson = await getRespon(ip+"/api/widgetTypesDetails?isSystem=false&bundleAlias="+widgetsBundleJson.alias,"GET",{
			"X-Authorization": "Bearer "+token,
		});
	}
	var widgetsBundle={
		widgetsBundle:{
			alias:widgetsBundleJson.alias,
			title:widgetsBundleJson.title,
			image:widgetsBundleJson.image,
			description:widgetsBundleJson.description,
		},
		widgetTypes:[]
	}

	for (let index = 0; index < widgetTypesJson.length; index++) {
		delete widgetTypesJson[index].id;
		delete widgetTypesJson[index].createdTime;
		delete widgetTypesJson[index].tenantId;
		delete widgetTypesJson[index].bundleAlias;
		widgetsBundle.widgetTypes[index] = widgetTypesJson[index];
		
	}
	writeFile("tbJson/WidgetsBundleJson/"+widgetsBundle.widgetsBundle.alias.replace(/:/g," ")+".json",JSON.stringify(widgetsBundle, null, 4))

}

async function getDeviceProfilesJson(id,token){
	var deviceProfilesJson = await getRespon(ip+"/api/deviceProfile/"+id,"GET",{
		"X-Authorization": "Bearer "+token,
	});

	delete deviceProfilesJson.id;
	delete deviceProfilesJson.createdTime;
	delete deviceProfilesJson.tenantId;
	deviceProfilesJson.default=false;
	writeFile("tbJson/DeviceProfileJson/"+deviceProfilesJson.name.replace(/:/g," ")+".json", JSON.stringify(deviceProfilesJson, null, 4));

}

async function getRuleChainJson(id,token){
	var RuleChainJson = await getRespon(ip+"/api/ruleChain/"+id,"GET",{
		"X-Authorization": "Bearer "+token,
	});

	var metadataJson = await getRespon(ip+"/api/ruleChain/"+id+"/metadata","GET",{
		"X-Authorization": "Bearer "+token,
	});

	var ruleChainData={
		ruleChain:{
			additionalInfo:RuleChainJson.additionalInfo,
			name:RuleChainJson.name,
			type:RuleChainJson.type,
			firstRuleNodeId:null,
			root:false,
			debugMode:RuleChainJson.debugMode,
			configuration:RuleChainJson.configuration,
		},
		metadata:{
			firstNodeIndex:metadataJson.firstNodeIndex,
			nodes:[],
			connections:[],
			ruleChainConnections:metadataJson.ruleChainConnections,
		}
	}
	for (let index = 0; index < metadataJson.nodes.length; index++) {
		ruleChainData.metadata.nodes[index]={
			additionalInfo: metadataJson.nodes[index].additionalInfo,
			type: metadataJson.nodes[index].type,
			name: metadataJson.nodes[index].name,
			debugMode: metadataJson.nodes[index].debugMode,
			configuration: metadataJson.nodes[index].configuration,
		};
	}
	ruleChainData.metadata.connections=metadataJson.connections;

	var path=ruleChainData.ruleChain.type=="EDGE"?"EdgeRuleChainJson/":"RuleChainJson/";
	writeFile("tbJson/"+path+ruleChainData.ruleChain.name.replace(/:/g," ")+".json", JSON.stringify(ruleChainData, null, 4));


}

function writeFile(path,contents){
	fs.writeFile(path, contents, 'utf-8',  function(err) {
		if (err) {
			return console.error(err);
		}
 	});
}